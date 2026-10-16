import { describe, expect, it } from "vitest";
import { DataArrayTexture, Matrix4, PerspectiveCamera, Raycaster, Vector2, Vector3, type Intersection } from "three";
import { HOLOGRAMS, type HologramPlacement } from "@/lib/journey/holograms";
import type { Vec3 } from "@/lib/journey/timeline";
import { createHologramMeshes, hologramAt, writeHolograms, type HologramMeshes } from "./hologramMeshes";

const index = (id: string) => HOLOGRAMS.findIndex((hologram) => hologram.id === id);

function atlas(): DataArrayTexture {
  return new DataArrayTexture(new Uint8Array(4 * 4 * 4 * HOLOGRAMS.length), 4, 4, HOLOGRAMS.length);
}

/** 모든 홀로그램을 숨긴 자리에, 주어진 홀로그램만 카메라를 향해 세운다 */
function placements(standing: Record<string, { center: Vec3; presence?: number }>): HologramPlacement[] {
  return HOLOGRAMS.map((hologram) => {
    const spot = standing[hologram.id];
    return {
      id: hologram.id,
      center: spot?.center ?? [0, -100, 0],
      facing: { kind: "camera" },
      box: [6.4, 4],
      presence: spot ? (spot.presence ?? 1) : 0,
      disc: spot ? [spot.center[0], 0, spot.center[2]] : [0, -100, 0],
      discOpacity: spot ? 1 : 0,
      colorS: 0,
    };
  });
}

const allLoaded = HOLOGRAMS.map(() => true);
const noGlow = HOLOGRAMS.map(() => 0);

/** 카메라 자리에서 target 쪽으로 쏜 광선이 처음 맞힌 홀로그램 id(없으면 null) */
function pick(meshes: HologramMeshes, from: Vec3, toward: Vec3): string | null {
  const camera = new PerspectiveCamera(50, 1.6, 0.1, 600);
  camera.position.set(...from);
  camera.lookAt(...toward);
  camera.updateMatrixWorld();
  const raycaster = new Raycaster();
  raycaster.setFromCamera(new Vector2(0, 0), camera);
  meshes.screens.updateMatrixWorld();
  const hits: Intersection[] = [];
  meshes.screens.raycast(raycaster, hits);
  hits.sort((a, b) => a.distance - b.distance);
  return hits.length > 0 && hits[0].instanceId !== undefined ? HOLOGRAMS[hologramAt(meshes, hits[0].instanceId)].id : null;
}

