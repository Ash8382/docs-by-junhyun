import { describe, expect, it } from "vitest";
import { ENDING_FOCUS, FOCUS_OFFSET, ROAD_END, driveAt, endingPoint, speedAt } from "./drive";
import {
  HOLOGRAMS,
  HOLOGRAM_LAYERS,
  PHONE_CORNER,
  REPO_HOLOGRAMS,
  hologramLoaded,
  hologramsAt,
  imageCorners,
  layerRect,
  pageAt,
  pickcareFront,
  sourceSize,
  textureRect,
} from "./holograms";
import { CARDS, PORTRAIT, PORTRAIT_FOCUS_OFFSET, activeCard } from "./portrait";
import { PATH_LENGTH, SCROLL_LENGTH, STOPS, pathSpan, rangeOf } from "./timeline";

/** 3단계 WALLY 정류장(스펙 3절 "WALLY 정류장 (3단계)"). 다른 테스트 파일은 정류장 일반 규칙을, 이 파일은 WALLY만의 결정을 본다 */

function at(id: string, within: number): number {
  const range = rangeOf(id);
  return range.start + (range.end - range.start) * within;
}

const WALLY = HOLOGRAMS.findIndex((hologram) => hologram.id === "wally");

describe("WALLY 정류장과 길", () => {
  it("PiCKCARE와 엔딩 사이의 3막 멈추는 정류장이고 길이는 3이다", () => {
    const index = STOPS.findIndex((stop) => stop.id === "wally");
    expect(STOPS[index]).toEqual({ id: "wally", kind: "project", act: 3, length: 3, pin: true, slug: "wally" });
    expect(STOPS[index - 1].id).toBe("pickcare");
    expect(STOPS[index + 1].id).toBe("ending");
  });

  it("경로는 6만큼 늘어 50이고 도로 끝은 290m다", () => {
    expect(pathSpan("wally")).toEqual({ from: 44, to: 50 });
    expect(PATH_LENGTH).toBe(50);
    expect(ROAD_END).toBe(290);
  });

  it("PiCKCARE를 떠나는 끝에서는 다음 정류장으로 달려 나간다(엔딩 앞처럼 멈추며 나가지 않는다)", () => {
    expect(speedAt(at("pickcare", 0.99))).toBeGreaterThan(0.5);
  });
});

describe("엔딩 카메라는 흰 점을 기준으로 둔다", () => {
  it("가로 화면: 흰 점에 2단계와 같은 오프셋을 더한 자리와 시선이다", () => {
    const point = endingPoint();
    point.forEach((value, i) => {
      expect(ENDING_FOCUS.position[i]).toBeCloseTo(value + FOCUS_OFFSET.position[i], 9);
      expect(ENDING_FOCUS.target[i]).toBeCloseTo(value + FOCUS_OFFSET.target[i], 9);
    });
  });

  it("세로 화면: 흰 점에 2단계와 같은 오프셋을 더한 자리와 시선이다", () => {
    const point = endingPoint();
    point.forEach((value, i) => {
      expect(PORTRAIT.focus.position[i]).toBeCloseTo(value + PORTRAIT_FOCUS_OFFSET.position[i], 9);
      expect(PORTRAIT.focus.target[i]).toBeCloseTo(value + PORTRAIT_FOCUS_OFFSET.target[i], 9);
    });
  });
});

