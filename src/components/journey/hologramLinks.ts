"use client";

import { useEffect } from "react";
import { parseJourneyHash } from "@/lib/journey/hash";
import { HOLOGRAMS, hologramOfLink } from "@/lib/journey/holograms";
import { setFocusedHologram } from "@/lib/journey/hologramStatus";

/**
 * 홀로그램과 본문 "자세히 보기" 링크를 잇는다(스펙 3절 "홀로그램 상호작용"). 홀로그램을 따로 접근성 있는 인터페이스로 만들지 않고,
 * 기존 링크와 상세 패널 흐름(ProjectDialog)을 단일 진입점으로 쓴다. 3D 코드를 import하지 않는다.
 */

/**
 * 짝인 상세 링크를 눌러 상세 패널의 흐름(기록 하나, 열기, 닫으면 그 링크로 포커스)을 그대로 탄다.
 * 링크가 정확히 하나일 때만 누르고, 없거나 둘 이상이면 아무것도 하지 않는다.
 * 해시가 이미 상세를 가리키면(열려 있거나 닫히는 중) 무시해 연타로 기록이 둘 남지 않게 한다(pushHash는 동기라 두 번째부터 걸러진다).
 */
export function openHologramDetail(hash: string | null): void {
  if (!hash || parseJourneyHash(window.location.hash)) return;
  const links = [...document.querySelectorAll<HTMLAnchorElement>("a[data-journey-detail]")].filter(
    (link) => link.getAttribute("href") === hash,
  );
  if (links.length === 1) links[0].click();
}

function hologramOf(target: EventTarget | null): string | null {
  const link = target instanceof Element ? target.closest("a[data-journey-detail]") : null;
  if (!(link instanceof HTMLAnchorElement)) return null;
  const index = hologramOfLink(link.getAttribute("href") ?? "");
  return index >= 0 ? HOLOGRAMS[index].id : null;
}

/** 상세 링크에 포커스가 오면 그 홀로그램의 테두리가 밝아진다(불투명도는 그대로라 사라진 홀로그램을 억지로 보이지 않는다) */
export function useHologramFocus(): void {
  useEffect(() => {
    const onFocusIn = (event: FocusEvent) => setFocusedHologram(hologramOf(event.target));
    const onFocusOut = (event: FocusEvent) => setFocusedHologram(hologramOf(event.relatedTarget));
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      setFocusedHologram(null);
    };
  }, []);
}
