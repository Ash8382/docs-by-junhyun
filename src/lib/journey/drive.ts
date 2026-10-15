import { damp } from "./damp";
import {
  PATH_LENGTH,
  SCROLL_LENGTH,
  STOP_RANGES,
  UNITS_PER_SCREEN,
  dwellWeight,
  objectSide,
  overviewWeight,
  pathParamAt,
  pathSpan,
  smoothstep,
  stopAt,
  type Stop,
  type Vec3,
} from "./timeline";

/**
 * 우주 도로와 driveAt(p)(스펙 3절 "진행률 하나"). 스크롤 진행률 하나에서 차의 자리, 열린 길의 끝, 카메라 목표를 계산한다.
 * 프레임마다 쌓는 값이 없어 같은 p면 같은 결과다. three를 import하지 않는 순수 코드다.
 *
 * 도로는 −z 쪽으로 뻗고, x로 굽이치며 y로 오르내린다. s는 도로 중심선을 따라 누적한 거리(m)이고,
 * 좌우 가장자리도 같은 s를 쓴다. 중심선은 매끄러운 해석 곡선이라 위치·접선·곡률·뱅킹이 모두 이어진다.
 */

/** 경로 단위(timeline.ts) 하나가 도로에서 차지하는 거리(m) */
export const ROAD_SCALE = 5;
/** 차가 마지막으로 서는 자리(m). PiCKCARE를 지나 엔딩에서 멈춘다 */
export const CAR_END = PATH_LENGTH * ROAD_SCALE;
/** 도로 시작. 출발선(s = 0) 뒤로 카메라가 설 자리를 둔다 */
export const ROAD_START = -12;
/** 도로 끝. 차가 멈춘 자리 너머로 열린 길이 더 이어진다 */
export const ROAD_END = CAR_END + 40;
/** 평소 열린 끝이 차 앞으로 앞서는 거리(m) */
export const REVEAL_LEAD = 30;
/** 열린 끝과 차 사이의 최소 간격(m). 차 길이(약 4.6m)의 2.5배 */
export const REVEAL_MIN_GAP = 12;
/** 차를 따라 열리는 끝과 정류장이 연 끝을 부드럽게 잇는 폭(m) */
const REVEAL_BLEND = 8;

/** 도로 폭(m): 1막 6m에서 2막에 넓어져 3막 16m */
export const ROAD_WIDTHS = [6, 10, 16] as const;
/** 길이 넓어지는 구간이 막 진입 정류장을 지나 이만큼(m) 더 이어진다 */
const WIDEN_TAIL = 20;
/** 뱅킹: 수평 곡률에 곱하는 값과 최대 기울기(라디안) */
const BANK_GAIN = 5;
export const BANK_LIMIT = 0.25;

export interface RoadFrame {
  /** 중심선 위 노면 자리 */
  position: Vec3;
  /** 나아가는 방향(단위 벡터) */
  tangent: Vec3;
  /** 뱅킹이 반영된 오른쪽(단위 벡터) */
  right: Vec3;
  /** 뱅킹이 반영된 노면 위쪽(단위 벡터) */
  up: Vec3;
  /** 뱅킹 각(라디안). 오른쪽으로 굽으면 오른쪽이 낮다(음수) */
  bank: number;
  /** 수평 곡률(1/m). 오른쪽으로 굽으면 양수 */
  curvature: number;
  width: number;
}

export interface CameraPose {
  position: Vec3;
  target: Vec3;
}

export interface DriveState {
  progress: number;
  /** 차가 선 자리(도로 s, m) */
  carS: number;
  /** 열린 길의 끝(도로 s, m) */
  revealS: number;
  /** 엔딩에서 길 전체가 켜지는 정도(0~1) */
  ending: number;
  /** 주행 속도(정속 = 1). 정류장에서 0 */
  speed: number;
  car: RoadFrame;
  camera: CameraPose;
}

// ── 벡터 ─────────────────────────────────────────────────

function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function scale(a: Vec3, k: number): Vec3 {
  return [a[0] * k, a[1] * k, a[2] * k];
}

