"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import * as THREE from "three";

function generateSpherePoints(count: number, radius: number) {
  const points = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  
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
    
    sizes[i] = Math.random() * 1.5 + 0.5;
  }
  return { points, sizes };
}

function Stars(props: any) {
  const ref = useRef<any>(null);
  const rotationRef = useRef({ x: 0, y: 0 });
  const { points, sizes } = useMemo(() => generateSpherePoints(5000, 1.5), []);

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
    <group rotation={[0, 0, Math.PI / 4]}>
      <Points ref={ref} positions={points} stride={3} frustumCulled={false} {...props}>
        <PointMaterial
          transparent
          color="#ffffff"
          size={0.008}
          sizeAttenuation={true}
          depthWrite={false}
          opacity={0.8}
          blending={THREE.AdditiveBlending}
        />
      </Points>
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
