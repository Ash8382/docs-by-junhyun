# 여정(Journey) 1단계 구현 계획 — 블로그 프로젝트 글 데이터화

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 블로그 프로젝트 글 7개의 내용을 `src/data/projects/`로 옮기고 페이지가 그 데이터를 렌더링하게 바꾼다. 화면은 픽셀 하나 바뀌지 않는다.

**Architecture:** 리팩터링 전에 Playwright로 7개 글의 현재 화면(데스크톱·모바일)과 보이지 않는 속성(링크·이미지·제목·콘솔 에러)을 기준으로 찍어 둔다. 그다음 글을 하나씩 데이터로 옮기고, 매번 기준과 비교한다. 문장 속 굵은 글씨와 링크는 `**굵게**`, `[텍스트](주소)` 표기로 데이터에 담고 `renderInline`이 원래와 같은 마크업으로 되돌린다. 모양(클래스·색)은 각 페이지 JSX에 그대로 남는다.

**Tech Stack:** Next 16 App Router, React 19, TypeScript, vitest 4, `@playwright/test` 1.63.0

**Spec:** `docs/superpowers/specs/2026-10-14-journey-design.md` (1절 "단계", 6절 "데이터", 8절 2항 "화면 비교")

## Global Constraints

- **화면 변화 0.** 7개 글은 리팩터링 전후로 데스크톱(1280px)·모바일(390px) 모두 픽셀 단위로 같아야 한다. 스타일 통일, 문구 다듬기, 오탈자 수정 금지. `pickcare`의 "세트 수에 비례해 작업량이 습니다"도 그대로 옮긴다(사용자 결정)
- **`src/data/posts.ts`는 수정하지 않는다**
- **데이터에는 내용만 담는다.** 클래스, 색(참고 사항 상자의 빨강·주황·노랑), 섹션 제목("프로젝트 개요", "담당 역할", "성과 및 배운 점", "돌아보면")은 페이지 JSX에 남는다. 3D·막·오브젝트 정보도 담지 않는다
- **Inline 표기는 `**굵게**`와 `[텍스트](주소)` 두 가지뿐이다.** 데이터의 Inline 필드는 모두 `renderInline`으로 렌더링한다
- **JSX 여러 줄 텍스트를 옮기는 규칙:** 줄 끝 공백을 버리고 줄과 줄을 공백 하나로 이어 붙인 문자열이 된다. 이 계획의 데이터 코드는 이미 그 규칙대로 쓰여 있다. 손으로 고치지 말고 그대로 옮긴다
- `@playwright/test`는 `1.63.0`으로 정확히 고정한다(2026-09-04 배포. 2주 이상 지난 최신 안정판)
- Playwright 테스트 파일은 `e2e/*.e2e.ts`로 둔다. vitest가 `*.spec.ts`를 집어 가지 않게 하기 위해서다
- 기준 이미지와 스냅샷(`e2e/__screenshots__/`)은 커밋하지 않는다(`.gitignore`). 그래서 **모든 태스크는 같은 작업 디렉터리에서 진행한다.** 별도 worktree로 옮기면 기준이 사라진다
- **명령 실행:** 이 환경의 Bash에는 출력을 가공하는 `rtk` 훅이 있다. 검증 명령은 모두 `rtk proxy`를 앞에 붙여 원본 출력과 exit code를 본다. 특히 타입 검사는 `rtk proxy npm run typecheck`로 하고 exit code를 믿는다(훅이 없는 tsc 에러를 지어낸 적이 있다)
- 린트는 바꾼 파일에만 건다: `rtk proxy npx eslint <파일들>`. 전체 `npm run lint`에는 이번 작업과 무관한 기존 경고가 섞일 수 있다
- **커밋하지 않는다.** 에이전트는 `git add`, `git commit`을 실행하지 않는다. 각 태스크의 마지막 단계는 "변경 파일 표와 커밋 메시지 초안 제출"이다. 메시지 형식은 `type: 한국어 요약` + `- ` 불릿이고, 불릿에는 무엇을 했는지가 아니라 왜 그렇게 했는지를 쓴다
- 기존 스타일을 따른다: 한국어 주석, `function` 선언형 컴포넌트, Tailwind 유틸리티, 테스트는 소스 옆 `*.test.ts(x)`

## Review Focus

1. **픽셀에 안 보이는 회귀.** 링크 주소·`target`·`rel`, 이미지 `alt`, 문서 제목은 화면이 같아도 틀릴 수 있다. 사용자는 링크를 눌렀을 때 원래 주소로 가야 한다 → Task 1의 DOM 스냅샷이 잡는다
2. **기준 화면 오염.** 폰트·썸네일이 다 뜨기 전에 찍힌 기준은 비교를 무의미하게 만든다 → Task 1에서 로딩 대기, 두 번 연속 실행, 기준 이미지를 눈으로 확인
3. **낡은 서버로 인한 거짓 통과.** 이전 빌드 서버를 재사용하면 바뀐 코드를 보지 못한다 → `reuseExistingServer: false`, 그리고 Task 1에서 일부러 화면과 링크를 바꿔 테스트가 실패하는지 확인
4. **새로 생기는 콘솔 에러·하이드레이션 경고.** 화면은 같아도 콘솔이 더러워질 수 있다 → Task 1의 에러 스냅샷이 리팩터링 전과 비교한다
5. **옮기다 빠뜨린 `**` 짝.** 닫히지 않은 `**`는 화면에 별표로 보인다. 픽셀 비교가 잡지만 원인을 찾기 어렵다 → Task 3의 무결성 테스트가 문장 단위로 짚어 준다

---

## 파일 구조

| 파일 | 책임 |
|---|---|
| `playwright.config.ts` | Playwright 설정. 항상 새로 빌드한 서버로 테스트 |
| `e2e/blog-projects.e2e.ts` | 블로그 프로젝트 글 7개의 화면·DOM·콘솔 에러를 기준과 비교 |
| `src/lib/inline.tsx` | `**굵게**`, `[텍스트](주소)` 표기를 React 요소로 변환 |
| `src/lib/inline.test.tsx` | 변환 규칙 테스트 |
| `src/data/projects/types.ts` | 프로젝트 내용 타입 |
| `src/data/projects/<slug>.ts` ×7 | 글별 내용 데이터 |
| `src/data/projects/index.ts` | 7개를 종료일 순서로 묶은 목록 |
| `src/data/projects/projects.test.ts` | 데이터 무결성 (필수 필드, `**` 짝, 이미지 파일·크기, 순서) |
| `src/components/ProjectLinkIcon.tsx` | 글마다 복사돼 있던 GitHub·Live 링크 svg |
| `src/app/blog/<slug>/page.tsx` ×7 | 마크업은 유지하고 내용만 데이터에서 읽도록 수정 |

---

### Task 1: Playwright 도입과 블로그 기준 화면

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/blog-projects.e2e.ts`
- Modify: `package.json` (devDependency, `e2e` 스크립트)
- Modify: `.gitignore`

**Interfaces:**
- Consumes: 없음
- Produces: `rtk proxy npx playwright test -g <slug>` — 해당 글의 데스크톱·모바일 화면, DOM, 콘솔 에러를 기준과 비교한다. 이후 모든 태스크가 이 명령으로 리팩터링을 검증한다

- [ ] **Step 1: 기존 단위 테스트가 통과하는지 기록한다**

Run: `rtk proxy npm test`
Expected: 모든 테스트 PASS. 실패가 있으면 이번 작업과 무관한 기존 실패이므로 목록을 적어 두고 진행한다.

- [ ] **Step 2: Playwright를 설치한다**

Run: `rtk proxy npm install --save-dev --save-exact @playwright/test@1.63.0`
Expected: `package.json`의 `devDependencies`에 `"@playwright/test": "1.63.0"`(캐럿 없음)이 들어간다.

Run: `rtk proxy npx playwright install chromium`
Expected: Chromium 다운로드 완료.

- [ ] **Step 3: `playwright.config.ts`를 만든다**

```ts
import { defineConfig, devices } from "@playwright/test";

