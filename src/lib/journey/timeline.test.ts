import { describe, expect, it } from "vitest";
import { projects } from "@/data/projects";
import {
  CAMERA_FOV,
  OVERVIEW_ARRIVAL,
  PATH_LENGTH,
  SCROLL_LENGTH,
  STOPS,
  STOP_RANGES,
  TOTAL_LENGTH,
  cameraAt,
  focusPoint,
  hallCenter,
  objectSide,
  pathParamAt,
  pathPoint,
  pathSpan,
  rangeOf,
  stopAt,
  type Vec3,
} from "./timeline";

function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

describe("정류장", () => {
  it("스펙의 스크롤 배분을 따른다", () => {
    expect(STOPS.map((stop) => [stop.id, stop.length])).toEqual([
      ["intro", 1],
      ["act-1", 0.5],
      ["kokoa-clone", 1],
      ["todo-app", 1],
      ["eutcha", 1],
      ["act-2", 0.5],
      ["stock2u", 2],
      ["tix2u", 2],
      ["pfplay", 2],
      ["act-3", 0.5],
      ["pickcare", 5],
      ["ending", 2],
    ]);
    expect(TOTAL_LENGTH).toBe(18.5);
    expect(SCROLL_LENGTH).toBe(17.5);
  });

  it("프로젝트 정류장이 데이터의 종료일 순서와 같다", () => {
    expect(STOPS.filter((stop) => stop.slug).map((stop) => stop.slug)).toEqual(
      projects.map((project) => project.slug),
    );
  });

  it("막 배정과 고정 구간이 스펙과 같다", () => {
    expect(["kokoa-clone", "todo-app", "eutcha"].map((id) => rangeOf(id).stop.act)).toEqual([1, 1, 1]);
    expect(["stock2u", "tix2u", "pfplay"].map((id) => rangeOf(id).stop.act)).toEqual([2, 2, 2]);
    expect(rangeOf("pickcare").stop.act).toBe(3);
    expect(STOPS.filter((stop) => stop.pin).map((stop) => stop.id)).toEqual([
      "stock2u",
      "tix2u",
      "pfplay",
      "pickcare",
    ]);
  });

  it("구간이 0에서 1까지 빈틈없이 이어진다", () => {
    expect(STOP_RANGES[0].start).toBe(0);
    expect(STOP_RANGES[STOP_RANGES.length - 1].end).toBeCloseTo(1, 12);
    for (let index = 1; index < STOP_RANGES.length; index += 1) {
      expect(STOP_RANGES[index].start).toBeCloseTo(STOP_RANGES[index - 1].end, 12);
    }
  });

  it("진행률로 정류장을 찾는다", () => {
    expect(stopAt(0).range.stop.id).toBe("intro");
    expect(stopAt(1).range.stop.id).toBe("ending");
    expect(stopAt(1).t).toBe(1);
    const pfplay = rangeOf("pfplay");
    const middle = stopAt((pfplay.start + pfplay.end) / 2);
    expect(middle.range.stop.id).toBe("pfplay");
    expect(middle.t).toBeCloseTo(0.5, 10);
  });
});

