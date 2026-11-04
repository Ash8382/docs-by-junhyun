# 여정 3단계 WALLY 정류장 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** WALLY를 여정의 PiCKCARE 뒤, 엔딩 바로 앞 정류장으로 더한다. 길가에 세로 휴대폰 홀로그램 하나가 떠오르고, 머무는 구간을 스크롤하는 만큼 실제 앱 화면 다섯 장이 넘어간다.

**Architecture:** 정류장 목록(`timeline.ts`)에 `wally`를 더하면 길(`drive.ts`)이 30m 이어진다. 홀로그램은 지금까지 "홀로그램 하나 = 층 하나"였다. 이를 "홀로그램 하나 = 쪽(page) 여럿"으로 넓힌다. 장면 셰이더는 두 층을 섞어 쪽을 넘기고, WALLY 쪽만 층 안에서 90° 돌려 넣어 해상도를 올리고 모서리를 둥글게 자른다. 풍경은 2단계에서 뽑은 배치를 고정한다. 그래서 첨탑과 자리 규칙만 새 길 끝을 따르고, 그 변화는 사용자가 전후 캡처로 승인한다.

**Tech Stack:** Next.js 16, React 19, three r181 + @react-three/fiber, TypeScript, vitest, Playwright, sharp.

**Spec:** `docs/superpowers/specs/2026-10-14-journey-design.md`. 3절 "WALLY 정류장 (3단계)"과 7차 개정이 바꾼 1·2·6·9·10절이 기준이고, 실행자는 스펙과 이 계획을 함께 읽는다.

## 시작 조건

- 사용자가 블로그 WALLY 커밋 셋(refactor CaseCard, feat WALLY 글, fix 다크 모드)과 스펙 7차 개정 커밋을 마친 뒤 시작한다. 아니면 `wally.ts`·`types.ts`·블로그 페이지 변경이 섞인다.
- 작업 브랜치: `feature/journey-phase3-wally`. main에 푸시하면 공개 사이트(Vercel)에 배포되므로, 마지막에 사용자가 병합한다.
- 기록은 `.superpowers/sdd/2026-11-03-journey-phase3-wally/`(git 밖)에 둔다. 진행은 `progress.md`, 커밋 초안은 `commits.md`, 캡처는 `captures/`에 남긴다.

## Global Constraints

- 커밋·푸시는 사용자가 한다. 태스크 끝의 "커밋" 단계는 `commits.md`에 대상 파일과 메시지 초안(`type: 한국어 요약` + `- ` 불릿에 이유, 트레일러 없음)을 적는 것이다.
- 정류장: `{ id: "wally", kind: "project", act: 3, length: 3, pin: true, slug: "wally" }`, `pickcare`와 `ending` 사이.
- 순서 규칙: 끝난 날짜 순, 진행 중인 프로젝트(PiCKCARE "2025.09 ~ 진행중")는 시작 날짜로 친다.
- 화면 문구는 `src/data/projects/wally.ts`만 쓴다. 화면 어디에도 "출시"가 없다.
- 홀로그램 쪽: 시작(entry) → 홈(home) → 지출(spending) → 하루(day) → 예산(budget). 쪽은 진행률로 넘긴다(시간 금지). 한 쪽마다 0.25화면 이상 온전히 보인다.
- 성능(스펙 7절): `perf:journey` 3회 50ms 초과 0, 가장 무거운 프레임 드로콜 60 이하, 준비 뒤 새 셰이더 프로그램 0, 텍스처 GPU 추정 100MiB 이하.
- 풍경: 첨탑·첨탑 가림·도로 끝 연장선·WALLY 뒤 ±25°는 새 길 끝을 따른다. 2단계 뽑기(도시 141채, 별 먼지 700개)는 범위·개수·난수 순서를 그대로 두고, 늘어난 구간에만 더 뽑는다.
- 블로그 `/blog/wally`의 마크업은 바뀌지 않는다(`e2e/blog-projects.e2e.ts`의 wally 기준).
- 무거운 검증(vitest·`next build`·tsc·playwright·캡처)은 한 번에 하나다. 먼저 `pgrep -fl "vitest|next build|next start|tsc|playwright|capture-journey"`를 따로 돌려 확인한다. vitest는 `--maxWorkers=4` 이하로 돌린다.
- 타입 검사는 `rtk proxy npx tsc --noEmit`의 종료 코드로 판단한다.
- 브라우저 창을 띄우지 않는다. 캡처는 `CAPTURE_HEADLESS=1`, 색 검사는 `CHECK_HEADLESS=1`이다. `perf:journey`만 창이 필요하니 돌리기 전에 사용자에게 알린다.
- 서버는 `127.0.0.1`에만 연다(`next start -H 127.0.0.1`).

## Review Focus

