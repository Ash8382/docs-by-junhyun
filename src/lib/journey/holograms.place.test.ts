import { describe, expect, it } from "vitest";
import { carCenter, driveAt, revealSAt, roadFrame, roadPoint, type CameraPose } from "./drive";
import {
  DISC_LIFT,
  HOLOGRAMS,
  PLACEMENT,
  REVEAL_FADE,
  hologramsAt,
  imageCorners,
  placementBasis,
  screenBasis,
  type HologramPlacement,
} from "./holograms";
import { CAMERA_FOV, objectSide, rangeOf, viewWeight, type Vec3 } from "./timeline";

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
/** PiCKCARE 소개 패널(왼쪽 위)과 저장소 패널(오른쪽) */
const HALL_INTRO: Rect = [0, 0.06, 0.41, 0.33];
const HALL_REPO: Rect = [0.62, 0.3, 1, 0.59];

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

  it("엔딩에서는 모든 홀로그램이 원반 속으로 내려가 사라지고 원반은 남는다", () => {
    for (const placement of hologramsAt(1, 4)) {
      expect(placement.presence, placement.id).toBe(0);
      expect(placement.discOpacity, placement.id).toBe(1);
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

  it("PiCKCARE 앞줄은 머묾이 가장 클 때 소개·저장소 패널 사이에 들고, 뒷줄은 헤더를 피하고 차 앞을 가리지 않는다", () => {
    const p = at("pickcare", 0.5);
    const state = driveAt(p);
    const pose = state.camera;
    const forward = sub(pose.target, pose.position);
    const depth = (point: Vec3) => dot(sub(point, pose.position), forward) / Math.hypot(...forward);
    for (let front = 0; front < 5; front++) {
      const placements = hologramsAt(p, front);
      HOLOGRAMS.forEach((hologram, index) => {
        if (hologram.act !== 3) return;
        const placement = placements[index];
        for (const aspect of ASPECTS) {
          const rect = screenRect(pose, imageCorners(hologram, placement, pose.position), aspect);
          const label = `앞줄 ${front} ${hologram.id} ${aspect.toFixed(2)} → ${rect.map((value) => value.toFixed(3))}`;
          const onScreen = rect[2] > 0 && rect[0] < 1 && rect[3] > 0 && rect[1] < 1;
          const car = carRect(p, aspect);
          if (`pickcare/${["frontend", "biz", "studio", "app", "cardnews"][front]}` === hologram.id) {
            expect(rect[1], label).toBeGreaterThan(HEADER_BOTTOM);
            expect(overlaps(rect, HALL_INTRO), label).toBe(false);
            expect(overlaps(rect, HALL_REPO), label).toBe(false);
            expect(overlaps(rect, car), label).toBe(false);
          } else if (onScreen) {
            expect(rect[1], label).toBeGreaterThan(HEADER_BOTTOM);
            if (overlaps(rect, car)) expect(depth(placement.center), label).toBeGreaterThan(depth(state.car.position) + 2);
          }
        }
      });
    }
  });
});
