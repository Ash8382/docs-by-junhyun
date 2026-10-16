import { chromium, type Page } from "@playwright/test";

/**
 * 여정 페이지 부드러움 측정(스펙 7절 측정 조건, 8절 4항). GPU를 쓰는 실제 Chrome 창에서 정해진 간격으로 휠을 굴려
 * 여정 전체를 지나가며 프레임 간격을 잰다. 같은 경로를 3회 재생한다. 회마다 페이지를 새로 열어 장면이 준비된 뒤
 * 맨 위에서 끝까지 굴린다(Lenis가 스크롤을 이끌어 끝에서 맨 위로 정확히 되돌리기 어렵다). 회마다와 합계의 평균·p95·p99를 낸다.
 * 50ms 초과 프레임은 3회 합계 0건이어야 한다. 목표는 60fps(16.7ms)이고, 주사율이 다른 화면의 숫자는 주사율과 함께 따로 적는다.
 * 페이지를 ?debug=stats로 열어 장면 통계(가장 무거운 프레임의 드로콜, 준비 뒤 셰이더 프로그램 수, 텍스처 GPU 추정치)도 읽는다.
 * 헤드리스 브라우저는 소프트웨어 렌더링이라 숫자가 실제와 달라 창을 띄운다.
 * 휠 한 번이 Playwright를 오가는 시간에 따라 프레임 수는 실행마다 다르다. 비교는 평균·p95·p99·50ms 초과로 한다.
 *
 * 사용법:
 *   npx next build && npx next start --port 3200   # 다른 터미널
 *   npm run perf:journey                           # 기본 주소 http://localhost:3200/journey (PERF_URL로 바꿀 수 있다)
 */
const TARGET_URL = process.env.PERF_URL ?? "http://localhost:3200/journey";
const VIEWPORT = { width: 1440, height: 900 };
// 해상도 배율. 스펙의 상한(2)이 가장 무거운 조건이라 기본으로 쓴다. PERF_DPR로 바꿀 수 있다
const DEVICE_SCALE = Number(process.env.PERF_DPR ?? 2);
const RUNS = 3;
const WHEEL_STEP = 100; // 한 번에 굴리는 양(px)
const WHEEL_INTERVAL = 16; // 굴리는 간격(ms)
// 스크롤 시작 직후 프레임은 이미지 디코딩 등이 섞여 제외한다. PERF_WARMUP_FRAMES=0이면 첫 스크롤부터 잰다(첫 스크롤 끊김 확인용)
const WARMUP_FRAMES = Number(process.env.PERF_WARMUP_FRAMES ?? 30);
const READY_TIMEOUT = 30_000; // 3D 장면이 셰이더를 미리 컴파일하고 드러날 때까지 기다리는 한도
const IDLE_MS = 1000; // 회마다 스크롤 전 가만히 있는 동안 주사율을 잰다
const SCROLL_DEADLINE = 120_000; // 끝까지 가지 못하면(스크롤이 막히면) 이 시간 뒤 멈춘다

type Phase = "idle" | "scroll" | "done";
type FrameWindow = Window & { __frames: { dt: number; phase: Phase }[]; __phase: Phase };
type JourneyStats = {
  maxCalls: number;
  maxCallsProgress: number;
  programs: number;
  programsAtReady: number;
  textureBytes: number;
  car: string;
};
type StatsWindow = Window & { __journeyStats?: JourneyStats };

function percentile(sorted: number[], ratio: number): number {
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))];
}

function median(values: number[]): number {
  return percentile([...values].sort((a, b) => a - b), 0.5);
}

function summarize(sample: number[]) {
  const sorted = [...sample].sort((a, b) => a - b);
  const average = sample.reduce((sum, value) => sum + value, 0) / sample.length;
  return {
    frames: sample.length,
    averageMs: Number(average.toFixed(2)),
    fps: Number((1000 / average).toFixed(1)),
    p95Ms: Number(percentile(sorted, 0.95).toFixed(2)),
    p99Ms: Number(percentile(sorted, 0.99).toFixed(2)),
    maxMs: Number(sorted[sorted.length - 1].toFixed(2)),
    over50ms: sample.filter((value) => value > 50).length,
  };
}

/** 페이지를 열어 장면이 준비되기를 기다린 뒤 맨 위에서 끝까지 한 번 굴린다. 가만히 있던 프레임 간격과 스크롤 중 프레임 간격, 장면 통계를 돌려준다 */
async function playOnce(page: Page, url: string) {
  await page.goto(url, { waitUntil: "load" });
  // 셰이더 사전 컴파일이 끝나기 전 프레임은 재지 않는다(스펙 5절).
  await page.locator('[data-journey-scene][data-state="ready"]').waitFor({ timeout: READY_TIMEOUT });
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
  const scroll = frames
    .filter((frame) => frame.phase === "scroll")
    .map((frame) => frame.dt)
    .slice(WARMUP_FRAMES);
  if (scroll.length === 0) throw new Error(`스크롤 중 프레임이 기록되지 않았습니다(전체 ${frames.length}개)`);
  const stats = await page.evaluate(() => (window as StatsWindow).__journeyStats ?? null);
  return { idle: frames.filter((frame) => frame.phase === "idle").map((frame) => frame.dt), scroll, stats };
}

async function main() {
  const browser = await chromium.launch({ headless: false, args: ["--ignore-gpu-blocklist"] });
  try {
    const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: DEVICE_SCALE });
    // tsx(esbuild keepNames)가 evaluate에 넘기는 함수 안의 이름 있는 함수에 __name 호출을 끼워 넣는다. 브라우저에는 없어 빈 껍데기를 심는다.
    await page.addInitScript("window.__name = (target) => target;");
    const url = new URL(TARGET_URL);
    url.searchParams.set("debug", "stats");

    const runs: ReturnType<typeof summarize>[] = [];
    const scenes: JourneyStats[] = [];
    const idle: number[] = [];
    const all: number[] = [];
    for (let run = 0; run < RUNS; run++) {
      const result = await playOnce(page, url.href);
      runs.push(summarize(result.scroll));
      idle.push(...result.idle);
      all.push(...result.scroll);
      if (result.stats) scenes.push(result.stats);
    }

    const renderer = await page.evaluate(() => {
      const gl = document.createElement("canvas").getContext("webgl2");
      const info = gl?.getExtension("WEBGL_debug_renderer_info");
      return gl && info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "unknown";
    });
    const dpr = await page.evaluate(() => window.devicePixelRatio);
    const heaviest = scenes.reduce<JourneyStats | null>((best, item) => (!best || item.maxCalls > best.maxCalls ? item : best), null);
    console.log(
      JSON.stringify(
        {
          url: url.href,
          renderer,
          viewport: `${VIEWPORT.width}×${VIEWPORT.height}`,
          devicePixelRatio: dpr,
          refreshHz: Number((1000 / median(idle)).toFixed(0)),
          runs,
          total: summarize(all),
          scene: heaviest && {
            maxDrawCalls: heaviest.maxCalls,
            maxDrawCallsAtProgress: Number(heaviest.maxCallsProgress.toFixed(3)),
            // 회마다 [준비된 순간, 끝까지 굴린 뒤]. 같아야 한다(준비 뒤 새 프로그램 없음)
            programs: scenes.map((item) => [item.programsAtReady, item.programs]),
            textureMB: Number((heaviest.textureBytes / 1024 / 1024).toFixed(1)),
            car: heaviest.car,
          },
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
