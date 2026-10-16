import {
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  PlaneGeometry,
  Vector3,
  type DataArrayTexture,
  type Intersection,
  type Raycaster,
  type Vector2,
} from "three";
import {
  HOLOGRAMS,
  LAYER,
  drawOrder,
  isPointerTarget,
  layerRect,
  placementBasis,
  screenBasis,
  sourceSize,
  type HologramPlacement,
} from "@/lib/journey/holograms";
import type { Vec3 } from "@/lib/journey/timeline";
import { trailColor } from "@/lib/journey/trail";
import { FRAME_BORDER, FRAME_MARGIN, createLightMaterial, createScreenMaterial } from "./hologramMaterial";

/**
 * 홀로그램 인스턴스 메시 2개(스펙 3절 "그리기"): 화면 + 테두리(홀로그램마다 한 칸), 빛기둥 + 원반(홀로그램마다 두 칸).
 * 매 프레임 writeHolograms가 hologramsAt의 자리를 칸 값으로 옮긴다. 셰이더는 다시 컴파일하지 않는다.
 * 화면은 반투명이 겹치므로 먼 것부터 칸에 넣고(drawOrder), 칸 k의 홀로그램 번호를 order[k]에 둔다.
 * 레이캐스트의 instanceId(칸)는 hologramAt으로 홀로그램 번호로 되돌린다. 칸 값과 순서표는 같은 호출에서 함께 바뀐다.
 */

const COUNT = HOLOGRAMS.length;
/** 원반 반지름(m)과 노면에서 띄운 높이 */
const DISC_RADIUS = 0.9;
const DISC_LIFT = 0.02;
/** 빛기둥 폭: 층 상자 폭에 곱한다 */
const BEAM_WIDTH = 0.35;

/** 층 안 그림 영역(층 비율: 왼쪽, 위에서 잰 위쪽, 폭, 높이). 홀로그램마다 한 번 계산한다 */
const RECTS = HOLOGRAMS.map((hologram) => {
  const size = sourceSize(hologram);
  const rect = layerRect(size.width, size.height);
  return [rect.x / LAYER.width, rect.y / LAYER.height, rect.width / LAYER.width, rect.height / LAYER.height] as const;
});

export interface HologramFrame {
  /** 층을 받은 홀로그램. 받지 못한 홀로그램은 화면·테두리·빛기둥을 숨기고 원반만 남긴다 */
  loaded: readonly boolean[];
  /** 홀로그램마다 테두리가 밝아진 정도(0 쉬는 때 ~ 1 호버·포커스) */
  glow: readonly number[];
}

export interface HologramMeshes {
  screens: InstancedMesh;
  lights: InstancedMesh;
  /** 칸 k에 그린 홀로그램 번호(먼 것부터) */
  order: number[];
  /** 칸 k를 누를 수 있는가(그 프레임의 자리와 층 상태로 정한다) */
  targets: boolean[];
  dispose(): void;
}

function attribute(size: number, count: number): InstancedBufferAttribute {
  return new InstancedBufferAttribute(new Float32Array(size * count), size);
}

