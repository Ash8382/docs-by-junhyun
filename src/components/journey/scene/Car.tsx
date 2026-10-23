"use client";

import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { Component, useEffect, useMemo, useRef, type ReactNode } from "react";
import type { Group, WebGLRenderer } from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import { BASIS_PATH, CAR_URL, DRACO_PATH } from "@/lib/journey/carAsset";
import { setCarStatus } from "@/lib/journey/sceneStatus";
import { endingPhases } from "@/lib/journey/timeline";
import { applyCarLights, applyWheelTravel, placeCar, prepareCar } from "./carModel";
import { CarSilhouette } from "./CarSilhouette";
import { currentDrive } from "./driveFrame";

let decoders: { draco: DRACOLoader; ktx2: KTX2Loader } | null = null;

/** Draco·Basis 디코더를 public/journey/decoders/에서 쓰게 한다. KTX2는 이 렌더러가 올릴 수 있는 압축 형식을 고른다 */
function attachDecoders(loader: GLTFLoader, gl: WebGLRenderer): void {
  decoders ??= {
    draco: new DRACOLoader().setDecoderPath(DRACO_PATH),
    ktx2: new KTX2Loader().setTranscoderPath(BASIS_PATH).detectSupport(gl),
  };
  loader.setDRACOLoader(decoders.draco).setKTX2Loader(decoders.ktx2);
}

/** 모델을 다 받았거나 실패하면 디코더 작업자(Web Worker)를 내린다 */
function releaseDecoders(): void {
  decoders?.draco.dispose();
  decoders?.ktx2.dispose();
  decoders = null;
}

/**
 * 차 모델(스펙 3절 "차"). 장면과 같은 Suspense 안에서 받으므로 Warmup이 차 재질까지 미리 컴파일한 뒤에 장면이 드러난다.
 * 늦게 와도 자리는 CarRig가 매 프레임 진행률로 잡으므로, 나타나는 순간 그 진행률의 자세다.
 */
function CarModel() {
  const gl = useThree((state) => state.gl);
  const gltf = useLoader(GLTFLoader, CAR_URL, (loader) => attachDecoders(loader, gl));
  const car = useMemo(() => prepareCar(gltf.scene), [gltf]);
  useEffect(() => {
    releaseDecoders();
    setCarStatus("model");
    return () => car.dispose();
  }, [car]);
  useFrame(() => {
    const drive = currentDrive();
    applyCarLights(car.headlights, car.taillights, drive);
    applyWheelTravel(car, drive);
  });
  return <primitive object={car.object} />;
}

/** 차 모델·디코더를 받지 못하면(오류) 빛 실루엣으로 바꾼다. 장면 전체는 그대로 이어진다(스펙 5절 "실패 대응") */
class CarBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    releaseDecoders();
    setCarStatus("silhouette");
    console.warn("여정 차 모델을 불러오지 못해 빛 실루엣으로 대신합니다", error);
  }

  render() {
    return this.state.failed ? <CarSilhouette /> : this.props.children;
  }
}

/** 차 자리. 모델이든 실루엣이든 같은 driveAt(p) 자세를 쓴다 */
export function Car() {
  const group = useRef<Group>(null);
  useFrame(() => {
    if (!group.current) return;
    const drive = currentDrive();
    placeCar(group.current, drive);
    // 엔딩(병합 뒤): 카메라가 올라가 차가 몇 화소가 됐을 때 감춘다. 차가 있던 길 끝으로 빛이 모여 흰 점이 된다
    group.current.visible = endingPhases(drive.progress).fade < 0.5;
  });
  return (
    <group ref={group} name="journey-car">
      <CarBoundary>
        <CarModel />
      </CarBoundary>
    </group>
  );
}
