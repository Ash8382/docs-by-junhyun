"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { BufferAttribute, BufferGeometry } from "three";
import { roadMesh } from "@/lib/journey/road";
import { currentDrive } from "./driveFrame";
import { createRoadMaterial, roadUniforms } from "./roadMaterial";

/** 첫 프레임의 delta는 페이지를 연 뒤 지난 시간(수십 초)이다. 한 프레임에 이만큼까지만 더해 노이즈가 건너뛰지 않게 한다 */
const MAX_DELTA = 0.1;

function buildRoadGeometry(): BufferGeometry {
  const data = roadMesh();
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(data.positions, 3));
  geometry.setAttribute("normal", new BufferAttribute(data.normals, 3));
  geometry.setAttribute("journeyRoad", new BufferAttribute(data.road, 4));
  geometry.setIndex(new BufferAttribute(data.indices, 1));
  return geometry;
}

/**
 * 빛의 길(스펙 3절 "길이 열린다, 색이 쌓인다"). 도로 판 하나에 도로 재질 하나라 드로콜 하나다.
 * 매 프레임 열린 끝·차 자리·엔딩 정도·경계 노이즈 시간을 uniform으로 넘긴다(셰이더를 다시 컴파일하지 않는다).
 */
export function Road() {
  const geometry = useMemo(() => buildRoadGeometry(), []);
  const material = useMemo(() => createRoadMaterial(), []);
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame((_, delta) => {
    const drive = currentDrive();
    roadUniforms.uJourneyTime.value += Math.min(delta, MAX_DELTA);
    roadUniforms.uRevealS.value = drive.revealS;
    roadUniforms.uCarS.value = drive.carS;
    roadUniforms.uEnding.value = drive.ending;
  });

  return <mesh geometry={geometry} material={material} />;
}
