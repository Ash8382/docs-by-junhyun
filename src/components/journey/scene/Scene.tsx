"use client";

import { Canvas } from "@react-three/fiber";
import { useSyncExternalStore, type ReactNode } from "react";
import { WebGLRenderer, type WebGLRendererParameters } from "three";
import { driveAt } from "@/lib/journey/drive";
import {
  getCarStatus,
  getSceneStatus,
  getServerCarStatus,
  getServerSceneStatus,
  setSceneStatus,
  subscribeSceneStatus,
} from "@/lib/journey/sceneStatus";
import { CAMERA_FOV } from "@/lib/journey/timeline";
import { Atmosphere } from "./Atmosphere";
import { CameraRig } from "./CameraRig";
import { Car } from "./Car";
import { Dust } from "./Dust";
import { Effects } from "./Effects";
import { Holograms } from "./Holograms";
import { Landscape } from "./Landscape";
import { Road } from "./Road";
import { Sky } from "./Sky";
import { Streaks } from "./Streaks";
import { Warmup } from "./Warmup";

/**
 * 모듈 밖에 두어 렌더마다 같은 객체를 넘긴다. Canvas는 카메라 옵션이 바뀌면 카메라 자리를 다시 잡는다.
 * 먼 끝은 엔딩 내려다보기(약 250m 위)에서 도로 끝까지 담는 거리다.
 */
const CAMERA = { fov: CAMERA_FOV, near: 0.1, far: 600, position: driveAt(0).camera.position };

/**
 * 렌더러를 직접 만든다. 만들지 못하면(WebGL 컨텍스트 거부) 장면 상태를 "failed"로 바꿔 로딩 표시를 거둔 뒤 다시 던진다.
 * 안티에일리어싱은 후처리(SMAA)가 맡으므로 기본 MSAA는 끈다.
 */
function createRenderer(defaults: WebGLRendererParameters): WebGLRenderer {
  try {
    return new WebGLRenderer({ ...defaults, antialias: false });
  } catch (error) {
    setSceneStatus("failed");
    throw error;
  }
}

/**
 * 장면 상태를 구독하는 바깥 틀. 준비되기 전에는 캔버스를 숨기고, 준비되면 서서히 드러낸다.
 * 차가 모델인지 빛 실루엣인지는 data-car에 적는다(e2e 표지).
 * Canvas는 children으로 받는다. 상태가 바뀌어 이 틀만 다시 렌더링되면 같은 children이라 Canvas는 다시 렌더링되지 않는다.
 * (Canvas는 렌더링될 때마다 렌더러 설정을 다시 하므로, 렌더러를 만들지 못한 경우 실패를 한 번 더 일으킨다.)
 */
function SceneFrame({ children }: { children: ReactNode }) {
  const status = useSyncExternalStore(subscribeSceneStatus, getSceneStatus, getServerSceneStatus);
  const car = useSyncExternalStore(subscribeSceneStatus, getCarStatus, getServerCarStatus);
  return (
    <div
      data-journey-scene
      data-state={status}
      data-car={car}
      className="fixed inset-0 z-0 transition-opacity duration-700"
      style={{ opacity: status === "ready" ? 1 : 0 }}
      aria-hidden
    >
      {children}
    </div>
  );
}

/**
 * 여정 3D 장면: 우주를 달리는 차와 빛의 길, 막별 풍경(스펙 3절). R3F 자체 루프를 끄고(frameloop="never") 시계 하나가 그 캔버스의 advance로 그린다.
 * 차·카메라·열린 길·발광은 모두 진행률의 순수 함수(driveAt)에서 나온다. 렌더 단계는 Warmup이 셰이더를 미리 컴파일한 뒤에 건다.
 * 이 파일과 scene/ 아래만 three·R3F를 import한다. JourneyStage가 동적으로 불러온다.
 */
export default function Scene() {
  return (
    <SceneFrame>
      <Canvas frameloop="never" dpr={[1, 2]} camera={CAMERA} gl={createRenderer}>
        <Atmosphere />
        <Sky />
        <CameraRig />
        <Road />
        <Car />
        <Streaks />
        <Dust />
        <Landscape />
        <Holograms />
        <Effects />
        <Warmup />
      </Canvas>
    </SceneFrame>
  );
}
