"use client";

import { useEffect, useRef, useState } from "react";
import { detectTier } from "@/lib/journey/capability";
import { meetsTarget, minuteSummaries, perfOptions, summarize, type FrameSummary } from "@/lib/journey/perfStats";
import { scrollState } from "@/lib/journey/scrollState";

/**
 * 휴대폰 성능 측정 오버레이(스펙 8절 4항, 7절 "2-4a 기준"). 주소에 ?debug=perf가 있을 때만 JourneyStage가 불러온다.
 * 기기 단계·해상도 배율·캔버스 크기·GPU·브라우저와 최근 10초의 프레임 시간, 장면 통계(드로콜·프로그램·텍스처)를 보인다.
 * "측정"은 여정 전체를 일정한 빠르기로 3회 자동 스크롤하고(터치 기기는 Lenis를 쓰지 않으므로 프레임마다 scrollTo), "오래 돌리기"는
 * 왕복하며 1분마다 p95를 낸다. 결과는 window.__journeyPerf와 복사용 글상자에 둔다. 보이는 글은 React 렌더 없이 0.5초마다 고친다.
 * 확인용 쿼리: perfSpeed(초당 화면 수, 기본 1), perfMinutes(오래 돌리기 분, 기본 5).
 */

interface SceneStats {
  calls: number;
  maxCalls: number;
  programsAtReady: number;
  programs: number;
  textureBytes: number;
  renderTargetBytes: number;
  quality: { dpr: number } | null;
}

export interface PerfResult {
  device: { model: string; tier: string; dpr: number; canvas: string; gpu: string; browser: string };
  speed: number;
  runs: (FrameSummary & { reached: number })[];
  meets: boolean;
  scene: { maxDrawCalls: number; programs: [number, number]; textureMiB: number; renderTargetMiB: number } | null;
  longRun: { minutes: number; perMinute: FrameSummary[]; meets: boolean } | null;
}

type PerfWindow = Window & { __journeyStats?: SceneStats; __journeyPerf?: PerfResult };

const RUNS = 3;
/** 회마다 처음 0.5초의 프레임은 이미지 디코딩 등이 섞여 뺀다(perf:journey의 처음 30프레임, 60Hz에서 0.5초와 같다) */
const WARMUP_MS = 500;
const RECENT_MS = 10_000;
const MIB = 1024 * 1024;

function options(): { speed: number; minutes: number } {
  return perfOptions(window.location.search);
}

function gpuName(): string {
  try {
    const gl = document.createElement("canvas").getContext("webgl2");
    if (!gl) return "WebGL2 없음";
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const name = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return name;
  } catch {
    return "알 수 없음";
  }
}

