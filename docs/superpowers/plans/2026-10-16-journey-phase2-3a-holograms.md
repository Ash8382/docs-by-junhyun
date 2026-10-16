# 여정(Journey) 2-3a 구현 계획 — 제품 화면 홀로그램과 클릭

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 대표 제품 화면 11장을 우주 도로 길가의 홀로그램으로 띄운다(1막은 길가에 고정, 2막은 차가 멈추면 빛 원반에서 떠오름, 3막은 PiCKCARE 저장소 다섯이 늘어서고 본문의 지금 저장소가 앞으로). 클릭·호버·링크 포커스·PiCKCARE 탭을 기존 "자세히 보기" 링크와 상세 패널 흐름에 잇고, 이미지나 GPU 업로드가 실패해도 장면이 이어지며, 3D 홀로그램이 켜지면 2막 본문 썸네일을 화면에서 감춘다.

**Architecture:** three 없는 순수 모듈 `lib/journey/holograms.ts`가 목록·쓰는 이미지·층 안 그림 영역·테두리 빛·`hologramsAt(p, front)`(자리·방향·나타난 정도·빛 원반)·PiCKCARE 앞줄·그리는 순서·포인터 대상·링크 짝을 정한다. `scripts/build-holograms.ts`가 11장을 768×480 층 WebP로 만들고, 장면은 이를 `DataArrayTexture` 하나로 묶어 업로드를 한 번 확인한 뒤(`scene/hologramAtlas.ts`) 인스턴스 메시 2개(화면 + 테두리, 빛기둥 + 원반)로 그린다(`scene/hologramMaterial.ts`, `hologramMeshes.ts`, `Holograms.tsx`). 클릭은 짝인 링크를 눌러 `ProjectDialog`의 흐름을 그대로 타고(`hologramLinks.ts`), 켜진 홀로그램과 링크 포커스는 작은 저장소(`lib/journey/hologramStatus.ts`)로 본문(썸네일)과 장면이 나눈다. 텍스처 추정은 업로드 단위로 고치고(`frameStats`), PiCKCARE 카메라는 구간 앞뒤 12%에서 정류장 시점으로 돈다(`timeline.viewWeight`).

**계획을 쓰며 확인한 것(사본 구현과 검증):**
- 이 계획의 코드를 HEAD(`88e511a`)와 같은 코드의 사본에 태스크마다 커밋하며 구현했다. 단위 316개(전 260, 태스크별 263 → 316), 타입 검사, eslint(바꾼 파일 오류 0. 전체는 기존 오류 6개 그대로), e2e 118 통과·4 건너뜀(블로그 14 + 여정 104. 건너뜀은 세로 화면의 홀로그램 자리 테스트)이 통과했다.
- 15개 태스크를 하나씩 적용한 중간 상태마다 tsc·vitest가 통과했다. 이 계획의 "찾을 부분 → 바꿀 내용"을 기준 상태에 차례로 적용하면 각 태스크의 결과와 글자 하나까지 같아지는 것을 생성기로 확인했다.
- 실패 단계의 기대 출력은 직전 태스크의 코드에 그 태스크의 테스트만 얹어 실제로 돌린 결과다(e2e는 Task 12·13·14를 데스크톱으로).
- 실측(사본, Apple M4, Chrome 창, 1440×900, 배율 2, 100Hz 화면, 3회): 프레임 평균 10.0ms, p95 10.8, p99 11.0, 최대 11.1, 50ms 초과 0. 가장 무거운 프레임 드로콜 46(2-2b 44 + 2), 셰이더 프로그램 준비 때 28 → 끝 28, 텍스처 GPU 추정 58.8 MiB(원본 기준 2-2b 38.2 + 홀로그램 배열 20.6).
- `check:holograms`: ① 11장 모두 ΔE 0(최대 0.00). ③ 막별 대표 시점 6곳, 화면에 보이는 홀로그램 14개 모두 평균 ΔE 2 이하(가장 큰 값 1.44, 2막에서 멀리 보이는 1막 EUTCHA). 내려받는 양: 층 이미지 파일 합계 203,436바이트, 받은 양 206,535바이트(헤더 3,099). app 스크린샷은 파일 140,882바이트, 상세의 app 탭을 열 때 next/image로 28,678바이트를 받았다.
- 측정하며 찾아 고친 것: 검증 스크립트가 잘라 낸 층을 손실 WebP로 다시 인코딩해 ΔE가 0.3~1.5로 나왔다(PNG로 넘긴다). 스크린샷은 P3 화면 색으로 바뀔 수 있어 캔버스 원본 화소로 읽는다. 숨긴 칸의 방향 계산이 NaN을 내 레이캐스트 경계 구를 망가뜨렸다(`screenBasis`의 기본 방향, 숨긴 칸은 크기 0). 홀로그램 실패가 통계 기록기보다 먼저 와 통계가 비었다(마지막 값을 들고 있다가 넣는다). 옮긴 e2e가 뒤 태스크의 도우미를 써 중간 상태의 빌드가 깨졌다(도우미를 같은 태스크로 옮김).
- 개발 서버(`next dev`)에서는 2-2b부터 여정 장면이 실패한다(StrictMode의 두 번 마운트에서 R3F가 컨텍스트를 일부러 잃게 하고, 그것이 컨텍스트 손실로 잡힌다). 프로덕션 빌드는 정상이라 이 계획의 브라우저 확인은 모두 `next build && next start`로 한다.

**스펙과 다르게 또는 더 구체적으로 정한 점(사용자 검토 대상, 스펙 3·4·7·8·9·10절에 2026-10-16로 반영):**
1. **PiCKCARE 카메라 12%.** 사용자 결정(2026-10-16). 카메라가 정류장 시점으로 도는 정도 `viewWeight`를 새로 두고, PiCKCARE만 구간 앞뒤 12%에서 돈다(프로젝트 정류장은 `dwellWeight`와 같다). 2·3막 홀로그램도 이만큼 떠오른다. 차의 움직임은 그대로다.
2. **자리 수치.** 1막 높이 3.4m, 2막 높이 1.0 + 2.3w m(헤더 위 9%에 닿지 않게). 3막은 기준 `s0 − 8m`, 앞줄 높이 3.8m·층 상자 6.4 × 4m, 뒷줄 높이 2.6m(시안 값은 앞줄이 소개 패널과 겹치고 패널 사이 기둥보다 넓었다. 격자 탐색으로 고름).
3. **3막 뒷줄 안전 영역.** 헤더를 피하고 화면에서 차와 겹치면 차보다 뒤에 있다. HTML 패널 뒤로 가려지는 것은 된다(차가 화면 왼쪽 가운데, 소개 패널이 왼쪽 위라 "패널과 겹치지 않음"을 만족하는 자리가 없었다).
4. **cardnews 홀로그램은 완성 세트 `set-1`.** 첫 장(마스터 4종)은 회색 빈 틀이다.
5. **스크롤 중 다시 맞추기는 마우스가 캔버스 위에 있는 동안 매 프레임 한 번.** 진행률이 바뀐 프레임에만 하면 감쇠가 끝난 뒤 호버가 옛 홀로그램에 남는다(Task 13 e2e가 이 경우 실패하는 것을 확인했다).
6. **app 상세의 세로 화면 세 장은 한 줄(3열 격자)로 둔다.** 위아래로 쌓으면 패널 몇 화면을 차지한다.
7. **`esbuild` 0.28.2를 개발 의존성으로 정확히 고정한다.** tsx를 통해 이미 설치·잠금 파일에 있고(2026-08-08 배포), `check:holograms` ①이 실제 재질을 브라우저 묶음으로 띄우는 데 쓴다.
8. **블룸 끄기 스위치(`&bloom=off`)는 블룸 세기를 0으로 둔다.** `EffectComposer`의 자식에 `false`를 넣을 수 없고, 나머지 패스를 그대로 두어야 비교가 정확하다.
9. **홀로그램 화면 자리를 쓰는 e2e 4개(클릭, 커서, 스크롤 중 호버, 두 번 클릭)는 데스크톱에서만 돈다.** 세로 화면의 홀로그램 자리는 2-4다.
10. **층 업로드는 `Holograms`를 처음 그릴 때(`useMemo`) 한 번 한다.** 장면과 같은 커밋에 메시가 들어가야 Warmup이 홀로그램 셰이더까지 미리 컴파일한다. 개발 모드의 두 번 렌더는 층 목록을 열쇠로 한 `WeakMap`이 같은 결과를 돌려준다.

**넘기는 것:** 2-3b(막별 풍경·도시·헤드라이트 빛 웅덩이). 2-4(세로 화면의 홀로그램 자리, 개발 서버의 장면 실패, 후처리 렌더 타깃 메모리 기록). PiCKCARE 첫 저장소가 자리를 잡은 정류장 시점에서 앞줄로 머무는 시간이 약 0.15화면인 점(스펙 10절, 캡처를 보고 판단).

**Tech Stack:** Next 16 App Router, React 19, TypeScript, three 0.181.2(`DataArrayTexture`, `InstancedMesh`, `ShaderMaterial`), @react-three/fiber 9.4.0(`frameloop="never"`, `useFrame` 우선순위, `events.update`), @react-three/postprocessing 3.0.4(postprocessing 6.38), vitest 4(node 환경에서 three 레이캐스트), @playwright/test 1.63, sharp 0.34.5, tsx, esbuild 0.28.2(개발)

**Spec:** `docs/superpowers/specs/2026-10-14-journey-design.md` (2026-10-15 2차 개정 + 2026-10-16 계획 반영: 1절 2-3a 완료 조건, 3절 "제품 화면 홀로그램 (2-3a)"·"홀로그램 상호작용 (2-3a)"·"카메라", 4절 모듈·의존성, 5절 로딩·실패, 6절 app 스크린샷, 7절 텍스처 집계·2-3a 예산, 8절 테스트). 2단계 계획 중 넷째다: 2-1 골격·2-2 시각 언어·2-2b 길·차·궤적·카메라(완료), **2-3a 제품 화면 홀로그램과 클릭(이 문서)**, 2-3b 막별 풍경, 2-4 기기 대응과 마감.

## Global Constraints

- **범위:** 홀로그램(목록·층 이미지·텍스처 배열·재질·메시·자리), 클릭·호버·링크 포커스·PiCKCARE 앞줄, 2막 썸네일 대체, app 스크린샷, 텍스처 집계 정정, PiCKCARE 카메라 시점 구간, 검증 도구만 만든다. 지형·도시·헤드라이트 빛 웅덩이(2-3b), 기기 등급·실행 중 강등·2D·움직임 줄이기·세로 화면 구도·개발 서버 장면 실패(2-4)는 만들지 않는다
- **같은 진행률이면 같은 장면:** `hologramsAt(p, front)`는 순수 함수다. 프레임마다 쌓는 값은 카메라 감쇠(`CameraRig`), PiCKCARE 앞줄 감쇠, 테두리 밝아짐 감쇠뿐이다
- **단일 원천:** 홀로그램 목록·이미지·잘라 쓸 영역·자리·테두리 빛·앞줄 규칙·링크 짝은 `lib/journey/holograms.ts`, 켜진 홀로그램과 링크 포커스는 `lib/journey/hologramStatus.ts`, 상세가 보여 주는 저장소는 `lib/journey/hash.ts`의 `activeRepo`에만 둔다. 데이터(`src/data/projects/`)에는 3D 정보를 넣지 않는다
- **오류 격리:** 홀로그램 층·텍스처 배열·GPU 업로드의 실패는 장면을 실패로 만들지 않는다. 층 로더는 던지지 않는다(던지면 `SceneBoundary`가 3D 전체를 멈춘다). 홀로그램 셰이더 컴파일 실패만 기존 규칙(3D 전체 정지)을 따른다
- **블로그 7개 글 화면은 바뀌지 않는다.** 블로그 e2e(픽셀·마크업)가 그대로 통과해야 하고, 기준(`e2e/__screenshots__/`, 로컬 전용)을 갱신하지 않는다
- **의존성:** `esbuild`(개발, `0.28.2` 정확히)만 더한다. 다른 패키지는 더하지 않는다
- **생성 파일은 스크립트로만 만든다.** `public/journey/holograms/`는 `npm run build:holograms`, `public/projects/pickcare/app/`은 `npm run build:app-screens`가 만든다(손으로 고치지 않는다)
- **시계 하나:** `/journey`에서 프레임을 도는 것은 GSAP ticker 하나뿐이다. 컴포넌트에서 `requestAnimationFrame`을 직접 쓰지 않는다(측정·검증 스크립트 제외)
- **스크롤 중 React 렌더 금지:** 호버·포커스·앞줄·밝아짐은 ref·외부 저장소와 `useFrame` 안에서만 흐른다. 켜진 홀로그램 저장소는 준비·실패 때만 바뀐다
- **셰이더를 스크롤 중에 다시 컴파일하지 않는다:** 홀로그램의 상태(층·영역·크기·색·불투명도·밝아짐·종류)는 모두 인스턴스 값이다
- **three·`@react-three/*` import는 `src/components/journey/scene/` 안에서만 한다**(그 폴더의 테스트 포함). 예외는 `scripts/check-holograms-page.ts`(검증 스크립트가 esbuild로 따로 묶는 브라우저 쪽)다. `src/lib/journey/`는 three 없는 순수 코드다
- **React Compiler 계열 린트 규칙이 에러로 켜져 있다**(`react-hooks/immutability`, `refs`, `purity`, `set-state-in-effect` 등): 훅이 돌려준 값(`useThree`의 `gl` 등)의 속성을 바꾸지 않는다(커서는 포인터 이벤트가 온 캔버스를 ref에 두고 바꾼다). effect 안 동기 `setState` 대신 외부 저장소를 쓴다
- **설명 문장(카피)을 넣지 않는다(사용자 결정, 2026-10-14).** 대체 텍스트와 출처 표기만 예외다
- **명령 실행:** Bash 검증 명령에는 `rtk proxy`를 붙이고 exit code를 믿는다. 파일은 Read 도구로 읽는다(`cat`은 rtk 필터가 주석 줄을 빠뜨린다). `npx tsx`·`npm run x -- 인자`는 rtk가 망가뜨리므로 `rtk proxy npm run <스크립트>`나 `rtk proxy npx tsx`로 실행하고, 인자는 환경 변수로 넘긴다. zsh에서 `$var:path`는 수정자로 해석되므로 `${var}:path`로 쓴다
- **기계 자원(2026-10-14 강제 재부팅 뒤 규칙):** 무거운 명령(Playwright, `next build`, vitest, `tsc`)은 하나씩 차례로 돌리고 백그라운드나 병렬로 돌리지 않는다. 그런 명령 전에 `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`로 다른 프로젝트의 무거운 작업이 없는지 확인하고, 있으면 끝날 때까지 기다린다(15초 간격, 10분 넘으면 BLOCKED). 사용자의 다른 프로젝트 개발 서버(`next dev -p 3010`)는 무거운 작업으로 세지 않고 건드리지 않는다. vitest는 늘 `--maxWorkers=4`로 돌린다. 띄운 서버는 `lsof -t -iTCP:<포트> -sTCP:LISTEN`으로 찾은 PID만 끈다(`pkill -f next-server`처럼 넓은 패턴 금지)
- **브라우저 확인은 프로덕션 빌드로 한다:** `rtk proxy npx next build && rtk proxy npx next start --port 3200`(다른 터미널). 개발 서버(`next dev`)에서는 2-2b부터 여정 장면이 실패한다
- **성능·색은 실제 Chrome 창에서 잰다.** 헤드리스(SwiftShader)는 색·속도가 다르다. 60fps(16.7ms) 목표와 다른 주사율에서 잰 숫자는 주사율과 함께 따로 적는다. 드로콜·셰이더 프로그램 수는 GPU와 상관없어 헤드리스 e2e로도 확인한다
- **커밋하지 않는다.** 에이전트는 `git add`/`commit`/`stash`/`reset`/`checkout`/`restore`를 실행하지 않는다. 각 태스크 마지막 단계는 파일별 변경 표와 커밋 메시지 초안 제출이다(`type: 한국어 요약` + 이유를 적는 `- ` 불릿, 트레일러 없음). 사용자는 모든 태스크가 끝날 때까지 커밋을 보류할 수 있다
- 기존 스타일을 따른다: 한국어 주석, `function` 선언형 컴포넌트, Tailwind 유틸리티. 단위 테스트는 소스 옆 `*.test.ts`, e2e는 `e2e/*.e2e.ts`. 대소문자만 다른 파일 이름을 같은 폴더에 두지 않는다

## Review Focus

1. **마우스를 둔 채 스크롤하거나, 스크롤을 멈춘 뒤 감쇠가 끝날 때.** 홀로그램이 포인터 밑을 지나가는데 호버·커서·클릭이 옛 홀로그램에 남으면 다른 프로젝트의 상세가 열린다. 사람은 화면에서 포인터를 덮은 홀로그램이 열리기를 기대한다 → Task 13 e2e "포인터를 두고 스크롤해도 호버는 포인터를 덮는 가장 가까운 홀로그램이고, 누르면 그 상세가 열린다", Task 11 단위 "그리는 순서가 바뀌어도 광선은 화면에 보이는 가장 가까운 홀로그램을 돌려준다"
2. **느린 망·막힌 층 이미지.** 한 장이 404이거나 깨졌을 때 장면 전체가 멈추거나 다른 홀로그램까지 빠질 수 있다. 사람은 그 홀로그램만 빠지고 썸네일이 대신 보이기를 기대한다 → Task 10 단위(한 가지 색), Task 12 e2e(한 장·전부 404), Task 14 e2e(받지 못한 홀로그램의 썸네일)
3. **GPU가 텍스처를 받지 못할 때.** three는 업로드 실패를 경고만 하고 던지지 않아, 확인하지 않으면 검은 화면 11장이 떠 있다. 앞선 무관한 GL 오류를 업로드 실패로 잘못 보면 멀쩡한 기기에서 홀로그램이 사라진다 → Task 10 단위 "앞서 쌓인 무관한 오류를 비운 뒤…", "올리다 예외가 나면…", Task 12 e2e "텍스처 배열을 올리지 못하면(GPU 업로드 오류)…"
4. **상세가 열리는 중·닫히는 중의 연타.** 두 번 누르면 기록이 둘 남아 뒤로 가기 한 번으로 닫히지 않는다 → Task 13 e2e "홀로그램을 두 번 눌러도 기록은 하나만 남는다"
5. **장면 상태가 바뀔 때의 썸네일.** WebGL이 없거나, 실행 중 컨텍스트를 잃거나, 배열이 실패하면 썸네일이 감춰진 채 남을 수 있다. 사람은 3D가 대신 보여 주지 못하는 화면은 언제나 썸네일로 보기를 기대한다 → Task 14 e2e 다섯(준비, WebGL 없음, 한 장 실패, 배열 실패, 실행 중 실패)

---

## 파일 구조

| 파일 | 책임 |
|---|---|
| `src/components/journey/scene/frameStats.ts` | (수정) 텍스처 추정을 업로드 단위로, 배열 층 수, 홀로그램 통계(`?debug=stats`) |
| `src/lib/journey/hash.ts` | (수정) 상세가 보여 주는 저장소 `activeRepo` |
| `scripts/build-app-screens.ts`, `public/projects/pickcare/app/` | App Store 스크린샷 세 장을 받아 WebP로 |
| `src/data/projects/pickcare.ts` | (수정) app 저장소 화면 세 장 |
| `src/components/journey/ProjectDialog.tsx` | (수정) `activeRepo`, 세로 화면은 한 줄 격자 |
| `src/lib/journey/timeline.ts`, `drive.ts` | (수정) 카메라가 정류장 시점으로 도는 정도 `viewWeight`(PiCKCARE 12%) |
| `src/lib/journey/holograms.ts` | 홀로그램 목록·이미지·층 안 그림 영역·테두리 빛·자리(`hologramsAt`)·화면 축·앞줄·그리는 순서·포인터 대상·링크 짝 (순수) |
| `scripts/build-holograms.ts`, `public/journey/holograms/` | 층 이미지 11장(768×480 WebP) |
| `src/lib/journey/hologramStatus.ts` | 켜진 홀로그램, 썸네일 감추기 판정, 링크 포커스 |
| `src/components/journey/scene/hologramAtlas.ts` | 층 읽기(실패는 null), 텍스처 배열, 업로드 확인 |
| `src/components/journey/scene/hologramMaterial.ts` | 화면 + 테두리, 빛기둥 + 원반 셰이더 재질 |
| `src/components/journey/scene/hologramMeshes.ts` | 인스턴스 메시 2개, 한 프레임 쓰기, 레이캐스트 거르기와 칸 → 홀로그램 |
| `src/components/journey/scene/Holograms.tsx` | 장면 컴포넌트: 층 받기·배열·업로드, 매 프레임 자리, 포인터, 다시 맞추기, 통계 |
| `src/components/journey/scene/Scene.tsx`, `Effects.tsx` | (수정) 홀로그램 넣기, `?debug=stats&bloom=off` |
| `src/components/journey/hologramLinks.ts` | 짝인 링크 누르기, 링크 포커스 추적 훅 |
| `src/components/journey/JourneyStage.tsx` | (수정) 링크 포커스 추적 |
| `src/components/journey/HologramThumbnail.tsx`, `JourneyContent.tsx` | 2막 썸네일 감싸개, (수정) 썸네일 감싸기 |
| `scripts/check-holograms.ts`, `scripts/check-holograms-page.ts` | 화면 발광 없음·블룸 기여·내려받는 양 검증 |
| `scripts/capture-journey.ts` | (수정) `CAPTURE_SET=holograms` |
| `e2e/journey.e2e.ts`, 단위 테스트들 | (수정·추가) 각 태스크의 테스트 |

---

### Task 1: 텍스처 추정 정정 — 배열은 층 수까지, 같은 원본·설정은 한 번

스펙 7절 "텍스처 메모리"다. three는 원본(source)과 업로드 설정(필터·형식·색 공간 등, `getTextureCacheKey`)이 같은 텍스처를 GPU에 한 번만 올린다. 지금 `sceneTextureBytes`는 텍스처 객체마다 세어, GLTFLoader가 재질마다 복제한 차 Occlusion 텍스처 10개를 따로 더했다(2-2b 보고 62.2 MiB → 원본 기준 38.2 MiB). 홀로그램 배열(Task 12)을 넣기 전에 업로드 단위로 세고, 배열 텍스처는 층 수까지 세게 고친다.

**Files:**
- Modify: `e2e/journey.e2e.ts`, `src/components/journey/scene/frameStats.test.ts`, `src/components/journey/scene/frameStats.ts`

**Interfaces:**
- Produces: `textureBytes(texture)`가 `DataArrayTexture`의 층 수(`image.depth`)를 곱한다. `sceneTextureBytes(scene)`가 업로드 단위(원본 uuid + 설정 키)로 한 번씩 센다(export 이름·모양은 그대로)

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/components/journey/scene/frameStats.test.ts`에서 찾을 부분:

```ts
  CubeTexture,
  DataTexture,
  EquirectangularReflectionMapping,
  HalfFloatType,
  LinearFilter,
  Mesh,
```

바꿀 내용:

```ts
  CubeTexture,
  DataArrayTexture,
  DataTexture,
  EquirectangularReflectionMapping,
  HalfFloatType,
  LinearFilter,
  LinearMipmapLinearFilter,
  Mesh,
```

`src/components/journey/scene/frameStats.test.ts`에서 찾을 부분:

```ts
  ShaderMaterial,
  Texture,
```

바꿀 내용:

```ts
  ShaderMaterial,
  SRGBColorSpace,
  Texture,
