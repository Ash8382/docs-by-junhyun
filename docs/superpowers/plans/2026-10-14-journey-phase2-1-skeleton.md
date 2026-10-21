# 여정(Journey) 2-1 구현 계획 — 골격: 스크롤·카메라·본문·상세

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/journey`를 처음부터 끝까지 부드럽게 스크롤되는 페이지로 만든다. 모든 글, 상세 패널, 진행 막대, 엔딩이 동작한다. 회랑은 아직 임시 도형이다.

**Architecture:** 본문은 서버에서 렌더링되는 진짜 HTML이다. 정류장 목록(`timeline.ts`) 하나에서 섹션 높이와 카메라 경로가 함께 나온다. GSAP ticker 하나가 매 프레임 Lenis → ScrollTrigger → R3F `advance` 순서로 호출한다. 스크롤 진행률은 React state가 아니라 가변 객체(`scrollState`)로 흐르고, 카메라는 그 값을 프레임 간격 기반 감쇠로 따라간다. three·R3F는 기기 판별 뒤 동적 import로만 불러온다. 상세 패널은 네이티브 `<dialog>`이고, URL 해시(`#pfplay`, `#pickcare/biz`)가 단일 원천이다.

**스펙과 다르게 정한 점(사용자 검토 대상):** 고정(pin) 구간의 본문 패널은 ScrollTrigger의 `pin` 대신 CSS `position: sticky`로 화면에 머문다. 화면에 보이는 효과는 같지만, `pin`이 넣는 스페이서가 레이아웃을 다시 계산하지 않고, 2-4의 2D 화면이 같은 HTML을 그대로 쓸 수 있다. ScrollTrigger는 스크롤 진행률 계산과 2-3의 scrub 연출(오브젝트 분해)을 맡는다.

**Tech Stack:** Next 16 App Router, React 19, TypeScript, three 0.181, @react-three/fiber 9.4(`frameloop="never"` + `advance`), @react-three/drei 10.7, gsap 3.15.0(ticker, ScrollTrigger), lenis 1.3.26, sharp 0.34.5(스크린샷 WebP 변환), vitest 4, @playwright/test 1.63.0

**Spec:** `docs/superpowers/specs/2026-10-14-journey-design.md` (2절 사용자 경험, 4절 아키텍처, 6절 제품 화면, 8절 테스트). 2단계는 계획 4개로 나눈다: **2-1 골격(이 문서)**, 2-2 시각 언어, 2-3 오브젝트, 2-4 기기 대응과 마감.

## Global Constraints

- **범위:** 회랑은 임시 도형(`PlaceholderCorridor`)이다. 렌더 단계 셰이더·조명·후처리(2-2), 오브젝트 7종(2-3), 기기 3단계 판별·2D 레이아웃·스냅숏·접근성 검사·`?debug=perf`(2-4)는 만들지 않는다. 이 계획의 WebGL 처리는 "WebGL2가 없으면 3D를 띄우지 않는다" 하나뿐이다
- **블로그 7개 글 화면은 바뀌지 않는다.** 예외는 Task 9의 헤더 `Journey` 링크 하나뿐이고, 그로 인한 기준 갱신은 Task 9에서 픽셀 외 산출물(높이·DOM·마크업·에러)이 그대로인지 확인한 뒤에만 한다
- **의존성은 정확히 고정한다:** `gsap` 3.15.0, `lenis` 1.3.26(런타임), `sharp` 0.34.5(개발). 모두 배포 2주 이상 지난 안정판이다. 그 밖의 의존성은 추가하지 않는다
- **시계 하나:** `/journey`에서 프레임을 도는 것은 GSAP ticker 하나뿐이다. Lenis는 `autoRaf: false`, Canvas는 `frameloop="never"`, 사이트 별 배경(`Background3D`)은 `/journey`에서 렌더링하지 않는다. 컴포넌트에서 `requestAnimationFrame`을 직접 쓰지 않는다(성능 측정 스크립트 제외)
- **스크롤 중 React 렌더 금지:** 스크롤에 따라 바뀌는 값은 `scrollState`(가변 객체)와 ref로만 흐른다. 스크롤 이벤트에서 `setState`를 부르지 않는다
- **three·`@react-three/*` import는 `src/components/journey/scene/` 안에서만 한다.** 그 밖의 파일은 타입 import도 하지 않는다
- **`/journey`에서 `backdrop-filter`(흐림) 금지:** 본문 패널, 대화상자, 배경막 모두 반투명 단색만 쓴다. 움직이는 캔버스 위의 흐림은 매 프레임 GPU 재합성을 일으킨다
- **React Compiler 계열 린트 규칙이 에러로 켜져 있다**(`react-hooks/set-state-in-effect`, `refs`, `purity`, `immutability` 등): effect 안에서 동기 `setState` 금지, 렌더 중 `ref.current` 접근 금지, 렌더 중 `Math.random`·`Date.now` 금지. 브라우저 값(해시, WebGL 지원)은 `useSyncExternalStore`로 읽는다
- 화면 높이 단위는 `svh`다(모바일 주소창이 접혀도 섹션 높이가 흔들리지 않게)
- **설명 문장(카피)을 넣지 않는다(사용자 결정, 2026-10-14).** 페이지에 쓰는 글은 프로젝트 데이터와, 스펙이 정한 구조적 표기(입구 제목 "A Journey Through Code", 막 제목·기간, "연락처"·"최근 글" 소제목)와, 기능 라벨("자세히 보기", "이메일 복사", "닫기", "블로그 원문 보기")뿐이다. 이 계획의 코드에 없는 문장을 덧붙이지 않는다
- **명령 실행:** Bash 검증 명령에는 `rtk proxy`를 붙이고 exit code를 믿는다. 파일은 Read 도구로 읽는다(`cat`은 rtk 필터가 자른다). `npx tsx`는 rtk가 망가뜨리므로 `rtk proxy npm run <스크립트>`나 `rtk proxy npx tsx`로 실행한다. zsh에서 `$var:path`는 수정자로 해석되므로 `${var}:path`로 쓴다
- **커밋하지 않는다.** 에이전트는 `git add`/`commit`/`stash`/`reset`/`checkout`/`restore`를 실행하지 않는다. 각 태스크 마지막 단계는 파일별 변경 표와 커밋 메시지 초안 제출이다(`type: 한국어 요약` + 이유를 적는 `- ` 불릿, 트레일러 없음). **사용자는 이 계획의 모든 태스크가 끝날 때까지 커밋을 보류한다.** 여러 태스크가 같은 파일(`journey.e2e.ts`, `JourneyStage.tsx`, 데이터)을 고치기 때문이다
- 기존 스타일을 따른다: 한국어 주석, `function` 선언형 컴포넌트, Tailwind 유틸리티. 단위 테스트는 소스 옆 `*.test.ts(x)`, e2e는 `e2e/*.e2e.ts`

## Review Focus

1. **공유 주소와 뒤로 가기가 엉키는 경우.** `/journey#pfplay`로 들어온 사람이 패널을 닫았을 때 `history.back()`이 불리면 사이트를 떠난다. 사람은 패널만 닫히고 `/journey`에 남기를 기대한다 → Task 8 "딥링크로 열린 패널은 닫아도 /journey에 남는다"
2. **열린 패널 위에서 휠을 굴리는 경우.** Lenis가 휠을 가로채면 뒤 페이지가 움직이고 패널은 안 움직인다. 사람은 패널만 스크롤되기를 기대한다 → Task 8 "열린 패널 위의 휠은 패널만 스크롤한다"
3. **키보드로 스크롤하는 경우.** End·PageDown은 휠이 아니라서 Lenis를 거치지 않는다. 사람은 키보드로도 끝까지 가고 카메라도 따라오기를 기대한다 → Task 5 "End 키로 엔딩에 닿는다"
4. **창 크기가 바뀐 뒤.** ScrollTrigger·Lenis가 예전 높이를 쓰면 끝까지 못 가거나 정류장이 어긋난다 → Task 6 "창 크기가 바뀌어도 끝까지 스크롤된다"
5. **WebGL2가 없는 기기.** 3D가 실패해도 본문, 진행 막대, 상세, 엔딩은 동작해야 한다 → Task 7·8의 WebGL 차단 테스트

---

## 파일 구조

| 파일 | 책임 |
|---|---|
| `src/data/projects/types.ts` | (수정) `RepoId`, `Repo.id`, `isItemGroups` 추가 |
| `src/data/projects/pickcare.ts` | (수정) 저장소 `id`, 카드뉴스·저장소 화면 |
| `src/data/projects/{todo-app,eutcha,pfplay}.ts` | (수정) 촬영한 첫 화면 추가 |
| `src/data/projects/projects.test.ts` | (수정) WebP 크기, 목록 중복, 글 경로, 저장소 id |
| `src/lib/inline.tsx`, `inline.test.tsx` | (수정) `//host`는 외부 링크 |
| `scripts/capture-screens.ts` | 프로젝트 공개 화면 촬영 → WebP |
| `src/lib/journey/timeline.ts` | 정류장 목록, 스크롤 구간, 카메라 경로, 오브젝트 위치 (순수) |
| `src/lib/journey/damp.ts` | 프레임 간격 기반 감쇠 (순수) |
| `src/lib/journey/scrollState.ts` | 스크롤 진행률 가변 저장소와 구독 |
| `src/lib/journey/clock.ts` | 시계 하나: 스크롤 → 트리거 → 렌더 |
| `src/lib/journey/engine.ts` | Lenis 인스턴스·스크롤 잠금·렌더 단계 등록소 |
| `src/lib/journey/hash.ts` | 해시 ↔ 상세 대상 변환 (순수) |
| `src/lib/journey/hashStore.ts` | 해시를 외부 저장소처럼 구독·변경 (브라우저) |
| `src/lib/journey/webgl.ts` | WebGL2 지원 확인 |
| `src/components/journey/JourneyContent.tsx` | 정류장별 본문 HTML (서버) |
| `src/components/journey/EmailCopy.tsx` | 이메일 복사 버튼 |
| `src/components/journey/useJourneyScroll.ts` | Lenis·ScrollTrigger·시계 연결 |
| `src/components/journey/JourneyStage.tsx` | 클라이언트 진입점: 스크롤 엔진, 3D, 진행 막대, 상세 |
| `src/components/journey/ProgressRail.tsx` | 진행 막대와 막 이동 버튼 |
| `src/components/journey/ProjectDialog.tsx` | 상세 패널 |
| `src/components/journey/scene/Scene.tsx` | Canvas(`frameloop="never"`), 렌더 단계 등록 |
| `src/components/journey/scene/CameraRig.tsx` | 카메라가 경로를 감쇠로 따라감 |
| `src/components/journey/scene/PlaceholderCorridor.tsx` | 임시 회랑 (2-2에서 교체) |
| `src/app/journey/page.tsx` | 경로, 메타데이터 |
| `src/components/Background3D.tsx` | (수정) `/journey`에서 끔 |
| `src/components/Header.tsx`, `src/app/page.tsx`, `src/app/about/page.tsx` | (수정) Journey 링크 |
| `src/app/globals.css` | (수정) `/journey`에서 헤더 흐림 끔 |
| `e2e/journey.e2e.ts` | `/journey` 동작 테스트 |
| `scripts/perf-journey.ts` | 실제 GPU Chrome에서 프레임 간격 측정 |

---

### Task 1: 데이터와 렌더러 보강 (1단계 최종 검토 이월)

**Files:**
- Modify: `src/data/projects/types.ts`
- Modify: `src/data/projects/pickcare.ts`
- Modify: `src/data/projects/projects.test.ts`
- Modify: `src/lib/inline.tsx`, `src/lib/inline.test.tsx`

**Interfaces:**
- Consumes: 1단계의 `projects`, 타입, `renderInline`
- Produces:
  - `type RepoId = "frontend" | "biz" | "studio" | "app" | "cardnews"`, `Repo.id: RepoId`
  - `isItemGroups(role: Inline[] | ItemGroup[]): role is ItemGroup[]` (`@/data/projects/types`)
  - 무결성 테스트의 이미지 크기 읽기가 PNG와 WebP(VP8, VP8L, VP8X)를 지원

- [ ] **Step 1: 실패하는 테스트를 추가한다**

`src/lib/inline.test.tsx`의 `it("외부 주소 링크는 새 탭으로 연다", ...)` 블록 바로 아래에 추가:

```tsx
  it("//로 시작하는 주소는 다른 호스트라서 외부 링크다", () => {
    expect(html("[호스트](//example.com/a)")).toBe(
      '<a href="//example.com/a" target="_blank" rel="noreferrer">호스트</a>',
    );
  });
```

`src/data/projects/projects.test.ts` 전체를 다음으로 교체한다.

```ts
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
```

- [ ] **Step 2: 테스트가 실패하는지 확인한다**

Run: `rtk proxy npx vitest run src/lib/inline.test.tsx src/data/projects`
Expected: `inline.test.tsx`는 새 테스트 1개 FAIL(`<a href="//example.com/a">`가 나와 기대값과 다름). `projects.test.ts`는 `isItemGroups`를 import할 수 없어 파일 전체 FAIL.

- [ ] **Step 3: `src/lib/inline.tsx`의 내부 링크 판정을 고친다**

```tsx
    } else if (href.startsWith("/")) {
```
를 다음으로 바꾼다.
```tsx
    } else if (href.startsWith("/") && !href.startsWith("//")) {
      // "//host"는 프로토콜 상대 주소라 다른 호스트다. "/"로 시작해도 내부 링크가 아니다.
```

- [ ] **Step 4: `src/data/projects/types.ts`에 저장소 id와 타입 가드를 추가한다**

`export interface Repo {` 바로 위에 추가:

```ts
/** PiCKCARE 저장소의 짧은 이름. 여정 상세 패널의 탭 이름과 public/projects/pickcare/<id>/ 이미지 폴더에 쓴다. */
export type RepoId = "frontend" | "biz" | "studio" | "app" | "cardnews";

```

`export interface Repo {` 다음 줄 `  name: string;` 바로 위에 `  id: RepoId;`를 넣는다. 결과:

```ts
export interface Repo {
  id: RepoId;
  name: string;
  tagline: Inline;
  stack: string[];
  cases: Case[];
  screens: Screen[];
}
```

파일 맨 끝(`export type Project = StandardProject | ReposProject;` 아래)에 추가:

```ts

/** 담당 역할이 소제목 묶음(ItemGroup[])인지 가린다. Tix2U가 그렇다. */
export function isItemGroups(role: Inline[] | ItemGroup[]): role is ItemGroup[] {
  return role.length > 0 && typeof role[0] !== "string";
}
```

- [ ] **Step 5: `src/data/projects/pickcare.ts`에 저장소 id와 카드뉴스 화면을 넣는다**

다섯 군데의 `name:` 줄 바로 위에 `id:`를 넣는다(들여쓰기 6칸).

| 찾을 줄 | 바로 위에 넣을 줄 |
|---|---|
| `      name: "pickcare-frontend",` | `      id: "frontend",` |
| `      name: "pickcare-biz",` | `      id: "biz",` |
| `      name: "pickcare-studio",` | `      id: "studio",` |
| `      name: "pickcare-app",` | `      id: "app",` |
| `      name: "pickcare-cardnews-factory",` | `      id: "cardnews",` |

