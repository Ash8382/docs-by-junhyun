import Link from "next/link";

export const metadata = {
  title: "TIL: Zustand persist hydration 이슈 - 이준현",
  description: "SSR 환경에서 Zustand persist 미들웨어 사용 시 발생하는 hydration mismatch 해결법.",
};

export default function TilZustandPersistPage() {
  return (
    <article className="container py-10 lg:py-16 max-w-3xl mx-auto">
      <div className="space-y-4 mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>2026.02.28</span>
          <span>&middot;</span>
          <span>TIL</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">
          TIL: Zustand persist 미들웨어 사용 시 hydration 이슈
        </h1>
        <div className="flex flex-wrap gap-2">
          {["Zustand", "React", "TIL"].map((tag) => (
            <span key={tag} className="px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="prose dark:prose-invert max-w-none space-y-8">
        <div className="flex justify-center my-8">
          <img
            src="/posts/zustand-logo.png"
            alt="Zustand 로고"
            className="rounded-lg max-h-48 w-auto"
          />
        </div>

        <section>
          <h2>문제 상황</h2>
          <p>
            Zustand의 <code>persist</code> 미들웨어를 사용해서 로컬 스토리지에 상태를 저장하고 있었는데,
            Next.js에서 페이지 로드 시 hydration mismatch 경고가 발생했습니다.
          </p>
          <p>
            서버에서는 초기값으로 렌더링하고, 클라이언트에서는 로컬 스토리지의 값으로 렌더링하니까
            HTML이 달라지는 거였습니다.
          </p>
        </section>

        <section>
          <h2>해결 방법</h2>
          <p>
            Zustand에서 제공하는 <code>onRehydrateStorage</code> 콜백과
            커스텀 훅을 조합해서 해결했습니다.
            핵심은 클라이언트에서 hydration이 완료된 후에만 persist된 값을 사용하는 것입니다.
          </p>
        </section>

        <section>
          <h2>배운 점</h2>
          <p>
            SSR 환경에서 클라이언트 전용 스토리지를 사용할 때는 항상 hydration 타이밍을 고려해야 합니다.
            &quot;서버에서 이 값에 접근할 수 있는가?&quot;를 먼저 생각하는 습관이 중요하다는 걸 다시 느꼈습니다.
          </p>
        </section>
      </div>

      <hr className="my-12 border-border" />
      <div className="flex justify-center">
        <Link href="/blog" className="flex items-center justify-center rounded-md border border-input bg-background px-8 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground">
          목록으로 돌아가기
        </Link>
      </div>
    </article>
  );
}
