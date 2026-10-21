# 여정(Journey) 2-2b 구현 계획 — 길·차·빛의 궤적·카메라

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 2-2의 회랑·렌더 단계 무대를 "스페이스 드라이브"로 바꾼다. 우주에 뜬 빛의 도로를 차가 스크롤 진행률에 따라 달리고, 차가 지나가며 앞길이 열리고 지나온 길에 막의 색(주황 → 보라 → 파랑)이 쌓인다. 엔딩에서 카메라가 올라 길 전체를 내려다본다. 지형·홀로그램·도시는 넣지 않는다(2-3).

**Architecture:** 진행률 하나의 순수 함수 `driveAt(p)`(`lib/journey/drive.ts`)가 도로 위 차 자리(`carS`), 열린 끝(`revealS`), 엔딩 정도, 주행 속도, 차 자세, 카메라 목표를 낸다. 도로는 해석 곡선(사인 합)의 중심선을 호 길이 표로 `s`(m)에 맞춘 얇은 판이고(`road.ts`), 정점마다 도로 좌표(s, 옆 거리, 반폭, 면)를 싣는다. 도로 재질(`scene/roadMaterial.ts`)은 표준 재질에 `onBeforeCompile`로 열린 끝(discard + 노이즈 경계선), 궤적 색, 발광, 차선을 넣고, 진행에 따라 바뀌는 값은 모두 uniform이다. 색과 발광 식은 `lib/journey/trail.ts` 한 곳에 두고 셰이더는 같은 상수·같은 식을 받는다(`scene/trailShader.ts`, 테스트가 GLSL을 자바스크립트로 옮겨 실행해 맞춰 본다). 차는 Khronos Car Concept(CC BY 4.0)을 `scripts/build-car.ts`가 로고를 빼고 다크 메탈릭 변형 하나로 줄여 `public/journey/car/`에 만들고, 장면이 재질별로 합쳐 드로콜 18개로 그린다. 실패하면 빛 실루엣이 같은 자세로 대신한다. 셰이더 컴파일 실패와 WebGL 컨텍스트 손실은 감지해 장면 상태 "failed"와 콘솔에 남긴다.

**계획을 쓰며 확인한 것(스파이크와 검증):**
- **움직이는 경계(2-2 렌더 단계 셰이더 재사용) 스파이크.** 시제품(three로 이 계획의 모듈을 직접 그린 실험 코드, 버림)과 실제 빌드에서 확인했다.
  - 재컴파일 없음: Warmup과 같은 방식(반정밀도 렌더 타깃을 건 사전 컴파일 + 숨은 3프레임)으로 컴파일하면 진행률 0~1의 아홉 자리를 그려도 셰이더 프로그램이 26개 그대로다. 실제 빌드(`?debug=stats`)도 성능 측정 3회 모두 준비된 순간 26 = 끝까지 굴린 뒤 26이었다.
  - discard 성능: 1440×900, 배율 2, 수직 동기를 끈 Chrome(Apple M4)에서 같은 장면의 프레임 간격이 discard 있음 3.9~8.2ms, 없음 3.9~7.5ms였다(순서를 바꿔 두 번씩, 차이는 잡음 범위). `gl.finish`로 잰 값은 Chrome이 GPU를 기다리지 않아 쓰지 않았다.
  - 앨리어싱·깜빡임: 실제 빌드를 멈춘 채 0.1초 간격 4장, 정류장에서 길이 열리는 동안 4장, 휠로 천천히·빠르게 굴리는 도중 4장씩 찍어 비교했다(`CAPTURE_SET=edge`). 경계 무늬는 도로 좌표에 붙어 움직여도 미끄러지지 않고, 먼 차선은 화소보다 가늘어지면 흐려져 계단 대신 사라진다.
  - 기준선(실제 빌드, 1440×900, 배율 2, 60Hz 화면, 3회 합계): 프레임 평균 16.67ms, p95 17.2, p99 17.6, 최대 17.7, 50ms 초과 0. 가장 무거운 프레임 드로콜 44, 텍스처 GPU 추정 72.1MB. 2-2 회랑 장면의 숫자(100Hz 화면 평균 10.0, p95 10.8)는 주사율이 달라 직접 비교하지 않는다.
  - 빠른 스크롤에서 감쇠 카메라가 주행 시점과 정류장 시점 사이를 곧게 가로질러 차 옆 2~3m까지 붙는 것을 캡처에서 찾았다. 감쇠한 자리를 차 둘레 밖·노면 위로 밀어내는 `keepClear`를 넣었다(Task 3).
- **차 모델.** Car Concept 웹용 압축본(Draco + KTX2, 커밋 `7d4ba18`)을 three r181 GLTFLoader·DRACOLoader·KTX2Loader로 불러 확인했다: +Z가 앞, +X가 왼쪽, 바퀴 바닥이 원점보다 0.16m 아래, 길이 4.36m. 부품 107개를 재질별로 합치면 18 드로콜이다. 유리의 투과 재질은 불투명 물체를 한 번 더 그리는 패스를 만들어 드로콜이 62~68개(예산 60 초과)가 되므로 가벼운 반투명으로 바꿨다(43~49개). 로고 제거·변형 하나·실내 재질 통합으로 재질 29 → 17, 이미지 14 → 9, 3.11MB가 됐다.
- 이 계획의 코드를 HEAD 사본에 모두 넣고 단위 254개(29파일), 타입 검사, eslint(바꾼 파일 오류 0. 전체는 HEAD와 같은 기존 오류 6개), e2e 86개(블로그 14 + 여정 72)가 통과했다. 태스크 1~10을 하나씩 적용한 중간 상태마다 tsc·vitest·eslint가 통과하는 것도 따로 확인했고, Task 1 상태(옛 회랑 장면)에서는 실패 감지 e2e와 기존 준비·재진입 e2e도 통과했다.

**스펙과 다르게 또는 더 구체적으로 정한 점(사용자 검토 대상):**
1. **궤적 색의 가운데를 보라로.** 스펙은 "2막 주황 → 파랑 점진 전환"이다. 주황과 파랑을 바로 섞으면 2막 가운데가 회색으로 탁해져 주황 → 보라 → 파랑으로 바꾼다. 2막 분위기(조명·안개)도 보라 기운이다.
2. **차 유리는 반투명.** 스펙이 허용한 대로 측정 뒤 바꿨다(위 숫자).
3. **빛줄기 시작점.** 테일라이트는 뒤 데크 위에 있어 거기서 빛줄기를 시작하면 위에서 내려다보는 카메라에서 띠가 차 뒷면을 덮는다. 테일라이트 바로 아래, 차 뒷면 끝에서 시작한다. 길이 4m(정속), 폭 6cm.
4. **카메라 밀어내기.** 스펙의 "노면 위 1m 이상, 주행 중 차 뒤"에 더해, 감쇠한 자리를 차 몸통 둘레 4.2m 밖·노면 위 1.2m 이상으로 민다. 아주 빠르게 스크롤하면 정류장 시점으로 도는 동안 카메라가 노면 가까이(1.2m) 지나가는 순간은 남는다(이어진 움직임이다. 움직임 줄이기는 2-4).
5. **입구에서 서 있다가 출발.** 2-1의 입구는 걷는 속도로 시작했다. 스펙 2절 "차가 출발선에 서 있다"에 맞춰 입구 구간을 정지 → 정속 곡선(`depart`)으로 바꾼다.
6. **측정 훅 `?debug=stats`.** 스펙 8절 4항(드로콜·텍스처 추정치 출력)과 e2e(준비 뒤 새 프로그램 없음, 드로콜 60 이하, 늦게 온 차의 자세)를 위해 넣는다. 2-4의 `?debug=perf` 오버레이와 별개다. 텍스처 추정에 후처리 렌더 타깃은 넣지 않는다.
7. **성능 측정 3회는 회마다 페이지를 새로 연다.** Lenis가 스크롤을 이끌어 끝에서 맨 위로 정확히 돌아가지 않는다. 각 회가 "준비 뒤 전체 경로 재생"이다. 배율은 상한 2를 기본으로 잰다.
8. **치수.** 경로 단위 하나 = 도로 5m(차가 0~220m를 달리고 도로는 −12~260m), 2막 폭 10m, 평소 열린 끝은 차 앞 30m(최소 12m, 경계 노이즈 ±1.2m를 빼도 지킨다), 엔딩 내려다보기는 약 255m 높이(카메라 먼 끝 600m).

**2-3·2-4로 넘기는 것:** 헤드라이트 노면 빛 웅덩이와 1막 정류장의 제품 화면 노출 시간(2-3, 캡처를 보고), 드로콜 여유(예산 60 중 16이 남는다. 2-3의 지형·홀로그램·도시가 이 안에 들어야 한다), 빠른 스크롤 때 카메라 전환 다듬기(2-4 움직임 줄이기와 함께).

**실행 뒤 최종 리뷰에서 2-4로 넘긴 것(2026-10-15, 사용자 승인 대상):** 세로 화면 카메라 구도. 휴대폰 세로(390×844)에서 고정 정류장의 차가 반쯤 화면 밖이고 전체 폭 본문 패널 밑에 깔린다. 태블릿 세로(768×1024 등)에서는 오른쪽 연락처 패널이 엔딩 길의 약 1/3을 가린다. 휴대폰 엔딩도 "내려다보기를 마칠 때 연락처 패널이 화면 아래 10% 밖"이라는 가정을 아직 재지 않았다. 휴대폰 패널 배치(3D 경량·2D)와 함께 정류장·엔딩 카메라를 화면 비율에 맞춘다. 그밖의 이월: 텍스처 한 장·Basis 변환기만 실패할 때 실루엣 전환, 실패한 차 로드 캐시 비우기, 감시를 더 일찍 붙이기(환경맵·다운로드 중 손실), 해제한 디코더 떼기, 재진입 e2e의 차 상태 확인, 디코더 Apache-2.0 고지 파일, 빛줄기 길이(2~2.5m) 눈 확인.

**Tech Stack:** Next 16 App Router, React 19, TypeScript, three 0.181.2(GLTFLoader·DRACOLoader·KTX2Loader·BufferGeometryUtils는 `three/examples/jsm`), @react-three/fiber 9.4.0(`frameloop="never"` + `advance`, `useLoader`), @react-three/drei 10.7.7(`Environment`, `Lightformer`, `Points`), @react-three/postprocessing 3.0.4, gsap 3.15.0, lenis 1.3.26, vitest 4, @playwright/test 1.63, sharp 0.34.5

**Spec:** `docs/superpowers/specs/2026-10-14-journey-design.md` (2026-10-15 개정: 1절 2-2b 완료 조건, 3절 시각 언어, 4절 모듈, 5절 로딩·실패 대응, 7절 성능, 8절 테스트). 2단계 계획 중 셋째다: 2-1 골격(완료), 2-2 시각 언어(완료), **2-2b 길·차·궤적·카메라(이 문서)**, 2-3 막별 풍경, 2-4 기기 대응과 마감.

## Global Constraints

- **범위:** 도로(경로·도형·재질), 차(모델·실루엣·불빛), 빛줄기, 카메라, 분위기·별 먼지 조정, 셰이더 실패·컨텍스트 손실 감지, 측정 도구만 만든다. 지형·제품 화면 홀로그램·도시 랜드마크·홀로그램 클릭(2-3), 기기 등급·실행 중 강등·2D·움직임 줄이기·`?debug=perf` 오버레이·컨텍스트 복구(2-4)는 만들지 않는다
- **같은 진행률이면 같은 장면:** 차·열린 끝·발광·색·카메라 목표는 `driveAt(p)`의 순수 함수다. 프레임마다 쌓는 값은 카메라 감쇠(`CameraRig`)와 경계 노이즈 시간뿐이다
- **단일 원천:** 도로 경로·차·열린 끝·카메라 상수는 `lib/journey/drive.ts`, 색·발광·경계선·빛줄기 길이는 `lib/journey/trail.ts`(셰이더는 `scene/trailShader.ts`가 같은 상수를 `#define`으로 받는다), 막별 분위기는 `lib/journey/atmosphere.ts`, 차 파일·불빛 재질 이름·출처는 `lib/journey/carAsset.ts`에만 둔다
- **오류 격리:** three·R3F 코드는 모두 `SceneBoundary` 아래에서 돈다. 3D 층이 실패해도 본문·진행 막대·상세·엔딩은 동작하고 로딩 막대는 사라져야 한다. 차 모델·디코더 실패는 장면 전체가 아니라 차만 빛 실루엣으로 바꾼다
- **외부 3D 파일은 차 모델 하나뿐이다(스펙 1절 비목표의 예외).** `public/journey/car/`와 `public/journey/decoders/`는 `scripts/build-car.ts`로만 만든다(손으로 고치지 않는다). 출처(CC BY 4.0: 저작자·라이선스·수정 사실)를 엔딩에 적는다
- **블로그 7개 글 화면은 바뀌지 않는다.** 블로그 e2e(픽셀·마크업)가 그대로 통과해야 하고, 기준(`e2e/__screenshots__/`)을 갱신하지 않는다
- **의존성을 추가하지 않는다.** three에 들어 있는 로더·유틸·디코더 파일만 쓴다. `postprocessing` 패키지는 간접 의존성이라 직접 import하지 않는다
- **시계 하나:** `/journey`에서 프레임을 도는 것은 GSAP ticker 하나뿐이다. Canvas는 `frameloop="never"`이고 렌더 단계는 `setRenderStep`으로만 건다. 컴포넌트에서 `requestAnimationFrame`을 직접 쓰지 않는다(측정·캡처 스크립트 제외)
- **스크롤 중 React 렌더 금지:** 진행에 따라 바뀌는 값은 `scrollState`와 `useFrame` 안에서만 흐른다. 장면 상태·차 상태는 준비·실패 때 한 번씩만 바뀐다
- **셰이더를 스크롤 중에 다시 컴파일하지 않는다:** 빛 개수, 안개 종류, 재질 정의(define)를 진행에 따라 바꾸지 않는다. 바뀌는 값은 uniform·재질 색·세기로만 넘긴다
- **three·`@react-three/*` import는 `src/components/journey/scene/` 안에서만 한다**(그 폴더의 테스트 포함). `src/lib/journey/`는 three 없는 순수 코드다
- **`/journey`에서 `backdrop-filter`(흐림) 금지:** 바탕은 반투명 단색만 쓴다
- **React Compiler 계열 린트 규칙이 에러로 켜져 있다**(`react-hooks/use-memo`, `refs`, `purity`, `immutability` 등): `useMemo`의 첫 인자는 인라인 함수, effect 안 동기 `setState`·렌더 중 `ref.current` 접근·렌더 중 `Math.random`·`Date.now` 금지, 훅이 돌려준 값의 속성을 직접 바꾸지 말고 함수에 넘겨 바꾼다
- **설명 문장(카피)을 넣지 않는다(사용자 결정, 2026-10-14).** 출처 표기만 예외다
- **명령 실행:** Bash 검증 명령에는 `rtk proxy`를 붙이고 exit code를 믿는다. 파일은 Read 도구로 읽는다(`cat`은 rtk 필터가 주석 줄을 빠뜨린다). `npx tsx`·`npm run x -- 인자`는 rtk가 망가뜨리므로 `rtk proxy npm run <스크립트>`나 `rtk proxy npx tsx`로 실행하고, 인자는 환경 변수로 넘긴다. zsh에서 `$var:path`는 수정자로 해석되므로 `${var}:path`로 쓴다
- **기계 자원(2026-10-14 강제 재부팅 뒤 규칙):** 무거운 명령(Playwright, `next build`, vitest, `tsc`)은 하나씩 차례로 돌리고 백그라운드나 병렬로 돌리지 않는다. 그런 명령 전에 `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`로 다른 프로젝트의 무거운 작업이 없는지 확인하고, 있으면 끝날 때까지 기다린다(15초 간격, 10분 넘으면 BLOCKED). vitest는 늘 `--maxWorkers=4`로 돌린다. 띄운 서버는 `lsof -t -iTCP:<포트> -sTCP:LISTEN`으로 찾은 PID만 끈다(`pkill -f next-server`처럼 넓은 패턴 금지)
- **성능은 실제 Chrome 창에서 잰다.** 헤드리스(SwiftShader)는 색·속도가 다르다. 60fps(16.7ms) 목표와 다른 주사율에서 잰 숫자는 주사율과 함께 따로 적는다. 드로콜·셰이더 프로그램 수는 GPU와 상관없어 헤드리스 e2e로도 확인한다
- **커밋하지 않는다.** 에이전트는 `git add`/`commit`/`stash`/`reset`/`checkout`/`restore`를 실행하지 않는다. 각 태스크 마지막 단계는 파일별 변경 표와 커밋 메시지 초안 제출이다(`type: 한국어 요약` + 이유를 적는 `- ` 불릿, 트레일러 없음). 사용자는 모든 태스크가 끝날 때까지 커밋을 보류할 수 있다
- 기존 스타일을 따른다: 한국어 주석, `function` 선언형 컴포넌트, Tailwind 유틸리티. 단위 테스트는 소스 옆 `*.test.ts`, e2e는 `e2e/*.e2e.ts`. 대소문자만 다른 파일 이름을 같은 폴더에 두지 않는다(macOS 파일 시스템이 같은 파일로 본다. 예: `CarSilhouette.tsx`와 `silhouette.ts`로 나눈 이유)

## Review Focus

1. **빠른 스크롤과 진행 막대 점프.** 휠을 세게 굴리거나 진행 막대로 멀리 뛰면 감쇠 카메라가 목표 사이를 곧게 가로지른다. 사람은 카메라가 차를 뚫거나 노면 아래로 가지 않기를 기대한다 → Task 3 "빠르게 스크롤해 감쇠가 목표 사이를 가로질러도…(화면당 0.1초)", Task 11 `CAPTURE_SET=edge` 빠른 줄
2. **느린 망·막힌 파일에서 차.** 모델(3.2MB)이나 디코더가 늦거나 막히면 장면 전체가 멈추거나 차가 출발선 자세로 나타날 수 있다. 사람은 장면이 이어지고 차가 지금 진행률의 자리에 나타나기를 기대한다 → Task 9 "차 모델을 받지 못하면…", "디코더를 받지 못해도…", Task 10 "차 모델이 늦게 와도…"
3. **다른 페이지에 다녀온 뒤 재진입.** 장면을 내릴 때 R3F가 컨텍스트를 일부러 잃게 해서(`forceContextLoss`) 감시가 남아 있으면 "컨텍스트 손실"로 잡혀 다음 장면이 실패로 굳는다. 차 상태도 남을 수 있다 → Task 1에서 감시를 effect 정리 함수로 해제하고 상태를 비우며, 기존 e2e "다른 페이지에 다녀오면 장면을 다시 준비한다"를 Task 1·9·11에서 다시 돌린다
4. **넓지 않은 화면.** 4:3이나 휴대폰 세로에서 엔딩 내려다보기가 길을 자르거나, 정류장 시점에서 차가 본문 패널 밑에 깔릴 수 있다 → Task 3 "엔딩 내려다보기는 헤더와 연락처 패널을 피해…"(16:9, 16:10, 4:3, 390×844), "정류장에 머무는 동안 차는 본문 패널 반대편 화면 절반에 선다"(16:9, 16:10)
5. **준비 뒤 처음 보는 장면에서 셰이더 컴파일.** 차 재질·빛줄기·실루엣처럼 특정 진행률에서만 그려지는 재질이 있으면 그 자리에서 끊긴다 → Task 10 "준비 뒤 모든 정류장을 지나도 셰이더 프로그램이 새로 생기지 않고 드로콜은 60개 이하다", Task 11 성능 측정의 회별 [준비, 끝] 프로그램 수

---

## 파일 구조

| 파일 | 책임 |
|---|---|
| `src/lib/journey/sceneStatus.ts` | (수정) 장면 상태(실패는 준비됨으로 덮이지 않음)와 차 상태 |
| `src/components/journey/scene/watchRenderer.ts` | 셰이더 컴파일 실패·컨텍스트 손실 감지, `failScene` |
| `src/lib/journey/timeline.ts` | (수정) 입구 출발 곡선, 머무는 정도(`dwellWeight`), 회랑 카메라 함수 퇴역 |
| `src/lib/journey/drive.ts` | 도로 경로(`roadFrame`·`roadPoint`), `driveAt(p)`, 열린 끝, 카메라 목표, `keepClear` (순수) |
| `src/lib/journey/trail.ts` | 궤적 색·발광·경계선·빛줄기 길이·차 불빛 세기 (순수, 셰이더와 상수 공유) |
| `src/lib/journey/road.ts` | 도로 판 도형 데이터(정점·법선·도로 좌표·인덱스) (순수) |
| `src/components/journey/scene/shaderChunks.ts` | 셰이더 공유 조각(노이즈, 주입, 실수 글자) — 2-2 렌더 단계 재질에서 옮김 |
| `src/components/journey/scene/trailShader.ts` | 궤적 색·발광의 GLSL 판과 색 uniform |
| `src/components/journey/scene/roadMaterial.ts` | 빛의 길 재질(열린 끝, 경계선, 발광, 차선) |
| `scripts/build-car.ts`, `public/journey/car/`, `public/journey/decoders/` | 차 모델 준비(받기·검증·로고 제거·변형·재질 정리)와 디코더 복사 |
| `src/lib/journey/carAsset.ts` | 차 파일 주소, 불빛 재질 이름·세기, 빛줄기 자리, 출처 |
| `src/lib/journey/atmosphere.ts`, `space.ts` | (수정) 막별 분위기를 궤적 색 전환에 맞춤, 별 먼지를 길 밖으로 |
| `src/lib/journey/streaks.ts` | 빛줄기 띠 정점 계산 (순수) |
| `src/components/journey/scene/carModel.ts` | 차 부품 재질별 병합, 자세(`placeCar`), 불빛(`applyCarLights`) |
| `src/components/journey/scene/silhouette.ts` | 빛 실루엣 도형과 칠하기 |
| `src/components/journey/scene/driveFrame.ts` | 프레임 안에서 같은 `driveAt` 결과를 같이 쓰는 캐시 |
| `src/components/journey/scene/Road.tsx`, `Car.tsx`, `CarSilhouette.tsx`, `Streaks.tsx` | 도로, 차(모델·오류 경계·자세), 실루엣, 빛줄기 |
| `src/components/journey/scene/CameraRig.tsx`, `Atmosphere.tsx`, `Dust.tsx`, `Effects.tsx`, `Scene.tsx` | (수정) 카메라, 분위기, 먼지, 후처리 주석, 장면 구성 |
| `src/components/journey/scene/frameStats.ts` | `?debug=stats` 장면 통계(드로콜·프로그램·텍스처 추정·차 자리) |
| `src/components/journey/scene/Warmup.tsx` | (수정) 감시 연결, 통계 기록 |
| `src/components/journey/JourneyStage.tsx`, `JourneyContent.tsx` | (수정) 재진입 때 차 상태 초기화, 차 모델 출처 |
| `scripts/perf-journey.ts`, `scripts/capture-journey.ts` | (수정) 3회 재생·p99·장면 통계, 경계선 캡처 묶음 |
| `e2e/journey.e2e.ts` | (수정) 실패 감지, 차 대체·지연, 프로그램·드로콜, 출처, 번들 표지 |
| 삭제 | `lib/journey/corridor.ts`·`stage.ts`, `scene/stageMaterial.ts`·`buildCorridor.ts`·`Corridor.tsx`·`StageTime.tsx`와 그 테스트 |

---

### Task 1: 장면 실패 감지와 상태 규칙

스펙 1절 2-2b 완료 조건의 마지막 줄과 5절 "실패 대응"이다. 셰이더 컴파일 실패와 WebGL 컨텍스트 손실을 감지해 장면 상태를 "failed"로 바꾸고 콘솔에 남긴다(복구는 2-4). 실패를 감지한 뒤에 Warmup의 숨은 프레임이 끝나 "ready"로 덮이는 일이 없도록 상태 규칙을 바꾼다. Task 9가 쓸 차 상태(모델·실루엣)도 여기서 만든다. 아직 옛 회랑 장면 위에서 동작한다.

**Files:**
- Modify: `src/lib/journey/sceneStatus.ts`, `src/lib/journey/sceneStatus.test.ts`
- Create: `src/components/journey/scene/watchRenderer.ts`
- Modify: `src/components/journey/scene/Warmup.tsx`, `src/components/journey/scene/Scene.tsx`(SceneFrame), `src/components/journey/JourneyStage.tsx`, `e2e/journey.e2e.ts`(끝에 덧붙임)

**Interfaces:**
- Produces: `type CarStatus = "loading" | "model" | "silhouette"`, `getCarStatus()`, `getServerCarStatus()`, `setCarStatus(next)` (구독은 `subscribeSceneStatus` 하나), `failScene(reason: string, detail?: unknown): void`, `watchRenderer(gl: WebGLRenderer): () => void`, SceneFrame의 `data-car` 속성, e2e 도우미 `waitReady(page)`

- [ ] **Step 1: 상태 규칙 테스트를 쓴다**

`src/lib/journey/sceneStatus.test.ts` 전체:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getCarStatus,
  getSceneStatus,
  getServerCarStatus,
  getServerSceneStatus,
  setCarStatus,
  setSceneStatus,
  subscribeSceneStatus,
} from "./sceneStatus";

afterEach(() => {
  setSceneStatus("loading");
  setCarStatus("loading");
});

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

  it("실패는 준비됨으로 덮이지 않고, 다시 준비할 때만 풀린다", () => {
    setSceneStatus("failed");
    setSceneStatus("ready");
    expect(getSceneStatus()).toBe("failed");
    setSceneStatus("loading");
    expect(getSceneStatus()).toBe("loading");
    setSceneStatus("ready");
    expect(getSceneStatus()).toBe("ready");
  });

  it("준비된 뒤에도 실패로 바뀐다(컨텍스트 손실)", () => {
    setSceneStatus("ready");
    setSceneStatus("failed");
    expect(getSceneStatus()).toBe("failed");
  });
});

