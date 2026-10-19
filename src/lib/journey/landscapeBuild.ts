import { driveAt, roadFrame } from "./drive";
import {
  LANDSCAPE_ACTS,
  LANDSCAPE_SEED,
  RULES,
  actEnd,
  actSights,
  actStart,
  actStopId,
  actTitleEnd,
  appearFrom,
  behindSight,
  flatFrame,
  inEndCorridor,
  roadDistance,
  roadSamples,
  type LandscapeAct,
} from "./landscape";
import { rangeOf, type Vec3 } from "./timeline";

/**
 * 막별 풍경의 배치와 정점(스펙 3절 "막별 구성"). 1막 절벽, 2막 부유 암석, 3막 도시와 첨탑을 시드·도로 함수·설정에서 만든다.
 * 같은 입력이면 같은 정점이다. 장면(scene/landscapeGeometry.ts)은 이 배열을 그대로 BufferGeometry로 감싸고 법선만 계산한다.
 * 수치는 사본 시제품(2026-10-19)의 값이고, 시제품과 같은 순서로 난수를 뽑는다(승인한 모습 그대로). 자리 규칙(모든 정점이 도로
 * 표본에서 수평 RULES.push 밖, 도로 끝 연장선 비움)은 뽑기가 끝난 뒤의 추가 밀기·건너뛰기로 지킨다. three 없는 순수 코드다.
 */

/** 정점마다 하나씩인 속성(셰이더의 attribute float과 같은 이름) */
export const SCALAR_ATTRIBUTES = [
  "aS",
  "aActStart",
  "aAppearFrom",
  "aRidge",
  "aRidge2",
  "aGlow",
  "aBelow",
  "aBelowTop",
  "aLayer",
  "aEdge",
  "aDissolve",
] as const;
export type ScalarAttribute = (typeof SCALAR_ATTRIBUTES)[number];

/** 선(능선·지붕·세로 모서리)이 없는 정점의 "선까지 거리" */
export const NO_LINE = 999;

export type LandscapeItemKind = "cliff" | "rock" | "building" | "spire";

/** 요소 하나(절벽 한 구간, 암석·건물 하나, 첨탑): 정점 범위와 상자. 가림 판정이 상자로 거른 뒤 삼각형을 본다 */
export interface LandscapeItem {
  kind: LandscapeItemKind;
  first: number;
  count: number;
  min: Vec3;
  max: Vec3;
  /** 정류장 홀로그램 뒤 비우기를 판정한 기준점과 기준 반지름(암석은 크기, 건물은 폭·깊이 중 큰 값). 해당 없는 요소는 없다 */
  sight?: { point: Vec3; radius: number };
}

/** 규칙 때문에 두지 않은 요소와 그 규칙(어느 규칙이 배치를 뺐는지 추적한다) */
export type ExclusionReason = "hologram" | "corridor" | "spire" | "clearance";

export interface LandscapeExclusion {
  kind: LandscapeItemKind;
  reason: ExclusionReason;
  /** 판정한 자리(요소 가운데) */
  point: Vec3;
}

/** 메시 하나의 정점. positions·rimNormals는 정점마다 셋, scalars는 하나. 삼각형 셋씩(인덱스 없음) */
export interface LandscapePiece {
  /** 메시 이름(장면·통계·e2e가 쓴다) */
  name: string;
  act: number;
  positions: Float32Array;
  scalars: Record<ScalarAttribute, Float32Array>;
  /** 암석 윤곽 빛용 매끈한 법선(암석 가운데에서 바깥). 다른 요소는 0 */
  rimNormals: Float32Array;
  items: LandscapeItem[];
  /** hologram: 정류장 홀로그램 뒤, corridor: 도로 끝 연장선, spire: 진입 카메라에서 첨탑을 가림, clearance: 도로에서 밀어내지 못함 */
  excluded: LandscapeExclusion[];
}

type Values = Record<ScalarAttribute, number>;

/** 정점을 모으며 요소마다 범위·상자를 적는다 */
class PieceWriter {
  private positions: number[] = [];
  private scalars = Object.fromEntries(SCALAR_ATTRIBUTES.map((name) => [name, [] as number[]])) as Record<ScalarAttribute, number[]>;
  private rim: number[] = [];
  private items: LandscapeItem[] = [];
  private excluded: LandscapeExclusion[] = [];
  private current: LandscapeItem | null = null;

  /** 규칙 때문에 두지 않은 요소를 적는다 */
  exclude(kind: LandscapeItemKind, reason: ExclusionReason, point: Vec3): void {
    this.excluded.push({ kind, reason, point });
  }

  begin(kind: LandscapeItemKind, sight?: LandscapeItem["sight"]): void {
    this.current = {
      kind,
      first: this.positions.length / 3,
      count: 0,
      min: [Infinity, Infinity, Infinity],
      max: [-Infinity, -Infinity, -Infinity],
      ...(sight ? { sight } : {}),
    };
  }

