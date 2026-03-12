import Link from "next/link";
import { sortedPosts } from "@/data/posts";
import { PostListItem } from "@/components/PostListItem";
import { FadeIn } from "@/components/FadeIn";

export default function Home() {
  return (
    <main className="container py-10 lg:py-16 max-w-3xl mx-auto">
      {/* Intro */}
      <FadeIn>
        <section className="space-y-4 mb-12">
          <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">
            이준현
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            사용자를 위한 창의적 몰입, 성장을 즐기는 프론트엔드 개발자입니다.
            <br />
            기획부터 배포까지 빈틈을 채우며 서비스를 주도합니다.
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <a
              href="https://github.com/Ash8382"
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground transition-colors underline underline-offset-4"
            >
              GitHub
            </a>
            <span className="text-border">|</span>
            <span>one31798883@gmail.com</span>
            <span className="text-border">|</span>
            <Link
              href="/about"
              className="hover:text-foreground transition-colors underline underline-offset-4"
            >
              About
            </Link>
          </div>
        </section>
      </FadeIn>

      {/* Recent Posts */}
      <FadeIn delay={0.1}>
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-semibold tracking-tight">
              최근 글
            </h2>
            <Link
              href="/blog"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              전체 보기
            </Link>
          </div>
          <div className="divide-y divide-border">
            {sortedPosts.map((post) => (
              <PostListItem key={post.slug} {...post} />
            ))}
          </div>
        </section>
      </FadeIn>
    </main>
  );
}
