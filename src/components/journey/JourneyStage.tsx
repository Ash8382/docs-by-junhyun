"use client";

import dynamic from "next/dynamic";
import { useEffect, useSyncExternalStore } from "react";
import { setCarStatus, setSceneStatus } from "@/lib/journey/sceneStatus";
import { detectTier } from "@/lib/journey/capability";
import { useHologramFocus } from "./hologramLinks";
import { ProgressRail } from "./ProgressRail";
import { usePortraitCards } from "./portraitCards";
import { ProjectDialog } from "./ProjectDialog";
import { SceneBoundary } from "./SceneBoundary";
import { SceneLoading } from "./SceneLoading";
import { useJourneyScroll } from "./useJourneyScroll";

// 장면 코드(도로 셰이더, 차 모델 로더, drei 환경맵, 후처리)는 이 동적 import 뒤에만 있다. 기기 단계를 판별한 뒤에 불러와 2D 기기는 내려받지 않는다(three·R3F 본체는 사이트 별 배경이 레이아웃에서 이미 싣는다).
const Scene = dynamic(() => import("./scene/Scene"), { ssr: false });
// 휴대폰 측정 오버레이(스펙 8절 4항)는 ?debug=perf일 때만 내려받는다
const PerfOverlay = dynamic(() => import("./PerfOverlay").then((module) => module.PerfOverlay), { ssr: false });

function perfRequested(): boolean {
  return new URLSearchParams(window.location.search).get("debug") === "perf";
}

function subscribeNothing() {
  return () => {};
}

/** 여정 페이지의 클라이언트 진입점. 스크롤 엔진을 켜고 화면 위 요소를 얹는다. */
export function JourneyStage() {
  useJourneyScroll();
  useHologramFocus();
  // 기기 단계(스펙 5절)는 페이지를 열 때 한 번 정한다. 2-4a의 2D는 WebGL이 없을 때와 같다(본문과 썸네일, 세로 타임라인은 2-4b)
  const webgl = useSyncExternalStore(subscribeNothing, () => detectTier() !== "2d", () => false);
  // 세로 화면에서 3D를 쓰는 동안 본문 카드를 아래 고정 자리로 옮긴다(스펙 3절 "세로 화면")
  usePortraitCards(webgl);
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
      {webgl && (
        <SceneBoundary>
          <Scene />
        </SceneBoundary>
      )}
      {webgl && <SceneLoading />}
      <ProgressRail />
      <ProjectDialog />
      {perf && <PerfOverlay />}
    </>
  );
}
