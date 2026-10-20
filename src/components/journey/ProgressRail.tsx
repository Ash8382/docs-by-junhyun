"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { getLenis } from "@/lib/journey/engine";
import { scrollState, subscribeProgress } from "@/lib/journey/scrollState";
import { rangeOf } from "@/lib/journey/timeline";

// name은 스크린 리더가 읽는 버튼 이름이다(조사를 라벨마다 맞춘다).
// align: 엔딩은 연락처가 섹션 아래쪽에 있어 섹션 끝을 화면 끝에 맞춘다. 그래서 점도 도착하는 자리(구간 끝)에 둔다.
const MARKS = (
  [
    { id: "act-1", label: "1막", name: "1막으로 이동", align: "start" },
    { id: "act-2", label: "2막", name: "2막으로 이동", align: "start" },
    { id: "act-3", label: "3막", name: "3막으로 이동", align: "start" },
    { id: "ending", label: "연락처", name: "연락처로 이동", align: "end" },
  ] as const
).map((mark) => {
  const range = rangeOf(mark.id);
  return { ...mark, top: `${(mark.align === "end" ? range.end : range.start) * 100}%` };
});

function scrollToStop(id: string, align: "start" | "end") {
  const section = document.getElementById(`stop-${id}`);
  if (!section) return;
  const lenis = getLenis();
  if (!lenis) {
    section.scrollIntoView({ block: align });
    return;
  }
  // offset만큼 더 내려가면 섹션 끝이 화면 끝에 온다.
  lenis.scrollTo(section, { offset: align === "end" ? section.offsetHeight - window.innerHeight : 0 });
}

/**
 * 진행 막대. 채움 정도는 React 렌더 없이 CSS 변수(--progress)만 고친다(스크롤 중 렌더 금지).
 * 2막·3막의 밝은 장면 위에서도 보이도록 반투명 어두운 바탕 위에 그린다(흐림 없이 단색).
 * 가로 화면은 오른쪽 가운데의 세로 막대, 세로 화면은 헤더 바로 아래의 화면 폭 가로 막대(높이 24px)다(2-4a, 스펙 2절 "진행 표시").
 * 세로 막대는 세로 화면에서 3D 위쪽 영역(차와 홀로그램)의 가장자리에 걸렸다.
 */
export function ProgressRail() {
  const fillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = (progress: number) => {
      fillRef.current?.style.setProperty("--progress", String(progress));
    };
    update(scrollState.progress);
    return subscribeProgress(update);
  }, []);

  return (
    <nav
      aria-label="여정 진행"
      className="fixed right-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-zinc-950/70 px-3 py-4 sm:right-6 portrait:inset-x-0 portrait:top-14 portrait:h-6 portrait:translate-y-0 portrait:rounded-none portrait:px-4 portrait:py-0"
    >
      <div className="relative h-64 w-px bg-white/25 portrait:top-[11.5px] portrait:h-px portrait:w-full">
        <div
          ref={fillRef}
          className="absolute inset-0 origin-top bg-white/70 [transform:scaleY(var(--progress))] portrait:origin-left portrait:[transform:scaleX(var(--progress))]"
          style={{ "--progress": 0 } as CSSProperties}
        />
        {MARKS.map((mark) => (
          <button
            key={mark.id}
            type="button"
            onClick={() => scrollToStop(mark.id, mark.align)}
            aria-label={mark.name}
            className="group absolute -left-3 top-[var(--mark)] flex h-6 w-6 -translate-y-1/2 items-center justify-center portrait:left-[var(--mark)] portrait:top-0 portrait:-translate-x-1/2"
            style={{ "--mark": mark.top } as CSSProperties}
          >
            <span className="h-2 w-2 rounded-full bg-white/70 transition-colors group-hover:bg-white" />
            <span className="pointer-events-none absolute right-8 whitespace-nowrap rounded bg-zinc-950/85 px-1.5 py-0.5 text-xs text-zinc-200 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 portrait:right-auto portrait:top-7">
              {mark.label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
}
