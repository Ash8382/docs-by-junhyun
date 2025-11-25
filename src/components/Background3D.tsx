"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import * as THREE from "three";

function generateSpherePoints(count: number, radius: number) {
  const points = new Float32Array(count * 3);
  
  for (let i = 0; i < count; i++) {
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const r = Math.cbrt(Math.random()) * radius;

    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);

    points[i * 3] = x;
    points[i * 3 + 1] = y;
    points[i * 3 + 2] = z;
  }
  return points;
}

const starColors = [
  { color: "#ffffff", count: 1200, size: 0.012 },  // 흰색 별 (기본)
  { color: "#fffacd", count: 300, size: 0.018 },   // 노란색 별 (태양 같은)
  { color: "#ffa500", count: 200, size: 0.020 },   // 주황색 별
  { color: "#87ceeb", count: 200, size: 0.016 },   // 파란색 별
  { color: "#ff6b6b", count: 100, size: 0.022 },   // 붉은색 별
];

function Stars(props: any) {
  const ref = useRef<any>(null);
  const rotationRef = useRef({ x: 0, y: 0 });

  useFrame((state, delta) => {
    if (ref.current) {
      rotationRef.current.x -= delta / 10;
      rotationRef.current.y -= delta / 15;

      const x = (state.pointer.x || 0) * 0.2;
      const y = (state.pointer.y || 0) * 0.2;
      ref.current.rotation.x = rotationRef.current.x + y;
      ref.current.rotation.y = rotationRef.current.y + x;
    }
  });

  return (
    <group ref={ref} rotation={[0, 0, Math.PI / 4]}>
      {starColors.map((starType, index) => {
        const positions = useMemo(() => generateSpherePoints(starType.count, 1.5), [starType.count]);
        
        return (
          <Points key={index} positions={positions} stride={3} frustumCulled={false} {...props}>
            <PointMaterial
              transparent
              color={starType.color}
              size={starType.size}
              sizeAttenuation={true}
              depthWrite={false}
              opacity={0.7}
              blending={THREE.AdditiveBlending}
            />
          </Points>
        );
      })}
    </group>
  );
}

export function Background3D() {
  return (
    <div className="fixed inset-0 -z-10 h-full w-full opacity-50 pointer-events-none">
      <Canvas camera={{ position: [0, 0, 1] }}>
        <Stars />
      </Canvas>
    </div>
  );
}
