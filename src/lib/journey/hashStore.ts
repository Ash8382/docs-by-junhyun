/**
 * URL 해시를 React 바깥 저장소처럼 다룬다. 상세 패널은 useSyncExternalStore로 구독한다.
 * 해시가 단일 원천이라 공유 주소, 뒤로 가기, 탭 전환이 한 경로로 처리된다.
 */
const CHANGE = "journey:hashchange";

export function subscribeHash(callback: () => void): () => void {
  // 뒤로 가기는 hashchange로 오지만 엔진 차이에 대비해 popstate도 듣는다. 해시가 같으면 useSyncExternalStore가 무시한다.
  window.addEventListener("hashchange", callback);
  window.addEventListener("popstate", callback);
  window.addEventListener(CHANGE, callback);
  return () => {
    window.removeEventListener("hashchange", callback);
    window.removeEventListener("popstate", callback);
    window.removeEventListener(CHANGE, callback);
  };
}

export function getHash(): string {
  return window.location.hash;
}

export function getServerHash(): string {
  return "";
}

// pushState/replaceState의 첫 인자는 null로 둔다. Next가 자기 기록 상태(__NA)를 붙이고 라우터 주소를 맞춘다.
// window.history.state를 넘기면 이미 __NA가 있어 동기화를 건너뛰고, 이후 라우터 갱신이 해시를 지울 수 있다.
function urlWith(hash: string): string {
  return `${window.location.pathname}${window.location.search}${hash}`;
}

/** 기록을 하나 남기고 해시를 바꾼다. 브라우저 뒤로 가기로 되돌릴 수 있다. */
export function pushHash(hash: string): void {
  window.history.pushState(null, "", urlWith(hash));
  window.dispatchEvent(new Event(CHANGE));
}

/** 기록을 남기지 않고 해시를 바꾼다. 탭 전환이나 공유 주소로 열린 패널을 닫을 때 쓴다. */
export function replaceHash(hash: string): void {
  window.history.replaceState(null, "", urlWith(hash));
  window.dispatchEvent(new Event(CHANGE));
}
