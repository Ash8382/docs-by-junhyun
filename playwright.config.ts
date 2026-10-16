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
    // 사이트는 <html class="dark">로 어두운 배경을 고정하지만, 글의 `dark:` 클래스는 브라우저의
    // 색상 설정을 따른다. 기본값(light)으로 찍으면 text-zinc-950 제목·본문이 어두운 배경에 묻힌다.
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
    command: `npx next build && npx next start --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 300_000,
  },
});
