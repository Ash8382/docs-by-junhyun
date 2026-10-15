import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { rangeOf } from "@/lib/journey/timeline";

/**
 * 여정 장면 시각 검토용 캡처. 정해 둔 자리(정류장과 그 안의 위치)마다 화면을 찍고 3×3 한 장(sheet.png)으로도 붙인다.
 * 본문 패널·진행 막대가 함께 찍혀 밝은 막에서도 글이 읽히는지 본다. 기본은 GPU를 쓰는 실제 Chrome 창이다.
 *
 * 사용법:
 *   npx next build && npx next start --port 3200   # 다른 터미널
 *   CAPTURE_NAME=2-2 npm run capture:journey        # → test-results/journey-captures/2-2/ (git에 넣지 않는다)
 *   CAPTURE_HEADLESS=1을 더하면 창 없이 찍는다(소프트웨어 렌더링이라 색과 속도는 실제와 다르다).
 */
const TARGET_URL = process.env.CAPTURE_URL ?? "http://localhost:3200/journey";
const NAME = process.env.CAPTURE_NAME ?? "latest";
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
    const files: string[] = [];
    for (const [name, id, within] of SHOTS) {
      const range = rangeOf(id);
      const progress = range.start + (range.end - range.start) * within;
      // ScrollTrigger의 진행률은 본문(<main>) 위끝이 화면 위에 닿을 때 0, 아래끝이 화면 아래에 닿을 때 1이다.
      await page.evaluate((target) => {
        const main = document.querySelector("[data-journey-page]");
        if (!(main instanceof HTMLElement)) throw new Error("여정 본문이 없습니다");
        const top = main.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top: top + target * (main.offsetHeight - window.innerHeight), behavior: "instant" });
      }, progress);
      await page.waitForTimeout(SETTLE_MS);
      const file = path.join(outDir, `${name}.png`);
      await page.screenshot({ path: file });
      files.push(file);
    }
    const tiles = await Promise.all(files.map((file) => sharp(file).resize(TILE.width, TILE.height).toBuffer()));
    await sharp({ create: { width: TILE.width * 3, height: TILE.height * 3, channels: 3, background: "#18181b" } })
      .composite(
        tiles.map((input, index) => ({ input, left: (index % 3) * TILE.width, top: Math.floor(index / 3) * TILE.height })),
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
