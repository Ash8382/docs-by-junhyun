/**
 * 파이프라인 전 단계가 공유하는 타입.
 *
 * 수집처마다 응답 모양이 제각각이라(RSS, JSON API, HTML) 어댑터가 RawItem 하나로
 * 흡수한 뒤부터는 아래 단계들이 소스를 몰라도 되게 만든다.
 */

/** 어댑터가 돌려주는 원본 항목 */
export interface RawItem {
  title: string;
  url: string;
  summary?: string;
  /** ISO 8601. 소스가 날짜를 안 주면 생략 */
  publishedAt?: string;
  author?: string;
  /** 랭킹 단계에서 쓸 소스별 신호 (stars, likes, points 등) */
  meta?: Record<string, string | number>;
}

/** 수집 러너가 출처를 붙인 항목 */
export interface CollectedItem extends RawItem {
  source: string;
  sourceLabel: string;
}

/** URL 정규화까지 끝난 항목 */
export interface NormalizedItem extends CollectedItem {
  /** 정규화된 URL. 중복 판정과 seen 기록의 기준이 된다 */
  urlKey: string;
  /** urlKey 해시. DB 기본키로 쓴다 */
  id: string;
}

export interface SourceAdapter {
  id: string;
  label: string;
  /**
   * 이 소스는 AI 도메인 전용이라 관련성 필터를 건너뛴다.
   * 공식 블로그나 HF처럼 애초에 AI 얘기만 올라오는 곳.
   */
  alwaysRelevant?: boolean;
  /**
   * 제목이 사람이 읽는 문장이 아니라 식별자인 소스(리포 이름, 모델 이름).
   * 제목 유사도 기반 중복제거에서 제외한다 — 비슷한 이름의 다른 모델을 같은 것으로 볼 위험이 크다.
   */
  titleIsIdentifier?: boolean;
  /**
   * 발행일로 최신성을 따지면 안 되는 소스.
   * GitHub 급상승이나 HF 트렌딩은 "언제 만들어졌나"가 아니라 "지금 뜨고 있나"가 신호다.
   * 반복 노출은 seen_url 기록이 막는다.
   */
  ignoreRecency?: boolean;
  fetch(): Promise<RawItem[]>;
}

/** 소스 하나의 수집 결과 요약 */
export interface SourceResult {
  id: string;
  label: string;
  ok: boolean;
  count: number;
  ms: number;
  error?: string;
}
