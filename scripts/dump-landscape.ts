import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { ROAD_END } from "@/lib/journey/drive";
import { buildLandscape } from "@/lib/journey/landscapeBuild";
import { DUST_COUNT, dustField } from "@/lib/journey/space";

/**
 * 풍경 배치와 별 먼지 자리를 JSON으로 남긴다. 길이 늘어도(3단계 WALLY) 기존 배치가 움직이지 않는지 테스트가 이 기준과 비교한다
 * (스펙 3절 "WALLY 정류장 (3단계)"의 "풍경과 길"). 좌표는 소수 넷째 자리로 반올림한다. 별 먼지 시드는 장면(scene/Dust.tsx)과 같은 7이다.
 *
 * 사용법: npx tsx scripts/dump-landscape.ts src/lib/journey/__fixtures__/landscape-phase2.json
 */
const DUST_SEED = 7;

const round = (value: number) => Math.round(value * 1e4) / 1e4;
const vec = (values: readonly number[]) => values.map(round);

async function main() {
  const output = process.argv[2];
  if (!output) throw new Error("저장할 JSON 경로를 주세요");
  const pieces = buildLandscape().map((piece) => ({
    name: piece.name,
    items: piece.items.map((item) => ({ kind: item.kind, min: vec(item.min), max: vec(item.max) })),
    excluded: piece.excluded.map((item) => ({ kind: item.kind, reason: item.reason, point: vec(item.point) })),
  }));
  const dust = Array.from(dustField(DUST_COUNT, DUST_SEED), round);
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify({ roadEnd: ROAD_END, pieces, dust })}\n`);
  const items = pieces.reduce((sum, piece) => sum + piece.items.length, 0);
  const excluded = pieces.reduce((sum, piece) => sum + piece.excluded.length, 0);
  console.log(`${output}: 도로 끝 ${ROAD_END}, 조각 ${pieces.length}, 요소 ${items}, 뺀 요소 ${excluded}, 별 먼지 ${dust.length / 3}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
