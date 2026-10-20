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
  type Mesh,
  type PerspectiveCamera,
  type Scene,
  type ShaderMaterial,
  type Texture,
  type WebGLRenderer,
} from "three";
import { detectTier, type Tier } from "@/lib/journey/capability";
import { getJourneyMode, type QualityLevel } from "@/lib/journey/journeyMode";
import { getCarStatus, type CarStatus } from "@/lib/journey/sceneStatus";
import { scrollState } from "@/lib/journey/scrollState";

/**
 * 성능 측정용 장면 통계(스펙 7절 측정 조건). 주소에 ?debug=stats(또는 휴대폰 측정 오버레이의 ?debug=perf)가 있을 때만 window.__journeyStats에 쓴다.
 * 렌더러 통계(info)는 autoReset을 끄고 프레임마다 한 번 비우므로, 후처리 패스까지 합친 프레임 하나의 드로콜이다.
 * 텍스처 메모리는 장면이 쓰는 텍스처의 크기·형식으로 계산한 GPU 업로드 추정치다(스펙 7절). 등장방형 배경을 three가 큐브로 바꾸며 만드는
 * 텍스처와 깊이 버퍼도 넣는다. 후처리 렌더 타깃과 환경 반사의 PMREM 변환(약 3MB)은 넣지 않는다. 후처리 렌더 타깃은 따로 잰다(renderTargetBytes, 2-4a).
 * three는 원본(source)과 업로드 설정이 같은 텍스처를 GPU에 한 번만 올리므로 그런 복제는 한 번만 센다.
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
  /** 차 모델의 바퀴가 구른 거리(m). 실루엣이거나 모델이 없으면 null */
  wheelTravel: number | null;
  car: CarStatus;
  /** 홀로그램(2-3a). 배열을 만들지 못하면 켜진 것이 없다 */
  holograms: HologramStats | null;
  /** 막별 풍경(2-3b) */
  landscape: LandscapeStats | null;
  /** 기기 단계와 지금 품질 단계(2-4a·2-4b). 준비된 순간부터 프레임마다 쓴다(실행 중 강등으로 바뀐다) */
  quality: QualityStats | null;
  /** 후처리 렌더 타깃 메모리 추정(바이트, 2-4a). 텍스처 예산과 따로 기록한다. 준비된 순간의 화면 크기 기준 */
  renderTargetBytes: number;
  /** 지난 프레임의 렌즈(2-4a): 세로 시야각(°)과 투영 중심의 화면 위에서의 비율 */
  lens: { fov: number; center: number };
  /** 지난 프레임의 카메라 뒤처짐(m, 2-4b): 감쇠한 자세와 목표 자세의 거리. 움직임 줄이기면 0이다 */
  cameraLag: number;
  /** 빛줄기를 그리는가(2-4b). 움직임 줄이기면 감춘다 */
  streaks: boolean;
}

/** 기기 단계와 품질(스펙 5절): 기기 단계, 지금 품질 단계, 실제 해상도 배율, 은하 폭, 블룸 mip 단계(블룸을 끄면 0), 블룸 휘도 패스의 해상도 비율 */
export interface QualityStats {
  tier: Tier;
  level: QualityLevel;
  dpr: number;
  galaxyWidth: number;
  bloomLevels: number;
  luminanceScale: number;
}

/** 홀로그램의 한 프레임(e2e가 클릭 좌표·호버·밝아짐·앞줄을 확인한다) */
export interface HologramStats {
  /** 메시에서 켜진 홀로그램 id(층과 배열 업로드가 성공한 것) */
  shown: string[];
  /** 포인터가 올라간 홀로그램 */
  hovered: string | null;
  /** 테두리가 밝아진 홀로그램(호버·링크 포커스) */
  glowing: string[];
  /** PiCKCARE 앞줄 저장소(감쇠한 값에 가장 가까운 것) */
  front: string;
  /** 보이는 홀로그램의 그림 영역: 화면 비율 좌표(왼쪽·위·오른쪽·아래, 0~1), 카메라 거리, 누를 수 있는가 */
  screens: { id: string; rect: [number, number, number, number]; distance: number; target: boolean }[];
}