// 블로그 화면 비교용. vitest와 섞이지 않게 *.e2e.ts만 집는다.
const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.e2e.ts",
  // 기준 이미지는 로컬 전용이다(.gitignore). 뷰포트별 폴더로 나눠 서로 덮어쓰지 않게 한다.
  snapshotPathTemplate: "{testDir}/__screenshots__/{testFileName}/{projectName}/{arg}{ext}",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
    {
      name: "mobile",
      use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } },
    },
  ],
  webServer: {
    // 항상 새로 빌드한다. 이전 빌드 서버를 재사용하면 바뀐 코드를 보지 못하고 거짓 통과한다.
    command: `npx next build && npx next start --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 300_000,
  },
});
```

- [ ] **Step 4: `e2e/blog-projects.e2e.ts`를 만든다**

```ts
import { expect, test, type Page } from "@playwright/test";

// 데이터화 리팩터링의 안전망. 리팩터링 전에 찍은 기준과 화면·DOM·콘솔 에러를 비교한다.
const SLUGS = [
  "kokoa-clone",
  "todo-app",
  "eutcha",
  "stock2u",
  "tix2u",
  "pfplay",
  "pickcare",
] as const;

// 아주 긴 페이지는 한 장으로 찍으면 브라우저 한계에 걸릴 수 있어 4000px씩 나눠 찍는다.
const CHUNK = 4000;

async function settle(page: Page) {
  // 레이아웃의 별 배경(Background3D)은 무작위로 움직여 매번 다르게 찍힌다.
  await page.addStyleTag({ content: "canvas { visibility: hidden !important; }" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() =>
    Array.from(document.images).every((img) => img.complete && img.naturalWidth > 0),
  );
}

for (const slug of SLUGS) {
  test(`${slug} 글이 리팩터링 전과 같다`, async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));

    await page.goto(`/blog/${slug}`, { waitUntil: "networkidle" });
    await settle(page);

    const size = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
    }));
    // 높이가 바뀌면 조각 수가 달라지므로 높이를 먼저 비교해 원인을 분명히 한다.
    expect(String(size.height)).toMatchSnapshot(`${slug}-height.txt`);

    for (let index = 0, y = 0; y < size.height; index += 1, y += CHUNK) {
      const shot = await page.screenshot({
        fullPage: true,
        animations: "disabled",
        clip: { x: 0, y, width: size.width, height: Math.min(CHUNK, size.height - y) },
      });
      expect(shot).toMatchSnapshot(`${slug}-${index}.png`, { maxDiffPixels: 0 });
    }

    // 픽셀에 보이지 않는 속성: 링크 주소·target·rel, 이미지 alt·src, 문서 제목.
    const dom = await page.evaluate(() => ({
      title: document.title,
      links: Array.from(document.querySelectorAll("article a")).map((anchor) => ({
        text: anchor.textContent?.trim() ?? "",
        href: anchor.getAttribute("href"),
        target: anchor.getAttribute("target"),
        rel: anchor.getAttribute("rel"),
      })),
      images: Array.from(document.querySelectorAll("article img")).map((image) => ({
        alt: image.getAttribute("alt"),
        src: image.getAttribute("src"),
      })),
    }));
    expect(JSON.stringify(dom, null, 2)).toMatchSnapshot(`${slug}-dom.txt`);

    // 기존 에러는 기준에 같이 기록된다. 새로 생긴 에러만 실패로 드러난다.
    expect(errors.join("\n")).toMatchSnapshot(`${slug}-errors.txt`);
  });
}
```

- [ ] **Step 5: `.gitignore`와 `package.json` 스크립트를 고친다**

`.gitignore` 맨 끝에 추가:

```gitignore

# Playwright 산출물. 기준 화면은 로컬 전용이다.
/test-results/
/playwright-report/
/blob-report/
/e2e/__screenshots__/
```

`package.json`의 `scripts`에서 `"test:watch": "vitest",` 바로 아래에 추가:

```json
    "e2e": "playwright test",
```

- [ ] **Step 6: 포트가 비어 있는지 확인한다**

Run: `lsof -i :3100`
Expected: 출력 없음. 무언가 떠 있으면 그 프로세스를 정리한 뒤 진행한다(`reuseExistingServer: false`라 포트가 막혀 있으면 테스트가 시작되지 않는다).

- [ ] **Step 7: 리팩터링 전 기준을 찍는다**

Run: `rtk proxy npx playwright test --update-snapshots`
Expected: `14 passed` (7개 글 × desktop·mobile). `e2e/__screenshots__/blog-projects.e2e.ts/{desktop,mobile}/` 아래에 글마다 `-height.txt`, `-0.png`(긴 글은 `-1.png`… 추가), `-dom.txt`, `-errors.txt`가 생긴다.

- [ ] **Step 8: 기준이 흔들리지 않는지 다시 실행한다**

Run: `rtk proxy npx playwright test`
Expected: `14 passed`. 하나라도 실패하면 기준이 불안정한 것이다. 실패한 이미지의 diff(`test-results/` 아래)를 보고 원인(로딩 대기 부족 등)을 `settle`에서 고친 뒤 Step 7부터 다시 한다.

- [ ] **Step 9: 기준을 눈으로 확인한다**

Read 도구로 다음 이미지를 열어 본다.
- `e2e/__screenshots__/blog-projects.e2e.ts/desktop/kokoa-clone-0.png`: 제목, 기술 칩, 썸네일, 본문이 보여야 한다. 썸네일 자리가 비어 있으면 안 된다
- `e2e/__screenshots__/blog-projects.e2e.ts/mobile/pickcare-0.png`: 헤더와 첫 저장소 섹션이 보여야 한다

`desktop/kokoa-clone-dom.txt`를 열어 링크 두 개(`GitHub Repository`, `Live Demo (Check Note)`)와 주소가 있는지 확인한다. `-errors.txt` 7개의 내용을 확인하고, 비어 있지 않다면 어떤 에러가 원래부터 있었는지 보고에 적는다.

- [ ] **Step 10: 테스트가 실제로 회귀를 잡는지 확인한다**

`src/app/blog/kokoa-clone/page.tsx` 15행의 `코코아톡 (Kokoa Clone)`을 `코코아톡 (Kokoa Clone)!`로 바꾼다.

Run: `rtk proxy npx playwright test -g kokoa-clone`
Expected: `2 failed` (desktop, mobile 모두 화면 불일치)

원래대로 되돌리고, 이번에는 29행의 `https://github.com/Ellsy23/kokoa-clone-2023`을 `https://github.com/Ellsy23/kokoa-clone-2024`로 바꾼다.

Run: `rtk proxy npx playwright test -g kokoa-clone`
Expected: `2 failed` (`kokoa-clone-dom.txt` 불일치. 화면은 같다)

원래대로 되돌린다.

Run: `git diff --stat -- src/`
Expected: 출력 없음

Run: `rtk proxy npx playwright test -g kokoa-clone`
Expected: `2 passed`

- [ ] **Step 11: 타입 검사와 린트**

Run: `rtk proxy npm run typecheck`
Expected: exit 0

Run: `rtk proxy npx eslint playwright.config.ts e2e/blog-projects.e2e.ts`
Expected: 에러 없음

- [ ] **Step 12: 변경 정리와 커밋 메시지 초안을 제출한다 (커밋하지 않음)**

| 파일 | 내용 |
|---|---|
| `package.json`, `package-lock.json` | `@playwright/test` 1.63.0, `e2e` 스크립트 |
| `playwright.config.ts` | 항상 새로 빌드하는 서버, desktop·mobile 프로젝트 |
| `e2e/blog-projects.e2e.ts` | 블로그 프로젝트 글 7개 비교 테스트 |
| `.gitignore` | Playwright 산출물과 로컬 기준 화면 제외 |

```
test: 블로그 프로젝트 글 화면 비교 테스트 추가

- 글 내용을 데이터로 옮기는 리팩터링이 화면을 바꾸지 않았음을 사람 눈 대신 픽셀로 증명하기 위해
- 링크 주소·이미지 alt·콘솔 에러는 화면에 안 보여서 DOM 스냅샷으로 따로 고정한다
- 이전 빌드 서버를 재사용하면 거짓 통과하므로 테스트마다 새로 빌드한다
```

---

### Task 2: 인라인 표기 렌더러와 내용 타입

**Files:**
- Modify: `vitest.config.ts:13`
- Create: `src/lib/inline.tsx`
- Create: `src/lib/inline.test.tsx`
- Create: `src/data/projects/types.ts`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `renderInline(text: string, options?: InlineOptions): ReactNode[]` — `InlineOptions = { strongClassName?: string }`
  - 타입: `Inline`, `ProjectLink`, `Screen`, `Callout`, `ItemGroup`, `ProjectBase`, `StandardProject`, `Case`, `Repo`, `ReposProject`, `Project` (모두 `@/data/projects/types`에서 export)

- [ ] **Step 1: vitest가 `.test.tsx`도 집도록 한다**

`vitest.config.ts` 13행을 다음으로 바꾼다.

```ts
    include: [
      "shared/**/*.test.ts",
      "server/**/*.test.ts",
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
    ],
```

- [ ] **Step 2: 실패하는 테스트를 쓴다**

`src/lib/inline.test.tsx`:

```tsx
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
```

- [ ] **Step 3: 테스트가 실패하는지 확인한다**

Run: `rtk proxy npx vitest run src/lib/inline.test.tsx`
Expected: FAIL — `./inline`을 찾을 수 없다는 import 에러

- [ ] **Step 4: `src/lib/inline.tsx`를 구현한다**

```tsx
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
```

- [ ] **Step 5: 테스트가 통과하는지 확인한다**

Run: `rtk proxy npx vitest run src/lib/inline.test.tsx`
Expected: PASS (9 tests)

- [ ] **Step 6: `src/data/projects/types.ts`를 만든다**

```ts
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
```

- [ ] **Step 7: 타입 검사와 린트, 전체 단위 테스트**

Run: `rtk proxy npm run typecheck`
Expected: exit 0

Run: `rtk proxy npx eslint src/lib/inline.tsx src/lib/inline.test.tsx src/data/projects/types.ts vitest.config.ts`
Expected: 에러 없음

Run: `rtk proxy npm test`
Expected: Task 1 Step 1과 같은 결과에 `inline.test.tsx` 9개가 더해져 PASS

- [ ] **Step 8: 변경 정리와 커밋 메시지 초안을 제출한다 (커밋하지 않음)**

| 파일 | 내용 |
|---|---|
| `vitest.config.ts` | `src/**/*.test.tsx` 포함 |
| `src/lib/inline.tsx`, `src/lib/inline.test.tsx` | 인라인 표기 렌더러와 테스트 |
| `src/data/projects/types.ts` | 프로젝트 내용 타입 |

```
feat: 블로그 글 내용용 인라인 표기 렌더러와 타입 추가

- 문장 중간의 굵은 글씨와 링크를 데이터 문자열에 담으면서도 원래 JSX와 같은 마크업을 내기 위해
- 페이지마다 strong에 붙던 클래스가 달라서 클래스를 호출하는 쪽에서 넘기게 했다
```

---

### Task 3: 코코아톡 — 무결성 테스트, 링크 아이콘, 첫 데이터화

**Files:**
- Create: `src/data/projects/projects.test.ts`
- Create: `src/data/projects/kokoa-clone.ts`
- Create: `src/data/projects/index.ts`
- Create: `src/components/ProjectLinkIcon.tsx`
- Modify: `src/app/blog/kokoa-clone/page.tsx` (전체 교체)

**Interfaces:**
- Consumes: Task 2의 타입, `renderInline`
- Produces:
  - `projects: Project[]` (`@/data/projects`) — 이후 태스크가 끝에 하나씩 추가한다
  - `kokoaClone` (`@/data/projects/kokoa-clone`)
  - `ProjectLinkIcon({ kind }: { kind: ProjectLink["kind"] })` (`@/components/ProjectLinkIcon`)

- [ ] **Step 1: 실패하는 무결성 테스트를 쓴다**

`src/data/projects/projects.test.ts`:

```ts
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
```

- [ ] **Step 2: 테스트가 실패하는지 확인한다**

Run: `rtk proxy npx vitest run src/data/projects`
Expected: FAIL — `./index`를 찾을 수 없다는 import 에러

- [ ] **Step 3: 코코아톡 데이터와 목록을 만든다**

`src/data/projects/kokoa-clone.ts`:

```ts
import type { StandardProject } from "./types";

export const kokoaClone = {
  kind: "standard",
  slug: "kokoa-clone",
  title: "코코아톡 (Kokoa Clone)",
  period: "2023.04.01 ~ 2023.05.01",
  team: "Individual Project",
  summary: "HTML과 CSS로 구현한 카카오톡 클론 코딩",
  stack: ["HTML5", "CSS3"],
  links: [
    {
      kind: "github",
      label: "GitHub Repository",
      href: "https://github.com/Ellsy23/kokoa-clone-2023",
    },
    {
      kind: "live",
      label: "Live Demo (Check Note)",
      href: "https://ellsy23.github.io/kokoa-clone-2023/",
    },
  ],
  screens: [
    {
      src: "/kokoa-clone-thumb.png",
      alt: "Kokoa Clone Project Screenshot",
      width: 505,
      height: 635,
    },
  ],
  overview: [
    "노마드코더의 카카오톡 클론 코딩 강의를 수강하며 진행한 프로젝트입니다. HTML과 CSS 개념을 확실히 이해하고, 실제 애플리케이션의 UI를 직접 구현해보며 실전 감각을 익히는 것을 목표로 했습니다.",
  ],
  achievements: [
    "**UI/UX 정밀 구현**: HTML과 CSS만을 사용하여 카카오톡의 사용자 인터페이스를 픽셀 단위로 정교하게 재현했습니다. 레이아웃 구성과 스타일링 능력이 크게 늘어난 작업입니다.",
    "웹 페이지에 **반응형 디자인**을 적용해 다양한 화면 크기에서도 깨지지 않고 자연스럽게 동작하도록 구현했습니다.",
    "시맨틱 태그를 적절히 활용하여 **웹 접근성과 표준**을 준수하는 마크업을 작성했습니다.",
  ],
  note: {
    title: "참고 사항",
    text: "현재 배포된 페이지에서 CSS 파일 로드 문제(CSP 정책 및 404 에러)로 인해 스타일이 정상적으로 적용되지 않을 수 있습니다. 정확한 구현 화면과 코드는 GitHub 저장소를 통해 확인해 주시면 감사하겠습니다.",
  },
} satisfies StandardProject;
```

`src/data/projects/index.ts`:

```ts
import { kokoaClone } from "./kokoa-clone";
import type { Project } from "./types";

/** 종료일 순서. 여정(/journey)의 정류장 순서와 같다. */
export const projects: Project[] = [kokoaClone];
```

- [ ] **Step 4: 테스트가 통과하는지 확인한다**

Run: `rtk proxy npx vitest run src/data/projects`
Expected: PASS (slug 중복 1개 + kokoa-clone 5개 = 6 tests)

- [ ] **Step 5: 링크 아이콘 컴포넌트를 만든다**

`src/components/ProjectLinkIcon.tsx` (svg 경로는 기존 글에서 한 글자도 바꾸지 않은 것이다):

```tsx
import type { ProjectLink } from "@/data/projects/types";

// 블로그 프로젝트 글 헤더의 링크 아이콘. 글마다 복사돼 있던 svg를 한곳으로 모았다.
export function ProjectLinkIcon({ kind }: { kind: ProjectLink["kind"] }) {
  if (kind === "github") {
    return (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true"><path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm-2.033 16.01c-2.204 0-3.992-1.788-3.992-3.992 0-2.204 1.788-3.992 3.992-3.992 2.204 0 3.992 1.788 3.992 3.992 0 2.204-1.788 3.992-3.992 3.992zm1.132-8.806c-1.365 0-2.472-1.107-2.472-2.472 0-1.365 1.107-2.472 2.472-2.472 1.365 0 2.472 1.107 2.472 2.472 0 1.365-1.107 2.472-2.472 2.472z"/></svg>
  );
}
```

- [ ] **Step 6: 코코아톡 페이지를 데이터로 바꾼다**

`src/app/blog/kokoa-clone/page.tsx` 전체를 다음으로 교체한다.

```tsx
import Link from "next/link";
import Image from "next/image";
import { ProjectLinkIcon } from "@/components/ProjectLinkIcon";
import { kokoaClone } from "@/data/projects/kokoa-clone";
import { renderInline } from "@/lib/inline";

export default function KokoaClonePage() {
  const thumbnail = kokoaClone.screens[0];

  return (
    <article className="container py-10 lg:py-16 max-w-4xl mx-auto">
      {/* Header */}
      <div className="space-y-4 mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{kokoaClone.period}</span>
          <span>•</span>
          <span>{kokoaClone.team}</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight lg:text-5xl">
          {kokoaClone.title}
        </h1>
        <p className="text-xl text-muted-foreground">
          {renderInline(kokoaClone.summary)}
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          {kokoaClone.stack.map((tech) => (
            <span key={tech} className="px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
              {tech}
            </span>
          ))}
        </div>
        <div className="flex gap-4 pt-2">
          {kokoaClone.links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-sm font-medium hover:underline"
            >
              <ProjectLinkIcon kind={link.kind} />
              {link.label}
            </a>
          ))}
        </div>
      </div>

      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden rounded-xl border bg-muted mb-12">
        <Image
          src={thumbnail.src}
          alt={thumbnail.alt}
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* Content */}
      <div className="prose dark:prose-invert max-w-none space-y-12">

        {/* Overview */}
        <section>
          <h2>프로젝트 개요</h2>
          {kokoaClone.overview.map((paragraph) => (
            <p key={paragraph}>{renderInline(paragraph)}</p>
          ))}
        </section>

        {/* Achievements */}
        <section>
          <h2>성과 및 배운 점</h2>
          <ul>
            {kokoaClone.achievements.map((item) => (
              <li key={item}>{renderInline(item)}</li>
            ))}
          </ul>
        </section>

        {/* Note */}
        <section>
          <div className="border-l-4 border-red-500 bg-red-50 dark:bg-red-950/30 p-4 rounded-r-lg">
            <h3 className="text-red-800 dark:text-red-200 mt-0 mb-2 text-lg font-semibold">{kokoaClone.note.title}</h3>
            <p className="text-red-700 dark:text-red-300 m-0 text-sm">
              {renderInline(kokoaClone.note.text)}
            </p>
          </div>
        </section>

      </div>

      <hr className="my-12 border-border" />

      <div className="flex justify-center">
        <Link href="/blog" className="flex items-center justify-center rounded-md border border-input bg-background px-8 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground">
          목록으로 돌아가기
        </Link>
      </div>
    </article>
  );
}
```

- [ ] **Step 7: 기준과 비교한다**

Run: `rtk proxy npx playwright test -g kokoa-clone`
Expected: `2 passed`. 실패하면 `test-results/` 아래 diff 이미지와 dom/height 스냅샷 차이를 보고 데이터 문자열이 원문과 다른 곳을 고친다. 테스트나 기준을 고쳐서 통과시키지 않는다.

- [ ] **Step 8: 타입 검사와 린트**

Run: `rtk proxy npm run typecheck`
Expected: exit 0

Run: `rtk proxy npx eslint src/data/projects src/components/ProjectLinkIcon.tsx src/app/blog/kokoa-clone/page.tsx`
Expected: 에러 없음

- [ ] **Step 9: 변경 정리와 커밋 메시지 초안을 제출한다 (커밋하지 않음)**

| 파일 | 내용 |
|---|---|
| `src/data/projects/projects.test.ts` | 데이터 무결성 테스트 |
| `src/data/projects/kokoa-clone.ts`, `src/data/projects/index.ts` | 코코아톡 데이터, 목록 |
| `src/components/ProjectLinkIcon.tsx` | 링크 아이콘 |
| `src/app/blog/kokoa-clone/page.tsx` | 내용을 데이터에서 읽도록 수정 |

```
refactor: 코코아톡 글 내용을 데이터로 분리

- 블로그 글과 여정 페이지가 같은 내용을 쓰게 하기 위한 첫 단계. 화면은 기준과 픽셀 단위로 같다
- 글마다 복사돼 있던 링크 svg를 한 컴포넌트로 모아 이후 글들이 같은 것을 쓰게 했다
- 데이터를 옮기다 빠뜨린 ** 짝이나 이미지 크기 오기는 테스트가 문장 단위로 짚게 했다
```

---

### Task 4: Todo App

**Files:**
- Create: `src/data/projects/todo-app.ts`
- Modify: `src/data/projects/index.ts`
- Modify: `src/app/blog/todo-app/page.tsx` (전체 교체)

**Interfaces:**
- Consumes: Task 2의 타입·`renderInline`, Task 3의 `projects`·`ProjectLinkIcon`
- Produces: `todoApp` (`@/data/projects/todo-app`)

- [ ] **Step 1: 데이터를 만든다**

`src/data/projects/todo-app.ts`:

```ts
import type { StandardProject } from "./types";

export const todoApp = {
  kind: "standard",
  slug: "todo-app",
  title: "Todo App",
  period: "2023.05.01 ~ 2023.06.01",
  team: "Individual Project (with Mentor)",
  summary: "프론트엔드 입문자를 위한 Todo App 만들기 과제",
  stack: ["HTML5", "CSS3", "JavaScript"],
  links: [
    {
      kind: "github",
      label: "GitHub Repository",
      href: "https://github.com/geezers-io/todo-app-assignment",
    },
    {
      kind: "live",
      label: "Live Demo",
      href: "https://geezers-io.github.io/todo-app-assignment/",
    },
  ],
  screens: [
    {
      src: "/todo-app-thumb.png",
      alt: "Todo App Screenshot",
      width: 1024,
      height: 603,
    },
  ],
  overview: [
    "HTML과 CSS, 순수 JavaScript만으로 구현한 Todo List 애플리케이션입니다. 프론트엔드 개발의 기초를 다지기 위한 과제 프로젝트로 진행되었습니다.",
  ],
  achievements: [
    "**기본기 강화**: HTML5와 CSS3로 시맨틱한 마크업과 레이아웃을 구성했습니다. 동적인 기능은 JavaScript로 구현하며 웹 개발의 핵심 기초를 다졌습니다.",
    "**상태 관리 이해**: 외부 라이브러리 없이 순수 JavaScript로 데이터의 상태(State)를 관리하고 UI에 반영하면서 프론트엔드 개발의 기본적인 데이터 흐름을 익혔습니다.",
    "**사용자 경험(UX) 고려**: 단순한 기능 구현을 넘어 사용자가 직관적으로 사용할 수 있는 디자인과 인터랙션을 고민하고 적용했습니다.",
  ],
} satisfies StandardProject;
```

`src/data/projects/index.ts`를 다음으로 바꾼다.

```ts
import { kokoaClone } from "./kokoa-clone";
import { todoApp } from "./todo-app";
import type { Project } from "./types";

/** 종료일 순서. 여정(/journey)의 정류장 순서와 같다. */
export const projects: Project[] = [kokoaClone, todoApp];
```

- [ ] **Step 2: 무결성 테스트**

Run: `rtk proxy npx vitest run src/data/projects`
Expected: PASS (1 + 5×2 = 11 tests)

- [ ] **Step 3: 페이지를 데이터로 바꾼다**

`src/app/blog/todo-app/page.tsx` 전체를 다음으로 교체한다.

```tsx
import Link from "next/link";
import Image from "next/image";
import { ProjectLinkIcon } from "@/components/ProjectLinkIcon";
import { todoApp } from "@/data/projects/todo-app";
import { renderInline } from "@/lib/inline";

export default function TodoAppPage() {
  const thumbnail = todoApp.screens[0];

  return (
    <article className="container py-10 lg:py-16 max-w-4xl mx-auto">
      {/* Header */}
      <div className="space-y-4 mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{todoApp.period}</span>
          <span>•</span>
          <span>{todoApp.team}</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight lg:text-5xl">
          {todoApp.title}
        </h1>
        <p className="text-xl text-muted-foreground">
          {renderInline(todoApp.summary)}
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          {todoApp.stack.map((tech) => (
            <span key={tech} className="px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
              {tech}
            </span>
          ))}
        </div>
        <div className="flex gap-4 pt-2">
          {todoApp.links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-sm font-medium hover:underline"
            >
              <ProjectLinkIcon kind={link.kind} />
              {link.label}
            </a>
          ))}
        </div>
      </div>

      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden rounded-xl border bg-muted mb-12">
        <Image
          src={thumbnail.src}
          alt={thumbnail.alt}
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* Content */}
      <div className="prose dark:prose-invert max-w-none space-y-12">

        {/* Overview */}
        <section>
          <h2>프로젝트 개요</h2>
          {todoApp.overview.map((paragraph) => (
            <p key={paragraph}>{renderInline(paragraph)}</p>
          ))}
        </section>

        {/* Achievements */}
        <section>
          <h2>성과 및 배운 점</h2>
          <ul>
            {todoApp.achievements.map((item) => (
              <li key={item}>{renderInline(item)}</li>
            ))}
          </ul>
        </section>

      </div>

      <hr className="my-12 border-border" />

      <div className="flex justify-center">
        <Link href="/blog" className="flex items-center justify-center rounded-md border border-input bg-background px-8 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground">
          목록으로 돌아가기
        </Link>
      </div>
    </article>
  );
}
```

- [ ] **Step 4: 기준과 비교한다**

Run: `rtk proxy npx playwright test -g todo-app`
Expected: `2 passed`. 실패하면 데이터 문자열을 원문과 대조해 고친다. 테스트나 기준은 고치지 않는다.

- [ ] **Step 5: 타입 검사와 린트**

Run: `rtk proxy npm run typecheck`
Expected: exit 0

Run: `rtk proxy npx eslint src/data/projects src/app/blog/todo-app/page.tsx`
Expected: 에러 없음

- [ ] **Step 6: 변경 정리와 커밋 메시지 초안을 제출한다 (커밋하지 않음)**

| 파일 | 내용 |
|---|---|
| `src/data/projects/todo-app.ts`, `src/data/projects/index.ts` | Todo App 데이터, 목록 추가 |
| `src/app/blog/todo-app/page.tsx` | 내용을 데이터에서 읽도록 수정 |

```
refactor: Todo App 글 내용을 데이터로 분리

- 여정 페이지와 같은 내용을 공유하기 위해. 화면은 기준과 픽셀 단위로 같다
```

---

### Task 5: EUTCHA

**Files:**
- Create: `src/data/projects/eutcha.ts`
- Modify: `src/data/projects/index.ts`
- Modify: `src/app/blog/eutcha/page.tsx` (전체 교체)

**Interfaces:**
- Consumes: Task 2의 타입·`renderInline`, Task 3의 `projects`·`ProjectLinkIcon`
- Produces: `eutcha` (`@/data/projects/eutcha`)

- [ ] **Step 1: 데이터를 만든다**

`src/data/projects/eutcha.ts`:

```ts
import type { StandardProject } from "./types";

export const eutcha = {
  kind: "standard",
  slug: "eutcha",
  title: "EUTCHA",
  period: "2023.09.28 ~ 2023.10.09",
  team: "Team Project (FE 2명)",
  summary: "리액트와 협업에 익숙해지기 위한 프론트엔드 비기너 프로젝트",
  stack: ["React", "JavaScript", "Chakra UI", "Emotion", "TMDB API", "ESLint", "Prettier"],
  links: [
    {
      kind: "github",
      label: "GitHub Repository",
      href: "https://github.com/geezers-io/EUTCHA",
    },
    {
      kind: "live",
      label: "Live Demo",
      href: "https://eutcha.vercel.app/",
    },
  ],
  screens: [
    {
      src: "/eutcha-thumb.png",
      alt: "EUTCHA Project Screenshot",
      width: 1024,
      height: 818,
    },
  ],
  overview: [
    "TMDB Open API를 활용하여 영화 정보를 제공하는 웹 애플리케이션 EUTCHA를 구축했습니다. 리액트와 협업에 익숙해지려고 진행한 프론트엔드 입문 프로젝트입니다.",
  ],
  overviewCallout: {
    title: "주요 특징",
    items: [
      "모바일 중심 디자인 (Max-width 1024px)",
      "TMDB API 기반 영화 데이터 연동",
      "WhatCha의 컬러셋을 레퍼런스로 활용",
    ],
  },
  roleIntro: "프로젝트 전반의 스타일링(CSS)과 주요 페이지 구현을 담당했습니다.",
  role: [
    "**공통 레이아웃 & 스타일**: Header, Home, About 페이지의 CSS 스타일링을 전담해 디자인을 일관되게 맞췄습니다.",
    "**상세 페이지 (Detail)**: 영화 상세 정보(포스터, 트레일러, 평점, 줄거리 등)를 보여주는 페이지의 라우팅과 스타일을 구현했습니다.",
    "**기능 구현**: 데이터 페칭 최적화는 인피니트 스크롤(Infinite Scroll) 기능을 직접 구현하며 익혔습니다.",
  ],
  extraSections: [
    {
      title: "기술 스택 및 규칙",
      items: [
        "**Framework/Library**: React 18, Chakra UI, Emotion",
        "**Code Quality**: ESLint, Prettier를 도입하여 코드 컨벤션을 유지했습니다.",
        "**API**: TMDB Open API로 실제 영화 데이터를 다뤘습니다.",
      ],
    },
  ],
} satisfies StandardProject;
```

`src/data/projects/index.ts`를 다음으로 바꾼다.

```ts
import { eutcha } from "./eutcha";
import { kokoaClone } from "./kokoa-clone";
import { todoApp } from "./todo-app";
import type { Project } from "./types";

/** 종료일 순서. 여정(/journey)의 정류장 순서와 같다. */
export const projects: Project[] = [kokoaClone, todoApp, eutcha];
```

- [ ] **Step 2: 무결성 테스트**

Run: `rtk proxy npx vitest run src/data/projects`
Expected: PASS (1 + 5×3 = 16 tests)

- [ ] **Step 3: 페이지를 데이터로 바꾼다**

`src/app/blog/eutcha/page.tsx` 전체를 다음으로 교체한다.

```tsx
import Link from "next/link";
import Image from "next/image";
import { ProjectLinkIcon } from "@/components/ProjectLinkIcon";
import { eutcha } from "@/data/projects/eutcha";
import { renderInline } from "@/lib/inline";

export default function EutchaPage() {
  const thumbnail = eutcha.screens[0];

  return (
    <article className="container py-10 lg:py-16 max-w-4xl mx-auto">
      {/* Header */}
      <div className="space-y-4 mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{eutcha.period}</span>
          <span>•</span>
          <span>{eutcha.team}</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight lg:text-5xl">
          {eutcha.title}
        </h1>
        <p className="text-xl text-muted-foreground">
          {renderInline(eutcha.summary)}
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          {eutcha.stack.map((tech) => (
            <span key={tech} className="px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
              {tech}
            </span>
          ))}
        </div>
        <div className="flex gap-4 pt-2">
          {eutcha.links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-sm font-medium hover:underline"
            >
              <ProjectLinkIcon kind={link.kind} />
              {link.label}
            </a>
          ))}
        </div>
      </div>

      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden rounded-xl border bg-muted mb-12">
        <Image
          src={thumbnail.src}
          alt={thumbnail.alt}
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* Content */}
      <div className="prose dark:prose-invert max-w-none space-y-12">

        {/* Overview */}
        <section>
          <h2>프로젝트 개요</h2>
          {eutcha.overview.map((paragraph) => (
            <p key={paragraph}>{renderInline(paragraph)}</p>
          ))}
          <div className="bg-muted/50 p-4 rounded-lg text-sm">
            <strong>{eutcha.overviewCallout.title}</strong>
            <ul className="mt-2 mb-0 list-disc list-inside">
              {eutcha.overviewCallout.items.map((item) => (
                <li key={item}>{renderInline(item)}</li>
              ))}
            </ul>
          </div>
        </section>

        {/* Role */}
        <section>
          <h2>담당 역할</h2>
          <p>
            {renderInline(eutcha.roleIntro)}
          </p>
          <ul>
            {eutcha.role.map((item) => (
              <li key={item}>{renderInline(item)}</li>
            ))}
          </ul>
        </section>

        {/* Tech Stack & Rules */}
        {eutcha.extraSections.map((section) => (
          <section key={section.title}>
            <h2>{section.title}</h2>
            <ul>
              {section.items.map((item) => (
                <li key={item}>{renderInline(item)}</li>
              ))}
            </ul>
          </section>
        ))}

      </div>

      <hr className="my-12 border-border" />

      <div className="flex justify-center">
        <Link href="/blog" className="flex items-center justify-center rounded-md border border-input bg-background px-8 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground">
          목록으로 돌아가기
        </Link>
      </div>
    </article>
  );
}
```

- [ ] **Step 4: 기준과 비교한다**

Run: `rtk proxy npx playwright test -g eutcha`
Expected: `2 passed`. 실패하면 데이터 문자열을 원문과 대조해 고친다. 테스트나 기준은 고치지 않는다.

- [ ] **Step 5: 타입 검사와 린트**

Run: `rtk proxy npm run typecheck`
Expected: exit 0

Run: `rtk proxy npx eslint src/data/projects src/app/blog/eutcha/page.tsx`
Expected: 에러 없음

- [ ] **Step 6: 변경 정리와 커밋 메시지 초안을 제출한다 (커밋하지 않음)**

| 파일 | 내용 |
|---|---|
| `src/data/projects/eutcha.ts`, `src/data/projects/index.ts` | EUTCHA 데이터, 목록 추가 |
| `src/app/blog/eutcha/page.tsx` | 내용을 데이터에서 읽도록 수정 |

```
refactor: EUTCHA 글 내용을 데이터로 분리

- 여정 페이지와 같은 내용을 공유하기 위해. 화면은 기준과 픽셀 단위로 같다
- "기술 스택 및 규칙"처럼 이 글에만 있는 섹션은 추가 섹션으로 받아 다른 글의 구조를 건드리지 않았다
```

---

### Task 6: Stock2U

**Files:**
- Create: `src/data/projects/stock2u.ts`
- Modify: `src/data/projects/index.ts`
- Modify: `src/app/blog/stock2u/page.tsx` (전체 교체)

**Interfaces:**
- Consumes: Task 2의 타입·`renderInline`, Task 3의 `projects`·`ProjectLinkIcon`
- Produces: `stock2u` (`@/data/projects/stock2u`)

- [ ] **Step 1: 데이터를 만든다**

`src/data/projects/stock2u.ts`:

```ts
import type { StandardProject } from "./types";

export const stock2u = {
  kind: "standard",
  slug: "stock2u",
  title: "Stock2U",
  period: "2023.09.21 ~ 2023.11.16",
  team: "Team Project (5명)",
  summary: "위치 기반 재고 공유 서비스",
  stack: ["TypeScript", "React", "Chakra UI", "Zustand", "Figma", "Jira"],
  links: [
    {
      kind: "github",
      label: "GitHub Repository",
      href: "https://github.com/geezers-io/Stock2U-front",
    },
    {
      kind: "live",
      label: "Live Demo (Check Note)",
      href: "https://stock2u-front.vercel.app/",
    },
  ],
  screens: [
    {
      src: "/stock2u-thumb.png",
      alt: "Stock2U Project Screenshot",
      width: 719,
      height: 392,
    },
  ],
  overview: [
    "Stock2U는 판매자와 소비자를 연결하는 서비스입니다. 위치 기반으로 재고 상품을 공유하고 판매할 수 있습니다. 해커톤 K-Digital Training 대회 출전용 프로젝트로 시작하여 본선에 진출하는 성과를 거두었습니다.",
  ],
  overviewCallout: {
    title: "개발 인원 (총 5명)",
    items: ["Frontend 3명 (본인 참여)", "Backend 2명"],
  },
  role: [
    "**UI/UX 디자인 및 퍼블리싱**: 메인 페이지의 디자인을 설계하고 반응형 웹으로 구현하여 사용자 접근성을 높였습니다.",
    "**마이페이지 구현**: 일반 사용자와 판매자용 마이페이지를 각각 구현했습니다. 사용자 유형에 따라 맞춤형 기능을 제공했습니다.",
    "**REST API 연동**: 백엔드 API와 프론트엔드를 연동하여 실제 데이터를 처리하고 화면에 표시했습니다.",
  ],
  achievements: [
    "**협업 프로세스 체득**: 백엔드 개발자와 함께한 첫 협업 프로젝트였습니다. Swagger UI로 API 명세서를 확인하고 호출 방식을 논의하면서 효율적인 소통이 얼마나 중요한지 깨달았습니다.",
    "**새로운 툴 적응**: Jira, Figma 등 실무에서 사용되는 협업 툴을 처음 도입했습니다. 프로젝트 관리 및 디자인 커뮤니케이션 능력은 여기서 키웠습니다.",
    "**문제 해결 능력**: PM과 프론트엔드 역할을 병행하며 팀 내 이슈를 조율하고 프로젝트 일정을 관리하는 경험을 했습니다.",
  ],
  note: {
    title: "참고 사항",
    text: "현재 Vercel을 통해 배포된 사이트는 백엔드 서버와의 연결 문제 또는 배포 설정 이슈로 인해 정상적으로 접속되지 않을 수 있습니다. 프로젝트 종료 후 유지보수 기간이 만료되었거나 외부 API 의존성에 문제가 생긴 것으로 짐작합니다. 상세한 코드 구조와 구현 내용은 GitHub 저장소를 참고해 주시기 바랍니다.",
  },
} satisfies StandardProject;
```

`src/data/projects/index.ts`를 다음으로 바꾼다.

```ts
import { eutcha } from "./eutcha";
import { kokoaClone } from "./kokoa-clone";
import { stock2u } from "./stock2u";
import { todoApp } from "./todo-app";
import type { Project } from "./types";

/** 종료일 순서. 여정(/journey)의 정류장 순서와 같다. */
export const projects: Project[] = [kokoaClone, todoApp, eutcha, stock2u];
```

- [ ] **Step 2: 무결성 테스트**

Run: `rtk proxy npx vitest run src/data/projects`
Expected: PASS (1 + 5×4 = 21 tests)

- [ ] **Step 3: 페이지를 데이터로 바꾼다**

`src/app/blog/stock2u/page.tsx` 전체를 다음으로 교체한다. GitHub 링크에만 `text-zinc-700 dark:text-zinc-300`이 붙어 있던 원래 마크업을 그대로 유지한다.

```tsx
import Link from "next/link";
import Image from "next/image";
import { ProjectLinkIcon } from "@/components/ProjectLinkIcon";
import { stock2u } from "@/data/projects/stock2u";
import { renderInline } from "@/lib/inline";

export default function Stock2UPage() {
  const thumbnail = stock2u.screens[0];

  return (
    <article className="container py-10 lg:py-16 max-w-4xl mx-auto">
      {/* Header */}
      <div className="space-y-4 mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{stock2u.period}</span>
          <span>•</span>
          <span>{stock2u.team}</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight lg:text-5xl text-zinc-950 dark:text-zinc-50">
          {stock2u.title}
        </h1>
        <p className="text-xl text-zinc-700 dark:text-zinc-300">
          {renderInline(stock2u.summary)}
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          {stock2u.stack.map((tech) => (
            <span key={tech} className="px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
              {tech}
            </span>
          ))}
        </div>
        <div className="flex gap-4 pt-2">
          {stock2u.links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className={
                link.kind === "github"
                  ? "flex items-center gap-2 text-sm font-medium hover:underline text-zinc-700 dark:text-zinc-300"
                  : "flex items-center gap-2 text-sm font-medium hover:underline"
              }
            >
              <ProjectLinkIcon kind={link.kind} />
              {link.label}
            </a>
          ))}
        </div>
      </div>

      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden rounded-xl border bg-muted mb-12">
        <Image
          src={thumbnail.src}
          alt={thumbnail.alt}
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* Content */}
      <div className="prose prose-zinc dark:prose-invert max-w-none space-y-12 prose-headings:text-zinc-950 dark:prose-headings:text-zinc-50 prose-p:text-zinc-800 dark:prose-p:text-zinc-200 prose-li:text-zinc-800 dark:prose-li:text-zinc-200 prose-strong:text-zinc-900 dark:prose-strong:text-zinc-100">

        {/* Overview */}
        <section>
          <h2>프로젝트 개요</h2>
          {stock2u.overview.map((paragraph) => (
            <p key={paragraph}>{renderInline(paragraph)}</p>
          ))}
          <div className="bg-muted/50 p-4 rounded-lg text-sm">
            <strong>{stock2u.overviewCallout.title}</strong>
            <ul className="mt-2 mb-0 list-disc list-inside">
              {stock2u.overviewCallout.items.map((item) => (
                <li key={item}>{renderInline(item)}</li>
              ))}
            </ul>
          </div>
        </section>

        {/* Role */}
        <section>
          <h2>담당 역할</h2>
          <ul>
            {stock2u.role.map((item) => (
              <li key={item}>{renderInline(item)}</li>
            ))}
          </ul>
        </section>

        {/* Achievements */}
        <section>
          <h2>성과 및 배운 점</h2>
          <ul>
            {stock2u.achievements.map((item) => (
              <li key={item}>{renderInline(item)}</li>
            ))}
          </ul>
        </section>

        {/* Note */}
        <section>
          <div className="border-l-4 border-red-500 bg-red-50 dark:bg-red-950/30 p-4 rounded-r-lg">
            <h3 className="text-red-800 dark:text-red-200 mt-0 mb-2 text-lg font-semibold">{stock2u.note.title}</h3>
            <p className="text-red-700 dark:text-red-300 m-0 text-sm">
              {renderInline(stock2u.note.text)}
            </p>
          </div>
        </section>

      </div>

      <hr className="my-12 border-border" />

      <div className="flex justify-center">
        <Link href="/blog" className="flex items-center justify-center rounded-md border border-input bg-background px-8 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground">
          목록으로 돌아가기
        </Link>
      </div>
    </article>
  );
}
```

- [ ] **Step 4: 기준과 비교한다**

Run: `rtk proxy npx playwright test -g stock2u`
Expected: `2 passed`. 실패하면 데이터 문자열을 원문과 대조해 고친다. 테스트나 기준은 고치지 않는다.

- [ ] **Step 5: 타입 검사와 린트**

Run: `rtk proxy npm run typecheck`
Expected: exit 0

Run: `rtk proxy npx eslint src/data/projects src/app/blog/stock2u/page.tsx`
Expected: 에러 없음

- [ ] **Step 6: 변경 정리와 커밋 메시지 초안을 제출한다 (커밋하지 않음)**

| 파일 | 내용 |
|---|---|
| `src/data/projects/stock2u.ts`, `src/data/projects/index.ts` | Stock2U 데이터, 목록 추가 |
| `src/app/blog/stock2u/page.tsx` | 내용을 데이터에서 읽도록 수정 |

```
refactor: Stock2U 글 내용을 데이터로 분리

- 여정 페이지와 같은 내용을 공유하기 위해. 화면은 기준과 픽셀 단위로 같다
```

---

### Task 7: Tix2U

**Files:**
- Create: `src/data/projects/tix2u.ts`
- Modify: `src/data/projects/index.ts`
- Modify: `src/app/blog/tix2u/page.tsx` (전체 교체)

**Interfaces:**
- Consumes: Task 2의 타입·`renderInline`, Task 3의 `projects`·`ProjectLinkIcon`
- Produces: `tix2u` (`@/data/projects/tix2u`)

- [ ] **Step 1: 데이터를 만든다**

`src/data/projects/tix2u.ts` (원문의 "공연예술통한전산망"도 그대로 둔다):

```ts
import type { StandardProject } from "./types";

export const tix2u = {
  kind: "standard",
  slug: "tix2u",
  title: "Tix2U",
  period: "2023.11.17 ~ 2023.12.22",
  team: "Team Project (FE 2명)",
  summary: "전시, 공연 등 다양한 문화생활 티켓을 구매할 수 있는 서비스",
  stack: ["TypeScript", "Next.js", "React", "Chakra UI", "Supabase", "Figma"],
  links: [
    {
      kind: "github",
      label: "GitHub Repository",
      href: "https://github.com/geezers-io/Tix2U",
    },
    {
      kind: "live",
      label: "Live Demo (Expired)",
      href: "https://tix2u.vercel.app/",
    },
  ],
  screens: [
    {
      src: "/tix2u-thumb.png",
      alt: "Tix2U Project Screenshot",
      width: 720,
      height: 391,
    },
  ],
  overview: [
    "Tix2U는 티켓 구매 서비스입니다. 다양한 문화생활을 즐기고 싶은 20~30대, 그리고 예술의 알고리즘을 탐구하는 사람들을 위해 만들었습니다. 공공 데이터(공연예술통한전산망 API)를 활용하여 실제 공연 정보를 제공하며 개발자 양성 교육과정의 최종 프로젝트로 진행되었습니다.",
  ],
  overviewCallout: {
    title: "목표",
    text: "프론트엔드에서 최대한의 기능을 구현하는 것을 목표로, 기획부터 디자인, 개발, 배포까지 전 과정을 경험했습니다.",
  },
  role: [
    {
      title: "메인 페이지",
      items: [
        "이미지 캐러셀 적용으로 시각적 몰입도 향상",
        "티켓 포스터 이미지 확대/축소 인터랙션 구현",
        "로딩 스피너 및 스켈레톤 UI로 UX 개선",
      ],
    },
    {
      title: "카테고리 및 기능",
      items: [
        "Infinite Scroll로 끊김 없는 리스트 탐색 구현",
        "장바구니 및 찜하기(WishList) 기능 구현",
        "반응형 디자인 및 ErrorBoundary를 통한 에러 처리",
      ],
    },
  ],
  achievements: [
    "**단기간 집중 개발**: 1개월이라는 제한된 시간 안에 기획부터 배포까지의 전 과정을 완주했습니다. 그 과정에서 타임라인 관리 능력을 길렀습니다.",
    "**풀사이클 경험**: 프론트엔드 개발뿐만 아니라 디자인 구성, 서버 구축(Supabase), 배포, 리팩토링까지 경험하며 서비스 전체 구조에 대한 이해를 넓혔습니다.",
    "**사용자 중심 UI/UX**: 스켈레톤 UI, 무한 스크롤 등 사용자의 편의성을 고려한 다양한 인터페이스 패턴을 직접 구현했습니다.",
  ],
  note: {
    title: "참고 사항",
    text: "현재 배포된 Vercel 페이지는 데이터가 정상적으로 로드되지 않을 수 있습니다. 연동된 공공 데이터 API의 URL이 만료되었기 때문입니다. 프로젝트의 소스 코드와 상세 구현 내용은 GitHub 저장소를 통해 확인해 주시면 감사하겠습니다.",
  },
} satisfies StandardProject;
```

`src/data/projects/index.ts`를 다음으로 바꾼다.

```ts
import { eutcha } from "./eutcha";
import { kokoaClone } from "./kokoa-clone";
import { stock2u } from "./stock2u";
import { tix2u } from "./tix2u";
import { todoApp } from "./todo-app";
import type { Project } from "./types";

/** 종료일 순서. 여정(/journey)의 정류장 순서와 같다. */
export const projects: Project[] = [kokoaClone, todoApp, eutcha, stock2u, tix2u];
```

- [ ] **Step 2: 무결성 테스트**

Run: `rtk proxy npx vitest run src/data/projects`
Expected: PASS (1 + 5×5 = 26 tests)

- [ ] **Step 3: 페이지를 데이터로 바꾼다**

`src/app/blog/tix2u/page.tsx` 전체를 다음으로 교체한다.

```tsx
import Link from "next/link";
import Image from "next/image";
import { ProjectLinkIcon } from "@/components/ProjectLinkIcon";
import { tix2u } from "@/data/projects/tix2u";
import { renderInline } from "@/lib/inline";

export default function Tix2UPage() {
  const thumbnail = tix2u.screens[0];

  return (
    <article className="container py-10 lg:py-16 max-w-4xl mx-auto">
      {/* Header */}
      <div className="space-y-4 mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{tix2u.period}</span>
          <span>•</span>
          <span>{tix2u.team}</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight lg:text-5xl text-zinc-950 dark:text-zinc-50">
          {tix2u.title}
        </h1>
        <p className="text-xl text-zinc-700 dark:text-zinc-300">
          {renderInline(tix2u.summary)}
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          {tix2u.stack.map((tech) => (
            <span key={tech} className="px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
              {tech}
            </span>
          ))}
        </div>
        <div className="flex gap-4 pt-2">
          {tix2u.links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className={
                link.kind === "github"
                  ? "flex items-center gap-2 text-sm font-medium hover:underline text-zinc-700 dark:text-zinc-300"
                  : "flex items-center gap-2 text-sm font-medium hover:underline"
              }
            >
              <ProjectLinkIcon kind={link.kind} />
              {link.label}
            </a>
          ))}
        </div>
      </div>

      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden rounded-xl border bg-muted mb-12">
        <Image
          src={thumbnail.src}
          alt={thumbnail.alt}
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* Content */}
      <div className="prose prose-zinc dark:prose-invert max-w-none space-y-12 prose-headings:text-zinc-950 dark:prose-headings:text-zinc-50 prose-p:text-zinc-800 dark:prose-p:text-zinc-200 prose-li:text-zinc-800 dark:prose-li:text-zinc-200 prose-strong:text-zinc-900 dark:prose-strong:text-zinc-100">

        {/* Overview */}
        <section>
          <h2>프로젝트 개요</h2>
          {tix2u.overview.map((paragraph) => (
            <p key={paragraph}>{renderInline(paragraph)}</p>
          ))}
          <div className="bg-muted/50 p-4 rounded-lg text-sm">
            <strong>{tix2u.overviewCallout.title}</strong>
            <p className="mt-2 mb-0">
              {renderInline(tix2u.overviewCallout.text)}
            </p>
          </div>
        </section>

        {/* Role */}
        <section>
          <h2>담당 역할</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {tix2u.role.map((group) => (
              <div key={group.title}>
                <h3 className="text-lg font-semibold mt-0">{group.title}</h3>
                <ul>
                  {group.items.map((item) => (
                    <li key={item}>{renderInline(item)}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Achievements */}
        <section>
          <h2>성과 및 배운 점</h2>
          <ul>
            {tix2u.achievements.map((item) => (
              <li key={item}>{renderInline(item)}</li>
            ))}
          </ul>
        </section>

        {/* Note */}
        <section>
          <div className="border-l-4 border-orange-500 bg-orange-50 dark:bg-orange-950/30 p-4 rounded-r-lg">
            <h3 className="text-orange-800 dark:text-orange-200 mt-0 mb-2 text-lg font-semibold">{tix2u.note.title}</h3>
            <p className="text-orange-700 dark:text-orange-300 m-0 text-sm">
              {renderInline(tix2u.note.text)}
            </p>
          </div>
        </section>

      </div>

      <hr className="my-12 border-border" />

      <div className="flex justify-center">
        <Link href="/blog" className="flex items-center justify-center rounded-md border border-input bg-background px-8 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground">
          목록으로 돌아가기
        </Link>
      </div>
    </article>
  );
}
```

- [ ] **Step 4: 기준과 비교한다**

Run: `rtk proxy npx playwright test -g tix2u`
Expected: `2 passed`. 실패하면 데이터 문자열을 원문과 대조해 고친다. 테스트나 기준은 고치지 않는다.

- [ ] **Step 5: 타입 검사와 린트**

Run: `rtk proxy npm run typecheck`
Expected: exit 0

Run: `rtk proxy npx eslint src/data/projects src/app/blog/tix2u/page.tsx`
Expected: 에러 없음

- [ ] **Step 6: 변경 정리와 커밋 메시지 초안을 제출한다 (커밋하지 않음)**

| 파일 | 내용 |
|---|---|
| `src/data/projects/tix2u.ts`, `src/data/projects/index.ts` | Tix2U 데이터, 목록 추가 |
| `src/app/blog/tix2u/page.tsx` | 내용을 데이터에서 읽도록 수정 |

```
refactor: Tix2U 글 내용을 데이터로 분리

- 여정 페이지와 같은 내용을 공유하기 위해. 화면은 기준과 픽셀 단위로 같다
- 담당 역할이 소제목 묶음이라 묶음 단위 데이터로 받아 두 열 레이아웃을 그대로 살렸다
```

---

### Task 8: PFPlay

**Files:**
- Create: `src/data/projects/pfplay.ts`
- Modify: `src/data/projects/index.ts`
- Modify: `src/app/blog/pfplay/page.tsx` (전체 교체)

**Interfaces:**
- Consumes: Task 2의 타입·`renderInline`(`strongClassName` 사용), Task 3의 `projects`·`ProjectLinkIcon`
- Produces: `pfplay` (`@/data/projects/pfplay`)

- [ ] **Step 1: 데이터를 만든다**

`src/data/projects/pfplay.ts`:

```ts
import type { StandardProject } from "./types";

export const pfplay = {
  kind: "standard",
  slug: "pfplay",
  title: "PFPlay",
  period: "2024.08.04 ~ 2025.02.02",
  team: "Team Project",
  summary: "PFP NFT와 디제잉을 결합한 소셜 플랫폼",
  stack: ["TypeScript", "Next.js", "React", "Tailwind CSS", "Zustand", "Jest", "Storybook"],
  links: [
    {
      kind: "github",
      label: "GitHub Repository",
      href: "https://github.com/pfplay/pfplay-web",
    },
  ],
  screens: [
    {
      src: "/pfplay-thumb.png",
      alt: "PFPlay Project Screenshot",
      width: 1024,
      height: 601,
    },
  ],
  overview: [
    "PFPlay는 PFP(Profile Picture) NFT와 디제잉 문화를 결합한 Web3 기반 소셜 플랫폼입니다. 사용자는 자신의 NFT를 활용해 아이덴티티를 표현하고 음악을 통해 다른 사용자들과 소통할 수 있습니다.",
  ],
  overviewCallout: {
    title: "개발 인원 (총 9명)",
    items: ["PM 2명", "Frontend 3명 (본인 참여)", "Backend 2명", "Design 1명", "Marketing 1명"],
  },
  role: [
    "**디제잉 규칙 안내 모달**을 구현했습니다. 디제잉 등록 전 사용자에게 필수 규칙을 안내해 UX 흐름을 개선했습니다.",
    "**로그인 페이지 개편**: 기존 로그인 페이지의 UI/UX를 전면적으로 리뉴얼해 사용자 접근성을 끌어올렸습니다.",
  ],
  achievements: [
    "**실무 수준의 프론트엔드 환경 경험**: 글로벌 사용자 대상의 Web3 플랫폼을 개발하며 다국어 지원(i18n), 디자인 시스템 구축(Storybook) 등 최신 개발 트렌드를 실전에서 익혔습니다.",
    "**협업 커뮤니케이션 능력**이 늘었습니다. PM, 백엔드, 디자이너, 마케터 등 다양한 직군과 긴밀하게 협업하며 대규모 프로젝트의 워크플로우를 이해했습니다.",
    "**UX 중심의 기능 구현**: 단순히 기능만 구현하고 끝내지 않았습니다. 사용자 경험(UX)을 고려해 모달과 로그인 페이지를 설계했고 서비스 품질을 높였습니다.",
    "**코드 품질 및 유지보수**: 실무 멘토링을 통해 유지보수 가능한 코드 작성법과 컴포넌트 설계 원칙을 학습하고 적용했습니다.",
  ],
  note: {
    title: "참고 사항",
    text: "본 프로젝트는 투자 유치 및 수익 구조 설계 단계까지 진행되었으나, 개인적인 취업 준비 기간이 길어짐에 따라 부득이하게 중도 하차하게 되었습니다. 비록 끝까지 함께하지는 못했지만, 초기 기획부터 핵심 기능 구현 단계까지 열정적으로 참여하며 많은 성장을 이룬 프로젝트입니다.",
  },
} satisfies StandardProject;
```

`src/data/projects/index.ts`를 다음으로 바꾼다.

```ts
import { eutcha } from "./eutcha";
import { kokoaClone } from "./kokoa-clone";
import { pfplay } from "./pfplay";
import { stock2u } from "./stock2u";
import { tix2u } from "./tix2u";
import { todoApp } from "./todo-app";
import type { Project } from "./types";

/** 종료일 순서. 여정(/journey)의 정류장 순서와 같다. */
export const projects: Project[] = [kokoaClone, todoApp, eutcha, stock2u, tix2u, pfplay];
```

- [ ] **Step 2: 무결성 테스트**

Run: `rtk proxy npx vitest run src/data/projects`
Expected: PASS (1 + 5×6 = 31 tests)

- [ ] **Step 3: 페이지를 데이터로 바꾼다**

`src/app/blog/pfplay/page.tsx` 전체를 다음으로 교체한다. 이 글은 `prose`를 쓰지 않고 `<strong>`마다 색 클래스를 붙였다. `strongClassName`으로 같은 마크업을 낸다.

```tsx
import Link from "next/link";
import Image from "next/image";
import { ProjectLinkIcon } from "@/components/ProjectLinkIcon";
import { pfplay } from "@/data/projects/pfplay";
import { renderInline } from "@/lib/inline";

// 이 글은 prose를 쓰지 않아 굵은 글씨마다 색을 직접 붙인다.
const STRONG = "text-zinc-900 dark:text-zinc-100";

export default function PFPlayPage() {
  const thumbnail = pfplay.screens[0];

  return (
    <article className="container py-10 lg:py-16 max-w-4xl mx-auto">
      {/* Header */}
      <div className="space-y-4 mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{pfplay.period}</span>
          <span>•</span>
          <span>{pfplay.team}</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight lg:text-5xl text-zinc-950 dark:text-zinc-50">
          {pfplay.title}
        </h1>
        <p className="text-xl text-zinc-700 dark:text-zinc-300">
          {renderInline(pfplay.summary)}
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          {pfplay.stack.map((tech) => (
            <span key={tech} className="px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
              {tech}
            </span>
          ))}
        </div>
        <div className="flex gap-4 pt-2">
          {pfplay.links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className={
                link.kind === "github"
                  ? "flex items-center gap-2 text-sm font-medium hover:underline text-zinc-700 dark:text-zinc-300"
                  : "flex items-center gap-2 text-sm font-medium hover:underline"
              }
            >
              <ProjectLinkIcon kind={link.kind} />
              {link.label}
            </a>
          ))}
        </div>
      </div>

      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden rounded-xl border bg-muted mb-12">
        <Image
          src={thumbnail.src}
          alt={thumbnail.alt}
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* Content */}
      <div className="max-w-none space-y-12">

        {/* Overview */}
        <section>
          <h2 className="text-2xl font-bold mb-4 text-zinc-950 dark:text-zinc-50">프로젝트 개요</h2>
          {pfplay.overview.map((paragraph) => (
            <p key={paragraph} className="text-zinc-800 dark:text-zinc-200 mb-4">
              {renderInline(paragraph, { strongClassName: STRONG })}
            </p>
          ))}
          <div className="bg-muted/50 p-4 rounded-lg text-sm">
            <strong className={STRONG}>{pfplay.overviewCallout.title}</strong>
            <ul className="mt-2 mb-0 list-disc list-inside text-zinc-800 dark:text-zinc-200">
              {pfplay.overviewCallout.items.map((item) => (
                <li key={item}>{renderInline(item, { strongClassName: STRONG })}</li>
              ))}
            </ul>
          </div>
        </section>

        {/* Role */}
        <section>
          <h2 className="text-2xl font-bold mb-4 text-zinc-950 dark:text-zinc-50">담당 역할</h2>
          <ul className="space-y-3 list-disc list-inside text-zinc-800 dark:text-zinc-200">
            {pfplay.role.map((item) => (
              <li key={item}>{renderInline(item, { strongClassName: STRONG })}</li>
            ))}
          </ul>
        </section>

        {/* Achievements */}
        <section>
          <h2 className="text-2xl font-bold mb-4 text-zinc-950 dark:text-zinc-50">성과 및 배운 점</h2>
          <ul className="space-y-3 list-disc list-inside text-zinc-800 dark:text-zinc-200">
            {pfplay.achievements.map((item) => (
              <li key={item}>{renderInline(item, { strongClassName: STRONG })}</li>
            ))}
          </ul>
        </section>

        {/* Background Note */}
        <section>
          <div className="border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30 p-4 rounded-r-lg">
            <h3 className="text-yellow-800 dark:text-yellow-200 mt-0 mb-2 text-lg font-semibold">{pfplay.note.title}</h3>
            <p className="text-yellow-700 dark:text-yellow-300 m-0 text-sm">
              {renderInline(pfplay.note.text, { strongClassName: STRONG })}
            </p>
          </div>
        </section>

      </div>

      <hr className="my-12 border-border" />

      <div className="flex justify-center">
        <Link href="/blog" className="flex items-center justify-center rounded-md border border-input bg-background px-8 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground">
          목록으로 돌아가기
        </Link>
      </div>
    </article>
  );
}
```

- [ ] **Step 4: 기준과 비교한다**

Run: `rtk proxy npx playwright test -g pfplay`
Expected: `2 passed`. 실패하면 데이터 문자열을 원문과 대조해 고친다. 테스트나 기준은 고치지 않는다.

- [ ] **Step 5: 타입 검사와 린트**

Run: `rtk proxy npm run typecheck`
Expected: exit 0

Run: `rtk proxy npx eslint src/data/projects src/app/blog/pfplay/page.tsx`
Expected: 에러 없음

- [ ] **Step 6: 변경 정리와 커밋 메시지 초안을 제출한다 (커밋하지 않음)**

| 파일 | 내용 |
|---|---|
| `src/data/projects/pfplay.ts`, `src/data/projects/index.ts` | PFPlay 데이터, 목록 추가 |
| `src/app/blog/pfplay/page.tsx` | 내용을 데이터에서 읽도록 수정 |

```
refactor: PFPlay 글 내용을 데이터로 분리

- 여정 페이지와 같은 내용을 공유하기 위해. 화면은 기준과 픽셀 단위로 같다
- 이 글만 굵은 글씨에 색 클래스를 직접 붙여서 렌더러에 클래스를 넘겨 같은 마크업을 냈다
```

---

### Task 9: PiCKCARE

**Files:**
- Create: `src/data/projects/pickcare.ts`
- Modify: `src/data/projects/index.ts`
- Modify: `src/app/blog/pickcare/page.tsx` (본문 부분 교체, `metadata`·`Case`·`Repo`는 유지)

**Interfaces:**
- Consumes: Task 2의 타입·`renderInline`, Task 3의 `projects`
- Produces: `pickcare` (`@/data/projects/pickcare`)

- [ ] **Step 1: 데이터를 만든다**

`src/data/projects/pickcare.ts` (원문의 "작업량이 습니다"는 사용자 결정으로 그대로 둔다. 저장소 화면 이미지는 2단계에서 채운다):

```ts
import type { ReposProject } from "./types";

export const pickcare = {
  kind: "repos",
  slug: "pickcare",
  title: "PiCKCARE",
  period: "2025.09 ~ 진행중",
  team: "프론트엔드 단독",
  summary:
    "반려동물 스타트업의 프론트엔드를 단독으로 맡아, 메인 서비스부터 B2B CRM·스튜디오·네이티브 앱·사내 자동화 도구까지 다섯 개 저장소를 만들었습니다.",
  stack: ["Next.js", "React", "TypeScript", "React Native", "TanStack Query", "Playwright"],
  links: [],
  screens: [],
  repos: [
    {
      name: "pickcare-frontend",
      tagline:
        "반려동물 케어 플랫폼의 메인 서비스. 커뮤니티·매거진·마켓·픽스팟(장소 찾기)을 담은 Next.js App Router 앱입니다.",
      stack: [
        "Next.js 16",
        "React 19",
        "TypeScript",
        "TanStack Query 5",
        "Redux Toolkit",
        "Zustand",
        "TipTap 3",
        "Tailwind",
        "Sentry",
        "Vitest",
        "Playwright",
      ],
      screens: [],
      cases: [
        {
          title: "인증 토큰을 브라우저 JS에서 걷어낸 HttpOnly 쿠키 전환 + single-flight 리프레시",
          problem: [
            "access·refresh 토큰을 js-cookie로 브라우저 JS가 직접 읽고 썼습니다. XSS 한 번이면 세션이 통째로 털리는 구조였습니다.",
            "apiClient가 헤더 부착·메모리 토큰 보관·선제 갱신을 전부 떠안아 313줄까지 부풀어 있었습니다.",
            "같은 시점에 401이 여러 개 터지면 리프레시 요청이 그 수만큼 나갔고, 멀티탭에서 한 탭이 로그아웃해도 다른 탭은 로그인 상태로 남았습니다.",
            "카카오 OAuth 콜백에 state 검증이 없어 CSRF에 열려 있었습니다.",
          ],
          solution: [
            "두 단계로 나눠 옮겼습니다. 1단계는 axios withCredentials 전환과 쿠키 직접 접근 제거, 부팅 시 silent refresh 도입, 카카오 state를 매 진입마다 발급해 콜백에서 검증하는 것까지.",
            "2단계로 authSlice의 토큰 필드와 액션을 전부 없애 프론트가 토큰을 아예 들고 있지 않게 했습니다. apiClient에는 401 감지 후 재시도만 남겼습니다.",
            "인증 인프라를 authSession · authRefresh · fetchWithAuthRetry · authBroadcast 네 모듈로 쪼갰습니다.",
            "리프레시는 single-flight 큐로 직렬화하되, 락 상태를 globalThis에 박아 HMR이나 모듈 이중 로드에도 큐가 갈라지지 않게 했습니다. axios 인터셉터와 SSE raw fetch가 같은 큐를 씁니다.",
            "BroadcastChannel로 멀티탭 로그아웃을 맞추고, 수신 시 현재 경로를 저장해 재로그인 후 돌아오게 했습니다.",
            "API base URL이 프로덕션에서 비면 요청이 자기 origin으로 새어 전 사용자가 동시에 로그아웃되므로, 그 경우 아예 throw하도록 막았습니다.",
          ],
          result: [
            "apiClient 313줄 → 137줄. 기능은 늘었는데 코드는 절반 이하가 됐습니다.",
            "authSlice 150줄 → 80줄. 2단계 커밋 단독으로 21개 파일 순 240줄 삭제.",
            "동시 401이 몇 개가 터져도 리프레시는 1회만 나갑니다.",
            "브라우저 JS가 토큰을 보관하지도 접근하지도 않는 구조로 전환. 서버 사이드에서만 쿠키를 읽습니다.",
          ],
        },
        {
          title: "iOS에서만 죽는 크래시를 커밋 단위 이분 탐색으로 추적해 회피책 없이 해결",
          problem: [
            "픽스팟 목록 페이지가 iOS 사파리에서만 렌더러 크래시로 죽었습니다. 데스크톱 크롬과 안드로이드는 멀쩡했고 로컬 재현도 안 되며 스택도 안 남았습니다.",
            "그 페이지는 전국 17개 시도 선택 모달을 품은 55KB짜리 단일 컴포넌트(1,272줄)였습니다. 후보가 너무 많아 코드만 읽어서는 좁힐 수 없었습니다.",
          ],
          solution: [
            "가설을 하나씩 배포해 실기기에서 확인하는 방식으로 범위를 좁혔습니다. 파일명 인코딩 → 이미지 최적화 파이프라인 → CSS 배경 전환 → enum 인라인화 → 상수 제거 순으로 변수를 하나씩 소거했습니다.",
            "여기서 원인이 이미지가 아니라 hydration 쪽이라는 판단으로 방향을 틀었습니다. useSearchParams를 Suspense 없이 쓰면 App Router가 컴포넌트 전체를 동기 hydrate 한다는 걸 확인했습니다.",
            "클라이언트 전용 렌더링을 걸어 크래시가 멈추는 것까지 보고, 55KB 컴포넌트의 동기 hydration이 WebKit 렌더러 메모리를 넘긴다는 쪽으로 원인을 확정했습니다.",
            "다만 그렇게 덮으면 SSR과 SEO를 잃습니다. 회피책을 되돌리고 컴포넌트 자체를 줄였습니다. useState 17개를 Record 하나로 묶고, useEffect 의존성 23개를 7개로, 17-way 삼항 체인 5곳을 단일 조회로 바꿨습니다.",
          ],
          result: [
            "마지막 커밋 단독으로 파일이 1,272줄 → 1,138줄.",
            "회피책을 걷어내고 점진 hydration으로 복귀 — SSR과 SEO를 유지한 채 크래시를 없앴습니다.",
            "원인 추적부터 근본 수정까지 9커밋 1시간 54분.",
            "이후 같은 페이지에서 재발한 커밋은 없습니다.",
          ],
        },
        {
          title: "ProseMirror까지 내려가 만든 서비스 전용 리치 텍스트 에디터",
          problem: [
            "매거진·커뮤니티·공지에 이미지 그룹, 슬라이더, 콜라주, 장소 카드, 투표 같은 서비스 고유 블록이 필요했는데 기성 에디터의 확장 API만으로는 붙지 않았습니다.",
            "이미지 드래그 정렬에서 브라우저 HTML5 DnD와 dnd-kit이 트랜잭션을 이중으로 발행해 윈도우에서 이미지가 복제됐습니다.",
            "클립보드 이미지 붙여넣기는 외부 URL·SVG 마크업·문서 내 총량 같은 케이스를 감당할 수 없어 아예 막아둔 상태였습니다.",
            "에디터와 TipTap이 에디터를 쓰지 않는 페이지의 초기 번들에까지 실려 있었고, 장식용 폰트가 전 페이지에서 preload 되고 있었습니다.",
          ],
          solution: [
            "TipTap Node·Extension·Mark를 16종 직접 구현했습니다. 그중 7개 파일은 ProseMirror Plugin API를 직접 씁니다.",
            "붙여넣기를 차단에서 실제 삽입으로 전환하면서 외부 URL의 dataURL 변환, SVG 판별, 행당 5장·문서 총량 상한, 실패 시 폴백 안내를 붙였습니다.",
            "드래그 복제 버그는 트랜잭션과 DOM 레벨에 진단 로그를 심어 원인을 이중 처리 충돌로 확정한 뒤 해결하고, 로그는 개발 모드 게이트로 정리했습니다.",
            "에디터를 호출처 7곳 전부에서 동적 import로 떼어내 에디터 페이지에서만 받도록 하고, 장식용 폰트 10종의 preload를 껐습니다.",
          ],
          result: [
            "에디터 계열 코드 14,226줄 — 커스텀 익스텐션 2,734줄에 에디터·노드뷰·툴바 11,492줄.",
            "단일 파일 5,503줄짜리 에디터가 초기 번들에서 빠졌습니다.",
            "폰트 preload 링크 238개 → 0개 (커밋 기록 기준).",
            "이미지 크기 정규화와 정렬 로직은 순수 함수로 빼내 회귀 테스트로 고정했습니다.",
          ],
        },
        {
          title: "테스트가 0이던 프론트에 2층 자동화 테스트와 CI 구축",
          problem: [
            "프론트에 자동화 테스트가 전혀 없었고 회귀 검증은 전부 수동 QA였습니다.",
            "E2E를 붙이려 해도 테스트가 실수로 운영 API나 CDN을 때릴 위험이 있어 도입이 막혀 있었습니다.",
            "dev 서버의 첫 컴파일 지연 때문에 CI에서 E2E가 산발적으로 깨졌습니다.",
          ],
          solution: [
            "Vitest로 순수 함수를, Playwright로 E2E를 맡는 2층 구성으로 잡았습니다. 테스트 가능한 순수 함수를 먼저 뽑아내는 리팩터링을 같이 했습니다.",
            "E2E용 ApiMock 클래스를 직접 만들었습니다. 모든 요청을 가로채고 운영 도메인은 물리적으로 abort 시켜, 운영 API 호출이 구조적으로 불가능하게 했습니다.",
            "로그인·어드민·가입대기 세 종류 세션을 fixture로 주입해 권한 게이트 시나리오를 덮었습니다.",
            "CI E2E를 dev 서버가 아니라 프로덕션 빌드 산출물로 돌려 첫 컴파일 race 노이즈를 없앴습니다.",
          ],
          result: [
            "단위 테스트 파일 19개 / describe 71개 / 테스트 172개, 전부 통과.",
            "E2E 시나리오 130개, 스펙 17파일. 브라우저 프로젝트는 Chromium과 WebKit 4종으로 구성하고, CI는 속도를 위해 Chromium 2종만 돌립니다.",
            "API를 전부 모킹하므로 CI에 secret이 필요 없습니다.",
            "E2E가 운영 도메인을 건드리면 즉시 실패합니다. 사고를 정책이 아니라 코드로 막았습니다.",
          ],
        },
        {
          title: "불필요한 서버 왕복과 중복 호출을 원인별로 제거한 성능 개선",
          problem: [
            "행사 목록에서 필터를 누를 때마다 서버 컴포넌트가 재실행돼 행사 100건을 다시 받아왔습니다. 정작 필터링은 클라이언트가 다시 했으므로 왕복 전체가 낭비였습니다.",
            "픽스팟 목록은 초기화 이펙트가 마운트마다 새 빈 객체를 반환해 참조가 바뀌었고, 그게 연쇄 재조회를 일으켰습니다.",
            "타인 프로필 팝오버가 프로필·펫·성장 API를 따로 호출했습니다.",
            "지역과 업종을 곱한 SEO 페이지를 빌드마다 정적 생성해 빌드 비용이 계속 불어났습니다.",
          ],
          solution: [
            "원인마다 다른 처방을 붙였습니다. 행사 목록은 router.replace를 history.replaceState로 바꿔 URL만 맞추고 서버 요청은 끊었습니다. 매 렌더 새 객체라 무력화돼 있던 하위 useMemo도 같이 살아났습니다.",
            "픽스팟은 값이 같으면 이전 참조를 그대로 반환하게 고쳤습니다.",
            "프로필 팝오버는 통합 응답에서 필요한 것을 추출하되 훅 반환 형태는 그대로 둬 UI에 영향이 가지 않게 했습니다.",
            "SEO 페이지는 상위 레벨만 정적 생성하고 나머지는 ISR로 넘겼습니다. sitemap도 상한을 둔 동적 생성으로 다시 썼습니다.",
            "그 밖에 모달 5개 동적 import, 이미지 WebP 일괄 전환, next/image 전면 적용을 했습니다. AVIF는 실측해보니 WebP보다 느리고 커서 포맷에서 뺐습니다.",
          ],
          result: [
            "필터 클릭 시 나가던 서버 요청 1건 → 0건 (브라우저에서 확인, 커밋 기록 기준).",
            "픽스팟 목록 조회 9건 → 3건, 프로필 팝오버 3회 → 1회 (커밋 기록 기준).",
            "빌드 시 정적 생성 페이지 893개 → 수십 개 (커밋 기록 기준).",
            "next/image 적용 131파일, 남은 원시 img 태그 5곳.",
          ],
        },
      ],
    },
    {
      name: "pickcare-biz",
      tagline:
        "반려동물 매장 사장님용 멀티테넌트 CRM. 예약 캘린더, 고객·반려동물 차트, 매출 분석을 담은 어드민입니다.",
      stack: [
        "Next.js 16",
        "React 19",
        "React Compiler",
        "Tailwind v4",
        "TanStack Table",
        "FullCalendar",
        "Tremor",
        "MSW",
        "Zustand",
        "Vitest",
      ],
      screens: [],
      cases: [
        {
          title: "백엔드 없이 먼저 개발하기 — 목 백엔드와 계약 테스트 분리",
          problem: [
            "초반에 백엔드 API가 아직 없어 UI를 먼저 만들어야 했습니다.",
            "하드코딩 목으로는 검색·정렬·페이지네이션·404 같은 실제 동작을 확인할 수 없었습니다.",
            "나중에 실 API가 붙는 시점에 스펙이 어긋나면 그때 가서야 터집니다.",
          ],
          solution: [
            "MSW로 인메모리 목 백엔드를 세웠습니다. 핸들러가 실제 저장소처럼 동작해 검색·정렬·페이지네이션·에러까지 재현됩니다.",
            "테스트를 계층별로 나눠, 평소에는 목을 상대로 빠르게 돌리고 실 백엔드를 상대로 하는 계약 테스트는 별도 명령으로 분리했습니다.",
            "그래서 '목이 관대해서 통과하던 것'을 계약 테스트가 잡아냅니다.",
          ],
          result: [
            "목 핸들러 63개, 핸들러 정의 910줄과 인메모리 DB 526줄.",
            "테스트 13파일 90개가 3.41초에 전부 통과.",
            "백엔드 준비 여부와 무관하게 화면 개발이 진행됐습니다.",
          ],
        },
        {
          title: "단일 매장에서 업체 + 다중 서비스 매장 모델로 전환",
          problem: [
            "초기 모델은 '회사 하나 = 매장 하나 = 미용'이었습니다. 이후 한 업체가 미용·유치원·호텔을 같이 하고, 같은 업종의 지점이 여러 개일 수 있게 요구가 바뀌었습니다.",
            "메뉴 노출이 로컬 상태에 걸려 있어 실제 계약과 무관하게 보였고, 미보유 서비스 URL을 직접 치면 그대로 들어가졌습니다.",
            "모든 조회가 '어느 매장 데이터인지' 모르는 상태라 지점이 늘면 데이터가 섞입니다.",
          ],
          solution: [
            "타입과 API를 업체 아래 서비스 매장 배열이 붙는 구조로 다시 정의하고, 노출 판단 근거를 로컬 상태에서 로그인 응답의 실데이터로 바꿨습니다.",
            "업종별 라우트 세그먼트를 만들고 각 레이아웃에 가드를 걸었습니다. 다만 매장 정보가 아직 확정되지 않은 로딩 중에는 통과시키고, 미보유가 확정된 경우에만 막아 초기 깜빡임을 없앴습니다.",
            "매장 컨텍스트 헬퍼 3종을 만들어 배선 규칙을 하나로 모았습니다. 선택 매장이 현재 업종에 속하면 그것을, 아니면 그 업종의 첫 매장으로 떨어지는 규칙을 헬퍼 안에 가뒀습니다.",
            "스위처를 업종 단위에서 매장 단위로 바꾸되 라벨을 분기해, 업종당 매장이 하나인 기존 사용자에게는 이전과 똑같이 보이게 했습니다.",
          ],
          result: [
            "17개 커밋 / 56개 파일 / +1,385 −381 규모의 구조 전환.",
            "고객 조회 7곳, 펫 조회 7곳, 대시보드 지표 5곳을 매장 기준으로 전환.",
            "회귀 테스트 15건을 함께 추가해 전부 통과.",
            "목 데이터도 같은 모델로 갱신해 매장별 등급 기준이 독립인지를 통합 테스트로 검증.",
          ],
        },
        {
          title: "폰트만이 아니라 레이아웃 치수까지 함께 커지는 글자 크기 프리셋",
          problem: [
            "주 사용자가 시니어 매장 사장님이라 기본 폰트로는 읽기 어렵다는 요구가 있었습니다.",
            "브라우저 확대나 폰트만 키우는 방식은 사이드바 폭·캘린더 슬롯 높이·버튼 높이가 그대로여서 글자가 잘리거나 카드 밖으로 튀어나갔습니다. 실제로 같은 종류의 회귀가 반복해서 올라왔습니다.",
            "게다가 커스텀 폰트 토큰을 쓰면 tailwind-merge가 이를 색상 클래스로 오인해 글자색을 지워버리는 버그까지 있었습니다.",
          ],
          solution: [
            "html 속성 하나로 폰트 10종·여백 4종·컴포넌트 치수 8종을 동시에 바꾸는 CSS 변수 스케일을 4단계로 정의했습니다.",
            "각 값의 근거를 주석에 남겼습니다. 본문 16px, 테이블 14px, 터치 타겟 44px 같은 값은 디자인 가이드라인에서 가져왔습니다.",
            "Tailwind v4의 인라인 테마로 변수를 유틸리티로 노출해, 컴포넌트가 프리셋의 존재를 몰라도 자동으로 반응하게 했습니다.",
            "선택값은 저장하되 재수화 시점에 DOM 속성을 직접 세팅해 새로고침 후 깜빡임을 없앴습니다.",
            "tailwind-merge 버그는 호출부를 고치는 대신 커스텀 토큰을 폰트 크기 그룹으로 등록해 공용 유틸 한 곳에서 끝냈습니다.",
          ],
          result: [
            "프리셋당 22개 변수 × 4단계 = 88개 값이 단일 소스에서 나옵니다.",
            "88개 파일에서 반응형 타이포 유틸을 613회 사용 — 앱 전역이 프리셋에 반응합니다.",
            "tailwind-merge 수정은 2파일 24줄로, 같은 패턴의 잠재 버그까지 함께 없앴습니다.",
            "시니어용 간소 모드는 폰트·테마와 독립된 축으로 분리해 조합할 수 있게 했습니다.",
          ],
        },
      ],
    },
    {
      name: "pickcare-studio",
      tagline:
        "반려동물 업종 특화 웹사이트 제작 스튜디오. 섹션 카탈로그와 업종별 데모 템플릿을 담았습니다.",
      stack: ["Next.js 16", "Tailwind", "TypeScript", "Embla", "Lenis"],
      screens: [],
      cases: [
        {
          title: "섹션 코드를 한 줄도 안 고치고 업종 테마를 갈아끼우는 토큰 시스템",
          problem: [
            "업종별 데모 사이트를 계속 늘려야 하는 구조였습니다.",
            "색상과 라운드가 컴포넌트에 박히면 업종이 하나 늘 때마다 섹션 전체를 복제해야 하고, 브랜드 색 하나 바꾸는 데도 전 파일을 훑어야 합니다.",
            "게다가 한 페이지 안에서 스튜디오 자신의 UI와 고객 데모 UI가 다른 색으로 공존해야 해서, 전역 테마 전환만으로는 안 됐습니다.",
          ],
          solution: [
            "Tailwind의 색상과 라운드를 값이 아니라 CSS 변수 참조로 매핑해, 토큰만 바꾸면 유틸리티 클래스 전체가 따라오게 했습니다.",
            "테마별 스코프 블록 안에서만 토큰을 재정의했습니다. 전역이 아니라 서브트리 단위 리스킨이라 한 페이지에 여러 테마가 같이 삽니다.",
            "컴포넌트는 시맨틱 토큰만 쓰고 원색 클래스를 쓰지 않는 규칙을 정하고, 각 템플릿 레이아웃이 최상단에 테마를 걸어 하위 섹션 전부를 바꿉니다.",
          ],
          result: [
            "테마 5종에 기본까지 6개 룩앤필을 165줄짜리 CSS 하나로 관리.",
            "시맨틱 토큰이 223개 파일에서 2,169회 쓰여, 166개 섹션이 테마와 무관하게 재사용됩니다.",
            "신규 업종 템플릿을 하나 더할 때 든 실제 비용은 커밋 전체 219줄 추가. 기존 섹션 컴포넌트 수정은 4줄이 전부였습니다.",
          ],
        },
        {
          title: "스크린샷이 아니라 실제 컴포넌트가 도는 섹션 카탈로그",
          problem: [
            "고객에게 '이런 섹션 중에 고르세요'를 보여줘야 하는데, 스크린샷 카탈로그는 호버·드래그·자동재생 같은 실제 동작을 못 보여주고 코드가 바뀌면 바로 거짓말이 됩니다.",
            "섹션이 100개를 넘어가면 카탈로그 페이지도 그만큼 늘어 유지보수가 불가능해집니다.",
            "가로 스크롤이나 드롭다운처럼 프레임 밖으로 넘치는 섹션은 일반 카드에 담으면 잘립니다.",
          ],
          solution: [
            "관심사를 둘로 갈랐습니다. 한쪽은 카테고리와 변형 메타데이터만, 다른 쪽은 아이디와 실제 컴포넌트 매핑만 담습니다.",
            "동적 라우트 하나가 카탈로그를 순회해 전 카테고리 페이지를 정적 생성합니다.",
            "카탈로그는 섹션을 props 없이 렌더한다는 계약을 세워, 컴포넌트의 기본값이 곧 데모가 되게 했습니다. 데모 전용 더미 코드가 따로 없습니다.",
            "프레임 처리는 코드가 아니라 데이터로 분기시켰습니다. 스크롤 플래그가 붙으면 내부 스크롤 박스에, 넘침 플래그가 붙으면 클리핑 없이 렌더합니다.",
          ],
          result: [
            "25개 카테고리 140개 변형이 전부 실제 렌더. 스크린샷 0장.",
            "섹션 166개를 302줄짜리 레지스트리 하나가 매핑하고, 카탈로그 라우트는 96줄짜리 파일 하나입니다.",
            "섹션을 하나 추가하는 비용이 컴포넌트 1개 + 레지스트리 1줄 + 메타 1줄로 고정됐습니다.",
            "카테고리 재편 같은 리팩터링도 데이터 파일 하나 수정으로 끝납니다.",
          ],
        },
      ],
    },
    {
      name: "pickcare-app",
      tagline: "웹앱을 웹뷰로 감싸는 대신 네이티브 화면으로 다시 만드는 이식 프로젝트.",
      stack: [
        "Expo",
        "React Native",
        "expo-router",
        "Reanimated",
        "NativeWind",
        "TanStack Query",
        "Redux Toolkit",
      ],
      screens: [],
      cases: [
        {
          title: "'전부 옮긴다' 대신 도달 가능성을 실측해 범위를 절반으로 줄인 이식 설계",
          problem: [
            "웹앱은 페이지 119개에 클라이언트 컴포넌트만 471파일입니다. 그대로 복사하면 웹에만 있는 죽은 코드까지 함께 이사합니다.",
            "실제로 훅 상당수가 전역 배럴에서만 참조되고 그 배럴을 아무도 쓰지 않는 상태였습니다.",
            "에디터·3D·QR 스캐너·지도처럼 RN에 대응물이 없는 웹 전용 의존성이 있어, 착수 전에 판정하지 않으면 중반에 막힙니다.",
          ],
          solution: [
            "라우트별 import 도달 가능성을 계산해 1차 범위를 사용자 기능 63라우트로 확정하고, 어드민·파트너·마케팅 라우트를 근거와 함께 제외했습니다.",
            "훅 104개 중 라우트에서 실제로 닿는 것이 21개뿐이고 나머지는 배럴에만 걸려 '쓰이는 것처럼' 보이던 것을 밝혀내, 전역 배럴을 만들지 않는 것을 이식 규칙으로 박았습니다.",
            "대체 불가 의존성 15종을 버릴지 바꿀지 유지할지 미리 판정해 표로 남겼습니다.",
            "이식과 리팩터링을 섞지 않는다를 원칙으로 두고 로직과 함수명을 그대로 옮긴 뒤 검증했습니다. 문제가 났을 때 원인이 이식인지 개선인지 가리기 위해서입니다.",
            "타입 체크 통과가 동작 보장은 아니라서, 런타임 사각지대를 에뮬레이터에서 직접 실행해 확인했습니다. 그 결과 사전 우려 2건이 기우로 판명나 방식을 되돌렸습니다.",
          ],
          result: [
            "웹 페이지 119개 중 1차 범위를 63라우트로 확정.",
            "API 모듈 59개 / 71파일 / 10,267줄을 3일 만에 이식.",
            "'RN에서는 SSE 스트리밍이 불가능하다'는 조사 결과를 공식 문서와 런타임 확인으로 뒤집고, 별도 라이브러리 없이 채팅 스트리밍을 복구.",
            "ESLint 경고 0건 유지.",
          ],
        },
        {
          title: "아이콘 3,188종 자동 매핑으로 웹 호출부를 고치지 않고 이식",
          problem: [
            "웹은 아이콘을 CSS 의사요소로 그립니다. RN에는 의사요소가 없습니다.",
            "손으로 옮기면 아이콘 쓰는 모든 호출부를 고쳐야 하고, 누락은 컴파일이 아니라 런타임에 '아이콘이 안 보임'으로만 드러납니다.",
            "폰트도 같은 함정이 있었습니다. 웹은 가변 폰트를 쓰는데 RN은 그 포맷을 지원하지 않고, 커스텀 폰트에는 굵기 지정이 오류 없이 무시됩니다.",
          ],
          solution: [
            "아이콘 폰트를 번들하고 클래스명에서 코드포인트로 가는 매핑을 자동 생성해, 호출 형태를 웹과 100% 동일하게 유지했습니다. 그래서 호출부를 손대지 않습니다.",
            "가변 폰트를 정적 웨이트 4종으로 뽑아 등록하고, 굵기 지정이 폰트 패밀리 선택으로 이어지도록 Text 프리미티브 하나로 통일했습니다.",
            "미등록 아이콘은 개발 모드 경고로 즉시 드러나게 했습니다.",
            "장식용 아이콘까지 스크린리더가 원시 클래스명을 읽으면 잡음이 되므로, 명시 라벨이나 동작이 없으면 접근성 트리에서 뺐습니다.",
          ],
          result: [
            "글리프 매핑 3,188종 자동 생성.",
            "웹에서 실제로 쓰이는 아이콘 139종이 전부 매핑에 존재 — 스크립트로 전수 대조해 누락 0건.",
            "폰트 자산 5종을 엔트리에서 일괄 로드하되, 로딩이 실패해도 스플래시에 갇히지 않게 처리.",
          ],
        },
        {
          title: "백엔드 배포 전에 인증 분기 결함 4건을 순수 함수와 테스트로 잡아냄",
          problem: [
            "카카오 SDK는 네이티브 모듈이라 개발 빌드로만 검증되고, 백엔드 소셜 로그인 엔드포인트도 아직 막혀 있어 실기 왕복 검증 자체가 불가능했습니다.",
            "그런데 라우트 가드는 잘못되면 앱을 아예 못 쓰게 만듭니다. 가입 완료 여부·복귀 경로·부팅 세션 복원이 얽혀 있고, 웹에서 이 판정을 하던 미들웨어가 앱에는 없습니다.",
          ],
          solution: [
            "라우팅과 스토어에서 판정만 떼어 부수효과 없는 순수 함수 3개로 분리했습니다. 실제 이동은 훅이 맡습니다.",
            "그 결과 백엔드가 준비되기 전에도 인증 상태별 동작을 단위 테스트로 검증할 수 있었고, 네 가지를 찾았습니다.",
            "가입 미완료 시 세션 상태가 갱신되지 않아 가입 화면과 로그인 화면 사이를 무한히 오가던 문제. 가드는 옳았고 상태가 거짓이었습니다.",
            "복귀 경로를 검증 없이 넘기면 라우터가 그것을 외부 링크로 판단해 브라우저를 여는 문제. 로그인 직후, 사용자 신뢰가 가장 높은 순간에 외부 사이트로 튕겨나가는 경로였습니다.",
            "같은 쿼리 키가 중복되면 배열이 오는데 타입 선언이 그걸 감춰 런타임에 죽던 문제, 그리고 프로필 조회 실패 시 로딩 상태가 남아 리다이렉트가 아예 일어나지 않던 문제.",
            "덧붙여 세션 복원 디스패치 순서를 바꿔, 로딩은 끝났는데 가입 여부는 아직 갱신 전인 중간 상태를 구조적으로 없앴습니다. 리액트 배칭에 기대지 않기 위해서입니다.",
          ],
          result: [
            "테스트 5스위트 32케이스가 0.462초에 전부 통과.",
            "결함 4건을 백엔드 배포 전에 코드로 확정 — 실기 검증이 불가능한 구간을 테스트로 대체했습니다.",
            "웹의 single-flight 리프레시 락을 그대로 옮겨, 동시 401에도 리프레시가 1회만 나가게 유지. 락이 없으면 토큰 회전과 겹쳐 전원 로그아웃이 납니다.",
          ],
        },
      ],
    },
    {
      name: "pickcare-cardnews-factory",
      tagline:
        "인스타그램 카드뉴스를 AI로 양산하는 사내 도구. 카피 생성부터 사람 승인, 배경 이미지, 카드 조립, 결과물 출력까지 한 줄로 잇습니다.",
      stack: ["Node.js", "Figma Plugin API", "OpenAI", "Google Sheets API", "zod"],
      screens: [],
      cases: [
        {
          title: "Figma Plugin API로 카드 5장 세트를 코드가 조립하게 만든 렌더링 엔진",
          problem: [
            "카드뉴스 한 세트는 1080×1350 카드 다섯 장이고 카피 길이는 세트마다 다릅니다. 디자이너가 매번 마스터를 복제해 텍스트를 갈아끼우면 세트 수에 비례해 작업량이 습니다.",
            "플러그인 자동화에서 흔한 '레이어 트리 순서대로 텍스트 노드를 채우기'는, 디자이너가 레이어를 하나만 추가해도 매핑이 통째로 어긋납니다.",
            "auto-layout의 hug 박스는 텍스트를 넣은 뒤에야 최종 높이가 확정됩니다. 미리 잡아둔 좌표를 그대로 쓰면 긴 본문이 들어온 카드에서 박스가 밖으로 잘려 나갑니다.",
          ],
          solution: [
            "마스터 프레임 4종을 손이 아니라 코드로 생성하는 빌더를 짰습니다. 프레임·오토레이아웃·칩·액센트바까지 전부 코드 정의입니다.",
            "텍스트 주입을 순서가 아니라 레이어 이름 조회로 구현했습니다. 디자이너가 마스터를 자유롭게 손봐도 양산 로직이 깨지지 않습니다.",
            "높이 확정 시점 문제는 텍스트를 다 채운 뒤 확정된 높이로 카피 박스를 하단 기준 재정렬해 해결했습니다. 다만 CTA 카드는 중앙 정렬이 디자인 의도라 플래그로 분기해 대상에서 뺐습니다.",
            "각 카드를 PNG로 뽑아 로컬 브리지 서버에 저장하되, export 실패는 격리해 PNG 저장이 실패해도 카드 생성은 계속되게 했습니다.",
          ],
          result: [
            "실제로 44세트 220장의 완성 카드가 생성됐습니다.",
            "플러그인 382줄로 마스터 생성부터 카드 양산, 이미지 출력까지 전 과정을 덮습니다.",
            "플러그인 UI를 버튼 두 개로 줄여 비개발자가 그대로 씁니다. 서버가 안 떠 있으면 복구 안내까지 띄웁니다.",
          ],
        },
        {
          title: "LLM 카피를 '렌더 가능한가'로 먼저 걸러내는 검증 + 재생성 루프",
          problem: [
            "표지 디자인이 '정확히 3줄, 고정 폭' 전제인데 LLM 헤드라인은 줄 수도 길이도 제각각이었습니다. 문장으로는 멀쩡한데 텍스트 박스에서 깨지는 카피가 그대로 쌓였습니다.",
            "품질 판단을 사람에게 전부 떠넘기면 승인자가 '디자인에 안 들어가는 카피'를 하나하나 걸러야 해서 사람 승인 단계가 병목이 됩니다.",
          ],
          solution: [
            "렌더 제약을 코드 규칙으로 명시했습니다. 3줄, 줄당 공백 제외 7~12자. 값은 코드가 아니라 설정에 둬서 디자인이 바뀌면 코드 수정 없이 조정합니다.",
            "검증기를 외부 의존성 0인 순수 함수로 뺐습니다. 덕분에 API 키 없이 테스트가 돌고 CI 없이도 회귀를 잡습니다.",
            "규칙 위반 시 위반 내용을 그대로 피드백으로 만들어 해당 앵글만 다시 뽑습니다. 다섯 개를 전부 재생성하지 않습니다.",
            "규칙을 통과하면 2차로 LLM 자기평가를 돌려 기준 미달이면 피드백을 담아 재생성하되, 최대 3회로 끊어 무한 루프를 막았습니다.",
            "LLM 출력 계약은 스키마로 고정하고, 모델이 이스케이프 문자를 문자 그대로 뱉는 문제는 검증 전 정규화 단계에서 흡수했습니다.",
          ],
          result: [
            "규칙 검증 테스트 5개가 전부 통과. 정상 케이스와 줄 수 불일치, 과장·과단 줄, 공백 제외 카운팅을 덮습니다.",
            "테스트 러너를 Node 내장으로 써서 개발 의존성이 0입니다. 런타임 의존성도 9개뿐입니다.",
            "검증기 22줄, 테스트 32줄 — 검증 로직이 테스트보다 짧은 수준으로 얇게 유지됐습니다.",
          ],
        },
      ],
    },
  ],
  closing: [
    "다섯 저장소를 관통하는 습관이 하나 있습니다. **재현되지 않는 문제를 재현되게 만들고 나서 고쳤다**는 것입니다. iOS에서만 죽는 크래시는 가설을 배포해가며 변수를 소거했고, 캘린더 드래그가 항상 실패하던 버그는 목이 너무 관대해서 안 잡히던 계약 차이였습니다. 실기 검증이 막힌 앱 인증 분기는 판정을 순수 함수로 떼어내 테스트로 대신 확인했습니다.",
    "그 다음이 **같은 실수가 다시 안 나게 만드는 일**이었습니다. E2E가 운영 API를 못 때리게 물리적으로 막고, 조용히 틀리는 세 부류를 린트 규칙으로 세우고, 목과 실 백엔드를 겨루는 계약 테스트를 분리했습니다. 사람 기억에 기대는 규칙은 결국 깨진다고 보는 편입니다.",
    "아직 남은 것도 많습니다. 앱은 이식 중이고, CRM은 실 백엔드와 맞춰가는 단계입니다. 프론트엔드 아키텍처 쪽 결정들은 [별도 글](/blog/pickcare-frontend-architecture)에 더 자세히 적어뒀습니다.",
  ],
} satisfies ReposProject;
```

`src/data/projects/index.ts`를 다음으로 바꾼다.

```ts
import { eutcha } from "./eutcha";
import { kokoaClone } from "./kokoa-clone";
import { pfplay } from "./pfplay";
import { pickcare } from "./pickcare";
import { stock2u } from "./stock2u";
import { tix2u } from "./tix2u";
import { todoApp } from "./todo-app";
import type { Project } from "./types";

/** 종료일 순서. 여정(/journey)의 정류장 순서와 같다. */
export const projects: Project[] = [kokoaClone, todoApp, eutcha, stock2u, tix2u, pfplay, pickcare];
```

- [ ] **Step 2: 무결성 테스트**

Run: `rtk proxy npx vitest run src/data/projects`
Expected: PASS (1 + 5×7 = 36 tests)

- [ ] **Step 3: 페이지 본문을 데이터로 바꾼다**

`src/app/blog/pickcare/page.tsx`에서 세 군데를 고친다. `metadata`, `Block` 타입, `Case`·`Repo` 컴포넌트의 마크업과 클래스는 그대로 둔다. 아래 줄 번호는 모두 **수정 전 원본 기준**이다. (1)에서 import가 두 줄 늘어나므로 위치는 줄 번호보다 인용한 코드로 찾는다.

(1) 1행의 import를 다음으로 바꾼다.

```tsx
import Link from "next/link";
import { pickcare } from "@/data/projects/pickcare";
import { renderInline } from "@/lib/inline";
```

(2) `Case` 안(원본 58행)의 `{item}`을 `{renderInline(item)}`로, `Repo` 안(원본 85행)의 `<p className="!mt-2">{tagline}</p>`를 `<p className="!mt-2">{renderInline(tagline)}</p>`로 바꾼다. 데이터의 Inline 필드는 모두 `renderInline`으로 렌더링한다는 규칙을 지키기 위해서다. 현재 문장에는 표기가 없어서 출력은 같다.

(3) `export default function PickcarePage()`부터 파일 끝까지(원본 104~534행)를 다음으로 교체한다.

```tsx
export default function PickcarePage() {
  return (
    <article className="container py-10 lg:py-16 max-w-4xl mx-auto">
      {/* Header */}
      <div className="space-y-4 mb-10">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{pickcare.period}</span>
          <span>&middot;</span>
          <span>{pickcare.team}</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight lg:text-5xl text-zinc-950 dark:text-zinc-50">
          {pickcare.title}
        </h1>
        <p className="text-xl text-zinc-700 dark:text-zinc-300">
          {renderInline(pickcare.summary)}
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          {pickcare.stack.map((tech) => (
            <span
              key={tech}
              className="px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium"
            >
              {tech}
            </span>
          ))}
        </div>
      </div>

      <div className="prose prose-zinc dark:prose-invert max-w-none space-y-14 prose-headings:text-zinc-950 dark:prose-headings:text-zinc-50 prose-p:text-zinc-800 dark:prose-p:text-zinc-200 prose-li:text-zinc-800 dark:prose-li:text-zinc-200 prose-strong:text-zinc-900 dark:prose-strong:text-zinc-100">
        {pickcare.repos.map((repo) => (
          <Repo key={repo.name} name={repo.name} tagline={repo.tagline} stack={repo.stack}>
            {repo.cases.map((item) => (
              <Case
                key={item.title}
                title={item.title}
                problem={item.problem}
                solution={item.solution}
                result={item.result}
              />
            ))}
          </Repo>
        ))}

        {/* 마무리 */}
        <section>
          <h2>돌아보면</h2>
          {pickcare.closing.map((paragraph) => (
            <p key={paragraph}>{renderInline(paragraph)}</p>
          ))}
        </section>
      </div>

      <hr className="my-12 border-border" />

      <div className="flex justify-center">
        <Link
          href="/blog"
          className="flex items-center justify-center rounded-md border border-input bg-background px-8 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          목록으로 돌아가기
        </Link>
      </div>
    </article>
  );
}
```

- [ ] **Step 4: 기준과 비교한다**

Run: `rtk proxy npx playwright test -g pickcare`
Expected: `2 passed`. 이 글은 가장 길어서 화면 조각이 여러 장이다. 실패하면 어느 조각이 다른지 보고 해당 구간의 데이터 문자열을 원문과 대조해 고친다. 테스트나 기준은 고치지 않는다.

- [ ] **Step 5: 타입 검사와 린트**

Run: `rtk proxy npm run typecheck`
Expected: exit 0

Run: `rtk proxy npx eslint src/data/projects src/app/blog/pickcare/page.tsx`
Expected: 에러 없음

- [ ] **Step 6: 변경 정리와 커밋 메시지 초안을 제출한다 (커밋하지 않음)**

| 파일 | 내용 |
|---|---|
| `src/data/projects/pickcare.ts`, `src/data/projects/index.ts` | PiCKCARE 데이터(저장소 5개, 케이스 15개, 마무리), 목록 추가 |
| `src/app/blog/pickcare/page.tsx` | 본문을 데이터에서 읽도록 수정. `Case`·`Repo` 마크업은 유지 |

```
refactor: PiCKCARE 글 내용을 데이터로 분리

- 여정 페이지의 저장소별 상세가 같은 케이스를 쓰게 하기 위해. 화면은 기준과 픽셀 단위로 같다
- 저장소 → 케이스 구조를 그대로 데이터로 옮겨 페이지는 순회만 하게 했다
- 마무리 문단의 내부 링크는 인라인 표기로 옮겨 원래와 같은 a 태그가 나온다
```

---

### Task 10: 전체 검증과 순서 고정

**Files:**
- Modify: `src/data/projects/projects.test.ts`

**Interfaces:**
- Consumes: Task 3~9의 `projects`
- Produces: 2단계가 기대는 사실 — `projects`가 종료일 순서로 7개다

- [ ] **Step 1: 순서를 고정하는 테스트를 추가한다**

`src/data/projects/projects.test.ts`에서 `it("slug가 겹치지 않는다", ...)` 블록 바로 아래에 추가한다.

```ts
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
```

Run: `rtk proxy npx vitest run src/data/projects`
Expected: PASS (37 tests)

- [ ] **Step 2: 페이지에 원문이 남아 있지 않은지 확인한다**

각 글의 대표 문장이 이제 페이지 파일이 아니라 데이터 파일에만 있어야 한다.

Run:
```bash
grep -l "노마드코더의 카카오톡\|순수 JavaScript만으로 구현한\|TMDB Open API를 활용하여\|판매자와 소비자를 연결하는\|티켓 구매 서비스입니다\|디제잉 문화를 결합한\|관통하는 습관" src/app/blog/*/page.tsx
```
Expected: 출력 없음

Run:
```bash
grep -l "노마드코더의 카카오톡\|순수 JavaScript만으로 구현한\|TMDB Open API를 활용하여\|판매자와 소비자를 연결하는\|티켓 구매 서비스입니다\|디제잉 문화를 결합한\|관통하는 습관" src/data/projects/*.ts
```
Expected: 데이터 파일 7개가 출력된다

- [ ] **Step 3: 글 목록 데이터가 그대로인지 확인한다**

Run: `git diff --stat HEAD -- src/data/posts.ts`
Expected: 출력 없음

- [ ] **Step 4: 전체 테스트**

Run: `rtk proxy npm test`
Expected: 모든 테스트 PASS (Task 1 Step 1 기록 + inline 9개 + projects 37개)

Run: `rtk proxy npx playwright test`
Expected: `14 passed`

- [ ] **Step 5: 타입 검사, 린트, 빌드**

Run: `rtk proxy npm run typecheck`
Expected: exit 0

Run: `rtk proxy npx eslint src/data/projects src/lib/inline.tsx src/lib/inline.test.tsx src/components/ProjectLinkIcon.tsx src/app/blog/kokoa-clone/page.tsx src/app/blog/todo-app/page.tsx src/app/blog/eutcha/page.tsx src/app/blog/stock2u/page.tsx src/app/blog/tix2u/page.tsx src/app/blog/pfplay/page.tsx src/app/blog/pickcare/page.tsx playwright.config.ts e2e vitest.config.ts`
Expected: 에러 없음

Run: `rtk proxy npx next build`
Expected: 빌드 성공. `/blog/kokoa-clone` 등 7개 글이 정적(○) 페이지로 나온다.

- [ ] **Step 6: 변경 정리와 커밋 메시지 초안을 제출한다 (커밋하지 않음)**

| 파일 | 내용 |
|---|---|
| `src/data/projects/projects.test.ts` | 7개 종료일 순서 고정 |

```
test: 프로젝트 데이터 순서를 종료일 기준으로 고정

- 여정 페이지의 정류장 순서가 이 목록을 그대로 따르므로, 순서가 바뀌면 막 구분이 깨지는 것을 미리 잡는다
```

1단계 완료 보고에는 다음을 적는다: 전체 테스트 수와 결과, Playwright 14건 결과, Task 1 Step 9에서 확인한 기존 콘솔 에러 목록(있다면), 계획과 다르게 처리한 곳과 그 이유.
