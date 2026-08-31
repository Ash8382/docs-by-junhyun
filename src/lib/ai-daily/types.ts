/**
 * 파이프라인과 화면이 함께 쓰는 타입.
 *
 * src 아래에 두는 이유는 Next 앱이 자연스럽게 import할 수 있어야 하기 때문이고,
 * 파이프라인은 상대 경로로 여기를 가리킨다. 반대 방향 의존은 없으므로
 * pipeline 코드가 Next 번들에 딸려 들어가지 않는다.
 */

export type Importance = "HIGH" | "MEDIUM" | "LOW";

export const IMPORTANCE_LEVELS: Importance[] = ["HIGH", "MEDIUM", "LOW"];

export function toImportance(value: unknown): Importance {
  const upper = String(value ?? "").toUpperCase();
  return (IMPORTANCE_LEVELS as string[]).includes(upper)
    ? (upper as Importance)
    : "MEDIUM";
}

export interface Article {
  id: string;
  title: string;
  url: string;
  urlKey: string;
  source: string;
  sourceLabel: string;
  /** ISO 8601. 소스가 날짜를 안 주면 null */
  publishedAt: string | null;
  summary: string | null;
  /** 왜 볼 가치가 있는지 */
  insight: string | null;
  importance: Importance;
  score: number;
  tags: string[];
  /** YYYY-MM-DD. 어느 날짜 리포트에 속하는지 */
  digestDate: string;
  createdAt: string;
}

/** DB에 넣기 직전의 모양. id와 created_at은 각각 해시와 기본값으로 정해진다. */
export type ArticleInput = Omit<Article, "createdAt">;