1. **빠르게 스크롤해 WALLY를 지나칠 때:** 진행률이 한 프레임에 크게 뛰어도 셰이더가 받는 층 번호는 늘 WALLY의 다섯 층 안이다. 다른 홀로그램의 층이 비치지 않는다(Task 5 `pageAt` 범위 테스트).
2. **`#wally`가 열린 채 PiCKCARE 구간에 있을 때:** WALLY 해시가 PiCKCARE 앞줄을 바꾸지 않는다(Task 3 `pickcareFront` 테스트).
3. **세로 화면 고정 카드:** WALLY 구간에서는 WALLY 카드가 보이고, 저장소 카드 목록에 WALLY가 끼지 않는다(Task 3 `activeCard`·`CARDS` 테스트).
4. **쪽 이미지 하나만 못 받을 때:** WALLY 홀로그램 전체를 숨기고 썸네일을 보인다. 몇 쪽만 넘기지 않는다(Task 5 단위, Task 7 e2e).
5. **엔딩:** 흰 점이 길 끝(s 290)에 서고, 가로·세로 엔딩 카메라가 그 점을 2단계와 같은 화면 자리에 담는다. WALLY 원반은 다른 원반처럼 사라진다(Task 3 테스트).

---

### Task 1: 시작 전 기준 남기기

바꾸기 전의 화면과 풍경 배치를 남긴다. Task 4의 승인 비교와 Task 2·3의 "기존 배치 고정" 테스트가 이것을 기준으로 쓴다.

**Files:**
- Create: `scripts/dump-landscape.ts`
- Create: `src/lib/journey/__fixtures__/landscape-phase2.json`

**Interfaces:**
- Produces: `landscape-phase2.json`의 꼴은 `{ roadEnd: number, pieces: { name: string, items: { kind, min: Vec3, max: Vec3 }[], excluded: { kind, reason, point: Vec3 }[] }[], dust: number[] }`이다. 좌표는 소수 넷째 자리로 반올림하고, `dust`는 `dustField(DUST_COUNT, <Dust.tsx가 쓰는 시드>)`의 2,100개 값이다.

- [ ] **Step 1: 기준 캡처.** 빌드한 뒤 `next start -H 127.0.0.1 -p 3200`을 띄우고 창 없이 찍는다. 묶음은 `CAPTURE_SET=landscape`·`holograms`·`hall`(1440×900)·`portrait`(`CAPTURE_VIEWPORT=390x844`, 그리고 360x800·430x932·820x1180)이고, `CAPTURE_URL=http://127.0.0.1:3200/journey`를 쓴다. 결과는 `.superpowers/sdd/2026-11-03-journey-phase3-wally/captures/baseline/<묶음>/`으로 옮긴다(Playwright가 `test-results/`를 비운다). 서버는 끈다.
- [ ] **Step 2: `scripts/dump-landscape.ts`를 쓰고 돌린다.** `buildLandscape()`와 `dustField`를 위 꼴로 JSON에 쓴다. 사용법은 `npx tsx scripts/dump-landscape.ts src/lib/journey/__fixtures__/landscape-phase2.json`이다. 실행 결과 `roadEnd`가 260이어야 한다.
- [ ] **Step 3: 커밋 초안.** 대상은 `scripts/dump-landscape.ts`, `src/lib/journey/__fixtures__/landscape-phase2.json`이다. 메시지는 `test: 여정 2단계 풍경 배치 기준 저장`, 불릿은 "WALLY로 길이 늘어도 기존 배치가 움직이지 않는지 비교하려고"다.

### Task 2: 길이 늘어도 2단계 뽑기를 고정

도시 건물과 별 먼지는 길 전체 길이에 비례해 자리를 뽑아서, 길 끝이 늘면 1막 장면부터 모두 옮겨진다. 이 태스크에서는 정류장을 아직 바꾸지 않으므로 출력이 기준과 완전히 같아야 한다.

**Files:**
- Modify: `src/lib/journey/drive.ts` (`ROAD_TAIL` 공개)
- Modify: `src/lib/journey/landscape.ts` (`SEEDED_ROAD_END`, `drawSegments`)
- Modify: `src/lib/journey/landscapeBuild.ts` (`buildCity`가 `drawSegments`를 씀)
- Modify: `src/lib/journey/space.ts` (`dustField`가 `drawSegments`를 씀)
- Test: `src/lib/journey/landscape.test.ts`, `src/lib/journey/space.test.ts`(없으면 만든다)

**Interfaces:**
- Produces:
  - `export const ROAD_TAIL = 40` (drive.ts). `ROAD_END = CAR_END + ROAD_TAIL`.
  - `export const SEEDED_ROAD_END: number` (landscape.ts) = `pathSpan("pickcare").to * ROAD_SCALE + ROAD_TAIL`. 지금 260이다. 주석에 "2단계 도로 끝. 이 앞의 뽑기는 고정한다(스펙 3절 WALLY 정류장 '풍경과 길'). 첨탑·자리 규칙에는 쓰지 않는다"를 적는다.
  - `export interface DrawSegment { from: number; to: number; count: number; seed: number }`
  - `export function drawSegments(from: number, to: number, seededEnd: number, count: number, seed: number): DrawSegment[]`. `to ≤ seededEnd`면 `[{ from, to, count, seed }]`다. 아니면 고정 구간 `{ from, to: seededEnd, count, seed }`과 늘어난 구간 `{ from: seededEnd, to, count: Math.round(count * (to − seededEnd) / (seededEnd − from)), seed: seed + 1 }` 둘이다.
  - `dustField(count: number, seed: number, roadEnd: number = ROAD_END): Float32Array`. 고정 구간 `[ROAD_START, SEEDED_ROAD_END]`에 `count`개를, 늘어난 구간에 비례한 개수를 뽑는다.