describe("카메라 경로", () => {
  it("스크롤이 늘면 회랑을 따라 앞으로만 간다", () => {
    let previous = -Infinity;
    for (let step = 0; step <= 2000; step += 1) {
      const s = pathParamAt(step / 2000);
      expect(s).toBeGreaterThanOrEqual(previous - 1e-9);
      previous = s;
    }
    expect(pathParamAt(1)).toBeCloseTo(PATH_LENGTH, 10);
  });

  it("정류장 경계에서 카메라가 튀지 않는다", () => {
    for (const range of STOP_RANGES.slice(1)) {
      const before = cameraAt(range.start - 1e-7);
      const after = cameraAt(range.start + 1e-7);
      expect(distance(before.position, after.position), range.stop.id).toBeLessThan(1e-3);
      expect(distance(before.target, after.target), range.stop.id).toBeLessThan(1e-3);
    }
  });

  it("정류장 경계에서 카메라 속도도 이어진다(멈칫하지 않는다)", () => {
    const h = 1e-6;
    for (const range of STOP_RANGES.slice(1)) {
      const at = range.start;
      const left = (pathParamAt(at) - pathParamAt(at - h)) / h;
      const right = (pathParamAt(at + h) - pathParamAt(at)) / h;
      expect(Math.abs(left - right), range.stop.id).toBeLessThan(0.05);
    }
  });

  it("프로젝트 오브젝트는 왼쪽·오른쪽을 번갈아 선다", () => {
    expect(STOPS.filter((stop) => stop.kind === "project").map((stop) => objectSide(stop))).toEqual([-1, 1, -1, 1, -1, 1]);
  });

  it("고정 구간 한가운데에서는 오브젝트를 바라본다", () => {
    for (const range of STOP_RANGES.filter((item) => item.stop.pin)) {
      const focus = focusPoint(range.stop);
      if (!focus) throw new Error(`${range.stop.id}에 오브젝트 위치가 없습니다`);
      const pose = cameraAt((range.start + range.end) / 2);
      expect(distance(pose.target, focus), range.stop.id).toBeLessThan(1e-9);
    }
  });

  it("프로젝트·전시실 정류장만 오브젝트 위치를 가진다", () => {
    for (const stop of STOPS) {
      const hasObject = stop.kind === "project" || stop.kind === "hall";
      expect(focusPoint(stop) !== null, stop.id).toBe(hasObject);
    }
  });

  it("엔딩 끝에서는 위에서 회랑 전체를 내려다본다", () => {
    const end = cameraAt(1);
    expect(end.position[1]).toBeGreaterThan(20);
    expect(end.target[1]).toBe(0);
  });

  it("엔딩 구간 앞부분(OVERVIEW_ARRIVAL)에서 내려다보기가 끝난다", () => {
    const ending = rangeOf("ending");
    expect(OVERVIEW_ARRIVAL).toBeLessThan(0.5);
    const arrival = ending.start + (ending.end - ending.start) * OVERVIEW_ARRIVAL;
    expect(cameraAt(arrival)).toEqual(cameraAt(1));
  });

  // 내려다보는 장면은 화면 위의 헤더와 아래의 연락처 패널을 피해야 한다(화면 좌표 0~1, 왼쪽·위가 0).
  // 넓은 화면(sm 이상)은 연락처 패널이 오른쪽에 좁게 있어 회랑을 그 왼쪽에 둔다. 휴대폰 세로는 패널이
  // 전체 폭이라, 내려다보기가 끝나는 순간(엔딩 구간 OVERVIEW_ARRIVAL) 패널이 아직 화면 아래 10% 밖에 있다.
  it("엔딩 내려다보기는 헤더와 연락처 패널을 피해 회랑 전체를 보인다", () => {
    const pose = cameraAt(1);
    const center = hallCenter();
    const roof = 11.3;
    // 회랑 입구(s=−3)의 바닥·벽 위 모서리, 렌더 단계 경계 두 곳, 전시실 바닥 가장자리와 고리 지붕 가장자리(높이 8)
    const points: Vec3[] = [
      [-2.5, 0, 3],
      [2.5, 0, 3],
      [-2.5, 3, 3],
      [2.5, 3, 3],
      [pathPoint(19)[0], 0, -19],
      [pathPoint(33)[0], 0, -33],
      [center[0] - 11, 0, center[2]],
      [center[0] + 11, 0, center[2]],
      [center[0], 0, center[2] - 11],
      [center[0] - roof, 8, center[2]],
      [center[0] + roof, 8, center[2]],
      [center[0], 8, center[2] - roof],
    ];
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

/** 점이 맺히는 화면 좌표(0~1, 왼쪽·위가 0) */
function screenPosition(pose: { position: Vec3; target: Vec3 }, point: Vec3, aspect: number): [number, number] {
  const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
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

describe("회랑 위치", () => {
  it("정류장이 회랑에서 차지하는 거리 구간을 준다", () => {
    expect(pathSpan("intro")).toEqual({ from: 0, to: 4 });
    expect(pathSpan("act-2")).toEqual({ from: 18, to: 20 });
    expect(pathSpan("pickcare")).toEqual({ from: 34, to: PATH_LENGTH });
  });

  it("전시실 중심은 PiCKCARE 오브젝트 바로 아래 바닥이다", () => {
    const focus = focusPoint(rangeOf("pickcare").stop);
    if (!focus) throw new Error("전시실 오브젝트 위치가 없습니다");
    expect(hallCenter()).toEqual([focus[0], 0, focus[2]]);
  });
});
