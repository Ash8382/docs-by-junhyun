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

    const token = sessionToken || randomUUID();
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

  /** 보낸 사람을 뺀 나머지에게 */
  private broadcast(msg: ServerMessage): void {
    for (const p of this.players.values()) p.conn.send(msg);
  }

  /** 보낸 사람을 포함해 전부에게 */
  private sendAll(msg: ServerMessage): void {
    for (const p of this.players.values()) p.conn.send(msg);
  }
}
