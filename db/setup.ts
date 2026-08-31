import { readFile } from "node:fs/promises";
import path from "node:path";

import { db } from "../src/lib/ai-daily/db";

/**
 * 스키마를 적용한다.
 *
 *   npm run db:setup
 *
 * 전부 `if not exists`라 여러 번 돌려도 안전하다. 마이그레이션 도구를 얹지 않은 건
 * 테이블이 둘뿐이고, 스키마가 바뀔 때 이 파일을 고쳐 다시 돌리는 편이
 * 버전 테이블을 관리하는 것보다 단순하기 때문이다.
 */

async function main(): Promise<void> {
  const schemaPath = path.join(process.cwd(), "db", "schema.sql");
  const schema = await readFile(schemaPath, "utf-8");

  // HTTP 드라이버는 한 번에 한 문장만 받는다. 스키마에 문자열이나 함수 본문 안의
  // 세미콜론이 없으므로 이 단순한 분리로 충분하다.
  const statements = schema
    .split(";")
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);

  const sql = db();

  for (const statement of statements) {
    const label = statement
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.length > 0 && !line.startsWith("--"));

    await sql.query(statement);
    console.log(`  적용: ${label?.slice(0, 60) ?? statement.slice(0, 60)}`);
  }

  const [{ tables }] = (await sql`
    select count(*)::int as tables
      from information_schema.tables
     where table_schema = 'public'
       and table_name in ('article', 'seen_url')
  `) as { tables: number }[];

  console.log(`\n스키마 적용 완료. 테이블 ${tables}개 확인.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
