/**
 * 3D 장면의 준비 상태. 장면(Warmup)이 셰이더를 미리 컴파일하고 몇 프레임 그려 본 뒤 "ready"로,
 * 렌더러를 만들지 못하거나 오류 경계가 실패를 잡으면 "failed"로 바꾼다. 로딩 표시와 캔버스 드러내기가 구독한다.
 * 3D 코드를 import하지 않아 지연 로딩 밖의 컴포넌트도 쓸 수 있다.
 */

export type SceneStatus = "loading" | "ready" | "failed";

let status: SceneStatus = "loading";
const listeners = new Set<() => void>();

export function getSceneStatus(): SceneStatus {
  return status;
}

/** 서버 렌더와 첫 하이드레이션에서는 언제나 준비 중이다 */
export function getServerSceneStatus(): SceneStatus {
  return "loading";
}

export function setSceneStatus(next: SceneStatus): void {
  if (status === next) return;
  status = next;
  for (const listener of listeners) listener();
}

export function subscribeSceneStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
