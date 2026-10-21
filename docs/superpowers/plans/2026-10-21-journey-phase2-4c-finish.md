# 여정(Journey) 2-4c 구현 계획 — 접근성·마감·병합

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 채용 담당자가 데스크톱·휴대폰 세로·휴대폰 가로·2D 어디서 열어도 막힘 없이 보고 키보드·화면 낭독기로도 쓸 수 있게 마감한다. 넘긴 결함을 고친 뒤 PR #3으로 main에 한 번 병합하고(병합은 사용자), 병합 뒤 실제 사이트를 휴대폰으로 확인한다.

**Architecture:** 새 모듈은 하나(`lib/journey/screen.ts`, 짧은 가로 화면 미디어 쿼리)이고 나머지는 2-4b 구조 위의 작은 수정이다.
- 모드 규칙(순수 함수): `journeyMode`에 2D가 된 이유 "화면"과 `fitScreen`, 자동 2D 뒤 고른 3D의 단계 유지. `downgrade`에 "250ms 넘는 간격 연속 3번이면 바로 내림".
- 짧은 가로 화면: `JourneyStage`의 `useFitScreen`이 회전마다 `applyMode`로 2D와 3D를 오가고, 돌리기 전 스크롤 때 보던 카드를 넘긴다. 처음 그리기 스크립트는 같은 미디어 쿼리를 본다. 진행 막대는 짧은 가로에서 "3D로 보기"를 두지 않는다.
- 접근성: axe 검사(회귀 가드), `<html lang="ko">`, 2D 위 여백을 `scroll-padding-top`으로, "2D" 버튼 24px, 알림은 상세를 닫은 뒤(`whenUnlocked`), 좁은 헤더 아이콘과 포커스 테두리 여유, 상세 잠금 중 스크롤 막대 자리.
- 넘긴 결함: 고정 카드의 `subscribeHash`, 표지를 그리기 전에(`useLayoutEffect`), 하이드레이션 전 스크롤 지키기(`progressOf`), `busyFrom`(500ms 상한), `perfOptions`.
- 마무리: 흔들린 테스트 정리, 회전 e2e 보강, 디코더 Apache-2.0 고지, 회귀 확인, PR #3 정리, 병합 뒤 실기기 확인.

**계획을 쓰며 확인한 것(사본 구현과 검증):**
- 이 계획의 코드는 HEAD(`2ef9ec8`, 스펙 6차 개정)에 태스크마다 커밋하며 구현했다(사본 `scratchpad/v24a` 브랜치 `plan24c`). "찾을 부분 → 바꿀 내용"을 기준 상태에 차례로 적용하면 각 태스크의 결과와 글자 하나까지 같아진다. 생성기로 확인했다(`package.json`·`package-lock.json`은 Task 3의 `npm install`이, `LICENSE.txt`는 Task 7의 명령이 만든다. 명령으로 만든 파일이 사본과 바이트까지 같음을 확인했다).
- 실패 단계의 기대 출력은 직전 태스크의 코드에 그 태스크의 테스트만 얹어 돌린 결과다(Task 1·2·3·4·5·7 모두 다시 재현했다).
- 통과한 검사: 단위 435개(전 427, 태스크별 433 → 433 → 433 → 433 → 435 → 435 → 435), 타입 검사, eslint는 전과 같은 기존 28개(오류 6)뿐, e2e 290 통과·10 건너뜀(전 2-4b 최종 237 통과·1 흔들림·10 건너뜀. 새 테스트 26개 × 두 크기).
- axe(WCAG 2.1 A·AA): 3D(데스크톱·휴대폰)·2D·상세 열린 상태·360px 헤더 모두 위반 0. 색 대비 "확인 필요"는 캔버스 위 글(3D 19개), 화면 낭독기에서 감춘 기호 문자(2D 3개), 모달 위에서 배경을 읽지 못한 것(상세 12개)이다. 상세 글자(zinc-400 on zinc-950)는 대비 7.8:1로 기준(4.5:1)을 넘는다.
- 좁은 헤더 넘침(측정): 360px 21px, 375px 6px, 390px 0. 간격 8px만으로는 360px 13px, 간격 8px + 로고 15px로도 6px 넘친다. GitHub를 아이콘(18px 안팎)으로 바꾸면 360·375px 모두 0이다. 320px는 61px라 지금처럼 옆으로 민다.
- 짧은 가로(750×340, 터치): 2D(이유: 화면)로 열리고, 세로(340×750)로 돌리면 3D(경량)로 돌아와 보던 막(2막 진행률 0.257~0.286 안)에 있다. 데스크톱(터치 아님) 1280×450은 3D다. 기존 회전 e2e(844×390, 터치 아님)는 그대로다.
- 아주 느린 기기(`busy=300`, 모든 프레임 > 250ms): 전체 → 경량 → 최소 → 2D가 약 13초 안에 일어난다(규칙 전에는 40초 동안 전체에 머물렀다).

**스펙과 다르게 또는 더 구체적으로 정한 점(사용자 검토 대상, 스펙 4·5·8·10절에 반영해 이 계획과 함께 커밋한다):**
1. **포커스 복귀는 코드를 바꾸지 않는다.** 스펙은 "포커스를 따라가는 스크롤을 `:focus-visible`일 때만"이었다. 사본에서 재 보니 상세 닫기는 `history.back()`이라 브라우저가 연 때의 스크롤 위치로 되돌리고, 고정 카드가 포커스를 따라 부른 스크롤은 같은 프레임 안에서 되돌려져 스크롤 이벤트가 한 번만 남았다(PiCKCARE 0.3에서 studio 홀로그램을 눌러 연 상세: 닫은 뒤 위치 그대로). 그래서 마우스·터치로 열면 보던 자리에, 키보드로 열면 Tab이 이미 그 카드로 옮겨 둔 자리에 돌아온다(사용자 결정 "누른 방식에 따라"와 같다). 게다가 `:focus-visible`은 Escape로 닫으면 키보드 포커스로 쳐져 마우스로 연 상세도 이동시켰을 것이다. 두 경우를 e2e로 묶는다(Task 4). 세로 화면의 1·2막은 지금 정류장의 홀로그램만 누를 수 있어 이웃 정류장 경우가 생기지 않고, PiCKCARE의 옆 저장소 홀로그램만 해당한다.
2. **짧은 가로 화면으로 돌릴 때 보던 카드는 돌리기 전에 기억한 것을 쓴다.** 화면을 돌리면 새 폭으로 2D 배치가 먼저 다시 그려진 뒤에 미디어 쿼리 알림이 와서, 그 순간에 구한 카드는 이미 앞 카드였다(세로로 돌린 뒤 2막이 아니라 1막 끝 진행률 0.229). `useFitScreen`은 크기가 그대로인 동안의 스크롤 때 카드를 기억하고, 크기가 바뀐 프레임이 지나면 새 배치에서 다시 구한다. `applyMode`는 지킬 카드를 인자로 받는다.
3. **확인용 `busy`의 상한은 500ms다.** 스펙은 값을 정하지 않았다. 아주 느린 기기 e2e가 `busy=300`(모든 프레임이 250ms 넘음)을 쓰고, 감시는 2D까지 내려가면 장면을 내리므로 만든 링크로 탭이 오래 멈추지 않는다(`?debug=perf`는 강등하지 않아 500ms면 초당 2프레임이다).
4. **상세를 열 때 밀림은 효과 대신 상태로 검사한다.** 이 맥의 창 없는 Chromium은 스크롤 막대를 숨기거나(`--hide-scrollbars`) 겹쳐 그려 폭이 0이라 밀림이 나지 않는다. 막대를 `::-webkit-scrollbar`로 15px로 그리면 밀림(1265 → 1280)은 재현되지만 Chromium이 그런 막대에는 `scrollbar-gutter`를 걸지 않아 고친 뒤에도 같았다. 그래서 잠긴 동안 `<html>`이 `overflow: hidden`·`scrollbar-gutter: stable`인지 본다. Lenis의 `overflow: clip`에는 `scrollbar-gutter`가 걸리지 않아(스크롤 컨테이너가 아니다) 여정 페이지만 `hidden`으로 잠근다. Windows 실기기 확인은 Task 9 목록에 넣는다.
5. **e2e 흔들림의 원인은 확정하지 못했고, 테스트를 고친다.** "캔버스는 여정 장면 하나뿐이다"만 흔들린 것은 이 테스트만 장면 캔버스가 막 붙은 순간에 End를 눌렀기 때문이다(다른 End 테스트는 페이지를 열자마자 누른다). CPU를 6·10·20배 느리게 해도 키는 25ms 안에 처리되고 끝까지 갔다. 장면 준비(약 9초) 전에 눌러도 같았다. 페이지가 뜬 뒤 ScrollTrigger의 다시 재기도 없었다. 장면이 준비된 뒤에 눌러도 캐시가 빈 첫 실행에서 20번 중 1번 실패했다. 이 테스트의 목적(캔버스 수·오류)과 상관없으므로 끝으로 바로 스크롤한다. End 키 동작은 "End 키로 엔딩에 닿고…"가 따로 보며 20번 반복에서 흔들리지 않았다. 원인 조사는 스펙 10절에 남긴다.
6. **3막 가로선은 원인만 찾고 고치지 않는다(사용자 결정: 병합 뒤로, 2026-10-21).** 장면 객체를 하나씩 감춰 보니 홀로그램의 빛 메시(빛기둥 + 원반)였다. 3막 제목 자리에서 앞으로 갈 PiCKCARE 홀로그램들은 아직 떠오르지 않았는데, 바닥 원반만 33~89m에서 거의 옆으로(올려다보는 각의 사인 0.013~0.043) 보여 도시 실루엣 위에 떠 있는 짧은 선이 된다. 원반이 거의 옆으로 보일 때 흐리게 하는 방법을 사본에서 해 보니 3막 선은 사라졌지만, 코코아톡 바로 옆(15m) 원반도 사인 0.033이라 정류장 원반까지 흐려졌다(풍경 12장면 중 코코아톡·Todo 0.06~0.07%). 각도로는 가를 수 없어 되돌렸다. 고치려면 원반이 나타나는 규칙(지금: 열린 끝이 지나가면 나타난다)을 바꿔야 한다. 예: 홀로그램이 떠오르기 시작할 때 원반도 나타나게 하기. 스펙 10절에 원인과 선택지를 적고, 병합 뒤 캡처를 보며 원반 규칙을 정해 고친다(사용자 결정).
7. **axe 검사는 회귀 가드다.** 사본에서 처음 돌렸을 때 이미 위반이 0이었다. `@axe-core/playwright`는 4.13.0을 정확히 고정한다(4.14.0은 2026-10-15에 나와 2주가 되지 않았다).
8. **헤더 포커스 테두리는 메뉴의 `p-1`과 `-m-1`로 지킨다.** 넘치는 메뉴(`overflow-x-auto`)가 링크 바깥 테두리를 잘랐다. 안쪽 여유 4px을 두고 바깥 여백으로 자리를 되돌려 배치는 같다.
9. **`lang="ko"`는 블로그 글 화면 비교(14개)를 바꾸지 않았다.** 글꼴 선택이 바뀔 수 있어 확인했다.

**넘기는 것(병합 뒤, 스펙 10절):** 빠른 스크롤의 카메라 전환, 차 모델 실패 대체 보강, 풍경 정점 속성 묶기와 휴대폰에서 풍경을 만드는 시간, 3막 가로선(위 6, 사용자 결정), End 키 흔들림의 원인.

**Tech Stack:** Next 16 App Router, React 19(`useLayoutEffect`), TypeScript, three 0.181.2, @react-three/fiber 9.4.0, lenis 1.3.26(`scroll-padding`을 빼는 `scrollTo(요소)`), gsap ScrollTrigger, Tailwind 4(`max-[390px]:`, `size-4`), vitest 4, @playwright/test 1.63(`hasTouch`·`isMobile`), @axe-core/playwright 4.13.0(새 개발 의존성), sharp 0.34.5

**Spec:** `docs/superpowers/specs/2026-10-14-journey-design.md`
- 반영된 개정: 2026-10-20 6차 개정(`2ef9ec8`)과, 이 계획과 함께 커밋하는 정정(위 1~9).
- 다루는 절: 1절 2-4c 완료 조건, 4절 사이트 공통 요소·모듈·의존성, 5절 실행 중 강등·수동 전환·자동 2D 알림·처음 그리기·짧은 가로 화면·포커스 복귀·상세를 열 때 밀림·2D 레이아웃, 7절 2-4c 최종, 8절 2-4c 테스트, 9절 2-4c 결정, 10절.
- 2단계 계획 가운데 여덟째이자 마지막이다. 2-1부터 2-4b까지 완료했고, **2-4c 접근성·마감·병합이 이 문서**다.

## Global Constraints

