import { describe, expect, it } from "vitest";
import { ROAD_END, ROAD_START, driveAt, endingPoint, roadFrame, roadPoint, stopScreenSide, toCarFrame, type CameraPose } from "./drive";
import { HOLOGRAMS, hologramsAt, imageCorners, pickcareFront } from "./holograms";
import { PORTRAIT_LENS, WIDE_LENS, lensFor, projectThrough } from "./lens";
import { CARDS, activeCard, cardProgress, followPortrait, portraitCamera, portraitViewWeight, stopFocus, type PortraitView } from "./portrait";
import { OVERVIEW_ARRIVAL, SCROLL_LENGTH, STOP_RANGES, rangeOf, stopAt, viewWeight, type Vec3 } from "./timeline";

/** 세로 화면 네 크기(스펙 3절 "세로 화면") */
const SIZES = [
  [390, 844],
  [360, 800],
  [430, 932],
  [820, 1180],
] as const;
/** 헤더(56px)와 그 아래 세로 화면 진행 막대(24px)의 아래끝(px) */
const TOP_PX = 80;
/** 화면 위 60%: 아래 40%는 본문 카드 자리다 */
const LIMIT = 0.6;

function at(id: string, within: number): number {
  const range = rangeOf(id);
  return range.start + (range.end - range.start) * within;
}

/** 차 몸통을 감싸는 상자의 꼭짓점 여덟(차 자리 기준: 뒤 1.94·앞 2.42m, 양옆 1m, 높이 1.3m) */
function carBody(progress: number): Vec3[] {
  const { car } = driveAt(progress);
  const points: Vec3[] = [];
  for (const forward of [-1.94, 2.42]) {
    for (const side of [-1, 1]) {
      for (const up of [0, 1.3]) {
        points.push([0, 1, 2].map((i) => car.position[i] + car.tangent[i] * forward + car.right[i] * side + car.up[i] * up) as Vec3);
      }
    }
  }
  return points;
}

/** 정류장 홀로그램(PiCKCARE는 앞줄 하나)의 그림 영역 네 모서리 */
function hologramImage(progress: number, pose: CameraPose): Vec3[] {
  const { range } = stopAt(progress);
  const front = pickcareFront(progress, "");
  const placements = hologramsAt(progress, front);
  const indices = HOLOGRAMS.flatMap((hologram, index) => (hologram.stopId === range.stop.id ? [index] : []));
  const shown = range.stop.kind === "hall" ? [indices[front]] : indices;
  return shown.flatMap((index) => imageCorners(HOLOGRAMS[index], placements[index], pose.position));
}

/** 정류장 읽기 자리: 프로젝트 정류장은 30·50·70%, PiCKCARE는 저장소마다 카드가 보이는 자리 */
const READING: { label: string; progress: number }[] = [
  ...STOP_RANGES.filter((range) => range.stop.kind === "project").flatMap((range) =>
    [0.3, 0.5, 0.7].map((within) => ({ label: `${range.stop.id} ${within}`, progress: at(range.stop.id, within) })),
  ),
  ...HOLOGRAMS.filter((hologram) => hologram.act === 3).map((hologram) => ({ label: hologram.id, progress: cardProgress(hologram.id) })),
];

function bounds(points: Vec3[], pose: CameraPose, aspect: number) {
  const screen = points.map((point) => projectThrough(pose, point, aspect, PORTRAIT_LENS));
  return {
    left: Math.min(...screen.map((item) => item.x)),
    right: Math.max(...screen.map((item) => item.x)),
    top: Math.min(...screen.map((item) => item.y)),
    bottom: Math.max(...screen.map((item) => item.y)),
    behind: screen.some((item) => item.depth <= 0),
  };
}

