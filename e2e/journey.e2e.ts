import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { driveAt } from "../src/lib/journey/drive";
import { projects } from "../src/data/projects";
import { FRONT_LEAD, HOLOGRAMS, REPO_COUNT } from "../src/lib/journey/holograms";
import { occlusionTargets } from "../src/lib/journey/landscapeOcclusion";
import { PORTRAIT_LENS } from "../src/lib/journey/lens";
import { cardProgress, portraitCamera } from "../src/lib/journey/portrait";
import { HALL_REPO_END, HALL_REPO_START, rangeOf } from "../src/lib/journey/timeline";
import { TRAIL_HEX } from "../src/lib/journey/trail";

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
  // 이 테스트는 캔버스 수와 오류를 본다. End 키로 끝까지 가면 드물게 반영되지 않아 흔들렸다(메모리 압박에서 12번 중 10번, 캐시가 빈 첫 실행에서
  // 20번 중 1번, 2-4b 전 빌드도 같음. CPU를 20배 느리게 해도 재현되지 않아 원인은 확정하지 못했다, 스펙 10절). End 키 동작은
  // "End 키로 엔딩에 닿고…"가 따로 보므로 여기서는 끝으로 바로 스크롤한다(2-4c)
  await scrollToProgress(page, 1);
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
  // 세로 화면은 지금 정류장의 카드만 누를 수 있다(스펙 3절 "세로 화면"). 그 정류장으로 가서 누른다
  await scrollToProgress(page, middleOf("pfplay"));
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
  await scrollToProgress(page, middleOf("tix2u"));
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

test("PiCKCARE app 탭은 App Store 화면 세 장을 한 줄에 보인다", async ({ page }) => {
  await page.goto("/journey#pickcare/app");
  const screens = page.getByRole("tabpanel").getByRole("region", { name: "제품 화면" }).getByRole("img");
  await expect(screens).toHaveCount(3);
  const tops = await screens.evaluateAll((images) => images.map((image) => Math.round(image.getBoundingClientRect().top)));
  expect(new Set(tops).size).toBe(1);
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

test("상세가 열린 채 컨텍스트를 잃어도 2D로 바뀌고 상세는 그대로이며, 닫으면 그 정류장 카드와 링크로 돌아온다", async ({ page }) => {
  await page.goto("/journey");
  await waitReady(page);
  await settleAt(page, middleOf("tix2u"));
  const link = page.locator("#stop-tix2u a[data-journey-detail]");
  await link.click();
  await expect(page.getByRole("dialog", { name: "Tix2U" })).toBeVisible();
  await loseContext(page);
  await expectFlat(page, "context-lost");
  await expect(page.getByRole("dialog", { name: "Tix2U" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.locator('[data-journey-card="tix2u"]')).toBeInViewport();
  await expect(link).toBeFocused();
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
  // 오류 경계가 실패한 import를 잡으면 장면 상태가 failed가 되고 2D로 바뀐다(로딩 막대도 함께 내려간다, 2-4b).
  await expectFlat(page, "failed");
  await expect(page.locator("[data-journey-loading]")).toHaveCount(0);
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
  // 렌더러를 만들지 못하면 장면 상태가 failed가 되어 2D로 바뀐다(2-4b).
  await expectFlat(page, "failed");
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
  await scrollToProgress(page, middleOf("pfplay"));
  await page.locator("#stop-pfplay a[data-journey-detail]").click();
  await expect(page.getByRole("dialog", { name: "PFPlay" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expectWheelScrolls(page);
});

test("패널을 연 채 블로그 원문으로 나갔다 돌아와 닫아도 스크롤된다", async ({ page }) => {
  await page.goto("/journey");
  await scrollToProgress(page, middleOf("pfplay"));
  await page.locator("#stop-pfplay a[data-journey-detail]").click();
  await page.getByRole("link", { name: "블로그 원문 보기" }).click();
  await expect(page).toHaveURL(/\/blog\/pfplay$/);
  await page.goBack();
  await expect(page.getByRole("dialog", { name: "PFPlay" })).toBeVisible();
  await page.getByRole("button", { name: "닫기" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expectWheelScrolls(page);
});

// 여정 장면 코드에만 있는 표지 글자(도로 재질의 프로그램 키)로 번들 경계를 확인한다(스펙 7절).
test("다른 페이지는 여정 3D 장면 코드를 내려받지 않는다", async ({ page }) => {
  const scripts = new Set<string>();
  page.on("response", (response) => {
    // 차 모델 디코더가 만드는 작업자(blob: 주소)는 내려받은 파일이 아니라 넣지 않는다.
    if (response.request().resourceType() === "script" && response.url().startsWith("http")) scripts.add(response.url());
  });
  const sceneLoaded = async () => {
    const bodies = await Promise.all([...scripts].map(async (url) => (await page.request.get(url)).text()));
    return bodies.some((body) => body.includes("journey-road"));
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
  await expect(page.locator("[data-journey-scene]")).toHaveAttribute("data-car", "model");
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

// 엔딩에서 길 전체를 내려다보는 장면을 연락처 패널이 가리지 않게 한다(넓은 화면은 오른쪽에 좁게, 휴대폰은 전체 폭).
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
  await expectFlat(page, "failed");
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

test("엔딩에 차 모델의 출처와 라이선스가 있다", async ({ page }) => {
  await page.goto("/journey");
  await page.keyboard.press("End");
  await expect(
    page.locator("#stop-ending a[href='https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/CarConcept']"),
  ).toBeInViewport();
  await expect(page.locator("#stop-ending a[href='https://creativecommons.org/licenses/by/4.0/']")).toHaveText("CC BY 4.0");
});

test("엔딩에 차 모델 디코더(Draco·Basis Universal)의 Apache-2.0 고지가 있고, 라이선스 전문을 받을 수 있다", async ({ page, request }) => {
  await page.goto("/journey");
  const notice = page.locator("#stop-ending").getByRole("link", { name: "Apache-2.0" });
  await expect(notice).toHaveAttribute("href", "/journey/decoders/LICENSE.txt");
  const response = await request.get("/journey/decoders/LICENSE.txt");
  expect(response.ok()).toBe(true);
  const text = await response.text();
  for (const word of ["Draco", "Basis Universal", "Apache License", "END OF TERMS AND CONDITIONS"]) expect(text, word).toContain(word);
});

// ── 장면 감시와 차(2-2b, 스펙 1절 완료 조건과 5절 "실패 대응") ───────────────────

async function waitReady(page: Page) {
  await expect(page.locator("[data-journey-scene]")).toHaveAttribute("data-state", "ready", { timeout: 30_000 });
}

/** 2D로 바뀌었고 그 이유가 reason이다(<html>의 표지, 스펙 5절 "모드 전환", 2-4b). 3D 장면은 내려간다 */
async function expectFlat(page: Page, reason: string) {
  await expect(page.locator("html")).toHaveAttribute("data-journey-mode", "2d", { timeout: 15_000 });
  await expect(page.locator("html")).toHaveAttribute("data-journey-reason", reason);
  await expect(page.locator("[data-journey-scene]")).toHaveCount(0);
}

/** 2D로 바뀐 뒤 그 카드의 위끝이 헤더와 막 탭 아래(scroll-margin-top 6.5rem = 104px)에 있다: 보던 카드를 지켰다 */
async function expectFlatAnchor(page: Page, card: string) {
  await expect.poll(async () => Math.round((await page.locator(`[data-journey-card="${card}"]`).boundingBox())?.y ?? -1)).toBe(104);
}

/** 여정 캔버스의 WebGL 컨텍스트를 일부러 잃게 한다(WEBGL_lose_context) */
async function loseContext(page: Page) {
  await page.evaluate(() => {
    const canvas = document.querySelector("[data-journey-scene] canvas");
    if (!(canvas instanceof HTMLCanvasElement)) throw new Error("여정 캔버스가 없습니다");
    canvas.getContext("webgl2")?.getExtension("WEBGL_lose_context")?.loseContext();
  });
}

test("셰이더 컴파일 실패를 감지해 콘솔에 남기고 2D로 바꾼다", async ({ page }) => {
  const errors = collectErrors(page);
  // 모든 프로그램의 링크가 실패하는 드라이버를 흉내 낸다.
  await page.addInitScript(() => {
    const original = WebGL2RenderingContext.prototype.getProgramParameter;
    WebGL2RenderingContext.prototype.getProgramParameter = function (this: WebGL2RenderingContext, program, name) {
      if (name === this.LINK_STATUS) return false;
      return original.call(this, program, name);
    };
  });
  await page.goto("/journey");
  await expectFlat(page, "failed");
  expect(errors.some((message) => message.includes("셰이더 컴파일 실패"))).toBe(true);
  await page.getByRole("button", { name: "연락처로 이동" }).click();
  await expect(page.getByText(EMAIL)).toBeInViewport();
});

test("WebGL 컨텍스트를 잃으면 콘솔에 남기고 2D(이유: 컨텍스트 손실)로 바꾼다", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/journey");
  await waitReady(page);
  await loseContext(page);
  await expectFlat(page, "context-lost");
  expect(errors.some((message) => message.includes("WebGL 컨텍스트 손실"))).toBe(true);
  await page.getByRole("button", { name: "연락처로 이동" }).click();
  await expect(page.getByText(EMAIL)).toBeInViewport();
});

test("차 모델을 받지 못하면 빛 실루엣으로 대신하고 장면은 이어진다", async ({ page }) => {
  await page.route("**/journey/car/**", (route) => route.abort());
  await page.goto("/journey");
  await waitReady(page);
  await expect(page.locator("[data-journey-scene]")).toHaveAttribute("data-car", "silhouette");
  await page.keyboard.press("End");
  await expect(page.getByText(EMAIL)).toBeInViewport();
});

test("디코더를 받지 못해도 빛 실루엣으로 대신한다", async ({ page }) => {
  await page.route("**/journey/decoders/**", (route) => route.abort());
  await page.goto("/journey");
  await waitReady(page);
  await expect(page.locator("[data-journey-scene]")).toHaveAttribute("data-car", "silhouette");
});

// ── 기기 단계와 3D 경량(2-4a, 스펙 5절) ───────────────────

test.describe("해상도 배율 2 화면", () => {
  test.use({ deviceScaleFactor: 2 });

  test("3D 전체는 배율 2·은하 4096·블룸 그대로이고, ?tier=lite는 배율 1.5·은하 2048·줄인 블룸이다", async ({ page }) => {
    await page.goto("/journey?debug=stats");
    await waitReady(page);
    const full = await readStats(page);
    expect(full.quality).toEqual({ tier: "full", level: "full", dpr: 2, galaxyWidth: 4096, bloomLevels: 8, luminanceScale: 1 });
    expect(full.renderTargetBytes).toBeGreaterThan(0);
    await page.goto("/journey?debug=stats&tier=lite");
    await waitReady(page);
    const lite = await readStats(page);
    expect(lite.quality).toEqual({ tier: "lite", level: "lite", dpr: 1.5, galaxyWidth: 2048, bloomLevels: 6, luminanceScale: 0.5 });
    // 텍스처 추정: 58.8MiB에서 은하가 32.0 → 8.0MiB(스펙 5절)
    expect(lite.textureBytes / 2 ** 20).toBeGreaterThan(34.3);
    expect(lite.textureBytes / 2 ** 20).toBeLessThan(35.3);
    expect(lite.renderTargetBytes).toBeLessThan(full.renderTargetBytes);
  });
});

test("?tier=2d면 3D 장면·은하·차를 내려받지 않고 본문과 썸네일이 보인다", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.goto("/journey?debug=stats&tier=2d");
  // 하이드레이션 뒤 장면을 불러왔다면 그 요청까지 끝날 때를 기다린다
  await page.waitForLoadState("networkidle");
  await expectFlat(page, "tier");
  expect(requests.filter((url) => url.includes("/journey/galaxy") || url.includes("/journey/car/"))).toEqual([]);
  for (const slug of EXHIBITS) await expectThumbnail(page, slug, false);
  await page.keyboard.press("End");
  await expect(page.getByText(EMAIL)).toBeInViewport();
});

// ── 모드와 2D 전환(2-4b, 스펙 5절 "모드 전환", "컨텍스트 손실과 장면 실패") ───────────────────

test("2D 표지는 여정 페이지에만 있고, 다른 페이지로 가면 지워진다", async ({ page }) => {
  await page.goto("/journey?debug=stats&tier=2d");
  await expectFlat(page, "tier");
  await page.locator("[data-site-header]").getByRole("link", { name: "블로그", exact: true }).click();
  await expect(page).not.toHaveURL(/\/journey/);
  await expect(page.locator("html")).not.toHaveAttribute("data-journey-mode", /.*/);
});

test("실행 중 컨텍스트를 잃으면 2D로 바뀌고 보던 정류장의 카드가 화면에 있다", async ({ page }) => {
  await page.goto("/journey");
  await waitReady(page);
  await settleAt(page, middleOf("tix2u"));
  await loseContext(page);
  await expectFlat(page, "context-lost");
  await expectFlatAnchor(page, "tix2u");
});

// ── 2D 세로 타임라인(2-4b, 스펙 5절 "2D 레이아웃") ───────────────────

/** 빛의 길 색(trail.ts TRAIL_HEX)을 getComputedStyle의 rgb 문자열로 */
function rgb(hex: string): string {
  const value = Number.parseInt(hex.slice(1), 16);
  return `rgb(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255})`;
}

test.describe("2D 휴대폰(412×839)", () => {
  test.use({ viewport: { width: 412, height: 839 } });

  test("문서 높이가 3D 배치(18.7화면)의 절반 이하이고, 카드가 고정·sticky 없이 문서 순서대로 쌓인다", async ({ page }) => {
    await page.goto("/journey?debug=stats&tier=2d");
    await expectFlat(page, "tier");
    const layout = await page.evaluate(() => {
      const cards = [...document.querySelectorAll<HTMLElement>("[data-journey-card]")];
      return {
        screens: document.documentElement.scrollHeight / window.innerHeight,
        positions: [...new Set(cards.map((card) => getComputedStyle(card).position))],
        tops: cards.map((card) => card.getBoundingClientRect().top),
      };
    });
    expect(layout.screens).toBeLessThan(18.7 / 2);
    expect(layout.positions).toEqual(["static"]);
    expect(layout.tops).toEqual([...layout.tops].sort((a, b) => a - b));
  });

  test("왼쪽 선은 막마다 빛의 길 색이고, 입구에는 선이 없다", async ({ page }) => {
    await page.goto("/journey?debug=stats&tier=2d");
    await expectFlat(page, "tier");
    const line = (id: string) =>
      page.locator(`#stop-${id}`).evaluate((section) => {
        const style = getComputedStyle(section, "::before");
        return style.content === "none" ? null : style.backgroundColor;
      });
    expect(await line("intro")).toBeNull();
    for (const [id, hex] of [
      ["kokoa-clone", TRAIL_HEX.start],
      ["stock2u", TRAIL_HEX.middle],
      ["pickcare", TRAIL_HEX.end],
    ] as const)
      expect(await line(id), id).toBe(rgb(hex));
  });

  test("엔딩 연락처는 패널 안 스크롤 없이 보이고, 처음 화면 밖이던 카드는 들어올 때 나타난다", async ({ page }) => {
    await page.goto("/journey?debug=stats&tier=2d");
    await expectFlat(page, "tier");
    const far = page.locator('[data-journey-card="pickcare/app"]');
    await expect(far).not.toHaveAttribute("data-revealed");
    expect(await far.evaluate((card) => getComputedStyle(card).opacity)).toBe("0");
    await far.scrollIntoViewIfNeeded();
    await expect(far).toHaveAttribute("data-revealed", "");
    await expect.poll(() => far.evaluate((card) => getComputedStyle(card).opacity)).toBe("1");
    await page.keyboard.press("End");
    await expect(page.getByText(EMAIL)).toBeInViewport();
    const panel = await page.getByRole("heading", { name: "연락처" }).locator("..").evaluate((element) => element.scrollHeight - element.clientHeight);
    expect(panel).toBe(0);
  });
});

test("2D 데스크톱은 가운데 열 하나(최대 720px)다", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/journey?debug=stats&tier=2d");
  await expectFlat(page, "tier");
  const box = await page.locator("[data-journey-page]").boundingBox();
  if (!box) throw new Error("본문이 없습니다");
  expect(box.width).toBeLessThanOrEqual(720);
  expect(Math.abs(box.x + box.width / 2 - 640)).toBeLessThanOrEqual(1);
});

// ── 막 탭과 수동 전환·알림(2-4b, 스펙 2절 "진행 표시", 5절 "수동 전환", "자동 2D 알림", "처음 그리기") ───────────────────

const NOTICE = "기기에 맞춰 2D로 바꿨어요";

/**
 * 앱 스크립트(/_next/static/chunks의 script)를 붙잡아 하이드레이션 전의 화면(서버가 그린 HTML과 CSS, 처음 그리기 스크립트)을 본다.
 * 스타일시트는 그대로 보낸다. 다 본 뒤 돌려받은 함수로 풀어 준다. 늦추기만 하면 문서를 다 읽기 전에 스크립트가 도착해 하이드레이션이 먼저 끝날 수 있다
 */
async function holdScripts(page: Page): Promise<() => void> {
  let release = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/_next/static/chunks/**", async (route) => {
    if (route.request().resourceType() === "script") await held;
    await route.continue();
  });
  return release;
}

test("3D에서 2D로 보기를 누르면 보던 카드가 2D에서 화면에 있고, 3D로 보기로 돌아오면 장면이 다시 준비되어 그대로 남는다", async ({ page }) => {
  await page.goto("/journey");
  await waitReady(page);
  await settleAt(page, middleOf("pfplay"));
  await page.getByRole("button", { name: "2D로 보기" }).click();
  await expectFlat(page, "manual");
  await expectFlatAnchor(page, "pfplay");
  await expect(page.getByRole("status")).not.toContainText(NOTICE);
  await page.getByRole("button", { name: "3D로 보기" }).click();
  await expect(page.locator("html")).not.toHaveAttribute("data-journey-mode", /.*/);
  await waitReady(page);
  await expect(page.locator('[data-journey-card="pfplay"]')).toBeInViewport();
  // 우리가 내린 첫 렌더러의 손실(R3F의 forceContextLoss, 500ms 뒤)로 2D가 되돌아오지 않는다
  await page.waitForTimeout(1500);
  await expect(page.locator("html")).not.toHaveAttribute("data-journey-mode", /.*/);
  await expect(page.locator("[data-journey-scene]")).toHaveAttribute("data-state", "ready");
});

test("막 제목과 엔딩에서 2D로 갔다가 3D로 돌아오면 같은 정류장으로 온다", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/journey?debug=stats");
  await waitReady(page);
  for (const [stop, at] of [
    ["act-2", middleOf("act-2")],
    ["ending", 1],
  ] as const) {
    await settleAt(page, at);
    await page.getByRole("button", { name: "2D로 보기" }).click();
    await expectFlat(page, "manual");
    await page.getByRole("button", { name: "3D로 보기" }).click();
    await waitReady(page);
    const range = rangeOf(stop);
    await expect.poll(async () => (await readStats(page)).progress, { message: stop }).toBeGreaterThanOrEqual(range.start);
    expect((await readStats(page)).progress, stop).toBeLessThanOrEqual(range.end);
  }
});

// 2D의 카드 자리는 rem(scroll-padding-top 6.5rem)이라 브라우저 글자 크기 설정을 따른다. 읽는 자리도 그 값을 따라야 놓은 카드를 읽는다(2-4c 최종 리뷰)
test("글자 크기를 키운 브라우저(20px)에서도 2D 막 탭은 이동한 막을 가리키고, 3D로 돌아오면 그 정류장이다", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("journey-view", "2d"));
  await page.goto("/journey?debug=stats");
  await expectFlat(page, "manual");
  await page.addStyleTag({ content: "html { font-size: 20px; }" });
  const tab = page.getByRole("navigation", { name: "여정 막" }).getByRole("button", { name: "2막 협업으로 이동" });
  await tab.click();
  await expect.poll(async () => Math.round((await page.locator('[data-journey-card="act-2"]').boundingBox())?.y ?? -1)).toBe(130);
  await expect(tab).toHaveAttribute("aria-current", "true");
  await page.getByRole("button", { name: "3D로 보기" }).click();
  await waitReady(page);
  const range = rangeOf("act-2");
  await expect.poll(async () => (await readStats(page)).progress).toBeGreaterThanOrEqual(range.start);
  expect((await readStats(page)).progress).toBeLessThanOrEqual(range.end);
});

test("키보드로 2D로 보기·3D로 보기를 누르면 포커스가 반대쪽 전환 버튼으로 옮겨 간다", async ({ page }) => {
  await page.goto("/journey");
  await waitReady(page);
  await page.getByRole("button", { name: "2D로 보기" }).focus();
  await page.keyboard.press("Enter");
  await expectFlat(page, "manual");
  await expect(page.getByRole("button", { name: "3D로 보기" })).toBeFocused();
  await page.keyboard.press("Enter");
  await waitReady(page);
  await expect(page.getByRole("button", { name: "2D로 보기" })).toBeFocused();
});

test("고른 2D는 기억되어 새로고침해도 2D로 열리고, 3D를 고르면 다시 3D로 열린다", async ({ page }) => {
  await page.goto("/journey");
  await page.getByRole("button", { name: "2D로 보기" }).click();
  await expectFlat(page, "manual");
  await page.reload();
  await expectFlat(page, "manual");
  await page.getByRole("button", { name: "3D로 보기" }).click();
  await page.reload();
  await waitReady(page);
});

test("저장소가 막힌 브라우저에서도 2D로 보기가 되고 오류가 없으며, 기억하지 못해 새로고침하면 3D로 연다", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new DOMException("저장소가 막혀 있습니다", "SecurityError");
      },
    });
  });
  const errors = collectErrors(page);
  await page.goto("/journey");
  await waitReady(page);
  await page.getByRole("button", { name: "2D로 보기" }).click();
  await expectFlat(page, "manual");
  await page.reload();
  await waitReady(page);
  expect(errors).toEqual([]);
});

