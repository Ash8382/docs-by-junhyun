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
  /** 이번 접속에서 welcome을 받았는지. 거절(정원 초과 등)과 정상 입장을 구분한다 */
  const welcomedRef = useRef(false);

  const [entered, setEntered] = useState(false);
  const [connected, setConnected] = useState(false);
  const [hud, setHud] = useState({ online: 0, total: 0, error: null as string | null });
  const [gateError, setGateError] = useState<string | null>(null);
  const [inspected, setInspected] = useState<WorldObject | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatValue, setChatValue] = useState("");

  const send = useCallback((msg: ClientMessage) => netRef.current?.send(msg), []);

  const handleEnter = useCallback((nick: string) => {
    // setEntered(true)가 게이트를 즉시 언마운트하지 않아서, 빠른 두 번째 제출이 소켓을 하나 더 열 수 있다.
    if (netRef.current) return;
    setEntered(true);
    setGateError(null);
    welcomedRef.current = false;
    const sessionToken = localStorage.getItem(SESSION_KEY) ?? undefined;

    netRef.current = connectLounge(WS_URL, {
      onOpen() {
        setConnected(true);
        netRef.current?.send({ t: "hello", nick, sessionToken });
      },
      onMessage(msg: ServerMessage) {
        if (msg.t === "welcome") {
          welcomedRef.current = true;
          localStorage.setItem(SESSION_KEY, msg.sessionToken);
        }
        stateRef.current = applyServerMessage(stateRef.current, msg, Date.now());
        setHud({
          online: stateRef.current.players.size,
          total: stateRef.current.totalVisitors,
          error: stateRef.current.error,
        });
      },
      onClose() {
        setConnected(false);
        if (!welcomedRef.current) {
          // welcome을 받기 전에 닫혔다 — 서버가 입장 자체를 거절했다는 뜻이다
          // (정원 초과, 닉네임 거부 등). netRef를 비우고 게이트로 돌려보내야
          // 재입장할 수 있다. welcome을 받은 "뒤"에 끊긴 경우(네트워크 끊김 등)는
          // 여기 해당하지 않고 현재처럼 "연결 끊김"만 보여준다 — 재접속 복구는
          // 3단계 몫이라 1단계에서 일부러 건드리지 않는다.
          netRef.current = null;
          setEntered(false);
          setGateError(stateRef.current.error);
        }
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
      if (ctx) draw(ctx, stateRef.current, Date.now());
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

  if (!entered) return <NicknameGate onEnter={handleEnter} serverError={gateError} />;

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

      {/* 처음부터 늘 떠 있는 alert 영역에 텍스트만 바꿔 넣어야 스크린리더가 안정적으로
          읽어준다 — 텍스트가 있는 채로 새로 마운트되면 못 읽는 경우가 있다 */}
      <p role="alert" className="mt-2 h-5 text-sm text-red-400">
        {hud.error ?? ""}
      </p>

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
