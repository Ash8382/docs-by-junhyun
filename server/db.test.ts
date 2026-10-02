import { afterEach, describe, expect, it } from "vitest";
import { VISITOR_DEDUPE_MS } from "@shared/constants";
import { openDb, type LoungeDb } from "./db";

let db: LoungeDb;

afterEach(() => db?.close());

describe("openDb", () => {
  it("처음에는 누적 방문자가 0이다", () => {
    db = openDb(":memory:");
    expect(db.totalVisitors()).toBe(0);
  });

  it("새 세션은 카운트를 올린다", () => {
    db = openDb(":memory:");
    expect(db.countVisit("a", 1000)).toBe(1);
    expect(db.countVisit("b", 1000)).toBe(2);
    expect(db.totalVisitors()).toBe(2);
  });

  it("같은 세션은 24시간 안에 다시 세지 않는다", () => {
    db = openDb(":memory:");
    db.countVisit("a", 1000);
    expect(db.countVisit("a", 1000 + VISITOR_DEDUPE_MS - 1)).toBe(1);
    expect(db.totalVisitors()).toBe(1);
  });

  it("24시간이 지나면 다시 센다", () => {
    db = openDb(":memory:");
    db.countVisit("a", 1000);
    expect(db.countVisit("a", 1000 + VISITOR_DEDUPE_MS)).toBe(2);
  });
});
