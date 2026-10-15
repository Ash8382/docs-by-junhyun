import { pathSpan, smoothstep } from "./timeline";

/**
 * 렌더 단계(스펙 3절 "청사진 → 클레이 → 완성품"). 회랑을 따라 나아간 거리 s의 함수로, 0은 청사진,
 * 1은 클레이, 2는 완성품이다. 경계는 2막·3막 진입 정류장의 한가운데다.
 * 셰이더(scene/stageMaterial.ts)는 같은 상수로 면마다 단계를 구하고, 조명·안개(atmosphere.ts)는
 * 카메라 자리의 단계를 구해 보간한다. 그래서 오브젝트도 자기가 선 막의 단계를 저절로 따른다.
 */

function middle(span: { from: number; to: number }): number {
  return (span.from + span.to) / 2;
}

export const STAGE_EDGES: readonly [number, number] = [middle(pathSpan("act-2")), middle(pathSpan("act-3"))];

/** 셰이더 경계의 노이즈. 경계가 곧은 선이 아니라 앞쪽 공간이 "렌더링되어 가는" 얼룩 모양이 되고, 천천히 흐른다. */
export const STAGE_NOISE = { scale: 0.45, amplitude: 0.9, speed: 0.12 } as const;

/** 셰이더에서 단계가 바뀌는 폭(m). 좁아서 노이즈 경계를 따라 또렷하게 바뀐다. */
export const STAGE_EDGE_SOFTNESS = 0.06;

/** 경계를 따라 흐르는 빛나는 선의 폭(m) */
export const STAGE_GLOW_WIDTH = 0.08;

/** 조명·안개가 단계 사이를 넘어가는 폭(m). 카메라가 경계를 지나는 몇 걸음에 걸쳐 바뀐다. */
export const ATMOSPHERE_BLEND = 2.5;

/** 거리 s의 렌더 단계(0~2). softness는 경계 양쪽으로 단계가 섞이는 폭이다. */
export function stageAt(s: number, softness: number): number {
  const [first, second] = STAGE_EDGES;
  return smoothstep(first - softness, first + softness, s) + smoothstep(second - softness, second + softness, s);
}
