import type Lenis from "lenis";

/**
 * 여정 페이지의 스크롤 엔진 등록소. Lenis 인스턴스는 useJourneyScroll이 만들고,
 * 3D 렌더 단계는 Scene이 불러온 뒤 등록한다. 3D 코드를 이 파일에서 import하지 않아 지연 로딩이 유지된다.
 */
type ScrollEngine = Pick<Lenis, "stop" | "start" | "scrollTo">;

let lenis: ScrollEngine | null = null;
let locked = false;
let afterUnlock: (() => void)[] = [];
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
  const pending = afterUnlock;
  afterUnlock = [];
  for (const callback of pending) callback();
}

/**
 * 스크롤 잠금이 풀리면 한 번 부른다(잠겨 있지 않으면 바로 부른다). 상세 패널이 열린 동안에는 Lenis가 <html>의 스크롤을 막아(lenis-stopped)
 * 스크롤 위치를 바꿀 수 없으므로, 그동안 바뀐 배치에 맞추는 일(modeSwitch)을 패널이 닫힐 때로 미룬다(2-4b)
 */
export function whenUnlocked(callback: () => void): void {
  if (locked) afterUnlock.push(callback);
  else callback();
}

export function setRenderStep(step: ((timeMs: number) => void) | null): void {
  renderStep = step;
}

export function renderFrame(timeMs: number): void {
  renderStep?.(timeMs);
}
