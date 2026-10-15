import { describe, expect, it } from "vitest";
import {
  CompressedTexture,
  CubeTexture,
  DataTexture,
  EquirectangularReflectionMapping,
  HalfFloatType,
  LinearFilter,
  Mesh,
  MeshStandardMaterial,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  Texture,
  WebGLCubeRenderTarget,
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

  it("큐브 텍스처는 여섯 면을 센다(밉맵이면 4/3배)", () => {
    const square = { width: 64, height: 64 } as HTMLImageElement;
    const cube = new CubeTexture([square, square, square, square, square, square]);
    expect(textureBytes(cube)).toBe(Math.round(6 * 64 * 64 * 4 * (4 / 3)));
    expect(textureBytes(new WebGLCubeRenderTarget(32).texture)).toBe(6 * 32 * 32 * 4);
  });

  it("등장방형 배경은 three가 첫 렌더에서 바꾸는 큐브(높이 크기 면, 원본 밉 설정)와 면마다 깊이 버퍼까지 센다", () => {
    const scene = new Scene();
    const galaxy = imageTexture(256, 128);
    galaxy.mapping = EquirectangularReflectionMapping;
    scene.background = galaxy;
    const source = Math.round(256 * 128 * 4 * (4 / 3));
    const cube = Math.round(6 * 128 * 128 * 4 * (4 / 3));
    const depth = 6 * 128 * 128 * 4;
    expect(sceneTextureBytes(scene)).toBe(source + cube + depth);
  });

  it("셰이더 재질의 uniform 텍스처도 센다(은하 하늘)", () => {
    const scene = new Scene();
    const sky = imageTexture(128, 64);
    sky.generateMipmaps = false;
    sky.minFilter = LinearFilter;
    scene.add(new Mesh(undefined, new ShaderMaterial({ uniforms: { uGalaxy: { value: sky }, uIntensity: { value: 1 } } })));
    expect(sceneTextureBytes(scene)).toBe(128 * 64 * 4);
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
