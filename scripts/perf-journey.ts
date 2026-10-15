import { chromium } from "@playwright/test";

/**
 * 여정 페이지 부드러움 측정(스펙 7절, 8절 4항). GPU를 쓰는 실제 Chrome 창에서 정해진 간격으로 휠을 굴려 회랑 전체를
 * 지나가며 프레임 간격을 잰다. 헤드리스 브라우저는 소프트웨어 렌더링이라 숫자가 실제와 달라 창을 띄운다.
 * 휠 한 번이 Playwright를 오가는 시간에 따라 프레임 수는 실행마다 다르다. 비교는 averageMs·over50ms로 한다.
 *
 * 사용법:
 *   npx next build && npx next start --port 3200   # 다른 터미널
 *   npm run perf:journey                           # 기본 주소 http://localhost:3200/journey (PERF_URL로 바꿀 수 있다)
 */
const TARGET_URL = process.env.PERF_URL ?? "http://localhost:3200/journey";
const VIEWPORT = { width: 1440, height: 900 };
const WHEEL_STEP = 100; // 한 번에 굴리는 양(px)
const WHEEL_INTERVAL = 16; // 굴리는 간격(ms)
// 스크롤 시작 직후 프레임은 이미지 디코딩 등이 섞여 제외한다. PERF_WARMUP_FRAMES=0이면 첫 스크롤부터 잰다(첫 스크롤 끊김 확인용)
const WARMUP_FRAMES = Number(process.env.PERF_WARMUP_FRAMES ?? 30);
const READY_TIMEOUT = 30_000; // 3D 장면이 셰이더를 미리 컴파일하고 드러날 때까지 기다리는 한도
const IDLE_MS = 1000; // 스크롤 전 가만히 있는 동안 주사율을 잰다
const SCROLL_DEADLINE = 120_000; // 끝까지 가지 못하면(스크롤이 막히면) 이 시간 뒤 멈춘다

type Phase = "idle" | "scroll" | "done";
type FrameWindow = Window & { __frames: { dt: number; phase: Phase }[]; __phase: Phase };

function percentile(sorted: number[], ratio: number): number {
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))];
}

function median(values: number[]): number {
  return percentile([...values].sort((a, b) => a - b), 0.5);
}

async function main() {
  const browser = await chromium.launch({ headless: false, args: ["--ignore-gpu-blocklist"] });
  try {
    const page = await browser.newPage({ viewport: VIEWPORT });
    // tsx(esbuild keepNames)가 evaluate에 넘기는 함수 안의 이름 있는 함수에 __name 호출을 끼워 넣는다. 브라우저에는 없어 빈 껍데기를 심는다.
    await page.addInitScript("window.__name = (target) => target;");
    await page.goto(TARGET_URL, { waitUntil: "load" });
    // 셰이더 사전 컴파일이 끝나기 전 프레임은 재지 않는다(스펙 5절).
    await page.locator('[data-journey-scene][data-state="ready"]').waitFor({ timeout: READY_TIMEOUT });

    const renderer = await page.evaluate(() => {
      const gl = document.createElement("canvas").getContext("webgl2");
      const info = gl?.getExtension("WEBGL_debug_renderer_info");
      return gl && info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "unknown";
    });

    // 측정 전용 프레임 기록기. 측정 대상 페이지의 시계와는 별개다. 프레임마다 지금 단계(가만히·스크롤·끝)를 함께 적는다.
    await page.evaluate(() => {
      const frameWindow = window as unknown as FrameWindow;
      frameWindow.__frames = [];
      frameWindow.__phase = "idle";
      let last = performance.now();
      const record = (now: number) => {
        frameWindow.__frames.push({ dt: now - last, phase: frameWindow.__phase });
        last = now;
        if (frameWindow.__phase !== "done") requestAnimationFrame(record);
      };
      requestAnimationFrame(record);
    });
    await page.waitForTimeout(IDLE_MS);

    await page.evaluate(() => {
      (window as unknown as FrameWindow).__phase = "scroll";
    });
    await page.mouse.move(VIEWPORT.width / 2, VIEWPORT.height / 2);
    const maxScroll = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
    const started = Date.now();
    while ((await page.evaluate(() => window.scrollY)) < maxScroll - 2) {
      if (Date.now() - started > SCROLL_DEADLINE) {
        const reached = await page.evaluate(() => window.scrollY);
        throw new Error(`${SCROLL_DEADLINE / 1000}초 안에 끝까지 스크롤하지 못했습니다(${reached}/${maxScroll}px)`);
      }
      await page.mouse.wheel(0, WHEEL_STEP);
      await page.waitForTimeout(WHEEL_INTERVAL);
    }
    // 끝에 닿은 뒤의 가만히 있는 프레임은 넣지 않는다(p95가 묽어진다).
    await page.evaluate(() => {
      (window as unknown as FrameWindow).__phase = "done";
    });

    const frames = await page.evaluate(() => (window as unknown as FrameWindow).__frames);
    const idle = frames.filter((frame) => frame.phase === "idle").map((frame) => frame.dt);
    const sample = frames
      .filter((frame) => frame.phase === "scroll")
      .map((frame) => frame.dt)
      .slice(WARMUP_FRAMES);
    if (sample.length === 0) throw new Error(`스크롤 중 프레임이 기록되지 않았습니다(전체 ${frames.length}개)`);
    const refreshMs = median(idle);
    const sorted = [...sample].sort((a, b) => a - b);
    const average = sample.reduce((sum, value) => sum + value, 0) / sample.length;
    console.log(
      JSON.stringify(
        {
          url: TARGET_URL,
          renderer,
          refreshHz: Number((1000 / refreshMs).toFixed(0)),
          frames: sample.length,
          averageMs: Number(average.toFixed(2)),
          fps: Number((1000 / average).toFixed(1)),
          p95Ms: Number(percentile(sorted, 0.95).toFixed(2)),
          maxMs: Number(sorted[sorted.length - 1].toFixed(2)),
          // 주사율 한 칸의 두 배를 넘은 프레임(한 프레임 이상 놓침). 60Hz면 33ms, 120Hz면 17ms 기준이다.
          overTwoFrames: sample.filter((value) => value > refreshMs * 2).length,
          over50ms: sample.filter((value) => value > 50).length,
        },
        null,
        2,
      ),
    );
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
