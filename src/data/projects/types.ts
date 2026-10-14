/** `**굵게**`와 `[텍스트](주소)`를 지원하는 문자열. src/lib/inline.tsx의 renderInline이 렌더링한다. */
export type Inline = string;

export interface ProjectLink {
  /** 아이콘 선택에 쓴다. */
  kind: "github" | "live";
  label: string;
  href: string;
}

export interface Screen {
  /** public/ 기준 경로. 예: "/kokoa-clone-thumb.png" */
  src: string;
  alt: string;
  width: number;
  height: number;
}

export interface ProjectBase {
  slug: string;
  title: string;
  /** 글 헤더에 적힌 그대로. 예: "2023.11.17 ~ 2023.12.22" */
  period: string;
  /** 예: "Team Project (FE 2명)" */
  team: string;
  summary: Inline;
  stack: string[];
  links: ProjectLink[];
  /** 첫 장이 블로그 썸네일이다. */
  screens: Screen[];
}

export interface Callout {
  title: string;
  text?: Inline;
  items?: Inline[];
}

export interface ItemGroup {
  title: string;
  items: Inline[];
}

export interface StandardProject extends ProjectBase {
  kind: "standard";
  overview: Inline[];
  overviewCallout?: Callout;
  roleIntro?: Inline;
  /** Tix2U처럼 소제목으로 묶인 글은 ItemGroup[]이다. */
  role?: Inline[] | ItemGroup[];
  /** EUTCHA의 "기술 스택 및 규칙" 같은 추가 섹션 */
  extraSections?: ItemGroup[];
  achievements?: Inline[];
  note?: { title: string; text: Inline };
}

export interface Case {
  title: string;
  problem: Inline[];
  solution: Inline[];
  result: Inline[];
}

export interface Repo {
  name: string;
  tagline: Inline;
  stack: string[];
  cases: Case[];
  screens: Screen[];
}

/** PiCKCARE처럼 저장소 → 케이스 구조인 글 */
export interface ReposProject extends ProjectBase {
  kind: "repos";
  repos: Repo[];
  closing: Inline[];
}

export type Project = StandardProject | ReposProject;
