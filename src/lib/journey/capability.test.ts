import { describe, expect, it } from "vitest";
import { QUALITY, resolveTier, tierOf, tierOverride, type DeviceSignals } from "./capability";

const DESKTOP: DeviceSignals = { webgl2: true, coarsePointer: false, deviceMemory: 8, saveData: false };
const PHONE: DeviceSignals = { webgl2: true, coarsePointer: true, deviceMemory: 4, saveData: false };
/** Safari에는 deviceMemory·connection이 없다 */
const IPHONE: DeviceSignals = { webgl2: true, coarsePointer: true };

describe("기기 단계(스펙 5절)", () => {
  it("WebGL2가 되고 포인터가 정밀하면 3D 전체, 굵으면(휴대폰·태블릿) 3D 경량이다", () => {
    expect(tierOf(DESKTOP)).toBe("full");
    expect(tierOf(PHONE)).toBe("lite");
  });

  it("WebGL2가 없거나, 메모리가 2GB 이하이거나, 데이터 절약이 켜져 있으면 2D다", () => {
    expect(tierOf({ ...DESKTOP, webgl2: false })).toBe("2d");
    expect(tierOf({ ...PHONE, deviceMemory: 2 })).toBe("2d");
    expect(tierOf({ ...PHONE, deviceMemory: 1 })).toBe("2d");
    expect(tierOf({ ...DESKTOP, saveData: true })).toBe("2d");
    expect(tierOf({ ...PHONE, deviceMemory: 3 })).toBe("lite");
  });

  it("Safari처럼 deviceMemory·connection 값이 없으면 판정에 쓰지 않는다(2D로 보내지 않는다)", () => {
    expect(tierOf(IPHONE)).toBe("lite");
    expect(tierOf({ webgl2: true, coarsePointer: false })).toBe("full");
  });
});

describe("확인용 덮어쓰기(?debug=stats|perf&tier=)", () => {
  it("debug가 stats나 perf일 때만 tier 값을 읽는다", () => {
    expect(tierOverride("?debug=stats&tier=lite")).toBe("lite");
    expect(tierOverride("?debug=perf&tier=2d")).toBe("2d");
    expect(tierOverride("?tier=lite")).toBeNull();
    expect(tierOverride("?debug=stats")).toBeNull();
    expect(tierOverride("?debug=stats&tier=fast")).toBeNull();
  });

  it("덮어쓰기가 판정보다 앞서지만, WebGL2가 없으면 3D를 강제할 수 없다", () => {
    expect(resolveTier(DESKTOP, "lite")).toBe("lite");
    expect(resolveTier(PHONE, "full")).toBe("full");
    expect(resolveTier(PHONE, "2d")).toBe("2d");
    expect(resolveTier({ ...DESKTOP, webgl2: false }, "full")).toBe("2d");
    expect(resolveTier(PHONE, null)).toBe("lite");
  });
});

describe("단계별 품질(스펙 5절, 2-4a)", () => {
  it("3D 전체는 해상도 배율 최대 2, 원본 은하(4096), 블룸 그대로(휘도 전체 해상도, 8단계)다", () => {
    expect(QUALITY.full).toEqual({ dpr: [1, 2], galaxy: "/journey/galaxy.webp", bloom: { luminanceScale: 1, levels: 8 } });
  });

  it("3D 경량은 해상도 배율 최대 1.5, 은하 2048, 블룸을 줄인다(휘도 절반 해상도, 단계 축소). 끄지는 않는다", () => {
    expect(QUALITY.lite.dpr).toEqual([1, 1.5]);
    expect(QUALITY.lite.galaxy).toBe("/journey/galaxy-2048.webp");
    expect(QUALITY.lite.bloom.luminanceScale).toBe(0.5);
    expect(QUALITY.lite.bloom.levels).toBeLessThan(QUALITY.full.bloom.levels);
    expect(QUALITY.lite.bloom.levels).toBeGreaterThan(0);
  });
});
