import Link from "next/link";

export const metadata = {
  title: "Safari에서 스크롤이 유독 끊기는 이유 — requestAnimationFrame, 비동기 스크롤, 그리고 Web Animations - 이준현",
  description: "Safari에서 스크롤 연동 애니메이션이 끊기는 근본 원인을 WebKit 공식 문서와 버그 트래커로 추적하고, requestAnimationFrame 기반 스크롤 효과를 Scroll-driven Animations로 옮기는 방법을 정리.",
};

export default function SafariScrollJankWebAnimationsPage() {
  return (
    <article className="container py-10 lg:py-16 max-w-3xl mx-auto">
      <div className="space-y-4 mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>2026.07.15</span>
          <span>&middot;</span>
          <span>글</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">
          Safari에서 스크롤이 유독 끊기는 이유 — requestAnimationFrame, 비동기 스크롤, 그리고 Web Animations
        </h1>
        <div className="flex flex-wrap gap-2">
          {["Safari", "WebKit", "성능", "애니메이션", "CSS", "JavaScript"].map((tag) => (
            <span key={tag} className="px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="prose dark:prose-invert max-w-none space-y-8">

        {/* 도입 */}
        <p>
          <a href="https://fitpet.co.kr/" target="_blank" rel="noreferrer">핏펫(fitpet.co.kr)</a> 사이트를
          <strong> Safari에서 스크롤</strong>해 본 적이 있다면, 아마 미묘한 위화감을 느꼈을 것이다.
          Chrome에서는 매끄럽게 흐르던 스크롤 연동 효과들이, Safari에서는 스크롤할 때마다
          살짝 <strong>덜컹거리고 끊긴다(jank)</strong>. 콘텐츠가 스크롤을 한 박자 늦게 따라오는,
          그 미세하게 &quot;출렁이는&quot; 느낌 말이다.
        </p>

        <p>
          나도 서비스를 만들면서 정확히 같은 문제를 겪었다.
          <code>scroll</code> 이벤트에 <code>requestAnimationFrame</code>을 걸어 패럴랙스와 프로그레스 바를 붙였는데,
          Chrome에서는 완벽했던 게 Safari에서만 끊겼다. 내 코드 문제인 줄 알고 한참을 파다가,
          결국 이건 <strong>내 코드가 아니라 브라우저 아키텍처의 문제</strong>라는 걸 알게 됐다.
          그 과정에서 발견한 게 2018년 WebKit이 쓴{" "}
          <a href="https://webkit.org/blog/8343/web-animations-in-webkit/" target="_blank" rel="noreferrer">
            Web Animations in WebKit
          </a>{" "}
          글이었다. 이 글은 그때 찾은 단서들을 <strong>확실한 1차 출처 중심으로</strong> 정리한 것이다.
        </p>

        {/* 무엇이 끊기는가 */}
        <section>
          <h2>무엇이 끊기는가 — rAF + scroll 패턴</h2>
          <p>
            문제가 되는 건 <strong>&quot;스크롤 위치에 반응하는 애니메이션&quot;</strong>이다.
            패럴랙스 배경, 스크롤 진행 바, 스크롤에 따라 요소가 움직이는 효과 등이 여기에 해당한다.
            이런 효과의 전형적인 구현은 다음과 같다.
          </p>
          <pre><code>{`let ticking = false;

window.addEventListener("scroll", () => {
  if (!ticking) {
    requestAnimationFrame(() => {
      const y = window.scrollY;
      // 스크롤 위치를 읽어서 요소를 직접 움직인다
      hero.style.transform = \`translateY(\${y * 0.5}px)\`;
      progressBar.style.width = \`\${(y / maxScroll) * 100}%\`;
      ticking = false;
    });
    ticking = true;
  }
});`}</code></pre>
          <p>
            <code>ticking</code> 플래그로 프레임당 한 번만 실행되게 최적화까지 해뒀다.
            교과서대로 짠 코드다. 그런데도 <strong>Safari에서만</strong> 끊긴다.
            왜일까? 답은 &quot;스크롤이 어디서 처리되는가&quot;에 있다.
          </p>
        </section>

        {/* 근본 원인 */}
        <section>
          <h2>근본 원인 — Safari의 비동기 스크롤</h2>
          <p>
            현대 브라우저는 <strong>스크롤을 메인 스레드에서 처리하지 않는다.</strong>
            메인 스레드는 자바스크립트 실행, 스타일 계산, 레이아웃, 페인트를 모두 담당하는데,
            이게 바쁘면 스크롤까지 버벅인다. 그래서 브라우저들은 스크롤을 <strong>별도의 스레드</strong>로 분리해
            메인 스레드가 아무리 바빠도 스크롤 자체는 매끄럽게 유지되도록 만들었다.
          </p>
          <p>
            WebKit 공식 문서는 이 <strong>&quot;async scrolling(비동기 스크롤)&quot;</strong> 구조를 이렇게 설명한다.
          </p>
          <blockquote>
            <p>
              &quot;Async scrolling은 wheel 이벤트를 <strong>별도의 스레드(scrolling thread)</strong>에서 처리해
              스크롤 요청에 시각적으로 빠르게 반응하도록 한다. 렌더링이 오래 걸릴 때
              scrolling thread는 <strong>메인 스레드를 거치지 않고(without going through the main thread)</strong>
              합성(composition)을 스케줄할 수 있다.&quot;
            </p>
            <p className="text-sm text-muted-foreground">
              — <a href="https://docs.webkit.org/Ports/WebKitGTK%20and%20WPE%20WebKit/Graphics.html" target="_blank" rel="noreferrer">WebKit Documentation, Graphics</a>
            </p>
          </blockquote>
          <p>
            Chrome 개발자 문서도 같은 진단을 내린다. <strong>&quot;브라우저는 스크롤을 별도 프로세스에서 처리하기 때문에
            scroll 이벤트를 비동기로 전달하며, 메인 스레드 애니메이션은 jank에 취약하다&quot;</strong>고 명시한다.
          </p>
          <p>여기서 문제의 구조가 드러난다.</p>
          <pre><code>{`  [ 스크롤(손가락/휠) ]
          │
          ▼
  scrolling thread  ──► 화면은 즉시, 매끄럽게 스크롤됨 (60fps+)
          ┊ (비동기)
          ┊  이 사이에 시간차(desync)가 생긴다
          ▼
  main thread ──► scroll 이벤트 수신 ──► rAF ──► transform 갱신
          (JS가 바쁘면 여기서 한 박자 늦음)`}</code></pre>
          <p>
            즉, <strong>화면은 scrolling thread가 이미 부드럽게 스크롤해 버렸는데,
            내 요소는 메인 스레드의 JS가 뒤늦게 움직인다.</strong> 이 둘 사이의 시간차 때문에
            요소가 스크롤에 딱 붙지 못하고 미끄러지듯 출렁인다. 이게 Safari에서 유독 도드라지는 이유는,
            WebKit의 비동기 스크롤이 특히 공격적으로 &quot;스크롤 우선&quot;으로 동작하기 때문이다.
            스크롤 부드러움을 지키려고 메인 스레드와의 동기화를 포기한 대가인 셈이다.
          </p>
          <p>
            참고로 Safari는 이 외에도 <strong>저전력 모드(Low Power Mode)</strong>나
            <strong> 교차 출처(cross-origin) iframe</strong>에서 <code>requestAnimationFrame</code>을
            30fps로 스로틀링한다. 배터리를 아끼거나 광고의 CPU 낭비를 막기 위한 조치인데,
            &quot;내 애니메이션이 왜 Safari에서만 30fps지?&quot;의 또 다른 범인이기도 하다.
          </p>
        </section>

        {/* 애플이 알고도 안 고쳤다? */}
        <section>
          <h2>&quot;애플이 알고도 안 고쳤다?&quot;의 진실</h2>
          <p>
            &quot;Safari가 이 문제를 알면서도 오래 방치했다&quot;는 이야기를 들었을 수도 있다.
            <strong>절반은 맞고 절반은 틀리다.</strong> 정확히 짚어보자.
          </p>
          <p>
            우선 비동기 스크롤로 인한 jank는 <strong>버그가 아니라 의도된 트레이드오프</strong>다.
            스크롤 자체의 부드러움을 최우선으로 지키기 위해, 메인 스레드 스크롤 효과의 완벽한 동기화를 포기한 설계다.
            그러니 &quot;안 고친&quot; 게 아니라 &quot;그렇게 설계한&quot; 것에 가깝다.
          </p>
          <p>
            문제는 <strong>근본 해결책이 너무 늦게 도착했다는 것</strong>이다. 이 문제를 제대로 푸는 방법은
            스크롤 연동 애니메이션 자체를 메인 스레드에서 걷어내는 것 —
            바로 <strong>Scroll-driven Animations</strong>다. 타임라인을 보면 격차가 선명하다.
          </p>
          <ul>
            <li><strong>Chrome 115 (2023년 7월)</strong> — Scroll-driven Animations 정식 지원. 플래그 없이 출시.</li>
            <li><strong>Safari 26.0 (2025년 9월)</strong> — 약 <strong>2년 늦게</strong> Scroll-driven Animations 지원 시작.</li>
            <li><strong>Safari 26.4 (2026년 3월)</strong> — 그제서야 <strong>threaded(진짜 off-main-thread)</strong> scroll-driven animations 도입. 릴리스 노트: <em>&quot;Added support for threaded scroll-driven animations, improving performance.&quot;</em></li>
          </ul>
          <p>
            그 사이 개발자들의 불만은 WebKit 버그 트래커에도 그대로 남아 있다. 예를 들어{" "}
            <a href="https://bugs.webkit.org/show_bug.cgi?id=290671" target="_blank" rel="noreferrer">버그 #290671</a>은
            제목부터 <strong>&quot;[scroll-animations] animations janky (using common demos)&quot;</strong>이고,
            Severity가 Major로 등록되어 있다. 즉 <strong>애플도 문제를 인지하고 있었고, 해결책을 만들고는 있었지만,
            Chrome보다 한참 뒤처졌다</strong>가 사실에 가까운 서술이다. 다행히 지금은(Safari 26.4+) 이미 해결됐다.
          </p>
        </section>

        {/* 뿌리이자 해답 */}
        <section>
          <h2>문제의 뿌리이자 해답 — 2018년 그 WebKit 글</h2>
          <p>
            흥미로운 건, 내가 삽질 끝에 발견한 그{" "}
            <a href="https://webkit.org/blog/8343/web-animations-in-webkit/" target="_blank" rel="noreferrer">2018년 WebKit 글</a>이
            바로 <strong>이 해결책의 뿌리</strong>라는 점이다. 당시 WebKit은 W3C 표준인
            <strong> Web Animations API(WAAPI)</strong>를 도입하면서, 자바스크립트로 애니메이션을 생성·제어할 수 있게 했다.
          </p>
          <p>
            그전까지는 JS로 트랜지션을 만들려면 강제 스타일 무효화(<code>getComputedStyle</code>)를 유발하거나,
            <code>@keyframes</code> 규칙을 전역 스타일시트에 동적으로 삽입해야 했다. WAAPI는 이걸 한 줄로 바꿨다.
          </p>
          <pre><code>{`// 예전 방식: 강제 스타일 무효화 필요
element.style.transitionProperty = "transform";
element.style.transitionDuration = "1s";
window.getComputedStyle(element); // 강제 리플로우
element.style.transform = "translateX(100px)";

// Web Animations API: 한 줄
const animation = element.animate(
  { transform: ["translateX(0)", "translateX(100px)"] },
  1000
);

// 그리고 완전한 제어권
animation.currentTime = 500; // 500ms 지점으로 이동
animation.pause();           // 일시정지
element.getAnimations();     // 실행 중인 애니메이션 조회`}</code></pre>
          <p>
            핵심은 <strong>&quot;브라우저 엔진이 애니메이션을 효율적으로 돌리는 능력은 그대로 두면서,
            자바스크립트로 정교하게 제어할 수 있게 한다&quot;</strong>는 설계 철학이다.
            이 WAAPI라는 토대 위에 훗날 <strong>Scroll Timeline / View Timeline</strong>이 얹혔다.
            2018년의 그 글이 2025~2026년 Safari의 스크롤 jank 해법으로 이어진 것이다.
          </p>
        </section>

        {/* 해결책 */}
        <section>
          <h2>해결책 — Scroll-driven Animations</h2>
          <p>
            Scroll-driven Animations의 아이디어는 단순하다. 애니메이션의 타임라인을
            <strong> 시간(time)이 아니라 스크롤 위치(scroll progress)</strong>로 바꾸는 것이다.
            그리고 이 애니메이션은 WAAPI/CSS Animations의 장점을 그대로 물려받아
            <strong> 컴포지터 스레드에서 메인 스레드 밖(off-main-thread)</strong>으로 돌아간다.
            스크롤과 애니메이션이 <strong>같은 스레드</strong>에서 계산되니, 앞서 본 desync가 원천적으로 사라진다.
          </p>

          <h3>CSS만으로: 스크롤 진행 바</h3>
          <p>
            <code>scroll()</code> 타임라인을 <code>animation-timeline</code>에 연결하면 끝이다. JS도, 라이브러리도 필요 없다.
          </p>
          <pre><code>{`@keyframes grow-progress {
  from { transform: scaleX(0); }
  to   { transform: scaleX(1); }
}

.progress-bar {
  transform-origin: left;
  animation: grow-progress linear;
  /* 시간이 아니라 문서 세로 스크롤에 연동 */
  animation-timeline: scroll(root block);
}`}</code></pre>

          <h3>요소가 뷰포트에 들어올 때: View Timeline</h3>
          <p>
            <code>view()</code>는 요소가 스크롤 컨테이너에 <strong>보이기 시작해서 벗어날 때까지</strong>를
            0%~100%로 잡아준다. IntersectionObserver로 짜던 &quot;스크롤 시 페이드인&quot;이 CSS 몇 줄로 끝난다.
          </p>
          <pre><code>{`@keyframes fade-in {
  from { opacity: 0; transform: translateY(40px); }
  to   { opacity: 1; transform: translateY(0); }
}

.reveal {
  animation: fade-in linear both;
  animation-timeline: view();
  animation-range: entry 0% entry 100%;
}`}</code></pre>

          <h3>JS로 제어하고 싶다면: WAAPI</h3>
          <p>
            더 복잡한 시퀀스가 필요하면 WAAPI의 <code>ScrollTimeline</code>/<code>ViewTimeline</code>을 직접 쓸 수 있다.
            2018년 글의 <code>element.animate()</code>에 타임라인만 갈아 끼우는 것이다.
          </p>
          <pre><code>{`const timeline = new ScrollTimeline({
  source: document.documentElement,
  axis: "block",
});

hero.animate(
  { transform: ["translateY(0)", "translateY(200px)"] },
  { timeline } // duration 대신 타임라인을 넘긴다
);`}</code></pre>
        </section>

        {/* 실전 마이그레이션 */}
        <section>
          <h2>실전 — rAF 코드를 옮길 때 주의할 점</h2>

          <h3>1. transform과 opacity만 &quot;공짜&quot;다</h3>
          <p>
            off-main-thread의 이점을 온전히 누리는 속성은 <strong><code>transform</code>과 <code>opacity</code></strong>뿐이다.
            <code>width</code>, <code>height</code>, <code>margin</code>, <code>top</code> 같은 걸 애니메이션하면
            레이아웃 재계산이 다시 메인 스레드로 끌려오고, <strong>탈출하려던 jank를 그대로 재현</strong>하게 된다.
            프로그레스 바도 <code>width</code>가 아니라 <code>transform: scaleX()</code>로 짜야 하는 이유다.
          </p>

          <h3>2. @supports로 안전하게 폴백</h3>
          <p>
            <code>animation-timeline</code>을 모르는 브라우저는 이 속성을 그냥 무시한다.
            그래서 <code>animation-fill-mode: both</code>로 최종 상태만 잡아두면
            애니메이션이 안 돌아도 콘텐츠는 정상적으로 보인다(<strong>점진적 향상, progressive enhancement</strong>).
            기존 JS 폴백이 꼭 필요하다면 <code>@supports</code>로 분기하면 된다.
          </p>
          <pre><code>{`/* 기본: 콘텐츠는 항상 보이게 */
.reveal { opacity: 1; }

@supports (animation-timeline: view()) {
  .reveal {
    animation: fade-in linear both;
    animation-timeline: view();
    animation-range: entry 0% entry 100%;
  }
}`}</code></pre>

          <h3>3. 지원 범위 (2026년 7월 기준)</h3>
          <ul>
            <li><strong>Chrome / Edge 115+</strong> — 완전 지원 (2023년 7월~)</li>
            <li><strong>Safari 26.0+</strong> — 지원, <strong>26.4+에서 threaded로 성능 개선</strong></li>
            <li><strong>Firefox</strong> — <code>layout.css.scroll-driven-animations.enabled</code> 플래그 뒤에서 부분 지원</li>
          </ul>
          <p>
            즉, 핏펫이나 내 서비스처럼 &quot;Safari 스크롤 jank&quot;를 겪고 있다면,
            이제는 사용자에게 최신 Safari를 요구할 필요 없이 <strong>내 쪽 코드를 rAF에서 Scroll-driven Animations로 옮기는 것</strong>만으로
            대부분 해결된다. 오래된 브라우저는 폴백으로 자연스럽게 처리된다.
          </p>
        </section>

        {/* 정리 */}
        <section>
          <h2>정리</h2>
          <ul>
            <li>Safari 스크롤 jank의 범인은 대개 <strong>비동기 스크롤 + 메인 스레드 rAF의 desync</strong>다. 내 코드가 아니라 아키텍처 문제인 경우가 많다.</li>
            <li>이건 <strong>버그가 아니라 &quot;스크롤 우선&quot; 트레이드오프</strong>다. 다만 근본 해법(Scroll-driven Animations)이 Chrome보다 약 2년 늦게 왔다.</li>
            <li>해법의 뿌리는 <strong>2018년 WebKit의 Web Animations API</strong>이고, 그 위에 Scroll/View Timeline이 얹혔다.</li>
            <li><code>scroll()</code>/<code>view()</code> 타임라인으로 애니메이션을 <strong>컴포지터로 넘기면</strong> desync 자체가 사라진다.</li>
            <li>단, <strong>transform·opacity만 컴포지터에서 공짜</strong>이고, <code>@supports</code> 폴백을 잊지 말 것.</li>
          </ul>
          <p>
            나는 아직 내 서비스에 이 마이그레이션을 완전히 적용하진 못했다. 하지만 원인을 아는 것과 모르는 것은 하늘과 땅 차이다.
            같은 증상으로 삽질하고 있다면, 이 글이 그 삽질을 조금은 줄여주길 바란다.
          </p>
        </section>

        {/* 참고 자료 */}
        <section>
          <h2>참고</h2>
          <ul>
            <li>
              <a href="https://webkit.org/blog/8343/web-animations-in-webkit/" target="_blank" rel="noreferrer">
                WebKit — Web Animations in WebKit (2018)
              </a>
            </li>
            <li>
              <a href="https://docs.webkit.org/Ports/WebKitGTK%20and%20WPE%20WebKit/Graphics.html" target="_blank" rel="noreferrer">
                WebKit Documentation — Graphics (Async scrolling 아키텍처)
              </a>
            </li>
            <li>
              <a href="https://bugs.webkit.org/show_bug.cgi?id=290671" target="_blank" rel="noreferrer">
                WebKit Bugzilla #290671 — [scroll-animations] animations janky
              </a>
            </li>
            <li>
              <a href="https://developer.apple.com/documentation/safari-release-notes/safari-26_4-release-notes" target="_blank" rel="noreferrer">
                Apple — Safari 26.4 Release Notes (threaded scroll-driven animations)
              </a>
            </li>
            <li>
              <a href="https://developer.chrome.com/docs/css-ui/scroll-driven-animations" target="_blank" rel="noreferrer">
                Chrome for Developers — Scroll-driven animations
              </a>
            </li>
            <li>
              <a href="https://motion.dev/magazine/when-browsers-throttle-requestanimationframe" target="_blank" rel="noreferrer">
                Motion — When browsers throttle requestAnimationFrame
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
