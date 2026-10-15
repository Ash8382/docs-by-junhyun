import { ATMOSPHERE_BLEND, stageAt } from "./stage";
import { overviewWeight, pathParamAt } from "./timeline";

/**
 * 조명·안개·은하 밝기(스펙 3절). 카메라가 선 자리의 렌더 단계로 세 막의 값을 보간하고,
 * 엔딩에서는 회랑 전체를 내려다보는 값으로 넘어간다. 배경은 어느 막이든 우주(은하 사진)다.
 * three를 import하지 않는 순수 함수다.
 */

/** sRGB 0~1 */
export type Rgb = readonly [number, number, number];

export interface Atmosphere {
  /** 안개 색. 배경이 우주라 어둡다. 먼 회랑은 은하 앞에서 이 색으로 사라진다 */
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
}

function hex(value: string): Rgb {
  const n = Number.parseInt(value.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export const ATMOSPHERES = {
  /** 1막: 남색 어둠. 선이 스스로 빛나므로 조명은 약하다 */
  wire: {
    fogColor: hex("#070d1c"),
    fogNear: 4,
    fogFar: 18,
    sky: hex("#2a4a7a"),
    ground: hex("#050b16"),
    hemisphere: 1.2,
    key: hex("#9cc9ff"),
    keyIntensity: 0.6,
    galaxy: 1,
  },
  /** 2막: 우주에 떠 있는 회색 스튜디오. 부드러운 위쪽 빛 */
  clay: {
    fogColor: hex("#0b0d12"),
    fogNear: 8,
    fogFar: 30,
    sky: hex("#f0f0ee"),
    ground: hex("#8a8986"),
    hemisphere: 2.2,
    key: hex("#ffffff"),
    keyIntensity: 2.4,
    galaxy: 0.9,
  },
  /** 3막: 전시실을 비추는 따뜻한 빛 */
  final: {
    fogColor: hex("#120e0b"),
    fogNear: 14,
    fogFar: 70,
    sky: hex("#fff1d6"),
    ground: hex("#b89f80"),
    hemisphere: 1.8,
    key: hex("#ffd9a8"),
    keyIntensity: 3.4,
    galaxy: 0.8,
  },
  /** 엔딩: 위에서 회랑 전체를 본다. 안개를 멀리 밀어 세 막이 모두 보이고, 은하가 가장 밝다 */
  overview: {
    fogColor: hex("#05070d"),
    fogNear: 60,
    fogFar: 160,
    sky: hex("#dfe6f0"),
    ground: hex("#3a3f4a"),
    hemisphere: 0.9,
    key: hex("#fff4e6"),
    keyIntensity: 1.4,
    galaxy: 1.3,
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
  };
}

/** 스크롤 진행률(0~1)의 분위기. 단계는 카메라가 향하는 경로 위치로 구한다(엔딩에서 위로 빠져도 3막 값에서 출발). */
export function atmosphereAt(progress: number): Atmosphere {
  const stage = stageAt(pathParamAt(progress), ATMOSPHERE_BLEND);
  const base =
    stage <= 1
      ? mixAtmosphere(ATMOSPHERES.wire, ATMOSPHERES.clay, stage)
      : mixAtmosphere(ATMOSPHERES.clay, ATMOSPHERES.final, stage - 1);
  return mixAtmosphere(base, ATMOSPHERES.overview, overviewWeight(progress));
}
