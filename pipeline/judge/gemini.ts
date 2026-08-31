import { GoogleGenAI, Type } from "@google/genai";

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
 */

const DEFAULT_MODEL = "gemini-flash-latest";
const SCORE_BATCH_SIZE = 25;

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

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const ai = new GoogleGenAI({ apiKey });

  async function ask<T>(
    instruction: string,
    body: string,
    schema: object,
  ): Promise<T[]> {
    const response = await ai.models.generateContent({
      model,
      contents: `${instruction}\n\n---\n\n${body}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.3,
      },
    });

    const text = response.text;
    if (!text) return [];

    try {
      const parsed: unknown = JSON.parse(text);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      console.warn(`[judge] JSON 파싱 실패, 이 배치는 건너뜁니다: ${text.slice(0, 200)}`);
      return [];
    }
  }

  return {
    name: `gemini/${model}`,

    async score(items: NormalizedItem[]): Promise<Scored[]> {
      const batches = chunk(items, SCORE_BATCH_SIZE);
      const results: Scored[] = [];

      // 무료 티어는 분당 요청 수가 빠듯하다. 어차피 배치가 대여섯 개라 순차로 돈다.
      for (const batch of batches) {
        const raw = await ask<RawScore>(
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
