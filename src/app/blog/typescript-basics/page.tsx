import Link from "next/link";

export const metadata = {
  title: "TypeScript 기초 정리 - 타입 시스템부터 제네릭까지 - 이준현",
  description: "JavaScript에서 TypeScript로 넘어가며 배운 타입 시스템, 인터페이스, 제네릭, 유틸리티 타입 등 핵심 개념 정리.",
};

export default function TypeScriptBasicsPage() {
  return (
    <article className="container py-10 lg:py-16 max-w-3xl mx-auto">
      <div className="space-y-4 mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>2023.09.25</span>
          <span>&middot;</span>
          <span>글</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">
          TypeScript 기초 정리 - 타입 시스템부터 제네릭까지
        </h1>
        <div className="flex flex-wrap gap-2">
          {["TypeScript"].map((tag) => (
            <span key={tag} className="px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="prose dark:prose-invert max-w-none space-y-8">
        <p>
          ES6와 React 기초를 마치고, 이제 TypeScript를 학습한다.
          EUTCHA 프로젝트에서 TypeScript를 사용할 예정이라 미리 정리해둔다.
        </p>

        <section>
          <h2>왜 TypeScript인가</h2>
          <p>
            JavaScript는 동적 타입 언어라 런타임에서야 타입 에러를 발견할 수 있다.
            TypeScript는 정적 타입을 추가해서 <strong>코드 작성 시점에 에러를 잡아준다</strong>.
            규모가 커질수록 이 차이가 극명해진다.
          </p>
          <p>
            에디터의 자동완성과 리팩토링 지원도 크게 좋아진다.
            &quot;이 변수에 뭐가 들어있지?&quot;를 항상 추론할 필요 없이 타입이 알려주니까.
          </p>
        </section>

        <section>
          <h2>기본 타입</h2>
          <ul>
            <li><code>string</code>, <code>number</code>, <code>boolean</code> - 원시 타입</li>
            <li><code>array</code> - <code>number[]</code> 또는 <code>Array&lt;number&gt;</code></li>
            <li><code>tuple</code> - 고정 길이·타입 배열: <code>[string, number]</code></li>
            <li><code>enum</code> - 이름이 있는 상수 집합</li>
            <li><code>any</code> - 타입 검사 비활성화 (가급적 사용 지양)</li>
            <li><code>unknown</code> - any의 안전한 대안, 타입 좁히기 필요</li>
            <li><code>void</code>, <code>never</code> - 반환값 없음 / 절대 반환하지 않음</li>
          </ul>
        </section>

        <section>
          <h2>Interface와 Type</h2>
          <p>
            객체의 형태를 정의하는 두 가지 방법이다.
          </p>
          <p>
            <strong>Interface</strong>는 <code>extends</code>로 확장 가능하고, 같은 이름으로 선언하면 자동 병합된다.
            <strong>Type</strong>은 유니온(<code>|</code>), 인터섹션(<code>&amp;</code>) 등 더 유연한 조합이 가능하다.
          </p>
          <p>
            일반적으로 객체 형태 정의에는 interface, 유니온이나 복잡한 타입 조합에는 type을 사용하는 편이다.
          </p>
        </section>

        <section>
          <h2>제네릭 (Generics)</h2>
          <p>
            타입을 매개변수로 받아서 재사용 가능한 코드를 만드는 기능이다.
            함수, 인터페이스, 클래스 등에 적용할 수 있다.
          </p>
          <p>
            예를 들어 <code>{`function identity<T>(arg: T): T`}</code>는 어떤 타입이든 받아서 그대로 반환하는 함수다.
            React에서도 <code>{`useState<number>(0)`}</code> 처럼 제네릭을 자주 사용한다.
          </p>
        </section>

        <section>
          <h2>유틸리티 타입</h2>
          <p>
            TypeScript가 기본 제공하는 편리한 타입 변환 도구들이다.
          </p>
          <ul>
            <li><code>{`Partial<T>`}</code> - 모든 속성을 선택적으로</li>
            <li><code>{`Required<T>`}</code> - 모든 속성을 필수로</li>
            <li><code>{`Pick<T, K>`}</code> - 특정 속성만 선택</li>
            <li><code>{`Omit<T, K>`}</code> - 특정 속성을 제외</li>
            <li><code>{`Record<K, V>`}</code> - 키-값 쌍의 타입 정의</li>
          </ul>
          <p>
            이 유틸리티 타입들을 잘 활용하면 중복 타입 정의를 크게 줄일 수 있다.
          </p>
        </section>

        <section>
          <h2>정리하며</h2>
          <p>
            TypeScript는 처음에 &quot;JavaScript에 타입만 추가된 것&quot;이라 생각했는데,
            제네릭이나 유틸리티 타입까지 오니 꽤 깊은 타입 시스템이었다.
            하지만 기본기만 갖추면 React 프로젝트에서 바로 써볼 수 있으니,
            EUTCHA 프로젝트에서 실전 적용하면서 더 익혀볼 예정이다.
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
