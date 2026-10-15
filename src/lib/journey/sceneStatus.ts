/**
 * 3D 장면의 준비 상태. 장면(Warmup)이 셰이더를 미리 컴파일하고 몇 프레임 그려 본 뒤 "ready"로,
 * 렌더러를 만들지 못하거나 오류 경계가 실패를 잡거나 셰이더 컴파일 실패·WebGL 컨텍스트 손실을 감지하면 "failed"로 바꾼다.
 * 한 번 "failed"가 되면 "ready"로 덮이지 않는다(실패를 감지한 뒤에 준비 프레임이 끝날 수 있다). 다시 준비할 때만 "loading"으로 돌린다.
 * 차 상태는 모델을 그리는지, 빛 실루엣으로 대신하는지를 알린다(스펙 5절 "실패 대응").
 * 로딩 표시와 캔버스 드러내기가 구독한다. 3D 코드를 import하지 않아 지연 로딩 밖의 컴포넌트도 쓸 수 있다.
 */

export type SceneStatus = "loading" | "ready" | "failed";
export type CarStatus = "loading" | "model" | "silhouette";

let status: SceneStatus = "loading";
let car: CarStatus = "loading";
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

export function getSceneStatus(): SceneStatus {
  return status;
}

/** 서버 렌더와 첫 하이드레이션에서는 언제나 준비 중이다 */
export function getServerSceneStatus(): SceneStatus {
  return "loading";
}

export function setSceneStatus(next: SceneStatus): void {
  if (status === next) return;
  if (status === "failed" && next === "ready") return;
  status = next;
  notify();
}

export function getCarStatus(): CarStatus {
  return car;
}

export function getServerCarStatus(): CarStatus {
  return "loading";
}

export function setCarStatus(next: CarStatus): void {
  if (car === next) return;
  car = next;
  notify();
}

export function subscribeSceneStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
