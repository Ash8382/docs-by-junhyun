import { chromium, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { rangeOf } from "@/lib/journey/timeline";

/**
 * 여정 장면 시각 검토용 캡처. 기본(CAPTURE_SET=stops)은 정해 둔 자리(정류장과 그 안의 위치) 아홉 곳을 찍어 3×3 한 장(sheet.png)으로 붙인다.
 * 본문 패널·진행 막대가 함께 찍혀 어느 막의 빛 위에서도 글이 읽히는지 본다.
 * CAPTURE_SET=edge는 열린 끝 경계선의 안정성(스펙 8절 4항)을 본다: 멈춘 채 0.1초 간격 넷(노이즈 흐름과 깜빡임),
 * 정류장에서 길이 열리는 동안 넷(먼 경계), 휠로 천천히·빠르게 굴리는 도중 넷씩(이동 속도) — 4×4 한 장.
 * 기본은 GPU를 쓰는 실제 Chrome 창이다.
 *
 * 사용법:
 *   npx next build && npx next start --port 3200   # 다른 터미널
 *   CAPTURE_NAME=2-2b npm run capture:journey       # → test-results/journey-captures/2-2b/ (git에 넣지 않는다)
 *   CAPTURE_SET=edge CAPTURE_NAME=2-2b-edge npm run capture:journey
 *   CAPTURE_HEADLESS=1을 더하면 창 없이 찍는다(소프트웨어 렌더링이라 색과 속도는 실제와 다르다).
 */
const TARGET_URL = process.env.CAPTURE_URL ?? "http://localhost:3200/journey";
const NAME = process.env.CAPTURE_NAME ?? "latest";
const SET = process.env.CAPTURE_SET ?? "stops";
const HEADLESS = process.env.CAPTURE_HEADLESS === "1";
const VIEWPORT = { width: 1440, height: 900 };
const READY_TIMEOUT = 30_000;
const SETTLE_MS = 2500; // 카메라 감쇠가 목표 자리에 닿을 때까지
const TILE = { width: 480, height: 300 };

/** [파일 이름, 정류장, 정류장 안의 위치(0~1)] */
const SHOTS: [string, string, number][] = [
  ["01-intro", "intro", 0.3],
  ["02-kokoa-clone", "kokoa-clone", 0.5],
  ["03-eutcha", "eutcha", 0.9],
  ["04-act-2", "act-2", 0.5],
  ["05-stock2u", "stock2u", 0.5],
  ["06-pfplay", "pfplay", 0.95],
  ["07-act-3", "act-3", 0.5],
  ["08-pickcare", "pickcare", 0.5],
  ["09-ending", "ending", 1],
];

function progressOf(id: string, within: number): number {
  const range = rangeOf(id);
  return range.start + (range.end - range.start) * within;
}

/** ScrollTrigger의 진행률은 본문(<main>) 위끝이 화면 위에 닿을 때 0, 아래끝이 화면 아래에 닿을 때 1이다 */
async function scrollToProgress(page: Page, progress: number): Promise<void> {
  await page.evaluate((target) => {
    const main = document.querySelector("[data-journey-page]");
    if (!(main instanceof HTMLElement)) throw new Error("여정 본문이 없습니다");
    const top = main.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top + target * (main.offsetHeight - window.innerHeight), behavior: "instant" });
  }, progress);
}

async function shoot(page: Page, outDir: string, name: string, files: string[]): Promise<void> {
  const file = path.join(outDir, `${name}.png`);
  await page.screenshot({ path: file });
  files.push(file);
}

async function captureStops(page: Page, outDir: string): Promise<string[]> {
  const files: string[] = [];
  for (const [name, id, within] of SHOTS) {
    await scrollToProgress(page, progressOf(id, within));
    await page.waitForTimeout(SETTLE_MS);
    await shoot(page, outDir, name, files);
  }
  return files;
}

async function captureEdge(page: Page, outDir: string): Promise<string[]> {
  const files: string[] = [];
  for (const [label, id, within] of [
    ["still", "kokoa-clone", 0.5],
    ["opening", "tix2u", 0.45],
  ] as const) {
    await scrollToProgress(page, progressOf(id, within));
    await page.waitForTimeout(SETTLE_MS);
    for (let index = 1; index <= 4; index++) {
      await shoot(page, outDir, `edge-${label}-${index}`, files);
      await page.waitForTimeout(100);
    }
  }
  await page.mouse.move(VIEWPORT.width / 2, VIEWPORT.height / 2);
  for (const [label, step] of [
    ["slow", 30],
    ["fast", 150],
  ] as const) {
    await scrollToProgress(page, progressOf("act-1", 0));
    await page.waitForTimeout(SETTLE_MS);
    for (let index = 1; index <= 4; index++) {
      for (let wheel = 0; wheel < 12; wheel++) {
        await page.mouse.wheel(0, step);
        await page.waitForTimeout(16);
      }
      await shoot(page, outDir, `edge-${label}-${index}`, files);
    }
  }
  return files;
}

async function main() {
  const outDir = path.join("test-results", "journey-captures", NAME);
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: HEADLESS, args: ["--ignore-gpu-blocklist"] });
  try {
    const page = await browser.newPage({ viewport: VIEWPORT });
    // tsx(esbuild keepNames)가 evaluate에 넘기는 함수에 __name 호출을 끼워 넣을 수 있다. 브라우저에는 없어 빈 껍데기를 심는다.
    await page.addInitScript("window.__name = (target) => target;");
    await page.goto(TARGET_URL, { waitUntil: "load" });
    await page.locator('[data-journey-scene][data-state="ready"]').waitFor({ timeout: READY_TIMEOUT });
    const files = SET === "edge" ? await captureEdge(page, outDir) : await captureStops(page, outDir);
    const columns = SET === "edge" ? 4 : 3;
    const rows = Math.ceil(files.length / columns);
    const tiles = await Promise.all(files.map((file) => sharp(file).resize(TILE.width, TILE.height).toBuffer()));
    await sharp({ create: { width: TILE.width * columns, height: TILE.height * rows, channels: 3, background: "#18181b" } })
      .composite(
        tiles.map((input, index) => ({
          input,
          left: (index % columns) * TILE.width,
          top: Math.floor(index / columns) * TILE.height,
        })),
      )
      .png()
      .toFile(path.join(outDir, "sheet.png"));
    console.log(`${files.length}장과 sheet.png를 ${outDir}에 저장했습니다`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