카드뉴스 저장소의 화면을 채운다. 다음 두 줄을

```ts
      stack: ["Node.js", "Figma Plugin API", "OpenAI", "Google Sheets API", "zod"],
      screens: [],
```
다음으로 바꾼다.
```ts
      stack: ["Node.js", "Figma Plugin API", "OpenAI", "Google Sheets API", "zod"],
      screens: [
        {
          src: "/projects/pickcare/cardnews/masters.webp",
          alt: "카드뉴스 마스터 프레임 4종(썸네일, 본문 2종, CTA)",
          width: 1190,
          height: 391,
        },
        {
          src: "/projects/pickcare/cardnews/set-1.webp",
          alt: "완성된 카드뉴스 세트 1: 카드 5장과 인스타그램 캡션",
          width: 1543,
          height: 378,
        },
        {
          src: "/projects/pickcare/cardnews/set-2.webp",
          alt: "완성된 카드뉴스 세트 2: 카드 5장과 인스타그램 캡션",
          width: 1554,
          height: 362,
        },
      ],
```

- [ ] **Step 6: 테스트가 통과하는지 확인한다**

Run: `rtk proxy npx vitest run src/lib/inline.test.tsx src/data/projects`
Expected: PASS — `inline.test.tsx` 10개, `projects.test.ts` 53개(최상위 4 + 프로젝트 7개 × 7)

- [ ] **Step 7: 블로그 화면이 그대로인지, 타입·린트**

Run: `rtk proxy npx playwright test e2e/blog-projects.e2e.ts`
Expected: `14 passed` (PiCKCARE 블로그 페이지는 저장소 props를 직접 넘기므로 `id` 추가와 무관하다)

Run: `rtk proxy npm run typecheck`
Expected: exit 0

Run: `rtk proxy npx eslint src/data/projects src/lib/inline.tsx src/lib/inline.test.tsx`
Expected: 에러 없음

- [ ] **Step 8: 변경 정리와 커밋 메시지 초안 제출 (커밋하지 않음)**

| 파일 | 내용 |
|---|---|
| `src/data/projects/types.ts` | `RepoId`, `Repo.id`, `isItemGroups` |
| `src/data/projects/pickcare.ts` | 저장소 id 5개, 카드뉴스 화면 3장 |
| `src/data/projects/projects.test.ts` | WebP 크기 읽기, 목록 중복, 글 경로, 저장소 id, 타입 가드 |
| `src/lib/inline.tsx`, `src/lib/inline.test.tsx` | `//host`를 외부 링크로 |

```
feat: 여정 상세를 위한 프로젝트 데이터 보강

- 상세 패널 탭과 이미지 폴더가 저장소를 짧은 이름으로 가리켜야 해서 저장소 id를 뒀다
- 제품 화면이 WebP라 무결성 테스트가 WebP 헤더에서도 크기를 읽게 했다
- 목록 key가 문자열 자체인데 React 중복 key 경고는 개발 빌드에만 나와서 데이터 테스트로 막았다
- //로 시작하는 주소가 내부 링크로 처리돼 같은 탭에서 다른 호스트로 넘어가는 것을 막았다
```

---

### Task 2: 제품 화면 촬영

**Files:**
- Create: `scripts/capture-screens.ts`
- Modify: `package.json` (devDependency `sharp`, 스크립트 `capture:screens`)
- Modify: `src/data/projects/todo-app.ts`, `eutcha.ts`, `pfplay.ts`, `pickcare.ts`
- Create (산출물): `public/projects/{todo-app,eutcha,pfplay}/home.webp`, `public/projects/pickcare/{frontend,biz,studio}/home.webp`

**Interfaces:**
- Consumes: Task 1의 WebP 크기 검사
- Produces: 데이터의 `screens`에 첫 화면이 추가됨(2880×1800). 상세 패널(Task 8)이 보여준다

- [ ] **Step 1: sharp를 정확한 버전으로 설치한다**

Run: `rtk proxy npm install --save-dev --save-exact sharp@0.34.5`
Expected: `package.json`의 `devDependencies`에 `"sharp": "0.34.5"`

- [ ] **Step 2: `scripts/capture-screens.ts`를 만든다**

```ts
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { chromium } from "@playwright/test";
import sharp from "sharp";

/**
 * 프로젝트 공개 화면을 같은 조건(1440×900, 2배 배율)으로 찍어 WebP로 저장한다.
 * 사이트가 바뀌면 다시 돌린다: npm run capture:screens
 * 결과는 public/projects/<경로>.webp이고 크기는 2880×1800이다. 데이터(src/data/projects/*.ts)의 width/height도 그 값이다.
 * PiCKCARE 앱(App Store)과 PFPlay 안쪽 화면처럼 로그인이 필요한 화면은 사용자가 직접 넣는다.
 */
const TARGETS = [
  { file: "todo-app/home", url: "https://geezers-io.github.io/todo-app-assignment/" },
  { file: "eutcha/home", url: "https://eutcha.vercel.app/" },
  { file: "pfplay/home", url: "https://pfplay.xyz/" },
  { file: "pickcare/frontend/home", url: "https://pickcare.co.kr/" },
  { file: "pickcare/biz/home", url: "https://www.biz.pickcare.co.kr/" },
  { file: "pickcare/studio/home", url: "https://studio.pickcare.co.kr/" },
] as const;

const VIEWPORT = { width: 1440, height: 900 };
// 첫 화면의 등장 애니메이션과 지연 로딩 이미지가 자리 잡을 시간
const SETTLE_MS = 2500;

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2, locale: "ko-KR" });
  try {
    for (const target of TARGETS) {
      const page = await context.newPage();
      await page.goto(target.url, { waitUntil: "load", timeout: 60_000 });
      await page.waitForTimeout(SETTLE_MS);
      const png = await page.screenshot();
      const out = join(process.cwd(), "public", "projects", `${target.file}.webp`);
      await mkdir(dirname(out), { recursive: true });
      const info = await sharp(png).webp({ quality: 85 }).toFile(out);
      console.log(`${target.file}.webp  ${info.width}x${info.height}  ${info.size} bytes`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

`package.json`의 `scripts`에서 `"e2e": "playwright test",` 아래에 추가:

```json
    "capture:screens": "tsx scripts/capture-screens.ts",
```

- [ ] **Step 3: 촬영한다**

Run: `rtk proxy npm run capture:screens`
Expected: 6줄 출력, 모두 `2880x1800`.

- [ ] **Step 4: 촬영 결과를 눈으로 확인한다**

Read 도구로 6장을 모두 연다. 각 장에 대해 무엇이 보이는지 보고서에 한 줄씩 적는다. 다음 중 하나라도 해당하면 그 장은 **쓰지 않는다**: 빈 화면, 로딩 표시만 보임, 쿠키·로그인·지갑 연결 대화상자가 화면 대부분을 가림, 오류 페이지. 쓰지 않는 장은 파일을 지우고(`rm public/projects/<경로>.webp`), Step 5에서 해당 데이터 항목을 빼고, 상태를 DONE_WITH_CONCERNS로 보고한다.

- [ ] **Step 5: 데이터에 화면을 추가한다**

`src/data/projects/todo-app.ts`에서
```ts
      height: 603,
    },
  ],
```
를 다음으로 바꾼다.
```ts
      height: 603,
    },
    {
      src: "/projects/todo-app/home.webp",
      alt: "Todo App 첫 화면",
      width: 2880,
      height: 1800,
    },
  ],
```

`src/data/projects/eutcha.ts`에서
```ts
      height: 818,
    },
  ],
```
를 다음으로 바꾼다.
```ts
      height: 818,
    },
    {
      src: "/projects/eutcha/home.webp",
      alt: "EUTCHA 첫 화면",
      width: 2880,
      height: 1800,
    },
  ],
```

`src/data/projects/pfplay.ts`에서
```ts
      height: 601,
    },
  ],
```
를 다음으로 바꾼다.
```ts
      height: 601,
    },
    {
      src: "/projects/pfplay/home.webp",
      alt: "PFPlay 첫 화면",
      width: 2880,
      height: 1800,
    },
  ],
```

`src/data/projects/pickcare.ts`에서 세 저장소의 `screens: [],`를 채운다.

frontend — 다음 세 줄을
```ts
        "Playwright",
      ],
      screens: [],
```
다음으로 바꾼다.
```ts
        "Playwright",
      ],
      screens: [
        {
          src: "/projects/pickcare/frontend/home.webp",
          alt: "PiCKCARE 메인 서비스 첫 화면",
          width: 2880,
          height: 1800,
        },
      ],
```

biz — 다음 세 줄을
```ts
        "Vitest",
      ],
      screens: [],
```
다음으로 바꾼다.
```ts
        "Vitest",
      ],
      screens: [
        {
          src: "/projects/pickcare/biz/home.webp",
          alt: "PiCKCARE CRM(PiCKY-CHART) 첫 화면",
          width: 2880,
          height: 1800,
        },
      ],
```

studio — 다음 두 줄을
```ts
      stack: ["Next.js 16", "Tailwind", "TypeScript", "Embla", "Lenis"],
      screens: [],
```
다음으로 바꾼다.
```ts
      stack: ["Next.js 16", "Tailwind", "TypeScript", "Embla", "Lenis"],
      screens: [
        {
          src: "/projects/pickcare/studio/home.webp",
          alt: "PiCKCARE 스튜디오 첫 화면",
          width: 2880,
          height: 1800,
        },
      ],
```

- [ ] **Step 6: 무결성·블로그·타입·린트**

Run: `rtk proxy npx vitest run src/data/projects`
Expected: PASS 53 (새 이미지 6장의 파일 존재와 크기 2880×1800 확인 포함)

Run: `rtk proxy npx playwright test e2e/blog-projects.e2e.ts`
Expected: `14 passed` (블로그는 `screens[0]` 썸네일만 쓰므로 그대로)

Run: `rtk proxy npm run typecheck` → exit 0

Run: `rtk proxy npx eslint scripts/capture-screens.ts src/data/projects` → 에러 없음

- [ ] **Step 7: 변경 정리와 커밋 메시지 초안 제출 (커밋하지 않음)**

| 파일 | 내용 |
|---|---|
| `package.json`, `package-lock.json` | `sharp` 0.34.5, `capture:screens` |
| `scripts/capture-screens.ts` | 공개 화면 촬영 스크립트 |
| `public/projects/**/home.webp` | 촬영한 첫 화면 6장 |
| `src/data/projects/{todo-app,eutcha,pfplay,pickcare}.ts` | 화면 추가 |

```
feat: 프로젝트 공개 화면 촬영 스크립트와 첫 화면 추가

- 상세 패널에 실제 제품 화면을 보여주기 위해. 같은 뷰포트·배율로 찍어 화면끼리 톤을 맞췄다
- 사이트가 바뀌어도 같은 조건으로 다시 찍을 수 있게 수작업 대신 스크립트로 남겼다
```

---

### Task 3: 정류장 모델과 카메라 경로

**Files:**
- Create: `src/lib/journey/timeline.ts`
- Test: `src/lib/journey/timeline.test.ts`

**Interfaces:**
- Consumes: `projects` (테스트에서 순서 대조)
- Produces (`@/lib/journey/timeline`):
  - `type Vec3 = [number, number, number]`, `type StopKind`, `interface Stop { id; kind; act: 0|1|2|3; length; pin; slug? }`, `interface StopRange { stop; index; start; end }`, `interface CameraPose { position: Vec3; target: Vec3 }`
  - `STOPS: Stop[]`, `TOTAL_LENGTH`, `SCROLL_LENGTH`, `STOP_RANGES: StopRange[]`, `PATH_LENGTH`
  - `rangeOf(id: string): StopRange`, `stopAt(progress): { range: StopRange; t: number }`
  - `pathPoint(s: number): Vec3`, `pathParamAt(progress): number`, `focusPoint(stop: Stop): Vec3 | null`, `cameraAt(progress): CameraPose`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/lib/journey/timeline.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { projects } from "@/data/projects";
import {
  PATH_LENGTH,
  SCROLL_LENGTH,
  STOPS,
  STOP_RANGES,
  TOTAL_LENGTH,
  cameraAt,
  focusPoint,
  pathParamAt,
  rangeOf,
  stopAt,
  type Vec3,
} from "./timeline";

function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

describe("정류장", () => {
  it("스펙의 스크롤 배분을 따른다", () => {
    expect(STOPS.map((stop) => [stop.id, stop.length])).toEqual([
      ["intro", 1],
      ["act-1", 0.5],
      ["kokoa-clone", 1],
      ["todo-app", 1],
      ["eutcha", 1],
      ["act-2", 0.5],
      ["stock2u", 2],
      ["tix2u", 2],
      ["pfplay", 2],
      ["act-3", 0.5],
      ["pickcare", 5],
      ["ending", 2],
    ]);
    expect(TOTAL_LENGTH).toBe(18.5);
    expect(SCROLL_LENGTH).toBe(17.5);
  });

  it("프로젝트 정류장이 데이터의 종료일 순서와 같다", () => {
    expect(STOPS.filter((stop) => stop.slug).map((stop) => stop.slug)).toEqual(
      projects.map((project) => project.slug),
    );
  });

  it("막 배정과 고정 구간이 스펙과 같다", () => {
    expect(["kokoa-clone", "todo-app", "eutcha"].map((id) => rangeOf(id).stop.act)).toEqual([1, 1, 1]);
    expect(["stock2u", "tix2u", "pfplay"].map((id) => rangeOf(id).stop.act)).toEqual([2, 2, 2]);
    expect(rangeOf("pickcare").stop.act).toBe(3);
    expect(STOPS.filter((stop) => stop.pin).map((stop) => stop.id)).toEqual([
      "stock2u",
      "tix2u",
      "pfplay",
      "pickcare",
    ]);
  });

  it("구간이 0에서 1까지 빈틈없이 이어진다", () => {
    expect(STOP_RANGES[0].start).toBe(0);
    expect(STOP_RANGES[STOP_RANGES.length - 1].end).toBeCloseTo(1, 12);
    for (let index = 1; index < STOP_RANGES.length; index += 1) {
      expect(STOP_RANGES[index].start).toBeCloseTo(STOP_RANGES[index - 1].end, 12);
    }
  });

  it("진행률로 정류장을 찾는다", () => {
    expect(stopAt(0).range.stop.id).toBe("intro");
    expect(stopAt(1).range.stop.id).toBe("ending");
    expect(stopAt(1).t).toBe(1);
    const pfplay = rangeOf("pfplay");
    const middle = stopAt((pfplay.start + pfplay.end) / 2);
    expect(middle.range.stop.id).toBe("pfplay");
    expect(middle.t).toBeCloseTo(0.5, 10);
  });
});

describe("카메라 경로", () => {
  it("스크롤이 늘면 회랑을 따라 앞으로만 간다", () => {
    let previous = -Infinity;
    for (let step = 0; step <= 2000; step += 1) {
      const s = pathParamAt(step / 2000);
      expect(s).toBeGreaterThanOrEqual(previous - 1e-9);
      previous = s;
    }
    expect(pathParamAt(1)).toBeCloseTo(PATH_LENGTH, 10);
  });

  it("정류장 경계에서 카메라가 튀지 않는다", () => {
    for (const range of STOP_RANGES.slice(1)) {
      const before = cameraAt(range.start - 1e-7);
      const after = cameraAt(range.start + 1e-7);
      expect(distance(before.position, after.position), range.stop.id).toBeLessThan(1e-3);
      expect(distance(before.target, after.target), range.stop.id).toBeLessThan(1e-3);
    }
  });

  it("고정 구간 한가운데에서는 오브젝트를 바라본다", () => {
    for (const range of STOP_RANGES.filter((item) => item.stop.pin)) {
      const focus = focusPoint(range.stop);
      if (!focus) throw new Error(`${range.stop.id}에 오브젝트 위치가 없습니다`);
      const pose = cameraAt((range.start + range.end) / 2);
      expect(distance(pose.target, focus), range.stop.id).toBeLessThan(1e-9);
    }
  });

  it("프로젝트·전시실 정류장만 오브젝트 위치를 가진다", () => {
    for (const stop of STOPS) {
      const hasObject = stop.kind === "project" || stop.kind === "hall";
      expect(focusPoint(stop) !== null, stop.id).toBe(hasObject);
    }
  });

  it("엔딩 끝에서는 위에서 회랑 전체를 내려다본다", () => {
    const end = cameraAt(1);
    expect(end.position[1]).toBeGreaterThan(20);
    expect(end.target[1]).toBe(0);
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인한다**

Run: `rtk proxy npx vitest run src/lib/journey/timeline.test.ts`
Expected: FAIL — `./timeline`을 찾을 수 없음

- [ ] **Step 3: `src/lib/journey/timeline.ts`를 구현한다**

```ts
/**
 * 여정의 정류장 목록. 본문 섹션 높이, 스크롤 구간, 카메라 경로가 모두 여기서 나온다.
 * 같은 목록에서 계산하므로 3D 장면과 글의 위치가 어긋날 수 없다. (스펙 2절 "정류장과 스크롤 배분")
 */

