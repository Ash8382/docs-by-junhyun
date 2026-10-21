"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { getLenis, whenUnlocked } from "@/lib/journey/engine";
import { getJourneyMode, isAutoFlat, subscribeJourneyMode } from "@/lib/journey/journeyMode";
import { scrollState, subscribeProgress } from "@/lib/journey/scrollState";
import { rangeOf } from "@/lib/journey/timeline";
import { hasWebGL2 } from "@/lib/journey/webgl";
import { atPageEnd, flatReadingLine, switchView } from "./modeSwitch";

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

// 2D 막 탭(2-4b). 보이는 글은 짧게 두고, 이름은 그 글을 품은 채 막 번호를 더한다.
const TABS = [
  { id: "act-1", label: "시작", name: "1막 시작으로 이동" },
  { id: "act-2", label: "협업", name: "2막 협업으로 이동" },
  { id: "act-3", label: "현재", name: "3막 현재로 이동" },
  { id: "ending", label: "연락처", name: "연락처로 이동" },
] as const;

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

/** 2D 막 탭: 그 막 섹션으로 간다. 위 여백은 페이지의 scroll-padding-top이 정한다(Lenis도 scroll-padding을 뺀다) */
function scrollToAct(id: string) {
  const section = document.getElementById(`stop-${id}`);
  if (!section) return;
  const lenis = getLenis();
  if (lenis) lenis.scrollTo(section);
  else section.scrollIntoView({ block: "start" });
}

/**
 * 2D에서 지금 읽는 막: 위끝이 읽는 자리(막 탭 바로 아래, modeSwitch의 flatReadingLine)를 지난 마지막 막 섹션. 입구에서는 없다. 엔딩은 페이지 끝이라 위끝이 거기까지
 * 오르지 못하므로, 끝까지 내려가면 연락처다
 */
function readingAct(): string | null {
  if (atPageEnd()) return "ending";
  const line = flatReadingLine();
  let current: string | null = null;
  for (const tab of TABS) {
    const top = document.getElementById(`stop-${tab.id}`)?.getBoundingClientRect().top ?? Infinity;
    if (top <= line) current = tab.id;
  }
  return current;
}

function subscribeNothing() {
  return () => {};
}

/**
 * 진행 막대. 채움 정도는 React 렌더 없이 CSS 변수(--progress)만 고친다(스크롤 중 렌더 금지).
 * 2막·3막의 밝은 장면 위에서도 보이도록 반투명 어두운 바탕 위에 그린다(흐림 없이 단색).
 * 가로 화면은 오른쪽 가운데의 세로 막대, 세로 화면은 헤더 바로 아래의 화면 폭 가로 막대(높이 24px)다(2-4a, 스펙 2절 "진행 표시").
 * 세로 막대는 세로 화면에서 3D 위쪽 영역(차와 홀로그램)의 가장자리에 걸렸다.
 * 2-4b: 막대 끝에 수동 전환 버튼("2D로 보기")을 붙이고, 2D에서는 헤더 아래 막 탭(시작·협업·현재·연락처)과 "3D로 보기"로 바뀐다.
 * 서버는 둘 다 그리고 <html>의 2D 표지로 하나만 보인다(2D를 기억한 방문자도 처음 그릴 때부터 막 탭). 지금 읽는 막은 aria-current로
 * React 렌더 없이 고친다. 자동으로 2D가 되면 막 탭 아래에 알림을 6초 띄운다(화면 낭독기에는 한 번). WebGL2가 없으면 버튼을 두지 않는다.
 */
