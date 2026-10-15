"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { useEffect } from "react";
import { startClock } from "@/lib/journey/clock";
import { renderFrame, setLenis } from "@/lib/journey/engine";
import { setProgress } from "@/lib/journey/scrollState";

/**
 * 부드러운 스크롤(Lenis), 스크롤 진행률(ScrollTrigger), 3D 렌더를 GSAP ticker 하나에 묶는다.
 * 스크롤 위치의 원천은 브라우저 기본 스크롤이라 키보드·찾기·접근성이 그대로 동작한다.
 * 터치는 Lenis 기본값(syncTouch: false)대로 OS 관성을 쓰고, 움직임 줄이기 설정은 Lenis가 존중한다.
 */
export function useJourneyScroll(): void {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const lenis = new Lenis({ autoRaf: false });
    setLenis(lenis);

    const trigger = ScrollTrigger.create({
      trigger: "[data-journey-page]",
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => setProgress(self.progress),
    });
    setProgress(trigger.progress);

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
      stopClock();
      trigger.kill();
      setLenis(null);
      lenis.destroy();
    };
  }, []);
}
