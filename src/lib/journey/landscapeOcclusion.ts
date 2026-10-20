import { ROAD_START, driveAt, roadFrame, type CameraPose } from "./drive";
import { HOLOGRAMS, hologramsAt, imageCorners, pickcareFront } from "./holograms";
import { projectPoint } from "./landscape";
import { WIDE_LENS, type Lens } from "./lens";
import type { LandscapePiece } from "./landscapeBuild";
import type { Vec3 } from "./timeline";

/**
 * 가림 판정(스펙 3절 "가림 없음"): 카메라에서 정류장 홀로그램의 네 모서리와 열린 도로 표본으로 가는 선분이 풍경에 막히는가.
 * 요소마다 상자로 먼저 거르고 그 요소의 삼각형으로 확정한다(상자만 보면 절벽 구간 상자의 비탈 위 빈 공간을 가림으로 잘못 잡는다).
 * 단위 테스트는 진행률의 카메라 목표 자리로, e2e는 장면의 실제 카메라와 실제 메시(three 레이캐스트)로 같은 표적을 본다. 순수 코드다.
 */

/** 표적: 무엇을 보는 선분인가와 끝점 */
export interface OcclusionTarget {
  label: string;
  point: Vec3;
}

/** 열린 도로 표본 간격(m)과 화면 안으로 셀 범위 */
export const OCCLUSION = { roadStep: 2, screenMargin: 0.02 } as const;

/**
 * 진행률 p의 표적: 나타난 홀로그램(나타난 정도 0.05 이상)의 그림 영역 네 모서리와, 열린 도로(열린 끝까지) 가운데 화면(aspect) 안에 드는 표본.
 * camera는 선분이 시작하는 자리(단위 테스트는 카메라 목표 자리, e2e는 실제 카메라 자리)다. 세로 화면은 세로 렌즈와 세로 카메라의 시선을 넘긴다
 * (2-4a, 기본은 가로 화면 렌즈와 driveAt의 시선).
 */
export function occlusionTargets(
  progress: number,
  aspect: number,
  camera: Vec3 = driveAt(progress).camera.position,
  lens: Lens = WIDE_LENS,
  target: Vec3 = driveAt(progress).camera.target,
): OcclusionTarget[] {
  const state = driveAt(progress);
  const pose: CameraPose = { position: camera, target };
  const targets: OcclusionTarget[] = [];
  hologramsAt(progress, pickcareFront(progress, "")).forEach((placement, index) => {
    if (placement.presence < 0.05) return;
    imageCorners(HOLOGRAMS[index], placement, camera).forEach((corner, k) => targets.push({ label: `${placement.id} 모서리 ${k}`, point: corner }));
  });
  for (let s = ROAD_START; s <= state.revealS; s += OCCLUSION.roadStep) {
    const point = roadFrame(s).position;
    const screen = projectPoint(pose, point, aspect, lens);
    const margin = OCCLUSION.screenMargin;
    if (screen.depth > 0 && screen.x > margin && screen.x < 1 - margin && screen.y > margin && screen.y < 1 - margin) {
      targets.push({ label: `도로 s ${s}`, point });
    }
  }
  return targets;
}

/** 선분과 상자가 만나는가(슬랩 방법). t는 0~1 */
function segmentHitsBox(from: Vec3, delta: Vec3, min: Vec3, max: Vec3, tMax: number): boolean {
  let low = 0;
  let high = tMax;
  for (let axis = 0; axis < 3; axis++) {
    if (Math.abs(delta[axis]) < 1e-12) {
      if (from[axis] < min[axis] || from[axis] > max[axis]) return false;
      continue;
    }
    let t0 = (min[axis] - from[axis]) / delta[axis];
    let t1 = (max[axis] - from[axis]) / delta[axis];
    if (t0 > t1) [t0, t1] = [t1, t0];
    low = Math.max(low, t0);
    high = Math.min(high, t1);
    if (low > high) return false;
  }
  return true;
}

/** 선분(from + t·delta, 0 < t < tMax)과 삼각형이 만나는 t(Möller–Trumbore). 만나지 않으면 null */
function segmentHitsTriangle(from: Vec3, delta: Vec3, a: Vec3, b: Vec3, c: Vec3, tMax: number): number | null {
  const e1: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const e2: Vec3 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const p: Vec3 = [delta[1] * e2[2] - delta[2] * e2[1], delta[2] * e2[0] - delta[0] * e2[2], delta[0] * e2[1] - delta[1] * e2[0]];
  const det = e1[0] * p[0] + e1[1] * p[1] + e1[2] * p[2];
  if (Math.abs(det) < 1e-12) return null;
  const inv = 1 / det;
  const s: Vec3 = [from[0] - a[0], from[1] - a[1], from[2] - a[2]];
  const u = (s[0] * p[0] + s[1] * p[1] + s[2] * p[2]) * inv;
  if (u < 0 || u > 1) return null;
  const q: Vec3 = [s[1] * e1[2] - s[2] * e1[1], s[2] * e1[0] - s[0] * e1[2], s[0] * e1[1] - s[1] * e1[0]];
  const v = (delta[0] * q[0] + delta[1] * q[1] + delta[2] * q[2]) * inv;
  if (v < 0 || u + v > 1) return null;
  const t = (e2[0] * q[0] + e2[1] * q[1] + e2[2] * q[2]) * inv;
  return t > 1e-9 && t < tMax ? t : null;
}

/**
 * 선분 from → to가 풍경에 막히는가. 막히면 막은 메시 이름과 요소 번호를 낸다.
 * 끝점 바로 앞 margin(m)은 보지 않는다(표적 자체에 붙은 면을 가림으로 세지 않는다).
 */
export function segmentBlocked(
  from: Vec3,
  to: Vec3,
  pieces: readonly LandscapePiece[],
  margin = 0.5,
): { piece: string; item: number } | null {
  const delta: Vec3 = [to[0] - from[0], to[1] - from[1], to[2] - from[2]];
  const length = Math.hypot(delta[0], delta[1], delta[2]);
  if (length <= margin) return null;
  const tMax = 1 - margin / length;
  for (const piece of pieces) {
    const positions = piece.positions;
    const corner = (index: number): Vec3 => [positions[index * 3], positions[index * 3 + 1], positions[index * 3 + 2]];
    for (const [itemIndex, item] of piece.items.entries()) {
      if (!segmentHitsBox(from, delta, item.min, item.max, tMax)) continue;
      for (let index = item.first; index < item.first + item.count; index += 3) {
        if (segmentHitsTriangle(from, delta, corner(index), corner(index + 1), corner(index + 2), tMax) !== null) {
          return { piece: piece.name, item: itemIndex };
        }
      }
    }
  }
  return null;
}
