import { describe, expect, it } from "vitest";
import { SPEED, TILE } from "@shared/constants";
import { dirToVector, dirToward, isDir, stepMove } from "@shared/physics";

/** 열린 바닥 한가운데. 타일 (20,16) 중앙 */
const OPEN = { x: 20 * TILE + TILE / 2, y: 16 * TILE + TILE / 2 };

describe("physics", () => {
  it("방향 벡터는 항상 단위 길이다", () => {
    for (const dir of ["n", "ne", "e", "se", "s", "sw", "w", "nw"] as const) {
      const v = dirToVector(dir);
      expect(Math.hypot(v.x, v.y)).toBeCloseTo(1, 6);
    }
  });

  it("빈 곳에서 1초 동안 동쪽으로 SPEED만큼 간다", () => {
    let pos = OPEN;
    for (let i = 0; i < 20; i++) pos = stepMove(pos, "e", 50);
    expect(pos.x).toBeCloseTo(OPEN.x + SPEED, 5);
    expect(pos.y).toBeCloseTo(OPEN.y, 5);
  });

  it("대각선도 같은 거리를 간다", () => {
    let pos = OPEN;
    for (let i = 0; i < 20; i++) pos = stepMove(pos, "ne", 50);
    const moved = Math.hypot(pos.x - OPEN.x, pos.y - OPEN.y);
    expect(moved).toBeCloseTo(SPEED, 5);
  });

  it("방향이 없으면 제자리다", () => {
    expect(stepMove(OPEN, null, 50)).toEqual(OPEN);
  });

  it("반환된 벡터/좌표는 내부 상태와 별개의 객체다", () => {
    // dirToVector가 내부 상수를 그대로 내주면, 호출자가 반환값을 바꿨을 때
    // 이후의 모든 호출이 오염된다.
    const v = dirToVector("e");
    v.x = 999;
    expect(dirToVector("e")).toEqual({ x: 1, y: 0 });

    // 방향이 없을 때도 다른 분기처럼 항상 새 객체를 반환해야 한다.
    const pos = { x: 5, y: 5 };
    const result = stepMove(pos, null, 50);
    expect(result).toEqual(pos);
    expect(result).not.toBe(pos);
  });

  it("벽을 향해 계속 걸어도 뚫고 나가지 않는다", () => {
    // 타일 (1,1)에서 서쪽 벽(타일 0)을 향해 간다
    let pos = { x: 1 * TILE + TILE / 2, y: 1 * TILE + TILE / 2 };
    for (let i = 0; i < 100; i++) pos = stepMove(pos, "w", 50);
    expect(pos.x).toBeGreaterThan(TILE);
  });

  it("벽에 대각선으로 부딪히면 벽을 따라 미끄러진다", () => {
    // 왼쪽 벽에 딱 붙어서 북서쪽으로 이동 → x는 막히고 y만 움직여야 한다
    const start = { x: TILE + 11, y: 10 * TILE };
    const after = stepMove(start, "nw", 50);
    expect(after.y).toBeLessThan(start.y);
    expect(after.x).toBeCloseTo(start.x, 5);
  });

  it("목표 방향을 8방향으로 환산한다", () => {
    expect(dirToward({ x: 0, y: 0 }, { x: 100, y: 0 })).toBe("e");
    expect(dirToward({ x: 0, y: 0 }, { x: 0, y: -100 })).toBe("n");
    expect(dirToward({ x: 0, y: 0 }, { x: 100, y: -100 })).toBe("ne");
  });

  it("목표에 이미 도착했으면 방향이 없다", () => {
    expect(dirToward({ x: 10, y: 10 }, { x: 10, y: 10 })).toBeNull();
  });

  it("isDir은 잘못된 값을 걸러낸다", () => {
    expect(isDir("e")).toBe(true);
    expect(isDir("up")).toBe(false);
    expect(isDir(3)).toBe(false);
    expect(isDir(null)).toBe(false);
  });
});
