import { describe, expect, it } from "vitest";
import { driveAt } from "./drive";
import { landscapePieces, spireBase, spireTip } from "./landscapeBuild";
import { PORTRAIT_LENS, projectThrough } from "./lens";
import { OCCLUSION, occlusionTargets, segmentBlocked } from "./landscapeOcclusion";
import { portraitCamera } from "./portrait";
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
  // 엔딩은 풍경이 아직 보이는 앞부분만 본다. 구간 35%까지 풍경이 사라지고 끝에서는 길도 흰 점으로 모인다(병합 뒤 새 엔딩)
  ["ending", 0.15],
  ["ending", 0.3],
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
    // 표본이 충분한지 보는 하한. 엔딩 끝 두 자리를 앞부분으로 옮겨(새 엔딩, 병합 뒤) 300 언저리로 줄었다
    expect(roads).toBeGreaterThan(280);
    expect(blocked).toEqual([]);
  });

  it("3막 제목·진입·도착·떠날 때 카메라에서 첨탑의 도로 위 부분으로 가는 선분이 다른 풍경에 막히지 않는다", () => {
    const others = pieces.filter((item) => item.name !== "journey-landscape-spire");
    const base = spireBase(3);
    const tip = spireTip(3);
    const blocked: string[] = [];
    for (const [id, within] of [
      ["act-3", 0.5],
      ["act-3", 1],
      ["pickcare", 0.03],
      ["pickcare", 0.97],
    ] as const) {
      const camera = driveAt(at(id, within)).camera.position;
      for (const share of [0.3, 0.5, 0.7, 0.9, 1]) {
        const point: Vec3 = [base[0], base[1] + (tip[1] - base[1]) * share, base[2]];
        const hit = segmentBlocked(camera, point, others);
        if (hit) blocked.push(`${id} ${within} 높이 ${share} ← ${hit.piece} #${hit.item}`);
      }
    }
    expect(blocked).toEqual([]);
  });
});