  vertex(p: Vec3, values: Values, rimNormal: Vec3 = [0, 0, 0]): void {
    const item = this.current;
    if (!item) throw new Error("요소를 시작하지 않고 정점을 넣었습니다");
    this.positions.push(p[0], p[1], p[2]);
    for (const name of SCALAR_ATTRIBUTES) this.scalars[name].push(values[name]);
    this.rim.push(rimNormal[0], rimNormal[1], rimNormal[2]);
    item.count += 1;
    for (let axis = 0; axis < 3; axis++) {
      item.min[axis] = Math.min(item.min[axis], p[axis]);
      item.max[axis] = Math.max(item.max[axis], p[axis]);
    }
  }

  end(): void {
    if (this.current && this.current.count > 0) this.items.push(this.current);
    this.current = null;
  }

  finish(name: string, act: number): LandscapePiece {
    return {
      name,
      act,
      positions: new Float32Array(this.positions),
      scalars: Object.fromEntries(SCALAR_ATTRIBUTES.map((key) => [key, new Float32Array(this.scalars[key])])) as Record<ScalarAttribute, Float32Array>,
      rimNormals: new Float32Array(this.rim),
      items: this.items,
      excluded: this.excluded,
    };
  }
}

/** 32비트 시드 난수(mulberry32). 0 이상 1 미만 */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 1차원 값 노이즈(−1~1): 격자 값을 부드럽게 잇는다. scale(m)이 한 격자 */
function valueNoise(seed: number, scale: number): (x: number) => number {
  const random = rng(seed);
  const values = Array.from({ length: 512 }, () => random() * 2 - 1);
  return (x: number) => {
    const p = x / scale + 256;
    const i = Math.floor(p);
    const f = p - i;
    const u = f * f * (3 - 2 * f);
    return values[i % 512] * (1 - u) + values[(i + 1) % 512] * u;
  };
}

const PUSH_SAMPLES = roadSamples(RULES.sampleStep);

/** 점들 가운데 하나라도 도로 끝 연장선 비움 안에 드는가(정점 기준) */
function inCorridor(points: readonly Vec3[]): boolean {
  return points.some((point) => inEndCorridor(point[0], point[2]));
}

/** 자리 (x, z)가 도로에서 수평 clear(m) 안이면 side 쪽으로 3m씩 민 옆 거리를 낸다 */
function pushOut(origin: Vec3, right: Vec3, side: number, lateral: number, clear: number): number {
  let value = lateral;
  for (let guard = 0; guard < 200 && roadDistance(origin[0] + right[0] * value, origin[2] + right[2] * value, PUSH_SAMPLES) < clear; guard++) {
    value += side * 3;
  }
  return value;
}

/** 가운데 (x, z)가 도로에서 수평 clear(m) 밖인가(pushOut이 밀어내지 못한 경우를 거른다) */
function cleared(point: Vec3, clear: number): boolean {
  return roadDistance(point[0], point[2], PUSH_SAMPLES) >= clear;
}

// ── 1막 절벽 ─────────────────────────────────────────────

interface CliffLayer {
  /** 0 앞, 1 가운데, 2 먼 능선 */
  depthLayer: 0 | 1 | 2;
  /** 이 겹이 놓이는 도로 구간(막 시작에서 잰 m). 없으면 막 시작부터 막 끝 + CLIFF.pastEnd까지 */
  span?: [number, number];
  side: -1 | 1;
  lateral: number;
  lateralAmp: number;
  height: number;
  heightAmp: number;
  depth: number;
  glow: boolean;
  seed: number;
}

/** 절벽: 막 끝을 지나 이어지는 길이(m), 표본 간격, 도로 아래 바닥, 끝을 낮추는 길이(앞 겹·먼 능선) */
const CLIFF = { pastEnd: 2, step: 1.5, bottom: 70, taper: 28, farTaper: 50 } as const;

/** 양옆 세 겹. 왼쪽은 홀로그램 자리라 더 키우지 않는다(사용자 결정 2026-10-19). 앞 겹만 능선 일부가 빛난다 */
const CLIFF_LAYERS: CliffLayer[] = [
  { depthLayer: 0, side: -1, lateral: 47, lateralAmp: 5, height: 26, heightAmp: 9, depth: 22, glow: true, seed: 1 },
  { depthLayer: 0, side: 1, lateral: 60, lateralAmp: 8, height: 30, heightAmp: 10, depth: 24, glow: true, seed: 2 },
  { depthLayer: 1, side: -1, lateral: 82, lateralAmp: 10, height: 42, heightAmp: 12, depth: 30, glow: false, seed: 3 },
  { depthLayer: 1, side: 1, lateral: 96, lateralAmp: 12, height: 44, heightAmp: 12, depth: 30, glow: false, seed: 4 },
  // 먼 능선: 앞으로 이어질 길 양옆 멀리, 안개에 묻혀 화면 가운데 지평선 위에 띠로 보인다
  { depthLayer: 2, side: -1, lateral: 175, lateralAmp: 30, height: 54, heightAmp: 18, depth: 60, glow: false, seed: 5, span: [42, 147] },
  { depthLayer: 2, side: 1, lateral: 195, lateralAmp: 30, height: 60, heightAmp: 18, depth: 60, glow: false, seed: 6, span: [52, 152] },
];