- [ ] **Step 1: 실패하는 테스트를 쓴다.**
  - `drawSegments(170, 258, 258, 141, 7)`은 `[{ from: 170, to: 258, count: 141, seed: 7 }]`다.
  - `drawSegments(170, 288, 258, 141, 7)`은 위 구간에 `{ from: 258, to: 288, count: 48, seed: 8 }`이 더해진다.
  - `dustField(DUST_COUNT, seed)`는 기준 JSON의 `dust`와 1e-4 안에서 같다.
  - `dustField(DUST_COUNT, seed, 290)`은 길이가 `(700 + 77) * 3`이고, 앞 2,100개 값이 기준과 같다.
  - `buildLandscape()`의 조각마다 `items`(상자)와 `excluded`가 기준 JSON과 1e-4 안에서 같다.
- [ ] **Step 2: 돌려서 실패를 확인한다.** `rtk proxy npx vitest run src/lib/journey/landscape.test.ts src/lib/journey/space.test.ts --maxWorkers=2`를 돌리면 `drawSegments`가 없어 실패해야 한다.
- [ ] **Step 3: 구현한다.** `buildCity`는 `drawSegments(cityStart, cityEnd, SEEDED_ROAD_END − CITY.endMargin, CITY.count, <지금 시드>)`의 구간마다 자기 시드의 난수열로 뽑는다. 고정 구간은 지금 코드와 같은 난수열·같은 호출 순서를 쓴다. `dustField`도 같은 방식이다.
- [ ] **Step 4: 통과를 확인한다.** Step 2의 명령, 그리고 `rtk proxy npx vitest run src/lib/journey --maxWorkers=4`가 모두 통과해야 한다.
- [ ] **Step 5: 커밋 초안.** 메시지는 `refactor: 길이 늘어도 여정 풍경 뽑기를 고정`, 불릿은 "도시·별 먼지가 길 전체 길이에 비례해 뽑혀 길이 늘면 1막부터 옮겨졌음"이다.

### Task 3: WALLY 정류장 (휴대폰 화면 한 장)

정류장, 데이터, 홀로그램 배치, 엔딩 카메라를 바꾼다. 이 태스크가 끝나면 WALLY가 홈 화면 한 장짜리 세로 홀로그램으로 동작한다. 쪽 넘김은 Task 5, 모양과 해상도는 Task 6이 맡는다.

**Files:**
- Modify: `src/data/projects/index.ts`, `src/data/projects/projects.test.ts`
- Modify: `src/lib/journey/timeline.ts`, `timeline.test.ts`
- Modify: `src/lib/journey/holograms.ts`, `holograms.test.ts`, `holograms.place.test.ts`
- Modify: `src/lib/journey/drive.ts`, `drive.test.ts`
- Modify: `src/lib/journey/portrait.ts`, `portrait.test.ts`
- Modify: `src/components/journey/scene/Holograms.tsx:167`
- Modify: `src/lib/journey/landscape.test.ts`(기준 비교를 "허용된 변화만"으로 바꿈)
- Modify: `e2e/journey.e2e.ts:1678` (`toHaveLength(11)` → 12)
- Create: `public/journey/holograms/wally.webp` (`npm run build:holograms`)

**Interfaces:**
- Consumes: `SEEDED_ROAD_END`, 기준 JSON(Task 1·2).
- Produces:
  - `Hologram.placement: "act1" | "act2" | "phone" | "hall"`. 정하는 법: 1막 → `act1`, 저장소 → `hall`, WALLY(`PHONE_SLUGS = ["wally"]`) → `phone`, 나머지 → `act2`.
  - `export const REPO_HOLOGRAMS: readonly Hologram[]` = `placement === "hall"`인 것(PiCKCARE 다섯).
  - `PLACEMENT`의 키를 배치 이름과 맞춘다. `act3`은 `hall`로 이름을 바꾸고, `phone = { along: -8, aside: 5, top: 3.3, box: [7.5, 4.6875] }`를 더한다. 그래서 `PLACEMENT[hologram.placement]`로 찾는다. `phone`은 2막과 같은 값에서 시작해, 아래 안전 영역 테스트로 `top`과 `box`만 맞춘다. 단 그림 높이는 4.6875m보다 작아지지 않는다(스펙).
  - `FOCUS_OFFSET`(drive.ts): `ENDING_FOCUS`를 `endingPoint()` + 오프셋으로 둔다. 오프셋은 지금 상수 − 지금 흰 점 `[9.140626507899775, 12.921547070726671, -229.0405835521795]`이다. 자리 `[3.0593735, 78.5784529, 43.7405836]`, 시선 `[17.7593735, -0.0215471, 18.0405836]`.
  - `PORTRAIT.focus`(portrait.ts)도 같게 둔다. 자리 오프셋 `[3.7593735, 96.0784529, 53.4405836]`, 시선 `[0.3593735, -0.0215471, 5.4405836]`.

