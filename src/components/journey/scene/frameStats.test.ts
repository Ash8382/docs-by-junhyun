import { describe, expect, it } from "vitest";
import {
  CompressedTexture,
  CubeTexture,
  DataArrayTexture,
  DataTexture,
  EquirectangularReflectionMapping,
  HalfFloatType,
  LinearFilter,
  LinearMipmapLinearFilter,
  Mesh,
  MeshStandardMaterial,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  Texture,
  WebGLCubeRenderTarget,
  WebGLRenderTarget,
} from "three";
import { BUSY_MAX_MS, busyFrom, renderTargetBytes, sceneTextureBytes, textureBytes } from "./frameStats";

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

  it("배열 텍스처는 층 수를 곱한다(밉맵이면 4/3배)", () => {
    const flat = new DataArrayTexture(new Uint8Array(8 * 4 * 4 * 3), 8, 4, 3);
    expect(textureBytes(flat)).toBe(8 * 4 * 4 * 3);
    const mipmapped = new DataArrayTexture(new Uint8Array(8 * 4 * 4 * 3), 8, 4, 3);
    mipmapped.generateMipmaps = true;
    mipmapped.minFilter = LinearMipmapLinearFilter;
    expect(textureBytes(mipmapped)).toBe(Math.round(8 * 4 * 4 * 3 * (4 / 3)));
  });

  it("원본과 업로드 설정이 같은 복제 텍스처는 한 번만 센다(차 Occlusion을 재질마다 복제한다)", () => {
    const scene = new Scene();
    const original = imageTexture(64, 64);
    original.generateMipmaps = false;
    original.minFilter = LinearFilter;
    for (let i = 0; i < 3; i++) scene.add(new Mesh(undefined, new MeshStandardMaterial({ aoMap: original.clone() })));
    expect(sceneTextureBytes(scene)).toBe(64 * 64 * 4);
  });

  it("원본이 같아도 업로드 설정(색 공간 등)이 다르면 따로 센다", () => {
    const scene = new Scene();
    const linear = imageTexture(64, 64);
    linear.generateMipmaps = false;
    linear.minFilter = LinearFilter;
    const srgb = linear.clone();
    srgb.colorSpace = SRGBColorSpace;
    scene.add(new Mesh(undefined, new MeshStandardMaterial({ map: srgb, aoMap: linear })));
    expect(sceneTextureBytes(scene)).toBe(2 * 64 * 64 * 4);
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

describe("후처리 렌더 타깃 메모리 추정(2-4a, 텍스처 예산과 따로)", () => {
  it("후처리에서 닿는 렌더 타깃을 한 번씩만 크기 × 화소 크기(깊이 버퍼가 있으면 4바이트 더)로 센다", () => {
    const hdr = new WebGLRenderTarget(100, 50, { type: HalfFloatType });
    const plain = new WebGLRenderTarget(40, 20, { depthBuffer: false });
    const mip = new WebGLRenderTarget(20, 10, { type: HalfFloatType, depthBuffer: false });
    const composer = {
      inputBuffer: hdr,
      outputBuffer: hdr,
      passes: [{ effects: [{ renderTarget: plain, luminancePass: { renderTarget: plain }, mipmapBlurPass: { downsamplingMipmaps: [mip] } }] }],
    };
    expect(renderTargetBytes(composer)).toBe(100 * 50 * (8 + 4) + 40 * 20 * 4 + 20 * 10 * 8);
  });

  it("렌더러·장면·카메라 쪽으로는 따라가지 않는다", () => {
    const scene = new Scene();
    const composer = { renderer: { target: new WebGLRenderTarget(1000, 1000) }, scene, passes: [] };
    expect(renderTargetBytes(composer)).toBe(0);
  });
});

describe("확인용 busy(2-4c)", () => {
  it("?debug=stats(또는 perf)일 때만 읽고, 500ms를 넘으면 500ms로 묶는다(만든 링크로 탭을 멈추지 못하게)", () => {
    expect(BUSY_MAX_MS).toBe(500);
    expect(busyFrom("?debug=stats&busy=50")).toBe(50);
    expect(busyFrom("?debug=perf&busy=300")).toBe(300);
    expect(busyFrom("?debug=stats&busy=100000")).toBe(500);
    expect(busyFrom("?busy=50")).toBe(0);
    expect(busyFrom("?debug=stats&busy=-5")).toBe(0);
    expect(busyFrom("?debug=stats&busy=abc")).toBe(0);
  });
});
