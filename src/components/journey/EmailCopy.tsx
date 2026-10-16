"use client";

import { useRef, useState } from "react";

// 클립보드 권한이 없으면 주소를 선택해 두어 직접 복사할 수 있게 한다.
export function EmailCopy({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);
  const textRef = useRef<HTMLSpanElement>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const node = textRef.current;
      if (node) window.getSelection()?.selectAllChildren(node);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span ref={textRef} className="font-mono text-lg text-zinc-100">
        {email}
      </span>
      <button
        type="button"
        onClick={copy}
        className="rounded-md border border-white/20 px-3 py-1.5 text-sm text-zinc-100 transition-colors hover:bg-white/10"
      >
        {copied ? "복사했습니다" : "이메일 복사"}
      </button>
    </div>
  );
}
