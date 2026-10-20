import { getLenis, whenUnlocked } from "@/lib/journey/engine";
import { choose, getJourneyMode, setJourneyMode, storeView, type JourneyMode, type View } from "@/lib/journey/journeyMode";
import { activeCard, cardProgress } from "@/lib/journey/portrait";
import { setCarStatus, setSceneStatus } from "@/lib/journey/sceneStatus";
import { scrollState } from "@/lib/journey/scrollState";

/**
 * 모드 전환(스펙 5절 "모드 전환", 2-4b). 3D와 2D는 같은 본문을 다른 배치로 보이므로, 바꾸기 직전에 지금 보던 카드를 구해 새 배치에서
 * 그 카드 자리로 곧바로 스크롤한다. 해시와 열린 상세는 그대로다. 수동 전환·실행 중 강등·실패가 모두 여기를 지난다.
 */

/** 배치가 바뀌었다고 알리는 이벤트. 스크롤 엔진(useJourneyScroll)이 듣고 Lenis 크기와 ScrollTrigger 구간을 다시 잰다 */
export const LAYOUT_EVENT = "journey:layout";

/** 2D에서 카드 위끝이 오는 자리(px): 헤더(3.5rem)와 막 탭(2.5rem) 아래 0.5rem. globals.css의 scroll-margin-top 6.5rem과 같다 */
export const FLAT_TOP = 104;

/**
 * 2D에서 지금 읽는 자리(px). 3D → 2D가 카드를 놓는 자리(FLAT_TOP) 바로 아래라, 곧바로 되돌아가면 같은 카드를 고른다. 화면 비율로 고르면
 * 키가 작은 막 제목 카드 다음 카드까지 그 선을 넘어 2막 제목에서 왕복하면 Stock2U로 갔다(2-4b 최종 리뷰)
 */
export const FLAT_READING_LINE = FLAT_TOP + 8;

/** 페이지 끝까지 내려왔다. 2D의 엔딩은 페이지 끝이라 위끝이 읽는 자리까지 오르지 못하므로, 끝이면 엔딩을 읽는 중이다 */
export function atPageEnd(): boolean {
  return window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
}

/** 진행률 p 자리의 스크롤 위치(px). ScrollTrigger의 진행률은 본문 위끝이 화면 위에 닿을 때 0, 아래끝이 화면 아래에 닿을 때 1이다 */
export function scrollTopOf(main: HTMLElement, progress: number): number {
  const top = main.getBoundingClientRect().top + window.scrollY;
  return top + progress * (main.offsetHeight - window.innerHeight);
}

function cardElement(card: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-journey-card="${card}"]`) ?? document.getElementById(`stop-${card}`);
}

/** 지금 보던 카드. 3D는 진행률의 카드(PiCKCARE는 앞줄 저장소, 엔딩은 "ending"), 2D는 읽는 자리에 걸친 카드(페이지 끝이면 엔딩) */
export function currentCard(view: View): string {
  if (view === "3d") return activeCard(scrollState.progress, window.location.hash) ?? "ending";
  if (atPageEnd()) return "ending";
  let current = "intro";
  for (const element of document.querySelectorAll<HTMLElement>("[data-journey-card], #stop-ending")) {
    if (element.getBoundingClientRect().top > FLAT_READING_LINE) break;
    current = element.dataset.journeyCard ?? "ending";
  }
  return current;
}

/** 문서 위에서 그 요소의 레이아웃 위끝(px). offsetTop을 더해 등장 효과의 transform을 빼고 잰다 */
function documentTop(element: HTMLElement): number {
  let top = 0;
  for (let node: HTMLElement | null = element; node; node = node.offsetParent as HTMLElement | null) top += node.offsetTop;
  return top;
}

/**
 * 그 카드가 보이는 자리로 곧바로 스크롤한다. 3D는 카드의 대표 진행률(엔딩은 끝), 2D는 카드 위끝이 scroll-margin-top만큼 아래에 온다.
 * 2D에서는 그 카드를 전환 없이 곧바로 나타나게 하고(data-revealed="instant"), 위치는 등장 전 transform(아래 20px)과 상관없이 잰다
 */
export function scrollToCard(card: string, view: View): void {
  const main = document.querySelector<HTMLElement>("[data-journey-page]");
  if (!main) return;
  let top: number;
  if (view === "2d") {
    const element = cardElement(card);
    if (!element) return;
    element.dataset.revealed = "instant";
    top = documentTop(element) - (Number.parseFloat(getComputedStyle(element).scrollMarginTop) || 0);
  } else {
    top = scrollTopOf(main, card === "ending" ? 1 : cardProgress(card));
  }
  const lenis = getLenis();
  if (lenis) lenis.scrollTo(top, { immediate: true, force: true });
  else window.scrollTo({ top, behavior: "instant" });
}

/**
 * 보이게 된 진행 표시(2D는 막 탭, 3D는 진행 막대)의 전환 버튼으로 포커스를 옮긴다. 전환 버튼이 없으면(WebGL2 없음) 그 표시의 첫 버튼이다.
 * 화면은 움직이지 않는다
 */
function focusShownProgress(view: View): void {
  const shown = document.querySelector<HTMLElement>(view === "2d" ? "[data-journey-tabs]" : "[data-journey-rail]");
  const target = shown?.querySelector<HTMLElement>("[data-view-toggle]") ?? shown?.querySelector<HTMLElement>("button");
  target?.focus({ preventScroll: true });
}

/**
 * 모드를 바꾼다. 보기 방식이 바뀌면 보던 카드를 지킨다. 3D로 돌아가면 장면을 처음부터 다시 준비한다(실패했던 상태와 차 상태를 지운다).
 * 모드 구독자(본문의 2D 표지, 아래 고정 카드)는 setJourneyMode 안에서 곧바로 불리므로, 그 뒤에 배치를 다시 재고 스크롤한다.
 * React가 모드를 따라 다시 그리는 것(2D면 2막 썸네일이 다시 보여 위쪽이 늘어난다)은 그 뒤라, 다음 프레임에 한 번 더 맞춘다.
 * 상세 패널이 열려 스크롤이 잠겨 있으면 패널이 닫힐 때 맞춘다(whenUnlocked).
 * 포커스가 감춰질 진행 표시(누른 전환 버튼, 막 이동 버튼) 안에 있었으면 새 진행 표시의 전환 버튼으로 옮긴다. 그러지 않으면 포커스가
 * 사라져 키보드·화면 낭독기 사용자가 자리를 잃는다(스펙 5절 "모드 전환", 2-4b 최종 리뷰)
 */
export function applyMode(next: JourneyMode): void {
  const before = getJourneyMode();
  if (before.view === next.view) {
    setJourneyMode(next);
    return;
  }
  const card = currentCard(before.view);
  const hiding = document.activeElement?.closest(next.view === "2d" ? "[data-journey-rail]" : "[data-journey-tabs]");
  if (next.view === "3d") {
    setSceneStatus("loading");
    setCarStatus("loading");
  }
  setJourneyMode(next);
  if (hiding) focusShownProgress(next.view);
  const settle = () => {
    window.dispatchEvent(new Event(LAYOUT_EVENT));
    scrollToCard(card, next.view);
  };
  whenUnlocked(() => {
    settle();
    requestAnimationFrame(settle);
  });
}

/** 수동 전환(진행 막대 끝의 버튼). 고른 것을 기억하고 모드를 바꾼다(스펙 5절 "수동 전환") */
export function switchView(view: View): void {
  storeView(view);
  applyMode(choose(getJourneyMode(), view));
}
