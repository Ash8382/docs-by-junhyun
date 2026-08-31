import { createHash } from "node:crypto";

/**
 * URL 정규화와 제목 유사도 계산.
 *
 * 같은 기사가 매체마다 다른 추적 파라미터를 달고 오기 때문에, 중복 판정은 원본 URL이 아니라
 * 여기서 만든 urlKey로 한다. 원본 URL은 화면에 그대로 보여줘야 하므로 따로 보존한다.
 */

const TRACKING_PREFIXES = /^(utm_|_hs|mc_|pk_|vero_)/i;
const TRACKING_EXACT = new Set([
  "fbclid",
  "gclid",
  "igshid",
  "mkt_tok",
  "yclid",
  "si",
  "ref",
  "referrer",
  "source",
  "cmpid",
]);

export function normalizeUrl(raw: string): string {
  try {
    const url = new URL(raw.trim());
    url.hash = "";
    url.protocol = "https:";
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");

    for (const key of [...url.searchParams.keys()]) {
      if (TRACKING_PREFIXES.test(key) || TRACKING_EXACT.has(key.toLowerCase())) {
        url.searchParams.delete(key);
      }
    }
    url.searchParams.sort();

    if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
      url.pathname = url.pathname.slice(0, -1);
    }

    return url.toString();
  } catch {
    // 파싱이 안 되는 문자열은 그대로 둔다. 어차피 자기 자신하고만 중복 판정된다.
    return raw.trim();
  }
}

export function hashId(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "for", "to", "of", "in", "on", "at", "by",
  "with", "from", "is", "are", "was", "were", "be", "as", "it", "its", "that",
  "this", "we", "you", "your", "our", "new", "how", "why", "what", "can",
]);

/** 제목 유사도 비교용 토큰 집합. 불용어와 기호를 걷어낸다. */
export function titleTokens(title: string): Set<string> {
  const cleaned = title
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOPWORDS.has(token));

  return new Set(cleaned);
}

/** 두 토큰 집합의 자카드 유사도. 0이면 안 겹침, 1이면 완전 동일. */
export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;

  let shared = 0;
  for (const token of a) {
    if (b.has(token)) shared += 1;
  }

  return shared / (a.size + b.size - shared);
}
