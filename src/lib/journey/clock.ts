/**
 * 시계 하나. Lenis, ScrollTrigger, R3F가 각자 requestAnimationFrame을 돌면 한 프레임씩 어긋나 떨린다.
 * GSAP ticker 하나가 매 프레임 스크롤 → 트리거 → 렌더 순서로 같은 시각을 넘긴다. (스펙 4절 "시계 하나")
 */

export interface Ticker {
  add(callback: (time: number) => void): void;
  remove(callback: (time: number) => void): void;
  lagSmoothing(threshold: number): void;
}

export interface ClockSteps {
  scroll(timeMs: number): void;
  triggers(): void;
  render(timeMs: number): void;
}

/** ticker는 초 단위 시각을 준다. 각 단계에는 requestAnimationFrame처럼 밀리초로 넘긴다. */
export function startClock(ticker: Ticker, steps: ClockSteps): () => void {
  const tick = (time: number) => {
    const timeMs = time * 1000;
    steps.scroll(timeMs);
    steps.triggers();
    steps.render(timeMs);
  };
  ticker.lagSmoothing(0);
  ticker.add(tick);
  return () => ticker.remove(tick);
}
