import { describe, expect, it } from "vitest";
import { ATMOSPHERES, atmosphereAt, mixAtmosphere } from "./atmosphere";
import { OVERVIEW_ARRIVAL, rangeOf } from "./timeline";

function middle(id: string): number {
  const range = rangeOf(id);
  return (range.start + range.end) / 2;
}

describe("분위기", () => {
  it("세 막의 한가운데에서는 그 막의 값 그대로다", () => {
    expect(atmosphereAt(middle("kokoa-clone"))).toEqual(ATMOSPHERES.wire);
    expect(atmosphereAt(middle("tix2u"))).toEqual(ATMOSPHERES.clay);
    expect(atmosphereAt(middle("pickcare"))).toEqual(ATMOSPHERES.final);
  });

  it("엔딩 끝에서는 내려다보는 값이다", () => {
    expect(atmosphereAt(1)).toEqual(ATMOSPHERES.overview);
  });

  it("카메라가 내려다보기를 마치는 순간 분위기도 내려다보는 값이다", () => {
    const ending = rangeOf("ending");
    expect(atmosphereAt(ending.start + (ending.end - ending.start) * OVERVIEW_ARRIVAL)).toEqual(ATMOSPHERES.overview);
  });

  it("엔딩은 3막 값에서 출발한다(위로 빠지는 동안 앞 막의 색이 비치지 않는다)", () => {
    expect(atmosphereAt(rangeOf("ending").start)).toEqual(ATMOSPHERES.final);
  });

  it("막 경계에서는 두 막 사이 값이다", () => {
    const edge = atmosphereAt(middle("act-2"));
    expect(edge.fogFar).toBeGreaterThan(ATMOSPHERES.wire.fogFar);
    expect(edge.fogFar).toBeLessThan(ATMOSPHERES.clay.fogFar);
  });

  it("배경이 우주라 안개색은 모두 어둡다(먼 회랑이 은하 앞에서 어둠으로 사라진다)", () => {
    // 1막은 남색 어둠(#070d1c, 파랑 0.11)이라 채널 최댓값 0.15 아래면 어둡다고 본다
    for (const atmosphere of Object.values(ATMOSPHERES)) expect(Math.max(...atmosphere.fogColor)).toBeLessThan(0.15);
  });

  it("엔딩에서 은하가 가장 밝다", () => {
    for (const name of ["wire", "clay", "final"] as const) {
      expect(ATMOSPHERES.overview.galaxy).toBeGreaterThan(ATMOSPHERES[name].galaxy);
    }
  });

  it("섞기는 양 끝에서 원래 값을 돌려준다", () => {
    expect(mixAtmosphere(ATMOSPHERES.wire, ATMOSPHERES.clay, 0)).toEqual(ATMOSPHERES.wire);
    expect(mixAtmosphere(ATMOSPHERES.wire, ATMOSPHERES.clay, 1)).toEqual(ATMOSPHERES.clay);
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
