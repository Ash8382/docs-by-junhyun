import * as cheerio from "cheerio";

import { fetchText } from "../lib/http";
import { toIso, truncate } from "../lib/text";
import type { RawItem, SourceAdapter } from "../types";

/**
 * Anthropic은 RSS를 내주지 않아서 뉴스 목록 페이지를 읽는다.
 *
 * 다행히 서버 렌더링이라 제목·날짜·요약이 HTML에 그대로 들어 있다. 다만 클래스명에
 * 빌드마다 바뀌는 해시가 붙어 있으므로(FeaturedGrid-module-scss-module__W1FydW__title)
 * 클래스가 아니라 링크 구조로만 잡는다.
 *
 * 한 페이지에 카드 구조가 두 가지 섞여 있다.
 *   상단 featured: <a><div>[카테고리][날짜]</div><h4>제목</h4><p>요약</p></a>
 *   하단 목록    : <a><div>[날짜][카테고리]</div><span>제목</span></a>
 * 그래서 제목은 "헤딩이 있으면 헤딩, 없으면 a의 직계 자식 span"으로 잡는다.
 * 카테고리와 날짜는 둘 다 div 안에 있어서 직계 자식 span과 자연히 갈린다.
 */

const BASE = "https://www.anthropic.com";
const MAX_ITEMS = 20;

export const anthropicNews: SourceAdapter = {
  id: "anthropic",
  label: "Anthropic News",
  alwaysRelevant: true,
  async fetch(): Promise<RawItem[]> {
    const $ = cheerio.load(await fetchText(`${BASE}/news`));
    const items: RawItem[] = [];
    const seen = new Set<string>();

    $('a[href^="/news/"]').each((_, element) => {
      const anchor = $(element);
      const href = anchor.attr("href");
      if (!href || href === "/news") return;

      const url = `${BASE}${href}`;
      if (seen.has(url)) return;

      const heading = anchor.find("h1, h2, h3, h4").first().text().trim();
      const title = heading || anchor.children("span").last().text().trim();
      if (!title) return;

      seen.add(url);
      items.push({
        title,
        url,
        summary: truncate(anchor.find("p").first().text(), 500),
        publishedAt: toIso(anchor.find("time").first().text().trim()),
        meta: { category: anchor.find("div span").first().text().trim() },
      });
    });

    return items.slice(0, MAX_ITEMS);
  },
};
