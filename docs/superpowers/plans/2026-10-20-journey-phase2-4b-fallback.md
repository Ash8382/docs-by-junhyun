# 여정(Journey) 2-4b 구현 계획 — 강등과 2D 안전망

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 3D가 실패하거나 성능이 낮은 기기에서도 채용 담당자가 프로젝트 정보를 읽고 원하는 곳으로 갈 수 있다. 같은 본문을 2D 세로 타임라인으로 바꿔 보이고, 실행 중 강등(전체 → 경량 → 최소 → 2D)·컨텍스트 손실·장면 실패를 2D로 받으며, 진행 막대에 붙인 수동 전환과 자동 2D 알림, 움직임 줄이기를 둔다.

**Architecture:** three를 쓰지 않는 순수 모듈이 셋이다.
- `lib/journey/journeyMode.ts`: 보기 방식(3D·2D)·3D 품질 단계(전체·경량·최소)·2D가 된 이유의 상태. 처음 결정(기억한 수동 선택·기기 단계·WebGL2)과 전환 규칙(한 방향 강등, 실패, 수동 전환)은 순수 함수, 저장소는 구독형이다.
- `lib/journey/downgrade.ts`: 실행 중 강등 판정(2초 창 fps, 단계별 기준, 세지 않는 때).
- `lib/journey/motion.ts`: 움직임 줄이기 설정 읽기와 구독.

본문과 장면 쪽 구성은 다음과 같다.
- 모드를 바꾸는 일은 `components/journey/modeSwitch.ts`의 `applyMode` 하나가 맡는다: 보던 카드를 구해 모드를 바꾸고, 배치가 바뀌었다고 알려(Lenis·ScrollTrigger가 다시 잰다) 새 배치에서 그 카드 자리로 스크롤한다. 수동 전환(`switchView`)은 고른 것을 기억한다.
- `JourneyStage`는 3D일 때만 장면을 띄우고, 2D면 `<html data-journey-mode="2d" data-journey-reason>`를 붙인다. 2D 배치는 `globals.css`가 이 표지로만 바꾼다(본문 DOM은 하나). 2D를 기억한 방문자는 `app/journey/page.tsx`의 인라인 스크립트가 처음 그릴 때부터 표지를 건다.
- 진행 막대(`ProgressRail`)는 3D 막대 끝의 "2D로 보기"와 2D 막 탭(시작·협업·현재·연락처, "3D로 보기", 자동 2D 알림)을 둘 다 그리고 표지로 하나만 보인다.
- 장면은 품질 단계 표(`LEVEL_QUALITY`)를 따르고(`Effects`가 배율·블룸을 그 자리에서 바꾼다), `Warmup`의 렌더 단계가 강등을 감시한다. 실패(컨텍스트 손실·셰이더·렌더러·청크)는 장면 상태의 실패 종류로 남고 2D가 된다.

**계획을 쓰며 확인한 것(사본 구현과 검증):**
- 이 계획의 코드는 HEAD(`01ebf3b`, 스펙 5차 개정)에 태스크마다 커밋하며 구현했다(사본 `scratchpad/v24a` 브랜치 `plan24b`). 이 계획의 "찾을 부분 → 바꿀 내용"을 기준 상태에 차례로 적용하면 각 태스크의 결과와 글자 하나까지 같아진다. 생성기로 확인했다.
- 실패 단계의 기대 출력은 직전 태스크의 코드에 그 태스크의 테스트만 얹어 돌린 결과다(Task 4·6의 Review Focus 테스트처럼 사본 이력을 정리하며 더한 것은 같은 원인으로 실패함을 따져 적었다).
- 통과한 검사: 단위 427개(전 409, 태스크별 418 → 424 → 424 → 426 → 426 → 426 → 426 → 426 → 427), 타입 검사, 바꾼 파일 eslint 0, e2e 232 통과·10 건너뜀(전 184·10. 새 테스트 24개 × 두 프로젝트, 실패 경로 일곱의 기대를 2D로 바꿈).
- 휴대폰 2D(412×839) 문서 높이 18.7화면 → 5.1화면, 데스크톱 1440×900 18.7 → 4.4화면.
- `next dev`(127.0.0.1:3102): StrictMode에서 `state: none loading: failed`(`isReady`·`alpha` 오류) → 끈 뒤 `state: ready`, 캔버스 1개.
- 강등 재현(`?debug=stats&busy=50`, e2e 헤드리스): full → lite → min → 2D가 각 약 3초(유예 1초 + 창 2초)마다 차례로 일어나고, 최소에서 블룸 0단계, 2D가 되면 알림과 보던 카드(위끝 104px)가 남는다.

**스펙과 다르게 또는 더 구체적으로 정한 점(사용자 검토 대상, 스펙 4·5·8·9·10절에 반영해 이 계획과 함께 커밋한다):**
1. **`next dev` 실패의 원인과 해결.** 스펙은 "우리가 내린 렌더러의 손실을 실패로 잡지 않게 고친다"였다. 실제로는 감지가 아니라 진짜 손실이었다: StrictMode가 `Canvas`를 내렸다 다시 올리면 R3F 9.4가 내릴 때 예약한 정리(500ms 뒤 `forceContextLoss`·`dispose`)가 다시 올린 `Canvas`가 쓰는 같은 렌더러의 컨텍스트를 끊었다. 개발 모드의 StrictMode를 끈다(`reactStrictMode: false`, 프로덕션에는 두 번 마운트가 없다. 사이트 전체의 개발 모드 검사가 하나 준다). 프로덕션에서 장면을 내릴 때의 손실은 감시가 먼저 풀려 잡히지 않음을 3D → 2D → 3D e2e로 확인한다.
2. **자동화 브라우저에서는 실행 중 강등을 하지 않는다**(`navigator.webdriver`, 확인용 `busy`가 있으면 예외). e2e의 기본 헤드리스는 GPU 없이 소프트웨어로 그려 28fps보다 느려, 다른 검사 도중 단계가 바뀌면 블룸을 다시 만들며 "준비 뒤 셰이더 프로그램이 늘지 않는다" 같은 검사가 흔들렸다. 캡처·`check:holograms`·`perf:journey`도 단계가 바뀌지 않아 결과가 일정하다. 실제 방문자에게는 영향이 없다.
3. **측정 오버레이(`?debug=perf`) 중에는 단계를 바꾸지 않는다.** 휴대폰 측정의 p95·p99가 여러 단계의 프레임으로 섞이지 않게 한다.
4. **모드는 처음 읽는 곳에서 정한다**(`getJourneyMode`). 하이드레이션 때 자식(진행 막대)의 effect가 `JourneyStage`보다 먼저 돌아 정해지지 않은 값을 읽었고, 자동 2D 알림이 뜨지 않았다.
5. **보던 카드 지키기의 세부.** ① 모드를 바꾼 직후 한 번, React가 다시 그린 다음 프레임에 한 번 더 맞춘다(2D로 바뀌면 2막 썸네일이 다시 보여 위쪽이 405px 늘어났다). ② 상세 패널이 열려 스크롤이 잠겨 있으면(Lenis의 `lenis-stopped`가 `<html>` 스크롤을 막는다) 닫힐 때 맞춘다(`engine.whenUnlocked`). ③ 2D에서 지키는 카드는 전환 없이 곧바로 보이고(`data-revealed="instant"`), 자리는 등장 전 transform(아래 20px)과 상관없이 잰다(`offsetTop`). 그러지 않으면 20px 위에 멈췄다.
6. **2D 막 탭.** 보이는 글은 "시작·협업·현재·연락처", 이름은 "1막 시작으로 이동"·"2막 협업으로 이동"·"3막 현재로 이동"·"연락처로 이동"(보이는 글을 이름이 품는다). 지금 읽는 막은 스크롤마다 고친다(진행률은 본문 끝에서 1로 멈춰 연락처까지 내려가는 동안 바뀌지 않는다). 맨 끝까지 내려가면 연락처다. Lenis `scrollTo(요소)`는 `scroll-margin-top`을 스스로 빼므로 2D 섹션의 6.5rem 여백이 탭·공유 주소·모드 전환에 함께 쓰인다.
7. **3D 막대의 전환 버튼은 보이는 글 "2D", 이름 "2D로 보기"다.** 세로 막대 폭이 늘면 오른쪽 가장자리 자리(x 1200 넘게)를 지키지 못한다. 서버는 3D 막대와 2D 막 탭을 둘 다 그리고 `<html>` 표지로 하나만 보인다(2D를 기억한 방문자도 처음 그릴 때부터 막 탭).
8. **실행 중 배율을 바꾸면 후처리 버퍼 크기를 직접 다시 잡는다.** `@react-three/postprocessing`의 `EffectComposer`는 캔버스 크기가 바뀔 때만 `setSize`를 불러, 배율만 바뀌면 버퍼가 예전 해상도로 남아 GPU 비용이 줄지 않는다.
9. **e2e 서버를 `127.0.0.1`에만 연다**(`playwright.config.ts`). 이 맥이 공인 주소에 바로 붙어 있고 방화벽이 꺼져 있어, `0.0.0.0`으로 열면 테스트하는 동안 인터넷에 열렸다(2026-10-19 확인). 이 계획의 서버 명령도 모두 `-H 127.0.0.1`이다.
10. **공유 주소의 첫 스크롤은 한 프레임 미룬다**(`ProjectDialog`). 하이드레이션 때 2D가 되는 기기는 2D 표지가 패널의 effect보다 늦게 걸려, 3D 배치 기준으로 스크롤한 뒤 배치가 바뀌었다.
11. **세로 화면 입구 카드의 아래 여백은 `5svh + 3.5rem`이다.** 서버가 그린 배치에서 본문은 헤더(3.5rem) 아래에서 시작해 `5svh`로는 고정 자리보다 57px 아래였다.
12. **`QUALITY`·`sceneQuality`를 `LEVEL_QUALITY`(품질 단계: 배율·블룸)와 `galaxyFor`(기기 단계: 은하)로 나눈다.** 은하는 실행 중 강등이 다시 내려받지 않는다.
13. **움직임 줄이기의 상세 시트**는 `max-sm:motion-safe:animate-[…]`로 건다(`motion-reduce:animate-none`은 Tailwind 4의 변형 순서에서 `max-sm:`에 졌다). 2D 등장을 끄는 CSS는 등장 규칙과 같은 우선순위로 쓴다.

**넘기는 것:**
- 2-4c: 접근성 검사(axe), 2-4a 리뷰에서 넘긴 여섯(스펙 10절), 휴대폰 가로 배치, 실기기 재검증 여부, main 병합.

**Tech Stack:** Next 16 App Router, React 19, TypeScript, three 0.181.2, @react-three/fiber 9.4.0(`setDpr`), @react-three/postprocessing 3.0.4(postprocessing 6.38), Tailwind 4(`portrait:`·`max-sm:`·`motion-safe:`), lenis 1.3.26(`allowNestedScroll`·`smoothWheel`), gsap ScrollTrigger, vitest 4, @playwright/test 1.63(`reducedMotion`·`route`)

**Spec:** `docs/superpowers/specs/2026-10-14-journey-design.md`
- 반영된 개정: 2026-10-20 5차 개정(`01ebf3b`)과, 이 계획과 함께 커밋하는 정정(위 1~13).
- 다루는 절: 1절 2-4b 완료 조건, 2절 진행 표시, 4절 모듈·적응형 품질, 5절 실행 중 강등·컨텍스트 손실과 장면 실패·수동 전환·자동 2D 알림·모드 전환·처음 그리기·움직임 줄이기·2D 레이아웃·실패 대응, 7절 지키는 것, 8절 2-4b 테스트, 9절 2-4b 결정, 10절 `next dev`.
- 2단계 계획 가운데 일곱째다. 2-1부터 2-4a까지 완료했고, **2-4b 강등과 2D 안전망이 이 문서**다. 다음은 2-4c 접근성·마감·병합이다.

## Global Constraints

- **범위:** 2D 세로 타임라인, 실행 중 강등, 컨텍스트 손실·장면 실패의 2D 전환, 수동 전환·알림·처음 그리기, 움직임 줄이기, `next dev`, 2-4a에서 미룬 넷만 한다. 접근성 검사·넘긴 다듬기·휴대폰 가로 배치(2-4c)는 하지 않는다
- **3D 화면은 그대로다:** 움직임 줄이기가 아닌 3D의 장면·카메라·본문 배치를 바꾸지 않는다. 데스크톱 풍경 12장면 캡처가 2-4a 완료 때와 같아야 한다
- **기기 판별과 실행 중 강등을 섞지 않는다(사용자):** 판별(`capability.ts`)은 처음 단계만 정하고, 강등(`journeyMode.downgrade`)은 그 단계에서 한 방향으로만 내린다
- **3D와 2D는 같은 데이터를 쓴다(사용자):** 정류장 순서·링크·해시·진행 상태를 같은 본문 DOM과 `STOPS`에서 읽는다. 2D 전용 본문을 따로 만들지 않는다
- **같은 진행률이면 같은 장면:** 세로·가로 카메라 목표는 진행률의 순수 함수 그대로다(움직임 줄이기는 감쇠만 끈다)
- **의존성을 더하지 않는다**
- **시계 하나:** `/journey`에서 프레임을 도는 것은 GSAP ticker 하나뿐이다. 강등 감시는 그 렌더 단계 안에서 한다. 예외는 `?debug=perf` 측정 오버레이다
- **스크롤 중 React 렌더 금지:** 진행 막대 채움·2D 막 탭의 `aria-current`·고정 카드·2D 등장은 DOM 속성·CSS 변수로만 고친다
- **three·`@react-three/*` import는 `src/components/journey/scene/` 안에서만 한다.** `src/lib/journey/`는 three 없는 순수 코드다
- **React Compiler 계열 린트 규칙이 에러로 켜져 있다**(`react-hooks/set-state-in-effect`, `immutability`, `refs` 등): effect 본문에서 곧바로 상태를 바꾸지 않고(구독 콜백에서 바꾼다), 훅이 돌려준 값을 컴포넌트에서 직접 고치지 않는다(함수 안에서 고친다)
- **설명 문장(카피)을 넣지 않는다(사용자 결정, 2026-10-14).** 화면 글은 막 탭 이름, "2D로 보기"·"3D로 보기", 알림 "기기에 맞춰 2D로 바꿨어요"뿐이다(설계 승인)
- **명령 실행:** Bash 검증 명령에는 `rtk proxy`를 붙이고 exit code를 믿는다. 파일은 Read 도구로 읽는다. `npx tsx`·`npm run x -- 인자`는 rtk가 망가뜨리므로 `rtk proxy npm run <스크립트>`나 `rtk proxy npx tsx`로 실행하고, 인자는 환경 변수로 넘긴다. zsh에서 `$var:path`는 수정자로 해석되므로 `${var}:path`로 쓴다
- **기계 자원(2026-10-14 강제 재부팅 뒤 규칙):** 무거운 명령(Playwright, `next build`, vitest, `tsc`)은 하나씩 차례로 돌리고 백그라운드나 병렬로 돌리지 않는다. 그런 명령 전에 `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`로 다른 프로젝트의 무거운 작업이 없는지 확인하고, 있으면 끝날 때까지 기다린다(15초 간격, 10분 넘으면 BLOCKED). 사용자의 다른 프로젝트 개발 서버(`next dev -p 3010`, `3000`)는 무거운 작업으로 세지 않고 건드리지 않는다. vitest는 늘 `--maxWorkers=4`로 돌린다. 띄운 서버는 `lsof -t -iTCP:<포트> -sTCP:LISTEN`으로 찾은 PID만 끈다(`pkill -f next-server`처럼 넓은 패턴 금지)
- **서버는 이 맥 안에서만 연다:** `next start`·`next dev`에는 늘 `-H 127.0.0.1`을 붙이고, 확인 주소도 `http://127.0.0.1:<포트>`다(머리말 9). e2e는 Task 3부터 `playwright.config.ts`가 그렇게 연다
- **브라우저 확인은 프로덕션 빌드로 한다:** `rtk proxy npx next build && rtk proxy npx next start -H 127.0.0.1 --port 3200`. `next dev`는 Task 3부터 장면이 준비된다(확인용으로만 쓴다)
- **브라우저 창을 띄우지 않는다(사용자 요청):** 캡처는 `CAPTURE_HEADLESS=1`, `check:holograms`는 `CHECK_HEADLESS=1`(새 헤드리스, GPU)로 돌린다. `perf:journey`만 창이 필요하다(띄우기 전에 사용자에게 알린다)
- **Playwright는 시작할 때 `test-results/`를 비운다.** 캡처를 거기 둔 채 e2e를 돌리면 사라진다. 캡처는 먼저 다른 곳으로 옮긴다
- **커밋하지 않는다.** 에이전트는 `git add`/`commit`/`stash`/`reset`/`checkout`/`restore`를 실행하지 않는다. 각 태스크 마지막 단계는 파일별 변경 표와 커밋 메시지 초안 제출이다(`type: 한국어 요약` + 이유를 적는 `- ` 불릿, 트레일러 없음). 사용자는 모든 태스크가 끝날 때까지 커밋을 보류할 수 있다
- **휴대폰 실측은 하지 않는다(사용자 결정, 2026-10-19).** 휴대폰 확인은 맥의 창 없는 에뮬레이션(WebKit `iPhone 14`, Chromium `Pixel 7`)으로 하고 실측과 섞지 않는다
- 기존 스타일을 따른다: 한국어 주석, `function` 선언형 컴포넌트. 단위 테스트는 소스 옆 `*.test.ts`, e2e는 `e2e/*.e2e.ts`. 대소문자만 다른 파일 이름을 같은 폴더에 두지 않는다

## Review Focus

1. **상세 패널이 열린 채 자동으로 2D가 되는 경우.** 컨텍스트 손실이나 실행 중 강등은 상세를 보는 도중에도 일어난다. 사람은 상세가 그대로 열려 있고, 닫으면 보던 정류장 카드와 링크로 돌아오기를 기대한다(스크롤이 잠긴 동안에는 스크롤 위치를 바꿀 수 없다) → Task 4 e2e "상세가 열린 채 컨텍스트를 잃어도 2D로 바뀌고…", 단위 "잠겨 있으면 풀릴 때 한 번 부르고…"
2. **저장소가 막힌 브라우저(사생활 보호 창, 차단 설정).** localStorage가 예외를 던져도 처음 그리기 스크립트·모드 결정·수동 전환이 오류 없이 동작하고, 기억하지 못할 뿐이어야 한다 → Task 6 e2e "저장소가 막힌 브라우저에서도 2D로 보기가 되고…"
3. **3D와 2D를 여러 번 오가기.** 수동으로 2D → 3D로 돌아오면 장면을 새로 올리는데, 우리가 내린 첫 렌더러의 손실(R3F가 500ms 뒤 일으킨다)이 새 장면을 2D로 되돌리면 안 되고, 보던 카드가 양쪽 배치에서 같은 자리여야 한다 → Task 6 e2e "3D에서 2D로 보기를 누르면 보던 카드가…그대로 남는다"(2D 카드 위끝 104px, 1.5초 뒤에도 준비 상태)
4. **2D에서 끝과 공유 주소.** 맨 끝(연락처)까지 가면 진행률이 멈추고, 하이드레이션 때 2D가 되는 기기는 공유 주소(`#tix2u`)로 열면 3D 배치 기준으로 스크롤된 뒤 배치가 바뀐다 → Task 6 e2e "2D 막 탭을 누르면…연락처…aria-current", "2D에서 공유 주소로 열면 그 정류장으로 간다"
5. **자동 2D 뒤 다시 고른 3D.** 느린 기기에서 3D로 돌아가면 2초 만에 다시 2D로 떨어지면 안 되고(고른 것을 존중), 최소 단계에서 시작해야 한다 → Task 7 e2e "프레임을 일부러 늦추면…고른 3D는 최소부터 2D로 내리지 않는다"

---

## 파일 구조

| 파일 | 책임 |
|---|---|
| `src/lib/journey/journeyMode.ts` | (새) 보기 방식·품질 단계·이유 상태, 처음 결정과 전환 규칙(순수), 저장소·localStorage(브라우저) |
| `src/lib/journey/downgrade.ts` | (새) 실행 중 강등 판정(2초 창 fps, 기준, 세지 않는 때) |
| `src/lib/journey/motion.ts` | (새) 움직임 줄이기 설정 읽기·구독 |
| `src/lib/journey/capability.ts` | 품질 단계 표(`LEVEL_QUALITY`)와 은하 선택(`galaxyFor`)으로 바꾼다 |
| `src/lib/journey/sceneStatus.ts` | 실패 종류(컨텍스트 손실·장면 실패) |
| `src/lib/journey/engine.ts` | 스크롤 잠금이 풀리면 부르기(`whenUnlocked`) |
| `src/lib/journey/portrait.ts` | 정류장 홀로그램 자리 기억 |
| `src/components/journey/modeSwitch.ts` | (새) 모드 전환(보던 카드 지키기, 배치 알림), 수동 전환 |
| `src/components/journey/flatReveal.ts` | (새) 2D 등장(IntersectionObserver) |
| `src/components/journey/JourneyStage.tsx` | 모드 구독, 3D일 때만 장면, `<html>` 표지, 실패 → 2D, 등장 |
| `src/components/journey/ProgressRail.tsx` | 3D 막대의 "2D로 보기", 2D 막 탭·"3D로 보기"·자동 2D 알림 |
| `src/components/journey/JourneyContent.tsx` | 정류장 높이 CSS 변수, 막 색, 세로 입구 자리 |
| `src/components/journey/portraitCards.ts` | 모드를 따라 고정을 켜고 끔 |
| `src/components/journey/HologramThumbnail.tsx` | 2D면 썸네일을 보임 |
| `src/components/journey/useJourneyScroll.ts` | 배치 알림에 다시 재기, 움직임 줄이기의 휠 |
| `src/components/journey/ProjectDialog.tsx` | 공유 주소 첫 스크롤 한 프레임 뒤, 휴대폰 상세 시트 |
| `src/components/journey/SceneLoading.tsx` | 세로 화면 로딩 줄 자리 |
| `src/components/journey/scene/watchRenderer.ts` | 컨텍스트 손실을 실패 종류로 |
| `src/components/journey/scene/Warmup.tsx` | 렌더 단계의 강등 감시, `busy` |
| `src/components/journey/scene/Effects.tsx` | 품질 단계로 블룸·배율, 배율이 바뀌면 컴포저 크기 |
| `src/components/journey/scene/Scene.tsx` | 처음 배율을 품질 단계로, 캔버스 틀 100vh |
| `src/components/journey/scene/Sky.tsx` | 은하를 기기 단계로(`galaxyFor`) |
| `src/components/journey/scene/CameraRig.tsx` | 움직임 줄이기면 감쇠 끔, 카메라 뒤처짐 통계 |
| `src/components/journey/scene/Streaks.tsx`, `Dust.tsx` | 움직임 줄이기면 감춤·멈춤 |
| `src/components/journey/scene/frameStats.ts` | 품질 단계·카메라 뒤처짐·빛줄기 통계, `busyMs` |
| `src/app/journey/page.tsx` | 처음 그리기 스크립트 |
| `src/app/globals.css` | 2D 배치·막 탭·등장·지키는 카드·움직임 줄이기·상세 시트 키프레임 |
| `next.config.ts`, `playwright.config.ts` | 개발 모드 StrictMode 끔, e2e 서버 127.0.0.1 |
| `e2e/journey.e2e.ts` | 2-4b 동작 테스트, 실패 경로 일곱의 기대를 2D로 |

---


### Task 1: 모드 상태(`journeyMode.ts`)

스펙 5절 "실행 중 강등"·"수동 전환"·"모드 전환"의 판정이다. 보기 방식(3D·2D), 3D 품질 단계(전체·경량·최소), 2D가 된 이유(기기·수동·느림·컨텍스트 손실·장면 실패)를 하나의 상태로 둔다. 처음 결정(`initialMode`)은 기억한 수동 선택이 기기 단계보다 앞서되 WebGL2가 없으면 2D다. 그 뒤에는 실행 중 강등(`downgrade`, 한 방향·한 단계씩, 최소 다음은 2D), 실패(`fail`, 언제나 2D), 수동 전환(`choose`)으로만 바뀐다. 느려서 2D였다가 3D를 고르면 최소부터, 자동 2D 뒤 3D를 고르면 이번 방문에는 2D로 내리지 않는다(`keep3d`). 브라우저 쪽은 저장소(구독형, `sceneStatus`와 같은 모양)와 localStorage 읽기·쓰기다. `getJourneyMode`는 처음 읽을 때 기기 단계와 기억한 선택으로 정한다(하이드레이션 때 자식 컴포넌트의 effect가 먼저 돌아도 같은 결정을 받는다, 계획 머리말 4).

**Files:**
- Create: `src/lib/journey/journeyMode.test.ts`, `src/lib/journey/journeyMode.ts`

**Interfaces:**
- Consumes: `detectTier()`·`Tier`(capability.ts), `hasWebGL2()`(webgl.ts)
- Produces: `type View = "3d" | "2d"`, `type QualityLevel = "full" | "lite" | "min"`, `type Reason = "tier" | "manual" | "slow" | "context-lost" | "failed"`, `interface JourneyMode { view; quality; base; reason; keep3d }`, `initialMode(tier, stored: View | null, webgl2): JourneyMode`, `downgrade(mode)`, `fail(mode, reason: "context-lost" | "failed")`, `isAutoFlat(mode): boolean`, `choose(mode, view)`, `VIEW_KEY = "journey-view"`, `getJourneyMode(): JourneyMode`(브라우저), `getServerJourneyMode(): null`, `setJourneyMode(next)`, `subscribeJourneyMode(listener): () => void`, `storedView(): View | null`, `storeView(view)`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/lib/journey/journeyMode.test.ts` 전체:

```ts
import { describe, expect, it } from "vitest";
import { choose, downgrade, fail, initialMode, isAutoFlat, type JourneyMode } from "./journeyMode";

const FULL: JourneyMode = initialMode("full", null, true);

