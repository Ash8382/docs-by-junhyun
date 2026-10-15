import { carSAt } from "./drive";
import { overviewWeight } from "./timeline";
import { trailMix } from "./trail";

/**
 * 조명·안개·은하 밝기(스펙 3절 "막별 분위기"). 차가 선 자리의 궤적 색 전환(trail.ts trailMix)으로 세 막의 값을 보간하고,
 * 엔딩에서는 길 전체를 내려다보는 값으로 넘어간다. 배경은 어느 막이든 우주(은하 사진)다.
 * three를 import하지 않는 순수 함수다.
 */

/** sRGB 0~1 */
export type Rgb = readonly [number, number, number];

export interface Atmosphere {
  /** 안개 색. 배경이 우주라 어둡다. 먼 길은 은하 앞에서 이 색으로 사라진다 */
  fogColor: Rgb;
  fogNear: number;
  fogFar: number;
  sky: Rgb;
  ground: Rgb;
  hemisphere: number;
  key: Rgb;
  keyIntensity: number;
  /** 은하 배경의 밝기(scene.backgroundIntensity) */
  galaxy: number;
  /** 환경 반사의 세기(scene.environmentIntensity). 차 도장과 노면에 비친다 */
  environment: number;
}

function hex(value: string): Rgb {
  const n = Number.parseInt(value.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export const ATMOSPHERES = {
  /** 1막: 따뜻한 주황빛과 주황 기운의 안개 */
  act1: {
    fogColor: hex("#1c0e06"),
    fogNear: 30,
    fogFar: 140,
    sky: hex("#ffb27a"),
    ground: hex("#2a1206"),
    hemisphere: 0.9,
    key: hex("#ffc694"),
    keyIntensity: 2.2,
    galaxy: 0.9,
    environment: 0.9,
  },
  /** 2막: 주황과 파랑이 섞인 보랏빛(궤적 색의 가운데와 같다) */
  act2: {
    fogColor: hex("#130a1e"),
    fogNear: 35,
    fogFar: 170,
    sky: hex("#cfa8ff"),
    ground: hex("#1a0f2a"),
    hemisphere: 0.9,
    key: hex("#ead2ff"),
    keyIntensity: 2,
    galaxy: 1,
    environment: 0.9,
  },
  /** 3막: 푸른빛과 미래 도시의 분위기 */
  act3: {
    fogColor: hex("#06101f"),
    fogNear: 40,
    fogFar: 200,
    sky: hex("#9cc8ff"),
    ground: hex("#061428"),
    hemisphere: 1,
    key: hex("#c4e2ff"),
    keyIntensity: 2.2,
    galaxy: 1.1,
    environment: 1,
  },
  /** 엔딩: 주변은 어둡게, 은하와 완성된 빛의 길을 강조한다. 안개를 멀리 밀어 길 전체가 보인다 */
  overview: {
    fogColor: hex("#03050a"),
    fogNear: 300,
    fogFar: 900,
    sky: hex("#c8d4e8"),
    ground: hex("#05070d"),
    hemisphere: 0.35,
    key: hex("#dfe8ff"),
    keyIntensity: 0.6,
    galaxy: 1.35,
    environment: 0.5,
  },
} satisfies Record<string, Atmosphere>;

/** 양 끝(t가 0이나 1)에서 a나 b를 정확히 돌려주는 꼴로 섞는다 */
function lerp(a: number, b: number, t: number): number {
  return a * (1 - t) + b * t;
}

function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

export function mixAtmosphere(a: Atmosphere, b: Atmosphere, t: number): Atmosphere {
  return {
    fogColor: mixRgb(a.fogColor, b.fogColor, t),
    fogNear: lerp(a.fogNear, b.fogNear, t),
    fogFar: lerp(a.fogFar, b.fogFar, t),
    sky: mixRgb(a.sky, b.sky, t),
    ground: mixRgb(a.ground, b.ground, t),
    hemisphere: lerp(a.hemisphere, b.hemisphere, t),
    key: mixRgb(a.key, b.key, t),
    keyIntensity: lerp(a.keyIntensity, b.keyIntensity, t),
    galaxy: lerp(a.galaxy, b.galaxy, t),
    environment: lerp(a.environment, b.environment, t),
  };
}

/** 스크롤 진행률(0~1)의 분위기. 궤적 색과 같은 전환(앞 절반 1막 → 2막, 뒤 절반 2막 → 3막)을 따른다 */
export function atmosphereAt(progress: number): Atmosphere {
  const m = trailMix(carSAt(progress));
  const base =
    m <= 0.5
      ? mixAtmosphere(ATMOSPHERES.act1, ATMOSPHERES.act2, m * 2)
      : mixAtmosphere(ATMOSPHERES.act2, ATMOSPHERES.act3, m * 2 - 1);
  return mixAtmosphere(base, ATMOSPHERES.overview, overviewWeight(progress));
}
