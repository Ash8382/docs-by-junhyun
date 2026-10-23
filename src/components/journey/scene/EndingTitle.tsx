"use client";

import { useEffect, useRef, useState } from "react";
import { getEndingArrived, subscribeEndingArrived } from "@/lib/journey/endingState";
import { prefersReducedMotion } from "@/lib/journey/motion";
import { setEndingAnchorElement } from "./endingAnchor";

/** 흰 점에 닿은 뒤 이름까지의 정적, 이름 뒤 직무까지(ms). 사용자 결정(병합 뒤) */
export const ENDING_STILL_MS = 800;
export const ENDING_ROLE_MS = 500;

type Stage = "hidden" | "still" | "name" | "role";

/**
 * 엔딩의 이름과 직무(병합 뒤 새 엔딩 "여정이 하나의 빛이 되다"). 장면이 목표 상태에 닿으면(endingState) 정적(ENDING_STILL_MS) 뒤 이름이,
 * 그 뒤 ENDING_ROLE_MS에 직무가 나타난다. 목표 상태를 벗어나면(위로 스크롤) 곧바로 숨기고 기다리던 타이머를 거둔다. 다시 닿으면 정적부터.
 * 움직임 줄이기면 기다리지 않고 함께 보인다. 자리는 흰 점이 매 프레임 넘기는 화면 자리(--ending-x, --ending-y) 바로 아래다.
 * 장면 틀(aria-hidden) 안의 연출이라 화면 낭독기에는 읽히지 않는다(연락처는 본문 패널에 있다)
 */
export function EndingTitle() {
  const ref = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState<Stage>("hidden");

  useEffect(() => {
    setEndingAnchorElement(ref.current);
    return () => setEndingAnchorElement(null);
  }, []);

  useEffect(() => {
    let timers: number[] = [];
    const clear = () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      timers = [];
    };
    const sync = () => {
      clear();
      if (!getEndingArrived()) {
        setStage("hidden");
        return;
      }
      if (prefersReducedMotion()) {
        setStage("role");
        return;
      }
      setStage("still");
      timers.push(window.setTimeout(() => setStage("name"), ENDING_STILL_MS));
      timers.push(window.setTimeout(() => setStage("role"), ENDING_STILL_MS + ENDING_ROLE_MS));
    };
    sync();
    const unsubscribe = subscribeEndingArrived(sync);
    return () => {
      unsubscribe();
      clear();
    };
  }, []);

  return (
    <div
      ref={ref}
      data-journey-ending-title
      data-stage={stage}
      className="pointer-events-none absolute left-0 top-0 [transform:translate(var(--ending-x,-999px),var(--ending-y,-999px))]"
    >
      <div className="absolute left-0 top-9 w-max -translate-x-1/2 text-center">
        <p data-part="name" className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          이준현
        </p>
        <p data-part="role" className="mt-2 text-sm font-medium tracking-[0.2em] text-zinc-300 sm:text-base">
          Frontend Developer
        </p>
      </div>
    </div>
  );
}
