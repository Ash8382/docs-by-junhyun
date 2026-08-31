import { ApiError, GoogleGenAI, Type } from "@google/genai";

import { toImportance } from "../../src/lib/ai-daily/types";
import type { NormalizedItem } from "../types";
import {
  renderCandidates,
  SCORE_INSTRUCTION,
  WRITE_INSTRUCTION,
} from "./prompts";
import type { Judge, Scored, Written } from "./types";

/**
 * Gemini Flash 무료 티어.
 *
 * 무료로 열려 있는 건 Flash 계열이라 미묘한 판단은 상위 모델만 못하다. 그래서
 *  - 점수는 25건씩 나눠 묻는다. 한 번에 백 건을 주면 뒤쪽 항목의 판정이 눈에 띄게 성의 없어진다.
 *  - 출력은 responseSchema로 못 박는다. JSON을 말로 부탁하면 가끔 코드펜스를 씌워 보낸다.
 *  - 503(혼잡)과 429(한도)는 무료 티어에서 일상적으로 난다. 물러섰다 다시 묻고,
 *    그래도 안 되면 다른 모델로 넘어간다. 한 배치 때문에 그날 리포트가 날아가면 안 된다.
 */

/**
 * 한 모델이 통째로 막히는 일이 실제로 있다. 재시도만으로는 못 넘긴다 —
 * 배치마다 백오프를 다 쓰고 실패해서 시간만 버린다.
 *
 * 앞에서부터 쓰고, 한 번 내려가면 그 실행 동안 다시 올라가지 않는다.
 * 배치 다섯 개가 혼잡한 모델을 각자 다시 두드릴 이유가 없다.
 */
const MODEL_CHAIN = [
  "gemini-flash-latest",
  "gemini-3.5-flash",
  "gemini-flash-lite-latest",
];

const SCORE_BATCH_SIZE = 25;

/** 다시 물어볼 값어치가 있는 응답. 잘못된 키(401)나 없는 모델(404)은 여기 없다. */
const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);

/** 모델당 두 번까지만 버틴다. 더 기다리느니 다음 모델로 가는 편이 빠르다. */
const BACKOFF_MS = [2_000, 6_000];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function statusOf(error: unknown): number | undefined {
  return error instanceof ApiError ? error.status : undefined;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const SCORE_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      index: { type: Type.INTEGER },
      score: { type: Type.INTEGER },
      importance: { type: Type.STRING, enum: ["HIGH", "MEDIUM", "LOW"] },
      reason: { type: Type.STRING },
    },
    required: ["index", "score", "importance", "reason"],
  },
};

const WRITE_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      index: { type: Type.INTEGER },
      summary: { type: Type.STRING },
      insight: { type: Type.STRING },
      tags: { type: Type.ARRAY, items: { type: Type.STRING } },
    },
    required: ["index", "summary", "insight", "tags"],
  },
};

interface RawScore {
  index?: number;
  score?: number;
  importance?: string;
  reason?: string;
}

interface RawWrite {
  index?: number;
  summary?: string;
  insight?: string;
  tags?: string[];
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function createGeminiJudge(): Judge {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY가 없습니다. aistudio.google.com에서 발급해 .env.local에 넣으세요.",
    );
  }

  // 모델을 명시했으면 그것만 쓴다. 폴백은 사용자가 고르지 않았을 때의 안전장치일 뿐이다.
  const chain = process.env.GEMINI_MODEL ? [process.env.GEMINI_MODEL] : MODEL_CHAIN;
  const ai = new GoogleGenAI({ apiKey });

  let activeIndex = 0;

  async function ask<T>(
    label: string,
    instruction: string,
    body: string,
    schema: object,
  ): Promise<T[]> {
    let lastError: unknown;

    while (activeIndex < chain.length) {
      const model = chain[activeIndex];

      for (let attempt = 0; attempt <= BACKOFF_MS.length; attempt++) {
        if (attempt > 0) await sleep(BACKOFF_MS[attempt - 1]);

        let text: string | undefined;
        try {
          const response = await ai.models.generateContent({
            model,
            contents: `${instruction}\n\n---\n\n${body}`,
            config: {
              responseMimeType: "application/json",
              responseSchema: schema,
              temperature: 0.3,
            },
          });
          text = response.text;
        } catch (error) {
          lastError = error;
          const status = statusOf(error);

          // 키가 틀렸거나 모델명이 없는 건 다시 물어도 같다. 바로 세워서 원인을 보게 한다.
          if (status !== undefined && !RETRYABLE_STATUS.has(status)) throw error;

          if (attempt < BACKOFF_MS.length) {
            console.warn(
              `  ${label} 실패 (${status ?? "network"}) — ${BACKOFF_MS[attempt] / 1000}초 후 재시도`,
            );
          }
          continue;
        }

        if (!text) return [];

        try {
          const parsed: unknown = JSON.parse(text);
          return Array.isArray(parsed) ? (parsed as T[]) : [];
        } catch {
          // 스키마를 걸었는데도 깨진 건 모델을 바꿔도 마찬가지다. 이 배치만 버린다.
          console.warn(`  ${label} JSON 파싱 실패, 건너뜁니다: ${text.slice(0, 150)}`);
          return [];
        }
      }

      activeIndex += 1;
      if (activeIndex < chain.length) {
        console.warn(`  ${model} 계속 실패 — ${chain[activeIndex]}로 전환합니다`);
      }
    }

    console.warn(
      `  ${label} 모든 모델 실패, 건너뜁니다: ${messageOf(lastError).slice(0, 150)}`,
    );
    return [];
  }

  return {
    name: `gemini/${chain.join(" → ")}`,

    async score(items: NormalizedItem[]): Promise<Scored[]> {
      const batches = chunk(items, SCORE_BATCH_SIZE);
      const results: Scored[] = [];

      // 무료 티어는 분당 요청 수가 빠듯하다. 어차피 배치가 대여섯 개라 순차로 돈다.
      for (const [batchIndex, batch] of batches.entries()) {
        const raw = await ask<RawScore>(
          `채점 ${batchIndex + 1}/${batches.length}`,
          SCORE_INSTRUCTION,
          renderCandidates(batch),
          SCORE_SCHEMA,
        );

        for (const entry of raw) {
          const item = typeof entry.index === "number" ? batch[entry.index] : undefined;
          if (!item) continue;

          results.push({
            id: item.id,
            score: clamp(Math.round(Number(entry.score ?? 0)), 0, 100),
            importance: toImportance(entry.importance),
            reason: String(entry.reason ?? "").trim(),
          });
        }
      }

      return results;
    },

    async write(items: NormalizedItem[]): Promise<Written[]> {
      const raw = await ask<RawWrite>(
        "집필",
        WRITE_INSTRUCTION,
        renderCandidates(items),
        WRITE_SCHEMA,
      );

      const written: Written[] = [];
      for (const entry of raw) {
        const item = typeof entry.index === "number" ? items[entry.index] : undefined;
        if (!item) continue;

        written.push({
          id: item.id,
          summary: String(entry.summary ?? "").trim(),
          insight: String(entry.insight ?? "").trim(),
          tags: (entry.tags ?? [])
            .map((tag) => String(tag).trim())
            .filter(Boolean)
            .slice(0, 3),
        });
      }

      return written;
    },
  };
}
