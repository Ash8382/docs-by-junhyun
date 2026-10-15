import { describe, expect, it } from "vitest";
import { InstancedMesh, Mesh, type Material } from "three";
import { columnInstances, plinthInstances, ribInstances, wallFrameInstances } from "@/lib/journey/corridor";
import { buildCorridor, disposeCorridor } from "./buildCorridor";

function meshes(group: ReturnType<typeof buildCorridor>): Mesh[] {
  const list: Mesh[] = [];
  group.traverse((object) => {
    if (object instanceof Mesh) list.push(object);
  });
  return list;
}

describe("회랑 장면 객체", () => {
  it("모든 부재가 렌더 단계 재질로 그려진다", () => {
    const all = meshes(buildCorridor());
    // 바닥, 벽 둘, 전시실 바닥, 고리 지붕, 인스턴스 셋. 전시실에는 벽이 없다(우주가 보이게)
    expect(all).toHaveLength(8);
    for (const mesh of all) expect((mesh.material as Material).customProgramCacheKey()).toBe("journey-stage");
  });

  it("문틀·액자, 받침대·기둥, 단을 인스턴스로 한 번씩 그린다", () => {
    const counts = meshes(buildCorridor())
      .filter((mesh): mesh is InstancedMesh => mesh instanceof InstancedMesh)
      .map((mesh) => mesh.count);
    expect(counts).toEqual([
      ribInstances().length + wallFrameInstances().length,
      plinthInstances().length + columnInstances().length,
      1,
    ]);
  });

  it("떠날 때 모든 도형과 재질을 놓는다", () => {
    const group = buildCorridor();
    const disposed = new Set<unknown>();
    for (const mesh of meshes(group)) {
      mesh.geometry.addEventListener("dispose", () => disposed.add(mesh.geometry));
      (mesh.material as Material).addEventListener("dispose", () => disposed.add(mesh.material));
    }
    disposeCorridor(group);
    for (const mesh of meshes(group)) {
      expect(disposed.has(mesh.geometry)).toBe(true);
      expect(disposed.has(mesh.material)).toBe(true);
    }
  });
});
