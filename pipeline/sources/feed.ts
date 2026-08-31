import { XMLParser } from "fast-xml-parser";

import { fetchText } from "../lib/http";
import { stripHtml, toIso, truncate } from "../lib/text";
import type { RawItem, SourceAdapter } from "../types";

/**
 * RSS 2.0과 Atom을 한 함수로 흡수한다.
 *
 * 라이브러리를 하나 더 얹는 대신 직접 파싱하는 이유는, 어차피 두 포맷 다 필요한 필드가
 * 네댓 개뿐이고 여기서 나오는 모양을 우리가 통제하는 편이 뒤 단계에 낫기 때문이다.
 */

type XmlNode = Record<string, unknown>;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  // 기본값은 XML 엔티티(&amp; &lt;)만 푼다. 워드프레스 계열 피드는 제목에
  // &#8217; &#8220; 같은 HTML 숫자 엔티티를 그대로 실어 보내서 이게 필요하다.
  htmlEntities: true,
  // 항목이 하나뿐인 피드에서 배열이 아닌 객체로 오는 걸 막는다
  isArray: (name) => name === "item" || name === "entry",
});

function asNode(value: unknown): XmlNode | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as XmlNode)
    : undefined;
}

function asArray(value: unknown): unknown[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

/** 텍스트 노드는 문자열로 오기도 하고, 속성이 붙으면 { '#text': ... } 로 오기도 한다. */
function textOf(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);

  const node = asNode(value);
  return node && "#text" in node ? String(node["#text"] ?? "") : "";
}

/** Atom의 link는 속성에 href가 있고 rel이 여러 개다. 본문 링크(alternate)를 고른다. */
function atomLink(entry: XmlNode): string {
  for (const candidate of asArray(entry.link)) {
    if (typeof candidate === "string") return candidate;

    const node = asNode(candidate);
    if (!node) continue;

    const href = node["@_href"];
    const rel = node["@_rel"];
    if (typeof href === "string" && (rel === undefined || rel === "alternate")) {
      return href;
    }
  }

  // link가 없으면 id가 URL인 경우가 많다 (arXiv가 그렇다)
  return textOf(entry.id);
}

const SUMMARY_MAX = 500;

export function parseFeed(xml: string, limit: number): RawItem[] {
  const doc = asNode(parser.parse(xml));
  if (!doc) return [];

  const channel = asNode(asNode(doc.rss)?.channel);
  if (channel) {
    return asArray(channel.item)
      .slice(0, limit)
      .flatMap((raw) => {
        const item = asNode(raw);
        if (!item) return [];

        const title = stripHtml(textOf(item.title));
        const url = textOf(item.link).trim();
        if (!title || !url) return [];

        return [
          {
            title,
            url,
            summary: truncate(stripHtml(textOf(item.description)), SUMMARY_MAX),
            publishedAt: toIso(textOf(item.pubDate)),
            author: textOf(item["dc:creator"]) || undefined,
          },
        ];
      });
  }

  const feed = asNode(doc.feed);
  if (feed) {
    return asArray(feed.entry)
      .slice(0, limit)
      .flatMap((raw) => {
        const entry = asNode(raw);
        if (!entry) return [];

        const title = stripHtml(textOf(entry.title));
        const url = atomLink(entry).trim();
        if (!title || !url) return [];

        const body = textOf(entry.summary) || textOf(entry.content);

        return [
          {
            title,
            url,
            summary: truncate(stripHtml(body), SUMMARY_MAX),
            publishedAt: toIso(textOf(entry.published) || textOf(entry.updated)),
            author: textOf(asNode(entry.author)?.name) || undefined,
          },
        ];
      });
  }

  return [];
}

export function feedSource(config: {
  id: string;
  label: string;
  url: string;
  limit?: number;
  alwaysRelevant?: boolean;
}): SourceAdapter {
  return {
    id: config.id,
    label: config.label,
    alwaysRelevant: config.alwaysRelevant,
    async fetch() {
      return parseFeed(await fetchText(config.url), config.limit ?? 25);
    },
  };
}
