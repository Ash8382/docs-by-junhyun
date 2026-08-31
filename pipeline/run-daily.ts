import { seoulDate } from "../src/lib/ai-daily/date";
import { pruneOlderThan, upsertArticles } from "../src/lib/ai-daily/db";
import type { ArticleInput } from "../src/lib/ai-daily/types";
import { createJudge, type Scored } from "./judge";
import { SOURCES } from "./sources";
import { collectAll } from "./stages/collect";
import { dedupe } from "./stages/dedupe";
import { filterRecent } from "./stages/recency";
import { filterRelevant } from "./stages/relevance";
import { filterUnseen, recordSeen } from "./stages/seen";
import type { NormalizedItem } from "./types";

/**
 * 매일 아침 도는 본편.
 *
 *   npm run pipeline:daily          실제 실행 (DB에 기록)
 *   npm run pipeline:daily -- --dry 결과만 출력, DB는 건드리지 않음
 *
 * --dry 는 프롬프트나 룰을 손볼 때 쓴다. seen 기록을 남기지 않으므로 같은 후보로
 * 몇 번이든 다시 돌려볼 수 있다.
 */

const DIGEST_SIZE = Number(process.env.DIGEST_SIZE) || 8;
const RETENTION_DAYS = Number(process.env.RETENTION_DAYS) || 30;

/**
 * 한 소스가 브리핑을 독차지하지 못하게 막는다.
 * 논문이 후보의 상당수라 이 상한이 없으면 여덟 칸이 논문으로 채워지는 날이 나온다.
 */
const MAX_PER_SOURCE = Number(process.env.MAX_PER_SOURCE) || 3;

function pickTop(
  items: NormalizedItem[],
  scores: Map<string, Scored>,
  size: number,
): NormalizedItem[] {
  const ranked = items
    .filter((item) => scores.has(item.id))
    .sort((a, b) => (scores.get(b.id)?.score ?? 0) - (scores.get(a.id)?.score ?? 0));

  const picked: NormalizedItem[] = [];
  const perSource = new Map<string, number>();

  for (const item of ranked) {
    if (picked.length >= size) break;

    const used = perSource.get(item.source) ?? 0;
    if (used >= MAX_PER_SOURCE) continue;

    picked.push(item);
    perSource.set(item.source, used + 1);
  }

  // 상한 때문에 자리가 남으면 점수순으로 채운다
  if (picked.length < size) {
    for (const item of ranked) {
      if (picked.length >= size) break;
      if (!picked.includes(item)) picked.push(item);
    }
  }

  return picked;
}

function line(label: string, count: number): void {
  console.log(`${label.padEnd(18)} ${String(count).padStart(4)}건`);
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry");
  const startedAt = Date.now();
  const digestDate = seoulDate();

  console.log(`\nAI Daily — ${digestDate}${dryRun ? "  (dry run)" : ""}`);

  const { items, results } = await collectAll(SOURCES);

  console.log("\n수집처");
  console.log("─".repeat(72));
  for (const result of results) {
    console.log(
      `${result.ok ? "OK  " : "FAIL"}  ${result.label.padEnd(28)} ${String(result.count).padStart(3)}건  ${String(result.ms).padStart(5)}ms` +
        (result.error ? `\n      └ ${result.error}` : ""),
    );
  }

  const { kept: deduped } = dedupe(items, SOURCES);
  const { kept: recent, maxAgeDays } = filterRecent(deduped, SOURCES);
  const { kept: relevant } = filterRelevant(recent, SOURCES);
  const { fresh, alreadySeen } = await filterUnseen(relevant);

  console.log("\n단계별 잔량");
  console.log("─".repeat(72));
  line("수집", items.length);
  line("중복 제거 후", deduped.length);
  line(`${maxAgeDays}일 이내`, recent.length);
  line("AI 관련", relevant.length);
  line(`처음 보는 것`, fresh.length);
  if (alreadySeen > 0) console.log(`  (이미 본 것 ${alreadySeen}건 제외)`);

  if (fresh.length === 0) {
    console.log("\n새로 볼 게 없습니다. 오늘은 여기까지.\n");
    return;
  }

  const judge = createJudge();
  console.log(`\n선별 — ${judge.name}`);
  console.log("─".repeat(72));

  const scored = await judge.score(fresh);
  const scoreById = new Map(scored.map((entry) => [entry.id, entry]));
  console.log(`${scored.length}건 채점 (후보 ${fresh.length}건)`);

  const top = pickTop(fresh, scoreById, DIGEST_SIZE);
  const written = await judge.write(top);
  const writtenById = new Map(written.map((entry) => [entry.id, entry]));
  console.log(`${written.length}건 집필 (선정 ${top.length}건)`);

  const articles: ArticleInput[] = top.map((item) => {
    const score = scoreById.get(item.id);
    const text = writtenById.get(item.id);

    return {
      id: item.id,
      title: item.title,
      url: item.url,
      urlKey: item.urlKey,
      source: item.source,
      sourceLabel: item.sourceLabel,
      publishedAt: item.publishedAt ?? null,
      // 집필이 실패한 항목은 수집 단계 요약으로 대신한다. 빈 칸보다는 낫다.
      summary: text?.summary || item.summary || null,
      insight: text?.insight || null,
      importance: score?.importance ?? "MEDIUM",
      score: score?.score ?? 0,
      tags: text?.tags ?? [],
      digestDate,
    };
  });

  console.log("\n오늘의 브리핑");
  console.log("─".repeat(72));
  for (const article of articles) {
    console.log(
      `[${article.importance}] ${String(article.score).padStart(3)}  ${article.title}`,
    );
    if (article.summary) console.log(`        ${article.summary}`);
    if (article.insight) console.log(`     → ${article.insight}`);
    console.log(`        ${article.sourceLabel} · ${article.url}`);
    console.log();
  }

  if (dryRun) {
    console.log("dry run이라 DB에는 쓰지 않았습니다.");
  } else {
    await upsertArticles(articles);
    // 탈락한 것까지 기록해야 내일 다시 채점하지 않는다
    await recordSeen(fresh);
    const pruned = await pruneOlderThan(RETENTION_DAYS);

    console.log(
      `저장 ${articles.length}건 · seen 기록 ${fresh.length}건 · ` +
        `${RETENTION_DAYS}일 경과 정리 ${pruned.articles}건`,
    );
  }

  console.log(`소요 ${((Date.now() - startedAt) / 1000).toFixed(1)}초\n`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