- [ ] **Step 1: 실패하는 테스트를 쓴다.**
  - `projects.test.ts`:
    - `"8개가 끝난 날짜 순(진행 중은 시작 날짜)으로 등록돼 있다"`: slug 목록이 PiCKCARE 다음 `"wally"`로 끝난다.
    - 기간으로 계산한 정렬 키(`"~"` 뒤가 날짜면 그것, 아니면 앞 날짜, `YYYY.MM(.DD)`를 맞춰 비교)가 줄지 않는다.
    - 블로그용 우회 `[...projects, wally]`를 `projects`로 되돌린다.
  - `timeline.test.ts`:
    - `TOTAL_LENGTH`는 21.5, `PATH_LENGTH`는 50, `STOPS`의 id 순서가 `…, "pickcare", "wally", "ending"`이다.
    - PiCKCARE를 떠나는 끝(t 0.99)의 `speedAt`이 0.5보다 크다. 다음이 엔딩이 아니라 달려 나간다.
  - `drive.test.ts`:
    - `ROAD_END`는 290이다.
    - `ENDING_FOCUS.position`은 `endingPoint() + FOCUS_OFFSET.position`과 1e-9 안에서 같다(시선도 같다).
    - 기존 화면 비율 테스트(흰 점 자리, 길 전체가 안전 영역 안)를 그대로 둔다.
  - `holograms.test.ts`:
    - `HOLOGRAMS.length`는 12다.
    - `REPO_HOLOGRAMS`의 id가 `pickcare/frontend`…`pickcare/cardnews` 다섯이다.
    - WALLY의 `placement`는 `"phone"`이고 `facing.kind`는 `"camera"`다.
    - WALLY 정류장 가운데에서 `presence`는 1이고, PiCKCARE 가운데에서는 0이다.
    - 다 떠오른 WALLY의 그림 높이(`imageCorners`의 위아래 거리)가 4.6875m 이상이다.
    - 엔딩 `fade` 1에서 WALLY의 `presence`와 `discOpacity`가 0이다.
    - 모든 진행률(0~1, 0.001 간격)에서 `pickcareFront(p, "#wally") === pickcareFront(p, "")`다.
  - `holograms.place.test.ts`: WALLY의 그림 네 모서리가 머묾이 가장 클 때 다음을 지킨다(16:9, 16:10).
    - 헤더(위 9%) 아래다.
    - 2막 카드 패널 영역(`ExhibitStop`, 패널은 홀로그램 반대편)과 겹치지 않는다.
    - 차와 카메라 목표 자세에서 3m 이상 떨어져 있다.
  - `portrait.test.ts`:
    - WALLY 구간 30~70%에서 `activeCard`가 `"wally"`다.
    - `CARDS`에 `"wally"`가 한 번 있고, 저장소 카드는 정확히 다섯이다.
    - 네 크기의 읽기 자리에서 WALLY 그림 전체와 차 몸통 전체가 헤더 아래이고 화면 위 60% 안이다.
  - `landscape.test.ts`의 기준 비교: 2단계 요소 가운데 지금 빠진 것은 같은 자리의 `excluded`에 있고, 이유가 `spire`·`corridor`·`hologram` 가운데 하나다. 지금 있는 요소는 다음 셋 가운데 하나다.
    - 2단계 상자와 같은 요소
    - 2단계에 빠졌다가 다시 나타난 요소. 콘솔에 목록을 남긴다.
    - 2단계 상자와도, 2단계에 빠졌던 자리와도 맞지 않는 요소. 이것은 옮겨진 첨탑 하나와, 늘어난 구간에서 새로 뽑은 건물(48채 이하)뿐이어야 한다. 굽은 길에서는 건물의 가까운 도로 자리가 뽑은 자리와 달라서, 거리로 가르지 않고 이렇게 개수로 가른다.
  - 기존 풍경 테스트(도로 40m, 첨탑 100m, 연장선 70m, 홀로그램 가림 없음)는 그대로 통과해야 한다.
  - 첨탑 투영 테스트(3막 제목·진입 주행·PiCKCARE 도착·떠날 때 화면 안)에 WALLY 도착·떠날 때를 더한다. 새 길 끝에서 서지 않는 장면이 있으면 첨탑 값을 고치지 않는다. 그 테스트만 `it.fails`로 표시하고 이유를 적어 Task 4에서 사용자에게 묻는다(스펙 3절 "풍경과 길").
- [ ] **Step 2: 돌려서 실패를 확인한다.** `rtk proxy npx vitest run src --maxWorkers=4`를 돌리면 위 테스트들이 실패한다. WALLY가 `placeHall`로 가서 생기는 실패도 섞여 있다.
- [ ] **Step 3: 구현한다.**
  - `projects`에 `wally`를 넣는다. `index.ts`의 주석은 "끝난 날짜 순. 진행 중인 프로젝트는 시작 날짜로 친다(스펙 2절)"로 바꾼다.
  - `STOPS`에 정류장을 넣는다.
  - `holograms.ts`:
    - `build()`에서 `placement`를 정한다.
    - `hologramsAt`은 `placement === "hall"`이면 `placeHall`, 아니면 `placeRoadside`를 부른다.
    - `placeRoadside`는 `PLACEMENT[placement]`를 쓰고, 1막 판정(`stay`·`arrival`·`facing`)을 `placement === "act1"`로 바꾼다.
  - `act === 3`으로 저장소를 고르던 곳(`Holograms.tsx:167`, `portrait.ts:218`, 테스트 둘)을 `REPO_HOLOGRAMS`로 바꾼다.
  - `ENDING_FOCUS`와 `PORTRAIT.focus`를 오프셋으로 바꾼다. `OVERVIEW`와 `PORTRAIT.overview`는 테스트가 실패할 때만 고친다. 고칠 때는 시선 방향을 그대로 두고, 늘어난 길의 중심 이동만큼 자리와 시선을 같이 옮긴 뒤 테스트로 확인한다.
  - `npm run build:holograms`로 `wally.webp`를 만든다(원본은 `representative`가 고르는 `home.webp`).
