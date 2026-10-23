import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { chromium } from "@playwright/test";
import sharp from "sharp";

/**
 * 프로젝트 공개 화면을 같은 조건(1440×900, 2배 배율)으로 찍어 WebP로 저장한다.
 * 사이트가 바뀌면 다시 돌린다: npm run capture:screens
 * 하나만 다시 찍으려면 경로를 넘긴다: npm run capture:screens -- pickcare/biz/home
 * 결과는 public/projects/<경로>.webp이고 크기는 2880×1800이다. 데이터(src/data/projects/*.ts)의 width/height도 그 값이다.
 * 홀로그램 층 이미지는 이 캡처에서 만들므로 찍은 뒤 npm run build:holograms도 돌린다.
 * dismiss가 있는 대상은 그 글자를 눌러 첫 방문 대화상자를 닫은 뒤 찍는다.
 * PiCKCARE 앱(App Store)과 PFPlay 안쪽 화면처럼 로그인이 필요한 화면은 사용자가 직접 넣는다.
 */
const TARGETS = [
  { file: "todo-app/home", url: "https://geezers-io.github.io/todo-app-assignment/" },
  { file: "eutcha/home", url: "https://eutcha.vercel.app/" },
  { file: "pfplay/home", url: "https://pfplay.xyz/" },
  { file: "pickcare/frontend/home", url: "https://pickcare.co.kr/", dismiss: "건너뛰기" },
  // 2026-10-23: www.biz.pickcare.co.kr에서 crm.pickcare.co.kr(PiCKYCHART)로 새로 배포했다
  { file: "pickcare/biz/home", url: "https://crm.pickcare.co.kr/" },
  { file: "pickcare/studio/home", url: "https://studio.pickcare.co.kr/" },
] as const;

const VIEWPORT = { width: 1440, height: 900 };
// 첫 화면의 등장 애니메이션과 지연 로딩 이미지가 자리 잡을 시간
const SETTLE_MS = 2500;

async function main() {
  const only = process.argv.slice(2);
  const targets = only.length ? TARGETS.filter((target) => only.includes(target.file)) : TARGETS;
  if (targets.length !== (only.length || TARGETS.length)) {
    throw new Error(`모르는 경로가 있습니다: ${only.join(", ")} (가능: ${TARGETS.map((target) => target.file).join(", ")})`);
  }
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2, locale: "ko-KR" });
  try {
    for (const target of targets) {
      const page = await context.newPage();
      await page.goto(target.url, { waitUntil: "load", timeout: 60_000 });
      await page.waitForTimeout(SETTLE_MS);
      if ("dismiss" in target) {
        // 첫 방문 온보딩 대화상자가 첫 화면을 가린다. 사람이 누르듯 닫고 찍는다.
        await page.getByText(target.dismiss, { exact: true }).click({ timeout: 5000 });
        await page.waitForTimeout(800);
      }
      const png = await page.screenshot();
      const out = join(process.cwd(), "public", "projects", `${target.file}.webp`);
      await mkdir(dirname(out), { recursive: true });
      const info = await sharp(png).webp({ quality: 85 }).toFile(out);
      console.log(`${target.file}.webp  ${info.width}x${info.height}  ${info.size} bytes`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
