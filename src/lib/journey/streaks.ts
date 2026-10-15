import { TAILLIGHTS } from "./carAsset";
import { roadFrame, type DriveState } from "./drive";
import type { Vec3 } from "./timeline";
import { carLightLevel, streakLength, trailColor } from "./trail";

/**
 * 테일라이트 빛줄기(스펙 3절 "차"). 테일라이트 두 곳에서 도로를 따라 뒤로 남는 띠를 매 프레임 다시 계산한다.
 * 띠는 도로 곡률을 따라 휘고, 늘 카메라를 향한다. 색은 trailColor(carS)이고 꼬리로 갈수록 어두워진다(더하기 혼합이라 검정은 투명이다).
 * 길이는 진행률의 주행 속도 곡선(trail.ts streakLength)에서 정해진다. three 없이 정점 배열만 채운다(scene/Streaks.tsx).
 */

/** 띠 하나를 자르는 칸 수 */
export const STREAK_SEGMENTS = 24;
/** 띠 폭(m) */
export const STREAK_WIDTH = 0.06;
/** 띠 머리의 발광 세기(선형 HDR) */
export const STREAK_INTENSITY = 3;

/** 정점 수: 띠 두 줄 × (칸 + 1) × 양쪽 가장자리 */
export const STREAK_VERTICES = TAILLIGHTS.length * (STREAK_SEGMENTS + 1) * 2;

/** 띠 두 줄의 삼각형 인덱스. 바뀌지 않는다 */
export function streakIndices(): Uint16Array {
  const indices: number[] = [];
  for (let light = 0; light < TAILLIGHTS.length; light++) {
    for (let segment = 0; segment < STREAK_SEGMENTS; segment++) {
      const a = (light * (STREAK_SEGMENTS + 1) + segment) * 2;
      indices.push(a, a + 1, a + 3, a, a + 3, a + 2);
    }
  }
  return Uint16Array.from(indices);
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

/**
 * 진행 상태와 카메라 자리로 띠의 정점 자리(positions, 3개씩)와 색(colors, 3개씩)을 채운다.
 * 길이가 0이면(정류장에 서 있으면) 색을 모두 0으로 둬 보이지 않는다.
 */
export function writeStreaks(state: DriveState, camera: Vec3, positions: Float32Array, colors: Float32Array): void {
  const length = streakLength(state.progress);
  const color = trailColor(state.carS);
  const level = STREAK_INTENSITY * carLightLevel(state.ending);
  TAILLIGHTS.forEach((light, lightIndex) => {
    for (let step = 0; step <= STREAK_SEGMENTS; step++) {
      const along = step / STREAK_SEGMENTS;
      const s = state.carS + light.forward - length * along;
      const frame = roadFrame(s);
      const center: Vec3 = [
        frame.position[0] + frame.right[0] * light.lateral + frame.up[0] * light.height,
        frame.position[1] + frame.right[1] * light.lateral + frame.up[1] * light.height,
        frame.position[2] + frame.right[2] * light.lateral + frame.up[2] * light.height,
      ];
      let side = cross(frame.tangent, sub(camera, center));
      const size = Math.hypot(...side);
      side = size > 1e-6 ? [side[0] / size, side[1] / size, side[2] / size] : frame.up;
      const fade = length > 0 ? Math.pow(1 - along, 2) * level : 0;
      const width = (STREAK_WIDTH / 2) * (1 - 0.6 * along);
      for (let edge = 0; edge < 2; edge++) {
        const sign = edge === 0 ? -1 : 1;
        const vertex = (lightIndex * (STREAK_SEGMENTS + 1) + step) * 2 + edge;
        positions[vertex * 3] = center[0] + side[0] * width * sign;
        positions[vertex * 3 + 1] = center[1] + side[1] * width * sign;
        positions[vertex * 3 + 2] = center[2] + side[2] * width * sign;
        colors[vertex * 3] = color[0] * fade;
        colors[vertex * 3 + 1] = color[1] * fade;
        colors[vertex * 3 + 2] = color[2] * fade;
      }
    }
  });
}
