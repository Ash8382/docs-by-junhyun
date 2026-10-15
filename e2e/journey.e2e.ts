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
  await page.goto("/journey");
  // 오류 경계가 실패한 import를 잡으면 장면 상태가 failed가 되고 로딩 막대가 사라진다.
  await expect(page.locator("[data-journey-loading]")).toHaveAttribute("data-journey-loading", "failed", {
    timeout: 15_000,
  });
  await expect(page.locator("[data-journey-loading] span")).toHaveCount(0);
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
  // 렌더러를 만들지 못하면 장면 상태가 failed가 되어 로딩 막대가 사라진다.
  await expect(page.locator("[data-journey-loading]")).toHaveAttribute("data-journey-loading", "failed");
  await page.waitForTimeout(1000);
  // 남는 하나는 렌더러를 만들지 못했다는, 처리되지 않은 거부다. three r181은 이 오류를 기록하는 catch에서
  // 매개변수 이름이 기록 함수(error)를 가려 메시지가 "… is not a function"으로 바뀌므로 문구는 보지 않는다.
  expect(errors.length, errors.slice(0, 3).join(" | ")).toBeLessThanOrEqual(1);
  await expect(page.locator("[data-stop]")).toHaveCount(12);
});

// 상세 패널의 스크롤 잠금(Lenis stop)이 풀렸는지 확인한다. 잠금이 남으면 html에 lenis-stopped가 붙고 휠이 먹지 않는다.
async function expectWheelScrolls(page: Page) {
  await expect(page.locator("html")).not.toHaveClass(/lenis-stopped/);
  const before = await page.evaluate(() => window.scrollY);
  const viewport = page.viewportSize() ?? { width: 800, height: 600 };
  await page.mouse.move(viewport.width / 2, viewport.height / 2);
  for (let step = 0; step < 4; step++) await page.mouse.wheel(0, 400);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before + 300);
}

test("휠로 스크롤하면 페이지가 내려간다", async ({ page }) => {
  await page.goto("/journey");
  await expectWheelScrolls(page);
});

