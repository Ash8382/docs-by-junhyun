/**
 * 서버와 클라이언트가 주고받는 메시지.
 *
 * 1단계는 JSON이고 스냅샷에 전체 플레이어가 들어간다.
 * 델타와 바이너리 인코딩은 3단계에서 이 파일을 고쳐 넣는다.
 *
 * 클라이언트는 자기 위치를 보내지 않는다. 의도만 보내고 위치는 서버가 정한다.
 * `click`의 좌표는 "여기 있다"가 아니라 "저기로 가고 싶다"는 목표다.
 */
import { isDir, type Dir } from "@shared/physics";

export interface PlayerState {
  id: string;
  nick: string;
  /** 아바타 색상 0~359 */
  hue: number;
  x: number;
  y: number;
  dir: Dir | null;
}

export type ErrorCode = "bad_nickname" | "room_full" | "bad_message";

export type ClientMessage =
  | { t: "hello"; nick: string; sessionToken?: string }
  | { t: "input"; seq: number; dir: Dir | null }
  | { t: "click"; seq: number; x: number; y: number }
  | { t: "say"; text: string }
  | { t: "interact"; objectId: string };

export type ServerMessage =
  | {
      t: "welcome";
      playerId: string;
      sessionToken: string;
      totalVisitors: number;
      players: PlayerState[];
    }
  | { t: "snapshot"; tick: number; ack: number; players: PlayerState[] }
  | { t: "join"; player: PlayerState }
  | { t: "leave"; playerId: string }
  | { t: "say"; playerId: string; text: string }
  | { t: "error"; code: ErrorCode; message: string };

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/**
 * 신뢰할 수 없는 문자열을 메시지로 바꾼다. 조금이라도 이상하면 null.
 * 서버가 공개 인터넷에서 받는 입력이므로 여기서 막지 못하면 뒤에서 터진다.
 */
export function parseClientMessage(raw: string): ClientMessage | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null) return null;

  const msg = data as Record<string, unknown>;

  switch (msg.t) {
    case "hello": {
      if (typeof msg.nick !== "string") return null;
      if (msg.sessionToken !== undefined && typeof msg.sessionToken !== "string") {
        return null;
      }
      return msg.sessionToken === undefined
        ? { t: "hello", nick: msg.nick }
        : { t: "hello", nick: msg.nick, sessionToken: msg.sessionToken };
    }
    case "input": {
      if (!isFiniteNumber(msg.seq)) return null;
      if (msg.dir !== null && !isDir(msg.dir)) return null;
      return { t: "input", seq: msg.seq, dir: msg.dir as Dir | null };
    }
    case "click": {
      if (!isFiniteNumber(msg.seq)) return null;
      if (!isFiniteNumber(msg.x) || !isFiniteNumber(msg.y)) return null;
      return { t: "click", seq: msg.seq, x: msg.x, y: msg.y };
    }
    case "say": {
      if (typeof msg.text !== "string") return null;
      return { t: "say", text: msg.text };
    }
    case "interact": {
      if (typeof msg.objectId !== "string") return null;
      return { t: "interact", objectId: msg.objectId };
    }
    default:
      return null;
  }
}
