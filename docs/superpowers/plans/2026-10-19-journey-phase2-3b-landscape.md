# 여정(Journey) 2-3b 구현 계획 — 막별 풍경

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 우주 도로 양옆에 막마다 다른 풍경을 둔다. 1막은 주황빛 절벽, 2막은 부유 암석, 3막은 지평선 위의 낮은 도시 스카이라인과 길이 사라지는 곳의 첨탑이다. 멀리 있는 큰 실루엣, 풍경 전용 안개, 가는 윤곽 빛으로 막의 성격을 바꾸고, 정류장에서는 홀로그램과 패널이 먼저 보이게 한다. 앞쪽으로는 바로 다음 막까지만 어두운 실루엣으로 보인다. 배치는 시드·도로·막별 설정의 함수라 결정적이고, 막이 늘어나면 설정을 한 줄 더하는 것으로 확장된다.

**Architecture:** three를 쓰지 않는 순수 모듈이 셋이다.
- `lib/journey/landscape.ts`: 막별 설정 목록, 자리 규칙, 등장·밝기·빛 켜짐·빛 색의 식, 정류장 홀로그램 시선, 화면 투영.
- `landscapeBuild.ts`: 시드로 절벽·암석·도시·첨탑의 정점과 속성을 만들고, 규칙 때문에 뺀 요소의 이유를 남긴다.
- `landscapeOcclusion.ts`: 요소 상자로 거르고 삼각형으로 확정하는 가림 판정과 그 표적.

장면 쪽 구성은 다음과 같다.
- 정점 배열을 복사하지 않고 BufferGeometry로 감싸, 메시 넷이 셰이더 재질 하나를 함께 쓴다(`scene/landscapeGeometry.ts`, `landscapeMaterial.ts`, `Landscape.tsx`).
- 매 프레임에는 uniform 셋과 두 막 앞 메시 감추기만 바꾼다.
- 셰이더의 식은 같은 상수로 TypeScript와 맞춰 본다(`glslRunner.ts`).
- `?debug=stats`는 메시별 그린 횟수, 지오메트리 표지, 실제 카메라 자리, 첨탑의 화면 자리를 낸다. e2e는 실제 메시 레이캐스트로 가림을 본다.
- 역방향 재생은 풍경 영역만 비교하는 도구(`scripts/compare-captures.ts`)로 확인한다.

**계획을 쓰며 확인한 것(사본 구현과 검증):**
- 이 계획의 코드는 HEAD(`9e68b11`)에 스펙 정정(아래 "스펙과 다르게 정한 점", 이 계획과 함께 커밋한다)을 더한 사본에, 태스크마다 커밋하며 구현했다.
- 통과한 검사:
  - 단위 378개(전 332, 태스크별 347 → 360 → 362 → 369 → 374 → 378).
  - 타입 검사.
  - eslint: 바꾼 파일은 오류·경고 0이고, 전체는 기존 6 오류·22 경고 그대로다.
  - e2e 129 통과·9 건너뜀(전 123·7). 건너뜀은 mobile의 홀로그램·풍경 자리 테스트다.
- 이 계획의 "찾을 부분 → 바꿀 내용"을 기준 상태에 차례로 적용하면 각 태스크의 결과와 글자 하나까지 같아진다. 생성기로 확인했다.
- 실패 단계의 기대 출력은 직전 태스크의 코드에 그 태스크의 테스트만 얹어 실제로 돌린 결과다. e2e는 Task 6을 데스크톱에서 돌렸다.
- 실측 조건: 사본, Apple M4, Chrome 창, 1440×900, 배율 2, 60Hz 화면, 3회.
  - 프레임: 평균 16.67ms, p95 17.3, p99 17.6, 최대 17.8. 50ms 초과는 회마다 0이다.
  - 가장 무거운 프레임의 드로콜은 50이다(바퀴 굴림 뒤 46 + 풍경 4).
  - 셰이더 프로그램은 준비 때 31 → 끝 31이다(풍경 재질 +1).
  - 텍스처 GPU 추정은 58.8 MiB 그대로다(풍경은 텍스처를 쓰지 않는다).
  - 풍경 배치 계산은 node에서 32~51ms다.
- `check:holograms`: ① 11장 모두 ΔE 0. ③ 코코아톡 자리를 더한 대표 시점 7곳, 화면에 보이는 홀로그램 16개 모두 평균 ΔE 2 이하다(가장 큰 값 1.44).
- 역방향 비교: 열두 장면 모두 통과했다. 풍경 영역(화면의 2.3~33.2%)에서 가장 큰 차이 덩어리는 14화소(별 먼지)다.
  - 처음에는 같은 순서로 두 번 찍어 시간 애니메이션을 찾으려 했다. 그러면 시간까지 같아 도로 끝 노이즈가 걸러지지 않았다. 그래서 기다리는 시간을 달리 해 찍는다.
  - 풍경 없는 장면이 한 번 다른 자리(Tix2U)에서 찍힌 적이 있어, 풍경 영역이 화면의 60%를 넘으면 실패로 둔다.
- 캡처: 승인한 시제품(사본 시제품 `p23b`)과 같은 모습이다.
  - 2막 후반 오른쪽 암석이 남아 있다.
  - 3막 제목 장면에 검은 덩어리가 없다.
  - 엔딩은 도로가 먼저 읽힌다.
- 전체 e2e를 처음 돌렸을 때 mobile "캔버스는 여정 장면 하나뿐이다"가 한 번 실패했다. End 키 뒤 5초 안에 연락처가 화면에 들지 않았다.
  - 그 테스트만 4번씩(데스크톱·모바일 8번) 돌려 모두 통과했고, 전체를 다시 돌려도 통과했다.
  - 풍경 계산은 50ms 안쪽이라 원인으로 보지 않는다. 부하 때 생기는 흔들림이다.
- 개발 서버(`next dev`)에서는 2-2b부터 여정 장면이 실패한다. 이 계획의 브라우저 확인은 모두 `next build && next start`로 한다.

**스펙과 다르게 또는 더 구체적으로 정한 점(사용자 검토 대상, 스펙 1·3·4·8·9절에 반영해 이 계획과 함께 커밋한다):**
1. **도로 끝 연장선 비움은 양옆 70m, 모든 막에 같다.** 사용자 결정(2026-10-19, 계획 작성 때).
   - 100m면 연장선이 지나는 2막 후반 오른쪽 암석 24개가 빠졌다.
   - 70m는 길 반폭 8m, 거리 규칙 40m, 굽이 여유 22m를 더한 값이다.
   - 40m 거리 규칙과는 따로 확인한다.
2. **규칙 때문에 뺀 요소는 이유와 함께 남긴다.** 사용자 요청이다.
   - 이유는 홀로그램 뒤, 도로 끝 연장선, 첨탑 가림, 도로 거리 넷이다.
   - 지금은 암석 74개 가운데 56개를 둔다(홀로그램 뒤 14, 연장선 4를 뺀다).
   - 건물은 141채 가운데 102채를 둔다(홀로그램 뒤 39를 뺀다).
3. **난수를 뽑는 순서는 시제품 그대로다.** 규칙은 다 뽑은 뒤에 더 밀거나 빼는 것으로만 지킨다. 그래서 승인한 배치가 유지된다. 암석과 건물은 가운데에서 가장 먼 정점까지의 거리만큼 더 밀어 모든 정점이 도로에서 40m 밖에 있다.
4. **홀로그램 뒤 비우기는 요소의 가운데와 기준 크기로 판정한다.** 기준 크기는 암석은 크기, 건물은 폭·깊이 가운데 큰 값이다. 시제품의 기준이다. 홀로그램이 실제로 가려지는지는 가림 판정이 삼각형으로 따로 본다.
5. **가림 판정은 요소 상자로 거르고 삼각형으로 확정한다.** 상자만 보면 절벽 비탈 위 빈 공간을 가림으로 잘못 잡는다.
6. **첨탑 높이 비교를 고쳤다.**
   - 스펙의 "2배 넘게(약 17° 대 2.5~7°)"는 정확하지 않았다. 가까운 건물을 최소 높이 10m로 올려 약 10°까지 보인다.
   - 고친 기준은 "건물 90%의 2배, 가장 높아 보이는 건물의 1.8배 넘게(약 18°)"다.
7. **메시는 스펙대로 넷(절벽·암석·도시·첨탑)이다.**
   - 투명 물체 가운데 먼저 그린다(`renderOrder` −1). 풍경과 홀로그램 메시가 모두 원점에 있어, three가 만든 순서로 정렬하기 때문이다.
   - 깊이를 쓰지 않는 홀로그램 빛기둥(0)·화면(1)보다 풍경이 나중에 그려지면 그 위를 덮는다.
8. **두 막 앞 풍경은 메시를 감춘다(`visible`).** 그래서 1막의 드로콜은 3막 메시 둘만큼 적다. 나타나는 20m는 셰이더의 투명도로 이어진다.
   - 스펙의 "1막에서는 1·2막만, 2막에서는 2·3막만 보인다"를 "앞쪽으로는 바로 다음 막까지만 보인다(지나온 막은 그대로 남는다)"로 고쳤다.
9. **역방향 비교 방법.**
   - `?debug=stats&landscape=off`면 풍경을 그리지 않는다(`&bloom=off`와 같은 디버그 스위치).
   - 풍경 없는 장면과의 차이로 풍경 영역을, 기다리는 시간을 달리 한 정방향과의 차이로 시간 애니메이션을 찾는다.
   - 그 영역에서 차이 덩어리가 40화소를 넘지 않아야 한다.
10. **도시는 막 끝 2m 앞까지(s 258) 둔다.** 시제품 값이다.
11. **`check:holograms` 대표 시점에 코코아톡(1막 절벽 빛 옆)을 더한다.** Tix2U 0.85는 홀로그램이 작아 재지 못해 뺐다. 2막 머묾은 이미 뒤에 암석이 있다.
12. **GLSL 실행기를 `trailShader.test.ts`에서 `glslRunner.ts`로 옮겨 같이 쓴다.** 풍경 셰이더 식도 같은 방법으로 맞춰 본다.
13. **첨탑 e2e는 실제 본문 패널 사각형과 비교한다.** 3막 제목·진입·도착·떠날 때 네 자리를 1280×720과 1440×900에서 본다. 세로 화면은 2-4다.

**넘기는 것:**
- 2-4: 세로 화면의 풍경 구도, mobile의 가림·첨탑 e2e, 개발 서버의 장면 실패.
- 스펙 10절 열린 문제: 다음 막 실루엣 35%의 최종값(Task 8에서 캡처로 판단), 3막 제목 장면 왼쪽에 떠 있는 짧은 가로선, 막을 더할 때 다시 맞출 것.

**Tech Stack:** Next 16 App Router, React 19, TypeScript, three 0.181.2(`ShaderMaterial`, `BufferGeometry`, `Raycaster`), @react-three/fiber 9.4.0(`frameloop="never"`, `useFrame`), @react-three/postprocessing 3.0.4(postprocessing 6.38), vitest 4(node 환경의 three), @playwright/test 1.63, sharp 0.34.5, tsx

**Spec:** `docs/superpowers/specs/2026-10-14-journey-design.md`
- 반영된 개정: 2026-10-19 3차 개정과, 이 계획과 함께 커밋하는 정정.
- 다루는 절: 1절 2-3b 완료 조건, 3절 "막별 풍경 (2-3b)"·"차"(빛 웅덩이 제외), 4절 모듈, 7절 2-3b 예산, 8절 테스트, 9절 2-3b 결정.
- 2단계 계획 가운데 다섯째다. 2-1 골격, 2-2 시각 언어, 2-2b 길·차·궤적·카메라, 2-3a 제품 화면 홀로그램과 클릭은 완료했고, **2-3b 막별 풍경이 이 문서**다. 다음은 2-4 기기 대응과 마감이다.

## Global Constraints

- **범위:** 막별 풍경(설정·배치·가림·재질·메시·장면·통계)과 그 검증 도구만 만든다. 헤드라이트 빛 웅덩이는 만들지 않는다(스펙 3절 "차"). 기기 등급·실행 중 강등·세로 화면 구도·개발 서버 장면 실패(2-4)도 만들지 않는다
- **같은 진행률이면 같은 장면:** 배치는 시드·도로 함수·막별 설정의 순수 함수이고 처음 한 번 만든다. 매 프레임 바뀌는 것은 재질 uniform 셋(`uRevealS`, `uCarS`, `uEnding`)과 메시 감추기뿐이며, 모두 `driveAt(p)`에서 나온다
- **여정은 늘어난다:** 막 목록(`LANDSCAPE_ACTS`)을 받아 계산하고, 마지막 막이라고 가정하는 코드를 두지 않는다(스펙 3절 "원칙")
- **단일 원천:** 막 목록·자리 규칙·등장·빛 식은 `lib/journey/landscape.ts`, 배치와 정점은 `lib/journey/landscapeBuild.ts`에만 둔다. 셰이더는 같은 상수를 `glslFloat`로 받는다. 데이터(`src/data/projects/`)에는 3D 정보를 넣지 않는다
- **셰이더를 스크롤 중에 다시 컴파일하지 않는다:** 풍경 메시 넷이 재질 하나를 함께 쓰고, 막 단위 등장은 `visible`과 uniform만 바꾼다
- **블로그 7개 글 화면은 바뀌지 않는다.** 블로그 e2e(픽셀·마크업)가 그대로 통과해야 하고, 기준(`e2e/__screenshots__/`, 로컬 전용)을 갱신하지 않는다
- **의존성을 더하지 않는다**
- **시계 하나:** `/journey`에서 프레임을 도는 것은 GSAP ticker 하나뿐이다. 컴포넌트에서 `requestAnimationFrame`을 직접 쓰지 않는다(측정·검증 스크립트 제외)
- **스크롤 중 React 렌더 금지:** 풍경은 `useFrame` 안에서만 바뀐다
- **three·`@react-three/*` import는 `src/components/journey/scene/` 안에서만 한다**(그 폴더의 테스트 포함). `src/lib/journey/`는 three 없는 순수 코드다
- **React Compiler 계열 린트 규칙이 에러로 켜져 있다**(`react-hooks/immutability`, `refs`, `purity` 등): 훅이 돌려준 값의 속성을 컴포넌트에서 직접 바꾸지 않는다. 메시·재질을 바꾸는 일은 `landscapeGeometry.ts`의 함수(`writeLandscape`, `countDraws`, `takeLandscapeStats`, `disposeLandscape`)가 한다
- **설명 문장(카피)을 넣지 않는다(사용자 결정, 2026-10-14)**
- **명령 실행:** Bash 검증 명령에는 `rtk proxy`를 붙이고 exit code를 믿는다. 파일은 Read 도구로 읽는다(`cat`은 rtk 필터가 주석 줄을 빠뜨린다). `npx tsx`·`npm run x -- 인자`는 rtk가 망가뜨리므로 `rtk proxy npm run <스크립트>`나 `rtk proxy npx tsx`로 실행하고, 인자는 환경 변수로 넘긴다. zsh에서 `$var:path`는 수정자로 해석되므로 `${var}:path`로 쓴다
- **기계 자원(2026-10-14 강제 재부팅 뒤 규칙):** 무거운 명령(Playwright, `next build`, vitest, `tsc`)은 하나씩 차례로 돌리고 백그라운드나 병렬로 돌리지 않는다. 그런 명령 전에 `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`로 다른 프로젝트의 무거운 작업이 없는지 확인하고, 있으면 끝날 때까지 기다린다(15초 간격, 10분 넘으면 BLOCKED). 사용자의 다른 프로젝트 개발 서버(`next dev -p 3010`)는 무거운 작업으로 세지 않고 건드리지 않는다. vitest는 늘 `--maxWorkers=4`로 돌린다. 띄운 서버는 `lsof -t -iTCP:<포트> -sTCP:LISTEN`으로 찾은 PID만 끈다(`pkill -f next-server`처럼 넓은 패턴 금지)
- **브라우저 확인은 프로덕션 빌드로 한다:** `rtk proxy npx next build && rtk proxy npx next start --port 3200`(다른 터미널). 개발 서버(`next dev`)에서는 2-2b부터 여정 장면이 실패한다
- **성능·색은 실제 Chrome 창에서 잰다.** 헤드리스(SwiftShader)는 색·속도가 다르다. 60fps(16.7ms) 목표와 다른 주사율에서 잰 숫자는 주사율과 함께 따로 적는다. 드로콜·셰이더 프로그램 수는 GPU와 상관없어 헤드리스 e2e로도 확인한다
- **Playwright는 시작할 때 `test-results/`를 비운다.** 캡처를 거기 둔 채 e2e를 돌리면 사라진다. 캡처 비교는 e2e 뒤에 하거나 캡처를 먼저 다른 곳으로 옮긴다
- **커밋하지 않는다.** 에이전트는 `git add`/`commit`/`stash`/`reset`/`checkout`/`restore`를 실행하지 않는다. 각 태스크 마지막 단계는 파일별 변경 표와 커밋 메시지 초안 제출이다(`type: 한국어 요약` + 이유를 적는 `- ` 불릿, 트레일러 없음). 사용자는 모든 태스크가 끝날 때까지 커밋을 보류할 수 있다
- 기존 스타일을 따른다: 한국어 주석, `function` 선언형 컴포넌트. 단위 테스트는 소스 옆 `*.test.ts`, e2e는 `e2e/*.e2e.ts`. 대소문자만 다른 파일 이름을 같은 폴더에 두지 않는다

## Review Focus

1. **투명 물체의 그리는 순서.** 풍경과 홀로그램 메시는 모두 원점에 있어 three가 만든 순서로 정렬한다. 홀로그램이 먼저 만들어지면 깊이를 쓰지 않는 빛기둥·화면 위를 풍경이 덮는다. 사람은 풍경 앞의 홀로그램이 늘 보이기를 기대한다 → Task 5 단위 "투명 물체 가운데 먼저 그린다"
2. **다른 페이지에 다녀오기.** 장면을 내렸다 다시 올리면 같은 정점 배열로 지오메트리를 새로 만든다. 놓은 지오메트리를 다시 쓰거나 통계·창의 가림 확인이 옛 메시를 가리키면 풍경이 사라진다 → Task 6 e2e "다른 페이지에 다녀와도 풍경 메시 넷을 새로 만들어 그린다"
3. **막 경계를 건너뛰는 빠른 스크롤.** 진행 막대·End 키로 1막에서 엔딩으로, 다시 1막으로 건너뛰면 감춘 메시가 남거나 보여야 할 메시가 감춰질 수 있다. 사람은 어느 자리에서나 그 자리의 풍경을 본다 → Task 6 단위 "막 경계를 건너뛰며 오가도…", e2e "풍경 메시 넷: … 끝까지 갔다 돌아와도 …"
4. **세로 화면(휴대폰).** 풍경 자리는 넓은 화면에 맞췄다. 세로 화면에서 첨탑이 화면 밖으로 나가는 것은 2-4에서 맞추지만, 풍경이 장면을 멈추거나 1막에 3막 메시를 그려서는 안 된다 → Task 6 e2e 두 개("풍경 메시 넷", "다른 페이지에 다녀와도")가 mobile에서도 돈다
5. **막·도로가 바뀔 때.** 막을 더하거나 굽이를 고치면 풍경이 새 도로에 붙거나 첨탑을 가릴 수 있다. 사람은 테스트가 실패해서 알려 주고 어느 규칙이 무엇을 뺐는지 보이기를 기대한다 → Task 1 단위 "막을 하나 더해도 같은 규칙이다", Task 2 단위 "모든 정점이 모든 도로 표본에서 수평 40m 이상", "요소 수와 뺀 까닭"

---

## 파일 구조

| 파일 | 책임 |
|---|---|
| `src/lib/journey/landscape.ts` | 막별 설정 목록, 막 시작·끝, 자리 규칙(도로 거리, 도로 끝 연장선), 등장·밝기·빛 켜짐·빛 색, 정류장 홀로그램 시선, 화면 투영 (순수) |
| `src/lib/journey/landscapeBuild.ts` | 시드로 만든 절벽·암석·도시·첨탑의 정점과 속성, 요소 상자, 뺀 요소와 이유, 첨탑 자리·진입 카메라 (순수) |
| `src/lib/journey/landscapeOcclusion.ts` | 가림 표적(홀로그램 모서리, 화면 안 열린 도로)과 선분 가림 판정 (순수) |
| `src/components/journey/scene/glslRunner.ts` | (테스트 전용) GLSL 함수를 자바스크립트로 돌린다. `trailShader.test.ts`에서 옮김 |
| `src/components/journey/scene/landscapeMaterial.ts` | 풍경 셰이더 재질 하나와 TypeScript와 같은 식의 GLSL |
| `src/components/journey/scene/landscapeGeometry.ts` | 지오메트리·메시, 한 프레임(uniform·감추기), 그린 횟수·통계, 실제 메시 레이캐스트, 놓기 |
| `src/components/journey/scene/Landscape.tsx` | 장면 컴포넌트, `?debug=stats` 통계와 e2e 가림 확인, `&landscape=off` |
| `src/components/journey/scene/Scene.tsx`, `frameStats.ts` | (수정) 풍경 넣기, 풍경 통계 |
| `scripts/capture-journey.ts`, `scripts/compare-captures.ts`, `scripts/check-holograms.ts`, `package.json` | (수정·추가) 풍경 캡처 묶음·역순·기다림, 역방향 비교, 대표 시점 |
| `e2e/journey.e2e.ts`, 단위 테스트들 | (수정·추가) 각 태스크의 테스트 |

---

### Task 1: 막별 설정·자리 규칙·등장과 빛의 식(`landscape.ts`)

스펙 3절 "막별 풍경"의 원칙·자리 규칙·막 단위 등장·빛이다. 풍경은 막별 설정 목록(`LANDSCAPE_ACTS`)으로 만들고 마지막 막을 가정하지 않는다. 막 시작은 막 진입 정류장의 경로(첫 막은 도로 시작, 입구를 1막으로 친다)이고, 막 끝은 다음 막의 시작(마지막 막이면 지금 도로 끝)이다. 셰이더(Task 4)가 같은 상수·같은 식을 쓰도록 등장(`appearLevel`)·밝기(`brightnessLevel`)·빛 켜짐(`lightLevel`)·빛 색(`rimColor`)을 순수 함수로 둔다. 자리 규칙(도로 거리 40m, 도로 끝 연장선 양옆 70m), 정류장 홀로그램 시선(2막 ±25°, PiCKCARE ±18°), 화면 투영(`projectPoint`)도 여기에 둔다. 막 목록을 받는 함수는 막을 하나 더한 시험 설정으로도 검사한다(Review Focus 5).

**Files:**
- Create: `src/lib/journey/landscape.test.ts`, `src/lib/journey/landscape.ts`

**Interfaces:**
- Consumes: `ROAD_END`·`ROAD_SCALE`·`ROAD_START`·`driveAt`·`roadFrame`·`CameraPose`(drive.ts), `HOLOGRAMS`·`hologramsAt`·`luminance`·`pickcareFront`(holograms.ts), `CAMERA_FOV`·`pathSpan`·`rangeOf`·`smoothstep`·`Vec3`(timeline.ts), `trailColor`·`LinearRgb`(trail.ts)
- Produces: `LANDSCAPE_SEED`, `type LandscapeKind`, `interface LandscapeAct { act; stopId; kind }`, `LANDSCAPE_ACTS`, `actStart(act, acts?)`, `actEnd(act, acts?)`, `actStopId(act, acts?)`, `actTitleEnd(act, acts?)`, `APPEAR = { fade: 20, enter: 30, next: 0.35 }`, `ALWAYS = -10000`, `appearFrom(act, acts?)`, `appearLevel(from, carS)`, `brightnessLevel(start, carS)`, `LIGHT = { lead: 80, fade: 20, rim: 0.35 }`, `ENDING = { opacity: 0.35, light: 0.3, haze: 0.55 }`, `lightLevel(s, start, revealS)`, `rimColor(s): LinearRgb`, `RULES = { clearance: 40, push: 45, spire: 100, corridor: 70, sampleStep: 2, testStep: 0.5 }`, `roadSamples(step): [number, number][]`, `roadDistance(x, z, samples)`, `inEndCorridor(x, z)`, `flatFrame(s): { origin; right; forward }`, `interface Sight { camera; direction; clear }`, `BACKDROP = { exhibit: 25, hall: 18 }`, `EXHIBIT_SIGHTS`, `HALL_SIGHTS`, `behindSight(point, radius, sights)`, `projectPoint(pose, point, aspect): { x; y; depth }`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/lib/journey/landscape.test.ts` 전체:

```ts
import { describe, expect, it } from "vitest";
import { ROAD_END, ROAD_START, driveAt, roadFrame } from "./drive";
import { luminance } from "./holograms";
import {
  ALWAYS,
  APPEAR,
  EXHIBIT_SIGHTS,
  HALL_SIGHTS,
  LANDSCAPE_ACTS,
  LIGHT,
  RULES,
  actEnd,
  actStart,
  actTitleEnd,
  appearFrom,
  appearLevel,
  behindSight,
  brightnessLevel,
  inEndCorridor,
  lightLevel,
  projectPoint,
  rimColor,
  roadDistance,
  roadSamples,
  type LandscapeAct,
} from "./landscape";
import { rangeOf } from "./timeline";
import { trailColor } from "./trail";

