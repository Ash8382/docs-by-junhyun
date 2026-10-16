import { describe, expect, it } from "vitest";
import { glow, trailColor, trailMix } from "@/lib/journey/trail";
import { TRAIL_GLSL, trailUniforms } from "./trailShader";

type Value = number | number[];

/**
 * TRAIL_GLSL을 자바스크립트로 옮겨 실행한다. #define은 상수로, 함수 선언은 function으로, 지역 변수는 let으로 바꾸고,
 * GLSL 내장 함수(smoothstep·clamp·mix)는 vec3(배열)에도 성분마다 적용되게 흉내 낸다. uniform은 trailUniforms의 값이다.
 */
function runGlsl(source: string): Record<string, (...args: number[]) => Value> {
  const uniforms = Object.fromEntries(
    Object.entries(trailUniforms()).map(([name, uniform]) => [name, [uniform.value.r, uniform.value.g, uniform.value.b]]),
  );
  const body = source
    .replace(/^#define (\w+) (.+)$/gm, "const $1 = $2;")
    .replace(/^uniform .+;$/gm, "")
    .replace(/^(?:float|vec3) (\w+)\(([^)]*)\) \{$/gm, (_, name: string, params: string) => {
      const names = params
        .split(",")
        .map((param) => param.trim().split(/\s+/)[1])
        .filter(Boolean);
      return `function ${name}(${names.join(", ")}) {`;
    })
    .replace(/^(\s+)(?:float|vec3) (\w+) =/gm, "$1let $2 =");
  const functions = [...source.matchAll(/^(?:float|vec3) (\w+)\(/gm)].map((match) => match[1]);
  const prelude = `
    const each = (f) => (...args) => {
      const size = args.find(Array.isArray)?.length;
      if (size === undefined) return f(...args);
      return Array.from({ length: size }, (_, i) => f(...args.map((a) => (Array.isArray(a) ? a[i] : a))));
    };
    const clamp = each((x, a, b) => Math.min(b, Math.max(a, x)));
    const mix = each((a, b, t) => a * (1 - t) + b * t);
    const smoothstep = each((e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); });
  `;
  const factory = new Function(
    ...Object.keys(uniforms),
    `${prelude}\n${body}\nreturn { ${functions.join(", ")} };`,
  ) as (...values: number[][]) => Record<string, (...args: number[]) => Value>;
  return factory(...Object.values(uniforms));
}

const glsl = runGlsl(TRAIL_GLSL);

describe("궤적 셰이더", () => {
  it("TypeScript와 같은 함수 셋을 정의한다", () => {
    expect(Object.keys(glsl).sort()).toEqual(["journeyGlow", "journeyTrailColor", "journeyTrailMix"]);
  });

  it("색 전환 정도가 TypeScript(trailMix)와 같다", () => {
    for (let s = -20; s <= 280; s += 0.7) expect(glsl.journeyTrailMix(s)).toBeCloseTo(trailMix(s), 12);
  });

  it("색이 TypeScript(trailColor)와 같다", () => {
    for (let s = -20; s <= 280; s += 0.7) {
      const shader = glsl.journeyTrailColor(s) as number[];
      const script = trailColor(s);
      for (let channel = 0; channel < 3; channel++) expect(shader[channel], `s=${s}`).toBeCloseTo(script[channel], 6);
    }
  });

  it("발광이 TypeScript(glow)와 같다", () => {
    for (const carS of [0, 37.5, 110, 220]) {
      for (const ending of [0, 0.4, 1]) {
        for (let s = -20; s <= 280; s += 1.3) {
          expect(glsl.journeyGlow(s, carS, ending), `s=${s} carS=${carS} ending=${ending}`).toBeCloseTo(glow(s, carS, ending), 12);
        }
      }
    }
  });
});
