"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import * as random from "maath/random/dist/maath-random.esm";

function Stars(props: any) {
  const ref = useRef<any>(null);
  const sphere = useMemo(() => {
    const data = random.inSphere(new Float32Array(5000), { radius: 1.5 });
    // Validate data to ensure no NaNs
    for (let i = 0; i < data.length; i++) {
      if (isNaN(data[i])) data[i] = 0;
    }
    return data;
  }, []);

  useFrame((state, delta) => {
    if (ref.current) {
      ref.current.rotation.x -= delta / 10;
      ref.current.rotation.y -= delta / 15;

      // Mouse interaction with safety checks
      const x = (state.pointer.x || 0) * 0.2;
      const y = (state.pointer.y || 0) * 0.2;
      
      // Smoothly interpolate rotation, avoiding NaN propagation
      if (!isNaN(x) && !isNaN(y)) {
        ref.current.rotation.x += (y - ref.current.rotation.x) * delta * 0.2;
        ref.current.rotation.y += (x - ref.current.rotation.y) * delta * 0.2;
      }
    }
  });

  return (
    <group rotation={[0, 0, Math.PI / 4]}>
      <Points ref={ref} positions={sphere} stride={3} frustumCulled={false} {...props}>
        <PointMaterial
          transparent
          color="#888888" // Neutral gray to work with both light/dark
          size={0.005}
          sizeAttenuation={true}
          depthWrite={false}
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
