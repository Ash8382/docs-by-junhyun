"use client";

import dynamic from "next/dynamic";
import { useEffect, useLayoutEffect, useSyncExternalStore } from "react";
import { isScrollLocked } from "@/lib/journey/engine";
import { fail, fitScreen, getJourneyMode, getServerJourneyMode, subscribeJourneyMode } from "@/lib/journey/journeyMode";
import { activeCard } from "@/lib/journey/portrait";
import { getSceneFailure, getSceneStatus, setCarStatus, setSceneStatus, subscribeSceneStatus } from "@/lib/journey/sceneStatus";
import { isShortLandscape, subscribeShortLandscape } from "@/lib/journey/screen";
import { useFlatReveal } from "./flatReveal";
import { useHologramFocus } from "./hologramLinks";
import { LAYOUT_EVENT, applyMode, currentCard, progressOf, scrollToCard } from "./modeSwitch";
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
 * 2-4c: 그리기 전에 건다(useLayoutEffect). 블로그에서 헤더 링크로 들어오면(클라이언트 이동) 처음 그리기 스크립트가 돌지 않아 effect로는
 * 3D 배치가 한 프레임 보였다. 하이드레이션 때 처음 2D가 되는 기기가 그 전에 스크롤했으면, 바꾸기 전 3D 배치에서 보던 카드를 구해
 * 2D에서 그 카드로 맞춘다(그러지 않으면 같은 스크롤 위치에 다른 정류장이 보였다).
 */
function useModeAttributes(): void {
  useLayoutEffect(() => {
    const root = document.documentElement;
    let first = true;
    const apply = () => {
      const mode = getJourneyMode();
      const flat = mode.view === "2d";
      const changed = flat !== (root.dataset.journeyMode === "2d");
      const main = document.querySelector<HTMLElement>("[data-journey-page]");
      const keep =
        first && changed && flat && main && window.scrollY > 0 ? (activeCard(progressOf(main), window.location.hash) ?? "ending") : null;
      first = false;
      if (flat) {
        root.dataset.journeyMode = "2d";
        root.dataset.journeyReason = mode.reason ?? "";
      } else {
        delete root.dataset.journeyMode;
        delete root.dataset.journeyReason;
      }
      if (changed) window.dispatchEvent(new Event(LAYOUT_EVENT));
      if (keep) scrollToCard(keep, "2d");
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

/**
 * 짧은 가로 화면이 되거나 풀리면 모드를 맞춘다(스펙 5절 "짧은 가로 화면", 2-4c). 화면을 돌릴 때마다 보던 카드를 지키는 모드 전환을 지난다.
 * 화면을 돌리면 새 폭으로 배치가 먼저 바뀐 뒤에 알림이 와서 그 순간의 카드는 이미 앞 카드다(2D는 폭이 좁아지면 위쪽 카드가 길어진다).
 * 그래서 보던 카드는 크기가 그대로인 동안의 스크롤 때 기억해 두고, 크기가 바뀐 프레임이 지나면 새 배치에서 다시 구한다.
 * 상세가 열려 스크롤이 잠긴 동안에는 자리 맞춤이 닫힐 때로 미뤄져 스크롤 위치가 앞 배치의 값이므로, 기억한 카드를 그대로 둔다.
 * 그러지 않으면 상세를 연 채 두 번 돌렸을 때 엉뚱한 카드(대개 엔딩)로 돌아갔다(2-4c 최종 리뷰)
 * 처음 모드는 getJourneyMode가 이미 맞췄고, 구독을 걸기 전에 돌렸을 때를 위해 한 번 더 맞춘다
 */
function useFitScreen(): void {
  useEffect(() => {
    const sizeNow = () => `${window.innerWidth}x${window.innerHeight}`;
    let size = sizeNow();
    let card = currentCard(getJourneyMode().view);
    let frame = 0;
    const remember = () => {
      if (sizeNow() === size && !isScrollLocked()) card = currentCard(getJourneyMode().view);
    };
    const resized = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        size = sizeNow();
        if (!isScrollLocked()) card = currentCard(getJourneyMode().view);
      });
    };
    const fit = () => {
      const mode = getJourneyMode();
      const next = fitScreen(mode, isShortLandscape());
      if (next !== mode) applyMode(next, card);
    };
    fit();
    const unsubscribe = subscribeShortLandscape(fit);
    window.addEventListener("scroll", remember, { passive: true });
    window.addEventListener("resize", resized);
    return () => {
      unsubscribe();
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", remember);
      window.removeEventListener("resize", resized);
    };
  }, []);
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
  useFitScreen();
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
