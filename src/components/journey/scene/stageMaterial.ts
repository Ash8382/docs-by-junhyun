import { Color, FrontSide, MeshStandardMaterial, type Side, type WebGLProgramParametersWithUniforms } from "three";
import { STAGE_EDGES, STAGE_EDGE_SOFTNESS, STAGE_GLOW_WIDTH, STAGE_NOISE } from "@/lib/journey/stage";

/**
 * 렌더 단계 재질(스펙 3절). MeshStandardMaterial에 onBeforeCompile로 단계 계산을 넣는다.
 * 면마다 월드 z에서 회랑 거리 s(= −z)를 구하고, lib/journey/stage.ts의 경계에서 청사진 → 클레이 → 완성품으로 바꾼다.
 * 청사진은 남색 면 위에 UV 1m 눈금마다 빛나는 선, 클레이는 무광 회색, 완성품은 재질마다 정한 색·거칠기·금속성과 환경 반사다.
 * 경계에는 노이즈를 따라 빛나는 선이 흐른다. 모든 재질이 같은 셰이더 글자를 써서 프로그램 하나를 같이 쓴다.
 */

export interface StageLook {
  /** 완성 단계의 색 */
  color: string;
  roughness: number;
  metalness: number;
  /** 가는 부재(문틀·액자)는 청사진 단계에서 면 전체가 선처럼 빛난다 */
  solidLine?: boolean;
  /** 청사진 단계에서 선 아닌 면을 비운다(벽 너머 우주가 보인다). 바닥은 채워 발밑이 허공이 되지 않게 한다 */
  hollowWire?: boolean;
  side?: Side;
}

/** 모든 단계 재질이 같은 객체를 본다. 장면이 매 프레임 한 번 바꾸면 전부에 반영된다 */
export const stageUniforms = {
  uJourneyTime: { value: 0 },
};

const WIRE_FILL = new Color("#0c2244");
const WIRE_LINE = new Color("#66c6ff").multiplyScalar(2.4);
const CLAY = new Color("#b9b6b0");
const GLOW = new Color("#d8f6ff").multiplyScalar(4);

function glslFloat(value: number): string {
  return Number.isInteger(value) ? `${value}.0` : `${value}`;
}

const VERTEX_PARS = /* glsl */ `#include <common>
varying vec3 vJourneyWorld;
varying vec2 vJourneyUv;`;

const VERTEX_WORLD = /* glsl */ `#include <project_vertex>
vec4 journeyWorld = vec4( transformed, 1.0 );
#ifdef USE_INSTANCING
  journeyWorld = instanceMatrix * journeyWorld;
#endif
vJourneyWorld = ( modelMatrix * journeyWorld ).xyz;
vJourneyUv = uv;`;

const FRAGMENT_PARS = /* glsl */ `#include <common>
#define STAGE_EDGE_0 ${glslFloat(STAGE_EDGES[0])}
#define STAGE_EDGE_1 ${glslFloat(STAGE_EDGES[1])}
#define STAGE_EDGE_SOFTNESS ${glslFloat(STAGE_EDGE_SOFTNESS)}
#define STAGE_GLOW_WIDTH ${glslFloat(STAGE_GLOW_WIDTH)}
#define STAGE_NOISE_SCALE ${glslFloat(STAGE_NOISE.scale)}
#define STAGE_NOISE_AMPLITUDE ${glslFloat(STAGE_NOISE.amplitude)}
#define STAGE_NOISE_SPEED ${glslFloat(STAGE_NOISE.speed)}
#define JOURNEY_SEAM 2.0
varying vec3 vJourneyWorld;
varying vec2 vJourneyUv;
uniform float uJourneyTime;
uniform vec3 uFinalColor;
uniform float uFinalRoughness;
uniform float uFinalMetalness;
uniform float uSolidLine;
uniform float uHollowWire;
uniform vec3 uWireFill;
uniform vec3 uWireLine;
uniform vec3 uClay;
uniform vec3 uGlow;

float journeyHash( vec3 p ) {
  p = fract( p * 0.3183099 + 0.1 );
  p *= 17.0;
  return fract( p.x * p.y * p.z * ( p.x + p.y + p.z ) );
}

float journeyNoise( vec3 x ) {
  vec3 i = floor( x );
  vec3 f = fract( x );
  f = f * f * ( 3.0 - 2.0 * f );
  return mix(
    mix( mix( journeyHash( i ), journeyHash( i + vec3( 1.0, 0.0, 0.0 ) ), f.x ),
         mix( journeyHash( i + vec3( 0.0, 1.0, 0.0 ) ), journeyHash( i + vec3( 1.0, 1.0, 0.0 ) ), f.x ), f.y ),
    mix( mix( journeyHash( i + vec3( 0.0, 0.0, 1.0 ) ), journeyHash( i + vec3( 1.0, 0.0, 1.0 ) ), f.x ),
         mix( journeyHash( i + vec3( 0.0, 1.0, 1.0 ) ), journeyHash( i + vec3( 1.0, 1.0, 1.0 ) ), f.x ), f.y ),
    f.z );
}`;

