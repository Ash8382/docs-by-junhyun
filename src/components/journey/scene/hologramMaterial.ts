import {
  AdditiveBlending,
  CustomBlending,
  DoubleSide,
  FrontSide,
  OneFactor,
  OneMinusSrcAlphaFactor,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
  Vector2,
  type DataArrayTexture,
} from "three";
import { FRAME_LIGHT } from "@/lib/journey/holograms";
import { glslFloat } from "./shaderChunks";

/**
 * 홀로그램 재질(스펙 3절 "그리기"). 화면 + 테두리는 한 장(quad)에, 빛기둥 + 원반은 다른 한 장에 그린다(인스턴스 메시 2개, 드로콜 2).
 * 화면 영역은 텍스처 색 × 불투명도만 내보낸다(발광 없음, 궤적 색을 섞지 않는다). 테두리·후광은 궤적 색의 색조에 휘도(FRAME_LIGHT)를 곱해
 * 미리 곱한 알파(알파 0)로 더한다. 쉬는 때·호버 모두 블룸 문턱(1) 아래다. 안개는 장면과 같이 받는다(멀리서 홀로그램만 튀지 않게).
 */

/** 화면 둘레 여백(m, 다 떠오른 크기 기준). 테두리 선은 그림 가장자리에서 여백의 0.8만큼 바깥에 있다 */
export const FRAME_MARGIN = 0.6;
/** 테두리 선의 굵기(m). 후광은 그 6배 너비로 바깥으로 퍼진다 */
export const FRAME_BORDER = 0.06;
/** 빛기둥·원반의 휘도(선형). 블룸 문턱 아래다 */
export const BEAM_LIGHT = 0.3;
export const DISC_LIGHT = 0.8;

const LUMINANCE = /* glsl */ `vec3( 0.2126, 0.7152, 0.0722 )`;

