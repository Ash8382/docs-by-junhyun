import type { NormalizedItem, SourceAdapter } from "../types";

/**
 * 오래된 항목을 걷어낸다.
 *
 * RSS는 "최근 N건"을 주지 사실 최근 N일치를 주지 않는다. 발행이 뜸한 블로그는
 * 25건이 두 달치라, 이 필터가 없으면 데일리 리포트 후보에 6월 글이 섞여 들어온다.
 *
 * 다만 GitHub 급상승이나 HF 트렌딩 모델은 기준이 다르다. 저기서 중요한 건 발행일이 아니라
 * "우리가 전에 본 적 있는가"이고, 그건 seen_url 테이블이 판단한다. 그래서 면제한다.
 */

const DEFAULT_MAX_AGE_DAYS = 7;

export interface RecencyOutcome {
  kept: NormalizedItem[];
  dropped: NormalizedItem[];
  maxAgeDays: number;
}

export function filterRecent(
  items: NormalizedItem[],
  adapters: SourceAdapter[],
): RecencyOutcome {
  const configured = Number(process.env.PIPELINE_MAX_AGE_DAYS);
  const maxAgeDays =
    Number.isFinite(configured) && configured > 0
      ? configured
      : DEFAULT_MAX_AGE_DAYS;

  const exempt = new Set(
    adapters.filter((a) => a.ignoreRecency).map((a) => a.id),
  );
  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;

  const kept: NormalizedItem[] = [];
  const dropped: NormalizedItem[] = [];

  for (const item of items) {
    // 날짜를 모르는 항목은 버리지 않는다. 판단 근거가 없는 것과 오래된 것은 다르다.
    if (exempt.has(item.source) || !item.publishedAt) {
      kept.push(item);
      continue;
    }

    const publishedMs = Date.parse(item.publishedAt);
    if (Number.isNaN(publishedMs) || publishedMs >= cutoff) {
      kept.push(item);
    } else {
      dropped.push(item);
    }
  }

  return { kept, dropped, maxAgeDays };
}
