/**
 * 엔딩 목표 상태에 닿았는가(병합 뒤 새 엔딩 "여정이 하나의 빛이 되다"). 진행률이 목표 상태(ENDING_ARRIVAL 이후)이고 카메라가 흰 점을
 * 담는 자리에 실제로 닿았을 때 참이다. 장면의 카메라(scene/CameraRig)가 정하고 이름 틀(scene/EndingTitle)이 듣는다.
 * 페이지 맨 아래에 닿았는지가 아니라 장면이 목표 상태에 닿았는지로 정해, 배치 차이로 이름이 일찍 나타나지 않게 한다
 */
let arrived = false;
const listeners = new Set<() => void>();

export function getEndingArrived(): boolean {
  return arrived;
}

/** 값이 바뀔 때만 알린다(끝에 머무는 동안 매 프레임 불러도 이름 타이머가 다시 시작하지 않는다) */
export function setEndingArrived(next: boolean): void {
  if (next === arrived) return;
  arrived = next;
  for (const listener of listeners) listener();
}

export function subscribeEndingArrived(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
