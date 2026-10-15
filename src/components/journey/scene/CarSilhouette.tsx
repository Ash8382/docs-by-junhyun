"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { currentDrive } from "./driveFrame";
import { createSilhouette, paintSilhouette } from "./silhouette";

/** 차 모델 대신 그리는 빛 실루엣. 자리는 바깥의 Car가 모델과 같은 자세로 잡는다 */
export function CarSilhouette() {
  const silhouette = useMemo(() => createSilhouette(), []);
  useEffect(() => () => silhouette.dispose(), [silhouette]);
  useFrame(() => paintSilhouette(silhouette, currentDrive()));
  return <primitive object={silhouette.object} />;
}
