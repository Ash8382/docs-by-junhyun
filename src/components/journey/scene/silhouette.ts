import {
  BoxGeometry,
  EdgesGeometry,
  ExtrudeGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Shape,
  TorusGeometry,
  Vector2,
  type BufferGeometry,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { DriveState } from "@/lib/journey/drive";
import { carLightLevel, trailColor } from "@/lib/journey/trail";
import { applyCarLights } from "./carModel";

/**
 * 차 모델·디코더를 받지 못했을 때 대신 그리는 빛 실루엣(스펙 5절 "실패 대응"). 어둡게 채운 몸통에 빛나는 모서리 선, 바퀴 고리 넷,
 * 헤드라이트·테일라이트 막대다. 모델과 같은 차 기준(+Z 앞, +X 왼쪽, 바닥 y = 0)이라 같은 자세(placeCar)를 쓴다.
 * 병합 뒤: 모서리 선만 있으면 도로 중앙선·빛줄기가 몸통을 뚫고 보이고, 바퀴가 없고 지붕까지 차 폭이라 뒤에서 보면 철사 상자였다.
 * 그래서 몸통을 어둡게 채우고, 아래 몸통(차 폭)과 위 유리 부분(좁게)을 나눠 밀어내고, 바퀴 자리에 빛 고리를 둔다.
 */

/**
 * 아래 몸통의 옆모습 윤곽(앞 +, 높이, m). 모델과 같은 자리(뒤 1.94, 앞 2.40)라 같은 자세와 빛줄기 시작점(carAsset TAILLIGHTS)이
 * 맞는다. 뒤 데크는 빛줄기가 시작하는 높이(1.0)까지 올린다
 */
const BODY_PROFILE: [number, number][] = [
  [-1.94, 0.38],
  [-1.94, 1.0],
  [-1.5, 1.02],
  [1.2, 0.86],
  [2.25, 0.68],
  [2.4, 0.55],
  [2.4, 0.32],
  [1.9, 0.2],
  [-1.7, 0.2],
];
/** 위 유리 부분(지붕)의 옆모습 윤곽. 뒤 유리에서 지붕(1.17)을 지나 앞 유리까지 */
const CABIN_PROFILE: [number, number][] = [
  [-1.6, 0.98],
  [-0.45, 1.17],
  [0.3, 1.17],
  [1.65, 0.84],
];
/** 모델의 차체 폭(±1.11) */
const WIDTH = 2.2;
/** 위 유리 부분의 폭. 아래 몸통보다 좁아 뒤에서 봐도 차 모양이다 */
const CABIN_WIDTH = 1.5;
/**
 * 바퀴 고리: 앞뒤 축 자리(앞 +, m), 중심 높이, 반지름, 고리 굵기(모델 바퀴: 앞 1.49·뒤 −1.31, 높이 0.36, 반지름 0.36).
 * 차 폭 안쪽 옆면에 붙이고 아래끝(높이 − 반지름 − 굵기)이 노면에 닿는다
 */
const WHEEL = { axles: [1.49, -1.31], height: 0.36, radius: 0.32, tube: 0.035 } as const;
/** 헤드라이트·테일라이트 막대(앞 +, 높이). 테일라이트는 빛줄기가 시작하는 자리(뒤 1.95, 높이 1.0)다 */
const LIGHT_BARS = { head: { forward: 2.38, height: 0.6 }, tail: { forward: -1.95, height: 1.0 } } as const;
/** 몸통 채움 색(선형). 모델의 어두운 차체처럼 거의 검다 */
const BODY_COLOR = "#06080c";
/** 윤곽선 밝기(선형 HDR). 블룸이 살짝 걸린다 */
const OUTLINE_INTENSITY = 1.8;

export interface Silhouette {
  object: Group;
  outline: LineBasicMaterial;
  /** 바퀴 고리. 윤곽선과 같은 빛이다 */
  wheels: MeshBasicMaterial;
  /** 테일라이트 막대(빛줄기가 여기서 시작한다) */
  taillightMesh: Mesh;
  headlights: MeshStandardMaterial[];
  taillights: MeshStandardMaterial[];
  dispose(): void;
}

/** 옆모습 윤곽을 폭만큼 밀어내 차 기준으로 돌리고(앞 → +Z, 밀어낸 쪽 → −X) 가운데로 옮긴다 */
function extrude(profile: [number, number][], width: number): ExtrudeGeometry {
  const shape = new Shape(profile.map(([forward, height]) => new Vector2(forward, height)));
  const geometry = new ExtrudeGeometry(shape, { depth: width, bevelEnabled: false });
  geometry.rotateY(-Math.PI / 2);
  geometry.translate(width / 2, 0, 0);
  return geometry;
}

export function createSilhouette(): Silhouette {
  const parts = [extrude(BODY_PROFILE, WIDTH), extrude(CABIN_PROFILE, CABIN_WIDTH)];
  const edges = mergeGeometries(parts.map((part) => new EdgesGeometry(part, 20)), false);
  // 채움은 모서리 선과 같은 깊이라 뒤로 조금 밀어 선이 가려지지 않게 한다
  const fill = new MeshBasicMaterial({ color: BODY_COLOR, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  const solid = mergeGeometries(
    parts.map((part) => part.toNonIndexed()),
    false,
  );
  parts.forEach((part) => part.dispose());
  const outline = new LineBasicMaterial({ color: "#ffffff" });
  const object = new Group();
  object.name = "journey-car-silhouette";
  const body = new Mesh(solid, fill);
  body.name = "journey-car-silhouette-body";
  object.add(body, new LineSegments(edges, outline));

  const rings = mergeGeometries(
    WHEEL.axles.flatMap((forward) =>
      [1, -1].map((side) => {
        const ring = new TorusGeometry(WHEEL.radius, WHEEL.tube, 8, 32);
        ring.rotateY(Math.PI / 2);
        ring.translate(side * (WIDTH / 2 - WHEEL.tube), WHEEL.height, forward);
        return ring;
      }),
    ),
    false,
  );
  const wheels = new MeshBasicMaterial({ color: "#ffffff" });
  const wheelMesh = new Mesh(rings, wheels);
  wheelMesh.name = "journey-car-silhouette-wheels";
  object.add(wheelMesh);

  const light = () => new MeshStandardMaterial({ color: "#000000", emissive: "#000000" });
  const headlight = light();
  const taillight = light();
  const geometries: BufferGeometry[] = [edges, solid, rings];
  const bars = ([
    [headlight, LIGHT_BARS.head],
    [taillight, LIGHT_BARS.tail],
  ] as const).map(([material, { forward, height }]) => {
    const bar = new BoxGeometry(1.5, 0.06, 0.05);
    geometries.push(bar);
    const mesh = new Mesh(bar, material);
    mesh.position.set(0, height, forward);
    object.add(mesh);
    return mesh;
  });
  return {
    object,
    outline,
    wheels,
    taillightMesh: bars[1],
    headlights: [headlight],
    taillights: [taillight],
    dispose: () => {
      geometries.forEach((geometry) => geometry.dispose());
      [outline, fill, wheels, headlight, taillight].forEach((material) => material.dispose());
    },
  };
}

/** 실루엣의 윤곽을 지금 자리의 궤적 색으로, 불빛을 모델과 같은 규칙으로 칠한다 */
export function paintSilhouette(silhouette: Silhouette, state: DriveState): void {
  applyCarLights(silhouette.headlights, silhouette.taillights, state);
  const [r, g, b] = trailColor(state.carS);
  const level = OUTLINE_INTENSITY * carLightLevel(state.ending);
  silhouette.outline.color.setRGB(r * level, g * level, b * level);
  silhouette.wheels.color.copy(silhouette.outline.color);
}
