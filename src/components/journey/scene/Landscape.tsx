"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { landscapePieces } from "@/lib/journey/landscapeBuild";
import type { Vec3 } from "@/lib/journey/timeline";
import { currentDrive } from "./driveFrame";
import { recordLandscape, statsEnabled } from "./frameStats";
import { countDraws, createLandscapeMeshes, disposeLandscape, landscapeBlocked, takeLandscapeStats, writeLandscape } from "./landscapeGeometry";
import { createLandscapeMaterial } from "./landscapeMaterial";

/** ?debug=stats에서 e2e가 부르는 가림 확인: 카메라 자리에서 표적마다 막는 풍경 메시의 이름(없으면 null) */
type LandscapeWindow = Window & { __journeyLandscapeBlocked?: (from: Vec3, targets: Vec3[]) => (string | null)[] };

/**
 * 막별 풍경(스펙 3절 "막별 풍경 (2-3b)"): 1막 절벽, 2막 부유 암석, 3막 도시와 첨탑. 메시 넷이 재질 하나를 함께 쓴다(드로콜 4, 프로그램 1).
 * 지오메트리는 처음 한 번 만들고, 매 프레임에는 uniform과 막 단위 등장(두 막 앞 메시 감추기)만 바꾼다.
 * ?debug=stats면 메시마다 그린 횟수·지오메트리 표지·카메라·첨탑 자리를 통계에 쓰고, e2e용 가림 확인을 창에 건다.
 * ?debug=stats&landscape=off면 풍경을 그리지 않는다. compare:captures가 풍경이 있는 장면과 없는 장면의 차이로 풍경 영역을 찾는다.
 */
export function Landscape() {
  const { meshes, material } = useMemo(() => {
    const created = createLandscapeMaterial();
    return { meshes: createLandscapeMeshes(landscapePieces(), created), material: created };
  }, []);
  const stats = useMemo(() => statsEnabled(), []);
  const shown = useMemo(() => !(stats && new URLSearchParams(window.location.search).get("landscape") === "off"), [stats]);

  useEffect(() => {
    const target = window as LandscapeWindow;
    if (stats) {
      countDraws(meshes);
      target.__journeyLandscapeBlocked = (from, targets) => targets.map((to) => landscapeBlocked(meshes, from, to));
    }
    return () => {
      delete target.__journeyLandscapeBlocked;
      recordLandscape(null);
      disposeLandscape(meshes, material);
    };
  }, [meshes, material, stats]);

  useFrame((state) => {
    const drive = currentDrive();
    writeLandscape(meshes, material, drive);
    if (stats) recordLandscape(takeLandscapeStats(meshes, drive, state.camera));
  });

  if (!shown) return null;
  return (
    <>
      {meshes.map((mesh) => (
        <primitive key={mesh.name} object={mesh} />
      ))}
    </>
  );
}
