import { describe, expect, it } from "vitest";
import { carCenter, driveAt, revealSAt, roadFrame, roadPoint, type CameraPose } from "./drive";
import {
  DISC_LIFT,
  FRONT_LEAD,
  HOLOGRAMS,
  PLACEMENT,
  REPO_COUNT,
  REVEAL_FADE,
  hologramsAt,
  imageCorners,
  pickcareFront,
  placementBasis,
  screenBasis,
  type HologramPlacement,
} from "./holograms";
import {
  CAMERA_FOV,
  HALL_REPO_END,
  HALL_REPO_START,
  hallRepoProgress,
  objectSide,
  rangeOf,
  viewWeight,
  type Vec3,
} from "./timeline";

type Rect = [number, number, number, number];

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(...sub(a, b));
}

/** 화면 좌표(0~1, 왼쪽·위가 0). drive.test.ts와 같은 투영 */
function screenPosition(pose: CameraPose, point: Vec3, aspect: number): [number, number] {
  const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const unit = (a: Vec3): Vec3 => {
    const length = Math.hypot(...a);
    return [a[0] / length, a[1] / length, a[2] / length];
  };
  const forward = unit(sub(pose.target, pose.position));
  const right = unit(cross(forward, [0, 1, 0]));
  const up = cross(right, forward);
  const offset = sub(point, pose.position);
  const depth = dot(offset, forward);
  const tanVertical = Math.tan(((CAMERA_FOV / 2) * Math.PI) / 180);
  return [0.5 + dot(offset, right) / depth / (tanVertical * aspect) / 2, 0.5 - dot(offset, up) / depth / tanVertical / 2];
}