describe("차 상태", () => {
  it("처음과 서버에서는 불러오는 중이고, 바뀌면 구독자에게 알린다", () => {
    expect(getCarStatus()).toBe("loading");
    expect(getServerCarStatus()).toBe("loading");
    const listener = vi.fn();
    const unsubscribe = subscribeSceneStatus(listener);
    setCarStatus("silhouette");
    setCarStatus("silhouette");
    expect(getCarStatus()).toBe("silhouette");
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4 src/lib/journey/sceneStatus.test.ts`
Expected: FAIL — 5 failed. `afterEach`의 `TypeError: setCarStatus is not a function`, 실패 규칙은 `expected 'ready' to be 'failed'`

- [ ] **Step 3: 상태 저장소를 고친다**

`src/lib/journey/sceneStatus.ts` 전체:

```ts
/**
 * 3D 장면의 준비 상태. 장면(Warmup)이 셰이더를 미리 컴파일하고 몇 프레임 그려 본 뒤 "ready"로,
 * 렌더러를 만들지 못하거나 오류 경계가 실패를 잡거나 셰이더 컴파일 실패·WebGL 컨텍스트 손실을 감지하면 "failed"로 바꾼다.
 * 한 번 "failed"가 되면 "ready"로 덮이지 않는다(실패를 감지한 뒤에 준비 프레임이 끝날 수 있다). 다시 준비할 때만 "loading"으로 돌린다.
 * 차 상태는 모델을 그리는지, 빛 실루엣으로 대신하는지를 알린다(스펙 5절 "실패 대응").
 * 로딩 표시와 캔버스 드러내기가 구독한다. 3D 코드를 import하지 않아 지연 로딩 밖의 컴포넌트도 쓸 수 있다.
 */

export type SceneStatus = "loading" | "ready" | "failed";
export type CarStatus = "loading" | "model" | "silhouette";

let status: SceneStatus = "loading";
let car: CarStatus = "loading";
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

export function getSceneStatus(): SceneStatus {
  return status;
}

/** 서버 렌더와 첫 하이드레이션에서는 언제나 준비 중이다 */
export function getServerSceneStatus(): SceneStatus {
  return "loading";
}

export function setSceneStatus(next: SceneStatus): void {
  if (status === next) return;
  if (status === "failed" && next === "ready") return;
  status = next;
  notify();
}

export function getCarStatus(): CarStatus {
  return car;
}

export function getServerCarStatus(): CarStatus {
  return "loading";
}

export function setCarStatus(next: CarStatus): void {
  if (car === next) return;
  car = next;
  notify();
}

export function subscribeSceneStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
```

- [ ] **Step 4: 통과를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4 src/lib/journey/sceneStatus.test.ts`
Expected: PASS — 5 passed

- [ ] **Step 5: 실패 감지 e2e를 파일 끝에 붙인다**

```ts
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
```

- [ ] **Step 6: 지금 코드에서 실패하는지 본다(RED)**

Playwright 전에 Global Constraints의 자원 확인을 하고, `lsof -t -iTCP:3100 -sTCP:LISTEN`이 비어 있는지 본다(설정이 매번 새로 빌드한다).

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts -g "셰이더 컴파일 실패|WebGL 컨텍스트를 잃으면"`
Expected: FAIL — 4 failed. 장면이 `data-state="ready"`로 남는다(감시가 없다)

- [ ] **Step 7: 감시를 만든다**

`src/components/journey/scene/watchRenderer.ts` 전체:

```ts
import type { WebGLRenderer } from "three";
import { setRenderStep } from "@/lib/journey/engine";
import { setSceneStatus } from "@/lib/journey/sceneStatus";

/** 3D 장면을 멈추고 실패로 알린다. 본문·진행 막대·상세는 HTML이라 그대로 동작한다. 복구는 2-4에서 한다 */
export function failScene(reason: string, detail?: unknown): void {
  console.error(`여정 3D 장면을 멈춥니다: ${reason}`, detail ?? "");
  setRenderStep(null);
  setSceneStatus("failed");
}

/**
 * 셰이더 컴파일 실패와 WebGL 컨텍스트 손실을 감지한다(스펙 1절 2-2b 완료 조건, 5절 "실패 대응").
 * three는 onShaderError가 있으면 자기 오류 기록 대신 이것을 부르므로, 여기서 프로그램·셰이더 기록을 콘솔에 남긴다.
 * 해제 함수를 돌려준다. 장면을 내릴 때 R3F가 컨텍스트를 일부러 잃게 하므로(forceContextLoss) 그 전에 해제해야 한다.
 */
export function watchRenderer(gl: WebGLRenderer): () => void {
  gl.debug.onShaderError = (context, program, vertexShader, fragmentShader) => {
    failScene("셰이더 컴파일 실패", {
      program: context.getProgramInfoLog(program),
      vertex: context.getShaderInfoLog(vertexShader),
      fragment: context.getShaderInfoLog(fragmentShader),
    });
  };
  const canvas = gl.domElement;
  const onContextLost = () => failScene("WebGL 컨텍스트 손실");
  canvas.addEventListener("webglcontextlost", onContextLost);
  return () => {
    gl.debug.onShaderError = null;
    canvas.removeEventListener("webglcontextlost", onContextLost);
  };
}
```

- [ ] **Step 8: Warmup에 감시를 건다**

`src/components/journey/scene/Warmup.tsx`에서 찾을 부분:

```tsx
import { setSceneStatus } from "@/lib/journey/sceneStatus";
```

바꿀 내용:

```tsx
import { setSceneStatus } from "@/lib/journey/sceneStatus";
import { watchRenderer } from "./watchRenderer";
```

`src/components/journey/scene/Warmup.tsx`에서 찾을 부분:

```tsx
 * 출력 색 공간이 달라 첫 렌더에서 프로그램을 다시 만든다.
```

바꿀 내용:

```tsx
 * 출력 색 공간이 달라 첫 렌더에서 프로그램을 다시 만든다.
 * 셰이더 컴파일 실패와 WebGL 컨텍스트 손실도 여기서 감시한다(watchRenderer).
```

`src/components/journey/scene/Warmup.tsx`에서 찾을 부분:

```tsx
  const advance = useThree((state) => state.advance);

  useEffect(() => {
```

바꿀 내용:

```tsx
  const advance = useThree((state) => state.advance);

  useEffect(() => watchRenderer(gl), [gl]);

  useEffect(() => {
```

- [ ] **Step 9: 장면 틀에 차 상태를 적고, 재진입 때 차 상태도 지운다**

`src/components/journey/scene/Scene.tsx`에서 찾을 부분:

```tsx
import { getSceneStatus, getServerSceneStatus, setSceneStatus, subscribeSceneStatus } from "@/lib/journey/sceneStatus";
```

바꿀 내용:

```tsx
import {
  getCarStatus,
  getSceneStatus,
  getServerCarStatus,
  getServerSceneStatus,
  setSceneStatus,
  subscribeSceneStatus,
} from "@/lib/journey/sceneStatus";
```

`src/components/journey/scene/Scene.tsx`에서 찾을 부분:

```tsx
 * 장면 상태를 구독하는 바깥 틀. 준비되기 전에는 캔버스를 숨기고, 준비되면 서서히 드러낸다.
```

바꿀 내용:

```tsx
 * 장면 상태를 구독하는 바깥 틀. 준비되기 전에는 캔버스를 숨기고, 준비되면 서서히 드러낸다.
 * 차가 모델인지 빛 실루엣인지는 data-car에 적는다(e2e 표지).
```

`src/components/journey/scene/Scene.tsx`에서 찾을 부분:

```tsx
  const status = useSyncExternalStore(subscribeSceneStatus, getSceneStatus, getServerSceneStatus);
  return (
    <div
      data-journey-scene
      data-state={status}
```

바꿀 내용:

```tsx
  const status = useSyncExternalStore(subscribeSceneStatus, getSceneStatus, getServerSceneStatus);
  const car = useSyncExternalStore(subscribeSceneStatus, getCarStatus, getServerCarStatus);
  return (
    <div
      data-journey-scene
      data-state={status}
      data-car={car}
```

`src/components/journey/JourneyStage.tsx`에서 찾을 부분:

```tsx
import { setSceneStatus } from "@/lib/journey/sceneStatus";
```

바꿀 내용:

```tsx
import { setCarStatus, setSceneStatus } from "@/lib/journey/sceneStatus";
```

`src/components/journey/JourneyStage.tsx`에서 찾을 부분:

```tsx
  // 다른 페이지로 갔다가 돌아오면 장면을 처음부터 다시 준비한다(실패했던 상태도 지운다).
  useEffect(() => () => setSceneStatus("loading"), []);
```

바꿀 내용:

```tsx
  // 다른 페이지로 갔다가 돌아오면 장면을 처음부터 다시 준비한다(실패했던 상태와 차 상태도 지운다).
  useEffect(
    () => () => {
      setSceneStatus("loading");
      setCarStatus("loading");
    },
    [],
  );
```

- [ ] **Step 10: e2e 통과를 확인한다(재진입 회귀 포함)**

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts -g "셰이더 컴파일 실패|WebGL 컨텍스트를 잃으면|다른 페이지에 다녀오면|셰이더를 미리 컴파일하고"`
Expected: PASS — 8 passed (4 × desktop·mobile)

- [ ] **Step 11: 전체 확인**

Run: `rtk proxy npx tsc --noEmit` → exit 0
Run: `rtk proxy npx vitest run --maxWorkers=4` → `Tests  200 passed (200)`
Run: `rtk proxy npx eslint src/lib/journey/sceneStatus.ts src/lib/journey/sceneStatus.test.ts src/components/journey/scene/watchRenderer.ts src/components/journey/scene/Warmup.tsx src/components/journey/scene/Scene.tsx src/components/journey/JourneyStage.tsx e2e/journey.e2e.ts` → exit 0, 출력 없음

- [ ] **Step 12: 커밋 정리를 제출한다**

파일별 변경 표와 메시지 초안. 초안 예:

```
feat: 여정 셰이더 실패·컨텍스트 손실 감지와 차 상태 추가

- 셰이더 컴파일 실패와 WebGL 컨텍스트 손실을 장면 상태와 콘솔에 남긴다(2-2b 완료 조건)
- 실패를 감지한 뒤 준비 프레임이 끝나도 ready로 덮이지 않게 한다
- 장면을 내릴 때 R3F의 forceContextLoss를 손실로 잡지 않도록 감시를 먼저 해제한다
```

---

### Task 2: 진행 거리 — 출발선에서 출발하고, 머무는 정도를 내보낸다

스펙 2절 "입구: 차가 출발선에 서 있다"에 맞춰 입구 구간을 정지에서 정속으로 붙는 곡선(`depart`)으로 바꾸고, 고정 정류장에서 멈춰 머무는 정도(`dwellWeight`)와 정속(`UNITS_PER_SCREEN`)을 내보낸다(Task 3의 카메라와 속도가 쓴다). 회랑 카메라 함수는 장면을 바꾸는 Task 9까지 그대로 둔다.

**Files:**
- Modify: `src/lib/journey/timeline.ts`, `src/lib/journey/timeline.test.ts`

**Interfaces:**
- Produces: `UNITS_PER_SCREEN = 4`(정속: 화면 하나에 경로 4단위), `dwellWeight(progress): number`(고정 구간 0~1, 그 밖 0), `pathParamAt`의 입구 정지 출발

- [ ] **Step 1: 테스트를 더한다**

`src/lib/journey/timeline.test.ts`에서 찾을 부분:

```ts
  TOTAL_LENGTH,
  cameraAt,
```

바꿀 내용:

```ts
  TOTAL_LENGTH,
  UNITS_PER_SCREEN,
  cameraAt,
  dwellWeight,
```

`src/lib/journey/timeline.test.ts`에서 찾을 부분:

```ts
  it("프로젝트 오브젝트는 왼쪽·오른쪽을 번갈아 선다", () => {
```

바꿀 내용:

```ts
  it("입구에서는 출발선에 서 있다가 출발한다", () => {
    const h = 1e-6;
    const cruise = UNITS_PER_SCREEN * SCROLL_LENGTH;
    expect(pathParamAt(0)).toBe(0);
    expect(pathParamAt(h) / h / cruise).toBeLessThan(1e-3);
    const intro = rangeOf("intro");
    expect((pathParamAt(intro.end + h) - pathParamAt(intro.end)) / h / cruise).toBeCloseTo(1, 3);
  });

  it("고정 구간 가운데 절반은 멈춰 있고, 머무는 정도가 그동안 1이다", () => {
    for (const range of STOP_RANGES.filter((item) => item.stop.pin)) {
      const at = (t: number) => range.start + (range.end - range.start) * t;
      expect(pathParamAt(at(0.3)), range.stop.id).toBeCloseTo(pathParamAt(at(0.7)), 10);
      expect(dwellWeight(at(0.5)), range.stop.id).toBe(1);
      expect(dwellWeight(at(0)), range.stop.id).toBe(0);
      expect(dwellWeight(at(0.999999)), range.stop.id).toBeLessThan(1e-6);
    }
  });

  it("고정이 아닌 정류장에서는 머물지 않는다", () => {
    for (const range of STOP_RANGES.filter((item) => !item.stop.pin)) {
      expect(dwellWeight((range.start + range.end) / 2), range.stop.id).toBe(0);
    }
  });

  it("프로젝트 오브젝트는 왼쪽·오른쪽을 번갈아 선다", () => {
```

- [ ] **Step 2: 실패를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4 src/lib/journey/timeline.test.ts`
Expected: FAIL — 3 failed(`dwellWeight is not a function`, 입구 출발 속도가 0이 아니다)

- [ ] **Step 3: 진행 거리를 고친다**

`src/lib/journey/timeline.ts`에서 찾을 부분:

```ts
/** 고정이 아닌 정류장에서 화면 한 높이만큼 스크롤할 때 카메라가 나아가는 거리 */
const UNITS_PER_SCREEN = 4;
```

바꿀 내용:

```ts
/** 고정이 아닌 정류장에서 화면 한 높이만큼 스크롤할 때 나아가는 거리(정속) */
export const UNITS_PER_SCREEN = 4;
```

`src/lib/journey/timeline.ts`에서 찾을 부분:

```ts
/** p(0)=0, p(1)=1, p'(0)=1, p'(1)=0. 걷던 속도 그대로 들어와 멈춘다. */
function arrive(u: number): number {
  const x = clamp01(u);
  return x + x * x - x * x * x;
}
```

바꿀 내용:

```ts
/** p(0)=0, p(1)=1, p'(0)=1, p'(1)=0. 달리던 속도 그대로 들어와 멈춘다. */
function arrive(u: number): number {
  const x = clamp01(u);
  return x + x * x - x * x * x;
}

/** arrive를 뒤집은 출발: p(0)=0, p(1)=1, p'(0)=0, p'(1)=1. 서 있다가 정속까지 붙는다. */
function depart(u: number): number {
  return 1 - arrive(1 - u);
}
```

`src/lib/journey/timeline.ts`에서 찾을 부분:

```ts

/**
 * 고정 구간의 진행: 앞 1/4에 반을 걷고, 가운데 절반은 멈추고, 뒤 1/4에 나머지 반을 걷는다.
 * 걷는 구간은 이웃 정류장과 같은 속도(화면당 UNITS_PER_SCREEN)로 이어져 경계에서 카메라가 멈칫하지 않는다.
 * 다음 정류장이 제자리에 머무는 엔딩이면 멈추며 나간다.
 */
function dwell(t: number, exitsWalking: boolean): number {
  if (t < 0.25) return 0.5 * arrive(t / 0.25);
  if (t > 0.75) {
    const u = (t - 0.75) / 0.25;
    return 0.5 + 0.5 * (exitsWalking ? 1 - arrive(1 - u) : smoothstep(0, 1, u));
  }
  return 0.5;
}
```

바꿀 내용:

```ts

/**
 * 고정 구간의 진행: 앞 1/4에 반을 달리고, 가운데 절반은 멈추고, 뒤 1/4에 나머지 반을 달린다.
 * 달리는 구간은 이웃 정류장과 같은 속도(화면당 UNITS_PER_SCREEN)로 이어져 경계에서 차가 멈칫하지 않는다.
 * 다음 정류장이 제자리에 머무는 엔딩이면 멈추며 나간다.
 */
function dwell(t: number, exitsDriving: boolean): number {
  if (t < 0.25) return 0.5 * arrive(t / 0.25);
  if (t > 0.75) {
    const u = (t - 0.75) / 0.25;
    return 0.5 + 0.5 * (exitsDriving ? depart(u) : smoothstep(0, 1, u));
  }
  return 0.5;
}
```

`src/lib/journey/timeline.ts`에서 찾을 부분:

```ts
  return smoothstep(0, 0.25, t) * (1 - smoothstep(0.75, 1, t));
}
```

바꿀 내용:

```ts
  return smoothstep(0, 0.25, t) * (1 - smoothstep(0.75, 1, t));
}

/** 고정 구간에서 멈춰 머무는 정도(0~1). 양 끝에서 0이라 앞뒤 정류장과 자연스럽게 이어진다. 카메라가 이 값으로 정류장 시점으로 돈다. */
export function dwellWeight(progress: number): number {
  const { range, t } = stopAt(progress);
  if (!range.stop.pin) return 0;
  return smoothstep(0, 0.25, t) * (1 - smoothstep(0.75, 1, t));
}
```

`src/lib/journey/timeline.ts`에서 찾을 부분:

```ts
export function pathParamAt(progress: number): number {
  const { range, t } = stopAt(progress);
  const span = PATH_SPANS[range.index];
  const next = STOPS[range.index + 1];
  const k = range.stop.pin ? dwell(t, next !== undefined && next.kind !== "ending") : t;
  return span.from + (span.to - span.from) * k;
}
```

바꿀 내용:

```ts
/** 진행률의 경로 거리. 입구에서는 출발선에 서 있다가 출발하고(스펙 2절 "차가 출발선에 서 있다"), 고정 구간에서는 멈춘다. */
export function pathParamAt(progress: number): number {
  const { range, t } = stopAt(progress);
  const span = PATH_SPANS[range.index];
  const next = STOPS[range.index + 1];
  let k = t;
  if (range.stop.kind === "intro") k = depart(t);
  else if (range.stop.pin) k = dwell(t, next !== undefined && next.kind !== "ending");
  return span.from + (span.to - span.from) * k;
}
```

- [ ] **Step 4: 통과를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4 src/lib/journey/timeline.test.ts`
Expected: PASS — 19 passed (기존 "정류장 경계에서 카메라 속도도 이어진다"도 그대로 통과한다: `depart'(1) = 1`)

- [ ] **Step 5: 전체 확인**

Run: `rtk proxy npx tsc --noEmit` → exit 0
Run: `rtk proxy npx vitest run --maxWorkers=4` → `Tests  203 passed (203)`
Run: `rtk proxy npx eslint src/lib/journey/timeline.ts src/lib/journey/timeline.test.ts` → exit 0

- [ ] **Step 6: 커밋 정리를 제출한다**

```
feat: 여정 입구 출발 곡선과 정류장 머묾 정도 추가

- 스펙의 "차가 출발선에 서 있다"에 맞춰 입구에서 정지 후 정속으로 출발한다
- 도로 카메라와 주행 속도가 쓸 머무는 정도와 정속 단위를 내보낸다
```

---

### Task 3: 도로 경로와 driveAt

스펙 3절 "진행률 하나"·"카메라"와 8절 1항 `drive.ts` 테스트다. 도로 중심선은 설계 변수 u(대략 −z 거리)의 사인 합이고(출발선 근처는 5차 곡선으로 곧게 시작해 곡률이 끊기지 않는다), 호 길이 표로 s(m)에 맞춘다. 뱅킹은 수평 곡률에 비례한다. 열린 끝은 "차 + 30m"와 "정류장이 연 끝"(정류장 구간 가운데 절반 동안 다음 정류장 자리 + 30m까지 부드럽게 열림)을 부드러운 최댓값으로 고른다. 카메라는 주행 때 차 뒤 7m·위 2.4m에서 차 앞 10m를 보고, 고정 정류장에서 차를 축으로 비스듬한 앞옆까지 돌며(앞에서 돌아보면 화면 좌우가 도로 좌우와 반대라 패널 반대편 쪽 도로로 돈다), 엔딩에서 고정된 내려다보기 자리로 오른다. `keepClear`는 감쇠한 카메라 자리를 차 둘레 밖·노면 위로 민다.

**Files:**
- Create: `src/lib/journey/drive.ts`, `src/lib/journey/drive.test.ts`

**Interfaces:**
- Consumes: Task 2 `UNITS_PER_SCREEN`, `dwellWeight`, `pathParamAt`; timeline의 `PATH_LENGTH`, `SCROLL_LENGTH`, `STOP_RANGES`, `objectSide`, `overviewWeight`, `pathSpan`, `smoothstep`, `stopAt`, `Stop`, `Vec3`; `damp3`(`lib/journey/damp.ts`, 테스트)
- Produces: 상수 `ROAD_SCALE`(5), `CAR_END`(220), `ROAD_START`(−12), `ROAD_END`(260), `REVEAL_LEAD`(30), `REVEAL_MIN_GAP`(12), `ROAD_WIDTHS`([6, 10, 16]), `BANK_LIMIT`, `CHASE`, `STOP_VIEW`, `OVERVIEW`, `CAMERA_DAMPING`({ position: 5, target: 6 }), `CAMERA_CLEARANCE`({ radius: 4.2, height: 1.2 }); 타입 `RoadFrame { position, tangent, right, up, bank, curvature, width }`, `CameraPose { position, target }`, `DriveState { progress, carS, revealS, ending, speed, car: RoadFrame, camera: CameraPose }`; 함수 `roadWidth(s)`, `roadFrame(s)`, `roadPoint(s, lateral?, height?)`, `carSAt(p)`, `speedAt(p)`(정속 = 1), `revealSAt(p)`, `stopScreenSide(stop)`, `carCenter(car)`, `keepClear(out, car)`, `driveAt(p)`

- [ ] **Step 1: 테스트를 쓴다**

`src/lib/journey/drive.test.ts` 전체:

```ts
import { describe, expect, it } from "vitest";
import { damp3 } from "./damp";
import {
  BANK_LIMIT,
  CAMERA_CLEARANCE,
  CAMERA_DAMPING,
  CAR_END,
  REVEAL_LEAD,
  REVEAL_MIN_GAP,
  ROAD_END,
  ROAD_START,
  ROAD_WIDTHS,
  carCenter,
  carSAt,
  driveAt,
  keepClear,
  revealSAt,
  roadFrame,
  roadPoint,
  speedAt,
  stopScreenSide,
  type CameraPose,
} from "./drive";
import { CAMERA_FOV, STOP_RANGES, overviewWeight, rangeOf, type Vec3 } from "./timeline";

const STEPS = 4000;
const progresses = Array.from({ length: STEPS + 1 }, (_, index) => index / STEPS);

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(...sub(a, b));
}

function at(id: string, t: number): number {
  const range = rangeOf(id);
  return range.start + (range.end - range.start) * t;
}

describe("도로", () => {
  it("s는 중심선을 따라 누적한 거리다", () => {
    for (let s = ROAD_START; s < ROAD_END - 5; s += 3.7) {
      let length = 0;
      for (let step = 0; step < 100; step++) {
        length += distance(roadFrame(s + step * 0.05).position, roadFrame(s + (step + 1) * 0.05).position);
      }
      expect(length, `s=${s}`).toBeCloseTo(5, 2);
    }
    for (const value of roadFrame(0).position) expect(value).toBeCloseTo(0, 9);
  });

  it("위치·접선·곡률·뱅킹이 끊기지 않는다", () => {
    const h = 0.05;
    for (let s = ROAD_START; s < ROAD_END - h; s += h) {
      const a = roadFrame(s);
      const b = roadFrame(s + h);
      expect(distance(a.position, b.position), `s=${s}`).toBeLessThan(h * 1.01);
      expect(distance(a.tangent, b.tangent), `s=${s}`).toBeLessThan(h * 0.1);
      expect(Math.abs(a.curvature - b.curvature), `s=${s}`).toBeLessThan(h * 0.01);
      expect(Math.abs(a.bank - b.bank), `s=${s}`).toBeLessThan(h * 0.05);
    }
  });

  it("좌우 가장자리도 같은 s로 앞으로만 나아가고 접히지 않는다", () => {
    for (let s = ROAD_START; s < ROAD_END; s += 0.5) {
      const frame = roadFrame(s);
      for (const side of [-1, 1]) {
        const here = roadPoint(s, (side * frame.width) / 2);
        const next = roadPoint(s + 0.5, (side * roadFrame(s + 0.5).width) / 2);
        expect(dot(sub(next, here), frame.tangent), `s=${s} side=${side}`).toBeGreaterThan(0.25);
      }
      expect(Math.abs(frame.curvature) * (frame.width / 2), `s=${s}`).toBeLessThan(0.5);
    }
  });

  it("굽는 안쪽으로 기울고 기울기는 한도 안이다", () => {
    for (let s = ROAD_START; s < ROAD_END; s += 0.5) {
      const frame = roadFrame(s);
      expect(Math.abs(frame.bank)).toBeLessThanOrEqual(BANK_LIMIT);
      expect(frame.bank * frame.curvature, `s=${s}`).toBeLessThanOrEqual(0);
      expect(dot(frame.right, frame.up)).toBeCloseTo(0, 9);
      expect(dot(frame.right, frame.tangent)).toBeCloseTo(0, 9);
    }
  });

  it("폭은 1막 6m, 2막 10m, 3막 16m다", () => {
    expect(roadFrame(carSAt(at("kokoa-clone", 0.5))).width).toBe(ROAD_WIDTHS[0]);
    expect(roadFrame(carSAt(at("tix2u", 0.5))).width).toBeCloseTo(ROAD_WIDTHS[1], 9);
    expect(roadFrame(carSAt(at("pickcare", 0.5))).width).toBeCloseTo(ROAD_WIDTHS[2], 9);
  });
});

describe("driveAt", () => {
  it("같은 진행률이면 같은 결과다(사이에 다른 진행률을 계산해도)", () => {
    const first = driveAt(0.41);
    driveAt(0.9);
    driveAt(0.05);
    expect(driveAt(0.41)).toEqual(first);
  });

  it("차는 뒤로 가지 않고 출발선에서 마지막 자리까지 간다", () => {
    let previous = -Infinity;
    for (const p of progresses) {
      const { carS } = driveAt(p);
      expect(carS).toBeGreaterThanOrEqual(previous - 1e-9);
      previous = carS;
    }
    expect(carSAt(0)).toBe(0);
    expect(carSAt(1)).toBeCloseTo(CAR_END, 9);
  });

  it("열린 끝은 물러나지 않고 차와 최소 간격 이상 떨어져 있다", () => {
    let previous = -Infinity;
    for (const p of progresses) {
      const { carS, revealS } = driveAt(p);
      expect(revealS, `p=${p}`).toBeGreaterThanOrEqual(previous - 1e-9);
      expect(revealS - carS, `p=${p}`).toBeGreaterThanOrEqual(REVEAL_MIN_GAP);
      expect(revealS).toBeLessThanOrEqual(ROAD_END);
      previous = revealS;
    }
  });

  it("평소에는 차 앞 REVEAL_LEAD까지 열려 있다", () => {
    expect(revealSAt(0)).toBeGreaterThanOrEqual(REVEAL_LEAD);
    expect(revealSAt(0)).toBeLessThan(REVEAL_LEAD + 5);
  });

  it("고정 정류장에 머무는 동안 다음 정류장까지 길이 열린다", () => {
    const pairs = [
      ["stock2u", "tix2u"],
      ["tix2u", "pfplay"],
      ["pfplay", "pickcare"],
    ];
    for (const [stop, next] of pairs) {
      const before = revealSAt(at(stop, 0.25));
      const after = revealSAt(at(stop, 0.75));
      const nextCar = carSAt(at(next, 0.5));
      expect(after - before, stop).toBeGreaterThan(10);
      expect(after, stop).toBeGreaterThanOrEqual(nextCar + REVEAL_LEAD - 1e-6);
      // 머무는 동안 차는 서 있다
      expect(carSAt(at(stop, 0.75))).toBeCloseTo(carSAt(at(stop, 0.25)), 9);
    }
  });

  it("1막 정류장을 지나며 다음 정류장까지 길이 열린다", () => {
    for (const [stop, next] of [
      ["kokoa-clone", "todo-app"],
      ["todo-app", "eutcha"],
      ["eutcha", "stock2u"],
    ]) {
      expect(revealSAt(at(stop, 0.75)), stop).toBeGreaterThanOrEqual(carSAt(at(next, 0.5)) + REVEAL_LEAD - 1e-6);
    }
  });

  it("PiCKCARE를 지나면 도로 끝까지 열리고, 엔딩 끝에서 길 전체가 켜진다", () => {
    expect(revealSAt(at("pickcare", 0.75))).toBeCloseTo(ROAD_END, 6);
    const end = driveAt(1);
    expect(end.revealS).toBeCloseTo(ROAD_END, 6);
    expect(end.ending).toBe(1);
    expect(driveAt(at("pickcare", 0.5)).ending).toBe(0);
  });

  it("차 자세는 정류장 경계에서 끊기지 않는다", () => {
    const h = 1e-7;
    for (const range of STOP_RANGES.slice(1)) {
      const before = driveAt(range.start - h).car;
      const after = driveAt(range.start + h).car;
      expect(distance(before.position, after.position), range.stop.id).toBeLessThan(1e-3);
      expect(distance(before.tangent, after.tangent), range.stop.id).toBeLessThan(1e-4);
      expect(Math.abs(before.bank - after.bank), range.stop.id).toBeLessThan(1e-4);
    }
  });

  it("주행 속도는 출발선과 정류장 한가운데와 엔딩에서 0, 1막에서 정속(1)이다", () => {
    expect(speedAt(0)).toBeLessThan(0.01);
    expect(speedAt(at("kokoa-clone", 0.5))).toBeCloseTo(1, 6);
    for (const id of ["stock2u", "tix2u", "pfplay", "pickcare"]) expect(speedAt(at(id, 0.5)), id).toBe(0);
    expect(speedAt(at("ending", 0.5))).toBe(0);
  });

  it("주행 속도는 정류장 경계에서 이어진다", () => {
    for (const range of STOP_RANGES.slice(1)) {
      expect(Math.abs(speedAt(range.start - 1e-4) - speedAt(range.start + 1e-4)), range.stop.id).toBeLessThan(0.01);
    }
  });
});

describe("카메라", () => {
  it("정류장·엔딩 경계에서 목표 자세가 튀지 않는다", () => {
    const h = 1e-7;
    for (const range of STOP_RANGES.slice(1)) {
      const before = driveAt(range.start - h).camera;
      const after = driveAt(range.start + h).camera;
      expect(distance(before.position, after.position), range.stop.id).toBeLessThan(1e-3);
      expect(distance(before.target, after.target), range.stop.id).toBeLessThan(1e-3);
    }
  });

  it("목표 자세가 진행률에 따라 연속으로 움직인다(한 걸음에 크게 뛰지 않는다)", () => {
    for (let index = 1; index < progresses.length; index++) {
      const a = driveAt(progresses[index - 1]);
      const b = driveAt(progresses[index]);
      // 진행률 1/4000 한 걸음. 엔딩에서는 높이 오르므로 더 크게 움직인다.
      const limit = b.ending > 0 ? 6 : 1;
      expect(distance(a.camera.position, b.camera.position), `p=${progresses[index]}`).toBeLessThan(limit);
      expect(distance(a.camera.target, b.camera.target), `p=${progresses[index]}`).toBeLessThan(limit);
    }
  });

  it("주행 중에는 차 뒤·위에서 차 앞을 본다", () => {
    for (const p of progresses) {
      const state = driveAt(p);
      if (state.ending > 0 || STOP_RANGES.some((range) => range.stop.pin && p > range.start && p < range.end)) continue;
      const offset = sub(state.camera.position, state.car.position);
      expect(dot(offset, state.car.tangent), `p=${p}`).toBeLessThan(-5);
      expect(dot(offset, state.car.up), `p=${p}`).toBeGreaterThan(1);
      expect(dot(sub(state.camera.target, state.car.position), state.car.tangent), `p=${p}`).toBeGreaterThan(5);
    }
  });

  it("엔딩 전까지 카메라는 노면보다 1m 이상 위에 있다", () => {
    for (const p of progresses) {
      const state = driveAt(p);
      if (state.ending > 0) continue;
      expect(dot(sub(state.camera.position, state.car.position), state.car.up), `p=${p}`).toBeGreaterThan(1);
    }
  });

  it("감쇠로 따라가도 노면 아래로 파고들거나 차에 닿지 않는다(60Hz, 화면당 0.8초 스크롤)", () => {
    const dt = 1 / 60;
    const perFrame = 1 / (17.5 * 0.8 * 60);
    const start = driveAt(0).camera;
    const position = { x: start.position[0], y: start.position[1], z: start.position[2] };
    for (let p = 0; p <= 1; p += perFrame) {
      const state = driveAt(p);
      damp3(position, state.camera.position, CAMERA_DAMPING.position, dt);
      if (state.ending > 0) continue;
      const camera: Vec3 = [position.x, position.y, position.z];
      const offset = sub(camera, state.car.position);
      expect(dot(offset, state.car.up), `p=${p}`).toBeGreaterThan(1);
      expect(distance(camera, state.car.position), `p=${p}`).toBeGreaterThan(4);
    }
  });

  it("빠르게 스크롤해 감쇠가 목표 사이를 가로질러도 차 둘레와 노면 아래로 들어가지 않는다(화면당 0.1초)", () => {
    const dt = 1 / 120;
    const perFrame = 1 / (17.5 * 0.1 * 120);
    const start = driveAt(0).camera;
    const position = { x: start.position[0], y: start.position[1], z: start.position[2] };
    let pushed = 0;
    for (let p = 0; p <= 1; p += perFrame) {
      const state = driveAt(p);
      damp3(position, state.camera.position, CAMERA_DAMPING.position, dt);
      const before = [position.x, position.y, position.z];
      keepClear(position, state.car);
      if (before.some((value, axis) => value !== [position.x, position.y, position.z][axis])) pushed += 1;
      if (state.ending > 0) continue;
      const camera: Vec3 = [position.x, position.y, position.z];
      expect(distance(camera, carCenter(state.car)), `p=${p}`).toBeGreaterThanOrEqual(CAMERA_CLEARANCE.radius - 1e-9);
      expect(dot(sub(camera, state.car.position), state.car.up), `p=${p}`).toBeGreaterThanOrEqual(CAMERA_CLEARANCE.height - 1e-9);
    }
    // 빠른 스크롤에서는 실제로 밀어낸다(이 테스트가 규칙을 거친다)
    expect(pushed).toBeGreaterThan(0);
  });

  it("목표 자세는 이미 차 둘레 밖이라 밀어내기가 움직이지 않는다", () => {
    for (const p of progresses) {
      const state = driveAt(p);
      const position = { x: state.camera.position[0], y: state.camera.position[1], z: state.camera.position[2] };
      keepClear(position, state.car);
      expect([position.x, position.y, position.z], `p=${p}`).toEqual(state.camera.position);
    }
  });

  // 정류장 패널: 넓은 화면에서 왼쪽(mr-auto) 또는 오른쪽(ml-auto)에 화면 폭의 약 1/3을 차지한다(JourneyContent).
  it("정류장에 머무는 동안 차는 본문 패널 반대편 화면 절반에 선다", () => {
    for (const range of STOP_RANGES.filter((item) => item.stop.pin)) {
      const state = driveAt((range.start + range.end) / 2);
      const side = stopScreenSide(range.stop);
      for (const aspect of [16 / 9, 16 / 10]) {
        for (const point of [
          state.car.position,
          roadPoint(state.carS + 2.3, 0, 0.7),
          roadPoint(state.carS - 2.3, 0, 0.7),
          roadPoint(state.carS, 0, 1.4),
        ]) {
          const [x, y] = screenPosition(state.camera, point, aspect);
          const label = `${range.stop.id} ${aspect.toFixed(2)} → (${x.toFixed(3)}, ${y.toFixed(3)})`;
          if (side === 1) expect(x, label).toBeGreaterThan(0.42);
          else expect(x, label).toBeLessThan(0.58);
          expect(x, label).toBeGreaterThan(0.05);
          expect(x, label).toBeLessThan(0.95);
          expect(y, label).toBeGreaterThan(0.2);
          expect(y, label).toBeLessThan(0.9);
        }
      }
    }
  });

  // 내려다보는 장면은 화면 위의 헤더와 아래의 연락처 패널을 피해야 한다(화면 좌표 0~1, 왼쪽·위가 0).
  // 넓은 화면(sm 이상)은 연락처 패널이 오른쪽에 좁게 있어 길을 그 왼쪽에 둔다. 휴대폰 세로는 패널이
  // 전체 폭이라, 내려다보기가 끝나는 순간(엔딩 구간 OVERVIEW_ARRIVAL) 패널이 아직 화면 아래 10% 밖에 있다.
  it("엔딩 내려다보기는 헤더와 연락처 패널을 피해 길 전체를 보인다", () => {
    const pose = driveAt(1).camera;
    expect(overviewWeight(1)).toBe(1);
    const points: Vec3[] = [roadPoint(CAR_END, 0, 1.5)];
    for (let s = ROAD_START; s <= ROAD_END; s += 2) {
      const half = roadFrame(s).width / 2;
      points.push(roadPoint(s, -half), roadPoint(s, half));
    }
    const areas = [
      { name: "16:9", aspect: 16 / 9, left: 0.03, right: 0.62, top: 0.09, bottom: 0.94 },
      { name: "16:10", aspect: 16 / 10, left: 0.03, right: 0.62, top: 0.09, bottom: 0.94 },
      { name: "4:3", aspect: 4 / 3, left: 0.03, right: 0.55, top: 0.09, bottom: 0.94 },
      { name: "390×844", aspect: 390 / 844, left: 0.03, right: 0.97, top: 0.09, bottom: 0.9 },
    ];
    for (const area of areas) {
      for (const point of points) {
        const [x, y] = screenPosition(pose, point, area.aspect);
        const label = `${area.name} ${point.map((value) => value.toFixed(1))} → (${x.toFixed(3)}, ${y.toFixed(3)})`;
        expect(x, label).toBeGreaterThan(area.left);
        expect(x, label).toBeLessThan(area.right);
        expect(y, label).toBeGreaterThan(area.top);
        expect(y, label).toBeLessThan(area.bottom);
      }
    }
  });
});

/** 점이 맺히는 화면 좌표(0~1, 왼쪽·위가 0) */
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
  return [
    0.5 + dot(offset, right) / depth / (tanVertical * aspect) / 2,
    0.5 - dot(offset, up) / depth / tanVertical / 2,
  ];
}
```

- [ ] **Step 2: 실패를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4 src/lib/journey/drive.test.ts`
Expected: FAIL — `Error: Cannot find module './drive'`

- [ ] **Step 3: 구현한다**

`src/lib/journey/drive.ts` 전체:

```ts
import {
  PATH_LENGTH,
  SCROLL_LENGTH,
  STOP_RANGES,
  UNITS_PER_SCREEN,
  dwellWeight,
  objectSide,
  overviewWeight,
  pathParamAt,
  pathSpan,
  smoothstep,
  stopAt,
  type Stop,
  type Vec3,
} from "./timeline";

/**
 * 우주 도로와 driveAt(p)(스펙 3절 "진행률 하나"). 스크롤 진행률 하나에서 차의 자리, 열린 길의 끝, 카메라 목표를 계산한다.
 * 프레임마다 쌓는 값이 없어 같은 p면 같은 결과다. three를 import하지 않는 순수 코드다.
 *
 * 도로는 −z 쪽으로 뻗고, x로 굽이치며 y로 오르내린다. s는 도로 중심선을 따라 누적한 거리(m)이고,
 * 좌우 가장자리도 같은 s를 쓴다. 중심선은 매끄러운 해석 곡선이라 위치·접선·곡률·뱅킹이 모두 이어진다.
 */

/** 경로 단위(timeline.ts) 하나가 도로에서 차지하는 거리(m) */
export const ROAD_SCALE = 5;
/** 차가 마지막으로 서는 자리(m). PiCKCARE를 지나 엔딩에서 멈춘다 */
export const CAR_END = PATH_LENGTH * ROAD_SCALE;
/** 도로 시작. 출발선(s = 0) 뒤로 카메라가 설 자리를 둔다 */
export const ROAD_START = -12;
/** 도로 끝. 차가 멈춘 자리 너머로 열린 길이 더 이어진다 */
export const ROAD_END = CAR_END + 40;
/** 평소 열린 끝이 차 앞으로 앞서는 거리(m) */
export const REVEAL_LEAD = 30;
/** 열린 끝과 차 사이의 최소 간격(m). 차 길이(약 4.6m)의 2.5배 */
export const REVEAL_MIN_GAP = 12;
/** 차를 따라 열리는 끝과 정류장이 연 끝을 부드럽게 잇는 폭(m) */
const REVEAL_BLEND = 8;

/** 도로 폭(m): 1막 6m에서 2막에 넓어져 3막 16m */
export const ROAD_WIDTHS = [6, 10, 16] as const;
/** 길이 넓어지는 구간이 막 진입 정류장을 지나 이만큼(m) 더 이어진다 */
const WIDEN_TAIL = 20;
/** 뱅킹: 수평 곡률에 곱하는 값과 최대 기울기(라디안) */
const BANK_GAIN = 5;
export const BANK_LIMIT = 0.25;

export interface RoadFrame {
  /** 중심선 위 노면 자리 */
  position: Vec3;
  /** 나아가는 방향(단위 벡터) */
  tangent: Vec3;
  /** 뱅킹이 반영된 오른쪽(단위 벡터) */
  right: Vec3;
  /** 뱅킹이 반영된 노면 위쪽(단위 벡터) */
  up: Vec3;
  /** 뱅킹 각(라디안). 오른쪽으로 굽으면 오른쪽이 낮다(음수) */
  bank: number;
  /** 수평 곡률(1/m). 오른쪽으로 굽으면 양수 */
  curvature: number;
  width: number;
}

export interface CameraPose {
  position: Vec3;
  target: Vec3;
}

export interface DriveState {
  progress: number;
  /** 차가 선 자리(도로 s, m) */
  carS: number;
  /** 열린 길의 끝(도로 s, m) */
  revealS: number;
  /** 엔딩에서 길 전체가 켜지는 정도(0~1) */
  ending: number;
  /** 주행 속도(정속 = 1). 정류장에서 0 */
  speed: number;
  car: RoadFrame;
  camera: CameraPose;
}

// ── 벡터 ─────────────────────────────────────────────────

function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function scale(a: Vec3, k: number): Vec3 {
  return [a[0] * k, a[1] * k, a[2] * k];
}

function normalize(a: Vec3): Vec3 {
  return scale(a, 1 / Math.hypot(a[0], a[1], a[2]));
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function lerp(a: number, b: number, t: number): number {
  return a * (1 - t) + b * t;
}

function lerp3(a: Vec3, b: Vec3, t: number): Vec3 {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

// ── 중심선 ───────────────────────────────────────────────
// 설계 변수 u(대략 −z 거리)로 중심선을 정의하고, 호 길이 표로 s ↔ u를 바꾼다.

/** 0에서 1로 오르는 5차 곡선. 양 끝에서 1·2차 도함수가 0이라 곱해도 곡률이 끊기지 않는다 */
function smootherstep(edge0: number, edge1: number, value: number): number {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * t * (t * (6 * t - 15) + 10);
}

/** 출발선 근처는 곧게 뻗고 앞으로 갈수록 크게 굽이친다 */
function centerX(u: number): number {
  return smootherstep(0, 60, u) * (22 * Math.sin(u / 34 - 0.6) + 5 * Math.sin(u / 13 + 1.1) + 13);
}

/** 완만하게 오르내리며 조금씩 높아진다(3막 도시로 오른다) */
function centerY(u: number): number {
  return smootherstep(0, 60, u) * (2.5 * Math.sin(u / 23 - 1.4) + 2.4) + 0.035 * smootherstep(0, 120, u) * u;
}

const H = 0.01;

function derivative(f: (u: number) => number, u: number): number {
  return (f(u + H) - f(u - H)) / (2 * H);
}

function secondDerivative(f: (u: number) => number, u: number): number {
  return (f(u + H) - 2 * f(u) + f(u - H)) / (H * H);
}

const TABLE_STEP = 0.1;
const TABLE_U0 = ROAD_START - 4;
/** u → s 누적 호 길이 표(사다리꼴 적분). s(0) = 0이 되게 맞춘다 */
const ARC: Float64Array = (() => {
  const count = Math.ceil((ROAD_END + 20 - TABLE_U0) / TABLE_STEP) + 1;
  const table = new Float64Array(count);
  const speed = (u: number) => Math.hypot(derivative(centerX, u), derivative(centerY, u), 1);
  for (let i = 1; i < count; i++) {
    const u = TABLE_U0 + i * TABLE_STEP;
    table[i] = table[i - 1] + ((speed(u - TABLE_STEP) + speed(u)) / 2) * TABLE_STEP;
  }
  const zero = table[Math.round(-TABLE_U0 / TABLE_STEP)];
  for (let i = 0; i < count; i++) table[i] -= zero;
  return table;
})();

/** 도로 거리 s의 설계 변수 u. 표에서 이분 탐색한 뒤 칸 안을 선형으로 잇는다 */
function paramOf(s: number): number {
  let low = 0;
  let high = ARC.length - 1;
  if (s <= ARC[low]) return TABLE_U0;
  if (s >= ARC[high]) return TABLE_U0 + high * TABLE_STEP;
  while (high - low > 1) {
    const middle = (low + high) >> 1;
    if (ARC[middle] <= s) low = middle;
    else high = middle;
  }
  const t = (s - ARC[low]) / (ARC[high] - ARC[low]);
  return TABLE_U0 + (low + t) * TABLE_STEP;
}

/** 거리 s의 도로 폭(m). 2막·3막 진입 정류장에서 넓어지기 시작한다 */
export function roadWidth(s: number): number {
  const act2 = pathSpan("act-2");
  const act3 = pathSpan("act-3");
  const [first, second, third] = ROAD_WIDTHS;
  return (
    first +
    (second - first) * smoothstep(act2.from * ROAD_SCALE, act2.to * ROAD_SCALE + WIDEN_TAIL, s) +
    (third - second) * smoothstep(act3.from * ROAD_SCALE, act3.to * ROAD_SCALE + WIDEN_TAIL, s)
  );
}

/** 거리 s의 도로 자세. 접선은 해석 곡선의 도함수, 뱅킹은 수평 곡률에 비례한다 */
export function roadFrame(s: number): RoadFrame {
  const u = paramOf(s);
  const dx = derivative(centerX, u);
  const dy = derivative(centerY, u);
  const tangent = normalize([dx, dy, -1]);
  const curvature = secondDerivative(centerX, u) / Math.pow(1 + dx * dx, 1.5);
  const bank = Math.max(-BANK_LIMIT, Math.min(BANK_LIMIT, -BANK_GAIN * curvature));
  const flatRight = normalize([-tangent[2], 0, tangent[0]]);
  const flatUp = cross(flatRight, tangent);
  const cos = Math.cos(bank);
  const sin = Math.sin(bank);
  return {
    position: [centerX(u), centerY(u), -u],
    tangent,
    right: add(scale(flatRight, cos), scale(flatUp, sin)),
    up: add(scale(flatUp, cos), scale(flatRight, -sin)),
    bank,
    curvature,
    width: roadWidth(s),
  };
}

/** 도로 위 한 점: 중심선에서 옆으로 lateral(m, 오른쪽 +), 노면에서 height(m) */
export function roadPoint(s: number, lateral = 0, height = 0): Vec3 {
  const frame = roadFrame(s);
  return add(add(frame.position, scale(frame.right, lateral)), scale(frame.up, height));
}

// ── 차와 열린 길 ──────────────────────────────────────────

/** 진행률의 차 자리(도로 s, m) */
export function carSAt(progress: number): number {
  return pathParamAt(progress) * ROAD_SCALE;
}

const SPEED_STEP = 1e-4;

/** 진행률의 주행 속도(정속 = 1). 스크롤 속도가 아니라 진행률에서 정해지는 속도 곡선이다 */
export function speedAt(progress: number): number {
  const a = Math.max(0, progress - SPEED_STEP);
  const b = Math.min(1, progress + SPEED_STEP);
  const unitsPerScreen = ((pathParamAt(b) - pathParamAt(a)) / (b - a)) / SCROLL_LENGTH;
  return unitsPerScreen / UNITS_PER_SCREEN;
}

/** 길을 여는 정류장(프로젝트와 PiCKCARE). 지나는 동안 다음 정류장까지 길이 열린다 */
const OPENERS = STOP_RANGES.filter((range) => range.stop.kind === "project" || range.stop.kind === "hall");

/** 정류장 한가운데의 차 자리(m). 고정 구간이면 차가 멈춰 머무는 자리다 */
function anchorS(range: (typeof OPENERS)[number]): number {
  return carSAt((range.start + range.end) / 2);
}

/** 정류장 k를 지나면 열리는 끝: 다음 정류장 자리 + 앞서는 거리. 마지막은 도로 끝 */
const OPEN_TARGETS = OPENERS.map((_, index) =>
  index + 1 < OPENERS.length ? anchorS(OPENERS[index + 1]) + REVEAL_LEAD : ROAD_END,
);

/** 정류장이 연 끝(m). 정류장 구간 가운데 절반 동안 다음 정류장까지 부드럽게 열린다. 줄어들지 않는다 */
function openedS(progress: number): number {
  let opened = REVEAL_LEAD;
  OPENERS.forEach((range, index) => {
    const from = range.start + (range.end - range.start) * 0.25;
    const to = range.start + (range.end - range.start) * 0.75;
    const previous = index === 0 ? REVEAL_LEAD : OPEN_TARGETS[index - 1];
    opened += (OPEN_TARGETS[index] - previous) * smoothstep(from, to, progress);
  });
  return opened;
}

/** 두 값 중 큰 쪽을 부드럽게 고른다. 결과는 언제나 max(a, b) 이상이고 두 값에 대해 늘기만 한다 */
function softMax(a: number, b: number, width: number): number {
  return 0.5 * (a + b + Math.sqrt((a - b) * (a - b) + width * width));
}

/** 진행률의 열린 끝(m). 차를 따라 열리는 끝과 정류장이 연 끝 중 앞선 쪽이다 */
export function revealSAt(progress: number): number {
  return Math.min(ROAD_END, softMax(carSAt(progress) + REVEAL_LEAD, openedS(progress), REVEAL_BLEND));
}

// ── 카메라 ───────────────────────────────────────────────

/** 주행: 차 뒤·위에서 차 앞 도로를 본다 */
export const CHASE = { back: 7, height: 2.4, ahead: 10, aheadHeight: 0.8 } as const;
/** 카메라가 목표 자세를 따라가는 감쇠 세기(scene/CameraRig). 프레임 간격으로 계산해 60Hz·120Hz에서 같은 속도다 */
export const CAMERA_DAMPING = { position: 5, target: 6 } as const;
/**
 * 감쇠로 따라가는 카메라가 차 둘레(반지름 radius, m)와 노면에서 height(m) 아래로 들어가지 않게 하는 한계.
 * 빠르게 스크롤하면 감쇠가 주행 시점과 정류장 시점 사이를 곧게 가로질러 차에 붙을 수 있다.
 */
export const CAMERA_CLEARANCE = { radius: 4.2, height: 1.2 } as const;
/** 차 몸통의 가운데(차 자리 기준: 앞 0.24m, 위 0.7m). 모델은 앞이 더 길다(뒤 1.94, 앞 2.42) */
const CAR_BODY_CENTER = { forward: 0.24, up: 0.7 } as const;

/** 정류장: 차의 비스듬한 앞옆으로 돈다. angle은 차 뒤(0)에서 앞(π)으로 도는 각 */
export const STOP_VIEW = { angle: 2.35, radius: 9, height: 2.6, targetHeight: 0.5, targetShift: 3.2 } as const;

/** 정류장에서 차와 제품 화면이 서는 화면 쪽(−1 왼쪽, 1 오른쪽). 본문 패널은 반대편이다. PiCKCARE는 저장소 패널이 오른쪽이라 왼쪽이다 */
export function stopScreenSide(stop: Stop): -1 | 1 {
  return stop.kind === "hall" ? -1 : objectSide(stop);
}

/**
 * 엔딩 내려다보기 자리. 출발선 뒤 높은 곳에서 길 전체를 본다. 길 전체가 헤더 아래에 들고,
 * 넓은 화면에서는 오른쪽 연락처 패널의 왼쪽에 놓인다(drive.test.ts가 화면 비율 넷으로 확인).
 */
export const OVERVIEW: CameraPose = { position: [45, 255, 50], target: [35, 0, -92] };

function orbit(car: RoadFrame, angle: number, radius: number, height: number, side: number): Vec3 {
  const back = scale(car.tangent, -radius * Math.cos(angle));
  const aside = scale(car.right, side * radius * Math.sin(angle));
  return add(add(add(car.position, back), aside), scale(car.up, height));
}

/** 정류장 시점에서 카메라가 도는 쪽(도로 기준 오른쪽 +). 앞에서 차를 돌아보면 화면 좌우가 도로 좌우와 반대다 */
function orbitSide(screenSide: -1 | 1): number {
  return -screenSide;
}

function cameraFor(carS: number, car: RoadFrame, progress: number): CameraPose {
  const { range } = stopAt(progress);
  const weight = dwellWeight(progress);
  const side = range.stop.pin ? orbitSide(stopScreenSide(range.stop)) : 1;
  const angle = STOP_VIEW.angle * weight;
  const radius = lerp(Math.hypot(CHASE.back, 0), STOP_VIEW.radius, weight);
  const height = lerp(CHASE.height, STOP_VIEW.height, weight);
  const chaseTarget = roadPoint(carS + CHASE.ahead, 0, CHASE.aheadHeight);
  const stopTarget = add(
    add(car.position, scale(car.up, STOP_VIEW.targetHeight)),
    scale(car.right, -side * STOP_VIEW.targetShift),
  );
  const pose = { position: orbit(car, angle, radius, height, side), target: lerp3(chaseTarget, stopTarget, weight) };
  const k = overviewWeight(progress);
  if (k === 0) return pose;
  return { position: lerp3(pose.position, OVERVIEW.position, k), target: lerp3(pose.target, OVERVIEW.target, k) };
}

/** 차 몸통의 가운데 */
export function carCenter(car: RoadFrame): Vec3 {
  return add(add(car.position, scale(car.tangent, CAR_BODY_CENTER.forward)), scale(car.up, CAR_BODY_CENTER.up));
}

/**
 * 감쇠한 카메라 자리(out)를 차 둘레 밖, 노면 위로 밀어낸다(scene/CameraRig가 매 프레임 감쇠 뒤에 부른다).
 * 목표 자세(driveAt의 camera)는 이미 그 밖이라 평소에는 움직이지 않는다. 매 프레임 새 객체를 만들지 않도록 out을 직접 고친다.
 */
export function keepClear(out: { x: number; y: number; z: number }, car: RoadFrame): void {
  const center = carCenter(car);
  const dx = out.x - center[0];
  const dy = out.y - center[1];
  const dz = out.z - center[2];
  const length = Math.hypot(dx, dy, dz);
  if (length < CAMERA_CLEARANCE.radius) {
    const [ux, uy, uz] = length > 1e-6 ? [dx / length, dy / length, dz / length] : car.up;
    out.x = center[0] + ux * CAMERA_CLEARANCE.radius;
    out.y = center[1] + uy * CAMERA_CLEARANCE.radius;
    out.z = center[2] + uz * CAMERA_CLEARANCE.radius;
  }
  const height = (out.x - car.position[0]) * car.up[0] + (out.y - car.position[1]) * car.up[1] + (out.z - car.position[2]) * car.up[2];
  if (height < CAMERA_CLEARANCE.height) {
    const lift = CAMERA_CLEARANCE.height - height;
    out.x += car.up[0] * lift;
    out.y += car.up[1] * lift;
    out.z += car.up[2] * lift;
  }
}

/** 스크롤 진행률 하나에서 차·열린 끝·발광·카메라 목표를 계산한다(스펙 3절). 같은 p면 같은 결과다 */
export function driveAt(progress: number): DriveState {
  const p = Math.min(1, Math.max(0, progress));
  const carS = carSAt(p);
  const car = roadFrame(carS);
  return {
    progress: p,
    carS,
    revealS: revealSAt(p),
    ending: overviewWeight(p),
    speed: speedAt(p),
    car,
    camera: cameraFor(carS, car, p),
  };
}
```

- [ ] **Step 4: 통과를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4 src/lib/journey/drive.test.ts`
Expected: PASS — 24 passed

- [ ] **Step 5: 밀어내기 테스트가 규칙을 잡는지 본다**

`keepClear` 본문의 `if (length < CAMERA_CLEARANCE.radius) {`를 `if (false) {`로 잠시 바꿔 다시 실행한다.
Expected: FAIL — "빠르게 스크롤해 감쇠가 목표 사이를 가로질러도…"가 차 둘레 거리에서 실패한다. 되돌리고 다시 실행해 24 passed를 본다.

- [ ] **Step 6: 전체 확인**

Run: `rtk proxy npx tsc --noEmit` → exit 0
Run: `rtk proxy npx vitest run --maxWorkers=4` → `Tests  227 passed (227)`
Run: `rtk proxy npx eslint src/lib/journey/drive.ts src/lib/journey/drive.test.ts` → exit 0

- [ ] **Step 7: 커밋 정리를 제출한다**

```
feat: 여정 우주 도로 경로와 driveAt 추가

- 진행률 하나에서 차 자리, 열린 끝, 카메라 목표를 계산하는 순수 함수(같은 p면 같은 장면)
- 경로는 위치·접선·곡률·뱅킹이 이어지는 해석 곡선이고 s는 중심선 호 길이다
- 감쇠 카메라가 빠른 스크롤에서 차에 붙지 않게 밀어내는 규칙을 둔다
```

---

### Task 4: 궤적 색·발광·빛줄기 길이

스펙 3절 "길이 열린다, 색이 쌓인다"와 8절 1항 `trail.ts` 테스트다. 색(`trailColor`)과 발광(`glow`)을 따로 계산한다. 색은 2막 진입부터 3막 진입까지 주황 → 보라 → 파랑으로 바뀌고(선형 색 공간에서 섞는다. 셰이더와 같은 공간), 발광은 차 앞은 희미하고 차 바로 뒤 10m에 걸쳐 차오르며 엔딩에서 전체가 선명하다. 빛줄기 길이는 주행 속도 곡선(`speedAt`)에서 나온다. 열린 끝 경계선의 노이즈 폭도 여기 둔다.

**Files:**
- Create: `src/lib/journey/trail.ts`, `src/lib/journey/trail.test.ts`

**Interfaces:**
- Consumes: Task 3 `ROAD_SCALE`, `speedAt`, `carSAt`, `driveAt`, `REVEAL_MIN_GAP`, `ROAD_START`, `ROAD_END`
- Produces: `type LinearRgb`, `TRAIL_HEX`, `HEADLIGHT_HEX`, `TRAIL_MIX_START`(90), `TRAIL_MIX_END`(160), `GLOW`({ dim, full, fill }), `REVEAL_EDGE`({ noiseScale, amplitude, speed, glowWidth }), `STREAK`({ length, maxSpeed }), `ENDING_CAR_LIGHT`, `TRAIL_LINEAR`, `hexToLinear(hex)`, `trailMix(s)`, `trailColor(s)`, `glow(s, carS, ending)`, `streakLength(p)`, `carLightLevel(ending)`

- [ ] **Step 1: 테스트를 쓴다**

`src/lib/journey/trail.test.ts` 전체:

```ts
import { describe, expect, it } from "vitest";
import { REVEAL_MIN_GAP, ROAD_END, ROAD_START, carSAt, driveAt } from "./drive";
import { STOP_RANGES, rangeOf } from "./timeline";
import {
  GLOW,
  REVEAL_EDGE,
  STREAK,
  TRAIL_LINEAR,
  TRAIL_MIX_END,
  TRAIL_MIX_START,
  carLightLevel,
  glow,
  hexToLinear,
  streakLength,
  trailColor,
  trailMix,
} from "./trail";

function at(id: string, t: number): number {
  const range = rangeOf(id);
  return range.start + (range.end - range.start) * t;
}

describe("궤적 색", () => {
  it("1막은 주황, 3막은 파랑, 2막 가운데는 보라다", () => {
    expect(trailColor(carSAt(at("todo-app", 0.5)))).toEqual(TRAIL_LINEAR.start);
    expect(trailColor(carSAt(at("pickcare", 0.5)))).toEqual(TRAIL_LINEAR.end);
    for (const [index, value] of trailColor((TRAIL_MIX_START + TRAIL_MIX_END) / 2).entries()) {
      expect(value).toBeCloseTo(TRAIL_LINEAR.middle[index], 9);
    }
  });

  it("전환은 2막 진입에서 시작해 3막 진입에서 끝난다", () => {
    expect(trailMix(TRAIL_MIX_START)).toBe(0);
    expect(trailMix(TRAIL_MIX_END)).toBe(1);
    expect(trailMix(TRAIL_MIX_START + 1)).toBeGreaterThan(0);
    expect(trailMix(carSAt(at("act-2", 0)))).toBe(0);
    expect(carSAt(at("act-2", 0))).toBeCloseTo(TRAIL_MIX_START, 9);
    expect(carSAt(at("act-3", 0))).toBeCloseTo(TRAIL_MIX_END, 9);
  });

  it("막 경계에서 색이 튀지 않는다", () => {
    const h = 0.1;
    for (let s = ROAD_START; s < ROAD_END; s += h) {
      const a = trailColor(s);
      const b = trailColor(s + h);
      expect(Math.max(...a.map((value, index) => Math.abs(value - b[index]))), `s=${s}`).toBeLessThan(0.01);
    }
  });

  it("16진 색을 선형으로 바꾼다", () => {
    expect(hexToLinear("#ffffff")).toEqual([1, 1, 1]);
    expect(hexToLinear("#000000")).toEqual([0, 0, 0]);
    expect(hexToLinear("#808080")[0]).toBeCloseTo(0.2158605, 6);
  });
});

describe("발광", () => {
  const carS = 100;

  it("차가 지나지 않은 길은 희미하다", () => {
    expect(glow(carS + 0.01, carS, 0)).toBe(GLOW.dim);
    expect(glow(carS + 40, carS, 0)).toBe(GLOW.dim);
  });

  it("차가 지나간 길은 선명하다", () => {
    expect(glow(carS - GLOW.fill, carS, 0)).toBe(GLOW.full);
    expect(glow(carS - 80, carS, 0)).toBe(GLOW.full);
  });

  it("차 바로 뒤에서 서서히 차오른다", () => {
    let previous: number = GLOW.dim;
    for (let back = 0.5; back < GLOW.fill; back += 0.5) {
      const value = glow(carS - back, carS, 0);
      expect(value).toBeGreaterThan(previous);
      expect(value).toBeLessThan(GLOW.full);
      previous = value;
    }
  });

  it("엔딩에서는 열린 길 전체가 선명하다", () => {
    for (const s of [carS - 50, carS, carS + 50]) expect(glow(s, carS, 1)).toBe(GLOW.full);
    expect(glow(carS + 50, carS, 0.5)).toBeCloseTo((GLOW.dim + GLOW.full) / 2, 9);
  });

  it("진행률이 이어지면 발광도 이어진다(막·정류장 경계)", () => {
    const s = 150;
    for (const range of STOP_RANGES.slice(1)) {
      const before = driveAt(range.start - 1e-7);
      const after = driveAt(range.start + 1e-7);
      expect(Math.abs(glow(s, before.carS, before.ending) - glow(s, after.carS, after.ending)), range.stop.id).toBeLessThan(1e-4);
    }
  });
});

describe("열린 끝 경계선", () => {
  it("노이즈로 흔들려도 차와 최소 간격 이상 떨어져 있다", () => {
    for (let p = 0; p <= 1; p += 1 / 4000) {
      const { carS, revealS } = driveAt(p);
      expect(revealS - REVEAL_EDGE.amplitude - carS, `p=${p}`).toBeGreaterThanOrEqual(REVEAL_MIN_GAP);
    }
  });
});

describe("빛줄기와 차 불빛", () => {
  it("정속에서 정해진 길이이고, 출발선·정류장 한가운데·엔딩에서는 없다", () => {
    expect(streakLength(at("kokoa-clone", 0.5))).toBeCloseTo(STREAK.length, 6);
    expect(streakLength(0)).toBeLessThan(0.1);
    for (const id of ["stock2u", "tix2u", "pfplay", "pickcare"]) expect(streakLength(at(id, 0.5)), id).toBe(0);
    expect(streakLength(at("ending", 0.3))).toBe(0);
  });

  it("정류장에 들어가고 머물고 나오는 동안 길이가 이어진다", () => {
    // 진행률 1/10000(화면 약 0.002개)마다 본다
    for (const id of ["stock2u", "tix2u", "pfplay", "pickcare"]) {
      const range = rangeOf(id);
      let previous = streakLength(range.start);
      for (let p = range.start + 1e-4; p <= range.end; p += 1e-4) {
        const value = streakLength(p);
        expect(Math.abs(value - previous), `${id} p=${p.toFixed(4)}`).toBeLessThan(0.15);
        previous = value;
      }
    }
  });

  it("길이는 상한을 넘지 않는다", () => {
    for (let p = 0; p <= 1; p += 0.0005) expect(streakLength(p)).toBeLessThanOrEqual(STREAK.length * STREAK.maxSpeed);
  });

  it("엔딩에서 차 불빛을 낮춘다", () => {
    expect(carLightLevel(0)).toBe(1);
    expect(carLightLevel(1)).toBeLessThan(0.5);
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4 src/lib/journey/trail.test.ts`
Expected: FAIL — `Error: Cannot find module './trail'`

- [ ] **Step 3: 구현한다**

`src/lib/journey/trail.ts` 전체:

```ts
import { ROAD_SCALE, speedAt } from "./drive";
import { pathSpan, smoothstep } from "./timeline";

/**
 * 빛의 길의 색과 발광(스펙 3절 "길이 열린다, 색이 쌓인다"). 색(trailColor)은 길 위치의 색이고, 발광(glow)은 세기다.
 * 도로 셰이더(scene/trailShader.ts)는 이 상수를 그대로 받아 같은 식으로 계산한다(trailShader.test.ts가 두 계산을 맞춰 본다).
 * 차의 테일라이트와 빛줄기도 trailColor(carS)를 쓴다. three를 import하지 않는 순수 코드다.
 */

/** 선형(linear sRGB) 0~1 색. 셰이더 안에서 섞는 공간과 같다 */
export type LinearRgb = readonly [number, number, number];

/** 궤적 색: 1막 주황, 3막 파랑. 2막에서 보라를 거쳐 바뀐다(주황과 파랑을 바로 섞으면 가운데가 회색으로 탁해진다) */
export const TRAIL_HEX = { start: "#ff7a1a", middle: "#b14cff", end: "#2f8cff" } as const;
/** 헤드라이트는 막과 상관없이 주황이다 */
export const HEADLIGHT_HEX = "#ffa24a";

/** 색이 바뀌는 구간(도로 s, m): 2막 진입부터 3막 진입까지 */
export const TRAIL_MIX_START = pathSpan("act-2").from * ROAD_SCALE;
export const TRAIL_MIX_END = pathSpan("act-3").from * ROAD_SCALE;

/** 발광 세기: 열렸지만 차가 지나지 않은 길(dim), 지나간 길(full). 차 바로 뒤 fill(m)에 걸쳐 차오른다 */
export const GLOW = { dim: 0.08, full: 1, fill: 10 } as const;

/**
 * 열린 끝의 경계선. 경계는 revealS에서 도로 좌표(s, 옆 거리)의 노이즈만큼 앞뒤로 흔들리고(amplitude, m),
 * 노이즈는 시간에 따라 천천히 흐른다(speed). 경계를 따라 glowWidth(m) 폭의 빛이 흐른다.
 */
export const REVEAL_EDGE = { noiseScale: 0.35, amplitude: 1.2, speed: 0.15, glowWidth: 0.35 } as const;

/** 빛줄기: 정속일 때의 길이(m)와 길이를 늘리는 속도의 상한 */
export const STREAK = { length: 4, maxSpeed: 1.2 } as const;

/** 엔딩에서 차 불빛을 낮추는 정도(1 = 그대로). 시선의 중심은 길 전체다 */
export const ENDING_CAR_LIGHT = 0.3;

function srgbToLinear(channel: number): number {
  return channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
}

export function hexToLinear(hex: string): LinearRgb {
  const n = Number.parseInt(hex.slice(1), 16);
  return [srgbToLinear(((n >> 16) & 255) / 255), srgbToLinear(((n >> 8) & 255) / 255), srgbToLinear((n & 255) / 255)];
}

export const TRAIL_LINEAR = {
  start: hexToLinear(TRAIL_HEX.start),
  middle: hexToLinear(TRAIL_HEX.middle),
  end: hexToLinear(TRAIL_HEX.end),
} as const;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** GLSL mix와 같은 식 */
function mix(a: number, b: number, t: number): number {
  return a * (1 - t) + b * t;
}

function mixRgb(a: LinearRgb, b: LinearRgb, t: number): LinearRgb {
  return [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
}

/** 길 위치 s의 색 전환 정도(0 = 1막 주황, 1 = 3막 파랑) */
export function trailMix(s: number): number {
  return smoothstep(TRAIL_MIX_START, TRAIL_MIX_END, s);
}

/** 길 위치 s의 색(선형). 앞 절반은 주황 → 보라, 뒤 절반은 보라 → 파랑 */
export function trailColor(s: number): LinearRgb {
  const m = trailMix(s);
  return mixRgb(mixRgb(TRAIL_LINEAR.start, TRAIL_LINEAR.middle, clamp01(m * 2)), TRAIL_LINEAR.end, clamp01(m * 2 - 1));
}

/**
 * 길 위치 s의 발광 세기. 차 앞(아직 지나지 않은 길)은 희미하고, 차가 지나간 길은 바로 뒤에서 서서히 차올라 선명해진다.
 * 엔딩(ending = 1)에서는 열린 길 전체가 선명하다. 열린 끝 너머는 셰이더가 그리지 않는다(발광 이전에 없다).
 */
export function glow(s: number, carS: number, ending: number): number {
  const passed = 1 - smoothstep(carS - GLOW.fill, carS, s);
  return mix(mix(GLOW.dim, GLOW.full, passed), GLOW.full, ending);
}

/** 진행률의 빛줄기 길이(m). 주행 속도 곡선을 따라 정류장 전부터 짧아지고, 출발하며 다시 길어진다 */
export function streakLength(progress: number): number {
  return STREAK.length * Math.min(speedAt(progress), STREAK.maxSpeed);
}

/** 진행률의 차 불빛 세기 배율. 엔딩에서 낮춘다 */
export function carLightLevel(ending: number): number {
  return mix(1, ENDING_CAR_LIGHT, ending);
}
```

- [ ] **Step 4: 통과를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4 src/lib/journey/trail.test.ts`
Expected: PASS — 14 passed

- [ ] **Step 5: 전체 확인**

Run: `rtk proxy npx tsc --noEmit` → exit 0
Run: `rtk proxy npx vitest run --maxWorkers=4` → `Tests  241 passed (241)`
Run: `rtk proxy npx eslint src/lib/journey/trail.ts src/lib/journey/trail.test.ts` → exit 0

- [ ] **Step 6: 커밋 정리를 제출한다**

```
feat: 여정 궤적 색·발광·빛줄기 길이 모듈 추가

- 색과 발광을 따로 계산하고 셰이더가 같은 상수와 식을 받게 한 곳에 둔다
- 주황과 파랑 사이를 보라로 지나 2막 가운데가 회색으로 탁해지지 않게 한다
- 빛줄기 길이는 스크롤 속도가 아니라 진행률의 주행 속도 곡선을 따른다
```

---

### Task 5: 도로 도형과 도로 재질

스펙 3절 "도로는 공중에 뜬 얇은 판(윗면과 옆면)"과 렌더 단계 셰이더의 "움직이는 경계" 재사용이다. 도형은 1m 간격 링마다 네 면(윗면, 양옆, 아랫면)의 정점을 따로 두고(모서리 법선이 날카롭다), 정점마다 도로 좌표를 싣는다. 2-2 렌더 단계 재질의 노이즈·주입 함수는 공유 조각(`shaderChunks.ts`)으로 옮긴다(옛 재질은 Task 9에서 지운다). 궤적 GLSL은 테스트가 자바스크립트로 옮겨 실행해 Task 4의 식과 같은지 본다. 도함수(`fwidth`)는 discard 전에 구한다.

**Files:**
- Create: `src/lib/journey/road.ts`, `src/lib/journey/road.test.ts`
- Create: `src/components/journey/scene/shaderChunks.ts`, `trailShader.ts`, `trailShader.test.ts`, `roadMaterial.ts`, `roadMaterial.test.ts`

**Interfaces:**
- Consumes: Task 3 `ROAD_START`, `ROAD_END`, `roadFrame`, `roadPoint`; Task 4 `GLOW`, `TRAIL_LINEAR`, `TRAIL_MIX_START`, `TRAIL_MIX_END`, `REVEAL_EDGE`, `trailMix`, `trailColor`, `glow`
- Produces: `RoadMesh { positions, normals, road, indices }`, `ROAD_THICKNESS`(0.5), `ROAD_STEP`(1), `ROAD_FACE`, `roadMesh(step?)`; `glslFloat`, `replaceOnce`, `NOISE_GLSL`; `TRAIL_GLSL`, `trailUniforms()`; `roadUniforms { uJourneyTime, uRevealS, uCarS, uEnding }`, `createRoadMaterial()`(정점 속성 이름 `journeyRoad`, 프로그램 키 `"journey-road"`)

- [ ] **Step 1: 도형 테스트를 쓴다**

`src/lib/journey/road.test.ts` 전체:

```ts
import { describe, expect, it } from "vitest";
import { ROAD_END, ROAD_START, roadFrame, roadPoint } from "./drive";
import { ROAD_FACE, ROAD_STEP, ROAD_THICKNESS, roadMesh } from "./road";
import type { Vec3 } from "./timeline";

const mesh = roadMesh();
const vertexCount = mesh.positions.length / 3;

function vec(array: Float32Array, index: number): Vec3 {
  return [array[index * 3], array[index * 3 + 1], array[index * 3 + 2]];
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

describe("도로 도형", () => {
  it("배열 길이가 서로 맞고 인덱스가 정점 안에 있다", () => {
    expect(mesh.normals).toHaveLength(mesh.positions.length);
    expect(mesh.road).toHaveLength(vertexCount * 4);
    expect(mesh.indices.length % 3).toBe(0);
    expect(Math.max(...mesh.indices)).toBeLessThan(vertexCount);
    expect(vertexCount).toBe((Math.ceil((ROAD_END - ROAD_START) / ROAD_STEP) + 1) * 8);
  });

  it("도로 좌표의 s는 도로 처음부터 끝까지다", () => {
    let low = Infinity;
    let high = -Infinity;
    for (let i = 0; i < vertexCount; i++) {
      low = Math.min(low, mesh.road[i * 4]);
      high = Math.max(high, mesh.road[i * 4]);
    }
    expect(low).toBe(ROAD_START);
    expect(high).toBe(ROAD_END);
  });

  it("윗면 정점은 그 s의 도로 가장자리에 있고, 옆 거리는 ±반폭이다", () => {
    for (let i = 0; i < vertexCount; i += 7) {
      const [s, lateral, half, face] = mesh.road.subarray(i * 4, i * 4 + 4);
      expect(half).toBeCloseTo(roadFrame(s).width / 2, 4);
      expect(Math.abs(Math.abs(lateral) - half)).toBeLessThan(1e-4);
      if (face !== ROAD_FACE.top) continue;
      const expected = roadPoint(s, lateral);
      expect(Math.hypot(...sub(vec(mesh.positions, i), expected)), `정점 ${i}`).toBeLessThan(1e-3);
    }
  });

  it("아랫모서리는 윗면에서 두께만큼 아래다", () => {
    for (let i = 0; i < vertexCount; i += 5) {
      const [s, lateral, , face] = mesh.road.subarray(i * 4, i * 4 + 4);
      if (face !== ROAD_FACE.sideBottom && face !== ROAD_FACE.bottom) continue;
      const expected = roadPoint(s, lateral, -ROAD_THICKNESS);
      expect(Math.hypot(...sub(vec(mesh.positions, i), expected)), `정점 ${i}`).toBeLessThan(1e-3);
    }
  });

  it("삼각형은 바깥에서 보면 반시계 방향이다(앞면이 법선 쪽을 본다)", () => {
    for (let t = 0; t < mesh.indices.length; t += 3) {
      const [a, b, c] = [mesh.indices[t], mesh.indices[t + 1], mesh.indices[t + 2]];
      const pa = vec(mesh.positions, a);
      const faceNormal = cross(sub(vec(mesh.positions, b), pa), sub(vec(mesh.positions, c), pa));
      expect(dot(faceNormal, vec(mesh.normals, a)), `삼각형 ${t / 3}`).toBeGreaterThan(0);
    }
  });

  it("법선은 단위 벡터다", () => {
    for (let i = 0; i < vertexCount; i += 3) expect(Math.hypot(...vec(mesh.normals, i))).toBeCloseTo(1, 5);
  });

  it("면 자리는 윗면 0, 옆면 1~2, 아랫면 3이다", () => {
    const faces = new Set<number>();
    for (let i = 0; i < vertexCount; i++) faces.add(mesh.road[i * 4 + 3]);
    expect([...faces].sort()).toEqual([0, 1, 2, 3]);
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4 src/lib/journey/road.test.ts`
Expected: FAIL — `Error: Cannot find module './road'`

- [ ] **Step 3: 도형을 구현한다**

`src/lib/journey/road.ts` 전체:

```ts
import { ROAD_END, ROAD_START, roadFrame } from "./drive";
import type { Vec3 } from "./timeline";

/**
 * 도로 판의 도형 데이터(스펙 3절: 공중에 뜬 얇은 판, 윗면과 옆면). three 없이 정점·법선·도로 좌표·인덱스 배열만 만든다.
 * 장면(scene/Road.tsx)이 BufferGeometry로 감싼다.
 * 도로 좌표(road, 정점마다 4개)는 (s, 옆 거리, 반폭, 면 자리)다. 셰이더가 이 값으로 열린 끝·발광·차선을 그린다.
 * 면 자리는 윗면 0, 옆면 1(윗모서리) ~ 2(아랫모서리), 아랫면 3이다.
 */

export interface RoadMesh {
  positions: Float32Array;
  normals: Float32Array;
  road: Float32Array;
  indices: Uint32Array;
}

/** 판 두께(m) */
export const ROAD_THICKNESS = 0.5;
/** 도형을 자르는 간격(m). 가장 급한 굽이(반지름 약 22m)에서 한 칸이 3도 남짓 돈다 */
export const ROAD_STEP = 1;
export const ROAD_FACE = { top: 0, sideTop: 1, sideBottom: 2, bottom: 3 } as const;

interface Edge {
  /** 링 안에서 면의 두 정점: 바깥에서 볼 때 왼쪽(first)과 오른쪽(second) */
  first: "topLeft" | "topRight" | "bottomLeft" | "bottomRight";
  second: "topLeft" | "topRight" | "bottomLeft" | "bottomRight";
  normal: "up" | "down" | "right" | "left";
  faces: [number, number];
}

/** 네 면. 정점 순서는 바깥에서 볼 때 반시계 방향이 되게 골랐다(three의 앞면) */
const FACES: Edge[] = [
  { first: "topLeft", second: "topRight", normal: "up", faces: [ROAD_FACE.top, ROAD_FACE.top] },
  { first: "topRight", second: "bottomRight", normal: "right", faces: [ROAD_FACE.sideTop, ROAD_FACE.sideBottom] },
  { first: "bottomLeft", second: "topLeft", normal: "left", faces: [ROAD_FACE.sideBottom, ROAD_FACE.sideTop] },
  { first: "bottomRight", second: "bottomLeft", normal: "down", faces: [ROAD_FACE.bottom, ROAD_FACE.bottom] },
];

export function roadMesh(step = ROAD_STEP): RoadMesh {
  const rings = Math.ceil((ROAD_END - ROAD_START) / step) + 1;
  const vertexCount = rings * FACES.length * 2;
  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const road = new Float32Array(vertexCount * 4);
  const indices = new Uint32Array((rings - 1) * FACES.length * 6);

  for (let ring = 0; ring < rings; ring++) {
    const s = Math.min(ROAD_END, ROAD_START + ring * step);
    const frame = roadFrame(s);
    const half = frame.width / 2;
    const at = (lateral: number, height: number): Vec3 => [
      frame.position[0] + frame.right[0] * lateral + frame.up[0] * height,
      frame.position[1] + frame.right[1] * lateral + frame.up[1] * height,
      frame.position[2] + frame.right[2] * lateral + frame.up[2] * height,
    ];
    const corners = {
      topLeft: { point: at(-half, 0), lateral: -half },
      topRight: { point: at(half, 0), lateral: half },
      bottomLeft: { point: at(-half, -ROAD_THICKNESS), lateral: -half },
      bottomRight: { point: at(half, -ROAD_THICKNESS), lateral: half },
    };
    const directions: Record<Edge["normal"], Vec3> = {
      up: frame.up,
      down: [-frame.up[0], -frame.up[1], -frame.up[2]],
      right: frame.right,
      left: [-frame.right[0], -frame.right[1], -frame.right[2]],
    };
    FACES.forEach((face, faceIndex) => {
      [face.first, face.second].forEach((corner, end) => {
        const vertex = (ring * FACES.length + faceIndex) * 2 + end;
        positions.set(corners[corner].point, vertex * 3);
        normals.set(directions[face.normal], vertex * 3);
        road.set([s, corners[corner].lateral, half, face.faces[end]], vertex * 4);
      });
      if (ring === rings - 1) return;
      const a = (ring * FACES.length + faceIndex) * 2;
      const b = a + 1;
      const c = ((ring + 1) * FACES.length + faceIndex) * 2 + 1;
      const d = c - 1;
      indices.set([a, b, c, a, c, d], (ring * FACES.length + faceIndex) * 6);
    });
  }
  return { positions, normals, road, indices };
}
```

- [ ] **Step 4: 통과를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4 src/lib/journey/road.test.ts`
Expected: PASS — 7 passed

- [ ] **Step 5: 셰이더 공유 조각을 만든다**

`src/components/journey/scene/shaderChunks.ts` 전체:

```ts
/**
 * 여정 셰이더가 같이 쓰는 조각. three 표준 재질에 onBeforeCompile로 계산을 끼워 넣을 때 쓴다.
 * 2-2의 렌더 단계 재질에서 옮겨 왔다(노이즈를 따라 빛나는 경계). 2-3의 지형·홀로그램 재질도 이 조각을 쓴다.
 */

/** GLSL 실수 글자. 정수도 소수점을 붙인다(1 → 1.0) */
export function glslFloat(value: number): string {
  return Number.isInteger(value) ? `${value}.0` : `${value}`;
}

/** three 셰이더 글자에서 주입 지점 하나를 바꾼다. 지점이 없으면(three가 바뀌면) 바로 알린다 */
export function replaceOnce(source: string, anchor: string, replacement: string): string {
  if (!source.includes(anchor)) throw new Error(`three 셰이더에 주입 지점이 없습니다: ${anchor}`);
  return source.replace(anchor, replacement);
}

/** 3차원 값 노이즈(0~1). 세 번째 축에 시간을 넣으면 무늬가 제자리에서 흐른다 */
export const NOISE_GLSL = /* glsl */ `
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
```

- [ ] **Step 6: 궤적 GLSL 일치 테스트를 쓴다**

`src/components/journey/scene/trailShader.test.ts` 전체:

```ts
import { describe, expect, it } from "vitest";
import { glow, trailColor, trailMix } from "@/lib/journey/trail";
import { TRAIL_GLSL, trailUniforms } from "./trailShader";

type Value = number | number[];

/**
 * TRAIL_GLSL을 자바스크립트로 옮겨 실행한다. #define은 상수로, 함수 선언은 function으로, 지역 변수는 let으로 바꾸고,
 * GLSL 내장 함수(smoothstep·clamp·mix)는 vec3(배열)에도 성분마다 적용되게 흉내 낸다. uniform은 trailUniforms의 값이다.
 */
function runGlsl(source: string): Record<string, (...args: number[]) => Value> {
  const uniforms = Object.fromEntries(
    Object.entries(trailUniforms()).map(([name, uniform]) => [name, [uniform.value.r, uniform.value.g, uniform.value.b]]),
  );
  const body = source
    .replace(/^#define (\w+) (.+)$/gm, "const $1 = $2;")
    .replace(/^uniform .+;$/gm, "")
    .replace(/^(?:float|vec3) (\w+)\(([^)]*)\) \{$/gm, (_, name: string, params: string) => {
      const names = params
        .split(",")
        .map((param) => param.trim().split(/\s+/)[1])
        .filter(Boolean);
      return `function ${name}(${names.join(", ")}) {`;
    })
    .replace(/^(\s+)(?:float|vec3) (\w+) =/gm, "$1let $2 =");
  const functions = [...source.matchAll(/^(?:float|vec3) (\w+)\(/gm)].map((match) => match[1]);
  const prelude = `
    const each = (f) => (...args) => {
      const size = args.find(Array.isArray)?.length;
      if (size === undefined) return f(...args);
      return Array.from({ length: size }, (_, i) => f(...args.map((a) => (Array.isArray(a) ? a[i] : a))));
    };
    const clamp = each((x, a, b) => Math.min(b, Math.max(a, x)));
    const mix = each((a, b, t) => a * (1 - t) + b * t);
    const smoothstep = each((e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); });
  `;
  const factory = new Function(
    ...Object.keys(uniforms),
    `${prelude}\n${body}\nreturn { ${functions.join(", ")} };`,
  ) as (...values: number[][]) => Record<string, (...args: number[]) => Value>;
  return factory(...Object.values(uniforms));
}

const glsl = runGlsl(TRAIL_GLSL);

describe("궤적 셰이더", () => {
  it("TypeScript와 같은 함수 셋을 정의한다", () => {
    expect(Object.keys(glsl).sort()).toEqual(["journeyGlow", "journeyTrailColor", "journeyTrailMix"]);
  });

  it("색 전환 정도가 TypeScript(trailMix)와 같다", () => {
    for (let s = -20; s <= 280; s += 0.7) expect(glsl.journeyTrailMix(s)).toBeCloseTo(trailMix(s), 12);
  });

  it("색이 TypeScript(trailColor)와 같다", () => {
    for (let s = -20; s <= 280; s += 0.7) {
      const shader = glsl.journeyTrailColor(s) as number[];
      const script = trailColor(s);
      for (let channel = 0; channel < 3; channel++) expect(shader[channel], `s=${s}`).toBeCloseTo(script[channel], 6);
    }
  });

  it("발광이 TypeScript(glow)와 같다", () => {
    for (const carS of [0, 37.5, 110, 220]) {
      for (const ending of [0, 0.4, 1]) {
        for (let s = -20; s <= 280; s += 1.3) {
          expect(glsl.journeyGlow(s, carS, ending), `s=${s} carS=${carS} ending=${ending}`).toBeCloseTo(glow(s, carS, ending), 12);
        }
      }
    }
  });
});
```

Run: `rtk proxy npx vitest run --maxWorkers=4 src/components/journey/scene/trailShader.test.ts`
Expected: FAIL — `Error: Cannot find module './trailShader'`

- [ ] **Step 7: 궤적 GLSL을 만든다**

`src/components/journey/scene/trailShader.ts` 전체:

```ts
import { Color } from "three";
import { GLOW, TRAIL_LINEAR, TRAIL_MIX_END, TRAIL_MIX_START } from "@/lib/journey/trail";
import { glslFloat } from "./shaderChunks";

/**
 * 궤적 색과 발광의 GLSL 판(lib/journey/trail.ts의 trailMix·trailColor·glow와 같은 상수, 같은 식).
 * trailShader.test.ts가 이 글자를 자바스크립트로 옮겨 실행해 TypeScript 계산과 같은지 확인한다.
 * 그래서 함수 안에서는 float·vec3 선언, smoothstep·clamp·mix와 사칙연산만 쓴다.
 */
export const TRAIL_GLSL = /* glsl */ `
#define TRAIL_MIX_START ${glslFloat(TRAIL_MIX_START)}
#define TRAIL_MIX_END ${glslFloat(TRAIL_MIX_END)}
#define GLOW_DIM ${glslFloat(GLOW.dim)}
#define GLOW_FULL ${glslFloat(GLOW.full)}
#define GLOW_FILL ${glslFloat(GLOW.fill)}
uniform vec3 uTrailStart;
uniform vec3 uTrailMiddle;
uniform vec3 uTrailEnd;

float journeyTrailMix( float s ) {
  return smoothstep( TRAIL_MIX_START, TRAIL_MIX_END, s );
}

vec3 journeyTrailColor( float s ) {
  float m = journeyTrailMix( s );
  return mix( mix( uTrailStart, uTrailMiddle, clamp( m * 2.0, 0.0, 1.0 ) ), uTrailEnd, clamp( m * 2.0 - 1.0, 0.0, 1.0 ) );
}

float journeyGlow( float s, float carS, float ending ) {
  float passed = 1.0 - smoothstep( carS - GLOW_FILL, carS, s );
  return mix( mix( GLOW_DIM, GLOW_FULL, passed ), GLOW_FULL, ending );
}`;

/** TRAIL_GLSL의 색 uniform. 선형 색이라 Color에 그대로 넣는다(three의 작업 색 공간이 선형 sRGB다) */
export function trailUniforms() {
  return {
    uTrailStart: { value: new Color(...TRAIL_LINEAR.start) },
    uTrailMiddle: { value: new Color(...TRAIL_LINEAR.middle) },
    uTrailEnd: { value: new Color(...TRAIL_LINEAR.end) },
  };
}
```

Run: `rtk proxy npx vitest run --maxWorkers=4 src/components/journey/scene/trailShader.test.ts`
Expected: PASS — 4 passed

- [ ] **Step 8: 일치 테스트가 식의 어긋남을 잡는지 본다**

`TRAIL_GLSL`의 `carS - GLOW_FILL`을 `carS - GLOW_FILL * 2.0`으로 잠시 바꿔 다시 실행한다.
Expected: FAIL — "발광이 TypeScript(glow)와 같다". 되돌리고 4 passed를 본다.

- [ ] **Step 9: 도로 재질 테스트를 쓴다**

`src/components/journey/scene/roadMaterial.test.ts` 전체:

```ts
import { describe, expect, it } from "vitest";
import { ShaderLib, type WebGLProgramParametersWithUniforms, type WebGLRenderer } from "three";
import { REVEAL_EDGE } from "@/lib/journey/trail";
import { createRoadMaterial, roadUniforms } from "./roadMaterial";

/** three가 프로그램을 만들 때 onBeforeCompile에 넘기는 값을 표준 재질 셰이더로 흉내 낸다 */
function compile(): WebGLProgramParametersWithUniforms {
  const shader = {
    vertexShader: ShaderLib.standard.vertexShader,
    fragmentShader: ShaderLib.standard.fragmentShader,
    uniforms: {},
  } as unknown as WebGLProgramParametersWithUniforms;
  createRoadMaterial().onBeforeCompile(shader, {} as WebGLRenderer);
  return shader;
}

describe("도로 재질", () => {
  it("three 표준 셰이더의 주입 지점을 모두 찾아 도로 계산을 넣는다", () => {
    const shader = compile();
    expect(shader.vertexShader).toContain("attribute vec4 journeyRoad;");
    expect(shader.vertexShader).toContain("vJourneyRoad = journeyRoad;");
    for (const piece of [
      "float journeyNoise( vec3 x )",
      "vec3 journeyTrailColor( float s )",
      "float journeyGlow( float s, float carS, float ending )",
      "if ( journeyEdge > 0.0 ) discard;",
      "totalEmissiveRadiance += journeyRadiance;",
    ]) {
      expect(shader.fragmentShader).toContain(piece);
    }
  });

  it("경계 노이즈는 도로 좌표(s, 옆 거리)와 시간으로 계산한다(월드 좌표를 쓰지 않는다)", () => {
    const fragment = compile().fragmentShader;
    expect(fragment).toContain(
      "journeyNoise( vec3( journeyS * EDGE_NOISE_SCALE, journeyLateral * EDGE_NOISE_SCALE, uJourneyTime * EDGE_NOISE_SPEED ) )",
    );
    expect(fragment).toContain(`#define EDGE_AMPLITUDE ${REVEAL_EDGE.amplitude}`);
  });

  it("도함수(fwidth)는 discard보다 먼저 구한다", () => {
    const fragment = compile().fragmentShader;
    const discardAt = fragment.indexOf("discard;");
    for (const name of ["journeyEdgePixel", "journeyLateralPixel", "journeySPixel"]) {
      expect(fragment.indexOf(`float ${name} = fwidth(`), name).toBeGreaterThan(0);
      expect(fragment.indexOf(`float ${name} = fwidth(`), name).toBeLessThan(discardAt);
    }
  });

  it("진행에 따라 바뀌는 값은 모든 도로 재질이 같은 uniform 객체를 본다", () => {
    const a = compile();
    const b = compile();
    for (const name of ["uJourneyTime", "uRevealS", "uCarS", "uEnding"] as const) {
      expect(a.uniforms[name]).toBe(roadUniforms[name]);
      expect(b.uniforms[name]).toBe(roadUniforms[name]);
    }
  });

  it("셰이더 프로그램 키가 고정이다(번들 경계 e2e의 표지)", () => {
    expect(createRoadMaterial().customProgramCacheKey()).toBe("journey-road");
  });
});
```

Run: `rtk proxy npx vitest run --maxWorkers=4 src/components/journey/scene/roadMaterial.test.ts`
Expected: FAIL — `Error: Cannot find module './roadMaterial'`

- [ ] **Step 10: 도로 재질을 만든다**

`src/components/journey/scene/roadMaterial.ts` 전체:

```ts
import { MeshStandardMaterial, type WebGLProgramParametersWithUniforms } from "three";
import { REVEAL_EDGE } from "@/lib/journey/trail";
import { NOISE_GLSL, glslFloat, replaceOnce } from "./shaderChunks";
import { TRAIL_GLSL, trailUniforms } from "./trailShader";

/**
 * 빛의 길 재질(스펙 3절 "길이 열린다, 색이 쌓인다"). MeshStandardMaterial에 onBeforeCompile로 도로 계산을 넣는다.
 * 정점마다 도로 좌표(journeyRoad: s, 옆 거리, 반폭, 면 자리, lib/journey/road.ts)를 받아
 *   - 열린 끝(uRevealS) 너머는 그리지 않고(discard), 경계에는 도로 좌표의 노이즈를 따라 빛나는 선이 흐른다.
 *   - 색은 journeyTrailColor(s), 세기는 journeyGlow(s, uCarS, uEnding)다(trailShader.ts, TypeScript와 같은 식).
 *   - 윗면은 어두운 메탈 노면 위에 가장자리 선과 차선을, 옆면은 빛나는 띠를 그린다.
 * 진행에 따라 바뀌는 값은 모두 uniform이라 스크롤 중에 셰이더를 다시 컴파일하지 않는다.
 */

/** 장면이 매 프레임 한 번 바꾸는 값. 도로 재질이 같은 객체를 본다 */
export const roadUniforms = {
  uJourneyTime: { value: 0 },
  uRevealS: { value: 0 },
  uCarS: { value: 0 },
  uEnding: { value: 0 },
};

/** 발광 배율(선형 HDR). 블룸은 밝기 1을 넘는 빛에 걸린다 */
const LIGHT = { fill: 0.4, line: 3.2, side: 2.2, under: 0.08, edge: 7 } as const;
/** 노면 그림: 가장자리 선(가장자리에서 안쪽으로 inset, 폭 width), 차선 간격과 점선 주기(m) */
const LINES = { inset: 0.35, width: 0.09, laneSpacing: 4, dash: 6 } as const;

const VERTEX_PARS = /* glsl */ `#include <common>
attribute vec4 journeyRoad;
varying vec4 vJourneyRoad;`;

const VERTEX_ROAD = /* glsl */ `#include <begin_vertex>
vJourneyRoad = journeyRoad;`;

const FRAGMENT_PARS = /* glsl */ `#include <common>
#define EDGE_NOISE_SCALE ${glslFloat(REVEAL_EDGE.noiseScale)}
#define EDGE_AMPLITUDE ${glslFloat(REVEAL_EDGE.amplitude)}
#define EDGE_NOISE_SPEED ${glslFloat(REVEAL_EDGE.speed)}
#define EDGE_GLOW_WIDTH ${glslFloat(REVEAL_EDGE.glowWidth)}
#define LIGHT_FILL ${glslFloat(LIGHT.fill)}
#define LIGHT_LINE ${glslFloat(LIGHT.line)}
#define LIGHT_SIDE ${glslFloat(LIGHT.side)}
#define LIGHT_UNDER ${glslFloat(LIGHT.under)}
#define LIGHT_EDGE ${glslFloat(LIGHT.edge)}
#define LINE_INSET ${glslFloat(LINES.inset)}
#define LINE_WIDTH ${glslFloat(LINES.width)}
#define LANE_SPACING ${glslFloat(LINES.laneSpacing)}
#define LANE_DASH ${glslFloat(LINES.dash)}
varying vec4 vJourneyRoad;
uniform float uJourneyTime;
uniform float uRevealS;
uniform float uCarS;
uniform float uEnding;
${NOISE_GLSL}
${TRAIL_GLSL}

/** 거리 d에 놓인 폭 width 선. 화소가 선보다 굵어지면(멀리서) 흐려져 앨리어싱 대신 고르게 사라진다 */
float journeyLine( float d, float width, float pixel ) {
  float line = 1.0 - smoothstep( width, width + pixel, abs( d ) );
  return line * ( 1.0 - smoothstep( width * 1.5, width * 4.0, pixel ) );
}`;

const FRAGMENT_ROAD = /* glsl */ `#include <color_fragment>
float journeyS = vJourneyRoad.x;
float journeyLateral = vJourneyRoad.y;
float journeyHalf = vJourneyRoad.z;
float journeyFace = vJourneyRoad.w;
// 열린 끝. 노이즈는 도로 좌표로 계산해 경계가 움직여도 무늬가 미끄러지지 않는다.
float journeyNoiseValue = journeyNoise( vec3( journeyS * EDGE_NOISE_SCALE, journeyLateral * EDGE_NOISE_SCALE, uJourneyTime * EDGE_NOISE_SPEED ) );
float journeyEdge = journeyS - uRevealS - ( journeyNoiseValue * 2.0 - 1.0 ) * EDGE_AMPLITUDE;
// 도함수는 discard 전에 구한다(균일하지 않은 흐름 안에서는 값이 정해지지 않는다).
float journeyEdgePixel = fwidth( journeyEdge );
float journeyLateralPixel = fwidth( journeyLateral );
float journeySPixel = fwidth( journeyS );
if ( journeyEdge > 0.0 ) discard;
float journeyBoundary = 1.0 - smoothstep( 0.0, EDGE_GLOW_WIDTH + journeyEdgePixel, - journeyEdge );
float journeyTop = 1.0 - step( 0.5, journeyFace );
float journeyUnder = step( 2.5, journeyFace );
float journeySide = 1.0 - journeyTop - journeyUnder;
// 윗면: 가장자리 선과, 가운데에서 LANE_SPACING마다 긋는 점선 차선(가장자리 가까이는 긋지 않는다)
float journeyEdgeLine = journeyLine( journeyHalf - abs( journeyLateral ) - LINE_INSET, LINE_WIDTH, journeyLateralPixel );
float journeyLane = ( fract( journeyLateral / LANE_SPACING + 0.5 ) - 0.5 ) * LANE_SPACING;
float journeyLaneLine = journeyLine( journeyLane, LINE_WIDTH, journeyLateralPixel );
journeyLaneLine *= step( LANE_SPACING * 0.5, journeyHalf - abs( journeyLateral ) + LINE_WIDTH );
journeyLaneLine *= step( fract( journeyS / LANE_DASH ), 0.5 ) * ( 1.0 - smoothstep( 0.5, 2.0, journeySPixel ) );
float journeyLines = max( journeyEdgeLine, journeyLaneLine );
float journeyLight = journeyTop * ( LIGHT_FILL + LIGHT_LINE * journeyLines )
  + journeySide * LIGHT_SIDE * ( 1.0 - 0.7 * clamp( journeyFace - 1.0, 0.0, 1.0 ) )
  + journeyUnder * LIGHT_UNDER;
vec3 journeyColor = journeyTrailColor( journeyS );
vec3 journeyRadiance = journeyColor * journeyGlow( journeyS, uCarS, uEnding ) * journeyLight
  + mix( journeyColor, vec3( 1.0 ), 0.55 ) * journeyBoundary * LIGHT_EDGE;
diffuseColor.rgb *= 1.0 - 0.6 * journeySide;`;

const FRAGMENT_EMISSIVE = /* glsl */ `#include <emissivemap_fragment>
totalEmissiveRadiance += journeyRadiance;`;

/** 도로 재질 하나를 만든다. 노면은 어두운 메탈이다. 환경 반사는 약하게 해 지나간 길과 아직 지나지 않은 길의 밝기 차이가 묻히지 않게 한다 */
export function createRoadMaterial(): MeshStandardMaterial {
  const material = new MeshStandardMaterial({ color: "#0b0e14", metalness: 0.55, roughness: 0.42, envMapIntensity: 0.15 });
  const colors = trailUniforms();
  material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    Object.assign(shader.uniforms, roadUniforms, colors);
    shader.vertexShader = replaceOnce(
      replaceOnce(shader.vertexShader, "#include <common>", VERTEX_PARS),
      "#include <begin_vertex>",
      VERTEX_ROAD,
    );
    let fragment = shader.fragmentShader;
    fragment = replaceOnce(fragment, "#include <common>", FRAGMENT_PARS);
    fragment = replaceOnce(fragment, "#include <color_fragment>", FRAGMENT_ROAD);
    fragment = replaceOnce(fragment, "#include <emissivemap_fragment>", FRAGMENT_EMISSIVE);
    shader.fragmentShader = fragment;
  };
  // 번들 경계 e2e가 이 글자로 장면 코드를 알아본다(journey.e2e.ts "다른 페이지는 여정 3D 장면 코드를…")
  material.customProgramCacheKey = () => "journey-road";
  return material;
}
```

Run: `rtk proxy npx vitest run --maxWorkers=4 src/components/journey/scene/roadMaterial.test.ts`
Expected: PASS — 5 passed

- [ ] **Step 11: 전체 확인**

Run: `rtk proxy npx tsc --noEmit` → exit 0
Run: `rtk proxy npx vitest run --maxWorkers=4` → `Tests  257 passed (257)`
Run: `rtk proxy npx eslint src/lib/journey/road.ts src/lib/journey/road.test.ts src/components/journey/scene/shaderChunks.ts src/components/journey/scene/trailShader.ts src/components/journey/scene/trailShader.test.ts src/components/journey/scene/roadMaterial.ts src/components/journey/scene/roadMaterial.test.ts` → exit 0

- [ ] **Step 12: 커밋 정리를 제출한다**

```
feat: 여정 도로 도형과 빛의 길 재질 추가

- 도로 판 정점마다 도로 좌표를 실어 셰이더가 열린 끝·발광·차선을 그린다
- 경계 노이즈를 도로 좌표로 계산해 경계가 움직여도 무늬가 미끄러지지 않는다
- 궤적 색·발광 GLSL이 TypeScript 식과 같은지 테스트가 실행해 본다
```

---

### Task 6: 차 모델 준비와 출처

스펙 3절 "차"와 1절 비목표의 예외다. `scripts/build-car.ts`가 Khronos glTF Sample Assets의 Car Concept 웹용 압축본을 고정 커밋에서 받아 sha256을 확인하고, 다크 메탈릭 변형(Torched Graphite)만 남기고, Khronos 로고(번호판·운전대 엠블럼 노드, 패널·휠의 로고 발광 텍스처)를 빼고, 실내 재질 여섯을 하나로 합치고, 유리 투과를 반투명으로 바꾸고, 세기 0인 가림 텍스처와 쓰지 않는 재질·텍스처·이미지를 지운다. Draco·Basis 디코더는 three에서 복사한다. 출처(CC BY 4.0: 저작자·라이선스·수정 사실)를 엔딩의 은하 출처 아래에 적는다.

**Files:**
- Create: `scripts/build-car.ts`, `src/lib/journey/carAsset.ts`, `src/lib/journey/carAsset.test.ts`
- Generate: `public/journey/car/`(gltf 1, bin 1, ktx2 9), `public/journey/decoders/`(draco 2, basis 2)
- Modify: `package.json`, `eslint.config.mjs`, `src/components/journey/JourneyContent.tsx`, `e2e/journey.e2e.ts`

**Interfaces:**
- Produces: `CAR_URL`(`/journey/car/CarConcept.gltf`), `DRACO_PATH`, `BASIS_PATH`, `CAR_LIGHT_MATERIALS`({ head: "Headlight", tail: "Brakelight" }), `CAR_LIGHT_INTENSITY`, `TAILLIGHTS`(빛줄기 시작 자리 둘: { lateral, height, forward }), `CAR_CREDIT`; `npm run build:car`

- [ ] **Step 1: 모델 파일 테스트를 쓴다**

`src/lib/journey/carAsset.test.ts` 전체:

```ts
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { BASIS_PATH, CAR_LIGHT_MATERIALS, CAR_URL, DRACO_PATH } from "./carAsset";

/** scripts/build-car.ts가 만든 모델 파일을 확인한다. public/ 아래 경로는 주소와 같다 */
const PUBLIC = path.join(process.cwd(), "public");
const gltfPath = path.join(PUBLIC, CAR_URL);
const gltf = JSON.parse(readFileSync(gltfPath, "utf8")) as {
  nodes: { name?: string }[];
  materials: { name: string; alphaMode?: string; extensions?: Record<string, unknown> }[];
  images: { uri: string }[];
  buffers: { uri: string }[];
  extensionsUsed: string[];
  extensionsRequired: string[];
};

describe("차 모델 파일", () => {
  it("Khronos 로고 노드와 텍스처가 없다", () => {
    const names = gltf.nodes.map((node) => node.name);
    expect(names).not.toContain("License Plate");
    expect(names).not.toContain("InteriorSteeringEmblem");
    expect(gltf.images.map((image) => image.uri).filter((uri) => /khronos/i.test(uri))).toEqual([]);
  });

  it("재질 변형과 유리 투과가 없고 Draco·KTX2만 필수 확장이다", () => {
    expect(gltf.extensionsUsed).not.toContain("KHR_materials_variants");
    expect(gltf.extensionsUsed).not.toContain("KHR_materials_transmission");
    expect([...gltf.extensionsRequired].sort()).toEqual(["KHR_draco_mesh_compression", "KHR_texture_basisu"]);
    expect(gltf.materials.find((material) => material.name === "Glass")?.alphaMode).toBe("BLEND");
  });

  it("장면이 바꾸는 불빛 재질이 있다", () => {
    const names = gltf.materials.map((material) => material.name);
    expect(names).toContain(CAR_LIGHT_MATERIALS.head);
    expect(names).toContain(CAR_LIGHT_MATERIALS.tail);
  });

  it("가리키는 파일이 모두 있고, 쓰지 않는 파일은 없다", () => {
    const folder = path.dirname(gltfPath);
    const referenced = [...gltf.buffers.map((buffer) => buffer.uri), ...gltf.images.map((image) => image.uri)];
    for (const uri of referenced) expect(existsSync(path.join(folder, uri)), uri).toBe(true);
    expect(readdirSync(folder).sort()).toEqual([path.basename(gltfPath), ...referenced].sort());
  });

  it("전체 크기는 3.5MB 이하다", () => {
    const folder = path.dirname(gltfPath);
    const total = readdirSync(folder).reduce((sum, name) => sum + statSync(path.join(folder, name)).size, 0);
    expect(total).toBeLessThan(3.5 * 1024 * 1024);
  });

  it("Draco·Basis 디코더가 public/에 있다", () => {
    for (const file of [
      path.join(DRACO_PATH, "draco_wasm_wrapper.js"),
      path.join(DRACO_PATH, "draco_decoder.wasm"),
      path.join(BASIS_PATH, "basis_transcoder.js"),
      path.join(BASIS_PATH, "basis_transcoder.wasm"),
    ]) {
      expect(existsSync(path.join(PUBLIC, file)), file).toBe(true);
    }
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4 src/lib/journey/carAsset.test.ts`
Expected: FAIL — `Error: Cannot find module './carAsset'`

- [ ] **Step 3: 준비 스크립트를 쓴다**

`scripts/build-car.ts` 전체:

```ts
import { createHash } from "node:crypto";
import { copyFile, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * 여정의 차 모델(스펙 3절 "차")을 만든다. Khronos glTF Sample Assets의 Car Concept 웹용 압축본(Draco + KTX2)을
 * 고정 커밋에서 받아 다음을 고친 뒤 public/journey/car/에 쓴다.
 *   1. 재질 변형 중 다크 메탈릭(Torched Graphite)만 남기고 변형 확장을 지운다.
 *   2. Khronos 로고(상표)를 뺀다: 번호판·운전대 엠블럼 노드를 지우고, 패널·휠 재질의 로고 발광 텍스처를 뗀다.
 *   3. 창 너머로만 보이는 실내 재질 여섯을 하나로 합친다(텍스처 없는 어두운 재질). 장면이 재질별로 메시를 합쳐 그리므로 드로콜이 준다.
 *   4. 유리의 투과(transmission)를 가벼운 반투명으로 바꾼다. 투과 재질은 불투명 물체를 한 번 더 그리는 패스를 만들어
 *      드로콜이 약 19개 늘고(측정 62~68 → 43~49), 성능 예산(최대 60)을 넘는다.
 *   5. 세기가 0인 가림(occlusion) 텍스처를 떼고, 아무도 쓰지 않는 재질·텍스처·이미지를 지운다.
 * Draco·Basis 디코더는 three에 들어 있는 파일을 public/journey/decoders/로 복사한다(CDN을 쓰지 않는다).
 *
 * 원본: https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/CarConcept
 * © 2024 Darmstadt Graphics Group GmbH, Eric Chadwick, CC BY 4.0 (페이지 엔딩에 출처와 수정 사실을 적는다)
 *
 * 사용법: npm run build:car
 */
const COMMIT = "7d4ba189827916452eeadc82d4b712dbc6280a6f";
const SOURCE = `https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/${COMMIT}/Models/CarConcept/glTF-KTX-BasisU-Draco/`;
const OUTPUT = "public/journey/car";
const DECODERS = "public/journey/decoders";
const VARIANT = "Torched Graphite";
const LOGO_NODES = ["License Plate", "InteriorSteeringEmblem"];
const LOGO_IMAGE = "Khronos_C.ktx2";
const INTERIOR_MATERIALS = ["Interior 1", "Interior 2", "Interior 3 Graphite", "Floormat", "Hardware", "Dashboard"];

/** 받은 파일이 고정 커밋의 파일과 같은지 확인한다(sha256) */
const SHA256: Record<string, string> = {
  "CarConcept.gltf": "8bdd76afb00f6b430a0bfb4112ecf67c3c6307d27ebd8298ab92047aefca6cfd",
  "CarConcept.data.bin": "157d1a7ba13b1aa512db25c36cb805c95ec5a96709e9de1a5fa084dd7487658e",
  "Dash_E.ktx2": "f9b0811444153459ca28d9211bf8cb6fbe97665071e6257b8c5b56b0edaef525",
  "Dot_C.ktx2": "08968e9d7d9855ae8d201cfaea889e2748fc9049a95838aa18ce689d29c041ca",
  "Dot_N.ktx2": "4a10cfb6134015d6897264fa7e52bc08acb41cd77b64f65726cb6716616b679e",
  "Hex_N.ktx2": "5b1949805e65f218f4bddd0bcce889f45d195db4f8d33eb77244524d134b9ec1",
  "Khronos_C.ktx2": "627acc26f726e7539967cd27f7b9ca5f84c327e5408b870243b45a49c600e62e",
  "Mechanical_N.ktx2": "341db23ec51698720db958677c27def788e8a7e297c7eb05d9f9677b3fbfd693",
  "Mechanical_ORM.ktx2": "e38d981fe93ea6d0d95137a968b141e3919938addf4f1236b1fd6fe0e8b006d6",
  "Occlusion.ktx2": "905008376f6701af044e11f15cbc35abad7fa92300b3be6e8c9346fa3a4926b0",
  "Powdercoat_N.ktx2": "518dce1ade4f1d354ffd8d804bb01a899054af909eb70fe6655372e4414d4753",
  "Rib_N.ktx2": "7bbd1d7776a087b48d3f7d50395d24840fd00dc5ab2622f8dce5685995df94d3",
  "Thickness.ktx2": "6cf5fefa01ce9817f207a72536717cc491f0f2534df236f05e92596546d20722",
  "Tireside_C.ktx2": "d90617659d164fd126d08061cf962aecd43b6f73990ffa3874094a4f3e022935",
  "Tireside_N.ktx2": "a0379569aef88f88e7b43faf17c93469affbd4bfdd9c923e30136e40b4b451c1",
  "Tiretread_N.ktx2": "4abedc34a3ecde5d14e232d2b3c8a59c42d55bab60ae854aaf11230dbc981f69",
};

/** three r181에 들어 있는 디코더. Draco는 WebAssembly 판(래퍼 + wasm)만 쓴다 */
const DECODER_FILES = [
  ["node_modules/three/examples/jsm/libs/draco/gltf/draco_wasm_wrapper.js", "draco/draco_wasm_wrapper.js"],
  ["node_modules/three/examples/jsm/libs/draco/gltf/draco_decoder.wasm", "draco/draco_decoder.wasm"],
  ["node_modules/three/examples/jsm/libs/basis/basis_transcoder.js", "basis/basis_transcoder.js"],
  ["node_modules/three/examples/jsm/libs/basis/basis_transcoder.wasm", "basis/basis_transcoder.wasm"],
];

interface TextureRef {
  index: number;
  [key: string]: unknown;
}

interface Material {
  name: string;
  emissiveTexture?: TextureRef;
  emissiveFactor?: number[];
  occlusionTexture?: TextureRef & { strength?: number };
  normalTexture?: TextureRef;
  pbrMetallicRoughness?: { baseColorTexture?: TextureRef; metallicRoughnessTexture?: TextureRef; [key: string]: unknown };
  extensions?: Record<string, Record<string, unknown>>;
  [key: string]: unknown;
}

interface Primitive {
  material?: number;
  extensions?: { KHR_materials_variants?: { mappings: { material: number; variants: number[] }[] }; [key: string]: unknown };
  [key: string]: unknown;
}

interface Gltf {
  scenes: { nodes: number[] }[];
  nodes: { name?: string; mesh?: number; children?: number[]; [key: string]: unknown }[];
  meshes: { name?: string; primitives: Primitive[] }[];
  materials: Material[];
  textures: { source?: number; extensions?: { KHR_texture_basisu?: { source: number } }; [key: string]: unknown }[];
  images: { uri: string }[];
  extensionsUsed?: string[];
  extensions?: Record<string, unknown>;
  [key: string]: unknown;
}

async function download(name: string): Promise<Buffer> {
  const response = await fetch(SOURCE + encodeURIComponent(name));
  if (!response.ok) throw new Error(`${name}을 받지 못했습니다: ${response.status}`);
  const data = Buffer.from(await response.arrayBuffer());
  const hash = createHash("sha256").update(data).digest("hex");
  if (hash !== SHA256[name]) throw new Error(`${name}이 고정 커밋의 파일과 다릅니다(${hash})`);
  return data;
}

/** 재질 하나가 가리키는 텍스처 참조 전부 */
function textureRefs(material: Material): TextureRef[] {
  const refs: (TextureRef | undefined)[] = [
    material.emissiveTexture,
    material.occlusionTexture,
    material.normalTexture,
    material.pbrMetallicRoughness?.baseColorTexture,
    material.pbrMetallicRoughness?.metallicRoughnessTexture,
  ];
  for (const extension of Object.values(material.extensions ?? {})) {
    for (const value of Object.values(extension)) {
      if (value && typeof value === "object" && "index" in value) refs.push(value as TextureRef);
    }
  }
  return refs.filter((ref): ref is TextureRef => ref !== undefined);
}

function applyVariant(gltf: Gltf): void {
  const variants = (gltf.extensions?.KHR_materials_variants as { variants: { name: string }[] }).variants;
  const variant = variants.findIndex((item) => item.name === VARIANT);
  if (variant < 0) throw new Error(`재질 변형 ${VARIANT}이 없습니다`);
  for (const mesh of gltf.meshes) {
    for (const primitive of mesh.primitives) {
      const mapping = primitive.extensions?.KHR_materials_variants?.mappings.find((item) => item.variants.includes(variant));
      if (mapping) primitive.material = mapping.material;
      if (primitive.extensions) delete primitive.extensions.KHR_materials_variants;
    }
  }
  delete gltf.extensions?.KHR_materials_variants;
}

function removeLogos(gltf: Gltf): void {
  const removed = new Set(gltf.nodes.flatMap((node, index) => (LOGO_NODES.includes(node.name ?? "") ? [index] : [])));
  if (removed.size !== LOGO_NODES.length) throw new Error("로고 노드를 모두 찾지 못했습니다");
  for (const node of gltf.nodes) if (node.children) node.children = node.children.filter((child) => !removed.has(child));
  const logo = gltf.images.findIndex((image) => image.uri === LOGO_IMAGE);
  const logoTextures = new Set(
    gltf.textures.flatMap((texture, index) => ((texture.extensions?.KHR_texture_basisu?.source ?? texture.source) === logo ? [index] : [])),
  );
  for (const material of gltf.materials) {
    if (material.emissiveTexture && logoTextures.has(material.emissiveTexture.index)) {
      delete material.emissiveTexture;
      material.emissiveFactor = [0, 0, 0];
    }
  }
}

function mergeInterior(gltf: Gltf): void {
  const interior = gltf.materials.length;
  gltf.materials.push({
    name: "Interior",
    pbrMetallicRoughness: { baseColorFactor: [0.02, 0.02, 0.022, 1], metallicFactor: 0, roughnessFactor: 0.7 },
  });
  const merged = new Set(INTERIOR_MATERIALS.map((name) => gltf.materials.findIndex((material) => material.name === name)));
  if (merged.has(-1)) throw new Error("실내 재질을 모두 찾지 못했습니다");
  for (const mesh of gltf.meshes) {
    for (const primitive of mesh.primitives) if (primitive.material !== undefined && merged.has(primitive.material)) primitive.material = interior;
  }
}

function lightenGlass(gltf: Gltf): void {
  const glass = gltf.materials.find((material) => material.name === "Glass");
  if (!glass) throw new Error("유리 재질이 없습니다");
  delete glass.extensions;
  glass.alphaMode = "BLEND";
  glass.pbrMetallicRoughness = { baseColorFactor: [0.003, 0.0037, 0.005, 0.3], metallicFactor: 0, roughnessFactor: 0.05 };
}

function dropZeroOcclusion(gltf: Gltf): void {
  for (const material of gltf.materials) if (material.occlusionTexture?.strength === 0) delete material.occlusionTexture;
}

/** 장면에서 닿는 노드·메시·재질·텍스처·이미지만 남기고 번호를 다시 매긴다 */
function prune(gltf: Gltf): void {
  const liveNodes = new Set<number>();
  const visit = (index: number) => {
    liveNodes.add(index);
    for (const child of gltf.nodes[index].children ?? []) visit(child);
  };
  for (const scene of gltf.scenes) for (const root of scene.nodes) visit(root);
  const nodeMap = new Map([...liveNodes].sort((a, b) => a - b).map((old, index) => [old, index]));
  gltf.nodes = [...nodeMap.keys()].map((old) => gltf.nodes[old]);
  for (const node of gltf.nodes) if (node.children) node.children = node.children.map((child) => nodeMap.get(child)!);
  for (const scene of gltf.scenes) scene.nodes = scene.nodes.map((root) => nodeMap.get(root)!);

  const meshMap = new Map<number, number>();
  for (const node of gltf.nodes) if (node.mesh !== undefined && !meshMap.has(node.mesh)) meshMap.set(node.mesh, meshMap.size);
  gltf.meshes = [...meshMap.keys()].map((old) => gltf.meshes[old]);
  for (const node of gltf.nodes) if (node.mesh !== undefined) node.mesh = meshMap.get(node.mesh);

  const materialMap = new Map<number, number>();
  for (const mesh of gltf.meshes) {
    for (const primitive of mesh.primitives) {
      if (primitive.material !== undefined && !materialMap.has(primitive.material)) materialMap.set(primitive.material, materialMap.size);
    }
  }
  gltf.materials = [...materialMap.keys()].map((old) => gltf.materials[old]);
  for (const mesh of gltf.meshes) for (const primitive of mesh.primitives) if (primitive.material !== undefined) primitive.material = materialMap.get(primitive.material);

  const textureMap = new Map<number, number>();
  for (const material of gltf.materials) for (const ref of textureRefs(material)) if (!textureMap.has(ref.index)) textureMap.set(ref.index, textureMap.size);
  gltf.textures = [...textureMap.keys()].map((old) => gltf.textures[old]);
  for (const material of gltf.materials) for (const ref of textureRefs(material)) ref.index = textureMap.get(ref.index)!;

  const imageMap = new Map<number, number>();
  for (const texture of gltf.textures) {
    const source = texture.extensions?.KHR_texture_basisu?.source;
    if (source === undefined) throw new Error("KTX2가 아닌 텍스처가 있습니다");
    if (!imageMap.has(source)) imageMap.set(source, imageMap.size);
    texture.extensions!.KHR_texture_basisu!.source = imageMap.get(source)!;
  }
  gltf.images = [...imageMap.keys()].map((old) => gltf.images[old]);

  const used = new Set(["KHR_draco_mesh_compression", "KHR_texture_basisu"]);
  const collect = (extensions?: Record<string, unknown>) => Object.keys(extensions ?? {}).forEach((name) => used.add(name));
  for (const material of gltf.materials) {
    collect(material.extensions);
    for (const ref of textureRefs(material)) collect(ref.extensions as Record<string, unknown> | undefined);
  }
  gltf.extensionsUsed = (gltf.extensionsUsed ?? []).filter((name) => used.has(name));
  if (gltf.extensions && Object.keys(gltf.extensions).length === 0) delete gltf.extensions;
}

async function main() {
  const gltf = JSON.parse((await download("CarConcept.gltf")).toString("utf8")) as Gltf;
  applyVariant(gltf);
  removeLogos(gltf);
  mergeInterior(gltf);
  lightenGlass(gltf);
  dropZeroOcclusion(gltf);
  prune(gltf);

  await rm(OUTPUT, { recursive: true, force: true });
  await mkdir(OUTPUT, { recursive: true });
  await writeFile(path.join(OUTPUT, "CarConcept.gltf"), JSON.stringify(gltf));
  let total = 0;
  for (const name of ["CarConcept.data.bin", ...gltf.images.map((image) => image.uri)]) {
    const data = await download(name);
    await writeFile(path.join(OUTPUT, name), data);
    total += data.length;
  }
  for (const [from, to] of DECODER_FILES) {
    await mkdir(path.dirname(path.join(DECODERS, to)), { recursive: true });
    await copyFile(from, path.join(DECODERS, to));
  }
  console.log(
    `${OUTPUT}: 노드 ${gltf.nodes.length}, 메시 ${gltf.meshes.length}, 재질 ${gltf.materials.length}, 이미지 ${gltf.images.length}, ${(total / 1024 / 1024).toFixed(2)}MB(+gltf)`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

`package.json`에서 찾을 부분:

```json
    "build:galaxy": "tsx scripts/build-galaxy.ts",
```

바꿀 내용:

```json
    "build:galaxy": "tsx scripts/build-galaxy.ts",
    "build:car": "tsx scripts/build-car.ts",
```

`eslint.config.mjs`에서 찾을 부분:

```js
    "next-env.d.ts",
  ]),
```

바꿀 내용:

```js
    "next-env.d.ts",
    // three에서 복사한 차 모델 디코더(scripts/build-car.ts). 서드파티 파일이다.
    "public/journey/decoders/**",
  ]),
```

- [ ] **Step 4: 모델을 만든다**

네트워크가 필요하다(raw.githubusercontent.com). 해시가 다르면 스크립트가 멈춘다(고정 커밋의 파일이 아니다).

Run: `rtk proxy npm run build:car`
Expected: 마지막 줄 `public/journey/car: 노드 99, 메시 95, 재질 17, 이미지 9, 3.11MB(+gltf)`. `public/journey/car/`에 11개, `public/journey/decoders/`에 4개 파일

- [ ] **Step 5: 파일 주소와 출처를 만든다**

`src/lib/journey/carAsset.ts` 전체:

```ts
/**
 * 차 모델 파일과 출처(스펙 3절 "차"). 모델은 scripts/build-car.ts가 public/journey/car/에 만든다.
 * 디코더는 CDN이 아니라 public/journey/decoders/에서 내보낸다. three를 import하지 않는다.
 */

export const CAR_URL = "/journey/car/CarConcept.gltf";
export const DRACO_PATH = "/journey/decoders/draco/";
export const BASIS_PATH = "/journey/decoders/basis/";

/** 불빛 재질의 이름(모델 안). 장면이 이 재질의 발광 색과 세기를 매 프레임 바꾼다 */
export const CAR_LIGHT_MATERIALS = { head: "Headlight", tail: "Brakelight" } as const;
/** 불빛 발광 세기(선형 HDR). 블룸이 걸리도록 1보다 크다 */
export const CAR_LIGHT_INTENSITY = { head: 9, tail: 6 } as const;

/**
 * 빛줄기가 시작하는 자리(차 기준, m): 옆(오른쪽 +), 노면에서 높이, 차 원점에서 앞(+)·뒤(−).
 * 테일라이트(BodyTaillights: 옆 ±0.64, 바닥에서 1.10~1.14, 뒤 1.53~1.62)는 뒤 데크 위에 있어, 거기서 바로 시작하면
 * 위에서 내려다보는 카메라에서 띠가 차 뒷면을 덮는다. 그래서 테일라이트 바로 아래, 차 뒷면 끝(뒤 1.94)에서 시작한다.
 */
export const TAILLIGHTS = [
  { lateral: -0.5, height: 1.0, forward: -1.95 },
  { lateral: 0.5, height: 1.0, forward: -1.95 },
] as const;

/** 엔딩 아래에 적는 출처. CC BY 4.0은 저작자·라이선스·수정 사실 표기를 요구한다 */
export const CAR_CREDIT = {
  title: "Car Concept",
  url: "https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/CarConcept",
  author: "Eric Chadwick, Darmstadt Graphics Group GmbH",
  license: "CC BY 4.0",
  licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
} as const;
```

- [ ] **Step 6: 통과를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4 src/lib/journey/carAsset.test.ts`
Expected: PASS — 6 passed

- [ ] **Step 7: 엔딩 출처 e2e를 은하 출처 테스트 바로 뒤에 넣는다**

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts
  await expect(page.locator("#stop-ending")).toContainText("Gaia DR2: ESA/Gaia/DPAC");
});
```

바꿀 내용:

```ts
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
```

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts -g "출처"`
Expected: FAIL — 차 모델 출처 2 failed(링크가 없다), 은하 출처 2 passed

- [ ] **Step 8: 엔딩에 출처를 적는다**

`src/components/journey/JourneyContent.tsx`에서 찾을 부분:

```tsx
import { renderInline } from "@/lib/inline";
```

바꿀 내용:

```tsx
import { renderInline } from "@/lib/inline";
import { CAR_CREDIT } from "@/lib/journey/carAsset";
```

`src/components/journey/JourneyContent.tsx`에서 찾을 부분:

```tsx
          , Gaia DR2: ESA/Gaia/DPAC
        </p>
```

바꿀 내용:

```tsx
          , Gaia DR2: ESA/Gaia/DPAC
          <br />
          차 모델:{" "}
          <a href={CAR_CREDIT.url} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
            {CAR_CREDIT.title}
          </a>{" "}
          © 2024 {CAR_CREDIT.author},{" "}
          <a href={CAR_CREDIT.licenseUrl} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
            {CAR_CREDIT.license}
          </a>
          , 로고 제거·재질 수정
        </p>
```

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts -g "출처"`
Expected: PASS — 4 passed

- [ ] **Step 9: 전체 확인**

Run: `rtk proxy npx tsc --noEmit` → exit 0
Run: `rtk proxy npx vitest run --maxWorkers=4` → `Tests  263 passed (263)`
Run: `rtk proxy npx eslint scripts/build-car.ts src/lib/journey/carAsset.ts src/lib/journey/carAsset.test.ts src/components/journey/JourneyContent.tsx e2e/journey.e2e.ts eslint.config.mjs` → exit 0
Run: `rtk proxy npx eslint .`의 오류가 HEAD와 같은 기존 6개(`src/app/about/page.tsx` 2, `src/app/blog/[slug]/page.tsx` 1, `src/components/Background3D.tsx` 3)뿐인지 본다(복사한 디코더 파일은 무시 목록에 있다)

- [ ] **Step 10: 커밋 정리를 제출한다**

`public/journey/car/`와 `public/journey/decoders/`의 바이너리도 표에 넣는다(3.2MB + 0.9MB). 초안 예:

```
feat: 여정 차 모델(Car Concept) 준비 스크립트와 출처 추가

- Khronos 샘플을 고정 커밋에서 받아 해시를 확인하고 로고를 빼고 다크 메탈릭 변형만 남긴다
- 유리 투과를 반투명으로 바꿔 투과 패스의 드로콜(약 19개)을 없앤다
- Draco·Basis 디코더를 CDN이 아니라 public에서 내보낸다
- CC BY 4.0에 따라 저작자·라이선스·수정 사실을 엔딩에 적는다
```

---

### Task 7: 분위기와 별 먼지를 길에 맞춘다

스펙 3절 "막별 분위기"와 "배경: 우주"다. 분위기는 렌더 단계 대신 궤적 색 전환(`trailMix(carS)`)을 따라 1막(주황) → 2막(보라) → 3막(파랑)으로 보간하고, 엔딩에서 주변을 어둡게 하고 은하를 가장 밝게 한다. 환경 반사 세기(`environment`)를 더한다. 별 먼지는 도로 가장자리에서 12m 넘게 떨어진 양옆에만 두어 차와 카메라가 지나는 길에서 비킨다(2-2에서 카메라 앞 먼지가 큰 원으로 보이던 문제). 옛 회랑 장면은 Task 9까지 이 값을 그대로 쓴다.

**Files:**
- Modify: `src/lib/journey/atmosphere.ts`, `src/lib/journey/atmosphere.test.ts`, `src/lib/journey/space.ts`, `src/lib/journey/space.test.ts`

**Interfaces:**
- Consumes: Task 3 `carSAt`, `driveAt`, `roadFrame`, `ROAD_START`, `ROAD_END`; Task 4 `trailMix`, `TRAIL_MIX_START`, `TRAIL_MIX_END`
- Produces: `Atmosphere`에 `environment` 추가, `ATMOSPHERES { act1, act2, act3, overview }`, `atmosphereAt(p)`; `DUST_CLEARANCE`(12), `dustField(count, seed)`(도로 양옆), `GALAXY_URL`·`SKY_ROTATION`·`DUST_COUNT`·`seededRandom`는 그대로

- [ ] **Step 1: 분위기 테스트를 바꾼다**

`src/lib/journey/atmosphere.test.ts` 전체:

```ts
import { describe, expect, it } from "vitest";
import { ATMOSPHERES, atmosphereAt, mixAtmosphere } from "./atmosphere";
import { carSAt } from "./drive";
import { OVERVIEW_ARRIVAL, STOP_RANGES, rangeOf } from "./timeline";
import { TRAIL_MIX_END, TRAIL_MIX_START } from "./trail";

function middle(id: string): number {
  const range = rangeOf(id);
  return (range.start + range.end) / 2;
}

describe("분위기", () => {
  it("1막과 3막에서는 그 막의 값 그대로다", () => {
    expect(atmosphereAt(middle("kokoa-clone"))).toEqual(ATMOSPHERES.act1);
    expect(atmosphereAt(middle("pickcare"))).toEqual(ATMOSPHERES.act3);
  });

  it("궤적 색이 보라가 되는 자리에서 2막 값이다", () => {
    let progress = 0;
    while (carSAt(progress) < (TRAIL_MIX_START + TRAIL_MIX_END) / 2) progress += 1e-5;
    const atmosphere = atmosphereAt(progress);
    expect(atmosphere.fogFar).toBeCloseTo(ATMOSPHERES.act2.fogFar, 0);
    expect(atmosphere.galaxy).toBeCloseTo(ATMOSPHERES.act2.galaxy, 2);
  });

  it("엔딩 끝에서는 내려다보는 값이다", () => {
    expect(atmosphereAt(1)).toEqual(ATMOSPHERES.overview);
  });

  it("카메라가 내려다보기를 마치는 순간 분위기도 내려다보는 값이다", () => {
    const ending = rangeOf("ending");
    expect(atmosphereAt(ending.start + (ending.end - ending.start) * OVERVIEW_ARRIVAL)).toEqual(ATMOSPHERES.overview);
  });

  it("엔딩은 3막 값에서 출발한다", () => {
    expect(atmosphereAt(rangeOf("ending").start)).toEqual(ATMOSPHERES.act3);
  });

  it("정류장 경계에서 튀지 않는다", () => {
    for (const range of STOP_RANGES.slice(1)) {
      const before = atmosphereAt(range.start - 1e-7);
      const after = atmosphereAt(range.start + 1e-7);
      expect(Math.abs(before.fogFar - after.fogFar), range.stop.id).toBeLessThan(1e-3);
      expect(Math.abs(before.keyIntensity - after.keyIntensity), range.stop.id).toBeLessThan(1e-4);
    }
  });

  it("배경이 우주라 안개색은 모두 어둡다(먼 길이 은하 앞에서 어둠으로 사라진다)", () => {
    for (const atmosphere of Object.values(ATMOSPHERES)) expect(Math.max(...atmosphere.fogColor)).toBeLessThan(0.15);
  });

  it("엔딩에서 은하가 가장 밝고 주변 빛은 가장 어둡다", () => {
    for (const name of ["act1", "act2", "act3"] as const) {
      expect(ATMOSPHERES.overview.galaxy).toBeGreaterThan(ATMOSPHERES[name].galaxy);
      expect(ATMOSPHERES.overview.keyIntensity).toBeLessThan(ATMOSPHERES[name].keyIntensity);
    }
  });

  it("1막 안개는 주황 기운, 3막 안개는 푸른 기운이다", () => {
    const [r1, , b1] = ATMOSPHERES.act1.fogColor;
    const [r3, , b3] = ATMOSPHERES.act3.fogColor;
    expect(r1).toBeGreaterThan(b1);
    expect(b3).toBeGreaterThan(r3);
  });

  it("섞기는 양 끝에서 원래 값을 돌려준다", () => {
    expect(mixAtmosphere(ATMOSPHERES.act1, ATMOSPHERES.act3, 0)).toEqual(ATMOSPHERES.act1);
    expect(mixAtmosphere(ATMOSPHERES.act1, ATMOSPHERES.act3, 1)).toEqual(ATMOSPHERES.act3);
  });

  it("색은 모두 0~1 sRGB다", () => {
    for (const atmosphere of Object.values(ATMOSPHERES)) {
      for (const color of [atmosphere.fogColor, atmosphere.sky, atmosphere.ground, atmosphere.key]) {
        for (const channel of color) {
          expect(channel).toBeGreaterThanOrEqual(0);
          expect(channel).toBeLessThanOrEqual(1);
        }
      }
    }
  });
});
```

Run: `rtk proxy npx vitest run --maxWorkers=4 src/lib/journey/atmosphere.test.ts`
Expected: FAIL — `ATMOSPHERES.act1`이 없다(undefined와 비교 실패)

- [ ] **Step 2: 분위기를 고친다**

`src/lib/journey/atmosphere.ts` 전체:

```ts
import { carSAt } from "./drive";
import { overviewWeight } from "./timeline";
import { trailMix } from "./trail";

/**
 * 조명·안개·은하 밝기(스펙 3절 "막별 분위기"). 차가 선 자리의 궤적 색 전환(trail.ts trailMix)으로 세 막의 값을 보간하고,
 * 엔딩에서는 길 전체를 내려다보는 값으로 넘어간다. 배경은 어느 막이든 우주(은하 사진)다.
 * three를 import하지 않는 순수 함수다.
 */

/** sRGB 0~1 */
export type Rgb = readonly [number, number, number];

export interface Atmosphere {
  /** 안개 색. 배경이 우주라 어둡다. 먼 길은 은하 앞에서 이 색으로 사라진다 */
  fogColor: Rgb;
  fogNear: number;
  fogFar: number;
  sky: Rgb;
  ground: Rgb;
  hemisphere: number;
  key: Rgb;
  keyIntensity: number;
  /** 은하 배경의 밝기(scene.backgroundIntensity) */
  galaxy: number;
  /** 환경 반사의 세기(scene.environmentIntensity). 차 도장과 노면에 비친다 */
  environment: number;
}

function hex(value: string): Rgb {
  const n = Number.parseInt(value.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export const ATMOSPHERES = {
  /** 1막: 따뜻한 주황빛과 주황 기운의 안개 */
  act1: {
    fogColor: hex("#1c0e06"),
    fogNear: 30,
    fogFar: 140,
    sky: hex("#ffb27a"),
    ground: hex("#2a1206"),
    hemisphere: 0.9,
    key: hex("#ffc694"),
    keyIntensity: 2.2,
    galaxy: 0.9,
    environment: 0.9,
  },
  /** 2막: 주황과 파랑이 섞인 보랏빛(궤적 색의 가운데와 같다) */
  act2: {
    fogColor: hex("#130a1e"),
    fogNear: 35,
    fogFar: 170,
    sky: hex("#cfa8ff"),
    ground: hex("#1a0f2a"),
    hemisphere: 0.9,
    key: hex("#ead2ff"),
    keyIntensity: 2,
    galaxy: 1,
    environment: 0.9,
  },
  /** 3막: 푸른빛과 미래 도시의 분위기 */
  act3: {
    fogColor: hex("#06101f"),
    fogNear: 40,
    fogFar: 200,
    sky: hex("#9cc8ff"),
    ground: hex("#061428"),
    hemisphere: 1,
    key: hex("#c4e2ff"),
    keyIntensity: 2.2,
    galaxy: 1.1,
    environment: 1,
  },
  /** 엔딩: 주변은 어둡게, 은하와 완성된 빛의 길을 강조한다. 안개를 멀리 밀어 길 전체가 보인다 */
  overview: {
    fogColor: hex("#03050a"),
    fogNear: 300,
    fogFar: 900,
    sky: hex("#c8d4e8"),
    ground: hex("#05070d"),
    hemisphere: 0.35,
    key: hex("#dfe8ff"),
    keyIntensity: 0.6,
    galaxy: 1.35,
    environment: 0.5,
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
    fogColor: mixRgb(a.fogColor, b.fogColor, t),
    fogNear: lerp(a.fogNear, b.fogNear, t),
    fogFar: lerp(a.fogFar, b.fogFar, t),
    sky: mixRgb(a.sky, b.sky, t),
    ground: mixRgb(a.ground, b.ground, t),
    hemisphere: lerp(a.hemisphere, b.hemisphere, t),
    key: mixRgb(a.key, b.key, t),
    keyIntensity: lerp(a.keyIntensity, b.keyIntensity, t),
    galaxy: lerp(a.galaxy, b.galaxy, t),
    environment: lerp(a.environment, b.environment, t),
  };
}

/** 스크롤 진행률(0~1)의 분위기. 궤적 색과 같은 전환(앞 절반 1막 → 2막, 뒤 절반 2막 → 3막)을 따른다 */
export function atmosphereAt(progress: number): Atmosphere {
  const m = trailMix(carSAt(progress));
  const base =
    m <= 0.5
      ? mixAtmosphere(ATMOSPHERES.act1, ATMOSPHERES.act2, m * 2)
      : mixAtmosphere(ATMOSPHERES.act2, ATMOSPHERES.act3, m * 2 - 1);
  return mixAtmosphere(base, ATMOSPHERES.overview, overviewWeight(progress));
}
```

Run: `rtk proxy npx vitest run --maxWorkers=4 src/lib/journey/atmosphere.test.ts`
Expected: PASS — 11 passed

- [ ] **Step 3: 먼지 테스트를 바꾼다**

`src/lib/journey/space.test.ts` 전체:

```ts
import { describe, expect, it } from "vitest";
import { ROAD_END, ROAD_START, driveAt, roadFrame } from "./drive";
import { DUST_CLEARANCE, DUST_COUNT, SKY_ROTATION, dustField, seededRandom } from "./space";

const dust = dustField(DUST_COUNT, 7);

/** 점에서 도로 중심선까지의 수평 거리와 그 자리 s(거친 탐색 뒤 좁힌다) */
function nearestRoad(point: [number, number, number]): { s: number; distance: number } {
  let best = { s: ROAD_START, distance: Infinity };
  for (let s = ROAD_START; s <= ROAD_END; s += 2) {
    const [x, , z] = roadFrame(s).position;
    const distance = Math.hypot(point[0] - x, point[2] - z);
    if (distance < best.distance) best = { s, distance };
  }
  for (let s = best.s - 2; s <= best.s + 2; s += 0.05) {
    const [x, , z] = roadFrame(s).position;
    const distance = Math.hypot(point[0] - x, point[2] - z);
    if (distance < best.distance) best = { s, distance };
  }
  return best;
}

describe("우주", () => {
  it("같은 씨앗이면 같은 수열을 준다", () => {
    const a = seededRandom(7);
    const b = seededRandom(7);
    const c = seededRandom(8);
    const first = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(first);
    expect([c(), c(), c()]).not.toEqual(first);
    for (const value of first) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("같은 씨앗이면 같은 자리에 먼지를 둔다", () => {
    expect(dustField(50, 3)).toEqual(dustField(50, 3));
    expect(dust).toHaveLength(DUST_COUNT * 3);
  });

  it("별 먼지는 도로 가장자리에서 DUST_CLEARANCE 넘게 떨어져 있다", () => {
    for (let i = 0; i < DUST_COUNT; i += 3) {
      const point: [number, number, number] = [dust[3 * i], dust[3 * i + 1], dust[3 * i + 2]];
      const { s, distance } = nearestRoad(point);
      expect(distance - roadFrame(s).width / 2, `먼지 ${i}`).toBeGreaterThan(DUST_CLEARANCE * 0.9);
    }
  });

  it("카메라가 지나는 자리(주행·정류장·엔딩 상승)는 먼지에서 6m 넘게 떨어져 있다", () => {
    for (let p = 0; p <= 1; p += 0.002) {
      const camera = driveAt(p).camera.position;
      let nearest = Infinity;
      for (let i = 0; i < DUST_COUNT; i++) {
        nearest = Math.min(nearest, Math.hypot(dust[3 * i] - camera[0], dust[3 * i + 1] - camera[1], dust[3 * i + 2] - camera[2]));
      }
      expect(nearest, `p=${p.toFixed(3)}`).toBeGreaterThan(6);
    }
  });

  it("하늘 방향은 x축으로 기울여 은하수 띠가 도로 앞쪽에 오게 한다", () => {
    expect(SKY_ROTATION).toEqual([1.2, 0, 0]);
  });
});
```

Run: `rtk proxy npx vitest run --maxWorkers=4 src/lib/journey/space.test.ts`
Expected: FAIL — `DUST_CLEARANCE`가 없고, 회랑 안의 먼지가 도로 가장자리에 가깝고 카메라 경로와 6m 안에 있다

- [ ] **Step 4: 먼지를 길 밖으로 옮긴다**

`src/lib/journey/space.ts` 전체:

```ts
import { ROAD_END, ROAD_START, roadFrame } from "./drive";
import type { Vec3 } from "./timeline";

/**
 * 우주 배경(스펙 3절 "배경: 우주"). 하늘은 NASA 은하수 사진(public/journey/galaxy.webp, scripts/build-galaxy.ts),
 * 길 주변에는 별 먼지가 떠다닌다. three를 import하지 않는 순수 코드다.
 */

export const GALAXY_URL = "/journey/galaxy.webp";

/** 하늘의 방향(라디안, x·y·z). 은하수 띠가 도로가 뻗는 앞쪽(−z)에 걸리도록 x축으로 기울인다 */
export const SKY_ROTATION: Vec3 = [1.2, 0, 0];

export const DUST_COUNT = 700;
/** 먼지는 도로 가장자리에서 이만큼(m) 넘게 떨어진 곳에만 둔다. 차와 카메라가 지나는 길을 비켜 가까운 먼지가 큰 원으로 보이지 않게 한다 */
export const DUST_CLEARANCE = 12;
/** 가장자리 너머로 먼지가 퍼지는 폭(m)과, 노면 기준 높이 범위(m) */
const DUST_SPREAD = 45;
const DUST_HEIGHT: readonly [number, number] = [-18, 12];

/** 같은 씨앗이면 같은 수열을 주는 난수(mulberry32). 렌더 중 Math.random을 쓰지 않고, 매번 같은 자리에 먼지를 둔다 */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 도로 양옆, 가장자리에서 DUST_CLEARANCE 너머에 흩어진 별 먼지 자리. 옆 방향은 수평(뱅킹을 따르지 않는다)이다 */
export function dustField(count: number, seed: number): Float32Array {
  const random = seededRandom(seed);
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const s = ROAD_START + random() * (ROAD_END - ROAD_START);
    const frame = roadFrame(s);
    const side = random() < 0.5 ? -1 : 1;
    const offset = side * (frame.width / 2 + DUST_CLEARANCE + random() * DUST_SPREAD);
    const flat = Math.hypot(frame.tangent[0], frame.tangent[2]);
    const right: Vec3 = [-frame.tangent[2] / flat, 0, frame.tangent[0] / flat];
    const height = DUST_HEIGHT[0] + random() * (DUST_HEIGHT[1] - DUST_HEIGHT[0]);
    positions.set(
      [frame.position[0] + right[0] * offset, frame.position[1] + height, frame.position[2] + right[2] * offset],
      i * 3,
    );
  }
  return positions;
}
```

Run: `rtk proxy npx vitest run --maxWorkers=4 src/lib/journey/space.test.ts`
Expected: PASS — 5 passed

- [ ] **Step 5: 전체 확인**

Run: `rtk proxy npx tsc --noEmit` → exit 0
Run: `rtk proxy npx vitest run --maxWorkers=4` → `Tests  266 passed (266)`
Run: `rtk proxy npx eslint src/lib/journey/atmosphere.ts src/lib/journey/atmosphere.test.ts src/lib/journey/space.ts src/lib/journey/space.test.ts` → exit 0

- [ ] **Step 6: 커밋 정리를 제출한다**

```
feat: 여정 분위기와 별 먼지를 도로 세계에 맞춤

- 막별 조명·안개·은하 밝기를 궤적 색 전환과 같은 기준으로 보간한다
- 별 먼지를 도로 가장자리 12m 밖으로 옮겨 카메라 앞에서 큰 원으로 보이지 않게 한다
```

---

### Task 8: 빛줄기 계산과 차·실루엣 모듈

스펙 3절 "차"의 빛줄기·불빛·실패 대체를 장면에 올리기 전에 three 객체 단위로 만든다. 빛줄기는 차 뒷면 두 곳에서 도로 곡률을 따라 뒤로 남는 카메라 향 띠다(정점 배열만 계산하는 순수 코드). 차 모듈은 glTF 부품을 같은 재질·같은 정점 속성끼리 합치고(드로콜 = 재질 수), 바퀴 바닥을 노면(y = 0)에 맞추고, 불빛 재질을 이름으로 찾는다. 자세는 glTF 규칙(+Z 앞, +X 왼쪽)대로 도로 자세에 맞춘다. 실루엣은 옆모습 윤곽을 차 폭만큼 밀어낸 모서리 선과 불빛 막대다.

**Files:**
- Create: `src/lib/journey/streaks.ts`, `src/lib/journey/streaks.test.ts`
- Create: `src/components/journey/scene/carModel.ts`, `carModel.test.ts`, `silhouette.ts`, `silhouette.test.ts`

**Interfaces:**
- Consumes: Task 3 `driveAt`, `roadFrame`, `roadPoint`, `DriveState`, `RoadFrame`; Task 4 `streakLength`, `trailColor`, `carLightLevel`, `HEADLIGHT_HEX`, `hexToLinear`; Task 6 `TAILLIGHTS`, `CAR_LIGHT_MATERIALS`, `CAR_LIGHT_INTENSITY`
- Produces: `STREAK_SEGMENTS`, `STREAK_WIDTH`, `STREAK_INTENSITY`, `STREAK_VERTICES`, `streakIndices()`, `writeStreaks(state, camera, positions, colors)`; `PreparedCar { object, headlights, taillights, dispose }`, `prepareCar(scene)`, `placeCar(object, state)`, `applyCarLights(headlights, taillights, state)`; `Silhouette { object, outline, headlights, taillights, dispose }`, `createSilhouette()`, `paintSilhouette(silhouette, state)`

- [ ] **Step 1: 빛줄기 테스트를 쓴다**

`src/lib/journey/streaks.test.ts` 전체:

```ts
import { describe, expect, it } from "vitest";
import { TAILLIGHTS } from "./carAsset";
import { driveAt, roadPoint } from "./drive";
import { STREAK_SEGMENTS, STREAK_VERTICES, STREAK_WIDTH, streakIndices, writeStreaks } from "./streaks";
import { rangeOf, type Vec3 } from "./timeline";
import { streakLength, trailColor } from "./trail";

function at(id: string, t: number): number {
  const range = rangeOf(id);
  return range.start + (range.end - range.start) * t;
}

function write(progress: number) {
  const state = driveAt(progress);
  const positions = new Float32Array(STREAK_VERTICES * 3);
  const colors = new Float32Array(STREAK_VERTICES * 3);
  writeStreaks(state, state.camera.position, positions, colors);
  return { state, positions, colors };
}

function vertex(array: Float32Array, light: number, step: number, edge: number): Vec3 {
  const index = ((light * (STREAK_SEGMENTS + 1) + step) * 2 + edge) * 3;
  return [array[index], array[index + 1], array[index + 2]];
}

function middle(a: Vec3, b: Vec3): Vec3 {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
}

describe("빛줄기", () => {
  it("인덱스가 정점 안에 있다", () => {
    const indices = streakIndices();
    expect(indices.length).toBe(TAILLIGHTS.length * STREAK_SEGMENTS * 6);
    expect(Math.max(...indices)).toBe(STREAK_VERTICES - 1);
  });

  it("테일라이트에서 시작해 도로를 따라 길이만큼 뒤로 남는다", () => {
    const { state, positions } = write(at("kokoa-clone", 0.5));
    const length = streakLength(state.progress);
    TAILLIGHTS.forEach((light, index) => {
      const head = middle(vertex(positions, index, 0, 0), vertex(positions, index, 0, 1));
      const tail = middle(vertex(positions, index, STREAK_SEGMENTS, 0), vertex(positions, index, STREAK_SEGMENTS, 1));
      const expectedHead = roadPoint(state.carS + light.forward, light.lateral, light.height);
      const expectedTail = roadPoint(state.carS + light.forward - length, light.lateral, light.height);
      expect(Math.hypot(...head.map((value, axis) => value - expectedHead[axis]))).toBeLessThan(1e-3);
      expect(Math.hypot(...tail.map((value, axis) => value - expectedTail[axis]))).toBeLessThan(1e-3);
    });
  });

  it("머리는 궤적 색이고 꼬리로 갈수록 어두워진다", () => {
    const { state, colors } = write(at("tix2u", 0.1));
    const color = trailColor(state.carS);
    const head = vertex(colors, 0, 0, 0);
    expect(head[0] / head[2]).toBeCloseTo(color[0] / color[2], 5);
    let previous = Infinity;
    for (let step = 0; step <= STREAK_SEGMENTS; step++) {
      const value = vertex(colors, 0, step, 0)[2];
      expect(value).toBeLessThanOrEqual(previous);
      previous = value;
    }
    expect(previous).toBe(0);
  });

  it("폭은 머리에서 STREAK_WIDTH이고 카메라를 향한다", () => {
    const { state, positions } = write(at("kokoa-clone", 0.5));
    const left = vertex(positions, 0, 0, 0);
    const right = vertex(positions, 0, 0, 1);
    const across: Vec3 = [right[0] - left[0], right[1] - left[1], right[2] - left[2]];
    expect(Math.hypot(...across)).toBeCloseTo(STREAK_WIDTH, 5);
    const center = middle(left, right);
    const toCamera = state.camera.position.map((value, axis) => value - center[axis]);
    expect(Math.abs(across[0] * toCamera[0] + across[1] * toCamera[1] + across[2] * toCamera[2])).toBeLessThan(1e-3);
  });

  it("정류장에 서 있으면 보이지 않는다", () => {
    const { colors } = write(at("pfplay", 0.5));
    expect(colors.every((value) => value === 0)).toBe(true);
  });
});
```

Run: `rtk proxy npx vitest run --maxWorkers=4 src/lib/journey/streaks.test.ts`
Expected: FAIL — `Error: Cannot find module './streaks'`

- [ ] **Step 2: 빛줄기를 구현한다**

`src/lib/journey/streaks.ts` 전체:

```ts
import { TAILLIGHTS } from "./carAsset";
import { roadFrame, type DriveState } from "./drive";
import type { Vec3 } from "./timeline";
import { carLightLevel, streakLength, trailColor } from "./trail";

/**
 * 테일라이트 빛줄기(스펙 3절 "차"). 테일라이트 두 곳에서 도로를 따라 뒤로 남는 띠를 매 프레임 다시 계산한다.
 * 띠는 도로 곡률을 따라 휘고, 늘 카메라를 향한다. 색은 trailColor(carS)이고 꼬리로 갈수록 어두워진다(더하기 혼합이라 검정은 투명이다).
 * 길이는 진행률의 주행 속도 곡선(trail.ts streakLength)에서 정해진다. three 없이 정점 배열만 채운다(scene/Streaks.tsx).
 */

/** 띠 하나를 자르는 칸 수 */
export const STREAK_SEGMENTS = 24;
/** 띠 폭(m) */
export const STREAK_WIDTH = 0.06;
/** 띠 머리의 발광 세기(선형 HDR) */
export const STREAK_INTENSITY = 3;

/** 정점 수: 띠 두 줄 × (칸 + 1) × 양쪽 가장자리 */
export const STREAK_VERTICES = TAILLIGHTS.length * (STREAK_SEGMENTS + 1) * 2;

/** 띠 두 줄의 삼각형 인덱스. 바뀌지 않는다 */
export function streakIndices(): Uint16Array {
  const indices: number[] = [];
  for (let light = 0; light < TAILLIGHTS.length; light++) {
    for (let segment = 0; segment < STREAK_SEGMENTS; segment++) {
      const a = (light * (STREAK_SEGMENTS + 1) + segment) * 2;
      indices.push(a, a + 1, a + 3, a, a + 3, a + 2);
    }
  }
  return Uint16Array.from(indices);
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

/**
 * 진행 상태와 카메라 자리로 띠의 정점 자리(positions, 3개씩)와 색(colors, 3개씩)을 채운다.
 * 길이가 0이면(정류장에 서 있으면) 색을 모두 0으로 둬 보이지 않는다.
 */
export function writeStreaks(state: DriveState, camera: Vec3, positions: Float32Array, colors: Float32Array): void {
  const length = streakLength(state.progress);
  const color = trailColor(state.carS);
  const level = STREAK_INTENSITY * carLightLevel(state.ending);
  TAILLIGHTS.forEach((light, lightIndex) => {
    for (let step = 0; step <= STREAK_SEGMENTS; step++) {
      const along = step / STREAK_SEGMENTS;
      const s = state.carS + light.forward - length * along;
      const frame = roadFrame(s);
      const center: Vec3 = [
        frame.position[0] + frame.right[0] * light.lateral + frame.up[0] * light.height,
        frame.position[1] + frame.right[1] * light.lateral + frame.up[1] * light.height,
        frame.position[2] + frame.right[2] * light.lateral + frame.up[2] * light.height,
      ];
      let side = cross(frame.tangent, sub(camera, center));
      const size = Math.hypot(...side);
      side = size > 1e-6 ? [side[0] / size, side[1] / size, side[2] / size] : frame.up;
      const fade = length > 0 ? Math.pow(1 - along, 2) * level : 0;
      const width = (STREAK_WIDTH / 2) * (1 - 0.6 * along);
      for (let edge = 0; edge < 2; edge++) {
        const sign = edge === 0 ? -1 : 1;
        const vertex = (lightIndex * (STREAK_SEGMENTS + 1) + step) * 2 + edge;
        positions[vertex * 3] = center[0] + side[0] * width * sign;
        positions[vertex * 3 + 1] = center[1] + side[1] * width * sign;
        positions[vertex * 3 + 2] = center[2] + side[2] * width * sign;
        colors[vertex * 3] = color[0] * fade;
        colors[vertex * 3 + 1] = color[1] * fade;
        colors[vertex * 3 + 2] = color[2] * fade;
      }
    }
  });
}
```

Run: `rtk proxy npx vitest run --maxWorkers=4 src/lib/journey/streaks.test.ts`
Expected: PASS — 5 passed

- [ ] **Step 3: 차 모듈 테스트를 쓴다**

`src/components/journey/scene/carModel.test.ts` 전체:

```ts
import { describe, expect, it } from "vitest";
import { Box3, BoxGeometry, Group, Matrix4, Mesh, MeshStandardMaterial, Vector3 } from "three";
import { CAR_LIGHT_INTENSITY, CAR_LIGHT_MATERIALS } from "@/lib/journey/carAsset";
import { driveAt } from "@/lib/journey/drive";
import { rangeOf } from "@/lib/journey/timeline";
import { HEADLIGHT_HEX, carLightLevel, hexToLinear, trailColor } from "@/lib/journey/trail";
import { applyCarLights, placeCar, prepareCar } from "./carModel";

function material(name: string): MeshStandardMaterial {
  const result = new MeshStandardMaterial();
  result.name = name;
  return result;
}

/** glTF처럼 z가 위인 부품을 y가 위로 돌리는 뿌리 아래에 부품을 단다. 바퀴 바닥은 원점보다 0.16m 아래다 */
function fakeCar(lights = true) {
  const paint = material("Paint");
  const root = new Group();
  root.matrixAutoUpdate = false;
  root.matrix.copy(new Matrix4().set(1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1));
  const parts: [MeshStandardMaterial, [number, number, number]][] = [
    [paint, [0, 0, 0.5]],
    [paint, [0, 1.5, 0.5]],
    [paint, [0, -1.5, 0.34]],
  ];
  if (lights) parts.push([material(CAR_LIGHT_MATERIALS.head), [0, -2, 0.6]], [material(CAR_LIGHT_MATERIALS.tail), [0, 2, 0.9]]);
  for (const [partMaterial, position] of parts) {
    const mesh = new Mesh(new BoxGeometry(1, 1, 1), partMaterial);
    mesh.position.set(...position);
    root.add(mesh);
  }
  const scene = new Group();
  scene.add(root);
  return { scene, paint };
}

describe("차 모델 준비", () => {
  it("같은 재질의 부품을 메시 하나로 합친다(드로콜이 재질 수가 된다)", () => {
    const car = prepareCar(fakeCar().scene);
    expect(car.object.children).toHaveLength(3);
    expect(car.headlights.map((item) => item.name)).toEqual([CAR_LIGHT_MATERIALS.head]);
    expect(car.taillights.map((item) => item.name)).toEqual([CAR_LIGHT_MATERIALS.tail]);
  });

  it("뿌리의 회전을 반영하고, 가장 낮은 점을 노면(y = 0)에 맞춘다", () => {
    const car = prepareCar(fakeCar().scene);
    const bounds = new Box3().setFromObject(car.object);
    expect(bounds.min.y).toBeCloseTo(0, 6);
    // z가 위인 부품 높이(0.34~1.4)가 y로 바뀌어 높이 범위가 1.06 + 0.5(상자) = 1.56이 된다
    expect(bounds.max.y - bounds.min.y).toBeCloseTo(1.56, 6);
    // 부품의 y(길이 방향, −2~2)는 −z로 간다
    expect(bounds.max.z - bounds.min.z).toBeCloseTo(5, 6);
  });

  it("불빛 재질이 없으면 알린다", () => {
    expect(() => prepareCar(fakeCar(false).scene)).toThrow("불빛 재질");
  });
});

describe("차 자세와 불빛", () => {
  const range = rangeOf("todo-app");
  const state = driveAt((range.start + range.end) / 2);

  it("차의 앞(+Z)이 도로 접선, 위(+Y)가 노면 위, 왼쪽(+X)이 도로 왼쪽을 향하고 차 자리에 선다", () => {
    const object = new Group();
    placeCar(object, state);
    object.updateMatrixWorld();
    const axis = (x: number, y: number, z: number) => new Vector3(x, y, z).applyQuaternion(object.quaternion).toArray();
    axis(0, 0, 1).forEach((value, index) => expect(value).toBeCloseTo(state.car.tangent[index], 6));
    axis(0, 1, 0).forEach((value, index) => expect(value).toBeCloseTo(state.car.up[index], 6));
    axis(1, 0, 0).forEach((value, index) => expect(value).toBeCloseTo(-state.car.right[index], 6));
    expect(object.position.toArray()).toEqual(state.car.position);
  });

  it("헤드라이트는 주황, 테일라이트는 지금 자리의 궤적 색이다", () => {
    const head = new MeshStandardMaterial();
    const tail = new MeshStandardMaterial();
    applyCarLights([head], [tail], state);
    hexToLinear(HEADLIGHT_HEX).forEach((value, index) => expect(head.emissive.toArray()[index]).toBeCloseTo(value, 6));
    trailColor(state.carS).forEach((value, index) => expect(tail.emissive.toArray()[index]).toBeCloseTo(value, 6));
    expect(head.emissiveIntensity).toBe(CAR_LIGHT_INTENSITY.head);
    expect(tail.emissiveIntensity).toBe(CAR_LIGHT_INTENSITY.tail);
  });

  it("엔딩에서는 불빛을 낮춘다", () => {
    const head = new MeshStandardMaterial();
    const tail = new MeshStandardMaterial();
    applyCarLights([head], [tail], driveAt(1));
    expect(head.emissiveIntensity).toBeCloseTo(CAR_LIGHT_INTENSITY.head * carLightLevel(1), 9);
    expect(tail.emissiveIntensity).toBeCloseTo(CAR_LIGHT_INTENSITY.tail * carLightLevel(1), 9);
  });
});
```

Run: `rtk proxy npx vitest run --maxWorkers=4 src/components/journey/scene/carModel.test.ts`
Expected: FAIL — `Error: Cannot find module './carModel'`

- [ ] **Step 4: 차 모듈을 구현한다**

`src/components/journey/scene/carModel.ts` 전체:

```ts
import { Box3, Color, Group, Matrix4, Mesh, Quaternion, Vector3, type BufferGeometry, type Material, type MeshStandardMaterial, type Object3D } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { CAR_LIGHT_INTENSITY, CAR_LIGHT_MATERIALS } from "@/lib/journey/carAsset";
import type { DriveState } from "@/lib/journey/drive";
import { HEADLIGHT_HEX, carLightLevel, hexToLinear, trailColor } from "@/lib/journey/trail";

/**
 * 차 모델을 장면에 맞게 준비한다. glTF 부품(약 100개)을 재질별로 합쳐 드로콜을 재질 수 남짓(18)으로 줄이고,
 * 바퀴 바닥이 y = 0에 닿게 올리고, 불빛 재질(헤드라이트·테일라이트)을 찾아 둔다.
 * 바퀴는 돌지 않으므로(주행 시뮬레이션 없음) 합쳐도 된다.
 */

export interface PreparedCar {
  object: Group;
  headlights: MeshStandardMaterial[];
  taillights: MeshStandardMaterial[];
  dispose(): void;
}

function isMesh(object: Object3D): object is Mesh<BufferGeometry, Material> {
  return (object as Mesh).isMesh === true && !Array.isArray((object as Mesh).material);
}

/** 같은 재질이고 정점 속성 구성이 같은 메시끼리 합친다(속성이 다르면 합칠 수 없다) */
export function prepareCar(scene: Object3D): PreparedCar {
  scene.updateMatrixWorld(true);
  const toRoot = new Matrix4().copy(scene.matrixWorld).invert();
  const groups = new Map<string, { material: Material; geometries: BufferGeometry[] }>();
  scene.traverse((child) => {
    if (!isMesh(child)) return;
    const geometry = child.geometry.clone();
    geometry.applyMatrix4(new Matrix4().multiplyMatrices(toRoot, child.matrixWorld));
    const key = `${child.material.uuid}|${Object.keys(geometry.attributes).sort().join(",")}|${geometry.index ? "i" : "n"}`;
    const group = groups.get(key) ?? { material: child.material, geometries: [] };
    group.geometries.push(geometry);
    groups.set(key, group);
  });
  const object = new Group();
  object.name = "journey-car-model";
  const merged: BufferGeometry[] = [];
  const bounds = new Box3();
  for (const { material, geometries } of groups.values()) {
    const geometry = mergeGeometries(geometries, false);
    for (const part of geometries) part.dispose();
    if (!geometry) throw new Error(`차 부품을 합치지 못했습니다(재질 ${material.name})`);
    geometry.computeBoundingBox();
    if (geometry.boundingBox) bounds.union(geometry.boundingBox);
    merged.push(geometry);
    object.add(new Mesh(geometry, material));
  }
  // 모델 원점은 바퀴 중심 높이 근처라 바퀴가 노면 아래로 들어간다. 가장 낮은 점(타이어 바닥)을 노면에 맞춘다.
  for (const geometry of merged) geometry.translate(0, -bounds.min.y, 0);
  const byName = (name: string) =>
    [...groups.values()].map((group) => group.material).filter((material) => material.name === name) as MeshStandardMaterial[];
  const headlights = byName(CAR_LIGHT_MATERIALS.head);
  const taillights = byName(CAR_LIGHT_MATERIALS.tail);
  if (headlights.length === 0 || taillights.length === 0) throw new Error("차 모델에 불빛 재질이 없습니다");
  return {
    object,
    headlights,
    taillights,
    dispose: () => merged.forEach((geometry) => geometry.dispose()),
  };
}

const HEADLIGHT = new Color(...hexToLinear(HEADLIGHT_HEX));
const basis = new Matrix4();
const rotation = new Quaternion();
const right = new Vector3();
const up = new Vector3();
const forward = new Vector3();

/** 차(모델·실루엣) 자리를 진행 상태의 차 자세로 놓는다. glTF 차는 +Z가 앞, +X가 왼쪽이다 */
export function placeCar(object: Object3D, state: DriveState): void {
  const { car } = state;
  right.set(-car.right[0], -car.right[1], -car.right[2]);
  up.set(...car.up);
  forward.set(...car.tangent);
  object.quaternion.copy(rotation.setFromRotationMatrix(basis.makeBasis(right, up, forward)));
  object.position.set(...car.position);
}

/** 불빛 색과 세기: 헤드라이트는 늘 주황, 테일라이트는 지금 자리의 궤적 색. 엔딩에서 낮춘다 */
export function applyCarLights(
  headlights: { emissive: Color; emissiveIntensity: number }[],
  taillights: { emissive: Color; emissiveIntensity: number }[],
  state: DriveState,
): void {
  const level = carLightLevel(state.ending);
  for (const material of headlights) {
    material.emissive.copy(HEADLIGHT);
    material.emissiveIntensity = CAR_LIGHT_INTENSITY.head * level;
  }
  const tail = trailColor(state.carS);
  for (const material of taillights) {
    material.emissive.setRGB(tail[0], tail[1], tail[2]);
    material.emissiveIntensity = CAR_LIGHT_INTENSITY.tail * level;
  }
}
```

Run: `rtk proxy npx vitest run --maxWorkers=4 src/components/journey/scene/carModel.test.ts`
Expected: PASS — 6 passed

- [ ] **Step 5: 실루엣 테스트를 쓴다**

`src/components/journey/scene/silhouette.test.ts` 전체(파일 이름은 소문자다. Task 9의 `CarSilhouette.tsx`와 대소문자만 다른 이름을 피한다):

```ts
import { describe, expect, it } from "vitest";
import { Box3, LineSegments } from "three";
import { driveAt } from "@/lib/journey/drive";
import { rangeOf } from "@/lib/journey/timeline";
import { carLightLevel, trailColor } from "@/lib/journey/trail";
import { createSilhouette, paintSilhouette } from "./silhouette";

describe("빛 실루엣", () => {
  it("차만 한 윤곽선과 불빛 막대로 되어 있고 바닥이 노면에 닿는다", () => {
    const silhouette = createSilhouette();
    expect(silhouette.object.children.filter((child) => child instanceof LineSegments)).toHaveLength(1);
    const bounds = new Box3().setFromObject(silhouette.object);
    expect(bounds.max.z - bounds.min.z).toBeCloseTo(4.6, 1);
    expect(bounds.max.x - bounds.min.x).toBeCloseTo(1.9, 1);
    expect(bounds.min.y).toBeGreaterThanOrEqual(0);
    expect(bounds.min.y).toBeLessThan(0.3);
    silhouette.dispose();
  });

  it("윤곽선은 지금 자리의 궤적 색으로 빛나고 엔딩에서 낮아진다", () => {
    const silhouette = createSilhouette();
    const range = rangeOf("kokoa-clone");
    const state = driveAt((range.start + range.end) / 2);
    paintSilhouette(silhouette, state);
    const color = trailColor(state.carS);
    const [r, g, b] = silhouette.outline.color.toArray();
    expect(r / b).toBeCloseTo(color[0] / color[2], 5);
    expect(r).toBeGreaterThan(color[0]);
    expect(silhouette.taillights[0].emissiveIntensity).toBeGreaterThan(1);
    paintSilhouette(silhouette, driveAt(1));
    expect(silhouette.outline.color.b).toBeCloseTo(trailColor(driveAt(1).carS)[2] * 1.8 * carLightLevel(1), 6);
    silhouette.dispose();
  });
});
```

Run: `rtk proxy npx vitest run --maxWorkers=4 src/components/journey/scene/silhouette.test.ts`
Expected: FAIL — `Error: Cannot find module './silhouette'`

- [ ] **Step 6: 실루엣을 구현한다**

`src/components/journey/scene/silhouette.ts` 전체:

```ts
import {
  BoxGeometry,
  EdgesGeometry,
  ExtrudeGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  Shape,
  Vector2,
  type BufferGeometry,
} from "three";
import type { DriveState } from "@/lib/journey/drive";
import { carLightLevel, trailColor } from "@/lib/journey/trail";
import { applyCarLights } from "./carModel";

/**
 * 차 모델·디코더를 받지 못했을 때 대신 그리는 빛 실루엣(스펙 5절 "실패 대응"). 옆모습 윤곽을 차 폭만큼 밀어낸 모서리 선과
 * 헤드라이트·테일라이트 막대뿐이다. 모델과 같은 차 기준(+Z 앞, +X 왼쪽, 바닥 y = 0)이라 같은 자세(placeCar)를 쓴다.
 */

/** 옆모습 윤곽(앞 +, 높이, m). 길이 약 4.6m, 높이 약 1.25m */
const PROFILE: [number, number][] = [
  [-2.3, 0.35],
  [-2.3, 0.85],
  [-1.9, 1.0],
  [-0.9, 1.2],
  [-0.2, 1.25],
  [0.6, 1.05],
  [1.6, 0.85],
  [2.3, 0.62],
  [2.3, 0.35],
  [1.7, 0.25],
  [-1.7, 0.25],
];
const WIDTH = 1.9;
/** 윤곽선 밝기(선형 HDR). 블룸이 살짝 걸린다 */
const OUTLINE_INTENSITY = 1.8;

export interface Silhouette {
  object: Group;
  outline: LineBasicMaterial;
  headlights: MeshStandardMaterial[];
  taillights: MeshStandardMaterial[];
  dispose(): void;
}

export function createSilhouette(): Silhouette {
  const shape = new Shape(PROFILE.map(([forward, height]) => new Vector2(forward, height)));
  const body = new ExtrudeGeometry(shape, { depth: WIDTH, bevelEnabled: false });
  // 윤곽 평면(x = 앞, y = 위)을 차 기준으로 돌리고(앞 → +Z, 밀어낸 쪽 → −X) 가운데로 옮긴다
  body.rotateY(-Math.PI / 2);
  body.translate(WIDTH / 2, 0, 0);
  const edges = new EdgesGeometry(body, 20);
  body.dispose();
  const outline = new LineBasicMaterial({ color: "#ffffff" });
  const object = new Group();
  object.name = "journey-car-silhouette";
  object.add(new LineSegments(edges, outline));

  const light = () => new MeshStandardMaterial({ color: "#000000", emissive: "#000000" });
  const headlight = light();
  const taillight = light();
  const geometries: BufferGeometry[] = [edges];
  for (const [material, forward, height] of [
    [headlight, 2.28, 0.6],
    [taillight, -2.28, 0.8],
  ] as const) {
    const bar = new BoxGeometry(1.5, 0.06, 0.05);
    geometries.push(bar);
    const mesh = new Mesh(bar, material);
    mesh.position.set(0, height, forward);
    object.add(mesh);
  }
  return {
    object,
    outline,
    headlights: [headlight],
    taillights: [taillight],
    dispose: () => {
      geometries.forEach((geometry) => geometry.dispose());
      [outline, headlight, taillight].forEach((material) => material.dispose());
    },
  };
}

/** 실루엣의 윤곽을 지금 자리의 궤적 색으로, 불빛을 모델과 같은 규칙으로 칠한다 */
export function paintSilhouette(silhouette: Silhouette, state: DriveState): void {
  applyCarLights(silhouette.headlights, silhouette.taillights, state);
  const [r, g, b] = trailColor(state.carS);
  const level = OUTLINE_INTENSITY * carLightLevel(state.ending);
  silhouette.outline.color.setRGB(r * level, g * level, b * level);
}
```

Run: `rtk proxy npx vitest run --maxWorkers=4 src/components/journey/scene/silhouette.test.ts`
Expected: PASS — 2 passed

- [ ] **Step 7: 전체 확인**

Run: `rtk proxy npx tsc --noEmit` → exit 0
Run: `rtk proxy npx vitest run --maxWorkers=4` → `Tests  279 passed (279)`
Run: `rtk proxy npx eslint src/lib/journey/streaks.ts src/lib/journey/streaks.test.ts src/components/journey/scene/carModel.ts src/components/journey/scene/carModel.test.ts src/components/journey/scene/silhouette.ts src/components/journey/scene/silhouette.test.ts` → exit 0

- [ ] **Step 8: 커밋 정리를 제출한다**

```
feat: 여정 빛줄기 계산과 차·빛 실루엣 모듈 추가

- 차 부품을 재질별로 합쳐 드로콜을 107개에서 18개로 줄이고 바퀴를 노면에 맞춘다
- 헤드라이트는 주황, 테일라이트·빛줄기는 지금 자리의 궤적 색으로 칠한다
- 모델을 받지 못할 때 같은 자세로 대신 그릴 빛 실루엣을 둔다
```

---

### Task 9: 회랑을 도로로 바꾼다(장면 교체)

스펙 3절 전체를 장면에 올린다. 회랑·전시실·렌더 단계(모듈, 재질, 도형, 시간)와 회랑 카메라 함수를 지우고, 도로·차(모델과 오류 경계, 실루엣)·빛줄기·도로 카메라를 올린다. 차는 장면과 같은 Suspense 안에서 받으므로 Warmup이 차 재질까지 미리 컴파일한 뒤에 장면이 드러나고, 늦게 와도 자리는 `Car`가 매 프레임 진행률로 잡는다. 한 프레임 안의 여러 컴포넌트는 `driveFrame`으로 같은 `driveAt` 결과를 쓴다. 분위기 컴포넌트는 환경 반사 세기를 적용하고, 환경맵 띠를 위쪽 흰 빛과 양옆 주황·파랑으로 바꾼다. 번들 경계 e2e의 표지는 도로 재질의 프로그램 키로 바꾸고, 디코더가 만드는 blob: 작업자 스크립트는 모으지 않는다.

**Files:**
- Delete: `src/lib/journey/corridor.ts`, `corridor.test.ts`, `stage.ts`, `stage.test.ts`; `src/components/journey/scene/stageMaterial.ts`, `stageMaterial.test.ts`, `buildCorridor.ts`, `buildCorridor.test.ts`, `Corridor.tsx`, `StageTime.tsx`
- Modify: `src/lib/journey/timeline.ts`, `timeline.test.ts`
- Create: `src/components/journey/scene/driveFrame.ts`, `Road.tsx`, `CarSilhouette.tsx`, `Car.tsx`, `Streaks.tsx`
- Modify: `src/components/journey/scene/CameraRig.tsx`, `Atmosphere.tsx`, `Dust.tsx`, `Effects.tsx`, `Warmup.tsx`, `Scene.tsx`; `src/components/journey/JourneyStage.tsx`, `JourneyContent.tsx`; `e2e/journey.e2e.ts`

**Interfaces:**
- Consumes: Task 1 `setCarStatus`, SceneFrame `data-car`, `waitReady`; Task 3 `driveAt`, `CAMERA_DAMPING`, `keepClear`; Task 5 `roadMesh`, `createRoadMaterial`, `roadUniforms`; Task 6 `CAR_URL`, `DRACO_PATH`, `BASIS_PATH`; Task 7 `atmosphereAt`, `dustField`; Task 8 `writeStreaks`, `streakIndices`, `STREAK_VERTICES`, `prepareCar`, `placeCar`, `applyCarLights`, `createSilhouette`, `paintSilhouette`
- Produces: `currentDrive(): DriveState`, 장면 객체 이름 `journey-car`(차 자리 그룹, Task 10 통계가 찾는다), `journey-car-model`, `journey-car-silhouette`

- [ ] **Step 1: e2e를 도로 장면 기준으로 바꾼다**

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts
// 여정 장면 코드에만 있는 표지 글자(렌더 단계 재질의 프로그램 키)로 번들 경계를 확인한다(스펙 7절).
```

바꿀 내용:

```ts
// 여정 장면 코드에만 있는 표지 글자(도로 재질의 프로그램 키)로 번들 경계를 확인한다(스펙 7절).
```

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts
  page.on("response", (response) => {
    if (response.request().resourceType() === "script") scripts.add(response.url());
  });
```

바꿀 내용:

```ts
  page.on("response", (response) => {
    // 차 모델 디코더가 만드는 작업자(blob: 주소)는 내려받은 파일이 아니라 넣지 않는다.
    if (response.request().resourceType() === "script" && response.url().startsWith("http")) scripts.add(response.url());
  });
```

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts
    return bodies.some((body) => body.includes("journey-stage"));
```

바꿀 내용:

```ts
    return bodies.some((body) => body.includes("journey-road"));
```

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts
  await expect(page.locator("[data-journey-loading] span")).toHaveCount(0);
  await page.keyboard.press("End");
```

바꿀 내용:

```ts
  await expect(page.locator("[data-journey-loading] span")).toHaveCount(0);
  await expect(page.locator("[data-journey-scene]")).toHaveAttribute("data-car", "model");
  await page.keyboard.press("End");
```

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts
// 엔딩에서 회랑 전체를 내려다보는 장면을
```

바꿀 내용:

```ts
// 엔딩에서 길 전체를 내려다보는 장면을
```

파일 끝에 차 대체 테스트를 붙인다:

```ts
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
```

- [ ] **Step 2: 지금 코드에서 실패하는지 본다(RED)**

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts -g "다른 페이지는 여정 3D|셰이더를 미리 컴파일하고|빛 실루엣으로"`
Expected: FAIL — 8 failed(`journey-road` 표지가 없다, `data-car`가 `loading`에 머문다)

- [ ] **Step 3: 회랑과 렌더 단계를 지운다**

```bash
rm src/lib/journey/corridor.ts src/lib/journey/corridor.test.ts src/lib/journey/stage.ts src/lib/journey/stage.test.ts
rm src/components/journey/scene/stageMaterial.ts src/components/journey/scene/stageMaterial.test.ts
rm src/components/journey/scene/buildCorridor.ts src/components/journey/scene/buildCorridor.test.ts
rm src/components/journey/scene/Corridor.tsx src/components/journey/scene/StageTime.tsx
```

- [ ] **Step 4: 정류장 테스트에서 회랑 카메라를 걷어 낸다**

`src/lib/journey/timeline.test.ts` 전체:

```ts
import { describe, expect, it } from "vitest";
import { projects } from "@/data/projects";
import {
  OVERVIEW_ARRIVAL,
  PATH_LENGTH,
  SCROLL_LENGTH,
  STOPS,
  STOP_RANGES,
  TOTAL_LENGTH,
  UNITS_PER_SCREEN,
  dwellWeight,
  objectSide,
  overviewWeight,
  pathParamAt,
  pathSpan,
  rangeOf,
  stopAt,
} from "./timeline";

describe("정류장", () => {
  it("스펙의 스크롤 배분을 따른다", () => {
    expect(STOPS.map((stop) => [stop.id, stop.length])).toEqual([
      ["intro", 1],
      ["act-1", 0.5],
      ["kokoa-clone", 1],
      ["todo-app", 1],
      ["eutcha", 1],
      ["act-2", 0.5],
      ["stock2u", 2],
      ["tix2u", 2],
      ["pfplay", 2],
      ["act-3", 0.5],
      ["pickcare", 5],
      ["ending", 2],
    ]);
    expect(TOTAL_LENGTH).toBe(18.5);
    expect(SCROLL_LENGTH).toBe(17.5);
  });

  it("프로젝트 정류장이 데이터의 종료일 순서와 같다", () => {
    expect(STOPS.filter((stop) => stop.slug).map((stop) => stop.slug)).toEqual(
      projects.map((project) => project.slug),
    );
  });

  it("막 배정과 고정 구간이 스펙과 같다", () => {
    expect(["kokoa-clone", "todo-app", "eutcha"].map((id) => rangeOf(id).stop.act)).toEqual([1, 1, 1]);
    expect(["stock2u", "tix2u", "pfplay"].map((id) => rangeOf(id).stop.act)).toEqual([2, 2, 2]);
    expect(rangeOf("pickcare").stop.act).toBe(3);
    expect(STOPS.filter((stop) => stop.pin).map((stop) => stop.id)).toEqual([
      "stock2u",
      "tix2u",
      "pfplay",
      "pickcare",
    ]);
  });

  it("구간이 0에서 1까지 빈틈없이 이어진다", () => {
    expect(STOP_RANGES[0].start).toBe(0);
    expect(STOP_RANGES[STOP_RANGES.length - 1].end).toBeCloseTo(1, 12);
    for (let index = 1; index < STOP_RANGES.length; index += 1) {
      expect(STOP_RANGES[index].start).toBeCloseTo(STOP_RANGES[index - 1].end, 12);
    }
  });

  it("진행률로 정류장을 찾는다", () => {
    expect(stopAt(0).range.stop.id).toBe("intro");
    expect(stopAt(1).range.stop.id).toBe("ending");
    expect(stopAt(1).t).toBe(1);
    const pfplay = rangeOf("pfplay");
    const middle = stopAt((pfplay.start + pfplay.end) / 2);
    expect(middle.range.stop.id).toBe("pfplay");
    expect(middle.t).toBeCloseTo(0.5, 10);
  });
});

describe("진행 거리", () => {
  it("스크롤이 늘면 앞으로만 간다", () => {
    let previous = -Infinity;
    for (let step = 0; step <= 2000; step += 1) {
      const s = pathParamAt(step / 2000);
      expect(s).toBeGreaterThanOrEqual(previous - 1e-9);
      previous = s;
    }
    expect(pathParamAt(1)).toBeCloseTo(PATH_LENGTH, 10);
  });

  it("정류장 경계에서 속도가 이어진다(멈칫하지 않는다)", () => {
    const h = 1e-6;
    for (const range of STOP_RANGES.slice(1)) {
      const at = range.start;
      const left = (pathParamAt(at) - pathParamAt(at - h)) / h;
      const right = (pathParamAt(at + h) - pathParamAt(at)) / h;
      expect(Math.abs(left - right), range.stop.id).toBeLessThan(0.05);
    }
  });

  it("입구에서는 출발선에 서 있다가 출발한다", () => {
    const h = 1e-6;
    const cruise = UNITS_PER_SCREEN * SCROLL_LENGTH;
    expect(pathParamAt(0)).toBe(0);
    expect(pathParamAt(h) / h / cruise).toBeLessThan(1e-3);
    const intro = rangeOf("intro");
    expect((pathParamAt(intro.end + h) - pathParamAt(intro.end)) / h / cruise).toBeCloseTo(1, 3);
  });

  it("고정 구간 가운데 절반은 멈춰 있고, 머무는 정도가 그동안 1이다", () => {
    for (const range of STOP_RANGES.filter((item) => item.stop.pin)) {
      const at = (t: number) => range.start + (range.end - range.start) * t;
      expect(pathParamAt(at(0.3)), range.stop.id).toBeCloseTo(pathParamAt(at(0.7)), 10);
      expect(dwellWeight(at(0.5)), range.stop.id).toBe(1);
      expect(dwellWeight(at(0)), range.stop.id).toBe(0);
      expect(dwellWeight(at(0.999999)), range.stop.id).toBeLessThan(1e-6);
    }
  });

  it("고정이 아닌 정류장에서는 머물지 않는다", () => {
    for (const range of STOP_RANGES.filter((item) => !item.stop.pin)) {
      expect(dwellWeight((range.start + range.end) / 2), range.stop.id).toBe(0);
    }
  });

  it("프로젝트 제품 화면은 왼쪽·오른쪽을 번갈아 선다", () => {
    expect(STOPS.filter((stop) => stop.kind === "project").map((stop) => objectSide(stop))).toEqual([-1, 1, -1, 1, -1, 1]);
  });

  it("엔딩 구간 앞부분(OVERVIEW_ARRIVAL)에서 내려다보기가 끝난다", () => {
    const ending = rangeOf("ending");
    expect(OVERVIEW_ARRIVAL).toBeLessThan(0.5);
    expect(overviewWeight(ending.start)).toBe(0);
    expect(overviewWeight(ending.start + (ending.end - ending.start) * OVERVIEW_ARRIVAL)).toBe(1);
    expect(overviewWeight(rangeOf("pickcare").end - 1e-9)).toBe(0);
  });

  it("정류장이 경로에서 차지하는 거리 구간을 준다", () => {
    expect(pathSpan("intro")).toEqual({ from: 0, to: 4 });
    expect(pathSpan("act-2")).toEqual({ from: 18, to: 20 });
    expect(pathSpan("pickcare")).toEqual({ from: 34, to: PATH_LENGTH });
  });
});
```

Run: `rtk proxy npx vitest run --maxWorkers=4 src/lib/journey/timeline.test.ts`
Expected: PASS — 13 passed(남은 테스트는 Task 2의 함수만 쓴다)

- [ ] **Step 5: 정류장 모듈에서 회랑 카메라 함수를 지운다**

`src/lib/journey/timeline.ts` 전체:

```ts
/**
 * 여정의 정류장 목록. 본문 섹션 높이, 스크롤 구간, 차가 도로를 따라 나아가는 거리가 모두 여기서 나온다.
 * 같은 목록에서 계산하므로 3D 장면과 글의 위치가 어긋날 수 없다. (스펙 2절 "정류장과 스크롤 배분")
 * 도로의 모양과 차·카메라 자세는 drive.ts가 이 진행 거리로 계산한다.
 */

export type Vec3 = [number, number, number];

export type StopKind = "intro" | "act" | "project" | "hall" | "ending";

export interface Stop {
  /** 본문 섹션 id는 `stop-${id}`다. */
  id: string;
  kind: StopKind;
  /** 0은 막 밖(입구·엔딩) */
  act: 0 | 1 | 2 | 3;
  /** 스크롤 길이(화면 높이 단위) */
  length: number;
  /** 화면 고정 구간인가. 본문 패널이 머물고 차는 들어와 멈춘 뒤 다시 출발한다. */
  pin: boolean;
  slug?: string;
}

export interface StopRange {
  stop: Stop;
  index: number;
  /** 0~1 진행률 */
  start: number;
  end: number;
}

export const STOPS: Stop[] = [
  { id: "intro", kind: "intro", act: 0, length: 1, pin: false },
  { id: "act-1", kind: "act", act: 1, length: 0.5, pin: false },
  { id: "kokoa-clone", kind: "project", act: 1, length: 1, pin: false, slug: "kokoa-clone" },
  { id: "todo-app", kind: "project", act: 1, length: 1, pin: false, slug: "todo-app" },
  { id: "eutcha", kind: "project", act: 1, length: 1, pin: false, slug: "eutcha" },
  { id: "act-2", kind: "act", act: 2, length: 0.5, pin: false },
  { id: "stock2u", kind: "project", act: 2, length: 2, pin: true, slug: "stock2u" },
  { id: "tix2u", kind: "project", act: 2, length: 2, pin: true, slug: "tix2u" },
  { id: "pfplay", kind: "project", act: 2, length: 2, pin: true, slug: "pfplay" },
  { id: "act-3", kind: "act", act: 3, length: 0.5, pin: false },
  { id: "pickcare", kind: "hall", act: 3, length: 5, pin: true, slug: "pickcare" },
  { id: "ending", kind: "ending", act: 0, length: 2, pin: false },
];

/** 본문 전체 높이(화면 단위) */
export const TOTAL_LENGTH = STOPS.reduce((sum, stop) => sum + stop.length, 0);

/**
 * 실제로 스크롤할 수 있는 길이. 본문 맨 아래가 화면 아래에 닿으면 끝나므로 화면 하나만큼 짧다.
 * 그래서 마지막 정류장(엔딩)은 길이에서 화면 하나를 빼고 구간을 잡는다.
 */
export const SCROLL_LENGTH = TOTAL_LENGTH - 1;

export const STOP_RANGES: StopRange[] = (() => {
  let offset = 0;
  return STOPS.map((stop, index) => {
    const span = index === STOPS.length - 1 ? stop.length - 1 : stop.length;
    const range = { stop, index, start: offset / SCROLL_LENGTH, end: (offset + span) / SCROLL_LENGTH };
    offset += span;
    return range;
  });
})();

export function rangeOf(id: string): StopRange {
  const range = STOP_RANGES.find((item) => item.stop.id === id);
  if (!range) throw new Error(`정류장이 없습니다: ${id}`);
  return range;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

export function stopAt(progress: number): { range: StopRange; t: number } {
  const p = clamp01(progress);
  const range = STOP_RANGES.find((item) => p < item.end) ?? STOP_RANGES[STOP_RANGES.length - 1];
  const t = range.end > range.start ? (p - range.start) / (range.end - range.start) : 0;
  return { range, t: clamp01(t) };
}

// ── 진행 거리 ──────────────────────────────────────────────
// s는 출발선에서 나아간 거리(경로 단위)다. drive.ts가 도로 미터(ROAD_SCALE)로 바꾼다.

/** 고정이 아닌 정류장에서 화면 한 높이만큼 스크롤할 때 나아가는 거리(정속) */
export const UNITS_PER_SCREEN = 4;
/** 고정 정류장은 길이의 절반만큼만 나아간다. 들어와 멈추고, 머물고, 다시 출발한다. */
const PIN_TRAVEL = 0.5;
/** 3D 장면의 세로 시야각(도). 엔딩 시점이 도로 전체를 담는지 테스트가 이 값으로 확인한다. */
export const CAMERA_FOV = 50;

const PATH_SPANS: { from: number; to: number }[] = (() => {
  let s = 0;
  return STOPS.map((stop) => {
    const from = s;
    if (stop.kind !== "ending") s += stop.length * UNITS_PER_SCREEN * (stop.pin ? PIN_TRAVEL : 1);
    return { from, to: s };
  });
})();

export const PATH_LENGTH = PATH_SPANS[PATH_SPANS.length - 1].to;

/** 정류장이 경로에서 차지하는 거리 구간(s, 경로 단위). 도로 폭·색의 전환 자리가 이 값으로 정해진다. */
export function pathSpan(id: string): { from: number; to: number } {
  return PATH_SPANS[rangeOf(id).index];
}

/** p(0)=0, p(1)=1, p'(0)=1, p'(1)=0. 달리던 속도 그대로 들어와 멈춘다. */
function arrive(u: number): number {
  const x = clamp01(u);
  return x + x * x - x * x * x;
}

/** arrive를 뒤집은 출발: p(0)=0, p(1)=1, p'(0)=0, p'(1)=1. 서 있다가 정속까지 붙는다. */
function depart(u: number): number {
  return 1 - arrive(1 - u);
}

/**
 * 고정 구간의 진행: 앞 1/4에 반을 달리고, 가운데 절반은 멈추고, 뒤 1/4에 나머지 반을 달린다.
 * 달리는 구간은 이웃 정류장과 같은 속도(화면당 UNITS_PER_SCREEN)로 이어져 경계에서 차가 멈칫하지 않는다.
 * 다음 정류장이 제자리에 머무는 엔딩이면 멈추며 나간다.
 */
function dwell(t: number, exitsDriving: boolean): number {
  if (t < 0.25) return 0.5 * arrive(t / 0.25);
  if (t > 0.75) {
    const u = (t - 0.75) / 0.25;
    return 0.5 + 0.5 * (exitsDriving ? depart(u) : smoothstep(0, 1, u));
  }
  return 0.5;
}

/** 고정 구간에서 멈춰 머무는 정도(0~1). 양 끝에서 0이라 앞뒤 정류장과 자연스럽게 이어진다. 카메라가 이 값으로 정류장 시점으로 돈다. */
export function dwellWeight(progress: number): number {
  const { range, t } = stopAt(progress);
  if (!range.stop.pin) return 0;
  return smoothstep(0, 0.25, t) * (1 - smoothstep(0.75, 1, t));
}

/** 진행률의 경로 거리. 입구에서는 출발선에 서 있다가 출발하고(스펙 2절 "차가 출발선에 서 있다"), 고정 구간에서는 멈춘다. */
export function pathParamAt(progress: number): number {
  const { range, t } = stopAt(progress);
  const span = PATH_SPANS[range.index];
  const next = STOPS[range.index + 1];
  let k = t;
  if (range.stop.kind === "intro") k = depart(t);
  else if (range.stop.pin) k = dwell(t, next !== undefined && next.kind !== "ending");
  return span.from + (span.to - span.from) * k;
}

const PROJECT_STOPS = STOPS.filter((stop) => stop.kind === "project");

/** 프로젝트의 제품 화면(2-3)이 화면의 어느 쪽에 서는가. 프로젝트 순서대로 왼쪽(-1)·오른쪽(1)을 번갈아 쓴다. 본문 패널은 반대편에 둔다. */
export function objectSide(stop: Stop): -1 | 1 {
  return PROJECT_STOPS.indexOf(stop) % 2 === 0 ? -1 : 1;
}

/**
 * 엔딩 구간의 이만큼에서 내려다보기를 마친다. 연락처 패널은 엔딩 섹션 끝에 있어 구간 후반에 화면으로 올라오므로,
 * 휴대폰처럼 패널이 전체 폭인 화면에서도 패널이 덮기 전에 길 전체를 먼저 보인다.
 */
export const OVERVIEW_ARRIVAL = 0.45;

/** 엔딩에서 내려다보는 정도(0~1). 카메라·분위기·길 전체 발광이 같은 값을 쓴다 */
export function overviewWeight(progress: number): number {
  const { range, t } = stopAt(progress);
  return range.stop.kind === "ending" ? smoothstep(0, OVERVIEW_ARRIVAL, t) : 0;
}
```

Run: `rtk proxy npx vitest run --maxWorkers=4 src/lib/journey/timeline.test.ts`
Expected: PASS — 13 passed

- [ ] **Step 6: 프레임 공유와 도로를 만든다**

`src/components/journey/scene/driveFrame.ts` 전체:

```ts
import { driveAt, type DriveState } from "@/lib/journey/drive";
import { scrollState } from "@/lib/journey/scrollState";

let cached: DriveState = driveAt(0);

/**
 * 지금 스크롤 진행률의 진행 상태(lib/journey/drive.ts driveAt). 한 프레임 안에서 카메라·도로·차·빛줄기가 같은 값을 쓰도록
 * 진행률이 그대로면 다시 계산하지 않는다. driveAt은 순수 함수라 이 캐시가 결과를 바꾸지 않는다.
 */
export function currentDrive(): DriveState {
  if (cached.progress !== scrollState.progress) cached = driveAt(scrollState.progress);
  return cached;
}
```

`src/components/journey/scene/Road.tsx` 전체:

```tsx
"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { BufferAttribute, BufferGeometry } from "three";
import { roadMesh } from "@/lib/journey/road";
import { currentDrive } from "./driveFrame";
import { createRoadMaterial, roadUniforms } from "./roadMaterial";

/** 첫 프레임의 delta는 페이지를 연 뒤 지난 시간(수십 초)이다. 한 프레임에 이만큼까지만 더해 노이즈가 건너뛰지 않게 한다 */
const MAX_DELTA = 0.1;

function buildRoadGeometry(): BufferGeometry {
  const data = roadMesh();
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(data.positions, 3));
  geometry.setAttribute("normal", new BufferAttribute(data.normals, 3));
  geometry.setAttribute("journeyRoad", new BufferAttribute(data.road, 4));
  geometry.setIndex(new BufferAttribute(data.indices, 1));
  return geometry;
}

/**
 * 빛의 길(스펙 3절 "길이 열린다, 색이 쌓인다"). 도로 판 하나에 도로 재질 하나라 드로콜 하나다.
 * 매 프레임 열린 끝·차 자리·엔딩 정도·경계 노이즈 시간을 uniform으로 넘긴다(셰이더를 다시 컴파일하지 않는다).
 */
export function Road() {
  const geometry = useMemo(() => buildRoadGeometry(), []);
  const material = useMemo(() => createRoadMaterial(), []);
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame((_, delta) => {
    const drive = currentDrive();
    roadUniforms.uJourneyTime.value += Math.min(delta, MAX_DELTA);
    roadUniforms.uRevealS.value = drive.revealS;
    roadUniforms.uCarS.value = drive.carS;
    roadUniforms.uEnding.value = drive.ending;
  });

  return <mesh geometry={geometry} material={material} />;
}
```

- [ ] **Step 7: 카메라를 도로 카메라로 바꾼다**

`src/components/journey/scene/CameraRig.tsx` 전체:

```tsx
"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { Vector3 } from "three";
import { damp3 } from "@/lib/journey/damp";
import { CAMERA_DAMPING, keepClear } from "@/lib/journey/drive";
import { currentDrive } from "./driveFrame";

/**
 * 진행률이 정한 카메라 목표(driveAt의 camera)를 매 프레임 감쇠로 따라간다. 위치와 시선 모두 감쇠한다.
 * 감쇠는 프레임 간격으로 계산해 60Hz·120Hz에서 같은 속도다. 빠르게 스크롤하면 감쇠가 시점 사이를 가로질러 차에 붙을 수 있어
 * 감쇠한 자리를 차 둘레 밖·노면 위로 밀어낸다(keepClear, drive.test.ts가 빠른 스크롤로 확인한다).
 */
export function CameraRig() {
  const look = useRef<Vector3 | null>(null);

  useFrame((state, delta) => {
    const drive = currentDrive();
    const pose = drive.camera;
    if (!look.current) {
      // 첫 프레임은 목표 자세에 바로 놓는다. 원점에서 날아오는 연출을 막는다.
      look.current = new Vector3(...pose.target);
      state.camera.position.set(...pose.position);
    } else {
      damp3(state.camera.position, pose.position, CAMERA_DAMPING.position, delta);
      damp3(look.current, pose.target, CAMERA_DAMPING.target, delta);
      keepClear(state.camera.position, drive.car);
    }
    state.camera.lookAt(look.current);
  });

  return null;
}
```

- [ ] **Step 8: 차와 실루엣, 빛줄기를 만든다**

`src/components/journey/scene/CarSilhouette.tsx` 전체:

```tsx
"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { currentDrive } from "./driveFrame";
import { createSilhouette, paintSilhouette } from "./silhouette";

/** 차 모델 대신 그리는 빛 실루엣. 자리는 바깥의 Car가 모델과 같은 자세로 잡는다 */
export function CarSilhouette() {
  const silhouette = useMemo(() => createSilhouette(), []);
  useEffect(() => () => silhouette.dispose(), [silhouette]);
  useFrame(() => paintSilhouette(silhouette, currentDrive()));
  return <primitive object={silhouette.object} />;
}
```

`src/components/journey/scene/Car.tsx` 전체:

```tsx
"use client";

import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { Component, useEffect, useMemo, useRef, type ReactNode } from "react";
import type { Group, WebGLRenderer } from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import { BASIS_PATH, CAR_URL, DRACO_PATH } from "@/lib/journey/carAsset";
import { setCarStatus } from "@/lib/journey/sceneStatus";
import { applyCarLights, placeCar, prepareCar } from "./carModel";
import { CarSilhouette } from "./CarSilhouette";
import { currentDrive } from "./driveFrame";

let decoders: { draco: DRACOLoader; ktx2: KTX2Loader } | null = null;

/** Draco·Basis 디코더를 public/journey/decoders/에서 쓰게 한다. KTX2는 이 렌더러가 올릴 수 있는 압축 형식을 고른다 */
function attachDecoders(loader: GLTFLoader, gl: WebGLRenderer): void {
  decoders ??= {
    draco: new DRACOLoader().setDecoderPath(DRACO_PATH),
    ktx2: new KTX2Loader().setTranscoderPath(BASIS_PATH).detectSupport(gl),
  };
  loader.setDRACOLoader(decoders.draco).setKTX2Loader(decoders.ktx2);
}

/** 모델을 다 받았거나 실패하면 디코더 작업자(Web Worker)를 내린다 */
function releaseDecoders(): void {
  decoders?.draco.dispose();
  decoders?.ktx2.dispose();
  decoders = null;
}

/**
 * 차 모델(스펙 3절 "차"). 장면과 같은 Suspense 안에서 받으므로 Warmup이 차 재질까지 미리 컴파일한 뒤에 장면이 드러난다.
 * 늦게 와도 자리는 CarRig가 매 프레임 진행률로 잡으므로, 나타나는 순간 그 진행률의 자세다.
 */
function CarModel() {
  const gl = useThree((state) => state.gl);
  const gltf = useLoader(GLTFLoader, CAR_URL, (loader) => attachDecoders(loader, gl));
  const car = useMemo(() => prepareCar(gltf.scene), [gltf]);
  useEffect(() => {
    releaseDecoders();
    setCarStatus("model");
    return () => car.dispose();
  }, [car]);
  useFrame(() => applyCarLights(car.headlights, car.taillights, currentDrive()));
  return <primitive object={car.object} />;
}

/** 차 모델·디코더를 받지 못하면(오류) 빛 실루엣으로 바꾼다. 장면 전체는 그대로 이어진다(스펙 5절 "실패 대응") */
class CarBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    releaseDecoders();
    setCarStatus("silhouette");
    console.warn("여정 차 모델을 불러오지 못해 빛 실루엣으로 대신합니다", error);
  }

  render() {
    return this.state.failed ? <CarSilhouette /> : this.props.children;
  }
}

/** 차 자리. 모델이든 실루엣이든 같은 driveAt(p) 자세를 쓴다 */
export function Car() {
  const group = useRef<Group>(null);
  useFrame(() => {
    if (group.current) placeCar(group.current, currentDrive());
  });
  return (
    <group ref={group} name="journey-car">
      <CarBoundary>
        <CarModel />
      </CarBoundary>
    </group>
  );
}
```

`src/components/journey/scene/Streaks.tsx` 전체:

```tsx
"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { AdditiveBlending, BufferAttribute, BufferGeometry, DoubleSide, Mesh, MeshBasicMaterial } from "three";
import { STREAK_VERTICES, streakIndices, writeStreaks } from "@/lib/journey/streaks";
import { currentDrive } from "./driveFrame";

function createStreaks() {
  const positions = new BufferAttribute(new Float32Array(STREAK_VERTICES * 3), 3);
  const colors = new BufferAttribute(new Float32Array(STREAK_VERTICES * 3), 3);
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", positions);
  geometry.setAttribute("color", colors);
  geometry.setIndex(new BufferAttribute(streakIndices(), 1));
  // 띠는 카메라를 향하지만 감는 방향이 자리에 따라 뒤집히므로 양면으로 그린다. 더하기 혼합이라 검정은 투명이다.
  const material = new MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    side: DoubleSide,
    fog: false,
  });
  const mesh = new Mesh(geometry, material);
  // 정점이 매 프레임 바뀌어 경계 구가 맞지 않는다. 차 바로 뒤라 늘 화면 안이다.
  mesh.frustumCulled = false;
  return {
    mesh,
    positions,
    colors,
    dispose: () => {
      geometry.dispose();
      material.dispose();
    },
  };
}

type StreakMesh = ReturnType<typeof createStreaks>;

function update(streaks: StreakMesh, camera: { x: number; y: number; z: number }): void {
  writeStreaks(currentDrive(), [camera.x, camera.y, camera.z], streaks.positions.array as Float32Array, streaks.colors.array as Float32Array);
  streaks.positions.needsUpdate = true;
  streaks.colors.needsUpdate = true;
}

/** 테일라이트 빛줄기(스펙 3절 "차"). 매 프레임 도로 곡률을 따라 다시 그린다. 드로콜 하나다 */
export function Streaks() {
  const streaks = useMemo(() => createStreaks(), []);
  useEffect(() => () => streaks.dispose(), [streaks]);
  useFrame((state) => update(streaks, state.camera.position));
  return <primitive object={streaks.mesh} />;
}
```

- [ ] **Step 9: 분위기·먼지·후처리 주석을 고친다**

`src/components/journey/scene/Atmosphere.tsx` 전체:

```tsx
"use client";

import { Environment, Lightformer } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { Fog, SRGBColorSpace, type DirectionalLight, type HemisphereLight } from "three";
import { atmosphereAt } from "@/lib/journey/atmosphere";
import { scrollState } from "@/lib/journey/scrollState";

/** 주광의 자리. 도로가 −z로 뻗으므로 앞 왼쪽 위에서 비춘다 */
const KEY_POSITION: [number, number, number] = [-6, 12, 8];

/**
 * 조명·안개·은하 밝기·환경 반사 세기(스펙 3절 "막별 분위기"). 매 프레임 스크롤 진행률의 분위기(lib/journey/atmosphere.ts)를 적용한다.
 * 배경 자체는 Sky의 은하 사진이고, 여기서는 그 밝기만 바꾼다.
 * 빛의 개수와 안개 종류는 바꾸지 않는다. 바뀌면 셰이더를 다시 컴파일해 프레임이 끊긴다.
 * 환경 반사는 이미지 파일 없이 Lightformer로 만든다. 차 도장에 위쪽 흰 빛과 양옆의 주황·파랑 띠(1막·3막의 빛)가 비친다.
 */
export function Atmosphere() {
  const hemisphere = useRef<HemisphereLight>(null);
  const key = useRef<DirectionalLight>(null);

  useFrame((state) => {
    const atmosphere = atmosphereAt(scrollState.progress);
    const { fog } = state.scene;
    state.scene.backgroundIntensity = atmosphere.galaxy;
    state.scene.environmentIntensity = atmosphere.environment;
    if (fog instanceof Fog) {
      fog.color.setRGB(...atmosphere.fogColor, SRGBColorSpace);
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
      <fog attach="fog" args={["#1c0e06", 30, 140]} />
      <hemisphereLight ref={hemisphere} />
      <directionalLight ref={key} position={KEY_POSITION} />
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" color="#ffffff" intensity={2} scale={10} position={[0, 8, 0]} rotation-x={Math.PI / 2} />
        <Lightformer form="rect" color="#ffb27a" intensity={1.5} scale={[20, 2, 1]} position={[-10, 3, 0]} rotation-y={Math.PI / 2} />
        <Lightformer form="rect" color="#9cc8ff" intensity={1.5} scale={[20, 2, 1]} position={[10, 3, 0]} rotation-y={-Math.PI / 2} />
        <Lightformer form="rect" color="#ffffff" intensity={0.8} scale={[20, 2, 1]} position={[0, 3, -10]} />
      </Environment>
    </>
  );
}
```

`src/components/journey/scene/Dust.tsx` 전체:

```tsx
"use client";

import { PointMaterial, Points } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Group } from "three";
import { DUST_COUNT, dustField } from "@/lib/journey/space";

/** 첫 프레임의 delta는 페이지를 연 뒤 지난 시간이다. 한 프레임에 이만큼까지만 더한다 */
const MAX_DELTA = 0.1;

/**
 * 길 양옆에 천천히 떠다니는 별 먼지(사이트 공통 배경의 별 먼지와 같은 결). 차와 카메라가 지나는 길에서 비켜 두어
 * 가까운 먼지가 화면에 큰 원으로 보이지 않는다(lib/journey/space.ts DUST_CLEARANCE).
 */
export function Dust() {
  const positions = useMemo(() => dustField(DUST_COUNT, 7), []);
  const group = useRef<Group>(null);
  const time = useRef(0);

  useFrame((_, delta) => {
    time.current += Math.min(delta, MAX_DELTA);
    group.current?.position.set(Math.sin(time.current * 0.13) * 0.15, Math.sin(time.current * 0.2) * 0.25, 0);
  });

  return (
    <group ref={group}>
      <Points positions={positions} stride={3}>
        <PointMaterial transparent color="#cfe0ff" size={0.12} sizeAttenuation depthWrite={false} opacity={0.6} />
      </Points>
    </group>
  );
}
```

`src/components/journey/scene/Effects.tsx`에서 찾을 부분:

```tsx
 * 후처리(스펙 3절): 블룸(1막의 선과 전환선), 톤 매핑, 약한 비네트, 안티에일리어싱(SMAA).
```

바꿀 내용:

```tsx
 * 후처리(스펙 3절): 블룸(빛의 길, 경계선, 차 불빛), 톤 매핑, 약한 비네트, 안티에일리어싱(SMAA).
```

`src/components/journey/scene/Warmup.tsx`에서 찾을 부분:

```tsx
 * 셰이더 사전 컴파일(스펙 5절 "로딩"). 장면의 모든 재질을 compileAsync로
```

바꿀 내용:

```tsx
 * 셰이더 사전 컴파일(스펙 5절 "로딩"). 장면의 모든 재질(도로, 차 포함)을 compileAsync로
```

`src/components/journey/scene/Warmup.tsx`에서 찾을 부분:

```tsx
 * Canvas의 마지막 자식이라 다른 자식(환경맵, 후처리)이
```

바꿀 내용:

```tsx
 * Canvas의 마지막 자식이라 다른 자식(차 모델, 환경맵, 후처리)이
```

- [ ] **Step 10: 장면 구성을 바꾼다**

`src/components/journey/scene/Scene.tsx` 전체:

```tsx
"use client";

import { Canvas } from "@react-three/fiber";
import { useSyncExternalStore, type ReactNode } from "react";
import { WebGLRenderer, type WebGLRendererParameters } from "three";
import { driveAt } from "@/lib/journey/drive";
import {
  getCarStatus,
  getSceneStatus,
  getServerCarStatus,
  getServerSceneStatus,
  setSceneStatus,
  subscribeSceneStatus,
} from "@/lib/journey/sceneStatus";
import { CAMERA_FOV } from "@/lib/journey/timeline";
import { Atmosphere } from "./Atmosphere";
import { CameraRig } from "./CameraRig";
import { Car } from "./Car";
import { Dust } from "./Dust";
import { Effects } from "./Effects";
import { Road } from "./Road";
import { Sky } from "./Sky";
import { Streaks } from "./Streaks";
import { Warmup } from "./Warmup";

/**
 * 모듈 밖에 두어 렌더마다 같은 객체를 넘긴다. Canvas는 카메라 옵션이 바뀌면 카메라 자리를 다시 잡는다.
 * 먼 끝은 엔딩 내려다보기(약 250m 위)에서 도로 끝까지 담는 거리다.
 */
const CAMERA = { fov: CAMERA_FOV, near: 0.1, far: 600, position: driveAt(0).camera.position };

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
 * 차가 모델인지 빛 실루엣인지는 data-car에 적는다(e2e 표지).
 * Canvas는 children으로 받는다. 상태가 바뀌어 이 틀만 다시 렌더링되면 같은 children이라 Canvas는 다시 렌더링되지 않는다.
 * (Canvas는 렌더링될 때마다 렌더러 설정을 다시 하므로, 렌더러를 만들지 못한 경우 실패를 한 번 더 일으킨다.)
 */
function SceneFrame({ children }: { children: ReactNode }) {
  const status = useSyncExternalStore(subscribeSceneStatus, getSceneStatus, getServerSceneStatus);
  const car = useSyncExternalStore(subscribeSceneStatus, getCarStatus, getServerCarStatus);
  return (
    <div
      data-journey-scene
      data-state={status}
      data-car={car}
      className="fixed inset-0 z-0 transition-opacity duration-700"
      style={{ opacity: status === "ready" ? 1 : 0 }}
      aria-hidden
    >
      {children}
    </div>
  );
}

/**
 * 여정 3D 장면: 우주를 달리는 차와 빛의 길(스펙 3절). R3F 자체 루프를 끄고(frameloop="never") 시계 하나가 그 캔버스의 advance로 그린다.
 * 차·카메라·열린 길·발광은 모두 진행률의 순수 함수(driveAt)에서 나온다. 렌더 단계는 Warmup이 셰이더를 미리 컴파일한 뒤에 건다.
 * 이 파일과 scene/ 아래만 three·R3F를 import한다. JourneyStage가 동적으로 불러온다.
 */
export default function Scene() {
  return (
    <SceneFrame>
      <Canvas frameloop="never" dpr={[1, 2]} camera={CAMERA} gl={createRenderer}>
        <Atmosphere />
        <Sky />
        <CameraRig />
        <Road />
        <Car />
        <Streaks />
        <Dust />
        <Effects />
        <Warmup />
      </Canvas>
    </SceneFrame>
  );
}
```

`src/components/journey/JourneyStage.tsx`에서 찾을 부분:

```tsx
// 장면 코드(회랑, 렌더 단계 셰이더, drei 환경맵, 후처리)는
```

바꿀 내용:

```tsx
// 장면 코드(도로 셰이더, 차 모델 로더, drei 환경맵, 후처리)는
```

`src/components/journey/JourneyContent.tsx`에서 찾을 부분:

```tsx
/** 엔딩. 넓은 화면에서는 패널을 오른쪽에 좁게 두어 왼쪽의 회랑 내려다보기(timeline.ts OVERVIEW_*)를 가리지 않는다 */
```

바꿀 내용:

```tsx
/** 엔딩. 넓은 화면에서는 패널을 오른쪽에 좁게 두어 왼쪽의 길 전체 내려다보기(drive.ts OVERVIEW)를 가리지 않는다 */
```

- [ ] **Step 11: 타입·단위·린트 확인**

Run: `rtk proxy npx tsc --noEmit` → exit 0
Run: `rtk proxy npx vitest run --maxWorkers=4` → `Test Files  28 passed (28)`, `Tests  249 passed (249)`
Run: `rtk proxy npx eslint src/components/journey src/lib/journey e2e/journey.e2e.ts` → exit 0
Run: `rtk proxy grep -rn "cameraAt\|focusPoint\|hallCenter\|pathPoint\|stageUniforms\|corridor" src scripts e2e` → 출력 없음, exit 1(남은 참조가 없다)

- [ ] **Step 12: 여정 e2e 전체를 돌린다**

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts`
Expected: PASS — 68 passed. 차는 모델로 그려지고(`data-car="model"`), 막힌 차 파일·디코더에서는 실루엣이 대신한다. 콘솔 에러 없음 테스트도 통과한다

- [ ] **Step 13: 눈으로 한 번 본다**

`rtk proxy npx next build`(자원 확인 뒤) → `rtk proxy npx next start --port 3200`을 띄우고 `CAPTURE_NAME=2-2b-t9 rtk proxy npm run capture:journey`로 아홉 장을 찍는다(Task 10 전의 캡처 스크립트도 그대로 동작한다). 확인: 입구에서 차가 출발선 근처에 서 있고 열린 끝에 경계선이 빛난다, 1막 길은 주황, 정류장에서 차가 패널 반대편에 선다, 3막 길은 파랑, 엔딩에서 S자 길 전체가 패널 왼쪽에 보인다. 서버는 `lsof -t -iTCP:3200 -sTCP:LISTEN`의 PID로 끈다.

- [ ] **Step 14: 커밋 정리를 제출한다**

```
feat: 여정 무대를 회랑에서 우주 도로와 차로 교체

- 회랑·전시실·렌더 단계 모듈과 회랑 카메라를 지우고 도로·차·빛줄기·도로 카메라를 올린다
- 차는 장면과 함께 기다려 사전 컴파일에 들어가고, 받지 못하면 같은 자세의 빛 실루엣으로 대신한다
- 번들 경계 표지를 도로 재질 키로 바꾸고 디코더의 blob 작업자는 내려받은 파일로 세지 않는다
```

---

### Task 10: 측정 도구 — 장면 통계, 3회 재생, 경계선 캡처

스펙 7절 측정 조건과 8절 4항이다. `?debug=stats`면 Warmup이 프레임마다 렌더러 통계를 비우고(autoReset 끔) 후처리 패스까지 합친 드로콜, 셰이더 프로그램 수(준비된 순간과 지금), 텍스처 GPU 추정치, 차 자리를 `window.__journeyStats`에 쓴다. e2e가 이것으로 늦게 온 차의 자세와 준비 뒤 새 프로그램·드로콜을 확인한다. 성능 스크립트는 3회 재생(회마다 새로 열기)·p99·장면 통계를, 캡처 스크립트는 경계선 묶음(`CAPTURE_SET=edge`)을 더한다.

**Files:**
- Create: `src/components/journey/scene/frameStats.ts`, `frameStats.test.ts`
- Modify: `src/components/journey/scene/Warmup.tsx`, `scripts/perf-journey.ts`, `scripts/capture-journey.ts`, `e2e/journey.e2e.ts`

**Interfaces:**
- Consumes: Task 9 장면 객체 `journey-car`, Task 1 `getCarStatus`, Task 3 `driveAt`(e2e), timeline `rangeOf`(e2e)
- Produces: `JourneyStats { frames, calls, maxCalls, maxCallsProgress, programsAtReady, programs, textureBytes, progress, carPosition, car }`, `statsEnabled()`, `textureBytes(texture)`, `sceneTextureBytes(scene)`, `createStatsRecorder(gl, scene) → { begin, end, ready }`; 스크립트 환경 변수 `PERF_DPR`(기본 2), `CAPTURE_SET=edge`

- [ ] **Step 1: 텍스처 추정 테스트를 쓴다**

`src/components/journey/scene/frameStats.test.ts` 전체:

```ts
import { describe, expect, it } from "vitest";
import {
  CompressedTexture,
  DataTexture,
  HalfFloatType,
  LinearFilter,
  Mesh,
  MeshStandardMaterial,
  RGBAFormat,
  Scene,
  Texture,
} from "three";
import { sceneTextureBytes, textureBytes } from "./frameStats";

function imageTexture(width: number, height: number): Texture {
  const texture = new Texture();
  texture.image = { width, height };
  return texture;
}

describe("텍스처 메모리 추정", () => {
  it("밉맵을 쓰는 8비트 텍스처는 크기 × 4바이트 × 4/3이다(은하 4096×2048 ≈ 44.7MB)", () => {
    expect(textureBytes(imageTexture(4096, 2048))).toBe(Math.round(4096 * 2048 * 4 * (4 / 3)));
  });

  it("밉맵이 없으면 4/3을 곱하지 않는다", () => {
    const texture = imageTexture(256, 256);
    texture.generateMipmaps = false;
    texture.minFilter = LinearFilter;
    expect(textureBytes(texture)).toBe(256 * 256 * 4);
  });

  it("반정밀도 실수 텍스처는 화소당 8바이트다", () => {
    const texture = new DataTexture(new Uint16Array(4 * 16), 4, 4, RGBAFormat, HalfFloatType);
    expect(textureBytes(texture)).toBe(4 * 4 * 8);
  });

  it("압축 텍스처는 밉맵 데이터 크기 그대로다", () => {
    const texture = new CompressedTexture(
      [
        { data: new Uint8Array(1024), width: 32, height: 32 },
        { data: new Uint8Array(256), width: 16, height: 16 },
      ] as never,
      32,
      32,
    );
    expect(textureBytes(texture)).toBe(1280);
  });

  it("장면의 배경·재질 텍스처를 한 번씩만 센다", () => {
    const scene = new Scene();
    const shared = imageTexture(64, 64);
    shared.generateMipmaps = false;
    shared.minFilter = LinearFilter;
    scene.background = shared;
    scene.add(new Mesh(undefined, new MeshStandardMaterial({ map: shared, normalMap: shared })));
    expect(sceneTextureBytes(scene)).toBe(64 * 64 * 4);
  });
});
```

Run: `rtk proxy npx vitest run --maxWorkers=4 src/components/journey/scene/frameStats.test.ts`
Expected: FAIL — `Error: Cannot find module './frameStats'`

- [ ] **Step 2: 통계 기록기를 만든다**

`src/components/journey/scene/frameStats.ts` 전체:

```ts
import {
  HalfFloatType,
  FloatType,
  LinearMipmapLinearFilter,
  LinearMipmapNearestFilter,
  NearestMipmapLinearFilter,
  NearestMipmapNearestFilter,
  Vector3,
  type Material,
  type Scene,
  type Texture,
  type WebGLRenderer,
} from "three";
import { getCarStatus, type CarStatus } from "@/lib/journey/sceneStatus";
import { scrollState } from "@/lib/journey/scrollState";

/**
 * 성능 측정용 장면 통계(스펙 7절 측정 조건). 주소에 ?debug=stats가 있을 때만 window.__journeyStats에 쓴다.
 * 렌더러 통계(info)는 autoReset을 끄고 프레임마다 한 번 비우므로, 후처리 패스까지 합친 프레임 하나의 드로콜이다.
 * 텍스처 메모리는 장면이 쓰는 텍스처의 크기·형식으로 계산한 GPU 업로드 추정치다(후처리 렌더 타깃은 넣지 않는다).
 */

export interface JourneyStats {
  frames: number;
  /** 지난 프레임의 드로콜 */
  calls: number;
  /** 준비 뒤 가장 무거운 프레임의 드로콜과 그때의 진행률 */
  maxCalls: number;
  maxCallsProgress: number;
  /** 준비된 순간의 셰이더 프로그램 수와 지금 수. 스크롤 중에 늘면 안 된다 */
  programsAtReady: number;
  programs: number;
  textureBytes: number;
  progress: number;
  /** 지난 프레임에 그린 차(모델·실루엣)의 자리 */
  carPosition: [number, number, number] | null;
  car: CarStatus;
}

type StatsWindow = Window & { __journeyStats?: JourneyStats };

export function statsEnabled(): boolean {
  return new URLSearchParams(window.location.search).get("debug") === "stats";
}

const MIPMAP_FILTERS = new Set<number>([
  LinearMipmapLinearFilter,
  LinearMipmapNearestFilter,
  NearestMipmapLinearFilter,
  NearestMipmapNearestFilter,
]);

/** 텍스처 하나의 GPU 업로드 추정치(바이트). 압축 텍스처는 밉맵 데이터 그대로, 나머지는 크기 × 화소 크기(밉맵이면 4/3배) */
export function textureBytes(texture: Texture): number {
  const mipmaps = texture.mipmaps as { data?: ArrayBufferView }[] | undefined;
  if ((texture as { isCompressedTexture?: boolean }).isCompressedTexture && mipmaps?.length) {
    return mipmaps.reduce((sum, level) => sum + (level.data?.byteLength ?? 0), 0);
  }
  const image = texture.image as { width?: number; height?: number } | null;
  const width = image?.width ?? 0;
  const height = image?.height ?? 0;
  const pixel = texture.type === FloatType ? 16 : texture.type === HalfFloatType ? 8 : 4;
  const mipmapped = texture.generateMipmaps && MIPMAP_FILTERS.has(texture.minFilter);
  return Math.round(width * height * pixel * (mipmapped ? 4 / 3 : 1));
}

/** 장면이 쓰는 텍스처(배경, 환경, 재질의 모든 텍스처 칸)를 한 번씩만 센 추정치 */
export function sceneTextureBytes(scene: Scene): number {
  const textures = new Set<Texture>();
  const add = (value: unknown) => {
    if (value && typeof value === "object" && (value as Texture).isTexture) textures.add(value as Texture);
  };
  add(scene.background);
  add(scene.environment);
  scene.traverse((object) => {
    const material = (object as { material?: Material | Material[] }).material;
    for (const item of Array.isArray(material) ? material : material ? [material] : []) {
      for (const value of Object.values(item)) add(value);
    }
  });
  return [...textures].reduce((sum, texture) => sum + textureBytes(texture), 0);
}

const carWorld = new Vector3();

/** 프레임마다 통계를 쓰는 기록기. 그리기 전에 begin(), 그린 뒤에 end(), 준비되는 순간 ready()를 부른다 */
export function createStatsRecorder(gl: WebGLRenderer, scene: Scene) {
  // 후처리 패스마다 렌더러 통계가 비워지지 않게 하고, 프레임마다 한 번(begin) 비운다.
  gl.info.autoReset = false;
  const stats: JourneyStats = {
    frames: 0,
    calls: 0,
    maxCalls: 0,
    maxCallsProgress: 0,
    programsAtReady: 0,
    programs: 0,
    textureBytes: 0,
    progress: 0,
    carPosition: null,
    car: getCarStatus(),
  };
  let ready = false;
  (window as StatsWindow).__journeyStats = stats;
  return {
    begin() {
      gl.info.reset();
    },
    end() {
      stats.frames += 1;
      stats.calls = gl.info.render.calls;
      stats.programs = gl.info.programs?.length ?? 0;
      stats.progress = scrollState.progress;
      stats.car = getCarStatus();
      const car = scene.getObjectByName("journey-car");
      stats.carPosition = car ? (car.getWorldPosition(carWorld).toArray() as [number, number, number]) : null;
      if (ready && stats.calls > stats.maxCalls) {
        stats.maxCalls = stats.calls;
        stats.maxCallsProgress = stats.progress;
      }
    },
    ready() {
      ready = true;
      stats.programsAtReady = gl.info.programs?.length ?? 0;
      stats.textureBytes = sceneTextureBytes(scene);
    },
  };
}
```

Run: `rtk proxy npx vitest run --maxWorkers=4 src/components/journey/scene/frameStats.test.ts`
Expected: PASS — 5 passed

- [ ] **Step 3: 통계 e2e를 쓴다**

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts
import { expect, test, type Page } from "@playwright/test";
```

바꿀 내용:

```ts
import { expect, test, type Page } from "@playwright/test";
import { driveAt } from "../src/lib/journey/drive";
import { rangeOf } from "../src/lib/journey/timeline";
```

파일 끝에 붙인다:

```ts
type JourneyStats = {
  frames: number;
  maxCalls: number;
  programs: number;
  programsAtReady: number;
  textureBytes: number;
  progress: number;
  carPosition: [number, number, number] | null;
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
  expect(stats.textureBytes).toBeGreaterThan(40 * 1024 * 1024);
  expect(stats.textureBytes).toBeLessThan(100 * 1024 * 1024);
});
```

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts -g "늦게 와도|셰이더 프로그램이 새로"`
Expected: FAIL — 4 failed(`?debug=stats 통계가 없습니다`)

- [ ] **Step 4: Warmup에 통계를 건다**

`src/components/journey/scene/Warmup.tsx`에서 찾을 부분:

```tsx
import { setSceneStatus } from "@/lib/journey/sceneStatus";
import { watchRenderer } from "./watchRenderer";
```

바꿀 내용:

```tsx
import { setSceneStatus } from "@/lib/journey/sceneStatus";
import { createStatsRecorder, statsEnabled } from "./frameStats";
import { watchRenderer } from "./watchRenderer";
```

`src/components/journey/scene/Warmup.tsx`에서 찾을 부분:

```tsx
 * 셰이더 컴파일 실패와 WebGL 컨텍스트 손실도 여기서 감시한다(watchRenderer).
```

바꿀 내용:

```tsx
 * 셰이더 컴파일 실패와 WebGL 컨텍스트 손실도 여기서 감시한다(watchRenderer). ?debug=stats면 프레임마다 장면 통계를 남긴다(frameStats).
```

`src/components/journey/scene/Warmup.tsx`에서 찾을 부분:

```tsx
    let cancelled = false;
    const target
```

바꿀 내용:

```tsx
    let cancelled = false;
    const stats = statsEnabled() ? createStatsRecorder(gl, scene) : null;
    const target
```

`src/components/journey/scene/Warmup.tsx`에서 찾을 부분:

```tsx
        setRenderStep((timeMs) => {
          advance(timeMs / 1000);
          frames += 1;
          if (frames === HIDDEN_FRAMES) setSceneStatus("ready");
        });
```

바꿀 내용:

```tsx
        setRenderStep((timeMs) => {
          stats?.begin();
          advance(timeMs / 1000);
          frames += 1;
          stats?.end();
          if (frames === HIDDEN_FRAMES) {
            setSceneStatus("ready");
            stats?.ready();
          }
        });
```

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts -g "늦게 와도|셰이더 프로그램이 새로"`
Expected: PASS — 4 passed

- [ ] **Step 5: 성능·캡처 스크립트를 바꾼다**

`scripts/perf-journey.ts` 전체:

```ts
import { chromium, type Page } from "@playwright/test";

/**
 * 여정 페이지 부드러움 측정(스펙 7절 측정 조건, 8절 4항). GPU를 쓰는 실제 Chrome 창에서 정해진 간격으로 휠을 굴려
 * 여정 전체를 지나가며 프레임 간격을 잰다. 같은 경로를 3회 재생한다. 회마다 페이지를 새로 열어 장면이 준비된 뒤
 * 맨 위에서 끝까지 굴린다(Lenis가 스크롤을 이끌어 끝에서 맨 위로 정확히 되돌리기 어렵다). 회마다와 합계의 평균·p95·p99를 낸다.
 * 50ms 초과 프레임은 3회 합계 0건이어야 한다. 목표는 60fps(16.7ms)이고, 주사율이 다른 화면의 숫자는 주사율과 함께 따로 적는다.
 * 페이지를 ?debug=stats로 열어 장면 통계(가장 무거운 프레임의 드로콜, 준비 뒤 셰이더 프로그램 수, 텍스처 GPU 추정치)도 읽는다.
 * 헤드리스 브라우저는 소프트웨어 렌더링이라 숫자가 실제와 달라 창을 띄운다.
 * 휠 한 번이 Playwright를 오가는 시간에 따라 프레임 수는 실행마다 다르다. 비교는 평균·p95·p99·50ms 초과로 한다.
 *
 * 사용법:
 *   npx next build && npx next start --port 3200   # 다른 터미널
 *   npm run perf:journey                           # 기본 주소 http://localhost:3200/journey (PERF_URL로 바꿀 수 있다)
 */
const TARGET_URL = process.env.PERF_URL ?? "http://localhost:3200/journey";
const VIEWPORT = { width: 1440, height: 900 };
// 해상도 배율. 스펙의 상한(2)이 가장 무거운 조건이라 기본으로 쓴다. PERF_DPR로 바꿀 수 있다
const DEVICE_SCALE = Number(process.env.PERF_DPR ?? 2);
const RUNS = 3;
const WHEEL_STEP = 100; // 한 번에 굴리는 양(px)
const WHEEL_INTERVAL = 16; // 굴리는 간격(ms)
// 스크롤 시작 직후 프레임은 이미지 디코딩 등이 섞여 제외한다. PERF_WARMUP_FRAMES=0이면 첫 스크롤부터 잰다(첫 스크롤 끊김 확인용)
const WARMUP_FRAMES = Number(process.env.PERF_WARMUP_FRAMES ?? 30);
const READY_TIMEOUT = 30_000; // 3D 장면이 셰이더를 미리 컴파일하고 드러날 때까지 기다리는 한도
const IDLE_MS = 1000; // 회마다 스크롤 전 가만히 있는 동안 주사율을 잰다
const SCROLL_DEADLINE = 120_000; // 끝까지 가지 못하면(스크롤이 막히면) 이 시간 뒤 멈춘다

type Phase = "idle" | "scroll" | "done";
type FrameWindow = Window & { __frames: { dt: number; phase: Phase }[]; __phase: Phase };
type JourneyStats = {
  maxCalls: number;
  maxCallsProgress: number;
  programs: number;
  programsAtReady: number;
  textureBytes: number;
  car: string;
};
type StatsWindow = Window & { __journeyStats?: JourneyStats };

function percentile(sorted: number[], ratio: number): number {
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))];
}

function median(values: number[]): number {
  return percentile([...values].sort((a, b) => a - b), 0.5);
}

function summarize(sample: number[]) {
  const sorted = [...sample].sort((a, b) => a - b);
  const average = sample.reduce((sum, value) => sum + value, 0) / sample.length;
  return {
    frames: sample.length,
    averageMs: Number(average.toFixed(2)),
    fps: Number((1000 / average).toFixed(1)),
    p95Ms: Number(percentile(sorted, 0.95).toFixed(2)),
    p99Ms: Number(percentile(sorted, 0.99).toFixed(2)),
    maxMs: Number(sorted[sorted.length - 1].toFixed(2)),
    over50ms: sample.filter((value) => value > 50).length,
  };
}

/** 페이지를 열어 장면이 준비되기를 기다린 뒤 맨 위에서 끝까지 한 번 굴린다. 가만히 있던 프레임 간격과 스크롤 중 프레임 간격, 장면 통계를 돌려준다 */
async function playOnce(page: Page, url: string) {
  await page.goto(url, { waitUntil: "load" });
  // 셰이더 사전 컴파일이 끝나기 전 프레임은 재지 않는다(스펙 5절).
  await page.locator('[data-journey-scene][data-state="ready"]').waitFor({ timeout: READY_TIMEOUT });
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
  const scroll = frames
    .filter((frame) => frame.phase === "scroll")
    .map((frame) => frame.dt)
    .slice(WARMUP_FRAMES);
  if (scroll.length === 0) throw new Error(`스크롤 중 프레임이 기록되지 않았습니다(전체 ${frames.length}개)`);
  const stats = await page.evaluate(() => (window as StatsWindow).__journeyStats ?? null);
  return { idle: frames.filter((frame) => frame.phase === "idle").map((frame) => frame.dt), scroll, stats };
}

async function main() {
  const browser = await chromium.launch({ headless: false, args: ["--ignore-gpu-blocklist"] });
  try {
    const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: DEVICE_SCALE });
    // tsx(esbuild keepNames)가 evaluate에 넘기는 함수 안의 이름 있는 함수에 __name 호출을 끼워 넣는다. 브라우저에는 없어 빈 껍데기를 심는다.
    await page.addInitScript("window.__name = (target) => target;");
    const url = new URL(TARGET_URL);
    url.searchParams.set("debug", "stats");

    const runs: ReturnType<typeof summarize>[] = [];
    const scenes: JourneyStats[] = [];
    const idle: number[] = [];
    const all: number[] = [];
    for (let run = 0; run < RUNS; run++) {
      const result = await playOnce(page, url.href);
      runs.push(summarize(result.scroll));
      idle.push(...result.idle);
      all.push(...result.scroll);
      if (result.stats) scenes.push(result.stats);
    }

    const renderer = await page.evaluate(() => {
      const gl = document.createElement("canvas").getContext("webgl2");
      const info = gl?.getExtension("WEBGL_debug_renderer_info");
      return gl && info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "unknown";
    });
    const dpr = await page.evaluate(() => window.devicePixelRatio);
    const heaviest = scenes.reduce<JourneyStats | null>((best, item) => (!best || item.maxCalls > best.maxCalls ? item : best), null);
    console.log(
      JSON.stringify(
        {
          url: url.href,
          renderer,
          viewport: `${VIEWPORT.width}×${VIEWPORT.height}`,
          devicePixelRatio: dpr,
          refreshHz: Number((1000 / median(idle)).toFixed(0)),
          runs,
          total: summarize(all),
          scene: heaviest && {
            maxDrawCalls: heaviest.maxCalls,
            maxDrawCallsAtProgress: Number(heaviest.maxCallsProgress.toFixed(3)),
            // 회마다 [준비된 순간, 끝까지 굴린 뒤]. 같아야 한다(준비 뒤 새 프로그램 없음)
            programs: scenes.map((item) => [item.programsAtReady, item.programs]),
            textureMB: Number((heaviest.textureBytes / 1024 / 1024).toFixed(1)),
            car: heaviest.car,
          },
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

`scripts/capture-journey.ts` 전체:

```ts
import { chromium, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { rangeOf } from "@/lib/journey/timeline";

/**
 * 여정 장면 시각 검토용 캡처. 기본(CAPTURE_SET=stops)은 정해 둔 자리(정류장과 그 안의 위치) 아홉 곳을 찍어 3×3 한 장(sheet.png)으로 붙인다.
 * 본문 패널·진행 막대가 함께 찍혀 어느 막의 빛 위에서도 글이 읽히는지 본다.
 * CAPTURE_SET=edge는 열린 끝 경계선의 안정성(스펙 8절 4항)을 본다: 멈춘 채 0.1초 간격 넷(노이즈 흐름과 깜빡임),
 * 정류장에서 길이 열리는 동안 넷(먼 경계), 휠로 천천히·빠르게 굴리는 도중 넷씩(이동 속도) — 4×4 한 장.
 * 기본은 GPU를 쓰는 실제 Chrome 창이다.
 *
 * 사용법:
 *   npx next build && npx next start --port 3200   # 다른 터미널
 *   CAPTURE_NAME=2-2b npm run capture:journey       # → test-results/journey-captures/2-2b/ (git에 넣지 않는다)
 *   CAPTURE_SET=edge CAPTURE_NAME=2-2b-edge npm run capture:journey
 *   CAPTURE_HEADLESS=1을 더하면 창 없이 찍는다(소프트웨어 렌더링이라 색과 속도는 실제와 다르다).
 */
const TARGET_URL = process.env.CAPTURE_URL ?? "http://localhost:3200/journey";
const NAME = process.env.CAPTURE_NAME ?? "latest";
const SET = process.env.CAPTURE_SET ?? "stops";
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

function progressOf(id: string, within: number): number {
  const range = rangeOf(id);
  return range.start + (range.end - range.start) * within;
}

/** ScrollTrigger의 진행률은 본문(<main>) 위끝이 화면 위에 닿을 때 0, 아래끝이 화면 아래에 닿을 때 1이다 */
async function scrollToProgress(page: Page, progress: number): Promise<void> {
  await page.evaluate((target) => {
    const main = document.querySelector("[data-journey-page]");
    if (!(main instanceof HTMLElement)) throw new Error("여정 본문이 없습니다");
    const top = main.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top + target * (main.offsetHeight - window.innerHeight), behavior: "instant" });
  }, progress);
}

async function shoot(page: Page, outDir: string, name: string, files: string[]): Promise<void> {
  const file = path.join(outDir, `${name}.png`);
  await page.screenshot({ path: file });
  files.push(file);
}

async function captureStops(page: Page, outDir: string): Promise<string[]> {
  const files: string[] = [];
  for (const [name, id, within] of SHOTS) {
    await scrollToProgress(page, progressOf(id, within));
    await page.waitForTimeout(SETTLE_MS);
    await shoot(page, outDir, name, files);
  }
  return files;
}

async function captureEdge(page: Page, outDir: string): Promise<string[]> {
  const files: string[] = [];
  for (const [label, id, within] of [
    ["still", "kokoa-clone", 0.5],
    ["opening", "tix2u", 0.45],
  ] as const) {
    await scrollToProgress(page, progressOf(id, within));
    await page.waitForTimeout(SETTLE_MS);
    for (let index = 1; index <= 4; index++) {
      await shoot(page, outDir, `edge-${label}-${index}`, files);
      await page.waitForTimeout(100);
    }
  }
  await page.mouse.move(VIEWPORT.width / 2, VIEWPORT.height / 2);
  for (const [label, step] of [
    ["slow", 30],
    ["fast", 150],
  ] as const) {
    await scrollToProgress(page, progressOf("act-1", 0));
    await page.waitForTimeout(SETTLE_MS);
    for (let index = 1; index <= 4; index++) {
      for (let wheel = 0; wheel < 12; wheel++) {
        await page.mouse.wheel(0, step);
        await page.waitForTimeout(16);
      }
      await shoot(page, outDir, `edge-${label}-${index}`, files);
    }
  }
  return files;
}

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
    const files = SET === "edge" ? await captureEdge(page, outDir) : await captureStops(page, outDir);
    const columns = SET === "edge" ? 4 : 3;
    const rows = Math.ceil(files.length / columns);
    const tiles = await Promise.all(files.map((file) => sharp(file).resize(TILE.width, TILE.height).toBuffer()));
    await sharp({ create: { width: TILE.width * columns, height: TILE.height * rows, channels: 3, background: "#18181b" } })
      .composite(
        tiles.map((input, index) => ({
          input,
          left: (index % columns) * TILE.width,
          top: Math.floor(index / columns) * TILE.height,
        })),
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

- [ ] **Step 6: 전체 확인**

Run: `rtk proxy npx tsc --noEmit` → exit 0
Run: `rtk proxy npx vitest run --maxWorkers=4` → `Test Files  29 passed (29)`, `Tests  254 passed (254)`
Run: `rtk proxy npx eslint src/components/journey/scene/frameStats.ts src/components/journey/scene/frameStats.test.ts src/components/journey/scene/Warmup.tsx scripts/perf-journey.ts scripts/capture-journey.ts e2e/journey.e2e.ts` → exit 0

- [ ] **Step 7: 커밋 정리를 제출한다**

```
feat: 여정 장면 통계와 성능 3회 측정·경계선 캡처 추가

- ?debug=stats로 후처리까지 합친 드로콜, 준비 뒤 셰이더 프로그램 수, 텍스처 GPU 추정치를 남긴다
- 늦게 온 차가 지금 진행률의 자세인지, 준비 뒤 새 프로그램이 없는지 e2e로 확인한다
- 성능은 준비 뒤 전체 경로 3회 재생의 평균·p95·p99와 50ms 초과 합계로 잰다
```

---

### Task 11: 전체 검증, 성능 측정, 캡처

스펙 1절 2-2b 완료 조건을 모두 확인하고 숫자를 남긴다. 코드는 바꾸지 않는다(기준에 못 미치면 원인을 찾아 해당 태스크의 파일에서 고치고 그 태스크의 테스트부터 다시 돌린다. 낮추는 순서는 스펙 7절: 배율 상한 → 블룸 → 먼지 → 유리 → 경계 노이즈. 지키는 것은 낮추지 않는다).

**Files:** 없음(측정 결과는 완료 보고와 SDD 기록에 숫자로 남긴다)

- [ ] **Step 1: 단위·타입·린트**

Run: `rtk proxy npx vitest run --maxWorkers=4` → `Tests  254 passed (254)`
Run: `rtk proxy npm run typecheck` → exit 0(서버 tsconfig 포함)
Run: `rtk proxy npx eslint .` → 오류는 HEAD와 같은 기존 6개뿐(`src/app/about/page.tsx` 2, `src/app/blog/[slug]/page.tsx` 1, `src/components/Background3D.tsx` 3)

- [ ] **Step 2: e2e 전체**

Run: `rtk proxy npx playwright test`
Expected: PASS — 86 passed(블로그 14 + 여정 72). 블로그 기준 이미지는 갱신하지 않는다

- [ ] **Step 3: 실제 빌드를 띄운다**

자원 확인 뒤 `rtk proxy npx next build` → `rtk proxy npx next start --port 3200`(다른 터미널이나 백그라운드로 두되 다른 무거운 명령과 겹치지 않게 한다)

- [ ] **Step 4: 아홉 자리 캡처를 눈으로 본다**

Run: `CAPTURE_NAME=2-2b rtk proxy npm run capture:journey` → `test-results/journey-captures/2-2b/sheet.png`
확인: 입구 차가 출발선 근처, 열린 끝 경계선이 빛남 / 1막 주황 길과 차 뒷면에서 나오는 가는 빛줄기 / 2막 진입에서 지나온 길이 보라로 바뀜 / 정류장에서 차가 앞옆 시점으로 패널 반대편 / 3막 파랑 길과 파란 테일라이트 / 엔딩 S자 길 전체가 패널 왼쪽, 블룸이 길 모양을 뭉개지 않음 / 모든 막에서 본문 패널이 읽힘

- [ ] **Step 5: 경계선 안정성 캡처를 본다**

Run: `CAPTURE_SET=edge CAPTURE_NAME=2-2b-edge rtk proxy npm run capture:journey` → 4×4 `sheet.png`
확인: 멈춤 넷은 경계 무늬만 천천히 흐르고 깜빡이지 않음 / 열림 넷은 경계가 앞으로 나아감 / 느린·빠른 휠에서 경계가 차보다 앞서 있고 카메라가 차에 붙지 않음

- [ ] **Step 6: 성능을 잰다**

Run: `rtk proxy npm run perf:journey`(배율 2 기본, 실제 Chrome 창)
Expected: `total.over50ms` 0, `scene.maxDrawCalls` 60 이하, `scene.programs`의 회별 [준비, 끝]이 모두 같음, `scene.textureMB` 100 이하, `scene.car` `"model"`. `refreshHz`가 60이 아니면 그 주사율과 함께 따로 적는다. 계획을 쓸 때의 값(60Hz, M4): 평균 16.67, p95 17.2, p99 17.6, 최대 17.7ms, 드로콜 44, 프로그램 26/26, 텍스처 72.1MB

- [ ] **Step 7: 서버를 끄고 숫자를 남긴다**

`lsof -t -iTCP:3200 -sTCP:LISTEN`의 PID만 끈다. SDD 기록과 완료 보고에 Step 1·2의 통과 수, Step 6의 JSON 요약, 캡처 경로, 기준 대비 판정을 적는다.

- [ ] **Step 8: 커밋 정리를 제출한다**

Task 1~10의 변경 전체를 import 방향대로 묶는 순서(중간 커밋도 빌드되게)와 묶음별 `git add` 명령을 제출한다: 1(상태·감시) → 2(진행 거리) → 3·4(drive·trail) → 5(도로 도형·재질) → 6(차 모델·출처, 바이너리 포함) → 7(분위기·먼지) → 8(빛줄기·차 모듈) → 9(장면 교체, 삭제 포함) → 10(측정 도구) → 계획 문서.
