import { ROAD_END, ROAD_START, roadFrame } from "./drive";
import type { Vec3 } from "./timeline";

/**
 * 우주 배경(스펙 3절 "배경: 우주"). 하늘은 NASA 은하수 사진(public/journey/galaxy.webp, scripts/build-galaxy.ts),
 * 길 주변에는 별 먼지가 떠다닌다. three를 import하지 않는 순수 코드다.
 */

export const GALAXY_URL = "/journey/galaxy.webp";
/** 3D 경량의 은하(2048×1024, scripts/build-galaxy.ts가 원본에서 줄여 만든다). GPU 추정 32.0 → 8.0MiB */
export const GALAXY_LITE_URL = "/journey/galaxy-2048.webp";

/** 하늘의 방향(라디안, x·y·z). 은하수 띠가 도로가 뻗는 앞쪽(−z)에 걸리도록 x축으로 기울인다 */
export const SKY_ROTATION: Vec3 = [1.2, 0, 0];

export const DUST_COUNT = 700;
/** 먼지는 도로 가장자리에서 이만큼(m) 넘게 떨어진 곳에만 둔다. 차와 카메라가 지나는 길을 비켜 가까운 먼지가 큰 원으로 보이지 않게 한다 */
export const DUST_CLEARANCE = 12;
/** 가장자리 너머로 먼지가 퍼지는 폭(m)과, 노면 기준 높이 범위(m) */
const DUST_SPREAD = 45;
const DUST_HEIGHT: readonly [number, number] = [-18, 12];

/** 같은 씨앗이면 같은 수열을 주는 난수(mulberry32). 렌더 중 Math.random을 쓰지 않고, 매번 같은 자리에 먼지를 둔다 */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 도로 양옆, 가장자리에서 DUST_CLEARANCE 너머에 흩어진 별 먼지 자리. 옆 방향은 수평(뱅킹을 따르지 않는다)이다 */
export function dustField(count: number, seed: number): Float32Array {
  const random = seededRandom(seed);
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const s = ROAD_START + random() * (ROAD_END - ROAD_START);
    const frame = roadFrame(s);
    const side = random() < 0.5 ? -1 : 1;
    const offset = side * (frame.width / 2 + DUST_CLEARANCE + random() * DUST_SPREAD);
    const flat = Math.hypot(frame.tangent[0], frame.tangent[2]);
    const right: Vec3 = [-frame.tangent[2] / flat, 0, frame.tangent[0] / flat];
    const height = DUST_HEIGHT[0] + random() * (DUST_HEIGHT[1] - DUST_HEIGHT[0]);
    positions.set(
      [frame.position[0] + right[0] * offset, frame.position[1] + height, frame.position[2] + right[2] * offset],
      i * 3,
    );
  }
  return positions;
}
