/**
 * 방 하나의 권위 상태.
 *
 * 시간을 인자로 받고 소켓을 인터페이스 뒤에 두는 이유는 테스트 때문이다.
 * `tick()`은 항상 정확히 SIM_DT_MS만큼 진행한다. 실제 인터벌이 흔들려도
 * 시뮬레이션은 흔들리지 않는다.
 */
import { randomUUID } from "node:crypto";
import {
  ROOM_CAPACITY,
  SAY_COOLDOWN_MS,
  SAY_MAX,
  SIM_DT_MS,
  SNAPSHOT_EVERY_TICKS,
} from "@shared/constants";
import { dirToward, stepMove, type Dir, type Vec2 } from "@shared/physics";
import { NICKNAME_MESSAGES, validateNickname } from "@shared/nickname";
import type { PlayerState, ServerMessage } from "@shared/protocol";
import { isSolidAtPixel, SPAWN } from "@shared/world";
import type { LoungeDb } from "./db";

export interface Connection {
  id: string;
  send(msg: ServerMessage): void;
  close(): void;
}

/** 표준 UUID(8-4-4-4-12 16진수) 형태인지만 본다. 버전·변이 비트는 가리지 않는다 */
const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface Player {
  conn: Connection;
  state: PlayerState;
  /** 마지막으로 처리한 입력 번호 */
  ack: number;
  /** 클릭 이동 목표. 키 입력이 오면 지워진다 */
  target: Vec2 | null;
  lastSayAt: number;
  sessionToken: string;
}

export class Room {
  private players = new Map<string, Player>();
  private tickCount = 0;

  constructor(private db: LoungeDb) {}

  get playerCount(): number {
    return this.players.size;
  }

  get isEmpty(): boolean {
    return this.players.size === 0;
  }

  join(conn: Connection, rawNick: string, sessionToken: string | undefined, now: number): boolean {
    const checked = validateNickname(rawNick);
    if (!checked.ok) {
      conn.send({
        t: "error",
        code: "bad_nickname",
        message: NICKNAME_MESSAGES[checked.error],
      });
      conn.close();
      return false;
    }

    if (this.players.size >= ROOM_CAPACITY) {
      conn.send({
        t: "error",
        code: "room_full",
        message: "지금은 자리가 다 찼어요. 잠시 뒤에 다시 와주세요.",
      });
      conn.close();
      return false;
    }

    // 클라이언트가 보낸 sessionToken은 신뢰할 수 없는 입력이다. UUID 형태가 아니면
    // (서버가 발급한 적 없는 임의의 문자열) 토큰이 없을 때와 똑같이 새로 발급한다.
    // 그러지 않으면 공격자가 매번 다른 문자열을 보내 재접속마다 신규 방문으로
    // 둔갑시킬 수 있고, 그 문자열이 그대로 SQLite의 기본키(최대 1KB)로 쌓여
    // 저장공간을 낭비한다. UUID 형태로 한정하면 저장되는 값은 항상 36바이트로
    // 고정된다.
    const token = sessionToken && UUID_SHAPE.test(sessionToken) ? sessionToken : randomUUID();
    const totalVisitors = this.db.countVisit(token, now);

    const state: PlayerState = {
      id: conn.id,
      nick: checked.nick,
      hue: Math.floor(Math.random() * 360),
      x: SPAWN.x,
      y: SPAWN.y,
      dir: null,
    };

    const player: Player = {
      conn,
      state,
      ack: 0,
      target: null,
      lastSayAt: 0,
      sessionToken: token,
    };

    // welcome을 먼저 보내야 클라이언트가 자기 id를 알고 join을 해석할 수 있다
    conn.send({
      t: "welcome",
      playerId: conn.id,
      sessionToken: token,
      totalVisitors,
      players: [
        this.snapshotOf(state),
        ...[...this.players.values()].map((p) => this.snapshotOf(p.state)),
      ],
    });

    this.broadcast({ t: "join", player: this.snapshotOf(state) });
    this.players.set(conn.id, player);
    return true;
  }