interface CliffSample {
  s: number;
  innerBottom: Vec3;
  innerTop: Vec3;
  outerTop: Vec3;
  outerBottom: Vec3;
  height: number;
  depth: number;
  glow: number;
}

function cliffSamples(layer: CliffLayer, act: number, acts: readonly LandscapeAct[]): CliffSample[] {
  const lateralNoise = valueNoise(LANDSCAPE_SEED + layer.seed * 11, 24);
  const heightNoise = valueNoise(LANDSCAPE_SEED + layer.seed * 13, 14);
  const jag = valueNoise(LANDSCAPE_SEED + layer.seed * 17, 3.5);
  const column = valueNoise(LANDSCAPE_SEED + layer.seed * 23, 2.2);
  const glowNoise = valueNoise(LANDSCAPE_SEED + layer.seed * 19, 18);
  // 겹마다 시작·끝을 조금씩 어긋나게 해 끝이 한 줄로 잘리지 않게 한다
  const actFrom = actStart(act, acts);
  const start = (layer.span ? actFrom + layer.span[0] : actFrom) + layer.seed * 1.7;
  const end = (layer.span ? actFrom + layer.span[1] : actEnd(act, acts) + CLIFF.pastEnd) - (layer.depthLayer === 0 ? 0 : 6 + layer.seed * 2);
  const samples: CliffSample[] = [];
  for (let s = start; s <= end + 1e-9; s += CLIFF.step) {
    const { origin, right } = flatFrame(s);
    // 안쪽 면을 세로 기둥처럼: 짧은 주기로 바깥쪽으로 1~4m 들고 난다. 다른 도로 구간이 가까이 지나가면 바깥으로 민다
    const raw = layer.side * (layer.lateral + layer.lateralAmp * lateralNoise(s) + 2.5 * Math.abs(column(s)));
    const lateral = pushOut(origin, right, layer.side, raw, RULES.push);
    const h = Math.max(8, layer.height + layer.heightAmp * heightNoise(s) + 5 * jag(s) + 4 * Math.abs(jag(s * 2.7)));
    const out = layer.side * layer.depth;
    const at = (offset: number, y: number): Vec3 => [origin[0] + right[0] * offset, origin[1] + y, origin[2] + right[2] * offset];
    // 끝은 높이를 점점 낮춰 사라진다(앞은 짧게, 끝은 길게)
    const fadeIn = Math.min(1, (s - start) / 10);
    const fadeOut = Math.min(1, (end - s) / (layer.depthLayer === 2 ? CLIFF.farTaper : CLIFF.taper));
    const fade = Math.max(0, Math.min(fadeIn, fadeOut));
    const height = h * (0.08 + 0.92 * fade * fade * (3 - 2 * fade));
    samples.push({
      s,
      innerBottom: at(lateral, -CLIFF.bottom),
      innerTop: at(lateral, height),
      outerTop: at(lateral + out, height * 0.82),
      outerBottom: at(lateral + out, -CLIFF.bottom),
      height,
      depth: Math.abs(out),
      glow: layer.glow ? Math.max(0, Math.min(1, (glowNoise(s) - 0.15) * 4)) * fade : 0,
    });
  }
  return samples;
}

function buildCliffs(act: number, acts: readonly LandscapeAct[]): LandscapePiece {
  const writer = new PieceWriter();
  const start = actStart(act, acts);
  const from = appearFrom(act, acts);
  for (const layer of CLIFF_LAYERS) {
    const samples = cliffSamples(layer, act, acts);
    for (let i = 0; i < samples.length - 1; i++) {
      const p = samples[i];
      const q = samples[i + 1];
      const roadY = roadFrame(p.s).position[1];
      writer.begin("cliff");
      const quad = (a: Vec3, b: Vec3, c: Vec3, d: Vec3, ridge: [number, number, number, number], glowA: number, glowB: number) => {
        const points = [a, b, c, a, c, d];
        const sides = [0, 0, 1, 0, 1, 1];
        const ridges = [ridge[0], ridge[1], ridge[2], ridge[0], ridge[2], ridge[3]];
        points.forEach((point, index) => {
          const sample = sides[index] === 0 ? p : q;
          writer.vertex(point, {
            aS: sample.s,
            aActStart: start,
            aAppearFrom: from,
            aRidge: ridges[index],
            aRidge2: NO_LINE,
            aGlow: sides[index] === 0 ? glowA : glowB,
            aBelow: Math.max(0, roadY - point[1]),
            aBelowTop: Math.max(0, sample.innerTop[1] - point[1]),
            aLayer: layer.depthLayer,
            aEdge: 0,
            aDissolve: 0,
          });
        });
      };
      // 안쪽 면: 능선까지 거리 = 위에서 잰 높이 차
      quad(p.innerBottom, p.innerTop, q.innerTop, q.innerBottom, [p.height + CLIFF.bottom, 0, 0, q.height + CLIFF.bottom], p.glow, q.glow);
      // 윗면: 능선까지 거리 = 안쪽 가장자리에서 잰 너비
      quad(p.innerTop, p.outerTop, q.outerTop, q.innerTop, [0, p.depth, q.depth, 0], p.glow, q.glow);
      // 바깥 면: 빛 없음
      quad(p.outerTop, p.outerBottom, q.outerBottom, q.outerTop, [NO_LINE, NO_LINE, NO_LINE, NO_LINE], 0, 0);
      writer.end();
    }
  }
  return writer.finish(`journey-landscape-act${act}`, act);
}

