import { MeshStandardMaterial, type WebGLProgramParametersWithUniforms } from "three";
import { ROAD_END, ROAD_START } from "@/lib/journey/drive";
import { REVEAL_EDGE } from "@/lib/journey/trail";
import { NOISE_GLSL, glslFloat, replaceOnce } from "./shaderChunks";
import { TRAIL_GLSL, trailUniforms } from "./trailShader";

/**
 * 빛의 길 재질(스펙 3절 "길이 열린다, 색이 쌓인다"). MeshStandardMaterial에 onBeforeCompile로 도로 계산을 넣는다.
 * 정점마다 도로 좌표(journeyRoad: s, 옆 거리, 반폭, 면 자리, lib/journey/road.ts)를 받아
 *   - 열린 끝(uRevealS) 너머는 그리지 않고(discard), 경계에는 도로 좌표의 노이즈를 따라 빛나는 선이 흐른다.
 *   - 색은 journeyTrailColor(s), 세기는 journeyGlow(s, uCarS, uEnding)다(trailShader.ts, TypeScript와 같은 식).
 *   - 윗면은 어두운 메탈 노면 위에 가장자리 선과 차선을, 옆면은 빛나는 띠를 그린다.
 *   - 엔딩(병합 뒤 "여정이 하나의 빛이 되다"): 길이 가운데 한 줄의 빛으로 좁아지고(uLine), 빛이 출발점부터 길 끝으로 흘러 짧아진다(uTail).
 *     남은 빛 안에 주황·보라·파랑을 모두 눌러 담아 끝점에서 겹친다.
 * 진행에 따라 바뀌는 값은 모두 uniform이라 스크롤 중에 셰이더를 다시 컴파일하지 않는다.
 */

/** 장면이 매 프레임 한 번 바꾸는 값. 도로 재질이 같은 객체를 본다 */
export const roadUniforms = {
  uJourneyTime: { value: 0 },
  uRevealS: { value: 0 },
  uCarS: { value: 0 },
  uEnding: { value: 0 },
  /** 엔딩: 한 줄의 빛으로 좁아진 정도(0~1) */
  uLine: { value: 0 },
  /** 엔딩: 빛의 꼬리가 있는 도로 s(m). 출발점(ROAD_START)에서 길 끝(ROAD_END)으로 간다 */
  uTail: { value: ROAD_START },
};

/** 발광 배율(선형 HDR). 블룸은 밝기 1을 넘는 빛에 걸린다 */
const LIGHT = { fill: 0.4, line: 3.2, side: 2.2, under: 0.08, edge: 7 } as const;
/** 엔딩의 한 줄 빛: 가운데에서 남기는 반폭(m)과 밝기(선형 HDR) */
const LINE = { half: 0.35, light: 4.5 } as const;
/** 노면 그림: 가장자리 선(가장자리에서 안쪽으로 inset, 폭 width), 차선 간격과 점선 주기(m) */
const LINES = { inset: 0.35, width: 0.09, laneSpacing: 4, dash: 6 } as const;

const VERTEX_PARS = /* glsl */ `#include <common>
attribute vec4 journeyRoad;
varying vec4 vJourneyRoad;`;

const VERTEX_ROAD = /* glsl */ `#include <begin_vertex>
vJourneyRoad = journeyRoad;`;

const FRAGMENT_PARS = /* glsl */ `#include <common>
#define EDGE_NOISE_SCALE ${glslFloat(REVEAL_EDGE.noiseScale)}
#define EDGE_AMPLITUDE ${glslFloat(REVEAL_EDGE.amplitude)}
#define EDGE_NOISE_SPEED ${glslFloat(REVEAL_EDGE.speed)}
#define EDGE_GLOW_WIDTH ${glslFloat(REVEAL_EDGE.glowWidth)}
#define LIGHT_FILL ${glslFloat(LIGHT.fill)}
#define LIGHT_LINE ${glslFloat(LIGHT.line)}
#define LIGHT_SIDE ${glslFloat(LIGHT.side)}
#define LIGHT_UNDER ${glslFloat(LIGHT.under)}
#define LIGHT_EDGE ${glslFloat(LIGHT.edge)}
#define LINE_INSET ${glslFloat(LINES.inset)}
#define LINE_WIDTH ${glslFloat(LINES.width)}
#define LANE_SPACING ${glslFloat(LINES.laneSpacing)}
#define LANE_DASH ${glslFloat(LINES.dash)}
#define LINE_HALF ${glslFloat(LINE.half)}
#define LINE_LIGHT ${glslFloat(LINE.light)}
#define ROAD_START_S ${glslFloat(ROAD_START)}
#define ROAD_END_S ${glslFloat(ROAD_END)}
varying vec4 vJourneyRoad;
uniform float uJourneyTime;
uniform float uRevealS;
uniform float uCarS;
uniform float uEnding;
uniform float uLine;
uniform float uTail;
${NOISE_GLSL}
${TRAIL_GLSL}

/** 거리 d에 놓인 폭 width 선. 화소가 선보다 굵어지면(멀리서) 흐려져 앨리어싱 대신 고르게 사라진다 */
float journeyLine( float d, float width, float pixel ) {
  float line = 1.0 - smoothstep( width, width + pixel, abs( d ) );
  return line * ( 1.0 - smoothstep( width * 1.5, width * 4.0, pixel ) );
}`;

