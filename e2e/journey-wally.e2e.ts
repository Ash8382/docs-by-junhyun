import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { wally } from "../src/data/projects/wally";
import { rangeOf } from "../src/lib/journey/timeline";

/**
 * 3단계 WALLY 정류장(스펙 3절 "WALLY 정류장 (3단계)"). 여정 전체 e2e(journey.e2e.ts)는 정류장 일반 규칙을, 이 파일은 WALLY만의 결정을 본다.
 * 도우미는 journey.e2e.ts와 같은 방식의 작은 사본이다(그 파일이 크고 도우미를 내보내지 않는다).
 */
const SETTLE_MS = 2500;
const CREDIT = "화면 디자인은 WALLY 디자인팀의 작업입니다. 목 데이터로 찍은 iOS 화면입니다.";

type Stats = { holograms?: { screens: { id: string; rect: number[]; target: boolean }[] } };

async function waitReady(page: Page) {
  await expect(page.locator("[data-journey-scene]")).toHaveAttribute("data-state", "ready", { timeout: 30_000 });
}

function at(id: string, within: number): number {
  const range = rangeOf(id);
  return range.start + (range.end - range.start) * within;
}

async function scrollToProgress(page: Page, progress: number) {
  await page.evaluate((target) => {
    const main = document.querySelector("[data-journey-page]");
    if (!(main instanceof HTMLElement)) throw new Error("여정 본문이 없습니다");
    const top = main.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top + target * (main.offsetHeight - window.innerHeight), behavior: "instant" });
  }, progress);
}

async function readStats(page: Page): Promise<Stats> {
  return ((await page.evaluate(() => (window as Window & { __journeyStats?: unknown }).__journeyStats)) ?? {}) as Stats;
}

/** 누를 수 있는 홀로그램의 그림 영역 가운데(화소) */
async function hologramCenter(page: Page, id: string): Promise<{ x: number; y: number }> {
  await expect.poll(async () => (await readStats(page)).holograms?.screens.find((screen) => screen.id === id)?.target ?? false).toBe(true);
  const screen = (await readStats(page)).holograms?.screens.find((item) => item.id === id);
  const viewport = page.viewportSize();
  if (!screen || !viewport) throw new Error(`${id} 홀로그램이 화면에 없습니다`);
  return { x: ((screen.rect[0] + screen.rect[2]) / 2) * viewport.width, y: ((screen.rect[1] + screen.rect[3]) / 2) * viewport.height };
}

async function expectThumbnail(page: Page, hidden: boolean) {
  const thumbnail = page.locator('[data-journey-thumbnail="wally"]');
  if (hidden) await expect(thumbnail).toHaveClass(/\bsr-only\b/);
  else await expect(thumbnail).not.toHaveClass(/\bsr-only\b/);
  // 캔버스는 보조기기에서 숨겨져 있어, 감췄을 때도 보일 때도 대체 텍스트는 한 번만 읽힌다
  await expect(page.getByRole("img", { name: wally.screens[0].alt, exact: true })).toHaveCount(1);
}

test("휴대폰을 누르면 #wally 상세가 하나만 열리고, 케이스 다섯과 디자인팀 크레딧이 있으며 '출시'가 없다. 닫으면 링크로 돌아온다", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "포인터로 누르는 것은 데스크톱에서 본다");
  await page.goto("/journey?debug=stats");
  await waitReady(page);
  await scrollToProgress(page, at("wally", 0.5));
  await page.waitForTimeout(SETTLE_MS);
  const point = await hologramCenter(page, "wally");
  await page.mouse.click(point.x, point.y);
  const dialog = page.getByRole("dialog");
  await expect(dialog).toHaveCount(1);
  await expect(page).toHaveURL(/#wally$/);
  for (const item of wally.cases) await expect(dialog.getByText(item.title, { exact: true })).toHaveCount(1);
  await expect(dialog.getByText(CREDIT, { exact: true })).toHaveCount(1);
  await expect(dialog).not.toContainText("출시");
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page.locator("#stop-wally a[data-journey-detail]")).toBeFocused();
});

test("/journey#wally로 들어오면 WALLY 정류장으로 가서 상세가 열린다", async ({ page }) => {
  await page.goto("/journey#wally");
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "WALLY", exact: true })).toBeVisible({ timeout: 15_000 });
  await page.keyboard.press("Escape");
  await expect(page.locator("#stop-wally")).toBeInViewport();
});

