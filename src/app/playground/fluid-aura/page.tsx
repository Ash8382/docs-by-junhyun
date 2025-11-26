"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { useMemo, useRef } from "react";
import Link from "next/link";
import * as THREE from "three";

// Simple noise function (or use a library, but inline is fine for simple needs)
// Using a simple sin/cos based flow field for "fluid" look
function FluidParticles({ count = 3000 }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const { viewport, mouse } = useThree();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  const particles = useMemo(() => {
    return new Array(count).fill(0).map(() => ({
      x: (Math.random() - 0.5) * 20,
      y: (Math.random() - 0.5) * 10,
      z: 0,
      vx: 0,
      vy: 0,
      life: Math.random(),
      color: new THREE.Color()
    }));
  }, [count]);

  useFrame((state) => {
    if (!mesh.current) return;

    const time = state.clock.elapsedTime;
    const mouseX = (state.mouse.x * viewport.width) / 2;
    const mouseY = (state.mouse.y * viewport.height) / 2;

    particles.forEach((p, i) => {
      // Flow field based on noise-like math
      const angle = (Math.sin(p.x * 0.5 + time * 0.5) + Math.cos(p.y * 0.5 + time * 0.5)) * Math.PI;
      
      // Mouse interaction
      const dx = mouseX - p.x;
      const dy = mouseY - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const force = Math.max(0, 5 - dist) * 0.05;

      p.vx += Math.cos(angle) * 0.01 + (dx / dist) * force;
      p.vy += Math.sin(angle) * 0.01 + (dy / dist) * force;
      
      // Friction
      p.vx *= 0.95;
      p.vy *= 0.95;
      
      p.x += p.vx;
      p.y += p.vy;
      
      // Wrap around
      if (p.x > 15) p.x = -15;
      if (p.x < -15) p.x = 15;
      if (p.y > 10) p.y = -10;
      if (p.y < -10) p.y = 10;

      // Color based on velocity
      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      p.color.setHSL(0.5 + speed * 2, 0.8, 0.5); // Cyan/Blue range

      dummy.position.set(p.x, p.y, 0);
      dummy.scale.setScalar(0.05 + speed * 0.2);
      dummy.updateMatrix();
      
      if (mesh.current) {
        mesh.current.setMatrixAt(i, dummy.matrix);
        mesh.current.setColorAt(i, p.color);
      }
    });

    if (mesh.current) {
      mesh.current.instanceMatrix.needsUpdate = true;
      if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <circleGeometry args={[1, 8]} />
      <meshBasicMaterial transparent opacity={0.6} toneMapped={false} />
    </instancedMesh>
  );
}

export default function FluidAuraPage() {
  return (
    <div className="w-full h-[calc(100vh-3.5rem)] relative bg-black">
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]">
          Fluid Aura 💧
        </h1>
        <p className="text-zinc-300 drop-shadow-md">마우스로 흐름을 만들어보세요.</p>
        <Link href="/playground" className="text-teal-400 hover:text-teal-300 mt-2 inline-block pointer-events-auto transition-colors">
          ← Back to Playground
        </Link>
      </div>

      <Canvas camera={{ position: [0, 0, 10], fov: 50 }} dpr={[1, 1.5]}>
        <color attach="background" args={["#000"]} />
        <FluidParticles count={3000} />
        <EffectComposer>
          <Bloom luminanceThreshold={0} mipmapBlur intensity={1.5} radius={0.8} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
