import { describe, expect, it } from "vitest";
import {
  BANK_LIMIT,
  CAMERA_CLEARANCE,
  CAR_END,
  REVEAL_LEAD,
  REVEAL_MIN_GAP,
  ROAD_END,
  ROAD_START,
  ROAD_WIDTHS,
  carCenter,
  carSAt,
  driveAt,
  followCamera,
  fromCarFrame,
  keepClear,
  revealSAt,
  roadFrame,
  roadPoint,
  speedAt,
  stopScreenSide,
  toCarFrame,
  type CameraFollow,
  type CameraPose,
  type DriveState,
} from "./drive";
import { CAMERA_FOV, SCROLL_LENGTH, STOP_RANGES, dwellWeight, overviewWeight, rangeOf, type Vec3 } from "./timeline";

const STEPS = 4000;
const progresses = Array.from({ length: STEPS + 1 }, (_, index) => index / STEPS);

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(...sub(a, b));
}

function at(id: string, t: number): number {
  const range = rangeOf(id);
  return range.start + (range.end - range.start) * t;
}

describe("도로", () => {
  it("s는 중심선을 따라 누적한 거리다", () => {
    for (let s = ROAD_START; s < ROAD_END - 5; s += 3.7) {
      let length = 0;
      for (let step = 0; step < 100; step++) {
        length += distance(roadFrame(s + step * 0.05).position, roadFrame(s + (step + 1) * 0.05).position);
      }
      expect(length, `s=${s}`).toBeCloseTo(5, 2);
    }
    for (const value of roadFrame(0).position) expect(value).toBeCloseTo(0, 9);
  });

  it("위치·접선·곡률·뱅킹이 끊기지 않는다", () => {
    const h = 0.05;
    for (let s = ROAD_START; s < ROAD_END - h; s += h) {
      const a = roadFrame(s);
      const b = roadFrame(s + h);
      expect(distance(a.position, b.position), `s=${s}`).toBeLessThan(h * 1.01);
      expect(distance(a.tangent, b.tangent), `s=${s}`).toBeLessThan(h * 0.1);
      expect(Math.abs(a.curvature - b.curvature), `s=${s}`).toBeLessThan(h * 0.01);
      expect(Math.abs(a.bank - b.bank), `s=${s}`).toBeLessThan(h * 0.05);
    }
  });

  it("좌우 가장자리도 같은 s로 앞으로만 나아가고 접히지 않는다", () => {
    for (let s = ROAD_START; s < ROAD_END; s += 0.5) {
      const frame = roadFrame(s);
      for (const side of [-1, 1]) {
        const here = roadPoint(s, (side * frame.width) / 2);
        const next = roadPoint(s + 0.5, (side * roadFrame(s + 0.5).width) / 2);
        expect(dot(sub(next, here), frame.tangent), `s=${s} side=${side}`).toBeGreaterThan(0.25);
      }
      expect(Math.abs(frame.curvature) * (frame.width / 2), `s=${s}`).toBeLessThan(0.5);
    }
  });

  it("굽는 안쪽으로 기울고 기울기는 한도 안이다", () => {
    for (let s = ROAD_START; s < ROAD_END; s += 0.5) {
      const frame = roadFrame(s);
      expect(Math.abs(frame.bank)).toBeLessThanOrEqual(BANK_LIMIT);
      expect(frame.bank * frame.curvature, `s=${s}`).toBeLessThanOrEqual(0);
      expect(dot(frame.right, frame.up)).toBeCloseTo(0, 9);
      expect(dot(frame.right, frame.tangent)).toBeCloseTo(0, 9);
    }
  });

  it("폭은 1막 6m, 2막 10m, 3막 16m다", () => {
    expect(roadFrame(carSAt(at("kokoa-clone", 0.5))).width).toBe(ROAD_WIDTHS[0]);
    expect(roadFrame(carSAt(at("tix2u", 0.5))).width).toBeCloseTo(ROAD_WIDTHS[1], 9);
    expect(roadFrame(carSAt(at("pickcare", 0.5))).width).toBeCloseTo(ROAD_WIDTHS[2], 9);
  });
});