function screenRect(pose: CameraPose, points: Vec3[], aspect: number): Rect {
  const screen = points.map((point) => screenPosition(pose, point, aspect));
  const xs = screen.map((point) => point[0]);
  const ys = screen.map((point) => point[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

function overlaps(a: Rect, b: Rect): boolean {
  return a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
}

function at(stopId: string, t: number): number {
  const range = rangeOf(stopId);
  return range.start + (range.end - range.start) * t;
}

function placementOf(id: string, progress: number, front = 0): { placement: HologramPlacement; index: number } {
  const index = HOLOGRAMS.findIndex((hologram) => hologram.id === id);
  return { placement: hologramsAt(progress, front)[index], index };
}

/** 차 몸통을 감싸는 상자(차 기준 좌표: 앞뒤 ±2.2m, 좌우 ±1m, 높이 0~1.4m)의 화면 사각형 */
function carRect(progress: number, aspect: number): Rect {
  const state = driveAt(progress);
  const car = state.car;
  const points: Vec3[] = [];
  for (const along of [-2.2, 2.2]) for (const side of [-1, 1]) for (const up of [0, 1.4]) {
    points.push([
      car.position[0] + car.tangent[0] * along + car.right[0] * side + car.up[0] * up,
      car.position[1] + car.tangent[1] * along + car.right[1] * side + car.up[1] * up,
      car.position[2] + car.tangent[2] * along + car.right[2] * side + car.up[2] * up,
    ]);
  }
  return screenRect(state.camera, points, aspect);
}

const ASPECTS = [16 / 9, 16 / 10];
/**
 * 화면 좌표의 패널 자리. JourneyContent 배치를 1280×720·1920×1080(16:9), 1280×800·1440×900(16:10)에서 잰 값을 합쳤다(2막은 썸네일을 감춘 뒤).
 * 헤더는 위 9% 안이다(drive.test.ts 엔딩 안전 영역과 같은 값).
 */
const HEADER_BOTTOM = 0.09;
/** 1막 캡션 패널은 패널 쪽 가장자리에서 화면 폭 0.375까지 */
const CAPTION_SPAN = 0.375;
/** 2막 요약 패널은 패널 쪽 가장자리에서 화면 폭 0.41까지, 위 0.08~0.46 */
const EXHIBIT_SPAN = 0.41;

describe("홀로그램 자리", () => {
  it("같은 진행률·앞줄이면 같은 결과다(사이에 다른 진행률을 계산해도)", () => {
    const first = hologramsAt(0.42, 2);
    hologramsAt(0.9, 0);
    expect(hologramsAt(0.42, 2)).toEqual(first);
  });

  it("1막은 정류장 앞 길가에 서서 정류장 뒤 길 가운데를 향한다(진행률과 상관없다)", () => {
    for (const id of ["kokoa-clone", "todo-app", "eutcha"]) {
      const range = rangeOf(id);
      const s0 = driveAt((range.start + range.end) / 2).carS;
      const discS = s0 + PLACEMENT.act1.along;
      const lateral = objectSide(range.stop) * (roadFrame(discS).width / 2 + PLACEMENT.act1.aside);
      const { placement } = placementOf(id, (range.start + range.end) / 2);
      expect(placement.presence, id).toBe(1);
      placement.center.forEach((value, axis) => expect(value).toBeCloseTo(roadPoint(discS, lateral, PLACEMENT.act1.top)[axis], 6));
      placement.disc.forEach((value, axis) => expect(value).toBeCloseTo(roadPoint(discS, lateral, 0)[axis], 6));
      const facings = [0.2, 0.5, 0.8].map((t) => placementOf(id, at(id, t)).placement.facing);
      expect(facings[0]).toEqual({ kind: "point", point: roadPoint(s0 - PLACEMENT.act1.lookBack, 0, PLACEMENT.act1.lookHeight) });
      expect(facings[1]).toEqual(facings[0]);
      expect(facings[2]).toEqual(facings[0]);
    }
  });

  it("자리의 길이 열리기 전에는 그리지 않고, 열린 끝이 지나가며 나타난다", () => {
    const range = rangeOf("todo-app");
    const s0 = driveAt((range.start + range.end) / 2).carS;
    const discS = s0 + PLACEMENT.act1.along;
    let before = 0;
    let after = 1;
    for (let p = 0; p <= 1; p += 1e-4) {
      const revealS = revealSAt(p);
      const { placement } = placementOf("todo-app", p);
      if (revealS < discS) before = Math.max(before, placement.presence, placement.discOpacity);
      if (revealS > discS + REVEAL_FADE && driveAt(p).ending === 0) after = Math.min(after, placement.presence);
    }
    expect(before).toBe(0);
    expect(after).toBe(1);
  });

  it("2·3막은 카메라가 정류장 시점으로 도는 만큼 원반에서 떠오르고, 정류장을 떠나면 내려간다", () => {
    for (const id of ["stock2u", "tix2u", "pfplay", "pickcare/studio"]) {
      const range = rangeOf(id.split("/")[0]);
      const { placement: start } = placementOf(id, range.start + 1e-6);
      const { placement: middle } = placementOf(id, (range.start + range.end) / 2, 2);
      const { placement: end } = placementOf(id, range.end - 1e-6);
      expect(start.presence, id).toBeLessThan(1e-3);
      expect(middle.presence, id).toBe(1);
      expect(end.presence, id).toBeLessThan(1e-3);
      const quarter = range.start + (range.end - range.start) * 0.05;
      expect(placementOf(id, quarter, 2).placement.presence, id).toBeCloseTo(viewWeight(quarter), 6);
      // 떠오르는 동안 화면 가운데는 원반 위 DISC_LIFT에서 다 떠오른 높이 사이다
      const half = placementOf(id, quarter, 2).placement;
      const height = distance(half.center, half.disc);
      expect(height, id).toBeGreaterThan(DISC_LIFT);
      expect(height, id).toBeLessThan(distance(middle.center, middle.disc));
    }
  });

  // 원반이 열린 끝과 함께 먼저 나타나면 정류장 30~60m 앞에서 거의 옆으로 보여 떠 있는 짧은 선이 됐다(3막 제목 장면, 2막 바위 옆. 병합 뒤)
  it("2·3막 원반은 홀로그램이 처음 떠오를 때 함께 나타나고, 정류장을 떠난 뒤에도 남는다", () => {
    for (const id of ["stock2u", "tix2u", "pfplay", "pickcare/studio"]) {
      const stop = id.split("/")[0];
      const range = rangeOf(stop);
      expect(placementOf(id, range.start - 1e-6, 2).placement.discOpacity, `${id} 앞`).toBe(0);
      const entering = range.start + (range.end - range.start) * 0.05;
      expect(placementOf(id, entering, 2).placement.discOpacity, `${id} 들어섬`).toBeCloseTo(viewWeight(entering), 6);
      for (const t of [0.5, 0.95]) expect(placementOf(id, at(stop, t), 2).placement.discOpacity, `${id} ${t}`).toBe(1);
      expect(placementOf(id, range.end + 1e-6, 2).placement.discOpacity, `${id} 떠난 뒤`).toBe(1);
    }
  });

  it("3막 제목 자리에서는 PiCKCARE 원반이 보이지 않고, 1막 원반은 홀로그램과 함께 열린 끝을 따른다", () => {
    for (const hologram of HOLOGRAMS.filter((item) => item.act === 3)) {
      expect(placementOf(hologram.id, at("act-3", 0.5)).placement.discOpacity, hologram.id).toBe(0);
    }
    for (let p = 0; p < at("act-2", 0); p += 1e-3) {
      const { placement } = placementOf("kokoa-clone", p);
      expect(placement.discOpacity, p.toFixed(3)).toBeCloseTo(placement.presence, 9);
    }
  });

  it("2·3막 화면은 실제 카메라를 수직축으로만 돌아 향하고, 1막은 고정 지점을 향한다", () => {
    const { placement } = placementOf("stock2u", at("stock2u", 0.5));
    const camera: Vec3 = [placement.center[0] + 10, placement.center[1] + 4, placement.center[2] - 3];
    const basis = placementBasis(placement, camera);
    expect(basis.normal[1]).toBeCloseTo(0, 9);
    const toward = sub(camera, placement.center);
    expect(dot(basis.normal, [toward[0], 0, toward[2]]) / Math.hypot(toward[0], toward[2])).toBeCloseTo(1, 9);
    expect(basis.up[1]).toBeCloseTo(1, 9);
    const fixed = placementOf("todo-app", at("todo-app", 0.5)).placement;
    if (fixed.facing.kind !== "point") throw new Error("1막은 고정 지점을 향해야 합니다");
    const a = placementBasis(fixed, [0, 0, 0]).normal;
    const b = placementBasis(fixed, [500, 80, -40]).normal;
    a.forEach((value, axis) => expect(value).toBeCloseTo(b[axis], 12));
  });

  it("바라볼 곳이 바로 위·아래여서 수평 방향이 없어도 축이 유한하다(기본 방향 +z)", () => {
    const basis = screenBasis([0, -100, 0], [0, 0, 0], true);
    expect(basis.normal).toEqual([0, 0, 1]);
    for (const axis of [basis.right, basis.up, basis.normal]) for (const value of axis) expect(Number.isFinite(value)).toBe(true);
  });

  // 병합 뒤 엔딩은 은하 속 흰 점 하나만 남긴다(사용자 결정 "여정이 하나의 빛이 되다"). 원반도 차·풍경과 함께 사라진다
  it("엔딩에서는 모든 홀로그램이 원반 속으로 내려가 사라지고 원반도 사라진다", () => {
    for (const placement of hologramsAt(1, 4)) {
      expect(placement.presence, placement.id).toBe(0);
      expect(placement.discOpacity, placement.id).toBe(0);
      // 화면 가운데가 원반 위 DISC_LIFT까지 내려와 있다(1·2막은 도로의 위 방향, 3막은 수직)
      expect(distance(placement.center, placement.disc), placement.id).toBeCloseTo(DISC_LIFT, 6);
    }
  });

  it("어느 진행률에서도 홀로그램은 차와 카메라 목표 자세에서 떨어져 있다", () => {
    for (let p = 0; p <= 1; p += 1 / 800) {
      const state = driveAt(p);
      const placements = hologramsAt(p, 2);
      placements.forEach((placement, index) => {
        if (placement.presence === 0) return;
        const corners = imageCorners(HOLOGRAMS[index], placement, state.camera.position);
        for (const point of [placement.center, ...corners]) {
          expect(distance(point, carCenter(state.car)), `${placement.id} p=${p.toFixed(4)}`).toBeGreaterThan(3);
          expect(distance(point, state.camera.position), `${placement.id} p=${p.toFixed(4)}`).toBeGreaterThan(3);
        }
      });
    }
  });
});

describe("홀로그램 안전 영역(16:9·16:10)", () => {
  it("1막은 다가가는 동안 헤더와 캡션 패널을 피한다", () => {
    for (const id of ["kokoa-clone", "todo-app", "eutcha"]) {
      const side = objectSide(rangeOf(id).stop);
      for (const t of [0, 0.25]) {
        const p = at(id, t);
        const { placement, index } = placementOf(id, p);
        const pose = driveAt(p).camera;
        for (const aspect of ASPECTS) {
          const rect = screenRect(pose, imageCorners(HOLOGRAMS[index], placement, pose.position), aspect);
          const label = `${id} t=${t} ${aspect.toFixed(2)} → ${rect.map((value) => value.toFixed(3))}`;
          expect(rect[1], label).toBeGreaterThan(HEADER_BOTTOM);
          if (side === 1) expect(rect[0], label).toBeGreaterThan(CAPTION_SPAN);
          else expect(rect[2], label).toBeLessThan(1 - CAPTION_SPAN);
          expect(rect[0], label).toBeGreaterThan(0);
          expect(rect[2], label).toBeLessThan(1);
        }
      }
    }
  });

  it("2막은 머묾이 가장 클 때 헤더·요약 패널·차를 피해 화면 안에 든다", () => {
    for (const id of ["stock2u", "tix2u", "pfplay"]) {
      const side = objectSide(rangeOf(id).stop);
      const p = at(id, 0.5);
      const { placement, index } = placementOf(id, p);
      const pose = driveAt(p).camera;
      for (const aspect of ASPECTS) {
        const rect = screenRect(pose, imageCorners(HOLOGRAMS[index], placement, pose.position), aspect);
        const label = `${id} ${aspect.toFixed(2)} → ${rect.map((value) => value.toFixed(3))}`;
        expect(rect[1], label).toBeGreaterThan(HEADER_BOTTOM);
        expect(rect[3], label).toBeLessThan(0.94);
        expect(rect[0], label).toBeGreaterThan(0.03);
        expect(rect[2], label).toBeLessThan(0.97);
        if (side === 1) expect(rect[0], label).toBeGreaterThan(EXHIBIT_SPAN);
        else expect(rect[2], label).toBeLessThan(1 - EXHIBIT_SPAN);
        expect(overlaps(rect, carRect(p, aspect)), label).toBe(false);
      }
    }
  });

  it("PiCKCARE 뒷줄은 머묾이 가장 클 때 헤더를 피하고 차 앞을 가리지 않는다(앞줄은 아래 본문 배치 모형에서 본다)", () => {
    const p = at("pickcare", 0.5);
    const state = driveAt(p);
    const pose = state.camera;
    const forward = sub(pose.target, pose.position);
    const depth = (point: Vec3) => dot(sub(point, pose.position), forward) / Math.hypot(...forward);
    for (let front = 0; front < REPO_COUNT; front++) {
      const placements = hologramsAt(p, front);
      HOLOGRAMS.forEach((hologram, index) => {
        if (hologram.act !== 3 || hologram.id === REPO_IDS[front]) return;
        const placement = placements[index];
        for (const aspect of ASPECTS) {
          const rect = screenRect(pose, imageCorners(hologram, placement, pose.position), aspect);
          const label = `앞줄 ${front} ${hologram.id} ${aspect.toFixed(2)} → ${rect.map((value) => value.toFixed(3))}`;
          if (!(rect[2] > 0 && rect[0] < 1 && rect[3] > 0 && rect[1] < 1)) continue;
          expect(rect[1], label).toBeGreaterThan(HEADER_BOTTOM);
          if (overlaps(rect, carRect(p, aspect))) expect(depth(placement.center), label).toBeGreaterThan(depth(state.car.position) + 2);
        }
      });
    }
  });
});

// ── PiCKCARE 저장소 패널과 앞줄(본문 배치 모형) ───────────────────

const REPO_IDS = HOLOGRAMS.filter((hologram) => hologram.act === 3).map((hologram) => hologram.id);
const HALL = rangeOf("pickcare");
/** 패널 아래끝은 블록 아래끝에서 12svh 위다(JourneyContent HallStop의 pb-[12svh]) */
const REPO_PANEL_PAD = 0.12;
const HALL_STEP = 0.0025;
/** 가독성 회귀 기준: 저장소마다 읽기 구간이 이만큼(화면) 이상이다. 1.2/0.7 배치에서 잰 가장 짧은 값은 0.45화면 */
const MIN_READING_SCREENS = 0.4;

interface HallLayout {
  aspect: number;
  /** 헤더 아래끝 */
  header: number;
  /** 위에 머무는 소개 패널 */
  intro: Rect;
  /** 저장소 패널의 가로(왼쪽, 오른쪽)와 다섯 패널의 높이 */
  repoX: [number, number];
  heights: number[];
}

/**
 * 네 화면 크기에서 실제 빌드를 잰 PiCKCARE 본문 패널(화면 비율, 2026-10-16). 패널의 세로 자리는 아래 repoPanels가 배치 규칙
 * (HALL_REPO_START·HALL_REPO_END·블록 높이·12svh)으로 계산하고, e2e가 같은 규칙을 실제 DOM과 대조한다.
 */
const HALL_LAYOUTS: Record<string, HallLayout> = {
  "1280x720": {
    aspect: 1280 / 720,
    header: 0.0792,
    intro: [0.0125, 0.1111, 0.3625, 0.325],
    repoX: [0.6875, 0.9875],
    heights: [0.2431, 0.2431, 0.2431, 0.2431, 0.2708],
  },
  "1920x1080": {
    aspect: 1920 / 1080,
    header: 0.0528,
    intro: [0.175, 0.0741, 0.4083, 0.2167],
    repoX: [0.625, 0.825],
    heights: [0.162, 0.162, 0.162, 0.162, 0.1806],
  },
  "1280x800": {
    aspect: 1280 / 800,
    header: 0.0712,
    intro: [0.0125, 0.1, 0.3625, 0.2925],
    repoX: [0.6875, 0.9875],
    heights: [0.2188, 0.2188, 0.2188, 0.2188, 0.2437],
  },
  "1440x900": {
    aspect: 1440 / 900,
    header: 0.0633,
    intro: [0.0667, 0.0889, 0.3778, 0.26],
    repoX: [0.6667, 0.9333],
    heights: [0.1944, 0.1944, 0.1944, 0.1944, 0.2167],
  },
};

/** PiCKCARE 안의 위치 t(0~1)에서 저장소 패널 다섯의 자리. 구역 위끝은 화면 위에서 −L·t 화면이다 */
function repoPanels(layout: HallLayout, t: number): Rect[] {
  const length = HALL.stop.length;
  const block = (length - HALL_REPO_START - HALL_REPO_END) / REPO_COUNT;
  return layout.heights.map((height, index) => {
    const bottom = HALL_REPO_START + (index + 1) * block - REPO_PANEL_PAD - length * t;
    return [layout.repoX[0], bottom - height, layout.repoX[1], bottom];
  });
}

interface HallSample {
  t: number;
  /** 조금이라도 보이는 저장소 패널, 화면 안에 다 들어온 저장소 패널 */
  shown: number[];
  full: number[];
  front: number;
  /** 앞줄 홀로그램 그림 영역의 문제(없으면 빈 목록) */
  problems: string[];
}

function hallSamples(layout: HallLayout): HallSample[] {
  const samples: HallSample[] = [];
  for (let t = -0.1; t <= 1 + 1e-9; t += HALL_STEP) {
    const progress = HALL.start + (HALL.end - HALL.start) * t;
    const panels = repoPanels(layout, t);
    const shown = panels.flatMap((rect, index) => (rect[3] > layout.header && rect[1] < 1 ? [index] : []));
    const full = panels.flatMap((rect, index) => (rect[1] >= layout.header && rect[3] <= 1 ? [index] : []));
    const front = pickcareFront(progress, "");
    const index = HOLOGRAMS.findIndex((hologram) => hologram.id === REPO_IDS[front]);
    const placement = hologramsAt(progress, front)[index];
    const pose = driveAt(progress).camera;
    const image = screenRect(pose, imageCorners(HOLOGRAMS[index], placement, pose.position), layout.aspect);
    const problems: string[] = [];
    if (placement.presence < 0.99) problems.push("떠오르는 중");
    if (image[0] < 0 || image[2] > 1 || image[3] > 1) problems.push("화면 밖");
    if (image[1] < layout.header) problems.push("헤더");
    if (overlaps(image, layout.intro)) problems.push("소개 패널");
    for (const panel of shown) if (overlaps(image, panels[panel])) problems.push(`저장소 패널 ${panel}`);
    if (overlaps(image, carRect(progress, layout.aspect))) problems.push("차");
    samples.push({ t, shown, full, front, problems });
  }
  return samples;
}

const HALL_SAMPLES = Object.fromEntries(Object.entries(HALL_LAYOUTS).map(([name, layout]) => [name, hallSamples(layout)]));

/** 읽기 구간: 그 패널만 화면 안에 다 들어와 있다(다른 패널은 일부만 보일 수 있다) */
function reading(samples: HallSample[], panel: number): HallSample[] {
  return samples.filter((sample) => sample.full.length === 1 && sample.full[0] === panel);
}

/** 엄격한 단독 노출 구간: 그 패널만 조금이라도 보인다 */
function alone(samples: HallSample[], panel: number): HallSample[] {
  return samples.filter((sample) => sample.shown.length === 1 && sample.shown[0] === panel);
}

describe("PiCKCARE 저장소 패널과 앞줄(본문 배치 모형, 네 화면 크기)", () => {
  it("저장소 패널은 앞에서 1.2화면 늦게 시작하고 뒤에서 0.7화면 일찍 끝나며, 앞줄 판정이 같은 구간을 쓴다", () => {
    expect([HALL_REPO_START, HALL_REPO_END]).toEqual([1.2, 0.7]);
    const atScreens = (screens: number) => HALL.start + ((HALL.end - HALL.start) * screens) / HALL.stop.length;
    expect(hallRepoProgress(atScreens(HALL_REPO_START))).toBeCloseTo(0, 9);
    expect(hallRepoProgress(atScreens(HALL.stop.length - HALL_REPO_END))).toBeCloseTo(1, 9);
  });

  it("저장소마다 읽기 구간이 0.4화면 이상이고, 그동안 패널은 헤더 아래 화면 안에서 소개 패널과 겹치지 않는다(가독성 회귀 기준)", () => {
    for (const [name, samples] of Object.entries(HALL_SAMPLES)) {
      const layout = HALL_LAYOUTS[name];
      for (let panel = 0; panel < REPO_COUNT; panel++) {
        const rows = reading(samples, panel);
        const screens = rows.length * HALL_STEP * HALL.stop.length;
        expect(screens, `${name} ${REPO_IDS[panel]}`).toBeGreaterThanOrEqual(MIN_READING_SCREENS);
        for (const row of rows) expect(overlaps(repoPanels(layout, row.t)[panel], layout.intro), `${name} ${REPO_IDS[panel]} t=${row.t.toFixed(4)}`).toBe(false);
      }
    }
  });

  it("읽기 구간 내내 앞줄은 그 저장소이고, 앞줄 홀로그램은 다 떠올라 화면 안에서 헤더·소개 패널·저장소 패널·차를 피한다", () => {
    for (const [name, samples] of Object.entries(HALL_SAMPLES)) {
      for (let panel = 0; panel < REPO_COUNT; panel++) {
        for (const row of reading(samples, panel)) {
          const label = `${name} ${REPO_IDS[panel]} t=${row.t.toFixed(4)}`;
          expect(row.front, label).toBe(panel);
          expect(row.problems, label).toEqual([]);
        }
      }
    }
  });

  it("앞줄 전환은 저장소 i의 읽기 구간이 끝난 뒤, i+1의 읽기 구간이 시작하기 전(같을 수 있다)에 일어난다. 0.76은 네 화면 크기의 모든 전환 틈이 허용하는 범위(0.71~0.81)의 가운데라 양쪽에 0.03 이상 여유가 있다", () => {
    let lowest = -Infinity;
    let highest = Infinity;
    for (const [name, samples] of Object.entries(HALL_SAMPLES)) {
      for (let panel = 0; panel < REPO_COUNT - 1; panel++) {
        const before = reading(samples, panel);
        const after = reading(samples, panel + 1);
        const end = before[before.length - 1].t;
        const start = after[0].t;
        const switchAt = samples.find((sample, index) => index > 0 && samples[index - 1].front === panel && sample.front === panel + 1)?.t;
        const label = `${name} ${REPO_IDS[panel]}→${REPO_IDS[panel + 1]}: 읽기 끝 ${end.toFixed(4)}, 전환 ${switchAt?.toFixed(4)}, 다음 읽기 시작 ${start.toFixed(4)}`;
        expect(switchAt, label).toBeGreaterThan(end);
        expect(switchAt, label).toBeLessThanOrEqual(start);
        // 앞줄이 i+1이 되는 조건 5u + lead ≥ i+1에서, 이 틈 안에서 바뀌게 하는 lead의 범위
        const u = (t: number) => hallRepoProgress(HALL.start + (HALL.end - HALL.start) * t);
        lowest = Math.max(lowest, panel + 1 - REPO_COUNT * u(start));
        highest = Math.min(highest, panel + 1 - REPO_COUNT * u(end));
      }
    }
    expect(FRONT_LEAD).toBe(0.76);
    const range = `허용 범위 ${lowest.toFixed(3)} ~ ${highest.toFixed(3)}`;
    expect(FRONT_LEAD - lowest, range).toBeGreaterThanOrEqual(0.03);
    expect(highest - FRONT_LEAD, range).toBeGreaterThanOrEqual(0.03);
  });

  it("엄격한 단독 노출(그 패널만 조금이라도 보이는 동안)은 100% 깨끗하지 않다: 남는 것은 frontend가 막 들어올 때 홀로그램이 떠오르는 중(·헤더)과 cardnews가 나갈 때 소개 패널과 겹치는 것뿐이다", () => {
    const allowed: string[][] = [["떠오르는 중", "헤더"], [], [], [], ["소개 패널"]];
    for (const [name, samples] of Object.entries(HALL_SAMPLES)) {
      for (let panel = 0; panel < REPO_COUNT; panel++) {
        const rows = alone(samples, panel);
        const read = reading(samples, panel);
        const bad = rows.filter((row) => row.front !== panel || row.problems.length > 0);
        for (const row of bad) {
          const label = `${name} ${REPO_IDS[panel]} t=${row.t.toFixed(4)} 앞줄 ${row.front} ${row.problems.join(",")}`;
          expect(row.front, label).toBe(panel);
          for (const problem of row.problems) expect(allowed[panel], label).toContain(problem);
          // 남는 겹침은 읽기 구간 밖(frontend는 읽기 전, cardnews는 읽기 뒤)에만 있다
          if (panel === 0) expect(row.t, label).toBeLessThan(read[0].t);
          if (panel === REPO_COUNT - 1) expect(row.t, label).toBeGreaterThan(read[read.length - 1].t);
        }
        expect(1 - bad.length / rows.length, `${name} ${REPO_IDS[panel]} 깨끗한 몫`).toBeGreaterThanOrEqual(0.7);
      }
    }
  });
});
