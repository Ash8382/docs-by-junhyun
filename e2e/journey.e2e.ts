import { expect, test, type Page } from "@playwright/test";

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

test("진행 막대로 3막과 연락처에 바로 간다", async ({ page }) => {
  await page.goto("/journey");
  await page.getByRole("button", { name: "3막으로 이동" }).click();
  await expect(page.locator("#stop-act-3")).toBeInViewport();
  await page.getByRole("button", { name: "연락처로 이동" }).click();
  await expect(page.getByText(EMAIL)).toBeInViewport();
});

test("창 크기가 바뀌어도 끝까지 스크롤된다", async ({ page }) => {
  await page.goto("/journey");
  await page.setViewportSize({ width: 900, height: 640 });
  await page.keyboard.press("End");
  await expect(page.getByText(EMAIL)).toBeInViewport();
});

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

test("헤더의 Journey 링크로 들어오고, 여정 페이지에서는 헤더 흐림이 꺼진다", async ({ page }) => {
  await page.goto("/");
  await page.locator("header").getByRole("link", { name: "Journey", exact: true }).click();
  await expect(page).toHaveURL(/\/journey$/);
  await expect(page.locator("[data-stop]").first()).toBeVisible();
  // 클라이언트 이동에서도 사이트 별 배경이 꺼지고 여정 장면 캔버스 하나만 남는다.
  await expect(page.locator("canvas")).toHaveCount(1);
  expect(await page.locator("header").evaluate((element) => getComputedStyle(element).backdropFilter)).toBe("none");
});

// 3D 장면 청크를 받지 못하는 기기를 흉내 낸다. 3D 층이 실패해도 진짜 HTML은 그대로 동작해야 한다(스펙 5절).
test("3D 장면 청크를 받지 못해도 본문과 진행 막대가 동작한다", async ({ page, request, baseURL }) => {
  // 첫 HTML이 싣는 파일(script와 스타일시트)은 통과시키고, 그 뒤에 지연 로딩되는 청크(장면)만 끊는다.
  const html = await (await request.get("/journey")).text();
  const initial = new Set(
    [...html.matchAll(/<(?:script|link)[^>]*\s(?:src|href)="([^"]+)"/g)].map(
      (match) => new URL(match[1].replaceAll("&amp;", "&"), baseURL).href,
    ),
  );
  expect(initial.size).toBeGreaterThan(0);
  await page.route("**/_next/static/chunks/**", (route) =>
    initial.has(route.request().url()) ? route.continue() : route.abort(),
  );
  const aborted = page.waitForEvent("requestfailed", {
    predicate: (failed) => failed.url().includes("/_next/static/chunks/"),
    timeout: 15_000,
  });
  await page.goto("/journey");
  await aborted;
  // 실패한 import가 렌더 중에 던져지고 에러 화면이 그려질 시간을 준다.
  await page.waitForTimeout(500);
  await expect(page.getByText("Application error")).toBeHidden();
  await expect(page.locator("[data-stop]")).toHaveCount(12);
  await page.getByRole("button", { name: "연락처로 이동" }).click();
  await expect(page.getByText(EMAIL)).toBeInViewport();
});

// 호환성 확인(첫 getContext)은 통과하지만 실제 렌더러 생성은 실패하는 기기를 흉내 낸다.
test("렌더러를 만들지 못해도 틱마다 에러가 쏟아지지 않는다", async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    let probed = false;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      if (type === "webgl2" && !probed) {
        probed = true;
        return (original as (...args: unknown[]) => unknown).call(this, type, ...rest);
      }
      if (type === "webgl2" || type === "webgl") return null;
      return (original as (...args: unknown[]) => unknown).call(this, type, ...rest);
    } as typeof original;
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/journey");
  await page.waitForTimeout(1000);
  expect(errors.length, errors.slice(0, 3).join(" | ")).toBeLessThanOrEqual(1);
  await expect(page.locator("[data-stop]")).toHaveCount(12);
});
