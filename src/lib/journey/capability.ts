import type { QualityLevel } from "./journeyMode";
import { GALAXY_LITE_URL, GALAXY_URL } from "./space";
import { hasWebGL2 } from "./webgl";

/**
 * 기기 단계(스펙 5절 "기기 대응"). 페이지를 열 때 한 번 정한다. 실행 중에 품질을 내리는 것은 따로 있는 "실행 중 강등"이다(2-4b).
 * - 3D 전체: WebGL2가 되고 포인터가 정밀한 기기(데스크톱·노트북)
 * - 3D 경량: WebGL2가 되고 포인터가 굵은 기기(휴대폰·태블릿)
 * - 2D: WebGL2가 없거나, 메모리가 2GB 이하이거나, 데이터 절약이 켜져 있다. Safari에는 deviceMemory·connection이 없어
 *   값이 없으면 판정에 쓰지 않는다(2D로 보내지 않는다)
 * 판정(tierOf)은 순수 함수이고, 브라우저 값을 읽는 일은 detectTier가 한다.
 */
export type Tier = "full" | "lite" | "2d";

export interface DeviceSignals {
  webgl2: boolean;
  /** (pointer: coarse) */
  coarsePointer: boolean;
  /** navigator.deviceMemory(GB). Safari에는 없다 */
  deviceMemory?: number;
  /** navigator.connection.saveData. Safari에는 없다 */
  saveData?: boolean;
}

const TIERS: readonly Tier[] = ["full", "lite", "2d"];

export function tierOf(signals: DeviceSignals): Tier {
  if (!signals.webgl2) return "2d";
  if (signals.deviceMemory !== undefined && signals.deviceMemory <= 2) return "2d";
  if (signals.saveData === true) return "2d";
  return signals.coarsePointer ? "lite" : "full";
}

/** 확인용 덮어쓰기: 주소가 ?debug=stats(또는 perf)&tier=full|lite|2d면 그 단계 */
export function tierOverride(search: string): Tier | null {
  const params = new URLSearchParams(search);
  const debug = params.get("debug");
  if (debug !== "stats" && debug !== "perf") return null;
  const tier = params.get("tier");
  return TIERS.find((item) => item === tier) ?? null;
}

/** 덮어쓰기가 판정보다 앞선다. 다만 WebGL2가 없으면 3D를 강제할 수 없다 */
export function resolveTier(signals: DeviceSignals, override: Tier | null): Tier {
  if (!signals.webgl2) return "2d";
  return override ?? tierOf(signals);
}

/**
 * 3D 품질 단계(스펙 5절, 2-4a·2-4b). 처음 단계는 기기 단계가 정하고(전체·경량), 실행 중 강등이 한 단계씩 내린다(journeyMode.ts).
 * 경량은 해상도 배율 상한과 블룸 비용을 줄이고, 최소는 배율 1에 블룸을 끈다. 길·궤적·차·풍경·홀로그램 연출과 톤 매핑·비네트·SMAA는
 * 그대로 둔다. mipmap 블러를 쓰므로 블룸 비용은 휘도 패스의 해상도와 mip 단계 수가 정한다(postprocessing 6.38 BloomEffect의
 * resolutionScale은 mipmap 블러에 쓰이지 않는다).
 */
export interface LevelQuality {
  /** Canvas dpr 범위(최소, 최대) */
  dpr: [number, number];
  /** 휘도 패스의 해상도 비율과 mipmap 블러 단계 수(postprocessing 기본값 1·8). 없으면 블룸을 끈다 */
  bloom: { luminanceScale: number; levels: number } | null;
}

export const LEVEL_QUALITY: Record<QualityLevel, LevelQuality> = {
  full: { dpr: [1, 2], bloom: { luminanceScale: 1, levels: 8 } },
  lite: { dpr: [1, 1.5], bloom: { luminanceScale: 0.5, levels: 6 } },
  min: { dpr: [1, 1], bloom: null },
};

/** 은하는 기기 단계로 정한다(전체는 원본 4096, 그 밖은 2048). 실행 중 강등은 은하를 다시 내려받지 않는다 */
export function galaxyFor(tier: Tier): string {
  return tier === "full" ? GALAXY_URL : GALAXY_LITE_URL;
}

let detected: Tier | null = null;

/** 이 페이지의 기기 단계(한 번 읽고 기억한다). 브라우저에서만 부른다 */
export function detectTier(): Tier {
  if (detected === null) {
    const info = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
    detected = resolveTier(
      {
        webgl2: hasWebGL2(),
        coarsePointer: window.matchMedia("(pointer: coarse)").matches,
        deviceMemory: info.deviceMemory,
        saveData: info.connection?.saveData,
      },
      tierOverride(window.location.search),
    );
  }
  return detected;
}
