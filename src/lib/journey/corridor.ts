import { STAGE_EDGES } from "./stage";
import { STOPS, focusPoint, hallCenter, objectSide, pathPoint, smoothstep, type Vec3 } from "./timeline";

/**
 * 회랑과 전시실의 도형 데이터(스펙 2절 "세 막": 좁고 낮은 회랑 → 난간만 있는 넓은 회랑과 전시 구역 →
 * 벽 없이 기둥과 고리 지붕만 있는 원형 전시실). 2막부터는 벽을 낮추거나 없애 우주 배경이 보이게 한다.
 * three 없이 정점·법선·UV·인덱스 배열과 인스턴스 자세만 만든다. 장면(scene/Corridor.tsx)이 BufferGeometry로 감싼다.
 * UV는 미터 단위다. 렌더 단계 셰이더가 UV의 정수 눈금마다 청사진 격자선을 긋는다.
 */

export interface MeshData {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  indices: Uint32Array;
}

/** 크기가 1인 상자·원기둥을 늘려 세우는 자리 */
export interface Instance {
  position: Vec3;
  rotationY: number;
  scale: Vec3;
}

interface Profile {
  halfWidth: number;
  height: number;
}

const ACT1: Profile = { halfWidth: 2.5, height: 3 };
/** 2막은 난간 높이라 그 너머로 우주가 펼쳐진다 */
const ACT2: Profile = { halfWidth: 4.5, height: 1.4 };
/** 3막 진입부터 전시실까지의 짧은 통로 */
const VESTIBULE: Profile = { halfWidth: 3, height: 1.4 };
/** 막 경계에서 폭과 높이가 바뀌는 구간의 반(m). 렌더 단계 경계와 같은 자리에서 넓어진다 */
const PROFILE_BLEND = 1.5;
const SAMPLE_STEP = 0.5;

/** 회랑이 시작하는 자리(s). 입구의 카메라(s=0) 뒤로 조금 더 이어진다 */
export const CORRIDOR_START = -3;

export const HALL = {
  radius: 11,
  height: 8,
  /** 천장 가운데 뚫린 구멍의 반지름 */
  oculus: 5,
  columnRadius: 9.6,
} as const;

/** 거리 s에서 회랑의 반폭과 높이 */
export function corridorProfile(s: number): Profile {
  const toAct2 = smoothstep(STAGE_EDGES[0] - PROFILE_BLEND, STAGE_EDGES[0] + PROFILE_BLEND, s);
  const toVestibule = smoothstep(STAGE_EDGES[1] - PROFILE_BLEND, STAGE_EDGES[1] + PROFILE_BLEND, s);
  const mix = (key: keyof Profile) =>
    ACT1[key] + (ACT2[key] - ACT1[key]) * toAct2 + (VESTIBULE[key] - ACT2[key]) * toVestibule;
  return { halfWidth: mix("halfWidth"), height: mix("height") };
}

/** 회랑 바닥 중심과, 걷는 방향 기준 오른쪽을 가리키는 수평 단위 벡터 */
export function frameAt(s: number): { center: Vec3; right: Vec3; tangent: Vec3 } {
  const [x, , z] = pathPoint(s);
  const [x0, , z0] = pathPoint(s - 0.01);
  const [x1, , z1] = pathPoint(s + 0.01);
  const length = Math.hypot(x1 - x0, z1 - z0);
  const tx = (x1 - x0) / length;
  const tz = (z1 - z0) / length;
  return { center: [x, 0, z], right: [-tz, 0, tx], tangent: [tx, 0, tz] };
}

const HALL_CENTER = hallCenter();

function distanceToHall(s: number): number {
  const { center } = frameAt(s);
  return Math.hypot(center[0] - HALL_CENTER[0], center[2] - HALL_CENTER[2]);
}

