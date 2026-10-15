import { ROAD_END, ROAD_START, roadFrame } from "./drive";
import type { Vec3 } from "./timeline";

/**
 * 도로 판의 도형 데이터(스펙 3절: 공중에 뜬 얇은 판, 윗면과 옆면). three 없이 정점·법선·도로 좌표·인덱스 배열만 만든다.
 * 장면(scene/Road.tsx)이 BufferGeometry로 감싼다.
 * 도로 좌표(road, 정점마다 4개)는 (s, 옆 거리, 반폭, 면 자리)다. 셰이더가 이 값으로 열린 끝·발광·차선을 그린다.
 * 면 자리는 윗면 0, 옆면 1(윗모서리) ~ 2(아랫모서리), 아랫면 3이다.
 */

export interface RoadMesh {
  positions: Float32Array;
  normals: Float32Array;
  road: Float32Array;
  indices: Uint32Array;
}

/** 판 두께(m) */
export const ROAD_THICKNESS = 0.5;
/** 도형을 자르는 간격(m). 가장 급한 굽이(반지름 약 22m)에서 한 칸이 3도 남짓 돈다 */
export const ROAD_STEP = 1;
export const ROAD_FACE = { top: 0, sideTop: 1, sideBottom: 2, bottom: 3 } as const;

interface Edge {
  /** 링 안에서 면의 두 정점: 바깥에서 볼 때 왼쪽(first)과 오른쪽(second) */
  first: "topLeft" | "topRight" | "bottomLeft" | "bottomRight";
  second: "topLeft" | "topRight" | "bottomLeft" | "bottomRight";
  normal: "up" | "down" | "right" | "left";
  faces: [number, number];
}

/** 네 면. 정점 순서는 바깥에서 볼 때 반시계 방향이 되게 골랐다(three의 앞면) */
const FACES: Edge[] = [
  { first: "topLeft", second: "topRight", normal: "up", faces: [ROAD_FACE.top, ROAD_FACE.top] },
  { first: "topRight", second: "bottomRight", normal: "right", faces: [ROAD_FACE.sideTop, ROAD_FACE.sideBottom] },
  { first: "bottomLeft", second: "topLeft", normal: "left", faces: [ROAD_FACE.sideBottom, ROAD_FACE.sideTop] },
  { first: "bottomRight", second: "bottomLeft", normal: "down", faces: [ROAD_FACE.bottom, ROAD_FACE.bottom] },
];

export function roadMesh(step = ROAD_STEP): RoadMesh {
  const rings = Math.ceil((ROAD_END - ROAD_START) / step) + 1;
  const vertexCount = rings * FACES.length * 2;
  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const road = new Float32Array(vertexCount * 4);
  const indices = new Uint32Array((rings - 1) * FACES.length * 6);

  for (let ring = 0; ring < rings; ring++) {
    const s = Math.min(ROAD_END, ROAD_START + ring * step);
    const frame = roadFrame(s);
    const half = frame.width / 2;
    const at = (lateral: number, height: number): Vec3 => [
      frame.position[0] + frame.right[0] * lateral + frame.up[0] * height,
      frame.position[1] + frame.right[1] * lateral + frame.up[1] * height,
      frame.position[2] + frame.right[2] * lateral + frame.up[2] * height,
    ];
    const corners = {
      topLeft: { point: at(-half, 0), lateral: -half },
      topRight: { point: at(half, 0), lateral: half },
      bottomLeft: { point: at(-half, -ROAD_THICKNESS), lateral: -half },
      bottomRight: { point: at(half, -ROAD_THICKNESS), lateral: half },
    };
    const directions: Record<Edge["normal"], Vec3> = {
      up: frame.up,
      down: [-frame.up[0], -frame.up[1], -frame.up[2]],
      right: frame.right,
      left: [-frame.right[0], -frame.right[1], -frame.right[2]],
    };
    FACES.forEach((face, faceIndex) => {
      [face.first, face.second].forEach((corner, end) => {
        const vertex = (ring * FACES.length + faceIndex) * 2 + end;
        positions.set(corners[corner].point, vertex * 3);
        normals.set(directions[face.normal], vertex * 3);
        road.set([s, corners[corner].lateral, half, face.faces[end]], vertex * 4);
      });
      if (ring === rings - 1) return;
      const a = (ring * FACES.length + faceIndex) * 2;
      const b = a + 1;
      const c = ((ring + 1) * FACES.length + faceIndex) * 2 + 1;
      const d = c - 1;
      indices.set([a, b, c, a, c, d], (ring * FACES.length + faceIndex) * 6);
    });
  }
  return { positions, normals, road, indices };
}
