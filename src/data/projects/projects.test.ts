import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { projects } from "./index";
import type { Inline, ItemGroup, Project, Screen } from "./types";

// PNG 헤더에서 크기를 읽는다. 데이터에 적은 width/height가 실제 파일과 맞는지 확인한다.
function pngSize(file: string): { width: number; height: number } {
  const buffer = readFileSync(file);
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (!buffer.subarray(0, 8).equals(signature)) throw new Error(`PNG가 아닙니다: ${file}`);
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
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
          expect(pngSize(file), screen.src).toEqual({ width: screen.width, height: screen.height });
        }
      });
    });
  }
});
