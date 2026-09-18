import { describe, expect, it } from "vitest";
import { MAP_H, MAP_W, TILE } from "@shared/constants";
import { isSolidAtPixel, isSolidTile, objectAt, OBJECTS, SPAWN } from "@shared/world";

describe("world", () => {
  it("맵 바깥은 막혀 있다", () => {
    expect(isSolidTile(-1, 5)).toBe(true);
    expect(isSolidTile(MAP_W, 5)).toBe(true);
    expect(isSolidTile(5, -1)).toBe(true);
    expect(isSolidTile(5, MAP_H)).toBe(true);
  });

  it("테두리는 벽이다", () => {
    expect(isSolidTile(0, 0)).toBe(true);
    expect(isSolidTile(MAP_W - 1, MAP_H - 1)).toBe(true);
  });

  it("스폰 지점은 서 있을 수 있는 곳이다", () => {
    expect(isSolidAtPixel(SPAWN.x, SPAWN.y)).toBe(false);
  });

  it("오브젝트가 놓인 타일은 막혀 있다", () => {
    for (const obj of OBJECTS) {
      expect(isSolidTile(obj.tx, obj.ty)).toBe(true);
    }
  });

  it("오브젝트 타일을 조회할 수 있다", () => {
    const first = OBJECTS[0];
    expect(objectAt(first.tx, first.ty)?.id).toBe(first.id);
    expect(objectAt(-1, -1)).toBeNull();
  });

  it("픽셀 좌표를 타일로 환산한다", () => {
    // 타일 (0,0)은 벽이므로 그 안의 어떤 픽셀도 막혀 있다
    expect(isSolidAtPixel(TILE - 1, TILE - 1)).toBe(true);
  });

  it("오브젝트 id는 중복되지 않는다", () => {
    const ids = OBJECTS.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
