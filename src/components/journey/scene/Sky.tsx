"use client";

import { useTexture } from "@react-three/drei";
import { EquirectangularReflectionMapping, Euler, SRGBColorSpace, type Texture } from "three";
import { GALAXY_URL, SKY_ROTATION } from "@/lib/journey/space";

/** 하늘의 방향. 모듈 밖에 두어 렌더마다 같은 객체를 붙인다 */
const ROTATION = new Euler(...SKY_ROTATION);

function asEquirect(loaded: Texture | Texture[]) {
  const texture = Array.isArray(loaded) ? loaded[0] : loaded;
  texture.mapping = EquirectangularReflectionMapping;
  texture.colorSpace = SRGBColorSpace;
}

/**
 * 은하 배경(스펙 3절 "배경: 우주"). 등장방형 은하 사진을 장면 배경으로 두른다. 밝기는 Atmosphere가 막마다 바꾼다.
 * 이미지를 받는 동안 Canvas 안의 Suspense가 장면 전체를 기다리게 하므로, Warmup은 배경이 걸린 뒤에 컴파일한다.
 * 받지 못하면 던져진 오류를 SceneBoundary가 잡아 3D만 빠진다.
 */
export function Sky() {
  const texture = useTexture(GALAXY_URL, asEquirect);
  return (
    <>
      <primitive attach="background" object={texture} />
      <primitive attach="backgroundRotation" object={ROTATION} />
    </>
  );
}
