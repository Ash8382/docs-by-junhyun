import { detectTier, type Tier } from "./capability";
import { isShortLandscape } from "./screen";
import { hasWebGL2 } from "./webgl";

/**
 * 여정의 보기 방식(스펙 5절 "실행 중 강등", "수동 전환", "모드 전환", 2-4b). 처음 결정은 기기 단계와 기억한 수동 선택으로 한 번 하고,
 * 그 뒤에는 실행 중 강등(downgrade)·실패(fail)·수동 전환(choose)으로만 바뀐다. 기기 판별(capability.ts)은 처음 단계만 정하고 강등과 섞지 않는다.
 * 판정은 순수 함수이고, 브라우저 값을 읽고 쓰는 일은 getJourneyMode·storedView·storeView가 한다. 3D 코드를 import하지 않아 본문 쪽 컴포넌트도 쓴다.
 */
export type View = "3d" | "2d";
/** 3D 품질 단계: 전체 → 경량 → 최소(해상도 배율 1, 블룸 끔) */
export type QualityLevel = "full" | "lite" | "min";
/** 2D가 된 이유: 기기 단계, 수동, 느림(실행 중 강등), 컨텍스트 손실, 장면 실패, 화면(짧은 가로, 2-4c) */
export type Reason = "tier" | "manual" | "slow" | "context-lost" | "failed" | "screen";

export interface JourneyMode {
  view: View;
  /** 3D 품질 단계. 2D일 때는 2D가 되기 전의 단계 */
  quality: QualityLevel;
  /** 기기 단계가 정한 처음 품질(3D로 돌아갈 때 쓴다) */
  base: QualityLevel;
  /** 2D가 된 이유. 3D면 null */
  reason: Reason | null;
  /** 자동으로 2D가 된 뒤 방문자가 3D를 다시 골랐다: 이번 방문에는 2D로 강등하지 않는다(품질은 내린다) */
  keep3d: boolean;
}

const NEXT_LEVEL: Record<QualityLevel, QualityLevel | null> = { full: "lite", lite: "min", min: null };
const AUTO_REASONS: readonly Reason[] = ["slow", "context-lost", "failed"];

/** 처음 결정: 기억한 수동 선택이 기기 단계보다 앞선다. WebGL2가 없으면 2D다 */
export function initialMode(tier: Tier, stored: View | null, webgl2: boolean): JourneyMode {
  const base: QualityLevel = tier === "full" ? "full" : "lite";
  const common = { quality: base, base, keep3d: false };
  if (!webgl2) return { ...common, view: "2d", reason: "tier" };
  if (stored === "2d") return { ...common, view: "2d", reason: "manual" };
  if (stored === "3d" || tier !== "2d") return { ...common, view: "3d", reason: null };
  return { ...common, view: "2d", reason: "tier" };
}

/** 실행 중 강등 한 단계. 최소에서 더 내리면 2D(이유: 느림). 자동 2D 뒤 방문자가 3D를 다시 골랐으면 최소에 머문다 */
export function downgrade(mode: JourneyMode): JourneyMode {
  if (mode.view !== "3d") return mode;
  const next = NEXT_LEVEL[mode.quality];
  if (next) return { ...mode, quality: next };
  return mode.keep3d ? mode : { ...mode, view: "2d", reason: "slow" };
}

/** 컨텍스트 손실·장면 실패. 3D를 그릴 수 없으므로 언제나 2D다 */
export function fail(mode: JourneyMode, reason: "context-lost" | "failed"): JourneyMode {
  return mode.view === "3d" ? { ...mode, view: "2d", reason } : mode;
}

/** 자동으로 2D가 됐다(느림·컨텍스트 손실·장면 실패). 알림을 띄운다 */
export function isAutoFlat(mode: JourneyMode): boolean {
  return mode.view === "2d" && mode.reason !== null && AUTO_REASONS.includes(mode.reason);
}

/**
 * 수동 전환. 3D로 돌아갈 때 느려서 2D였으면 최소부터, 그 밖에는 기기 단계부터 시작한다. 자동으로 2D가 된 뒤 3D를 고르면 이번 방문에는
 * 2D로 강등하지 않는다(고른 것이 2초 만에 무시되지 않게)
 */
