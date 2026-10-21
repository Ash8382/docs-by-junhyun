import { describe, expect, it } from "vitest";
import { Box3, BoxGeometry, CylinderGeometry, Group, Matrix4, Mesh, MeshStandardMaterial, ShaderLib, Vector3, type WebGLProgramParametersWithUniforms, type WebGLRenderer } from "three";
import { CAR_LIGHT_INTENSITY, CAR_LIGHT_MATERIALS } from "@/lib/journey/carAsset";
import { driveAt } from "@/lib/journey/drive";
import { rangeOf } from "@/lib/journey/timeline";
import { HEADLIGHT_HEX, carLightLevel, hexToLinear, trailColor } from "@/lib/journey/trail";
import { applyCarLights, applyWheelTravel, injectWheelTurn, placeCar, prepareCar, turnWheelPoint, type CarWheel } from "./carModel";

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
  return { scene, root, paint };
}

const WHEEL_RADIUS = 0.35;
/** 바퀴 축(x)으로 누운 원기둥. glTF 좌표(z가 위)에서 만든다 */
function axle(radius: number, width: number): CylinderGeometry {
  const geometry = new CylinderGeometry(radius, radius, width, 32);
  geometry.rotateZ(Math.PI / 2);
  return geometry;
}

/**
 * 바퀴 넷을 단 가짜 차(실제 모델과 같은 구성): 바퀴 노드(WheelFrontL 등) 아래에 휠(Rim1), 브레이크 디스크(Disc),
 * 캘리퍼(BrakePad, Brake), 이름 없는 타이어 노드(Tireside·Tiretread 두 메시)가 있다. 바퀴 중심은 z = 0.19라 바닥이 차체와 같은 −0.16이다.
 * 앞바퀴는 y = −1.4(정리 뒤 +Z), 왼쪽은 x = +0.8이다. 실제 모델처럼 앞바퀴는 수직축으로 −30° 꺾여 있고(축이 정리 뒤 (0.866, 0, 0.5)),
 * 뒤 오른쪽 바퀴는 노드가 반 바퀴 돌아 있어 바퀴 축(노드의 x)이 −X를 향한다.
 */
