import { describe, expect, it } from "vitest";
import { projects } from "@/data/projects";
import {
  ENDING_ARRIVAL,
  HALL_REPO_END,
  HALL_REPO_START,
  OVERVIEW_ARRIVAL,
  PATH_LENGTH,
  SCROLL_LENGTH,
  STOPS,
  STOP_RANGES,
  TOTAL_LENGTH,
  UNITS_PER_SCREEN,
  dwellWeight,
  endingPhases,
  hallRepoProgress,
  objectSide,
  overviewWeight,
  pathParamAt,
  pathSpan,
  rangeOf,
  stopAt,
  viewWeight,
} from "./timeline";

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

describe("진행 거리", () => {
  it("스크롤이 늘면 앞으로만 간다", () => {
    let previous = -Infinity;
    for (let step = 0; step <= 2000; step += 1) {
      const s = pathParamAt(step / 2000);
      expect(s).toBeGreaterThanOrEqual(previous - 1e-9);
      previous = s;
    }
    expect(pathParamAt(1)).toBeCloseTo(PATH_LENGTH, 10);
  });

  it("정류장 경계에서 속도가 이어진다(멈칫하지 않는다)", () => {
    const h = 1e-6;
    for (const range of STOP_RANGES.slice(1)) {
      const at = range.start;
      const left = (pathParamAt(at) - pathParamAt(at - h)) / h;
      const right = (pathParamAt(at + h) - pathParamAt(at)) / h;
      expect(Math.abs(left - right), range.stop.id).toBeLessThan(0.05);
    }
  });

  it("입구에서는 출발선에 서 있다가 출발한다", () => {
    const h = 1e-6;
    const cruise = UNITS_PER_SCREEN * SCROLL_LENGTH;
    expect(pathParamAt(0)).toBe(0);
    expect(pathParamAt(h) / h / cruise).toBeLessThan(1e-3);
    const intro = rangeOf("intro");
    expect((pathParamAt(intro.end + h) - pathParamAt(intro.end)) / h / cruise).toBeCloseTo(1, 3);
  });

  it("고정 구간 가운데 절반은 멈춰 있고, 머무는 정도가 그동안 1이다", () => {
    for (const range of STOP_RANGES.filter((item) => item.stop.pin)) {
      const at = (t: number) => range.start + (range.end - range.start) * t;
      expect(pathParamAt(at(0.3)), range.stop.id).toBeCloseTo(pathParamAt(at(0.7)), 10);
      expect(dwellWeight(at(0.5)), range.stop.id).toBe(1);
      expect(dwellWeight(at(0)), range.stop.id).toBe(0);
      expect(dwellWeight(at(0.999999)), range.stop.id).toBeLessThan(1e-6);
    }
  });

  it("카메라가 정류장 시점으로 도는 정도는 프로젝트 정류장에서 머무는 정도와 같다", () => {
    for (const range of STOP_RANGES.filter((item) => item.stop.kind === "project")) {
      for (const t of [0, 0.1, 0.2, 0.5, 0.8, 0.9, 0.999]) {
        const p = range.start + (range.end - range.start) * t;
        expect(viewWeight(p), `${range.stop.id} ${t}`).toBe(dwellWeight(p));
      }
    }
  });

  it("PiCKCARE에서는 구간 앞뒤 12%에서 정류장 시점으로 돌고, 그 사이 내내 정류장 시점이다", () => {
    const range = rangeOf("pickcare");
    const at = (t: number) => range.start + (range.end - range.start) * t;
    expect(viewWeight(at(0))).toBe(0);
    expect(viewWeight(at(0.06))).toBeGreaterThan(0.4);
    expect(viewWeight(at(0.06))).toBeLessThan(0.6);
    for (const t of [0.12, 0.2, 0.5, 0.8, 0.88]) expect(viewWeight(at(t)), `t=${t}`).toBe(1);
    expect(viewWeight(at(0.999999))).toBeLessThan(1e-6);
  });

  it("정류장 시점은 정류장이 아닌 곳에서 0이다", () => {
    for (const range of STOP_RANGES.filter((item) => !item.stop.pin)) {
      expect(viewWeight((range.start + range.end) / 2), range.stop.id).toBe(0);
    }
  });

  it("고정이 아닌 정류장에서는 머물지 않는다", () => {
    for (const range of STOP_RANGES.filter((item) => !item.stop.pin)) {
      expect(dwellWeight((range.start + range.end) / 2), range.stop.id).toBe(0);
    }
  });

  it("프로젝트 제품 화면은 왼쪽·오른쪽을 번갈아 선다", () => {
    expect(STOPS.filter((stop) => stop.kind === "project").map((stop) => objectSide(stop))).toEqual([-1, 1, -1, 1, -1, 1]);
  });

  it("엔딩 구간 앞부분(OVERVIEW_ARRIVAL)에서 내려다보기가 끝난다", () => {
    const ending = rangeOf("ending");
    expect(OVERVIEW_ARRIVAL).toBeLessThan(0.5);
    expect(overviewWeight(ending.start)).toBe(0);
    expect(overviewWeight(ending.start + (ending.end - ending.start) * OVERVIEW_ARRIVAL)).toBe(1);
    expect(overviewWeight(rangeOf("pickcare").end - 1e-9)).toBe(0);
  });

  // 엔딩(병합 뒤, 사용자 결정 "여정이 하나의 빛이 되다"): 상승하며 차·풍경이 사라지고 길이 한 줄의 빛이 된 뒤, 빛이 길 끝으로 흘러
  // 흰 점이 된다. 모두 진행률을 따르고(되감으면 거꾸로), 목표 상태에 닿은 뒤에만 이름이 시간으로 나타난다
  it("엔딩 단계는 상승·사라짐·한 줄의 빛·흐름·흰 점 차례로 0 → 1이고, 목표 상태는 구간 끝부분에서만이다", () => {
    const ending = rangeOf("ending");
    const at = (t: number) => ending.start + (ending.end - ending.start) * t;
    expect(endingPhases(rangeOf("pickcare").end - 1e-9)).toEqual({ rise: 0, fade: 0, line: 0, flow: 0, point: 0, arrived: false });
    expect(endingPhases(1)).toEqual({ rise: 1, fade: 1, line: 1, flow: 1, point: 1, arrived: true });
    expect(endingPhases(at(OVERVIEW_ARRIVAL))).toMatchObject({ rise: 1, fade: 1, line: 1, flow: 0, point: 0 });
    expect(endingPhases(at(0.85))).toMatchObject({ flow: 1, point: 1, arrived: false });
    expect(ENDING_ARRIVAL).toBeGreaterThan(0.85);
    expect(endingPhases(at(ENDING_ARRIVAL)).arrived).toBe(true);
    expect(endingPhases(at(ENDING_ARRIVAL) - 1e-6).arrived).toBe(false);
    let last = endingPhases(at(0));
    for (let t = 0; t <= 1; t += 0.005) {
      const now = endingPhases(at(t));
      for (const key of ["rise", "fade", "line", "flow", "point"] as const) expect(now[key], `${key} t=${t.toFixed(3)}`).toBeGreaterThanOrEqual(last[key]);
      last = now;
    }
    // 내려다보기(카메라·분위기)는 상승과 같다
    expect(endingPhases(at(0.3)).rise).toBe(overviewWeight(at(0.3)));
  });

  it("정류장이 경로에서 차지하는 거리 구간을 준다", () => {
    expect(pathSpan("intro")).toEqual({ from: 0, to: 4 });
    expect(pathSpan("act-2")).toEqual({ from: 18, to: 20 });
    expect(pathSpan("pickcare")).toEqual({ from: 34, to: PATH_LENGTH });
  });
});

describe("PiCKCARE 저장소 진행률", () => {
  const range = rangeOf("pickcare");
  /** PiCKCARE 구역 위에서 잰 화면 수의 진행률 */
  const atScreens = (screens: number) => range.start + ((range.end - range.start) * screens) / range.stop.length;

  it("저장소 패널 구간(앞에서 1.2화면 뒤 ~ 뒤에서 0.7화면 앞)의 시작에서 0, 끝에서 1이고 그 사이는 고르게 는다", () => {
    expect(hallRepoProgress(atScreens(HALL_REPO_START))).toBeCloseTo(0, 9);
    expect(hallRepoProgress(atScreens(range.stop.length - HALL_REPO_END))).toBeCloseTo(1, 9);
    expect(hallRepoProgress(atScreens((HALL_REPO_START + range.stop.length - HALL_REPO_END) / 2))).toBeCloseTo(0.5, 9);
  });

  it("구간 밖은 0과 1로 자른다", () => {
    expect(hallRepoProgress(0)).toBe(0);
    expect(hallRepoProgress(range.start)).toBe(0);
    expect(hallRepoProgress(range.end)).toBe(1);
    expect(hallRepoProgress(1)).toBe(1);
  });
});
