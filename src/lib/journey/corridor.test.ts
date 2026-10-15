import { describe, expect, it } from "vitest";
import {
  CORRIDOR_END,
  CORRIDOR_START,
  HALL,
  columnInstances,
  corridorProfile,
  daisInstance,
  floorStrip,
  frameAt,
  hallFloor,
  hallRoof,
  plinthInstances,
  ribInstances,
  wallFrameInstances,
  wallStrip,
  type MeshData,
} from "./corridor";
import { STAGE_EDGES } from "./stage";
import { STOPS, focusPoint, hallCenter, pathSpan, type Vec3 } from "./timeline";

function vertex(data: MeshData, index: number): Vec3 {
  return [data.positions[3 * index], data.positions[3 * index + 1], data.positions[3 * index + 2]];
}

/** 삼각형 감기 순서로 구한 면 방향이 저장한 법선과 같은 쪽인가. 틀리면 면이 뒤집혀 안 보인다 */
function facesMatchNormals(data: MeshData): boolean {
  for (let i = 0; i < data.indices.length; i += 3) {
    const [a, b, c] = [vertex(data, data.indices[i]), vertex(data, data.indices[i + 1]), vertex(data, data.indices[i + 2])];
    const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const face = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    const n = data.indices[i];
    const normal = [data.normals[3 * n], data.normals[3 * n + 1], data.normals[3 * n + 2]];
    if (face[0] * normal[0] + face[1] * normal[1] + face[2] * normal[2] <= 0) return false;
  }
  return true;
}

function wellFormed(data: MeshData) {
  const count = data.positions.length / 3;
  expect(data.normals.length).toBe(data.positions.length);
  expect(data.uvs.length).toBe(count * 2);
  expect(data.indices.length % 3).toBe(0);
  expect(Math.max(...data.indices)).toBeLessThan(count);
}

describe("회랑 단면", () => {
  it("1막은 좁고 낮은 벽, 2막은 넓은 회랑에 난간만, 3막 통로는 좁은 난간이다(우주가 보이게)", () => {
    expect(corridorProfile(pathSpan("kokoa-clone").from)).toEqual({ halfWidth: 2.5, height: 3 });
    expect(corridorProfile(pathSpan("tix2u").from)).toEqual({ halfWidth: 4.5, height: 1.4 });
    expect(corridorProfile(CORRIDOR_END)).toEqual({ halfWidth: 3, height: 1.4 });
  });

  it("폭은 렌더 단계 경계에서 바뀐다", () => {
    expect(corridorProfile(STAGE_EDGES[0]).halfWidth).toBeCloseTo((2.5 + 4.5) / 2, 10);
  });

  it("2막 받침대가 회랑 벽 안에 들어간다", () => {
    for (const plinth of plinthInstances()) {
      const s = -plinth.position[2];
      const { center, right } = frameAt(s);
      const sideways = (plinth.position[0] - center[0]) * right[0] + (plinth.position[2] - center[2]) * right[2];
      expect(Math.abs(sideways) + plinth.scale[0]).toBeLessThan(corridorProfile(s).halfWidth);
    }
  });
});

describe("회랑 도형", () => {
  const meshes = {
    floor: floorStrip(),
    leftWall: wallStrip(-1),
    rightWall: wallStrip(1),
    hallFloor: hallFloor(),
    hallRoof: hallRoof(),
  };

  it("정점·법선·UV·인덱스 수가 맞다", () => {
    for (const data of Object.values(meshes)) wellFormed(data);
  });

  it("모든 면이 법선 쪽을 본다(바닥은 위, 벽은 회랑 안쪽, 천장은 아래)", () => {
    for (const [name, data] of Object.entries(meshes)) expect(facesMatchNormals(data), name).toBe(true);
  });

  it("회랑은 입구 뒤에서 시작해 전시실 가장자리에서 끝난다", () => {
    const floor = meshes.floor;
    expect(floor.uvs[1]).toBeCloseTo(CORRIDOR_START, 10);
    const end = frameAt(CORRIDOR_END).center;
    const center = hallCenter();
    expect(Math.hypot(end[0] - center[0], end[2] - center[2])).toBeCloseTo(HALL.radius, 3);
  });

  it("바닥 UV는 미터 단위다(옆으로 잰 거리, 회랑 거리)", () => {
    const floor = meshes.floor;
    const left = vertex(floor, 0);
    const right = vertex(floor, 1);
    expect(floor.uvs[2] - floor.uvs[0]).toBeCloseTo(Math.hypot(right[0] - left[0], right[2] - left[2]), 4);
  });

});

describe("회랑 부재", () => {
  it("1막 문틀은 2막으로 넓어지기 전에만 선다(문틀 하나는 기둥 둘과 인방 하나)", () => {
    const ribs = ribInstances();
    expect(ribs.length % 3).toBe(0);
    for (const rib of ribs) expect(-rib.position[2]).toBeLessThan(STAGE_EDGES[0]);
  });

  it("액자는 1막 프로젝트마다 막대 넷이다", () => {
    const act1 = STOPS.filter((stop) => stop.kind === "project" && stop.act === 1);
    expect(wallFrameInstances()).toHaveLength(act1.length * 4);
  });

  it("받침대는 2막 프로젝트 오브젝트 바로 아래다", () => {
    const act2 = STOPS.filter((stop) => stop.kind === "project" && stop.act === 2);
    const plinths = plinthInstances();
    expect(plinths).toHaveLength(act2.length);
    act2.forEach((stop, index) => {
      const focus = focusPoint(stop);
      if (!focus) throw new Error(`${stop.id}에 오브젝트 위치가 없습니다`);
      expect(plinths[index].position[0]).toBe(focus[0]);
      expect(plinths[index].position[2]).toBe(focus[2]);
      expect(plinths[index].position[1] + plinths[index].scale[1] / 2).toBeLessThan(focus[1]);
    });
  });

  it("기둥은 전시실 안에 서고 문 앞을 막지 않으며 천장보다 낮다", () => {
    const center = hallCenter();
    const columns = columnInstances();
    expect(columns.length).toBeGreaterThan(0);
    for (const column of columns) {
      const distance = Math.hypot(column.position[0] - center[0], column.position[2] - center[2]);
      expect(distance).toBeLessThan(HALL.radius);
      expect(column.position[1] + column.scale[1] / 2).toBeLessThan(HALL.height);
      // 문(회랑 끝) 쪽으로 통로 폭 안에 기둥이 없다
      const door = frameAt(CORRIDOR_END).center;
      expect(Math.hypot(column.position[0] - door[0], column.position[2] - door[2])).toBeGreaterThan(3);
    }
  });

  it("단은 전시실 한가운데 바닥 위다", () => {
    const center = hallCenter();
    const dais = daisInstance();
    expect([dais.position[0], dais.position[2]]).toEqual([center[0], center[2]]);
    expect(dais.position[1] - dais.scale[1] / 2).toBeGreaterThanOrEqual(0);
  });
});
