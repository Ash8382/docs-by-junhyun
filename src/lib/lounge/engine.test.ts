import { describe, expect, it } from "vitest";
import { SAY_TTL_MS } from "@shared/constants";
import type { PlayerState } from "@shared/protocol";
import { applyServerMessage, createState, dirFromKeys } from "./engine";

const player = (id: string): PlayerState => ({
  id,
  nick: id,
  hue: 0,
  x: 0,
  y: 0,
  dir: null,
});

describe("dirFromKeys", () => {
  it("방향키와 WASD를 같은 방향으로 본다", () => {
    expect(dirFromKeys(new Set(["ArrowRight"]))).toBe("e");
    expect(dirFromKeys(new Set(["KeyD"]))).toBe("e");
    expect(dirFromKeys(new Set(["ArrowUp"]))).toBe("n");
    expect(dirFromKeys(new Set(["KeyW"]))).toBe("n");
  });

  it("두 키를 함께 누르면 대각선이다", () => {
    expect(dirFromKeys(new Set(["ArrowUp", "ArrowRight"]))).toBe("ne");
    expect(dirFromKeys(new Set(["KeyS", "KeyA"]))).toBe("sw");
  });

  it("반대 방향이 함께 눌리면 상쇄된다", () => {
    expect(dirFromKeys(new Set(["ArrowLeft", "ArrowRight"]))).toBeNull();
    expect(dirFromKeys(new Set(["ArrowLeft", "ArrowRight", "ArrowUp"]))).toBe("n");
  });

  it("아무것도 안 눌렸으면 null이다", () => {
    expect(dirFromKeys(new Set())).toBeNull();
    expect(dirFromKeys(new Set(["Space", "KeyQ"]))).toBeNull();
  });
});

describe("applyServerMessage", () => {
  it("welcome으로 내 id와 누적 방문자를 채운다", () => {
    const s = applyServerMessage(
      createState(),
      {
        t: "welcome",
        playerId: "me",
        sessionToken: "tok",
        totalVisitors: 7,
        players: [player("me"), player("other")],
      },
      0,
    );
    expect(s.myId).toBe("me");
    expect(s.totalVisitors).toBe(7);
    expect(s.players.size).toBe(2);
  });

  it("snapshot이 플레이어 목록을 통째로 대체한다", () => {
    let s = applyServerMessage(
      createState(),
      { t: "welcome", playerId: "me", sessionToken: "t", totalVisitors: 1, players: [player("me"), player("gone")] },
      0,
    );
    s = applyServerMessage(s, { t: "snapshot", tick: 2, ack: 0, players: [player("me")] }, 0);
    expect([...s.players.keys()]).toEqual(["me"]);
  });

  it("join과 leave가 목록을 갱신한다", () => {
    let s = createState();
    s = applyServerMessage(s, { t: "join", player: player("a") }, 0);
    expect(s.players.has("a")).toBe(true);
    s = applyServerMessage(s, { t: "leave", playerId: "a" }, 0);
    expect(s.players.has("a")).toBe(false);
  });

  it("퇴장하면 말풍선도 지운다", () => {
    let s = applyServerMessage(createState(), { t: "join", player: player("a") }, 0);
    s = applyServerMessage(s, { t: "say", playerId: "a", text: "안녕" }, 1000);
    expect(s.bubbles.get("a")?.until).toBe(1000 + SAY_TTL_MS);
    s = applyServerMessage(s, { t: "leave", playerId: "a" }, 1000);
    expect(s.bubbles.has("a")).toBe(false);
  });

  it("error를 상태에 남긴다", () => {
    const s = applyServerMessage(
      createState(),
      { t: "error", code: "room_full", message: "자리가 다 찼어요." },
      0,
    );
    expect(s.error).toBe("자리가 다 찼어요.");
  });
});