- **범위:** 스펙 1절 2-4c 완료 조건만 한다. 병합 뒤로 넘긴 것(빠른 스크롤 카메라, 차 실패 대체, 풍경 성능)은 하지 않는다. 3막 가로선은 원인 기록까지만 한다(머리말 6)
- **3D 화면은 그대로다:** 데스크톱 풍경 12장면이 2-4b와 같아야 한다(진행 막대 영역과 엔딩 연락처 패널의 출처 한 줄은 의도한 변경)
- **기기 판별과 실행 중 강등을 섞지 않는다(사용자):** 짧은 가로 화면은 강등이 아니라 화면에 따른 배치다(이유 "화면", 알림·기억 없음)
- **3D와 2D는 같은 데이터를 쓴다(사용자):** 정류장 순서·링크·해시·진행 상태를 같은 본문 DOM과 `STOPS`에서 읽는다
- **같은 진행률이면 같은 장면:** 화면을 돌려도 같은 진행률이면 같은 구도다
- **의존성은 `@axe-core/playwright` 4.13.0(개발) 하나만 더한다**
- **시계 하나:** `/journey`에서 프레임을 도는 것은 GSAP ticker 하나뿐이다. 예외는 `?debug=perf` 측정 오버레이다
- **스크롤 중 React 렌더 금지:** 고정 카드·막 탭·2D 등장은 DOM 속성·CSS로만 고친다. 짧은 가로 판정 구독은 미디어 쿼리가 바뀔 때만 렌더한다
- **three·`@react-three/*` import는 `src/components/journey/scene/` 안에서만 한다.** `src/lib/journey/`는 three 없는 순수 코드다
- **React Compiler 계열 린트 규칙이 에러로 켜져 있다**(`react-hooks/set-state-in-effect`, `immutability`, `refs` 등): effect 본문에서 곧바로 상태를 바꾸지 않는다(구독 콜백이나 `whenUnlocked` 콜백에서 바꾼다)
- **설명 문장(카피)을 넣지 않는다(사용자 결정, 2026-10-14).** 더하는 화면 글은 엔딩 출처의 "차 모델 디코더: Draco, Basis Universal, Apache-2.0"뿐이다(출처 표기)
- **`next build`는 e2e 파일도 타입 검사한다.** 테스트 인자는 Playwright의 타입에 있는 것만 쓴다(예: `playwright`는 되고 `browserType`은 안 된다)
- **명령 실행:** Bash 검증 명령에는 `rtk proxy`를 붙이고 exit code를 믿는다. 파일은 Read 도구로 읽는다. `npx tsx`·`npm run x -- 인자`는 rtk가 망가뜨리므로 `rtk proxy npm run <스크립트>`나 `rtk proxy npx tsx`로 실행하고, 인자는 환경 변수로 넘긴다. 셸 명령을 여러 개 잇는 줄은 `rtk proxy bash -c '…'`로 감싼다. zsh에서 `$var:path`는 수정자로 해석되므로 `${var}:path`로 쓴다. zsh는 따옴표 없는 변수를 낱말로 나누지 않는다(`${=var}`)
- **기계 자원(2026-10-14 강제 재부팅 뒤 규칙):** 무거운 명령(Playwright, `next build`, vitest, `tsc`)은 하나씩 차례로 돌리고 병렬로 돌리지 않는다. 그런 명령 전에 `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`로 다른 프로젝트의 무거운 작업이 없는지 확인하고, 있으면 끝날 때까지 기다린다(15초 간격, 10분 넘으면 BLOCKED). 사용자의 다른 프로젝트 개발 서버(`next dev -p 3010`, `3000`)는 무거운 작업으로 세지 않고 건드리지 않는다. vitest는 늘 `--maxWorkers=4`로 돌린다. 띄운 서버는 `lsof -t -iTCP:<포트> -sTCP:LISTEN`으로 찾은 PID만 끈다(`pkill -f next-server`처럼 넓은 패턴 금지)
- **서버는 이 맥 안에서만 연다:** `next start`·`next dev`에는 늘 `-H 127.0.0.1`을 붙이고, 확인 주소도 `http://127.0.0.1:<포트>`다(e2e는 `playwright.config.ts`가 그렇게 연다)
- **브라우저 확인은 프로덕션 빌드로 한다:** `rtk proxy npx next build && rtk proxy npx next start -H 127.0.0.1 --port 3200`
- **브라우저 창을 띄우지 않는다(사용자 요청):** 캡처는 `CAPTURE_HEADLESS=1`, `check:holograms`는 `CHECK_HEADLESS=1`(새 헤드리스, GPU)로 돌린다. `perf:journey`만 창이 필요하다(띄우기 전에 사용자에게 알린다)
- **Playwright는 시작할 때 `test-results/`를 비운다.** 캡처를 거기 둔 채 e2e를 돌리면 사라진다. 캡처는 먼저 다른 곳으로 옮긴다
- **커밋하지 않는다.** 에이전트는 `git add`/`commit`/`stash`/`reset`/`checkout`/`restore`를 실행하지 않는다. 각 태스크 마지막 단계는 파일별 변경 표와 커밋 메시지 초안 제출이다(`type: 한국어 요약` + 이유를 적는 `- ` 불릿, 트레일러 없음). 사용자는 모든 태스크가 끝날 때까지 커밋을 보류할 수 있다
- **병합은 사용자가 한다(사용자 결정).** 에이전트는 PR #3의 제목·본문만 고치고(`gh pr edit 3`), 병합·push는 하지 않는다
- **휴대폰 실측은 병합 뒤 실제 사이트에서 한다(사용자 결정, 2026-10-20).** 병합 전에는 맥의 창 없는 에뮬레이션(WebKit `iPhone 14`, Chromium `Pixel 7`, 세로·가로)으로 확인하고 실측과 섞지 않는다
- 기존 스타일을 따른다: 한국어 주석, `function` 선언형 컴포넌트. 단위 테스트는 소스 옆 `*.test.ts`, e2e는 `e2e/*.e2e.ts`

## Review Focus

1. **상세가 열린 채 휴대폰을 돌리기.** 세로 3D에서 상세를 보다가 가로로 들면 2D(이유: 화면)가 되지만, 상세는 그대로 열려 있고 닫으면 2D에서 그 정류장 카드로 돌아와야 한다(스크롤이 잠긴 동안에는 자리를 맞출 수 없고, 닫기는 뒤로 가기라 브라우저도 스크롤을 되돌린다) → Task 2 e2e "상세가 열린 채 가로로 돌려도 상세는 그대로이고, 닫으면 2D에서 그 정류장 카드가 막 탭 아래에 있다"
2. **2D를 기억한 방문자가 가로로 들었다가 세로로 돌리기.** 화면 2D가 아니라 수동 2D이므로 세로로 돌려도 3D로 바뀌면 안 된다 → Task 2 e2e "2D를 기억한 방문자는 가로로 들었다가 세로로 돌려도 2D(이유: 수동)다"
3. **저장소가 막힌 브라우저에서 짧은 가로 화면.** 처음 그리기 스크립트의 localStorage 읽기가 예외를 던져도 짧은 가로 확인은 해야 하고 오류가 없어야 한다 → Task 2 e2e "저장소가 막힌 브라우저에서도 짧은 가로 화면은 처음부터 2D이고 오류가 없다"
4. **360px 헤더의 아이콘 링크.** 글자를 감추면 링크 이름이 사라지기 쉽다. 화면 낭독기에는 "GitHub"로 읽혀야 하고 접근성 위반이 없어야 한다 → Task 4 e2e "좁은 휴대폰(360px) 헤더의 GitHub 아이콘 링크에도 접근성 위반이 없다"(그리고 "…GitHub 링크 이름은 그대로다")
5. **아주 느린 기기에서 자동 2D 뒤 다시 고른 3D.** 새 "연속 3번" 규칙이 고른 3D를 다시 2D로 떨어뜨리면 안 되고 최소에 머물러야 한다 → Task 1 e2e "아주 느린 기기에서 자동으로 2D가 된 뒤 다시 고른 3D는 최소에 머물고 2D로 내리지 않는다"

---

## 파일 구조

| 파일 | 책임 |
|---|---|
| `src/lib/journey/journeyMode.ts` | 2D가 된 이유 "화면"과 `fitScreen`, 고른 3D의 단계 유지, 처음 결정에 짧은 가로 반영 |
| `src/lib/journey/downgrade.ts` | 250ms 넘는 간격 연속 3번이면 바로 내림 |
| `src/lib/journey/screen.ts` | (새) 짧은 가로 화면 미디어 쿼리 읽기·구독 |
| `src/lib/journey/perfStats.ts` | 측정 오버레이 쿼리 읽기(`perfOptions`) |
| `src/components/journey/modeSwitch.ts` | 지킬 카드 인자, 2D 위 여백을 `<html>`에서 읽기, `progressOf` |
| `src/components/journey/JourneyStage.tsx` | 회전에 따른 모드(`useFitScreen`), 그리기 전 표지, 하이드레이션 전 스크롤 지키기 |
| `src/components/journey/ProgressRail.tsx` | 짧은 가로에서 "3D로 보기" 감춤, "2D" 버튼 크기, 알림을 상세를 닫은 뒤에 |
| `src/components/journey/portraitCards.ts` | 앱의 해시 변경도 따른다 |
| `src/components/journey/PerfOverlay.tsx` | `perfOptions`를 쓴다 |
| `src/components/journey/JourneyContent.tsx` | 엔딩 출처에 디코더 고지 |
| `src/components/journey/scene/frameStats.ts` | `busyFrom`(500ms 상한) |
| `src/components/Header.tsx` | 390px 미만 GitHub 아이콘, 포커스 테두리 여유 |
| `src/app/journey/page.tsx` | 처음 그리기 스크립트가 짧은 가로도 본다 |
| `src/app/layout.tsx` | `<html lang="ko">` |
| `src/app/globals.css` | 2D `scroll-padding-top`, 여정 잠금 중 스크롤 막대 자리 |
| `public/journey/decoders/LICENSE.txt` | (새) Draco·Basis Universal 고지와 Apache-2.0 전문 |
| `package.json`, `package-lock.json` | `@axe-core/playwright` 4.13.0 |
| `e2e/journey.e2e.ts` | 2-4c 테스트, 흔들린 테스트 정리, 회전 e2e 보강 |

---

### Task 1: 모드 규칙(짧은 가로 화면의 이유, 자동 2D 뒤 고른 3D의 단계, 아주 느린 기기)

스펙 5절 "실행 중 강등"·"수동 전환"·"짧은 가로 화면"의 순수 규칙이다. ① 2D가 된 이유에 "화면"(`screen`, 짧은 가로)을 더하고 `fitScreen(mode, short)`를 둔다: 3D로 보던 중 짧은 가로가 되면 2D(이유: 화면), 짧은 가로가 아니게 되면 같은 품질의 3D로 돌아오고, 이미 다른 이유로 2D면 그대로다(알림 대상이 아니다). ② 자동 2D 뒤 3D를 고른 방문(`keep3d`)은 수동 2D를 거쳐 다시 3D로 와도 이미 내린 단계를 유지한다(`choose`). ③ `frameTooSlow`는 250ms 넘는 간격이 연속 3번이면 2초 창을 기다리지 않고 바로 "내려라"를 답한다(1~2번이면 지금처럼 창만 비운다). `holdWatch`는 그 수를 지운다. 장면 쪽(`Warmup`)은 바꾸지 않는다: 이미 프레임마다 `frameTooSlow`를 부르고, 참이면 `downgrade`한다. e2e는 확인용 `busy=300`(모든 프레임이 250ms를 넘음)으로 2D까지 내려가는지와 그 뒤 고른 3D가 최소에 머무는지(Review Focus 5)를 본다.

**Files:**
- Modify: `e2e/journey.e2e.ts`, `src/lib/journey/downgrade.test.ts`, `src/lib/journey/downgrade.ts`, `src/lib/journey/journeyMode.test.ts`, `src/lib/journey/journeyMode.ts`

**Interfaces:**
- Consumes: 2-4b의 `JourneyMode`·`downgrade`·`choose`·`isAutoFlat`(journeyMode.ts), `DOWNGRADE`·`FrameWatch`·`createWatch`·`holdWatch`·`frameTooSlow`(downgrade.ts), e2e 도우미 `waitReady`·`qualityNow`·`expectFlat`
- Produces: `type Reason`에 `"screen"`, `fitScreen(mode: JourneyMode, shortLandscape: boolean): JourneyMode`, `DOWNGRADE.longGaps = 3`, `FrameWatch.longGaps: number`

- [ ] **Step 1: 실패하는 단위 테스트를 쓴다**

`src/lib/journey/journeyMode.test.ts`에서 찾을 부분:

```ts
import { describe, expect, it } from "vitest";
import { choose, downgrade, fail, initialMode, isAutoFlat, type JourneyMode } from "./journeyMode";

```

바꿀 내용:

```ts
import { describe, expect, it } from "vitest";
import { choose, downgrade, fail, fitScreen, initialMode, isAutoFlat, type JourneyMode } from "./journeyMode";

```

`src/lib/journey/journeyMode.test.ts`에서 찾을 부분:

```ts

  it("자동으로 2D가 된 것만 알림 대상이다", () => {
```

바꿀 내용:

```ts

  it("자동 2D 뒤 3D를 고른 방문은 수동 2D를 거쳐 다시 3D로 와도 이미 내린 단계를 유지한다(2-4c)", () => {
    const back = choose(downgrade(downgrade(downgrade(FULL))), "3d");
    const again = choose(choose(back, "2d"), "3d");
    expect(again).toMatchObject({ view: "3d", quality: "min", keep3d: true });
    const lost = downgrade(choose(fail(FULL, "context-lost"), "3d"));
    expect(choose(choose(lost, "2d"), "3d")).toMatchObject({ view: "3d", quality: "lite", keep3d: true });
  });

  it("자동으로 2D가 된 것만 알림 대상이다", () => {
```

`src/lib/journey/journeyMode.test.ts` 끝에 붙인다:

```ts

describe("짧은 가로 화면(5절, 2-4c)", () => {
  it("3D로 보던 중 짧은 가로가 되면 2D(이유: 화면)이고, 짧은 가로가 아니게 되면 같은 품질의 3D로 돌아온다", () => {
    const lite = downgrade(FULL);
    const flat = fitScreen(lite, true);
    expect(flat).toMatchObject({ view: "2d", reason: "screen", quality: "lite" });
    expect(fitScreen(flat, true)).toBe(flat);
    expect(fitScreen(flat, false)).toEqual(lite);
    expect(fitScreen(FULL, false)).toBe(FULL);
  });

  it("이미 2D였으면(수동·기기·느림·실패) 돌려도 그대로 2D이고, 화면 2D는 알림 대상이 아니다", () => {
    for (const flat of [choose(FULL, "2d"), initialMode("2d", null, true), downgrade(downgrade(downgrade(FULL))), fail(FULL, "failed")]) {
      expect(fitScreen(flat, true)).toBe(flat);
      expect(fitScreen(flat, false)).toBe(flat);
    }
    expect(isAutoFlat(fitScreen(FULL, true))).toBe(false);
  });
});
```

`src/lib/journey/downgrade.test.ts`에서 찾을 부분:

```ts
  });
});
```

바꿀 내용:

```ts
  });

  it("모든 프레임이 250ms를 넘으면(4fps 아래) 긴 간격 세 번째에 바로 내린다(2-4c)", () => {
    expect(run("full", 300, 2)).toBe(900);
  });

  it("긴 간격 두 번 뒤 정상 프레임이 오면 다시 센다", () => {
    const watch = createWatch();
    expect(run("full", 300, 0.6, 0, watch)).toBeNull();
    expect(run("full", 1000 / 60, 1, 616, watch)).toBeNull();
    expect(run("full", 300, 0.3, 1916, watch)).toBeNull();
  });

  it("단계를 바꾼 직후(holdWatch)에는 긴 간격을 다시 센다", () => {
    const watch = createWatch();
    expect(run("full", 300, 0.6, 0, watch)).toBeNull();
    holdWatch(watch, 600, 0);
    expect(run("full", 300, 0.6, 900, watch)).toBeNull();
  });
});
```

- [ ] **Step 2: 단위 실패를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4 src/lib/journey/journeyMode.test.ts src/lib/journey/downgrade.test.ts`
Expected: FAIL — `Tests  4 failed | 17 passed (21)`. `TypeError: fitScreen is not a function`(둘), keep3d 방문의 단계(`quality: 'full'`, 기대 `'min'`), `expected null to be 900`. "긴 간격 두 번 뒤 정상 프레임이 오면 다시 센다"·"단계를 바꾼 직후(holdWatch)에는 긴 간격을 다시 센다"는 지금도 통과한다(새 규칙이 지나치게 내리지 않게 묶는 테스트다)

- [ ] **Step 3: 실패하는 e2e를 쓴다**

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts
    }
  });
});

```

바꿀 내용:

```ts
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

```

- [ ] **Step 4: e2e 실패를 확인한다**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`·`3000`은 무시)

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts -g "아주 느린 기기"` (Playwright가 매번 `next build`부터 한다. 2~6분)
Expected: FAIL — `4 failed`. 모두 `Expected: "2d"`, `Received: null`(40초 동안 강등되지 않는다)

- [ ] **Step 5: 규칙을 쓴다**

`src/lib/journey/journeyMode.ts`에서 찾을 부분:

```ts
export type QualityLevel = "full" | "lite" | "min";
/** 2D가 된 이유: 기기 단계, 수동, 느림(실행 중 강등), 컨텍스트 손실, 장면 실패 */
export type Reason = "tier" | "manual" | "slow" | "context-lost" | "failed";

```

바꿀 내용:

