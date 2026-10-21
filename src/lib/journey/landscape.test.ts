import { describe, expect, it } from "vitest";
import { ROAD_END, ROAD_START, driveAt, roadFrame } from "./drive";
import { luminance } from "./holograms";
import {
  ALWAYS,
  APPEAR,
  LANDSCAPE_ACTS,
  LIGHT,
  RULES,
  actEnd,
  actSights,
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
    expect(actSights(2).map((sight) => sight.clear)).toEqual([25, 25, 25]);
    expect(actSights(3).map((sight) => sight.clear)).toEqual([18, 18, 18, 18, 18]);
    for (const sight of [...actSights(2), ...actSights(3)]) {
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
