"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import {
  getServerShownHolograms,
  getShownHolograms,
  subscribeHolograms,
  thumbnailHidden,
} from "@/lib/journey/hologramStatus";
import { getSceneStatus, getServerSceneStatus, subscribeSceneStatus } from "@/lib/journey/sceneStatus";

/**
 * 2막 본문 패널의 썸네일(스펙 3절 "썸네일 대체"). 장면이 ready이고 그 프로젝트의 홀로그램이 켜져 있으면 화면에서만 감춘다.
 * 대체 텍스트는 남아 화면 낭독기는 지금처럼 읽는다(캔버스는 보조기기에서 숨겨져 있어 한 번만 읽힌다).
 * 서버 렌더에서는 보이고, 3D가 없거나 장면이 실패하면 다시 보인다.
 */
export function HologramThumbnail({ id, children }: { id: string; children: ReactNode }) {
  const status = useSyncExternalStore(subscribeSceneStatus, getSceneStatus, getServerSceneStatus);
  const shown = useSyncExternalStore(subscribeHolograms, getShownHolograms, getServerShownHolograms);
  const hidden = thumbnailHidden(status, shown, id);
  return (
    <div data-journey-thumbnail={id} className={hidden ? "sr-only" : undefined}>
      {children}
    </div>
  );
}
