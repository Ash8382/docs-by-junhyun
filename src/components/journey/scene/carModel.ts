import { Box3, Color, Group, Matrix4, Mesh, Quaternion, Vector3, type BufferGeometry, type Material, type MeshStandardMaterial, type Object3D } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { CAR_LIGHT_INTENSITY, CAR_LIGHT_MATERIALS } from "@/lib/journey/carAsset";
import type { DriveState } from "@/lib/journey/drive";
import { HEADLIGHT_HEX, carLightLevel, hexToLinear, trailColor } from "@/lib/journey/trail";

/**
 * 차 모델을 장면에 맞게 준비한다. glTF 부품(약 100개)을 재질별로 합쳐 드로콜을 재질 수 남짓(18)으로 줄이고,
 * 바퀴 바닥이 y = 0에 닿게 올리고, 불빛 재질(헤드라이트·테일라이트)을 찾아 둔다.
 * 바퀴는 돌지 않으므로(주행 시뮬레이션 없음) 합쳐도 된다.
 */

export interface PreparedCar {
  object: Group;
  headlights: MeshStandardMaterial[];
  taillights: MeshStandardMaterial[];
  dispose(): void;
}

function isMesh(object: Object3D): object is Mesh<BufferGeometry, Material> {
  return (object as Mesh).isMesh === true && !Array.isArray((object as Mesh).material);
}

/** 같은 재질이고 정점 속성 구성이 같은 메시끼리 합친다(속성이 다르면 합칠 수 없다) */
export function prepareCar(scene: Object3D): PreparedCar {
  scene.updateMatrixWorld(true);
  const toRoot = new Matrix4().copy(scene.matrixWorld).invert();
  const groups = new Map<string, { material: Material; geometries: BufferGeometry[] }>();
  scene.traverse((child) => {
    if (!isMesh(child)) return;
    const geometry = child.geometry.clone();
    geometry.applyMatrix4(new Matrix4().multiplyMatrices(toRoot, child.matrixWorld));
    const key = `${child.material.uuid}|${Object.keys(geometry.attributes).sort().join(",")}|${geometry.index ? "i" : "n"}`;
    const group = groups.get(key) ?? { material: child.material, geometries: [] };
    group.geometries.push(geometry);
    groups.set(key, group);
  });
  const object = new Group();
  object.name = "journey-car-model";
  const merged: BufferGeometry[] = [];
  const bounds = new Box3();
  for (const { material, geometries } of groups.values()) {
    const geometry = mergeGeometries(geometries, false);
    for (const part of geometries) part.dispose();
    if (!geometry) throw new Error(`차 부품을 합치지 못했습니다(재질 ${material.name})`);
    geometry.computeBoundingBox();
    if (geometry.boundingBox) bounds.union(geometry.boundingBox);
    merged.push(geometry);
    object.add(new Mesh(geometry, material));
  }
  // 모델 원점은 바퀴 중심 높이 근처라 바퀴가 노면 아래로 들어간다. 가장 낮은 점(타이어 바닥)을 노면에 맞춘다.
  for (const geometry of merged) geometry.translate(0, -bounds.min.y, 0);
  const byName = (name: string) =>
    [...groups.values()].map((group) => group.material).filter((material) => material.name === name) as MeshStandardMaterial[];
  const headlights = byName(CAR_LIGHT_MATERIALS.head);
  const taillights = byName(CAR_LIGHT_MATERIALS.tail);
  if (headlights.length === 0 || taillights.length === 0) throw new Error("차 모델에 불빛 재질이 없습니다");
  return {
    object,
    headlights,
    taillights,
    dispose: () => merged.forEach((geometry) => geometry.dispose()),
  };
}

const HEADLIGHT = new Color(...hexToLinear(HEADLIGHT_HEX));
const basis = new Matrix4();
const rotation = new Quaternion();
const right = new Vector3();
const up = new Vector3();
const forward = new Vector3();

/** 차(모델·실루엣) 자리를 진행 상태의 차 자세로 놓는다. glTF 차는 +Z가 앞, +X가 왼쪽이다 */
export function placeCar(object: Object3D, state: DriveState): void {
  const { car } = state;
  right.set(-car.right[0], -car.right[1], -car.right[2]);
  up.set(...car.up);
  forward.set(...car.tangent);
  object.quaternion.copy(rotation.setFromRotationMatrix(basis.makeBasis(right, up, forward)));
  object.position.set(...car.position);
}

/** 불빛 색과 세기: 헤드라이트는 늘 주황, 테일라이트는 지금 자리의 궤적 색. 엔딩에서 낮춘다 */
export function applyCarLights(
  headlights: { emissive: Color; emissiveIntensity: number }[],
  taillights: { emissive: Color; emissiveIntensity: number }[],
  state: DriveState,
): void {
  const level = carLightLevel(state.ending);
  for (const material of headlights) {
    material.emissive.copy(HEADLIGHT);
    material.emissiveIntensity = CAR_LIGHT_INTENSITY.head * level;
  }
  const tail = trailColor(state.carS);
  for (const material of taillights) {
    material.emissive.setRGB(tail[0], tail[1], tail[2]);
    material.emissiveIntensity = CAR_LIGHT_INTENSITY.tail * level;
  }
}
