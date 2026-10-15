import {
  EquirectangularReflectionMapping,
  EquirectangularRefractionMapping,
  HalfFloatType,
  FloatType,
  LinearMipmapLinearFilter,
  LinearMipmapNearestFilter,
  NearestMipmapLinearFilter,
  NearestMipmapNearestFilter,
  Vector3,
  type Material,
  type Scene,
  type Texture,
  type WebGLRenderer,
} from "three";
import { getCarStatus, type CarStatus } from "@/lib/journey/sceneStatus";
import { scrollState } from "@/lib/journey/scrollState";

/**
 * 성능 측정용 장면 통계(스펙 7절 측정 조건). 주소에 ?debug=stats가 있을 때만 window.__journeyStats에 쓴다.
 * 렌더러 통계(info)는 autoReset을 끄고 프레임마다 한 번 비우므로, 후처리 패스까지 합친 프레임 하나의 드로콜이다.
 * 텍스처 메모리는 장면이 쓰는 텍스처의 크기·형식으로 계산한 GPU 업로드 추정치다. 등장방형 배경을 three가 큐브로 바꾸며 만드는
 * 텍스처와 깊이 버퍼도 넣는다. 후처리 렌더 타깃과 환경 반사의 PMREM 변환(약 3MB)은 넣지 않는다.
 */

export interface JourneyStats {
  frames: number;
  /** 지난 프레임의 드로콜 */
  calls: number;
  /** 준비 뒤 가장 무거운 프레임의 드로콜과 그때의 진행률 */
  maxCalls: number;
  maxCallsProgress: number;
  /** 준비된 순간의 셰이더 프로그램 수와 지금 수. 스크롤 중에 늘면 안 된다 */
  programsAtReady: number;
  programs: number;
  textureBytes: number;
  progress: number;
  /** 지난 프레임에 그린 차(모델·실루엣)의 자리 */
  carPosition: [number, number, number] | null;
  car: CarStatus;
}

type StatsWindow = Window & { __journeyStats?: JourneyStats };

export function statsEnabled(): boolean {
  return new URLSearchParams(window.location.search).get("debug") === "stats";
}

const MIPMAP_FILTERS = new Set<number>([
  LinearMipmapLinearFilter,
  LinearMipmapNearestFilter,
  NearestMipmapLinearFilter,
  NearestMipmapNearestFilter,
]);

function pixelBytes(texture: Texture): number {
  return texture.type === FloatType ? 16 : texture.type === HalfFloatType ? 8 : 4;
}

function mipmapped(texture: Texture): boolean {
  return texture.generateMipmaps && MIPMAP_FILTERS.has(texture.minFilter);
}

/**
 * 텍스처 하나의 GPU 업로드 추정치(바이트). 압축 텍스처는 밉맵 데이터 그대로, 나머지는 크기 × 화소 크기(밉맵이면 4/3배).
 * 큐브 텍스처는 image가 면 여섯의 배열이라 면마다 센다.
 */
export function textureBytes(texture: Texture): number {
  const mipmaps = texture.mipmaps as { data?: ArrayBufferView }[] | undefined;
  if ((texture as { isCompressedTexture?: boolean }).isCompressedTexture && mipmaps?.length) {
    return mipmaps.reduce((sum, level) => sum + (level.data?.byteLength ?? 0), 0);
  }
  const images = (Array.isArray(texture.image) ? texture.image : [texture.image]) as ({ width?: number; height?: number } | null)[];
  const pixels = images.reduce((sum, image) => sum + (image?.width ?? 0) * (image?.height ?? 0), 0);
  return Math.round(pixels * pixelBytes(texture) * (mipmapped(texture) ? 4 / 3 : 1));
}

/**
 * 등장방형 배경을 three가 첫 렌더에서 바꾸는 큐브의 추정치: 원본 높이 크기의 면 여섯(원본의 밉맵 설정을 따른다)과
 * 면마다 붙는 깊이 버퍼(4바이트). three r181 WebGLCubeMaps가 원본과 별도로 둔다.
 */
export function equirectCubeBytes(texture: Texture): number {
  const size = (texture.image as { height?: number } | null)?.height ?? 0;
  const faces = 6 * size * size;
  return Math.round(faces * pixelBytes(texture) * (mipmapped(texture) ? 4 / 3 : 1)) + faces * 4;
}

/** 장면이 쓰는 텍스처(배경, 환경, 재질의 모든 텍스처 칸과 uniform)를 한 번씩만 센 추정치 */
export function sceneTextureBytes(scene: Scene): number {
  const textures = new Set<Texture>();
  const add = (value: unknown) => {
    if (value && typeof value === "object" && (value as Texture).isTexture) textures.add(value as Texture);
  };
  add(scene.background);
  add(scene.environment);
  scene.traverse((object) => {
    const material = (object as { material?: Material | Material[] }).material;
    for (const item of Array.isArray(material) ? material : material ? [material] : []) {
      for (const value of Object.values(item)) add(value);
      // 셰이더 재질(은하 하늘 등)은 텍스처를 uniform에 둔다
      const uniforms = (item as { uniforms?: Record<string, { value: unknown }> }).uniforms;
      for (const uniform of Object.values(uniforms ?? {})) add(uniform?.value);
    }
  });
  const background = scene.background as Texture | null;
  const derived =
    background?.isTexture &&
    (background.mapping === EquirectangularReflectionMapping || background.mapping === EquirectangularRefractionMapping)
      ? equirectCubeBytes(background)
      : 0;
  return [...textures].reduce((sum, texture) => sum + textureBytes(texture), derived);
}

const carWorld = new Vector3();

/** 프레임마다 통계를 쓰는 기록기. 그리기 전에 begin(), 그린 뒤에 end(), 준비되는 순간 ready()를 부른다 */
export function createStatsRecorder(gl: WebGLRenderer, scene: Scene) {
  // 후처리 패스마다 렌더러 통계가 비워지지 않게 하고, 프레임마다 한 번(begin) 비운다.
  gl.info.autoReset = false;
  const stats: JourneyStats = {
    frames: 0,
    calls: 0,
    maxCalls: 0,
    maxCallsProgress: 0,
    programsAtReady: 0,
    programs: 0,
    textureBytes: 0,
    progress: 0,
    carPosition: null,
    car: getCarStatus(),
  };
  let ready = false;
  (window as StatsWindow).__journeyStats = stats;
  return {
    begin() {
      gl.info.reset();
    },
    end() {
      stats.frames += 1;
      stats.calls = gl.info.render.calls;
      stats.programs = gl.info.programs?.length ?? 0;
      stats.progress = scrollState.progress;
      stats.car = getCarStatus();
      const car = scene.getObjectByName("journey-car");
      stats.carPosition = car ? (car.getWorldPosition(carWorld).toArray() as [number, number, number]) : null;
      if (ready && stats.calls > stats.maxCalls) {
        stats.maxCalls = stats.calls;
        stats.maxCallsProgress = stats.progress;
      }
    },
    ready() {
      ready = true;
      stats.programsAtReady = gl.info.programs?.length ?? 0;
      stats.textureBytes = sceneTextureBytes(scene);
    },
  };
}
