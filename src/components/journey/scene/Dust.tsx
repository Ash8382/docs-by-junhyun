"use client";

import { PointMaterial, Points } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Group } from "three";
import { DUST_COUNT, dustField } from "@/lib/journey/space";

/** 첫 프레임의 delta는 페이지를 연 뒤 지난 시간이다. 한 프레임에 이만큼까지만 더한다 */
const MAX_DELTA = 0.1;

/**
 * 길 양옆에 천천히 떠다니는 별 먼지(사이트 공통 배경의 별 먼지와 같은 결). 차와 카메라가 지나는 길에서 비켜 두어
 * 가까운 먼지가 화면에 큰 원으로 보이지 않는다(lib/journey/space.ts DUST_CLEARANCE).
 */
export function Dust() {
  const positions = useMemo(() => dustField(DUST_COUNT, 7), []);
  const group = useRef<Group>(null);
  const time = useRef(0);

  useFrame((_, delta) => {
    time.current += Math.min(delta, MAX_DELTA);
    group.current?.position.set(Math.sin(time.current * 0.13) * 0.15, Math.sin(time.current * 0.2) * 0.25, 0);
  });

  return (
    <group ref={group}>
      <Points positions={positions} stride={3}>
        <PointMaterial transparent color="#cfe0ff" size={0.12} sizeAttenuation depthWrite={false} opacity={0.6} />
      </Points>
    </group>
  );
}
