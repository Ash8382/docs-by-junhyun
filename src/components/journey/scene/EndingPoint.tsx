"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Vector3 } from "three";
import { endingPoint } from "@/lib/journey/drive";
import { prefersReducedMotion } from "@/lib/journey/motion";
import { endingPhases } from "@/lib/journey/timeline";
import { currentDrive } from "./driveFrame";
import { writeEndingAnchor } from "./endingAnchor";
import { createEndingPoint, writeEndingPoint } from "./endingLight";

/**
 * 엔딩의 흰 점(병합 뒤). 카메라를 향해 돌고, 엔딩 point 단계만큼 밝아지며 맥동한다. 매 프레임 화면 자리를 이름 틀에 넘긴다(endingAnchor).
 */
export function EndingPoint() {
  const point = useMemo(() => createEndingPoint(), []);
  const seconds = useRef(0);
  const projected = useMemo(() => new Vector3(), []);
  const anchor = useMemo(() => endingPoint(), []);
  useEffect(() => () => point.dispose(), [point]);

  useFrame((state, delta) => {
    seconds.current += Math.min(delta, 0.1);
    const phases = endingPhases(currentDrive().progress);
    writeEndingPoint(point, phases.point, seconds.current, prefersReducedMotion());
    point.mesh.quaternion.copy(state.camera.quaternion);
    projected.set(...anchor).project(state.camera);
    writeEndingAnchor(((projected.x + 1) / 2) * state.size.width, ((1 - projected.y) / 2) * state.size.height);
  });

  return <primitive object={point.mesh} />;
}