describe("처음 결정(스펙 5절 \"수동 전환\", 2-4b)", () => {
  it("기억한 선택이 없으면 기기 단계를 따른다: 전체·경량은 그 품질의 3D, 2D 단계는 2D(이유: 기기)", () => {
    expect(FULL).toEqual({ view: "3d", quality: "full", base: "full", reason: null, keep3d: false });
    expect(initialMode("lite", null, true)).toMatchObject({ view: "3d", quality: "lite", base: "lite" });
    expect(initialMode("2d", null, true)).toMatchObject({ view: "2d", reason: "tier" });
  });

  it("기억한 수동 선택이 기기 단계보다 앞선다. 메모리·데이터 절약으로 2D인 기기도 3D를 고를 수 있다(경량)", () => {
    expect(initialMode("full", "2d", true)).toMatchObject({ view: "2d", reason: "manual" });
    expect(initialMode("2d", "3d", true)).toMatchObject({ view: "3d", quality: "lite", reason: null });
  });

  it("WebGL2가 없으면 기억한 선택과 관계없이 2D다", () => {
    expect(initialMode("2d", "3d", false)).toMatchObject({ view: "2d", reason: "tier" });
  });
});

describe("실행 중 강등(5절 표)", () => {
  it("전체 → 경량 → 최소 → 2D(이유: 느림)로 한 단계씩만 내려가고, 2D에서는 그대로다", () => {
    const lite = downgrade(FULL);
    const min = downgrade(lite);
    const flat = downgrade(min);
    expect([lite.quality, min.quality]).toEqual(["lite", "min"]);
    expect(flat).toMatchObject({ view: "2d", reason: "slow", quality: "min" });
    expect(downgrade(flat)).toBe(flat);
  });

  it("컨텍스트 손실·장면 실패는 단계와 관계없이 바로 2D다", () => {
    expect(fail(FULL, "context-lost")).toMatchObject({ view: "2d", reason: "context-lost", quality: "full" });
    expect(fail(downgrade(FULL), "failed")).toMatchObject({ view: "2d", reason: "failed" });
  });
});

describe("수동 전환", () => {
  it("2D를 고르면 이유가 수동이고, 다시 3D를 고르면 기기 단계부터이며 2D 강등은 그대로 한다", () => {
    const flat = choose(FULL, "2d");
    expect(flat).toMatchObject({ view: "2d", reason: "manual" });
    const back = choose(flat, "3d");
    expect(back).toEqual({ view: "3d", quality: "full", base: "full", reason: null, keep3d: false });
    expect(downgrade(downgrade(downgrade(back))).view).toBe("2d");
  });

  it("느려서 2D가 된 뒤 3D를 고르면 최소부터이고, 이번 방문에는 2D로 내리지 않는다(품질은 최소에 머문다)", () => {
    const slow = downgrade(downgrade(downgrade(FULL)));
    const back = choose(slow, "3d");
    expect(back).toMatchObject({ view: "3d", quality: "min", keep3d: true });
    expect(downgrade(back)).toBe(back);
  });

  it("컨텍스트 손실 뒤 3D를 고르면 기기 단계부터이고, 다시 잃으면 그래도 2D다", () => {
    const back = choose(fail(downgrade(FULL), "context-lost"), "3d");
    expect(back).toMatchObject({ view: "3d", quality: "full", keep3d: true });
    expect(downgrade(downgrade(back)).view).toBe("3d");
    expect(fail(back, "context-lost").view).toBe("2d");
  });

  it("자동으로 2D가 된 것만 알림 대상이다", () => {
    expect(isAutoFlat(downgrade(downgrade(downgrade(FULL))))).toBe(true);
    expect(isAutoFlat(fail(FULL, "failed"))).toBe(true);
    expect(isAutoFlat(choose(FULL, "2d"))).toBe(false);
    expect(isAutoFlat(initialMode("2d", null, true))).toBe(false);
    expect(isAutoFlat(FULL)).toBe(false);
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4 src/lib/journey/journeyMode.test.ts`
Expected: FAIL — `Error: Cannot find module './journeyMode' imported from …/journeyMode.test.ts`(Tests no tests)

- [ ] **Step 3: 모듈을 쓴다**

`src/lib/journey/journeyMode.ts` 전체:

```ts
import { detectTier, type Tier } from "./capability";
import { hasWebGL2 } from "./webgl";

/**
 * 여정의 보기 방식(스펙 5절 "실행 중 강등", "수동 전환", "모드 전환", 2-4b). 처음 결정은 기기 단계와 기억한 수동 선택으로 한 번 하고,
 * 그 뒤에는 실행 중 강등(downgrade)·실패(fail)·수동 전환(choose)으로만 바뀐다. 기기 판별(capability.ts)은 처음 단계만 정하고 강등과 섞지 않는다.
 * 판정은 순수 함수이고, 브라우저 값을 읽고 쓰는 일은 getJourneyMode·storedView·storeView가 한다. 3D 코드를 import하지 않아 본문 쪽 컴포넌트도 쓴다.
 */
export type View = "3d" | "2d";
/** 3D 품질 단계: 전체 → 경량 → 최소(해상도 배율 1, 블룸 끔) */
export type QualityLevel = "full" | "lite" | "min";
/** 2D가 된 이유: 기기 단계, 수동, 느림(실행 중 강등), 컨텍스트 손실, 장면 실패 */
export type Reason = "tier" | "manual" | "slow" | "context-lost" | "failed";

export interface JourneyMode {
  view: View;
  /** 3D 품질 단계. 2D일 때는 2D가 되기 전의 단계 */
  quality: QualityLevel;
  /** 기기 단계가 정한 처음 품질(3D로 돌아갈 때 쓴다) */
  base: QualityLevel;
  /** 2D가 된 이유. 3D면 null */
  reason: Reason | null;
  /** 자동으로 2D가 된 뒤 방문자가 3D를 다시 골랐다: 이번 방문에는 2D로 강등하지 않는다(품질은 내린다) */
  keep3d: boolean;
}

const NEXT_LEVEL: Record<QualityLevel, QualityLevel | null> = { full: "lite", lite: "min", min: null };
const AUTO_REASONS: readonly Reason[] = ["slow", "context-lost", "failed"];

/** 처음 결정: 기억한 수동 선택이 기기 단계보다 앞선다. WebGL2가 없으면 2D다 */
export function initialMode(tier: Tier, stored: View | null, webgl2: boolean): JourneyMode {
  const base: QualityLevel = tier === "full" ? "full" : "lite";
  const common = { quality: base, base, keep3d: false };
  if (!webgl2) return { ...common, view: "2d", reason: "tier" };
  if (stored === "2d") return { ...common, view: "2d", reason: "manual" };
  if (stored === "3d" || tier !== "2d") return { ...common, view: "3d", reason: null };
  return { ...common, view: "2d", reason: "tier" };
}

/** 실행 중 강등 한 단계. 최소에서 더 내리면 2D(이유: 느림). 자동 2D 뒤 방문자가 3D를 다시 골랐으면 최소에 머문다 */
export function downgrade(mode: JourneyMode): JourneyMode {
  if (mode.view !== "3d") return mode;
  const next = NEXT_LEVEL[mode.quality];
  if (next) return { ...mode, quality: next };
  return mode.keep3d ? mode : { ...mode, view: "2d", reason: "slow" };
}

/** 컨텍스트 손실·장면 실패. 3D를 그릴 수 없으므로 언제나 2D다 */
export function fail(mode: JourneyMode, reason: "context-lost" | "failed"): JourneyMode {
  return mode.view === "3d" ? { ...mode, view: "2d", reason } : mode;
}

/** 자동으로 2D가 됐다(느림·컨텍스트 손실·장면 실패). 알림을 띄운다 */
export function isAutoFlat(mode: JourneyMode): boolean {
  return mode.view === "2d" && mode.reason !== null && AUTO_REASONS.includes(mode.reason);
}

/**
 * 수동 전환. 3D로 돌아갈 때 느려서 2D였으면 최소부터, 그 밖에는 기기 단계부터 시작한다. 자동으로 2D가 된 뒤 3D를 고르면 이번 방문에는
 * 2D로 강등하지 않는다(고른 것이 2초 만에 무시되지 않게)
 */
export function choose(mode: JourneyMode, view: View): JourneyMode {
  if (view === mode.view) return mode;
  if (view === "2d") return { ...mode, view: "2d", reason: "manual" };
  return {
    ...mode,
    view: "3d",
    reason: null,
    quality: mode.reason === "slow" ? "min" : mode.base,
    keep3d: mode.keep3d || isAutoFlat(mode),
  };
}

// ── 저장소(브라우저) ─────────────────────────────────────────

/** 수동 선택을 기억하는 localStorage 키. 처음 그리기 스크립트(app/journey/page.tsx)도 같은 키를 읽는다 */
export const VIEW_KEY = "journey-view";

let current: JourneyMode | null = null;
const listeners = new Set<() => void>();

/**
 * 이 페이지의 모드. 처음 읽을 때 기기 단계와 기억한 선택으로 한 번 정한다(브라우저에서만 부른다). 어디서 먼저 읽든 같은 결정이다.
 * 하이드레이션 때는 자식 컴포넌트의 effect가 JourneyStage보다 먼저 돌므로, 읽는 쪽마다 정해지지 않은 값을 받지 않게 한다
 */
export function getJourneyMode(): JourneyMode {
  current ??= initialMode(detectTier(), storedView(), hasWebGL2());
  return current;
}

/** 서버 렌더와 첫 하이드레이션에서는 아직 정하지 않았다 */
export function getServerJourneyMode(): JourneyMode | null {
  return null;
}

export function setJourneyMode(next: JourneyMode): void {
  if (next === current) return;
  current = next;
  for (const listener of listeners) listener();
}

export function subscribeJourneyMode(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** 기억한 수동 선택. 저장소가 막혀 있으면(사생활 보호 창 등) 없다 */
export function storedView(): View | null {
  try {
    const value = window.localStorage.getItem(VIEW_KEY);
    return value === "2d" || value === "3d" ? value : null;
  } catch {
    return null;
  }
}

export function storeView(view: View): void {
  try {
    window.localStorage.setItem(VIEW_KEY, view);
  } catch {
    // 기억하지 못해도 이번 방문의 전환은 그대로 된다
  }
}
```

- [ ] **Step 4: 통과를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4 src/lib/journey/journeyMode.test.ts`
Expected: PASS — `Tests  9 passed (9)`

- [ ] **Step 5: 전체 확인**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`·`3000`은 무시)

Run: `rtk proxy npx tsc --noEmit` → exit 0
Run: `rtk proxy npx vitest run --maxWorkers=4` → `Tests  418 passed (418)`
Run: `rtk proxy npx eslint src/lib/journey/journeyMode.ts src/lib/journey/journeyMode.test.ts` → exit 0, 문제 0(`baseline-browser-mapping` 안내 한 줄은 린트 결과가 아니다)

- [ ] **Step 6: 커밋 정리를 제출한다**

파일별 변경 표와 메시지 초안. 초안 예:

```
feat: 여정 보기 방식(3D·2D)과 품질 단계 상태 추가

- 기억한 수동 선택·기기 단계·WebGL2로 처음 모드를 정하고, 실행 중 강등·실패·수동 전환으로만 바꾼다(기기 판별과 강등을 섞지 않는다)
- 강등은 전체 → 경량 → 최소 → 2D로 한 방향이고, 자동 2D 뒤 고른 3D는 그 방문 동안 2D로 내리지 않는다
```

---

### Task 2: 실행 중 강등 판정(`downgrade.ts`)

스펙 5절 "실행 중 강등"의 재는 법이다. 프레임 시각을 받아 최근 2초 동안 그린 프레임 수로 fps를 재고, 2초 창이 다 찬 뒤 지금 단계의 기준(전체 45, 경량 28(스펙의 30을 28 아래로 잰다, 30Hz로 묶인 저전력 기기), 최소 24) 아래면 "내려라"라고 답한다. 한 프레임이 250ms를 넘으면 창을 비우고, 단계를 바꾼 직후·준비된 직후·탭이 가려졌을 때는 `holdWatch`로 1초 동안 세지 않는다. 순수 함수이고 시각은 부르는 쪽(Task 7의 렌더 단계)이 넘긴다.

**Files:**
- Create: `src/lib/journey/downgrade.test.ts`, `src/lib/journey/downgrade.ts`

**Interfaces:**
- Consumes: Task 1의 `QualityLevel`
- Produces: `DOWNGRADE = { windowMs: 2000, graceMs: 1000, gapMs: 250, below: { full: 45, lite: 28, min: 24 } }`, `interface FrameWatch { times; startedAt; holdUntil }`, `createWatch(): FrameWatch`, `holdWatch(watch, nowMs, forMs = 1000)`, `frameTooSlow(watch, nowMs, level): boolean`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/lib/journey/downgrade.test.ts` 전체:

```ts
import { describe, expect, it } from "vitest";
import { DOWNGRADE, createWatch, frameTooSlow, holdWatch } from "./downgrade";
import type { QualityLevel } from "./journeyMode";

/** 일정한 간격(ms)으로 seconds초 동안 프레임을 넘기고, 처음으로 "내려라"가 나온 시각(없으면 null)을 돌려준다 */
function run(level: QualityLevel, intervalMs: number, seconds: number, start = 0, watch = createWatch()): number | null {
  for (let time = start; time <= start + seconds * 1000; time += intervalMs) {
    if (frameTooSlow(watch, time, level)) return time;
  }
  return null;
}

describe("실행 중 강등 판정(스펙 5절)", () => {
  it("기준은 전체 45, 경량 30(재는 값 28), 최소 24이고 창은 2초다", () => {
    expect(DOWNGRADE.below).toEqual({ full: 45, lite: 28, min: 24 });
    expect(DOWNGRADE.windowMs).toBe(2000);
  });

  it("60Hz로 꾸준하면 어느 단계에서도 내려가지 않는다", () => {
    for (const level of ["full", "lite", "min"] as const) expect(run(level, 1000 / 60, 10), level).toBeNull();
  });

  it("30Hz로 묶인 기기(저전력 모드)는 경량에 머물고, 전체에서는 2초 창이 찬 뒤 내려간다", () => {
    expect(run("lite", 1000 / 30, 10)).toBeNull();
    const at = run("full", 1000 / 30, 10);
    expect(at).not.toBeNull();
    expect(at as number).toBeGreaterThanOrEqual(2000);
    expect(at as number).toBeLessThan(2100);
  });

  it("최소에서는 24fps 아래(20fps)면 내려가고 25fps면 머문다", () => {
    expect(run("min", 50, 5)).not.toBeNull();
    expect(run("min", 40, 10)).toBeNull();
  });

  it("한 프레임이 250ms를 넘으면(탭 전환·디버거) 창을 비우고 다시 2초를 잰다", () => {
    const watch = createWatch();
    expect(run("full", 1000 / 30, 1.5, 0, watch)).toBeNull();
    // 1.5초 뒤 0.4초 동안 프레임이 없었다. 다시 2초가 차기 전에는 내리지 않는다
    expect(run("full", 1000 / 30, 1.9, 1900, watch)).toBeNull();
    expect(run("full", 1000 / 30, 0.3, 3801, watch)).not.toBeNull();
  });

  it("단계를 바꾼 직후 1초(holdWatch)는 세지 않는다", () => {
    const watch = createWatch();
    holdWatch(watch, 0);
    expect(run("full", 1000 / 30, 2.9, 0, watch)).toBeNull();
    expect(run("full", 1000 / 30, 0.2, 3000, watch)).not.toBeNull();
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4 src/lib/journey/downgrade.test.ts`
Expected: FAIL — `Error: Cannot find module './downgrade' imported from …/downgrade.test.ts`(Tests no tests)

- [ ] **Step 3: 모듈을 쓴다**

`src/lib/journey/downgrade.ts` 전체:

```ts
import type { QualityLevel } from "./journeyMode";

/**
 * 실행 중 강등 판정(스펙 5절 "실행 중 강등", 2-4b). 최근 2초 동안 그린 프레임 수로 fps를 재고, 2초 창이 다 찬 뒤 그 fps가 지금 단계의
 * 기준 아래면 한 단계 내리라고 답한다. 순수 함수이고 시각은 부르는 쪽(장면의 렌더 단계)이 넘긴다.
 * - 경량의 기준 30은 28 아래로 잰다. 30Hz로 묶인 기기(아이폰 저전력 모드)는 정확히 30fps라 멀쩡해도 최소로 떨어진다
 * - 한 프레임이 250ms를 넘으면(탭 전환·디버거) 창을 비우고 다시 잰다
 * - 단계를 바꾼 직후 1초는 세지 않는다(holdWatch). 배율·블룸을 바꾸며 렌더 타깃과 효과 셰이더를 한 번 다시 만드는 끊김을 뺀다
 * - 장면이 준비되기 전과 탭이 가려진 동안은 부르는 쪽이 세지 않는다(가려지면 holdWatch)
 */
export const DOWNGRADE = {
  windowMs: 2000,
  graceMs: 1000,
  gapMs: 250,
  below: { full: 45, lite: 28, min: 24 } as Record<QualityLevel, number>,
} as const;

export interface FrameWatch {
  /** 창 안의 프레임 시각(ms) */
  times: number[];
  /** 지금 창을 재기 시작한 시각 */
  startedAt: number | null;
  /** 이 시각 전의 프레임은 세지 않는다 */
  holdUntil: number;
}

export function createWatch(): FrameWatch {
  return { times: [], startedAt: null, holdUntil: 0 };
}

/** 창을 비우고 nowMs부터 forMs 동안 세지 않는다(단계를 바꾼 직후, 준비된 직후, 탭이 가려졌을 때) */
export function holdWatch(watch: FrameWatch, nowMs: number, forMs: number = DOWNGRADE.graceMs): void {
  watch.times = [];
  watch.startedAt = null;
  watch.holdUntil = nowMs + forMs;
}

/** 프레임 하나를 센다. 2초 창이 다 찼고 그 동안의 fps가 지금 단계의 기준 아래면 true(한 단계 내린다) */
export function frameTooSlow(watch: FrameWatch, nowMs: number, level: QualityLevel): boolean {
  if (nowMs < watch.holdUntil) return false;
  const last = watch.times[watch.times.length - 1];
  if (last !== undefined && nowMs - last > DOWNGRADE.gapMs) {
    watch.times = [];
    watch.startedAt = null;
  }
  watch.startedAt ??= nowMs;
  watch.times.push(nowMs);
  while (watch.times[0] <= nowMs - DOWNGRADE.windowMs) watch.times.shift();
  if (nowMs - watch.startedAt < DOWNGRADE.windowMs) return false;
  return watch.times.length / (DOWNGRADE.windowMs / 1000) < DOWNGRADE.below[level];
}
```

- [ ] **Step 4: 통과를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4 src/lib/journey/downgrade.test.ts`
Expected: PASS — `Tests  6 passed (6)`

- [ ] **Step 5: 전체 확인**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`·`3000`은 무시)

Run: `rtk proxy npx tsc --noEmit` → exit 0
Run: `rtk proxy npx vitest run --maxWorkers=4` → `Tests  424 passed (424)`
Run: `rtk proxy npx eslint src/lib/journey/downgrade.ts src/lib/journey/downgrade.test.ts` → exit 0, 문제 0(`baseline-browser-mapping` 안내 한 줄은 린트 결과가 아니다)

- [ ] **Step 6: 커밋 정리를 제출한다**

파일별 변경 표와 메시지 초안. 초안 예:

```
feat: 여정 실행 중 강등 판정 추가

- 최근 2초 동안 그린 프레임 수로 fps를 재고, 전체 45·경량 28·최소 24 아래가 2초 이어지면 한 단계 내리라고 답한다
- 250ms 넘는 프레임(탭 전환)과 단계를 바꾼 직후 1초는 세지 않아 일회성 끊김으로 내려가지 않는다
```

---

### Task 3: 개발 서버에서 장면 준비(StrictMode)와 e2e 서버를 이 맥 안에서만

스펙 10절 "개발 서버에서 여정 장면이 실패한다"를 고친다. 원인은 감지가 아니라 실제 손실이다(계획 머리말 1): StrictMode가 `Canvas`를 내렸다 다시 올리면 R3F 9.4는 내릴 때 예약한 정리(500ms 뒤 `forceContextLoss`·`dispose`)를 그대로 실행하는데, 다시 올린 `Canvas`가 같은 렌더러를 써서 쓰고 있는 컨텍스트가 끊긴다(`isReady`·`alpha` 오류, 오류 경계가 장면을 내린다). 개발 모드의 StrictMode를 끈다(프로덕션에는 두 번 마운트가 없어 같다). 함께 e2e 서버를 `127.0.0.1`에만 연다. 지금은 `next start --port 3100`이 `0.0.0.0`으로 열려, 공인 주소에 바로 붙은 맥에서는 테스트하는 동안 인터넷에 열린다(2026-10-19 확인).

**Files:**
- Modify: `next.config.ts`, `playwright.config.ts`

**Interfaces:**
- Consumes: 없음
- Produces: `next.config.ts`의 `reactStrictMode: false`, e2e 기준 주소 `http://127.0.0.1:3100`

- [ ] **Step 1: 개발 서버에서 실패를 확인한다**

아래 스크립트를 작업 트리 밖(예: `.superpowers/sdd/<계획>/dev-check.cjs`)에 두고, 개발 서버를 이 맥 안에만 띄운 뒤 돌린다.

```js
const { createRequire } = require("node:module");
const { chromium } = createRequire(`${process.cwd()}/package.json`)("@playwright/test");
(async () => {
  const browser = await chromium.launch({ headless: true, channel: "chromium", args: ["--ignore-gpu-blocklist"] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("http://127.0.0.1:3102/journey");
  let state = null;
  for (let second = 0; second < 40 && state !== "ready" && state !== "failed"; second++) {
    await page.waitForTimeout(1000);
    state = await page.evaluate(() => document.querySelector("[data-journey-scene]")?.getAttribute("data-state") ?? null);
    if (state === null && (await page.evaluate(() => document.querySelector("[data-journey-loading]")?.getAttribute("data-journey-loading"))) === "failed") break;
  }
  console.log("state:", state ?? "none", "loading:", await page.evaluate(() => document.querySelector("[data-journey-loading]")?.getAttribute("data-journey-loading") ?? "none"));
  console.log("canvases:", await page.locator("canvas").count());
  console.log("errors:", JSON.stringify([...new Set(errors)]));
  await browser.close();
})();
```

Run: `rtk proxy npx next dev -H 127.0.0.1 --port 3102`(다른 터미널, `Ready`가 나오면)
Run: `node <dev-check.cjs 경로>`
Expected: `state: none loading: failed`, `canvases: 0`, `errors`에 `Cannot read properties of undefined (reading 'isReady')`와 `Cannot read properties of null (reading 'alpha')`가 있다(오류 경계가 장면을 내렸다)

- [ ] **Step 2: 개발 모드 StrictMode를 끄고 e2e 서버를 이 맥 안에만 연다**

`next.config.ts`에서 찾을 부분:

```ts
const nextConfig: NextConfig = {
  /* config options here */
  images: {
```

바꿀 내용:

```ts
const nextConfig: NextConfig = {
  // 개발 모드의 StrictMode는 컴포넌트를 한 번 내렸다 다시 올린다. R3F 9.4의 Canvas는 내릴 때 500ms 뒤 렌더러를 정리하며 컨텍스트를
  // 일부러 잃게 하는데(forceContextLoss), 다시 올린 Canvas가 같은 렌더러를 그대로 써서 그 정리에 컨텍스트가 끊기고 여정 장면이 실패했다
  // (스펙 10절, 2-4b). 프로덕션에는 StrictMode의 두 번 마운트가 없어 동작이 같다.
  reactStrictMode: false,
  images: {
```

`playwright.config.ts`에서 찾을 부분:

```ts
  use: {
    baseURL: `http://localhost:${PORT}`,
    // 사이트는 <html class="dark">로 어두운 배경을 고정하지만, 글의 `dark:` 클래스는 브라우저의
```

바꿀 내용:

```ts
  use: {
    // 서버는 이 맥 안(127.0.0.1)에만 연다. 0.0.0.0으로 열면 공인 주소에 바로 붙은 맥에서는 테스트하는 동안 인터넷에 열린다(2-4b)
    baseURL: `http://127.0.0.1:${PORT}`,
    // 사이트는 <html class="dark">로 어두운 배경을 고정하지만, 글의 `dark:` 클래스는 브라우저의
```

`playwright.config.ts`에서 찾을 부분:

```ts
    // 항상 새로 빌드한다. 이전 빌드 서버를 재사용하면 바뀐 코드를 보지 못하고 거짓 통과한다.
    command: `npx next build && npx next start --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
```

바꿀 내용:

```ts
    // 항상 새로 빌드한다. 이전 빌드 서버를 재사용하면 바뀐 코드를 보지 못하고 거짓 통과한다.
    command: `npx next build && npx next start -H 127.0.0.1 --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: false,
```

- [ ] **Step 3: 개발 서버에서 통과를 확인한다**

`next.config.ts`가 바뀌면 개발 서버가 다시 시작한다(`Ready`를 기다린다).

Run: `node <dev-check.cjs 경로>`
Expected: `state: ready loading: ready`, `canvases: 1`, `errors: []`

개발 서버는 `lsof -t -iTCP:3102 -sTCP:LISTEN`으로 찾은 PID만 끈다.

- [ ] **Step 4: e2e가 127.0.0.1 서버로 도는지 확인한다**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`·`3000`은 무시)

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts -g "정류장 12개가 순서대로"` (Playwright가 매번 `next build`부터 한다. 2~6분)
Expected: PASS — `2 passed`

- [ ] **Step 5: 커밋 정리를 제출한다**

파일별 변경 표와 메시지 초안. 초안 예:

```
fix: 여정 개발 서버에서 장면이 준비되게 하고 e2e 서버를 이 맥 안에서만 연다

- 개발 모드 StrictMode의 두 번 마운트에서 R3F가 예약한 정리가 다시 올린 렌더러의 컨텍스트를 끊어 장면이 실패했다(프로덕션은 같다)
- e2e 서버를 127.0.0.1에만 열어 공인 주소에 붙은 맥에서 테스트하는 동안 인터넷에 열리지 않게 한다
```

---

### Task 4: 모드 연결과 실패의 2D 전환

모드를 페이지에 잇는다(스펙 5절 "모드 전환"·"컨텍스트 손실과 장면 실패"). `JourneyStage`는 모드가 3D일 때만 장면과 로딩 줄을 띄우고, 2D면 `<html>`에 `data-journey-mode="2d"`와 이유(`data-journey-reason`)를 붙인다(다른 페이지로 가면 지운다). 장면 상태는 실패의 종류(컨텍스트 손실·장면 실패)를 남기고(`setSceneStatus("failed", why)`, `getSceneFailure`), 실패하면 2D로 바꾼다. 모드를 바꾸는 일은 `modeSwitch.applyMode` 하나가 맡는다: 바꾸기 직전 지금 카드(3D는 `activeCard`, 2D는 읽는 자리)를 구하고, 배치가 바뀌었다고 알려(Lenis 크기·ScrollTrigger 구간을 다시 잰다) 새 배치에서 그 카드 자리로 스크롤한다. 상세 패널이 열려 스크롤이 잠겨 있으면 닫힐 때 맞춘다(`engine.whenUnlocked`, 계획 머리말 5). 아래 고정 카드와 2막 썸네일은 모드를 따른다(2D면 고정을 풀고 썸네일을 보인다). 2D 배치(CSS)는 Task 5다. 지금은 2D에서도 3D용 긴 배치에 표지만 붙는다.

**Files:**
- Create: `src/components/journey/modeSwitch.ts`
- Modify: `e2e/journey.e2e.ts`, `src/app/globals.css`, `src/components/journey/HologramThumbnail.tsx`, `src/components/journey/JourneyStage.tsx`, `src/components/journey/portraitCards.ts`, `src/components/journey/scene/watchRenderer.ts`, `src/components/journey/useJourneyScroll.ts`, `src/lib/journey/engine.test.ts`, `src/lib/journey/engine.ts`, `src/lib/journey/sceneStatus.test.ts`, `src/lib/journey/sceneStatus.ts`

**Interfaces:**
- Consumes: Task 1의 `fail`·`getJourneyMode`·`getServerJourneyMode`·`setJourneyMode`·`subscribeJourneyMode`·`JourneyMode`·`View`. `activeCard`·`cardProgress`(portrait.ts), `scrollState`(scrollState.ts)
- Produces: `type SceneFailure = "context-lost" | "failed"`, `setSceneStatus(next, why?)`, `getSceneFailure(): SceneFailure | null`(sceneStatus.ts), `failScene(reason, detail?, why?)`(watchRenderer.ts), `whenUnlocked(callback)`(engine.ts), `LAYOUT_EVENT = "journey:layout"`, `scrollTopOf(main, progress)`, `currentCard(view): string`, `scrollToCard(card, view)`, `applyMode(next)`(modeSwitch.ts), `usePortraitCards()`(인자 없음), `<html data-journey-mode="2d" data-journey-reason>`

- [ ] **Step 1: 실패하는 단위 테스트를 쓴다**

`src/lib/journey/sceneStatus.test.ts`에서 찾을 부분:

```ts
  getCarStatus,
  getSceneStatus,
```

바꿀 내용:

```ts
  getCarStatus,
  getSceneFailure,
  getSceneStatus,
```

`src/lib/journey/sceneStatus.test.ts`에서 찾을 부분:

```ts
    expect(getSceneStatus()).toBe("failed");
  });
});

