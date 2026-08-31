import type { CollectedItem, SourceAdapter, SourceResult } from "../types";

/**
 * 모든 수집처를 병렬로 돌리되 서로 격리한다.
 * 한 곳이 죽거나 느려도 나머지 결과로 그날 리포트를 만들 수 있어야 한다.
 */

const ADAPTER_TIMEOUT_MS = 45_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label}: ${ms}ms 안에 응답 없음`)),
      ms,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

export interface CollectOutcome {
  items: CollectedItem[];
  results: SourceResult[];
}

export async function collectAll(
  adapters: SourceAdapter[],
): Promise<CollectOutcome> {
  const outcomes = await Promise.all(
    adapters.map(async (adapter) => {
      const startedAt = Date.now();

      try {
        const raw = await withTimeout(
          adapter.fetch(),
          ADAPTER_TIMEOUT_MS,
          adapter.id,
        );
        return { adapter, raw, ms: Date.now() - startedAt, error: undefined };
      } catch (error) {
        return {
          adapter,
          raw: [],
          ms: Date.now() - startedAt,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }),
  );

  const items: CollectedItem[] = [];
  const results: SourceResult[] = [];

  for (const outcome of outcomes) {
    results.push({
      id: outcome.adapter.id,
      label: outcome.adapter.label,
      ok: outcome.error === undefined,
      count: outcome.raw.length,
      ms: outcome.ms,
      error: outcome.error,
    });

    for (const item of outcome.raw) {
      items.push({
        ...item,
        source: outcome.adapter.id,
        sourceLabel: outcome.adapter.label,
      });
    }
  }

  return { items, results };
}
