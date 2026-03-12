import Link from "next/link";

export const metadata = {
  title: "JavaScript ES6 핵심 문법 총정리 - 이준현",
  description: "let/const, 화살표 함수, 템플릿 리터럴, 구조분해 할당, 스프레드 연산자, Promise 등 ES6 핵심 문법 정리.",
};

export default function JavaScriptES6Page() {
  return (
    <article className="container py-10 lg:py-16 max-w-3xl mx-auto">
      <div className="space-y-4 mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>2023.09.19</span>
          <span>&middot;</span>
          <span>글</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">
          JavaScript ES6 핵심 문법 총정리
        </h1>
        <div className="flex flex-wrap gap-2">
          {["JavaScript", "ES6"].map((tag) => (
            <span key={tag} className="px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="prose dark:prose-invert max-w-none space-y-8">
        <p>
          React를 본격적으로 배우기 전에, ES6 문법을 먼저 정리했다.
          React 코드 곳곳에서 ES6 문법이 쓰이기 때문에 기초를 탄탄히 해두는 게 중요하다고 느꼈다.
        </p>

        <section>
          <h2>let과 const</h2>
          <p>
            <code>var</code>는 함수 스코프, <code>let</code>과 <code>const</code>는 블록 스코프를 가진다.
            <code>const</code>는 재할당이 불가능하고, <code>let</code>은 재할당이 가능하다.
            기본적으로 <code>const</code>를 사용하고, 재할당이 필요한 경우에만 <code>let</code>을 사용하는 것이 권장된다.
          </p>
        </section>

        <section>
          <h2>화살표 함수 (Arrow Function)</h2>
          <p>
            <code>{`const add = (a, b) => a + b`}</code> 형태로, 기존 <code>function</code> 키워드보다 간결하게 작성할 수 있다.
            특히 콜백 함수에서 <code>this</code> 바인딩이 상위 스코프를 따르기 때문에,
            React 이벤트 핸들러에서 자주 사용된다.
          </p>
        </section>

        <section>
          <h2>템플릿 리터럴</h2>
          <p>
            백틱(`)을 사용해서 문자열 안에 변수를 <code>{`\${variable}`}</code> 형태로 삽입할 수 있다.
            여러 줄 문자열도 자연스럽게 작성 가능하다.
          </p>
        </section>

        <section>
          <h2>구조분해 할당 (Destructuring)</h2>
          <p>
            객체나 배열에서 값을 꺼내 변수에 담을 수 있다.
            React에서 props를 받을 때 <code>{`({ title, description })`}</code> 형태로 많이 사용한다.
            배열 구조분해는 <code>useState</code>의 <code>{`const [state, setState]`}</code> 패턴에서 핵심적으로 쓰인다.
          </p>
        </section>

        <section>
          <h2>스프레드 연산자와 Rest 파라미터</h2>
          <p>
            <code>...</code> 연산자는 배열이나 객체를 펼칠 때(스프레드), 나머지 인자를 모을 때(Rest) 사용한다.
            불변성을 유지하면서 상태를 업데이트할 때 필수적인 문법이다.
          </p>
        </section>

        <section>
          <h2>Promise와 비동기 처리</h2>
          <p>
            <code>Promise</code>는 비동기 작업의 결과를 나타내는 객체다.
            <code>async/await</code> 문법을 사용하면 비동기 코드를 동기적으로 읽히게 작성할 수 있다.
            API 호출 시 필수적으로 사용되는 패턴이다.
          </p>
        </section>

        <section>
          <h2>정리하며</h2>
          <p>
            ES6 문법은 React를 배우기 위한 전제조건이라고 해도 과언이 아니다.
            특히 구조분해 할당, 스프레드 연산자, 화살표 함수는 React 코드에서 거의 매 줄 등장하니 확실히 익혀두자.
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