// ── 2막 부유 암석 ─────────────────────────────────────────

/**
 * 암석: 가까운 것·먼 것의 수, 구간(막 시작 before m 앞 ~ 막 끝 after m 뒤), 몰리는 가운데(막 시작에서 m)와 폭, 빛나는 비율,
 * 기본 형태 수. 2막이면 s 85~170에 두고 s 127 쪽에 몰린다
 */
const ROCKS = { near: 50, far: 24, before: 5, after: 10, middle: 37, middleWidth: 45, glow: 0.3, shapes: 5 } as const;

/** 정이십면체 꼭짓점과 면(three IcosahedronGeometry와 같은 순서) */
const ICOSAHEDRON = (() => {
  const t = (1 + Math.sqrt(5)) / 2;
  const vertices = [-1, t, 0, 1, t, 0, -1, -t, 0, 1, -t, 0, 0, -1, t, 0, 1, t, 0, -1, -t, 0, 1, -t, t, 0, -1, t, 0, 1, -t, 0, -1, -t, 0, 1];
  const indices = [
    0, 11, 5, 0, 5, 1, 0, 1, 7, 0, 7, 10, 0, 10, 11, 1, 5, 9, 5, 11, 4, 11, 10, 2, 10, 7, 6, 7, 1, 8, 3, 9, 4, 3, 4, 2, 3, 2, 6, 3, 6, 8, 3,
    8, 9, 4, 9, 5, 2, 4, 11, 6, 2, 10, 8, 6, 7, 9, 8, 1,
  ];
  return { vertices, indices };
})();

/**
 * 반지름 1 구에 붙인 정이십면체를 면마다 (detail + 1)² 조각으로 나눈 정점(삼각형 셋씩, three PolyhedronGeometry와 같은 순서·감김)
 */
function icosphere(detail: number): Vec3[] {
  const corner = (index: number): Vec3 => [ICOSAHEDRON.vertices[index * 3], ICOSAHEDRON.vertices[index * 3 + 1], ICOSAHEDRON.vertices[index * 3 + 2]];
  const lerp = (a: Vec3, b: Vec3, t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const out: Vec3[] = [];
  const cols = detail + 1;
  for (let face = 0; face < ICOSAHEDRON.indices.length; face += 3) {
    const a = corner(ICOSAHEDRON.indices[face]);
    const b = corner(ICOSAHEDRON.indices[face + 1]);
    const c = corner(ICOSAHEDRON.indices[face + 2]);
    const v: Vec3[][] = [];
    for (let i = 0; i <= cols; i++) {
      v[i] = [];
      const aj = lerp(a, c, i / cols);
      const bj = lerp(b, c, i / cols);
      const rows = cols - i;
      for (let j = 0; j <= rows; j++) v[i][j] = j === 0 && i === cols ? aj : lerp(aj, bj, j / rows);
    }
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < 2 * (cols - i) - 1; j++) {
        const k = Math.floor(j / 2);
        if (j % 2 === 0) out.push(v[i][k + 1], v[i + 1][k], v[i][k]);
        else out.push(v[i][k + 1], v[i + 1][k + 1], v[i + 1][k]);
      }
    }
  }
  return out.map((p) => {
    const length = Math.hypot(p[0], p[1], p[2]);
    return [p[0] / length, p[1] / length, p[2] / length];
  });
}

function hash3(x: number, y: number, z: number, seed: number): number {
  const v = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + seed * 19.19) * 43758.5453;
  return v - Math.floor(v);
}

/** 3차원 값 노이즈(−1~1) */
function noise3(x: number, y: number, z: number, seed: number): number {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const c = (dx: number, dy: number, dz: number) => hash3(xi + dx, yi + dy, zi + dz, seed);
  return (
    lerp(
      lerp(lerp(c(0, 0, 0), c(1, 0, 0), u), lerp(c(0, 1, 0), c(1, 1, 0), u), v),
      lerp(lerp(c(0, 0, 1), c(1, 0, 1), u), lerp(c(0, 1, 1), c(1, 1, 1), u), v),
      w,
    ) *
      2 -
    1
  );
}

