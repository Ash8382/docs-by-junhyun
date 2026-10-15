import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  Quaternion,
  Vector3,
  type Material,
} from "three";
import {
  columnInstances,
  daisInstance,
  floorStrip,
  hallFloor,
  hallRoof,
  plinthInstances,
  ribInstances,
  wallFrameInstances,
  wallStrip,
  type Instance,
  type MeshData,
} from "@/lib/journey/corridor";
import { createStageMaterial, type StageLook } from "./stageMaterial";

/** 완성품 단계(3막)의 재질. 1막·2막에 선 부재는 렌더 단계 셰이더가 청사진·클레이로 그린다 */
export const LOOKS = {
  floor: { color: "#c2b8a6", roughness: 0.4, metalness: 0 },
  /** 회랑 벽. 청사진 단계에서는 선만 남아 그 너머로 우주가 보인다 */
  wall: { color: "#efe7da", roughness: 0.85, metalness: 0, hollowWire: true },
  /** 고리 천장은 전시실 안(아래)과 엔딩(위)에서 모두 보인다 */
  roof: { color: "#e6dccb", roughness: 0.8, metalness: 0, side: DoubleSide },
  /** 문틀·액자. 청사진 단계에서 면 전체가 선처럼 빛난다 */
  trim: { color: "#d8c9ae", roughness: 0.6, metalness: 0, solidLine: true },
  stone: { color: "#d8c9ae", roughness: 0.55, metalness: 0 },
  accent: { color: "#c46a43", roughness: 0.55, metalness: 0 },
} satisfies Record<string, StageLook>;

function geometryOf(data: MeshData): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(data.positions, 3));
  geometry.setAttribute("normal", new BufferAttribute(data.normals, 3));
  geometry.setAttribute("uv", new BufferAttribute(data.uvs, 2));
  geometry.setIndex(new BufferAttribute(data.indices, 1));
  return geometry;
}

const UP = new Vector3(0, 1, 0);

function instanced(geometry: BufferGeometry, material: Material, list: Instance[]): InstancedMesh {
  const mesh = new InstancedMesh(geometry, material, list.length);
  const matrix = new Matrix4();
  const rotation = new Quaternion();
  const position = new Vector3();
  const scale = new Vector3();
  list.forEach((item, index) => {
    rotation.setFromAxisAngle(UP, item.rotationY);
    matrix.compose(position.set(...item.position), rotation, scale.set(...item.scale));
    mesh.setMatrixAt(index, matrix);
  });
  return mesh;
}

/** 회랑과 전시실 전체. 장면이 한 번 만들어 그리고, 떠날 때 disposeCorridor로 GPU 자원을 놓는다 */
export function buildCorridor(): Group {
  const materials = {
    floor: createStageMaterial(LOOKS.floor),
    wall: createStageMaterial(LOOKS.wall),
    roof: createStageMaterial(LOOKS.roof),
    trim: createStageMaterial(LOOKS.trim),
    stone: createStageMaterial(LOOKS.stone),
    accent: createStageMaterial(LOOKS.accent),
  };
  // 크기 1인 상자·원기둥을 인스턴스마다 늘려 세운다
  const box = new BoxGeometry(1, 1, 1);
  const cylinder = new CylinderGeometry(1, 1, 1, 32);
  const group = new Group();
  group.add(
    new Mesh(geometryOf(floorStrip()), materials.floor),
    new Mesh(geometryOf(wallStrip(-1)), materials.wall),
    new Mesh(geometryOf(wallStrip(1)), materials.wall),
    new Mesh(geometryOf(hallFloor()), materials.floor),
    new Mesh(geometryOf(hallRoof()), materials.roof),
    instanced(box, materials.trim, [...ribInstances(), ...wallFrameInstances()]),
    instanced(cylinder, materials.stone, [...plinthInstances(), ...columnInstances()]),
    instanced(cylinder, materials.accent, [daisInstance()]),
  );
  return group;
}

export function disposeCorridor(group: Group): void {
  group.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    object.geometry.dispose();
    (object.material as Material).dispose();
  });
}
