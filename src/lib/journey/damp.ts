import type { Vec3 } from "./timeline";

/** 프레임 간격(dt, 초)과 무관하게 같은 속도로 목표에 다가가는 감쇠 계수. lambda가 클수록 빠르다. */
export function dampFactor(lambda: number, dt: number): number {
  return 1 - Math.exp(-lambda * dt);
}

export function damp(current: number, target: number, lambda: number, dt: number): number {
  return current + (target - current) * dampFactor(lambda, dt);
}

/** out을 target 쪽으로 감쇠시킨다. 매 프레임 새 객체를 만들지 않도록 out을 직접 고친다(three의 Vector3를 그대로 넘길 수 있다). */
export function damp3(out: { x: number; y: number; z: number }, target: Vec3, lambda: number, dt: number): void {
  const factor = dampFactor(lambda, dt);
  out.x += (target[0] - out.x) * factor;
  out.y += (target[1] - out.y) * factor;
  out.z += (target[2] - out.z) * factor;
}
