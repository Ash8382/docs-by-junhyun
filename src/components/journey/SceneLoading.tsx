"use client";

import { useSyncExternalStore } from "react";
import { getSceneStatus, getServerSceneStatus, subscribeSceneStatus } from "@/lib/journey/sceneStatus";

/**
 * 3D 장면이 셰이더를 컴파일하는 동안 화면 아래에 흐르는 가는 막대(스펙 2절 "입구: 로딩 표시").
 * 글을 넣지 않는 장식이라 보조 기술에는 숨긴다. 본문은 이미 진짜 HTML로 읽힌다.
 * 바깥 상자는 늘 두고 상태를 data-journey-loading에 적는다(e2e가 준비·실패를 기다리는 표지).
 */
export function SceneLoading() {
  const status = useSyncExternalStore(subscribeSceneStatus, getSceneStatus, getServerSceneStatus);
  return (
    <div
      data-journey-loading={status}
      aria-hidden
      className="pointer-events-none fixed inset-x-0 bottom-10 z-20 flex justify-center"
    >
      {status === "loading" && (
        <span className="block h-px w-24 overflow-hidden bg-white/15">
          <span className="block h-full w-1/3 bg-white/70 animate-[journey-loading_1.2s_ease-in-out_infinite] motion-reduce:animate-none" />
        </span>
      )}
    </div>
  );
}
