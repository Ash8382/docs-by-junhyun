"use client";

import { useEffect, useMemo } from "react";
import { buildCorridor, disposeCorridor } from "./buildCorridor";

/** 회랑과 전시실(스펙 2절 "세 막"). 렌더 단계 재질이라 막마다 청사진·클레이·완성품으로 그려진다 */
export function Corridor() {
  const corridor = useMemo(() => buildCorridor(), []);
  useEffect(() => () => disposeCorridor(corridor), [corridor]);
  return <primitive object={corridor} />;
}
