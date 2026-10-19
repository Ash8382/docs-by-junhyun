# 여정(Journey) 2-4a 구현 계획 — 휴대폰 3D

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 휴대폰으로 여는 채용 담당자가 3D 여정을 의도한 구도로, 30fps 이상으로 본다. 기기 단계를 판별해 휴대폰·태블릿은 3D 경량(해상도 배율 1.5, 은하 2048, 줄인 블룸)으로 그리고, 세로 화면에서는 세계 속 자리와 가로 화면 카메라를 그대로 둔 채 세로 화면 카메라와 아래 고정 카드로 화면 위 60%에 차와 홀로그램, 아래 40%에 본문 카드를 둔다. 헤더와 진행 막대를 세로 화면에 맞추고, `?debug=perf` 오버레이로 아이폰·안드로이드 실기기에서 잰다.

**Architecture:** three를 쓰지 않는 순수 모듈이 넷이다.
- `lib/journey/capability.ts`: 기기 단계 판정(`tierOf`), 확인용 덮어쓰기(`?debug=stats|perf&tier=`), 단계별 품질(`QUALITY`), 페이지를 열 때 한 번 읽는 `detectTier`.
- `lib/journey/lens.ts`: 렌즈(세로 시야각·투영 중심), 가로·세로 화면 판정, 렌즈를 넣은 화면 투영.
- `lib/journey/portrait.ts`: 세로 화면 카메라(목표·상태·감쇠, 정류장 구도)와 아래 고정 카드 고르기(`activeCard`, `cardProgress`).
- `lib/journey/perfStats.ts`: 프레임 시간 요약, 2-4a 휴대폰 기준 판정, 1분 묶음.

장면과 본문 쪽 구성은 다음과 같다.
- `JourneyStage`가 기기 단계로 3D를 띄울지 정하고(2D면 장면 청크·은하·차를 받지 않는다), 세로 화면 카드(`portraitCards.ts`)와 `?debug=perf` 오버레이(`PerfOverlay.tsx`, 그 쿼리일 때만 내려받는다)를 건다.
- 장면은 단계별 품질로 해상도 배율 상한(`Scene`), 은하(`Sky`), 블룸(`Effects`: 컴포저에서 블룸을 찾아 휘도 패스 해상도를 줄인다)을 정한다. `CameraRig`는 화면 비율로 렌즈(`fov`, `setViewOffset`)를 걸고 세로면 `followPortrait`를 따라간다.
- 아래 고정 카드는 본문(`<main>`)의 `data-journey-cards="fixed"`와 카드의 `data-active`로만 바꾸고(React 렌더 없음), 모양은 `globals.css`가 정한다. 가로 화면·2D·3D 실패에서는 지금 배치 그대로다.
- `?debug=stats`는 기기 단계·실제 해상도 배율·은하 폭·블룸 값·렌즈와 후처리 렌더 타깃 메모리 추정을 더 낸다.

**계획을 쓰며 확인한 것(사본 구현과 검증):**
- 이 계획의 코드는 HEAD(`267213b`, 스펙 4차 개정)에 태스크마다 커밋하며 구현했다(사본 `scratchpad/v24a` 브랜치 `plan`). 이 계획의 "찾을 부분 → 바꿀 내용"을 기준 상태에 차례로 적용하면 각 태스크의 결과와 글자 하나까지 같아진다. 생성기로 확인했다.
- 실패 단계의 기대 출력은 직전 태스크의 코드에 그 태스크의 테스트만 얹어 실제로 돌린 결과다.
- 통과한 검사: 단위 408개(전 383, 태스크별 388 → 392 → 403 → 403 → 403 → 403 → 407 → 408), 타입 검사, 바꾼 파일 eslint 오류·경고 0, e2e 176 통과·6 건너뜀(전 129·9. 새 테스트 44개, mobile에서 다시 켠 셋), 블로그 화면 비교 14개(모바일 첫 조각 기준 갱신 뒤).
- 데스크톱 회귀: 풍경 12장면(1440×900, 창 없이)이 2-3b 완료 빌드와 장면마다 0.02% 이하로 같다(별 먼지·도로 끝 노이즈).
- 세로 화면(390×844, 단위 투영): 정류장 읽기 자리 전체에서 홀로그램 y 0.13~0.33, 차 y 0.33~0.53이다(헤더·진행 막대 아래끝 0.095, 기준 0.60). 빠른 스크롤 시뮬레이션(60·120Hz)에서 차 가운데 벗어남은 최대 0.27, 차 높이는 최대 0.29다.
- 세로 화면 캡처(390×844, 창 없이 15장면, 경량 포함): 홀로그램이 위, 차가 그 아래, 지금 카드 하나가 아래에 있다. 헤더는 한 줄이고 진행 막대는 헤더 아래 가로다. PFPlay 끝 전환에서 차가 화면을 채우지 않는다.
- 후처리 렌더 타깃 메모리(`?debug=stats`): 3D 전체 1440×900 배율 2에서 254.0MiB, 3D 경량 390×844 배율 1.5에서 32.3MiB. 경량 텍스처 추정은 34.8MiB다.
- 전체 e2e를 처음 돌렸을 때 데스크톱 "3D 장면이 셰이더를 미리 컴파일하고 드러나면 로딩 막대가 사라진다"가 한 번 실패했다(End 키 뒤 5초 안에 연락처가 화면에 들지 않았다). 그 테스트만 4번씩(데스크톱·모바일 8번) 돌려 모두 통과했다. 2-3b 때와 같은 부하 때의 흔들림이다.
- 데스크톱 `perf:journey`(창이 뜬다)와 휴대폰 실측은 계획 작성 때 하지 않았다(Task 9 Step 4·6).

**스펙과 다르게 또는 더 구체적으로 정한 점(사용자 검토 대상, 스펙 3·4·5·7·8·9절에 반영해 이 계획과 함께 커밋한다):**
1. **세로 화면 카메라의 감쇠는 가로 화면(`followCamera`)과 다르다.** 스펙은 "감쇠와 차 둘레 밀어내기는 가로 화면과 같다"였다. 차 기준 직교 좌표로 감쇠하면 정류장 자리(차의 앞옆)에서 주행 자리(차 뒤)로 갈 때 카메라가 차 가까이를 지나, 빠른 스크롤에서 차가 화면 높이의 1.2배까지 커지고 화면 밖(x 1.25)으로 밀렸다. 그래서 세로 화면은 카메라의 방위각, 정류장 구도(정류장 방위각, 차 기준 시선 목표), 내려다보기 정도만 감쇠하고(`followPortrait`, 가로 화면과 같은 감쇠 세기), 자리·시선은 이 값에서 정한다. "정류장 시점으로 돈 정도"는 방위각 ÷ 정류장 방위각이다. 카메라는 늘 차 둘레 9~13m를 돌아 차를 가로지르지 않는다.
2. **정류장 구도는 읽기 구간 안의 차 자리로 잰다.** 1막은 돌아보기 구간(30~70%), 멈추는 정류장은 차가 서 있는 구간(25~75%) 안에서는 지금 차 자리로, 그 앞뒤에서는 구간 끝의 차 자리로 잰다. 지금 차 자리로만 재면 정류장을 떠나는 동안 홀로그램이 차 뒤로 가며 카메라가 차 앞쪽으로 돌았고(차가 화면 가로 0.6 벗어남), 정류장 가운데로만 재면 1막의 읽기 구간 끝에서 홀로그램이 화면 밖으로 0.003 밀렸다.
3. **도는 도중의 시선.** 주행 시선 목표(차 앞 14m)를 카메라가 돈 각도만큼 차 둘레로 같이 돌리고(주행 구도를 통째로 돌린다), 정류장 시선은 돈 정도의 제곱만큼만 섞는다(`targetEase` 2). 그대로 섞으면 2막·PiCKCARE에서 도는 도중 차가 화면 가로 0.11·0.89까지 밀렸다. 정류장에서의 구도(시선은 차와 홀로그램 사이 가운데)는 승인한 시제품 그대로다.
4. **세로 화면 엔딩 자리.** 투영 중심 29%에서 길 전체가 y 0.10~0.57에 들도록 다시 풀었다: 자리 [27.4, 392.6, 94.3], 시선 [12.5, 14.4, −116.3](거리 약 433m). 390×844에서 x 0.375~0.625다.
5. **경량 블룸의 구체값.** 휘도 패스 해상도 0.5, mip 단계 6(전체는 1·8). postprocessing 6.38의 `BloomEffect` `resolutionScale`은 mipmap 블러에 쓰이지 않아 이 두 값으로 줄인다. Bloom 래퍼에는 ref를 주지 않고 컴포저의 효과 패스에서 블룸을 찾는다(래퍼가 props를 JSON으로 바꾸는데 ref에 효과가 들어가면 순환 구조로 실패한다).
6. **모바일 헤더.** 작은 화면에서 메뉴 간격은 10px(스펙 12px), 글자 13px이고, 로고 묶음의 오른쪽 여백(16px)을 없앤다. 12px로는 390px에서 15px 넘쳤다. 이렇게 하면 390px에서 한 줄에 다 들고(9px 남음), 375px 이하에서 메뉴를 옆으로 밀어 본다. 640px 이상은 예전과 같다(데스크톱 블로그 화면 비교 그대로).
7. **고정 카드를 켜는 조건.** 카메라와 같은 판정(가로 < 세로, JS `isPortrait`)으로 켜고, 모양은 `[data-journey-cards="fixed"]`에만 건다(CSS 미디어 쿼리 없음). WebGL이 없거나(2D) 장면이 실패하면 끈다. 2막 썸네일이 보이는 경우(홀로그램 이미지 실패)를 대비해 고정 카드 안의 이미지는 높이 18svh까지로 줄인다. 진행 막대는 Tailwind `portrait:`(세로가 가로 이상)로 바꾼다.
8. **세로 화면에서는 보이는 카드만 누를 수 있다.** 보이지 않는 카드의 링크를 누를 수 있으면 화면 아래 3D를 누를 때 숨은 링크가 눌린다. 그래서 페이지를 연 직후 상세 링크를 바로 누르던 기존 e2e 넷은 그 정류장으로 스크롤한 뒤 누른다(가로 화면에서는 동작이 같다).
9. **측정 오버레이의 세부.** 회마다 앞부분 제외는 0.5초(perf:journey의 30프레임과 같은 시간)다. 프레임 수로 빼면 느린 헤드리스 e2e에서 표본이 비었다. 확인용 쿼리 `perfSpeed`(초당 화면 수, 기본 1)·`perfMinutes`(오래 돌리기 분, 기본 5), 기종 입력칸, http로 연 휴대폰(보안 맥락이 아니라 clipboard API가 없다)에서는 글상자를 골라 복사한다. 오버레이는 측정 도구라 `requestAnimationFrame`을 직접 쓴다(시계 하나 원칙의 예외, `?debug=perf`에서만 불러온다). `?debug=perf`도 장면 통계를 켠다.
10. **렌즈 모듈(`lens.ts`)을 둔다.** 풍경의 `projectPoint`와 가림 판정의 표적 고르기가 렌즈와 시선을 받는다(세로 화면은 세로 렌즈와 세로 카메라 시선으로 화면 안 도로 표본을 고른다).
11. **후처리 렌더 타깃 메모리는 손으로 계산하지 않고 잰다.** `?debug=stats`의 `renderTargetBytes`가 준비된 순간 컴포저에서 닿는 렌더 타깃을 한 번씩 센다.
12. **세로 화면 e2e.** 다시 켜는 것: 가림(세로 렌즈), 홀로그램 누르기 둘. 넓은 화면에서만 보는 것: 호버·커서 넷(휴대폰에는 호버가 없다), PiCKCARE 배치 모형(세로 화면은 고정 카드라 모형이 없다, 세로 화면 PiCKCARE 테스트가 따로 본다), 첨탑(세로 화면은 네 크기 캡처로 본다).

**넘기는 것:**
- 2-4b: 실행 중 강등, 컨텍스트 손실 시 2D, 2D 세로 타임라인, 수동 전환, 움직임 줄이기, 개발 서버의 장면 실패.
- 2-4c: 접근성 검사(axe), 넘긴 다듬기(스펙 10절), 실기기 재검증, main 병합.

**Tech Stack:** Next 16 App Router, React 19, TypeScript, three 0.181.2(`PerspectiveCamera.setViewOffset`), @react-three/fiber 9.4.0, @react-three/postprocessing 3.0.4(postprocessing 6.38), Tailwind 4(`portrait:`), lenis, vitest 4, @playwright/test 1.63(`hasTouch`·`isMobile`·`deviceScaleFactor`), sharp 0.34.5, tsx

**Spec:** `docs/superpowers/specs/2026-10-14-journey-design.md`
- 반영된 개정: 2026-10-19 4차 개정(`267213b`)과, 이 계획과 함께 커밋하는 정정(위 1~12).
- 다루는 절: 1절 2-4a 완료 조건, 2절 진행 표시, 3절 "세로 화면 (2-4a)", 4절 모듈·사이트 공통 요소 변경, 5절 2-4a에서 정한 점, 7절 2-4a 기준, 8절 2-4a 테스트, 9절 2-4 결정.
- 2단계 계획 가운데 여섯째다. 2-1부터 2-3b까지 완료했고, **2-4a 휴대폰 3D가 이 문서**다. 다음은 2-4b 강등과 2D 안전망, 2-4c 접근성·마감·병합이다.

## Global Constraints

- **범위:** 기기 판별·3D 경량, 세로 화면 카메라·아래 고정 카드, 모바일 헤더·세로 진행 막대, `?debug=perf`와 실기기 측정만 한다. 실행 중 강등·2D 세로 타임라인·수동 전환·움직임 줄이기(2-4b), 접근성 검사·넘긴 다듬기(2-4c)는 하지 않는다
- **세계와 가로 화면은 그대로다:** 차·홀로그램·풍경의 세계 자리, `driveAt`의 카메라, 가로 화면의 본문 배치를 바꾸지 않는다. 데스크톱 풍경 12장면 캡처가 2-3b 완료 때와 같아야 한다
- **같은 진행률이면 같은 장면:** 세로 화면 카메라 목표도 진행률(과 화면 비율, PiCKCARE 앞줄을 정하는 해시)의 순수 함수다
- **기기 판별은 페이지를 열 때 한 번이다.** 실행 중에 단계를 바꾸지 않는다(2-4b)
- **블로그 7개 글 화면:** 데스크톱은 그대로다. 모바일은 헤더가 든 첫 화면 조각(`*-0.png`)만 바뀌며, 높이·DOM·마크업·콘솔 에러 기준이 그대로임을 확인한 뒤에만 그 이미지를 갱신한다(Task 6)
- **의존성을 더하지 않는다**
- **시계 하나:** `/journey`에서 프레임을 도는 것은 GSAP ticker 하나뿐이다. 예외는 `?debug=perf` 측정 오버레이(측정 도구)다
- **스크롤 중 React 렌더 금지:** 고정 카드·진행 막대·측정 오버레이의 글은 DOM 속성·CSS 변수·`textContent`만 고친다
- **three·`@react-three/*` import는 `src/components/journey/scene/` 안에서만 한다.** `src/lib/journey/`는 three 없는 순수 코드다
- **React Compiler 계열 린트 규칙이 에러로 켜져 있다**(`react-hooks/immutability`, `refs`, `purity` 등): 훅이 돌려준 값의 속성을 컴포넌트 렌더에서 직접 바꾸지 않는다
- **설명 문장(카피)을 넣지 않는다(사용자 결정, 2026-10-14)**
- **명령 실행:** Bash 검증 명령에는 `rtk proxy`를 붙이고 exit code를 믿는다. 파일은 Read 도구로 읽는다(`cat`은 rtk 필터가 주석 줄을 빠뜨린다). `npx tsx`·`npm run x -- 인자`는 rtk가 망가뜨리므로 `rtk proxy npm run <스크립트>`나 `rtk proxy npx tsx`로 실행하고, 인자는 환경 변수로 넘긴다. zsh에서 `$var:path`는 수정자로 해석되므로 `${var}:path`로 쓴다
- **기계 자원(2026-10-14 강제 재부팅 뒤 규칙):** 무거운 명령(Playwright, `next build`, vitest, `tsc`)은 하나씩 차례로 돌리고 백그라운드나 병렬로 돌리지 않는다. 그런 명령 전에 `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`로 다른 프로젝트의 무거운 작업이 없는지 확인하고, 있으면 끝날 때까지 기다린다(15초 간격, 10분 넘으면 BLOCKED). 사용자의 다른 프로젝트 개발 서버(`next dev -p 3010`, `3000`)는 무거운 작업으로 세지 않고 건드리지 않는다. vitest는 늘 `--maxWorkers=4`로 돌린다. 띄운 서버는 `lsof -t -iTCP:<포트> -sTCP:LISTEN`으로 찾은 PID만 끈다(`pkill -f next-server`처럼 넓은 패턴 금지)
- **브라우저 확인은 프로덕션 빌드로 한다:** `rtk proxy npx next build && rtk proxy npx next start --port 3200`. 개발 서버(`next dev`)에서는 2-2b부터 여정 장면이 실패한다(2-4b)
- **브라우저 창을 띄우지 않는다(사용자 요청):** 캡처는 `CAPTURE_HEADLESS=1`, `check:holograms`는 `CHECK_HEADLESS=1`(새 헤드리스, GPU)로 돌린다. `perf:journey`만 창이 필요하다(띄우기 전에 사용자에게 알린다)
- **Playwright는 시작할 때 `test-results/`를 비운다.** 캡처를 거기 둔 채 e2e를 돌리면 사라진다. 캡처는 먼저 다른 곳으로 옮긴다
- **커밋하지 않는다.** 에이전트는 `git add`/`commit`/`stash`/`reset`/`checkout`/`restore`를 실행하지 않는다. 각 태스크 마지막 단계는 파일별 변경 표와 커밋 메시지 초안 제출이다(`type: 한국어 요약` + 이유를 적는 `- ` 불릿, 트레일러 없음). 사용자는 모든 태스크가 끝날 때까지 커밋을 보류할 수 있다
- **실기기 측정은 사용자가 한다.** 에이전트는 맥에서 서버를 띄우고 주소·절차를 알린 뒤, 사용자가 붙여 준 결과(JSON)를 기록한다. 결과가 오기 전에는 Task 9를 끝내지 않는다
- 기존 스타일을 따른다: 한국어 주석, `function` 선언형 컴포넌트. 단위 테스트는 소스 옆 `*.test.ts`, e2e는 `e2e/*.e2e.ts`. 대소문자만 다른 파일 이름을 같은 폴더에 두지 않는다

## Review Focus

1. **화면을 돌리기(세로 ↔ 가로).** 휴대폰을 돌리면 렌즈·카메라·고정 카드·진행 막대가 함께 바뀌어야 한다. 사람은 돌린 뒤에도 차와 홀로그램이 화면 안에 있고 카드가 한 장만 보이기를 기대한다 → Task 4 e2e "화면을 가로로 돌리면 가로 렌즈로, 다시 세우면 세로 렌즈로 바뀐다", Task 5 고정 카드는 `resize`로 다시 판정한다
2. **3D가 없거나 실패한 세로 화면.** WebGL이 없거나(2D) 실행 중 장면이 실패하면 고정 카드는 끄고 지금처럼 스크롤 배치로 돌아가야 한다(썸네일이 보이는 카드가 화면을 덮지 않게) → Task 5 e2e "WebGL이 없으면 세로 화면에서도 카드를 고정하지 않는다", "실행 중 장면이 실패하면(컨텍스트 손실) 카드가 스크롤 배치로 돌아온다", 고정 카드 안 이미지 높이 18svh
3. **키보드·스크린 리더로 보이지 않는 카드에 닿기.** 포커스가 보이지 않는 카드로 가면 그 정류장으로 한 번 스크롤해야 하고, 되돌이나 반복 스크롤이 없어야 한다 → Task 5 e2e "Tab·Shift+Tab으로 상세 링크를 차례로 지나면…", "이미 보이는 카드의 링크로 포커스가 가면 스크롤하지 않는다"
4. **빠른 스크롤과 정류장 경계.** 진행 막대·End 키로 정류장을 건너뛰면 세로 카메라가 차를 가로지르거나 차를 화면 밖으로 밀 수 있다 → Task 3 단위 "PFPlay에서 주행으로 돌아오는 전환과 여정 전체를 빠르게 앞뒤로 지나도(60·120Hz)…", "정류장마다 카메라는 홀로그램 반대쪽으로만 돈다"
5. **좁은 화면의 사이트 헤더.** 360·375px에서 메뉴가 줄바꿈되거나 잘려 닿을 수 없으면 블로그 전체가 깨진다 → Task 6 e2e "360px·390px 화면에서 헤더 메뉴가 줄바꿈 없이 한 줄이고 모든 메뉴에 닿는다"

---

## 파일 구조

| 파일 | 책임 |
|---|---|
| `src/lib/journey/capability.ts` | (새) 기기 단계 판정, 확인용 덮어쓰기, 단계별 품질, 페이지 단계 읽기 (순수 + 브라우저 읽기 한 곳) |
| `src/lib/journey/lens.ts` | (새) 렌즈, 가로·세로 판정, 렌즈를 넣은 화면 투영 (순수) |
| `src/lib/journey/portrait.ts` | (새) 세로 화면 카메라 목표·상태·감쇠, 정류장 구도, 아래 고정 카드 고르기 (순수) |
| `src/lib/journey/perfStats.ts` | (새) 프레임 시간 요약, 휴대폰 기준 판정, 1분 묶음 (순수) |
| `src/lib/journey/space.ts`, `landscape.ts`, `landscapeOcclusion.ts` | (수정) 경량 은하 주소, 투영을 렌즈 모듈로, 가림 표적이 렌즈·시선을 받음 |
| `src/components/journey/JourneyStage.tsx` | (수정) 기기 단계로 3D, 세로 화면 카드, `?debug=perf` 오버레이 |
| `src/components/journey/portraitCards.ts` | (새) 아래 고정 카드를 켜고 바꾸고, 포커스 스크롤 |
| `src/components/journey/PerfOverlay.tsx` | (새) `?debug=perf` 측정 오버레이 |
| `src/components/journey/JourneyContent.tsx`, `ProgressRail.tsx`, `src/components/Header.tsx`, `src/app/globals.css` | (수정) 카드 표지, 세로 진행 막대, 모바일 헤더, 고정 카드 모양 |
| `src/components/journey/scene/Scene.tsx`, `Sky.tsx`, `Effects.tsx`, `CameraRig.tsx`, `Warmup.tsx`, `frameStats.ts` | (수정) 해상도 배율, 은하, 블룸, 렌즈와 세로 카메라, 통계(단계·품질·렌즈·렌더 타깃) |
| `scripts/build-galaxy.ts`, `public/journey/galaxy-2048.webp` | (수정·새) 경량 은하 |
| `scripts/capture-journey.ts` | (수정) 세로 화면 캡처 묶음 |
| `e2e/journey.e2e.ts`, `e2e/blog-projects.e2e.ts`, 단위 테스트들 | (수정·추가) 각 태스크의 테스트 |

---

### Task 1: 기기 판별(`capability.ts`)

스펙 5절 "기기 대응"의 판정이다. 3D 전체(WebGL2 + 정밀 포인터), 3D 경량(WebGL2 + 굵은 포인터), 2D(WebGL2 없음, `deviceMemory` 2 이하, `saveData`)를 순수 함수(`tierOf`)로 정한다. Safari처럼 `deviceMemory`·`connection` 값이 없으면 판정에 쓰지 않는다. 확인용으로 `?debug=stats`(또는 `perf`)`&tier=full|lite|2d`가 판정을 덮지만, WebGL2가 없으면 3D를 강제할 수 없다(`resolveTier`). 브라우저 값은 `detectTier`가 페이지마다 한 번 읽고 기억한다(판별은 열 때 한 번, 실행 중 강등은 2-4b).

**Files:**
- Create: `src/lib/journey/capability.test.ts`, `src/lib/journey/capability.ts`