export function createHologramMeshes(atlas: DataArrayTexture): HologramMeshes {
  const screenGeometry = new PlaneGeometry(1, 1);
  screenGeometry.setAttribute("aLayer", attribute(1, COUNT));
  screenGeometry.setAttribute("aRect", attribute(4, COUNT));
  screenGeometry.setAttribute("aBox", attribute(2, COUNT));
  screenGeometry.setAttribute("aColor", attribute(3, COUNT));
  screenGeometry.setAttribute("aState", attribute(2, COUNT));
  const screens = new InstancedMesh(screenGeometry, createScreenMaterial(atlas), COUNT);
  screens.name = "journey-holograms";
  // 칸이 매 프레임 움직여 경계 구가 맞지 않는다. 그리기는 늘 하고(11칸), 레이캐스트용 경계 구는 쓸 때 다시 잰다
  screens.frustumCulled = false;
  screens.renderOrder = 1;

  const lightGeometry = new PlaneGeometry(1, 1);
  lightGeometry.setAttribute("aColor", attribute(3, COUNT * 2));
  lightGeometry.setAttribute("aState", attribute(2, COUNT * 2));
  const lights = new InstancedMesh(lightGeometry, createLightMaterial(), COUNT * 2);
  lights.frustumCulled = false;

  const meshes: HologramMeshes = {
    screens,
    lights,
    order: HOLOGRAMS.map((_, index) => index),
    targets: HOLOGRAMS.map(() => false),
    dispose: () => {
      screenGeometry.dispose();
      lightGeometry.dispose();
      (screens.material as { dispose(): void }).dispose();
      (lights.material as { dispose(): void }).dispose();
    },
  };
  // 누를 수 없는 칸(코코아톡, 절반도 나타나지 않음, 층 실패)은 광선에 맞지 않게 한다. 그래서 호버·커서·클릭이 모두 없다.
  // 판의 빈 자리(그림을 두른 테두리 바깥)도 맞지 않아, 뒤에 보이는 홀로그램을 가리지 않는다
  const raycast = screens.raycast.bind(screens);
  screens.raycast = (raycaster: Raycaster, intersects: Intersection[]) => {
    const hits: Intersection[] = [];
    raycast(raycaster, hits);
    for (const hit of hits) {
      if (hit.instanceId !== undefined && meshes.targets[hit.instanceId] && withinFrame(screenGeometry, hit.instanceId, hit.uv)) {
        intersects.push(hit);
      }
    }
  };
  return meshes;
}

/**
 * 광선이 맞은 판의 점(uv)이 그림을 두른 테두리 선 안쪽인가. 판은 층 상자에 여백을 더한 크기라, 상자보다 좁거나 낮은 그림
 * (세로 화면 app, 가로로 긴 cardnews 등)은 옆이나 위아래가 비어 있다. 셰이더(hologramMaterial)의 테두리 자리와 같은 식이다
 */
function withinFrame(geometry: PlaneGeometry, slot: number, uv: Vector2 | undefined): boolean {
  if (!uv) return false;
  const rect = geometry.getAttribute("aRect") as InstancedBufferAttribute;
  const box = geometry.getAttribute("aBox") as InstancedBufferAttribute;
  const presence = (geometry.getAttribute("aState") as InstancedBufferAttribute).getX(slot);
  const [boxWidth, boxHeight] = [box.getX(slot), box.getY(slot)];
  const margin = FRAME_MARGIN * presence;
  const [left, top, width, height] = [rect.getX(slot), rect.getY(slot), rect.getZ(slot), rect.getW(slot)];
  // 판 가운데 기준 좌표(m)와 그림 가운데. 층의 행은 위에서 아래로 센다
  const x = (uv.x - 0.5) * (boxWidth + 2 * margin);
  const y = (uv.y - 0.5) * (boxHeight + 2 * margin);
  const centerX = (left + width / 2 - 0.5) * boxWidth;
  const centerY = (0.5 - top - height / 2) * boxHeight;
  const reach = 0.8 * margin + FRAME_BORDER * presence;
  return Math.abs(x - centerX) <= (width * boxWidth) / 2 + reach && Math.abs(y - centerY) <= (height * boxHeight) / 2 + reach;
}

/** 레이캐스트의 칸 번호를 홀로그램 번호로 되돌린다 */
export function hologramAt(meshes: HologramMeshes, instanceId: number): number {
  return meshes.order[instanceId];
}

const HIDDEN: { right: Vec3; up: Vec3; normal: Vec3 } = { right: [1, 0, 0], up: [0, 1, 0], normal: [0, 0, 1] };
const matrix = new Matrix4();
const axisX = new Vector3();
const axisY = new Vector3();
const axisZ = new Vector3();

function place(mesh: InstancedMesh, slot: number, right: Vec3, up: Vec3, normal: Vec3, center: Vec3, width: number, height: number): void {
  matrix.makeBasis(
    axisX.set(...right).multiplyScalar(width),
    axisY.set(...up).multiplyScalar(height),
    axisZ.set(...normal),
  );
  matrix.setPosition(...center);
  mesh.setMatrixAt(slot, matrix);
}

