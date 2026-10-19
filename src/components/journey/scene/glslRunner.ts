/**
 * 테스트 전용: GLSL 함수 글자를 자바스크립트로 옮겨 실행한다(셰이더와 TypeScript가 같은 식인지 맞춰 본다).
 * #define은 상수로, 함수 선언은 function으로, 지역 변수는 let으로 바꾸고, GLSL 내장 함수(smoothstep·clamp·mix·max·dot·vec3)는
 * vec3(배열)에도 성분마다 적용되게 흉내 낸다. 사칙연산은 실수끼리만 된다(벡터 연산은 내장 함수로 쓴다). uniform은 넘긴 값이다.
 */

export type GlslValue = number | number[];

export function runGlsl(source: string, uniforms: Record<string, number[]>): Record<string, (...args: GlslValue[]) => GlslValue> {
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
    const max = each((a, b) => Math.max(a, b));
    const smoothstep = each((e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); });
    const dot = (a, b) => a.reduce((sum, value, i) => sum + value * b[i], 0);
    const vec3 = (...v) => (v.length === 1 ? [v[0], v[0], v[0]] : v);
  `;
  const factory = new Function(...Object.keys(uniforms), `${prelude}\n${body}\nreturn { ${functions.join(", ")} };`) as (
    ...values: number[][]
  ) => Record<string, (...args: GlslValue[]) => GlslValue>;
  return factory(...Object.values(uniforms));
}