/** 회랑이 전시실 벽에 닿는 자리(s). 이분법으로 찾는다 */
export const CORRIDOR_END = (() => {
  let low = STAGE_EDGES[1];
  let high = STAGE_EDGES[1] + 2 * HALL.radius;
  for (let i = 0; i < 40; i++) {
    const mid = (low + high) / 2;
    if (distanceToHall(mid) > HALL.radius) low = mid;
    else high = mid;
  }
  return high;
})();

/** 전시실 중심에서 문(회랑이 들어오는 쪽)을 향한 각도. 방향은 (sin θ, cos θ)다 */
export const HALL_DOOR_ANGLE = (() => {
  const { center } = frameAt(CORRIDOR_END);
  return Math.atan2(center[0] - HALL_CENTER[0], center[2] - HALL_CENTER[2]);
})();

/** 문 너비의 반(라디안). 통로 폭이 그대로 들어온다 */
export const HALL_DOOR_HALF_ANGLE = Math.asin(VESTIBULE.halfWidth / HALL.radius);

/** 회랑 띠가 전시실 바닥 안으로 조금 들어가 이음매가 벌어지지 않게 한다 */
const CORRIDOR_OVERLAP = 0.3;

function samples(): number[] {
  const end = CORRIDOR_END + CORRIDOR_OVERLAP;
  const list: number[] = [];
  for (let s = CORRIDOR_START; s < end; s += SAMPLE_STEP) list.push(s);
  list.push(end);
  return list;
}

class MeshBuilder {
  private positions: number[] = [];
  private normals: number[] = [];
  private uvs: number[] = [];
  private indices: number[] = [];

  vertex(position: Vec3, normal: Vec3, uv: [number, number]): number {
    this.positions.push(...position);
    this.normals.push(...normal);
    this.uvs.push(...uv);
    return this.positions.length / 3 - 1;
  }

  triangle(a: number, b: number, c: number): void {
    this.indices.push(a, b, c);
  }

  build(): MeshData {
    return {
      positions: new Float32Array(this.positions),
      normals: new Float32Array(this.normals),
      uvs: new Float32Array(this.uvs),
      indices: new Uint32Array(this.indices),
    };
  }
}

function offset(point: Vec3, direction: Vec3, distance: number, y = point[1]): Vec3 {
  return [point[0] + direction[0] * distance, y, point[2] + direction[2] * distance];
}

/** 회랑 바닥. UV는 (중심에서 옆으로 떨어진 거리, s) */
export function floorStrip(): MeshData {
  const mesh = new MeshBuilder();
  const up: Vec3 = [0, 1, 0];
  let previous: [number, number] | null = null;
  for (const s of samples()) {
    const { center, right } = frameAt(s);
    const { halfWidth } = corridorProfile(s);
    const left = mesh.vertex(offset(center, right, -halfWidth), up, [-halfWidth, s]);
    const rightIndex = mesh.vertex(offset(center, right, halfWidth), up, [halfWidth, s]);
    if (previous) {
      const [l0, r0] = previous;
      mesh.triangle(l0, r0, left);
      mesh.triangle(r0, rightIndex, left);
    }
    previous = [left, rightIndex];
  }
  return mesh.build();
}

/** 회랑 벽. side는 걷는 방향 기준 왼쪽(-1)·오른쪽(1)이고, 면은 회랑 안쪽을 본다. UV는 (s, 높이) */
export function wallStrip(side: -1 | 1): MeshData {
  const mesh = new MeshBuilder();
  let previous: [number, number] | null = null;
  for (const s of samples()) {
    const { center, right } = frameAt(s);
    const { halfWidth, height } = corridorProfile(s);
    const base = offset(center, right, side * halfWidth);
    const inward: Vec3 = [-side * right[0], 0, -side * right[2]];
    const bottom = mesh.vertex(base, inward, [s, 0]);
    const top = mesh.vertex([base[0], height, base[2]], inward, [s, height]);
    if (previous) {
      const [b0, t0] = previous;
      if (side === 1) {
        mesh.triangle(b0, t0, bottom);
        mesh.triangle(t0, top, bottom);
      } else {
        mesh.triangle(b0, bottom, t0);
        mesh.triangle(t0, bottom, top);
      }
    }
    previous = [bottom, top];
  }
  return mesh.build();
}

