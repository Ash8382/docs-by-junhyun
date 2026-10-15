# 여정(Journey) 2-2 구현 계획 — 시각 언어: 회랑·렌더 단계·분위기·후처리

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 임시 도형(`PlaceholderCorridor`)을 실제 회랑과 원형 전시실로 바꾸고, 회랑을 따라 청사진 → 클레이 → 완성품으로 렌더링되는 시각 언어(렌더 단계 셰이더, 조명·안개·배경, 환경 반사, 후처리)를 입힌다. 셰이더는 미리 컴파일하고, 준비가 끝나면 장면을 드러낸다.

**Architecture:** 렌더 단계는 회랑을 따라 나아간 거리 s(= −z)의 함수다(`stage.ts`). 모든 3D 재질은 `MeshStandardMaterial`에 `onBeforeCompile`로 같은 단계 계산을 넣은 "렌더 단계 재질"이고, 셰이더 글자가 같아 프로그램을 같이 쓴다. 회랑 도형은 three 없이 정점 배열만 만드는 순수 데이터(`corridor.ts`, UV는 미터 단위)이고, 장면이 BufferGeometry로 감싼다. 조명·안개·배경은 스크롤 진행률의 분위기(`atmosphere.ts`)를 매 프레임 적용한다. 후처리는 @react-three/postprocessing의 EffectComposer(블룸, Neutral 톤 매핑, 비네트, SMAA)다. `Warmup`이 렌더 타깃을 건 채 `compileAsync`로 셰이더를 미리 컴파일한 뒤에야 시계에 렌더 단계를 건다. 장면 상태 저장소(`sceneStatus.ts`)가 로딩 막대와 캔버스 드러내기를 이끈다.

**계획을 쓰며 확인한 것:**
- 렌더 단계 셰이더를 three로 직접 그린 시제품에서 WebGL2(헤드리스 Chromium, SwiftShader)가 오류 없이 컴파일했다. 재질 7종이 프로그램 3개(앞면, 양면, 인스턴스)를 나눠 쓴다.
- 화면 기준으로 사전 컴파일하면 첫 렌더에서 프로그램 3개를 다시 만든다(3 → 6). EffectComposer는 HDR 렌더 타깃에 그리므로 출력 색 공간이 달라서다. 렌더 타깃을 건 채 컴파일하면 다시 만들지 않는다(3 → 3). 그래서 `Warmup`은 렌더 타깃을 건다.
- 톤 매핑은 ACES와 Neutral을 같은 장면으로 비교해 Neutral을 골랐다. 청사진 선이 파랗게 남고 3막의 색이 산다. ACES는 선이 하얗게 날아가고 3막이 한 덩어리 크림색이 된다.
- 이 계획의 코드를 HEAD 사본에 모두 넣고 단위 189개, 타입 검사, eslint, e2e 64개(블로그 14 + 여정 50)가 통과했다. 실제 빌드를 헤드리스로 9장면 찍어 시제품과 같은 모습인지 봤다.
- three r181에는 `WebGLRenderer`의 컨텍스트 생성 catch에서 매개변수 이름 `error`가 기록 함수 `error`를 가리는 버그가 있다. 그래서 렌더러를 만들지 못하면 메시지가 "… is not a function"이 된다. e2e는 메시지 문구를 보지 않는다(Task 7).

**스펙과 다르게 정한 점(사용자 검토 대상):**
1. **다음 막을 가리는 방법.** 스펙은 "회랑이 완만하게 휘어서 다음 막이 미리 보이지 않는다"이다. 지금 경로(x 진폭 1.5m, 주기 약 113m)는 시야가 50m 넘게 트여 휨만으로는 가려지지 않는다. 경로를 크게 휘면 2-1의 정류장·오브젝트·카메라 자리가 모두 바뀐다. 대신 막마다 안개 거리(1막 4~18m, 2막 8~30m)로 앞을 흐리게 하고, 전시실 벽을 양면으로 그려 회랑에서 전시실 안이 비쳐 보이지 않게 한다.
2. **사전 컴파일과 스크롤.** 스펙은 "셰이더를 미리 컴파일한 뒤 스크롤을 켠다"이다. 이 계획은 스크롤을 막지 않고, 장면을 컴파일이 끝난 뒤에 드러낸다. 본문은 진짜 HTML이라 3D 준비 전에도 읽히고 스크롤된다. 스크롤 잠금을 3D 성공에 묶으면 3D가 실패할 때 페이지가 멈출 수 있다(2-1 최종 리뷰의 오류 격리 원칙).
3. **톤 매핑 효과 추가.** 스펙의 후처리는 블룸, 안티에일리어싱, 비네트다. EffectComposer가 렌더러의 톤 매핑을 끄므로 톤 매핑 효과가 없으면 HDR 값이 그대로 잘린다.
4. **2-3·2-4로 넘기는 것.** 2막의 "부드러운 그림자"와 3막의 "유리"는 2-3에서 오브젝트와 함께 만든다. 지금 회랑에는 그림자를 드리울 물체가 없고, 유리는 PiCKCARE 코어 오브젝트다. 적응형 품질(drei `PerformanceMonitor`, 블룸 끄기)은 2-4에서 실행 중 강등과 함께 만든다. 1막 캡션과 벽면 오브젝트가 보이는 시점 맞추기(2-1 Task 3 이월)도 오브젝트가 생기는 2-3에서 한다.

**Tech Stack:** Next 16 App Router, React 19, TypeScript, three 0.181.2, @react-three/fiber 9.4.0(`frameloop="never"` + `advance`), @react-three/drei 10.7.7(`Environment`, `Lightformer`), @react-three/postprocessing 3.0.4(postprocessing 6.38), gsap 3.15.0, lenis 1.3.26, vitest 4, @playwright/test 1.63, sharp 0.34.5

**Spec:** `docs/superpowers/specs/2026-10-14-journey-design.md` (3절 시각 언어, 2절 세 막·정류장, 4절 화면 층·스크롤과 렌더링, 5절 로딩, 7절 성능, 8절 테스트). 2단계 계획 4개 중 둘째다: 2-1 골격(완료), **2-2 시각 언어(이 문서)**, 2-3 오브젝트, 2-4 기기 대응과 마감.

## Global Constraints

- **범위:** 회랑·전시실 도형, 렌더 단계 셰이더, 조명·안개·배경·환경 반사, 후처리, 셰이더 사전 컴파일과 로딩 막대, 밝은 막 위의 화면 요소 가독성만 만든다. 오브젝트 7종·그림자·유리·오브젝트 상호작용(2-3), 기기 3단계 판별·적응형 품질·실행 중 강등·2D 레이아웃·움직임 줄이기·`?debug=perf`(2-4)는 만들지 않는다
- **오류 격리:** three·R3F 코드는 모두 `SceneBoundary` 아래에서 돈다. 3D 층(청크, 렌더러, 셰이더, 후처리)이 실패해도 본문·진행 막대·상세·엔딩은 동작하고 로딩 막대는 사라져야 한다
- **블로그 7개 글 화면은 바뀌지 않는다.** 블로그 e2e(픽셀·마크업)가 그대로 통과해야 하고, 기준(`e2e/__screenshots__/`)을 갱신하지 않는다
- **의존성을 추가하지 않는다.** 설치된 three·R3F·drei·@react-three/postprocessing만 쓴다. `postprocessing` 패키지는 간접 의존성이라 직접 import하지 않는다
- **시계 하나:** `/journey`에서 프레임을 도는 것은 GSAP ticker 하나뿐이다. Canvas는 `frameloop="never"`이고 렌더 단계는 `setRenderStep`으로만 건다. 컴포넌트에서 `requestAnimationFrame`을 직접 쓰지 않는다(측정·캡처 스크립트 제외)
- **스크롤 중 React 렌더 금지:** 스크롤에 따라 바뀌는 값(분위기, 카메라, 셰이더 시간)은 `scrollState`와 `useFrame` 안에서만 흐른다. 장면 상태는 준비·실패 때 한 번씩만 바뀐다
- **three·`@react-three/*` import는 `src/components/journey/scene/` 안에서만 한다**(그 폴더의 테스트 포함). `src/lib/journey/`는 three 없는 순수 코드다
- **렌더 단계의 단일 원천:** 경계·노이즈 상수는 `stage.ts`, 막별 분위기 값은 `atmosphere.ts`, 재질 색은 `stageMaterial.ts`(단계 공통)와 `buildCorridor.ts`의 `LOOKS`(완성품)에만 둔다. 셰이더는 `stage.ts` 상수를 `#define`으로 받는다
- **`/journey`에서 `backdrop-filter`(흐림) 금지:** 바탕은 반투명 단색만 쓴다
- **React Compiler 계열 린트 규칙이 에러로 켜져 있다**(`react-hooks/set-state-in-effect`, `refs`, `purity`, `immutability` 등): effect 안 동기 `setState`, 렌더 중 `ref.current` 접근, 렌더 중 `Math.random`·`Date.now` 금지. 브라우저 값은 `useSyncExternalStore`로 읽는다
- **설명 문장(카피)을 넣지 않는다(사용자 결정, 2026-10-14).** 로딩 막대도 글 없는 장식이고 `aria-hidden`이다
- **명령 실행:** Bash 검증 명령에는 `rtk proxy`를 붙이고 exit code를 믿는다. 파일은 Read 도구로 읽는다(`cat`은 rtk 필터가 주석 줄을 빠뜨린다). `npx tsx`·`npm run x -- 인자`는 rtk가 망가뜨리므로 `rtk proxy npm run <스크립트>`나 `rtk proxy npx tsx`로 실행하고, 인자는 환경 변수로 넘긴다. zsh에서 `$var:path`는 수정자로 해석되므로 `${var}:path`로 쓴다
- **기계 자원(2026-10-14 강제 재부팅 뒤 규칙):** 무거운 명령(Playwright, `next build`, vitest, `tsc`)은 하나씩 차례로 돌리고 백그라운드나 병렬로 돌리지 않는다. Playwright·빌드 전에 `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`로 다른 프로젝트의 무거운 작업이 없는지 확인하고, 있으면 끝날 때까지 기다린다(15초 간격, 10분 넘으면 BLOCKED). vitest는 늘 `--maxWorkers=4`로 돌린다. 띄운 서버는 `lsof -t -iTCP:<포트> -sTCP:LISTEN`으로 찾은 PID만 끈다(`pkill -f next-server`처럼 넓은 패턴 금지)
- **커밋하지 않는다.** 에이전트는 `git add`/`commit`/`stash`/`reset`/`checkout`/`restore`를 실행하지 않는다. 각 태스크 마지막 단계는 파일별 변경 표와 커밋 메시지 초안 제출이다(`type: 한국어 요약` + 이유를 적는 `- ` 불릿, 트레일러 없음). 사용자는 모든 태스크가 끝날 때까지 커밋을 보류한다
- 기존 스타일을 따른다: 한국어 주석, `function` 선언형 컴포넌트, Tailwind 유틸리티. 단위 테스트는 소스 옆 `*.test.ts`, e2e는 `e2e/*.e2e.ts`

## Review Focus

1. **셰이더를 컴파일하지 못하는 GPU·드라이버.** three는 컴파일 오류를 콘솔 에러로 알리고 장면은 검게 남는다. 사람은 적어도 본문이 정상이고 로딩 표시가 끝나기를 기대한다 → Task 7 "3D 장면이 셰이더를 미리 컴파일하고 드러나면…"(SwiftShader에서 콘솔 에러 0으로 문법 오류를 잡는다), Task 7 "렌더러를 만들지 못해도…"(실패 상태에서 로딩 막대가 사라진다)
2. **첫 진입에서 셰이더 컴파일 때문에 끊김.** 사람은 처음 스크롤부터 부드럽기를 기대한다 → Task 7의 준비 상태 테스트(준비 전에는 그리지 않는다), Task 10 성능 측정(서버를 띄운 뒤 둘째 실행에서 50ms 초과 0)
3. **밝은 2·3막 위의 글.** 진행 막대·패널·헤더·푸터가 밝은 회색·크림색 장면 위에 놓인다. 사람은 어느 막에서나 읽히기를 기대한다 → Task 8 "진행 막대와 푸터는 밝은 장면 위에서도 바탕이 있다", Task 10 캡처 눈 확인
4. **휴대폰 세로 화면의 엔딩.** 가로가 좁으면 내려다보는 시점에서 전시실 양옆이 잘릴 수 있다. 사람은 회랑 전체를 보기를 기대한다 → Task 2 "엔딩 시점은 가로 화면과 휴대폰 세로 화면 모두에서…"(16:9, 390×844)
5. **다른 페이지에 다녀온 뒤 재진입.** 장면 상태가 "준비됨"이나 "실패"로 남으면 캔버스가 숨거나 로딩 막대가 남는다 → Task 7 "다른 페이지에 다녀오면 장면을 다시 준비한다"

---

## 파일 구조

| 파일 | 책임 |
|---|---|
| `src/lib/journey/timeline.ts` | (수정) `smoothstep`·`CAMERA_FOV`·`pathSpan`·`hallCenter` 내보내기, 엔딩 시점 조정 |
| `src/lib/journey/stage.ts` | 렌더 단계 함수와 경계·노이즈 상수 (순수) |
| `src/lib/journey/atmosphere.ts` | 막별 분위기 값과 진행률 보간 (순수) |
| `src/lib/journey/corridor.ts` | 회랑·전시실 도형 데이터와 부재 자리 (순수) |
| `src/lib/journey/sceneStatus.ts` | 장면 준비 상태 저장소 |
| `src/components/journey/scene/stageMaterial.ts` | 렌더 단계 재질(`onBeforeCompile`)과 공유 uniform |
| `src/components/journey/scene/StageTime.tsx` | 경계 노이즈 시간 uniform 진행 |
| `src/components/journey/scene/buildCorridor.ts` | 도형 데이터 → three 객체, 해제 |
| `src/components/journey/scene/Corridor.tsx` | 회랑을 장면에 올림 |
| `src/components/journey/scene/Atmosphere.tsx` | 배경·안개·빛·환경맵 |
| `src/components/journey/scene/Effects.tsx` | 후처리 |
| `src/components/journey/scene/Warmup.tsx` | 셰이더 사전 컴파일, 렌더 단계 걸기, 준비 상태 |
| `src/components/journey/scene/Scene.tsx` | (수정) 렌더러 생성, 상태 틀, 장면 구성 |
| `src/components/journey/scene/PlaceholderCorridor.tsx` | (삭제) |
| `src/components/journey/SceneLoading.tsx` | 로딩 막대 |
| `src/components/journey/SceneBoundary.tsx`, `JourneyStage.tsx` | (수정) 실패 상태, 로딩 막대, 재진입 초기화 |
| `src/components/journey/ProgressRail.tsx` | (수정) 밝은 장면 위 바탕, 엔딩 점 자리, 라벨 |
| `src/app/globals.css` | (수정) 로딩 애니메이션, 불투명 푸터 |
| `e2e/journey.e2e.ts` | (수정) 스크롤 이음매, 번들 경계, 준비·재진입, 실패, 가독성 |
| `scripts/perf-journey.ts` | (수정) 준비 대기, 시한, 주사율·GPU 출력 |
| `scripts/capture-journey.ts`, `package.json` | 시각 검토 캡처 |

---

### Task 1: 스크롤 이음매 e2e (2-1 최종 리뷰 이월)

2-1 최종 리뷰가 "2-3 전에 반드시" 넣으라고 한 테스트다. 상세 패널의 스크롤 잠금(Lenis `stop`)이 풀리지 않으면 페이지 전체가 굳는다. 2-3은 오브젝트 클릭으로 패널을 여는 등 이 이음매를 바꾸므로 지금 고정한다. 코드는 바꾸지 않는다. 테스트가 정말 잡는지 잠금을 일부러 남겨 RED를 본다.

**Files:**
- Modify: `e2e/journey.e2e.ts` (끝에 덧붙임)

**Interfaces:**
- Produces: `expectWheelScrolls(page)` — 같은 파일의 뒤 태스크 테스트가 쓰지는 않지만, 2-3에서 재사용한다

- [ ] **Step 1: 테스트를 파일 끝에 붙인다**

```ts
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
```

- [ ] **Step 2: 지금 코드에서 통과하는지 본다**

Playwright 전에 Global Constraints의 자원 확인을 하고, `lsof -i :3100`이 비어 있는지 본다.

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts -g "휠|패널을 닫으면|블로그 원문으로"`
Expected: 6 passed (3 × desktop·mobile)

- [ ] **Step 3: 테스트가 잠금을 잡는지 확인한다(RED)**

`src/components/journey/ProjectDialog.tsx`의 열기 effect 정리 함수에서 `unlockScroll();` 한 줄을 잠시 지운다.

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts -g "패널을 닫으면|블로그 원문으로"`
Expected: 4 failed. `html`에 `lenis-stopped`가 남아 `not.toHaveClass` 단언에서 실패한다

지운 줄을 되돌린다. `rtk proxy git diff -- src/components/journey/ProjectDialog.tsx`의 출력이 비어 있어야 한다.

- [ ] **Step 4: 여정 e2e 전체**

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts`
Expected: 42 passed

- [ ] **Step 5: 변경 정리와 커밋 메시지 초안 제출**

| 파일 | 변경 |
|---|---|
| `e2e/journey.e2e.ts` | 휠 스크롤, 패널 닫은 뒤 스크롤, 블로그 원문 왕복 뒤 스크롤 테스트 |

```
test: 여정 상세 패널의 스크롤 잠금이 풀리는지 고정하기

