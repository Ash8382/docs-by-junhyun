/**
 * 이동과 충돌.
 *
 * 서버가 권위를 갖지만 3단계에서 클라이언트가 같은 함수로 예측한다.
 * 그래서 여기에는 시간·난수·전역 상태가 들어오면 안 된다. 입력이 같으면
 * 출력이 같아야 한다.
 */
import { PLAYER_RADIUS, SPEED } from "@shared/constants";
import { isSolidAtPixel } from "@shared/world";

export interface Vec2 {
  x: number;
  y: number;
}

export const DIRS = ["n", "ne", "e", "se", "s", "sw", "w", "nw"] as const;
export type Dir = (typeof DIRS)[number];

const SQRT1_2 = Math.SQRT1_2;

const VECTORS: Record<Dir, Vec2> = {
  n: { x: 0, y: -1 },
  ne: { x: SQRT1_2, y: -SQRT1_2 },
  e: { x: 1, y: 0 },
  se: { x: SQRT1_2, y: SQRT1_2 },
  s: { x: 0, y: 1 },
  sw: { x: -SQRT1_2, y: SQRT1_2 },
  w: { x: -1, y: 0 },
  nw: { x: -SQRT1_2, y: -SQRT1_2 },
};

export function isDir(v: unknown): v is Dir {
  return typeof v === "string" && (DIRS as readonly string[]).includes(v);
}

export function dirToVector(dir: Dir): Vec2 {
  // 내부 상수(VECTORS)를 그대로 내주면 호출자가 반환값을 변형했을 때
  // 그 방향 전체가 오염된다. 항상 복사본을 반환한다.
  const v = VECTORS[dir];
  return { x: v.x, y: v.y };
}

/** 캐릭터를 정사각형으로 보고 네 모서리가 모두 빈 칸인지 본다 */
function canStand(x: number, y: number): boolean {
  const r = PLAYER_RADIUS;
  return (
    !isSolidAtPixel(x - r, y - r) &&
    !isSolidAtPixel(x + r, y - r) &&
    !isSolidAtPixel(x - r, y + r) &&
    !isSolidAtPixel(x + r, y + r)
  );
}

/**
 * 한 스텝 이동.
 *
 * x와 y를 따로 시도하는 것이 핵심이다. 둘을 한 번에 판정하면 벽에 비스듬히
 * 부딪혔을 때 그냥 멈춰버리는데, 축을 나누면 막히지 않은 축으로 미끄러진다.
 */
export function stepMove(pos: Vec2, dir: Dir | null, dtMs: number): Vec2 {
  // 다른 분기와 마찬가지로 항상 새 객체를 반환한다 — 호출자가 pos를
  // 그대로 돌려받으면 나중에 그 객체를 건드릴 때 원본까지 바뀔 수 있다.
  if (!dir) return { x: pos.x, y: pos.y };
  const v = VECTORS[dir];
  const dist = (SPEED * dtMs) / 1000;

  let { x, y } = pos;
  const nx = x + v.x * dist;
  if (canStand(nx, y)) x = nx;
  const ny = y + v.y * dist;
  if (canStand(x, ny)) y = ny;
  return { x, y };
}

/** 목표 지점으로 향하는 8방향. 충분히 가까우면 null */
export function dirToward(from: Vec2, to: Vec2): Dir | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.hypot(dx, dy) < PLAYER_RADIUS / 2) return null;
  // atan2는 -π..π. 8등분해서 인덱스로 바꾼다. 0 = 동쪽
  const octant = Math.round(Math.atan2(dy, dx) / (Math.PI / 4));
  const byOctant: Dir[] = ["e", "se", "s", "sw", "w", "nw", "n", "ne"];
  return byOctant[((octant % 8) + 8) % 8];
}