function sceneStats(): SceneStats | null {
  return (window as PerfWindow).__journeyStats ?? null;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 진행률 from → to를 화면당 1/speed초로 자동 스크롤하며 프레임 간격을 onFrame에 넘긴다. deadline(performance.now 기준)이 지나면 멈춘다.
 * 지나간 가장 큰 진행률(ScrollTrigger가 계산한 값)을 돌려준다
 */
function play(from: number, to: number, speed: number, onFrame: (ms: number, at: number) => void, deadline = Infinity): Promise<number> {
  return new Promise((resolve) => {
    const main = document.querySelector<HTMLElement>("[data-journey-page]");
    if (!main) return resolve(0);
    const top = main.getBoundingClientRect().top + window.scrollY;
    const span = main.offsetHeight - window.innerHeight;
    const duration = ((Math.abs(to - from) * span) / window.innerHeight / speed) * 1000;
    let start: number | null = null;
    let last = 0;
    let reached = 0;
    const step = (now: number) => {
      if (start === null) start = now;
      else onFrame(now - last, now);
      last = now;
      const k = Math.min(1, (now - start) / duration);
      window.scrollTo({ top: top + (from + (to - from) * k) * span, behavior: "instant" });
      reached = Math.max(reached, scrollState.progress);
      if (k < 1 && now < deadline) requestAnimationFrame(step);
      else requestAnimationFrame(() => resolve(Math.max(reached, scrollState.progress)));
    };
    requestAnimationFrame(step);
  });
}

function describeScene(stats: SceneStats | null): PerfResult["scene"] {
  if (!stats) return null;
  return {
    maxDrawCalls: stats.maxCalls,
    programs: [stats.programsAtReady, stats.programs],
    textureMiB: Number((stats.textureBytes / MIB).toFixed(1)),
    renderTargetMiB: Number((stats.renderTargetBytes / MIB).toFixed(1)),
  };
}

function line(summary: FrameSummary): string {
  return `${summary.fps}fps 평균 ${summary.averageMs} p95 ${summary.p95Ms} p99 ${summary.p99Ms}ms, 50ms 초과 ${summary.over50ms}`;
}

export function PerfOverlay() {
  const liveRef = useRef<HTMLPreElement>(null);
  const modelRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLTextAreaElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<PerfResult | null>(null);

  useEffect(() => {
    const gpu = gpuName();
    const recent: { at: number; ms: number }[] = [];
    let last = performance.now();
    let frame = requestAnimationFrame(function record(now) {
      recent.push({ at: now, ms: now - last });
      last = now;
      while (recent.length > 0 && recent[0].at < now - RECENT_MS) recent.shift();
      frame = requestAnimationFrame(record);
    });
    const timer = setInterval(() => {
      const stats = sceneStats();
      const canvas = document.querySelector<HTMLCanvasElement>("[data-journey-scene] canvas");
      if (!liveRef.current) return;
      liveRef.current.textContent = [
        `단계 ${detectTier()} · 배율 ${stats?.quality?.dpr ?? window.devicePixelRatio} · 캔버스 ${canvas ? `${canvas.width}×${canvas.height}` : "없음"}`,
        `GPU ${gpu}`,
        `최근 10초 ${line(summarize(recent.map((item) => item.ms)))}`,
        stats
          ? `드로콜 ${stats.calls}(최대 ${stats.maxCalls}) · 프로그램 ${stats.programsAtReady}→${stats.programs} · 텍스처 ${(stats.textureBytes / MIB).toFixed(1)}MiB`
          : "드로콜 -(3D 없음)",
      ].join("\n");
    }, 500);
    return () => {
      cancelAnimationFrame(frame);
      clearInterval(timer);
    };
  }, []);

  const device = (): PerfResult["device"] => {
    const canvas = document.querySelector<HTMLCanvasElement>("[data-journey-scene] canvas");
    return {
      model: modelRef.current?.value ?? "",
      tier: detectTier(),
      dpr: sceneStats()?.quality?.dpr ?? window.devicePixelRatio,
      canvas: canvas ? `${canvas.width}×${canvas.height}` : "없음",
      gpu: gpuName(),
      browser: navigator.userAgent,
    };
  };

  const finish = (next: PerfResult) => {
    (window as PerfWindow).__journeyPerf = next;
    setResult(next);
    setBusy(null);
  };

  const measure = async () => {
    const { speed } = options();
    setBusy("측정 중");
    const runs: PerfResult["runs"] = [];
    for (let run = 0; run < RUNS; run++) {
      window.scrollTo({ top: 0, behavior: "instant" });
      await wait(1000);
      const frames: number[] = [];
      const begin = performance.now();
      const reached = await play(0, 1, speed, (ms, at) => {
        if (at - begin >= WARMUP_MS) frames.push(ms);
      });
      runs.push({ ...summarize(frames), reached });
    }
    finish({ device: device(), speed, runs, meets: runs.every(meetsTarget), scene: describeScene(sceneStats()), longRun: null });
  };

  const longRun = async () => {
    const { speed, minutes } = options();
    setBusy("오래 돌리는 중");
    window.scrollTo({ top: 0, behavior: "instant" });
    await wait(1000);
    const frames: { at: number; ms: number }[] = [];
    const start = performance.now();
    const deadline = start + minutes * 60_000;
    for (let forward = true; performance.now() < deadline; forward = !forward) {
      await play(forward ? 0 : 1, forward ? 1 : 0, speed, (ms, at) => frames.push({ at, ms }), deadline);
    }
    const perMinute = minuteSummaries(frames, start);
    const lastMinute = perMinute[perMinute.length - 1];
    finish({
      device: device(),
      speed,
      runs: [],
      meets: false,
      scene: describeScene(sceneStats()),
      longRun: { minutes, perMinute, meets: lastMinute ? meetsTarget(lastMinute) : false },
    });
  };

  const copy = async () => {
    if (!result || !outputRef.current) return;
    const text = JSON.stringify(result, null, 2);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // http로 연 휴대폰(보안 맥락 아님)에는 clipboard API가 없다. 글상자를 골라 복사한다
      outputRef.current.select();
      document.execCommand("copy");
    }
  };

  return (
    <section
      aria-label="성능 측정"
      className="pointer-events-auto fixed left-2 top-[84px] z-30 w-[min(92vw,22rem)] rounded-lg border border-white/10 bg-zinc-950/90 p-2 font-mono text-[11px] leading-snug text-zinc-100"
    >
      <pre ref={liveRef} className="whitespace-pre-wrap">
        측정 준비 중
      </pre>
      <label className="mt-2 flex items-center gap-2">
        기종
        <input ref={modelRef} className="min-w-0 flex-1 rounded bg-zinc-800 px-1 py-0.5" placeholder="예: iPhone 15" />
      </label>
      <div className="mt-2 flex flex-wrap gap-1">
        <button type="button" disabled={busy !== null} onClick={measure} className="rounded bg-sky-700 px-2 py-1 disabled:opacity-50">
          측정
        </button>
        <button type="button" disabled={busy !== null} onClick={longRun} className="rounded bg-sky-900 px-2 py-1 disabled:opacity-50">
          오래 돌리기
        </button>
        <button type="button" disabled={!result} onClick={copy} className="rounded bg-zinc-700 px-2 py-1 disabled:opacity-50">
          결과 복사
        </button>
        {busy && <span className="self-center text-amber-300">{busy}</span>}
      </div>
      {result && (
        <>
          <p className="mt-2">
            {result.longRun
              ? `오래 돌리기 ${result.longRun.minutes}분: 마지막 1분 p95 ${result.longRun.perMinute.at(-1)?.p95Ms ?? "-"}ms ${result.longRun.meets ? "기준 지킴" : "기준 넘음"}`
              : `3회: ${result.runs.map((run) => `p95 ${run.p95Ms}·p99 ${run.p99Ms}`).join(" / ")} ${result.meets ? "기준 지킴" : "기준 넘음"}`}
          </p>
          <textarea ref={outputRef} readOnly value={JSON.stringify(result, null, 2)} className="mt-1 h-24 w-full bg-zinc-900 text-[10px]" />
        </>
      )}
    </section>
  );
}
