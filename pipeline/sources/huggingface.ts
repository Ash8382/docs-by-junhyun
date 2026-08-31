import { fetchJson } from "../lib/http";
import { toIso, truncate } from "../lib/text";
import type { RawItem, SourceAdapter } from "../types";

/**
 * Hugging Face는 인증 없이 두 종류의 신호를 준다.
 *  - daily_papers: 사람이 골라 올린 그날의 논문. arXiv 원본보다 신호 대 잡음비가 훨씬 낫다.
 *  - models?sort=likes7d: 최근 일주일 반응이 몰린 모델. 신규 릴리스가 여기로 먼저 뜬다.
 */

interface HfPaperEntry {
  paper?: {
    id?: string;
    title?: string;
    summary?: string;
    publishedAt?: string;
    authors?: { name?: string }[];
  };
  publishedAt?: string;
  numComments?: number;
}

export const hfPapers: SourceAdapter = {
  id: "hf-papers",
  label: "Hugging Face Daily Papers",
  alwaysRelevant: true,
  async fetch(): Promise<RawItem[]> {
    // 하루치를 조금 넘는 정도만 받는다. 더 받아도 데일리 리포트의 논문 자리는 한둘뿐이라
    // 뒤에서 모델에 태울 후보만 불어난다.
    const entries = await fetchJson<HfPaperEntry[]>(
      "https://huggingface.co/api/daily_papers?limit=15",
    );

    return entries.flatMap((entry) => {
      const paper = entry.paper;
      if (!paper?.id || !paper.title) return [];

      return [
        {
          title: paper.title.replace(/\s+/g, " ").trim(),
          url: `https://huggingface.co/papers/${paper.id}`,
          summary: truncate(paper.summary?.replace(/\s+/g, " "), 500),
          publishedAt: toIso(paper.publishedAt ?? entry.publishedAt),
          author: paper.authors?.[0]?.name,
          meta: {
            arxivId: paper.id,
            comments: entry.numComments ?? 0,
          },
        },
      ];
    });
  },
};

interface HfModel {
  id?: string;
  author?: string;
  likes?: number;
  downloads?: number;
  trendingScore?: number;
  pipeline_tag?: string;
  createdAt?: string;
  lastModified?: string;
}

export const hfModels: SourceAdapter = {
  id: "hf-models",
  label: "Hugging Face Trending Models",
  alwaysRelevant: true,
  // 제목이 "Qwen/Qwen3.8-Flash-Next" 같은 식별자라 제목 유사도 판정에서 뺀다
  titleIsIdentifier: true,
  // 트렌딩 목록이라 갱신일이 아니라 순위가 신호다
  ignoreRecency: true,
  async fetch(): Promise<RawItem[]> {
    const models = await fetchJson<HfModel[]>(
      "https://huggingface.co/api/models?sort=likes7d&direction=-1&limit=20",
    );

    return models.flatMap((model) => {
      if (!model.id) return [];

      const facts = [
        model.pipeline_tag,
        model.likes !== undefined ? `좋아요 ${model.likes.toLocaleString()}` : undefined,
        model.downloads !== undefined
          ? `다운로드 ${model.downloads.toLocaleString()}`
          : undefined,
      ].filter(Boolean);

      return [
        {
          title: model.id,
          url: `https://huggingface.co/${model.id}`,
          summary: facts.length > 0 ? facts.join(" · ") : undefined,
          // 트렌딩 목록이라 생성일보다 최근 갱신일이 실제 신호에 가깝다
          publishedAt: toIso(model.lastModified ?? model.createdAt),
          author: model.author,
          meta: {
            likes: model.likes ?? 0,
            downloads: model.downloads ?? 0,
            trendingScore: model.trendingScore ?? 0,
          },
        },
      ];
    });
  },
};