const SCREEN_VERTEX = /* glsl */ `
attribute float aLayer;
attribute vec4 aRect;
attribute vec2 aBox;
attribute vec3 aColor;
attribute vec2 aState;
varying vec2 vUv;
varying float vLayer;
varying vec4 vRect;
varying vec2 vBox;
varying vec3 vColor;
varying vec2 vState;
#include <fog_pars_vertex>
void main() {
  vUv = uv;
  vLayer = aLayer;
  vRect = aRect;
  vBox = aBox;
  vColor = aColor;
  vState = aState;
  vec4 mvPosition = viewMatrix * modelMatrix * instanceMatrix * vec4( position, 1.0 );
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const SCREEN_FRAGMENT = /* glsl */ `
precision highp sampler2DArray;
uniform sampler2DArray uAtlas;
uniform float uMargin;
uniform float uBorder;
uniform vec2 uLine;
uniform vec2 uHalo;
varying vec2 vUv;
varying float vLayer;
varying vec4 vRect;
varying vec2 vBox;
varying vec3 vColor;
varying vec2 vState;
#include <fog_pars_fragment>
void main() {
  float presence = vState.x;
  if ( presence < 1e-3 ) discard;
  float margin = uMargin * presence;
  float border = uBorder * presence;
  vec2 p = ( vUv - 0.5 ) * ( vBox + 2.0 * margin );
  // 층 좌표(가로는 왼쪽에서, 세로는 위에서 잰다. 층의 행은 위에서 아래이고 배열 텍스처는 뒤집지 않는다)
  vec2 layerUv = vec2( p.x / vBox.x + 0.5, 0.5 - p.y / vBox.y );
  vec3 color = vec3( 0.0 );
  float alpha = 0.0;
  if ( all( greaterThanEqual( layerUv, vRect.xy ) ) && all( lessThanEqual( layerUv, vRect.xy + vRect.zw ) ) ) {
    color = texture( uAtlas, vec3( layerUv, vLayer ) ).rgb;
    alpha = 1.0;
  }
  // 테두리: 그림 영역을 둘러싼 둥근 사각형 선과 바깥 후광
  vec2 halfImage = 0.5 * vRect.zw * vBox;
  vec2 center = vec2( ( vRect.x + 0.5 * vRect.z - 0.5 ) * vBox.x, ( 0.5 - vRect.y - 0.5 * vRect.w ) * vBox.y );
  vec2 d = abs( p - center ) - ( halfImage + 0.8 * margin );
  float outside = length( max( d, 0.0 ) ) + min( max( d.x, d.y ), 0.0 );
  float line = 1.0 - smoothstep( 0.0, border, abs( outside ) );
  float halo = ( 1.0 - smoothstep( 0.0, 6.0 * border, max( outside, 0.0 ) ) ) * step( 0.0, outside );
  float glow = vState.y;
  vec3 hue = vColor / max( dot( vColor, ${LUMINANCE} ), 1e-3 );
  vec3 light = hue * ( line * mix( uLine.x, uLine.y, glow ) + halo * mix( uHalo.x, uHalo.y, glow ) );
  #ifdef USE_FOG
    float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
    color = mix( color, fogColor, fogFactor );
    light *= 1.0 - fogFactor;
  #endif
  // 미리 곱한 알파: 화면은 덮어 그리고(알파 1), 테두리 빛은 더해진다(알파 0)
  gl_FragColor = vec4( ( color * alpha + light ) * presence, alpha * presence );
  #include <colorspace_fragment>
}`;

const LIGHT_VERTEX = /* glsl */ `
attribute vec3 aColor;
attribute vec2 aState;
varying vec2 vUv;
varying vec3 vColor;
varying vec2 vState;
#include <fog_pars_vertex>
void main() {
  vUv = uv;
  vColor = aColor;
  vState = aState;
  vec4 mvPosition = viewMatrix * modelMatrix * instanceMatrix * vec4( position, 1.0 );
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

/** aState: x 보이는 정도, y 종류(0 빛기둥, 1 원반) */
const LIGHT_FRAGMENT = /* glsl */ `
#define BEAM_LIGHT ${glslFloat(BEAM_LIGHT)}
#define DISC_LIGHT ${glslFloat(DISC_LIGHT)}
varying vec2 vUv;
varying vec3 vColor;
varying vec2 vState;
#include <fog_pars_fragment>
void main() {
  if ( vState.x < 1e-3 ) discard;
  vec3 hue = vColor / max( dot( vColor, ${LUMINANCE} ), 1e-3 );
  float strength;
  if ( vState.y < 0.5 ) {
    // 빛기둥: 가운데가 밝은 띠, 원반(아래)에서 위로 옅어진다
    float across = 1.0 - abs( vUv.x - 0.5 ) * 2.0;
    strength = BEAM_LIGHT * across * across * pow( 1.0 - vUv.y, 1.3 );
  } else {
    // 원반: 둘레가 밝은 고리와 옅은 안쪽
    float r = length( vUv - 0.5 ) * 2.0;
    strength = DISC_LIGHT * ( 1.0 - smoothstep( 0.82, 1.0, r ) ) * ( 0.35 + 0.65 * smoothstep( 0.55, 0.9, r ) );
  }
  vec3 light = hue * strength * vState.x;
  #ifdef USE_FOG
    light *= 1.0 - smoothstep( fogNear, fogFar, vFogDepth );
  #endif
  gl_FragColor = vec4( light, 1.0 );
  #include <colorspace_fragment>
}`;

/** 화면 + 테두리 재질. 반투명이 겹치므로 깊이는 쓰지 않고, 메시가 먼 것부터 그린다(drawOrder) */
export function createScreenMaterial(atlas: DataArrayTexture): ShaderMaterial {
  const material = new ShaderMaterial({
    uniforms: UniformsUtils.merge([
      UniformsLib.fog,
      {
        uAtlas: { value: null },
        uMargin: { value: FRAME_MARGIN },
        uBorder: { value: FRAME_BORDER },
        uLine: { value: new Vector2(...FRAME_LIGHT.line) },
        uHalo: { value: new Vector2(...FRAME_LIGHT.halo) },
      },
    ]),
    vertexShader: SCREEN_VERTEX,
    fragmentShader: SCREEN_FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: CustomBlending,
    blendSrc: OneFactor,
    blendDst: OneMinusSrcAlphaFactor,
    side: FrontSide,
    fog: true,
  });
  // merge는 값을 복제한다. 텍스처를 복제하면 업로드를 확인한 텍스처가 아닌 복제본이 따로 올라가므로 합친 뒤에 넣는다
  material.uniforms.uAtlas.value = atlas;
  return material;
}

/** 빛기둥 + 원반 재질. 더하기 혼합이라 순서와 상관없다 */
export function createLightMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: UniformsUtils.merge([UniformsLib.fog]),
    vertexShader: LIGHT_VERTEX,
    fragmentShader: LIGHT_FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    fog: true,
  });
}
