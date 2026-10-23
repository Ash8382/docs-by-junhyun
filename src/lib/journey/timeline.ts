/**
 * 여정의 정류장 목록. 본문 섹션 높이, 스크롤 구간, 차가 도로를 따라 나아가는 거리가 모두 여기서 나온다.
 * 같은 목록에서 계산하므로 3D 장면과 글의 위치가 어긋날 수 없다. (스펙 2절 "정류장과 스크롤 배분")
 * 도로의 모양과 차·카메라 자세는 drive.ts가 이 진행 거리로 계산한다.
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
  /** 화면 고정 구간인가. 본문 패널이 머물고 차는 들어와 멈춘 뒤 다시 출발한다. */
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

export function stopAt(progress: number): { range: StopRange; t: number } {
  const p = clamp01(progress);
  const range = STOP_RANGES.find((item) => p < item.end) ?? STOP_RANGES[STOP_RANGES.length - 1];
  const t = range.end > range.start ? (p - range.start) / (range.end - range.start) : 0;
  return { range, t: clamp01(t) };
}

// ── 진행 거리 ──────────────────────────────────────────────
// s는 출발선에서 나아간 거리(경로 단위)다. drive.ts가 도로 미터(ROAD_SCALE)로 바꾼다.

/** 고정이 아닌 정류장에서 화면 한 높이만큼 스크롤할 때 나아가는 거리(정속) */
export const UNITS_PER_SCREEN = 4;
/** 고정 정류장은 길이의 절반만큼만 나아간다. 들어와 멈추고, 머물고, 다시 출발한다. */
const PIN_TRAVEL = 0.5;
/** 3D 장면의 세로 시야각(도). 엔딩 시점이 도로 전체를 담는지 테스트가 이 값으로 확인한다. */
export const CAMERA_FOV = 50;

const PATH_SPANS: { from: number; to: number }[] = (() => {
  let s = 0;
  return STOPS.map((stop) => {
    const from = s;
    if (stop.kind !== "ending") s += stop.length * UNITS_PER_SCREEN * (stop.pin ? PIN_TRAVEL : 1);
    return { from, to: s };
  });
})();

export const PATH_LENGTH = PATH_SPANS[PATH_SPANS.length - 1].to;

/** 정류장이 경로에서 차지하는 거리 구간(s, 경로 단위). 도로 폭·색의 전환 자리가 이 값으로 정해진다. */
export function pathSpan(id: string): { from: number; to: number } {
  return PATH_SPANS[rangeOf(id).index];
}

/** p(0)=0, p(1)=1, p'(0)=1, p'(1)=0. 달리던 속도 그대로 들어와 멈춘다. */
function arrive(u: number): number {
  const x = clamp01(u);
  return x + x * x - x * x * x;
}

/** arrive를 뒤집은 출발: p(0)=0, p(1)=1, p'(0)=0, p'(1)=1. 서 있다가 정속까지 붙는다. */
function depart(u: number): number {
  return 1 - arrive(1 - u);
}

/**
 * 고정 구간의 진행: 앞 1/4에 반을 달리고, 가운데 절반은 멈추고, 뒤 1/4에 나머지 반을 달린다.
 * 달리는 구간은 이웃 정류장과 같은 속도(화면당 UNITS_PER_SCREEN)로 이어져 경계에서 차가 멈칫하지 않는다.
 * 다음 정류장이 제자리에 머무는 엔딩이면 멈추며 나간다.
 */
function dwell(t: number, exitsDriving: boolean): number {
  if (t < 0.25) return 0.5 * arrive(t / 0.25);
  if (t > 0.75) {
    const u = (t - 0.75) / 0.25;
    return 0.5 + 0.5 * (exitsDriving ? depart(u) : smoothstep(0, 1, u));
  }
  return 0.5;
}

/** 고정 구간에서 멈춰 머무는 정도(0~1). 양 끝에서 0이라 앞뒤 정류장과 자연스럽게 이어진다. 카메라가 이 값으로 정류장 시점으로 돈다. */
export function dwellWeight(progress: number): number {
  const { range, t } = stopAt(progress);
  if (!range.stop.pin) return 0;
  return smoothstep(0, 0.25, t) * (1 - smoothstep(0.75, 1, t));
}

/**
 * PiCKCARE 전시실에서 카메라가 정류장 시점으로 도는 구간(앞뒤, 구간 비율). 다섯 화면에 걸친 저장소 패널이 각자 보이는 동안
 * 홀로그램 줄이 화면에 있도록 다른 고정 정류장(1/4)보다 일찍 돌고 늦게 돌아온다(스펙 3절 "카메라", 2-3a). 차의 움직임은 그대로다.
 */
export const HALL_VIEW_EDGE = 0.12;

/**
 * PiCKCARE 저장소 패널이 지나가는 구간(화면): 구역 위에서 HALL_REPO_START만큼 늦게 시작하고 아래에서 HALL_REPO_END만큼 일찍 끝난다
 * (스펙 3절 "PiCKCARE 앞줄", 2026-10-16). 홀로그램 줄은 정류장에 고정돼 있고 카메라는 지금 차를 돌아보므로, 차가 들어오는 동안은 줄이
 * 오른쪽 패널 쪽으로, 떠나는 동안은 왼쪽 소개 패널 쪽으로 밀린다. 첫 저장소와 마지막 저장소를 읽는 동안 그 홀로그램이 제자리에 서도록
 * 패널을 차가 거의 다 들어온 뒤부터 떠나기 시작할 때까지 둔다. 네 화면 크기에서 실제 빌드를 재 정했다.
 * 본문 배치(JourneyContent)와 앞줄 판정(pickcareFront)이 같이 쓴다.
 */
