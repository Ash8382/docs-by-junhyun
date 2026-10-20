"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { PerspectiveCamera } from "three";
import { followCamera, type CameraFollow, type CameraPose } from "@/lib/journey/drive";
import { isPortrait, lensFor } from "@/lib/journey/lens";
import { followPortrait, type PortraitView } from "@/lib/journey/portrait";
import { currentDrive } from "./driveFrame";

/**
 * 진행률이 정한 카메라 목표를 매 프레임 따라간다. 가로 화면은 driveAt의 camera를 차 기준 좌표로 감쇠하고(followCamera),
 * 세로 화면(가로가 세로보다 좁다)은 세로 화면 카메라(followPortrait, 스펙 3절 "세로 화면 (2-4a)")를 따라간다.
 * 둘 다 차의 움직임은 그대로 따라가고 시점 전환만 부드럽게 한다. 감쇠는 프레임 간격으로 계산해 60Hz·120Hz에서 같은 속도다.
 * 렌즈(세로 시야각과 투영 중심)는 화면 크기가 바뀔 때만 다시 건다. 투영 중심은 setViewOffset으로 옮긴다(투영·광선·project가 모두 따른다).
 * 화면을 돌려 가로·세로가 바뀌면 새 카메라는 첫 프레임처럼 목표에 바로 놓인다.
 */
export function CameraRig() {
  const follow = useRef<CameraFollow | null>(null);
  const portraitFollow = useRef<PortraitView | null>(null);
  const lensKey = useRef("");

  useFrame((state, delta) => {
    const camera = state.camera as PerspectiveCamera;
    const { width, height } = state.size;
    const lens = lensFor(width, height);
    const key = `${lens.fov}:${lens.center}:${width}x${height}`;
    if (lensKey.current !== key) {
      lensKey.current = key;
      camera.fov = lens.fov;
      if (lens.center === 0.5) camera.clearViewOffset();
      else camera.setViewOffset(width, height, 0, (0.5 - lens.center) * height, width, height);
      camera.updateProjectionMatrix();
    }
    const drive = currentDrive();
    let pose: CameraPose;
    // 첫 프레임(follow가 없을 때)은 목표 자세에 바로 놓는다. 원점에서 날아오는 연출을 막는다.
    if (isPortrait(width, height)) {
      const next = followPortrait(portraitFollow.current, drive, delta, window.location.hash);
      portraitFollow.current = next.follow;
      follow.current = null;
      pose = next.pose;
    } else {
      const next = followCamera(follow.current, drive, delta);
      follow.current = next.follow;
      portraitFollow.current = null;
      pose = next.pose;
    }
    camera.position.set(...pose.position);
    camera.lookAt(...pose.target);
  });

  return null;
}