/** 막별 풍경의 한 프레임(e2e가 막 단위 등장·지오메트리 고정·가림·첨탑 자리를 확인한다) */
export interface LandscapeStats {
  /** 메시마다: 보이는가, 지난 프레임에 그린 횟수, 지오메트리 표지(uuid:정점 버전, 바뀌면 다시 만든 것) */
  meshes: { name: string; visible: boolean; calls: number; geometry: string }[];
  /** 재질에 넣은 uniform */
  revealS: number;
  carS: number;
  ending: number;
  /** 장면의 실제 카메라 자리 */
  camera: [number, number, number];
  /** 첨탑의 도로 위 부분이 화면에서 차지하는 사각형(왼쪽·위·오른쪽·아래, 0~1). 카메라 뒤에 있거나 감췄으면 null */
  spire: [number, number, number, number] | null;
}

type StatsWindow = Window & { __journeyStats?: JourneyStats };

export function statsEnabled(): boolean {
  const debug = new URLSearchParams(window.location.search).get("debug");
  return debug === "stats" || debug === "perf";
}

/** 확인용 ?debug=stats(또는 perf)&busy=<ms>: 렌더 단계마다 그 시간만큼 일부러 끌어 실행 중 강등을 재현한다(2-4b). 없으면 0 */
export function busyMs(): number {
  if (!statsEnabled()) return 0;
  const busy = Number(new URLSearchParams(window.location.search).get("busy"));
  return Number.isFinite(busy) && busy > 0 ? busy : 0;
}

const MIPMAP_FILTERS = new Set<number>([
  LinearMipmapLinearFilter,
  LinearMipmapNearestFilter,
  NearestMipmapLinearFilter,
  NearestMipmapNearestFilter,
]);

function pixelBytes(texture: { type?: number }): number {
  return texture.type === FloatType ? 16 : texture.type === HalfFloatType ? 8 : 4;
}

function mipmapped(texture: Texture): boolean {
  return texture.generateMipmaps && MIPMAP_FILTERS.has(texture.minFilter);
}

/**
 * 텍스처 하나의 GPU 업로드 추정치(바이트). 압축 텍스처는 밉맵 데이터 그대로, 나머지는 크기 × 층 수 × 화소 크기(밉맵이면 4/3배).
 * 큐브 텍스처는 image가 면 여섯의 배열이라 면마다 세고, 배열 텍스처(홀로그램)는 층(depth)마다 센다.
 */
export function textureBytes(texture: Texture): number {
  const mipmaps = texture.mipmaps as { data?: ArrayBufferView }[] | undefined;
  if ((texture as { isCompressedTexture?: boolean }).isCompressedTexture && mipmaps?.length) {
    return mipmaps.reduce((sum, level) => sum + (level.data?.byteLength ?? 0), 0);
  }
  const images = (Array.isArray(texture.image) ? texture.image : [texture.image]) as
    | ({ width?: number; height?: number; depth?: number } | null)[];
  const layers = (texture as { isDataArrayTexture?: boolean }).isDataArrayTexture ? (images[0]?.depth ?? 1) : 1;
  const pixels = images.reduce((sum, image) => sum + (image?.width ?? 0) * (image?.height ?? 0), 0) * layers;
  return Math.round(pixels * pixelBytes(texture) * (mipmapped(texture) ? 4 / 3 : 1));
}

/**
 * GPU에 올라가는 단위. three r181 WebGLTextures는 원본(source)과 이 설정들(getTextureCacheKey)이 같으면 WebGL 텍스처 하나를 같이 쓴다.
 * GLTFLoader는 재질마다 텍스처를 복제하므로(차 Occlusion 하나가 복제 10개) 객체가 아니라 이 단위로 센다.
 */
