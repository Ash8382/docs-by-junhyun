/**
 * `ws` 소켓을 Room이 아는 Connection으로 감싼다.
 *
 * Room은 WebSocket을 모르고 여기서는 게임 규칙을 모른다.
 * 레이트리밋과 백프레셔는 3단계에서 이 파일에 들어온다.
 * 1단계에서는 페이로드 크기 상한만 건다 (ws의 maxPayload).
 */
import { randomUUID } from "node:crypto";
import type { IncomingMessage } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { parseClientMessage } from "@shared/protocol";
import type { Connection, Room } from "./room";

/** 클라이언트가 보낼 수 있는 한 메시지의 최대 바이트 */
const MAX_PAYLOAD = 1024;

/** 환경변수가 없을 때 허용하는 기본값 — 로컬 개발용 Next 포트 두 개 */
const DEFAULT_ALLOWED_ORIGINS = "http://localhost:3000,http://localhost:3001";

/**
 * Origin 헤더로 허용된 곳에서 온 연결만 받는다 (스펙 9절).
 *
 * WebSocket은 same-origin policy의 적용을 받지 않아서, 이 검사가 없으면
 * 아무 웹사이트나 스크립트로 이 소켓을 열어 우리 서버에 붙을 수 있다.
 * 허용 목록은 `LOUNGE_ALLOWED_ORIGINS` 환경변수(쉼표 구분)로 받고, 없으면
 * 로컬 개발 기본값을 쓴다.
 *
 * Origin 헤더가 아예 없는 연결은 1단계에서 허용한다. 브라우저는 WebSocket을
 * 열 때 항상 Origin을 보내므로, 헤더가 없다는 건 브라우저가 아닌 클라이언트
 * (검증 스크립트, 서버 간 호출 등)라는 뜻이다. 그런 도구를 막을 이유가 없고,
 * 막으면 이 서버를 확인하는 스크립트까지 전부 깨진다.
 */
function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true;
  const allowed = (process.env.LOUNGE_ALLOWED_ORIGINS ?? DEFAULT_ALLOWED_ORIGINS)
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  return allowed.includes(origin);
}

export function attachWebSocketServer(wss: WebSocketServer, room: Room): void {
  wss.on("connection", (socket: WebSocket, req: IncomingMessage) => {
    const originHeader = req.headers.origin;
    const origin = Array.isArray(originHeader) ? originHeader[0] : originHeader;
    if (!isOriginAllowed(origin)) {
      socket.close();
      return;
    }

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

export { MAX_PAYLOAD, isOriginAllowed };
