/**
 * 클라이언트 쪽 상태.
 *
 * DOM도 WebSocket도 모른다. 서버 메시지와 눌린 키를 받아 화면에 그릴 상태를
 * 만들 뿐이다. 그래서 브라우저 없이 테스트할 수 있다.
 *
 * 1단계에서는 서버가 준 좌표를 그대로 쓴다. 예측과 보간은 3단계다.
 */
import { SAY_TTL_MS } from "@shared/constants";
import type { Dir } from "@shared/physics";
import type { PlayerState, ServerMessage } from "@shared/protocol";

export interface LoungeState {
  myId: string | null;
  players: Map<string, PlayerState>;
  bubbles: Map<string, { text: string; until: number }>;
  totalVisitors: number;
  error: string | null;
}

export function createState(): LoungeState {
  return {
    myId: null,
    players: new Map(),
    bubbles: new Map(),
    totalVisitors: 0,
    error: null,
  };
}

const UP = ["ArrowUp", "KeyW"];
const DOWN = ["ArrowDown", "KeyS"];
const LEFT = ["ArrowLeft", "KeyA"];
const RIGHT = ["ArrowRight", "KeyD"];

const BY_OFFSET: Record<string, Dir> = {
  "0,-1": "n",
  "1,-1": "ne",
  "1,0": "e",
  "1,1": "se",
  "0,1": "s",
  "-1,1": "sw",
  "-1,0": "w",
  "-1,-1": "nw",
};

/** `KeyboardEvent.code` 집합을 8방향 하나로 접는다 */
export function dirFromKeys(keys: Set<string>): Dir | null {
  const held = (codes: string[]) => codes.some((c) => keys.has(c));
  const x = (held(RIGHT) ? 1 : 0) - (held(LEFT) ? 1 : 0);
  const y = (held(DOWN) ? 1 : 0) - (held(UP) ? 1 : 0);
  return BY_OFFSET[`${x},${y}`] ?? null;
}

export function applyServerMessage(
  state: LoungeState,
  msg: ServerMessage,
  now: number,
): LoungeState {
  switch (msg.t) {
    case "welcome":
      return {
        ...state,
        myId: msg.playerId,
        totalVisitors: msg.totalVisitors,
        players: new Map(msg.players.map((p) => [p.id, p])),
        error: null,
      };

    case "snapshot":
      return { ...state, players: new Map(msg.players.map((p) => [p.id, p])) };

    case "join": {
      const players = new Map(state.players);
      players.set(msg.player.id, msg.player);
      return { ...state, players };
    }

    case "leave": {
      const players = new Map(state.players);
      players.delete(msg.playerId);
      const bubbles = new Map(state.bubbles);
      bubbles.delete(msg.playerId);
      return { ...state, players, bubbles };
    }

    case "say": {
      const bubbles = new Map(state.bubbles);
      bubbles.set(msg.playerId, { text: msg.text, until: now + SAY_TTL_MS });
      return { ...state, bubbles };
    }

    case "error":
      return { ...state, error: msg.message };
  }
}
