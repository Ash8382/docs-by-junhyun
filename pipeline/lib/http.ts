/** 수집처 호출에 공통으로 붙는 것들: UA, 타임아웃, 1회 재시도. */

const USER_AGENT = "ai-daily-bot/0.1 (+https://docs-by-junhyun.vercel.app)";
const TIMEOUT_MS = 15_000;
const RETRY_DELAY_MS = 800;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request(
  url: string,
  headers: Record<string, string> = {},
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, {
        headers: { "user-agent": USER_AGENT, ...headers },
        signal: AbortSignal.timeout(TIMEOUT_MS),
        redirect: "follow",
      });
    } catch (error) {
      lastError = error;
      if (attempt === 0) await sleep(RETRY_DELAY_MS);
      continue;
    }

    if (res.ok) return res;

    // 4xx는 다시 물어봐도 같은 답이 온다. 5xx와 네트워크 오류만 재시도할 값어치가 있다.
    const httpError = new Error(`HTTP ${res.status} ${res.statusText} — ${url}`);
    if (res.status < 500) throw httpError;

    lastError = httpError;
    if (attempt === 0) await sleep(RETRY_DELAY_MS);
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

export async function fetchText(
  url: string,
  headers?: Record<string, string>,
): Promise<string> {
  return (await request(url, headers)).text();
}

export async function fetchJson<T>(
  url: string,
  headers?: Record<string, string>,
): Promise<T> {
  const res = await request(url, { accept: "application/json", ...headers });
  return (await res.json()) as T;
}
