"use client";

import { Line } from "@react-three/drei";
import { useMemo } from "react";
import { PATH_LENGTH, STOPS, focusPoint, pathPoint, type Vec3 } from "@/lib/journey/timeline";

// 2-2(시각 언어)에서 실제 회랑으로 바뀌는 임시 장면. 카메라 경로와 정류장 위치를 눈으로 확인하는 용도다.
const ACT_COLOR = { 0: "#71717a", 1: "#5bc0ff", 2: "#a1a1aa", 3: "#f5b942" } as const;
const HALF_WIDTH = 2.5;

export function PlaceholderCorridor() {
  const lines = useMemo(() => {
    const center: Vec3[] = [];
    const left: Vec3[] = [];
    const right: Vec3[] = [];
    for (let s = 0; s <= PATH_LENGTH + 10; s += 1) {
      const [x, , z] = pathPoint(s);
      center.push([x, 0, z]);
      left.push([x - HALF_WIDTH, 0, z]);
      right.push([x + HALF_WIDTH, 0, z]);
    }
    return { center, left, right };
  }, []);

  return (
    <group>
      <Line points={lines.center} color="#3f3f46" lineWidth={1} dashed dashSize={0.5} gapSize={0.5} />
      <Line points={lines.left} color="#52525b" lineWidth={1} />
      <Line points={lines.right} color="#52525b" lineWidth={1} />
      {STOPS.map((stop) => {
        const focus = focusPoint(stop);
        if (!focus) return null;
        const size = stop.kind === "hall" ? 1.6 : stop.act === 1 ? 0.5 : 0.9;
        return (
          <mesh key={stop.id} position={focus}>
            <icosahedronGeometry args={[size, 0]} />
            <meshBasicMaterial color={ACT_COLOR[stop.act]} wireframe />
          </mesh>
        );
      })}
    </group>
  );
}
