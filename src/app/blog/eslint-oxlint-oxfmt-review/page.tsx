import Link from "next/link";

export const metadata = {
  title: "ESLint를 oxlint로 바꾸려다 꺼져 있던 CI 린트부터 살린 이야기 - 이준현",
  description: "픽케어 메인 서비스에서 ESLint를 oxlint·oxfmt로 바꿀지 검토한 기록. CI에서 빠져 있던 린트를 먼저 살리고, 18.1초 대 0.31초 속도와 규칙 111개 중 104개 이식, 규칙별 탐지 일치 여부를 메인 레포에서 직접 쟀다.",
};

export default function EslintOxlintOxfmtReviewPage() {
  return (
    <article className="container py-10 lg:py-16 max-w-3xl mx-auto">
      <div className="space-y-4 mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>2026.11.03</span>
          <span>&middot;</span>
          <span>글</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">
          ESLint를 oxlint로 바꾸려다 꺼져 있던 CI 린트부터 살린 이야기
        </h1>
        <div className="flex flex-wrap gap-2">
          {["ESLint", "oxlint", "oxfmt", "CI", "개발도구"].map((tag) => (
            <span key={tag} className="px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="prose dark:prose-invert max-w-none space-y-8">

        <figure className="my-8">
          <img
            src="/posts/eslint-oxlint-thumb.png"
            alt="ESLint 18.1초, oxlint 0.31초 실행 시간 비교"
            className="rounded-lg w-full"
          />
          <figcaption className="text-center text-sm text-muted-foreground mt-2">
            픽케어 메인 서비스 레포에서 잰 린트 실행 시간 (Apple M4, 캐시 없음)
          </figcaption>
        </figure>

        <p>
          ESLint 자리에 <strong>oxlint</strong>(린터)와 <strong>oxfmt</strong>(포매터)를 쓰는 걸 검토했다.
          둘 다 Oxc 프로젝트가 Rust로 만든 도구다. 픽케어는 메인 서비스, biz, 앱까지 모든 프로젝트가 ESLint를 쓰고 있어서,
          바꾼다면 레포마다 사정을 한 번에 정리해 둘 필요가 있었다.
        </p>

        <p>
          검토를 시작하면서 먼저 정한 방침은 이렇다. 지금 ESLint를 통째로 걷어내지 않는다.
          단계를 나눠서 진행하고, 단계가 끝날 때마다 다음으로 갈지(go) 멈출지(no-go)를 판단한다.
        </p>

        <p>
          그런데 도구를 비교하기도 전에 더 급한 문제가 나왔다. 메인 서비스 CI에서 린트가 아예 돌고 있지 않았다.
          이 글은 그 문제부터 손본 과정과, 그다음 oxlint를 메인 레포에 실제로 돌려 본 결과를 정리한 것이다.
        </p>

        <section>
          <h2>먼저 지금 상태부터 쟀다</h2>
          <p>
            이슈를 쓴 10월 8일에 메인 서비스 레포에서 <code>eslint .</code>를 돌린 결과다.
            1,050개 파일을 검사하는 데 약 20초가 걸렸고, <strong>에러 237개, 경고 469개</strong>가 나왔다.
            레포의 TS/TSX 파일은 1,044개다.
          </p>
          <table>
            <thead>
              <tr>
                <th>규칙</th>
                <th>에러 수</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><code>jsx-a11y/label-has-associated-control</code></td><td>102</td></tr>
              <tr><td><code>react-hooks/set-state-in-effect</code></td><td>81</td></tr>
              <tr><td><code>jsx-a11y/no-autofocus</code></td><td>11</td></tr>
              <tr><td><code>react-hooks/static-components</code></td><td>10</td></tr>
              <tr><td><code>react-hooks/purity</code> · <code>immutability</code> · <code>refs</code> · <code>preserve-manual-memoization</code></td><td>5 · 3 · 2 · 1</td></tr>
              <tr><td>기타 (<code>no-explicit-any</code> 7, <code>no-html-link-for-pages</code> 6, <code>rules-of-hooks</code> 4 등)</td><td>&nbsp;</td></tr>
            </tbody>
          </table>
          <p>
            에러의 대부분이 label 연결 규칙과 <code>set-state-in-effect</code> 두 개에 몰려 있다.
            이 두 규칙은 뒤에서 oxlint와 비교할 때도 기준점이 된다.
          </p>
        </section>

        <section>
          <h2>CI에 린트가 없었다</h2>
          <p>
            에러가 이만큼 쌓일 수 있었던 이유는 CI 설정에서 바로 보였다.{" "}
            <code>.github/workflows/ci.yml</code>에 lint 잡이 없었다. 대신 &quot;FlatCompat 충돌로 동작하지 않는다&quot;는
            취지의 제외 사유 주석이 남아 있었다.
          </p>
          <p>
            그런데 <code>eslint.config.mjs</code>는 이미 flat config로 고쳐져 있었고, 돌려 보면 잘 동작했다.
            린트를 뺀 이유는 진작 사라졌는데 빼 둔 상태만 그대로 남아 있었던 것이다.
          </p>
          <p>
            포매터 쪽은 더 단순했다. Prettier도, <code>.editorconfig</code>도, husky나 lint-staged도 없다.
            포매터가 아예 없는 상태였다.
          </p>
        </section>

        <section>
          <h2>그래서 0단계는 도구와 상관없는 일이었다</h2>
          <p>
            oxlint가 0.3초 만에 끝나도, 그 결과를 CI에서 아무도 확인하지 않으면 지금과 달라지는 게 없다.
            도구를 바꾸는 것보다 <strong>지금 있는 린트를 CI에 다시 거는 게 효과가 훨씬 크다</strong>고 봤다.
            그래서 단계 맨 앞에 도구와 무관한 0단계를 두었다.
          </p>
          <ul>
            <li>메인 서비스 CI에 lint 잡 복구</li>
            <li><code>ci.yml</code>에 남은 낡은 제외 주석 정리</li>
            <li>기존 에러 237개를 어떻게 다룰지 방침 정하기</li>
            <li>biz, 앱 레포도 CI에서 린트가 도는지 확인</li>
          </ul>
          <p>
            이 중 메인 서비스 CI에 lint 잡을 되살리는 것부터 했다. lint 잡을 다시 걸면 기존 에러 237개가 바로 걸리기 때문에,
            이걸 다룰 방법을 세 가지 놓고 봤다.
          </p>
          <ol>
            <li><strong>baseline 허용</strong>: 지금 있는 위반은 기록해 두고, 새로 생기는 위반만 막는다.</li>
            <li><strong>일부 규칙을 warn으로 강등</strong>: 에러가 몰린 규칙을 경고로 낮춰 CI를 통과시킨다.</li>
            <li><strong>점진 수정</strong>: 에러를 조금씩 고쳐 나가면서 규칙을 하나씩 에러로 올린다.</li>
          </ol>
          <p>
            어느 쪽이든 목표는 같다. <strong>메인 서비스 CI에서 린트가 돌고, 새 위반은 머지 전에 막힌다.</strong>{" "}
            이 이슈의 완료 기준도 그렇게 잡았다.
          </p>
        </section>

        <section>
          <h2>ESLint와 oxlint·oxfmt 비교</h2>
          <p>검토를 시작할 때 정리한 비교표다. 버전은 이슈를 쓸 당시 기준이다.</p>
          <table>
            <thead>
              <tr>
                <th>&nbsp;</th>
                <th>ESLint (+Prettier)</th>
                <th>oxlint / oxfmt</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>구현</td>
                <td>JavaScript</td>
                <td>Rust (Oxc)</td>
              </tr>
              <tr>
                <td>속도</td>
                <td>메인 서비스 기준 약 20초</td>
                <td>공식 벤치마크상 oxfmt는 Prettier보다 약 30배 빠름. oxlint도 대체로 크게 빠름</td>
              </tr>
              <tr>
                <td>규칙</td>
                <td>사실상 표준, 플러그인 제한 없음</td>
                <td>주요 플러그인은 네이티브로 이식. 나머지는 JS 플러그인(문서상 alpha)으로 보완</td>
              </tr>
              <tr>
                <td>성숙도</td>
                <td>매우 안정</td>
                <td>oxlint 1.x(당시 v1.83), oxfmt 0.x(당시 v0.72, 릴리스마다 breaking change)</td>
              </tr>
              <tr>
                <td>Tailwind 클래스 정렬</td>
                <td><code>prettier-plugin-tailwindcss</code></td>
                <td>oxfmt에 내장, Tailwind v3 config 지원</td>
              </tr>
              <tr>
                <td>Next.js 공식 지원</td>
                <td>ESLint, Biome</td>
                <td>없음 (막혀 있지는 않음)</td>
              </tr>
            </tbody>
          </table>
          <p>속도 말고 걱정한 건 세 가지였다.</p>
          <ul>
            <li>
              React Compiler 계열 규칙(<code>set-state-in-effect</code>, <code>purity</code>, <code>immutability</code>, <code>refs</code>)이
              oxlint에 있긴 한데 문서상 experimental로 보였고, <code>static-components</code>,{" "}
              <code>preserve-manual-memoization</code> 같은 나머지는 이식됐는지 확인하지 못했다.
            </li>
            <li>규칙 이름이 같다고 탐지 결과까지 같다는 보장은 없다. 직접 돌려서 비교해야 한다.</li>
            <li>oxfmt는 Prettier와 약 11% 파일에서 결과가 달랐다는 사용 사례가 있었다(<code>await import()</code> 줄바꿈, import 병합 등).</li>
          </ul>
          <p>
            두 번째가 가장 중요했다. 규칙 이름표만 보고 &quot;다 옮겨진다&quot;고 결론 내리면 안 되니까,
            임시 브랜치에서 운영 설정은 건드리지 않고 oxlint를 나란히 돌려 보는 1단계 PoC를 했다.
          </p>
        </section>

        <section>
          <h2>메인 레포에서 직접 돌려 봤다</h2>
          <p>
            <code>@oxlint/migrate</code>로 <code>eslint.config.mjs</code>를 oxlint 설정으로 바꾼 뒤,
            같은 머신(Apple M4)에서 캐시 없이 두 도구를 돌렸다.
          </p>
          <pre><code>{`# ESLint 설정을 oxlint 설정으로 변환
npx @oxlint/migrate

# 같은 레포에서 각각 실행
npx eslint .
npx oxlint`}</code></pre>
          <table>
            <thead>
              <tr>
                <th>&nbsp;</th>
                <th>ESLint 9.37</th>
                <th>oxlint 1.90</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>로컬 실행</td>
                <td>18.1초 (병렬 옵션 9.4초)</td>
                <td><strong>0.31초</strong></td>
              </tr>
              <tr>
                <td>CI 추정 (2코어 러너)</td>
                <td>약 41초</td>
                <td>약 2초</td>
              </tr>
              <tr>
                <td>에러 / 경고</td>
                <td>246 / 446</td>
                <td>392 / 449</td>
              </tr>
            </tbody>
          </table>
          <p>
            ESLint 쪽 숫자가 이슈를 쓸 때(에러 237, 경고 469)와 조금 다른 건 잰 시점이 달라서다.
            이 글에서 두 도구를 맞대는 비교는 모두 같은 시점에 잰 이 표의 숫자를 기준으로 한다.
          </p>
          <p>
            속도는 예상대로였다. 병렬 옵션을 켠 ESLint보다도 30배쯤 빠르다.
            눈여겨볼 건 에러 수다. oxlint 쪽이 <strong>146건 더 많다.</strong>
          </p>
        </section>

        <section>
          <h2>규칙은 거의 그대로 옮겨진다</h2>
          <p>
            ESLint 설정에서 실제로 켜져 있는 규칙은 111개였다. 이 중 <strong>104개가 oxlint 기본 규칙으로 그대로 옮겨진다.</strong>
          </p>
          <p>
            빠지는 7개는 지금 코드에서 걸리는 게 0건이다. React Compiler 설정용인 <code>config</code>와 <code>gating</code>,
            react-hooks 플러그인 7.1에서 폐기된 <code>component-hook-factories</code>,
            React 17부터 필요 없어진 <code>jsx-uses-react</code> 같은 것들이다.
          </p>
          <p>걱정했던 &quot;이름만 같고 결과는 다른&quot; 경우도 주요 규칙에서는 없었다. 같은 파일, 같은 줄에서 일치했다.</p>
          <table>
            <thead>
              <tr>
                <th>규칙</th>
                <th>ESLint와 같은 줄에서 일치</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><code>label-has-associated-control</code></td><td>101 / 101</td></tr>
              <tr><td><code>set-state-in-effect</code></td><td>85 / 85</td></tr>
              <tr><td><code>static-components</code></td><td>16 / 16</td></tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2>에러가 146건 늘어난 이유</h2>
          <p>
            숫자만 보면 oxlint가 오탐을 많이 내는 것 같지만, 들여다보면 반대다.
            ESLint 쪽 React Compiler 규칙은 <strong><code>try/finally</code>가 있는 컴포넌트를 통째로 건너뛴다.</strong>{" "}
            컴파일러가 분석을 포기한 컴포넌트에서는 규칙도 아무것도 보고하지 않는다.
            oxlint는 그 컴포넌트들까지 검사했고, ESLint가 놓치던 진짜 위반을 잡아낸 것이다.
          </p>
          <p>
            오탐이 아예 없지는 않았다. <code>purity</code> 규칙이 이벤트 핸들러 안의 <code>new Date()</code>를 잡은 게 6건 정도 있었다.
            렌더링 중이 아니라 클릭 시점에 실행되는 코드라 순수성과는 관계가 없다.
          </p>
          <p>
            그러니 이 146건은 &quot;oxlint로 바꾸면 에러가 늘어난다&quot;보다는 &quot;지금도 있는데 ESLint가 못 보던 위반이 146건쯤 있다&quot;에 가깝다.
            도구를 바꾸든 안 바꾸든 알아 둘 만한 숫자다.
          </p>
        </section>

        <section>
          <h2>oxlint가 놓치는 건 4건</h2>
          <p>반대로 ESLint는 잡는데 oxlint가 놓치는 에러는 4건이었다.</p>
          <ul>
            <li>
              <strong><code>no-autofocus</code> 3건</strong>: oxlint는 <code>role=&quot;dialog&quot;</code> 안의 <code>autoFocus</code>를 예외로 둔다.
              다이얼로그가 열릴 때 안쪽 요소로 포커스를 옮기는 건 흔한 패턴이라, 버그라기보다 규칙 해석 차이에 가깝다.
            </li>
            <li>
              <strong><code>preserve-manual-memoization</code> 1건</strong>: 같은 위치를 <code>exhaustive-deps</code> 경고가 잡는다.
              완전히 놓치는 건 아니다.
            </li>
          </ul>
        </section>

        <section>
          <h2>병행 구성은 이득이 없었다</h2>
          <p>
            처음 계획에는 <code>eslint-plugin-oxlint</code>로 oxlint를 ESLint 앞단에 세우는 병행 구성도 있었다.
            oxlint가 처리하는 규칙은 ESLint에서 끄고, oxlint에 없는 규칙만 ESLint가 맡는 방식이다.
            전환 부담을 줄이면서 속도를 챙기려는 구성이다.
          </p>
          <p>
            실제로 돌려 보니 <strong>15초</strong>가 걸렸다. ESLint에 남는 설정용 규칙 때문에 React Compiler가 여전히 돌아서,
            oxlint가 맡는 규칙을 ESLint에서 꺼도 3초밖에 줄지 않았다.
            그러니 메인 서비스에서는 &quot;병행&quot;이라는 선택지가 사실상 없다. 전환하거나, 유지하거나 둘 중 하나다.
          </p>
        </section>

        <section>
          <h2>이슈에 틀리게 적은 것</h2>
          <p>
            검토를 시작할 때 이슈에 &quot;oxlint의 React Compiler 계열 규칙은 문서상 experimental&quot;이라고 적었는데, 틀린 내용이었다.
            oxlint 1.79(8월 18일)부터 정식 규칙이고, 이식 여부를 확인하지 못했던 <code>static-components</code> 등도 이미 들어와 있다.
          </p>
          <p>
            문서와 블로그 글만으로 정리한 비교표는 금방 낡는다. oxc처럼 릴리스가 빠른 도구는 더 그렇다.
            이 부분은 PoC 결과를 정리하면서 이슈 본문도 함께 고쳤다.
          </p>
        </section>

        <section>
          <h2>oxfmt는 포매터를 새로 들이는 일이다</h2>
          <p>
            린터는 &quot;바꾸는&quot; 일이지만, 포매터는 메인 레포에 원래 없었으니 &quot;새로 들이는&quot; 일이다. 그래서 따로 결정하기로 했다.
          </p>
          <p>
            포맷 규칙은 지금 코드에서 가장 많이 쓰는 스타일에 맞췄다. 큰따옴표(97%), 세미콜론, es5 방식 끝 쉼표, 80자 줄 길이다.
            이렇게 맞춰도 <strong>825개 파일</strong>이 바뀐다. Tailwind 클래스 정렬(<code>sortTailwindcss</code>)까지 켜면{" "}
            <strong>932개</strong>다. TS/TSX 1,044개 중 대부분이 한 번에 바뀐다는 뜻이다.
          </p>
          <p>
            하나 더 걸리는 게 있었다. 80자 설정에서는 <strong>한 번 포맷해서 끝나지 않는 파일이 2~4개</strong> 있다.
            두 번 돌려야 결과가 고정된다. 포맷 검사를 CI에 걸기 전에 짚고 넘어가야 할 부분이다.
          </p>
          <p>그래서 oxfmt는 도입한다면 이런 순서를 밟아야 한다.</p>
          <ol>
            <li>포매터를 도입할지부터 팀이 합의한다. 지금은 없는 상태다.</li>
            <li>진행 중인 브랜치가 적은 시점을 골라 한 번에 일괄 포맷한다. 900개 넘는 파일이 바뀌니 머지 충돌이 생길 수밖에 없다.</li>
            <li>Tailwind 정렬은 <code>tailwind.config.ts</code>(v3)를 기준으로 켠다.</li>
            <li>일괄 포맷 커밋은 <code>.git-blame-ignore-revs</code>에 등록해 blame이 그 커밋으로 덮이지 않게 한다.</li>
            <li>oxfmt가 아직 0.x라 버전을 고정하는 정책을 정한다.</li>
          </ol>
          <pre><code>{`# .git-blame-ignore-revs
# oxfmt 일괄 포맷
<일괄 포맷 커밋 해시>

# 로컬 git blame에도 적용
git config blame.ignoreRevsFile .git-blame-ignore-revs`}</code></pre>
          <p>GitHub의 blame 화면은 레포 루트에 이 파일이 있으면 알아서 읽는다.</p>
        </section>

        <section>
          <h2>남은 단계</h2>
          <p>메인 서비스 PoC가 끝났으니 다음은 레포별 확장 조사다.</p>
          <ul>
            <li><strong>메인 서비스</strong>: 1단계 결과를 반영한다. 병행 구성이 의미 없다는 게 확인됐으니 전환과 유지 중에서 고른다.</li>
            <li><strong>biz</strong>: 지금 ESLint 설정과 플러그인 목록을 조사하고 oxlint 지원 규칙과 대조한다.</li>
            <li><strong>앱 (Expo / React Native)</strong>: React Native 관련 규칙을 oxlint가 지원하는지는 아직 확인하지 못했다. 현재 설정부터 조사한다.</li>
          </ul>
          <p>레포마다 전환, 병행, 유지 중 하나로 정하고 결과를 이슈에 남기는 게 이번 작업의 끝이다.</p>
        </section>

        <section>
          <h2>정리</h2>
          <ul>
            <li>도구를 바꾸기 전에 <strong>CI에서 린트가 돌고 있는지</strong>부터 봐야 한다. 메인 서비스는 낡은 주석 하나 때문에 린트가 빠져 있었다.</li>
            <li>메인 레포 실측에서 oxlint는 <strong>0.31초</strong>, ESLint는 18.1초였다. CI 추정으로는 약 2초 대 41초다.</li>
            <li>켜진 규칙 111개 중 <strong>104개가 그대로 옮겨지고</strong>, 빠지는 7개는 지금 코드에서 0건이다. 주요 규칙은 같은 줄에서 일치했다.</li>
            <li>에러가 146건 늘어난 건 ESLint 쪽 React Compiler가 <code>try/finally</code> 컴포넌트를 건너뛰어서 못 잡던 위반이다.</li>
            <li>ESLint와 oxlint를 나란히 두는 병행 구성은 React Compiler가 계속 돌아서 이득이 거의 없다.</li>
            <li>oxfmt는 900개 넘는 파일을 바꾸는 신규 도입이라 팀 합의, 일괄 포맷 시점, 버전 고정을 따로 정해야 한다.</li>
          </ul>
          <p>
            검토를 시작할 때 0단계 옆에 &quot;가장 효과가 크다&quot;고 적어 뒀다. oxlint를 실제로 돌려 본 뒤에도 그 생각은 그대로다.
            린터가 아무리 빨라도 CI에서 돌지 않으면 쌓이는 에러를 막지 못한다.
          </p>
        </section>

        <section>
          <h2>참고</h2>
          <ul>
            <li>
              <a href="https://oxc.rs/docs/guide/usage/linter/migrate-from-eslint.html" target="_blank" rel="noreferrer">
                Oxc — Oxlint ESLint 마이그레이션
              </a>
            </li>
            <li>
              <a href="https://oxc.rs/docs/guide/usage/linter/js-plugins.html" target="_blank" rel="noreferrer">
                Oxc — Oxlint JS 플러그인
              </a>
            </li>
            <li>
              <a href="https://oxc.rs/docs/guide/usage/formatter.html" target="_blank" rel="noreferrer">
                Oxc — Oxfmt
              </a>
            </li>
            <li>
              <a href="https://github.com/vercel/next.js/discussions/59347" target="_blank" rel="noreferrer">
                vercel/next.js #59347 — Support alternative linters such as Biome (next lint 제거 논의)
              </a>
            </li>
          </ul>
        </section>

        <div className="mt-12 pt-8 border-t">
          <Link href="/blog" className="text-primary hover:underline">
            &larr; 목록으로 돌아가기
          </Link>
        </div>
      </div>
    </article>
  );
}