```ts
export type QualityLevel = "full" | "lite" | "min";
/** 2D가 된 이유: 기기 단계, 수동, 느림(실행 중 강등), 컨텍스트 손실, 장면 실패, 화면(짧은 가로, 2-4c) */
export type Reason = "tier" | "manual" | "slow" | "context-lost" | "failed" | "screen";

```

`src/lib/journey/journeyMode.ts`에서 찾을 부분:

```ts
    reason: null,
    quality: mode.reason === "slow" ? "min" : mode.base,
    keep3d: mode.keep3d || isAutoFlat(mode),
  };
}
```

바꿀 내용:

```ts
    reason: null,
    // 자동 2D 뒤 3D를 고른 방문(keep3d)은 수동 2D를 거쳐 돌아와도 이미 내린 단계를 유지한다(전체부터 다시 내려가며 끊기지 않게, 2-4c)
    quality: mode.reason === "slow" ? "min" : mode.keep3d ? mode.quality : mode.base,
    keep3d: mode.keep3d || isAutoFlat(mode),
  };
}

/**
 * 짧은 가로 화면(스펙 5절, 2-4c). 3D로 보던 중 짧은 가로가 되면 2D(이유: 화면)로, 짧은 가로가 아니게 되면 같은 품질의 3D로 돌아온다.
 * 이미 다른 이유로 2D였으면 그대로다. 알림을 띄우지 않고 기억하지 않는다
 */
export function fitScreen(mode: JourneyMode, shortLandscape: boolean): JourneyMode {
  if (shortLandscape && mode.view === "3d") return { ...mode, view: "2d", reason: "screen" };
  if (!shortLandscape && mode.reason === "screen") return { ...mode, view: "3d", reason: null };
  return mode;
}
```

`src/lib/journey/downgrade.ts`에서 찾을 부분:

```ts
 * - 경량의 기준 30은 28 아래로 잰다. 30Hz로 묶인 기기(아이폰 저전력 모드)는 정확히 30fps라 멀쩡해도 최소로 떨어진다
 * - 한 프레임이 250ms를 넘으면(탭 전환·디버거) 창을 비우고 다시 잰다
 * - 단계를 바꾼 직후 1초는 세지 않는다(holdWatch). 배율·블룸을 바꾸며 렌더 타깃과 효과 셰이더를 한 번 다시 만드는 끊김을 뺀다
```

바꿀 내용:

```ts
 * - 경량의 기준 30은 28 아래로 잰다. 30Hz로 묶인 기기(아이폰 저전력 모드)는 정확히 30fps라 멀쩡해도 최소로 떨어진다
 * - 한 프레임이 250ms를 넘으면(탭 전환·디버거) 창을 비우고 다시 잰다. 그런 간격이 연속 3번이면(2-4c) 2초 창을 기다리지 않고 바로 내리라고
 *   답한다. 모든 프레임이 250ms를 넘는(4fps 아래) 기기는 창이 매번 비워져 강등되지 않았다. 탭이 가려진 동안은 부르는 쪽이 세지 않는다
 * - 단계를 바꾼 직후 1초는 세지 않는다(holdWatch). 배율·블룸을 바꾸며 렌더 타깃과 효과 셰이더를 한 번 다시 만드는 끊김을 뺀다
```

`src/lib/journey/downgrade.ts`에서 찾을 부분:

```ts
  gapMs: 250,
  below: { full: 45, lite: 28, min: 24 } as Record<QualityLevel, number>,
```

바꿀 내용:

```ts
  gapMs: 250,
  longGaps: 3,
  below: { full: 45, lite: 28, min: 24 } as Record<QualityLevel, number>,
```

`src/lib/journey/downgrade.ts`에서 찾을 부분:

```ts
  holdUntil: number;
}

export function createWatch(): FrameWatch {
  return { times: [], startedAt: null, holdUntil: 0 };
}
```

바꿀 내용:

```ts
  holdUntil: number;
  /** 연속으로 250ms를 넘은 프레임 간격의 수 */
  longGaps: number;
}

export function createWatch(): FrameWatch {
  return { times: [], startedAt: null, holdUntil: 0, longGaps: 0 };
}
```

`src/lib/journey/downgrade.ts`에서 찾을 부분:

```ts
  watch.holdUntil = nowMs + forMs;
}

/** 프레임 하나를 센다. 2초 창이 다 찼고 그 동안의 fps가 지금 단계의 기준 아래면 true(한 단계 내린다) */
export function frameTooSlow(watch: FrameWatch, nowMs: number, level: QualityLevel): boolean {
```

바꿀 내용:

```ts
  watch.holdUntil = nowMs + forMs;
  watch.longGaps = 0;
}

/** 프레임 하나를 센다. 2초 창이 다 찼고 그 동안의 fps가 지금 단계의 기준 아래이거나, 250ms 넘는 간격이 연속 3번이면 true(한 단계 내린다) */
export function frameTooSlow(watch: FrameWatch, nowMs: number, level: QualityLevel): boolean {
```

`src/lib/journey/downgrade.ts`에서 찾을 부분:

```ts
    watch.startedAt = null;
  }
```

바꿀 내용:

```ts
    watch.startedAt = null;
    watch.longGaps += 1;
    if (watch.longGaps >= DOWNGRADE.longGaps) {
      watch.longGaps = 0;
      return true;
    }
  } else if (last !== undefined) {
    watch.longGaps = 0;
  }
```

- [ ] **Step 6: 통과를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4 src/lib/journey/journeyMode.test.ts src/lib/journey/downgrade.test.ts`
Expected: PASS — `Tests  21 passed (21)`

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`·`3000`은 무시)

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts -g "아주 느린 기기"` (Playwright가 매번 `next build`부터 한다. 2~6분)
Expected: PASS — `4 passed`(전체 → 2D까지 테스트마다 약 13초)

- [ ] **Step 7: 전체 확인**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`·`3000`은 무시)

Run: `rtk proxy npx tsc --noEmit` → exit 0
Run: `rtk proxy npx vitest run --maxWorkers=4` → `Tests  433 passed (433)`
Run: `rtk proxy npx eslint src/lib/journey/journeyMode.ts src/lib/journey/journeyMode.test.ts src/lib/journey/downgrade.ts src/lib/journey/downgrade.test.ts e2e/journey.e2e.ts` → exit 0, 문제 0(`baseline-browser-mapping` 안내 한 줄은 린트 결과가 아니다)

- [ ] **Step 8: 커밋 정리를 제출한다**

파일별 변경 표와 메시지 초안. 초안 예:

```
feat: 여정 모드 규칙에 짧은 가로 화면·고른 3D의 단계·아주 느린 기기 반영

- 2D가 된 이유에 화면(짧은 가로)을 더해 세로로 돌리면 같은 품질의 3D로 돌아오게 한다
- 자동 2D 뒤 고른 3D는 수동 2D를 거쳐 돌아와도 이미 내린 단계를 유지한다
- 250ms 넘는 프레임이 연속 3번이면 바로 한 단계 내려 아주 느린 기기도 2D까지 내려간다
```

---

### Task 2: 짧은 가로 화면 2D(회전 전환, 처음 그리기, "3D로 보기" 감춤)

스펙 5절 "짧은 가로 화면"(사용자 결정)이다. 짧은 가로 판정은 `lib/journey/screen.ts`의 미디어 쿼리 하나(`(orientation: landscape) and (max-height: 499.98px) and (pointer: coarse)`)로 하고 처음 그리기 스크립트도 같은 문자열을 쓴다. `getJourneyMode`는 처음 결정에 `fitScreen`을 씌운다. `JourneyStage`의 `useFitScreen`은 미디어 쿼리가 바뀔 때마다 `applyMode(fitScreen(...), card)`로 바꾼다. 화면을 돌리면 새 폭으로 배치가 먼저 바뀐 뒤에 알림이 와서 그 순간의 카드는 이미 앞 카드다(2D는 폭이 좁아지면 위쪽 카드가 길어진다, 계획 머리말 2). 그래서 보던 카드는 크기가 그대로인 동안의 스크롤 때 기억해 두고 넘긴다(`applyMode`에 지킬 카드 인자). 진행 막대는 짧은 가로 화면에서 "3D로 보기"를 두지 않는다. 처음 그리기 스크립트는 짧은 가로 화면이면 기억한 3D보다 앞서 2D 표지를 건다(저장소가 막혀도 본다). 데스크톱(터치 아님)의 낮은 창은 바뀌지 않는다. Review Focus 1·2·3의 테스트(상세가 열린 채 돌리기, 2D를 기억한 방문자의 회전, 저장소가 막힌 짧은 가로)를 여기에 둔다.

**Files:**
- Create: `src/lib/journey/screen.ts`
- Modify: `e2e/journey.e2e.ts`, `src/app/journey/page.tsx`, `src/components/journey/JourneyStage.tsx`, `src/components/journey/ProgressRail.tsx`, `src/components/journey/modeSwitch.ts`, `src/lib/journey/journeyMode.ts`

**Interfaces:**
- Consumes: Task 1의 `fitScreen`, 2-4b의 `applyMode`·`currentCard`(modeSwitch.ts), `getJourneyMode`·`VIEW_KEY`(journeyMode.ts), e2e 도우미 `expectFlat`·`expectFlatAnchor`·`holdScripts`·`settleAt`·`middleOf`·`collectErrors`
- Produces: `SHORT_LANDSCAPE_QUERY`, `isShortLandscape(): boolean`, `subscribeShortLandscape(listener): () => void`(screen.ts), `applyMode(next: JourneyMode, keep?: string)`(지킬 카드를 넘기면 그 카드를 쓴다), `<html data-journey-reason="screen">`

- [ ] **Step 1: 실패하는 e2e를 쓴다**

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts
    expect(await dialog.evaluate((element) => getComputedStyle(element).animationName)).toBe("none");
  });
});

```

바꿀 내용:

```ts
    expect(await dialog.evaluate((element) => getComputedStyle(element).animationName)).toBe("none");
  });
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

```

- [ ] **Step 2: e2e 실패를 확인한다**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`·`3000`은 무시)

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts -g "짧은 가로 화면|낮은 가로 창"` (Playwright가 매번 `next build`부터 한다. 2~6분)
Expected: FAIL — `10 failed | 4 passed`. 실패는 모두 `<html>`에 2D 표지가 없어 `Expected: "2d"`, `Received: ""`. 통과하는 넷은 "터치가 아니면 낮은 가로 창(1280×450)도 3D다"와 "2D를 기억한 방문자는 가로로 들었다가 세로로 돌려도 2D(이유: 수동)다"(두 크기)로, 바뀌지 않아야 할 것을 묶는 테스트다

- [ ] **Step 3: 짧은 가로 판정과 회전 전환·처음 그리기·버튼 감춤을 쓴다**

`src/lib/journey/screen.ts` 전체:

```ts
/**
 * 짧은 가로 화면(스펙 5절 "짧은 가로 화면", 2-4c): 가로이고 높이가 500px 미만인 터치 기기. 넓은 화면 배치로는 정류장 카드끼리 겹치고
 * 3D가 거의 가려져 2D로 보인다. 데스크톱은 개발자 도구를 아래에 열어 창이 낮아져도 바뀌지 않게 터치(pointer: coarse)로 한정한다.
 * 처음 그리기 스크립트(app/journey/page.tsx)도 같은 조건을 쓴다. 미디어 쿼리 하나를 두고 읽는다. 브라우저에서만 부른다.
 */
export const SHORT_LANDSCAPE_QUERY = "(orientation: landscape) and (max-height: 499.98px) and (pointer: coarse)";

let query: MediaQueryList | null = null;

function shortQuery(): MediaQueryList {
  query ??= window.matchMedia(SHORT_LANDSCAPE_QUERY);
  return query;
}

export function isShortLandscape(): boolean {
  return shortQuery().matches;
}

export function subscribeShortLandscape(listener: () => void): () => void {
  const media = shortQuery();
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}
```

`src/lib/journey/journeyMode.ts`에서 찾을 부분:

```ts
import { detectTier, type Tier } from "./capability";
import { hasWebGL2 } from "./webgl";
```

바꿀 내용:

```ts
import { detectTier, type Tier } from "./capability";
import { isShortLandscape } from "./screen";
import { hasWebGL2 } from "./webgl";
```

`src/lib/journey/journeyMode.ts`에서 찾을 부분:

```ts
/**
 * 이 페이지의 모드. 처음 읽을 때 기기 단계와 기억한 선택으로 한 번 정한다(브라우저에서만 부른다). 어디서 먼저 읽든 같은 결정이다.
 * 하이드레이션 때는 자식 컴포넌트의 effect가 JourneyStage보다 먼저 돌므로, 읽는 쪽마다 정해지지 않은 값을 받지 않게 한다
 */