```

`src/components/journey/scene/frameStats.test.ts`에서 찾을 부분:

```ts

  it("장면의 배경·재질 텍스처를 한 번씩만 센다", () => {
```

바꿀 내용:

```ts

  it("배열 텍스처는 층 수를 곱한다(밉맵이면 4/3배)", () => {
    const flat = new DataArrayTexture(new Uint8Array(8 * 4 * 4 * 3), 8, 4, 3);
    expect(textureBytes(flat)).toBe(8 * 4 * 4 * 3);
    const mipmapped = new DataArrayTexture(new Uint8Array(8 * 4 * 4 * 3), 8, 4, 3);
    mipmapped.generateMipmaps = true;
    mipmapped.minFilter = LinearMipmapLinearFilter;
    expect(textureBytes(mipmapped)).toBe(Math.round(8 * 4 * 4 * 3 * (4 / 3)));
  });

  it("원본과 업로드 설정이 같은 복제 텍스처는 한 번만 센다(차 Occlusion을 재질마다 복제한다)", () => {
    const scene = new Scene();
    const original = imageTexture(64, 64);
    original.generateMipmaps = false;
    original.minFilter = LinearFilter;
    for (let i = 0; i < 3; i++) scene.add(new Mesh(undefined, new MeshStandardMaterial({ aoMap: original.clone() })));
    expect(sceneTextureBytes(scene)).toBe(64 * 64 * 4);
  });

  it("원본이 같아도 업로드 설정(색 공간 등)이 다르면 따로 센다", () => {
    const scene = new Scene();
    const linear = imageTexture(64, 64);
    linear.generateMipmaps = false;
    linear.minFilter = LinearFilter;
    const srgb = linear.clone();
    srgb.colorSpace = SRGBColorSpace;
    scene.add(new Mesh(undefined, new MeshStandardMaterial({ map: srgb, aoMap: linear })));
    expect(sceneTextureBytes(scene)).toBe(2 * 64 * 64 * 4);
  });

  it("장면의 배경·재질 텍스처를 한 번씩만 센다", () => {
```

- [ ] **Step 2: 실패를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4 src/components/journey/scene/frameStats.test.ts`
Expected: FAIL — `Tests  2 failed | 9 passed (11)`. 배열은 `expected 128 to be 384`, 복제 세 개는 `expected 49152 to be 16384`

- [ ] **Step 3: 집계를 고친다**

`src/components/journey/scene/frameStats.ts`에서 찾을 부분:

```ts
 * 렌더러 통계(info)는 autoReset을 끄고 프레임마다 한 번 비우므로, 후처리 패스까지 합친 프레임 하나의 드로콜이다.
 * 텍스처 메모리는 장면이 쓰는 텍스처의 크기·형식으로 계산한 GPU 업로드 추정치다. 등장방형 배경을 three가 큐브로 바꾸며 만드는
 * 텍스처와 깊이 버퍼도 넣는다. 후처리 렌더 타깃과 환경 반사의 PMREM 변환(약 3MB)은 넣지 않는다.
 */
```

바꿀 내용:

```ts
 * 렌더러 통계(info)는 autoReset을 끄고 프레임마다 한 번 비우므로, 후처리 패스까지 합친 프레임 하나의 드로콜이다.
 * 텍스처 메모리는 장면이 쓰는 텍스처의 크기·형식으로 계산한 GPU 업로드 추정치다(스펙 7절). 등장방형 배경을 three가 큐브로 바꾸며 만드는
 * 텍스처와 깊이 버퍼도 넣는다. 후처리 렌더 타깃과 환경 반사의 PMREM 변환(약 3MB)은 넣지 않는다.
 * three는 원본(source)과 업로드 설정이 같은 텍스처를 GPU에 한 번만 올리므로 그런 복제는 한 번만 센다.
 */
```

`src/components/journey/scene/frameStats.ts`에서 찾을 부분:

```ts
/**
 * 텍스처 하나의 GPU 업로드 추정치(바이트). 압축 텍스처는 밉맵 데이터 그대로, 나머지는 크기 × 화소 크기(밉맵이면 4/3배).
 * 큐브 텍스처는 image가 면 여섯의 배열이라 면마다 센다.
 */
```

바꿀 내용:

```ts
/**
 * 텍스처 하나의 GPU 업로드 추정치(바이트). 압축 텍스처는 밉맵 데이터 그대로, 나머지는 크기 × 층 수 × 화소 크기(밉맵이면 4/3배).
 * 큐브 텍스처는 image가 면 여섯의 배열이라 면마다 세고, 배열 텍스처(홀로그램)는 층(depth)마다 센다.
 */
```

`src/components/journey/scene/frameStats.ts`에서 찾을 부분:

```ts
  }
  const images = (Array.isArray(texture.image) ? texture.image : [texture.image]) as ({ width?: number; height?: number } | null)[];
  const pixels = images.reduce((sum, image) => sum + (image?.width ?? 0) * (image?.height ?? 0), 0);
  return Math.round(pixels * pixelBytes(texture) * (mipmapped(texture) ? 4 / 3 : 1));
}
```

바꿀 내용:

```ts
  }
  const images = (Array.isArray(texture.image) ? texture.image : [texture.image]) as
    | ({ width?: number; height?: number; depth?: number } | null)[];
  const layers = (texture as { isDataArrayTexture?: boolean }).isDataArrayTexture ? (images[0]?.depth ?? 1) : 1;
  const pixels = images.reduce((sum, image) => sum + (image?.width ?? 0) * (image?.height ?? 0), 0) * layers;
  return Math.round(pixels * pixelBytes(texture) * (mipmapped(texture) ? 4 / 3 : 1));
}

/**
 * GPU에 올라가는 단위. three r181 WebGLTextures는 원본(source)과 이 설정들(getTextureCacheKey)이 같으면 WebGL 텍스처 하나를 같이 쓴다.
 * GLTFLoader는 재질마다 텍스처를 복제하므로(차 Occlusion 하나가 복제 10개) 객체가 아니라 이 단위로 센다.
 */
function uploadKey(texture: Texture): string {
  return [
    texture.source.uuid,
    texture.wrapS,
    texture.wrapT,
    (texture as { wrapR?: number }).wrapR ?? 0,
    texture.magFilter,
    texture.minFilter,
    texture.anisotropy,
    texture.internalFormat,
    texture.format,
    texture.type,
    texture.generateMipmaps,
    texture.premultiplyAlpha,
    texture.flipY,
    texture.unpackAlignment,
    texture.colorSpace,
  ].join(":");
}
```

`src/components/journey/scene/frameStats.ts`에서 찾을 부분:

```ts

/** 장면이 쓰는 텍스처(배경, 환경, 재질의 모든 텍스처 칸과 uniform)를 한 번씩만 센 추정치 */
export function sceneTextureBytes(scene: Scene): number {
  const textures = new Set<Texture>();
  const add = (value: unknown) => {
    if (value && typeof value === "object" && (value as Texture).isTexture) textures.add(value as Texture);
  };
```

바꿀 내용:

```ts

/** 장면이 쓰는 텍스처(배경, 환경, 재질의 모든 텍스처 칸과 uniform)를 GPU에 올라가는 단위로 한 번씩만 센 추정치 */
export function sceneTextureBytes(scene: Scene): number {
  const textures = new Map<string, Texture>();
  const add = (value: unknown) => {
    if (value && typeof value === "object" && (value as Texture).isTexture) {
      const texture = value as Texture;
      textures.set(uploadKey(texture), texture);
    }
  };
```

`src/components/journey/scene/frameStats.ts`에서 찾을 부분:

```ts
      : 0;
  return [...textures].reduce((sum, texture) => sum + textureBytes(texture), derived);
}
```

바꿀 내용:

```ts
      : 0;
  return [...textures.values()].reduce((sum, texture) => sum + textureBytes(texture), derived);
}
```

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts
  expect(stats.maxCalls).toBeLessThanOrEqual(60);
  // 은하 사진(4096×2048, 밉맵 없이 약 33.5MB)과 차 텍스처가 들어 있어야 하고, 스펙 7절 예산(100MB) 아래여야 한다.
  expect(stats.textureBytes).toBeGreaterThan(20 * 1024 * 1024);
```

바꿀 내용:

```ts
  expect(stats.maxCalls).toBeLessThanOrEqual(60);
  // 은하 사진(4096×2048, 밉맵 없이 32.0MiB)과 차 텍스처가 들어 있어야 하고, 스펙 7절 예산(100MiB) 아래여야 한다.
  expect(stats.textureBytes).toBeGreaterThan(20 * 1024 * 1024);
```

- [ ] **Step 4: 통과를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4 src/components/journey/scene/frameStats.test.ts`
Expected: PASS — `Tests  11 passed (11)`

- [ ] **Step 5: 전체 확인**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`은 무시)

Run: `rtk proxy npx tsc --noEmit` → exit 0
Run: `rtk proxy npx vitest run --maxWorkers=4` → `Tests  263 passed (263)`
Run: `rtk proxy npx eslint src/components/journey/scene/frameStats.ts src/components/journey/scene/frameStats.test.ts e2e/journey.e2e.ts` → exit 0, 출력 없음

- [ ] **Step 6: 커밋 정리를 제출한다**

파일별 변경 표와 메시지 초안. 초안 예:

```
fix: 여정 텍스처 추정을 업로드 단위로 세고 배열 층 수를 반영

- three는 원본과 업로드 설정이 같은 텍스처를 한 번만 올린다. 복제마다 세어 62.2MiB로 부풀었다(원본 기준 38.2MiB)
- 홀로그램 텍스처 배열(2-3a)을 층 수까지 센다
```

---

### Task 2: 상세 패널이 보여 줄 저장소 고르기를 lib로

스펙 3절 "PiCKCARE 앞줄"의 1번이다. 상세 패널은 해시의 저장소, 없으면 첫 저장소를 보여 준다. 3D 앞줄(Task 7)이 같은 판정을 써야 하므로 `ProjectDialog` 안의 식을 `lib/journey/hash.ts`의 `activeRepo`로 옮긴다.

**Files:**
- Modify: `src/components/journey/ProjectDialog.tsx`, `src/lib/journey/hash.test.ts`, `src/lib/journey/hash.ts`

**Interfaces:**
- Produces: `activeRepo(project: ReposProject, repoId?: RepoId): Repo` (`src/lib/journey/hash.ts`)

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/lib/journey/hash.test.ts`에서 찾을 부분:

```ts
import { describe, expect, it } from "vitest";
import { DETAIL_SLUGS, journeyHash, parseJourneyHash } from "./hash";

```

바꿀 내용:

```ts
import { describe, expect, it } from "vitest";
import { pickcare } from "@/data/projects/pickcare";
import { DETAIL_SLUGS, activeRepo, journeyHash, parseJourneyHash } from "./hash";

```

`src/lib/journey/hash.test.ts`에서 찾을 부분:

```ts

  it("만든 해시를 다시 읽으면 같다", () => {
```

바꿀 내용:

```ts

  it("상세가 보여 주는 저장소는 해시의 저장소, 없으면 첫 저장소다", () => {
    expect(activeRepo(pickcare, "biz").id).toBe("biz");
    expect(activeRepo(pickcare, undefined).id).toBe("frontend");
  });

  it("만든 해시를 다시 읽으면 같다", () => {
```

- [ ] **Step 2: 실패를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4 src/lib/journey/hash.test.ts`
Expected: FAIL — `Tests  1 failed | 7 passed (8)`, `TypeError: activeRepo is not a function`

- [ ] **Step 3: 함수를 옮긴다**

`src/lib/journey/hash.ts`에서 찾을 부분:

```ts
import { projects } from "@/data/projects";
import type { RepoId } from "@/data/projects/types";

```

바꿀 내용:

```ts
import { projects } from "@/data/projects";
import type { Repo, RepoId, ReposProject } from "@/data/projects/types";

```

`src/lib/journey/hash.ts` 끝에 붙인다:

```ts

/** 상세 패널이 보여 주는 저장소: 해시의 저장소, 없으면 첫 저장소. 3D의 PiCKCARE 앞줄(holograms.ts)도 같은 판정을 쓴다 */
export function activeRepo(project: ReposProject, repoId?: RepoId): Repo {
  return project.repos.find((repo) => repo.id === repoId) ?? project.repos[0];
}
```

`src/components/journey/ProjectDialog.tsx`에서 찾을 부분:

```tsx
import { lockScroll, unlockScroll } from "@/lib/journey/engine";
import { journeyHash, parseJourneyHash } from "@/lib/journey/hash";
import { getHash, getServerHash, pushHash, replaceHash, subscribeHash } from "@/lib/journey/hashStore";
```

바꿀 내용:

```tsx
import { lockScroll, unlockScroll } from "@/lib/journey/engine";
import { activeRepo, journeyHash, parseJourneyHash } from "@/lib/journey/hash";
import { getHash, getServerHash, pushHash, replaceHash, subscribeHash } from "@/lib/journey/hashStore";
```

`src/components/journey/ProjectDialog.tsx`에서 찾을 부분:

```tsx
function ReposDetail({ project, repoId }: { project: ReposProject; repoId?: RepoId }) {
  const active = project.repos.find((repo) => repo.id === repoId) ?? project.repos[0];
  return (
```

바꿀 내용:

```tsx
function ReposDetail({ project, repoId }: { project: ReposProject; repoId?: RepoId }) {
  const active = activeRepo(project, repoId);
  return (
```

- [ ] **Step 4: 통과를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4 src/lib/journey/hash.test.ts`
Expected: PASS — `Tests  8 passed (8)`

- [ ] **Step 5: 전체 확인**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`은 무시)

Run: `rtk proxy npx tsc --noEmit` → exit 0
Run: `rtk proxy npx vitest run --maxWorkers=4` → `Tests  264 passed (264)`
Run: `rtk proxy npx eslint src/lib/journey/hash.ts src/lib/journey/hash.test.ts src/components/journey/ProjectDialog.tsx` → exit 0, 출력 없음

- [ ] **Step 6: 커밋 정리를 제출한다**

파일별 변경 표와 메시지 초안. 초안 예:

```
refactor: 상세 패널이 보여 줄 저장소 고르기를 lib로 옮김

- 3D의 PiCKCARE 앞줄이 상세 패널과 같은 판정(해시의 저장소, 없으면 첫 저장소)을 쓰게 한다
```

---

### Task 3: PiCKCARE app — App Store 스크린샷 세 장

스펙 6절 "제품 화면"이다. app 저장소는 화면이 없어 홀로그램(Task 4)과 상세 패널에 쓸 것이 없다. App Store 소개 페이지(id6809377321)의 공식 스크린샷 앞 세 장(홈·픽라운지·픽키랩)을 스크립트로 한 번 받아 WebP로 두고 데이터에 넣는다. 세로로 긴 휴대폰 화면 세 장은 상세 패널에서 한 줄 격자로 둔다(위아래로 쌓으면 패널 몇 화면을 차지한다). 블로그 PiCKCARE 글은 저장소 화면을 그리지 않아 블로그 화면은 바뀌지 않는다.

**Files:**
- Create: `scripts/build-app-screens.ts`
- Modify: `e2e/journey.e2e.ts`, `package.json`, `src/components/journey/ProjectDialog.tsx`, `src/data/projects/pickcare.ts`, `src/data/projects/projects.test.ts`
- Generate: `public/projects/pickcare/app/home.webp`·`lounge.webp`·`pickylab.webp`(스크립트가 만든다)

**Interfaces:**
- Produces: app 저장소 `screens` 세 장(`/projects/pickcare/app/home.webp`·`lounge.webp`·`pickylab.webp`, 645×1395), `npm run build:app-screens`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/data/projects/projects.test.ts`에서 찾을 부분:

```ts

  it("isItemGroups는 소제목 묶음만 골라낸다", () => {
```

바꿀 내용:

```ts

  it("PiCKCARE app 저장소는 App Store 공식 스크린샷 세 장(홈·픽라운지·픽키랩)을 가진다", () => {
    const pickcare = projects.find((project) => project.slug === "pickcare");
    if (pickcare?.kind !== "repos") throw new Error("PiCKCARE는 저장소 구조 글이어야 합니다");
    const app = pickcare.repos.find((repo) => repo.id === "app");
    expect(app?.screens.map((screen) => screen.src)).toEqual([
      "/projects/pickcare/app/home.webp",
      "/projects/pickcare/app/lounge.webp",
      "/projects/pickcare/app/pickylab.webp",
    ]);
  });

  it("isItemGroups는 소제목 묶음만 골라낸다", () => {
```

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts
  await expect(page.getByRole("tabpanel")).toContainText("pickcare-studio");
});
```

바꿀 내용:

```ts
  await expect(page.getByRole("tabpanel")).toContainText("pickcare-studio");
});

test("PiCKCARE app 탭은 App Store 화면 세 장을 한 줄에 보인다", async ({ page }) => {
  await page.goto("/journey#pickcare/app");
  const screens = page.getByRole("tabpanel").getByRole("region", { name: "제품 화면" }).getByRole("img");
  await expect(screens).toHaveCount(3);
  const tops = await screens.evaluateAll((images) => images.map((image) => Math.round(image.getBoundingClientRect().top)));
  expect(new Set(tops).size).toBe(1);
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4 src/data/projects/projects.test.ts`
Expected: FAIL — `Tests  1 failed | 53 passed (54)`, `expected [] to deeply equal [ …(3) ]`

- [ ] **Step 3: 받는 스크립트를 쓴다**

`scripts/build-app-screens.ts` 전체:

```ts
import { mkdir } from "node:fs/promises";
import sharp from "sharp";

/**
 * PiCKCARE app 저장소의 제품 화면(스펙 6절 "제품 화면"): App Store 소개 페이지(id6809377321)의 공식 스크린샷 앞 세 장
 * (홈·라운지·피키랩)을 받아 WebP로 저장한다. iTunes lookup이 주는 주소의 크기 부분(320x480bb.jpg)을 645x1398bb.jpg로 바꿔
 * 큰 판을 받는다. 한 번 받아 저장소에 넣는다. 상세 패널과 홀로그램(홈)이 함께 쓴다.
 *
 * 사용법: npm run build:app-screens
 */
const LOOKUP_URL = "https://itunes.apple.com/lookup?id=6809377321&country=kr";
const NAMES = ["home", "lounge", "pickylab"] as const;
const OUTPUT_DIR = "public/projects/pickcare/app";
const LARGE_SIZE = "645x1398bb.jpg";
const QUALITY = 85;

async function main() {
  const response = await fetch(LOOKUP_URL);
  if (!response.ok) throw new Error(`iTunes lookup 응답이 ${response.status}입니다`);
  const lookup = (await response.json()) as { results: { screenshotUrls?: string[] }[] };
  const urls = lookup.results[0]?.screenshotUrls ?? [];
  await mkdir(OUTPUT_DIR, { recursive: true });
  for (const name of NAMES) {
    const url = urls.find((item) => item.includes(`/${name}.png/`));
    if (!url) throw new Error(`App Store 스크린샷이 없습니다: ${name}`);
    const large = url.replace(/[^/]+$/, LARGE_SIZE);
    const image = await fetch(large);
    if (!image.ok) throw new Error(`스크린샷을 받지 못했습니다(${image.status}): ${large}`);
    const file = `${OUTPUT_DIR}/${name}.webp`;
    const info = await sharp(Buffer.from(await image.arrayBuffer())).webp({ quality: QUALITY }).toFile(file);
    console.log(`${file}: ${info.width}×${info.height}, ${(info.size / 1024).toFixed(1)}KB`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

`package.json`에서 찾을 부분:

```json
    "build:car": "tsx scripts/build-car.ts",
    "server:dev": "tsx watch server/index.ts",
```

바꿀 내용:

```json
    "build:car": "tsx scripts/build-car.ts",
    "build:app-screens": "tsx scripts/build-app-screens.ts",
    "server:dev": "tsx watch server/index.ts",
```

- [ ] **Step 4: 스크린샷을 받는다(인터넷 필요)**

Run: `rtk proxy npm run build:app-screens`
Expected: 세 줄이 나오고 exit 0

```
public/projects/pickcare/app/home.webp: 645×1395, …KB
public/projects/pickcare/app/lounge.webp: 645×1395, …KB
public/projects/pickcare/app/pickylab.webp: 645×1395, …KB
```

크기가 645×1395가 아니면(App Store가 스크린샷을 바꾼 경우) 아래 데이터의 `width`·`height`를 출력대로 맞춘다. 데이터 무결성 테스트가 파일 크기와 대조한다.

- [ ] **Step 5: 데이터와 상세 패널을 고친다**

`src/data/projects/pickcare.ts`에서 찾을 부분:

```ts
      ],
      screens: [],
      cases: [
```

바꿀 내용:

```ts
      ],
      screens: [
        {
          src: "/projects/pickcare/app/home.webp",
          alt: "PiCKCARE 앱 홈 화면(App Store 스크린샷)",
          width: 645,
          height: 1395,
        },
        {
          src: "/projects/pickcare/app/lounge.webp",
          alt: "PiCKCARE 앱 픽라운지 화면(App Store 스크린샷)",
          width: 645,
          height: 1395,
        },
        {
          src: "/projects/pickcare/app/pickylab.webp",
          alt: "PiCKCARE 앱 픽키랩 화면(App Store 스크린샷)",
          width: 645,
          height: 1395,
        },
      ],
      cases: [
```

`src/components/journey/ProjectDialog.tsx`에서 찾을 부분:

```tsx

/** 원본 폭의 절반까지만 키워 레티나에서도 선명하게 보인다(썸네일이 작은 Stock2U·Tix2U 포함). */
function Screens({ screens }: { screens: Screen[] }) {
  if (screens.length === 0) return null;
  return (
    <section className="mt-6 space-y-3" aria-label="제품 화면">
      {screens.map((screen) => (
```

바꿀 내용:

```tsx

/**
 * 원본 폭의 절반까지만 키워 레티나에서도 선명하게 보인다(썸네일이 작은 Stock2U·Tix2U 포함).
 * 세로로 긴 휴대폰 화면(PiCKCARE app)은 한 줄에 나란히 둔다. 위아래로 쌓으면 패널 몇 화면을 차지한다.
 */
function Screens({ screens }: { screens: Screen[] }) {
  if (screens.length === 0) return null;
  const phone = screens.every((screen) => screen.height > screen.width);
  return (
    <section className={phone ? "mt-6 grid grid-cols-3 gap-3" : "mt-6 space-y-3"} aria-label="제품 화면">
      {screens.map((screen) => (
```

`src/components/journey/ProjectDialog.tsx`에서 찾을 부분:

```tsx
          height={screen.height}
          sizes="(min-width: 640px) 512px, 100vw"
          className="h-auto w-full rounded-lg border border-white/10"
          style={{ maxWidth: screen.width / 2 }}
        />
```

바꿀 내용:

```tsx
          height={screen.height}
          sizes={phone ? "(min-width: 640px) 170px, 33vw" : "(min-width: 640px) 512px, 100vw"}
          className="h-auto w-full rounded-lg border border-white/10"
          style={phone ? undefined : { maxWidth: screen.width / 2 }}
        />
```

- [ ] **Step 6: 통과를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4 src/data/projects/projects.test.ts`
Expected: PASS — `Tests  54 passed (54)`

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`은 무시)

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts -g "app 탭은"`
Expected: PASS — `2 passed`(desktop·mobile). 웹 서버는 설정대로 새로 빌드한다(약 2분)

- [ ] **Step 7: 전체 확인**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`은 무시)

Run: `rtk proxy npx tsc --noEmit` → exit 0
Run: `rtk proxy npx vitest run --maxWorkers=4` → `Tests  265 passed (265)`
Run: `rtk proxy npx eslint scripts/build-app-screens.ts src/data/projects/pickcare.ts src/data/projects/projects.test.ts src/components/journey/ProjectDialog.tsx e2e/journey.e2e.ts` → exit 0, 출력 없음

- [ ] **Step 8: 커밋 정리를 제출한다**

파일별 변경 표와 메시지 초안. 초안 예:

```
feat: PiCKCARE app 저장소에 App Store 스크린샷 세 장 추가

- 홀로그램과 상세 패널에 쓸 app 화면이 없었다(스펙 6절 출처: App Store 공식 스크린샷)
- 세로 휴대폰 화면은 상세 패널에서 한 줄 격자로 둔다
- 커밋에 public/projects/pickcare/app/ 세 파일을 함께 넣는다
```

---

### Task 4: 홀로그램 목록·층 안 그림 영역·테두리 빛

스펙 3절 "제품 화면 홀로그램 (2-3a)"의 목록·쓰는 이미지·테두리 세기다. 홀로그램은 11개(1막 셋, 2막 셋, PiCKCARE 저장소 다섯)이고 순서가 텍스처 배열의 층 번호다. 홈 화면 캡처가 있으면 그것, 없으면 썸네일, PiCKCARE는 저장소의 첫 화면(cardnews는 빈 틀인 마스터 대신 완성 세트 `set-1`)을 쓴다. Todo App은 그라데이션 가운데의 카드만 잘라 쓴다. 잘라 쓸 영역은 데이터가 아니라 이 모듈에 둔다(스펙 6절). 테두리는 궤적 색의 색조에 휘도(쉬는 때 0.55, 호버 0.8, 후광 0.12·0.18)를 곱해 최대가 블룸 문턱 1 아래다.

**Files:**
- Create: `src/lib/journey/holograms.test.ts`, `src/lib/journey/holograms.ts`

**Interfaces:**
- Consumes: `projects`, `DETAIL_SLUGS`·`journeyHash`(hash.ts), `STOPS`(timeline.ts), `LinearRgb`(trail.ts)
- Produces: `LAYER = { width: 768, height: 480 }`, `interface PixelRect`, `interface Hologram { id, stopId, act, repo?, src, width, height, crop?, layerFile, linkHash }`, `HOLOGRAMS: readonly Hologram[]`, `sourceSize(hologram)`, `layerRect(width, height): PixelRect`, `FRAME_LIGHT = { line: [0.55, 0.8], halo: [0.12, 0.18] }`, `luminance(color)`, `frameLight(color, line, halo, hover): LinearRgb`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/lib/journey/holograms.test.ts` 전체:

```ts
import { describe, expect, it } from "vitest";
import { STOPS } from "./timeline";
import { CAR_END } from "./drive";
import { trailColor } from "./trail";
import {
  FRAME_LIGHT,
  HOLOGRAMS,
  LAYER,
  frameLight,
  layerRect,
  luminance,
  sourceSize,
} from "./holograms";

describe("홀로그램 목록", () => {
  it("1막 셋, 2막 셋, PiCKCARE 저장소 다섯 순서로 11개다", () => {
    expect(HOLOGRAMS.map((hologram) => hologram.id)).toEqual([
      "kokoa-clone",
      "todo-app",
      "eutcha",
      "stock2u",
      "tix2u",
      "pfplay",
      "pickcare/frontend",
      "pickcare/biz",
      "pickcare/studio",
      "pickcare/app",
      "pickcare/cardnews",
    ]);
    for (const hologram of HOLOGRAMS) {
      const stop = STOPS.find((item) => item.id === hologram.stopId);
      expect(stop?.act, hologram.id).toBe(hologram.act);
    }
  });

  it("홈 화면 캡처가 있으면 그것, 없으면 썸네일, PiCKCARE는 저장소의 첫 화면(cardnews는 완성 세트)을 쓴다", () => {
    const src = Object.fromEntries(HOLOGRAMS.map((hologram) => [hologram.id, hologram.src]));
    expect(src["kokoa-clone"]).toBe("/kokoa-clone-thumb.png");
    expect(src["todo-app"]).toBe("/projects/todo-app/home.webp");
    expect(src["stock2u"]).toBe("/stock2u-thumb.png");
    expect(src["pfplay"]).toBe("/projects/pfplay/home.webp");
    expect(src["pickcare/app"]).toBe("/projects/pickcare/app/home.webp");
    expect(src["pickcare/cardnews"]).toBe("/projects/pickcare/cardnews/set-1.webp");
  });

  it("Todo App은 가운데 카드만 잘라 쓰고, 잘라 쓸 영역은 원본 안에 든다", () => {
    const todo = HOLOGRAMS.find((hologram) => hologram.id === "todo-app");
    expect(todo?.crop).toBeDefined();
    for (const hologram of HOLOGRAMS) {
      if (!hologram.crop) continue;
      expect(hologram.crop.x).toBeGreaterThanOrEqual(0);
      expect(hologram.crop.y).toBeGreaterThanOrEqual(0);
      expect(hologram.crop.x + hologram.crop.width).toBeLessThanOrEqual(hologram.width);
      expect(hologram.crop.y + hologram.crop.height).toBeLessThanOrEqual(hologram.height);
    }
    expect(sourceSize(todo!)).toEqual({ width: todo!.crop!.width, height: todo!.crop!.height });
  });

  it("짝인 상세 링크는 코코아톡만 없고, 프로젝트와 저장소마다 하나다", () => {
    const links = HOLOGRAMS.map((hologram) => hologram.linkHash);
    expect(links).toEqual([
      null,
      "#todo-app",
      "#eutcha",
      "#stock2u",
      "#tix2u",
      "#pfplay",
      "#pickcare/frontend",
      "#pickcare/biz",
      "#pickcare/studio",
      "#pickcare/app",
      "#pickcare/cardnews",
    ]);
  });

  it("층 이미지 파일은 홀로그램마다 따로다", () => {
    const files = HOLOGRAMS.map((hologram) => hologram.layerFile);
    expect(new Set(files).size).toBe(HOLOGRAMS.length);
    for (const file of files) expect(file).toMatch(/^\/journey\/holograms\/[a-z0-9-]+\.webp$/);
  });
});

describe("층 안 그림 영역", () => {
  it("층(768×480) 안에 비율대로 가운데 넣고 정수 화소다", () => {
    expect(layerRect(2880, 1800)).toEqual({ x: 0, y: 0, width: 768, height: 480 });
    expect(layerRect(645, 1395)).toEqual({ x: 273, y: 0, width: 222, height: 480 });
    expect(layerRect(1543, 378)).toEqual({ x: 0, y: 146, width: 768, height: 188 });
  });

  it("모든 홀로그램의 그림이 층 안에 들고 비율이 원본과 1% 안에서 같다", () => {
    for (const hologram of HOLOGRAMS) {
      const size = sourceSize(hologram);
      const rect = layerRect(size.width, size.height);
      expect(rect.x + rect.width, hologram.id).toBeLessThanOrEqual(LAYER.width);
      expect(rect.y + rect.height, hologram.id).toBeLessThanOrEqual(LAYER.height);
      expect(rect.width / rect.height / (size.width / size.height), hologram.id).toBeCloseTo(1, 1);
    }
  });
});

describe("테두리 빛", () => {
  it("쉬는 때보다 호버·포커스가 밝다", () => {
    expect(FRAME_LIGHT.line[1]).toBeGreaterThan(FRAME_LIGHT.line[0]);
    expect(FRAME_LIGHT.halo[1]).toBeGreaterThan(FRAME_LIGHT.halo[0]);
  });

  it("모든 궤적 색에서 선 + 후광의 최대 휘도가 블룸 문턱(1) 미만이다(쉬는 때·호버)", () => {
    for (let s = 0; s <= CAR_END; s += 2) {
      for (const hover of [0, 1]) {
        const peak = frameLight(trailColor(s), 1, 1, hover);
        expect(luminance(peak), `s=${s} hover=${hover}`).toBeLessThan(1);
      }
    }
  });

  it("테두리는 궤적 색의 색조를 지킨다(채널 비율이 같다)", () => {
    const color = trailColor(0);
    const light = frameLight(color, 1, 0, 0);
    expect(light[1] / light[0]).toBeCloseTo(color[1] / color[0], 6);
    expect(light[2] / light[0]).toBeCloseTo(color[2] / color[0], 6);
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4 src/lib/journey/holograms.test.ts`
Expected: FAIL — `Error: Cannot find module './holograms'`(Tests no tests)

- [ ] **Step 3: 모듈을 쓴다**

`src/lib/journey/holograms.ts` 전체:

```ts
import { projects } from "@/data/projects";
import type { Project, RepoId, Screen } from "@/data/projects/types";
import { DETAIL_SLUGS, journeyHash } from "./hash";
import { STOPS } from "./timeline";
import type { LinearRgb } from "./trail";

/**
 * 제품 화면 홀로그램(스펙 3절 "제품 화면 홀로그램 (2-3a)"). 프로젝트마다 대표 화면 한 장을 3D 공간에 띄운다.
 * 이 파일은 목록·이미지·층 안 그림 영역·테두리 빛과 진행률에 따른 자리를 정한다. three를 import하지 않는 순수 코드다.
 * 이미지는 scripts/build-holograms.ts가 층(768×480) 크기로 줄여 public/journey/holograms/에 만들고,
 * 장면(scene/Holograms)이 11장을 텍스처 배열 하나로 묶는다. 층 번호는 이 목록의 순서다.
 */

/** 텍스처 배열 한 층의 크기(화소) */
export const LAYER = { width: 768, height: 480 } as const;

export interface PixelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Hologram {
  /** 프로젝트 slug, PiCKCARE는 "pickcare/<저장소>". 짝인 상세 해시의 본문과 같다 */
  id: string;
  /** 정류장 id(timeline STOPS) */
  stopId: string;
  act: 1 | 2 | 3;
  repo?: RepoId;
  /** 원본 이미지(public 기준)와 크기 */
  src: string;
  width: number;
  height: number;
  /** 잘라 쓸 영역(원본 화소). 없으면 원본 전체 */
  crop?: PixelRect;
  /** 층 이미지(public 기준). scripts/build-holograms.ts가 만든다 */
  layerFile: string;
  /** 짝인 상세 링크의 해시. 상세가 없는 코코아톡은 null이라 누를 수 없다 */
  linkHash: string | null;
}

/** 잘라 쓸 영역. 데이터는 3D 정보를 담지 않으므로(스펙 6절) 여기에 둔다. Todo App은 그라데이션 가운데의 카드만 쓴다 */
const CROPS: Record<string, PixelRect> = {
  "todo-app": { x: 1053, y: 467, width: 774, height: 867 },
};

/** 첫 화면 대신 쓸 화면. cardnews의 첫 장은 빈 틀(마스터 4종)이라 완성된 세트를 쓴다 */
const SOURCES: Record<string, string> = {
  "pickcare/cardnews": "/projects/pickcare/cardnews/set-1.webp",
};

/** 프로젝트의 홈 화면 캡처가 있으면 그것, 없으면(코코아톡·Stock2U·Tix2U) 첫 장(썸네일) */
function representative(project: Project): Screen {
  return project.screens.find((screen) => screen.src === `/projects/${project.slug}/home.webp`) ?? project.screens[0];
}

function entry(id: string, stopId: string, act: 1 | 2 | 3, screen: Screen, link: string | null, repo?: RepoId): Hologram {
  return {
    id,
    stopId,
    act,
    repo,
    src: screen.src,
    width: screen.width,
    height: screen.height,
    crop: CROPS[id],
    layerFile: `/journey/holograms/${id.replace("/", "-")}.webp`,
    linkHash: link,
  };
}

function build(): Hologram[] {
  const list: Hologram[] = [];
  for (const stop of STOPS) {
    if (!stop.slug || stop.act === 0) continue;
    const project = projects.find((item) => item.slug === stop.slug);
    if (!project) throw new Error(`정류장 ${stop.id}의 프로젝트가 없습니다`);
    const linked = DETAIL_SLUGS.includes(project.slug);
    if (project.kind === "repos") {
      for (const repo of project.repos) {
        const id = `${project.slug}/${repo.id}`;
        const screen = repo.screens.find((item) => item.src === SOURCES[id]) ?? repo.screens[0];
        if (!screen) throw new Error(`저장소 ${repo.id}에 화면이 없습니다`);
        const link = linked ? journeyHash({ slug: project.slug, repo: repo.id }) : null;
        list.push(entry(id, stop.id, stop.act, screen, link, repo.id));
      }
    } else {
      const link = linked ? journeyHash({ slug: project.slug }) : null;
      list.push(entry(project.slug, stop.id, stop.act, representative(project), link));
    }
  }
  return list;
}

/** 홀로그램 11개. 1막 셋, 2막 셋, PiCKCARE 저장소 다섯. 배열의 순서가 텍스처 배열의 층 번호다 */
export const HOLOGRAMS: readonly Hologram[] = build();

/** 층에 넣을 그림의 크기(잘라 쓰면 잘라 낸 크기) */
export function sourceSize(hologram: Hologram): { width: number; height: number } {
  return hologram.crop
    ? { width: hologram.crop.width, height: hologram.crop.height }
    : { width: hologram.width, height: hologram.height };
}

/** 그림이 층 안에서 차지하는 영역(정수 화소). 비율대로 가운데 넣고 남는 자리는 비운다. 스크립트와 장면이 같이 쓴다 */
export function layerRect(width: number, height: number): PixelRect {
  const scale = Math.min(LAYER.width / width, LAYER.height / height);
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);
  return { x: Math.floor((LAYER.width - w) / 2), y: Math.floor((LAYER.height - h) / 2), width: w, height: h };
}

// ── 테두리 빛 ─────────────────────────────────────────────

/**
 * 테두리 빛의 휘도(선형): 선과 후광, [쉬는 때, 호버·포커스]. 선 + 후광의 최대가 블룸 문턱(1, 스펙 3절 "후처리") 미만이라
 * 테두리가 블룸을 일으켜 화면(특히 어두운 화면)에 궤적 색 안개를 씌우지 않는다. 시제품: 궤적 색 × 3.5는 EUTCHA에 평균 ΔE 6.1.
 */
export const FRAME_LIGHT = { line: [0.55, 0.8], halo: [0.12, 0.18] } as const;

/** 선형 sRGB 휘도. postprocessing의 블룸 문턱이 같은 식으로 잰다 */
export function luminance(color: LinearRgb): number {
  return 0.2126 * color[0] + 0.7152 * color[1] + 0.0722 * color[2];
}

/**
 * 테두리 한 점의 빛(선형 HDR). 궤적 색을 휘도 1로 맞춘 색조에 선·후광의 세기(0~1)를 곱한다. hover는 0(쉬는 때)~1(호버·포커스).
 * 셰이더(scene/hologramMaterial.ts)가 같은 식을 쓴다.
 */
export function frameLight(color: LinearRgb, line: number, halo: number, hover: number): LinearRgb {
  const mix = (range: readonly [number, number]) => range[0] + (range[1] - range[0]) * hover;
  const strength = line * mix(FRAME_LIGHT.line) + halo * mix(FRAME_LIGHT.halo);
  const scale = strength / Math.max(luminance(color), 1e-3);
  return [color[0] * scale, color[1] * scale, color[2] * scale];
}
```

- [ ] **Step 4: 통과를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4 src/lib/journey/holograms.test.ts`
Expected: PASS — `Tests  10 passed (10)`

- [ ] **Step 5: 전체 확인**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`은 무시)

Run: `rtk proxy npx tsc --noEmit` → exit 0
Run: `rtk proxy npx vitest run --maxWorkers=4` → `Tests  275 passed (275)`
Run: `rtk proxy npx eslint src/lib/journey/holograms.ts src/lib/journey/holograms.test.ts` → exit 0, 출력 없음

- [ ] **Step 6: 커밋 정리를 제출한다**

파일별 변경 표와 메시지 초안. 초안 예:

```
feat: 여정 홀로그램 목록과 층 안 그림 영역·테두리 빛 규칙 추가

- 11개의 순서가 텍스처 배열 층 번호다. 쓰는 이미지와 잘라 쓸 영역은 데이터가 아니라 이 모듈이 정한다
- 테두리는 궤적 색의 색조에 휘도를 곱해 쉬는 때·호버 모두 블룸 문턱 아래다(어두운 화면에 안개를 씌우지 않게)
```

---

### Task 5: PiCKCARE 카메라가 구간 앞뒤 12%에서 정류장 시점으로

스펙 3절 "카메라"다(사용자 결정, 2026-10-16). PiCKCARE는 다섯 화면에 걸쳐 저장소 패널이 하나씩 지나가는데, 정류장 시점이 가운데 절반뿐이면 frontend 패널이 보이는 동안 홀로그램 줄이 화면 밖이다. 카메라가 정류장 시점으로 도는 정도 `viewWeight`를 두고 PiCKCARE만 구간 앞뒤 12%에서 돌게 한다. 프로젝트 정류장은 `dwellWeight`와 같고, 차의 움직임은 그대로다. 2·3막 홀로그램도 이 값만큼 떠오른다(Task 6).

**Files:**
- Modify: `src/lib/journey/drive.test.ts`, `src/lib/journey/drive.ts`, `src/lib/journey/timeline.test.ts`, `src/lib/journey/timeline.ts`

**Interfaces:**
- Produces: `HALL_VIEW_EDGE = 0.12`, `viewWeight(progress: number): number` (timeline.ts). `cameraFor`가 `dwellWeight` 대신 `viewWeight`를 쓴다

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/lib/journey/timeline.test.ts`에서 찾을 부분:

```ts
  stopAt,
} from "./timeline";
```

바꿀 내용:

```ts
  stopAt,
  viewWeight,
} from "./timeline";
```

`src/lib/journey/timeline.test.ts`에서 찾을 부분:

```ts

  it("고정이 아닌 정류장에서는 머물지 않는다", () => {
```

바꿀 내용:

```ts

  it("카메라가 정류장 시점으로 도는 정도는 프로젝트 정류장에서 머무는 정도와 같다", () => {
    for (const range of STOP_RANGES.filter((item) => item.stop.kind === "project")) {
      for (const t of [0, 0.1, 0.2, 0.5, 0.8, 0.9, 0.999]) {
        const p = range.start + (range.end - range.start) * t;
        expect(viewWeight(p), `${range.stop.id} ${t}`).toBe(dwellWeight(p));
      }
    }
  });

  it("PiCKCARE에서는 구간 앞뒤 12%에서 정류장 시점으로 돌고, 그 사이 내내 정류장 시점이다", () => {
    const range = rangeOf("pickcare");
    const at = (t: number) => range.start + (range.end - range.start) * t;
    expect(viewWeight(at(0))).toBe(0);
    expect(viewWeight(at(0.06))).toBeGreaterThan(0.4);
    expect(viewWeight(at(0.06))).toBeLessThan(0.6);
    for (const t of [0.12, 0.2, 0.5, 0.8, 0.88]) expect(viewWeight(at(t)), `t=${t}`).toBe(1);
    expect(viewWeight(at(0.999999))).toBeLessThan(1e-6);
  });

  it("정류장 시점은 정류장이 아닌 곳에서 0이다", () => {
    for (const range of STOP_RANGES.filter((item) => !item.stop.pin)) {
      expect(viewWeight((range.start + range.end) / 2), range.stop.id).toBe(0);
    }
  });

  it("고정이 아닌 정류장에서는 머물지 않는다", () => {
```

`src/lib/journey/drive.test.ts`에서 찾을 부분:

```ts

  // 정류장 패널: 넓은 화면에서 왼쪽(mr-auto) 또는 오른쪽(ml-auto)에 화면 폭의 약 1/3을 차지한다(JourneyContent).
```

바꿀 내용:

```ts

  it("PiCKCARE는 차가 아직 들어오는 동안(구간 12%)에 이미 정류장 시점이다", () => {
    const range = rangeOf("pickcare");
    const state = driveAt(range.start + (range.end - range.start) * 0.12);
    expect(state.speed).toBeGreaterThan(0);
    // 정류장 시점은 차의 비스듬한 앞옆에서 차를 돌아본다: 카메라가 차보다 앞에 있다
    expect(dot(sub(state.camera.position, state.car.position), state.car.tangent)).toBeGreaterThan(0);
  });

  // 정류장 패널: 넓은 화면에서 왼쪽(mr-auto) 또는 오른쪽(ml-auto)에 화면 폭의 약 1/3을 차지한다(JourneyContent).
```

- [ ] **Step 2: 실패를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4 src/lib/journey/timeline.test.ts src/lib/journey/drive.test.ts`
Expected: FAIL — `Tests  4 failed | 40 passed (44)`. `TypeError: viewWeight is not a function` 셋, PiCKCARE 12% 지점의 카메라는 `expected -3.5694217186494317 to be greater than 0`(아직 차 뒤)

- [ ] **Step 3: 구현한다**

`src/lib/journey/timeline.ts`에서 찾을 부분:

```ts

/** 진행률의 경로 거리. 입구에서는 출발선에 서 있다가 출발하고(스펙 2절 "차가 출발선에 서 있다"), 고정 구간에서는 멈춘다. */
```

바꿀 내용:

```ts

/**
 * PiCKCARE 전시실에서 카메라가 정류장 시점으로 도는 구간(앞뒤, 구간 비율). 다섯 화면에 걸친 저장소 패널이 각자 보이는 동안
 * 홀로그램 줄이 화면에 있도록 다른 고정 정류장(1/4)보다 일찍 돌고 늦게 돌아온다(스펙 3절 "카메라", 2-3a). 차의 움직임은 그대로다.
 */
export const HALL_VIEW_EDGE = 0.12;

/** 카메라가 정류장 시점으로 도는 정도(0~1). 프로젝트 정류장은 머무는 정도(dwellWeight)와 같고, PiCKCARE는 구간 앞뒤 12%에서 돈다 */
export function viewWeight(progress: number): number {
  const { range, t } = stopAt(progress);
  if (range.stop.kind === "hall") return smoothstep(0, HALL_VIEW_EDGE, t) * (1 - smoothstep(1 - HALL_VIEW_EDGE, 1, t));
  return dwellWeight(progress);
}

/** 진행률의 경로 거리. 입구에서는 출발선에 서 있다가 출발하고(스펙 2절 "차가 출발선에 서 있다"), 고정 구간에서는 멈춘다. */
```

`src/lib/journey/drive.ts`에서 찾을 부분:

```ts
  UNITS_PER_SCREEN,
  dwellWeight,
  objectSide,
```

바꿀 내용:

```ts
  UNITS_PER_SCREEN,
  objectSide,
```

`src/lib/journey/drive.ts`에서 찾을 부분:

```ts
  type Vec3,
} from "./timeline";
```

바꿀 내용:

```ts
  type Vec3,
  viewWeight,
} from "./timeline";
```

`src/lib/journey/drive.ts`에서 찾을 부분:

```ts
  const { range } = stopAt(progress);
  const weight = dwellWeight(progress);
  const side = range.stop.pin ? orbitSide(stopScreenSide(range.stop)) : 1;
```

바꿀 내용:

```ts
  const { range } = stopAt(progress);
  const weight = viewWeight(progress);
  const side = range.stop.pin ? orbitSide(stopScreenSide(range.stop)) : 1;
```

- [ ] **Step 4: 통과를 확인한다(카메라 연속성·감쇠 테스트 포함)**

Run: `rtk proxy npx vitest run --maxWorkers=4 src/lib/journey/timeline.test.ts src/lib/journey/drive.test.ts`
Expected: PASS — `Tests  44 passed (44)`. 걸음당 목표 자세 이동(1m 미만), 앞뒤로 스크롤하는 동안 주행 중 카메라가 차 뒤, 노면 위 1m 이상이 그대로 통과해야 한다

- [ ] **Step 5: 전체 확인**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`은 무시)

Run: `rtk proxy npx tsc --noEmit` → exit 0
Run: `rtk proxy npx vitest run --maxWorkers=4` → `Tests  279 passed (279)`
Run: `rtk proxy npx eslint src/lib/journey/timeline.ts src/lib/journey/timeline.test.ts src/lib/journey/drive.ts src/lib/journey/drive.test.ts` → exit 0, 출력 없음

- [ ] **Step 6: 커밋 정리를 제출한다**

파일별 변경 표와 메시지 초안. 초안 예:

```
feat: PiCKCARE에서 카메라가 구간 앞뒤 12%에서 정류장 시점으로 돌게 함

- 다섯 화면에 걸친 저장소 패널이 각자 보이는 동안 홀로그램 줄이 화면에 있게 한다(사용자 결정)
- 프로젝트 정류장은 머무는 정도와 같고 차의 움직임은 그대로다
```

---

### Task 6: 홀로그램 자리·떠오름·방향·안전 영역

스펙 3절 "자리와 연출"이다. `hologramsAt(p, front)`가 홀로그램마다 화면 가운데·방향·지금 크기(층 상자)·나타난 정도·빛 원반을 낸다. 1막은 정류장 앞 길가에 서서 정류장 뒤 길 가운데를 향한 고정 방향이고, 2·3막은 실제 카메라를 수직축으로만 돌아 향하며 `viewWeight`만큼 원반에서 떠오른다. 자리가 아직 열리지 않았으면 그리지 않고, 엔딩에서는 원반 속으로 내려가며 원반만 남는다. 3막은 다섯 화면이 늘어서고 `front`(감쇠한 앞줄, 0~4 연속값)가 가운데로 와 커진다. 수치는 안전 영역 테스트로 맞췄다(1막 3.4m, 2막 3.3m, 3막 기준 `s0 − 8m`·앞줄 3.8m·상자 6.4 × 4m·뒷줄 2.6m). 안전 영역의 패널 자리는 실제 배치를 1280×720·1920×1080·1280×800·1440×900에서 잰 값이다.

**Files:**
- Create: `src/lib/journey/holograms.place.test.ts`
- Modify: `src/lib/journey/holograms.ts`

**Interfaces:**
- Consumes: `carSAt`·`driveAt`·`roadFrame`·`roadPoint`·`stopScreenSide`(drive.ts), `rangeOf`·`smoothstep`·`stopAt`·`viewWeight`(timeline.ts, Task 5)
- Produces: `PLACEMENT`, `DISC_LIFT = 1`, `REVEAL_FADE = 5`, `POINTER_PRESENCE = 0.5`, `REPO_COUNT = 5`, `type Facing`, `interface HologramPlacement { id, center, facing, box, presence, disc, discOpacity, colorS }`, `hologramsAt(progress, front): HologramPlacement[]`, `screenBasis(center, toward, yawOnly)`, `placementBasis(placement, camera)`, `imageCorners(hologram, placement, camera): Vec3[]`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/lib/journey/holograms.place.test.ts` 전체:

```ts
import { describe, expect, it } from "vitest";
import { carCenter, driveAt, revealSAt, roadFrame, roadPoint, type CameraPose } from "./drive";
import {
  DISC_LIFT,
  HOLOGRAMS,
  PLACEMENT,
  REVEAL_FADE,
  hologramsAt,
  imageCorners,
  placementBasis,
  screenBasis,
  type HologramPlacement,
} from "./holograms";
import { CAMERA_FOV, objectSide, rangeOf, viewWeight, type Vec3 } from "./timeline";

type Rect = [number, number, number, number];

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(...sub(a, b));
}

/** 화면 좌표(0~1, 왼쪽·위가 0). drive.test.ts와 같은 투영 */
function screenPosition(pose: CameraPose, point: Vec3, aspect: number): [number, number] {
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
  return [0.5 + dot(offset, right) / depth / (tanVertical * aspect) / 2, 0.5 - dot(offset, up) / depth / tanVertical / 2];
}

function screenRect(pose: CameraPose, points: Vec3[], aspect: number): Rect {
  const screen = points.map((point) => screenPosition(pose, point, aspect));
  const xs = screen.map((point) => point[0]);
  const ys = screen.map((point) => point[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

function overlaps(a: Rect, b: Rect): boolean {
  return a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
}

function at(stopId: string, t: number): number {
  const range = rangeOf(stopId);
  return range.start + (range.end - range.start) * t;
}

function placementOf(id: string, progress: number, front = 0): { placement: HologramPlacement; index: number } {
  const index = HOLOGRAMS.findIndex((hologram) => hologram.id === id);
  return { placement: hologramsAt(progress, front)[index], index };
}

/** 차 몸통을 감싸는 상자(차 기준 좌표: 앞뒤 ±2.2m, 좌우 ±1m, 높이 0~1.4m)의 화면 사각형 */
function carRect(progress: number, aspect: number): Rect {
  const state = driveAt(progress);
  const car = state.car;
  const points: Vec3[] = [];
  for (const along of [-2.2, 2.2]) for (const side of [-1, 1]) for (const up of [0, 1.4]) {
    points.push([
      car.position[0] + car.tangent[0] * along + car.right[0] * side + car.up[0] * up,
      car.position[1] + car.tangent[1] * along + car.right[1] * side + car.up[1] * up,
      car.position[2] + car.tangent[2] * along + car.right[2] * side + car.up[2] * up,
    ]);
  }
  return screenRect(state.camera, points, aspect);
}

const ASPECTS = [16 / 9, 16 / 10];
/**
 * 화면 좌표의 패널 자리. JourneyContent 배치를 1280×720·1920×1080(16:9), 1280×800·1440×900(16:10)에서 잰 값을 합쳤다(2막은 썸네일을 감춘 뒤).
 * 헤더는 위 9% 안이다(drive.test.ts 엔딩 안전 영역과 같은 값).
 */
const HEADER_BOTTOM = 0.09;
/** 1막 캡션 패널은 패널 쪽 가장자리에서 화면 폭 0.375까지 */
const CAPTION_SPAN = 0.375;
/** 2막 요약 패널은 패널 쪽 가장자리에서 화면 폭 0.41까지, 위 0.08~0.46 */
const EXHIBIT_SPAN = 0.41;
/** PiCKCARE 소개 패널(왼쪽 위)과 저장소 패널(오른쪽) */
const HALL_INTRO: Rect = [0, 0.06, 0.41, 0.33];
const HALL_REPO: Rect = [0.62, 0.3, 1, 0.59];

describe("홀로그램 자리", () => {
  it("같은 진행률·앞줄이면 같은 결과다(사이에 다른 진행률을 계산해도)", () => {
    const first = hologramsAt(0.42, 2);
    hologramsAt(0.9, 0);
    expect(hologramsAt(0.42, 2)).toEqual(first);
  });

  it("1막은 정류장 앞 길가에 서서 정류장 뒤 길 가운데를 향한다(진행률과 상관없다)", () => {
    for (const id of ["kokoa-clone", "todo-app", "eutcha"]) {
      const range = rangeOf(id);
      const s0 = driveAt((range.start + range.end) / 2).carS;
      const discS = s0 + PLACEMENT.act1.along;
      const lateral = objectSide(range.stop) * (roadFrame(discS).width / 2 + PLACEMENT.act1.aside);
      const { placement } = placementOf(id, (range.start + range.end) / 2);
      expect(placement.presence, id).toBe(1);
      placement.center.forEach((value, axis) => expect(value).toBeCloseTo(roadPoint(discS, lateral, PLACEMENT.act1.top)[axis], 6));
      placement.disc.forEach((value, axis) => expect(value).toBeCloseTo(roadPoint(discS, lateral, 0)[axis], 6));
      const facings = [0.2, 0.5, 0.8].map((t) => placementOf(id, at(id, t)).placement.facing);
      expect(facings[0]).toEqual({ kind: "point", point: roadPoint(s0 - PLACEMENT.act1.lookBack, 0, PLACEMENT.act1.lookHeight) });
      expect(facings[1]).toEqual(facings[0]);
      expect(facings[2]).toEqual(facings[0]);
    }
  });

  it("자리의 길이 열리기 전에는 그리지 않고, 열린 끝이 지나가며 나타난다", () => {
    const range = rangeOf("todo-app");
    const s0 = driveAt((range.start + range.end) / 2).carS;
    const discS = s0 + PLACEMENT.act1.along;
    let before = 0;
    let after = 1;
    for (let p = 0; p <= 1; p += 1e-4) {
      const revealS = revealSAt(p);
      const { placement } = placementOf("todo-app", p);
      if (revealS < discS) before = Math.max(before, placement.presence, placement.discOpacity);
      if (revealS > discS + REVEAL_FADE && driveAt(p).ending === 0) after = Math.min(after, placement.presence);
    }
    expect(before).toBe(0);
    expect(after).toBe(1);
  });

  it("2·3막은 카메라가 정류장 시점으로 도는 만큼 원반에서 떠오르고, 정류장을 떠나면 내려간다", () => {
    for (const id of ["stock2u", "tix2u", "pfplay", "pickcare/studio"]) {
      const range = rangeOf(id.split("/")[0]);
      const { placement: start } = placementOf(id, range.start + 1e-6);
      const { placement: middle } = placementOf(id, (range.start + range.end) / 2, 2);
      const { placement: end } = placementOf(id, range.end - 1e-6);
      expect(start.presence, id).toBeLessThan(1e-3);
      expect(middle.presence, id).toBe(1);
      expect(end.presence, id).toBeLessThan(1e-3);
      const quarter = range.start + (range.end - range.start) * 0.05;
      expect(placementOf(id, quarter, 2).placement.presence, id).toBeCloseTo(viewWeight(quarter), 6);
      // 떠오르는 동안 화면 가운데는 원반 위 DISC_LIFT에서 다 떠오른 높이 사이다
      const half = placementOf(id, quarter, 2).placement;
      const height = distance(half.center, half.disc);
      expect(height, id).toBeGreaterThan(DISC_LIFT);
      expect(height, id).toBeLessThan(distance(middle.center, middle.disc));
    }
  });

  it("2·3막 화면은 실제 카메라를 수직축으로만 돌아 향하고, 1막은 고정 지점을 향한다", () => {
    const { placement } = placementOf("stock2u", at("stock2u", 0.5));
    const camera: Vec3 = [placement.center[0] + 10, placement.center[1] + 4, placement.center[2] - 3];
    const basis = placementBasis(placement, camera);
    expect(basis.normal[1]).toBeCloseTo(0, 9);
    const toward = sub(camera, placement.center);
    expect(dot(basis.normal, [toward[0], 0, toward[2]]) / Math.hypot(toward[0], toward[2])).toBeCloseTo(1, 9);
    expect(basis.up[1]).toBeCloseTo(1, 9);
    const fixed = placementOf("todo-app", at("todo-app", 0.5)).placement;
    if (fixed.facing.kind !== "point") throw new Error("1막은 고정 지점을 향해야 합니다");
    const a = placementBasis(fixed, [0, 0, 0]).normal;
    const b = placementBasis(fixed, [500, 80, -40]).normal;
    a.forEach((value, axis) => expect(value).toBeCloseTo(b[axis], 12));
  });

  it("바라볼 곳이 바로 위·아래여서 수평 방향이 없어도 축이 유한하다(기본 방향 +z)", () => {
    const basis = screenBasis([0, -100, 0], [0, 0, 0], true);
    expect(basis.normal).toEqual([0, 0, 1]);
    for (const axis of [basis.right, basis.up, basis.normal]) for (const value of axis) expect(Number.isFinite(value)).toBe(true);
  });

  it("엔딩에서는 모든 홀로그램이 원반 속으로 내려가 사라지고 원반은 남는다", () => {
    for (const placement of hologramsAt(1, 4)) {
      expect(placement.presence, placement.id).toBe(0);
      expect(placement.discOpacity, placement.id).toBe(1);
      // 화면 가운데가 원반 위 DISC_LIFT까지 내려와 있다(1·2막은 도로의 위 방향, 3막은 수직)
      expect(distance(placement.center, placement.disc), placement.id).toBeCloseTo(DISC_LIFT, 6);
    }
  });

  it("어느 진행률에서도 홀로그램은 차와 카메라 목표 자세에서 떨어져 있다", () => {
    for (let p = 0; p <= 1; p += 1 / 800) {
      const state = driveAt(p);
      const placements = hologramsAt(p, 2);
      placements.forEach((placement, index) => {
        if (placement.presence === 0) return;
        const corners = imageCorners(HOLOGRAMS[index], placement, state.camera.position);
        for (const point of [placement.center, ...corners]) {
          expect(distance(point, carCenter(state.car)), `${placement.id} p=${p.toFixed(4)}`).toBeGreaterThan(3);
          expect(distance(point, state.camera.position), `${placement.id} p=${p.toFixed(4)}`).toBeGreaterThan(3);
        }
      });
    }
  });
});

describe("홀로그램 안전 영역(16:9·16:10)", () => {
  it("1막은 다가가는 동안 헤더와 캡션 패널을 피한다", () => {
    for (const id of ["kokoa-clone", "todo-app", "eutcha"]) {
      const side = objectSide(rangeOf(id).stop);
      for (const t of [0, 0.25]) {
        const p = at(id, t);
        const { placement, index } = placementOf(id, p);
        const pose = driveAt(p).camera;
        for (const aspect of ASPECTS) {
          const rect = screenRect(pose, imageCorners(HOLOGRAMS[index], placement, pose.position), aspect);
          const label = `${id} t=${t} ${aspect.toFixed(2)} → ${rect.map((value) => value.toFixed(3))}`;
          expect(rect[1], label).toBeGreaterThan(HEADER_BOTTOM);
          if (side === 1) expect(rect[0], label).toBeGreaterThan(CAPTION_SPAN);
          else expect(rect[2], label).toBeLessThan(1 - CAPTION_SPAN);
          expect(rect[0], label).toBeGreaterThan(0);
          expect(rect[2], label).toBeLessThan(1);
        }
      }
    }
  });

  it("2막은 머묾이 가장 클 때 헤더·요약 패널·차를 피해 화면 안에 든다", () => {
    for (const id of ["stock2u", "tix2u", "pfplay"]) {
      const side = objectSide(rangeOf(id).stop);
      const p = at(id, 0.5);
      const { placement, index } = placementOf(id, p);
      const pose = driveAt(p).camera;
      for (const aspect of ASPECTS) {
        const rect = screenRect(pose, imageCorners(HOLOGRAMS[index], placement, pose.position), aspect);
        const label = `${id} ${aspect.toFixed(2)} → ${rect.map((value) => value.toFixed(3))}`;
        expect(rect[1], label).toBeGreaterThan(HEADER_BOTTOM);
        expect(rect[3], label).toBeLessThan(0.94);
        expect(rect[0], label).toBeGreaterThan(0.03);
        expect(rect[2], label).toBeLessThan(0.97);
        if (side === 1) expect(rect[0], label).toBeGreaterThan(EXHIBIT_SPAN);
        else expect(rect[2], label).toBeLessThan(1 - EXHIBIT_SPAN);
        expect(overlaps(rect, carRect(p, aspect)), label).toBe(false);
      }
    }
  });

  it("PiCKCARE 앞줄은 머묾이 가장 클 때 소개·저장소 패널 사이에 들고, 뒷줄은 헤더를 피하고 차 앞을 가리지 않는다", () => {
    const p = at("pickcare", 0.5);
    const state = driveAt(p);
    const pose = state.camera;
    const forward = sub(pose.target, pose.position);
    const depth = (point: Vec3) => dot(sub(point, pose.position), forward) / Math.hypot(...forward);
    for (let front = 0; front < 5; front++) {
      const placements = hologramsAt(p, front);
      HOLOGRAMS.forEach((hologram, index) => {
        if (hologram.act !== 3) return;
        const placement = placements[index];
        for (const aspect of ASPECTS) {
          const rect = screenRect(pose, imageCorners(hologram, placement, pose.position), aspect);
          const label = `앞줄 ${front} ${hologram.id} ${aspect.toFixed(2)} → ${rect.map((value) => value.toFixed(3))}`;
          const onScreen = rect[2] > 0 && rect[0] < 1 && rect[3] > 0 && rect[1] < 1;
          const car = carRect(p, aspect);
          if (`pickcare/${["frontend", "biz", "studio", "app", "cardnews"][front]}` === hologram.id) {
            expect(rect[1], label).toBeGreaterThan(HEADER_BOTTOM);
            expect(overlaps(rect, HALL_INTRO), label).toBe(false);
            expect(overlaps(rect, HALL_REPO), label).toBe(false);
            expect(overlaps(rect, car), label).toBe(false);
          } else if (onScreen) {
            expect(rect[1], label).toBeGreaterThan(HEADER_BOTTOM);
            if (overlaps(rect, car)) expect(depth(placement.center), label).toBeGreaterThan(depth(state.car.position) + 2);
          }
        }
      });
    }
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4 src/lib/journey/holograms.place.test.ts`
Expected: FAIL — 11 failed. `TypeError: hologramsAt is not a function`, `TypeError: Cannot read properties of undefined (reading 'act1')`

- [ ] **Step 3: 자리 계산을 더한다**

`src/lib/journey/holograms.ts`에서 찾을 부분:

```ts
import type { Project, RepoId, Screen } from "@/data/projects/types";
import { DETAIL_SLUGS, journeyHash } from "./hash";
import { STOPS } from "./timeline";
import type { LinearRgb } from "./trail";
```

바꿀 내용:

```ts
import type { Project, RepoId, Screen } from "@/data/projects/types";
import { carSAt, driveAt, roadFrame, roadPoint, stopScreenSide } from "./drive";
import { DETAIL_SLUGS, journeyHash } from "./hash";
import { STOPS, rangeOf, smoothstep, stopAt, viewWeight, type StopRange, type Vec3 } from "./timeline";
import type { LinearRgb } from "./trail";
```

`src/lib/journey/holograms.ts` 끝에 붙인다:

```ts

// ── 자리와 연출 ───────────────────────────────────────────

/**
 * 막별 자리(스펙 3절 표, m). along은 정류장 가운데 차 자리에서 앞(+)·뒤(−)로 떨어진 거리, aside는 길가 바깥으로 떨어진 거리,
 * top은 다 떠오른 화면 가운데의 노면 위 높이, box는 층 상자(16:10)의 폭·높이다. 수치는 시안에서 출발해 안전 영역 테스트로 맞췄다:
 * 1막·2막은 헤더(화면 위 9%)에 닿지 않게 낮췄고, 3막 앞줄은 왼쪽 위 소개 패널과 오른쪽 저장소 패널 사이에 들도록 앞으로 옮기고 줄였다.
 */
export const PLACEMENT = {
  act1: { along: 6, aside: 4.5, top: 3.4, box: [6, 3.75] as const, lookBack: 12, lookHeight: 1.6 },
  act2: { along: -8, aside: 5, top: 3.3, box: [7.5, 4.6875] as const },
  act3: { along: -8, aside: 6, top: 3.8, backTop: 2.6, spacing: 6.5, back: 5, backPerStep: 1.5, backScale: 0.7, box: [6.4, 4] as const },
} as const;
/** 떠오르기 전(빛 원반 위) 화면 가운데의 높이(m) */
export const DISC_LIFT = 1;
/** 열린 끝이 원반 자리를 지나 이만큼(m) 더 열리면 다 나타난다 */
export const REVEAL_FADE = 5;
/** 이 이상 나타나야 누를 수 있다(스펙 3절 "포인터 대상") */
export const POINTER_PRESENCE = 0.5;
/** PiCKCARE 저장소 수 */
export const REPO_COUNT = 5;

export type Facing = { kind: "point"; point: Vec3 } | { kind: "camera" };

export interface HologramPlacement {
  id: string;
  /** 화면 가운데 */
  center: Vec3;
  /** 1막은 고정 지점을 향하고, 2·3막은 실제 카메라를 향한다(장면이 수직축으로만 돌린다) */
  facing: Facing;
  /** 지금 크기의 층 상자(m). 화면은 그 안의 층 안 그림 영역이다 */
  box: [number, number];
  /** 나타난 정도(0~1). 크기·높이에 곱해져 있고 불투명도로 쓴다 */
  presence: number;
  /** 빛 원반 자리(노면 높이)와 보이는 정도. 원반은 홀로그램이 내려가도 남는다 */
  disc: Vec3;
  discOpacity: number;
  /** 테두리·빛기둥·원반의 궤적 색 자리(도로 s, m) */
  colorS: number;
}

function add3(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function scale3(a: Vec3, k: number): Vec3 {
  return [a[0] * k, a[1] * k, a[2] * k];
}

function sub3(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function unit3(a: Vec3): Vec3 {
  return scale3(a, 1 / Math.hypot(a[0], a[1], a[2]));
}

function cross3(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

interface StopFrame {
  range: StopRange;
  /** 정류장 가운데 진행률의 차 자리(m) */
  s0: number;
  /** 화면 쪽(−1 왼쪽, 1 오른쪽). 본문 패널 반대편 */
  side: -1 | 1;
}

const STOP_FRAMES = new Map<string, StopFrame>(
  HOLOGRAMS.map((hologram) => {
    const range = rangeOf(hologram.stopId);
    return [hologram.stopId, { range, s0: carSAt((range.start + range.end) / 2), side: stopScreenSide(range.stop) }];
  }),
);

/** 3막 줄의 방향: 정류장 가운데 진행률의 카메라 목표에서 본 가로(right)와 안쪽(away). 정류장 안에서 고정이다 */
const HALL_AXES = (() => {
  const frame = STOP_FRAMES.get("pickcare");
  if (!frame) throw new Error("PiCKCARE 정류장이 없습니다");
  const base = hallBase(frame);
  const camera = driveAt((frame.range.start + frame.range.end) / 2).camera.position;
  const away = unit3([base[0] - camera[0], 0, base[2] - camera[2]]);
  return { base, away, right: [-away[2], 0, away[0]] as Vec3 };
})();

function hallBase(frame: StopFrame): Vec3 {
  const s = frame.s0 + PLACEMENT.act3.along;
  return roadPoint(s, frame.side * (roadFrame(s).width / 2 + PLACEMENT.act3.aside), 0);
}

/** 열린 끝이 원반 자리 discS를 지나며 0 → 1 */
function revealed(discS: number, revealS: number): number {
  return smoothstep(discS, discS + REVEAL_FADE, revealS);
}

/** 이 정류장에서 카메라가 정류장 시점으로 돈 정도(viewWeight, 지금 정류장이 아니면 0). 2·3막 홀로그램이 이만큼 떠오른다 */
function viewAt(stopId: string, progress: number): number {
  return stopAt(progress).range.stop.id === stopId ? viewWeight(progress) : 0;
}

/** 원반 위 DISC_LIFT에서 top까지 presence만큼 떠오른 높이 */
function liftedHeight(top: number, presence: number): number {
  return DISC_LIFT + (top - DISC_LIFT) * presence;
}

function placeRoadside(
  hologram: Hologram,
  frame: StopFrame,
  progress: number,
  revealS: number,
  ending: number,
): HologramPlacement {
  const act = hologram.act === 1 ? PLACEMENT.act1 : PLACEMENT.act2;
  const discS = frame.s0 + act.along;
  const lateral = frame.side * (roadFrame(discS).width / 2 + act.aside);
  const reveal = revealed(discS, revealS);
  const stay = hologram.act === 1 ? 1 : viewAt(hologram.stopId, progress);
  const presence = reveal * stay * (1 - ending);
  const facing: Facing =
    hologram.act === 1
      ? { kind: "point", point: roadPoint(frame.s0 - PLACEMENT.act1.lookBack, 0, PLACEMENT.act1.lookHeight) }
      : { kind: "camera" };
  return {
    id: hologram.id,
    center: roadPoint(discS, lateral, liftedHeight(act.top, presence)),
    facing,
    box: [act.box[0] * presence, act.box[1] * presence],
    presence,
    disc: roadPoint(discS, lateral, 0),
    discOpacity: reveal,
    colorS: frame.s0,
  };
}

function placeHall(
  hologram: Hologram,
  index: number,
  frame: StopFrame,
  front: number,
  progress: number,
  revealS: number,
  ending: number,
): HologramPlacement {
  const hall = PLACEMENT.act3;
  const k = index - front;
  const step = Math.min(1, Math.abs(k));
  const reveal = revealed(frame.s0 + hall.along, revealS);
  const presence = reveal * viewAt(hologram.stopId, progress) * (1 - ending);
  const back = (hall.back + hall.backPerStep * Math.abs(k)) * step;
  const disc = add3(add3(HALL_AXES.base, scale3(HALL_AXES.right, k * hall.spacing)), scale3(HALL_AXES.away, back));
  const top = hall.top + (hall.backTop - hall.top) * step;
  const size = (1 + (hall.backScale - 1) * step) * presence;
  return {
    id: hologram.id,
    center: add3(disc, [0, liftedHeight(top, presence), 0]),
    facing: { kind: "camera" },
    box: [hall.box[0] * size, hall.box[1] * size],
    presence,
    disc,
    discOpacity: reveal,
    colorS: frame.s0,
  };
}

/**
 * 진행률 p와 PiCKCARE 앞줄(front, 0~4 연속값)에서 홀로그램 11개의 자리를 낸다(HOLOGRAMS와 같은 순서). 같은 입력이면 같은 결과다.
 * front는 pickcareFront가 정한 목표를 장면이 감쇠해 넘긴다(탭·스크롤로 앞줄이 바뀌면 줄이 미끄러진다).
 */
export function hologramsAt(progress: number, front: number): HologramPlacement[] {
  const state = driveAt(progress);
  let repoIndex = 0;
  return HOLOGRAMS.map((hologram) => {
    const frame = STOP_FRAMES.get(hologram.stopId);
    if (!frame) throw new Error(`홀로그램 ${hologram.id}의 정류장이 없습니다`);
    if (hologram.act === 3) return placeHall(hologram, repoIndex++, frame, front, state.progress, state.revealS, state.ending);
    return placeRoadside(hologram, frame, state.progress, state.revealS, state.ending);
  });
}

/**
 * 화면의 축: normal은 화면이 바라보는 쪽, right·up은 화면의 가로·세로(단위 벡터). yawOnly면 수직축으로만 돌아 똑바로 선다.
 * 바라볼 곳이 바로 위·아래라 수평 방향이 없으면 +z를 바라본다.
 */
export function screenBasis(center: Vec3, toward: Vec3, yawOnly: boolean): { right: Vec3; up: Vec3; normal: Vec3 } {
  const direction = sub3(toward, center);
  const facing: Vec3 = yawOnly ? [direction[0], 0, direction[2]] : direction;
  const flat = Math.hypot(facing[0], facing[2]);
  const normal: Vec3 = flat < 1e-9 ? [0, 0, 1] : unit3(facing);
  const right = unit3(cross3([0, 1, 0], normal));
  return { right, up: cross3(normal, right), normal };
}

/** 그 자리의 화면 축. 1막은 고정 지점을 향하고, 2·3막은 카메라(실제 카메라 자리)를 수직축으로만 돌아 향한다 */
export function placementBasis(placement: HologramPlacement, camera: Vec3): { right: Vec3; up: Vec3; normal: Vec3 } {
  return placement.facing.kind === "point"
    ? screenBasis(placement.center, placement.facing.point, false)
    : screenBasis(placement.center, camera, true);
}

/** 그림 영역(층 상자 안의 층 안 그림 영역)의 네 꼭짓점: 왼쪽 위, 오른쪽 위, 오른쪽 아래, 왼쪽 아래 */
export function imageCorners(hologram: Hologram, placement: HologramPlacement, camera: Vec3): Vec3[] {
  const size = sourceSize(hologram);
  const rect = layerRect(size.width, size.height);
  const [boxWidth, boxHeight] = placement.box;
  const halfWidth = (boxWidth * rect.width) / LAYER.width / 2;
  const halfHeight = (boxHeight * rect.height) / LAYER.height / 2;
  // 층의 행은 위에서 아래로 센다. 그림 가운데가 층 가운데에서 벗어난 만큼 옮긴다
  const offsetX = boxWidth * ((rect.x + rect.width / 2) / LAYER.width - 0.5);
  const offsetY = -boxHeight * ((rect.y + rect.height / 2) / LAYER.height - 0.5);
  const { right, up } = placementBasis(placement, camera);
  const middle = add3(add3(placement.center, scale3(right, offsetX)), scale3(up, offsetY));
  const corner = (x: number, y: number) => add3(add3(middle, scale3(right, x * halfWidth)), scale3(up, y * halfHeight));
  return [corner(-1, 1), corner(1, 1), corner(1, -1), corner(-1, -1)];
}
```

- [ ] **Step 4: 통과를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4 src/lib/journey/holograms.place.test.ts`
Expected: PASS — `Tests  11 passed (11)`

- [ ] **Step 5: 전체 확인**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`은 무시)

Run: `rtk proxy npx tsc --noEmit` → exit 0
Run: `rtk proxy npx vitest run --maxWorkers=4` → `Tests  290 passed (290)`
Run: `rtk proxy npx eslint src/lib/journey/holograms.ts src/lib/journey/holograms.place.test.ts` → exit 0, 출력 없음

- [ ] **Step 6: 커밋 정리를 제출한다**

파일별 변경 표와 메시지 초안. 초안 예:

```
feat: 여정 홀로그램 자리·떠오름·방향·안전 영역 계산 추가

- 1막은 길가 고정 방향, 2·3막은 실제 카메라를 수직축으로만 향하고 정류장 시점만큼 떠오른다
- 자리가 열린 뒤 나타나고 엔딩에서 원반만 남는다
- 헤더·본문 패널·차를 피하는 수치를 실제 배치에서 잰 안전 영역으로 맞췄다
```

---

### Task 7: PiCKCARE 앞줄·그리는 순서·포인터 대상·링크 짝

스펙 3절 "PiCKCARE 앞줄", "그리기"의 정렬, "홀로그램 상호작용"의 짝과 포인터 대상이다. 앞줄은 해시가 `#pickcare…`이면 상세가 보여 주는 저장소(`activeRepo`), 아니면 `min(4, floor(5t + 0.25))`다(t는 PiCKCARE 구간 안의 진행률). 반투명 화면은 먼 것부터 그린다(같은 거리면 목록 순서). 누를 수 있는 홀로그램은 링크가 있고(코코아톡 아님), 층을 받았고, 절반 이상 나타난 것이다.

**Files:**
- Modify: `src/lib/journey/holograms.test.ts`, `src/lib/journey/holograms.ts`

**Interfaces:**
- Consumes: `activeRepo`·`parseJourneyHash`(hash.ts, Task 2), `HologramPlacement`(Task 6)
- Produces: `FRONT_LEAD = 0.25`, `pickcareFront(progress, hash): number`, `drawOrder(centers, camera): number[]`, `isPointerTarget(hologram, placement, loaded): boolean`, `hologramOfLink(hash): number`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/lib/journey/holograms.test.ts`에서 찾을 부분:

```ts
import { describe, expect, it } from "vitest";
import { STOPS } from "./timeline";
import { CAR_END } from "./drive";
import { trailColor } from "./trail";
import {
  FRAME_LIGHT,
  HOLOGRAMS,
  LAYER,
  frameLight,
  layerRect,
  luminance,
  sourceSize,
} from "./holograms";

```

바꿀 내용:

```ts
import { describe, expect, it } from "vitest";
import { CAR_END } from "./drive";
import {
  FRAME_LIGHT,
  HOLOGRAMS,
  LAYER,
  drawOrder,
  frameLight,
  hologramOfLink,
  isPointerTarget,
  layerRect,
  luminance,
  pickcareFront,
  sourceSize,
  type HologramPlacement,
} from "./holograms";
import { STOPS, rangeOf, type Vec3 } from "./timeline";
import { trailColor } from "./trail";

```

`src/lib/journey/holograms.test.ts` 끝에 붙인다:

```ts

describe("PiCKCARE 앞줄", () => {
  const range = rangeOf("pickcare");
  const at = (t: number) => range.start + (range.end - range.start) * t;

  it("스크롤 기준: 저장소 패널 i가 혼자 보이는 자리((i + 0.3)/5)에서 앞줄은 i다", () => {
    for (let i = 0; i < 5; i++) expect(pickcareFront(at((i + 0.3) / 5), ""), `i=${i}`).toBe(i);
  });

  it("다음 패널이 올라와 두 패널이 함께 보이는 구간의 가운데((i + 0.75)/5)에서 바뀐다", () => {
    for (let i = 0; i < 4; i++) {
      expect(pickcareFront(at((i + 0.749) / 5), ""), `i=${i}`).toBe(i);
      expect(pickcareFront(at((i + 0.751) / 5), ""), `i=${i}`).toBe(i + 1);
    }
  });

  it("PiCKCARE 앞에서는 첫 저장소, 지나서는 마지막 저장소다", () => {
    expect(pickcareFront(0, "")).toBe(0);
    expect(pickcareFront(1, "")).toBe(4);
  });

  it("해시가 #pickcare…면 상세가 보여 주는 저장소가 스크롤보다 먼저다(저장소가 없으면 첫 저장소)", () => {
    expect(pickcareFront(at(0.1), "#pickcare/app")).toBe(3);
    expect(pickcareFront(at(0.9), "#pickcare/biz")).toBe(1);
    expect(pickcareFront(at(0.9), "#pickcare")).toBe(0);
  });

  it("다른 프로젝트의 해시나 모르는 해시는 스크롤 기준을 따른다", () => {
    expect(pickcareFront(at(0.5), "#stock2u")).toBe(pickcareFront(at(0.5), ""));
    expect(pickcareFront(at(0.5), "#nope")).toBe(pickcareFront(at(0.5), ""));
  });
});

describe("그리는 순서", () => {
  it("먼 것부터 그리고, 모든 번호를 한 번씩 낸다", () => {
    const centers: Vec3[] = [[0, 0, -5], [0, 0, -20], [0, 0, -10], [0, 0, -1]];
    expect(drawOrder(centers, [0, 0, 0])).toEqual([1, 2, 0, 3]);
  });

  it("거리가 같으면 목록 순서를 지킨다", () => {
    const centers: Vec3[] = [[1, 0, 0], [0, 1, 0], [-1, 0, 0]];
    expect(drawOrder(centers, [0, 0, 0])).toEqual([0, 1, 2]);
  });
});

describe("포인터 대상과 링크 짝", () => {
  const placement = (presence: number): HologramPlacement => ({
    id: "x",
    center: [0, 0, 0],
    facing: { kind: "camera" },
    box: [1, 1],
    presence,
    disc: [0, 0, 0],
    discOpacity: 1,
    colorS: 0,
  });
  const byId = (id: string) => HOLOGRAMS.find((hologram) => hologram.id === id)!;

  it("상세 링크가 있고, 층을 받았고, 절반 이상 나타난 홀로그램만 누를 수 있다", () => {
    expect(isPointerTarget(byId("pfplay"), placement(0.5), true)).toBe(true);
    expect(isPointerTarget(byId("pfplay"), placement(0.49), true)).toBe(false);
    expect(isPointerTarget(byId("pfplay"), placement(1), false)).toBe(false);
    expect(isPointerTarget(byId("kokoa-clone"), placement(1), true)).toBe(false);
  });

  it("링크 해시로 홀로그램 번호를 찾는다(코코아톡·모르는 해시는 −1)", () => {
    expect(hologramOfLink("#pfplay")).toBe(HOLOGRAMS.findIndex((hologram) => hologram.id === "pfplay"));
    expect(hologramOfLink("#pickcare/biz")).toBe(HOLOGRAMS.findIndex((hologram) => hologram.id === "pickcare/biz"));
    expect(hologramOfLink("#kokoa-clone")).toBe(-1);
    expect(hologramOfLink("#nope")).toBe(-1);
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4 src/lib/journey/holograms.test.ts`
Expected: FAIL — `Tests  9 failed | 10 passed (19)`, `TypeError: pickcareFront is not a function` 등

- [ ] **Step 3: 구현한다**

`src/lib/journey/holograms.ts`에서 찾을 부분:

```ts
import { carSAt, driveAt, roadFrame, roadPoint, stopScreenSide } from "./drive";
import { DETAIL_SLUGS, journeyHash } from "./hash";
import { STOPS, rangeOf, smoothstep, stopAt, viewWeight, type StopRange, type Vec3 } from "./timeline";
```

바꿀 내용:

```ts
import { carSAt, driveAt, roadFrame, roadPoint, stopScreenSide } from "./drive";
import { DETAIL_SLUGS, activeRepo, journeyHash, parseJourneyHash } from "./hash";
import { STOPS, rangeOf, smoothstep, stopAt, viewWeight, type StopRange, type Vec3 } from "./timeline";
```

`src/lib/journey/holograms.ts` 끝에 붙인다:

```ts

// ── PiCKCARE 앞줄, 그리는 순서, 누를 수 있는 홀로그램 ───────────────

/** 스크롤 기준 앞줄을 패널 하나의 3/4 지점에서 바꾸는 앞당김(스펙 3절 "PiCKCARE 앞줄") */
export const FRONT_LEAD = 0.25;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

const PICKCARE = (() => {
  const project = projects.find((item) => item.slug === "pickcare");
  if (project?.kind !== "repos" || project.repos.length !== REPO_COUNT) throw new Error("PiCKCARE는 저장소 다섯의 글이어야 합니다");
  return project;
})();

/**
 * PiCKCARE 앞줄의 목표 저장소 번호(0~4, 스펙 3절 "PiCKCARE 앞줄").
 * 1. 해시가 #pickcare…면(상세가 열려 있거나 닫히는 중) 상세가 보여 주는 저장소(activeRepo: 해시의 저장소, 없으면 첫 저장소).
 * 2. 아니면 스크롤 기준. t는 PiCKCARE 구간 안의 진행률이고 앞줄은 min(4, floor(5t + 0.25)). 본문 저장소 패널은 화면마다 아래쪽에 있어,
 *    다음 패널이 올라와 두 패널이 함께 보이는 구간의 가운데에서 바뀐다.
 * 장면은 이 목표로 앞줄을 감쇠해 hologramsAt에 넘긴다.
 */
export function pickcareFront(progress: number, hash: string): number {
  const target = parseJourneyHash(hash);
  if (target?.slug === PICKCARE.slug) return PICKCARE.repos.indexOf(activeRepo(PICKCARE, target.repo));
  const range = rangeOf("pickcare");
  const t = clamp01((progress - range.start) / (range.end - range.start));
  return Math.min(REPO_COUNT - 1, Math.floor(REPO_COUNT * t + FRONT_LEAD));
}

/** 그리는 순서(먼 것부터, 같은 거리면 목록 순서). 반투명 화면이 겹쳐도 가까운 것이 위에 그려진다 */
export function drawOrder(centers: readonly Vec3[], camera: Vec3): number[] {
  const distances = centers.map((center) => Math.hypot(center[0] - camera[0], center[1] - camera[1], center[2] - camera[2]));
  return centers.map((_, index) => index).sort((a, b) => distances[b] - distances[a] || a - b);
}

/** 누를 수 있는가: 상세 링크가 있고(코코아톡은 없다), 층을 받았고, 절반 이상 나타났다 */
export function isPointerTarget(hologram: Hologram, placement: HologramPlacement, loaded: boolean): boolean {
  return loaded && hologram.linkHash !== null && placement.presence >= POINTER_PRESENCE;
}

/** 상세 링크 해시(#pfplay, #pickcare/biz)의 홀로그램 번호. 짝이 없으면 −1 */
export function hologramOfLink(hash: string): number {
  return HOLOGRAMS.findIndex((hologram) => hologram.linkHash === hash);
}
```

- [ ] **Step 4: 통과를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4 src/lib/journey/holograms.test.ts`
Expected: PASS — `Tests  19 passed (19)`

- [ ] **Step 5: 전체 확인**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`은 무시)

Run: `rtk proxy npx tsc --noEmit` → exit 0
Run: `rtk proxy npx vitest run --maxWorkers=4` → `Tests  299 passed (299)`
Run: `rtk proxy npx eslint src/lib/journey/holograms.ts src/lib/journey/holograms.test.ts` → exit 0, 출력 없음

- [ ] **Step 6: 커밋 정리를 제출한다**

파일별 변경 표와 메시지 초안. 초안 예:

```
feat: PiCKCARE 앞줄 규칙·그리는 순서·포인터 대상·링크 짝 추가

- 상세가 열려 있으면 탭의 저장소, 아니면 본문 패널이 바뀌는 자리(두 패널이 함께 보이는 구간 가운데)를 따른다
- 반투명 화면은 먼 것부터 그리고, 누를 수 있는 홀로그램만 포인터 대상이다
```

---

### Task 8: 홀로그램 층 이미지 만들기

스펙 3절 "이미지 준비"다. `scripts/build-holograms.ts`가 11장을 768×480 층 안에 비율대로 가운데 넣고(남는 자리는 투명) WebP(품질 82)로 `public/journey/holograms/`에 만든다. 층 안 그림 영역은 장면과 같은 `layerRect`로 정한다. 그림이 층을 꽉 채우면 sharp는 알파 없는 VP8로, 아니면 VP8X로 쓴다.

**Files:**
- Create: `scripts/build-holograms.ts`
- Modify: `package.json`, `src/lib/journey/holograms.test.ts`
- Generate: `public/journey/holograms/` 11장(스크립트가 만든다)

**Interfaces:**
- Consumes: `HOLOGRAMS`·`LAYER`·`layerRect`·`sourceSize`(Task 4), app 화면(Task 3)
- Produces: `public/journey/holograms/<id의 /를 ->.webp` 11장, `npm run build:holograms`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/lib/journey/holograms.test.ts`에서 찾을 부분:

```ts
import { describe, expect, it } from "vitest";
```

바꿀 내용:

```ts
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
```

`src/lib/journey/holograms.test.ts` 끝에 붙인다:

```ts

describe("층 이미지 파일(scripts/build-holograms.ts)", () => {
  /** WebP 머리에서 크기를 읽는다. 투명 영역이 있는 층은 VP8X, 그림이 층을 꽉 채우면 알파 없는 VP8이다 */
  function webpSize(file: string): { width: number; height: number } {
    const buffer = readFileSync(file);
    if (buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WEBP") throw new Error(`WebP가 아닙니다: ${file}`);
    const chunk = buffer.toString("ascii", 12, 16);
    if (chunk === "VP8X") return { width: 1 + buffer.readUIntLE(24, 3), height: 1 + buffer.readUIntLE(27, 3) };
    if (chunk === "VP8 ") return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
    throw new Error(`알 수 없는 WebP 형식(${chunk}): ${file}`);
  }

  it("홀로그램마다 층 크기(768×480)의 WebP가 있다", () => {
    for (const hologram of HOLOGRAMS) {
      const file = join(process.cwd(), "public", hologram.layerFile);
      expect(existsSync(file), hologram.layerFile).toBe(true);
      expect(webpSize(file), hologram.layerFile).toEqual({ width: LAYER.width, height: LAYER.height });
    }
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4 src/lib/journey/holograms.test.ts`
Expected: FAIL — `Tests  1 failed | 19 passed (20)`, `/journey/holograms/kokoa-clone.webp: expected false to be true`

- [ ] **Step 3: 스크립트를 쓴다**

`scripts/build-holograms.ts` 전체:

```ts
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { HOLOGRAMS, LAYER, layerRect, sourceSize } from "@/lib/journey/holograms";

/**
 * 제품 화면 홀로그램의 층 이미지(스펙 3절 "이미지 준비"). 홀로그램마다 원본(잘라 쓸 영역이 있으면 그 부분)을 768×480 층 안에
 * 비율대로 가운데 넣고(남는 자리는 투명) WebP로 public/journey/holograms/에 만든다. 층 안 그림 영역은 장면과 같은 layerRect로 정한다.
 * 장면(scene/Holograms)이 11장을 텍스처 배열 하나로 묶는다. 원본이나 목록(lib/journey/holograms.ts)이 바뀌면 다시 만든다.
 *
 * 사용법: npm run build:holograms
 */
const PUBLIC_DIR = "public";
const QUALITY = 82;

async function main() {
  let total = 0;
  for (const hologram of HOLOGRAMS) {
    const size = sourceSize(hologram);
    const rect = layerRect(size.width, size.height);
    let source = sharp(path.join(PUBLIC_DIR, hologram.src));
    if (hologram.crop) {
      const { x, y, width, height } = hologram.crop;
      source = source.extract({ left: x, top: y, width, height });
    }
    const picture = await source.removeAlpha().resize(rect.width, rect.height, { fit: "fill" }).png().toBuffer();
    const output = path.join(PUBLIC_DIR, hologram.layerFile);
    await mkdir(path.dirname(output), { recursive: true });
    await sharp({ create: { width: LAYER.width, height: LAYER.height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: picture, left: rect.x, top: rect.y }])
      .webp({ quality: QUALITY, alphaQuality: 100 })
      .toFile(output);
    const bytes = (await stat(output)).size;
    total += bytes;
    console.log(`${output}: 그림 ${rect.width}×${rect.height}, ${bytes}바이트`);
  }
  console.log(`합계 ${HOLOGRAMS.length}장, ${total}바이트`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

`package.json`에서 찾을 부분:

```json
    "build:app-screens": "tsx scripts/build-app-screens.ts",
    "server:dev": "tsx watch server/index.ts",
```

바꿀 내용:

```json
    "build:app-screens": "tsx scripts/build-app-screens.ts",
    "build:holograms": "tsx scripts/build-holograms.ts",
    "server:dev": "tsx watch server/index.ts",
```

- [ ] **Step 4: 층 이미지를 만든다**

Run: `rtk proxy npm run build:holograms`
Expected: 11줄과 합계, exit 0

```
public/journey/holograms/kokoa-clone.webp: 그림 382×480, …바이트
public/journey/holograms/todo-app.webp: 그림 429×480, …바이트
public/journey/holograms/eutcha.webp: 그림 768×480, …바이트
public/journey/holograms/stock2u.webp: 그림 768×419, …바이트
public/journey/holograms/tix2u.webp: 그림 768×417, …바이트
public/journey/holograms/pfplay.webp: 그림 768×480, …바이트
public/journey/holograms/pickcare-frontend.webp: 그림 768×480, …바이트
public/journey/holograms/pickcare-biz.webp: 그림 768×480, …바이트
public/journey/holograms/pickcare-studio.webp: 그림 768×480, …바이트
public/journey/holograms/pickcare-app.webp: 그림 222×480, …바이트
public/journey/holograms/pickcare-cardnews.webp: 그림 768×188, …바이트
합계 11장, 203436바이트
```

(계획 작성 때 합계. sharp·libwebp 판이 같으면 같다)

- [ ] **Step 5: 통과를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4 src/lib/journey/holograms.test.ts`
Expected: PASS — `Tests  20 passed (20)`

- [ ] **Step 6: 전체 확인**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`은 무시)

Run: `rtk proxy npx tsc --noEmit` → exit 0
Run: `rtk proxy npx vitest run --maxWorkers=4` → `Tests  300 passed (300)`
Run: `rtk proxy npx eslint scripts/build-holograms.ts src/lib/journey/holograms.test.ts` → exit 0, 출력 없음

- [ ] **Step 7: 커밋 정리를 제출한다**

파일별 변경 표와 메시지 초안. 초안 예:

```
feat: 홀로그램 층 이미지 11장과 만드는 스크립트 추가

- 768×480 층 안에 비율대로 넣은 WebP로, 장면이 텍스처 배열 하나로 묶는다(합계 약 200KB)
- 커밋에 public/journey/holograms/ 11개 파일을 함께 넣는다
```

---

### Task 9: 홀로그램 상태·링크 포커스 저장소

스펙 3절 "썸네일 대체"와 "키보드·보조기기"다. 켜진 홀로그램(층·배열 업로드가 성공해 메시에서 켜진 것)은 `sceneStatus`와 같은 꼴의 저장소에 두고, 썸네일(Task 14)이 구독한다. 감추는 판정은 장면이 ready이고 그 id가 켜져 있을 때다(그 순간의 불투명도와 무관). 링크 포커스 id는 장면이 렌더 단계에서 읽기만 한다.

**Files:**
- Create: `src/lib/journey/hologramStatus.test.ts`, `src/lib/journey/hologramStatus.ts`

**Interfaces:**
- Produces: `getShownHolograms()`, `getServerShownHolograms()`(빈 집합), `setShownHolograms(ids)`(같은 목록이면 알리지 않고 같은 객체), `subscribeHolograms(listener)`, `thumbnailHidden(status, shown, id)`, `getFocusedHologram()`, `setFocusedHologram(id)`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/lib/journey/hologramStatus.test.ts` 전체:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getFocusedHologram,
  getServerShownHolograms,
  getShownHolograms,
  setFocusedHologram,
  setShownHolograms,
  subscribeHolograms,
  thumbnailHidden,
} from "./hologramStatus";

afterEach(() => {
  setShownHolograms([]);
  setFocusedHologram(null);
});

describe("켜진 홀로그램", () => {
  it("처음에는 없고, 서버에서는 언제나 없다", () => {
    expect(getShownHolograms().size).toBe(0);
    setShownHolograms(["stock2u"]);
    expect(getServerShownHolograms().size).toBe(0);
  });

  it("바뀔 때만 구독자에게 알리고, 같은 목록이면 같은 객체를 돌려준다", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeHolograms(listener);
    setShownHolograms(["stock2u", "tix2u"]);
    const first = getShownHolograms();
    setShownHolograms(["tix2u", "stock2u"]);
    expect(getShownHolograms()).toBe(first);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    setShownHolograms([]);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("썸네일 대체", () => {
  it("장면이 ready이고 그 홀로그램이 켜져 있을 때만 감춘다", () => {
    const shown = new Set(["stock2u"]);
    expect(thumbnailHidden("ready", shown, "stock2u")).toBe(true);
    expect(thumbnailHidden("ready", shown, "tix2u")).toBe(false);
    expect(thumbnailHidden("loading", shown, "stock2u")).toBe(false);
    expect(thumbnailHidden("failed", shown, "stock2u")).toBe(false);
  });
});

describe("링크 포커스", () => {
  it("포커스가 있는 홀로그램 id를 둔다", () => {
    expect(getFocusedHologram()).toBeNull();
    setFocusedHologram("pfplay");
    expect(getFocusedHologram()).toBe("pfplay");
    setFocusedHologram(null);
    expect(getFocusedHologram()).toBeNull();
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4 src/lib/journey/hologramStatus.test.ts`
Expected: FAIL — `Error: Cannot find module './hologramStatus'`

- [ ] **Step 3: 저장소를 쓴다**

`src/lib/journey/hologramStatus.ts` 전체:

```ts
import type { SceneStatus } from "./sceneStatus";

/**
 * 홀로그램 상태(스펙 3절 "썸네일 대체", "홀로그램 상호작용"). 3D 코드를 import하지 않아 본문 쪽 컴포넌트도 쓴다.
 * - 켜진 홀로그램: 이미지 로드·층 데이터·텍스처 배열 업로드가 모두 성공해 메시에서 켜진 홀로그램 id. 장면(scene/Holograms)이 쓴다.
 * - 링크 포커스: 상세 링크에 포커스가 있는 홀로그램 id. JourneyStage가 쓰고 장면이 렌더 단계에서 읽는다(React를 다시 그리지 않는다).
 */

const EMPTY: ReadonlySet<string> = new Set();

let shown: ReadonlySet<string> = EMPTY;
let focused: string | null = null;
const listeners = new Set<() => void>();

export function getShownHolograms(): ReadonlySet<string> {
  return shown;
}

/** 서버 렌더와 첫 하이드레이션에서는 켜진 홀로그램이 없다(썸네일이 보인다) */
export function getServerShownHolograms(): ReadonlySet<string> {
  return EMPTY;
}

/** 켜진 홀로그램을 바꾼다. 목록이 같으면 알리지 않고 같은 객체를 둔다(useSyncExternalStore가 다시 그리지 않게) */
export function setShownHolograms(ids: Iterable<string>): void {
  const next = new Set(ids);
  if (next.size === shown.size && [...next].every((id) => shown.has(id))) return;
  shown = next.size === 0 ? EMPTY : next;
  for (const listener of listeners) listener();
}

export function subscribeHolograms(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * 본문 썸네일을 감추는가: 장면이 ready이고 그 홀로그램이 켜져 있다. 그 순간의 불투명도와는 상관없다.
 * 2막 홀로그램은 차가 멈춰야 떠오르는데, 썸네일이 따라가면 고정된 본문 패널의 높이가 정류장마다 바뀐다.
 */
export function thumbnailHidden(status: SceneStatus, shownIds: ReadonlySet<string>, id: string): boolean {
  return status === "ready" && shownIds.has(id);
}

export function getFocusedHologram(): string | null {
  return focused;
}

export function setFocusedHologram(id: string | null): void {
  focused = id;
}
```

- [ ] **Step 4: 통과를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4 src/lib/journey/hologramStatus.test.ts`
Expected: PASS — `Tests  4 passed (4)`

- [ ] **Step 5: 전체 확인**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`은 무시)

Run: `rtk proxy npx tsc --noEmit` → exit 0
Run: `rtk proxy npx vitest run --maxWorkers=4` → `Tests  304 passed (304)`
Run: `rtk proxy npx eslint src/lib/journey/hologramStatus.ts src/lib/journey/hologramStatus.test.ts` → exit 0, 출력 없음

- [ ] **Step 6: 커밋 정리를 제출한다**

파일별 변경 표와 메시지 초안. 초안 예:

```
feat: 켜진 홀로그램·링크 포커스 상태 저장소 추가

- 본문 썸네일이 장면 상태와 켜진 홀로그램으로 감출지 정한다(불투명도와 무관해 고정 패널 높이가 바뀌지 않는다)
- 링크 포커스는 장면이 렌더 단계에서 읽어 React를 다시 그리지 않는다
```

---

### Task 10: 층 읽기·텍스처 배열·업로드 확인

스펙 3절 "텍스처 배열"이다. 층 로더는 장마다 성공 여부를 돌려주고 던지지 않는다(받지 못함, 디코딩 실패, 크기가 다름, 한 가지 색뿐인 층은 null). 11장을 `DataArrayTexture` 하나(RGBA8, sRGB, 밉맵, 이방성 8)로 묶고, 받지 못한 층은 비운다. three r181의 `initTexture`는 그 자리에서 `texStorage3D → texSubImage3D → generateMipmap`을 부른다. 업로드 확인은 그때 한 번만 한다: 앞서 쌓인 GL 오류를 비우고(최대 8번), `initTexture`를 try로 감싸고(three의 `WebGLState` catch가 예외를 `TypeError`로 바꿔 던진다), 직후 오류를 한 번 읽는다. 컨텍스트를 잃었으면 올리지 않는다.

**Files:**
- Create: `src/components/journey/scene/hologramAtlas.test.ts`, `src/components/journey/scene/hologramAtlas.ts`

**Interfaces:**
- Consumes: `HOLOGRAMS`·`LAYER`(Task 4)
- Produces: `type LayerPixels = Uint8ClampedArray | null`, `isBlank(pixels)`, `loadLayer(url): Promise<LayerPixels>`, `loadHologramLayers(): Promise<LayerPixels[]>`(같은 약속), `releaseHologramLayers()`, `createLayerTexture(layers): DataArrayTexture`, `uploadChecked(renderer, texture): boolean`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/components/journey/scene/hologramAtlas.test.ts` 전체:

```ts
import { describe, expect, it, vi } from "vitest";
import { LinearFilter, LinearMipmapLinearFilter, SRGBColorSpace, type Texture } from "three";
import { LAYER } from "@/lib/journey/holograms";
import { createLayerTexture, isBlank, uploadChecked } from "./hologramAtlas";

const LAYER_BYTES = LAYER.width * LAYER.height * 4;

function layer(fill: number): Uint8ClampedArray {
  return new Uint8ClampedArray(LAYER_BYTES).fill(fill);
}

/** 오류 코드 목록을 차례로 돌려주는 가짜 WebGL 컨텍스트 */
function fakeRenderer(options: { stale?: number[]; after?: number; throws?: boolean; lost?: boolean }) {
  const NO_ERROR = 0 as const;
  const queue = [...(options.stale ?? [])];
  let uploaded = false;
  const gl = {
    NO_ERROR,
    isContextLost: () => options.lost === true,
    getError: () => {
      if (!uploaded) return queue.shift() ?? NO_ERROR;
      const error = options.after ?? NO_ERROR;
      options.after = NO_ERROR;
      return error;
    },
  };
  const initTexture = vi.fn((texture: Texture) => {
    void texture;
    uploaded = true;
    if (options.throws) throw new TypeError("error is not a function");
  });
  return { renderer: { getContext: () => gl, initTexture }, initTexture };
}

describe("층 화소", () => {
  it("한 가지 색뿐인 층(캔버스 읽기가 막힌 경우)을 가려낸다", () => {
    expect(isBlank(layer(255))).toBe(true);
    const picture = layer(0);
    picture[LAYER_BYTES - 1] = 255;
    expect(isBlank(picture)).toBe(false);
  });
});

describe("텍스처 배열", () => {
  it("층마다 768×480 한 층이고, 받지 못한 층은 비운다", () => {
    const texture = createLayerTexture([layer(9), null, layer(7)]);
    const image = texture.image as { width: number; height: number; depth: number; data: Uint8Array };
    expect([image.width, image.height, image.depth]).toEqual([LAYER.width, LAYER.height, 3]);
    expect(image.data[0]).toBe(9);
    expect(image.data[LAYER_BYTES]).toBe(0);
    expect(image.data[2 * LAYER_BYTES]).toBe(7);
  });

  it("sRGB 색으로 읽고 밉맵을 만든다", () => {
    const texture = createLayerTexture([layer(1)]);
    expect(texture.colorSpace).toBe(SRGBColorSpace);
    expect(texture.generateMipmaps).toBe(true);
    expect(texture.minFilter).toBe(LinearMipmapLinearFilter);
    expect(texture.magFilter).toBe(LinearFilter);
    expect(texture.version).toBeGreaterThan(0);
  });
});

describe("업로드 확인", () => {
  it("앞서 쌓인 무관한 오류를 비운 뒤 올리고, 올린 뒤 오류가 없으면 성공이다", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { renderer, initTexture } = fakeRenderer({ stale: [0x500, 0x502] });
    expect(uploadChecked(renderer, createLayerTexture([layer(1)]))).toBe(true);
    expect(initTexture).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it("올린 뒤 GL 오류가 있으면 실패다", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { renderer } = fakeRenderer({ after: 0x501 });
    expect(uploadChecked(renderer, createLayerTexture([layer(1)]))).toBe(false);
    warn.mockRestore();
  });

  it("올리다 예외가 나면(three가 TypeError로 바꿔 던진다) 실패다", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { renderer } = fakeRenderer({ throws: true });
    expect(uploadChecked(renderer, createLayerTexture([layer(1)]))).toBe(false);
    warn.mockRestore();
  });

  it("컨텍스트를 잃었으면 올리지 않고 실패다(장면 실패 감지가 맡는다)", () => {
    const { renderer, initTexture } = fakeRenderer({ lost: true });
    expect(uploadChecked(renderer, createLayerTexture([layer(1)]))).toBe(false);
    expect(initTexture).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4 src/components/journey/scene/hologramAtlas.test.ts`
Expected: FAIL — `Error: Cannot find module './hologramAtlas'`

- [ ] **Step 3: 구현한다**

`src/components/journey/scene/hologramAtlas.ts` 전체:

```ts
import {
  DataArrayTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  RGBAFormat,
  SRGBColorSpace,
  UnsignedByteType,
  type Texture,
} from "three";
import { HOLOGRAMS, LAYER } from "@/lib/journey/holograms";

/**
 * 홀로그램 층 이미지 11장을 텍스처 배열 하나로 묶는다(스펙 3절 "텍스처 배열"). 실패는 두 갈래다.
 * - 층 하나(받지 못함, 디코딩 실패, 크기가 다름, 한 가지 색뿐): 그 층만 비우고 그 홀로그램만 숨긴다. 던지지 않는다.
 *   (던지면 장면 오류 경계가 3D 전체를 멈춘다)
 * - 배열 생성·GPU 업로드: 홀로그램 전체를 그리지 않는다. 장면은 이어진다.
 */

/** 층 하나의 화소(RGBA, 위에서 아래 행). 받지 못하면 null */
export type LayerPixels = Uint8ClampedArray | null;

/** 업로드 직전에 비울 GL 오류의 최대 개수. WebGL은 오류 깃발마다 하나씩 돌려준다 */
const MAX_STALE_ERRORS = 8;

/** 모든 화소가 첫 화소와 같은가. 캔버스 읽기를 막는 브라우저 설정에서는 빈 데이터가 온다 */
export function isBlank(pixels: Uint8ClampedArray): boolean {
  for (let index = 4; index < pixels.length; index += 4) {
    if (
      pixels[index] !== pixels[0] ||
      pixels[index + 1] !== pixels[1] ||
      pixels[index + 2] !== pixels[2] ||
      pixels[index + 3] !== pixels[3]
    ) {
      return false;
    }
  }
  return true;
}

/** 층 이미지 하나를 받아 화소로 바꾼다. 실패하면 경고를 남기고 null이다(던지지 않는다) */
export async function loadLayer(url: string): Promise<LayerPixels> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`응답 ${response.status}`);
    const bitmap = await createImageBitmap(await response.blob(), { premultiplyAlpha: "none", colorSpaceConversion: "none" });
    try {
      if (bitmap.width !== LAYER.width || bitmap.height !== LAYER.height) {
        throw new Error(`층 크기가 ${bitmap.width}×${bitmap.height}입니다`);
      }
      const canvas = document.createElement("canvas");
      canvas.width = LAYER.width;
      canvas.height = LAYER.height;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("2D 캔버스를 만들지 못했습니다");
      context.drawImage(bitmap, 0, 0);
      const pixels = context.getImageData(0, 0, LAYER.width, LAYER.height).data;
      if (isBlank(pixels)) throw new Error("읽은 층이 한 가지 색뿐입니다");
      return pixels;
    } finally {
      bitmap.close();
    }
  } catch (error) {
    console.warn(`여정 홀로그램 층을 받지 못해 그 홀로그램만 숨깁니다: ${url}`, error);
    return null;
  }
}

let pending: Promise<LayerPixels[]> | null = null;

/** 11장을 함께 받는다. React use()가 기다릴 수 있도록 같은 약속을 돌려준다(장면과 같은 Suspense 안에서 기다린다) */
export function loadHologramLayers(): Promise<LayerPixels[]> {
  pending ??= Promise.all(HOLOGRAMS.map((hologram) => loadLayer(hologram.layerFile)));
  return pending;
}

/** 받은 층을 놓는다. 장면을 내리면 부른다(다시 들어오면 HTTP 캐시에서 다시 읽는다) */
export function releaseHologramLayers(): void {
  pending = null;
}

/** 층 화소들을 텍스처 배열 하나(768×480 × 층 수, RGBA8, sRGB, 밉맵)로 묶는다. 받지 못한 층은 비운다(투명) */
export function createLayerTexture(layers: readonly LayerPixels[]): DataArrayTexture {
  const layerBytes = LAYER.width * LAYER.height * 4;
  const data = new Uint8Array(layerBytes * layers.length);
  layers.forEach((pixels, index) => {
    if (pixels) data.set(pixels, index * layerBytes);
  });
  const texture = new DataArrayTexture(data, LAYER.width, LAYER.height, layers.length);
  texture.format = RGBAFormat;
  texture.type = UnsignedByteType;
  texture.colorSpace = SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  // three가 기기 한도로 줄인다
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

type ErrorSource = Pick<WebGLRenderingContext, "getError" | "isContextLost" | "NO_ERROR">;

/**
 * 텍스처를 지금 GPU에 올리고 GL 오류를 한 번만 확인한다(스펙 3절 "업로드 확인"). 매 프레임 GL 상태를 읽지 않는다.
 * three r181의 initTexture는 needsUpdate가 켜진 텍스처를 그 자리에서 올린다(texStorage3D → texSubImage3D → generateMipmap).
 * 1. 업로드 직전에 쌓인 오류를 비운다. 홀로그램과 무관한 앞선 오류를 업로드 실패로 잘못 보지 않기 위해서다.
 * 2. initTexture를 try로 감싼다. three의 WebGLState는 catch 안에서 이름이 가려져 GL 호출의 예외가 TypeError로 바뀌어 나온다.
 * 3. 직후 오류를 한 번 읽는다.
 * 컨텍스트를 잃은 상태면 올리지 않고 실패로 본다(장면 실패 감지가 맡는다).
 */
export function uploadChecked(
  renderer: { initTexture(texture: Texture): void; getContext(): ErrorSource },
  texture: Texture,
): boolean {
  const gl = renderer.getContext();
  if (gl.isContextLost()) return false;
  const stale: string[] = [];
  for (let count = 0; count < MAX_STALE_ERRORS; count++) {
    const error = gl.getError();
    if (error === gl.NO_ERROR) break;
    stale.push(`0x${error.toString(16)}`);
  }
  if (stale.length > 0) console.warn("여정 홀로그램 업로드 전에 쌓여 있던 GL 오류를 비웁니다", stale);
  try {
    renderer.initTexture(texture);
  } catch (error) {
    console.warn("여정 홀로그램 텍스처를 올리다 예외가 나 홀로그램을 그리지 않습니다", error);
    return false;
  }
  const error = gl.getError();
  if (error !== gl.NO_ERROR) {
    console.warn(`여정 홀로그램 텍스처를 올리지 못해 홀로그램을 그리지 않습니다(GL 오류 0x${error.toString(16)})`);
    return false;
  }
  return true;
}
```

- [ ] **Step 4: 통과를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4 src/components/journey/scene/hologramAtlas.test.ts`
Expected: PASS — `Tests  7 passed (7)`

- [ ] **Step 5: 전체 확인**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`은 무시)

Run: `rtk proxy npx tsc --noEmit` → exit 0
Run: `rtk proxy npx vitest run --maxWorkers=4` → `Tests  311 passed (311)`
Run: `rtk proxy npx eslint src/components/journey/scene/hologramAtlas.ts src/components/journey/scene/hologramAtlas.test.ts` → exit 0, 출력 없음

- [ ] **Step 6: 커밋 정리를 제출한다**

파일별 변경 표와 메시지 초안. 초안 예:

```
feat: 홀로그램 층 읽기와 텍스처 배열·업로드 확인 추가

- 층 하나의 실패는 그 층만 비우고 던지지 않는다(장면 오류 경계가 3D 전체를 멈추지 않게)
- three는 업로드 실패를 던지지 않아, 앞선 오류를 비운 뒤 업로드 직후 GL 오류를 한 번 읽는다
```

---

### Task 11: 홀로그램 재질·인스턴스 메시·레이캐스트 짝

스펙 3절 "그리기"다. 화면 + 테두리는 한 장(quad)에 그린다: 화면 영역은 텍스처 색 × 불투명도만(발광 없음), 테두리·후광은 휘도 규칙으로 미리 곱한 알파(알파 0)로 더한다. 빛기둥 + 원반은 종류 값을 가진 인스턴스로 더하기 혼합한다. 안개는 장면과 같이 받는다. `writeHolograms`가 한 프레임의 자리를 칸 값으로 옮기는데, 화면은 먼 것부터 칸에 넣고 칸 k의 홀로그램 번호를 `order[k]`에, 누를 수 있는지를 `targets[k]`에 둔다. 메시의 raycast를 감싸 누를 수 없는 칸은 광선에 맞지 않게 하고, 칸이 움직였으니 경계 구를 비운다. 숨긴 칸은 크기 0이고 방향을 계산하지 않는다(카메라 바로 아래의 숨긴 칸이 NaN을 내 경계 구를 망가뜨렸다).

**Files:**
- Create: `src/components/journey/scene/hologramMaterial.ts`, `src/components/journey/scene/hologramMeshes.test.ts`, `src/components/journey/scene/hologramMeshes.ts`

**Interfaces:**
- Consumes: `HOLOGRAMS`·`LAYER`·`drawOrder`·`isPointerTarget`·`layerRect`·`placementBasis`·`screenBasis`·`sourceSize`·`HologramPlacement`·`FRAME_LIGHT`(Task 4·6·7), `trailColor`, `glslFloat`
- Produces: `FRAME_MARGIN = 0.6`, `FRAME_BORDER = 0.06`, `BEAM_LIGHT = 0.3`, `DISC_LIGHT = 0.8`, `createScreenMaterial(atlas)`, `createLightMaterial()`, `interface HologramFrame { loaded, glow }`, `interface HologramMeshes { screens, lights, order, targets, dispose() }`, `createHologramMeshes(atlas)`, `hologramAt(meshes, instanceId): number`, `writeHolograms(meshes, placements, camera, frame)`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/components/journey/scene/hologramMeshes.test.ts` 전체:

```ts
import { describe, expect, it } from "vitest";
import { DataArrayTexture, Matrix4, PerspectiveCamera, Raycaster, Vector2, Vector3, type Intersection } from "three";
import { HOLOGRAMS, type HologramPlacement } from "@/lib/journey/holograms";
import type { Vec3 } from "@/lib/journey/timeline";
import { createHologramMeshes, hologramAt, writeHolograms, type HologramMeshes } from "./hologramMeshes";

const index = (id: string) => HOLOGRAMS.findIndex((hologram) => hologram.id === id);

function atlas(): DataArrayTexture {
  return new DataArrayTexture(new Uint8Array(4 * 4 * 4 * HOLOGRAMS.length), 4, 4, HOLOGRAMS.length);
}

/** 모든 홀로그램을 숨긴 자리에, 주어진 홀로그램만 카메라를 향해 세운다 */
function placements(standing: Record<string, { center: Vec3; presence?: number }>): HologramPlacement[] {
  return HOLOGRAMS.map((hologram) => {
    const spot = standing[hologram.id];
    return {
      id: hologram.id,
      center: spot?.center ?? [0, -100, 0],
      facing: { kind: "camera" },
      box: [6.4, 4],
      presence: spot ? (spot.presence ?? 1) : 0,
      disc: spot ? [spot.center[0], 0, spot.center[2]] : [0, -100, 0],
      discOpacity: spot ? 1 : 0,
      colorS: 0,
    };
  });
}

const allLoaded = HOLOGRAMS.map(() => true);
const noGlow = HOLOGRAMS.map(() => 0);

/** 카메라 자리에서 target 쪽으로 쏜 광선이 처음 맞힌 홀로그램 id(없으면 null) */
function pick(meshes: HologramMeshes, from: Vec3, toward: Vec3): string | null {
  const camera = new PerspectiveCamera(50, 1.6, 0.1, 600);
  camera.position.set(...from);
  camera.lookAt(...toward);
  camera.updateMatrixWorld();
  const raycaster = new Raycaster();
  raycaster.setFromCamera(new Vector2(0, 0), camera);
  meshes.screens.updateMatrixWorld();
  const hits: Intersection[] = [];
  meshes.screens.raycast(raycaster, hits);
  hits.sort((a, b) => a.distance - b.distance);
  return hits.length > 0 && hits[0].instanceId !== undefined ? HOLOGRAMS[hologramAt(meshes, hits[0].instanceId)].id : null;
}

describe("홀로그램 메시", () => {
  it("그리는 순서가 바뀌어도 광선은 화면에 보이는 가장 가까운 홀로그램을 돌려준다", () => {
    const meshes = createHologramMeshes(atlas());
    const spots = placements({ pfplay: { center: [0, 0, -10] }, tix2u: { center: [0, 0, -20] } });
    writeHolograms(meshes, spots, [0, 0, 0], { loaded: allLoaded, glow: noGlow });
    const front = meshes.order.slice();
    expect(pick(meshes, [0, 0, 0], [0, 0, -1])).toBe("pfplay");
    writeHolograms(meshes, spots, [0, 0, -30], { loaded: allLoaded, glow: noGlow });
    expect(meshes.order).not.toEqual(front);
    expect(pick(meshes, [0, 0, -30], [0, 0, -1])).toBe("tix2u");
    meshes.dispose();
  });

  it("칸마다 층 번호·보이는 정도가 그 칸에 그린 홀로그램의 값이다", () => {
    const meshes = createHologramMeshes(atlas());
    writeHolograms(
      meshes,
      placements({ pfplay: { center: [0, 0, -10], presence: 0.7 }, stock2u: { center: [3, 0, -30] } }),
      [0, 0, 0],
      { loaded: allLoaded, glow: noGlow },
    );
    const layer = meshes.screens.geometry.getAttribute("aLayer");
    const state = meshes.screens.geometry.getAttribute("aState");
    for (let slot = 0; slot < HOLOGRAMS.length; slot++) {
      const hologram = meshes.order[slot];
      expect(layer.getX(slot)).toBe(hologram);
      const expected = hologram === index("pfplay") ? 0.7 : hologram === index("stock2u") ? 1 : 0;
      expect(state.getX(slot)).toBeCloseTo(expected, 6);
    }
    meshes.dispose();
  });

  it("코코아톡과 절반도 나타나지 않은 홀로그램은 광선에 맞지 않는다(뒤의 홀로그램이 맞는다)", () => {
    const meshes = createHologramMeshes(atlas());
    writeHolograms(
      meshes,
      placements({ "kokoa-clone": { center: [0, 0, -8] }, eutcha: { center: [0, 0, -12], presence: 0.4 }, pfplay: { center: [0, 0, -20] } }),
      [0, 0, 0],
      { loaded: allLoaded, glow: noGlow },
    );
    expect(pick(meshes, [0, 0, 0], [0, 0, -1])).toBe("pfplay");
    meshes.dispose();
  });

  it("층을 받지 못한 홀로그램은 화면을 숨기고 원반은 남긴다", () => {
    const meshes = createHologramMeshes(atlas());
    const loaded = HOLOGRAMS.map((hologram) => hologram.id !== "pfplay");
    writeHolograms(meshes, placements({ pfplay: { center: [0, 0, -10] } }), [0, 0, 0], { loaded, glow: noGlow });
    expect(pick(meshes, [0, 0, 0], [0, 0, -1])).toBeNull();
    const slot = meshes.order.indexOf(index("pfplay"));
    expect(meshes.screens.geometry.getAttribute("aState").getX(slot)).toBe(0);
    const lights = meshes.lights.geometry.getAttribute("aState");
    expect(lights.getX(2 * index("pfplay"))).toBe(0);
    expect(lights.getX(2 * index("pfplay") + 1)).toBe(1);
    meshes.dispose();
  });

  it("화면은 카메라를 향하고 여백만큼 큰 판이다", () => {
    const meshes = createHologramMeshes(atlas());
    writeHolograms(meshes, placements({ pfplay: { center: [0, 0, -10] } }), [0, 0, 0], { loaded: allLoaded, glow: noGlow });
    const slot = meshes.order.indexOf(index("pfplay"));
    const matrix = new Matrix4();
    meshes.screens.getMatrixAt(slot, matrix);
    const [x, y, z] = [new Vector3(), new Vector3(), new Vector3()];
    matrix.extractBasis(x, y, z);
    expect(z.normalize().z).toBeCloseTo(1, 6);
    expect(x.length()).toBeGreaterThan(6.4);
    expect(y.length()).toBeGreaterThan(4);
    meshes.dispose();
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4 src/components/journey/scene/hologramMeshes.test.ts`
Expected: FAIL — `Error: Cannot find module './hologramMeshes'`

- [ ] **Step 3: 재질과 메시를 쓴다**

`src/components/journey/scene/hologramMaterial.ts` 전체:

```ts
import {
  AdditiveBlending,
  CustomBlending,
  DoubleSide,
  FrontSide,
  OneFactor,
  OneMinusSrcAlphaFactor,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
  Vector2,
  type DataArrayTexture,
} from "three";
import { FRAME_LIGHT } from "@/lib/journey/holograms";
import { glslFloat } from "./shaderChunks";

/**
 * 홀로그램 재질(스펙 3절 "그리기"). 화면 + 테두리는 한 장(quad)에, 빛기둥 + 원반은 다른 한 장에 그린다(인스턴스 메시 2개, 드로콜 2).
 * 화면 영역은 텍스처 색 × 불투명도만 내보낸다(발광 없음, 궤적 색을 섞지 않는다). 테두리·후광은 궤적 색의 색조에 휘도(FRAME_LIGHT)를 곱해
 * 미리 곱한 알파(알파 0)로 더한다. 쉬는 때·호버 모두 블룸 문턱(1) 아래다. 안개는 장면과 같이 받는다(멀리서 홀로그램만 튀지 않게).
 */

/** 화면 둘레 여백(m, 다 떠오른 크기 기준). 테두리 선은 그림 가장자리에서 여백의 0.8만큼 바깥에 있다 */
export const FRAME_MARGIN = 0.6;
/** 테두리 선의 굵기(m). 후광은 그 6배 너비로 바깥으로 퍼진다 */
export const FRAME_BORDER = 0.06;
/** 빛기둥·원반의 휘도(선형). 블룸 문턱 아래다 */
export const BEAM_LIGHT = 0.3;
export const DISC_LIGHT = 0.8;

const LUMINANCE = /* glsl */ `vec3( 0.2126, 0.7152, 0.0722 )`;

const SCREEN_VERTEX = /* glsl */ `
attribute float aLayer;
attribute vec4 aRect;
attribute vec2 aBox;
attribute vec3 aColor;
attribute vec2 aState;
varying vec2 vUv;
varying float vLayer;
varying vec4 vRect;
varying vec2 vBox;
varying vec3 vColor;
varying vec2 vState;
#include <fog_pars_vertex>
void main() {
  vUv = uv;
  vLayer = aLayer;
  vRect = aRect;
  vBox = aBox;
  vColor = aColor;
  vState = aState;
  vec4 mvPosition = viewMatrix * modelMatrix * instanceMatrix * vec4( position, 1.0 );
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const SCREEN_FRAGMENT = /* glsl */ `
precision highp sampler2DArray;
uniform sampler2DArray uAtlas;
uniform float uMargin;
uniform float uBorder;
uniform vec2 uLine;
uniform vec2 uHalo;
varying vec2 vUv;
varying float vLayer;
varying vec4 vRect;
varying vec2 vBox;
varying vec3 vColor;
varying vec2 vState;
#include <fog_pars_fragment>
void main() {
  float presence = vState.x;
  if ( presence < 1e-3 ) discard;
  float margin = uMargin * presence;
  float border = uBorder * presence;
  vec2 p = ( vUv - 0.5 ) * ( vBox + 2.0 * margin );
  // 층 좌표(가로는 왼쪽에서, 세로는 위에서 잰다. 층의 행은 위에서 아래이고 배열 텍스처는 뒤집지 않는다)
  vec2 layerUv = vec2( p.x / vBox.x + 0.5, 0.5 - p.y / vBox.y );
  vec3 color = vec3( 0.0 );
  float alpha = 0.0;
  if ( all( greaterThanEqual( layerUv, vRect.xy ) ) && all( lessThanEqual( layerUv, vRect.xy + vRect.zw ) ) ) {
    color = texture( uAtlas, vec3( layerUv, vLayer ) ).rgb;
    alpha = 1.0;
  }
  // 테두리: 그림 영역을 둘러싼 둥근 사각형 선과 바깥 후광
  vec2 halfImage = 0.5 * vRect.zw * vBox;
  vec2 center = vec2( ( vRect.x + 0.5 * vRect.z - 0.5 ) * vBox.x, ( 0.5 - vRect.y - 0.5 * vRect.w ) * vBox.y );
  vec2 d = abs( p - center ) - ( halfImage + 0.8 * margin );
  float outside = length( max( d, 0.0 ) ) + min( max( d.x, d.y ), 0.0 );
  float line = 1.0 - smoothstep( 0.0, border, abs( outside ) );
  float halo = ( 1.0 - smoothstep( 0.0, 6.0 * border, max( outside, 0.0 ) ) ) * step( 0.0, outside );
  float glow = vState.y;
  vec3 hue = vColor / max( dot( vColor, ${LUMINANCE} ), 1e-3 );
  vec3 light = hue * ( line * mix( uLine.x, uLine.y, glow ) + halo * mix( uHalo.x, uHalo.y, glow ) );
  #ifdef USE_FOG
    float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
    color = mix( color, fogColor, fogFactor );
    light *= 1.0 - fogFactor;
  #endif
  // 미리 곱한 알파: 화면은 덮어 그리고(알파 1), 테두리 빛은 더해진다(알파 0)
  gl_FragColor = vec4( ( color * alpha + light ) * presence, alpha * presence );
  #include <colorspace_fragment>
}`;

const LIGHT_VERTEX = /* glsl */ `
attribute vec3 aColor;
attribute vec2 aState;
varying vec2 vUv;
varying vec3 vColor;
varying vec2 vState;
#include <fog_pars_vertex>
void main() {
  vUv = uv;
  vColor = aColor;
  vState = aState;
  vec4 mvPosition = viewMatrix * modelMatrix * instanceMatrix * vec4( position, 1.0 );
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

/** aState: x 보이는 정도, y 종류(0 빛기둥, 1 원반) */
const LIGHT_FRAGMENT = /* glsl */ `
#define BEAM_LIGHT ${glslFloat(BEAM_LIGHT)}
#define DISC_LIGHT ${glslFloat(DISC_LIGHT)}
varying vec2 vUv;
varying vec3 vColor;
varying vec2 vState;
#include <fog_pars_fragment>
void main() {
  if ( vState.x < 1e-3 ) discard;
  vec3 hue = vColor / max( dot( vColor, ${LUMINANCE} ), 1e-3 );
  float strength;
  if ( vState.y < 0.5 ) {
    // 빛기둥: 가운데가 밝은 띠, 원반(아래)에서 위로 옅어진다
    float across = 1.0 - abs( vUv.x - 0.5 ) * 2.0;
    strength = BEAM_LIGHT * across * across * pow( 1.0 - vUv.y, 1.3 );
  } else {
    // 원반: 둘레가 밝은 고리와 옅은 안쪽
    float r = length( vUv - 0.5 ) * 2.0;
    strength = DISC_LIGHT * ( 1.0 - smoothstep( 0.82, 1.0, r ) ) * ( 0.35 + 0.65 * smoothstep( 0.55, 0.9, r ) );
  }
  vec3 light = hue * strength * vState.x;
  #ifdef USE_FOG
    light *= 1.0 - smoothstep( fogNear, fogFar, vFogDepth );
  #endif
  gl_FragColor = vec4( light, 1.0 );
  #include <colorspace_fragment>
}`;

/** 화면 + 테두리 재질. 반투명이 겹치므로 깊이는 쓰지 않고, 메시가 먼 것부터 그린다(drawOrder) */
export function createScreenMaterial(atlas: DataArrayTexture): ShaderMaterial {
  const material = new ShaderMaterial({
    uniforms: UniformsUtils.merge([
      UniformsLib.fog,
      {
        uAtlas: { value: null },
        uMargin: { value: FRAME_MARGIN },
        uBorder: { value: FRAME_BORDER },
        uLine: { value: new Vector2(...FRAME_LIGHT.line) },
        uHalo: { value: new Vector2(...FRAME_LIGHT.halo) },
      },
    ]),
    vertexShader: SCREEN_VERTEX,
    fragmentShader: SCREEN_FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: CustomBlending,
    blendSrc: OneFactor,
    blendDst: OneMinusSrcAlphaFactor,
    side: FrontSide,
    fog: true,
  });
  // merge는 값을 복제한다. 텍스처를 복제하면 업로드를 확인한 텍스처가 아닌 복제본이 따로 올라가므로 합친 뒤에 넣는다
  material.uniforms.uAtlas.value = atlas;
  return material;
}

/** 빛기둥 + 원반 재질. 더하기 혼합이라 순서와 상관없다 */
export function createLightMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: UniformsUtils.merge([UniformsLib.fog]),
    vertexShader: LIGHT_VERTEX,
    fragmentShader: LIGHT_FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    fog: true,
  });
}
```

`src/components/journey/scene/hologramMeshes.ts` 전체:

```ts
import {
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  PlaneGeometry,
  Vector3,
  type DataArrayTexture,
  type Intersection,
  type Raycaster,
} from "three";
import {
  HOLOGRAMS,
  LAYER,
  drawOrder,
  isPointerTarget,
  layerRect,
  placementBasis,
  screenBasis,
  sourceSize,
  type HologramPlacement,
} from "@/lib/journey/holograms";
import type { Vec3 } from "@/lib/journey/timeline";
import { trailColor } from "@/lib/journey/trail";
import { FRAME_MARGIN, createLightMaterial, createScreenMaterial } from "./hologramMaterial";

/**
 * 홀로그램 인스턴스 메시 2개(스펙 3절 "그리기"): 화면 + 테두리(홀로그램마다 한 칸), 빛기둥 + 원반(홀로그램마다 두 칸).
 * 매 프레임 writeHolograms가 hologramsAt의 자리를 칸 값으로 옮긴다. 셰이더는 다시 컴파일하지 않는다.
 * 화면은 반투명이 겹치므로 먼 것부터 칸에 넣고(drawOrder), 칸 k의 홀로그램 번호를 order[k]에 둔다.
 * 레이캐스트의 instanceId(칸)는 hologramAt으로 홀로그램 번호로 되돌린다. 칸 값과 순서표는 같은 호출에서 함께 바뀐다.
 */

const COUNT = HOLOGRAMS.length;
/** 원반 반지름(m)과 노면에서 띄운 높이 */
const DISC_RADIUS = 0.9;
const DISC_LIFT = 0.02;
/** 빛기둥 폭: 층 상자 폭에 곱한다 */
const BEAM_WIDTH = 0.35;

/** 층 안 그림 영역(층 비율: 왼쪽, 위에서 잰 위쪽, 폭, 높이). 홀로그램마다 한 번 계산한다 */
const RECTS = HOLOGRAMS.map((hologram) => {
  const size = sourceSize(hologram);
  const rect = layerRect(size.width, size.height);
  return [rect.x / LAYER.width, rect.y / LAYER.height, rect.width / LAYER.width, rect.height / LAYER.height] as const;
});

export interface HologramFrame {
  /** 층을 받은 홀로그램. 받지 못한 홀로그램은 화면·테두리·빛기둥을 숨기고 원반만 남긴다 */
  loaded: readonly boolean[];
  /** 홀로그램마다 테두리가 밝아진 정도(0 쉬는 때 ~ 1 호버·포커스) */
  glow: readonly number[];
}

export interface HologramMeshes {
  screens: InstancedMesh;
  lights: InstancedMesh;
  /** 칸 k에 그린 홀로그램 번호(먼 것부터) */
  order: number[];
  /** 칸 k를 누를 수 있는가(그 프레임의 자리와 층 상태로 정한다) */
  targets: boolean[];
  dispose(): void;
}

function attribute(size: number, count: number): InstancedBufferAttribute {
  return new InstancedBufferAttribute(new Float32Array(size * count), size);
}

export function createHologramMeshes(atlas: DataArrayTexture): HologramMeshes {
  const screenGeometry = new PlaneGeometry(1, 1);
  screenGeometry.setAttribute("aLayer", attribute(1, COUNT));
  screenGeometry.setAttribute("aRect", attribute(4, COUNT));
  screenGeometry.setAttribute("aBox", attribute(2, COUNT));
  screenGeometry.setAttribute("aColor", attribute(3, COUNT));
  screenGeometry.setAttribute("aState", attribute(2, COUNT));
  const screens = new InstancedMesh(screenGeometry, createScreenMaterial(atlas), COUNT);
  screens.name = "journey-holograms";
  // 칸이 매 프레임 움직여 경계 구가 맞지 않는다. 그리기는 늘 하고(11칸), 레이캐스트용 경계 구는 쓸 때 다시 잰다
  screens.frustumCulled = false;
  screens.renderOrder = 1;

  const lightGeometry = new PlaneGeometry(1, 1);
  lightGeometry.setAttribute("aColor", attribute(3, COUNT * 2));
  lightGeometry.setAttribute("aState", attribute(2, COUNT * 2));
  const lights = new InstancedMesh(lightGeometry, createLightMaterial(), COUNT * 2);
  lights.frustumCulled = false;

  const meshes: HologramMeshes = {
    screens,
    lights,
    order: HOLOGRAMS.map((_, index) => index),
    targets: HOLOGRAMS.map(() => false),
    dispose: () => {
      screenGeometry.dispose();
      lightGeometry.dispose();
      (screens.material as { dispose(): void }).dispose();
      (lights.material as { dispose(): void }).dispose();
    },
  };
  // 누를 수 없는 칸(코코아톡, 절반도 나타나지 않음, 층 실패)은 광선에 맞지 않게 한다. 그래서 호버·커서·클릭이 모두 없다
  const raycast = screens.raycast.bind(screens);
  screens.raycast = (raycaster: Raycaster, intersects: Intersection[]) => {
    const hits: Intersection[] = [];
    raycast(raycaster, hits);
    for (const hit of hits) if (hit.instanceId !== undefined && meshes.targets[hit.instanceId]) intersects.push(hit);
  };
  return meshes;
}

/** 레이캐스트의 칸 번호를 홀로그램 번호로 되돌린다 */
export function hologramAt(meshes: HologramMeshes, instanceId: number): number {
  return meshes.order[instanceId];
}

const HIDDEN: { right: Vec3; up: Vec3; normal: Vec3 } = { right: [1, 0, 0], up: [0, 1, 0], normal: [0, 0, 1] };
const matrix = new Matrix4();
const axisX = new Vector3();
const axisY = new Vector3();
const axisZ = new Vector3();

function place(mesh: InstancedMesh, slot: number, right: Vec3, up: Vec3, normal: Vec3, center: Vec3, width: number, height: number): void {
  matrix.makeBasis(
    axisX.set(...right).multiplyScalar(width),
    axisY.set(...up).multiplyScalar(height),
    axisZ.set(...normal),
  );
  matrix.setPosition(...center);
  mesh.setMatrixAt(slot, matrix);
}

/** 한 프레임의 자리를 칸 값으로 옮긴다. camera는 실제 카메라 자리(2·3막 화면이 향한다) */
export function writeHolograms(meshes: HologramMeshes, placements: readonly HologramPlacement[], camera: Vec3, frame: HologramFrame): void {
  const { screens, lights } = meshes;
  const layer = screens.geometry.getAttribute("aLayer") as InstancedBufferAttribute;
  const rect = screens.geometry.getAttribute("aRect") as InstancedBufferAttribute;
  const box = screens.geometry.getAttribute("aBox") as InstancedBufferAttribute;
  const color = screens.geometry.getAttribute("aColor") as InstancedBufferAttribute;
  const state = screens.geometry.getAttribute("aState") as InstancedBufferAttribute;
  const lightColor = lights.geometry.getAttribute("aColor") as InstancedBufferAttribute;
  const lightState = lights.geometry.getAttribute("aState") as InstancedBufferAttribute;
  const order = drawOrder(
    placements.map((placement) => placement.center),
    camera,
  );
  order.forEach((index, slot) => {
    const placement = placements[index];
    const presence = frame.loaded[index] ? placement.presence : 0;
    const visible = presence > 0;
    // 숨긴 칸은 크기 0으로 둔다(방향을 계산하지 않는다)
    const { right, up, normal } = visible ? placementBasis(placement, camera) : HIDDEN;
    const margin = 2 * FRAME_MARGIN * presence;
    place(screens, slot, right, up, normal, placement.center, visible ? placement.box[0] + margin : 0, visible ? placement.box[1] + margin : 0);
    layer.setX(slot, index);
    rect.setXYZW(slot, ...RECTS[index]);
    box.setXY(slot, Math.max(placement.box[0], 1e-3), Math.max(placement.box[1], 1e-3));
    color.setXYZ(slot, ...trailColor(placement.colorS));
    state.setXY(slot, presence, frame.glow[index]);
    meshes.order[slot] = index;
    meshes.targets[slot] = isPointerTarget(HOLOGRAMS[index], placement, frame.loaded[index]);

    // 빛기둥: 원반에서 화면 아래끝까지, 카메라를 향하는 띠
    const bottom: Vec3 = [
      placement.center[0] - up[0] * (placement.box[1] / 2),
      placement.center[1] - up[1] * (placement.box[1] / 2),
      placement.center[2] - up[2] * (placement.box[1] / 2),
    ];
    const rise: Vec3 = [bottom[0] - placement.disc[0], bottom[1] - placement.disc[1], bottom[2] - placement.disc[2]];
    const height = Math.hypot(...rise);
    const middle: Vec3 = [(bottom[0] + placement.disc[0]) / 2, (bottom[1] + placement.disc[1]) / 2, (bottom[2] + placement.disc[2]) / 2];
    const beam = screenBasis(middle, camera, true);
    const along: Vec3 = height > 1e-6 ? [rise[0] / height, rise[1] / height, rise[2] / height] : [0, 1, 0];
    const beamVisible = visible && height > 1e-3;
    place(lights, 2 * index, beam.right, along, beam.normal, middle, beamVisible ? placement.box[0] * BEAM_WIDTH : 0, beamVisible ? height : 0);
    lightColor.setXYZ(2 * index, ...trailColor(placement.colorS));
    lightState.setXY(2 * index, presence, 0);

    // 원반: 노면 높이에 눕힌 고리. 홀로그램이 내려가거나 층을 받지 못해도 남는다
    const disc: Vec3 = [placement.disc[0], placement.disc[1] + DISC_LIFT, placement.disc[2]];
    const discSize = placement.discOpacity > 0 ? 2 * DISC_RADIUS : 0;
    place(lights, 2 * index + 1, [1, 0, 0], [0, 0, -1], [0, 1, 0], disc, discSize, discSize);
    lightColor.setXYZ(2 * index + 1, ...trailColor(placement.colorS));
    lightState.setXY(2 * index + 1, placement.discOpacity, 1);
  });
  for (const changed of [layer, rect, box, color, state, lightColor, lightState]) changed.needsUpdate = true;
  screens.instanceMatrix.needsUpdate = true;
  lights.instanceMatrix.needsUpdate = true;
  // 레이캐스트는 경계 구로 먼저 거른다. 칸이 움직였으니 다음 레이캐스트에서 다시 재게 한다
  screens.boundingSphere = null;
}
```

- [ ] **Step 4: 통과를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4 src/components/journey/scene/hologramMeshes.test.ts`
Expected: PASS — `Tests  5 passed (5)`

- [ ] **Step 5: 전체 확인**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`은 무시)

Run: `rtk proxy npx tsc --noEmit` → exit 0
Run: `rtk proxy npx vitest run --maxWorkers=4` → `Tests  316 passed (316)`
Run: `rtk proxy npx eslint src/components/journey/scene/hologramMaterial.ts src/components/journey/scene/hologramMeshes.ts src/components/journey/scene/hologramMeshes.test.ts` → exit 0, 출력 없음

- [ ] **Step 6: 커밋 정리를 제출한다**

파일별 변경 표와 메시지 초안. 초안 예:

```
feat: 홀로그램 재질과 인스턴스 메시·레이캐스트 짝 추가

- 화면 + 테두리, 빛기둥 + 원반 두 메시라 드로콜이 2개 는다
- 화면은 먼 것부터 그리고, 레이캐스트의 칸 번호를 같은 프레임의 순서표로 홀로그램에 되돌린다
- 누를 수 없는 칸은 광선에 맞지 않는다
```

---

### Task 12: 장면에 홀로그램 — 실패 갈래와 앞줄 e2e

스펙 3절 "제품 화면 홀로그램"을 장면에 붙인다. `Holograms`는 층 11장을 장면과 같은 Suspense 안에서 받고(React `use`), 처음 그릴 때 배열을 만들어 올린다(Warmup이 셰이더를 컴파일하기 전에 끝난다). 층을 하나도 받지 못했거나 배열·업로드가 실패하면 아무것도 그리지 않는다. 매 프레임 PiCKCARE 앞줄을 감쇠하고, 테두리 밝아짐을 감쇠해 칸 값을 쓴다. 켜진 홀로그램을 저장소에 알리고, `?debug=stats`이면 통계(켜진 것·호버·밝아짐·앞줄·화면에 보이는 그림 영역)를 쓴다. 통계 기록기(Warmup)보다 실패가 먼저 올 수 있어 마지막 값을 들고 있다가 넣는다. 측정용 블룸 끄기 스위치(`?debug=stats&bloom=off`, 세기 0)도 여기서 더한다. 앞줄 e2e는 장면이 해시와 스크롤로 앞줄을 정하는 이 태스크에 둔다.

**Files:**
- Create: `src/components/journey/scene/Holograms.tsx`
- Modify: `e2e/journey.e2e.ts`, `src/components/journey/scene/Effects.tsx`, `src/components/journey/scene/Scene.tsx`, `src/components/journey/scene/frameStats.ts`

**Interfaces:**
- Consumes: Task 4·6·7의 `HOLOGRAMS`·`REPO_COUNT`·`hologramsAt`·`imageCorners`·`pickcareFront`, Task 9의 `getFocusedHologram`·`setShownHolograms`, Task 10·11의 아틀라스·메시, `damp`
- Produces: `<Holograms />`(Scene에 들어감), `interface HologramStats`, `JourneyStats.holograms`, `recordHolograms(stats | null)`, `?debug=stats&bloom=off`, e2e 도우미 `shownHolograms(page)`·`at(id, within)`

- [ ] **Step 1: 실패하는 e2e를 쓴다**

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts

type JourneyStats = {
```

바꿀 내용:

```ts

type HologramStats = {
  shown: string[];
  hovered: string | null;
  glowing: string[];
  front: string;
  screens: { id: string; rect: [number, number, number, number]; distance: number; target: boolean }[];
};

type JourneyStats = {
```

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts
  carPosition: [number, number, number] | null;
};
```

바꿀 내용:

```ts
  carPosition: [number, number, number] | null;
  holograms: HologramStats | null;
};
```

`e2e/journey.e2e.ts` 끝에 붙인다:

```ts

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

test("PiCKCARE 앞줄은 화면에 혼자 보이는 저장소 패널을 따르고, 상세가 열리면 탭을 따른다", async ({ page }) => {
  await page.goto("/journey?debug=stats");
  await waitReady(page);
  const repos = ["frontend", "biz", "studio", "app", "cardnews"];
  for (const [index, repo] of repos.entries()) {
    await scrollToProgress(page, at("pickcare", (index + 0.3) / 5));
    await expect.poll(async () => (await readStats(page)).holograms?.front, repo).toBe(`pickcare/${repo}`);
    await expect(page.locator(`a[data-journey-detail][href="#pickcare/${repo}"]`), repo).toBeInViewport();
  }
  await scrollToProgress(page, at("pickcare", 1.3 / 5));
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
```

- [ ] **Step 2: 실패를 확인한다**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`은 무시)

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts --project=desktop -g "홀로그램 11개|한 장을 받지 못하면|모두 받지 못하면|텍스처 배열을 올리지 못하면\(GPU|PiCKCARE 앞줄은"`
Expected: FAIL — `5 failed`. 모두 `Timeout 5000ms exceeded while waiting on the predicate`(홀로그램 통계가 없다)

- [ ] **Step 3: 통계·블룸 스위치·장면 컴포넌트를 쓴다**

`src/components/journey/scene/frameStats.ts`에서 찾을 부분:

```ts
  car: CarStatus;
}
```

바꿀 내용:

```ts
  car: CarStatus;
  /** 홀로그램(2-3a). 배열을 만들지 못하면 켜진 것이 없다 */
  holograms: HologramStats | null;
}

/** 홀로그램의 한 프레임(e2e가 클릭 좌표·호버·밝아짐·앞줄을 확인한다) */
export interface HologramStats {
  /** 메시에서 켜진 홀로그램 id(층과 배열 업로드가 성공한 것) */
  shown: string[];
  /** 포인터가 올라간 홀로그램 */
  hovered: string | null;
  /** 테두리가 밝아진 홀로그램(호버·링크 포커스) */
  glowing: string[];
  /** PiCKCARE 앞줄 저장소(감쇠한 값에 가장 가까운 것) */
  front: string;
  /** 보이는 홀로그램의 그림 영역: 화면 비율 좌표(왼쪽·위·오른쪽·아래, 0~1), 카메라 거리, 누를 수 있는가 */
  screens: { id: string; rect: [number, number, number, number]; distance: number; target: boolean }[];
}
```

`src/components/journey/scene/frameStats.ts`에서 찾을 부분:

```ts

const carWorld = new Vector3();
```

바꿀 내용:

```ts

let latestHolograms: HologramStats | null = null;

/**
 * 홀로그램 통계를 쓴다(?debug=stats일 때만 통계가 있다). 통계 기록기(Warmup)보다 먼저 올 수 있어(배열을 만들지 못한 경우)
 * 마지막 값을 들고 있다가 기록기가 생길 때 넣는다. 장면을 내리면 null로 비운다.
 */
export function recordHolograms(holograms: HologramStats | null): void {
  latestHolograms = holograms;
  const stats = (window as StatsWindow).__journeyStats;
  if (stats) stats.holograms = holograms;
}

const carWorld = new Vector3();
```

`src/components/journey/scene/frameStats.ts`에서 찾을 부분:

```ts
    car: getCarStatus(),
  };
```

바꿀 내용:

```ts
    car: getCarStatus(),
    holograms: latestHolograms,
  };
```

`src/components/journey/scene/Effects.tsx`에서 찾을 부분:

```tsx
import { Bloom, EffectComposer, SMAA, ToneMapping, Vignette } from "@react-three/postprocessing";

```

바꿀 내용:

```tsx
import { Bloom, EffectComposer, SMAA, ToneMapping, Vignette } from "@react-three/postprocessing";
import { useState } from "react";
import { statsEnabled } from "./frameStats";

```

`src/components/journey/scene/Effects.tsx`에서 찾을 부분:

```tsx
 * 블룸은 밝기 1을 넘는 빛(스스로 빛나는 선)에만 걸린다. 안티에일리어싱은 SMAA가 맡아 MSAA는 끈다.
 */
export function Effects() {
  return (
    <EffectComposer multisampling={0}>
      <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={0.2} intensity={0.9} />
      <ToneMapping mode={NEUTRAL_TONE_MAPPING} />
```

바꿀 내용:

```tsx
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

`src/components/journey/scene/Holograms.tsx` 전체:

```tsx
"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { use, useEffect, useMemo, useRef } from "react";
import { Vector3, type Camera, type DataArrayTexture, type WebGLRenderer } from "three";
import { damp } from "@/lib/journey/damp";
import { HOLOGRAMS, REPO_COUNT, hologramsAt, imageCorners, pickcareFront } from "@/lib/journey/holograms";
import { getFocusedHologram, setShownHolograms } from "@/lib/journey/hologramStatus";
import type { Vec3 } from "@/lib/journey/timeline";
import { currentDrive } from "./driveFrame";
import { recordHolograms, statsEnabled, type HologramStats } from "./frameStats";
import { createLayerTexture, loadHologramLayers, releaseHologramLayers, uploadChecked, type LayerPixels } from "./hologramAtlas";
import { createHologramMeshes, writeHolograms } from "./hologramMeshes";

/** PiCKCARE 앞줄이 목표 저장소로 미끄러지는 감쇠 세기 */
const FRONT_DAMPING = 4;
/** 테두리가 밝아지고 돌아오는 감쇠 세기 */
const GLOW_DAMPING = 12;

interface Atlas {
  texture: DataArrayTexture;
  loaded: readonly boolean[];
}

const atlases = new WeakMap<readonly LayerPixels[], Atlas | null>();

/**
 * 받은 층으로 텍스처 배열을 만들어 올린다. 층을 하나도 받지 못했거나 배열 생성·업로드가 실패하면 null(홀로그램 전체를 그리지 않는다).
 * 처음 그릴 때 한 번 하므로 Warmup이 셰이더를 컴파일하기 전에 끝난다. 같은 층 목록이면 같은 결과를 돌려준다(개발 모드의 두 번 렌더).
 */
function buildAtlas(gl: WebGLRenderer, layers: readonly LayerPixels[]): Atlas | null {
  if (atlases.has(layers)) return atlases.get(layers) ?? null;
  let atlas: Atlas | null = null;
  if (layers.every((layer) => layer === null)) {
    console.warn("여정 홀로그램 층을 하나도 받지 못해 홀로그램을 그리지 않습니다");
  } else {
    try {
      const texture = createLayerTexture(layers);
      if (uploadChecked(gl, texture)) atlas = { texture, loaded: layers.map((layer) => layer !== null) };
      else texture.dispose();
    } catch (error) {
      console.warn("여정 홀로그램 텍스처 배열을 만들지 못해 홀로그램을 그리지 않습니다", error);
    }
  }
  atlases.set(layers, atlas);
  return atlas;
}

const NOTHING: HologramStats = { shown: [], hovered: null, glowing: [], front: "pickcare/frontend", screens: [] };

/**
 * 제품 화면 홀로그램(스펙 3절 "제품 화면 홀로그램 (2-3a)"). 층 이미지 11장을 장면과 같은 Suspense 안에서 받으므로
 * Warmup이 홀로그램 셰이더까지 미리 컴파일한 뒤에 장면이 드러난다. 배열을 만들지 못해도 장면은 이어진다.
 */
export function Holograms() {
  const gl = useThree((state) => state.gl);
  const layers = use(loadHologramLayers());
  const atlas = useMemo(() => buildAtlas(gl, layers), [gl, layers]);
  useEffect(
    () => () => {
      releaseHologramLayers();
      recordHolograms(null);
    },
    [],
  );
  useEffect(() => {
    if (!atlas) recordHolograms(NOTHING);
  }, [atlas]);
  return atlas ? <HologramScene atlas={atlas} /> : null;
}

const cameraPosition: Vec3 = [0, 0, 0];
const corner = new Vector3();

/**
 * 통계용: 화면에 보이는 홀로그램의 그림 영역을 실제 카메라로 화면 비율 좌표(0~1)에 옮긴다.
 * 꼭짓점 하나라도 카메라 뒤에 있거나 화면과 겹치지 않으면 뺀다.
 */
function screenRects(
  placements: ReturnType<typeof hologramsAt>,
  loaded: readonly boolean[],
  targets: (index: number) => boolean,
  camera: Camera,
): HologramStats["screens"] {
  const screens: HologramStats["screens"] = [];
  placements.forEach((placement, index) => {
    if (!loaded[index] || placement.presence <= 0) return;
    const xs: number[] = [];
    const ys: number[] = [];
    for (const point of imageCorners(HOLOGRAMS[index], placement, cameraPosition)) {
      if (corner.set(...point).applyMatrix4(camera.matrixWorldInverse).z > -0.1) return;
      corner.set(...point).project(camera);
      xs.push((corner.x + 1) / 2);
      ys.push((1 - corner.y) / 2);
    }
    const rect: [number, number, number, number] = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
    if (rect[2] < 0 || rect[0] > 1 || rect[3] < 0 || rect[1] > 1) return;
    const distance = Math.hypot(
      placement.center[0] - cameraPosition[0],
      placement.center[1] - cameraPosition[1],
      placement.center[2] - cameraPosition[2],
    );
    screens.push({ id: placement.id, rect, distance, target: targets(index) });
  });
  return screens;
}

function HologramScene({ atlas }: { atlas: Atlas }) {
  const meshes = useMemo(() => createHologramMeshes(atlas.texture), [atlas]);
  const front = useRef<number | null>(null);
  const hovered = useRef<number | null>(null);
  const glow = useRef(HOLOGRAMS.map(() => 0));
  const stats = useMemo(() => statsEnabled(), []);

  useEffect(() => {
    setShownHolograms(HOLOGRAMS.filter((_, index) => atlas.loaded[index]).map((hologram) => hologram.id));
    return () => {
      setShownHolograms([]);
      meshes.dispose();
      atlas.texture.dispose();
    };
  }, [atlas, meshes]);

  useFrame((state, delta) => {
    const drive = currentDrive();
    const target = pickcareFront(drive.progress, window.location.hash);
    front.current = front.current === null ? target : damp(front.current, target, FRONT_DAMPING, delta);
    const placements = hologramsAt(drive.progress, front.current);
    const focused = getFocusedHologram();
    HOLOGRAMS.forEach((hologram, index) => {
      const lit = index === hovered.current || hologram.id === focused ? 1 : 0;
      glow.current[index] = damp(glow.current[index], lit, GLOW_DAMPING, delta);
    });
    cameraPosition[0] = state.camera.position.x;
    cameraPosition[1] = state.camera.position.y;
    cameraPosition[2] = state.camera.position.z;
    writeHolograms(meshes, placements, cameraPosition, { loaded: atlas.loaded, glow: glow.current });
    if (stats) {
      const repo = Math.min(REPO_COUNT - 1, Math.max(0, Math.round(front.current)));
      recordHolograms({
        shown: HOLOGRAMS.filter((_, index) => atlas.loaded[index]).map((hologram) => hologram.id),
        hovered: hovered.current === null ? null : HOLOGRAMS[hovered.current].id,
        glowing: HOLOGRAMS.filter((_, index) => glow.current[index] > 0.5).map((hologram) => hologram.id),
        front: HOLOGRAMS.filter((hologram) => hologram.act === 3)[repo].id,
        screens: screenRects(placements, atlas.loaded, (index) => meshes.targets[meshes.order.indexOf(index)], state.camera),
      });
    }
  });

  return (
    <>
      <primitive object={meshes.lights} />
      <primitive object={meshes.screens} />
    </>
  );
}
```

`src/components/journey/scene/Scene.tsx`에서 찾을 부분:

```tsx
import { Effects } from "./Effects";
import { Road } from "./Road";
```

바꿀 내용:

```tsx
import { Effects } from "./Effects";
import { Holograms } from "./Holograms";
import { Road } from "./Road";
```

`src/components/journey/scene/Scene.tsx`에서 찾을 부분:

```tsx
        <Dust />
        <Effects />
```

바꿀 내용:

```tsx
        <Dust />
        <Holograms />
        <Effects />
```

- [ ] **Step 4: 통과를 확인한다(드로콜·프로그램 회귀 포함)**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`은 무시)

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts -g "홀로그램 11개|한 장을 받지 못하면|모두 받지 못하면|텍스처 배열을 올리지 못하면\(GPU|PiCKCARE 앞줄은|준비 뒤 모든 정류장"`
Expected: PASS — `12 passed`(6 × desktop·mobile). "준비 뒤 모든 정류장…"은 드로콜 60 이하·프로그램 증가 0·텍스처 20~100MiB를 다시 본다

- [ ] **Step 5: 전체 확인**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`은 무시)

Run: `rtk proxy npx tsc --noEmit` → exit 0
Run: `rtk proxy npx vitest run --maxWorkers=4` → `Tests  316 passed (316)`
Run: `rtk proxy npx eslint src/components/journey/scene/frameStats.ts src/components/journey/scene/Effects.tsx src/components/journey/scene/Holograms.tsx src/components/journey/scene/Scene.tsx e2e/journey.e2e.ts` → exit 0, 출력 없음

- [ ] **Step 6: 커밋 정리를 제출한다**

파일별 변경 표와 메시지 초안. 초안 예:

```
feat: 여정 장면에 제품 화면 홀로그램 추가

- 층 11장을 장면과 같은 Suspense에서 받아 Warmup이 홀로그램 셰이더까지 미리 컴파일한다
- 이미지 한 장·전부·GPU 업로드가 실패해도 장면이 이어지는 것을 갈래마다 e2e로 확인한다
- ?debug=stats에 홀로그램 통계, &bloom=off로 블룸만 끄는 측정 스위치를 더한다
```

---

### Task 13: 홀로그램 호버·클릭·스크롤 중 다시 맞추기·링크 포커스

스펙 3절 "홀로그램 상호작용"이다. 마우스가 누를 수 있는 홀로그램 위에 오면 테두리가 밝아지고 캔버스 커서가 pointer다(훅이 돌려준 `gl`을 고치지 않도록, 포인터 이벤트가 온 캔버스를 ref에 두고 바꾼다). 누르면 짝인 "자세히 보기" 링크를 정확히 하나일 때만 눌러 상세 패널 흐름을 그대로 탄다. 해시가 이미 상세를 가리키면 무시해 연타로 기록이 둘 남지 않는다. 마우스가 캔버스 위에 있는 동안 매 프레임 한 번(후처리보다 뒤의 우선순위 2), 마지막 마우스 이벤트 자리로 다시 레이캐스트한다. 링크에 포커스가 오면 그 홀로그램이 밝아진다(`JourneyStage`가 문서 단위로 듣는다).

**Files:**
- Create: `src/components/journey/hologramLinks.ts`
- Modify: `e2e/journey.e2e.ts`, `src/components/journey/JourneyStage.tsx`, `src/components/journey/scene/Holograms.tsx`

**Interfaces:**
- Consumes: `hologramAt`(Task 11), `parseJourneyHash`, `HOLOGRAMS`·`hologramOfLink`(Task 4·7), `setFocusedHologram`(Task 9)
- Produces: `openHologramDetail(hash)`, `useHologramFocus()`(`src/components/journey/hologramLinks.ts`), e2e 도우미 `settleAt`·`hologramCenter`·`canvasCursor`

- [ ] **Step 1: e2e를 쓴다**

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts
import { driveAt } from "../src/lib/journey/drive";
import { rangeOf } from "../src/lib/journey/timeline";
```

바꿀 내용:

```ts
import { driveAt } from "../src/lib/journey/drive";
import { HOLOGRAMS } from "../src/lib/journey/holograms";
import { rangeOf } from "../src/lib/journey/timeline";
```

`e2e/journey.e2e.ts` 끝에 붙인다:

```ts

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

test("포인터를 두고 스크롤해도 호버는 포인터를 덮는 가장 가까운 홀로그램이고, 누르면 그 상세가 열린다", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", PORTRAIT_SKIP);
  await page.goto("/journey?debug=stats");
  await waitReady(page);
  await settleAt(page, at("pickcare", 0.3));
  const start = await hologramCenter(page, "pickcare/biz");
  await page.mouse.move(start.x, start.y);
  const viewport = page.viewportSize();
  if (!viewport) throw new Error("화면 크기를 읽지 못했습니다");
  const pointer = { x: start.x / viewport.width, y: start.y / viewport.height };
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
  let decided = 0;
  let last: string | null = null;
  for (let within = 0.3; within <= 0.81; within += 0.05) {
    await scrollToProgress(page, at("pickcare", within));
    await page.waitForTimeout(1200);
    const holograms = (await readStats(page)).holograms;
    if (!holograms) throw new Error("홀로그램 통계가 없습니다");
    const targets = holograms.screens.filter((screen) => screen.target);
    // 그림 영역 안쪽(가장자리 15%를 뺀 곳)에 포인터가 든 홀로그램 중 가장 가까운 것. 가장자리 근처는 판(여백 포함)과 상자가 달라 건너뛴다
    const under = targets.filter((screen) => inside(screen.rect, -0.15)).sort((a, b) => a.distance - b.distance)[0];
    const near = targets.some((screen) => inside(screen.rect, 0.25));
    if (under) {
      expect(holograms.hovered, `t=${within.toFixed(2)}`).toBe(under.id);
      decided += 1;
      last = under.id;
    } else if (!near) {
      expect(holograms.hovered, `t=${within.toFixed(2)}`).toBeNull();
    }
  }
  expect(decided).toBeGreaterThanOrEqual(3);
  const hash = HOLOGRAMS.find((hologram) => hologram.id === last)?.linkHash;
  await page.mouse.click(start.x, start.y);
  await expect(page).toHaveURL(new RegExp(`${hash?.replace("/", "\\/")}$`));
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
```

- [ ] **Step 2: 실패를 확인한다**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`은 무시)

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts --project=desktop -g "홀로그램을 누르면|키보드\(Enter\)|커서가 pointer|포인터를 두고 스크롤|짝인 상세 링크가 정확히|두 번 눌러도|포커스가 오면"`
Expected: FAIL — `5 failed | 2 passed`. 클릭·두 번 클릭은 상세가 열리지 않고(`element(s) not found`), 커서는 `Received: "auto"`, 스크롤 중 호버는 `t=0.30 … Received: null`, 링크 포커스는 `Received array: []`. "키보드(Enter)…"와 "짝인 상세 링크가 정확히 하나"는 지금 동작을 고정하는 테스트라 이미 통과한다

- [ ] **Step 3: 링크 잇기와 포인터를 쓴다**

`src/components/journey/hologramLinks.ts` 전체:

```ts
"use client";

import { useEffect } from "react";
import { parseJourneyHash } from "@/lib/journey/hash";
import { HOLOGRAMS, hologramOfLink } from "@/lib/journey/holograms";
import { setFocusedHologram } from "@/lib/journey/hologramStatus";

/**
 * 홀로그램과 본문 "자세히 보기" 링크를 잇는다(스펙 3절 "홀로그램 상호작용"). 홀로그램을 따로 접근성 있는 인터페이스로 만들지 않고,
 * 기존 링크와 상세 패널 흐름(ProjectDialog)을 단일 진입점으로 쓴다. 3D 코드를 import하지 않는다.
 */

/**
 * 짝인 상세 링크를 눌러 상세 패널의 흐름(기록 하나, 열기, 닫으면 그 링크로 포커스)을 그대로 탄다.
 * 링크가 정확히 하나일 때만 누르고, 없거나 둘 이상이면 아무것도 하지 않는다.
 * 해시가 이미 상세를 가리키면(열려 있거나 닫히는 중) 무시해 연타로 기록이 둘 남지 않게 한다(pushHash는 동기라 두 번째부터 걸러진다).
 */
export function openHologramDetail(hash: string | null): void {
  if (!hash || parseJourneyHash(window.location.hash)) return;
  const links = [...document.querySelectorAll<HTMLAnchorElement>("a[data-journey-detail]")].filter(
    (link) => link.getAttribute("href") === hash,
  );
  if (links.length === 1) links[0].click();
}

function hologramOf(target: EventTarget | null): string | null {
  const link = target instanceof Element ? target.closest("a[data-journey-detail]") : null;
  if (!(link instanceof HTMLAnchorElement)) return null;
  const index = hologramOfLink(link.getAttribute("href") ?? "");
  return index >= 0 ? HOLOGRAMS[index].id : null;
}

/** 상세 링크에 포커스가 오면 그 홀로그램의 테두리가 밝아진다(불투명도는 그대로라 사라진 홀로그램을 억지로 보이지 않는다) */
export function useHologramFocus(): void {
  useEffect(() => {
    const onFocusIn = (event: FocusEvent) => setFocusedHologram(hologramOf(event.target));
    const onFocusOut = (event: FocusEvent) => setFocusedHologram(hologramOf(event.relatedTarget));
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      setFocusedHologram(null);
    };
  }, []);
}
```

`src/components/journey/JourneyStage.tsx`에서 찾을 부분:

```tsx
import { hasWebGL2 } from "@/lib/journey/webgl";
import { ProgressRail } from "./ProgressRail";
```

바꿀 내용:

```tsx
import { hasWebGL2 } from "@/lib/journey/webgl";
import { useHologramFocus } from "./hologramLinks";
import { ProgressRail } from "./ProgressRail";
```

`src/components/journey/JourneyStage.tsx`에서 찾을 부분:

```tsx
  useJourneyScroll();
  const webgl = useSyncExternalStore(subscribeNothing, hasWebGL2, () => false);
```

바꿀 내용:

```tsx
  useJourneyScroll();
  useHologramFocus();
  const webgl = useSyncExternalStore(subscribeNothing, hasWebGL2, () => false);
```

`src/components/journey/scene/Holograms.tsx`에서 찾을 부분:

```tsx

import { useFrame, useThree } from "@react-three/fiber";
import { use, useEffect, useMemo, useRef } from "react";
import { Vector3, type Camera, type DataArrayTexture, type WebGLRenderer } from "three";
import { damp } from "@/lib/journey/damp";
import { HOLOGRAMS, REPO_COUNT, hologramsAt, imageCorners, pickcareFront } from "@/lib/journey/holograms";
import { getFocusedHologram, setShownHolograms } from "@/lib/journey/hologramStatus";
import type { Vec3 } from "@/lib/journey/timeline";
import { currentDrive } from "./driveFrame";
import { recordHolograms, statsEnabled, type HologramStats } from "./frameStats";
import { createLayerTexture, loadHologramLayers, releaseHologramLayers, uploadChecked, type LayerPixels } from "./hologramAtlas";
import { createHologramMeshes, writeHolograms } from "./hologramMeshes";

```

바꿀 내용:

```tsx

import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { use, useEffect, useMemo, useRef } from "react";
import { Vector3, type Camera, type DataArrayTexture, type WebGLRenderer } from "three";
import { damp } from "@/lib/journey/damp";
import { parseJourneyHash } from "@/lib/journey/hash";
import { HOLOGRAMS, REPO_COUNT, hologramsAt, imageCorners, pickcareFront } from "@/lib/journey/holograms";
import { getFocusedHologram, setShownHolograms } from "@/lib/journey/hologramStatus";
import type { Vec3 } from "@/lib/journey/timeline";
import { openHologramDetail } from "../hologramLinks";
import { currentDrive } from "./driveFrame";
import { recordHolograms, statsEnabled, type HologramStats } from "./frameStats";
import { createLayerTexture, loadHologramLayers, releaseHologramLayers, uploadChecked, type LayerPixels } from "./hologramAtlas";
import { createHologramMeshes, hologramAt, writeHolograms } from "./hologramMeshes";

```

`src/components/journey/scene/Holograms.tsx`에서 찾을 부분:

```tsx

function HologramScene({ atlas }: { atlas: Atlas }) {
```

바꿀 내용:

```tsx

/**
 * 홀로그램 그리기와 포인터(스펙 3절 "홀로그램 상호작용").
 * - 호버: 마우스가 누를 수 있는 홀로그램 위에 오면 테두리가 밝아지고 커서가 pointer다(터치는 호버가 없다).
 * - 클릭: 짝인 상세 링크를 눌러 기존 흐름으로 연다. 누를 수 없는 칸은 메시의 레이캐스트에서 빠져 있다(hologramMeshes).
 * - 포인터를 두고 스크롤만 해도 홀로그램이 지나가고, 스크롤이 멈춘 뒤에도 카메라와 PiCKCARE 앞줄이 감쇠로 더 움직인다.
 *   그래서 마우스가 캔버스 위에 있는 동안 매 프레임 한 번, 마지막 마우스 이벤트 자리로 다시 레이캐스트한다(대상은 메시 하나, 11칸).
 */
function HologramScene({ atlas }: { atlas: Atlas }) {
```

`src/components/journey/scene/Holograms.tsx`에서 찾을 부분:

```tsx
  const glow = useRef(HOLOGRAMS.map(() => 0));
  const stats = useMemo(() => statsEnabled(), []);

```

바꿀 내용:

```tsx
  const glow = useRef(HOLOGRAMS.map(() => 0));
  /** 포인터 이벤트가 온 캔버스. 커서를 바꾼다 */
  const canvas = useRef<HTMLElement | null>(null);
  const stats = useMemo(() => statsEnabled(), []);

  const hover = (index: number | null) => {
    hovered.current = index;
    if (canvas.current) canvas.current.style.cursor = index === null ? "" : "pointer";
  };

```

`src/components/journey/scene/Holograms.tsx`에서 찾을 부분:

```tsx
    const drive = currentDrive();
    const target = pickcareFront(drive.progress, window.location.hash);
    front.current = front.current === null ? target : damp(front.current, target, FRONT_DAMPING, delta);
```

바꿀 내용:

```tsx
    const drive = currentDrive();
    const hash = window.location.hash;
    // 상세가 열리면 모달이 캔버스를 덮어 포인터가 오지 않는다. 남은 호버를 지운다
    if (hovered.current !== null && parseJourneyHash(hash)) hover(null);
    const target = pickcareFront(drive.progress, hash);
    front.current = front.current === null ? target : damp(front.current, target, FRONT_DAMPING, delta);
```

`src/components/journey/scene/Holograms.tsx`에서 찾을 부분:

```tsx

  return (
    <>
      <primitive object={meshes.lights} />
      <primitive object={meshes.screens} />
    </>
```

바꿀 내용:

```tsx

  // 그린 뒤(후처리가 우선순위 1로 그린다), 마지막 이벤트가 캔버스 위 마우스 이동이고 상세가 닫혀 있을 때 다시 맞춘다.
  // 캔버스를 떠나면(본문 패널 위 포함) 마지막 이벤트가 pointerleave라 멈춘다
  useFrame((state) => {
    const event = state.internal.lastEvent.current;
    if (!(event instanceof PointerEvent) || event.type !== "pointermove" || event.pointerType !== "mouse") return;
    if (parseJourneyHash(window.location.hash)) return;
    state.events.update?.();
  }, 2);

  return (
    <>
      <primitive object={meshes.lights} />
      <primitive
        object={meshes.screens}
        onPointerMove={(event: ThreeEvent<PointerEvent>) => {
          if (event.nativeEvent.pointerType !== "mouse" || event.instanceId === undefined) return;
          event.stopPropagation();
          if (event.nativeEvent.target instanceof HTMLElement) canvas.current = event.nativeEvent.target;
          hover(hologramAt(meshes, event.instanceId));
        }}
        onPointerOut={() => hover(null)}
        onClick={(event: ThreeEvent<MouseEvent>) => {
          if (event.instanceId === undefined) return;
          event.stopPropagation();
          const index = hologramAt(meshes, event.instanceId);
          hover(null);
          openHologramDetail(HOLOGRAMS[index].linkHash);
        }}
      />
    </>
```

- [ ] **Step 4: 통과를 확인한다**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`은 무시)

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts -g "홀로그램을 누르면|키보드\(Enter\)|커서가 pointer|포인터를 두고 스크롤|짝인 상세 링크가 정확히|두 번 눌러도|포커스가 오면"`
Expected: PASS — `10 passed, 4 skipped`(mobile에서 홀로그램 자리를 쓰는 넷은 건너뛴다)

다시 맞추기를 빼면(`state.events.update?.();` 줄을 지우면) "포인터를 두고 스크롤해도…"가 `t=0.40 Expected: "pickcare/studio" Received: "pickcare/biz"`로 실패하는 것을 계획 작성 때 확인했다

- [ ] **Step 5: 전체 확인**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`은 무시)

Run: `rtk proxy npx tsc --noEmit` → exit 0
Run: `rtk proxy npx vitest run --maxWorkers=4` → `Tests  316 passed (316)`
Run: `rtk proxy npx eslint src/components/journey/hologramLinks.ts src/components/journey/JourneyStage.tsx src/components/journey/scene/Holograms.tsx e2e/journey.e2e.ts` → exit 0, 출력 없음

- [ ] **Step 6: 커밋 정리를 제출한다**

파일별 변경 표와 메시지 초안. 초안 예:

```
feat: 홀로그램 호버·클릭·링크 포커스를 상세 링크 흐름에 연결

- 홀로그램 클릭은 짝인 "자세히 보기" 링크를 눌러 같은 흐름(기록 하나, 닫으면 링크로 포커스)으로 연다
- 스크롤을 멈춘 뒤에도 감쇠로 움직이므로 마우스가 캔버스 위에 있는 동안 매 프레임 다시 레이캐스트한다
- 링크에 포커스가 오면 그 홀로그램이 밝아진다
```

---

### Task 14: 2막 썸네일 대체

스펙 3절 "썸네일 대체"다. 2막 본문 패널의 썸네일을 작은 클라이언트 컴포넌트로 감싸, 장면이 ready이고 그 홀로그램이 켜져 있으면 화면에서만 감춘다(sr-only). 대체 텍스트는 남고 캔버스는 보조기기에서 숨겨져 있어 한 번만 읽힌다. 서버 렌더에서는 보이고, WebGL이 없거나 배열이 실패하거나 실행 중 장면이 실패하면 다시 보인다.

**Files:**
- Create: `src/components/journey/HologramThumbnail.tsx`
- Modify: `e2e/journey.e2e.ts`, `src/components/journey/JourneyContent.tsx`

**Interfaces:**
- Consumes: `getShownHolograms`·`subscribeHolograms`·`thumbnailHidden`(Task 9), `sceneStatus`
- Produces: `<HologramThumbnail id>`(`data-journey-thumbnail`), e2e 도우미 `expectThumbnail(page, slug, hidden)`

- [ ] **Step 1: 실패하는 e2e를 쓴다**

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts
import { driveAt } from "../src/lib/journey/drive";
import { HOLOGRAMS } from "../src/lib/journey/holograms";
```

바꿀 내용:

```ts
import { driveAt } from "../src/lib/journey/drive";
import { projects } from "../src/data/projects";
import { HOLOGRAMS } from "../src/lib/journey/holograms";
```

`e2e/journey.e2e.ts` 끝에 붙인다:

```ts

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
```

- [ ] **Step 2: 실패를 확인한다**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`은 무시)

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts --project=desktop -g "썸네일"`
Expected: FAIL — `5 failed`(`[data-journey-thumbnail]`가 없다)

- [ ] **Step 3: 썸네일 감싸개를 쓴다**

`src/components/journey/HologramThumbnail.tsx` 전체:

```tsx
"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import {
  getServerShownHolograms,
  getShownHolograms,
  subscribeHolograms,
  thumbnailHidden,
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
    <div data-journey-thumbnail={id} className={hidden ? "sr-only" : undefined}>
      {children}
    </div>
  );
}
```

`src/components/journey/JourneyContent.tsx`에서 찾을 부분:

```tsx
import { EmailCopy } from "./EmailCopy";

```

바꿀 내용:

```tsx
import { EmailCopy } from "./EmailCopy";
import { HologramThumbnail } from "./HologramThumbnail";

```

`src/components/journey/JourneyContent.tsx`에서 찾을 부분:

```tsx
          // 썸네일이 작은 글(Stock2U·Tix2U는 폭 약 720px)도 레티나에서 선명하도록 원본 폭의 절반까지만 키운다.
          <Image
            src={thumbnail.src}
            alt={thumbnail.alt}
            width={thumbnail.width}
            height={thumbnail.height}
            sizes="360px"
            className="mt-4 h-auto w-full rounded-lg border border-white/10"
            style={{ maxWidth: Math.min(360, thumbnail.width / 2) }}
          />
        )}
```

바꿀 내용:

```tsx
          // 썸네일이 작은 글(Stock2U·Tix2U는 폭 약 720px)도 레티나에서 선명하도록 원본 폭의 절반까지만 키운다.
          // 같은 프로젝트의 홀로그램이 3D에 켜져 있으면 화면에서만 감춘다.
          <HologramThumbnail id={project.slug}>
            <Image
              src={thumbnail.src}
              alt={thumbnail.alt}
              width={thumbnail.width}
              height={thumbnail.height}
              sizes="360px"
              className="mt-4 h-auto w-full rounded-lg border border-white/10"
              style={{ maxWidth: Math.min(360, thumbnail.width / 2) }}
            />
          </HologramThumbnail>
        )}
```

- [ ] **Step 4: 통과를 확인한다**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`은 무시)

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts -g "썸네일"`
Expected: PASS — `10 passed`(5 × desktop·mobile)

- [ ] **Step 5: 전체 확인**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`은 무시)

Run: `rtk proxy npx tsc --noEmit` → exit 0
Run: `rtk proxy npx vitest run --maxWorkers=4` → `Tests  316 passed (316)`
Run: `rtk proxy npx eslint src/components/journey/HologramThumbnail.tsx src/components/journey/JourneyContent.tsx e2e/journey.e2e.ts` → exit 0, 출력 없음

- [ ] **Step 6: 커밋 정리를 제출한다**

파일별 변경 표와 메시지 초안. 초안 예:

```
feat: 2막 썸네일을 3D 홀로그램이 켜지면 화면에서만 감춤

- 같은 화면을 두 번 보이지 않게 하되, 3D가 없거나 실패하면 그대로 보인다
- 대체 텍스트는 남아 화면 낭독기는 한 번만 읽는다
```

---

### Task 15: 검증 도구 — check:holograms와 홀로그램 캡처

스펙 1절 2-3a 완료 조건의 원래 색 검증 ①·③과 8절 4항이다. `check:holograms`는 GPU를 쓰는 실제 Chrome 창에서 ① 실제 재질을 톤 매핑 없이 1:1 화소로 그려(검증 페이지를 esbuild로 묶어 띄운다) 층 이미지와 비교하고, ③ 실제 페이지의 막별 대표 시점을 블룸을 켜고 끈 두 장으로 찍어 화면에 보이는 홀로그램의 그림 영역 안 차이를 재며, 층 이미지 파일 합계와 받은 양도 적는다. 화소는 스크린샷이 아니라 캔버스 원본(`toDataURL`)으로 읽고(스크린샷은 P3 화면 색으로 바뀔 수 있다), 잘라 낸 층은 PNG로 넘긴다(형식을 정하지 않으면 손실 WebP로 다시 인코딩된다). `capture:journey`에 `CAPTURE_SET=holograms`를 더한다.

**Files:**
- Create: `scripts/check-holograms-page.ts`, `scripts/check-holograms.ts`
- Modify: `package.json`, `scripts/capture-journey.ts`, `package-lock.json`

**Interfaces:**
- Consumes: 실제 `loadLayer`·`createLayerTexture`·`uploadChecked`·`createHologramMeshes`·`writeHolograms`(Task 10·11), `?debug=stats&bloom=off`·`holograms.screens`(Task 12)
- Produces: `npm run check:holograms`, `CAPTURE_SET=holograms`, 개발 의존성 `esbuild@0.28.2`

- [ ] **Step 1: esbuild를 개발 의존성으로 고정한다**

Run: `rtk proxy npm install -D --save-exact esbuild@0.28.2`
Expected: exit 0. `package.json`의 `devDependencies`에 `"esbuild": "0.28.2"`가 생기고 `package-lock.json`은 한 줄만 바뀐다(이미 tsx를 통해 설치돼 있다)

- [ ] **Step 2: 검증 스크립트와 캡처 묶음을 쓴다**

`scripts/check-holograms-page.ts` 전체:

```ts
import { Color, NoToneMapping, OrthographicCamera, Scene, WebGLRenderer } from "three";
import { createLayerTexture, loadLayer, uploadChecked } from "@/components/journey/scene/hologramAtlas";
import { createHologramMeshes, writeHolograms } from "@/components/journey/scene/hologramMeshes";
import { HOLOGRAMS, LAYER, type HologramPlacement } from "@/lib/journey/holograms";

/**
 * check:holograms ①의 브라우저 쪽(scripts/check-holograms.ts가 esbuild로 묶어 띄운다). 실제 홀로그램 재질과 메시로 층 하나를
 * 톤 매핑·후처리 없이 1:1 화소(직교 카메라, 화소 단위)로 그린다. 화면 영역에 발광이 없으면 층 이미지와 화소 단위로 같다.
 */
export const CANVAS = { width: 1024, height: 640 } as const;

declare global {
  interface Window {
    hologramCheck?: { loaded: boolean[]; uploaded: boolean; show(index: number): { left: number; top: number } };
  }
}

async function main() {
  const renderer = new WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(CANVAS.width, CANVAS.height);
  renderer.toneMapping = NoToneMapping;
  document.body.style.margin = "0";
  document.body.appendChild(renderer.domElement);
  const scene = new Scene();
  scene.background = new Color(0x000000);
  const camera = new OrthographicCamera(-CANVAS.width / 2, CANVAS.width / 2, CANVAS.height / 2, -CANVAS.height / 2, 0.1, 2000);
  camera.position.set(0, 0, 1000);

  const layers = await Promise.all(HOLOGRAMS.map((hologram) => loadLayer(hologram.layerFile)));
  const texture = createLayerTexture(layers);
  const uploaded = uploadChecked(renderer, texture);
  const meshes = createHologramMeshes(texture);
  scene.add(meshes.screens);
  const loaded = layers.map((layer) => layer !== null);

  window.hologramCheck = {
    loaded,
    uploaded,
    // 층 상자를 화소 단위(768×480)로 화면 가운데에 둔다. 왼쪽 위 모서리가 정수 화소라 텍셀 가운데가 화소 가운데에 온다
    show(index) {
      const placements: HologramPlacement[] = HOLOGRAMS.map((hologram, i) => ({
        id: hologram.id,
        center: [0, 0, 0],
        facing: { kind: "camera" },
        box: [LAYER.width, LAYER.height],
        presence: i === index ? 1 : 0,
        disc: [0, 0, 0],
        discOpacity: 0,
        colorS: 0,
      }));
      writeHolograms(meshes, placements, [0, 0, 1000], { loaded, glow: HOLOGRAMS.map(() => 0) });
      renderer.render(scene, camera);
      return { left: (CANVAS.width - LAYER.width) / 2, top: (CANVAS.height - LAYER.height) / 2 };
    },
  };
}

void main();
```

`scripts/check-holograms.ts` 전체:

```ts
import { chromium, type Browser, type Page, type Request } from "@playwright/test";
import { build } from "esbuild";
import { stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { HOLOGRAMS, layerRect, sourceSize } from "@/lib/journey/holograms";
import { rangeOf } from "@/lib/journey/timeline";

/**
 * 홀로그램 원래 색 검증(스펙 1절 2-3a 완료 조건 ①·③, 8절 4항). GPU를 쓰는 실제 Chrome 창에서 잰다.
 * ① 화면 발광 없음: 실제 재질을 톤 매핑 없이 1:1 화소로 그려(scripts/check-holograms-page.ts) 층 이미지와 비교한다. 평균 ΔE 0.5 미만.
 * ③ 블룸 기여: 실제 페이지의 막별 대표 시점을 블룸을 켜고(?debug=stats) 끈(&bloom=off) 두 장으로 찍어,
 *    화면에 보이는 홀로그램의 그림 영역 안 차이를 잰다(주변 발광 포함). 평균 ΔE 2 이하. 본문·헤더·진행 막대는 숨기고 찍는다.
 * 내려받는 양(스펙 7절): 층 이미지 파일 합계와, 블룸을 켠 페이지가 실제로 받은 양(응답 본문 + 헤더)을 따로 적는다.
 *
 * 사용법:
 *   npx next build && npx next start --port 3200   # 다른 터미널
 *   npm run check:holograms                        # 결과를 출력하고, 기준을 넘으면 실패로 끝난다
 */
const TARGET_URL = process.env.CHECK_URL ?? "http://localhost:3200/journey";
const ORIGIN = new URL(TARGET_URL).origin;
const VIEWPORT = { width: 1440, height: 900 };
const READY_TIMEOUT = 30_000;
const SETTLE_MS = 2500;
const MATERIAL_LIMIT = 0.5;
const BLOOM_LIMIT = 2;
/** [정류장, 정류장 안의 위치]: 1막 주황(밝은 Todo, 어두운 EUTCHA), 2막 머묾, PiCKCARE 머묾 */
const SPOTS: [string, number][] = [
  ["todo-app", 0.1],
  ["eutcha", 0.1],
  ["stock2u", 0.5],
  ["tix2u", 0.5],
  ["pfplay", 0.5],
  ["pickcare", 0.5],
];

type Pixels = { data: Buffer; width: number; height: number; channels: number };

function linear(channel: number): number {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function lab(r: number, g: number, b: number): [number, number, number] {
  const [R, G, B] = [linear(r), linear(g), linear(b)];
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const x = f((0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047);
  const y = f(0.2126 * R + 0.7152 * G + 0.0722 * B);
  const z = f((0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

/** 같은 크기의 두 이미지에서 영역 안의 평균·최대 ΔE(CIE76) */
function deltaE(a: Pixels, b: Pixels, region: { left: number; top: number; width: number; height: number }) {
  let sum = 0;
  let max = 0;
  let count = 0;
  for (let y = region.top; y < region.top + region.height; y++) {
    for (let x = region.left; x < region.left + region.width; x++) {
      const i = (y * a.width + x) * a.channels;
      const j = (y * b.width + x) * b.channels;
      const p = lab(a.data[i], a.data[i + 1], a.data[i + 2]);
      const q = lab(b.data[j], b.data[j + 1], b.data[j + 2]);
      const value = Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
      sum += value;
      max = Math.max(max, value);
      count += 1;
    }
  }
  return { mean: count ? sum / count : 0, max };
}

async function pixels(input: Buffer | string): Promise<Pixels> {
  const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height, channels: info.channels };
}

/** ① 실제 재질을 톤 매핑 없이 그리면 층 이미지와 같은가 */
async function checkMaterial(browser: Browser): Promise<boolean> {
  const bundle = await build({
    entryPoints: [path.join("scripts", "check-holograms-page.ts")],
    bundle: true,
    format: "esm",
    write: false,
    alias: { "@": path.resolve("src") },
    logLevel: "error",
  });
  const script = bundle.outputFiles[0].text;
  const page = await browser.newPage({ viewport: { width: 1024, height: 640 }, deviceScaleFactor: 1 });
  try {
    await page.route(`${ORIGIN}/__hologram-check/**`, (route) =>
      route.fulfill({ body: `<!doctype html><body><script type="module">${script}</script></body>`, contentType: "text/html" }),
    );
    await page.goto(`${ORIGIN}/__hologram-check/`);
    await page.waitForFunction(() => window.hologramCheck !== undefined, null, { timeout: READY_TIMEOUT });
    const state = await page.evaluate(() => ({ loaded: window.hologramCheck?.loaded, uploaded: window.hologramCheck?.uploaded }));
    if (!state.uploaded || state.loaded?.some((ok) => !ok)) throw new Error(`층을 올리지 못했습니다: ${JSON.stringify(state)}`);
    let pass = true;
    console.log("① 화면 발광 없음(톤 매핑 없이 그린 화면 vs 층 이미지, 평균 ΔE 0.5 미만)");
    for (const [index, hologram] of HOLOGRAMS.entries()) {
      const origin = await page.evaluate((i) => window.hologramCheck?.show(i), index);
      if (!origin) throw new Error("검증 페이지가 준비되지 않았습니다");
      // 스크린샷은 디스플레이 색 공간으로 바뀔 수 있어(P3 화면) 캔버스의 화소를 그대로 읽는다
      const dataUrl = await page.evaluate(() => document.querySelector("canvas")?.toDataURL("image/png") ?? "");
      const shot = await pixels(Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ""), "base64"));
      const size = sourceSize(hologram);
      const rect = layerRect(size.width, size.height);
      // 잘라 낸 층은 PNG(무손실)로 넘긴다. 형식을 정하지 않으면 원래 형식(손실 WebP)으로 다시 인코딩된다
      const layer = await sharp(path.join("public", hologram.layerFile))
        .extract({ left: rect.x, top: rect.y, width: rect.width, height: rect.height })
        .png()
        .toBuffer();
      const expected = await pixels(
        await sharp({ create: { width: 1024, height: 640, channels: 3, background: "#000" } })
          .composite([{ input: layer, left: origin.left + rect.x, top: origin.top + rect.y }])
          .png()
          .toBuffer(),
      );
      // 그림 가장자리 한 화소는 테두리 경계와 맞닿아 뺀다
      const region = { left: origin.left + rect.x + 1, top: origin.top + rect.y + 1, width: rect.width - 2, height: rect.height - 2 };
      const result = deltaE(expected, shot, region);
      const ok = result.mean < MATERIAL_LIMIT;
      pass &&= ok;
      console.log(`  ${ok ? "통과" : "실패"} ${hologram.id}: 평균 ${result.mean.toFixed(3)}, 최대 ${result.max.toFixed(2)}`);
    }
    return pass;
  } finally {
    await page.close();
  }
}

async function scrollToProgress(page: Page, progress: number): Promise<void> {
  await page.evaluate((target) => {
    const main = document.querySelector("[data-journey-page]");
    if (!(main instanceof HTMLElement)) throw new Error("여정 본문이 없습니다");
    const top = main.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top + target * (main.offsetHeight - window.innerHeight), behavior: "instant" });
  }, progress);
}

type Screen = { id: string; rect: [number, number, number, number] };

type Download = { body: number; headers: number; requests: number };

/** 층 이미지 요청이 받은 양(응답 본문 + 헤더). 페이지를 닫기 전에 잰다 */
async function downloaded(layers: Request[]): Promise<Download> {
  const total: Download = { body: 0, headers: 0, requests: layers.length };
  for (const request of layers) {
    const sizes = await request.sizes();
    total.body += sizes.responseBodySize;
    total.headers += sizes.responseHeadersSize;
  }
  return total;
}

/** 대표 시점마다 화면 사진과 보이는 홀로그램의 그림 영역, 층 이미지를 받은 양 */
async function shootSpots(browser: Browser, bloom: boolean): Promise<{ shots: Pixels[]; screens: Screen[][]; download: Download }> {
  const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 2 });
  const layers: Request[] = [];
  page.on("requestfinished", (request) => {
    if (new URL(request.url()).pathname.startsWith("/journey/holograms/")) layers.push(request);
  });
  try {
    await page.addInitScript("window.__name = (target) => target;");
    await page.goto(`${TARGET_URL}?debug=stats${bloom ? "" : "&bloom=off"}`, { waitUntil: "load" });
    await page.locator('[data-journey-scene][data-state="ready"]').waitFor({ timeout: READY_TIMEOUT });
    await page.addStyleTag({
      content: '[data-journey-page], [data-site-header], nav[aria-label="여정 진행"] { visibility: hidden !important; }',
    });
    const shots: Pixels[] = [];
    const screens: Screen[][] = [];
    for (const [id, within] of SPOTS) {
      const range = rangeOf(id);
      await scrollToProgress(page, range.start + (range.end - range.start) * within);
      await page.waitForTimeout(SETTLE_MS);
      shots.push(await pixels(await page.screenshot()));
      screens.push(
        await page.evaluate(
          () => (window as Window & { __journeyStats?: { holograms: { screens: Screen[] } | null } }).__journeyStats?.holograms?.screens ?? [],
        ),
      );
    }
    return { shots, screens, download: await downloaded(layers) };
  } finally {
    await page.close();
  }
}

/** 층 이미지 파일 합계와 브라우저가 받은 양 */
async function reportDownload(download: Download): Promise<void> {
  let files = 0;
  for (const hologram of HOLOGRAMS) files += (await stat(path.join("public", hologram.layerFile))).size;
  console.log(
    `내려받는 양: 층 이미지 ${HOLOGRAMS.length}장 파일 합계 ${files}바이트, ` +
      `받은 양 ${download.body + download.headers}바이트(본문 ${download.body} + 헤더 ${download.headers}, 요청 ${download.requests}개)`,
  );
}

/** ③ 실제 장면에서 블룸이 홀로그램 화면 안에 더한 몫 */
async function checkBloom(browser: Browser): Promise<boolean> {
  const on = await shootSpots(browser, true);
  const off = await shootSpots(browser, false);
  await reportDownload(on.download);
  let pass = true;
  console.log("③ 블룸 기여(블룸 켬 vs 끔, 화면에 보이는 홀로그램의 그림 영역 안, 평균 ΔE 2 이하)");
  SPOTS.forEach(([id, within], index) => {
    const shot = on.shots[index];
    for (const screen of on.screens[index]) {
      const [left, top, right, bottom] = screen.rect;
      const inset = 0.03;
      const x0 = Math.max(0, Math.round((left + (right - left) * inset) * shot.width));
      const y0 = Math.max(0, Math.round((top + (bottom - top) * inset) * shot.height));
      const x1 = Math.min(shot.width, Math.round((right - (right - left) * inset) * shot.width));
      const y1 = Math.min(shot.height, Math.round((bottom - (bottom - top) * inset) * shot.height));
      if (x1 - x0 < 8 || y1 - y0 < 8) continue;
      const result = deltaE(off.shots[index], shot, { left: x0, top: y0, width: x1 - x0, height: y1 - y0 });
      const ok = result.mean <= BLOOM_LIMIT;
      pass &&= ok;
      console.log(`  ${ok ? "통과" : "실패"} ${id} ${within} / ${screen.id}: 평균 ${result.mean.toFixed(2)}, 최대 ${result.max.toFixed(1)}`);
    }
  });
  return pass;
}

async function main() {
  const browser = await chromium.launch({ headless: false, args: ["--ignore-gpu-blocklist"] });
  try {
    const material = await checkMaterial(browser);
    const bloom = await checkBloom(browser);
    if (!material || !bloom) process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

`scripts/capture-journey.ts`에서 찾을 부분:

```ts
 * 정류장에서 길이 열리는 동안 넷(먼 경계), 휠로 천천히·빠르게 굴리는 도중 넷씩(이동 속도) — 4×4 한 장.
 * 기본은 GPU를 쓰는 실제 Chrome 창이다.
```

바꿀 내용:

```ts
 * 정류장에서 길이 열리는 동안 넷(먼 경계), 휠로 천천히·빠르게 굴리는 도중 넷씩(이동 속도) — 4×4 한 장.
 * CAPTURE_SET=holograms는 막별 홀로그램 장면(스펙 3절 "제품 화면 홀로그램")을 본다: 1막 다가갈 때, 2막 머묾,
 * PiCKCARE 들어설 때·머묾·떠날 때, 엔딩(빛 원반만 남는다) — 3×3 한 장.
 * 기본은 GPU를 쓰는 실제 Chrome 창이다.
```

`scripts/capture-journey.ts`에서 찾을 부분:

```ts
 *   CAPTURE_SET=edge CAPTURE_NAME=2-2b-edge npm run capture:journey
 *   CAPTURE_HEADLESS=1을 더하면 창 없이 찍는다(소프트웨어 렌더링이라 색과 속도는 실제와 다르다).
```

바꿀 내용:

```ts
 *   CAPTURE_SET=edge CAPTURE_NAME=2-2b-edge npm run capture:journey
 *   CAPTURE_SET=holograms CAPTURE_NAME=2-3a npm run capture:journey
 *   CAPTURE_HEADLESS=1을 더하면 창 없이 찍는다(소프트웨어 렌더링이라 색과 속도는 실제와 다르다).
```

`scripts/capture-journey.ts`에서 찾을 부분:

```ts

function progressOf(id: string, within: number): number {
```

바꿀 내용:

```ts

/** 막별 홀로그램 장면 */
const HOLOGRAM_SHOTS: [string, string, number][] = [
  ["01-todo-app", "todo-app", 0.1],
  ["02-eutcha", "eutcha", 0.1],
  ["03-stock2u", "stock2u", 0.5],
  ["04-tix2u", "tix2u", 0.5],
  ["05-pfplay", "pfplay", 0.5],
  ["06-pickcare-enter", "pickcare", 0.1],
  ["07-pickcare", "pickcare", 0.5],
  ["08-pickcare-leave", "pickcare", 0.86],
  ["09-ending", "ending", 1],
];

function progressOf(id: string, within: number): number {
```

`scripts/capture-journey.ts`에서 찾을 부분:

```ts

async function captureStops(page: Page, outDir: string): Promise<string[]> {
  const files: string[] = [];
  for (const [name, id, within] of SHOTS) {
    await scrollToProgress(page, progressOf(id, within));
```

바꿀 내용:

```ts

async function captureStops(page: Page, outDir: string, shots: [string, string, number][]): Promise<string[]> {
  const files: string[] = [];
  for (const [name, id, within] of shots) {
    await scrollToProgress(page, progressOf(id, within));
```

`scripts/capture-journey.ts`에서 찾을 부분:

```ts
    await page.locator('[data-journey-scene][data-state="ready"]').waitFor({ timeout: READY_TIMEOUT });
    const files = SET === "edge" ? await captureEdge(page, outDir) : await captureStops(page, outDir);
    const columns = SET === "edge" ? 4 : 3;
```

바꿀 내용:

```ts
    await page.locator('[data-journey-scene][data-state="ready"]').waitFor({ timeout: READY_TIMEOUT });
    const files =
      SET === "edge"
        ? await captureEdge(page, outDir)
        : await captureStops(page, outDir, SET === "holograms" ? HOLOGRAM_SHOTS : SHOTS);
    const columns = SET === "edge" ? 4 : 3;
```

`package.json`에서 찾을 부분:

```json
    "capture:journey": "tsx scripts/capture-journey.ts",
    "build:galaxy": "tsx scripts/build-galaxy.ts",
```

바꿀 내용:

```json
    "capture:journey": "tsx scripts/capture-journey.ts",
    "check:holograms": "tsx scripts/check-holograms.ts",
    "build:galaxy": "tsx scripts/build-galaxy.ts",
```

- [ ] **Step 3: 검증을 돌린다(실제 Chrome 창)**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`은 무시)

Run: `rtk proxy npx next build && rtk proxy npx next start --port 3200`(다른 터미널)
Run: `rtk proxy npm run check:holograms`
Expected: exit 0. 계획 작성 때 출력:

```
① 화면 발광 없음(톤 매핑 없이 그린 화면 vs 층 이미지, 평균 ΔE 0.5 미만)
  통과 kokoa-clone: 평균 0.000, 최대 0.00
  … (11장 모두 평균 0.000, 최대 0.00)
내려받는 양: 층 이미지 11장 파일 합계 203436바이트, 받은 양 206535바이트(본문 203436 + 헤더 3099, 요청 11개)
③ 블룸 기여(블룸 켬 vs 끔, 화면에 보이는 홀로그램의 그림 영역 안, 평균 ΔE 2 이하)
  통과 todo-app 0.1 / todo-app: 평균 0.02, 최대 1.4
  통과 eutcha 0.1 / eutcha: 평균 0.57, 최대 29.4
  … (14개 모두 통과, 가장 큰 평균 1.44)
```

Run: `CAPTURE_SET=holograms CAPTURE_NAME=2-3a rtk proxy npm run capture:journey`
Expected: `9장과 sheet.png를 test-results/journey-captures/2-3a에 저장했습니다`. sheet.png를 Read로 열어 막별 홀로그램(1막 다가갈 때, 2막 머묾, PiCKCARE 들어설 때·머묾·떠날 때, 엔딩)을 본다. 2막 패널에는 썸네일이 없어야 한다

서버는 `lsof -t -iTCP:3200 -sTCP:LISTEN`으로 찾은 PID만 끈다.

- [ ] **Step 4: 전체 확인**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`은 무시)

Run: `rtk proxy npx tsc --noEmit` → exit 0
Run: `rtk proxy npx vitest run --maxWorkers=4` → `Tests  316 passed (316)`
Run: `rtk proxy npx eslint scripts/check-holograms-page.ts scripts/check-holograms.ts scripts/capture-journey.ts` → exit 0, 출력 없음

- [ ] **Step 5: 커밋 정리를 제출한다**

파일별 변경 표와 메시지 초안. 초안 예:

```
chore: 홀로그램 색·블룸·내려받는 양 검증 도구와 캡처 묶음 추가

- 실제 재질을 톤 매핑 없이 그려 발광이 없는지, 실제 페이지에서 블룸이 화면 안에 더한 몫을 잰다(스펙 2-3a 완료 조건)
- 브라우저 묶음을 위해 이미 설치돼 있던 esbuild 0.28.2를 개발 의존성으로 고정한다
```

---

### Task 16: 전체 검증과 완료 보고

코드는 바꾸지 않는다. 스펙 1절 2-3a 완료 조건을 최종 구현에서 모두 확인하고, 숫자와 캡처를 남긴다. 중간에 하나라도 기대와 다르면 원인을 찾아 해당 태스크에서 고친다(systematic-debugging).

**Files:**
- Modify: `docs/superpowers/specs/2026-10-14-journey-design.md`(1절 단계 표의 2-3a에 "(완료)", 7절 2-3a 예산 표에 최종 실측)

- [ ] **Step 1: 단위·타입·린트**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`은 무시)

Run: `rtk proxy npx tsc --noEmit` → exit 0
Run: `rtk proxy npx vitest run --maxWorkers=4` → `Tests  316 passed (316)`
Run: `rtk proxy npx eslint .` → 오류는 기존 6개뿐이다(`src/components/Background3D.tsx` 3개, `src/app/about/page.tsx` 2개, `src/app/blog/[slug]/page.tsx` 1개). 이 계획에서 만들거나 바꾼 파일에는 오류·경고가 없다

- [ ] **Step 2: 전체 e2e**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`은 무시)

Run: `rtk proxy npx playwright test`
Expected: PASS — `118 passed, 4 skipped`(블로그 14 + 여정 104. 건너뜀은 mobile의 홀로그램 자리 테스트 넷). 블로그 화면 비교는 로컬 기준 이미지(`e2e/__screenshots__/`)로 돈다

- [ ] **Step 3: 성능 3회와 검증·캡처(실제 Chrome 창)**

Run: `rtk proxy npx next build && rtk proxy npx next start --port 3200`(다른 터미널)
Run: `rtk proxy npm run perf:journey` → 3회 모두 50ms 초과 0. `maxDrawCalls` 60 이하(계획 작성 때 46), `programs`가 회마다 [준비, 끝] 같은 수(28, 28), `textureMB` 100 이하(58.8). 주사율과 함께 평균·p95·p99를 적는다(계획 작성 때 100Hz 화면 10.0·10.8·11.0ms)
Run: `rtk proxy npm run check:holograms` → exit 0. ① 11장 평균 ΔE 0.5 미만, ③ 모두 평균 ΔE 2 이하, 내려받는 양 한 줄
Run: `CAPTURE_NAME=2-3a-stops rtk proxy npm run capture:journey`, `CAPTURE_SET=holograms CAPTURE_NAME=2-3a rtk proxy npm run capture:journey` → 두 sheet.png를 Read로 연다. 본문 패널이 홀로그램을 가리지 않는지(3막 뒷줄은 패널 뒤로 가려져도 된다), 2막 썸네일이 감춰졌는지, 테두리가 어두운 화면에 안개를 씌우지 않는지 본다

서버는 `lsof -t -iTCP:3200 -sTCP:LISTEN`으로 찾은 PID만 끈다.

- [ ] **Step 4: 스펙에 완료와 실측을 적는다**

1절 단계 표의 `| 2-3a 제품 화면 홀로그램과 클릭 |`을 `| 2-3a 제품 화면 홀로그램과 클릭 (완료) |`로 바꾸고, 7절 "2-3a 예산" 표 아래에 Step 3의 숫자(주사율, 평균·p95·p99, 드로콜, 프로그램, 텍스처, 내려받는 양)를 한 줄로 적는다.

- [ ] **Step 5: 완료 보고와 커밋 정리를 제출한다**

완료 보고에 Step 1~3의 숫자와 두 캡처를 남기고, 태스크별 파일 표와 메시지 초안을 낸다. 이 태스크의 초안 예:

```
docs: 여정 2-3a 완료와 실측 기록

- 2-3a 완료 조건(결정성, 방향, 원래 색 세 검증, 실패 세 갈래, 상호작용 e2e, 예산)을 최종 구현에서 확인했다
```
