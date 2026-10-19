import { BufferAttribute, BufferGeometry, Mesh, Raycaster, Vector3, type Camera, type Material, type ShaderMaterial } from "three";
import type { DriveState } from "@/lib/journey/drive";
import { appearLevel } from "@/lib/journey/landscape";
import { SCALAR_ATTRIBUTES, type LandscapePiece } from "@/lib/journey/landscapeBuild";
import type { Vec3 } from "@/lib/journey/timeline";
import type { LandscapeStats } from "./frameStats";

/**
 * 막별 풍경 메시(스펙 3절 "재질과 안개"). 배치의 정점 배열(lib/journey/landscapeBuild.ts)을 복사하지 않고 BufferGeometry로 감싸고
 * 면 법선만 계산한다. 지오메트리는 처음 한 번 만들고 바꾸지 않는다(매 프레임에는 재질 uniform만 바뀐다).
 */

/** 정점 배열을 그대로 쓰는 지오메트리. 인덱스 없는 삼각형이라 computeVertexNormals가 면 법선을 넣는다 */
export function landscapeGeometry(piece: LandscapePiece): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(piece.positions, 3));
  for (const name of SCALAR_ATTRIBUTES) geometry.setAttribute(name, new BufferAttribute(piece.scalars[name], 1));
  geometry.setAttribute("aRimNormal", new BufferAttribute(piece.rimNormals, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

/**
 * 풍경 메시: 이름은 배치의 이름, userData에 막 번호와 나타나기 시작하는 자리(appearFrom)를 둔다. 재질은 하나를 함께 쓴다.
 * 투명 물체 가운데 먼저 그린다(renderOrder −1). 풍경과 홀로그램 메시는 모두 원점에 있어 three가 만든 순서로 정렬하는데,
 * 홀로그램(빛기둥 0, 화면 1)은 깊이를 쓰지 않아 풍경이 나중에 그려지면 그 위를 덮는다.
 */
export function createLandscapeMeshes(pieces: readonly LandscapePiece[], material: Material): Mesh[] {
  return pieces.map((piece) => {
    const mesh = new Mesh(landscapeGeometry(piece), material);
    mesh.name = piece.name;
    mesh.renderOrder = -1;
    mesh.userData.act = piece.act;
    mesh.userData.appearFrom = piece.scalars.aAppearFrom[0];
    return mesh;
  });
}

const raycaster = new Raycaster();
const origin = new Vector3();
const direction = new Vector3();

/**
 * 보이는 풍경 메시에서 선분 from → to를 막는 메시의 이름(없으면 null). 끝점 바로 앞 margin(m)은 보지 않는다.
 * 장면의 실제 메시로 가림을 확인한다(e2e가 ?debug=stats에서 부른다). 순수 판정(landscapeOcclusion.segmentBlocked)과 같은 뜻이다.
 */
export function landscapeBlocked(meshes: readonly Mesh[], from: Vec3, to: Vec3, margin = 0.5): string | null {
  origin.set(from[0], from[1], from[2]);
  direction.set(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
  const length = direction.length();
  if (length <= margin) return null;
  raycaster.set(origin, direction.normalize());
  raycaster.near = 0;
  raycaster.far = length - margin;
  const hits = raycaster.intersectObjects(
    meshes.filter((mesh) => mesh.visible),
    false,
  );
  return hits.length > 0 ? hits[0].object.name : null;
}

/**
 * 한 프레임: 재질 uniform(열린 끝·차 자리·엔딩)을 넣고, 막 단위 등장이 0인 막(두 막 앞)의 메시를 감춘다.
 * 감춘 메시는 그리지 않아 드로콜이 줄고, 같은 재질이라 다시 보여도 셰이더를 새로 컴파일하지 않는다.
 */
export function writeLandscape(meshes: readonly Mesh[], material: ShaderMaterial, drive: DriveState): void {
  material.uniforms.uRevealS.value = drive.revealS;
  material.uniforms.uCarS.value = drive.carS;
  material.uniforms.uEnding.value = drive.ending;
  for (const mesh of meshes) mesh.visible = appearLevel(mesh.userData.appearFrom as number, drive.carS) > 0;
}

/** 메시마다 그린 횟수를 센다(?debug=stats). takeLandscapeStats가 읽고 비운다 */
export function countDraws(meshes: readonly Mesh[]): void {
  for (const mesh of meshes) {
    mesh.userData.calls = 0;
    mesh.onAfterRender = () => {
      mesh.userData.calls = (mesh.userData.calls as number) + 1;
    };
  }
}

const projected = new Vector3();

/** 첨탑에서 도로 위 정점(도로 아래 깊이 0)이 화면에서 차지하는 사각형. 카메라 뒤 정점이 있거나 감췄으면 null */
function spireRect(mesh: Mesh, camera: Camera): [number, number, number, number] | null {
  if (!mesh.visible) return null;
  const position = mesh.geometry.getAttribute("position");
  const below = mesh.geometry.getAttribute("aBelow");
  const rect: [number, number, number, number] = [Infinity, Infinity, -Infinity, -Infinity];
  for (let index = 0; index < position.count; index++) {
    if (below.getX(index) > 0) continue;
    projected.fromBufferAttribute(position, index).applyMatrix4(mesh.matrixWorld).project(camera);
    if (projected.z > 1) return null;
    const x = (projected.x + 1) / 2;
    const y = (1 - projected.y) / 2;
    rect[0] = Math.min(rect[0], x);
    rect[1] = Math.min(rect[1], y);
    rect[2] = Math.max(rect[2], x);
    rect[3] = Math.max(rect[3], y);
  }
  return rect;
}

/** 지난 프레임의 풍경 통계를 내고 그린 횟수를 비운다(?debug=stats) */
export function takeLandscapeStats(meshes: readonly Mesh[], drive: DriveState, camera: Camera): LandscapeStats {
  const spire = meshes.find((mesh) => mesh.name === "journey-landscape-spire");
  const stats: LandscapeStats = {
    meshes: meshes.map((mesh) => ({
      name: mesh.name,
      visible: mesh.visible,
      calls: (mesh.userData.calls as number | undefined) ?? 0,
      geometry: `${mesh.geometry.uuid}:${(mesh.geometry.getAttribute("position") as BufferAttribute).version}`,
    })),
    revealS: drive.revealS,
    carS: drive.carS,
    ending: drive.ending,
    camera: [camera.position.x, camera.position.y, camera.position.z],
    spire: spire ? spireRect(spire, camera) : null,
  };
  for (const mesh of meshes) mesh.userData.calls = 0;
  return stats;
}

/** 장면을 내릴 때 지오메트리와 재질을 놓는다(정점 배열은 배치가 들고 있어 다시 올릴 수 있다) */
export function disposeLandscape(meshes: readonly Mesh[], material: Material): void {
  for (const mesh of meshes) mesh.geometry.dispose();
  material.dispose();
}
