/**
 * 쉼터 게임 서버.
 *
 * 아무도 없으면 tick 인터벌을 멈춘다. 유휴 상태에서 CPU를 태우지 않기 위해서다.
 * (Oracle의 유휴 인스턴스 회수는 CPU를 태워서가 아니라 Pay As You Go 업그레이드로 푼다.)
 */
import { WebSocketServer } from "ws";
import { SIM_DT_MS } from "@shared/constants";
import { openDb } from "./db";
import { Room } from "./room";
import { attachWebSocketServer, MAX_PAYLOAD } from "./net";

export function startServer(opts: { port: number; dbPath: string }) {
  const db = openDb(opts.dbPath);
  const room = new Room(db);
  const wss = new WebSocketServer({ port: opts.port, maxPayload: MAX_PAYLOAD });

  attachWebSocketServer(wss, room);

  let timer: NodeJS.Timeout | null = null;

  // 빈 방이면 시뮬레이션을 돌릴 이유가 없다
  const supervise = setInterval(() => {
    if (!room.isEmpty && timer === null) {
      timer = setInterval(() => room.tick(), SIM_DT_MS);
    } else if (room.isEmpty && timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  }, 200);

  return {
    port: opts.port,
    async close() {
      clearInterval(supervise);
      if (timer) clearInterval(timer);
      // wss.close()는 붙어 있는 소켓을 끊지 않아서, 클라이언트가 남아 있으면 콜백이 오지 않는다.
      for (const client of wss.clients) client.terminate();
      await new Promise<void>((resolve) => wss.close(() => resolve()));
      db.close();
    },
  };
}

const isMain = process.argv[1]?.endsWith("index.ts");
const port = Number(process.env.LOUNGE_PORT ?? 8787);
const dbPath = process.env.LOUNGE_DB ?? "./server/lounge.db";

// 반환값을 버리면 앞서 만든 close() 경로를 아무도 부를 수 없다. 모듈 최상위
// const로 받아둬서 나중에(예: 2단계의 SIGINT/SIGTERM 핸들러) 참조할 수 있게
// 한다. 신호 처리 자체는 2단계 몫이라 여기서는 참조만 살려둔다.
const server = isMain ? startServer({ port, dbPath }) : undefined;

if (isMain) {
  console.log(`쉼터 서버가 ws://localhost:${port} 에서 대기 중`);
}

export { server };