  leave(connId: string): void {
    if (!this.players.delete(connId)) return;
    this.broadcast({ t: "leave", playerId: connId });
  }

  handleInput(connId: string, seq: number, dir: Dir | null): void {
    const p = this.players.get(connId);
    if (!p) return;
    p.state.dir = dir;
    p.target = null; // 키를 누르면 클릭 목표를 버린다
    p.ack = seq;
  }

  handleClick(connId: string, seq: number, x: number, y: number): void {
    const p = this.players.get(connId);
    if (!p) return;
    p.ack = seq;
    // 벽 안쪽이나 맵 밖은 목표로 삼지 않는다
    if (isSolidAtPixel(x, y)) return;
    p.target = { x, y };
  }

  handleSay(connId: string, text: string, now: number): void {
    const p = this.players.get(connId);
    if (!p) return;
    if (now - p.lastSayAt < SAY_COOLDOWN_MS) return;

    const trimmed = text.trim().slice(0, SAY_MAX);
    if (trimmed.length === 0) return;

    p.lastSayAt = now;
    this.sendAll({ t: "say", playerId: connId, text: trimmed });
  }

  tick(): void {
    for (const p of this.players.values()) {
      if (p.target) {
        const dir = dirToward(p.state, p.target);
        p.state.dir = dir;
        if (!dir) p.target = null;
      }
      if (p.state.dir) {
        const next = stepMove(p.state, p.state.dir, SIM_DT_MS);
        p.state.x = next.x;
        p.state.y = next.y;
      }
    }

    this.tickCount++;
    if (this.tickCount % SNAPSHOT_EVERY_TICKS === 0) this.sendSnapshots();
  }

  private sendSnapshots(): void {
    const players = [...this.players.values()].map((p) => this.snapshotOf(p.state));
    for (const p of this.players.values()) {
      p.conn.send({ t: "snapshot", tick: this.tickCount, ack: p.ack, players });
    }
  }

  /**
   * `Room`이 내보내는 상태는 살아있는 객체가 아니어야 한다. `tick()`이 제자리에서
   * 좌표를 바꾸기 때문에 받은 쪽이 나중에 읽으면 과거가 아니라 현재 값을 보게 된다.
   */
  private snapshotOf(state: PlayerState): PlayerState {
    return { ...state };
  }

  /**
   * 전부에게 보낸다. `sendAll`과 본문이 완전히 같다 — 둘 다 `this.players`에
   * 지금 들어있는 모두에게 보낼 뿐, 보낸 사람을 걸러내는 로직은 없다.
   *
   * 이름이 "보낸 사람을 뺀 나머지"처럼 들리지만 그런 뜻이 아니다. `join()`에서
   * 쓸 때 신규 입장자가 자기 자신의 join 알림을 못 받는 건, 이 함수를 호출하는
   * 시점에 그 사람이 아직 `this.players`에 없기 때문이다(호출 다음 줄에서야
   * `this.players.set`이 실행된다). 즉 제외는 **호출 순서가 만든 결과**이고
   * `broadcast` 자신의 동작이 아니다. `leave()`도 같은 이유로, 나가는 사람을
   * 먼저 지운 뒤에 호출한다.
   *
   * 그래서 앞으로 진짜 "보낸 사람만 빼고" 보내야 하는 호출자가 생기면(예: 4단계
   * 이모트 — 본인이 이모트를 누른 걸 자기 화면에 다시 받으면 안 되는 경우),
   * 이 함수에 기대지 말고 그 호출부에서 직접 걸러야 한다. 두 이름이 나뉜 건
   * 호출부 의도를 읽기 쉽게 하려는 것뿐, 실제 동작은 `sendAll`과 하나다.
   */
  private broadcast(msg: ServerMessage): void {
    for (const p of this.players.values()) p.conn.send(msg);
  }

  /** 전부에게 보낸다. `broadcast`와 본문이 완전히 같다 — 위 설명 참조 */
  private sendAll(msg: ServerMessage): void {
    for (const p of this.players.values()) p.conn.send(msg);
  }
}
