import { describe, expect, it } from "vitest";
import { NICKNAME_MESSAGES, validateNickname } from "@shared/nickname";

describe("validateNickname", () => {
  it("정상 닉네임을 통과시키고 앞뒤 공백을 다듬는다", () => {
    expect(validateNickname("  밤톨 ")).toEqual({ ok: true, nick: "밤톨" });
    expect(validateNickname("mingyu")).toEqual({ ok: true, nick: "mingyu" });
    expect(validateNickname("ab12")).toEqual({ ok: true, nick: "ab12" });
  });

  it("너무 짧으면 거부한다", () => {
    expect(validateNickname("가")).toEqual({ ok: false, error: "too_short" });
    expect(validateNickname("   ")).toEqual({ ok: false, error: "too_short" });
  });

  it("너무 길면 거부한다", () => {
    expect(validateNickname("가나다라마바사아자차카")).toEqual({
      ok: false,
      error: "too_long",
    });
  });

  it("한글·영문·숫자가 아니면 거부한다", () => {
    expect(validateNickname("밤톨!")).toEqual({ ok: false, error: "bad_chars" });
    expect(validateNickname("hi there")).toEqual({ ok: false, error: "bad_chars" });
    expect(validateNickname("😀😀")).toEqual({ ok: false, error: "bad_chars" });
    expect(validateNickname("ㅋㅋ")).toEqual({ ok: false, error: "bad_chars" });
  });

  it("금칙어를 부분일치로 거른다", () => {
    expect(validateNickname("운영자")).toEqual({ ok: false, error: "banned" });
    expect(validateNickname("나는admin")).toEqual({ ok: false, error: "banned" });
    expect(validateNickname("ADMIN")).toEqual({ ok: false, error: "banned" });
  });

  it("블로그 주인 아이디를 사칭하는 닉네임을 거른다", () => {
    expect(validateNickname("junhyun")).toEqual({ ok: false, error: "banned" });
    expect(validateNickname("JUNHYUN")).toEqual({ ok: false, error: "banned" });
    expect(validateNickname("iamjunhyun")).toEqual({ ok: false, error: "banned" });
  });

  it("모든 오류에 사용자용 문구가 있다", () => {
    for (const key of ["too_short", "too_long", "bad_chars", "banned"] as const) {
      expect(NICKNAME_MESSAGES[key].length).toBeGreaterThan(0);
    }
  });
});
