"use client";

import { useEffect, useRef, useState } from "react";
import { getEndingArrived, subscribeEndingArrived } from "@/lib/journey/endingState";
import { prefersReducedMotion } from "@/lib/journey/motion";
import { setEndingAnchorElement } from "./endingAnchor";

/** 흰 점에 닿은 뒤 이름까지의 정적, 이름 뒤 직무까지, 직무가 나타난 뒤 Product Engineer로 바뀌기까지(ms). 사용자 결정(병합 뒤) */
export const ENDING_STILL_MS = 800;
export const ENDING_ROLE_MS = 500;
/** 직무가 0.9초에 걸쳐 드러난 뒤 1.3초쯤 읽힐 시간 */
export const ENDING_SHIFT_MS = 2200;

type Stage = "hidden" | "still" | "name" | "role" | "shift";

/**
 * 엔딩의 이름과 직무(병합 뒤 새 엔딩 "여정이 하나의 빛이 되다"). 장면이 목표 상태에 닿으면(endingState) 정적(ENDING_STILL_MS) 뒤 이름이,
 * 그 뒤 ENDING_ROLE_MS에 "Frontend Developer"가 나타나고, ENDING_SHIFT_MS 뒤 단어마다 "Product Engineer"로 바뀐다(프론트엔드에서 시작해
 * 백엔드·기획·디자인까지 넓어진 여정). 목표 상태를 벗어나면(위로 스크롤) 곧바로 숨기고 기다리던 타이머를 거둔다. 다시 닿으면 정적부터.
 * 움직임 줄이기면 기다리지 않고 이름과 "Product Engineer"가 함께 보인다. 자리는 흰 점이 매 프레임 넘기는 화면 자리(--ending-x, --ending-y)
 * 바로 아래다. 장면 틀(aria-hidden) 안의 연출이라 화면 낭독기에는 읽히지 않는다(연락처는 본문 패널에 있다)
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
        setStage("shift");
        return;
      }
      setStage("still");
      timers.push(window.setTimeout(() => setStage("name"), ENDING_STILL_MS));
      timers.push(window.setTimeout(() => setStage("role"), ENDING_STILL_MS + ENDING_ROLE_MS));
      timers.push(window.setTimeout(() => setStage("shift"), ENDING_STILL_MS + ENDING_ROLE_MS + ENDING_SHIFT_MS));
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
        {/* 단어 쌍(data-swap)마다 처음 단어(data-from)와 나중 단어(data-to)를 한 칸에 겹쳐, 바뀌는 동안 줄 폭이 흔들리지 않는다.
            앞 쌍은 오른쪽, 뒤 쌍은 왼쪽에 붙여 두 단어 사이 간격을 지킨다 */}
        <p data-part="role" className="mt-2 text-sm font-medium tracking-[0.2em] text-zinc-300 sm:text-base">
          <span data-swap className="inline-grid justify-items-end">
            <span data-from className="[grid-area:1/1]">
              Frontend
            </span>
            <span data-to className="[grid-area:1/1]">
              Product
            </span>
          </span>{" "}
          <span data-swap className="inline-grid justify-items-start">
            <span data-from className="[grid-area:1/1]">
              Developer
            </span>
            <span data-to className="[grid-area:1/1]">
              Engineer
            </span>
          </span>
        </p>
      </div>
    </div>
  );
}
