import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { SOURCES } from "./sources";
import { collectAll } from "./stages/collect";
import { dedupe } from "./stages/dedupe";
import { filterRecent } from "./stages/recency";
import { filterRelevant } from "./stages/relevance";

/**
 * 1단계 확인용 엔트리. DB도 LLM도 태우지 않고 수집·중복제거·관련성 필터까지만 돌린다.
 *
 *   npm run pipeline:collect
 *
 * 소스가 실제로 쓸만한지, 하루 몇 건이 남는지를 눈으로 보고 다음 단계를 정하기 위한 것이다.
 */

const OUT_DIR = path.join(process.cwd(), "pipeline", ".out");

function pad(value: string, width: number): string {
  // 한글은 터미널에서 두 칸을 차지한다
  const printWidth = [...value].reduce(
    (sum, char) => sum + (/[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(char) ? 2 : 1),
    0,
  );
  return value + " ".repeat(Math.max(0, width - printWidth));
}

function formatDate(iso: string | undefined): string {
  return iso ? iso.slice(0, 10) : "  -       ";
}

async function main(): Promise<void> {
  const startedAt = Date.now();

  const { items, results } = await collectAll(SOURCES);

  console.log("\n수집처");
  console.log("─".repeat(72));
  for (const result of results) {
    const status = result.ok ? "OK  " : "FAIL";
    const line = `${status}  ${pad(result.label, 30)} ${String(result.count).padStart(3)}건  ${String(result.ms).padStart(5)}ms`;
    console.log(result.error ? `${line}\n      └ ${result.error}` : line);
  }

  const { kept: deduped, removedByUrl, removedByTitle } = dedupe(items, SOURCES);
  const {
    kept: recent,
    dropped: stale,
    maxAgeDays,
  } = filterRecent(deduped, SOURCES);
  const { kept: relevant, dropped } = filterRelevant(recent, SOURCES);

  console.log("\n단계별 잔량");
  console.log("─".repeat(72));
  console.log(`수집             ${String(items.length).padStart(4)}건`);
  console.log(`URL 중복 제거    ${String(-removedByUrl).padStart(4)}건`);
  console.log(`제목 중복 제거   ${String(-removedByTitle).padStart(4)}건`);
  console.log(`${maxAgeDays}일 초과 제외   ${String(-stale.length).padStart(4)}건`);
  console.log(`관련성 필터      ${String(-dropped.length).padStart(4)}건`);
  console.log(`남은 후보        ${String(relevant.length).padStart(4)}건`);

  const bySource = new Map<string, number>();
  for (const item of relevant) {
    bySource.set(item.sourceLabel, (bySource.get(item.sourceLabel) ?? 0) + 1);
  }

  console.log("\n후보 (소스별)");
  console.log("─".repeat(72));
  for (const [label, count] of [...bySource.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`${pad(label, 32)} ${String(count).padStart(3)}건`);
  }

  console.log("\n후보 목록");
  console.log("─".repeat(72));
  for (const item of relevant) {
    console.log(
      `${formatDate(item.publishedAt)}  ${pad(item.source, 14)} ${item.title}`,
    );
  }

  if (dropped.length > 0) {
    console.log(`\n관련성 필터 탈락 ${dropped.length}건 (룰 손볼 때 참고)`);
    console.log("─".repeat(72));
    for (const { item, reason } of dropped.slice(0, 25)) {
      console.log(`${pad(item.source, 14)} ${pad(reason, 22)} ${item.title}`);
    }
    if (dropped.length > 25) {
      console.log(`… 외 ${dropped.length - 25}건`);
    }
  }

  await mkdir(OUT_DIR, { recursive: true });
  const outPath = path.join(
    OUT_DIR,
    `collect-${new Date().toISOString().slice(0, 10)}.json`,
  );
  await writeFile(
    outPath,
    JSON.stringify(
      {
        collectedAt: new Date().toISOString(),
        sources: results,
        counts: {
          collected: items.length,
          removedByUrl,
          removedByTitle,
          droppedByRecency: stale.length,
          droppedByRelevance: dropped.length,
          candidates: relevant.length,
        },
        maxAgeDays,
        candidates: relevant,
        dropped: dropped.map(({ item, reason }) => ({
          source: item.source,
          title: item.title,
          url: item.url,
          reason,
        })),
      },
      null,
      2,
    ),
    "utf-8",
  );

  console.log(`\n${path.relative(process.cwd(), outPath)} 에 저장`);
  console.log(`소요 ${((Date.now() - startedAt) / 1000).toFixed(1)}초\n`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
