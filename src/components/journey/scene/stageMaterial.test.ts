import { describe, expect, it } from "vitest";
import { DoubleSide, ShaderLib, type WebGLProgramParametersWithUniforms, type WebGLRenderer } from "three";
import { createStageMaterial, stageUniforms } from "./stageMaterial";

/** three가 프로그램을 만들 때 onBeforeCompile에 넘기는 값을 표준 재질 셰이더로 흉내 낸다 */
function compile(material: ReturnType<typeof createStageMaterial>): WebGLProgramParametersWithUniforms {
  const shader = {
    vertexShader: ShaderLib.standard.vertexShader,
    fragmentShader: ShaderLib.standard.fragmentShader,
    uniforms: {},
  } as unknown as WebGLProgramParametersWithUniforms;
  material.onBeforeCompile(shader, {} as WebGLRenderer);
  return shader;
}

describe("렌더 단계 재질", () => {
  it("three 표준 셰이더의 주입 지점을 모두 찾아 단계 계산을 넣는다", () => {
    const shader = compile(createStageMaterial({ color: "#ffffff", roughness: 0.5, metalness: 0 }));
    expect(shader.vertexShader).toContain("vJourneyWorld = ( modelMatrix * journeyWorld ).xyz;");
    for (const piece of [
      "#define STAGE_EDGE_0 19.0",
      "#define STAGE_EDGE_1 33.0",
      "diffuseColor.rgb = mix(",
      "roughnessFactor = mix(",
      "metalnessFactor = uFinalMetalness",
      "totalEmissiveRadiance += uWireLine",
      "radiance *= journeyClayToFinal;",
    ]) {
      expect(shader.fragmentShader).toContain(piece);
    }
    // 원래 chunk는 지우지 않고 그 뒤에 덧붙인다
    expect(shader.fragmentShader).toContain("#include <lights_fragment_maps>");
  });

  it("재질마다 완성 단계 값을 uniform으로 넘긴다", () => {
    const shader = compile(createStageMaterial({ color: "#ff0000", roughness: 0.3, metalness: 1, solidLine: true }));
    const uniforms = shader.uniforms as Record<string, { value: unknown }>;
    expect(uniforms.uFinalRoughness.value).toBe(0.3);
    expect(uniforms.uFinalMetalness.value).toBe(1);
    expect(uniforms.uSolidLine.value).toBe(1);
  });

  it("벽은 청사진 단계에서 선만 남기고 면을 비운다(hollowWire)", () => {
    const wall = compile(createStageMaterial({ color: "#ffffff", roughness: 1, metalness: 0, hollowWire: true }));
    const floor = compile(createStageMaterial({ color: "#ffffff", roughness: 1, metalness: 0 }));
    expect((wall.uniforms as Record<string, { value: unknown }>).uHollowWire.value).toBe(1);
    expect((floor.uniforms as Record<string, { value: unknown }>).uHollowWire.value).toBe(0);
    expect(wall.fragmentShader).toContain("if ( uHollowWire > 0.5 && journeyWireToClay < 0.5 && journeyLine < 0.08 ) discard;");
  });

  it("시간 uniform은 모든 재질이 같은 객체를 본다", () => {
    const a = compile(createStageMaterial({ color: "#ffffff", roughness: 1, metalness: 0 }));
    const b = compile(createStageMaterial({ color: "#000000", roughness: 1, metalness: 0 }));
    expect(a.uniforms.uJourneyTime).toBe(stageUniforms.uJourneyTime);
    expect(b.uniforms.uJourneyTime).toBe(stageUniforms.uJourneyTime);
  });

  it("모든 재질이 셰이더 프로그램 하나를 같이 쓴다", () => {
    const a = createStageMaterial({ color: "#ffffff", roughness: 1, metalness: 0 });
    const b = createStageMaterial({ color: "#000000", roughness: 0.2, metalness: 1, side: DoubleSide });
    expect(a.customProgramCacheKey()).toBe(b.customProgramCacheKey());
    expect(b.side).toBe(DoubleSide);
  });
});