- [ ] **Step 4: 통과를 확인한다.** 차례로 돌린다.
  - `rtk proxy npx vitest run src --maxWorkers=4`
  - `rtk proxy npx tsc --noEmit`(종료 코드 0)
  - `npx eslint`(바뀐 파일)
  - 다시 나타난 2막 암석과 새로 빠진 요소의 목록을 `progress.md`에 옮긴다.
- [ ] **Step 5: 커밋 초안.** 묶음은 둘이다.
  - lib·데이터·테스트: `feat: 여정 3막에 WALLY 정류장 추가`. 불릿은 "PiCKCARE 뒤 엔딩 앞, 진행 중인 프로젝트는 시작 날짜로 순서", "엔딩 카메라를 흰 점 기준으로 바꿔 길이 늘어도 구도 유지"
  - 층 이미지·e2e 수: `chore: WALLY 홀로그램 층 이미지 추가`

### Task 4: 바뀐 기존 장면 승인 (사용자 확인)

길 끝이 옮겨지며 바뀐 기존 장면을 바꾸기 전과 나란히 보이고, 승인을 받은 뒤에만 다음 태스크로 간다(스펙 9절 "길 끝이 옮겨질 때").

**Files:**
- Create: `scripts/diff-captures.ts`

**Interfaces:**
- Produces: `npx tsx scripts/diff-captures.ts <전> <후> <출력>`. 같은 이름의 PNG마다 바뀐 화소 비율(채널 차 8 초과)을 표로 출력한다. 그리고 `<출력>/<이름>.png`에 전·후·차이 마스크를 가로로 붙여 쓴다.

- [ ] **Step 1: 같은 묶음을 다시 찍는다.** 빌드 → `127.0.0.1:3200` → Task 1과 같은 묶음·크기로 찍어 `captures/after-task3/`에 옮긴다.
- [ ] **Step 2: 비교한다.** `diff-captures`로 묶음마다 비교하고, 표를 `progress.md`에 적는다. 판정 기준은 이렇다.
  - PiCKCARE 떠남 앞의 장면에서, 첨탑과 규칙으로 빠지거나 나타난 요소 밖의 차이가 0.05%를 넘으면 원인을 찾는다. 이것은 버그로 본다.
  - PiCKCARE 읽기 구간(`hall` 묶음)은 0.05% 이하여야 한다.
- [ ] **Step 3: 사용자에게 보인다.**
  - 무엇을 보이는가: 바뀐 장면(3막 제목, PFPlay 끝의 3막 실루엣, 영향받은 2막 장면, PiCKCARE 떠남)의 나란히 붙인 이미지, 다시 나타나거나 빠진 요소 목록, 그리고 Task 3에서 첨탑이 서지 않은 장면(있으면)과 첨탑 자리를 바꿀지에 대한 질문.
  - 어떻게 보이는가: 시각 보조 도구가 켜져 있으면 거기에, 아니면 이미지 경로로 보인다.
  - 사용자 답을 기다린다. 승인하면 `progress.md`에 날짜와 함께 적는다. 승인하지 않으면 멈추고 무엇을 바꿀지 묻는다.
- [ ] **Step 4: 커밋 초안.** 대상은 `scripts/diff-captures.ts`, 메시지는 `chore: 여정 캡처 전후 비교 스크립트`다.

### Task 5: 화면 다섯 장을 스크롤로 넘기기

**Files:**
- Modify: `src/lib/journey/holograms.ts`, `holograms.test.ts`
- Modify: `src/components/journey/scene/hologramAtlas.ts`, `hologramAtlas.test.ts`
- Modify: `src/components/journey/scene/hologramMaterial.ts`
- Modify: `src/components/journey/scene/hologramMeshes.ts`, `hologramMeshes.test.ts`
- Modify: `src/components/journey/scene/Holograms.tsx`
- Modify: `scripts/build-holograms.ts`, `scripts/check-holograms.ts`(층 목록), `scripts/capture-journey.ts`(`CAPTURE_SET=wally`)
- Create: `public/journey/holograms/wally-{entry,home,spending,day,budget}.webp`; Delete: `public/journey/holograms/wally.webp`

