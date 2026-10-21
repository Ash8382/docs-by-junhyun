import {
  BoxGeometry,
  EdgesGeometry,
  ExtrudeGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  Shape,
  Vector2,
  type BufferGeometry,
} from "three";
import type { DriveState } from "@/lib/journey/drive";
import { carLightLevel, trailColor } from "@/lib/journey/trail";
import { applyCarLights } from "./carModel";

/**
 * 차 모델·디코더를 받지 못했을 때 대신 그리는 빛 실루엣(스펙 5절 "실패 대응"). 옆모습 윤곽을 차 폭만큼 밀어낸 모서리 선과
 * 헤드라이트·테일라이트 막대뿐이다. 모델과 같은 차 기준(+Z 앞, +X 왼쪽, 바닥 y = 0)이라 같은 자세(placeCar)를 쓴다.
 */

/** 옆모습 윤곽(앞 +, 높이, m). 길이 약 4.6m, 높이 약 1.25m */
const PROFILE: [number, number][] = [
  [-2.3, 0.35],
  [-2.3, 0.85],
  [-1.9, 1.0],
  [-0.9, 1.2],
  [-0.2, 1.25],
  [0.6, 1.05],
  [1.6, 0.85],
  [2.3, 0.62],
  [2.3, 0.35],
  [1.7, 0.25],
  [-1.7, 0.25],
];
const WIDTH = 1.9;
/** 윤곽선 밝기(선형 HDR). 블룸이 살짝 걸린다 */
const OUTLINE_INTENSITY = 1.8;

export interface Silhouette {
  object: Group;
  outline: LineBasicMaterial;
  headlights: MeshStandardMaterial[];
  taillights: MeshStandardMaterial[];
  dispose(): void;
}

export function createSilhouette(): Silhouette {
  const shape = new Shape(PROFILE.map(([forward, height]) => new Vector2(forward, height)));
  const body = new ExtrudeGeometry(shape, { depth: WIDTH, bevelEnabled: false });
  // 윤곽 평면(x = 앞, y = 위)을 차 기준으로 돌리고(앞 → +Z, 밀어낸 쪽 → −X) 가운데로 옮긴다
  body.rotateY(-Math.PI / 2);
  body.translate(WIDTH / 2, 0, 0);
  const edges = new EdgesGeometry(body, 20);
  body.dispose();
  const outline = new LineBasicMaterial({ color: "#ffffff" });
  const object = new Group();
  object.name = "journey-car-silhouette";
  object.add(new LineSegments(edges, outline));

  const light = () => new MeshStandardMaterial({ color: "#000000", emissive: "#000000" });
  const headlight = light();
  const taillight = light();
  const geometries: BufferGeometry[] = [edges];
  for (const [material, forward, height] of [
    [headlight, 2.28, 0.6],
    [taillight, -2.28, 0.8],
  ] as const) {
    const bar = new BoxGeometry(1.5, 0.06, 0.05);
    geometries.push(bar);
    const mesh = new Mesh(bar, material);
    mesh.position.set(0, height, forward);
    object.add(mesh);
  }
  return {
    object,
    outline,
    headlights: [headlight],
    taillights: [taillight],
    dispose: () => {
      geometries.forEach((geometry) => geometry.dispose());
      [outline, headlight, taillight].forEach((material) => material.dispose());
    },
  };
}

/** 실루엣의 윤곽을 지금 자리의 궤적 색으로, 불빛을 모델과 같은 규칙으로 칠한다 */
export function paintSilhouette(silhouette: Silhouette, state: DriveState): void {
  applyCarLights(silhouette.headlights, silhouette.taillights, state);
  const [r, g, b] = trailColor(state.carS);
  const level = OUTLINE_INTENSITY * carLightLevel(state.ending);
  silhouette.outline.color.setRGB(r * level, g * level, b * level);
}
