"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";
import { hasWebGL2 } from "@/lib/journey/webgl";
import { ProgressRail } from "./ProgressRail";
import { ProjectDialog } from "./ProjectDialog";
import { SceneBoundary } from "./SceneBoundary";
import { useJourneyScroll } from "./useJourneyScroll";

// 장면 코드(drei Line 포함)는 이 동적 import 뒤에만 있다. WebGL2를 확인한 뒤에 불러와 3D를 못 쓰는 기기는 내려받지 않는다(three·R3F 본체는 사이트 별 배경이 레이아웃에서 이미 싣는다).
const Scene = dynamic(() => import("./scene/Scene"), { ssr: false });

function subscribeNothing() {
  return () => {};
}

/** 여정 페이지의 클라이언트 진입점. 스크롤 엔진을 켜고 화면 위 요소를 얹는다. */
export function JourneyStage() {
  useJourneyScroll();
  const webgl = useSyncExternalStore(subscribeNothing, hasWebGL2, () => false);
  return (
    <>
      {webgl && (
        <SceneBoundary>
          <Scene />
        </SceneBoundary>
      )}
      <ProgressRail />
      <ProjectDialog />
    </>
  );
}
