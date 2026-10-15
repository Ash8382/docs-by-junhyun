import { beforeEach, describe, expect, it, vi } from "vitest";
import { getLenis, lockScroll, renderFrame, setLenis, setRenderStep, unlockScroll } from "./engine";

function fakeLenis() {
  return { stop: vi.fn(), start: vi.fn(), scrollTo: vi.fn() };
}

beforeEach(() => {
  setLenis(null);
  unlockScroll();
  setRenderStep(null);
});

describe("엔진", () => {
  it("Lenis가 생기기 전에 잠그면 생기는 순간 멈춘다", () => {
    lockScroll();
    const lenis = fakeLenis();
    setLenis(lenis);
    expect(lenis.stop).toHaveBeenCalledTimes(1);
    expect(getLenis()).toBe(lenis);
  });

  it("잠금을 풀면 다시 움직인다", () => {
    const lenis = fakeLenis();
    setLenis(lenis);
    lockScroll();
    unlockScroll();
    expect(lenis.stop).toHaveBeenCalledTimes(1);
    expect(lenis.start).toHaveBeenCalledTimes(1);
  });

  it("렌더 단계가 등록돼 있을 때만 그린다", () => {
    const step = vi.fn();
    renderFrame(16);
    setRenderStep(step);
    renderFrame(32);
    setRenderStep(null);
    renderFrame(48);
    expect(step).toHaveBeenCalledTimes(1);
    expect(step).toHaveBeenCalledWith(32);
  });
});
