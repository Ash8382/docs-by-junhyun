import { describe, expect, it } from "vitest";
import { pickcare } from "@/data/projects/pickcare";
import { DETAIL_SLUGS, activeRepo, journeyHash, parseJourneyHash } from "./hash";

describe("해시", () => {
  it("상세가 있는 프로젝트는 코코아톡을 뺀 6개다", () => {
    expect(DETAIL_SLUGS).toEqual(["todo-app", "eutcha", "stock2u", "tix2u", "pfplay", "pickcare"]);
  });

  it("프로젝트 해시를 읽는다", () => {
    expect(parseJourneyHash("#pfplay")).toEqual({ slug: "pfplay" });
  });

  it("PiCKCARE 저장소 탭까지 읽는다", () => {
    expect(parseJourneyHash("#pickcare/biz")).toEqual({ slug: "pickcare", repo: "biz" });
  });

  it("없는 저장소나 저장소가 없는 글의 탭은 무시한다", () => {
    expect(parseJourneyHash("#pickcare/nope")).toEqual({ slug: "pickcare" });
    expect(parseJourneyHash("#pfplay/biz")).toEqual({ slug: "pfplay" });
  });

  it("상세가 없는 글, 모르는 해시, 빈 해시, 깨진 인코딩은 null이다", () => {
    expect(parseJourneyHash("#kokoa-clone")).toBeNull();
    expect(parseJourneyHash("#nope")).toBeNull();
    expect(parseJourneyHash("")).toBeNull();
    expect(parseJourneyHash("#")).toBeNull();
    expect(parseJourneyHash("#%E0%A4%A")).toBeNull();
  });

  it("해시를 만든다", () => {
    expect(journeyHash({ slug: "pfplay" })).toBe("#pfplay");
    expect(journeyHash({ slug: "pickcare", repo: "app" })).toBe("#pickcare/app");
  });

  it("상세가 보여 주는 저장소는 해시의 저장소, 없으면 첫 저장소다", () => {
    expect(activeRepo(pickcare, "biz").id).toBe("biz");
    expect(activeRepo(pickcare, undefined).id).toBe("frontend");
  });

  it("만든 해시를 다시 읽으면 같다", () => {
    const target = { slug: "pickcare", repo: "cardnews" } as const;
    expect(parseJourneyHash(journeyHash(target))).toEqual(target);
  });
});
