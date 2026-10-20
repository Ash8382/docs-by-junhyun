"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { useEffect } from "react";
import { startClock } from "@/lib/journey/clock";
import { renderFrame, setLenis } from "@/lib/journey/engine";
import { prefersReducedMotion, subscribeReducedMotion } from "@/lib/journey/motion";
import { setProgress } from "@/lib/journey/scrollState";
import { LAYOUT_EVENT } from "./modeSwitch";

/**
 * 부드러운 스크롤(Lenis), 스크롤 진행률(ScrollTrigger), 3D 렌더를 GSAP ticker 하나에 묶는다.
 * 스크롤 위치의 원천은 브라우저 기본 스크롤이라 키보드·찾기·접근성이 그대로 동작한다.
 * 터치는 Lenis 기본값(syncTouch: false)대로 OS 관성을 쓴다. 움직임 줄이기면 휠도 브라우저 기본 스크롤에 맡긴다(smoothWheel 끔). Lenis 1.3.26은
 * 이 설정에서 코드가 부르는 스크롤만 즉시로 바꾸고 휠 관성은 그대로 둔다(2-4b).
 * 휠은 그 방향으로 더 굴릴 수 있는 안쪽 요소(넘친 엔딩 패널)가 있으면 그 요소가 받는다(allowNestedScroll). 끝에 닿으면 다시 페이지가 굴러간다.
 * 3D와 2D 사이에서 배치가 바뀌면(modeSwitch의 LAYOUT_EVENT) Lenis 크기와 ScrollTrigger 구간을 곧바로 다시 잰다(2-4b).
 */
export function useJourneyScroll(): void {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const lenis = new Lenis({ autoRaf: false, allowNestedScroll: true, smoothWheel: !prefersReducedMotion() });
    setLenis(lenis);
    const unsubscribeMotion = subscribeReducedMotion(() => {
      lenis.options.smoothWheel = !prefersReducedMotion();
    });

    const trigger = ScrollTrigger.create({
      trigger: "[data-journey-page]",
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => setProgress(self.progress),
    });
    setProgress(trigger.progress);
    const relayout = () => {
      lenis.resize();
      ScrollTrigger.refresh();
    };
    window.addEventListener(LAYOUT_EVENT, relayout);

    const stopClock = startClock(
      {
        add: (callback) => {
          gsap.ticker.add(callback);
        },
        remove: (callback) => {
          gsap.ticker.remove(callback);
        },
        lagSmoothing: (threshold) => {
          gsap.ticker.lagSmoothing(threshold);
        },
      },
      {
        scroll: (timeMs) => lenis.raf(timeMs),
        triggers: () => ScrollTrigger.update(),
        render: (timeMs) => renderFrame(timeMs),
      },
    );

    return () => {
      unsubscribeMotion();
      window.removeEventListener(LAYOUT_EVENT, relayout);
      stopClock();
      trigger.kill();
      setLenis(null);
      lenis.destroy();
    };
  }, []);
}
