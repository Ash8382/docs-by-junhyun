import { Color, NoToneMapping, OrthographicCamera, Scene, WebGLRenderer } from "three";
import { createLayerTexture, loadLayer, uploadChecked } from "@/components/journey/scene/hologramAtlas";
import { createHologramMeshes, writeHolograms } from "@/components/journey/scene/hologramMeshes";
import { HOLOGRAMS, LAYER, type HologramPlacement } from "@/lib/journey/holograms";

/**
 * check:holograms ①의 브라우저 쪽(scripts/check-holograms.ts가 esbuild로 묶어 띄운다). 실제 홀로그램 재질과 메시로 층 하나를
 * 톤 매핑·후처리 없이 1:1 화소(직교 카메라, 화소 단위)로 그린다. 화면 영역에 발광이 없으면 층 이미지와 화소 단위로 같다.
 */
export const CANVAS = { width: 1024, height: 640 } as const;

declare global {
  interface Window {
    hologramCheck?: { loaded: boolean[]; uploaded: boolean; show(index: number): { left: number; top: number } };
  }
}

async function main() {
  const renderer = new WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(CANVAS.width, CANVAS.height);
  renderer.toneMapping = NoToneMapping;
  document.body.style.margin = "0";
  document.body.appendChild(renderer.domElement);
  const scene = new Scene();
  scene.background = new Color(0x000000);
  const camera = new OrthographicCamera(-CANVAS.width / 2, CANVAS.width / 2, CANVAS.height / 2, -CANVAS.height / 2, 0.1, 2000);
  camera.position.set(0, 0, 1000);

  const layers = await Promise.all(HOLOGRAMS.map((hologram) => loadLayer(hologram.layerFile)));
  const texture = createLayerTexture(layers);
  const uploaded = uploadChecked(renderer, texture);
  const meshes = createHologramMeshes(texture);
  scene.add(meshes.screens);
  const loaded = layers.map((layer) => layer !== null);

  window.hologramCheck = {
    loaded,
    uploaded,
    // 층 상자를 화소 단위(768×480)로 화면 가운데에 둔다. 왼쪽 위 모서리가 정수 화소라 텍셀 가운데가 화소 가운데에 온다
    show(index) {
      const placements: HologramPlacement[] = HOLOGRAMS.map((hologram, i) => ({
        id: hologram.id,
        center: [0, 0, 0],
        facing: { kind: "camera" },
        box: [LAYER.width, LAYER.height],
        presence: i === index ? 1 : 0,
        disc: [0, 0, 0],
        discOpacity: 0,
        colorS: 0,
      }));
      writeHolograms(meshes, placements, [0, 0, 1000], { loaded, glow: HOLOGRAMS.map(() => 0) });
      renderer.render(scene, camera);
      return { left: (CANVAS.width - LAYER.width) / 2, top: (CANVAS.height - LAYER.height) / 2 };
    },
  };
}

void main();
