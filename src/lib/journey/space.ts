import { CORRIDOR_START, HALL, corridorProfile, frameAt } from "./corridor";
import { hallCenter, type Vec3 } from "./timeline";

/**
 * 우주 배경(스펙 3절 "배경: 우주"). 하늘은 NASA 은하수 사진(public/journey/galaxy.webp, scripts/build-galaxy.ts),
 * 회랑과 전시실 안에는 별 먼지가 떠다닌다. three를 import하지 않는 순수 코드다.
 */

export const GALAXY_URL = "/journey/galaxy.webp";

/** 하늘의 방향(라디안, x·y·z). 은하수 띠가 1막 앞쪽과 전시실 기둥 사이로 보이도록 x축으로 기울인다 */
export const SKY_ROTATION: Vec3 = [1.2, 0, 0];

export const DUST_COUNT = 700;

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

/** 회랑 폭과 전시실 반지름 안, 바닥에서 0.2~6.2m 높이에 흩어진 별 먼지 자리 */
export function dustField(count: number, seed: number): Float32Array {
  const random = seededRandom(seed);
  const positions = new Float32Array(count * 3);
  const center = hallCenter();
  const hallStart = -(center[2] + HALL.radius);
  const hallEnd = -(center[2] - HALL.radius);
  for (let i = 0; i < count; i++) {
    const s = CORRIDOR_START + random() * (hallEnd - CORRIDOR_START);
    let x: number;
    let z: number;
    if (s < hallStart) {
      const { center: middle, right } = frameAt(s);
      const sideways = (random() * 2 - 1) * corridorProfile(s).halfWidth * 0.95;
      x = middle[0] + right[0] * sideways;
      z = middle[2] + right[2] * sideways;
    } else {
      const angle = random() * Math.PI * 2;
      const radius = Math.sqrt(random()) * HALL.radius * 0.95;
      x = center[0] + Math.sin(angle) * radius;
      z = center[2] + Math.cos(angle) * radius;
    }
    positions.set([x, 0.2 + random() * 6, z], i * 3);
  }
  return positions;
}
