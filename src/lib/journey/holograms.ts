import { projects } from "@/data/projects";
import type { Project, RepoId, Screen } from "@/data/projects/types";
import { carSAt, driveAt, roadFrame, roadPoint, stopScreenSide } from "./drive";
import { DETAIL_SLUGS, activeRepo, journeyHash, parseJourneyHash } from "./hash";
import { STOPS, hallRepoProgress, rangeOf, smoothstep, stopAt, viewWeight, type StopRange, type Vec3 } from "./timeline";
import type { LinearRgb } from "./trail";

/**
 * 제품 화면 홀로그램(스펙 3절 "제품 화면 홀로그램 (2-3a)"). 프로젝트마다 대표 화면 한 장을 3D 공간에 띄운다.
 * 이 파일은 목록·이미지·층 안 그림 영역·테두리 빛과 진행률에 따른 자리를 정한다. three를 import하지 않는 순수 코드다.
 * 이미지는 scripts/build-holograms.ts가 층(768×480) 크기로 줄여 public/journey/holograms/에 만들고,
 * 장면(scene/Holograms)이 11장을 텍스처 배열 하나로 묶는다. 층 번호는 이 목록의 순서다.
 */

/** 텍스처 배열 한 층의 크기(화소) */
export const LAYER = { width: 768, height: 480 } as const;

export interface PixelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Hologram {
  /** 프로젝트 slug, PiCKCARE는 "pickcare/<저장소>". 짝인 상세 해시의 본문과 같다 */
  id: string;
  /** 정류장 id(timeline STOPS) */
  stopId: string;
  act: 1 | 2 | 3;
  repo?: RepoId;
  /** 원본 이미지(public 기준)와 크기 */
  src: string;
  width: number;
  height: number;
  /** 잘라 쓸 영역(원본 화소). 없으면 원본 전체 */
  crop?: PixelRect;
  /** 층 이미지(public 기준). scripts/build-holograms.ts가 만든다 */
  layerFile: string;
  /** 짝인 상세 링크의 해시. 상세가 없는 코코아톡은 null이라 누를 수 없다 */
  linkHash: string | null;
}

/** 잘라 쓸 영역. 데이터는 3D 정보를 담지 않으므로(스펙 6절) 여기에 둔다. Todo App은 그라데이션 가운데의 카드만 쓴다 */
const CROPS: Record<string, PixelRect> = {
  "todo-app": { x: 1053, y: 467, width: 774, height: 867 },
};

/** 첫 화면 대신 쓸 화면. cardnews의 첫 장은 빈 틀(마스터 4종)이라 완성된 세트를 쓴다 */
const SOURCES: Record<string, string> = {
  "pickcare/cardnews": "/projects/pickcare/cardnews/set-1.webp",
};

/** 프로젝트의 홈 화면 캡처가 있으면 그것, 없으면(코코아톡·Stock2U·Tix2U) 첫 장(썸네일) */
function representative(project: Project): Screen {
  return project.screens.find((screen) => screen.src === `/projects/${project.slug}/home.webp`) ?? project.screens[0];
}

function entry(id: string, stopId: string, act: 1 | 2 | 3, screen: Screen, link: string | null, repo?: RepoId): Hologram {
  return {
    id,
    stopId,
    act,
    repo,
    src: screen.src,
    width: screen.width,
    height: screen.height,
    crop: CROPS[id],
    layerFile: `/journey/holograms/${id.replace("/", "-")}.webp`,
    linkHash: link,
  };
}

function build(): Hologram[] {
  const list: Hologram[] = [];
  for (const stop of STOPS) {
    if (!stop.slug || stop.act === 0) continue;
    const project = projects.find((item) => item.slug === stop.slug);
    if (!project) throw new Error(`정류장 ${stop.id}의 프로젝트가 없습니다`);
    const linked = DETAIL_SLUGS.includes(project.slug);
    if (project.kind === "repos") {
      for (const repo of project.repos) {
        const id = `${project.slug}/${repo.id}`;
        const screen = repo.screens.find((item) => item.src === SOURCES[id]) ?? repo.screens[0];
        if (!screen) throw new Error(`저장소 ${repo.id}에 화면이 없습니다`);
        const link = linked ? journeyHash({ slug: project.slug, repo: repo.id }) : null;
        list.push(entry(id, stop.id, stop.act, screen, link, repo.id));
      }
    } else {
      const link = linked ? journeyHash({ slug: project.slug }) : null;
      list.push(entry(project.slug, stop.id, stop.act, representative(project), link));
    }
  }
  return list;
}

