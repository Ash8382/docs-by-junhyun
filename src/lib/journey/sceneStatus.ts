/**
 * 3D 장면의 준비 상태. 장면(Warmup)이 셰이더를 미리 컴파일하고 몇 프레임 그려 본 뒤 "ready"로,
 * 렌더러를 만들지 못하거나 오류 경계가 실패를 잡거나 셰이더 컴파일 실패·WebGL 컨텍스트 손실을 감지하면 "failed"로 바꾼다.
 * 한 번 "failed"가 되면 "ready"로 덮이지 않는다(실패를 감지한 뒤에 준비 프레임이 끝날 수 있다). 다시 준비할 때만 "loading"으로 돌린다.
 * 차 상태는 모델을 그리는지, 빛 실루엣으로 대신하는지를 알린다(스펙 5절 "실패 대응").
 * 실패하면 그 종류(컨텍스트 손실인지 그 밖의 장면 실패인지)도 남긴다. 여정은 실패하면 2D로 바꾸고 그 이유로 쓴다(2-4b).
 * 로딩 표시와 캔버스 드러내기가 구독한다. 3D 코드를 import하지 않아 지연 로딩 밖의 컴포넌트도 쓸 수 있다.
 */

export type SceneStatus = "loading" | "ready" | "failed";
export type CarStatus = "loading" | "model" | "silhouette";
export type SceneFailure = "context-lost" | "failed";

let status: SceneStatus = "loading";
let failure: SceneFailure | null = null;
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

/** 실패로 바꿀 때 종류를 함께 넘긴다(없으면 장면 실패). 다시 준비 중으로 돌리면 지운다 */
export function setSceneStatus(next: SceneStatus, why: SceneFailure = "failed"): void {
  if (status === next) return;
  if (status === "failed" && next === "ready") return;
  status = next;
  if (next === "failed") failure = why;
  if (next === "loading") failure = null;
  notify();
}

/** 실패한 종류. 실패하지 않았으면 null */
export function getSceneFailure(): SceneFailure | null {
  return failure;
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
