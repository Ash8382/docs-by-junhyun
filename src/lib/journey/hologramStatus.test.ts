import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getFocusedHologram,
  getServerShownHolograms,
  getShownHolograms,
  setFocusedHologram,
  setShownHolograms,
  subscribeHolograms,
  thumbnailHidden,
} from "./hologramStatus";

afterEach(() => {
  setShownHolograms([]);
  setFocusedHologram(null);
});

describe("켜진 홀로그램", () => {
  it("처음에는 없고, 서버에서는 언제나 없다", () => {
    expect(getShownHolograms().size).toBe(0);
    setShownHolograms(["stock2u"]);
    expect(getServerShownHolograms().size).toBe(0);
  });

  it("바뀔 때만 구독자에게 알리고, 같은 목록이면 같은 객체를 돌려준다", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeHolograms(listener);
    setShownHolograms(["stock2u", "tix2u"]);
    const first = getShownHolograms();
    setShownHolograms(["tix2u", "stock2u"]);
    expect(getShownHolograms()).toBe(first);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    setShownHolograms([]);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("썸네일 대체", () => {
  it("장면이 ready이고 그 홀로그램이 켜져 있을 때만 감춘다", () => {
    const shown = new Set(["stock2u"]);
    expect(thumbnailHidden("ready", shown, "stock2u")).toBe(true);
    expect(thumbnailHidden("ready", shown, "tix2u")).toBe(false);
    expect(thumbnailHidden("loading", shown, "stock2u")).toBe(false);
    expect(thumbnailHidden("failed", shown, "stock2u")).toBe(false);
  });
});

describe("링크 포커스", () => {
  it("포커스가 있는 홀로그램 id를 둔다", () => {
    expect(getFocusedHologram()).toBeNull();
    setFocusedHologram("pfplay");
    expect(getFocusedHologram()).toBe("pfplay");
    setFocusedHologram(null);
    expect(getFocusedHologram()).toBeNull();
  });
});