/** 막을 하나 더한 시험 설정(확장 검사). 4막이 PiCKCARE 정류장 경로(s 170)에서 시작한다고 친다 */
const FOUR_ACTS: readonly LandscapeAct[] = [...LANDSCAPE_ACTS, { act: 4, stopId: "pickcare", kind: "rocks" }];

describe("막별 설정", () => {
  it("막 순서대로이고 막 시작은 막 진입 정류장의 경로다(첫 막은 도로 시작)", () => {
    expect(LANDSCAPE_ACTS.map((item) => item.act)).toEqual([1, 2, 3]);
    expect(actStart(1)).toBe(ROAD_START);
    expect(actStart(2)).toBe(90);
    expect(actStart(3)).toBe(160);
    expect(actTitleEnd(3)).toBe(170);
  });

  it("막의 끝은 다음 막의 시작이고, 마지막 막은 지금 도로 끝이다", () => {
    expect(actEnd(1)).toBe(90);
    expect(actEnd(2)).toBe(160);
    expect(actEnd(3)).toBe(ROAD_END);
  });

  it("막을 하나 더해도 같은 규칙이다: 3막의 끝은 4막의 시작, 4막이 마지막이다", () => {
    expect(actEnd(3, FOUR_ACTS)).toBe(170);
    expect(actEnd(4, FOUR_ACTS)).toBe(ROAD_END);
    expect(appearFrom(4, FOUR_ACTS)).toBe(160);
  });
});

describe("막 단위 등장", () => {
  it("첫 두 막은 처음부터 보이고, 그다음 막은 바로 앞 막의 시작부터 나타난다", () => {
    expect(appearFrom(1)).toBe(ALWAYS);
    expect(appearFrom(2)).toBe(ALWAYS);
    expect(appearFrom(3)).toBe(90);
    for (const carS of [0, 50, 200]) {
      expect(appearLevel(appearFrom(1), carS)).toBe(1);
      expect(appearLevel(appearFrom(2), carS)).toBe(1);
    }
  });

  it("3막 풍경은 차가 2막 시작을 지나 20m를 달리는 동안 0에서 1로 나타난다", () => {
    const from = appearFrom(3);
    expect(appearLevel(from, from)).toBe(0);
    expect(appearLevel(from, from + APPEAR.fade / 2)).toBeCloseTo(0.5, 12);
    expect(appearLevel(from, from + APPEAR.fade)).toBe(1);
    let previous = 0;
    for (let carS = from - 5; carS <= from + APPEAR.fade + 5; carS += 0.5) {
      const level = appearLevel(from, carS);
      expect(level).toBeGreaterThanOrEqual(previous);
      previous = level;
    }
  });

  it("앞쪽으로는 바로 다음 막까지만 보이고(1막에서 3막은 없다), 다음 막은 어두운 실루엣이다", () => {
    const shown = (carS: number, acts: readonly LandscapeAct[]) =>
      acts.filter((item) => appearLevel(appearFrom(item.act, acts), carS) > 0).map((item) => item.act);
    expect(shown(50, LANDSCAPE_ACTS)).toEqual([1, 2]);
    expect(shown(130, LANDSCAPE_ACTS)).toEqual([1, 2, 3]);
    expect(brightnessLevel(actStart(2), 50)).toBe(APPEAR.next);
    expect(brightnessLevel(actStart(3), 130)).toBe(APPEAR.next);
    expect(brightnessLevel(actStart(3), 160)).toBe(1);
    expect(brightnessLevel(actStart(1), 0)).toBe(1);
    // 막을 하나 더하면 3막에서는 4막이 다음 막이다
    expect(shown(130, FOUR_ACTS)).toEqual([1, 2, 3]);
    expect(shown(175, FOUR_ACTS)).toEqual([1, 2, 3, 4]);
  });

  it("밝기는 차가 막 시작 30m 앞에서 막 시작까지 다음 막의 밝기에서 1로 오른다", () => {
    const start = actStart(3);
    expect(brightnessLevel(start, start - APPEAR.enter)).toBe(APPEAR.next);
    expect(brightnessLevel(start, start - APPEAR.enter / 2)).toBeCloseTo((APPEAR.next + 1) / 2, 12);
    expect(brightnessLevel(start, start)).toBe(1);
  });
});

describe("윤곽 빛", () => {
  it("같은 막 안에서는 열린 끝보다 80m 앞까지 켜지고, 20m에 걸쳐 바뀐다", () => {
    const start = actStart(1);
    const revealS = 40;
    expect(lightLevel(revealS + LIGHT.lead, start, revealS)).toBe(1);
    expect(lightLevel(revealS + LIGHT.lead + LIGHT.fade / 2, start, revealS)).toBeCloseTo(0.5, 12);
    expect(lightLevel(revealS + LIGHT.lead + LIGHT.fade, start, revealS)).toBe(0);
  });

  it("다음 막은 그 막 길이 열리기 전까지 꺼져 있다", () => {
    const start = actStart(3);
    expect(lightLevel(start + 5, start, start - LIGHT.fade)).toBe(0);
    expect(lightLevel(start + 5, start, start - LIGHT.fade / 2)).toBeGreaterThan(0);
    expect(lightLevel(start + 5, start, start)).toBe(1);
  });

  it("최대 휘도는 0.35이고 모든 궤적 색에서 같다", () => {
    for (let s = ROAD_START; s <= ROAD_END; s += 1.7) expect(luminance(rimColor(s)), `s=${s}`).toBeCloseTo(LIGHT.rim, 12);
  });

  it("막 경계에서 풍경 빛의 색조가 궤적 색과 같다", () => {
    for (const s of [actStart(2) - 0.5, actStart(2), actStart(2) + 0.5, actStart(3) - 0.5, actStart(3), actStart(3) + 0.5]) {
      const rim = rimColor(s);
      const trail = trailColor(s);
      const k = rim[0] / trail[0];
      for (let channel = 0; channel < 3; channel++) expect(rim[channel], `s=${s}`).toBeCloseTo(trail[channel] * k, 12);
    }
  });
});

describe("자리 규칙", () => {
  const samples = roadSamples(1);

  it("도로 표본은 도로 시작부터 끝까지이고 도로 위 점은 거리 0이다", () => {
    const start = roadFrame(ROAD_START).position;
    const end = roadFrame(ROAD_END).position;
    expect(samples[0]).toEqual([start[0], start[2]]);
    expect(samples[samples.length - 1]).toEqual([end[0], end[2]]);
    expect(roadDistance(start[0], start[2], samples)).toBe(0);
  });

  it("도로 끝 앞쪽 연장선 양옆 70m만 비운다", () => {
    const end = roadFrame(ROAD_END);
    const length = Math.hypot(end.tangent[0], end.tangent[2]);
    const t = [end.tangent[0] / length, end.tangent[2] / length];
    const at = (along: number, lateral: number) =>
      inEndCorridor(end.position[0] + t[0] * along - t[1] * lateral, end.position[2] + t[1] * along + t[0] * lateral);
    expect(RULES.corridor).toBe(70);
    expect(at(50, 0)).toBe(true);
    expect(at(50, 69)).toBe(true);
    expect(at(50, -69)).toBe(true);
    expect(at(50, 71)).toBe(false);
    expect(at(-10, 0)).toBe(false);
  });

  it("홀로그램 가운데는 그 시선 안이고, 옆으로 크게 벗어난 자리는 아니다", () => {
    expect(EXHIBIT_SIGHTS).toHaveLength(3);
    expect(HALL_SIGHTS).toHaveLength(5);
    for (const sight of [...EXHIBIT_SIGHTS, ...HALL_SIGHTS]) {
      const ahead: [number, number, number] = [
        sight.camera[0] + sight.direction[0] * 60,
        sight.camera[1] + sight.direction[1] * 60,
        sight.camera[2] + sight.direction[2] * 60,
      ];
      expect(behindSight(ahead, 1, [sight])).toBe(true);
      const side: [number, number, number] = [sight.camera[0] - sight.direction[2] * 60, sight.camera[1], sight.camera[2] + sight.direction[0] * 60];
      expect(behindSight(side, 1, [sight])).toBe(false);
    }
  });
});

