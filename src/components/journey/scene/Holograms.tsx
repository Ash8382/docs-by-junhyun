"use client";

import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { use, useEffect, useMemo, useRef } from "react";
import { Vector3, type Camera, type DataArrayTexture, type WebGLRenderer } from "three";
import { damp } from "@/lib/journey/damp";
import { parseJourneyHash } from "@/lib/journey/hash";
import { HOLOGRAMS, REPO_COUNT, hologramsAt, imageCorners, pickcareFront } from "@/lib/journey/holograms";
import { getFocusedHologram, setShownHolograms } from "@/lib/journey/hologramStatus";
import type { Vec3 } from "@/lib/journey/timeline";
import { openHologramDetail } from "../hologramLinks";
import { currentDrive } from "./driveFrame";
import { recordHolograms, statsEnabled, type HologramStats } from "./frameStats";
import { createLayerTexture, loadHologramLayers, releaseHologramLayers, uploadChecked, type LayerPixels } from "./hologramAtlas";
import { createHologramMeshes, hologramAt, writeHolograms } from "./hologramMeshes";

/** PiCKCARE 앞줄이 목표 저장소로 미끄러지는 감쇠 세기 */
const FRONT_DAMPING = 4;
/** 테두리가 밝아지고 돌아오는 감쇠 세기 */
const GLOW_DAMPING = 12;

interface Atlas {
  texture: DataArrayTexture;
  loaded: readonly boolean[];
}

const atlases = new WeakMap<readonly LayerPixels[], Atlas | null>();

/**
 * 받은 층으로 텍스처 배열을 만들어 올린다. 층을 하나도 받지 못했거나 배열 생성·업로드가 실패하면 null(홀로그램 전체를 그리지 않는다).
 * 처음 그릴 때 한 번 하므로 Warmup이 셰이더를 컴파일하기 전에 끝난다. 같은 층 목록이면 같은 결과를 돌려준다(개발 모드의 두 번 렌더).
 */
function buildAtlas(gl: WebGLRenderer, layers: readonly LayerPixels[]): Atlas | null {
  if (atlases.has(layers)) return atlases.get(layers) ?? null;
  let atlas: Atlas | null = null;
  if (layers.every((layer) => layer === null)) {
    console.warn("여정 홀로그램 층을 하나도 받지 못해 홀로그램을 그리지 않습니다");
  } else {
    try {
      const texture = createLayerTexture(layers);
      if (uploadChecked(gl, texture)) atlas = { texture, loaded: layers.map((layer) => layer !== null) };
      else texture.dispose();
    } catch (error) {
      console.warn("여정 홀로그램 텍스처 배열을 만들지 못해 홀로그램을 그리지 않습니다", error);
    }
  }
  atlases.set(layers, atlas);
  return atlas;
}

const NOTHING: HologramStats = { shown: [], hovered: null, glowing: [], front: "pickcare/frontend", screens: [] };

/**
 * 제품 화면 홀로그램(스펙 3절 "제품 화면 홀로그램 (2-3a)"). 층 이미지 11장을 장면과 같은 Suspense 안에서 받으므로
 * Warmup이 홀로그램 셰이더까지 미리 컴파일한 뒤에 장면이 드러난다. 배열을 만들지 못해도 장면은 이어진다.
 */
export function Holograms() {
  const gl = useThree((state) => state.gl);
  const layers = use(loadHologramLayers());
  const atlas = useMemo(() => buildAtlas(gl, layers), [gl, layers]);
  useEffect(
    () => () => {
      releaseHologramLayers();
      recordHolograms(null);
    },
    [],
  );
  useEffect(() => {
    if (!atlas) recordHolograms(NOTHING);
  }, [atlas]);
  return atlas ? <HologramScene atlas={atlas} /> : null;
}

const cameraPosition: Vec3 = [0, 0, 0];
const corner = new Vector3();

/**
 * 통계용: 화면에 보이는 홀로그램의 그림 영역을 실제 카메라로 화면 비율 좌표(0~1)에 옮긴다.
 * 꼭짓점 하나라도 카메라 뒤에 있거나 화면과 겹치지 않으면 뺀다.
 */
function screenRects(
  placements: ReturnType<typeof hologramsAt>,
  loaded: readonly boolean[],
  targets: (index: number) => boolean,
  camera: Camera,
): HologramStats["screens"] {
  const screens: HologramStats["screens"] = [];
  placements.forEach((placement, index) => {
    if (!loaded[index] || placement.presence <= 0) return;
    const xs: number[] = [];
    const ys: number[] = [];
    for (const point of imageCorners(HOLOGRAMS[index], placement, cameraPosition)) {
      if (corner.set(...point).applyMatrix4(camera.matrixWorldInverse).z > -0.1) return;
      corner.set(...point).project(camera);
      xs.push((corner.x + 1) / 2);
      ys.push((1 - corner.y) / 2);
    }
    const rect: [number, number, number, number] = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
    if (rect[2] < 0 || rect[0] > 1 || rect[3] < 0 || rect[1] > 1) return;
    const distance = Math.hypot(
      placement.center[0] - cameraPosition[0],
      placement.center[1] - cameraPosition[1],
      placement.center[2] - cameraPosition[2],
    );
    screens.push({ id: placement.id, rect, distance, target: targets(index) });
  });
  return screens;
}

