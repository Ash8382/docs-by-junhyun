import { chromium, type Browser, type Page, type Request } from "@playwright/test";
import { build } from "esbuild";
import { stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { HOLOGRAMS, layerRect, sourceSize } from "@/lib/journey/holograms";
import { rangeOf } from "@/lib/journey/timeline";

/**
 * 홀로그램 원래 색 검증(스펙 1절 2-3a 완료 조건 ①·③, 2-3b 완료 조건 "빛", 8절 4항). GPU를 쓰는 실제 Chrome 창에서 잰다.
 * ① 화면 발광 없음: 실제 재질을 톤 매핑 없이 1:1 화소로 그려(scripts/check-holograms-page.ts) 층 이미지와 비교한다. 평균 ΔE 0.5 미만.
 * ③ 블룸 기여: 실제 페이지의 막별 대표 시점을 블룸을 켜고(?debug=stats) 끈(&bloom=off) 두 장으로 찍어,
 *    화면에 보이는 홀로그램의 그림 영역 안 차이를 잰다(주변 발광 포함). 평균 ΔE 2 이하. 본문·헤더·진행 막대는 숨기고 찍는다.
 * 내려받는 양(스펙 7절): 층 이미지 파일 합계와, 블룸을 켠 페이지가 실제로 받은 양(응답 본문 + 헤더)을 따로 적는다.
 *
 * 사용법:
 *   npx next build && npx next start --port 3200   # 다른 터미널
 *   npm run check:holograms                        # 결과를 출력하고, 기준을 넘으면 실패로 끝난다
 *   CHECK_HEADLESS=1이면 창 없이 잰다. 새 헤드리스(channel chromium)라 GPU로 그린다(Apple M4에서 Metal)
 */
const TARGET_URL = process.env.CHECK_URL ?? "http://localhost:3200/journey";
const HEADLESS = process.env.CHECK_HEADLESS === "1";
const ORIGIN = new URL(TARGET_URL).origin;
const VIEWPORT = { width: 1440, height: 900 };
const READY_TIMEOUT = 30_000;
const SETTLE_MS = 2500;
const MATERIAL_LIMIT = 0.5;
const BLOOM_LIMIT = 2;
/**
 * [정류장, 정류장 안의 위치]: 1막 주황(밝은 Todo, 어두운 EUTCHA), 2막 머묾, PiCKCARE 머묾.
 * 2-3b: 1막 절벽 빛 옆의 코코아톡을 더한다(2막 머묾은 이미 뒤에 암석이 있다)
 */
const SPOTS: [string, number][] = [
  ["kokoa-clone", 0.5],
  ["todo-app", 0.1],
  ["eutcha", 0.1],
  ["stock2u", 0.5],
  ["tix2u", 0.5],
  ["pfplay", 0.5],
  ["pickcare", 0.5],
];

type Pixels = { data: Buffer; width: number; height: number; channels: number };

function linear(channel: number): number {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function lab(r: number, g: number, b: number): [number, number, number] {
  const [R, G, B] = [linear(r), linear(g), linear(b)];
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const x = f((0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047);
  const y = f(0.2126 * R + 0.7152 * G + 0.0722 * B);
  const z = f((0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

/** 같은 크기의 두 이미지에서 영역 안의 평균·최대 ΔE(CIE76) */
function deltaE(a: Pixels, b: Pixels, region: { left: number; top: number; width: number; height: number }) {
  let sum = 0;
  let max = 0;
  let count = 0;
  for (let y = region.top; y < region.top + region.height; y++) {
    for (let x = region.left; x < region.left + region.width; x++) {
      const i = (y * a.width + x) * a.channels;
      const j = (y * b.width + x) * b.channels;
      const p = lab(a.data[i], a.data[i + 1], a.data[i + 2]);
      const q = lab(b.data[j], b.data[j + 1], b.data[j + 2]);
      const value = Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
      sum += value;
      max = Math.max(max, value);
      count += 1;
    }
  }
  return { mean: count ? sum / count : 0, max };
}

async function pixels(input: Buffer | string): Promise<Pixels> {
  const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height, channels: info.channels };
}

/** ① 실제 재질을 톤 매핑 없이 그리면 층 이미지와 같은가 */
async function checkMaterial(browser: Browser): Promise<boolean> {
  const bundle = await build({
    entryPoints: [path.join("scripts", "check-holograms-page.ts")],
    bundle: true,
    format: "esm",
    write: false,
    alias: { "@": path.resolve("src") },
    logLevel: "error",
  });
  const script = bundle.outputFiles[0].text;
  const page = await browser.newPage({ viewport: { width: 1024, height: 640 }, deviceScaleFactor: 1 });
  try {
    await page.route(`${ORIGIN}/__hologram-check/**`, (route) =>
      route.fulfill({ body: `<!doctype html><body><script type="module">${script}</script></body>`, contentType: "text/html" }),
    );
    await page.goto(`${ORIGIN}/__hologram-check/`);
    await page.waitForFunction(() => window.hologramCheck !== undefined, null, { timeout: READY_TIMEOUT });
    const state = await page.evaluate(() => ({ loaded: window.hologramCheck?.loaded, uploaded: window.hologramCheck?.uploaded }));
    if (!state.uploaded || state.loaded?.some((ok) => !ok)) throw new Error(`층을 올리지 못했습니다: ${JSON.stringify(state)}`);
    let pass = true;
    console.log("① 화면 발광 없음(톤 매핑 없이 그린 화면 vs 층 이미지, 평균 ΔE 0.5 미만)");
    for (const [index, hologram] of HOLOGRAMS.entries()) {
      const origin = await page.evaluate((i) => window.hologramCheck?.show(i), index);
      if (!origin) throw new Error("검증 페이지가 준비되지 않았습니다");
      // 스크린샷은 디스플레이 색 공간으로 바뀔 수 있어(P3 화면) 캔버스의 화소를 그대로 읽는다
      const dataUrl = await page.evaluate(() => document.querySelector("canvas")?.toDataURL("image/png") ?? "");
      const shot = await pixels(Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ""), "base64"));
      const size = sourceSize(hologram);
      const rect = layerRect(size.width, size.height);
      // 잘라 낸 층은 PNG(무손실)로 넘긴다. 형식을 정하지 않으면 원래 형식(손실 WebP)으로 다시 인코딩된다
      const layer = await sharp(path.join("public", hologram.layerFile))
        .extract({ left: rect.x, top: rect.y, width: rect.width, height: rect.height })
        .png()
        .toBuffer();
      const expected = await pixels(
        await sharp({ create: { width: 1024, height: 640, channels: 3, background: "#000" } })
          .composite([{ input: layer, left: origin.left + rect.x, top: origin.top + rect.y }])
          .png()
          .toBuffer(),
      );
      // 그림 가장자리 한 화소는 테두리 경계와 맞닿아 뺀다
      const region = { left: origin.left + rect.x + 1, top: origin.top + rect.y + 1, width: rect.width - 2, height: rect.height - 2 };
      const result = deltaE(expected, shot, region);
      const ok = result.mean < MATERIAL_LIMIT;
      pass &&= ok;
      console.log(`  ${ok ? "통과" : "실패"} ${hologram.id}: 평균 ${result.mean.toFixed(3)}, 최대 ${result.max.toFixed(2)}`);
    }
    return pass;
  } finally {
    await page.close();
  }
}

async function scrollToProgress(page: Page, progress: number): Promise<void> {
  await page.evaluate((target) => {
    const main = document.querySelector("[data-journey-page]");
    if (!(main instanceof HTMLElement)) throw new Error("여정 본문이 없습니다");
    const top = main.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top + target * (main.offsetHeight - window.innerHeight), behavior: "instant" });
  }, progress);
}

type Screen = { id: string; rect: [number, number, number, number] };

type Download = { body: number; headers: number; requests: number };

/** 층 이미지 요청이 받은 양(응답 본문 + 헤더). 페이지를 닫기 전에 잰다 */
async function downloaded(layers: Request[]): Promise<Download> {
  const total: Download = { body: 0, headers: 0, requests: layers.length };
  for (const request of layers) {
    const sizes = await request.sizes();
    total.body += sizes.responseBodySize;
    total.headers += sizes.responseHeadersSize;
  }
  return total;
}

/** 대표 시점마다 화면 사진과 보이는 홀로그램의 그림 영역, 층 이미지를 받은 양 */
async function shootSpots(browser: Browser, bloom: boolean): Promise<{ shots: Pixels[]; screens: Screen[][]; download: Download }> {
  const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 2 });
  const layers: Request[] = [];
  page.on("requestfinished", (request) => {
    if (new URL(request.url()).pathname.startsWith("/journey/holograms/")) layers.push(request);
  });
  try {
    await page.addInitScript("window.__name = (target) => target;");
    await page.goto(`${TARGET_URL}?debug=stats${bloom ? "" : "&bloom=off"}`, { waitUntil: "load" });
    await page.locator('[data-journey-scene][data-state="ready"]').waitFor({ timeout: READY_TIMEOUT });
    await page.addStyleTag({
      content: '[data-journey-page], [data-site-header], nav[aria-label="여정 진행"] { visibility: hidden !important; }',
    });
    const shots: Pixels[] = [];
    const screens: Screen[][] = [];
    for (const [id, within] of SPOTS) {
      const range = rangeOf(id);
      await scrollToProgress(page, range.start + (range.end - range.start) * within);
      await page.waitForTimeout(SETTLE_MS);
      shots.push(await pixels(await page.screenshot()));
      screens.push(
        await page.evaluate(
          () => (window as Window & { __journeyStats?: { holograms: { screens: Screen[] } | null } }).__journeyStats?.holograms?.screens ?? [],
        ),
      );
    }
    return { shots, screens, download: await downloaded(layers) };
  } finally {
    await page.close();
  }
}

