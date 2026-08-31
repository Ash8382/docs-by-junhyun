import type { Importance } from "../../src/lib/ai-daily/types";
import type { NormalizedItem } from "../types";

/**
 * 선별과 집필을 맡는 쪽의 계약.
 *
 * 지금은 무료로 쓸 수 있는 Gemini Flash를 붙이고, Anthropic 키가 준비되면 claude.ts를
 * 같은 모양으로 하나 더 만들어 환경변수로 갈아끼운다. 공통 래퍼로 두 SDK를 억지로 묶지 않는 건
 * 모델마다 잘 듣는 프롬프트와 구조화 출력 방식이 다르기 때문이다. 억지로 묶으면 양쪽 다 어색해진다.
 *
 * 두 단계로 나눈 이유는 비용과 품질이 갈리는 지점이 다르기 때문이다.
 * 점수는 후보 전체를 훑어야 하니 짧게 여러 번, 글은 상위 몇 건만 길게 한 번.
 */

export interface Scored {
  id: string;
  /** 0~100 */
  score: number;
  importance: Importance;
  /** 그렇게 본 근거. 저장하지 않고 로그로만 본다 — 룰과 프롬프트를 손볼 때 쓴다. */
  reason: string;
}

export interface Written {
  id: string;
  /** 한두 문장 요약 */
  summary: string;
  /** 왜 볼 가치가 있는지 */
  insight: string;
  tags: string[];
}

export interface Judge {
  /** 로그에 찍을 이름 (예: "gemini/gemini-3-flash") */
  readonly name: string;

  /** 후보 전체에 점수를 매긴다. 순서는 보장하지 않으며 일부가 빠질 수 있다. */
  score(items: NormalizedItem[]): Promise<Scored[]>;

  /** 상위 몇 건에 요약과 insight를 쓴다. */
  write(items: NormalizedItem[]): Promise<Written[]>;
}
