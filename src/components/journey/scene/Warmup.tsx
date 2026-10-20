"use client";

import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import { HalfFloatType, WebGLRenderTarget, type PerspectiveCamera } from "three";
import { setRenderStep } from "@/lib/journey/engine";
import { setSceneStatus } from "@/lib/journey/sceneStatus";
import { createStatsRecorder, statsEnabled } from "./frameStats";
import { watchRenderer } from "./watchRenderer";

/** 사전 컴파일 뒤, 화면에 드러내기 전에 그려 보는 프레임 수. 후처리 셰이더가 이때 컴파일된다 */
const HIDDEN_FRAMES = 3;

/**
 * 셰이더 사전 컴파일(스펙 5절 "로딩"). 장면의 모든 재질(도로, 차 포함)을 compileAsync로 미리 컴파일한 뒤에야 시계에 렌더 단계를 건다.
 * 그 전에는 장면을 그리지 않으므로 첫 스크롤에서 셰이더 컴파일로 끊기지 않는다. 몇 프레임 숨긴 채 그린 뒤 "ready"가 된다.
 * 컴파일은 렌더 타깃을 건 채로 한다. 장면은 EffectComposer의 HDR 버퍼에 그려지는데, 화면 기준으로 컴파일하면
 * 출력 색 공간이 달라 첫 렌더에서 프로그램을 다시 만든다.
 * 셰이더 컴파일 실패와 WebGL 컨텍스트 손실도 여기서 감시한다(watchRenderer). ?debug=stats면 프레임마다 장면 통계를 남긴다(frameStats).
 * Canvas의 마지막 자식이라 다른 자식(차 모델, 환경맵, 후처리)이 자리를 잡은 뒤에 effect가 돈다.
 */
export function Warmup() {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);
  const advance = useThree((state) => state.advance);

  useEffect(() => watchRenderer(gl), [gl]);

  useEffect(() => {
    let cancelled = false;
    const stats = statsEnabled() ? createStatsRecorder(gl, scene, camera as PerspectiveCamera) : null;
    const target = new WebGLRenderTarget(1, 1, { type: HalfFloatType });
    const previous = gl.getRenderTarget();
    gl.setRenderTarget(target);
    const compiling = gl.compileAsync(scene, camera);
    gl.setRenderTarget(previous);
    compiling.then(
      () => {
        target.dispose();
        if (cancelled) return;
        let frames = 0;
        // 시계는 ms를 넘기지만 R3F advance는 초 단위다(frameloop="never"에서 clock.elapsedTime과 빼서 delta를 만든다).
        setRenderStep((timeMs) => {
          stats?.begin();
          advance(timeMs / 1000);
          frames += 1;
          stats?.end();
          if (frames === HIDDEN_FRAMES) {
            setSceneStatus("ready");
            stats?.ready();
          }
        });
      },
      () => {
        target.dispose();
        if (!cancelled) setSceneStatus("failed");
      },
    );
    return () => {
      cancelled = true;
      setRenderStep(null);
    };
  }, [gl, scene, camera, advance]);

  return null;
}
