import { listArticles } from "@/lib/ai-daily/db";
import type { Article } from "@/lib/ai-daily/types";

import { DigestList, type DigestGroup } from "./DigestList";

// 매 요청마다 DB를 읽는다. 삭제가 즉시 반영돼야 하고 트래픽도 적다.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "AI Daily - 이준현",
  description:
    "공식 블로그, GitHub, Hugging Face, Hacker News를 매일 아침 수집해 Claude가 선별한 AI 트렌드 브리핑.",
};

function groupByDigestDate(articles: Article[]): DigestGroup[] {
  const groups = new Map<string, Article[]>();

  for (const article of articles) {
    const bucket = groups.get(article.digestDate);
    if (bucket) {
      bucket.push(article);
    } else {
      groups.set(article.digestDate, [article]);
    }
  }

  return [...groups.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, items]) => ({ date, items }));
}

export default async function AiDailyPage() {
  let groups: DigestGroup[] = [];
  let loadError = false;

  try {
    groups = groupByDigestDate(await listArticles(300));
  } catch (error) {
    // DB가 잠깐 안 붙어도 포트폴리오 사이트가 500을 뱉으면 안 된다
    console.error("[ai-daily] 목록을 불러오지 못했습니다", error);
    loadError = true;
  }

  return (
    <main className="container py-10 lg:py-16 max-w-3xl mx-auto">
      <div className="space-y-4 mb-8">
        <h1 className="text-3xl font-bold tracking-tight">AI Daily</h1>
        <p className="text-muted-foreground">
          공식 블로그와 GitHub, Hugging Face, Hacker News를 매일 아침 모아
          Claude가 &ldquo;업무와 제품에 참고할 가치가 있는가&rdquo; 하나의 기준으로
          추린 브리핑입니다. 30일이 지난 항목은 자동으로 정리됩니다.
        </p>
      </div>

      {loadError ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
        </p>
      ) : (
        <DigestList groups={groups} />
      )}
    </main>
  );
}