**Interfaces:**
- Consumes: `Hologram.placement`(Task 3).
- Produces:
  - `export interface HologramPage { src: string; width: number; height: number; crop?: PixelRect; layerFile: string; rotated: boolean }`. Task 5에서는 `rotated`가 모두 `false`다.
  - `Hologram`에서 `layerFile`을 빼고 `pages: readonly HologramPage[]`와 `layer: number`(첫 쪽의 층 번호)를 더한다. 쪽이 하나인 홀로그램은 `layerFile`이 지금과 같다. WALLY는 `/journey/holograms/wally-<이름>.webp`이고, 원본은 `public/projects/wally/<이름>.webp`를 entry, home, spending, day, budget 순서로 쓴다(`PAGES` 표, `CROPS`·`SOURCES`와 같은 자리).
  - `export const HOLOGRAM_LAYERS: readonly HologramPage[]`. 홀로그램 순서대로 쪽을 펼친 목록(16개)이고, 텍스처 배열의 층 번호다.
  - `export const PAGE_FADE = 0.15`
  - `export function pageAt(hologram: Hologram, progress: number): { from: number; to: number; mix: number }`. 층 번호는 절대값이다. 쪽이 하나면 `{ from: layer, to: layer, mix: 0 }`이다. 여럿이면 정류장 안 위치 `t`(`stopAt`, 정류장 밖이면 앞은 0·뒤는 1)에서 이렇게 정한다.
    - `u = clamp((t − 0.25) / 0.5, 0, 1) · n`, `i = min(n − 1, floor(u))`, `f = u − i`
    - `from = layer + i`
    - `to = layer + min(n − 1, i + 1)`
    - `mix = i < n − 1 ? smoothstep(1 − PAGE_FADE, 1, f) : 0`
  - `export function hologramLoaded(hologram: Hologram, layers: readonly LayerPixels[]): boolean`. 그 홀로그램의 쪽 층이 모두 받아졌을 때만 참이다.
  - 셰이더: `aLayer`를 `float`에서 `vec3`(from, to, mix)로 바꾼다. 화면 색은 `mix(texture(from), texture(to), mix)`다.
  - `HologramFrame.pages: { from: number; to: number; mix: number }[]`. `Holograms.tsx`가 프레임마다 `pageAt`으로 채우고, `writeHolograms`가 `aLayer`에 쓴다.

- [ ] **Step 1: 실패하는 테스트를 쓴다.**
  - `pageAt`이 결정적이다. 같은 진행률이면 같은 값이다.
  - 정류장 앞은 `{ layer, layer+1, 0 }`, 정류장 뒤는 `{ layer+4, layer+4, 0 }`이다.
  - 진행률을 1e-4 간격으로 훑을 때:
    - 화면 번호 `from − layer + mix`가 줄지 않는다.
    - `from`·`to`가 늘 `[layer, layer + 4]` 안이다(Review Focus 1).
    - 쪽마다 `mix === 0`이고 그 쪽을 보이는 구간이 `0.25 / SCROLL_LENGTH` 이상이다.
  - 쪽이 하나인 홀로그램 11개는 늘 `mix` 0이다.
  - `HOLOGRAM_LAYERS.length`는 16이고, 층 파일이 겹치지 않는다.
  - `hologramLoaded`: WALLY의 쪽 하나가 `null`이면 거짓이고, 다른 홀로그램에는 영향이 없다(Review Focus 4).
  - `writeHolograms`가 칸 순서표(`order`)를 따라 `aLayer`에 (from, to, mix)를 쓴다.
- [ ] **Step 2: 돌려서 실패를 확인한다.** `rtk proxy npx vitest run src/lib/journey/holograms.test.ts src/components/journey/scene --maxWorkers=2`
- [ ] **Step 3: 구현한다.**
  - 위 인터페이스를 만든다.
  - 아틀라스는 `HOLOGRAM_LAYERS`의 `layerFile`을 받는다.
  - `frame.loaded[index]`는 `hologramLoaded`로 정한다.
  - `build-holograms`와 `check-holograms`의 다운로드 합계는 `HOLOGRAM_LAYERS`를 돈다.
  - `capture-journey`에 `wally` 묶음을 더한다. WALLY 도착(t 0.1), 다섯 쪽 가운데(t = 0.25 + 0.1·(2i+1)), 떠남(t 0.9)의 일곱 장이다.
  - `npm run build:holograms`로 층을 만든다.
- [ ] **Step 4: 통과를 확인한다.**
  - vitest 전체(`--maxWorkers=4`), tsc, eslint를 차례로 돌린다.
  - 빌드 → `CAPTURE_SET=wally CAPTURE_HEADLESS=1`로 일곱 장을 찍고, 다섯 쪽이 순서대로 보이는지 눈으로 확인한다.
- [ ] **Step 5: 커밋 초안.** 메시지는 `feat: WALLY 홀로그램 화면을 스크롤로 넘김`, 불릿은 "정류장에 머무는 동안 실제 앱 화면 다섯 장을 진행률로 넘겨 되감아도 같은 장면"이다.

### Task 6: 휴대폰 모양과 해상도

**Files:**
- Modify: `src/lib/journey/holograms.ts`, `holograms.test.ts`
- Modify: `src/components/journey/scene/hologramMaterial.ts`, `hologramMeshes.ts`, `hologramMeshes.test.ts`
- Modify: `scripts/build-holograms.ts`, `scripts/check-holograms.ts`
- Modify: `public/journey/holograms/wally-*.webp`(다시 만든다)

