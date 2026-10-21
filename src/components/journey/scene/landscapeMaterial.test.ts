import { DoubleSide } from "three";
import { describe, expect, it } from "vitest";
import { luminance } from "@/lib/journey/holograms";
import { ALWAYS, actStart, appearFrom, appearLevel, brightnessLevel, lightLevel, rimColor } from "@/lib/journey/landscape";
import { SCALAR_ATTRIBUTES } from "@/lib/journey/landscapeBuild";
import { trailColor } from "@/lib/journey/trail";
import { runGlsl } from "./glslRunner";
import { LANDSCAPE_GLSL, LANDSCAPE_SHADE, createLandscapeMaterial } from "./landscapeMaterial";
import { TRAIL_GLSL, trailUniforms } from "./trailShader";

const uniforms = Object.fromEntries(Object.entries(trailUniforms()).map(([name, uniform]) => [name, [uniform.value.r, uniform.value.g, uniform.value.b]]));
const glsl = runGlsl(`${TRAIL_GLSL}\n${LANDSCAPE_GLSL}`, uniforms);

describe("풍경 셰이더의 식", () => {
  it("등장 정도가 TypeScript(appearLevel)와 같다", () => {
    for (const from of [ALWAYS, appearFrom(3), 37.5]) {
      for (let carS = -20; carS <= 280; carS += 0.9) {
        expect(glsl.landscapeAppear(from, carS), `from=${from} carS=${carS}`).toBeCloseTo(appearLevel(from, carS), 12);
      }
    }
  });

  it("밝기가 TypeScript(brightnessLevel)와 같다", () => {
    for (const act of [1, 2, 3]) {
      for (let carS = -20; carS <= 280; carS += 0.9) {
        expect(glsl.landscapeBrightness(actStart(act), carS), `act=${act} carS=${carS}`).toBeCloseTo(brightnessLevel(actStart(act), carS), 12);
      }
    }
  });

  it("빛 켜짐이 TypeScript(lightLevel)와 같다", () => {
    for (const act of [1, 2, 3]) {
      for (const revealS of [0, 60, 95, 158, 175, 260]) {
        for (let s = -12; s <= 260; s += 1.3) {
          expect(glsl.landscapeLight(s, actStart(act), revealS), `act=${act} s=${s} revealS=${revealS}`).toBeCloseTo(lightLevel(s, actStart(act), revealS), 12);
        }
      }
    }
  });

  it("빛의 색이 TypeScript(rimColor)와 같고 휘도가 0.35다", () => {
    for (let s = -12; s <= 260; s += 1.7) {
      const trail = trailColor(s);
      const scale = glsl.landscapeRim(luminance(trail)) as number;
      const script = rimColor(s);
      for (let channel = 0; channel < 3; channel++) expect(trail[channel] * scale, `s=${s}`).toBeCloseTo(script[channel], 12);
      expect(luminance(trail) * scale).toBeCloseTo(0.35, 12);
    }
  });

  it("길 양쪽의 면 감김이 반대여도 보이는 면은 같은 명암을 받는다(뒷면이 보이면 법선을 뒤집는다)", () => {
    const key = [...LANDSCAPE_SHADE.key];
    for (let i = 0; i < 64; i++) {
      const y = 1 - (2 * (i + 0.5)) / 64;
      const r = Math.sqrt(1 - y * y);
      const normal = [r * Math.cos(i * 2.4), y, r * Math.sin(i * 2.4)];
      // 같은 면을 반대 감김으로 만들면 면 법선도, 카메라에서 본 앞뒷면도 뒤집힌다
      const flipped = normal.map((value) => -value);
      expect(glsl.landscapeUp(flipped, -1), `i=${i}`).toBeCloseTo(glsl.landscapeUp(normal, 1) as number, 12);
      expect(glsl.landscapeDiffuse(flipped, key, -1), `i=${i}`).toBeCloseTo(glsl.landscapeDiffuse(normal, key, 1) as number, 12);
    }
    // 감김이 반대인 윗면(법선이 아래, 뒷면으로 보임)도 위에서 오는 빛을 받는다
    expect(glsl.landscapeUp([0, -1, 0], -1)).toBe(1);
  });
});

describe("풍경 재질", () => {
  const material = createLandscapeMaterial();

  it("투명·양면이고 장면 안개 대신 풍경 전용 안개를 쓴다", () => {
    expect(material.transparent).toBe(true);
    expect(material.side).toBe(DoubleSide);
    expect(material.fog).toBe(false);
  });

  it("매 프레임 바뀌는 uniform 셋과 궤적 색 uniform이 있다", () => {
    for (const name of ["uRevealS", "uCarS", "uEnding", "uKey", "uTrailStart", "uTrailMiddle", "uTrailEnd"]) {
      expect(material.uniforms[name], name).toBeDefined();
    }
  });

  it("배치의 정점 속성을 모두 받는다", () => {
    for (const name of SCALAR_ATTRIBUTES) expect(material.vertexShader).toContain(`attribute float ${name};`);
    expect(material.vertexShader).toContain("attribute vec3 aRimNormal;");
  });

  it("양면을 그리므로 명암에 앞뒷면(gl_FrontFacing)을 넣는다", () => {
    expect(material.fragmentShader).toContain("float facing = gl_FrontFacing ? 1.0 : -1.0;");
    expect(material.fragmentShader).toContain("landscapeUp( vNormalW, facing )");
    expect(material.fragmentShader).toContain("landscapeDiffuse( normalize( vNormalW ), uKey, facing )");
  });
});