function fakeWheelCar() {
  const { scene, root } = fakeCar();
  const rim = material("Rim1");
  const disc = material("Disc");
  const brake = material("Brake");
  const side = material("Tireside");
  const tread = material("Tiretread");
  for (const [name, x, y] of [
    ["WheelFrontL", 0.8, -1.4],
    ["WheelFrontR", -0.8, -1.4],
    ["WheelRearL", 0.8, 1.4],
    ["WheelRearR", -0.8, 1.4],
  ] as const) {
    const wheel = new Group();
    wheel.name = name;
    wheel.position.set(x, y, 0.19);
    if (name.startsWith("WheelFront")) wheel.rotation.z = -Math.PI / 6;
    if (name === "WheelRearR") wheel.rotation.z = Math.PI;
    const parts: [string, Mesh][] = [
      [`${name}Rim`, new Mesh(axle(0.25, 0.2), rim)],
      [`${name}BrakeDisc`, new Mesh(axle(0.18, 0.03), disc)],
      [`${name}BrakePad`, new Mesh(new BoxGeometry(0.05, 0.1, 0.1), brake)],
    ];
    for (const [partName, mesh] of parts) {
      mesh.name = partName;
      wheel.add(mesh);
    }
    parts[2][1].position.set(0, 0, 0.15);
    const tire = new Group();
    tire.add(new Mesh(axle(WHEEL_RADIUS, 0.25), side), new Mesh(axle(WHEEL_RADIUS - 0.01, 0.24), tread));
    wheel.add(tire);
    root.add(wheel);
  }
  return { scene, materials: { rim, disc, brake, side, tread } };
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

describe("바퀴(스크롤로 구른다)", () => {
  function meshOf(car: ReturnType<typeof prepareCar>, materialName: string): Mesh {
    const mesh = car.object.children.find((child) => ((child as Mesh).material as MeshStandardMaterial).name === materialName);
    if (!mesh) throw new Error(`${materialName} 메시가 없습니다`);
    return mesh as Mesh;
  }

  it("바퀴 넷을 찾고, 중심은 바퀴 노드의 원점, 반지름은 타이어 반지름이다(노면에 맞춘 뒤의 자리)", () => {
    const car = prepareCar(fakeWheelCar().scene);
    expect(car.wheels.map((wheel) => wheel.name).sort()).toEqual(["WheelFrontL", "WheelFrontR", "WheelRearL", "WheelRearR"]);
    const front = car.wheels.find((wheel) => wheel.name === "WheelFrontL");
    // glTF (0.8, −1.4, 0.19)가 y 위·앞 +Z로 바뀌고(0.8, 0.19, 1.4) 바닥(−0.16)을 노면에 맞춰 0.16 오른다
    front?.center.forEach((value, index) => expect(value).toBeCloseTo([0.8, 0.35, 1.4][index], 6));
    for (const wheel of car.wheels) expect(wheel.radius, wheel.name).toBeCloseTo(WHEEL_RADIUS, 6);
  });

  it("바퀴 축은 바퀴 노드의 x이고(꺾인 앞바퀴는 꺾인 대로), 앞으로 구르도록 늘 왼쪽(+X)을 향한다", () => {
    const car = prepareCar(fakeWheelCar().scene);
    const axis = (name: string) => car.wheels.find((wheel) => wheel.name === name)?.axis ?? [NaN, NaN, NaN];
    for (const name of ["WheelFrontL", "WheelFrontR"]) {
      axis(name).forEach((value, index) => expect(value, name).toBeCloseTo([Math.cos(Math.PI / 6), 0, 0.5][index], 6));
    }
    for (const name of ["WheelRearL", "WheelRearR"]) axis(name).forEach((value, index) => expect(value, name).toBeCloseTo([1, 0, 0][index], 6));
  });

  it("드로콜은 재질 수 그대로이고, 돌아가는 부품(휠·디스크·타이어)의 정점만 바퀴 중심·반지름을 가진다. 캘리퍼와 차체는 돌지 않는다", () => {
    const car = prepareCar(fakeWheelCar().scene);
    // 차체·헤드라이트·테일라이트 + Rim1·Disc·Brake·Tireside·Tiretread
    expect(car.object.children).toHaveLength(8);
    for (const name of ["Rim1", "Disc", "Tireside", "Tiretread"]) {
      const wheel = meshOf(car, name).geometry.getAttribute("aWheel");
      const axis = meshOf(car, name).geometry.getAttribute("aWheelAxis");
      expect(wheel, name).toBeDefined();
      expect(axis, name).toBeDefined();
      for (let index = 0; index < wheel.count; index++) {
        expect(wheel.getW(index), name).toBeCloseTo(WHEEL_RADIUS, 6);
        expect(axis.getX(index), name).toBeGreaterThan(0.8);
      }
    }
    expect(meshOf(car, "Brake").geometry.getAttribute("aWheel")).toBeUndefined();
    expect(meshOf(car, "Paint").geometry.getAttribute("aWheel")).toBeUndefined();
  });

  it("달린 거리 ÷ 반지름만큼 바퀴 축으로 돈다: 중심과 축 위의 점은 그대로, 2π·반지름이면 한 바퀴, 앞으로 가면 위끝이 굴러가는 쪽(축 × 위)으로, 뒤로 가면 반대로", () => {
    const quarter = (Math.PI / 2) * WHEEL_RADIUS;
    const straight: CarWheel = { name: "WheelRearL", center: [0.8, 0.35, -1.4], axis: [1, 0, 0], radius: WHEEL_RADIUS };
    const top: [number, number, number] = [0.8, 0.35 + WHEEL_RADIUS, -1.4];
    turnWheelPoint(top, straight, quarter).forEach((value, index) => expect(value).toBeCloseTo([0.8, 0.35, -1.4 + WHEEL_RADIUS][index], 9));
    turnWheelPoint(top, straight, -quarter).forEach((value, index) => expect(value).toBeCloseTo([0.8, 0.35, -1.4 - WHEEL_RADIUS][index], 9));
    // 꺾인 앞바퀴: 축 k = (cos30°, 0, sin30°), 위끝은 k × 위 = (−0.5, 0, 0.866) 쪽으로 구른다
    const steered: CarWheel = { name: "WheelFrontL", center: [0.8, 0.35, 1.4], axis: [Math.cos(Math.PI / 6), 0, 0.5], radius: WHEEL_RADIUS };
    const steeredTop: [number, number, number] = [0.8, 0.35 + WHEEL_RADIUS, 1.4];
    turnWheelPoint(steered.center, steered, 3).forEach((value, index) => expect(value).toBeCloseTo(steered.center[index], 9));
    const onAxle: [number, number, number] = [0.8 + 0.1 * steered.axis[0], 0.35, 1.4 + 0.1 * steered.axis[2]];
    turnWheelPoint(onAxle, steered, 3).forEach((value, index) => expect(value).toBeCloseTo(onAxle[index], 9));
    turnWheelPoint(steeredTop, steered, 2 * Math.PI * WHEEL_RADIUS).forEach((value, index) => expect(value).toBeCloseTo(steeredTop[index], 9));
    turnWheelPoint(steeredTop, steered, quarter).forEach((value, index) =>
      expect(value).toBeCloseTo([0.8 - 0.5 * WHEEL_RADIUS, 0.35, 1.4 + Math.cos(Math.PI / 6) * WHEEL_RADIUS][index], 9),
    );
  });

  it("셰이더: three 표준·물리 재질의 정점 셰이더 세 자리(common·beginnormal_vertex·begin_vertex)에 들어가고, 자리가 없으면 알린다", () => {
    for (const source of [ShaderLib.standard.vertexShader, ShaderLib.physical.vertexShader]) {
      const injected = injectWheelTurn(source);
      expect(injected).toContain("attribute vec4 aWheel;");
      expect(injected).toContain("attribute vec3 aWheelAxis;");
      expect(injected).toContain("objectNormal = journeyWheelTurn() * objectNormal;");
      expect(injected).toContain("objectTangent = journeyWheelTurn() * objectTangent;");
      expect(injected).toContain("transformed = aWheel.xyz + journeyWheelTurn() * ( transformed - aWheel.xyz );");
    }
    expect(() => injectWheelTurn("void main() {}")).toThrow("바퀴");
  });

  it("돌아가는 부품의 재질은 같은 거리 uniform과 따로 된 프로그램 열쇠를 쓰고, 캘리퍼·차체 재질은 그대로다", () => {
    const { scene, materials } = fakeWheelCar();
    const car = prepareCar(scene);
    for (const item of [materials.rim, materials.disc, materials.side, materials.tread]) {
      const shader = { uniforms: {}, vertexShader: ShaderLib.standard.vertexShader } as unknown as WebGLProgramParametersWithUniforms;
      item.onBeforeCompile(shader, {} as WebGLRenderer);
      expect(shader.uniforms.uWheelTravel, item.name).toBe(car.wheelTravel);
      expect(item.customProgramCacheKey(), item.name).toBe("journey-wheel");
    }
    expect(materials.brake.customProgramCacheKey()).not.toBe("journey-wheel");
    expect((meshOf(car, "Paint").material as MeshStandardMaterial).customProgramCacheKey()).not.toBe("journey-wheel");
    // ?debug=stats가 장면에서 읽는다
    expect(car.object.userData.wheelTravel).toBe(car.wheelTravel);
  });

  it("거리는 지금 차가 달린 도로 거리(m)다: 정류장에 멈춰 있으면 그대로, 앞으로 스크롤하면 늘고 위로 스크롤하면 준다", () => {
    const car = prepareCar(fakeWheelCar().scene);
    const range = rangeOf("stock2u");
    applyWheelTravel(car, driveAt(range.start + 0.4 * (range.end - range.start)));
    const stopped = car.wheelTravel.value;
    applyWheelTravel(car, driveAt(range.start + 0.6 * (range.end - range.start)));
    expect(car.wheelTravel.value).toBe(stopped);
    applyWheelTravel(car, driveAt(0.2));
    expect(car.wheelTravel.value).toBe(driveAt(0.2).carS);
    applyWheelTravel(car, driveAt(0.1));
    expect(car.wheelTravel.value).toBeLessThan(driveAt(0.2).carS);
  });
});
