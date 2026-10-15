import { ROAD_SCALE, speedAt } from "./drive";
import { pathSpan, smoothstep } from "./timeline";

/**
 * 빛의 길의 색과 발광(스펙 3절 "길이 열린다, 색이 쌓인다"). 색(trailColor)은 길 위치의 색이고, 발광(glow)은 세기다.
 * 도로 셰이더(scene/trailShader.ts)는 이 상수를 그대로 받아 같은 식으로 계산한다(trailShader.test.ts가 두 계산을 맞춰 본다).
 * 차의 테일라이트와 빛줄기도 trailColor(carS)를 쓴다. three를 import하지 않는 순수 코드다.
 */

/** 선형(linear sRGB) 0~1 색. 셰이더 안에서 섞는 공간과 같다 */
export type LinearRgb = readonly [number, number, number];

/** 궤적 색: 1막 주황, 3막 파랑. 2막에서 보라를 거쳐 바뀐다(주황과 파랑을 바로 섞으면 가운데가 회색으로 탁해진다) */
export const TRAIL_HEX = { start: "#ff7a1a", middle: "#b14cff", end: "#2f8cff" } as const;
/** 헤드라이트는 막과 상관없이 주황이다 */
export const HEADLIGHT_HEX = "#ffa24a";

/** 색이 바뀌는 구간(도로 s, m): 2막 진입부터 3막 진입까지 */
export const TRAIL_MIX_START = pathSpan("act-2").from * ROAD_SCALE;
export const TRAIL_MIX_END = pathSpan("act-3").from * ROAD_SCALE;

/** 발광 세기: 열렸지만 차가 지나지 않은 길(dim), 지나간 길(full). 차 바로 뒤 fill(m)에 걸쳐 차오른다 */
export const GLOW = { dim: 0.08, full: 1, fill: 10 } as const;

/**
 * 열린 끝의 경계선. 경계는 revealS에서 도로 좌표(s, 옆 거리)의 노이즈만큼 앞뒤로 흔들리고(amplitude, m),
 * 노이즈는 시간에 따라 천천히 흐른다(speed). 경계를 따라 glowWidth(m) 폭의 빛이 흐른다.
 */
export const REVEAL_EDGE = { noiseScale: 0.35, amplitude: 1.2, speed: 0.15, glowWidth: 0.35 } as const;

/** 빛줄기: 정속일 때의 길이(m)와 길이를 늘리는 속도의 상한 */
export const STREAK = { length: 4, maxSpeed: 1.2 } as const;

/** 엔딩에서 차 불빛을 낮추는 정도(1 = 그대로). 시선의 중심은 길 전체다 */
export const ENDING_CAR_LIGHT = 0.3;

function srgbToLinear(channel: number): number {
  return channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
}

export function hexToLinear(hex: string): LinearRgb {
  const n = Number.parseInt(hex.slice(1), 16);
  return [srgbToLinear(((n >> 16) & 255) / 255), srgbToLinear(((n >> 8) & 255) / 255), srgbToLinear((n & 255) / 255)];
}

export const TRAIL_LINEAR = {
  start: hexToLinear(TRAIL_HEX.start),
  middle: hexToLinear(TRAIL_HEX.middle),
  end: hexToLinear(TRAIL_HEX.end),
} as const;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** GLSL mix와 같은 식 */
function mix(a: number, b: number, t: number): number {
  return a * (1 - t) + b * t;
}

function mixRgb(a: LinearRgb, b: LinearRgb, t: number): LinearRgb {
  return [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
}

/** 길 위치 s의 색 전환 정도(0 = 1막 주황, 1 = 3막 파랑) */
export function trailMix(s: number): number {
  return smoothstep(TRAIL_MIX_START, TRAIL_MIX_END, s);
}

/** 길 위치 s의 색(선형). 앞 절반은 주황 → 보라, 뒤 절반은 보라 → 파랑 */
export function trailColor(s: number): LinearRgb {
  const m = trailMix(s);
  return mixRgb(mixRgb(TRAIL_LINEAR.start, TRAIL_LINEAR.middle, clamp01(m * 2)), TRAIL_LINEAR.end, clamp01(m * 2 - 1));
}

/**
 * 길 위치 s의 발광 세기. 차 앞(아직 지나지 않은 길)은 희미하고, 차가 지나간 길은 바로 뒤에서 서서히 차올라 선명해진다.
 * 엔딩(ending = 1)에서는 열린 길 전체가 선명하다. 열린 끝 너머는 셰이더가 그리지 않는다(발광 이전에 없다).
 */
export function glow(s: number, carS: number, ending: number): number {
  const passed = 1 - smoothstep(carS - GLOW.fill, carS, s);
  return mix(mix(GLOW.dim, GLOW.full, passed), GLOW.full, ending);
}

/** 진행률의 빛줄기 길이(m). 주행 속도 곡선을 따라 정류장 전부터 짧아지고, 출발하며 다시 길어진다 */
export function streakLength(progress: number): number {
  return STREAK.length * Math.min(speedAt(progress), STREAK.maxSpeed);
}

/** 진행률의 차 불빛 세기 배율. 엔딩에서 낮춘다 */
export function carLightLevel(ending: number): number {
  return mix(1, ENDING_CAR_LIGHT, ending);
}
