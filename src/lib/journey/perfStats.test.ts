import { describe, expect, it } from "vitest";
import { PERF_TARGET, meetsTarget, minuteSummaries, summarize } from "./perfStats";

describe("프레임 시간 요약", () => {
  it("평균·fps·p95·p99·최대·50ms 초과 개수를 낸다(정렬한 표본의 비율 자리)", () => {
    const sample = [...Array(90).fill(16.7), ...Array(8).fill(33.4), 50.1, 66.8];
    const summary = summarize(sample);
    expect(summary.frames).toBe(100);
    expect(summary.averageMs).toBeCloseTo((90 * 16.7 + 8 * 33.4 + 50.1 + 66.8) / 100, 2);
    expect(summary.fps).toBeCloseTo(1000 / summary.averageMs, 1);
    expect(summary.p95Ms).toBe(33.4);
    expect(summary.p99Ms).toBe(66.8);
    expect(summary.maxMs).toBe(66.8);
    expect(summary.over50ms).toBe(2);
  });

  it("표본이 없으면 프레임 0개의 요약이다", () => {
    expect(summarize([])).toEqual({ frames: 0, averageMs: 0, fps: 0, p95Ms: 0, p99Ms: 0, maxMs: 0, over50ms: 0 });
  });
});

describe("2-4a 휴대폰 기준(스펙 7절)", () => {
  it("p95 33.4ms 이하이고 p99 50.1ms 이하면 30fps 기준을 지킨다(60Hz에서 한 번 밀림까지)", () => {
    expect(PERF_TARGET).toEqual({ p95Ms: 33.4, p99Ms: 50.1 });
    expect(meetsTarget(summarize([...Array(95).fill(16.7), ...Array(4).fill(33.4), 50.1]))).toBe(true);
    expect(meetsTarget(summarize([...Array(94).fill(16.7), ...Array(6).fill(50.1)]))).toBe(false);
    expect(meetsTarget(summarize([...Array(98).fill(16.7), 66.8, 66.8]))).toBe(false);
    expect(meetsTarget(summarize([]))).toBe(false);
  });
});

describe("오래 돌리기", () => {
  it("시작부터 1분마다 묶어 요약한다(마지막 묶음은 1분이 안 될 수 있다)", () => {
    const frames = [
      { at: 0, ms: 16.7 },
      { at: 59_999, ms: 16.7 },
      { at: 60_000, ms: 33.4 },
      { at: 119_000, ms: 33.4 },
      { at: 150_000, ms: 50.1 },
    ];
    const minutes = minuteSummaries(frames, 0);
    expect(minutes.map((minute) => minute.frames)).toEqual([2, 2, 1]);
    expect(minutes.map((minute) => minute.p95Ms)).toEqual([16.7, 33.4, 50.1]);
  });
});