/**
 * 홀로그램 그리기와 포인터(스펙 3절 "홀로그램 상호작용").
 * - 호버: 마우스가 누를 수 있는 홀로그램 위에 오면 테두리가 밝아지고 커서가 pointer다(터치는 호버가 없다).
 * - 클릭: 짝인 상세 링크를 눌러 기존 흐름으로 연다. 누를 수 없는 칸은 메시의 레이캐스트에서 빠져 있다(hologramMeshes).
 * - 포인터를 두고 스크롤만 해도 홀로그램이 지나가고, 스크롤이 멈춘 뒤에도 카메라와 PiCKCARE 앞줄이 감쇠로 더 움직인다.
 *   그래서 마우스가 캔버스 위에 있는 동안 매 프레임 한 번, 마지막 마우스 이동 자리로 다시 레이캐스트한다(대상은 메시 하나, 11칸).
 */
function HologramScene({ atlas }: { atlas: Atlas }) {
  const meshes = useMemo(() => createHologramMeshes(atlas.texture), [atlas]);
  const front = useRef<number | null>(null);
  const hovered = useRef<number | null>(null);
  const glow = useRef(HOLOGRAMS.map(() => 0));
  /** 포인터 이벤트가 온 캔버스. 커서를 바꾼다 */
  const canvas = useRef<HTMLElement | null>(null);
  /** 캔버스 위 마지막 마우스 이동(캔버스를 떠나면 null). 스크롤 중 다시 맞추기에 쓴다 */
  const lastMove = useRef<PointerEvent | null>(null);
  /** R3F가 포인터 이벤트를 듣는 요소 */
  const connected = useThree((state) => state.events.connected as EventTarget | undefined);
  const stats = useMemo(() => statsEnabled(), []);

  const hover = (index: number | null) => {
    hovered.current = index;
    if (canvas.current) canvas.current.style.cursor = index === null ? "" : "pointer";
  };

  useEffect(() => {
    setShownHolograms(HOLOGRAMS.filter((_, index) => atlas.loaded[index]).map((hologram) => hologram.id));
    return () => {
      setShownHolograms([]);
      meshes.dispose();
      atlas.texture.dispose();
    };
  }, [atlas, meshes]);

  useFrame((state, delta) => {
    const drive = currentDrive();
    const hash = window.location.hash;
    // 상세가 열리면 모달이 캔버스를 덮어 포인터가 오지 않는다. 남은 호버를 지운다
    if (hovered.current !== null && parseJourneyHash(hash)) hover(null);
    const target = pickcareFront(drive.progress, hash);
    front.current = front.current === null ? target : damp(front.current, target, FRONT_DAMPING, delta);
    const placements = hologramsAt(drive.progress, front.current);
    const focused = getFocusedHologram();
    HOLOGRAMS.forEach((hologram, index) => {
      const lit = index === hovered.current || hologram.id === focused ? 1 : 0;
      glow.current[index] = damp(glow.current[index], lit, GLOW_DAMPING, delta);
    });
    cameraPosition[0] = state.camera.position.x;
    cameraPosition[1] = state.camera.position.y;
    cameraPosition[2] = state.camera.position.z;
    writeHolograms(meshes, placements, cameraPosition, { loaded: atlas.loaded, glow: glow.current });
    if (stats) {
      const repo = Math.min(REPO_COUNT - 1, Math.max(0, Math.round(front.current)));
      recordHolograms({
        shown: HOLOGRAMS.filter((_, index) => atlas.loaded[index]).map((hologram) => hologram.id),
        hovered: hovered.current === null ? null : HOLOGRAMS[hovered.current].id,
        glowing: HOLOGRAMS.filter((_, index) => glow.current[index] > 0.5).map((hologram) => hologram.id),
        front: HOLOGRAMS.filter((hologram) => hologram.act === 3)[repo].id,
        screens: screenRects(placements, atlas.loaded, (index) => meshes.targets[meshes.order.indexOf(index)], state.camera),
      });
    }
  });

  // 캔버스 위 마지막 마우스 이동을 직접 둔다. R3F의 lastEvent는 휠이 덮어쓰고(휠 스크롤 중 다시 맞추기가 멈춘다)
  // pointerleave가 비우지 않는다(본문 패널·창 밖으로 나가도 옛 자리로 계속 맞춘다)
  useEffect(() => {
    if (!connected) return;
    const move = (event: Event) => {
      if (event instanceof PointerEvent && event.pointerType === "mouse") lastMove.current = event;
    };
    const leave = () => {
      lastMove.current = null;
    };
    connected.addEventListener("pointermove", move);
    connected.addEventListener("pointerleave", leave);
    connected.addEventListener("pointercancel", leave);
    return () => {
      connected.removeEventListener("pointermove", move);
      connected.removeEventListener("pointerleave", leave);
      connected.removeEventListener("pointercancel", leave);
      lastMove.current = null;
    };
  }, [connected]);

  // 그린 뒤(후처리가 우선순위 1로 그린다), 마우스가 캔버스 위에 있고 상세가 닫혀 있을 때 마지막 이동 자리로 다시 맞춘다
  useFrame((state) => {
    const event = lastMove.current;
    if (!event || parseJourneyHash(window.location.hash)) return;
    state.events.handlers?.onPointerMove(event);
  }, 2);

  return (
    <>
      <primitive object={meshes.lights} />
      <primitive
        object={meshes.screens}
        onPointerMove={(event: ThreeEvent<PointerEvent>) => {
          if (event.nativeEvent.pointerType !== "mouse" || event.instanceId === undefined) return;
          event.stopPropagation();
          if (event.nativeEvent.target instanceof HTMLElement) canvas.current = event.nativeEvent.target;
          hover(hologramAt(meshes, event.instanceId));
        }}
        onPointerOut={() => hover(null)}
        onClick={(event: ThreeEvent<MouseEvent>) => {
          if (event.instanceId === undefined) return;
          event.stopPropagation();
          const index = hologramAt(meshes, event.instanceId);
          hover(null);
          openHologramDetail(HOLOGRAMS[index].linkHash);
        }}
      />
    </>
  );
}