describe("driveAt", () => {
  it("같은 진행률이면 같은 결과다(사이에 다른 진행률을 계산해도)", () => {
    const first = driveAt(0.41);
    driveAt(0.9);
    driveAt(0.05);
    expect(driveAt(0.41)).toEqual(first);
  });

  it("차는 뒤로 가지 않고 출발선에서 마지막 자리까지 간다", () => {
    let previous = -Infinity;
    for (const p of progresses) {
      const { carS } = driveAt(p);
      expect(carS).toBeGreaterThanOrEqual(previous - 1e-9);
      previous = carS;
    }
    expect(carSAt(0)).toBe(0);
    expect(carSAt(1)).toBeCloseTo(CAR_END, 9);
  });

  it("열린 끝은 물러나지 않고 차와 최소 간격 이상 떨어져 있다", () => {
    let previous = -Infinity;
    for (const p of progresses) {
      const { carS, revealS } = driveAt(p);
      expect(revealS, `p=${p}`).toBeGreaterThanOrEqual(previous - 1e-9);
      expect(revealS - carS, `p=${p}`).toBeGreaterThanOrEqual(REVEAL_MIN_GAP);
      expect(revealS).toBeLessThanOrEqual(ROAD_END);
      previous = revealS;
    }
  });

  it("평소에는 차 앞 REVEAL_LEAD까지 열려 있다", () => {
    expect(revealSAt(0)).toBeGreaterThanOrEqual(REVEAL_LEAD);
    expect(revealSAt(0)).toBeLessThan(REVEAL_LEAD + 5);
  });

  it("고정 정류장에 머무는 동안 다음 정류장까지 길이 열린다", () => {
    const pairs = [
      ["stock2u", "tix2u"],
      ["tix2u", "pfplay"],
      ["pfplay", "pickcare"],
    ];
    for (const [stop, next] of pairs) {
      const before = revealSAt(at(stop, 0.25));
      const after = revealSAt(at(stop, 0.75));
      const nextCar = carSAt(at(next, 0.5));
      expect(after - before, stop).toBeGreaterThan(10);
      expect(after, stop).toBeGreaterThanOrEqual(nextCar + REVEAL_LEAD - 1e-6);
      // 머무는 동안 차는 서 있다
      expect(carSAt(at(stop, 0.75))).toBeCloseTo(carSAt(at(stop, 0.25)), 9);
    }
  });

  it("1막 정류장을 지나며 다음 정류장까지 길이 열린다", () => {
    for (const [stop, next] of [
      ["kokoa-clone", "todo-app"],
      ["todo-app", "eutcha"],
      ["eutcha", "stock2u"],
    ]) {
      expect(revealSAt(at(stop, 0.75)), stop).toBeGreaterThanOrEqual(carSAt(at(next, 0.5)) + REVEAL_LEAD - 1e-6);
    }
  });

  it("PiCKCARE를 지나면 도로 끝까지 열리고, 엔딩 끝에서 길 전체가 켜진다", () => {
    expect(revealSAt(at("pickcare", 0.75))).toBeCloseTo(ROAD_END, 6);
    const end = driveAt(1);
    expect(end.revealS).toBeCloseTo(ROAD_END, 6);
    expect(end.ending).toBe(1);
    expect(driveAt(at("pickcare", 0.5)).ending).toBe(0);
  });

  it("차 자세는 정류장 경계에서 끊기지 않는다", () => {
    const h = 1e-7;
    for (const range of STOP_RANGES.slice(1)) {
      const before = driveAt(range.start - h).car;
      const after = driveAt(range.start + h).car;
      expect(distance(before.position, after.position), range.stop.id).toBeLessThan(1e-3);
      expect(distance(before.tangent, after.tangent), range.stop.id).toBeLessThan(1e-4);
      expect(Math.abs(before.bank - after.bank), range.stop.id).toBeLessThan(1e-4);
    }
  });

  it("주행 속도는 출발선과 정류장 한가운데와 엔딩에서 0, 1막에서 정속(1)이다", () => {
    expect(speedAt(0)).toBeLessThan(0.01);
    expect(speedAt(at("kokoa-clone", 0.5))).toBeCloseTo(1, 6);
    for (const id of ["stock2u", "tix2u", "pfplay", "pickcare"]) expect(speedAt(at(id, 0.5)), id).toBe(0);
    expect(speedAt(at("ending", 0.5))).toBe(0);
  });

  it("주행 속도는 정류장 경계에서 이어진다", () => {
    for (const range of STOP_RANGES.slice(1)) {
      expect(Math.abs(speedAt(range.start - 1e-4) - speedAt(range.start + 1e-4)), range.stop.id).toBeLessThan(0.01);
    }
  });
});