export function getJourneyMode(): JourneyMode {
  current ??= initialMode(detectTier(), storedView(), hasWebGL2());
  return current;
```

바꿀 내용:

```ts
/**
 * 이 페이지의 모드. 처음 읽을 때 기기 단계와 기억한 선택, 짧은 가로 화면인지로 한 번 정한다(브라우저에서만 부른다). 어디서 먼저 읽든 같은 결정이다.
 * 하이드레이션 때는 자식 컴포넌트의 effect가 JourneyStage보다 먼저 돌므로, 읽는 쪽마다 정해지지 않은 값을 받지 않게 한다
 */
export function getJourneyMode(): JourneyMode {
  current ??= fitScreen(initialMode(detectTier(), storedView(), hasWebGL2()), isShortLandscape());
  return current;
```

`src/components/journey/modeSwitch.ts`에서 찾을 부분:

```ts
 * 포커스가 감춰질 진행 표시(누른 전환 버튼, 막 이동 버튼) 안에 있었으면 새 진행 표시의 전환 버튼으로 옮긴다. 그러지 않으면 포커스가
 * 사라져 키보드·화면 낭독기 사용자가 자리를 잃는다(스펙 5절 "모드 전환", 2-4b 최종 리뷰)
 */
export function applyMode(next: JourneyMode): void {
  const before = getJourneyMode();
```

바꿀 내용:

```ts
 * 포커스가 감춰질 진행 표시(누른 전환 버튼, 막 이동 버튼) 안에 있었으면 새 진행 표시의 전환 버튼으로 옮긴다. 그러지 않으면 포커스가
 * 사라져 키보드·화면 낭독기 사용자가 자리를 잃는다(스펙 5절 "모드 전환", 2-4b 최종 리뷰).
 * 지킬 카드를 넘기면 그 카드를 쓴다(화면을 돌린 뒤처럼 지금 배치가 이미 바뀌어 보던 카드를 다시 구할 수 없을 때)
 */
export function applyMode(next: JourneyMode, keep?: string): void {
  const before = getJourneyMode();
```

`src/components/journey/modeSwitch.ts`에서 찾을 부분:

```ts
  }
  const card = currentCard(before.view);
  const hiding = document.activeElement?.closest(next.view === "2d" ? "[data-journey-rail]" : "[data-journey-tabs]");
```

바꿀 내용:

```ts
  }
  const card = keep ?? currentCard(before.view);
  const hiding = document.activeElement?.closest(next.view === "2d" ? "[data-journey-rail]" : "[data-journey-tabs]");
```

`src/components/journey/JourneyStage.tsx`에서 찾을 부분:

```tsx
import { useEffect, useSyncExternalStore } from "react";
import { fail, getJourneyMode, getServerJourneyMode, subscribeJourneyMode } from "@/lib/journey/journeyMode";
import { getSceneFailure, getSceneStatus, setCarStatus, setSceneStatus, subscribeSceneStatus } from "@/lib/journey/sceneStatus";
import { useFlatReveal } from "./flatReveal";
import { useHologramFocus } from "./hologramLinks";
import { LAYOUT_EVENT, applyMode } from "./modeSwitch";
import { ProgressRail } from "./ProgressRail";
```

바꿀 내용:

```tsx
import { useEffect, useSyncExternalStore } from "react";
import { fail, fitScreen, getJourneyMode, getServerJourneyMode, subscribeJourneyMode } from "@/lib/journey/journeyMode";
import { getSceneFailure, getSceneStatus, setCarStatus, setSceneStatus, subscribeSceneStatus } from "@/lib/journey/sceneStatus";
import { isShortLandscape, subscribeShortLandscape } from "@/lib/journey/screen";
import { useFlatReveal } from "./flatReveal";
import { useHologramFocus } from "./hologramLinks";
import { LAYOUT_EVENT, applyMode, currentCard } from "./modeSwitch";
import { ProgressRail } from "./ProgressRail";
```

`src/components/journey/JourneyStage.tsx`에서 찾을 부분:

```tsx

/** 여정 페이지의 클라이언트 진입점. 스크롤 엔진을 켜고, 모드(3D·2D)를 정해 3D면 장면을 얹는다. */
```

바꿀 내용:

```tsx

/**
 * 짧은 가로 화면이 되거나 풀리면 모드를 맞춘다(스펙 5절 "짧은 가로 화면", 2-4c). 화면을 돌릴 때마다 보던 카드를 지키는 모드 전환을 지난다.
 * 화면을 돌리면 새 폭으로 배치가 먼저 바뀐 뒤에 알림이 와서 그 순간의 카드는 이미 앞 카드다(2D는 폭이 좁아지면 위쪽 카드가 길어진다).
 * 그래서 보던 카드는 크기가 그대로인 동안의 스크롤 때 기억해 두고, 크기가 바뀐 프레임이 지나면 새 배치에서 다시 구한다.
 * 처음 모드는 getJourneyMode가 이미 맞췄고, 구독을 걸기 전에 돌렸을 때를 위해 한 번 더 맞춘다
 */
function useFitScreen(): void {
  useEffect(() => {
    const sizeNow = () => `${window.innerWidth}x${window.innerHeight}`;
    let size = sizeNow();
    let card = currentCard(getJourneyMode().view);
    let frame = 0;
    const remember = () => {
      if (sizeNow() === size) card = currentCard(getJourneyMode().view);
    };
    const resized = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        size = sizeNow();
        card = currentCard(getJourneyMode().view);
      });
    };
    const fit = () => {
      const mode = getJourneyMode();
      const next = fitScreen(mode, isShortLandscape());
      if (next !== mode) applyMode(next, card);
    };
    fit();
    const unsubscribe = subscribeShortLandscape(fit);
    window.addEventListener("scroll", remember, { passive: true });
    window.addEventListener("resize", resized);
    return () => {
      unsubscribe();
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", remember);
      window.removeEventListener("resize", resized);
    };
  }, []);
}

/** 여정 페이지의 클라이언트 진입점. 스크롤 엔진을 켜고, 모드(3D·2D)를 정해 3D면 장면을 얹는다. */
```

`src/components/journey/JourneyStage.tsx`에서 찾을 부분:

```tsx
  useFlatOnFailure();
  // 세로 화면에서 3D로 보는 동안 본문 카드를 아래 고정 자리로 옮긴다(스펙 3절 "세로 화면")
```

바꿀 내용:

```tsx
  useFlatOnFailure();
  useFitScreen();
  // 세로 화면에서 3D로 보는 동안 본문 카드를 아래 고정 자리로 옮긴다(스펙 3절 "세로 화면")
```

`src/components/journey/ProgressRail.tsx`에서 찾을 부분:

```tsx
import { getJourneyMode, isAutoFlat, subscribeJourneyMode } from "@/lib/journey/journeyMode";
import { scrollState, subscribeProgress } from "@/lib/journey/scrollState";
```

바꿀 내용:

```tsx
import { getJourneyMode, isAutoFlat, subscribeJourneyMode } from "@/lib/journey/journeyMode";
import { isShortLandscape, subscribeShortLandscape } from "@/lib/journey/screen";
import { scrollState, subscribeProgress } from "@/lib/journey/scrollState";
```

`src/components/journey/ProgressRail.tsx`에서 찾을 부분:

```tsx
  const canSwitch = useSyncExternalStore(subscribeNothing, hasWebGL2, () => true);
  const [notice, setNotice] = useState(false);
```

바꿀 내용:

```tsx
  const canSwitch = useSyncExternalStore(subscribeNothing, hasWebGL2, () => true);
  // 짧은 가로 화면에서는 쓸 3D 배치가 없어 "3D로 보기"를 두지 않는다(스펙 5절 "짧은 가로 화면", 2-4c)
  const shortLandscape = useSyncExternalStore(subscribeShortLandscape, isShortLandscape, () => false);
  const [notice, setNotice] = useState(false);
```

`src/components/journey/ProgressRail.tsx`에서 찾을 부분:

```tsx
          ))}
          {canSwitch && (
            <button
```

바꿀 내용:

```tsx
          ))}
          {canSwitch && !shortLandscape && (
            <button
```

`src/app/journey/page.tsx`에서 찾을 부분:

```tsx
import { VIEW_KEY } from "@/lib/journey/journeyMode";

```

바꿀 내용:

```tsx
import { VIEW_KEY } from "@/lib/journey/journeyMode";
import { SHORT_LANDSCAPE_QUERY } from "@/lib/journey/screen";

```

`src/app/journey/page.tsx`에서 찾을 부분:

```tsx
 * 처음 그리기(스펙 5절, 2-4b): 2D를 기억한 방문자는 본문보다 먼저 도는 이 스크립트가 <html>에 2D 표지를 걸어 처음 그릴 때부터 2D 배치다.
 * 기기 단계로 2D인 기기는 하이드레이션 때 바뀐다(JourneyStage). 루트 레이아웃의 <html>이 suppressHydrationWarning이라 경고가 없다.
 */
const FLAT_FIRST = `try{if(localStorage.getItem(${JSON.stringify(VIEW_KEY)})==="2d")document.documentElement.dataset.journeyMode="2d"}catch(e){}`;

```

바꿀 내용:

```tsx
 * 처음 그리기(스펙 5절, 2-4b): 2D를 기억한 방문자는 본문보다 먼저 도는 이 스크립트가 <html>에 2D 표지를 걸어 처음 그릴 때부터 2D 배치다.
 * 짧은 가로 화면(2-4c)도 처음부터 2D다(기억한 3D보다 앞선다, 저장소가 막혀도 본다). 기기 단계로 2D인 기기는 하이드레이션 때 바뀐다(JourneyStage).
 * 루트 레이아웃의 <html>이 suppressHydrationWarning이라 경고가 없다.
 */
const FLAT_FIRST = `(function(){var d=document.documentElement;try{if(localStorage.getItem(${JSON.stringify(VIEW_KEY)})==="2d")d.dataset.journeyMode="2d"}catch(e){}try{if(matchMedia(${JSON.stringify(SHORT_LANDSCAPE_QUERY)}).matches)d.dataset.journeyMode="2d"}catch(e){}})()`;

```

- [ ] **Step 4: e2e 통과를 확인한다**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`·`3000`은 무시)

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts -g "짧은 가로 화면|낮은 가로 창"` (Playwright가 매번 `next build`부터 한다. 2~6분)
Expected: PASS — `14 passed`

관련 테스트(2D·전환·회전·처음 그리기)가 그대로인지 본다.

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts -g "2D|3D로|돌리면|렌즈|처음 그리기|하이드레이션"` (Playwright가 매번 `next build`부터 한다. 2~6분)
Expected: 실패 0(모두 통과)

- [ ] **Step 5: 전체 확인**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`·`3000`은 무시)

Run: `rtk proxy npx tsc --noEmit` → exit 0
Run: `rtk proxy npx vitest run --maxWorkers=4` → `Tests  433 passed (433)`
Run: `rtk proxy npx eslint src/lib/journey/screen.ts src/lib/journey/journeyMode.ts src/components/journey/modeSwitch.ts src/components/journey/JourneyStage.tsx src/components/journey/ProgressRail.tsx src/app/journey/page.tsx e2e/journey.e2e.ts` → exit 0, 문제 0(`baseline-browser-mapping` 안내 한 줄은 린트 결과가 아니다)

- [ ] **Step 6: 커밋 정리를 제출한다**

파일별 변경 표와 메시지 초안. 초안 예:

```
feat: 여정 짧은 가로 화면을 2D로 보이고 세로로 돌리면 3D로 돌아오기

- 가로이고 높이 500px 미만인 터치 기기는 2D(이유: 화면)로, 세로로 돌리면 같은 품질의 3D로 돌아간다(알림·기억 없음)
- 돌리기 전 스크롤 때 보던 카드를 기억해 새 배치에서 그 카드로 맞추고, 처음 그리기 스크립트도 짧은 가로를 본다
- 짧은 가로 화면에서는 3D로 보기를 두지 않는다
```

---

### Task 3: 접근성 검사(axe)와 접근성 수정(lang, 2D 위 여백, "2D" 버튼 크기, 상세를 닫은 뒤 알림)

스펙 1절 2-4c 완료 조건의 접근성이다. `@axe-core/playwright`(4절 의존성)를 개발 의존성으로 더하고 3D·2D·상세 열린 상태를 WCAG 2.1 A·AA 규칙으로 검사한다. 사본에서 돌려 보니 이미 위반이 0이었다(계획 머리말 7). 그래서 axe 테스트는 회귀를 막는 테스트다. 고치는 것은 넷이다: `<html lang="ko">`(사이트 전체), 2D 위 여백을 카드·섹션의 `scroll-margin-top`에서 페이지 전체의 `scroll-padding-top` 6.5rem으로 옮긴다(막 탭 밑에 걸친 링크로 Shift+Tab하면 가렸다. Lenis `scrollTo(요소)`도 `<html>`의 scroll-padding을 뺀다. `modeSwitch.scrollToCard`는 `<html>`의 값을 읽는다), 3D 막대의 "2D" 버튼을 24×24px 이상으로, 상세가 열린 동안 자동으로 2D가 되면 알림을 상세를 닫은 뒤(`whenUnlocked`) 6초 띄운다.

**Files:**
- Modify: `e2e/journey.e2e.ts`, `src/app/globals.css`, `src/app/layout.tsx`, `src/components/journey/ProgressRail.tsx`, `src/components/journey/modeSwitch.ts`
- Modify(Step 1의 `npm install`이 고친다): `package.json`, `package-lock.json`

**Interfaces:**
- Consumes: 2-4b의 `whenUnlocked`(engine.ts), `FLAT_TOP`(modeSwitch.ts), e2e 도우미 `waitReady`·`expectFlat`·`loseContext`·`settleAt`·`middleOf`·`NOTICE`
- Produces: e2e 도우미 `axeViolations(page): Promise<string[]>`(Task 4가 쓴다), 2D면 `html { scroll-padding-top: 6.5rem }`

- [ ] **Step 1: 접근성 검사 도구를 더한다**

Run: `rtk proxy npm install -D --save-exact @axe-core/playwright@4.13.0`
Expected: exit 0. `package.json`의 devDependencies에 `"@axe-core/playwright": "4.13.0"`이 들고 `package-lock.json`에 `axe-core` 4.13.x가 더해진다(4.14.0은 2026-10-15에 나와 아직 2주가 되지 않았다. 4.13.0은 2026-08-11)

- [ ] **Step 2: 실패하는 e2e를 쓴다(axe 검사와 넷)**

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts
import { expect, test, type Page } from "@playwright/test";
```

바꿀 내용:

```ts
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
```

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts
    expect(await dialog.evaluate((element) => getComputedStyle(element).animationName)).toBe("none");
  });
});

```

바꿀 내용:

```ts
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

