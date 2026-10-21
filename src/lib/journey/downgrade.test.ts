import { describe, expect, it } from "vitest";
import { DOWNGRADE, createWatch, frameTooSlow, holdWatch } from "./downgrade";
import type { QualityLevel } from "./journeyMode";

/** 일정한 간격(ms)으로 seconds초 동안 프레임을 넘기고, 처음으로 "내려라"가 나온 시각(없으면 null)을 돌려준다 */
function run(level: QualityLevel, intervalMs: number, seconds: number, start = 0, watch = createWatch()): number | null {
  for (let time = start; time <= start + seconds * 1000; time += intervalMs) {
    if (frameTooSlow(watch, time, level)) return time;
  }
  return null;
}

describe("실행 중 강등 판정(스펙 5절)", () => {
  it("기준은 전체 45, 경량 30(재는 값 28), 최소 24이고 창은 2초다", () => {
    expect(DOWNGRADE.below).toEqual({ full: 45, lite: 28, min: 24 });
    expect(DOWNGRADE.windowMs).toBe(2000);
  });

  it("60Hz로 꾸준하면 어느 단계에서도 내려가지 않는다", () => {
    for (const level of ["full", "lite", "min"] as const) expect(run(level, 1000 / 60, 10), level).toBeNull();
  });

  it("30Hz로 묶인 기기(저전력 모드)는 경량에 머물고, 전체에서는 2초 창이 찬 뒤 내려간다", () => {
    expect(run("lite", 1000 / 30, 10)).toBeNull();
    const at = run("full", 1000 / 30, 10);
    expect(at).not.toBeNull();
    expect(at as number).toBeGreaterThanOrEqual(2000);
    expect(at as number).toBeLessThan(2100);
  });

  it("최소에서는 24fps 아래(20fps)면 내려가고 25fps면 머문다", () => {
    expect(run("min", 50, 5)).not.toBeNull();
    expect(run("min", 40, 10)).toBeNull();
  });

  it("한 프레임이 250ms를 넘으면(탭 전환·디버거) 창을 비우고 다시 2초를 잰다", () => {
    const watch = createWatch();
    expect(run("full", 1000 / 30, 1.5, 0, watch)).toBeNull();
    // 1.5초 뒤 0.4초 동안 프레임이 없었다. 다시 2초가 차기 전에는 내리지 않는다
    expect(run("full", 1000 / 30, 1.9, 1900, watch)).toBeNull();
    expect(run("full", 1000 / 30, 0.3, 3801, watch)).not.toBeNull();
  });

  it("단계를 바꾼 직후 1초(holdWatch)는 세지 않는다", () => {
    const watch = createWatch();
    holdWatch(watch, 0);
    expect(run("full", 1000 / 30, 2.9, 0, watch)).toBeNull();
    expect(run("full", 1000 / 30, 0.2, 3000, watch)).not.toBeNull();
  });

  it("모든 프레임이 250ms를 넘으면(4fps 아래) 긴 간격 세 번째에 바로 내린다(2-4c)", () => {
    expect(run("full", 300, 2)).toBe(900);
  });

  it("긴 간격 두 번 뒤 정상 프레임이 오면 다시 센다", () => {
    const watch = createWatch();
    expect(run("full", 300, 0.6, 0, watch)).toBeNull();
    expect(run("full", 1000 / 60, 1, 616, watch)).toBeNull();
    expect(run("full", 300, 0.3, 1916, watch)).toBeNull();
  });

  it("단계를 바꾼 직후(holdWatch)에는 긴 간격을 다시 센다", () => {
    const watch = createWatch();
    expect(run("full", 300, 0.6, 0, watch)).toBeNull();
    holdWatch(watch, 600, 0);
    expect(run("full", 300, 0.6, 900, watch)).toBeNull();
  });
});
