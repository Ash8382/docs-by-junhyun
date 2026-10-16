import { driveAt, type DriveState } from "@/lib/journey/drive";
import { scrollState } from "@/lib/journey/scrollState";

let cached: DriveState = driveAt(0);

/**
 * 지금 스크롤 진행률의 진행 상태(lib/journey/drive.ts driveAt). 한 프레임 안에서 카메라·도로·차·빛줄기가 같은 값을 쓰도록
 * 진행률이 그대로면 다시 계산하지 않는다. driveAt은 순수 함수라 이 캐시가 결과를 바꾸지 않는다.
 */
export function currentDrive(): DriveState {
  if (cached.progress !== scrollState.progress) cached = driveAt(scrollState.progress);
  return cached;
}
