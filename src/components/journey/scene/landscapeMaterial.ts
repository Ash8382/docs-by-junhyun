import { DoubleSide, ShaderMaterial, Vector3 } from "three";
import { APPEAR, ENDING, LIGHT } from "@/lib/journey/landscape";
import { glslFloat } from "./shaderChunks";
import { TRAIL_GLSL, trailUniforms } from "./trailShader";

/**
 * 막별 풍경 재질(스펙 3절 "재질과 안개"). 풍경 메시 넷이 이 재질 하나를 함께 쓴다(셰이더 프로그램 하나).
 * 어두운 덩어리에 그 자리 궤적 색을 섞은 풍경 전용 안개(멀수록·뒤 겹일수록 녹는다)와, 능선·지붕·세로 모서리·암석 윤곽의 가는 빛을 그린다.
 * 등장·밝기·빛 켜짐·빛 세기는 lib/journey/landscape.ts와 같은 상수·같은 식이다(LANDSCAPE_GLSL, landscapeMaterial.test.ts가 맞춰 본다).
 * 매 프레임 uniform 셋(uRevealS, uCarS, uEnding)만 바뀌어 스크롤 중에 셰이더를 다시 컴파일하지 않는다. 장면 안개 대신 풍경 전용 안개를 쓴다.
 */

/**
 * 풍경의 명암과 대기(선형): 바탕·안개 휘도, 안개가 차는 거리(m), 겹마다 더 녹는 정도, 꼭대기에서 어두워지는 폭(m),
 * 도로 아래에서 어둠에 잠기는 폭(절벽·암석)과 투명하게 사라지는 폭(도시·첨탑, m), 첨탑 꼭대기 빛의 폭(m), 주광 방향
 */
export const LANDSCAPE_SHADE = {
  base: 0.007,
  haze: 0.0161,
  hazeNear: 40,
  hazeFar: 230,
  layerHaze: 0.22,
  topFade: 70,
  sinkDark: 45,
  sinkDissolve: 20,
  tipGlow: 14,
  key: [-0.385, 0.769, 0.513],
} as const;

/**
 * 등장·밝기·빛 켜짐·빛 세기의 GLSL 판(landscape.ts의 appearLevel·brightnessLevel·lightLevel·rimColor와 같은 식)과 면의 명암.
 * 면 법선은 감김에서 나오는데 길 양쪽의 감김이 반대라, 뒷면이 보이면(facing −1) 법선을 뒤집어 보이는 쪽이 빛을 받게 한다
 */
export const LANDSCAPE_GLSL = /* glsl */ `
#define APPEAR_FADE ${glslFloat(APPEAR.fade)}
#define APPEAR_ENTER ${glslFloat(APPEAR.enter)}
#define APPEAR_NEXT ${glslFloat(APPEAR.next)}
#define LIGHT_LEAD ${glslFloat(LIGHT.lead)}
#define LIGHT_FADE ${glslFloat(LIGHT.fade)}
#define RIM_LUMINANCE ${glslFloat(LIGHT.rim)}

float landscapeAppear( float from, float carS ) {
  return smoothstep( from, from + APPEAR_FADE, carS );
}

float landscapeBrightness( float start, float carS ) {
  return APPEAR_NEXT + ( 1.0 - APPEAR_NEXT ) * smoothstep( start - APPEAR_ENTER, start, carS );
}

float landscapeLight( float s, float start, float revealS ) {
  return smoothstep( start - LIGHT_FADE, start, revealS ) * smoothstep( s - LIGHT_FADE, s, revealS + LIGHT_LEAD );
}

float landscapeRim( float luminance ) {
  return RIM_LUMINANCE / max( luminance, 0.001 );
}

float landscapeUp( vec3 normal, float facing ) {
  return clamp( facing * dot( normal, vec3( 0.0, 1.0, 0.0 ) ), 0.0, 1.0 );
}

float landscapeDiffuse( vec3 normal, vec3 key, float facing ) {
  return max( facing * dot( normal, key ), 0.0 );
}`;

