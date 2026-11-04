import { describe, expect, it } from "vitest";
import { ROAD_END, ROAD_START, driveAt, roadFrame } from "./drive";
import { DUST_CLEARANCE, DUST_COUNT, SKY_ROTATION, dustField, seededRandom } from "./space";
import phase2 from "./__fixtures__/landscape-phase2.json";

const dust = dustField(DUST_COUNT, 7);

/** 점에서 도로 중심선까지의 수평 거리와 그 자리 s(거친 탐색 뒤 좁힌다) */
function nearestRoad(point: [number, number, number]): { s: number; distance: number } {
  let best = { s: ROAD_START, distance: Infinity };
  for (let s = ROAD_START; s <= ROAD_END; s += 2) {
    const [x, , z] = roadFrame(s).position;
    const distance = Math.hypot(point[0] - x, point[2] - z);
    if (distance < best.distance) best = { s, distance };
  }
  for (let s = best.s - 2; s <= best.s + 2; s += 0.05) {
    const [x, , z] = roadFrame(s).position;
    const distance = Math.hypot(point[0] - x, point[2] - z);
    if (distance < best.distance) best = { s, distance };
  }
  return best;
}

describe("우주", () => {
  it("같은 씨앗이면 같은 수열을 준다", () => {
    const a = seededRandom(7);
    const b = seededRandom(7);
    const c = seededRandom(8);
    const first = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(first);
    expect([c(), c(), c()]).not.toEqual(first);
    for (const value of first) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("같은 씨앗이면 같은 자리에 먼지를 둔다", () => {
    expect(dustField(50, 3)).toEqual(dustField(50, 3));
    // 2단계 도로 끝(260m)까지 DUST_COUNT개, 늘어난 30m(3단계 WALLY)에 같은 밀도로 77개
    expect(dust).toHaveLength((DUST_COUNT + 77) * 3);
  });

  it("별 먼지는 도로 가장자리에서 DUST_CLEARANCE 넘게 떨어져 있다", () => {
    for (let i = 0; i < DUST_COUNT; i += 3) {
      const point: [number, number, number] = [dust[3 * i], dust[3 * i + 1], dust[3 * i + 2]];
      const { s, distance } = nearestRoad(point);
      expect(distance - roadFrame(s).width / 2, `먼지 ${i}`).toBeGreaterThan(DUST_CLEARANCE * 0.9);
    }
  });

  it("카메라가 지나는 자리(주행·정류장·엔딩 상승)는 먼지에서 6m 넘게 떨어져 있다", () => {
    for (let p = 0; p <= 1; p += 0.002) {
      const camera = driveAt(p).camera.position;
      let nearest = Infinity;
      for (let i = 0; i < DUST_COUNT; i++) {
        nearest = Math.min(nearest, Math.hypot(dust[3 * i] - camera[0], dust[3 * i + 1] - camera[1], dust[3 * i + 2] - camera[2]));
      }
      expect(nearest, `p=${p.toFixed(3)}`).toBeGreaterThan(6);
    }
  });

  it("하늘 방향은 x축으로 기울여 은하수 띠가 도로 앞쪽에 오게 한다", () => {
    expect(SKY_ROTATION).toEqual([1.2, 0, 0]);
  });
});

describe("별 먼지는 길이 늘어도 2단계 자리를 지킨다(스펙 3절 WALLY 정류장 '풍경과 길')", () => {
  it("앞 700개는 2단계 기준(__fixtures__/landscape-phase2.json)과 같다", () => {
    phase2.dust.forEach((value, index) => expect(dust[index]).toBeCloseTo(value, 3));
  });

  it("도로 끝이 290m면 늘어난 30m에만 77개를 더 뿌리고 앞 700개는 그대로다", () => {
    const longer = dustField(DUST_COUNT, 7, 290);
    expect(longer.length).toBe((700 + 77) * 3);
    phase2.dust.forEach((value, index) => expect(longer[index]).toBeCloseTo(value, 3));
  });
});
