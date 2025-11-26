"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text, Float, ContactShadows } from "@react-three/drei";
import { useRef, useState } from "react";
import Link from "next/link";
import * as THREE from "three";

function Monitor(props: any) {
  const [hovered, setHover] = useState(false);
  
  return (
    <group {...props}>
      {/* Stand */}
      <mesh position={[0, 1, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 2, 32]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.8, 0.8, 0.2, 32]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      
      {/* Screen Frame */}
      <mesh 
        position={[0, 2.5, 0.2]} 
        onPointerOver={() => setHover(true)}
        onPointerOut={() => setHover(false)}
      >
        <boxGeometry args={[4, 2.5, 0.2]} />
        <meshStandardMaterial color={hovered ? "#444" : "#222"} />
      </mesh>
      
      {/* Screen Display */}
      <mesh position={[0, 2.5, 0.31]}>
        <planeGeometry args={[3.8, 2.3]} />
        <meshStandardMaterial color="#000" emissive="#000" />
      </mesh>
      
      {/* Code Text */}
      <Text
        position={[0, 2.5, 0.32]}
        fontSize={0.15}
        color="#00ff00"
        anchorX="center"
        anchorY="middle"
      >
        {`console.log("Hello World");\nwhile(alive) {\n  code();\n  eat();\n  sleep();\n}`}
      </Text>
    </group>
  );
}

function Laptop(props: any) {
  const [hovered, setHover] = useState(false);
  const group = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (group.current && hovered) {
      group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, 0.5, 0.1);
    } else if (group.current) {
      group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, 0, 0.1);
    }
  });

  return (
    <group ref={group} {...props} onPointerOver={() => setHover(true)} onPointerOut={() => setHover(false)}>
      {/* Base */}
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[2, 0.2, 1.5]} />
        <meshStandardMaterial color="#888" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Screen */}
      <group position={[0, 0.2, -0.75]} rotation={[-0.2, 0, 0]}>
        <mesh position={[0, 0.75, 0]}>
          <boxGeometry args={[2, 1.5, 0.1]} />
          <meshStandardMaterial color="#888" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.75, 0.06]}>
          <planeGeometry args={[1.8, 1.3]} />
          <meshStandardMaterial color="#111" />
        </mesh>
        <Text position={[0, 0.75, 0.07]} fontSize={0.2} color="white">
          Dev Mode
        </Text>
      </group>
    </group>
  );
}

function CoffeeMug(props: any) {
  const [active, setActive] = useState(false);

  return (
    <group 
      {...props} 
      onClick={() => setActive(!active)}
      scale={active ? 1.2 : 1}
    >
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.8, 32]} />
        <meshStandardMaterial color="#fff" />
      </mesh>
      {/* Coffee Liquid */}
      <mesh position={[0, 0.75, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.25, 32]} />
        <meshStandardMaterial color="#3f2e18" />
      </mesh>
      {/* Steam */}
      {active && (
        <Float speed={2} rotationIntensity={0} floatIntensity={1}>
          <Text position={[0, 1.2, 0]} fontSize={0.3} color="#aaa" fillOpacity={0.5}>
            ~~~
          </Text>
        </Float>
      )}
    </group>
  );
}

function Desk() {
  return (
    <mesh position={[0, -0.5, 0]} receiveShadow>
      <boxGeometry args={[8, 0.5, 4]} />
      <meshStandardMaterial color="#5d4037" />
    </mesh>
  );
}

export default function DeskPage() {
  return (
    <div className="w-full h-[calc(100vh-3.5rem)] relative bg-zinc-900">
      <div className="absolute top-4 left-4 z-10">
        <h1 className="text-4xl font-bold text-white mb-2">Dev Desk 💻</h1>
        <p className="text-zinc-400">마우스로 드래그하여 둘러보고, 물건들과 상호작용해보세요.</p>
        <Link href="/playground" className="text-blue-400 hover:text-blue-300 mt-2 inline-block">
          ← Back to Playground
        </Link>
      </div>

      <Canvas shadows camera={{ position: [0, 3, 6], fov: 50 }}>
        <color attach="background" args={["#18181b"]} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} castShadow />
        <spotLight position={[0, 5, 0]} intensity={0.8} angle={0.5} penumbra={1} castShadow />
        
        <group position={[0, -1, 0]}>
          <Desk />
          <Monitor position={[0, 0, -1]} />
          <Laptop position={[-2, 0, 0.5]} rotation={[0, 0.3, 0]} />
          <CoffeeMug position={[2, 0, 1]} />
        </group>

        <ContactShadows position={[0, -0.5, 0]} opacity={0.4} scale={10} blur={2.5} far={4} />
        <OrbitControls minPolarAngle={0} maxPolarAngle={Math.PI / 2.2} />
      </Canvas>
    </div>
  );
}