/** 기본 암석(반지름 약 1): 윗면은 납작하고 아래는 뾰족한 떠 있는 섬. 같은 자리의 정점은 같은 만큼 움직인다 */
function rockShape(seed: number): Vec3[] {
  return icosphere(2).map(([x0, y0, z0]) => {
    const r = 1 + 0.32 * noise3(x0 * 1.3, y0 * 1.3, z0 * 1.3, seed) + 0.14 * noise3(x0 * 3.1, y0 * 3.1, z0 * 3.1, seed + 7);
    let x = x0 * r, y = y0 * r, z = z0 * r;
    if (y > 0.15) y = 0.15 + (y - 0.15) * 0.4;
    if (y < 0) {
      const taper = 1 + y * 0.3;
      y *= 1.8;
      x *= taper;
      z *= taper;
    }
    return [x, y, z];
  });
}

function buildRocks(act: number, acts: readonly LandscapeAct[]): LandscapePiece {
  const random = rng(LANDSCAPE_SEED + 202);
  const shapes = Array.from({ length: ROCKS.shapes }, (_, index) => rockShape(LANDSCAPE_SEED + index * 31));
  const writer = new PieceWriter();
  const start = actStart(act, acts);
  const from = appearFrom(act, acts);
  const sights = actSights(act);
  const low = start - ROCKS.before;
  const high = actEnd(act, acts) + ROCKS.after;
  for (let n = 0; n < ROCKS.near + ROCKS.far; n++) {
    const far = n >= ROCKS.near;
    // 막 가운데 쪽에 몰리고 클수록 가운데
    const s = low + (high - low) * ((random() + random()) / 2);
    const middle = 1 - Math.min(1, Math.abs(s - (start + ROCKS.middle)) / ROCKS.middleWidth);
    const size = (far ? 12 + 14 * middle : 6 + 12 * middle) * (0.7 + 0.4 * random());
    const side = random() < 0.5 ? -1 : 1;
    const { origin, right } = flatFrame(s);
    let lateral = side * (far ? 110 + 90 * random() : 40 + size * 0.8 + 70 * Math.pow(random(), 0.8));
    lateral = pushOut(origin, right, side, lateral, RULES.push + size);
    const height = far ? -20 + 60 * random() : -30 + 65 * random();
    let center: Vec3 = [origin[0] + right[0] * lateral, origin[1] + height, origin[2] + right[2] * lateral];
    if (behindSight(center, size, sights)) {
      writer.exclude("rock", "hologram", center);
      continue;
    }
    const shape = shapes[Math.floor(random() * shapes.length)];
    const stretchX = 0.75 + 0.6 * random();
    const stretchZ = 0.75 + 0.6 * random();
    const yaw = random() * Math.PI * 2;
    const tilt = (random() - 0.5) * 0.35;
    const glow = !far && random() < ROCKS.glow ? 1 : 0;
    const cos = Math.cos(yaw), sin = Math.sin(yaw);
    const local = shape.map(([x0, y0, z0]): Vec3 => {
      const x = x0 * stretchX * size;
      const y = y0 * size + x * tilt;
      const z = z0 * stretchZ * size;
      return [x * cos - z * sin, y, x * sin + z * cos];
    });
    // 모든 정점이 도로에서 RULES.push 밖이 되게, 수평으로 가장 먼 정점의 거리만큼 더 민다(뽑기는 그대로)
    const reach = Math.max(...local.map(([x, , z]) => Math.hypot(x, z)));
    lateral = pushOut(origin, right, side, lateral, RULES.push + reach);
    center = [origin[0] + right[0] * lateral, origin[1] + height, origin[2] + right[2] * lateral];
    const placed = local.map((offset): Vec3 => [center[0] + offset[0], center[1] + offset[1], center[2] + offset[2]]);
    // 민 자리에서 다시 본다: 도로 거리, 홀로그램 뒤 비우기(가운데·크기), 도로 끝 연장선(정점마다)
    const reason: ExclusionReason | null = !cleared(center, RULES.push + reach)
      ? "clearance"
      : behindSight(center, size, sights)
        ? "hologram"
        : inCorridor(placed)
          ? "corridor"
          : null;
    if (reason) {
      writer.exclude("rock", reason, center);
      continue;
    }
    const layer = glow ? 0 : Math.abs(lateral) > 100 ? 2 : 1;
    const top = center[1] + Math.max(...local.map(([, y]) => y));
    writer.begin("rock", { point: center, radius: size });
    for (const [index, offset] of local.entries()) {
      const p = placed[index];
      // 가장자리 빛용 매끈한 법선: 암석 가운데에서 바깥 방향(각진 면 전체가 빛나지 않게)
      const length = Math.hypot(offset[0], offset[1], offset[2]) || 1;
      writer.vertex(
        p,
        {
          aS: s,
          aActStart: start,
          aAppearFrom: from,
          aRidge: NO_LINE,
          aRidge2: NO_LINE,
          aGlow: glow,
          aBelow: Math.max(0, origin[1] - p[1]),
          aBelowTop: Math.max(0, top - p[1]),
          aLayer: layer,
          aEdge: 1,
          aDissolve: 0,
        },
        [offset[0] / length, offset[1] / length, offset[2] / length],
      );
    }
    writer.end();
  }
  return writer.finish(`journey-landscape-act${act}`, act);
}

// ── 3막 도시와 첨탑 ───────────────────────────────────────

