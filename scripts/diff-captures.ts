import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

/**
 * 여정 캡처 전후 비교. 두 폴더의 같은 이름 PNG마다 바뀐 화소 비율(채널 차가 THRESHOLD를 넘는 화소)을 표로 내고,
 * 출력 폴더에 전·후·차이 마스크(바뀐 화소 빨강, 나머지는 어둡게 한 "후")를 가로로 붙여 쓴다. 묶음 한 장(sheet.png)은 건너뛴다.
 * 3단계(WALLY)에서 길 끝이 옮겨지며 바뀐 기존 장면을 사용자에게 보이려고 만들었다(계획 Task 4).
 *
 * 사용법: npx tsx scripts/diff-captures.ts <전 폴더> <후 폴더> <출력 폴더>
 */
const THRESHOLD = 8;

async function raw(file: string) {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

async function main() {
  const [before, after, output] = process.argv.slice(2);
  if (!before || !after || !output) throw new Error("사용법: diff-captures <전> <후> <출력>");
  await mkdir(output, { recursive: true });
  const names = (await readdir(before)).filter((name) => name.endsWith(".png") && name !== "sheet.png").sort();
  console.log("| 장면 | 바뀐 화소 |\n|---|---|");
  for (const name of names) {
    const a = await raw(path.join(before, name));
    const b = await raw(path.join(after, name)).catch(() => null);
    if (!b || a.width !== b.width || a.height !== b.height) {
      console.log(`| ${name} | 비교 불가(후 없음 또는 크기 다름) |`);
      continue;
    }
    const mask = Buffer.alloc(a.data.length);
    let changed = 0;
    for (let i = 0; i < a.data.length; i += 3) {
      const differs =
        Math.abs(a.data[i] - b.data[i]) > THRESHOLD ||
        Math.abs(a.data[i + 1] - b.data[i + 1]) > THRESHOLD ||
        Math.abs(a.data[i + 2] - b.data[i + 2]) > THRESHOLD;
      if (differs) changed++;
      mask[i] = differs ? 255 : b.data[i] >> 2;
      mask[i + 1] = differs ? 40 : b.data[i + 1] >> 2;
      mask[i + 2] = differs ? 40 : b.data[i + 2] >> 2;
    }
    const ratio = (changed / (a.width * a.height)) * 100;
    console.log(`| ${name.replace(".png", "")} | ${ratio.toFixed(3)}% |`);
    const options = { raw: { width: a.width, height: a.height, channels: 3 as const } };
    const gap = 16;
    // sharp는 줄이기를 합성보다 먼저 하므로, 합성을 끝낸 뒤 따로 줄인다
    const sideBySide = await sharp({ create: { width: a.width * 3 + gap * 2, height: a.height, channels: 3, background: "#ff00ff" } })
      .composite([
        { input: await sharp(a.data, options).png().toBuffer(), left: 0, top: 0 },
        { input: await sharp(b.data, options).png().toBuffer(), left: a.width + gap, top: 0 },
        { input: await sharp(mask, options).png().toBuffer(), left: (a.width + gap) * 2, top: 0 },
      ])
      .png()
      .toBuffer();
    await sharp(sideBySide)
      .resize({ width: Math.min(2400, a.width * 3 + gap * 2) })
      .jpeg({ quality: 82 })
      .toFile(path.join(output, name.replace(".png", ".jpg")));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
