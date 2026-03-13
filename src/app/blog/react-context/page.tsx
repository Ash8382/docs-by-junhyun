import Link from "next/link";

export const metadata = {
  title: "React Context, Composition vs Inheritance 정리 - 이준현",
  description: "Context API를 활용한 전역 상태 관리와 합성 vs 상속 패턴의 차이를 정리.",
};

export default function ReactContextPage() {
  return (
    <article className="container py-10 lg:py-16 max-w-3xl mx-auto">
      <div className="space-y-4 mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>2023.09.23</span>
          <span>&middot;</span>
          <span>글</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">
          React Context, Composition vs Inheritance 정리
        </h1>
        <div className="flex flex-wrap gap-2">
          {["React", "Context", "디자인패턴"].map((tag) => (
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
          React 기초 학습의 마지막 파트. Context API와 Composition vs Inheritance 패턴을 정리한다.
          여기까지 오면 React의 공식 문서 &quot;주요 개념&quot; 섹션을 모두 커버하게 된다.
        </p>

        <section>
          <h2>Composition vs Inheritance</h2>
          <p>
            React에서는 상속(Inheritance)보다 <strong>합성(Composition)</strong>을 권장한다.
            컴포넌트를 확장하고 싶을 때 상속 대신, Props로 컴포넌트를 전달하는 방식을 사용한다.
          </p>
          <p>
            대표적인 패턴이 <strong>children prop</strong>이다.
            컴포넌트 태그 사이에 넣은 내용이 <code>children</code>으로 전달되어,
            레이아웃 컴포넌트나 모달 같은 &quot;컨테이너&quot; 역할의 컴포넌트를 만들 수 있다.
          </p>
          <p>
            특정 위치에 여러 컴포넌트를 배치해야 할 때는 <code>children</code> 대신
            커스텀 Props(예: <code>left</code>, <code>right</code>)를 사용하면 된다.
            Facebook에서도 수천 개의 컴포넌트를 만들면서 상속이 필요한 경우를 찾지 못했다고 한다.
          </p>
        </section>

        <section>
          <h2>Context API</h2>
          <p>
            Context는 Props를 여러 단계에 걸쳐 전달하지 않고도 (prop drilling 없이)
            컴포넌트 트리 전체에 데이터를 공유할 수 있게 해준다.
          </p>
          <p>
            사용 흐름:
          </p>
          <ol>
            <li><code>React.createContext()</code>로 Context 객체 생성</li>
            <li><code>Context.Provider</code>로 값을 공급할 영역을 감싸기</li>
            <li>하위 컴포넌트에서 <code>useContext()</code> Hook으로 값을 소비</li>
          </ol>
          <p>
            테마(다크/라이트 모드), 로그인 사용자 정보, 언어 설정 등
            &quot;전역적으로&quot; 필요한 데이터에 적합하다.
          </p>
          <p>
            다만 Context를 남용하면 컴포넌트 재사용이 어려워질 수 있으니,
            정말 여러 레벨에 걸쳐 데이터를 전달해야 할 때만 사용하는 것이 좋다.
            단순한 prop drilling은 오히려 컴포넌트 합성(Composition)으로 해결하는 게 더 깔끔할 수 있다.
          </p>
        </section>

        <section>
          <h2>React 기초 학습을 마치며</h2>
          <p>
            9월 19일 ES6 정리부터 시작해서 오늘 Context까지, 5일간 React 공식 문서의 주요 개념을 모두 훑어봤다.
            이제 이론적인 기초는 갖춰졌으니, 실제 프로젝트를 만들면서 체득해야 할 차례다.
            다음은 멀티캠퍼스 과정에서 팀 프로젝트로 직접 React를 사용해볼 예정이다.
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