export type Vec3 = [number, number, number];

export type StopKind = "intro" | "act" | "project" | "hall" | "ending";

export interface Stop {
  /** 본문 섹션 id는 `stop-${id}`다. */
  id: string;
  kind: StopKind;
  /** 0은 막 밖(입구·엔딩) */
  act: 0 | 1 | 2 | 3;
  /** 스크롤 길이(화면 높이 단위) */
  length: number;
  /** 화면 고정 구간인가. 본문 패널이 머물고 카메라는 걸어 들어가 멈춘 뒤 오브젝트를 본다. */
  pin: boolean;
  slug?: string;
}

export interface StopRange {
  stop: Stop;
  index: number;
  /** 0~1 진행률 */
  start: number;
  end: number;
}

export interface CameraPose {
  position: Vec3;
  target: Vec3;
}

export const STOPS: Stop[] = [
  { id: "intro", kind: "intro", act: 0, length: 1, pin: false },
  { id: "act-1", kind: "act", act: 1, length: 0.5, pin: false },
  { id: "kokoa-clone", kind: "project", act: 1, length: 1, pin: false, slug: "kokoa-clone" },
  { id: "todo-app", kind: "project", act: 1, length: 1, pin: false, slug: "todo-app" },
  { id: "eutcha", kind: "project", act: 1, length: 1, pin: false, slug: "eutcha" },
  { id: "act-2", kind: "act", act: 2, length: 0.5, pin: false },
  { id: "stock2u", kind: "project", act: 2, length: 2, pin: true, slug: "stock2u" },
  { id: "tix2u", kind: "project", act: 2, length: 2, pin: true, slug: "tix2u" },
  { id: "pfplay", kind: "project", act: 2, length: 2, pin: true, slug: "pfplay" },
  { id: "act-3", kind: "act", act: 3, length: 0.5, pin: false },
  { id: "pickcare", kind: "hall", act: 3, length: 5, pin: true, slug: "pickcare" },
  { id: "ending", kind: "ending", act: 0, length: 2, pin: false },
];

/** 본문 전체 높이(화면 단위) */
export const TOTAL_LENGTH = STOPS.reduce((sum, stop) => sum + stop.length, 0);

/**
 * 실제로 스크롤할 수 있는 길이. 본문 맨 아래가 화면 아래에 닿으면 끝나므로 화면 하나만큼 짧다.
 * 그래서 마지막 정류장(엔딩)은 길이에서 화면 하나를 빼고 구간을 잡는다.
 */
export const SCROLL_LENGTH = TOTAL_LENGTH - 1;

export const STOP_RANGES: StopRange[] = (() => {
  let offset = 0;
  return STOPS.map((stop, index) => {
    const span = index === STOPS.length - 1 ? stop.length - 1 : stop.length;
    const range = { stop, index, start: offset / SCROLL_LENGTH, end: (offset + span) / SCROLL_LENGTH };
    offset += span;
    return range;
  });
})();

export function rangeOf(id: string): StopRange {
  const range = STOP_RANGES.find((item) => item.stop.id === id);
  if (!range) throw new Error(`정류장이 없습니다: ${id}`);
  return range;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function lerp3(a: Vec3, b: Vec3, t: number): Vec3 {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function stopAt(progress: number): { range: StopRange; t: number } {
  const p = clamp01(progress);
  const range = STOP_RANGES.find((item) => p < item.end) ?? STOP_RANGES[STOP_RANGES.length - 1];
  const t = range.end > range.start ? (p - range.start) / (range.end - range.start) : 0;
  return { range, t: clamp01(t) };
}

// ── 카메라 경로 ──────────────────────────────────────────────
// 회랑은 -z 방향으로 뻗고 x가 완만하게 휜다. s는 입구에서 회랑을 따라 나아간 거리다.

/** 고정이 아닌 정류장에서 화면 한 높이만큼 스크롤할 때 카메라가 나아가는 거리 */
const UNITS_PER_SCREEN = 4;
/** 고정 정류장은 길이의 절반만큼만 나아간다. 걸어 들어와 멈추고, 보고, 걸어 나간다. */
const PIN_TRAVEL = 0.5;
const EYE_HEIGHT = 1.6;
const LOOK_AHEAD = 6;
/** 고정 구간에서 카메라가 오브젝트 주위를 도는 각도(라디안) */
const ORBIT = 0.35;

function corridorX(z: number): number {
  return 1.5 * Math.sin(z / 18);
}

export function pathPoint(s: number): Vec3 {
  const z = -s;
  return [corridorX(z), EYE_HEIGHT, z];
}

const PATH_SPANS: { from: number; to: number }[] = (() => {
  let s = 0;
  return STOPS.map((stop) => {
    const from = s;
    if (stop.kind !== "ending") s += stop.length * UNITS_PER_SCREEN * (stop.pin ? PIN_TRAVEL : 1);
    return { from, to: s };
  });
})();

export const PATH_LENGTH = PATH_SPANS[PATH_SPANS.length - 1].to;

/** 고정 구간의 진행: 앞 1/4에 반을 걷고, 가운데 절반은 멈추고, 뒤 1/4에 나머지 반을 걷는다. */
function dwell(t: number): number {
  if (t < 0.25) return 0.5 * smoothstep(0, 0.25, t);
  if (t > 0.75) return 0.5 + 0.5 * smoothstep(0.75, 1, t);
  return 0.5;
}

/** 고정 구간에서 오브젝트를 보는 정도. 양 끝에서 0이라 앞뒤 정류장과 자연스럽게 이어진다. */
function pinWeight(t: number): number {
  return smoothstep(0, 0.25, t) * (1 - smoothstep(0.75, 1, t));
}

export function pathParamAt(progress: number): number {
  const { range, t } = stopAt(progress);
  const span = PATH_SPANS[range.index];
  const k = range.stop.pin ? dwell(t) : t;
  return span.from + (span.to - span.from) * k;
}

const PROJECT_STOPS = STOPS.filter((stop) => stop.kind === "project");

/**
 * 프로젝트 오브젝트가 서는 위치. 프로젝트 순서대로 왼쪽·오른쪽을 번갈아 쓴다(짝수 번째가 왼쪽).
 * 본문 패널은 반대편에 둔다(JourneyContent의 panelSide).
 */
export function focusPoint(stop: Stop): Vec3 | null {
  const span = PATH_SPANS[STOPS.indexOf(stop)];
  const [x, , z] = pathPoint((span.from + span.to) / 2);
  if (stop.kind === "hall") return [corridorX(z - 8), 1.8, z - 8];
  if (stop.kind !== "project") return null;
  const side = PROJECT_STOPS.indexOf(stop) % 2 === 0 ? -1 : 1;
  if (stop.act === 1) return [x + side * 1.8, 1.3, z];
  return [x + side * 2.6, 1.4, z - 3.5];
}

function rotateAround(point: Vec3, center: Vec3, angle: number): Vec3 {
  const dx = point[0] - center[0];
  const dz = point[2] - center[2];
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [center[0] + dx * cos - dz * sin, point[1], center[2] + dx * sin + dz * cos];
}

/** 엔딩: 위로 빠지며 회랑 전체를 내려다보는 자리 */
const OVERVIEW_POSITION: Vec3 = [0, 34, -PATH_LENGTH * 0.5 + 22];
const OVERVIEW_TARGET: Vec3 = [0, 0, -PATH_LENGTH * 0.5];

export function cameraAt(progress: number): CameraPose {
  const { range, t } = stopAt(progress);
  const s = pathParamAt(progress);
  const base = pathPoint(s);
  const ahead = pathPoint(s + LOOK_AHEAD);
  const stop = range.stop;

  if (stop.kind === "ending") {
    const k = smoothstep(0, 1, t);
    return { position: lerp3(base, OVERVIEW_POSITION, k), target: lerp3(ahead, OVERVIEW_TARGET, k) };
  }

  const focus = stop.pin ? focusPoint(stop) : null;
  if (!focus) return { position: base, target: ahead };

  const w = pinWeight(t);
  const orbit = rotateAround(base, focus, (t - 0.5) * ORBIT);
  return { position: lerp3(base, orbit, w), target: lerp3(ahead, focus, w) };
}
```

- [ ] **Step 4: 테스트가 통과하는지 확인한다**

Run: `rtk proxy npx vitest run src/lib/journey/timeline.test.ts`
Expected: PASS (10 tests)

- [ ] **Step 5: 타입·린트**

Run: `rtk proxy npm run typecheck` → exit 0
Run: `rtk proxy npx eslint src/lib/journey` → 에러 없음

- [ ] **Step 6: 변경 정리와 커밋 메시지 초안 제출 (커밋하지 않음)**

| 파일 | 내용 |
|---|---|
| `src/lib/journey/timeline.ts`, `timeline.test.ts` | 정류장 목록, 스크롤 구간, 카메라 경로, 오브젝트 위치 |

```
feat: 여정 정류장 모델과 카메라 경로

- 본문 섹션 높이와 카메라 경로를 한 목록에서 계산해 3D 장면과 글이 어긋날 수 없게 했다
- 고정 구간은 걸어 들어와 멈추고 오브젝트를 본 뒤 걸어 나가며, 양 끝에서 앞뒤 정류장과 위치가 정확히 이어진다
```

---

### Task 4: 런타임 기반 모듈 (감쇠, 스크롤 상태, 시계, 엔진, 해시)

**Files:**
- Modify: `package.json` (`gsap`, `lenis`)
- Create: `src/lib/journey/damp.ts`, `damp.test.ts`
- Create: `src/lib/journey/scrollState.ts`, `scrollState.test.ts`
- Create: `src/lib/journey/clock.ts`, `clock.test.ts`
- Create: `src/lib/journey/engine.ts`, `engine.test.ts`
- Create: `src/lib/journey/hash.ts`, `hash.test.ts`
- Create: `src/lib/journey/hashStore.ts`
- Create: `src/lib/journey/webgl.ts`

**Interfaces:**
- Consumes: Task 1의 `RepoId`, `projects`; Task 3의 `Vec3`
- Produces:
  - `dampFactor(lambda, dt)`, `damp(current, target, lambda, dt)`, `damp3(out: {x;y;z}, target: Vec3, lambda, dt): void`
  - `scrollState: { progress: number }`, `setProgress(p)`, `subscribeProgress(listener): () => void`
  - `interface Ticker { add(cb); remove(cb); lagSmoothing(threshold) }`, `interface ClockSteps { scroll(timeMs); triggers(); render(timeMs) }`, `startClock(ticker, steps): () => void`
  - `setLenis(engine | null)`, `getLenis()`, `lockScroll()`, `unlockScroll()`, `setRenderStep(step | null)`, `renderFrame(timeMs)`
  - `DETAIL_SLUGS: string[]`, `interface JourneyTarget { slug: string; repo?: RepoId }`, `parseJourneyHash(hash): JourneyTarget | null`, `journeyHash(target): string`
  - `subscribeHash(cb)`, `getHash()`, `getServerHash()`, `pushHash(hash)`, `replaceHash(hash)`
  - `hasWebGL2(): boolean`

- [ ] **Step 1: 의존성을 정확한 버전으로 설치한다**

Run: `rtk proxy npm install --save-exact gsap@3.15.0 lenis@1.3.26`
Expected: `package.json`의 `dependencies`에 `"gsap": "3.15.0"`, `"lenis": "1.3.26"`

- [ ] **Step 2: 실패하는 테스트를 쓴다**

`src/lib/journey/damp.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { damp, damp3, dampFactor } from "./damp";

describe("감쇠", () => {
  it("60Hz와 120Hz에서 같은 시간이 흐르면 결과가 같다", () => {
    let at60 = 0;
    for (let frame = 0; frame < 60; frame += 1) at60 = damp(at60, 10, 5, 1 / 60);
    let at120 = 0;
    for (let frame = 0; frame < 120; frame += 1) at120 = damp(at120, 10, 5, 1 / 120);
    expect(at60).toBeCloseTo(at120, 10);
    expect(at60).toBeCloseTo(10 * (1 - Math.exp(-5)), 10);
  });

  it("시간이 흐르지 않으면 움직이지 않는다", () => {
    expect(dampFactor(5, 0)).toBe(0);
    expect(damp(3, 10, 5, 0)).toBe(3);
  });

  it("damp3도 프레임 간격과 무관하다", () => {
    const at60 = { x: 0, y: 0, z: 0 };
    for (let frame = 0; frame < 60; frame += 1) damp3(at60, [1, 2, 3], 4, 1 / 60);
    const at120 = { x: 0, y: 0, z: 0 };
    for (let frame = 0; frame < 120; frame += 1) damp3(at120, [1, 2, 3], 4, 1 / 120);
    expect(at60.x).toBeCloseTo(at120.x, 10);
    expect(at60.y).toBeCloseTo(at120.y, 10);
    expect(at60.z).toBeCloseTo(at120.z, 10);
  });
});
```

`src/lib/journey/scrollState.test.ts`:

```ts
import { expect, it } from "vitest";
import { scrollState, setProgress, subscribeProgress } from "./scrollState";

it("구독자에게 진행률을 알리고, 구독을 끊으면 더 알리지 않는다", () => {
  const seen: number[] = [];
  const unsubscribe = subscribeProgress((progress) => seen.push(progress));
  setProgress(0.25);
  unsubscribe();
  setProgress(0.5);
  expect(seen).toEqual([0.25]);
  expect(scrollState.progress).toBe(0.5);
});
```

`src/lib/journey/clock.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { startClock, type Ticker } from "./clock";

function fakeTicker() {
  const callbacks = new Set<(time: number) => void>();
  const lag: number[] = [];
  const ticker: Ticker = {
    add: (callback) => {
      callbacks.add(callback);
    },
    remove: (callback) => {
      callbacks.delete(callback);
    },
    lagSmoothing: (threshold) => {
      lag.push(threshold);
    },
  };
  return { ticker, lag, tick: (time: number) => callbacks.forEach((callback) => callback(time)) };
}

describe("시계", () => {
  it("한 프레임에 스크롤 → 트리거 → 렌더 순서로 같은 시각을 넘긴다", () => {
    const { ticker, tick } = fakeTicker();
    const calls: string[] = [];
    startClock(ticker, {
      scroll: (timeMs) => calls.push(`scroll:${timeMs}`),
      triggers: () => calls.push("triggers"),
      render: (timeMs) => calls.push(`render:${timeMs}`),
    });
    tick(1.5);
    expect(calls).toEqual(["scroll:1500", "triggers", "render:1500"]);
  });

  it("지연 보정을 꺼서 탭을 오래 비운 뒤에도 시각이 끊기지 않게 한다", () => {
    const { ticker, lag } = fakeTicker();
    startClock(ticker, { scroll: () => {}, triggers: () => {}, render: () => {} });
    expect(lag).toEqual([0]);
  });

  it("멈추면 더 호출하지 않는다", () => {
    const { ticker, tick } = fakeTicker();
    const calls: string[] = [];
    const stop = startClock(ticker, {
      scroll: () => calls.push("scroll"),
      triggers: () => calls.push("triggers"),
      render: () => calls.push("render"),
    });
    stop();
    tick(2);
    expect(calls).toEqual([]);
  });
});
```

`src/lib/journey/engine.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getLenis, lockScroll, renderFrame, setLenis, setRenderStep, unlockScroll } from "./engine";

function fakeLenis() {
  return { stop: vi.fn(), start: vi.fn(), scrollTo: vi.fn() };
}

beforeEach(() => {
  setLenis(null);
  unlockScroll();
  setRenderStep(null);
});

describe("엔진", () => {
  it("Lenis가 생기기 전에 잠그면 생기는 순간 멈춘다", () => {
    lockScroll();
    const lenis = fakeLenis();
    setLenis(lenis);
    expect(lenis.stop).toHaveBeenCalledTimes(1);
    expect(getLenis()).toBe(lenis);
  });

  it("잠금을 풀면 다시 움직인다", () => {
    const lenis = fakeLenis();
    setLenis(lenis);
    lockScroll();
    unlockScroll();
    expect(lenis.stop).toHaveBeenCalledTimes(1);
    expect(lenis.start).toHaveBeenCalledTimes(1);
  });

  it("렌더 단계가 등록돼 있을 때만 그린다", () => {
    const step = vi.fn();
    renderFrame(16);
    setRenderStep(step);
    renderFrame(32);
    setRenderStep(null);
    renderFrame(48);
    expect(step).toHaveBeenCalledTimes(1);
    expect(step).toHaveBeenCalledWith(32);
  });
});
```

`src/lib/journey/hash.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { DETAIL_SLUGS, journeyHash, parseJourneyHash } from "./hash";

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

  it("만든 해시를 다시 읽으면 같다", () => {
    const target = { slug: "pickcare", repo: "cardnews" } as const;
    expect(parseJourneyHash(journeyHash(target))).toEqual(target);
  });
});
```

- [ ] **Step 3: 테스트가 실패하는지 확인한다**

Run: `rtk proxy npx vitest run src/lib/journey`
Expected: 새 테스트 파일 5개가 모듈을 찾지 못해 FAIL. `timeline.test.ts`는 PASS

- [ ] **Step 4: 구현한다**

`src/lib/journey/damp.ts`:

```ts
import type { Vec3 } from "./timeline";

