import { AdditiveBlending, Mesh, PlaneGeometry, ShaderMaterial } from "three";
import { endingPoint } from "@/lib/journey/drive";
import { glslFloat } from "./shaderChunks";

/**
 * 엔딩의 흰 점(병합 뒤 새 엔딩 "여정이 하나의 빛이 되다"). 지나온 길의 빛이 길 끝으로 모여 작고 밝은 흰 점 하나가 되고 은은하게 맥동한다.
 * 크게 터지거나 번쩍이지 않는다(사용자 결정). 카메라를 향하는 판 하나에 흰 중심과 옅은 빛무리를 그리고, 블룸이 걸리도록 밝기를 1보다 높인다.
 */

/** 판 한 변(m). 다가간 자리(약 85~100m)에서 빛무리가 화면 높이의 10% 안팎이다 */
export const POINT_SIZE = 10;
/** 맥동: 주기(초)와 밝기 폭 */
export const PULSE = { period: 2.8, amount: 0.12 } as const;
/** 흰 중심의 밝기(선형 HDR)와 빛무리 밝기 */
const LIGHT = { core: 7, halo: 0.45 } as const;

const VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`;

const FRAGMENT = /* glsl */ `
#define CORE_LIGHT ${glslFloat(LIGHT.core)}
#define HALO_LIGHT ${glslFloat(LIGHT.halo)}
uniform float uLevel;
uniform float uPulse;
varying vec2 vUv;
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r2 = dot( p, p );
  float core = exp( -r2 * 140.0 );
  float halo = exp( -r2 * 7.0 );
  float light = ( core * CORE_LIGHT + halo * HALO_LIGHT ) * uLevel * uPulse;
  if ( light < 0.002 ) discard;
  // 중심은 희고, 빛무리는 아주 옅게 푸르다(마지막까지 남은 색)
  vec3 color = mix( vec3( 0.78, 0.86, 1.0 ), vec3( 1.0 ), clamp( core * 3.0, 0.0, 1.0 ) );
  gl_FragColor = vec4( color * light, 1.0 );
  #include <colorspace_fragment>
}`;

export interface EndingPointMesh {
  mesh: Mesh;
  material: ShaderMaterial;
  dispose(): void;
}

export function createEndingPoint(): EndingPointMesh {
  const geometry = new PlaneGeometry(POINT_SIZE, POINT_SIZE);
  const material = new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: { uLevel: { value: 0 }, uPulse: { value: 1 } },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const mesh = new Mesh(geometry, material);
  mesh.name = "journey-ending-point";
  mesh.position.set(...endingPoint());
  // 처음 준비(Warmup)가 셰이더를 미리 컴파일하도록 처음에는 보이게 둔다. 그 뒤로는 점이 생기는 동안만 그린다(EndingPoint)
  mesh.frustumCulled = false;
  return {
    mesh,
    material,
    dispose: () => {
      geometry.dispose();
      material.dispose();
    },
  };
}

/** 한 프레임: 점의 밝기(엔딩 point 단계 0~1)와 맥동(시간 초, 움직임 줄이기면 맥동 없음) */
export function writeEndingPoint(point: EndingPointMesh, level: number, seconds: number, still: boolean): void {
  point.material.uniforms.uLevel.value = level;
  point.material.uniforms.uPulse.value = still ? 1 : 1 + PULSE.amount * Math.sin((seconds / PULSE.period) * Math.PI * 2);
  point.mesh.visible = level > 0;
}