/** 한 프레임의 자리를 칸 값으로 옮긴다. camera는 실제 카메라 자리(2·3막 화면이 향한다) */
export function writeHolograms(meshes: HologramMeshes, placements: readonly HologramPlacement[], camera: Vec3, frame: HologramFrame): void {
  const { screens, lights } = meshes;
  const layer = screens.geometry.getAttribute("aLayer") as InstancedBufferAttribute;
  const rect = screens.geometry.getAttribute("aRect") as InstancedBufferAttribute;
  const box = screens.geometry.getAttribute("aBox") as InstancedBufferAttribute;
  const color = screens.geometry.getAttribute("aColor") as InstancedBufferAttribute;
  const state = screens.geometry.getAttribute("aState") as InstancedBufferAttribute;
  const lightColor = lights.geometry.getAttribute("aColor") as InstancedBufferAttribute;
  const lightState = lights.geometry.getAttribute("aState") as InstancedBufferAttribute;
  const order = drawOrder(
    placements.map((placement) => placement.center),
    camera,
  );
  order.forEach((index, slot) => {
    const placement = placements[index];
    const presence = frame.loaded[index] ? placement.presence : 0;
    const visible = presence > 0;
    // 숨긴 칸은 크기 0으로 둔다(방향을 계산하지 않는다)
    const { right, up, normal } = visible ? placementBasis(placement, camera) : HIDDEN;
    const margin = 2 * FRAME_MARGIN * presence;
    place(screens, slot, right, up, normal, placement.center, visible ? placement.box[0] + margin : 0, visible ? placement.box[1] + margin : 0);
    layer.setX(slot, index);
    rect.setXYZW(slot, ...RECTS[index]);
    box.setXY(slot, Math.max(placement.box[0], 1e-3), Math.max(placement.box[1], 1e-3));
    color.setXYZ(slot, ...trailColor(placement.colorS));
    state.setXY(slot, presence, frame.glow[index]);
    meshes.order[slot] = index;
    meshes.targets[slot] = isPointerTarget(HOLOGRAMS[index], placement, frame.loaded[index]);

    // 빛기둥: 원반에서 화면 아래끝까지, 카메라를 향하는 띠
    const bottom: Vec3 = [
      placement.center[0] - up[0] * (placement.box[1] / 2),
      placement.center[1] - up[1] * (placement.box[1] / 2),
      placement.center[2] - up[2] * (placement.box[1] / 2),
    ];
    const rise: Vec3 = [bottom[0] - placement.disc[0], bottom[1] - placement.disc[1], bottom[2] - placement.disc[2]];
    const height = Math.hypot(...rise);
    const middle: Vec3 = [(bottom[0] + placement.disc[0]) / 2, (bottom[1] + placement.disc[1]) / 2, (bottom[2] + placement.disc[2]) / 2];
    const beam = screenBasis(middle, camera, true);
    const along: Vec3 = height > 1e-6 ? [rise[0] / height, rise[1] / height, rise[2] / height] : [0, 1, 0];
    const beamVisible = visible && height > 1e-3;
    place(lights, 2 * index, beam.right, along, beam.normal, middle, beamVisible ? placement.box[0] * BEAM_WIDTH : 0, beamVisible ? height : 0);
    lightColor.setXYZ(2 * index, ...trailColor(placement.colorS));
    lightState.setXY(2 * index, presence, 0);

    // 원반: 노면 높이에 눕힌 고리. 홀로그램이 내려가거나 층을 받지 못해도 남는다
    const disc: Vec3 = [placement.disc[0], placement.disc[1] + DISC_LIFT, placement.disc[2]];
    const discSize = placement.discOpacity > 0 ? 2 * DISC_RADIUS : 0;
    place(lights, 2 * index + 1, [1, 0, 0], [0, 0, -1], [0, 1, 0], disc, discSize, discSize);
    lightColor.setXYZ(2 * index + 1, ...trailColor(placement.colorS));
    lightState.setXY(2 * index + 1, placement.discOpacity, 1);
  });
  for (const changed of [layer, rect, box, color, state, lightColor, lightState]) changed.needsUpdate = true;
  screens.instanceMatrix.needsUpdate = true;
  lights.instanceMatrix.needsUpdate = true;
  // 레이캐스트는 경계 구로 먼저 거른다. 칸이 움직였으니 다음 레이캐스트에서 다시 재게 한다
  screens.boundingSphere = null;
}
