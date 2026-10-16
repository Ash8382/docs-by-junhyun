import { mkdir } from "node:fs/promises";
import sharp from "sharp";

/**
 * PiCKCARE app 저장소의 제품 화면(스펙 6절 "제품 화면"): App Store 소개 페이지(id6809377321)의 공식 스크린샷 앞 세 장
 * (홈·라운지·피키랩)을 받아 WebP로 저장한다. iTunes lookup이 주는 주소의 크기 부분(320x480bb.jpg)을 645x1398bb.jpg로 바꿔
 * 큰 판을 받는다. 한 번 받아 저장소에 넣는다. 상세 패널과 홀로그램(홈)이 함께 쓴다.
 *
 * 사용법: npm run build:app-screens
 */
const LOOKUP_URL = "https://itunes.apple.com/lookup?id=6809377321&country=kr";
const NAMES = ["home", "lounge", "pickylab"] as const;
const OUTPUT_DIR = "public/projects/pickcare/app";
const LARGE_SIZE = "645x1398bb.jpg";
const QUALITY = 85;

async function main() {
  const response = await fetch(LOOKUP_URL);
  if (!response.ok) throw new Error(`iTunes lookup 응답이 ${response.status}입니다`);
  const lookup = (await response.json()) as { results: { screenshotUrls?: string[] }[] };
  const urls = lookup.results[0]?.screenshotUrls ?? [];
  await mkdir(OUTPUT_DIR, { recursive: true });
  for (const name of NAMES) {
    const url = urls.find((item) => item.includes(`/${name}.png/`));
    if (!url) throw new Error(`App Store 스크린샷이 없습니다: ${name}`);
    const large = url.replace(/[^/]+$/, LARGE_SIZE);
    const image = await fetch(large);
    if (!image.ok) throw new Error(`스크린샷을 받지 못했습니다(${image.status}): ${large}`);
    const file = `${OUTPUT_DIR}/${name}.webp`;
    const info = await sharp(Buffer.from(await image.arrayBuffer())).webp({ quality: QUALITY }).toFile(file);
    console.log(`${file}: ${info.width}×${info.height}, ${(info.size / 1024).toFixed(1)}KB`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
