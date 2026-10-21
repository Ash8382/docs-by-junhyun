/**
 * 짧은 가로 화면(스펙 5절 "짧은 가로 화면", 2-4c): 가로이고 높이가 500px 미만인 터치 기기. 넓은 화면 배치로는 정류장 카드끼리 겹치고
 * 3D가 거의 가려져 2D로 보인다. 데스크톱은 개발자 도구를 아래에 열어 창이 낮아져도 바뀌지 않게 터치(pointer: coarse)로 한정한다.
 * 처음 그리기 스크립트(app/journey/page.tsx)와 globals.css("3D로 보기" 감추기)도 같은 조건을 쓴다. 미디어 쿼리 하나를 두고 읽는다. 브라우저에서만 부른다.
 */
export const SHORT_LANDSCAPE_QUERY = "(orientation: landscape) and (max-height: 499.98px) and (pointer: coarse)";

let query: MediaQueryList | null = null;

function shortQuery(): MediaQueryList {
  query ??= window.matchMedia(SHORT_LANDSCAPE_QUERY);
  return query;
}

export function isShortLandscape(): boolean {
  return shortQuery().matches;
}

export function subscribeShortLandscape(listener: () => void): () => void {
  const media = shortQuery();
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}
