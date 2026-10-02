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