**Interfaces:**
- Produces:
  - WALLY 쪽은 `rotated: true`다(`ROTATED = new Set(["wally"])`).
  - `export function textureRect(page: HologramPage): PixelRect`. `rotated`면 `layerRect(page.height, page.width)`, 아니면 `layerRect(page.width, page.height)`다. 그림 영역(상자 안 자리, `imageCorners`)은 지금처럼 돌리지 않은 크기의 `layerRect`다.
  - `build-holograms`는 `rotated` 쪽을 `sharp(...).rotate(90)`(시계 방향)으로 돌려 `textureRect` 자리에 넣는다.
  - `export const PHONE_CORNER = 0.12`. 모서리 반지름이 그림 폭에서 차지하는 비율이다.
  - 셰이더 속성을 둘 더한다.
    - `aTex vec4`: 층 안 텍스처 영역. 돌리지 않은 쪽은 `aRect`와 같다.
    - `aShape vec2`: (rotated 0/1, 모서리 비율). WALLY만 0이 아니다.
  - 셰이더의 텍스처 좌표: 그림 안 좌표를 `q = (layerUv − rect.xy) / rect.zw`로 구한다. `rotated`면 `vec2(1 − q.y, q.x)`, 아니면 `q`이고, 이 값을 `aTex` 영역에 놓는다. 그림 알파와 테두리 선은 둥근 사각형 거리 함수 하나로 그린다. 반지름이 0이면 지금과 같다.
  - `export function insideFrame(x: number, y: number, centerX: number, centerY: number, halfWidth: number, halfHeight: number, radius: number, reach: number): boolean` (hologramMeshes.ts). 둥근 사각형까지의 거리가 `reach` 이하일 때 참이다. `withinFrame`이 쓴다.
  - 속성 수는 13이다(WebGL2 최소 16 안).

- [ ] **Step 1: 실패하는 테스트를 쓴다.**
  - WALLY 쪽의 `textureRect`는 `{ x: 0, y: 63, width: 768, height: 353 }`이다.
  - 그림 영역 `layerRect(603, 1311)`은 `{ x: 273, y: 0, width: 221, height: 480 }`이고 그대로다.
  - `insideFrame`:
    - 반지름 0이면 지금 `withinFrame`과 같은 판정이다(무작위 점 1,000개).
    - 반지름이 있으면 모서리 바깥 점(모서리에서 대각선으로 0.9·반지름 안쪽)은 거짓이고, 변 가운데 점은 참이다.
  - `writeHolograms`가 WALLY 칸에 `aShape = (1, 0.12)`를, 다른 칸에 `(0, 0)`을 쓴다.
- [ ] **Step 2: 실패를 확인한다.** `rtk proxy npx vitest run src/lib/journey/holograms.test.ts src/components/journey/scene --maxWorkers=2`
- [ ] **Step 3: 구현한다.** 위 인터페이스를 만들고 층을 다시 만든다(`npm run build:holograms`).
  - `check-holograms`의 재질 검사(화면 영역 ΔE 0)는 WALLY 쪽마다 한다. 참조는 층 이미지를 반시계 90°로 되돌린 그림이다. 90° 회전은 화소 순서만 바꾸므로 ΔE 0이어야 한다.
  - 블룸 검사의 대표 자리에 WALLY 머묾(t 0.5)을 더한다.
- [ ] **Step 4: 통과를 확인한다.**
  - vitest, tsc, eslint를 돌린다.
  - 빌드 → `CHECK_HEADLESS=1 npm run check:holograms`를 돌린다. ① ΔE 0, ③ 평균 ΔE 2 이하여야 한다.
  - `CAPTURE_SET=wally CAPTURE_VIEWPORT=1440x900`(배율 2)로 찍는다. 다섯 쪽의 큰 글자(홈의 남은 예산 금액, 하루 화면의 잔고, 예산 화면의 금액)와 버튼 글자가 읽혀야 한다. 판정한 캡처를 `captures/wally-resolution/`에 둔다.
- [ ] **Step 5: 커밋 초안.** 메시지는 `feat: WALLY 홀로그램을 휴대폰 모양으로, 화면을 선명하게`, 불릿은 "세로 화면을 층 안에서 돌려 넣어 긴 변을 768화소에 맞춤", "둥근 모서리 밖은 그리지도 누르지도 않음"이다.

### Task 7: 상세 패널과 크레딧, WALLY e2e

**Files:**
- Modify: `src/data/projects/types.ts` (`screensCredit?: Inline`)
- Modify: `src/data/projects/wally.ts`, `src/app/blog/wally/page.tsx`
- Modify: `src/components/journey/ProjectDialog.tsx`
- Create: `e2e/journey-wally.e2e.ts`

**Interfaces:**
- Produces:
  - `StandardProject.screensCredit?: Inline`. WALLY 값은 `"화면 디자인은 WALLY 디자인팀의 작업입니다. 목 데이터로 찍은 iOS 화면입니다."`이고, 블로그 페이지는 이 값을 같은 마크업으로 그린다.
  - `StandardDetail`의 순서: `Screens` → 크레딧(있으면, 작은 회색 글) → 담당 역할 → `"주요 작업"`(`project.cases`가 있으면 `CaseCard` 목록) → 성과.
  - `Screens`: 가로 화면은 지금처럼 쌓는다. 세로 화면은 3열 격자로, 가로 화면 뒤에 둔다. 모두 세로면 지금과 같다.

