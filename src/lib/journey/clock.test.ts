import { describe, expect, it } from "vitest";
import { startClock, type Ticker } from "./clock";

function fakeTicker() {
  const callbacks = new Set<(time: number) => void>();
  const lag: number[] = [];
  const ticker: Ticker = {
    add: (callback) => {
      callbacks.add(callback);
    },
    remove: (callback) => {
      callbacks.delete(callback);
    },
    lagSmoothing: (threshold) => {
      lag.push(threshold);
    },
  };
  return { ticker, lag, tick: (time: number) => callbacks.forEach((callback) => callback(time)) };
}

describe("시계", () => {
  it("한 프레임에 스크롤 → 트리거 → 렌더 순서로 같은 시각을 넘긴다", () => {
    const { ticker, tick } = fakeTicker();
    const calls: string[] = [];
    startClock(ticker, {
      scroll: (timeMs) => calls.push(`scroll:${timeMs}`),
      triggers: () => calls.push("triggers"),
      render: (timeMs) => calls.push(`render:${timeMs}`),
    });
    tick(1.5);
    expect(calls).toEqual(["scroll:1500", "triggers", "render:1500"]);
  });

  it("지연 보정을 꺼서 탭을 오래 비운 뒤에도 시각이 끊기지 않게 한다", () => {
    const { ticker, lag } = fakeTicker();
    startClock(ticker, { scroll: () => {}, triggers: () => {}, render: () => {} });
    expect(lag).toEqual([0]);
  });

  it("멈추면 더 호출하지 않는다", () => {
    const { ticker, tick } = fakeTicker();
    const calls: string[] = [];
    const stop = startClock(ticker, {
      scroll: () => calls.push("scroll"),
      triggers: () => calls.push("triggers"),
      render: () => calls.push("render"),
    });
    stop();
    tick(2);
    expect(calls).toEqual([]);
  });
});
