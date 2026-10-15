"use client";

import { useEffect, useRef } from "react";
import { getLenis } from "@/lib/journey/engine";
import { scrollState, subscribeProgress } from "@/lib/journey/scrollState";
import { rangeOf } from "@/lib/journey/timeline";

// name은 스크린 리더가 읽는 버튼 이름이다(조사를 라벨마다 맞춘다).
// align: 엔딩은 연락처가 섹션 아래쪽에 있어 섹션 끝을 화면 끝에 맞춘다.
const MARKS = (
  [
    { id: "act-1", label: "1막", name: "1막으로 이동", align: "start" },
    { id: "act-2", label: "2막", name: "2막으로 이동", align: "start" },
    { id: "act-3", label: "3막", name: "3막으로 이동", align: "start" },
    { id: "ending", label: "연락처", name: "연락처로 이동", align: "end" },
  ] as const
).map((mark) => ({ ...mark, top: `${rangeOf(mark.id).start * 100}%` }));

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

/** 진행 막대. 채움 정도는 React 렌더 없이 DOM을 직접 고친다(스크롤 중 렌더 금지). */
export function ProgressRail() {
  const fillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = (progress: number) => {
      if (fillRef.current) fillRef.current.style.transform = `scaleY(${progress})`;
    };
    update(scrollState.progress);
    return subscribeProgress(update);
  }, []);

  return (
    <nav aria-label="여정 진행" className="fixed right-3 top-1/2 z-20 h-64 -translate-y-1/2 sm:right-6">
      <div className="relative h-full w-px bg-white/15">
        <div ref={fillRef} className="absolute inset-0 origin-top bg-white/70" style={{ transform: "scaleY(0)" }} />
        {MARKS.map((mark) => (
          <button
            key={mark.id}
            type="button"
            onClick={() => scrollToStop(mark.id, mark.align)}
            aria-label={mark.name}
            className="group absolute -left-3 flex h-6 w-6 -translate-y-1/2 items-center justify-center"
            style={{ top: mark.top }}
          >
            <span className="h-2 w-2 rounded-full bg-white/70 transition-colors group-hover:bg-white" />
            <span className="pointer-events-none absolute right-6 whitespace-nowrap text-xs text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              {mark.label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
}