/** 프레임 간격(dt, 초)과 무관하게 같은 속도로 목표에 다가가는 감쇠 계수. lambda가 클수록 빠르다. */
export function dampFactor(lambda: number, dt: number): number {
  return 1 - Math.exp(-lambda * dt);
}

export function damp(current: number, target: number, lambda: number, dt: number): number {
  return current + (target - current) * dampFactor(lambda, dt);
}

/** out을 target 쪽으로 감쇠시킨다. 매 프레임 새 객체를 만들지 않도록 out을 직접 고친다(three의 Vector3를 그대로 넘길 수 있다). */
export function damp3(out: { x: number; y: number; z: number }, target: Vec3, lambda: number, dt: number): void {
  const factor = dampFactor(lambda, dt);
  out.x += (target[0] - out.x) * factor;
  out.y += (target[1] - out.y) * factor;
  out.z += (target[2] - out.z) * factor;
}
```

`src/lib/journey/scrollState.ts`:

```ts
/**
 * 스크롤 진행률(0~1). React state가 아니다. 스크롤 중에 React가 다시 렌더링하지 않도록
 * 카메라는 매 프레임 이 값을 읽고, 진행 막대는 구독해서 DOM을 직접 고친다.
 */
export const scrollState = { progress: 0 };

type Listener = (progress: number) => void;
const listeners = new Set<Listener>();

export function setProgress(progress: number): void {
  scrollState.progress = progress;
  listeners.forEach((listener) => listener(progress));
}

export function subscribeProgress(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
```

`src/lib/journey/clock.ts`:

```ts
/**
 * 시계 하나. Lenis, ScrollTrigger, R3F가 각자 requestAnimationFrame을 돌면 한 프레임씩 어긋나 떨린다.
 * GSAP ticker 하나가 매 프레임 스크롤 → 트리거 → 렌더 순서로 같은 시각을 넘긴다. (스펙 4절 "시계 하나")
 */

export interface Ticker {
  add(callback: (time: number) => void): void;
  remove(callback: (time: number) => void): void;
  lagSmoothing(threshold: number): void;
}

export interface ClockSteps {
  scroll(timeMs: number): void;
  triggers(): void;
  render(timeMs: number): void;
}

/** ticker는 초 단위 시각을 준다. 각 단계에는 requestAnimationFrame처럼 밀리초로 넘긴다. */
export function startClock(ticker: Ticker, steps: ClockSteps): () => void {
  const tick = (time: number) => {
    const timeMs = time * 1000;
    steps.scroll(timeMs);
    steps.triggers();
    steps.render(timeMs);
  };
  ticker.lagSmoothing(0);
  ticker.add(tick);
  return () => ticker.remove(tick);
}
```

`src/lib/journey/engine.ts`:

```ts
import type Lenis from "lenis";

/**
 * 여정 페이지의 스크롤 엔진 등록소. Lenis 인스턴스는 useJourneyScroll이 만들고,
 * 3D 렌더 단계는 Scene이 불러온 뒤 등록한다. 3D 코드를 이 파일에서 import하지 않아 지연 로딩이 유지된다.
 */
type ScrollEngine = Pick<Lenis, "stop" | "start" | "scrollTo">;

let lenis: ScrollEngine | null = null;
let locked = false;
let renderStep: ((timeMs: number) => void) | null = null;

export function setLenis(next: ScrollEngine | null): void {
  lenis = next;
  // 공유 주소로 들어와 상세 패널이 Lenis보다 먼저 열렸을 수 있다.
  if (lenis && locked) lenis.stop();
}

export function getLenis(): ScrollEngine | null {
  return lenis;
}

/** 상세 패널이 열린 동안 페이지 스크롤을 멈춘다. */
export function lockScroll(): void {
  locked = true;
  lenis?.stop();
}

export function unlockScroll(): void {
  locked = false;
  lenis?.start();
}

export function setRenderStep(step: ((timeMs: number) => void) | null): void {
  renderStep = step;
}

export function renderFrame(timeMs: number): void {
  renderStep?.(timeMs);
}
```

`src/lib/journey/hash.ts`:

```ts
import { projects } from "@/data/projects";
import type { RepoId } from "@/data/projects/types";

/** 상세 패널이 있는 프로젝트. 코코아톡은 캡션만 둔다(스펙 2절 "세 막"). */
export const DETAIL_SLUGS = projects.map((project) => project.slug).filter((slug) => slug !== "kokoa-clone");

export interface JourneyTarget {
  slug: string;
  repo?: RepoId;
}

/** "#pfplay" → { slug: "pfplay" }, "#pickcare/biz" → { slug: "pickcare", repo: "biz" }. 모르는 해시는 null. */
export function parseJourneyHash(hash: string): JourneyTarget | null {
  let raw: string;
  try {
    raw = decodeURIComponent(hash.replace(/^#/, ""));
  } catch {
    return null;
  }
  const [slug, repo] = raw.split("/");
  if (!slug || !DETAIL_SLUGS.includes(slug)) return null;
  const project = projects.find((item) => item.slug === slug);
  const match = project?.kind === "repos" ? project.repos.find((item) => item.id === repo) : undefined;
  return match ? { slug, repo: match.id } : { slug };
}

export function journeyHash(target: JourneyTarget): string {
  return target.repo ? `#${target.slug}/${target.repo}` : `#${target.slug}`;
}
```

`src/lib/journey/hashStore.ts`:

```ts
/**
 * URL 해시를 React 바깥 저장소처럼 다룬다. 상세 패널은 useSyncExternalStore로 구독한다.
 * 해시가 단일 원천이라 공유 주소, 뒤로 가기, 탭 전환이 한 경로로 처리된다.
 */
const CHANGE = "journey:hashchange";

export function subscribeHash(callback: () => void): () => void {
  window.addEventListener("hashchange", callback);
  window.addEventListener(CHANGE, callback);
  return () => {
    window.removeEventListener("hashchange", callback);
    window.removeEventListener(CHANGE, callback);
  };
}

export function getHash(): string {
  return window.location.hash;
}

export function getServerHash(): string {
  return "";
}

function urlWith(hash: string): string {
  return `${window.location.pathname}${window.location.search}${hash}`;
}

/** 기록을 하나 남기고 해시를 바꾼다. 브라우저 뒤로 가기로 되돌릴 수 있다. */
export function pushHash(hash: string): void {
  window.history.pushState(window.history.state, "", urlWith(hash));
  window.dispatchEvent(new Event(CHANGE));
}

/** 기록을 남기지 않고 해시를 바꾼다. 탭 전환이나 공유 주소로 열린 패널을 닫을 때 쓴다. */
export function replaceHash(hash: string): void {
  window.history.replaceState(window.history.state, "", urlWith(hash));
  window.dispatchEvent(new Event(CHANGE));
}
```

`src/lib/journey/webgl.ts`:

```ts
let supported: boolean | null = null;

/** WebGL2를 쓸 수 있는가. 한 번만 확인하고, 확인용 컨텍스트는 바로 놓아준다. */
export function hasWebGL2(): boolean {
  if (supported === null) {
    try {
      const gl = document.createElement("canvas").getContext("webgl2");
      supported = gl !== null;
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch {
      supported = false;
    }
  }
  return supported;
}
```

- [ ] **Step 5: 테스트가 통과하는지 확인한다**

Run: `rtk proxy npx vitest run src/lib/journey`
Expected: PASS — damp 3, scrollState 1, clock 3, engine 3, hash 7, timeline 10 (총 27)

- [ ] **Step 6: 타입·린트**

Run: `rtk proxy npm run typecheck` → exit 0
Run: `rtk proxy npx eslint src/lib/journey` → 에러 없음

- [ ] **Step 7: 변경 정리와 커밋 메시지 초안 제출 (커밋하지 않음)**

| 파일 | 내용 |
|---|---|
| `package.json`, `package-lock.json` | `gsap` 3.15.0, `lenis` 1.3.26 |
| `src/lib/journey/{damp,scrollState,clock,engine,hash}.ts` + 테스트 | 감쇠, 스크롤 상태, 시계, 엔진 등록소, 해시 |
| `src/lib/journey/{hashStore,webgl}.ts` | 해시 구독, WebGL2 확인 |

```
feat: 여정 스크롤 런타임 기반 모듈

- Lenis·ScrollTrigger·3D가 각자 프레임을 돌면 어긋나 떨리므로 시계 하나가 정해진 순서로 호출하게 했다
- 감쇠를 프레임 간격으로 계산해 60Hz와 120Hz 화면에서 카메라가 같은 속도로 움직이게 했다
- 3D 코드를 엔진 등록소에서 import하지 않아 three가 지연 로딩되는 구조를 유지했다
- 상세 패널 상태를 URL 해시 하나에 두어 공유 주소, 뒤로 가기, 탭 전환이 한 경로로 처리되게 했다
```

---

### Task 5: 본문 페이지

**Files:**
- Create: `src/components/journey/JourneyContent.tsx`
- Create: `src/components/journey/EmailCopy.tsx`
- Create: `src/app/journey/page.tsx`
- Create: `e2e/journey.e2e.ts`

**Interfaces:**
- Consumes: `STOPS`(Task 3), `DETAIL_SLUGS`·`journeyHash`(Task 4), `projects`, `sortedPosts`, `renderInline`
- Produces:
  - DOM 계약: 본문 래퍼 `[data-journey-page]`, 정류장 섹션 `section#stop-<id>[data-stop=<id>]`(높이 `length × 100svh`), 상세 링크 `a[data-journey-detail]`(`href`는 `journeyHash` 결과)
  - `EmailCopy({ email })`

- [ ] **Step 1: 실패하는 e2e 테스트를 쓴다**

`e2e/journey.e2e.ts`:

```ts
import { expect, test, type Page } from "@playwright/test";

// 여정 페이지 동작 테스트. 정류장 순서는 src/lib/journey/timeline.ts의 STOPS와 같다.
const STOP_IDS = [
  "intro",
  "act-1",
  "kokoa-clone",
  "todo-app",
  "eutcha",
  "act-2",
  "stock2u",
  "tix2u",
  "pfplay",
  "act-3",
  "pickcare",
  "ending",
];
const EMAIL = "one31798883@gmail.com";

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

test("정류장 12개가 순서대로 있다", async ({ page }) => {
  await page.goto("/journey");
  const ids = await page.locator("[data-stop]").evaluateAll((sections) =>
    sections.map((section) => section.getAttribute("data-stop")),
  );
  expect(ids).toEqual(STOP_IDS);
});

test("End 키로 엔딩에 닿고 연락처와 최근 글 3개가 보인다", async ({ page }) => {
  await page.goto("/journey");
  await page.keyboard.press("End");
  await expect(page.getByText(EMAIL)).toBeInViewport();
  await expect(page.locator("#stop-ending li")).toHaveCount(3);
});

test("이메일 복사 버튼", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/journey");
  await page.keyboard.press("End");
  await page.getByRole("button", { name: "이메일 복사" }).click();
  await expect(page.getByRole("button", { name: "복사했습니다" })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(EMAIL);
});

test("코코아톡에는 상세 링크가 없고 나머지 프로젝트에는 있다", async ({ page }) => {
  await page.goto("/journey");
  await expect(page.locator("#stop-kokoa-clone a[data-journey-detail]")).toHaveCount(0);
  for (const id of ["todo-app", "eutcha", "stock2u", "tix2u", "pfplay"]) {
    await expect(page.locator(`#stop-${id} a[data-journey-detail]`)).toHaveAttribute("href", `#${id}`);
  }
  await expect(page.locator("#stop-pickcare a[data-journey-detail]")).toHaveCount(5);
});

test("페이지를 끝까지 지나가도 콘솔 에러가 없다", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/journey");
  await page.keyboard.press("End");
  await expect(page.getByText(EMAIL)).toBeInViewport();
  expect(errors).toEqual([]);
});
```

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts`
Expected: FAIL — `/journey`가 404라 정류장이 없다