test("패널을 닫으면 다시 휠로 스크롤된다", async ({ page }) => {
  await page.goto("/journey");
  await page.locator("#stop-pfplay a[data-journey-detail]").click();
  await expect(page.getByRole("dialog", { name: "PFPlay" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expectWheelScrolls(page);
});

test("패널을 연 채 블로그 원문으로 나갔다 돌아와 닫아도 스크롤된다", async ({ page }) => {
  await page.goto("/journey");
  await page.locator("#stop-pfplay a[data-journey-detail]").click();
  await page.getByRole("link", { name: "블로그 원문 보기" }).click();
  await expect(page).toHaveURL(/\/blog\/pfplay$/);
  await page.goBack();
  await expect(page.getByRole("dialog", { name: "PFPlay" })).toBeVisible();
  await page.getByRole("button", { name: "닫기" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expectWheelScrolls(page);
});

// 여정 장면 코드에만 있는 표지 글자(렌더 단계 재질의 프로그램 키)로 번들 경계를 확인한다(스펙 7절).
test("다른 페이지는 여정 3D 장면 코드를 내려받지 않는다", async ({ page }) => {
  const scripts = new Set<string>();
  page.on("response", (response) => {
    if (response.request().resourceType() === "script") scripts.add(response.url());
  });
  const sceneLoaded = async () => {
    const bodies = await Promise.all([...scripts].map(async (url) => (await page.request.get(url)).text()));
    return bodies.some((body) => body.includes("journey-stage"));
  };
  for (const path of ["/", "/about", "/blog/pfplay"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
  }
  expect(await sceneLoaded()).toBe(false);
  // 표지 글자가 장면 코드에 실제로 있는지도 본다. 없으면 위 검사는 늘 통과한다.
  await page.goto("/journey");
  await expect(page.locator("[data-journey-scene] canvas")).toHaveCount(1);
  await expect.poll(sceneLoaded).toBe(true);
});

test("3D 장면이 셰이더를 미리 컴파일하고 드러나면 로딩 막대가 사라진다", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/journey");
  await expect(page.locator("[data-journey-scene]")).toHaveAttribute("data-state", "ready", { timeout: 30_000 });
  await expect(page.locator("[data-journey-loading]")).toHaveAttribute("data-journey-loading", "ready");
  await expect(page.locator("[data-journey-loading] span")).toHaveCount(0);
  await page.keyboard.press("End");
  await expect(page.getByText(EMAIL)).toBeInViewport();
  expect(errors).toEqual([]);
});

test("다른 페이지에 다녀오면 장면을 다시 준비한다", async ({ page }) => {
  await page.goto("/journey");
  const scene = page.locator("[data-journey-scene]");
  await expect(scene).toHaveAttribute("data-state", "ready", { timeout: 30_000 });
  await page.locator("[data-site-header]").getByRole("link", { name: "블로그", exact: true }).click();
  await expect(page).not.toHaveURL(/\/journey/);
  await page.locator("[data-site-header]").getByRole("link", { name: "Journey", exact: true }).click();
  await expect(scene).toHaveAttribute("data-state", "ready", { timeout: 30_000 });
  await expect(page.locator("canvas")).toHaveCount(1);
});

test("진행 막대와 푸터는 밝은 장면 위에서도 바탕이 있다", async ({ page }) => {
  await page.goto("/journey");
  const rail = page.getByRole("navigation", { name: "여정 진행" });
  expect(await rail.evaluate((element) => getComputedStyle(element).backgroundColor)).not.toBe("rgba(0, 0, 0, 0)");
  const footer = page.locator("[data-site-footer]");
  expect(await footer.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe("rgb(9, 9, 11)");
});

// 엔딩에서 회랑 전체를 내려다보는 장면을 연락처 패널이 가리지 않게 한다(넓은 화면은 오른쪽에 좁게, 휴대폰은 전체 폭).
test("연락처 패널은 넓은 화면에서 오른쪽에 있어 엔딩 내려다보기를 가리지 않는다", async ({ page }) => {
  await page.goto("/journey");
  await page.keyboard.press("End");
  const panel = page.getByRole("heading", { name: "연락처" }).locator("xpath=..");
  await expect(panel).toBeInViewport();
  const box = await panel.boundingBox();
  const width = page.viewportSize()?.width ?? 0;
  if (!box) throw new Error("연락처 패널의 위치를 읽지 못했습니다");
  if (width >= 640) expect(box.x).toBeGreaterThan(width * 0.6);
  else expect(box.width).toBeGreaterThan(width * 0.8);
});

// 은하 배경(약 1.6MB)은 3D 장면을 띄우는 기기만 내려받는다(스펙 5절).
test("WebGL이 없으면 은하 이미지를 내려받지 않고, 3D를 띄우면 내려받는다", async ({ browser }) => {
  const requested = async (webgl: boolean) => {
    const page = await browser.newPage();
    if (!webgl) await disableWebGL(page);
    const urls: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/journey/galaxy")) urls.push(request.url());
    });
    await page.goto("/journey");
    if (webgl) await expect(page.locator("[data-journey-scene]")).toHaveAttribute("data-state", "ready", { timeout: 30_000 });
    else await page.waitForLoadState("networkidle");
    await page.close();
    return urls.length;
  };
  expect(await requested(false)).toBe(0);
  expect(await requested(true)).toBeGreaterThan(0);
});

test("은하 이미지를 받지 못해도 본문과 진행 막대가 동작한다", async ({ page }) => {
  await page.route("**/journey/galaxy*", (route) => route.abort());
  await page.goto("/journey");
  await expect(page.locator("[data-journey-loading]")).toHaveAttribute("data-journey-loading", "failed", {
    timeout: 15_000,
  });
  await expect(page.locator("[data-stop]")).toHaveCount(12);
  await page.getByRole("button", { name: "연락처로 이동" }).click();
  await expect(page.getByText(EMAIL)).toBeInViewport();
});

test("엔딩에 배경 은하의 출처가 있다", async ({ page }) => {
  await page.goto("/journey");
  await page.keyboard.press("End");
  const credit = page.locator("#stop-ending a[href='https://svs.gsfc.nasa.gov/4851']");
  await expect(credit).toBeInViewport();
  await expect(page.locator("#stop-ending")).toContainText("Gaia DR2: ESA/Gaia/DPAC");
});