const FRAGMENT_ROAD = /* glsl */ `#include <color_fragment>
float journeyS = vJourneyRoad.x;
float journeyLateral = vJourneyRoad.y;
float journeyHalf = vJourneyRoad.z;
float journeyFace = vJourneyRoad.w;
// 열린 끝. 노이즈는 도로 좌표로 계산해 경계가 움직여도 무늬가 미끄러지지 않는다.
float journeyNoiseValue = journeyNoise( vec3( journeyS * EDGE_NOISE_SCALE, journeyLateral * EDGE_NOISE_SCALE, uJourneyTime * EDGE_NOISE_SPEED ) );
float journeyEdge = journeyS - uRevealS - ( journeyNoiseValue * 2.0 - 1.0 ) * EDGE_AMPLITUDE;
// 도함수는 discard 전에 구한다(균일하지 않은 흐름 안에서는 값이 정해지지 않는다).
float journeyEdgePixel = fwidth( journeyEdge );
float journeyLateralPixel = fwidth( journeyLateral );
float journeySPixel = fwidth( journeyS );
if ( journeyEdge > 0.0 ) discard;
// 엔딩: 가운데 한 줄만 남기고, 꼬리보다 뒤(지나간 빛)는 그리지 않는다. 옆면은 가장자리라 좁아지면 함께 사라진다
if ( abs( journeyLateral ) > mix( journeyHalf + 1.0, LINE_HALF, uLine ) || journeyS < uTail ) discard;
float journeyBoundary = 1.0 - smoothstep( 0.0, EDGE_GLOW_WIDTH + journeyEdgePixel, - journeyEdge );
float journeyTop = 1.0 - step( 0.5, journeyFace );
float journeyUnder = step( 2.5, journeyFace );
float journeySide = 1.0 - journeyTop - journeyUnder;
// 윗면: 가장자리 선과, 가운데에서 LANE_SPACING마다 긋는 점선 차선(가장자리 가까이는 긋지 않는다)
float journeyEdgeLine = journeyLine( journeyHalf - abs( journeyLateral ) - LINE_INSET, LINE_WIDTH, journeyLateralPixel );
float journeyLane = ( fract( journeyLateral / LANE_SPACING + 0.5 ) - 0.5 ) * LANE_SPACING;
float journeyLaneLine = journeyLine( journeyLane, LINE_WIDTH, journeyLateralPixel );
journeyLaneLine *= step( LANE_SPACING * 0.5, journeyHalf - abs( journeyLateral ) + LINE_WIDTH );
journeyLaneLine *= step( fract( journeyS / LANE_DASH ), 0.5 ) * ( 1.0 - smoothstep( 0.5, 2.0, journeySPixel ) );
float journeyLines = max( journeyEdgeLine, journeyLaneLine );
float journeyLight = journeyTop * ( LIGHT_FILL + LIGHT_LINE * journeyLines )
  + journeySide * LIGHT_SIDE * ( 1.0 - 0.7 * clamp( journeyFace - 1.0, 0.0, 1.0 ) )
  + journeyUnder * LIGHT_UNDER;
// 엔딩: 차선 무늬 대신 고른 빛줄기. 남은 빛(꼬리 ~ 길 끝)에 출발점 ~ 길 끝의 색을 눌러 담아, 흐르는 동안 색이 함께 끝으로 간다
journeyLight = mix( journeyLight, journeyTop * LINE_LIGHT, uLine );
float journeyFlowS = mix( ROAD_START_S, ROAD_END_S, clamp( ( journeyS - uTail ) / max( ROAD_END_S - uTail, 1e-3 ), 0.0, 1.0 ) );
vec3 journeyColor = journeyTrailColor( journeyFlowS );
vec3 journeyRadiance = journeyColor * journeyGlow( journeyS, uCarS, uEnding ) * journeyLight
  + mix( journeyColor, vec3( 1.0 ), 0.55 ) * journeyBoundary * LIGHT_EDGE;
diffuseColor.rgb *= 1.0 - 0.6 * journeySide;`;

const FRAGMENT_EMISSIVE = /* glsl */ `#include <emissivemap_fragment>
totalEmissiveRadiance += journeyRadiance;`;

/** 도로 재질 하나를 만든다. 노면은 어두운 메탈이다. 환경 반사는 약하게 해 지나간 길과 아직 지나지 않은 길의 밝기 차이가 묻히지 않게 한다 */
export function createRoadMaterial(): MeshStandardMaterial {
  const material = new MeshStandardMaterial({ color: "#0b0e14", metalness: 0.55, roughness: 0.42, envMapIntensity: 0.15 });
  const colors = trailUniforms();
  material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    Object.assign(shader.uniforms, roadUniforms, colors);
    shader.vertexShader = replaceOnce(
      replaceOnce(shader.vertexShader, "#include <common>", VERTEX_PARS),
      "#include <begin_vertex>",
      VERTEX_ROAD,
    );
    let fragment = shader.fragmentShader;
    fragment = replaceOnce(fragment, "#include <common>", FRAGMENT_PARS);
    fragment = replaceOnce(fragment, "#include <color_fragment>", FRAGMENT_ROAD);
    fragment = replaceOnce(fragment, "#include <emissivemap_fragment>", FRAGMENT_EMISSIVE);
    shader.fragmentShader = fragment;
  };
  // 번들 경계 e2e가 이 글자로 장면 코드를 알아본다(journey.e2e.ts "다른 페이지는 여정 3D 장면 코드를…")
  material.customProgramCacheKey = () => "journey-road";
  return material;
}
