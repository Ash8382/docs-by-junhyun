import type { SourceAdapter } from "../types";
import { anthropicNews } from "./anthropic";
import { feedSource } from "./feed";
import { githubTrending } from "./github";
import { hackerNews } from "./hackernews";
import { hfModels, hfPapers } from "./huggingface";

/**
 * 수집처 목록. 여기 한 줄 추가하면 파이프라인 전체가 알아서 태운다.
 *
 * 원래 X와 Threads를 주 수집처로 잡았지만 둘 다 무료로 읽을 방법이 없어 뺐다.
 * (X는 읽기 권한이 유료 티어부터, Threads는 타인 콘텐츠 검색 엔드포인트 자체가 없음)
 * 그 자리를 공식 블로그·HF·GitHub·HN으로 메웠다. X에서 도는 얘기의 원본은 대개
 * 이쪽에 먼저 올라오고, 담론은 HN에 더 정제된 형태로 다시 뜬다.
 *
 * arXiv 원본 피드는 1차 수집 결과를 보고 뺐다. Hugging Face daily_papers가 같은 논문을
 * 사람 손을 거쳐 골라 주는데, 그 위에 cs.AI 최신 투고를 그대로 얹으면 후보만 불어나고
 * 걸러야 할 양이 늘었다.
 */
export const SOURCES: SourceAdapter[] = [
  feedSource({
    id: "openai",
    label: "OpenAI News",
    url: "https://openai.com/news/rss.xml",
    alwaysRelevant: true,
  }),
  feedSource({
    id: "deepmind",
    label: "Google DeepMind",
    url: "https://deepmind.google/blog/rss.xml",
    alwaysRelevant: true,
  }),
  anthropicNews,
  hfPapers,
  hfModels,
  githubTrending,
  hackerNews,
  feedSource({
    id: "techcrunch-ai",
    label: "TechCrunch AI",
    url: "https://techcrunch.com/category/artificial-intelligence/feed/",
    alwaysRelevant: true,
  }),
  feedSource({
    id: "simonwillison",
    label: "Simon Willison",
    url: "https://simonwillison.net/atom/everything/",
    limit: 20,
  }),
];
