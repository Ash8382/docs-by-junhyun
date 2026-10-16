import { describe, expect, it } from "vitest";
import { ShaderLib, type WebGLProgramParametersWithUniforms, type WebGLRenderer } from "three";
import { REVEAL_EDGE } from "@/lib/journey/trail";
import { createRoadMaterial, roadUniforms } from "./roadMaterial";

/** three가 프로그램을 만들 때 onBeforeCompile에 넘기는 값을 표준 재질 셰이더로 흉내 낸다 */
function compile(): WebGLProgramParametersWithUniforms {
  const shader = {
    vertexShader: ShaderLib.standard.vertexShader,
    fragmentShader: ShaderLib.standard.fragmentShader,
    uniforms: {},
  } as unknown as WebGLProgramParametersWithUniforms;
  createRoadMaterial().onBeforeCompile(shader, {} as WebGLRenderer);
  return shader;
}

describe("도로 재질", () => {
  it("three 표준 셰이더의 주입 지점을 모두 찾아 도로 계산을 넣는다", () => {
    const shader = compile();
    expect(shader.vertexShader).toContain("attribute vec4 journeyRoad;");
    expect(shader.vertexShader).toContain("vJourneyRoad = journeyRoad;");
    for (const piece of [
      "float journeyNoise( vec3 x )",
      "vec3 journeyTrailColor( float s )",
      "float journeyGlow( float s, float carS, float ending )",
      "if ( journeyEdge > 0.0 ) discard;",
      "totalEmissiveRadiance += journeyRadiance;",
    ]) {
      expect(shader.fragmentShader).toContain(piece);
    }
  });

  it("경계 노이즈는 도로 좌표(s, 옆 거리)와 시간으로 계산한다(월드 좌표를 쓰지 않는다)", () => {
    const fragment = compile().fragmentShader;
    expect(fragment).toContain(
      "journeyNoise( vec3( journeyS * EDGE_NOISE_SCALE, journeyLateral * EDGE_NOISE_SCALE, uJourneyTime * EDGE_NOISE_SPEED ) )",
    );
    expect(fragment).toContain(`#define EDGE_AMPLITUDE ${REVEAL_EDGE.amplitude}`);
  });

  it("도함수(fwidth)는 discard보다 먼저 구한다", () => {
    const fragment = compile().fragmentShader;
    const discardAt = fragment.indexOf("discard;");
    for (const name of ["journeyEdgePixel", "journeyLateralPixel", "journeySPixel"]) {
      expect(fragment.indexOf(`float ${name} = fwidth(`), name).toBeGreaterThan(0);
      expect(fragment.indexOf(`float ${name} = fwidth(`), name).toBeLessThan(discardAt);
    }
  });

  it("진행에 따라 바뀌는 값은 모든 도로 재질이 같은 uniform 객체를 본다", () => {
    const a = compile();
    const b = compile();
    for (const name of ["uJourneyTime", "uRevealS", "uCarS", "uEnding"] as const) {
      expect(a.uniforms[name]).toBe(roadUniforms[name]);
      expect(b.uniforms[name]).toBe(roadUniforms[name]);
    }
  });

  it("셰이더 프로그램 키가 고정이다(번들 경계 e2e의 표지)", () => {
    expect(createRoadMaterial().customProgramCacheKey()).toBe("journey-road");
  });
});