```

- [ ] **Step 3: e2e 실패를 확인한다**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`·`3000`은 무시)

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts -g "접근성\(axe|lang=|막 탭 밑에 걸쳐|24×24px|닫은 뒤에 6초"` (Playwright가 매번 `next build`부터 한다. 2~6분)
Expected: FAIL — `8 failed | 6 passed`. 통과 여섯은 axe 검사(이미 위반 0)다. 실패: lang(`Expected: "ko"`, `Received: "en"`), 막 탭 밑 링크(`Expected: >= 104`, `Received: 50`), 2D 버튼(`Expected: >= 24`, `Received: 16`), 알림(`Expected: ""`, `Received: "기기에 맞춰 2D로 바꿨어요"` — 상세가 열린 동안 이미 떠 있다)

- [ ] **Step 4: 넷을 고친다**

`src/app/layout.tsx`에서 찾을 부분:

```tsx
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
```

바꿀 내용:

```tsx
  return (
    <html lang="ko" className="dark" suppressHydrationWarning>
      <body
```

`src/app/globals.css`에서 찾을 부분:

```css
 * 여정 2D(스펙 5절 "2D 레이아웃", 2-4b). 2D면 <html>에 data-journey-mode="2d"가 붙는다(JourneyStage, 처음 그리기 스크립트).
 * 모드를 바꾸거나 공유 주소로 열 때 카드로 스크롤하면 카드 위끝이 헤더와 막 탭 아래에 오도록 위 여백을 둔다.
 */
html[data-journey-mode="2d"] [data-journey-card],
html[data-journey-mode="2d"] [data-stop] {
  scroll-margin-top: 6.5rem;
}
```

바꿀 내용:

```css
 * 여정 2D(스펙 5절 "2D 레이아웃", 2-4b). 2D면 <html>에 data-journey-mode="2d"가 붙는다(JourneyStage, 처음 그리기 스크립트).
 * 모드를 바꾸거나 공유 주소로 열 때 카드로 스크롤하면 카드 위끝이 헤더와 막 탭 아래에 오도록 위 여백을 둔다. 여백은 페이지 전체의
 * scroll-padding이라 키보드 포커스가 막 탭 밑에 걸친 링크로 가도 그 아래로 옮겨 보인다(2-4c, WCAG 2.4.11). Lenis scrollTo(요소)도 뺀다.
 */
html[data-journey-mode="2d"] {
  scroll-padding-top: 6.5rem;
}
```

`src/components/journey/modeSwitch.ts`에서 찾을 부분:

```ts

/** 2D에서 카드 위끝이 오는 자리(px): 헤더(3.5rem)와 막 탭(2.5rem) 아래 0.5rem. globals.css의 scroll-margin-top 6.5rem과 같다 */
export const FLAT_TOP = 104;
```

바꿀 내용:

```ts

/** 2D에서 카드 위끝이 오는 자리(px): 헤더(3.5rem)와 막 탭(2.5rem) 아래 0.5rem. globals.css의 scroll-padding-top 6.5rem과 같다 */
export const FLAT_TOP = 104;
```

`src/components/journey/modeSwitch.ts`에서 찾을 부분:

```ts
/**
 * 그 카드가 보이는 자리로 곧바로 스크롤한다. 3D는 카드의 대표 진행률(엔딩은 끝), 2D는 카드 위끝이 scroll-margin-top만큼 아래에 온다.
 * 2D에서는 그 카드를 전환 없이 곧바로 나타나게 하고(data-revealed="instant"), 위치는 등장 전 transform(아래 20px)과 상관없이 잰다
```

바꿀 내용:

```ts
/**
 * 그 카드가 보이는 자리로 곧바로 스크롤한다. 3D는 카드의 대표 진행률(엔딩은 끝), 2D는 카드 위끝이 페이지의 scroll-padding-top만큼 아래에 온다.
 * 2D에서는 그 카드를 전환 없이 곧바로 나타나게 하고(data-revealed="instant"), 위치는 등장 전 transform(아래 20px)과 상관없이 잰다
```

`src/components/journey/modeSwitch.ts`에서 찾을 부분:

```ts
    element.dataset.revealed = "instant";
    top = documentTop(element) - (Number.parseFloat(getComputedStyle(element).scrollMarginTop) || 0);
  } else {
```

바꿀 내용:

```ts
    element.dataset.revealed = "instant";
    top = documentTop(element) - (Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0);
  } else {
```

`src/components/journey/ProgressRail.tsx`에서 찾을 부분:

```tsx
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { getLenis } from "@/lib/journey/engine";
import { getJourneyMode, isAutoFlat, subscribeJourneyMode } from "@/lib/journey/journeyMode";
```

바꿀 내용:

```tsx
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { getLenis, whenUnlocked } from "@/lib/journey/engine";
import { getJourneyMode, isAutoFlat, subscribeJourneyMode } from "@/lib/journey/journeyMode";
```

`src/components/journey/ProgressRail.tsx`에서 찾을 부분:

```tsx

/** 2D 막 탭: 그 막 섹션으로 간다. 위 여백은 섹션의 scroll-margin-top이 정한다(Lenis도 scroll-margin을 뺀다) */
function scrollToAct(id: string) {
```

바꿀 내용:

```tsx

/** 2D 막 탭: 그 막 섹션으로 간다. 위 여백은 페이지의 scroll-padding-top이 정한다(Lenis도 scroll-padding을 뺀다) */
function scrollToAct(id: string) {
```

`src/components/journey/ProgressRail.tsx`에서 찾을 부분:

```tsx

  // 3D에서 자동으로 2D가 되는 순간에만 알림을 켠다(수동 2D·기기 단계 2D는 알리지 않는다)
  useEffect(() => {
```

바꿀 내용:

```tsx

  // 3D에서 자동으로 2D가 되는 순간에만 알림을 켠다(수동 2D·기기 단계 2D·화면 2D는 알리지 않는다). 상세가 열려 스크롤이 잠겨 있으면
  // 상세 밖의 알림은 가려지고 화면 낭독기에도 읽히지 않으므로, 상세를 닫은 뒤(보던 카드를 맞추는 때와 같다) 띄운다(2-4c)
  useEffect(() => {
```

`src/components/journey/ProgressRail.tsx`에서 찾을 부분:

```tsx
      window.clearTimeout(timer);
      setNotice(flattened);
      if (flattened) timer = window.setTimeout(() => setNotice(false), 6000);
    });
```

바꿀 내용:

```tsx
      window.clearTimeout(timer);
      if (!flattened) {
        setNotice(false);
        return;
      }
      whenUnlocked(() => {
        setNotice(true);
        timer = window.setTimeout(() => setNotice(false), 6000);
      });
    });
```

`src/components/journey/ProgressRail.tsx`에서 찾을 부분:

```tsx
            aria-label="2D로 보기"
            className="rounded px-1 text-xs font-medium text-zinc-300 transition-colors hover:text-white"
          >
```

바꿀 내용:

```tsx
            aria-label="2D로 보기"
            className="inline-flex min-h-6 min-w-6 items-center justify-center rounded px-1 text-xs font-medium text-zinc-300 transition-colors hover:text-white"
          >
```

- [ ] **Step 5: e2e 통과를 확인한다**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`·`3000`은 무시)

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts -g "접근성\(axe|lang=|막 탭 밑에 걸쳐|24×24px|닫은 뒤에 6초"` (Playwright가 매번 `next build`부터 한다. 2~6분)
Expected: PASS — `14 passed`

`lang`이 블로그 글 화면을 바꾸지 않았는지(글꼴 선택), 2D 위 여백이 막 탭·공유 주소·모드 전환에 그대로인지 본다.

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts e2e/blog-projects.e2e.ts -g "2D|막 탭|공유 주소|글이 리팩터링"` (Playwright가 매번 `next build`부터 한다. 2~6분)
Expected: 실패 0(블로그 글 화면 비교 14개 포함)

- [ ] **Step 6: 전체 확인**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`·`3000`은 무시)

Run: `rtk proxy npx tsc --noEmit` → exit 0
Run: `rtk proxy npx vitest run --maxWorkers=4` → `Tests  433 passed (433)`
Run: `rtk proxy npx eslint src/app/layout.tsx src/components/journey/modeSwitch.ts src/components/journey/ProgressRail.tsx e2e/journey.e2e.ts` → exit 0, 문제 0(`baseline-browser-mapping` 안내 한 줄은 린트 결과가 아니다)

- [ ] **Step 7: 커밋 정리를 제출한다**

파일별 변경 표와 메시지 초안. 초안 예:

```
feat: 여정 접근성 검사 추가와 lang·2D 포커스 여백·2D 버튼 크기·알림 시점 수정

- @axe-core/playwright로 3D·2D·상세 열린 상태를 WCAG 2.1 A·AA로 검사한다(위반 0)
- <html lang="ko">, 2D 위 여백을 scroll-padding-top으로 옮겨 막 탭 밑에 걸친 링크에 포커스해도 가리지 않는다
- 2D 버튼의 누르는 자리를 24px 이상으로, 상세가 열린 동안 자동으로 2D가 되면 알림을 닫은 뒤에 띄운다
```

---

### Task 4: 좁은 헤더 GitHub 아이콘·포커스 테두리 여유, 상세를 열 때 밀림, 포커스 복귀

스펙 4절 "사이트 공통 요소 변경"과 5절 "포커스 복귀"·"상세를 열 때 밀림"이다. 헤더는 390px 미만에서 GitHub 글자를 화면 낭독기 전용으로 숨기고 SVG 아이콘(Octicons mark-github 16)을 보인다. 메뉴에 `p-1`을 주고 `-m-1`로 자리를 되돌려 넘치는 메뉴(overflow)가 포커스 테두리를 자르지 않게 한다. 상세가 스크롤을 잠그면 Lenis는 `overflow: clip`을 거는데, clip은 스크롤 컨테이너가 아니라 `scrollbar-gutter`가 걸리지 않는다. 그래서 여정 페이지에서만 잠금을 `overflow: hidden`으로 바꾸고 막대 자리를 늘 남긴다(계획 머리말 4: 이 맥의 창 없는 Chromium은 막대 폭이 0이라 밀림 자체를 잴 수 없어 잠금 중 상태로 검사한다). 포커스 복귀는 코드를 바꾸지 않고 테스트로 묶는다(계획 머리말 1: 닫기는 `history.back`이라 브라우저가 연 때의 스크롤 위치로 되돌린다). Review Focus 4(360px 헤더 아이콘 링크의 접근성)를 여기에 둔다.

**Files:**
- Modify: `e2e/journey.e2e.ts`, `src/app/globals.css`, `src/components/Header.tsx`

**Interfaces:**
- Consumes: Task 3의 `axeViolations`, e2e 도우미 `hologramCenter`·`settleAt`·`at`·`waitReady`
- Produces: 없음(헤더 링크 이름은 그대로 "GitHub")

- [ ] **Step 1: 실패하는 e2e를 쓴다**

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts
  await page.keyboard.press("Escape");
  await expect(page.getByRole("status")).toHaveText(NOTICE);
  await expect(page.getByRole("status")).toHaveText("", { timeout: 8000 });
});

// ── 짧은 가로 화면(2-4c, 스펙 5절 "짧은 가로 화면") ───────────────────
```

바꿀 내용:

```ts
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

// ── 짧은 가로 화면(2-4c, 스펙 5절 "짧은 가로 화면") ───────────────────
```

- [ ] **Step 2: e2e 실패를 확인한다**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`·`3000`은 무시)

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts -g "옆 저장소 홀로그램|키보드로 연 상세를 닫으면 그 링크|좁은 휴대폰\(360|첫 링크와 끝 링크|360px\) 헤더의 GitHub 아이콘|스크롤 막대 자리를 남긴다"` (Playwright가 매번 `next build`부터 한다. 2~6분)
Expected: FAIL — `6 failed | 6 passed`. 실패: 좁은 헤더(`Error: 360px`, `Expected: <= 0`, `Received: 21`), 포커스 테두리 자리(`Error: 블로그`, `Expected: >= 2`, `Received: 0`), 잠금 중 막대 자리(`["clip", "auto"]`, 기대 `["hidden", "stable"]`). 통과: 포커스 복귀 둘(옆 저장소 홀로그램, 키보드로 연 상세)과 360px axe(글자 링크도 이름이 있다) — 바뀌지 않아야 할 것을 묶는 테스트다

- [ ] **Step 3: 헤더와 잠금 중 막대 자리를 고친다**

`src/components/Header.tsx`에서 찾을 부분:

```tsx
 * 사이트 헤더. 작은 화면에서는 메뉴 간격과 글자를 줄이고 줄바꿈하지 않는다(여정 2-4a, 스펙 4절 "사이트 공통 요소 변경").
 * 390px에서 한 줄에 다 들고, 375px 이하처럼 더 좁으면 메뉴를 옆으로 밀어 볼 수 있다(스크롤 막대는 숨긴다). 640px 이상은 예전과 같다.
 */
```

바꿀 내용:

```tsx
 * 사이트 헤더. 작은 화면에서는 메뉴 간격과 글자를 줄이고 줄바꿈하지 않는다(여정 2-4a, 스펙 4절 "사이트 공통 요소 변경").
 * 390px 미만에서는 GitHub 글자 대신 아이콘을 보여 360·375px에서도 한 줄에 다 든다(링크 이름은 "GitHub", 2-4c). 320px처럼 더 좁으면 메뉴를
 * 옆으로 밀어 볼 수 있다(스크롤 막대는 숨긴다). 넘치는 메뉴가 포커스 테두리를 자르지 않게 메뉴 둘레에 4px 여유를 두고(p-1) 바깥 여백으로
 * 자리를 되돌린다(-m-1). 640px 이상은 예전과 같다.
 */
```

`src/components/Header.tsx`에서 찾을 부분:

```tsx
          </Link>
          <nav className="flex min-w-0 items-center space-x-2.5 overflow-x-auto whitespace-nowrap text-[13px] font-medium [scrollbar-width:none] sm:space-x-6 sm:text-sm [&::-webkit-scrollbar]:hidden">
            <Link
```

바꿀 내용:

```tsx
          </Link>
          <nav className="-m-1 flex min-w-0 items-center space-x-2.5 overflow-x-auto whitespace-nowrap p-1 text-[13px] font-medium [scrollbar-width:none] sm:space-x-6 sm:text-sm [&::-webkit-scrollbar]:hidden">
            <Link
```

`src/components/Header.tsx`에서 찾을 부분:

```tsx
            >
              GitHub
            </Link>
```

바꿀 내용:

```tsx
            >
              <span className="max-[390px]:sr-only">GitHub</span>
              <svg viewBox="0 0 16 16" aria-hidden="true" className="hidden size-4 fill-current max-[390px]:block">
                <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
              </svg>
            </Link>
```

`src/app/globals.css` 끝에 붙인다:

```css

/*
 * 상세를 열면 스크롤을 잠근다(Lenis의 lenis-stopped는 overflow: clip). clip에서는 스크롤 막대 자리가 사라져 본문이 15px 옆으로 밀렸다.
 * 여정 페이지에서는 막대 자리를 늘 남기고(scrollbar-gutter는 스크롤 컨테이너에만 걸려 clip 대신 hidden으로 잠근다), 막대가 원래 있는
 * 자리라 화면은 같다(스펙 5절 "상세를 열 때 밀림", 2-4c)
 */
html:has([data-journey-page]) {
  scrollbar-gutter: stable;
}

html.lenis.lenis-stopped:has([data-journey-page]) {
  overflow: hidden;
}
```

- [ ] **Step 4: e2e 통과를 확인한다**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`·`3000`은 무시)

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts -g "옆 저장소 홀로그램|키보드로 연 상세를 닫으면 그 링크|좁은 휴대폰\(360|첫 링크와 끝 링크|360px\) 헤더의 GitHub 아이콘|스크롤 막대 자리를 남긴다"` (Playwright가 매번 `next build`부터 한다. 2~6분)
Expected: PASS — `12 passed`

헤더는 사이트 전체에 쓰이므로 블로그 글 화면과 기존 헤더 테스트를 함께 본다.

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts e2e/blog-projects.e2e.ts -g "헤더|글이 리팩터링"` (Playwright가 매번 `next build`부터 한다. 2~6분)
Expected: 실패 0(블로그 글 화면 비교 14개 포함)

- [ ] **Step 5: 전체 확인**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`·`3000`은 무시)

Run: `rtk proxy npx tsc --noEmit` → exit 0
Run: `rtk proxy npx vitest run --maxWorkers=4` → `Tests  433 passed (433)`
Run: `rtk proxy npx eslint src/components/Header.tsx e2e/journey.e2e.ts` → exit 0, 문제 0(`baseline-browser-mapping` 안내 한 줄은 린트 결과가 아니다)

- [ ] **Step 6: 커밋 정리를 제출한다**

파일별 변경 표와 메시지 초안. 초안 예:

```
fix: 좁은 헤더의 GitHub 아이콘과 포커스 테두리, 여정 상세를 열 때 밀림

- 390px 미만에서 GitHub를 아이콘으로 보여 360·375px에서도 메뉴가 한 줄에 들고, 링크 이름은 GitHub로 남긴다
- 넘치는 메뉴가 포커스 테두리를 자르지 않게 여유를 두고, 여정 상세가 스크롤을 잠가도 스크롤 막대 자리를 남긴다
- 상세를 닫을 때 마우스·터치로 열었으면 제자리, 키보드면 그 링크의 카드 자리인 것을 테스트로 묶는다
```

---

### Task 5: 넘긴 동작 결함(앱의 해시 변경, 기기 단계 2D의 첫 스크롤, 그리기 전 표지, `busy` 상한, `perfSpeed`)

스펙 1절 2-4c 완료 조건의 "넘긴 결함"과 5절 "처음 그리기"(2-4c)다. ① 아래 고정 카드가 브라우저의 hashchange뿐 아니라 앱의 pushHash·replaceHash도 따른다(`subscribeHash`, PiCKCARE 앞줄이 해시를 따른다). ② `<html>` 표지를 그리기 전에 건다(`useLayoutEffect`. 블로그에서 헤더로 들어오면 처음 그리기 스크립트가 돌지 않아 effect로는 3D 배치가 먼저 보였다). ③ 하이드레이션 때 처음 2D가 되는 기기가 그 전에 스크롤했으면, 표지를 걸기 전 3D 배치에서 진행률(`progressOf`)로 보던 카드를 구해 2D에서 그 카드로 맞춘다. ④ 확인용 `busy`는 `busyFrom`으로 읽고 500ms로 묶는다(계획 머리말 3). ⑤ 측정 오버레이의 `perfSpeed`·`perfMinutes`는 `perfOptions`로 읽고 양수만 받는다.

**Files:**
- Modify: `e2e/journey.e2e.ts`, `src/components/journey/JourneyStage.tsx`, `src/components/journey/PerfOverlay.tsx`, `src/components/journey/modeSwitch.ts`, `src/components/journey/portraitCards.ts`, `src/components/journey/scene/frameStats.test.ts`, `src/components/journey/scene/frameStats.ts`, `src/lib/journey/perfStats.test.ts`, `src/lib/journey/perfStats.ts`

**Interfaces:**
- Consumes: `subscribeHash`(hashStore.ts), `activeCard`(portrait.ts), 2-4b의 `scrollToCard`·`scrollTopOf`(modeSwitch.ts), e2e 도우미 `hologramCenter`·`holdScripts`·`scrollToProgress`·`expectFlatAnchor`
- Produces: `progressOf(main: HTMLElement): number`(modeSwitch.ts), `BUSY_MAX_MS = 500`, `busyFrom(search: string): number`(frameStats.ts), `perfOptions(search: string): { speed: number; minutes: number }`(perfStats.ts)

- [ ] **Step 1: 실패하는 단위 테스트를 쓴다**

`src/components/journey/scene/frameStats.test.ts`에서 찾을 부분:

```ts
} from "three";
import { renderTargetBytes, sceneTextureBytes, textureBytes } from "./frameStats";

```

바꿀 내용:

```ts
} from "three";
import { BUSY_MAX_MS, busyFrom, renderTargetBytes, sceneTextureBytes, textureBytes } from "./frameStats";

```

`src/components/journey/scene/frameStats.test.ts` 끝에 붙인다:

```ts

describe("확인용 busy(2-4c)", () => {
  it("?debug=stats(또는 perf)일 때만 읽고, 500ms를 넘으면 500ms로 묶는다(만든 링크로 탭을 멈추지 못하게)", () => {
    expect(BUSY_MAX_MS).toBe(500);
    expect(busyFrom("?debug=stats&busy=50")).toBe(50);
    expect(busyFrom("?debug=perf&busy=300")).toBe(300);
    expect(busyFrom("?debug=stats&busy=100000")).toBe(500);
    expect(busyFrom("?busy=50")).toBe(0);
    expect(busyFrom("?debug=stats&busy=-5")).toBe(0);
    expect(busyFrom("?debug=stats&busy=abc")).toBe(0);
  });
});
```

`src/lib/journey/perfStats.test.ts`에서 찾을 부분:

```ts
import { describe, expect, it } from "vitest";
import { PERF_TARGET, meetsTarget, minuteSummaries, summarize } from "./perfStats";

```

바꿀 내용:

```ts
import { describe, expect, it } from "vitest";
import { PERF_TARGET, meetsTarget, minuteSummaries, perfOptions, summarize } from "./perfStats";

```

`src/lib/journey/perfStats.test.ts` 끝에 붙인다:

```ts

describe("측정 오버레이 쿼리(2-4c)", () => {
  it("perfSpeed·perfMinutes는 양수만 받고, 없거나 0·음수·숫자가 아니면 기본값(1화면/s, 5분)이다", () => {
    expect(perfOptions("")).toEqual({ speed: 1, minutes: 5 });
    expect(perfOptions("?perfSpeed=2&perfMinutes=1")).toEqual({ speed: 2, minutes: 1 });
    expect(perfOptions("?perfSpeed=0&perfMinutes=-3")).toEqual({ speed: 1, minutes: 5 });
    expect(perfOptions("?perfSpeed=abc&perfMinutes=")).toEqual({ speed: 1, minutes: 5 });
  });
});
```

- [ ] **Step 2: 단위 실패를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4 src/components/journey/scene/frameStats.test.ts src/lib/journey/perfStats.test.ts`
Expected: FAIL — `Tests  2 failed | 17 passed (19)`(`expected undefined to be 500`, `TypeError: perfOptions is not a function`)

- [ ] **Step 3: 실패하는 e2e를 쓴다**

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts
    "stable",
  ]);
});

```

바꿀 내용:

```ts
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

```

- [ ] **Step 4: e2e 실패를 확인한다**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`·`3000`은 무시)

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts -g "곧바로 그 저장소 카드|하이드레이션 전에 스크롤|블로그에서 헤더로 들어와도"` (Playwright가 매번 `next build`부터 한다. 2~6분)
Expected: FAIL — `6 failed`. 앱 해시: studio 카드에 `data-active`가 없다(`unexpected value "null"`). 하이드레이션 전 스크롤: 카드 위끝이 104가 아니다(`Received: -1700`, `-1994` 안팎). 블로그에서 들어오기: `Expected: false`, `Received: true`(본문이 들어온 직후 2D 표지가 없다)

- [ ] **Step 5: 다섯을 고친다**

`src/components/journey/portraitCards.ts`에서 찾을 부분:

```ts
import { getLenis } from "@/lib/journey/engine";
import { getJourneyMode, subscribeJourneyMode } from "@/lib/journey/journeyMode";
```

바꿀 내용:

```ts
import { getLenis } from "@/lib/journey/engine";
import { subscribeHash } from "@/lib/journey/hashStore";
import { getJourneyMode, subscribeJourneyMode } from "@/lib/journey/journeyMode";
```

`src/components/journey/portraitCards.ts`에서 찾을 부분:

```ts
    const unsubscribeMode = subscribeJourneyMode(update);
    window.addEventListener("resize", update);
    window.addEventListener("hashchange", update);
    main.addEventListener("focusin", onFocusIn);
```

바꿀 내용:

```ts
    const unsubscribeMode = subscribeJourneyMode(update);
    // 해시는 브라우저의 hashchange뿐 아니라 앱의 pushHash·replaceHash(상세 열기·탭)로도 바뀐다. PiCKCARE 앞줄이 해시를 따른다(2-4c)
    const unsubscribeHash = subscribeHash(update);
    window.addEventListener("resize", update);
    main.addEventListener("focusin", onFocusIn);
```

`src/components/journey/portraitCards.ts`에서 찾을 부분:

```ts
      unsubscribeMode();
      window.removeEventListener("resize", update);
      window.removeEventListener("hashchange", update);
      main.removeEventListener("focusin", onFocusIn);
```

바꿀 내용:

```ts
      unsubscribeMode();
      unsubscribeHash();
      window.removeEventListener("resize", update);
      main.removeEventListener("focusin", onFocusIn);
```

`src/components/journey/modeSwitch.ts`에서 찾을 부분:

```ts
  return top + progress * (main.offsetHeight - window.innerHeight);
}
```

바꿀 내용:

```ts
  return top + progress * (main.offsetHeight - window.innerHeight);
}

/** 지금 스크롤 위치의 진행률(scrollTopOf의 역). ScrollTrigger가 아직 없을 때(하이드레이션 직후)도 지금 배치에서 잰다 */
export function progressOf(main: HTMLElement): number {
  const top = main.getBoundingClientRect().top + window.scrollY;
  const span = main.offsetHeight - window.innerHeight;
  return span > 0 ? Math.min(1, Math.max(0, (window.scrollY - top) / span)) : 0;
}
```

`src/components/journey/JourneyStage.tsx`에서 찾을 부분:

```tsx
import dynamic from "next/dynamic";
import { useEffect, useSyncExternalStore } from "react";
import { fail, fitScreen, getJourneyMode, getServerJourneyMode, subscribeJourneyMode } from "@/lib/journey/journeyMode";
import { getSceneFailure, getSceneStatus, setCarStatus, setSceneStatus, subscribeSceneStatus } from "@/lib/journey/sceneStatus";
import { isShortLandscape, subscribeShortLandscape } from "@/lib/journey/screen";
import { useFlatReveal } from "./flatReveal";
import { useHologramFocus } from "./hologramLinks";
import { LAYOUT_EVENT, applyMode, currentCard } from "./modeSwitch";
import { ProgressRail } from "./ProgressRail";
```

바꿀 내용:

```tsx
import dynamic from "next/dynamic";
import { useEffect, useLayoutEffect, useSyncExternalStore } from "react";
import { fail, fitScreen, getJourneyMode, getServerJourneyMode, subscribeJourneyMode } from "@/lib/journey/journeyMode";
import { activeCard } from "@/lib/journey/portrait";
import { getSceneFailure, getSceneStatus, setCarStatus, setSceneStatus, subscribeSceneStatus } from "@/lib/journey/sceneStatus";
import { isShortLandscape, subscribeShortLandscape } from "@/lib/journey/screen";
import { useFlatReveal } from "./flatReveal";
import { useHologramFocus } from "./hologramLinks";
import { LAYOUT_EVENT, applyMode, currentCard, progressOf, scrollToCard } from "./modeSwitch";
import { ProgressRail } from "./ProgressRail";
```

`src/components/journey/JourneyStage.tsx`에서 찾을 부분:

```tsx
 * 스크립트가 걸지 못한 기기 단계 2D)는 배치가 바뀌었다고 알려 스크롤 엔진이 다시 재게 한다.
 */
function useModeAttributes(): void {
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const mode = getJourneyMode();
      const flat = mode.view === "2d";
      const changed = flat !== (root.dataset.journeyMode === "2d");
      if (flat) {
```

바꿀 내용:

```tsx
 * 스크립트가 걸지 못한 기기 단계 2D)는 배치가 바뀌었다고 알려 스크롤 엔진이 다시 재게 한다.
 * 2-4c: 그리기 전에 건다(useLayoutEffect). 블로그에서 헤더 링크로 들어오면(클라이언트 이동) 처음 그리기 스크립트가 돌지 않아 effect로는
 * 3D 배치가 한 프레임 보였다. 하이드레이션 때 처음 2D가 되는 기기가 그 전에 스크롤했으면, 바꾸기 전 3D 배치에서 보던 카드를 구해
 * 2D에서 그 카드로 맞춘다(그러지 않으면 같은 스크롤 위치에 다른 정류장이 보였다).
 */
function useModeAttributes(): void {
  useLayoutEffect(() => {
    const root = document.documentElement;
    let first = true;
    const apply = () => {
      const mode = getJourneyMode();
      const flat = mode.view === "2d";
      const changed = flat !== (root.dataset.journeyMode === "2d");
      const main = document.querySelector<HTMLElement>("[data-journey-page]");
      const keep =
        first && changed && flat && main && window.scrollY > 0 ? (activeCard(progressOf(main), window.location.hash) ?? "ending") : null;
      first = false;
      if (flat) {
```

`src/components/journey/JourneyStage.tsx`에서 찾을 부분:

```tsx
      if (changed) window.dispatchEvent(new Event(LAYOUT_EVENT));
    };
```

바꿀 내용:

```tsx
      if (changed) window.dispatchEvent(new Event(LAYOUT_EVENT));
      if (keep) scrollToCard(keep, "2d");
    };
```

`src/components/journey/scene/frameStats.ts`에서 찾을 부분:

```ts

/** 확인용 ?debug=stats(또는 perf)&busy=<ms>: 렌더 단계마다 그 시간만큼 일부러 끌어 실행 중 강등을 재현한다(2-4b). 없으면 0 */
export function busyMs(): number {
  if (!statsEnabled()) return 0;
  const busy = Number(new URLSearchParams(window.location.search).get("busy"));
  return Number.isFinite(busy) && busy > 0 ? busy : 0;
}
```

바꿀 내용:

```ts

/** 확인용 busy의 상한(ms). 만든 링크(?debug=stats&busy=100000)로 그 링크를 연 탭을 멈추지 못하게 한다(2-4c) */
export const BUSY_MAX_MS = 500;

/** 주소의 쿼리에서 확인용 busy를 읽는다. ?debug=stats(또는 perf)일 때만, 양수만, 상한까지 */
export function busyFrom(search: string): number {
  const params = new URLSearchParams(search);
  const debug = params.get("debug");
  if (debug !== "stats" && debug !== "perf") return 0;
  const busy = Number(params.get("busy"));
  return Number.isFinite(busy) && busy > 0 ? Math.min(busy, BUSY_MAX_MS) : 0;
}

/** 확인용 ?debug=stats(또는 perf)&busy=<ms>: 렌더 단계마다 그 시간만큼 일부러 끌어 실행 중 강등을 재현한다(2-4b). 없으면 0 */
export function busyMs(): number {
  return busyFrom(window.location.search);
}
```

`src/lib/journey/perfStats.ts` 끝에 붙인다:

```ts

/** 측정 오버레이의 확인용 쿼리(perfSpeed 초당 화면 수, perfMinutes 오래 돌리기 분). 양수만 받고 그 밖은 기본값(1, 5)이다(2-4c) */
export function perfOptions(search: string): { speed: number; minutes: number } {
  const params = new URLSearchParams(search);
  const positive = (name: string, fallback: number) => {
    const value = Number(params.get(name) || Number.NaN);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  };
  return { speed: positive("perfSpeed", 1), minutes: positive("perfMinutes", 5) };
}
```

`src/components/journey/PerfOverlay.tsx`에서 찾을 부분:

```tsx
import { detectTier } from "@/lib/journey/capability";
import { meetsTarget, minuteSummaries, summarize, type FrameSummary } from "@/lib/journey/perfStats";
import { scrollState } from "@/lib/journey/scrollState";
```

바꿀 내용:

```tsx
import { detectTier } from "@/lib/journey/capability";
import { meetsTarget, minuteSummaries, perfOptions, summarize, type FrameSummary } from "@/lib/journey/perfStats";
import { scrollState } from "@/lib/journey/scrollState";
```

`src/components/journey/PerfOverlay.tsx`에서 찾을 부분:

```tsx
function options(): { speed: number; minutes: number } {
  const params = new URLSearchParams(window.location.search);
  return { speed: Number(params.get("perfSpeed") ?? 1), minutes: Number(params.get("perfMinutes") ?? 5) };
}
```

바꿀 내용:

```tsx
function options(): { speed: number; minutes: number } {
  return perfOptions(window.location.search);
}
```

- [ ] **Step 6: 통과를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4 src/components/journey/scene/frameStats.test.ts src/lib/journey/perfStats.test.ts`
Expected: PASS — `Tests  19 passed (19)`

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`·`3000`은 무시)

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts -g "곧바로 그 저장소 카드|하이드레이션 전에 스크롤|블로그에서 헤더로 들어와도"` (Playwright가 매번 `next build`부터 한다. 2~6분)
Expected: PASS — `6 passed`

해시 구독과 표지 시점을 바꿨으므로 포커스 복귀·공유 주소·처음 그리기·짧은 가로 테스트를 함께 본다.

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts -g "옆 저장소 홀로그램|키보드로 연 상세|공유 주소|헤더의 Journey|2D 표지|처음 그리기|짧은 가로"` (Playwright가 매번 `next build`부터 한다. 2~6분)
Expected: 실패 0

