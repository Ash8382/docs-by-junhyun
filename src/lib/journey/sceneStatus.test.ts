import { afterEach, describe, expect, it, vi } from "vitest";
import { getSceneStatus, getServerSceneStatus, setSceneStatus, subscribeSceneStatus } from "./sceneStatus";

afterEach(() => setSceneStatus("loading"));

describe("장면 준비 상태", () => {
  it("처음에는 준비 중이고, 서버에서는 언제나 준비 중이다", () => {
    expect(getSceneStatus()).toBe("loading");
    setSceneStatus("ready");
    expect(getServerSceneStatus()).toBe("loading");
  });

  it("바뀔 때만 구독자에게 알린다", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeSceneStatus(listener);
    setSceneStatus("ready");
    setSceneStatus("ready");
    expect(getSceneStatus()).toBe("ready");
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    setSceneStatus("failed");
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