const FRAGMENT_STAGE = /* glsl */ `#include <color_fragment>
float journeyNoiseValue = journeyNoise( vJourneyWorld * STAGE_NOISE_SCALE + vec3( 0.0, uJourneyTime * STAGE_NOISE_SPEED, 0.0 ) );
float journeyEdge = - vJourneyWorld.z + ( journeyNoiseValue * 2.0 - 1.0 ) * STAGE_NOISE_AMPLITUDE;
float journeyWireToClay = smoothstep( STAGE_EDGE_0 - STAGE_EDGE_SOFTNESS, STAGE_EDGE_0 + STAGE_EDGE_SOFTNESS, journeyEdge );
float journeyClayToFinal = smoothstep( STAGE_EDGE_1 - STAGE_EDGE_SOFTNESS, STAGE_EDGE_1 + STAGE_EDGE_SOFTNESS, journeyEdge );
float journeyGlowWidth = STAGE_GLOW_WIDTH + fwidth( journeyEdge );
float journeyGlow = 1.0 - smoothstep( 0.0, journeyGlowWidth, abs( journeyEdge - STAGE_EDGE_0 ) );
journeyGlow += 1.0 - smoothstep( 0.0, journeyGlowWidth, abs( journeyEdge - STAGE_EDGE_1 ) );
vec2 journeyCellWidth = max( fwidth( vJourneyUv ), vec2( 1e-4 ) );
vec2 journeyCell = abs( fract( vJourneyUv - 0.5 ) - 0.5 ) / journeyCellWidth;
float journeyLine = 1.0 - min( min( journeyCell.x, journeyCell.y ), 1.0 );
journeyLine *= 1.0 - smoothstep( 0.2, 0.45, max( journeyCellWidth.x, journeyCellWidth.y ) );
journeyLine = max( journeyLine, uSolidLine );
if ( uHollowWire > 0.5 && journeyWireToClay < 0.5 && journeyLine < 0.08 ) discard;
vec2 journeySeamUv = vJourneyUv / JOURNEY_SEAM;
vec2 journeySeamCell = abs( fract( journeySeamUv - 0.5 ) - 0.5 ) / max( fwidth( journeySeamUv ), vec2( 1e-4 ) );
float journeySeam = ( 1.0 - min( min( journeySeamCell.x, journeySeamCell.y ), 1.0 ) ) * ( 1.0 - uSolidLine );
diffuseColor.rgb = mix( mix( uWireFill, uClay, journeyWireToClay ), uFinalColor, journeyClayToFinal );
diffuseColor.rgb *= 1.0 - 0.14 * journeySeam * journeyWireToClay;`;

const FRAGMENT_ROUGHNESS = /* glsl */ `#include <roughnessmap_fragment>
roughnessFactor = mix( mix( 1.0, 0.9, journeyWireToClay ), uFinalRoughness, journeyClayToFinal );`;

const FRAGMENT_METALNESS = /* glsl */ `#include <metalnessmap_fragment>
metalnessFactor = uFinalMetalness * journeyClayToFinal;`;

const FRAGMENT_EMISSIVE = /* glsl */ `#include <emissivemap_fragment>
totalEmissiveRadiance += uWireLine * journeyLine * ( 1.0 - journeyWireToClay ) + uGlow * journeyGlow;`;

// 환경 반사(Lightformer)는 완성품 단계에만 비친다.
const FRAGMENT_ENVIRONMENT = /* glsl */ `#include <lights_fragment_maps>
#if defined( RE_IndirectDiffuse )
  iblIrradiance *= journeyClayToFinal;
#endif
#if defined( RE_IndirectSpecular )
  radiance *= journeyClayToFinal;
#endif`;

function replaceOnce(source: string, anchor: string, replacement: string): string {
  if (!source.includes(anchor)) throw new Error(`three 셰이더에 주입 지점이 없습니다: ${anchor}`);
  return source.replace(anchor, replacement);
}

export function createStageMaterial(look: StageLook): MeshStandardMaterial {
  const material = new MeshStandardMaterial({ side: look.side ?? FrontSide });
  const uniforms = {
    uFinalColor: { value: new Color(look.color) },
    uFinalRoughness: { value: look.roughness },
    uFinalMetalness: { value: look.metalness },
    uSolidLine: { value: look.solidLine ? 1 : 0 },
    uHollowWire: { value: look.hollowWire ? 1 : 0 },
    uWireFill: { value: WIRE_FILL },
    uWireLine: { value: WIRE_LINE },
    uClay: { value: CLAY },
    uGlow: { value: GLOW },
  };
  material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    Object.assign(shader.uniforms, stageUniforms, uniforms);
    shader.vertexShader = replaceOnce(
      replaceOnce(shader.vertexShader, "#include <common>", VERTEX_PARS),
      "#include <project_vertex>",
      VERTEX_WORLD,
    );
    let fragment = shader.fragmentShader;
    fragment = replaceOnce(fragment, "#include <common>", FRAGMENT_PARS);
    fragment = replaceOnce(fragment, "#include <color_fragment>", FRAGMENT_STAGE);
    fragment = replaceOnce(fragment, "#include <roughnessmap_fragment>", FRAGMENT_ROUGHNESS);
    fragment = replaceOnce(fragment, "#include <metalnessmap_fragment>", FRAGMENT_METALNESS);
    fragment = replaceOnce(fragment, "#include <emissivemap_fragment>", FRAGMENT_EMISSIVE);
    fragment = replaceOnce(fragment, "#include <lights_fragment_maps>", FRAGMENT_ENVIRONMENT);
    shader.fragmentShader = fragment;
  };
  // 셰이더 글자가 재질마다 같으므로 프로그램 하나를 같이 쓴다. 재질마다 다른 값은 uniform으로만 넘긴다.
  material.customProgramCacheKey = () => "journey-stage";
  return material;
}
