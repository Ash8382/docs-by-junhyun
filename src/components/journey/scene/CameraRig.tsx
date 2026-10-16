"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { followCamera, type CameraFollow } from "@/lib/journey/drive";
import { currentDrive } from "./driveFrame";

/**
 * 진행률이 정한 카메라 목표(driveAt의 camera)를 매 프레임 따라간다. 위치와 시선을 차 기준 좌표로 감쇠해(followCamera)
 * 차의 움직임은 그대로 따라가고 시점 전환만 부드럽게 한다. 그래서 거꾸로 스크롤해도 주행 중 카메라는 차 뒤에 있다.
 * 감쇠는 프레임 간격으로 계산해 60Hz·120Hz에서 같은 속도이고, 감쇠한 자리는 차 둘레 밖·노면 위로 민다(drive.test.ts가 앞뒤 스크롤로 확인한다).
 */
export function CameraRig() {
  const follow = useRef<CameraFollow | null>(null);

  useFrame((state, delta) => {
    // 첫 프레임(follow가 없을 때)은 목표 자세에 바로 놓는다. 원점에서 날아오는 연출을 막는다.
    const next = followCamera(follow.current, currentDrive(), delta);
    follow.current = next.follow;
    state.camera.position.set(...next.pose.position);
    state.camera.lookAt(...next.pose.target);
  });

  return null;
}
