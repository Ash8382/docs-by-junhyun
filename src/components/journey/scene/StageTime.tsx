"use client";

import { useFrame } from "@react-three/fiber";
import { stageUniforms } from "./stageMaterial";

/** 첫 프레임의 delta는 페이지를 연 뒤 지난 시간(수십 초)이다. 한 프레임에 이만큼까지만 더해 노이즈가 건너뛰지 않게 한다 */
const MAX_DELTA = 0.1;

/** 렌더 단계 경계의 노이즈를 흐르게 하는 시간. 모든 단계 재질이 같은 uniform을 본다 */
export function StageTime() {
  useFrame((_, delta) => {
    stageUniforms.uJourneyTime.value += Math.min(delta, MAX_DELTA);
  });
  return null;
}
