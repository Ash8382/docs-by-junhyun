import { expect, test, type Page } from "@playwright/test";
import { driveAt } from "../src/lib/journey/drive";
import { projects } from "../src/data/projects";
import { FRONT_LEAD, HOLOGRAMS, REPO_COUNT } from "../src/lib/journey/holograms";
import { HALL_REPO_END, HALL_REPO_START, rangeOf } from "../src/lib/journey/timeline";

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

test("엔딩에 차 모델의 출처와 라이선스가 있다", async ({ page }) => {
  await page.goto("/journey");
  await page.keyboard.press("End");
  await expect(
    page.locator("#stop-ending a[href='https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/CarConcept']"),
  ).toBeInViewport();
  await expect(page.locator("#stop-ending a[href='https://creativecommons.org/licenses/by/4.0/']")).toHaveText("CC BY 4.0");
});

// ── 장면 감시와 차(2-2b, 스펙 1절 완료 조건과 5절 "실패 대응") ───────────────────

async function waitReady(page: Page) {
  await expect(page.locator("[data-journey-scene]")).toHaveAttribute("data-state", "ready", { timeout: 30_000 });
}

test("셰이더 컴파일 실패를 감지해 장면 상태와 콘솔에 남긴다", async ({ page }) => {
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
  await expect(page.locator("[data-journey-scene]")).toHaveAttribute("data-state", "failed", { timeout: 30_000 });
  await expect(page.locator("[data-journey-loading]")).toHaveAttribute("data-journey-loading", "failed");
  expect(errors.some((message) => message.includes("셰이더 컴파일 실패"))).toBe(true);
  await page.getByRole("button", { name: "연락처로 이동" }).click();
  await expect(page.getByText(EMAIL)).toBeInViewport();
});

test("WebGL 컨텍스트를 잃으면 장면 상태와 콘솔에 남긴다", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/journey");
  await waitReady(page);
  await page.evaluate(() => {
    const canvas = document.querySelector("[data-journey-scene] canvas");
    if (!(canvas instanceof HTMLCanvasElement)) throw new Error("여정 캔버스가 없습니다");
    canvas.getContext("webgl2")?.getExtension("WEBGL_lose_context")?.loseContext();
  });
  await expect(page.locator("[data-journey-scene]")).toHaveAttribute("data-state", "failed");
  await expect(page.locator("[data-journey-loading]")).toHaveAttribute("data-journey-loading", "failed");
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

type HologramStats = {
  shown: string[];
  hovered: string | null;
  glowing: string[];
  front: string;
  screens: { id: string; rect: [number, number, number, number]; distance: number; target: boolean }[];
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
  test.skip(testInfo.project.name === "mobile", "세로 화면의 PiCKCARE 배치는 2-4에서 맞춘다");
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

// 스펙 3절 "홀로그램 상호작용". 홀로그램 자리를 쓰는 테스트는 넓은 화면에서만 본다(세로 화면의 자리는 2-4에서 맞춘다).
const PORTRAIT_SKIP = "세로 화면의 홀로그램 자리는 2-4에서 맞춘다";
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

test("홀로그램을 누르면 짝인 상세가 열리고, 닫으면 포커스가 그 링크로 돌아온다", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", PORTRAIT_SKIP);
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
  test.skip(testInfo.project.name === "mobile", PORTRAIT_SKIP);
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
  test.skip(testInfo.project.name === "mobile", PORTRAIT_SKIP);
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
  test.skip(testInfo.project.name === "mobile", PORTRAIT_SKIP);
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
  test.skip(testInfo.project.name === "mobile", PORTRAIT_SKIP);
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

test("홀로그램을 두 번 눌러도 기록은 하나만 남는다", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", PORTRAIT_SKIP);
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

test("실행 중 장면이 실패하면(컨텍스트 손실) 2막 썸네일이 다시 보이고 스크롤된다", async ({ page }) => {
  await page.goto("/journey");
  await waitReady(page);
  await expectThumbnail(page, "stock2u", true);
  await page.evaluate(() => {
    const canvas = document.querySelector("[data-journey-scene] canvas");
    if (!(canvas instanceof HTMLCanvasElement)) throw new Error("여정 캔버스가 없습니다");
    canvas.getContext("webgl2")?.getExtension("WEBGL_lose_context")?.loseContext();
  });
  await expect(page.locator("[data-journey-scene]")).toHaveAttribute("data-state", "failed");
  for (const slug of EXHIBITS) await expectThumbnail(page, slug, false);
  await page.keyboard.press("End");
  await expect(page.getByText(EMAIL)).toBeInViewport();
});