/** 층 이미지 파일 합계와 브라우저가 받은 양 */
async function reportDownload(download: Download): Promise<void> {
  let files = 0;
  for (const hologram of HOLOGRAMS) files += (await stat(path.join("public", hologram.layerFile))).size;
  console.log(
    `내려받는 양: 층 이미지 ${HOLOGRAMS.length}장 파일 합계 ${files}바이트, ` +
      `받은 양 ${download.body + download.headers}바이트(본문 ${download.body} + 헤더 ${download.headers}, 요청 ${download.requests}개)`,
  );
}

/** ③ 실제 장면에서 블룸이 홀로그램 화면 안에 더한 몫 */
async function checkBloom(browser: Browser): Promise<boolean> {
  const on = await shootSpots(browser, true);
  const off = await shootSpots(browser, false);
  await reportDownload(on.download);
  let pass = true;
  console.log("③ 블룸 기여(블룸 켬 vs 끔, 화면에 보이는 홀로그램의 그림 영역 안, 평균 ΔE 2 이하)");
  SPOTS.forEach(([id, within], index) => {
    const shot = on.shots[index];
    for (const screen of on.screens[index]) {
      const [left, top, right, bottom] = screen.rect;
      const inset = 0.03;
      const x0 = Math.max(0, Math.round((left + (right - left) * inset) * shot.width));
      const y0 = Math.max(0, Math.round((top + (bottom - top) * inset) * shot.height));
      const x1 = Math.min(shot.width, Math.round((right - (right - left) * inset) * shot.width));
      const y1 = Math.min(shot.height, Math.round((bottom - (bottom - top) * inset) * shot.height));
      if (x1 - x0 < 8 || y1 - y0 < 8) continue;
      const result = deltaE(off.shots[index], shot, { left: x0, top: y0, width: x1 - x0, height: y1 - y0 });
      const ok = result.mean <= BLOOM_LIMIT;
      pass &&= ok;
      console.log(`  ${ok ? "통과" : "실패"} ${id} ${within} / ${screen.id}: 평균 ${result.mean.toFixed(2)}, 최대 ${result.max.toFixed(1)}`);
    }
  });
  return pass;
}

async function main() {
  const browser = await chromium.launch({ headless: HEADLESS, channel: HEADLESS ? "chromium" : undefined, args: ["--ignore-gpu-blocklist"] });
  try {
    const material = await checkMaterial(browser);
    const bloom = await checkBloom(browser);
    if (!material || !bloom) process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
