import { describe, expect, it } from "vitest";
import { Box3, BoxGeometry, Group, Matrix4, Mesh, MeshStandardMaterial, Vector3 } from "three";
import { CAR_LIGHT_INTENSITY, CAR_LIGHT_MATERIALS } from "@/lib/journey/carAsset";
import { driveAt } from "@/lib/journey/drive";
import { rangeOf } from "@/lib/journey/timeline";
import { HEADLIGHT_HEX, carLightLevel, hexToLinear, trailColor } from "@/lib/journey/trail";
import { applyCarLights, placeCar, prepareCar } from "./carModel";

function material(name: string): MeshStandardMaterial {
  const result = new MeshStandardMaterial();
  result.name = name;
  return result;
}

/** glTF처럼 z가 위인 부품을 y가 위로 돌리는 뿌리 아래에 부품을 단다. 바퀴 바닥은 원점보다 0.16m 아래다 */
function fakeCar(lights = true) {
  const paint = material("Paint");
  const root = new Group();
  root.matrixAutoUpdate = false;
  root.matrix.copy(new Matrix4().set(1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1));
  const parts: [MeshStandardMaterial, [number, number, number]][] = [
    [paint, [0, 0, 0.5]],
    [paint, [0, 1.5, 0.5]],
    [paint, [0, -1.5, 0.34]],
  ];
  if (lights) parts.push([material(CAR_LIGHT_MATERIALS.head), [0, -2, 0.6]], [material(CAR_LIGHT_MATERIALS.tail), [0, 2, 0.9]]);
  for (const [partMaterial, position] of parts) {
    const mesh = new Mesh(new BoxGeometry(1, 1, 1), partMaterial);
    mesh.position.set(...position);
    root.add(mesh);
  }
  const scene = new Group();
  scene.add(root);
  return { scene, paint };
}

describe("차 모델 준비", () => {
  it("같은 재질의 부품을 메시 하나로 합친다(드로콜이 재질 수가 된다)", () => {
    const car = prepareCar(fakeCar().scene);
    expect(car.object.children).toHaveLength(3);
    expect(car.headlights.map((item) => item.name)).toEqual([CAR_LIGHT_MATERIALS.head]);
    expect(car.taillights.map((item) => item.name)).toEqual([CAR_LIGHT_MATERIALS.tail]);
  });

  it("뿌리의 회전을 반영하고, 가장 낮은 점을 노면(y = 0)에 맞춘다", () => {
    const car = prepareCar(fakeCar().scene);
    const bounds = new Box3().setFromObject(car.object);
    expect(bounds.min.y).toBeCloseTo(0, 6);
    // z가 위인 부품 높이(0.34~1.4)가 y로 바뀌어 높이 범위가 1.06 + 0.5(상자) = 1.56이 된다
    expect(bounds.max.y - bounds.min.y).toBeCloseTo(1.56, 6);
    // 부품의 y(길이 방향, −2~2)는 −z로 간다
    expect(bounds.max.z - bounds.min.z).toBeCloseTo(5, 6);
  });

  it("불빛 재질이 없으면 알린다", () => {
    expect(() => prepareCar(fakeCar(false).scene)).toThrow("불빛 재질");
  });
});

describe("차 자세와 불빛", () => {
  const range = rangeOf("todo-app");
  const state = driveAt((range.start + range.end) / 2);

  it("차의 앞(+Z)이 도로 접선, 위(+Y)가 노면 위, 왼쪽(+X)이 도로 왼쪽을 향하고 차 자리에 선다", () => {
    const object = new Group();
    placeCar(object, state);
    object.updateMatrixWorld();
    const axis = (x: number, y: number, z: number) => new Vector3(x, y, z).applyQuaternion(object.quaternion).toArray();
    axis(0, 0, 1).forEach((value, index) => expect(value).toBeCloseTo(state.car.tangent[index], 6));
    axis(0, 1, 0).forEach((value, index) => expect(value).toBeCloseTo(state.car.up[index], 6));
    axis(1, 0, 0).forEach((value, index) => expect(value).toBeCloseTo(-state.car.right[index], 6));
    expect(object.position.toArray()).toEqual(state.car.position);
  });

  it("헤드라이트는 주황, 테일라이트는 지금 자리의 궤적 색이다", () => {
    const head = new MeshStandardMaterial();
    const tail = new MeshStandardMaterial();
    applyCarLights([head], [tail], state);
    hexToLinear(HEADLIGHT_HEX).forEach((value, index) => expect(head.emissive.toArray()[index]).toBeCloseTo(value, 6));
    trailColor(state.carS).forEach((value, index) => expect(tail.emissive.toArray()[index]).toBeCloseTo(value, 6));
    expect(head.emissiveIntensity).toBe(CAR_LIGHT_INTENSITY.head);
    expect(tail.emissiveIntensity).toBe(CAR_LIGHT_INTENSITY.tail);
  });

  it("엔딩에서는 불빛을 낮춘다", () => {
    const head = new MeshStandardMaterial();
    const tail = new MeshStandardMaterial();
    applyCarLights([head], [tail], driveAt(1));
    expect(head.emissiveIntensity).toBeCloseTo(CAR_LIGHT_INTENSITY.head * carLightLevel(1), 9);
    expect(tail.emissiveIntensity).toBeCloseTo(CAR_LIGHT_INTENSITY.tail * carLightLevel(1), 9);
  });
});