const VERTEX = /* glsl */ `
attribute float aS;
attribute float aActStart;
attribute float aAppearFrom;
attribute float aRidge;
attribute float aRidge2;
attribute float aGlow;
attribute float aBelow;
attribute float aBelowTop;
attribute float aLayer;
attribute float aEdge;
attribute float aDissolve;
attribute vec3 aRimNormal;
varying float vS;
varying float vActStart;
varying float vAppearFrom;
varying float vRidge;
varying float vRidge2;
varying float vGlow;
varying float vBelow;
varying float vBelowTop;
varying float vLayer;
varying float vEdge;
varying float vDissolve;
varying vec3 vRimNormal;
varying vec3 vNormalW;
varying vec3 vWorld;
void main() {
  vS = aS;
  vActStart = aActStart;
  vAppearFrom = aAppearFrom;
  vRidge = aRidge;
  vRidge2 = aRidge2;
  vGlow = aGlow;
  vBelow = aBelow;
  vBelowTop = aBelowTop;
  vLayer = aLayer;
  vEdge = aEdge;
  vDissolve = aDissolve;
  vRimNormal = mat3( modelMatrix ) * aRimNormal;
  vNormalW = normalize( mat3( modelMatrix ) * normal );
  vec4 world = modelMatrix * vec4( position, 1.0 );
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}`;

