import { beforeEach, describe, expect, it } from "vitest";
import { ROOM_CAPACITY, SPEED, SIM_HZ } from "@shared/constants";
import { SPAWN } from "@shared/world";
import type { ServerMessage } from "@shared/protocol";
import { openDb, type LoungeDb } from "./db";
import { Room, type Connection } from "./room";

class FakeConn implements Connection {
  sent: ServerMessage[] = [];
  closed = false;
  constructor(public id: string) {}
  send(msg: ServerMessage) {
    this.sent.push(msg);
  }
  close() {
    this.closed = true;
  }
  /** 마지막 스냅샷에서 이 플레이어 상태를 찾는다 */
  lastSnapshotOf(playerId: string) {
    const snaps = this.sent.filter((m) => m.t === "snapshot");
    const last = snaps[snaps.length - 1];
    if (!last || last.t !== "snapshot") return undefined;
    return last.players.find((p) => p.id === playerId);
  }
  find<T extends ServerMessage["t"]>(t: T) {
    return this.sent.find((m) => m.t === t) as Extract<ServerMessage, { t: T }> | undefined;
  }
}

let db: LoungeDb;
let room: Room;

beforeEach(() => {
  db = openDb(":memory:");
  room = new Room(db);
});

/** n초만큼 시뮬레이션을 돌린다 */
function runSeconds(n: number) {
  for (let i = 0; i < SIM_HZ * n; i++) room.tick();
}

