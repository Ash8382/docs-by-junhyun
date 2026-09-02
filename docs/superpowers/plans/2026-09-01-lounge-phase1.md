# 쉼터(Lounge) 1단계 구현 계획 — 로컬에서 도는 방

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `localhost`에서 두 브라우저 탭을 열면 서로의 캐릭터가 보이고 방향키로 움직이는 실시간 공간을 완성한다.

**Architecture:** `shared/`에 맵·물리·프로토콜을 두고 서버와 클라이언트가 같은 코드를 import한다. 서버는 Node + `ws`로 20Hz 시뮬레이션을 돌리고 10Hz로 전체 스냅샷을 브로드캐스트한다. 클라이언트는 입력만 보내고 받은 좌표를 Canvas 2D로 그대로 그린다. 누적 방문자 수는 서버의 SQLite에 쌓는다.

**Tech Stack:** TypeScript, Node 24 (`node:sqlite` 내장), `ws`, vitest, Next 16 App Router, Canvas 2D

**Spec:** `docs/superpowers/specs/2026-09-01-lounge-design.md`

## Global Constraints

- **예측·보간·델타·바이너리 인코딩은 3단계다.** 1단계는 서버가 전체 스냅샷을 JSON으로 보내고 클라이언트는 받은 좌표를 그대로 그린다. 10Hz라 눈에 띄게 끊기는데 이것이 의도된 기준선이다. 매끄럽게 만들려고 보간을 넣지 말 것
- **오브젝트는 놓이고·충돌하고·조사하면 설명이 뜨는 것까지.** 라디오가 헤드라인을 읽거나 화분이 자라는 동작은 4단계다
- **잔상·NPC·이모트·레이트리밋은 이번 범위가 아니다**
- 서버와 클라이언트는 반드시 `@shared/*`의 같은 코드로 충돌을 계산한다. 어느 한쪽에 물리를 복제하지 말 것
- 공유 상수는 전부 `shared/constants.ts` 한 곳에만 둔다. 매직 넘버 금지
- 기존 `src/` 코드의 스타일을 따른다: 한국어 주석, `function` 선언형 컴포넌트, Tailwind 유틸리티 클래스
- 이미 있는 devDependency `tsx`를 서버 실행에 쓴다. 별도 빌드 단계를 만들지 않는다
- 테스트 파일은 소스 옆에 `*.test.ts`로 둔다

## 파일 구조

| 파일 | 책임 |
|---|---|
| `shared/constants.ts` | 타일·속도·틱·상한 등 모든 공유 상수 |
| `shared/world.ts` | 벽 사각형 목록, 충돌 격자, 오브젝트 배치, 스폰 지점 |
| `shared/physics.ts` | 8방향 이동, 축 분리 충돌 슬라이드, 목표점 추적 |
| `shared/nickname.ts` | 닉네임 검증 (클라 즉시 피드백 + 서버 최종 검증) |
| `shared/protocol.ts` | 메시지 타입, 클라이언트 메시지 런타임 파싱 |
| `server/db.ts` | SQLite. 누적 방문자, 세션 중복 억제 |
| `server/room.ts` | 플레이어 Map, 20Hz tick, 스냅샷 브로드캐스트 |
| `server/net.ts` | `ws` 연결을 `Connection`으로 감싸 Room에 연결 |
| `server/index.ts` | 진입점. 환경변수, 빈 방이면 tick 정지 |
| `src/lib/lounge/net.ts` | WebSocket 클라이언트. engine을 모른다 |
| `src/lib/lounge/engine.ts` | 클라 상태 리듀서, 키→방향 변환. DOM을 모른다 |
| `src/lib/lounge/render.ts` | Canvas 그리기. 상태를 받아 그리기만 |
| `src/components/lounge/NicknameGate.tsx` | 입장 폼 |
| `src/app/lounge/LoungeClient.tsx` | 게이트↔방 전환, 입력 리스너, 말풍선 입력, rAF 루프 |
| `src/app/lounge/page.tsx` | 서버 컴포넌트, 메타데이터 |

---

### Task 1: 프로젝트 배선과 공유 상수

`shared/`를 import할 수 있게 만들고, 테스트 러너를 붙이고, 모든 공유 상수를 한 곳에 정의한다.

**Files:**
- Modify: `tsconfig.json`
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `server/tsconfig.json`
- Create: `shared/constants.ts`
- Test: `shared/constants.test.ts`

**Interfaces:**
- Consumes: 없음
- Produces: `@shared/constants`에서 `TILE`, `MAP_W`, `MAP_H`, `WORLD_W`, `WORLD_H`, `SPEED`, `SIM_HZ`, `SNAPSHOT_HZ`, `SIM_DT_MS`, `SNAPSHOT_EVERY_TICKS`, `PLAYER_RADIUS`, `ROOM_CAPACITY`, `NICK_MIN`, `NICK_MAX`, `SAY_MAX`, `SAY_COOLDOWN_MS`, `SAY_TTL_MS`, `REJOIN_GRACE_MS`, `VISITOR_DEDUPE_MS`

- [ ] **Step 1: 의존성 설치**

```bash
npm install --save-dev vitest ws @types/ws
```

`ws`를 devDependency에 두는 이유는 Next 번들에 들어가지 않기 때문이다. 서버는 `tsx`로 직접 실행한다.

- [ ] **Step 2: tsconfig에 경로 별칭 추가하고 server 제외**

`tsconfig.json`의 `paths`에 한 줄, `exclude`에 한 항목을 더한다.

```json
    "paths": {
      "@/*": ["./src/*"],
      "@shared/*": ["./shared/*"]
    }
```

```json
  "exclude": ["node_modules", "server"]
```

- [ ] **Step 3: 서버 전용 tsconfig 생성**

`server/tsconfig.json`:

```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "lib": ["esnext"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "types": ["node"],
    "jsx": "preserve",
    "incremental": false,
    "plugins": [],
    "paths": {
      "@shared/*": ["../shared/*"]
    }
  },
  "include": ["**/*.ts", "../shared/**/*.ts"],
  "exclude": []
}
```

- [ ] **Step 4: vitest 설정 생성**

`vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@shared": fileURLToPath(new URL("./shared", import.meta.url)),
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["shared/**/*.test.ts", "server/**/*.test.ts", "src/**/*.test.ts"],
  },
});
```

- [ ] **Step 5: package.json 스크립트 추가**

`scripts`에 세 줄을 더한다. 기존 `typecheck`는 서버까지 보도록 바꾼다.

```json
    "test": "vitest run",
    "test:watch": "vitest",
    "server:dev": "tsx watch server/index.ts",
    "typecheck": "tsc --noEmit && tsc --noEmit -p server/tsconfig.json"
```

- [ ] **Step 6: 실패하는 테스트 작성**

`shared/constants.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  MAP_H,
  MAP_W,
  SIM_HZ,
  SNAPSHOT_EVERY_TICKS,
  SNAPSHOT_HZ,
  SIM_DT_MS,
  TILE,
  WORLD_H,
  WORLD_W,
} from "@shared/constants";

describe("constants", () => {
  it("월드 크기는 타일 수 × 타일 크기다", () => {
    expect(WORLD_W).toBe(MAP_W * TILE);
    expect(WORLD_H).toBe(MAP_H * TILE);
  });

  it("스냅샷 주기는 시뮬레이션 틱의 정수배다", () => {
    expect(Number.isInteger(SNAPSHOT_EVERY_TICKS)).toBe(true);
    expect(SNAPSHOT_EVERY_TICKS).toBe(SIM_HZ / SNAPSHOT_HZ);
  });

  it("시뮬레이션 한 틱은 50ms다", () => {
    expect(SIM_DT_MS).toBe(50);
  });
});
```

- [ ] **Step 7: 테스트가 실패하는지 확인**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "@shared/constants"`

- [ ] **Step 8: 상수 파일 작성**

`shared/constants.ts`:

```ts
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
```

- [ ] **Step 9: 테스트 통과 확인**

Run: `npm test`
Expected: PASS (3 tests)

- [ ] **Step 10: 커밋**

```bash
git add tsconfig.json package.json package-lock.json vitest.config.ts server/tsconfig.json shared/constants.ts shared/constants.test.ts
git commit -m "chore: 쉼터용 shared 경로 별칭과 vitest 배선"
```

---

### Task 2: 맵과 충돌 격자

**Files:**
- Create: `shared/world.ts`
- Test: `shared/world.test.ts`

**Interfaces:**
- Consumes: `@shared/constants`의 `TILE`, `MAP_W`, `MAP_H`
- Produces: `isSolidTile(tx: number, ty: number): boolean`, `isSolidAtPixel(x: number, y: number): boolean`, `objectAt(tx: number, ty: number): WorldObject | null`, `OBJECTS: readonly WorldObject[]`, `SPAWN: { x: number; y: number }`, `interface WorldObject { id: string; tx: number; ty: number; label: string; description: string }`

- [ ] **Step 1: 실패하는 테스트 작성**

`shared/world.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { MAP_H, MAP_W, TILE } from "@shared/constants";
import { isSolidAtPixel, isSolidTile, objectAt, OBJECTS, SPAWN } from "@shared/world";

