"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { Vector3 } from "three";
import { damp3 } from "@/lib/journey/damp";
import { scrollState } from "@/lib/journey/scrollState";
import { cameraAt } from "@/lib/journey/timeline";

// 스크롤이 정한 목표 자세를 매 프레임 감쇠로 따라간다. 감쇠는 프레임 간격으로 계산해 60Hz·120Hz에서 같은 속도다.
const POSITION_LAMBDA = 5;
const TARGET_LAMBDA = 6;

export function CameraRig() {
  const look = useRef<Vector3 | null>(null);

  useFrame((state, delta) => {
    const pose = cameraAt(scrollState.progress);
    if (!look.current) {
      // 첫 프레임은 목표 자세에 바로 놓는다. 원점에서 날아오는 연출을 막는다.
      look.current = new Vector3(...pose.target);
      state.camera.position.set(...pose.position);
    } else {
      damp3(state.camera.position, pose.position, POSITION_LAMBDA, delta);
      damp3(look.current, pose.target, TARGET_LAMBDA, delta);
    }
    state.camera.lookAt(look.current);
  });

  return null;
}
