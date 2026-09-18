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
          aria-invalid={error !== null}
          aria-describedby="nickname-error"
          className="w-full rounded-lg border border-border bg-background/50 px-4 py-3 text-center text-foreground outline-none focus:border-foreground/40"
        />

        <p id="nickname-error" role="alert" className="mt-2 h-5 text-sm text-red-400">
          {error ?? ""}
        </p>

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
