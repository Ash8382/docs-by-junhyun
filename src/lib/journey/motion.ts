/**
 * 움직임 줄이기(prefers-reduced-motion, 스펙 5절 "움직임 줄이기", 2-4b). 3D는 그대로 보이고, 스크롤을 멈춘 뒤에도 이어지는 움직임만 끈다
 * (Lenis 휠 관성, 카메라 감쇠, 빛줄기, 별 먼지의 떠다님, 카드 바꿈·2D 등장·상세 시트 효과). 설정이 바뀌면 곧바로 따른다.
 * 미디어 쿼리 하나를 두고 읽는다(프레임마다 읽어도 새로 만들지 않는다). 브라우저에서만 부른다.
 */
let query: MediaQueryList | null = null;

function reducedQuery(): MediaQueryList {
  query ??= window.matchMedia("(prefers-reduced-motion: reduce)");
  return query;
}

export function prefersReducedMotion(): boolean {
  return reducedQuery().matches;
}

export function subscribeReducedMotion(listener: () => void): () => void {
  const media = reducedQuery();
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}