export function ProgressRail() {
  const fillRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const canSwitch = useSyncExternalStore(subscribeNothing, hasWebGL2, () => true);
  const [notice, setNotice] = useState(false);

  useEffect(() => {
    const fill = (progress: number) => {
      fillRef.current?.style.setProperty("--progress", String(progress));
    };
    // 2D 막 탭은 스크롤마다 고친다. 진행률은 본문 끝에서 1로 멈춰 연락처까지 내려가는 동안 바뀌지 않는다
    const tabs = () => {
      const current = getJourneyMode().view === "2d" ? readingAct() : null;
      for (const button of tabsRef.current?.querySelectorAll<HTMLButtonElement>("[data-tab]") ?? []) {
        if (button.dataset.tab === current) button.setAttribute("aria-current", "true");
        else button.removeAttribute("aria-current");
      }
    };
    fill(scrollState.progress);
    tabs();
    const unsubscribeProgress = subscribeProgress(fill);
    const unsubscribeMode = subscribeJourneyMode(tabs);
    window.addEventListener("scroll", tabs, { passive: true });
    return () => {
      unsubscribeProgress();
      unsubscribeMode();
      window.removeEventListener("scroll", tabs);
    };
  }, []);

  // 3D에서 자동으로 2D가 되는 순간에만 알림을 켠다(수동 2D·기기 단계 2D·화면 2D는 알리지 않는다). 상세가 열려 스크롤이 잠겨 있으면
  // 상세 밖의 알림은 가려지고 화면 낭독기에도 읽히지 않으므로, 상세를 닫은 뒤(보던 카드를 맞추는 때와 같다) 띄운다(2-4c)
  useEffect(() => {
    let previous = getJourneyMode();
    let timer = 0;
    const unsubscribe = subscribeJourneyMode(() => {
      const next = getJourneyMode();
      const flattened = isAutoFlat(next) && previous.view === "3d";
      previous = next;
      window.clearTimeout(timer);
      if (!flattened) {
        setNotice(false);
        return;
      }
      whenUnlocked(() => {
        setNotice(true);
        timer = window.setTimeout(() => setNotice(false), 6000);
      });
    });
    return () => {
      unsubscribe();
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <>
      <nav
        aria-label="여정 진행"
        data-journey-rail
        className="fixed right-3 top-1/2 z-20 flex -translate-y-1/2 flex-col items-center gap-3 rounded-full bg-zinc-950/70 px-3 py-4 sm:right-6 portrait:inset-x-0 portrait:top-14 portrait:h-6 portrait:translate-y-0 portrait:flex-row portrait:rounded-none portrait:px-4 portrait:py-0"
      >
        <div className="relative h-64 w-px bg-white/25 portrait:h-px portrait:w-auto portrait:flex-1">
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
        {canSwitch && (
          <button
            type="button"
            data-view-toggle
            onClick={() => switchView("2d")}
            aria-label="2D로 보기"
            className="inline-flex min-h-6 min-w-6 items-center justify-center rounded px-1 text-xs font-medium text-zinc-300 transition-colors hover:text-white"
          >
            2D
          </button>
        )}
      </nav>
      <nav
        aria-label="여정 막"
        data-journey-tabs
        className="fixed inset-x-0 top-14 z-20 hidden h-10 border-b border-white/10 bg-zinc-950/90"
      >
        <div ref={tabsRef} className="mx-auto flex h-full max-w-[45rem] items-center gap-1 px-4 text-sm">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              data-tab={tab.id}
              onClick={() => scrollToAct(tab.id)}
              aria-label={tab.name}
              className="rounded px-2.5 py-1 text-zinc-400 transition-colors hover:text-white aria-[current=true]:bg-white/10 aria-[current=true]:text-white"
            >
              {tab.label}
            </button>
          ))}
          {canSwitch && (
            <button
              type="button"
              data-view-toggle
              onClick={() => switchView("3d")}
              className="ml-auto rounded px-2.5 py-1 text-xs font-medium text-sky-300 transition-colors hover:text-white"
            >
              3D로 보기
            </button>
          )}
        </div>
      </nav>
      <p
        role="status"
        className={
          notice
            ? "fixed right-4 top-[6.75rem] z-20 rounded-md bg-zinc-900/95 px-3 py-1.5 text-xs text-zinc-200 shadow-lg"
            : "sr-only"
        }
      >
        {notice ? "기기에 맞춰 2D로 바꿨어요" : ""}
      </p>
    </>
  );
}
