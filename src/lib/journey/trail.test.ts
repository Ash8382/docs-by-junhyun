import { describe, expect, it } from "vitest";
import { REVEAL_MIN_GAP, ROAD_END, ROAD_START, carSAt, driveAt } from "./drive";
import { STOP_RANGES, rangeOf } from "./timeline";
import {
  GLOW,
  REVEAL_EDGE,
  STREAK,
  TRAIL_LINEAR,
  TRAIL_MIX_END,
  TRAIL_MIX_START,
  carLightLevel,
  glow,
  hexToLinear,
  streakLength,
  trailColor,
  trailMix,
} from "./trail";

function at(id: string, t: number): number {
  const range = rangeOf(id);
  return range.start + (range.end - range.start) * t;
}

describe("궤적 색", () => {
  it("1막은 주황, 3막은 파랑, 2막 가운데는 보라다", () => {
    expect(trailColor(carSAt(at("todo-app", 0.5)))).toEqual(TRAIL_LINEAR.start);
    expect(trailColor(carSAt(at("pickcare", 0.5)))).toEqual(TRAIL_LINEAR.end);
    for (const [index, value] of trailColor((TRAIL_MIX_START + TRAIL_MIX_END) / 2).entries()) {
      expect(value).toBeCloseTo(TRAIL_LINEAR.middle[index], 9);
    }
  });

  it("전환은 2막 진입에서 시작해 3막 진입에서 끝난다", () => {
    expect(trailMix(TRAIL_MIX_START)).toBe(0);
    expect(trailMix(TRAIL_MIX_END)).toBe(1);
    expect(trailMix(TRAIL_MIX_START + 1)).toBeGreaterThan(0);
    expect(trailMix(carSAt(at("act-2", 0)))).toBe(0);
    expect(carSAt(at("act-2", 0))).toBeCloseTo(TRAIL_MIX_START, 9);
    expect(carSAt(at("act-3", 0))).toBeCloseTo(TRAIL_MIX_END, 9);
  });

  it("막 경계에서 색이 튀지 않는다", () => {
    const h = 0.1;
    for (let s = ROAD_START; s < ROAD_END; s += h) {
      const a = trailColor(s);
      const b = trailColor(s + h);
      expect(Math.max(...a.map((value, index) => Math.abs(value - b[index]))), `s=${s}`).toBeLessThan(0.01);
    }
  });

  it("16진 색을 선형으로 바꾼다", () => {
    expect(hexToLinear("#ffffff")).toEqual([1, 1, 1]);
    expect(hexToLinear("#000000")).toEqual([0, 0, 0]);
    expect(hexToLinear("#808080")[0]).toBeCloseTo(0.2158605, 6);
  });
});

describe("발광", () => {
  const carS = 100;

  it("차가 지나지 않은 길은 희미하다", () => {
    expect(glow(carS + 0.01, carS, 0)).toBe(GLOW.dim);
    expect(glow(carS + 40, carS, 0)).toBe(GLOW.dim);
  });

  it("차가 지나간 길은 선명하다", () => {
    expect(glow(carS - GLOW.fill, carS, 0)).toBe(GLOW.full);
    expect(glow(carS - 80, carS, 0)).toBe(GLOW.full);
  });

  it("차 바로 뒤에서 서서히 차오른다", () => {
    let previous: number = GLOW.dim;
    for (let back = 0.5; back < GLOW.fill; back += 0.5) {
      const value = glow(carS - back, carS, 0);
      expect(value).toBeGreaterThan(previous);
      expect(value).toBeLessThan(GLOW.full);
      previous = value;
    }
  });

  it("엔딩에서는 열린 길 전체가 선명하다", () => {
    for (const s of [carS - 50, carS, carS + 50]) expect(glow(s, carS, 1)).toBe(GLOW.full);
    expect(glow(carS + 50, carS, 0.5)).toBeCloseTo((GLOW.dim + GLOW.full) / 2, 9);
  });

  it("진행률이 이어지면 발광도 이어진다(막·정류장 경계)", () => {
    const s = 150;
    for (const range of STOP_RANGES.slice(1)) {
      const before = driveAt(range.start - 1e-7);
      const after = driveAt(range.start + 1e-7);
      expect(Math.abs(glow(s, before.carS, before.ending) - glow(s, after.carS, after.ending)), range.stop.id).toBeLessThan(1e-4);
    }
  });
});

describe("열린 끝 경계선", () => {
  it("노이즈로 흔들려도 차와 최소 간격 이상 떨어져 있다", () => {
    for (let p = 0; p <= 1; p += 1 / 4000) {
      const { carS, revealS } = driveAt(p);
      expect(revealS - REVEAL_EDGE.amplitude - carS, `p=${p}`).toBeGreaterThanOrEqual(REVEAL_MIN_GAP);
    }
  });
});

describe("빛줄기와 차 불빛", () => {
  it("정속에서 정해진 길이이고, 출발선·정류장 한가운데·엔딩에서는 없다", () => {
    expect(streakLength(at("kokoa-clone", 0.5))).toBeCloseTo(STREAK.length, 6);
    expect(streakLength(0)).toBeLessThan(0.1);
    for (const id of ["stock2u", "tix2u", "pfplay", "pickcare"]) expect(streakLength(at(id, 0.5)), id).toBe(0);
    expect(streakLength(at("ending", 0.3))).toBe(0);
  });

  it("정류장에 들어가고 머물고 나오는 동안 길이가 이어진다", () => {
    // 진행률 1/10000(화면 약 0.002개)마다 본다
    for (const id of ["stock2u", "tix2u", "pfplay", "pickcare"]) {
      const range = rangeOf(id);
      let previous = streakLength(range.start);
      for (let p = range.start + 1e-4; p <= range.end; p += 1e-4) {
        const value = streakLength(p);
        expect(Math.abs(value - previous), `${id} p=${p.toFixed(4)}`).toBeLessThan(0.15);
        previous = value;
      }
    }
  });

  it("길이는 상한을 넘지 않는다", () => {
    for (let p = 0; p <= 1; p += 0.0005) expect(streakLength(p)).toBeLessThanOrEqual(STREAK.length * STREAK.maxSpeed);
  });

  it("엔딩에서 차 불빛을 낮춘다", () => {
    expect(carLightLevel(0)).toBe(1);
    expect(carLightLevel(1)).toBeLessThan(0.5);
  });
});
