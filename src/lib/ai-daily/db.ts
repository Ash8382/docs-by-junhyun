import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

import { toDateOnly } from "./date";
import { toImportance, type Article, type ArticleInput } from "./types";

/**
 * Neon HTTP 드라이버 한 겹.
 *
 * 파이프라인(GitHub Actions)과 API 라우트(Vercel) 둘 다 여기를 쓴다. 커넥션 풀러 주소를
 * 쓰므로 짧게 붙었다 떨어지는 서버리스 함수에서도 안전하다.
 */

let cached: NeonQueryFunction<false, false> | undefined;

export function db(): NeonQueryFunction<false, false> {
  if (cached) return cached;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL이 없습니다. 로컬은 .env.local, Actions는 레포 Secrets를 확인하세요.",
    );
  }

  cached = neon(connectionString);
  return cached;
}

/** timestamptz는 Date로, date는 문자열로 오는데 드라이버 버전에 따라 갈려서 둘 다 받는다. */
function toIsoString(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && value) return value;
  return null;
}

function toArticle(row: Record<string, unknown>): Article {
  return {
    id: String(row.id),
    title: String(row.title),
    url: String(row.url),
    urlKey: String(row.url_key),
    source: String(row.source),
    sourceLabel: String(row.source_label),
    publishedAt: toIsoString(row.published_at),
    summary: row.summary === null ? null : String(row.summary),
    insight: row.insight === null ? null : String(row.insight),
    importance: toImportance(row.importance),
    score: Number(row.score ?? 0),
    tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
    digestDate: toDateOnly(row.digest_date),
    createdAt: toIsoString(row.created_at) ?? new Date().toISOString(),
  };
}

// ── 읽기 ────────────────────────────────────────────────────────────────────

export async function listArticles(limit = 200): Promise<Article[]> {
  const sql = db();
  const rows = await sql`
    select *
      from article
     order by digest_date desc, score desc, created_at desc
     limit ${limit}
  `;
  return (rows as Record<string, unknown>[]).map(toArticle);
}

// ── 쓰기 ────────────────────────────────────────────────────────────────────

/**
 * 하루치 결과를 넣는다. 같은 id가 이미 있으면 갱신한다 —
 * 하루에 두 번 돌려도 중복 행이 생기지 않아야 한다.
 *
 * 건수가 열 개 남짓이라 행마다 한 쿼리씩 트랜잭션으로 묶는다.
 * (HTTP 왕복은 한 번이다)
 */
export async function upsertArticles(articles: ArticleInput[]): Promise<number> {
  if (articles.length === 0) return 0;

  const sql = db();
  await sql.transaction((txn) =>
    articles.map(
      (a) => txn`
        insert into article (
          id, title, url, url_key, source, source_label,
          published_at, summary, insight, importance, score, tags, digest_date
        ) values (
          ${a.id}, ${a.title}, ${a.url}, ${a.urlKey}, ${a.source}, ${a.sourceLabel},
          ${a.publishedAt}, ${a.summary}, ${a.insight}, ${a.importance},
          ${a.score}, ${a.tags}, ${a.digestDate}
        )
        on conflict (id) do update set
          title        = excluded.title,
          summary      = excluded.summary,
          insight      = excluded.insight,
          importance   = excluded.importance,
          score        = excluded.score,
          tags         = excluded.tags,
          digest_date  = excluded.digest_date
      `,
    ),
  );

  return articles.length;
}

// ── 평가 이력 ───────────────────────────────────────────────────────────────

/** 이미 평가해본 URL을 돌려준다. 이 목록을 빼고 나면 오늘 처음 보는 것만 남는다. */
export async function findSeen(urlKeys: string[]): Promise<Set<string>> {
  if (urlKeys.length === 0) return new Set();

  const sql = db();
  const rows = await sql`
    select url_key from seen_url where url_key = any(${urlKeys})
  `;
  return new Set(
    (rows as Record<string, unknown>[]).map((row) => String(row.url_key)),
  );
}

/**
 * 평가 이력을 남긴다. 탈락한 것도 넣어야 내일 다시 모델에 태우지 않는다.
 * 건수가 백 단위라 unnest로 한 문장에 밀어 넣는다.
 */
export async function markSeen(
  entries: { urlKey: string; source: string }[],
): Promise<number> {
  if (entries.length === 0) return 0;

  const sql = db();
  await sql`
    insert into seen_url (url_key, source)
    select * from unnest(
      ${entries.map((e) => e.urlKey)}::text[],
      ${entries.map((e) => e.source)}::text[]
    )
    on conflict (url_key) do nothing
  `;

  return entries.length;
}

// ── 삭제와 보존 ─────────────────────────────────────────────────────────────

export async function deleteArticle(id: string): Promise<boolean> {
  const sql = db();
  const rows = await sql`delete from article where id = ${id} returning id`;
  return (rows as unknown[]).length > 0;
}

export async function deleteAllArticles(): Promise<number> {
  const sql = db();
  const rows = await sql`delete from article returning id`;
  return (rows as unknown[]).length;
}

/**
 * 보존 기간이 지난 것을 지운다. 사용자가 삭제 버튼을 안 눌러도 DB가 알아서 정리되게 하는 장치.
 * 매일 워크플로 마지막에 부르므로 별도 크론이 필요 없다.
 */
export async function pruneOlderThan(
  days = 30,
): Promise<{ articles: number; seen: number }> {
  const sql = db();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const [articles, seen] = await sql.transaction((txn) => [
    txn`delete from article where created_at < ${cutoff} returning id`,
    txn`delete from seen_url where first_seen < ${cutoff} returning url_key`,
  ]);

  return {
    articles: (articles as unknown[]).length,
    seen: (seen as unknown[]).length,
  };
}