function normalize(a: Vec3): Vec3 {
  return scale(a, 1 / Math.hypot(a[0], a[1], a[2]));
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function lerp(a: number, b: number, t: number): number {
  return a * (1 - t) + b * t;
}

function lerp3(a: Vec3, b: Vec3, t: number): Vec3 {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

// ── 중심선 ───────────────────────────────────────────────
// 설계 변수 u(대략 −z 거리)로 중심선을 정의하고, 호 길이 표로 s ↔ u를 바꾼다.

/** 0에서 1로 오르는 5차 곡선. 양 끝에서 1·2차 도함수가 0이라 곱해도 곡률이 끊기지 않는다 */
function smootherstep(edge0: number, edge1: number, value: number): number {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * t * (t * (6 * t - 15) + 10);
}

/** 출발선 근처는 곧게 뻗고 앞으로 갈수록 크게 굽이친다 */
function centerX(u: number): number {
  return smootherstep(0, 60, u) * (22 * Math.sin(u / 34 - 0.6) + 5 * Math.sin(u / 13 + 1.1) + 13);
}

/** 완만하게 오르내리며 조금씩 높아진다(3막 도시로 오른다) */
function centerY(u: number): number {
  return smootherstep(0, 60, u) * (2.5 * Math.sin(u / 23 - 1.4) + 2.4) + 0.035 * smootherstep(0, 120, u) * u;
}

const H = 0.01;

function derivative(f: (u: number) => number, u: number): number {
  return (f(u + H) - f(u - H)) / (2 * H);
}

function secondDerivative(f: (u: number) => number, u: number): number {
  return (f(u + H) - 2 * f(u) + f(u - H)) / (H * H);
}

const TABLE_STEP = 0.1;
const TABLE_U0 = ROAD_START - 4;
/** u → s 누적 호 길이 표(사다리꼴 적분). s(0) = 0이 되게 맞춘다 */
const ARC: Float64Array = (() => {
  const count = Math.ceil((ROAD_END + 20 - TABLE_U0) / TABLE_STEP) + 1;
  const table = new Float64Array(count);
  const speed = (u: number) => Math.hypot(derivative(centerX, u), derivative(centerY, u), 1);
  for (let i = 1; i < count; i++) {
    const u = TABLE_U0 + i * TABLE_STEP;
    table[i] = table[i - 1] + ((speed(u - TABLE_STEP) + speed(u)) / 2) * TABLE_STEP;
  }
  const zero = table[Math.round(-TABLE_U0 / TABLE_STEP)];
  for (let i = 0; i < count; i++) table[i] -= zero;
  return table;
})();

/** 도로 거리 s의 설계 변수 u. 표에서 이분 탐색한 뒤 칸 안을 선형으로 잇는다 */
function paramOf(s: number): number {
  let low = 0;
  let high = ARC.length - 1;
  if (s <= ARC[low]) return TABLE_U0;
  if (s >= ARC[high]) return TABLE_U0 + high * TABLE_STEP;
  while (high - low > 1) {
    const middle = (low + high) >> 1;
    if (ARC[middle] <= s) low = middle;
    else high = middle;
  }
  const t = (s - ARC[low]) / (ARC[high] - ARC[low]);
  return TABLE_U0 + (low + t) * TABLE_STEP;
}

/** 거리 s의 도로 폭(m). 2막·3막 진입 정류장에서 넓어지기 시작한다 */
export function roadWidth(s: number): number {
  const act2 = pathSpan("act-2");
  const act3 = pathSpan("act-3");
  const [first, second, third] = ROAD_WIDTHS;
  return (
    first +
    (second - first) * smoothstep(act2.from * ROAD_SCALE, act2.to * ROAD_SCALE + WIDEN_TAIL, s) +
    (third - second) * smoothstep(act3.from * ROAD_SCALE, act3.to * ROAD_SCALE + WIDEN_TAIL, s)
  );
}

/** 거리 s의 도로 자세. 접선은 해석 곡선의 도함수, 뱅킹은 수평 곡률에 비례한다 */
export function roadFrame(s: number): RoadFrame {
  const u = paramOf(s);
  const dx = derivative(centerX, u);
  const dy = derivative(centerY, u);
  const tangent = normalize([dx, dy, -1]);
  const curvature = secondDerivative(centerX, u) / Math.pow(1 + dx * dx, 1.5);
  const bank = Math.max(-BANK_LIMIT, Math.min(BANK_LIMIT, -BANK_GAIN * curvature));
  const flatRight = normalize([-tangent[2], 0, tangent[0]]);
  const flatUp = cross(flatRight, tangent);
  const cos = Math.cos(bank);
  const sin = Math.sin(bank);
  return {
    position: [centerX(u), centerY(u), -u],
    tangent,
    right: add(scale(flatRight, cos), scale(flatUp, sin)),
    up: add(scale(flatUp, cos), scale(flatRight, -sin)),
    bank,
    curvature,
    width: roadWidth(s),
  };
}

/** 도로 위 한 점: 중심선에서 옆으로 lateral(m, 오른쪽 +), 노면에서 height(m) */
export function roadPoint(s: number, lateral = 0, height = 0): Vec3 {
  const frame = roadFrame(s);
  return add(add(frame.position, scale(frame.right, lateral)), scale(frame.up, height));
}

// ── 차와 열린 길 ──────────────────────────────────────────

/** 진행률의 차 자리(도로 s, m) */
export function carSAt(progress: number): number {
  return pathParamAt(progress) * ROAD_SCALE;
}

const SPEED_STEP = 1e-4;

/** 진행률의 주행 속도(정속 = 1). 스크롤 속도가 아니라 진행률에서 정해지는 속도 곡선이다 */
export function speedAt(progress: number): number {
  const a = Math.max(0, progress - SPEED_STEP);
  const b = Math.min(1, progress + SPEED_STEP);
  const unitsPerScreen = ((pathParamAt(b) - pathParamAt(a)) / (b - a)) / SCROLL_LENGTH;
  return unitsPerScreen / UNITS_PER_SCREEN;
}

/** 길을 여는 정류장(프로젝트와 PiCKCARE). 지나는 동안 다음 정류장까지 길이 열린다 */
const OPENERS = STOP_RANGES.filter((range) => range.stop.kind === "project" || range.stop.kind === "hall");

/** 정류장 한가운데의 차 자리(m). 고정 구간이면 차가 멈춰 머무는 자리다 */
function anchorS(range: (typeof OPENERS)[number]): number {
  return carSAt((range.start + range.end) / 2);
}

/** 정류장 k를 지나면 열리는 끝: 다음 정류장 자리 + 앞서는 거리. 마지막은 도로 끝 */
const OPEN_TARGETS = OPENERS.map((_, index) =>
  index + 1 < OPENERS.length ? anchorS(OPENERS[index + 1]) + REVEAL_LEAD : ROAD_END,
);

/** 정류장이 연 끝(m). 정류장 구간 가운데 절반 동안 다음 정류장까지 부드럽게 열린다. 줄어들지 않는다 */
function openedS(progress: number): number {
  let opened = REVEAL_LEAD;
  OPENERS.forEach((range, index) => {
    const from = range.start + (range.end - range.start) * 0.25;
    const to = range.start + (range.end - range.start) * 0.75;
    const previous = index === 0 ? REVEAL_LEAD : OPEN_TARGETS[index - 1];
    opened += (OPEN_TARGETS[index] - previous) * smoothstep(from, to, progress);
  });
  return opened;
}

/** 두 값 중 큰 쪽을 부드럽게 고른다. 결과는 언제나 max(a, b) 이상이고 두 값에 대해 늘기만 한다 */
function softMax(a: number, b: number, width: number): number {
  return 0.5 * (a + b + Math.sqrt((a - b) * (a - b) + width * width));
}

/** 진행률의 열린 끝(m). 차를 따라 열리는 끝과 정류장이 연 끝 중 앞선 쪽이다 */
export function revealSAt(progress: number): number {
  return Math.min(ROAD_END, softMax(carSAt(progress) + REVEAL_LEAD, openedS(progress), REVEAL_BLEND));
}

// ── 카메라 ───────────────────────────────────────────────

/** 주행: 차 뒤·위에서 차 앞 도로를 본다 */
export const CHASE = { back: 7, height: 2.4, ahead: 10, aheadHeight: 0.8 } as const;
/** 카메라가 목표 자세를 따라가는 감쇠 세기(followCamera). 프레임 간격으로 계산해 60Hz·120Hz에서 같은 속도다 */
export const CAMERA_DAMPING = { position: 5, target: 6 } as const;
/**
 * 감쇠로 따라가는 카메라가 차 둘레(반지름 radius, m)와 노면에서 height(m) 아래로 들어가지 않게 하는 한계.
 * 빠르게 스크롤하면 감쇠가 주행 시점과 정류장 시점 사이를 곧게 가로질러 차에 붙을 수 있다.
 */
export const CAMERA_CLEARANCE = { radius: 4.2, height: 1.2 } as const;
/** 차 몸통의 가운데(차 자리 기준: 앞 0.24m, 위 0.7m). 모델은 앞이 더 길다(뒤 1.94, 앞 2.42) */
const CAR_BODY_CENTER = { forward: 0.24, up: 0.7 } as const;

/** 정류장: 차의 비스듬한 앞옆으로 돈다. angle은 차 뒤(0)에서 앞(π)으로 도는 각 */
export const STOP_VIEW = { angle: 2.35, radius: 9, height: 2.6, targetHeight: 0.5, targetShift: 3.2 } as const;

/** 정류장에서 차와 제품 화면이 서는 화면 쪽(−1 왼쪽, 1 오른쪽). 본문 패널은 반대편이다. PiCKCARE는 저장소 패널이 오른쪽이라 왼쪽이다 */
export function stopScreenSide(stop: Stop): -1 | 1 {
  return stop.kind === "hall" ? -1 : objectSide(stop);
}

/**
 * 엔딩 내려다보기 자리. 출발선 뒤 높은 곳에서 길 전체를 본다. 길 전체가 헤더 아래에 들고,
 * 넓은 화면에서는 오른쪽 연락처 패널의 왼쪽에 놓인다(drive.test.ts가 화면 비율 넷으로 확인).
 */
export const OVERVIEW: CameraPose = { position: [45, 255, 50], target: [35, 0, -92] };

function orbit(car: RoadFrame, angle: number, radius: number, height: number, side: number): Vec3 {
  const back = scale(car.tangent, -radius * Math.cos(angle));
  const aside = scale(car.right, side * radius * Math.sin(angle));
  return add(add(add(car.position, back), aside), scale(car.up, height));
}

/** 정류장 시점에서 카메라가 도는 쪽(도로 기준 오른쪽 +). 앞에서 차를 돌아보면 화면 좌우가 도로 좌우와 반대다 */
function orbitSide(screenSide: -1 | 1): number {
  return -screenSide;
}

function cameraFor(carS: number, car: RoadFrame, progress: number): CameraPose {
  const { range } = stopAt(progress);
  const weight = dwellWeight(progress);
  const side = range.stop.pin ? orbitSide(stopScreenSide(range.stop)) : 1;
  const angle = STOP_VIEW.angle * weight;
  const radius = lerp(Math.hypot(CHASE.back, 0), STOP_VIEW.radius, weight);
  const height = lerp(CHASE.height, STOP_VIEW.height, weight);
  const chaseTarget = roadPoint(carS + CHASE.ahead, 0, CHASE.aheadHeight);
  const stopTarget = add(
    add(car.position, scale(car.up, STOP_VIEW.targetHeight)),
    scale(car.right, -side * STOP_VIEW.targetShift),
  );
  const pose = { position: orbit(car, angle, radius, height, side), target: lerp3(chaseTarget, stopTarget, weight) };
  const k = overviewWeight(progress);
  if (k === 0) return pose;
  return { position: lerp3(pose.position, OVERVIEW.position, k), target: lerp3(pose.target, OVERVIEW.target, k) };
}

/** 차 몸통의 가운데 */
export function carCenter(car: RoadFrame): Vec3 {
  return add(add(car.position, scale(car.tangent, CAR_BODY_CENTER.forward)), scale(car.up, CAR_BODY_CENTER.up));
}

/**
 * 감쇠한 카메라 자리(out)를 차 둘레 밖, 노면 위로 밀어낸다(scene/CameraRig가 매 프레임 감쇠 뒤에 부른다).
 * 목표 자세(driveAt의 camera)는 이미 그 밖이라 평소에는 움직이지 않는다. 매 프레임 새 객체를 만들지 않도록 out을 직접 고친다.
 */
export function keepClear(out: { x: number; y: number; z: number }, car: RoadFrame): void {
  const center = carCenter(car);
  const dx = out.x - center[0];
  const dy = out.y - center[1];
  const dz = out.z - center[2];
  const length = Math.hypot(dx, dy, dz);
  if (length < CAMERA_CLEARANCE.radius) {
    const [ux, uy, uz] = length > 1e-6 ? [dx / length, dy / length, dz / length] : car.up;
    out.x = center[0] + ux * CAMERA_CLEARANCE.radius;
    out.y = center[1] + uy * CAMERA_CLEARANCE.radius;
    out.z = center[2] + uz * CAMERA_CLEARANCE.radius;
  }
  const height = (out.x - car.position[0]) * car.up[0] + (out.y - car.position[1]) * car.up[1] + (out.z - car.position[2]) * car.up[2];
  if (height < CAMERA_CLEARANCE.height) {
    const lift = CAMERA_CLEARANCE.height - height;
    out.x += car.up[0] * lift;
    out.y += car.up[1] * lift;
    out.z += car.up[2] * lift;
  }
}

/** 차 기준 좌표(오른쪽, 노면 위, 앞)로 바꾼다 */
export function toCarFrame(car: RoadFrame, point: Vec3): Vec3 {
  const offset = sub(point, car.position);
  return [dot(offset, car.right), dot(offset, car.up), dot(offset, car.tangent)];
}

/** 차 기준 좌표를 월드 좌표로 바꾼다 */
export function fromCarFrame(car: RoadFrame, local: Vec3): Vec3 {
  return add(add(add(car.position, scale(car.right, local[0])), scale(car.up, local[1])), scale(car.tangent, local[2]));
}

/** 카메라가 따라가는 상태. 위치와 시선을 차 기준 좌표로 둔다 */
export interface CameraFollow {
  position: Vec3;
  target: Vec3;
}

function dampVec(current: Vec3, target: Vec3, lambda: number, dt: number): Vec3 {
  return [damp(current[0], target[0], lambda, dt), damp(current[1], target[1], lambda, dt), damp(current[2], target[2], lambda, dt)];
}

/**
 * 카메라 한 프레임(scene/CameraRig). 목표 자세(driveAt의 camera)를 차 기준 좌표로 바꿔 감쇠하고, 지금 차 자세로 월드 자세를 다시 만든다.
 * 차 자체의 움직임은 그대로 따라가므로 앞으로든 거꾸로든 아무리 빨리 스크롤해도 주행 중 카메라는 차 뒤에 있고,
 * 주행·정류장·엔딩 시점 사이의 전환만 감쇠한다. 월드 좌표로 감쇠하면 거꾸로 스크롤할 때 뒤처짐이 차 쪽을 향해 카메라가 차 앞으로 넘어간다.
 * 감쇠한 자리는 keepClear로 차 둘레 밖·노면 위로 민다. follow가 null이면(첫 프레임) 목표 자세에 바로 놓는다.
 */
export function followCamera(
  follow: CameraFollow | null,
  state: DriveState,
  dt: number,
): { follow: CameraFollow; pose: CameraPose } {
  const goal: CameraFollow = {
    position: toCarFrame(state.car, state.camera.position),
    target: toCarFrame(state.car, state.camera.target),
  };
  const next = follow
    ? {
        position: dampVec(follow.position, goal.position, CAMERA_DAMPING.position, dt),
        target: dampVec(follow.target, goal.target, CAMERA_DAMPING.target, dt),
      }
    : goal;
  const world = fromCarFrame(state.car, next.position);
  const clear = { x: world[0], y: world[1], z: world[2] };
  keepClear(clear, state.car);
  const position: Vec3 = [clear.x, clear.y, clear.z];
  return {
    follow: { position: toCarFrame(state.car, position), target: next.target },
    pose: { position, target: fromCarFrame(state.car, next.target) },
  };
}

/** 스크롤 진행률 하나에서 차·열린 끝·발광·카메라 목표를 계산한다(스펙 3절). 같은 p면 같은 결과다 */
export function driveAt(progress: number): DriveState {
  const p = Math.min(1, Math.max(0, progress));
  const carS = carSAt(p);
  const car = roadFrame(carS);
  return {
    progress: p,
    carS,
    revealS: revealSAt(p),
    ending: overviewWeight(p),
    speed: speedAt(p),
    car,
    camera: cameraFor(carS, car, p),
  };
}
