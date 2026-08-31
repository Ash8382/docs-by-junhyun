import { hashId, jaccard, normalizeUrl, titleTokens } from "../lib/url";
import type { CollectedItem, NormalizedItem, SourceAdapter } from "../types";

/**
 * 중복 제거는 두 단계다.
 *
 * 1. URL 정규화 후 완전 일치 — 같은 글이 추적 파라미터만 다르게 여러 번 들어온 경우
 * 2. 제목 토큰 유사도 — 같은 소식을 여러 매체가 각자 제목을 붙여 올린 경우
 *
 * 둘 중 무엇을 남길지는 소스 우선순위로 정한다. 같은 발표라면 기자가 옮겨 쓴 기사보다
 * 회사가 직접 쓴 원문이 낫다.
 */

const SOURCE_PRIORITY: Record<string, number> = {
  anthropic: 100,
  openai: 100,
  deepmind: 100,
  "hf-papers": 80,
  "hf-models": 80,
  github: 70,
  simonwillison: 60,
  hackernews: 50,
  arxiv: 40,
  "techcrunch-ai": 30,
};

const TITLE_SIMILARITY_THRESHOLD = 0.75;

function priorityOf(item: CollectedItem): number {
  return SOURCE_PRIORITY[item.source] ?? 0;
}

export interface DedupeOutcome {
  kept: NormalizedItem[];
  removedByUrl: number;
  removedByTitle: number;
}

export function dedupe(
  items: CollectedItem[],
  adapters: SourceAdapter[],
): DedupeOutcome {
  const identifierTitleSources = new Set(
    adapters.filter((a) => a.titleIsIdentifier).map((a) => a.id),
  );

  const normalized: NormalizedItem[] = items.map((item) => {
    const urlKey = normalizeUrl(item.url);
    return { ...item, urlKey, id: hashId(urlKey) };
  });

  const byUrl = new Map<string, NormalizedItem>();
  for (const item of normalized) {
    const existing = byUrl.get(item.urlKey);
    if (!existing || priorityOf(item) > priorityOf(existing)) {
      byUrl.set(item.urlKey, item);
    }
  }
  const removedByUrl = normalized.length - byUrl.size;

  // 우선순위 높은 것부터 자리를 잡아야 나중에 온 중복이 밀려난다
  const ordered = [...byUrl.values()].sort(
    (a, b) => priorityOf(b) - priorityOf(a),
  );

  const kept: NormalizedItem[] = [];
  const keptTokens: Set<string>[] = [];

  for (const item of ordered) {
    // 리포 이름이나 모델 이름은 문장이 아니다. 비슷한 이름의 다른 물건을
    // 같은 것으로 묶어버릴 위험이 커서 제목 유사도 판정에서 뺀다.
    if (identifierTitleSources.has(item.source)) {
      kept.push(item);
      continue;
    }

    const tokens = titleTokens(item.title);
    const isDuplicate = keptTokens.some(
      (existing) => jaccard(existing, tokens) >= TITLE_SIMILARITY_THRESHOLD,
    );
    if (isDuplicate) continue;

    kept.push(item);
    keptTokens.push(tokens);
  }

  return {
    kept,
    removedByUrl,
    removedByTitle: byUrl.size - kept.length,
  };
}