describe("화면 투영", () => {
  it("카메라 목표는 화면 가운데이고, 오른쪽·위는 화면 오른쪽·위다", () => {
    const range = rangeOf("act-3");
    const pose = driveAt((range.start + range.end) / 2).camera;
    const center = projectPoint(pose, pose.target, 1.6);
    expect(center.x).toBeCloseTo(0.5, 9);
    expect(center.y).toBeCloseTo(0.5, 9);
    expect(center.depth).toBeGreaterThan(0);
    const above = projectPoint(pose, [pose.target[0], pose.target[1] + 5, pose.target[2]], 1.6);
    expect(above.y).toBeLessThan(0.5);
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4 src/lib/journey/landscape.test.ts`
Expected: FAIL — `Error: Cannot find module './landscape' imported from …/landscape.test.ts`(Tests no tests)

- [ ] **Step 3: 모듈을 쓴다**

`src/lib/journey/landscape.ts` 전체:

```ts
import { ROAD_END, ROAD_SCALE, ROAD_START, driveAt, roadFrame, type CameraPose } from "./drive";
import { HOLOGRAMS, hologramsAt, luminance, pickcareFront } from "./holograms";
import { CAMERA_FOV, pathSpan, rangeOf, smoothstep, type Vec3 } from "./timeline";
import { trailColor, type LinearRgb } from "./trail";

/**
 * 막별 풍경(스펙 3절 "막별 풍경 (2-3b)"): 막별 설정 목록, 자리 규칙, 등장·밝기·빛 켜짐·윤곽 빛 색의 식.
 * 배치와 정점은 landscapeBuild.ts가 만들고, 장면의 셰이더(scene/landscapeMaterial.ts)가 같은 상수로 같은 식을 쓴다
 * (landscapeMaterial.test.ts가 두 계산을 맞춰 본다). three를 import하지 않는 순수 코드다.
 * 여정은 막이 계속 늘어난다. 새 막은 LANDSCAPE_ACTS에 줄 하나를 더하고, 마지막 막이라고 가정하는 코드는 두지 않는다.
 * 막 목록을 받는 함수는 시험용 목록(막을 하나 더한 설정)도 받는다.
 */

/** 배치의 시드. 같은 시드·도로·설정이면 같은 정점이 나온다 */
export const LANDSCAPE_SEED = 20261016;

export type LandscapeKind = "cliffs" | "rocks" | "city";

export interface LandscapeAct {
  /** 막 번호(1부터) */
  act: number;
  /** 막 진입 정류장(timeline STOPS). 막은 그 정류장의 경로에서 시작한다 */
  stopId: string;
  kind: LandscapeKind;
}

/** 막별 설정 목록. 순서가 막 순서다 */
export const LANDSCAPE_ACTS: readonly LandscapeAct[] = [
  { act: 1, stopId: "act-1", kind: "cliffs" },
  { act: 2, stopId: "act-2", kind: "rocks" },
  { act: 3, stopId: "act-3", kind: "city" },
];

function actEntry(act: number, acts: readonly LandscapeAct[]): LandscapeAct {
  const entry = acts.find((item) => item.act === act);
  if (!entry) throw new Error(`풍경 설정에 ${act}막이 없습니다`);
  return entry;
}

/** 막의 시작(도로 s, m). 첫 막은 도로 시작이다(입구를 1막으로 친다) */
export function actStart(act: number, acts: readonly LandscapeAct[] = LANDSCAPE_ACTS): number {
  const entry = actEntry(act, acts);
  return entry.act === acts[0].act ? ROAD_START : pathSpan(entry.stopId).from * ROAD_SCALE;
}

/** 막의 끝(도로 s, m): 다음 막의 시작, 마지막 막이면 지금 도로 끝 */
export function actEnd(act: number, acts: readonly LandscapeAct[] = LANDSCAPE_ACTS): number {
  const next = acts.find((item) => item.act === act + 1);
  return next ? actStart(next.act, acts) : ROAD_END;
}

/** 막 진입 정류장 id */
export function actStopId(act: number, acts: readonly LandscapeAct[] = LANDSCAPE_ACTS): string {
  return actEntry(act, acts).stopId;
}

/** 막 진입 정류장이 끝나는 자리(도로 s, m). 막 제목이 지나간 뒤다 */
export function actTitleEnd(act: number, acts: readonly LandscapeAct[] = LANDSCAPE_ACTS): number {
  return pathSpan(actEntry(act, acts).stopId).to * ROAD_SCALE;
}

// ── 막 단위 등장과 밝기 ────────────────────────────────────

/** 막 단위 등장(스펙 "막 단위 등장"): 나타나는 폭(m), 밝아지는 폭(m), 아직 들어서지 않은 다음 막의 밝기 */
export const APPEAR = { fade: 20, enter: 30, next: 0.35 } as const;

/** 처음부터 보이는 막의 "나타나기 시작하는 자리". 셰이더도 이 값을 받아 늘 1이 된다 */
export const ALWAYS = -10000;

/** N막 풍경이 나타나기 시작하는 자리(도로 s): 첫 두 막은 처음부터(ALWAYS), 그다음 막부터는 바로 앞 막의 시작 */
export function appearFrom(act: number, acts: readonly LandscapeAct[] = LANDSCAPE_ACTS): number {
  return act <= acts[0].act + 1 ? ALWAYS : actStart(act - 1, acts);
}

/** 풍경이 보이는 정도(0~1). 차가 from을 지나 fade(m)를 달리는 동안 0 → 1. 0이면 그 막 메시를 그리지 않는다 */
export function appearLevel(from: number, carS: number): number {
  return smoothstep(from, from + APPEAR.fade, carS);
}

/** 밝기 배율: 아직 들어서지 않은 막은 APPEAR.next, 차가 막 시작 enter(m) 앞에서 막 시작까지 1로 */
export function brightnessLevel(start: number, carS: number): number {
  return APPEAR.next + (1 - APPEAR.next) * smoothstep(start - APPEAR.enter, start, carS);
}

// ── 윤곽 빛 ──────────────────────────────────────────────

/** 윤곽 빛(스펙 "빛"): 막 안에서 열린 끝보다 lead(m) 앞까지 켜고 fade(m)에 걸쳐 바뀐다. rim은 최대 휘도(선형 HDR, Rec.709) */
export const LIGHT = { lead: 80, fade: 20, rim: 0.35 } as const;

/** 엔딩에서 물러나는 정도: 불투명도, 빛 배율, 최소 안개 */
export const ENDING = { opacity: 0.35, light: 0.3, haze: 0.55 } as const;

/** 정점 자리 s(생성 때 저장한 도로 s), 그 막의 시작 start에서 빛이 켜진 정도(0~1). 다음 막은 그 막 길이 열리기 전까지 0이다 */
export function lightLevel(s: number, start: number, revealS: number): number {
  return smoothstep(start - LIGHT.fade, start, revealS) * smoothstep(s - LIGHT.fade, s, revealS + LIGHT.lead);
}

/** 자리 s의 윤곽 빛 색(선형 HDR): 궤적 색을 휘도 1로 맞춘 색조 × rim. 휘도가 rim이라 블룸 문턱(1) 아래다 */
export function rimColor(s: number): LinearRgb {
  const color = trailColor(s);
  const scale = LIGHT.rim / Math.max(luminance(color), 1e-3);
  return [color[0] * scale, color[1] * scale, color[2] * scale];
}

// ── 자리 규칙 ────────────────────────────────────────────

/**
 * 자리 규칙(스펙 "자리 규칙", 수평 m). 생성은 sampleStep 간격의 도로 표본에서 push 밖으로 밀고, 테스트는 testStep 간격으로
 * clearance를 확인한다. 첨탑은 spire 이상. 도로 끝 연장선 양옆 corridor 안(도로 끝 앞쪽)에는 두지 않는다.
 * corridor는 모든 막에 같고 70m다(사용자 결정 2026-10-19): 길 반폭 8m + clearance 40m + 굽이 여유 22m.
 * 100m면 도로 끝 연장선이 지나는 2막 후반 오른쪽 암석 24개가 빠졌다. clearance 확인은 이 규칙과 따로 한다.
 */
export const RULES = { clearance: 40, push: 45, spire: 100, corridor: 70, sampleStep: 2, testStep: 0.5 } as const;

/** 도로 중심선 표본(수평 x, z). 도로 시작부터 끝까지 step 간격이고 끝을 넣는다 */
export function roadSamples(step: number): [number, number][] {
  const samples: [number, number][] = [];
  for (let s = ROAD_START; s < ROAD_END; s += step) {
    const position = roadFrame(s).position;
    samples.push([position[0], position[2]]);
  }
  const end = roadFrame(ROAD_END).position;
  samples.push([end[0], end[2]]);
  return samples;
}

/** 수평 자리 (x, z)에서 가장 가까운 도로 표본까지의 거리(m) */
export function roadDistance(x: number, z: number, samples: readonly [number, number][]): number {
  let best = Infinity;
  for (const [rx, rz] of samples) best = Math.min(best, Math.hypot(x - rx, z - rz));
  return best;
}

/** 도로 끝 연장선 양옆 corridor(m) 안인가(도로 끝보다 앞쪽만). 나중에 길이 이어질 자리다 */
export function inEndCorridor(x: number, z: number): boolean {
  const end = roadFrame(ROAD_END);
  const length = Math.hypot(end.tangent[0], end.tangent[2]);
  const tx = end.tangent[0] / length;
  const tz = end.tangent[2] / length;
  const dx = x - end.position[0];
  const dz = z - end.position[2];
  const along = dx * tx + dz * tz;
  const lateral = Math.abs(dx * tz - dz * tx);
  return along > 0 && lateral < RULES.corridor;
}

/** 수평 오른쪽(뱅킹 없이)과 앞쪽. 풍경은 수평으로 놓는다 */
export function flatFrame(s: number): { origin: Vec3; right: Vec3; forward: Vec3 } {
  const frame = roadFrame(s);
  const length = Math.hypot(frame.tangent[0], frame.tangent[2]);
  const forward: Vec3 = [frame.tangent[0] / length, 0, frame.tangent[2] / length];
  return { origin: frame.position, right: [-forward[2], 0, forward[0]], forward };
}

// ── 정류장 홀로그램 뒤 비우기 ───────────────────────────────

/** 정류장 홀로그램 뒤 비우기: 정류장 가운데 카메라에서 홀로그램 가운데를 보는 방향과 비우는 각(도) */
export interface Sight {
  camera: Vec3;
  direction: Vec3;
  clear: number;
}

/** 비우는 각(도): 2막 정류장 ±25°, PiCKCARE 다섯 줄 ±18° */
export const BACKDROP = { exhibit: 25, hall: 18 } as const;

function sightsOf(act: 2 | 3, clear: number): Sight[] {
  return HOLOGRAMS.flatMap((hologram, index) => {
    if (hologram.act !== act) return [];
    const range = rangeOf(hologram.stopId);
    const middle = (range.start + range.end) / 2;
    const camera = driveAt(middle).camera.position;
    const center = hologramsAt(middle, pickcareFront(middle, ""))[index].center;
    const direction: Vec3 = [center[0] - camera[0], center[1] - camera[1], center[2] - camera[2]];
    const length = Math.hypot(direction[0], direction[1], direction[2]);
    return [{ camera, direction: [direction[0] / length, direction[1] / length, direction[2] / length], clear }];
  });
}

/** 2막 정류장 홀로그램 셋의 시선 */
export const EXHIBIT_SIGHTS: readonly Sight[] = sightsOf(2, BACKDROP.exhibit);
/** PiCKCARE 저장소 다섯의 시선 */
export const HALL_SIGHTS: readonly Sight[] = sightsOf(3, BACKDROP.hall);

/** 반지름 radius(m)인 풍경 요소의 가운데 point가 어느 시선의 비우는 각(겉보기 크기만큼 더해) 안에 드는가 */
export function behindSight(point: Vec3, radius: number, sights: readonly Sight[]): boolean {
  return sights.some(({ camera, direction, clear }) => {
    const v = [point[0] - camera[0], point[1] - camera[1], point[2] - camera[2]];
    const distance = Math.hypot(v[0], v[1], v[2]);
    const cos = (v[0] * direction[0] + v[1] * direction[1] + v[2] * direction[2]) / distance;
    const angle = (Math.acos(Math.min(1, Math.max(-1, cos))) * 180) / Math.PI;
    return angle < clear + (Math.atan(radius / distance) * 180) / Math.PI;
  });
}

// ── 화면 투영 ────────────────────────────────────────────

/**
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

- [ ] **Step 4: 통과를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4 src/lib/journey/landscape.test.ts`
Expected: PASS — `Tests  15 passed (15)`

- [ ] **Step 5: 전체 확인**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`은 무시)

Run: `rtk proxy npx tsc --noEmit` → exit 0
Run: `rtk proxy npx vitest run --maxWorkers=4` → `Tests  347 passed (347)`
Run: `rtk proxy npx eslint src/lib/journey/landscape.ts src/lib/journey/landscape.test.ts` → exit 0, 출력 없음

- [ ] **Step 6: 커밋 정리를 제출한다**

파일별 변경 표와 메시지 초안. 초안 예:

```
feat: 여정 막별 풍경의 설정 목록과 자리 규칙·등장·빛의 식 추가

- 막별 설정 목록으로 계산해 막이 늘어도 설정 한 줄로 확장된다(마지막 막을 가정하지 않는다)
- 셰이더가 같은 상수·같은 식을 쓰도록 등장·밝기·빛 켜짐·빛 색을 순수 함수로 둔다
- 도로 끝 연장선 비움은 모든 막에 양옆 70m다(사용자 결정)
```

---

### Task 2: 배치와 정점(`landscapeBuild.ts`)

스펙 3절 "막별 구성"·"자리 규칙"이다. 1막 절벽(양옆 세 겹), 2막 부유 암석(가까운 50 + 먼 24), 3막 도시(141채), 첨탑의 정점과 셰이더 속성을 시드·도로 함수·막별 설정에서 만든다. 수치와 난수를 뽑는 순서는 승인한 사본 시제품과 같다. 자리 규칙은 다 뽑은 뒤의 추가 밀기·건너뛰기로만 지켜 승인한 배치가 그대로 남는다. 암석과 건물은 가장 먼 정점까지의 거리만큼 더 밀어 모든 정점이 도로에서 40m 밖이고, 도로 끝 연장선은 정점마다 본다. 홀로그램 뒤 비우기는 요소의 가운데와 기준 크기로 판정한다(시제품 기준, 실제 가림은 Task 3). 규칙 때문에 뺀 요소는 이유와 함께 남긴다(사용자 요청). 암석의 기본 형태는 three `IcosahedronGeometry(1, 2)`와 같은 순서·감김의 정이십면체를 순수 코드로 만든다(정점마다 거리 규칙을 테스트하려면 lib 안에 있어야 한다).

**Files:**
- Create: `src/lib/journey/landscapeBuild.test.ts`, `src/lib/journey/landscapeBuild.ts`

**Interfaces:**
- Consumes: Task 1의 `LANDSCAPE_SEED`, `RULES`, `EXHIBIT_SIGHTS`, `HALL_SIGHTS`, `actStart`, `actEnd`, `actStopId`, `actTitleEnd`, `appearFrom`, `behindSight`, `flatFrame`, `inEndCorridor`, `roadDistance`, `roadSamples`. `driveAt`·`roadFrame`(drive.ts), `rangeOf`·`Vec3`(timeline.ts)
- Produces: `SCALAR_ATTRIBUTES`(aS·aActStart·aAppearFrom·aRidge·aRidge2·aGlow·aBelow·aBelowTop·aLayer·aEdge·aDissolve), `type ScalarAttribute`, `NO_LINE = 999`, `type LandscapeItemKind`, `interface LandscapeItem { kind; first; count; min; max; sight? }`, `type ExclusionReason`, `interface LandscapeExclusion { kind; reason; point }`, `interface LandscapePiece { name; act; positions; scalars; rimNormals; items; excluded }`, `cityView(act): Vec3`, `spireBase(act): Vec3`, `spireTip(act): Vec3`, `buildLandscape(): LandscapePiece[]`, `landscapePieces(): readonly LandscapePiece[]`(처음 한 번 만들고 같은 배열)

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/lib/journey/landscapeBuild.test.ts` 전체:

```ts
import { describe, expect, it } from "vitest";
import { driveAt } from "./drive";
import {
  ALWAYS,
  EXHIBIT_SIGHTS,
  HALL_SIGHTS,
  RULES,
  actStart,
  behindSight,
  inEndCorridor,
  projectPoint,
  roadDistance,
  roadSamples,
} from "./landscape";
import { NO_LINE, SCALAR_ATTRIBUTES, buildLandscape, cityView, landscapePieces, spireBase, spireTip, type LandscapePiece } from "./landscapeBuild";
import { rangeOf, type Vec3 } from "./timeline";

const pieces = landscapePieces();

function piece(name: string): LandscapePiece {
  const found = pieces.find((item) => item.name === name);
  if (!found) throw new Error(`${name} 메시가 없습니다`);
  return found;
}

function vertex(target: LandscapePiece, index: number): Vec3 {
  return [target.positions[index * 3], target.positions[index * 3 + 1], target.positions[index * 3 + 2]];
}

function* vertices(target: LandscapePiece): Generator<Vec3> {
  for (let index = 0; index < target.positions.length / 3; index++) yield vertex(target, index);
}

describe("막별 풍경 메시", () => {
  it("1막 절벽, 2막 암석, 3막 도시와 첨탑의 네 메시다", () => {
    expect(pieces.map((item) => [item.name, item.act])).toEqual([
      ["journey-landscape-act1", 1],
      ["journey-landscape-act2", 2],
      ["journey-landscape-act3", 3],
      ["journey-landscape-spire", 3],
    ]);
  });

  it("같은 시드·도로·설정이면 같은 정점이다", () => {
    const again = buildLandscape();
    again.forEach((item, index) => {
      expect(item.positions).toEqual(pieces[index].positions);
      for (const name of SCALAR_ATTRIBUTES) expect(item.scalars[name], `${item.name} ${name}`).toEqual(pieces[index].scalars[name]);
      expect(item.rimNormals).toEqual(pieces[index].rimNormals);
    });
  });

  it("삼각형 셋씩이고 속성이 정점마다 있다", () => {
    for (const item of pieces) {
      const count = item.positions.length / 3;
      expect(count % 3, item.name).toBe(0);
      expect(item.rimNormals.length).toBe(count * 3);
      for (const name of SCALAR_ATTRIBUTES) expect(item.scalars[name].length, `${item.name} ${name}`).toBe(count);
      const covered = item.items.reduce((sum, entry) => sum + entry.count, 0);
      expect(covered, item.name).toBe(count);
      for (const value of item.positions) expect(Number.isFinite(value)).toBe(true);
    }
  });

  it("요소 수와 뺀 까닭: 암석 74개 가운데 56개(홀로그램 뒤 14, 도로 끝 연장선 4), 건물 141채 가운데 102채(홀로그램 뒤 39)", () => {
    const count = (item: LandscapePiece) => {
      const reasons: Record<string, number> = {};
      for (const entry of item.excluded) reasons[entry.reason] = (reasons[entry.reason] ?? 0) + 1;
      return { placed: item.items.length, reasons };
    };
    expect(count(piece("journey-landscape-act2"))).toEqual({ placed: 56, reasons: { hologram: 14, corridor: 4 } });
    expect(count(piece("journey-landscape-act3"))).toEqual({ placed: 102, reasons: { hologram: 39 } });
    expect(piece("journey-landscape-act1").excluded).toEqual([]);
  });

  it("막 시작·등장 값은 그 막의 것이다(1·2막은 처음부터, 3막은 2막 시작부터)", () => {
    for (const item of pieces) {
      expect(new Set(item.scalars.aActStart), item.name).toEqual(new Set([actStart(item.act)]));
      expect(new Set(item.scalars.aAppearFrom), item.name).toEqual(new Set([item.act <= 2 ? ALWAYS : actStart(2)]));
    }
  });

  it("암석만 윤곽 빛 법선이 있고, 도시와 첨탑만 도로 아래에서 투명하게 사라진다", () => {
    for (const item of pieces) {
      const rock = item.name === "journey-landscape-act2";
      expect(item.rimNormals.some((value) => value !== 0), item.name).toBe(rock);
      expect(new Set(item.scalars.aEdge), item.name).toEqual(new Set([rock ? 1 : 0]));
      expect(new Set(item.scalars.aDissolve), item.name).toEqual(new Set([item.act === 3 ? 1 : 0]));
    }
  });
});

describe("자리 규칙", () => {
  const samples = roadSamples(RULES.testStep);

  it("모든 정점이 모든 도로 표본(0.5m 간격)에서 수평 40m 이상이고, 첨탑은 100m 이상이다", () => {
    for (const item of pieces) {
      const limit = item.name === "journey-landscape-spire" ? RULES.spire : RULES.clearance;
      let nearest = Infinity;
      for (const [x, , z] of vertices(item)) nearest = Math.min(nearest, roadDistance(x, z, samples));
      expect(nearest, item.name).toBeGreaterThanOrEqual(limit);
    }
  });

  it("도로 끝 연장선 양옆 100m 안에는 정점이 없다", () => {
    for (const item of pieces) for (const [x, , z] of vertices(item)) expect(inEndCorridor(x, z), item.name).toBe(false);
  });

  it("2막 정류장 홀로그램 뒤 ±25°에 암석이, PiCKCARE 다섯 줄 뒤 ±18°에 건물이 없다(가운데와 기준 크기로 잰 겉보기 크기만큼 더해서)", () => {
    for (const [name, sights] of [
      ["journey-landscape-act2", EXHIBIT_SIGHTS],
      ["journey-landscape-act3", HALL_SIGHTS],
    ] as const) {
      for (const item of piece(name).items) {
        if (!item.sight) throw new Error(`${name} 요소에 판정 기준이 없습니다`);
        expect(behindSight(item.sight.point, item.sight.radius, sights), name).toBe(false);
        // 기준점은 그 요소의 상자 안이다(다른 자리로 판정하지 않았다)
        for (let axis = 0; axis < 3; axis++) {
          expect(item.sight.point[axis]).toBeGreaterThanOrEqual(item.min[axis] - 1e-6);
          expect(item.sight.point[axis]).toBeLessThanOrEqual(item.max[axis] + 1e-6);
        }
      }
    }
  });

  it("빛은 정해진 요소에만 있다: 절벽 앞 겹, 암석 일부, 주요 건물, 첨탑", () => {
    const glowing = (item: LandscapePiece) => item.scalars.aGlow.some((value) => value > 0);
    expect(pieces.every(glowing)).toBe(true);
    const spire = piece("journey-landscape-spire");
    expect(new Set(spire.scalars.aGlow)).toEqual(new Set([2]));
    // 첨탑은 세로 모서리 하나(네 면 가운데 한 면의 모서리)만 선까지 거리가 있다
    const lit = spire.scalars.aRidge2.filter((value) => value !== NO_LINE).length;
    expect(lit).toBe(spire.scalars.aRidge2.length / 4);
  });
});

describe("첨탑", () => {
  const ASPECTS = [16 / 10, 16 / 9];
  const VIEWS: [string, number][] = [
    ["act-3", 0.5],
    ["act-3", 1],
    ["pickcare", 0.03],
    ["pickcare", 0.97],
  ];

  it("3막 제목·진입 주행·도착·떠날 때 16:10·16:9 화면 안에 선다", () => {
    for (const [id, within] of VIEWS) {
      const range = rangeOf(id);
      const pose = driveAt(range.start + (range.end - range.start) * within).camera;
      for (const aspect of ASPECTS) {
        const tip = projectPoint(pose, spireTip(3), aspect);
        const label = `${id} ${within} ${aspect.toFixed(2)}`;
        expect(tip.depth, label).toBeGreaterThan(0);
        expect(tip.x, label).toBeGreaterThan(0.05);
        expect(tip.x, label).toBeLessThan(0.95);
        expect(tip.y, label).toBeGreaterThanOrEqual(0.07);
        expect(tip.y, label).toBeLessThan(0.5);
      }
    }
  });

  it("PiCKCARE에 머무는 동안에는 화면에 서지 않는다(카메라가 내려다본다)", () => {
    const range = rangeOf("pickcare");
    const pose = driveAt((range.start + range.end) / 2).camera;
    const tip = projectPoint(pose, spireTip(3), 16 / 10);
    const base = projectPoint(pose, spireBase(3), 16 / 10);
    const onScreen = (point: { x: number; y: number; depth: number }) => point.depth > 0 && point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1;
    expect(onScreen(tip) && onScreen(base)).toBe(false);
  });

  it("진입 카메라에서 확연히 높아 보인다: 건물 90%의 2배, 가장 높아 보이는 건물의 1.8배 넘게", () => {
    const view = cityView(3);
    const elevation = ([x, y, z]: Vec3) => Math.atan2(y - view[1], Math.hypot(x - view[0], z - view[2]));
    const city = piece("journey-landscape-act3");
    const tops = city.items
      .map((item) => {
        let top = -Infinity;
        for (let index = item.first; index < item.first + item.count; index++) top = Math.max(top, elevation(vertex(city, index)));
        return top;
      })
      .sort((a, b) => a - b);
    const spire = elevation(spireTip(3));
    expect(spire).toBeGreaterThan(2 * tops[Math.floor(tops.length * 0.9)]);
    expect(spire).toBeGreaterThan(1.8 * tops[tops.length - 1]);
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4 src/lib/journey/landscapeBuild.test.ts`
Expected: FAIL — `Error: Cannot find module './landscapeBuild' imported from …/landscapeBuild.test.ts`(Tests no tests)

- [ ] **Step 3: 모듈을 쓴다**

`src/lib/journey/landscapeBuild.ts` 전체:

```ts
import { driveAt, roadFrame } from "./drive";
import {
  EXHIBIT_SIGHTS,
  HALL_SIGHTS,
  LANDSCAPE_SEED,
  RULES,
  actEnd,
  actStart,
  actStopId,
  actTitleEnd,
  appearFrom,
  behindSight,
  flatFrame,
  inEndCorridor,
  roadDistance,
  roadSamples,
} from "./landscape";
import { rangeOf, type Vec3 } from "./timeline";

/**
 * 막별 풍경의 배치와 정점(스펙 3절 "막별 구성"). 1막 절벽, 2막 부유 암석, 3막 도시와 첨탑을 시드·도로 함수·설정에서 만든다.
 * 같은 입력이면 같은 정점이다. 장면(scene/landscapeGeometry.ts)은 이 배열을 그대로 BufferGeometry로 감싸고 법선만 계산한다.
 * 수치는 사본 시제품(2026-10-19)의 값이고, 시제품과 같은 순서로 난수를 뽑는다(승인한 모습 그대로). 자리 규칙(모든 정점이 도로
 * 표본에서 수평 RULES.push 밖, 도로 끝 연장선 비움)은 뽑기가 끝난 뒤의 추가 밀기·건너뛰기로 지킨다. three 없는 순수 코드다.
 */

/** 정점마다 하나씩인 속성(셰이더의 attribute float과 같은 이름) */
export const SCALAR_ATTRIBUTES = [
  "aS",
  "aActStart",
  "aAppearFrom",
  "aRidge",
  "aRidge2",
  "aGlow",
  "aBelow",
  "aBelowTop",
  "aLayer",
  "aEdge",
  "aDissolve",
] as const;
export type ScalarAttribute = (typeof SCALAR_ATTRIBUTES)[number];

/** 선(능선·지붕·세로 모서리)이 없는 정점의 "선까지 거리" */
export const NO_LINE = 999;

export type LandscapeItemKind = "cliff" | "rock" | "building" | "spire";

/** 요소 하나(절벽 한 구간, 암석·건물 하나, 첨탑): 정점 범위와 상자. 가림 판정이 상자로 거른 뒤 삼각형을 본다 */
export interface LandscapeItem {
  kind: LandscapeItemKind;
  first: number;
  count: number;
  min: Vec3;
  max: Vec3;
  /** 정류장 홀로그램 뒤 비우기를 판정한 기준점과 기준 반지름(암석은 크기, 건물은 폭·깊이 중 큰 값). 해당 없는 요소는 없다 */
  sight?: { point: Vec3; radius: number };
}

/** 규칙 때문에 두지 않은 요소와 그 규칙(어느 규칙이 배치를 뺐는지 추적한다) */
export type ExclusionReason = "hologram" | "corridor" | "spire" | "clearance";

export interface LandscapeExclusion {
  kind: LandscapeItemKind;
  reason: ExclusionReason;
  /** 판정한 자리(요소 가운데) */
  point: Vec3;
}

/** 메시 하나의 정점. positions·rimNormals는 정점마다 셋, scalars는 하나. 삼각형 셋씩(인덱스 없음) */
export interface LandscapePiece {
  /** 메시 이름(장면·통계·e2e가 쓴다) */
  name: string;
  act: number;
  positions: Float32Array;
  scalars: Record<ScalarAttribute, Float32Array>;
  /** 암석 윤곽 빛용 매끈한 법선(암석 가운데에서 바깥). 다른 요소는 0 */
  rimNormals: Float32Array;
  items: LandscapeItem[];
  /** hologram: 정류장 홀로그램 뒤, corridor: 도로 끝 연장선, spire: 진입 카메라에서 첨탑을 가림, clearance: 도로에서 밀어내지 못함 */
  excluded: LandscapeExclusion[];
}

type Values = Record<ScalarAttribute, number>;

/** 정점을 모으며 요소마다 범위·상자를 적는다 */
class PieceWriter {
  private positions: number[] = [];
  private scalars = Object.fromEntries(SCALAR_ATTRIBUTES.map((name) => [name, [] as number[]])) as Record<ScalarAttribute, number[]>;
  private rim: number[] = [];
  private items: LandscapeItem[] = [];
  private excluded: LandscapeExclusion[] = [];
  private current: LandscapeItem | null = null;

  /** 규칙 때문에 두지 않은 요소를 적는다 */
  exclude(kind: LandscapeItemKind, reason: ExclusionReason, point: Vec3): void {
    this.excluded.push({ kind, reason, point });
  }

  begin(kind: LandscapeItemKind, sight?: LandscapeItem["sight"]): void {
    this.current = {
      kind,
      first: this.positions.length / 3,
      count: 0,
      min: [Infinity, Infinity, Infinity],
      max: [-Infinity, -Infinity, -Infinity],
      ...(sight ? { sight } : {}),
    };
  }

  vertex(p: Vec3, values: Values, rimNormal: Vec3 = [0, 0, 0]): void {
    const item = this.current;
    if (!item) throw new Error("요소를 시작하지 않고 정점을 넣었습니다");
    this.positions.push(p[0], p[1], p[2]);
    for (const name of SCALAR_ATTRIBUTES) this.scalars[name].push(values[name]);
    this.rim.push(rimNormal[0], rimNormal[1], rimNormal[2]);
    item.count += 1;
    for (let axis = 0; axis < 3; axis++) {
      item.min[axis] = Math.min(item.min[axis], p[axis]);
      item.max[axis] = Math.max(item.max[axis], p[axis]);
    }
  }

  end(): void {
    if (this.current && this.current.count > 0) this.items.push(this.current);
    this.current = null;
  }

  finish(name: string, act: number): LandscapePiece {
    return {
      name,
      act,
      positions: new Float32Array(this.positions),
      scalars: Object.fromEntries(SCALAR_ATTRIBUTES.map((key) => [key, new Float32Array(this.scalars[key])])) as Record<ScalarAttribute, Float32Array>,
      rimNormals: new Float32Array(this.rim),
      items: this.items,
      excluded: this.excluded,
    };
  }
}

/** 32비트 시드 난수(mulberry32). 0 이상 1 미만 */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 1차원 값 노이즈(−1~1): 격자 값을 부드럽게 잇는다. scale(m)이 한 격자 */
function valueNoise(seed: number, scale: number): (x: number) => number {
  const random = rng(seed);
  const values = Array.from({ length: 512 }, () => random() * 2 - 1);
  return (x: number) => {
    const p = x / scale + 256;
    const i = Math.floor(p);
    const f = p - i;
    const u = f * f * (3 - 2 * f);
    return values[i % 512] * (1 - u) + values[(i + 1) % 512] * u;
  };
}

const PUSH_SAMPLES = roadSamples(RULES.sampleStep);

/** 점들 가운데 하나라도 도로 끝 연장선 비움 안에 드는가(정점 기준) */
function inCorridor(points: readonly Vec3[]): boolean {
  return points.some((point) => inEndCorridor(point[0], point[2]));
}

/** 자리 (x, z)가 도로에서 수평 clear(m) 안이면 side 쪽으로 3m씩 민 옆 거리를 낸다 */
function pushOut(origin: Vec3, right: Vec3, side: number, lateral: number, clear: number): number {
  let value = lateral;
  for (let guard = 0; guard < 200 && roadDistance(origin[0] + right[0] * value, origin[2] + right[2] * value, PUSH_SAMPLES) < clear; guard++) {
    value += side * 3;
  }
  return value;
}

/** 가운데 (x, z)가 도로에서 수평 clear(m) 밖인가(pushOut이 밀어내지 못한 경우를 거른다) */
function cleared(point: Vec3, clear: number): boolean {
  return roadDistance(point[0], point[2], PUSH_SAMPLES) >= clear;
}

// ── 1막 절벽 ─────────────────────────────────────────────

interface CliffLayer {
  /** 0 앞, 1 가운데, 2 먼 능선 */
  depthLayer: 0 | 1 | 2;
  /** 이 겹이 놓이는 도로 구간(m). 없으면 CLIFF.start~end */
  span?: [number, number];
  side: -1 | 1;
  lateral: number;
  lateralAmp: number;
  height: number;
  heightAmp: number;
  depth: number;
  glow: boolean;
  seed: number;
}

/** 1막 절벽: 도로 구간, 표본 간격, 도로 아래 바닥, 끝을 낮추는 길이(앞 겹·먼 능선) */
const CLIFF = { end: 92, step: 1.5, bottom: 70, taper: 28, farTaper: 50 } as const;

/** 양옆 세 겹. 왼쪽은 홀로그램 자리라 더 키우지 않는다(사용자 결정 2026-10-19). 앞 겹만 능선 일부가 빛난다 */
const CLIFF_LAYERS: CliffLayer[] = [
  { depthLayer: 0, side: -1, lateral: 47, lateralAmp: 5, height: 26, heightAmp: 9, depth: 22, glow: true, seed: 1 },
  { depthLayer: 0, side: 1, lateral: 60, lateralAmp: 8, height: 30, heightAmp: 10, depth: 24, glow: true, seed: 2 },
  { depthLayer: 1, side: -1, lateral: 82, lateralAmp: 10, height: 42, heightAmp: 12, depth: 30, glow: false, seed: 3 },
  { depthLayer: 1, side: 1, lateral: 96, lateralAmp: 12, height: 44, heightAmp: 12, depth: 30, glow: false, seed: 4 },
  // 먼 능선: 앞으로 이어질 길 양옆 멀리, 안개에 묻혀 화면 가운데 지평선 위에 띠로 보인다
  { depthLayer: 2, side: -1, lateral: 175, lateralAmp: 30, height: 54, heightAmp: 18, depth: 60, glow: false, seed: 5, span: [30, 135] },
  { depthLayer: 2, side: 1, lateral: 195, lateralAmp: 30, height: 60, heightAmp: 18, depth: 60, glow: false, seed: 6, span: [40, 140] },
];

interface CliffSample {
  s: number;
  innerBottom: Vec3;
  innerTop: Vec3;
  outerTop: Vec3;
  outerBottom: Vec3;
  height: number;
  depth: number;
  glow: number;
}

function cliffSamples(layer: CliffLayer, act: number): CliffSample[] {
  const lateralNoise = valueNoise(LANDSCAPE_SEED + layer.seed * 11, 24);
  const heightNoise = valueNoise(LANDSCAPE_SEED + layer.seed * 13, 14);
  const jag = valueNoise(LANDSCAPE_SEED + layer.seed * 17, 3.5);
  const column = valueNoise(LANDSCAPE_SEED + layer.seed * 23, 2.2);
  const glowNoise = valueNoise(LANDSCAPE_SEED + layer.seed * 19, 18);
  // 겹마다 시작·끝을 조금씩 어긋나게 해 끝이 한 줄로 잘리지 않게 한다
  const start = (layer.span?.[0] ?? actStart(act)) + layer.seed * 1.7;
  const end = (layer.span?.[1] ?? CLIFF.end) - (layer.depthLayer === 0 ? 0 : 6 + layer.seed * 2);
  const samples: CliffSample[] = [];
  for (let s = start; s <= end + 1e-9; s += CLIFF.step) {
    const { origin, right } = flatFrame(s);
    // 안쪽 면을 세로 기둥처럼: 짧은 주기로 바깥쪽으로 1~4m 들고 난다. 다른 도로 구간이 가까이 지나가면 바깥으로 민다
    const raw = layer.side * (layer.lateral + layer.lateralAmp * lateralNoise(s) + 2.5 * Math.abs(column(s)));
    const lateral = pushOut(origin, right, layer.side, raw, RULES.push);
    const h = Math.max(8, layer.height + layer.heightAmp * heightNoise(s) + 5 * jag(s) + 4 * Math.abs(jag(s * 2.7)));
    const out = layer.side * layer.depth;
    const at = (offset: number, y: number): Vec3 => [origin[0] + right[0] * offset, origin[1] + y, origin[2] + right[2] * offset];
    // 끝은 높이를 점점 낮춰 사라진다(앞은 짧게, 끝은 길게)
    const fadeIn = Math.min(1, (s - start) / 10);
    const fadeOut = Math.min(1, (end - s) / (layer.depthLayer === 2 ? CLIFF.farTaper : CLIFF.taper));
    const fade = Math.max(0, Math.min(fadeIn, fadeOut));
    const height = h * (0.08 + 0.92 * fade * fade * (3 - 2 * fade));
    samples.push({
      s,
      innerBottom: at(lateral, -CLIFF.bottom),
      innerTop: at(lateral, height),
      outerTop: at(lateral + out, height * 0.82),
      outerBottom: at(lateral + out, -CLIFF.bottom),
      height,
      depth: Math.abs(out),
      glow: layer.glow ? Math.max(0, Math.min(1, (glowNoise(s) - 0.15) * 4)) * fade : 0,
    });
  }
  return samples;
}

function buildCliffs(act: number): LandscapePiece {
  const writer = new PieceWriter();
  const start = actStart(act);
  const from = appearFrom(act);
  for (const layer of CLIFF_LAYERS) {
    const samples = cliffSamples(layer, act);
    for (let i = 0; i < samples.length - 1; i++) {
      const p = samples[i];
      const q = samples[i + 1];
      const roadY = roadFrame(p.s).position[1];
      writer.begin("cliff");
      const quad = (a: Vec3, b: Vec3, c: Vec3, d: Vec3, ridge: [number, number, number, number], glowA: number, glowB: number) => {
        const points = [a, b, c, a, c, d];
        const sides = [0, 0, 1, 0, 1, 1];
        const ridges = [ridge[0], ridge[1], ridge[2], ridge[0], ridge[2], ridge[3]];
        points.forEach((point, index) => {
          const sample = sides[index] === 0 ? p : q;
          writer.vertex(point, {
            aS: sample.s,
            aActStart: start,
            aAppearFrom: from,
            aRidge: ridges[index],
            aRidge2: NO_LINE,
            aGlow: sides[index] === 0 ? glowA : glowB,
            aBelow: Math.max(0, roadY - point[1]),
            aBelowTop: Math.max(0, sample.innerTop[1] - point[1]),
            aLayer: layer.depthLayer,
            aEdge: 0,
            aDissolve: 0,
          });
        });
      };
      // 안쪽 면: 능선까지 거리 = 위에서 잰 높이 차
      quad(p.innerBottom, p.innerTop, q.innerTop, q.innerBottom, [p.height + CLIFF.bottom, 0, 0, q.height + CLIFF.bottom], p.glow, q.glow);
      // 윗면: 능선까지 거리 = 안쪽 가장자리에서 잰 너비
      quad(p.innerTop, p.outerTop, q.outerTop, q.innerTop, [0, p.depth, q.depth, 0], p.glow, q.glow);
      // 바깥 면: 빛 없음
      quad(p.outerTop, p.outerBottom, q.outerBottom, q.outerTop, [NO_LINE, NO_LINE, NO_LINE, NO_LINE], 0, 0);
      writer.end();
    }
  }
  return writer.finish("journey-landscape-act1", act);
}

// ── 2막 부유 암석 ─────────────────────────────────────────

/** 2막 암석: 가까운 것·먼 것의 수, 몰리는 가운데(s), 빛나는 비율, 기본 형태 수 */
const ROCKS = { near: 50, far: 24, from: 85, spread: 85, middle: 127, middleWidth: 45, glow: 0.3, shapes: 5 } as const;

/** 정이십면체 꼭짓점과 면(three IcosahedronGeometry와 같은 순서) */
const ICOSAHEDRON = (() => {
  const t = (1 + Math.sqrt(5)) / 2;
  const vertices = [-1, t, 0, 1, t, 0, -1, -t, 0, 1, -t, 0, 0, -1, t, 0, 1, t, 0, -1, -t, 0, 1, -t, t, 0, -1, t, 0, 1, -t, 0, -1, -t, 0, 1];
  const indices = [
    0, 11, 5, 0, 5, 1, 0, 1, 7, 0, 7, 10, 0, 10, 11, 1, 5, 9, 5, 11, 4, 11, 10, 2, 10, 7, 6, 7, 1, 8, 3, 9, 4, 3, 4, 2, 3, 2, 6, 3, 6, 8, 3,
    8, 9, 4, 9, 5, 2, 4, 11, 6, 2, 10, 8, 6, 7, 9, 8, 1,
  ];
  return { vertices, indices };
})();

/**
 * 반지름 1 구에 붙인 정이십면체를 면마다 (detail + 1)² 조각으로 나눈 정점(삼각형 셋씩, three PolyhedronGeometry와 같은 순서·감김)
 */
function icosphere(detail: number): Vec3[] {
  const corner = (index: number): Vec3 => [ICOSAHEDRON.vertices[index * 3], ICOSAHEDRON.vertices[index * 3 + 1], ICOSAHEDRON.vertices[index * 3 + 2]];
  const lerp = (a: Vec3, b: Vec3, t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const out: Vec3[] = [];
  const cols = detail + 1;
  for (let face = 0; face < ICOSAHEDRON.indices.length; face += 3) {
    const a = corner(ICOSAHEDRON.indices[face]);
    const b = corner(ICOSAHEDRON.indices[face + 1]);
    const c = corner(ICOSAHEDRON.indices[face + 2]);
    const v: Vec3[][] = [];
    for (let i = 0; i <= cols; i++) {
      v[i] = [];
      const aj = lerp(a, c, i / cols);
      const bj = lerp(b, c, i / cols);
      const rows = cols - i;
      for (let j = 0; j <= rows; j++) v[i][j] = j === 0 && i === cols ? aj : lerp(aj, bj, j / rows);
    }
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < 2 * (cols - i) - 1; j++) {
        const k = Math.floor(j / 2);
        if (j % 2 === 0) out.push(v[i][k + 1], v[i + 1][k], v[i][k]);
        else out.push(v[i][k + 1], v[i + 1][k + 1], v[i + 1][k]);
      }
    }
  }
  return out.map((p) => {
    const length = Math.hypot(p[0], p[1], p[2]);
    return [p[0] / length, p[1] / length, p[2] / length];
  });
}

function hash3(x: number, y: number, z: number, seed: number): number {
  const v = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + seed * 19.19) * 43758.5453;
  return v - Math.floor(v);
}

/** 3차원 값 노이즈(−1~1) */
function noise3(x: number, y: number, z: number, seed: number): number {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const c = (dx: number, dy: number, dz: number) => hash3(xi + dx, yi + dy, zi + dz, seed);
  return (
    lerp(
      lerp(lerp(c(0, 0, 0), c(1, 0, 0), u), lerp(c(0, 1, 0), c(1, 1, 0), u), v),
      lerp(lerp(c(0, 0, 1), c(1, 0, 1), u), lerp(c(0, 1, 1), c(1, 1, 1), u), v),
      w,
    ) *
      2 -
    1
  );
}

/** 기본 암석(반지름 약 1): 윗면은 납작하고 아래는 뾰족한 떠 있는 섬. 같은 자리의 정점은 같은 만큼 움직인다 */
function rockShape(seed: number): Vec3[] {
  return icosphere(2).map(([x0, y0, z0]) => {
    const r = 1 + 0.32 * noise3(x0 * 1.3, y0 * 1.3, z0 * 1.3, seed) + 0.14 * noise3(x0 * 3.1, y0 * 3.1, z0 * 3.1, seed + 7);
    let x = x0 * r, y = y0 * r, z = z0 * r;
    if (y > 0.15) y = 0.15 + (y - 0.15) * 0.4;
    if (y < 0) {
      const taper = 1 + y * 0.3;
      y *= 1.8;
      x *= taper;
      z *= taper;
    }
    return [x, y, z];
  });
}

function buildRocks(act: number): LandscapePiece {
  const random = rng(LANDSCAPE_SEED + 202);
  const shapes = Array.from({ length: ROCKS.shapes }, (_, index) => rockShape(LANDSCAPE_SEED + index * 31));
  const writer = new PieceWriter();
  const start = actStart(act);
  const from = appearFrom(act);
  for (let n = 0; n < ROCKS.near + ROCKS.far; n++) {
    const far = n >= ROCKS.near;
    // 2막 가운데에 몰리고 클수록 가운데
    const s = ROCKS.from + ROCKS.spread * ((random() + random()) / 2);
    const middle = 1 - Math.min(1, Math.abs(s - ROCKS.middle) / ROCKS.middleWidth);
    const size = (far ? 12 + 14 * middle : 6 + 12 * middle) * (0.7 + 0.4 * random());
    const side = random() < 0.5 ? -1 : 1;
    const { origin, right } = flatFrame(s);
    let lateral = side * (far ? 110 + 90 * random() : 40 + size * 0.8 + 70 * Math.pow(random(), 0.8));
    lateral = pushOut(origin, right, side, lateral, RULES.push + size);
    const height = far ? -20 + 60 * random() : -30 + 65 * random();
    let center: Vec3 = [origin[0] + right[0] * lateral, origin[1] + height, origin[2] + right[2] * lateral];
    if (behindSight(center, size, EXHIBIT_SIGHTS)) {
      writer.exclude("rock", "hologram", center);
      continue;
    }
    const shape = shapes[Math.floor(random() * shapes.length)];
    const stretchX = 0.75 + 0.6 * random();
    const stretchZ = 0.75 + 0.6 * random();
    const yaw = random() * Math.PI * 2;
    const tilt = (random() - 0.5) * 0.35;
    const glow = !far && random() < ROCKS.glow ? 1 : 0;
    const cos = Math.cos(yaw), sin = Math.sin(yaw);
    const local = shape.map(([x0, y0, z0]): Vec3 => {
      const x = x0 * stretchX * size;
      const y = y0 * size + x * tilt;
      const z = z0 * stretchZ * size;
      return [x * cos - z * sin, y, x * sin + z * cos];
    });
    // 모든 정점이 도로에서 RULES.push 밖이 되게, 수평으로 가장 먼 정점의 거리만큼 더 민다(뽑기는 그대로)
    const reach = Math.max(...local.map(([x, , z]) => Math.hypot(x, z)));
    lateral = pushOut(origin, right, side, lateral, RULES.push + reach);
    center = [origin[0] + right[0] * lateral, origin[1] + height, origin[2] + right[2] * lateral];
    const placed = local.map((offset): Vec3 => [center[0] + offset[0], center[1] + offset[1], center[2] + offset[2]]);
    // 민 자리에서 다시 본다: 도로 거리, 홀로그램 뒤 비우기(가운데·크기), 도로 끝 연장선(정점마다)
    const reason: ExclusionReason | null = !cleared(center, RULES.push + reach)
      ? "clearance"
      : behindSight(center, size, EXHIBIT_SIGHTS)
        ? "hologram"
        : inCorridor(placed)
          ? "corridor"
          : null;
    if (reason) {
      writer.exclude("rock", reason, center);
      continue;
    }
    const layer = glow ? 0 : Math.abs(lateral) > 100 ? 2 : 1;
    const top = center[1] + Math.max(...local.map(([, y]) => y));
    writer.begin("rock", { point: center, radius: size });
    for (const [index, offset] of local.entries()) {
      const p = placed[index];
      // 가장자리 빛용 매끈한 법선: 암석 가운데에서 바깥 방향(각진 면 전체가 빛나지 않게)
      const length = Math.hypot(offset[0], offset[1], offset[2]) || 1;
      writer.vertex(
        p,
        {
          aS: s,
          aActStart: start,
          aAppearFrom: from,
          aRidge: NO_LINE,
          aRidge2: NO_LINE,
          aGlow: glow,
          aBelow: Math.max(0, origin[1] - p[1]),
          aBelowTop: Math.max(0, top - p[1]),
          aLayer: layer,
          aEdge: 1,
          aDissolve: 0,
        },
        [offset[0] / length, offset[1] / length, offset[2] / length],
      );
    }
    writer.end();
  }
  return writer.finish("journey-landscape-act2", act);
}

// ── 3막 도시와 첨탑 ───────────────────────────────────────

/**
 * 3막 도시: 건물 수, 시작(3막 제목 정류장이 끝나는 자리)과 끝(막 끝 2m 앞), 폭·옆 거리, 진입 카메라에서 보이는 높이 각(도),
 * 높이 한도(m), 주요 건물 비율과 진입 카메라에서의 최소 거리(m), 층이 좁아지는 비율, 도로 아래 몸통(m)
 */
const CITY = {
  count: 141,
  endMargin: 2,
  width: [6, 8],
  lateral: [95, 150],
  elevation: [2.5, 4.5],
  height: [10, 48],
  main: 0.15,
  mainView: 130,
  tierShrink: 0.72,
  below: 22,
  spireGap: 3,
} as const;

/**
 * 첨탑: 막 끝(마지막 도로 지점)에서 앞 along·옆 lateral(왼쪽 −), 높이, 바닥 반폭과 긴 축 배율, 기울기(m), 비틀림(rad), 고리 수,
 * 도로 아래 바닥(m), 색·켜짐 자리(3막 정류장 자리, s)
 */
const SPIRE = { along: 42, lateral: -142, height: 70, halfWidth: 11, stretch: 1.35, lean: 14, twist: 0.35, rings: 10, bottom: 50, lightS: 200 } as const;

/** 막 진입 주행 카메라(막 진입 정류장 가운데). 도시 높이와 빛나는 면을 이 카메라에 맞춘다 */
export function cityView(act: number): Vec3 {
  const range = rangeOf(actStopId(act));
  return driveAt((range.start + range.end) / 2).camera.position;
}

/** 첨탑 바닥 가운데(도로 높이) */
export function spireBase(act: number): Vec3 {
  const { origin, right, forward } = flatFrame(actEnd(act));
  return [
    origin[0] + forward[0] * SPIRE.along + right[0] * SPIRE.lateral,
    origin[1],
    origin[2] + forward[2] * SPIRE.along + right[2] * SPIRE.lateral,
  ];
}

/** 첨탑 꼭대기 */
export function spireTip(act: number): Vec3 {
  const base = spireBase(act);
  return [base[0], base[1] + SPIRE.height, base[2]];
}

function buildCity(act: number): LandscapePiece {
  const random = rng(LANDSCAPE_SEED + 303);
  const writer = new PieceWriter();
  const start = actStart(act);
  const from = appearFrom(act);
  const view = cityView(act);
  const spire = spireBase(act);
  const cityStart = actTitleEnd(act);
  const cityEnd = actEnd(act) - CITY.endMargin;
  for (let n = 0; n < CITY.count; n++) {
    const s = cityStart + (cityEnd - cityStart) * random();
    const side = random() < 0.5 ? -1 : 1;
    const { origin, right, forward } = flatFrame(s);
    const width = CITY.width[0] + CITY.width[1] * random();
    const depth = CITY.width[0] + CITY.width[1] * random();
    let lateral = side * (CITY.lateral[0] + width / 2 + CITY.lateral[1] * Math.pow(random(), 0.7));
    lateral = pushOut(origin, right, side, lateral, RULES.push + width / 2);
    let base: Vec3 = [origin[0] + right[0] * lateral, origin[1], origin[2] + right[2] * lateral];
    const distance = Math.hypot(base[0] - view[0], base[2] - view[2]);
    // 진입 카메라에서 2.5~7°로 보이는 높이: 지평선 위 낮은 띠가 되고 첨탑(약 17°)이 확연히 높다
    const elevation = ((CITY.elevation[0] + CITY.elevation[1] * Math.pow(random(), 1.4)) * Math.PI) / 180;
    const height = Math.max(CITY.height[0], Math.min(CITY.height[1], view[1] + distance * Math.tan(elevation) - origin[1]));
    // 진입 카메라에서 첨탑을 가리는 건물은 두지 않는다
    const spireDistance = Math.hypot(spire[0] - view[0], spire[2] - view[2]);
    let gap = Math.abs(Math.atan2(spire[2] - view[2], spire[0] - view[0]) - Math.atan2(base[2] - view[2], base[0] - view[0]));
    if (gap > Math.PI) gap = 2 * Math.PI - gap;
    if (distance < spireDistance && gap < (CITY.spireGap * Math.PI) / 180 + Math.atan(Math.max(width, depth) / distance)) {
      writer.exclude("building", "spire", base);
      continue;
    }
    // 주요 건물(빛)은 진입 카메라에서 130m 밖만: 가까운 건물의 지붕선이 눈높이에서 선으로 떠 보이지 않게
    const main = random() < CITY.main && distance > CITY.mainView;
    const tiers = 1 + Math.floor(random() * 3);
    const yaw = (random() - 0.5) * 0.25;
    if (behindSight([base[0], base[1] + height / 2, base[2]], Math.max(width, depth), HALL_SIGHTS)) {
      writer.exclude("building", "hologram", base);
      continue;
    }
    random();
    // 도로 방향에 맞춘 축(약간 비틀어)
    const cos = Math.cos(yaw), sin = Math.sin(yaw);
    const ax: Vec3 = [right[0] * cos + forward[0] * sin, 0, right[2] * cos + forward[2] * sin];
    const az: Vec3 = [forward[0] * cos - right[0] * sin, 0, forward[2] * cos - right[2] * sin];
    // 모든 정점이 도로에서 RULES.push 밖이 되게 바닥 대각선의 절반만큼 더 민다(뽑기는 그대로)
    lateral = pushOut(origin, right, side, lateral, RULES.push + Math.hypot(width, depth) / 2);
    base = [origin[0] + right[0] * lateral, origin[1], origin[2] + right[2] * lateral];
    const footprint = [0, 1, 2, 3].flatMap((i): Vec3[] => {
      const sx = i === 0 || i === 3 ? -1 : 1;
      const sz = i < 2 ? -1 : 1;
      const x = base[0] + (ax[0] * sx * width) / 2 + (az[0] * sz * depth) / 2;
      const z = base[2] + (ax[2] * sx * width) / 2 + (az[2] * sz * depth) / 2;
      return [
        [x, origin[1] - CITY.below, z],
        [x, origin[1] + height, z],
      ];
    });
    const sight: Vec3 = [base[0], base[1] + height / 2, base[2]];
    const radius = Math.max(width, depth);
    // 민 자리에서 다시 본다: 도로 거리, 홀로그램 뒤 비우기(가운데·크기), 도로 끝 연장선(정점마다)
    const reason: ExclusionReason | null = !cleared(base, RULES.push + Math.hypot(width, depth) / 2)
      ? "clearance"
      : behindSight(sight, radius, HALL_SIGHTS)
        ? "hologram"
        : inCorridor(footprint)
          ? "corridor"
          : null;
    if (reason) {
      writer.exclude("building", reason, base);
      continue;
    }
    const layer = main ? 0 : Math.abs(lateral) > 110 ? 2 : 1;
    // 빛나는 세로 모서리는 진입 카메라를 향한 면의 모서리
    const cornerOffset = (i: number): [number, number] => {
      const sx = i === 0 || i === 3 ? -1 : 1;
      const sz = i < 2 ? -1 : 1;
      return [(ax[0] * sx * width) / 2 + (az[0] * sz * depth) / 2, (ax[2] * sx * width) / 2 + (az[2] * sz * depth) / 2];
    };
    let glowFace = 0;
    let glowDot = -Infinity;
    for (let face = 0; face < 4; face++) {
      const p0 = cornerOffset(face);
      const p1 = cornerOffset((face + 1) % 4);
      const facing = (p0[0] + p1[0]) * (view[0] - base[0]) + (p0[1] + p1[1]) * (view[2] - base[2]);
      if (facing > glowDot) {
        glowDot = facing;
        glowFace = face;
      }
    }
    const top = origin[1] + height;
    let tierBottom = origin[1] - CITY.below;
    let w = width;
    let d = depth;
    writer.begin("building", { point: sight, radius });
    for (let tier = 0; tier < tiers; tier++) {
      const tierTop = origin[1] + height * ((tier + 1) / tiers);
      const corner = (i: number, y: number): Vec3 => {
        const sx = i === 0 || i === 3 ? -1 : 1;
        const sz = i < 2 ? -1 : 1;
        return [base[0] + (ax[0] * sx * w) / 2 + (az[0] * sz * d) / 2, y, base[2] + (ax[2] * sx * w) / 2 + (az[2] * sz * d) / 2];
      };
      const values = (p: Vec3, ridge: number, ridge2: number): Values => ({
        aS: s,
        aActStart: start,
        aAppearFrom: from,
        aRidge: ridge,
        aRidge2: ridge2,
        aGlow: main ? 1 : 0,
        aBelow: Math.max(0, origin[1] - p[1]),
        aBelowTop: Math.max(0, top - p[1]),
        aLayer: layer,
        aEdge: 0,
        aDissolve: 1,
      });
      for (let face = 0; face < 4; face++) {
        const a = corner(face, tierBottom);
        const b = corner(face, tierTop);
        const c = corner((face + 1) % 4, tierTop);
        const e = corner((face + 1) % 4, tierBottom);
        const faceWidth = Math.hypot(c[0] - b[0], c[2] - b[2]);
        const lit = face === glowFace;
        const points: [Vec3, number][] = [
          [a, 0],
          [b, 0],
          [c, 1],
          [a, 0],
          [c, 1],
          [e, 1],
        ];
        // 지붕 빛은 맨 위 층만(아래 층 지붕선이 떠 보이지 않게)
        for (const [p, t] of points) writer.vertex(p, values(p, tier === tiers - 1 ? tierTop - p[1] : NO_LINE, lit ? t * faceWidth : NO_LINE));
      }
      const roof = [corner(0, tierTop), corner(1, tierTop), corner(2, tierTop), corner(3, tierTop)];
      for (const p of [roof[0], roof[1], roof[2], roof[0], roof[2], roof[3]]) writer.vertex(p, values(p, NO_LINE, NO_LINE));
      tierBottom = tierTop;
      w *= CITY.tierShrink;
      d *= CITY.tierShrink;
    }
    writer.end();
  }
  return writer.finish("journey-landscape-act3", act);
}

/** 비대칭 첨탑: 아래가 넓고 위로 가늘어지며 한쪽으로 기울고 조금 비틀린다. 진입 카메라를 향한 세로 모서리 하나와 꼭대기만 빛난다 */
function buildSpire(act: number): LandscapePiece {
  const writer = new PieceWriter();
  const { origin, right, forward } = flatFrame(actEnd(act));
  const base = spireBase(act);
  const view = cityView(act);
  const bottom = origin[1] - SPIRE.bottom;
  const tipY = origin[1] + SPIRE.height;
  const ring = (k: number): Vec3[] => {
    const t = k / SPIRE.rings;
    const y = bottom + (tipY - bottom) * t;
    const h = Math.max(0, (y - origin[1]) / SPIRE.height);
    const half = SPIRE.halfWidth * Math.pow(1 - t, 0.85) + 0.01;
    const lean = SPIRE.lean * Math.pow(h, 1.6);
    const twist = SPIRE.twist * t;
    return Array.from({ length: 4 }, (_, i) => {
      const angle = twist + (i / 4) * Math.PI * 2 + Math.PI / 4;
      const stretch = i % 2 === 0 ? SPIRE.stretch : 0.8;
      const lx = Math.cos(angle) * half * stretch + lean;
      const lz = Math.sin(angle) * half;
      return [base[0] + right[0] * lx + forward[0] * lz, y, base[2] + right[2] * lx + forward[2] * lz] as Vec3;
    });
  };
  const middle = ring(SPIRE.rings / 2);
  let litFace = 0;
  let litDot = -Infinity;
  for (let i = 0; i < 4; i++) {
    const cx = (middle[i][0] + middle[(i + 1) % 4][0]) / 2 - base[0];
    const cz = (middle[i][2] + middle[(i + 1) % 4][2]) / 2 - base[2];
    const facing = cx * (view[0] - base[0]) + cz * (view[2] - base[2]);
    if (facing > litDot) {
      litDot = facing;
      litFace = i;
    }
  }
  const values = (p: Vec3, ridge2: number): Values => ({
    aS: SPIRE.lightS,
    aActStart: actStart(act),
    aAppearFrom: appearFrom(act),
    aRidge: tipY - p[1],
    aRidge2: ridge2,
    aGlow: 2,
    aBelow: Math.max(0, origin[1] - p[1]),
    aBelowTop: Math.max(0, tipY - p[1]),
    aLayer: -2.5,
    aEdge: 0,
    aDissolve: 1,
  });
  writer.begin("spire");
  for (let k = 0; k < SPIRE.rings; k++) {
    const lower = ring(k);
    const upper = ring(k + 1);
    for (let i = 0; i < 4; i++) {
      const a = lower[i], b = upper[i], c = upper[(i + 1) % 4], e = lower[(i + 1) % 4];
      const lit = i === litFace;
      const across = (p: Vec3, from: Vec3) => Math.hypot(p[0] - from[0], p[2] - from[2]);
      for (const [p, edge] of [[a, a], [b, b], [c, b], [a, a], [c, b], [e, a]] as [Vec3, Vec3][]) {
        writer.vertex(p, values(p, lit ? across(p, edge) : NO_LINE));
      }
    }
  }
  writer.end();
  return writer.finish("journey-landscape-spire", act);
}

/**
 * 막별 풍경 메시 넷(1막 절벽, 2막 암석, 3막 도시, 3막 첨탑)을 새로 만든다. 막이 늘면 막 종류(LANDSCAPE_ACTS의 kind)에 맞는 줄을 더한다.
 */
export function buildLandscape(): LandscapePiece[] {
  return [buildCliffs(1), buildRocks(2), buildCity(3), buildSpire(3)];
}

let cache: LandscapePiece[] | null = null;

/** buildLandscape를 처음 한 번 만들고 같은 배열을 돌려준다(장면과 테스트가 같이 쓴다) */
export function landscapePieces(): readonly LandscapePiece[] {
  cache ??= buildLandscape();
  return cache;
}
```

- [ ] **Step 4: 통과를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4 src/lib/journey/landscapeBuild.test.ts`
Expected: PASS — `Tests  13 passed (13)`(약 1초. 정점 약 4만 3천 개를 0.5m 간격 도로 표본과 잰다)

- [ ] **Step 5: 전체 확인**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`은 무시)

Run: `rtk proxy npx tsc --noEmit` → exit 0
Run: `rtk proxy npx vitest run --maxWorkers=4` → `Tests  360 passed (360)`
Run: `rtk proxy npx eslint src/lib/journey/landscapeBuild.ts src/lib/journey/landscapeBuild.test.ts` → exit 0, 출력 없음

- [ ] **Step 6: 커밋 정리를 제출한다**

파일별 변경 표와 메시지 초안. 초안 예:

```
feat: 여정 막별 풍경의 배치와 정점(절벽·암석·도시·첨탑)

- 시제품과 같은 순서로 난수를 뽑아 승인한 배치를 지키고, 자리 규칙은 뽑은 뒤 더 밀거나 빼서 지킨다
- 모든 정점이 도로에서 수평 40m 밖이고, 규칙 때문에 뺀 요소는 이유와 함께 남긴다(사용자 요청)
```

---

### Task 3: 가림 판정(`landscapeOcclusion.ts`)

스펙 3절 "가림 없음"이다. 카메라에서 정류장 홀로그램의 그림 영역 네 모서리와, 열린 도로 가운데 화면 안에 드는 표본으로 가는 선분이 풍경에 막히지 않아야 한다. 요소마다 상자로 먼저 거르고 그 요소의 삼각형으로 확정한다(상자만 보면 절벽 구간 상자의 비탈 위 빈 공간을 가림으로 잘못 잡는다). 대표 카메라는 1막 지나가는 자리, 2막과 PiCKCARE의 도는 중·머묾, 엔딩이고 16:10·16:9 화면을 본다. 표적 함수는 e2e(Task 6)가 실제 카메라 자리로도 쓴다.

**Files:**
- Create: `src/lib/journey/landscapeOcclusion.test.ts`, `src/lib/journey/landscapeOcclusion.ts`

**Interfaces:**
- Consumes: Task 1의 `projectPoint`, Task 2의 `LandscapePiece`·`landscapePieces`. `ROAD_START`·`driveAt`·`roadFrame`·`CameraPose`(drive.ts), `HOLOGRAMS`·`hologramsAt`·`imageCorners`·`pickcareFront`(holograms.ts)
- Produces: `interface OcclusionTarget { label; point }`, `OCCLUSION = { roadStep: 2, screenMargin: 0.02 }`, `occlusionTargets(progress, aspect, camera?): OcclusionTarget[]`, `segmentBlocked(from, to, pieces, margin = 0.5): { piece; item } | null`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/lib/journey/landscapeOcclusion.test.ts` 전체:

```ts
import { describe, expect, it } from "vitest";
import { driveAt } from "./drive";
import { landscapePieces } from "./landscapeBuild";
import { occlusionTargets, segmentBlocked } from "./landscapeOcclusion";
import { rangeOf, type Vec3 } from "./timeline";

const pieces = landscapePieces();

/** 대표 카메라(스펙 "가림 없음"): 1막은 지나가며, 2막과 PiCKCARE는 도는 중과 머묾, 엔딩은 오르는 중과 끝 */
const VIEWS: [string, number][] = [
  ["kokoa-clone", 0.25],
  ["kokoa-clone", 0.75],
  ["todo-app", 0.5],
  ["eutcha", 0.5],
  ["stock2u", 0.15],
  ["stock2u", 0.5],
  ["tix2u", 0.5],
  ["tix2u", 0.85],
  ["pfplay", 0.5],
  ["pickcare", 0.06],
  ["pickcare", 0.3],
  ["pickcare", 0.5],
  ["pickcare", 0.7],
  ["pickcare", 0.94],
  ["ending", 0.5],
  ["ending", 1],
];

function at(id: string, within: number): number {
  const range = rangeOf(id);
  return range.start + (range.end - range.start) * within;
}

describe("가림 판정", () => {
  it("건물 한가운데를 지나는 선분은 막히고, 도시 위 하늘로 가는 선분은 막히지 않는다", () => {
    const city = pieces.find((item) => item.name === "journey-landscape-act3");
    if (!city) throw new Error("도시 메시가 없습니다");
    const box = city.items[0];
    const middle: Vec3 = [(box.min[0] + box.max[0]) / 2, (box.min[1] + box.max[1]) / 2, (box.min[2] + box.max[2]) / 2];
    const before: Vec3 = [middle[0] - 40, middle[1], middle[2]];
    const after: Vec3 = [middle[0] + 40, middle[1], middle[2]];
    expect(segmentBlocked(before, after, [city])).toEqual({ piece: "journey-landscape-act3", item: 0 });
    expect(segmentBlocked([before[0], 400, before[2]], [after[0], 400, after[2]], [city])).toBeNull();
  });

  it("정류장(도는 중·머묾)·엔딩 카메라에서 홀로그램 모서리와 화면 안 열린 도로로 가는 선분이 풍경에 막히지 않는다(16:10·16:9)", () => {
    const blocked: string[] = [];
    let checked = 0;
    for (const [id, within] of VIEWS) {
      const progress = at(id, within);
      const camera = driveAt(progress).camera.position;
      for (const aspect of [16 / 10, 16 / 9]) {
        const targets = occlusionTargets(progress, aspect);
        expect(targets.length, `${id} ${within}`).toBeGreaterThan(0);
        for (const target of targets) {
          checked += 1;
          const hit = segmentBlocked(camera, target.point, pieces);
          if (hit) blocked.push(`${id} ${within} ${aspect.toFixed(2)} ${target.label} ← ${hit.piece} #${hit.item}`);
        }
      }
    }
    expect(checked).toBeGreaterThan(1000);
    expect(blocked).toEqual([]);
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4 src/lib/journey/landscapeOcclusion.test.ts`
Expected: FAIL — `Error: Cannot find module './landscapeOcclusion' imported from …/landscapeOcclusion.test.ts`(Tests no tests)

- [ ] **Step 3: 모듈을 쓴다**

`src/lib/journey/landscapeOcclusion.ts` 전체:

```ts
import { ROAD_START, driveAt, roadFrame, type CameraPose } from "./drive";
import { HOLOGRAMS, hologramsAt, imageCorners, pickcareFront } from "./holograms";
import { projectPoint } from "./landscape";
import type { LandscapePiece } from "./landscapeBuild";
import type { Vec3 } from "./timeline";

