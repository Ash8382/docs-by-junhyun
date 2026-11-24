import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

/**
 * PiCKCARE app 저장소의 제품 화면(스펙 6절 "제품 화면"): 디자인팀이 만든 앱 소개 화면 여섯 장(1206×2622 PNG)을 받아
 * 폭 603px WebP로 저장한다. 원본의 정확히 절반이라 가장자리가 흐려지지 않고, WALLY 화면(603×1311)과 크기가 같다.
 * 원본 폴더의 파일은 이름 앞 번호(01~06)로 찾는다("04.매거진 (1).png"처럼 뒤가 달라도 된다).
 * 상세 패널과 홀로그램(홈)이 함께 쓴다. 홀로그램의 층 이미지는 `npm run build:holograms`로 다시 만든다.
 *
 * 사용법: npm run build:app-screens -- <원본 폴더>
 */
const NAMES = ["home", "lounge", "pickylab", "magazine", "pickspot", "events"] as const;
const SOURCE_SIZE = { width: 1206, height: 2622 };
const OUTPUT_DIR = "public/projects/pickcare/app";
const OUTPUT_WIDTH = SOURCE_SIZE.width / 2;
const QUALITY = 85;

async function main() {
  const sourceDir = process.argv[2];
  if (!sourceDir) throw new Error("원본 폴더를 인자로 주세요: npm run build:app-screens -- <원본 폴더>");
  const files = await readdir(sourceDir);
  // 여섯 장을 모두 찾고 크기를 확인한 뒤에 쓴다. 중간에 멈추면 새 화면과 옛 화면이 섞여 남기 때문이다
  const sources: { name: string; file: string }[] = [];
  for (const [index, name] of NAMES.entries()) {
    const prefix = `${String(index + 1).padStart(2, "0")}.`;
    const matches = files.filter((file) => file.startsWith(prefix) && file.toLowerCase().endsWith(".png"));
    if (matches.length !== 1) throw new Error(`"${prefix}"로 시작하는 PNG가 ${matches.length}개입니다(하나여야 합니다): ${name}`);
    const meta = await sharp(path.join(sourceDir, matches[0])).metadata();
    if (meta.width !== SOURCE_SIZE.width || meta.height !== SOURCE_SIZE.height) {
      throw new Error(`${matches[0]}의 크기가 ${meta.width}×${meta.height}입니다(${SOURCE_SIZE.width}×${SOURCE_SIZE.height}여야 합니다)`);
    }
    sources.push({ name, file: path.join(sourceDir, matches[0]) });
  }
  await mkdir(OUTPUT_DIR, { recursive: true });
  for (const { name, file: source } of sources) {
    const file = `${OUTPUT_DIR}/${name}.webp`;
    const info = await sharp(source).removeAlpha().resize(OUTPUT_WIDTH).webp({ quality: QUALITY }).toFile(file);
    console.log(`${file}: ${info.width}×${info.height}, ${(info.size / 1024).toFixed(1)}KB`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
