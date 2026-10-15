import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { FloatType } from "three";
import { EXRLoader } from "three/examples/jsm/loaders/EXRLoader.js";

/**
 * 여정 배경 은하(스펙 3절 "배경: 우주")를 만든다. NASA SVS Deep Star Maps 2020의 starmap_2020_4k.exr(선형 HDR,
 * 값은 0~1)를 sRGB 8비트로 바꿔 WebP로 저장한다. 원본 EXR(약 34MB)은 저장소에 넣지 않는다.
 * 원본과 출처: https://svs.gsfc.nasa.gov/4851 — NASA/Goddard Space Flight Center Scientific Visualization Studio,
 * Gaia DR2: ESA/Gaia/DPAC (페이지 엔딩에 표기한다)
 *
 * 사용법: GALAXY_EXR=<내려받은 starmap_2020_4k.exr 경로> npm run build:galaxy
 */
const SOURCE = process.env.GALAXY_EXR;
const OUTPUT = "public/journey/galaxy.webp";
const QUALITY = 82; // 4096×2048에서 약 1.6MB. 90이면 2.5MB인데 별 모양 차이가 눈에 띄지 않았다

function encodeSrgb(linear: number): number {
  const value = Math.min(1, Math.max(0, linear));
  const srgb = value <= 0.0031308 ? 12.92 * value : 1.055 * Math.pow(value, 1 / 2.4) - 0.055;
  return Math.round(255 * srgb);
}

async function main() {
  if (!SOURCE) throw new Error("GALAXY_EXR에 내려받은 starmap_2020_4k.exr 경로를 주세요");
  const file = await readFile(SOURCE);
  const loader = new EXRLoader();
  loader.setDataType(FloatType);
  const exr = loader.parse(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer);
  const { width, height, data } = exr as unknown as { width: number; height: number; data: Float32Array };
  const rgb = Buffer.alloc(width * height * 3);
  // EXR 행은 아래에서 위로 들어 있다. 이미지 파일은 위에서 아래라 뒤집는다(three가 이미지를 flipY로 올리면 EXR과 같은 방향이 된다).
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const source = ((height - 1 - y) * width + x) * 4;
      const target = (y * width + x) * 3;
      rgb[target] = encodeSrgb(data[source]);
      rgb[target + 1] = encodeSrgb(data[source + 1]);
      rgb[target + 2] = encodeSrgb(data[source + 2]);
    }
  }
  const info = await sharp(rgb, { raw: { width, height, channels: 3 } }).webp({ quality: QUALITY }).toFile(OUTPUT);
  console.log(`${OUTPUT}: ${width}×${height}, ${(info.size / 1024 / 1024).toFixed(2)}MB`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