/**
 * 가림 판정(스펙 3절 "가림 없음"): 카메라에서 정류장 홀로그램의 네 모서리와 열린 도로 표본으로 가는 선분이 풍경에 막히는가.
 * 요소마다 상자로 먼저 거르고 그 요소의 삼각형으로 확정한다(상자만 보면 절벽 구간 상자의 비탈 위 빈 공간을 가림으로 잘못 잡는다).
 * 단위 테스트는 진행률의 카메라 목표 자리로, e2e는 장면의 실제 카메라와 실제 메시(three 레이캐스트)로 같은 표적을 본다. 순수 코드다.
 */

/** 표적: 무엇을 보는 선분인가와 끝점 */
export interface OcclusionTarget {
  label: string;
  point: Vec3;
}

/** 열린 도로 표본 간격(m)과 화면 안으로 셀 범위 */
export const OCCLUSION = { roadStep: 2, screenMargin: 0.02 } as const;

/**
 * 진행률 p의 표적: 나타난 홀로그램(나타난 정도 0.05 이상)의 그림 영역 네 모서리와, 열린 도로(열린 끝까지) 가운데 화면(aspect) 안에 드는 표본.
 * camera는 선분이 시작하는 자리(단위 테스트는 카메라 목표 자리, e2e는 실제 카메라 자리)다.
 */