test("2D를 기억한 방문자는 하이드레이션 전(서버가 그린 화면)부터 2D 배치다", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("journey-view", "2d"));
  const release = await holdScripts(page);
  await page.goto("/journey", { waitUntil: "commit" });
  await page.locator("[data-journey-page]").waitFor({ state: "attached" });
  await expect(page.locator("html")).toHaveAttribute("data-journey-mode", "2d");
  const width = await page.locator("[data-journey-page]").evaluate((main) => main.getBoundingClientRect().width);
  expect(width).toBeLessThanOrEqual(720);
  await expect(page.getByRole("navigation", { name: "여정 진행" })).toBeHidden();
  release();
  await expectFlat(page, "manual");
});

test("자동으로 2D가 되면 알림이 한 번 나오고 6초 뒤 사라진다", async ({ page }) => {
  await page.goto("/journey");
  await waitReady(page);
  await loseContext(page);
  await expectFlat(page, "context-lost");
  await expect(page.getByRole("status")).toHaveText(NOTICE);
  await expect(page.getByRole("status")).toHaveText("", { timeout: 8000 });
});

test("2D 막 탭을 누르면 그 막으로 가고 지금 읽는 막에 aria-current가 붙는다", async ({ page }) => {
  await page.goto("/journey?debug=stats&tier=2d");
  await expectFlat(page, "tier");
  const tabs = page.getByRole("navigation", { name: "여정 막" });
  await expect(tabs).toBeVisible();
  await expect(page.getByRole("navigation", { name: "여정 진행" })).toBeHidden();
  await tabs.getByRole("button", { name: "2막 협업으로 이동" }).click();
  await expect(page.locator("#stop-act-2")).toBeInViewport();
  await expect(tabs.getByRole("button", { name: "2막 협업으로 이동" })).toHaveAttribute("aria-current", "true");
  await expect(tabs.getByRole("button", { name: "1막 시작으로 이동" })).not.toHaveAttribute("aria-current", /.*/);
  await tabs.getByRole("button", { name: "연락처로 이동" }).click();
  await expect(page.getByText(EMAIL)).toBeInViewport();
  await expect(tabs.getByRole("button", { name: "연락처로 이동" })).toHaveAttribute("aria-current", "true");
});

test("2D에서 공유 주소로 열면 그 정류장으로 간다", async ({ page }) => {
  await page.goto("/journey?debug=stats&tier=2d#tix2u");
  await expectFlat(page, "tier");
  await expect(page.getByRole("dialog", { name: "Tix2U" })).toBeVisible();
  await page.getByRole("button", { name: "닫기" }).click();
  await expect(page.locator('[data-journey-card="tix2u"]')).toBeInViewport();
});

test("WebGL2가 없으면 3D로 보기 버튼이 없다", async ({ page }) => {
  await disableWebGL(page);
  await page.goto("/journey");
  await expectFlat(page, "tier");
  await expect(page.getByRole("navigation", { name: "여정 막" })).toBeVisible();
  await expect(page.getByRole("button", { name: "3D로 보기" })).toHaveCount(0);
});

// ── 실행 중 강등(2-4b, 스펙 5절 "실행 중 강등") ───────────────────

/** 지금 3D 품질 단계와 블룸 mip 단계, <html>의 2D 표지 */
async function qualityNow(page: Page): Promise<{ level: string | null; bloom: number | null; flat: string | null }> {
  return page.evaluate(() => {
    const quality = (window as Window & { __journeyStats?: { quality: { level: string; bloomLevels: number } | null } }).__journeyStats?.quality;
    return { level: quality?.level ?? null, bloom: quality?.bloomLevels ?? null, flat: document.documentElement.dataset.journeyMode ?? null };
  });
}

test("프레임을 일부러 늦추면(busy 50ms, 20fps) 전체 → 경량 → 최소 → 2D로 차례로 내려가고, 고른 3D는 최소부터 2D로 내리지 않는다", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/journey?debug=stats&busy=50");
  await waitReady(page);
  await scrollToProgress(page, middleOf("stock2u"));
  const seen: { level: string; bloom: number | null }[] = [];
  await expect
    .poll(
      async () => {
        const now = await qualityNow(page);
        if (now.level && seen.at(-1)?.level !== now.level) seen.push({ level: now.level, bloom: now.bloom });
        return now.flat;
      },
      { timeout: 30_000, intervals: [100] },
    )
    .toBe("2d");
  expect(seen.map((step) => step.level)).toEqual(["full", "lite", "min"]);
  expect(seen.at(-1)?.bloom).toBe(0);
  await expectFlat(page, "slow");
  await expect(page.getByRole("status")).toHaveText(NOTICE);
  await expectFlatAnchor(page, "stock2u");
  await page.getByRole("button", { name: "3D로 보기" }).click();
  await waitReady(page);
  await expect.poll(async () => (await qualityNow(page)).level).toBe("min");
  await page.waitForTimeout(6000);
  expect((await qualityNow(page)).flat).toBeNull();
});

test.describe("배율 2 화면의 실행 중 강등", () => {
  // 1280×800에 배율 2면 헤드리스의 소프트웨어 렌더링이 한 프레임에 250ms를 넘어 창을 비우므로(탭 전환과 같게 본다) 세로 화면 크기로 잰다
  test.use({ deviceScaleFactor: 2, viewport: { width: 390, height: 844 } });

  test("강등으로 내린 해상도 배율은 창 크기가 바뀌어도 그 단계의 상한을 넘지 않는다", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto("/journey?debug=stats&busy=50");
    await waitReady(page);
    await expect.poll(async () => (await qualityNow(page)).level, { timeout: 20_000, intervals: [100] }).not.toBe("full");
    const size = page.viewportSize();
    if (!size) throw new Error("화면 크기가 없습니다");
    await page.setViewportSize({ width: size.width - 40, height: size.height });
    const cap: Record<string, number> = { full: 2, lite: 1.5, min: 1 };
    for (let sample = 0; sample < 8; sample++) {
      await page.waitForTimeout(150);
      const quality = (await readStats(page)).quality;
      if (!quality || (await qualityNow(page)).flat) break;
      expect(quality.dpr, quality.level).toBeLessThanOrEqual(cap[quality.level]);
    }
  });
});

