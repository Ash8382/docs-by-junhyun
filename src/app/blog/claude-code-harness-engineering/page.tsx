import Link from "next/link";

export const metadata = {
  title: "Claude Code 하네스 엔지니어링 — 소스 코드에서 뽑아낸 6가지 설계 원칙 - 이준현",
  description: "Claude Code v2.1.88 소스 코드 역공학 분석에서 도출된 프롬프트 컨트롤 플레인, 캐시 인식 디자인, Fail-Closed 기본값 등 AI 에이전트 빌더를 위한 핵심 하네스 엔지니어링 원칙 정리.",
};

export default function ClaudeCodeHarnessEngineeringPage() {
  return (
    <article className="container py-10 lg:py-16 max-w-3xl mx-auto">
      <div className="space-y-4 mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>2026.04.23</span>
          <span>&middot;</span>
          <span>글</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">
          Claude Code 하네스 엔지니어링 — 소스 코드에서 뽑아낸 6가지 설계 원칙
        </h1>
        <div className="flex flex-wrap gap-2">
          {["AI", "Claude Code", "LLM", "에이전트", "아키텍처"].map((tag) => (
            <span key={tag} className="px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="prose dark:prose-invert max-w-none space-y-8">

        <figure className="my-8">
          <img
            src="/posts/claude-code-harness-og.png"
            alt="Claude Code Harness 한국어판"
            className="rounded-lg w-full"
          />
          <figcaption className="text-center text-sm text-muted-foreground mt-2">
            Claude Code Harness 한국어 번역 아카이브 — 소스 코드를 책으로 재구성한 오픈 프로젝트
          </figcaption>
        </figure>

        {/* 도입 */}
        <p>
          최근 재밌는 사이트를 하나 발견했다. <strong>Claude Code Harness 한국어판</strong>
          (<a href="https://claude-code-harness-ko.vercel.app/" target="_blank" rel="noreferrer">claude-code-harness-ko.vercel.app</a>)
          이라는 곳인데, 중국 개발자 ZhangHandong이 유출된 Claude Code TypeScript 소스 코드를 리버스 엔지니어링해서
          <strong> &quot;驾驭工程 (하네스 엔지니어링)&quot;</strong>이라는 책으로 정리한 원문을,
          유민수 개발자가 한국어로 옮기고 웹 형태로 재구성한 학습용 아카이브다.
        </p>

        <p>
          총 <strong>7개 파트, 30개 장, 45개 문서</strong>로 구성되어 있고,
          Claude Code v2.1.88의 복원 소스 코드를 기반으로 에이전트 루프, 프롬프트 엔지니어링, 컨텍스트 관리,
          프롬프트 캐싱, 보안/권한, 고급 하위시스템까지 전부 해부해둔다.
          분량이 방대해서 전부 읽긴 어렵지만, 개인적으로 가장 흥미로웠던 <strong>25장 — 하네스 엔지니어링 6대 원칙</strong>을 중심으로 정리해본다.
        </p>

        {/* 하네스 엔지니어링이란 */}
        <section>
          <h2>&quot;하네스 엔지니어링&quot;이란?</h2>
          <p>
            Harness는 원래 말 등에 씌우는 &quot;마구(馬具)&quot;를 뜻하는 단어다.
            책의 중국어 제목이 &quot;마구(马书)&quot;처럼 발음되기 때문에 비공식적으로 &quot;The Horse Book&quot;으로도 불린다.
            의미는 직관적이다. <strong>LLM이라는 강력한 말을 길들여서 원하는 방향으로 달리게 하는 설계 기법</strong>이다.
          </p>
          <p>
            저자의 핵심 주장은 단순하다. <em>&quot;AI 에이전트 시스템에서 동작을 제어하는 가장 좋은 방법은
            더 많은 코드를 작성하는 것이 아니라, 더 나은 제약 조건을 설계하는 것이다.&quot;</em>
          </p>
          <p>
            이 관점에서 Claude Code를 해부해보면, 소스 코드 곳곳에 재사용 가능한 엔지니어링 원칙들이 숨어 있다.
            아래는 저자가 23개 장의 분석에서 뽑아낸 6가지 핵심 원칙이다.
          </p>
        </section>

        {/* 원칙 1 */}
        <section>
          <h2>원칙 1 — 프롬프트를 컨트롤 플레인으로 쓴다</h2>
          <p>
            코드의 if/else 분기로 동작을 통제하지 말고, <strong>시스템 프롬프트로 모델의 행동을 유도하라</strong>는 것이다.
            Claude Code의 동작 지침 대부분은 코드가 아닌 프롬프트 텍스트에 들어 있다.
          </p>
          <pre><code>{`// restored-src/src/constants/prompts.ts:203
"Don't create helpers, utilities, or abstractions for one-time operations.
 Don't design for hypothetical future requirements.
 Three similar lines of code is better than a premature abstraction."`}</code></pre>
          <p>
            이 문장은 주석이 아니라 <strong>모델에게 전송되는 실제 지시문</strong>이다.
            모델이 오버엔지니어링을 하는지 코드 레벨에서 탐지하는 건 사실상 불가능하다.
            대신 자연어로 &quot;그러지 마&quot;라고 직접 말하는 쪽이 훨씬 효율적이다.
          </p>
          <p>
            더 흥미로운 건 Claude Code가 모든 동작 스위치를 기본 시스템 프롬프트에 인라인하지 않는다는 점이다.
            <code>system-reminder</code> 메시지는 일종의 <strong>대역 외(out-of-band) 제어 채널</strong>로 작동한다.
            Plan Mode의 멀티스테이지 워크플로, Todo 리마인더, Read 도구의 빈 파일 경고 등은
            메인 시스템 프롬프트를 수정하지 않고도 조건부로 주입된다.
          </p>
          <ul>
            <li><strong>안정된 헌법</strong>은 시스템 프롬프트에 (캐시 친화적)</li>
            <li><strong>런타임 스위치</strong>는 <code>system-reminder</code>에 (단명하고 교체 가능)</li>
          </ul>
          <p>
            안티패턴은 <strong>하드코딩된 동작 탐지기</strong>다. 원하지 않는 행동마다 인터셉터를 붙이다 보면
            결국 모델의 발전 속도를 절대 따라잡지 못하는 거대한 규칙 엔진이 탄생한다.
          </p>
        </section>

        {/* 원칙 2 */}
        <section>
          <h2>원칙 2 — 캐시 인식 설계는 협상 불가능하다</h2>
          <p>
            일반적인 Claude Code 세션에서 시스템 프롬프트는 약 11,000 토큰,
            40개 이상의 도구 스키마는 추가로 ~20,000 토큰을 차지한다.
            <strong>모든 프롬프트 변경은 <code>cache_creation</code> 토큰으로 측정되는 비용을 발생시킨다.</strong>
          </p>
          <p>
            Claude Code는 <code>SYSTEM_PROMPT_DYNAMIC_BOUNDARY</code>라는 마커로 시스템 프롬프트를 정적/동적 영역으로 분리한다.
            이 경계 앞은 <code>scope: &apos;global&apos;</code>로 크로스-조직 캐싱이 가능하고,
            뒤는 세션별 동적 콘텐츠다.
          </p>
          <p>
            캐시 중단을 감지하기 위해 팀은 <strong>거의 20개 필드를 추적</strong>한다
            (<code>systemHash</code>, <code>toolsHash</code>, <code>perToolHashes</code>, <code>betas</code> 등).
            주석에는 BigQuery에서 추출한 정량 데이터까지 박혀 있다.
          </p>
          <pre><code>{`/** Per-tool schema hash. Diffed to name which tool's description changed
 * when toolSchemasChanged but added=removed=0 (77% of tool breaks per
 * BQ 2026-03-22). */`}</code></pre>
          <p>
            더 극단적인 건 <strong>베타 헤더 래칭</strong>이다.
            한 번이라도 전송된 베타 헤더는 기능이 꺼져도 세션 내내 계속 전송된다.
            이유는 단 하나 — 전송을 중단하면 요청 서명이 바뀌어서 50~70K 토큰의 캐시 접두사가 무효화되기 때문이다.
          </p>
          <p>
            과거에 에이전트 목록을 시스템 프롬프트에 인라인했더니 전체 <code>cache_creation</code> 토큰의 10.2%를 혼자 먹어치웠던 사례도 있었다.
            해결책은 캐시 세그먼트 바깥의 <code>system-reminder</code> 메시지로 옮기는 것이었다.
          </p>
        </section>

        {/* 원칙 3 */}
        <section>
          <h2>원칙 3 — Fail Closed, 명시적으로만 열어라</h2>
          <p>
            시스템의 기본값은 <strong>항상 가장 안전한 선택</strong>이어야 하고,
            위험한 동작은 명시적으로 선언할 때만 허용해야 한다.
          </p>
          <p>
            <code>buildTool()</code> 팩토리의 기본값을 보면 철학이 명확히 드러난다.
          </p>
          <pre><code>{`// restored-src/src/Tool.ts:748-761
const TOOL_DEFAULTS = {
  isConcurrencySafe: () => false,  // 기본적으로 동시성 불안전
  isReadOnly: () => false,          // 기본적으로 쓰기 가능
  isDestructive: () => false,       // 그러나 파괴적이지는 않음
  checkPermissions: () => ({ behavior: 'allow' }),
  toAutoClassifierInput: () => '',  // YOLO 분류기 건너뜀
}`}</code></pre>
          <p>
            새 도구는 <strong>기본적으로 동시 실행에 안전하지 않다고 간주</strong>된다.
            <code>isConcurrencySafe: true</code>를 명시하지 않은 도구는 직렬 대기열에 들어간다.
            심지어 <code>isConcurrencySafe()</code>가 예외를 던지면 catch 블록도 보수적으로 <code>false</code>를 반환한다.
          </p>
          <p>
            권한 모드도 동일하다: <code>default</code> → <code>acceptEdits</code> → <code>plan</code> → <code>bypassPermissions</code> 순서로 점점 허용 범위가 넓어지지만,
            시스템 기본값은 가장 제한적인 <code>default</code>다. 사용자가 적극적으로 완화해야 한다.
          </p>
          <p>
            YOLO 분류기의 거부 추적에도 같은 원칙이 적용된다.
            3회 연속 또는 총 20회의 분류기 거부 이후 시스템은 자동으로 수동 사용자 확인으로 폴백한다.
            <strong>자동화된 의사결정이 신뢰할 수 없을 때 인간의 의사결정으로 돌아가라.</strong>
          </p>
        </section>

        {/* 원칙 4 */}
        <section>
          <h2>원칙 4 — 모든 것을 A/B 테스트하라</h2>
          <p>
            Claude Code 소스에는 <strong>89개의 기능 플래그</strong>가 있고 상당수가 A/B 테스트용이다.
            가장 직관적인 스테이징 장치는 <code>USER_TYPE === &apos;ant&apos;</code> 게이트다 — Anthropic 내부 직원에게만 먼저 노출되는 방식이다.
          </p>
          <pre><code>{`// restored-src/src/constants/prompts.ts:205-213
...(process.env.USER_TYPE === 'ant' ? [
  "Default to writing no comments. Only add one when the WHY is non-obvious...",
  // @[MODEL LAUNCH]: capy v8 thoroughness counterweight (PR #24302)
  // un-gate once validated on external via A/B
  "Before reporting a task complete, verify it actually works...",
] : []),`}</code></pre>
          <p>
            <em>&quot;un-gate once validated on external via A/B&quot;</em> 주석이 워크플로를 그대로 보여준다.
            <strong>내부 검증 → A/B 테스트 → 전체 배포</strong>의 단계적 출시다.
          </p>
          <p>
            더 세밀한 통제는 GrowthBook 통합이 맡는다. <code>tengu_*</code> 접두사의 기능 플래그들은
            원격 설정 서버를 통해 퍼센티지 기반 점진적 롤아웃을 지원한다.
            특히 캐시를 깨지 않도록 <code>_CACHED_MAY_BE_STALE</code>, <code>_CACHED_WITH_REFRESH</code>
            같은 &quot;캐시 인식 A/B 테스트&quot; 전략까지 들어 있다.
          </p>
          <p>
            안티패턴은 <strong>빅뱅 릴리스</strong>다. AI 에이전트 영역에서 동작 변경의 영향은 보통 &quot;크래시&quot;가 아니라
            &quot;미묘하게 별로&quot; 또는 &quot;너무 공격적&quot;이다. 정량 지표와 대조군 없이는 감지 자체가 어렵다.
          </p>
        </section>

        {/* 원칙 5 */}
        <section>
          <h2>원칙 5 — 고치기 전에 관측하라</h2>
          <p>
            문제를 해결하기 전에 먼저 전체 그림을 볼 수 있도록 <strong>관측 인프라를 구축하라</strong>는 원칙이다.
          </p>
          <p>
            대표 사례는 <code>promptCacheBreakDetection.ts</code>다. 이 시스템은 <strong>아무 문제도 해결하지 않는다.</strong>
            오직 관측하고 보고할 뿐이다.
          </p>
          <ol>
            <li><strong>호출 전:</strong> <code>recordPromptState()</code>가 거의 20개 필드의 스냅샷 캡처</li>
            <li><strong>호출 후:</strong> <code>checkResponseForCacheBreak()</code>가 전/후 상태 비교</li>
            <li><strong>설명 생성:</strong> &quot;시스템 프롬프트 변경됨&quot;, &quot;TTL 만료 가능성 있음&quot; 같은 사람이 읽을 수 있는 이유로 변환</li>
            <li><strong>Diff 생성:</strong> <code>createPatch()</code>로 프롬프트 상태의 전/후 차이 출력</li>
          </ol>
          <p>
            재밌는 건 이게 <strong>데이터 기반 설계</strong>라는 점이다.
            모든 필드를 아무렇게나 추적하는 게 아니라, 프로덕션 데이터로부터
            &quot;대부분의 도구 스키마 변경은 특정 도구의 description 변경에서 비롯된다&quot;는 사실을 발견한 뒤
            타겟팅된 도구별 해시를 추가했다.
          </p>
          <p>
            안티패턴은 <strong>직관으로 고치기</strong>다. 캐시 적중률이 떨어졌다고 마지막 변경을 그냥 롤백하는 건 위험하다.
            진짜 원인은 베타 헤더 스위치, TTL 만료, MCP 도구 목록 변경일 수도 있다.
          </p>
        </section>

        {/* 원칙 6 */}
        <section>
          <h2>원칙 6 — 안정성을 위해 래치하라</h2>
          <p>
            <strong>한번 어떤 상태에 들어가면 흔들리지 마라.</strong> 상태 스래싱(thrashing)은 차선의 상태보다 더 해롭다.
          </p>
          <p>
            가장 극적인 예는 <strong>자동 압축 회로 차단기</strong>다.
          </p>
          <pre><code>{`// restored-src/src/services/compact/autoCompact.ts:67-70
// BQ 2026-03-10: 1,279 sessions had 50+ consecutive failures
// (up to 3,272) in a single session, wasting ~250K API calls/day globally.
const MAX_CONSECUTIVE_AUTOCOMPACT_FAILURES = 3`}</code></pre>
          <p>
            3번 연속 실패하면 시스템은 &quot;압축 중단&quot; 상태로 래치된다.
            주석에 박힌 BigQuery 데이터(1,279개 세션, 하루 250K API 호출 낭비)가 엔지니어링 근거로 그대로 기록되어 있다.
          </p>
          <p>
            베타 헤더 래칭, 캐시 TTL 자격 래칭(<code>should1hCacheTTL()</code>) 등도 같은 패턴이다.
            세션 내내 한 번 결정된 값은 바뀌지 않는다. 바뀌면 캐시가 깨지고, 캐시가 깨지면 돈이 샌다.
          </p>
          <p>
            안티패턴은 <strong>상태 스래싱</strong>이다. 매 요청마다 설정을 다시 계산하면 상태가 진동하고,
            캐싱 시스템에서는 적중률이 0에 수렴한다.
          </p>
        </section>

        {/* 요약 */}
        <section>
          <h2>6대 원칙 한눈에 보기</h2>
          <table>
            <thead>
              <tr>
                <th>원칙</th>
                <th>핵심</th>
                <th>안티패턴</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>프롬프트 = 컨트롤 플레인</td>
                <td>자연어로 행동 유도</td>
                <td>하드코딩된 탐지기</td>
              </tr>
              <tr>
                <td>캐시 인식 디자인</td>
                <td>정적/동적 경계 분리</td>
                <td>빈번한 프롬프트 변경</td>
              </tr>
              <tr>
                <td>Fail Closed</td>
                <td>기본값은 가장 안전하게</td>
                <td>기본 Open, 사후 수습</td>
              </tr>
              <tr>
                <td>모든 것 A/B 테스트</td>
                <td>점진적 롤아웃</td>
                <td>빅뱅 릴리스</td>
              </tr>
              <tr>
                <td>고치기 전 관측</td>
                <td>데이터 기반 진단</td>
                <td>직관에 의한 수정</td>
              </tr>
              <tr>
                <td>안정성 위한 래치</td>
                <td>결정 후 흔들지 않기</td>
                <td>매 요청마다 재계산</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* 느낀 점 */}
        <section>
          <h2>읽고 나서</h2>
          <p>
            AI 에이전트를 만든다는 건 결국 <strong>거대한 확률 공간을 길들이는 일</strong>이다.
            모델을 바꾸거나 프롬프트를 조금 고쳐서 해결될 문제가 아니라,
            캐시 경계선, 권한 기본값, 관측 인프라 같은 &quot;주변부&quot;가 사실상 에이전트의 품질을 결정한다는 게 이 책의 일관된 주장이다.
          </p>
          <p>
            특히 인상적이었던 건 <strong>모든 설계 결정에 BigQuery 데이터가 붙어 있다는 점</strong>이다.
            &quot;왜 3회로 정했나요?&quot; → &quot;1,279개 세션에서 50회 이상 연속 실패가 관측됐고, 하루 250K API 호출이 낭비됐거든요.&quot;
            이런 정량적 근거가 소스 코드 주석에 박혀 있는 제품은 흔하지 않다.
          </p>
          <p>
            나처럼 Claude Code를 일상적으로 쓰는 입장에서는, 왜 어떤 동작은 은근히 막히고
            왜 어떤 기능은 특정 조건에서만 켜지는지에 대한 &quot;설계 의도&quot;를 이해할 수 있었다.
            직접 에이전트를 만들 계획이 없더라도 <strong>&quot;잘 만들어진 LLM 제품&quot;이 내부에서 어떻게 생겼는지</strong> 들여다볼 가치는 충분하다.
          </p>
          <p>
            30장 전체는 분량이 꽤 많으니, 서문에 정리된 <strong>독자별 추천 경로</strong>를 따라가는 걸 추천한다.
          </p>
          <ul>
            <li><strong>Path A (에이전트 빌더):</strong> 1장 → 3장 → 5장 → 9장 → 20장 → 25~27장 → 30장</li>
            <li><strong>Path B (보안 엔지니어):</strong> 16장 → 17장 → 18장 → 19장 → 4장 → 25장</li>
            <li><strong>Path C (성능 최적화):</strong> 9장 → 11~12장 → 13~15장 → 21장</li>
          </ul>
        </section>

        {/* 참고 */}
        <section>
          <h2>참고</h2>
          <ul>
            <li>
              <a href="https://claude-code-harness-ko.vercel.app/" target="_blank" rel="noreferrer">
                Claude Code Harness 한국어 번역 아카이브 (유민수 개발자)
              </a>
            </li>
            <li>
              <a href="https://zhanghandong.github.io/harness-engineering-from-cc-to-ai-coding/" target="_blank" rel="noreferrer">
                원문: 驾驭工程 — 从 Claude Code 源码到 AI 编码最佳实践 (ZhangHandong)
              </a>
            </li>
            <li>
              <a href="https://github.com/ZhangHanDong/harness-engineering-from-cc-to-ai-coding" target="_blank" rel="noreferrer">
                원문 GitHub 저장소
              </a>
            </li>
            <li>
              <a href="https://github.com/deformatic/claude-code-harness-ko" target="_blank" rel="noreferrer">
                한국어판 GitHub 저장소
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
