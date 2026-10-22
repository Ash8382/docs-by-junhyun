import { ROAD_END, ROAD_SCALE, ROAD_START, driveAt, roadFrame, type CameraPose } from "./drive";
import { HOLOGRAMS, hologramsAt, luminance, pickcareFront } from "./holograms";
import { WIDE_LENS, projectThrough, type Lens } from "./lens";
import { pathSpan, rangeOf, smoothstep, type Vec3 } from "./timeline";
import { trailColor, type LinearRgb } from "./trail";

/**
 * 막별 풍경(스펙 3절 "막별 풍경 (2-3b)"): 막별 설정 목록, 자리 규칙, 등장·밝기·빛 켜짐·윤곽 빛 색의 식.
 * 배치와 정점은 landscapeBuild.ts가 만들고, 장면의 셰이더(scene/landscapeMaterial.ts)가 같은 상수로 같은 식을 쓴다
 * (landscapeMaterial.test.ts가 두 계산을 맞춰 본다). three를 import하지 않는 순수 코드다.
 * 여정은 막이 계속 늘어난다. 새 막은 LANDSCAPE_ACTS에 줄 하나를 더하고, 마지막 막이라고 가정하는 코드는 두지 않는다.
 * 막 목록을 받는 함수는 시험용 목록(막을 하나 더한 설정)도 받는다.
 */

/** 배치의 시드. 같은 시드·도로·설정이면 같은 정점이 나온다 */
export const LANDSCAPE_SEED = 20261016;

export type LandscapeKind = "cliffs" | "rocks" | "city";

export interface LandscapeAct {
  /** 막 번호(1부터) */
  act: number;
  /** 막 진입 정류장(timeline STOPS). 막은 그 정류장의 경로에서 시작한다 */
  stopId: string;
  kind: LandscapeKind;
}

/** 막별 설정 목록. 순서가 막 순서다 */
export const LANDSCAPE_ACTS: readonly LandscapeAct[] = [
  { act: 1, stopId: "act-1", kind: "cliffs" },
  { act: 2, stopId: "act-2", kind: "rocks" },
  { act: 3, stopId: "act-3", kind: "city" },
];

function actEntry(act: number, acts: readonly LandscapeAct[]): LandscapeAct {
  const entry = acts.find((item) => item.act === act);
  if (!entry) throw new Error(`풍경 설정에 ${act}막이 없습니다`);
  return entry;
}

/** 막의 시작(도로 s, m). 첫 막은 도로 시작이다(입구를 1막으로 친다) */
export function actStart(act: number, acts: readonly LandscapeAct[] = LANDSCAPE_ACTS): number {
  const entry = actEntry(act, acts);
  return entry.act === acts[0].act ? ROAD_START : pathSpan(entry.stopId).from * ROAD_SCALE;
}

/** 막의 끝(도로 s, m): 다음 막의 시작, 마지막 막이면 지금 도로 끝 */
export function actEnd(act: number, acts: readonly LandscapeAct[] = LANDSCAPE_ACTS): number {
  const next = acts.find((item) => item.act === act + 1);
  return next ? actStart(next.act, acts) : ROAD_END;
}

/** 막 진입 정류장 id */
export function actStopId(act: number, acts: readonly LandscapeAct[] = LANDSCAPE_ACTS): string {
  return actEntry(act, acts).stopId;
}

/** 막 진입 정류장이 끝나는 자리(도로 s, m). 막 제목이 지나간 뒤다 */
export function actTitleEnd(act: number, acts: readonly LandscapeAct[] = LANDSCAPE_ACTS): number {
  return pathSpan(actEntry(act, acts).stopId).to * ROAD_SCALE;
}

// ── 막 단위 등장과 밝기 ────────────────────────────────────

/** 막 단위 등장(스펙 "막 단위 등장"): 나타나는 폭(m), 밝아지는 폭(m), 아직 들어서지 않은 다음 막의 밝기 */
export const APPEAR = { fade: 20, enter: 30, next: 0.35 } as const;

/** 처음부터 보이는 막의 "나타나기 시작하는 자리". 셰이더도 이 값을 받아 늘 1이 된다 */
export const ALWAYS = -10000;

/** N막 풍경이 나타나기 시작하는 자리(도로 s): 첫 두 막은 처음부터(ALWAYS), 그다음 막부터는 바로 앞 막의 시작 */
export function appearFrom(act: number, acts: readonly LandscapeAct[] = LANDSCAPE_ACTS): number {
  return act <= acts[0].act + 1 ? ALWAYS : actStart(act - 1, acts);
}