/** 홀로그램 11개. 1막 셋, 2막 셋, PiCKCARE 저장소 다섯. 배열의 순서가 텍스처 배열의 층 번호다 */
export const HOLOGRAMS: readonly Hologram[] = build();

/** 층에 넣을 그림의 크기(잘라 쓰면 잘라 낸 크기) */
export function sourceSize(hologram: Hologram): { width: number; height: number } {
  return hologram.crop
    ? { width: hologram.crop.width, height: hologram.crop.height }
    : { width: hologram.width, height: hologram.height };
}

/** 그림이 층 안에서 차지하는 영역(정수 화소). 비율대로 가운데 넣고 남는 자리는 비운다. 스크립트와 장면이 같이 쓴다 */
export function layerRect(width: number, height: number): PixelRect {
  const scale = Math.min(LAYER.width / width, LAYER.height / height);
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);
  return { x: Math.floor((LAYER.width - w) / 2), y: Math.floor((LAYER.height - h) / 2), width: w, height: h };
}

// ── 테두리 빛 ─────────────────────────────────────────────

/**
 * 테두리 빛의 휘도(선형): 선과 후광, [쉬는 때, 호버·포커스]. 선 + 후광의 최대가 블룸 문턱(1, 스펙 3절 "후처리") 미만이라
 * 테두리가 블룸을 일으켜 화면(특히 어두운 화면)에 궤적 색 안개를 씌우지 않는다. 시제품: 궤적 색 × 3.5는 EUTCHA에 평균 ΔE 6.1.
 */
export const FRAME_LIGHT = { line: [0.55, 0.8], halo: [0.12, 0.18] } as const;

/** 선형 sRGB 휘도. postprocessing의 블룸 문턱이 같은 식으로 잰다 */
export function luminance(color: LinearRgb): number {
  return 0.2126 * color[0] + 0.7152 * color[1] + 0.0722 * color[2];
}

/**
 * 테두리 한 점의 빛(선형 HDR). 궤적 색을 휘도 1로 맞춘 색조에 선·후광의 세기(0~1)를 곱한다. hover는 0(쉬는 때)~1(호버·포커스).
 * 셰이더(scene/hologramMaterial.ts)가 같은 식을 쓴다.
 */
export function frameLight(color: LinearRgb, line: number, halo: number, hover: number): LinearRgb {
  const mix = (range: readonly [number, number]) => range[0] + (range[1] - range[0]) * hover;
  const strength = line * mix(FRAME_LIGHT.line) + halo * mix(FRAME_LIGHT.halo);
  const scale = strength / Math.max(luminance(color), 1e-3);
  return [color[0] * scale, color[1] * scale, color[2] * scale];
}

// ── 자리와 연출 ───────────────────────────────────────────

/**
 * 막별 자리(스펙 3절 표, m). along은 정류장 가운데 차 자리에서 앞(+)·뒤(−)로 떨어진 거리, aside는 길가 바깥으로 떨어진 거리,
 * top은 다 떠오른 화면 가운데의 노면 위 높이, box는 층 상자(16:10)의 폭·높이다. 수치는 시안에서 출발해 안전 영역 테스트로 맞췄다:
 * 1막·2막은 헤더(화면 위 9%)에 닿지 않게 낮췄고, 3막 앞줄은 왼쪽 위 소개 패널과 오른쪽 저장소 패널 사이에 들도록 앞으로 옮기고 줄였다.
 */
export const PLACEMENT = {
  act1: { along: 6, aside: 4.5, top: 3.4, box: [6, 3.75] as const, lookBack: 12, lookHeight: 1.6 },
  act2: { along: -8, aside: 5, top: 3.3, box: [7.5, 4.6875] as const },
  act3: { along: -8, aside: 6, top: 3.8, backTop: 2.6, spacing: 6.5, back: 5, backPerStep: 1.5, backScale: 0.7, box: [6.4, 4] as const },
} as const;
/** 떠오르기 전(빛 원반 위) 화면 가운데의 높이(m) */
export const DISC_LIFT = 1;
/** 열린 끝이 원반 자리를 지나 이만큼(m) 더 열리면 다 나타난다 */
export const REVEAL_FADE = 5;
/** 이 이상 나타나야 누를 수 있다(스펙 3절 "포인터 대상") */
export const POINTER_PRESENCE = 0.5;
/** PiCKCARE 저장소 수 */
export const REPO_COUNT = 5;