- 패널이 열린 동안 멈춘 Lenis가 닫은 뒤에도 남으면 페이지 전체가 굳는다. 2-3이 오브젝트 클릭으로 패널을 열며 이 이음매를 바꾸기 전에 고정한다
- 패널을 연 채 블로그 원문으로 나갔다 돌아오는 경로는 언마운트와 재마운트가 섞여 잠금이 남기 쉽다
- 지금까지 스크롤 테스트는 End 키와 진행 막대만 써서 Lenis의 휠 경로를 직접 보지 않았다
```

---

### Task 2: 렌더 단계와 분위기 (순수 함수)

렌더 단계(0 청사진, 1 클레이, 2 완성품)를 회랑 거리의 함수로 정의하고, 카메라 자리의 단계로 조명·안개·배경을 보간한다. 엔딩 시점을 회랑 전체가 담기도록 옮긴다(2-1 Task 3 이월: 세로 FOV 50°에서 입구가 잘림).

**Files:**
- Modify: `src/lib/journey/timeline.ts`, `src/lib/journey/timeline.test.ts`
- Create: `src/lib/journey/stage.ts`, `src/lib/journey/stage.test.ts`, `src/lib/journey/atmosphere.ts`, `src/lib/journey/atmosphere.test.ts`

**Interfaces:**
- Consumes: `timeline.ts`의 `PATH_SPANS`(비공개), `rangeOf`, `focusPoint`, `stopAt`, `pathParamAt`
- Produces:
  - `timeline.ts`: `smoothstep(edge0, edge1, value): number`, `CAMERA_FOV = 50`, `pathSpan(id): { from: number; to: number }`, `hallCenter(): Vec3`
  - `stage.ts`: `STAGE_EDGES: readonly [number, number]`(= [19, 33]), `STAGE_NOISE = { scale, amplitude, speed }`, `STAGE_EDGE_SOFTNESS`, `STAGE_GLOW_WIDTH`, `ATMOSPHERE_BLEND`, `stageAt(s, softness): number`
  - `atmosphere.ts`: `type Rgb`, `interface Atmosphere { background, fogNear, fogFar, sky, ground, hemisphere, key, keyIntensity }`, `ATMOSPHERES = { wire, clay, final, overview }`, `mixAtmosphere(a, b, t)`, `atmosphereAt(progress): Atmosphere`

- [ ] **Step 1: timeline 테스트를 고친다(엔딩 화면 담기, 회랑 위치)**

`src/lib/journey/timeline.test.ts`에서 찾을 부분:

```ts
import {
  PATH_LENGTH,
```

바꿀 내용:

```ts
import {
  CAMERA_FOV,
  PATH_LENGTH,
```

`src/lib/journey/timeline.test.ts`에서 찾을 부분:

```ts
  cameraAt,
  focusPoint,
  objectSide,
  pathParamAt,
  rangeOf,
```

바꿀 내용:

```ts
  cameraAt,
  focusPoint,
  hallCenter,
  objectSide,
  pathParamAt,
  pathSpan,
  rangeOf,
```

`src/lib/journey/timeline.test.ts`에서 찾을 부분:

```ts
  it("엔딩 끝에서는 위에서 회랑 전체를 내려다본다", () => {
    const end = cameraAt(1);
    expect(end.position[1]).toBeGreaterThan(20);
    expect(end.target[1]).toBe(0);
  });
});
```

바꿀 내용:

```ts
  it("엔딩 끝에서는 위에서 회랑 전체를 내려다본다", () => {
    const end = cameraAt(1);
    expect(end.position[1]).toBeGreaterThan(20);
    expect(end.target[1]).toBe(0);
  });

  it("엔딩 시점은 가로 화면과 휴대폰 세로 화면 모두에서 회랑 입구부터 전시실 뒤까지 담는다", () => {
    const end = cameraAt(1);
    const center = hallCenter();
    // 회랑 입구(s=−3)의 양쪽 벽 밑, 전시실의 왼쪽·오른쪽·뒤쪽 벽 밑과 뒤쪽 지붕 끝(반지름 11, 높이 8)
    const points: Vec3[] = [
      [-2.5, 0, 3],
      [2.5, 0, 3],
      [center[0] - 11, 0, center[2]],
      [center[0] + 11, 0, center[2]],
      [center[0], 0, center[2] - 11],
      [center[0], 8, center[2] - 11],
    ];
    for (const aspect of [16 / 9, 390 / 844]) {
      for (const point of points) {
        const { horizontal, vertical } = screenRatio(end, point, aspect);
        expect(horizontal, `${aspect} ${point}`).toBeLessThan(1);
        expect(vertical, `${aspect} ${point}`).toBeLessThan(1);
      }
    }
  });
});

/** 점이 화면 가장자리까지의 몇 배 거리에 맺히는가(1보다 작으면 화면 안) */
function screenRatio(pose: { position: Vec3; target: Vec3 }, point: Vec3, aspect: number) {
  const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const unit = (a: Vec3): Vec3 => {
    const length = Math.hypot(...a);
    return [a[0] / length, a[1] / length, a[2] / length];
  };
  const forward = unit(sub(pose.target, pose.position));
  const right = unit(cross(forward, [0, 1, 0]));
  const up = cross(right, forward);
  const offset = sub(point, pose.position);
  const depth = dot(offset, forward);
  const tanVertical = Math.tan(((CAMERA_FOV / 2) * Math.PI) / 180);
  return {
    horizontal: Math.abs(dot(offset, right) / depth) / (tanVertical * aspect),
    vertical: Math.abs(dot(offset, up) / depth) / tanVertical,
  };
}

describe("회랑 위치", () => {
  it("정류장이 회랑에서 차지하는 거리 구간을 준다", () => {
    expect(pathSpan("intro")).toEqual({ from: 0, to: 4 });
    expect(pathSpan("act-2")).toEqual({ from: 18, to: 20 });
    expect(pathSpan("pickcare")).toEqual({ from: 34, to: PATH_LENGTH });
  });

  it("전시실 중심은 PiCKCARE 오브젝트 바로 아래 바닥이다", () => {
    const focus = focusPoint(rangeOf("pickcare").stop);
    if (!focus) throw new Error("전시실 오브젝트 위치가 없습니다");
    expect(hallCenter()).toEqual([focus[0], 0, focus[2]]);
  });
});
```

- [ ] **Step 2: 단계·분위기 테스트를 쓴다**

`src/lib/journey/stage.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { ATMOSPHERE_BLEND, STAGE_EDGES, STAGE_EDGE_SOFTNESS, stageAt } from "./stage";
import { pathSpan } from "./timeline";

describe("렌더 단계", () => {
  it("경계는 2막·3막 진입 정류장의 한가운데다", () => {
    const act2 = pathSpan("act-2");
    const act3 = pathSpan("act-3");
    expect(STAGE_EDGES).toEqual([(act2.from + act2.to) / 2, (act3.from + act3.to) / 2]);
  });

  it("입구는 청사진, 2막 한가운데는 클레이, 전시실은 완성품이다", () => {
    expect(stageAt(pathSpan("intro").from, STAGE_EDGE_SOFTNESS)).toBe(0);
    const stock2u = pathSpan("stock2u");
    expect(stageAt((stock2u.from + stock2u.to) / 2, STAGE_EDGE_SOFTNESS)).toBe(1);
    expect(stageAt(pathSpan("pickcare").to, STAGE_EDGE_SOFTNESS)).toBe(2);
  });

  it("경계 위에서는 두 단계의 한가운데다", () => {
    expect(stageAt(STAGE_EDGES[0], ATMOSPHERE_BLEND)).toBeCloseTo(0.5, 10);
    expect(stageAt(STAGE_EDGES[1], ATMOSPHERE_BLEND)).toBeCloseTo(1.5, 10);
  });

  it("회랑을 따라 나아가면 단계는 줄지 않는다", () => {
    let previous = -1;
    for (let s = -5; s <= 60; s += 0.25) {
      const stage = stageAt(s, ATMOSPHERE_BLEND);
      expect(stage, `s=${s}`).toBeGreaterThanOrEqual(previous);
      previous = stage;
    }
  });
});
```

`src/lib/journey/atmosphere.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { ATMOSPHERES, atmosphereAt, mixAtmosphere } from "./atmosphere";
import { rangeOf } from "./timeline";

function middle(id: string): number {
  const range = rangeOf(id);
  return (range.start + range.end) / 2;
}

