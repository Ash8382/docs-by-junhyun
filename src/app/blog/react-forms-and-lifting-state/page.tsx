import Link from "next/link";

export const metadata = {
  title: "React Forms와 State 끌어올리기 - 이준현",
  description: "Controlled Component로 폼을 다루는 방법과 Lifting State Up 패턴 학습 기록.",
};

export default function ReactFormsAndLiftingStatePage() {
  return (
    <article className="container py-10 lg:py-16 max-w-3xl mx-auto">
      <div className="space-y-4 mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>2023.09.22</span>
          <span>&middot;</span>
          <span>글</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">
          React Forms와 State 끌어올리기
        </h1>
        <div className="flex flex-wrap gap-2">
          {["React", "Forms", "State"].map((tag) => (
            <span key={tag} className="px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="prose dark:prose-invert max-w-none space-y-8">
        <div className="flex justify-center my-8">
          <img
            src="/posts/react-logo.png"
            alt="React 로고"
            className="h-28 sm:h-36 w-auto"
          />
        </div>

        <p>
          Forms와 Lifting State Up은 실무에서 정말 많이 마주치는 패턴이다.
          폼 데이터를 어떻게 관리하고, 여러 컴포넌트 간에 상태를 어떻게 공유하는지 정리했다.
        </p>

        <section>
          <h2>Forms - Controlled Component</h2>
          <p>
            HTML 폼 요소는 자체적으로 상태를 가지고 있다.
            React에서는 이 상태를 컴포넌트의 State로 관리하는 &quot;Controlled Component&quot; 패턴을 사용한다.
          </p>
          <p>
            <code>input</code>, <code>textarea</code>, <code>select</code> 등의 값을 State로 관리하고,
            <code>onChange</code> 이벤트로 State를 업데이트하는 방식이다.
            이렇게 하면 폼 데이터의 &quot;단일 진실 공급원(Single Source of Truth)&quot;이 React State가 된다.
          </p>
          <p>
            여러 input을 다룰 때는 각 input에 <code>name</code> 속성을 부여하고,
            하나의 핸들러에서 <code>e.target.name</code>으로 분기 처리할 수 있다.
          </p>
        </section>

        <section>
          <h2>Lifting State Up (State 끌어올리기)</h2>
          <p>
            두 개 이상의 컴포넌트가 같은 데이터를 공유해야 할 때,
            해당 State를 가장 가까운 공통 부모 컴포넌트로 올리는 패턴이다.
          </p>
          <p>
            예를 들어, 섭씨 입력 컴포넌트와 화씨 입력 컴포넌트가 서로 연동되어야 한다면,
            온도 State를 부모 컴포넌트에서 관리하고, 각 자식에게 Props로 내려주는 것이다.
          </p>
          <p>
            이 패턴의 핵심 원칙:
          </p>
          <ul>
            <li>State는 해당 데이터를 필요로 하는 컴포넌트들의 공통 부모에 위치시킨다</li>
            <li>부모가 State를 소유하고, 자식에게 값과 변경 함수를 Props로 전달한다</li>
            <li>데이터는 항상 위에서 아래로 흐른다 (단방향 데이터 흐름)</li>
          </ul>
        </section>

        <section>
          <h2>정리하며</h2>
          <p>
            Lifting State Up은 React의 데이터 흐름을 이해하는 핵심 패턴이다.
            나중에 상태 관리 라이브러리(Redux, Zustand 등)를 배울 때도 이 개념이 기반이 되니
            확실히 이해하고 넘어가는 게 좋겠다.
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
