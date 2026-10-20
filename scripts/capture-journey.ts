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
 * CAPTURE_SET=holograms는 막별 홀로그램 장면(스펙 3절 "제품 화면 홀로그램")을 본다: 1막 다가갈 때, 2막 머묾,
 * PiCKCARE 들어설 때·머묾·떠날 때, 엔딩(빛 원반만 남는다) — 3×3 한 장.
 * CAPTURE_SET=hall은 PiCKCARE 저장소 패널과 앞줄 홀로그램을 본다(스펙 3절 "PiCKCARE 앞줄"). 본문에서 패널 자리를 재
 * 저장소마다 읽기 구간(그 패널만 화면 안에 다 들어온 구간)과 단독 노출 구간(그 패널만 조금이라도 보이는 구간)을 찾고,
 * frontend 단독 노출 시작·읽기 시작·읽기 끝, biz·studio·app 읽기 가운데, cardnews 읽기 시작·읽기 끝·단독 노출 끝을 찍는다 — 3×3 한 장.
 * CAPTURE_SET=landscape는 막별 풍경(스펙 3절 "막별 풍경 (2-3b)")을 세 막에 걸쳐 본다: 1막 진입·코코아톡·Todo·EUTCHA 끝,
 * 2막 제목·Stock2U·Tix2U·PFPlay 끝, 3막 제목·PiCKCARE 머묾·떠날 때, 엔딩 — 열두 장, 3×4 한 장.
 * CAPTURE_SET=portrait는 세로 화면(2-4a, 스펙 3절 "세로 화면")을 본다: 풍경 묶음 열두 장에 PiCKCARE 앞·뒤 저장소 자리와 엔딩 가운데
 * (연락처가 오기 전)를 더한 열다섯 장, 5×3 한 장. CAPTURE_VIEWPORT=390x844처럼 세로 화면 크기와 함께 쓴다. 경량은 주소에 ?debug=stats&tier=lite.
 * CAPTURE_ORDER=reverse면 같은 자리를 거꾸로 찍는다(파일 이름은 같다). 정방향과 compare-captures로 비교한다(스펙 8절 4항).
 * CAPTURE_SETTLE=3700처럼 자리마다 기다리는 시간(ms, 기본 2500)을 바꾼다.
 * CAPTURE_VIEWPORT=1280x720처럼 화면 크기를 바꾼다(기본 1440x900).
 * 기본은 GPU를 쓰는 실제 Chrome 창이다.
 *
 * 사용법:
 *   npx next build && npx next start --port 3200   # 다른 터미널
 *   CAPTURE_NAME=2-2b npm run capture:journey       # → test-results/journey-captures/2-2b/ (git에 넣지 않는다)
 *   CAPTURE_SET=edge CAPTURE_NAME=2-2b-edge npm run capture:journey
 *   CAPTURE_SET=holograms CAPTURE_NAME=2-3a npm run capture:journey
 *   CAPTURE_SET=hall CAPTURE_VIEWPORT=1280x720 CAPTURE_NAME=hall-1280x720 npm run capture:journey
 *   CAPTURE_SET=landscape CAPTURE_NAME=2-3b npm run capture:journey
 *   CAPTURE_SET=landscape CAPTURE_ORDER=reverse CAPTURE_NAME=2-3b-reverse npm run capture:journey
 *   CAPTURE_SET=portrait CAPTURE_VIEWPORT=390x844 CAPTURE_HEADLESS=1 CAPTURE_NAME=2-4a-390x844 npm run capture:journey
 *   CAPTURE_HEADLESS=1을 더하면 창 없이 찍는다. 새 헤드리스(channel chromium)라 GPU로 그린다(Apple M4에서 Metal).
 *   예전 헤드리스 셸은 소프트웨어 렌더링(SwiftShader)이라 색과 속도가 실제와 달랐다.
 */
const TARGET_URL = process.env.CAPTURE_URL ?? "http://localhost:3200/journey";
const NAME = process.env.CAPTURE_NAME ?? "latest";
const SET = process.env.CAPTURE_SET ?? "stops";
const REVERSE = process.env.CAPTURE_ORDER === "reverse";
const HEADLESS = process.env.CAPTURE_HEADLESS === "1";
const VIEWPORT = (() => {
  const [width, height] = (process.env.CAPTURE_VIEWPORT ?? "1440x900").split("x").map(Number);
  return { width, height };
})();
const READY_TIMEOUT = 30_000;
// 카메라 감쇠가 목표 자리에 닿을 때까지. CAPTURE_SETTLE로 바꾼다(역방향 비교에서 시간 흐름이 다른 정방향을 한 번 더 찍을 때)
const SETTLE_MS = Number(process.env.CAPTURE_SETTLE ?? 2500);
// 화면 비율 그대로 줄인다(16:9 화면을 16:10 칸에 맞추면 양옆의 패널이 잘린다)
const TILE = { width: 480, height: Math.round((480 * VIEWPORT.height) / VIEWPORT.width) };

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

/** 막별 홀로그램 장면 */
const HOLOGRAM_SHOTS: [string, string, number][] = [
  ["01-todo-app", "todo-app", 0.1],
  ["02-eutcha", "eutcha", 0.1],
  ["03-stock2u", "stock2u", 0.5],
  ["04-tix2u", "tix2u", 0.5],
  ["05-pfplay", "pfplay", 0.5],
  ["06-pickcare-enter", "pickcare", 0.1],
  ["07-pickcare", "pickcare", 0.5],
  ["08-pickcare-leave", "pickcare", 0.86],
  ["09-ending", "ending", 1],
];

