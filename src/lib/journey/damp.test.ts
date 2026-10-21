import { describe, expect, it } from "vitest";
import { damp, damp3, dampFactor } from "./damp";

describe("감쇠", () => {
  it("60Hz와 120Hz에서 같은 시간이 흐르면 결과가 같다", () => {
    let at60 = 0;
    for (let frame = 0; frame < 60; frame += 1) at60 = damp(at60, 10, 5, 1 / 60);
    let at120 = 0;
    for (let frame = 0; frame < 120; frame += 1) at120 = damp(at120, 10, 5, 1 / 120);
    expect(at60).toBeCloseTo(at120, 10);
    expect(at60).toBeCloseTo(10 * (1 - Math.exp(-5)), 10);
  });

  it("시간이 흐르지 않으면 움직이지 않는다", () => {
    expect(dampFactor(5, 0)).toBe(0);
    expect(damp(3, 10, 5, 0)).toBe(3);
  });

  it("damp3도 프레임 간격과 무관하다", () => {
    const at60 = { x: 0, y: 0, z: 0 };
    for (let frame = 0; frame < 60; frame += 1) damp3(at60, [1, 2, 3], 4, 1 / 60);
    const at120 = { x: 0, y: 0, z: 0 };
    for (let frame = 0; frame < 120; frame += 1) damp3(at120, [1, 2, 3], 4, 1 / 120);
    expect(at60.x).toBeCloseTo(at120.x, 10);
    expect(at60.y).toBeCloseTo(at120.y, 10);
    expect(at60.z).toBeCloseTo(at120.z, 10);
  });
});