describe("Room", () => {
  it("입장하면 welcome을 받고 스폰 지점에 선다", () => {
    const conn = new FakeConn("c1");
    expect(room.join(conn, "밤톨", undefined, 1000)).toBe(true);

    const welcome = conn.find("welcome");
    expect(welcome?.playerId).toBe("c1");
    expect(welcome?.totalVisitors).toBe(1);
    expect(welcome?.sessionToken).toBeTruthy();
    expect(welcome?.players[0]).toMatchObject({ nick: "밤톨", x: SPAWN.x, y: SPAWN.y });
  });

  it("잘못된 닉네임은 거부하고 연결을 닫는다", () => {
    const conn = new FakeConn("c1");
    expect(room.join(conn, "!", undefined, 1000)).toBe(false);
    expect(conn.find("error")?.code).toBe("bad_nickname");
    expect(conn.closed).toBe(true);
    expect(room.playerCount).toBe(0);
  });

  it("정원이 차면 거부한다", () => {
    for (let i = 0; i < ROOM_CAPACITY; i++) {
      expect(room.join(new FakeConn(`c${i}`), `사람${i % 10}`, undefined, 1000)).toBe(true);
    }
    const overflow = new FakeConn("over");
    expect(room.join(overflow, "밤톨", undefined, 1000)).toBe(false);
    expect(overflow.find("error")?.code).toBe("room_full");
  });

  it("기존 접속자에게 join을 알린다", () => {
    const a = new FakeConn("a");
    room.join(a, "가가", undefined, 1000);
    const b = new FakeConn("b");
    room.join(b, "나나", undefined, 1000);

    expect(a.find("join")?.player.id).toBe("b");
    expect(b.find("join")).toBeUndefined();
  });

  it("입력한 방향으로 1초에 SPEED만큼 움직인다", () => {
    const conn = new FakeConn("c1");
    room.join(conn, "밤톨", undefined, 1000);
    room.handleInput("c1", 1, "e");
    runSeconds(1);

    const me = conn.lastSnapshotOf("c1");
    expect(me?.x).toBeCloseTo(SPAWN.x + SPEED, 3);
    expect(me?.y).toBeCloseTo(SPAWN.y, 3);
  });

  it("스냅샷은 처리한 마지막 입력 seq를 ack로 돌려준다", () => {
    const conn = new FakeConn("c1");
    room.join(conn, "밤톨", undefined, 1000);
    room.handleInput("c1", 7, "e");
    runSeconds(1);

    const snaps = conn.sent.filter((m) => m.t === "snapshot");
    const last = snaps[snaps.length - 1];
    expect(last.t === "snapshot" && last.ack).toBe(7);
  });

  it("한번 받은 스냅샷의 좌표는 이후 틱이 진행돼도 바뀌지 않는다", () => {
    const conn = new FakeConn("c1");
    room.join(conn, "밤톨", undefined, 1000);
    room.handleInput("c1", 1, "e");
    runSeconds(1);

    const firstSnapshot = conn.lastSnapshotOf("c1");
    const capturedX = firstSnapshot!.x;

    runSeconds(1); // 캡처한 뒤에도 시뮬레이션은 계속 움직인다

    // 살아있는 참조를 내보냈다면 firstSnapshot.x도 여기서 같이 움직였을 것이다
    expect(firstSnapshot!.x).toBe(capturedX);
    expect(conn.lastSnapshotOf("c1")!.x).toBeGreaterThan(capturedX);
  });

  it("클릭 목표에 도착하면 멈춘다", () => {
    const conn = new FakeConn("c1");
    room.join(conn, "밤톨", undefined, 1000);
    room.handleClick("c1", 1, SPAWN.x + 32, SPAWN.y);
    runSeconds(3);

    const me = conn.lastSnapshotOf("c1");
    // 도착 판정에 여유 반경이 있으므로 정확히 목표점에 서지는 않는다
    expect(Math.abs(me!.x - (SPAWN.x + 32))).toBeLessThan(6);
    expect(me?.dir).toBeNull();
  });

  it("벽 안쪽을 클릭하면 무시한다", () => {
    const conn = new FakeConn("c1");
    room.join(conn, "밤톨", undefined, 1000);
    room.handleClick("c1", 1, 8, 8); // 타일 (0,0) — 테두리 벽
    runSeconds(1);

    const me = conn.lastSnapshotOf("c1");
    expect(me?.x).toBeCloseTo(SPAWN.x, 3);
  });

  it("초당 SNAPSHOT_HZ번 스냅샷을 보낸다", () => {
    const conn = new FakeConn("c1");
    room.join(conn, "밤톨", undefined, 1000);
    conn.sent.length = 0;
    runSeconds(1);
    expect(conn.sent.filter((m) => m.t === "snapshot")).toHaveLength(10);
  });

  it("말풍선을 모두에게 전달하고 쿨다운을 건다", () => {
    const a = new FakeConn("a");
    const b = new FakeConn("b");
    room.join(a, "가가", undefined, 1000);
    room.join(b, "나나", undefined, 1000);

    room.handleSay("a", "안녕", 2000);
    expect(b.find("say")).toMatchObject({ playerId: "a", text: "안녕" });

    b.sent.length = 0;
    room.handleSay("a", "또안녕", 2100); // 쿨다운 안
    expect(b.find("say")).toBeUndefined();
  });

  it("말풍선은 길이를 잘라낸다", () => {
    const a = new FakeConn("a");
    room.join(a, "가가", undefined, 1000);
    a.sent.length = 0;
    room.handleSay("a", "가".repeat(100), 2000);
    expect(a.find("say")?.text).toHaveLength(40);
  });

  it("퇴장하면 leave를 알리고 비어 있다고 보고한다", () => {
    const a = new FakeConn("a");
    const b = new FakeConn("b");
    room.join(a, "가가", undefined, 1000);
    room.join(b, "나나", undefined, 1000);
    a.sent.length = 0;

    room.leave("b");
    expect(a.find("leave")?.playerId).toBe("b");
    expect(room.playerCount).toBe(1);

    room.leave("a");
    expect(room.isEmpty).toBe(true);
  });

  it("같은 세션 토큰으로 다시 들어와도 누적 방문자는 그대로다", () => {
    const a = new FakeConn("a");
    room.join(a, "가가", undefined, 1000);
    const token = a.find("welcome")!.sessionToken;
    room.leave("a");

    const b = new FakeConn("b");
    room.join(b, "가가", token, 2000);
    expect(b.find("welcome")?.totalVisitors).toBe(1);
  });

  it("UUID 형태가 아닌 토큰은 버리고 서버가 새 토큰을 발급한다", () => {
    const junk = "공격자가-보낸-임의의-문자열-이건-UUID가-아니다";
    const a = new FakeConn("a");
    room.join(a, "가가", junk, 1000);

    // 보낸 값을 그대로 믹지 않는다 — SQLite에 공격자가 고른 내용이 그대로
    // 기본키로 들어가는 것을 막는다
    const issued = a.find("welcome")!.sessionToken;
    expect(issued).not.toBe(junk);
    expect(issued).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    // 토큰이 없을 때와 똑같이 신규 방문 1건으로만 집계된다 — junk라고 더 늘지 않는다
    expect(a.find("welcome")?.totalVisitors).toBe(1);

    // 같은 junk 문자열을 또 보내도, 그 문자열은 세션으로 기록된 적이 없으므로
    // "돌아온 세션"으로 인식되지 않는다 — 매번 진짜 신규 방문 1회로만 계산된다
    room.leave("a");
    const b = new FakeConn("b");
    room.join(b, "나나", junk, 2000);
    expect(b.find("welcome")?.totalVisitors).toBe(2);
    expect(b.find("welcome")?.sessionToken).not.toBe(junk);
  });
});