describe("world", () => {
  it("맵 바깥은 막혀 있다", () => {
    expect(isSolidTile(-1, 5)).toBe(true);
    expect(isSolidTile(MAP_W, 5)).toBe(true);
    expect(isSolidTile(5, -1)).toBe(true);
    expect(isSolidTile(5, MAP_H)).toBe(true);
  });

  it("테두리는 벽이다", () => {
    expect(isSolidTile(0, 0)).toBe(true);
    expect(isSolidTile(MAP_W - 1, MAP_H - 1)).toBe(true);
  });

  it("스폰 지점은 서 있을 수 있는 곳이다", () => {
    expect(isSolidAtPixel(SPAWN.x, SPAWN.y)).toBe(false);
  });

  it("오브젝트가 놓인 타일은 막혀 있다", () => {
    for (const obj of OBJECTS) {
      expect(isSolidTile(obj.tx, obj.ty)).toBe(true);
    }
  });

  it("오브젝트 타일을 조회할 수 있다", () => {
    const first = OBJECTS[0];
    expect(objectAt(first.tx, first.ty)?.id).toBe(first.id);
    expect(objectAt(-1, -1)).toBeNull();
  });

  it("픽셀 좌표를 타일로 환산한다", () => {
    // 타일 (0,0)은 벽이므로 그 안의 어떤 픽셀도 막혀 있다
    expect(isSolidAtPixel(TILE - 1, TILE - 1)).toBe(true);
  });

  it("오브젝트 id는 중복되지 않는다", () => {
    const ids = OBJECTS.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npm test shared/world`
Expected: FAIL — `Failed to resolve import "@shared/world"`

- [ ] **Step 3: 맵 구현**

`shared/world.ts`:

```ts
/**
 * 방의 생김새.
 *
 * 벽을 타일 하나하나가 아니라 사각형 목록으로 정의한다. 방을 고칠 때
 * 40×30 문자열 지도를 다시 그리는 것보다 사각형 하나를 옮기는 게 쉽다.
 * 격자는 모듈 로드 시 한 번만 만든다.
 */
import { MAP_H, MAP_W, TILE } from "@shared/constants";

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface WorldObject {
  id: string;
  tx: number;
  ty: number;
  label: string;
  /** 조사했을 때 뜨는 한 줄 */
  description: string;
}

const WALL_RECTS: Rect[] = [
  // 테두리
  { x: 0, y: 0, w: MAP_W, h: 1 },
  { x: 0, y: MAP_H - 1, w: MAP_W, h: 1 },
  { x: 0, y: 0, w: 1, h: MAP_H },
  { x: MAP_W - 1, y: 0, w: 1, h: MAP_H },
  // 내부 구조물
  { x: 8, y: 6, w: 4, h: 1 },
  { x: 26, y: 6, w: 6, h: 1 },
  { x: 18, y: 14, w: 1, h: 6 },
  { x: 5, y: 20, w: 6, h: 1 },
];

export const OBJECTS: readonly WorldObject[] = [
  {
    id: "radio",
    tx: 6,
    ty: 5,
    label: "라디오",
    description: "지직거린다. 아직 주파수가 안 맞는 것 같다.",
  },
  {
    id: "bookshelf",
    tx: 30,
    ty: 5,
    label: "책장",
    description: "누가 읽다 만 글들이 꽂혀 있다.",
  },
  {
    id: "campfire",
    tx: 20,
    ty: 10,
    label: "모닥불",
    description: "작게 타고 있다. 곁에 있으면 따뜻하다.",
  },
  {
    id: "plant",
    tx: 10,
    ty: 22,
    label: "화분",
    description: "잎이 몇 장 없다. 물을 주면 좋아할까.",
  },
  {
    id: "desk",
    tx: 33,
    ty: 20,
    label: "책상",
    description: "누군가 앉아 있었던 자리. 지금은 비어 있다.",
  },
];

/** 스폰 지점 (타일 20,16의 중앙) */
export const SPAWN = { x: 20 * TILE + TILE / 2, y: 16 * TILE + TILE / 2 };

const grid = buildGrid();

function buildGrid(): Uint8Array {
  const g = new Uint8Array(MAP_W * MAP_H);
  for (const r of WALL_RECTS) {
    for (let ty = r.y; ty < r.y + r.h; ty++) {
      for (let tx = r.x; tx < r.x + r.w; tx++) {
        g[ty * MAP_W + tx] = 1;
      }
    }
  }
  for (const obj of OBJECTS) {
    g[obj.ty * MAP_W + obj.tx] = 1;
  }
  return g;
}

export function isSolidTile(tx: number, ty: number): boolean {
  if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return true;
  return grid[ty * MAP_W + tx] === 1;
}

export function isSolidAtPixel(x: number, y: number): boolean {
  return isSolidTile(Math.floor(x / TILE), Math.floor(y / TILE));
}

export function objectAt(tx: number, ty: number): WorldObject | null {
  return OBJECTS.find((o) => o.tx === tx && o.ty === ty) ?? null;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test shared/world`
Expected: PASS (7 tests)

- [ ] **Step 5: 커밋**

```bash
git add shared/world.ts shared/world.test.ts
git commit -m "feat: 쉼터 맵과 충돌 격자"
```

---

### Task 3: 이동과 충돌 슬라이드

서버와 클라이언트가 공유하는 유일한 물리 코드다. 3단계의 클라이언트 예측이 성립하려면 양쪽이 글자 그대로 같은 함수를 써야 한다.

**Files:**
- Create: `shared/physics.ts`
- Test: `shared/physics.test.ts`

**Interfaces:**
- Consumes: `@shared/constants`의 `SPEED`, `PLAYER_RADIUS`, `@shared/world`의 `isSolidAtPixel`
- Produces: `type Dir = "n"|"ne"|"e"|"se"|"s"|"sw"|"w"|"nw"`, `DIRS: readonly Dir[]`, `interface Vec2 { x: number; y: number }`, `isDir(v: unknown): v is Dir`, `dirToVector(dir: Dir): Vec2`, `stepMove(pos: Vec2, dir: Dir | null, dtMs: number): Vec2`, `dirToward(from: Vec2, to: Vec2): Dir | null`

- [ ] **Step 1: 실패하는 테스트 작성**

`shared/physics.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { SPEED, TILE } from "@shared/constants";
import { dirToVector, dirToward, isDir, stepMove } from "@shared/physics";

/** 열린 바닥 한가운데. 타일 (20,16) 중앙 */
const OPEN = { x: 20 * TILE + TILE / 2, y: 16 * TILE + TILE / 2 };

describe("physics", () => {
  it("방향 벡터는 항상 단위 길이다", () => {
    for (const dir of ["n", "ne", "e", "se", "s", "sw", "w", "nw"] as const) {
      const v = dirToVector(dir);
      expect(Math.hypot(v.x, v.y)).toBeCloseTo(1, 6);
    }
  });

  it("빈 곳에서 1초 동안 동쪽으로 SPEED만큼 간다", () => {
    let pos = OPEN;
    for (let i = 0; i < 20; i++) pos = stepMove(pos, "e", 50);
    expect(pos.x).toBeCloseTo(OPEN.x + SPEED, 5);
    expect(pos.y).toBeCloseTo(OPEN.y, 5);
  });

  it("대각선도 같은 거리를 간다", () => {
    let pos = OPEN;
    for (let i = 0; i < 20; i++) pos = stepMove(pos, "ne", 50);
    const moved = Math.hypot(pos.x - OPEN.x, pos.y - OPEN.y);
    expect(moved).toBeCloseTo(SPEED, 5);
  });

  it("방향이 없으면 제자리다", () => {
    expect(stepMove(OPEN, null, 50)).toEqual(OPEN);
  });

  it("벽을 향해 계속 걸어도 뚫고 나가지 않는다", () => {
    // 타일 (1,1)에서 서쪽 벽(타일 0)을 향해 간다
    let pos = { x: 1 * TILE + TILE / 2, y: 1 * TILE + TILE / 2 };
    for (let i = 0; i < 100; i++) pos = stepMove(pos, "w", 50);
    expect(pos.x).toBeGreaterThan(TILE);
  });

  it("벽에 대각선으로 부딪히면 벽을 따라 미끄러진다", () => {
    // 왼쪽 벽에 딱 붙어서 북서쪽으로 이동 → x는 막히고 y만 움직여야 한다
    const start = { x: TILE + 11, y: 10 * TILE };
    const after = stepMove(start, "nw", 50);
    expect(after.y).toBeLessThan(start.y);
    expect(after.x).toBeCloseTo(start.x, 5);
  });

  it("목표 방향을 8방향으로 환산한다", () => {
    expect(dirToward({ x: 0, y: 0 }, { x: 100, y: 0 })).toBe("e");
    expect(dirToward({ x: 0, y: 0 }, { x: 0, y: -100 })).toBe("n");
    expect(dirToward({ x: 0, y: 0 }, { x: 100, y: -100 })).toBe("ne");
  });

  it("목표에 이미 도착했으면 방향이 없다", () => {
    expect(dirToward({ x: 10, y: 10 }, { x: 10, y: 10 })).toBeNull();
  });

  it("isDir은 잘못된 값을 걸러낸다", () => {
    expect(isDir("e")).toBe(true);
    expect(isDir("up")).toBe(false);
    expect(isDir(3)).toBe(false);
    expect(isDir(null)).toBe(false);
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npm test shared/physics`
Expected: FAIL — `Failed to resolve import "@shared/physics"`

- [ ] **Step 3: 물리 구현**

`shared/physics.ts`:

```ts
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
  return VECTORS[dir];
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
  if (!dir) return pos;
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
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test shared/physics`
Expected: PASS (9 tests)

- [ ] **Step 5: 커밋**

```bash
git add shared/physics.ts shared/physics.test.ts
git commit -m "feat: 이동과 벽 슬라이드 충돌"
```

---

### Task 4: 닉네임 검증

**Files:**
- Create: `shared/nickname.ts`
- Test: `shared/nickname.test.ts`

**Interfaces:**
- Consumes: `@shared/constants`의 `NICK_MIN`, `NICK_MAX`
- Produces: `type NicknameError = "too_short" | "too_long" | "bad_chars" | "banned"`, `type NicknameResult = { ok: true; nick: string } | { ok: false; error: NicknameError }`, `validateNickname(raw: string): NicknameResult`, `NICKNAME_MESSAGES: Record<NicknameError, string>`

- [ ] **Step 1: 실패하는 테스트 작성**

`shared/nickname.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { NICKNAME_MESSAGES, validateNickname } from "@shared/nickname";

describe("validateNickname", () => {
  it("정상 닉네임을 통과시키고 앞뒤 공백을 다듬는다", () => {
    expect(validateNickname("  밤톨 ")).toEqual({ ok: true, nick: "밤톨" });
    expect(validateNickname("junhyun")).toEqual({ ok: true, nick: "junhyun" });
    expect(validateNickname("ab12")).toEqual({ ok: true, nick: "ab12" });
  });

  it("너무 짧으면 거부한다", () => {
    expect(validateNickname("가")).toEqual({ ok: false, error: "too_short" });
    expect(validateNickname("   ")).toEqual({ ok: false, error: "too_short" });
  });

  it("너무 길면 거부한다", () => {
    expect(validateNickname("가나다라마바사아자차카")).toEqual({
      ok: false,
      error: "too_long",
    });
  });

  it("한글·영문·숫자가 아니면 거부한다", () => {
    expect(validateNickname("밤톨!")).toEqual({ ok: false, error: "bad_chars" });
    expect(validateNickname("hi there")).toEqual({ ok: false, error: "bad_chars" });
    expect(validateNickname("😀😀")).toEqual({ ok: false, error: "bad_chars" });
    expect(validateNickname("ㅋㅋ")).toEqual({ ok: false, error: "bad_chars" });
  });

  it("금칙어를 부분일치로 거른다", () => {
    expect(validateNickname("운영자")).toEqual({ ok: false, error: "banned" });
    expect(validateNickname("나는admin")).toEqual({ ok: false, error: "banned" });
    expect(validateNickname("ADMIN")).toEqual({ ok: false, error: "banned" });
  });

  it("모든 오류에 사용자용 문구가 있다", () => {
    for (const key of ["too_short", "too_long", "bad_chars", "banned"] as const) {
      expect(NICKNAME_MESSAGES[key].length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npm test shared/nickname`
Expected: FAIL — `Failed to resolve import "@shared/nickname"`

- [ ] **Step 3: 구현**

`shared/nickname.ts`:

```ts
/**
 * 닉네임 검증.
 *
 * 클라이언트는 입력 즉시 피드백을 주려고 쓰고, 서버는 최종 판정을 위해 쓴다.
 * 클라이언트 검증은 편의일 뿐이므로 서버가 반드시 다시 검사해야 한다.
 */
import { NICK_MAX, NICK_MIN } from "@shared/constants";

export type NicknameError = "too_short" | "too_long" | "bad_chars" | "banned";

export type NicknameResult =
  | { ok: true; nick: string }
  | { ok: false; error: NicknameError };

export const NICKNAME_MESSAGES: Record<NicknameError, string> = {
  too_short: `${NICK_MIN}자 이상 입력해주세요.`,
  too_long: `${NICK_MAX}자까지 쓸 수 있어요.`,
  bad_chars: "한글, 영문, 숫자만 쓸 수 있어요.",
  banned: "이 닉네임은 쓸 수 없어요.",
};

/**
 * 완벽을 목표로 하지 않는다. 명백한 사칭과 흔한 욕만 막고,
 * 나머지는 휘발성 채팅이라는 설계로 감당한다.
 */
const BANNED = ["admin", "운영자", "관리자", "시발", "씨발", "병신", "새끼"];

/** 완성형 한글, 영문, 숫자만. 자음·모음 단독(ㅋ, ㅏ)은 제외한다 */
const ALLOWED = /^[가-힣a-zA-Z0-9]+$/;

export function validateNickname(raw: string): NicknameResult {
  const nick = raw.trim();

  if (nick.length < NICK_MIN) return { ok: false, error: "too_short" };
  if (nick.length > NICK_MAX) return { ok: false, error: "too_long" };
  if (!ALLOWED.test(nick)) return { ok: false, error: "bad_chars" };

  const lowered = nick.toLowerCase();
  if (BANNED.some((word) => lowered.includes(word))) {
    return { ok: false, error: "banned" };
  }

  return { ok: true, nick };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test shared/nickname`
Expected: PASS (6 tests)

- [ ] **Step 5: 커밋**

```bash
git add shared/nickname.ts shared/nickname.test.ts
git commit -m "feat: 닉네임 검증 규칙"
```

---

### Task 5: 프로토콜과 메시지 파싱

**Files:**
- Create: `shared/protocol.ts`
- Test: `shared/protocol.test.ts`

**Interfaces:**
- Consumes: `@shared/physics`의 `Dir`, `isDir`
- Produces: `interface PlayerState { id: string; nick: string; hue: number; x: number; y: number; dir: Dir | null }`, `type ClientMessage`, `type ServerMessage`, `type ErrorCode = "bad_nickname" | "room_full" | "bad_message"`, `parseClientMessage(raw: string): ClientMessage | null`

- [ ] **Step 1: 실패하는 테스트 작성**

`shared/protocol.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseClientMessage } from "@shared/protocol";

describe("parseClientMessage", () => {
  it("정상 메시지를 통과시킨다", () => {
    expect(parseClientMessage('{"t":"hello","nick":"밤톨"}')).toEqual({
      t: "hello",
      nick: "밤톨",
    });
    expect(parseClientMessage('{"t":"input","seq":3,"dir":"e"}')).toEqual({
      t: "input",
      seq: 3,
      dir: "e",
    });
    expect(parseClientMessage('{"t":"input","seq":3,"dir":null}')).toEqual({
      t: "input",
      seq: 3,
      dir: null,
    });
    expect(parseClientMessage('{"t":"click","seq":1,"x":10,"y":20}')).toEqual({
      t: "click",
      seq: 1,
      x: 10,
      y: 20,
    });
    expect(parseClientMessage('{"t":"say","text":"안녕"}')).toEqual({
      t: "say",
      text: "안녕",
    });
    expect(parseClientMessage('{"t":"interact","objectId":"radio"}')).toEqual({
      t: "interact",
      objectId: "radio",
    });
  });

  it("세션 토큰이 있으면 함께 넘긴다", () => {
    expect(parseClientMessage('{"t":"hello","nick":"밤톨","sessionToken":"abc"}')).toEqual({
      t: "hello",
      nick: "밤톨",
      sessionToken: "abc",
    });
  });

  it("JSON이 아니면 null이다", () => {
    expect(parseClientMessage("not json")).toBeNull();
    expect(parseClientMessage("")).toBeNull();
  });

  it("모르는 타입은 null이다", () => {
    expect(parseClientMessage('{"t":"launch_missile"}')).toBeNull();
    expect(parseClientMessage('{"nick":"밤톨"}')).toBeNull();
    expect(parseClientMessage('"just a string"')).toBeNull();
    expect(parseClientMessage("null")).toBeNull();
  });

  it("필드 타입이 틀리면 null이다", () => {
    expect(parseClientMessage('{"t":"input","seq":"3","dir":"e"}')).toBeNull();
    expect(parseClientMessage('{"t":"input","seq":3,"dir":"up"}')).toBeNull();
    expect(parseClientMessage('{"t":"hello","nick":123}')).toBeNull();
    expect(parseClientMessage('{"t":"click","seq":1,"x":"10","y":20}')).toBeNull();
    expect(parseClientMessage('{"t":"click","seq":1,"x":null,"y":20}')).toBeNull();
  });

  it("좌표가 유한수가 아니면 null이다", () => {
    expect(parseClientMessage('{"t":"click","seq":1,"x":1e999,"y":0}')).toBeNull();
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npm test shared/protocol`
Expected: FAIL — `Failed to resolve import "@shared/protocol"`

- [ ] **Step 3: 구현**

`shared/protocol.ts`:

```ts
/**
 * 서버와 클라이언트가 주고받는 메시지.
 *
 * 1단계는 JSON이고 스냅샷에 전체 플레이어가 들어간다.
 * 델타와 바이너리 인코딩은 3단계에서 이 파일을 고쳐 넣는다.
 *
 * 클라이언트는 자기 위치를 보내지 않는다. 의도만 보내고 위치는 서버가 정한다.
 * `click`의 좌표는 "여기 있다"가 아니라 "저기로 가고 싶다"는 목표다.
 */
import { isDir, type Dir } from "@shared/physics";

export interface PlayerState {
  id: string;
  nick: string;
  /** 아바타 색상 0~359 */
  hue: number;
  x: number;
  y: number;
  dir: Dir | null;
}

export type ErrorCode = "bad_nickname" | "room_full" | "bad_message";

export type ClientMessage =
  | { t: "hello"; nick: string; sessionToken?: string }
  | { t: "input"; seq: number; dir: Dir | null }
  | { t: "click"; seq: number; x: number; y: number }
  | { t: "say"; text: string }
  | { t: "interact"; objectId: string };

export type ServerMessage =
  | {
      t: "welcome";
      playerId: string;
      sessionToken: string;
      totalVisitors: number;
      players: PlayerState[];
    }
  | { t: "snapshot"; tick: number; ack: number; players: PlayerState[] }
  | { t: "join"; player: PlayerState }
  | { t: "leave"; playerId: string }
  | { t: "say"; playerId: string; text: string }
  | { t: "error"; code: ErrorCode; message: string };

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/**
 * 신뢰할 수 없는 문자열을 메시지로 바꾼다. 조금이라도 이상하면 null.
 * 서버가 공개 인터넷에서 받는 입력이므로 여기서 막지 못하면 뒤에서 터진다.
 */
export function parseClientMessage(raw: string): ClientMessage | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null) return null;

  const msg = data as Record<string, unknown>;

  switch (msg.t) {
    case "hello": {
      if (typeof msg.nick !== "string") return null;
      if (msg.sessionToken !== undefined && typeof msg.sessionToken !== "string") {
        return null;
      }
      return msg.sessionToken === undefined
        ? { t: "hello", nick: msg.nick }
        : { t: "hello", nick: msg.nick, sessionToken: msg.sessionToken };
    }
    case "input": {
      if (!isFiniteNumber(msg.seq)) return null;
      if (msg.dir !== null && !isDir(msg.dir)) return null;
      return { t: "input", seq: msg.seq, dir: msg.dir as Dir | null };
    }
    case "click": {
      if (!isFiniteNumber(msg.seq)) return null;
      if (!isFiniteNumber(msg.x) || !isFiniteNumber(msg.y)) return null;
      return { t: "click", seq: msg.seq, x: msg.x, y: msg.y };
    }
    case "say": {
      if (typeof msg.text !== "string") return null;
      return { t: "say", text: msg.text };
    }
    case "interact": {
      if (typeof msg.objectId !== "string") return null;
      return { t: "interact", objectId: msg.objectId };
    }
    default:
      return null;
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test shared/protocol`
Expected: PASS (6 tests)

- [ ] **Step 5: 커밋**

```bash
git add shared/protocol.ts shared/protocol.test.ts
git commit -m "feat: 쉼터 메시지 프로토콜과 방어적 파싱"
```

---

### Task 6: SQLite와 누적 방문자

**Files:**
- Create: `server/db.ts`
- Test: `server/db.test.ts`

**Interfaces:**
- Consumes: `@shared/constants`의 `VISITOR_DEDUPE_MS`
- Produces: `interface LoungeDb { totalVisitors(): number; countVisit(sessionToken: string, now: number): number; close(): void }`, `openDb(path: string): LoungeDb`

- [ ] **Step 1: 실패하는 테스트 작성**

`server/db.test.ts`:

```ts
import { afterEach, describe, expect, it } from "vitest";
import { VISITOR_DEDUPE_MS } from "@shared/constants";
import { openDb, type LoungeDb } from "./db";

let db: LoungeDb;

afterEach(() => db?.close());

describe("openDb", () => {
  it("처음에는 누적 방문자가 0이다", () => {
    db = openDb(":memory:");
    expect(db.totalVisitors()).toBe(0);
  });

  it("새 세션은 카운트를 올린다", () => {
    db = openDb(":memory:");
    expect(db.countVisit("a", 1000)).toBe(1);
    expect(db.countVisit("b", 1000)).toBe(2);
    expect(db.totalVisitors()).toBe(2);
  });

  it("같은 세션은 24시간 안에 다시 세지 않는다", () => {
    db = openDb(":memory:");
    db.countVisit("a", 1000);
    expect(db.countVisit("a", 1000 + VISITOR_DEDUPE_MS - 1)).toBe(1);
    expect(db.totalVisitors()).toBe(1);
  });

  it("24시간이 지나면 다시 센다", () => {
    db = openDb(":memory:");
    db.countVisit("a", 1000);
    expect(db.countVisit("a", 1000 + VISITOR_DEDUPE_MS)).toBe(2);
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npm test server/db`
Expected: FAIL — `Failed to resolve import "./db"`

- [ ] **Step 3: 구현**

`server/db.ts`:

```ts
/**
 * 쉼터의 저장소.
 *
 * Node 24 내장 `node:sqlite`를 쓴다. better-sqlite3 같은 네이티브 모듈을 피하면
 * 2단계의 ARM Docker 빌드에 컴파일 단계가 생기지 않는다. 실험적 기능이라
 * 실행 시 경고가 뜨는데 동작에는 문제가 없다.
 */
import { DatabaseSync } from "node:sqlite";
import { VISITOR_DEDUPE_MS } from "@shared/constants";

export interface LoungeDb {
  totalVisitors(): number;
  /** 방문을 세고 갱신된 누적 수를 돌려준다 */
  countVisit(sessionToken: string, now: number): number;
  close(): void;
}

export function openDb(path: string): LoungeDb {
  const db = new DatabaseSync(path);

  db.exec(`
    CREATE TABLE IF NOT EXISTS visitors (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      total INTEGER NOT NULL DEFAULT 0
    );
    INSERT OR IGNORE INTO visitors (id, total) VALUES (1, 0);

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      last_counted_at INTEGER NOT NULL
    );
  `);

  const selectTotal = db.prepare("SELECT total FROM visitors WHERE id = 1");
  const selectSession = db.prepare(
    "SELECT last_counted_at FROM sessions WHERE token = ?",
  );
  const bumpTotal = db.prepare("UPDATE visitors SET total = total + 1 WHERE id = 1");
  const upsertSession = db.prepare(`
    INSERT INTO sessions (token, last_counted_at) VALUES (?, ?)
    ON CONFLICT (token) DO UPDATE SET last_counted_at = excluded.last_counted_at
  `);

  function totalVisitors(): number {
    return Number((selectTotal.get() as { total: number }).total);
  }

  return {
    totalVisitors,

    countVisit(sessionToken: string, now: number): number {
      const row = selectSession.get(sessionToken) as
        | { last_counted_at: number }
        | undefined;

      const isNew = !row || now - Number(row.last_counted_at) >= VISITOR_DEDUPE_MS;
      if (isNew) {
        bumpTotal.run();
        upsertSession.run(sessionToken, now);
      }
      return totalVisitors();
    },

    close() {
      db.close();
    },
  };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test server/db`
Expected: PASS (4 tests)

- [ ] **Step 5: 커밋**

```bash
git add server/db.ts server/db.test.ts
git commit -m "feat: 누적 방문자 저장소"
```

---

### Task 7: Room — tick 루프와 스냅샷

서버의 심장이다. 시간과 소켓을 주입받아 결정론적으로 테스트할 수 있게 만든다.

**Files:**
- Create: `server/room.ts`
- Test: `server/room.test.ts`

**Interfaces:**
- Consumes: `@shared/constants`, `@shared/world`의 `SPAWN`, `@shared/physics`의 `stepMove`·`dirToward`·`Dir`, `@shared/nickname`의 `validateNickname`·`NICKNAME_MESSAGES`, `@shared/protocol`의 타입들, `./db`의 `LoungeDb`
- Produces: `interface Connection { id: string; send(msg: ServerMessage): void; close(): void }`, `class Room` with `join(conn, nick, sessionToken, now): boolean`, `leave(connId): void`, `handleInput(connId, seq, dir): void`, `handleClick(connId, seq, x, y): void`, `handleSay(connId, text, now): void`, `tick(): void`, `get isEmpty(): boolean`, `get playerCount(): number`

- [ ] **Step 1: 실패하는 테스트 작성**

`server/room.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { ROOM_CAPACITY, SPEED, SIM_HZ } from "@shared/constants";
import { SPAWN } from "@shared/world";
import type { ServerMessage } from "@shared/protocol";
import { openDb, type LoungeDb } from "./db";
import { Room, type Connection } from "./room";

class FakeConn implements Connection {
  sent: ServerMessage[] = [];
  closed = false;
  constructor(public id: string) {}
  send(msg: ServerMessage) {
    this.sent.push(msg);
  }
  close() {
    this.closed = true;
  }
  /** 마지막 스냅샷에서 이 플레이어 상태를 찾는다 */
  lastSnapshotOf(playerId: string) {
    const snaps = this.sent.filter((m) => m.t === "snapshot");
    const last = snaps[snaps.length - 1];
    if (!last || last.t !== "snapshot") return undefined;
    return last.players.find((p) => p.id === playerId);
  }
  find<T extends ServerMessage["t"]>(t: T) {
    return this.sent.find((m) => m.t === t) as Extract<ServerMessage, { t: T }> | undefined;
  }
}

let db: LoungeDb;
let room: Room;

beforeEach(() => {
  db = openDb(":memory:");
  room = new Room(db);
});

/** n초만큼 시뮬레이션을 돌린다 */
function runSeconds(n: number) {
  for (let i = 0; i < SIM_HZ * n; i++) room.tick();
}

describe("Room", () => {
  it("입장하면 welcome을 받고 스폰 지점에 선다", () => {
    const conn = new FakeConn("c1");
    expect(room.join(conn, "밤톨", undefined, 1000)).toBe(true);

    const welcome = conn.find("welcome");
    expect(welcome?.playerId).toBe("c1");
    expect(welcome?.totalVisitors).toBe(1);
    expect(welcome?.sessionToken).toBeTruthy();
    expect(welcome?.players[0]).toMatchObject({ nick: "밤톨", x: SPAWN.x, y: SPAWN.y });
  });

  it("잘못된 닉네임은 거부하고 연결을 닫는다", () => {
    const conn = new FakeConn("c1");
    expect(room.join(conn, "!", undefined, 1000)).toBe(false);
    expect(conn.find("error")?.code).toBe("bad_nickname");
    expect(conn.closed).toBe(true);
    expect(room.playerCount).toBe(0);
  });

  it("정원이 차면 거부한다", () => {
    for (let i = 0; i < ROOM_CAPACITY; i++) {
      expect(room.join(new FakeConn(`c${i}`), `사람${i % 10}`, undefined, 1000)).toBe(true);
    }
    const overflow = new FakeConn("over");
    expect(room.join(overflow, "밤톨", undefined, 1000)).toBe(false);
    expect(overflow.find("error")?.code).toBe("room_full");
  });

  it("기존 접속자에게 join을 알린다", () => {
    const a = new FakeConn("a");
    room.join(a, "가가", undefined, 1000);
    const b = new FakeConn("b");
    room.join(b, "나나", undefined, 1000);

    expect(a.find("join")?.player.id).toBe("b");
    expect(b.find("join")).toBeUndefined();
  });

  it("입력한 방향으로 1초에 SPEED만큼 움직인다", () => {
    const conn = new FakeConn("c1");
    room.join(conn, "밤톨", undefined, 1000);
    room.handleInput("c1", 1, "e");
    runSeconds(1);

    const me = conn.lastSnapshotOf("c1");
    expect(me?.x).toBeCloseTo(SPAWN.x + SPEED, 3);
    expect(me?.y).toBeCloseTo(SPAWN.y, 3);
  });

  it("스냅샷은 처리한 마지막 입력 seq를 ack로 돌려준다", () => {
    const conn = new FakeConn("c1");
    room.join(conn, "밤톨", undefined, 1000);
    room.handleInput("c1", 7, "e");
    runSeconds(1);

    const snaps = conn.sent.filter((m) => m.t === "snapshot");
    const last = snaps[snaps.length - 1];
    expect(last.t === "snapshot" && last.ack).toBe(7);
  });

  it("클릭 목표에 도착하면 멈춘다", () => {
    const conn = new FakeConn("c1");
    room.join(conn, "밤톨", undefined, 1000);
    room.handleClick("c1", 1, SPAWN.x + 32, SPAWN.y);
    runSeconds(3);

    const me = conn.lastSnapshotOf("c1");
    // 도착 판정에 여유 반경이 있으므로 정확히 목표점에 서지는 않는다
    expect(Math.abs(me!.x - (SPAWN.x + 32))).toBeLessThan(6);
    expect(me?.dir).toBeNull();
  });

  it("벽 안쪽을 클릭하면 무시한다", () => {
    const conn = new FakeConn("c1");
    room.join(conn, "밤톨", undefined, 1000);
    room.handleClick("c1", 1, 8, 8); // 타일 (0,0) — 테두리 벽
    runSeconds(1);

    const me = conn.lastSnapshotOf("c1");
    expect(me?.x).toBeCloseTo(SPAWN.x, 3);
  });

  it("초당 SNAPSHOT_HZ번 스냅샷을 보낸다", () => {
    const conn = new FakeConn("c1");
    room.join(conn, "밤톨", undefined, 1000);
    conn.sent.length = 0;
    runSeconds(1);
    expect(conn.sent.filter((m) => m.t === "snapshot")).toHaveLength(10);
  });

  it("말풍선을 모두에게 전달하고 쿨다운을 건다", () => {
    const a = new FakeConn("a");
    const b = new FakeConn("b");
    room.join(a, "가가", undefined, 1000);
    room.join(b, "나나", undefined, 1000);

    room.handleSay("a", "안녕", 2000);
    expect(b.find("say")).toMatchObject({ playerId: "a", text: "안녕" });

    b.sent.length = 0;
    room.handleSay("a", "또안녕", 2100); // 쿨다운 안
    expect(b.find("say")).toBeUndefined();
  });

  it("말풍선은 길이를 잘라낸다", () => {
    const a = new FakeConn("a");
    room.join(a, "가가", undefined, 1000);
    a.sent.length = 0;
    room.handleSay("a", "가".repeat(100), 2000);
    expect(a.find("say")?.text).toHaveLength(40);
  });

  it("퇴장하면 leave를 알리고 비어 있다고 보고한다", () => {
    const a = new FakeConn("a");
    const b = new FakeConn("b");
    room.join(a, "가가", undefined, 1000);
    room.join(b, "나나", undefined, 1000);
    a.sent.length = 0;

    room.leave("b");
    expect(a.find("leave")?.playerId).toBe("b");
    expect(room.playerCount).toBe(1);

    room.leave("a");
    expect(room.isEmpty).toBe(true);
  });

  it("같은 세션 토큰으로 다시 들어와도 누적 방문자는 그대로다", () => {
    const a = new FakeConn("a");
    room.join(a, "가가", undefined, 1000);
    const token = a.find("welcome")!.sessionToken;
    room.leave("a");

    const b = new FakeConn("b");
    room.join(b, "가가", token, 2000);
    expect(b.find("welcome")?.totalVisitors).toBe(1);
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npm test server/room`
Expected: FAIL — `Failed to resolve import "./room"`

- [ ] **Step 3: 구현**

`server/room.ts`:

```ts
/**
 * 방 하나의 권위 상태.
 *
 * 시간을 인자로 받고 소켓을 인터페이스 뒤에 두는 이유는 테스트 때문이다.
 * `tick()`은 항상 정확히 SIM_DT_MS만큼 진행한다. 실제 인터벌이 흔들려도
 * 시뮬레이션은 흔들리지 않는다.
 */
import { randomUUID } from "node:crypto";
import {
  ROOM_CAPACITY,
  SAY_COOLDOWN_MS,
  SAY_MAX,
  SIM_DT_MS,
  SNAPSHOT_EVERY_TICKS,
} from "@shared/constants";
import { dirToward, stepMove, type Dir, type Vec2 } from "@shared/physics";
import { NICKNAME_MESSAGES, validateNickname } from "@shared/nickname";
import type { PlayerState, ServerMessage } from "@shared/protocol";
import { isSolidAtPixel, SPAWN } from "@shared/world";
import type { LoungeDb } from "./db";

export interface Connection {
  id: string;
  send(msg: ServerMessage): void;
  close(): void;
}

interface Player {
  conn: Connection;
  state: PlayerState;
  /** 마지막으로 처리한 입력 번호 */
  ack: number;
  /** 클릭 이동 목표. 키 입력이 오면 지워진다 */
  target: Vec2 | null;
  lastSayAt: number;
  sessionToken: string;
}

export class Room {
  private players = new Map<string, Player>();
  private tickCount = 0;

  constructor(private db: LoungeDb) {}

  get playerCount(): number {
    return this.players.size;
  }

  get isEmpty(): boolean {
    return this.players.size === 0;
  }

  join(conn: Connection, rawNick: string, sessionToken: string | undefined, now: number): boolean {
    const checked = validateNickname(rawNick);
    if (!checked.ok) {
      conn.send({
        t: "error",
        code: "bad_nickname",
        message: NICKNAME_MESSAGES[checked.error],
      });
      conn.close();
      return false;
    }

    if (this.players.size >= ROOM_CAPACITY) {
      conn.send({
        t: "error",
        code: "room_full",
        message: "지금은 자리가 다 찼어요. 잠시 뒤에 다시 와주세요.",
      });
      conn.close();
      return false;
    }

    const token = sessionToken || randomUUID();
    const totalVisitors = this.db.countVisit(token, now);

    const state: PlayerState = {
      id: conn.id,
      nick: checked.nick,
      hue: Math.floor(Math.random() * 360),
      x: SPAWN.x,
      y: SPAWN.y,
      dir: null,
    };

    const player: Player = {
      conn,
      state,
      ack: 0,
      target: null,
      lastSayAt: 0,
      sessionToken: token,
    };

    // welcome을 먼저 보내야 클라이언트가 자기 id를 알고 join을 해석할 수 있다
    conn.send({
      t: "welcome",
      playerId: conn.id,
      sessionToken: token,
      totalVisitors,
      players: [state, ...[...this.players.values()].map((p) => p.state)],
    });

    this.broadcast({ t: "join", player: state });
    this.players.set(conn.id, player);
    return true;
  }

  leave(connId: string): void {
    if (!this.players.delete(connId)) return;
    this.broadcast({ t: "leave", playerId: connId });
  }

  handleInput(connId: string, seq: number, dir: Dir | null): void {
    const p = this.players.get(connId);
    if (!p) return;
    p.state.dir = dir;
    p.target = null; // 키를 누르면 클릭 목표를 버린다
    p.ack = seq;
  }

  handleClick(connId: string, seq: number, x: number, y: number): void {
    const p = this.players.get(connId);
    if (!p) return;
    p.ack = seq;
    // 벽 안쪽이나 맵 밖은 목표로 삼지 않는다
    if (isSolidAtPixel(x, y)) return;
    p.target = { x, y };
  }

  handleSay(connId: string, text: string, now: number): void {
    const p = this.players.get(connId);
    if (!p) return;
    if (now - p.lastSayAt < SAY_COOLDOWN_MS) return;

    const trimmed = text.trim().slice(0, SAY_MAX);
    if (trimmed.length === 0) return;

    p.lastSayAt = now;
    this.sendAll({ t: "say", playerId: connId, text: trimmed });
  }

  tick(): void {
    for (const p of this.players.values()) {
      if (p.target) {
        const dir = dirToward(p.state, p.target);
        p.state.dir = dir;
        if (!dir) p.target = null;
      }
      if (p.state.dir) {
        const next = stepMove(p.state, p.state.dir, SIM_DT_MS);
        p.state.x = next.x;
        p.state.y = next.y;
      }
    }

    this.tickCount++;
    if (this.tickCount % SNAPSHOT_EVERY_TICKS === 0) this.sendSnapshots();
  }

  private sendSnapshots(): void {
    const players = [...this.players.values()].map((p) => p.state);
    for (const p of this.players.values()) {
      p.conn.send({ t: "snapshot", tick: this.tickCount, ack: p.ack, players });
    }
  }

  /** 보낸 사람을 뺀 나머지에게 */
  private broadcast(msg: ServerMessage): void {
    for (const p of this.players.values()) p.conn.send(msg);
  }

  /** 보낸 사람을 포함해 전부에게 */
  private sendAll(msg: ServerMessage): void {
    for (const p of this.players.values()) p.conn.send(msg);
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test server/room`
Expected: PASS (13 tests)

`join` 테스트가 실패한다면 `broadcast`를 호출한 시점에 새 플레이어가 아직 `players`에 없어야 한다는 점을 확인할 것. 위 구현은 `broadcast` 다음에 `set`한다.

- [ ] **Step 5: 커밋**

```bash
git add server/room.ts server/room.test.ts
git commit -m "feat: 방 tick 루프와 스냅샷 브로드캐스트"
```

---

### Task 8: WebSocket 서버 배선

**Files:**
- Create: `server/net.ts`
- Create: `server/index.ts`

**Interfaces:**
- Consumes: `./room`의 `Room`·`Connection`, `./db`의 `openDb`, `@shared/protocol`의 `parseClientMessage`
- Produces: `startServer(opts: { port: number; dbPath: string }): { close(): Promise<void>; port: number }`

- [ ] **Step 1: 네트워크 계층 작성**

`server/net.ts`:

```ts
/**
 * `ws` 소켓을 Room이 아는 Connection으로 감싼다.
 *
 * Room은 WebSocket을 모르고 여기서는 게임 규칙을 모른다.
 * 레이트리밋과 백프레셔는 3단계에서 이 파일에 들어온다.
 * 1단계에서는 페이로드 크기 상한만 건다 (ws의 maxPayload).
 */
import { randomUUID } from "node:crypto";
import { WebSocketServer, type WebSocket } from "ws";
import { parseClientMessage } from "@shared/protocol";
import type { Connection, Room } from "./room";

/** 클라이언트가 보낼 수 있는 한 메시지의 최대 바이트 */
const MAX_PAYLOAD = 1024;

export function attachWebSocketServer(wss: WebSocketServer, room: Room): void {
  wss.on("connection", (socket: WebSocket) => {
    const id = randomUUID();
    let joined = false;

    const conn: Connection = {
      id,
      send(msg) {
        if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(msg));
      },
      close() {
        socket.close();
      },
    };

    socket.on("message", (raw) => {
      const msg = parseClientMessage(raw.toString());
      if (!msg) {
        conn.send({ t: "error", code: "bad_message", message: "이해할 수 없는 요청이에요." });
        socket.close();
        return;
      }

      // hello 전에는 아무것도 받지 않는다
      if (!joined) {
        if (msg.t !== "hello") {
          socket.close();
          return;
        }
        joined = room.join(conn, msg.nick, msg.sessionToken, Date.now());
        return;
      }

      switch (msg.t) {
        case "hello":
          break; // 두 번째 hello는 무시
        case "input":
          room.handleInput(id, msg.seq, msg.dir);
          break;
        case "click":
          room.handleClick(id, msg.seq, msg.x, msg.y);
          break;
        case "say":
          room.handleSay(id, msg.text, Date.now());
          break;
        case "interact":
          // 1단계에서 오브젝트 조사는 클라이언트가 혼자 처리한다.
          // 서버 상태가 걸리는 상호작용(모닥불, 라디오)은 4단계에서 여기 붙는다.
          break;
      }
    });

    socket.on("close", () => {
      if (joined) room.leave(id);
    });

    socket.on("error", () => socket.close());
  });
}

export { MAX_PAYLOAD };
```

- [ ] **Step 2: 진입점 작성**

`server/index.ts`:

```ts
/**
 * 쉼터 게임 서버.
 *
 * 아무도 없으면 tick 인터벌을 멈춘다. 유휴 상태에서 CPU를 태우지 않기 위해서다.
 * (Oracle의 유휴 인스턴스 회수는 CPU를 태워서가 아니라 Pay As You Go 업그레이드로 푼다.)
 */
import { WebSocketServer } from "ws";
import { SIM_DT_MS } from "@shared/constants";
import { openDb } from "./db";
import { Room } from "./room";
import { attachWebSocketServer, MAX_PAYLOAD } from "./net";

export function startServer(opts: { port: number; dbPath: string }) {
  const db = openDb(opts.dbPath);
  const room = new Room(db);
  const wss = new WebSocketServer({ port: opts.port, maxPayload: MAX_PAYLOAD });

  attachWebSocketServer(wss, room);

  let timer: NodeJS.Timeout | null = null;

  // 빈 방이면 시뮬레이션을 돌릴 이유가 없다
  const supervise = setInterval(() => {
    if (!room.isEmpty && timer === null) {
      timer = setInterval(() => room.tick(), SIM_DT_MS);
    } else if (room.isEmpty && timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  }, 200);

  return {
    port: opts.port,
    async close() {
      clearInterval(supervise);
      if (timer) clearInterval(timer);
      await new Promise<void>((resolve) => wss.close(() => resolve()));
      db.close();
    },
  };
}

const isMain = process.argv[1]?.endsWith("index.ts");
if (isMain) {
  const port = Number(process.env.LOUNGE_PORT ?? 8787);
  const dbPath = process.env.LOUNGE_DB ?? "./server/lounge.db";
  startServer({ port, dbPath });
  console.log(`쉼터 서버가 ws://localhost:${port} 에서 대기 중`);
}
```

- [ ] **Step 3: SQLite 파일을 git에서 제외**

`.gitignore` 끝에 추가:

```
# 쉼터 로컬 DB
/server/*.db
```

- [ ] **Step 4: 서버를 띄우고 손으로 확인**

Run: `npm run server:dev`
Expected: `쉼터 서버가 ws://localhost:8787 에서 대기 중`

다른 터미널에서 접속을 확인한다:

```bash
node -e '
const WebSocket = require("ws");
const ws = new WebSocket("ws://localhost:8787");
ws.on("open", () => ws.send(JSON.stringify({ t: "hello", nick: "밤톨" })));
ws.on("message", (d) => { console.log(d.toString()); process.exit(0); });
'
```

Expected: `{"t":"welcome","playerId":"...","sessionToken":"...","totalVisitors":1,"players":[...]}`

- [ ] **Step 5: 타입 검사**

Run: `npm run typecheck`
Expected: 오류 없음

- [ ] **Step 6: 커밋**

```bash
git add server/net.ts server/index.ts .gitignore
git commit -m "feat: 쉼터 WebSocket 서버 진입점"
```

---

### Task 9: 클라이언트 상태 리듀서

**Files:**
- Create: `src/lib/lounge/engine.ts`
- Test: `src/lib/lounge/engine.test.ts`

**Interfaces:**
- Consumes: `@shared/physics`의 `Dir`, `@shared/protocol`의 `PlayerState`·`ServerMessage`, `@shared/constants`의 `SAY_TTL_MS`
- Produces: `interface LoungeState { myId: string | null; players: Map<string, PlayerState>; bubbles: Map<string, { text: string; until: number }>; totalVisitors: number; error: string | null }`, `createState(): LoungeState`, `applyServerMessage(state: LoungeState, msg: ServerMessage, now: number): LoungeState`, `dirFromKeys(keys: Set<string>): Dir | null`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/lounge/engine.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { SAY_TTL_MS } from "@shared/constants";
import type { PlayerState } from "@shared/protocol";
import { applyServerMessage, createState, dirFromKeys } from "./engine";

const player = (id: string): PlayerState => ({
  id,
  nick: id,
  hue: 0,
  x: 0,
  y: 0,
  dir: null,
});

describe("dirFromKeys", () => {
  it("방향키와 WASD를 같은 방향으로 본다", () => {
    expect(dirFromKeys(new Set(["ArrowRight"]))).toBe("e");
    expect(dirFromKeys(new Set(["KeyD"]))).toBe("e");
    expect(dirFromKeys(new Set(["ArrowUp"]))).toBe("n");
    expect(dirFromKeys(new Set(["KeyW"]))).toBe("n");
  });

  it("두 키를 함께 누르면 대각선이다", () => {
    expect(dirFromKeys(new Set(["ArrowUp", "ArrowRight"]))).toBe("ne");
    expect(dirFromKeys(new Set(["KeyS", "KeyA"]))).toBe("sw");
  });

  it("반대 방향이 함께 눌리면 상쇄된다", () => {
    expect(dirFromKeys(new Set(["ArrowLeft", "ArrowRight"]))).toBeNull();
    expect(dirFromKeys(new Set(["ArrowLeft", "ArrowRight", "ArrowUp"]))).toBe("n");
  });

  it("아무것도 안 눌렸으면 null이다", () => {
    expect(dirFromKeys(new Set())).toBeNull();
    expect(dirFromKeys(new Set(["Space", "KeyQ"]))).toBeNull();
  });
});

describe("applyServerMessage", () => {
  it("welcome으로 내 id와 누적 방문자를 채운다", () => {
    const s = applyServerMessage(
      createState(),
      {
        t: "welcome",
        playerId: "me",
        sessionToken: "tok",
        totalVisitors: 7,
        players: [player("me"), player("other")],
      },
      0,
    );
    expect(s.myId).toBe("me");
    expect(s.totalVisitors).toBe(7);
    expect(s.players.size).toBe(2);
  });

  it("snapshot이 플레이어 목록을 통째로 대체한다", () => {
    let s = applyServerMessage(
      createState(),
      { t: "welcome", playerId: "me", sessionToken: "t", totalVisitors: 1, players: [player("me"), player("gone")] },
      0,
    );
    s = applyServerMessage(s, { t: "snapshot", tick: 2, ack: 0, players: [player("me")] }, 0);
    expect([...s.players.keys()]).toEqual(["me"]);
  });

  it("join과 leave가 목록을 갱신한다", () => {
    let s = createState();
    s = applyServerMessage(s, { t: "join", player: player("a") }, 0);
    expect(s.players.has("a")).toBe(true);
    s = applyServerMessage(s, { t: "leave", playerId: "a" }, 0);
    expect(s.players.has("a")).toBe(false);
  });

  it("퇴장하면 말풍선도 지운다", () => {
    let s = applyServerMessage(createState(), { t: "join", player: player("a") }, 0);
    s = applyServerMessage(s, { t: "say", playerId: "a", text: "안녕" }, 1000);
    expect(s.bubbles.get("a")?.until).toBe(1000 + SAY_TTL_MS);
    s = applyServerMessage(s, { t: "leave", playerId: "a" }, 1000);
    expect(s.bubbles.has("a")).toBe(false);
  });

  it("error를 상태에 남긴다", () => {
    const s = applyServerMessage(
      createState(),
      { t: "error", code: "room_full", message: "자리가 다 찼어요." },
      0,
    );
    expect(s.error).toBe("자리가 다 찼어요.");
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npm test src/lib/lounge/engine`
Expected: FAIL — `Failed to resolve import "./engine"`

- [ ] **Step 3: 구현**

`src/lib/lounge/engine.ts`:

```ts
/**
 * 클라이언트 쪽 상태.
 *
 * DOM도 WebSocket도 모른다. 서버 메시지와 눌린 키를 받아 화면에 그릴 상태를
 * 만들 뿐이다. 그래서 브라우저 없이 테스트할 수 있다.
 *
 * 1단계에서는 서버가 준 좌표를 그대로 쓴다. 예측과 보간은 3단계다.
 */
import { SAY_TTL_MS } from "@shared/constants";
import type { Dir } from "@shared/physics";
import type { PlayerState, ServerMessage } from "@shared/protocol";

export interface LoungeState {
  myId: string | null;
  players: Map<string, PlayerState>;
  bubbles: Map<string, { text: string; until: number }>;
  totalVisitors: number;
  error: string | null;
}

export function createState(): LoungeState {
  return {
    myId: null,
    players: new Map(),
    bubbles: new Map(),
    totalVisitors: 0,
    error: null,
  };
}

const UP = ["ArrowUp", "KeyW"];
const DOWN = ["ArrowDown", "KeyS"];
const LEFT = ["ArrowLeft", "KeyA"];
const RIGHT = ["ArrowRight", "KeyD"];

const BY_OFFSET: Record<string, Dir> = {
  "0,-1": "n",
  "1,-1": "ne",
  "1,0": "e",
  "1,1": "se",
  "0,1": "s",
  "-1,1": "sw",
  "-1,0": "w",
  "-1,-1": "nw",
};

/** `KeyboardEvent.code` 집합을 8방향 하나로 접는다 */
export function dirFromKeys(keys: Set<string>): Dir | null {
  const held = (codes: string[]) => codes.some((c) => keys.has(c));
  const x = (held(RIGHT) ? 1 : 0) - (held(LEFT) ? 1 : 0);
  const y = (held(DOWN) ? 1 : 0) - (held(UP) ? 1 : 0);
  return BY_OFFSET[`${x},${y}`] ?? null;
}

export function applyServerMessage(
  state: LoungeState,
  msg: ServerMessage,
  now: number,
): LoungeState {
  switch (msg.t) {
    case "welcome":
      return {
        ...state,
        myId: msg.playerId,
        totalVisitors: msg.totalVisitors,
        players: new Map(msg.players.map((p) => [p.id, p])),
        error: null,
      };

    case "snapshot":
      return { ...state, players: new Map(msg.players.map((p) => [p.id, p])) };

    case "join": {
      const players = new Map(state.players);
      players.set(msg.player.id, msg.player);
      return { ...state, players };
    }

    case "leave": {
      const players = new Map(state.players);
      players.delete(msg.playerId);
      const bubbles = new Map(state.bubbles);
      bubbles.delete(msg.playerId);
      return { ...state, players, bubbles };
    }

    case "say": {
      const bubbles = new Map(state.bubbles);
      bubbles.set(msg.playerId, { text: msg.text, until: now + SAY_TTL_MS });
      return { ...state, bubbles };
    }

    case "error":
      return { ...state, error: msg.message };
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test src/lib/lounge/engine`
Expected: PASS (9 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/lib/lounge/engine.ts src/lib/lounge/engine.test.ts
git commit -m "feat: 쉼터 클라이언트 상태 리듀서"
```

---

### Task 10: WebSocket 클라이언트

**Files:**
- Create: `src/lib/lounge/net.ts`

**Interfaces:**
- Consumes: `@shared/protocol`의 `ClientMessage`·`ServerMessage`
- Produces: `interface LoungeNet { send(msg: ClientMessage): void; close(): void }`, `connectLounge(url: string, handlers: { onMessage(msg: ServerMessage): void; onOpen(): void; onClose(): void }): LoungeNet`

- [ ] **Step 1: 구현**

`src/lib/lounge/net.ts`:

```ts
/**
 * 브라우저 WebSocket을 얇게 감싼다.
 *
 * engine을 모른다. 받은 메시지를 그대로 넘길 뿐이고, 무엇을 할지는 호출자가 정한다.
 * 재접속은 3단계에서 여기 붙는다.
 */
import type { ClientMessage, ServerMessage } from "@shared/protocol";

export interface LoungeNet {
  send(msg: ClientMessage): void;
  close(): void;
}

export interface LoungeNetHandlers {
  onOpen(): void;
  onMessage(msg: ServerMessage): void;
  onClose(): void;
}

export function connectLounge(url: string, handlers: LoungeNetHandlers): LoungeNet {
  const socket = new WebSocket(url);

  socket.addEventListener("open", () => handlers.onOpen());
  socket.addEventListener("close", () => handlers.onClose());
  socket.addEventListener("error", () => socket.close());

  socket.addEventListener("message", (event) => {
    try {
      handlers.onMessage(JSON.parse(event.data as string) as ServerMessage);
    } catch {
      // 서버가 보낸 게 깨졌다면 무시한다. 다음 스냅샷이 곧 온다.
    }
  });

  return {
    send(msg) {
      if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(msg));
    },
    close() {
      socket.close();
    },
  };
}
```

- [ ] **Step 2: 타입 검사**

Run: `npm run typecheck`
Expected: 오류 없음

- [ ] **Step 3: 커밋**

```bash
git add src/lib/lounge/net.ts
git commit -m "feat: 쉼터 WebSocket 클라이언트"
```

---

### Task 11: Canvas 렌더러

**Files:**
- Create: `src/lib/lounge/render.ts`

**Interfaces:**
- Consumes: `@shared/constants`, `@shared/world`의 `isSolidTile`·`OBJECTS`, `./engine`의 `LoungeState`
- Produces: `cameraFor(state: LoungeState, width: number, height: number): { x: number; y: number }`, `draw(ctx: CanvasRenderingContext2D, state: LoungeState, now: number): void`

`cameraFor`를 export하는 이유는 마우스 클릭 좌표를 월드 좌표로 되돌릴 때 같은 계산이 필요하기 때문이다. 카메라는 맵 가장자리에서 멈추므로 "화면 중앙이 곧 내 위치"라고 가정하면 가장자리에서 클릭이 어긋난다.

- [ ] **Step 1: 구현**

`src/lib/lounge/render.ts`:

```ts
/**
 * Canvas 2D 그리기.
 *
 * 상태를 받아 그리기만 한다. 아무것도 바꾸지 않는다.
 * 카메라는 내 캐릭터를 따라가되 맵 밖이 보이지 않게 가둔다.
 */
import { MAP_H, MAP_W, PLAYER_RADIUS, TILE, WORLD_H, WORLD_W } from "@shared/constants";
import { isSolidTile, OBJECTS } from "@shared/world";
import type { LoungeState } from "./engine";

const COLORS = {
  floor: "#1b1a22",
  floorAlt: "#201f28",
  wall: "#3a3846",
  wallTop: "#4a4859",
  object: "#6b5a8e",
  objectLabel: "#cfc6e6",
  nick: "#e7e3f2",
  bubbleBg: "rgba(20, 19, 26, 0.92)",
  bubbleText: "#f2eff9",
};

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * 카메라의 좌상단 월드 좌표.
 *
 * 나를 화면 중앙에 두되 맵 밖이 보이지 않게 가둔다. 맵이 화면보다 작으면
 * 가운데 정렬한다. 클릭 좌표를 월드로 되돌릴 때도 같은 값이 필요해서 export한다.
 */
export function cameraFor(
  state: LoungeState,
  width: number,
  height: number,
): { x: number; y: number } {
  const me = state.myId ? state.players.get(state.myId) : undefined;
  return {
    x:
      width >= WORLD_W
        ? (WORLD_W - width) / 2
        : clamp((me?.x ?? WORLD_W / 2) - width / 2, 0, WORLD_W - width),
    y:
      height >= WORLD_H
        ? (WORLD_H - height) / 2
        : clamp((me?.y ?? WORLD_H / 2) - height / 2, 0, WORLD_H - height),
  };
}

export function draw(ctx: CanvasRenderingContext2D, state: LoungeState, now: number): void {
  const { width, height } = ctx.canvas;
  const cam = cameraFor(state, width, height);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.translate(-cam.x, -cam.y);

  drawTiles(ctx);
  drawObjects(ctx);

  for (const p of state.players.values()) {
    drawPlayer(ctx, p.x, p.y, p.hue, p.nick, p.id === state.myId);
    const bubble = state.bubbles.get(p.id);
    if (bubble && bubble.until > now) drawBubble(ctx, p.x, p.y, bubble.text);
  }
}

function drawTiles(ctx: CanvasRenderingContext2D): void {
  for (let ty = 0; ty < MAP_H; ty++) {
    for (let tx = 0; tx < MAP_W; tx++) {
      const solid = isSolidTile(tx, ty);
      ctx.fillStyle = solid
        ? COLORS.wall
        : (tx + ty) % 2 === 0
          ? COLORS.floor
          : COLORS.floorAlt;
      ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
      if (solid) {
        ctx.fillStyle = COLORS.wallTop;
        ctx.fillRect(tx * TILE, ty * TILE, TILE, 4);
      }
    }
  }
}

function drawObjects(ctx: CanvasRenderingContext2D): void {
  ctx.textAlign = "center";
  ctx.font = "11px system-ui, sans-serif";
  for (const obj of OBJECTS) {
    const x = obj.tx * TILE;
    const y = obj.ty * TILE;
    ctx.fillStyle = COLORS.object;
    ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
    ctx.fillStyle = COLORS.objectLabel;
    ctx.fillText(obj.label, x + TILE / 2, y - 4);
  }
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  hue: number,
  nick: string,
  isMe: boolean,
): void {
  ctx.beginPath();
  ctx.arc(x, y, PLAYER_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = `hsl(${hue} 70% 62%)`;
  ctx.fill();
  if (isMe) {
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();
  }

  ctx.textAlign = "center";
  ctx.font = "12px system-ui, sans-serif";
  ctx.fillStyle = COLORS.nick;
  ctx.fillText(nick, x, y - PLAYER_RADIUS - 6);
}

function drawBubble(ctx: CanvasRenderingContext2D, x: number, y: number, text: string): void {
  ctx.font = "12px system-ui, sans-serif";
  const w = ctx.measureText(text).width + 16;
  const h = 24;
  const bx = x - w / 2;
  const by = y - PLAYER_RADIUS - 46;

  ctx.fillStyle = COLORS.bubbleBg;
  ctx.beginPath();
  ctx.roundRect(bx, by, w, h, 8);
  ctx.fill();

  ctx.fillStyle = COLORS.bubbleText;
  ctx.textAlign = "center";
  ctx.fillText(text, x, by + 16);
}
```

- [ ] **Step 2: 타입 검사**

Run: `npm run typecheck`
Expected: 오류 없음

- [ ] **Step 3: 커밋**

```bash
git add src/lib/lounge/render.ts
git commit -m "feat: 쉼터 Canvas 렌더러"
```

---

### Task 12: 닉네임 게이트

**Files:**
- Create: `src/components/lounge/NicknameGate.tsx`

**Interfaces:**
- Consumes: `@shared/nickname`의 `validateNickname`·`NICKNAME_MESSAGES`, `@shared/constants`의 `NICK_MAX`
- Produces: `NicknameGate({ onEnter }: { onEnter: (nick: string) => void })`

- [ ] **Step 1: 구현**

`src/components/lounge/NicknameGate.tsx`:

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { NICK_MAX } from "@shared/constants";
import { NICKNAME_MESSAGES, validateNickname } from "@shared/nickname";

export function NicknameGate({ onEnter }: { onEnter: (nick: string) => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const checked = validateNickname(value);
    if (!checked.ok) {
      setError(NICKNAME_MESSAGES[checked.error]);
      return;
    }
    setError(null);
    onEnter(checked.nick);
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <form onSubmit={handleSubmit} className="w-full max-w-sm text-center">
        <h1 className="mb-2 text-3xl font-bold text-foreground">쉼터</h1>
        <p className="mb-8 text-sm text-muted-foreground">
          이름만 정하면 들어올 수 있어요. 계정도 비밀번호도 없습니다.
        </p>

        <input
          autoFocus
          value={value}
          maxLength={NICK_MAX}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          placeholder="닉네임"
          aria-label="닉네임"
          className="w-full rounded-lg border border-border bg-background/50 px-4 py-3 text-center text-foreground outline-none focus:border-foreground/40"
        />

        <p className="mt-2 h-5 text-sm text-red-400">{error ?? ""}</p>

        <button
          type="submit"
          className="mt-4 w-full rounded-lg border border-border bg-secondary px-4 py-3 font-medium text-foreground transition-colors hover:bg-secondary/70"
        >
          들어가기
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: 타입 검사**

Run: `npm run typecheck`
Expected: 오류 없음

- [ ] **Step 3: 커밋**

```bash
git add src/components/lounge/NicknameGate.tsx
git commit -m "feat: 쉼터 닉네임 입장 폼"
```

---

### Task 13: 방 화면 통합

모든 조각을 잇고 실제로 두 탭이 서로를 보는지 확인한다.

**Files:**
- Create: `src/app/lounge/LoungeClient.tsx`
- Create: `src/app/lounge/page.tsx`
- Modify: `src/components/Header.tsx`

**Interfaces:**
- Consumes: 앞선 모든 태스크
- Produces: `/lounge` 화면

서버 주소는 `NEXT_PUBLIC_LOUNGE_WS_URL`로 덮어쓸 수 있지만 **`.env.local`을 만들지
않는다.** `.env*`는 gitignore 대상이라 새로 받은 사람에게 전달되지 않고, 코드에
`ws://localhost:8787` 기본값이 있어 로컬 개발에는 아무 설정이 필요 없다. 실제
`wss://` 주소는 2단계에서 Vercel 환경변수로 넣는다.

- [ ] **Step 1: 방 컴포넌트 작성**

`src/app/lounge/LoungeClient.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { SAY_MAX, TILE } from "@shared/constants";
import { objectAt, type WorldObject } from "@shared/world";
import type { ClientMessage, ServerMessage } from "@shared/protocol";
import { NicknameGate } from "@/components/lounge/NicknameGate";
import { applyServerMessage, createState, dirFromKeys, type LoungeState } from "@/lib/lounge/engine";
import { connectLounge, type LoungeNet } from "@/lib/lounge/net";
import { cameraFor, draw } from "@/lib/lounge/render";

const WS_URL = process.env.NEXT_PUBLIC_LOUNGE_WS_URL ?? "ws://localhost:8787";
const SESSION_KEY = "lounge:session";

export function LoungeClient() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const netRef = useRef<LoungeNet | null>(null);
  const stateRef = useRef<LoungeState>(createState());
  const keysRef = useRef(new Set<string>());
  const lastDirRef = useRef<string | null>(null);
  const seqRef = useRef(0);
  const chatOpenRef = useRef(false);

  const [entered, setEntered] = useState(false);
  const [connected, setConnected] = useState(false);
  const [hud, setHud] = useState({ online: 0, total: 0, error: null as string | null });
  const [inspected, setInspected] = useState<WorldObject | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatValue, setChatValue] = useState("");

  const send = useCallback((msg: ClientMessage) => netRef.current?.send(msg), []);

  const handleEnter = useCallback((nick: string) => {
    setEntered(true);
    const sessionToken = localStorage.getItem(SESSION_KEY) ?? undefined;

    netRef.current = connectLounge(WS_URL, {
      onOpen() {
        setConnected(true);
        netRef.current?.send({ t: "hello", nick, sessionToken });
      },
      onMessage(msg: ServerMessage) {
        if (msg.t === "welcome") localStorage.setItem(SESSION_KEY, msg.sessionToken);
        stateRef.current = applyServerMessage(stateRef.current, msg, Date.now());
        setHud({
          online: stateRef.current.players.size,
          total: stateRef.current.totalVisitors,
          error: stateRef.current.error,
        });
      },
      onClose() {
        setConnected(false);
      },
    });
  }, []);

  // 키 입력 → 방향이 바뀔 때만 전송한다. 가만히 있으면 메시지가 0이다.
  useEffect(() => {
    if (!entered) return;

    function pushDir() {
      const dir = dirFromKeys(keysRef.current);
      if (dir === lastDirRef.current) return;
      lastDirRef.current = dir;
      send({ t: "input", seq: ++seqRef.current, dir });
    }

    /** 말풍선 입력을 열면서 걷던 것을 멈춘다 */
    function openChat() {
      keysRef.current.clear();
      pushDir();
      chatOpenRef.current = true;
      setChatOpen(true);
    }

    function onKeyDown(e: KeyboardEvent) {
      // 입력창이 열려 있으면 입력창이 알아서 처리한다
      if (chatOpenRef.current) return;

      if (e.code === "Enter") {
        e.preventDefault();
        openChat();
        return;
      }
      if (e.code === "Escape") {
        setInspected(null);
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        inspectInFront();
        return;
      }
      keysRef.current.add(e.code);
      pushDir();
    }

    function onKeyUp(e: KeyboardEvent) {
      if (chatOpenRef.current) return;
      keysRef.current.delete(e.code);
      pushDir();
    }

    function onBlur() {
      keysRef.current.clear();
      pushDir();
    }

    /** 내 발밑 기준 상하좌우 네 칸에 오브젝트가 있으면 설명을 띄운다 */
    function inspectInFront() {
      const s = stateRef.current;
      const me = s.myId ? s.players.get(s.myId) : undefined;
      if (!me) return;
      const tx = Math.floor(me.x / TILE);
      const ty = Math.floor(me.y / TILE);
      const near =
        objectAt(tx, ty - 1) ?? objectAt(tx, ty + 1) ?? objectAt(tx - 1, ty) ?? objectAt(tx + 1, ty);
      setInspected(near);
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [entered, send]);

  // 그리기 루프
  useEffect(() => {
    if (!entered) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    function frame() {
      const el = canvasRef.current;
      if (el && (el.width !== el.clientWidth || el.height !== el.clientHeight)) {
        el.width = el.clientWidth;
        el.height = el.clientHeight;
      }
      draw(ctx, stateRef.current, Date.now());
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [entered]);

  useEffect(() => () => netRef.current?.close(), []);

  function closeChat() {
    chatOpenRef.current = false;
    setChatOpen(false);
    setChatValue("");
  }

  function submitChat(e: FormEvent) {
    e.preventDefault();
    const text = chatValue.trim();
    if (text) send({ t: "say", text });
    closeChat();
  }

  if (!entered) return <NicknameGate onEnter={handleEnter} />;

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="h-[70vh] w-full rounded-xl border border-border bg-[#1b1a22]"
        onContextMenu={(e) => e.preventDefault()}
        onMouseDown={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          // 렌더러와 같은 카메라 계산을 써야 맵 가장자리에서도 어긋나지 않는다
          const cam = cameraFor(stateRef.current, e.currentTarget.width, e.currentTarget.height);
          const worldX = cam.x + (e.clientX - rect.left);
          const worldY = cam.y + (e.clientY - rect.top);
          if (e.button === 0) {
            send({ t: "click", seq: ++seqRef.current, x: worldX, y: worldY });
          } else if (e.button === 2) {
            setInspected(objectAt(Math.floor(worldX / TILE), Math.floor(worldY / TILE)));
          }
        }}
      />

      <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
        <span>
          지금 {hud.online}명 · 누적 {hud.total.toLocaleString()}명
          {!connected && <span className="ml-2 text-red-400">연결 끊김</span>}
        </span>
        <span>↑↓←→ 이동 · 좌클릭 그 지점으로 · SPACE 조사 · Enter 말하기</span>
      </div>

      {hud.error && <p className="mt-2 text-sm text-red-400">{hud.error}</p>}

      {chatOpen && (
        <form
          onSubmit={submitChat}
          className="absolute bottom-16 left-1/2 w-80 -translate-x-1/2"
        >
          <input
            autoFocus
            value={chatValue}
            maxLength={SAY_MAX}
            onChange={(e) => setChatValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                closeChat();
              }
            }}
            placeholder={`무슨 말이든 (${SAY_MAX}자까지)`}
            aria-label="말풍선 입력"
            className="w-full rounded-lg border border-border bg-background/95 px-4 py-2 text-foreground outline-none focus:border-foreground/40"
          />
        </form>
      )}

      {inspected && (
        <div className="absolute bottom-16 left-1/2 w-72 -translate-x-1/2 rounded-lg border border-border bg-background/95 p-4 text-center">
          <p className="font-medium text-foreground">{inspected.label}</p>
          <p className="mt-1 text-sm text-muted-foreground">{inspected.description}</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 페이지 작성**

`src/app/lounge/page.tsx`:

```tsx
import type { Metadata } from "next";
import { LoungeClient } from "./LoungeClient";

export const metadata: Metadata = {
  title: "쉼터",
  description: "멍 때릴 때 잠깐 머무는 공간. 이름만 정하면 들어올 수 있어요.",
};

export default function LoungePage() {
  return (
    <div className="container py-12">
      <LoungeClient />
    </div>
  );
}
```

- [ ] **Step 3: 헤더에 링크 추가**

`src/components/Header.tsx`의 Playground 링크 바로 뒤에 넣는다.

```tsx
            <Link
              href="/lounge"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              쉼터
            </Link>
```

- [ ] **Step 4: 전체 테스트와 타입 검사**

Run: `npm test && npm run typecheck && npm run lint`
Expected: 전부 통과

- [ ] **Step 5: 두 탭으로 손 검증**

터미널 두 개를 띄운다.

```bash
npm run server:dev    # 터미널 1
npm run dev           # 터미널 2
```

브라우저 탭 두 개로 `http://localhost:3000/lounge`를 연다. 각각 다른 닉네임으로 입장한 뒤 확인한다.

- [ ] 두 탭에서 서로의 캐릭터가 보인다
- [ ] 방향키로 움직이면 상대 탭에서도 움직인다 (10Hz라 끊겨 보이는 게 정상)
- [ ] 대각선으로 벽에 부딪히면 벽을 따라 미끄러진다
- [ ] 좌클릭한 지점으로 걸어간다
- [ ] 벽 안쪽을 좌클릭하면 아무 일도 없다
- [ ] 오브젝트 옆에서 SPACE를 누르면 설명이 뜬다
- [ ] 우클릭으로도 오브젝트 설명이 뜬다
- [ ] Enter로 입력창을 열고 말하면 두 탭 모두에서 말풍선이 뜨고 5초 뒤 사라진다
- [ ] 입력창이 열려 있는 동안 방향키를 눌러도 캐릭터가 움직이지 않는다
- [ ] 말풍선을 연달아 보내면 1.5초 안의 두 번째는 무시된다
- [ ] Esc로 입력창이 닫힌다
- [ ] 한 탭을 닫으면 다른 탭에서 캐릭터가 사라진다
- [ ] 새로고침해도 누적 방문자 수가 늘지 않는다 (같은 세션)
- [ ] 시크릿 창으로 들어오면 누적 방문자 수가 1 늘어난다
- [ ] 가만히 있는 동안 브라우저 개발자도구 Network → WS 프레임에 **보내는** 메시지가 없다

- [ ] **Step 6: 커밋**

```bash
git add src/app/lounge src/components/Header.tsx
git commit -m "feat: 쉼터 방 화면과 헤더 링크"
```

---

## 완료 기준

- `npm test`가 전부 통과한다
- `npm run typecheck`와 `npm run lint`가 깨끗하다
- Task 13 Step 6의 수동 확인 항목이 전부 체크된다
- Vercel 빌드가 깨지지 않는다 (`npm run build`)

## 이번 범위가 아닌 것

3단계에서 붙일 것: 클라이언트 예측·보정, 원격 보간, 델타 인코딩, 바이너리 스냅샷, 레이트리밋, 백프레셔, 세션 복구(`REJOIN_GRACE_MS`는 상수만 정의해두고 아직 안 쓴다), `/metrics`, F3 오버레이.

4단계에서 붙일 것: 잔상, NPC, 라디오의 실제 헤드라인, 모닥불 앉기, 책장의 글 추천, 화분 성장, 이모트.

2단계에서 붙일 것: Dockerfile, Caddy, Oracle 배포, `wss://` 전환.
