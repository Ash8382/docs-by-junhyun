import { describe, expect, it } from "vitest";
import { TAILLIGHTS } from "./carAsset";
import { driveAt, roadPoint } from "./drive";
import { STREAK_SEGMENTS, STREAK_VERTICES, STREAK_WIDTH, streakIndices, writeStreaks } from "./streaks";
import { rangeOf, type Vec3 } from "./timeline";
import { streakLength, trailColor } from "./trail";

function at(id: string, t: number): number {
  const range = rangeOf(id);
  return range.start + (range.end - range.start) * t;
}

function write(progress: number) {
  const state = driveAt(progress);
  const positions = new Float32Array(STREAK_VERTICES * 3);
  const colors = new Float32Array(STREAK_VERTICES * 3);
  writeStreaks(state, state.camera.position, positions, colors);
  return { state, positions, colors };
}

function vertex(array: Float32Array, light: number, step: number, edge: number): Vec3 {
  const index = ((light * (STREAK_SEGMENTS + 1) + step) * 2 + edge) * 3;
  return [array[index], array[index + 1], array[index + 2]];
}

function middle(a: Vec3, b: Vec3): Vec3 {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
}

describe("빛줄기", () => {
  it("인덱스가 정점 안에 있다", () => {
    const indices = streakIndices();
    expect(indices.length).toBe(TAILLIGHTS.length * STREAK_SEGMENTS * 6);
    expect(Math.max(...indices)).toBe(STREAK_VERTICES - 1);
  });

  it("테일라이트에서 시작해 도로를 따라 길이만큼 뒤로 남는다", () => {
    const { state, positions } = write(at("kokoa-clone", 0.5));
    const length = streakLength(state.progress);
    TAILLIGHTS.forEach((light, index) => {
      const head = middle(vertex(positions, index, 0, 0), vertex(positions, index, 0, 1));
      const tail = middle(vertex(positions, index, STREAK_SEGMENTS, 0), vertex(positions, index, STREAK_SEGMENTS, 1));
      const expectedHead = roadPoint(state.carS + light.forward, light.lateral, light.height);
      const expectedTail = roadPoint(state.carS + light.forward - length, light.lateral, light.height);
      expect(Math.hypot(...head.map((value, axis) => value - expectedHead[axis]))).toBeLessThan(1e-3);
      expect(Math.hypot(...tail.map((value, axis) => value - expectedTail[axis]))).toBeLessThan(1e-3);
    });
  });

  it("머리는 궤적 색이고 꼬리로 갈수록 어두워진다", () => {
    const { state, colors } = write(at("tix2u", 0.1));
    const color = trailColor(state.carS);
    const head = vertex(colors, 0, 0, 0);
    expect(head[0] / head[2]).toBeCloseTo(color[0] / color[2], 5);
    let previous = Infinity;
    for (let step = 0; step <= STREAK_SEGMENTS; step++) {
      const value = vertex(colors, 0, step, 0)[2];
      expect(value).toBeLessThanOrEqual(previous);
      previous = value;
    }
    expect(previous).toBe(0);
  });

  it("폭은 머리에서 STREAK_WIDTH이고 카메라를 향한다", () => {
    const { state, positions } = write(at("kokoa-clone", 0.5));
    const left = vertex(positions, 0, 0, 0);
    const right = vertex(positions, 0, 0, 1);
    const across: Vec3 = [right[0] - left[0], right[1] - left[1], right[2] - left[2]];
    expect(Math.hypot(...across)).toBeCloseTo(STREAK_WIDTH, 5);
    const center = middle(left, right);
    const toCamera = state.camera.position.map((value, axis) => value - center[axis]);
    expect(Math.abs(across[0] * toCamera[0] + across[1] * toCamera[1] + across[2] * toCamera[2])).toBeLessThan(1e-3);
  });

  it("정류장에 서 있으면 보이지 않는다", () => {
    const { colors } = write(at("pfplay", 0.5));
    expect(colors.every((value) => value === 0)).toBe(true);
  });
});
