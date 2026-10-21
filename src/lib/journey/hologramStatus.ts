import type { SceneStatus } from "./sceneStatus";

/**
 * 홀로그램 상태(스펙 3절 "썸네일 대체", "홀로그램 상호작용"). 3D 코드를 import하지 않아 본문 쪽 컴포넌트도 쓴다.
 * - 켜진 홀로그램: 이미지 로드·층 데이터·텍스처 배열 업로드가 모두 성공해 메시에서 켜진 홀로그램 id. 장면(scene/Holograms)이 쓴다.
 * - 링크 포커스: 상세 링크에 포커스가 있는 홀로그램 id. JourneyStage가 쓰고 장면이 렌더 단계에서 읽는다(React를 다시 그리지 않는다).
 */

const EMPTY: ReadonlySet<string> = new Set();

let shown: ReadonlySet<string> = EMPTY;
let focused: string | null = null;
const listeners = new Set<() => void>();

export function getShownHolograms(): ReadonlySet<string> {
  return shown;
}

/** 서버 렌더와 첫 하이드레이션에서는 켜진 홀로그램이 없다(썸네일이 보인다) */
export function getServerShownHolograms(): ReadonlySet<string> {
  return EMPTY;
}

/** 켜진 홀로그램을 바꾼다. 목록이 같으면 알리지 않고 같은 객체를 둔다(useSyncExternalStore가 다시 그리지 않게) */
export function setShownHolograms(ids: Iterable<string>): void {
  const next = new Set(ids);
  if (next.size === shown.size && [...next].every((id) => shown.has(id))) return;
  shown = next.size === 0 ? EMPTY : next;
  for (const listener of listeners) listener();
}

export function subscribeHolograms(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * 본문 썸네일을 감추는가: 장면이 ready이고 그 홀로그램이 켜져 있다. 그 순간의 불투명도와는 상관없다.
 * 2막 홀로그램은 차가 멈춰야 떠오르는데, 썸네일이 따라가면 고정된 본문 패널의 높이가 정류장마다 바뀐다.
 */
export function thumbnailHidden(status: SceneStatus, shownIds: ReadonlySet<string>, id: string): boolean {
  return status === "ready" && shownIds.has(id);
}

export function getFocusedHologram(): string | null {
  return focused;
}

export function setFocusedHologram(id: string | null): void {
  focused = id;
}
