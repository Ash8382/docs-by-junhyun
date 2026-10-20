import { GALAXY_LITE_URL, GALAXY_URL } from "./space";
import { hasWebGL2 } from "./webgl";

/**
 * 기기 단계(스펙 5절 "기기 대응"). 페이지를 열 때 한 번 정한다. 실행 중에 단계를 바꾸는 것은 2-4b의 "실행 중 강등"이다.
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
 * 3D 단계별 품질(스펙 5절, 2-4a). 경량은 해상도 배율 상한·은하 해상도·블룸 비용을 줄이고 길·궤적·차·풍경·홀로그램 연출은 그대로 둔다.
 * 블룸은 끄지 않는다(끄면 주행 장면의 빛이 납작해졌다). mipmap 블러를 쓰므로 비용은 휘도 패스의 해상도와 mip 단계 수가 정한다
 * (postprocessing 6.38 BloomEffect의 resolutionScale은 mipmap 블러에 쓰이지 않는다). 휴대폰 실측에서 30fps를 못 지키면 경량 블룸을 끈다.
 */
export interface Quality {
  /** Canvas dpr 범위(최소, 최대) */
  dpr: [number, number];
  galaxy: string;
  /** 휘도 패스의 해상도 비율과 mipmap 블러 단계 수(postprocessing 기본값 1·8) */
  bloom: { luminanceScale: number; levels: number };
}

export const QUALITY: Record<Exclude<Tier, "2d">, Quality> = {
  full: { dpr: [1, 2], galaxy: GALAXY_URL, bloom: { luminanceScale: 1, levels: 8 } },
  lite: { dpr: [1, 1.5], galaxy: GALAXY_LITE_URL, bloom: { luminanceScale: 0.5, levels: 6 } },
};

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

/** 지금 페이지의 3D 품질. 장면 코드만 부른다(2D면 장면을 띄우지 않는다) */
export function sceneQuality(): Quality {
  return QUALITY[detectTier() === "lite" ? "lite" : "full"];
}
