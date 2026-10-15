import { describe, expect, it } from "vitest";
import { ATMOSPHERES, atmosphereAt, mixAtmosphere } from "./atmosphere";
import { carSAt } from "./drive";
import { OVERVIEW_ARRIVAL, STOP_RANGES, rangeOf } from "./timeline";
import { TRAIL_MIX_END, TRAIL_MIX_START } from "./trail";

function middle(id: string): number {
  const range = rangeOf(id);
  return (range.start + range.end) / 2;
}

describe("분위기", () => {
  it("1막과 3막에서는 그 막의 값 그대로다", () => {
    expect(atmosphereAt(middle("kokoa-clone"))).toEqual(ATMOSPHERES.act1);
    expect(atmosphereAt(middle("pickcare"))).toEqual(ATMOSPHERES.act3);
  });

  it("궤적 색이 보라가 되는 자리에서 2막 값이다", () => {
    let progress = 0;
    while (carSAt(progress) < (TRAIL_MIX_START + TRAIL_MIX_END) / 2) progress += 1e-5;
    const atmosphere = atmosphereAt(progress);
    expect(atmosphere.fogFar).toBeCloseTo(ATMOSPHERES.act2.fogFar, 0);
    expect(atmosphere.galaxy).toBeCloseTo(ATMOSPHERES.act2.galaxy, 2);
  });

  it("엔딩 끝에서는 내려다보는 값이다", () => {
    expect(atmosphereAt(1)).toEqual(ATMOSPHERES.overview);
  });

  it("카메라가 내려다보기를 마치는 순간 분위기도 내려다보는 값이다", () => {
    const ending = rangeOf("ending");
    expect(atmosphereAt(ending.start + (ending.end - ending.start) * OVERVIEW_ARRIVAL)).toEqual(ATMOSPHERES.overview);
  });

  it("엔딩은 3막 값에서 출발한다", () => {
    expect(atmosphereAt(rangeOf("ending").start)).toEqual(ATMOSPHERES.act3);
  });

  it("정류장 경계에서 튀지 않는다", () => {
    for (const range of STOP_RANGES.slice(1)) {
      const before = atmosphereAt(range.start - 1e-7);
      const after = atmosphereAt(range.start + 1e-7);
      expect(Math.abs(before.fogFar - after.fogFar), range.stop.id).toBeLessThan(1e-3);
      expect(Math.abs(before.keyIntensity - after.keyIntensity), range.stop.id).toBeLessThan(1e-4);
    }
  });

  it("배경이 우주라 안개색은 모두 어둡다(먼 길이 은하 앞에서 어둠으로 사라진다)", () => {
    for (const atmosphere of Object.values(ATMOSPHERES)) expect(Math.max(...atmosphere.fogColor)).toBeLessThan(0.15);
  });

  it("엔딩에서 은하가 가장 밝고 주변 빛은 가장 어둡다", () => {
    for (const name of ["act1", "act2", "act3"] as const) {
      expect(ATMOSPHERES.overview.galaxy).toBeGreaterThan(ATMOSPHERES[name].galaxy);
      expect(ATMOSPHERES.overview.keyIntensity).toBeLessThan(ATMOSPHERES[name].keyIntensity);
    }
  });

  it("1막 안개는 주황 기운, 3막 안개는 푸른 기운이다", () => {
    const [r1, , b1] = ATMOSPHERES.act1.fogColor;
    const [r3, , b3] = ATMOSPHERES.act3.fogColor;
    expect(r1).toBeGreaterThan(b1);
    expect(b3).toBeGreaterThan(r3);
  });

  it("섞기는 양 끝에서 원래 값을 돌려준다", () => {
    expect(mixAtmosphere(ATMOSPHERES.act1, ATMOSPHERES.act3, 0)).toEqual(ATMOSPHERES.act1);
    expect(mixAtmosphere(ATMOSPHERES.act1, ATMOSPHERES.act3, 1)).toEqual(ATMOSPHERES.act3);
  });

  it("색은 모두 0~1 sRGB다", () => {
    for (const atmosphere of Object.values(ATMOSPHERES)) {
      for (const color of [atmosphere.fogColor, atmosphere.sky, atmosphere.ground, atmosphere.key]) {
        for (const channel of color) {
          expect(channel).toBeGreaterThanOrEqual(0);
          expect(channel).toBeLessThanOrEqual(1);
        }
      }
    }
  });
});
