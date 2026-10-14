import Link from "next/link";
import type { ReactNode } from "react";

export interface InlineOptions {
  /** 페이지가 <strong>에 붙이던 클래스. 없으면 class 속성을 아예 붙이지 않는다. */
  strongClassName?: string;
}

// **굵게** 또는 [텍스트](주소). 굵게 안과 링크 텍스트 안은 다시 해석하지 않는다.
const TOKEN = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;

/**
 * 데이터의 Inline 문자열을 React 요소 배열로 바꾼다.
 * 블로그 글을 데이터로 옮긴 뒤에도 원래 JSX와 같은 마크업이 나와야 한다.
 */
export function renderInline(text: string, options: InlineOptions = {}): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;

  for (const match of text.matchAll(TOKEN)) {
    const index = match.index;
    if (index > last) nodes.push(text.slice(last, index));

    const [whole, bold, label, href] = match;
    if (bold !== undefined) {
      nodes.push(
        <strong key={index} className={options.strongClassName}>
          {bold}
        </strong>,
      );
    } else if (href.startsWith("/")) {
      nodes.push(
        <Link key={index} href={href}>
          {label}
        </Link>,
      );
    } else {
      nodes.push(
        <a key={index} href={href} target="_blank" rel="noreferrer">
          {label}
        </a>,
      );
    }
    last = index + whole.length;
  }

  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}
