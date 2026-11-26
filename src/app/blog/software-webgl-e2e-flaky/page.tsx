import Link from "next/link";

export const metadata = {
  title: "흔들리던 e2e의 원인은 GPU 없이 그리는 WebGL이었다 - 이준현",
  description: "3D 포트폴리오 페이지의 e2e가 12번 중 10번 실패하던 원인을 찾아봤다. 범인은 키 입력이 아니라 GPU 없이 SwiftShader로 그리는 WebGL이 메인 스레드를 4초 붙잡은 것이었다. failIfMajorPerformanceCaveat와 렌더러 이름으로 소프트웨어 GL을 가려 처음부터 2D로 여는 방법과, Chrome 139부터 SwiftShader 자동 대체가 막힌 것까지 직접 확인한 기록.",
};

export default function SoftwareWebglE2eFlakyPage() {
  return (
    <article className="container py-10 lg:py-16 max-w-3xl mx-auto">
      <div className="space-y-4 mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>2026.11.25</span>
          <span>&middot;</span>
          <span>글</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">
          흔들리던 e2e의 원인은 GPU 없이 그리는 WebGL이었다
        </h1>
        <div className="flex flex-wrap gap-2">
          {["WebGL", "SwiftShader", "Playwright", "e2e", "Three.js"].map((tag) => (
            <span key={tag} className="px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="prose dark:prose-invert max-w-none space-y-8">

        <p>
          이 블로그의 <Link href="/journey">여정(/journey)</Link> 페이지는 프로젝트 이력을 3D 공간으로 보여 준다. 차가 길을 달리고 정류장마다 홀로그램이
          떠오르는 WebGL 장면이라서 e2e 테스트도 꽤 많이 걸어 두었다. 그중 <code>캔버스는 여정 장면 하나뿐이다</code> 테스트 하나가 이상하게 흔들렸다. 기기 대응 작업을
          마무리하며 돌려 보니 12번 중 10번 실패했고 그 전 빌드에서도 6번 중 4번 실패했다.
        </p>

        <p>
          이 글은 그 원인을 찾아간 기록이다. 결론부터 적으면 키 입력도 스크롤도 아니었다. <strong>GPU 없이 CPU로 그리는 WebGL이 메인 스레드를 4초 가까이 붙잡고
          있었다.</strong> 같은 일이 방문자에게도 생길 수 있어서 판별 코드를 넣었고 그 과정에서 Chrome이 이미 이 경로를 막고 있다는 것도 알게 됐다.
        </p>

        <section>
          <h2>의심했던 것들은 하나씩 아니었다</h2>
          <p>
            증상은 이랬다. 테스트가 <code>End</code> 키로 페이지 끝까지 간 뒤 연락처가 화면에 보이는지 확인하는데,
            가끔 5초 동안 맨 위에 머물러 있었다. 의심한 건 세 가지였다.
          </p>
          <ul>
            <li>
              <strong>로딩 중에 누른 End가 무시된다.</strong> 이 테스트만 장면 캔버스가 막 붙은 순간에 End를 누르는 건 맞았다.
              그런데 CPU를 6배, 10배, 20배 느리게 해도 키는 25ms 안에 처리되어 끝까지 갔다.
            </li>
            <li>
              <strong>페이지가 뜬 뒤 스크롤이 되돌려진다.</strong> ScrollTrigger의 다시 재기도 없었고 앱 코드에 위로 되돌리는 스크롤도 없었다.
            </li>
            <li>
              <strong>기계가 메모리 압박이라 느리다.</strong> 압박이 심할 때 더 자주 나타나긴 했다. 그런데 장면이 준비된 뒤에 눌러도 캐시가 빈 첫 실행에서는 20번 중 1번 실패했다.
            </li>
          </ul>
          <p>
            원인을 못 정한 채 테스트를 End 키 대신 끝으로 바로 스크롤하게 고쳤다. 증상을 피해 간 것이라서
            &quot;원인은 확정하지 못했다&quot;고 설계 문서에 적어 두었다.
          </p>
        </section>

        <section>
          <h2>키는 멀쩡했다. 답이 늦었을 뿐이다</h2>
          <p>
            여정 작업을 main에 병합한 뒤 이 문제로 돌아와 원래 형태의 테스트를 Playwright 러너로 다시 돌리며 시간을 쟀다. End 키는 매번 0.2초 안에 끝까지 갔고 실패한
            때에도 5초 뒤에는 스크롤이 끝에 가 있었다. 키는 먹었는데 테스트가 기다리는 <strong>&quot;연락처가 화면에 보인다&quot;는 판정이 늦은 것</strong>이었다.
          </p>
          <p>
            이 판정(<code>toBeInViewport</code>)은 브라우저의 IntersectionObserver로 화면 교차를 확인하고 기본 대기 시간이 5초다.
            그 답이 5초 안에 오지 않은 이유는 메인 스레드가 멈춰 있어서였다.
            장면이 준비된 직후 <strong>3.9~4.8초</strong> 동안, 열 번 모두 그랬다.
            GPU로 그리는 헤드리스 브라우저에서는 같은 구간의 멈춤이 0~51ms였다.
          </p>
          <p>
            차이는 렌더러였다. Playwright의 기본 헤드리스(Chromium headless shell)는 GPU 없이 <strong>SwiftShader</strong>라는
            CPU 렌더러로 WebGL을 그린다. GPU로 그리는 새 헤드리스와 달리 장면 하나를 올리는 데도 CPU가 전부 떠안는다.
          </p>
        </section>

        <section>
          <h2>같은 브라우저에서 렌더러만 바꿔 다시 쟀다</h2>
          <p>
            글을 쓰면서 지금 환경에서 다시 쟀다. 프로덕션 빌드를 127.0.0.1에만 열고 장면이 준비될 때까지의 시간과
            메인 스레드의 긴 작업(50ms를 넘는 작업)을 PerformanceObserver로 모았다.
            새 헤드리스에 <code>--disable-gpu</code>만 붙이면 같은 브라우저, 같은 페이지에서 렌더러만 바뀐다.
          </p>
          <pre><code>{`new PerformanceObserver((list) => {
  for (const e of list.getEntries()) window.__long.push(Math.round(e.duration));
}).observe({ type: "longtask", buffered: true });`}</code></pre>
          <table>
            <thead>
              <tr>
                <th>구성</th>
                <th>렌더러</th>
                <th>장면 준비까지</th>
                <th>가장 긴 작업</th>
                <th>50ms 넘는 작업</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>새 헤드리스 (5회)</td><td>Apple M4 (Metal)</td><td>1.5초 안팎</td><td>143~151ms</td><td>1개</td></tr>
              <tr><td>새 헤드리스 + <code>--disable-gpu</code> (5회)</td><td>SwiftShader</td><td>5.7~6.3초</td><td><strong>3.99~4.43초</strong></td><td>66~72개</td></tr>
              <tr><td>헤드리스 셸 (3회)</td><td>SwiftShader</td><td>6.2초 안팎</td><td><strong>4.40~4.50초</strong></td><td>66~72개</td></tr>
            </tbody>
          </table>
          <p>
            Apple M4, Chromium 153, Playwright 1.63, 1280×800에서 구성마다 새 브라우저를 띄워 쟀다. 장면 준비까지의 시간이 1.5초에서 6초로 늘었고
            가장 긴 작업은 0.15초에서 4초 안팎이 됐다. 50ms를 넘는 작업도 66~72개나 쌓였다. 4초짜리 하나 말고도 프레임마다 CPU가 오래 걸린다는 뜻으로 읽었다. 예전에 열
            번 잰 3.9~4.8초 범위 안이다.
          </p>
          <p>
            4초짜리 작업이 정확히 무엇인지(셰이더 컴파일이나 첫 프레임일 것으로 짐작한다)는 더 파지 않았다.
            이 글의 목적은 멈춤을 없애는 게 아니라 그 렌더러로 오는 방문자를 비켜 가게 하는 것이었다.
          </p>
        </section>

        <section>
          <h2>방문자에게도 생기는 일이다</h2>
          <p>
            e2e 헤드리스만의 문제라면 테스트 대기 시간을 늘리면 끝난다. 하지만 GPU 없이 소프트웨어로만 WebGL을 그리는 방문자는 똑같은 멈춤을 겪는다. 가상 머신, 원격 데스크톱,
            회사 VDI, GPU가 차단 목록에 올라간 PC가 그렇다. 이 페이지는 포트폴리오라서 회사 PC나 원격 환경에서 링크를 여는 사람이 있을 수 있고 그 사람의 첫인상이 4초짜리
            멈춤이 된다.
          </p>
          <p>
            그 방문자가 어떻게 되는지는 이미 만들어 둔 동작을 따라가 보면 알 수 있었다. 이 페이지는 실행 중에 프레임 속도를 재다가 느리면 한 단계씩 품질을 낮추고 마지막에는 2D
            타임라인으로 내려간다. 소프트웨어 GL 방문자는 <strong>4초 멈춤, 끊기는 3D, 강등 끝에 2D</strong> 순서로 갔다. 결국 2D가 될 사람이 멈춤을 다 겪은
            뒤에야 2D를 보는 것이다. 그래서 처음부터 2D로 열기로 했다.
          </p>
        </section>

        <section>
          <h2>소프트웨어 GL을 가려내는 신호 두 가지</h2>
          <p>
            <code>getContext(&quot;webgl2&quot;)</code>가 <code>null</code>이 아니라는 것만으로는 GPU로 그리는지 CPU로 그리는지 알 수 없다.
            쓸 수 있는 신호는 두 가지다.
          </p>
          <ol>
            <li>
              <strong><code>failIfMajorPerformanceCaveat</code></strong>:
              컨텍스트를 만들 때 이 값을 <code>true</code>로 주면, 구현체가 네이티브 앱보다 성능이 극적으로 낮을 거라고 판단할 때 컨텍스트 생성이 실패한다.
              WebGL 스펙은 예로 GPU 드라이버가 불안정해서 소프트웨어 래스터라이저로 바꾸는 경우를 든다.
              스펙은 실패하면 2D 캔버스 같은 다른 경로를 쓰라고 안내한다. 하려는 일 그대로다.
            </li>
            <li>
              <strong>렌더러 이름</strong>:{" "}
              <code>WEBGL_debug_renderer_info</code> 확장으로 <code>UNMASKED_RENDERER_WEBGL</code>을 읽어
              SwiftShader, llvmpipe, Microsoft Basic Render 같은 소프트웨어 렌더러 이름이 들어 있는지 본다.
            </li>
          </ol>
          <pre><code>{`// WebGL2가 되는 것을 먼저 확인한 뒤
const gl = document.createElement("canvas").getContext("webgl2")!;
const info = gl.getExtension("WEBGL_debug_renderer_info");
const renderer = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER));

// "느린 소프트웨어 렌더러면 만들지 않는다"
const strict = document.createElement("canvas").getContext("webgl2", { failIfMajorPerformanceCaveat: true });
const caveat = strict === null;

const SOFTWARE = /swiftshader|llvmpipe|softpipe|software rasterizer|microsoft basic render|\\bwarp\\b/i;
const softwareGL = caveat || SOFTWARE.test(renderer);`}</code></pre>
          <p>
            처음에는 <code>failIfMajorPerformanceCaveat</code> 하나면 될 줄 알았다. 구성별로 두 신호와 실제 결과(자동화 표시를 지운 방문자 기준)를 읽어 보니 둘 다 필요했다.
          </p>
          <table>
            <thead>
              <tr>
                <th>구성</th>
                <th>WebGL2</th>
                <th>엄격 컨텍스트</th>
                <th>렌더러 이름</th>
                <th>/journey</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>새 헤드리스 (GPU)</td><td>됨</td><td>됨</td><td>Apple M4 (Metal)</td><td>3D</td></tr>
              <tr><td>헤드리스 셸</td><td>됨</td><td><strong>됨</strong></td><td>SwiftShader</td><td>2D (이름으로)</td></tr>
              <tr><td>새 헤드리스 + <code>--disable-gpu</code></td><td>됨</td><td><strong>실패</strong></td><td>SwiftShader</td><td>2D (둘 다)</td></tr>
              <tr><td>같은 구성에서 SwiftShader 허용 인자를 뺀 것</td><td><strong>실패</strong></td><td>-</td><td>-</td><td>2D (WebGL2 없음)</td></tr>
            </tbody>
          </table>
          <p>
            헤드리스 셸이 핵심이다. 엄격 컨텍스트가 그냥 만들어진다. 그런데도 렌더러는 SwiftShader다. Chromium 문서는 SwiftShader를 쓰는 방식을
            &quot;OpenGL ES 드라이버로 쓰는 경우&quot;와 &quot;WebGL 대체로 쓰는 경우&quot;로 나눈다. 헤드리스 셸은 전자라서 브라우저 입장에서는 정상적인
            GPU이고 caveat가 걸리지 않는 것으로 이해했다. 이 경우는 이름으로만 잡힌다.
          </p>
          <p>
            반대로 이름만 믿을 수도 없다. MDN에 따르면 개인정보 설정에 따라 이 확장이 막힐 수 있다(Firefox는 <code>privacy.resistFingerprinting</code>이 켜지면 꺼진다).
            그러면 코드는 <code>RENDERER</code>로 물러나는데, 이 값은 Chrome에서 <code>WebKit WebGL</code>이라 소프트웨어인지 아닌지 알려 주지 못한다(위 프로브에서 확인했다).
            이름이 가려진 환경에서는 caveat가 받쳐 줘야 한다. 그래서 <code>caveat || 이름</code>이다.
            둘 다 확인하지 못하면 소프트웨어로 보지 않는다. 틀리더라도 3D를 막는 쪽보다 보여 주는 쪽으로 틀리게 했다.
          </p>
        </section>

        <section>
          <h2>GPU 없는 브라우저는 처음부터 2D로 연다</h2>
          <p>
            소프트웨어 GL로 판정되면 3D 장면을 올리지 않고 2D 타임라인으로 연다. 내용은 3D와 같은 데이터이고 2D 화면의 <code>3D로 보기</code> 버튼으로 직접 3D를
            고를 수도 있다. 직접 고른 선택은 기기 판별보다 앞선다.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 my-8">
            <figure>
              <img
                src="/posts/software-webgl-3d.webp"
                alt="GPU로 그리는 브라우저에서 열린 3D 여정 화면. 차가 길을 달리고 왼쪽에 홀로그램이 떠 있다"
                className="rounded-lg w-full my-0"
              />
              <figcaption className="text-center text-sm text-muted-foreground mt-2">
                GPU 브라우저: 3D 장면
              </figcaption>
            </figure>
            <figure>
              <img
                src="/posts/software-webgl-2d.webp"
                alt="소프트웨어 렌더러 브라우저에서 처음부터 2D로 열린 여정 화면. 세로 타임라인에 프로젝트 카드가 늘어서 있다"
                className="rounded-lg w-full my-0"
              />
              <figcaption className="text-center text-sm text-muted-foreground mt-2">
                소프트웨어 GL 브라우저: 처음부터 2D
              </figcaption>
            </figure>
          </div>
          <p>
            한 가지 예외를 뒀다. 자동화 브라우저(<code>navigator.webdriver</code>)는 소프트웨어 GL 판정을 건너뛰고 3D로 연다.
            e2e와 화면 캡처의 헤드리스도 소프트웨어 GL인데, 이들은 3D 장면을 검사해야 하기 때문이다.
            대신 이 분기가 제대로 도는지는 e2e에서 자동화 표시를 지워 실제 방문자처럼 열어서 확인한다.
          </p>
          <pre><code>{`await page.addInitScript(() =>
  Object.defineProperty(Navigator.prototype, "webdriver", { get: () => false }),
);
await page.goto("/journey");
await expectFlat(page, "tier"); // 처음부터 2D (이유: 기기)`}</code></pre>
          <p>
            e2e 쪽에는 엔딩 확인 판정의 대기 시간을 15초로 늘리는 것도 같이 했다. 엔딩을 처음 그릴 때 소프트웨어 GL이 메인 스레드를 0.3초 안팎 멈추고 기계가 메모리 압박이면 그
            멈춤이 몇 배로 늘어 기본 5초를 넘기기 때문이다.
          </p>
        </section>

        <section>
          <h2>그런데 Chrome은 이미 이 길을 막고 있었다</h2>
          <p>
            판별 코드를 쓰며 SwiftShader 자료를 찾다가 알게 된 게 있다. Chrome은 GPU가 없을 때 SwiftShader로 WebGL을 자동으로 이어 그리던 동작을 없애는
            중이다. Chromium 문서의 이유는 두 가지다. SwiftShader는 GPU 프로세스 안에서 JIT 코드가 돌아 보안 위험이 크고 GPU에서 CPU로 갑자기 떨어지는 경험이
            나쁘다는 것이다. Chrome Platform Status에는 Chrome 139부터 deprecated로 올라 있고 그 뒤로는 WebGL 컨텍스트 생성이 실패한다. 다시
            켜려면 <code>--enable-unsafe-swiftshader</code> 인자나 관리자 정책이 필요하다. Chromium 이슈에는 VDI 사용자를 지원하는 IT 부서가 이
            인자를 단 바로가기를 배포해야 할 수 있다는 안내까지 있다.
          </p>
          <p>
            지금 쓰는 Chrome 153에서 직접 확인했다. 위 표의 마지막 줄이 그 결과다. 새 헤드리스에서 GPU를 끄고 허용 인자를 빼면{" "}
            <code>getContext(&quot;webgl2&quot;)</code>가 <code>null</code>이 된다.
            그런데 Playwright는 기본 인자에 <code>--enable-unsafe-swiftshader</code>를 넣어 둔다(playwright-core 1.63 소스에서 확인했다).
            그래서 <code>--disable-gpu</code>를 붙인 새 헤드리스도 소프트웨어 GL로 돌아간다.
            헤드리스 셸은 이 인자를 빼도 SwiftShader로 그렸다. 위 멈춤을 재현할 수 있었던 건 Playwright 쪽 사정이기도 하다.
          </p>
          <p>
            이 사실로 처음 가정이 흔들렸다. GPU가 없어 SwiftShader로 떨어질 환경이라도 Chrome 139 이상이고 정책으로 허용하지 않았다면 WebGL 자체가 안 열려서
            이미 <code>WebGL2 없음</code> 경로로 2D가 된다. 내가 걱정한 &quot;VDI에서 4초 멈춤을 겪는 방문자&quot;는 Chrome에서는 많이 줄었다.
            이 판별이 여전히 필요한 곳은 관리자가 SwiftShader를 허용한 환경, 139 이전 Chrome, 그리고 다른 브라우저의 소프트웨어 경로 정도다.
            Windows의 WARP나 Linux의 llvmpipe를 쓰는 브라우저에서는 재 보지 못했다.
          </p>
          <p>
            그래도 코드는 짧고 틀려도 손해가 작다. 다만 설계 문서에 적어 둔 &quot;회사 VDI에서 여는 채용 담당자가 겪을 수 있다&quot;는 근거는
            Chrome에 한해서는 약해졌다. 보험으로 남긴 코드라고 적는 편이 정확하다.
          </p>
        </section>

        <section>
          <h2>정리</h2>
          <ul>
            <li>e2e가 흔들린 건 키 입력이 아니라 메인 스레드가 멈춰서 <strong>화면에 보인다는 판정이 5초 안에 오지 않았기 때문</strong>이다.</li>
            <li>범인은 GPU 없이 SwiftShader로 그리는 WebGL이다. 같은 새 헤드리스에서 렌더러만 바꿔도 가장 긴 작업이 0.15초에서 4초 안팎이 됐다.</li>
            <li><code>failIfMajorPerformanceCaveat</code>만으로는 헤드리스 셸을 못 잡고 렌더러 이름만으로는 이름이 가려진 환경을 못 잡는다. 둘을 같이 쓴다.</li>
            <li>Chrome은 139부터 SwiftShader 자동 대체를 막았다. 실제 방문자에게 미치는 영향은 처음 생각보다 작다.</li>
            <li>원인을 못 찾은 채 테스트를 고쳐 넘어갈 때는 모른다고 적어 둔다. 그 기록이 있어서 병합 뒤에 같은 지점에서 다시 시작할 수 있었다.</li>
          </ul>
          <p>
            위 숫자는 맥의 헤드리스 브라우저에서 잰 값이고 실제 VDI에서는 재 보지 못했다.
            VDI의 소프트웨어 렌더러가 SwiftShader가 아니면 멈춤의 크기도 다를 수 있다.
          </p>
        </section>

        <section>
          <h2>참고</h2>
          <ul>
            <li>
              <a href="https://registry.khronos.org/webgl/specs/latest/1.0/" target="_blank" rel="noreferrer">
                Khronos — WebGL Specification (failIfMajorPerformanceCaveat)
              </a>
            </li>
            <li>
              <a href="https://developer.mozilla.org/en-US/docs/Web/API/WEBGL_debug_renderer_info" target="_blank" rel="noreferrer">
                MDN — WEBGL_debug_renderer_info extension
              </a>
            </li>
            <li>
              <a href="https://chromium.googlesource.com/chromium/src/+/main/docs/gpu/swiftshader.md" target="_blank" rel="noreferrer">
                Chromium Docs — Using Chromium with SwiftShader
              </a>
            </li>
            <li>
              <a href="https://issues.chromium.org/40277080" target="_blank" rel="noreferrer">
                Chromium Issue 40277080 — Remove SwiftShader as a WebGL fallback unless explicitly requested
              </a>
            </li>
            <li>
              <a href="https://chromestatuslite.com/feature/5166674414927872" target="_blank" rel="noreferrer">
                Chrome Platform Status — Remove SwiftShader fallback (Deprecated, Chrome 139)
              </a>
            </li>
            <li>
              <a href="https://blog.tojicode.com/2013/12/failifmajorperformancecaveat-with-great.html" target="_blank" rel="noreferrer">
                TojiCode — failIfMajorPerformanceCaveat: With great blacklisting power comes the need for self restraint (2013)
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
