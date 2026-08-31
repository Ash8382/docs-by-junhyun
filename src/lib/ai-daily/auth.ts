import { createHash, timingSafeEqual } from "node:crypto";

import { ADMIN_TOKEN_HEADER } from "./types";

/**
 * /ai-daily 는 공개 포트폴리오의 한 페이지다. 조회는 누구나 하지만
 * 삭제는 나만 해야 하므로 삭제 API에만 토큰 게이트를 건다.
 *
 * 화면에서 삭제 버튼을 숨기는 건 편의일 뿐이고, 실제 방어선은 여기 하나다.
 */

export function isAdminRequest(request: Request): boolean {
  const expected = process.env.ADMIN_TOKEN;
  const provided = request.headers.get(ADMIN_TOKEN_HEADER);

  // 토큰이 설정돼 있지 않으면 아무도 못 지운다. 설정 누락이 곧 전체 개방이 되면 안 된다.
  if (!expected || !provided) return false;

  // 길이가 달라도 안전하게 비교하려고 해시를 뜬 뒤 맞춘다
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export function unauthorized(): Response {
  return Response.json({ error: "권한이 없습니다." }, { status: 401 });
}