export function occlusionTargets(progress: number, aspect: number, camera: Vec3 = driveAt(progress).camera.position): OcclusionTarget[] {
  const state = driveAt(progress);
  const pose: CameraPose = { position: camera, target: state.camera.target };
  const targets: OcclusionTarget[] = [];
  hologramsAt(progress, pickcareFront(progress, "")).forEach((placement, index) => {
    if (placement.presence < 0.05) return;
    imageCorners(HOLOGRAMS[index], placement, camera).forEach((corner, k) => targets.push({ label: `${placement.id} 모서리 ${k}`, point: corner }));
  });
  for (let s = ROAD_START; s <= state.revealS; s += OCCLUSION.roadStep) {
    const point = roadFrame(s).position;
    const screen = projectPoint(pose, point, aspect);
    const margin = OCCLUSION.screenMargin;
    if (screen.depth > 0 && screen.x > margin && screen.x < 1 - margin && screen.y > margin && screen.y < 1 - margin) {
      targets.push({ label: `도로 s ${s}`, point });
    }
  }
  return targets;
}

/** 선분과 상자가 만나는가(슬랩 방법). t는 0~1 */
function segmentHitsBox(from: Vec3, delta: Vec3, min: Vec3, max: Vec3, tMax: number): boolean {
  let low = 0;
  let high = tMax;
  for (let axis = 0; axis < 3; axis++) {
    if (Math.abs(delta[axis]) < 1e-12) {
      if (from[axis] < min[axis] || from[axis] > max[axis]) return false;
      continue;
    }
    let t0 = (min[axis] - from[axis]) / delta[axis];
    let t1 = (max[axis] - from[axis]) / delta[axis];
    if (t0 > t1) [t0, t1] = [t1, t0];
    low = Math.max(low, t0);
    high = Math.min(high, t1);
    if (low > high) return false;
  }
  return true;
}

/** 선분(from + t·delta, 0 < t < tMax)과 삼각형이 만나는 t(Möller–Trumbore). 만나지 않으면 null */
function segmentHitsTriangle(from: Vec3, delta: Vec3, a: Vec3, b: Vec3, c: Vec3, tMax: number): number | null {
  const e1: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const e2: Vec3 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const p: Vec3 = [delta[1] * e2[2] - delta[2] * e2[1], delta[2] * e2[0] - delta[0] * e2[2], delta[0] * e2[1] - delta[1] * e2[0]];
  const det = e1[0] * p[0] + e1[1] * p[1] + e1[2] * p[2];
  if (Math.abs(det) < 1e-12) return null;
  const inv = 1 / det;
  const s: Vec3 = [from[0] - a[0], from[1] - a[1], from[2] - a[2]];
  const u = (s[0] * p[0] + s[1] * p[1] + s[2] * p[2]) * inv;
  if (u < 0 || u > 1) return null;
  const q: Vec3 = [s[1] * e1[2] - s[2] * e1[1], s[2] * e1[0] - s[0] * e1[2], s[0] * e1[1] - s[1] * e1[0]];
  const v = (delta[0] * q[0] + delta[1] * q[1] + delta[2] * q[2]) * inv;
  if (v < 0 || u + v > 1) return null;
  const t = (e2[0] * q[0] + e2[1] * q[1] + e2[2] * q[2]) * inv;
  return t > 1e-9 && t < tMax ? t : null;
}

/**
 * 선분 from → to가 풍경에 막히는가. 막히면 막은 메시 이름과 요소 번호를 낸다.
 * 끝점 바로 앞 margin(m)은 보지 않는다(표적 자체에 붙은 면을 가림으로 세지 않는다).
 */
export function segmentBlocked(
  from: Vec3,
  to: Vec3,
  pieces: readonly LandscapePiece[],
  margin = 0.5,
): { piece: string; item: number } | null {
  const delta: Vec3 = [to[0] - from[0], to[1] - from[1], to[2] - from[2]];
  const length = Math.hypot(delta[0], delta[1], delta[2]);
  if (length <= margin) return null;
  const tMax = 1 - margin / length;
  for (const piece of pieces) {
    const positions = piece.positions;
    const corner = (index: number): Vec3 => [positions[index * 3], positions[index * 3 + 1], positions[index * 3 + 2]];
    for (const [itemIndex, item] of piece.items.entries()) {
      if (!segmentHitsBox(from, delta, item.min, item.max, tMax)) continue;
      for (let index = item.first; index < item.first + item.count; index += 3) {
        if (segmentHitsTriangle(from, delta, corner(index), corner(index + 1), corner(index + 2), tMax) !== null) {
          return { piece: piece.name, item: itemIndex };
        }
      }
    }
  }
  return null;
}
```

- [ ] **Step 4: 통과를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4 src/lib/journey/landscapeOcclusion.test.ts`
Expected: PASS — `Tests  2 passed (2)`. 막힌 선분이 있으면 실패 메시지가 `<정류장> <위치> <비율> <표적> ← <메시> #<요소>` 목록을 보여 준다

- [ ] **Step 5: 전체 확인**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`은 무시)

Run: `rtk proxy npx tsc --noEmit` → exit 0
Run: `rtk proxy npx vitest run --maxWorkers=4` → `Tests  362 passed (362)`
Run: `rtk proxy npx eslint src/lib/journey/landscapeOcclusion.ts src/lib/journey/landscapeOcclusion.test.ts` → exit 0, 출력 없음

- [ ] **Step 6: 커밋 정리를 제출한다**

파일별 변경 표와 메시지 초안. 초안 예:

```
feat: 여정 풍경 가림 판정 추가

- 정류장(도는 중·머묾)·엔딩 카메라에서 홀로그램 모서리와 화면 안 열린 도로가 풍경에 막히지 않는지 본다
- 요소 상자로 거르고 삼각형으로 확정한다(상자만 보면 절벽 비탈 위를 가림으로 잘못 잡는다)
```

---

### Task 4: 풍경 재질과 GLSL 실행기

스펙 3절 "빛"·"재질과 안개"다. 풍경 메시 넷이 셰이더 재질 하나를 함께 쓴다(셰이더 프로그램 +1). 어두운 덩어리에 그 자리 궤적 색을 섞은 풍경 전용 안개(카메라에서 40~230m, 뒤 겹일수록 더), 꼭대기에서 어두워지는 명암과 세로 결, 능선·지붕·세로 모서리·암석 윤곽의 가는 빛을 그린다. 도로 아래에서 절벽·암석은 45m에 걸쳐 어둠에 잠기고, 도시·첨탑은 20m에 걸쳐 투명하게 사라진다. 등장·밝기·빛 켜짐·빛 세기는 Task 1과 같은 상수·같은 식(`LANDSCAPE_GLSL`)이고, `trailShader.test.ts`의 GLSL 실행기를 `glslRunner.ts`로 옮겨(max·dot·vec3를 더한다) 두 셰이더가 같이 맞춰 본다. 장면 안개 대신 풍경 전용 안개를 쓴다(시제품 그대로).

**Files:**
- Create: `src/components/journey/scene/glslRunner.ts`, `src/components/journey/scene/landscapeMaterial.test.ts`, `src/components/journey/scene/landscapeMaterial.ts`
- Modify: `src/components/journey/scene/trailShader.test.ts`

**Interfaces:**
- Consumes: Task 1의 `APPEAR`, `ENDING`, `LIGHT`(셰이더 상수), `appearLevel`·`brightnessLevel`·`lightLevel`·`rimColor`(테스트). Task 2의 `SCALAR_ATTRIBUTES`(테스트). `TRAIL_GLSL`·`trailUniforms`(trailShader.ts), `glslFloat`(shaderChunks.ts)
- Produces: `runGlsl(source, uniforms): Record<string, (...args) => number | number[]>`(glslRunner.ts, 테스트 전용), `LANDSCAPE_SHADE`, `LANDSCAPE_GLSL`, `createLandscapeMaterial(): ShaderMaterial`(uniform `uRevealS`·`uCarS`·`uEnding`·`uKey`·궤적 색 셋)

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/components/journey/scene/landscapeMaterial.test.ts` 전체:

```ts
import { DoubleSide } from "three";
import { describe, expect, it } from "vitest";
import { luminance } from "@/lib/journey/holograms";
import { ALWAYS, actStart, appearFrom, appearLevel, brightnessLevel, lightLevel, rimColor } from "@/lib/journey/landscape";
import { SCALAR_ATTRIBUTES } from "@/lib/journey/landscapeBuild";
import { trailColor } from "@/lib/journey/trail";
import { runGlsl } from "./glslRunner";
import { LANDSCAPE_GLSL, createLandscapeMaterial } from "./landscapeMaterial";
import { TRAIL_GLSL, trailUniforms } from "./trailShader";

const uniforms = Object.fromEntries(Object.entries(trailUniforms()).map(([name, uniform]) => [name, [uniform.value.r, uniform.value.g, uniform.value.b]]));
const glsl = runGlsl(`${TRAIL_GLSL}\n${LANDSCAPE_GLSL}`, uniforms);

describe("풍경 셰이더의 식", () => {
  it("등장 정도가 TypeScript(appearLevel)와 같다", () => {
    for (const from of [ALWAYS, appearFrom(3), 37.5]) {
      for (let carS = -20; carS <= 280; carS += 0.9) {
        expect(glsl.landscapeAppear(from, carS), `from=${from} carS=${carS}`).toBeCloseTo(appearLevel(from, carS), 12);
      }
    }
  });

  it("밝기가 TypeScript(brightnessLevel)와 같다", () => {
    for (const act of [1, 2, 3]) {
      for (let carS = -20; carS <= 280; carS += 0.9) {
        expect(glsl.landscapeBrightness(actStart(act), carS), `act=${act} carS=${carS}`).toBeCloseTo(brightnessLevel(actStart(act), carS), 12);
      }
    }
  });

  it("빛 켜짐이 TypeScript(lightLevel)와 같다", () => {
    for (const act of [1, 2, 3]) {
      for (const revealS of [0, 60, 95, 158, 175, 260]) {
        for (let s = -12; s <= 260; s += 1.3) {
          expect(glsl.landscapeLight(s, actStart(act), revealS), `act=${act} s=${s} revealS=${revealS}`).toBeCloseTo(lightLevel(s, actStart(act), revealS), 12);
        }
      }
    }
  });

  it("빛의 색이 TypeScript(rimColor)와 같고 휘도가 0.35다", () => {
    for (let s = -12; s <= 260; s += 1.7) {
      const trail = trailColor(s);
      const scale = glsl.landscapeRim(luminance(trail)) as number;
      const script = rimColor(s);
      for (let channel = 0; channel < 3; channel++) expect(trail[channel] * scale, `s=${s}`).toBeCloseTo(script[channel], 12);
      expect(luminance(trail) * scale).toBeCloseTo(0.35, 12);
    }
  });
});

describe("풍경 재질", () => {
  const material = createLandscapeMaterial();

  it("투명·양면이고 장면 안개 대신 풍경 전용 안개를 쓴다", () => {
    expect(material.transparent).toBe(true);
    expect(material.side).toBe(DoubleSide);
    expect(material.fog).toBe(false);
  });

  it("매 프레임 바뀌는 uniform 셋과 궤적 색 uniform이 있다", () => {
    for (const name of ["uRevealS", "uCarS", "uEnding", "uKey", "uTrailStart", "uTrailMiddle", "uTrailEnd"]) {
      expect(material.uniforms[name], name).toBeDefined();
    }
  });

  it("배치의 정점 속성을 모두 받는다", () => {
    for (const name of SCALAR_ATTRIBUTES) expect(material.vertexShader).toContain(`attribute float ${name};`);
    expect(material.vertexShader).toContain("attribute vec3 aRimNormal;");
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4 src/components/journey/scene/landscapeMaterial.test.ts`
Expected: FAIL — `Error: Cannot find module './glslRunner' imported from …/landscapeMaterial.test.ts`(Tests no tests)

- [ ] **Step 3: GLSL 실행기를 옮기고 재질을 쓴다**

`src/components/journey/scene/glslRunner.ts` 전체:

```ts
/**
 * 테스트 전용: GLSL 함수 글자를 자바스크립트로 옮겨 실행한다(셰이더와 TypeScript가 같은 식인지 맞춰 본다).
 * #define은 상수로, 함수 선언은 function으로, 지역 변수는 let으로 바꾸고, GLSL 내장 함수(smoothstep·clamp·mix·max·dot·vec3)는
 * vec3(배열)에도 성분마다 적용되게 흉내 낸다. 사칙연산은 실수끼리만 된다(벡터 연산은 내장 함수로 쓴다). uniform은 넘긴 값이다.
 */

export type GlslValue = number | number[];

export function runGlsl(source: string, uniforms: Record<string, number[]>): Record<string, (...args: GlslValue[]) => GlslValue> {
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
    const max = each((a, b) => Math.max(a, b));
    const smoothstep = each((e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); });
    const dot = (a, b) => a.reduce((sum, value, i) => sum + value * b[i], 0);
    const vec3 = (...v) => (v.length === 1 ? [v[0], v[0], v[0]] : v);
  `;
  const factory = new Function(...Object.keys(uniforms), `${prelude}\n${body}\nreturn { ${functions.join(", ")} };`) as (
    ...values: number[][]
  ) => Record<string, (...args: GlslValue[]) => GlslValue>;
  return factory(...Object.values(uniforms));
}
```

`src/components/journey/scene/trailShader.test.ts`에서 찾을 부분:

```ts
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

```

바꿀 내용:

```ts
import { glow, trailColor, trailMix } from "@/lib/journey/trail";
import { runGlsl } from "./glslRunner";
import { TRAIL_GLSL, trailUniforms } from "./trailShader";

/** 궤적 색 uniform의 값(선형 RGB) */
function trailUniformValues(): Record<string, number[]> {
  return Object.fromEntries(Object.entries(trailUniforms()).map(([name, uniform]) => [name, [uniform.value.r, uniform.value.g, uniform.value.b]]));
}

const glsl = runGlsl(TRAIL_GLSL, trailUniformValues());

```

`src/components/journey/scene/landscapeMaterial.ts` 전체:

```ts
import { DoubleSide, ShaderMaterial, Vector3 } from "three";
import { APPEAR, ENDING, LIGHT } from "@/lib/journey/landscape";
import { glslFloat } from "./shaderChunks";
import { TRAIL_GLSL, trailUniforms } from "./trailShader";

/**
 * 막별 풍경 재질(스펙 3절 "재질과 안개"). 풍경 메시 넷이 이 재질 하나를 함께 쓴다(셰이더 프로그램 하나).
 * 어두운 덩어리에 그 자리 궤적 색을 섞은 풍경 전용 안개(멀수록·뒤 겹일수록 녹는다)와, 능선·지붕·세로 모서리·암석 윤곽의 가는 빛을 그린다.
 * 등장·밝기·빛 켜짐·빛 세기는 lib/journey/landscape.ts와 같은 상수·같은 식이다(LANDSCAPE_GLSL, landscapeMaterial.test.ts가 맞춰 본다).
 * 매 프레임 uniform 셋(uRevealS, uCarS, uEnding)만 바뀌어 스크롤 중에 셰이더를 다시 컴파일하지 않는다. 장면 안개 대신 풍경 전용 안개를 쓴다.
 */

/**
 * 풍경의 명암과 대기(선형): 바탕·안개 휘도, 안개가 차는 거리(m), 겹마다 더 녹는 정도, 꼭대기에서 어두워지는 폭(m),
 * 도로 아래에서 어둠에 잠기는 폭(절벽·암석)과 투명하게 사라지는 폭(도시·첨탑, m), 첨탑 꼭대기 빛의 폭(m), 주광 방향
 */
export const LANDSCAPE_SHADE = {
  base: 0.007,
  haze: 0.0161,
  hazeNear: 40,
  hazeFar: 230,
  layerHaze: 0.22,
  topFade: 70,
  sinkDark: 45,
  sinkDissolve: 20,
  tipGlow: 14,
  key: [-0.385, 0.769, 0.513],
} as const;

/** 등장·밝기·빛 켜짐·빛 세기의 GLSL 판(landscape.ts의 appearLevel·brightnessLevel·lightLevel·rimColor와 같은 식) */
export const LANDSCAPE_GLSL = /* glsl */ `
#define APPEAR_FADE ${glslFloat(APPEAR.fade)}
#define APPEAR_ENTER ${glslFloat(APPEAR.enter)}
#define APPEAR_NEXT ${glslFloat(APPEAR.next)}
#define LIGHT_LEAD ${glslFloat(LIGHT.lead)}
#define LIGHT_FADE ${glslFloat(LIGHT.fade)}
#define RIM_LUMINANCE ${glslFloat(LIGHT.rim)}

float landscapeAppear( float from, float carS ) {
  return smoothstep( from, from + APPEAR_FADE, carS );
}

float landscapeBrightness( float start, float carS ) {
  return APPEAR_NEXT + ( 1.0 - APPEAR_NEXT ) * smoothstep( start - APPEAR_ENTER, start, carS );
}

float landscapeLight( float s, float start, float revealS ) {
  return smoothstep( start - LIGHT_FADE, start, revealS ) * smoothstep( s - LIGHT_FADE, s, revealS + LIGHT_LEAD );
}

float landscapeRim( float luminance ) {
  return RIM_LUMINANCE / max( luminance, 0.001 );
}`;

const VERTEX = /* glsl */ `
attribute float aS;
attribute float aActStart;
attribute float aAppearFrom;
attribute float aRidge;
attribute float aRidge2;
attribute float aGlow;
attribute float aBelow;
attribute float aBelowTop;
attribute float aLayer;
attribute float aEdge;
attribute float aDissolve;
attribute vec3 aRimNormal;
varying float vS;
varying float vActStart;
varying float vAppearFrom;
varying float vRidge;
varying float vRidge2;
varying float vGlow;
varying float vBelow;
varying float vBelowTop;
varying float vLayer;
varying float vEdge;
varying float vDissolve;
varying vec3 vRimNormal;
varying vec3 vNormalW;
varying vec3 vWorld;
void main() {
  vS = aS;
  vActStart = aActStart;
  vAppearFrom = aAppearFrom;
  vRidge = aRidge;
  vRidge2 = aRidge2;
  vGlow = aGlow;
  vBelow = aBelow;
  vBelowTop = aBelowTop;
  vLayer = aLayer;
  vEdge = aEdge;
  vDissolve = aDissolve;
  vRimNormal = mat3( modelMatrix ) * aRimNormal;
  vNormalW = normalize( mat3( modelMatrix ) * normal );
  vec4 world = modelMatrix * vec4( position, 1.0 );
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}`;