describe("렌즈", () => {
  it("가로가 세로보다 좁으면 세로 화면 렌즈(세로 시야각 58°, 투영 중심 위 29%), 아니면 가로 화면 렌즈다", () => {
    expect(PORTRAIT_LENS).toEqual({ fov: 58, center: 0.29 });
    expect(WIDE_LENS).toEqual({ fov: 50, center: 0.5 });
    expect(lensFor(390, 844)).toBe(PORTRAIT_LENS);
    expect(lensFor(820, 1180)).toBe(PORTRAIT_LENS);
    expect(lensFor(1440, 900)).toBe(WIDE_LENS);
    expect(lensFor(800, 800)).toBe(WIDE_LENS);
  });

  it("시선 목표는 화면 가로 가운데, 위에서 투영 중심 비율 자리에 맺힌다", () => {
    const pose = portraitCamera(driveAt(at("stock2u", 0.5)));
    const target = projectThrough(pose, pose.target, 390 / 844, PORTRAIT_LENS);
    expect(target.x).toBeCloseTo(0.5, 9);
    expect(target.y).toBeCloseTo(0.29, 9);
  });
});

describe("세로 화면 카메라 목표 자세", () => {
  it("같은 진행률이면 같은 자세이고, 가로 화면 자세(driveAt의 camera)는 그대로다", () => {
    for (const progress of [0, 0.1, at("kokoa-clone", 0.5), at("pfplay", 0.9), at("pickcare", 0.5), 1]) {
      const state = driveAt(progress);
      const before = JSON.stringify(state.camera);
      expect(portraitCamera(state)).toEqual(portraitCamera(driveAt(progress)));
      expect(JSON.stringify(state.camera)).toBe(before);
    }
  });

  it("네 화면 크기의 정류장 읽기 자리에서 차 몸통 전체와 홀로그램 그림 영역 전체가 헤더 아래·화면 위 60% 안이다", () => {
    for (const [width, height] of SIZES) {
      const top = TOP_PX / height;
      for (const { label, progress } of READING) {
        const pose = portraitCamera(driveAt(progress));
        const all = bounds([...carBody(progress), ...hologramImage(progress, pose)], pose, width / height);
        const name = `${width}x${height} ${label}`;
        expect(all.behind, name).toBe(false);
        expect(all.left, name).toBeGreaterThan(0);
        expect(all.right, name).toBeLessThan(1);
        expect(all.top, name).toBeGreaterThan(top);
        expect(all.bottom, name).toBeLessThan(LIMIT);
      }
    }
  });

  it("엔딩 내려다보기에서 길 전체가 헤더 아래부터 화면 위 60% 안(y 0.10~0.57, x 0.03~0.97)에 든다", () => {
    // 내려다보기는 상승이 끝나는 자리다. 그 뒤 카메라는 흰 점으로 다가간다(병합 뒤)
    const pose = portraitCamera(driveAt(at("ending", OVERVIEW_ARRIVAL)));
    const road: Vec3[] = [];
    for (let s = ROAD_START; s <= ROAD_END; s += 2) {
      const half = roadFrame(s).width / 2;
      road.push(roadPoint(s, -half), roadPoint(s, half));
    }
    for (const [width, height] of SIZES) {
      const all = bounds(road, pose, width / height);
      const name = `${width}x${height}`;
      expect(all.left, name).toBeGreaterThan(0.03);
      expect(all.right, name).toBeLessThan(0.97);
      expect(all.top, name).toBeGreaterThan(0.1);
      expect(all.bottom, name).toBeLessThan(0.57);
    }
  });

  // 엔딩 끝(병합 뒤): 세로 화면은 연락처 패널이 아래쪽이라 흰 점을 위쪽 가운데(헤더·진행 막대 아래)에 둔다
  it("엔딩 끝에서 흰 점은 위쪽 가운데(x 0.4~0.6, y 0.15~0.35)에 있다", () => {
    const pose = portraitCamera(driveAt(1));
    for (const [width, height] of SIZES) {
      const point = projectThrough(pose, endingPoint(), width / height, lensFor(width, height));
      const name = `${width}x${height} → (${point.x.toFixed(3)}, ${point.y.toFixed(3)})`;
      expect(point.x, name).toBeGreaterThan(0.4);
      expect(point.x, name).toBeLessThan(0.6);
      expect(point.y, name).toBeGreaterThan(Math.max(0.15, TOP_PX / height));
      expect(point.y, name).toBeLessThan(0.35);
    }
  });

  it("정류장마다 카메라는 홀로그램 반대쪽으로만 돈다(경계에서 도는 방향이 뒤집히지 않는다)", () => {
    for (const range of STOP_RANGES) {
      if (!HOLOGRAMS.some((hologram) => hologram.stopId === range.stop.id)) continue;
      for (let within = 0; within <= 1; within += 0.01) {
        const progress = range.start + (range.end - range.start) * within;
        if (portraitViewWeight(progress) < 0.02) continue;
        const state = driveAt(progress);
        const pose = portraitCamera(state);
        const offset = [0, 1, 2].map((i) => pose.position[i] - state.car.position[i]);
        const side = Math.sign(offset[0] * state.car.right[0] + offset[1] * state.car.right[1] + offset[2] * state.car.right[2]);
        expect(side, `${range.stop.id} ${within.toFixed(2)}`).toBe(-stopScreenSide(range.stop));
      }
    }
  });

  it("1막(멈추지 않는 정류장)은 세로 화면에서만 정류장 30~70%에서 홀로그램 쪽으로 돌고 앞뒤 끝에서는 돌지 않는다. 멈추는 정류장은 viewWeight 그대로다", () => {
    for (const id of ["kokoa-clone", "todo-app", "eutcha"]) {
      expect(portraitViewWeight(at(id, 0)), id).toBe(0);
      expect(portraitViewWeight(at(id, 1)), id).toBe(0);
      expect(portraitViewWeight(at(id, 0.3)), id).toBe(1);
      expect(portraitViewWeight(at(id, 0.7)), id).toBe(1);
      expect(viewWeight(at(id, 0.5)), id).toBe(0);
    }
    for (const progress of [at("stock2u", 0.1), at("tix2u", 0.5), at("pickcare", 0.05), at("act-2", 0.5)]) {
      expect(portraitViewWeight(progress)).toBe(viewWeight(progress));
    }
  });

  it("PFPlay에서 주행으로 돌아오는 전환과 여정 전체를 빠르게 앞뒤로 지나도(60·120Hz) 차 몸통이 화면 높이의 35% 이하이고 가운데가 x 0.15~0.85다", () => {
    const ranges: [number, number, number][] = [
      [at("pfplay", 0.5), at("act-3", 1), 1],
      [at("act-3", 1), at("pfplay", 0.5), 1],
      [0, at("ending", 0), 0.5],
      [at("ending", 0), 0, 0.5],
    ];
    for (const [from, to, secondsPerScreen] of ranges) {
      for (const hz of [60, 120]) {
        const step = (to > from ? 1 : -1) / (SCROLL_LENGTH * secondsPerScreen * hz);
        let follow: PortraitView | null = null;
        for (let progress = from; to > from ? progress <= to : progress >= to; progress += step) {
          const state = driveAt(progress);
          const next = followPortrait(follow, state, 1 / hz);
          follow = next.follow;
          const car = bounds(carBody(progress), next.pose, 390 / 844);
          const name = `${hz}Hz ${from.toFixed(3)}→${to.toFixed(3)} p=${progress.toFixed(4)}`;
          expect(car.behind, name).toBe(false);
          expect(car.bottom - car.top, name).toBeLessThanOrEqual(0.35);
          expect((car.left + car.right) / 2, name).toBeGreaterThan(0.15);
          expect((car.left + car.right) / 2, name).toBeLessThan(0.85);
        }
      }
    }
  });

  it("여정을 0.5·1·2화면/s로 앞뒤로 지나도(60·120Hz) 세로 카메라가 한 프레임에 튀지 않는다(정류장 경계 포함)", () => {
    // 차 기준 카메라 자리가 한 프레임에 움직인 거리를 재서, 앞뒤 10프레임 가운데 가장 큰 움직임의 2배(작으면 5cm)를 넘는 프레임이 없어야 한다.
    // 이웃 정류장은 홀로그램이 반대쪽이라 정류장 방위각의 부호가 뒤집힌다. 그 경계에서 돈 정도가 0으로 끊기면 거리·높이·시선이 한 프레임에 튄다
    const end = rangeOf("ending").start;
    for (const screensPerSecond of [0.5, 1, 2]) {
      for (const hz of [60, 120]) {
        for (const forward of [true, false]) {
          const step = screensPerSecond / (SCROLL_LENGTH * hz);
          let follow: PortraitView | null = null;
          let previous: Vec3 | null = null;
          const moves: { distance: number; progress: number }[] = [];
          for (let index = 0; index * step <= end; index++) {
            const progress = forward ? index * step : end - index * step;
            const state = driveAt(progress);
            const next = followPortrait(follow, state, 1 / hz);
            follow = next.follow;
            const local = toCarFrame(state.car, next.pose.position);
            if (previous) {
              const from = previous;
              moves.push({ distance: Math.hypot(...local.map((value, axis) => value - from[axis])), progress });
            }
            previous = local;
          }
          const spike = moves.find(({ distance }, index) => {
            const around = moves.slice(Math.max(0, index - 10), index + 11).filter((_, k) => k !== Math.min(index, 10));
            return distance > Math.max(2 * Math.max(...around.map((move) => move.distance)), 0.05);
          });
          expect(spike?.progress, `${screensPerSecond}화면/s ${hz}Hz ${forward ? "앞으로" : "뒤로"}`).toBeUndefined();
        }
      }
    }
  });
});

