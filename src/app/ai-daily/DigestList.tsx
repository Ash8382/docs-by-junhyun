"use client";

import { useEffect, useMemo, useState } from "react";

import { formatDigestDate } from "@/lib/ai-daily/date";
import {
  ADMIN_TOKEN_HEADER,
  type Article,
  type Importance,
} from "@/lib/ai-daily/types";

export interface DigestGroup {
  date: string;
  items: Article[];
}

const STORAGE_KEY = "ai-daily-admin-token";

const IMPORTANCE_STYLE: Record<Importance, string> = {
  HIGH: "bg-foreground text-background",
  MEDIUM: "bg-secondary text-secondary-foreground",
  LOW: "border border-border text-muted-foreground",
};

function shortDate(iso: string | null): string | null {
  if (!iso) return null;
  return iso.slice(5, 10).replace("-", ".");
}

export function DigestList({ groups }: { groups: DigestGroup[] }) {
  const [token, setToken] = useState<string | null>(null);
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [confirmingAll, setConfirmingAll] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  /**
   * 관리자 토큰은 ?admin=... 으로 한 번 들어오면 localStorage에 남고 주소에서는 지운다.
   * 이건 버튼을 보여줄지 정하는 편의일 뿐이고, 실제 권한 검사는 서버가 한다.
   */
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const fromQuery = url.searchParams.get("admin");

      if (fromQuery) {
        window.localStorage.setItem(STORAGE_KEY, fromQuery);
        url.searchParams.delete("admin");
        window.history.replaceState(null, "", url.toString());
        setToken(fromQuery);
        return;
      }

      setToken(window.localStorage.getItem(STORAGE_KEY));
    } catch {
      // 프라이빗 모드처럼 localStorage가 막힌 환경에서는 그냥 열람 모드로 둔다
    }
  }, []);

  const visibleGroups = useMemo(
    () =>
      groups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => !removed.has(item.id)),
        }))
        .filter((group) => group.items.length > 0),
    [groups, removed],
  );

  const total = visibleGroups.reduce((sum, g) => sum + g.items.length, 0);

  async function handleDelete(id: string): Promise<void> {
    if (!token) return;

    setPendingId(id);
    setMessage(null);

    try {
      const response = await fetch(`/api/ai-daily/${id}`, {
        method: "DELETE",
        headers: { [ADMIN_TOKEN_HEADER]: token },
      });
      if (!response.ok) throw new Error(String(response.status));

      setRemoved((prev) => new Set(prev).add(id));
    } catch {
      setMessage("삭제하지 못했습니다. 토큰이 맞는지 확인해 주세요.");
    } finally {
      setPendingId(null);
    }
  }

  async function handleDeleteAll(): Promise<void> {
    if (!token) return;

    setPendingId("__all__");
    setMessage(null);

    try {
      const response = await fetch("/api/ai-daily", {
        method: "DELETE",
        headers: { [ADMIN_TOKEN_HEADER]: token },
      });
      if (!response.ok) throw new Error(String(response.status));

      setRemoved(new Set(groups.flatMap((g) => g.items.map((i) => i.id))));
      setConfirmingAll(false);
    } catch {
      setMessage("삭제하지 못했습니다. 토큰이 맞는지 확인해 주세요.");
    } finally {
      setPendingId(null);
    }
  }

  if (total === 0) {
    return (
      <p className="py-16 text-center text-sm leading-relaxed text-muted-foreground">
        아직 수집된 항목이 없습니다.
        <br />
        매일 아침 파이프라인이 실행되면 새로운 AI 브리핑이 업데이트됩니다.
      </p>
    );
  }

  return (
    <div className="space-y-10">
      {token && (
        <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
          <span className="text-xs text-muted-foreground">
            관리자 모드 · {total}건
          </span>

          {confirmingAll ? (
            <span className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">전부 지울까요?</span>
              <button
                type="button"
                onClick={handleDeleteAll}
                disabled={pendingId !== null}
                className="rounded-md bg-destructive px-2 py-1 font-medium text-destructive-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {pendingId === "__all__" ? "지우는 중" : "확인"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingAll(false)}
                className="rounded-md px-2 py-1 text-muted-foreground transition-colors hover:text-foreground"
              >
                취소
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingAll(true)}
              className="rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              전체 삭제
            </button>
          )}
        </div>
      )}

      {message && (
        <p className="rounded-md border border-border px-3 py-2 text-xs text-muted-foreground">
          {message}
        </p>
      )}

      {visibleGroups.map((group) => (
        <section key={group.date}>
          <div className="mb-1 flex items-baseline justify-between border-b border-border pb-2">
            <h2 className="text-sm font-semibold">
              {formatDigestDate(group.date)}
            </h2>
            <span className="text-xs text-muted-foreground">
              {group.items.length}건
            </span>
          </div>

          <div className="divide-y divide-border/60">
            {group.items.map((item) => (
              <article key={item.id} className="group py-5">
                <div className="mb-1.5 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span
                    className={`rounded-md px-2 py-0.5 text-xs font-medium ${IMPORTANCE_STYLE[item.importance]}`}
                  >
                    {item.importance}
                  </span>
                  <span>{item.sourceLabel}</span>
                  {shortDate(item.publishedAt) && (
                    <span>{shortDate(item.publishedAt)}</span>
                  )}
                  {token && (
                    <span className="text-xs opacity-60">
                      score {item.score}
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-semibold">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="transition-colors hover:text-muted-foreground"
                  >
                    {item.title}
                  </a>
                </h3>

                {item.summary && (
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    {item.summary}
                  </p>
                )}

                {item.insight && (
                  <p className="mt-2.5 border-l-2 border-border pl-3 text-sm">
                    {item.insight}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  {item.tags.map((tag) => (
                    <span key={tag} className="text-xs text-muted-foreground">
                      #{tag}
                    </span>
                  ))}

                  {token && (
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      disabled={pendingId !== null}
                      className="ml-auto text-xs text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
                    >
                      {pendingId === item.id ? "지우는 중" : "삭제"}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