/**
 * 3막 도시: 건물 수, 시작(3막 제목 정류장이 끝나는 자리)과 끝(막 끝 2m 앞), 폭·옆 거리, 진입 카메라에서 보이는 높이 각(도),
 * 높이 한도(m), 주요 건물 비율과 진입 카메라에서의 최소 거리(m), 층이 좁아지는 비율, 도로 아래 몸통(m)
 */
const CITY = {
  count: 141,
  endMargin: 2,
  width: [6, 8],
  lateral: [95, 150],
  elevation: [2.5, 4.5],
  height: [10, 48],
  main: 0.15,
  mainView: 130,
  tierShrink: 0.72,
  below: 22,
  spireGap: 3,
} as const;

/**
 * 첨탑: 막 끝(마지막 도로 지점)에서 앞 along·옆 lateral(왼쪽 −), 높이, 바닥 반폭과 긴 축 배율, 기울기(m), 비틀림(rad), 고리 수,
 * 도로 아래 바닥(m), 색·켜짐 자리(막 시작에서 m, 3막이면 정류장 자리 s 200)
 */
const SPIRE = { along: 42, lateral: -142, height: 70, halfWidth: 11, stretch: 1.35, lean: 14, twist: 0.35, rings: 10, bottom: 50, light: 40 } as const;

/** 막 진입 주행 카메라(막 진입 정류장 가운데). 도시 높이와 빛나는 면을 이 카메라에 맞춘다 */
export function cityView(act: number, acts: readonly LandscapeAct[] = LANDSCAPE_ACTS): Vec3 {
  const range = rangeOf(actStopId(act, acts));
  return driveAt((range.start + range.end) / 2).camera.position;
}

/** 첨탑 바닥 가운데(도로 높이) */
export function spireBase(act: number, acts: readonly LandscapeAct[] = LANDSCAPE_ACTS): Vec3 {
  const { origin, right, forward } = flatFrame(actEnd(act, acts));
  return [
    origin[0] + forward[0] * SPIRE.along + right[0] * SPIRE.lateral,
    origin[1],
    origin[2] + forward[2] * SPIRE.along + right[2] * SPIRE.lateral,
  ];
}

/** 첨탑 꼭대기 */
export function spireTip(act: number, acts: readonly LandscapeAct[] = LANDSCAPE_ACTS): Vec3 {
  const base = spireBase(act, acts);
  return [base[0], base[1] + SPIRE.height, base[2]];
}