**Interfaces:**
- Consumes: `hasWebGL2()`(webgl.ts)
- Produces: `type Tier = "full" | "lite" | "2d"`, `interface DeviceSignals { webgl2; coarsePointer; deviceMemory?; saveData? }`, `tierOf(signals): Tier`, `tierOverride(search: string): Tier | null`, `resolveTier(signals, override): Tier`, `detectTier(): Tier`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/lib/journey/capability.test.ts` 전체:

```ts
import { describe, expect, it } from "vitest";
import { resolveTier, tierOf, tierOverride, type DeviceSignals } from "./capability";

const DESKTOP: DeviceSignals = { webgl2: true, coarsePointer: false, deviceMemory: 8, saveData: false };
const PHONE: DeviceSignals = { webgl2: true, coarsePointer: true, deviceMemory: 4, saveData: false };
/** Safari에는 deviceMemory·connection이 없다 */
const IPHONE: DeviceSignals = { webgl2: true, coarsePointer: true };

describe("기기 단계(스펙 5절)", () => {
  it("WebGL2가 되고 포인터가 정밀하면 3D 전체, 굵으면(휴대폰·태블릿) 3D 경량이다", () => {
    expect(tierOf(DESKTOP)).toBe("full");
    expect(tierOf(PHONE)).toBe("lite");
  });

  it("WebGL2가 없거나, 메모리가 2GB 이하이거나, 데이터 절약이 켜져 있으면 2D다", () => {
    expect(tierOf({ ...DESKTOP, webgl2: false })).toBe("2d");
    expect(tierOf({ ...PHONE, deviceMemory: 2 })).toBe("2d");
    expect(tierOf({ ...PHONE, deviceMemory: 1 })).toBe("2d");
    expect(tierOf({ ...DESKTOP, saveData: true })).toBe("2d");
    expect(tierOf({ ...PHONE, deviceMemory: 3 })).toBe("lite");
  });

  it("Safari처럼 deviceMemory·connection 값이 없으면 판정에 쓰지 않는다(2D로 보내지 않는다)", () => {
    expect(tierOf(IPHONE)).toBe("lite");
    expect(tierOf({ webgl2: true, coarsePointer: false })).toBe("full");
  });
});

