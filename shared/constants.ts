/**
 * 쉼터의 모든 공유 상수.
 *
 * 서버와 클라이언트가 같은 값으로 계산해야 캐릭터가 튀지 않는다.
 * 여기 없는 숫자를 코드에 직접 쓰지 말 것.
 */

/** 타일 한 변의 픽셀 */
export const TILE = 32;
/** 맵의 가로 타일 수 */
export const MAP_W = 40;
/** 맵의 세로 타일 수 */
export const MAP_H = 30;
export const WORLD_W = MAP_W * TILE;
export const WORLD_H = MAP_H * TILE;

/** 걷기 속도 (px/s). 초당 3타일 */
export const SPEED = 96;
/** 캐릭터 충돌 반경 (px) */
export const PLAYER_RADIUS = 10;

/** 서버 시뮬레이션 주파수 */
export const SIM_HZ = 20;
/** 스냅샷 송출 주파수 */
export const SNAPSHOT_HZ = 10;
/** 시뮬레이션 한 틱의 밀리초 */
export const SIM_DT_MS = 1000 / SIM_HZ;
/** 몇 틱마다 스냅샷을 보내는지 */
export const SNAPSHOT_EVERY_TICKS = SIM_HZ / SNAPSHOT_HZ;

/** 방 정원 */
export const ROOM_CAPACITY = 40;

export const NICK_MIN = 2;
export const NICK_MAX = 10;

export const SAY_MAX = 40;
export const SAY_COOLDOWN_MS = 1500;
export const SAY_TTL_MS = 5000;

/** 끊긴 뒤 같은 세션으로 돌아올 수 있는 유예 */
export const REJOIN_GRACE_MS = 20_000;
/** 같은 세션을 누적 방문자로 다시 세지 않는 기간 */
export const VISITOR_DEDUPE_MS = 24 * 60 * 60 * 1000;
