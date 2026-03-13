import Link from "next/link";

export const metadata = {
  title: "Tailwind CSS v4 마이그레이션 후기 - 이준현",
  description: "Tailwind v3에서 v4로 마이그레이션하면서 겪은 변경점과 삽질 기록.",
};

export default function TailwindV4MigrationPage() {
  return (
    <article className="container py-10 lg:py-16 max-w-3xl mx-auto">
      <div className="space-y-4 mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>2026.03.05</span>
          <span>&middot;</span>
          <span>글</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">
          Tailwind CSS v4 마이그레이션 후기
        </h1>
        <div className="flex flex-wrap gap-2">
          {["Tailwind CSS", "CSS"].map((tag) => (
            <span key={tag} className="px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="prose dark:prose-invert max-w-none space-y-8">
        <div className="flex justify-center my-8">
          <img
            src="/posts/tailwindcss-logo.png"
            alt="Tailwind CSS 로고"
            className="h-12 sm:h-16 w-auto"
          />
        </div>

        <section>
          <h2>왜 v4로 올렸나</h2>
          <p>
            이 블로그를 만들면서 처음부터 Tailwind v4를 사용했지만,
            회사 프로젝트는 아직 v3이었습니다.
            v4의 새로운 기능들이 매력적이라 마이그레이션을 결심했습니다.
          </p>
        </section>

        <section>
          <h2>주요 변경점</h2>
          <p>
            가장 큰 변화는 설정 방식입니다.
            <code>tailwind.config.js</code> 대신 CSS 파일 안에서 <code>@theme</code> 블록으로 디자인 토큰을 정의합니다.
            플러그인도 <code>@plugin</code> 지시어로 가져옵니다.
          </p>
          <p>
            또한 <code>@import &quot;tailwindcss&quot;</code> 한 줄로 모든 레이어를 불러올 수 있어서
            기존의 <code>@tailwind base/components/utilities</code> 패턴이 사라졌습니다.
          </p>
        </section>

        <section>
          <h2>삽질 포인트</h2>
          <ul>
            <li><strong>커스텀 색상 변수</strong>: CSS 변수로 정의한 색상을 <code>@theme inline</code>에서 매핑해야 Tailwind 클래스로 사용 가능</li>
            <li><strong>Typography 플러그인</strong>: <code>@plugin &quot;@tailwindcss/typography&quot;</code>로 변경</li>
            <li><strong>container 클래스</strong>: v4에서 자동 센터링이 빠져서 직접 CSS로 정의해야 함</li>
          </ul>
        </section>

        <section>
          <h2>결론</h2>
          <p>
            v4는 설정이 훨씬 깔끔해졌고, CSS-native한 방향으로 발전하고 있어서 좋았습니다.
            다만 기존 v3 프로젝트의 마이그레이션은 설정 파일을 꼼꼼히 옮겨야 해서 시간이 좀 걸립니다.
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
