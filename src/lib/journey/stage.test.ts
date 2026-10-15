import { describe, expect, it } from "vitest";
import { ATMOSPHERE_BLEND, STAGE_EDGES, STAGE_EDGE_SOFTNESS, stageAt } from "./stage";
import { pathSpan } from "./timeline";

describe("렌더 단계", () => {
  it("경계는 2막·3막 진입 정류장의 한가운데다", () => {
    const act2 = pathSpan("act-2");
    const act3 = pathSpan("act-3");
    expect(STAGE_EDGES).toEqual([(act2.from + act2.to) / 2, (act3.from + act3.to) / 2]);
  });

  it("입구는 청사진, 2막 한가운데는 클레이, 전시실은 완성품이다", () => {
    expect(stageAt(pathSpan("intro").from, STAGE_EDGE_SOFTNESS)).toBe(0);
    const stock2u = pathSpan("stock2u");
    expect(stageAt((stock2u.from + stock2u.to) / 2, STAGE_EDGE_SOFTNESS)).toBe(1);
    expect(stageAt(pathSpan("pickcare").to, STAGE_EDGE_SOFTNESS)).toBe(2);
  });

  it("경계 위에서는 두 단계의 한가운데다", () => {
    expect(stageAt(STAGE_EDGES[0], ATMOSPHERE_BLEND)).toBeCloseTo(0.5, 10);
    expect(stageAt(STAGE_EDGES[1], ATMOSPHERE_BLEND)).toBeCloseTo(1.5, 10);
  });

  it("회랑을 따라 나아가면 단계는 줄지 않는다", () => {
    let previous = -1;
    for (let s = -5; s <= 60; s += 0.25) {
      const stage = stageAt(s, ATMOSPHERE_BLEND);
      expect(stage, `s=${s}`).toBeGreaterThanOrEqual(previous);
      previous = stage;
    }
  });
});