describe("확인용 덮어쓰기(?debug=stats|perf&tier=)", () => {
  it("debug가 stats나 perf일 때만 tier 값을 읽는다", () => {
    expect(tierOverride("?debug=stats&tier=lite")).toBe("lite");
    expect(tierOverride("?debug=perf&tier=2d")).toBe("2d");
    expect(tierOverride("?tier=lite")).toBeNull();
    expect(tierOverride("?debug=stats")).toBeNull();
    expect(tierOverride("?debug=stats&tier=fast")).toBeNull();
  });

  it("덮어쓰기가 판정보다 앞서지만, WebGL2가 없으면 3D를 강제할 수 없다", () => {
    expect(resolveTier(DESKTOP, "lite")).toBe("lite");
    expect(resolveTier(PHONE, "full")).toBe("full");
    expect(resolveTier(PHONE, "2d")).toBe("2d");
    expect(resolveTier({ ...DESKTOP, webgl2: false }, "full")).toBe("2d");
    expect(resolveTier(PHONE, null)).toBe("lite");
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4 src/lib/journey/capability.test.ts`
Expected: FAIL — `Error: Cannot find module './capability' imported from …/capability.test.ts`(Tests no tests)

- [ ] **Step 3: 모듈을 쓴다**

`src/lib/journey/capability.ts` 전체:

```ts
import { hasWebGL2 } from "./webgl";

/**
 * 기기 단계(스펙 5절 "기기 대응"). 페이지를 열 때 한 번 정한다. 실행 중에 단계를 바꾸는 것은 2-4b의 "실행 중 강등"이다.
 * - 3D 전체: WebGL2가 되고 포인터가 정밀한 기기(데스크톱·노트북)
 * - 3D 경량: WebGL2가 되고 포인터가 굵은 기기(휴대폰·태블릿)
 * - 2D: WebGL2가 없거나, 메모리가 2GB 이하이거나, 데이터 절약이 켜져 있다. Safari에는 deviceMemory·connection이 없어
 *   값이 없으면 판정에 쓰지 않는다(2D로 보내지 않는다)
 * 판정(tierOf)은 순수 함수이고, 브라우저 값을 읽는 일은 detectTier가 한다.
 */
export type Tier = "full" | "lite" | "2d";

export interface DeviceSignals {
  webgl2: boolean;
  /** (pointer: coarse) */
  coarsePointer: boolean;
  /** navigator.deviceMemory(GB). Safari에는 없다 */
  deviceMemory?: number;
  /** navigator.connection.saveData. Safari에는 없다 */
  saveData?: boolean;
}

const TIERS: readonly Tier[] = ["full", "lite", "2d"];

export function tierOf(signals: DeviceSignals): Tier {
  if (!signals.webgl2) return "2d";
  if (signals.deviceMemory !== undefined && signals.deviceMemory <= 2) return "2d";
  if (signals.saveData === true) return "2d";
  return signals.coarsePointer ? "lite" : "full";
}

/** 확인용 덮어쓰기: 주소가 ?debug=stats(또는 perf)&tier=full|lite|2d면 그 단계 */
export function tierOverride(search: string): Tier | null {
  const params = new URLSearchParams(search);
  const debug = params.get("debug");
  if (debug !== "stats" && debug !== "perf") return null;
  const tier = params.get("tier");
  return TIERS.find((item) => item === tier) ?? null;
}

/** 덮어쓰기가 판정보다 앞선다. 다만 WebGL2가 없으면 3D를 강제할 수 없다 */
export function resolveTier(signals: DeviceSignals, override: Tier | null): Tier {
  if (!signals.webgl2) return "2d";
  return override ?? tierOf(signals);
}

let detected: Tier | null = null;

/** 이 페이지의 기기 단계(한 번 읽고 기억한다). 브라우저에서만 부른다 */
export function detectTier(): Tier {
  if (detected === null) {
    const info = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
    detected = resolveTier(
      {
        webgl2: hasWebGL2(),
        coarsePointer: window.matchMedia("(pointer: coarse)").matches,
        deviceMemory: info.deviceMemory,
        saveData: info.connection?.saveData,
      },
      tierOverride(window.location.search),
    );
  }
  return detected;
}
```

- [ ] **Step 4: 통과를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4 src/lib/journey/capability.test.ts`
Expected: PASS — `Tests  5 passed (5)`

- [ ] **Step 5: 전체 확인**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`·`3000`은 무시)

Run: `rtk proxy npx tsc --noEmit` → exit 0
Run: `rtk proxy npx vitest run --maxWorkers=4` → `Tests  388 passed (388)`
Run: `rtk proxy npx eslint src/lib/journey/capability.ts src/lib/journey/capability.test.ts` → exit 0, 문제 0(`baseline-browser-mapping` 안내 한 줄은 린트 결과가 아니다)

- [ ] **Step 6: 커밋 정리를 제출한다**

파일별 변경 표와 메시지 초안. 초안 예:

```
feat: 여정 기기 단계 판별 추가

- 3D 전체·3D 경량·2D를 WebGL2·포인터·메모리·데이터 절약으로 정하고, Safari처럼 값이 없으면 판정에 쓰지 않는다
- 페이지를 열 때 한 번 정하고(실행 중 강등은 2-4b), 확인용 ?debug=stats&tier=로 덮을 수 있다
```

---

### Task 2: 3D 경량 연결(해상도 배율·은하 2048·블룸·2D 판정·통계)

스펙 5절 "2-4a에서 정한 점"이다. 단계별 품질(`QUALITY`)을 두고 장면이 따른다: 해상도 배율 상한(전체 2, 경량 1.5, `Scene`의 Canvas `dpr`), 은하(경량은 `galaxy-2048.webp`, GPU 32.0 → 8.0MiB, `Sky`), 블룸(경량은 휘도 패스 해상도 0.5·mip 단계 6, `Effects`). 블룸은 컴포저의 효과 패스에서 찾는다(Bloom 래퍼에 ref를 주지 않는다, 계획 머리말 5). `JourneyStage`는 기기 단계가 2D면 장면을 띄우지 않는다(장면 청크·은하·차를 받지 않는다, 2-4a의 2D는 WebGL이 없을 때와 같다). `?debug=stats`는 단계·실제 해상도 배율·은하 폭·블룸 값과 후처리 렌더 타깃 메모리 추정(`renderTargetBytes`, 텍스처 예산과 따로)을 낸다. 경량 은하는 `scripts/build-galaxy.ts`가 원본 WebP에서 줄여 만든다(이진 파일이라 이 계획에 내용을 싣지 않고 명령으로 만든다).

**Files:**
- Modify: `e2e/journey.e2e.ts`, `scripts/build-galaxy.ts`, `src/components/journey/JourneyStage.tsx`, `src/components/journey/scene/Effects.tsx`, `src/components/journey/scene/Scene.tsx`, `src/components/journey/scene/Sky.tsx`, `src/components/journey/scene/frameStats.test.ts`, `src/components/journey/scene/frameStats.ts`, `src/lib/journey/capability.test.ts`, `src/lib/journey/capability.ts`, `src/lib/journey/space.ts`
- Create(명령으로): `public/journey/galaxy-2048.webp`

**Interfaces:**
- Consumes: Task 1의 `Tier`, `detectTier`. `GALAXY_URL`(space.ts)
- Produces: `GALAXY_LITE_URL = "/journey/galaxy-2048.webp"`(space.ts), `interface Quality { dpr: [number, number]; galaxy: string; bloom: { luminanceScale; levels } }`, `QUALITY: Record<"full" | "lite", Quality>`, `sceneQuality(): Quality`(capability.ts), `renderTargetBytes(root: object): number`, `interface BloomProbe { mipmapBlurPass: { levels }; luminancePass: { resolution: { scale } } }`, `recordPostprocessing(postprocessing | null)`, `interface QualityStats { tier; dpr; galaxyWidth; bloomLevels; luminanceScale }`, `JourneyStats.quality`·`.renderTargetBytes`(frameStats.ts), 하늘 메시 이름 `journey-sky`

- [ ] **Step 1: 실패하는 단위 테스트를 쓴다**

`src/lib/journey/capability.test.ts`에서 찾을 부분:

```ts
import { describe, expect, it } from "vitest";
import { resolveTier, tierOf, tierOverride, type DeviceSignals } from "./capability";

```

바꿀 내용:

```ts
import { describe, expect, it } from "vitest";
import { QUALITY, resolveTier, tierOf, tierOverride, type DeviceSignals } from "./capability";

```

`src/lib/journey/capability.test.ts` 끝에 붙인다:

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
});
```

`src/components/journey/scene/frameStats.test.ts`에서 찾을 부분:

```ts
  WebGLCubeRenderTarget,
} from "three";
import { sceneTextureBytes, textureBytes } from "./frameStats";

```

바꿀 내용:

```ts
  WebGLCubeRenderTarget,
  WebGLRenderTarget,
} from "three";
import { renderTargetBytes, sceneTextureBytes, textureBytes } from "./frameStats";

```

`src/components/journey/scene/frameStats.test.ts` 끝에 붙인다:

```ts

describe("후처리 렌더 타깃 메모리 추정(2-4a, 텍스처 예산과 따로)", () => {
  it("후처리에서 닿는 렌더 타깃을 한 번씩만 크기 × 화소 크기(깊이 버퍼가 있으면 4바이트 더)로 센다", () => {
    const hdr = new WebGLRenderTarget(100, 50, { type: HalfFloatType });
    const plain = new WebGLRenderTarget(40, 20, { depthBuffer: false });
    const mip = new WebGLRenderTarget(20, 10, { type: HalfFloatType, depthBuffer: false });
    const composer = {
      inputBuffer: hdr,
      outputBuffer: hdr,
      passes: [{ effects: [{ renderTarget: plain, luminancePass: { renderTarget: plain }, mipmapBlurPass: { downsamplingMipmaps: [mip] } }] }],
    };
    expect(renderTargetBytes(composer)).toBe(100 * 50 * (8 + 4) + 40 * 20 * 4 + 20 * 10 * 8);
  });

  it("렌더러·장면·카메라 쪽으로는 따라가지 않는다", () => {
    const scene = new Scene();
    const composer = { renderer: { target: new WebGLRenderTarget(1000, 1000) }, scene, passes: [] };
    expect(renderTargetBytes(composer)).toBe(0);
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4 src/lib/journey/capability.test.ts src/components/journey/scene/frameStats.test.ts`
Expected: FAIL — `Tests  4 failed | 16 passed (20)`. 품질값이 없고(`TypeError: Cannot read properties of undefined (reading 'full')`·`(reading 'lite')`), `TypeError: renderTargetBytes is not a function`

- [ ] **Step 3: 실패하는 e2e를 쓴다**

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts

type HologramStats = {
```

바꿀 내용:

```ts

// ── 기기 단계와 3D 경량(2-4a, 스펙 5절) ───────────────────

test.describe("해상도 배율 2 화면", () => {
  test.use({ deviceScaleFactor: 2 });

  test("3D 전체는 배율 2·은하 4096·블룸 그대로이고, ?tier=lite는 배율 1.5·은하 2048·줄인 블룸이다", async ({ page }) => {
    await page.goto("/journey?debug=stats");
    await waitReady(page);
    const full = await readStats(page);
    expect(full.quality).toEqual({ tier: "full", dpr: 2, galaxyWidth: 4096, bloomLevels: 8, luminanceScale: 1 });
    expect(full.renderTargetBytes).toBeGreaterThan(0);
    await page.goto("/journey?debug=stats&tier=lite");
    await waitReady(page);
    const lite = await readStats(page);
    expect(lite.quality).toEqual({ tier: "lite", dpr: 1.5, galaxyWidth: 2048, bloomLevels: 6, luminanceScale: 0.5 });
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
  await expect(page.locator("[data-journey-scene]")).toHaveCount(0);
  expect(requests.filter((url) => url.includes("/journey/galaxy") || url.includes("/journey/car/"))).toEqual([]);
  for (const slug of EXHIBITS) await expectThumbnail(page, slug, false);
  await page.keyboard.press("End");
  await expect(page.getByText(EMAIL)).toBeInViewport();
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
```

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts
  landscape: LandscapeStats | null;
};
```

바꿀 내용:

```ts
  landscape: LandscapeStats | null;
  quality: { tier: string; dpr: number; galaxyWidth: number; bloomLevels: number; luminanceScale: number } | null;
  renderTargetBytes: number;
};
```

- [ ] **Step 4: e2e 실패를 확인한다**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`·`3000`은 무시)

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts -g "배율 2·은하|tier=2d면|터치\)는 3D 경량"` (Playwright가 매번 `next build`부터 한다. 2~4분)
Expected: FAIL — `6 failed`. 배율 2 화면·터치 기기 테스트는 `quality`가 없어(`Received: undefined`), `?tier=2d` 테스트는 `[data-journey-scene]`이 1개라서(`Expected: 0, Received: 1`) 실패한다

- [ ] **Step 5: 품질값과 경량 은하 주소·생성 스크립트를 쓴다**

`src/lib/journey/space.ts`에서 찾을 부분:

```ts
export const GALAXY_URL = "/journey/galaxy.webp";

```

바꿀 내용:

```ts
export const GALAXY_URL = "/journey/galaxy.webp";
/** 3D 경량의 은하(2048×1024, scripts/build-galaxy.ts가 원본에서 줄여 만든다). GPU 추정 32.0 → 8.0MiB */
export const GALAXY_LITE_URL = "/journey/galaxy-2048.webp";

```

`src/lib/journey/capability.ts`에서 찾을 부분:

```ts
import { hasWebGL2 } from "./webgl";
```

바꿀 내용:

```ts
import { GALAXY_LITE_URL, GALAXY_URL } from "./space";
import { hasWebGL2 } from "./webgl";
```

`src/lib/journey/capability.ts`에서 찾을 부분:

```ts

let detected: Tier | null = null;
```

바꿀 내용:

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

let detected: Tier | null = null;
```

`src/lib/journey/capability.ts` 끝에 붙인다:

```ts

/** 지금 페이지의 3D 품질. 장면 코드만 부른다(2D면 장면을 띄우지 않는다) */
export function sceneQuality(): Quality {
  return QUALITY[detectTier() === "lite" ? "lite" : "full"];
}
```

`scripts/build-galaxy.ts`에서 찾을 부분:

```ts
 *
 * 사용법: GALAXY_EXR=<내려받은 starmap_2020_4k.exr 경로> npm run build:galaxy
 */
const SOURCE = process.env.GALAXY_EXR;
const OUTPUT = "public/journey/galaxy.webp";
const QUALITY = 82; // 4096×2048에서 약 1.6MB. 90이면 2.5MB인데 별 모양 차이가 눈에 띄지 않았다
```

바꿀 내용:

```ts
 *
 * 3D 경량(스펙 5절, 2-4a)이 쓰는 2048×1024(galaxy-2048.webp)도 같은 원본에서 줄여 만든다. EXR이 없으면 GALAXY_LITE=1로
 * 이미 있는 4096 WebP에서 줄인다.
 *
 * 사용법: GALAXY_EXR=<내려받은 starmap_2020_4k.exr 경로> npm run build:galaxy
 *         GALAXY_LITE=1 npm run build:galaxy   # galaxy-2048.webp만(원본 EXR 없이)
 */
const SOURCE = process.env.GALAXY_EXR;
const OUTPUT = "public/journey/galaxy.webp";
const LITE_OUTPUT = "public/journey/galaxy-2048.webp";
const LITE_SIZE = { width: 2048, height: 1024 };
const QUALITY = 82; // 4096×2048에서 약 1.6MB. 90이면 2.5MB인데 별 모양 차이가 눈에 띄지 않았다
```

`scripts/build-galaxy.ts`에서 찾을 부분:

```ts

async function main() {
  if (!SOURCE) throw new Error("GALAXY_EXR에 내려받은 starmap_2020_4k.exr 경로를 주세요");
```

바꿀 내용:

```ts

async function writeLite(input: sharp.Sharp) {
  const info = await input.resize(LITE_SIZE.width, LITE_SIZE.height).webp({ quality: QUALITY }).toFile(LITE_OUTPUT);
  console.log(`${LITE_OUTPUT}: ${LITE_SIZE.width}×${LITE_SIZE.height}, ${(info.size / 1024 / 1024).toFixed(2)}MB`);
}

async function main() {
  if (process.env.GALAXY_LITE === "1") {
    await writeLite(sharp(OUTPUT));
    return;
  }
  if (!SOURCE) throw new Error("GALAXY_EXR에 내려받은 starmap_2020_4k.exr 경로를 주세요");
```

`scripts/build-galaxy.ts`에서 찾을 부분:

```ts
  console.log(`${OUTPUT}: ${width}×${height}, ${(info.size / 1024 / 1024).toFixed(2)}MB`);
}
```

바꿀 내용:

```ts
  console.log(`${OUTPUT}: ${width}×${height}, ${(info.size / 1024 / 1024).toFixed(2)}MB`);
  await writeLite(sharp(rgb, { raw: { width, height, channels: 3 } }));
}
```

- [ ] **Step 6: 경량 은하를 만든다**

Run: `GALAXY_LITE=1 rtk proxy npx tsx scripts/build-galaxy.ts`
Expected: `public/journey/galaxy-2048.webp: 2048×1024, 0.28MB` 출력, 파일 약 291KB가 생긴다

- [ ] **Step 7: 장면과 통계를 잇는다**

`src/components/journey/JourneyStage.tsx`에서 찾을 부분:

```tsx
import { setCarStatus, setSceneStatus } from "@/lib/journey/sceneStatus";
import { hasWebGL2 } from "@/lib/journey/webgl";
import { useHologramFocus } from "./hologramLinks";
```

바꿀 내용:

```tsx
import { setCarStatus, setSceneStatus } from "@/lib/journey/sceneStatus";
import { detectTier } from "@/lib/journey/capability";
import { useHologramFocus } from "./hologramLinks";
```

`src/components/journey/JourneyStage.tsx`에서 찾을 부분:

```tsx

// 장면 코드(도로 셰이더, 차 모델 로더, drei 환경맵, 후처리)는 이 동적 import 뒤에만 있다. WebGL2를 확인한 뒤에 불러와 3D를 못 쓰는 기기는 내려받지 않는다(three·R3F 본체는 사이트 별 배경이 레이아웃에서 이미 싣는다).
const Scene = dynamic(() => import("./scene/Scene"), { ssr: false });
```

바꿀 내용:

```tsx

// 장면 코드(도로 셰이더, 차 모델 로더, drei 환경맵, 후처리)는 이 동적 import 뒤에만 있다. 기기 단계를 판별한 뒤에 불러와 2D 기기는 내려받지 않는다(three·R3F 본체는 사이트 별 배경이 레이아웃에서 이미 싣는다).
const Scene = dynamic(() => import("./scene/Scene"), { ssr: false });
```

`src/components/journey/JourneyStage.tsx`에서 찾을 부분:

```tsx
  useHologramFocus();
  const webgl = useSyncExternalStore(subscribeNothing, hasWebGL2, () => false);
  // 다른 페이지로 갔다가 돌아오면 장면을 처음부터 다시 준비한다(실패했던 상태와 차 상태도 지운다).
```

바꿀 내용:

```tsx
  useHologramFocus();
  // 기기 단계(스펙 5절)는 페이지를 열 때 한 번 정한다. 2-4a의 2D는 WebGL이 없을 때와 같다(본문과 썸네일, 세로 타임라인은 2-4b)
  const webgl = useSyncExternalStore(subscribeNothing, () => detectTier() !== "2d", () => false);
  // 다른 페이지로 갔다가 돌아오면 장면을 처음부터 다시 준비한다(실패했던 상태와 차 상태도 지운다).
```

`src/components/journey/scene/Scene.tsx`에서 찾을 부분:

```tsx
import { Canvas } from "@react-three/fiber";
import { useSyncExternalStore, type ReactNode } from "react";
import { WebGLRenderer, type WebGLRendererParameters } from "three";
import { driveAt } from "@/lib/journey/drive";
```

바꿀 내용:

```tsx
import { Canvas } from "@react-three/fiber";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import { WebGLRenderer, type WebGLRendererParameters } from "three";
import { sceneQuality } from "@/lib/journey/capability";
import { driveAt } from "@/lib/journey/drive";
```

`src/components/journey/scene/Scene.tsx`에서 찾을 부분:

```tsx
export default function Scene() {
  return (
    <SceneFrame>
      <Canvas frameloop="never" dpr={[1, 2]} camera={CAMERA} gl={createRenderer}>
        <Atmosphere />
```

바꿀 내용:

```tsx
export default function Scene() {
  // 해상도 배율 상한은 기기 단계를 따른다(3D 전체 2, 경량 1.5, 스펙 5절)
  const [dpr] = useState(() => sceneQuality().dpr);
  return (
    <SceneFrame>
      <Canvas frameloop="never" dpr={dpr} camera={CAMERA} gl={createRenderer}>
        <Atmosphere />
```

`src/components/journey/scene/Sky.tsx`에서 찾을 부분:

```tsx
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
```

바꿀 내용:

```tsx
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import {
```

`src/components/journey/scene/Sky.tsx`에서 찾을 부분:

```tsx
} from "three";
import { GALAXY_URL, SKY_ROTATION } from "@/lib/journey/space";

```

바꿀 내용:

```tsx
} from "three";
import { sceneQuality } from "@/lib/journey/capability";
import { SKY_ROTATION } from "@/lib/journey/space";

```

`src/components/journey/scene/Sky.tsx`에서 찾을 부분:

```tsx
 * 이미지를 받는 동안 Canvas 안의 Suspense가 장면 전체를 기다리게 하므로, Warmup은 하늘이 걸린 뒤에 컴파일한다.
 * 받지 못하면 던져진 오류를 SceneBoundary가 잡아 3D만 빠진다.
 */
export function Sky() {
  const texture = useTexture(GALAXY_URL, asEquirect);
  const sky = useMemo(() => createSky(texture), [texture]);
```

바꿀 내용:

```tsx
 * 이미지를 받는 동안 Canvas 안의 Suspense가 장면 전체를 기다리게 하므로, Warmup은 하늘이 걸린 뒤에 컴파일한다.
 * 받지 못하면 던져진 오류를 SceneBoundary가 잡아 3D만 빠진다. 3D 경량은 2048×1024 은하를 받는다(스펙 5절).
 */
export function Sky() {
  const [url] = useState(() => sceneQuality().galaxy);
  const texture = useTexture(url, asEquirect);
  const sky = useMemo(() => createSky(texture), [texture]);
```

`src/components/journey/scene/Sky.tsx`에서 찾을 부분:

```tsx
  });
  return <mesh ref={mesh} geometry={sky.geometry} material={sky.material} renderOrder={-1} frustumCulled={false} />;
}
```

바꿀 내용:

```tsx
  });
  return <mesh ref={mesh} name="journey-sky" geometry={sky.geometry} material={sky.material} renderOrder={-1} frustumCulled={false} />;
}
```

`src/components/journey/scene/Effects.tsx`에서 찾을 부분:

```tsx
import { Bloom, EffectComposer, SMAA, ToneMapping, Vignette } from "@react-three/postprocessing";
import { useState } from "react";
import { statsEnabled } from "./frameStats";

```

바꿀 내용:

```tsx
import { Bloom, EffectComposer, SMAA, ToneMapping, Vignette } from "@react-three/postprocessing";
import { useEffect, useRef, useState, type ComponentRef } from "react";
import { sceneQuality } from "@/lib/journey/capability";
import { recordPostprocessing, statsEnabled, type BloomProbe } from "./frameStats";

```

`src/components/journey/scene/Effects.tsx`에서 찾을 부분:

```tsx
/**
 * 후처리(스펙 3절): 블룸(빛의 길, 경계선, 차 불빛), 톤 매핑, 약한 비네트, 안티에일리어싱(SMAA).
 * EffectComposer는 렌더러의 톤 매핑을 끄고 HDR 버퍼에 그리므로 톤 매핑을 효과로 직접 건다.
 * 블룸은 밝기 1을 넘는 빛(스스로 빛나는 선)에만 걸린다. 안티에일리어싱은 SMAA가 맡아 MSAA는 끈다.
 * ?debug=stats&bloom=off면 블룸 세기만 0으로 둔다(나머지 패스는 그대로). check:holograms가 두 장으로 홀로그램 화면에 블룸이 더한 몫을 잰다.
 */
export function Effects() {
  const [bloom] = useState(() => !(statsEnabled() && new URLSearchParams(window.location.search).get("bloom") === "off"));
  return (
    <EffectComposer multisampling={0}>
      <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={0.2} intensity={bloom ? 0.9 : 0} />
      <ToneMapping mode={NEUTRAL_TONE_MAPPING} />
```

바꿀 내용:

```tsx
/**
 * 컴포저의 효과 패스에서 블룸을 찾는다(mipmap 블러 패스를 가진 효과). Bloom 래퍼에는 ref를 주지 않는다. 래퍼가 props를 JSON으로 바꿔
 * 효과를 다시 만들지 정하는데, ref에 효과(순환 구조)가 들어간 뒤 다시 렌더되면 실패한다.
 */
function findBloom(composer: { passes: object[] } | null): BloomProbe | null {
  for (const pass of composer?.passes ?? []) {
    for (const effect of (pass as { effects?: object[] }).effects ?? []) {
      if ("mipmapBlurPass" in effect && "luminancePass" in effect) return effect as BloomProbe;
    }
  }
  return null;
}

/**
 * 후처리(스펙 3절): 블룸(빛의 길, 경계선, 차 불빛), 톤 매핑, 약한 비네트, 안티에일리어싱(SMAA).
 * EffectComposer는 렌더러의 톤 매핑을 끄고 HDR 버퍼에 그리므로 톤 매핑을 효과로 직접 건다.
 * 블룸은 밝기 1을 넘는 빛(스스로 빛나는 선)에만 걸린다. 안티에일리어싱은 SMAA가 맡아 MSAA는 끈다.
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

`src/components/journey/scene/frameStats.ts`에서 찾을 부분:

```ts
  type Material,
  type Scene,
  type Texture,
  type WebGLRenderer,
} from "three";
import { getCarStatus, type CarStatus } from "@/lib/journey/sceneStatus";
```

바꿀 내용:

```ts
  type Material,
  type Mesh,
  type Scene,
  type ShaderMaterial,
  type Texture,
  type WebGLRenderer,
} from "three";
import { detectTier, type Tier } from "@/lib/journey/capability";
import { getCarStatus, type CarStatus } from "@/lib/journey/sceneStatus";
```

`src/components/journey/scene/frameStats.ts`에서 찾을 부분:

```ts
 * 텍스처 메모리는 장면이 쓰는 텍스처의 크기·형식으로 계산한 GPU 업로드 추정치다(스펙 7절). 등장방형 배경을 three가 큐브로 바꾸며 만드는
 * 텍스처와 깊이 버퍼도 넣는다. 후처리 렌더 타깃과 환경 반사의 PMREM 변환(약 3MB)은 넣지 않는다.
 * three는 원본(source)과 업로드 설정이 같은 텍스처를 GPU에 한 번만 올리므로 그런 복제는 한 번만 센다.
```

바꿀 내용:

```ts
 * 텍스처 메모리는 장면이 쓰는 텍스처의 크기·형식으로 계산한 GPU 업로드 추정치다(스펙 7절). 등장방형 배경을 three가 큐브로 바꾸며 만드는
 * 텍스처와 깊이 버퍼도 넣는다. 후처리 렌더 타깃과 환경 반사의 PMREM 변환(약 3MB)은 넣지 않는다. 후처리 렌더 타깃은 따로 잰다(renderTargetBytes, 2-4a).
 * three는 원본(source)과 업로드 설정이 같은 텍스처를 GPU에 한 번만 올리므로 그런 복제는 한 번만 센다.
```

`src/components/journey/scene/frameStats.ts`에서 찾을 부분:

```ts
  landscape: LandscapeStats | null;
}
```

바꿀 내용:

```ts
  landscape: LandscapeStats | null;
  /** 기기 단계와 그 품질(2-4a). 준비된 순간에 쓴다 */
  quality: QualityStats | null;
  /** 후처리 렌더 타깃 메모리 추정(바이트, 2-4a). 텍스처 예산과 따로 기록한다. 준비된 순간의 화면 크기 기준 */
  renderTargetBytes: number;
}

/** 기기 단계와 그 품질(스펙 5절): 단계, 실제 해상도 배율, 은하 폭, 블룸 mip 단계, 블룸 휘도 패스의 해상도 비율 */
export interface QualityStats {
  tier: Tier;
  dpr: number;
  galaxyWidth: number;
  bloomLevels: number;
  luminanceScale: number;
}
```

`src/components/journey/scene/frameStats.ts`에서 찾을 부분:

```ts

function pixelBytes(texture: Texture): number {
  return texture.type === FloatType ? 16 : texture.type === HalfFloatType ? 8 : 4;
```

바꿀 내용:

```ts

function pixelBytes(texture: { type?: number }): number {
  return texture.type === FloatType ? 16 : texture.type === HalfFloatType ? 8 : 4;
```

`src/components/journey/scene/frameStats.ts`에서 찾을 부분:

```ts

let latestHolograms: HologramStats | null = null;
let latestLandscape: LandscapeStats | null = null;

```

바꿀 내용:

```ts

/** 렌더 타깃을 찾아 들어가지 않는 쪽: 렌더러·장면·카메라(후처리 밖의 것), 그리고 부모·자식 고리 */
const SKIP_KEYS = new Set(["renderer", "scene", "camera", "mainScene", "mainCamera", "parent", "children"]);

/**
 * 후처리(EffectComposer)에서 닿는 렌더 타깃의 메모리 추정(바이트). 렌더 타깃마다 한 번씩, 크기 × 화소 크기에 깊이 버퍼가 있으면
 * 화소당 4바이트를 더한다. 패스·효과의 필드(입출력 버퍼, 블룸 휘도·mip 사슬, SMAA 등)를 따라가되 텍스처·재질·지오메트리·형식 배열 안으로는
 * 들어가지 않는다. 화면 크기와 해상도 배율에 따라 바뀌므로 준비된 순간의 값이다.
 */
export function renderTargetBytes(root: object): number {
  const seen = new Set<object>();
  let total = 0;
  const visit = (value: unknown, depth: number) => {
    if (!value || typeof value !== "object" || seen.has(value) || depth > 8 || ArrayBuffer.isView(value)) return;
    seen.add(value);
    const item = value as {
      isWebGLRenderTarget?: boolean;
      isTexture?: boolean;
      isMaterial?: boolean;
      isBufferGeometry?: boolean;
      isObject3D?: boolean;
      width?: number;
      height?: number;
      depthBuffer?: boolean;
      texture?: { type?: number };
    };
    if (item.isWebGLRenderTarget) {
      const pixels = (item.width ?? 0) * (item.height ?? 0);
      total += pixels * pixelBytes(item.texture ?? {}) + (item.depthBuffer ? pixels * 4 : 0);
      return;
    }
    if (item.isTexture || item.isMaterial || item.isBufferGeometry || item.isObject3D) return;
    if (Array.isArray(value)) {
      for (const entry of value) visit(entry, depth + 1);
      return;
    }
    for (const [key, entry] of Object.entries(value)) if (!SKIP_KEYS.has(key)) visit(entry, depth + 1);
  };
  visit(root, 0);
  return total;
}

/** 후처리 효과 중 통계가 읽고 경량이 바꾸는 블룸 값(postprocessing BloomEffect의 필드) */
export interface BloomProbe {
  mipmapBlurPass: { levels: number };
  luminancePass: { resolution: { scale: number } };
}

let latestHolograms: HologramStats | null = null;
let latestLandscape: LandscapeStats | null = null;
let latestPostprocessing: { composer: object | null; bloom: BloomProbe | null } | null = null;

```

`src/components/journey/scene/frameStats.ts`에서 찾을 부분:

```ts
  if (stats) stats.landscape = landscape;
}
```

바꿀 내용:

```ts
  if (stats) stats.landscape = landscape;
}

/** 후처리(EffectComposer와 블룸)를 넘긴다. 준비된 순간에 렌더 타깃 메모리와 블룸 값을 읽는다. 장면을 내리면 null */
export function recordPostprocessing(postprocessing: { composer: object | null; bloom: BloomProbe | null } | null): void {
  latestPostprocessing = postprocessing;
}
```

`src/components/journey/scene/frameStats.ts`에서 찾을 부분:

```ts
    landscape: latestLandscape,
  };
```

바꿀 내용:

```ts
    landscape: latestLandscape,
    quality: null,
    renderTargetBytes: 0,
  };
```

`src/components/journey/scene/frameStats.ts`에서 찾을 부분:

```ts
      stats.textureBytes = sceneTextureBytes(scene);
    },
```

바꿀 내용:

```ts
      stats.textureBytes = sceneTextureBytes(scene);
      const sky = scene.getObjectByName("journey-sky") as Mesh | undefined;
      const galaxy = (sky?.material as ShaderMaterial | undefined)?.uniforms.uGalaxy?.value as Texture | undefined;
      const bloom = latestPostprocessing?.bloom ?? null;
      stats.quality = {
        tier: detectTier(),
        dpr: gl.getPixelRatio(),
        galaxyWidth: (galaxy?.image as { width?: number } | undefined)?.width ?? 0,
        bloomLevels: bloom?.mipmapBlurPass.levels ?? 0,
        luminanceScale: bloom?.luminancePass.resolution.scale ?? 0,
      };
      stats.renderTargetBytes = latestPostprocessing?.composer ? renderTargetBytes(latestPostprocessing.composer) : 0;
    },
```

- [ ] **Step 8: 단위 통과를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4 src/lib/journey/capability.test.ts src/components/journey/scene/frameStats.test.ts`
Expected: PASS — `Tests  20 passed (20)`

- [ ] **Step 9: e2e 통과를 확인한다**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`·`3000`은 무시)

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts -g "배율 2·은하|tier=2d면|터치\)는 3D 경량"` (Playwright가 매번 `next build`부터 한다. 2~4분)
Expected: PASS — `6 passed`(전체: 배율 2·은하 4096·블룸 8단계·휘도 1, 경량: 배율 1.5·은하 2048·블룸 6단계·휘도 0.5, 텍스처 34.3~35.3MiB, 경량 렌더 타깃이 더 작다)

- [ ] **Step 10: 전체 확인**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`·`3000`은 무시)

Run: `rtk proxy npx tsc --noEmit` → exit 0
Run: `rtk proxy npx vitest run --maxWorkers=4` → `Tests  392 passed (392)`
Run: `rtk proxy npx eslint src/lib/journey/capability.ts src/lib/journey/capability.test.ts src/lib/journey/space.ts scripts/build-galaxy.ts src/components/journey/JourneyStage.tsx src/components/journey/scene/Scene.tsx src/components/journey/scene/Sky.tsx src/components/journey/scene/Effects.tsx src/components/journey/scene/frameStats.ts src/components/journey/scene/frameStats.test.ts e2e/journey.e2e.ts` → exit 0, 문제 0(`baseline-browser-mapping` 안내 한 줄은 린트 결과가 아니다)

- [ ] **Step 11: 커밋 정리를 제출한다**

파일별 변경 표와 메시지 초안. 초안 예:

```
feat: 여정 3D 경량(해상도 배율 1.5·은하 2048·줄인 블룸)과 2D 판정 연결

- 휴대폰·태블릿은 해상도 배율 상한 1.5, 은하 2048, 휘도 절반 해상도·6단계 블룸으로 그리고 길·차·풍경·홀로그램 연출은 그대로 둔다
- 2D 기기는 장면 청크·은하·차를 내려받지 않는다(세로 타임라인은 2-4b)
- ?debug=stats에 기기 단계·실제 배율·은하 폭·블룸 값과 후처리 렌더 타깃 메모리를 낸다(텍스처 예산과 따로)
```

---

### Task 3: 세로 화면 카메라와 카드 고르기(`lens.ts`, `portrait.ts`)

스펙 3절 "세로 화면 (2-4a)"의 순수 부분이다. 렌즈(세로 시야각 58°, 투영 중심 위 29%)와 렌즈를 넣은 투영을 `lens.ts`에 두고, 풍경의 `projectPoint`가 이를 쓴다(기본은 가로 화면 렌즈라 기존 결과가 같다). `portrait.ts`는 세로 화면 카메라를 차 둘레의 방위각·거리·높이와 차 기준 시선으로 정하고(주행: 차 뒤 9m·높이 3.4m, 정류장: 홀로그램에서 차를 지나 13m·높이 3.5m), 감쇠는 방위각·정류장 구도·내려다보기 정도에만 건다(`followPortrait`, 계획 머리말 1~4). 1막은 세로 화면에서만 정류장 30~70%에서 돌아본다. 엔딩은 길 전체가 y 0.10~0.57에 드는 자리다. 아래 고정 카드 고르기(`activeCard`)와 카드가 보이는 대표 진행률(`cardProgress`)도 여기에 둔다(PiCKCARE 저장소 카드는 `pickcareFront`와 같은 저장소).

**Files:**
- Create: `src/lib/journey/lens.ts`, `src/lib/journey/portrait.test.ts`, `src/lib/journey/portrait.ts`
- Modify: `src/lib/journey/landscape.ts`

**Interfaces:**
- Consumes: `CAMERA_DAMPING`·`carCenter`·`driveAt`·`fromCarFrame`·`toCarFrame`·`CameraPose`·`DriveState`·`RoadFrame`(drive.ts), `damp`(damp.ts), `FRONT_LEAD`·`HOLOGRAMS`·`REPO_COUNT`·`hologramsAt`·`pickcareFront`(holograms.ts), `CAMERA_FOV`·`HALL_REPO_END`·`HALL_REPO_START`·`STOPS`·`overviewWeight`·`rangeOf`·`smoothstep`·`stopAt`·`viewWeight`(timeline.ts)
- Produces: `interface Lens { fov; center }`, `WIDE_LENS = { fov: 50, center: 0.5 }`, `PORTRAIT_LENS = { fov: 58, center: 0.29 }`, `isPortrait(width, height)`, `lensFor(width, height): Lens`, `projectThrough(pose, point, aspect, lens): { x; y; depth }`(lens.ts), `projectPoint(pose, point, aspect, lens = WIDE_LENS)`(landscape.ts), `PORTRAIT`, `stopFocus(progress, hash?)`, `portraitViewWeight(progress)`, `interface PortraitView { angle; stopAngle; target; overview }`, `portraitGoal(state, hash?, previous?)`, `portraitPose(car, view)`, `portraitCamera(state, hash?)`, `followPortrait(follow, state, dt, hash?)`, `HALL_INTRO_LEAD = 0.25`, `CARDS`(16개), `activeCard(progress, hash): string | null`, `cardProgress(card): number`(portrait.ts)

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/lib/journey/portrait.test.ts` 전체:

```ts
import { describe, expect, it } from "vitest";
import { ROAD_END, ROAD_START, driveAt, roadFrame, roadPoint, stopScreenSide, type CameraPose } from "./drive";
import { HOLOGRAMS, hologramsAt, imageCorners, pickcareFront } from "./holograms";
import { PORTRAIT_LENS, WIDE_LENS, lensFor, projectThrough } from "./lens";
import { CARDS, activeCard, cardProgress, followPortrait, portraitCamera, portraitViewWeight, type PortraitView } from "./portrait";
import { SCROLL_LENGTH, STOP_RANGES, rangeOf, stopAt, viewWeight, type Vec3 } from "./timeline";

/** 세로 화면 네 크기(스펙 3절 "세로 화면") */
const SIZES = [
  [390, 844],
  [360, 800],
  [430, 932],
  [820, 1180],
] as const;
/** 헤더(56px)와 그 아래 세로 화면 진행 막대(24px)의 아래끝(px) */
const TOP_PX = 80;
/** 화면 위 60%: 아래 40%는 본문 카드 자리다 */
const LIMIT = 0.6;

function at(id: string, within: number): number {
  const range = rangeOf(id);
  return range.start + (range.end - range.start) * within;
}

/** 차 몸통을 감싸는 상자의 꼭짓점 여덟(차 자리 기준: 뒤 1.94·앞 2.42m, 양옆 1m, 높이 1.3m) */
function carBody(progress: number): Vec3[] {
  const { car } = driveAt(progress);
  const points: Vec3[] = [];
  for (const forward of [-1.94, 2.42]) {
    for (const side of [-1, 1]) {
      for (const up of [0, 1.3]) {
        points.push([0, 1, 2].map((i) => car.position[i] + car.tangent[i] * forward + car.right[i] * side + car.up[i] * up) as Vec3);
      }
    }
  }
  return points;
}

/** 정류장 홀로그램(PiCKCARE는 앞줄 하나)의 그림 영역 네 모서리 */
function hologramImage(progress: number, pose: CameraPose): Vec3[] {
  const { range } = stopAt(progress);
  const front = pickcareFront(progress, "");
  const placements = hologramsAt(progress, front);
  const indices = HOLOGRAMS.flatMap((hologram, index) => (hologram.stopId === range.stop.id ? [index] : []));
  const shown = range.stop.kind === "hall" ? [indices[front]] : indices;
  return shown.flatMap((index) => imageCorners(HOLOGRAMS[index], placements[index], pose.position));
}

/** 정류장 읽기 자리: 프로젝트 정류장은 30·50·70%, PiCKCARE는 저장소마다 카드가 보이는 자리 */
const READING: { label: string; progress: number }[] = [
  ...STOP_RANGES.filter((range) => range.stop.kind === "project").flatMap((range) =>
    [0.3, 0.5, 0.7].map((within) => ({ label: `${range.stop.id} ${within}`, progress: at(range.stop.id, within) })),
  ),
  ...HOLOGRAMS.filter((hologram) => hologram.act === 3).map((hologram) => ({ label: hologram.id, progress: cardProgress(hologram.id) })),
];

function bounds(points: Vec3[], pose: CameraPose, aspect: number) {
  const screen = points.map((point) => projectThrough(pose, point, aspect, PORTRAIT_LENS));
  return {
    left: Math.min(...screen.map((item) => item.x)),
    right: Math.max(...screen.map((item) => item.x)),
    top: Math.min(...screen.map((item) => item.y)),
    bottom: Math.max(...screen.map((item) => item.y)),
    behind: screen.some((item) => item.depth <= 0),
  };
}

describe("렌즈", () => {
  it("가로가 세로보다 좁으면 세로 화면 렌즈(세로 시야각 58°, 투영 중심 위 29%), 아니면 가로 화면 렌즈다", () => {
    expect(PORTRAIT_LENS).toEqual({ fov: 58, center: 0.29 });
    expect(WIDE_LENS).toEqual({ fov: 50, center: 0.5 });
    expect(lensFor(390, 844)).toBe(PORTRAIT_LENS);
    expect(lensFor(820, 1180)).toBe(PORTRAIT_LENS);
    expect(lensFor(1440, 900)).toBe(WIDE_LENS);
    expect(lensFor(800, 800)).toBe(WIDE_LENS);
  });

  it("시선 목표는 화면 가로 가운데, 위에서 투영 중심 비율 자리에 맺힌다", () => {
    const pose = portraitCamera(driveAt(at("stock2u", 0.5)));
    const target = projectThrough(pose, pose.target, 390 / 844, PORTRAIT_LENS);
    expect(target.x).toBeCloseTo(0.5, 9);
    expect(target.y).toBeCloseTo(0.29, 9);
  });
});

describe("세로 화면 카메라 목표 자세", () => {
  it("같은 진행률이면 같은 자세이고, 가로 화면 자세(driveAt의 camera)는 그대로다", () => {
    for (const progress of [0, 0.1, at("kokoa-clone", 0.5), at("pfplay", 0.9), at("pickcare", 0.5), 1]) {
      const state = driveAt(progress);
      const before = JSON.stringify(state.camera);
      expect(portraitCamera(state)).toEqual(portraitCamera(driveAt(progress)));
      expect(JSON.stringify(state.camera)).toBe(before);
    }
  });

  it("네 화면 크기의 정류장 읽기 자리에서 차 몸통 전체와 홀로그램 그림 영역 전체가 헤더 아래·화면 위 60% 안이다", () => {
    for (const [width, height] of SIZES) {
      const top = TOP_PX / height;
      for (const { label, progress } of READING) {
        const pose = portraitCamera(driveAt(progress));
        const all = bounds([...carBody(progress), ...hologramImage(progress, pose)], pose, width / height);
        const name = `${width}x${height} ${label}`;
        expect(all.behind, name).toBe(false);
        expect(all.left, name).toBeGreaterThan(0);
        expect(all.right, name).toBeLessThan(1);
        expect(all.top, name).toBeGreaterThan(top);
        expect(all.bottom, name).toBeLessThan(LIMIT);
      }
    }
  });

  it("엔딩에서 길 전체가 헤더 아래부터 화면 위 60% 안(y 0.10~0.57, x 0.03~0.97)에 든다", () => {
    const pose = portraitCamera(driveAt(1));
    const road: Vec3[] = [];
    for (let s = ROAD_START; s <= ROAD_END; s += 2) {
      const half = roadFrame(s).width / 2;
      road.push(roadPoint(s, -half), roadPoint(s, half));
    }
    for (const [width, height] of SIZES) {
      const all = bounds(road, pose, width / height);
      const name = `${width}x${height}`;
      expect(all.left, name).toBeGreaterThan(0.03);
      expect(all.right, name).toBeLessThan(0.97);
      expect(all.top, name).toBeGreaterThan(0.1);
      expect(all.bottom, name).toBeLessThan(0.57);
    }
  });

  it("정류장마다 카메라는 홀로그램 반대쪽으로만 돈다(경계에서 도는 방향이 뒤집히지 않는다)", () => {
    for (const range of STOP_RANGES) {
      if (!HOLOGRAMS.some((hologram) => hologram.stopId === range.stop.id)) continue;
      for (let within = 0; within <= 1; within += 0.01) {
        const progress = range.start + (range.end - range.start) * within;
        if (portraitViewWeight(progress) < 0.02) continue;
        const state = driveAt(progress);
        const pose = portraitCamera(state);
        const offset = [0, 1, 2].map((i) => pose.position[i] - state.car.position[i]);
        const side = Math.sign(offset[0] * state.car.right[0] + offset[1] * state.car.right[1] + offset[2] * state.car.right[2]);
        expect(side, `${range.stop.id} ${within.toFixed(2)}`).toBe(-stopScreenSide(range.stop));
      }
    }
  });

  it("1막(멈추지 않는 정류장)은 세로 화면에서만 정류장 30~70%에서 홀로그램 쪽으로 돌고 앞뒤 끝에서는 돌지 않는다. 멈추는 정류장은 viewWeight 그대로다", () => {
    for (const id of ["kokoa-clone", "todo-app", "eutcha"]) {
      expect(portraitViewWeight(at(id, 0)), id).toBe(0);
      expect(portraitViewWeight(at(id, 1)), id).toBe(0);
      expect(portraitViewWeight(at(id, 0.3)), id).toBe(1);
      expect(portraitViewWeight(at(id, 0.7)), id).toBe(1);
      expect(viewWeight(at(id, 0.5)), id).toBe(0);
    }
    for (const progress of [at("stock2u", 0.1), at("tix2u", 0.5), at("pickcare", 0.05), at("act-2", 0.5)]) {
      expect(portraitViewWeight(progress)).toBe(viewWeight(progress));
    }
  });

  it("PFPlay에서 주행으로 돌아오는 전환과 여정 전체를 빠르게 앞뒤로 지나도(60·120Hz) 차 몸통이 화면 높이의 35% 이하이고 가운데가 x 0.15~0.85다", () => {
    const ranges: [number, number, number][] = [
      [at("pfplay", 0.5), at("act-3", 1), 1],
      [at("act-3", 1), at("pfplay", 0.5), 1],
      [0, at("ending", 0), 0.5],
      [at("ending", 0), 0, 0.5],
    ];
    for (const [from, to, secondsPerScreen] of ranges) {
      for (const hz of [60, 120]) {
        const step = (to > from ? 1 : -1) / (SCROLL_LENGTH * secondsPerScreen * hz);
        let follow: PortraitView | null = null;
        for (let progress = from; to > from ? progress <= to : progress >= to; progress += step) {
          const state = driveAt(progress);
          const next = followPortrait(follow, state, 1 / hz);
          follow = next.follow;
          const car = bounds(carBody(progress), next.pose, 390 / 844);
          const name = `${hz}Hz ${from.toFixed(3)}→${to.toFixed(3)} p=${progress.toFixed(4)}`;
          expect(car.behind, name).toBe(false);
          expect(car.bottom - car.top, name).toBeLessThanOrEqual(0.35);
          expect((car.left + car.right) / 2, name).toBeGreaterThan(0.15);
          expect((car.left + car.right) / 2, name).toBeLessThan(0.85);
        }
      }
    }
  });
});

describe("아래 고정 카드", () => {
  it("정류장 가운데에서는 그 정류장의 카드이고, 엔딩에는 카드가 없다", () => {
    for (const range of STOP_RANGES) {
      const middle = (range.start + range.end) / 2;
      if (range.stop.kind === "ending") expect(activeCard(middle, "")).toBeNull();
      else if (range.stop.kind !== "hall") expect(activeCard(middle, ""), range.stop.id).toBe(range.stop.id);
    }
  });

  it("PiCKCARE는 저장소 패널 구간 0.25화면 앞까지 소개 카드, 그 뒤로는 홀로그램 앞줄(pickcareFront)과 같은 저장소 카드다", () => {
    const range = rangeOf("pickcare");
    for (let index = 0; index < 200; index++) {
      const within = index / 200;
      const progress = range.start + (range.end - range.start) * within;
      const screens = within * range.stop.length;
      // 경계(0.95화면)는 진행률 환산의 반올림으로 어느 쪽이든 될 수 있어 건너뛴다
      if (Math.abs(screens - (1.2 - 0.25)) < 1e-6) continue;
      const expected = screens < 1.2 - 0.25 ? "pickcare" : HOLOGRAMS.filter((hologram) => hologram.act === 3)[pickcareFront(progress, "")].id;
      expect(activeCard(progress, ""), within.toFixed(3)).toBe(expected);
    }
    expect(activeCard(at("pickcare", 0.5), "#pickcare/app")).toBe("pickcare/app");
  });

  it("카드마다 보이는 자리(cardProgress)에서 그 카드가 고른다", () => {
    expect(CARDS).toHaveLength(16);
    for (const card of CARDS) expect(activeCard(cardProgress(card), ""), card).toBe(card);
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4 src/lib/journey/portrait.test.ts`
Expected: FAIL — `Error: Cannot find module './lens' imported from …/portrait.test.ts`(Tests no tests)

- [ ] **Step 3: 렌즈와 세로 화면 모듈을 쓰고 풍경 투영을 렌즈 모듈로 넘긴다**

`src/lib/journey/lens.ts` 전체:

```ts
import type { CameraPose } from "./drive";
import { CAMERA_FOV, type Vec3 } from "./timeline";

/**
 * 카메라 렌즈(스펙 3절 "세로 화면 (2-4a)"): 세로 시야각(°)과 투영 중심(시선이 맺히는 자리)의 화면 위에서의 비율.
 * 세로 화면(가로가 세로보다 좁다)은 시야각을 넓히고 투영 중심을 위로 올려 화면 위 60%에 차와 홀로그램을, 아래 40%에 본문 카드를 둔다.
 * 장면은 three PerspectiveCamera의 fov와 setViewOffset으로 같은 투영을 만든다(scene/CameraRig). three를 import하지 않는다.
 */
export interface Lens {
  fov: number;
  center: number;
}

export const WIDE_LENS: Lens = { fov: CAMERA_FOV, center: 0.5 };
export const PORTRAIT_LENS: Lens = { fov: 58, center: 0.29 };

export function isPortrait(width: number, height: number): boolean {
  return width < height;
}

export function lensFor(width: number, height: number): Lens {
  return isPortrait(width, height) ? PORTRAIT_LENS : WIDE_LENS;
}

function normalize(a: Vec3): Vec3 {
  const length = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / length, a[1] / length, a[2] / length];
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/**
 * 점이 맺히는 화면 좌표(0~1, 왼쪽·위가 0)와 시선 방향 깊이. 카메라는 수평을 유지한다(three lookAt, 위쪽 +y).
 * 투영 중심이 0.5가 아니면 화면 전체가 위아래로 옮겨진 것과 같다(setViewOffset).
 */
export function projectThrough(pose: CameraPose, point: Vec3, aspect: number, lens: Lens): { x: number; y: number; depth: number } {
  const f = normalize([pose.target[0] - pose.position[0], pose.target[1] - pose.position[1], pose.target[2] - pose.position[2]]);
  const right = normalize([-f[2], 0, f[0]]);
  const up: Vec3 = [right[1] * f[2] - right[2] * f[1], right[2] * f[0] - right[0] * f[2], right[0] * f[1] - right[1] * f[0]];
  const offset: Vec3 = [point[0] - pose.position[0], point[1] - pose.position[1], point[2] - pose.position[2]];
  const depth = dot(offset, f);
  const tan = Math.tan((lens.fov / 2) * (Math.PI / 180));
  return {
    x: 0.5 + dot(offset, right) / depth / (tan * aspect) / 2,
    y: lens.center - dot(offset, up) / depth / tan / 2,
    depth,
  };
}
```

`src/lib/journey/landscape.ts`에서 찾을 부분:

```ts
import { HOLOGRAMS, hologramsAt, luminance, pickcareFront } from "./holograms";
import { CAMERA_FOV, pathSpan, rangeOf, smoothstep, type Vec3 } from "./timeline";
import { trailColor, type LinearRgb } from "./trail";
```

바꿀 내용:

```ts
import { HOLOGRAMS, hologramsAt, luminance, pickcareFront } from "./holograms";
import { WIDE_LENS, projectThrough, type Lens } from "./lens";
import { pathSpan, rangeOf, smoothstep, type Vec3 } from "./timeline";
import { trailColor, type LinearRgb } from "./trail";
```

`src/lib/journey/landscape.ts`에서 찾을 부분:

```ts
 * 카메라 자리(위치·목표)에서 본 점의 화면 자리. x·y는 화면 비율(왼쪽 위 0, 오른쪽 아래 1), depth는 시선 방향 거리(m, 뒤면 음수).
 * aspect는 가로/세로. 장면 카메라와 같은 세로 시야각(CAMERA_FOV)이고 위쪽은 +y다.
 */
export function projectPoint(pose: CameraPose, point: Vec3, aspect: number): { x: number; y: number; depth: number } {
  const f = normalize([pose.target[0] - pose.position[0], pose.target[1] - pose.position[1], pose.target[2] - pose.position[2]]);
  const right = normalize([-f[2], 0, f[0]]);
  const up: Vec3 = [right[1] * f[2] - right[2] * f[1], right[2] * f[0] - right[0] * f[2], right[0] * f[1] - right[1] * f[0]];
  const offset: Vec3 = [point[0] - pose.position[0], point[1] - pose.position[1], point[2] - pose.position[2]];
  const depth = dot(offset, f);
  const tan = Math.tan((CAMERA_FOV / 2) * (Math.PI / 180));
  return {
    x: 0.5 + dot(offset, right) / depth / (tan * aspect) / 2,
    y: 0.5 - dot(offset, up) / depth / tan / 2,
    depth,
  };
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function normalize(a: Vec3): Vec3 {
  const length = Math.hypot(a[0], a[1], a[2]);
  return [a[0] / length, a[1] / length, a[2] / length];
}
```

바꿀 내용:

```ts
 * 카메라 자리(위치·목표)에서 본 점의 화면 자리. x·y는 화면 비율(왼쪽 위 0, 오른쪽 아래 1), depth는 시선 방향 거리(m, 뒤면 음수).
 * aspect는 가로/세로. 렌즈를 주지 않으면 가로 화면 렌즈(세로 시야각 CAMERA_FOV, 투영 중심 가운데)이고 위쪽은 +y다(lens.ts).
 */
export function projectPoint(pose: CameraPose, point: Vec3, aspect: number, lens: Lens = WIDE_LENS): { x: number; y: number; depth: number } {
  return projectThrough(pose, point, aspect, lens);
}
```

`src/lib/journey/portrait.ts` 전체:

```ts
import { damp } from "./damp";
import { CAMERA_DAMPING, carCenter, driveAt, fromCarFrame, toCarFrame, type CameraPose, type DriveState, type RoadFrame } from "./drive";
import { FRONT_LEAD, HOLOGRAMS, REPO_COUNT, hologramsAt, pickcareFront } from "./holograms";
import { HALL_REPO_END, HALL_REPO_START, STOPS, overviewWeight, rangeOf, smoothstep, stopAt, viewWeight, type Vec3 } from "./timeline";

/**
 * 세로 화면(스펙 3절 "세로 화면 (2-4a)"). 세계 속 차·홀로그램·풍경의 자리와 가로 화면 카메라(driveAt의 camera)는 그대로 두고,
 * 세로 화면에서 따라갈 카메라 목표 자세와 아래 고정 카드를 정한다. 렌즈(시야각·투영 중심)는 lens.ts다. 순수 함수이고 three를 import하지 않는다.
 *
 * 카메라는 차 둘레의 방위각(0이면 차 바로 뒤, +면 차의 오른쪽)·수평 거리·노면 위 높이로 놓고, 시선 목표는 차 기준 좌표로 둔다. 주행 구도와
 * 정류장 구도 사이를 "정류장 시점으로 돈 정도" 하나로 보간하고 감쇠도 그 값에 건다(followPortrait). 그래서 카메라가 차를 가로지르지 않고,
 * 감쇠 중에도 차가 화면 가운데 근처에 있다(차 기준 직교 좌표로 감쇠하면 PFPlay 끝과 빠른 스크롤에서 차가 화면을 채우거나 화면 밖으로 밀렸다).
 */
export const PORTRAIT = {
  /** 주행: 차 뒤 back(m)·노면 위 height(m)에서 차 가운데의 정면 방향 ahead(m) 앞, 높이 aheadHeight(m)를 본다 */
  chase: { back: 9, height: 3.4, ahead: 14, aheadHeight: -0.6 },
  /**
   * 정류장: 홀로그램에서 차를 지나 distance(m) 너머, 노면 위 height(m). 시선은 차 가운데와 홀로그램 사이 mix. 도는 도중 시선은 돈 정도의
   * targetEase 제곱만큼만 정류장 시선으로 옮긴다(1이면 2막·PiCKCARE에서 도는 도중 차가 화면 가로 0.14·0.89까지 밀렸다)
   */
  stop: { distance: 13, height: 3.5, mix: 0.5, targetEase: 2 },
  /** 1막(멈추지 않는 정류장)에서 홀로그램 쪽으로 도는 구간: 정류장 안 위치가 0 → rise에서 다 돌고, fall → 1에서 돌아온다 */
  glance: { rise: 0.3, fall: 0.7 },
  /**
   * 엔딩 내려다보기: 가로 화면(OVERVIEW)과 같은 각도로, 길 전체가 헤더 아래부터 화면 위 60% 안(y 0.10~0.57)에 들도록 거리(약 433m,
   * 카메라 먼 끝 600m 안)와 시선을 맞췄다. 길이 앞뒤로 긴 모양이라 세로로 길게 보인다(390×844에서 x 0.375~0.625)
   */
  overview: { position: [27.4, 392.6, 94.3] as Vec3, target: [12.5, 14.4, -116.3] as Vec3 },
} as const;

function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function scale(a: Vec3, k: number): Vec3 {
  return [a[0] * k, a[1] * k, a[2] * k];
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerp3(a: Vec3, b: Vec3, t: number): Vec3 {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

/** 정류장의 홀로그램 자리(없으면 null). 1·2막은 그 정류장 홀로그램, PiCKCARE는 지금 앞줄. 다 떠오른 자리(정류장 가운데)다 */
export function stopFocus(progress: number, hash = ""): Vec3 | null {
  const { range } = stopAt(progress);
  const indices = HOLOGRAMS.flatMap((hologram, index) => (hologram.stopId === range.stop.id ? [index] : []));
  if (indices.length === 0) return null;
  const front = pickcareFront(progress, hash);
  const placements = hologramsAt((range.start + range.end) / 2, front);
  return placements[range.stop.kind === "hall" ? indices[front] : indices[0]].center;
}

/** 세로 화면에서 정류장 시점으로 도는 정도. 멈추는 정류장은 viewWeight 그대로, 1막(멈추지 않는 프로젝트 정류장)은 가운데에서 홀로그램 쪽으로 돈다 */
export function portraitViewWeight(progress: number): number {
  const { range, t } = stopAt(progress);
  if (range.stop.pin || range.stop.kind !== "project") return viewWeight(progress);
  return smoothstep(0, PORTRAIT.glance.rise, t) * (1 - smoothstep(PORTRAIT.glance.fall, 1, t));
}

/** 차 둘레 자리: 방위각 angle(0이면 차 바로 뒤, +면 차의 오른쪽), 수평 거리 distance, 노면 위 height */
function orbit(car: RoadFrame, angle: number, distance: number, height: number): Vec3 {
  const back = scale(car.tangent, -distance * Math.cos(angle));
  const aside = scale(car.right, distance * Math.sin(angle));
  return add(add(add(car.position, back), aside), scale(car.up, height));
}

/**
 * 주행 시선 목표(차 기준 좌표: 오른쪽, 노면 위, 앞): 차 가운데의 정면 방향 ahead 앞, 높이 aheadHeight. 카메라가 차 둘레를 angle만큼 돌면
 * 이 목표도 차 둘레로 같이 돌린다(주행 구도를 통째로 돌린다). 그래야 정류장으로 도는 도중에도 차가 화면 가운데 근처에 있다
 */
function chaseTarget(car: RoadFrame, angle: number): Vec3 {
  const center = carCenter(car);
  const [x, y, z] = toCarFrame(car, add(add(center, scale(car.tangent, PORTRAIT.chase.ahead)), scale(car.up, PORTRAIT.chase.aheadHeight)));
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [x * cos - z * sin, y, x * sin + z * cos];
}

/** 정류장 구도를 재는 구간(정류장 안의 위치): 1막은 돌아보기 구간, 멈추는 정류장은 차가 서 있는 구간 */
const VIEW_WINDOW = { glance: [PORTRAIT.glance.rise, PORTRAIT.glance.fall], dwell: [0.25, 0.75] } as const;

/**
 * 정류장 구도(차 기준): 홀로그램에서 차를 지나는 방향의 방위각과 시선 목표(차 가운데와 홀로그램 사이). 구도를 재는 구간 안에서는 지금 차
 * 자리로, 그 앞뒤에서는 구간 끝의 차 자리로 잰다. 지금 차 자리로만 재면 차가 정류장을 떠나는 동안 홀로그램이 차 뒤로 가며 카메라가 차
 * 앞쪽으로 돌았고, 정류장 가운데로만 재면 1막(차가 계속 달린다)의 읽기 구간 끝에서 홀로그램이 화면 밖으로 밀렸다
 */
function stopView(progress: number, hash: string): { angle: number; target: Vec3 } | null {
  const focus = stopFocus(progress, hash);
  if (!focus) return null;
  const { range, t } = stopAt(progress);
  const [from, to] = range.stop.pin ? VIEW_WINDOW.dwell : VIEW_WINDOW.glance;
  const car = driveAt(range.start + (range.end - range.start) * Math.min(to, Math.max(from, t))).car;
  const local = toCarFrame(car, focus);
  return { angle: Math.atan2(-local[0], local[2]), target: lerp3(toCarFrame(car, carCenter(car)), local, PORTRAIT.stop.mix) };
}

/**
 * 세로 화면 카메라의 상태(목표와, 감쇠해 따라가는 값). 카메라의 방위각, 지금 정류장 구도(정류장 방위각, 차 기준 시선 목표), 엔딩 내려다보기 정도.
 * 정류장 시점으로 돈 정도는 방위각 ÷ 정류장 방위각이라, 감쇠 중에도 거리·높이·시선이 카메라 자리에 맞게 따라온다(차를 가로지르지 않고 화면에 남는다)
 */
export interface PortraitView {
  angle: number;
  stopAngle: number;
  target: Vec3;
  overview: number;
}

/** 정류장 시점으로 돈 정도(0~1): 방위각이 정류장 방위각까지 간 비율. 반대쪽이거나 정류장이 없으면 0(주행 구도를 통째로 돌린 것) */
function turned(view: PortraitView): number {
  return view.stopAngle === 0 ? 0 : Math.min(1, Math.max(0, view.angle / view.stopAngle));
}

/**
 * 세로 화면 카메라 목표. 같은 진행률(과 같은 해시)이면 같은 목표다. hash는 PiCKCARE 앞줄을 정하는 주소 해시다(상세가 열려 있으면 그 저장소를 본다).
 * 정류장 방위각은 홀로그램 반대쪽이라 도는 방향이 정류장마다 정해져 있다. 홀로그램이 없는 구간은 previous의 구도를 그대로 둔다
 */
export function portraitGoal(state: DriveState, hash = "", previous: PortraitView | null = null): PortraitView {
  const view = stopView(state.progress, hash);
  return {
    angle: view ? view.angle * portraitViewWeight(state.progress) : 0,
    stopAngle: view?.angle ?? previous?.stopAngle ?? 0,
    target: view?.target ?? previous?.target ?? chaseTarget(state.car, 0),
    overview: overviewWeight(state.progress),
  };
}

/** 상태를 지금 차 자세에서 월드 자세로 바꾼다. 엔딩에서는 내려다보는 자리로 옮긴다 */
export function portraitPose(car: RoadFrame, view: PortraitView): CameraPose {
  const weight = turned(view);
  const position = orbit(
    car,
    view.angle,
    lerp(PORTRAIT.chase.back, PORTRAIT.stop.distance, weight),
    lerp(PORTRAIT.chase.height, PORTRAIT.stop.height, weight),
  );
  const target = fromCarFrame(car, lerp3(chaseTarget(car, view.angle), view.target, Math.pow(weight, PORTRAIT.stop.targetEase)));
  if (view.overview === 0) return { position, target };
  return {
    position: lerp3(position, PORTRAIT.overview.position, view.overview),
    target: lerp3(target, PORTRAIT.overview.target, view.overview),
  };
}

/** 세로 화면 카메라 목표 자세(감쇠 없이) */
export function portraitCamera(state: DriveState, hash = ""): CameraPose {
  return portraitPose(state.car, portraitGoal(state, hash));
}

/**
 * 세로 화면 카메라 한 프레임(scene/CameraRig). 방위각·정류장 시선 목표·내려다보기 정도를 프레임 간격으로 감쇠한다(가로 화면과 같은 감쇠 세기).
 * 정류장 방위각은 감쇠하지 않는다(정류장이 바뀔 때 방위각이 반대쪽이면 돈 정도가 0이 되어 주행 구도로 돈다). 차의 움직임은 그대로 따라간다.
 * follow가 null이면(첫 프레임) 목표에 바로 놓는다.
 */
export function followPortrait(follow: PortraitView | null, state: DriveState, dt: number, hash = ""): { follow: PortraitView; pose: CameraPose } {
  const goal = portraitGoal(state, hash, follow);
  const next: PortraitView = follow
    ? {
        angle: damp(follow.angle, goal.angle, CAMERA_DAMPING.position, dt),
        stopAngle: goal.stopAngle,
        target: [
          damp(follow.target[0], goal.target[0], CAMERA_DAMPING.target, dt),
          damp(follow.target[1], goal.target[1], CAMERA_DAMPING.target, dt),
          damp(follow.target[2], goal.target[2], CAMERA_DAMPING.target, dt),
        ],
        overview: damp(follow.overview, goal.overview, CAMERA_DAMPING.position, dt),
      }
    : goal;
  return { follow: next, pose: portraitPose(state.car, next) };
}

// ── 아래 고정 카드 ─────────────────────────────────────────

/** PiCKCARE 저장소 카드(홀로그램 id와 같다: pickcare/<저장소>) */
const REPO_CARDS = HOLOGRAMS.filter((hologram) => hologram.act === 3).map((hologram) => hologram.id);

/** PiCKCARE 소개 카드는 저장소 패널 구간이 시작하기 이만큼(화면) 앞까지 보인다 */
export const HALL_INTRO_LEAD = 0.25;

/** 세로 화면 아래 고정 자리의 카드: 엔딩을 뺀 정류장마다 하나, PiCKCARE는 소개와 저장소 다섯 */
export const CARDS: readonly string[] = [...STOPS.filter((stop) => stop.kind !== "ending").map((stop) => stop.id), ...REPO_CARDS];

/** 지금 아래 고정 자리에 보일 카드(data-journey-card의 값). 엔딩에는 없다(연락처는 스크롤로 올라온다) */
export function activeCard(progress: number, hash: string): string | null {
  const { range, t } = stopAt(progress);
  if (range.stop.kind === "ending") return null;
  if (range.stop.kind !== "hall") return range.stop.id;
  if (t * range.stop.length < HALL_REPO_START - HALL_INTRO_LEAD) return range.stop.id;
  return REPO_CARDS[pickcareFront(progress, hash)];
}

/**
 * 카드가 보이는 대표 진행률(키보드 포커스가 보이지 않는 카드로 가면 여기로 스크롤한다). 정류장 가운데, PiCKCARE 소개는 소개 구간 가운데,
 * 저장소 카드는 앞줄 전환 사이의 가운데(저장소 진행률 u = (i + 0.5 − FRONT_LEAD)/5, 첫 저장소는 0)다
 */
export function cardProgress(card: string): number {
  const repo = REPO_CARDS.indexOf(card);
  const range = rangeOf(repo >= 0 ? "pickcare" : card);
  const length = range.stop.length;
  let within = 0.5;
  if (repo >= 0) {
    const u = Math.max(0, (repo + 0.5 - FRONT_LEAD) / REPO_COUNT);
    within = (HALL_REPO_START + u * (length - HALL_REPO_START - HALL_REPO_END)) / length;
  } else if (range.stop.kind === "hall") {
    within = (HALL_REPO_START - HALL_INTRO_LEAD) / 2 / length;
  }
  return range.start + (range.end - range.start) * within;
}
```

- [ ] **Step 4: 통과를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4 src/lib/journey/portrait.test.ts src/lib/journey/landscape.test.ts src/lib/journey/landscapeBuild.test.ts`
Expected: PASS — `Tests  41 passed (41)`(세로 화면 11, 풍경 30. 풍경 투영 결과는 그대로다)

- [ ] **Step 5: 전체 확인**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`·`3000`은 무시)

Run: `rtk proxy npx tsc --noEmit` → exit 0
Run: `rtk proxy npx vitest run --maxWorkers=4` → `Tests  403 passed (403)`
Run: `rtk proxy npx eslint src/lib/journey/lens.ts src/lib/journey/portrait.ts src/lib/journey/portrait.test.ts src/lib/journey/landscape.ts` → exit 0, 문제 0(`baseline-browser-mapping` 안내 한 줄은 린트 결과가 아니다)

- [ ] **Step 6: 커밋 정리를 제출한다**

파일별 변경 표와 메시지 초안. 초안 예:

```
feat: 여정 세로 화면 카메라와 아래 고정 카드 고르기 추가

- 세계 속 자리와 가로 화면 카메라는 그대로 두고, 세로 화면에서 따라갈 카메라를 차 둘레 방위각·거리·높이와 차 기준 시선으로 정한다
- 감쇠를 방위각과 정류장 구도에 걸어 빠른 스크롤에서도 카메라가 차를 가로지르지 않고 차가 화면 가운데 근처에 있다
- 네 화면 크기의 정류장 읽기 자리에서 차 몸통과 홀로그램 그림 전체가 헤더 아래·화면 위 60% 안이다(단위 테스트)
```

---

### Task 4: 장면에 세로 카메라 연결(`CameraRig`)

스펙 3절 "세로 화면"의 렌즈와 카메라를 장면에 건다. `CameraRig`는 화면 크기가 바뀔 때만 렌즈를 다시 건다(`fov`, 투영 중심은 `setViewOffset`이라 투영·광선·`project`가 모두 따른다). 세로 화면이면 `followPortrait`, 가로 화면이면 지금처럼 `followCamera`를 따라가고, 화면을 돌려 가로·세로가 바뀌면 새 카메라는 목표에 바로 놓인다. `?debug=stats`는 지난 프레임의 렌즈(`lens`)를 낸다.

**Files:**
- Modify: `e2e/journey.e2e.ts`, `src/components/journey/scene/CameraRig.tsx`, `src/components/journey/scene/Warmup.tsx`, `src/components/journey/scene/frameStats.ts`

**Interfaces:**
- Consumes: Task 3의 `isPortrait`, `lensFor`, `followPortrait`, `PortraitView`. `followCamera`·`CameraFollow`·`CameraPose`(drive.ts)
- Produces: `JourneyStats.lens: { fov; center }`, `createStatsRecorder(gl, scene, camera: PerspectiveCamera)`(frameStats.ts)

- [ ] **Step 1: 실패하는 e2e를 쓴다**

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts
  renderTargetBytes: number;
};
```

바꿀 내용:

```ts
  renderTargetBytes: number;
  lens: { fov: number; center: number };
};
```

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts

// ── 막별 풍경(2-3b, 스펙 1절 완료 조건과 3절 "막별 풍경") ───────────────────
```

바꿀 내용:

```ts

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

  test("화면을 가로로 돌리면 가로 렌즈로, 다시 세우면 세로 렌즈로 바뀐다", async ({ page }) => {
    await page.goto("/journey?debug=stats");
    await waitReady(page);
    await expect.poll(async () => (await readStats(page)).lens).toEqual({ fov: 58, center: 0.29 });
    await page.setViewportSize({ width: 844, height: 390 });
    await expect.poll(async () => (await readStats(page)).lens).toEqual({ fov: 50, center: 0.5 });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect.poll(async () => (await readStats(page)).lens).toEqual({ fov: 58, center: 0.29 });
  });
});

test("가로 화면은 지금 렌즈(시야각 50°, 투영 중심 가운데) 그대로다", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/journey?debug=stats");
  await waitReady(page);
  expect((await readStats(page)).lens).toEqual({ fov: 50, center: 0.5 });
});

// ── 막별 풍경(2-3b, 스펙 1절 완료 조건과 3절 "막별 풍경") ───────────────────
```

- [ ] **Step 2: e2e 실패를 확인한다**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`·`3000`은 무시)

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts -g "세로 렌즈\(시야각|가로로 돌리면|가로 화면은 지금 렌즈"` (Playwright가 매번 `next build`부터 한다. 2~4분)
Expected: FAIL — `6 failed`(두 프로젝트 × 3). `lens`가 없다: `Expected: {"center": 0.29, "fov": 58}, Received: undefined`

- [ ] **Step 3: 카메라와 통계를 잇는다**

`src/components/journey/scene/CameraRig.tsx`에서 찾을 부분:

```tsx
import { useRef } from "react";
import { followCamera, type CameraFollow } from "@/lib/journey/drive";
import { currentDrive } from "./driveFrame";

/**
 * 진행률이 정한 카메라 목표(driveAt의 camera)를 매 프레임 따라간다. 위치와 시선을 차 기준 좌표로 감쇠해(followCamera)
 * 차의 움직임은 그대로 따라가고 시점 전환만 부드럽게 한다. 그래서 거꾸로 스크롤해도 주행 중 카메라는 차 뒤에 있다.
 * 감쇠는 프레임 간격으로 계산해 60Hz·120Hz에서 같은 속도이고, 감쇠한 자리는 차 둘레 밖·노면 위로 민다(drive.test.ts가 앞뒤 스크롤로 확인한다).
 */
export function CameraRig() {
  const follow = useRef<CameraFollow | null>(null);

  useFrame((state, delta) => {
    // 첫 프레임(follow가 없을 때)은 목표 자세에 바로 놓는다. 원점에서 날아오는 연출을 막는다.
    const next = followCamera(follow.current, currentDrive(), delta);
    follow.current = next.follow;
    state.camera.position.set(...next.pose.position);
    state.camera.lookAt(...next.pose.target);
  });
```

바꿀 내용:

```tsx
import { useRef } from "react";
import type { PerspectiveCamera } from "three";
import { followCamera, type CameraFollow, type CameraPose } from "@/lib/journey/drive";
import { isPortrait, lensFor } from "@/lib/journey/lens";
import { followPortrait, type PortraitView } from "@/lib/journey/portrait";
import { currentDrive } from "./driveFrame";

/**
 * 진행률이 정한 카메라 목표를 매 프레임 따라간다. 가로 화면은 driveAt의 camera를 차 기준 좌표로 감쇠하고(followCamera),
 * 세로 화면(가로가 세로보다 좁다)은 세로 화면 카메라(followPortrait, 스펙 3절 "세로 화면 (2-4a)")를 따라간다.
 * 둘 다 차의 움직임은 그대로 따라가고 시점 전환만 부드럽게 한다. 감쇠는 프레임 간격으로 계산해 60Hz·120Hz에서 같은 속도다.
 * 렌즈(세로 시야각과 투영 중심)는 화면 크기가 바뀔 때만 다시 건다. 투영 중심은 setViewOffset으로 옮긴다(투영·광선·project가 모두 따른다).
 * 화면을 돌려 가로·세로가 바뀌면 새 카메라는 첫 프레임처럼 목표에 바로 놓인다.
 */
export function CameraRig() {
  const follow = useRef<CameraFollow | null>(null);
  const portraitFollow = useRef<PortraitView | null>(null);
  const lensKey = useRef("");

  useFrame((state, delta) => {
    const camera = state.camera as PerspectiveCamera;
    const { width, height } = state.size;
    const lens = lensFor(width, height);
    const key = `${lens.fov}:${lens.center}:${width}x${height}`;
    if (lensKey.current !== key) {
      lensKey.current = key;
      camera.fov = lens.fov;
      if (lens.center === 0.5) camera.clearViewOffset();
      else camera.setViewOffset(width, height, 0, (0.5 - lens.center) * height, width, height);
      camera.updateProjectionMatrix();
    }
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
    camera.lookAt(...pose.target);
  });
```

`src/components/journey/scene/frameStats.ts`에서 찾을 부분:

```ts
  type Mesh,
  type Scene,
```

바꿀 내용:

```ts
  type Mesh,
  type PerspectiveCamera,
  type Scene,
```

`src/components/journey/scene/frameStats.ts`에서 찾을 부분:

```ts
  renderTargetBytes: number;
}
```

바꿀 내용:

```ts
  renderTargetBytes: number;
  /** 지난 프레임의 렌즈(2-4a): 세로 시야각(°)과 투영 중심의 화면 위에서의 비율 */
  lens: { fov: number; center: number };
}
```

`src/components/journey/scene/frameStats.ts`에서 찾을 부분:

```ts
/** 프레임마다 통계를 쓰는 기록기. 그리기 전에 begin(), 그린 뒤에 end(), 준비되는 순간 ready()를 부른다 */
export function createStatsRecorder(gl: WebGLRenderer, scene: Scene) {
  // 후처리 패스마다 렌더러 통계가 비워지지 않게 하고, 프레임마다 한 번(begin) 비운다.
```

바꿀 내용:

```ts
/** 프레임마다 통계를 쓰는 기록기. 그리기 전에 begin(), 그린 뒤에 end(), 준비되는 순간 ready()를 부른다 */
export function createStatsRecorder(gl: WebGLRenderer, scene: Scene, camera: PerspectiveCamera) {
  // 후처리 패스마다 렌더러 통계가 비워지지 않게 하고, 프레임마다 한 번(begin) 비운다.
```

`src/components/journey/scene/frameStats.ts`에서 찾을 부분:

```ts
    renderTargetBytes: 0,
  };
```

바꿀 내용:

```ts
    renderTargetBytes: 0,
    lens: { fov: camera.fov, center: 0.5 },
  };
```

`src/components/journey/scene/frameStats.ts`에서 찾을 부분:

```ts
      stats.wheelTravel = travel ? travel.value : null;
      if (ready && stats.calls > stats.maxCalls) {
```

바꿀 내용:

```ts
      stats.wheelTravel = travel ? travel.value : null;
      const view = camera.view?.enabled ? camera.view : null;
      stats.lens = { fov: camera.fov, center: view ? Number((0.5 - view.offsetY / view.fullHeight).toFixed(4)) : 0.5 };
      if (ready && stats.calls > stats.maxCalls) {
```

`src/components/journey/scene/Warmup.tsx`에서 찾을 부분:

```tsx
import { useEffect } from "react";
import { HalfFloatType, WebGLRenderTarget } from "three";
import { setRenderStep } from "@/lib/journey/engine";
```

바꿀 내용:

```tsx
import { useEffect } from "react";
import { HalfFloatType, WebGLRenderTarget, type PerspectiveCamera } from "three";
import { setRenderStep } from "@/lib/journey/engine";
```

`src/components/journey/scene/Warmup.tsx`에서 찾을 부분:

```tsx
    let cancelled = false;
    const stats = statsEnabled() ? createStatsRecorder(gl, scene) : null;
    const target = new WebGLRenderTarget(1, 1, { type: HalfFloatType });
```

바꿀 내용:

```tsx
    let cancelled = false;
    const stats = statsEnabled() ? createStatsRecorder(gl, scene, camera as PerspectiveCamera) : null;
    const target = new WebGLRenderTarget(1, 1, { type: HalfFloatType });
```

- [ ] **Step 4: e2e 통과를 확인한다**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`·`3000`은 무시)

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts -g "세로 렌즈\(시야각|가로로 돌리면|가로 화면은 지금 렌즈"` (Playwright가 매번 `next build`부터 한다. 2~4분)
Expected: PASS — `6 passed`(390×844에서 코코아톡·Stock2U·PFPlay 홀로그램이 헤더 아래·화면 위 60% 안, 돌리면 렌즈가 바뀐다)

- [ ] **Step 5: 전체 확인**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`·`3000`은 무시)

Run: `rtk proxy npx tsc --noEmit` → exit 0
Run: `rtk proxy npx vitest run --maxWorkers=4` → `Tests  403 passed (403)`
Run: `rtk proxy npx eslint src/components/journey/scene/CameraRig.tsx src/components/journey/scene/frameStats.ts src/components/journey/scene/Warmup.tsx e2e/journey.e2e.ts` → exit 0, 문제 0(`baseline-browser-mapping` 안내 한 줄은 린트 결과가 아니다)

- [ ] **Step 6: 커밋 정리를 제출한다**

파일별 변경 표와 메시지 초안. 초안 예:

```
feat: 여정 장면에 세로 화면 렌즈와 카메라 연결

- 화면 비율로 렌즈(세로 시야각 58°, 투영 중심 위 29%)를 걸고 세로 화면이면 세로 카메라를 따라간다
- 가로 화면 카메라와 렌즈는 그대로이고, 화면을 돌리면 렌즈와 카메라가 함께 바뀐다
```

---

### Task 5: 아래 고정 카드(`portraitCards.ts`)

스펙 3절 "세로 화면"의 "아래 고정 카드"다. 본문 카드(입구, 막 제목, 1막 캡션, 2막 카드, PiCKCARE 소개·저장소)에 `data-journey-card`를 붙이고, 세로 화면에서 3D를 쓰고 장면이 실패하지 않은 동안 본문에 `data-journey-cards="fixed"`를, 지금 구간의 카드에 `data-active`를 붙인다(진행률·해시·화면 크기·장면 상태가 바뀔 때만, React 렌더 없음). 모양은 `globals.css`가 정한다: 카드는 화면 아래 고정 자리에 있고 지금 카드만 보이고 누를 수 있다(보이지 않는 카드도 접근성 트리에 남는다). 엔딩에서는 고정 카드가 없고 연락처가 스크롤로 올라온다. 포커스가 보이지 않는 카드의 링크로 가면 그 카드의 대표 진행률로 한 번 스크롤한다. 세로 화면에서는 보이는 카드만 누를 수 있으므로, 페이지를 연 직후 상세 링크를 누르던 기존 e2e 넷은 그 정류장으로 스크롤한 뒤 누른다(계획 머리말 8).

**Files:**
- Create: `src/components/journey/portraitCards.ts`
- Modify: `e2e/journey.e2e.ts`, `src/app/globals.css`, `src/components/journey/JourneyContent.tsx`, `src/components/journey/JourneyStage.tsx`

**Interfaces:**
- Consumes: Task 3의 `isPortrait`, `activeCard`, `cardProgress`. `getLenis`(engine.ts), `getSceneStatus`·`subscribeSceneStatus`(sceneStatus.ts), `scrollState`·`subscribeProgress`(scrollState.ts)
- Produces: `usePortraitCards(enabled: boolean)`(portraitCards.ts), 본문 표지 `data-journey-card="<정류장 id | pickcare/<저장소>>"`, `<main data-journey-cards="fixed">`, 카드의 `data-active`

- [ ] **Step 1: 실패하는 e2e를 쓰고 기존 e2e 넷을 고친다**

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts
import { occlusionTargets } from "../src/lib/journey/landscapeOcclusion";
import { HALL_REPO_END, HALL_REPO_START, rangeOf } from "../src/lib/journey/timeline";
```

바꿀 내용:

```ts
import { occlusionTargets } from "../src/lib/journey/landscapeOcclusion";
import { cardProgress } from "../src/lib/journey/portrait";
import { HALL_REPO_END, HALL_REPO_START, rangeOf } from "../src/lib/journey/timeline";
```

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts
  const link = page.locator("#stop-pfplay a[data-journey-detail]");
  await link.click();
```

바꿀 내용:

```ts
  const link = page.locator("#stop-pfplay a[data-journey-detail]");
  // 세로 화면은 지금 정류장의 카드만 누를 수 있다(스펙 3절 "세로 화면"). 그 정류장으로 가서 누른다
  await scrollToProgress(page, middleOf("pfplay"));
  await link.click();
```

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts
  await page.goto("/journey");
  await page.locator("#stop-tix2u a[data-journey-detail]").click();
```

바꿀 내용:

```ts
  await page.goto("/journey");
  await scrollToProgress(page, middleOf("tix2u"));
  await page.locator("#stop-tix2u a[data-journey-detail]").click();
```

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts
test("패널을 닫으면 다시 휠로 스크롤된다", async ({ page }) => {
  await page.goto("/journey");
  await page.locator("#stop-pfplay a[data-journey-detail]").click();
  await expect(page.getByRole("dialog", { name: "PFPlay" })).toBeVisible();
```

바꿀 내용:

```ts
test("패널을 닫으면 다시 휠로 스크롤된다", async ({ page }) => {
  await page.goto("/journey");
  await scrollToProgress(page, middleOf("pfplay"));
  await page.locator("#stop-pfplay a[data-journey-detail]").click();
  await expect(page.getByRole("dialog", { name: "PFPlay" })).toBeVisible();
```

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts
test("패널을 연 채 블로그 원문으로 나갔다 돌아와 닫아도 스크롤된다", async ({ page }) => {
  await page.goto("/journey");
  await page.locator("#stop-pfplay a[data-journey-detail]").click();
  await page.getByRole("link", { name: "블로그 원문 보기" }).click();
```

바꿀 내용:

```ts
test("패널을 연 채 블로그 원문으로 나갔다 돌아와 닫아도 스크롤된다", async ({ page }) => {
  await page.goto("/journey");
  await scrollToProgress(page, middleOf("pfplay"));
  await page.locator("#stop-pfplay a[data-journey-detail]").click();
  await page.getByRole("link", { name: "블로그 원문 보기" }).click();
```

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts

// ── 막별 풍경(2-3b, 스펙 1절 완료 조건과 3절 "막별 풍경") ───────────────────
```

바꿀 내용:

```ts

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
    await page.goto("/journey?debug=stats");
    await waitReady(page);
    for (let within = 0.2; within <= 0.96; within += 0.05) {
      await scrollToProgress(page, at("pickcare", within));
      await page.waitForTimeout(1200);
      const front = (await readStats(page)).holograms?.front;
      expect((await activeCards(page)).map((card) => card.id), within.toFixed(2)).toEqual([front]);
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
  });
});

// ── 막별 풍경(2-3b, 스펙 1절 완료 조건과 3절 "막별 풍경") ───────────────────
```

- [ ] **Step 2: e2e 실패를 확인한다**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`·`3000`은 무시)

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts -g "아래 고정 카드|자세히 보기로 열고 ESC|브라우저 뒤로 가기로 닫힌다|패널을 닫으면 다시 휠|블로그 원문으로 나갔다|PiCKCARE 앞줄은 화면에 혼자|키보드\(Enter\)로 연|상세 링크에 포커스가 오면"` (Playwright가 매번 `next build`부터 한다. 2~4분)
Expected: FAIL — `14 failed`, `14 passed`. 고정 카드 7개 테스트가 두 프로젝트에서 실패한다. 카드 표지(`data-journey-card`)와 고정 모드(`data-journey-cards`)가 아직 없다(예: `intro`에서 `Expected ["intro"], Received []`, `WebGL이 없으면`은 표지를 찾다 시간 초과). 고친 기존 e2e 넷과 관련 테스트는 통과한다

- [ ] **Step 3: 카드 표지·고정 카드 모양·카드 바꾸기를 쓴다**

`src/components/journey/JourneyContent.tsx`에서 찾을 부분:

```tsx
  return (
    <div className="container flex h-full items-center">
      <div className={`${PANEL} max-w-xl`}>
```

바꿀 내용:

```tsx
  return (
    <div data-journey-card="intro" className="container flex h-full items-center">
      <div className={`${PANEL} max-w-xl`}>
```

`src/components/journey/JourneyContent.tsx`에서 찾을 부분:

```tsx
  return (
    <div className="container flex h-full items-center justify-center">
      <div className={`${PANEL} text-center`}>
```

바꿀 내용:

```tsx
  return (
    <div data-journey-card={`act-${act}`} className="container flex h-full items-center justify-center">
      <div className={`${PANEL} text-center`}>
```

`src/components/journey/JourneyContent.tsx`에서 찾을 부분:

```tsx
  return (
    <div className="container flex h-full items-center">
      <div className={`${PANEL} max-w-sm ${panelSide(stop)}`}>
```

바꿀 내용:

```tsx
  return (
    <div data-journey-card={stop.id} className="container flex h-full items-center">
      <div className={`${PANEL} max-w-sm ${panelSide(stop)}`}>
```

`src/components/journey/JourneyContent.tsx`에서 찾을 부분:

```tsx
  return (
    <div className="container sticky top-24 flex">
      <div className={`${PANEL} max-w-md ${panelSide(stop)}`}>
```

바꿀 내용:

```tsx
  return (
    <div data-journey-card={stop.id} className="container sticky top-24 flex">
      <div className={`${PANEL} max-w-md ${panelSide(stop)}`}>
```

`src/components/journey/JourneyContent.tsx`에서 찾을 부분:

```tsx
    <>
      <div className="container sticky top-20 z-10">
        <div className={`${PANEL} max-w-md py-4`}>
```

바꿀 내용:

```tsx
    <>
      <div data-journey-card={stop.id} className="container sticky top-20 z-10">
        <div className={`${PANEL} max-w-md py-4`}>
```

`src/components/journey/JourneyContent.tsx`에서 찾을 부분:

```tsx
            key={repo.id}
            className="container flex items-end pb-[12svh]"
```

바꿀 내용:

```tsx
            key={repo.id}
            data-journey-card={`${stop.id}/${repo.id}`}
            className="container flex items-end pb-[12svh]"
```

`src/components/journey/JourneyContent.tsx`에서 찾을 부분:

```tsx
 * 섹션은 클릭이 뒤의 캔버스로 가도록 pointer-events를 끄고, 패널만 켠다.
 */
```

바꿀 내용:

```tsx
 * 섹션은 클릭이 뒤의 캔버스로 가도록 pointer-events를 끄고, 패널만 켠다.
 * 카드(data-journey-card)는 세로 화면에서 3D를 쓰는 동안 화면 아래 고정 자리로 옮겨진다(portraitCards, globals.css).
 */
```

`src/app/globals.css` 끝에 붙인다:

```css

/*
 * 여정 페이지 세로 화면의 아래 고정 카드(스펙 3절 "세로 화면 (2-4a)"). portraitCards가 세로 화면에서 3D를 쓰는 동안 본문(<main>)에
 * data-journey-cards="fixed"를, 지금 구간의 카드에 data-active를 붙인다. 카드는 스크롤과 함께 움직이지 않고 화면 아래에 있으며 지금 카드만
 * 보이고 누를 수 있다. 보이지 않는 카드도 접근성 트리에 남는다(불투명도만 0). 가로 화면·2D·3D 실패에서는 붙지 않아 지금 배치 그대로다.
 * 저장소 카드의 높이는 인라인 스타일이라 !important로 덮는다.
 */
[data-journey-cards="fixed"] [data-journey-card] {
  position: fixed;
  inset-inline: 0;
  top: auto;
  bottom: 0;
  height: auto !important;
  align-items: flex-end;
  padding-bottom: 5svh;
  opacity: 0;
  transition: opacity 250ms ease;
}

[data-journey-cards="fixed"] [data-journey-card] .pointer-events-auto {
  pointer-events: none;
}

[data-journey-cards="fixed"] [data-journey-card][data-active] {
  opacity: 1;
}

[data-journey-cards="fixed"] [data-journey-card][data-active] .pointer-events-auto {
  pointer-events: auto;
}

/* 홀로그램 이미지를 받지 못해 2막 썸네일이 보이면, 카드가 위쪽 3D를 덮지 않게 썸네일 높이를 줄인다 */
[data-journey-cards="fixed"] [data-journey-card] img {
  max-height: 18svh;
  width: auto;
}
```

`src/components/journey/portraitCards.ts` 전체:

```ts
"use client";

import { useEffect } from "react";
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
    main.querySelectorAll<HTMLElement>("[data-journey-card]").forEach((card) => {
      if (card.dataset.journeyCard) cards.set(card.dataset.journeyCard, card);
    });
    let active: string | null = null;
    const fixed = () => isPortrait(window.innerWidth, window.innerHeight) && getSceneStatus() !== "failed";
    const update = () => {
      const on = fixed();
      if (on) main.dataset.journeyCards = "fixed";
      else delete main.dataset.journeyCards;
      const next = on ? activeCard(scrollState.progress, window.location.hash) : null;
      if (next === active) return;
      if (active) cards.get(active)?.removeAttribute("data-active");
      if (next) cards.get(next)?.setAttribute("data-active", "");
      active = next;
    };
    const onFocusIn = (event: FocusEvent) => {
      if (!fixed() || !(event.target instanceof Element)) return;
      const card = event.target.closest<HTMLElement>("[data-journey-card]")?.dataset.journeyCard;
      if (!card || card === active) return;
      const top = scrollTopOf(main, cardProgress(card));
      const lenis = getLenis();
      if (lenis) lenis.scrollTo(top, { immediate: true });
      else window.scrollTo({ top, behavior: "instant" });
    };
    update();
    const unsubscribeProgress = subscribeProgress(update);
    const unsubscribeStatus = subscribeSceneStatus(update);
    window.addEventListener("resize", update);
    window.addEventListener("hashchange", update);
    main.addEventListener("focusin", onFocusIn);
    return () => {
      unsubscribeProgress();
      unsubscribeStatus();
      window.removeEventListener("resize", update);
      window.removeEventListener("hashchange", update);
      main.removeEventListener("focusin", onFocusIn);
      if (active) cards.get(active)?.removeAttribute("data-active");
      delete main.dataset.journeyCards;
    };
  }, [enabled]);
}
```

`src/components/journey/JourneyStage.tsx`에서 찾을 부분:

```tsx
import { ProgressRail } from "./ProgressRail";
import { ProjectDialog } from "./ProjectDialog";
```

바꿀 내용:

```tsx
import { ProgressRail } from "./ProgressRail";
import { usePortraitCards } from "./portraitCards";
import { ProjectDialog } from "./ProjectDialog";
```

`src/components/journey/JourneyStage.tsx`에서 찾을 부분:

```tsx
  const webgl = useSyncExternalStore(subscribeNothing, () => detectTier() !== "2d", () => false);
  // 다른 페이지로 갔다가 돌아오면 장면을 처음부터 다시 준비한다(실패했던 상태와 차 상태도 지운다).
```

바꿀 내용:

```tsx
  const webgl = useSyncExternalStore(subscribeNothing, () => detectTier() !== "2d", () => false);
  // 세로 화면에서 3D를 쓰는 동안 본문 카드를 아래 고정 자리로 옮긴다(스펙 3절 "세로 화면")
  usePortraitCards(webgl);
  // 다른 페이지로 갔다가 돌아오면 장면을 처음부터 다시 준비한다(실패했던 상태와 차 상태도 지운다).
```

- [ ] **Step 4: e2e 통과를 확인한다**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`·`3000`은 무시)

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts -g "아래 고정 카드|자세히 보기로 열고 ESC|브라우저 뒤로 가기로 닫힌다|패널을 닫으면 다시 휠|블로그 원문으로 나갔다|PiCKCARE 앞줄은 화면에 혼자|키보드\(Enter\)로 연|상세 링크에 포커스가 오면"` (Playwright가 매번 `next build`부터 한다. 2~4분)
Expected: PASS — `28 passed`

- [ ] **Step 5: 전체 확인**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`·`3000`은 무시)

Run: `rtk proxy npx tsc --noEmit` → exit 0
Run: `rtk proxy npx vitest run --maxWorkers=4` → `Tests  403 passed (403)`
Run: `rtk proxy npx eslint src/components/journey/portraitCards.ts src/components/journey/JourneyStage.tsx src/components/journey/JourneyContent.tsx e2e/journey.e2e.ts` → exit 0, 문제 0(`baseline-browser-mapping` 안내 한 줄은 린트 결과가 아니다)

- [ ] **Step 6: 커밋 정리를 제출한다**

파일별 변경 표와 메시지 초안. 초안 예:

```
feat: 여정 세로 화면 본문 카드를 화면 아래 고정 자리로

- 세로 화면에서 3D를 쓰는 동안 지금 구간의 카드 하나만 화면 아래에 보여 위쪽 60%의 차와 홀로그램을 가리지 않는다
- PiCKCARE 저장소 카드는 홀로그램 앞줄과 같은 판정이라 늘 같은 저장소다. 엔딩은 연락처가 스크롤로 올라온다
- 보이지 않는 카드로 포커스가 가면 그 정류장으로 한 번 스크롤한다. WebGL이 없거나 장면이 실패하면 지금 배치로 돌아간다
```

---

### Task 6: 모바일 헤더와 세로 화면 진행 막대

스펙 4절 "사이트 공통 요소 변경"과 2절 "진행 표시"다. 사이트 헤더는 작은 화면에서 메뉴가 줄바꿈되지 않게 하고 간격 10px·글자 13px로 줄이며 로고 묶음의 오른쪽 여백을 없앤다(390px에서 한 줄에 다 든다, 375px 이하는 메뉴를 옆으로 밀어 본다, 계획 머리말 6). 640px 이상은 예전과 같다. 진행 막대는 세로 화면(`portrait:`)에서 헤더 바로 아래의 화면 폭 가로 막대(높이 24px)다. 채움은 CSS 변수(`--progress`)만 고친다. 블로그 글의 모바일 화면 비교는 헤더가 든 첫 조각만 달라지므로, 높이·DOM·마크업·콘솔 에러 기준이 그대로임을 확인한 뒤 그 이미지만 갱신한다.

**Files:**
- Modify: `e2e/blog-projects.e2e.ts`, `e2e/journey.e2e.ts`, `src/components/Header.tsx`, `src/components/journey/ProgressRail.tsx`

**Interfaces:**
- Consumes: 없음(헤더·진행 막대 마크업)
- Produces: 없음

- [ ] **Step 1: 실패하는 e2e를 쓴다**

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts

// ── 세로 화면 아래 고정 카드(2-4a, 스펙 3절 "세로 화면") ───────────────────
```

바꿀 내용:

```ts

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

// ── 세로 화면 아래 고정 카드(2-4a, 스펙 3절 "세로 화면") ───────────────────
```

- [ ] **Step 2: e2e 실패를 확인한다**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`·`3000`은 무시)

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts -g "헤더 메뉴가 줄바꿈 없이|헤더 바로 아래 화면 폭|오른쪽 세로 막대 그대로|진행 막대로 3막과 연락처|WebGL이 없으면 3D 없이 본문과 진행 막대"` (Playwright가 매번 `next build`부터 한다. 2~4분)
Expected: FAIL — `6 failed`, `6 passed`. 헤더 링크가 줄바꿈되어 높이 96·60px이다(`Expected: <= 24`), 진행 막대가 헤더에서 221px 떨어져 있다(`Expected: <= 1`). 가로 화면 진행 막대·기존 진행 막대 테스트는 지금 동작을 지키는 것이라 통과한다

- [ ] **Step 3: 헤더와 진행 막대를 고친다**

`src/components/Header.tsx`에서 찾을 부분:

```tsx

export function Header() {
  return (
    <header data-site-header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="font-bold sm:inline-block">이준현의 블로그</span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link
```

바꿀 내용:

```tsx

/**
 * 사이트 헤더. 작은 화면에서는 메뉴 간격과 글자를 줄이고 줄바꿈하지 않는다(여정 2-4a, 스펙 4절 "사이트 공통 요소 변경").
 * 390px에서 한 줄에 다 들고, 375px 이하처럼 더 좁으면 메뉴를 옆으로 밀어 볼 수 있다(스크롤 막대는 숨긴다). 640px 이상은 예전과 같다.
 */
export function Header() {
  return (
    <header data-site-header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="flex min-w-0 sm:mr-4">
          <Link href="/" className="mr-3 flex shrink-0 items-center space-x-2 sm:mr-6">
            <span className="whitespace-nowrap font-bold sm:inline-block">이준현의 블로그</span>
          </Link>
          <nav className="flex min-w-0 items-center space-x-2.5 overflow-x-auto whitespace-nowrap text-[13px] font-medium [scrollbar-width:none] sm:space-x-6 sm:text-sm [&::-webkit-scrollbar]:hidden">
            <Link
```

`src/components/journey/ProgressRail.tsx`에서 찾을 부분:

```tsx

import { useEffect, useRef } from "react";
import { getLenis } from "@/lib/journey/engine";
```

바꿀 내용:

```tsx

import { useEffect, useRef, type CSSProperties } from "react";
import { getLenis } from "@/lib/journey/engine";
```

`src/components/journey/ProgressRail.tsx`에서 찾을 부분:

```tsx
/**
 * 진행 막대. 채움 정도는 React 렌더 없이 DOM을 직접 고친다(스크롤 중 렌더 금지).
 * 2막·3막의 밝은 장면 위에서도 보이도록 반투명 어두운 바탕 위에 그린다(흐림 없이 단색).
 */
```

바꿀 내용:

```tsx
/**
 * 진행 막대. 채움 정도는 React 렌더 없이 CSS 변수(--progress)만 고친다(스크롤 중 렌더 금지).
 * 2막·3막의 밝은 장면 위에서도 보이도록 반투명 어두운 바탕 위에 그린다(흐림 없이 단색).
 * 가로 화면은 오른쪽 가운데의 세로 막대, 세로 화면은 헤더 바로 아래의 화면 폭 가로 막대(높이 24px)다(2-4a, 스펙 2절 "진행 표시").
 * 세로 막대는 세로 화면에서 3D 위쪽 영역(차와 홀로그램)의 가장자리에 걸렸다.
 */
```

`src/components/journey/ProgressRail.tsx`에서 찾을 부분:

```tsx
    const update = (progress: number) => {
      if (fillRef.current) fillRef.current.style.transform = `scaleY(${progress})`;
    };
```

바꿀 내용:

```tsx
    const update = (progress: number) => {
      fillRef.current?.style.setProperty("--progress", String(progress));
    };
```

`src/components/journey/ProgressRail.tsx`에서 찾을 부분:

```tsx
      aria-label="여정 진행"
      className="fixed right-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-zinc-950/70 px-3 py-4 sm:right-6"
    >
      <div className="relative h-64 w-px bg-white/25">
        <div ref={fillRef} className="absolute inset-0 origin-top bg-white/70" style={{ transform: "scaleY(0)" }} />
        {MARKS.map((mark) => (
```

바꿀 내용:

```tsx
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
```

`src/components/journey/ProgressRail.tsx`에서 찾을 부분:

```tsx
            aria-label={mark.name}
            className="group absolute -left-3 flex h-6 w-6 -translate-y-1/2 items-center justify-center"
            style={{ top: mark.top }}
          >
            <span className="h-2 w-2 rounded-full bg-white/70 transition-colors group-hover:bg-white" />
            <span className="pointer-events-none absolute right-8 whitespace-nowrap rounded bg-zinc-950/85 px-1.5 py-0.5 text-xs text-zinc-200 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              {mark.label}
```

바꿀 내용:

```tsx
            aria-label={mark.name}
            className="group absolute -left-3 top-[var(--mark)] flex h-6 w-6 -translate-y-1/2 items-center justify-center portrait:left-[var(--mark)] portrait:top-0 portrait:-translate-x-1/2"
            style={{ "--mark": mark.top } as CSSProperties}
          >
            <span className="h-2 w-2 rounded-full bg-white/70 transition-colors group-hover:bg-white" />
            <span className="pointer-events-none absolute right-8 whitespace-nowrap rounded bg-zinc-950/85 px-1.5 py-0.5 text-xs text-zinc-200 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 portrait:right-auto portrait:top-7">
              {mark.label}
```

- [ ] **Step 4: e2e 통과를 확인한다**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`·`3000`은 무시)

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts -g "헤더 메뉴가 줄바꿈 없이|헤더 바로 아래 화면 폭|오른쪽 세로 막대 그대로|진행 막대로 3막과 연락처|WebGL이 없으면 3D 없이 본문과 진행 막대"` (Playwright가 매번 `next build`부터 한다. 2~4분)
Expected: PASS — `12 passed`

- [ ] **Step 5: 블로그 모바일 화면 기준을 확인하고 갱신한다**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`·`3000`은 무시)

Run: `rtk proxy npx playwright test e2e/blog-projects.e2e.ts`
Expected: 데스크톱 7개 통과, 모바일 7개가 첫 화면 조각(`<글>-0.png`)에서만 실패한다(글마다 `1861 pixels (ratio 0.01 of all image pixels) are different`). 높이 비교는 그보다 앞에서 통과한다. 다른 실패가 있으면 멈추고 원인을 찾는다

Run: `MARK="${TMPDIR:-/tmp}/blog-mark" && touch "${MARK}" && sleep 1 && rtk proxy npx playwright test e2e/blog-projects.e2e.ts --project=mobile --update-snapshots`
Run: `rtk proxy find e2e/__screenshots__/blog-projects.e2e.ts/mobile -newer "${TMPDIR:-/tmp}/blog-mark" -type f`(rtk의 `find`는 복합 조건을 막아 `rtk proxy`로 돌린다)
Expected: 바뀐 기준은 `eutcha-0.png kokoa-clone-0.png pfplay-0.png pickcare-0.png stock2u-0.png tix2u-0.png todo-app-0.png` 일곱 개뿐이다(높이·DOM·마크업·에러 `.txt`·`.html`은 그대로). 기준은 로컬 전용이라 git에 넣지 않는다

Run: `rtk proxy npx playwright test e2e/blog-projects.e2e.ts` → `14 passed`

- [ ] **Step 6: 블로그 화면 비교에 기준 갱신 기록을 남긴다**

`e2e/blog-projects.e2e.ts`에서 찾을 부분:

```ts
// 2026-10-14: 헤더에 Journey 링크를 넣으며 높이·DOM·마크업이 같음을 확인하고 기준을 갱신했다.
const SLUGS = [
```

바꿀 내용:

```ts
// 2026-10-14: 헤더에 Journey 링크를 넣으며 높이·DOM·마크업이 같음을 확인하고 기준을 갱신했다.
// 2026-10-19(여정 2-4a): 작은 화면의 헤더 메뉴 간격·글자를 줄이며 높이·DOM·마크업·콘솔 에러 기준이 같음을 확인하고
// 모바일의 첫 화면 조각(헤더가 든 *-0.png)만 갱신했다.
const SLUGS = [
```

- [ ] **Step 7: 전체 확인**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`·`3000`은 무시)

Run: `rtk proxy npx tsc --noEmit` → exit 0
Run: `rtk proxy npx vitest run --maxWorkers=4` → `Tests  403 passed (403)`
Run: `rtk proxy npx eslint src/components/Header.tsx src/components/journey/ProgressRail.tsx e2e/journey.e2e.ts e2e/blog-projects.e2e.ts` → exit 0, 문제 0(`baseline-browser-mapping` 안내 한 줄은 린트 결과가 아니다)

- [ ] **Step 8: 커밋 정리를 제출한다**

파일별 변경 표와 메시지 초안. 초안 예:

```
feat: 모바일 헤더 메뉴를 한 줄로, 여정 세로 화면 진행 막대를 헤더 아래 가로로

- 작은 화면에서 헤더 메뉴가 글자 단위로 줄바꿈되던 것을 간격·글자를 줄여 한 줄로 두고, 더 좁으면 옆으로 밀어 본다(640px 이상은 그대로)
- 세로 화면의 진행 막대는 3D 위쪽 영역에 걸리지 않게 헤더 바로 아래 가로 막대로 두고 정류장 건너뛰기는 그대로다
- 블로그 모바일 화면 기준은 헤더가 든 첫 조각만 갱신했다(높이·DOM·마크업·에러 기준 그대로)
```

---

### Task 7: 휴대폰 측정 오버레이(`?debug=perf`)

스펙 8절 4항과 7절 "2-4a 기준"이다. 계산(프레임 요약, 기준 판정 p95 33.4ms·p99 50.1ms 이하, 1분 묶음)은 순수 모듈 `perfStats.ts`에 두고, 오버레이(`PerfOverlay.tsx`)는 `?debug=perf`일 때만 `JourneyStage`가 내려받는다. 오버레이는 기기 단계·해상도 배율·캔버스·GPU·브라우저와 최근 10초 프레임 시간, 장면 통계를 0.5초마다 글로 고친다. "측정"은 여정 전체를 일정한 빠르기로 3회 자동 스크롤하고(회마다 처음 0.5초 제외), "오래 돌리기"는 왕복하며 1분마다 묶는다. 결과는 `window.__journeyPerf`와 복사용 글상자에 두고, "결과 복사"는 http로 연 휴대폰에서 글상자를 골라 복사한다. 기종은 입력칸에 적는다. `?debug=perf`도 장면 통계를 켠다(계획 머리말 9).

**Files:**
- Create: `src/components/journey/PerfOverlay.tsx`, `src/lib/journey/perfStats.test.ts`, `src/lib/journey/perfStats.ts`
- Modify: `e2e/journey.e2e.ts`, `src/components/journey/JourneyStage.tsx`, `src/components/journey/scene/frameStats.ts`

**Interfaces:**
- Consumes: Task 1의 `detectTier`. `scrollState`(scrollState.ts), `JourneyStats`의 `calls`·`maxCalls`·`programsAtReady`·`programs`·`textureBytes`·`renderTargetBytes`·`quality`(Task 2)
- Produces: `interface FrameSummary { frames; averageMs; fps; p95Ms; p99Ms; maxMs; over50ms }`, `PERF_TARGET = { p95Ms: 33.4, p99Ms: 50.1 }`, `summarize(sample)`, `meetsTarget(summary)`, `minuteSummaries(frames, start)`(perfStats.ts), `PerfOverlay`, `interface PerfResult`, `window.__journeyPerf`, 확인용 쿼리 `perfSpeed`·`perfMinutes`

- [ ] **Step 1: 실패하는 단위 테스트를 쓴다**

`src/lib/journey/perfStats.test.ts` 전체:

```ts
import { describe, expect, it } from "vitest";
import { PERF_TARGET, meetsTarget, minuteSummaries, summarize } from "./perfStats";

describe("프레임 시간 요약", () => {
  it("평균·fps·p95·p99·최대·50ms 초과 개수를 낸다(정렬한 표본의 비율 자리)", () => {
    const sample = [...Array(90).fill(16.7), ...Array(8).fill(33.4), 50.1, 66.8];
    const summary = summarize(sample);
    expect(summary.frames).toBe(100);
    expect(summary.averageMs).toBeCloseTo((90 * 16.7 + 8 * 33.4 + 50.1 + 66.8) / 100, 2);
    expect(summary.fps).toBeCloseTo(1000 / summary.averageMs, 1);
    expect(summary.p95Ms).toBe(33.4);
    expect(summary.p99Ms).toBe(66.8);
    expect(summary.maxMs).toBe(66.8);
    expect(summary.over50ms).toBe(2);
  });

  it("표본이 없으면 프레임 0개의 요약이다", () => {
    expect(summarize([])).toEqual({ frames: 0, averageMs: 0, fps: 0, p95Ms: 0, p99Ms: 0, maxMs: 0, over50ms: 0 });
  });
});

describe("2-4a 휴대폰 기준(스펙 7절)", () => {
  it("p95 33.4ms 이하이고 p99 50.1ms 이하면 30fps 기준을 지킨다(60Hz에서 한 번 밀림까지)", () => {
    expect(PERF_TARGET).toEqual({ p95Ms: 33.4, p99Ms: 50.1 });
    expect(meetsTarget(summarize([...Array(95).fill(16.7), ...Array(4).fill(33.4), 50.1]))).toBe(true);
    expect(meetsTarget(summarize([...Array(94).fill(16.7), ...Array(6).fill(50.1)]))).toBe(false);
    expect(meetsTarget(summarize([...Array(98).fill(16.7), 66.8, 66.8]))).toBe(false);
    expect(meetsTarget(summarize([]))).toBe(false);
  });
});

describe("오래 돌리기", () => {
  it("시작부터 1분마다 묶어 요약한다(마지막 묶음은 1분이 안 될 수 있다)", () => {
    const frames = [
      { at: 0, ms: 16.7 },
      { at: 59_999, ms: 16.7 },
      { at: 60_000, ms: 33.4 },
      { at: 119_000, ms: 33.4 },
      { at: 150_000, ms: 50.1 },
    ];
    const minutes = minuteSummaries(frames, 0);
    expect(minutes.map((minute) => minute.frames)).toEqual([2, 2, 1]);
    expect(minutes.map((minute) => minute.p95Ms)).toEqual([16.7, 33.4, 50.1]);
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4 src/lib/journey/perfStats.test.ts`
Expected: FAIL — `Error: Cannot find module './perfStats' imported from …/perfStats.test.ts`(Tests no tests)

- [ ] **Step 3: 계산 모듈을 쓴다**

`src/lib/journey/perfStats.ts` 전체:

```ts
/**
 * 휴대폰 성능 측정(스펙 7절 "2-4a 기준", 8절 4항)의 계산. ?debug=perf 오버레이가 쓴다. 백분위는 perf:journey와 같은 방식
 * (정렬한 표본에서 비율 자리의 값)이다. 순수 함수이고 브라우저를 쓰지 않는다.
 */

export interface FrameSummary {
  frames: number;
  averageMs: number;
  fps: number;
  p95Ms: number;
  p99Ms: number;
  maxMs: number;
  over50ms: number;
}

/** 휴대폰 30fps 기준: 60Hz 화면에서 프레임 시간은 16.7ms의 배수로 끊기므로 33.4ms는 "한 번 밀림까지"다 */
export const PERF_TARGET = { p95Ms: 33.4, p99Ms: 50.1 } as const;

function percentile(sorted: number[], ratio: number): number {
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))];
}

function round(value: number): number {
  return Number(value.toFixed(2));
}

export function summarize(sample: number[]): FrameSummary {
  if (sample.length === 0) return { frames: 0, averageMs: 0, fps: 0, p95Ms: 0, p99Ms: 0, maxMs: 0, over50ms: 0 };
  const sorted = [...sample].sort((a, b) => a - b);
  const average = sample.reduce((sum, value) => sum + value, 0) / sample.length;
  return {
    frames: sample.length,
    averageMs: round(average),
    fps: Number((1000 / average).toFixed(1)),
    p95Ms: round(percentile(sorted, 0.95)),
    p99Ms: round(percentile(sorted, 0.99)),
    maxMs: round(sorted[sorted.length - 1]),
    over50ms: sample.filter((value) => value > 50).length,
  };
}

/** 2-4a 휴대폰 기준(p95 33.4ms 이하, p99 50.1ms 이하)을 지키는가. 표본이 없으면 지키지 않은 것으로 본다 */
export function meetsTarget(summary: FrameSummary): boolean {
  return summary.frames > 0 && summary.p95Ms <= PERF_TARGET.p95Ms && summary.p99Ms <= PERF_TARGET.p99Ms;
}

/** 오래 돌리기: 프레임(기록 시각 at, ms)을 start부터 1분마다 묶어 요약한다. 마지막 묶음은 1분이 안 될 수 있다 */
export function minuteSummaries(frames: { at: number; ms: number }[], start: number): FrameSummary[] {
  const minutes: number[][] = [];
  for (const frame of frames) {
    const index = Math.floor((frame.at - start) / 60_000);
    (minutes[index] ??= []).push(frame.ms);
  }
  return [...minutes].map((sample) => summarize(sample ?? []));
}
```

- [ ] **Step 4: 통과를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4 src/lib/journey/perfStats.test.ts`
Expected: PASS — `Tests  4 passed (4)`

- [ ] **Step 5: 실패하는 e2e를 쓴다**

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts

// ── 세로 화면 아래 고정 카드(2-4a, 스펙 3절 "세로 화면") ───────────────────
```

바꿀 내용:

```ts

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
```

- [ ] **Step 6: e2e 실패를 확인한다**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`·`3000`은 무시)

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts -g "측정 오버레이|debug=perf 오버레이|측정을 누르면|오래 돌리기는"` (Playwright가 매번 `next build`부터 한다. 2~4분)
Expected: FAIL — `6 failed`, `2 passed`. 오버레이가 없다(`Expected substring: "단계 full"`, 입력칸·버튼을 찾다 시간 초과). "`?debug=perf`가 없으면 오버레이가 없다"는 지금 동작을 지키는 것이라 통과한다

- [ ] **Step 7: 오버레이를 쓰고 잇는다**

`src/components/journey/PerfOverlay.tsx` 전체:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { detectTier } from "@/lib/journey/capability";
import { meetsTarget, minuteSummaries, summarize, type FrameSummary } from "@/lib/journey/perfStats";
import { scrollState } from "@/lib/journey/scrollState";

/**
 * 휴대폰 성능 측정 오버레이(스펙 8절 4항, 7절 "2-4a 기준"). 주소에 ?debug=perf가 있을 때만 JourneyStage가 불러온다.
 * 기기 단계·해상도 배율·캔버스 크기·GPU·브라우저와 최근 10초의 프레임 시간, 장면 통계(드로콜·프로그램·텍스처)를 보인다.
 * "측정"은 여정 전체를 일정한 빠르기로 3회 자동 스크롤하고(터치 기기는 Lenis를 쓰지 않으므로 프레임마다 scrollTo), "오래 돌리기"는
 * 왕복하며 1분마다 p95를 낸다. 결과는 window.__journeyPerf와 복사용 글상자에 둔다. 보이는 글은 React 렌더 없이 0.5초마다 고친다.
 * 확인용 쿼리: perfSpeed(초당 화면 수, 기본 1), perfMinutes(오래 돌리기 분, 기본 5).
 */

interface SceneStats {
  calls: number;
  maxCalls: number;
  programsAtReady: number;
  programs: number;
  textureBytes: number;
  renderTargetBytes: number;
  quality: { dpr: number } | null;
}

export interface PerfResult {
  device: { model: string; tier: string; dpr: number; canvas: string; gpu: string; browser: string };
  speed: number;
  runs: (FrameSummary & { reached: number })[];
  meets: boolean;
  scene: { maxDrawCalls: number; programs: [number, number]; textureMiB: number; renderTargetMiB: number } | null;
  longRun: { minutes: number; perMinute: FrameSummary[]; meets: boolean } | null;
}

type PerfWindow = Window & { __journeyStats?: SceneStats; __journeyPerf?: PerfResult };

const RUNS = 3;
/** 회마다 처음 0.5초의 프레임은 이미지 디코딩 등이 섞여 뺀다(perf:journey의 처음 30프레임, 60Hz에서 0.5초와 같다) */
const WARMUP_MS = 500;
const RECENT_MS = 10_000;
const MIB = 1024 * 1024;

function options(): { speed: number; minutes: number } {
  const params = new URLSearchParams(window.location.search);
  return { speed: Number(params.get("perfSpeed") ?? 1), minutes: Number(params.get("perfMinutes") ?? 5) };
}

function gpuName(): string {
  try {
    const gl = document.createElement("canvas").getContext("webgl2");
    if (!gl) return "WebGL2 없음";
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const name = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return name;
  } catch {
    return "알 수 없음";
  }
}

function sceneStats(): SceneStats | null {
  return (window as PerfWindow).__journeyStats ?? null;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 진행률 from → to를 화면당 1/speed초로 자동 스크롤하며 프레임 간격을 onFrame에 넘긴다. deadline(performance.now 기준)이 지나면 멈춘다.
 * 지나간 가장 큰 진행률(ScrollTrigger가 계산한 값)을 돌려준다
 */
function play(from: number, to: number, speed: number, onFrame: (ms: number, at: number) => void, deadline = Infinity): Promise<number> {
  return new Promise((resolve) => {
    const main = document.querySelector<HTMLElement>("[data-journey-page]");
    if (!main) return resolve(0);
    const top = main.getBoundingClientRect().top + window.scrollY;
    const span = main.offsetHeight - window.innerHeight;
    const duration = ((Math.abs(to - from) * span) / window.innerHeight / speed) * 1000;
    let start: number | null = null;
    let last = 0;
    let reached = 0;
    const step = (now: number) => {
      if (start === null) start = now;
      else onFrame(now - last, now);
      last = now;
      const k = Math.min(1, (now - start) / duration);
      window.scrollTo({ top: top + (from + (to - from) * k) * span, behavior: "instant" });
      reached = Math.max(reached, scrollState.progress);
      if (k < 1 && now < deadline) requestAnimationFrame(step);
      else requestAnimationFrame(() => resolve(Math.max(reached, scrollState.progress)));
    };
    requestAnimationFrame(step);
  });
}

function describeScene(stats: SceneStats | null): PerfResult["scene"] {
  if (!stats) return null;
  return {
    maxDrawCalls: stats.maxCalls,
    programs: [stats.programsAtReady, stats.programs],
    textureMiB: Number((stats.textureBytes / MIB).toFixed(1)),
    renderTargetMiB: Number((stats.renderTargetBytes / MIB).toFixed(1)),
  };
}

function line(summary: FrameSummary): string {
  return `${summary.fps}fps 평균 ${summary.averageMs} p95 ${summary.p95Ms} p99 ${summary.p99Ms}ms, 50ms 초과 ${summary.over50ms}`;
}

export function PerfOverlay() {
  const liveRef = useRef<HTMLPreElement>(null);
  const modelRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLTextAreaElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<PerfResult | null>(null);

  useEffect(() => {
    const gpu = gpuName();
    const recent: { at: number; ms: number }[] = [];
    let last = performance.now();
    let frame = requestAnimationFrame(function record(now) {
      recent.push({ at: now, ms: now - last });
      last = now;
      while (recent.length > 0 && recent[0].at < now - RECENT_MS) recent.shift();
      frame = requestAnimationFrame(record);
    });
    const timer = setInterval(() => {
      const stats = sceneStats();
      const canvas = document.querySelector<HTMLCanvasElement>("[data-journey-scene] canvas");
      if (!liveRef.current) return;
      liveRef.current.textContent = [
        `단계 ${detectTier()} · 배율 ${stats?.quality?.dpr ?? window.devicePixelRatio} · 캔버스 ${canvas ? `${canvas.width}×${canvas.height}` : "없음"}`,
        `GPU ${gpu}`,
        `최근 10초 ${line(summarize(recent.map((item) => item.ms)))}`,
        stats
          ? `드로콜 ${stats.calls}(최대 ${stats.maxCalls}) · 프로그램 ${stats.programsAtReady}→${stats.programs} · 텍스처 ${(stats.textureBytes / MIB).toFixed(1)}MiB`
          : "드로콜 -(3D 없음)",
      ].join("\n");
    }, 500);
    return () => {
      cancelAnimationFrame(frame);
      clearInterval(timer);
    };
  }, []);

  const device = (): PerfResult["device"] => {
    const canvas = document.querySelector<HTMLCanvasElement>("[data-journey-scene] canvas");
    return {
      model: modelRef.current?.value ?? "",
      tier: detectTier(),
      dpr: sceneStats()?.quality?.dpr ?? window.devicePixelRatio,
      canvas: canvas ? `${canvas.width}×${canvas.height}` : "없음",
      gpu: gpuName(),
      browser: navigator.userAgent,
    };
  };

  const finish = (next: PerfResult) => {
    (window as PerfWindow).__journeyPerf = next;
    setResult(next);
    setBusy(null);
  };

  const measure = async () => {
    const { speed } = options();
    setBusy("측정 중");
    const runs: PerfResult["runs"] = [];
    for (let run = 0; run < RUNS; run++) {
      window.scrollTo({ top: 0, behavior: "instant" });
      await wait(1000);
      const frames: number[] = [];
      const begin = performance.now();
      const reached = await play(0, 1, speed, (ms, at) => {
        if (at - begin >= WARMUP_MS) frames.push(ms);
      });
      runs.push({ ...summarize(frames), reached });
    }
    finish({ device: device(), speed, runs, meets: runs.every(meetsTarget), scene: describeScene(sceneStats()), longRun: null });
  };

  const longRun = async () => {
    const { speed, minutes } = options();
    setBusy("오래 돌리는 중");
    window.scrollTo({ top: 0, behavior: "instant" });
    await wait(1000);
    const frames: { at: number; ms: number }[] = [];
    const start = performance.now();
    const deadline = start + minutes * 60_000;
    for (let forward = true; performance.now() < deadline; forward = !forward) {
      await play(forward ? 0 : 1, forward ? 1 : 0, speed, (ms, at) => frames.push({ at, ms }), deadline);
    }
    const perMinute = minuteSummaries(frames, start);
    const lastMinute = perMinute[perMinute.length - 1];
    finish({
      device: device(),
      speed,
      runs: [],
      meets: false,
      scene: describeScene(sceneStats()),
      longRun: { minutes, perMinute, meets: lastMinute ? meetsTarget(lastMinute) : false },
    });
  };

  const copy = async () => {
    if (!result || !outputRef.current) return;
    const text = JSON.stringify(result, null, 2);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // http로 연 휴대폰(보안 맥락 아님)에는 clipboard API가 없다. 글상자를 골라 복사한다
      outputRef.current.select();
      document.execCommand("copy");
    }
  };

  return (
    <section
      aria-label="성능 측정"
      className="pointer-events-auto fixed left-2 top-[84px] z-30 w-[min(92vw,22rem)] rounded-lg border border-white/10 bg-zinc-950/90 p-2 font-mono text-[11px] leading-snug text-zinc-100"
    >
      <pre ref={liveRef} className="whitespace-pre-wrap">
        측정 준비 중
      </pre>
      <label className="mt-2 flex items-center gap-2">
        기종
        <input ref={modelRef} className="min-w-0 flex-1 rounded bg-zinc-800 px-1 py-0.5" placeholder="예: iPhone 15" />
      </label>
      <div className="mt-2 flex flex-wrap gap-1">
        <button type="button" disabled={busy !== null} onClick={measure} className="rounded bg-sky-700 px-2 py-1 disabled:opacity-50">
          측정
        </button>
        <button type="button" disabled={busy !== null} onClick={longRun} className="rounded bg-sky-900 px-2 py-1 disabled:opacity-50">
          오래 돌리기
        </button>
        <button type="button" disabled={!result} onClick={copy} className="rounded bg-zinc-700 px-2 py-1 disabled:opacity-50">
          결과 복사
        </button>
        {busy && <span className="self-center text-amber-300">{busy}</span>}
      </div>
      {result && (
        <>
          <p className="mt-2">
            {result.longRun
              ? `오래 돌리기 ${result.longRun.minutes}분: 마지막 1분 p95 ${result.longRun.perMinute.at(-1)?.p95Ms ?? "-"}ms ${result.longRun.meets ? "기준 지킴" : "기준 넘음"}`
              : `3회: ${result.runs.map((run) => `p95 ${run.p95Ms}·p99 ${run.p99Ms}`).join(" / ")} ${result.meets ? "기준 지킴" : "기준 넘음"}`}
          </p>
          <textarea ref={outputRef} readOnly value={JSON.stringify(result, null, 2)} className="mt-1 h-24 w-full bg-zinc-900 text-[10px]" />
        </>
      )}
    </section>
  );
}
```

`src/components/journey/JourneyStage.tsx`에서 찾을 부분:

```tsx
const Scene = dynamic(() => import("./scene/Scene"), { ssr: false });

```

바꿀 내용:

```tsx
const Scene = dynamic(() => import("./scene/Scene"), { ssr: false });
// 휴대폰 측정 오버레이(스펙 8절 4항)는 ?debug=perf일 때만 내려받는다
const PerfOverlay = dynamic(() => import("./PerfOverlay").then((module) => module.PerfOverlay), { ssr: false });

function perfRequested(): boolean {
  return new URLSearchParams(window.location.search).get("debug") === "perf";
}

```

`src/components/journey/JourneyStage.tsx`에서 찾을 부분:

```tsx
  usePortraitCards(webgl);
  // 다른 페이지로 갔다가 돌아오면 장면을 처음부터 다시 준비한다(실패했던 상태와 차 상태도 지운다).
```

바꿀 내용:

```tsx
  usePortraitCards(webgl);
  const perf = useSyncExternalStore(subscribeNothing, perfRequested, () => false);
  // 다른 페이지로 갔다가 돌아오면 장면을 처음부터 다시 준비한다(실패했던 상태와 차 상태도 지운다).
```

`src/components/journey/JourneyStage.tsx`에서 찾을 부분:

```tsx
      <ProjectDialog />
    </>
```

바꿀 내용:

```tsx
      <ProjectDialog />
      {perf && <PerfOverlay />}
    </>
```

`src/components/journey/scene/frameStats.ts`에서 찾을 부분:

```ts
/**
 * 성능 측정용 장면 통계(스펙 7절 측정 조건). 주소에 ?debug=stats가 있을 때만 window.__journeyStats에 쓴다.
 * 렌더러 통계(info)는 autoReset을 끄고 프레임마다 한 번 비우므로, 후처리 패스까지 합친 프레임 하나의 드로콜이다.
```

바꿀 내용:

```ts
/**
 * 성능 측정용 장면 통계(스펙 7절 측정 조건). 주소에 ?debug=stats(또는 휴대폰 측정 오버레이의 ?debug=perf)가 있을 때만 window.__journeyStats에 쓴다.
 * 렌더러 통계(info)는 autoReset을 끄고 프레임마다 한 번 비우므로, 후처리 패스까지 합친 프레임 하나의 드로콜이다.
```

`src/components/journey/scene/frameStats.ts`에서 찾을 부분:

```ts
export function statsEnabled(): boolean {
  return new URLSearchParams(window.location.search).get("debug") === "stats";
}
```

바꿀 내용:

```ts
export function statsEnabled(): boolean {
  const debug = new URLSearchParams(window.location.search).get("debug");
  return debug === "stats" || debug === "perf";
}
```

- [ ] **Step 8: e2e 통과를 확인한다**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`·`3000`은 무시)

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts -g "측정 오버레이|debug=perf 오버레이|측정을 누르면|오래 돌리기는"` (Playwright가 매번 `next build`부터 한다. 2~4분)
Expected: PASS — `8 passed`

- [ ] **Step 9: 전체 확인**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`·`3000`은 무시)

Run: `rtk proxy npx tsc --noEmit` → exit 0
Run: `rtk proxy npx vitest run --maxWorkers=4` → `Tests  407 passed (407)`
Run: `rtk proxy npx eslint src/components/journey/PerfOverlay.tsx src/components/journey/JourneyStage.tsx src/lib/journey/perfStats.ts src/lib/journey/perfStats.test.ts src/components/journey/scene/frameStats.ts e2e/journey.e2e.ts` → exit 0, 문제 0(`baseline-browser-mapping` 안내 한 줄은 린트 결과가 아니다)

- [ ] **Step 10: 커밋 정리를 제출한다**

파일별 변경 표와 메시지 초안. 초안 예:

```
feat: 여정 휴대폰 측정 오버레이(?debug=perf) 추가

- 휴대폰에서 기기 단계·배율·GPU·프레임 시간·장면 통계를 보고, 여정 3회 자동 재생과 5분 왕복으로 30fps 기준(p95 33.4ms·p99 50.1ms)을 잰다
- 결과를 JSON으로 복사해 붙여 넣을 수 있고(http로 연 휴대폰도), 쿼리가 없으면 오버레이 코드를 내려받지 않는다
```

---

### Task 8: 세로 화면 e2e 다시 켜기와 2-4a 캡처 묶음

스펙 1절 2-4a 완료 조건의 "가림 없음"과 "PiCKCARE mobile e2e"다. 가림 판정의 표적 고르기가 렌즈와 시선을 받게 하고(세로 화면은 세로 렌즈와 세로 카메라의 시선으로 화면 안 도로 표본을 고른다), 세로 화면 카메라에서도 풍경이 홀로그램과 도로를 가리지 않는지 단위로 본다. e2e는 가림(세로 렌즈)과 홀로그램 누르기 둘을 mobile에서 다시 켜고, 세로 화면 PiCKCARE 테스트를 더한다. 호버·커서 넷, PiCKCARE 배치 모형, 첨탑은 넓은 화면에서만 본다(이유를 바꿔 적는다, 계획 머리말 12). 캡처 스크립트에 세로 화면 묶음(`CAPTURE_SET=portrait`, 15장면)을 더한다.

**Files:**
- Modify: `e2e/journey.e2e.ts`, `scripts/capture-journey.ts`, `src/lib/journey/landscapeOcclusion.test.ts`, `src/lib/journey/landscapeOcclusion.ts`

**Interfaces:**
- Consumes: Task 3의 `PORTRAIT_LENS`, `projectThrough`, `portraitCamera`, `cardProgress`. `projectPoint(…, lens)`(landscape.ts)
- Produces: `occlusionTargets(progress, aspect, camera?, lens = WIDE_LENS, target?)`(landscapeOcclusion.ts), `CAPTURE_SET=portrait`(capture-journey.ts)

- [ ] **Step 1: 실패하는 단위 테스트를 쓴다**

`src/lib/journey/landscapeOcclusion.test.ts`에서 찾을 부분:

```ts
import { landscapePieces, spireBase, spireTip } from "./landscapeBuild";
import { occlusionTargets, segmentBlocked } from "./landscapeOcclusion";
import { rangeOf, type Vec3 } from "./timeline";
```

바꿀 내용:

```ts
import { landscapePieces, spireBase, spireTip } from "./landscapeBuild";
import { PORTRAIT_LENS, projectThrough } from "./lens";
import { OCCLUSION, occlusionTargets, segmentBlocked } from "./landscapeOcclusion";
import { portraitCamera } from "./portrait";
import { rangeOf, type Vec3 } from "./timeline";
```

`src/lib/journey/landscapeOcclusion.test.ts`에서 찾을 부분:

```ts

  it("3막 제목·진입·도착·떠날 때 카메라에서 첨탑의 도로 위 부분으로 가는 선분이 다른 풍경에 막히지 않는다", () => {
```

바꿀 내용:

```ts

  it("세로 화면 카메라(390×844, 세로 렌즈)에서도 홀로그램 모서리와 세로 화면 안 열린 도로로 가는 선분이 풍경에 막히지 않는다", () => {
    const aspect = 390 / 844;
    const blocked: string[] = [];
    let roads = 0;
    for (const [id, within] of VIEWS) {
      const progress = at(id, within);
      const pose = portraitCamera(driveAt(progress));
      const targets = occlusionTargets(progress, aspect, pose.position, PORTRAIT_LENS, pose.target);
      expect(targets.length, `${id} ${within}`).toBeGreaterThan(0);
      for (const target of targets) {
        if (target.label.startsWith("도로")) {
          roads += 1;
          const screen = projectThrough(pose, target.point, aspect, PORTRAIT_LENS);
          expect(screen.x, `${id} ${within} ${target.label}`).toBeGreaterThan(OCCLUSION.screenMargin);
          expect(screen.x, `${id} ${within} ${target.label}`).toBeLessThan(1 - OCCLUSION.screenMargin);
          expect(screen.y, `${id} ${within} ${target.label}`).toBeLessThan(1 - OCCLUSION.screenMargin);
        }
        const hit = segmentBlocked(pose.position, target.point, pieces);
        if (hit) blocked.push(`${id} ${within} ${target.label} ← ${hit.piece} #${hit.item}`);
      }
    }
    expect(roads).toBeGreaterThan(300);
    expect(blocked).toEqual([]);
  });

  it("3막 제목·진입·도착·떠날 때 카메라에서 첨탑의 도로 위 부분으로 가는 선분이 다른 풍경에 막히지 않는다", () => {
```

- [ ] **Step 2: 실패를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4 src/lib/journey/landscapeOcclusion.test.ts`
Expected: FAIL — `1 failed | 3 passed`. 가로 화면 렌즈와 시선으로 고른 도로 표본이 세로 화면 밖이다: `AssertionError: kokoa-clone 0.25 도로 s 44: expected 1.0155083147791997 to be less than 0.98`

- [ ] **Step 3: 가림 표적이 렌즈와 시선을 받게 한다**

`src/lib/journey/landscapeOcclusion.ts`에서 찾을 부분:

```ts
import { projectPoint } from "./landscape";
import type { LandscapePiece } from "./landscapeBuild";
```

바꿀 내용:

```ts
import { projectPoint } from "./landscape";
import { WIDE_LENS, type Lens } from "./lens";
import type { LandscapePiece } from "./landscapeBuild";
```

`src/lib/journey/landscapeOcclusion.ts`에서 찾을 부분:

```ts
 * 진행률 p의 표적: 나타난 홀로그램(나타난 정도 0.05 이상)의 그림 영역 네 모서리와, 열린 도로(열린 끝까지) 가운데 화면(aspect) 안에 드는 표본.
 * camera는 선분이 시작하는 자리(단위 테스트는 카메라 목표 자리, e2e는 실제 카메라 자리)다.
 */
export function occlusionTargets(progress: number, aspect: number, camera: Vec3 = driveAt(progress).camera.position): OcclusionTarget[] {
  const state = driveAt(progress);
  const pose: CameraPose = { position: camera, target: state.camera.target };
  const targets: OcclusionTarget[] = [];
```

바꿀 내용:

```ts
 * 진행률 p의 표적: 나타난 홀로그램(나타난 정도 0.05 이상)의 그림 영역 네 모서리와, 열린 도로(열린 끝까지) 가운데 화면(aspect) 안에 드는 표본.
 * camera는 선분이 시작하는 자리(단위 테스트는 카메라 목표 자리, e2e는 실제 카메라 자리)다. 세로 화면은 세로 렌즈와 세로 카메라의 시선을 넘긴다
 * (2-4a, 기본은 가로 화면 렌즈와 driveAt의 시선).
 */
export function occlusionTargets(
  progress: number,
  aspect: number,
  camera: Vec3 = driveAt(progress).camera.position,
  lens: Lens = WIDE_LENS,
  target: Vec3 = driveAt(progress).camera.target,
): OcclusionTarget[] {
  const state = driveAt(progress);
  const pose: CameraPose = { position: camera, target };
  const targets: OcclusionTarget[] = [];
```

`src/lib/journey/landscapeOcclusion.ts`에서 찾을 부분:

```ts
    const point = roadFrame(s).position;
    const screen = projectPoint(pose, point, aspect);
    const margin = OCCLUSION.screenMargin;
```

바꿀 내용:

```ts
    const point = roadFrame(s).position;
    const screen = projectPoint(pose, point, aspect, lens);
    const margin = OCCLUSION.screenMargin;
```

- [ ] **Step 4: 통과를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4 src/lib/journey/landscapeOcclusion.test.ts`
Expected: PASS — `Tests  4 passed (4)`

- [ ] **Step 5: 세로 화면 e2e를 다시 켜고 캡처 묶음을 더한다**

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts
import { occlusionTargets } from "../src/lib/journey/landscapeOcclusion";
import { cardProgress } from "../src/lib/journey/portrait";
import { HALL_REPO_END, HALL_REPO_START, rangeOf } from "../src/lib/journey/timeline";
```

바꿀 내용:

```ts
import { occlusionTargets } from "../src/lib/journey/landscapeOcclusion";
import { PORTRAIT_LENS } from "../src/lib/journey/lens";
import { cardProgress, portraitCamera } from "../src/lib/journey/portrait";
import { HALL_REPO_END, HALL_REPO_START, rangeOf } from "../src/lib/journey/timeline";
```

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts
test("PiCKCARE 저장소 패널이 배치 모형의 자리에 있고, 네 화면 크기에서 저장소마다 읽기 자리에 그 패널만 화면 안에 다 들어온다", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "세로 화면의 PiCKCARE 배치는 2-4에서 맞춘다");
  const length = rangeOf("pickcare").stop.length;
```

바꿀 내용:

```ts
test("PiCKCARE 저장소 패널이 배치 모형의 자리에 있고, 네 화면 크기에서 저장소마다 읽기 자리에 그 패널만 화면 안에 다 들어온다", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "세로 화면은 아래 고정 카드라 배치 모형이 없다(세로 화면 PiCKCARE 테스트가 따로 본다)");
  const length = rangeOf("pickcare").stop.length;
```

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts

// 스펙 3절 "홀로그램 상호작용". 홀로그램 자리를 쓰는 테스트는 넓은 화면에서만 본다(세로 화면의 자리는 2-4에서 맞춘다).
const PORTRAIT_SKIP = "세로 화면의 홀로그램 자리는 2-4에서 맞춘다";
/** 카메라와 PiCKCARE 앞줄의 감쇠가 자리에 닿을 때까지 */
```

바꿀 내용:

```ts

// 스펙 3절 "홀로그램 상호작용". 마우스 호버·커서를 보는 테스트는 넓은 화면에서만 본다(휴대폰 세로 화면에는 호버가 없다).
const HOVER_SKIP = "휴대폰 세로 화면에는 마우스 호버가 없어 넓은 화면에서만 본다";
/** 카메라와 PiCKCARE 앞줄의 감쇠가 자리에 닿을 때까지 */
```

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts

test("홀로그램을 누르면 짝인 상세가 열리고, 닫으면 포커스가 그 링크로 돌아온다", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", PORTRAIT_SKIP);
  await page.goto("/journey?debug=stats");
```

바꿀 내용:

```ts

test("홀로그램을 누르면 짝인 상세가 열리고, 닫으면 포커스가 그 링크로 돌아온다", async ({ page }) => {
  await page.goto("/journey?debug=stats");
```

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts
test("홀로그램 위에서는 커서가 pointer이고, 누를 수 없는 코코아톡 위에서는 바뀌지 않는다", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", PORTRAIT_SKIP);
  await page.goto("/journey?debug=stats");
```

바꿀 내용:

```ts
test("홀로그램 위에서는 커서가 pointer이고, 누를 수 없는 코코아톡 위에서는 바뀌지 않는다", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", HOVER_SKIP);
  await page.goto("/journey?debug=stats");
```

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts
test("포인터를 두고 스크롤해도 호버는 포인터를 덮는 가장 가까운 홀로그램이고, 누르면 그 상세가 열린다", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", PORTRAIT_SKIP);
  const start = await pointAtPickcareBiz(page);
```

바꿀 내용:

```ts
test("포인터를 두고 스크롤해도 호버는 포인터를 덮는 가장 가까운 홀로그램이고, 누르면 그 상세가 열린다", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", HOVER_SKIP);
  const start = await pointAtPickcareBiz(page);
```

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts
test("마우스 휠로 스크롤해도 호버는 포인터를 덮는 가장 가까운 홀로그램을 따른다", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", PORTRAIT_SKIP);
  const start = await pointAtPickcareBiz(page);
```

바꿀 내용:

```ts
test("마우스 휠로 스크롤해도 호버는 포인터를 덮는 가장 가까운 홀로그램을 따른다", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", HOVER_SKIP);
  const start = await pointAtPickcareBiz(page);
```

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts
test("홀로그램에서 본문 패널로 포인터를 옮기면 호버가 풀리고 다시 켜지지 않는다", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", PORTRAIT_SKIP);
  await page.goto("/journey?debug=stats");
```

바꿀 내용:

```ts
test("홀로그램에서 본문 패널로 포인터를 옮기면 호버가 풀리고 다시 켜지지 않는다", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", HOVER_SKIP);
  await page.goto("/journey?debug=stats");
```

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts

test("홀로그램을 두 번 눌러도 기록은 하나만 남는다", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", PORTRAIT_SKIP);
  await page.goto("/journey?debug=stats");
```

바꿀 내용:

```ts

test("홀로그램을 두 번 눌러도 기록은 하나만 남는다", async ({ page }) => {
  await page.goto("/journey?debug=stats");
```

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts

  test("엔딩에서는 고정 카드가 없고 연락처가 스크롤로 올라온다", async ({ page }) => {
```

바꿀 내용:

```ts

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
```

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts

test("정류장(도는 중·머묾)과 엔딩에서 실제 카메라로 본 홀로그램 모서리와 열린 도로가 풍경에 막히지 않는다", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", PORTRAIT_SKIP);
  await page.goto("/journey?debug=stats");
```

바꿀 내용:

```ts

test("정류장(도는 중·머묾)과 엔딩에서 실제 카메라로 본 홀로그램 모서리와 열린 도로가 풍경에 막히지 않는다", async ({ page }) => {
  await page.goto("/journey?debug=stats");
```

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts
    if (!landscape) throw new Error("풍경 통계가 없습니다");
    const targets = occlusionTargets(progress, viewport.width / viewport.height, landscape.camera);
    expect(targets.length, `${id} ${within}`).toBeGreaterThan(0);
```

바꿀 내용:

```ts
    if (!landscape) throw new Error("풍경 통계가 없습니다");
    // 세로 화면은 세로 렌즈와 세로 카메라의 시선으로 화면 안 도로 표본을 고른다(2-4a)
    const portrait = viewport.width < viewport.height;
    const targets = portrait
      ? occlusionTargets(progress, viewport.width / viewport.height, landscape.camera, PORTRAIT_LENS, portraitCamera(driveAt(progress)).target)
      : occlusionTargets(progress, viewport.width / viewport.height, landscape.camera);
    expect(targets.length, `${id} ${within}`).toBeGreaterThan(0);
```

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts
test("3막 제목·진입·도착·떠날 때 첨탑이 헤더 아래 화면 안에 서고 본문 패널과 겹치지 않는다", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", PORTRAIT_SKIP);
  // 두 화면 크기 × 네 자리마다 카메라가 자리를 잡을 때까지 기다린다
```

바꿀 내용:

```ts
test("3막 제목·진입·도착·떠날 때 첨탑이 헤더 아래 화면 안에 서고 본문 패널과 겹치지 않는다", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "세로 화면의 첨탑과 도로 끝은 네 화면 크기 캡처로 본다(스펙 3절 \"세로 화면\")");
  // 두 화면 크기 × 네 자리마다 카메라가 자리를 잡을 때까지 기다린다
```

`scripts/capture-journey.ts`에서 찾을 부분:

```ts
 * 2막 제목·Stock2U·Tix2U·PFPlay 끝, 3막 제목·PiCKCARE 머묾·떠날 때, 엔딩 — 열두 장, 3×4 한 장.
 * CAPTURE_ORDER=reverse면 같은 자리를 거꾸로 찍는다(파일 이름은 같다). 정방향과 compare-captures로 비교한다(스펙 8절 4항).
```

바꿀 내용:

```ts
 * 2막 제목·Stock2U·Tix2U·PFPlay 끝, 3막 제목·PiCKCARE 머묾·떠날 때, 엔딩 — 열두 장, 3×4 한 장.
 * CAPTURE_SET=portrait는 세로 화면(2-4a, 스펙 3절 "세로 화면")을 본다: 풍경 묶음 열두 장에 PiCKCARE 앞·뒤 저장소 자리와 엔딩 가운데
 * (연락처가 오기 전)를 더한 열다섯 장, 5×3 한 장. CAPTURE_VIEWPORT=390x844처럼 세로 화면 크기와 함께 쓴다. 경량은 주소에 ?debug=stats&tier=lite.
 * CAPTURE_ORDER=reverse면 같은 자리를 거꾸로 찍는다(파일 이름은 같다). 정방향과 compare-captures로 비교한다(스펙 8절 4항).
```

`scripts/capture-journey.ts`에서 찾을 부분:

```ts
 *   CAPTURE_SET=landscape CAPTURE_ORDER=reverse CAPTURE_NAME=2-3b-reverse npm run capture:journey
 *   CAPTURE_HEADLESS=1을 더하면 창 없이 찍는다. 새 헤드리스(channel chromium)라 GPU로 그린다(Apple M4에서 Metal).
```

바꿀 내용:

```ts
 *   CAPTURE_SET=landscape CAPTURE_ORDER=reverse CAPTURE_NAME=2-3b-reverse npm run capture:journey
 *   CAPTURE_SET=portrait CAPTURE_VIEWPORT=390x844 CAPTURE_HEADLESS=1 CAPTURE_NAME=2-4a-390x844 npm run capture:journey
 *   CAPTURE_HEADLESS=1을 더하면 창 없이 찍는다. 새 헤드리스(channel chromium)라 GPU로 그린다(Apple M4에서 Metal).
```

`scripts/capture-journey.ts`에서 찾을 부분:

```ts
  ["12-ending", "ending", 1],
];
```

바꿀 내용:

```ts
  ["12-ending", "ending", 1],
];

/** 세로 화면(2-4a): 풍경 묶음에 PiCKCARE 앞·뒤 저장소 자리와 엔딩 가운데(내려다보기를 마치고 연락처가 오기 전)를 더한다 */
const PORTRAIT_SHOTS: [string, string, number][] = [
  ...LANDSCAPE_SHOTS,
  ["13-pickcare-early", "pickcare", 0.3],
  ["14-pickcare-late", "pickcare", 0.75],
  ["15-ending-mid", "ending", 0.5],
];
```

`scripts/capture-journey.ts`에서 찾을 부분:

```ts
                  ? LANDSCAPE_SHOTS
                  : SHOTS,
          );
    // 거꾸로 찍어도 한 장으로 붙일 때는 이름 순서(정방향)로 둔다
    if (REVERSE) files.sort();
    const columns = SET === "edge" ? 4 : 3;
    const rows = Math.ceil(files.length / columns);
```

바꿀 내용:

```ts
                  ? LANDSCAPE_SHOTS
                  : SET === "portrait"
                    ? PORTRAIT_SHOTS
                    : SHOTS,
          );
    // 거꾸로 찍어도 한 장으로 붙일 때는 이름 순서(정방향)로 둔다
    if (REVERSE) files.sort();
    const columns = SET === "edge" ? 4 : SET === "portrait" ? 5 : 3;
    const rows = Math.ceil(files.length / columns);
```

- [ ] **Step 6: e2e를 확인한다**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`·`3000`은 무시)

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts -g "홀로그램을 누르면 짝인|두 번 눌러도|실제 카메라로 본 홀로그램|세로 화면 PiCKCARE|배치 모형의 자리|첨탑이 헤더 아래"` (Playwright가 매번 `next build`부터 한다. 2~4분)
Expected: PASS — `10 passed`, `2 skipped`(mobile의 PiCKCARE 배치 모형과 첨탑은 바꾼 이유로 건너뛴다). 다시 켠 테스트는 Task 4·5가 만든 동작을 보는 것이라 이 태스크에서 실패 단계가 없다

- [ ] **Step 7: 전체 확인**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`·`3000`은 무시)

Run: `rtk proxy npx tsc --noEmit` → exit 0
Run: `rtk proxy npx vitest run --maxWorkers=4` → `Tests  408 passed (408)`
Run: `rtk proxy npx eslint src/lib/journey/landscapeOcclusion.ts src/lib/journey/landscapeOcclusion.test.ts e2e/journey.e2e.ts scripts/capture-journey.ts` → exit 0, 문제 0(`baseline-browser-mapping` 안내 한 줄은 린트 결과가 아니다)

- [ ] **Step 8: 커밋 정리를 제출한다**

파일별 변경 표와 메시지 초안. 초안 예:

```
test: 여정 세로 화면 가림·홀로그램 누르기 e2e를 다시 켜고 세로 캡처 묶음 추가

- 가림 판정이 세로 렌즈와 세로 카메라 시선으로 화면 안 도로를 고르고, 세로 화면에서도 풍경이 홀로그램과 도로를 가리지 않음을 확인한다
- 세로 화면 PiCKCARE에서 저장소마다 그 카드만 아래에 다 보이고 앞줄 홀로그램이 위쪽 60% 안에 있다
- 호버·커서·배치 모형·첨탑은 넓은 화면에서만 보는 이유를 고쳐 적었다
```

---

### Task 9: 최종 검증, 휴대폰 실측, 스펙 기록

스펙 1절 2-4a 완료 조건을 최종 구현에서 확인하고 숫자와 캡처를 남긴다. 휴대폰 실측은 사용자가 아이폰(Safari)과 안드로이드(Chrome)에서 하고, 에이전트는 서버와 절차를 준비해 결과를 받아 적는다. 결과가 오기 전에는 이 태스크를 끝내지 않는다.

**Files:**
- Modify: `docs/superpowers/specs/2026-10-14-journey-design.md`(1절 표, 7절 2-4a 실측, 10절)

- [ ] **Step 1: 전체 확인**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`·`3000`은 무시)

Run: `rtk proxy npx tsc --noEmit` → exit 0
Run: `rtk proxy npx vitest run --maxWorkers=4` → `Tests  408 passed (408)`
Run: `rtk proxy npx eslint .` → 이 계획 전과 같은 기존 문제만 남는다(28개, 오류 6: `Background3D.tsx` 3, `about/page.tsx` 2, `blog/[slug]/page.tsx` 1). 이 계획이 바꾼 파일에는 문제가 없다
Run: `rtk proxy npx playwright test` (10분 남짓) → `176 passed`, `6 skipped`(mobile의 호버·커서 넷, PiCKCARE 배치 모형, 첨탑). 데스크톱 "로딩 막대가 사라진다"가 End 키 뒤 5초에서 흔들리면 그 테스트만 `--repeat-each=4`로 다시 돌려 확인한다

- [ ] **Step 2: 데스크톱 회귀 캡처(2-3b 완료 때와 같은가)**

시작 전 코드(`267213b`)를 작업 트리와 따로 꺼내 기준을 찍는다(git 상태는 바꾸지 않는다).

```bash
BASE_DIR=$(mktemp -d)/base && mkdir -p "${BASE_DIR}"
rtk proxy git archive 267213b | tar -x -C "${BASE_DIR}"
rtk proxy cp -cR node_modules "${BASE_DIR}/node_modules" && cp .env.local "${BASE_DIR}/.env.local"
(cd "${BASE_DIR}" && rtk proxy npx next build)
```

(`node_modules`는 APFS 복제(`cp -c`)로 옮긴다. Turbopack은 프로젝트 밖을 가리키는 심볼릭 링크를 받지 않는다.)

`(cd "${BASE_DIR}" && rtk proxy npx next start --port 3201)`(다른 터미널)과 이 작업 트리의 `rtk proxy npx next build && rtk proxy npx next start --port 3200`(다른 터미널)을 띄운 뒤 같은 풍경 묶음을 창 없이 찍는다.

Run: `CAPTURE_SET=landscape CAPTURE_HEADLESS=1 CAPTURE_URL="http://localhost:3201/journey?debug=stats" CAPTURE_NAME=2-4a-desktop-base rtk proxy npm run capture:journey`
Run: `CAPTURE_SET=landscape CAPTURE_HEADLESS=1 CAPTURE_URL="http://localhost:3200/journey?debug=stats" CAPTURE_NAME=2-4a-desktop rtk proxy npm run capture:journey`

두 폴더를 장면마다 비교한다(휘도 차이 3 넘는 화소의 비율). 아래 스크립트를 작업 트리 밖(`${BASE_DIR}/..`)에 `diff-captures.cjs`로 두고 `node <그 경로> test-results/journey-captures/2-4a-desktop-base test-results/journey-captures/2-4a-desktop`로 돌린다.

```js
const { createRequire } = require("node:module");
const sharp = createRequire(`${process.cwd()}/package.json`)("sharp");
const fs = require("node:fs");
const [a, b] = process.argv.slice(2);
(async () => {
  for (const name of fs.readdirSync(a).filter((file) => /^\d\d-.*\.png$/.test(file))) {
    const left = await sharp(`${a}/${name}`).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const right = await sharp(`${b}/${name}`).removeAlpha().raw().toBuffer();
    let changed = 0;
    for (let i = 0; i < right.length; i += 3) {
      const d = 0.2126 * (right[i] - left.data[i]) + 0.7152 * (right[i + 1] - left.data[i + 1]) + 0.0722 * (right[i + 2] - left.data[i + 2]);
      if (Math.abs(d) > 3) changed++;
    }
    console.log(`${name}: ${((100 * changed) / (left.info.width * left.info.height)).toFixed(2)}%`);
  }
})();
```

Expected: 열두 장면 모두 0.05% 이하(별 먼지·도로 끝 노이즈 정도. 사본에서는 0.03% 이하였다). 넘는 장면이 있으면 두 장을 열어 무엇이 다른지 보고 멈춘다. 3201 서버는 `lsof -t -iTCP:3201 -sTCP:LISTEN`으로 찾은 PID만 끄고 `${BASE_DIR}`을 지운다.

- [ ] **Step 3: 세로 화면 캡처(네 크기와 경량)**

3200 서버를 그대로 두고 찍는다(Playwright가 `test-results/`를 비우므로 e2e를 돌리기 전에 찍은 캡처는 다른 곳으로 옮긴다).

Run: `CAPTURE_SET=portrait CAPTURE_HEADLESS=1 CAPTURE_VIEWPORT=390x844 CAPTURE_NAME=2-4a-390x844 rtk proxy npm run capture:journey`
Run: 같은 명령을 `360x800`, `430x932`, `820x1180`으로(이름도 크기별로)
Run: `CAPTURE_SET=portrait CAPTURE_HEADLESS=1 CAPTURE_VIEWPORT=390x844 CAPTURE_URL="http://localhost:3200/journey?debug=stats&tier=lite" CAPTURE_NAME=2-4a-lite rtk proxy npm run capture:journey`
Run: `CAPTURE_SET=hall CAPTURE_HEADLESS=1 CAPTURE_NAME=2-4a-hall rtk proxy npm run capture:journey`(가로 화면 PiCKCARE, 허용된 결함 회귀)

각 `sheet.png`를 Read로 열어 본다(스펙 1절 2-4a 완료 조건, 3절 "세로 화면").

- 정류장(코코아톡·Todo·Stock2U·Tix2U·PiCKCARE): 홀로그램이 위, 차가 그 아래, 지금 카드 하나가 화면 아래에 있고 카드가 차·홀로그램을 가리지 않는다. PiCKCARE 카드는 앞줄 저장소와 같다
- 막 경계와 전환(EUTCHA 끝, 2막 제목, PFPlay 끝, 3막 제목): 차가 화면을 채우거나 화면 밖으로 밀리지 않는다(PFPlay 끝 따로 본다). 막 제목 카드가 아래에 있다
- 3막 제목·진입·떠날 때: 첨탑과 도로 끝이 아래 카드 자리와 겹치지 않는다
- 엔딩 가운데: 길 전체가 헤더 아래·화면 위 60% 안에 보이고, 끝에서 연락처 카드가 올라온다
- 헤더 메뉴가 한 줄이고, 진행 막대가 헤더 바로 아래 가로 막대다
- 경량(`2-4a-lite`): 블룸이 줄었지만 차 뒷불·빛줄기·열린 끝의 빛이 남아 있다
- `2-4a-hall`: 스펙 3절 "본문 저장소 패널 구간"의 허용된 결함 두 장면이 2-3b 때와 같다(회귀만 본다)

- [ ] **Step 4: 홀로그램 색과 데스크톱 성능**

Run: `CHECK_HEADLESS=1 rtk proxy npm run check:holograms` → ① 11장 ΔE 0, ③ 16개 모두 평균 ΔE 2 이하(2-3b 때 가장 큰 값 1.44)

`perf:journey`는 실제 Chrome 창을 띄운다. 돌리기 전에 사용자에게 "성능 측정으로 Chrome 창이 잠깐 뜹니다"라고 알린다.

Run: `rtk proxy npm run perf:journey` → 3회 모두 50ms 초과 0, 가장 무거운 프레임 드로콜 60 이하(2-3b 때 50), 프로그램 준비 때 = 끝, 텍스처 58.8MiB. 주사율과 함께 적는다

- [ ] **Step 5: 후처리 렌더 타깃 메모리**

3200 서버에서 `?debug=stats`의 `renderTargetBytes`를 두 조건으로 읽는다. 아래 스크립트를 작업 트리 밖에 `read-targets.cjs`로 두고 `node <그 경로>`로 돌린다.

```js
const { createRequire } = require("node:module");
const { chromium } = createRequire(`${process.cwd()}/package.json`)("@playwright/test");
(async () => {
  const browser = await chromium.launch({ headless: true, channel: "chromium", args: ["--ignore-gpu-blocklist"] });
  for (const [label, viewport, scale, query] of [
    ["3D 전체 1440×900 배율 2", { width: 1440, height: 900 }, 2, ""],
    ["3D 경량 390×844 배율 3(상한 1.5)", { width: 390, height: 844 }, 3, "&tier=lite"],
  ]) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: scale });
    await page.goto(`http://localhost:3200/journey?debug=stats${query}`);
    await page.locator('[data-journey-scene][data-state="ready"]').waitFor({ timeout: 30000 });
    const stats = await page.evaluate(() => window.__journeyStats);
    console.log(`${label}: 렌더 타깃 ${(stats.renderTargetBytes / 1048576).toFixed(1)}MiB, 텍스처 ${(stats.textureBytes / 1048576).toFixed(1)}MiB, 배율 ${stats.quality.dpr}`);
    await page.close();
  }
  await browser.close();
})();
```

두 줄을 스펙 7절에 적는다(10절 "후처리 렌더 타깃 메모리"를 닫는다).

- [ ] **Step 6: 휴대폰 실측(사용자)**

3200 서버를 끄고 같은 와이파이에서 열 수 있게 다시 띄운다.

Run: `rtk proxy npx next start -H 0.0.0.0 --port 3200`(다른 터미널)
Run: `ipconfig getifaddr en0` → 맥의 주소

사용자에게 다음을 그대로 알리고 결과를 기다린다.

1. 아이폰(Safari)과 안드로이드(Chrome)를 맥과 같은 와이파이에 연결하고, 저전력 모드를 끄고, 배터리 잔량과 충전 여부를 적어 둔다
2. `http://<맥 주소>:3200/journey?debug=perf`를 연다. 3D가 드러난 뒤 오버레이 위쪽의 단계가 `lite`인지 본다
3. "기종"에 모델명(예: iPhone 15, Galaxy S23)을 적고 "측정"을 누른다(약 1분, 화면을 만지지 않는다). 끝나면 "결과 복사"를 눌러 대화에 붙여 넣는다
4. 같은 페이지를 새로 열어 "오래 돌리기"(5분)를 누르고, 끝나면 "결과 복사"로 붙여 넣는다

받은 결과마다 판단한다(스펙 7절 "2-4a 기준"): 측정 3회 모두 `p95Ms` 33.4 이하이고 `p99Ms` 50.1 이하, 오래 돌리기 마지막 1분 `p95Ms` 33.4 이하(`longRun.meets`). 한 기기만 재면 다른 쪽은 미검증으로 적는다.

**기준을 못 지킨 기기가 있으면** 경량 블룸을 끄고 다시 잰다(스펙 5절). 사용자에게 결과와 함께 알리고 답을 받은 뒤 바꾼다:
- `src/lib/journey/capability.ts`: `Quality.bloom`을 `{ luminanceScale; levels } | null`로, `QUALITY.lite.bloom`을 `null`로
- `src/components/journey/scene/Effects.tsx`: `quality`가 `null`이면 `<Bloom>`을 넣지 않는다(`EffectComposer`의 자식은 조건으로 고른다)
- Task 2의 단위·e2e 기대값(경량 블룸 6단계·0.5)을 끈 값으로 고치고, Task 2의 테스트와 Step 1·6을 다시 돈다

서버는 `lsof -t -iTCP:3200 -sTCP:LISTEN`으로 찾은 PID만 끈다.

- [ ] **Step 7: 스펙에 완료와 실측을 적는다**

- 1절 단계 표의 `| 2-4a 휴대폰 3D |`를 `| 2-4a 휴대폰 3D (완료) |`로 바꾼다(두 기기 모두 기준을 지켰을 때. 한 기기만 쟀으면 "(완료, 안드로이드 미검증)"처럼 적는다)
- 7절 "2-4a 기준" 아래에 "2-4a 최종 실측"으로 Step 4(데스크톱, 주사율과 함께)·Step 5(렌더 타깃)·Step 6(기기마다 기종·GPU·브라우저·배율·캔버스·3회 p95/p99·오래 돌리기 마지막 1분 p95·저전력·배터리)을 적는다. 맥 에뮬레이션 숫자와 섞지 않는다
- 10절: "후처리 렌더 타깃 메모리"를 닫고, 세로 화면 항목에 Step 3의 확인 결과를 적는다

- [ ] **Step 8: 완료 보고와 커밋 정리를 제출한다**

완료 보고에 Step 1~6의 숫자와 세로 화면 캡처(네 크기·경량)를 남기고, 태스크별 파일 표와 메시지 초안을 낸다. 이 태스크의 초안 예:

```
docs: 여정 2-4a 완료와 휴대폰 실측 기록

- 2-4a 완료 조건(세로 화면 구도, 전환, 가림 없음, 고정 카드, 기기 판별·경량, 헤더·진행 막대, 데스크톱 회귀)을 최종 구현에서 확인했다
- 아이폰·안드로이드 실기기 30fps 기준과 후처리 렌더 타깃 메모리를 적었다
```
