"use client";

import { Bloom, EffectComposer, SMAA, ToneMapping, Vignette } from "@react-three/postprocessing";
import { useEffect, useRef, useState, type ComponentRef } from "react";
import { sceneQuality } from "@/lib/journey/capability";
import { recordPostprocessing, statsEnabled, type BloomProbe } from "./frameStats";

/**
 * postprocessing의 ToneMappingMode.NEUTRAL(Khronos PBR Neutral). 런타임 값은 8이다.
 * 함께 배포되는 타입 선언은 CINEON을 따로 세어 이 값을 9로 적고 있어, 열거형 대신 런타임 숫자를 넘긴다.
 * postprocessing은 직접 의존성이 아니라 import하지 않는다.
 */
const NEUTRAL_TONE_MAPPING = 8;

/**
 * 컴포저의 효과 패스에서 블룸을 찾는다(mipmap 블러 패스를 가진 효과). Bloom 래퍼에는 ref를 주지 않는다. 래퍼가 props를 JSON으로 바꿔
 * 효과를 다시 만들지 정하는데, ref에 효과(순환 구조)가 들어간 뒤 다시 렌더되면 실패한다.
 */
function findBloom(composer: { passes: object[] } | null): BloomProbe | null {
  for (const pass of composer?.passes ?? []) {
    for (const effect of (pass as { effects?: object[] }).effects ?? []) {
      if ("mipmapBlurPass" in effect && "luminancePass" in effect) return effect as BloomProbe;
    }
  }
  return null;
}

/**
 * 후처리(스펙 3절): 블룸(빛의 길, 경계선, 차 불빛), 톤 매핑, 약한 비네트, 안티에일리어싱(SMAA).
 * EffectComposer는 렌더러의 톤 매핑을 끄고 HDR 버퍼에 그리므로 톤 매핑을 효과로 직접 건다.
 * 블룸은 밝기 1을 넘는 빛(스스로 빛나는 선)에만 걸린다. 안티에일리어싱은 SMAA가 맡아 MSAA는 끈다.
 * ?debug=stats&bloom=off면 블룸 세기만 0으로 둔다(나머지 패스는 그대로). check:holograms가 두 장으로 홀로그램 화면에 블룸이 더한 몫을 잰다.
 * 3D 경량은 블룸의 휘도 패스를 절반 해상도로, mip 단계를 줄여 그린다(스펙 5절). ?debug=stats면 후처리를 통계에 넘겨 렌더 타깃 메모리를 잰다.
 */
export function Effects() {
  const [bloom] = useState(() => !(statsEnabled() && new URLSearchParams(window.location.search).get("bloom") === "off"));
  const [quality] = useState(() => sceneQuality().bloom);
  const composer = useRef<ComponentRef<typeof EffectComposer>>(null);

  useEffect(() => {
    const bloomEffect = findBloom(composer.current);
    if (bloomEffect) bloomEffect.luminancePass.resolution.scale = quality.luminanceScale;
    recordPostprocessing({ composer: composer.current, bloom: bloomEffect });
    return () => recordPostprocessing(null);
  }, [quality]);

  return (
    <EffectComposer ref={composer} multisampling={0}>
      <Bloom mipmapBlur levels={quality.levels} luminanceThreshold={1} luminanceSmoothing={0.2} intensity={bloom ? 0.9 : 0} />
      <ToneMapping mode={NEUTRAL_TONE_MAPPING} />
      <Vignette offset={0.25} darkness={0.55} />
      <SMAA />
    </EffectComposer>
  );
}