- [ ] **Step 2: `src/components/journey/EmailCopy.tsx`를 만든다**

```tsx
"use client";

import { useRef, useState } from "react";

// 클립보드 권한이 없으면 주소를 선택해 두어 직접 복사할 수 있게 한다.
export function EmailCopy({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);
  const textRef = useRef<HTMLSpanElement>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const node = textRef.current;
      if (node) window.getSelection()?.selectAllChildren(node);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span ref={textRef} className="font-mono text-lg text-zinc-100">
        {email}
      </span>
      <button
        type="button"
        onClick={copy}
        className="rounded-md border border-white/20 px-3 py-1.5 text-sm text-zinc-100 transition-colors hover:bg-white/10"
      >
        {copied ? "복사했습니다" : "이메일 복사"}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: `src/components/journey/JourneyContent.tsx`를 만든다**

```tsx
import Image from "next/image";
import Link from "next/link";
import { sortedPosts } from "@/data/posts";
import { projects } from "@/data/projects";
import type { Project, RepoId } from "@/data/projects/types";
import { renderInline } from "@/lib/inline";
import { DETAIL_SLUGS, journeyHash } from "@/lib/journey/hash";
import { STOPS, type Stop } from "@/lib/journey/timeline";
import { EmailCopy } from "./EmailCopy";

const EMAIL = "one31798883@gmail.com";
const GITHUB_URL = "https://github.com/Ash8382";

// 막 제목과 기간은 스펙 2절 "세 막" 표를 따른다. 설명 문장은 넣지 않는다(사용자 결정).
const ACTS = {
  1: { title: "1막 · 시작", period: "2023.04 ~ 2023.10" },
  2: { title: "2막 · 협업", period: "2023.09 ~ 2025.02" },
  3: { title: "3막 · 현재", period: "2025.09 ~" },
} as const;

// 움직이는 캔버스 위에서 backdrop-filter(흐림)는 매 프레임 GPU 재합성을 일으켜 스크롤을 끊는다. 반투명 단색만 쓴다.
const PANEL = "pointer-events-auto rounded-xl border border-white/10 bg-zinc-950/85 p-6 text-zinc-100 shadow-2xl";
const DETAIL_LINK =
  "mt-4 inline-flex items-center gap-1 text-sm font-medium text-sky-300 underline-offset-4 hover:underline";

const PROJECT_STOPS = STOPS.filter((stop) => stop.kind === "project");

function projectOf(stop: Stop): Project {
  const project = projects.find((item) => item.slug === stop.slug);
  if (!project) throw new Error(`정류장 ${stop.id}의 프로젝트가 없습니다`);
  return project;
}

/** 오브젝트 반대편에 글을 둔다. 짝수 번째 프로젝트는 오브젝트가 왼쪽이라 글이 오른쪽(timeline.ts focusPoint와 같은 규칙). */
function panelSide(stop: Stop): string {
  return PROJECT_STOPS.indexOf(stop) % 2 === 0 ? "ml-auto" : "mr-auto";
}

function actOf(stop: Stop): 1 | 2 | 3 {
  if (stop.act === 0) throw new Error(`막 정류장 ${stop.id}에 막 번호가 없습니다`);
  return stop.act;
}

function DetailLink({ slug, repo }: { slug: string; repo?: RepoId }) {
  return (
    <a href={journeyHash({ slug, repo })} data-journey-detail className={DETAIL_LINK}>
      자세히 보기 →
    </a>
  );
}

function StackChips({ stack }: { stack: string[] }) {
  return (
    <ul className="mt-3 flex flex-wrap gap-1.5">
      {stack.map((tech) => (
        <li key={tech} className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-zinc-200">
          {tech}
        </li>
      ))}
    </ul>
  );
}

function IntroStop() {
  return (
    <div className="container flex h-full items-center">
      <div className={`${PANEL} max-w-xl`}>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">A Journey Through Code</h1>
        <p aria-hidden className="mt-6 text-2xl text-zinc-400">
          ↓
        </p>
      </div>
    </div>
  );
}

function ActStop({ act }: { act: 1 | 2 | 3 }) {
  const info = ACTS[act];
  return (
    <div className="container flex h-full items-center justify-center">
      <div className={`${PANEL} text-center`}>
        <p className="font-mono text-xs tracking-[0.2em] text-zinc-400">{info.period}</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{info.title}</h2>
      </div>
    </div>
  );
}

/** 1막: 지나가며 보는 캡션 */
function CaptionStop({ stop }: { stop: Stop }) {
  const project = projectOf(stop);
  return (
    <div className="container flex h-full items-center">
      <div className={`${PANEL} max-w-sm ${panelSide(stop)}`}>
        <p className="text-xs text-zinc-400">{project.period}</p>
        <h3 className="mt-1 text-xl font-semibold">{project.title}</h3>
        <p className="mt-2 text-sm text-zinc-300">{renderInline(project.summary)}</p>
        {DETAIL_SLUGS.includes(project.slug) && <DetailLink slug={project.slug} />}
      </div>
    </div>
  );
}

/** 2막: 멈춰서 보는 전시 구역. 섹션 높이 동안 패널이 화면에 머문다(sticky). */
function ExhibitStop({ stop }: { stop: Stop }) {
  const project = projectOf(stop);
  const thumbnail = project.screens[0];
  return (
    <div className="container sticky top-24 flex">
      <div className={`${PANEL} max-w-md ${panelSide(stop)}`}>
        <p className="text-xs text-zinc-400">
          {project.period} · {project.team}
        </p>
        <h3 className="mt-1 text-2xl font-semibold">{project.title}</h3>
        <p className="mt-2 text-zinc-300">{renderInline(project.summary)}</p>
        <StackChips stack={project.stack} />
        {thumbnail && (
          // 썸네일이 작은 글(Stock2U·Tix2U는 폭 약 720px)도 레티나에서 선명하도록 원본 폭의 절반까지만 키운다.
          <Image
            src={thumbnail.src}
            alt={thumbnail.alt}
            width={thumbnail.width}
            height={thumbnail.height}
            sizes="360px"
            className="mt-4 h-auto w-full rounded-lg border border-white/10"
            style={{ maxWidth: Math.min(360, thumbnail.width / 2) }}
          />
        )}
        <DetailLink slug={project.slug} />
      </div>
    </div>
  );
}