function buildCity(act: number, acts: readonly LandscapeAct[]): LandscapePiece {
  const random = rng(LANDSCAPE_SEED + 303);
  const writer = new PieceWriter();
  const start = actStart(act, acts);
  const from = appearFrom(act, acts);
  const view = cityView(act, acts);
  const spire = spireBase(act, acts);
  const sights = actSights(act);
  const cityStart = actTitleEnd(act, acts);
  const cityEnd = actEnd(act, acts) - CITY.endMargin;
  for (let n = 0; n < CITY.count; n++) {
    const s = cityStart + (cityEnd - cityStart) * random();
    const side = random() < 0.5 ? -1 : 1;
    const { origin, right, forward } = flatFrame(s);
    const width = CITY.width[0] + CITY.width[1] * random();
    const depth = CITY.width[0] + CITY.width[1] * random();
    let lateral = side * (CITY.lateral[0] + width / 2 + CITY.lateral[1] * Math.pow(random(), 0.7));
    lateral = pushOut(origin, right, side, lateral, RULES.push + width / 2);
    let base: Vec3 = [origin[0] + right[0] * lateral, origin[1], origin[2] + right[2] * lateral];
    const distance = Math.hypot(base[0] - view[0], base[2] - view[2]);
    // 진입 카메라에서 2.5~7°로 보이는 높이: 지평선 위 낮은 띠가 되고 첨탑(약 17°)이 확연히 높다
    const elevation = ((CITY.elevation[0] + CITY.elevation[1] * Math.pow(random(), 1.4)) * Math.PI) / 180;
    const height = Math.max(CITY.height[0], Math.min(CITY.height[1], view[1] + distance * Math.tan(elevation) - origin[1]));
    // 진입 카메라에서 첨탑을 가리는 건물은 두지 않는다
    const spireDistance = Math.hypot(spire[0] - view[0], spire[2] - view[2]);
    let gap = Math.abs(Math.atan2(spire[2] - view[2], spire[0] - view[0]) - Math.atan2(base[2] - view[2], base[0] - view[0]));
    if (gap > Math.PI) gap = 2 * Math.PI - gap;
    if (distance < spireDistance && gap < (CITY.spireGap * Math.PI) / 180 + Math.atan(Math.max(width, depth) / distance)) {
      writer.exclude("building", "spire", base);
      continue;
    }
    // 주요 건물(빛)은 진입 카메라에서 130m 밖만: 가까운 건물의 지붕선이 눈높이에서 선으로 떠 보이지 않게
    const main = random() < CITY.main && distance > CITY.mainView;
    const tiers = 1 + Math.floor(random() * 3);
    const yaw = (random() - 0.5) * 0.25;
    if (behindSight([base[0], base[1] + height / 2, base[2]], Math.max(width, depth), sights)) {
      writer.exclude("building", "hologram", base);
      continue;
    }
    random();
    // 도로 방향에 맞춘 축(약간 비틀어)
    const cos = Math.cos(yaw), sin = Math.sin(yaw);
    const ax: Vec3 = [right[0] * cos + forward[0] * sin, 0, right[2] * cos + forward[2] * sin];
    const az: Vec3 = [forward[0] * cos - right[0] * sin, 0, forward[2] * cos - right[2] * sin];
    // 모든 정점이 도로에서 RULES.push 밖이 되게 바닥 대각선의 절반만큼 더 민다(뽑기는 그대로)
    lateral = pushOut(origin, right, side, lateral, RULES.push + Math.hypot(width, depth) / 2);
    base = [origin[0] + right[0] * lateral, origin[1], origin[2] + right[2] * lateral];
    const footprint = [0, 1, 2, 3].flatMap((i): Vec3[] => {
      const sx = i === 0 || i === 3 ? -1 : 1;
      const sz = i < 2 ? -1 : 1;
      const x = base[0] + (ax[0] * sx * width) / 2 + (az[0] * sz * depth) / 2;
      const z = base[2] + (ax[2] * sx * width) / 2 + (az[2] * sz * depth) / 2;
      return [
        [x, origin[1] - CITY.below, z],
        [x, origin[1] + height, z],
      ];
    });
    const sight: Vec3 = [base[0], base[1] + height / 2, base[2]];
    const radius = Math.max(width, depth);
    // 민 자리에서 다시 본다: 도로 거리, 홀로그램 뒤 비우기(가운데·크기), 도로 끝 연장선(정점마다)
    const reason: ExclusionReason | null = !cleared(base, RULES.push + Math.hypot(width, depth) / 2)
      ? "clearance"
      : behindSight(sight, radius, sights)
        ? "hologram"
        : inCorridor(footprint)
          ? "corridor"
          : null;
    if (reason) {
      writer.exclude("building", reason, base);
      continue;
    }
    const layer = main ? 0 : Math.abs(lateral) > 110 ? 2 : 1;
    // 빛나는 세로 모서리는 진입 카메라를 향한 면의 모서리
    const cornerOffset = (i: number): [number, number] => {
      const sx = i === 0 || i === 3 ? -1 : 1;
      const sz = i < 2 ? -1 : 1;
      return [(ax[0] * sx * width) / 2 + (az[0] * sz * depth) / 2, (ax[2] * sx * width) / 2 + (az[2] * sz * depth) / 2];
    };
    let glowFace = 0;
    let glowDot = -Infinity;
    for (let face = 0; face < 4; face++) {
      const p0 = cornerOffset(face);
      const p1 = cornerOffset((face + 1) % 4);
      const facing = (p0[0] + p1[0]) * (view[0] - base[0]) + (p0[1] + p1[1]) * (view[2] - base[2]);
      if (facing > glowDot) {
        glowDot = facing;
        glowFace = face;
      }
    }
    const top = origin[1] + height;
    let tierBottom = origin[1] - CITY.below;
    let w = width;
    let d = depth;
    writer.begin("building", { point: sight, radius });
    for (let tier = 0; tier < tiers; tier++) {
      const tierTop = origin[1] + height * ((tier + 1) / tiers);
      const corner = (i: number, y: number): Vec3 => {
        const sx = i === 0 || i === 3 ? -1 : 1;
        const sz = i < 2 ? -1 : 1;
        return [base[0] + (ax[0] * sx * w) / 2 + (az[0] * sz * d) / 2, y, base[2] + (ax[2] * sx * w) / 2 + (az[2] * sz * d) / 2];
      };
      const values = (p: Vec3, ridge: number, ridge2: number): Values => ({
        aS: s,
        aActStart: start,
        aAppearFrom: from,
        aRidge: ridge,
        aRidge2: ridge2,
        aGlow: main ? 1 : 0,
        aBelow: Math.max(0, origin[1] - p[1]),
        aBelowTop: Math.max(0, top - p[1]),
        aLayer: layer,
        aEdge: 0,
        aDissolve: 1,
      });
      for (let face = 0; face < 4; face++) {
        const a = corner(face, tierBottom);
        const b = corner(face, tierTop);
        const c = corner((face + 1) % 4, tierTop);
        const e = corner((face + 1) % 4, tierBottom);
        const faceWidth = Math.hypot(c[0] - b[0], c[2] - b[2]);
        const lit = face === glowFace;
        const points: [Vec3, number][] = [
          [a, 0],
          [b, 0],
          [c, 1],
          [a, 0],
          [c, 1],
          [e, 1],
        ];
        // 지붕 빛은 맨 위 층만(아래 층 지붕선이 떠 보이지 않게)
        for (const [p, t] of points) writer.vertex(p, values(p, tier === tiers - 1 ? tierTop - p[1] : NO_LINE, lit ? t * faceWidth : NO_LINE));
      }
      const roof = [corner(0, tierTop), corner(1, tierTop), corner(2, tierTop), corner(3, tierTop)];
      for (const p of [roof[0], roof[1], roof[2], roof[0], roof[2], roof[3]]) writer.vertex(p, values(p, NO_LINE, NO_LINE));
      tierBottom = tierTop;
      w *= CITY.tierShrink;
      d *= CITY.tierShrink;
    }
    writer.end();
  }
  return writer.finish(`journey-landscape-act${act}`, act);
}

