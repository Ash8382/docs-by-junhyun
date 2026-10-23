import { damp } from "./damp";
import { CAMERA_DAMPING, carCenter, driveAt, fromCarFrame, toCarFrame, type CameraPose, type DriveState, type RoadFrame } from "./drive";
import { FRONT_LEAD, HOLOGRAMS, REPO_COUNT, hologramsAt, pickcareFront } from "./holograms";
import { HALL_REPO_END, HALL_REPO_START, STOPS, endingPhases, overviewWeight, rangeOf, smoothstep, stopAt, viewWeight, type Vec3 } from "./timeline";

/**
 * 세로 화면(스펙 3절 "세로 화면 (2-4a)"). 세계 속 차·홀로그램·풍경의 자리와 가로 화면 카메라(driveAt의 camera)는 그대로 두고,
 * 세로 화면에서 따라갈 카메라 목표 자세와 아래 고정 카드를 정한다. 렌즈(시야각·투영 중심)는 lens.ts다. 순수 함수이고 three를 import하지 않는다.
 *
 * 카메라는 차 둘레의 방위각(0이면 차 바로 뒤, +면 차의 오른쪽)·수평 거리·노면 위 높이로 놓고, 시선 목표는 차 기준 좌표로 둔다. 주행 구도와
 * 정류장 구도 사이를 "정류장 시점으로 돈 정도" 하나로 보간하고 감쇠도 그 값에 건다(followPortrait). 그래서 카메라가 차를 가로지르지 않고,
 * 감쇠 중에도 차가 화면 가운데 근처에 있다(차 기준 직교 좌표로 감쇠하면 PFPlay 끝과 빠른 스크롤에서 차가 화면을 채우거나 화면 밖으로 밀렸다).
 */
export const PORTRAIT = {
  /** 주행: 차 뒤 back(m)·노면 위 height(m)에서 차 가운데의 정면 방향 ahead(m) 앞, 높이 aheadHeight(m)를 본다 */
  chase: { back: 9, height: 3.4, ahead: 14, aheadHeight: -0.6 },
  /**
   * 정류장: 홀로그램에서 차를 지나 distance(m) 너머, 노면 위 height(m). 시선은 차 가운데와 홀로그램 사이 mix. 도는 도중 시선은 돈 정도의
   * targetEase 제곱만큼만 정류장 시선으로 옮긴다(1이면 2막·PiCKCARE에서 도는 도중 차가 화면 가로 0.14·0.89까지 밀렸다)
   */
  stop: { distance: 13, height: 3.5, mix: 0.5, targetEase: 2 },
  /** 1막(멈추지 않는 정류장)에서 홀로그램 쪽으로 도는 구간: 정류장 안 위치가 0 → rise에서 다 돌고, fall → 1에서 돌아온다 */
  glance: { rise: 0.3, fall: 0.7 },
  /**
   * 엔딩 내려다보기: 가로 화면(OVERVIEW)과 같은 각도로, 길 전체가 헤더 아래부터 화면 위 60% 안(y 0.10~0.57)에 들도록 거리(약 433m,
   * 카메라 먼 끝 600m 안)와 시선을 맞췄다. 길이 앞뒤로 긴 모양이라 세로로 길게 보인다(390×844에서 x 0.375~0.625)
   */
  overview: { position: [27.4, 392.6, 94.3] as Vec3, target: [12.5, 14.4, -116.3] as Vec3 },
  /**
   * 엔딩 끝에서 흰 점으로 다가간 자리(병합 뒤). 내려다보기와 같은 시선 방향으로 흰 점에서 110m 떨어져 점 뒤에 은하가 그대로 있고,
   * 흰 점이 위쪽 가운데(화면 (0.50, 0.25))에 오도록 맞췄다. 연락처 패널은 아래쪽이다(portrait.test.ts가 세로 화면 네 크기로 확인)
   */
  focus: { position: [12.9, 109, -175.6] as Vec3, target: [9.5, 12.9, -223.6] as Vec3 },
} as const;