- [ ] **Step 7: 전체 확인**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`·`3000`은 무시)

Run: `rtk proxy npx tsc --noEmit` → exit 0
Run: `rtk proxy npx vitest run --maxWorkers=4` → `Tests  435 passed (435)`
Run: `rtk proxy npx eslint src/components/journey/portraitCards.ts src/components/journey/modeSwitch.ts src/components/journey/JourneyStage.tsx src/components/journey/scene/frameStats.ts src/components/journey/scene/frameStats.test.ts src/lib/journey/perfStats.ts src/lib/journey/perfStats.test.ts src/components/journey/PerfOverlay.tsx e2e/journey.e2e.ts` → exit 0, 문제 0(`baseline-browser-mapping` 안내 한 줄은 린트 결과가 아니다)

- [ ] **Step 8: 커밋 정리를 제출한다**

파일별 변경 표와 메시지 초안. 초안 예:

```
fix: 여정 고정 카드의 해시 반영, 2D 기기 첫 스크롤, 그리기 전 2D 표지, busy·perfSpeed 값 검사

- 고정 카드가 앱의 pushHash·replaceHash도 따르고, 하이드레이션 전에 스크롤한 2D 기기는 보던 카드로 맞춘다
- <html> 표지를 그리기 전에 걸어 블로그에서 헤더로 들어와도 첫 그림부터 2D다
- 확인용 busy는 500ms로 묶고 perfSpeed·perfMinutes는 양수만 받는다
```

---

### Task 6: e2e 흔들림("캔버스는 여정 장면 하나뿐이다")과 회전 e2e 보강

스펙 10절의 흔들림과 2-4a에서 넘긴 "회전 e2e가 렌즈만 봄"이다. 흔들린 테스트는 장면 캔버스가 막 붙은 순간에 End를 눌렀다. 원인은 확정하지 못했다(계획 머리말 5). 이 테스트의 목적은 캔버스 수와 오류이므로 끝으로 바로 스크롤한다(End 키 동작은 "End 키로 엔딩에 닿고…"가 따로 본다). 회전 e2e는 세로 화면의 한 정류장에서 가로로 돌렸다가 다시 세웠을 때 렌즈뿐 아니라 카드 고정 여부, 지금 카드, 정류장 홀로그램의 자리(헤더 아래·화면 위 60% 안)까지 본다.

**Files:**
- Modify: `e2e/journey.e2e.ts`

**Interfaces:**
- Consumes: e2e 도우미 `scrollToProgress`·`settleAt`·`middleOf`·`readStats`
- Produces: 없음

- [ ] **Step 1: 두 테스트를 고친다**

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts
  await expect(page.locator("canvas")).toHaveCount(1);
  await page.keyboard.press("End");
  await expect(page.getByText(EMAIL)).toBeInViewport();
```