const FRAGMENT = /* glsl */ `
${TRAIL_GLSL}
${LANDSCAPE_GLSL}
#define BASE_LUMINANCE ${glslFloat(LANDSCAPE_SHADE.base)}
#define HAZE_LUMINANCE ${glslFloat(LANDSCAPE_SHADE.haze)}
#define HAZE_NEAR ${glslFloat(LANDSCAPE_SHADE.hazeNear)}
#define HAZE_FAR ${glslFloat(LANDSCAPE_SHADE.hazeFar)}
#define LAYER_HAZE ${glslFloat(LANDSCAPE_SHADE.layerHaze)}
#define TOP_FADE ${glslFloat(LANDSCAPE_SHADE.topFade)}
#define SINK_DARK ${glslFloat(LANDSCAPE_SHADE.sinkDark)}
#define SINK_DISSOLVE ${glslFloat(LANDSCAPE_SHADE.sinkDissolve)}
#define TIP_GLOW ${glslFloat(LANDSCAPE_SHADE.tipGlow)}
#define ENDING_OPACITY ${glslFloat(ENDING.opacity)}
#define ENDING_LIGHT ${glslFloat(ENDING.light)}
#define ENDING_HAZE ${glslFloat(ENDING.haze)}
uniform float uRevealS;
uniform float uCarS;
uniform float uEnding;
uniform vec3 uKey;
varying float vS;
varying float vActStart;
varying float vAppearFrom;
varying float vRidge;
varying float vRidge2;
varying float vGlow;
varying float vBelow;
varying float vBelowTop;
varying float vLayer;
varying float vEdge;
varying float vDissolve;
varying vec3 vRimNormal;
varying vec3 vNormalW;
varying vec3 vWorld;

float landscapeHash( vec2 p ) {
  return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 );
}

float landscapeNoise( vec2 p ) {
  vec2 i = floor( p );
  vec2 f = fract( p );
  vec2 u = f * f * ( 3.0 - 2.0 * f );
  return mix( mix( landscapeHash( i ), landscapeHash( i + vec2( 1.0, 0.0 ) ), u.x ),
              mix( landscapeHash( i + vec2( 0.0, 1.0 ) ), landscapeHash( i + vec2( 1.0, 1.0 ) ), u.x ), u.y );
}

void main() {
  // 막 단위 등장: 두 막 앞은 그리지 않는다(장면이 메시도 감춘다)
  float appear = landscapeAppear( vAppearFrom, uCarS );
  if ( appear <= 0.001 ) discard;
  vec3 luminanceWeights = vec3( 0.2126, 0.7152, 0.0722 );
  // 양면을 그린다: 뒷면이 보이면 법선을 뒤집는다(길 양쪽의 면 감김이 반대다)
  float facing = gl_FrontFacing ? 1.0 : -1.0;
  float up = landscapeUp( vNormalW, facing );
  // 도로 아래: 절벽·암석은 어둠에 잠기고, 도시·첨탑은 투명하게 사라진다
  float sink = smoothstep( 0.0, mix( SINK_DARK, SINK_DISSOLVE, vDissolve ), vBelow );
  // 위는 약간 밝고 아래로 갈수록 어두워진다. 세로 결이 면을 나눈다
  float topLight = 1.0 - 0.55 * smoothstep( 0.0, TOP_FADE, vBelowTop );
  float grain = 0.72 + 0.28 * landscapeNoise( vec2( vS * 0.45, vWorld.y * 0.035 ) ) + 0.12 * landscapeNoise( vec2( vS * 1.7, vWorld.y * 0.12 ) );
  // 면마다 주광 방향에 따라 밝기가 다르다(형태가 읽히게). 바탕은 여전히 거의 검다
  float diffuse = landscapeDiffuse( normalize( vNormalW ), uKey, facing );
  vec3 trail = journeyTrailColor( vS );
  vec3 tint = trail / max( dot( trail, luminanceWeights ), 0.001 );
  vec3 base = mix( vec3( BASE_LUMINANCE ), tint * BASE_LUMINANCE, 0.45 ) * ( 0.25 + 1.6 * diffuse + 0.5 * up );
  // 풍경 전용 대기 원근: 멀수록, 뒤 겹일수록 그 자리 궤적 색의 옅은 안개로. 엔딩에서는 전체를 안개 쪽으로 물린다
  float haze = smoothstep( HAZE_NEAR, HAZE_FAR, length( vWorld - cameraPosition ) );
  haze = clamp( haze + LAYER_HAZE * vLayer, 0.0, 1.0 );
  haze = max( haze, ENDING_HAZE * uEnding );
  vec3 hazeColor = mix( vec3( HAZE_LUMINANCE ), tint * HAZE_LUMINANCE, 0.6 ) * ( 0.8 + 0.2 * up ) * ( 1.0 - mix( 0.92, 1.0, vDissolve ) * sink ) * topLight * grain;
  base *= ( 1.0 - mix( 0.85, 1.0, vDissolve ) * sink ) * topLight * grain;
  // 능선·지붕까지의 거리를 화면 미분으로 나눠 화면에서 굵기가 일정한 선(가는 심 + 옅은 후광)
  float w = max( fwidth( vRidge ), 1e-4 );
  float line = max( 1.0 - smoothstep( 0.0, 1.4 * w, vRidge ), 0.3 * ( 1.0 - smoothstep( 0.0, 6.0 * w, vRidge ) ) );
  // 세로 모서리 하나(주요 건물·첨탑)
  float w2 = max( fwidth( vRidge2 ), 1e-4 );
  line = max( line, max( 1.0 - smoothstep( 0.0, 1.4 * w2, vRidge2 ), 0.3 * ( 1.0 - smoothstep( 0.0, 6.0 * w2, vRidge2 ) ) ) );
  // 암석: 빛을 받는 쪽 윤곽(카메라에서 비스듬히 보이는 면)만
  vec3 viewDirection = normalize( cameraPosition - vWorld );
  vec3 rimNormal = normalize( vRimNormal + vec3( 1e-5 ) );
  float band = smoothstep( 0.9, 0.99, 1.0 - abs( dot( rimNormal, viewDirection ) ) ) * 0.72;
  float keyFacing = smoothstep( 0.05, 0.5, dot( rimNormal, uKey ) );
  line = max( line, band * keyFacing * vEdge );
  // 첨탑 꼭대기는 위로 갈수록 밝아진다
  line = max( line, step( 1.5, vGlow ) * 0.8 * ( 1.0 - smoothstep( 0.0, TIP_GLOW, vRidge ) ) );
  float on = landscapeLight( vS, vActStart, uRevealS );
  float dim = mix( 1.0, ENDING_LIGHT, uEnding );
  vec3 rim = trail * landscapeRim( dot( trail, luminanceWeights ) ) * line * min( vGlow, 1.0 ) * on * dim * ( 1.0 - 0.6 * haze ) * ( 1.0 - vDissolve * sink );
  // 엔딩에서는 반쯤 투명해져 물러난다. 도시·첨탑의 도로 아래는 투명하게 사라진다
  float alpha = mix( 1.0, ENDING_OPACITY, uEnding ) * appear * ( 1.0 - vDissolve * sink );
  if ( alpha < 0.02 ) discard;
  gl_FragColor = vec4( ( mix( base, hazeColor, haze ) + rim ) * landscapeBrightness( vActStart, uCarS ), alpha );
  #include <colorspace_fragment>
}`;

/** 풍경 재질 하나. 엔딩의 반투명과 도시 아랫부분의 사라짐 때문에 투명 재질이고, 양면을 그린다 */
export function createLandscapeMaterial(): ShaderMaterial {
  const material = new ShaderMaterial({
    uniforms: {
      uRevealS: { value: 0 },
      uCarS: { value: 0 },
      uEnding: { value: 0 },
      uKey: { value: new Vector3(...LANDSCAPE_SHADE.key) },
    },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    side: DoubleSide,
    transparent: true,
  });
  Object.assign(material.uniforms, trailUniforms());
  return material;
}