export type Facing = { kind: "point"; point: Vec3 } | { kind: "camera" };

export interface HologramPlacement {
  id: string;
  /** 화면 가운데 */
  center: Vec3;
  /** 1막은 고정 지점을 향하고, 2·3막은 실제 카메라를 향한다(장면이 수직축으로만 돌린다) */
  facing: Facing;
  /** 지금 크기의 층 상자(m). 화면은 그 안의 층 안 그림 영역이다 */
  box: [number, number];
  /** 나타난 정도(0~1). 크기·높이에 곱해져 있고 불투명도로 쓴다 */
  presence: number;
  /** 빛 원반 자리(노면 높이)와 보이는 정도. 원반은 홀로그램이 내려가도 남는다 */
  disc: Vec3;
  discOpacity: number;
  /** 테두리·빛기둥·원반의 궤적 색 자리(도로 s, m) */
  colorS: number;
}

function add3(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function scale3(a: Vec3, k: number): Vec3 {
  return [a[0] * k, a[1] * k, a[2] * k];
}

function sub3(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function unit3(a: Vec3): Vec3 {
  return scale3(a, 1 / Math.hypot(a[0], a[1], a[2]));
}

function cross3(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

interface StopFrame {
  range: StopRange;
  /** 정류장 가운데 진행률의 차 자리(m) */
  s0: number;
  /** 화면 쪽(−1 왼쪽, 1 오른쪽). 본문 패널 반대편 */
  side: -1 | 1;
}

const STOP_FRAMES = new Map<string, StopFrame>(
  HOLOGRAMS.map((hologram) => {
    const range = rangeOf(hologram.stopId);
    return [hologram.stopId, { range, s0: carSAt((range.start + range.end) / 2), side: stopScreenSide(range.stop) }];
  }),
);

/** 3막 줄의 방향: 정류장 가운데 진행률의 카메라 목표에서 본 가로(right)와 안쪽(away). 정류장 안에서 고정이다 */
const HALL_AXES = (() => {
  const frame = STOP_FRAMES.get("pickcare");
  if (!frame) throw new Error("PiCKCARE 정류장이 없습니다");
  const base = hallBase(frame);
  const camera = driveAt((frame.range.start + frame.range.end) / 2).camera.position;
  const away = unit3([base[0] - camera[0], 0, base[2] - camera[2]]);
  return { base, away, right: [-away[2], 0, away[0]] as Vec3 };
})();

function hallBase(frame: StopFrame): Vec3 {
  const s = frame.s0 + PLACEMENT.act3.along;
  return roadPoint(s, frame.side * (roadFrame(s).width / 2 + PLACEMENT.act3.aside), 0);
}

/** 열린 끝이 원반 자리 discS를 지나며 0 → 1 */
function revealed(discS: number, revealS: number): number {
  return smoothstep(discS, discS + REVEAL_FADE, revealS);
}

/** 이 정류장에서 카메라가 정류장 시점으로 돈 정도(viewWeight, 지금 정류장이 아니면 0). 2·3막 홀로그램이 이만큼 떠오른다 */
function viewAt(stopId: string, progress: number): number {
  return stopAt(progress).range.stop.id === stopId ? viewWeight(progress) : 0;
}

/** 원반 위 DISC_LIFT에서 top까지 presence만큼 떠오른 높이 */
function liftedHeight(top: number, presence: number): number {
  return DISC_LIFT + (top - DISC_LIFT) * presence;
}

function placeRoadside(
  hologram: Hologram,
  frame: StopFrame,
  progress: number,
  revealS: number,
  ending: number,
): HologramPlacement {
  const act = hologram.act === 1 ? PLACEMENT.act1 : PLACEMENT.act2;
  const discS = frame.s0 + act.along;
  const lateral = frame.side * (roadFrame(discS).width / 2 + act.aside);
  const reveal = revealed(discS, revealS);
  const stay = hologram.act === 1 ? 1 : viewAt(hologram.stopId, progress);
  const presence = reveal * stay * (1 - ending);
  const facing: Facing =
    hologram.act === 1
      ? { kind: "point", point: roadPoint(frame.s0 - PLACEMENT.act1.lookBack, 0, PLACEMENT.act1.lookHeight) }
      : { kind: "camera" };
  return {
    id: hologram.id,
    center: roadPoint(discS, lateral, liftedHeight(act.top, presence)),
    facing,
    box: [act.box[0] * presence, act.box[1] * presence],
    presence,
    disc: roadPoint(discS, lateral, 0),
    discOpacity: reveal,
    colorS: frame.s0,
  };
}

function placeHall(
  hologram: Hologram,
  index: number,
  frame: StopFrame,
  front: number,
  progress: number,
  revealS: number,
  ending: number,
): HologramPlacement {
  const hall = PLACEMENT.act3;
  const k = index - front;
  const step = Math.min(1, Math.abs(k));
  const reveal = revealed(frame.s0 + hall.along, revealS);
  const presence = reveal * viewAt(hologram.stopId, progress) * (1 - ending);
  const back = (hall.back + hall.backPerStep * Math.abs(k)) * step;
  const disc = add3(add3(HALL_AXES.base, scale3(HALL_AXES.right, k * hall.spacing)), scale3(HALL_AXES.away, back));
  const top = hall.top + (hall.backTop - hall.top) * step;
  const size = (1 + (hall.backScale - 1) * step) * presence;
  return {
    id: hologram.id,
    center: add3(disc, [0, liftedHeight(top, presence), 0]),
    facing: { kind: "camera" },
    box: [hall.box[0] * size, hall.box[1] * size],
    presence,
    disc,
    discOpacity: reveal,
    colorS: frame.s0,
  };
}

/**
 * 진행률 p와 PiCKCARE 앞줄(front, 0~4 연속값)에서 홀로그램 11개의 자리를 낸다(HOLOGRAMS와 같은 순서). 같은 입력이면 같은 결과다.
 * front는 pickcareFront가 정한 목표를 장면이 감쇠해 넘긴다(탭·스크롤로 앞줄이 바뀌면 줄이 미끄러진다).
 */
export function hologramsAt(progress: number, front: number): HologramPlacement[] {
  const state = driveAt(progress);
  let repoIndex = 0;
  return HOLOGRAMS.map((hologram) => {
    const frame = STOP_FRAMES.get(hologram.stopId);
    if (!frame) throw new Error(`홀로그램 ${hologram.id}의 정류장이 없습니다`);
    if (hologram.act === 3) return placeHall(hologram, repoIndex++, frame, front, state.progress, state.revealS, state.ending);
    return placeRoadside(hologram, frame, state.progress, state.revealS, state.ending);
  });
}

/**
 * 화면의 축: normal은 화면이 바라보는 쪽, right·up은 화면의 가로·세로(단위 벡터). yawOnly면 수직축으로만 돌아 똑바로 선다.
 * 바라볼 곳이 바로 위·아래라 수평 방향이 없으면 +z를 바라본다.
 */
export function screenBasis(center: Vec3, toward: Vec3, yawOnly: boolean): { right: Vec3; up: Vec3; normal: Vec3 } {
  const direction = sub3(toward, center);
  const facing: Vec3 = yawOnly ? [direction[0], 0, direction[2]] : direction;
  const flat = Math.hypot(facing[0], facing[2]);
  const normal: Vec3 = flat < 1e-9 ? [0, 0, 1] : unit3(facing);
  const right = unit3(cross3([0, 1, 0], normal));
  return { right, up: cross3(normal, right), normal };
}

/** 그 자리의 화면 축. 1막은 고정 지점을 향하고, 2·3막은 카메라(실제 카메라 자리)를 수직축으로만 돌아 향한다 */
export function placementBasis(placement: HologramPlacement, camera: Vec3): { right: Vec3; up: Vec3; normal: Vec3 } {
  return placement.facing.kind === "point"
    ? screenBasis(placement.center, placement.facing.point, false)
    : screenBasis(placement.center, camera, true);
}

/** 그림 영역(층 상자 안의 층 안 그림 영역)의 네 꼭짓점: 왼쪽 위, 오른쪽 위, 오른쪽 아래, 왼쪽 아래 */
export function imageCorners(hologram: Hologram, placement: HologramPlacement, camera: Vec3): Vec3[] {
  const size = sourceSize(hologram);
  const rect = layerRect(size.width, size.height);
  const [boxWidth, boxHeight] = placement.box;
  const halfWidth = (boxWidth * rect.width) / LAYER.width / 2;
  const halfHeight = (boxHeight * rect.height) / LAYER.height / 2;
  // 층의 행은 위에서 아래로 센다. 그림 가운데가 층 가운데에서 벗어난 만큼 옮긴다
  const offsetX = boxWidth * ((rect.x + rect.width / 2) / LAYER.width - 0.5);
  const offsetY = -boxHeight * ((rect.y + rect.height / 2) / LAYER.height - 0.5);
  const { right, up } = placementBasis(placement, camera);
  const middle = add3(add3(placement.center, scale3(right, offsetX)), scale3(up, offsetY));
  const corner = (x: number, y: number) => add3(add3(middle, scale3(right, x * halfWidth)), scale3(up, y * halfHeight));
  return [corner(-1, 1), corner(1, 1), corner(1, -1), corner(-1, -1)];
}

// ── PiCKCARE 앞줄, 그리는 순서, 누를 수 있는 홀로그램 ───────────────

/**
 * 스크롤 기준 앞줄의 앞당김(스펙 3절 "PiCKCARE 앞줄"). 앞줄은 저장소 i의 읽기 구간(그 패널만 화면 안에 다 들어온 구간)이 끝난 뒤,
 * i+1의 읽기 구간이 시작하기 전에 바뀌어야 한다. 네 화면 크기에서 잰 패널로 이 조건을 만족하는 값은 0.71~0.81이고, 그 가운데다.
 */
export const FRONT_LEAD = 0.76;

const PICKCARE = (() => {
  const project = projects.find((item) => item.slug === "pickcare");
  if (project?.kind !== "repos" || project.repos.length !== REPO_COUNT) throw new Error("PiCKCARE는 저장소 다섯의 글이어야 합니다");
  return project;
})();

/**
 * PiCKCARE 앞줄의 목표 저장소 번호(0~4, 스펙 3절 "PiCKCARE 앞줄").
 * 1. 해시가 #pickcare…면(상세가 열려 있거나 닫히는 중) 상세가 보여 주는 저장소(activeRepo: 해시의 저장소, 없으면 첫 저장소).
 * 2. 아니면 스크롤 기준. u는 저장소 진행률(hallRepoProgress: 본문 저장소 패널 구간 안의 위치)이고 앞줄은 min(4, floor(5u + 0.76)).
 *    저장소 i의 읽기 구간이 끝난 뒤, 다음 패널의 읽기 구간이 시작하기 전에 바뀐다. 구간 앞은 첫 저장소, 뒤는 마지막 저장소다.
 * 장면은 이 목표로 앞줄을 감쇠해 hologramsAt에 넘긴다.
 */
export function pickcareFront(progress: number, hash: string): number {
  const target = parseJourneyHash(hash);
  if (target?.slug === PICKCARE.slug) return PICKCARE.repos.indexOf(activeRepo(PICKCARE, target.repo));
  return Math.min(REPO_COUNT - 1, Math.floor(REPO_COUNT * hallRepoProgress(progress) + FRONT_LEAD));
}

/** 그리는 순서(먼 것부터, 같은 거리면 목록 순서). 반투명 화면이 겹쳐도 가까운 것이 위에 그려진다 */
export function drawOrder(centers: readonly Vec3[], camera: Vec3): number[] {
  const distances = centers.map((center) => Math.hypot(center[0] - camera[0], center[1] - camera[1], center[2] - camera[2]));
  return centers.map((_, index) => index).sort((a, b) => distances[b] - distances[a] || a - b);
}

/** 누를 수 있는가: 상세 링크가 있고(코코아톡은 없다), 층을 받았고, 절반 이상 나타났다 */
export function isPointerTarget(hologram: Hologram, placement: HologramPlacement, loaded: boolean): boolean {
  return loaded && hologram.linkHash !== null && placement.presence >= POINTER_PRESENCE;
}

/** 상세 링크 해시(#pfplay, #pickcare/biz)의 홀로그램 번호. 짝이 없으면 −1 */
export function hologramOfLink(hash: string): number {
  return HOLOGRAMS.findIndex((hologram) => hologram.linkHash === hash);
}
