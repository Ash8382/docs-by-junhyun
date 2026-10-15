/**
 * 여정의 정류장 목록. 본문 섹션 높이, 스크롤 구간, 카메라 경로가 모두 여기서 나온다.
 * 같은 목록에서 계산하므로 3D 장면과 글의 위치가 어긋날 수 없다. (스펙 2절 "정류장과 스크롤 배분")
 */

export type Vec3 = [number, number, number];

export type StopKind = "intro" | "act" | "project" | "hall" | "ending";

export interface Stop {
  /** 본문 섹션 id는 `stop-${id}`다. */
  id: string;
  kind: StopKind;
  /** 0은 막 밖(입구·엔딩) */
  act: 0 | 1 | 2 | 3;
  /** 스크롤 길이(화면 높이 단위) */
  length: number;
  /** 화면 고정 구간인가. 본문 패널이 머물고 카메라는 걸어 들어가 멈춘 뒤 오브젝트를 본다. */
  pin: boolean;
  slug?: string;
}

export interface StopRange {
  stop: Stop;
  index: number;
  /** 0~1 진행률 */
  start: number;
  end: number;
}

export interface CameraPose {
  position: Vec3;
  target: Vec3;
}

export const STOPS: Stop[] = [
  { id: "intro", kind: "intro", act: 0, length: 1, pin: false },
  { id: "act-1", kind: "act", act: 1, length: 0.5, pin: false },
  { id: "kokoa-clone", kind: "project", act: 1, length: 1, pin: false, slug: "kokoa-clone" },
  { id: "todo-app", kind: "project", act: 1, length: 1, pin: false, slug: "todo-app" },
  { id: "eutcha", kind: "project", act: 1, length: 1, pin: false, slug: "eutcha" },
  { id: "act-2", kind: "act", act: 2, length: 0.5, pin: false },
  { id: "stock2u", kind: "project", act: 2, length: 2, pin: true, slug: "stock2u" },
  { id: "tix2u", kind: "project", act: 2, length: 2, pin: true, slug: "tix2u" },
  { id: "pfplay", kind: "project", act: 2, length: 2, pin: true, slug: "pfplay" },
  { id: "act-3", kind: "act", act: 3, length: 0.5, pin: false },
  { id: "pickcare", kind: "hall", act: 3, length: 5, pin: true, slug: "pickcare" },
  { id: "ending", kind: "ending", act: 0, length: 2, pin: false },
];

/** 본문 전체 높이(화면 단위) */
export const TOTAL_LENGTH = STOPS.reduce((sum, stop) => sum + stop.length, 0);

/**
 * 실제로 스크롤할 수 있는 길이. 본문 맨 아래가 화면 아래에 닿으면 끝나므로 화면 하나만큼 짧다.
 * 그래서 마지막 정류장(엔딩)은 길이에서 화면 하나를 빼고 구간을 잡는다.
 */
export const SCROLL_LENGTH = TOTAL_LENGTH - 1;

export const STOP_RANGES: StopRange[] = (() => {
  let offset = 0;
  return STOPS.map((stop, index) => {
    const span = index === STOPS.length - 1 ? stop.length - 1 : stop.length;
    const range = { stop, index, start: offset / SCROLL_LENGTH, end: (offset + span) / SCROLL_LENGTH };
    offset += span;
    return range;
  });
})();

