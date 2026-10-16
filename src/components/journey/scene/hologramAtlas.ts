import {
  DataArrayTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  RGBAFormat,
  SRGBColorSpace,
  UnsignedByteType,
  type Texture,
} from "three";
import { HOLOGRAMS, LAYER } from "@/lib/journey/holograms";

/**
 * 홀로그램 층 이미지 11장을 텍스처 배열 하나로 묶는다(스펙 3절 "텍스처 배열"). 실패는 두 갈래다.
 * - 층 하나(받지 못함, 디코딩 실패, 크기가 다름, 한 가지 색뿐): 그 층만 비우고 그 홀로그램만 숨긴다. 던지지 않는다.
 *   (던지면 장면 오류 경계가 3D 전체를 멈춘다)
 * - 배열 생성·GPU 업로드: 홀로그램 전체를 그리지 않는다. 장면은 이어진다.
 */

/** 층 하나의 화소(RGBA, 위에서 아래 행). 받지 못하면 null */
export type LayerPixels = Uint8ClampedArray | null;

/** 업로드 직전에 비울 GL 오류의 최대 개수. WebGL은 오류 깃발마다 하나씩 돌려준다 */
const MAX_STALE_ERRORS = 8;

/** 모든 화소가 첫 화소와 같은가. 캔버스 읽기를 막는 브라우저 설정에서는 빈 데이터가 온다 */
export function isBlank(pixels: Uint8ClampedArray): boolean {
  for (let index = 4; index < pixels.length; index += 4) {
    if (
      pixels[index] !== pixels[0] ||
      pixels[index + 1] !== pixels[1] ||
      pixels[index + 2] !== pixels[2] ||
      pixels[index + 3] !== pixels[3]
    ) {
      return false;
    }
  }
  return true;
}

/** 층 이미지 하나를 받아 화소로 바꾼다. 실패하면 경고를 남기고 null이다(던지지 않는다) */
export async function loadLayer(url: string): Promise<LayerPixels> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`응답 ${response.status}`);
    const bitmap = await createImageBitmap(await response.blob(), { premultiplyAlpha: "none", colorSpaceConversion: "none" });
    try {
      if (bitmap.width !== LAYER.width || bitmap.height !== LAYER.height) {
        throw new Error(`층 크기가 ${bitmap.width}×${bitmap.height}입니다`);
      }
      const canvas = document.createElement("canvas");
      canvas.width = LAYER.width;
      canvas.height = LAYER.height;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("2D 캔버스를 만들지 못했습니다");
      context.drawImage(bitmap, 0, 0);
      const pixels = context.getImageData(0, 0, LAYER.width, LAYER.height).data;
      if (isBlank(pixels)) throw new Error("읽은 층이 한 가지 색뿐입니다");
      return pixels;
    } finally {
      bitmap.close();
    }
  } catch (error) {
    console.warn(`여정 홀로그램 층을 받지 못해 그 홀로그램만 숨깁니다: ${url}`, error);
    return null;
  }
}

let pending: Promise<LayerPixels[]> | null = null;

/** 11장을 함께 받는다. React use()가 기다릴 수 있도록 같은 약속을 돌려준다(장면과 같은 Suspense 안에서 기다린다) */
export function loadHologramLayers(): Promise<LayerPixels[]> {
  pending ??= Promise.all(HOLOGRAMS.map((hologram) => loadLayer(hologram.layerFile)));
  return pending;
}

/** 받은 층을 놓는다. 장면을 내리면 부른다(다시 들어오면 HTTP 캐시에서 다시 읽는다) */
export function releaseHologramLayers(): void {
  pending = null;
}

/** 층 화소들을 텍스처 배열 하나(768×480 × 층 수, RGBA8, sRGB, 밉맵)로 묶는다. 받지 못한 층은 비운다(투명) */
export function createLayerTexture(layers: readonly LayerPixels[]): DataArrayTexture {
  const layerBytes = LAYER.width * LAYER.height * 4;
  const data = new Uint8Array(layerBytes * layers.length);
  layers.forEach((pixels, index) => {
    if (pixels) data.set(pixels, index * layerBytes);
  });
  const texture = new DataArrayTexture(data, LAYER.width, LAYER.height, layers.length);
  texture.format = RGBAFormat;
  texture.type = UnsignedByteType;
  texture.colorSpace = SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  // three가 기기 한도로 줄인다
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

type ErrorSource = Pick<WebGLRenderingContext, "getError" | "isContextLost" | "NO_ERROR">;

/**
 * 텍스처를 지금 GPU에 올리고 GL 오류를 한 번만 확인한다(스펙 3절 "업로드 확인"). 매 프레임 GL 상태를 읽지 않는다.
 * three r181의 initTexture는 needsUpdate가 켜진 텍스처를 그 자리에서 올린다(texStorage3D → texSubImage3D → generateMipmap).
 * 1. 업로드 직전에 쌓인 오류를 비운다. 홀로그램과 무관한 앞선 오류를 업로드 실패로 잘못 보지 않기 위해서다.
 * 2. initTexture를 try로 감싼다. three의 WebGLState는 catch 안에서 이름이 가려져 GL 호출의 예외가 TypeError로 바뀌어 나온다.
 * 3. 직후 오류를 한 번 읽는다.
 * 컨텍스트를 잃은 상태면 올리지 않고 실패로 본다(장면 실패 감지가 맡는다).
 */
export function uploadChecked(
  renderer: { initTexture(texture: Texture): void; getContext(): ErrorSource },
  texture: Texture,
): boolean {
  const gl = renderer.getContext();
  if (gl.isContextLost()) return false;
  const stale: string[] = [];
  for (let count = 0; count < MAX_STALE_ERRORS; count++) {
    const error = gl.getError();
    if (error === gl.NO_ERROR) break;
    stale.push(`0x${error.toString(16)}`);
  }
  if (stale.length > 0) console.warn("여정 홀로그램 업로드 전에 쌓여 있던 GL 오류를 비웁니다", stale);
  try {
    renderer.initTexture(texture);
  } catch (error) {
    console.warn("여정 홀로그램 텍스처를 올리다 예외가 나 홀로그램을 그리지 않습니다", error);
    return false;
  }
  const error = gl.getError();
  if (error !== gl.NO_ERROR) {
    console.warn(`여정 홀로그램 텍스처를 올리지 못해 홀로그램을 그리지 않습니다(GL 오류 0x${error.toString(16)})`);
    return false;
  }
  return true;
}