describe("카메라", () => {
  it("정류장·엔딩 경계에서 목표 자세가 튀지 않는다", () => {
    const h = 1e-7;
    for (const range of STOP_RANGES.slice(1)) {
      const before = driveAt(range.start - h).camera;
      const after = driveAt(range.start + h).camera;
      expect(distance(before.position, after.position), range.stop.id).toBeLessThan(1e-3);
      expect(distance(before.target, after.target), range.stop.id).toBeLessThan(1e-3);
    }
  });

  it("목표 자세가 진행률에 따라 연속으로 움직인다(한 걸음에 크게 뛰지 않는다)", () => {
    for (let index = 1; index < progresses.length; index++) {
      const a = driveAt(progresses[index - 1]);
      const b = driveAt(progresses[index]);
      // 진행률 1/4000 한 걸음. 엔딩에서는 높이 오르므로 더 크게 움직인다.
      const limit = b.ending > 0 ? 6 : 1;
      expect(distance(a.camera.position, b.camera.position), `p=${progresses[index]}`).toBeLessThan(limit);
      expect(distance(a.camera.target, b.camera.target), `p=${progresses[index]}`).toBeLessThan(limit);
    }
  });

  it("주행 중에는 차 뒤·위에서 차 앞을 본다", () => {
    for (const p of progresses) {
      const state = driveAt(p);
      if (state.ending > 0 || STOP_RANGES.some((range) => range.stop.pin && p > range.start && p < range.end)) continue;
      const offset = sub(state.camera.position, state.car.position);
      expect(dot(offset, state.car.tangent), `p=${p}`).toBeLessThan(-5);
      expect(dot(offset, state.car.up), `p=${p}`).toBeGreaterThan(1);
      expect(dot(sub(state.camera.target, state.car.position), state.car.tangent), `p=${p}`).toBeGreaterThan(5);
    }
  });

  it("엔딩 전까지 카메라는 노면보다 1m 이상 위에 있다", () => {
    for (const p of progresses) {
      const state = driveAt(p);
      if (state.ending > 0) continue;
      expect(dot(sub(state.camera.position, state.car.position), state.car.up), `p=${p}`).toBeGreaterThan(1);
    }
  });

  it("차 기준 좌표로 바꿨다가 되돌리면 같은 자리다", () => {
    const car = driveAt(0.4).car;
    const point: Vec3 = [3, 7, -150];
    fromCarFrame(car, toCarFrame(car, point)).forEach((value, axis) => expect(value).toBeCloseTo(point[axis], 9));
    expect(toCarFrame(car, roadPoint(driveAt(0.4).carS - 5))[2]).toBeLessThan(-4.9);
  });

  it("밀어내기는 차 둘레 안의 자리를 둘레로, 노면 아래의 자리를 노면 위로 옮긴다", () => {
    const car = driveAt(0.13).car;
    const near = fromCarFrame(car, [1, 1, 0.5]);
    const inside = { x: near[0], y: near[1], z: near[2] };
    keepClear(inside, car);
    expect(distance([inside.x, inside.y, inside.z], carCenter(car))).toBeCloseTo(CAMERA_CLEARANCE.radius, 9);
    const low = fromCarFrame(car, [0, 0.2, -20]);
    const under = { x: low[0], y: low[1], z: low[2] };
    keepClear(under, car);
    expect(dot(sub([under.x, under.y, under.z], car.position), car.up)).toBeCloseTo(CAMERA_CLEARANCE.height, 9);
  });

  it("감쇠로 따라가도 노면 아래로 파고들거나 차에 닿지 않는다(60Hz, 화면당 0.8초·0.2초·0.1초)", () => {
    for (const secondsPerScreen of [0.8, 0.2, 0.1]) {
      for (const frame of simulate(0, 1, secondsPerScreen, 60)) {
        if (frame.state.ending > 0) continue;
        const label = `화면당 ${secondsPerScreen}초 p=${frame.state.progress}`;
        expect(distance(frame.pose.position, carCenter(frame.state.car)), label).toBeGreaterThanOrEqual(CAMERA_CLEARANCE.radius - 1e-9);
        expect(dot(sub(frame.pose.position, frame.state.car.position), frame.state.car.up), label).toBeGreaterThanOrEqual(
          CAMERA_CLEARANCE.height - 1e-9,
        );
      }
    }
  });

  // 머무는 정도와 엔딩이 0인 채 0.3초가 지나면 "주행 중"이다(시점 전환의 감쇠가 끝난다).
  it("앞으로든 거꾸로든 스크롤하는 동안 주행 중에는 차 뒤에서 차를 본다(60Hz, 화면당 0.5초·0.3초·0.1초)", () => {
    for (const secondsPerScreen of [0.5, 0.3, 0.1]) {
      for (const [from, to] of [
        [0, 1],
        [1, 0],
      ]) {
        let driving = 0;
        for (const frame of simulate(from, to, secondsPerScreen, 60)) {
          const p = frame.state.progress;
          driving = dwellWeight(p) === 0 && frame.state.ending === 0 ? driving + 1 : 0;
          if (driving < 18) continue;
          const label = `${from}→${to} 화면당 ${secondsPerScreen}초 p=${p.toFixed(4)}`;
          expectBehindAndLooking(frame.state, frame.pose, label);
        }
      }
    }
  });

  it("한 화면을 즉시 되돌려도(PageUp) 카메라는 차 뒤에 남아 차를 본다", () => {
    const from = (rangeOf("todo-app").start + rangeOf("todo-app").end) / 2;
    let follow: CameraFollow | null = null;
    for (let frame = 0; frame < 120; frame++) follow = followCamera(follow, driveAt(from), 1 / 60).follow;
    const state = driveAt(from - 1 / SCROLL_LENGTH);
    for (let frame = 0; frame < 60; frame++) {
      const next = followCamera(follow, state, 1 / 60);
      follow = next.follow;
      expectBehindAndLooking(state, next.pose, `프레임 ${frame}`);
    }
  });

  it("목표 자세는 이미 차 둘레 밖이라 밀어내기가 움직이지 않는다", () => {
    for (const p of progresses) {
      const state = driveAt(p);
      const position = { x: state.camera.position[0], y: state.camera.position[1], z: state.camera.position[2] };
      keepClear(position, state.car);
      expect([position.x, position.y, position.z], `p=${p}`).toEqual(state.camera.position);
    }
  });

  it("PiCKCARE는 차가 아직 들어오는 동안(구간 12%)에 이미 정류장 시점이다", () => {
    const range = rangeOf("pickcare");
    const state = driveAt(range.start + (range.end - range.start) * 0.12);
    expect(state.speed).toBeGreaterThan(0);
    // 정류장 시점은 차의 비스듬한 앞옆에서 차를 돌아본다: 카메라가 차보다 앞에 있다
    expect(dot(sub(state.camera.position, state.car.position), state.car.tangent)).toBeGreaterThan(0);
  });

  // 정류장 패널: 넓은 화면에서 왼쪽(mr-auto) 또는 오른쪽(ml-auto)에 화면 폭의 약 1/3을 차지한다(JourneyContent).
  it("정류장에 머무는 동안 차는 본문 패널 반대편 화면 절반에 선다", () => {
    for (const range of STOP_RANGES.filter((item) => item.stop.pin)) {
      const state = driveAt((range.start + range.end) / 2);
      const side = stopScreenSide(range.stop);
      for (const aspect of [16 / 9, 16 / 10]) {
        for (const point of [
          state.car.position,
          roadPoint(state.carS + 2.3, 0, 0.7),
          roadPoint(state.carS - 2.3, 0, 0.7),
          roadPoint(state.carS, 0, 1.4),
        ]) {
          const [x, y] = screenPosition(state.camera, point, aspect);
          const label = `${range.stop.id} ${aspect.toFixed(2)} → (${x.toFixed(3)}, ${y.toFixed(3)})`;
          if (side === 1) expect(x, label).toBeGreaterThan(0.42);
          else expect(x, label).toBeLessThan(0.58);
          expect(x, label).toBeGreaterThan(0.05);
          expect(x, label).toBeLessThan(0.95);
          expect(y, label).toBeGreaterThan(0.2);
          expect(y, label).toBeLessThan(0.9);
        }
      }
    }
  });

  // 내려다보는 장면은 화면 위의 헤더와 아래의 연락처 패널을 피해야 한다(화면 좌표 0~1, 왼쪽·위가 0).
  // 넓은 화면(sm 이상)은 연락처 패널이 오른쪽에 좁게 있어 길을 그 왼쪽에 둔다. 휴대폰 세로는 패널이
  // 전체 폭이라, 내려다보기가 끝나는 순간(엔딩 구간 OVERVIEW_ARRIVAL) 패널이 아직 화면 아래 10% 밖에 있다.
  it("엔딩 내려다보기는 헤더와 연락처 패널을 피해 길 전체를 보인다", () => {
    const pose = driveAt(1).camera;
    expect(overviewWeight(1)).toBe(1);
    const points: Vec3[] = [roadPoint(CAR_END, 0, 1.5)];
    for (let s = ROAD_START; s <= ROAD_END; s += 2) {
      const half = roadFrame(s).width / 2;
      points.push(roadPoint(s, -half), roadPoint(s, half));
    }
    const areas = [
      { name: "16:9", aspect: 16 / 9, left: 0.03, right: 0.62, top: 0.09, bottom: 0.94 },
      { name: "16:10", aspect: 16 / 10, left: 0.03, right: 0.62, top: 0.09, bottom: 0.94 },
      { name: "4:3", aspect: 4 / 3, left: 0.03, right: 0.55, top: 0.09, bottom: 0.94 },
      { name: "390×844", aspect: 390 / 844, left: 0.03, right: 0.97, top: 0.09, bottom: 0.9 },
    ];
    for (const area of areas) {
      for (const point of points) {
        const [x, y] = screenPosition(pose, point, area.aspect);
        const label = `${area.name} ${point.map((value) => value.toFixed(1))} → (${x.toFixed(3)}, ${y.toFixed(3)})`;
        expect(x, label).toBeGreaterThan(area.left);
        expect(x, label).toBeLessThan(area.right);
        expect(y, label).toBeGreaterThan(area.top);
        expect(y, label).toBeLessThan(area.bottom);
      }
    }
  });
});

