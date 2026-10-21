import { describe, expect, it } from "vitest";
import { driveAt } from "./drive";
import {
  ALWAYS,
  LANDSCAPE_ACTS,
  RULES,
  actEnd,
  actSights,
  actStart,
  behindSight,
  inEndCorridor,
  projectPoint,
  roadDistance,
  roadSamples,
  type LandscapeAct,
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
      ["journey-landscape-act2", actSights(2)],
      ["journey-landscape-act3", actSights(3)],
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

describe("막을 더할 때", () => {
  /** 막을 하나 더한 시험 설정. 4막이 PiCKCARE 정류장 경로(s 170)에서 시작해 지금 도로 끝까지라고 친다 */
  const FOUR_ACTS: readonly LandscapeAct[] = [...LANDSCAPE_ACTS, { act: 4, stopId: "pickcare", kind: "rocks" }];

  it("막 목록의 막마다 그 막의 풍경 메시가 있고 이름이 겹치지 않는다", () => {
    for (const entry of LANDSCAPE_ACTS) expect(pieces.some((item) => item.act === entry.act), `${entry.act}막`).toBe(true);
    expect(new Set(pieces.map((item) => item.name)).size).toBe(pieces.length);
  });

  it("막을 하나 더하면 그 막 종류의 풍경이 그 막 구간에 생긴다(설정 한 줄로 늘어난다)", () => {
    const built = buildLandscape(FOUR_ACTS);
    const act4 = built.filter((item) => item.act === 4);
    expect(act4.map((item) => item.name)).toEqual(["journey-landscape-act4"]);
    expect(new Set(act4[0].scalars.aActStart)).toEqual(new Set([actStart(4, FOUR_ACTS)]));
    for (const s of act4[0].scalars.aS) {
      expect(s).toBeGreaterThanOrEqual(actStart(4, FOUR_ACTS) - 5);
      expect(s).toBeLessThanOrEqual(actEnd(4, FOUR_ACTS) + 10);
    }
    expect(new Set(built.map((item) => item.name)).size).toBe(built.length);
  });
});