const FRAGMENT = /* glsl */ `
${TRAIL_GLSL}
${LANDSCAPE_GLSL}
#define BASE_LUMINANCE ${glslFloat(LANDSCAPE_SHADE.base)}
#define HAZE_LUMINANCE ${glslFloat(LANDSCAPE_SHADE.haze)}
#define HAZE_NEAR ${glslFloat(LANDSCAPE_SHADE.hazeNear)}
#define HAZE_FAR ${glslFloat(LANDSCAPE_SHADE.hazeFar)}
#define LAYER_HAZE ${glslFloat(LANDSCAPE_SHADE.layerHaze)}
#define TOP_FADE ${glslFloat(LANDSCAPE_SHADE.topFade)}
#define SINK_DARK ${glslFloat(LANDSCAPE_SHADE.sinkDark)}
#define SINK_DISSOLVE ${glslFloat(LANDSCAPE_SHADE.sinkDissolve)}
#define TIP_GLOW ${glslFloat(LANDSCAPE_SHADE.tipGlow)}
#define ENDING_OPACITY ${glslFloat(ENDING.opacity)}
#define ENDING_LIGHT ${glslFloat(ENDING.light)}
#define ENDING_HAZE ${glslFloat(ENDING.haze)}
uniform float uRevealS;
uniform float uCarS;
uniform float uEnding;
uniform vec3 uKey;
varying float vS;
varying float vActStart;
varying float vAppearFrom;
varying float vRidge;
varying float vRidge2;
varying float vGlow;
varying float vBelow;
varying float vBelowTop;
varying float vLayer;
varying float vEdge;
varying float vDissolve;
varying vec3 vRimNormal;
varying vec3 vNormalW;
varying vec3 vWorld;

float landscapeHash( vec2 p ) {
  return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 );
}

float landscapeNoise( vec2 p ) {
  vec2 i = floor( p );
  vec2 f = fract( p );
  vec2 u = f * f * ( 3.0 - 2.0 * f );
  return mix( mix( landscapeHash( i ), landscapeHash( i + vec2( 1.0, 0.0 ) ), u.x ),
              mix( landscapeHash( i + vec2( 0.0, 1.0 ) ), landscapeHash( i + vec2( 1.0, 1.0 ) ), u.x ), u.y );
}

void main() {
  // 막 단위 등장: 두 막 앞은 그리지 않는다(장면이 메시도 감춘다)
  float appear = landscapeAppear( vAppearFrom, uCarS );
  if ( appear <= 0.001 ) discard;
  vec3 luminanceWeights = vec3( 0.2126, 0.7152, 0.0722 );
  float up = clamp( vNormalW.y, 0.0, 1.0 );
  // 도로 아래: 절벽·암석은 어둠에 잠기고, 도시·첨탑은 투명하게 사라진다
  float sink = smoothstep( 0.0, mix( SINK_DARK, SINK_DISSOLVE, vDissolve ), vBelow );
  // 위는 약간 밝고 아래로 갈수록 어두워진다. 세로 결이 면을 나눈다
  float topLight = 1.0 - 0.55 * smoothstep( 0.0, TOP_FADE, vBelowTop );
  float grain = 0.72 + 0.28 * landscapeNoise( vec2( vS * 0.45, vWorld.y * 0.035 ) ) + 0.12 * landscapeNoise( vec2( vS * 1.7, vWorld.y * 0.12 ) );
  // 면마다 주광 방향에 따라 밝기가 다르다(형태가 읽히게). 바탕은 여전히 거의 검다
  float diffuse = max( dot( normalize( vNormalW ), uKey ), 0.0 );
  vec3 trail = journeyTrailColor( vS );
  vec3 tint = trail / max( dot( trail, luminanceWeights ), 0.001 );
  vec3 base = mix( vec3( BASE_LUMINANCE ), tint * BASE_LUMINANCE, 0.45 ) * ( 0.25 + 1.6 * diffuse + 0.5 * up );
  // 풍경 전용 대기 원근: 멀수록, 뒤 겹일수록 그 자리 궤적 색의 옅은 안개로. 엔딩에서는 전체를 안개 쪽으로 물린다
  float haze = smoothstep( HAZE_NEAR, HAZE_FAR, length( vWorld - cameraPosition ) );
  haze = clamp( haze + LAYER_HAZE * vLayer, 0.0, 1.0 );
  haze = max( haze, ENDING_HAZE * uEnding );
  vec3 hazeColor = mix( vec3( HAZE_LUMINANCE ), tint * HAZE_LUMINANCE, 0.6 ) * ( 0.8 + 0.2 * up ) * ( 1.0 - mix( 0.92, 1.0, vDissolve ) * sink ) * topLight * grain;
  base *= ( 1.0 - mix( 0.85, 1.0, vDissolve ) * sink ) * topLight * grain;
  // 능선·지붕까지의 거리를 화면 미분으로 나눠 화면에서 굵기가 일정한 선(가는 심 + 옅은 후광)
  float w = max( fwidth( vRidge ), 1e-4 );
  float line = max( 1.0 - smoothstep( 0.0, 1.4 * w, vRidge ), 0.3 * ( 1.0 - smoothstep( 0.0, 6.0 * w, vRidge ) ) );
  // 세로 모서리 하나(주요 건물·첨탑)
  float w2 = max( fwidth( vRidge2 ), 1e-4 );
  line = max( line, max( 1.0 - smoothstep( 0.0, 1.4 * w2, vRidge2 ), 0.3 * ( 1.0 - smoothstep( 0.0, 6.0 * w2, vRidge2 ) ) ) );
  // 암석: 빛을 받는 쪽 윤곽(카메라에서 비스듬히 보이는 면)만
  vec3 viewDirection = normalize( cameraPosition - vWorld );
  vec3 rimNormal = normalize( vRimNormal + vec3( 1e-5 ) );
  float band = smoothstep( 0.9, 0.99, 1.0 - abs( dot( rimNormal, viewDirection ) ) ) * 0.72;
  float keyFacing = smoothstep( 0.05, 0.5, dot( rimNormal, uKey ) );
  line = max( line, band * keyFacing * vEdge );
  // 첨탑 꼭대기는 위로 갈수록 밝아진다
  line = max( line, step( 1.5, vGlow ) * 0.8 * ( 1.0 - smoothstep( 0.0, TIP_GLOW, vRidge ) ) );
  float on = landscapeLight( vS, vActStart, uRevealS );
  float dim = mix( 1.0, ENDING_LIGHT, uEnding );
  vec3 rim = trail * landscapeRim( dot( trail, luminanceWeights ) ) * line * min( vGlow, 1.0 ) * on * dim * ( 1.0 - 0.6 * haze ) * ( 1.0 - vDissolve * sink );
  // 엔딩에서는 반쯤 투명해져 물러난다. 도시·첨탑의 도로 아래는 투명하게 사라진다
  float alpha = mix( 1.0, ENDING_OPACITY, uEnding ) * appear * ( 1.0 - vDissolve * sink );
  if ( alpha < 0.02 ) discard;
  gl_FragColor = vec4( ( mix( base, hazeColor, haze ) + rim ) * landscapeBrightness( vActStart, uCarS ), alpha );
  #include <colorspace_fragment>
}`;

/** 풍경 재질 하나. 엔딩의 반투명과 도시 아랫부분의 사라짐 때문에 투명 재질이고, 양면을 그린다 */
export function createLandscapeMaterial(): ShaderMaterial {
  const material = new ShaderMaterial({
    uniforms: {
      uRevealS: { value: 0 },
      uCarS: { value: 0 },
      uEnding: { value: 0 },
      uKey: { value: new Vector3(...LANDSCAPE_SHADE.key) },
    },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    side: DoubleSide,
    transparent: true,
  });
  Object.assign(material.uniforms, trailUniforms());
  return material;
}
```

- [ ] **Step 4: 통과를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4 src/components/journey/scene/landscapeMaterial.test.ts src/components/journey/scene/trailShader.test.ts`
Expected: PASS — `Tests  11 passed (11)`(풍경 7 + 궤적 4)

- [ ] **Step 5: 전체 확인**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`은 무시)

Run: `rtk proxy npx tsc --noEmit` → exit 0
Run: `rtk proxy npx vitest run --maxWorkers=4` → `Tests  369 passed (369)`
Run: `rtk proxy npx eslint src/components/journey/scene/glslRunner.ts src/components/journey/scene/trailShader.test.ts src/components/journey/scene/landscapeMaterial.ts src/components/journey/scene/landscapeMaterial.test.ts` → exit 0, 출력 없음

- [ ] **Step 6: 커밋 정리를 제출한다**

파일별 변경 표와 메시지 초안. 초안 예:

```
feat: 여정 풍경 셰이더 재질 추가

- 메시 넷이 재질 하나를 함께 쓴다(셰이더 프로그램 +1). 어두운 덩어리, 풍경 전용 안개, 가는 윤곽 빛
- 등장·밝기·빛 켜짐·빛 세기를 TypeScript와 같은 식으로 계산하고, GLSL 실행기를 두 셰이더 테스트가 같이 쓰도록 옮겼다
```

---

### Task 5: 풍경 지오메트리와 메시

배치의 정점 배열을 복사하지 않고 BufferGeometry로 감싸 면 법선만 계산한다(처음 한 번 만들고 바꾸지 않는다). 메시는 배치마다 하나, 재질은 하나다. 투명 물체 가운데 먼저 그린다(`renderOrder` −1, Review Focus 1). 풍경과 홀로그램 메시는 모두 원점에 있어 three가 만든 순서로 정렬하는데, 깊이를 쓰지 않는 홀로그램 빛기둥(0)·화면(1)보다 풍경이 나중에 그려지면 그 위를 덮는다. 실제 메시 레이캐스트(`landscapeBlocked`)는 e2e가 창에서 부르고(Task 6), 여기서 순수 가림 판정(Task 3)과 같은지 맞춰 본다.

**Files:**
- Create: `src/components/journey/scene/landscapeGeometry.test.ts`, `src/components/journey/scene/landscapeGeometry.ts`

**Interfaces:**
- Consumes: Task 2의 `SCALAR_ATTRIBUTES`·`LandscapePiece`·`landscapePieces`, Task 3의 `segmentBlocked`(테스트), Task 4의 `createLandscapeMaterial`(테스트)
- Produces: `landscapeGeometry(piece): BufferGeometry`, `createLandscapeMeshes(pieces, material): Mesh[]`(이름 = 배치 이름, `userData.act`·`userData.appearFrom`, `renderOrder` −1), `landscapeBlocked(meshes, from, to, margin = 0.5): string | null`(보이는 메시만)

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/components/journey/scene/landscapeGeometry.test.ts` 전체:

```ts
import { describe, expect, it } from "vitest";
import { SCALAR_ATTRIBUTES, landscapePieces } from "@/lib/journey/landscapeBuild";
import { segmentBlocked } from "@/lib/journey/landscapeOcclusion";
import type { Vec3 } from "@/lib/journey/timeline";
import { createLandscapeMeshes, landscapeBlocked } from "./landscapeGeometry";
import { createLandscapeMaterial } from "./landscapeMaterial";

const pieces = landscapePieces();
const material = createLandscapeMaterial();
const meshes = createLandscapeMeshes(pieces, material);
for (const mesh of meshes) mesh.updateMatrixWorld();

describe("풍경 메시", () => {
  it("배치마다 메시 하나이고 재질 하나를 함께 쓴다", () => {
    expect(meshes.map((mesh) => mesh.name)).toEqual(pieces.map((piece) => piece.name));
    expect(new Set(meshes.map((mesh) => mesh.material))).toEqual(new Set([material]));
    expect(meshes.map((mesh) => mesh.userData.act)).toEqual([1, 2, 3, 3]);
  });

  it("투명 물체 가운데 먼저 그린다(깊이를 쓰지 않는 홀로그램 빛기둥·화면보다 앞 순서)", () => {
    for (const mesh of meshes) expect(mesh.renderOrder, mesh.name).toBe(-1);
  });

  it("지오메트리는 배치의 정점 배열을 그대로 쓰고 면 법선이 있다", () => {
    meshes.forEach((mesh, index) => {
      const piece = pieces[index];
      const geometry = mesh.geometry;
      expect(geometry.getAttribute("position").array).toBe(piece.positions);
      for (const name of SCALAR_ATTRIBUTES) expect(geometry.getAttribute(name).array, name).toBe(piece.scalars[name]);
      expect(geometry.getAttribute("aRimNormal").array).toBe(piece.rimNormals);
      expect(geometry.getAttribute("normal").count).toBe(piece.positions.length / 3);
      expect(geometry.index).toBeNull();
      expect(geometry.boundingSphere?.radius).toBeGreaterThan(0);
    });
  });

  it("실제 메시 레이캐스트가 순수 가림 판정과 같다", () => {
    // 요소 상자 가운데를 지나는 선분(대부분 막힘)과 그 위 하늘로 가는 선분(대부분 안 막힘)을 섞는다
    let blocked = 0;
    let open = 0;
    for (const piece of pieces) {
      for (const item of piece.items.filter((_, index) => index % 7 === 0)) {
        const middle: Vec3 = [(item.min[0] + item.max[0]) / 2, (item.min[1] + item.max[1]) / 2, (item.min[2] + item.max[2]) / 2];
        for (const lift of [0, 120]) {
          const from: Vec3 = [middle[0] - 60, middle[1] + lift, middle[2] + 25];
          const to: Vec3 = [middle[0] + 60, middle[1] + lift, middle[2] - 25];
          const pure = segmentBlocked(from, to, pieces);
          const scene = landscapeBlocked(meshes, from, to);
          expect(scene !== null, `${piece.name} ${lift}`).toBe(pure !== null);
          if (pure) blocked += 1;
          else open += 1;
        }
      }
    }
    expect(blocked).toBeGreaterThan(20);
    expect(open).toBeGreaterThan(20);
  });

  it("감춘 메시는 막지 않는다", () => {
    const city = meshes[2];
    const piece = pieces[2];
    const item = piece.items[0];
    const middle: Vec3 = [(item.min[0] + item.max[0]) / 2, (item.min[1] + item.max[1]) / 2, (item.min[2] + item.max[2]) / 2];
    const from: Vec3 = [middle[0] - 40, middle[1], middle[2]];
    const to: Vec3 = [middle[0] + 40, middle[1], middle[2]];
    expect(landscapeBlocked([city], from, to)).toBe(city.name);
    city.visible = false;
    expect(landscapeBlocked([city], from, to)).toBeNull();
    city.visible = true;
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4 src/components/journey/scene/landscapeGeometry.test.ts`
Expected: FAIL — `Error: Cannot find module './landscapeGeometry' imported from …/landscapeGeometry.test.ts`(Tests no tests)

- [ ] **Step 3: 모듈을 쓴다**

`src/components/journey/scene/landscapeGeometry.ts` 전체:

```ts
import { BufferAttribute, BufferGeometry, Mesh, Raycaster, Vector3, type Material } from "three";
import { SCALAR_ATTRIBUTES, type LandscapePiece } from "@/lib/journey/landscapeBuild";
import type { Vec3 } from "@/lib/journey/timeline";

/**
 * 막별 풍경 메시(스펙 3절 "재질과 안개"). 배치의 정점 배열(lib/journey/landscapeBuild.ts)을 복사하지 않고 BufferGeometry로 감싸고
 * 면 법선만 계산한다. 지오메트리는 처음 한 번 만들고 바꾸지 않는다(매 프레임에는 재질 uniform만 바뀐다).
 */

/** 정점 배열을 그대로 쓰는 지오메트리. 인덱스 없는 삼각형이라 computeVertexNormals가 면 법선을 넣는다 */
export function landscapeGeometry(piece: LandscapePiece): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(piece.positions, 3));
  for (const name of SCALAR_ATTRIBUTES) geometry.setAttribute(name, new BufferAttribute(piece.scalars[name], 1));
  geometry.setAttribute("aRimNormal", new BufferAttribute(piece.rimNormals, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

/**
 * 풍경 메시: 이름은 배치의 이름, userData에 막 번호와 나타나기 시작하는 자리(appearFrom)를 둔다. 재질은 하나를 함께 쓴다.
 * 투명 물체 가운데 먼저 그린다(renderOrder −1). 풍경과 홀로그램 메시는 모두 원점에 있어 three가 만든 순서로 정렬하는데,
 * 홀로그램(빛기둥 0, 화면 1)은 깊이를 쓰지 않아 풍경이 나중에 그려지면 그 위를 덮는다.
 */
export function createLandscapeMeshes(pieces: readonly LandscapePiece[], material: Material): Mesh[] {
  return pieces.map((piece) => {
    const mesh = new Mesh(landscapeGeometry(piece), material);
    mesh.name = piece.name;
    mesh.renderOrder = -1;
    mesh.userData.act = piece.act;
    mesh.userData.appearFrom = piece.scalars.aAppearFrom[0];
    return mesh;
  });
}

const raycaster = new Raycaster();
const origin = new Vector3();
const direction = new Vector3();

/**
 * 보이는 풍경 메시에서 선분 from → to를 막는 메시의 이름(없으면 null). 끝점 바로 앞 margin(m)은 보지 않는다.
 * 장면의 실제 메시로 가림을 확인한다(e2e가 ?debug=stats에서 부른다). 순수 판정(landscapeOcclusion.segmentBlocked)과 같은 뜻이다.
 */
export function landscapeBlocked(meshes: readonly Mesh[], from: Vec3, to: Vec3, margin = 0.5): string | null {
  origin.set(from[0], from[1], from[2]);
  direction.set(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
  const length = direction.length();
  if (length <= margin) return null;
  raycaster.set(origin, direction.normalize());
  raycaster.near = 0;
  raycaster.far = length - margin;
  const hits = raycaster.intersectObjects(
    meshes.filter((mesh) => mesh.visible),
    false,
  );
  return hits.length > 0 ? hits[0].object.name : null;
}
```

- [ ] **Step 4: 통과를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4 src/components/journey/scene/landscapeGeometry.test.ts`
Expected: PASS — `Tests  5 passed (5)`

- [ ] **Step 5: 전체 확인**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`은 무시)

Run: `rtk proxy npx tsc --noEmit` → exit 0
Run: `rtk proxy npx vitest run --maxWorkers=4` → `Tests  374 passed (374)`
Run: `rtk proxy npx eslint src/components/journey/scene/landscapeGeometry.ts src/components/journey/scene/landscapeGeometry.test.ts` → exit 0, 출력 없음

- [ ] **Step 6: 커밋 정리를 제출한다**

파일별 변경 표와 메시지 초안. 초안 예:

```
feat: 여정 풍경 지오메트리와 메시 추가

- 정점 배열을 복사하지 않고 감싸 처음 한 번 만든다
- 투명 물체 가운데 먼저 그려 깊이를 쓰지 않는 홀로그램을 덮지 않는다
- 실제 메시 레이캐스트가 순수 가림 판정과 같다
```

---

### Task 6: 장면에 풍경 — 한 프레임, 통계, e2e

스펙 1절 2-3b 완료 조건과 3절 "막 단위 등장"이다. `Landscape`가 메시 넷을 장면에 넣고, 매 프레임 재질 uniform 셋을 넣고 두 막 앞 막의 메시를 감춘다(`writeLandscape`). 1막에서는 3막 메시 둘(도시·첨탑)을 그리지 않는다. `?debug=stats`면 메시마다 지난 프레임에 그린 횟수, 지오메트리 표지(uuid:정점 버전), 실제 카메라 자리, 첨탑의 도로 위 부분이 화면에서 차지하는 사각형을 통계(`landscape`)에 쓰고, e2e가 부르는 실제 메시 가림 확인(`window.__journeyLandscapeBlocked`)을 창에 건다. 메시·재질을 바꾸는 일은 `landscapeGeometry.ts`의 함수가 한다(React Compiler 린트).

**Files:**
- Create: `src/components/journey/scene/Landscape.tsx`
- Modify: `e2e/journey.e2e.ts`, `src/components/journey/scene/Scene.tsx`, `src/components/journey/scene/frameStats.ts`, `src/components/journey/scene/landscapeGeometry.test.ts`, `src/components/journey/scene/landscapeGeometry.ts`

**Interfaces:**
- Consumes: Task 1의 `appearLevel`, Task 2의 `landscapePieces`, Task 3의 `occlusionTargets`(e2e), Task 4의 `createLandscapeMaterial`, Task 5의 `createLandscapeMeshes`·`landscapeBlocked`. `currentDrive`(driveFrame.ts), `statsEnabled`(frameStats.ts), `DriveState`(drive.ts)
- Produces: `interface LandscapeStats { meshes: { name; visible; calls; geometry }[]; revealS; carS; ending; camera; spire }`, `recordLandscape(landscape)`, `JourneyStats.landscape`(frameStats.ts). `writeLandscape(meshes, material, drive)`, `countDraws(meshes)`, `takeLandscapeStats(meshes, drive, camera): LandscapeStats`, `disposeLandscape(meshes, material)`(landscapeGeometry.ts). `Landscape` 컴포넌트, `window.__journeyLandscapeBlocked(from, targets): (string | null)[]`(`?debug=stats`일 때)

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/components/journey/scene/landscapeGeometry.test.ts`에서 찾을 부분:

```ts
import { describe, expect, it } from "vitest";
import { SCALAR_ATTRIBUTES, landscapePieces } from "@/lib/journey/landscapeBuild";
import { segmentBlocked } from "@/lib/journey/landscapeOcclusion";
import type { Vec3 } from "@/lib/journey/timeline";
import { createLandscapeMeshes, landscapeBlocked } from "./landscapeGeometry";
import { createLandscapeMaterial } from "./landscapeMaterial";
```

바꿀 내용:

```ts
import { PerspectiveCamera } from "three";
import { describe, expect, it } from "vitest";
import { driveAt } from "@/lib/journey/drive";
import { appearLevel } from "@/lib/journey/landscape";
import { SCALAR_ATTRIBUTES, landscapePieces } from "@/lib/journey/landscapeBuild";
import { segmentBlocked } from "@/lib/journey/landscapeOcclusion";
import { CAMERA_FOV, rangeOf, type Vec3 } from "@/lib/journey/timeline";
import { countDraws, createLandscapeMeshes, landscapeBlocked, takeLandscapeStats, writeLandscape } from "./landscapeGeometry";
import { createLandscapeMaterial } from "./landscapeMaterial";
```

`src/components/journey/scene/landscapeGeometry.test.ts` 끝에 붙인다:

```ts

function at(id: string, within: number): number {
  const range = rangeOf(id);
  return range.start + (range.end - range.start) * within;
}

describe("풍경 한 프레임", () => {
  it("uniform에 열린 끝·차 자리·엔딩을 넣고, 1막에서는 3막 메시(도시·첨탑)를 감춘다", () => {
    const drive = driveAt(at("kokoa-clone", 0.5));
    writeLandscape(meshes, material, drive);
    expect(material.uniforms.uRevealS.value).toBe(drive.revealS);
    expect(material.uniforms.uCarS.value).toBe(drive.carS);
    expect(material.uniforms.uEnding.value).toBe(drive.ending);
    expect(meshes.map((mesh) => mesh.visible)).toEqual([true, true, false, false]);
    writeLandscape(meshes, material, driveAt(at("tix2u", 0.5)));
    expect(meshes.map((mesh) => mesh.visible)).toEqual([true, true, true, true]);
    writeLandscape(meshes, material, driveAt(1));
    expect(meshes.map((mesh) => mesh.visible)).toEqual([true, true, true, true]);
  });

  it("막 경계를 건너뛰며 오가도 감춤과 uniform은 늘 그 자리의 값이다", () => {
    for (const progress of [1, 0.1, 0.62, 0.3, 0.95, 0, 0.27]) {
      const drive = driveAt(progress);
      writeLandscape(meshes, material, drive);
      expect(material.uniforms.uCarS.value, `p=${progress}`).toBe(drive.carS);
      meshes.forEach((mesh, index) => {
        expect(mesh.visible, `p=${progress} ${mesh.name}`).toBe(appearLevel(pieces[index].scalars.aAppearFrom[0], drive.carS) > 0);
      });
    }
  });

  it("통계는 지난 프레임에 그린 횟수를 내고 비우며, 지오메트리 표지는 그대로다", () => {
    countDraws(meshes);
    const camera = new PerspectiveCamera(CAMERA_FOV, 16 / 10, 0.1, 600);
    const drive = driveAt(at("act-3", 0.5));
    camera.position.set(...drive.camera.position);
    camera.lookAt(...drive.camera.target);
    camera.updateMatrixWorld();
    writeLandscape(meshes, material, drive);
    meshes[0].onAfterRender(undefined as never, undefined as never, camera, meshes[0].geometry, material, null as never);
    const first = takeLandscapeStats(meshes, drive, camera);
    expect(first.meshes.map((mesh) => mesh.calls)).toEqual([1, 0, 0, 0]);
    expect(first.camera).toEqual(drive.camera.position);
    const second = takeLandscapeStats(meshes, drive, camera);
    expect(second.meshes.map((mesh) => mesh.calls)).toEqual([0, 0, 0, 0]);
    expect(second.meshes.map((mesh) => mesh.geometry)).toEqual(first.meshes.map((mesh) => mesh.geometry));
  });

  it("3막 제목에서 첨탑의 도로 위 부분은 화면 안 길이 사라지는 곳 위에 서고, 감추면 자리가 없다", () => {
    const camera = new PerspectiveCamera(CAMERA_FOV, 16 / 10, 0.1, 600);
    const drive = driveAt(at("act-3", 0.5));
    camera.position.set(...drive.camera.position);
    camera.lookAt(...drive.camera.target);
    camera.updateMatrixWorld();
    writeLandscape(meshes, material, drive);
    const rect = takeLandscapeStats(meshes, drive, camera).spire;
    expect(rect).not.toBeNull();
    const [left, top, right, bottom] = rect ?? [0, 0, 0, 0];
    expect(left).toBeGreaterThan(0.3);
    expect(right).toBeLessThan(0.7);
    expect(top).toBeGreaterThan(0.05);
    expect(bottom).toBeLessThan(0.6);
    writeLandscape(meshes, material, driveAt(at("kokoa-clone", 0.5)));
    expect(takeLandscapeStats(meshes, drive, camera).spire).toBeNull();
  });
});
```

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts
import { FRONT_LEAD, HOLOGRAMS, REPO_COUNT } from "../src/lib/journey/holograms";
import { HALL_REPO_END, HALL_REPO_START, rangeOf } from "../src/lib/journey/timeline";
```

바꿀 내용:

```ts
import { FRONT_LEAD, HOLOGRAMS, REPO_COUNT } from "../src/lib/journey/holograms";
import { occlusionTargets } from "../src/lib/journey/landscapeOcclusion";
import { HALL_REPO_END, HALL_REPO_START, rangeOf } from "../src/lib/journey/timeline";
```

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts

type JourneyStats = {
```

바꿀 내용:

```ts

type LandscapeStats = {
  meshes: { name: string; visible: boolean; calls: number; geometry: string }[];
  revealS: number;
  carS: number;
  ending: number;
  camera: [number, number, number];
  spire: [number, number, number, number] | null;
};

type JourneyStats = {
```

`e2e/journey.e2e.ts`에서 찾을 부분:

```ts
  holograms: HologramStats | null;
};
```

바꿀 내용:

```ts
  holograms: HologramStats | null;
  landscape: LandscapeStats | null;
};
```

`e2e/journey.e2e.ts` 끝에 붙인다:

```ts

// ── 막별 풍경(2-3b, 스펙 1절 완료 조건과 3절 "막별 풍경") ───────────────────

const LANDSCAPE_MESHES = ["journey-landscape-act1", "journey-landscape-act2", "journey-landscape-act3", "journey-landscape-spire"];

/** 진행률 p로 스크롤하고 그 자리의 풍경 통계를 낸다. 그린 횟수는 지난 프레임 값이라 그 자리에서 한 프레임 넘게 기다린다 */
async function landscapeAt(page: Page, progress: number): Promise<LandscapeStats> {
  await scrollToProgress(page, progress);
  const carS = driveAt(progress).carS;
  await expect
    .poll(async () => {
      const landscape = (await readStats(page)).landscape;
      return landscape !== null && Math.abs(landscape.carS - carS) < 1e-6;
    })
    .toBe(true);
  await page.waitForTimeout(200);
  const landscape = (await readStats(page)).landscape;
  if (!landscape) throw new Error("풍경 통계가 없습니다");
  return landscape;
}

test("풍경 메시 넷: 1막에서는 3막 메시를 그리지 않고, 끝까지 갔다 돌아와도 지오메트리와 그 자리의 값이 같다", async ({ page }) => {
  await page.goto("/journey?debug=stats");
  await waitReady(page);
  const act1 = await landscapeAt(page, middleOf("kokoa-clone"));
  expect(act1.meshes.map((mesh) => mesh.name)).toEqual(LANDSCAPE_MESHES);
  expect(act1.meshes.map((mesh) => mesh.visible)).toEqual([true, true, false, false]);
  expect(act1.meshes[2].calls + act1.meshes[3].calls).toBe(0);
  const act3 = await landscapeAt(page, at("act-3", 0.5));
  expect(act3.meshes.map((mesh) => mesh.visible)).toEqual([true, true, true, true]);
  expect(act3.meshes[3].calls).toBeGreaterThan(0);
  await landscapeAt(page, 1);
  const back = await landscapeAt(page, middleOf("kokoa-clone"));
  expect(back.meshes.map((mesh) => mesh.geometry)).toEqual(act1.meshes.map((mesh) => mesh.geometry));
  expect(back.meshes.map((mesh) => mesh.visible)).toEqual([true, true, false, false]);
  expect([back.revealS, back.carS, back.ending]).toEqual([act1.revealS, act1.carS, act1.ending]);
});

test("다른 페이지에 다녀와도 풍경 메시 넷을 새로 만들어 그린다", async ({ page }) => {
  await page.goto("/journey?debug=stats");
  await waitReady(page);
  const before = await landscapeAt(page, at("act-3", 0.5));
  await page.locator("[data-site-header]").getByRole("link", { name: "블로그", exact: true }).click();
  await expect(page).not.toHaveURL(/\/journey/);
  // 뒤로 가기로 돌아와 ?debug=stats를 지킨다(헤더 링크는 주소만 /journey다)
  await page.goBack();
  await waitReady(page);
  const after = await landscapeAt(page, at("act-3", 0.5));
  expect(after.meshes.map((mesh) => mesh.visible)).toEqual([true, true, true, true]);
  expect(after.meshes.map((mesh) => mesh.geometry)).not.toEqual(before.meshes.map((mesh) => mesh.geometry));
  expect(after.meshes[3].calls).toBeGreaterThan(0);
});

test("정류장(도는 중·머묾)과 엔딩에서 실제 카메라로 본 홀로그램 모서리와 열린 도로가 풍경에 막히지 않는다", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", PORTRAIT_SKIP);
  await page.goto("/journey?debug=stats");
  await waitReady(page);
  const viewport = page.viewportSize();
  if (!viewport) throw new Error("화면 크기가 없습니다");
  const views: [string, number][] = [
    ["stock2u", 0.5],
    ["tix2u", 0.85],
    ["pickcare", 0.06],
    ["pickcare", 0.5],
    ["ending", 1],
  ];
  for (const [id, within] of views) {
    const progress = at(id, within);
    await settleAt(page, progress);
    const landscape = (await readStats(page)).landscape;
    if (!landscape) throw new Error("풍경 통계가 없습니다");
    const targets = occlusionTargets(progress, viewport.width / viewport.height, landscape.camera);
    expect(targets.length, `${id} ${within}`).toBeGreaterThan(0);
    const blocked = await page.evaluate(
      ([from, points]) => {
        const check = (window as Window & { __journeyLandscapeBlocked?: (from: unknown, targets: unknown) => (string | null)[] })
          .__journeyLandscapeBlocked;
        if (!check) throw new Error("풍경 가림 확인이 없습니다");
        return check(from, points);
      },
      [landscape.camera, targets.map((target) => target.point)] as const,
    );
    const hits = targets.flatMap((target, index) => (blocked[index] ? [`${target.label} ← ${blocked[index]}`] : []));
    expect(hits, `${id} ${within}`).toEqual([]);
  }
});

test("3막 제목·진입·도착·떠날 때 첨탑이 헤더 아래 화면 안에 서고 본문 패널과 겹치지 않는다", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", PORTRAIT_SKIP);
  // 두 화면 크기 × 네 자리마다 카메라가 자리를 잡을 때까지 기다린다
  test.slow();
  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/journey?debug=stats");
    await waitReady(page);
    for (const [id, within] of [
      ["act-3", 0.5],
      ["act-3", 1],
      ["pickcare", 0.03],
      ["pickcare", 0.97],
    ] as const) {
      await settleAt(page, at(id, within));
      const label = `${viewport.width}x${viewport.height} ${id} ${within}`;
      const spire = (await readStats(page)).landscape?.spire;
      if (!spire) throw new Error(`${label}: 첨탑이 화면에 없습니다`);
      const layout = await page.evaluate(() => {
        const header = document.querySelector("[data-site-header]");
        if (!header) throw new Error("헤더가 없습니다");
        const panels = [...document.querySelectorAll("[data-journey-page] .shadow-2xl")]
          .map((panel) => {
            const box = panel.getBoundingClientRect();
            return [box.left / innerWidth, box.top / innerHeight, box.right / innerWidth, box.bottom / innerHeight];
          })
          .filter(([left, top, right, bottom]) => right > 0 && left < 1 && bottom > 0 && top < 1);
        return { header: header.getBoundingClientRect().bottom / innerHeight, panels };
      });
      expect(spire[0], label).toBeGreaterThan(0.02);
      expect(spire[2], label).toBeLessThan(0.98);
      expect(spire[1], label).toBeGreaterThan(layout.header);
      for (const panel of layout.panels) {
        const overlap = spire[0] < panel[2] && panel[0] < spire[2] && spire[1] < panel[3] && panel[1] < spire[3];
        expect(overlap, `${label} 패널 ${panel.map((value) => value.toFixed(2)).join(",")}`).toBe(false);
      }
    }
  }
});
```

- [ ] **Step 2: 단위 테스트의 실패를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4 src/components/journey/scene/landscapeGeometry.test.ts`
Expected: FAIL — `Tests  4 failed | 5 passed (9)`. `TypeError: writeLandscape is not a function` 셋, `TypeError: countDraws is not a function` 하나

- [ ] **Step 3: e2e의 실패를 확인한다**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`은 무시)

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts -g "풍경 메시 넷|다른 페이지에 다녀와도 풍경|실제 카메라로 본|첨탑이 헤더" --project=desktop`
Expected: FAIL — `4 failed`(웹 서버는 설정대로 새로 빌드한다, 약 2분). "풍경 메시 넷"과 "다른 페이지에 다녀와도"는 `TypeError: Cannot read properties of undefined (reading 'carS')`, 가림은 `Error: 풍경 통계가 없습니다`, 첨탑은 `Error: 1280x720 act-3 0.5: 첨탑이 화면에 없습니다`

- [ ] **Step 4: 통계·한 프레임·장면 컴포넌트를 쓴다**

`src/components/journey/scene/frameStats.ts`에서 찾을 부분:

```ts
  holograms: HologramStats | null;
}
```

바꿀 내용:

```ts
  holograms: HologramStats | null;
  /** 막별 풍경(2-3b) */
  landscape: LandscapeStats | null;
}
```

`src/components/journey/scene/frameStats.ts`에서 찾을 부분:

```ts
  screens: { id: string; rect: [number, number, number, number]; distance: number; target: boolean }[];
}
```

바꿀 내용:

```ts
  screens: { id: string; rect: [number, number, number, number]; distance: number; target: boolean }[];
}

/** 막별 풍경의 한 프레임(e2e가 막 단위 등장·지오메트리 고정·가림·첨탑 자리를 확인한다) */
export interface LandscapeStats {
  /** 메시마다: 보이는가, 지난 프레임에 그린 횟수, 지오메트리 표지(uuid:정점 버전, 바뀌면 다시 만든 것) */
  meshes: { name: string; visible: boolean; calls: number; geometry: string }[];
  /** 재질에 넣은 uniform */
  revealS: number;
  carS: number;
  ending: number;
  /** 장면의 실제 카메라 자리 */
  camera: [number, number, number];
  /** 첨탑의 도로 위 부분이 화면에서 차지하는 사각형(왼쪽·위·오른쪽·아래, 0~1). 카메라 뒤에 있거나 감췄으면 null */
  spire: [number, number, number, number] | null;
}
```

`src/components/journey/scene/frameStats.ts`에서 찾을 부분:

```ts
let latestHolograms: HologramStats | null = null;

```

바꿀 내용:

```ts
let latestHolograms: HologramStats | null = null;
let latestLandscape: LandscapeStats | null = null;

```

`src/components/journey/scene/frameStats.ts`에서 찾을 부분:

```ts
  if (stats) stats.holograms = holograms;
}
```

바꿀 내용:

```ts
  if (stats) stats.holograms = holograms;
}

/** 풍경 통계를 쓴다(?debug=stats일 때만 통계가 있다). 홀로그램처럼 마지막 값을 들고 있다가 기록기가 생길 때 넣는다 */
export function recordLandscape(landscape: LandscapeStats | null): void {
  latestLandscape = landscape;
  const stats = (window as StatsWindow).__journeyStats;
  if (stats) stats.landscape = landscape;
}
```

`src/components/journey/scene/frameStats.ts`에서 찾을 부분:

```ts
    holograms: latestHolograms,
  };
```

바꿀 내용:

```ts
    holograms: latestHolograms,
    landscape: latestLandscape,
  };
```

`src/components/journey/scene/landscapeGeometry.ts`에서 찾을 부분:

```ts
import { BufferAttribute, BufferGeometry, Mesh, Raycaster, Vector3, type Material } from "three";
import { SCALAR_ATTRIBUTES, type LandscapePiece } from "@/lib/journey/landscapeBuild";
import type { Vec3 } from "@/lib/journey/timeline";

```

바꿀 내용:

```ts
import { BufferAttribute, BufferGeometry, Mesh, Raycaster, Vector3, type Camera, type Material, type ShaderMaterial } from "three";
import type { DriveState } from "@/lib/journey/drive";
import { appearLevel } from "@/lib/journey/landscape";
import { SCALAR_ATTRIBUTES, type LandscapePiece } from "@/lib/journey/landscapeBuild";
import type { Vec3 } from "@/lib/journey/timeline";
import type { LandscapeStats } from "./frameStats";

```

`src/components/journey/scene/landscapeGeometry.ts` 끝에 붙인다:

```ts

/**
 * 한 프레임: 재질 uniform(열린 끝·차 자리·엔딩)을 넣고, 막 단위 등장이 0인 막(두 막 앞)의 메시를 감춘다.
 * 감춘 메시는 그리지 않아 드로콜이 줄고, 같은 재질이라 다시 보여도 셰이더를 새로 컴파일하지 않는다.
 */
export function writeLandscape(meshes: readonly Mesh[], material: ShaderMaterial, drive: DriveState): void {
  material.uniforms.uRevealS.value = drive.revealS;
  material.uniforms.uCarS.value = drive.carS;
  material.uniforms.uEnding.value = drive.ending;
  for (const mesh of meshes) mesh.visible = appearLevel(mesh.userData.appearFrom as number, drive.carS) > 0;
}

/** 메시마다 그린 횟수를 센다(?debug=stats). takeLandscapeStats가 읽고 비운다 */
export function countDraws(meshes: readonly Mesh[]): void {
  for (const mesh of meshes) {
    mesh.userData.calls = 0;
    mesh.onAfterRender = () => {
      mesh.userData.calls = (mesh.userData.calls as number) + 1;
    };
  }
}

const projected = new Vector3();

/** 첨탑에서 도로 위 정점(도로 아래 깊이 0)이 화면에서 차지하는 사각형. 카메라 뒤 정점이 있거나 감췄으면 null */
function spireRect(mesh: Mesh, camera: Camera): [number, number, number, number] | null {
  if (!mesh.visible) return null;
  const position = mesh.geometry.getAttribute("position");
  const below = mesh.geometry.getAttribute("aBelow");
  const rect: [number, number, number, number] = [Infinity, Infinity, -Infinity, -Infinity];
  for (let index = 0; index < position.count; index++) {
    if (below.getX(index) > 0) continue;
    projected.fromBufferAttribute(position, index).applyMatrix4(mesh.matrixWorld).project(camera);
    if (projected.z > 1) return null;
    const x = (projected.x + 1) / 2;
    const y = (1 - projected.y) / 2;
    rect[0] = Math.min(rect[0], x);
    rect[1] = Math.min(rect[1], y);
    rect[2] = Math.max(rect[2], x);
    rect[3] = Math.max(rect[3], y);
  }
  return rect;
}

/** 지난 프레임의 풍경 통계를 내고 그린 횟수를 비운다(?debug=stats) */
export function takeLandscapeStats(meshes: readonly Mesh[], drive: DriveState, camera: Camera): LandscapeStats {
  const spire = meshes.find((mesh) => mesh.name === "journey-landscape-spire");
  const stats: LandscapeStats = {
    meshes: meshes.map((mesh) => ({
      name: mesh.name,
      visible: mesh.visible,
      calls: (mesh.userData.calls as number | undefined) ?? 0,
      geometry: `${mesh.geometry.uuid}:${(mesh.geometry.getAttribute("position") as BufferAttribute).version}`,
    })),
    revealS: drive.revealS,
    carS: drive.carS,
    ending: drive.ending,
    camera: [camera.position.x, camera.position.y, camera.position.z],
    spire: spire ? spireRect(spire, camera) : null,
  };
  for (const mesh of meshes) mesh.userData.calls = 0;
  return stats;
}

/** 장면을 내릴 때 지오메트리와 재질을 놓는다(정점 배열은 배치가 들고 있어 다시 올릴 수 있다) */
export function disposeLandscape(meshes: readonly Mesh[], material: Material): void {
  for (const mesh of meshes) mesh.geometry.dispose();
  material.dispose();
}
```

`src/components/journey/scene/Landscape.tsx` 전체:

```tsx
"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { landscapePieces } from "@/lib/journey/landscapeBuild";
import type { Vec3 } from "@/lib/journey/timeline";
import { currentDrive } from "./driveFrame";
import { recordLandscape, statsEnabled } from "./frameStats";
import { countDraws, createLandscapeMeshes, disposeLandscape, landscapeBlocked, takeLandscapeStats, writeLandscape } from "./landscapeGeometry";
import { createLandscapeMaterial } from "./landscapeMaterial";

/** ?debug=stats에서 e2e가 부르는 가림 확인: 카메라 자리에서 표적마다 막는 풍경 메시의 이름(없으면 null) */
type LandscapeWindow = Window & { __journeyLandscapeBlocked?: (from: Vec3, targets: Vec3[]) => (string | null)[] };

/**
 * 막별 풍경(스펙 3절 "막별 풍경 (2-3b)"): 1막 절벽, 2막 부유 암석, 3막 도시와 첨탑. 메시 넷이 재질 하나를 함께 쓴다(드로콜 4, 프로그램 1).
 * 지오메트리는 처음 한 번 만들고, 매 프레임에는 uniform과 막 단위 등장(두 막 앞 메시 감추기)만 바꾼다.
 * ?debug=stats면 메시마다 그린 횟수·지오메트리 표지·카메라·첨탑 자리를 통계에 쓰고, e2e용 가림 확인을 창에 건다.
 */
export function Landscape() {
  const { meshes, material } = useMemo(() => {
    const created = createLandscapeMaterial();
    return { meshes: createLandscapeMeshes(landscapePieces(), created), material: created };
  }, []);
  const stats = useMemo(() => statsEnabled(), []);

  useEffect(() => {
    const target = window as LandscapeWindow;
    if (stats) {
      countDraws(meshes);
      target.__journeyLandscapeBlocked = (from, targets) => targets.map((to) => landscapeBlocked(meshes, from, to));
    }
    return () => {
      delete target.__journeyLandscapeBlocked;
      recordLandscape(null);
      disposeLandscape(meshes, material);
    };
  }, [meshes, material, stats]);

  useFrame((state) => {
    const drive = currentDrive();
    writeLandscape(meshes, material, drive);
    if (stats) recordLandscape(takeLandscapeStats(meshes, drive, state.camera));
  });

  return (
    <>
      {meshes.map((mesh) => (
        <primitive key={mesh.name} object={mesh} />
      ))}
    </>
  );
}
```

`src/components/journey/scene/Scene.tsx`에서 찾을 부분:

```tsx
import { Holograms } from "./Holograms";
import { Road } from "./Road";
```

바꿀 내용:

```tsx
import { Holograms } from "./Holograms";
import { Landscape } from "./Landscape";
import { Road } from "./Road";
```

`src/components/journey/scene/Scene.tsx`에서 찾을 부분:

```tsx
/**
 * 여정 3D 장면: 우주를 달리는 차와 빛의 길(스펙 3절). R3F 자체 루프를 끄고(frameloop="never") 시계 하나가 그 캔버스의 advance로 그린다.
 * 차·카메라·열린 길·발광은 모두 진행률의 순수 함수(driveAt)에서 나온다. 렌더 단계는 Warmup이 셰이더를 미리 컴파일한 뒤에 건다.
```

바꿀 내용:

```tsx
/**
 * 여정 3D 장면: 우주를 달리는 차와 빛의 길, 막별 풍경(스펙 3절). R3F 자체 루프를 끄고(frameloop="never") 시계 하나가 그 캔버스의 advance로 그린다.
 * 차·카메라·열린 길·발광은 모두 진행률의 순수 함수(driveAt)에서 나온다. 렌더 단계는 Warmup이 셰이더를 미리 컴파일한 뒤에 건다.
```

`src/components/journey/scene/Scene.tsx`에서 찾을 부분:

```tsx
        <Dust />
        <Holograms />
```

바꿀 내용:

```tsx
        <Dust />
        <Landscape />
        <Holograms />
```

- [ ] **Step 5: 통과를 확인한다**

Run: `rtk proxy npx vitest run --maxWorkers=4 src/components/journey/scene/landscapeGeometry.test.ts`
Expected: PASS — `Tests  9 passed (9)`

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`은 무시)

Run: `rtk proxy npx playwright test e2e/journey.e2e.ts -g "풍경 메시 넷|다른 페이지에 다녀와도 풍경|실제 카메라로 본|첨탑이 헤더"`
Expected: PASS — `6 passed`, `2 skipped`(desktop 넷, mobile은 "풍경 메시 넷"·"다른 페이지에 다녀와도" 둘이 돌고 가림·첨탑은 세로 화면이라 건너뛴다. 약 2분)

- [ ] **Step 6: 전체 확인**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`은 무시)

Run: `rtk proxy npx tsc --noEmit` → exit 0
Run: `rtk proxy npx vitest run --maxWorkers=4` → `Tests  378 passed (378)`
Run: `rtk proxy npx eslint src/components/journey/scene/frameStats.ts src/components/journey/scene/landscapeGeometry.ts src/components/journey/scene/landscapeGeometry.test.ts src/components/journey/scene/Landscape.tsx src/components/journey/scene/Scene.tsx e2e/journey.e2e.ts` → exit 0, 출력 없음

- [ ] **Step 7: 커밋 정리를 제출한다**

파일별 변경 표와 메시지 초안. 초안 예:

```
feat: 여정 장면에 막별 풍경 넣기

- 매 프레임 uniform 셋과 두 막 앞 메시 감추기만 바꾼다(드로콜 +4, 1막은 +2)
- ?debug=stats에 메시별 그린 횟수·지오메트리 표지·카메라·첨탑 화면 자리를 내고, e2e가 실제 메시로 가림과 첨탑 자리를 본다
```

---

### Task 7: 검증 도구 — 풍경 캡처, 역방향 비교, check:holograms

스펙 8절 4항이다. `capture:journey`에 세 막을 잇는 열두 장면(`CAPTURE_SET=landscape`)과 역순(`CAPTURE_ORDER=reverse`), 자리마다 기다리는 시간(`CAPTURE_SETTLE`)을 더한다. `compare:captures`는 풍경 영역에서 정방향과 역방향이 같은지 본다. 풍경 영역은 풍경 없이 찍은 장면(`?debug=stats&landscape=off`, 이 태스크가 `Landscape`에 더하는 디버그 스위치)과 다른 화소이고, 기다리는 시간을 달리 해 한 번 더 찍은 정방향과 다른 화소(도로가 열리는 끝의 노이즈 흐름)를 뺀다. 같은 순서로 두 번 찍으면 시간까지 같아 노이즈가 걸러지지 않는다. 남은 차이 덩어리가 40화소를 넘거나, 풍경 영역이 화면의 60%를 넘으면(풍경 없는 장면이 다른 자리에서 찍힌 것) 실패다. `check:holograms`는 1막 절벽 빛 옆 코코아톡 자리를 더한다.

**Files:**
- Create: `scripts/compare-captures.ts`
- Modify: `package.json`, `scripts/capture-journey.ts`, `scripts/check-holograms.ts`, `src/components/journey/scene/Landscape.tsx`

**Interfaces:**
- Consumes: Task 6의 `Landscape`·`statsEnabled`
- Produces: `npm run compare:captures`(환경 변수 `COMPARE_FORWARD`·`COMPARE_BARE`·`COMPARE_AGAIN`·`COMPARE_REVERSE`), `capture:journey`의 `CAPTURE_SET=landscape`·`CAPTURE_ORDER=reverse`·`CAPTURE_SETTLE`, `?debug=stats&landscape=off`

- [ ] **Step 1: 스크립트와 디버그 스위치를 쓴다**

`src/components/journey/scene/Landscape.tsx`에서 찾을 부분:

```tsx
 * ?debug=stats면 메시마다 그린 횟수·지오메트리 표지·카메라·첨탑 자리를 통계에 쓰고, e2e용 가림 확인을 창에 건다.
 */
```

바꿀 내용:

```tsx
 * ?debug=stats면 메시마다 그린 횟수·지오메트리 표지·카메라·첨탑 자리를 통계에 쓰고, e2e용 가림 확인을 창에 건다.
 * ?debug=stats&landscape=off면 풍경을 그리지 않는다. compare:captures가 풍경이 있는 장면과 없는 장면의 차이로 풍경 영역을 찾는다.
 */
```

`src/components/journey/scene/Landscape.tsx`에서 찾을 부분:

```tsx
  const stats = useMemo(() => statsEnabled(), []);

```

바꿀 내용:

```tsx
  const stats = useMemo(() => statsEnabled(), []);
  const shown = useMemo(() => !(stats && new URLSearchParams(window.location.search).get("landscape") === "off"), [stats]);

```

`src/components/journey/scene/Landscape.tsx`에서 찾을 부분:

```tsx

  return (
```

바꿀 내용:

```tsx

  if (!shown) return null;
  return (
```

`scripts/capture-journey.ts`에서 찾을 부분:

```ts
 * frontend 단독 노출 시작·읽기 시작·읽기 끝, biz·studio·app 읽기 가운데, cardnews 읽기 시작·읽기 끝·단독 노출 끝을 찍는다 — 3×3 한 장.
 * CAPTURE_VIEWPORT=1280x720처럼 화면 크기를 바꾼다(기본 1440x900).
```

바꿀 내용:

