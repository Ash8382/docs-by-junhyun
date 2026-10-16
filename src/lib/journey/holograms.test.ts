import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CAR_END } from "./drive";
import {
  FRAME_LIGHT,
  FRONT_LEAD,
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
import { HALL_REPO_END, HALL_REPO_START, STOPS, rangeOf, type Vec3 } from "./timeline";
import { trailColor } from "./trail";

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

describe("PiCKCARE 앞줄", () => {
  const range = rangeOf("pickcare");
  const at = (t: number) => range.start + (range.end - range.start) * t;
  /** 저장소 진행률 u(저장소 패널 구간 안의 위치, hallRepoProgress)의 자리 */
  const atRepo = (u: number) =>
    at((HALL_REPO_START + u * (range.stop.length - HALL_REPO_START - HALL_REPO_END)) / range.stop.length);

  it("스크롤 기준: 저장소 진행률 u에서 앞줄은 min(4, floor(5u + 0.76))라, 전환 사이의 가운데((i + 0.5 − 0.76)/5)에서 i다", () => {
    expect(FRONT_LEAD).toBe(0.76);
    for (let i = 0; i < 5; i++) expect(pickcareFront(atRepo(Math.max(0, (i + 0.5 - FRONT_LEAD) / 5)), ""), `i=${i}`).toBe(i);
  });

  it("저장소 i에서 i+1로 5u = i + 1 − 0.76에서 바뀐다(저장소 i의 읽기 구간이 끝난 뒤, i+1의 읽기 구간이 시작하기 전)", () => {
    for (let i = 0; i < 4; i++) {
      const u = (i + 1 - FRONT_LEAD) / 5;
      expect(pickcareFront(atRepo(u - 1e-4), ""), `i=${i}`).toBe(i);
      expect(pickcareFront(atRepo(u + 1e-4), ""), `i=${i}`).toBe(i + 1);
    }
  });

  it("저장소 패널 구간 앞(PiCKCARE 들어설 때 포함)은 첫 저장소, 구간 뒤와 지나서는 마지막 저장소다", () => {
    expect(pickcareFront(0, "")).toBe(0);
    expect(pickcareFront(at(0.15), "")).toBe(0);
    expect(pickcareFront(at(0.9), "")).toBe(4);
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
