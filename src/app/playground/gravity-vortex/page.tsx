"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import * as THREE from "three";

function VortexParticles({ count = 3000 }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const { viewport, mouse } = useThree();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  // Particle state
  const particles = useMemo(() => {
    return new Array(count).fill(0).map(() => {
      const radius = Math.random() * 5 + 2;
      const angle = Math.random() * Math.PI * 2;
      return {
        angle,
        radius,
        speed: (Math.random() * 0.5 + 0.2) / radius, // Inner particles move faster
        y: (Math.random() - 0.5) * 1,
        color: new THREE.Color().setHSL(Math.random() * 0.1 + 0.6, 0.8, 0.5), // Blue/Purple hues
        originalRadius: radius,
        exploding: false,
        explosionVelocity: new THREE.Vector3()
      };
    });
  }, [count]);

  const [exploding, setExploding] = useState(false);

  useFrame((state) => {
    if (!mesh.current) return;

    particles.forEach((particle, i) => {
      if (exploding) {
        // Explosion logic
        if (!particle.exploding) {
          particle.exploding = true;
          particle.explosionVelocity.set(
            (Math.random() - 0.5) * 0.5,
            (Math.random() - 0.5) * 0.5,
            (Math.random() - 0.5) * 0.5
          );
        }
        
        // Move outward
        particle.radius += particle.explosionVelocity.length() * 10;
        particle.angle += particle.speed * 0.1;
        
        // Reset if too far
        if (particle.radius > 20) {
          particle.radius = Math.random() * 5 + 2;
          particle.exploding = false;
        }
      } else {
        // Normal vortex logic
        particle.angle += particle.speed;
        
        // Mouse interaction (attract/distort)
        const mouseX = (state.mouse.x * viewport.width) / 2;
        const mouseY = (state.mouse.y * viewport.height) / 2;
        
        // Gentle wave effect based on time
        particle.y = Math.sin(state.clock.elapsedTime + particle.radius) * 0.5;
      }

      // Update position
      const x = Math.cos(particle.angle) * particle.radius;
      const z = Math.sin(particle.angle) * particle.radius;
      
      dummy.position.set(x, particle.y, z);
      dummy.rotation.y = particle.angle;
      dummy.scale.setScalar(exploding ? 0.05 : 0.03);
      
      dummy.updateMatrix();
      if (mesh.current) {
        mesh.current.setMatrixAt(i, dummy.matrix);
        mesh.current.setColorAt(i, particle.color);
      }
    });
    
    if (mesh.current) {
      mesh.current.instanceMatrix.needsUpdate = true;
      if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
    }
  });

  // Handle click to trigger explosion
  useFrame(() => {
    if (exploding) {
      // Auto reset explosion state after some time or let it be continuous?
      // Let's make it toggle-able via parent or just click event
    }
  });

  return (
    <instancedMesh 
      ref={mesh} 
      args={[undefined, undefined, count]} 
      onClick={() => setExploding(!exploding)}
      onPointerOver={() => document.body.style.cursor = 'pointer'}
      onPointerOut={() => document.body.style.cursor = 'auto'}
    >
      <sphereGeometry args={[1, 8, 8]} />
      <meshStandardMaterial toneMapped={false} emissiveIntensity={2} />
    </instancedMesh>
  );
}

export default function GravityVortexPage() {
  return (
    <div className="w-full h-[calc(100vh-3.5rem)] relative bg-black">
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]">
          Gravity Vortex 🌀
        </h1>
        <p className="text-zinc-300 drop-shadow-md">클릭하여 소용돌이를 폭발시키세요!</p>
        <Link href="/playground" className="text-blue-400 hover:text-blue-300 mt-2 inline-block pointer-events-auto transition-colors">
          ← Back to Playground
        </Link>
      </div>

      <Canvas camera={{ position: [0, 10, 10], fov: 45 }} dpr={[1, 2]}>
        <color attach="background" args={["#000"]} />
        
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        
        <ambientLight intensity={0.5} />
        <pointLight position={[0, 0, 0]} intensity={2} color="#4f46e5" />
        
        <VortexParticles count={4000} />
        
        <OrbitControls autoRotate autoRotateSpeed={1} enableZoom={false} />
        
        <EffectComposer>
          <Bloom luminanceThreshold={0.2} mipmapBlur intensity={1.5} radius={0.6} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
