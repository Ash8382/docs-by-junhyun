import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { projects } from "./index";
import { isItemGroups, type Inline, type ItemGroup, type Project, type Screen } from "./types";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// 파일 헤더에서 크기를 읽는다. 데이터에 적은 width/height가 실제 파일과 맞는지 확인한다.
function imageSize(file: string): { width: number; height: number } {
  const buffer = readFileSync(file);
  if (buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  if (buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") {
    const chunk = buffer.toString("ascii", 12, 16);
    if (chunk === "VP8X") {
      return { width: 1 + buffer.readUIntLE(24, 3), height: 1 + buffer.readUIntLE(27, 3) };
    }
    if (chunk === "VP8L") {
      const bits = buffer.readUInt32LE(21);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
    if (chunk === "VP8 ") {
      return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
    }
  }
  throw new Error(`PNG나 WebP가 아닙니다: ${file}`);
}

// 프로젝트 안의 모든 Inline 문자열
function inlineStrings(project: Project): Inline[] {
  if (project.kind === "repos") {
    return [
      project.summary,
      ...project.closing,
      ...project.repos.flatMap((repo) => [
        repo.tagline,
        ...repo.cases.flatMap((item) => [...item.problem, ...item.solution, ...item.result]),
      ]),
    ];
  }
  const role: (Inline | ItemGroup)[] = project.role ?? [];
  return [
    project.summary,
    ...project.overview,
    ...(project.overviewCallout?.items ?? []),
    ...(project.overviewCallout?.text ? [project.overviewCallout.text] : []),
    ...(project.roleIntro ? [project.roleIntro] : []),
    ...role.flatMap((entry) => (typeof entry === "string" ? [entry] : entry.items)),
    ...(project.extraSections ?? []).flatMap((section) => section.items),
    ...(project.achievements ?? []),
    ...(project.note ? [project.note.text] : []),
  ];
}

// 화면에 목록으로 렌더링되는 문자열 묶음. React key가 문자열 자체라 한 목록 안에서 겹치면 안 된다.
// (React의 중복 key 경고는 개발 빌드에서만 나와 e2e(next start)로는 못 잡는다.)
function renderedLists(project: Project): string[][] {
  if (project.kind === "repos") {
    return [
      project.stack,
      project.closing,
      project.repos.map((repo) => repo.name),
      ...project.repos.flatMap((repo) => [
        repo.stack,
        repo.cases.map((item) => item.title),
        repo.screens.map((screen) => screen.src),
        ...repo.cases.flatMap((item) => [item.problem, item.solution, item.result]),
      ]),
    ];
  }
  const role: (Inline | ItemGroup)[] = project.role ?? [];
  return [
    project.stack,
    project.overview,
    project.screens.map((screen) => screen.src),
    project.links.map((link) => link.href),
    project.overviewCallout?.items ?? [],
    project.achievements ?? [],
    role.map((entry) => (typeof entry === "string" ? entry : entry.title)),
    ...role.flatMap((entry) => (typeof entry === "string" ? [] : [entry.items])),
    (project.extraSections ?? []).map((section) => section.title),
    ...(project.extraSections ?? []).map((section) => section.items),
  ];
}

function allScreens(project: Project): Screen[] {
  if (project.kind === "repos") {
    return [...project.screens, ...project.repos.flatMap((repo) => repo.screens)];
  }
  return project.screens;
}

describe("프로젝트 데이터", () => {
  it("slug가 겹치지 않는다", () => {
    const slugs = projects.map((project) => project.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("7개가 종료일 순서로 등록돼 있다", () => {
    // 여정(/journey)의 정류장 순서가 이 순서를 따른다. 시작일로 정렬하면 Stock2U가 EUTCHA 앞에 와 막 구분이 깨진다.
    expect(projects.map((project) => project.slug)).toEqual([
      "kokoa-clone",
      "todo-app",
      "eutcha",
      "stock2u",
      "tix2u",
      "pfplay",
      "pickcare",
    ]);
  });

  it("PiCKCARE 저장소의 짧은 id가 탭 순서대로 있다", () => {
    const pickcare = projects.find((project) => project.slug === "pickcare");
    if (pickcare?.kind !== "repos") throw new Error("PiCKCARE는 저장소 구조 글이어야 합니다");
    expect(pickcare.repos.map((repo) => repo.id)).toEqual(["frontend", "biz", "studio", "app", "cardnews"]);
  });

  it("isItemGroups는 소제목 묶음만 골라낸다", () => {
    expect(isItemGroups([{ title: "메인 페이지", items: ["캐러셀"] }])).toBe(true);
    expect(isItemGroups(["**마이페이지 구현**: 설명"])).toBe(false);
    expect(isItemGroups([])).toBe(false);
  });

  for (const project of projects) {
    describe(project.slug, () => {
      it("헤더 필드가 비어 있지 않다", () => {
        expect(project.title).not.toBe("");
        expect(project.period).not.toBe("");
        expect(project.team).not.toBe("");
        expect(project.summary).not.toBe("");
        expect(project.stack.length).toBeGreaterThan(0);
      });

      it("링크는 https 주소다", () => {
        for (const link of project.links) expect(link.href).toMatch(/^https:\/\//);
      });

      it("본문이 비어 있지 않다", () => {
        if (project.kind === "standard") {
          expect(project.screens.length, "첫 장은 블로그 썸네일이다").toBeGreaterThan(0);
          expect(project.overview.length).toBeGreaterThan(0);
          return;
        }
        expect(project.repos.length).toBeGreaterThan(0);
        for (const repo of project.repos) {
          expect(repo.cases.length, repo.name).toBeGreaterThan(0);
          for (const item of repo.cases) {
            expect(item.problem.length, item.title).toBeGreaterThan(0);
            expect(item.solution.length, item.title).toBeGreaterThan(0);
            expect(item.result.length, item.title).toBeGreaterThan(0);
          }
        }
      });

      it("**굵게** 표기가 짝을 이룬다", () => {
        for (const text of inlineStrings(project)) {
          const marks = text.match(/\*\*/g)?.length ?? 0;
          expect(marks % 2, text).toBe(0);
        }
      });

      it("화면 이미지 파일이 있고 크기가 맞다", () => {
        for (const screen of allScreens(project)) {
          const file = join(process.cwd(), "public", screen.src);
          expect(existsSync(file), screen.src).toBe(true);
          expect(imageSize(file), screen.src).toEqual({ width: screen.width, height: screen.height });
        }
      });

      it("한 목록 안에 같은 문자열이 두 번 나오지 않는다", () => {
        for (const list of renderedLists(project)) {
          expect(new Set(list).size, list.join(" | ")).toBe(list.length);
        }
      });

      it("블로그 글 경로가 있다", () => {
        // 여정 상세의 "블로그 원문 보기"가 /blog/<slug>로 간다.
        expect(existsSync(join(process.cwd(), "src/app/blog", project.slug, "page.tsx"))).toBe(true);
      });
    });
  }
});