/** 풍경이 보이는 정도(0~1). 차가 from을 지나 fade(m)를 달리는 동안 0 → 1. 0이면 그 막 메시를 그리지 않는다 */
export function appearLevel(from: number, carS: number): number {
  return smoothstep(from, from + APPEAR.fade, carS);
}

/** 밝기 배율: 아직 들어서지 않은 막은 APPEAR.next, 차가 막 시작 enter(m) 앞에서 막 시작까지 1로 */
export function brightnessLevel(start: number, carS: number): number {
  return APPEAR.next + (1 - APPEAR.next) * smoothstep(start - APPEAR.enter, start, carS);
}

// ── 윤곽 빛 ──────────────────────────────────────────────

/** 윤곽 빛(스펙 "빛"): 막 안에서 열린 끝보다 lead(m) 앞까지 켜고 fade(m)에 걸쳐 바뀐다. rim은 최대 휘도(선형 HDR, Rec.709) */
export const LIGHT = { lead: 80, fade: 20, rim: 0.35 } as const;

/** 엔딩에서 물러나는 정도: 불투명도, 빛 배율, 최소 안개 */
export const ENDING = { opacity: 0.35, light: 0.3, haze: 0.55 } as const;

/** 정점 자리 s(생성 때 저장한 도로 s), 그 막의 시작 start에서 빛이 켜진 정도(0~1). 다음 막은 그 막 길이 열리기 전까지 0이다 */
export function lightLevel(s: number, start: number, revealS: number): number {
  return smoothstep(start - LIGHT.fade, start, revealS) * smoothstep(s - LIGHT.fade, s, revealS + LIGHT.lead);
}

/** 자리 s의 윤곽 빛 색(선형 HDR): 궤적 색을 휘도 1로 맞춘 색조 × rim. 휘도가 rim이라 블룸 문턱(1) 아래다 */
export function rimColor(s: number): LinearRgb {
  const color = trailColor(s);
  const scale = LIGHT.rim / Math.max(luminance(color), 1e-3);
  return [color[0] * scale, color[1] * scale, color[2] * scale];
}

// ── 자리 규칙 ────────────────────────────────────────────

/**
 * 자리 규칙(스펙 "자리 규칙", 수평 m). 생성은 sampleStep 간격의 도로 표본에서 push 밖으로 밀고, 테스트는 testStep 간격으로
 * clearance를 확인한다. 첨탑은 spire 이상. 도로 끝 연장선 양옆 corridor 안(도로 끝 앞쪽)에는 두지 않는다.
 * corridor는 모든 막에 같고 70m다(사용자 결정 2026-10-19): 길 반폭 8m + clearance 40m + 굽이 여유 22m.
 * 100m면 도로 끝 연장선이 지나는 2막 후반 오른쪽 암석 24개가 빠졌다. clearance 확인은 이 규칙과 따로 한다.
 */
export const RULES = { clearance: 40, push: 45, spire: 100, corridor: 70, sampleStep: 2, testStep: 0.5 } as const;

/** 도로 중심선 표본(수평 x, z). 도로 시작부터 끝까지 step 간격이고 끝을 넣는다 */
export function roadSamples(step: number): [number, number][] {
  const samples: [number, number][] = [];
  for (let s = ROAD_START; s < ROAD_END; s += step) {
    const position = roadFrame(s).position;
    samples.push([position[0], position[2]]);
  }
  const end = roadFrame(ROAD_END).position;
  samples.push([end[0], end[2]]);
  return samples;
}

/** 수평 자리 (x, z)에서 가장 가까운 도로 표본까지의 거리(m) */
export function roadDistance(x: number, z: number, samples: readonly [number, number][]): number {
  let best = Infinity;
  for (const [rx, rz] of samples) best = Math.min(best, Math.hypot(x - rx, z - rz));
  return best;
}

/** 도로 끝의 수평 자리와 앞쪽(단위). 상수라 처음 한 번만 구한다 */
let endLine: { x: number; z: number; tx: number; tz: number } | null = null;

/**
 * 도로 끝 연장선 양옆 corridor(m) 안인가(도로 끝보다 앞쪽만). 나중에 길이 이어질 자리다.
 * 배치가 암석·건물의 정점마다 부르므로 도로 끝 자세(roadFrame)를 매번 다시 구하지 않는다. 다시 구하면 휴대폰에서 풍경 배치를
 * 만드는 시간의 절반쯤이 이 계산이었다(병합 뒤, 이 맥 첫 호출 약 50ms 중 약 28ms)
 */
