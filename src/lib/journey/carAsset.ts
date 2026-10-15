/**
 * 차 모델 파일과 출처(스펙 3절 "차"). 모델은 scripts/build-car.ts가 public/journey/car/에 만든다.
 * 디코더는 CDN이 아니라 public/journey/decoders/에서 내보낸다. three를 import하지 않는다.
 */

export const CAR_URL = "/journey/car/CarConcept.gltf";
export const DRACO_PATH = "/journey/decoders/draco/";
export const BASIS_PATH = "/journey/decoders/basis/";

/** 불빛 재질의 이름(모델 안). 장면이 이 재질의 발광 색과 세기를 매 프레임 바꾼다 */
export const CAR_LIGHT_MATERIALS = { head: "Headlight", tail: "Brakelight" } as const;
/** 불빛 발광 세기(선형 HDR). 블룸이 걸리도록 1보다 크다 */
export const CAR_LIGHT_INTENSITY = { head: 9, tail: 6 } as const;

/**
 * 빛줄기가 시작하는 자리(차 기준, m): 옆(오른쪽 +), 노면에서 높이, 차 원점에서 앞(+)·뒤(−).
 * 테일라이트(BodyTaillights: 옆 ±0.64, 바닥에서 1.10~1.14, 뒤 1.53~1.62)는 뒤 데크 위에 있어, 거기서 바로 시작하면
 * 위에서 내려다보는 카메라에서 띠가 차 뒷면을 덮는다. 그래서 테일라이트 바로 아래, 차 뒷면 끝(뒤 1.94)에서 시작한다.
 */
export const TAILLIGHTS = [
  { lateral: -0.5, height: 1.0, forward: -1.95 },
  { lateral: 0.5, height: 1.0, forward: -1.95 },
] as const;

/** 엔딩 아래에 적는 출처. CC BY 4.0은 저작자·라이선스·수정 사실 표기를 요구한다 */
export const CAR_CREDIT = {
  title: "Car Concept",
  url: "https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/CarConcept",
  author: "Eric Chadwick, Darmstadt Graphics Group GmbH",
  license: "CC BY 4.0",
  licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
} as const;
