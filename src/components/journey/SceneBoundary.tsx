"use client";

import { Component, type ReactNode } from "react";
import { setRenderStep } from "@/lib/journey/engine";

/**
 * 3D 층의 실패(지연 로딩한 청크의 오류, R3F 렌더 오류)를 여기서 막는다. 막지 않으면 사이트 전체 오류 화면이
 * 뜨면서 진짜 HTML인 본문까지 사라진다. 실패하면 3D만 조용히 빠진다. three·R3F를 import하지 않는다.
 */
export class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    setRenderStep(null);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
