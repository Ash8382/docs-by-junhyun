/**
 * 날짜 처리.
 *
 * 이 파이프라인은 UTC에서 돌고(GitHub Actions, Vercel) 한국 아침에 읽힌다.
 * 오전 7시 KST는 UTC로 전날 22시라, 날짜를 UTC로 계산하면 리포트가 하루씩 밀린다.
 * 그래서 "어느 날짜 리포트인가"는 언제나 서울 기준으로 정한다.
 */

const SEOUL_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** 서울 기준 YYYY-MM-DD */
export function seoulDate(at: Date = new Date()): string {
  return SEOUL_DATE.format(at);
}

/**
 * Postgres의 date 컬럼은 드라이버가 "로컬 자정 Date"로 만들어 준다.
 * KST에서 2026-08-31은 2026-08-30T15:00:00Z가 되므로, toISOString()으로 읽으면 하루가 밀린다.
 * 로컬 연월일로 되읽는 것이 프로세스 타임존과 무관하게 일관된다.
 */
export function toDateOnly(value: unknown): string {
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  return String(value ?? "").slice(0, 10);
}

/** 화면 표기용. 2026-08-31 → 2026.08.31 (월) */
const SEOUL_WEEKDAY = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  weekday: "short",
});

export function formatDigestDate(dateOnly: string): string {
  const [year, month, day] = dateOnly.split("-");
  if (!year || !month || !day) return dateOnly;

  // 정오로 만들어 타임존 보정 때문에 요일이 밀리는 걸 막는다
  const weekday = SEOUL_WEEKDAY.format(new Date(`${dateOnly}T12:00:00+09:00`));
  return `${year}.${month}.${day} (${weekday})`;
}