describe("WALLY 홀로그램", () => {
  it("배치 종류는 1막·2막·휴대폰·저장소 줄로 나뉘고 WALLY만 휴대폰이다", () => {
    expect(HOLOGRAMS.map((hologram) => [hologram.id, hologram.placement])).toEqual([
      ["kokoa-clone", "act1"],
      ["todo-app", "act1"],
      ["eutcha", "act1"],
      ["stock2u", "act2"],
      ["tix2u", "act2"],
      ["pfplay", "act2"],
      ["pickcare/frontend", "hall"],
      ["pickcare/biz", "hall"],
      ["pickcare/studio", "hall"],
      ["pickcare/app", "hall"],
      ["pickcare/cardnews", "hall"],
      ["wally", "phone"],
    ]);
  });

  it("저장소 줄은 PiCKCARE 다섯뿐이다", () => {
    expect(REPO_HOLOGRAMS.map((hologram) => hologram.id)).toEqual([
      "pickcare/frontend",
      "pickcare/biz",
      "pickcare/studio",
      "pickcare/app",
      "pickcare/cardnews",
    ]);
  });

  it("WALLY 정류장 가운데에서 다 떠올라 카메라를 향하고, PiCKCARE 가운데에서는 보이지 않는다", () => {
    const middle = at("wally", 0.5);
    const placement = hologramsAt(middle, pickcareFront(middle, ""))[WALLY];
    expect(placement.presence).toBeCloseTo(1, 9);
    expect(placement.facing.kind).toBe("camera");
    const pickcare = at("pickcare", 0.5);
    expect(hologramsAt(pickcare, pickcareFront(pickcare, ""))[WALLY].presence).toBe(0);
  });

  it("다 떠오른 휴대폰의 그림 높이는 2막 층 상자 높이(4.6875m)의 1.2배(5.625m)다(사용자 결정 2026-11-04)", () => {
    const middle = at("wally", 0.5);
    const placement = hologramsAt(middle, pickcareFront(middle, ""))[WALLY];
    const [topLeft, , , bottomLeft] = imageCorners(HOLOGRAMS[WALLY], placement, driveAt(middle).camera.position);
    const height = Math.hypot(topLeft[0] - bottomLeft[0], topLeft[1] - bottomLeft[1], topLeft[2] - bottomLeft[2]);
    expect(height).toBeCloseTo(4.6875 * 1.2, 6);
  });

  it("엔딩에서 원반과 함께 사라진다", () => {
    const fading = at("ending", 0.5);
    const placement = hologramsAt(fading, pickcareFront(fading, ""))[WALLY];
    expect(placement.presence).toBe(0);
    expect(placement.discOpacity).toBe(0);
  });

  it("#wally 해시는 PiCKCARE 앞줄을 바꾸지 않는다", () => {
    for (let p = 0; p <= 1; p += 0.001) expect(pickcareFront(p, "#wally"), p.toFixed(3)).toBe(pickcareFront(p, ""));
  });
});

describe("세로 화면 고정 카드", () => {
  it("WALLY 구간 30~70%에서는 WALLY 카드다", () => {
    for (let within = 0.3; within <= 0.7; within += 0.05) expect(activeCard(at("wally", within), ""), within.toFixed(2)).toBe("wally");
  });

  it("카드 목록에 WALLY가 한 번 있고 저장소 카드는 정확히 다섯이다", () => {
    expect(CARDS.filter((card) => card === "wally")).toHaveLength(1);
    expect(CARDS.filter((card) => card.startsWith("pickcare/"))).toHaveLength(5);
    expect(new Set(CARDS).size).toBe(CARDS.length);
  });
});