test("2D에서 PiCKCARE 다음에 WALLY 카드가 있고 썸네일이 보인다", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("journey-view", "2d"));
  await page.goto("/journey");
  await expect(page.locator("html")).toHaveAttribute("data-journey-mode", "2d", { timeout: 15_000 });
  const order = await page.evaluate(() => [...document.querySelectorAll("[data-journey-page] section[id^='stop-']")].map((section) => section.id));
  expect(order.indexOf("stop-wally")).toBe(order.indexOf("stop-pickcare") + 1);
  await expectThumbnail(page, false);
  await expect(page.getByRole("img", { name: wally.screens[0].alt, exact: true })).toBeVisible();
});

test("세로 화면 WALLY 읽기 자리에서 WALLY 고정 카드가 보인다", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "아래 고정 카드는 세로 화면이다");
  await page.goto("/journey");
  await waitReady(page);
  await scrollToProgress(page, at("wally", 0.5));
  await page.waitForTimeout(SETTLE_MS);
  await expect(page.locator('[data-journey-card][data-active]')).toHaveAttribute("data-journey-card", "wally");
  await expect(page.locator('[data-journey-card="wally"]')).toBeVisible();
});

test("장면이 준비되면 WALLY 썸네일은 화면에서만 감춰지고 대체 텍스트는 한 번 읽힌다", async ({ page }) => {
  await page.goto("/journey");
  await waitReady(page);
  await expectThumbnail(page, true);
});

test("WALLY 쪽 하나(wally-day)를 받지 못하면 WALLY 썸네일이 보이고 끝까지 스크롤된다", async ({ page }) => {
  await page.route("**/journey/holograms/wally-day.webp", (route) => route.fulfill({ status: 404, body: "" }));
  await page.goto("/journey");
  await waitReady(page);
  await expectThumbnail(page, false);
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
  await expect
    .poll(() => page.evaluate(() => Math.round(window.scrollY + window.innerHeight - document.documentElement.scrollHeight)))
    .toBeGreaterThanOrEqual(-2);
});

test("WALLY 상세가 열린 상태에 axe(WCAG 2.1 A·AA) 위반이 없다", async ({ page }) => {
  await page.goto("/journey#wally");
  await expect(page.getByRole("dialog").getByRole("heading", { name: "WALLY", exact: true })).toBeVisible({ timeout: 15_000 });
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(result.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`)).toEqual([]);
});

for (const [width, height] of [
  [360, 800],
  [390, 844],
] as const) {
test(`휴대폰 세로 화면(${width}×${height})에서 WALLY 고정 카드가 화면 안·아래 40% 안에 들고, 요약은 2줄·기술 칩은 한 줄 가로 스크롤이다`, async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "아래 고정 카드는 세로 화면이다");
  await page.setViewportSize({ width, height });
  await page.goto("/journey");
  await waitReady(page);
  await scrollToProgress(page, at("wally", 0.5));
  await page.waitForTimeout(SETTLE_MS);
  const card = page.locator('[data-journey-card="wally"]');
  const box = await card.locator(".shadow-2xl").boundingBox();
  if (!box) throw new Error("WALLY 카드가 없습니다");
  expect(box.y / height).toBeGreaterThan(0.6);
  // 칩을 한 줄로 두어도 카드가 칩 폭만큼 늘어나 화면 밖으로 나가지 않는다(칩 목록이 카드 안에서 스크롤된다)
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(width);
  const summary = await card.locator("h3 + p").evaluate((node) => ({ lines: Math.round(node.getBoundingClientRect().height / parseFloat(getComputedStyle(node).lineHeight)) }));
  expect(summary.lines).toBe(2);
  const chips = card.getByRole("list", { name: "기술" });
  const layout = await chips.evaluate((node) => ({ scroll: node.scrollWidth > node.clientWidth, rows: new Set([...node.children].map((child) => Math.round(child.getBoundingClientRect().top))).size }));
  expect(layout).toEqual({ scroll: true, rows: 1 });
  await expect(chips).toHaveAttribute("tabindex", "0");
  // 다른 정류장 카드는 그대로다: 요약이 잘리지 않고 칩도 한 줄 스크롤이 아니다
  for (const id of ["stock2u", "tix2u", "pfplay"]) {
    const other = page.locator(`[data-journey-card="${id}"]`);
    expect(await other.locator("h3 + p").evaluate((node) => node.scrollHeight <= node.clientHeight + 1), id).toBe(true);
    await expect(other.locator("[data-chips]"), id).toHaveCount(0);
  }
});
}