```ts
 * frontend 단독 노출 시작·읽기 시작·읽기 끝, biz·studio·app 읽기 가운데, cardnews 읽기 시작·읽기 끝·단독 노출 끝을 찍는다 — 3×3 한 장.
 * CAPTURE_SET=landscape는 막별 풍경(스펙 3절 "막별 풍경 (2-3b)")을 세 막에 걸쳐 본다: 1막 진입·코코아톡·Todo·EUTCHA 끝,
 * 2막 제목·Stock2U·Tix2U·PFPlay 끝, 3막 제목·PiCKCARE 머묾·떠날 때, 엔딩 — 열두 장, 3×4 한 장.
 * CAPTURE_ORDER=reverse면 같은 자리를 거꾸로 찍는다(파일 이름은 같다). 정방향과 compare-captures로 비교한다(스펙 8절 4항).
 * CAPTURE_SETTLE=3700처럼 자리마다 기다리는 시간(ms, 기본 2500)을 바꾼다.
 * CAPTURE_VIEWPORT=1280x720처럼 화면 크기를 바꾼다(기본 1440x900).
```

`scripts/capture-journey.ts`에서 찾을 부분:

```ts
 *   CAPTURE_SET=hall CAPTURE_VIEWPORT=1280x720 CAPTURE_NAME=hall-1280x720 npm run capture:journey
 *   CAPTURE_HEADLESS=1을 더하면 창 없이 찍는다(소프트웨어 렌더링이라 색과 속도는 실제와 다르다).
```

바꿀 내용:

```ts
 *   CAPTURE_SET=hall CAPTURE_VIEWPORT=1280x720 CAPTURE_NAME=hall-1280x720 npm run capture:journey
 *   CAPTURE_SET=landscape CAPTURE_NAME=2-3b npm run capture:journey
 *   CAPTURE_SET=landscape CAPTURE_ORDER=reverse CAPTURE_NAME=2-3b-reverse npm run capture:journey
 *   CAPTURE_HEADLESS=1을 더하면 창 없이 찍는다(소프트웨어 렌더링이라 색과 속도는 실제와 다르다).
```

`scripts/capture-journey.ts`에서 찾을 부분:

```ts
const SET = process.env.CAPTURE_SET ?? "stops";
const HEADLESS = process.env.CAPTURE_HEADLESS === "1";
```

바꿀 내용:

```ts
const SET = process.env.CAPTURE_SET ?? "stops";
const REVERSE = process.env.CAPTURE_ORDER === "reverse";
const HEADLESS = process.env.CAPTURE_HEADLESS === "1";
```

`scripts/capture-journey.ts`에서 찾을 부분:

```ts
const READY_TIMEOUT = 30_000;
const SETTLE_MS = 2500; // 카메라 감쇠가 목표 자리에 닿을 때까지
// 화면 비율 그대로 줄인다(16:9 화면을 16:10 칸에 맞추면 양옆의 패널이 잘린다)
```

바꿀 내용:

```ts
const READY_TIMEOUT = 30_000;
// 카메라 감쇠가 목표 자리에 닿을 때까지. CAPTURE_SETTLE로 바꾼다(역방향 비교에서 시간 흐름이 다른 정방향을 한 번 더 찍을 때)
const SETTLE_MS = Number(process.env.CAPTURE_SETTLE ?? 2500);
// 화면 비율 그대로 줄인다(16:9 화면을 16:10 칸에 맞추면 양옆의 패널이 잘린다)
```

`scripts/capture-journey.ts`에서 찾을 부분:

```ts

function progressOf(id: string, within: number): number {
```

바꿀 내용:

```ts

/** 세 막의 풍경: 막 경계(EUTCHA 끝 → 2막 제목, PFPlay 끝 → 3막 제목)를 넣는다 */
const LANDSCAPE_SHOTS: [string, string, number][] = [
  ["01-act-1", "act-1", 0.5],
  ["02-kokoa-clone", "kokoa-clone", 0.5],
  ["03-todo-app", "todo-app", 0.5],
  ["04-eutcha-end", "eutcha", 0.95],
  ["05-act-2", "act-2", 0.5],
  ["06-stock2u", "stock2u", 0.5],
  ["07-tix2u", "tix2u", 0.5],
  ["08-pfplay-end", "pfplay", 0.9],
  ["09-act-3", "act-3", 0.5],
  ["10-pickcare", "pickcare", 0.5],
  ["11-pickcare-leave", "pickcare", 0.97],
  ["12-ending", "ending", 1],
];

function progressOf(id: string, within: number): number {
```

`scripts/capture-journey.ts`에서 찾을 부분:

```ts
  const files: string[] = [];
  for (const [name, id, within] of shots) {
    await scrollToProgress(page, progressOf(id, within));
```

바꿀 내용:

```ts
  const files: string[] = [];
  for (const [name, id, within] of REVERSE ? [...shots].reverse() : shots) {
    await scrollToProgress(page, progressOf(id, within));
```

`scripts/capture-journey.ts`에서 찾을 부분:

```ts
            outDir,
            SET === "hall" ? await hallShots(page) : SET === "holograms" ? HOLOGRAM_SHOTS : SHOTS,
          );
    const columns = SET === "edge" ? 4 : 3;
```

바꿀 내용:

```ts
            outDir,
            SET === "hall"
              ? await hallShots(page)
              : SET === "holograms"
                ? HOLOGRAM_SHOTS
                : SET === "landscape"
                  ? LANDSCAPE_SHOTS
                  : SHOTS,
          );
    // 거꾸로 찍어도 한 장으로 붙일 때는 이름 순서(정방향)로 둔다
    if (REVERSE) files.sort();
    const columns = SET === "edge" ? 4 : 3;
```

`scripts/compare-captures.ts` 전체:

```ts
import { readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

/**
 * 역방향 재생 비교(스펙 8절 4항, 2-3b): 풍경 영역에서 정방향과 역방향이 같은가. capture:journey로 같은 자리를 넷으로 찍는다.
 * 정방향(COMPARE_FORWARD), 풍경 없는 정방향(COMPARE_BARE, ?debug=stats&landscape=off), 시간을 달리한 정방향(COMPARE_AGAIN,
 * CAPTURE_SETTLE을 늘려 찍는다), 역방향(COMPARE_REVERSE). 같은 이름의 장면끼리 비교한다.
 * - 풍경 영역: 풍경이 있을 때와 없을 때 다른 화소(2화소 넓힘). 풍경이 가리거나 빛을 더한 자리다.
 * - 시간에 따라 바뀌는 화소: 두 정방향에서 다른 화소(도로가 열리는 끝의 노이즈 흐름, 10화소 넓힘). 뺀다.
 * 남은 풍경 영역에서 정방향과 역방향이 다른 화소를 덩어리(8방향으로 이은 화소)로 묶는다. 앞을 지나는 별 먼지는 몇 화소짜리 점이고,
 * 풍경이 진행 순서에 따라 달라지면 실루엣만 한 덩어리가 된다. 가장 큰 덩어리가 BLOB_LIMIT 화소를 넘으면 실패로 끝난다.
 * 풍경 영역이 화면의 REGION_LIMIT를 넘어도 실패다(풍경 없는 장면이 다른 자리에서 찍혔다. 그 묶음을 다시 찍는다).
 *
 * 사용법(서버는 ?debug=stats로 연다):
 *   CAPTURE_SET=landscape CAPTURE_NAME=fwd npm run capture:journey
 *   CAPTURE_SET=landscape CAPTURE_URL="http://localhost:3200/journey?debug=stats&landscape=off" CAPTURE_NAME=bare npm run capture:journey
 *   CAPTURE_SET=landscape CAPTURE_SETTLE=3700 CAPTURE_NAME=again npm run capture:journey
 *   CAPTURE_SET=landscape CAPTURE_ORDER=reverse CAPTURE_NAME=rev npm run capture:journey
 *   COMPARE_FORWARD=test-results/journey-captures/fwd COMPARE_BARE=test-results/journey-captures/bare \
 *     COMPARE_AGAIN=test-results/journey-captures/again COMPARE_REVERSE=test-results/journey-captures/rev npm run compare:captures
 */

/** 채널 차이가 이보다 크면 다른 화소다(0~255) */
const CHANNEL_THRESHOLD = 8;
/** 시간에 따라 바뀌는 화소를 넓히는 폭과 풍경 영역을 넓히는 폭(화소) */
const MASK_GROW = 10;
const LANDSCAPE_GROW = 2;
/** 풍경 영역에서 허용하는 가장 큰 차이 덩어리(화소). 별 먼지 한 점보다 크고 풍경 실루엣보다 훨씬 작다 */
const BLOB_LIMIT = 40;
/** 풍경 영역이 화면의 이 비율을 넘으면 풍경 없는 장면이 다른 자리에서 찍힌 것이다(다시 찍는다). 가장 넓은 엔딩이 약 33%다 */
const REGION_LIMIT = 0.6;

type Image = { data: Buffer; width: number; height: number; channels: number };

async function load(file: string): Promise<Image> {
  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height, channels: info.channels };
}

function differs(a: Image, b: Image, pixel: number): boolean {
  for (let channel = 0; channel < 3; channel++) {
    const index = pixel * a.channels + channel;
    if (Math.abs(a.data[index] - b.data[index]) > CHANNEL_THRESHOLD) return true;
  }
  return false;
}

/** 두 장에서 다른 화소를 grow만큼 넓힌 마스크 */
function changingMask(a: Image, b: Image, grow: number): Uint8Array {
  const { width, height } = a;
  const mask = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!differs(a, b, y * width + x)) continue;
      for (let dy = -grow; dy <= grow; dy++) {
        for (let dx = -grow; dx <= grow; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < width && ny < height) mask[ny * width + nx] = 1;
        }
      }
    }
  }
  return mask;
}

/** 다른 화소 표시에서 8방향으로 이은 덩어리들의 크기와 상자(왼쪽·위·오른쪽·아래) */
function blobs(diff: Uint8Array, width: number, height: number): { size: number; box: [number, number, number, number] }[] {
  const seen = new Uint8Array(diff.length);
  const found: { size: number; box: [number, number, number, number] }[] = [];
  const stack: number[] = [];
  for (let start = 0; start < diff.length; start++) {
    if (!diff[start] || seen[start]) continue;
    let size = 0;
    const box: [number, number, number, number] = [width, height, 0, 0];
    seen[start] = 1;
    stack.push(start);
    while (stack.length > 0) {
      const pixel = stack.pop() as number;
      size += 1;
      const x = pixel % width;
      const y = Math.floor(pixel / width);
      box[0] = Math.min(box[0], x);
      box[1] = Math.min(box[1], y);
      box[2] = Math.max(box[2], x);
      box[3] = Math.max(box[3], y);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const next = ny * width + nx;
          if (diff[next] && !seen[next]) {
            seen[next] = 1;
            stack.push(next);
          }
        }
      }
    }
    found.push({ size, box });
  }
  return found.sort((a, b) => b.size - a.size);
}

async function main() {
  const forwardDir = process.env.COMPARE_FORWARD;
  const bareDir = process.env.COMPARE_BARE;
  const againDir = process.env.COMPARE_AGAIN;
  const reverseDir = process.env.COMPARE_REVERSE;
  if (!forwardDir || !bareDir || !againDir || !reverseDir) throw new Error("COMPARE_FORWARD, COMPARE_BARE, COMPARE_AGAIN, COMPARE_REVERSE를 주세요");
  const names = (await readdir(forwardDir)).filter((name) => name.endsWith(".png") && name !== "sheet.png").sort();
  if (names.length === 0) throw new Error(`${forwardDir}에 캡처가 없습니다`);
  let pass = true;
  for (const name of names) {
    const [forward, bare, again, reverse] = await Promise.all(
      [forwardDir, bareDir, againDir, reverseDir].map((dir) => load(path.join(dir, name))),
    );
    const landscape = changingMask(forward, bare, LANDSCAPE_GROW);
    const changing = changingMask(forward, again, MASK_GROW);
    const total = forward.width * forward.height;
    const diff = new Uint8Array(total);
    let region = 0;
    for (let pixel = 0; pixel < total; pixel++) {
      if (!landscape[pixel] || changing[pixel]) continue;
      region += 1;
      if (differs(forward, reverse, pixel)) diff[pixel] = 1;
    }
    const found = blobs(diff, forward.width, forward.height);
    const largest = found[0];
    const ok = region > 0 && region / total <= REGION_LIMIT && (!largest || largest.size <= BLOB_LIMIT);
    pass &&= ok;
    console.log(
      `${ok ? "통과" : "실패"} ${name}: 풍경 영역 ${((region / total) * 100).toFixed(1)}%에서 다른 덩어리 ${found.length}개` +
        (largest ? `, 가장 큰 덩어리 ${largest.size}화소(${largest.box.join(",")})` : ""),
    );
  }
  if (!pass) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

`scripts/check-holograms.ts`에서 찾을 부분:

```ts
/**
 * 홀로그램 원래 색 검증(스펙 1절 2-3a 완료 조건 ①·③, 8절 4항). GPU를 쓰는 실제 Chrome 창에서 잰다.
 * ① 화면 발광 없음: 실제 재질을 톤 매핑 없이 1:1 화소로 그려(scripts/check-holograms-page.ts) 층 이미지와 비교한다. 평균 ΔE 0.5 미만.
```

바꿀 내용:

```ts
/**
 * 홀로그램 원래 색 검증(스펙 1절 2-3a 완료 조건 ①·③, 2-3b 완료 조건 "빛", 8절 4항). GPU를 쓰는 실제 Chrome 창에서 잰다.
 * ① 화면 발광 없음: 실제 재질을 톤 매핑 없이 1:1 화소로 그려(scripts/check-holograms-page.ts) 층 이미지와 비교한다. 평균 ΔE 0.5 미만.
```

`scripts/check-holograms.ts`에서 찾을 부분:

```ts
const BLOOM_LIMIT = 2;
/** [정류장, 정류장 안의 위치]: 1막 주황(밝은 Todo, 어두운 EUTCHA), 2막 머묾, PiCKCARE 머묾 */
const SPOTS: [string, number][] = [
  ["todo-app", 0.1],
```

바꿀 내용:

```ts
const BLOOM_LIMIT = 2;
/**
 * [정류장, 정류장 안의 위치]: 1막 주황(밝은 Todo, 어두운 EUTCHA), 2막 머묾, PiCKCARE 머묾.
 * 2-3b: 1막 절벽 빛 옆의 코코아톡을 더한다(2막 머묾은 이미 뒤에 암석이 있다)
 */
const SPOTS: [string, number][] = [
  ["kokoa-clone", 0.5],
  ["todo-app", 0.1],
```

`package.json`에서 찾을 부분:

```json
    "capture:journey": "tsx scripts/capture-journey.ts",
    "check:holograms": "tsx scripts/check-holograms.ts",
```

바꿀 내용:

```json
    "capture:journey": "tsx scripts/capture-journey.ts",
    "compare:captures": "tsx scripts/compare-captures.ts",
    "check:holograms": "tsx scripts/check-holograms.ts",
```

- [ ] **Step 2: 전체 확인**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`은 무시)

Run: `rtk proxy npx tsc --noEmit` → exit 0
Run: `rtk proxy npx vitest run --maxWorkers=4` → `Tests  378 passed (378)`
Run: `rtk proxy npx eslint src/components/journey/scene/Landscape.tsx scripts/capture-journey.ts scripts/compare-captures.ts scripts/check-holograms.ts` → exit 0, 출력 없음

- [ ] **Step 3: 풍경을 찍고 역방향을 비교한다(실제 Chrome 창)**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`은 무시)

Run: `rtk proxy npx next build && rtk proxy npx next start --port 3200`(다른 터미널)

Run(차례로):
```
CAPTURE_URL="http://localhost:3200/journey?debug=stats" CAPTURE_SET=landscape CAPTURE_NAME=2-3b rtk proxy npm run capture:journey
CAPTURE_URL="http://localhost:3200/journey?debug=stats&landscape=off" CAPTURE_SET=landscape CAPTURE_NAME=2-3b-bare rtk proxy npm run capture:journey
CAPTURE_URL="http://localhost:3200/journey?debug=stats" CAPTURE_SET=landscape CAPTURE_SETTLE=3700 CAPTURE_NAME=2-3b-again rtk proxy npm run capture:journey
CAPTURE_URL="http://localhost:3200/journey?debug=stats" CAPTURE_SET=landscape CAPTURE_ORDER=reverse CAPTURE_NAME=2-3b-reverse rtk proxy npm run capture:journey
D=test-results/journey-captures && COMPARE_FORWARD=${D}/2-3b COMPARE_BARE=${D}/2-3b-bare COMPARE_AGAIN=${D}/2-3b-again COMPARE_REVERSE=${D}/2-3b-reverse rtk proxy npm run compare:captures
```

Expected: 캡처마다 `12장과 sheet.png를 …에 저장했습니다`, 비교는 exit 0이고 열두 줄 모두 `통과`다. 계획 작성 때 값:

```
통과 01-act-1.png: 풍경 영역 14.8%에서 다른 덩어리 12개, 가장 큰 덩어리 2화소(748,377,749,378)
통과 02-kokoa-clone.png: 풍경 영역 19.5%에서 다른 덩어리 28개, 가장 큰 덩어리 3화소(746,425,747,426)
…
통과 10-pickcare.png: 풍경 영역 13.8%에서 다른 덩어리 44개, 가장 큰 덩어리 14화소(874,274,874,287)
통과 12-ending.png: 풍경 영역 33.2%에서 다른 덩어리 64개, 가장 큰 덩어리 5화소(1256,61,1258,65)
```

별 먼지 개수가 달라 덩어리 수는 조금씩 다르다. `풍경 영역 …%`가 60%를 넘어 실패하면 그 장면의 풍경 없는 묶음(`2-3b-bare`)이 다른 자리에서 찍힌 것이다(계획 작성 때 한 번 있었다). 그 묶음을 다시 찍는다

- [ ] **Step 4: 홀로그램 원래 색을 다시 잰다**

Run: `rtk proxy npm run check:holograms`
Expected: exit 0. ① 11장 모두 `통과`(평균 ΔE 0.000), ③ 코코아톡 0.5를 더한 대표 시점 일곱 곳의 홀로그램 열여섯 개 모두 `통과`(계획 작성 때 가장 큰 평균 1.44, tix2u 0.5 / eutcha), 내려받는 양 한 줄

서버는 `lsof -t -iTCP:3200 -sTCP:LISTEN`으로 찾은 PID만 끈다

- [ ] **Step 5: 커밋 정리를 제출한다**

파일별 변경 표와 메시지 초안. 초안 예:

```
test: 여정 풍경 캡처·역방향 비교·홀로그램 색 검증 자리 추가

- 세 막을 잇는 열두 장면을 정방향·역순으로 찍고 풍경 영역만 비교한다(?debug=stats&landscape=off)
- check:holograms에 1막 절벽 빛 옆 코코아톡 자리를 더한다
```

---

### Task 8: 전체 검증과 완료 보고

코드는 바꾸지 않는다. 스펙 1절 2-3b 완료 조건을 최종 구현에서 모두 확인하고, 숫자와 캡처를 남긴다. 중간에 하나라도 기대와 다르면 원인을 찾아 해당 태스크에서 고친다(systematic-debugging).

**Files:**
- Modify: `docs/superpowers/specs/2026-10-14-journey-design.md`(1절 단계 표의 2-3b에 "(완료)", 7절 2-3b 예산 표 아래 최종 실측, 10절 다음 막 실루엣 밝기의 판단)

- [ ] **Step 1: 단위·타입·린트**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`은 무시)

Run: `rtk proxy npx tsc --noEmit` → exit 0
Run: `rtk proxy npx vitest run --maxWorkers=4` → `Tests  378 passed (378)`
Run: `rtk proxy npx eslint .` → `✖ 28 problems (6 errors, 22 warnings)`. 모두 기존 것이다(오류는 `src/components/Background3D.tsx` 3개, `src/app/about/page.tsx` 2개, `src/app/blog/[slug]/page.tsx` 1개). 이 계획에서 만들거나 바꾼 파일에는 오류·경고가 없다

- [ ] **Step 2: 전체 e2e**

무거운 명령 전 확인: `rtk proxy pgrep -fl "vitest|next build|next-server|playwright test|tsc --noEmit"`(다른 프로젝트의 `next dev -p 3010`은 무시)

Run: `rtk proxy npx playwright test`
Expected: PASS — `129 passed`, `9 skipped`(건너뜀은 mobile의 세로 화면 테스트 아홉: 홀로그램 자리·PiCKCARE 배치 일곱, 풍경 가림·첨탑 둘). 블로그 화면 비교는 로컬 기준 이미지(`e2e/__screenshots__/`)로 돈다

계획 작성 때 한 번 mobile "캔버스는 여정 장면 하나뿐이다"가 End 키 뒤 5초 안에 연락처가 화면에 들지 않아 실패했다. 그 테스트만 `--repeat-each=4`로 돌려 8번 모두 통과했고, 전체를 다시 돌려 통과했다. 이 테스트가 실패하면 같은 방법으로 확인하고 완료 보고에 적는다. 다른 테스트가 실패하면 원인을 찾는다

- [ ] **Step 3: 성능 3회와 검증·캡처(실제 Chrome 창)**

Run: `rtk proxy npx next build && rtk proxy npx next start --port 3200`(다른 터미널)

Run: `rtk proxy npm run perf:journey` → 3회 모두 50ms 초과 0. `maxDrawCalls` 60 이하(계획 작성 때 50), `programs`가 회마다 [준비, 끝] 같은 수(31, 31), `textureMB` 100 이하(58.8). 주사율과 함께 평균·p95·p99를 적는다(계획 작성 때 60Hz 화면 16.67·17.3·17.6ms, 최대 17.8)

Run: `rtk proxy npm run check:holograms` → Task 7 Step 4와 같다

Run: Task 7 Step 3의 캡처 넷과 비교 → 열두 줄 모두 `통과`

Run: `CAPTURE_SET=landscape CAPTURE_VIEWPORT=1280x720 CAPTURE_NAME=2-3b-1280x720 rtk proxy npm run capture:journey`

Run: `CAPTURE_SET=hall CAPTURE_NAME=2-3b-hall rtk proxy npm run capture:journey`

`test-results/journey-captures/`의 `2-3b`, `2-3b-1280x720`, `2-3b-hall`의 `sheet.png`를 Read로 열어 다음을 본다(스펙 1절 2-3b 완료 조건, 3절 "막별 풍경").

- 1막: 오른쪽 절벽과 가는 주황 능선 빛이 보이고, 왼쪽은 홀로그램 자리라 비어 있다. 2막 암석은 어두운 실루엣이다. 3막 도시는 보이지 않는다
- 막 경계: EUTCHA 끝 → 2막 제목에서 암석 색이 궤적 색(주황 → 보라)과 이어진다. PFPlay 끝 → 3막 제목에서 3막 스카이라인은 어두운 띠이고 은하를 가리는 검은 덩어리가 없다
- 2막 후반(Tix2U, PFPlay 끝): 오른쪽 암석이 남아 있다(도로 끝 연장선 70m, 사용자 결정의 확인 조건)
- 3막: 지평선 위 낮은 스카이라인. 첨탑이 3막 제목·진입·도착·떠날 때 길이 사라지는 곳 왼쪽 위에 서고, 본문 패널과 겹치지 않는다(1440×900, 1280×720)
- 엔딩: 도로 전체의 형태가 먼저 읽히고, 풍경은 옅게 물러나 있으며, 블룸·안개가 과하지 않다. 첨탑은 화면 밖이다
- 다음 막 실루엣(밝기 35%): 1막의 2막 암석과 2막 끝의 3막 스카이라인이 지나치게 강하지도, 아예 안 읽히지도 않는지 판단한다
- PiCKCARE(`2-3b-hall`): 스펙 3절 "본문 저장소 패널 구간"의 허용된 결함 두 장면(frontend가 떠오르는 중, cardnews와 소개 패널 모서리)이 2-3a 때와 같고, 도시가 홀로그램 줄 뒤에 없다

서버는 `lsof -t -iTCP:3200 -sTCP:LISTEN`으로 찾은 PID만 끈다.

- [ ] **Step 4: 스펙에 완료와 실측을 적는다**

1절 단계 표의 `| 2-3b 막별 풍경 |`을 `| 2-3b 막별 풍경 (완료) |`로 바꾼다. 7절 "2-3b 예산" 표 아래에 Step 3의 숫자(주사율, 평균·p95·p99·최대, 50ms 초과, 드로콜, 프로그램, 텍스처)를 "2-3b 최종 실측"으로 한 줄 적는다. 10절 "다음 막 실루엣 밝기 35%의 최종값"에 Step 3의 판단(그대로 둔다 / 바꿀 값)을 적는다. 바꿔야 하면 사용자에게 캡처와 함께 묻고, 답을 받은 뒤 `APPEAR.next`를 바꿔 Task 1·4의 테스트와 이 태스크를 다시 돈다.

- [ ] **Step 5: 완료 보고와 커밋 정리를 제출한다**

완료 보고에 Step 1~3의 숫자와 캡처 세 장을 남기고, 태스크별 파일 표와 메시지 초안을 낸다. 이 태스크의 초안 예:

```
docs: 여정 2-3b 완료와 실측 기록

- 2-3b 완료 조건(결정성, 자리 규칙, 가림 없음, 빛, 막 단위 등장, 첨탑 자리, 엔딩, 예산)을 최종 구현에서 확인했다
```
