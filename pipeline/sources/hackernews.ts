import { fetchJson } from "../lib/http";
import { toIso } from "../lib/text";
import type { RawItem, SourceAdapter } from "../types";

/**
 * HN은 검색어로 좁히지 않고 최근 48시간 상위 글을 통째로 받아온 뒤
 * 관련성 필터에 맡긴다. "AI"로 질의하면 제목에 그 단어가 없는 글을 통째로 놓치는데,
 * 정작 중요한 글일수록 제목이 구체적이라 그 단어가 안 들어 있다.
 */

const WINDOW_HOURS = 48;
const MIN_POINTS = 40;
const HITS = 100;

interface HnHit {
  objectID?: string;
  title?: string;
  url?: string;
  points?: number;
  num_comments?: number;
  created_at?: string;
  author?: string;
}

interface HnSearchResponse {
  hits?: HnHit[];
}

export const hackerNews: SourceAdapter = {
  id: "hackernews",
  label: "Hacker News",
  async fetch(): Promise<RawItem[]> {
    const since = Math.floor(Date.now() / 1000) - WINDOW_HOURS * 60 * 60;
    const filters = encodeURIComponent(
      `created_at_i>${since},points>${MIN_POINTS}`,
    );

    const response = await fetchJson<HnSearchResponse>(
      `https://hn.algolia.com/api/v1/search_by_date?tags=story&numericFilters=${filters}&hitsPerPage=${HITS}`,
    );

    return (response.hits ?? []).flatMap((hit) => {
      if (!hit.title) return [];

      // Ask HN 같은 글은 외부 링크가 없다. 이때는 토론 페이지가 곧 원문이다.
      const url =
        hit.url ??
        (hit.objectID
          ? `https://news.ycombinator.com/item?id=${hit.objectID}`
          : undefined);
      if (!url) return [];

      return [
        {
          title: hit.title.trim(),
          url,
          publishedAt: toIso(hit.created_at),
          author: hit.author,
          meta: {
            points: hit.points ?? 0,
            comments: hit.num_comments ?? 0,
            discussion: hit.objectID
              ? `https://news.ycombinator.com/item?id=${hit.objectID}`
              : "",
          },
        },
      ];
    });
  },
};
