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
    // 서버는 이 맥 안(127.0.0.1)에만 연다. 0.0.0.0으로 열면 공인 주소에 바로 붙은 맥에서는 테스트하는 동안 인터넷에 열린다(2-4b)
    baseURL: `http://127.0.0.1:${PORT}`,
    // 사이트는 <html class="dark">로 어두운 배경을 고정하고, `dark:` 변형도 같은 클래스를 따른다
    // (globals.css의 @custom-variant). 그래서 색상 설정과 상관없이 같은 화면이다.
    // 블로그 글 비교(blog-projects.e2e.ts)는 일부러 light로 찍어 이 고정이 풀리지 않는지 본다.
    colorScheme: "dark",
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
    command: `npx next build && npx next start -H 127.0.0.1 --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: false,
    timeout: 300_000,
  },
});