/** 세 막의 풍경: 막 경계(EUTCHA 끝 → 2막 제목, PFPlay 끝 → 3막 제목)를 넣는다 */
const LANDSCAPE_SHOTS: [string, string, number][] = [
  ["01-act-1", "act-1", 0.5],
  ["02-kokoa-clone", "kokoa-clone", 0.5],
  ["03-todo-app", "todo-app", 0.5],
  ["04-eutcha-end", "eutcha", 0.95],
  ["05-act-2", "act-2", 0.5],
  ["06-stock2u", "stock2u", 0.5],
  ["07-tix2u", "tix2u", 0.5],
  ["08-pfplay-end", "pfplay", 0.9],
  ["09-act-3", "act-3", 0.5],
  ["10-pickcare", "pickcare", 0.5],
  ["11-pickcare-leave", "pickcare", 0.97],
  ["12-ending", "ending", 1],
];

/** 세로 화면(2-4a): 풍경 묶음에 PiCKCARE 앞·뒤 저장소 자리와 엔딩 가운데(내려다보기를 마치고 연락처가 오기 전)를 더한다 */
const PORTRAIT_SHOTS: [string, string, number][] = [
  ...LANDSCAPE_SHOTS,
  ["13-pickcare-early", "pickcare", 0.3],
  ["14-pickcare-late", "pickcare", 0.75],
  ["15-ending-mid", "ending", 0.5],
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

async function captureStops(page: Page, outDir: string, shots: [string, string, number][]): Promise<string[]> {
  const files: string[] = [];
  for (const [name, id, within] of REVERSE ? [...shots].reverse() : shots) {
    await scrollToProgress(page, progressOf(id, within));
    await page.waitForTimeout(SETTLE_MS);
    await shoot(page, outDir, name, files);
  }
  return files;
}

/** PiCKCARE 저장소 패널 다섯(본문 HallStop: 위에 머무는 소개 아래, 저장소마다 블록 하나)의 세로 자리(화면 비율)와 헤더 아래끝 */
async function readHallPanels(page: Page): Promise<{ header: number; repos: [number, number][] }> {
  return page.evaluate(() => {
    const header = document.querySelector("[data-site-header]");
    const repos = [...document.querySelectorAll("#stop-pickcare > .absolute > div > div")];
    if (!header || repos.length !== 5) throw new Error("헤더나 PiCKCARE 저장소 패널을 찾지 못했습니다");
    return {
      header: header.getBoundingClientRect().bottom / window.innerHeight,
      repos: repos.map((panel) => {
        const box = panel.getBoundingClientRect();
        return [box.top / window.innerHeight, box.bottom / window.innerHeight] as [number, number];
      }),
    };
  });
}

/** 저장소마다 읽기 구간과 단독 노출 구간을 재서(PiCKCARE 안의 위치 t) 찍을 자리를 정한다 */
async function hallShots(page: Page): Promise<[string, string, number][]> {
  const step = 0.0025;
  const reading: number[][] = [[], [], [], [], []];
  const alone: number[][] = [[], [], [], [], []];
  for (let t = -0.1; t <= 1 + 1e-9; t += step) {
    await scrollToProgress(page, progressOf("pickcare", t));
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const { header, repos } = await readHallPanels(page);
    const shown = repos.flatMap(([top, bottom], index) => (bottom > header && top < 1 ? [index] : []));
    const full = repos.flatMap(([top, bottom], index) => (top >= header && bottom <= 1 ? [index] : []));
    if (shown.length === 1) alone[shown[0]].push(t);
    if (full.length === 1) reading[full[0]].push(t);
  }
  const first = (list: number[]) => list[0];
  const last = (list: number[]) => list[list.length - 1];
  const middle = (list: number[]) => (first(list) + last(list)) / 2;
  if (reading.some((list) => list.length === 0)) throw new Error("읽기 구간이 없는 저장소가 있습니다");
  const shots: [string, number][] = [
    ["01-frontend-alone-start", first(alone[0])],
    ["02-frontend-reading-start", first(reading[0])],
    ["03-frontend-reading-end", last(reading[0])],
    ["04-biz-reading", middle(reading[1])],
    ["05-studio-reading", middle(reading[2])],
    ["06-app-reading", middle(reading[3])],
    ["07-cardnews-reading-start", first(reading[4])],
    ["08-cardnews-reading-end", last(reading[4])],
    ["09-cardnews-alone-end", last(alone[4])],
  ];
  for (const [name, t] of shots) console.log(`${name}: PiCKCARE t ${t.toFixed(4)}`);
  return shots.map(([name, t]) => [name, "pickcare", t]);
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
  const browser = await chromium.launch({ headless: HEADLESS, channel: HEADLESS ? "chromium" : undefined, args: ["--ignore-gpu-blocklist"] });
  try {
    const page = await browser.newPage({ viewport: VIEWPORT });
    // tsx(esbuild keepNames)가 evaluate에 넘기는 함수에 __name 호출을 끼워 넣을 수 있다. 브라우저에는 없어 빈 껍데기를 심는다.
    await page.addInitScript("window.__name = (target) => target;");
    await page.goto(TARGET_URL, { waitUntil: "load" });
    await page.locator('[data-journey-scene][data-state="ready"]').waitFor({ timeout: READY_TIMEOUT });
    const files =
      SET === "edge"
        ? await captureEdge(page, outDir)
        : await captureStops(
            page,
            outDir,
            SET === "hall"
              ? await hallShots(page)
              : SET === "holograms"
                ? HOLOGRAM_SHOTS
                : SET === "landscape"
                  ? LANDSCAPE_SHOTS
                  : SET === "portrait"
                    ? PORTRAIT_SHOTS
                    : SHOTS,
          );
    // 거꾸로 찍어도 한 장으로 붙일 때는 이름 순서(정방향)로 둔다
    if (REVERSE) files.sort();
    const columns = SET === "edge" ? 4 : SET === "portrait" ? 5 : 3;
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
