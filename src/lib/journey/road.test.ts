import { describe, expect, it } from "vitest";
import { ROAD_END, ROAD_START, roadFrame, roadPoint } from "./drive";
import { ROAD_FACE, ROAD_STEP, ROAD_THICKNESS, roadMesh } from "./road";
import type { Vec3 } from "./timeline";

const mesh = roadMesh();
const vertexCount = mesh.positions.length / 3;

function vec(array: Float32Array, index: number): Vec3 {
  return [array[index * 3], array[index * 3 + 1], array[index * 3 + 2]];
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

describe("도로 도형", () => {
  it("배열 길이가 서로 맞고 인덱스가 정점 안에 있다", () => {
    expect(mesh.normals).toHaveLength(mesh.positions.length);
    expect(mesh.road).toHaveLength(vertexCount * 4);
    expect(mesh.indices.length % 3).toBe(0);
    expect(Math.max(...mesh.indices)).toBeLessThan(vertexCount);
    expect(vertexCount).toBe((Math.ceil((ROAD_END - ROAD_START) / ROAD_STEP) + 1) * 8);
  });

  it("도로 좌표의 s는 도로 처음부터 끝까지다", () => {
    let low = Infinity;
    let high = -Infinity;
    for (let i = 0; i < vertexCount; i++) {
      low = Math.min(low, mesh.road[i * 4]);
      high = Math.max(high, mesh.road[i * 4]);
    }
    expect(low).toBe(ROAD_START);
    expect(high).toBe(ROAD_END);
  });

  it("윗면 정점은 그 s의 도로 가장자리에 있고, 옆 거리는 ±반폭이다", () => {
    for (let i = 0; i < vertexCount; i += 7) {
      const [s, lateral, half, face] = mesh.road.subarray(i * 4, i * 4 + 4);
      expect(half).toBeCloseTo(roadFrame(s).width / 2, 4);
      expect(Math.abs(Math.abs(lateral) - half)).toBeLessThan(1e-4);
      if (face !== ROAD_FACE.top) continue;
      const expected = roadPoint(s, lateral);
      expect(Math.hypot(...sub(vec(mesh.positions, i), expected)), `정점 ${i}`).toBeLessThan(1e-3);
    }
  });

  it("아랫모서리는 윗면에서 두께만큼 아래다", () => {
    for (let i = 0; i < vertexCount; i += 5) {
      const [s, lateral, , face] = mesh.road.subarray(i * 4, i * 4 + 4);
      if (face !== ROAD_FACE.sideBottom && face !== ROAD_FACE.bottom) continue;
      const expected = roadPoint(s, lateral, -ROAD_THICKNESS);
      expect(Math.hypot(...sub(vec(mesh.positions, i), expected)), `정점 ${i}`).toBeLessThan(1e-3);
    }
  });

  it("삼각형은 바깥에서 보면 반시계 방향이다(앞면이 법선 쪽을 본다)", () => {
    for (let t = 0; t < mesh.indices.length; t += 3) {
      const [a, b, c] = [mesh.indices[t], mesh.indices[t + 1], mesh.indices[t + 2]];
      const pa = vec(mesh.positions, a);
      const faceNormal = cross(sub(vec(mesh.positions, b), pa), sub(vec(mesh.positions, c), pa));
      expect(dot(faceNormal, vec(mesh.normals, a)), `삼각형 ${t / 3}`).toBeGreaterThan(0);
    }
  });

  it("법선은 단위 벡터다", () => {
    for (let i = 0; i < vertexCount; i += 3) expect(Math.hypot(...vec(mesh.normals, i))).toBeCloseTo(1, 5);
  });

  it("면 자리는 윗면 0, 옆면 1~2, 아랫면 3이다", () => {
    const faces = new Set<number>();
    for (let i = 0; i < vertexCount; i++) faces.add(mesh.road[i * 4 + 3]);
    expect([...faces].sort()).toEqual([0, 1, 2, 3]);
  });
});
