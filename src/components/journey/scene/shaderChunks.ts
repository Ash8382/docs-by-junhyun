/**
 * 여정 셰이더가 같이 쓰는 조각. three 표준 재질에 onBeforeCompile로 계산을 끼워 넣을 때 쓴다.
 * 2-2의 렌더 단계 재질에서 옮겨 왔다(노이즈를 따라 빛나는 경계). 2-3의 지형·홀로그램 재질도 이 조각을 쓴다.
 */

/** GLSL 실수 글자. 정수도 소수점을 붙인다(1 → 1.0) */
export function glslFloat(value: number): string {
  return Number.isInteger(value) ? `${value}.0` : `${value}`;
}

/** three 셰이더 글자에서 주입 지점 하나를 바꾼다. 지점이 없으면(three가 바뀌면) 바로 알린다 */
export function replaceOnce(source: string, anchor: string, replacement: string): string {
  if (!source.includes(anchor)) throw new Error(`three 셰이더에 주입 지점이 없습니다: ${anchor}`);
  return source.replace(anchor, replacement);
}

/** 3차원 값 노이즈(0~1). 세 번째 축에 시간을 넣으면 무늬가 제자리에서 흐른다 */
export const NOISE_GLSL = /* glsl */ `
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
