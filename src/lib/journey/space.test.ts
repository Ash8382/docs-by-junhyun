import { describe, expect, it } from "vitest";
import { CORRIDOR_START, HALL, corridorProfile, frameAt } from "./corridor";
import { DUST_COUNT, SKY_ROTATION, dustField, seededRandom } from "./space";
import { hallCenter } from "./timeline";

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

  it("별 먼지는 회랑 폭과 전시실 반지름 안에 떠 있다", () => {
    const dust = dustField(DUST_COUNT, 7);
    expect(dust).toHaveLength(DUST_COUNT * 3);
    const center = hallCenter();
    for (let i = 0; i < DUST_COUNT; i++) {
      const [x, y, z] = [dust[3 * i], dust[3 * i + 1], dust[3 * i + 2]];
      expect(y).toBeGreaterThanOrEqual(0.2);
      expect(y).toBeLessThanOrEqual(6.2);
      const inHall = Math.hypot(x - center[0], z - center[2]) <= HALL.radius;
      if (inHall) continue;
      const s = -z;
      expect(s, `먼지 ${i}`).toBeGreaterThanOrEqual(CORRIDOR_START - 0.5);
      const { center: middle } = frameAt(s);
      expect(Math.abs(x - middle[0]), `먼지 ${i}`).toBeLessThanOrEqual(corridorProfile(s).halfWidth + 0.2);
    }
  });

  it("같은 씨앗이면 같은 자리에 먼지를 둔다", () => {
    expect(dustField(50, 3)).toEqual(dustField(50, 3));
  });

  it("하늘 방향은 x축으로 기울여 은하수 띠가 걷는 앞쪽에 오게 한다", () => {
    expect(SKY_ROTATION).toEqual([1.2, 0, 0]);
  });
});
