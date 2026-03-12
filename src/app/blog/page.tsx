import { Suspense } from "react";
import { BlogFilter } from "@/components/BlogFilter";
import { BlogPostList } from "@/components/BlogPostList";

export const metadata = {
  title: "블로그 - 이준현",
  description: "소프트웨어 개발, 디자인, 그리고 다양한 생각들을 공유합니다.",
};

export default function BlogPage() {
  return (
    <main className="container py-10 lg:py-16 max-w-3xl mx-auto">
      <div className="space-y-4 mb-8">
        <h1 className="text-3xl font-bold tracking-tight">블로그</h1>
        <p className="text-muted-foreground">
          프로젝트 회고, 기술 글, 그리고 생각들을 모아둔 공간입니다.
        </p>
      </div>

      <Suspense>
        <div className="space-y-6">
          <BlogFilter />
          <BlogPostList />
        </div>
      </Suspense>
    </main>
  );
}
