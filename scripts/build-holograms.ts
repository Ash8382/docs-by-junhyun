import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { HOLOGRAM_LAYERS, LAYER, textureRect } from "@/lib/journey/holograms";

/**
 * 제품 화면 홀로그램의 층 이미지(스펙 3절 "이미지 준비"). 층(홀로그램의 쪽)마다 원본(잘라 쓸 영역이 있으면 그 부분)을 768×480 층 안에
 * 비율대로 가운데 넣고(남는 자리는 투명) WebP로 public/journey/holograms/에 만든다. 층 안 그림 영역은 장면과 같은 layerRect로 정한다.
 * 장면(scene/Holograms)이 층 전부를 텍스처 배열 하나로 묶는다. 원본이나 목록(lib/journey/holograms.ts)이 바뀌면 다시 만든다.
 *
 * 사용법: npm run build:holograms
 */
const PUBLIC_DIR = "public";
const QUALITY = 82;

async function main() {
  let total = 0;
  for (const page of HOLOGRAM_LAYERS) {
    // 돌려 넣는 쪽(WALLY 세로 휴대폰)은 시계 방향 90°로 돌려 긴 변을 층의 768화소에 맞춘다. 장면이 되돌려 읽는다
    const rect = textureRect(page);
    let source = sharp(path.join(PUBLIC_DIR, page.src));
    if (page.crop) {
      const { x, y, width, height } = page.crop;
      source = source.extract({ left: x, top: y, width, height });
    }
    if (page.rotated) source = sharp(await source.rotate(90).png().toBuffer());
    const picture = await source.removeAlpha().resize(rect.width, rect.height, { fit: "fill" }).png().toBuffer();
    const output = path.join(PUBLIC_DIR, page.layerFile);
    await mkdir(path.dirname(output), { recursive: true });
    await sharp({ create: { width: LAYER.width, height: LAYER.height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: picture, left: rect.x, top: rect.y }])
      .webp({ quality: QUALITY, alphaQuality: 100 })
      .toFile(output);
    const bytes = (await stat(output)).size;
    total += bytes;
    console.log(`${output}: 그림 ${rect.width}×${rect.height}, ${bytes}바이트`);
  }
  console.log(`합계 ${HOLOGRAM_LAYERS.length}장, ${total}바이트`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