describe("정류장 홀로그램 자리 기억(2-4b)", () => {
  it("정류장과 앞줄 번호로 기억해도 정류장 가운데에서 다 떠오른 홀로그램 자리를 매번 새로 계산한 것과 같다", () => {
    for (const hash of ["", "#pickcare/app", "#pickcare/frontend"]) {
      for (let index = 0; index <= 400; index++) {
        const progress = index / 400;
        const { range } = stopAt(progress);
        const indices = HOLOGRAMS.flatMap((hologram, at) => (hologram.stopId === range.stop.id ? [at] : []));
        const front = pickcareFront(progress, hash);
        const expected =
          indices.length === 0 ? null : hologramsAt((range.start + range.end) / 2, front)[range.stop.kind === "hall" ? indices[front] : indices[0]].center;
        expect(stopFocus(progress, hash), `${hash} ${progress}`).toEqual(expected);
      }
    }
  });
});

describe("아래 고정 카드", () => {
  it("정류장 가운데에서는 그 정류장의 카드이고, 엔딩에는 카드가 없다", () => {
    for (const range of STOP_RANGES) {
      const middle = (range.start + range.end) / 2;
      if (range.stop.kind === "ending") expect(activeCard(middle, "")).toBeNull();
      else if (range.stop.kind !== "hall") expect(activeCard(middle, ""), range.stop.id).toBe(range.stop.id);
    }
  });

  it("PiCKCARE는 저장소 패널 구간 0.25화면 앞까지 소개 카드, 그 뒤로는 홀로그램 앞줄(pickcareFront)과 같은 저장소 카드다", () => {
    const range = rangeOf("pickcare");
    for (let index = 0; index < 200; index++) {
      const within = index / 200;
      const progress = range.start + (range.end - range.start) * within;
      const screens = within * range.stop.length;
      // 경계(0.95화면)는 진행률 환산의 반올림으로 어느 쪽이든 될 수 있어 건너뛴다
      if (Math.abs(screens - (1.2 - 0.25)) < 1e-6) continue;
      const expected = screens < 1.2 - 0.25 ? "pickcare" : HOLOGRAMS.filter((hologram) => hologram.act === 3)[pickcareFront(progress, "")].id;
      expect(activeCard(progress, ""), within.toFixed(3)).toBe(expected);
    }
    expect(activeCard(at("pickcare", 0.5), "#pickcare/app")).toBe("pickcare/app");
  });

  it("카드마다 보이는 자리(cardProgress)에서 그 카드가 고른다", () => {
    expect(CARDS).toHaveLength(16);
    for (const card of CARDS) expect(activeCard(cardProgress(card), ""), card).toBe(card);
  });
});
