import { describe, expect, it } from "vitest";
import { choose, downgrade, fail, initialMode, isAutoFlat, type JourneyMode } from "./journeyMode";

const FULL: JourneyMode = initialMode("full", null, true);

describe("처음 결정(스펙 5절 \"수동 전환\", 2-4b)", () => {
  it("기억한 선택이 없으면 기기 단계를 따른다: 전체·경량은 그 품질의 3D, 2D 단계는 2D(이유: 기기)", () => {
    expect(FULL).toEqual({ view: "3d", quality: "full", base: "full", reason: null, keep3d: false });
    expect(initialMode("lite", null, true)).toMatchObject({ view: "3d", quality: "lite", base: "lite" });
    expect(initialMode("2d", null, true)).toMatchObject({ view: "2d", reason: "tier" });
  });

  it("기억한 수동 선택이 기기 단계보다 앞선다. 메모리·데이터 절약으로 2D인 기기도 3D를 고를 수 있다(경량)", () => {
    expect(initialMode("full", "2d", true)).toMatchObject({ view: "2d", reason: "manual" });
    expect(initialMode("2d", "3d", true)).toMatchObject({ view: "3d", quality: "lite", reason: null });
  });

  it("WebGL2가 없으면 기억한 선택과 관계없이 2D다", () => {
    expect(initialMode("2d", "3d", false)).toMatchObject({ view: "2d", reason: "tier" });
  });
});

describe("실행 중 강등(5절 표)", () => {
  it("전체 → 경량 → 최소 → 2D(이유: 느림)로 한 단계씩만 내려가고, 2D에서는 그대로다", () => {
    const lite = downgrade(FULL);
    const min = downgrade(lite);
    const flat = downgrade(min);
    expect([lite.quality, min.quality]).toEqual(["lite", "min"]);
    expect(flat).toMatchObject({ view: "2d", reason: "slow", quality: "min" });
    expect(downgrade(flat)).toBe(flat);
  });

  it("컨텍스트 손실·장면 실패는 단계와 관계없이 바로 2D다", () => {
    expect(fail(FULL, "context-lost")).toMatchObject({ view: "2d", reason: "context-lost", quality: "full" });
    expect(fail(downgrade(FULL), "failed")).toMatchObject({ view: "2d", reason: "failed" });
  });
});

describe("수동 전환", () => {
  it("2D를 고르면 이유가 수동이고, 다시 3D를 고르면 기기 단계부터이며 2D 강등은 그대로 한다", () => {
    const flat = choose(FULL, "2d");
    expect(flat).toMatchObject({ view: "2d", reason: "manual" });
    const back = choose(flat, "3d");
    expect(back).toEqual({ view: "3d", quality: "full", base: "full", reason: null, keep3d: false });
    expect(downgrade(downgrade(downgrade(back))).view).toBe("2d");
  });

  it("느려서 2D가 된 뒤 3D를 고르면 최소부터이고, 이번 방문에는 2D로 내리지 않는다(품질은 최소에 머문다)", () => {
    const slow = downgrade(downgrade(downgrade(FULL)));
    const back = choose(slow, "3d");
    expect(back).toMatchObject({ view: "3d", quality: "min", keep3d: true });
    expect(downgrade(back)).toBe(back);
  });

  it("컨텍스트 손실 뒤 3D를 고르면 기기 단계부터이고, 다시 잃으면 그래도 2D다", () => {
    const back = choose(fail(downgrade(FULL), "context-lost"), "3d");
    expect(back).toMatchObject({ view: "3d", quality: "full", keep3d: true });
    expect(downgrade(downgrade(back)).view).toBe("3d");
    expect(fail(back, "context-lost").view).toBe("2d");
  });

  it("자동으로 2D가 된 것만 알림 대상이다", () => {
    expect(isAutoFlat(downgrade(downgrade(downgrade(FULL))))).toBe(true);
    expect(isAutoFlat(fail(FULL, "failed"))).toBe(true);
    expect(isAutoFlat(choose(FULL, "2d"))).toBe(false);
    expect(isAutoFlat(initialMode("2d", null, true))).toBe(false);
    expect(isAutoFlat(FULL)).toBe(false);
  });
});
