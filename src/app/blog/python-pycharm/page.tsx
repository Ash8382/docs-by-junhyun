import Link from "next/link";

export const metadata = {
  title: "Python & PyCharm 학습 기록 - 이준현",
  description: "PyCharm IDE 설정부터 Python 기초 문법, 가상환경, 패키지 관리까지 학습 정리.",
};

export default function PythonPycharmPage() {
  return (
    <article className="container py-10 lg:py-16 max-w-3xl mx-auto">
      <div className="space-y-4 mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>2023.10.28</span>
          <span>&middot;</span>
          <span>글</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">
          Python & PyCharm 학습 기록
        </h1>
        <div className="flex flex-wrap gap-2">
          {["Python", "PyCharm"].map((tag) => (
            <span key={tag} className="px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="prose dark:prose-invert max-w-none space-y-8">
        <div className="flex justify-center my-8">
          <img
            src="/posts/pycharm-logo.jpg"
            alt="PyCharm 로고"
            className="h-10 sm:h-14 w-auto"
          />
        </div>

        <p>
          프론트엔드 중심으로 공부하다가, Python도 한번 경험해보고 싶어서 학습을 시작했다.
          PyCharm IDE 설정부터 Python 기초 문법까지 정리한다.
        </p>

        <section>
          <h2>PyCharm 설정</h2>
          <p>
            JetBrains에서 만든 Python 전용 IDE다. Community 버전은 무료로 사용할 수 있다.
            VSCode에 비해 Python에 특화된 기능이 많아서 편했다.
          </p>
          <ul>
            <li>프로젝트 생성 시 인터프리터(Python 버전) 자동 설정</li>
            <li>가상환경(venv) 자동 생성 및 관리</li>
            <li>코드 자동완성과 타입 힌트 지원이 VSCode보다 강력</li>
            <li>디버거가 내장되어 있어서 브레이크포인트 설정이 간편</li>
          </ul>
        </section>

        <section>
          <h2>Python 기초 문법</h2>
          <p>
            JavaScript와 비교하면서 학습하니 더 빨리 이해할 수 있었다.
          </p>
          <ul>
            <li><strong>들여쓰기</strong>: 중괄호 대신 들여쓰기로 블록을 구분. 처음엔 어색했지만 코드가 깔끔해지는 장점이 있다.</li>
            <li><strong>변수</strong>: 타입 선언 없이 바로 할당. JS의 let과 비슷하지만 const가 없다.</li>
            <li><strong>리스트/딕셔너리</strong>: JS의 배열/객체와 유사. 리스트 컴프리헨션이 독특하고 강력하다.</li>
            <li><strong>함수</strong>: <code>def</code> 키워드 사용. 기본값 매개변수, 키워드 인자 등이 있다.</li>
            <li><strong>클래스</strong>: <code>self</code>를 명시적으로 전달하는 게 JS의 <code>this</code>와 다르다.</li>
          </ul>
        </section>

        <section>
          <h2>가상환경과 패키지 관리</h2>
          <p>
            Node.js의 <code>node_modules</code>와 <code>package.json</code>처럼,
            Python에도 프로젝트별 의존성을 격리하는 시스템이 있다.
          </p>
          <ul>
            <li><strong>venv</strong>: 프로젝트별 독립된 Python 환경 생성</li>
            <li><strong>pip</strong>: npm 같은 패키지 매니저. <code>pip install</code>로 설치</li>
            <li><strong>requirements.txt</strong>: package.json의 dependencies 역할. <code>pip freeze &gt; requirements.txt</code>로 생성</li>
          </ul>
        </section>

        <section>
          <h2>느낀 점</h2>
          <p>
            Python은 문법이 직관적이라 기초 학습 자체는 금방 끝났다.
            JavaScript와 비교하면서 배우니 &quot;아, 이건 JS의 그거구나&quot; 하면서 빠르게 매핑이 됐다.
            데이터 분석이나 백엔드 쪽에서 Python을 마주칠 때 당황하지 않을 정도의 기초는 갖춰진 것 같다.
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
