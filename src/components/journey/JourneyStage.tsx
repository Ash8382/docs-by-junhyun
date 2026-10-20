"use client";

import dynamic from "next/dynamic";
import { useEffect, useSyncExternalStore } from "react";
import { fail, getJourneyMode, getServerJourneyMode, subscribeJourneyMode } from "@/lib/journey/journeyMode";
import { getSceneFailure, getSceneStatus, setCarStatus, setSceneStatus, subscribeSceneStatus } from "@/lib/journey/sceneStatus";
import { useFlatReveal } from "./flatReveal";
import { useHologramFocus } from "./hologramLinks";
import { LAYOUT_EVENT, applyMode } from "./modeSwitch";
import { ProgressRail } from "./ProgressRail";
import { usePortraitCards } from "./portraitCards";
import { ProjectDialog } from "./ProjectDialog";
import { SceneBoundary } from "./SceneBoundary";
import { SceneLoading } from "./SceneLoading";
import { useJourneyScroll } from "./useJourneyScroll";

// 장면 코드(도로 셰이더, 차 모델 로더, drei 환경맵, 후처리)는 이 동적 import 뒤에만 있다. 모드를 정한 뒤에 불러와 2D는 내려받지 않는다(three·R3F 본체는 사이트 별 배경이 레이아웃에서 이미 싣는다).
const Scene = dynamic(() => import("./scene/Scene"), { ssr: false });
// 휴대폰 측정 오버레이(스펙 8절 4항)는 ?debug=perf일 때만 내려받는다
const PerfOverlay = dynamic(() => import("./PerfOverlay").then((module) => module.PerfOverlay), { ssr: false });

function perfRequested(): boolean {
  return new URLSearchParams(window.location.search).get("debug") === "perf";
}

function subscribeNothing() {
  return () => {};
}

/**
 * 2D 표지(스펙 5절 "2D 레이아웃", 2-4b). 2D면 <html>에 data-journey-mode="2d"와 이유(data-journey-reason)를 붙여 CSS가 배치를 바꾼다.
 * 모드 구독자라 모드가 바뀌는 순간 곧바로 고친다. 다른 페이지로 가면 지운다. 하이드레이션 때 처음 2D가 되는 기기(처음 그리기
 * 스크립트가 걸지 못한 기기 단계 2D)는 배치가 바뀌었다고 알려 스크롤 엔진이 다시 재게 한다.
 */
function useModeAttributes(): void {
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const mode = getJourneyMode();
      const flat = mode.view === "2d";
      const changed = flat !== (root.dataset.journeyMode === "2d");
      if (flat) {
        root.dataset.journeyMode = "2d";
        root.dataset.journeyReason = mode.reason ?? "";
      } else {
        delete root.dataset.journeyMode;
        delete root.dataset.journeyReason;
      }
      if (changed) window.dispatchEvent(new Event(LAYOUT_EVENT));
    };
    apply();
    const unsubscribe = subscribeJourneyMode(apply);
    return () => {
      unsubscribe();
      delete root.dataset.journeyMode;
      delete root.dataset.journeyReason;
    };
  }, []);
}

/** 장면이 실패하면(컨텍스트 손실, 셰이더 컴파일·렌더러 생성 실패, 오류 경계) 2D로 바꾼다(스펙 5절 "컨텍스트 손실과 장면 실패") */
function useFlatOnFailure(): void {
  useEffect(
    () =>
      subscribeSceneStatus(() => {
        if (getSceneStatus() !== "failed") return;
        // 실패는 렌더러를 만드는 도중(렌더 단계)에도 알려지므로 그 일이 끝난 뒤에 바꾼다
        queueMicrotask(() => {
          const mode = getJourneyMode();
          if (mode.view === "3d" && getSceneStatus() === "failed") applyMode(fail(mode, getSceneFailure() ?? "failed"));
        });
      }),
    [],
  );
}

/** 여정 페이지의 클라이언트 진입점. 스크롤 엔진을 켜고, 모드(3D·2D)를 정해 3D면 장면을 얹는다. */
export function JourneyStage() {
  useJourneyScroll();
  useHologramFocus();
  // 모드는 페이지를 열 때 기기 단계와 기억한 선택으로 한 번 정하고, 그 뒤에는 강등·실패·수동 전환으로만 바뀐다(스펙 5절)
  const mode = useSyncExternalStore(subscribeJourneyMode, getJourneyMode, getServerJourneyMode);
  const scene = mode?.view === "3d";
  useModeAttributes();
  useFlatOnFailure();
  // 세로 화면에서 3D로 보는 동안 본문 카드를 아래 고정 자리로 옮긴다(스펙 3절 "세로 화면")
  usePortraitCards();
  // 2D에서 카드가 화면에 처음 들어올 때 나타나게 한다(스펙 5절 "2D 레이아웃")
  useFlatReveal();
  const perf = useSyncExternalStore(subscribeNothing, perfRequested, () => false);
  // 다른 페이지로 갔다가 돌아오면 장면을 처음부터 다시 준비한다(실패했던 상태와 차 상태도 지운다).
  useEffect(
    () => () => {
      setSceneStatus("loading");
      setCarStatus("loading");
    },
    [],
  );
  return (
    <>
      {scene && (
        <SceneBoundary>
          <Scene />
        </SceneBoundary>
      )}
      {scene && <SceneLoading />}
      <ProgressRail />
      <ProjectDialog />
      {perf && <PerfOverlay />}
    </>
  );
}
