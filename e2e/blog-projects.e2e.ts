import { expect, test, type Page } from "@playwright/test";

// 데이터화 리팩터링의 안전망. 리팩터링 전에 찍은 기준과 화면·DOM·콘솔 에러를 비교한다.
// 기준(e2e/__screenshots__/)은 기계마다 렌더링이 달라 git에 넣지 않는 로컬 전용이다. 새로 클론한 곳에서
// 처음 실행하면 그 순간의 화면이 기준이 되므로, 의도한 화면에서 --update-snapshots로 찍는다.
// 2026-10-14: 헤더에 Journey 링크를 넣으며 높이·DOM·마크업이 같음을 확인하고 기준을 갱신했다.
// 2026-10-19(여정 2-4a): 작은 화면의 헤더 메뉴 간격·글자를 줄이며 높이·DOM·마크업·콘솔 에러 기준이 같음을 확인하고
// 모바일의 첫 화면 조각(헤더가 든 *-0.png)만 갱신했다.
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
      // 썸네일 둥근 모서리 안티앨리어싱이 실행마다 ±1단계 흔들려서 0.01로 둔다(기본 0.2는 너무 느슨하다). 0.01은 그 정도만 흡수한다.
      expect(shot).toMatchSnapshot(`${slug}-${index}.png`, { maxDiffPixels: 0, threshold: 0.01 });
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

    // 색상 설정과 무관하게 클래스·마크업 회귀를 잡는다. light에서만 보이는 클래스(text-zinc-950 등)도 여기서 비교된다.
    // <article> 요소 자신의 속성까지 보려고 outerHTML을 쓴다. <article>이 없으면 빈 기준이 기록되지 않도록 실패시킨다.
    // React가 인접 텍스트 사이에 넣는 <!-- --> 구분자는 렌더 결과에 영향이 없으므로 지운다.
    const markup = await page.evaluate(() => {
      const article = document.querySelector("article");
      if (!article) throw new Error("<article>가 없습니다");
      return article.outerHTML.replace(/<!--.*?-->/g, "");
    });
    expect(markup).toMatchSnapshot(`${slug}-markup.html`);

    // 기존 에러는 기준에 같이 기록된다. 새로 생긴 에러만 실패로 드러난다.
    expect(errors.join("\n")).toMatchSnapshot(`${slug}-errors.txt`);
  });
}
