import type { QualityLevel } from "./journeyMode";

/**
 * 실행 중 강등 판정(스펙 5절 "실행 중 강등", 2-4b). 최근 2초 동안 그린 프레임 수로 fps를 재고, 2초 창이 다 찬 뒤 그 fps가 지금 단계의
 * 기준 아래면 한 단계 내리라고 답한다. 순수 함수이고 시각은 부르는 쪽(장면의 렌더 단계)이 넘긴다.
 * - 경량의 기준 30은 28 아래로 잰다. 30Hz로 묶인 기기(아이폰 저전력 모드)는 정확히 30fps라 멀쩡해도 최소로 떨어진다
 * - 한 프레임이 250ms를 넘으면(탭 전환·디버거) 창을 비우고 다시 잰다
 * - 단계를 바꾼 직후 1초는 세지 않는다(holdWatch). 배율·블룸을 바꾸며 렌더 타깃과 효과 셰이더를 한 번 다시 만드는 끊김을 뺀다
 * - 장면이 준비되기 전과 탭이 가려진 동안은 부르는 쪽이 세지 않는다(가려지면 holdWatch)
 */
export const DOWNGRADE = {
  windowMs: 2000,
  graceMs: 1000,
  gapMs: 250,
  below: { full: 45, lite: 28, min: 24 } as Record<QualityLevel, number>,
} as const;

export interface FrameWatch {
  /** 창 안의 프레임 시각(ms) */
  times: number[];
  /** 지금 창을 재기 시작한 시각 */
  startedAt: number | null;
  /** 이 시각 전의 프레임은 세지 않는다 */
  holdUntil: number;
}

export function createWatch(): FrameWatch {
  return { times: [], startedAt: null, holdUntil: 0 };
}

/** 창을 비우고 nowMs부터 forMs 동안 세지 않는다(단계를 바꾼 직후, 준비된 직후, 탭이 가려졌을 때) */
export function holdWatch(watch: FrameWatch, nowMs: number, forMs: number = DOWNGRADE.graceMs): void {
  watch.times = [];
  watch.startedAt = null;
  watch.holdUntil = nowMs + forMs;
}

/** 프레임 하나를 센다. 2초 창이 다 찼고 그 동안의 fps가 지금 단계의 기준 아래면 true(한 단계 내린다) */
export function frameTooSlow(watch: FrameWatch, nowMs: number, level: QualityLevel): boolean {
  if (nowMs < watch.holdUntil) return false;
  const last = watch.times[watch.times.length - 1];
  if (last !== undefined && nowMs - last > DOWNGRADE.gapMs) {
    watch.times = [];
    watch.startedAt = null;
  }
  watch.startedAt ??= nowMs;
  watch.times.push(nowMs);
  while (watch.times[0] <= nowMs - DOWNGRADE.windowMs) watch.times.shift();
  if (nowMs - watch.startedAt < DOWNGRADE.windowMs) return false;
  return watch.times.length / (DOWNGRADE.windowMs / 1000) < DOWNGRADE.below[level];
}
