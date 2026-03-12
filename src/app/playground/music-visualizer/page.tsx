"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import * as THREE from "three";

// ---------------------------------------------------------------------------
// Audio Manager – lives outside React to persist across renders
// ---------------------------------------------------------------------------

class AudioManager {
  ctx: AudioContext | null = null;
  analyser: AnalyserNode | null = null;
  gainNode: GainNode | null = null;
  source: AudioBufferSourceNode | MediaElementAudioSourceNode | null = null;
  audioElement: HTMLAudioElement | null = null;
  frequencyData: Uint8Array<ArrayBuffer> = new Uint8Array(128);
  isPlaying = false;

  private ensureContext() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;
      this.gainNode = this.ctx.createGain();
      this.gainNode.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
      this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
    }
  }

  async loadFile(file: File) {
    this.ensureContext();
    this.stop();

    const url = URL.createObjectURL(file);
    this.audioElement = new Audio(url);
    this.audioElement.crossOrigin = "anonymous";

    const srcNode = this.ctx!.createMediaElementSource(this.audioElement);
    srcNode.connect(this.gainNode!);
    this.source = srcNode;
  }

  play() {
    this.ensureContext();
    if (this.ctx!.state === "suspended") this.ctx!.resume();
    if (this.audioElement) {
      this.audioElement.play();
      this.isPlaying = true;
    }
  }

  pause() {
    if (this.audioElement) {
      this.audioElement.pause();
      this.isPlaying = false;
    }
  }

  stop() {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = "";
      this.audioElement = null;
    }
    this.source = null;
    this.isPlaying = false;
  }

  setVolume(v: number) {
    this.ensureContext();
    if (this.gainNode) this.gainNode.gain.value = v;
  }

  getFrequencyData(): Uint8Array {
    if (this.analyser) {
      this.analyser.getByteFrequencyData(this.frequencyData);
    }
    return this.frequencyData;
  }

  dispose() {
    this.stop();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}

// ---------------------------------------------------------------------------
// Particle sphere component
// ---------------------------------------------------------------------------

const PARTICLE_COUNT = 2000;

function generateSpherePositions(count: number, radius: number) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const phi = Math.acos(2 * Math.random() - 1);
    const theta = Math.random() * Math.PI * 2;
    const r = radius * (0.8 + Math.random() * 0.2);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
  }
  return positions;
}

interface ParticlesProps {
  audioManager: AudioManager;
  demoMode: boolean;
}

function Particles({ audioManager, demoMode }: ParticlesProps) {
  const pointsRef = useRef<THREE.Points>(null);

  const { basePositions, sizes } = useMemo(() => {
    const bp = generateSpherePositions(PARTICLE_COUNT, 3);
    const sz = new Float32Array(PARTICLE_COUNT);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      sz[i] = 0.03 + Math.random() * 0.04;
    }
    return { basePositions: bp, sizes: sz };
  }, []);

  const colorsArr = useMemo(() => {
    const c = new Float32Array(PARTICLE_COUNT * 3);
    const col = new THREE.Color();
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      col.setHSL(0.75, 0.8, 0.5);
      c[i * 3] = col.r;
      c[i * 3 + 1] = col.g;
      c[i * 3 + 2] = col.b;
    }
    return c;
  }, []);

  useFrame((state) => {
    if (!pointsRef.current) return;
    const geo = pointsRef.current.geometry;
    const posAttr = geo.getAttribute("position") as THREE.BufferAttribute;
    const colAttr = geo.getAttribute("color") as THREE.BufferAttribute;
    const sizeAttr = geo.getAttribute("size") as THREE.BufferAttribute;
    const time = state.clock.elapsedTime;

    // Get frequency data (real or synthetic)
    let freqData: Uint8Array;
    if (demoMode) {
      freqData = new Uint8Array(128);
      for (let i = 0; i < 128; i++) {
        const wave = Math.sin(time * 2 + i * 0.1) * 0.5 + 0.5;
        const pulse = Math.sin(time * 1.3) * 0.3 + 0.7;
        freqData[i] = Math.floor(wave * pulse * 200 + Math.sin(time * 3 + i * 0.3) * 30);
      }
    } else {
      freqData = audioManager.getFrequencyData();
    }

    // Compute band averages
    const binCount = freqData.length;
    const lowEnd = Math.floor(binCount * 0.15);
    const midEnd = Math.floor(binCount * 0.5);

    let bassSum = 0;
    for (let i = 0; i < lowEnd; i++) bassSum += freqData[i];
    const bassAvg = bassSum / (lowEnd * 255);

    let midSum = 0;
    for (let i = lowEnd; i < midEnd; i++) midSum += freqData[i];
    const midAvg = midSum / ((midEnd - lowEnd) * 255);

    let highSum = 0;
    for (let i = midEnd; i < binCount; i++) highSum += freqData[i];
    const highAvg = highSum / ((binCount - midEnd) * 255);

    const col = new THREE.Color();

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const bx = basePositions[i * 3];
      const by = basePositions[i * 3 + 1];
      const bz = basePositions[i * 3 + 2];

      // Normalise direction for displacement
      const len = Math.sqrt(bx * bx + by * by + bz * bz) || 1;
      const nx = bx / len;
      const ny = by / len;
      const nz = bz / len;

      // Bass → radial expansion
      const expand = 1 + bassAvg * 1.8;

      // Per-particle jitter from frequency band mapped by index
      const freqIndex = Math.floor((i / PARTICLE_COUNT) * binCount);
      const localEnergy = freqData[freqIndex] / 255;

      posAttr.array[i * 3] = bx * expand + nx * localEnergy * 0.6;
      posAttr.array[i * 3 + 1] = by * expand + ny * localEnergy * 0.6;
      posAttr.array[i * 3 + 2] = bz * expand + nz * localEnergy * 0.6;

      // Mid → color: transition purple → cyan → pink
      // hue range: 0.75 (purple) → 0.5 (cyan) → 0.9 (pink)
      let hue: number;
      if (midAvg < 0.5) {
        hue = THREE.MathUtils.lerp(0.75, 0.5, midAvg * 2);
      } else {
        hue = THREE.MathUtils.lerp(0.5, 0.85, (midAvg - 0.5) * 2);
      }
      const saturation = 0.7 + midAvg * 0.3;
      const lightness = 0.4 + localEnergy * 0.35;
      col.setHSL(hue, saturation, lightness);

      colAttr.array[i * 3] = col.r;
      colAttr.array[i * 3 + 1] = col.g;
      colAttr.array[i * 3 + 2] = col.b;

      // High → shimmer/sparkle via size modulation
      const sparkle = highAvg > 0.1
        ? 1 + Math.sin(time * 15 + i * 0.7) * highAvg * 1.5
        : 1;
      sizeAttr.array[i] = sizes[i] * sparkle * (1 + localEnergy * 0.5);
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;

    // Slow self-rotation
    pointsRef.current.rotation.y += 0.001;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[basePositions.slice(), 3]}
          count={PARTICLE_COUNT}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colorsArr.slice(), 3]}
          count={PARTICLE_COUNT}
        />
        <bufferAttribute
          attach="attributes-size"
          args={[sizes.slice(), 1]}
          count={PARTICLE_COUNT}
        />
      </bufferGeometry>
      <pointsMaterial
        vertexColors
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        size={0.07}
        sizeAttenuation
      />
    </points>
  );
}

