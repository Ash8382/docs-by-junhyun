import { chromium } from "@playwright/test";

/**
 * 여정 페이지 부드러움 측정(스펙 7절, 8절 4항). GPU를 쓰는 실제 Chrome 창에서 회랑 전체를 일정한 속도로 휠 스크롤하고
 * 프레임 간격을 잰다. 헤드리스 브라우저는 소프트웨어 렌더링이라 숫자가 실제와 달라 창을 띄운다.
 *
 * 사용법:
 *   npx next build && npx next start --port 3200   # 다른 터미널
 *   npm run perf:journey                           # 기본 주소 http://localhost:3200/journey (PERF_URL로 바꿀 수 있다)
 */
const TARGET_URL = process.env.PERF_URL ?? "http://localhost:3200/journey";
const VIEWPORT = { width: 1440, height: 900 };
const WHEEL_STEP = 100; // 한 번에 굴리는 양(px)
const WHEEL_INTERVAL = 16; // 굴리는 간격(ms)
const WARMUP_FRAMES = 30; // 처음 프레임은 셰이더 컴파일·이미지 디코딩이 섞여 제외한다

type FrameWindow = Window & { __frames: number[] };

function percentile(sorted: number[], ratio: number): number {
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))];
}

async function main() {
  const browser = await chromium.launch({ headless: false, args: ["--ignore-gpu-blocklist"] });
  try {
    const page = await browser.newPage({ viewport: VIEWPORT });
    // tsx(esbuild keepNames)가 evaluate에 넘기는 함수 안의 이름 있는 함수에 __name 호출을 끼워 넣는다. 브라우저에는 없어 빈 껍데기를 심는다.
    await page.addInitScript("window.__name = (target) => target;");
    await page.goto(TARGET_URL, { waitUntil: "load" });
    await page.waitForTimeout(2000);

    // 측정 전용 프레임 기록기. 측정 대상 페이지의 시계와는 별개다.
    await page.evaluate(() => {
      const frameWindow = window as unknown as FrameWindow;
      frameWindow.__frames = [];
      let last = performance.now();
      const record = (now: number) => {
        frameWindow.__frames.push(now - last);
        last = now;
        requestAnimationFrame(record);
      };
      requestAnimationFrame(record);
    });

    await page.mouse.move(VIEWPORT.width / 2, VIEWPORT.height / 2);
    const maxScroll = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
    while ((await page.evaluate(() => window.scrollY)) < maxScroll - 2) {
      await page.mouse.wheel(0, WHEEL_STEP);
      await page.waitForTimeout(WHEEL_INTERVAL);
    }
    await page.waitForTimeout(1500);

    const frames = await page.evaluate(() => (window as unknown as FrameWindow).__frames);
    const sample = frames.slice(WARMUP_FRAMES);
    const sorted = [...sample].sort((a, b) => a - b);
    const average = sample.reduce((sum, value) => sum + value, 0) / sample.length;
    console.log(
      JSON.stringify(
        {
          url: TARGET_URL,
          frames: sample.length,
          averageMs: Number(average.toFixed(2)),
          fps: Number((1000 / average).toFixed(1)),
          p95Ms: Number(percentile(sorted, 0.95).toFixed(2)),
          maxMs: Number(sorted[sorted.length - 1].toFixed(2)),
          over33ms: sample.filter((value) => value > 33.4).length,
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