```

바꿀 내용:

```ts
    expect(getSceneStatus()).toBe("failed");
  });

  it("실패의 종류(컨텍스트 손실·장면 실패)를 남기고, 다시 준비할 때 지운다(2-4b)", () => {
    expect(getSceneFailure()).toBeNull();
    setSceneStatus("failed", "context-lost");
    expect(getSceneFailure()).toBe("context-lost");
    setSceneStatus("loading");
    expect(getSceneFailure()).toBeNull();
    setSceneStatus("failed");
    expect(getSceneFailure()).toBe("failed");
  });
});

```

`src/lib/journey/engine.test.ts`에서 찾을 부분:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getLenis, lockScroll, renderFrame, setLenis, setRenderStep, unlockScroll } from "./engine";

```

바꿀 내용:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getLenis, lockScroll, renderFrame, setLenis, setRenderStep, unlockScroll, whenUnlocked } from "./engine";

```

`src/lib/journey/engine.test.ts`에서 찾을 부분:

```ts

  it("렌더 단계가 등록돼 있을 때만 그린다", () => {
```

바꿀 내용:

```ts

  it("잠겨 있으면 풀릴 때 한 번 부르고, 잠겨 있지 않으면 바로 부른다(2-4b)", () => {
    const later = vi.fn();
    lockScroll();
    whenUnlocked(later);
    expect(later).not.toHaveBeenCalled();
    unlockScroll();
    unlockScroll();
    expect(later).toHaveBeenCalledTimes(1);
    const now = vi.fn();
    whenUnlocked(now);
    expect(now).toHaveBeenCalledTimes(1);
  });

  it("렌더 단계가 등록돼 있을 때만 그린다", () => {
```

- [ ] **Step 2: 실패를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4 src/lib/journey/sceneStatus.test.ts src/lib/journey/engine.test.ts`
Expected: FAIL — `Tests  2 failed | 8 passed (10)`(`TypeError: getSceneFailure is not a function`, `TypeError: whenUnlocked is not a function`)

- [ ] **Step 3: 실패하는 e2e를 쓴다(실패 경로 일곱의 기대를 2D로 바꾸고 넷을 더한다)**

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts

test("헤더의 Journey 링크로 들어오고, 여정 페이지에서는 헤더 흐림이 꺼진다", async ({ page }) => {
```

바꿀 내용:

```ts

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
```

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts
  await page.goto("/journey");
  // 오류 경계가 실패한 import를 잡으면 장면 상태가 failed가 되고 로딩 막대가 사라진다.
  await expect(page.locator("[data-journey-loading]")).toHaveAttribute("data-journey-loading", "failed", {
    timeout: 15_000,
  });
  await expect(page.locator("[data-journey-loading] span")).toHaveCount(0);
  await expect(page.getByText("Application error")).toBeHidden();
```

바꿀 내용:

```ts
  await page.goto("/journey");
  // 오류 경계가 실패한 import를 잡으면 장면 상태가 failed가 되고 2D로 바뀐다(로딩 막대도 함께 내려간다, 2-4b).
  await expectFlat(page, "failed");
  await expect(page.locator("[data-journey-loading]")).toHaveCount(0);
  await expect(page.getByText("Application error")).toBeHidden();
```

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts
  await page.goto("/journey");
  // 렌더러를 만들지 못하면 장면 상태가 failed가 되어 로딩 막대가 사라진다.
  await expect(page.locator("[data-journey-loading]")).toHaveAttribute("data-journey-loading", "failed");
  await page.waitForTimeout(1000);
```

바꿀 내용:

```ts
  await page.goto("/journey");
  // 렌더러를 만들지 못하면 장면 상태가 failed가 되어 2D로 바뀐다(2-4b).
  await expectFlat(page, "failed");
  await page.waitForTimeout(1000);
```

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts
  await page.goto("/journey");
  await expect(page.locator("[data-journey-loading]")).toHaveAttribute("data-journey-loading", "failed", {
    timeout: 15_000,
  });
  await expect(page.locator("[data-stop]")).toHaveCount(12);
```

바꿀 내용:

```ts
  await page.goto("/journey");
  await expectFlat(page, "failed");
  await expect(page.locator("[data-stop]")).toHaveCount(12);
```

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts

test("셰이더 컴파일 실패를 감지해 장면 상태와 콘솔에 남긴다", async ({ page }) => {
  const errors = collectErrors(page);
```

바꿀 내용:

```ts

/** 2D로 바뀌었고 그 이유가 reason이다(<html>의 표지, 스펙 5절 "모드 전환", 2-4b). 3D 장면은 내려간다 */
async function expectFlat(page: Page, reason: string) {
  await expect(page.locator("html")).toHaveAttribute("data-journey-mode", "2d", { timeout: 15_000 });
  await expect(page.locator("html")).toHaveAttribute("data-journey-reason", reason);
  await expect(page.locator("[data-journey-scene]")).toHaveCount(0);
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
```

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts
  await page.goto("/journey");
  await expect(page.locator("[data-journey-scene]")).toHaveAttribute("data-state", "failed", { timeout: 30_000 });
  await expect(page.locator("[data-journey-loading]")).toHaveAttribute("data-journey-loading", "failed");
  expect(errors.some((message) => message.includes("셰이더 컴파일 실패"))).toBe(true);
```

바꿀 내용:

```ts
  await page.goto("/journey");
  await expectFlat(page, "failed");
  expect(errors.some((message) => message.includes("셰이더 컴파일 실패"))).toBe(true);
```

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts

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
```

바꿀 내용:

```ts

test("WebGL 컨텍스트를 잃으면 콘솔에 남기고 2D(이유: 컨텍스트 손실)로 바꾼다", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/journey");
  await waitReady(page);
  await loseContext(page);
  await expectFlat(page, "context-lost");
  expect(errors.some((message) => message.includes("WebGL 컨텍스트 손실"))).toBe(true);
```

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts
  await page.waitForLoadState("networkidle");
  await expect(page.locator("[data-journey-scene]")).toHaveCount(0);
  expect(requests.filter((url) => url.includes("/journey/galaxy") || url.includes("/journey/car/"))).toEqual([]);
  for (const slug of EXHIBITS) await expectThumbnail(page, slug, false);
  await page.keyboard.press("End");
  await expect(page.getByText(EMAIL)).toBeInViewport();
});
```

바꿀 내용:

```ts
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
  await expect(page.locator('[data-journey-card="tix2u"]')).toBeInViewport();
});
```

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts

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
```

바꿀 내용:

```ts

test("실행 중 장면이 실패하면(컨텍스트 손실) 2D로 바뀌어 2막 썸네일이 다시 보이고 스크롤된다", async ({ page }) => {
  await page.goto("/journey");
  await waitReady(page);
  await expectThumbnail(page, "stock2u", true);
  await loseContext(page);
  await expectFlat(page, "context-lost");
  for (const slug of EXHIBITS) await expectThumbnail(page, slug, false);
```

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts

  test("실행 중 장면이 실패하면(컨텍스트 손실) 카드가 스크롤 배치로 돌아온다", async ({ page }) => {
    await page.goto("/journey");
    await waitReady(page);
    await expect(page.locator("[data-journey-page]")).toHaveAttribute("data-journey-cards", "fixed");
    await page.evaluate(() => {
      const canvas = document.querySelector("[data-journey-scene] canvas");
      if (!(canvas instanceof HTMLCanvasElement)) throw new Error("여정 캔버스가 없습니다");
      canvas.getContext("webgl2")?.getExtension("WEBGL_lose_context")?.loseContext();
    });
    await expect(page.locator("[data-journey-scene]")).toHaveAttribute("data-state", "failed");
    await expect(page.locator("[data-journey-page]")).not.toHaveAttribute("data-journey-cards", "fixed");
```

바꿀 내용:

```ts

  test("실행 중 장면이 실패하면(컨텍스트 손실) 2D로 바뀌어 카드 고정이 풀린다", async ({ page }) => {
    await page.goto("/journey");
    await waitReady(page);
    await expect(page.locator("[data-journey-page]")).toHaveAttribute("data-journey-cards", "fixed");
    await loseContext(page);
    await expectFlat(page, "context-lost");
    await expect(page.locator("[data-journey-page]")).not.toHaveAttribute("data-journey-cards", "fixed");
```

- [ ] **Step 4: e2e 실패를 확인한다**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`·`3000`은 무시)

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts -g "청크를 받지 못해도|렌더러를 만들지|은하 이미지를 받지|셰이더 컴파일|컨텍스트|tier=2d면|2D 표지"` (Playwright가 매번 `next build`부터 한다. 2~6분)
Expected: FAIL — `22 failed`. 모두 `<html>`에 2D 표지가 없어 `expect(locator).toHaveAttribute(expected) failed`(`data-journey-mode`)로 실패한다

- [ ] **Step 5: 장면 상태·엔진에 실패 종류와 잠금 뒤 부르기를 더한다**

`src/lib/journey/sceneStatus.ts`에서 찾을 부분:

```ts
 * 차 상태는 모델을 그리는지, 빛 실루엣으로 대신하는지를 알린다(스펙 5절 "실패 대응").
 * 로딩 표시와 캔버스 드러내기가 구독한다. 3D 코드를 import하지 않아 지연 로딩 밖의 컴포넌트도 쓸 수 있다.
```

바꿀 내용:

```ts
 * 차 상태는 모델을 그리는지, 빛 실루엣으로 대신하는지를 알린다(스펙 5절 "실패 대응").
 * 실패하면 그 종류(컨텍스트 손실인지 그 밖의 장면 실패인지)도 남긴다. 여정은 실패하면 2D로 바꾸고 그 이유로 쓴다(2-4b).
 * 로딩 표시와 캔버스 드러내기가 구독한다. 3D 코드를 import하지 않아 지연 로딩 밖의 컴포넌트도 쓸 수 있다.
```

`src/lib/journey/sceneStatus.ts`에서 찾을 부분:

```ts
export type CarStatus = "loading" | "model" | "silhouette";

let status: SceneStatus = "loading";
let car: CarStatus = "loading";
```

바꿀 내용:

```ts
export type CarStatus = "loading" | "model" | "silhouette";
export type SceneFailure = "context-lost" | "failed";

let status: SceneStatus = "loading";
let failure: SceneFailure | null = null;
let car: CarStatus = "loading";
```

`src/lib/journey/sceneStatus.ts`에서 찾을 부분:

```ts

export function setSceneStatus(next: SceneStatus): void {
  if (status === next) return;
  if (status === "failed" && next === "ready") return;
  status = next;
  notify();
}
```

바꿀 내용:

```ts

/** 실패로 바꿀 때 종류를 함께 넘긴다(없으면 장면 실패). 다시 준비 중으로 돌리면 지운다 */
export function setSceneStatus(next: SceneStatus, why: SceneFailure = "failed"): void {
  if (status === next) return;
  if (status === "failed" && next === "ready") return;
  status = next;
  if (next === "failed") failure = why;
  if (next === "loading") failure = null;
  notify();
}

/** 실패한 종류. 실패하지 않았으면 null */
export function getSceneFailure(): SceneFailure | null {
  return failure;
}
```

`src/lib/journey/engine.ts`에서 찾을 부분:

```ts
let locked = false;
let renderStep: ((timeMs: number) => void) | null = null;
```

바꿀 내용:

```ts
let locked = false;
let afterUnlock: (() => void)[] = [];
let renderStep: ((timeMs: number) => void) | null = null;
```

`src/lib/journey/engine.ts`에서 찾을 부분:

```ts
  lenis?.start();
}
```

바꿀 내용:

```ts
  lenis?.start();
  const pending = afterUnlock;
  afterUnlock = [];
  for (const callback of pending) callback();
}

/**
 * 스크롤 잠금이 풀리면 한 번 부른다(잠겨 있지 않으면 바로 부른다). 상세 패널이 열린 동안에는 Lenis가 <html>의 스크롤을 막아(lenis-stopped)
 * 스크롤 위치를 바꿀 수 없으므로, 그동안 바뀐 배치에 맞추는 일(modeSwitch)을 패널이 닫힐 때로 미룬다(2-4b)
 */
export function whenUnlocked(callback: () => void): void {
  if (locked) afterUnlock.push(callback);
  else callback();
}
```

`src/components/journey/scene/watchRenderer.ts`에서 찾을 부분:

```ts
import { setRenderStep } from "@/lib/journey/engine";
import { setSceneStatus } from "@/lib/journey/sceneStatus";

/** 3D 장면을 멈추고 실패로 알린다. 본문·진행 막대·상세는 HTML이라 그대로 동작한다. 복구는 2-4에서 한다 */
export function failScene(reason: string, detail?: unknown): void {
  console.error(`여정 3D 장면을 멈춥니다: ${reason}`, detail ?? "");
  setRenderStep(null);
  setSceneStatus("failed");
}
```

바꿀 내용:

```ts
import { setRenderStep } from "@/lib/journey/engine";
import { setSceneStatus, type SceneFailure } from "@/lib/journey/sceneStatus";

/** 3D 장면을 멈추고 실패로 알린다. 여정은 2D로 바뀌고(2-4b) 본문·진행 막대·상세는 HTML이라 그대로 동작한다 */
export function failScene(reason: string, detail?: unknown, why: SceneFailure = "failed"): void {
  console.error(`여정 3D 장면을 멈춥니다: ${reason}`, detail ?? "");
  setRenderStep(null);
  setSceneStatus("failed", why);
}
```

`src/components/journey/scene/watchRenderer.ts`에서 찾을 부분:

```ts
  const canvas = gl.domElement;
  const onContextLost = () => failScene("WebGL 컨텍스트 손실");
  canvas.addEventListener("webglcontextlost", onContextLost);
```

바꿀 내용:

```ts
  const canvas = gl.domElement;
  const onContextLost = () => failScene("WebGL 컨텍스트 손실", undefined, "context-lost");
  canvas.addEventListener("webglcontextlost", onContextLost);
```

- [ ] **Step 6: 단위 통과를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4 src/lib/journey/sceneStatus.test.ts src/lib/journey/engine.test.ts`
Expected: PASS — `Tests  10 passed (10)`

- [ ] **Step 7: 모드 전환과 연결을 쓴다**

`src/components/journey/modeSwitch.ts` 전체:

```ts
import { getLenis, whenUnlocked } from "@/lib/journey/engine";
import { getJourneyMode, setJourneyMode, type JourneyMode, type View } from "@/lib/journey/journeyMode";
import { activeCard, cardProgress } from "@/lib/journey/portrait";
import { setCarStatus, setSceneStatus } from "@/lib/journey/sceneStatus";
import { scrollState } from "@/lib/journey/scrollState";

/**
 * 모드 전환(스펙 5절 "모드 전환", 2-4b). 3D와 2D는 같은 본문을 다른 배치로 보이므로, 바꾸기 직전에 지금 보던 카드를 구해 새 배치에서
 * 그 카드 자리로 곧바로 스크롤한다. 해시와 열린 상세는 그대로다. 수동 전환·실행 중 강등·실패가 모두 여기를 지난다.
 */

/** 배치가 바뀌었다고 알리는 이벤트. 스크롤 엔진(useJourneyScroll)이 듣고 Lenis 크기와 ScrollTrigger 구간을 다시 잰다 */
export const LAYOUT_EVENT = "journey:layout";

/** 2D에서 지금 보던 카드를 고르는 읽는 자리(화면 위에서의 비율) */
const READING_LINE = 0.3;

/** 진행률 p 자리의 스크롤 위치(px). ScrollTrigger의 진행률은 본문 위끝이 화면 위에 닿을 때 0, 아래끝이 화면 아래에 닿을 때 1이다 */
export function scrollTopOf(main: HTMLElement, progress: number): number {
  const top = main.getBoundingClientRect().top + window.scrollY;
  return top + progress * (main.offsetHeight - window.innerHeight);
}

function cardElement(card: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-journey-card="${card}"]`) ?? document.getElementById(`stop-${card}`);
}

/** 지금 보던 카드. 3D는 진행률의 카드(PiCKCARE는 앞줄 저장소, 엔딩은 "ending"), 2D는 읽는 자리에 걸친 카드 */
export function currentCard(view: View): string {
  if (view === "3d") return activeCard(scrollState.progress, window.location.hash) ?? "ending";
  const line = window.innerHeight * READING_LINE;
  let current = "intro";
  for (const element of document.querySelectorAll<HTMLElement>("[data-journey-card], #stop-ending")) {
    if (element.getBoundingClientRect().top > line) break;
    current = element.dataset.journeyCard ?? "ending";
  }
  return current;
}

/** 그 카드가 보이는 자리로 곧바로 스크롤한다. 3D는 카드의 대표 진행률(엔딩은 끝), 2D는 카드 위끝(scroll-margin-top만큼 아래) */
export function scrollToCard(card: string, view: View): void {
  const main = document.querySelector<HTMLElement>("[data-journey-page]");
  if (!main) return;
  if (view === "2d") {
    cardElement(card)?.scrollIntoView({ block: "start", behavior: "instant" });
    return;
  }
  const top = scrollTopOf(main, card === "ending" ? 1 : cardProgress(card));
  const lenis = getLenis();
  if (lenis) lenis.scrollTo(top, { immediate: true, force: true });
  else window.scrollTo({ top, behavior: "instant" });
}

/**
 * 모드를 바꾼다. 보기 방식이 바뀌면 보던 카드를 지킨다. 3D로 돌아가면 장면을 처음부터 다시 준비한다(실패했던 상태와 차 상태를 지운다).
 * 모드 구독자(본문의 2D 표지, 아래 고정 카드)는 setJourneyMode 안에서 곧바로 불리므로, 그 뒤에 배치를 다시 재고 스크롤한다.
 * 상세 패널이 열려 스크롤이 잠겨 있으면 패널이 닫힐 때 맞춘다(whenUnlocked)
 */
export function applyMode(next: JourneyMode): void {
  const before = getJourneyMode();
  if (before.view === next.view) {
    setJourneyMode(next);
    return;
  }
  const card = currentCard(before.view);
  if (next.view === "3d") {
    setSceneStatus("loading");
    setCarStatus("loading");
  }
  setJourneyMode(next);
  whenUnlocked(() => {
    window.dispatchEvent(new Event(LAYOUT_EVENT));
    scrollToCard(card, next.view);
  });
}
```

`src/components/journey/portraitCards.ts`에서 찾을 부분:

```ts
import { getLenis } from "@/lib/journey/engine";
import { isPortrait } from "@/lib/journey/lens";
import { activeCard, cardProgress } from "@/lib/journey/portrait";
import { getSceneStatus, subscribeSceneStatus } from "@/lib/journey/sceneStatus";
import { scrollState, subscribeProgress } from "@/lib/journey/scrollState";

/** 진행률 p 자리의 스크롤 위치(px). ScrollTrigger의 진행률은 본문 위끝이 화면 위에 닿을 때 0, 아래끝이 화면 아래에 닿을 때 1이다 */
function scrollTopOf(main: HTMLElement, progress: number): number {
  const top = main.getBoundingClientRect().top + window.scrollY;
  return top + progress * (main.offsetHeight - window.innerHeight);
}

/**
 * 세로 화면의 아래 고정 카드(스펙 3절 "세로 화면 (2-4a)"). 세로 화면(가로가 세로보다 좁다)에서 3D를 쓰고 장면이 실패하지 않은 동안 본문에
 * data-journey-cards="fixed"를 붙이고, 지금 구간의 카드(activeCard)에 data-active를 붙인다. 진행률·해시·화면 크기·장면 상태가 바뀔 때만
 * 속성을 고친다(React 다시 렌더 없음). 키보드 포커스가 보이지 않는 카드의 링크로 가면 그 카드가 보이는 자리(cardProgress)로 한 번 스크롤한다.
 * 이미 보이는 카드면 스크롤하지 않는다. 스크롤은 포커스를 옮기지 않으므로 되돌이가 생기지 않는다.
 */
export function usePortraitCards(enabled: boolean): void {
  useEffect(() => {
    const main = document.querySelector<HTMLElement>("[data-journey-page]");
    if (!enabled || !main) return;
    const cards = new Map<string, HTMLElement>();
```

바꿀 내용:

```ts
import { getLenis } from "@/lib/journey/engine";
import { getJourneyMode, subscribeJourneyMode } from "@/lib/journey/journeyMode";
import { isPortrait } from "@/lib/journey/lens";
import { activeCard, cardProgress } from "@/lib/journey/portrait";
import { getSceneStatus, subscribeSceneStatus } from "@/lib/journey/sceneStatus";
import { scrollState, subscribeProgress } from "@/lib/journey/scrollState";
import { scrollTopOf } from "./modeSwitch";

/**
 * 세로 화면의 아래 고정 카드(스펙 3절 "세로 화면 (2-4a)"). 세로 화면(가로가 세로보다 좁다)에서 3D로 보고 장면이 실패하지 않은 동안 본문에
 * data-journey-cards="fixed"를 붙이고, 지금 구간의 카드(activeCard)에 data-active를 붙인다. 진행률·해시·화면 크기·장면 상태·모드가 바뀔 때만
 * 속성을 고친다(React 다시 렌더 없음). 모드는 구독자로 곧바로 따라가 2D로 바뀌는 순간 고정을 푼다(2-4b). 키보드 포커스가 보이지 않는 카드의 링크로 가면 그 카드가 보이는 자리(cardProgress)로 한 번 스크롤한다.
 * 이미 보이는 카드면 스크롤하지 않는다. 스크롤은 포커스를 옮기지 않으므로 되돌이가 생기지 않는다.
 */
export function usePortraitCards(): void {
  useEffect(() => {
    const main = document.querySelector<HTMLElement>("[data-journey-page]");
    if (!main) return;
    const cards = new Map<string, HTMLElement>();
```

`src/components/journey/portraitCards.ts`에서 찾을 부분:

```ts
    let fixedOn = false;
    const fixed = () => isPortrait(window.innerWidth, window.innerHeight) && getSceneStatus() !== "failed";
    const update = () => {
```

바꿀 내용:

```ts
    let fixedOn = false;
    const fixed = () =>
      getJourneyMode().view === "3d" && isPortrait(window.innerWidth, window.innerHeight) && getSceneStatus() !== "failed";
    const update = () => {
```

`src/components/journey/portraitCards.ts`에서 찾을 부분:

```ts
    const unsubscribeStatus = subscribeSceneStatus(update);
    window.addEventListener("resize", update);
```

바꿀 내용:

```ts
    const unsubscribeStatus = subscribeSceneStatus(update);
    const unsubscribeMode = subscribeJourneyMode(update);
    window.addEventListener("resize", update);
```

`src/components/journey/portraitCards.ts`에서 찾을 부분:

```ts
      unsubscribeStatus();
      window.removeEventListener("resize", update);
```

바꿀 내용:

```ts
      unsubscribeStatus();
      unsubscribeMode();
      window.removeEventListener("resize", update);
```

`src/components/journey/portraitCards.ts`에서 찾을 부분:

```ts
    };
  }, [enabled]);
}
```

바꿀 내용:

```ts
    };
  }, []);
}
```

`src/components/journey/HologramThumbnail.tsx`에서 찾을 부분:

```tsx
} from "@/lib/journey/hologramStatus";
import { getSceneStatus, getServerSceneStatus, subscribeSceneStatus } from "@/lib/journey/sceneStatus";

/**
 * 2막 본문 패널의 썸네일(스펙 3절 "썸네일 대체"). 장면이 ready이고 그 프로젝트의 홀로그램이 켜져 있으면 화면에서만 감춘다.
 * 대체 텍스트는 남아 화면 낭독기는 지금처럼 읽는다(캔버스는 보조기기에서 숨겨져 있어 한 번만 읽힌다).
 * 서버 렌더에서는 보이고, 3D가 없거나 장면이 실패하면 다시 보인다.
 */
export function HologramThumbnail({ id, children }: { id: string; children: ReactNode }) {
  const status = useSyncExternalStore(subscribeSceneStatus, getSceneStatus, getServerSceneStatus);
  const shown = useSyncExternalStore(subscribeHolograms, getShownHolograms, getServerShownHolograms);
  const hidden = thumbnailHidden(status, shown, id);
  return (
```

바꿀 내용:

```tsx
} from "@/lib/journey/hologramStatus";
import { getJourneyMode, getServerJourneyMode, subscribeJourneyMode } from "@/lib/journey/journeyMode";
import { getSceneStatus, getServerSceneStatus, subscribeSceneStatus } from "@/lib/journey/sceneStatus";

/**
 * 2막 본문 패널의 썸네일(스펙 3절 "썸네일 대체"). 3D로 보고, 장면이 ready이고, 그 프로젝트의 홀로그램이 켜져 있으면 화면에서만 감춘다.
 * 대체 텍스트는 남아 화면 낭독기는 지금처럼 읽는다(캔버스는 보조기기에서 숨겨져 있어 한 번만 읽힌다).
 * 서버 렌더에서는 보이고, 3D가 없거나 장면이 실패하거나 2D로 바뀌면 다시 보인다(2D로 바꿔도 장면 상태는 ready로 남는다, 2-4b).
 */
export function HologramThumbnail({ id, children }: { id: string; children: ReactNode }) {
  const status = useSyncExternalStore(subscribeSceneStatus, getSceneStatus, getServerSceneStatus);
  const shown = useSyncExternalStore(subscribeHolograms, getShownHolograms, getServerShownHolograms);
  const mode = useSyncExternalStore(subscribeJourneyMode, getJourneyMode, getServerJourneyMode);
  const hidden = mode?.view === "3d" && thumbnailHidden(status, shown, id);
  return (
```

`src/components/journey/useJourneyScroll.ts`에서 찾을 부분:

```ts
import { setProgress } from "@/lib/journey/scrollState";

```

바꿀 내용:

```ts
import { setProgress } from "@/lib/journey/scrollState";
import { LAYOUT_EVENT } from "./modeSwitch";

```

`src/components/journey/useJourneyScroll.ts`에서 찾을 부분:

```ts
 * 휠은 그 방향으로 더 굴릴 수 있는 안쪽 요소(넘친 엔딩 패널)가 있으면 그 요소가 받는다(allowNestedScroll). 끝에 닿으면 다시 페이지가 굴러간다.
 */
```

바꿀 내용:

```ts
 * 휠은 그 방향으로 더 굴릴 수 있는 안쪽 요소(넘친 엔딩 패널)가 있으면 그 요소가 받는다(allowNestedScroll). 끝에 닿으면 다시 페이지가 굴러간다.
 * 3D와 2D 사이에서 배치가 바뀌면(modeSwitch의 LAYOUT_EVENT) Lenis 크기와 ScrollTrigger 구간을 곧바로 다시 잰다(2-4b).
 */
```

`src/components/journey/useJourneyScroll.ts`에서 찾을 부분:

```ts
    setProgress(trigger.progress);

```

바꿀 내용:

```ts
    setProgress(trigger.progress);
    const relayout = () => {
      lenis.resize();
      ScrollTrigger.refresh();
    };
    window.addEventListener(LAYOUT_EVENT, relayout);

```

`src/components/journey/useJourneyScroll.ts`에서 찾을 부분:

```ts
    return () => {
      stopClock();
```

바꿀 내용:

```ts
    return () => {
      window.removeEventListener(LAYOUT_EVENT, relayout);
      stopClock();
```

`src/components/journey/JourneyStage.tsx`에서 찾을 부분:

```tsx
import { useEffect, useSyncExternalStore } from "react";
import { setCarStatus, setSceneStatus } from "@/lib/journey/sceneStatus";
import { detectTier } from "@/lib/journey/capability";
import { useHologramFocus } from "./hologramLinks";
import { ProgressRail } from "./ProgressRail";
```

바꿀 내용:

```tsx
import { useEffect, useSyncExternalStore } from "react";
import { fail, getJourneyMode, getServerJourneyMode, subscribeJourneyMode } from "@/lib/journey/journeyMode";
import { getSceneFailure, getSceneStatus, setCarStatus, setSceneStatus, subscribeSceneStatus } from "@/lib/journey/sceneStatus";
import { useHologramFocus } from "./hologramLinks";
import { applyMode } from "./modeSwitch";
import { ProgressRail } from "./ProgressRail";
```

`src/components/journey/JourneyStage.tsx`에서 찾을 부분:

```tsx

// 장면 코드(도로 셰이더, 차 모델 로더, drei 환경맵, 후처리)는 이 동적 import 뒤에만 있다. 기기 단계를 판별한 뒤에 불러와 2D 기기는 내려받지 않는다(three·R3F 본체는 사이트 별 배경이 레이아웃에서 이미 싣는다).
const Scene = dynamic(() => import("./scene/Scene"), { ssr: false });
```

바꿀 내용:

```tsx

// 장면 코드(도로 셰이더, 차 모델 로더, drei 환경맵, 후처리)는 이 동적 import 뒤에만 있다. 모드를 정한 뒤에 불러와 2D는 내려받지 않는다(three·R3F 본체는 사이트 별 배경이 레이아웃에서 이미 싣는다).
const Scene = dynamic(() => import("./scene/Scene"), { ssr: false });
```

`src/components/journey/JourneyStage.tsx`에서 찾을 부분:

```tsx

/** 여정 페이지의 클라이언트 진입점. 스크롤 엔진을 켜고 화면 위 요소를 얹는다. */
export function JourneyStage() {
  useJourneyScroll();
  useHologramFocus();
  // 기기 단계(스펙 5절)는 페이지를 열 때 한 번 정한다. 2-4a의 2D는 WebGL이 없을 때와 같다(본문과 썸네일, 세로 타임라인은 2-4b)
  const webgl = useSyncExternalStore(subscribeNothing, () => detectTier() !== "2d", () => false);
  // 세로 화면에서 3D를 쓰는 동안 본문 카드를 아래 고정 자리로 옮긴다(스펙 3절 "세로 화면")
  usePortraitCards(webgl);
  const perf = useSyncExternalStore(subscribeNothing, perfRequested, () => false);
```

바꿀 내용:

```tsx

/**
 * 2D 표지(스펙 5절 "2D 레이아웃", 2-4b). 2D면 <html>에 data-journey-mode="2d"와 이유(data-journey-reason)를 붙여 CSS가 배치를 바꾼다.
 * 모드 구독자라 모드가 바뀌는 순간 곧바로 고친다. 다른 페이지로 가면 지운다.
 */
function useModeAttributes(): void {
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const mode = getJourneyMode();
      if (mode.view === "2d") {
        root.dataset.journeyMode = "2d";
        root.dataset.journeyReason = mode.reason ?? "";
      } else {
        delete root.dataset.journeyMode;
        delete root.dataset.journeyReason;
      }
    };
    apply();
    const unsubscribe = subscribeJourneyMode(apply);
    return () => {
      unsubscribe();
      delete root.dataset.journeyMode;
      delete root.dataset.journeyReason;
    };
  }, []);
}

/** 장면이 실패하면(컨텍스트 손실, 셰이더 컴파일·렌더러 생성 실패, 오류 경계) 2D로 바꾼다(스펙 5절 "컨텍스트 손실과 장면 실패") */
function useFlatOnFailure(): void {
  useEffect(
    () =>
      subscribeSceneStatus(() => {
        if (getSceneStatus() !== "failed") return;
        // 실패는 렌더러를 만드는 도중(렌더 단계)에도 알려지므로 그 일이 끝난 뒤에 바꾼다
        queueMicrotask(() => {
          const mode = getJourneyMode();
          if (mode.view === "3d" && getSceneStatus() === "failed") applyMode(fail(mode, getSceneFailure() ?? "failed"));
        });
      }),
    [],
  );
}

/** 여정 페이지의 클라이언트 진입점. 스크롤 엔진을 켜고, 모드(3D·2D)를 정해 3D면 장면을 얹는다. */
export function JourneyStage() {
  useJourneyScroll();
  useHologramFocus();
  // 모드는 페이지를 열 때 기기 단계와 기억한 선택으로 한 번 정하고, 그 뒤에는 강등·실패·수동 전환으로만 바뀐다(스펙 5절)
  const mode = useSyncExternalStore(subscribeJourneyMode, getJourneyMode, getServerJourneyMode);
  const scene = mode?.view === "3d";
  useModeAttributes();
  useFlatOnFailure();
  // 세로 화면에서 3D로 보는 동안 본문 카드를 아래 고정 자리로 옮긴다(스펙 3절 "세로 화면")
  usePortraitCards();
  const perf = useSyncExternalStore(subscribeNothing, perfRequested, () => false);
```

`src/components/journey/JourneyStage.tsx`에서 찾을 부분:

```tsx
    <>
      {webgl && (
        <SceneBoundary>
          <Scene />
        </SceneBoundary>
      )}
      {webgl && <SceneLoading />}
      <ProgressRail />
```

바꿀 내용:

```tsx
    <>
      {scene && (
        <SceneBoundary>
          <Scene />
        </SceneBoundary>
      )}
      {scene && <SceneLoading />}
      <ProgressRail />
```

`src/app/globals.css` 끝에 붙인다:

```css

/*
 * 여정 2D(스펙 5절 "2D 레이아웃", 2-4b). 2D면 <html>에 data-journey-mode="2d"가 붙는다(JourneyStage, 처음 그리기 스크립트).
 * 모드를 바꾸거나 공유 주소로 열 때 카드로 스크롤하면 카드 위끝이 헤더와 막 탭 아래에 오도록 위 여백을 둔다.
 */
html[data-journey-mode="2d"] [data-journey-card],
html[data-journey-mode="2d"] [data-stop] {
  scroll-margin-top: 6.5rem;
}
```

- [ ] **Step 8: e2e 통과를 확인한다**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`·`3000`은 무시)

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts -g "청크를 받지 못해도|렌더러를 만들지|은하 이미지를 받지|셰이더 컴파일|컨텍스트|tier=2d면|2D 표지"` (Playwright가 매번 `next build`부터 한다. 2~6분)
Expected: PASS — `22 passed`

- [ ] **Step 9: 전체 확인**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`·`3000`은 무시)

Run: `rtk proxy npx tsc --noEmit` → exit 0
Run: `rtk proxy npx vitest run --maxWorkers=4` → `Tests  426 passed (426)`
Run: `rtk proxy npx eslint src/lib/journey/sceneStatus.ts src/lib/journey/sceneStatus.test.ts src/lib/journey/engine.ts src/lib/journey/engine.test.ts src/components/journey/scene/watchRenderer.ts src/components/journey/modeSwitch.ts src/components/journey/portraitCards.ts src/components/journey/HologramThumbnail.tsx src/components/journey/useJourneyScroll.ts src/components/journey/JourneyStage.tsx e2e/journey.e2e.ts` → exit 0, 문제 0(`baseline-browser-mapping` 안내 한 줄은 린트 결과가 아니다)

- [ ] **Step 10: 커밋 정리를 제출한다**

파일별 변경 표와 메시지 초안. 초안 예:

```
feat: 여정 모드를 페이지에 잇고 장면이 실패하면 2D로 바꾸기

- 3D일 때만 장면을 띄우고, 2D면 <html>에 표지와 이유를 붙인다(배치는 다음 커밋)
- 컨텍스트 손실·셰이더·렌더러·청크 실패는 2D로 바꾸고, 바꾸기 직전 보던 카드로 새 배치에서 스크롤한다(상세가 열려 있으면 닫힐 때)
- 아래 고정 카드와 2막 썸네일이 모드를 따른다
```

---

### Task 5: 2D 세로 타임라인 배치와 등장

스펙 5절 "2D 레이아웃"과 "2-4b에서 정한 배치"다. 같은 본문을 `<html data-journey-mode="2d">`와 CSS로만 바꾼다. 정류장 높이를 인라인 `svh`에서 CSS 변수(`--stop-length`, 저장소 블록은 `--repo-length`)로 옮겨 3D 규칙만 높이를 계산하고, 2D는 가운데 열 하나(최대 45rem)에 내용 높이로 쌓는다. 고정·sticky·absolute와 좌우 배치를 풀고, 섹션마다 왼쪽 선을 그 막의 빛의 길 색(`--act-color`, `TRAIL_HEX`)으로 그린다(입구 없음, 막 정류장은 점, 엔딩은 ◆). 엔딩 패널은 높이 제한을 푼다. 등장 효과는 `FadeIn`과 같은 움직임(아래 20px에서 0.5초)을 `flatReveal`의 IntersectionObserver와 CSS로 준다(처음 화면 안의 카드는 바로 보인다). 모드를 바꿀 때 지키는 카드는 전환 없이 곧바로 보이고(`data-revealed="instant"`), 그 자리는 등장 전 transform과 상관없이 잰다(`modeSwitch.scrollToCard`, 계획 머리말 5).

**Files:**
- Create: `src/components/journey/flatReveal.ts`
- Modify: `e2e/journey.e2e.ts`, `src/app/globals.css`, `src/components/journey/JourneyContent.tsx`, `src/components/journey/JourneyStage.tsx`, `src/components/journey/modeSwitch.ts`

**Interfaces:**
- Consumes: Task 1의 `getJourneyMode`·`subscribeJourneyMode`, Task 4의 `<html data-journey-mode>`·`scrollToCard`. `TRAIL_HEX`(trail.ts)
- Produces: 섹션의 `--stop-length`·`--act-color`, 저장소 블록의 `--repo-length`, `useFlatReveal()`(flatReveal.ts), 카드의 `data-revealed`("" 또는 "instant"), `<html data-journey-reveal>`

- [ ] **Step 1: 실패하는 e2e를 쓴다**

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts
import { HALL_REPO_END, HALL_REPO_START, rangeOf } from "../src/lib/journey/timeline";

```

바꿀 내용:

```ts
import { HALL_REPO_END, HALL_REPO_START, rangeOf } from "../src/lib/journey/timeline";
import { TRAIL_HEX } from "../src/lib/journey/trail";

```

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts
  await expect(page.locator('[data-journey-card="tix2u"]')).toBeInViewport();
});
```

바꿀 내용:

```ts
  await expect(page.locator('[data-journey-card="tix2u"]')).toBeInViewport();
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
```

- [ ] **Step 2: e2e 실패를 확인한다**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`·`3000`은 무시)

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts -g "2D 휴대폰|2D 데스크톱"` (Playwright가 매번 `next build`부터 한다. 2~6분)
Expected: FAIL — `8 failed`. 문서 높이(`Expected: < 9.35`, `Received: 18.66…`), 왼쪽 선(`Received: null`), 등장 감춤(`Expected: "0"`, `Received: "1"`), 열 폭(`Expected: <= 720`, `Received: 1280`)

- [ ] **Step 3: 본문 높이를 CSS 변수로 옮기고 2D CSS를 쓴다**

`src/components/journey/JourneyContent.tsx`에서 찾을 부분:

```tsx
import Link from "next/link";
import { sortedPosts } from "@/data/posts";
```

바꿀 내용:

```tsx
import Link from "next/link";
import type { CSSProperties } from "react";
import { sortedPosts } from "@/data/posts";
```

`src/components/journey/JourneyContent.tsx`에서 찾을 부분:

```tsx
import { HALL_REPO_END, HALL_REPO_START, STOPS, objectSide, type Stop } from "@/lib/journey/timeline";
import { EmailCopy } from "./EmailCopy";
```

바꿀 내용:

```tsx
import { HALL_REPO_END, HALL_REPO_START, STOPS, objectSide, type Stop } from "@/lib/journey/timeline";
import { TRAIL_HEX } from "@/lib/journey/trail";
import { EmailCopy } from "./EmailCopy";
```

`src/components/journey/JourneyContent.tsx`에서 찾을 부분:

```tsx
const PANEL = "pointer-events-auto rounded-xl border border-white/10 bg-zinc-950/85 p-6 text-zinc-100 shadow-2xl";
const DETAIL_LINK =
```

바꿀 내용:

```tsx
const PANEL = "pointer-events-auto rounded-xl border border-white/10 bg-zinc-950/85 p-6 text-zinc-100 shadow-2xl";

/** 2D 왼쪽 선의 막 색(빛의 길과 같은 색, 스펙 5절 "2D 레이아웃"). 엔딩은 마지막 막 색으로 끝난다 */
const ACT_LINE: Record<1 | 2 | 3, string> = { 1: TRAIL_HEX.start, 2: TRAIL_HEX.middle, 3: TRAIL_HEX.end };
const DETAIL_LINK =
```

`src/components/journey/JourneyContent.tsx`에서 찾을 부분:

```tsx
            data-journey-card={`${stop.id}/${repo.id}`}
            className="container flex items-end pb-[12svh]"
            style={{ height: `${((stop.length - HALL_REPO_START - HALL_REPO_END) / project.repos.length) * 100}svh` }}
          >
```

바꿀 내용:

```tsx
            data-journey-card={`${stop.id}/${repo.id}`}
            className="container flex h-[calc(var(--repo-length)*100svh)] items-end pb-[12svh]"
            style={{ "--repo-length": (stop.length - HALL_REPO_START - HALL_REPO_END) / project.repos.length } as CSSProperties}
          >
```

`src/components/journey/JourneyContent.tsx`에서 찾을 부분:

```tsx
 * 카드(data-journey-card)는 세로 화면에서 3D를 쓰는 동안 화면 아래 고정 자리로 옮겨진다(portraitCards, globals.css).
 */
```

바꿀 내용:

```tsx
 * 카드(data-journey-card)는 세로 화면에서 3D를 쓰는 동안 화면 아래 고정 자리로 옮겨진다(portraitCards, globals.css).
 * 정류장 높이(정류장 길이 × 100svh)는 3D 배치만 쓴다. 2D면 <html>의 표지로 CSS가 내용 높이의 세로 타임라인으로 바꾸고, 왼쪽 선은
 * --act-color를 쓴다(2-4b, globals.css). 본문 DOM은 하나라 링크·포커스·낭독 순서가 3D와 같다.
 */
```

`src/components/journey/JourneyContent.tsx`에서 찾을 부분:

```tsx
          data-stop={stop.id}
          className="relative"
          style={{ height: `${stop.length * 100}svh` }}
        >
```

바꿀 내용:

```tsx
          data-stop={stop.id}
          className="relative h-[calc(var(--stop-length)*100svh)]"
          style={
            {
              "--stop-length": stop.length,
              "--act-color": ACT_LINE[stop.kind === "ending" ? 3 : stop.act === 0 ? 1 : stop.act],
            } as CSSProperties
          }
        >
```

`src/app/globals.css` 끝에 붙인다:

```css

/*
 * 2D 세로 타임라인: 가운데 열 하나(최대 45rem)에 정류장을 내용 높이로 쌓는다. 3D 배치의 고정·sticky·absolute와 좌우 배치를 모두 풀고,
 * 왼쪽 선은 섹션마다 그 막의 빛의 길 색(--act-color)이다. 입구에는 선이 없고, 막 정류장은 선 위의 점과 제목 줄, 엔딩은 ◆로 끝난다.
 * 유틸리티 클래스는 @layer utilities 안에 있어 층 밖의 이 규칙이 앞선다.
 */
html[data-journey-mode="2d"] [data-journey-page] {
  max-width: 45rem;
  margin-inline: auto;
  padding: 3.5rem 1rem 4rem;
}

html[data-journey-mode="2d"] [data-journey-page] > [data-stop] {
  height: auto;
  padding: 0 0 1rem 1.75rem;
}

html[data-journey-mode="2d"] [data-journey-page] > [data-stop]:not([data-stop="intro"])::before {
  content: "";
  position: absolute;
  inset-block: 0;
  left: 0.5rem;
  width: 2px;
  background-color: var(--act-color);
}

html[data-journey-mode="2d"] [data-journey-page] > [data-stop^="act-"]::after {
  content: "";
  position: absolute;
  top: 1.1rem;
  left: calc(0.5rem - 5px);
  width: 12px;
  height: 12px;
  border-radius: 9999px;
  background-color: var(--act-color);
}

html[data-journey-mode="2d"] [data-journey-page] > [data-stop="ending"]::before {
  inset-block: auto;
  top: 1.4rem;
  left: calc(0.5rem - 5px);
  width: 12px;
  height: 12px;
  transform: rotate(45deg);
}

html[data-journey-mode="2d"] [data-journey-page] .container,
html[data-journey-mode="2d"] [data-journey-card],
html[data-journey-mode="2d"] [data-stop="ending"] > div {
  position: static;
  display: block;
  max-width: none;
  height: auto;
  margin: 0;
  padding: 0;
}

html[data-journey-mode="2d"] [data-stop="pickcare"] > .absolute {
  position: static;
}

html[data-journey-mode="2d"] [data-journey-page] .pointer-events-auto {
  max-width: none;
  max-height: none;
  margin: 0;
  overflow: visible;
}

html[data-journey-mode="2d"] [data-journey-card^="pickcare/"] {
  margin-top: 0.75rem;
  padding-left: 1rem;
}

html[data-journey-mode="2d"] [data-journey-card^="act-"] > div {
  padding: 0.75rem 0 0.25rem;
  border: 0;
  background: none;
  box-shadow: none;
  text-align: left;
}

/* 2D 등장(기존 FadeIn과 같은 움직임): 카드가 화면에 처음 들어올 때 아래 20px에서 0.5초 동안 나타난다. 관찰을 건 뒤에만(data-journey-reveal) 감춘다 */
html[data-journey-mode="2d"][data-journey-reveal] :is([data-journey-card], [data-stop="ending"] > div):not([data-revealed]) {
  opacity: 0;
  transform: translateY(20px);
}

html[data-journey-mode="2d"][data-journey-reveal] :is([data-journey-card], [data-stop="ending"] > div)[data-revealed] {
  transition:
    opacity 0.5s ease-out,
    transform 0.5s ease-out;
}

/* 모드를 바꿀 때 지키는 카드(modeSwitch)는 전환 없이 곧바로 보인다 */
html[data-journey-mode="2d"][data-journey-reveal] :is([data-journey-card], [data-stop="ending"] > div)[data-revealed="instant"] {
  transition: none;
}
```

- [ ] **Step 4: 등장 효과와 지키는 카드를 쓴다**

`src/components/journey/flatReveal.ts` 전체:

```ts
"use client";

import { useEffect } from "react";
import { getJourneyMode, subscribeJourneyMode } from "@/lib/journey/journeyMode";

const TARGETS = '[data-journey-card], [data-stop="ending"] > div';

/**
 * 2D 등장(스펙 5절 "2D 레이아웃", 2-4b). 2D에서 카드가 화면에 처음 들어올 때 data-revealed를 붙이면 CSS가 기존 FadeIn과 같은 움직임
 * (아래 20px에서 0.5초 동안 나타남)을 준다. framer-motion으로 감싸지 않는다(같은 DOM이 3D 세로 화면 고정 카드에도 쓰인다).
 * 관찰을 걸기 전에 이미 화면 안인 카드는 바로 보이게 표시한 뒤에 <html>에 data-journey-reveal을 붙여 감추기를 켠다(처음 그린 카드가
 * 깜빡이지 않게). 3D로 바뀌거나 페이지를 떠나면 관찰을 풀고 표지를 지운다.
 */
export function useFlatReveal(): void {
  useEffect(() => {
    const root = document.documentElement;
    let observer: IntersectionObserver | null = null;
    const stop = () => {
      observer?.disconnect();
      observer = null;
      delete root.dataset.journeyReveal;
    };
    const start = () => {
      const targets = [...document.querySelectorAll<HTMLElement>(TARGETS)];
      for (const target of targets) {
        const rect = target.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) target.dataset.revealed = "";
      }
      const watcher = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            (entry.target as HTMLElement).dataset.revealed = "";
            watcher.unobserve(entry.target);
          }
        },
        { threshold: 0.1 },
      );
      for (const target of targets) if (target.dataset.revealed === undefined) watcher.observe(target);
      observer = watcher;
      root.dataset.journeyReveal = "";
    };
    const update = () => {
      const flat = getJourneyMode().view === "2d";
      if (flat && !observer) start();
      if (!flat && observer) stop();
    };
    update();
    const unsubscribe = subscribeJourneyMode(update);
    return () => {
      unsubscribe();
      stop();
    };
  }, []);
}
```

`src/components/journey/JourneyStage.tsx`에서 찾을 부분:

```tsx
import { getSceneFailure, getSceneStatus, setCarStatus, setSceneStatus, subscribeSceneStatus } from "@/lib/journey/sceneStatus";
import { useHologramFocus } from "./hologramLinks";
```

바꿀 내용:

```tsx
import { getSceneFailure, getSceneStatus, setCarStatus, setSceneStatus, subscribeSceneStatus } from "@/lib/journey/sceneStatus";
import { useFlatReveal } from "./flatReveal";
import { useHologramFocus } from "./hologramLinks";
```

`src/components/journey/JourneyStage.tsx`에서 찾을 부분:

```tsx
  usePortraitCards();
  const perf = useSyncExternalStore(subscribeNothing, perfRequested, () => false);
```

바꿀 내용:

```tsx
  usePortraitCards();
  // 2D에서 카드가 화면에 처음 들어올 때 나타나게 한다(스펙 5절 "2D 레이아웃")
  useFlatReveal();
  const perf = useSyncExternalStore(subscribeNothing, perfRequested, () => false);
```

`src/components/journey/modeSwitch.ts`에서 찾을 부분:

```ts

/** 그 카드가 보이는 자리로 곧바로 스크롤한다. 3D는 카드의 대표 진행률(엔딩은 끝), 2D는 카드 위끝(scroll-margin-top만큼 아래) */
export function scrollToCard(card: string, view: View): void {
  const main = document.querySelector<HTMLElement>("[data-journey-page]");
  if (!main) return;
  if (view === "2d") {
    cardElement(card)?.scrollIntoView({ block: "start", behavior: "instant" });
    return;
  }
  const top = scrollTopOf(main, card === "ending" ? 1 : cardProgress(card));
  const lenis = getLenis();
```

바꿀 내용:

```ts

/** 문서 위에서 그 요소의 레이아웃 위끝(px). offsetTop을 더해 등장 효과의 transform을 빼고 잰다 */
function documentTop(element: HTMLElement): number {
  let top = 0;
  for (let node: HTMLElement | null = element; node; node = node.offsetParent as HTMLElement | null) top += node.offsetTop;
  return top;
}

/**
 * 그 카드가 보이는 자리로 곧바로 스크롤한다. 3D는 카드의 대표 진행률(엔딩은 끝), 2D는 카드 위끝이 scroll-margin-top만큼 아래에 온다.
 * 2D에서는 그 카드를 전환 없이 곧바로 나타나게 하고(data-revealed="instant"), 위치는 등장 전 transform(아래 20px)과 상관없이 잰다
 */
export function scrollToCard(card: string, view: View): void {
  const main = document.querySelector<HTMLElement>("[data-journey-page]");
  if (!main) return;
  let top: number;
  if (view === "2d") {
    const element = cardElement(card);
    if (!element) return;
    element.dataset.revealed = "instant";
    top = documentTop(element) - (Number.parseFloat(getComputedStyle(element).scrollMarginTop) || 0);
  } else {
    top = scrollTopOf(main, card === "ending" ? 1 : cardProgress(card));
  }
  const lenis = getLenis();
```

- [ ] **Step 5: e2e 통과를 확인한다**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`·`3000`은 무시)

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts -g "2D 휴대폰|2D 데스크톱"` (Playwright가 매번 `next build`부터 한다. 2~6분)
Expected: PASS — `8 passed`(휴대폰 412×839 2D 문서 높이 약 5.1화면)

- [ ] **Step 6: 전체 확인**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`·`3000`은 무시)

Run: `rtk proxy npx tsc --noEmit` → exit 0
Run: `rtk proxy npx vitest run --maxWorkers=4` → `Tests  426 passed (426)`
Run: `rtk proxy npx eslint src/components/journey/JourneyContent.tsx src/components/journey/flatReveal.ts src/components/journey/JourneyStage.tsx src/components/journey/modeSwitch.ts e2e/journey.e2e.ts` → exit 0, 문제 0(`baseline-browser-mapping` 안내 한 줄은 린트 결과가 아니다)

- [ ] **Step 7: 커밋 정리를 제출한다**

파일별 변경 표와 메시지 초안. 초안 예:

```
feat: 여정 2D 세로 타임라인 배치와 등장 효과

- 같은 본문을 <html> 표지와 CSS로만 바꿔 가운데 열 하나에 내용 높이로 쌓고, 왼쪽 선을 막마다 빛의 길 색으로 그린다(휴대폰 18.7 → 약 5.1화면)
- 카드가 화면에 처음 들어올 때 FadeIn과 같은 움직임으로 나타나고, 모드를 바꿀 때 지키는 카드는 곧바로 보인다
```

---

### Task 6: 막 탭과 수동 전환·알림·처음 그리기

스펙 2절 "진행 표시"와 5절 "수동 전환"·"자동 2D 알림"·"처음 그리기"다. 진행 막대 끝에 전환 버튼을 붙인다(데스크톱 3D는 세로 막대 아래 "2D", 세로 화면 3D는 가로 막대 오른쪽 끝). 2D에서는 헤더 아래 막 탭(시작·협업·현재·연락처, 이름은 "1막 시작으로 이동" 등)과 "3D로 보기"다. 서버는 둘 다 그리고 `<html>` 표지로 하나만 보인다. 지금 읽는 막은 스크롤마다 `aria-current`로 고친다(진행률은 본문 끝에서 1로 멈추므로 스크롤 이벤트, 맨 끝이면 연락처). 수동 전환(`switchView`)은 선택을 기억하고 모드를 바꾼다. 자동으로 2D가 되면 막 탭 아래에 "기기에 맞춰 2D로 바꿨어요"를 6초 띄운다(`role="status"`). 2D를 기억한 방문자는 본문보다 먼저 도는 인라인 스크립트가 `<html>`에 2D 표지를 건다. 전환 뒤 React가 썸네일을 다시 그리면 위쪽이 늘어나므로 다음 프레임에 한 번 더 맞춘다. 하이드레이션 때 2D가 되는 기기를 위해 공유 주소의 첫 스크롤은 한 프레임 미룬다.

**Files:**
- Modify: `e2e/journey.e2e.ts`, `src/app/globals.css`, `src/app/journey/page.tsx`, `src/components/journey/JourneyStage.tsx`, `src/components/journey/ProgressRail.tsx`, `src/components/journey/ProjectDialog.tsx`, `src/components/journey/modeSwitch.ts`

**Interfaces:**
- Consumes: Task 1의 `choose`·`storeView`·`isAutoFlat`·`VIEW_KEY`, Task 4의 `applyMode`·`LAYOUT_EVENT`. `hasWebGL2`(webgl.ts)
- Produces: `switchView(view)`(modeSwitch.ts), 진행 막대 `nav[aria-label="여정 진행"][data-journey-rail]`(전환 버튼 이름 "2D로 보기"), 2D 막 탭 `nav[aria-label="여정 막"][data-journey-tabs]`(버튼 이름 "1막 시작으로 이동"·"2막 협업으로 이동"·"3막 현재로 이동"·"연락처로 이동", "3D로 보기"), 알림 `p[role="status"]`, 처음 그리기 스크립트(page.tsx)

- [ ] **Step 1: 실패하는 e2e를 쓴다**

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts

/** 여정 캔버스의 WebGL 컨텍스트를 일부러 잃게 한다(WEBGL_lose_context) */
```

바꿀 내용:

```ts

/** 2D로 바뀐 뒤 그 카드의 위끝이 헤더와 막 탭 아래(scroll-margin-top 6.5rem = 104px)에 있다: 보던 카드를 지켰다 */
async function expectFlatAnchor(page: Page, card: string) {
  await expect.poll(async () => Math.round((await page.locator(`[data-journey-card="${card}"]`).boundingBox())?.y ?? -1)).toBe(104);
}

/** 여정 캔버스의 WebGL 컨텍스트를 일부러 잃게 한다(WEBGL_lose_context) */
```

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts
  await expectFlat(page, "context-lost");
  await expect(page.locator('[data-journey-card="tix2u"]')).toBeInViewport();
});
```

바꿀 내용:

```ts
  await expectFlat(page, "context-lost");
  await expectFlatAnchor(page, "tix2u");
});
```

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts
  expect(Math.abs(box.x + box.width / 2 - 640)).toBeLessThanOrEqual(1);
});
```

바꿀 내용:

```ts
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
```

- [ ] **Step 2: e2e 실패를 확인한다**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`·`3000`은 무시)

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts -g "2D로 보기를 누르면|고른 2D는|저장소가 막힌|서버가 그린 화면|알림이 한 번|막 탭을 누르면|2D에서 공유 주소|3D로 보기 버튼이 없다"` (Playwright가 매번 `next build`부터 한다. 2~6분)
Expected: FAIL — `16 failed`. 전환 버튼·막 탭·알림이 없고(`locator.click: Test timeout`, `element(s) not found`), 2D 공유 주소는 카드가 화면 밖이다(`Received: viewport ratio 0`)

- [ ] **Step 3: 진행 막대·막 탭·알림과 수동 전환을 쓴다**

`src/components/journey/ProgressRail.tsx`에서 찾을 부분:

```tsx

import { useEffect, useRef, type CSSProperties } from "react";
import { getLenis } from "@/lib/journey/engine";
import { scrollState, subscribeProgress } from "@/lib/journey/scrollState";
import { rangeOf } from "@/lib/journey/timeline";

```

바꿀 내용:

```tsx

import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { getLenis } from "@/lib/journey/engine";
import { getJourneyMode, isAutoFlat, subscribeJourneyMode } from "@/lib/journey/journeyMode";
import { scrollState, subscribeProgress } from "@/lib/journey/scrollState";
import { rangeOf } from "@/lib/journey/timeline";
import { hasWebGL2 } from "@/lib/journey/webgl";
import { switchView } from "./modeSwitch";

```

`src/components/journey/ProgressRail.tsx`에서 찾을 부분:

```tsx

function scrollToStop(id: string, align: "start" | "end") {
```

바꿀 내용:

```tsx

// 2D 막 탭(2-4b). 보이는 글은 짧게 두고, 이름은 그 글을 품은 채 막 번호를 더한다.
const TABS = [
  { id: "act-1", label: "시작", name: "1막 시작으로 이동" },
  { id: "act-2", label: "협업", name: "2막 협업으로 이동" },
  { id: "act-3", label: "현재", name: "3막 현재로 이동" },
  { id: "ending", label: "연락처", name: "연락처로 이동" },
] as const;

/** 2D에서 막 섹션의 위끝이 오는 자리(px): 헤더(3.5rem)와 막 탭(2.5rem) 아래 0.5rem. globals.css의 scroll-margin-top 6.5rem과 같다 */
const FLAT_TOP = 104;

function scrollToStop(id: string, align: "start" | "end") {
```

`src/components/journey/ProgressRail.tsx`에서 찾을 부분:

```tsx

/**
```

바꿀 내용:

```tsx

/** 2D 막 탭: 그 막 섹션으로 간다. 위 여백은 섹션의 scroll-margin-top이 정한다(Lenis도 scroll-margin을 뺀다) */
function scrollToAct(id: string) {
  const section = document.getElementById(`stop-${id}`);
  if (!section) return;
  const lenis = getLenis();
  if (lenis) lenis.scrollTo(section);
  else section.scrollIntoView({ block: "start" });
}

/**
 * 2D에서 지금 읽는 막: 위끝이 막 탭 바로 아래(FLAT_TOP)를 지난 마지막 막 섹션. 입구에서는 없다. 엔딩은 페이지 끝이라 위끝이 거기까지
 * 오르지 못하므로, 끝까지 내려가면 연락처다
 */
function readingAct(): string | null {
  const root = document.documentElement;
  if (window.scrollY + window.innerHeight >= root.scrollHeight - 2) return "ending";
  let current: string | null = null;
  for (const tab of TABS) {
    const top = document.getElementById(`stop-${tab.id}`)?.getBoundingClientRect().top ?? Infinity;
    if (top <= FLAT_TOP + 8) current = tab.id;
  }
  return current;
}

function subscribeNothing() {
  return () => {};
}

/**
```

`src/components/journey/ProgressRail.tsx`에서 찾을 부분:

```tsx
 * 세로 막대는 세로 화면에서 3D 위쪽 영역(차와 홀로그램)의 가장자리에 걸렸다.
 */
export function ProgressRail() {
  const fillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = (progress: number) => {
      fillRef.current?.style.setProperty("--progress", String(progress));
    };
    update(scrollState.progress);
    return subscribeProgress(update);
  }, []);

  return (
    <nav
      aria-label="여정 진행"
      className="fixed right-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-zinc-950/70 px-3 py-4 sm:right-6 portrait:inset-x-0 portrait:top-14 portrait:h-6 portrait:translate-y-0 portrait:rounded-none portrait:px-4 portrait:py-0"
    >
      <div className="relative h-64 w-px bg-white/25 portrait:top-[11.5px] portrait:h-px portrait:w-full">
        <div
          ref={fillRef}
          className="absolute inset-0 origin-top bg-white/70 [transform:scaleY(var(--progress))] portrait:origin-left portrait:[transform:scaleX(var(--progress))]"
          style={{ "--progress": 0 } as CSSProperties}
        />
        {MARKS.map((mark) => (
          <button
            key={mark.id}
            type="button"
            onClick={() => scrollToStop(mark.id, mark.align)}
            aria-label={mark.name}
            className="group absolute -left-3 top-[var(--mark)] flex h-6 w-6 -translate-y-1/2 items-center justify-center portrait:left-[var(--mark)] portrait:top-0 portrait:-translate-x-1/2"
            style={{ "--mark": mark.top } as CSSProperties}
          >
            <span className="h-2 w-2 rounded-full bg-white/70 transition-colors group-hover:bg-white" />
            <span className="pointer-events-none absolute right-8 whitespace-nowrap rounded bg-zinc-950/85 px-1.5 py-0.5 text-xs text-zinc-200 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 portrait:right-auto portrait:top-7">
              {mark.label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
```

바꿀 내용:

```tsx
 * 세로 막대는 세로 화면에서 3D 위쪽 영역(차와 홀로그램)의 가장자리에 걸렸다.
 * 2-4b: 막대 끝에 수동 전환 버튼("2D로 보기")을 붙이고, 2D에서는 헤더 아래 막 탭(시작·협업·현재·연락처)과 "3D로 보기"로 바뀐다.
 * 서버는 둘 다 그리고 <html>의 2D 표지로 하나만 보인다(2D를 기억한 방문자도 처음 그릴 때부터 막 탭). 지금 읽는 막은 aria-current로
 * React 렌더 없이 고친다. 자동으로 2D가 되면 막 탭 아래에 알림을 6초 띄운다(화면 낭독기에는 한 번). WebGL2가 없으면 버튼을 두지 않는다.
 */
export function ProgressRail() {
  const fillRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const canSwitch = useSyncExternalStore(subscribeNothing, hasWebGL2, () => true);
  const [notice, setNotice] = useState(false);

  useEffect(() => {
    const fill = (progress: number) => {
      fillRef.current?.style.setProperty("--progress", String(progress));
    };
    // 2D 막 탭은 스크롤마다 고친다. 진행률은 본문 끝에서 1로 멈춰 연락처까지 내려가는 동안 바뀌지 않는다
    const tabs = () => {
      const current = getJourneyMode().view === "2d" ? readingAct() : null;
      for (const button of tabsRef.current?.querySelectorAll<HTMLButtonElement>("[data-tab]") ?? []) {
        if (button.dataset.tab === current) button.setAttribute("aria-current", "true");
        else button.removeAttribute("aria-current");
      }
    };
    fill(scrollState.progress);
    tabs();
    const unsubscribeProgress = subscribeProgress(fill);
    const unsubscribeMode = subscribeJourneyMode(tabs);
    window.addEventListener("scroll", tabs, { passive: true });
    return () => {
      unsubscribeProgress();
      unsubscribeMode();
      window.removeEventListener("scroll", tabs);
    };
  }, []);

  // 3D에서 자동으로 2D가 되는 순간에만 알림을 켠다(수동 2D·기기 단계 2D는 알리지 않는다)
  useEffect(() => {
    let previous = getJourneyMode();
    let timer = 0;
    const unsubscribe = subscribeJourneyMode(() => {
      const next = getJourneyMode();
      const flattened = isAutoFlat(next) && previous.view === "3d";
      previous = next;
      window.clearTimeout(timer);
      setNotice(flattened);
      if (flattened) timer = window.setTimeout(() => setNotice(false), 6000);
    });
    return () => {
      unsubscribe();
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <>
      <nav
        aria-label="여정 진행"
        data-journey-rail
        className="fixed right-3 top-1/2 z-20 flex -translate-y-1/2 flex-col items-center gap-3 rounded-full bg-zinc-950/70 px-3 py-4 sm:right-6 portrait:inset-x-0 portrait:top-14 portrait:h-6 portrait:translate-y-0 portrait:flex-row portrait:rounded-none portrait:px-4 portrait:py-0"
      >
        <div className="relative h-64 w-px bg-white/25 portrait:h-px portrait:w-auto portrait:flex-1">
          <div
            ref={fillRef}
            className="absolute inset-0 origin-top bg-white/70 [transform:scaleY(var(--progress))] portrait:origin-left portrait:[transform:scaleX(var(--progress))]"
            style={{ "--progress": 0 } as CSSProperties}
          />
          {MARKS.map((mark) => (
            <button
              key={mark.id}
              type="button"
              onClick={() => scrollToStop(mark.id, mark.align)}
              aria-label={mark.name}
              className="group absolute -left-3 top-[var(--mark)] flex h-6 w-6 -translate-y-1/2 items-center justify-center portrait:left-[var(--mark)] portrait:top-0 portrait:-translate-x-1/2"
              style={{ "--mark": mark.top } as CSSProperties}
            >
              <span className="h-2 w-2 rounded-full bg-white/70 transition-colors group-hover:bg-white" />
              <span className="pointer-events-none absolute right-8 whitespace-nowrap rounded bg-zinc-950/85 px-1.5 py-0.5 text-xs text-zinc-200 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 portrait:right-auto portrait:top-7">
                {mark.label}
              </span>
            </button>
          ))}
        </div>
        {canSwitch && (
          <button
            type="button"
            onClick={() => switchView("2d")}
            aria-label="2D로 보기"
            className="rounded px-1 text-xs font-medium text-zinc-300 transition-colors hover:text-white"
          >
            2D
          </button>
        )}
      </nav>
      <nav
        aria-label="여정 막"
        data-journey-tabs
        className="fixed inset-x-0 top-14 z-20 hidden h-10 border-b border-white/10 bg-zinc-950/90"
      >
        <div ref={tabsRef} className="mx-auto flex h-full max-w-[45rem] items-center gap-1 px-4 text-sm">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              data-tab={tab.id}
              onClick={() => scrollToAct(tab.id)}
              aria-label={tab.name}
              className="rounded px-2.5 py-1 text-zinc-400 transition-colors hover:text-white aria-[current=true]:bg-white/10 aria-[current=true]:text-white"
            >
              {tab.label}
            </button>
          ))}
          {canSwitch && (
            <button
              type="button"
              onClick={() => switchView("3d")}
              className="ml-auto rounded px-2.5 py-1 text-xs font-medium text-sky-300 transition-colors hover:text-white"
            >
              3D로 보기
            </button>
          )}
        </div>
      </nav>
      <p
        role="status"
        className={
          notice
            ? "fixed right-4 top-[6.75rem] z-20 rounded-md bg-zinc-900/95 px-3 py-1.5 text-xs text-zinc-200 shadow-lg"
            : "sr-only"
        }
      >
        {notice ? "기기에 맞춰 2D로 바꿨어요" : ""}
      </p>
    </>
  );
```

`src/components/journey/modeSwitch.ts`에서 찾을 부분:

```ts
import { getLenis, whenUnlocked } from "@/lib/journey/engine";
import { getJourneyMode, setJourneyMode, type JourneyMode, type View } from "@/lib/journey/journeyMode";
import { activeCard, cardProgress } from "@/lib/journey/portrait";
```

바꿀 내용:

```ts
import { getLenis, whenUnlocked } from "@/lib/journey/engine";
import { choose, getJourneyMode, setJourneyMode, storeView, type JourneyMode, type View } from "@/lib/journey/journeyMode";
import { activeCard, cardProgress } from "@/lib/journey/portrait";
```

`src/components/journey/modeSwitch.ts`에서 찾을 부분:

```ts
 * 모드 구독자(본문의 2D 표지, 아래 고정 카드)는 setJourneyMode 안에서 곧바로 불리므로, 그 뒤에 배치를 다시 재고 스크롤한다.
 * 상세 패널이 열려 스크롤이 잠겨 있으면 패널이 닫힐 때 맞춘다(whenUnlocked)
```

바꿀 내용:

```ts
 * 모드 구독자(본문의 2D 표지, 아래 고정 카드)는 setJourneyMode 안에서 곧바로 불리므로, 그 뒤에 배치를 다시 재고 스크롤한다.
 * React가 모드를 따라 다시 그리는 것(2D면 2막 썸네일이 다시 보여 위쪽이 늘어난다)은 그 뒤라, 다음 프레임에 한 번 더 맞춘다.
 * 상세 패널이 열려 스크롤이 잠겨 있으면 패널이 닫힐 때 맞춘다(whenUnlocked)
```

`src/components/journey/modeSwitch.ts`에서 찾을 부분:

```ts
  setJourneyMode(next);
  whenUnlocked(() => {
    window.dispatchEvent(new Event(LAYOUT_EVENT));
    scrollToCard(card, next.view);
  });
}
```

바꿀 내용:

```ts
  setJourneyMode(next);
  const settle = () => {
    window.dispatchEvent(new Event(LAYOUT_EVENT));
    scrollToCard(card, next.view);
  };
  whenUnlocked(() => {
    settle();
    requestAnimationFrame(settle);
  });
}

/** 수동 전환(진행 막대 끝의 버튼). 고른 것을 기억하고 모드를 바꾼다(스펙 5절 "수동 전환") */
export function switchView(view: View): void {
  storeView(view);
  applyMode(choose(getJourneyMode(), view));
}
```

`src/app/globals.css`에서 찾을 부분:

```css

/* 2D 등장(기존 FadeIn과 같은 움직임): 카드가 화면에 처음 들어올 때 아래 20px에서 0.5초 동안 나타난다. 관찰을 건 뒤에만(data-journey-reveal) 감춘다 */
```

바꿀 내용:

```css

/* 2D의 진행 표시는 헤더 아래 막 탭이다(스펙 2절 "진행 표시", ProgressRail) */
html[data-journey-mode="2d"] [data-journey-rail] {
  display: none;
}

html[data-journey-mode="2d"] [data-journey-tabs] {
  display: block;
}

/* 2D 등장(기존 FadeIn과 같은 움직임): 카드가 화면에 처음 들어올 때 아래 20px에서 0.5초 동안 나타난다. 관찰을 건 뒤에만(data-journey-reveal) 감춘다 */
```

- [ ] **Step 4: 처음 그리기 스크립트와 배치 알림, 공유 주소 스크롤을 고친다**

`src/app/journey/page.tsx`에서 찾을 부분:

```tsx
import { JourneyStage } from "@/components/journey/JourneyStage";

```

바꿀 내용:

```tsx
import { JourneyStage } from "@/components/journey/JourneyStage";
import { VIEW_KEY } from "@/lib/journey/journeyMode";

```

`src/app/journey/page.tsx`에서 찾을 부분:

```tsx

export default function JourneyPage() {
  return (
    <>
      <JourneyContent />
```

바꿀 내용:

```tsx

/**
 * 처음 그리기(스펙 5절, 2-4b): 2D를 기억한 방문자는 본문보다 먼저 도는 이 스크립트가 <html>에 2D 표지를 걸어 처음 그릴 때부터 2D 배치다.
 * 기기 단계로 2D인 기기는 하이드레이션 때 바뀐다(JourneyStage). 루트 레이아웃의 <html>이 suppressHydrationWarning이라 경고가 없다.
 */
const FLAT_FIRST = `try{if(localStorage.getItem(${JSON.stringify(VIEW_KEY)})==="2d")document.documentElement.dataset.journeyMode="2d"}catch(e){}`;

export default function JourneyPage() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: FLAT_FIRST }} />
      <JourneyContent />
```

`src/components/journey/JourneyStage.tsx`에서 찾을 부분:

```tsx
import { useHologramFocus } from "./hologramLinks";
import { applyMode } from "./modeSwitch";
import { ProgressRail } from "./ProgressRail";
```

바꿀 내용:

```tsx
import { useHologramFocus } from "./hologramLinks";
import { LAYOUT_EVENT, applyMode } from "./modeSwitch";
import { ProgressRail } from "./ProgressRail";
```

`src/components/journey/JourneyStage.tsx`에서 찾을 부분:

```tsx
 * 2D 표지(스펙 5절 "2D 레이아웃", 2-4b). 2D면 <html>에 data-journey-mode="2d"와 이유(data-journey-reason)를 붙여 CSS가 배치를 바꾼다.
 * 모드 구독자라 모드가 바뀌는 순간 곧바로 고친다. 다른 페이지로 가면 지운다.
 */
```

바꿀 내용:

```tsx
 * 2D 표지(스펙 5절 "2D 레이아웃", 2-4b). 2D면 <html>에 data-journey-mode="2d"와 이유(data-journey-reason)를 붙여 CSS가 배치를 바꾼다.
 * 모드 구독자라 모드가 바뀌는 순간 곧바로 고친다. 다른 페이지로 가면 지운다. 하이드레이션 때 처음 2D가 되는 기기(처음 그리기
 * 스크립트가 걸지 못한 기기 단계 2D)는 배치가 바뀌었다고 알려 스크롤 엔진이 다시 재게 한다.
 */
```

`src/components/journey/JourneyStage.tsx`에서 찾을 부분:

```tsx
      const mode = getJourneyMode();
      if (mode.view === "2d") {
        root.dataset.journeyMode = "2d";
```

바꿀 내용:

```tsx
      const mode = getJourneyMode();
      const flat = mode.view === "2d";
      const changed = flat !== (root.dataset.journeyMode === "2d");
      if (flat) {
        root.dataset.journeyMode = "2d";
```

`src/components/journey/JourneyStage.tsx`에서 찾을 부분:

```tsx
      }
    };
```

바꿀 내용:

```tsx
      }
      if (changed) window.dispatchEvent(new Event(LAYOUT_EVENT));
    };
```

`src/components/journey/ProjectDialog.tsx`에서 찾을 부분:

```tsx

  // 공유 주소(/journey#pfplay)로 들어오면 해당 정류장으로 먼저 옮긴다.
  useEffect(() => {
    const initial = parseJourneyHash(window.location.hash);
    if (initial) document.getElementById(`stop-${initial.slug}`)?.scrollIntoView({ block: "start", behavior: "instant" });
  }, []);
```

바꿀 내용:

```tsx

  // 공유 주소(/journey#pfplay)로 들어오면 해당 정류장으로 먼저 옮긴다. 하이드레이션 때 2D 배치로 바뀌는 기기가 있어(JourneyStage의
  // 2D 표지는 이 패널보다 늦게 걸린다) 한 프레임 뒤에 옮긴다(2-4b).
  useEffect(() => {
    const initial = parseJourneyHash(window.location.hash);
    if (!initial) return;
    const frame = requestAnimationFrame(() =>
      document.getElementById(`stop-${initial.slug}`)?.scrollIntoView({ block: "start", behavior: "instant" }),
    );
    return () => cancelAnimationFrame(frame);
  }, []);
```

- [ ] **Step 5: e2e 통과를 확인한다**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`·`3000`은 무시)

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts -g "2D로 보기를 누르면|고른 2D는|저장소가 막힌|서버가 그린 화면|알림이 한 번|막 탭을 누르면|2D에서 공유 주소|3D로 보기 버튼이 없다"` (Playwright가 매번 `next build`부터 한다. 2~6분)
Expected: PASS — `16 passed`

- [ ] **Step 6: 전체 확인**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`·`3000`은 무시)

Run: `rtk proxy npx tsc --noEmit` → exit 0
Run: `rtk proxy npx vitest run --maxWorkers=4` → `Tests  426 passed (426)`
Run: `rtk proxy npx eslint src/components/journey/ProgressRail.tsx src/components/journey/modeSwitch.ts src/app/journey/page.tsx src/components/journey/JourneyStage.tsx src/components/journey/ProjectDialog.tsx e2e/journey.e2e.ts` → exit 0, 문제 0(`baseline-browser-mapping` 안내 한 줄은 린트 결과가 아니다)

- [ ] **Step 7: 커밋 정리를 제출한다**

파일별 변경 표와 메시지 초안. 초안 예:

```
feat: 여정 2D 막 탭과 수동 전환·자동 2D 알림

- 진행 막대 끝에 2D로 보기를, 2D에서는 헤더 아래 막 탭과 3D로 보기를 두고 고른 것을 기억한다(2D를 기억했으면 처음 그릴 때부터 2D)
- 자동으로 2D가 되면 6초 알리고, 전환 뒤 보던 카드 자리를 한 프레임 뒤 다시 맞춘다
```

---

### Task 7: 실행 중 강등을 장면에 연결

스펙 5절 "실행 중 강등"과 4절 "적응형 품질"이다. 품질 단계 표(`LEVEL_QUALITY`: 전체 배율 2·블룸 1·8, 경량 1.5·0.5·6, 최소 1·끔)와 기기 단계의 은하(`galaxyFor`, 실행 중에는 바꾸지 않는다)를 두고, 예전 `QUALITY`·`sceneQuality`를 대신한다. `Effects`는 지금 단계로 블룸을 고르고(최소면 빼고), 해상도 배율을 `setDpr`로 내리며, 배율만 바뀐 때도 컴포저 크기를 다시 잡는다(래퍼는 크기 변화만 따른다, 계획 머리말 7). `Warmup`의 렌더 단계는 준비된 뒤부터 프레임 시각을 강등 판정에 넘기고 너무 느리면 한 단계 내린다(마지막은 2D). 측정 오버레이(`?debug=perf`)와 자동화 브라우저(`navigator.webdriver`)에서는 바꾸지 않는다(e2e의 헤드리스는 소프트웨어 렌더링이라 느려 다른 검사가 흔들린다, 계획 머리말 2). 확인용 `?debug=stats&busy=<ms>`는 렌더 단계마다 그 시간을 일부러 끌고, 자동화 브라우저에서도 감시를 켠다. `?debug=stats`는 품질 단계를 프레임마다 낸다.

**Files:**
- Modify: `e2e/journey.e2e.ts`, `src/components/journey/scene/Effects.tsx`, `src/components/journey/scene/Scene.tsx`, `src/components/journey/scene/Sky.tsx`, `src/components/journey/scene/Warmup.tsx`, `src/components/journey/scene/frameStats.ts`, `src/lib/journey/capability.test.ts`, `src/lib/journey/capability.ts`

**Interfaces:**
- Consumes: Task 1의 `downgrade`·`getJourneyMode`·`subscribeJourneyMode`·`QualityLevel`, Task 2의 `createWatch`·`frameTooSlow`·`holdWatch`, Task 4의 `applyMode`
- Produces: `interface LevelQuality { dpr: [number, number]; bloom: { luminanceScale; levels } | null }`, `LEVEL_QUALITY: Record<QualityLevel, LevelQuality>`, `galaxyFor(tier): string`(capability.ts, `QUALITY`·`Quality`·`sceneQuality`는 없앤다), `busyMs(): number`, `QualityStats.level`(frameStats.ts)

- [ ] **Step 1: 실패하는 단위 테스트를 쓴다**

`src/lib/journey/capability.test.ts`에서 찾을 부분:

```ts
import { describe, expect, it } from "vitest";
import { QUALITY, resolveTier, tierOf, tierOverride, type DeviceSignals } from "./capability";

```

바꿀 내용:

```ts
import { describe, expect, it } from "vitest";
import { LEVEL_QUALITY, galaxyFor, resolveTier, tierOf, tierOverride, type DeviceSignals } from "./capability";

```

`src/lib/journey/capability.test.ts`에서 찾을 부분:

```ts

describe("단계별 품질(스펙 5절, 2-4a)", () => {
  it("3D 전체는 해상도 배율 최대 2, 원본 은하(4096), 블룸 그대로(휘도 전체 해상도, 8단계)다", () => {
    expect(QUALITY.full).toEqual({ dpr: [1, 2], galaxy: "/journey/galaxy.webp", bloom: { luminanceScale: 1, levels: 8 } });
  });

  it("3D 경량은 해상도 배율 최대 1.5, 은하 2048, 블룸을 줄인다(휘도 절반 해상도, 단계 축소). 끄지는 않는다", () => {
    expect(QUALITY.lite.dpr).toEqual([1, 1.5]);
    expect(QUALITY.lite.galaxy).toBe("/journey/galaxy-2048.webp");
    expect(QUALITY.lite.bloom.luminanceScale).toBe(0.5);
    expect(QUALITY.lite.bloom.levels).toBeLessThan(QUALITY.full.bloom.levels);
    expect(QUALITY.lite.bloom.levels).toBeGreaterThan(0);
  });
```

바꿀 내용:

```ts

describe("품질 단계(스펙 5절, 2-4a·2-4b)", () => {
  it("전체는 해상도 배율 최대 2·블룸 그대로(휘도 전체 해상도, 8단계), 경량은 배율 1.5·블룸 축소(휘도 절반, 6단계), 최소는 배율 1·블룸 끔이다", () => {
    expect(LEVEL_QUALITY).toEqual({
      full: { dpr: [1, 2], bloom: { luminanceScale: 1, levels: 8 } },
      lite: { dpr: [1, 1.5], bloom: { luminanceScale: 0.5, levels: 6 } },
      min: { dpr: [1, 1], bloom: null },
    });
  });

  it("은하는 기기 단계로 정한다: 전체는 원본(4096), 경량과 2D(수동으로 고른 3D)는 2048. 실행 중 강등은 은하를 바꾸지 않는다", () => {
    expect(galaxyFor("full")).toBe("/journey/galaxy.webp");
    expect(galaxyFor("lite")).toBe("/journey/galaxy-2048.webp");
    expect(galaxyFor("2d")).toBe("/journey/galaxy-2048.webp");
  });
```

- [ ] **Step 2: 실패를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4 src/lib/journey/capability.test.ts`
Expected: FAIL — `Tests  2 failed | 5 passed (7)`(`expected undefined to deeply equal { full: …`, `TypeError: galaxyFor is not a function`)

- [ ] **Step 3: 실패하는 e2e를 쓴다**

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts
    const full = await readStats(page);
    expect(full.quality).toEqual({ tier: "full", dpr: 2, galaxyWidth: 4096, bloomLevels: 8, luminanceScale: 1 });
    expect(full.renderTargetBytes).toBeGreaterThan(0);
    await page.goto("/journey?debug=stats&tier=lite");
    await waitReady(page);
    const lite = await readStats(page);
    expect(lite.quality).toEqual({ tier: "lite", dpr: 1.5, galaxyWidth: 2048, bloomLevels: 6, luminanceScale: 0.5 });
    // 텍스처 추정: 58.8MiB에서 은하가 32.0 → 8.0MiB(스펙 5절)
```

바꿀 내용:

```ts
    const full = await readStats(page);
    expect(full.quality).toEqual({ tier: "full", level: "full", dpr: 2, galaxyWidth: 4096, bloomLevels: 8, luminanceScale: 1 });
    expect(full.renderTargetBytes).toBeGreaterThan(0);
    await page.goto("/journey?debug=stats&tier=lite");
    await waitReady(page);
    const lite = await readStats(page);
    expect(lite.quality).toEqual({ tier: "lite", level: "lite", dpr: 1.5, galaxyWidth: 2048, bloomLevels: 6, luminanceScale: 0.5 });
    // 텍스처 추정: 58.8MiB에서 은하가 32.0 → 8.0MiB(스펙 5절)
```

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts

test.describe("터치 기기", () => {
```

바꿀 내용:

```ts

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

test.describe("터치 기기", () => {
```

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts
  landscape: LandscapeStats | null;
  quality: { tier: string; dpr: number; galaxyWidth: number; bloomLevels: number; luminanceScale: number } | null;
  renderTargetBytes: number;
```

바꿀 내용:

```ts
  landscape: LandscapeStats | null;
  quality: { tier: string; level: string; dpr: number; galaxyWidth: number; bloomLevels: number; luminanceScale: number } | null;
  renderTargetBytes: number;
```

- [ ] **Step 4: e2e 실패를 확인한다**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`·`3000`은 무시)

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts -g "늦추면|자동화 브라우저|측정 오버레이\(|기기 단계\(전체\)부터|배율 2·은하"` (Playwright가 매번 `next build`부터 한다. 2~6분)
Expected: FAIL — `10 failed`. 통계에 품질 단계가 없고(`Received: null`, 배율 2 화면 테스트는 `level`이 없다), 늦춰도 2D가 되지 않는다(`Expected: "2d"`, `Received: null`)

- [ ] **Step 5: 품질 단계 표와 은하 선택을 쓴다**

`src/lib/journey/capability.ts`에서 찾을 부분:

```ts
import { GALAXY_LITE_URL, GALAXY_URL } from "./space";
import { hasWebGL2 } from "./webgl";

/**
 * 기기 단계(스펙 5절 "기기 대응"). 페이지를 열 때 한 번 정한다. 실행 중에 단계를 바꾸는 것은 2-4b의 "실행 중 강등"이다.
 * - 3D 전체: WebGL2가 되고 포인터가 정밀한 기기(데스크톱·노트북)
```

바꿀 내용:

```ts
import type { QualityLevel } from "./journeyMode";
import { GALAXY_LITE_URL, GALAXY_URL } from "./space";
import { hasWebGL2 } from "./webgl";

/**
 * 기기 단계(스펙 5절 "기기 대응"). 페이지를 열 때 한 번 정한다. 실행 중에 품질을 내리는 것은 따로 있는 "실행 중 강등"이다(2-4b).
 * - 3D 전체: WebGL2가 되고 포인터가 정밀한 기기(데스크톱·노트북)
```

`src/lib/journey/capability.ts`에서 찾을 부분:

```ts
/**
 * 3D 단계별 품질(스펙 5절, 2-4a). 경량은 해상도 배율 상한·은하 해상도·블룸 비용을 줄이고 길·궤적·차·풍경·홀로그램 연출은 그대로 둔다.
 * 블룸은 끄지 않는다(끄면 주행 장면의 빛이 납작해졌다). mipmap 블러를 쓰므로 비용은 휘도 패스의 해상도와 mip 단계 수가 정한다
 * (postprocessing 6.38 BloomEffect의 resolutionScale은 mipmap 블러에 쓰이지 않는다). 휴대폰 실측에서 30fps를 못 지키면 경량 블룸을 끈다.
 */
export interface Quality {
  /** Canvas dpr 범위(최소, 최대) */
  dpr: [number, number];
  galaxy: string;
  /** 휘도 패스의 해상도 비율과 mipmap 블러 단계 수(postprocessing 기본값 1·8) */
  bloom: { luminanceScale: number; levels: number };
}

export const QUALITY: Record<Exclude<Tier, "2d">, Quality> = {
  full: { dpr: [1, 2], galaxy: GALAXY_URL, bloom: { luminanceScale: 1, levels: 8 } },
  lite: { dpr: [1, 1.5], galaxy: GALAXY_LITE_URL, bloom: { luminanceScale: 0.5, levels: 6 } },
};

```

바꿀 내용:

```ts
/**
 * 3D 품질 단계(스펙 5절, 2-4a·2-4b). 처음 단계는 기기 단계가 정하고(전체·경량), 실행 중 강등이 한 단계씩 내린다(journeyMode.ts).
 * 경량은 해상도 배율 상한과 블룸 비용을 줄이고, 최소는 배율 1에 블룸을 끈다. 길·궤적·차·풍경·홀로그램 연출과 톤 매핑·비네트·SMAA는
 * 그대로 둔다. mipmap 블러를 쓰므로 블룸 비용은 휘도 패스의 해상도와 mip 단계 수가 정한다(postprocessing 6.38 BloomEffect의
 * resolutionScale은 mipmap 블러에 쓰이지 않는다).
 */
export interface LevelQuality {
  /** Canvas dpr 범위(최소, 최대) */
  dpr: [number, number];
  /** 휘도 패스의 해상도 비율과 mipmap 블러 단계 수(postprocessing 기본값 1·8). 없으면 블룸을 끈다 */
  bloom: { luminanceScale: number; levels: number } | null;
}

export const LEVEL_QUALITY: Record<QualityLevel, LevelQuality> = {
  full: { dpr: [1, 2], bloom: { luminanceScale: 1, levels: 8 } },
  lite: { dpr: [1, 1.5], bloom: { luminanceScale: 0.5, levels: 6 } },
  min: { dpr: [1, 1], bloom: null },
};

/** 은하는 기기 단계로 정한다(전체는 원본 4096, 그 밖은 2048). 실행 중 강등은 은하를 다시 내려받지 않는다 */
export function galaxyFor(tier: Tier): string {
  return tier === "full" ? GALAXY_URL : GALAXY_LITE_URL;
}

```

`src/lib/journey/capability.ts`에서 찾을 부분:

```ts
}

/** 지금 페이지의 3D 품질. 장면 코드만 부른다(2D면 장면을 띄우지 않는다) */
export function sceneQuality(): Quality {
  return QUALITY[detectTier() === "lite" ? "lite" : "full"];
}
```

바꿀 내용:

```ts
}
```

- [ ] **Step 6: 단위 통과를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4 src/lib/journey/capability.test.ts`
Expected: PASS — `Tests  7 passed (7)`

- [ ] **Step 7: 장면이 품질 단계를 따르고 렌더 단계가 강등을 감시한다**

`src/components/journey/scene/Scene.tsx`에서 찾을 부분:

```tsx
import { WebGLRenderer, type WebGLRendererParameters } from "three";
import { sceneQuality } from "@/lib/journey/capability";
import { driveAt } from "@/lib/journey/drive";
```

바꿀 내용:

```tsx
import { WebGLRenderer, type WebGLRendererParameters } from "three";
import { LEVEL_QUALITY } from "@/lib/journey/capability";
import { getJourneyMode } from "@/lib/journey/journeyMode";
import { driveAt } from "@/lib/journey/drive";
```

`src/components/journey/scene/Scene.tsx`에서 찾을 부분:

```tsx
export default function Scene() {
  // 해상도 배율 상한은 기기 단계를 따른다(3D 전체 2, 경량 1.5, 스펙 5절)
  const [dpr] = useState(() => sceneQuality().dpr);
  return (
```

바꿀 내용:

```tsx
export default function Scene() {
  // 처음 해상도 배율 상한은 지금 품질 단계를 따른다(전체 2, 경량 1.5, 최소 1, 스펙 5절). 실행 중 강등은 Effects가 setDpr로 바꾼다
  const [dpr] = useState(() => LEVEL_QUALITY[getJourneyMode().quality].dpr);
  return (
```

`src/components/journey/scene/Sky.tsx`에서 찾을 부분:

```tsx
} from "three";
import { sceneQuality } from "@/lib/journey/capability";
import { SKY_ROTATION } from "@/lib/journey/space";
```

바꿀 내용:

```tsx
} from "three";
import { detectTier, galaxyFor } from "@/lib/journey/capability";
import { SKY_ROTATION } from "@/lib/journey/space";
```

`src/components/journey/scene/Sky.tsx`에서 찾을 부분:

```tsx
export function Sky() {
  const [url] = useState(() => sceneQuality().galaxy);
  const texture = useTexture(url, asEquirect);
```

바꿀 내용:

```tsx
export function Sky() {
  const [url] = useState(() => galaxyFor(detectTier()));
  const texture = useTexture(url, asEquirect);
```

`src/components/journey/scene/Effects.tsx`에서 찾을 부분:

```tsx

import { Bloom, EffectComposer, SMAA, ToneMapping, Vignette } from "@react-three/postprocessing";
import { useEffect, useRef, useState, type ComponentRef } from "react";
import { sceneQuality } from "@/lib/journey/capability";
import { recordPostprocessing, statsEnabled, type BloomProbe } from "./frameStats";
```

바꿀 내용:

```tsx

import { useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, SMAA, ToneMapping, Vignette } from "@react-three/postprocessing";
import { useEffect, useRef, useState, useSyncExternalStore, type ComponentRef } from "react";
import { LEVEL_QUALITY } from "@/lib/journey/capability";
import { getJourneyMode, subscribeJourneyMode, type QualityLevel } from "@/lib/journey/journeyMode";
import { recordPostprocessing, statsEnabled, type BloomProbe } from "./frameStats";
```

`src/components/journey/scene/Effects.tsx`에서 찾을 부분:

```tsx
 * ?debug=stats&bloom=off면 블룸 세기만 0으로 둔다(나머지 패스는 그대로). check:holograms가 두 장으로 홀로그램 화면에 블룸이 더한 몫을 잰다.
 * 3D 경량은 블룸의 휘도 패스를 절반 해상도로, mip 단계를 줄여 그린다(스펙 5절). ?debug=stats면 후처리를 통계에 넘겨 렌더 타깃 메모리를 잰다.
 */
export function Effects() {
  const [bloom] = useState(() => !(statsEnabled() && new URLSearchParams(window.location.search).get("bloom") === "off"));
  const [quality] = useState(() => sceneQuality().bloom);
  const composer = useRef<ComponentRef<typeof EffectComposer>>(null);

  useEffect(() => {
    const bloomEffect = findBloom(composer.current);
    if (bloomEffect) bloomEffect.luminancePass.resolution.scale = quality.luminanceScale;
    recordPostprocessing({ composer: composer.current, bloom: bloomEffect });
    return () => recordPostprocessing(null);
  }, [quality]);

  return (
    <EffectComposer ref={composer} multisampling={0}>
      <Bloom mipmapBlur levels={quality.levels} luminanceThreshold={1} luminanceSmoothing={0.2} intensity={bloom ? 0.9 : 0} />
      <ToneMapping mode={NEUTRAL_TONE_MAPPING} />
```

바꿀 내용:

```tsx
 * ?debug=stats&bloom=off면 블룸 세기만 0으로 둔다(나머지 패스는 그대로). check:holograms가 두 장으로 홀로그램 화면에 블룸이 더한 몫을 잰다.
 * 품질 단계(스펙 5절, 2-4b)를 따른다: 경량은 블룸의 휘도 패스를 절반 해상도로, mip 단계를 줄여 그리고, 최소는 블룸을 뺀다. 실행 중 강등으로
 * 단계가 바뀌면 해상도 배율(setDpr)도 함께 내리고, 배율만 바뀐 때는 래퍼가 버퍼 크기를 다시 잡지 않으므로 컴포저 크기를 직접 다시 잡는다
 * (그러지 않으면 후처리 버퍼가 예전 해상도로 남아 GPU 비용이 줄지 않는다). ?debug=stats면 후처리를 통계에 넘겨 렌더 타깃 메모리를 잰다.
 */
export function Effects() {
  const [bloomOn] = useState(() => !(statsEnabled() && new URLSearchParams(window.location.search).get("bloom") === "off"));
  const level = useSyncExternalStore(subscribeJourneyMode, () => getJourneyMode().quality, (): QualityLevel => "full");
  const { dpr, bloom } = LEVEL_QUALITY[level];
  const composer = useRef<ComponentRef<typeof EffectComposer>>(null);
  const setDpr = useThree((state) => state.setDpr);
  const pixelRatio = useThree((state) => state.viewport.dpr);
  const size = useThree((state) => state.size);

  useEffect(() => setDpr(dpr), [dpr, setDpr]);

  useEffect(() => {
    composer.current?.setSize(size.width, size.height);
  }, [pixelRatio, size]);

  useEffect(() => {
    const bloomEffect = findBloom(composer.current);
    if (bloomEffect && bloom) bloomEffect.luminancePass.resolution.scale = bloom.luminanceScale;
    recordPostprocessing({ composer: composer.current, bloom: bloomEffect });
    return () => recordPostprocessing(null);
  }, [bloom]);

  return (
    <EffectComposer ref={composer} multisampling={0}>
      {bloom ? (
        <Bloom mipmapBlur levels={bloom.levels} luminanceThreshold={1} luminanceSmoothing={0.2} intensity={bloomOn ? 0.9 : 0} />
      ) : (
        <></>
      )}
      <ToneMapping mode={NEUTRAL_TONE_MAPPING} />
```

`src/components/journey/scene/frameStats.ts`에서 찾을 부분:

```ts
import { detectTier, type Tier } from "@/lib/journey/capability";
import { getCarStatus, type CarStatus } from "@/lib/journey/sceneStatus";
```

바꿀 내용:

```ts
import { detectTier, type Tier } from "@/lib/journey/capability";
import { getJourneyMode, type QualityLevel } from "@/lib/journey/journeyMode";
import { getCarStatus, type CarStatus } from "@/lib/journey/sceneStatus";
```

`src/components/journey/scene/frameStats.ts`에서 찾을 부분:

```ts
  landscape: LandscapeStats | null;
  /** 기기 단계와 그 품질(2-4a). 준비된 순간에 쓴다 */
  quality: QualityStats | null;
```

바꿀 내용:

```ts
  landscape: LandscapeStats | null;
  /** 기기 단계와 지금 품질 단계(2-4a·2-4b). 준비된 순간부터 프레임마다 쓴다(실행 중 강등으로 바뀐다) */
  quality: QualityStats | null;
```

`src/components/journey/scene/frameStats.ts`에서 찾을 부분:

```ts

/** 기기 단계와 그 품질(스펙 5절): 단계, 실제 해상도 배율, 은하 폭, 블룸 mip 단계, 블룸 휘도 패스의 해상도 비율 */
export interface QualityStats {
  tier: Tier;
  dpr: number;
```

바꿀 내용:

```ts

/** 기기 단계와 품질(스펙 5절): 기기 단계, 지금 품질 단계, 실제 해상도 배율, 은하 폭, 블룸 mip 단계(블룸을 끄면 0), 블룸 휘도 패스의 해상도 비율 */
export interface QualityStats {
  tier: Tier;
  level: QualityLevel;
  dpr: number;
```

`src/components/journey/scene/frameStats.ts`에서 찾을 부분:

```ts
  return debug === "stats" || debug === "perf";
}
```

바꿀 내용:

```ts
  return debug === "stats" || debug === "perf";
}

/** 확인용 ?debug=stats(또는 perf)&busy=<ms>: 렌더 단계마다 그 시간만큼 일부러 끌어 실행 중 강등을 재현한다(2-4b). 없으면 0 */
export function busyMs(): number {
  if (!statsEnabled()) return 0;
  const busy = Number(new URLSearchParams(window.location.search).get("busy"));
  return Number.isFinite(busy) && busy > 0 ? busy : 0;
}
```

`src/components/journey/scene/frameStats.ts`에서 찾을 부분:

```ts
      }
    },
```

바꿀 내용:

```ts
      }
      if (stats.quality) {
        const bloom = latestPostprocessing?.bloom ?? null;
        stats.quality.level = getJourneyMode().quality;
        stats.quality.dpr = gl.getPixelRatio();
        stats.quality.bloomLevels = bloom?.mipmapBlurPass.levels ?? 0;
        stats.quality.luminanceScale = bloom?.luminancePass.resolution.scale ?? 0;
      }
    },
```

`src/components/journey/scene/frameStats.ts`에서 찾을 부분:

```ts
        tier: detectTier(),
        dpr: gl.getPixelRatio(),
```

바꿀 내용:

```ts
        tier: detectTier(),
        level: getJourneyMode().quality,
        dpr: gl.getPixelRatio(),
```

`src/components/journey/scene/Warmup.tsx`에서 찾을 부분:

```tsx
import { HalfFloatType, WebGLRenderTarget, type PerspectiveCamera } from "three";
import { setRenderStep } from "@/lib/journey/engine";
import { setSceneStatus } from "@/lib/journey/sceneStatus";
import { createStatsRecorder, statsEnabled } from "./frameStats";
import { watchRenderer } from "./watchRenderer";
```

바꿀 내용:

```tsx
import { HalfFloatType, WebGLRenderTarget, type PerspectiveCamera } from "three";
import { createWatch, frameTooSlow, holdWatch } from "@/lib/journey/downgrade";
import { setRenderStep } from "@/lib/journey/engine";
import { downgrade, getJourneyMode } from "@/lib/journey/journeyMode";
import { setSceneStatus } from "@/lib/journey/sceneStatus";
import { applyMode } from "../modeSwitch";
import { busyMs, createStatsRecorder, statsEnabled } from "./frameStats";
import { watchRenderer } from "./watchRenderer";
```

`src/components/journey/scene/Warmup.tsx`에서 찾을 부분:

```tsx
 * Canvas의 마지막 자식이라 다른 자식(차 모델, 환경맵, 후처리)이 자리를 잡은 뒤에 effect가 돈다.
 */
```

바꿀 내용:

```tsx
 * Canvas의 마지막 자식이라 다른 자식(차 모델, 환경맵, 후처리)이 자리를 잡은 뒤에 effect가 돈다.
 * 실행 중 강등(스펙 5절, 2-4b): 준비된 뒤부터 렌더 단계마다 프레임 시각을 강등 판정(downgrade.ts)에 넘기고, 너무 느리면 한 단계 내린다
 * (마지막은 2D). 준비된 직후·단계를 바꾼 직후 1초와 탭이 가려진 동안은 세지 않는다. 측정 오버레이(?debug=perf) 중에는 단계를 바꾸지 않는다.
 * 자동화 브라우저(navigator.webdriver: e2e·캡처·perf:journey)도 바꾸지 않는다. e2e의 헤드리스는 소프트웨어 렌더링이라 느려서, 다른 검사 도중
 * 단계가 바뀌면 블룸을 다시 만들며 검사가 흔들린다. 확인용 ?busy=가 있으면 자동화 브라우저에서도 감시한다(강등 e2e).
 */
```

`src/components/journey/scene/Warmup.tsx`에서 찾을 부분:

```tsx
    gl.setRenderTarget(previous);
    compiling.then(
```

바꿀 내용:

```tsx
    gl.setRenderTarget(previous);
    const busy = busyMs();
    const watching = new URLSearchParams(window.location.search).get("debug") !== "perf" && (busy > 0 || !navigator.webdriver);
    const watch = createWatch();
    compiling.then(
```

`src/components/journey/scene/Warmup.tsx`에서 찾을 부분:

```tsx
          stats?.begin();
          advance(timeMs / 1000);
```

바꿀 내용:

```tsx
          stats?.begin();
          if (busy > 0) {
            const until = performance.now() + busy;
            while (performance.now() < until);
          }
          advance(timeMs / 1000);
```

`src/components/journey/scene/Warmup.tsx`에서 찾을 부분:

```tsx
            stats?.ready();
          }
```

바꿀 내용:

```tsx
            stats?.ready();
            holdWatch(watch, timeMs);
          }
          if (frames <= HIDDEN_FRAMES || !watching) return;
          if (document.hidden) holdWatch(watch, timeMs);
          else if (frameTooSlow(watch, timeMs, getJourneyMode().quality)) {
            holdWatch(watch, timeMs);
            const mode = getJourneyMode();
            const next = downgrade(mode);
            if (next !== mode) applyMode(next);
          }
```

- [ ] **Step 8: e2e 통과를 확인한다**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`·`3000`은 무시)

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts -g "늦추면|자동화 브라우저|측정 오버레이\(|기기 단계\(전체\)부터|배율 2·은하"` (Playwright가 매번 `next build`부터 한다. 2~6분)
Expected: PASS — `10 passed`(busy 50ms: 단계가 full → lite → min 순서, 최소에서 블룸 0단계, 2D(이유 slow)와 알림, 보던 Stock2U 카드 위끝 104px, 다시 고른 3D는 min에서 6초 동안 2D로 내려가지 않는다)

- [ ] **Step 9: 전체 확인**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`·`3000`은 무시)

Run: `rtk proxy npx tsc --noEmit` → exit 0
Run: `rtk proxy npx vitest run --maxWorkers=4` → `Tests  426 passed (426)`
Run: `rtk proxy npx eslint src/lib/journey/capability.ts src/lib/journey/capability.test.ts src/components/journey/scene/Scene.tsx src/components/journey/scene/Sky.tsx src/components/journey/scene/Effects.tsx src/components/journey/scene/frameStats.ts src/components/journey/scene/Warmup.tsx e2e/journey.e2e.ts` → exit 0, 문제 0(`baseline-browser-mapping` 안내 한 줄은 린트 결과가 아니다)

- [ ] **Step 10: 커밋 정리를 제출한다**

파일별 변경 표와 메시지 초안. 초안 예:

```
feat: 여정 실행 중 강등(전체 → 경량 → 최소 → 2D) 연결

- 렌더 단계가 준비된 뒤 2초 창 fps를 재 너무 느리면 해상도 배율·블룸을 한 단계 내리고, 최소에서도 느리면 2D로 바꾼다(차 모델과 은하는 그대로)
- 배율만 바뀌어도 후처리 버퍼 크기를 다시 잡아 실제로 비용이 준다
- 측정 오버레이와 자동화 브라우저에서는 바꾸지 않고, 확인용 ?debug=stats&busy=로 재현한다
```

---

### Task 8: 움직임 줄이기와 휴대폰 상세 시트

스펙 5절 "움직임 줄이기"(사용자 결정: 3D 유지, 저절로 더 움직이는 것만 끔)와 "2D 레이아웃"의 상세 시트다. `motion.ts`가 `prefers-reduced-motion`을 읽고 바뀌면 알린다. Lenis는 이 설정에서 휠을 브라우저 기본 스크롤에 맡기고(`smoothWheel` 끔. Lenis 1.3.26은 코드가 부르는 스크롤만 즉시로 바꾼다), 카메라 감쇠는 프레임 간격을 무한대로 넘겨 끄고, 빛줄기는 감추고, 별 먼지는 떠다니지 않는다. CSS는 고정 카드 바꿈·2D 등장 효과를 끈다. 휴대폰(640px 미만)의 상세는 아래에서 0.25초 올라오고(움직임 허용일 때만), `?debug=stats`는 카메라 뒤처짐(`cameraLag`)과 빛줄기(`streaks`)를 낸다.

**Files:**
- Create: `src/lib/journey/motion.ts`
- Modify: `e2e/journey.e2e.ts`, `src/app/globals.css`, `src/components/journey/ProjectDialog.tsx`, `src/components/journey/scene/CameraRig.tsx`, `src/components/journey/scene/Dust.tsx`, `src/components/journey/scene/Streaks.tsx`, `src/components/journey/scene/frameStats.ts`, `src/components/journey/useJourneyScroll.ts`

**Interfaces:**
- Consumes: `followCamera`(drive.ts), `followPortrait`·`portraitCamera`(portrait.ts)
- Produces: `prefersReducedMotion(): boolean`, `subscribeReducedMotion(listener): () => void`(motion.ts), `recordCameraLag(lag)`, `JourneyStats.cameraLag`·`.streaks`(frameStats.ts), 빛줄기 메시 이름 `journey-streaks`, CSS `@keyframes journey-sheet`

- [ ] **Step 1: 실패하는 e2e를 쓴다**

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts

test.describe("터치 기기", () => {
```

바꿀 내용:

```ts

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

test.describe("터치 기기", () => {
```

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts
  lens: { fov: number; center: number };
};
```

바꿀 내용:

```ts
  lens: { fov: number; center: number };
  cameraLag: number;
  streaks: boolean;
};
```

- [ ] **Step 2: e2e 실패를 확인한다**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`·`3000`은 무시)

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts -g "움직임 줄이기"` (Playwright가 매번 `next build`부터 한다. 2~6분)
Expected: FAIL — `6 failed`. 통계에 카메라 뒤처짐이 없고(`Received: NaN`), 움직임 줄이기의 2D 카드가 감춰져 있다(`"0"`, `matrix(1, 0, 0, 1, 0, 20)`)

- [ ] **Step 3: 움직임 줄이기 모듈과 스크롤·카메라·빛줄기·먼지·통계를 쓴다**

`src/lib/journey/motion.ts` 전체:

```ts
/**
 * 움직임 줄이기(prefers-reduced-motion, 스펙 5절 "움직임 줄이기", 2-4b). 3D는 그대로 보이고, 스크롤을 멈춘 뒤에도 이어지는 움직임만 끈다
 * (Lenis 휠 관성, 카메라 감쇠, 빛줄기, 별 먼지의 떠다님, 카드 바꿈·2D 등장·상세 시트 효과). 설정이 바뀌면 곧바로 따른다.
 * 미디어 쿼리 하나를 두고 읽는다(프레임마다 읽어도 새로 만들지 않는다). 브라우저에서만 부른다.
 */
let query: MediaQueryList | null = null;

function reducedQuery(): MediaQueryList {
  query ??= window.matchMedia("(prefers-reduced-motion: reduce)");
  return query;
}

export function prefersReducedMotion(): boolean {
  return reducedQuery().matches;
}

export function subscribeReducedMotion(listener: () => void): () => void {
  const media = reducedQuery();
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}
```

`src/components/journey/useJourneyScroll.ts`에서 찾을 부분:

```ts
import { renderFrame, setLenis } from "@/lib/journey/engine";
import { setProgress } from "@/lib/journey/scrollState";
```

바꿀 내용:

```ts
import { renderFrame, setLenis } from "@/lib/journey/engine";
import { prefersReducedMotion, subscribeReducedMotion } from "@/lib/journey/motion";
import { setProgress } from "@/lib/journey/scrollState";
```

`src/components/journey/useJourneyScroll.ts`에서 찾을 부분:

```ts
 * 스크롤 위치의 원천은 브라우저 기본 스크롤이라 키보드·찾기·접근성이 그대로 동작한다.
 * 터치는 Lenis 기본값(syncTouch: false)대로 OS 관성을 쓰고, 움직임 줄이기 설정은 Lenis가 존중한다.
 * 휠은 그 방향으로 더 굴릴 수 있는 안쪽 요소(넘친 엔딩 패널)가 있으면 그 요소가 받는다(allowNestedScroll). 끝에 닿으면 다시 페이지가 굴러간다.
```

바꿀 내용:

```ts
 * 스크롤 위치의 원천은 브라우저 기본 스크롤이라 키보드·찾기·접근성이 그대로 동작한다.
 * 터치는 Lenis 기본값(syncTouch: false)대로 OS 관성을 쓴다. 움직임 줄이기면 휠도 브라우저 기본 스크롤에 맡긴다(smoothWheel 끔). Lenis 1.3.26은
 * 이 설정에서 코드가 부르는 스크롤만 즉시로 바꾸고 휠 관성은 그대로 둔다(2-4b).
 * 휠은 그 방향으로 더 굴릴 수 있는 안쪽 요소(넘친 엔딩 패널)가 있으면 그 요소가 받는다(allowNestedScroll). 끝에 닿으면 다시 페이지가 굴러간다.
```

`src/components/journey/useJourneyScroll.ts`에서 찾을 부분:

```ts
    gsap.registerPlugin(ScrollTrigger);
    const lenis = new Lenis({ autoRaf: false, allowNestedScroll: true });
    setLenis(lenis);

```

바꿀 내용:

```ts
    gsap.registerPlugin(ScrollTrigger);
    const lenis = new Lenis({ autoRaf: false, allowNestedScroll: true, smoothWheel: !prefersReducedMotion() });
    setLenis(lenis);
    const unsubscribeMotion = subscribeReducedMotion(() => {
      lenis.options.smoothWheel = !prefersReducedMotion();
    });

```

`src/components/journey/useJourneyScroll.ts`에서 찾을 부분:

```ts
    return () => {
      window.removeEventListener(LAYOUT_EVENT, relayout);
```

바꿀 내용:

```ts
    return () => {
      unsubscribeMotion();
      window.removeEventListener(LAYOUT_EVENT, relayout);
```

`src/components/journey/scene/CameraRig.tsx`에서 찾을 부분:

```tsx
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { PerspectiveCamera } from "three";
import { followCamera, type CameraFollow, type CameraPose } from "@/lib/journey/drive";
import { isPortrait, lensFor } from "@/lib/journey/lens";
import { followPortrait, type PortraitView } from "@/lib/journey/portrait";
import { currentDrive } from "./driveFrame";

```

바꿀 내용:

```tsx
import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import type { PerspectiveCamera } from "three";
import { followCamera, type CameraFollow, type CameraPose } from "@/lib/journey/drive";
import { isPortrait, lensFor } from "@/lib/journey/lens";
import { prefersReducedMotion } from "@/lib/journey/motion";
import { followPortrait, portraitCamera, type PortraitView } from "@/lib/journey/portrait";
import { currentDrive } from "./driveFrame";
import { recordCameraLag, statsEnabled } from "./frameStats";

```

`src/components/journey/scene/CameraRig.tsx`에서 찾을 부분:

```tsx
 * 화면을 돌려 가로·세로가 바뀌면 새 카메라는 첫 프레임처럼 목표에 바로 놓인다.
 */
```

바꿀 내용:

```tsx
 * 화면을 돌려 가로·세로가 바뀌면 새 카메라는 첫 프레임처럼 목표에 바로 놓인다.
 * 움직임 줄이기면 감쇠를 끈다(프레임 간격을 무한대로 넘겨 목표에 바로 놓는다). 카메라는 스크롤한 만큼만 움직이고 뒤따라 흘러가지 않는다(2-4b).
 * ?debug=stats면 감쇠한 자세와 목표 자세의 거리(카메라 뒤처짐)를 통계에 남긴다.
 */
```

`src/components/journey/scene/CameraRig.tsx`에서 찾을 부분:

```tsx
  const lensKey = useRef("");

```

바꿀 내용:

```tsx
  const lensKey = useRef("");
  const [stats] = useState(statsEnabled);

```

`src/components/journey/scene/CameraRig.tsx`에서 찾을 부분:

```tsx
    const drive = currentDrive();
    let pose: CameraPose;
    // 첫 프레임(follow가 없을 때)은 목표 자세에 바로 놓는다. 원점에서 날아오는 연출을 막는다.
    if (isPortrait(width, height)) {
      const next = followPortrait(portraitFollow.current, drive, delta, window.location.hash);
      portraitFollow.current = next.follow;
      follow.current = null;
      pose = next.pose;
    } else {
      const next = followCamera(follow.current, drive, delta);
      follow.current = next.follow;
      portraitFollow.current = null;
      pose = next.pose;
    }
    camera.position.set(...pose.position);
```

바꿀 내용:

```tsx
    const drive = currentDrive();
    const dt = prefersReducedMotion() ? Infinity : delta;
    let pose: CameraPose;
    let goal: CameraPose | null = null;
    // 첫 프레임(follow가 없을 때)은 목표 자세에 바로 놓는다. 원점에서 날아오는 연출을 막는다.
    if (isPortrait(width, height)) {
      const next = followPortrait(portraitFollow.current, drive, dt, window.location.hash);
      portraitFollow.current = next.follow;
      follow.current = null;
      pose = next.pose;
      if (stats) goal = portraitCamera(drive, window.location.hash);
    } else {
      const next = followCamera(follow.current, drive, dt);
      follow.current = next.follow;
      portraitFollow.current = null;
      pose = next.pose;
      if (stats) goal = followCamera(null, drive, dt).pose;
    }
    if (goal) recordCameraLag(Math.hypot(...pose.position.map((value, axis) => value - (goal as CameraPose).position[axis])));
    camera.position.set(...pose.position);
```

`src/components/journey/scene/Streaks.tsx`에서 찾을 부분:

```tsx
import { AdditiveBlending, BufferAttribute, BufferGeometry, DoubleSide, Mesh, MeshBasicMaterial } from "three";
import { STREAK_VERTICES, streakIndices, writeStreaks } from "@/lib/journey/streaks";
```

바꿀 내용:

```tsx
import { AdditiveBlending, BufferAttribute, BufferGeometry, DoubleSide, Mesh, MeshBasicMaterial } from "three";
import { prefersReducedMotion } from "@/lib/journey/motion";
import { STREAK_VERTICES, streakIndices, writeStreaks } from "@/lib/journey/streaks";
```

`src/components/journey/scene/Streaks.tsx`에서 찾을 부분:

```tsx
  const mesh = new Mesh(geometry, material);
  // 정점이 매 프레임 바뀌어 경계 구가 맞지 않는다. 차 바로 뒤라 늘 화면 안이다.
```

바꿀 내용:

```tsx
  const mesh = new Mesh(geometry, material);
  mesh.name = "journey-streaks";
  // 정점이 매 프레임 바뀌어 경계 구가 맞지 않는다. 차 바로 뒤라 늘 화면 안이다.
```

`src/components/journey/scene/Streaks.tsx`에서 찾을 부분:

```tsx

function update(streaks: StreakMesh, camera: { x: number; y: number; z: number }): void {
  writeStreaks(currentDrive(), [camera.x, camera.y, camera.z], streaks.positions.array as Float32Array, streaks.colors.array as Float32Array);
```

바꿀 내용:

```tsx

/** 매 프레임 다시 그린다. 움직임 줄이기면 감추고 그리지 않는다 */
function update(streaks: StreakMesh, camera: { x: number; y: number; z: number }, visible: boolean): void {
  streaks.mesh.visible = visible;
  if (!visible) return;
  writeStreaks(currentDrive(), [camera.x, camera.y, camera.z], streaks.positions.array as Float32Array, streaks.colors.array as Float32Array);
```

`src/components/journey/scene/Streaks.tsx`에서 찾을 부분:

```tsx

/** 테일라이트 빛줄기(스펙 3절 "차"). 매 프레임 도로 곡률을 따라 다시 그린다. 드로콜 하나다 */
export function Streaks() {
  const streaks = useMemo(() => createStreaks(), []);
  useEffect(() => () => streaks.dispose(), [streaks]);
  useFrame((state) => update(streaks, state.camera.position));
  return <primitive object={streaks.mesh} />;
```

바꿀 내용:

```tsx

/** 테일라이트 빛줄기(스펙 3절 "차"). 매 프레임 도로 곡률을 따라 다시 그린다. 드로콜 하나다. 움직임 줄이기면 감춘다(2-4b) */
export function Streaks() {
  const streaks = useMemo(() => createStreaks(), []);
  useEffect(() => () => streaks.dispose(), [streaks]);
  useFrame((state) => update(streaks, state.camera.position, !prefersReducedMotion()));
  return <primitive object={streaks.mesh} />;
```

`src/components/journey/scene/Dust.tsx`에서 찾을 부분:

```tsx
import type { Group } from "three";
import { DUST_COUNT, dustField } from "@/lib/journey/space";
```

바꿀 내용:

```tsx
import type { Group } from "three";
import { prefersReducedMotion } from "@/lib/journey/motion";
import { DUST_COUNT, dustField } from "@/lib/journey/space";
```

`src/components/journey/scene/Dust.tsx`에서 찾을 부분:

```tsx
 * 길 양옆에 천천히 떠다니는 별 먼지(사이트 공통 배경의 별 먼지와 같은 결). 차와 카메라가 지나는 길에서 비켜 두어
 * 가까운 먼지가 화면에 큰 원으로 보이지 않는다(lib/journey/space.ts DUST_CLEARANCE).
 */
```

바꿀 내용:

```tsx
 * 길 양옆에 천천히 떠다니는 별 먼지(사이트 공통 배경의 별 먼지와 같은 결). 차와 카메라가 지나는 길에서 비켜 두어
 * 가까운 먼지가 화면에 큰 원으로 보이지 않는다(lib/journey/space.ts DUST_CLEARANCE). 움직임 줄이기면 떠다니지 않는다(2-4b).
 */
```

`src/components/journey/scene/Dust.tsx`에서 찾을 부분:

```tsx
  useFrame((_, delta) => {
    time.current += Math.min(delta, MAX_DELTA);
    group.current?.position.set(Math.sin(time.current * 0.13) * 0.15, Math.sin(time.current * 0.2) * 0.25, 0);
```

바꿀 내용:

```tsx
  useFrame((_, delta) => {
    if (!prefersReducedMotion()) time.current += Math.min(delta, MAX_DELTA);
    group.current?.position.set(Math.sin(time.current * 0.13) * 0.15, Math.sin(time.current * 0.2) * 0.25, 0);
```

`src/components/journey/scene/frameStats.ts`에서 찾을 부분:

```ts
  lens: { fov: number; center: number };
}
```

바꿀 내용:

```ts
  lens: { fov: number; center: number };
  /** 지난 프레임의 카메라 뒤처짐(m, 2-4b): 감쇠한 자세와 목표 자세의 거리. 움직임 줄이기면 0이다 */
  cameraLag: number;
  /** 빛줄기를 그리는가(2-4b). 움직임 줄이기면 감춘다 */
  streaks: boolean;
}
```

`src/components/journey/scene/frameStats.ts`에서 찾을 부분:

```ts

/** 후처리(EffectComposer와 블룸)를 넘긴다. 준비된 순간에 렌더 타깃 메모리와 블룸 값을 읽는다. 장면을 내리면 null */
```

바꿀 내용:

```ts

let latestCameraLag = 0;

/** 카메라 뒤처짐을 넘긴다(CameraRig, ?debug=stats일 때만 잰다) */
export function recordCameraLag(lag: number): void {
  latestCameraLag = lag;
}

/** 후처리(EffectComposer와 블룸)를 넘긴다. 준비된 순간에 렌더 타깃 메모리와 블룸 값을 읽는다. 장면을 내리면 null */
```

`src/components/journey/scene/frameStats.ts`에서 찾을 부분:

```ts
    lens: { fov: camera.fov, center: 0.5 },
  };
```

바꿀 내용:

```ts
    lens: { fov: camera.fov, center: 0.5 },
    cameraLag: 0,
    streaks: false,
  };
```

`src/components/journey/scene/frameStats.ts`에서 찾을 부분:

```ts
      stats.lens = { fov: camera.fov, center: view ? Number((0.5 - view.offsetY / view.fullHeight).toFixed(4)) : 0.5 };
      if (ready && stats.calls > stats.maxCalls) {
```

바꿀 내용:

```ts
      stats.lens = { fov: camera.fov, center: view ? Number((0.5 - view.offsetY / view.fullHeight).toFixed(4)) : 0.5 };
      stats.cameraLag = latestCameraLag;
      stats.streaks = scene.getObjectByName("journey-streaks")?.visible ?? false;
      if (ready && stats.calls > stats.maxCalls) {
```

- [ ] **Step 4: 상세 시트와 CSS를 쓴다**

`src/components/journey/ProjectDialog.tsx`에서 찾을 부분:

```tsx
      }}
      className="m-0 ml-auto h-dvh max-h-none w-full max-w-xl border-0 border-l border-white/10 bg-zinc-950 p-0 text-zinc-100 backdrop:bg-black/60"
    >
```

바꿀 내용:

```tsx
      }}
      className="m-0 ml-auto h-dvh max-h-none w-full max-w-xl border-0 border-l border-white/10 bg-zinc-950 p-0 text-zinc-100 backdrop:bg-black/60 max-sm:motion-safe:animate-[journey-sheet_0.25s_ease-out]"
    >
```

`src/app/globals.css` 끝에 붙인다:

```css

/* 휴대폰(640px 미만)의 상세는 이미 전체 화면이라 아래에서 올라오는 효과만 더한다(스펙 5절 "2D 레이아웃", ProjectDialog, 2-4b) */
@keyframes journey-sheet {
  from {
    transform: translateY(100%);
  }
}

/* 움직임 줄이기(스펙 5절, 2-4b): 고정 카드 바꿈과 2D 등장 효과를 끈다(카드는 감추지 않고 곧바로 보인다) */
@media (prefers-reduced-motion: reduce) {
  [data-journey-cards="fixed"][data-journey-cards-settled] [data-journey-card] {
    transition: none;
  }

  html[data-journey-mode="2d"][data-journey-reveal] :is([data-journey-card], [data-stop="ending"] > div):not([data-revealed]),
  html[data-journey-mode="2d"][data-journey-reveal] :is([data-journey-card], [data-stop="ending"] > div)[data-revealed] {
    opacity: 1;
    transform: none;
    transition: none;
  }
}
```

- [ ] **Step 5: e2e 통과를 확인한다**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`·`3000`은 무시)

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts -g "움직임 줄이기"` (Playwright가 매번 `next build`부터 한다. 2~6분)
Expected: PASS — `6 passed`(움직임 줄이기: 카메라 뒤처짐 1e-6 아래, 빛줄기 감춤, 휠 300ms 안에 390px 이상, 2D 카드 불투명도 1·transform 없음, 고정 카드 전환 0s, 상세 애니메이션 none / 아니면: 뒤처짐 0.05 넘음, 상세 `journey-sheet` 0.25s)

- [ ] **Step 6: 전체 확인**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`·`3000`은 무시)

Run: `rtk proxy npx tsc --noEmit` → exit 0
Run: `rtk proxy npx vitest run --maxWorkers=4` → `Tests  426 passed (426)`
Run: `rtk proxy npx eslint src/lib/journey/motion.ts src/components/journey/useJourneyScroll.ts src/components/journey/scene/CameraRig.tsx src/components/journey/scene/Streaks.tsx src/components/journey/scene/Dust.tsx src/components/journey/scene/frameStats.ts src/components/journey/ProjectDialog.tsx e2e/journey.e2e.ts` → exit 0, 문제 0(`baseline-browser-mapping` 안내 한 줄은 린트 결과가 아니다)

- [ ] **Step 7: 커밋 정리를 제출한다**

파일별 변경 표와 메시지 초안. 초안 예:

```
feat: 여정 움직임 줄이기와 휴대폰 상세 시트

- 움직임 줄이기면 3D는 그대로 두고 휠 관성·카메라 감쇠·빛줄기·먼지 떠다님·카드 바꿈과 2D 등장 효과를 끈다
- 휴대폰에서 상세가 아래에서 올라온다(움직임 허용일 때만)
```

---

### Task 9: 2-4a에서 미룬 넷(입구 카드 자리·세로 로딩 줄·캔버스 100vh·세로 카메라 계산)

사용자가 고른 2-4a 최종 리뷰의 미룬 것 가운데 휴대폰 첫 화면·안전망·성능 넷이다(스펙 1절 2-4b 완료 조건). 세로 화면 입구 카드는 서버가 그린 자리를 아래 고정 자리와 맞춰(아래 여백 `5svh + 3.5rem`: 서버가 그린 배치에서 본문은 헤더 아래에서 시작한다) 첫 로딩 때 옮겨지지 않게 한다. 세로 화면 로딩 줄은 진행 막대 바로 아래로 옮겨 고정 입구 카드와 겹치지 않게 한다. 캔버스 틀은 `100lvh` 대신 `100vh`(`h-screen`)다(지금 브라우저에서 같은 값, iOS 15.0~15.3에서도 높이가 무효가 되지 않는다). 세로 카메라의 정류장 홀로그램 자리(`stopFocus`)는 정류장과 홀로그램 번호로 기억해 매 프레임 홀로그램 11개를 다시 놓지 않는다(결과는 같다).

**Files:**
- Modify: `e2e/journey.e2e.ts`, `src/components/journey/JourneyContent.tsx`, `src/components/journey/SceneLoading.tsx`, `src/components/journey/scene/Scene.tsx`, `src/lib/journey/portrait.test.ts`, `src/lib/journey/portrait.ts`

**Interfaces:**
- Consumes: `hologramsAt`·`pickcareFront`·`HOLOGRAMS`(holograms.ts)
- Produces: 없음(동작 같음)

- [ ] **Step 1: 결과를 묶어 두는 단위 테스트를 쓴다**

`src/lib/journey/portrait.test.ts`에서 찾을 부분:

```ts
import { PORTRAIT_LENS, WIDE_LENS, lensFor, projectThrough } from "./lens";
import { CARDS, activeCard, cardProgress, followPortrait, portraitCamera, portraitViewWeight, type PortraitView } from "./portrait";
import { SCROLL_LENGTH, STOP_RANGES, rangeOf, stopAt, viewWeight, type Vec3 } from "./timeline";
```

바꿀 내용:

```ts
import { PORTRAIT_LENS, WIDE_LENS, lensFor, projectThrough } from "./lens";
import { CARDS, activeCard, cardProgress, followPortrait, portraitCamera, portraitViewWeight, stopFocus, type PortraitView } from "./portrait";
import { SCROLL_LENGTH, STOP_RANGES, rangeOf, stopAt, viewWeight, type Vec3 } from "./timeline";
```

`src/lib/journey/portrait.test.ts`에서 찾을 부분:

```ts

describe("아래 고정 카드", () => {
```

바꿀 내용:

```ts

describe("정류장 홀로그램 자리 기억(2-4b)", () => {
  it("정류장과 앞줄 번호로 기억해도 정류장 가운데에서 다 떠오른 홀로그램 자리를 매번 새로 계산한 것과 같다", () => {
    for (const hash of ["", "#pickcare/app", "#pickcare/frontend"]) {
      for (let index = 0; index <= 400; index++) {
        const progress = index / 400;
        const { range } = stopAt(progress);
        const indices = HOLOGRAMS.flatMap((hologram, at) => (hologram.stopId === range.stop.id ? [at] : []));
        const front = pickcareFront(progress, hash);
        const expected =
          indices.length === 0 ? null : hologramsAt((range.start + range.end) / 2, front)[range.stop.kind === "hall" ? indices[front] : indices[0]].center;
        expect(stopFocus(progress, hash), `${hash} ${progress}`).toEqual(expected);
      }
    }
  });
});

describe("아래 고정 카드", () => {
```

- [ ] **Step 2: 지금 코드에서 통과를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4 src/lib/journey/portrait.test.ts`
Expected: PASS — `Tests  13 passed (13)`. 기억하게 바꾸기 전의 결과를 묶어 두는 테스트라 지금도 통과해야 한다

- [ ] **Step 3: 실패하는 e2e를 쓴다**

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts

test("3D 캔버스 틀은 화면 위에 붙은 큰 뷰포트 높이라 휴대폰 주소창이 접히고 펴져도 크기를 다시 잡지 않는다", async ({ page }) => {
  await page.goto("/journey");
  // 주소창은 에뮬레이션에 없어, 아래끝을 화면 아래에 묶지 않았는지(계산값 bottom: auto)와 높이가 100lvh인지를 본다.
  // 묶으면 주소창이 움직일 때마다 캔버스·렌더 타깃을 다시 만들고 카메라 비율이 바뀌어 구도가 튄다
  const frame = await page.locator("[data-journey-scene]").evaluate((element) => {
    const probe = document.createElement("div");
    probe.style.cssText = "position:fixed;top:0;width:1px;height:100lvh;visibility:hidden";
    document.body.append(probe);
    const lvh = probe.getBoundingClientRect().height;
    probe.remove();
    const style = element.computedStyleMap();
    return { top: String(style.get("top")), bottom: String(style.get("bottom")), height: element.getBoundingClientRect().height, lvh };
  });
  expect(frame.top).toBe("0px");
  expect(frame.bottom).toBe("auto");
  expect(frame.height).toBeCloseTo(frame.lvh, 0);
});
```

바꿀 내용:

```ts

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
```

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts
    expect(await flashes()).toEqual([1, 1]);
  });
```

바꿀 내용:

```ts
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
```

- [ ] **Step 4: e2e 실패를 확인한다**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`·`3000`은 무시)

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts -g "서버가 그린 자리|로딩 줄은|캔버스 틀"` (Playwright가 매번 `next build`부터 한다. 2~6분)
Expected: FAIL — `4 failed | 2 passed`. 입구 패널이 하이드레이션 뒤 229.8px 내려가고(`Received: 229.8125`), 로딩 줄이 입구 패널 아래쪽에 있다(`Expected: < 615.8125`, `Received: 804`). 캔버스 틀 테스트는 Chromium에서 `lvh`와 `vh`가 같아 바꾸기 전에도 통과한다(대체값이 목적이라 이 브라우저에서 실패를 재현할 수 없다)

- [ ] **Step 5: 넷을 고친다**

`src/lib/journey/portrait.ts`에서 찾을 부분:

```ts

/** 정류장의 홀로그램 자리(없으면 null). 1·2막은 그 정류장 홀로그램, PiCKCARE는 지금 앞줄. 다 떠오른 자리(정류장 가운데)다 */
export function stopFocus(progress: number, hash = ""): Vec3 | null {
```

바꿀 내용:

```ts

/** 정류장과 그 홀로그램 번호마다 한 번 계산한 자리. 다 떠오른 자리라 진행률에 따라 바뀌지 않는다 */
const focusCache = new Map<string, Vec3>();

/**
 * 정류장의 홀로그램 자리(없으면 null). 1·2막은 그 정류장 홀로그램, PiCKCARE는 지금 앞줄. 다 떠오른 자리(정류장 가운데)다.
 * 세로 카메라가 매 프레임 부르므로 정류장과 홀로그램 번호(PiCKCARE는 앞줄에 따라 다르다)로 기억해 홀로그램 11개를 매번 다시 놓지 않는다(2-4b)
 */
export function stopFocus(progress: number, hash = ""): Vec3 | null {
```

`src/lib/journey/portrait.ts`에서 찾을 부분:

```ts
  const front = pickcareFront(progress, hash);
  const placements = hologramsAt((range.start + range.end) / 2, front);
  return placements[range.stop.kind === "hall" ? indices[front] : indices[0]].center;
}
```

바꿀 내용:

```ts
  const front = pickcareFront(progress, hash);
  const index = range.stop.kind === "hall" ? indices[front] : indices[0];
  const key = `${range.stop.id}:${index}`;
  let center = focusCache.get(key);
  if (!center) {
    center = hologramsAt((range.start + range.end) / 2, front)[index].center;
    focusCache.set(key, center);
  }
  return center;
}
```

`src/components/journey/JourneyContent.tsx`에서 찾을 부분:

```tsx

function IntroStop() {
  return (
    <div data-journey-card="intro" className="container flex h-full items-center">
      <div className={`${PANEL} max-w-xl`}>
```

바꿀 내용:

```tsx

/**
 * 입구. 세로 화면에서는 서버가 그린 자리를 아래 고정 자리(화면 아래 5svh)와 맞춰 첫 로딩 때 옮겨지지 않게 한다(2-4b). 서버가 그린 배치에서
 * 본문은 헤더(3.5rem) 아래에서 시작하므로 그만큼 더 띄운다(고정 자리에서는 globals.css가 아래 여백을 5svh로 덮는다)
 */
function IntroStop() {
  return (
    <div data-journey-card="intro" className="container flex h-full items-center portrait:items-end portrait:pb-[calc(5svh+3.5rem)]">
      <div className={`${PANEL} max-w-xl`}>
```

`src/components/journey/SceneLoading.tsx`에서 찾을 부분:

```tsx
/**
 * 3D 장면이 셰이더를 컴파일하는 동안 화면 아래에 흐르는 가는 막대(스펙 2절 "입구: 로딩 표시").
 * 글을 넣지 않는 장식이라 보조 기술에는 숨긴다. 본문은 이미 진짜 HTML로 읽힌다.
```

바꿀 내용:

```tsx
/**
 * 3D 장면이 셰이더를 컴파일하는 동안 화면 아래에 흐르는 가는 막대(스펙 2절 "입구: 로딩 표시"). 세로 화면에서는 아래가 고정 입구 카드 자리라
 * 진행 막대 바로 아래에 둔다(2-4b).
 * 글을 넣지 않는 장식이라 보조 기술에는 숨긴다. 본문은 이미 진짜 HTML로 읽힌다.
```

`src/components/journey/SceneLoading.tsx`에서 찾을 부분:

```tsx
      aria-hidden
      className="pointer-events-none fixed inset-x-0 bottom-10 z-20 flex justify-center"
    >
```

바꿀 내용:

```tsx
      aria-hidden
      className="pointer-events-none fixed inset-x-0 bottom-10 z-20 flex justify-center portrait:bottom-auto portrait:top-[5.5rem]"
    >
```

`src/components/journey/scene/Scene.tsx`에서 찾을 부분:

```tsx
 * 차가 모델인지 빛 실루엣인지는 data-car에 적는다(e2e 표지).
 * 틀은 화면 위에 붙은 큰 뷰포트 높이(100lvh)다. 아래끝을 화면 아래에 묶으면(inset-0) 휴대폰 주소창이 접히고 펴질 때마다
 * 캔버스와 렌더 타깃을 다시 만들고 카메라 비율이 바뀌어 구도가 튄다. 주소창이 펴져 있으면 아래 몇십 px이 그 뒤에 가린다.
 * Canvas는 children으로 받는다. 상태가 바뀌어 이 틀만 다시 렌더링되면 같은 children이라 Canvas는 다시 렌더링되지 않는다.
```

바꿀 내용:

```tsx
 * 차가 모델인지 빛 실루엣인지는 data-car에 적는다(e2e 표지).
 * 틀은 화면 위에 붙은 큰 뷰포트 높이(100vh)다. 아래끝을 화면 아래에 묶으면(inset-0) 휴대폰 주소창이 접히고 펴질 때마다
 * 캔버스와 렌더 타깃을 다시 만들고 카메라 비율이 바뀌어 구도가 튄다. 주소창이 펴져 있으면 아래 몇십 px이 그 뒤에 가린다.
 * 지금의 iOS Safari·Chrome에서 100vh는 큰 뷰포트(100lvh)와 같고, lvh를 모르는 iOS 15.0~15.3에서도 높이가 무효가 되지 않는다(2-4b).
 * Canvas는 children으로 받는다. 상태가 바뀌어 이 틀만 다시 렌더링되면 같은 children이라 Canvas는 다시 렌더링되지 않는다.
```

`src/components/journey/scene/Scene.tsx`에서 찾을 부분:

```tsx
      data-car={car}
      className="fixed inset-x-0 top-0 z-0 h-lvh transition-opacity duration-700"
      style={{ opacity: status === "ready" ? 1 : 0 }}
```

바꿀 내용:

```tsx
      data-car={car}
      className="fixed inset-x-0 top-0 z-0 h-screen transition-opacity duration-700"
      style={{ opacity: status === "ready" ? 1 : 0 }}
```

- [ ] **Step 6: 통과를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4 src/lib/journey/portrait.test.ts`
Expected: PASS — `Tests  13 passed (13)`

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`·`3000`은 무시)

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts -g "서버가 그린 자리|로딩 줄은|캔버스 틀"` (Playwright가 매번 `next build`부터 한다. 2~6분)
Expected: PASS — `6 passed`

- [ ] **Step 7: 전체 확인**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`·`3000`은 무시)

Run: `rtk proxy npx tsc --noEmit` → exit 0
Run: `rtk proxy npx vitest run --maxWorkers=4` → `Tests  427 passed (427)`
Run: `rtk proxy npx eslint src/lib/journey/portrait.ts src/lib/journey/portrait.test.ts src/components/journey/JourneyContent.tsx src/components/journey/SceneLoading.tsx src/components/journey/scene/Scene.tsx e2e/journey.e2e.ts` → exit 0, 문제 0(`baseline-browser-mapping` 안내 한 줄은 린트 결과가 아니다)

- [ ] **Step 8: 커밋 정리를 제출한다**

파일별 변경 표와 메시지 초안. 초안 예:

```
fix: 여정 세로 화면 첫 로딩의 입구 카드·로딩 줄과 캔버스 높이 대체값

- 세로 화면 입구 카드가 서버가 그린 자리와 고정 자리가 같아 첫 로딩 때 옮겨지지 않고, 로딩 줄은 진행 막대 아래로 옮겨 겹치지 않는다
- 캔버스 틀을 100vh로 두어 lvh를 모르는 오래된 iOS에서도 장면이 뜨고, 세로 카메라의 정류장 홀로그램 자리를 기억해 매 프레임 계산을 줄인다
```

---

### Task 10: 최종 검증과 스펙 기록

스펙 1절 2-4b 완료 조건을 최종 구현에서 확인하고 숫자와 캡처를 남긴다. 휴대폰은 실측하지 않고(사용자 결정) 맥의 창 없는 에뮬레이션으로 본다.

**Files:**
- Modify: `docs/superpowers/specs/2026-10-14-journey-design.md`(1절 표, 7절 2-4b 최종, 10절)

- [ ] **Step 1: 전체 확인**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`·`3000`은 무시)

Run: `rtk proxy npx tsc --noEmit` → exit 0
Run: `rtk proxy npx vitest run --maxWorkers=4` → `Tests  427 passed (427)`
Run: `rtk proxy npx eslint .` → 이 계획 전과 같은 기존 문제만 남는다(28개, 오류 6: `Background3D.tsx` 3, `about/page.tsx` 2, `blog/[slug]/page.tsx` 1). 이 계획이 바꾼 파일에는 문제가 없다
Run: `rtk proxy npx playwright test` (20분 남짓) → `232 passed`, `10 skipped`(전 184·10. 새 테스트 24개 × 두 프로젝트). End 키로 끝까지 가는 테스트("End 키로 엔딩에 닿고…", "엔딩에서는 고정 카드가 없고…", "로딩 막대가 사라진다")가 5초 안에 끝에 닿지 못해 흔들리면 그 테스트만 `--repeat-each=6`으로 다시 돌려 확인한다(2-3b부터 있던 부하 때의 흔들림. 사본에서 12/12 통과)

- [ ] **Step 2: 데스크톱 회귀 캡처(2-4a 완료 때와 같은가)**

시작 전 코드(`01ebf3b`)를 작업 트리와 따로 꺼내 기준을 찍는다(git 상태는 바꾸지 않는다).

```bash
BASE_DIR=$(mktemp -d)/base && mkdir -p "${BASE_DIR}"
rtk proxy git archive 01ebf3b | tar -x -C "${BASE_DIR}"
rtk proxy cp -cR node_modules "${BASE_DIR}/node_modules" && cp .env.local "${BASE_DIR}/.env.local"
(cd "${BASE_DIR}" && rtk proxy npx next build)
```

(`node_modules`는 APFS 복제(`cp -c`)로 옮긴다. Turbopack은 프로젝트 밖을 가리키는 심볼릭 링크를 받지 않는다.)

`(cd "${BASE_DIR}" && rtk proxy npx next start -H 127.0.0.1 --port 3201)`(다른 터미널)과 이 작업 트리의 `rtk proxy npx next build && rtk proxy npx next start -H 127.0.0.1 --port 3200`(다른 터미널)을 띄운 뒤 같은 풍경 묶음을 창 없이 찍는다.

Run: `CAPTURE_SET=landscape CAPTURE_HEADLESS=1 CAPTURE_URL="http://127.0.0.1:3201/journey?debug=stats" CAPTURE_NAME=2-4b-desktop-base rtk proxy npm run capture:journey`
Run: `CAPTURE_SET=landscape CAPTURE_HEADLESS=1 CAPTURE_URL="http://127.0.0.1:3200/journey?debug=stats" CAPTURE_NAME=2-4b-desktop rtk proxy npm run capture:journey`

(자동화 브라우저라 실행 중 강등은 일어나지 않는다. 두 쪽 모두 3D 전체로 찍힌다.)

두 폴더를 장면마다 비교한다(휘도 차이 3 넘는 화소의 비율). 오른쪽 진행 막대에는 이 계획이 "2D" 버튼을 붙여 막대가 길어졌으므로, 오른쪽 80px을 빼고 비교한다. 아래 스크립트를 작업 트리 밖(`${BASE_DIR}/..`)에 `diff-captures.cjs`로 두고 `node <그 경로> test-results/journey-captures/2-4b-desktop-base test-results/journey-captures/2-4b-desktop 80`으로 돌린다.

```js
const { createRequire } = require("node:module");
const sharp = createRequire(`${process.cwd()}/package.json`)("sharp");
const fs = require("node:fs");
const [a, b, skipRight = "0"] = process.argv.slice(2);
(async () => {
  for (const name of fs.readdirSync(a).filter((file) => /^\d\d-.*\.png$/.test(file))) {
    const left = await sharp(`${a}/${name}`).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const right = await sharp(`${b}/${name}`).removeAlpha().raw().toBuffer();
    const { width } = left.info;
    const limit = width - Number(skipRight);
    let changed = 0;
    let counted = 0;
    for (let p = 0, i = 0; i < right.length; i += 3, p++) {
      if (p % width >= limit) continue;
      counted++;
      const d = 0.2126 * (right[i] - left.data[i]) + 0.7152 * (right[i + 1] - left.data[i + 1]) + 0.0722 * (right[i + 2] - left.data[i + 2]);
      if (Math.abs(d) > 3) changed++;
    }
    console.log(`${name}: ${((100 * changed) / counted).toFixed(2)}%`);
  }
})();
```

Expected: 열두 장면 모두 0.05% 이하(별 깜빡임 정도. 사본에서는 0.03% 이하였다). 오른쪽 80px까지 넣어 비교하면(`0`) 0.09~0.66%가 나오는데 진행 막대 자리뿐이어야 한다(두 `sheet.png`를 열어 막대 아래 끝에 "2D"가 붙은 것 말고 장면이 같은지 본다). 넘는 장면이 있으면 두 장을 열어 무엇이 다른지 보고 멈춘다. 3201 서버는 `lsof -t -iTCP:3201 -sTCP:LISTEN`으로 찾은 PID만 끄고 `${BASE_DIR}`을 지운다.

- [ ] **Step 3: 2D 화면 캡처(휴대폰·데스크톱)**

3200 서버를 그대로 두고, 아래 스크립트를 작업 트리 밖에 `flat-shots.cjs`로 두고 `node <그 경로> <저장할 폴더>`로 돌린다(창 없이 찍는다).

```js
const { createRequire } = require("node:module");
const req = createRequire(`${process.cwd()}/package.json`);
const { chromium, devices } = req("@playwright/test");
const sharp = req("sharp");
const out = process.argv[2];
(async () => {
  const browser = await chromium.launch({ headless: true, channel: "chromium" });
  for (const [name, options] of [["phone", { ...devices["Pixel 7"], viewport: { width: 412, height: 839 } }], ["desktop", { viewport: { width: 1440, height: 900 } }]]) {
    const page = await (await browser.newContext({ ...options, colorScheme: "dark" })).newPage();
    await page.goto("http://127.0.0.1:3200/journey?debug=stats&tier=2d");
    await page.waitForTimeout(1500);
    console.log(name, (await page.evaluate(() => document.documentElement.scrollHeight / innerHeight)).toFixed(1), "화면");
    const files = [];
    for (const share of [0, 0.25, 0.45, 0.65, 0.85, 1]) {
      await page.evaluate((t) => scrollTo({ top: t * (document.documentElement.scrollHeight - innerHeight), behavior: "instant" }), share);
      await page.waitForTimeout(800);
      files.push(`${out}/${name}-${share}.png`);
      await page.screenshot({ path: files.at(-1) });
    }
    const tiles = await Promise.all(files.map((file) => sharp(file).resize({ height: 560 }).toBuffer({ resolveWithObject: true })));
    const w = tiles[0].info.width;
    await sharp({ create: { width: (w + 10) * tiles.length, height: 560, channels: 3, background: "#444" } })
      .composite(tiles.map((tile, i) => ({ input: tile.data, left: i * (w + 10), top: 0 })))
      .png()
      .toFile(`${out}/${name}-sheet.png`);
  }
  await browser.close();
})();
```

Expected: `phone 5.1 화면`, `desktop 4.4 화면`(3D 배치 18.7화면). 두 `sheet.png`를 Read로 열어 본다(스펙 5절 "2D 레이아웃").
- 헤더 바로 아래 막 탭(시작·협업·현재·연락처)과 오른쪽 끝 "3D로 보기", 지금 읽는 막이 밝다. 3D 진행 막대는 없다
- 가운데 열 하나에 카드가 쌓이고, 왼쪽 선이 막마다 주황 → 보라 → 파랑이다. 막 제목은 선 위의 점과 제목 줄이고, 엔딩은 ◆로 끝난다
- 2막 카드에 썸네일이 보이고, PiCKCARE 저장소 다섯이 소개 아래 조금 들여 쌓인다. 엔딩 연락처가 패널 안 스크롤 없이 다 보인다

- [ ] **Step 4: 홀로그램 색과 데스크톱 성능**

Run: `CHECK_HEADLESS=1 rtk proxy npm run check:holograms` → ① 11장 ΔE 0, ③ 모두 평균 ΔE 2 이하(2-4a 때 27개, 가장 큰 값 1.44)

`perf:journey`는 실제 Chrome 창을 띄운다. 돌리기 전에 사용자에게 "성능 측정으로 Chrome 창이 잠깐 뜹니다"라고 알린다. (자동화 브라우저라 실행 중 강등은 일어나지 않고 3D 전체로 잰다.)

Run: `rtk proxy npm run perf:journey` → 3회 모두 50ms 초과 0, 가장 무거운 프레임 드로콜 60 이하(2-4a 때 50), 프로그램 준비 때 = 끝, 텍스처 58.8MiB. 주사율과 함께 적고 2-4a 최종(100Hz 평균 10.0·p95 10.8·p99 11.0ms)과 비교한다

- [ ] **Step 5: 휴대폰 에뮬레이션(실측 아님)**

3200 서버에서 아래 스크립트를 작업 트리 밖에 `emu-flat.cjs`로 두고 `node <그 경로>`로 돌린다(WebKit 아이폰 14, Chromium Pixel 7 터치, 창 없음).

```js
const { createRequire } = require("node:module");
const { webkit, chromium, devices } = createRequire(`${process.cwd()}/package.json`)("@playwright/test");
const BASE = "http://127.0.0.1:3200";
const ready = (page) => page.waitForFunction(() => document.querySelector("[data-journey-scene]")?.getAttribute("data-state") === "ready", null, { timeout: 60000 });
const mode = (page) =>
  page.evaluate(() => [document.documentElement.dataset.journeyMode ?? "3d", document.documentElement.dataset.journeyReason ?? "", window.__journeyStats?.quality?.level ?? null]);
(async () => {
  for (const [name, type, device, launch] of [
    ["iphone", webkit, devices["iPhone 14"], {}],
    ["android", chromium, devices["Pixel 7"], { channel: "chromium", args: ["--ignore-gpu-blocklist"] }],
  ]) {
    const browser = await type.launch({ headless: true, ...launch });
    const page = await (await browser.newContext({ ...device })).newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${BASE}/journey?debug=stats`);
    await ready(page);
    const start = await mode(page);
    await page.getByRole("button", { name: "2D로 보기" }).tap();
    await page.waitForTimeout(800);
    const flat = await mode(page);
    const tabs = await page.getByRole("navigation", { name: "여정 막" }).isVisible();
    await page.getByRole("button", { name: "3D로 보기" }).tap();
    await ready(page);
    const back = await mode(page);
    await page.goto(`${BASE}/journey?debug=stats&busy=60`);
    await ready(page);
    await page.waitForFunction(() => document.documentElement.dataset.journeyMode === "2d", null, { timeout: 30000 }).catch(() => {});
    const slow = await mode(page);
    const notice = await page.getByRole("status").textContent();
    console.log(name, JSON.stringify({ start, flat, tabs, back, slow, notice, errors }));
    await browser.close();
  }
})();
```

Expected(두 기기 같다): `start` `["3d","","lite"]`(터치 기기는 경량), `flat` `["2d","manual","lite"]`, `tabs` `true`, `back` `["3d","","lite"]`, `slow` `["2d","slow","min"]`(경량 → 최소 → 2D), `notice` `"기기에 맞춰 2D로 바꿨어요"`, `errors` `[]`. 서버는 `lsof -t -iTCP:3200 -sTCP:LISTEN`으로 찾은 PID만 끈다.

- [ ] **Step 6: 개발 서버**

Task 3 Step 1의 `dev-check.cjs`로 다시 확인한다.

Run: `rtk proxy npx next dev -H 127.0.0.1 --port 3102`(다른 터미널, `Ready`가 나오면)
Run: `node <dev-check.cjs 경로>` → `state: ready loading: ready`, `canvases: 1`, `errors: []`

개발 서버는 `lsof -t -iTCP:3102 -sTCP:LISTEN`으로 찾은 PID만 끈다.

- [ ] **Step 7: 스펙에 완료와 숫자를 적는다**

- 1절 단계 표의 `| 2-4b 강등과 2D 안전망 |`를 `| 2-4b 강등과 2D 안전망 (완료) |`로 바꾼다
- 7절 "2-4a 최종" 아래에 "2-4b 최종"으로 Step 1(단위·e2e 수), Step 2(데스크톱 풍경 12장면, 진행 막대 영역을 뺀 차이), Step 3(2D 문서 높이), Step 4(데스크톱 성능, 주사율과 함께), Step 5(에뮬레이션, 실측과 섞지 않는다)를 적는다
- 10절: "개발 서버(`next dev`)에서 여정 장면이 실패한다"를 닫는다(Task 3, Step 6의 결과)

- [ ] **Step 8: 완료 보고와 커밋 정리를 제출한다**

완료 보고에 Step 1~6의 숫자와 2D 캡처(휴대폰·데스크톱)를 남기고, 태스크별 파일 표와 메시지 초안을 낸다. 이 태스크의 초안 예:

```
docs: 여정 2-4b 완료 기록

- 2-4b 완료 조건(2D만으로 쓸 수 있음, 강등, 실패의 2D 전환, 수동 전환, 움직임 줄이기, next dev, 미룬 넷, 회귀 없음)을 최종 구현에서 확인했다
- 2D 문서 높이, 데스크톱 회귀·성능, 휴대폰 에뮬레이션(실측 아님) 숫자를 적었다
```
