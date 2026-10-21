import type { WebGLRenderer } from "three";
import { setRenderStep } from "@/lib/journey/engine";
import { setSceneStatus, type SceneFailure } from "@/lib/journey/sceneStatus";

/** 3D 장면을 멈추고 실패로 알린다. 여정은 2D로 바뀌고(2-4b) 본문·진행 막대·상세는 HTML이라 그대로 동작한다 */
export function failScene(reason: string, detail?: unknown, why: SceneFailure = "failed"): void {
  console.error(`여정 3D 장면을 멈춥니다: ${reason}`, detail ?? "");
  setRenderStep(null);
  setSceneStatus("failed", why);
}

/**
 * 셰이더 컴파일 실패와 WebGL 컨텍스트 손실을 감지한다(스펙 1절 2-2b 완료 조건, 5절 "실패 대응").
 * three는 onShaderError가 있으면 자기 오류 기록 대신 이것을 부르므로, 여기서 프로그램·셰이더 기록을 콘솔에 남긴다.
 * 해제 함수를 돌려준다. 장면을 내릴 때 R3F가 컨텍스트를 일부러 잃게 하므로(forceContextLoss) 그 전에 해제해야 한다.
 */
export function watchRenderer(gl: WebGLRenderer): () => void {
  gl.debug.onShaderError = (context, program, vertexShader, fragmentShader) => {
    failScene("셰이더 컴파일 실패", {
      program: context.getProgramInfoLog(program),
      vertex: context.getShaderInfoLog(vertexShader),
      fragment: context.getShaderInfoLog(fragmentShader),
    });
  };
  const canvas = gl.domElement;
  const onContextLost = () => failScene("WebGL 컨텍스트 손실", undefined, "context-lost");
  canvas.addEventListener("webglcontextlost", onContextLost);
  return () => {
    gl.debug.onShaderError = null;
    canvas.removeEventListener("webglcontextlost", onContextLost);
  };
}
