import { PerspectiveCamera } from "three";
import { describe, expect, it } from "vitest";
import { driveAt } from "@/lib/journey/drive";
import { appearLevel } from "@/lib/journey/landscape";
import { SCALAR_ATTRIBUTES, landscapePieces } from "@/lib/journey/landscapeBuild";
import { segmentBlocked } from "@/lib/journey/landscapeOcclusion";
import { CAMERA_FOV, rangeOf, type Vec3 } from "@/lib/journey/timeline";
import { countDraws, createLandscapeMeshes, landscapeBlocked, takeLandscapeStats, writeLandscape } from "./landscapeGeometry";
import { createLandscapeMaterial } from "./landscapeMaterial";

const pieces = landscapePieces();
const material = createLandscapeMaterial();
const meshes = createLandscapeMeshes(pieces, material);
for (const mesh of meshes) mesh.updateMatrixWorld();

describe("풍경 메시", () => {
  it("배치마다 메시 하나이고 재질 하나를 함께 쓴다", () => {
    expect(meshes.map((mesh) => mesh.name)).toEqual(pieces.map((piece) => piece.name));
    expect(new Set(meshes.map((mesh) => mesh.material))).toEqual(new Set([material]));
    expect(meshes.map((mesh) => mesh.userData.act)).toEqual([1, 2, 3, 3]);
  });

  it("투명 물체 가운데 먼저 그린다(깊이를 쓰지 않는 홀로그램 빛기둥·화면보다 앞 순서)", () => {
    for (const mesh of meshes) expect(mesh.renderOrder, mesh.name).toBe(-1);
  });

  it("지오메트리는 배치의 정점 배열을 그대로 쓰고 면 법선이 있다", () => {
    meshes.forEach((mesh, index) => {
      const piece = pieces[index];
      const geometry = mesh.geometry;
      expect(geometry.getAttribute("position").array).toBe(piece.positions);
      for (const name of SCALAR_ATTRIBUTES) expect(geometry.getAttribute(name).array, name).toBe(piece.scalars[name]);
      expect(geometry.getAttribute("aRimNormal").array).toBe(piece.rimNormals);
      expect(geometry.getAttribute("normal").count).toBe(piece.positions.length / 3);
      expect(geometry.index).toBeNull();
      expect(geometry.boundingSphere?.radius).toBeGreaterThan(0);
    });
  });

  it("실제 메시 레이캐스트가 순수 가림 판정과 같다", () => {
    // 요소 상자 가운데를 지나는 선분(대부분 막힘)과 그 위 하늘로 가는 선분(대부분 안 막힘)을 섞는다
    let blocked = 0;
    let open = 0;
    for (const piece of pieces) {
      for (const item of piece.items.filter((_, index) => index % 7 === 0)) {
        const middle: Vec3 = [(item.min[0] + item.max[0]) / 2, (item.min[1] + item.max[1]) / 2, (item.min[2] + item.max[2]) / 2];
        for (const lift of [0, 120]) {
          const from: Vec3 = [middle[0] - 60, middle[1] + lift, middle[2] + 25];
          const to: Vec3 = [middle[0] + 60, middle[1] + lift, middle[2] - 25];
          const pure = segmentBlocked(from, to, pieces);
          const scene = landscapeBlocked(meshes, from, to);
          expect(scene !== null, `${piece.name} ${lift}`).toBe(pure !== null);
          if (pure) blocked += 1;
          else open += 1;
        }
      }
    }
    expect(blocked).toBeGreaterThan(20);
    expect(open).toBeGreaterThan(20);
  });

  it("감춘 메시는 막지 않는다", () => {
    const city = meshes[2];
    const piece = pieces[2];
    const item = piece.items[0];
    const middle: Vec3 = [(item.min[0] + item.max[0]) / 2, (item.min[1] + item.max[1]) / 2, (item.min[2] + item.max[2]) / 2];
    const from: Vec3 = [middle[0] - 40, middle[1], middle[2]];
    const to: Vec3 = [middle[0] + 40, middle[1], middle[2]];
    expect(landscapeBlocked([city], from, to)).toBe(city.name);
    city.visible = false;
    expect(landscapeBlocked([city], from, to)).toBeNull();
    city.visible = true;
  });
});