export function inEndCorridor(x: number, z: number): boolean {
  if (endLine === null) {
    const end = roadFrame(ROAD_END);
    const length = Math.hypot(end.tangent[0], end.tangent[2]);
    endLine = { x: end.position[0], z: end.position[2], tx: end.tangent[0] / length, tz: end.tangent[2] / length };
  }
  const { tx, tz } = endLine;
  const dx = x - endLine.x;
  const dz = z - endLine.z;
  const along = dx * tx + dz * tz;
  const lateral = Math.abs(dx * tz - dz * tx);
  return along > 0 && lateral < RULES.corridor;
}

/** 수평 오른쪽(뱅킹 없이)과 앞쪽. 풍경은 수평으로 놓는다 */
export function flatFrame(s: number): { origin: Vec3; right: Vec3; forward: Vec3 } {
  const frame = roadFrame(s);
  const length = Math.hypot(frame.tangent[0], frame.tangent[2]);
  const forward: Vec3 = [frame.tangent[0] / length, 0, frame.tangent[2] / length];
  return { origin: frame.position, right: [-forward[2], 0, forward[0]], forward };
}

// ── 정류장 홀로그램 뒤 비우기 ───────────────────────────────

/** 정류장 홀로그램 뒤 비우기: 정류장 가운데 카메라에서 홀로그램 가운데를 보는 방향과 비우는 각(도) */
export interface Sight {
  camera: Vec3;
  direction: Vec3;
  clear: number;
}

/** 비우는 각(도): 프로젝트 정류장(2막) ±25°, 저장소가 늘어선 정류장(PiCKCARE) 다섯 줄 ±18° */
export const BACKDROP = { exhibit: 25, hall: 18 } as const;

const SIGHTS = new Map<number, readonly Sight[]>();

/**
 * 그 막 정류장 홀로그램들의 시선(정류장 가운데 카메라 → 홀로그램 가운데). 비우는 각은 정류장 종류로 정한다(저장소 정류장은 hall,
 * 나머지는 exhibit). 막 번호로 구하므로 막이 늘어도 같다. 처음 한 번 계산한다
 */
export function actSights(act: number): readonly Sight[] {
  const cached = SIGHTS.get(act);
  if (cached) return cached;
  const sights = HOLOGRAMS.flatMap((hologram, index) => {
    if (hologram.act !== act) return [];
    const range = rangeOf(hologram.stopId);
    const middle = (range.start + range.end) / 2;
    const camera = driveAt(middle).camera.position;
    const center = hologramsAt(middle, pickcareFront(middle, ""))[index].center;
    const direction: Vec3 = [center[0] - camera[0], center[1] - camera[1], center[2] - camera[2]];
    const length = Math.hypot(direction[0], direction[1], direction[2]);
    const clear = range.stop.kind === "hall" ? BACKDROP.hall : BACKDROP.exhibit;
    return [{ camera, direction: [direction[0] / length, direction[1] / length, direction[2] / length] as Vec3, clear }];
  });
  SIGHTS.set(act, sights);
  return sights;
}

/** 반지름 radius(m)인 풍경 요소의 가운데 point가 어느 시선의 비우는 각(겉보기 크기만큼 더해) 안에 드는가 */
export function behindSight(point: Vec3, radius: number, sights: readonly Sight[]): boolean {
  return sights.some(({ camera, direction, clear }) => {
    const v = [point[0] - camera[0], point[1] - camera[1], point[2] - camera[2]];
    const distance = Math.hypot(v[0], v[1], v[2]);
    const cos = (v[0] * direction[0] + v[1] * direction[1] + v[2] * direction[2]) / distance;
    const angle = (Math.acos(Math.min(1, Math.max(-1, cos))) * 180) / Math.PI;
    return angle < clear + (Math.atan(radius / distance) * 180) / Math.PI;
  });
}

// ── 화면 투영 ────────────────────────────────────────────

/**
 * 카메라 자리(위치·목표)에서 본 점의 화면 자리. x·y는 화면 비율(왼쪽 위 0, 오른쪽 아래 1), depth는 시선 방향 거리(m, 뒤면 음수).
 * aspect는 가로/세로. 렌즈를 주지 않으면 가로 화면 렌즈(세로 시야각 CAMERA_FOV, 투영 중심 가운데)이고 위쪽은 +y다(lens.ts).
 */
export function projectPoint(pose: CameraPose, point: Vec3, aspect: number, lens: Lens = WIDE_LENS): { x: number; y: number; depth: number } {
  return projectThrough(pose, point, aspect, lens);
}