test("모든 프레임이 250ms를 넘는 아주 느린 기기(busy 300ms)도 전체 → 경량 → 최소 → 2D로 내려간다", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/journey?debug=stats&busy=300");
  await waitReady(page);
  // 한 프레임이 250ms를 넘으면 창을 비우는 규칙만으로는 매 프레임 창이 비워져 영영 내려가지 않았다. 연속 3번이면 바로 내린다(2-4c)
  await expect.poll(async () => (await qualityNow(page)).flat, { timeout: 40_000, intervals: [250] }).toBe("2d");
  await expectFlat(page, "slow");
});

test("아주 느린 기기에서 자동으로 2D가 된 뒤 다시 고른 3D는 최소에 머물고 2D로 내리지 않는다", async ({ page }) => {
  test.setTimeout(150_000);
  await page.goto("/journey?debug=stats&busy=300");
  await waitReady(page);
  await expect.poll(async () => (await qualityNow(page)).flat, { timeout: 40_000, intervals: [250] }).toBe("2d");
  await page.getByRole("button", { name: "3D로 보기" }).click();
  await waitReady(page);
  await expect.poll(async () => (await qualityNow(page)).level).toBe("min");
  await page.waitForTimeout(6000);
  expect((await qualityNow(page)).flat).toBeNull();
});

// e2e의 헤드리스는 소프트웨어 렌더링이라 원래 느리다. 자동화 브라우저는 확인용 busy가 없으면 단계를 바꾸지 않아 다른 검사가 흔들리지 않는다
test("자동화 브라우저는 느려도 확인용 busy가 없으면 6초가 지나도 전체에 머문다", async ({ page }) => {
  await page.goto("/journey?debug=stats");
  await waitReady(page);
  await page.waitForTimeout(6000);
  expect(await qualityNow(page)).toEqual({ level: "full", bloom: 8, flat: null });
});

test("측정 오버레이(?debug=perf) 중에는 단계를 바꾸지 않는다", async ({ page }) => {
  await page.goto("/journey?debug=perf&busy=50");
  await waitReady(page);
  await page.waitForTimeout(6000);
  expect((await qualityNow(page)).level).toBe("full");
});

test("컨텍스트를 잃은 뒤 3D로 보기를 고르면 장면이 다시 준비되고 기기 단계(전체)부터다", async ({ page }) => {
  await page.goto("/journey?debug=stats");
  await waitReady(page);
  await loseContext(page);
  await expectFlat(page, "context-lost");
  await page.getByRole("button", { name: "3D로 보기" }).click();
  await waitReady(page);
  await expect.poll(async () => (await qualityNow(page)).level).toBe("full");
});

// ── 움직임 줄이기와 휴대폰 상세 시트(2-4b, 스펙 5절 "움직임 줄이기", "2D 레이아웃") ───────────────────

/** 한 번에 멀리 스크롤한 직후 몇 프레임의 카메라 뒤처짐(감쇠한 자세와 목표 자세의 거리, m) 가운데 가장 큰 값 */
async function lagAfterJump(page: Page): Promise<number> {
  await scrollToProgress(page, middleOf("tix2u"));
  await page.waitForTimeout(2000);
  await scrollToProgress(page, middleOf("pfplay"));
  let largest = 0;
  for (let sample = 0; sample < 6; sample++) {
    await page.waitForTimeout(50);
    largest = Math.max(largest, (await readStats(page)).cameraLag);
  }
  return largest;
}

test("움직임 줄이기가 아니면 카메라는 감쇠로 뒤따라오고 빛줄기가 보이며, 휴대폰 상세는 아래에서 올라온다", async ({ page }) => {
  await page.goto("/journey?debug=stats");
  await waitReady(page);
  expect(await lagAfterJump(page)).toBeGreaterThan(0.05);
  expect((await readStats(page)).streaks).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/journey#pfplay");
  const dialog = page.getByRole("dialog", { name: "PFPlay" });
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate((element) => [getComputedStyle(element).animationName, getComputedStyle(element).animationDuration])).toEqual([
    "journey-sheet",
    "0.25s",
  ]);
});

test.describe("움직임 줄이기", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } });

  test("휠은 브라우저 기본 스크롤로 곧바로 가고, 카메라는 스크롤한 만큼만 움직이며 빛줄기는 감춘다", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/journey?debug=stats");
    await waitReady(page);
    expect(await lagAfterJump(page)).toBeLessThan(1e-6);
    expect((await readStats(page)).streaks).toBe(false);
    await page.mouse.move(640, 400);
    const before = await page.evaluate(() => window.scrollY);
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(300);
    expect((await page.evaluate(() => window.scrollY)) - before).toBeGreaterThanOrEqual(390);
  });

  test("2D 카드는 감추지 않고 곧바로 보이며, 세로 화면 고정 카드 바꿈과 휴대폰 상세 시트에 효과가 없다", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/journey?debug=stats&tier=2d");
    await expectFlat(page, "tier");
    const far = page.locator('[data-journey-card="pickcare/app"]');
    expect(await far.evaluate((card) => [getComputedStyle(card).opacity, getComputedStyle(card).transform])).toEqual(["1", "none"]);
    await page.goto("/journey");
    await waitReady(page);
    await expect(page.locator("[data-journey-page]")).toHaveAttribute("data-journey-cards-settled", "");
    expect(await page.locator('[data-journey-card="intro"]').evaluate((card) => getComputedStyle(card).transitionDuration)).toBe("0s");
    await page.goto("/journey#pfplay");
    const dialog = page.getByRole("dialog", { name: "PFPlay" });
    await expect(dialog).toBeVisible();
    expect(await dialog.evaluate((element) => getComputedStyle(element).animationName)).toBe("none");
  });
});

// ── 접근성(2-4c, 스펙 1절 2-4c 완료 조건, 8절) ───────────────────

