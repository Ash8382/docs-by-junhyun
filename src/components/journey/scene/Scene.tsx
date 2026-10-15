"use client";

import { Canvas } from "@react-three/fiber";
import { useEffect } from "react";
import { setRenderStep } from "@/lib/journey/engine";
import { cameraAt } from "@/lib/journey/timeline";
import { CameraRig } from "./CameraRig";
import { PlaceholderCorridor } from "./PlaceholderCorridor";

const START = cameraAt(0);

/**
 * 여정 3D 장면. R3F 자체 루프를 끄고(frameloop="never") 시계 하나가 그 캔버스의 advance로 그린다.
 * 렌더 단계는 렌더러가 만들어진 뒤(onCreated)에야 등록한다. 만들지 못한 캔버스는 시계가 건드리지 않는다.
 * 이 파일과 scene/ 아래만 three·R3F를 import한다. JourneyStage가 동적으로 불러온다.
 */
export default function Scene() {
  useEffect(() => () => setRenderStep(null), []);

  return (
    <div data-journey-scene className="fixed inset-0 z-0" aria-hidden>
      <Canvas
        frameloop="never"
        dpr={[1, 2]}
        camera={{ fov: 50, near: 0.1, far: 200, position: START.position }}
        // 시계는 ms를 넘기지만 R3F advance는 초 단위다(frameloop="never"에서 clock.elapsedTime과 빼서 delta를 만든다).
        onCreated={(state) => setRenderStep((timeMs) => state.advance(timeMs / 1000))}
      >
        <color attach="background" args={["#09090b"]} />
        <CameraRig />
        <PlaceholderCorridor />
      </Canvas>
    </div>
  );
}