바꿀 내용:

```ts
  await expect(page.locator("canvas")).toHaveCount(1);
  // 이 테스트는 캔버스 수와 오류를 본다. End 키로 끝까지 가면 드물게 반영되지 않아 흔들렸다(메모리 압박에서 12번 중 10번, 캐시가 빈 첫 실행에서
  // 20번 중 1번, 2-4b 전 빌드도 같음. CPU를 20배 느리게 해도 재현되지 않아 원인은 확정하지 못했다, 스펙 10절). End 키 동작은
  // "End 키로 엔딩에 닿고…"가 따로 보므로 여기서는 끝으로 바로 스크롤한다(2-4c)
  await scrollToProgress(page, 1);
  await expect(page.getByText(EMAIL)).toBeInViewport();
```

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts

  test("화면을 가로로 돌리면 가로 렌즈로, 다시 세우면 세로 렌즈로 바뀐다", async ({ page }) => {
    await page.goto("/journey?debug=stats");
    await waitReady(page);
    await expect.poll(async () => (await readStats(page)).lens).toEqual({ fov: 58, center: 0.29 });
    await page.setViewportSize({ width: 844, height: 390 });
    await expect.poll(async () => (await readStats(page)).lens).toEqual({ fov: 50, center: 0.5 });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect.poll(async () => (await readStats(page)).lens).toEqual({ fov: 58, center: 0.29 });
  });
```

바꿀 내용:

```ts

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
```

- [ ] **Step 2: 흔들림은 실패를 미리 볼 수 없다**

흔들림은 기계 상태에 따라 나타난다(2-4b 최종 확인 때 메모리 압박에서 12번 중 10번, 계획 작성 때 캐시가 빈 첫 실행에서 20번 중 1번). 그래서 고치기 전 실패를 이 단계에서 재현할 수 없다. 고친 뒤 10번 반복 통과로 확인한다. 회전 테스트는 넓힌 확인이 지금 동작을 묶는 것이라 고치기 전에도 통과한다.

- [ ] **Step 3: 통과를 확인한다**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`·`3000`은 무시)

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts -g "가로 렌즈·스크롤 카드"` (Playwright가 매번 `next build`부터 한다. 2~6분)
Expected: PASS — `2 passed`

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts -g "캔버스는 여정 장면 하나뿐이다|End 키로 엔딩에 닿고" --repeat-each=10` (Playwright가 매번 `next build`부터 한다. 2~6분)
Expected: PASS — `40 passed`(두 테스트 × 두 크기 × 10번. End 전용 테스트도 흔들리지 않는다)

- [ ] **Step 4: 전체 확인**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`·`3000`은 무시)

Run: `rtk proxy npx tsc --noEmit` → exit 0
Run: `rtk proxy npx vitest run --maxWorkers=4` → `Tests  435 passed (435)`
Run: `rtk proxy npx eslint e2e/journey.e2e.ts` → exit 0, 문제 0(`baseline-browser-mapping` 안내 한 줄은 린트 결과가 아니다)

- [ ] **Step 5: 커밋 정리를 제출한다**

파일별 변경 표와 메시지 초안. 초안 예:

```
test: 여정 캔버스 테스트의 흔들림을 없애고 회전 e2e를 카드·구도까지 넓힘

- 캔버스 수와 오류를 보는 테스트가 장면이 막 붙은 순간에 End를 눌러 드물게 끝에 닿지 못했다(원인 미확정). 끝으로 바로 스크롤한다
- 세로 화면에서 가로로 돌렸다 세우면 고정 카드·지금 카드·정류장 홀로그램 자리가 그대로인지 본다
```

---

### Task 7: 차 모델 디코더의 Apache-2.0 고지

스펙 10절 "2-4로 넘긴 다듬기"의 고지다. 차 모델 디코더는 three.js가 함께 배포하는 Draco(`examples/jsm/libs/draco/gltf`)와 Basis Universal(`examples/jsm/libs/basis`) 빌드를 그대로 옮긴 것이고 둘 다 Apache-2.0이다. 디코더 폴더에 두 라이브러리의 저작권 문구와 Apache-2.0 전문을 담은 `LICENSE.txt`를 두고(전문은 node_modules의 TypeScript `LICENSE.txt`에 있는 Apache-2.0 원문을 쓴다), 엔딩 출처 목록에 "차 모델 디코더: Draco, Basis Universal, Apache-2.0" 한 줄을 더한다(설명 문장이 아니라 출처 표기다). 3막 가로선은 원인만 찾고 고치지 않는다(계획 머리말 6).

**Files:**
- Modify: `e2e/journey.e2e.ts`, `src/components/journey/JourneyContent.tsx`
- Create(Step 3의 명령이 만든다): `public/journey/decoders/LICENSE.txt`

**Interfaces:**
- Consumes: 없음
- Produces: `public/journey/decoders/LICENSE.txt`, 엔딩의 링크 "Apache-2.0"(`/journey/decoders/LICENSE.txt`)

- [ ] **Step 1: 실패하는 e2e를 쓴다**

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts
  await expect(page.locator("#stop-ending a[href='https://creativecommons.org/licenses/by/4.0/']")).toHaveText("CC BY 4.0");
});
```

바꿀 내용:

```ts
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
```

- [ ] **Step 2: e2e 실패를 확인한다**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`·`3000`은 무시)

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts -g "Apache-2.0 고지"` (Playwright가 매번 `next build`부터 한다. 2~6분)
Expected: FAIL — `2 failed`(`Error: element(s) not found`, 링크 "Apache-2.0"이 없다)

- [ ] **Step 3: 라이선스 파일을 만든다**

디코더 폴더에 저작권 문구 열네 줄과 Apache-2.0 전문을 붙인다(작업 트리 루트에서).

Run: `rtk proxy bash -c '{ printf "%s\n" "Third-party decoders in this folder" "" "draco/draco_decoder.wasm, draco/draco_wasm_wrapper.js" "  Draco 3D Data Compression - Copyright The Draco Authors (Google LLC)" "  https://github.com/google/draco" "" "basis/basis_transcoder.js, basis/basis_transcoder.wasm" "  Basis Universal - Copyright Binomial LLC" "  https://github.com/BinomialLLC/basis_universal" "" "Both are copied unmodified from three.js (examples/jsm/libs) and are licensed under the Apache License, Version 2.0." "The full text of the license follows." "" ""; cat node_modules/typescript/LICENSE.txt; }' > public/journey/decoders/LICENSE.txt`
Expected: exit 0. 첫 줄 `Third-party decoders in this folder`, 끝 줄 `END OF TERMS AND CONDITIONS`(`rtk proxy head -3`·`rtk proxy tail -n 1`로 본다)

- [ ] **Step 4: 엔딩 출처에 한 줄을 더한다**

`src/components/journey/JourneyContent.tsx`에서 찾을 부분:

```tsx
          , 로고 제거·재질 수정
        </p>
```

바꿀 내용:

```tsx
          , 로고 제거·재질 수정
          <br />
          차 모델 디코더:{" "}
          <a href="https://github.com/google/draco" target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
            Draco
          </a>
          ,{" "}
          <a href="https://github.com/BinomialLLC/basis_universal" target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
            Basis Universal
          </a>
          ,{" "}
          <a href="/journey/decoders/LICENSE.txt" target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
            Apache-2.0
          </a>
        </p>
```

- [ ] **Step 5: e2e 통과를 확인한다**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`·`3000`은 무시)

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts -g "Apache-2.0 고지|출처"` (Playwright가 매번 `next build`부터 한다. 2~6분)
Expected: PASS — `7 passed`, `1 skipped`(휴대폰 크기에서 원래 건너뛰는 출처 테스트 하나)

엔딩 패널이 한 줄 늘었으므로 엔딩·연락처 테스트를 함께 본다.

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts -g "엔딩|연락처"` (Playwright가 매번 `next build`부터 한다. 2~6분)
Expected: `26 passed`, `4 skipped`(건너뛰기는 원래 있던 것)

- [ ] **Step 6: 전체 확인**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`·`3000`은 무시)

Run: `rtk proxy npx tsc --noEmit` → exit 0
Run: `rtk proxy npx vitest run --maxWorkers=4` → `Tests  435 passed (435)`
Run: `rtk proxy npx eslint src/components/journey/JourneyContent.tsx e2e/journey.e2e.ts` → exit 0, 문제 0(`baseline-browser-mapping` 안내 한 줄은 린트 결과가 아니다)

- [ ] **Step 7: 커밋 정리를 제출한다**

파일별 변경 표와 메시지 초안. 초안 예:

```
docs: 여정 차 모델 디코더(Draco·Basis Universal)의 Apache-2.0 고지

- 디코더 폴더에 저작권 문구와 Apache-2.0 전문을 두고 엔딩 출처에 한 줄을 더한다
```

---

### Task 8: 최종 확인, 스펙 기록, PR #3 정리

스펙 1절 2-4c 완료 조건을 최종 구현에서 확인하고 숫자와 캡처를 남긴다. 휴대폰은 병합 전이라 실측하지 않고 맥의 창 없는 에뮬레이션으로 본다(사용자 결정, 실측은 Task 9). 마지막에 PR #3의 제목과 본문을 여정 전체에 맞게 고친다. 병합은 사용자가 한다.

**Files:**
- Modify: `docs/superpowers/specs/2026-10-14-journey-design.md`(1절 표, 7절 2-4c 최종, 10절)

- [ ] **Step 1: 전체 확인**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`·`3000`은 무시)

Run: `rtk proxy npx tsc --noEmit` → exit 0
Run: `rtk proxy npx vitest run --maxWorkers=4` → `Tests  435 passed (435)`
Run: `rtk proxy npx eslint .` → 이 계획 전과 같은 기존 문제만 남는다(28개, 오류 6: `Background3D.tsx` 3, `about/page.tsx` 2, `blog/[slug]/page.tsx` 1). 이 계획이 바꾼 파일에는 문제가 없다. 작업 공간(`.superpowers/`)에 `.cjs` 스크립트를 두면 `require` 오류가 하나 늘어나므로 스크립트는 작업 트리 밖에 둔다
Run: `rtk proxy npx playwright test` (27분 남짓) → `290 passed`, `10 skipped`(전 2-4b 최종 237 통과·1 흔들림·10 건너뜀. 새 테스트 26개 × 두 크기). 흔들림 0이어야 한다. 실패가 있으면 그 테스트만 `--repeat-each=10`으로 다시 돌려 흔들림인지 결함인지 가른 뒤 멈추고 보고한다

- [ ] **Step 2: 데스크톱 회귀 캡처(2-4b와 같은가)**

시작 전 코드(`2ef9ec8`, 2-4b 최종과 코드가 같다)를 작업 트리와 따로 꺼내 기준을 찍는다(git 상태는 바꾸지 않는다).

```bash
BASE_DIR=$(mktemp -d)/base && mkdir -p "${BASE_DIR}"
rtk proxy git archive 2ef9ec8 | tar -x -C "${BASE_DIR}"
rtk proxy cp -cR node_modules "${BASE_DIR}/node_modules" && cp .env.local "${BASE_DIR}/.env.local"
(cd "${BASE_DIR}" && rtk proxy npx next build)
```

`(cd "${BASE_DIR}" && rtk proxy npx next start -H 127.0.0.1 --port 3201)`(다른 터미널)과 이 작업 트리의 `rtk proxy npx next build && rtk proxy npx next start -H 127.0.0.1 --port 3200`(다른 터미널)을 띄운 뒤 같은 풍경 묶음을 창 없이 찍는다.

Run: `CAPTURE_SET=landscape CAPTURE_HEADLESS=1 CAPTURE_URL="http://127.0.0.1:3201/journey?debug=stats" CAPTURE_NAME=2-4c-desktop-base rtk proxy npm run capture:journey`
Run: `CAPTURE_SET=landscape CAPTURE_HEADLESS=1 CAPTURE_URL="http://127.0.0.1:3200/journey?debug=stats" CAPTURE_NAME=2-4c-desktop rtk proxy npm run capture:journey`

두 폴더를 장면마다 비교한다(휘도 차이 3 넘는 화소의 비율). 오른쪽 진행 막대는 이 계획이 "2D" 버튼의 누르는 자리를 키워 막대가 길어졌으므로 오른쪽 80px을 빼고 비교한다. 아래 두 스크립트를 작업 트리 밖(`${BASE_DIR}/..`)에 `diff-captures.cjs`·`diff-outside.cjs`로 둔다.

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

```js
const { createRequire } = require("node:module");
const sharp = createRequire(`${process.cwd()}/package.json`)("sharp");
const [a, b, x0, y0, x1, y1] = process.argv.slice(2);
(async () => {
  const A = await sharp(a).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const B = await sharp(b).removeAlpha().raw().toBuffer();
  const { width } = A.info;
  let changed = 0, counted = 0;
  for (let p = 0, i = 0; i < B.length; i += 3, p++) {
    const x = p % width, y = Math.floor(p / width);
    if (x >= width - 80 || (x >= +x0 && x <= +x1 && y >= +y0 && y <= +y1)) continue;
    counted++;
    const d = 0.2126 * (B[i] - A.data[i]) + 0.7152 * (B[i + 1] - A.data[i + 1]) + 0.0722 * (B[i + 2] - A.data[i + 2]);
    if (Math.abs(d) > 3) changed++;
  }
  console.log(`패널(${x0},${y0}~${x1},${y1})과 오른쪽 80px 밖: ${((100 * changed) / counted).toFixed(2)}%`);
})();
```

Run: `node <diff-captures.cjs> test-results/journey-captures/2-4c-desktop-base test-results/journey-captures/2-4c-desktop 80`
Expected: 01~11장면 모두 0.05% 이하(사본에서는 0.01% 이하였다). `12-ending.png`는 연락처 패널 출처에 디코더 한 줄이 늘어 패널이 위로 자라 3% 안팎(사본 3.17%)이 바뀐다.

Run: `node <diff-outside.cjs> test-results/journey-captures/2-4c-desktop-base/12-ending.png test-results/journey-captures/2-4c-desktop/12-ending.png 890 290 1350 815`
Expected: 패널 밖은 0.05% 이하(사본 0.04%). 두 `12-ending.png`를 Read로 열어 패널 안 마지막 줄 "차 모델 디코더: Draco, Basis Universal, Apache-2.0" 말고 같은지 본다. 넘는 장면이 있으면 두 장을 열어 무엇이 다른지 보고 멈춘다. 3201 서버는 `lsof -t -iTCP:3201 -sTCP:LISTEN`으로 찾은 PID만 끄고 `${BASE_DIR}`을 지운다.

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

Expected: `phone 5.1 화면`, `desktop 4.4 화면`(2-4b와 같다). 두 `sheet.png`를 Read로 열어 막 탭·왼쪽 선·카드·엔딩이 2-4b와 같고 엔딩 출처에 한 줄이 늘었는지 본다.

- [ ] **Step 4: 휴대폰 에뮬레이션(실측 아님, 세로·가로)**

3200 서버에서 아래 두 스크립트를 작업 트리 밖에 `emu-flat.cjs`(세로, 2-4b와 같다)·`emu-24c.cjs`(가로와 회전)로 두고 `node <그 경로>`로 돌린다(WebKit 아이폰 14, Chromium Pixel 7 터치, 창 없음).

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

Expected(두 기기 같다): `start` `["3d","","lite"]`, `flat` `["2d","manual","lite"]`, `tabs` `true`, `back` `["3d","","lite"]`, `slow` `["2d","slow","min"]`, `notice` `"기기에 맞춰 2D로 바꿨어요"`, `errors` `[]`.

```js
const { createRequire } = require("node:module");
const { webkit, chromium, devices } = createRequire(`${process.cwd()}/package.json`)("@playwright/test");
const BASE = "http://127.0.0.1:3200";
const ready = (page) => page.waitForFunction(() => document.querySelector("[data-journey-scene]")?.getAttribute("data-state") === "ready", null, { timeout: 60000 });
const mode = (page) =>
  page.evaluate(() => [document.documentElement.dataset.journeyMode ?? "3d", document.documentElement.dataset.journeyReason ?? "", window.__journeyStats?.quality?.level ?? null]);