describe("홀로그램 메시", () => {
  it("그리는 순서가 바뀌어도 광선은 화면에 보이는 가장 가까운 홀로그램을 돌려준다", () => {
    const meshes = createHologramMeshes(atlas());
    const spots = placements({ pfplay: { center: [0, 0, -10] }, tix2u: { center: [0, 0, -20] } });
    writeHolograms(meshes, spots, [0, 0, 0], { loaded: allLoaded, glow: noGlow });
    const front = meshes.order.slice();
    expect(pick(meshes, [0, 0, 0], [0, 0, -1])).toBe("pfplay");
    writeHolograms(meshes, spots, [0, 0, -30], { loaded: allLoaded, glow: noGlow });
    expect(meshes.order).not.toEqual(front);
    expect(pick(meshes, [0, 0, -30], [0, 0, -1])).toBe("tix2u");
    meshes.dispose();
  });

  it("칸마다 층 번호·보이는 정도가 그 칸에 그린 홀로그램의 값이다", () => {
    const meshes = createHologramMeshes(atlas());
    writeHolograms(
      meshes,
      placements({ pfplay: { center: [0, 0, -10], presence: 0.7 }, stock2u: { center: [3, 0, -30] } }),
      [0, 0, 0],
      { loaded: allLoaded, glow: noGlow },
    );
    const layer = meshes.screens.geometry.getAttribute("aLayer");
    const state = meshes.screens.geometry.getAttribute("aState");
    for (let slot = 0; slot < HOLOGRAMS.length; slot++) {
      const hologram = meshes.order[slot];
      expect(layer.getX(slot)).toBe(hologram);
      const expected = hologram === index("pfplay") ? 0.7 : hologram === index("stock2u") ? 1 : 0;
      expect(state.getX(slot)).toBeCloseTo(expected, 6);
    }
    meshes.dispose();
  });

  it("코코아톡과 절반도 나타나지 않은 홀로그램은 광선에 맞지 않는다(뒤의 홀로그램이 맞는다)", () => {
    const meshes = createHologramMeshes(atlas());
    writeHolograms(
      meshes,
      placements({ "kokoa-clone": { center: [0, 0, -8] }, eutcha: { center: [0, 0, -12], presence: 0.4 }, pfplay: { center: [0, 0, -20] } }),
      [0, 0, 0],
      { loaded: allLoaded, glow: noGlow },
    );
    expect(pick(meshes, [0, 0, 0], [0, 0, -1])).toBe("pfplay");
    meshes.dispose();
  });

  it("판 가운데 그림을 두른 테두리 바깥(층 상자의 빈 자리)은 광선에 맞지 않는다", () => {
    // app(세로 화면)은 그림 폭이 상자의 약 29%라 옆이 비고, cardnews(가로로 긴 화면)는 위아래가 빈다
    const meshes = createHologramMeshes(atlas());
    writeHolograms(meshes, placements({ "pickcare/app": { center: [0, 0, -10] } }), [0, 0, 0], { loaded: allLoaded, glow: noGlow });
    expect(pick(meshes, [0, 0, 0], [0.5, 0, -10])).toBe("pickcare/app");
    expect(pick(meshes, [0, 0, 0], [2.5, 0, -10])).toBeNull();
    writeHolograms(meshes, placements({ "pickcare/cardnews": { center: [0, 0, -10] } }), [0, 0, 0], { loaded: allLoaded, glow: noGlow });
    expect(pick(meshes, [0, 0, 0], [0, 0.5, -10])).toBe("pickcare/cardnews");
    expect(pick(meshes, [0, 0, 0], [0, 2, -10])).toBeNull();
    meshes.dispose();
  });

  it("빈 자리 뒤에 있는 홀로그램은 앞 판의 빈 자리를 지나 맞는다", () => {
    const meshes = createHologramMeshes(atlas());
    writeHolograms(
      meshes,
      placements({ "pickcare/app": { center: [0, 0, -10] }, "pickcare/studio": { center: [2.5, 0, -14] } }),
      [0, 0, 0],
      { loaded: allLoaded, glow: noGlow },
    );
    expect(pick(meshes, [0, 0, 0], [2.5, 0, -14])).toBe("pickcare/studio");
    meshes.dispose();
  });

  it("층을 받지 못한 홀로그램은 화면을 숨기고 원반은 남긴다", () => {
    const meshes = createHologramMeshes(atlas());
    const loaded = HOLOGRAMS.map((hologram) => hologram.id !== "pfplay");
    writeHolograms(meshes, placements({ pfplay: { center: [0, 0, -10] } }), [0, 0, 0], { loaded, glow: noGlow });
    expect(pick(meshes, [0, 0, 0], [0, 0, -1])).toBeNull();
    const slot = meshes.order.indexOf(index("pfplay"));
    expect(meshes.screens.geometry.getAttribute("aState").getX(slot)).toBe(0);
    const lights = meshes.lights.geometry.getAttribute("aState");
    expect(lights.getX(2 * index("pfplay"))).toBe(0);
    expect(lights.getX(2 * index("pfplay") + 1)).toBe(1);
    meshes.dispose();
  });

  it("화면은 카메라를 향하고 여백만큼 큰 판이다", () => {
    const meshes = createHologramMeshes(atlas());
    writeHolograms(meshes, placements({ pfplay: { center: [0, 0, -10] } }), [0, 0, 0], { loaded: allLoaded, glow: noGlow });
    const slot = meshes.order.indexOf(index("pfplay"));
    const matrix = new Matrix4();
    meshes.screens.getMatrixAt(slot, matrix);
    const [x, y, z] = [new Vector3(), new Vector3(), new Vector3()];
    matrix.extractBasis(x, y, z);
    expect(z.normalize().z).toBeCloseTo(1, 6);
    expect(x.length()).toBeGreaterThan(6.4);
    expect(y.length()).toBeGreaterThan(4);
    meshes.dispose();
  });
});
