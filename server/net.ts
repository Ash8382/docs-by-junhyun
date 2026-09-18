/**
 * `ws` 소켓을 Room이 아는 Connection으로 감싼다.
 *
 * Room은 WebSocket을 모르고 여기서는 게임 규칙을 모른다.
 * 레이트리밋과 백프레셔는 3단계에서 이 파일에 들어온다.
 * 1단계에서는 페이로드 크기 상한만 건다 (ws의 maxPayload).
 */
import { randomUUID } from "node:crypto";
import { WebSocketServer, type WebSocket } from "ws";
import { parseClientMessage } from "@shared/protocol";
import type { Connection, Room } from "./room";

/** 클라이언트가 보낼 수 있는 한 메시지의 최대 바이트 */
const MAX_PAYLOAD = 1024;

export function attachWebSocketServer(wss: WebSocketServer, room: Room): void {
  wss.on("connection", (socket: WebSocket) => {
    const id = randomUUID();
    let joined = false;

    const conn: Connection = {
      id,
      send(msg) {
        if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(msg));
      },
      close() {
        socket.close();
      },
    };

    socket.on("message", (raw) => {
      const msg = parseClientMessage(raw.toString());
      if (!msg) {
        conn.send({ t: "error", code: "bad_message", message: "이해할 수 없는 요청이에요." });
        socket.close();
        return;
      }

      try {
        // hello 전에는 아무것도 받지 않는다
        if (!joined) {
          if (msg.t !== "hello") {
            socket.close();
            return;
          }
          joined = room.join(conn, msg.nick, msg.sessionToken, Date.now());
          return;
        }

        switch (msg.t) {
          case "hello":
            break; // 두 번째 hello는 무시
          case "input":
            room.handleInput(id, msg.seq, msg.dir);
            break;
          case "click":
            room.handleClick(id, msg.seq, msg.x, msg.y);
            break;
          case "say":
            room.handleSay(id, msg.text, Date.now());
            break;
          case "interact":
            // 1단계에서 오브젝트 조사는 클라이언트가 혼자 처리한다.
            // 서버 상태가 걸리는 상호작용(모닥불, 라디오)은 4단계에서 여기 붙는다.
            break;
        }
      } catch (err) {
        // 이 소켓 하나의 오류로 방 전체가 죽으면 안 된다 — 이 소켓만 끊는다.
        console.error("메시지 처리 중 오류:", err);
        socket.close();
      }
    });

    socket.on("close", () => {
      if (joined) room.leave(id);
    });

    socket.on("error", () => socket.close());
  });
}

export { MAX_PAYLOAD };
