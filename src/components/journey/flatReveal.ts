"use client";

import { useEffect } from "react";
import { getJourneyMode, subscribeJourneyMode } from "@/lib/journey/journeyMode";

const TARGETS = '[data-journey-card], [data-stop="ending"] > div';

/**
 * 2D 등장(스펙 5절 "2D 레이아웃", 2-4b). 2D에서 카드가 화면에 처음 들어올 때 data-revealed를 붙이면 CSS가 기존 FadeIn과 같은 움직임
 * (아래 20px에서 0.5초 동안 나타남)을 준다. framer-motion으로 감싸지 않는다(같은 DOM이 3D 세로 화면 고정 카드에도 쓰인다).
 * 관찰을 걸기 전에 이미 화면 안인 카드는 바로 보이게 표시한 뒤에 <html>에 data-journey-reveal을 붙여 감추기를 켠다(처음 그린 카드가
 * 깜빡이지 않게). 3D로 바뀌거나 페이지를 떠나면 관찰을 풀고 표지를 지운다.
 */
export function useFlatReveal(): void {
  useEffect(() => {
    const root = document.documentElement;
    let observer: IntersectionObserver | null = null;
    const stop = () => {
      observer?.disconnect();
      observer = null;
      delete root.dataset.journeyReveal;
    };
    const start = () => {
      const targets = [...document.querySelectorAll<HTMLElement>(TARGETS)];
      for (const target of targets) {
        const rect = target.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) target.dataset.revealed = "";
      }
      const watcher = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            (entry.target as HTMLElement).dataset.revealed = "";
            watcher.unobserve(entry.target);
          }
        },
        { threshold: 0.1 },
      );
      for (const target of targets) if (target.dataset.revealed === undefined) watcher.observe(target);
      observer = watcher;
      root.dataset.journeyReveal = "";
    };
    const update = () => {
      const flat = getJourneyMode().view === "2d";
      if (flat && !observer) start();
      if (!flat && observer) stop();
    };
    update();
    const unsubscribe = subscribeJourneyMode(update);
    return () => {
      unsubscribe();
      stop();
    };
  }, []);
}