describe("WALLY 화면 넘김(스크롤, 스펙 3절 '화면 넘김')", () => {
  const wally = HOLOGRAMS[WALLY];
  const range = rangeOf("wally");

  it("층은 홀로그램 순서대로 쪽을 펼친 16개이고 파일이 겹치지 않는다. WALLY는 시작·홈·지출·하루·예산 다섯 쪽이다", () => {
    expect(HOLOGRAM_LAYERS).toHaveLength(16);
    expect(new Set(HOLOGRAM_LAYERS.map((page) => page.layerFile)).size).toBe(16);
    expect(wally.pages.map((page) => page.src)).toEqual(
      ["entry", "home", "spending", "day", "budget"].map((name) => `/projects/wally/${name}.webp`),
    );
    expect(wally.pages.map((page) => page.layerFile)).toEqual(
      ["entry", "home", "spending", "day", "budget"].map((name) => `/journey/holograms/wally-${name}.webp`),
    );
    expect(HOLOGRAM_LAYERS.slice(wally.layer, wally.layer + 5)).toEqual(wally.pages);
  });

  it("같은 진행률이면 같은 쪽이고, 정류장 앞은 첫 쪽·뒤는 마지막 쪽이다", () => {
    const p = at("wally", 0.43);
    expect(pageAt(wally, p)).toEqual(pageAt(wally, p));
    expect(pageAt(wally, at("pickcare", 0.5))).toEqual({ from: wally.layer, to: wally.layer + 1, mix: 0 });
    expect(pageAt(wally, at("ending", 0.5))).toEqual({ from: wally.layer + 4, to: wally.layer + 4, mix: 0 });
  });

  it("어느 진행률에서도 WALLY의 다섯 층 안이고, 화면 번호(from − layer + mix)는 줄지 않는다(되감으면 거꾸로)", () => {
    let previous = -1;
    for (let p = 0; p <= 1; p += 1e-4) {
      const { from, to, mix } = pageAt(wally, p);
      for (const value of [from, to]) {
        expect(value, p.toFixed(4)).toBeGreaterThanOrEqual(wally.layer);
        expect(value, p.toFixed(4)).toBeLessThanOrEqual(wally.layer + 4);
      }
      const page = from - wally.layer + mix;
      expect(page, p.toFixed(4)).toBeGreaterThanOrEqual(previous - 1e-12);
      previous = page;
    }
  });

  it("다섯 쪽이 차례로 나오고 쪽마다 0.25화면 이상 온전히 보인다", () => {
    const step = 1e-5;
    const shown = [0, 0, 0, 0, 0];
    for (let p = range.start; p < range.end; p += step) {
      const { from, mix } = pageAt(wally, p);
      if (mix === 0) shown[from - wally.layer] += step * SCROLL_LENGTH;
    }
    shown.forEach((screens, page) => expect(screens, `${page + 1}쪽`).toBeGreaterThanOrEqual(0.25));
  });

  it("쪽이 하나인 홀로그램 열하나는 늘 자기 층 하나다", () => {
    for (const hologram of HOLOGRAMS.filter((item) => item.pages.length === 1)) {
      for (const p of [0, 0.3, 0.6, 0.9, 1]) expect(pageAt(hologram, p)).toEqual({ from: hologram.layer, to: hologram.layer, mix: 0 });
    }
  });

  it("WALLY의 쪽 하나라도 받지 못하면 WALLY는 받지 못한 것이고 다른 홀로그램에는 영향이 없다", () => {
    const layers = HOLOGRAM_LAYERS.map(() => new Uint8ClampedArray(4) as Uint8ClampedArray | null);
    expect(HOLOGRAMS.every((hologram) => hologramLoaded(hologram, layers))).toBe(true);
    layers[wally.layer + 3] = null;
    expect(hologramLoaded(wally, layers)).toBe(false);
    expect(HOLOGRAMS.filter((hologram) => hologram !== wally).every((hologram) => hologramLoaded(hologram, layers))).toBe(true);
  });
});

describe("WALLY 휴대폰 모양과 해상도(스펙 3절 '해상도')", () => {
  const wally = HOLOGRAMS[WALLY];

  it("WALLY 쪽만 층 안에 90° 돌려 넣어 긴 변을 768화소에 맞춘다", () => {
    expect(HOLOGRAM_LAYERS.filter((page) => page.rotated).map((page) => page.layerFile)).toEqual(wally.pages.map((page) => page.layerFile));
    for (const page of wally.pages) expect(textureRect(page)).toEqual({ x: 0, y: 63, width: 768, height: 353 });
  });

  it("그림 영역(상자 안 자리)은 돌리지 않은 세로 비율 그대로다", () => {
    expect(layerRect(wally.width, wally.height)).toEqual({ x: 273, y: 0, width: 221, height: 480 });
  });

  it("돌리지 않은 층의 텍스처 영역은 그림 영역과 같다", () => {
    for (const page of HOLOGRAM_LAYERS.filter((item) => !item.rotated)) {
      const size = sourceSize(page);
      expect(textureRect(page)).toEqual(layerRect(size.width, size.height));
    }
  });

  it("휴대폰 모서리 반지름은 그림 폭의 12%다", () => {
    expect(PHONE_CORNER).toBe(0.12);
  });
});
