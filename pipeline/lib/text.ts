/** 여러 어댑터가 함께 쓰는 문자열·날짜 다듬기. */

/** 요약문에 섞여 오는 마크업을 걷어내고 공백을 정리한다. */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** 소스마다 날짜 형식이 달라서 Date.parse에 맡기고, 못 읽으면 없는 셈 친다. */
export function toIso(value: string | undefined): string | undefined {
  if (!value) return undefined;

  const ms = Date.parse(value);
  return Number.isNaN(ms) ? undefined : new Date(ms).toISOString();
}

export function truncate(value: string | undefined, max: number): string | undefined {
  if (!value) return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;

  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max - 1)}…`;
}

/** GitHub 검색처럼 날짜 문자열이 필요한 곳에 쓴다. */
export function isoDateDaysAgo(days: number): string {
  const date = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 10);
}

/**
 * 콘솔 표 정렬용. 한글은 터미널에서 두 칸을 차지하므로
 * String.padEnd를 그대로 쓰면 한글이 섞인 열이 어긋난다.
 */
export function padDisplay(value: string, width: number): string {
  const printWidth = [...value].reduce(
    (sum, char) => sum + (/[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(char) ? 2 : 1),
    0,
  );
  return value + " ".repeat(Math.max(0, width - printWidth));
}
