import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { renderInline, type InlineOptions } from "./inline";

function html(text: string, options?: InlineOptions) {
  return renderToStaticMarkup(<>{renderInline(text, options)}</>);
}

describe("renderInline", () => {
  it("표기가 없으면 원문 그대로다", () => {
    expect(html("HTML과 CSS로 구현한 카카오톡 클론 코딩")).toBe(
      "HTML과 CSS로 구현한 카카오톡 클론 코딩",
    );
  });

  it("문장 앞의 **굵게**를 strong으로 바꾼다", () => {
    expect(html("**UI/UX 정밀 구현**: HTML과 CSS만을 사용")).toBe(
      "<strong>UI/UX 정밀 구현</strong>: HTML과 CSS만을 사용",
    );
  });

  it("문장 중간의 **굵게**도 바꾼다", () => {
    expect(html("웹 페이지에 **반응형 디자인**을 적용해")).toBe(
      "웹 페이지에 <strong>반응형 디자인</strong>을 적용해",
    );
  });

  it("strong에 페이지별 클래스를 붙인다", () => {
    expect(
      html("**디제잉 규칙 안내 모달**을 구현했습니다.", {
        strongClassName: "text-zinc-900 dark:text-zinc-100",
      }),
    ).toBe(
      '<strong class="text-zinc-900 dark:text-zinc-100">디제잉 규칙 안내 모달</strong>을 구현했습니다.',
    );
  });

  it("내부 주소 링크는 새 탭 없이 렌더한다", () => {
    expect(html("결정들은 [별도 글](/blog/pickcare-frontend-architecture)에 적어뒀습니다.")).toBe(
      '결정들은 <a href="/blog/pickcare-frontend-architecture">별도 글</a>에 적어뒀습니다.',
    );
  });

  it("외부 주소 링크는 새 탭으로 연다", () => {
    expect(html("[저장소](https://github.com/Ash8382)")).toBe(
      '<a href="https://github.com/Ash8382" target="_blank" rel="noreferrer">저장소</a>',
    );
  });

  it("//로 시작하는 주소는 다른 호스트라서 외부 링크다", () => {
    expect(html("[호스트](//example.com/a)")).toBe(
      '<a href="//example.com/a" target="_blank" rel="noreferrer">호스트</a>',
    );
  });

  it("굵게와 링크가 한 문장에 섞여도 된다", () => {
    expect(html("**습관**은 [글](/blog/a)에 있다")).toBe(
      '<strong>습관</strong>은 <a href="/blog/a">글</a>에 있다',
    );
  });

  it("짝이 맞지 않는 기호는 글자로 남긴다", () => {
    expect(html("**닫히지 않음 [링크](주소 없음")).toBe("**닫히지 않음 [링크](주소 없음");
  });

  it("빈 문자열은 빈 배열이다", () => {
    expect(renderInline("")).toEqual([]);
  });
});
