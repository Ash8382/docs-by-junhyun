/**
 * 엔딩 이름 틀이 흰 점을 따라가게 하는 연결. 흰 점(EndingPoint)이 매 프레임 화면 자리(px)를 넘기면 이름 틀(EndingTitle)의 CSS 변수
 * (--ending-x, --ending-y)를 바꾼다. 반올림한 값이 같으면 쓰지 않는다(스크롤 중 스타일 계산을 늘리지 않는다)
 */
let element: HTMLElement | null = null;
let last = "";

export function setEndingAnchorElement(next: HTMLElement | null): void {
  element = next;
  last = "";
}

export function writeEndingAnchor(x: number, y: number): void {
  if (!element) return;
  const key = `${Math.round(x)},${Math.round(y)}`;
  if (key === last) return;
  last = key;
  element.style.setProperty("--ending-x", `${Math.round(x)}px`);
  element.style.setProperty("--ending-y", `${Math.round(y)}px`);
}
