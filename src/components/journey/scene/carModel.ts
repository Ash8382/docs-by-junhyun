import {
  Box3,
  BufferAttribute,
  Color,
  Group,
  Matrix4,
  Mesh,
  Quaternion,
  Vector3,
  type BufferGeometry,
  type Material,
  type MeshStandardMaterial,
  type Object3D,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { CAR_LIGHT_INTENSITY, CAR_LIGHT_MATERIALS } from "@/lib/journey/carAsset";
import type { DriveState } from "@/lib/journey/drive";
import { HEADLIGHT_HEX, carLightLevel, hexToLinear, trailColor } from "@/lib/journey/trail";

/**
 * 차 모델을 장면에 맞게 준비한다. glTF 부품(약 100개)을 재질별로 합쳐 드로콜을 재질 수 남짓(18)으로 줄이고,
 * 바퀴 바닥이 y = 0에 닿게 올리고, 불빛 재질(헤드라이트·테일라이트)을 찾아 둔다.
 * 바퀴는 스크롤로 구른다(달린 거리 ÷ 반지름). 바퀴마다 메시를 떼면 드로콜이 바퀴 수 × 재질 수만큼 늘므로, 합친 채로
 * 정점 셰이더가 바퀴 정점만 그 바퀴 중심에서 그 바퀴 축으로 돌린다. 정점마다 바퀴 중심·반지름(aWheel)과 축(aWheelAxis)을 두고,
 * 매 프레임 거리 uniform 하나만 바꾼다.
 */

/**
 * 바퀴 하나(정리한 차 좌표: y 위, +Z 앞, +X 왼쪽, 바퀴 바닥 y = 0). 중심은 바퀴 노드의 원점, 축은 바퀴 노드의 x다.
 * 모델의 앞바퀴는 수직축으로 약 30° 꺾여 있어 축도 꺾여 있다. 앞으로 구르도록 축은 늘 왼쪽(+X 성분이 양수)을 향한다.
 */
export interface CarWheel {
  name: string;
  center: [number, number, number];
  axis: [number, number, number];
  radius: number;
}

export interface PreparedCar {
  object: Group;
  headlights: MeshStandardMaterial[];
  taillights: MeshStandardMaterial[];
  wheels: CarWheel[];
  /** 바퀴가 구른 거리(m). 돌아가는 부품의 재질이 함께 쓰는 uniform이다 */
  wheelTravel: { value: number };
  dispose(): void;
}

/** 바퀴 노드 이름(WheelFrontL 등). 그 아래의 휠·브레이크 디스크·타이어가 돈다 */
const WHEEL_NODE = /^Wheel(Front|Rear)(L|R)$/;
/** 바퀴 노드 아래에서 돌지 않는 부품(캘리퍼). 실제 차처럼 차체에 붙어 있다 */
const FIXED_WHEEL_PART = /BrakePad$/;

/** 이 부품이 도는 바퀴의 노드. 바퀴가 아니거나 캘리퍼면 null */
function turningWheelOf(object: Object3D): Object3D | null {
  for (let node: Object3D | null = object; node; node = node.parent) {
    if (FIXED_WHEEL_PART.test(node.name)) return null;
    if (WHEEL_NODE.test(node.name)) return node;
  }
  return null;
}

const WHEEL_VERTEX_HEAD = /* glsl */ `
attribute vec4 aWheel;
attribute vec3 aWheelAxis;
uniform float uWheelTravel;
// 바퀴 정점(aWheel.w = 반지름 > 0)을 바퀴 축(aWheelAxis, 단위 벡터) 둘레로 돌린다(로드리게스 회전).
// 각도 = 달린 거리 / 반지름. 축이 왼쪽을 향하므로 앞으로 가면 위끝이 굴러가는 쪽(축 × 위)으로 간다
mat3 journeyWheelTurn() {
  if ( aWheel.w <= 0.0 ) return mat3( 1.0 );
  float angle = mod( uWheelTravel / aWheel.w, 6.283185307179586 );
  float c = cos( angle );
  float s = sin( angle );
  float t = 1.0 - c;
  vec3 k = aWheelAxis;
  return mat3(
    t * k.x * k.x + c, t * k.x * k.y + s * k.z, t * k.x * k.z - s * k.y,
    t * k.x * k.y - s * k.z, t * k.y * k.y + c, t * k.y * k.z + s * k.x,
    t * k.x * k.z + s * k.y, t * k.y * k.z - s * k.x, t * k.z * k.z + c
  );
}`;

const WHEEL_VERTEX_CHUNKS: [string, string][] = [
  ["#include <common>", `#include <common>\n${WHEEL_VERTEX_HEAD}`],
  [
    "#include <beginnormal_vertex>",
    "#include <beginnormal_vertex>\nobjectNormal = journeyWheelTurn() * objectNormal;\n#ifdef USE_TANGENT\nobjectTangent = journeyWheelTurn() * objectTangent;\n#endif",
  ],
  [
    "#include <begin_vertex>",
    "#include <begin_vertex>\nif ( aWheel.w > 0.0 ) transformed = aWheel.xyz + journeyWheelTurn() * ( transformed - aWheel.xyz );",
  ],
];

/** three 표준·물리 재질의 정점 셰이더에 바퀴 회전을 넣는다. 넣을 자리가 없으면(three가 바뀌면) 던진다 */
export function injectWheelTurn(source: string): string {
  let result = source;
  for (const [anchor, replacement] of WHEEL_VERTEX_CHUNKS) {
    if (!result.includes(anchor)) throw new Error(`바퀴 회전을 넣을 셰이더 자리가 없습니다: ${anchor}`);
    result = result.replace(anchor, replacement);
  }
  return result;
}

/** 셰이더와 같은 회전으로 점 하나를 돌린다(테스트·검증용) */
export function turnWheelPoint(point: readonly number[], wheel: CarWheel, travel: number): [number, number, number] {
  const offset = new Vector3(point[0] - wheel.center[0], point[1] - wheel.center[1], point[2] - wheel.center[2]);
  offset.applyAxisAngle(new Vector3(...wheel.axis), travel / wheel.radius);
  return [wheel.center[0] + offset.x, wheel.center[1] + offset.y, wheel.center[2] + offset.z];
}

/** 바퀴가 구른 거리를 지금 차가 달린 도로 거리로 둔다. 정류장에 멈춰 있으면 그대로고, 위로 스크롤하면 거꾸로 돈다 */
export function applyWheelTravel(car: Pick<PreparedCar, "wheelTravel">, state: DriveState): void {
  car.wheelTravel.value = state.carS;
}

function isMesh(object: Object3D): object is Mesh<BufferGeometry, Material> {
  return (object as Mesh).isMesh === true && !Array.isArray((object as Mesh).material);
}

/** 같은 재질이고 정점 속성 구성이 같은 메시끼리 합친다(속성이 다르면 합칠 수 없다) */
export function prepareCar(scene: Object3D): PreparedCar {
  scene.updateMatrixWorld(true);
  const toRoot = new Matrix4().copy(scene.matrixWorld).invert();
  const groups = new Map<string, { material: Material; geometries: BufferGeometry[] }>();
  const wheelOf = new Map<BufferGeometry, Object3D>();
  scene.traverse((child) => {
    if (!isMesh(child)) return;
    const geometry = child.geometry.clone();
    geometry.applyMatrix4(new Matrix4().multiplyMatrices(toRoot, child.matrixWorld));
    const wheel = turningWheelOf(child);
    if (wheel) wheelOf.set(geometry, wheel);
    const key = `${child.material.uuid}|${Object.keys(geometry.attributes).sort().join(",")}|${geometry.index ? "i" : "n"}`;
    const group = groups.get(key) ?? { material: child.material, geometries: [] };
    group.geometries.push(geometry);
    groups.set(key, group);
  });
  const { wheels, wheelTravel } = prepareWheels(groups, wheelOf, toRoot);
  const object = new Group();
  object.name = "journey-car-model";
  // ?debug=stats가 장면에서 바퀴가 구른 거리를 읽는다
  object.userData.wheelTravel = wheelTravel;
  const merged: BufferGeometry[] = [];
  const bounds = new Box3();
  for (const { material, geometries } of groups.values()) {
    const geometry = mergeGeometries(geometries, false);
    for (const part of geometries) part.dispose();
    if (!geometry) throw new Error(`차 부품을 합치지 못했습니다(재질 ${material.name})`);
    geometry.computeBoundingBox();
    if (geometry.boundingBox) bounds.union(geometry.boundingBox);
    merged.push(geometry);
    object.add(new Mesh(geometry, material));
  }
  // 모델 원점은 바퀴 중심 높이 근처라 바퀴가 노면 아래로 들어간다. 가장 낮은 점(타이어 바닥)을 노면에 맞춘다.
  for (const geometry of merged) geometry.translate(0, -bounds.min.y, 0);
  const byName = (name: string) =>
    [...groups.values()].map((group) => group.material).filter((material) => material.name === name) as MeshStandardMaterial[];
  const headlights = byName(CAR_LIGHT_MATERIALS.head);
  const taillights = byName(CAR_LIGHT_MATERIALS.tail);
  if (headlights.length === 0 || taillights.length === 0) throw new Error("차 모델에 불빛 재질이 없습니다");
  return {
    object,
    headlights,
    taillights,
    wheels,
    wheelTravel,
    dispose: () => merged.forEach((geometry) => geometry.dispose()),
  };
}

/**
 * 바퀴마다 중심(노드의 원점)·축(노드의 x, 왼쪽을 향하게)·반지름(돌아가는 부품 세로 폭의 절반, 타이어가 가장 바깥이다)을 정하고,
 * 돌아가는 부품을 가진 재질의 모든 부품에 aWheel·aWheelAxis(바퀴 정점은 그 바퀴 값, 나머지는 0)를 단다. 재질 하나를 쓰는 부품 중
 * 하나라도 속성이 없으면 WebGL 기본값(0, 0, 0, 1)이 반지름 1로 읽혀 돌아 버리므로 재질 단위로 단다.
 * 중심은 노면에 맞추기(y 이동) 전의 좌표라 여기서 같은 만큼 뺀다(prepareCar의 translate는 position만 옮긴다).
 */
function prepareWheels(
  groups: Map<string, { material: Material; geometries: BufferGeometry[] }>,
  wheelOf: Map<BufferGeometry, Object3D>,
  toRoot: Matrix4,
): { wheels: CarWheel[]; wheelTravel: { value: number } } {
  const wheelTravel = { value: 0 };
  const floor = new Box3();
  for (const { geometries } of groups.values()) {
    for (const geometry of geometries) {
      geometry.computeBoundingBox();
      if (geometry.boundingBox) floor.union(geometry.boundingBox);
    }
  }
  const bounds = new Map<Object3D, Box3>();
  for (const [geometry, node] of wheelOf) {
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    const box = bounds.get(node) ?? new Box3();
    if (geometry.boundingBox) box.union(geometry.boundingBox);
    bounds.set(node, box);
  }
  const byNode = new Map<Object3D, CarWheel>();
  for (const [node, box] of bounds) {
    const frame = new Matrix4().multiplyMatrices(toRoot, node.matrixWorld);
    const center = new Vector3().setFromMatrixPosition(frame);
    const axis = new Vector3(1, 0, 0).transformDirection(frame);
    if (axis.x < 0) axis.negate();
    byNode.set(node, {
      name: node.name,
      center: [center.x, center.y - floor.min.y, center.z],
      axis: [axis.x, axis.y, axis.z],
      radius: (box.max.y - box.min.y) / 2,
    });
  }
  const wheels = [...byNode.values()];
  const turning = new Set<Material>();
  for (const { material, geometries } of groups.values()) {
    if (geometries.some((geometry) => wheelOf.has(geometry))) turning.add(material);
  }
  for (const { material, geometries } of groups.values()) {
    if (!turning.has(material)) continue;
    for (const geometry of geometries) {
      const node = wheelOf.get(geometry);
      const wheel = node ? byNode.get(node) : undefined;
      const count = geometry.getAttribute("position").count;
      const data = new Float32Array(count * 4);
      const axes = new Float32Array(count * 3);
      if (wheel) {
        for (let index = 0; index < count; index++) {
          data.set([wheel.center[0], wheel.center[1], wheel.center[2], wheel.radius], index * 4);
          axes.set(wheel.axis, index * 3);
        }
      }
      geometry.setAttribute("aWheel", new BufferAttribute(data, 4));
      geometry.setAttribute("aWheelAxis", new BufferAttribute(axes, 3));
    }
  }
  for (const material of turning) {
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uWheelTravel = wheelTravel;
      shader.vertexShader = injectWheelTurn(shader.vertexShader);
    };
    material.customProgramCacheKey = () => "journey-wheel";
  }
  return { wheels, wheelTravel };
}

