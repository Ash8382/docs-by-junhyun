"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Text, OrbitControls, Stars, Sparkles } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { useMemo, useRef } from "react";
import Link from "next/link";
import * as THREE from "three";

const SKILLS = [
  "React", "Next.js", "TypeScript", "Node.js", "Three.js", 
  "Tailwind", "GraphQL", "Docker", "AWS", "Figma",
  "Git", "Redux", "Zustand", "Prisma", "PostgreSQL",
  "HTML", "CSS", "JavaScript", "Python", "Vercel"
];

function Particles({ count = 60 }) {
  const { viewport, mouse } = useThree();
  
  // Generate random particles with skills
  const particles = useMemo(() => {
    return new Array(count).fill(0).map((_, i) => {
      const skill = i < SKILLS.length ? SKILLS[i] : null;
      return {
        position: new THREE.Vector3(
          (Math.random() - 0.5) * 15,
          (Math.random() - 0.5) * 15,
          (Math.random() - 0.5) * 15
        ),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.02
        ),
        skill,
        color: new THREE.Color().setHSL(Math.random(), 0.8, 0.5)
      };
    });
  }, [count]);

  const lineGeometry = useMemo(() => new THREE.BufferGeometry(), []);
  const lineMaterial = useMemo(() => new THREE.LineBasicMaterial({ 
    color: "#a78bfa", // violet-400
    transparent: true, 
    opacity: 0.15,
    vertexColors: false
  }), []);

  useFrame((state) => {
    // Update particle positions
    particles.forEach((particle) => {
      particle.position.add(particle.velocity);

      // Bounce off walls (roughly)
      if (Math.abs(particle.position.x) > 8) particle.velocity.x *= -1;
      if (Math.abs(particle.position.y) > 8) particle.velocity.y *= -1;
      if (Math.abs(particle.position.z) > 8) particle.velocity.z *= -1;

      // Mouse interaction (repel)
      const mousePos = new THREE.Vector3(
        (state.mouse.x * viewport.width) / 2,
        (state.mouse.y * viewport.height) / 2,
        0
      );
      const dist = particle.position.distanceTo(mousePos);
      if (dist < 3) {
        const force = particle.position.clone().sub(mousePos).normalize().multiplyScalar(0.08);
        particle.position.add(force);
      }
    });

    // Update lines
    const positions: number[] = [];
    particles.forEach((p1, i) => {
      particles.forEach((p2, j) => {
        if (i < j) {
          const dist = p1.position.distanceTo(p2.position);
          if (dist < 3.5) {
            positions.push(
              p1.position.x, p1.position.y, p1.position.z,
              p2.position.x, p2.position.y, p2.position.z
            );
          }
        }
      });
    });

    lineGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );
  });

  return (
    <group>
      {/* Particles (Skills) */}
      {particles.map((particle, i) => (
        <group key={i} position={particle.position}>
          <mesh>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshStandardMaterial 
              color={particle.color} 
              emissive={particle.color}
              emissiveIntensity={2}
              toneMapped={false}
            />
          </mesh>
          {particle.skill && (
            <Text
              position={[0, 0.3, 0]}
              fontSize={0.25}
              color="#fff"
              anchorX="center"
              anchorY="bottom"
              outlineWidth={0.02}
              outlineColor="#000"
            >
              {particle.skill}
            </Text>
          )}
        </group>
      ))}
      
      {/* Connections */}
      <lineSegments geometry={lineGeometry} material={lineMaterial} />
    </group>
  );
}

export default function ConstellationPage() {
  return (
    <div className="w-full h-[calc(100vh-3.5rem)] relative bg-black">
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
          Skill Constellation 🌌
        </h1>
        <p className="text-zinc-300 drop-shadow-md">마우스를 움직여 우주를 탐험하세요.</p>
        <Link href="/playground" className="text-purple-400 hover:text-purple-300 mt-2 inline-block pointer-events-auto transition-colors">
          ← Back to Playground
        </Link>
      </div>

      <Canvas camera={{ position: [0, 0, 10], fov: 60 }} dpr={[1, 2]}>
        <color attach="background" args={["#050505"]} />
        
        {/* Background Effects */}
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <Sparkles count={200} scale={12} size={2} speed={0.4} opacity={0.5} color="#fff" />
        
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        
        <Particles count={60} />
        
        <OrbitControls enableZoom={false} enablePan={false} rotateSpeed={0.5} autoRotate autoRotateSpeed={0.5} />
        
        {/* Post Processing */}
        <EffectComposer>
          <Bloom luminanceThreshold={0.2} mipmapBlur intensity={1.5} radius={0.4} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
