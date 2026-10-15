import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { BASIS_PATH, CAR_LIGHT_MATERIALS, CAR_URL, DRACO_PATH } from "./carAsset";

/** scripts/build-car.ts가 만든 모델 파일을 확인한다. public/ 아래 경로는 주소와 같다 */
const PUBLIC = path.join(process.cwd(), "public");
const gltfPath = path.join(PUBLIC, CAR_URL);
const gltf = JSON.parse(readFileSync(gltfPath, "utf8")) as {
  nodes: { name?: string }[];
  materials: { name: string; alphaMode?: string; extensions?: Record<string, unknown> }[];
  images: { uri: string }[];
  buffers: { uri: string }[];
  extensionsUsed: string[];
  extensionsRequired: string[];
};

describe("차 모델 파일", () => {
  it("Khronos 로고 노드와 텍스처가 없다", () => {
    const names = gltf.nodes.map((node) => node.name);
    expect(names).not.toContain("License Plate");
    expect(names).not.toContain("InteriorSteeringEmblem");
    expect(gltf.images.map((image) => image.uri).filter((uri) => /khronos/i.test(uri))).toEqual([]);
  });

  it("재질 변형과 유리 투과가 없고 Draco·KTX2만 필수 확장이다", () => {
    expect(gltf.extensionsUsed).not.toContain("KHR_materials_variants");
    expect(gltf.extensionsUsed).not.toContain("KHR_materials_transmission");
    expect([...gltf.extensionsRequired].sort()).toEqual(["KHR_draco_mesh_compression", "KHR_texture_basisu"]);
    expect(gltf.materials.find((material) => material.name === "Glass")?.alphaMode).toBe("BLEND");
  });

  it("장면이 바꾸는 불빛 재질이 있다", () => {
    const names = gltf.materials.map((material) => material.name);
    expect(names).toContain(CAR_LIGHT_MATERIALS.head);
    expect(names).toContain(CAR_LIGHT_MATERIALS.tail);
  });

  it("가리키는 파일이 모두 있고, 쓰지 않는 파일은 없다", () => {
    const folder = path.dirname(gltfPath);
    const referenced = [...gltf.buffers.map((buffer) => buffer.uri), ...gltf.images.map((image) => image.uri)];
    for (const uri of referenced) expect(existsSync(path.join(folder, uri)), uri).toBe(true);
    expect(readdirSync(folder).sort()).toEqual([path.basename(gltfPath), ...referenced].sort());
  });

  it("전체 크기는 3.5MB 이하다", () => {
    const folder = path.dirname(gltfPath);
    const total = readdirSync(folder).reduce((sum, name) => sum + statSync(path.join(folder, name)).size, 0);
    expect(total).toBeLessThan(3.5 * 1024 * 1024);
  });

  it("Draco·Basis 디코더가 public/에 있다", () => {
    for (const file of [
      path.join(DRACO_PATH, "draco_wasm_wrapper.js"),
      path.join(DRACO_PATH, "draco_decoder.wasm"),
      path.join(BASIS_PATH, "basis_transcoder.js"),
      path.join(BASIS_PATH, "basis_transcoder.wasm"),
    ]) {
      expect(existsSync(path.join(PUBLIC, file)), file).toBe(true);
    }
  });
});
