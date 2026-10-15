import { createHash } from "node:crypto";
import { copyFile, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * 여정의 차 모델(스펙 3절 "차")을 만든다. Khronos glTF Sample Assets의 Car Concept 웹용 압축본(Draco + KTX2)을
 * 고정 커밋에서 받아 다음을 고친 뒤 public/journey/car/에 쓴다.
 *   1. 재질 변형 중 다크 메탈릭(Torched Graphite)만 남기고 변형 확장을 지운다.
 *   2. Khronos 로고(상표)를 뺀다: 번호판·운전대 엠블럼 노드를 지우고, 패널·휠 재질의 로고 발광 텍스처를 뗀다.
 *   3. 창 너머로만 보이는 실내 재질 여섯을 하나로 합친다(텍스처 없는 어두운 재질). 장면이 재질별로 메시를 합쳐 그리므로 드로콜이 준다.
 *   4. 유리의 투과(transmission)를 가벼운 반투명으로 바꾼다. 투과 재질은 불투명 물체를 한 번 더 그리는 패스를 만들어
 *      드로콜이 약 19개 늘고(측정 62~68 → 43~49), 성능 예산(최대 60)을 넘는다.
 *   5. 세기가 0인 가림(occlusion) 텍스처를 떼고, 아무도 쓰지 않는 재질·텍스처·이미지를 지운다.
 * Draco·Basis 디코더는 three에 들어 있는 파일을 public/journey/decoders/로 복사한다(CDN을 쓰지 않는다).
 *
 * 원본: https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/CarConcept
 * © 2024 Darmstadt Graphics Group GmbH, Eric Chadwick, CC BY 4.0 (페이지 엔딩에 출처와 수정 사실을 적는다)
 *
 * 사용법: npm run build:car
 */
const COMMIT = "7d4ba189827916452eeadc82d4b712dbc6280a6f";
const SOURCE = `https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/${COMMIT}/Models/CarConcept/glTF-KTX-BasisU-Draco/`;
const OUTPUT = "public/journey/car";
const DECODERS = "public/journey/decoders";
const VARIANT = "Torched Graphite";
const LOGO_NODES = ["License Plate", "InteriorSteeringEmblem"];
const LOGO_IMAGE = "Khronos_C.ktx2";
const INTERIOR_MATERIALS = ["Interior 1", "Interior 2", "Interior 3 Graphite", "Floormat", "Hardware", "Dashboard"];

/** 받은 파일이 고정 커밋의 파일과 같은지 확인한다(sha256) */
const SHA256: Record<string, string> = {
  "CarConcept.gltf": "8bdd76afb00f6b430a0bfb4112ecf67c3c6307d27ebd8298ab92047aefca6cfd",
  "CarConcept.data.bin": "157d1a7ba13b1aa512db25c36cb805c95ec5a96709e9de1a5fa084dd7487658e",
  "Dash_E.ktx2": "f9b0811444153459ca28d9211bf8cb6fbe97665071e6257b8c5b56b0edaef525",
  "Dot_C.ktx2": "08968e9d7d9855ae8d201cfaea889e2748fc9049a95838aa18ce689d29c041ca",
  "Dot_N.ktx2": "4a10cfb6134015d6897264fa7e52bc08acb41cd77b64f65726cb6716616b679e",
  "Hex_N.ktx2": "5b1949805e65f218f4bddd0bcce889f45d195db4f8d33eb77244524d134b9ec1",
  "Khronos_C.ktx2": "627acc26f726e7539967cd27f7b9ca5f84c327e5408b870243b45a49c600e62e",
  "Mechanical_N.ktx2": "341db23ec51698720db958677c27def788e8a7e297c7eb05d9f9677b3fbfd693",
  "Mechanical_ORM.ktx2": "e38d981fe93ea6d0d95137a968b141e3919938addf4f1236b1fd6fe0e8b006d6",
  "Occlusion.ktx2": "905008376f6701af044e11f15cbc35abad7fa92300b3be6e8c9346fa3a4926b0",
  "Powdercoat_N.ktx2": "518dce1ade4f1d354ffd8d804bb01a899054af909eb70fe6655372e4414d4753",
  "Rib_N.ktx2": "7bbd1d7776a087b48d3f7d50395d24840fd00dc5ab2622f8dce5685995df94d3",
  "Thickness.ktx2": "6cf5fefa01ce9817f207a72536717cc491f0f2534df236f05e92596546d20722",
  "Tireside_C.ktx2": "d90617659d164fd126d08061cf962aecd43b6f73990ffa3874094a4f3e022935",
  "Tireside_N.ktx2": "a0379569aef88f88e7b43faf17c93469affbd4bfdd9c923e30136e40b4b451c1",
  "Tiretread_N.ktx2": "4abedc34a3ecde5d14e232d2b3c8a59c42d55bab60ae854aaf11230dbc981f69",
};

/** three r181에 들어 있는 디코더. Draco는 WebAssembly 판(래퍼 + wasm)만 쓴다 */
const DECODER_FILES = [
  ["node_modules/three/examples/jsm/libs/draco/gltf/draco_wasm_wrapper.js", "draco/draco_wasm_wrapper.js"],
  ["node_modules/three/examples/jsm/libs/draco/gltf/draco_decoder.wasm", "draco/draco_decoder.wasm"],
  ["node_modules/three/examples/jsm/libs/basis/basis_transcoder.js", "basis/basis_transcoder.js"],
  ["node_modules/three/examples/jsm/libs/basis/basis_transcoder.wasm", "basis/basis_transcoder.wasm"],
];

interface TextureRef {
  index: number;
  [key: string]: unknown;
}

interface Material {
  name: string;
  emissiveTexture?: TextureRef;
  emissiveFactor?: number[];
  occlusionTexture?: TextureRef & { strength?: number };
  normalTexture?: TextureRef;
  pbrMetallicRoughness?: { baseColorTexture?: TextureRef; metallicRoughnessTexture?: TextureRef; [key: string]: unknown };
  extensions?: Record<string, Record<string, unknown>>;
  [key: string]: unknown;
}

interface Primitive {
  material?: number;
  extensions?: { KHR_materials_variants?: { mappings: { material: number; variants: number[] }[] }; [key: string]: unknown };
  [key: string]: unknown;
}

interface Gltf {
  scenes: { nodes: number[] }[];
  nodes: { name?: string; mesh?: number; children?: number[]; [key: string]: unknown }[];
  meshes: { name?: string; primitives: Primitive[] }[];
  materials: Material[];
  textures: { source?: number; extensions?: { KHR_texture_basisu?: { source: number } }; [key: string]: unknown }[];
  images: { uri: string }[];
  extensionsUsed?: string[];
  extensions?: Record<string, unknown>;
  [key: string]: unknown;
}

async function download(name: string): Promise<Buffer> {
  const response = await fetch(SOURCE + encodeURIComponent(name));
  if (!response.ok) throw new Error(`${name}을 받지 못했습니다: ${response.status}`);
  const data = Buffer.from(await response.arrayBuffer());
  const hash = createHash("sha256").update(data).digest("hex");
  if (hash !== SHA256[name]) throw new Error(`${name}이 고정 커밋의 파일과 다릅니다(${hash})`);
  return data;
}

/** 재질 하나가 가리키는 텍스처 참조 전부 */
function textureRefs(material: Material): TextureRef[] {
  const refs: (TextureRef | undefined)[] = [
    material.emissiveTexture,
    material.occlusionTexture,
    material.normalTexture,
    material.pbrMetallicRoughness?.baseColorTexture,
    material.pbrMetallicRoughness?.metallicRoughnessTexture,
  ];
  for (const extension of Object.values(material.extensions ?? {})) {
    for (const value of Object.values(extension)) {
      if (value && typeof value === "object" && "index" in value) refs.push(value as TextureRef);
    }
  }
  return refs.filter((ref): ref is TextureRef => ref !== undefined);
}

function applyVariant(gltf: Gltf): void {
  const variants = (gltf.extensions?.KHR_materials_variants as { variants: { name: string }[] }).variants;
  const variant = variants.findIndex((item) => item.name === VARIANT);
  if (variant < 0) throw new Error(`재질 변형 ${VARIANT}이 없습니다`);
  for (const mesh of gltf.meshes) {
    for (const primitive of mesh.primitives) {
      const mapping = primitive.extensions?.KHR_materials_variants?.mappings.find((item) => item.variants.includes(variant));
      if (mapping) primitive.material = mapping.material;
      if (primitive.extensions) delete primitive.extensions.KHR_materials_variants;
    }
  }
  delete gltf.extensions?.KHR_materials_variants;
}

function removeLogos(gltf: Gltf): void {
  const removed = new Set(gltf.nodes.flatMap((node, index) => (LOGO_NODES.includes(node.name ?? "") ? [index] : [])));
  if (removed.size !== LOGO_NODES.length) throw new Error("로고 노드를 모두 찾지 못했습니다");
  for (const node of gltf.nodes) if (node.children) node.children = node.children.filter((child) => !removed.has(child));
  const logo = gltf.images.findIndex((image) => image.uri === LOGO_IMAGE);
  const logoTextures = new Set(
    gltf.textures.flatMap((texture, index) => ((texture.extensions?.KHR_texture_basisu?.source ?? texture.source) === logo ? [index] : [])),
  );
  for (const material of gltf.materials) {
    if (material.emissiveTexture && logoTextures.has(material.emissiveTexture.index)) {
      delete material.emissiveTexture;
      material.emissiveFactor = [0, 0, 0];
    }
  }
}

function mergeInterior(gltf: Gltf): void {
  const interior = gltf.materials.length;
  gltf.materials.push({
    name: "Interior",
    pbrMetallicRoughness: { baseColorFactor: [0.02, 0.02, 0.022, 1], metallicFactor: 0, roughnessFactor: 0.7 },
  });
  const merged = new Set(INTERIOR_MATERIALS.map((name) => gltf.materials.findIndex((material) => material.name === name)));
  if (merged.has(-1)) throw new Error("실내 재질을 모두 찾지 못했습니다");
  for (const mesh of gltf.meshes) {
    for (const primitive of mesh.primitives) if (primitive.material !== undefined && merged.has(primitive.material)) primitive.material = interior;
  }
}

function lightenGlass(gltf: Gltf): void {
  const glass = gltf.materials.find((material) => material.name === "Glass");
  if (!glass) throw new Error("유리 재질이 없습니다");
  delete glass.extensions;
  glass.alphaMode = "BLEND";
  glass.pbrMetallicRoughness = { baseColorFactor: [0.003, 0.0037, 0.005, 0.3], metallicFactor: 0, roughnessFactor: 0.05 };
}

function dropZeroOcclusion(gltf: Gltf): void {
  for (const material of gltf.materials) if (material.occlusionTexture?.strength === 0) delete material.occlusionTexture;
}

/** 장면에서 닿는 노드·메시·재질·텍스처·이미지만 남기고 번호를 다시 매긴다 */
function prune(gltf: Gltf): void {
  const liveNodes = new Set<number>();
  const visit = (index: number) => {
    liveNodes.add(index);
    for (const child of gltf.nodes[index].children ?? []) visit(child);
  };
  for (const scene of gltf.scenes) for (const root of scene.nodes) visit(root);
  const nodeMap = new Map([...liveNodes].sort((a, b) => a - b).map((old, index) => [old, index]));
  gltf.nodes = [...nodeMap.keys()].map((old) => gltf.nodes[old]);
  for (const node of gltf.nodes) if (node.children) node.children = node.children.map((child) => nodeMap.get(child)!);
  for (const scene of gltf.scenes) scene.nodes = scene.nodes.map((root) => nodeMap.get(root)!);

  const meshMap = new Map<number, number>();
  for (const node of gltf.nodes) if (node.mesh !== undefined && !meshMap.has(node.mesh)) meshMap.set(node.mesh, meshMap.size);
  gltf.meshes = [...meshMap.keys()].map((old) => gltf.meshes[old]);
  for (const node of gltf.nodes) if (node.mesh !== undefined) node.mesh = meshMap.get(node.mesh);

  const materialMap = new Map<number, number>();
  for (const mesh of gltf.meshes) {
    for (const primitive of mesh.primitives) {
      if (primitive.material !== undefined && !materialMap.has(primitive.material)) materialMap.set(primitive.material, materialMap.size);
    }
  }
  gltf.materials = [...materialMap.keys()].map((old) => gltf.materials[old]);
  for (const mesh of gltf.meshes) for (const primitive of mesh.primitives) if (primitive.material !== undefined) primitive.material = materialMap.get(primitive.material);

  const textureMap = new Map<number, number>();
  for (const material of gltf.materials) for (const ref of textureRefs(material)) if (!textureMap.has(ref.index)) textureMap.set(ref.index, textureMap.size);
  gltf.textures = [...textureMap.keys()].map((old) => gltf.textures[old]);
  for (const material of gltf.materials) for (const ref of textureRefs(material)) ref.index = textureMap.get(ref.index)!;

  const imageMap = new Map<number, number>();
  for (const texture of gltf.textures) {
    const source = texture.extensions?.KHR_texture_basisu?.source;
    if (source === undefined) throw new Error("KTX2가 아닌 텍스처가 있습니다");
    if (!imageMap.has(source)) imageMap.set(source, imageMap.size);
    texture.extensions!.KHR_texture_basisu!.source = imageMap.get(source)!;
  }
  gltf.images = [...imageMap.keys()].map((old) => gltf.images[old]);

  const used = new Set(["KHR_draco_mesh_compression", "KHR_texture_basisu"]);
  const collect = (extensions?: Record<string, unknown>) => Object.keys(extensions ?? {}).forEach((name) => used.add(name));
  for (const material of gltf.materials) {
    collect(material.extensions);
    for (const ref of textureRefs(material)) collect(ref.extensions as Record<string, unknown> | undefined);
  }
  gltf.extensionsUsed = (gltf.extensionsUsed ?? []).filter((name) => used.has(name));
  if (gltf.extensions && Object.keys(gltf.extensions).length === 0) delete gltf.extensions;
}

async function main() {
  const gltf = JSON.parse((await download("CarConcept.gltf")).toString("utf8")) as Gltf;
  applyVariant(gltf);
  removeLogos(gltf);
  mergeInterior(gltf);
  lightenGlass(gltf);
  dropZeroOcclusion(gltf);
  prune(gltf);

  await rm(OUTPUT, { recursive: true, force: true });
  await mkdir(OUTPUT, { recursive: true });
  await writeFile(path.join(OUTPUT, "CarConcept.gltf"), JSON.stringify(gltf));
  let total = 0;
  for (const name of ["CarConcept.data.bin", ...gltf.images.map((image) => image.uri)]) {
    const data = await download(name);
    await writeFile(path.join(OUTPUT, name), data);
    total += data.length;
  }
  for (const [from, to] of DECODER_FILES) {
    await mkdir(path.dirname(path.join(DECODERS, to)), { recursive: true });
    await copyFile(from, path.join(DECODERS, to));
  }
  console.log(
    `${OUTPUT}: 노드 ${gltf.nodes.length}, 메시 ${gltf.meshes.length}, 재질 ${gltf.materials.length}, 이미지 ${gltf.images.length}, ${(total / 1024 / 1024).toFixed(2)}MB(+gltf)`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