- [ ] **Step 1: 실패하는 e2e를 쓴다.** `e2e/journey-wally.e2e.ts`, desktop과 mobile 프로젝트:
  - WALLY 정류장에서 휴대폰을 누르면 `#wally` 상세가 하나만 열린다. 상세에는 케이스 제목 다섯과 크레딧 문구가 있고 "출시"는 없다. 닫으면 "자세히 보기" 링크로 포커스가 돌아온다.
  - `/journey#wally`로 들어오면 WALLY 정류장으로 이동하고 상세가 열린다.
  - 2D 모드에서 PiCKCARE 다음에 WALLY 카드가 있고 썸네일이 보인다. 2D로 바꾸는 방법은 기존 e2e의 방식을 따른다.
  - mobile에서는 WALLY 읽기 자리에 WALLY 고정 카드가 보인다.
  - 장면이 준비되고 WALLY 정류장에 머물면, WALLY 카드의 썸네일이 화면에서만 감춰지고(sr-only) 대체 텍스트는 남는다(스펙 3절 "썸네일 대체").
  - `/journey/holograms/wally-day.webp`를 404로 막으면 WALLY 썸네일이 화면에 보이고(sr-only 아님), 끝까지 스크롤된다(Review Focus 4).
  - axe 위반 0: WALLY 상세가 열린 상태.
- [ ] **Step 2: 실패를 확인한다.** 빌드가 포함되는 무거운 검증이다. `rtk proxy npx playwright test e2e/journey-wally.e2e.ts`
- [ ] **Step 3: 구현한다.** 위 인터페이스대로 만든다. 블로그 페이지의 크레딧은 `wally.screensCredit`으로 그린다(문구와 마크업이 같아야 한다).
- [ ] **Step 4: 통과를 확인한다.** 차례로 돌린다.
  - `e2e/journey-wally.e2e.ts`
  - `e2e/blog-projects.e2e.ts`: wally를 포함해 16개가 통과해야 한다. 블로그 마크업이 바뀌지 않았다는 확인이다.
  - vitest, tsc, eslint
- [ ] **Step 5: 커밋 초안.** 메시지는 `feat: 여정 WALLY 상세에 케이스와 디자인팀 크레딧`, 불릿은 "블로그 글과 같은 문제·해결·결과를 여정 상세에서도 보이게", "크레딧을 데이터로 옮겨 블로그와 여정이 같은 문구를 씀"이다.

### Task 8: 최종 확인과 기록

**Files:**
- Modify: `scripts/capture-journey.ts`. 풍경 묶음에 `13-wally`(wally 0.5)·`14-wally-leave`(wally 0.9)를, portrait 묶음에 같은 둘을 더한다.
- Modify: `docs/superpowers/specs/2026-10-14-journey-design.md`. 1절 단계 표의 3단계에 "(완료)"를, 7절에 "3단계 최종" 실측을, 9절에 구현이 정한 값(휴대폰 `top`·`box`, 바뀐 `OVERVIEW`)을 적는다.

- [ ] **Step 1: 전체 검사를 차례로 돌린다.**
  - `rtk proxy npx vitest run --maxWorkers=4`
  - `rtk proxy npx tsc --noEmit`
  - `npx eslint .`
  - `rtk proxy npx playwright test`: 전체 e2e다. 메모리 압박이면 기다렸다 돌린다.
- [ ] **Step 2: 캡처.**
  - 데스크톱 풍경 묶음(14장)과 `wally` 묶음
  - 세로 네 크기의 portrait 묶음
  - `hall` 묶음: PiCKCARE 읽기 구간 100%와 허용된 결함 둘을 1·9번 칸에서 확인한다.
  - Task 1 기준과 `diff-captures`로 비교하고 표를 `progress.md`에 남긴다.
- [ ] **Step 3: 성능.**
  - 사용자에게 창이 뜬다고 알린 뒤 `npm run perf:journey`를 3회 돌린다. 회마다 50ms 초과가 0이어야 한다. 실행 환경과 주사율을 적는다.
  - `?debug=stats`에서 가장 무거운 프레임의 드로콜(60 이하), 준비 전후 프로그램 수(새로 0), 텍스처 GPU 추정(100MiB 이하, 어림 68MiB 안팎), 경량 단계 추정을 적는다.
  - 홀로그램 층 파일 합계와 전송량(`check:holograms` 출력)을 적는다.
- [ ] **Step 4: 스펙 기록.** 위 숫자와 결정을 스펙 1·7·9절에 적는다. 열린 문제가 생기면 10절에 적는다.
- [ ] **Step 5: 커밋 초안과 정리.**
  - `commits.md`의 묶음을 파일이 겹치지 않게 정리한다.
  - 시각 보조 도구와 로컬 서버를 끈다.
  - 사용자에게 파일별 표와 커밋 순서를 건넨다. 병합(PR)은 사용자가 한다.
