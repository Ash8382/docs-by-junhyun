import { describe, expect, it } from "vitest";
import { glow, trailColor, trailMix } from "@/lib/journey/trail";
import { runGlsl } from "./glslRunner";
import { TRAIL_GLSL, trailUniforms } from "./trailShader";

/** 궤적 색 uniform의 값(선형 RGB) */
function trailUniformValues(): Record<string, number[]> {
  return Object.fromEntries(Object.entries(trailUniforms()).map(([name, uniform]) => [name, [uniform.value.r, uniform.value.g, uniform.value.b]]));
}

const glsl = runGlsl(TRAIL_GLSL, trailUniformValues());

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
