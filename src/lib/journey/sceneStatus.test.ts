import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getCarStatus,
  getSceneFailure,
  getSceneStatus,
  getServerCarStatus,
  getServerSceneStatus,
  setCarStatus,
  setSceneStatus,
  subscribeSceneStatus,
} from "./sceneStatus";

afterEach(() => {
  setSceneStatus("loading");
  setCarStatus("loading");
});

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

  it("실패는 준비됨으로 덮이지 않고, 다시 준비할 때만 풀린다", () => {
    setSceneStatus("failed");
    setSceneStatus("ready");
    expect(getSceneStatus()).toBe("failed");
    setSceneStatus("loading");
    expect(getSceneStatus()).toBe("loading");
    setSceneStatus("ready");
    expect(getSceneStatus()).toBe("ready");
  });

  it("준비된 뒤에도 실패로 바뀐다(컨텍스트 손실)", () => {
    setSceneStatus("ready");
    setSceneStatus("failed");
    expect(getSceneStatus()).toBe("failed");
  });

  it("실패의 종류(컨텍스트 손실·장면 실패)를 남기고, 다시 준비할 때 지운다(2-4b)", () => {
    expect(getSceneFailure()).toBeNull();
    setSceneStatus("failed", "context-lost");
    expect(getSceneFailure()).toBe("context-lost");
    setSceneStatus("loading");
    expect(getSceneFailure()).toBeNull();
    setSceneStatus("failed");
    expect(getSceneFailure()).toBe("failed");
  });
});

describe("차 상태", () => {
  it("처음과 서버에서는 불러오는 중이고, 바뀌면 구독자에게 알린다", () => {
    expect(getCarStatus()).toBe("loading");
    expect(getServerCarStatus()).toBe("loading");
    const listener = vi.fn();
    const unsubscribe = subscribeSceneStatus(listener);
    setCarStatus("silhouette");
    setCarStatus("silhouette");
    expect(getCarStatus()).toBe("silhouette");
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });
});