function direction(angle: number): Vec3 {
  return [Math.sin(angle), 0, Math.cos(angle)];
}

const HALL_SEGMENTS = 72;

/** 전시실 바닥. 회랑 바닥과 겹치는 문턱에서 깜빡이지 않게 1cm 높다. UV는 중심에서 잰 (x, z) */
export function hallFloor(): MeshData {
  const mesh = new MeshBuilder();
  const up: Vec3 = [0, 1, 0];
  const y = 0.01;
  const center = mesh.vertex([HALL_CENTER[0], y, HALL_CENTER[2]], up, [0, 0]);
  const rim: number[] = [];
  for (let j = 0; j < HALL_SEGMENTS; j++) {
    const out = direction((2 * Math.PI * j) / HALL_SEGMENTS);
    const point = offset(HALL_CENTER, out, HALL.radius, y);
    rim.push(mesh.vertex(point, up, [point[0] - HALL_CENTER[0], point[2] - HALL_CENTER[2]]));
  }
  for (let j = 0; j < HALL_SEGMENTS; j++) mesh.triangle(center, rim[j], rim[(j + 1) % HALL_SEGMENTS]);
  return mesh.build();
}

/** 가운데가 뚫린 고리 천장. 아래(전시실 안)를 본다. 위에서 내려다보는 엔딩에서도 보이도록 장면이 양면으로 그린다 */
export function hallRoof(): MeshData {
  const mesh = new MeshBuilder();
  const down: Vec3 = [0, -1, 0];
  const outer = HALL.radius + 0.3;
  const inner: number[] = [];
  const rim: number[] = [];
  for (let j = 0; j < HALL_SEGMENTS; j++) {
    const out = direction((2 * Math.PI * j) / HALL_SEGMENTS);
    const a = offset(HALL_CENTER, out, HALL.oculus, HALL.height);
    const b = offset(HALL_CENTER, out, outer, HALL.height);
    inner.push(mesh.vertex(a, down, [a[0] - HALL_CENTER[0], a[2] - HALL_CENTER[2]]));
    rim.push(mesh.vertex(b, down, [b[0] - HALL_CENTER[0], b[2] - HALL_CENTER[2]]));
  }
  for (let j = 0; j < HALL_SEGMENTS; j++) {
    const next = (j + 1) % HALL_SEGMENTS;
    mesh.triangle(inner[j], inner[next], rim[j]);
    mesh.triangle(rim[j], inner[next], rim[next]);
  }
  return mesh.build();
}

const RIB_THICKNESS = 0.08;
const RIB_SPACING = 2;
const LINTEL_HEIGHT = 2.7;

/** 상자의 x축을 수평 방향 axis에 맞추는 y축 회전 */
function yawAlong(axis: Vec3): number {
  return Math.atan2(-axis[2], axis[0]);
}

/** 1막의 낮은 문틀(기둥 둘과 인방 하나). 2막으로 넓어지기 전까지 RIB_SPACING마다 선다 */
export function ribInstances(): Instance[] {
  const list: Instance[] = [];
  const last = STAGE_EDGES[0] - PROFILE_BLEND - 0.5;
  for (let s = 1; s <= last; s += RIB_SPACING) {
    const { center, right } = frameAt(s);
    const { halfWidth } = corridorProfile(s);
    const yaw = yawAlong(right);
    const inset = halfWidth - RIB_THICKNESS / 2;
    for (const side of [-1, 1]) {
      list.push({
        position: offset(center, right, side * inset, LINTEL_HEIGHT / 2),
        rotationY: yaw,
        scale: [RIB_THICKNESS, LINTEL_HEIGHT, RIB_THICKNESS],
      });
    }
    list.push({
      position: offset(center, right, 0, LINTEL_HEIGHT + RIB_THICKNESS / 2),
      rotationY: yaw,
      scale: [2 * halfWidth, RIB_THICKNESS, RIB_THICKNESS],
    });
  }
  return list;
}

