import { readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

/**
 * 역방향 재생 비교(스펙 8절 4항, 2-3b): 풍경 영역에서 정방향과 역방향이 같은가. capture:journey로 같은 자리를 넷으로 찍는다.
 * 정방향(COMPARE_FORWARD), 풍경 없는 정방향(COMPARE_BARE, ?debug=stats&landscape=off), 시간을 달리한 정방향(COMPARE_AGAIN,
 * CAPTURE_SETTLE을 늘려 찍는다), 역방향(COMPARE_REVERSE). 같은 이름의 장면끼리 비교한다.
 * - 풍경 영역: 풍경이 있을 때와 없을 때 다른 화소(2화소 넓힘). 풍경이 가리거나 빛을 더한 자리다.
 * - 시간에 따라 바뀌는 화소: 두 정방향에서 다른 화소(도로가 열리는 끝의 노이즈 흐름, 10화소 넓힘). 뺀다.
 * 남은 풍경 영역에서 정방향과 역방향이 다른 화소를 덩어리(8방향으로 이은 화소)로 묶는다. 앞을 지나는 별 먼지는 몇 화소짜리 점이고,
 * 풍경이 진행 순서에 따라 달라지면 실루엣만 한 덩어리가 된다. 가장 큰 덩어리가 BLOB_LIMIT 화소를 넘으면 실패로 끝난다.
 * 풍경 영역이 화면의 REGION_LIMIT를 넘어도 실패다(풍경 없는 장면이 다른 자리에서 찍혔다. 그 묶음을 다시 찍는다).
 *
 * 사용법(서버는 ?debug=stats로 연다):
 *   CAPTURE_SET=landscape CAPTURE_NAME=fwd npm run capture:journey
 *   CAPTURE_SET=landscape CAPTURE_URL="http://localhost:3200/journey?debug=stats&landscape=off" CAPTURE_NAME=bare npm run capture:journey
 *   CAPTURE_SET=landscape CAPTURE_SETTLE=3700 CAPTURE_NAME=again npm run capture:journey
 *   CAPTURE_SET=landscape CAPTURE_ORDER=reverse CAPTURE_NAME=rev npm run capture:journey
 *   COMPARE_FORWARD=test-results/journey-captures/fwd COMPARE_BARE=test-results/journey-captures/bare \
 *     COMPARE_AGAIN=test-results/journey-captures/again COMPARE_REVERSE=test-results/journey-captures/rev npm run compare:captures
 */

/** 채널 차이가 이보다 크면 다른 화소다(0~255) */
const CHANNEL_THRESHOLD = 8;
/** 시간에 따라 바뀌는 화소를 넓히는 폭과 풍경 영역을 넓히는 폭(화소) */
const MASK_GROW = 10;
const LANDSCAPE_GROW = 2;
/** 풍경 영역에서 허용하는 가장 큰 차이 덩어리(화소). 별 먼지 한 점보다 크고 풍경 실루엣보다 훨씬 작다 */
const BLOB_LIMIT = 40;
/** 풍경 영역이 화면의 이 비율을 넘으면 풍경 없는 장면이 다른 자리에서 찍힌 것이다(다시 찍는다). 가장 넓은 엔딩이 약 33%다 */
const REGION_LIMIT = 0.6;

type Image = { data: Buffer; width: number; height: number; channels: number };

async function load(file: string): Promise<Image> {
  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height, channels: info.channels };
}

function differs(a: Image, b: Image, pixel: number): boolean {
  for (let channel = 0; channel < 3; channel++) {
    const index = pixel * a.channels + channel;
    if (Math.abs(a.data[index] - b.data[index]) > CHANNEL_THRESHOLD) return true;
  }
  return false;
}

/** 두 장에서 다른 화소를 grow만큼 넓힌 마스크 */
function changingMask(a: Image, b: Image, grow: number): Uint8Array {
  const { width, height } = a;
  const mask = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!differs(a, b, y * width + x)) continue;
      for (let dy = -grow; dy <= grow; dy++) {
        for (let dx = -grow; dx <= grow; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < width && ny < height) mask[ny * width + nx] = 1;
        }
      }
    }
  }
  return mask;
}

/** 다른 화소 표시에서 8방향으로 이은 덩어리들의 크기와 상자(왼쪽·위·오른쪽·아래) */
function blobs(diff: Uint8Array, width: number, height: number): { size: number; box: [number, number, number, number] }[] {
  const seen = new Uint8Array(diff.length);
  const found: { size: number; box: [number, number, number, number] }[] = [];
  const stack: number[] = [];
  for (let start = 0; start < diff.length; start++) {
    if (!diff[start] || seen[start]) continue;
    let size = 0;
    const box: [number, number, number, number] = [width, height, 0, 0];
    seen[start] = 1;
    stack.push(start);
    while (stack.length > 0) {
      const pixel = stack.pop() as number;
      size += 1;
      const x = pixel % width;
      const y = Math.floor(pixel / width);
      box[0] = Math.min(box[0], x);
      box[1] = Math.min(box[1], y);
      box[2] = Math.max(box[2], x);
      box[3] = Math.max(box[3], y);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const next = ny * width + nx;
          if (diff[next] && !seen[next]) {
            seen[next] = 1;
            stack.push(next);
          }
        }
      }
    }
    found.push({ size, box });
  }
  return found.sort((a, b) => b.size - a.size);
}

async function main() {
  const forwardDir = process.env.COMPARE_FORWARD;
  const bareDir = process.env.COMPARE_BARE;
  const againDir = process.env.COMPARE_AGAIN;
  const reverseDir = process.env.COMPARE_REVERSE;
  if (!forwardDir || !bareDir || !againDir || !reverseDir) throw new Error("COMPARE_FORWARD, COMPARE_BARE, COMPARE_AGAIN, COMPARE_REVERSE를 주세요");
  const names = (await readdir(forwardDir)).filter((name) => name.endsWith(".png") && name !== "sheet.png").sort();
  if (names.length === 0) throw new Error(`${forwardDir}에 캡처가 없습니다`);
  let pass = true;
  for (const name of names) {
    const [forward, bare, again, reverse] = await Promise.all(
      [forwardDir, bareDir, againDir, reverseDir].map((dir) => load(path.join(dir, name))),
    );
    const landscape = changingMask(forward, bare, LANDSCAPE_GROW);
    const changing = changingMask(forward, again, MASK_GROW);
    const total = forward.width * forward.height;
    const diff = new Uint8Array(total);
    let region = 0;
    for (let pixel = 0; pixel < total; pixel++) {
      if (!landscape[pixel] || changing[pixel]) continue;
      region += 1;
      if (differs(forward, reverse, pixel)) diff[pixel] = 1;
    }
    const found = blobs(diff, forward.width, forward.height);
    const largest = found[0];
    const ok = region > 0 && region / total <= REGION_LIMIT && (!largest || largest.size <= BLOB_LIMIT);
    pass &&= ok;
    console.log(
      `${ok ? "통과" : "실패"} ${name}: 풍경 영역 ${((region / total) * 100).toFixed(1)}%에서 다른 덩어리 ${found.length}개` +
        (largest ? `, 가장 큰 덩어리 ${largest.size}화소(${largest.box.join(",")})` : ""),
    );
  }
  if (!pass) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
