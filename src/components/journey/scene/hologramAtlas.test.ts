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
