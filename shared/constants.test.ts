import { describe, expect, it } from "vitest";
import {
  MAP_H,
  MAP_W,
  SIM_HZ,
  SNAPSHOT_EVERY_TICKS,
  SNAPSHOT_HZ,
  SIM_DT_MS,
  TILE,
  WORLD_H,
  WORLD_W,
} from "@shared/constants";

describe("constants", () => {
  it("월드 크기는 타일 수 × 타일 크기다", () => {
    expect(WORLD_W).toBe(MAP_W * TILE);
    expect(WORLD_H).toBe(MAP_H * TILE);
  });

  it("스냅샷 주기는 시뮬레이션 틱의 정수배다", () => {
    expect(Number.isInteger(SNAPSHOT_EVERY_TICKS)).toBe(true);
    expect(SNAPSHOT_EVERY_TICKS).toBe(SIM_HZ / SNAPSHOT_HZ);
  });

  it("시뮬레이션 한 틱은 50ms다", () => {
    expect(SIM_DT_MS).toBe(50);
  });
});
