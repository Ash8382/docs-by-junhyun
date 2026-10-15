"use client";

import { Bloom, EffectComposer, SMAA, ToneMapping, Vignette } from "@react-three/postprocessing";

/**
 * postprocessing의 ToneMappingMode.NEUTRAL(Khronos PBR Neutral). 런타임 값은 8이다.
 * 함께 배포되는 타입 선언은 CINEON을 따로 세어 이 값을 9로 적고 있어, 열거형 대신 런타임 숫자를 넘긴다.
 * postprocessing은 직접 의존성이 아니라 import하지 않는다.
 */
const NEUTRAL_TONE_MAPPING = 8;

/**
 * 후처리(스펙 3절): 블룸(빛의 길, 경계선, 차 불빛), 톤 매핑, 약한 비네트, 안티에일리어싱(SMAA).
 * EffectComposer는 렌더러의 톤 매핑을 끄고 HDR 버퍼에 그리므로 톤 매핑을 효과로 직접 건다.
 * 블룸은 밝기 1을 넘는 빛(스스로 빛나는 선)에만 걸린다. 안티에일리어싱은 SMAA가 맡아 MSAA는 끈다.
 */
export function Effects() {
  return (
    <EffectComposer multisampling={0}>
      <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={0.2} intensity={0.9} />
      <ToneMapping mode={NEUTRAL_TONE_MAPPING} />
      <Vignette offset={0.25} darkness={0.55} />
      <SMAA />
    </EffectComposer>
  );
}