describe("분위기", () => {
  it("세 막의 한가운데에서는 그 막의 값 그대로다", () => {
    expect(atmosphereAt(middle("kokoa-clone"))).toEqual(ATMOSPHERES.wire);
    expect(atmosphereAt(middle("tix2u"))).toEqual(ATMOSPHERES.clay);
    expect(atmosphereAt(middle("pickcare"))).toEqual(ATMOSPHERES.final);
  });

  it("엔딩 끝에서는 내려다보는 값이다", () => {
    expect(atmosphereAt(1)).toEqual(ATMOSPHERES.overview);
  });

  it("엔딩은 3막 값에서 출발한다(위로 빠지는 동안 앞 막의 색이 비치지 않는다)", () => {
    expect(atmosphereAt(rangeOf("ending").start)).toEqual(ATMOSPHERES.final);
  });

  it("막 경계에서는 두 막 사이 값이다", () => {
    const edge = atmosphereAt(middle("act-2"));
    expect(edge.fogFar).toBeGreaterThan(ATMOSPHERES.wire.fogFar);
    expect(edge.fogFar).toBeLessThan(ATMOSPHERES.clay.fogFar);
  });

  it("섞기는 양 끝에서 원래 값을 돌려준다", () => {
    expect(mixAtmosphere(ATMOSPHERES.wire, ATMOSPHERES.clay, 0)).toEqual(ATMOSPHERES.wire);
    expect(mixAtmosphere(ATMOSPHERES.wire, ATMOSPHERES.clay, 1)).toEqual(ATMOSPHERES.clay);
  });

  it("색은 모두 0~1 sRGB다", () => {
    for (const atmosphere of Object.values(ATMOSPHERES)) {
      for (const color of [atmosphere.background, atmosphere.sky, atmosphere.ground, atmosphere.key]) {
        for (const channel of color) {
          expect(channel).toBeGreaterThanOrEqual(0);
          expect(channel).toBeLessThanOrEqual(1);
        }
      }
    }
  });
});
```

- [ ] **Step 3: 실패를 확인한다**

Run: `rtk proxy npx vitest run src/lib/journey/timeline.test.ts src/lib/journey/stage.test.ts src/lib/journey/atmosphere.test.ts --maxWorkers=4`
Expected: FAIL. `stage.test.ts`와 `atmosphere.test.ts`는 모듈이 없다(`Failed to resolve import "./stage"`). `timeline.test.ts`는 기존 12개는 통과하고, 새 3개가 `hallCenter`·`pathSpan`이 함수가 아니라는 TypeError로 실패한다

- [ ] **Step 4: timeline.ts를 고친다**

`src/lib/journey/timeline.ts`에서 찾을 부분:

```ts
function smoothstep(edge0: number, edge1: number, value: number): number {
```

바꿀 내용:

```ts
export function smoothstep(edge0: number, edge1: number, value: number): number {
```

`src/lib/journey/timeline.ts`에서 찾을 부분:

```ts
const EYE_HEIGHT = 1.6;
```

바꿀 내용:

```ts
const EYE_HEIGHT = 1.6;
/** 3D 장면의 세로 시야각(도). 엔딩 시점이 회랑 전체를 담는지 테스트가 이 값으로 확인한다. */
export const CAMERA_FOV = 50;
```

`src/lib/journey/timeline.ts`에서 찾을 부분:

```ts
export const PATH_LENGTH = PATH_SPANS[PATH_SPANS.length - 1].to;
```

바꿀 내용:

```ts
export const PATH_LENGTH = PATH_SPANS[PATH_SPANS.length - 1].to;

/** 정류장이 회랑을 따라 차지하는 거리 구간(s). 렌더 단계 경계와 회랑 도형이 이 값으로 자리를 잡는다. */
export function pathSpan(id: string): { from: number; to: number } {
  return PATH_SPANS[rangeOf(id).index];
}
```

`src/lib/journey/timeline.ts`에서 찾을 부분:

```ts
/** 엔딩: 위로 빠지며 회랑 전체를 내려다보는 자리 */
const OVERVIEW_POSITION: Vec3 = [0, 34, -PATH_LENGTH * 0.5 + 22];
const OVERVIEW_TARGET: Vec3 = [0, 0, -PATH_LENGTH * 0.5];
```

바꿀 내용:

```ts
/** PiCKCARE 원형 전시실의 바닥 중심. 전시실 오브젝트(focusPoint)가 이 위에 뜬다. */
export function hallCenter(): Vec3 {
  const focus = focusPoint(rangeOf("pickcare").stop);
  if (!focus) throw new Error("전시실 정류장에 오브젝트 위치가 없습니다");
  return [focus[0], 0, focus[2]];
}

/**
 * 엔딩: 위로 빠지며 회랑 전체를 내려다보는 자리. 회랑 입구(z≈3)부터 전시실 뒤쪽 벽(z≈−58)까지
 * 데스크톱 가로 화면과 휴대폰 세로 화면 모두의 시야에 들어온다(timeline.test.ts가 확인).
 */
const OVERVIEW_POSITION: Vec3 = [0, 40, 22];
const OVERVIEW_TARGET: Vec3 = [0, 0, -17];
```

- [ ] **Step 5: stage.ts와 atmosphere.ts를 만든다**

`src/lib/journey/stage.ts`:

```ts
import { pathSpan, smoothstep } from "./timeline";

/**
 * 렌더 단계(스펙 3절 "청사진 → 클레이 → 완성품"). 회랑을 따라 나아간 거리 s의 함수로, 0은 청사진,
 * 1은 클레이, 2는 완성품이다. 경계는 2막·3막 진입 정류장의 한가운데다.
 * 셰이더(scene/stageMaterial.ts)는 같은 상수로 면마다 단계를 구하고, 조명·안개(atmosphere.ts)는
 * 카메라 자리의 단계를 구해 보간한다. 그래서 오브젝트도 자기가 선 막의 단계를 저절로 따른다.
 */

function middle(span: { from: number; to: number }): number {
  return (span.from + span.to) / 2;
}

export const STAGE_EDGES: readonly [number, number] = [middle(pathSpan("act-2")), middle(pathSpan("act-3"))];

/** 셰이더 경계의 노이즈. 경계가 곧은 선이 아니라 앞쪽 공간이 "렌더링되어 가는" 얼룩 모양이 되고, 천천히 흐른다. */
export const STAGE_NOISE = { scale: 0.45, amplitude: 0.9, speed: 0.12 } as const;

/** 셰이더에서 단계가 바뀌는 폭(m). 좁아서 노이즈 경계를 따라 또렷하게 바뀐다. */
export const STAGE_EDGE_SOFTNESS = 0.06;

/** 경계를 따라 흐르는 빛나는 선의 폭(m) */
export const STAGE_GLOW_WIDTH = 0.08;

/** 조명·안개가 단계 사이를 넘어가는 폭(m). 카메라가 경계를 지나는 몇 걸음에 걸쳐 바뀐다. */
export const ATMOSPHERE_BLEND = 2.5;

/** 거리 s의 렌더 단계(0~2). softness는 경계 양쪽으로 단계가 섞이는 폭이다. */
export function stageAt(s: number, softness: number): number {
  const [first, second] = STAGE_EDGES;
  return smoothstep(first - softness, first + softness, s) + smoothstep(second - softness, second + softness, s);
}
```

`src/lib/journey/atmosphere.ts`:

```ts
import { ATMOSPHERE_BLEND, stageAt } from "./stage";
import { pathParamAt, smoothstep, stopAt } from "./timeline";

/**
 * 조명·안개·배경색(스펙 3절). 카메라가 선 자리의 렌더 단계로 세 막의 값을 보간하고,
 * 엔딩에서는 회랑 전체를 내려다보는 값으로 넘어간다. three를 import하지 않는 순수 함수다.
 */

/** sRGB 0~1 */
export type Rgb = readonly [number, number, number];

export interface Atmosphere {
  /** 배경과 안개 색 */
  background: Rgb;
  fogNear: number;
  fogFar: number;
  sky: Rgb;
  ground: Rgb;
  hemisphere: number;
  key: Rgb;
  keyIntensity: number;
}

function hex(value: string): Rgb {
  const n = Number.parseInt(value.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export const ATMOSPHERES = {
  /** 1막: 짙은 남색 배경. 선이 스스로 빛나므로 조명은 약하다 */
  wire: {
    background: hex("#0a1a33"),
    fogNear: 4,
    fogFar: 18,
    sky: hex("#2a4a7a"),
    ground: hex("#050b16"),
    hemisphere: 1.2,
    key: hex("#9cc9ff"),
    keyIntensity: 0.6,
  },
  /** 2막: 중립 회색 스튜디오. 부드러운 위쪽 빛 */
  clay: {
    background: hex("#b5b4b0"),
    fogNear: 8,
    fogFar: 30,
    sky: hex("#f0f0ee"),
    ground: hex("#8a8986"),
    hemisphere: 2.2,
    key: hex("#ffffff"),
    keyIntensity: 2.4,
  },
  /** 3막: 천장으로 들어오는 따뜻한 주광 */
  final: {
    background: hex("#efe2cc"),
    fogNear: 14,
    fogFar: 70,
    sky: hex("#fff1d6"),
    ground: hex("#b89f80"),
    hemisphere: 1.8,
    key: hex("#ffd9a8"),
    keyIntensity: 3.4,
  },
  /** 엔딩: 위에서 회랑 전체를 본다. 안개를 멀리 밀어 세 막이 모두 보인다 */
  overview: {
    background: hex("#0e1320"),
    fogNear: 60,
    fogFar: 160,
    sky: hex("#dfe6f0"),
    ground: hex("#3a3f4a"),
    hemisphere: 0.9,
    key: hex("#fff4e6"),
    keyIntensity: 1.4,
  },
} satisfies Record<string, Atmosphere>;

/** 양 끝(t가 0이나 1)에서 a나 b를 정확히 돌려주는 꼴로 섞는다 */
function lerp(a: number, b: number, t: number): number {
  return a * (1 - t) + b * t;
}

function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

export function mixAtmosphere(a: Atmosphere, b: Atmosphere, t: number): Atmosphere {
  return {
    background: mixRgb(a.background, b.background, t),
    fogNear: lerp(a.fogNear, b.fogNear, t),
    fogFar: lerp(a.fogFar, b.fogFar, t),
    sky: mixRgb(a.sky, b.sky, t),
    ground: mixRgb(a.ground, b.ground, t),
    hemisphere: lerp(a.hemisphere, b.hemisphere, t),
    key: mixRgb(a.key, b.key, t),
    keyIntensity: lerp(a.keyIntensity, b.keyIntensity, t),
  };
}

/** 스크롤 진행률(0~1)의 분위기. 단계는 카메라가 향하는 경로 위치로 구한다(엔딩에서 위로 빠져도 3막 값에서 출발). */
export function atmosphereAt(progress: number): Atmosphere {
  const stage = stageAt(pathParamAt(progress), ATMOSPHERE_BLEND);
  const base =
    stage <= 1
      ? mixAtmosphere(ATMOSPHERES.wire, ATMOSPHERES.clay, stage)
      : mixAtmosphere(ATMOSPHERES.clay, ATMOSPHERES.final, stage - 1);
  const { range, t } = stopAt(progress);
  const overview = range.stop.kind === "ending" ? smoothstep(0, 1, t) : 0;
  return mixAtmosphere(base, ATMOSPHERES.overview, overview);
}
```

값은 시제품에서 조율했다. three r181의 물리 단위 조명이라 반구광·주광 세기가 1보다 크다(1 언저리면 2막 클레이가 어둡게 가라앉는다).

- [ ] **Step 6: 통과를 확인한다**

Run: `rtk proxy npx vitest run src/lib/journey/timeline.test.ts src/lib/journey/stage.test.ts src/lib/journey/atmosphere.test.ts --maxWorkers=4`
Expected: 25 passed (timeline 15, stage 4, atmosphere 6)

Run: `rtk proxy npx vitest run --maxWorkers=4`
Expected: 167 passed

Run: `rtk proxy npm run typecheck`
Expected: exit 0

- [ ] **Step 7: 변경 정리와 커밋 메시지 초안 제출**

| 파일 | 변경 |
|---|---|
| `src/lib/journey/timeline.ts` | `smoothstep`·`CAMERA_FOV`·`pathSpan`·`hallCenter` 내보내기, 엔딩 시점 (0,40,22)→(0,0,−17) |
| `src/lib/journey/timeline.test.ts` | 엔딩 화면 담기(16:9, 390×844), 회랑 구간, 전시실 중심 |
| `src/lib/journey/stage.ts`, `stage.test.ts` | 렌더 단계 함수와 상수 |
| `src/lib/journey/atmosphere.ts`, `atmosphere.test.ts` | 막별 분위기와 진행률 보간 |

```
feat: 여정 렌더 단계와 막별 분위기 정의

- 렌더 단계를 회랑 거리의 함수 하나로 두어 셰이더와 조명·안개가 같은 경계를 쓰게 한다. 오브젝트도 자기가 선 막의 단계를 저절로 따른다
- 분위기는 카메라가 향하는 경로 위치로 구해, 엔딩에서 위로 빠지는 동안 앞 막의 색이 비치지 않게 한다
- 예전 엔딩 시점은 세로 시야각 50°에서 회랑 입구가 잘렸다. 휴대폰 세로 화면까지 담는지 테스트로 고정한다
```

---

### Task 3: 회랑 도형 데이터 (순수 함수)

스펙 2절 "세 막"의 공간을 만든다. 1막은 좁고 낮은 회랑에 문틀과 벽 액자, 2막은 넓고 높은 회랑에 받침대, 3막은 짧은 통로 끝의 천장이 열린 원형 전시실(기둥, 가운데 단)이다. 폭과 높이는 렌더 단계 경계에서 바뀐다. three 없이 배열만 만들어 vitest로 면 방향까지 검사한다.

**Files:**
- Create: `src/lib/journey/corridor.ts`, `src/lib/journey/corridor.test.ts`

**Interfaces:**
- Consumes: `stage.ts`의 `STAGE_EDGES`, `timeline.ts`의 `STOPS`·`focusPoint`·`hallCenter`·`objectSide`·`pathPoint`·`smoothstep`·`Vec3`
- Produces: `interface MeshData { positions: Float32Array; normals: Float32Array; uvs: Float32Array; indices: Uint32Array }`, `interface Instance { position: Vec3; rotationY: number; scale: Vec3 }`, `CORRIDOR_START`, `CORRIDOR_END`, `HALL = { radius, height, oculus, columnRadius }`, `HALL_DOOR_ANGLE`, `HALL_DOOR_HALF_ANGLE`, `corridorProfile(s)`, `frameAt(s)`, `floorStrip()`, `wallStrip(side)`, `hallWall()`, `hallFloor()`, `hallRoof()`, `ribInstances()`, `wallFrameInstances()`, `plinthInstances()`, `columnInstances()`, `daisInstance()`

- [ ] **Step 1: 테스트를 쓴다**

`src/lib/journey/corridor.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  CORRIDOR_END,
  CORRIDOR_START,
  HALL,
  HALL_DOOR_HALF_ANGLE,
  columnInstances,
  corridorProfile,
  daisInstance,
  floorStrip,
  frameAt,
  hallFloor,
  hallRoof,
  hallWall,
  plinthInstances,
  ribInstances,
  wallFrameInstances,
  wallStrip,
  type MeshData,
} from "./corridor";
import { STAGE_EDGES } from "./stage";
import { STOPS, focusPoint, hallCenter, pathSpan, type Vec3 } from "./timeline";

function vertex(data: MeshData, index: number): Vec3 {
  return [data.positions[3 * index], data.positions[3 * index + 1], data.positions[3 * index + 2]];
}

/** 삼각형 감기 순서로 구한 면 방향이 저장한 법선과 같은 쪽인가. 틀리면 면이 뒤집혀 안 보인다 */
function facesMatchNormals(data: MeshData): boolean {
  for (let i = 0; i < data.indices.length; i += 3) {
    const [a, b, c] = [vertex(data, data.indices[i]), vertex(data, data.indices[i + 1]), vertex(data, data.indices[i + 2])];
    const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const face = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    const n = data.indices[i];
    const normal = [data.normals[3 * n], data.normals[3 * n + 1], data.normals[3 * n + 2]];
    if (face[0] * normal[0] + face[1] * normal[1] + face[2] * normal[2] <= 0) return false;
  }
  return true;
}

function wellFormed(data: MeshData) {
  const count = data.positions.length / 3;
  expect(data.normals.length).toBe(data.positions.length);
  expect(data.uvs.length).toBe(count * 2);
  expect(data.indices.length % 3).toBe(0);
  expect(Math.max(...data.indices)).toBeLessThan(count);
}

describe("회랑 단면", () => {
  it("1막은 좁고 낮고, 2막은 넓고 높고, 3막 통로는 그 사이다", () => {
    expect(corridorProfile(pathSpan("kokoa-clone").from)).toEqual({ halfWidth: 2.5, height: 3 });
    expect(corridorProfile(pathSpan("tix2u").from)).toEqual({ halfWidth: 4.5, height: 5 });
    expect(corridorProfile(CORRIDOR_END)).toEqual({ halfWidth: 3, height: 5 });
  });

  it("폭은 렌더 단계 경계에서 바뀐다", () => {
    expect(corridorProfile(STAGE_EDGES[0]).halfWidth).toBeCloseTo((2.5 + 4.5) / 2, 10);
  });

  it("2막 받침대가 회랑 벽 안에 들어간다", () => {
    for (const plinth of plinthInstances()) {
      const s = -plinth.position[2];
      const { center, right } = frameAt(s);
      const sideways = (plinth.position[0] - center[0]) * right[0] + (plinth.position[2] - center[2]) * right[2];
      expect(Math.abs(sideways) + plinth.scale[0]).toBeLessThan(corridorProfile(s).halfWidth);
    }
  });
});

describe("회랑 도형", () => {
  const meshes = {
    floor: floorStrip(),
    leftWall: wallStrip(-1),
    rightWall: wallStrip(1),
    hallWall: hallWall(),
    hallFloor: hallFloor(),
    hallRoof: hallRoof(),
  };

  it("정점·법선·UV·인덱스 수가 맞다", () => {
    for (const data of Object.values(meshes)) wellFormed(data);
  });

  it("모든 면이 법선 쪽을 본다(바닥은 위, 벽은 회랑 안쪽, 천장은 아래)", () => {
    for (const [name, data] of Object.entries(meshes)) expect(facesMatchNormals(data), name).toBe(true);
  });

  it("회랑은 입구 뒤에서 시작해 전시실 벽에서 끝난다", () => {
    const floor = meshes.floor;
    expect(floor.uvs[1]).toBeCloseTo(CORRIDOR_START, 10);
    const end = frameAt(CORRIDOR_END).center;
    const center = hallCenter();
    expect(Math.hypot(end[0] - center[0], end[2] - center[2])).toBeCloseTo(HALL.radius, 3);
  });

  it("바닥 UV는 미터 단위다(옆으로 잰 거리, 회랑 거리)", () => {
    const floor = meshes.floor;
    const left = vertex(floor, 0);
    const right = vertex(floor, 1);
    expect(floor.uvs[2] - floor.uvs[0]).toBeCloseTo(Math.hypot(right[0] - left[0], right[2] - left[2]), 4);
  });

  it("전시실 벽은 문 자리를 비운다", () => {
    const wall = meshes.hallWall;
    const arc = wall.uvs[wall.uvs.length - 2];
    // UV는 Float32라 소수 넷째 자리까지 본다
    expect(arc).toBeCloseTo(HALL.radius * (2 * Math.PI - 2 * HALL_DOOR_HALF_ANGLE), 4);
  });
});

describe("회랑 부재", () => {
  it("1막 문틀은 2막으로 넓어지기 전에만 선다(문틀 하나는 기둥 둘과 인방 하나)", () => {
    const ribs = ribInstances();
    expect(ribs.length % 3).toBe(0);
    for (const rib of ribs) expect(-rib.position[2]).toBeLessThan(STAGE_EDGES[0]);
  });

  it("액자는 1막 프로젝트마다 막대 넷이다", () => {
    const act1 = STOPS.filter((stop) => stop.kind === "project" && stop.act === 1);
    expect(wallFrameInstances()).toHaveLength(act1.length * 4);
  });

  it("받침대는 2막 프로젝트 오브젝트 바로 아래다", () => {
    const act2 = STOPS.filter((stop) => stop.kind === "project" && stop.act === 2);
    const plinths = plinthInstances();
    expect(plinths).toHaveLength(act2.length);
    act2.forEach((stop, index) => {
      const focus = focusPoint(stop);
      if (!focus) throw new Error(`${stop.id}에 오브젝트 위치가 없습니다`);
      expect(plinths[index].position[0]).toBe(focus[0]);
      expect(plinths[index].position[2]).toBe(focus[2]);
      expect(plinths[index].position[1] + plinths[index].scale[1] / 2).toBeLessThan(focus[1]);
    });
  });

  it("기둥은 전시실 안에 서고 문 앞을 막지 않으며 천장보다 낮다", () => {
    const center = hallCenter();
    const columns = columnInstances();
    expect(columns.length).toBeGreaterThan(0);
    for (const column of columns) {
      const distance = Math.hypot(column.position[0] - center[0], column.position[2] - center[2]);
      expect(distance).toBeLessThan(HALL.radius);
      expect(column.position[1] + column.scale[1] / 2).toBeLessThan(HALL.height);
      // 문(회랑 끝) 쪽으로 통로 폭 안에 기둥이 없다
      const door = frameAt(CORRIDOR_END).center;
      expect(Math.hypot(column.position[0] - door[0], column.position[2] - door[2])).toBeGreaterThan(3);
    }
  });

  it("단은 전시실 한가운데 바닥 위다", () => {
    const center = hallCenter();
    const dais = daisInstance();
    expect([dais.position[0], dais.position[2]]).toEqual([center[0], center[2]]);
    expect(dais.position[1] - dais.scale[1] / 2).toBeGreaterThanOrEqual(0);
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `rtk proxy npx vitest run src/lib/journey/corridor.test.ts --maxWorkers=4`
Expected: FAIL — `Failed to resolve import "./corridor"`

- [ ] **Step 3: corridor.ts를 만든다**

`src/lib/journey/corridor.ts`:

```ts
import { STAGE_EDGES } from "./stage";
import { STOPS, focusPoint, hallCenter, objectSide, pathPoint, smoothstep, type Vec3 } from "./timeline";

/**
 * 회랑과 전시실의 도형 데이터(스펙 2절 "세 막": 좁고 낮은 회랑 → 넓은 회랑과 전시 구역 → 천장이 열린 원형 전시실).
 * three 없이 정점·법선·UV·인덱스 배열과 인스턴스 자세만 만든다. 장면(scene/Corridor.tsx)이 BufferGeometry로 감싼다.
 * UV는 미터 단위다. 렌더 단계 셰이더가 UV의 정수 눈금마다 청사진 격자선을 긋는다.
 */

export interface MeshData {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  indices: Uint32Array;
}

/** 크기가 1인 상자·원기둥을 늘려 세우는 자리 */
export interface Instance {
  position: Vec3;
  rotationY: number;
  scale: Vec3;
}

interface Profile {
  halfWidth: number;
  height: number;
}

const ACT1: Profile = { halfWidth: 2.5, height: 3 };
const ACT2: Profile = { halfWidth: 4.5, height: 5 };
/** 3막 진입부터 전시실 문까지의 짧은 통로 */
const VESTIBULE: Profile = { halfWidth: 3, height: 5 };
/** 막 경계에서 폭과 높이가 바뀌는 구간의 반(m). 렌더 단계 경계와 같은 자리에서 넓어진다 */
const PROFILE_BLEND = 1.5;
const SAMPLE_STEP = 0.5;

/** 회랑이 시작하는 자리(s). 입구의 카메라(s=0) 뒤로 조금 더 이어진다 */
export const CORRIDOR_START = -3;

export const HALL = {
  radius: 11,
  height: 8,
  /** 천장 가운데 뚫린 구멍의 반지름 */
  oculus: 5,
  columnRadius: 9.6,
} as const;

/** 거리 s에서 회랑의 반폭과 높이 */
export function corridorProfile(s: number): Profile {
  const toAct2 = smoothstep(STAGE_EDGES[0] - PROFILE_BLEND, STAGE_EDGES[0] + PROFILE_BLEND, s);
  const toVestibule = smoothstep(STAGE_EDGES[1] - PROFILE_BLEND, STAGE_EDGES[1] + PROFILE_BLEND, s);
  const mix = (key: keyof Profile) =>
    ACT1[key] + (ACT2[key] - ACT1[key]) * toAct2 + (VESTIBULE[key] - ACT2[key]) * toVestibule;
  return { halfWidth: mix("halfWidth"), height: mix("height") };
}

/** 회랑 바닥 중심과, 걷는 방향 기준 오른쪽을 가리키는 수평 단위 벡터 */
export function frameAt(s: number): { center: Vec3; right: Vec3; tangent: Vec3 } {
  const [x, , z] = pathPoint(s);
  const [x0, , z0] = pathPoint(s - 0.01);
  const [x1, , z1] = pathPoint(s + 0.01);
  const length = Math.hypot(x1 - x0, z1 - z0);
  const tx = (x1 - x0) / length;
  const tz = (z1 - z0) / length;
  return { center: [x, 0, z], right: [-tz, 0, tx], tangent: [tx, 0, tz] };
}

const HALL_CENTER = hallCenter();

function distanceToHall(s: number): number {
  const { center } = frameAt(s);
  return Math.hypot(center[0] - HALL_CENTER[0], center[2] - HALL_CENTER[2]);
}

/** 회랑이 전시실 벽에 닿는 자리(s). 이분법으로 찾는다 */
export const CORRIDOR_END = (() => {
  let low = STAGE_EDGES[1];
  let high = STAGE_EDGES[1] + 2 * HALL.radius;
  for (let i = 0; i < 40; i++) {
    const mid = (low + high) / 2;
    if (distanceToHall(mid) > HALL.radius) low = mid;
    else high = mid;
  }
  return high;
})();

/** 전시실 중심에서 문(회랑이 들어오는 쪽)을 향한 각도. 방향은 (sin θ, cos θ)다 */
export const HALL_DOOR_ANGLE = (() => {
  const { center } = frameAt(CORRIDOR_END);
  return Math.atan2(center[0] - HALL_CENTER[0], center[2] - HALL_CENTER[2]);
})();

/** 문 너비의 반(라디안). 통로 폭이 그대로 들어온다 */
export const HALL_DOOR_HALF_ANGLE = Math.asin(VESTIBULE.halfWidth / HALL.radius);

/** 회랑 띠가 전시실 바닥 안으로 조금 들어가 이음매가 벌어지지 않게 한다 */
const CORRIDOR_OVERLAP = 0.3;

function samples(): number[] {
  const end = CORRIDOR_END + CORRIDOR_OVERLAP;
  const list: number[] = [];
  for (let s = CORRIDOR_START; s < end; s += SAMPLE_STEP) list.push(s);
  list.push(end);
  return list;
}

class MeshBuilder {
  private positions: number[] = [];
  private normals: number[] = [];
  private uvs: number[] = [];
  private indices: number[] = [];

  vertex(position: Vec3, normal: Vec3, uv: [number, number]): number {
    this.positions.push(...position);
    this.normals.push(...normal);
    this.uvs.push(...uv);
    return this.positions.length / 3 - 1;
  }

  triangle(a: number, b: number, c: number): void {
    this.indices.push(a, b, c);
  }

  build(): MeshData {
    return {
      positions: new Float32Array(this.positions),
      normals: new Float32Array(this.normals),
      uvs: new Float32Array(this.uvs),
      indices: new Uint32Array(this.indices),
    };
  }
}

function offset(point: Vec3, direction: Vec3, distance: number, y = point[1]): Vec3 {
  return [point[0] + direction[0] * distance, y, point[2] + direction[2] * distance];
}

/** 회랑 바닥. UV는 (중심에서 옆으로 떨어진 거리, s) */
export function floorStrip(): MeshData {
  const mesh = new MeshBuilder();
  const up: Vec3 = [0, 1, 0];
  let previous: [number, number] | null = null;
  for (const s of samples()) {
    const { center, right } = frameAt(s);
    const { halfWidth } = corridorProfile(s);
    const left = mesh.vertex(offset(center, right, -halfWidth), up, [-halfWidth, s]);
    const rightIndex = mesh.vertex(offset(center, right, halfWidth), up, [halfWidth, s]);
    if (previous) {
      const [l0, r0] = previous;
      mesh.triangle(l0, r0, left);
      mesh.triangle(r0, rightIndex, left);
    }
    previous = [left, rightIndex];
  }
  return mesh.build();
}

/** 회랑 벽. side는 걷는 방향 기준 왼쪽(-1)·오른쪽(1)이고, 면은 회랑 안쪽을 본다. UV는 (s, 높이) */
export function wallStrip(side: -1 | 1): MeshData {
  const mesh = new MeshBuilder();
  let previous: [number, number] | null = null;
  for (const s of samples()) {
    const { center, right } = frameAt(s);
    const { halfWidth, height } = corridorProfile(s);
    const base = offset(center, right, side * halfWidth);
    const inward: Vec3 = [-side * right[0], 0, -side * right[2]];
    const bottom = mesh.vertex(base, inward, [s, 0]);
    const top = mesh.vertex([base[0], height, base[2]], inward, [s, height]);
    if (previous) {
      const [b0, t0] = previous;
      if (side === 1) {
        mesh.triangle(b0, t0, bottom);
        mesh.triangle(t0, top, bottom);
      } else {
        mesh.triangle(b0, bottom, t0);
        mesh.triangle(t0, bottom, top);
      }
    }
    previous = [bottom, top];
  }
  return mesh.build();
}

function direction(angle: number): Vec3 {
  return [Math.sin(angle), 0, Math.cos(angle)];
}

const HALL_SEGMENTS = 72;

/** 전시실 둥근 벽(문 자리는 비운다). 면은 안쪽을 본다. UV는 (벽을 따라 잰 거리, 높이) */
export function hallWall(): MeshData {
  const mesh = new MeshBuilder();
  const start = HALL_DOOR_ANGLE + HALL_DOOR_HALF_ANGLE;
  const sweep = 2 * Math.PI - 2 * HALL_DOOR_HALF_ANGLE;
  let previous: [number, number] | null = null;
  for (let j = 0; j <= HALL_SEGMENTS; j++) {
    const angle = start + (sweep * j) / HALL_SEGMENTS;
    const out = direction(angle);
    const inward: Vec3 = [-out[0], 0, -out[2]];
    const base = offset(HALL_CENTER, out, HALL.radius);
    const arc = HALL.radius * (angle - start);
    const bottom = mesh.vertex(base, inward, [arc, 0]);
    const top = mesh.vertex([base[0], HALL.height, base[2]], inward, [arc, HALL.height]);
    if (previous) {
      const [b0, t0] = previous;
      mesh.triangle(b0, t0, bottom);
      mesh.triangle(t0, top, bottom);
    }
    previous = [bottom, top];
  }
  return mesh.build();
}

/** 전시실 바닥. 회랑 바닥과 겹치는 문턱에서 깜빡이지 않게 1cm 높다. UV는 중심에서 잰 (x, z) */
export function hallFloor(): MeshData {
  const mesh = new MeshBuilder();
  const up: Vec3 = [0, 1, 0];
  const y = 0.01;
  const center = mesh.vertex([HALL_CENTER[0], y, HALL_CENTER[2]], up, [0, 0]);
  const rim: number[] = [];
  for (let j = 0; j < HALL_SEGMENTS; j++) {
    const out = direction((2 * Math.PI * j) / HALL_SEGMENTS);
    const point = offset(HALL_CENTER, out, HALL.radius, y);
    rim.push(mesh.vertex(point, up, [point[0] - HALL_CENTER[0], point[2] - HALL_CENTER[2]]));
  }
  for (let j = 0; j < HALL_SEGMENTS; j++) mesh.triangle(center, rim[j], rim[(j + 1) % HALL_SEGMENTS]);
  return mesh.build();
}

/** 가운데가 뚫린 고리 천장. 아래(전시실 안)를 본다. 위에서 내려다보는 엔딩에서도 보이도록 장면이 양면으로 그린다 */
export function hallRoof(): MeshData {
  const mesh = new MeshBuilder();
  const down: Vec3 = [0, -1, 0];
  const outer = HALL.radius + 0.3;
  const inner: number[] = [];
  const rim: number[] = [];
  for (let j = 0; j < HALL_SEGMENTS; j++) {
    const out = direction((2 * Math.PI * j) / HALL_SEGMENTS);
    const a = offset(HALL_CENTER, out, HALL.oculus, HALL.height);
    const b = offset(HALL_CENTER, out, outer, HALL.height);
    inner.push(mesh.vertex(a, down, [a[0] - HALL_CENTER[0], a[2] - HALL_CENTER[2]]));
    rim.push(mesh.vertex(b, down, [b[0] - HALL_CENTER[0], b[2] - HALL_CENTER[2]]));
  }
  for (let j = 0; j < HALL_SEGMENTS; j++) {
    const next = (j + 1) % HALL_SEGMENTS;
    mesh.triangle(inner[j], inner[next], rim[j]);
    mesh.triangle(rim[j], inner[next], rim[next]);
  }
  return mesh.build();
}

const RIB_THICKNESS = 0.08;
const RIB_SPACING = 2;
const LINTEL_HEIGHT = 2.7;

/** 상자의 x축을 수평 방향 axis에 맞추는 y축 회전 */
function yawAlong(axis: Vec3): number {
  return Math.atan2(-axis[2], axis[0]);
}

/** 1막의 낮은 문틀(기둥 둘과 인방 하나). 2막으로 넓어지기 전까지 RIB_SPACING마다 선다 */
export function ribInstances(): Instance[] {
  const list: Instance[] = [];
  const last = STAGE_EDGES[0] - PROFILE_BLEND - 0.5;
  for (let s = 1; s <= last; s += RIB_SPACING) {
    const { center, right } = frameAt(s);
    const { halfWidth } = corridorProfile(s);
    const yaw = yawAlong(right);
    const inset = halfWidth - RIB_THICKNESS / 2;
    for (const side of [-1, 1]) {
      list.push({
        position: offset(center, right, side * inset, LINTEL_HEIGHT / 2),
        rotationY: yaw,
        scale: [RIB_THICKNESS, LINTEL_HEIGHT, RIB_THICKNESS],
      });
    }
    list.push({
      position: offset(center, right, 0, LINTEL_HEIGHT + RIB_THICKNESS / 2),
      rotationY: yaw,
      scale: [2 * halfWidth, RIB_THICKNESS, RIB_THICKNESS],
    });
  }
  return list;
}

const FRAME_SIZE = 1.6;
const FRAME_BAR = 0.06;
const FRAME_CENTER_HEIGHT = 1.3;

/** 1막 프로젝트 오브젝트 뒤 벽에 걸린 액자(막대 넷). 지나가며 보는 벽면 전시다 */
export function wallFrameInstances(): Instance[] {
  const list: Instance[] = [];
  for (const stop of STOPS) {
    if (stop.kind !== "project" || stop.act !== 1) continue;
    const focus = focusPoint(stop);
    if (!focus) continue;
    const s = -focus[2];
    const { center, right, tangent } = frameAt(s);
    const { halfWidth } = corridorProfile(s);
    const middle = offset(center, right, objectSide(stop) * (halfWidth - 0.04), FRAME_CENTER_HEIGHT);
    const yaw = yawAlong(tangent);
    const half = FRAME_SIZE / 2;
    const span = FRAME_SIZE + FRAME_BAR;
    list.push({ position: [middle[0], middle[1] + half, middle[2]], rotationY: yaw, scale: [span, FRAME_BAR, 0.04] });
    list.push({ position: [middle[0], middle[1] - half, middle[2]], rotationY: yaw, scale: [span, FRAME_BAR, 0.04] });
    list.push({ position: offset(middle, tangent, half), rotationY: yaw, scale: [FRAME_BAR, FRAME_SIZE, 0.04] });
    list.push({ position: offset(middle, tangent, -half), rotationY: yaw, scale: [FRAME_BAR, FRAME_SIZE, 0.04] });
  }
  return list;
}

const PLINTH = { radius: 0.7, height: 0.8 } as const;

/** 2막 전시 구역의 받침대. 오브젝트(focusPoint) 바로 아래에 선다 */
export function plinthInstances(): Instance[] {
  const list: Instance[] = [];
  for (const stop of STOPS) {
    if (stop.kind !== "project" || stop.act !== 2) continue;
    const focus = focusPoint(stop);
    if (!focus) continue;
    list.push({
      position: [focus[0], PLINTH.height / 2, focus[2]],
      rotationY: 0,
      scale: [PLINTH.radius, PLINTH.height, PLINTH.radius],
    });
  }
  return list;
}

const COLUMN_RADIUS = 0.35;
const COLUMN_COUNT = 12;

/** 전시실 둘레의 기둥. 문 앞은 비운다 */
export function columnInstances(): Instance[] {
  const list: Instance[] = [];
  for (let j = 0; j < COLUMN_COUNT; j++) {
    const angle = HALL_DOOR_ANGLE + Math.PI / COLUMN_COUNT + (2 * Math.PI * j) / COLUMN_COUNT;
    const fromDoor = Math.abs(Math.atan2(Math.sin(angle - HALL_DOOR_ANGLE), Math.cos(angle - HALL_DOOR_ANGLE)));
    if (fromDoor < HALL_DOOR_HALF_ANGLE + 0.2) continue;
    list.push({
      position: offset(HALL_CENTER, direction(angle), HALL.columnRadius, (HALL.height - 0.05) / 2),
      rotationY: 0,
      // 천장 고리와 윗면이 겹쳐 깜빡이지 않게 조금 낮다
      scale: [COLUMN_RADIUS, HALL.height - 0.05, COLUMN_RADIUS],
    });
  }
  return list;
}

/** 전시실 가운데 낮은 단. PiCKCARE 오브젝트가 그 위에 뜬다 */
export function daisInstance(): Instance {
  const height = 0.25;
  return { position: [HALL_CENTER[0], 0.01 + height / 2, HALL_CENTER[2]], rotationY: 0, scale: [2.6, height, 2.6] };
}
```

- [ ] **Step 4: 통과를 확인한다**

Run: `rtk proxy npx vitest run src/lib/journey/corridor.test.ts --maxWorkers=4`
Expected: 13 passed

Run: `rtk proxy npx vitest run --maxWorkers=4`
Expected: 180 passed

Run: `rtk proxy npm run typecheck`
Expected: exit 0

- [ ] **Step 5: 변경 정리와 커밋 메시지 초안 제출**

| 파일 | 변경 |
|---|---|
| `src/lib/journey/corridor.ts`, `corridor.test.ts` | 회랑·전시실 도형 데이터, 문틀·액자·받침대·기둥·단 자리 |

```
feat: 여정 회랑과 원형 전시실 도형 데이터

- 막마다 공간이 커지는 것(좁은 회랑 → 넓은 회랑과 전시 구역 → 천장이 열린 전시실)만으로 성장 서사가 전달되게 한다
- three 없이 배열만 만들어 면 방향(감기 순서)까지 단위 테스트로 검사한다. 뒤집힌 면은 화면에서 사라져 눈으로 찾기 어렵다
- UV를 미터 단위로 두어 렌더 단계 셰이더가 1m 청사진 격자와 2m 이음선을 그대로 긋는다
```

---

### Task 4: 렌더 단계 재질

모든 3D 부재가 쓰는 재질이다. `MeshStandardMaterial`의 셰이더에 단계 계산을 넣는다. 청사진(남색 면 + 1m 격자의 빛나는 선), 클레이(무광 회색 + 2m 이음선), 완성품(재질별 색·거칠기·금속성 + 환경 반사)을 경계 노이즈를 따라 섞고, 경계에는 빛나는 선이 흐른다. 시제품에서 SwiftShader 컴파일과 생김새를 확인한 코드다.

**Files:**
- Create: `src/components/journey/scene/stageMaterial.ts`, `src/components/journey/scene/stageMaterial.test.ts`, `src/components/journey/scene/StageTime.tsx`

**Interfaces:**
- Consumes: `stage.ts`의 `STAGE_EDGES`·`STAGE_EDGE_SOFTNESS`·`STAGE_GLOW_WIDTH`·`STAGE_NOISE`
- Produces: `interface StageLook { color: string; roughness: number; metalness: number; solidLine?: boolean; side?: Side }`, `stageUniforms = { uJourneyTime: { value: number } }`, `createStageMaterial(look): MeshStandardMaterial`(프로그램 키 `"journey-stage"`), `StageTime` 컴포넌트

- [ ] **Step 1: 테스트를 쓴다**

`src/components/journey/scene/stageMaterial.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { DoubleSide, ShaderLib, type WebGLProgramParametersWithUniforms, type WebGLRenderer } from "three";
import { createStageMaterial, stageUniforms } from "./stageMaterial";

/** three가 프로그램을 만들 때 onBeforeCompile에 넘기는 값을 표준 재질 셰이더로 흉내 낸다 */
function compile(material: ReturnType<typeof createStageMaterial>): WebGLProgramParametersWithUniforms {
  const shader = {
    vertexShader: ShaderLib.standard.vertexShader,
    fragmentShader: ShaderLib.standard.fragmentShader,
    uniforms: {},
  } as unknown as WebGLProgramParametersWithUniforms;
  material.onBeforeCompile(shader, {} as WebGLRenderer);
  return shader;
}

describe("렌더 단계 재질", () => {
  it("three 표준 셰이더의 주입 지점을 모두 찾아 단계 계산을 넣는다", () => {
    const shader = compile(createStageMaterial({ color: "#ffffff", roughness: 0.5, metalness: 0 }));
    expect(shader.vertexShader).toContain("vJourneyWorld = ( modelMatrix * journeyWorld ).xyz;");
    for (const piece of [
      "#define STAGE_EDGE_0 19.0",
      "#define STAGE_EDGE_1 33.0",
      "diffuseColor.rgb = mix(",
      "roughnessFactor = mix(",
      "metalnessFactor = uFinalMetalness",
      "totalEmissiveRadiance += uWireLine",
      "radiance *= journeyClayToFinal;",
    ]) {
      expect(shader.fragmentShader).toContain(piece);
    }
    // 원래 chunk는 지우지 않고 그 뒤에 덧붙인다
    expect(shader.fragmentShader).toContain("#include <lights_fragment_maps>");
  });

  it("재질마다 완성 단계 값을 uniform으로 넘긴다", () => {
    const shader = compile(createStageMaterial({ color: "#ff0000", roughness: 0.3, metalness: 1, solidLine: true }));
    const uniforms = shader.uniforms as Record<string, { value: unknown }>;
    expect(uniforms.uFinalRoughness.value).toBe(0.3);
    expect(uniforms.uFinalMetalness.value).toBe(1);
    expect(uniforms.uSolidLine.value).toBe(1);
  });

  it("시간 uniform은 모든 재질이 같은 객체를 본다", () => {
    const a = compile(createStageMaterial({ color: "#ffffff", roughness: 1, metalness: 0 }));
    const b = compile(createStageMaterial({ color: "#000000", roughness: 1, metalness: 0 }));
    expect(a.uniforms.uJourneyTime).toBe(stageUniforms.uJourneyTime);
    expect(b.uniforms.uJourneyTime).toBe(stageUniforms.uJourneyTime);
  });

  it("모든 재질이 셰이더 프로그램 하나를 같이 쓴다", () => {
    const a = createStageMaterial({ color: "#ffffff", roughness: 1, metalness: 0 });
    const b = createStageMaterial({ color: "#000000", roughness: 0.2, metalness: 1, side: DoubleSide });
    expect(a.customProgramCacheKey()).toBe(b.customProgramCacheKey());
    expect(b.side).toBe(DoubleSide);
  });
});
```

three의 `ShaderLib.standard`는 `#include` 지시문이 풀리기 전 셰이더라 주입 지점(`#include <color_fragment>` 등)을 그대로 찾을 수 있다. 첫 테스트는 three를 올렸을 때 주입 지점이 사라지면 깨진다.

- [ ] **Step 2: 실패를 확인한다**

Run: `rtk proxy npx vitest run src/components/journey/scene/stageMaterial.test.ts --maxWorkers=4`
Expected: FAIL — `Failed to resolve import "./stageMaterial"`

- [ ] **Step 3: 재질과 시간 컴포넌트를 만든다**

`src/components/journey/scene/stageMaterial.ts`:

```ts
import { Color, FrontSide, MeshStandardMaterial, type Side, type WebGLProgramParametersWithUniforms } from "three";
import { STAGE_EDGES, STAGE_EDGE_SOFTNESS, STAGE_GLOW_WIDTH, STAGE_NOISE } from "@/lib/journey/stage";

/**
 * 렌더 단계 재질(스펙 3절). MeshStandardMaterial에 onBeforeCompile로 단계 계산을 넣는다.
 * 면마다 월드 z에서 회랑 거리 s(= −z)를 구하고, lib/journey/stage.ts의 경계에서 청사진 → 클레이 → 완성품으로 바꾼다.
 * 청사진은 남색 면 위에 UV 1m 눈금마다 빛나는 선, 클레이는 무광 회색, 완성품은 재질마다 정한 색·거칠기·금속성과 환경 반사다.
 * 경계에는 노이즈를 따라 빛나는 선이 흐른다. 모든 재질이 같은 셰이더 글자를 써서 프로그램 하나를 같이 쓴다.
 */

export interface StageLook {
  /** 완성 단계의 색 */
  color: string;
  roughness: number;
  metalness: number;
  /** 가는 부재(문틀·액자)는 청사진 단계에서 면 전체가 선처럼 빛난다 */
  solidLine?: boolean;
  side?: Side;
}

/** 모든 단계 재질이 같은 객체를 본다. 장면이 매 프레임 한 번 바꾸면 전부에 반영된다 */
export const stageUniforms = {
  uJourneyTime: { value: 0 },
};

const WIRE_FILL = new Color("#0c2244");
const WIRE_LINE = new Color("#66c6ff").multiplyScalar(2.4);
const CLAY = new Color("#b9b6b0");
const GLOW = new Color("#d8f6ff").multiplyScalar(4);

function glslFloat(value: number): string {
  return Number.isInteger(value) ? `${value}.0` : `${value}`;
}

const VERTEX_PARS = /* glsl */ `#include <common>
varying vec3 vJourneyWorld;
varying vec2 vJourneyUv;`;

const VERTEX_WORLD = /* glsl */ `#include <project_vertex>
vec4 journeyWorld = vec4( transformed, 1.0 );
#ifdef USE_INSTANCING
  journeyWorld = instanceMatrix * journeyWorld;
#endif
vJourneyWorld = ( modelMatrix * journeyWorld ).xyz;
vJourneyUv = uv;`;

const FRAGMENT_PARS = /* glsl */ `#include <common>
#define STAGE_EDGE_0 ${glslFloat(STAGE_EDGES[0])}
#define STAGE_EDGE_1 ${glslFloat(STAGE_EDGES[1])}
#define STAGE_EDGE_SOFTNESS ${glslFloat(STAGE_EDGE_SOFTNESS)}
#define STAGE_GLOW_WIDTH ${glslFloat(STAGE_GLOW_WIDTH)}
#define STAGE_NOISE_SCALE ${glslFloat(STAGE_NOISE.scale)}
#define STAGE_NOISE_AMPLITUDE ${glslFloat(STAGE_NOISE.amplitude)}
#define STAGE_NOISE_SPEED ${glslFloat(STAGE_NOISE.speed)}
#define JOURNEY_SEAM 2.0
varying vec3 vJourneyWorld;
varying vec2 vJourneyUv;
uniform float uJourneyTime;
uniform vec3 uFinalColor;
uniform float uFinalRoughness;
uniform float uFinalMetalness;
uniform float uSolidLine;
uniform vec3 uWireFill;
uniform vec3 uWireLine;
uniform vec3 uClay;
uniform vec3 uGlow;

float journeyHash( vec3 p ) {
  p = fract( p * 0.3183099 + 0.1 );
  p *= 17.0;
  return fract( p.x * p.y * p.z * ( p.x + p.y + p.z ) );
}

float journeyNoise( vec3 x ) {
  vec3 i = floor( x );
  vec3 f = fract( x );
  f = f * f * ( 3.0 - 2.0 * f );
  return mix(
    mix( mix( journeyHash( i ), journeyHash( i + vec3( 1.0, 0.0, 0.0 ) ), f.x ),
         mix( journeyHash( i + vec3( 0.0, 1.0, 0.0 ) ), journeyHash( i + vec3( 1.0, 1.0, 0.0 ) ), f.x ), f.y ),
    mix( mix( journeyHash( i + vec3( 0.0, 0.0, 1.0 ) ), journeyHash( i + vec3( 1.0, 0.0, 1.0 ) ), f.x ),
         mix( journeyHash( i + vec3( 0.0, 1.0, 1.0 ) ), journeyHash( i + vec3( 1.0, 1.0, 1.0 ) ), f.x ), f.y ),
    f.z );
}`;

const FRAGMENT_STAGE = /* glsl */ `#include <color_fragment>
float journeyNoiseValue = journeyNoise( vJourneyWorld * STAGE_NOISE_SCALE + vec3( 0.0, uJourneyTime * STAGE_NOISE_SPEED, 0.0 ) );
float journeyEdge = - vJourneyWorld.z + ( journeyNoiseValue * 2.0 - 1.0 ) * STAGE_NOISE_AMPLITUDE;
float journeyWireToClay = smoothstep( STAGE_EDGE_0 - STAGE_EDGE_SOFTNESS, STAGE_EDGE_0 + STAGE_EDGE_SOFTNESS, journeyEdge );
float journeyClayToFinal = smoothstep( STAGE_EDGE_1 - STAGE_EDGE_SOFTNESS, STAGE_EDGE_1 + STAGE_EDGE_SOFTNESS, journeyEdge );
float journeyGlowWidth = STAGE_GLOW_WIDTH + fwidth( journeyEdge );
float journeyGlow = 1.0 - smoothstep( 0.0, journeyGlowWidth, abs( journeyEdge - STAGE_EDGE_0 ) );
journeyGlow += 1.0 - smoothstep( 0.0, journeyGlowWidth, abs( journeyEdge - STAGE_EDGE_1 ) );
vec2 journeyCellWidth = max( fwidth( vJourneyUv ), vec2( 1e-4 ) );
vec2 journeyCell = abs( fract( vJourneyUv - 0.5 ) - 0.5 ) / journeyCellWidth;
float journeyLine = 1.0 - min( min( journeyCell.x, journeyCell.y ), 1.0 );
journeyLine *= 1.0 - smoothstep( 0.2, 0.45, max( journeyCellWidth.x, journeyCellWidth.y ) );
journeyLine = max( journeyLine, uSolidLine );
vec2 journeySeamUv = vJourneyUv / JOURNEY_SEAM;
vec2 journeySeamCell = abs( fract( journeySeamUv - 0.5 ) - 0.5 ) / max( fwidth( journeySeamUv ), vec2( 1e-4 ) );
float journeySeam = ( 1.0 - min( min( journeySeamCell.x, journeySeamCell.y ), 1.0 ) ) * ( 1.0 - uSolidLine );
diffuseColor.rgb = mix( mix( uWireFill, uClay, journeyWireToClay ), uFinalColor, journeyClayToFinal );
diffuseColor.rgb *= 1.0 - 0.14 * journeySeam * journeyWireToClay;`;

const FRAGMENT_ROUGHNESS = /* glsl */ `#include <roughnessmap_fragment>
roughnessFactor = mix( mix( 1.0, 0.9, journeyWireToClay ), uFinalRoughness, journeyClayToFinal );`;

const FRAGMENT_METALNESS = /* glsl */ `#include <metalnessmap_fragment>
metalnessFactor = uFinalMetalness * journeyClayToFinal;`;

const FRAGMENT_EMISSIVE = /* glsl */ `#include <emissivemap_fragment>
totalEmissiveRadiance += uWireLine * journeyLine * ( 1.0 - journeyWireToClay ) + uGlow * journeyGlow;`;

// 환경 반사(Lightformer)는 완성품 단계에만 비친다.
const FRAGMENT_ENVIRONMENT = /* glsl */ `#include <lights_fragment_maps>
#if defined( RE_IndirectDiffuse )
  iblIrradiance *= journeyClayToFinal;
#endif
#if defined( RE_IndirectSpecular )
  radiance *= journeyClayToFinal;
#endif`;

function replaceOnce(source: string, anchor: string, replacement: string): string {
  if (!source.includes(anchor)) throw new Error(`three 셰이더에 주입 지점이 없습니다: ${anchor}`);
  return source.replace(anchor, replacement);
}

export function createStageMaterial(look: StageLook): MeshStandardMaterial {
  const material = new MeshStandardMaterial({ side: look.side ?? FrontSide });
  const uniforms = {
    uFinalColor: { value: new Color(look.color) },
    uFinalRoughness: { value: look.roughness },
    uFinalMetalness: { value: look.metalness },
    uSolidLine: { value: look.solidLine ? 1 : 0 },
    uWireFill: { value: WIRE_FILL },
    uWireLine: { value: WIRE_LINE },
    uClay: { value: CLAY },
    uGlow: { value: GLOW },
  };
  material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    Object.assign(shader.uniforms, stageUniforms, uniforms);
    shader.vertexShader = replaceOnce(
      replaceOnce(shader.vertexShader, "#include <common>", VERTEX_PARS),
      "#include <project_vertex>",
      VERTEX_WORLD,
    );
    let fragment = shader.fragmentShader;
    fragment = replaceOnce(fragment, "#include <common>", FRAGMENT_PARS);
    fragment = replaceOnce(fragment, "#include <color_fragment>", FRAGMENT_STAGE);
    fragment = replaceOnce(fragment, "#include <roughnessmap_fragment>", FRAGMENT_ROUGHNESS);
    fragment = replaceOnce(fragment, "#include <metalnessmap_fragment>", FRAGMENT_METALNESS);
    fragment = replaceOnce(fragment, "#include <emissivemap_fragment>", FRAGMENT_EMISSIVE);
    fragment = replaceOnce(fragment, "#include <lights_fragment_maps>", FRAGMENT_ENVIRONMENT);
    shader.fragmentShader = fragment;
  };
  // 셰이더 글자가 재질마다 같으므로 프로그램 하나를 같이 쓴다. 재질마다 다른 값은 uniform으로만 넘긴다.
  material.customProgramCacheKey = () => "journey-stage";
  return material;
}
```

`src/components/journey/scene/StageTime.tsx`(2-1 Task 7 이월: 첫 delta가 수십 초라 누적값은 잘라야 한다):

```tsx
"use client";

import { useFrame } from "@react-three/fiber";
import { stageUniforms } from "./stageMaterial";

/** 첫 프레임의 delta는 페이지를 연 뒤 지난 시간(수십 초)이다. 한 프레임에 이만큼까지만 더해 노이즈가 건너뛰지 않게 한다 */
const MAX_DELTA = 0.1;

/** 렌더 단계 경계의 노이즈를 흐르게 하는 시간. 모든 단계 재질이 같은 uniform을 본다 */
export function StageTime() {
  useFrame((_, delta) => {
    stageUniforms.uJourneyTime.value += Math.min(delta, MAX_DELTA);
  });
  return null;
}
```

- [ ] **Step 4: 통과를 확인한다**

Run: `rtk proxy npx vitest run src/components/journey/scene/stageMaterial.test.ts --maxWorkers=4`
Expected: 4 passed

Run: `rtk proxy npx vitest run --maxWorkers=4`
Expected: 184 passed

Run: `rtk proxy npm run typecheck` 그리고 `rtk proxy npx eslint src/components/journey/scene`
Expected: 둘 다 exit 0

- [ ] **Step 5: 변경 정리와 커밋 메시지 초안 제출**

| 파일 | 변경 |
|---|---|
| `src/components/journey/scene/stageMaterial.ts`, `stageMaterial.test.ts` | 렌더 단계 재질과 공유 시간 uniform |
| `src/components/journey/scene/StageTime.tsx` | 경계 노이즈 시간 진행(첫 delta 자름) |

```
feat: 여정 렌더 단계 셰이더 재질

- 청사진 → 클레이 → 완성품을 재질 하나가 위치에 따라 그려, 회랑과 오브젝트가 막의 단계를 따로 맞추지 않아도 된다
- 셰이더 글자를 재질마다 같게 두고 값은 uniform으로만 넘겨 프로그램 하나를 같이 쓴다. 사전 컴파일할 프로그램이 셋으로 준다
- three를 올렸을 때 주입 지점이 바뀌면 화면이 아니라 단위 테스트에서 바로 드러나게 한다
- 첫 프레임의 delta는 페이지를 연 뒤 지난 시간이라 그대로 더하면 노이즈가 건너뛴다
```

---

### Task 5: 회랑 장면

도형 데이터와 렌더 단계 재질로 회랑을 장면에 올리고 임시 도형을 지운다. 조명은 Task 6에서 들어오므로 이 태스크가 끝나면 청사진 선만 빛나고 2·3막은 어둡다(정상).

**Files:**
- Create: `src/components/journey/scene/buildCorridor.ts`, `src/components/journey/scene/buildCorridor.test.ts`, `src/components/journey/scene/Corridor.tsx`
- Modify: `src/components/journey/scene/Scene.tsx`, `e2e/journey.e2e.ts`
- Delete: `src/components/journey/scene/PlaceholderCorridor.tsx`

**Interfaces:**
- Consumes: `corridor.ts`의 도형 함수, `createStageMaterial`, `StageTime`
- Produces: `LOOKS`(완성품 재질 값), `buildCorridor(): Group`, `disposeCorridor(group)`, `Corridor` 컴포넌트

- [ ] **Step 1: 테스트를 쓴다**

`src/components/journey/scene/buildCorridor.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { InstancedMesh, Mesh, type Material } from "three";
import { columnInstances, plinthInstances, ribInstances, wallFrameInstances } from "@/lib/journey/corridor";
import { buildCorridor, disposeCorridor } from "./buildCorridor";

function meshes(group: ReturnType<typeof buildCorridor>): Mesh[] {
  const list: Mesh[] = [];
  group.traverse((object) => {
    if (object instanceof Mesh) list.push(object);
  });
  return list;
}

describe("회랑 장면 객체", () => {
  it("모든 부재가 렌더 단계 재질로 그려진다", () => {
    const all = meshes(buildCorridor());
    expect(all).toHaveLength(9);
    for (const mesh of all) expect((mesh.material as Material).customProgramCacheKey()).toBe("journey-stage");
  });

  it("문틀·액자, 받침대·기둥, 단을 인스턴스로 한 번씩 그린다", () => {
    const counts = meshes(buildCorridor())
      .filter((mesh): mesh is InstancedMesh => mesh instanceof InstancedMesh)
      .map((mesh) => mesh.count);
    expect(counts).toEqual([
      ribInstances().length + wallFrameInstances().length,
      plinthInstances().length + columnInstances().length,
      1,
    ]);
  });

  it("떠날 때 모든 도형과 재질을 놓는다", () => {
    const group = buildCorridor();
    const disposed = new Set<unknown>();
    for (const mesh of meshes(group)) {
      mesh.geometry.addEventListener("dispose", () => disposed.add(mesh.geometry));
      (mesh.material as Material).addEventListener("dispose", () => disposed.add(mesh.material));
    }
    disposeCorridor(group);
    for (const mesh of meshes(group)) {
      expect(disposed.has(mesh.geometry)).toBe(true);
      expect(disposed.has(mesh.material)).toBe(true);
    }
  });
});
```

번들 경계 e2e(스펙 7절 "다른 페이지: /journey의 3D 코드가 다른 페이지 번들에 들어가지 않는다")를 `e2e/journey.e2e.ts` 끝에 붙인다. 표지 글자는 렌더 단계 재질의 프로그램 키 `"journey-stage"`다:

```ts
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
```

- [ ] **Step 2: 실패를 확인한다**

Run: `rtk proxy npx vitest run src/components/journey/scene/buildCorridor.test.ts --maxWorkers=4`
Expected: FAIL — `Failed to resolve import "./buildCorridor"`

- [ ] **Step 3: 장면 객체와 컴포넌트를 만든다**

`src/components/journey/scene/buildCorridor.ts`:

```ts
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  Quaternion,
  Vector3,
  type Material,
} from "three";
import {
  columnInstances,
  daisInstance,
  floorStrip,
  hallFloor,
  hallRoof,
  hallWall,
  plinthInstances,
  ribInstances,
  wallFrameInstances,
  wallStrip,
  type Instance,
  type MeshData,
} from "@/lib/journey/corridor";
import { createStageMaterial, type StageLook } from "./stageMaterial";

/** 완성품 단계(3막)의 재질. 1막·2막에 선 부재는 렌더 단계 셰이더가 청사진·클레이로 그린다 */
export const LOOKS = {
  floor: { color: "#c2b8a6", roughness: 0.4, metalness: 0 },
  wall: { color: "#efe7da", roughness: 0.85, metalness: 0 },
  /** 전시실 벽은 양면이다. 회랑에서 바깥 면이 보여야 전시실 안이 벽 너머로 미리 보이지 않는다 */
  hallWall: { color: "#efe7da", roughness: 0.85, metalness: 0, side: DoubleSide },
  /** 고리 천장은 전시실 안(아래)과 엔딩(위)에서 모두 보인다 */
  roof: { color: "#e6dccb", roughness: 0.8, metalness: 0, side: DoubleSide },
  /** 문틀·액자. 청사진 단계에서 면 전체가 선처럼 빛난다 */
  trim: { color: "#d8c9ae", roughness: 0.6, metalness: 0, solidLine: true },
  stone: { color: "#d8c9ae", roughness: 0.55, metalness: 0 },
  accent: { color: "#c46a43", roughness: 0.55, metalness: 0 },
} satisfies Record<string, StageLook>;

function geometryOf(data: MeshData): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(data.positions, 3));
  geometry.setAttribute("normal", new BufferAttribute(data.normals, 3));
  geometry.setAttribute("uv", new BufferAttribute(data.uvs, 2));
  geometry.setIndex(new BufferAttribute(data.indices, 1));
  return geometry;
}

const UP = new Vector3(0, 1, 0);

function instanced(geometry: BufferGeometry, material: Material, list: Instance[]): InstancedMesh {
  const mesh = new InstancedMesh(geometry, material, list.length);
  const matrix = new Matrix4();
  const rotation = new Quaternion();
  const position = new Vector3();
  const scale = new Vector3();
  list.forEach((item, index) => {
    rotation.setFromAxisAngle(UP, item.rotationY);
    matrix.compose(position.set(...item.position), rotation, scale.set(...item.scale));
    mesh.setMatrixAt(index, matrix);
  });
  return mesh;
}

/** 회랑과 전시실 전체. 장면이 한 번 만들어 그리고, 떠날 때 disposeCorridor로 GPU 자원을 놓는다 */
export function buildCorridor(): Group {
  const materials = {
    floor: createStageMaterial(LOOKS.floor),
    wall: createStageMaterial(LOOKS.wall),
    hallWall: createStageMaterial(LOOKS.hallWall),
    roof: createStageMaterial(LOOKS.roof),
    trim: createStageMaterial(LOOKS.trim),
    stone: createStageMaterial(LOOKS.stone),
    accent: createStageMaterial(LOOKS.accent),
  };
  // 크기 1인 상자·원기둥을 인스턴스마다 늘려 세운다
  const box = new BoxGeometry(1, 1, 1);
  const cylinder = new CylinderGeometry(1, 1, 1, 32);
  const group = new Group();
  group.add(
    new Mesh(geometryOf(floorStrip()), materials.floor),
    new Mesh(geometryOf(wallStrip(-1)), materials.wall),
    new Mesh(geometryOf(wallStrip(1)), materials.wall),
    new Mesh(geometryOf(hallWall()), materials.hallWall),
    new Mesh(geometryOf(hallFloor()), materials.floor),
    new Mesh(geometryOf(hallRoof()), materials.roof),
    instanced(box, materials.trim, [...ribInstances(), ...wallFrameInstances()]),
    instanced(cylinder, materials.stone, [...plinthInstances(), ...columnInstances()]),
    instanced(cylinder, materials.accent, [daisInstance()]),
  );
  return group;
}

export function disposeCorridor(group: Group): void {
  group.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    object.geometry.dispose();
    (object.material as Material).dispose();
  });
}
```

`src/components/journey/scene/Corridor.tsx`:

```tsx
"use client";

import { useEffect, useMemo } from "react";
import { buildCorridor, disposeCorridor } from "./buildCorridor";

/** 회랑과 전시실(스펙 2절 "세 막"). 렌더 단계 재질이라 막마다 청사진·클레이·완성품으로 그려진다 */
export function Corridor() {
  const corridor = useMemo(() => buildCorridor(), []);
  useEffect(() => () => disposeCorridor(corridor), [corridor]);
  return <primitive object={corridor} />;
}
```

- [ ] **Step 4: 장면에 올리고 임시 도형을 지운다**

`src/components/journey/scene/Scene.tsx`에서 찾을 부분:

```tsx
import { PlaceholderCorridor } from "./PlaceholderCorridor";
```

바꿀 내용:

```tsx
import { Corridor } from "./Corridor";
import { StageTime } from "./StageTime";
```

`src/components/journey/scene/Scene.tsx`에서 찾을 부분:

```tsx
        <CameraRig />
        <PlaceholderCorridor />
```

바꿀 내용:

```tsx
        <StageTime />
        <CameraRig />
        <Corridor />
```

`src/components/journey/scene/PlaceholderCorridor.tsx`를 지운다(`rm`). `rtk proxy grep -rn "PlaceholderCorridor" src e2e scripts`의 결과가 없어야 한다.

- [ ] **Step 5: 통과를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4`
Expected: 187 passed

Run: `rtk proxy npm run typecheck` 그리고 `rtk proxy npx eslint src/components/journey`
Expected: 둘 다 exit 0

자원 확인 뒤 Run: `rtk proxy npx playwright test e2e/journey.e2e.ts`
Expected: 44 passed. "페이지를 끝까지 지나가도 콘솔 에러가 없다"와 "캔버스는 여정 장면 하나뿐이다"가 셰이더 컴파일 오류(three의 콘솔 에러)를 잡는다

- [ ] **Step 6: 변경 정리와 커밋 메시지 초안 제출**

| 파일 | 변경 |
|---|---|
| `src/components/journey/scene/buildCorridor.ts`, `buildCorridor.test.ts` | 도형 데이터 → three 객체(인스턴스 3묶음), 완성품 재질 값, 해제 |
| `src/components/journey/scene/Corridor.tsx` | 회랑을 장면에 올림 |
| `src/components/journey/scene/Scene.tsx` | 임시 도형 대신 회랑과 셰이더 시간 |
| `src/components/journey/scene/PlaceholderCorridor.tsx` | 삭제 |
| `e2e/journey.e2e.ts` | 다른 페이지 번들 경계 |

```
feat: 여정 임시 도형을 실제 회랑과 전시실로 교체

- 문틀·액자, 받침대·기둥, 단을 인스턴스 셋으로 그려 부재가 늘어도 드로우 콜이 늘지 않게 한다
- 떠날 때 도형과 재질을 놓아 /journey를 오갈 때 GPU 메모리가 쌓이지 않게 한다
- 장면 코드가 다른 페이지 번들에 섞이지 않는지(스펙 7절) 표지 글자로 확인한다
```

---

### Task 6: 조명·안개·배경·환경 반사

막마다 분위기(1막 남색 + 약한 빛, 2막 회색 스튜디오, 3막 따뜻한 주광, 엔딩 내려다보기)를 매 프레임 적용하고, 3막 환경 반사를 Lightformer로 만든다.

**Files:**
- Create: `src/components/journey/scene/Atmosphere.tsx`
- Modify: `src/components/journey/scene/Scene.tsx`

**Interfaces:**
- Consumes: `atmosphereAt`, `scrollState`
- Produces: `Atmosphere` 컴포넌트(배경 `Color`, 선형 `Fog`, 반구광, 주광, `Environment`)

- [ ] **Step 1: 분위기 컴포넌트를 만든다**

`src/components/journey/scene/Atmosphere.tsx`:

```tsx
"use client";

import { Environment, Lightformer } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { Color, Fog, SRGBColorSpace, type DirectionalLight, type HemisphereLight } from "three";
import { atmosphereAt } from "@/lib/journey/atmosphere";
import { scrollState } from "@/lib/journey/scrollState";

/** 주광의 자리. 회랑이 −z로 뻗으므로 앞 왼쪽 위에서 비춘다 */
const KEY_POSITION: [number, number, number] = [-6, 12, 8];

/**
 * 조명·안개·배경색(스펙 3절). 매 프레임 스크롤 진행률의 분위기(lib/journey/atmosphere.ts)를 적용한다.
 * 빛의 개수와 안개 종류는 바꾸지 않는다. 바뀌면 셰이더를 다시 컴파일해 프레임이 끊긴다.
 * 3막의 환경 반사는 이미지 파일 없이 Lightformer로 만들고, 렌더 단계 셰이더가 완성품 단계에만 비춘다.
 */
export function Atmosphere() {
  const hemisphere = useRef<HemisphereLight>(null);
  const key = useRef<DirectionalLight>(null);

  useFrame((state) => {
    const atmosphere = atmosphereAt(scrollState.progress);
    const { background, fog } = state.scene;
    if (background instanceof Color) background.setRGB(...atmosphere.background, SRGBColorSpace);
    if (fog instanceof Fog) {
      fog.color.setRGB(...atmosphere.background, SRGBColorSpace);
      fog.near = atmosphere.fogNear;
      fog.far = atmosphere.fogFar;
    }
    if (hemisphere.current) {
      hemisphere.current.color.setRGB(...atmosphere.sky, SRGBColorSpace);
      hemisphere.current.groundColor.setRGB(...atmosphere.ground, SRGBColorSpace);
      hemisphere.current.intensity = atmosphere.hemisphere;
    }
    if (key.current) {
      key.current.color.setRGB(...atmosphere.key, SRGBColorSpace);
      key.current.intensity = atmosphere.keyIntensity;
    }
  });

  return (
    <>
      {/* 첫 값일 뿐이다. 첫 프레임부터 위의 useFrame이 진행률의 값으로 바꾼다 */}
      <color attach="background" args={["#0a1a33"]} />
      <fog attach="fog" args={["#0a1a33", 4, 18]} />
      <hemisphereLight ref={hemisphere} />
      <directionalLight ref={key} position={KEY_POSITION} />
      <Environment resolution={128} frames={1}>
        <Lightformer form="ring" color="#fff1d6" intensity={3} scale={6} position={[0, 8, 0]} rotation-x={Math.PI / 2} />
        <Lightformer form="rect" color="#ffe2b8" intensity={1.5} scale={[20, 3, 1]} position={[0, 3, -10]} />
        <Lightformer form="rect" color="#ffffff" intensity={1} scale={[20, 3, 1]} position={[10, 3, 0]} rotation-y={-Math.PI / 2} />
        <Lightformer form="rect" color="#f3e6d2" intensity={0.8} scale={[20, 3, 1]} position={[-10, 3, 0]} rotation-y={Math.PI / 2} />
      </Environment>
    </>
  );
}
```

`Environment`는 `frames={1}`이라 마운트할 때(layout effect) 큐브맵을 한 번 그리고 끝난다. 그래서 Task 7의 사전 컴파일이 환경맵이 걸린 상태로 컴파일한다.

- [ ] **Step 2: 장면에 올린다(임시 배경색을 대신한다)**

`src/components/journey/scene/Scene.tsx`에서 찾을 부분:

```tsx
import { CameraRig } from "./CameraRig";
```

바꿀 내용:

```tsx
import { Atmosphere } from "./Atmosphere";
import { CameraRig } from "./CameraRig";
```

`src/components/journey/scene/Scene.tsx`에서 찾을 부분:

```tsx
        <color attach="background" args={["#09090b"]} />
        <StageTime />
```

바꿀 내용:

```tsx
        <Atmosphere />
        <StageTime />
```

- [ ] **Step 3: 확인한다**

Run: `rtk proxy npm run typecheck` 그리고 `rtk proxy npx eslint src/components/journey/scene`
Expected: 둘 다 exit 0

자원 확인 뒤 Run: `rtk proxy npx playwright test e2e/journey.e2e.ts`
Expected: 44 passed (콘솔 에러 없음)

- [ ] **Step 4: 변경 정리와 커밋 메시지 초안 제출**

| 파일 | 변경 |
|---|---|
| `src/components/journey/scene/Atmosphere.tsx` | 배경·안개·반구광·주광을 진행률로 갱신, Lightformer 환경맵 |
| `src/components/journey/scene/Scene.tsx` | 임시 배경색 대신 분위기 |

```
feat: 여정 막별 조명·안개·환경 반사

- 빛의 개수와 안개 종류는 그대로 두고 값만 바꿔, 막을 지날 때 셰이더를 다시 컴파일하지 않게 한다
- 막마다 안개 거리를 짧게 두어 다음 막이 미리 보이지 않게 한다. 지금 경로의 휨만으로는 시야가 50m 넘게 트인다
- 3막의 환경 반사를 이미지 파일 없이 Lightformer로 만들어 내려받을 파일을 늘리지 않는다
```

---

### Task 7: 후처리, 셰이더 사전 컴파일, 로딩 막대

블룸·톤 매핑·비네트·SMAA를 걸고, 셰이더를 미리 컴파일한 뒤에야 장면을 그리고 드러낸다. 장면 상태(준비 중 → 준비됨/실패)가 로딩 막대와 캔버스 드러내기를 이끈다. 렌더러를 만들지 못하는 경우와 오류 경계가 실패를 잡는 경우도 상태를 "실패"로 바꾼다.

**Files:**
- Create: `src/lib/journey/sceneStatus.ts`, `src/lib/journey/sceneStatus.test.ts`, `src/components/journey/scene/Effects.tsx`, `src/components/journey/scene/Warmup.tsx`, `src/components/journey/SceneLoading.tsx`
- Modify: `src/components/journey/scene/Scene.tsx`(전체 교체), `src/components/journey/SceneBoundary.tsx`, `src/components/journey/JourneyStage.tsx`, `src/app/globals.css`, `e2e/journey.e2e.ts`

**Interfaces:**
- Consumes: `setRenderStep`(engine), `CAMERA_FOV`, `cameraAt`, Task 4~6 컴포넌트
- Produces: `type SceneStatus = "loading" | "ready" | "failed"`, `getSceneStatus`, `getServerSceneStatus`, `setSceneStatus`, `subscribeSceneStatus`. DOM 표지: `[data-journey-scene][data-state]`, `[data-journey-loading="<상태>"]`(e2e와 측정·캡처 스크립트가 기다린다)

- [ ] **Step 1: 테스트를 쓴다**

`src/lib/journey/sceneStatus.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { getSceneStatus, getServerSceneStatus, setSceneStatus, subscribeSceneStatus } from "./sceneStatus";

afterEach(() => setSceneStatus("loading"));

describe("장면 준비 상태", () => {
  it("처음에는 준비 중이고, 서버에서는 언제나 준비 중이다", () => {
    expect(getSceneStatus()).toBe("loading");
    setSceneStatus("ready");
    expect(getServerSceneStatus()).toBe("loading");
  });

  it("바뀔 때만 구독자에게 알린다", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeSceneStatus(listener);
    setSceneStatus("ready");
    setSceneStatus("ready");
    expect(getSceneStatus()).toBe("ready");
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    setSceneStatus("failed");
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
```

`e2e/journey.e2e.ts`의 청크 실패 테스트는 고정 대기(500ms) 대신 장면 상태를 기다린다(2-1 최종 수정 이월):

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts
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
```

바꿀 내용:

```ts
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
```

렌더러 실패 테스트도 상태를 기다리고, 메시지 문구를 보지 않는 이유를 적는다:

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/journey");
  await page.waitForTimeout(1000);
  expect(errors.length, errors.slice(0, 3).join(" | ")).toBeLessThanOrEqual(1);
  await expect(page.locator("[data-stop]")).toHaveCount(12);
});
```

바꿀 내용:

```ts
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
```

준비·재진입 테스트를 파일 끝에 붙인다:

```ts
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
```

- [ ] **Step 2: 실패를 확인한다**

Run: `rtk proxy npx vitest run src/lib/journey/sceneStatus.test.ts --maxWorkers=4`
Expected: FAIL — `Failed to resolve import "./sceneStatus"`

자원 확인 뒤 Run: `rtk proxy npx playwright test e2e/journey.e2e.ts -g "청크|렌더러|셰이더를 미리|다녀오면"`
Expected: 8 failed. `[data-journey-loading]`과 `data-state`가 아직 없다

- [ ] **Step 3: 상태 저장소, 후처리, 사전 컴파일, 로딩 막대를 만든다**

`src/lib/journey/sceneStatus.ts`:

```ts
/**
 * 3D 장면의 준비 상태. 장면(Warmup)이 셰이더를 미리 컴파일하고 몇 프레임 그려 본 뒤 "ready"로,
 * 렌더러를 만들지 못하거나 오류 경계가 실패를 잡으면 "failed"로 바꾼다. 로딩 표시와 캔버스 드러내기가 구독한다.
 * 3D 코드를 import하지 않아 지연 로딩 밖의 컴포넌트도 쓸 수 있다.
 */

export type SceneStatus = "loading" | "ready" | "failed";

let status: SceneStatus = "loading";
const listeners = new Set<() => void>();

export function getSceneStatus(): SceneStatus {
  return status;
}

/** 서버 렌더와 첫 하이드레이션에서는 언제나 준비 중이다 */
export function getServerSceneStatus(): SceneStatus {
  return "loading";
}

export function setSceneStatus(next: SceneStatus): void {
  if (status === next) return;
  status = next;
  for (const listener of listeners) listener();
}

export function subscribeSceneStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
```

`src/components/journey/scene/Effects.tsx`:

```tsx
"use client";

import { Bloom, EffectComposer, SMAA, ToneMapping, Vignette } from "@react-three/postprocessing";

/**
 * postprocessing의 ToneMappingMode.NEUTRAL(Khronos PBR Neutral). 런타임 값은 8이다.
 * 함께 배포되는 타입 선언은 CINEON을 따로 세어 이 값을 9로 적고 있어, 열거형 대신 런타임 숫자를 넘긴다.
 * postprocessing은 직접 의존성이 아니라 import하지 않는다.
 */
const NEUTRAL_TONE_MAPPING = 8;

/**
 * 후처리(스펙 3절): 블룸(1막의 선과 전환선), 톤 매핑, 약한 비네트, 안티에일리어싱(SMAA).
 * EffectComposer는 렌더러의 톤 매핑을 끄고 HDR 버퍼에 그리므로 톤 매핑을 효과로 직접 건다.
 * 블룸은 밝기 1을 넘는 빛(스스로 빛나는 선)에만 걸린다. 안티에일리어싱은 SMAA가 맡아 MSAA는 끈다.
 */
export function Effects() {
  return (
    <EffectComposer multisampling={0}>
      <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={0.2} intensity={0.9} />
      <ToneMapping mode={NEUTRAL_TONE_MAPPING} />
      <Vignette offset={0.25} darkness={0.55} />
      <SMAA />
    </EffectComposer>
  );
}
```

`src/components/journey/scene/Warmup.tsx`:

```tsx
"use client";

import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import { HalfFloatType, WebGLRenderTarget } from "three";
import { setRenderStep } from "@/lib/journey/engine";
import { setSceneStatus } from "@/lib/journey/sceneStatus";

/** 사전 컴파일 뒤, 화면에 드러내기 전에 그려 보는 프레임 수. 후처리 셰이더가 이때 컴파일된다 */
const HIDDEN_FRAMES = 3;

/**
 * 셰이더 사전 컴파일(스펙 5절 "로딩"). 장면의 모든 재질을 compileAsync로 미리 컴파일한 뒤에야 시계에 렌더 단계를 건다.
 * 그 전에는 장면을 그리지 않으므로 첫 스크롤에서 셰이더 컴파일로 끊기지 않는다. 몇 프레임 숨긴 채 그린 뒤 "ready"가 된다.
 * 컴파일은 렌더 타깃을 건 채로 한다. 장면은 EffectComposer의 HDR 버퍼에 그려지는데, 화면 기준으로 컴파일하면
 * 출력 색 공간이 달라 첫 렌더에서 프로그램을 다시 만든다.
 * Canvas의 마지막 자식이라 다른 자식(환경맵, 후처리)이 자리를 잡은 뒤에 effect가 돈다.
 */
export function Warmup() {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);
  const advance = useThree((state) => state.advance);

  useEffect(() => {
    let cancelled = false;
    const target = new WebGLRenderTarget(1, 1, { type: HalfFloatType });
    const previous = gl.getRenderTarget();
    gl.setRenderTarget(target);
    const compiling = gl.compileAsync(scene, camera);
    gl.setRenderTarget(previous);
    compiling.then(
      () => {
        target.dispose();
        if (cancelled) return;
        let frames = 0;
        // 시계는 ms를 넘기지만 R3F advance는 초 단위다(frameloop="never"에서 clock.elapsedTime과 빼서 delta를 만든다).
        setRenderStep((timeMs) => {
          advance(timeMs / 1000);
          frames += 1;
          if (frames === HIDDEN_FRAMES) setSceneStatus("ready");
        });
      },
      () => {
        target.dispose();
        if (!cancelled) setSceneStatus("failed");
      },
    );
    return () => {
      cancelled = true;
      setRenderStep(null);
    };
  }, [gl, scene, camera, advance]);

  return null;
}
```

`src/components/journey/SceneLoading.tsx`:

```tsx
"use client";

import { useSyncExternalStore } from "react";
import { getSceneStatus, getServerSceneStatus, subscribeSceneStatus } from "@/lib/journey/sceneStatus";

/**
 * 3D 장면이 셰이더를 컴파일하는 동안 화면 아래에 흐르는 가는 막대(스펙 2절 "입구: 로딩 표시").
 * 글을 넣지 않는 장식이라 보조 기술에는 숨긴다. 본문은 이미 진짜 HTML로 읽힌다.
 * 바깥 상자는 늘 두고 상태를 data-journey-loading에 적는다(e2e가 준비·실패를 기다리는 표지).
 */
export function SceneLoading() {
  const status = useSyncExternalStore(subscribeSceneStatus, getSceneStatus, getServerSceneStatus);
  return (
    <div
      data-journey-loading={status}
      aria-hidden
      className="pointer-events-none fixed inset-x-0 bottom-10 z-20 flex justify-center"
    >
      {status === "loading" && (
        <span className="block h-px w-24 overflow-hidden bg-white/15">
          <span className="block h-full w-1/3 bg-white/70 animate-[journey-loading_1.2s_ease-in-out_infinite] motion-reduce:animate-none" />
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 4: 장면을 고친다(전체 교체)**

`src/components/journey/scene/Scene.tsx`를 아래로 바꾼다. 렌더 단계는 `onCreated`가 아니라 `Warmup`이 사전 컴파일 뒤에 건다. 렌더러는 직접 만들어 실패를 상태로 알린다. 상태를 구독하는 틀(`SceneFrame`)을 따로 둔다. `Canvas`는 렌더될 때마다 렌더러 설정을 다시 하므로, 상태가 바뀔 때 `Canvas`까지 다시 렌더링되면 렌더러를 만들지 못한 경우 실패가 한 번 더 난다(검증 중 확인).

```tsx
"use client";

import { Canvas } from "@react-three/fiber";
import { useSyncExternalStore, type ReactNode } from "react";
import { WebGLRenderer, type WebGLRendererParameters } from "three";
import { getSceneStatus, getServerSceneStatus, setSceneStatus, subscribeSceneStatus } from "@/lib/journey/sceneStatus";
import { CAMERA_FOV, cameraAt } from "@/lib/journey/timeline";
import { Atmosphere } from "./Atmosphere";
import { CameraRig } from "./CameraRig";
import { Corridor } from "./Corridor";
import { Effects } from "./Effects";
import { StageTime } from "./StageTime";
import { Warmup } from "./Warmup";

/** 모듈 밖에 두어 렌더마다 같은 객체를 넘긴다. Canvas는 카메라 옵션이 바뀌면 카메라 자리를 다시 잡는다 */
const CAMERA = { fov: CAMERA_FOV, near: 0.1, far: 200, position: cameraAt(0).position };

/**
 * 렌더러를 직접 만든다. 만들지 못하면(WebGL 컨텍스트 거부) 장면 상태를 "failed"로 바꿔 로딩 표시를 거둔 뒤 다시 던진다.
 * 안티에일리어싱은 후처리(SMAA)가 맡으므로 기본 MSAA는 끈다.
 */
function createRenderer(defaults: WebGLRendererParameters): WebGLRenderer {
  try {
    return new WebGLRenderer({ ...defaults, antialias: false });
  } catch (error) {
    setSceneStatus("failed");
    throw error;
  }
}

/**
 * 장면 상태를 구독하는 바깥 틀. 준비되기 전에는 캔버스를 숨기고, 준비되면 서서히 드러낸다.
 * Canvas는 children으로 받는다. 상태가 바뀌어 이 틀만 다시 렌더링되면 같은 children이라 Canvas는 다시 렌더링되지 않는다.
 * (Canvas는 렌더링될 때마다 렌더러 설정을 다시 하므로, 렌더러를 만들지 못한 경우 실패를 한 번 더 일으킨다.)
 */
function SceneFrame({ children }: { children: ReactNode }) {
  const status = useSyncExternalStore(subscribeSceneStatus, getSceneStatus, getServerSceneStatus);
  return (
    <div
      data-journey-scene
      data-state={status}
      className="fixed inset-0 z-0 transition-opacity duration-700"
      style={{ opacity: status === "ready" ? 1 : 0 }}
      aria-hidden
    >
      {children}
    </div>
  );
}

/**
 * 여정 3D 장면. R3F 자체 루프를 끄고(frameloop="never") 시계 하나가 그 캔버스의 advance로 그린다.
 * 렌더 단계는 Warmup이 셰이더를 미리 컴파일한 뒤에 건다.
 * 이 파일과 scene/ 아래만 three·R3F를 import한다. JourneyStage가 동적으로 불러온다.
 */
export default function Scene() {
  return (
    <SceneFrame>
      <Canvas frameloop="never" dpr={[1, 2]} camera={CAMERA} gl={createRenderer}>
        <Atmosphere />
        <StageTime />
        <CameraRig />
        <Corridor />
        <Effects />
        <Warmup />
      </Canvas>
    </SceneFrame>
  );
}
```

- [ ] **Step 5: 오류 경계, 진입점, 전역 CSS를 고친다**

`src/components/journey/SceneBoundary.tsx`에서 찾을 부분:

```tsx
import { setRenderStep } from "@/lib/journey/engine";
```

바꿀 내용:

```tsx
import { setRenderStep } from "@/lib/journey/engine";
import { setSceneStatus } from "@/lib/journey/sceneStatus";
```

`src/components/journey/SceneBoundary.tsx`에서 찾을 부분:

```tsx
  componentDidCatch() {
    setRenderStep(null);
  }
```

바꿀 내용:

```tsx
  componentDidCatch() {
    setRenderStep(null);
    setSceneStatus("failed");
  }
```

`src/components/journey/JourneyStage.tsx`에서 찾을 부분:

```tsx
import { useSyncExternalStore } from "react";
import { hasWebGL2 } from "@/lib/journey/webgl";
import { ProgressRail } from "./ProgressRail";
import { ProjectDialog } from "./ProjectDialog";
import { SceneBoundary } from "./SceneBoundary";
import { useJourneyScroll } from "./useJourneyScroll";
```

바꿀 내용:

```tsx
import { useEffect, useSyncExternalStore } from "react";
import { setSceneStatus } from "@/lib/journey/sceneStatus";
import { hasWebGL2 } from "@/lib/journey/webgl";
import { ProgressRail } from "./ProgressRail";
import { ProjectDialog } from "./ProjectDialog";
import { SceneBoundary } from "./SceneBoundary";
import { SceneLoading } from "./SceneLoading";
import { useJourneyScroll } from "./useJourneyScroll";
```

`src/components/journey/JourneyStage.tsx`에서 찾을 부분:

```tsx
// 장면 코드(drei Line 포함)는 이 동적 import 뒤에만 있다.
```

바꿀 내용:

```tsx
// 장면 코드(회랑, 렌더 단계 셰이더, drei 환경맵, 후처리)는 이 동적 import 뒤에만 있다.
```

`src/components/journey/JourneyStage.tsx`에서 찾을 부분:

```tsx
  useJourneyScroll();
  const webgl = useSyncExternalStore(subscribeNothing, hasWebGL2, () => false);
  return (
    <>
      {webgl && (
        <SceneBoundary>
          <Scene />
        </SceneBoundary>
      )}
```

바꿀 내용:

```tsx
  useJourneyScroll();
  const webgl = useSyncExternalStore(subscribeNothing, hasWebGL2, () => false);
  // 다른 페이지로 갔다가 돌아오면 장면을 처음부터 다시 준비한다(실패했던 상태도 지운다).
  useEffect(() => () => setSceneStatus("loading"), []);
  return (
    <>
      {webgl && (
        <SceneBoundary>
          <Scene />
        </SceneBoundary>
      )}
      {webgl && <SceneLoading />}
```

`src/app/globals.css`에서 찾을 부분:

```css
/* 여정 페이지: 화면에 고정된 3D 캔버스(z-0)가 위치 지정 없는 푸터를 덮지 않게 올린다. */
body:has([data-journey-page]) [data-site-footer] {
  position: relative;
  z-index: 10;
}
```

바꿀 내용:

```css
/* 여정 페이지: 화면에 고정된 3D 캔버스(z-0)가 위치 지정 없는 푸터를 덮지 않게 올린다. */
body:has([data-journey-page]) [data-site-footer] {
  position: relative;
  z-index: 10;
}

/* 여정 페이지: 3D 장면을 준비하는 동안 흐르는 로딩 막대(SceneLoading) */
@keyframes journey-loading {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(300%);
  }
}
```

- [ ] **Step 6: 통과를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4`
Expected: 189 passed

Run: `rtk proxy npm run typecheck` 그리고 `rtk proxy npx eslint src/components/journey src/lib/journey e2e/journey.e2e.ts`
Expected: 둘 다 exit 0

자원 확인 뒤 Run: `rtk proxy npx playwright test e2e/journey.e2e.ts`
Expected: 48 passed. SwiftShader에서는 `KHR_parallel_shader_compile` 경고(warning)가 나오지만 콘솔 에러가 아니라 테스트에 걸리지 않는다

- [ ] **Step 7: 변경 정리와 커밋 메시지 초안 제출**

| 파일 | 변경 |
|---|---|
| `src/lib/journey/sceneStatus.ts`, `sceneStatus.test.ts` | 장면 준비 상태 저장소 |
| `src/components/journey/scene/Effects.tsx` | 블룸, Neutral 톤 매핑, 비네트, SMAA |
| `src/components/journey/scene/Warmup.tsx` | 렌더 타깃을 건 사전 컴파일, 숨긴 3프레임 뒤 준비됨 |
| `src/components/journey/scene/Scene.tsx` | 렌더러 생성 실패 처리, 상태 틀, 장면 구성 |
| `src/components/journey/SceneLoading.tsx` | 로딩 막대(글 없음, `aria-hidden`) |
| `src/components/journey/SceneBoundary.tsx`, `JourneyStage.tsx` | 실패 상태, 로딩 막대, 재진입 초기화 |
| `src/app/globals.css` | 로딩 애니메이션 |
| `e2e/journey.e2e.ts` | 준비·재진입, 청크·렌더러 실패를 상태로 기다림 |

```
feat: 여정 후처리와 셰이더 사전 컴파일

- 셰이더를 미리 컴파일한 뒤에야 그려 첫 스크롤이 컴파일로 끊기지 않게 한다. 장면은 그 뒤에 서서히 드러난다
- 스크롤은 막지 않는다. 본문은 진짜 HTML이라 3D가 준비되기 전에도 읽히고, 3D가 실패해도 페이지가 멈추지 않는다
- 사전 컴파일은 렌더 타깃을 건 채로 한다. 장면은 후처리의 HDR 버퍼에 그려져 화면 기준으로 컴파일하면 첫 렌더에서 다시 만든다
- EffectComposer가 렌더러 톤 매핑을 끄므로 톤 매핑을 효과로 건다. Neutral이 청사진 선의 파랑과 3막의 색을 지킨다
- 렌더러를 만들지 못하거나 오류 경계가 실패를 잡으면 로딩 막대를 거둔다. 고정 대기 대신 이 상태를 기다려 테스트가 흔들리지 않는다
```

---

### Task 8: 밝은 장면 위의 화면 요소

2·3막의 밝은 장면 위에서도 진행 막대와 푸터가 보이게 한다. 2-1 Task 6의 이월 항목(엔딩 점과 채움의 어긋남, 라벨 간격)과 Task 9의 이월 항목(투명한 푸터로 장면이 비침)을 함께 고친다.

**Files:**
- Modify: `src/components/journey/ProgressRail.tsx`, `src/app/globals.css`, `e2e/journey.e2e.ts`

- [ ] **Step 1: 테스트를 파일 끝에 붙인다**

```ts
test("진행 막대와 푸터는 밝은 장면 위에서도 바탕이 있다", async ({ page }) => {
  await page.goto("/journey");
  const rail = page.getByRole("navigation", { name: "여정 진행" });
  expect(await rail.evaluate((element) => getComputedStyle(element).backgroundColor)).not.toBe("rgba(0, 0, 0, 0)");
  const footer = page.locator("[data-site-footer]");
  expect(await footer.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe("rgb(9, 9, 11)");
});
```

- [ ] **Step 2: 실패를 확인한다**

자원 확인 뒤 Run: `rtk proxy npx playwright test e2e/journey.e2e.ts -g "바탕이 있다"`
Expected: 2 failed (진행 막대 바탕이 `rgba(0, 0, 0, 0)`)

- [ ] **Step 3: 진행 막대와 푸터를 고친다**

`src/components/journey/ProgressRail.tsx`에서 찾을 부분:

```tsx
// align: 엔딩은 연락처가 섹션 아래쪽에 있어 섹션 끝을 화면 끝에 맞춘다.
const MARKS = (
```

바꿀 내용:

```tsx
// align: 엔딩은 연락처가 섹션 아래쪽에 있어 섹션 끝을 화면 끝에 맞춘다. 그래서 점도 도착하는 자리(구간 끝)에 둔다.
const MARKS = (
```

`src/components/journey/ProgressRail.tsx`에서 찾을 부분:

```tsx
).map((mark) => ({ ...mark, top: `${rangeOf(mark.id).start * 100}%` }));
```

바꿀 내용:

```tsx
).map((mark) => {
  const range = rangeOf(mark.id);
  return { ...mark, top: `${(mark.align === "end" ? range.end : range.start) * 100}%` };
});
```

`src/components/journey/ProgressRail.tsx`에서 찾을 부분:

```tsx
/** 진행 막대. 채움 정도는 React 렌더 없이 DOM을 직접 고친다(스크롤 중 렌더 금지). */
```

바꿀 내용:

```tsx
/**
 * 진행 막대. 채움 정도는 React 렌더 없이 DOM을 직접 고친다(스크롤 중 렌더 금지).
 * 2막·3막의 밝은 장면 위에서도 보이도록 반투명 어두운 바탕 위에 그린다(흐림 없이 단색).
 */
```

`src/components/journey/ProgressRail.tsx`에서 찾을 부분:

```tsx
    <nav aria-label="여정 진행" className="fixed right-3 top-1/2 z-20 h-64 -translate-y-1/2 sm:right-6">
      <div className="relative h-full w-px bg-white/15">
```

바꿀 내용:

```tsx
    <nav
      aria-label="여정 진행"
      className="fixed right-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-zinc-950/70 px-3 py-4 sm:right-6"
    >
      <div className="relative h-64 w-px bg-white/25">
```

`src/components/journey/ProgressRail.tsx`에서 찾을 부분:

```tsx
            <span className="pointer-events-none absolute right-6 whitespace-nowrap text-xs text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
```

바꿀 내용:

```tsx
            <span className="pointer-events-none absolute right-8 whitespace-nowrap rounded bg-zinc-950/85 px-1.5 py-0.5 text-xs text-zinc-200 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
```

`src/app/globals.css`에서 찾을 부분:

```css
/* 여정 페이지: 화면에 고정된 3D 캔버스(z-0)가 위치 지정 없는 푸터를 덮지 않게 올린다. */
body:has([data-journey-page]) [data-site-footer] {
  position: relative;
  z-index: 10;
}
```

바꿀 내용:

```css
/* 여정 페이지: 화면에 고정된 3D 캔버스(z-0)가 위치 지정 없는 푸터를 덮지 않게 올리고, 장면이 비치지 않게 칠한다. */
body:has([data-journey-page]) [data-site-footer] {
  position: relative;
  z-index: 10;
  background-color: rgb(9 9 11);
}
```

- [ ] **Step 4: 통과를 확인한다**

Run: `rtk proxy npx eslint src/components/journey/ProgressRail.tsx` 그리고 `rtk proxy npm run typecheck`
Expected: 둘 다 exit 0

자원 확인 뒤 Run: `rtk proxy npx playwright test`
Expected: 64 passed (블로그 14 + 여정 50). 블로그 화면 기준은 그대로다. 푸터 규칙은 `body:has([data-journey-page])` 아래라 블로그에는 걸리지 않는다

- [ ] **Step 5: 변경 정리와 커밋 메시지 초안 제출**

| 파일 | 변경 |
|---|---|
| `src/components/journey/ProgressRail.tsx` | 반투명 어두운 바탕, 엔딩 점을 구간 끝에, 라벨 바탕과 간격 |
| `src/app/globals.css` | 여정 페이지 푸터를 불투명하게 |
| `e2e/journey.e2e.ts` | 진행 막대·푸터 바탕 |

```
fix: 여정 밝은 막에서 진행 막대와 푸터가 묻히지 않게 하기

- 2막 회색·3막 크림색 장면 위에서 흰 선과 점이 보이지 않아 반투명 어두운 바탕을 깐다(흐림은 쓰지 않는다)
- 연락처는 섹션 끝에 도착하므로 엔딩 점도 구간 끝에 두어 채움이 점을 지나치지 않게 한다
- 투명한 푸터 뒤로 장면이 비쳐 바닥글이 읽히지 않았다
```

---

### Task 9: 측정·캡처 도구

성능 측정 스크립트를 이번 장면에 맞게 고친다(2-1 Task 10 이월: 휠 루프 시한, 프레임 0개 메시지, 60Hz 전용 기준, 주석, 주사율·GPU 출력, 끝의 유휴 프레임). 시각 검토용 캡처 스크립트를 만든다.

**Files:**
- Modify: `scripts/perf-journey.ts`(전체 교체), `package.json`
- Create: `scripts/capture-journey.ts`

- [ ] **Step 1: 측정 스크립트를 바꾼다**

`scripts/perf-journey.ts` 전체:

```ts
import { chromium } from "@playwright/test";

/**
 * 여정 페이지 부드러움 측정(스펙 7절, 8절 4항). GPU를 쓰는 실제 Chrome 창에서 정해진 간격으로 휠을 굴려 회랑 전체를
 * 지나가며 프레임 간격을 잰다. 헤드리스 브라우저는 소프트웨어 렌더링이라 숫자가 실제와 달라 창을 띄운다.
 * 휠 한 번이 Playwright를 오가는 시간에 따라 프레임 수는 실행마다 다르다. 비교는 averageMs·over50ms로 한다.
 *
 * 사용법:
 *   npx next build && npx next start --port 3200   # 다른 터미널
 *   npm run perf:journey                           # 기본 주소 http://localhost:3200/journey (PERF_URL로 바꿀 수 있다)
 */
const TARGET_URL = process.env.PERF_URL ?? "http://localhost:3200/journey";
const VIEWPORT = { width: 1440, height: 900 };
const WHEEL_STEP = 100; // 한 번에 굴리는 양(px)
const WHEEL_INTERVAL = 16; // 굴리는 간격(ms)
const WARMUP_FRAMES = 30; // 스크롤 시작 직후 프레임은 이미지 디코딩 등이 섞여 제외한다
const READY_TIMEOUT = 30_000; // 3D 장면이 셰이더를 미리 컴파일하고 드러날 때까지 기다리는 한도
const IDLE_MS = 1000; // 스크롤 전 가만히 있는 동안 주사율을 잰다
const SCROLL_DEADLINE = 120_000; // 끝까지 가지 못하면(스크롤이 막히면) 이 시간 뒤 멈춘다

type Phase = "idle" | "scroll" | "done";
type FrameWindow = Window & { __frames: { dt: number; phase: Phase }[]; __phase: Phase };

function percentile(sorted: number[], ratio: number): number {
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))];
}

function median(values: number[]): number {
  return percentile([...values].sort((a, b) => a - b), 0.5);
}

async function main() {
  const browser = await chromium.launch({ headless: false, args: ["--ignore-gpu-blocklist"] });
  try {
    const page = await browser.newPage({ viewport: VIEWPORT });
    // tsx(esbuild keepNames)가 evaluate에 넘기는 함수 안의 이름 있는 함수에 __name 호출을 끼워 넣는다. 브라우저에는 없어 빈 껍데기를 심는다.
    await page.addInitScript("window.__name = (target) => target;");
    await page.goto(TARGET_URL, { waitUntil: "load" });
    // 셰이더 사전 컴파일이 끝나기 전 프레임은 재지 않는다(스펙 5절).
    await page.locator('[data-journey-scene][data-state="ready"]').waitFor({ timeout: READY_TIMEOUT });

    const renderer = await page.evaluate(() => {
      const gl = document.createElement("canvas").getContext("webgl2");
      const info = gl?.getExtension("WEBGL_debug_renderer_info");
      return gl && info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "unknown";
    });

    // 측정 전용 프레임 기록기. 측정 대상 페이지의 시계와는 별개다. 프레임마다 지금 단계(가만히·스크롤·끝)를 함께 적는다.
    await page.evaluate(() => {
      const frameWindow = window as unknown as FrameWindow;
      frameWindow.__frames = [];
      frameWindow.__phase = "idle";
      let last = performance.now();
      const record = (now: number) => {
        frameWindow.__frames.push({ dt: now - last, phase: frameWindow.__phase });
        last = now;
        if (frameWindow.__phase !== "done") requestAnimationFrame(record);
      };
      requestAnimationFrame(record);
    });
    await page.waitForTimeout(IDLE_MS);

    await page.evaluate(() => {
      (window as unknown as FrameWindow).__phase = "scroll";
    });
    await page.mouse.move(VIEWPORT.width / 2, VIEWPORT.height / 2);
    const maxScroll = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
    const started = Date.now();
    while ((await page.evaluate(() => window.scrollY)) < maxScroll - 2) {
      if (Date.now() - started > SCROLL_DEADLINE) {
        const reached = await page.evaluate(() => window.scrollY);
        throw new Error(`${SCROLL_DEADLINE / 1000}초 안에 끝까지 스크롤하지 못했습니다(${reached}/${maxScroll}px)`);
      }
      await page.mouse.wheel(0, WHEEL_STEP);
      await page.waitForTimeout(WHEEL_INTERVAL);
    }
    // 끝에 닿은 뒤의 가만히 있는 프레임은 넣지 않는다(p95가 묽어진다).
    await page.evaluate(() => {
      (window as unknown as FrameWindow).__phase = "done";
    });

    const frames = await page.evaluate(() => (window as unknown as FrameWindow).__frames);
    const idle = frames.filter((frame) => frame.phase === "idle").map((frame) => frame.dt);
    const sample = frames
      .filter((frame) => frame.phase === "scroll")
      .map((frame) => frame.dt)
      .slice(WARMUP_FRAMES);
    if (sample.length === 0) throw new Error(`스크롤 중 프레임이 기록되지 않았습니다(전체 ${frames.length}개)`);
    const refreshMs = median(idle);
    const sorted = [...sample].sort((a, b) => a - b);
    const average = sample.reduce((sum, value) => sum + value, 0) / sample.length;
    console.log(
      JSON.stringify(
        {
          url: TARGET_URL,
          renderer,
          refreshHz: Number((1000 / refreshMs).toFixed(0)),
          frames: sample.length,
          averageMs: Number(average.toFixed(2)),
          fps: Number((1000 / average).toFixed(1)),
          p95Ms: Number(percentile(sorted, 0.95).toFixed(2)),
          maxMs: Number(sorted[sorted.length - 1].toFixed(2)),
          // 주사율 한 칸의 두 배를 넘은 프레임(한 프레임 이상 놓침). 60Hz면 33ms, 120Hz면 17ms 기준이다.
          overTwoFrames: sample.filter((value) => value > refreshMs * 2).length,
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

- [ ] **Step 2: 캡처 스크립트를 만든다**

`scripts/capture-journey.ts`:

```ts
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { rangeOf } from "@/lib/journey/timeline";

/**
 * 여정 장면 시각 검토용 캡처. 정해 둔 자리(정류장과 그 안의 위치)마다 화면을 찍고 3×3 한 장(sheet.png)으로도 붙인다.
 * 본문 패널·진행 막대가 함께 찍혀 밝은 막에서도 글이 읽히는지 본다. 기본은 GPU를 쓰는 실제 Chrome 창이다.
 *
 * 사용법:
 *   npx next build && npx next start --port 3200   # 다른 터미널
 *   CAPTURE_NAME=2-2 npm run capture:journey        # → test-results/journey-captures/2-2/ (git에 넣지 않는다)
 *   CAPTURE_HEADLESS=1을 더하면 창 없이 찍는다(소프트웨어 렌더링이라 색과 속도는 실제와 다르다).
 */
const TARGET_URL = process.env.CAPTURE_URL ?? "http://localhost:3200/journey";
const NAME = process.env.CAPTURE_NAME ?? "latest";
const HEADLESS = process.env.CAPTURE_HEADLESS === "1";
const VIEWPORT = { width: 1440, height: 900 };
const READY_TIMEOUT = 30_000;
const SETTLE_MS = 2500; // 카메라 감쇠가 목표 자리에 닿을 때까지
const TILE = { width: 480, height: 300 };

/** [파일 이름, 정류장, 정류장 안의 위치(0~1)] */
const SHOTS: [string, string, number][] = [
  ["01-intro", "intro", 0.3],
  ["02-kokoa-clone", "kokoa-clone", 0.5],
  ["03-eutcha", "eutcha", 0.9],
  ["04-act-2", "act-2", 0.5],
  ["05-stock2u", "stock2u", 0.5],
  ["06-pfplay", "pfplay", 0.95],
  ["07-act-3", "act-3", 0.5],
  ["08-pickcare", "pickcare", 0.5],
  ["09-ending", "ending", 1],
];

async function main() {
  const outDir = path.join("test-results", "journey-captures", NAME);
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: HEADLESS, args: ["--ignore-gpu-blocklist"] });
  try {
    const page = await browser.newPage({ viewport: VIEWPORT });
    // tsx(esbuild keepNames)가 evaluate에 넘기는 함수에 __name 호출을 끼워 넣을 수 있다. 브라우저에는 없어 빈 껍데기를 심는다.
    await page.addInitScript("window.__name = (target) => target;");
    await page.goto(TARGET_URL, { waitUntil: "load" });
    await page.locator('[data-journey-scene][data-state="ready"]').waitFor({ timeout: READY_TIMEOUT });
    const files: string[] = [];
    for (const [name, id, within] of SHOTS) {
      const range = rangeOf(id);
      const progress = range.start + (range.end - range.start) * within;
      // ScrollTrigger의 진행률은 본문(<main>) 위끝이 화면 위에 닿을 때 0, 아래끝이 화면 아래에 닿을 때 1이다.
      await page.evaluate((target) => {
        const main = document.querySelector("[data-journey-page]");
        if (!(main instanceof HTMLElement)) throw new Error("여정 본문이 없습니다");
        const top = main.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top: top + target * (main.offsetHeight - window.innerHeight), behavior: "instant" });
      }, progress);
      await page.waitForTimeout(SETTLE_MS);
      const file = path.join(outDir, `${name}.png`);
      await page.screenshot({ path: file });
      files.push(file);
    }
    const tiles = await Promise.all(files.map((file) => sharp(file).resize(TILE.width, TILE.height).toBuffer()));
    await sharp({ create: { width: TILE.width * 3, height: TILE.height * 3, channels: 3, background: "#18181b" } })
      .composite(
        tiles.map((input, index) => ({ input, left: (index % 3) * TILE.width, top: Math.floor(index / 3) * TILE.height })),
      )
      .png()
      .toFile(path.join(outDir, "sheet.png"));
    console.log(`${files.length}장과 sheet.png를 ${outDir}에 저장했습니다`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

`package.json`에서 찾을 부분:

```json
    "perf:journey": "tsx scripts/perf-journey.ts",
```

바꿀 내용:

```json
    "perf:journey": "tsx scripts/perf-journey.ts",
    "capture:journey": "tsx scripts/capture-journey.ts",
```

- [ ] **Step 3: 확인한다**

Run: `rtk proxy npm run typecheck` 그리고 `rtk proxy npx eslint scripts/perf-journey.ts scripts/capture-journey.ts`
Expected: 둘 다 exit 0

자원 확인 뒤 빌드하고 3200 포트에 서버를 띄운다(`rtk proxy npx next build` 다음 `rtk proxy npx next start --port 3200`을 백그라운드로). 다음을 하나씩 실행한다:

Run: `CAPTURE_HEADLESS=1 CAPTURE_NAME=task9 rtk proxy npm run capture:journey`
Expected: `9장과 sheet.png를 test-results/journey-captures/task9에 저장했습니다`. `sheet.png`를 Read로 열어 아홉 장면이 모두 그려졌는지(검은 칸이 없는지) 본다

Run: `rtk proxy npm run perf:journey`
Expected: JSON에 `renderer`(GPU 이름), `refreshHz`, `overTwoFrames`가 있고 오류 없이 끝난다(창이 뜬다)

서버는 `lsof -t -iTCP:3200 -sTCP:LISTEN`으로 찾은 PID만 끈다.

- [ ] **Step 4: 변경 정리와 커밋 메시지 초안 제출**

| 파일 | 변경 |
|---|---|
| `scripts/perf-journey.ts` | 장면 준비 대기, 스크롤 시한, 주사율·GPU 출력, 끝의 유휴 프레임 제외 |
| `scripts/capture-journey.ts`, `package.json` | 9장면 캡처와 3×3 한 장 |

```
chore: 여정 성능 측정 보강과 시각 검토 캡처 추가

- 셰이더 사전 컴파일이 끝나기 전 프레임은 재지 않는다(스펙 5절). 고정 2초 대기는 장면이 무거워지면 컴파일과 겹친다
- 끝까지 스크롤하지 못하면 무한히 돌던 루프에 시한을 둔다
- 주사율과 GPU 이름을 함께 남겨 다른 모니터·기기의 숫자를 섞어 비교하지 않게 한다
- 장면을 고칠 때마다 같은 자리 아홉 곳을 한 장으로 비교할 수 있게 한다
```

---

### Task 10: 전체 검증, 성능 측정, 시각 검토

**Files:** 없음(검증만)

- [ ] **Step 1: 전체 검증(하나씩)**

1. `rtk proxy npx vitest run --maxWorkers=4` → 189 passed
2. `rtk proxy npm run typecheck` → exit 0
3. `rtk proxy npx eslint` → 알려진 기존 에러 5개(`Background3D.tsx` 3개, `about/page.tsx:57` 2개)만
4. 자원 확인 뒤 `rtk proxy npx playwright test` → 64 passed, 재시도·기준 갱신 없음
5. `rtk proxy npx next build` → 성공, `/journey`가 정적(○)
6. `rtk proxy grep -rnE "requestAnimationFrame\(|backdrop-blur|backdrop-filter" src/components/journey src/lib/journey` → 결과 없음

- [ ] **Step 2: 성능 측정(스펙 7절)**

3200 포트에 `next start`를 띄우고 `rtk proxy npm run perf:journey`를 **두 번** 실행한다. 서버를 띄운 뒤 첫 실행은 콜드(청크·이미지 첫 로드)로 보고 둘째 실행을 기록한다(2-1 Task 10 기준선과 같은 방법).

기준: 60Hz 모니터에서 `averageMs` 약 16.7, `over50ms` 0. 2-1 기준선(60fps, max≈17.8, over50 0)과 `averageMs`·`over50ms`로 비교한다. `renderer`가 Apple GPU인지 확인한다(SwiftShader면 GPU 가속이 꺼진 것이다).

기준을 넘지 못하면 컨트롤러가 판정한다. 해상도 상한을 `dpr={[1, 1.5]}`로 낮추고, 그래도 넘지 못하면 블룸을 뺀다(스펙 3절 "성능이 떨어지면 블룸부터 끈다"). 어느 쪽이든 ledger에 판정과 숫자를 남긴다. `cameraAt`·`atmosphereAt`의 프레임당 배열 할당(2-1 최종 리뷰 이월)은 이 숫자로 판단한다. 기준을 넘으면 그대로 둔다.

- [ ] **Step 3: 시각 검토 캡처(사용자 검토용)**

Run: `CAPTURE_NAME=2-2 rtk proxy npm run capture:journey` (GPU를 쓰는 실제 창)
`test-results/journey-captures/2-2/sheet.png`와 아홉 장을 Read로 연다. 확인할 것:
- 1막은 남색 바탕에 파란 격자·문틀이 빛나고, 2·3막 진입에서 노이즈 경계를 따라 빛나는 선이 보인다
- 2막은 회색 클레이 스튜디오이고, 3막 전시실은 따뜻한 색과 기둥·단이 보인다
- 엔딩은 회랑 전체(청사진 → 클레이 → 전시실)가 한 화면에 들어온다
- 모든 장면에서 패널 글, 진행 막대, 헤더가 읽힌다

서버는 PID로만 끈다.

- [ ] **Step 4: 보고**

보고서에 적는다: 단위·e2e 수와 결과, 성능 두 실행의 JSON(둘째를 기준으로), 캡처 경로와 눈 확인 결과, 계획과 다르게 처리한 곳과 이유. 컨트롤러는 `sheet.png`를 사용자에게 보여 색·밝기·분위기를 검토받는다. 값 조율(색, 세기, 안개 거리)은 사용자 의견을 받은 뒤 한 번에 한다.

---

## 추가: 우주 배경 (사용자 결정, 2026-10-15)

Task 10까지 끝난 뒤 사용자가 배경을 우주로 바꾸기로 했다. 막별 단색 배경 대신 은하수 사진과 떠다니는 별 먼지를 두르고, 우주가 보이도록 공간을 연다. 시제품에서 생성한 은하와 NASA 사진을 같은 장면으로 비교했고, 사용자가 사진을 골랐다. 스펙 2·3·5·9절을 함께 고쳤다. 최종 리뷰의 I1(엔딩 내려다보기가 패널에 가림)은 이 추가 전에 고쳤다.

추가 전역 제약:
- 은하 이미지(`public/journey/galaxy.webp`)는 장면 안에서만 불러온다. WebGL을 못 쓰는 기기는 내려받지 않고, 받지 못하면 오류 경계가 3D만 빼고 본문은 그대로다
- 출처 표기(NASA/GSFC SVS, Gaia DR2: ESA/Gaia/DPAC)는 라이선스가 요구하는 글이라 "설명 문장 금지"의 예외로 엔딩 아래에 작게 둔다
- 하늘의 방향(은하수 띠가 1막 앞쪽과 전시실 기둥 사이에 보이도록 x축 1.2라디안)은 `lib/journey/space.ts`의 상수 하나로 둔다

### Task 11: 공간 열기

**Files:** `src/lib/journey/corridor.ts`·`corridor.test.ts`(2막·통로 높이 1.4, 전시실 벽 삭제), `src/components/journey/scene/stageMaterial.ts`·`stageMaterial.test.ts`(`hollowWire`: 청사진 단계에서 선 아닌 면을 버림), `src/components/journey/scene/buildCorridor.ts`·`buildCorridor.test.ts`(전시실 벽 제거, 벽 재질 `hollowWire`)

- [ ] 테스트를 먼저 고친다: 2막 단면 `{ halfWidth: 4.5, height: 1.4 }`, 통로 `{ 3, 1.4 }`, 전시실 벽 테스트 삭제, `buildCorridor` 메시 8개, 재질이 `uHollowWire`를 넘기고 셰이더에 청사진 단계의 `discard`가 있다. RED를 본다
- [ ] 구현하고 단위 전체·typecheck·eslint를 돌린다

### Task 12: 은하·별 먼지

**Files:** `scripts/build-galaxy.ts`(EXR → sRGB WebP), `public/journey/galaxy.webp`, `src/lib/journey/space.ts`·`space.test.ts`(씨앗 난수, 별 먼지 자리, 하늘 방향), `src/lib/journey/atmosphere.ts`·`atmosphere.test.ts`(`background` → `fogColor`, `galaxy` 밝기 추가, 어두운 안개색), `src/components/journey/scene/Sky.tsx`(은하 배경), `Dust.tsx`(별 먼지), `Atmosphere.tsx`(배경색 대신 은하 밝기), `Scene.tsx`, `src/components/journey/JourneyContent.tsx`(출처), `e2e/journey.e2e.ts`

- [ ] 테스트를 먼저 쓴다: 별 먼지가 회랑 벽·전시실 반지름 안에 있고 같은 씨앗이면 같은 자리, 막마다 은하 밝기와 어두운 안개색, e2e "WebGL이 없으면 은하 이미지를 내려받지 않는다", "은하 이미지를 받지 못해도 본문과 진행 막대가 동작한다", 엔딩에 출처 링크. RED를 본다
- [ ] 구현하고 단위·typecheck·eslint·e2e 전체를 돌린다

### Task 13: 검증과 시각 검토

- [ ] 빌드, 성능 두 번(둘째를 기록)과 첫 30 스크롤 프레임을 넣은 측정(최종 리뷰 M6), GPU 창 캡처 9장을 사용자에게 보인다
