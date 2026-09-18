/**
 * 쉼터의 저장소.
 *
 * Node 24 내장 `node:sqlite`를 쓴다. better-sqlite3 같은 네이티브 모듈을 피하면
 * 2단계의 ARM Docker 빌드에 컴파일 단계가 생기지 않는다. 실험적 기능이라
 * 실행 시 경고가 뜨는데 동작에는 문제가 없다.
 */
import { DatabaseSync } from "node:sqlite";
import { VISITOR_DEDUPE_MS } from "@shared/constants";

export interface LoungeDb {
  totalVisitors(): number;
  /** 방문을 세고 갱신된 누적 수를 돌려준다 */
  countVisit(sessionToken: string, now: number): number;
  close(): void;
}

export function openDb(path: string): LoungeDb {
  const db = new DatabaseSync(path);

  db.exec(`
    CREATE TABLE IF NOT EXISTS visitors (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      total INTEGER NOT NULL DEFAULT 0
    );
    INSERT OR IGNORE INTO visitors (id, total) VALUES (1, 0);

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      last_counted_at INTEGER NOT NULL
    );
  `);

  const selectTotal = db.prepare("SELECT total FROM visitors WHERE id = 1");
  const selectSession = db.prepare(
    "SELECT last_counted_at FROM sessions WHERE token = ?",
  );
  const bumpTotal = db.prepare("UPDATE visitors SET total = total + 1 WHERE id = 1");
  const upsertSession = db.prepare(`
    INSERT INTO sessions (token, last_counted_at) VALUES (?, ?)
    ON CONFLICT (token) DO UPDATE SET last_counted_at = excluded.last_counted_at
  `);

  function totalVisitors(): number {
    return Number((selectTotal.get() as { total: number }).total);
  }

  return {
    totalVisitors,

    countVisit(sessionToken: string, now: number): number {
      const row = selectSession.get(sessionToken) as
        | { last_counted_at: number }
        | undefined;

      const isNew = !row || now - Number(row.last_counted_at) >= VISITOR_DEDUPE_MS;
      if (isNew) {
        bumpTotal.run();
        upsertSession.run(sessionToken, now);
      }
      return totalVisitors();
    },

    close() {
      db.close();
    },
  };
}
