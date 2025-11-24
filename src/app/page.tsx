import Link from "next/link";
import { PostCard } from "@/components/PostCard";
import { FadeIn } from "@/components/FadeIn";

export default function Home() {
  return (
    <main className="container py-6 lg:py-10">
      <FadeIn>
        <section className="flex flex-col items-start gap-4 md:flex-row md:justify-between md:gap-8">
          <div className="flex-1 space-y-4">
            <h1 className="inline-block font-bold text-4xl tracking-tight lg:text-5xl">
              안녕하세요, 이준현입니다 👋
            </h1>
            <p className="text-xl text-muted-foreground">
              무언가 만드는 것을 좋아하는 소프트웨어 엔지니어입니다. <br className="hidden sm:inline" />
              이곳은 제가 배운 것들과 사이드 프로젝트를 기록하는 공간입니다.
            </p>
          </div>
        </section>
      </FadeIn>
      <hr className="my-8 border-border" />
      <FadeIn delay={0.2}>
        <section className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-3xl tracking-tight">프로젝트</h2>
            <Link href="/blog" className="text-sm text-muted-foreground hover:text-foreground">
              전체 보기
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Mock Data for now */}
            <PostCard
              slug="hello-world"
              title="첫 번째 글"
              description="블로그를 시작하며 남기는 첫 번째 글입니다."
              date="2025년 11월 24일"
              image="https://images.unsplash.com/photo-1499750310159-5b5f38e31638?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
            />
            <PostCard
              slug="building-this-blog"
              title="Next.js로 블로그 만들기"
              description="Next.js, Tailwind CSS, Vercel을 사용하여 이 블로그를 만든 과정을 공유합니다."
              date="2025년 11월 23일"
              image="https://images.unsplash.com/photo-1555066931-4365d14bab8c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
            />
            <PostCard
              slug="side-project-1"
              title="사이드 프로젝트: 투두 리스트"
              description="React와 Firebase를 활용하여 만든 간단한 투두 리스트 앱입니다."
              date="2025년 11월 15일"
              image="https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
            />
          </div>
        </section>
      </FadeIn>
    </main>
  );
}