/** 진행률을 from에서 to로 일정한 빠르기(화면당 secondsPerScreen초)로 옮기며 카메라를 hz로 따라간다 */
function simulate(from: number, to: number, secondsPerScreen: number, hz: number) {
  const frames: { state: DriveState; pose: CameraPose }[] = [];
  const step = (to > from ? 1 : -1) / (SCROLL_LENGTH * secondsPerScreen * hz);
  let follow: CameraFollow | null = null;
  for (let p = from; to > from ? p <= to : p >= to; p += step) {
    const state = driveAt(p);
    const next = followCamera(follow, state, 1 / hz);
    follow = next.follow;
    frames.push({ state, pose: next.pose });
  }
  return frames;
}

/** 카메라가 차 뒤에 있고, 차 몸통이 시선 앞에 있다 */
function expectBehindAndLooking(state: DriveState, pose: CameraPose, label: string) {
  expect(dot(sub(pose.position, state.car.position), state.car.tangent), label).toBeLessThan(0);
  const look = sub(pose.target, pose.position);
  expect(dot(sub(carCenter(state.car), pose.position), look), label).toBeGreaterThan(0);
}

/** 점이 맺히는 화면 좌표(0~1, 왼쪽·위가 0) */
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
  return [
    0.5 + dot(offset, right) / depth / (tanVertical * aspect) / 2,
    0.5 - dot(offset, up) / depth / tanVertical / 2,
  ];
}
