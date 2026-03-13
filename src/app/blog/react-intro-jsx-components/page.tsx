import Link from "next/link";

export const metadata = {
  title: "React 입문: JSX, 렌더링, 컴포넌트와 Props - 이준현",
  description: "React의 시작점. JSX 문법부터 컴포넌트 설계, Props, State와 Lifecycle까지 기초 개념 정리.",
};

export default function ReactIntroPage() {
  return (
    <article className="container py-10 lg:py-16 max-w-3xl mx-auto">
      <div className="space-y-4 mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>2023.09.20</span>
          <span>&middot;</span>
          <span>글</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">
          React 입문: JSX, 렌더링, 컴포넌트와 Props
        </h1>
        <div className="flex flex-wrap gap-2">
          {["React", "JSX", "컴포넌트"].map((tag) => (
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
          ES6 정리를 마치고 드디어 React에 입문했다.
          Introduction to React부터 JSX, Rendering Elements, Components and Props, State and Lifecycle까지
          기초 개념을 한번에 정리한다.
        </p>

        <section>
          <h2>React란?</h2>
          <p>
            React는 사용자 인터페이스를 만들기 위한 JavaScript 라이브러리다.
            컴포넌트 기반으로 UI를 구성하며, Virtual DOM을 통해 효율적으로 화면을 업데이트한다.
            &quot;선언적(Declarative)&quot; 방식으로 UI를 작성한다는 것이 핵심이다.
          </p>
        </section>

        <section>
          <h2>JSX (JavaScript XML)</h2>
          <p>
            JSX는 JavaScript 안에서 HTML과 유사한 마크업을 작성할 수 있게 해주는 문법 확장이다.
            브라우저가 직접 이해하지는 못하고, Babel 같은 트랜스파일러가 <code>React.createElement()</code> 호출로 변환한다.
          </p>
          <p>
            주의할 점은 <code>class</code> 대신 <code>className</code>을 사용하고,
            모든 태그는 반드시 닫아야 한다는 것이다. 또한 JSX 내에서 JavaScript 표현식은
            중괄호 <code>{`{}`}</code>로 감싸서 사용한다.
          </p>
        </section>

        <section>
          <h2>Rendering Elements</h2>
          <p>
            Element는 React 앱의 가장 작은 단위다.
            <code>ReactDOM.render()</code> (또는 React 18의 <code>createRoot</code>)를 통해
            DOM에 렌더링된다. React Element는 불변 객체이기 때문에,
            UI를 업데이트하려면 새로운 Element를 생성해서 전달해야 한다.
          </p>
        </section>

        <section>
          <h2>Components and Props</h2>
          <p>
            컴포넌트는 UI를 재사용 가능한 독립적인 조각으로 나눈 것이다.
            함수형 컴포넌트와 클래스형 컴포넌트가 있는데, 현재는 함수형 컴포넌트가 표준이다.
          </p>
          <p>
            Props는 부모 컴포넌트가 자식에게 전달하는 데이터다.
            중요한 규칙은 Props는 읽기 전용(Read-only)이라는 것.
            컴포넌트는 자신의 Props를 직접 수정해서는 안 된다.
          </p>
        </section>

        <section>
          <h2>State and Lifecycle</h2>
          <p>
            State는 컴포넌트 내부에서 관리하는 데이터다. Props와 달리 컴포넌트 스스로 변경할 수 있다.
            State가 변경되면 React는 해당 컴포넌트를 다시 렌더링한다.
          </p>
          <p>
            Lifecycle은 컴포넌트가 생성(mount)되고, 업데이트되고, 제거(unmount)되는 과정이다.
            함수형 컴포넌트에서는 <code>useEffect</code> Hook으로 라이프사이클을 다룬다.
          </p>
        </section>

        <section>
          <h2>정리하며</h2>
          <p>
            React의 기본 구성 요소를 한번에 훑어봤다. JSX가 처음엔 어색했는데,
            &quot;HTML처럼 생긴 JavaScript&quot;라고 생각하니 금방 익숙해졌다.
            컴포넌트 분리와 Props/State의 차이를 이해하는 것이 React의 첫걸음인 것 같다.
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