function at(id: string, within: number): number {
  const range = rangeOf(id);
  return range.start + (range.end - range.start) * within;
}

describe("풍경 한 프레임", () => {
  it("uniform에 열린 끝·차 자리·엔딩을 넣고, 1막에서는 3막 메시(도시·첨탑)를 감춘다", () => {
    const drive = driveAt(at("kokoa-clone", 0.5));
    writeLandscape(meshes, material, drive);
    expect(material.uniforms.uRevealS.value).toBe(drive.revealS);
    expect(material.uniforms.uCarS.value).toBe(drive.carS);
    expect(material.uniforms.uEnding.value).toBe(drive.ending);
    expect(meshes.map((mesh) => mesh.visible)).toEqual([true, true, false, false]);
    writeLandscape(meshes, material, driveAt(at("tix2u", 0.5)));
    expect(meshes.map((mesh) => mesh.visible)).toEqual([true, true, true, true]);
    writeLandscape(meshes, material, driveAt(1));
    expect(meshes.map((mesh) => mesh.visible)).toEqual([true, true, true, true]);
  });

  it("막 경계를 건너뛰며 오가도 감춤과 uniform은 늘 그 자리의 값이다", () => {
    for (const progress of [1, 0.1, 0.62, 0.3, 0.95, 0, 0.27]) {
      const drive = driveAt(progress);
      writeLandscape(meshes, material, drive);
      expect(material.uniforms.uCarS.value, `p=${progress}`).toBe(drive.carS);
      meshes.forEach((mesh, index) => {
        expect(mesh.visible, `p=${progress} ${mesh.name}`).toBe(appearLevel(pieces[index].scalars.aAppearFrom[0], drive.carS) > 0);
      });
    }
  });

  it("통계는 지난 프레임에 그린 횟수를 내고 비우며, 지오메트리 표지는 그대로다", () => {
    countDraws(meshes);
    const camera = new PerspectiveCamera(CAMERA_FOV, 16 / 10, 0.1, 600);
    const drive = driveAt(at("act-3", 0.5));
    camera.position.set(...drive.camera.position);
    camera.lookAt(...drive.camera.target);
    camera.updateMatrixWorld();
    writeLandscape(meshes, material, drive);
    meshes[0].onAfterRender(undefined as never, undefined as never, camera, meshes[0].geometry, material, null as never);
    const first = takeLandscapeStats(meshes, drive, camera);
    expect(first.meshes.map((mesh) => mesh.calls)).toEqual([1, 0, 0, 0]);
    expect(first.camera).toEqual(drive.camera.position);
    const second = takeLandscapeStats(meshes, drive, camera);
    expect(second.meshes.map((mesh) => mesh.calls)).toEqual([0, 0, 0, 0]);
    expect(second.meshes.map((mesh) => mesh.geometry)).toEqual(first.meshes.map((mesh) => mesh.geometry));
  });

  it("3막 제목에서 첨탑의 도로 위 부분은 화면 안 길이 사라지는 곳 위에 서고, 감추면 자리가 없다", () => {
    const camera = new PerspectiveCamera(CAMERA_FOV, 16 / 10, 0.1, 600);
    const drive = driveAt(at("act-3", 0.5));
    camera.position.set(...drive.camera.position);
    camera.lookAt(...drive.camera.target);
    camera.updateMatrixWorld();
    writeLandscape(meshes, material, drive);
    const rect = takeLandscapeStats(meshes, drive, camera).spire;
    expect(rect).not.toBeNull();
    const [left, top, right, bottom] = rect ?? [0, 0, 0, 0];
    expect(left).toBeGreaterThan(0.3);
    expect(right).toBeLessThan(0.7);
    expect(top).toBeGreaterThan(0.05);
    expect(bottom).toBeLessThan(0.6);
    writeLandscape(meshes, material, driveAt(at("kokoa-clone", 0.5)));
    expect(takeLandscapeStats(meshes, drive, camera).spire).toBeNull();
  });
});
