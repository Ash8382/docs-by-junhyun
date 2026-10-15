"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { AdditiveBlending, BufferAttribute, BufferGeometry, DoubleSide, Mesh, MeshBasicMaterial } from "three";
import { STREAK_VERTICES, streakIndices, writeStreaks } from "@/lib/journey/streaks";
import { currentDrive } from "./driveFrame";

function createStreaks() {
  const positions = new BufferAttribute(new Float32Array(STREAK_VERTICES * 3), 3);
  const colors = new BufferAttribute(new Float32Array(STREAK_VERTICES * 3), 3);
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", positions);
  geometry.setAttribute("color", colors);
  geometry.setIndex(new BufferAttribute(streakIndices(), 1));
  // 띠는 카메라를 향하지만 감는 방향이 자리에 따라 뒤집히므로 양면으로 그린다. 더하기 혼합이라 검정은 투명이다.
  const material = new MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    side: DoubleSide,
    fog: false,
  });
  const mesh = new Mesh(geometry, material);
  // 정점이 매 프레임 바뀌어 경계 구가 맞지 않는다. 차 바로 뒤라 늘 화면 안이다.
  mesh.frustumCulled = false;
  return {
    mesh,
    positions,
    colors,
    dispose: () => {
      geometry.dispose();
      material.dispose();
    },
  };
}

type StreakMesh = ReturnType<typeof createStreaks>;

function update(streaks: StreakMesh, camera: { x: number; y: number; z: number }): void {
  writeStreaks(currentDrive(), [camera.x, camera.y, camera.z], streaks.positions.array as Float32Array, streaks.colors.array as Float32Array);
  streaks.positions.needsUpdate = true;
  streaks.colors.needsUpdate = true;
}

/** 테일라이트 빛줄기(스펙 3절 "차"). 매 프레임 도로 곡률을 따라 다시 그린다. 드로콜 하나다 */
export function Streaks() {
  const streaks = useMemo(() => createStreaks(), []);
  useEffect(() => () => streaks.dispose(), [streaks]);
  useFrame((state) => update(streaks, state.camera.position));
  return <primitive object={streaks.mesh} />;
}
