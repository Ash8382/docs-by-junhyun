import { Color } from "three";
import { GLOW, TRAIL_LINEAR, TRAIL_MIX_END, TRAIL_MIX_START } from "@/lib/journey/trail";
import { glslFloat } from "./shaderChunks";

/**
 * 궤적 색과 발광의 GLSL 판(lib/journey/trail.ts의 trailMix·trailColor·glow와 같은 상수, 같은 식).
 * trailShader.test.ts가 이 글자를 자바스크립트로 옮겨 실행해 TypeScript 계산과 같은지 확인한다.
 * 그래서 함수 안에서는 float·vec3 선언, smoothstep·clamp·mix와 사칙연산만 쓴다.
 */
export const TRAIL_GLSL = /* glsl */ `
#define TRAIL_MIX_START ${glslFloat(TRAIL_MIX_START)}
#define TRAIL_MIX_END ${glslFloat(TRAIL_MIX_END)}
#define GLOW_DIM ${glslFloat(GLOW.dim)}
#define GLOW_FULL ${glslFloat(GLOW.full)}
#define GLOW_FILL ${glslFloat(GLOW.fill)}
uniform vec3 uTrailStart;
uniform vec3 uTrailMiddle;
uniform vec3 uTrailEnd;

float journeyTrailMix( float s ) {
  return smoothstep( TRAIL_MIX_START, TRAIL_MIX_END, s );
}

vec3 journeyTrailColor( float s ) {
  float m = journeyTrailMix( s );
  return mix( mix( uTrailStart, uTrailMiddle, clamp( m * 2.0, 0.0, 1.0 ) ), uTrailEnd, clamp( m * 2.0 - 1.0, 0.0, 1.0 ) );
}

float journeyGlow( float s, float carS, float ending ) {
  float passed = 1.0 - smoothstep( carS - GLOW_FILL, carS, s );
  return mix( mix( GLOW_DIM, GLOW_FULL, passed ), GLOW_FULL, ending );
}`;

/** TRAIL_GLSL의 색 uniform. 선형 색이라 Color에 그대로 넣는다(three의 작업 색 공간이 선형 sRGB다) */
export function trailUniforms() {
  return {
    uTrailStart: { value: new Color(...TRAIL_LINEAR.start) },
    uTrailMiddle: { value: new Color(...TRAIL_LINEAR.middle) },
    uTrailEnd: { value: new Color(...TRAIL_LINEAR.end) },
  };
}
