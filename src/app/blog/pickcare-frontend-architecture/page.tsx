import Link from "next/link";

export const metadata = {
  title: "픽케어 프론트엔드 아키텍처 10가지 설계 결정 - 이준현",
  description: "실무에서 직접 설계하고 구현한 프론트엔드 아키텍처 패턴 10가지. 토큰 리프레시, Query Key Factory, TipTap 에디터 확장 등.",
};

export default function PickcareFrontendArchitecturePage() {
  return (
    <article className="container py-10 lg:py-16 max-w-3xl mx-auto">
      <div className="space-y-4 mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>2025.12.20</span>
          <span>&middot;</span>
          <span>글</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">
          픽케어 프론트엔드 아키텍처 — 10가지 설계 결정과 그 이유
        </h1>
        <div className="flex flex-wrap gap-2">
          {["React", "Next.js", "TypeScript", "아키텍처", "React Query", "TipTap"].map((tag) => (
            <span key={tag} className="px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="prose dark:prose-invert max-w-none space-y-8">
        <p>
          현재 재직 중인 회사에서 픽케어 프론트엔드를 설계하고 개발하면서 내린 기술적 결정들을 정리했다.
          &quot;왜 이렇게 했는지&quot;가 코드에서 읽히는 것이 좋은 아키텍처라고 생각하는데,
          각 패턴을 도입한 배경과 실제로 어떤 문제를 해결했는지 공유한다.
        </p>

        {/* 1. 선제적 토큰 리프레시 */}
        <section>
          <h2>1. 선제적 토큰 리프레시 + 구독자 큐 패턴</h2>
          <figure className="my-6">
            <img
              src="/posts/jwt-refresh-flow.png"
              alt="JWT Token Refresh Flow"
              className="rounded-lg w-full bg-white p-2"
            />
            <figcaption className="text-center text-sm text-muted-foreground mt-2">JWT 토큰 리프레시 흐름</figcaption>
          </figure>
          <p>
            인증 인터셉터를 설계할 때, 단순히 401이 터지면 리프레시하는 방식이 아니라
            <strong>토큰 만료 60초 전에 선제적으로 리프레시하는 proactive 전략</strong>을 채택했다.
            사용자가 &quot;갑자기 로그아웃됐어요&quot;라고 느끼는 순간을 원천 차단하는 설계다.
          </p>
          <div className="bg-secondary/50 rounded-lg p-4 text-sm font-mono space-y-1 not-prose">
            <p>Request → 토큰 만료 60초 전? → 선제 리프레시 → 정상 요청</p>
            <p>Request → 401 발생 → 리프레시 시도 → 재요청</p>
            <p>리프레시 중 다른 요청 → 구독자 큐 대기 → 토큰 갱신 후 일괄 처리</p>
          </div>
          <p>
            특히 동시 다발 요청 시 리프레시가 중복 호출되지 않도록 <strong>구독자 큐(subscriber queue) 패턴</strong>을 적용했다.
            토큰 리프레시가 진행 중이면 다른 요청들은 큐에 대기했다가, 리프레시 완료 후 새 토큰으로 일괄 재시도한다.
            이건 실무에서 race condition 버그를 직접 겪어보지 않으면 넣기 어려운 방어 로직이다.
          </p>
          <p>
            대부분의 프로젝트는 401 → 리프레시 → 재시도의 단순 흐름만 구현하는데,
            동시성 처리와 선제 리프레시까지 고려한 건 사용자 경험과 안정성 양쪽 모두를 챙긴 설계였다.
          </p>
        </section>

        {/* 2. Query Key Factory */}
        <section>
          <h2>2. Query Key Factory 패턴</h2>
          <div className="flex justify-center my-6">
            <img
              src="/posts/react-query-logo.png"
              alt="TanStack React Query 로고"
              className="h-24 sm:h-32 w-auto"
            />
          </div>
          <p>
            React Query를 쓰면서 query key를 문자열로 하드코딩하는 프로젝트가 많다.
            픽케어에서는 <strong>쿼리 키 팩토리 패턴</strong>을 전체 프로젝트에 일관되게 적용했다.
          </p>
          <pre className="text-sm"><code>{`export const magazineKeys = {
  all: ["magazine"] as const,
  lists: () => [...magazineKeys.all, "list"] as const,
  list: (params) => [...magazineKeys.lists(), params] as const,
  detail: (id) => [...magazineKeys.all, "detail", id] as const,
  votes: (id) => [...magazineKeys.all, "votes", id] as const,
};`}</code></pre>
          <p>
            이 패턴의 진짜 가치는 <strong>캐시 무효화가 계층적으로 동작</strong>한다는 점이다.
            <code>magazineKeys.lists()</code>를 무효화하면 모든 리스트 쿼리가 무효화되고,
            <code>magazineKeys.all</code>을 무효화하면 매거진 관련 전체 캐시가 날아간다.
            <code>as const</code>로 타입 추론도 잡혀서 실수가 어렵다.
          </p>
          <p>
            TanStack Query 공식 문서에서도 권장하는 패턴이지만,
            실제 프로젝트 전반에 일관되게 적용하려면 아키텍처 레벨에서 컨벤션을 잡아야 한다.
          </p>
        </section>

        {/* 3. 서버/클라이언트 상태 분리 */}
        <section>
          <h2>3. 서버 상태와 클라이언트 상태의 명확한 분리</h2>
          <p>
            상태 관리에서 가장 흔한 실수는 &quot;모든 걸 Redux에 넣는 것&quot;이다.
            픽케어에서는 이 경계를 아키텍처 레벨에서 명확하게 나눴다.
          </p>
          <div className="overflow-x-auto not-prose my-4">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 font-semibold">상태 유형</th>
                  <th className="text-left py-2 px-3 font-semibold">관리 도구</th>
                  <th className="text-left py-2 px-3 font-semibold">예시</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/50">
                  <td className="py-2 px-3">서버 상태</td>
                  <td className="py-2 px-3">React Query</td>
                  <td className="py-2 px-3">콘텐츠, 프로필, 펫 정보, 매거진</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 px-3">글로벌 UI</td>
                  <td className="py-2 px-3">Redux</td>
                  <td className="py-2 px-3">인증, 모달, 로딩, 알림</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 px-3">지역 UI</td>
                  <td className="py-2 px-3">Context</td>
                  <td className="py-2 px-3">이미지 뷰어, 테마</td>
                </tr>
                <tr>
                  <td className="py-2 px-3">컴포넌트</td>
                  <td className="py-2 px-3">useState</td>
                  <td className="py-2 px-3">입력값, 토글</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            Redux 슬라이스를 6개(<code>auth</code>, <code>modal</code>, <code>loading</code>, <code>notification</code>, <code>adminSection</code>, <code>chatHistory</code>)로
            제한하고, 서버 데이터는 전부 React Query가 담당하게 했다.
            Redux 보일러플레이트가 비대해지지 않으면서, 서버 상태의 캐싱/재검증/갱신은 React Query가 알아서 처리한다.
          </p>
          <p>
            &quot;이 상태는 어디에 둬야 하지?&quot;라는 질문에 대한 답이 아키텍처 레벨에서 이미 정해져 있으니,
            팀원이 합류해도 혼란 없이 따라갈 수 있는 구조다.
          </p>
        </section>

        {/* 4. Presigned URL */}
        <section>
          <h2>4. Presigned URL 기반 파일 업로드 전환</h2>
          <p>
            기존에는 클라이언트 사이드에서 S3에 직접 업로드하는 방식이었는데,
            AWS Access Key를 <code>NEXT_PUBLIC_</code> 환경변수로 프론트에 노출하고 있었다.
            이건 보안상 매우 위험한 패턴이다.
          </p>
          <p>
            <strong>Presigned URL 방식</strong>으로 전환하면서 프론트엔드에서 AWS 크레덴셜을 완전히 제거했다.
          </p>
          <div className="bg-secondary/50 rounded-lg p-4 text-sm font-mono space-y-1 not-prose">
            <p>1. GET /api/files/upload-url → presigned URL + fileKey 발급</p>
            <p>2. PUT presigned URL로 직접 업로드 (프론트 → CDN)</p>
            <p>3. CDN URL 반환</p>
          </div>
          <p>
            기술 부채를 인지하고 실제로 개선한 것, 그리고 레거시 코드를 바로 삭제하지 않고
            <code>deprecated</code>로 관리한 것 모두 실무적인 판단이었다.
            급하게 삭제했다가 의존하는 곳에서 터지는 것보다, 점진적으로 제거하는 게 안전하다.
          </p>
        </section>

        {/* 5. TipTap 에디터 */}
        <section>
          <h2>5. TipTap 에디터 커스텀 확장 15개</h2>
          <figure className="my-6">
            <img
              src="/posts/tiptap-og.jpg"
              alt="TipTap Editor"
              className="rounded-lg w-full"
            />
            <figcaption className="text-center text-sm text-muted-foreground mt-2">TipTap - ProseMirror 기반 헤드리스 리치 텍스트 에디터</figcaption>
          </figure>
          <p>
            에디터 기능은 프론트엔드에서 가장 구현 난이도가 높은 영역 중 하나다.
            TipTap 3.0 기반으로 <strong>15개 이상의 커스텀 익스텐션</strong>을 직접 구현했다.
          </p>
          <ul>
            <li><strong>CustomImage</strong> — 이미지 사이즈 조절</li>
            <li><strong>ImageGroup</strong> — 다중 이미지 그룹</li>
            <li><strong>ImageSlider</strong> — 이미지 캐러셀</li>
            <li><strong>CustomLocation</strong> — 위치 정보 임베딩</li>
            <li><strong>LinkPastePreview</strong> — 링크 붙여넣기 시 OG 미리보기</li>
            <li><strong>ClipboardImagePaste</strong> — 클립보드 이미지 붙여넣기</li>
            <li><strong>DragHandle</strong> — 블록 드래그 정렬</li>
            <li><strong>BlockDropGuard</strong> — 드롭 방어 로직</li>
            <li><strong>MaxLength</strong> — 글자수 제한</li>
            <li><strong>Collage</strong> — 사진 콜라주</li>
          </ul>
          <p>
            ProseMirror 기반의 에디터 확장을 이 수준으로 구현하려면 Document Model, Node/Mark 체계,
            Plugin 시스템을 상당히 깊이 이해해야 한다.
            &quot;에디터 라이브러리 갖다 쓴 것&quot;과 &quot;에디터 확장을 직접 설계한 것&quot;은 차원이 다른 작업이었다.
          </p>
        </section>

        {/* 6. Atomic Design */}
        <section>
          <h2>6. Atomic Design + Feature 기반 하이브리드 구조</h2>
          <figure className="my-6">
            <img
              src="/posts/atomic-design.png"
              alt="Atomic Design 패턴"
              className="rounded-lg w-full bg-white p-2"
            />
            <figcaption className="text-center text-sm text-muted-foreground mt-2">Brad Frost의 Atomic Design 5단계</figcaption>
          </figure>
          <p>
            220개 이상의 컴포넌트를 관리하면서도 구조가 무너지지 않은 건,
            Atomic Design의 계층(Atoms → Molecules → Organisms → Templates)을 기본 뼈대로 잡되,
            <strong>Molecules/Organisms 내부는 feature 기반으로 디렉토리를 분리</strong>했기 때문이다.
          </p>
          <pre className="text-sm"><code>{`Molecule/
├── comments/     (댓글 기능 11개 컴포넌트)
├── navigation/   (내비게이션)
├── dropdowns/    (드롭다운)
├── myPet/        (반려동물 등록)
├── lounge/       (라운지 카드)
└── admin/        (관리자 UI)`}</code></pre>
          <p>
            순수 Atomic Design만 고집하면 &quot;이 컴포넌트가 Molecule인가 Organism인가&quot;로 끝없이 논쟁하게 되는데,
            feature 디렉토리를 섞으면서 실용적으로 풀었다.
            아키텍처 원칙을 교조적으로 따르지 않고, 팀의 현실에 맞게 변형한 것이 오히려 더 나은 결과를 만들었다.
          </p>
        </section>

        {/* 7. Route Group */}
        <section>
          <h2>7. Next.js Route Group을 활용한 인증 경계</h2>
          <p>
            Next.js App Router의 Route Group을 활용해서 <strong>레이아웃 레벨에서 인증 경계를 분리</strong>했다.
          </p>
          <pre className="text-sm"><code>{`app/
├── (route)/        → 공개 라우트
├── (protected)/    → 인증 필요 라우트
├── (footer)/       → 푸터 있는 레이아웃
└── api/            → API 라우트`}</code></pre>
          <p>
            <code>(protected)</code> 그룹의 layout에서 인증 체크를 한 번만 하면 하위 모든 페이지에 자동 적용된다.
            개별 페이지마다 <code>useAuth</code> 체크를 반복하지 않아도 되는 구조다.
            App Router의 설계 의도를 정확히 이해하고 활용한 패턴이라고 생각한다.
          </p>
        </section>

        {/* 8. 접근성 */}
        <section>
          <h2>8. 접근성(a11y) 기본기</h2>
          <p>
            화려하지는 않지만, 기본기를 잡아두는 데 신경 썼다.
          </p>
          <ul>
            <li><strong>Skip Link</strong>: AppShell에 &quot;본문 바로가기&quot; 링크 (<code>sr-only</code> → 포커스 시 노출)</li>
            <li><strong>시맨틱 HTML</strong>: <code>&lt;main&gt;</code>, <code>&lt;section&gt;</code>, <code>&lt;nav&gt;</code> 적절히 사용</li>
            <li><strong>키보드 내비게이션</strong>: 이미지 뷰어에서 ESC(닫기), 화살표(이전/다음) 지원</li>
            <li><strong>ARIA 레이블</strong>: 버튼과 인터랙티브 요소에 <code>aria-label</code> 부여</li>
            <li><strong>포커스 스타일</strong>: <code>focus:ring-2 focus:ring-main/20</code> 패턴 일관 적용</li>
          </ul>
          <p>
            사이드 프로젝트에서 접근성까지 챙기는 경우는 드물지만,
            기본 구조를 잡아두면 나중에 확장하기가 훨씬 수월하다.
          </p>
        </section>

        {/* 9. Optimistic Update */}
        <section>
          <h2>9. Optimistic Update를 통한 즉각적 피드백</h2>
          <p>
            좋아요/싫어요 기능에서 서버 응답을 기다리지 않고 <strong>UI를 먼저 업데이트하는 Optimistic Update</strong>를 적용했다.
          </p>
          <p>
            개념은 쉽지만 엣지 케이스가 까다로웠다.
            특히 <code>isLiked</code> 동기화 누락 버그를 잡으면서,
            서버 상태와 로컬 상태의 동기화가 Optimistic Update에서 가장 어려운 부분이라는 걸 체감했다.
            네트워크 에러 시 롤백 처리, 동시 클릭 시 상태 일관성 유지 등을 직접 부딪히며 해결했다.
          </p>
        </section>

        {/* 10. DX */}
        <section>
          <h2>10. 개발 환경 DX 고려</h2>
          <pre className="text-sm"><code>{`const isDev = process.env.NODE_ENV === "development";
if (isDev) console.log('🚀 [API REQUEST]', { url, method, params });`}</code></pre>
          <ul>
            <li>개발 모드에서만 API 요청/응답 로그 출력</li>
            <li><code>NEXT_PUBLIC_MOCK_AUTH</code>로 로컬에서 관리자 계정 시뮬레이션</li>
            <li>Turbopack 활용으로 빠른 HMR</li>
            <li>환경변수 검증 유틸리티 (<code>validateEnv</code>)</li>
          </ul>
          <p>
            &quot;내가 쓰기 편하게&quot; 만든 부분이지만, 이런 DX 투자가 개발 속도에 직접적으로 영향을 준다.
            팀 프로젝트에서는 온보딩 시간도 줄어드는 효과가 있었다.
          </p>
        </section>

        {/* 마무리 */}
        <section>
          <h2>마무리</h2>
          <p>
            이 글에서 정리한 10가지 패턴의 공통점은, 각각의 결정에 <strong>실무적인 근거</strong>가 있다는 것이다.
            토큰 리프레시에 구독자 큐를 넣은 이유, Query Key를 팩토리로 만든 이유,
            S3 직접 업로드를 deprecated 처리한 이유 — 전부 실제 문제를 겪고 나서 도입한 해결책이다.
          </p>
          <p>
            물론 개선할 여지도 있다.
            에러 바운더리 활용도를 더 높이고 싶고, 테스트 코드도 보강해야 한다.
            하지만 아키텍처의 일관성을 유지하면서 각 영역의 기술적 깊이를 확보한 건
            팀과 프로덕트 모두에게 좋은 투자였다고 생각한다.
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
