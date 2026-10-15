/**
 * 스크롤 진행률(0~1). React state가 아니다. 스크롤 중에 React가 다시 렌더링하지 않도록
 * 카메라는 매 프레임 이 값을 읽고, 진행 막대는 구독해서 DOM을 직접 고친다.
 */
export const scrollState = { progress: 0 };

type Listener = (progress: number) => void;
const listeners = new Set<Listener>();

export function setProgress(progress: number): void {
  scrollState.progress = progress;
  listeners.forEach((listener) => listener(progress));
}

export function subscribeProgress(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
