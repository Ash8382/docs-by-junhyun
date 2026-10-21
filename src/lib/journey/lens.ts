import type { CameraPose } from "./drive";
import { CAMERA_FOV, type Vec3 } from "./timeline";

/**
 * 카메라 렌즈(스펙 3절 "세로 화면 (2-4a)"): 세로 시야각(°)과 투영 중심(시선이 맺히는 자리)의 화면 위에서의 비율.
 * 세로 화면(가로가 세로보다 좁다)은 시야각을 넓히고 투영 중심을 위로 올려 화면 위 60%에 차와 홀로그램을, 아래 40%에 본문 카드를 둔다.
 * 장면은 three PerspectiveCamera의 fov와 setViewOffset으로 같은 투영을 만든다(scene/CameraRig). three를 import하지 않는다.
 */
export interface Lens {
  fov: number;
  center: number;
}

export const WIDE_LENS: Lens = { fov: CAMERA_FOV, center: 0.5 };
export const PORTRAIT_LENS: Lens = { fov: 58, center: 0.29 };

export function isPortrait(width: number, height: number): boolean {
  return width < height;
}

export function lensFor(width: number, height: number): Lens {
  return isPortrait(width, height) ? PORTRAIT_LENS : WIDE_LENS;
}

function normalize(a: Vec3): Vec3 {
  const length = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / length, a[1] / length, a[2] / length];
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/**
 * 점이 맺히는 화면 좌표(0~1, 왼쪽·위가 0)와 시선 방향 깊이. 카메라는 수평을 유지한다(three lookAt, 위쪽 +y).
 * 투영 중심이 0.5가 아니면 화면 전체가 위아래로 옮겨진 것과 같다(setViewOffset).
 */
export function projectThrough(pose: CameraPose, point: Vec3, aspect: number, lens: Lens): { x: number; y: number; depth: number } {
  const f = normalize([pose.target[0] - pose.position[0], pose.target[1] - pose.position[1], pose.target[2] - pose.position[2]]);
  const right = normalize([-f[2], 0, f[0]]);
  const up: Vec3 = [right[1] * f[2] - right[2] * f[1], right[2] * f[0] - right[0] * f[2], right[0] * f[1] - right[1] * f[0]];
  const offset: Vec3 = [point[0] - pose.position[0], point[1] - pose.position[1], point[2] - pose.position[2]];
  const depth = dot(offset, f);
  const tan = Math.tan((lens.fov / 2) * (Math.PI / 180));
  return {
    x: 0.5 + dot(offset, right) / depth / (tan * aspect) / 2,
    y: lens.center - dot(offset, up) / depth / tan / 2,
    depth,
  };
}
