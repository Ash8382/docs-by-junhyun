"use client";

import { Environment, Lightformer } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { Fog, SRGBColorSpace, type DirectionalLight, type HemisphereLight } from "three";
import { atmosphereAt } from "@/lib/journey/atmosphere";
import { scrollState } from "@/lib/journey/scrollState";

/** 주광의 자리. 도로가 −z로 뻗으므로 앞 왼쪽 위에서 비춘다 */
const KEY_POSITION: [number, number, number] = [-6, 12, 8];

/**
 * 조명·안개·은하 밝기·환경 반사 세기(스펙 3절 "막별 분위기"). 매 프레임 스크롤 진행률의 분위기(lib/journey/atmosphere.ts)를 적용한다.
 * 배경 자체는 Sky의 은하 사진이고, 여기서는 그 밝기만 바꾼다.
 * 빛의 개수와 안개 종류는 바꾸지 않는다. 바뀌면 셰이더를 다시 컴파일해 프레임이 끊긴다.
 * 환경 반사는 이미지 파일 없이 Lightformer로 만든다. 차 도장에 위쪽 흰 빛과 양옆의 주황·파랑 띠(1막·3막의 빛)가 비친다.
 */
export function Atmosphere() {
  const hemisphere = useRef<HemisphereLight>(null);
  const key = useRef<DirectionalLight>(null);

  useFrame((state) => {
    const atmosphere = atmosphereAt(scrollState.progress);
    const { fog } = state.scene;
    state.scene.backgroundIntensity = atmosphere.galaxy;
    state.scene.environmentIntensity = atmosphere.environment;
    if (fog instanceof Fog) {
      fog.color.setRGB(...atmosphere.fogColor, SRGBColorSpace);
      fog.near = atmosphere.fogNear;
      fog.far = atmosphere.fogFar;
    }
    if (hemisphere.current) {
      hemisphere.current.color.setRGB(...atmosphere.sky, SRGBColorSpace);
      hemisphere.current.groundColor.setRGB(...atmosphere.ground, SRGBColorSpace);
      hemisphere.current.intensity = atmosphere.hemisphere;
    }
    if (key.current) {
      key.current.color.setRGB(...atmosphere.key, SRGBColorSpace);
      key.current.intensity = atmosphere.keyIntensity;
    }
  });

  return (
    <>
      {/* 첫 값일 뿐이다. 첫 프레임부터 위의 useFrame이 진행률의 값으로 바꾼다 */}
      <fog attach="fog" args={["#1c0e06", 30, 140]} />
      <hemisphereLight ref={hemisphere} />
      <directionalLight ref={key} position={KEY_POSITION} />
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" color="#ffffff" intensity={2} scale={10} position={[0, 8, 0]} rotation-x={Math.PI / 2} />
        <Lightformer form="rect" color="#ffb27a" intensity={1.5} scale={[20, 2, 1]} position={[-10, 3, 0]} rotation-y={Math.PI / 2} />
        <Lightformer form="rect" color="#9cc8ff" intensity={1.5} scale={[20, 2, 1]} position={[10, 3, 0]} rotation-y={-Math.PI / 2} />
        <Lightformer form="rect" color="#ffffff" intensity={0.8} scale={[20, 2, 1]} position={[0, 3, -10]} />
      </Environment>
    </>
  );
}