export const HALL_REPO_START = 1.2;
export const HALL_REPO_END = 0.7;

/** PiCKCARE 저장소 진행률(0~1): 저장소 패널 구간 안의 위치. 구간 앞은 0, 뒤는 1이다 */
export function hallRepoProgress(progress: number): number {
  const range = rangeOf("pickcare");
  const screens = ((progress - range.start) / (range.end - range.start)) * range.stop.length;
  return clamp01((screens - HALL_REPO_START) / (range.stop.length - HALL_REPO_START - HALL_REPO_END));
}

/** 카메라가 정류장 시점으로 도는 정도(0~1). 프로젝트 정류장은 머무는 정도(dwellWeight)와 같고, PiCKCARE는 구간 앞뒤 12%에서 돈다 */
export function viewWeight(progress: number): number {
  const { range, t } = stopAt(progress);
  if (range.stop.kind === "hall") return smoothstep(0, HALL_VIEW_EDGE, t) * (1 - smoothstep(1 - HALL_VIEW_EDGE, 1, t));
  return dwellWeight(progress);
}

/** 진행률의 경로 거리. 입구에서는 출발선에 서 있다가 출발하고(스펙 2절 "차가 출발선에 서 있다"), 고정 구간에서는 멈춘다. */
export function pathParamAt(progress: number): number {
  const { range, t } = stopAt(progress);
  const span = PATH_SPANS[range.index];
  const next = STOPS[range.index + 1];
  let k = t;
  if (range.stop.kind === "intro") k = depart(t);
  else if (range.stop.pin) k = dwell(t, next !== undefined && next.kind !== "ending");
  return span.from + (span.to - span.from) * k;
}

const PROJECT_STOPS = STOPS.filter((stop) => stop.kind === "project");

/** 프로젝트의 제품 화면(2-3)이 화면의 어느 쪽에 서는가. 프로젝트 순서대로 왼쪽(-1)·오른쪽(1)을 번갈아 쓴다. 본문 패널은 반대편에 둔다. */
export function objectSide(stop: Stop): -1 | 1 {
  return PROJECT_STOPS.indexOf(stop) % 2 === 0 ? -1 : 1;
}

/**
 * 엔딩 구간의 이만큼에서 내려다보기를 마친다. 연락처 패널은 엔딩 섹션 끝에 있어 구간 후반에 화면으로 올라오므로,
 * 휴대폰처럼 패널이 전체 폭인 화면에서도 패널이 덮기 전에 길 전체를 먼저 보인다.
 */
export const OVERVIEW_ARRIVAL = 0.45;

/** 엔딩에서 내려다보는 정도(0~1). 카메라·분위기·길 전체 발광이 같은 값을 쓴다 */
export function overviewWeight(progress: number): number {
  const { range, t } = stopAt(progress);
  return range.stop.kind === "ending" ? smoothstep(0, OVERVIEW_ARRIVAL, t) : 0;
}

/** 엔딩 구간에서 목표 상태(흰 점으로 다가간 자리)에 닿는 곳. 그 뒤로 장면은 바뀌지 않고, 이름과 직무가 시간으로 나타난다 */
export const ENDING_ARRIVAL = 0.9;

/**
 * 엔딩 단계(병합 뒤, 사용자 결정 "여정이 하나의 빛이 되다"). 엔딩 구간 안 위치 t에서 모두 0 → 1이고 진행률에 대해 줄지 않는다(되감으면 거꾸로).
 * - rise: 카메라가 올라가 길 전체를 내려다본다(overviewWeight와 같다). 분위기·길 전체 발광도 이 값이다
 * - fade: 차·풍경·홀로그램 원반이 사라진다
 * - line: 길이 차선 무늬 없는 가는 빛줄기 하나로 좁아진다
 * - flow: 빛이 출발점부터 길 끝으로 흘러 짧아지고, 카메라는 길 끝으로 다가간다
 * - point: 길 끝에 작고 밝은 흰 점이 생긴다
 * - arrived: 목표 상태(ENDING_ARRIVAL 이후)
 */
export interface EndingPhases {
  rise: number;
  fade: number;
  line: number;
  flow: number;
  point: number;
  arrived: boolean;
}

/** 단계마다 엔딩 구간 안의 시작·끝(t) */
export const ENDING_WINDOWS = {
  fade: [0.05, 0.35],
  line: [0.2, OVERVIEW_ARRIVAL],
  flow: [OVERVIEW_ARRIVAL, 0.8],
  point: [0.72, 0.85],
} as const;

export function endingPhases(progress: number): EndingPhases {
  const { range, t } = stopAt(progress);
  if (range.stop.kind !== "ending") return { rise: 0, fade: 0, line: 0, flow: 0, point: 0, arrived: false };
  const phase = ([from, to]: readonly [number, number]) => smoothstep(from, to, t);
  return {
    rise: smoothstep(0, OVERVIEW_ARRIVAL, t),
    fade: phase(ENDING_WINDOWS.fade),
    line: phase(ENDING_WINDOWS.line),
    flow: phase(ENDING_WINDOWS.flow),
    point: phase(ENDING_WINDOWS.point),
    arrived: t >= ENDING_ARRIVAL,
  };
}