const FRAME_SIZE = 1.6;
const FRAME_BAR = 0.06;
const FRAME_CENTER_HEIGHT = 1.3;

/** 1막 프로젝트 오브젝트 뒤 벽에 걸린 액자(막대 넷). 지나가며 보는 벽면 전시다 */
export function wallFrameInstances(): Instance[] {
  const list: Instance[] = [];
  for (const stop of STOPS) {
    if (stop.kind !== "project" || stop.act !== 1) continue;
    const focus = focusPoint(stop);
    if (!focus) continue;
    const s = -focus[2];
    const { center, right, tangent } = frameAt(s);
    const { halfWidth } = corridorProfile(s);
    const middle = offset(center, right, objectSide(stop) * (halfWidth - 0.04), FRAME_CENTER_HEIGHT);
    const yaw = yawAlong(tangent);
    const half = FRAME_SIZE / 2;
    const span = FRAME_SIZE + FRAME_BAR;
    list.push({ position: [middle[0], middle[1] + half, middle[2]], rotationY: yaw, scale: [span, FRAME_BAR, 0.04] });
    list.push({ position: [middle[0], middle[1] - half, middle[2]], rotationY: yaw, scale: [span, FRAME_BAR, 0.04] });
    list.push({ position: offset(middle, tangent, half), rotationY: yaw, scale: [FRAME_BAR, FRAME_SIZE, 0.04] });
    list.push({ position: offset(middle, tangent, -half), rotationY: yaw, scale: [FRAME_BAR, FRAME_SIZE, 0.04] });
  }
  return list;
}

const PLINTH = { radius: 0.7, height: 0.8 } as const;

/** 2막 전시 구역의 받침대. 오브젝트(focusPoint) 바로 아래에 선다 */
export function plinthInstances(): Instance[] {
  const list: Instance[] = [];
  for (const stop of STOPS) {
    if (stop.kind !== "project" || stop.act !== 2) continue;
    const focus = focusPoint(stop);
    if (!focus) continue;
    list.push({
      position: [focus[0], PLINTH.height / 2, focus[2]],
      rotationY: 0,
      scale: [PLINTH.radius, PLINTH.height, PLINTH.radius],
    });
  }
  return list;
}

const COLUMN_RADIUS = 0.35;
const COLUMN_COUNT = 12;

/** 전시실 둘레의 기둥. 문 앞은 비운다 */
export function columnInstances(): Instance[] {
  const list: Instance[] = [];
  for (let j = 0; j < COLUMN_COUNT; j++) {
    const angle = HALL_DOOR_ANGLE + Math.PI / COLUMN_COUNT + (2 * Math.PI * j) / COLUMN_COUNT;
    const fromDoor = Math.abs(Math.atan2(Math.sin(angle - HALL_DOOR_ANGLE), Math.cos(angle - HALL_DOOR_ANGLE)));
    if (fromDoor < HALL_DOOR_HALF_ANGLE + 0.2) continue;
    list.push({
      position: offset(HALL_CENTER, direction(angle), HALL.columnRadius, (HALL.height - 0.05) / 2),
      rotationY: 0,
      // 천장 고리와 윗면이 겹쳐 깜빡이지 않게 조금 낮다
      scale: [COLUMN_RADIUS, HALL.height - 0.05, COLUMN_RADIUS],
    });
  }
  return list;
}

/** 전시실 가운데 낮은 단. PiCKCARE 오브젝트가 그 위에 뜬다 */
export function daisInstance(): Instance {
  const height = 0.25;
  return { position: [HALL_CENTER[0], 0.01 + height / 2, HALL_CENTER[2]], rotationY: 0, scale: [2.6, height, 2.6] };
}
