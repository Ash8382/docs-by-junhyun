/**
 * 브라우저 WebSocket을 얇게 감싼다.
 *
 * engine을 모른다. 받은 메시지를 그대로 넘길 뿐이고, 무엇을 할지는 호출자가 정한다.
 * 재접속은 3단계에서 여기 붙는다.
 */
import type { ClientMessage, ServerMessage } from "@shared/protocol";

export interface LoungeNet {
  send(msg: ClientMessage): void;
  close(): void;
}

export interface LoungeNetHandlers {
  onOpen(): void;
  onMessage(msg: ServerMessage): void;
  onClose(): void;
}

export function connectLounge(url: string, handlers: LoungeNetHandlers): LoungeNet {
  const socket = new WebSocket(url);

  socket.addEventListener("open", () => handlers.onOpen());
  socket.addEventListener("close", () => handlers.onClose());
  socket.addEventListener("error", () => socket.close());

  socket.addEventListener("message", (event) => {
    try {
      handlers.onMessage(JSON.parse(event.data as string) as ServerMessage);
    } catch {
      // 서버가 보낸 게 깨졌다면 무시한다. 다음 스냅샷이 곧 온다.
    }
  });

  return {
    send(msg) {
      if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(msg));
    },
    close() {
      socket.close();
    },
  };
}