/** axe(WCAG 2.1 A·AA 규칙)가 찾은 위반: "규칙: 요소들" 한 줄씩. 캔버스 위 글처럼 배경을 알 수 없는 것은 위반이 아니라 확인 필요로 빠진다 */
async function axeViolations(page: Page): Promise<string[]> {
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  return result.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`);
}

test.describe("접근성(axe, WCAG 2.1 A·AA)", () => {
  test("3D 화면에 위반이 없다", async ({ page }) => {
    await page.goto("/journey");
    await waitReady(page);
    expect(await axeViolations(page)).toEqual([]);
  });

  test("2D 화면에 위반이 없다", async ({ page }) => {
    await page.goto("/journey?debug=stats&tier=2d");
    await expectFlat(page, "tier");
    expect(await axeViolations(page)).toEqual([]);
  });

  test("상세가 열린 상태에 위반이 없다", async ({ page }) => {
    await page.goto("/journey#pfplay");
    await expect(page.getByRole("dialog", { name: "PFPlay" })).toBeVisible();
    expect(await axeViolations(page)).toEqual([]);
  });
});

test("페이지 언어가 한국어다(lang=\"ko\")", async ({ page }) => {
  await page.goto("/journey");
  await expect(page.locator("html")).toHaveAttribute("lang", "ko");
});

test("2D에서 Shift+Tab으로 간 링크가 막 탭 밑에 걸쳐 있으면 헤더·막 탭 아래로 옮겨 보인다", async ({ page }) => {
  await page.goto("/journey?debug=stats&tier=2d");
  await expectFlat(page, "tier");
  const previous = page.locator("#stop-tix2u a[data-journey-detail]");
  await page.locator("#stop-pfplay a[data-journey-detail]").focus();
  // 앞 링크(Tix2U)를 막 탭 밑(위 70px)에 둔다. 화면 안이라 브라우저는 스크롤하지 않고, 위 여백이 없으면 막 탭에 가린다.
  // 화면 밖의 링크는 브라우저가 화면 가운데로 옮겨 가리지 않는다
  await previous.evaluate((link) => window.scrollBy({ top: link.getBoundingClientRect().top - 70, behavior: "instant" }));
  await page.keyboard.press("Shift+Tab");
  await expect(previous).toBeFocused();
  await expect.poll(async () => Math.round((await previous.boundingBox())?.y ?? -1)).toBeGreaterThanOrEqual(104);
});

test("3D 진행 막대의 2D 버튼은 누르는 자리가 24×24px 이상이다", async ({ page }) => {
  await page.goto("/journey");
  const box = await page.getByRole("button", { name: "2D로 보기" }).boundingBox();
  if (!box) throw new Error("2D 버튼이 없습니다");
  expect(box.width).toBeGreaterThanOrEqual(24);
  expect(box.height).toBeGreaterThanOrEqual(24);
});

test("상세가 열린 동안 자동으로 2D가 되면 알림은 상세를 닫은 뒤에 6초 뜬다", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/journey");
  await waitReady(page);
  await settleAt(page, middleOf("tix2u"));
  await page.locator("#stop-tix2u a[data-journey-detail]").click();
  await expect(page.getByRole("dialog", { name: "Tix2U" })).toBeVisible();
  await loseContext(page);
  await expectFlat(page, "context-lost");
  await expect(page.getByRole("status")).toHaveText("");
  await page.waitForTimeout(6500);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("status")).toHaveText(NOTICE);
  await expect(page.getByRole("status")).toHaveText("", { timeout: 8000 });
});

// ── 포커스 복귀·좁은 헤더·상세를 열 때 밀림(2-4c, 스펙 4·5절) ───────────────────

// 상세 닫기는 뒤로 가기(history.back)라 브라우저가 연 때의 스크롤 위치로 되돌린다. 포커스가 돌아온 링크를 따라가는 고정 카드 스크롤이
// 같은 프레임에 되돌려져, 마우스·터치로 열면 보던 자리에, 키보드로 열면(Tab이 이미 그 카드로 옮겨 둔) 링크의 카드 자리에 돌아온다
test("세로 화면에서 옆 저장소 홀로그램을 눌러 연 상세를 닫으면 보던 자리에 머문다", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/journey?debug=stats");
  await waitReady(page);
  await settleAt(page, at("pickcare", 0.3));
  await expect(page.locator('[data-journey-card="pickcare/biz"]')).toHaveAttribute("data-active", "");
  const before = await page.evaluate(() => window.scrollY);
  const point = await hologramCenter(page, "pickcare/studio");
  await page.mouse.click(point.x, point.y);
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.locator('#stop-pickcare a[data-journey-detail][href$="#pickcare/studio"]')).toBeFocused();
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.scrollY)).toBe(before);
  await expect(page.locator('[data-journey-card="pickcare/biz"]')).toHaveAttribute("data-active", "");
});

test("세로 화면에서 키보드로 연 상세를 닫으면 그 링크의 카드 자리에 있다", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/journey?debug=stats");
  await waitReady(page);
  await settleAt(page, at("pickcare", 0.3));
  const link = page.locator('#stop-pickcare a[data-journey-detail][href$="#pickcare/studio"]');
  await link.focus();
  await expect(page.locator('[data-journey-card="pickcare/studio"]')).toHaveAttribute("data-active", "");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(link).toBeFocused();
  await page.waitForTimeout(500);
  await expect(page.locator('[data-journey-card="pickcare/studio"]')).toHaveAttribute("data-active", "");
});

test("좁은 휴대폰(360·375px)에서 헤더 메뉴가 한 줄에 다 들고 GitHub 링크 이름은 그대로다", async ({ page }) => {
  for (const width of [360, 375, 390]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/journey");
    const nav = page.locator("[data-site-header] nav");
    expect(await nav.evaluate((element) => element.scrollWidth - element.clientWidth), `${width}px`).toBeLessThanOrEqual(0);
    await expect(nav.getByRole("link", { name: "GitHub", exact: true }), `${width}px`).toBeVisible();
  }
  await expect(page.locator("[data-site-header] nav").getByText("GitHub", { exact: true })).toBeVisible();
});

test("헤더 메뉴의 첫 링크와 끝 링크에 포커스해도 테두리 자리가 메뉴 안에 남는다", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/journey");
  const nav = await page.locator("[data-site-header] nav").boundingBox();
  if (!nav) throw new Error("헤더 메뉴가 없습니다");
  for (const name of ["블로그", "GitHub"]) {
    const link = await page.locator("[data-site-header] nav").getByRole("link", { name, exact: true }).boundingBox();
    if (!link) throw new Error(`${name} 링크가 없습니다`);
    // 포커스 테두리(바깥 2px)가 넘치는 메뉴(overflow)에 잘리지 않으려면 링크 둘레에 2px 넘는 여유가 있어야 한다
    expect(link.y - nav.y, name).toBeGreaterThanOrEqual(2);
    expect(nav.y + nav.height - (link.y + link.height), name).toBeGreaterThanOrEqual(2);
    expect(link.x - nav.x, name).toBeGreaterThanOrEqual(2);
    expect(nav.x + nav.width - (link.x + link.width), name).toBeGreaterThanOrEqual(2);
  }
});

test("좁은 휴대폰(360px) 헤더의 GitHub 아이콘 링크에도 접근성 위반이 없다", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/journey");
  await waitReady(page);
  expect(await axeViolations(page)).toEqual([]);
});

// 막대가 15px 자리를 차지하는 데스크톱(Windows 등)에서는 상세가 스크롤을 잠글 때(Lenis의 overflow: clip) 막대가 사라져 본문이 밀렸다.
// 이 맥의 창 없는 Chromium은 막대를 숨기거나 겹쳐 그려 폭이 0이고, ::-webkit-scrollbar로 그린 막대에는 scrollbar-gutter가 걸리지 않아
// 밀림 자체를 잴 수 없다. 그래서 잠긴 동안 <html>이 막대 자리를 남기는 스크롤 컨테이너(overflow: hidden, scrollbar-gutter: stable)인지 본다
test("상세가 스크롤을 잠가도 스크롤 막대 자리를 남긴다", async ({ page }) => {
  await page.goto("/journey");
  await page.locator("#stop-todo-app a[data-journey-detail]").evaluate((link: HTMLAnchorElement) => link.click());
  await expect(page.getByRole("dialog", { name: "Todo App" })).toBeVisible();
  await expect(page.locator("html")).toHaveClass(/lenis-stopped/);
  expect(await page.evaluate(() => [getComputedStyle(document.documentElement).overflow, getComputedStyle(document.documentElement).scrollbarGutter])).toEqual([
    "hidden",
    "stable",
  ]);
});

// ── 넘긴 동작 결함(2-4c) ───────────────────

test("세로 화면에서 앱이 해시를 바꾸면(홀로그램으로 상세 열기) 고정 카드가 곧바로 그 저장소 카드로 바뀐다", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/journey?debug=stats");
  await waitReady(page);
  await settleAt(page, at("pickcare", 0.3));
  await expect(page.locator('[data-journey-card="pickcare/biz"]')).toHaveAttribute("data-active", "");
  const point = await hologramCenter(page, "pickcare/studio");
  await page.mouse.click(point.x, point.y);
  await expect(page.getByRole("dialog")).toBeVisible();
  // 상세는 pushHash로 해시를 바꿔 브라우저의 hashchange가 오지 않는다. 앞줄은 해시를 따르므로 고정 카드도 스크롤 없이 따라야 한다
  await expect(page.locator('[data-journey-card="pickcare/studio"]')).toHaveAttribute("data-active", "", { timeout: 2000 });
});

test("기기 단계 2D 기기가 하이드레이션 전에 스크롤했어도 2D에서 보던 정류장 카드에 있다", async ({ page }) => {
  const release = await holdScripts(page);
  await page.goto("/journey?debug=stats&tier=2d", { waitUntil: "commit" });
  await page.locator("[data-journey-page]").waitFor({ state: "attached" });
  await scrollToProgress(page, middleOf("tix2u"));
  release();
  await expectFlat(page, "tier");
  await expectFlatAnchor(page, "tix2u");
});

test("2D를 기억한 방문자가 블로그에서 헤더로 들어와도 첫 그림부터 2D다", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("journey-view", "2d");
    const w = window as Window & { __flash3d?: boolean };
    // 여정 본문이 문서에 들어온 작업이 끝난 직후(마이크로태스크, 그리기 전)에 2D 표지가 있는지 본다. effect로 걸면 그리기 뒤에 돌아 아직 없고,
    // layout effect면 같은 작업 안에서 걸려 있다. 클라이언트 이동은 같은 문서라 이 관찰이 이어진다
    new MutationObserver(() => {
      if (w.__flash3d === undefined && document.querySelector("[data-journey-page]")) w.__flash3d = document.documentElement.dataset.journeyMode !== "2d";
    }).observe(document, { childList: true, subtree: true });
  });
  await page.goto("/blog");
  await page.locator("[data-site-header]").getByRole("link", { name: "Journey", exact: true }).click();
  await expect(page).toHaveURL(/\/journey$/);
  await expectFlat(page, "manual");
  expect(await page.evaluate(() => (window as Window & { __flash3d?: boolean }).__flash3d ?? false)).toBe(false);
});

// ── 짧은 가로 화면(2-4c, 스펙 5절 "짧은 가로 화면") ───────────────────

test.describe("짧은 가로 화면(터치, 750×340)", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 750, height: 340 } });

  test("2D(이유: 화면)로 열리고 알림과 3D로 보기가 없으며, 세로로 돌리면 3D로 돌아와 보던 막에 있다", async ({ page }) => {
    await page.goto("/journey?debug=stats");
    await expectFlat(page, "screen");
    const tabs = page.getByRole("navigation", { name: "여정 막" });
    await expect(tabs).toBeVisible();
    await expect(page.getByRole("button", { name: "3D로 보기" })).toHaveCount(0);
    await expect(page.getByRole("status")).toHaveText("");
    await tabs.getByRole("button", { name: "2막 협업으로 이동" }).click();
    await expectFlatAnchor(page, "act-2");
    await page.setViewportSize({ width: 340, height: 750 });
    await expect(page.locator("html")).not.toHaveAttribute("data-journey-mode", /.*/);
    await waitReady(page);
    const range = rangeOf("act-2");
    await expect.poll(async () => (await readStats(page)).progress).toBeGreaterThanOrEqual(range.start);
    expect((await readStats(page)).progress).toBeLessThanOrEqual(range.end);
  });

  test("세로 3D에서 가로로 돌리면 2D가 되고 보던 카드가 막 탭 아래에 있다", async ({ page }) => {
    await page.setViewportSize({ width: 340, height: 750 });
    await page.goto("/journey");
    await waitReady(page);
    await settleAt(page, middleOf("tix2u"));
    await page.setViewportSize({ width: 750, height: 340 });
    await expectFlat(page, "screen");
    await expectFlatAnchor(page, "tix2u");
  });

  test("상세가 열린 채 가로로 돌려도 상세는 그대로이고, 닫으면 2D에서 그 정류장 카드가 막 탭 아래에 있다", async ({ page }) => {
    await page.setViewportSize({ width: 340, height: 750 });
    await page.goto("/journey");
    await waitReady(page);
    await settleAt(page, middleOf("tix2u"));
    await page.locator("#stop-tix2u a[data-journey-detail]").click();
    await expect(page.getByRole("dialog", { name: "Tix2U" })).toBeVisible();
    await page.setViewportSize({ width: 750, height: 340 });
    await expectFlat(page, "screen");
    await expect(page.getByRole("dialog", { name: "Tix2U" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
    await expectFlatAnchor(page, "tix2u");
  });

  // 잠긴 동안의 스크롤 위치는 앞 배치의 값이라, 그것으로 보던 카드를 다시 구하면 엉뚱한 카드(대개 엔딩)가 된다(2-4c 최종 리뷰)
  test("상세가 열린 채 가로로 돌렸다가 다시 세로로 돌리고 닫아도 그 정류장 카드에 있다", async ({ page }) => {
    await page.setViewportSize({ width: 340, height: 750 });
    await page.goto("/journey");
    await waitReady(page);
    await settleAt(page, middleOf("tix2u"));
    await page.locator("#stop-tix2u a[data-journey-detail]").click();
    await expect(page.getByRole("dialog", { name: "Tix2U" })).toBeVisible();
    await page.setViewportSize({ width: 750, height: 340 });
    await expectFlat(page, "screen");
    await page.setViewportSize({ width: 340, height: 750 });
    await expect(page.locator("html")).not.toHaveAttribute("data-journey-mode", /.*/);
    await waitReady(page);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
    const tix2u = page.locator('[data-journey-card="tix2u"]');
    await expect(tix2u).toHaveAttribute("data-active", "");
    await page.waitForTimeout(500);
    await expect(tix2u).toHaveAttribute("data-active", "");
  });

  test("2D를 기억한 방문자는 가로로 들었다가 세로로 돌려도 2D(이유: 수동)다", async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem("journey-view", "2d"));
    await page.goto("/journey");
    await expectFlat(page, "manual");
    await page.setViewportSize({ width: 340, height: 750 });
    await page.waitForTimeout(500);
    await expectFlat(page, "manual");
  });

  test("저장소가 막힌 브라우저에서도 짧은 가로 화면은 처음부터 2D이고 오류가 없다", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "localStorage", {
        get() {
          throw new DOMException("저장소가 막혀 있습니다", "SecurityError");
        },
      });
    });
    const errors = collectErrors(page);
    const release = await holdScripts(page);
    await page.goto("/journey", { waitUntil: "commit" });
    await page.locator("[data-journey-page]").waitFor({ state: "attached" });
    await expect(page.locator("html")).toHaveAttribute("data-journey-mode", "2d");
    release();
    await expectFlat(page, "screen");
    expect(errors).toEqual([]);
  });

  test("하이드레이션 전(서버가 그린 화면)부터 2D 배치다", async ({ page }) => {
    const release = await holdScripts(page);
    await page.goto("/journey", { waitUntil: "commit" });
    await page.locator("[data-journey-page]").waitFor({ state: "attached" });
    await expect(page.locator("html")).toHaveAttribute("data-journey-mode", "2d");
    release();
    await expectFlat(page, "screen");
  });
});

test("터치가 아니면 낮은 가로 창(1280×450)도 3D다", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 450 });
  await page.goto("/journey");
  await waitReady(page);
  await expect(page.locator("html")).not.toHaveAttribute("data-journey-mode", /.*/);
});

test.describe("터치 기기", () => {
  test.use({ hasTouch: true, isMobile: true });

  test("포인터가 굵은 기기(터치)는 3D 경량으로 판정된다", async ({ page }) => {
    await page.goto("/journey?debug=stats");
    await waitReady(page);
    expect((await readStats(page)).quality?.tier).toBe("lite");
  });
});

type HologramStats = {
  shown: string[];
  hovered: string | null;
  glowing: string[];
  front: string;
  screens: { id: string; rect: [number, number, number, number]; distance: number; target: boolean }[];
};

type LandscapeStats = {
  meshes: { name: string; visible: boolean; calls: number; geometry: string }[];
  revealS: number;
  carS: number;
  ending: number;
  camera: [number, number, number];
  spire: [number, number, number, number] | null;
};

type JourneyStats = {
  frames: number;
  maxCalls: number;
  programs: number;
  programsAtReady: number;
  textureBytes: number;
  progress: number;
  carPosition: [number, number, number] | null;
  wheelTravel: number | null;
  holograms: HologramStats | null;
  landscape: LandscapeStats | null;
  quality: { tier: string; level: string; dpr: number; galaxyWidth: number; bloomLevels: number; luminanceScale: number } | null;
  renderTargetBytes: number;
  lens: { fov: number; center: number };
  cameraLag: number;
  streaks: boolean;
};

async function readStats(page: Page): Promise<JourneyStats> {
  const stats = await page.evaluate(() => (window as Window & { __journeyStats?: unknown }).__journeyStats);
  if (!stats) throw new Error("?debug=stats 통계가 없습니다");
  return stats as JourneyStats;
}

/** 진행률 p 자리로 바로 스크롤한다. ScrollTrigger의 진행률은 본문 위끝이 화면 위에 닿을 때 0, 아래끝이 화면 아래에 닿을 때 1이다 */
async function scrollToProgress(page: Page, progress: number) {
  await page.evaluate((target) => {
    const main = document.querySelector("[data-journey-page]");
    if (!(main instanceof HTMLElement)) throw new Error("여정 본문이 없습니다");
    const top = main.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top + target * (main.offsetHeight - window.innerHeight), behavior: "instant" });
  }, progress);
}

function middleOf(id: string): number {
  const range = rangeOf(id);
  return (range.start + range.end) / 2;
}

test("차 모델이 늦게 와도 나타나는 순간 지금 진행률의 자세다", async ({ page }) => {
  await page.route("**/journey/car/CarConcept.gltf", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    await route.continue();
  });
  await page.goto("/journey?debug=stats");
  // 모델을 기다리는 동안 먼저 스크롤한다(스크롤은 3D 준비를 기다리지 않는다).
  await scrollToProgress(page, middleOf("stock2u"));
  await waitReady(page);
  await expect(page.locator("[data-journey-scene]")).toHaveAttribute("data-car", "model");
  const stats = await readStats(page);
  expect(stats.progress).toBeGreaterThan(rangeOf("stock2u").start);
  const expected = driveAt(stats.progress).car.position;
  expect(stats.carPosition).not.toBeNull();
  stats.carPosition?.forEach((value, axis) => expect(value).toBeCloseTo(expected[axis], 2));
});

// 스펙 3절 "차": 바퀴는 차가 달린 도로 거리만큼 구른다. 거리는 스크롤 위치로 정해져 위로 스크롤하면 거꾸로 돈다.
test("바퀴가 구른 거리는 지금 차가 달린 도로 거리이고, 위로 스크롤하면 준다", async ({ page }) => {
  await page.goto("/journey?debug=stats");
  await waitReady(page);
  await expect(page.locator("[data-journey-scene]")).toHaveAttribute("data-car", "model");
  const travels: number[] = [];
  for (const progress of [middleOf("kokoa-clone"), middleOf("stock2u"), middleOf("todo-app")]) {
    await scrollToProgress(page, progress);
    await expect
      .poll(async () => {
        const stats = await readStats(page);
        return stats.wheelTravel !== null && Math.abs(stats.progress - progress) < 1e-4 && Math.abs(stats.wheelTravel - driveAt(stats.progress).carS) < 0.01;
      })
      .toBe(true);
    travels.push((await readStats(page)).wheelTravel ?? NaN);
  }
  expect(travels[1]).toBeGreaterThan(travels[0]);
  expect(travels[2]).toBeLessThan(travels[1]);
});

// 스펙 7절: 준비 뒤 스크롤 중에 셰이더 프로그램이 새로 생기지 않고, 가장 무거운 프레임의 드로콜이 60개 이하다.
// 드로콜과 프로그램 수는 GPU와 상관없어 헤드리스(소프트웨어 렌더링)에서도 실제와 같다.
test("준비 뒤 모든 정류장을 지나도 셰이더 프로그램이 새로 생기지 않고 드로콜은 60개 이하다", async ({ page }) => {
  await page.goto("/journey?debug=stats");
  await waitReady(page);
  for (const id of STOP_IDS) {
    const range = rangeOf(id);
    for (const t of [0.1, 0.5, 0.9]) {
      await scrollToProgress(page, range.start + (range.end - range.start) * t);
      await page.waitForTimeout(150);
    }
  }
  await scrollToProgress(page, 1);
  await page.waitForTimeout(500);
  const stats = await readStats(page);
  expect(stats.programs).toBe(stats.programsAtReady);
  expect(stats.maxCalls).toBeGreaterThan(0);
  expect(stats.maxCalls).toBeLessThanOrEqual(60);
  // 은하 사진(4096×2048, 밉맵 없이 32.0MiB)과 차 텍스처가 들어 있어야 하고, 스펙 7절 예산(100MiB) 아래여야 한다.
  expect(stats.textureBytes).toBeGreaterThan(20 * 1024 * 1024);
  expect(stats.textureBytes).toBeLessThan(100 * 1024 * 1024);
});

// 스펙 3절 "제품 화면 홀로그램": 층 이미지 11장을 텍스처 배열 하나로 그린다. 실패는 갈래마다 따로 확인한다.
async function shownHolograms(page: Page): Promise<string[]> {
  await expect.poll(async () => Array.isArray((await readStats(page)).holograms?.shown)).toBe(true);
  return (await readStats(page)).holograms?.shown ?? [];
}

test("3D가 준비되면 홀로그램 11개가 켜지고 콘솔 에러가 없다", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/journey?debug=stats");
  await waitReady(page);
  expect(await shownHolograms(page)).toHaveLength(11);
  expect(errors).toEqual([]);
});

test("홀로그램 이미지 한 장을 받지 못하면 그 홀로그램만 빠지고 장면은 이어진다", async ({ page }) => {
  await page.route("**/journey/holograms/stock2u.webp", (route) => route.fulfill({ status: 404, body: "" }));
  await page.goto("/journey?debug=stats");
  await waitReady(page);
  const shown = await shownHolograms(page);
  expect(shown).toHaveLength(10);
  expect(shown).not.toContain("stock2u");
  await page.keyboard.press("End");
  await expect(page.getByText(EMAIL)).toBeInViewport();
});

test("홀로그램 이미지를 모두 받지 못하면 홀로그램 없이 장면이 이어진다", async ({ page }) => {
  await page.route("**/journey/holograms/**", (route) => route.fulfill({ status: 404, body: "" }));
  await page.goto("/journey?debug=stats");
  await waitReady(page);
  expect(await shownHolograms(page)).toEqual([]);
  await page.keyboard.press("End");
  await expect(page.getByText(EMAIL)).toBeInViewport();
});

test("텍스처 배열을 올리지 못하면(GPU 업로드 오류) 홀로그램 없이 장면이 이어진다", async ({ page }) => {
  const warnings: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "warning") warnings.push(message.text());
  });
  // 배열 텍스처의 저장 공간만 한도를 넘는 크기로 잡게 해 진짜 GL 오류를 일으킨다. 장면의 배열 텍스처는 홀로그램 하나뿐이다(차 KTX2는 단일 층)
  await page.addInitScript(() => {
    const original = WebGL2RenderingContext.prototype.texStorage3D;
    WebGL2RenderingContext.prototype.texStorage3D = function (
      this: WebGL2RenderingContext,
      target: number,
      levels: number,
      format: number,
      width: number,
      height: number,
      depth: number,
    ) {
      return original.call(this, target, levels, format, target === this.TEXTURE_2D_ARRAY ? 65536 : width, height, depth);
    };
  });
  await page.goto("/journey?debug=stats");
  await waitReady(page);
  expect(await shownHolograms(page)).toEqual([]);
  expect(warnings.some((message) => message.includes("올리지 못해"))).toBe(true);
  await page.keyboard.press("End");
  await expect(page.getByText(EMAIL)).toBeInViewport();
});

function at(id: string, within: number): number {
  const range = rangeOf(id);
  return range.start + (range.end - range.start) * within;
}

/**
 * 저장소 i의 읽기 자리(PiCKCARE 안의 위치): 앞줄 전환 사이의 가운데. 저장소 진행률 u = (i + 0.5 − FRONT_LEAD)/5(첫 저장소는 0)를
 * 본문 저장소 패널 구간(앞에서 HALL_REPO_START 뒤 ~ 뒤에서 HALL_REPO_END 앞, 화면)으로 되돌린다
 */
function hallReading(index: number): number {
  const length = rangeOf("pickcare").stop.length;
  const u = Math.max(0, (index + 0.5 - FRONT_LEAD) / REPO_COUNT);
  return (HALL_REPO_START + u * (length - HALL_REPO_START - HALL_REPO_END)) / length;
}

test("PiCKCARE 앞줄은 화면에 혼자 보이는 저장소 패널을 따르고, 상세가 열리면 탭을 따른다", async ({ page }) => {
  await page.goto("/journey?debug=stats");
  await waitReady(page);
  const repos = ["frontend", "biz", "studio", "app", "cardnews"];
  for (const [index, repo] of repos.entries()) {
    await scrollToProgress(page, at("pickcare", hallReading(index)));
    await expect.poll(async () => (await readStats(page)).holograms?.front, repo).toBe(`pickcare/${repo}`);
    await expect(page.locator(`a[data-journey-detail][href="#pickcare/${repo}"]`), repo).toBeInViewport();
  }
  await scrollToProgress(page, at("pickcare", hallReading(1)));
  await page.locator('a[data-journey-detail][href="#pickcare/biz"]').click();
  await expect(page.getByRole("dialog", { name: "PiCKCARE" })).toBeVisible();
  await page.getByRole("tab", { name: "app" }).click();
  await expect.poll(async () => (await readStats(page)).holograms?.front).toBe("pickcare/app");
  await page.getByRole("tab", { name: "cardnews" }).click();
  await expect.poll(async () => (await readStats(page)).holograms?.front).toBe("pickcare/cardnews");
  await page.goBack();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page).toHaveURL(/\/journey\?debug=stats$/);
  await expect.poll(async () => (await readStats(page)).holograms?.front).toBe("pickcare/biz");
});

// 스펙 3절 "PiCKCARE 앞줄": 본문 저장소 패널은 HALL_REPO_START·HALL_REPO_END 구간에 블록 다섯으로 놓이고, 패널은 블록 아래끝에서
// 12svh 위다. 단위 테스트(holograms.place.test.ts)가 이 배치 모형으로 가림과 앞줄 전환을 보고, 여기서 모형을 실제 DOM과 대조한다.
const HALL_VIEWPORTS = [
  { width: 1280, height: 720 },
  { width: 1920, height: 1080 },
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
];

test("PiCKCARE 저장소 패널이 배치 모형의 자리에 있고, 네 화면 크기에서 저장소마다 읽기 자리에 그 패널만 화면 안에 다 들어온다", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "세로 화면은 아래 고정 카드라 배치 모형이 없다(세로 화면 PiCKCARE 테스트가 따로 본다)");
  const length = rangeOf("pickcare").stop.length;
  const block = (length - HALL_REPO_START - HALL_REPO_END) / REPO_COUNT;
  for (const viewport of HALL_VIEWPORTS) {
    await page.setViewportSize(viewport);
    await page.goto("/journey");
    for (let index = 0; index < REPO_COUNT; index++) {
      const within = hallReading(index);
      await scrollToProgress(page, at("pickcare", within));
      const layout = await page.evaluate(() => {
        const header = document.querySelector("[data-site-header]");
        const intro = document.querySelector("#stop-pickcare > .sticky > div");
        const repos = [...document.querySelectorAll("#stop-pickcare > .absolute > div > div")];
        if (!header || !intro || repos.length !== 5) throw new Error("PiCKCARE 패널을 찾지 못했습니다");
        const rect = (element: Element) => {
          const box = element.getBoundingClientRect();
          return [box.left / innerWidth, box.top / innerHeight, box.right / innerWidth, box.bottom / innerHeight];
        };
        return { header: header.getBoundingClientRect().bottom / innerHeight, intro: rect(intro), repos: repos.map(rect) };
      });
      const label = `${viewport.width}x${viewport.height} 저장소 ${index}`;
      // 모형: 패널 i의 아래끝 = HALL_REPO_START + (i+1)·블록 − 0.12 − L·t (화면, 구역 위끝이 화면 위에서 −L·t)
      layout.repos.forEach((rect, panel) => {
        const bottom = HALL_REPO_START + (panel + 1) * block - 0.12 - length * within;
        expect(rect[3], `${label} 패널 ${panel} 아래끝`).toBeCloseTo(bottom, 2);
      });
      const full = layout.repos.flatMap((rect, panel) => (rect[1] >= layout.header && rect[3] <= 1 ? [panel] : []));
      expect(full, label).toEqual([index]);
      const panel = layout.repos[index];
      const intro = layout.intro;
      expect(panel[0] < intro[2] && intro[0] < panel[2] && panel[1] < intro[3] && intro[1] < panel[3], `${label} 소개 패널과 겹침`).toBe(false);
    }
  }
});

// 스펙 3절 "홀로그램 상호작용". 마우스 호버·커서를 보는 테스트는 넓은 화면에서만 본다(휴대폰 세로 화면에는 호버가 없다).
const HOVER_SKIP = "휴대폰 세로 화면에는 마우스 호버가 없어 넓은 화면에서만 본다";
/** 카메라와 PiCKCARE 앞줄의 감쇠가 자리에 닿을 때까지 */
const SETTLE_MS = 2500;

async function settleAt(page: Page, progress: number) {
  await scrollToProgress(page, progress);
  await page.waitForTimeout(SETTLE_MS);
}

/** 누를 수 있는 홀로그램의 그림 영역 가운데(화소) */
async function hologramCenter(page: Page, id: string): Promise<{ x: number; y: number }> {
  await expect.poll(async () => (await readStats(page)).holograms?.screens.find((screen) => screen.id === id)?.target ?? false).toBe(true);
  const screen = (await readStats(page)).holograms?.screens.find((item) => item.id === id);
  const viewport = page.viewportSize();
  if (!screen || !viewport) throw new Error(`${id} 홀로그램이 화면에 없습니다`);
  return {
    x: ((screen.rect[0] + screen.rect[2]) / 2) * viewport.width,
    y: ((screen.rect[1] + screen.rect[3]) / 2) * viewport.height,
  };
}

async function canvasCursor(page: Page): Promise<string> {
  return page.locator("[data-journey-scene] canvas").evaluate((canvas) => getComputedStyle(canvas).cursor);
}

test("홀로그램을 누르면 짝인 상세가 열리고, 닫으면 포커스가 그 링크로 돌아온다", async ({ page }) => {
  await page.goto("/journey?debug=stats");
  await waitReady(page);
  await settleAt(page, middleOf("stock2u"));
  const point = await hologramCenter(page, "stock2u");
  await page.mouse.click(point.x, point.y);
  await expect(page.getByRole("dialog", { name: "Stock2U" })).toBeVisible();
  await expect(page).toHaveURL(/#stock2u$/);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.locator("#stop-stock2u a[data-journey-detail]")).toBeFocused();
});

test("키보드(Enter)로 연 상세를 닫아도 포커스가 그 링크로 돌아온다", async ({ page }) => {
  await page.goto("/journey");
  const link = page.locator("#stop-tix2u a[data-journey-detail]");
  await link.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Tix2U" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(link).toBeFocused();
});

test("홀로그램 위에서는 커서가 pointer이고, 누를 수 없는 코코아톡 위에서는 바뀌지 않는다", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", HOVER_SKIP);
  await page.goto("/journey?debug=stats");
  await waitReady(page);
  await settleAt(page, middleOf("stock2u"));
  const stock2u = await hologramCenter(page, "stock2u");
  await page.mouse.move(stock2u.x, stock2u.y);
  await expect.poll(() => canvasCursor(page)).toBe("pointer");
  await expect.poll(async () => (await readStats(page)).holograms?.hovered).toBe("stock2u");
  await settleAt(page, at("kokoa-clone", 0.25));
  const screen = (await readStats(page)).holograms?.screens.find((item) => item.id === "kokoa-clone");
  const viewport = page.viewportSize();
  if (!screen || !viewport) throw new Error("코코아톡 홀로그램이 화면에 없습니다");
  expect(screen.target).toBe(false);
  await page.mouse.move(((screen.rect[0] + screen.rect[2]) / 2) * viewport.width, ((screen.rect[1] + screen.rect[3]) / 2) * viewport.height);
  await page.waitForTimeout(500);
  expect(await canvasCursor(page)).not.toBe("pointer");
  expect((await readStats(page)).holograms?.hovered).toBeNull();
});

/** PiCKCARE 머묾 앞(앞줄 biz)에서 biz 홀로그램 위에 마우스를 둔다. 포인터 자리(화소)를 낸다 */
async function pointAtPickcareBiz(page: Page): Promise<{ x: number; y: number }> {
  await page.goto("/journey?debug=stats");
  await waitReady(page);
  await settleAt(page, at("pickcare", 0.3));
  const start = await hologramCenter(page, "pickcare/biz");
  await page.mouse.move(start.x, start.y);
  return start;
}

/**
 * 지금 프레임의 호버가 포인터(화소)를 덮은 가장 가까운 홀로그램과 같은지 본다. 그림 영역 안쪽(가장자리 15%를 뺀 곳)에 포인터가 든
 * 홀로그램이 있으면 그 id를 낸다. 가장자리 근처(테두리까지 맞는 띠)는 건너뛰고, 멀리 벗어나 있으면 호버가 없어야 한다
 */
async function expectHoverUnder(page: Page, point: { x: number; y: number }, label: string): Promise<string | null> {
  const viewport = page.viewportSize();
  const holograms = (await readStats(page)).holograms;
  if (!viewport || !holograms) throw new Error("화면 크기나 홀로그램 통계를 읽지 못했습니다");
  const pointer = { x: point.x / viewport.width, y: point.y / viewport.height };
  const inside = (rect: number[], grow: number) => {
    const width = rect[2] - rect[0];
    const height = rect[3] - rect[1];
    return (
      pointer.x > rect[0] - grow * width &&
      pointer.x < rect[2] + grow * width &&
      pointer.y > rect[1] - grow * height &&
      pointer.y < rect[3] + grow * height
    );
  };
  const targets = holograms.screens.filter((screen) => screen.target);
  const under = targets.filter((screen) => inside(screen.rect, -0.15)).sort((a, b) => a.distance - b.distance)[0];
  if (under) {
    expect(holograms.hovered, label).toBe(under.id);
    return under.id;
  }
  // 광선은 그림을 두른 테두리(가장자리에서 약 0.54m 바깥)까지 맞는다. 작은 그림(뒷줄 app·cardnews)에서는 그림 크기의 절반 가까이다
  if (!targets.some((screen) => inside(screen.rect, 0.6))) expect(holograms.hovered, label).toBeNull();
  return null;
}

test("포인터를 두고 스크롤해도 호버는 포인터를 덮는 가장 가까운 홀로그램이고, 누르면 그 상세가 열린다", async ({ page }, testInfo) => {
  // 장면 준비와 여러 자리의 기다림으로 원래 25~28초가 걸려 기본 한도(30초)에 붙어 있었다. 기계가 바쁘면 넘쳤다(2-4c)
  test.setTimeout(60_000);
  test.skip(testInfo.project.name === "mobile", HOVER_SKIP);
  const start = await pointAtPickcareBiz(page);
  let decided = 0;
  let last: string | null = null;
  for (let within = 0.3; within <= 0.81; within += 0.05) {
    await scrollToProgress(page, at("pickcare", within));
    await page.waitForTimeout(1200);
    const under = await expectHoverUnder(page, start, `t=${within.toFixed(2)}`);
    if (under) {
      decided += 1;
      last = under;
    }
  }
  expect(decided).toBeGreaterThanOrEqual(3);
  const hash = HOLOGRAMS.find((hologram) => hologram.id === last)?.linkHash;
  await page.mouse.click(start.x, start.y);
  await expect(page).toHaveURL(new RegExp(`${hash?.replace("/", "\\/")}$`));
});

test("마우스 휠로 스크롤해도 호버는 포인터를 덮는 가장 가까운 홀로그램을 따른다", async ({ page }, testInfo) => {
  // 장면 준비와 여러 자리의 기다림으로 원래 25~28초가 걸려 기본 한도(30초)에 붙어 있었다. 기계가 바쁘면 넘쳤다(2-4c)
  test.setTimeout(60_000);
  test.skip(testInfo.project.name === "mobile", HOVER_SKIP);
  const start = await pointAtPickcareBiz(page);
  await expect.poll(async () => (await readStats(page)).holograms?.hovered).toBe("pickcare/biz");
  const range = rangeOf("pickcare");
  // PiCKCARE 구간의 5%만큼 휠을 굴린다(scrollToProgress와 같은 환산)
  const step = await page.evaluate((span) => {
    const main = document.querySelector("[data-journey-page]");
    if (!(main instanceof HTMLElement)) throw new Error("여정 본문이 없습니다");
    return span * (main.offsetHeight - window.innerHeight);
  }, 0.05 * (range.end - range.start));
  const decided: string[] = [];
  for (let count = 1; count <= 10; count++) {
    await page.mouse.wheel(0, step);
    await page.waitForTimeout(1200);
    const under = await expectHoverUnder(page, start, `휠 ${count}번`);
    if (under) decided.push(under);
  }
  expect(decided.length).toBeGreaterThanOrEqual(3);
  expect(new Set(decided).size).toBeGreaterThanOrEqual(2);
});

test("홀로그램에서 본문 패널로 포인터를 옮기면 호버가 풀리고 다시 켜지지 않는다", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", HOVER_SKIP);
  await page.goto("/journey?debug=stats");
  await waitReady(page);
  await settleAt(page, middleOf("stock2u"));
  const point = await hologramCenter(page, "stock2u");
  await page.mouse.move(point.x, point.y);
  await expect.poll(async () => (await readStats(page)).holograms?.hovered).toBe("stock2u");
  const link = await page.locator("#stop-stock2u a[data-journey-detail]").boundingBox();
  if (!link) throw new Error("Stock2U 패널의 링크가 없습니다");
  await page.mouse.move(link.x + link.width / 2, link.y + link.height / 2);
  await page.waitForTimeout(500);
  expect((await readStats(page)).holograms?.hovered).toBeNull();
  expect(await canvasCursor(page)).not.toBe("pointer");
});

test("홀로그램마다 짝인 상세 링크가 정확히 하나다", async ({ page }) => {
  await page.goto("/journey");
  for (const hologram of HOLOGRAMS) {
    if (!hologram.linkHash) continue;
    await expect(page.locator(`a[data-journey-detail][href="${hologram.linkHash}"]`), hologram.id).toHaveCount(1);
  }
});

test("홀로그램을 두 번 눌러도 기록은 하나만 남는다", async ({ page }) => {
  await page.goto("/journey?debug=stats");
  await waitReady(page);
  await settleAt(page, middleOf("pfplay"));
  const point = await hologramCenter(page, "pfplay");
  const before = await page.evaluate(() => history.length);
  await page.mouse.dblclick(point.x, point.y);
  await expect(page.getByRole("dialog", { name: "PFPlay" })).toBeVisible();
  expect(await page.evaluate(() => history.length)).toBe(before + 1);
});

test("상세 링크에 포커스가 오면 그 홀로그램이 밝아지고, 포커스가 떠나면 돌아온다", async ({ page }) => {
  await page.goto("/journey?debug=stats");
  await waitReady(page);
  await page.locator("#stop-pfplay a[data-journey-detail]").focus();
  await expect.poll(async () => (await readStats(page)).holograms?.glowing).toContain("pfplay");
  await page.locator("#stop-pfplay a[data-journey-detail]").blur();
  await expect.poll(async () => (await readStats(page)).holograms?.glowing).not.toContain("pfplay");
});

// 스펙 3절 "썸네일 대체": 2막 본문 썸네일은 장면이 ready이고 그 홀로그램이 켜져 있을 때만 화면에서 감춘다(대체 텍스트는 남는다).
const EXHIBITS = ["stock2u", "tix2u", "pfplay"];

function thumbnailAlt(slug: string): string {
  const project = projects.find((item) => item.slug === slug);
  if (!project) throw new Error(`프로젝트가 없습니다: ${slug}`);
  return project.screens[0].alt;
}

async function expectThumbnail(page: Page, slug: string, hidden: boolean) {
  const thumbnail = page.locator(`[data-journey-thumbnail="${slug}"]`);
  if (hidden) await expect(thumbnail, slug).toHaveClass(/\bsr-only\b/);
  else await expect(thumbnail, slug).not.toHaveClass(/\bsr-only\b/);
  // 캔버스는 보조기기에서 숨겨져 있어, 감췄을 때도 보일 때도 대체 텍스트는 한 번만 읽힌다
  await expect(page.getByRole("img", { name: thumbnailAlt(slug), exact: true }), slug).toHaveCount(1);
}

test("3D가 준비되면 2막 썸네일은 화면에서만 감춰지고 대체 텍스트는 한 번 읽힌다", async ({ page }) => {
  await page.goto("/journey");
  await waitReady(page);
  for (const slug of EXHIBITS) await expectThumbnail(page, slug, true);
});

test("WebGL이 없으면 2막 썸네일이 보인다", async ({ page }) => {
  await disableWebGL(page);
  await page.goto("/journey");
  for (const slug of EXHIBITS) await expectThumbnail(page, slug, false);
});

test("이미지를 받지 못한 홀로그램의 썸네일은 보이고, 나머지는 감춰진다", async ({ page }) => {
  await page.route("**/journey/holograms/tix2u.webp", (route) => route.fulfill({ status: 404, body: "" }));
  await page.goto("/journey");
  await waitReady(page);
  await expectThumbnail(page, "tix2u", false);
  await expectThumbnail(page, "stock2u", true);
  await expectThumbnail(page, "pfplay", true);
});

test("텍스처 배열을 올리지 못하면 2막 썸네일이 모두 보인다", async ({ page }) => {
  await page.addInitScript(() => {
    const original = WebGL2RenderingContext.prototype.texStorage3D;
    WebGL2RenderingContext.prototype.texStorage3D = function (
      this: WebGL2RenderingContext,
      target: number,
      levels: number,
      format: number,
      width: number,
      height: number,
      depth: number,
    ) {
      return original.call(this, target, levels, format, target === this.TEXTURE_2D_ARRAY ? 65536 : width, height, depth);
    };
  });
  await page.goto("/journey");
  await waitReady(page);
  for (const slug of EXHIBITS) await expectThumbnail(page, slug, false);
});

test("실행 중 장면이 실패하면(컨텍스트 손실) 2D로 바뀌어 2막 썸네일이 다시 보이고 스크롤된다", async ({ page }) => {
  await page.goto("/journey");
  await waitReady(page);
  await expectThumbnail(page, "stock2u", true);
  await loseContext(page);
  await expectFlat(page, "context-lost");
  for (const slug of EXHIBITS) await expectThumbnail(page, slug, false);
  await page.keyboard.press("End");
  await expect(page.getByText(EMAIL)).toBeInViewport();
});

// ── 세로 화면 카메라(2-4a, 스펙 3절 "세로 화면") ───────────────────

test.describe("세로 화면(390×844)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("세로 렌즈(시야각 58°, 투영 중심 위 29%)로 그리고, 정류장 홀로그램이 헤더 아래·화면 위 60% 안에 든다", async ({ page }) => {
    await page.goto("/journey?debug=stats");
    await waitReady(page);
    for (const id of ["kokoa-clone", "stock2u", "pfplay"]) {
      await settleAt(page, middleOf(id));
      const stats = await readStats(page);
      expect(stats.lens, id).toEqual({ fov: 58, center: 0.29 });
      const screen = stats.holograms?.screens.find((item) => item.id === id);
      if (!screen) throw new Error(`${id} 홀로그램이 화면에 없습니다`);
      expect(screen.rect[0], id).toBeGreaterThan(0);
      expect(screen.rect[2], id).toBeLessThan(1);
      expect(screen.rect[1], id).toBeGreaterThan(80 / 844);
      expect(screen.rect[3], id).toBeLessThan(0.6);
    }
  });

  test("화면을 가로로 돌리면 가로 렌즈·스크롤 카드로, 다시 세우면 세로 렌즈·고정 카드로 돌아오고 그 정류장의 구도가 그대로다", async ({ page }) => {
    await page.goto("/journey?debug=stats");
    await waitReady(page);
    await settleAt(page, middleOf("stock2u"));
    const cards = page.locator("[data-journey-page]");
    await expect.poll(async () => (await readStats(page)).lens).toEqual({ fov: 58, center: 0.29 });
    await expect(cards).toHaveAttribute("data-journey-cards", "fixed");
    await page.setViewportSize({ width: 844, height: 390 });
    await expect.poll(async () => (await readStats(page)).lens).toEqual({ fov: 50, center: 0.5 });
    await expect(cards).not.toHaveAttribute("data-journey-cards", "fixed");
    await page.setViewportSize({ width: 390, height: 844 });
    await expect.poll(async () => (await readStats(page)).lens).toEqual({ fov: 58, center: 0.29 });
    await expect(cards).toHaveAttribute("data-journey-cards", "fixed");
    await expect(page.locator('[data-journey-card="stock2u"]')).toHaveAttribute("data-active", "");
    // 돌린 뒤에도 정류장 홀로그램이 헤더 아래·화면 위 60% 안이다(같은 진행률이면 같은 구도)
    await expect
      .poll(async () => {
        const screen = (await readStats(page)).holograms?.screens.find((item) => item.id === "stock2u");
        return screen ? screen.rect[1] > 80 / 844 && screen.rect[3] < 0.6 && screen.rect[0] > 0 && screen.rect[2] < 1 : false;
      })
      .toBe(true);
  });
});

test("가로 화면은 지금 렌즈(시야각 50°, 투영 중심 가운데) 그대로다", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/journey?debug=stats");
  await waitReady(page);
  expect((await readStats(page)).lens).toEqual({ fov: 50, center: 0.5 });
});

// ── 모바일 헤더와 세로 화면 진행 막대(2-4a, 스펙 2절 "진행 표시", 4절 "사이트 공통 요소 변경") ───────────────────

for (const width of [360, 390]) {
  test(`${width}px 화면에서 헤더 메뉴가 줄바꿈 없이 한 줄이고 모든 메뉴에 닿는다`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/journey");
    const header = page.locator("[data-site-header]");
    expect((await header.boundingBox())?.height).toBeLessThanOrEqual(57);
    const heights = await header.getByRole("link").evaluateAll((links) => links.map((link) => link.getBoundingClientRect().height));
    expect(Math.max(...heights)).toBeLessThanOrEqual(24);
    // 390px은 메뉴가 다 들어오고, 더 좁으면 메뉴를 옆으로 밀어 마지막 메뉴에 닿는다
    const nav = await header.locator("nav").evaluate((element) => ({ client: element.clientWidth, scroll: element.scrollWidth }));
    if (width >= 390) expect(nav.scroll).toBeLessThanOrEqual(nav.client);
    const github = header.getByRole("link", { name: "GitHub" });
    await github.scrollIntoViewIfNeeded();
    const box = await github.boundingBox();
    if (!box) throw new Error("GitHub 메뉴가 없습니다");
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width + 0.5);
  });
}

test.describe("세로 화면 진행 막대(390×844)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("헤더 바로 아래 화면 폭 가로 막대이고, 점을 누르면 그 막과 연락처로 간다", async ({ page }) => {
    await page.goto("/journey");
    const header = await page.locator("[data-site-header]").boundingBox();
    const rail = await page.getByRole("navigation", { name: "여정 진행" }).boundingBox();
    if (!header || !rail) throw new Error("헤더나 진행 막대가 없습니다");
    expect(Math.abs(rail.y - (header.y + header.height))).toBeLessThanOrEqual(1);
    expect(rail.width).toBeGreaterThan(380);
    expect(rail.height).toBeLessThanOrEqual(24);
    await page.getByRole("button", { name: "3막으로 이동" }).click();
    await expect(page.locator("#stop-act-3")).toBeInViewport();
    await page.getByRole("button", { name: "연락처로 이동" }).click();
    await expect(page.getByText(EMAIL)).toBeInViewport();
  });
});

test("가로 화면 진행 막대는 오른쪽 세로 막대 그대로다", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/journey");
  const rail = await page.getByRole("navigation", { name: "여정 진행" }).boundingBox();
  if (!rail) throw new Error("진행 막대가 없습니다");
  expect(rail.height).toBeGreaterThan(rail.width * 4);
  expect(rail.x).toBeGreaterThan(1200);
});

test("3D 캔버스 틀은 화면 위에 붙은 큰 뷰포트 높이(100vh)라 휴대폰 주소창이 접히고 펴져도 크기를 다시 잡지 않는다", async ({ page }) => {
  await page.goto("/journey");
  // 주소창은 에뮬레이션에 없어, 아래끝을 화면 아래에 묶지 않았는지(계산값 bottom: auto)와 높이가 100vh인지를 본다.
  // 묶으면 주소창이 움직일 때마다 캔버스·렌더 타깃을 다시 만들고 카메라 비율이 바뀌어 구도가 튄다. 지금의 iOS Safari·Chrome에서 100vh는
  // 큰 뷰포트(100lvh)와 같고, lvh를 모르는 iOS 15.0~15.3에서도 높이가 무효가 되지 않는다(2-4b)
  const frame = await page.locator("[data-journey-scene]").evaluate((element) => {
    const probe = document.createElement("div");
    probe.style.cssText = "position:fixed;top:0;width:1px;height:100vh;visibility:hidden";
    document.body.append(probe);
    const vh = probe.getBoundingClientRect().height;
    probe.remove();
    const style = element.computedStyleMap();
    return { top: String(style.get("top")), bottom: String(style.get("bottom")), height: element.getBoundingClientRect().height, vh };
  });
  expect(frame.top).toBe("0px");
  expect(frame.bottom).toBe("auto");
  expect(frame.height).toBeCloseTo(frame.vh, 0);
});

/** 엔딩 끝에서 피해야 할 위쪽 요소의 아래끝(헤더, 세로 화면은 헤더 아래 가로 진행 막대까지) */
async function chromeBottom(page: Page): Promise<number> {
  const header = await page.locator("[data-site-header]").boundingBox();
  const rail = await page.getByRole("navigation", { name: "여정 진행" }).boundingBox();
  if (!header || !rail) throw new Error("헤더나 진행 막대가 없습니다");
  return Math.max(header.y + header.height, rail.width > rail.height ? rail.y + rail.height : 0);
}

/** 엔딩 패널이 넘치면(패널 안 스크롤) 위끝이 위쪽 요소보다 0.5rem(8px) 아래에 맞춰져 있다(2절 "엔딩") */
async function expectEndingPanelFits(page: Page, top: number) {
  const panel = await page.getByRole("heading", { name: "연락처" }).locator("..").evaluate((element) => ({
    top: element.getBoundingClientRect().top,
    overflows: element.scrollHeight > element.clientHeight,
  }));
  if (panel.overflows) expect(Math.abs(panel.top - (top + 8))).toBeLessThanOrEqual(1.5);
}

test("짧은 데스크톱 창(1280×500)에서 넘친 엔딩 패널은 헤더 0.5rem 아래까지 쓰고, 패널 위에서 휠을 굴리면 출처까지 닿는다", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "화면 크기를 정해 두므로 한 프로젝트에서만 본다");
  await page.setViewportSize({ width: 1280, height: 500 });
  await page.goto("/journey");
  await waitReady(page);
  await scrollToProgress(page, 1);
  const heading = page.getByRole("heading", { name: "연락처" });
  await expect(heading).toBeInViewport();
  const top = await chromeBottom(page);
  await expect.poll(async () => (await heading.boundingBox())?.y ?? -1).toBeGreaterThanOrEqual(top);
  await expectEndingPanelFits(page, top);
  // Lenis가 휠을 창 스크롤로 바꾸지 않고 넘친 패널 안을 굴리게 둔다
  const box = await heading.locator("..").boundingBox();
  if (!box) throw new Error("엔딩 패널이 없습니다");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  const credit = page.getByRole("link", { name: "NASA/Goddard Space Flight Center Scientific Visualization Studio" });
  await expect(async () => {
    await page.mouse.wheel(0, 400);
    await expect(credit).toBeInViewport({ ratio: 1, timeout: 500 });
  }).toPass({ timeout: 5000 });
});

// 짧은 휴대폰 화면: 아이폰 사파리의 도구 막대가 펴진 높이(390×664), 아이폰 SE 사파리(375×548), 휴대폰 가로(750×340)
const SHORT_VIEWPORTS = [
  { width: 390, height: 664 },
  { width: 375, height: 548 },
  { width: 750, height: 340 },
];

for (const viewport of SHORT_VIEWPORTS) {
  test(`짧은 화면(${viewport.width}×${viewport.height})에서도 엔딩 끝의 연락처가 헤더 아래에서 끝까지 읽힌다`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "화면 크기를 정해 두므로 한 프로젝트에서만 본다");
    await page.setViewportSize(viewport);
    await page.goto("/journey");
    await waitReady(page);
    await scrollToProgress(page, 1);
    const top = await chromeBottom(page);
    const heading = page.getByRole("heading", { name: "연락처" });
    await expect(heading).toBeInViewport();
    await expect.poll(async () => (await heading.boundingBox())?.y ?? -1).toBeGreaterThanOrEqual(top);
    await expectEndingPanelFits(page, top);
    await expect(page.getByText(EMAIL)).toBeInViewport({ ratio: 1 });
    // 패널 끝의 출처까지 닿는다(넘치면 패널 안에서 스크롤한다)
    const credit = page.getByRole("link", { name: "NASA/Goddard Space Flight Center Scientific Visualization Studio" });
    await credit.scrollIntoViewIfNeeded();
    await expect(credit).toBeInViewport({ ratio: 1 });
    expect((await credit.boundingBox())?.y ?? -1).toBeGreaterThanOrEqual(top);
  });
}

// ── 휴대폰 측정 오버레이(2-4a, 스펙 8절 4항 ?debug=perf) ───────────────────

type PerfRun = { frames: number; p95Ms: number; p99Ms: number; over50ms: number; reached: number };
type PerfResult = {
  device: { model: string; tier: string; dpr: number; canvas: string; gpu: string; browser: string };
  speed: number;
  runs: PerfRun[];
  meets: boolean;
  scene: { maxDrawCalls: number; programs: [number, number]; textureMiB: number; renderTargetMiB: number } | null;
  longRun: { minutes: number; perMinute: { frames: number; p95Ms: number }[]; meets: boolean } | null;
};

async function readPerf(page: Page): Promise<PerfResult | null> {
  return page.evaluate(() => (window as Window & { __journeyPerf?: PerfResult }).__journeyPerf ?? null);
}

test("?debug=perf가 없으면 측정 오버레이가 없다", async ({ page }) => {
  await page.goto("/journey?debug=stats");
  await waitReady(page);
  await expect(page.getByRole("region", { name: "성능 측정" })).toHaveCount(0);
});

test("?debug=perf 오버레이는 기기 단계·해상도 배율·GPU·최근 프레임 시간·드로콜을 보인다", async ({ page }) => {
  await page.goto("/journey?debug=perf");
  await waitReady(page);
  const overlay = page.getByRole("region", { name: "성능 측정" });
  await expect(overlay).toContainText("단계 full");
  await expect(overlay).toContainText("배율");
  await expect(overlay).toContainText("GPU");
  await expect.poll(async () => (await overlay.textContent()) ?? "").toMatch(/최근 10초 [\d.]+fps/);
  await expect(overlay).toContainText("드로콜");
});

test("측정을 누르면 여정을 자동으로 3회 끝까지 지나가 결과를 내고, 복사한 JSON이 같다", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/journey?debug=perf&perfSpeed=10");
  await waitReady(page);
  await page.getByRole("textbox", { name: "기종" }).fill("테스트 기기");
  await page.getByRole("button", { name: "측정", exact: true }).click();
  await expect.poll(async () => (await readPerf(page))?.runs.length ?? 0, { timeout: 60_000 }).toBe(3);
  const result = await readPerf(page);
  if (!result) throw new Error("측정 결과가 없습니다");
  expect(result.device.model).toBe("테스트 기기");
  expect(result.device.tier).toBe("full");
  expect(result.speed).toBe(10);
  for (const run of result.runs) {
    expect(run.frames).toBeGreaterThan(0);
    expect(run.reached).toBeGreaterThan(0.999);
  }
  expect(result.scene?.programs[0]).toBe(result.scene?.programs[1]);
  await page.getByRole("button", { name: "결과 복사" }).click();
  expect(JSON.parse(await page.evaluate(() => navigator.clipboard.readText()))).toEqual(result);
});

test("오래 돌리기는 왕복하며 1분마다 프레임 시간을 묶어 낸다", async ({ page }) => {
  await page.goto("/journey?debug=perf&perfSpeed=10&perfMinutes=0.05");
  await waitReady(page);
  await page.getByRole("button", { name: "오래 돌리기" }).click();
  await expect.poll(async () => (await readPerf(page))?.longRun?.perMinute.length ?? 0, { timeout: 30_000 }).toBe(1);
  const result = await readPerf(page);
  expect(result?.longRun?.minutes).toBe(0.05);
  expect(result?.longRun?.perMinute[0].frames).toBeGreaterThan(0);
});

// ── 세로 화면 아래 고정 카드(2-4a, 스펙 3절 "세로 화면") ───────────────────

/** 보이는 카드(data-active): 이름, 패널의 화면 비율 위·아래, 불투명도, 배치 */
async function activeCards(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("[data-journey-card][data-active]")].map((card) => {
      const panel = card.querySelector(".shadow-2xl")?.getBoundingClientRect();
      return {
        id: card.dataset.journeyCard ?? "",
        top: (panel?.top ?? 0) / innerHeight,
        bottom: (panel?.bottom ?? 0) / innerHeight,
        opacity: getComputedStyle(card).opacity,
        position: getComputedStyle(card).position,
      };
    }),
  );
}

/** 포커스한 요소가 든 카드의 이름 */
async function focusedCard(page: Page): Promise<string | null> {
  return page.evaluate(() => document.activeElement?.closest<HTMLElement>("[data-journey-card]")?.dataset.journeyCard ?? null);
}

/** 스크롤이 0.5초 동안 그대로인가(포커스 되돌이·자동 스크롤이 없는가) */
async function expectSettledScroll(page: Page, label: string) {
  await page.waitForTimeout(600);
  const before = await page.evaluate(() => window.scrollY);
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.scrollY), label).toBe(before);
}

test.describe("세로 화면 아래 고정 카드(390×844)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("처음 열 때와 가로에서 세로로 돌릴 때 보이지 않을 카드들이 아래 고정 자리에 겹쳐 보였다가 사라지지 않는다", async ({ page }) => {
    // 고정 자리로 들어간 뒤 0.3초 동안 매 프레임 보이는(불투명도 0.05 초과) 카드 수의 최댓값을 모은다
    await page.addInitScript(() => {
      const record = window as Window & { __cardFlash?: number[] };
      record.__cardFlash = [];
      // 문서가 만들어질 때부터 본다. 본문이 생긴 뒤에 걸면 하이드레이션이 먼저 고정 자리로 옮겨 그 변화를 놓친다
      new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          const main = mutation.target as HTMLElement;
          if (main.dataset.journeyCards !== "fixed" || mutation.oldValue === "fixed") continue;
          const start = performance.now();
          let most = 0;
          const sample = () => {
            const shown = [...main.querySelectorAll("[data-journey-card]")].filter((card) => Number(getComputedStyle(card).opacity) > 0.05);
            most = Math.max(most, shown.length);
            if (performance.now() - start < 300) requestAnimationFrame(sample);
            else record.__cardFlash?.push(most);
          };
          sample();
        }
      }).observe(document, { subtree: true, attributes: true, attributeFilter: ["data-journey-cards"], attributeOldValue: true });
    });
    const flashes = () => page.evaluate(() => (window as Window & { __cardFlash?: number[] }).__cardFlash ?? []);
    await page.goto("/journey");
    await expect.poll(flashes).toHaveLength(1);
    await page.setViewportSize({ width: 844, height: 390 });
    await expect(page.locator("[data-journey-page]")).not.toHaveAttribute("data-journey-cards", "fixed");
    await page.setViewportSize({ width: 390, height: 844 });
    await expect.poll(flashes).toHaveLength(2);
    expect(await flashes()).toEqual([1, 1]);
  });

  test("입구 카드는 서버가 그린 자리와 아래 고정 자리가 같아 첫 로딩 때 옮겨지지 않는다", async ({ page }) => {
    // 앱 스크립트를 붙잡아 하이드레이션 전(서버가 그린 배치)에 입구 패널을 재고, 풀어 준 뒤 고정 자리로 들어가면 다시 잰다
    const release = await holdScripts(page);
    await page.goto("/journey", { waitUntil: "commit" });
    const panel = page.locator('[data-journey-card="intro"] .pointer-events-auto');
    await panel.waitFor({ state: "attached" });
    const before = await panel.boundingBox();
    release();
    await expect(page.locator("[data-journey-page]")).toHaveAttribute("data-journey-cards", "fixed", { timeout: 30_000 });
    const after = await panel.boundingBox();
    if (!before || !after) throw new Error("입구 패널이 없습니다");
    expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(1);
  });

  test("장면을 준비하는 동안 로딩 줄은 진행 막대 바로 아래에 있어 고정된 입구 카드와 겹치지 않는다", async ({ page }) => {
    await page.route("**/journey/galaxy*", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 8000));
      await route.continue();
    });
    await page.goto("/journey");
    await expect(page.locator("[data-journey-page]")).toHaveAttribute("data-journey-cards", "fixed");
    const bar = page.locator('[data-journey-loading="loading"] > span');
    await expect(bar).toBeVisible();
    const line = await bar.boundingBox();
    const panel = await page.locator('[data-journey-card="intro"] .pointer-events-auto').boundingBox();
    const rail = await page.getByRole("navigation", { name: "여정 진행" }).boundingBox();
    if (!line || !panel || !rail) throw new Error("로딩 줄·입구 패널·진행 막대가 없습니다");
    expect(line.y).toBeGreaterThanOrEqual(rail.y + rail.height);
    expect(line.y + line.height).toBeLessThan(panel.y);
  });

  test("정류장마다 그 정류장의 카드 하나만 화면 아래 40% 안에 보이고, 나머지는 보이지 않는다", async ({ page }) => {
    await page.goto("/journey?debug=stats");
    await waitReady(page);
    for (const id of STOP_IDS.filter((stop) => stop !== "ending")) {
      await scrollToProgress(page, cardProgress(id));
      await expect.poll(async () => (await activeCards(page)).map((card) => card.id), id).toEqual([id]);
      await expect.poll(async () => (await activeCards(page))[0]?.opacity, id).toBe("1");
      const [card] = await activeCards(page);
      expect(card.position, id).toBe("fixed");
      expect(card.top, id).toBeGreaterThan(0.6);
      expect(card.bottom, id).toBeLessThan(1);
    }
    const hidden = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>("[data-journey-card]:not([data-active])")].map((card) => getComputedStyle(card).opacity),
    );
    expect(new Set(hidden)).toEqual(new Set(["0"]));
  });

  test("PiCKCARE에서는 저장소 카드가 늘 홀로그램 앞줄과 같은 저장소다", async ({ page }) => {
    // 장면 준비와 여러 자리의 기다림으로 원래 25~28초가 걸려 기본 한도(30초)에 붙어 있었다. 기계가 바쁘면 넘쳤다(2-4c)
    test.setTimeout(60_000);
    await page.goto("/journey?debug=stats");
    await waitReady(page);
    for (let within = 0.2; within <= 0.96; within += 0.05) {
      await scrollToProgress(page, at("pickcare", within));
      await page.waitForTimeout(1200);
      const front = (await readStats(page)).holograms?.front;
      expect((await activeCards(page)).map((card) => card.id), within.toFixed(2)).toEqual([front]);
    }
  });

  test("세로 화면 PiCKCARE: 저장소마다 읽기 자리에서 그 저장소 카드만 아래에 다 보이고, 앞줄 홀로그램이 헤더 아래·화면 위 60% 안에 있다", async ({ page }) => {
    await page.goto("/journey?debug=stats");
    await waitReady(page);
    for (const repo of ["frontend", "biz", "studio", "app", "cardnews"]) {
      const id = `pickcare/${repo}`;
      await settleAt(page, cardProgress(id));
      const stats = await readStats(page);
      expect(stats.holograms?.front, id).toBe(id);
      const [card, ...rest] = await activeCards(page);
      expect(rest, id).toEqual([]);
      expect(card.id, id).toBe(id);
      expect(card.top, id).toBeGreaterThan(0.6);
      expect(card.bottom, id).toBeLessThan(1);
      const screen = stats.holograms?.screens.find((item) => item.id === id);
      if (!screen) throw new Error(`${id} 홀로그램이 화면에 없습니다`);
      expect(screen.rect[0], id).toBeGreaterThan(0);
      expect(screen.rect[2], id).toBeLessThan(1);
      expect(screen.rect[1], id).toBeGreaterThan(80 / 844);
      expect(screen.rect[3], id).toBeLessThan(0.6);
    }
  });

  test("엔딩에서는 고정 카드가 없고 연락처가 스크롤로 올라온다", async ({ page }) => {
    await page.goto("/journey");
    await waitReady(page);
    await page.keyboard.press("End");
    await expect(page.getByText(EMAIL)).toBeInViewport();
    await expect(page.locator("[data-journey-page]")).toHaveAttribute("data-journey-cards", "fixed");
    await expect.poll(async () => (await activeCards(page)).length).toBe(0);
    expect(await page.locator("#stop-ending .shadow-2xl").evaluate((panel) => getComputedStyle(panel.parentElement as Element).position)).not.toBe("fixed");
  });

  test("Tab·Shift+Tab으로 상세 링크를 차례로 지나면 포커스한 링크의 카드가 보이고, 그 뒤 포커스와 스크롤이 움직이지 않는다", async ({ page }) => {
    // 장면 준비와 여러 자리의 기다림으로 원래 25~28초가 걸려 기본 한도(30초)에 붙어 있었다. 기계가 바쁘면 넘쳤다(2-4c)
    test.setTimeout(60_000);
    await page.goto("/journey");
    await waitReady(page);
    await page.locator("#stop-todo-app a[data-journey-detail]").focus();
    const order = ["todo-app", "eutcha", "stock2u", "tix2u", "pfplay", "pickcare/frontend", "pickcare/biz", "pickcare/studio", "pickcare/app", "pickcare/cardnews"];
    const visit = async (id: string, label: string) => {
      expect(await focusedCard(page), label).toBe(id);
      await expect.poll(async () => (await activeCards(page)).map((card) => card.id), label).toEqual([id]);
      await expectSettledScroll(page, label);
      expect(await focusedCard(page), label).toBe(id);
    };
    await visit("todo-app", "처음");
    for (const id of order.slice(1)) {
      await page.keyboard.press("Tab");
      await visit(id, `Tab → ${id}`);
    }
    for (const id of [...order].reverse().slice(1, 4)) {
      await page.keyboard.press("Shift+Tab");
      await visit(id, `Shift+Tab → ${id}`);
    }
  });

  test("이미 보이는 카드의 링크로 포커스가 가면 스크롤하지 않는다", async ({ page }) => {
    await page.goto("/journey");
    await waitReady(page);
    await scrollToProgress(page, cardProgress("stock2u"));
    await expect.poll(async () => (await activeCards(page)).map((card) => card.id)).toEqual(["stock2u"]);
    const before = await page.evaluate(() => window.scrollY);
    await page.locator("#stop-stock2u a[data-journey-detail]").focus();
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => window.scrollY)).toBe(before);
  });

  test("WebGL이 없으면 세로 화면에서도 카드를 고정하지 않는다", async ({ page }) => {
    await disableWebGL(page);
    await page.goto("/journey");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("[data-journey-page]")).not.toHaveAttribute("data-journey-cards", "fixed");
    expect(await page.locator('[data-journey-card="stock2u"]').evaluate((card) => getComputedStyle(card).position)).not.toBe("fixed");
  });

  test("실행 중 장면이 실패하면(컨텍스트 손실) 2D로 바뀌어 카드 고정이 풀린다", async ({ page }) => {
    await page.goto("/journey");
    await waitReady(page);
    await expect(page.locator("[data-journey-page]")).toHaveAttribute("data-journey-cards", "fixed");
    await loseContext(page);
    await expectFlat(page, "context-lost");
    await expect(page.locator("[data-journey-page]")).not.toHaveAttribute("data-journey-cards", "fixed");
  });
});

// ── 막별 풍경(2-3b, 스펙 1절 완료 조건과 3절 "막별 풍경") ───────────────────

const LANDSCAPE_MESHES = ["journey-landscape-act1", "journey-landscape-act2", "journey-landscape-act3", "journey-landscape-spire"];

/** 진행률 p로 스크롤하고 그 자리의 풍경 통계를 낸다. 그린 횟수는 지난 프레임 값이라 그 자리에서 한 프레임 넘게 기다린다 */
async function landscapeAt(page: Page, progress: number): Promise<LandscapeStats> {
  await scrollToProgress(page, progress);
  const carS = driveAt(progress).carS;
  await expect
    .poll(async () => {
      const landscape = (await readStats(page)).landscape;
      return landscape !== null && Math.abs(landscape.carS - carS) < 1e-6;
    })
    .toBe(true);
  await page.waitForTimeout(200);
  const landscape = (await readStats(page)).landscape;
  if (!landscape) throw new Error("풍경 통계가 없습니다");
  return landscape;
}

test("풍경 메시 넷: 1막에서는 3막 메시를 그리지 않고, 끝까지 갔다 돌아와도 지오메트리와 그 자리의 값이 같다", async ({ page }) => {
  await page.goto("/journey?debug=stats");
  await waitReady(page);
  const act1 = await landscapeAt(page, middleOf("kokoa-clone"));
  expect(act1.meshes.map((mesh) => mesh.name)).toEqual(LANDSCAPE_MESHES);
  expect(act1.meshes.map((mesh) => mesh.visible)).toEqual([true, true, false, false]);
  expect(act1.meshes[2].calls + act1.meshes[3].calls).toBe(0);
  const act3 = await landscapeAt(page, at("act-3", 0.5));
  expect(act3.meshes.map((mesh) => mesh.visible)).toEqual([true, true, true, true]);
  expect(act3.meshes[3].calls).toBeGreaterThan(0);
  await landscapeAt(page, 1);
  const back = await landscapeAt(page, middleOf("kokoa-clone"));
  expect(back.meshes.map((mesh) => mesh.geometry)).toEqual(act1.meshes.map((mesh) => mesh.geometry));
  expect(back.meshes.map((mesh) => mesh.visible)).toEqual([true, true, false, false]);
  expect([back.revealS, back.carS, back.ending]).toEqual([act1.revealS, act1.carS, act1.ending]);
});

test("다른 페이지에 다녀와도 풍경 메시 넷을 새로 만들어 그린다", async ({ page }) => {
  await page.goto("/journey?debug=stats");
  await waitReady(page);
  const before = await landscapeAt(page, at("act-3", 0.5));
  await page.locator("[data-site-header]").getByRole("link", { name: "블로그", exact: true }).click();
  await expect(page).not.toHaveURL(/\/journey/);
  // 뒤로 가기로 돌아와 ?debug=stats를 지킨다(헤더 링크는 주소만 /journey다)
  await page.goBack();
  await waitReady(page);
  const after = await landscapeAt(page, at("act-3", 0.5));
  expect(after.meshes.map((mesh) => mesh.visible)).toEqual([true, true, true, true]);
  expect(after.meshes.map((mesh) => mesh.geometry)).not.toEqual(before.meshes.map((mesh) => mesh.geometry));
  expect(after.meshes[3].calls).toBeGreaterThan(0);
});

test("정류장(도는 중·머묾)과 엔딩에서 실제 카메라로 본 홀로그램 모서리와 열린 도로가 풍경에 막히지 않는다", async ({ page }) => {
  await page.goto("/journey?debug=stats");
  await waitReady(page);
  const viewport = page.viewportSize();
  if (!viewport) throw new Error("화면 크기가 없습니다");
  const views: [string, number][] = [
    ["stock2u", 0.5],
    ["tix2u", 0.85],
    ["pickcare", 0.06],
    ["pickcare", 0.5],
    ["ending", 1],
  ];
  for (const [id, within] of views) {
    const progress = at(id, within);
    await settleAt(page, progress);
    const landscape = (await readStats(page)).landscape;
    if (!landscape) throw new Error("풍경 통계가 없습니다");
    // 세로 화면은 세로 렌즈와 세로 카메라의 시선으로 화면 안 도로 표본을 고른다(2-4a)
    const portrait = viewport.width < viewport.height;
    const targets = portrait
      ? occlusionTargets(progress, viewport.width / viewport.height, landscape.camera, PORTRAIT_LENS, portraitCamera(driveAt(progress)).target)
      : occlusionTargets(progress, viewport.width / viewport.height, landscape.camera);
    expect(targets.length, `${id} ${within}`).toBeGreaterThan(0);
    const blocked = await page.evaluate(
      ([from, points]) => {
        const check = (window as Window & { __journeyLandscapeBlocked?: (from: unknown, targets: unknown) => (string | null)[] })
          .__journeyLandscapeBlocked;
        if (!check) throw new Error("풍경 가림 확인이 없습니다");
        return check(from, points);
      },
      [landscape.camera, targets.map((target) => target.point)] as const,
    );
    const hits = targets.flatMap((target, index) => (blocked[index] ? [`${target.label} ← ${blocked[index]}`] : []));
    expect(hits, `${id} ${within}`).toEqual([]);
  }
});

test("3막 제목·진입·도착·떠날 때 첨탑이 헤더 아래 화면 안에 서고 본문 패널과 겹치지 않는다", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "세로 화면의 첨탑과 도로 끝은 네 화면 크기 캡처로 본다(스펙 3절 \"세로 화면\")");
  // 두 화면 크기 × 네 자리마다 카메라가 자리를 잡을 때까지 기다린다
  test.slow();
  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/journey?debug=stats");
    await waitReady(page);
    for (const [id, within] of [
      ["act-3", 0.5],
      ["act-3", 1],
      ["pickcare", 0.03],
      ["pickcare", 0.97],
    ] as const) {
      await settleAt(page, at(id, within));
      const label = `${viewport.width}x${viewport.height} ${id} ${within}`;
      const spire = (await readStats(page)).landscape?.spire;
      if (!spire) throw new Error(`${label}: 첨탑이 화면에 없습니다`);
      const layout = await page.evaluate(() => {
        const header = document.querySelector("[data-site-header]");
        if (!header) throw new Error("헤더가 없습니다");
        const panels = [...document.querySelectorAll("[data-journey-page] .shadow-2xl")]
          .map((panel) => {
            const box = panel.getBoundingClientRect();
            return [box.left / innerWidth, box.top / innerHeight, box.right / innerWidth, box.bottom / innerHeight];
          })
          .filter(([left, top, right, bottom]) => right > 0 && left < 1 && bottom > 0 && top < 1);
        return { header: header.getBoundingClientRect().bottom / innerHeight, panels };
      });
      expect(spire[0], label).toBeGreaterThan(0.02);
      expect(spire[2], label).toBeLessThan(0.98);
      expect(spire[1], label).toBeGreaterThan(layout.header);
      for (const panel of layout.panels) {
        const overlap = spire[0] < panel[2] && panel[0] < spire[2] && spire[1] < panel[3] && panel[1] < spire[3];
        expect(overlap, `${label} 패널 ${panel.map((value) => value.toFixed(2)).join(",")}`).toBe(false);
      }
    }
  }
});
