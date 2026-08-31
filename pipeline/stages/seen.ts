import { findSeen, markSeen } from "../../src/lib/ai-daily/db";
import type { NormalizedItem } from "../types";

/**
 * 전에 평가해본 항목을 걷어낸다.
 *
 * 이게 GitHub 급상승이나 HF 트렌딩처럼 "발행일이 신호가 아닌" 소스를 감당하는 장치다.
 * 저기는 매일 거의 같은 목록을 주는데, 한 번 본 URL을 기억해두면 둘째 날부터는
 * 새로 올라온 것만 남는다. 최신성 필터가 저 소스들을 면제한 이유가 여기에 있다.
 *
 * 기록은 탈락한 것까지 남긴다. 그래야 오늘 점수 미달로 떨어진 항목을
 * 내일 다시 모델에 태우지 않는다.
 */

export interface SeenOutcome {
  fresh: NormalizedItem[];
  alreadySeen: number;
}

export async function filterUnseen(
  items: NormalizedItem[],
): Promise<SeenOutcome> {
  if (items.length === 0) return { fresh: [], alreadySeen: 0 };

  const seen = await findSeen(items.map((item) => item.urlKey));
  const fresh = items.filter((item) => !seen.has(item.urlKey));

  return { fresh, alreadySeen: items.length - fresh.length };
}

export async function recordSeen(items: NormalizedItem[]): Promise<number> {
  return markSeen(
    items.map((item) => ({ urlKey: item.urlKey, source: item.source })),
  );
}