(async () => {
  for (const [name, type, device, launch] of [
    ["iphone", webkit, "iPhone 14", {}],
    ["android", chromium, "Pixel 7", { channel: "chromium", args: ["--ignore-gpu-blocklist"] }],
  ]) {
    const browser = await type.launch({ headless: true, ...launch });
    const portrait = devices[device];
    const landscape = devices[`${device} landscape`];
    const page = await (await browser.newContext({ ...landscape })).newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    // 가로로 연다: 짧은 가로 화면이라 2D(이유: 화면), 막 탭이 있고 3D로 보기가 없다
    await page.goto(`${BASE}/journey?debug=stats`);
    await page.waitForFunction(() => document.documentElement.dataset.journeyMode === "2d", null, { timeout: 30000 });
    const opened = await mode(page);
    const tabs = await page.getByRole("navigation", { name: "여정 막" }).isVisible();
    const toggle3d = await page.getByRole("button", { name: "3D로 보기" }).count();
    const headerOneLine = await page.locator("[data-site-header] nav").evaluate((nav) => nav.scrollWidth - nav.clientWidth <= 0);
    // 세로로 돌린다: 3D(경량)로 돌아온다
    await page.setViewportSize(portrait.viewport);
    await ready(page);
    const rotated = await mode(page);
    // 다시 가로로: 2D(화면)
    await page.setViewportSize(landscape.viewport);
    await page.waitForFunction(() => document.documentElement.dataset.journeyMode === "2d", null, { timeout: 30000 });
    const back = await mode(page);
    console.log(
      name,
      JSON.stringify({ landscape: landscape.viewport, opened, tabs, toggle3d, headerOneLine, portrait: portrait.viewport, rotated, back, errors }),
    );
    await browser.close();
  }
})();
```

Expected: 아이폰 `landscape` `{"width":750,"height":340}`, Pixel 7 `{"width":863,"height":360}`에서 `opened` `["2d","screen",null]`(장면을 띄우지 않아 품질 통계가 없다), `tabs` `true`, `toggle3d` `0`, `headerOneLine` `true`, 세로(`390×664`, `412×839`)로 돌리면 `rotated` `["3d","","lite"]`, 다시 가로로 `back` `["2d","screen","lite"]`, `errors` `[]`. 서버는 `lsof -t -iTCP:3200 -sTCP:LISTEN`으로 찾은 PID만 끈다.

- [ ] **Step 5: 홀로그램 색과 데스크톱 성능**

Run: `CHECK_HEADLESS=1 CHECK_URL="http://127.0.0.1:3200/journey" rtk proxy npm run check:holograms`(3200 서버를 다시 띄운다) → ① 11장 ΔE 0, ③ 16개 통과(가장 큰 평균 1.44, 2-4b와 같다)

`perf:journey`는 실제 Chrome 창을 띄운다. 돌리기 전에 사용자에게 "성능 측정으로 Chrome 창이 잠깐 뜹니다"라고 알린다.

Run: `PERF_URL="http://127.0.0.1:3200/journey" rtk proxy npm run perf:journey` → 3회 모두 50ms 초과 0, 가장 무거운 프레임 드로콜 50, 프로그램 준비 때 = 끝(31 → 31), 텍스처 58.8MiB. 주사율과 함께 적고 2-4b 최종(60Hz 평균 16.67·p95 17.6·p99 17.6ms)과 비교한다(주사율이 다르면 프레임 시간은 직접 비교하지 않는다)

- [ ] **Step 6: 개발 서버**

2-4b와 같은 점검이다. 아래 스크립트를 작업 트리 밖에 `dev-check.cjs`로 둔다.

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
Run: `node <dev-check.cjs 경로>` → `state: ready loading: ready`, `canvases: 1`, `errors: []`

개발 서버는 `lsof -t -iTCP:3102 -sTCP:LISTEN`으로 찾은 PID만 끈다.

- [ ] **Step 7: 스펙에 완료와 숫자를 적는다**

- 1절 단계 표의 `| 2-4c 접근성·마감·병합 |`를 `| 2-4c 접근성·마감·병합 (완료, 병합 전) |`로 바꾼다(병합 뒤 Task 9에서 "(완료)"로 고친다)
- 7절 "2-4b 최종" 아래에 "2-4c 최종(병합 전)"으로 Step 1(단위·e2e 수, axe 위반 0), Step 2(데스크톱 풍경 12장면, 진행 막대와 엔딩 패널을 뺀 차이), Step 3(2D 문서 높이), Step 4(에뮬레이션 세로·가로, 실측과 섞지 않는다), Step 5(홀로그램 색·데스크톱 성능, 주사율과 함께)를 적는다
- 10절: 2-4c에서 다룬 항목(2-4a에서 넘긴 여섯, 2-4b 미룬 여덟, 아주 느린 기기, 휴대폰 가로, e2e 흔들림)을 닫고, 3막 가로선(원인과 선택지, 계획 머리말 6)과 End 키 흔들림의 원인 조사(계획 머리말 5)를 남긴다

- [ ] **Step 8: PR #3 제목과 본문을 고친다**

PR #3(`feature/journey-phase1` → `main`)의 제목과 본문은 2026-10-14의 첫 작업(블로그 글 데이터화)만 말한다. 이 브랜치의 여정 전체에 맞게 고친다. 본문은 작업 트리 밖에 `pr-body.md`로 쓴다(Step 1~6의 숫자를 넣는다):

```markdown
## 개요

이직용 포트폴리오 페이지 `/journey`(스페이스 드라이브)를 더합니다. 블로그 프로젝트 7개를 우주에 뜬 빛의 길을 달리는 차의 여정으로 보여 주고, 휴대폰·2D·키보드에서도 같은 정보와 탐색을 씁니다. 그 바탕으로 블로그 프로젝트 글 7개를 데이터 기반으로 바꿨습니다.

## 단계

- 1단계: 블로그 프로젝트 글 7개를 데이터 기반 렌더링으로 전환(Playwright 회귀 테스트로 전후 화면이 같음을 확인)
- 2-1 골격 · 2-2 시각 언어 · 2-2b 길·차·궤적·카메라
- 2-3a 제품 화면 홀로그램과 클릭 · 2-3b 막별 풍경
- 2-4a 휴대폰 3D · 2-4b 강등과 2D 안전망 · 2-4c 접근성·마감

설계: `docs/superpowers/specs/2026-10-14-journey-design.md`, 단계별 계획: `docs/superpowers/plans/`

## 확인(병합 전)

- 단위 435, e2e 290 통과·10 건너뜀, 타입 검사, eslint(기존 문제 외 0)
- 접근성(axe, WCAG 2.1 A·AA): 3D·2D·상세 열린 상태·360px 헤더 위반 0
- 데스크톱 성능(perf:journey, <주사율>Hz): 50ms 초과 0, 드로콜 50, 텍스처 58.8MiB
- 휴대폰은 에뮬레이션(아이폰 14·Pixel 7, 세로·가로)으로 확인했고, 실기기는 병합 뒤 실제 사이트에서 확인합니다

## 병합 뒤

- 실제 사이트(https://docs-by-junhyun.vercel.app/journey)를 아이폰·안드로이드로 열어 주요 장면과 `?debug=perf` 숫자를 기록합니다
- 알려진 것: 3막 제목 장면의 떠 있는 짧은 가로선(먼 홀로그램의 바닥 원반, 원인 확인. 병합 뒤 원반이 나타나는 규칙을 정해 고침), End 키 흔들림의 원인 조사(테스트는 고침)
```

`<주사율>` 자리는 Step 5에서 잰 주사율로 바꿔 쓴다(본문을 보내기 전에 남은 꺾쇠가 없어야 한다).

Run: `rtk proxy gh pr edit 3 --title "여정(/journey) 3D 포트폴리오와 블로그 프로젝트 글 데이터화" --body-file <pr-body.md 경로>`
Run: `rtk proxy gh pr view 3 --json title,state,baseRefName --jq '[.title,.state,.baseRefName]'`
Expected: `["여정(/journey) 3D 포트폴리오와 블로그 프로젝트 글 데이터화","OPEN","main"]`. 병합·push는 하지 않는다(사용자가 한다)

- [ ] **Step 9: 완료 보고와 커밋 정리를 제출한다**

완료 보고에 Step 1~6의 숫자와 2D 캡처·가로 화면을 남기고, 태스크별 파일 표와 메시지 초안을 낸다. 마지막에 사용자에게 "커밋한 뒤 PR #3을 머지 커밋으로 병합해 주시면 Task 9(실제 사이트 확인)를 이어 하겠다"고 알린다. 이 태스크의 초안 예:

```
docs: 여정 2-4c 완료 기록(병합 전)

- 2-4c 완료 조건(접근성 위반 0, 짧은 가로 2D, 아주 느린 기기 강등, 넘긴 결함, 흔들림 정리, 회귀 없음)을 최종 구현에서 확인했다
- 데스크톱 회귀·2D 문서 높이·휴대폰 세로·가로 에뮬레이션(실측 아님)·성능 숫자를 적고, 3막 가로선과 End 키 흔들림의 원인 조사를 남겼다
```

---

### Task 9: 병합 뒤 실제 사이트 확인(실기기)

사용자가 PR #3을 병합하면 Vercel이 main을 공개 사이트(`https://docs-by-junhyun.vercel.app`)에 배포한다. 스펙 1절의 "앞 단계의 테스트만으로 최종 완료를 선언하지 않는다"를 여기서 채운다. 휴대폰 측정은 사용자가 하고, 에이전트는 확인 목록을 주고 결과를 기록한다(실측과 에뮬레이션을 섞지 않는다).

**Files:**
- Modify: `docs/superpowers/specs/2026-10-14-journey-design.md`(1절 표, 7절 2-4c 병합 뒤 실기기)

- [ ] **Step 1: 배포를 확인한다**

Run: `rtk proxy curl -sI https://docs-by-junhyun.vercel.app/journey`
Expected: `HTTP/2 200`(병합 전에는 404였다). 404면 Vercel 배포가 끝날 때까지 기다렸다 다시 본다(1분 간격, 10분 넘으면 사용자에게 알린다)

- [ ] **Step 2: 사용자에게 확인 목록을 준다**

아이폰(Safari)과 안드로이드(Chrome)에서 각각 아래를 보고 화면 캡처와 숫자를 보내 달라고 한다.

1. 세로로 `https://docs-by-junhyun.vercel.app/journey` 열기: 첫 화면(입구 카드가 아래, 진행 막대가 헤더 아래), 1막 → 2막 → PiCKCARE → 엔딩까지 스크롤, 정류장마다 홀로그램과 아래 카드가 겹치지 않는지
2. 홀로그램이나 "자세히 보기"로 상세를 열고 닫기
3. 가로로 돌리기: 2D 세로 타임라인과 막 탭으로 바뀌는지, 다시 세로로 돌리면 3D로 돌아오는지
4. 진행 막대 끝 "2D"(2D로 보기)와 막 탭 끝 "3D로 보기"
5. `https://docs-by-junhyun.vercel.app/journey?debug=perf`에서 측정을 눌러 3회 결과(JSON 복사)를 보낸다. 기종과 브라우저는 오버레이에 나온다
6. (있으면) Windows 노트북의 Chrome에서 상세를 열 때 본문이 옆으로 밀리지 않는지(계획 머리말 4)

- [ ] **Step 3: 결과를 스펙에 적는다**

- 7절 "2-4c 최종(병합 전)" 아래에 "2-4c 병합 뒤 실기기"로 기기·브라우저·주사율, 3회 p95·p99, 50ms 초과, 보인 문제를 적는다. 휴대폰 기준(3회 p95 ≤ 33.4ms·p99 ≤ 50.1ms, 스펙 7절)과 비교한다
- 1절 단계 표를 `| 2-4c 접근성·마감·병합 (완료) |`로 바꾼다
- 문제가 있으면 10절에 적고, 고칠 일은 새 작업으로 넘긴다(이 계획 안에서 고치지 않는다)

- [ ] **Step 4: 커밋 정리를 제출한다**

```
docs: 여정 2-4c 병합 뒤 실기기 확인 기록

- 공개 사이트를 아이폰·안드로이드로 확인한 화면과 측정 숫자(실측)를 적었다
```