function uploadKey(texture: Texture): string {
  return [
    texture.source.uuid,
    texture.wrapS,
    texture.wrapT,
    (texture as { wrapR?: number }).wrapR ?? 0,
    texture.magFilter,
    texture.minFilter,
    texture.anisotropy,
    texture.internalFormat,
    texture.format,
    texture.type,
    texture.generateMipmaps,
    texture.premultiplyAlpha,
    texture.flipY,
    texture.unpackAlignment,
    texture.colorSpace,
  ].join(":");
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

/** 장면이 쓰는 텍스처(배경, 환경, 재질의 모든 텍스처 칸과 uniform)를 GPU에 올라가는 단위로 한 번씩만 센 추정치 */
export function sceneTextureBytes(scene: Scene): number {
  const textures = new Map<string, Texture>();
  const add = (value: unknown) => {
    if (value && typeof value === "object" && (value as Texture).isTexture) {
      const texture = value as Texture;
      textures.set(uploadKey(texture), texture);
    }
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
  return [...textures.values()].reduce((sum, texture) => sum + textureBytes(texture), derived);
}

/** 렌더 타깃을 찾아 들어가지 않는 쪽: 렌더러·장면·카메라(후처리 밖의 것), 그리고 부모·자식 고리 */
const SKIP_KEYS = new Set(["renderer", "scene", "camera", "mainScene", "mainCamera", "parent", "children"]);

/**
 * 후처리(EffectComposer)에서 닿는 렌더 타깃의 메모리 추정(바이트). 렌더 타깃마다 한 번씩, 크기 × 화소 크기에 깊이 버퍼가 있으면
 * 화소당 4바이트를 더한다. 패스·효과의 필드(입출력 버퍼, 블룸 휘도·mip 사슬, SMAA 등)를 따라가되 텍스처·재질·지오메트리·형식 배열 안으로는
 * 들어가지 않는다. 화면 크기와 해상도 배율에 따라 바뀌므로 준비된 순간의 값이다.
 */
export function renderTargetBytes(root: object): number {
  const seen = new Set<object>();
  let total = 0;
  const visit = (value: unknown, depth: number) => {
    if (!value || typeof value !== "object" || seen.has(value) || depth > 8 || ArrayBuffer.isView(value)) return;
    seen.add(value);
    const item = value as {
      isWebGLRenderTarget?: boolean;
      isTexture?: boolean;
      isMaterial?: boolean;
      isBufferGeometry?: boolean;
      isObject3D?: boolean;
      width?: number;
      height?: number;
      depthBuffer?: boolean;
      texture?: { type?: number };
    };
    if (item.isWebGLRenderTarget) {
      const pixels = (item.width ?? 0) * (item.height ?? 0);
      total += pixels * pixelBytes(item.texture ?? {}) + (item.depthBuffer ? pixels * 4 : 0);
      return;
    }
    if (item.isTexture || item.isMaterial || item.isBufferGeometry || item.isObject3D) return;
    if (Array.isArray(value)) {
      for (const entry of value) visit(entry, depth + 1);
      return;
    }
    for (const [key, entry] of Object.entries(value)) if (!SKIP_KEYS.has(key)) visit(entry, depth + 1);
  };
  visit(root, 0);
  return total;
}

/** 후처리 효과 중 통계가 읽고 경량이 바꾸는 블룸 값(postprocessing BloomEffect의 필드) */
export interface BloomProbe {
  mipmapBlurPass: { levels: number };
  luminancePass: { resolution: { scale: number } };
}

let latestHolograms: HologramStats | null = null;
let latestLandscape: LandscapeStats | null = null;
let latestPostprocessing: { composer: object | null; bloom: BloomProbe | null } | null = null;

/**
 * 홀로그램 통계를 쓴다(?debug=stats일 때만 통계가 있다). 통계 기록기(Warmup)보다 먼저 올 수 있어(배열을 만들지 못한 경우)
 * 마지막 값을 들고 있다가 기록기가 생길 때 넣는다. 장면을 내리면 null로 비운다.
 */
export function recordHolograms(holograms: HologramStats | null): void {
  latestHolograms = holograms;
  const stats = (window as StatsWindow).__journeyStats;
  if (stats) stats.holograms = holograms;
}

/** 풍경 통계를 쓴다(?debug=stats일 때만 통계가 있다). 홀로그램처럼 마지막 값을 들고 있다가 기록기가 생길 때 넣는다 */
export function recordLandscape(landscape: LandscapeStats | null): void {
  latestLandscape = landscape;
  const stats = (window as StatsWindow).__journeyStats;
  if (stats) stats.landscape = landscape;
}

let latestCameraLag = 0;

/** 카메라 뒤처짐을 넘긴다(CameraRig, ?debug=stats일 때만 잰다) */
export function recordCameraLag(lag: number): void {
  latestCameraLag = lag;
}

/** 후처리(EffectComposer와 블룸)를 넘긴다. 준비된 순간에 렌더 타깃 메모리와 블룸 값을 읽는다. 장면을 내리면 null */
export function recordPostprocessing(postprocessing: { composer: object | null; bloom: BloomProbe | null } | null): void {
  latestPostprocessing = postprocessing;
}

const carWorld = new Vector3();

/** 프레임마다 통계를 쓰는 기록기. 그리기 전에 begin(), 그린 뒤에 end(), 준비되는 순간 ready()를 부른다 */
export function createStatsRecorder(gl: WebGLRenderer, scene: Scene, camera: PerspectiveCamera) {
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
    wheelTravel: null,
    car: getCarStatus(),
    holograms: latestHolograms,
    landscape: latestLandscape,
    quality: null,
    renderTargetBytes: 0,
    lens: { fov: camera.fov, center: 0.5 },
    cameraLag: 0,
    streaks: false,
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
      const travel = scene.getObjectByName("journey-car-model")?.userData.wheelTravel as { value: number } | undefined;
      stats.wheelTravel = travel ? travel.value : null;
      const view = camera.view?.enabled ? camera.view : null;
      stats.lens = { fov: camera.fov, center: view ? Number((0.5 - view.offsetY / view.fullHeight).toFixed(4)) : 0.5 };
      stats.cameraLag = latestCameraLag;
      stats.streaks = scene.getObjectByName("journey-streaks")?.visible ?? false;
      if (ready && stats.calls > stats.maxCalls) {
        stats.maxCalls = stats.calls;
        stats.maxCallsProgress = stats.progress;
      }
      if (stats.quality) {
        const bloom = latestPostprocessing?.bloom ?? null;
        stats.quality.level = getJourneyMode().quality;
        stats.quality.dpr = gl.getPixelRatio();
        stats.quality.bloomLevels = bloom?.mipmapBlurPass.levels ?? 0;
        stats.quality.luminanceScale = bloom?.luminancePass.resolution.scale ?? 0;
      }
    },
    ready() {
      ready = true;
      stats.programsAtReady = gl.info.programs?.length ?? 0;
      stats.textureBytes = sceneTextureBytes(scene);
      const sky = scene.getObjectByName("journey-sky") as Mesh | undefined;
      const galaxy = (sky?.material as ShaderMaterial | undefined)?.uniforms.uGalaxy?.value as Texture | undefined;
      const bloom = latestPostprocessing?.bloom ?? null;
      stats.quality = {
        tier: detectTier(),
        level: getJourneyMode().quality,
        dpr: gl.getPixelRatio(),
        galaxyWidth: (galaxy?.image as { width?: number } | undefined)?.width ?? 0,
        bloomLevels: bloom?.mipmapBlurPass.levels ?? 0,
        luminanceScale: bloom?.luminancePass.resolution.scale ?? 0,
      };
      stats.renderTargetBytes = latestPostprocessing?.composer ? renderTargetBytes(latestPostprocessing.composer) : 0;
    },
  };
}
