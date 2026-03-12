import Link from "next/link";

export const metadata = {
  title: "React Hooks, 이벤트 핸들링, 조건부 렌더링 - 이준현",
  description: "useState, useEffect 등 Hooks 기본부터 이벤트 처리, 조건부 렌더링, 리스트와 Keys까지 정리.",
};

export default function ReactHooksAndEventsPage() {
  return (
    <article className="container py-10 lg:py-16 max-w-3xl mx-auto">
      <div className="space-y-4 mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>2023.09.21</span>
          <span>&middot;</span>
          <span>글</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">
          React Hooks, 이벤트 핸들링, 조건부 렌더링
        </h1>
        <div className="flex flex-wrap gap-2">
          {["React", "Hooks", "이벤트"].map((tag) => (
            <span key={tag} className="px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="prose dark:prose-invert max-w-none space-y-8">
        <p>
          React 기초를 이어서 Hooks, 이벤트 핸들링, 조건부 렌더링, 리스트와 Keys를 한번에 정리했다.
          이 부분이 실제 컴포넌트를 만들 때 가장 많이 쓰이는 핵심 개념들이다.
        </p>

        <section>
          <h2>Hooks</h2>
          <p>
            Hooks는 함수형 컴포넌트에서 상태 관리와 사이드 이펙트를 다룰 수 있게 해주는 함수다.
            React 16.8에서 도입되었고, 클래스 컴포넌트 없이도 모든 React 기능을 사용할 수 있게 되었다.
          </p>
          <ul>
            <li><strong>useState</strong>: 컴포넌트에 상태를 추가. <code>{`const [count, setCount] = useState(0)`}</code></li>
            <li><strong>useEffect</strong>: 사이드 이펙트 처리 (데이터 fetching, 구독, DOM 조작 등)</li>
            <li><strong>useMemo / useCallback</strong>: 성능 최적화를 위한 메모이제이션</li>
            <li><strong>useRef</strong>: DOM 접근이나 리렌더링 없이 값을 유지할 때 사용</li>
          </ul>
          <p>
            Hook의 규칙: 최상위 레벨에서만 호출해야 하고, React 함수 컴포넌트 또는 커스텀 Hook 안에서만 호출해야 한다.
          </p>
        </section>

        <section>
          <h2>Handling Events</h2>
          <p>
            React의 이벤트 핸들링은 HTML과 비슷하지만 몇 가지 차이가 있다.
            이벤트 이름을 camelCase로 작성하고 (<code>onclick</code> → <code>onClick</code>),
            문자열 대신 함수를 전달한다.
          </p>
          <p>
            주의할 점은 이벤트 핸들러에서 <code>e.preventDefault()</code>를 명시적으로 호출해야 한다는 것.
            HTML처럼 <code>return false</code>로 기본 동작을 막을 수 없다.
          </p>
        </section>

        <section>
          <h2>Conditional Rendering</h2>
          <p>
            React에서 조건부 렌더링은 JavaScript 조건문을 그대로 사용한다.
          </p>
          <ul>
            <li><code>if</code> 문: 컴포넌트 상단에서 조건 분기 후 다른 JSX를 반환</li>
            <li>삼항 연산자: <code>{`condition ? <A /> : <B />`}</code></li>
            <li>논리 AND 연산자: <code>{`condition && <Component />`}</code> (조건이 true일 때만 렌더링)</li>
          </ul>
        </section>

        <section>
          <h2>List and Keys</h2>
          <p>
            배열 데이터를 <code>map()</code>으로 순회하면서 JSX 리스트를 생성한다.
            이때 각 항목에 고유한 <code>key</code> prop을 부여해야 한다.
          </p>
          <p>
            Key는 React가 어떤 항목이 변경/추가/삭제되었는지 식별하는 데 사용한다.
            배열의 index를 key로 사용하는 것은 순서가 바뀔 수 있는 경우 권장되지 않는다.
            가능하면 데이터의 고유 ID를 key로 사용하자.
          </p>
        </section>

        <section>
          <h2>정리하며</h2>
          <p>
            오늘 정리한 내용이 React로 실제 UI를 만들 때 가장 빈번하게 사용되는 패턴들이다.
            특히 Hooks는 React의 핵심이니 useState와 useEffect만이라도 확실히 이해해두자.
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
