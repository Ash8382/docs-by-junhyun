/**
 * 휴대폰 성능 측정(스펙 7절 "2-4a 기준", 8절 4항)의 계산. ?debug=perf 오버레이가 쓴다. 백분위는 perf:journey와 같은 방식
 * (정렬한 표본에서 비율 자리의 값)이다. 순수 함수이고 브라우저를 쓰지 않는다.
 */

export interface FrameSummary {
  frames: number;
  averageMs: number;
  fps: number;
  p95Ms: number;
  p99Ms: number;
  maxMs: number;
  over50ms: number;
}

/** 휴대폰 30fps 기준: 60Hz 화면에서 프레임 시간은 16.7ms의 배수로 끊기므로 33.4ms는 "한 번 밀림까지"다 */
export const PERF_TARGET = { p95Ms: 33.4, p99Ms: 50.1 } as const;

function percentile(sorted: number[], ratio: number): number {
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))];
}

function round(value: number): number {
  return Number(value.toFixed(2));
}

export function summarize(sample: number[]): FrameSummary {
  if (sample.length === 0) return { frames: 0, averageMs: 0, fps: 0, p95Ms: 0, p99Ms: 0, maxMs: 0, over50ms: 0 };
  const sorted = [...sample].sort((a, b) => a - b);
  const average = sample.reduce((sum, value) => sum + value, 0) / sample.length;
  return {
    frames: sample.length,
    averageMs: round(average),
    fps: Number((1000 / average).toFixed(1)),
    p95Ms: round(percentile(sorted, 0.95)),
    p99Ms: round(percentile(sorted, 0.99)),
    maxMs: round(sorted[sorted.length - 1]),
    over50ms: sample.filter((value) => value > 50).length,
  };
}

/** 2-4a 휴대폰 기준(p95 33.4ms 이하, p99 50.1ms 이하)을 지키는가. 표본이 없으면 지키지 않은 것으로 본다 */
export function meetsTarget(summary: FrameSummary): boolean {
  return summary.frames > 0 && summary.p95Ms <= PERF_TARGET.p95Ms && summary.p99Ms <= PERF_TARGET.p99Ms;
}

/** 오래 돌리기: 프레임(기록 시각 at, ms)을 start부터 1분마다 묶어 요약한다. 마지막 묶음은 1분이 안 될 수 있다 */
export function minuteSummaries(frames: { at: number; ms: number }[], start: number): FrameSummary[] {
  const minutes: number[][] = [];
  for (const frame of frames) {
    const index = Math.floor((frame.at - start) / 60_000);
    (minutes[index] ??= []).push(frame.ms);
  }
  return [...minutes].map((sample) => summarize(sample ?? []));
}
