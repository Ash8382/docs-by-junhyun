import { describe, expect, it } from "vitest";
import { LEVEL_QUALITY, galaxyFor, isSoftwareRenderer, resolveTier, tierOf, tierOverride, type DeviceSignals } from "./capability";

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

  // GPU 없이 소프트웨어(SwiftShader 등)로만 그리는 브라우저는 장면이 준비된 직후 메인 스레드가 4초 안팎 멈췄다(가상 머신·원격 데스크톱·VDI)
  it("WebGL2를 소프트웨어로만 그릴 수 있으면(GPU 없음) 2D다", () => {
    expect(tierOf({ ...DESKTOP, softwareGL: true })).toBe("2d");
    expect(tierOf({ ...PHONE, softwareGL: true })).toBe("2d");
    expect(tierOf({ ...DESKTOP, softwareGL: false })).toBe("full");
    expect(resolveTier({ ...DESKTOP, softwareGL: true }, null)).toBe("2d");
    // 확인용 덮어쓰기는 그대로 앞선다(e2e·캡처가 3D를 볼 수 있다)
    expect(resolveTier({ ...DESKTOP, softwareGL: true }, "full")).toBe("full");
  });

  // "느린 소프트웨어면 실패"(failIfMajorPerformanceCaveat)는 GPU가 없어 떨어진 경우만 잡고, 소프트웨어를 일부러 고른 환경은 놓친다
  it("렌더러 이름으로 소프트웨어 렌더러(SwiftShader·llvmpipe·Microsoft Basic Render)를 알아본다", () => {
    for (const name of [
      "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (LLVM 10.0.0) (0x0000C0DE)), SwiftShader driver)",
      "llvmpipe (LLVM 15.0.7, 256 bits)",
      "ANGLE (Microsoft, Microsoft Basic Render Driver Direct3D11 vs_5_0 ps_5_0, D3D11)",
      "Google SwiftShader",
    ]) {
      expect(isSoftwareRenderer(name), name).toBe(true);
    }
    for (const name of ["ANGLE (Apple, ANGLE Metal Renderer: Apple M4, Unspecified Version)", "Adreno (TM) 740", "Apple GPU", "Mali-G78", ""]) {
      expect(isSoftwareRenderer(name), name).toBe(false);
    }
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

describe("품질 단계(스펙 5절, 2-4a·2-4b)", () => {
  it("전체는 해상도 배율 최대 2·블룸 그대로(휘도 전체 해상도, 8단계), 경량은 배율 1.5·블룸 축소(휘도 절반, 6단계), 최소는 배율 1·블룸 끔이다", () => {
    expect(LEVEL_QUALITY).toEqual({
      full: { dpr: [1, 2], bloom: { luminanceScale: 1, levels: 8 } },
      lite: { dpr: [1, 1.5], bloom: { luminanceScale: 0.5, levels: 6 } },
      min: { dpr: [1, 1], bloom: null },
    });
  });

  it("은하는 기기 단계로 정한다: 전체는 원본(4096), 경량과 2D(수동으로 고른 3D)는 2048. 실행 중 강등은 은하를 바꾸지 않는다", () => {
    expect(galaxyFor("full")).toBe("/journey/galaxy.webp");
    expect(galaxyFor("lite")).toBe("/journey/galaxy-2048.webp");
    expect(galaxyFor("2d")).toBe("/journey/galaxy-2048.webp");
  });
});