// ---------------------------------------------------------------------------
// Scene wrapper
// ---------------------------------------------------------------------------

interface SceneProps {
  audioManager: AudioManager;
  demoMode: boolean;
}

function Scene({ audioManager, demoMode }: SceneProps) {
  return (
    <>
      <color attach="background" args={["#050510"]} />
      <ambientLight intensity={0.1} />
      <Particles audioManager={audioManager} demoMode={demoMode} />
      <OrbitControls
        enablePan={false}
        enableZoom
        autoRotate
        autoRotateSpeed={0.6}
        minDistance={3}
        maxDistance={15}
      />
      <EffectComposer>
        <Bloom
          luminanceThreshold={0.15}
          luminanceSmoothing={0.9}
          intensity={1.6}
          mipmapBlur
        />
      </EffectComposer>
    </>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MusicVisualizerPage() {
  const audioManagerRef = useRef<AudioManager | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [demoMode, setDemoMode] = useState(true);
  const [hasFile, setHasFile] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [fileName, setFileName] = useState<string | null>(null);

  // Lazily create AudioManager
  const getAudioManager = useCallback(() => {
    if (!audioManagerRef.current) {
      audioManagerRef.current = new AudioManager();
    }
    return audioManagerRef.current;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      audioManagerRef.current?.dispose();
    };
  }, []);

  // Volume sync
  useEffect(() => {
    if (audioManagerRef.current) {
      audioManagerRef.current.setVolume(volume);
    }
  }, [volume]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const am = getAudioManager();
    await am.loadFile(file);
    am.setVolume(volume);
    setHasFile(true);
    setFileName(file.name);
    setDemoMode(false);
    setIsPlaying(false);
  };

  const togglePlay = () => {
    const am = getAudioManager();
    if (isPlaying) {
      am.pause();
      setIsPlaying(false);
    } else {
      am.play();
      setIsPlaying(true);
    }
  };

  const toggleDemo = () => {
    const am = getAudioManager();
    if (!demoMode) {
      am.pause();
      setIsPlaying(false);
      setDemoMode(true);
    } else {
      setDemoMode(false);
    }
  };

  return (
    <div className="relative w-full" style={{ height: "calc(100vh - 56px)" }}>
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 0, 8], fov: 60 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
      >
        <Scene audioManager={getAudioManager()} demoMode={demoMode} />
      </Canvas>

      {/* Control Panel Overlay */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-auto z-10">
        <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl px-6 py-4 flex flex-col gap-3 min-w-[320px]">
          {/* File upload */}
          <div className="flex items-center gap-3">
            <label className="cursor-pointer bg-purple-600 hover:bg-purple-500 transition-colors text-white text-sm font-medium px-4 py-2 rounded-lg">
              Upload Audio
              <input
                type="file"
                accept="audio/mp3,audio/wav,audio/mpeg,audio/ogg,audio/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
            {fileName && (
              <span className="text-white/60 text-xs truncate max-w-[140px]">
                {fileName}
              </span>
            )}
          </div>

          {/* Playback + Demo */}
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              disabled={!hasFile || demoMode}
              className="bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm px-4 py-2 rounded-lg transition-colors"
            >
              {isPlaying ? "Pause" : "Play"}
            </button>
            <button
              onClick={toggleDemo}
              className={`text-sm px-4 py-2 rounded-lg transition-colors ${
                demoMode
                  ? "bg-cyan-500/80 text-white"
                  : "bg-white/10 hover:bg-white/20 text-white"
              }`}
            >
              Demo Mode
            </button>
          </div>

          {/* Volume slider */}
          <div className="flex items-center gap-3">
            <span className="text-white/50 text-xs w-12">Vol</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="flex-1 accent-purple-500 h-1"
            />
            <span className="text-white/50 text-xs w-8 text-right">
              {Math.round(volume * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* Back link */}
      <div className="absolute top-4 left-4 z-10">
        <Link
          href="/playground"
          className="text-purple-400 hover:text-purple-300 transition-colors text-sm"
        >
          &larr; Playground
        </Link>
      </div>
    </div>
  );
}