/** 3막: PiCKCARE 전시실. 위에 머무는 소개와, 화면 하나마다 하나씩 지나가는 저장소 5개 */
function HallStop({ stop }: { stop: Stop }) {
  const project = projectOf(stop);
  if (project.kind !== "repos") throw new Error("전시실은 저장소 구조 글이어야 합니다");
  return (
    <>
      <div className="container sticky top-20 z-10">
        <div className={`${PANEL} max-w-md py-4`}>
          <p className="text-xs text-zinc-400">
            {project.period} · {project.team}
          </p>
          <h3 className="mt-1 text-2xl font-semibold">{project.title}</h3>
          <p className="mt-2 text-sm text-zinc-300">{renderInline(project.summary)}</p>
        </div>
      </div>
      <div className="absolute inset-x-0 top-0">
        {project.repos.map((repo) => (
          <div key={repo.id} className="container flex items-end pb-[12svh]" style={{ height: "100svh" }}>
            <div className={`${PANEL} ml-auto max-w-sm`}>
              <p className="font-mono text-sm text-amber-300">{repo.id}</p>
              <p className="mt-1 font-mono text-xs text-zinc-400">{repo.name}</p>
              <p className="mt-2 text-sm text-zinc-200">{renderInline(repo.tagline)}</p>
              <DetailLink slug={project.slug} repo={repo.id} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function EndingStop() {
  const recent = sortedPosts.filter((post) => post.category === "post").slice(0, 3);
  return (
    <div className="container flex h-full items-end pb-[10svh]">
      <div className={`${PANEL} w-full max-w-2xl`}>
        <h2 className="text-3xl font-bold tracking-tight">연락처</h2>
        <div className="mt-6">
          <EmailCopy email={EMAIL} />
        </div>
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-2 text-sm text-zinc-300 transition-colors hover:text-white"
        >
          GitHub ↗
        </a>
        <h3 className="mt-8 text-sm font-semibold text-zinc-400">최근 글</h3>
        <ul className="mt-3 space-y-2">
          {recent.map((post) => (
            <li key={post.slug}>
              <Link href={`/blog/${post.slug}`} className="group flex items-baseline justify-between gap-4">
                <span className="group-hover:underline">{post.title}</span>
                <span className="shrink-0 text-xs text-zinc-500">{post.date}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function StopBody({ stop }: { stop: Stop }) {
  switch (stop.kind) {
    case "intro":
      return <IntroStop />;
    case "act":
      return <ActStop act={actOf(stop)} />;
    case "project":
      return stop.pin ? <ExhibitStop stop={stop} /> : <CaptionStop stop={stop} />;
    case "hall":
      return <HallStop stop={stop} />;
    case "ending":
      return <EndingStop />;
  }
}

/**
 * 여정 본문. 3D가 없어도 그대로 읽히는 진짜 HTML이다.
 * 섹션은 클릭이 뒤의 캔버스로 가도록 pointer-events를 끄고, 패널만 켠다.
 */
export function JourneyContent() {
  return (
    <div data-journey-page className="pointer-events-none relative z-10">
      {STOPS.map((stop) => (
        <section
          key={stop.id}
          id={`stop-${stop.id}`}
          data-stop={stop.id}
          className="relative"
          style={{ height: `${stop.length * 100}svh` }}
        >
          <StopBody stop={stop} />
        </section>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: `src/app/journey/page.tsx`를 만든다**

```tsx
import type { Metadata } from "next";
import { JourneyContent } from "@/components/journey/JourneyContent";

export const metadata: Metadata = {
  title: "Journey - 이준현",
  description: "A Journey Through Code",
};

export default function JourneyPage() {
  return <JourneyContent />;
}
```

- [ ] **Step 5: e2e가 통과하는지 확인한다**

Run: `lsof -i :3100` → 출력 없음 확인
Run: `rtk proxy npx playwright test e2e/journey.e2e.ts`
Expected: `10 passed` (5개 × desktop·mobile)

- [ ] **Step 6: 블로그·타입·린트**

Run: `rtk proxy npx playwright test e2e/blog-projects.e2e.ts` → `14 passed`
Run: `rtk proxy npm run typecheck` → exit 0
Run: `rtk proxy npx eslint src/components/journey src/app/journey e2e/journey.e2e.ts` → 에러 없음

- [ ] **Step 7: 변경 정리와 커밋 메시지 초안 제출 (커밋하지 않음)**

| 파일 | 내용 |
|---|---|
| `src/components/journey/JourneyContent.tsx` | 정류장별 본문 |
| `src/components/journey/EmailCopy.tsx` | 이메일 복사 |
| `src/app/journey/page.tsx` | `/journey` 경로 |
| `e2e/journey.e2e.ts` | 정류장 순서, 엔딩, 이메일 복사, 상세 링크, 콘솔 에러 |

```
feat: 여정 페이지 본문

- 3D가 없어도 모든 글이 읽히도록 본문을 서버에서 렌더링하는 진짜 HTML로 만들었다
- 정류장 목록에서 섹션 높이를 계산해 카메라 경로와 글의 위치가 같은 원천을 쓴다
- 상세 링크를 해시 주소로 만들어 3D 없이도 공유 주소가 성립하게 했다
```

---

### Task 6: 스크롤 엔진과 진행 막대

**Files:**
- Create: `src/components/journey/useJourneyScroll.ts`
- Create: `src/components/journey/ProgressRail.tsx`
- Create: `src/components/journey/JourneyStage.tsx`
- Modify: `src/app/journey/page.tsx`
- Modify: `e2e/journey.e2e.ts` (테스트 추가)

**Interfaces:**
- Consumes: `startClock`, `setLenis`·`getLenis`·`renderFrame`, `setProgress`·`subscribeProgress`·`scrollState`, `rangeOf`
- Produces: `JourneyStage()` — 이후 Task 7(3D), Task 8(상세)이 이 컴포넌트에 붙는다. 진행 막대 버튼의 접근 이름은 "1막으로 이동", "2막으로 이동", "3막으로 이동", "연락처로 이동"

- [ ] **Step 1: 실패하는 e2e 테스트를 추가한다**

`e2e/journey.e2e.ts` 끝에 추가:

```ts
test("진행 막대로 3막에 바로 간다", async ({ page }) => {
  await page.goto("/journey");
  await page.getByRole("button", { name: "3막으로 이동" }).click();
  await expect(page.locator("#stop-act-3")).toBeInViewport();
});

test("창 크기가 바뀌어도 끝까지 스크롤된다", async ({ page }) => {
  await page.goto("/journey");
  await page.setViewportSize({ width: 900, height: 640 });
  await page.keyboard.press("End");
  await expect(page.getByText(EMAIL)).toBeInViewport();
});
```

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts -g "진행 막대"`
Expected: FAIL — "3막으로 이동" 버튼이 없다

- [ ] **Step 2: `src/components/journey/useJourneyScroll.ts`를 만든다**

```ts
"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { useEffect } from "react";
import { startClock } from "@/lib/journey/clock";
import { renderFrame, setLenis } from "@/lib/journey/engine";
import { setProgress } from "@/lib/journey/scrollState";

/**
 * 부드러운 스크롤(Lenis), 스크롤 진행률(ScrollTrigger), 3D 렌더를 GSAP ticker 하나에 묶는다.
 * 스크롤 위치의 원천은 브라우저 기본 스크롤이라 키보드·찾기·접근성이 그대로 동작한다.
 * 터치는 Lenis 기본값(syncTouch: false)대로 OS 관성을 쓰고, 움직임 줄이기 설정은 Lenis가 존중한다.
 */
export function useJourneyScroll(): void {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const lenis = new Lenis({ autoRaf: false });
    setLenis(lenis);

    const trigger = ScrollTrigger.create({
      trigger: "[data-journey-page]",
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => setProgress(self.progress),
    });
    setProgress(trigger.progress);

    const stopClock = startClock(
      {
        add: (callback) => {
          gsap.ticker.add(callback);
        },
        remove: (callback) => {
          gsap.ticker.remove(callback);
        },
        lagSmoothing: (threshold) => {
          gsap.ticker.lagSmoothing(threshold);
        },
      },
      {
        scroll: (timeMs) => lenis.raf(timeMs),
        triggers: () => ScrollTrigger.update(),
        render: (timeMs) => renderFrame(timeMs),
      },
    );

    return () => {
      stopClock();
      trigger.kill();
      setLenis(null);
      lenis.destroy();
    };
  }, []);
}
```

- [ ] **Step 3: `src/components/journey/ProgressRail.tsx`를 만든다**

```tsx
"use client";

import { useEffect, useRef } from "react";
import { getLenis } from "@/lib/journey/engine";
import { scrollState, subscribeProgress } from "@/lib/journey/scrollState";
import { rangeOf } from "@/lib/journey/timeline";

// name은 스크린 리더가 읽는 버튼 이름이다(조사를 라벨마다 맞춘다).
const MARKS = [
  { id: "act-1", label: "1막", name: "1막으로 이동" },
  { id: "act-2", label: "2막", name: "2막으로 이동" },
  { id: "act-3", label: "3막", name: "3막으로 이동" },
  { id: "ending", label: "연락처", name: "연락처로 이동" },
].map((mark) => ({ ...mark, top: `${rangeOf(mark.id).start * 100}%` }));

function scrollToStop(id: string) {
  const lenis = getLenis();
  if (lenis) lenis.scrollTo(`#stop-${id}`);
  else document.getElementById(`stop-${id}`)?.scrollIntoView();
}

/** 진행 막대. 채움 정도는 React 렌더 없이 DOM을 직접 고친다(스크롤 중 렌더 금지). */
export function ProgressRail() {
  const fillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = (progress: number) => {
      if (fillRef.current) fillRef.current.style.transform = `scaleY(${progress})`;
    };
    update(scrollState.progress);
    return subscribeProgress(update);
  }, []);

  return (
    <nav aria-label="여정 진행" className="fixed right-3 top-1/2 z-20 h-64 -translate-y-1/2 sm:right-6">
      <div className="relative h-full w-px bg-white/15">
        <div ref={fillRef} className="absolute inset-0 origin-top bg-white/70" style={{ transform: "scaleY(0)" }} />
        {MARKS.map((mark) => (
          <button
            key={mark.id}
            type="button"
            onClick={() => scrollToStop(mark.id)}
            aria-label={mark.name}
            className="group absolute -left-2 flex h-4 w-4 -translate-y-1/2 items-center justify-center"
            style={{ top: mark.top }}
          >
            <span className="h-2 w-2 rounded-full bg-white/70 transition-colors group-hover:bg-white" />
            <span className="pointer-events-none absolute right-6 whitespace-nowrap text-xs text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              {mark.label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
}
```

- [ ] **Step 4: `src/components/journey/JourneyStage.tsx`를 만든다**

```tsx
"use client";

import { ProgressRail } from "./ProgressRail";
import { useJourneyScroll } from "./useJourneyScroll";

/** 여정 페이지의 클라이언트 진입점. 스크롤 엔진을 켜고 화면 위 요소를 얹는다. */
export function JourneyStage() {
  useJourneyScroll();
  return <ProgressRail />;
}
```

- [ ] **Step 5: `src/app/journey/page.tsx`에 붙인다**

파일 전체를 다음으로 교체한다.

```tsx
import type { Metadata } from "next";
import "lenis/dist/lenis.css";
import { JourneyContent } from "@/components/journey/JourneyContent";
import { JourneyStage } from "@/components/journey/JourneyStage";

export const metadata: Metadata = {
  title: "Journey - 이준현",
  description: "A Journey Through Code",
};

export default function JourneyPage() {
  return (
    <>
      <JourneyContent />
      <JourneyStage />
    </>
  );
}
```

- [ ] **Step 6: e2e가 통과하는지 확인한다**

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts`
Expected: `14 passed` (7개 × desktop·mobile)

- [ ] **Step 7: 블로그·타입·린트**

Run: `rtk proxy npx playwright test e2e/blog-projects.e2e.ts` → `14 passed`
Run: `rtk proxy npm run typecheck` → exit 0
Run: `rtk proxy npx eslint src/components/journey src/app/journey e2e/journey.e2e.ts` → 에러 없음

- [ ] **Step 8: 변경 정리와 커밋 메시지 초안 제출 (커밋하지 않음)**

| 파일 | 내용 |
|---|---|
| `src/components/journey/useJourneyScroll.ts` | Lenis·ScrollTrigger·시계 연결 |
| `src/components/journey/ProgressRail.tsx` | 진행 막대와 막 이동 |
| `src/components/journey/JourneyStage.tsx` | 클라이언트 진입점 |
| `src/app/journey/page.tsx` | 진입점과 Lenis 스타일 |
| `e2e/journey.e2e.ts` | 막 이동, 창 크기 변경 |

```
feat: 여정 스크롤 엔진과 진행 막대

- 휠 스크롤에 관성을 주되 원천은 브라우저 기본 스크롤로 두어 키보드·찾기·접근성을 지켰다
- 스크롤, 진행률 계산, 3D 렌더를 GSAP ticker 하나에 묶어 프레임이 어긋나지 않게 했다
- 진행 막대는 React 렌더 없이 DOM을 직접 고쳐 스크롤 중 렌더 비용을 없앴다
```

---

### Task 7: 3D 장면 골격

**Files:**
- Create: `src/components/journey/scene/Scene.tsx`
- Create: `src/components/journey/scene/CameraRig.tsx`
- Create: `src/components/journey/scene/PlaceholderCorridor.tsx`
- Modify: `src/components/journey/JourneyStage.tsx`
- Modify: `src/components/Background3D.tsx`
- Modify: `e2e/journey.e2e.ts` (테스트 추가)

**Interfaces:**
- Consumes: `cameraAt`·`focusPoint`·`pathPoint`·`PATH_LENGTH`·`STOPS`(Task 3), `damp3`·`scrollState`·`setRenderStep`·`hasWebGL2`(Task 4)
- Produces: `/journey`의 캔버스는 정확히 1개. Scene은 `export default`(동적 import 대상)

- [ ] **Step 1: 실패하는 e2e 테스트를 추가한다**

`e2e/journey.e2e.ts` 맨 위 import 아래(`const STOP_IDS` 위)에 추가:

```ts
// WebGL을 쓸 수 없는 기기를 흉내 낸다. 3D 없이도 본문과 상세가 동작해야 한다(스펙 5절).
async function disableWebGL(page: Page) {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      if (type === "webgl2" || type === "webgl") return null;
      return (original as (...args: unknown[]) => unknown).call(this, type, ...rest);
    } as typeof original;
  });
}
```

파일 끝에 추가:

```ts
test("캔버스는 여정 장면 하나뿐이다(사이트 별 배경이 꺼진다)", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/journey");
  await expect(page.locator("[data-journey-scene] canvas")).toHaveCount(1);
  await expect(page.locator("canvas")).toHaveCount(1);
  await page.keyboard.press("End");
  await expect(page.getByText(EMAIL)).toBeInViewport();
  expect(errors).toEqual([]);
});

test("WebGL이 없으면 3D 없이 본문과 진행 막대가 동작한다", async ({ page }) => {
  await disableWebGL(page);
  await page.goto("/journey");
  await expect(page.locator("canvas")).toHaveCount(0);
  await page.getByRole("button", { name: "연락처로 이동" }).click();
  await expect(page.getByText(EMAIL)).toBeInViewport();
});
```

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts -g "캔버스는 여정 장면"`
Expected: FAIL — `[data-journey-scene]`이 아직 없다(지금 있는 캔버스는 사이트 별 배경 하나다)

- [ ] **Step 2: `src/components/journey/scene/CameraRig.tsx`를 만든다**

```tsx
"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { Vector3 } from "three";
import { damp3 } from "@/lib/journey/damp";
import { scrollState } from "@/lib/journey/scrollState";
import { cameraAt } from "@/lib/journey/timeline";

// 스크롤이 정한 목표 자세를 매 프레임 감쇠로 따라간다. 감쇠는 프레임 간격으로 계산해 60Hz·120Hz에서 같은 속도다.
const POSITION_LAMBDA = 5;
const TARGET_LAMBDA = 6;

export function CameraRig() {
  const look = useRef<Vector3 | null>(null);

  useFrame((state, delta) => {
    const pose = cameraAt(scrollState.progress);
    if (!look.current) {
      // 첫 프레임은 목표 자세에 바로 놓는다. 원점에서 날아오는 연출을 막는다.
      look.current = new Vector3(...pose.target);
      state.camera.position.set(...pose.position);
    } else {
      damp3(state.camera.position, pose.position, POSITION_LAMBDA, delta);
      damp3(look.current, pose.target, TARGET_LAMBDA, delta);
    }
    state.camera.lookAt(look.current);
  });

  return null;
}
```

- [ ] **Step 3: `src/components/journey/scene/PlaceholderCorridor.tsx`를 만든다**

```tsx
"use client";

import { Line } from "@react-three/drei";
import { useMemo } from "react";
import { PATH_LENGTH, STOPS, focusPoint, pathPoint, type Vec3 } from "@/lib/journey/timeline";

// 2-2(시각 언어)에서 실제 회랑으로 바뀌는 임시 장면. 카메라 경로와 정류장 위치를 눈으로 확인하는 용도다.
const ACT_COLOR = { 0: "#71717a", 1: "#5bc0ff", 2: "#a1a1aa", 3: "#f5b942" } as const;
const HALF_WIDTH = 2.5;

export function PlaceholderCorridor() {
  const lines = useMemo(() => {
    const center: Vec3[] = [];
    const left: Vec3[] = [];
    const right: Vec3[] = [];
    for (let s = 0; s <= PATH_LENGTH + 10; s += 1) {
      const [x, , z] = pathPoint(s);
      center.push([x, 0, z]);
      left.push([x - HALF_WIDTH, 0, z]);
      right.push([x + HALF_WIDTH, 0, z]);
    }
    return { center, left, right };
  }, []);

  return (
    <group>
      <Line points={lines.center} color="#3f3f46" lineWidth={1} dashed dashSize={0.5} gapSize={0.5} />
      <Line points={lines.left} color="#52525b" lineWidth={1} />
      <Line points={lines.right} color="#52525b" lineWidth={1} />
      {STOPS.map((stop) => {
        const focus = focusPoint(stop);
        if (!focus) return null;
        const size = stop.kind === "hall" ? 1.6 : stop.act === 1 ? 0.5 : 0.9;
        return (
          <mesh key={stop.id} position={focus}>
            <icosahedronGeometry args={[size, 0]} />
            <meshBasicMaterial color={ACT_COLOR[stop.act]} wireframe />
          </mesh>
        );
      })}
    </group>
  );
}
```

- [ ] **Step 4: `src/components/journey/scene/Scene.tsx`를 만든다**

```tsx
"use client";

import { Canvas, advance } from "@react-three/fiber";
import { useEffect } from "react";
import { setRenderStep } from "@/lib/journey/engine";
import { cameraAt } from "@/lib/journey/timeline";
import { CameraRig } from "./CameraRig";
import { PlaceholderCorridor } from "./PlaceholderCorridor";

const START = cameraAt(0);

/**
 * 여정 3D 장면. R3F 자체 루프를 끄고(frameloop="never") 시계 하나가 advance로 그린다.
 * 이 파일과 scene/ 아래만 three·R3F를 import한다. JourneyStage가 동적으로 불러온다.
 */
export default function Scene() {
  useEffect(() => {
    setRenderStep((timeMs) => advance(timeMs));
    return () => setRenderStep(null);
  }, []);

  return (
    <div data-journey-scene className="fixed inset-0 z-0" aria-hidden>
      <Canvas frameloop="never" dpr={[1, 2]} camera={{ fov: 50, near: 0.1, far: 200, position: START.position }}>
        <color attach="background" args={["#09090b"]} />
        <CameraRig />
        <PlaceholderCorridor />
      </Canvas>
    </div>
  );
}
```

- [ ] **Step 5: `JourneyStage`에서 WebGL2가 있을 때만 장면을 불러온다**

`src/components/journey/JourneyStage.tsx` 전체를 다음으로 교체한다.

```tsx
"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";
import { hasWebGL2 } from "@/lib/journey/webgl";
import { ProgressRail } from "./ProgressRail";
import { useJourneyScroll } from "./useJourneyScroll";

// three·R3F는 이 동적 import 뒤에만 있다. WebGL2를 확인한 뒤에 불러와 다른 페이지 번들과 첫 화면을 가볍게 한다.
const Scene = dynamic(() => import("./scene/Scene"), { ssr: false });

function subscribeNothing() {
  return () => {};
}

/** 여정 페이지의 클라이언트 진입점. 스크롤 엔진을 켜고 화면 위 요소를 얹는다. */
export function JourneyStage() {
  useJourneyScroll();
  const webgl = useSyncExternalStore(subscribeNothing, hasWebGL2, () => false);
  return (
    <>
      {webgl && <Scene />}
      <ProgressRail />
    </>
  );
}
```

- [ ] **Step 6: `/journey`에서 사이트 별 배경을 끈다**

`src/components/Background3D.tsx` 맨 위 import에 `import { usePathname } from "next/navigation";`을 추가하고, `export function Background3D()`를 다음으로 바꾼다.

```tsx
export function Background3D() {
  const pathname = usePathname();
  // 여정 페이지는 자기 캔버스와 시계를 쓴다. 별 배경이 함께 돌면 WebGL 화면과 애니메이션 루프가 둘이 된다.
  if (pathname?.startsWith("/journey")) return null;
  return (
    <div className="fixed inset-0 -z-10 h-full w-full opacity-50 pointer-events-none">
      <Canvas camera={{ position: [0, 0, 1] }}>
        <Stars />
      </Canvas>
    </div>
  );
}
```

- [ ] **Step 7: e2e가 통과하는지 확인한다**

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts`
Expected: `18 passed` (9개 × desktop·mobile)

- [ ] **Step 8: 블로그·타입·린트·3D 지연 로딩 확인**

Run: `rtk proxy npx playwright test e2e/blog-projects.e2e.ts` → `14 passed`
Run: `rtk proxy npm run typecheck` → exit 0
Run: `rtk proxy npx eslint src/components/journey src/components/Background3D.tsx e2e/journey.e2e.ts` → 에러 없음

three가 `scene/` 밖에서 import되지 않는지 확인한다.

Run: `rtk proxy grep -rln "from \"three\"\|@react-three" src --include=*.ts --include=*.tsx`
Expected: `src/components/Background3D.tsx`와 `src/components/journey/scene/` 아래 파일만 나온다

- [ ] **Step 9: 변경 정리와 커밋 메시지 초안 제출 (커밋하지 않음)**

| 파일 | 내용 |
|---|---|
| `src/components/journey/scene/{Scene,CameraRig,PlaceholderCorridor}.tsx` | 3D 장면 골격 |
| `src/components/journey/JourneyStage.tsx` | WebGL2 확인 후 장면 지연 로딩 |
| `src/components/Background3D.tsx` | `/journey`에서 끔 |
| `e2e/journey.e2e.ts` | 캔버스 1개, WebGL 없는 기기 |

```
feat: 여정 3D 장면 골격

- R3F 자체 루프를 끄고 시계 하나가 그리게 해 스크롤과 카메라가 같은 프레임을 본다
- 카메라를 프레임 간격 기반 감쇠로 움직여 주사율과 무관하게 같은 속도로 따라가게 했다
- 별 배경을 여정 페이지에서 꺼 WebGL 화면과 애니메이션 루프가 둘이 되지 않게 했다
- three를 WebGL2 확인 뒤 동적으로 불러와 다른 페이지와 3D를 못 쓰는 기기의 비용을 없앴다
```

---

### Task 8: 상세 패널

**Files:**
- Create: `src/components/journey/ProjectDialog.tsx`
- Modify: `src/components/journey/JourneyStage.tsx`
- Modify: `e2e/journey.e2e.ts` (테스트 추가)

**Interfaces:**
- Consumes: `parseJourneyHash`·`journeyHash`(Task 4), `subscribeHash`·`getHash`·`getServerHash`·`pushHash`·`replaceHash`(Task 4), `lockScroll`·`unlockScroll`(Task 4), `isItemGroups`·`RepoId`(Task 1), `ProjectLinkIcon`, `renderInline`, `STOPS`
- Produces: 접근 이름이 프로젝트 제목인 `dialog`. PiCKCARE 탭은 `role="tab"`, 이름은 저장소 id. 닫기 버튼 이름 "닫기"

- [ ] **Step 1: 실패하는 e2e 테스트를 추가한다**

`e2e/journey.e2e.ts` 끝에 추가:

```ts
test("자세히 보기로 열고 ESC로 닫으면 포커스가 링크로 돌아온다", async ({ page }) => {
  await page.goto("/journey");
  const link = page.locator("#stop-pfplay a[data-journey-detail]");
  await link.click();
  await expect(page.getByRole("dialog", { name: "PFPlay" })).toBeVisible();
  await expect(page).toHaveURL(/#pfplay$/);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page).not.toHaveURL(/#/);
  await expect(link).toBeFocused();
});

test("브라우저 뒤로 가기로 닫힌다", async ({ page }) => {
  await page.goto("/journey");
  await page.locator("#stop-tix2u a[data-journey-detail]").click();
  await expect(page.getByRole("dialog", { name: "Tix2U" })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page).toHaveURL(/\/journey$/);
});

test("공유 주소로 열린 패널은 닫아도 /journey에 남는다", async ({ page }) => {
  await page.goto("/journey#stock2u");
  await expect(page.getByRole("dialog", { name: "Stock2U" })).toBeVisible();
  await page.getByRole("button", { name: "닫기" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page).toHaveURL(/\/journey$/);
});

test("PiCKCARE 공유 주소는 해당 탭을 열고, 탭을 바꾸면 주소가 바뀐다", async ({ page }) => {
  await page.goto("/journey#pickcare/biz");
  await expect(page.getByRole("dialog", { name: "PiCKCARE" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "biz" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel")).toContainText("pickcare-biz");
  await page.getByRole("tab", { name: "studio" }).click();
  await expect(page).toHaveURL(/#pickcare\/studio$/);
  await expect(page.getByRole("tabpanel")).toContainText("pickcare-studio");
});

test("열린 패널 위의 휠은 패널만 스크롤한다", async ({ page }) => {
  await page.goto("/journey#pickcare");
  const scroller = page.locator("dialog[open] [data-lenis-prevent]");
  await expect(scroller).toBeVisible();
  const pageScroll = await page.evaluate(() => window.scrollY);
  await scroller.hover();
  await page.mouse.wheel(0, 800);
  await expect.poll(() => scroller.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.scrollY)).toBe(pageScroll);
});

test("WebGL이 없어도 상세 패널이 열린다", async ({ page }) => {
  await disableWebGL(page);
  await page.goto("/journey#todo-app");
  await expect(page.locator("canvas")).toHaveCount(0);
  await expect(page.getByRole("dialog", { name: "Todo App" })).toBeVisible();
});
```

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts -g "자세히 보기로 열고"`
Expected: FAIL — 대화상자가 없다

- [ ] **Step 2: `src/components/journey/ProjectDialog.tsx`를 만든다**

```tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { ProjectLinkIcon } from "@/components/ProjectLinkIcon";
import { projects } from "@/data/projects";
import {
  isItemGroups,
  type Inline,
  type ItemGroup,
  type Project,
  type RepoId,
  type ReposProject,
  type Screen,
  type StandardProject,
} from "@/data/projects/types";
import { renderInline } from "@/lib/inline";
import { lockScroll, unlockScroll } from "@/lib/journey/engine";
import { journeyHash, parseJourneyHash } from "@/lib/journey/hash";
import { getHash, getServerHash, pushHash, replaceHash, subscribeHash } from "@/lib/journey/hashStore";
import { STOPS } from "@/lib/journey/timeline";

const TITLE_ID = "journey-dialog-title";
const CASE_PARTS = [
  ["problem", "PROBLEM"],
  ["solution", "SOLUTION"],
  ["result", "RESULT"],
] as const;

/** 1막 프로젝트는 화면과 개요만 보여주는 가벼운 상세다(스펙 2절). */
function isLight(slug: string): boolean {
  return STOPS.some((stop) => stop.slug === slug && stop.act === 1);
}

/**
 * 상세 패널. URL 해시(#pfplay, #pickcare/biz)가 단일 원천이다.
 * - "자세히 보기"는 기록을 하나 남기고 연다 → 뒤로 가기로 닫힌다
 * - 공유 주소로 들어와 열린 패널은 기록 없이 닫는다 → 사이트를 떠나지 않는다
 * - 열린 동안 페이지 스크롤을 멈추고 패널 안에서만 스크롤한다
 */
export function ProjectDialog() {
  const hash = useSyncExternalStore(subscribeHash, getHash, getServerHash);
  const target = parseJourneyHash(hash);
  const slug = target?.slug ?? null;
  const project = slug ? (projects.find((item) => item.slug === slug) ?? null) : null;

  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const pushedByUs = useRef(false);

  // "자세히 보기" 클릭을 가로채 기록을 하나 남기고 연다.
  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest("a[data-journey-detail]") : null;
      if (!(link instanceof HTMLAnchorElement)) return;
      event.preventDefault();
      returnFocus.current = link;
      pushedByUs.current = true;
      pushHash(link.hash);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // 공유 주소(/journey#pfplay)로 들어오면 해당 정류장으로 먼저 옮긴다.
  useEffect(() => {
    const initial = parseJourneyHash(window.location.hash);
    if (initial) document.getElementById(`stop-${initial.slug}`)?.scrollIntoView({ block: "start", behavior: "instant" });
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (slug && !dialog.open) {
      lockScroll();
      dialog.showModal();
    } else if (!slug && dialog.open) {
      dialog.close();
      unlockScroll();
      pushedByUs.current = false;
      returnFocus.current?.focus({ preventScroll: true });
      returnFocus.current = null;
    }
  }, [slug]);

  function requestClose() {
    if (pushedByUs.current) window.history.back();
    else replaceHash("");
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={TITLE_ID}
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      onClick={(event) => {
        // 패널 바깥(배경막)을 누르면 닫는다. 안쪽 내용은 패널을 가득 채워 여기에 닿지 않는다.
        if (event.target === event.currentTarget) requestClose();
      }}
      className="m-0 ml-auto h-dvh max-h-none w-full max-w-xl border-0 border-l border-white/10 bg-zinc-950 p-0 text-zinc-100 backdrop:bg-black/60"
    >
      {project && (
        <div data-lenis-prevent className="h-full overflow-y-auto overscroll-contain">
          <div className="sticky top-0 z-10 flex justify-end bg-zinc-950/95 px-4 py-3">
            <button
              type="button"
              onClick={requestClose}
              aria-label="닫기"
              className="rounded-md px-2 py-1 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              ✕
            </button>
          </div>
          <div className="px-6 pb-12 sm:px-8">
            <DetailHeader project={project} />
            {project.kind === "repos" ? (
              <ReposDetail project={project} repoId={target?.repo} />
            ) : (
              <StandardDetail project={project} light={isLight(project.slug)} />
            )}
            <Link
              href={`/blog/${project.slug}`}
              className="mt-10 inline-flex text-sm font-medium text-sky-300 underline-offset-4 hover:underline"
            >
              블로그 원문 보기 →
            </Link>
          </div>
        </div>
      )}
    </dialog>
  );
}

function DetailHeader({ project }: { project: Project }) {
  return (
    <header>
      <p className="text-xs text-zinc-400">
        {project.period} · {project.team}
      </p>
      <h2 id={TITLE_ID} className="mt-1 text-3xl font-bold tracking-tight">
        {project.title}
      </h2>
      <p className="mt-3 text-zinc-300">{renderInline(project.summary)}</p>
      <ul className="mt-4 flex flex-wrap gap-1.5">
        {project.stack.map((tech) => (
          <li key={tech} className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs">
            {tech}
          </li>
        ))}
      </ul>
      {project.links.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-4">
          {project.links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-sm text-zinc-300 transition-colors hover:text-white"
            >
              <ProjectLinkIcon kind={link.kind} />
              {link.label}
            </a>
          ))}
        </div>
      )}
    </header>
  );
}

/** 원본 폭의 절반까지만 키워 레티나에서도 선명하게 보인다(썸네일이 작은 Stock2U·Tix2U 포함). */
function Screens({ screens }: { screens: Screen[] }) {
  if (screens.length === 0) return null;
  return (
    <section className="mt-6 space-y-3" aria-label="제품 화면">
      {screens.map((screen) => (
        <Image
          key={screen.src}
          src={screen.src}
          alt={screen.alt}
          width={screen.width}
          height={screen.height}
          sizes="(min-width: 640px) 512px, 100vw"
          className="h-auto w-full rounded-lg border border-white/10"
          style={{ maxWidth: screen.width / 2 }}
        />
      ))}
    </section>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">{title}</h3>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-zinc-200">{children}</div>
    </section>
  );
}

function ItemList({ items }: { items: Inline[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5">
      {items.map((item) => (
        <li key={item}>{renderInline(item)}</li>
      ))}
    </ul>
  );
}

function RoleList({ role }: { role: Inline[] | ItemGroup[] }) {
  if (!isItemGroups(role)) return <ItemList items={role} />;
  return (
    <div className="space-y-4">
      {role.map((group) => (
        <div key={group.title}>
          <p className="font-medium">{group.title}</p>
          <ItemList items={group.items} />
        </div>
      ))}
    </div>
  );
}

function StandardDetail({ project, light }: { project: StandardProject; light: boolean }) {
  return (
    <>
      <Screens screens={project.screens} />
      {light ? (
        <Section title="개요">
          {project.overview.map((paragraph) => (
            <p key={paragraph}>{renderInline(paragraph)}</p>
          ))}
        </Section>
      ) : (
        <>
          {project.role && (
            <Section title="담당 역할">
              {project.roleIntro && <p>{renderInline(project.roleIntro)}</p>}
              <RoleList role={project.role} />
            </Section>
          )}
          {project.achievements && (
            <Section title="성과 및 배운 점">
              <ItemList items={project.achievements} />
            </Section>
          )}
        </>
      )}
    </>
  );
}

function ReposDetail({ project, repoId }: { project: ReposProject; repoId?: RepoId }) {
  const active = project.repos.find((repo) => repo.id === repoId) ?? project.repos[0];
  return (
    <>
      <div role="tablist" aria-label="저장소" className="mt-6 flex flex-wrap gap-1 border-b border-white/10">
        {project.repos.map((repo) => {
          const selected = repo.id === active.id;
          return (
            <button
              key={repo.id}
              type="button"
              role="tab"
              id={`journey-tab-${repo.id}`}
              aria-selected={selected}
              aria-controls="journey-tabpanel"
              onClick={() => replaceHash(journeyHash({ slug: project.slug, repo: repo.id }))}
              className={`-mb-px border-b-2 px-3 py-2 font-mono text-xs transition-colors ${
                selected ? "border-amber-300 text-white" : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {repo.id}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" id="journey-tabpanel" aria-labelledby={`journey-tab-${active.id}`} key={active.id} className="mt-4">
        <p className="font-mono text-sm text-zinc-400">{active.name}</p>
        <p className="mt-1 text-zinc-200">{renderInline(active.tagline)}</p>
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {active.stack.map((tech) => (
            <li key={tech} className="rounded border border-white/10 px-2 py-0.5 font-mono text-xs text-zinc-400">
              {tech}
            </li>
          ))}
        </ul>
        <Screens screens={active.screens} />
        <div className="mt-6 space-y-3">
          {active.cases.map((item, index) => (
            <details key={item.title} open={index === 0} className="rounded-lg border border-white/10 bg-white/5">
              <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">{item.title}</summary>
              <div className="space-y-4 px-4 pb-4 text-sm leading-relaxed">
                {CASE_PARTS.map(([key, label]) => (
                  <div key={key}>
                    <p className="font-mono text-[11px] tracking-[0.12em] text-zinc-500">## {label}</p>
                    <ul className="mt-1.5 space-y-1.5">
                      {item[key].map((line) => (
                        <li key={line} className={key === "result" ? "text-emerald-300" : "text-zinc-200"}>
                          {renderInline(line)}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 3: `JourneyStage`에 붙인다**

`src/components/journey/JourneyStage.tsx`에서 import 목록에 `import { ProjectDialog } from "./ProjectDialog";`를 추가하고(`ProgressRail` import 아래), 반환 부분을 다음으로 바꾼다.

```tsx
  return (
    <>
      {webgl && <Scene />}
      <ProgressRail />
      <ProjectDialog />
    </>
  );
```

- [ ] **Step 4: e2e가 통과하는지 확인한다**

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts`
Expected: `30 passed` (15개 × desktop·mobile)

- [ ] **Step 5: 블로그·타입·린트**

Run: `rtk proxy npx playwright test e2e/blog-projects.e2e.ts` → `14 passed`
Run: `rtk proxy npm run typecheck` → exit 0
Run: `rtk proxy npx eslint src/components/journey e2e/journey.e2e.ts` → 에러 없음

- [ ] **Step 6: 변경 정리와 커밋 메시지 초안 제출 (커밋하지 않음)**

| 파일 | 내용 |
|---|---|
| `src/components/journey/ProjectDialog.tsx` | 상세 패널 |
| `src/components/journey/JourneyStage.tsx` | 상세 패널 연결 |
| `e2e/journey.e2e.ts` | 열기·닫기·포커스·뒤로 가기·공유 주소·탭·패널 스크롤·WebGL 없음 |

```
feat: 여정 상세 패널

- 해시를 단일 원천으로 두어 공유 주소로 특정 프로젝트·저장소 탭을 바로 열 수 있게 했다
- "자세히 보기"는 기록을 남겨 뒤로 가기로 닫히고, 공유 주소로 열린 패널은 기록 없이 닫아 사이트를 떠나지 않는다
- 네이티브 dialog로 포커스 가두기와 배경 비활성을 브라우저에 맡기고, 닫으면 연 링크로 포커스를 돌린다
- PiCKCARE는 저장소 탭과 케이스 아코디언으로 30초 안에 훑을 수 있게 했다
```

---

### Task 9: 사이트 연결 (링크, 헤더 흐림, 블로그 기준 갱신)

**Files:**
- Modify: `src/components/Header.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/about/page.tsx`
- Modify: `src/app/globals.css`
- Modify: `e2e/journey.e2e.ts` (테스트 추가)
- 로컬 산출물: `e2e/__screenshots__/blog-projects.e2e.ts/**` 기준 갱신(git 무시 대상)

**Interfaces:**
- Consumes: `/journey` 경로
- Produces: 헤더·홈·About에서 `/journey`로 가는 링크(이름 "Journey")

- [ ] **Step 1: 실패하는 e2e 테스트를 추가한다**

`e2e/journey.e2e.ts` 끝에 추가:

```ts
test("헤더의 Journey 링크로 들어오고, 여정 페이지에서는 헤더 흐림이 꺼진다", async ({ page }) => {
  await page.goto("/");
  await page.locator("header").getByRole("link", { name: "Journey", exact: true }).click();
  await expect(page).toHaveURL(/\/journey$/);
  await expect(page.locator("[data-stop]").first()).toBeVisible();
  expect(await page.locator("header").evaluate((element) => getComputedStyle(element).backdropFilter)).toBe("none");
});
```

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts -g "헤더의 Journey"`
Expected: FAIL — 헤더에 Journey 링크가 없다

- [ ] **Step 2: 헤더에 링크를 넣는다**

`src/components/Header.tsx`에서 `소개` 링크 블록 바로 아래(`{LOUNGE_ENABLED && (` 위)에 추가:

```tsx
            <Link
              href="/journey"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              Journey
            </Link>
```

- [ ] **Step 3: 홈 소개 링크 줄과 About에 링크를 넣는다**

`src/app/page.tsx`에서 About 링크(`About`이 들어 있는 `</Link>`) 바로 아래에 추가:

```tsx
            <span className="text-border">|</span>
            <Link
              href="/journey"
              className="hover:text-foreground transition-colors underline underline-offset-4"
            >
              Journey
            </Link>
```

`src/app/about/page.tsx`에서 "올라운더 프론트엔드 개발자입니다." 문단(`</p>`로 끝나는 마지막 문단) 바로 아래, 같은 `prose` 블록 안에 추가:

```tsx
            <p>
              지금까지 만든 프로젝트는{" "}
              <Link href="/journey" className="font-medium text-foreground underline underline-offset-4">
                Journey
              </Link>
              에서 시간순으로 걸으며 볼 수 있습니다.
            </p>
```

`src/app/about/page.tsx` 맨 위 import에 `import Link from "next/link";`가 없으면 추가한다.

- [ ] **Step 4: 여정 페이지에서 헤더 흐림을 끈다**

`src/app/globals.css` 맨 끝에 추가:

```css

/* 여정 페이지: 움직이는 3D 캔버스 위의 배경 흐림(backdrop-filter)은 매 프레임 GPU 재합성을 일으켜 스크롤을 끊는다. */
body:has([data-journey-page]) header {
  backdrop-filter: none;
  background-color: rgb(9 9 11 / 0.92);
}
```

- [ ] **Step 5: e2e가 통과하는지 확인한다**

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts`
Expected: `32 passed` (16개 × desktop·mobile)

- [ ] **Step 6: 블로그 기준을 헤더 변경에 맞춰 갱신한다 (검증 포함)**

헤더에 링크가 생겨 블로그 7개 글의 스크린샷 맨 위 조각이 바뀐다. 의도한 변경이므로 기준을 갱신하되, 헤더 말고는 아무것도 바뀌지 않았음을 먼저 증명한다.

Run: `rtk proxy npx playwright test e2e/blog-projects.e2e.ts`
Expected: 실패는 모두 `-0.png` 조각(헤더가 있는 첫 조각)의 픽셀 불일치여야 한다. 높이가 가장 먼저 비교되므로 `-height.txt` 불일치가 나오면 **멈추고 BLOCKED로 보고한다**(헤더 높이는 고정이라 바뀌면 안 된다). 픽셀 실패 뒤의 DOM·마크업·에러 비교는 이 실행에서는 보이지 않으므로, 아래 백업 비교로 확인한다.

백업을 만들고 갱신한다.

Run: `BACKUP=$(mktemp -d) && cp -R e2e/__screenshots__/blog-projects.e2e.ts "$BACKUP"/ && echo "$BACKUP"`
(출력된 경로를 다음 단계에 쓴다)

Run: `rtk proxy npx playwright test e2e/blog-projects.e2e.ts --update-snapshots`
Expected: `14 passed`

Run: `diff -r --exclude='*.png' "<위 백업 경로>/blog-projects.e2e.ts" e2e/__screenshots__/blog-projects.e2e.ts`
Expected: 출력 없음 (높이·DOM·마크업·에러 기준이 그대로다)

Read 도구로 `e2e/__screenshots__/blog-projects.e2e.ts/desktop/kokoa-clone-0.png`를 열어 헤더에 `Journey`가 보이고 본문은 예전과 같은지 확인하고 보고서에 적는다.

기준이 어디서 왔는지 테스트 파일에 남긴다(1단계 최종 검토 이월). `e2e/blog-projects.e2e.ts` 3행

```ts
// 데이터화 리팩터링의 안전망. 리팩터링 전에 찍은 기준과 화면·DOM·콘솔 에러를 비교한다.
```
을 다음으로 바꾼다.
```ts
// 데이터화 리팩터링의 안전망. 리팩터링 전에 찍은 기준과 화면·DOM·콘솔 에러를 비교한다.
// 기준(e2e/__screenshots__/)은 기계마다 렌더링이 달라 git에 넣지 않는 로컬 전용이다. 새로 클론한 곳에서
// 처음 실행하면 그 순간의 화면이 기준이 되므로, 의도한 화면에서 --update-snapshots로 찍는다.
// 2026-10-14: 헤더에 Journey 링크를 넣으며 높이·DOM·마크업이 같음을 확인하고 기준을 갱신했다.
```

Run: `rtk proxy npx playwright test e2e/blog-projects.e2e.ts`
Expected: `14 passed`

- [ ] **Step 7: 타입·린트**

Run: `rtk proxy npm run typecheck` → exit 0
Run: `rtk proxy npx eslint src/components/Header.tsx src/app/page.tsx src/app/about/page.tsx e2e/journey.e2e.ts` → 에러 없음

- [ ] **Step 8: 변경 정리와 커밋 메시지 초안 제출 (커밋하지 않음)**

| 파일 | 내용 |
|---|---|
| `src/components/Header.tsx` | Journey 링크 |
| `src/app/page.tsx`, `src/app/about/page.tsx` | Journey 링크 |
| `src/app/globals.css` | 여정 페이지에서 헤더 흐림 끔 |
| `e2e/journey.e2e.ts` | 헤더 링크, 흐림 꺼짐 |
| `e2e/blog-projects.e2e.ts` | 기준 화면 출처 주석 |

```
feat: 사이트 곳곳에서 여정 페이지로 들어오는 링크

- 채용 담당자가 블로그 첫 화면에서 한 번에 찾도록 헤더·홈·About에 링크를 뒀다
- 여정 페이지에서만 헤더 흐림을 꺼 움직이는 캔버스 위 GPU 재합성을 없앴다
- 블로그 화면 기준은 높이·DOM·마크업이 그대로임을 확인한 뒤 헤더 변경만 반영해 갱신했다
```

---

### Task 10: 성능 측정 스크립트와 기준선

**Files:**
- Create: `scripts/perf-journey.ts`
- Modify: `package.json` (스크립트 `perf:journey`)

**Interfaces:**
- Consumes: 빌드된 `/journey`
- Produces: `npm run perf:journey` — 프레임 간격 통계 JSON 출력. 2-2·2-3·2-4가 같은 명령으로 비교한다

- [ ] **Step 1: `scripts/perf-journey.ts`를 만든다**

```ts
import { chromium } from "@playwright/test";

/**
 * 여정 페이지 부드러움 측정(스펙 7절, 8절 4항). GPU를 쓰는 실제 Chrome 창에서 회랑 전체를 일정한 속도로 휠 스크롤하고
 * 프레임 간격을 잰다. 헤드리스 브라우저는 소프트웨어 렌더링이라 숫자가 실제와 달라 창을 띄운다.
 *
 * 사용법:
 *   npx next build && npx next start --port 3200   # 다른 터미널
 *   npm run perf:journey                           # 기본 주소 http://localhost:3200/journey (PERF_URL로 바꿀 수 있다)
 */
const TARGET_URL = process.env.PERF_URL ?? "http://localhost:3200/journey";
const VIEWPORT = { width: 1440, height: 900 };
const WHEEL_STEP = 100; // 한 번에 굴리는 양(px)
const WHEEL_INTERVAL = 16; // 굴리는 간격(ms)
const WARMUP_FRAMES = 30; // 처음 프레임은 셰이더 컴파일·이미지 디코딩이 섞여 제외한다

type FrameWindow = Window & { __frames: number[] };

function percentile(sorted: number[], ratio: number): number {
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))];
}

async function main() {
  const browser = await chromium.launch({ headless: false, args: ["--ignore-gpu-blocklist"] });
  try {
    const page = await browser.newPage({ viewport: VIEWPORT });
    await page.goto(TARGET_URL, { waitUntil: "load" });
    await page.waitForTimeout(2000);

    // 측정 전용 프레임 기록기. 측정 대상 페이지의 시계와는 별개다.
    await page.evaluate(() => {
      const frameWindow = window as unknown as FrameWindow;
      frameWindow.__frames = [];
      let last = performance.now();
      const record = (now: number) => {
        frameWindow.__frames.push(now - last);
        last = now;
        requestAnimationFrame(record);
      };
      requestAnimationFrame(record);
    });

    await page.mouse.move(VIEWPORT.width / 2, VIEWPORT.height / 2);
    const maxScroll = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
    while ((await page.evaluate(() => window.scrollY)) < maxScroll - 2) {
      await page.mouse.wheel(0, WHEEL_STEP);
      await page.waitForTimeout(WHEEL_INTERVAL);
    }
    await page.waitForTimeout(1500);

    const frames = await page.evaluate(() => (window as unknown as FrameWindow).__frames);
    const sample = frames.slice(WARMUP_FRAMES);
    const sorted = [...sample].sort((a, b) => a - b);
    const average = sample.reduce((sum, value) => sum + value, 0) / sample.length;
    console.log(
      JSON.stringify(
        {
          url: TARGET_URL,
          frames: sample.length,
          averageMs: Number(average.toFixed(2)),
          fps: Number((1000 / average).toFixed(1)),
          p95Ms: Number(percentile(sorted, 0.95).toFixed(2)),
          maxMs: Number(sorted[sorted.length - 1].toFixed(2)),
          over33ms: sample.filter((value) => value > 33.4).length,
          over50ms: sample.filter((value) => value > 50).length,
        },
        null,
        2,
      ),
    );
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

`package.json`의 `scripts`에서 `"capture:screens": ...` 아래에 추가:

```json
    "perf:journey": "tsx scripts/perf-journey.ts",
```

- [ ] **Step 2: 기준선을 잰다**

포트 3200이 비어 있는지 확인한다: `lsof -i :3200` → 출력 없음

Run (백그라운드로 서버를 띄운다): `rtk proxy npx next build && rtk proxy npx next start --port 3200`
서버가 뜰 때까지 기다린다(`curl -s -o /dev/null -w '%{http_code}' http://localhost:3200/journey` → `200`).

Run: `rtk proxy npm run perf:journey`
Expected: Chrome 창이 잠깐 떴다가 닫히고 JSON이 출력된다. 숫자를 보고서에 그대로 적는다. 이 단계는 **기준선 기록**이며 통과 기준이 아니다. 스펙 7절 기준(데스크톱 60fps, 50ms 초과 0건)과 비교한 결과를 함께 적는다.

측정 후 3200 포트의 서버를 종료한다(`lsof -ti :3200 | xargs kill`).

- [ ] **Step 3: 타입·린트**

Run: `rtk proxy npm run typecheck` → exit 0
Run: `rtk proxy npx eslint scripts/perf-journey.ts` → 에러 없음

- [ ] **Step 4: 변경 정리와 커밋 메시지 초안 제출 (커밋하지 않음)**

| 파일 | 내용 |
|---|---|
| `scripts/perf-journey.ts` | 실제 GPU Chrome 프레임 간격 측정 |
| `package.json` | `perf:journey` |

```
test: 여정 페이지 부드러움 측정 스크립트

- 헤드리스 브라우저는 소프트웨어 렌더링이라 실제 GPU 창에서 회랑 전체를 스크롤하며 프레임 간격을 잰다
- 장식을 얹기 전 골격 단계의 기준선을 남겨 2-2·2-3에서 같은 명령으로 비교한다
```

---

### Task 11: 전체 검증

**Files:** 없음 (검증만)

**Interfaces:**
- Consumes: Task 1~10 전부
- Produces: 2-1 완료 보고

- [ ] **Step 1: 단위 테스트 전체**

Run: `rtk proxy npm test`
Expected: 전부 PASS. 2-1 시작 전 108개 + inline 1 + projects 16 + journey 27 = **152개**

- [ ] **Step 2: e2e 전체**

Run: `rtk proxy npx playwright test`
Expected: `46 passed` (블로그 14 + 여정 32)

- [ ] **Step 3: 타입·린트·빌드**

Run: `rtk proxy npm run typecheck` → exit 0

Run: `rtk proxy npx eslint src/lib/journey src/components/journey src/app/journey src/components/Background3D.tsx src/components/Header.tsx src/app/page.tsx src/app/about/page.tsx src/data/projects src/lib/inline.tsx scripts e2e`
Expected: 에러 없음

Run: `rtk proxy npx next build`
Expected: 성공. 라우트 목록에 `/journey`가 정적(○)으로 나온다

- [ ] **Step 4: 시계 하나·흐림 금지 규칙을 코드로 확인한다**

Run: `rtk proxy grep -rn "requestAnimationFrame\|autoRaf: true\|frameloop=\"always\"" src/components/journey src/lib/journey`
Expected: 출력 없음

Run: `rtk proxy grep -rn "backdrop-blur\|backdrop-filter: blur" src/components/journey src/app/journey`
Expected: 출력 없음

- [ ] **Step 5: 완료 보고**

보고서에 적는다: 단위·e2e 수와 결과, Task 2에서 쓰지 않은 화면(있다면), Task 10 성능 기준선 숫자, 계획과 다르게 처리한 곳과 이유.

| 파일 | 내용 |
|---|---|
| (없음) | 검증만 |
