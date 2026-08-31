import { createGeminiJudge } from "./gemini";
import type { Judge } from "./types";

export type { Judge, Scored, Written } from "./types";

/**
 * LLM_PROVIDER로 고른다. 기본은 무료로 쓸 수 있는 gemini.
 *
 * Anthropic 키가 준비되면 ./claude.ts 를 같은 Judge 모양으로 만들고 여기 한 줄 추가하면 된다.
 * 미리 껍데기만 만들어두지 않은 건, 돌려보지 않은 코드가 완성된 것처럼 놓여 있으면
 * 나중에 그게 동작한다고 착각하게 되기 때문이다.
 */
export function createJudge(): Judge {
  const provider = (process.env.LLM_PROVIDER || "gemini").toLowerCase();

  switch (provider) {
    case "gemini":
      return createGeminiJudge();
    default:
      throw new Error(
        `LLM_PROVIDER='${provider}'는 아직 없습니다. 지금 쓸 수 있는 값: gemini`,
      );
  }
}
