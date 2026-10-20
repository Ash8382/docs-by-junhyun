"use client";

import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BackSide,
  Euler,
  LinearFilter,
  Matrix3,
  Matrix4,
  RepeatWrapping,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  type Mesh,
  type Scene,
  type Texture,
  type Vector3,
} from "three";
import { sceneQuality } from "@/lib/journey/capability";
import { SKY_ROTATION } from "@/lib/journey/space";

/** 하늘 구의 반지름. 카메라를 따라다니므로 카메라 먼 끝(600)보다만 작으면 된다 */
const SKY_RADIUS = 100;

/**
 * 하늘 방향 회전. three가 등장방형 배경을 그릴 때와 같은 규칙이다(WebGLBackground: 각도를 모두 뒤집은 회전으로 방향을 돌린 뒤
 * 등장방형 좌표를 구한다). 2-2에서 맞춘 SKY_ROTATION이 같은 하늘을 보인다.
 */
const ROTATION = new Matrix3().setFromMatrix4(
  new Matrix4().makeRotationFromEuler(new Euler(-SKY_ROTATION[0], -SKY_ROTATION[1], -SKY_ROTATION[2])),
);

const VERTEX = /* glsl */ `
varying vec3 vSkyWorld;
void main() {
  vec4 world = modelMatrix * vec4( position, 1.0 );
  vSkyWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}`;

const FRAGMENT = /* glsl */ `
#include <common>
uniform sampler2D uGalaxy;
uniform mat3 uRotation;
uniform float uIntensity;
varying vec3 vSkyWorld;
void main() {
  vec3 direction = uRotation * normalize( vSkyWorld - cameraPosition );
  gl_FragColor = vec4( texture2D( uGalaxy, equirectUv( direction ) ).rgb * uIntensity, 1.0 );
  #include <colorspace_fragment>
}`;

function asEquirect(loaded: Texture | Texture[]) {
  const texture = Array.isArray(loaded) ? loaded[0] : loaded;
  texture.colorSpace = SRGBColorSpace;
  // 하늘은 늘 확대되어 그려져(원본 90°에 1024화소, 화면은 50°에 900~1800화소) 밉맵이 필요 없다. 밉맵이 없으면 좌우 이음매도 생기지 않는다.
  texture.generateMipmaps = false;
  texture.minFilter = LinearFilter;
  texture.wrapS = RepeatWrapping;
}

function createSky(texture: Texture) {
  const geometry = new SphereGeometry(SKY_RADIUS, 32, 16);
  const material = new ShaderMaterial({
    uniforms: { uGalaxy: { value: texture }, uRotation: { value: ROTATION }, uIntensity: { value: 1 } },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    side: BackSide,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  return {
    geometry,
    material,
    dispose: () => {
      geometry.dispose();
      material.dispose();
    },
  };
}

/** 하늘 구를 카메라에 붙이고, 막별 은하 밝기(scene.backgroundIntensity, Atmosphere가 바꾼다)를 옮긴다 */
function follow(mesh: Mesh, material: ShaderMaterial, camera: { position: Vector3 }, scene: Scene): void {
  mesh.position.copy(camera.position);
  material.uniforms.uIntensity.value = scene.backgroundIntensity;
}

/**
 * 은하 배경(스펙 3절 "배경: 우주"). 등장방형 은하 사진을 카메라를 감싼 구에 직접 그린다(가장 먼저, 깊이 없이).
 * three에 등장방형을 scene.background로 넘기면 원본 높이(2048) 큐브로 바꾸며 밉맵과 면마다 깊이 버퍼를 붙여 약 220MiB를 더 쓴다
 * (스펙 7절 텍스처 예산 초과). 작은 큐브로 바꾸면 원본보다 해상도가 낮아져 별이 거칠게 늘어난다. 직접 그리면 원본(약 33.5MB)만 쓴다.
 * 이미지를 받는 동안 Canvas 안의 Suspense가 장면 전체를 기다리게 하므로, Warmup은 하늘이 걸린 뒤에 컴파일한다.
 * 받지 못하면 던져진 오류를 SceneBoundary가 잡아 3D만 빠진다. 3D 경량은 2048×1024 은하를 받는다(스펙 5절).
 */
export function Sky() {
  const [url] = useState(() => sceneQuality().galaxy);
  const texture = useTexture(url, asEquirect);
  const sky = useMemo(() => createSky(texture), [texture]);
  const mesh = useRef<Mesh>(null);
  useEffect(() => () => sky.dispose(), [sky]);
  useFrame((state) => {
    if (mesh.current) follow(mesh.current, sky.material, state.camera, state.scene);
  });
  return <mesh ref={mesh} name="journey-sky" geometry={sky.geometry} material={sky.material} renderOrder={-1} frustumCulled={false} />;
}
