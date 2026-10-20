"use client";

import { useEffect } from "react";
import { getLenis } from "@/lib/journey/engine";
import { getJourneyMode, subscribeJourneyMode } from "@/lib/journey/journeyMode";
import { isPortrait } from "@/lib/journey/lens";
import { activeCard, cardProgress } from "@/lib/journey/portrait";
import { getSceneStatus, subscribeSceneStatus } from "@/lib/journey/sceneStatus";
import { scrollState, subscribeProgress } from "@/lib/journey/scrollState";
import { scrollTopOf } from "./modeSwitch";

/**
 * 세로 화면의 아래 고정 카드(스펙 3절 "세로 화면 (2-4a)"). 세로 화면(가로가 세로보다 좁다)에서 3D로 보고 장면이 실패하지 않은 동안 본문에
 * data-journey-cards="fixed"를 붙이고, 지금 구간의 카드(activeCard)에 data-active를 붙인다. 진행률·해시·화면 크기·장면 상태·모드가 바뀔 때만
 * 속성을 고친다(React 다시 렌더 없음). 모드는 구독자로 곧바로 따라가 2D로 바뀌는 순간 고정을 푼다(2-4b). 키보드 포커스가 보이지 않는 카드의 링크로 가면 그 카드가 보이는 자리(cardProgress)로 한 번 스크롤한다.
 * 이미 보이는 카드면 스크롤하지 않는다. 스크롤은 포커스를 옮기지 않으므로 되돌이가 생기지 않는다.
 */
export function usePortraitCards(): void {
  useEffect(() => {
    const main = document.querySelector<HTMLElement>("[data-journey-page]");
    if (!main) return;
    const cards = new Map<string, HTMLElement>();
    main.querySelectorAll<HTMLElement>("[data-journey-card]").forEach((card) => {
      if (card.dataset.journeyCard) cards.set(card.dataset.journeyCard, card);
    });
    let active: string | null = null;
    let fixedOn = false;
    const fixed = () =>
      getJourneyMode().view === "3d" && isPortrait(window.innerWidth, window.innerHeight) && getSceneStatus() !== "failed";
    const update = () => {
      const on = fixed();
      const next = on ? activeCard(scrollState.progress, window.location.hash) : null;
      if (next !== active) {
        if (active) cards.get(active)?.removeAttribute("data-active");
        if (next) cards.get(next)?.setAttribute("data-active", "");
        active = next;
      }
      if (on === fixedOn) return;
      fixedOn = on;
      if (on) {
        main.dataset.journeyCards = "fixed";
        // 고정 자리로 들어가는 순간(처음 열 때, 가로에서 세로로 돌릴 때)에는 바꿈 효과 없이 지금 카드만 보이게 하고, 스타일을 한 번 계산한
        // 뒤에 효과(journeyCardsSettled)를 건다. 같이 걸면 보이지 않을 카드 열다섯 장이 아래 고정 자리에 겹쳐 보이며 0.25초 동안 사라진다
        main.getBoundingClientRect();
        main.dataset.journeyCardsSettled = "";
      } else {
        delete main.dataset.journeyCards;
        delete main.dataset.journeyCardsSettled;
      }
    };
    const onFocusIn = (event: FocusEvent) => {
      if (!fixed() || !(event.target instanceof Element)) return;
      const card = event.target.closest<HTMLElement>("[data-journey-card]")?.dataset.journeyCard;
      if (!card || card === active) return;
      const top = scrollTopOf(main, cardProgress(card));
      const lenis = getLenis();
      if (lenis) lenis.scrollTo(top, { immediate: true });
      else window.scrollTo({ top, behavior: "instant" });
    };
    update();
    const unsubscribeProgress = subscribeProgress(update);
    const unsubscribeStatus = subscribeSceneStatus(update);
    const unsubscribeMode = subscribeJourneyMode(update);
    window.addEventListener("resize", update);
    window.addEventListener("hashchange", update);
    main.addEventListener("focusin", onFocusIn);
    return () => {
      unsubscribeProgress();
      unsubscribeStatus();
      unsubscribeMode();
      window.removeEventListener("resize", update);
      window.removeEventListener("hashchange", update);
      main.removeEventListener("focusin", onFocusIn);
      if (active) cards.get(active)?.removeAttribute("data-active");
      delete main.dataset.journeyCards;
      delete main.dataset.journeyCardsSettled;
    };
  }, []);
}