export function rangeOf(id: string): StopRange {
  const range = STOP_RANGES.find((item) => item.stop.id === id);
  if (!range) throw new Error(`정류장이 없습니다: ${id}`);
  return range;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function lerp3(a: Vec3, b: Vec3, t: number): Vec3 {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function stopAt(progress: number): { range: StopRange; t: number } {
  const p = clamp01(progress);
  const range = STOP_RANGES.find((item) => p < item.end) ?? STOP_RANGES[STOP_RANGES.length - 1];
  const t = range.end > range.start ? (p - range.start) / (range.end - range.start) : 0;
  return { range, t: clamp01(t) };
}

// ── 카메라 경로 ──────────────────────────────────────────────
// 회랑은 -z 방향으로 뻗고 x가 완만하게 휜다. s는 입구에서 회랑을 따라 나아간 거리다.

/** 고정이 아닌 정류장에서 화면 한 높이만큼 스크롤할 때 카메라가 나아가는 거리 */
const UNITS_PER_SCREEN = 4;
/** 고정 정류장은 길이의 절반만큼만 나아간다. 걸어 들어와 멈추고, 보고, 걸어 나간다. */
const PIN_TRAVEL = 0.5;
const EYE_HEIGHT = 1.6;
/** 3D 장면의 세로 시야각(도). 엔딩 시점이 회랑 전체를 담는지 테스트가 이 값으로 확인한다. */
export const CAMERA_FOV = 50;
const LOOK_AHEAD = 6;
/** 고정 구간에서 카메라가 오브젝트 주위를 도는 각도(라디안) */
const ORBIT = 0.35;

function corridorX(z: number): number {
  return 1.5 * Math.sin(z / 18);
}

export function pathPoint(s: number): Vec3 {
  const z = -s;
  return [corridorX(z), EYE_HEIGHT, z];
}

const PATH_SPANS: { from: number; to: number }[] = (() => {
  let s = 0;
  return STOPS.map((stop) => {
    const from = s;
    if (stop.kind !== "ending") s += stop.length * UNITS_PER_SCREEN * (stop.pin ? PIN_TRAVEL : 1);
    return { from, to: s };
  });
})();

export const PATH_LENGTH = PATH_SPANS[PATH_SPANS.length - 1].to;

/** 정류장이 회랑을 따라 차지하는 거리 구간(s). 렌더 단계 경계와 회랑 도형이 이 값으로 자리를 잡는다. */
export function pathSpan(id: string): { from: number; to: number } {
  return PATH_SPANS[rangeOf(id).index];
}

/** p(0)=0, p(1)=1, p'(0)=1, p'(1)=0. 걷던 속도 그대로 들어와 멈춘다. */
function arrive(u: number): number {
  const x = clamp01(u);
  return x + x * x - x * x * x;
}

/**
 * 고정 구간의 진행: 앞 1/4에 반을 걷고, 가운데 절반은 멈추고, 뒤 1/4에 나머지 반을 걷는다.
 * 걷는 구간은 이웃 정류장과 같은 속도(화면당 UNITS_PER_SCREEN)로 이어져 경계에서 카메라가 멈칫하지 않는다.
 * 다음 정류장이 제자리에 머무는 엔딩이면 멈추며 나간다.
 */
function dwell(t: number, exitsWalking: boolean): number {
  if (t < 0.25) return 0.5 * arrive(t / 0.25);
  if (t > 0.75) {
    const u = (t - 0.75) / 0.25;
    return 0.5 + 0.5 * (exitsWalking ? 1 - arrive(1 - u) : smoothstep(0, 1, u));
  }
  return 0.5;
}

/** 고정 구간에서 오브젝트를 보는 정도. 양 끝에서 0이라 앞뒤 정류장과 자연스럽게 이어진다. */
function pinWeight(t: number): number {
  return smoothstep(0, 0.25, t) * (1 - smoothstep(0.75, 1, t));
}

export function pathParamAt(progress: number): number {
  const { range, t } = stopAt(progress);
  const span = PATH_SPANS[range.index];
  const next = STOPS[range.index + 1];
  const k = range.stop.pin ? dwell(t, next !== undefined && next.kind !== "ending") : t;
  return span.from + (span.to - span.from) * k;
}

const PROJECT_STOPS = STOPS.filter((stop) => stop.kind === "project");

/** 프로젝트 오브젝트가 회랑의 어느 쪽에 서는가. 프로젝트 순서대로 왼쪽(-1)·오른쪽(1)을 번갈아 쓴다. 본문 패널은 반대편에 둔다. */
export function objectSide(stop: Stop): -1 | 1 {
  return PROJECT_STOPS.indexOf(stop) % 2 === 0 ? -1 : 1;
}

/**
 * 프로젝트 오브젝트가 서는 위치. 좌우는 objectSide가 정한다.
 */
export function focusPoint(stop: Stop): Vec3 | null {
  const span = PATH_SPANS[STOPS.indexOf(stop)];
  const [x, , z] = pathPoint((span.from + span.to) / 2);
  if (stop.kind === "hall") return [corridorX(z - 8), 1.8, z - 8];
  if (stop.kind !== "project") return null;
  const side = objectSide(stop);
  if (stop.act === 1) return [x + side * 1.8, 1.3, z];
  return [x + side * 2.6, 1.4, z - 3.5];
}

function rotateAround(point: Vec3, center: Vec3, angle: number): Vec3 {
  const dx = point[0] - center[0];
  const dz = point[2] - center[2];
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [center[0] + dx * cos - dz * sin, point[1], center[2] + dx * sin + dz * cos];
}

/** PiCKCARE 원형 전시실의 바닥 중심. 전시실 오브젝트(focusPoint)가 이 위에 뜬다. */
export function hallCenter(): Vec3 {
  const focus = focusPoint(rangeOf("pickcare").stop);
  if (!focus) throw new Error("전시실 정류장에 오브젝트 위치가 없습니다");
  return [focus[0], 0, focus[2]];
}

/**
 * 엔딩: 위로 빠지며 회랑 전체를 내려다보는 자리. 회랑 입구부터 전시실 지붕 끝까지가 헤더 아래에 들고,
 * 넓은 화면에서는 오른쪽 연락처 패널의 왼쪽에 놓인다(timeline.test.ts가 화면 비율 넷으로 확인).
 */
const OVERVIEW_POSITION: Vec3 = [12, 78, 6];
const OVERVIEW_TARGET: Vec3 = [8, 0, -26];

/**
 * 엔딩 구간의 이만큼에서 내려다보기를 마친다. 연락처 패널은 엔딩 섹션 끝에 있어 구간 후반에 화면으로 올라오므로,
 * 휴대폰처럼 패널이 전체 폭인 화면에서도 패널이 덮기 전에 회랑 전체를 먼저 보인다.
 */
export const OVERVIEW_ARRIVAL = 0.45;

/** 엔딩에서 내려다보는 정도(0~1). 카메라와 분위기가 같은 값을 쓴다 */
export function overviewWeight(progress: number): number {
  const { range, t } = stopAt(progress);
  return range.stop.kind === "ending" ? smoothstep(0, OVERVIEW_ARRIVAL, t) : 0;
}

export function cameraAt(progress: number): CameraPose {
  const { range, t } = stopAt(progress);
  const s = pathParamAt(progress);
  const base = pathPoint(s);
  const ahead = pathPoint(s + LOOK_AHEAD);
  const stop = range.stop;

  if (stop.kind === "ending") {
    const k = overviewWeight(progress);
    return { position: lerp3(base, OVERVIEW_POSITION, k), target: lerp3(ahead, OVERVIEW_TARGET, k) };
  }

  const focus = stop.pin ? focusPoint(stop) : null;
  if (!focus) return { position: base, target: ahead };

  const w = pinWeight(t);
  const orbit = rotateAround(base, focus, (t - 0.5) * ORBIT);
  return { position: lerp3(base, orbit, w), target: lerp3(ahead, focus, w) };
}