/** 비대칭 첨탑: 아래가 넓고 위로 가늘어지며 한쪽으로 기울고 조금 비틀린다. 진입 카메라를 향한 세로 모서리 하나와 꼭대기만 빛난다 */
function buildSpire(act: number, acts: readonly LandscapeAct[]): LandscapePiece {
  const writer = new PieceWriter();
  const { origin, right, forward } = flatFrame(actEnd(act, acts));
  const base = spireBase(act, acts);
  const view = cityView(act, acts);
  const bottom = origin[1] - SPIRE.bottom;
  const tipY = origin[1] + SPIRE.height;
  const ring = (k: number): Vec3[] => {
    const t = k / SPIRE.rings;
    const y = bottom + (tipY - bottom) * t;
    const h = Math.max(0, (y - origin[1]) / SPIRE.height);
    const half = SPIRE.halfWidth * Math.pow(1 - t, 0.85) + 0.01;
    const lean = SPIRE.lean * Math.pow(h, 1.6);
    const twist = SPIRE.twist * t;
    return Array.from({ length: 4 }, (_, i) => {
      const angle = twist + (i / 4) * Math.PI * 2 + Math.PI / 4;
      const stretch = i % 2 === 0 ? SPIRE.stretch : 0.8;
      const lx = Math.cos(angle) * half * stretch + lean;
      const lz = Math.sin(angle) * half;
      return [base[0] + right[0] * lx + forward[0] * lz, y, base[2] + right[2] * lx + forward[2] * lz] as Vec3;
    });
  };
  const middle = ring(SPIRE.rings / 2);
  let litFace = 0;
  let litDot = -Infinity;
  for (let i = 0; i < 4; i++) {
    const cx = (middle[i][0] + middle[(i + 1) % 4][0]) / 2 - base[0];
    const cz = (middle[i][2] + middle[(i + 1) % 4][2]) / 2 - base[2];
    const facing = cx * (view[0] - base[0]) + cz * (view[2] - base[2]);
    if (facing > litDot) {
      litDot = facing;
      litFace = i;
    }
  }
  const values = (p: Vec3, ridge2: number): Values => ({
    aS: actStart(act, acts) + SPIRE.light,
    aActStart: actStart(act, acts),
    aAppearFrom: appearFrom(act, acts),
    aRidge: tipY - p[1],
    aRidge2: ridge2,
    aGlow: 2,
    aBelow: Math.max(0, origin[1] - p[1]),
    aBelowTop: Math.max(0, tipY - p[1]),
    aLayer: -2.5,
    aEdge: 0,
    aDissolve: 1,
  });
  writer.begin("spire");
  for (let k = 0; k < SPIRE.rings; k++) {
    const lower = ring(k);
    const upper = ring(k + 1);
    for (let i = 0; i < 4; i++) {
      const a = lower[i], b = upper[i], c = upper[(i + 1) % 4], e = lower[(i + 1) % 4];
      const lit = i === litFace;
      const across = (p: Vec3, from: Vec3) => Math.hypot(p[0] - from[0], p[2] - from[2]);
      for (const [p, edge] of [[a, a], [b, b], [c, b], [a, a], [c, b], [e, a]] as [Vec3, Vec3][]) {
        writer.vertex(p, values(p, lit ? across(p, edge) : NO_LINE));
      }
    }
  }
  writer.end();
  return writer.finish("journey-landscape-spire", act);
}

/**
 * 막별 풍경 메시를 새로 만든다. 막 목록을 돌며 막 종류(kind)에 맞는 배치를 그 막 구간에 짓는다: cliffs는 절벽, rocks는 암석,
 * city는 도시와 첨탑. 지금 목록이면 넷(1막 절벽, 2막 암석, 3막 도시, 3막 첨탑)이다. 새 막은 LANDSCAPE_ACTS에 줄 하나를 더하면 된다
 */
export function buildLandscape(acts: readonly LandscapeAct[] = LANDSCAPE_ACTS): LandscapePiece[] {
  return acts.flatMap((entry) =>
    entry.kind === "cliffs"
      ? [buildCliffs(entry.act, acts)]
      : entry.kind === "rocks"
        ? [buildRocks(entry.act, acts)]
        : [buildCity(entry.act, acts), buildSpire(entry.act, acts)],
  );
}

let cache: LandscapePiece[] | null = null;

/** buildLandscape를 처음 한 번 만들고 같은 배열을 돌려준다(장면과 테스트가 같이 쓴다) */
export function landscapePieces(): readonly LandscapePiece[] {
  cache ??= buildLandscape();
  return cache;
}
