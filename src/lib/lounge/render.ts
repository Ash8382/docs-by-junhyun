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
