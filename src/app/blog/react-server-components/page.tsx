import Link from "next/link";

export const metadata = {
  title: "React Server Components 제대로 이해하기 - 이준현",
  description: "RSC가 기존 SSR과 어떻게 다른지, Next.js App Router에서의 동작 원리를 정리합니다.",
};

export default function ReactServerComponentsPage() {
  return (
    <article className="container py-10 lg:py-16 max-w-3xl mx-auto">
      <div className="space-y-4 mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>2026.03.10</span>
          <span>&middot;</span>
          <span>글</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">
          React Server Components 제대로 이해하기
        </h1>
        <div className="flex flex-wrap gap-2">
          {["React", "Next.js", "RSC"].map((tag) => (
            <span key={tag} className="px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="prose dark:prose-invert max-w-none space-y-8">
        <section>
          <h2>들어가며</h2>
          <p>
            React Server Components(RSC)는 React 18에서 소개된 새로운 패러다임입니다.
            기존 SSR과 혼동되기 쉽지만, 근본적으로 다른 개념이에요.
            이 글에서는 RSC가 무엇인지, 왜 필요한지, 그리고 실제로 어떻게 사용하는지 정리해봤습니다.
          </p>
        </section>

        <section>
          <h2>SSR vs RSC</h2>
          <p>
            <strong>SSR(Server-Side Rendering)</strong>은 서버에서 HTML을 생성해 클라이언트에 전달하고,
            클라이언트에서 hydration을 통해 인터랙티브하게 만드는 방식입니다.
            컴포넌트의 JavaScript 번들은 여전히 클라이언트로 전송됩니다.
          </p>
          <p>
            반면 <strong>RSC</strong>는 서버에서만 실행되는 컴포넌트입니다.
            이 컴포넌트의 JavaScript는 클라이언트 번들에 포함되지 않습니다.
            서버에서 렌더링된 결과(React 트리의 직렬화된 형태)만 클라이언트로 전달됩니다.
          </p>
        </section>

        <section>
          <h2>Next.js App Router에서의 활용</h2>
          <p>
            Next.js 13+ App Router에서는 기본적으로 모든 컴포넌트가 Server Component입니다.
            클라이언트 인터랙션이 필요한 경우에만 <code>&quot;use client&quot;</code> 지시어를 추가합니다.
          </p>
          <p>
            이 패턴의 핵심은 &quot;서버에서 할 수 있는 건 서버에서&quot;라는 원칙입니다.
            데이터 fetching, 무거운 라이브러리 사용, 민감한 로직 등을 서버에 두고,
            클라이언트에는 최소한의 인터랙션 코드만 보내는 거죠.
          </p>
        </section>

        <section>
          <h2>마치며</h2>
          <p>
            RSC를 이해하면 &quot;이 코드가 어디서 실행되는가?&quot;를 항상 의식하게 됩니다.
            이 사고방식이 더 나은 성능과 사용자 경험으로 이어진다고 생각합니다.
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
