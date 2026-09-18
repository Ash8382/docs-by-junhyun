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
