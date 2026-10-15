"use client";

import dynamic from "next/dynamic";
import { useEffect, useSyncExternalStore } from "react";
import { setCarStatus, setSceneStatus } from "@/lib/journey/sceneStatus";
import { hasWebGL2 } from "@/lib/journey/webgl";
import { ProgressRail } from "./ProgressRail";
import { ProjectDialog } from "./ProjectDialog";
import { SceneBoundary } from "./SceneBoundary";
import { SceneLoading } from "./SceneLoading";
import { useJourneyScroll } from "./useJourneyScroll";

// 장면 코드(도로 셰이더, 차 모델 로더, drei 환경맵, 후처리)는 이 동적 import 뒤에만 있다. WebGL2를 확인한 뒤에 불러와 3D를 못 쓰는 기기는 내려받지 않는다(three·R3F 본체는 사이트 별 배경이 레이아웃에서 이미 싣는다).
const Scene = dynamic(() => import("./scene/Scene"), { ssr: false });

function subscribeNothing() {
  return () => {};
}

/** 여정 페이지의 클라이언트 진입점. 스크롤 엔진을 켜고 화면 위 요소를 얹는다. */
export function JourneyStage() {
  useJourneyScroll();
  const webgl = useSyncExternalStore(subscribeNothing, hasWebGL2, () => false);
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
    </>
  );
}
