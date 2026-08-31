import type { NormalizedItem, SourceAdapter } from "../types";

/**
 * LLM에 넘기기 전에 룰로 먼저 거른다.
 *
 * HN처럼 AI와 무관한 글이 섞여 오는 소스가 있는데, 그걸 전부 모델에 태우면
 * 돈을 태워 "이건 AI 얘기가 아닙니다"라는 답을 사는 셈이 된다. 명백한 건 여기서 쳐내고
 * 애매한 것만 다음 단계로 넘긴다.
 *
 * 판정은 느슨하게 잡았다. 여기서 흘려보낸 잡음은 뒤에서 모델이 다시 거르지만,
 * 여기서 잘못 버린 건 되살릴 방법이 없다.
 */

/** 하나만 걸려도 AI 얘기로 본다. 단어 단위로 정확히 일치해야 한다. */
const STRONG_WORDS = new Set([
  "ai", "a.i", "llm", "llms", "gpt", "chatgpt", "claude", "anthropic", "openai",
  "gemini", "deepmind", "llama", "mistral", "qwen", "deepseek", "grok", "copilot",
  "cursor", "codex", "midjourney", "sora", "transformer", "transformers",
  "agentic", "rag", "mcp", "langchain", "ollama", "vllm", "huggingface",
  "multimodal", "chatbot", "nvidia", "cuda", "diffusion", "embeddings",
  "inference", "finetuning", "hallucination", "agi", "asi", "tpu",
]);

/** 문구 단위로 포함되면 AI 얘기로 본다. */
const STRONG_PHRASES = [
  "artificial intelligence", "machine learning", "language model",
  "foundation model", "reasoning model", "frontier model", "open weight",
  "open-weight", "ai agent", "coding agent", "hugging face", "neural network",
  "model context protocol", "fine-tuning", "fine tuning", "stable diffusion",
  "vibe coding", "prompt engineering", "context window", "retrieval augmented",
  "text-to-image", "text to video", "image generation", "speech recognition",
  "generative ai", "deep learning", "인공지능", "생성형", "거대언어모델",
];

/** 혼자서는 근거가 약하고, 둘 이상 겹쳐야 AI 얘기로 본다. */
const WEAK_WORDS = new Set([
  "model", "models", "agent", "agents", "prompt", "prompts", "training",
  "trained", "dataset", "benchmark", "benchmarks", "reasoning", "autonomous",
  "generative", "token", "tokens", "gpu", "gpus", "neural", "assistant",
  "automation", "chat", "embedding", "vector", "context", "모델", "에이전트",
]);

const MIN_WEAK_HITS = 2;

function wordsOf(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9가-힣.\s]/g, " ")
      .split(/\s+/)
      .map((word) => word.replace(/\.$/, ""))
      .filter(Boolean),
  );
}

export interface RelevanceVerdict {
  relevant: boolean;
  /** 왜 통과했는지 / 왜 떨어졌는지. 룰을 손볼 때 근거가 된다. */
  reason: string;
}

export function judge(item: NormalizedItem, alwaysRelevant: boolean): RelevanceVerdict {
  if (alwaysRelevant) {
    return { relevant: true, reason: "AI 전용 소스" };
  }

  const haystack = `${item.title} ${item.summary ?? ""}`.toLowerCase();
  const words = wordsOf(haystack);

  const strongWord = [...STRONG_WORDS].find((word) => words.has(word));
  if (strongWord) {
    return { relevant: true, reason: `강한 신호: ${strongWord}` };
  }

  const strongPhrase = STRONG_PHRASES.find((phrase) => haystack.includes(phrase));
  if (strongPhrase) {
    return { relevant: true, reason: `강한 신호: ${strongPhrase}` };
  }

  const weakHits = [...WEAK_WORDS].filter((word) => words.has(word));
  if (weakHits.length >= MIN_WEAK_HITS) {
    return { relevant: true, reason: `약한 신호 ${weakHits.length}개: ${weakHits.join(", ")}` };
  }

  return {
    relevant: false,
    reason: weakHits.length > 0 ? `약한 신호 ${weakHits.length}개뿐` : "신호 없음",
  };
}

export interface RelevanceOutcome {
  kept: NormalizedItem[];
  dropped: { item: NormalizedItem; reason: string }[];
}

export function filterRelevant(
  items: NormalizedItem[],
  adapters: SourceAdapter[],
): RelevanceOutcome {
  const alwaysRelevantSources = new Set(
    adapters.filter((a) => a.alwaysRelevant).map((a) => a.id),
  );

  const kept: NormalizedItem[] = [];
  const dropped: { item: NormalizedItem; reason: string }[] = [];

  for (const item of items) {
    const verdict = judge(item, alwaysRelevantSources.has(item.source));
    if (verdict.relevant) {
      kept.push(item);
    } else {
      dropped.push({ item, reason: verdict.reason });
    }
  }

  return { kept, dropped };
}