export function choose(mode: JourneyMode, view: View): JourneyMode {
  if (view === mode.view) return mode;
  if (view === "2d") return { ...mode, view: "2d", reason: "manual" };
  return {
    ...mode,
    view: "3d",
    reason: null,
    // 자동 2D 뒤 3D를 고른 방문(keep3d)은 수동 2D나 실패를 거쳐 돌아와도 이미 내린 단계를 유지한다(전체부터 다시 내려가며 끊기지 않게, 2-4c)
    quality: mode.reason === "slow" ? "min" : mode.keep3d ? mode.quality : mode.base,
    keep3d: mode.keep3d || isAutoFlat(mode),
  };
}

/**
 * 짧은 가로 화면(스펙 5절, 2-4c). 3D로 보던 중 짧은 가로가 되면 2D(이유: 화면)로, 짧은 가로가 아니게 되면 같은 품질의 3D로 돌아온다.
 * 이미 다른 이유로 2D였으면 그대로다. 알림을 띄우지 않고 기억하지 않는다
 */
export function fitScreen(mode: JourneyMode, shortLandscape: boolean): JourneyMode {
  if (shortLandscape && mode.view === "3d") return { ...mode, view: "2d", reason: "screen" };
  if (!shortLandscape && mode.reason === "screen") return { ...mode, view: "3d", reason: null };
  return mode;
}

// ── 저장소(브라우저) ─────────────────────────────────────────

/** 수동 선택을 기억하는 localStorage 키. 처음 그리기 스크립트(app/journey/page.tsx)도 같은 키를 읽는다 */
export const VIEW_KEY = "journey-view";

let current: JourneyMode | null = null;
/** 여정 페이지를 떠나 있었다(leaveJourney). 다시 들어와 처음 읽을 때 화면에 다시 맞춘다 */
let away = false;
const listeners = new Set<() => void>();

/**
 * 이 페이지의 모드. 처음 읽을 때 기기 단계와 기억한 선택, 짧은 가로 화면인지로 한 번 정한다(브라우저에서만 부른다). 어디서 먼저 읽든 같은 결정이다.
 * 하이드레이션 때는 자식 컴포넌트의 effect가 JourneyStage보다 먼저 돌므로, 읽는 쪽마다 정해지지 않은 값을 받지 않게 한다
 */
export function getJourneyMode(): JourneyMode {
  current ??= fitScreen(initialMode(detectTier(), storedView(), hasWebGL2()), isShortLandscape());
  if (away) {
    away = false;
    current = fitScreen(current, isShortLandscape());
  }
  return current;
}

/**
 * 여정 페이지를 떠난다(JourneyStage를 내릴 때). 강등 단계·고른 3D 같은 이 방문의 모드는 남기고, 다른 페이지에 있는 동안 화면을 돌렸을 수
 * 있어 다시 들어와 처음 읽을 때 짧은 가로 화면에만 다시 맞춘다. 그러지 않으면 돌아온 첫 그림이 앞 화면의 배치였고 장면도 올렸다 내렸다
 * (2-4c 최종 리뷰)
 */
export function leaveJourney(): void {
  away = true;
}

/** 서버 렌더와 첫 하이드레이션에서는 아직 정하지 않았다 */
export function getServerJourneyMode(): JourneyMode | null {
  return null;
}

export function setJourneyMode(next: JourneyMode): void {
  if (next === current) return;
  current = next;
  for (const listener of listeners) listener();
}

export function subscribeJourneyMode(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** 기억한 수동 선택. 저장소가 막혀 있으면(사생활 보호 창 등) 없다 */
export function storedView(): View | null {
  try {
    const value = window.localStorage.getItem(VIEW_KEY);
    return value === "2d" || value === "3d" ? value : null;
  } catch {
    return null;
  }
}

export function storeView(view: View): void {
  try {
    window.localStorage.setItem(VIEW_KEY, view);
  } catch {
    // 기억하지 못해도 이번 방문의 전환은 그대로 된다
  }
}
