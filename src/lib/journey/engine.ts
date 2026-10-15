import type Lenis from "lenis";

/**
 * 여정 페이지의 스크롤 엔진 등록소. Lenis 인스턴스는 useJourneyScroll이 만들고,
 * 3D 렌더 단계는 Scene이 불러온 뒤 등록한다. 3D 코드를 이 파일에서 import하지 않아 지연 로딩이 유지된다.
 */
type ScrollEngine = Pick<Lenis, "stop" | "start" | "scrollTo">;

let lenis: ScrollEngine | null = null;
let locked = false;
let renderStep: ((timeMs: number) => void) | null = null;

export function setLenis(next: ScrollEngine | null): void {
  lenis = next;
  // 공유 주소로 들어와 상세 패널이 Lenis보다 먼저 열렸을 수 있다.
  if (lenis && locked) lenis.stop();
}

export function getLenis(): ScrollEngine | null {
  return lenis;
}

/** 상세 패널이 열린 동안 페이지 스크롤을 멈춘다. */
export function lockScroll(): void {
  locked = true;
  lenis?.stop();
}

export function unlockScroll(): void {
  locked = false;
  lenis?.start();
}

export function setRenderStep(step: ((timeMs: number) => void) | null): void {
  renderStep = step;
}

export function renderFrame(timeMs: number): void {
  renderStep?.(timeMs);
}