function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function scale(a: Vec3, k: number): Vec3 {
  return [a[0] * k, a[1] * k, a[2] * k];
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerp3(a: Vec3, b: Vec3, t: number): Vec3 {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

/** 정류장과 그 홀로그램 번호마다 한 번 계산한 자리. 다 떠오른 자리라 진행률에 따라 바뀌지 않는다 */
const focusCache = new Map<string, Vec3>();

/**
 * 정류장의 홀로그램 자리(없으면 null). 1·2막은 그 정류장 홀로그램, PiCKCARE는 지금 앞줄. 다 떠오른 자리(정류장 가운데)다.
 * 세로 카메라가 매 프레임 부르므로 정류장과 홀로그램 번호(PiCKCARE는 앞줄에 따라 다르다)로 기억해 홀로그램 11개를 매번 다시 놓지 않는다(2-4b)
 */
export function stopFocus(progress: number, hash = ""): Vec3 | null {
  const { range } = stopAt(progress);
  const indices = HOLOGRAMS.flatMap((hologram, index) => (hologram.stopId === range.stop.id ? [index] : []));
  if (indices.length === 0) return null;
  const front = pickcareFront(progress, hash);
  const index = range.stop.kind === "hall" ? indices[front] : indices[0];
  const key = `${range.stop.id}:${index}`;
  let center = focusCache.get(key);
  if (!center) {
    center = hologramsAt((range.start + range.end) / 2, front)[index].center;
    focusCache.set(key, center);
  }
  return center;
}

/** 세로 화면에서 정류장 시점으로 도는 정도. 멈추는 정류장은 viewWeight 그대로, 1막(멈추지 않는 프로젝트 정류장)은 가운데에서 홀로그램 쪽으로 돈다 */
export function portraitViewWeight(progress: number): number {
  const { range, t } = stopAt(progress);
  if (range.stop.pin || range.stop.kind !== "project") return viewWeight(progress);
  return smoothstep(0, PORTRAIT.glance.rise, t) * (1 - smoothstep(PORTRAIT.glance.fall, 1, t));
}

/** 차 둘레 자리: 방위각 angle(0이면 차 바로 뒤, +면 차의 오른쪽), 수평 거리 distance, 노면 위 height */
function orbit(car: RoadFrame, angle: number, distance: number, height: number): Vec3 {
  const back = scale(car.tangent, -distance * Math.cos(angle));
  const aside = scale(car.right, distance * Math.sin(angle));
  return add(add(add(car.position, back), aside), scale(car.up, height));
}

/**
 * 주행 시선 목표(차 기준 좌표: 오른쪽, 노면 위, 앞): 차 가운데의 정면 방향 ahead 앞, 높이 aheadHeight. 카메라가 차 둘레를 angle만큼 돌면
 * 이 목표도 차 둘레로 같이 돌린다(주행 구도를 통째로 돌린다). 그래야 정류장으로 도는 도중에도 차가 화면 가운데 근처에 있다
 */
function chaseTarget(car: RoadFrame, angle: number): Vec3 {
  const center = carCenter(car);
  const [x, y, z] = toCarFrame(car, add(add(center, scale(car.tangent, PORTRAIT.chase.ahead)), scale(car.up, PORTRAIT.chase.aheadHeight)));
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [x * cos - z * sin, y, x * sin + z * cos];
}

/** 정류장 구도를 재는 구간(정류장 안의 위치): 1막은 돌아보기 구간, 멈추는 정류장은 차가 서 있는 구간 */
const VIEW_WINDOW = { glance: [PORTRAIT.glance.rise, PORTRAIT.glance.fall], dwell: [0.25, 0.75] } as const;

/**
 * 정류장 구도(차 기준): 홀로그램에서 차를 지나는 방향의 방위각과 시선 목표(차 가운데와 홀로그램 사이). 구도를 재는 구간 안에서는 지금 차
 * 자리로, 그 앞뒤에서는 구간 끝의 차 자리로 잰다. 지금 차 자리로만 재면 차가 정류장을 떠나는 동안 홀로그램이 차 뒤로 가며 카메라가 차
 * 앞쪽으로 돌았고, 정류장 가운데로만 재면 1막(차가 계속 달린다)의 읽기 구간 끝에서 홀로그램이 화면 밖으로 밀렸다
 */
function stopView(progress: number, hash: string): { angle: number; target: Vec3 } | null {
  const focus = stopFocus(progress, hash);
  if (!focus) return null;
  const { range, t } = stopAt(progress);
  const [from, to] = range.stop.pin ? VIEW_WINDOW.dwell : VIEW_WINDOW.glance;
  const car = driveAt(range.start + (range.end - range.start) * Math.min(to, Math.max(from, t))).car;
  const local = toCarFrame(car, focus);
  return { angle: Math.atan2(-local[0], local[2]), target: lerp3(toCarFrame(car, carCenter(car)), local, PORTRAIT.stop.mix) };
}

/**
 * 세로 화면 카메라의 상태(목표와, 감쇠해 따라가는 값). 카메라의 방위각, 지금 정류장 구도(정류장 방위각, 차 기준 시선 목표), 엔딩 내려다보기 정도.
 * 정류장 시점으로 돈 정도는 방위각 ÷ 정류장 방위각이라, 감쇠 중에도 거리·높이·시선이 카메라 자리에 맞게 따라온다(차를 가로지르지 않고 화면에 남는다)
 */
export interface PortraitView {
  angle: number;
  stopAngle: number;
  target: Vec3;
  overview: number;
  /** 엔딩에서 흰 점으로 다가간 정도(병합 뒤) */
  focus: number;
}

/** 정류장 시점으로 돈 정도(0~1): 방위각이 정류장 방위각까지 간 비율. 반대쪽이거나 정류장이 없으면 0(주행 구도를 통째로 돌린 것) */
function turned(view: PortraitView): number {
  return view.stopAngle === 0 ? 0 : Math.min(1, Math.max(0, view.angle / view.stopAngle));
}

/**
 * 세로 화면 카메라 목표. 같은 진행률(과 같은 해시)이면 같은 목표다. hash는 PiCKCARE 앞줄을 정하는 주소 해시다(상세가 열려 있으면 그 저장소를 본다).
 * 정류장 방위각은 홀로그램 반대쪽이라 도는 방향이 정류장마다 정해져 있다. 홀로그램이 없는 구간은 previous의 구도를 그대로 둔다
 */
export function portraitGoal(state: DriveState, hash = "", previous: PortraitView | null = null): PortraitView {
  const view = stopView(state.progress, hash);
  return {
    angle: view ? view.angle * portraitViewWeight(state.progress) : 0,
    stopAngle: view?.angle ?? previous?.stopAngle ?? 0,
    target: view?.target ?? previous?.target ?? chaseTarget(state.car, 0),
    overview: overviewWeight(state.progress),
    focus: endingPhases(state.progress).flow,
  };
}

/** 상태를 지금 차 자세에서 월드 자세로 바꾼다. 엔딩에서는 내려다보는 자리로 옮긴다 */
export function portraitPose(car: RoadFrame, view: PortraitView): CameraPose {
  const weight = turned(view);
  const position = orbit(
    car,
    view.angle,
    lerp(PORTRAIT.chase.back, PORTRAIT.stop.distance, weight),
    lerp(PORTRAIT.chase.height, PORTRAIT.stop.height, weight),
  );
  const target = fromCarFrame(car, lerp3(chaseTarget(car, view.angle), view.target, Math.pow(weight, PORTRAIT.stop.targetEase)));
  if (view.overview === 0) return { position, target };
  const overview = {
    position: lerp3(position, PORTRAIT.overview.position, view.overview),
    target: lerp3(target, PORTRAIT.overview.target, view.overview),
  };
  if (view.focus === 0) return overview;
  return {
    position: lerp3(overview.position, PORTRAIT.focus.position, view.focus),
    target: lerp3(overview.target, PORTRAIT.focus.target, view.focus),
  };
}

/** 세로 화면 카메라 목표 자세(감쇠 없이) */
export function portraitCamera(state: DriveState, hash = ""): CameraPose {
  return portraitPose(state.car, portraitGoal(state, hash));
}

/** 방위각이 이만큼(라디안)보다 0에 가까우면 반대쪽 정류장의 방위각으로 바꾼다(돈 정도가 0.001 아래라 바꿔도 구도가 이어진다) */
const SIDE_SWITCH = 1e-3;

/**
 * 따라가는 정류장 방위각. 이웃 정류장은 홀로그램이 반대쪽이라 경계에서 정류장 방위각의 부호가 뒤집힌다. 그대로 바꾸면 아직 이전 쪽으로 돌아
 * 있는 카메라의 돈 정도가 한 프레임에 0이 되어 거리·높이·시선이 튀므로, 감쇠하는 방위각이 0을 지날 때까지 이전 정류장 방위각을 둔다.
 * 같은 쪽이면(PiCKCARE 앞줄이 바뀔 때 등) 방위각과 같은 세기로 감쇠한다
 */
function followStopAngle(follow: PortraitView, goal: number, dt: number): number {
  if (goal === follow.stopAngle || follow.stopAngle === 0 || goal === 0) return goal;
  if (Math.sign(goal) === Math.sign(follow.stopAngle)) return damp(follow.stopAngle, goal, CAMERA_DAMPING.position, dt);
  const stillTurned = follow.angle * follow.stopAngle > 0 && Math.abs(follow.angle) > SIDE_SWITCH;
  return stillTurned ? follow.stopAngle : goal;
}

/**
 * 세로 화면 카메라 한 프레임(scene/CameraRig). 방위각·정류장 방위각·정류장 시선 목표·내려다보기 정도를 프레임 간격으로 감쇠한다(가로 화면과
 * 같은 감쇠 세기). 차의 움직임은 그대로 따라간다. follow가 null이면(첫 프레임) 목표에 바로 놓는다.
 */
export function followPortrait(follow: PortraitView | null, state: DriveState, dt: number, hash = ""): { follow: PortraitView; pose: CameraPose } {
  const goal = portraitGoal(state, hash, follow);
  const next: PortraitView = follow
    ? {
        angle: damp(follow.angle, goal.angle, CAMERA_DAMPING.position, dt),
        stopAngle: followStopAngle(follow, goal.stopAngle, dt),
        target: [
          damp(follow.target[0], goal.target[0], CAMERA_DAMPING.target, dt),
          damp(follow.target[1], goal.target[1], CAMERA_DAMPING.target, dt),
          damp(follow.target[2], goal.target[2], CAMERA_DAMPING.target, dt),
        ],
        overview: damp(follow.overview, goal.overview, CAMERA_DAMPING.position, dt),
        focus: damp(follow.focus, goal.focus, CAMERA_DAMPING.position, dt),
      }
    : goal;
  return { follow: next, pose: portraitPose(state.car, next) };
}

// ── 아래 고정 카드 ─────────────────────────────────────────

/** PiCKCARE 저장소 카드(홀로그램 id와 같다: pickcare/<저장소>) */
const REPO_CARDS = HOLOGRAMS.filter((hologram) => hologram.act === 3).map((hologram) => hologram.id);

/** PiCKCARE 소개 카드는 저장소 패널 구간이 시작하기 이만큼(화면) 앞까지 보인다 */
export const HALL_INTRO_LEAD = 0.25;

/** 세로 화면 아래 고정 자리의 카드: 엔딩을 뺀 정류장마다 하나, PiCKCARE는 소개와 저장소 다섯 */
export const CARDS: readonly string[] = [...STOPS.filter((stop) => stop.kind !== "ending").map((stop) => stop.id), ...REPO_CARDS];

/** 지금 아래 고정 자리에 보일 카드(data-journey-card의 값). 엔딩에는 없다(연락처는 스크롤로 올라온다) */
export function activeCard(progress: number, hash: string): string | null {
  const { range, t } = stopAt(progress);
  if (range.stop.kind === "ending") return null;
  if (range.stop.kind !== "hall") return range.stop.id;
  if (t * range.stop.length < HALL_REPO_START - HALL_INTRO_LEAD) return range.stop.id;
  return REPO_CARDS[pickcareFront(progress, hash)];
}

/**
 * 카드가 보이는 대표 진행률(키보드 포커스가 보이지 않는 카드로 가면 여기로 스크롤한다). 정류장 가운데, PiCKCARE 소개는 소개 구간 가운데,
 * 저장소 카드는 앞줄 전환 사이의 가운데(저장소 진행률 u = (i + 0.5 − FRONT_LEAD)/5, 첫 저장소는 0)다
 */
export function cardProgress(card: string): number {
  const repo = REPO_CARDS.indexOf(card);
  const range = rangeOf(repo >= 0 ? "pickcare" : card);
  const length = range.stop.length;
  let within = 0.5;
  if (repo >= 0) {
    const u = Math.max(0, (repo + 0.5 - FRONT_LEAD) / REPO_COUNT);
    within = (HALL_REPO_START + u * (length - HALL_REPO_START - HALL_REPO_END)) / length;
  } else if (range.stop.kind === "hall") {
    within = (HALL_REPO_START - HALL_INTRO_LEAD) / 2 / length;
  }
  return range.start + (range.end - range.start) * within;
}