const HEADLIGHT = new Color(...hexToLinear(HEADLIGHT_HEX));
const basis = new Matrix4();
const rotation = new Quaternion();
const right = new Vector3();
const up = new Vector3();
const forward = new Vector3();

/** 차(모델·실루엣) 자리를 진행 상태의 차 자세로 놓는다. glTF 차는 +Z가 앞, +X가 왼쪽이다 */
export function placeCar(object: Object3D, state: DriveState): void {
  const { car } = state;
  right.set(-car.right[0], -car.right[1], -car.right[2]);
  up.set(...car.up);
  forward.set(...car.tangent);
  object.quaternion.copy(rotation.setFromRotationMatrix(basis.makeBasis(right, up, forward)));
  object.position.set(...car.position);
}

/** 불빛 색과 세기: 헤드라이트는 늘 주황, 테일라이트는 지금 자리의 궤적 색. 엔딩에서 낮춘다 */
export function applyCarLights(
  headlights: { emissive: Color; emissiveIntensity: number }[],
  taillights: { emissive: Color; emissiveIntensity: number }[],
  state: DriveState,
): void {
  const level = carLightLevel(state.ending);
  for (const material of headlights) {
    material.emissive.copy(HEADLIGHT);
    material.emissiveIntensity = CAR_LIGHT_INTENSITY.head * level;
  }
  const tail = trailColor(state.carS);
  for (const material of taillights) {
    material.emissive.setRGB(tail[0], tail[1], tail[2]);
    material.emissiveIntensity = CAR_LIGHT_INTENSITY.tail * level;
  }
}
