import { fetchJson } from "../lib/http";
import { isoDateDaysAgo, toIso, truncate } from "../lib/text";
import type { RawItem, SourceAdapter } from "../types";

/**
 * GitHub은 Trending 페이지에 공식 API가 없다. 대신 Search API로
 * "최근에 생긴 AI 토픽 리포를 별 순으로" 뽑으면 사실상 같은 신호가 나온다.
 *
 * 토픽별로 요청이 갈리므로 하나가 실패해도 나머지는 살린다.
 */

const TOPICS = ["llm", "ai-agents", "generative-ai", "rag", "mcp"];
const CREATED_WITHIN_DAYS = 45;
const PER_TOPIC = 8;

interface GhRepo {
  full_name?: string;
  html_url?: string;
  description?: string | null;
  stargazers_count?: number;
  created_at?: string;
  owner?: { login?: string };
}

interface GhSearchResponse {
  items?: GhRepo[];
}

export const githubTrending: SourceAdapter = {
  id: "github",
  label: "GitHub 신규 급상승",
  alwaysRelevant: true,
  // 제목이 "owner/repo" 식별자다
  titleIsIdentifier: true,
  // 생성일이 아니라 "지금 별이 붙고 있는가"가 신호다
  ignoreRecency: true,
  async fetch(): Promise<RawItem[]> {
    const since = isoDateDaysAgo(CREATED_WITHIN_DAYS);

    const headers: Record<string, string> = {
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
    };
    // Actions에서는 토큰이 주어진다. 있으면 검색 레이트리밋이 분당 10에서 30으로 올라간다.
    if (process.env.GITHUB_TOKEN) {
      headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const results = await Promise.allSettled(
      TOPICS.map(async (topic) => {
        const query = encodeURIComponent(`topic:${topic} created:>${since}`);
        const response = await fetchJson<GhSearchResponse>(
          `https://api.github.com/search/repositories?q=${query}&sort=stars&order=desc&per_page=${PER_TOPIC}`,
          headers,
        );
        return { topic, repos: response.items ?? [] };
      }),
    );

    const items: RawItem[] = [];
    for (const result of results) {
      if (result.status !== "fulfilled") continue;

      for (const repo of result.value.repos) {
        if (!repo.full_name || !repo.html_url) continue;

        items.push({
          title: repo.full_name,
          url: repo.html_url,
          summary: truncate(repo.description ?? undefined, 400),
          publishedAt: toIso(repo.created_at),
          author: repo.owner?.login,
          meta: {
            stars: repo.stargazers_count ?? 0,
            topic: result.value.topic,
          },
        });
      }
    }

    return items;
  },
};
