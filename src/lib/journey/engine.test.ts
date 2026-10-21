import { beforeEach, describe, expect, it, vi } from "vitest";
import { getLenis, isScrollLocked, lockScroll, renderFrame, setLenis, setRenderStep, unlockScroll, whenUnlocked } from "./engine";

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

  it("잠겨 있으면 풀릴 때 한 번 부르고, 잠겨 있지 않으면 바로 부른다(2-4b)", () => {
    const later = vi.fn();
    lockScroll();
    whenUnlocked(later);
    expect(later).not.toHaveBeenCalled();
    unlockScroll();
    unlockScroll();
    expect(later).toHaveBeenCalledTimes(1);
    const now = vi.fn();
    whenUnlocked(now);
    expect(now).toHaveBeenCalledTimes(1);
  });

  it("잠긴 동안만 잠겨 있다고 답한다(2-4c 최종 리뷰)", () => {
    expect(isScrollLocked()).toBe(false);
    lockScroll();
    expect(isScrollLocked()).toBe(true);
    unlockScroll();
    expect(isScrollLocked()).toBe(false);
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
