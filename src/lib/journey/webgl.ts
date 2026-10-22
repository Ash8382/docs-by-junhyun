let supported: boolean | null = null;

/** WebGL2를 쓸 수 있는가. 한 번만 확인하고, 확인용 컨텍스트는 바로 놓아준다. */
export function hasWebGL2(): boolean {
  if (supported === null) {
    try {
      const gl = document.createElement("canvas").getContext("webgl2");
      supported = gl !== null;
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch {
      supported = false;
    }
  }
  return supported;
}

let probe: { renderer: string; caveat: boolean } | null = null;

/**
 * 소프트웨어 렌더러인지 가를 브라우저 값(capability의 detectTier가 판정한다). renderer는 WebGL2 렌더러 이름(WEBGL_debug_renderer_info가
 * 없으면 RENDERER, WebGL2가 없으면 빈 글자), caveat는 "느린 소프트웨어 렌더러면 만들지 않는다"(failIfMajorPerformanceCaveat)로 만들지
 * 못했는지다. caveat는 GPU가 없어 소프트웨어로 떨어진 경우를 잡고, 소프트웨어를 일부러 고른 환경(헤드리스 셸 등)은 이름으로 잡는다.
 * 소프트웨어 GL은 장면이 준비된 직후 메인 스레드를 4초 안팎 붙잡았다(병합 뒤 End 키 흔들림 조사)
 */
export function webgl2Renderer(): { renderer: string; caveat: boolean } {
  if (probe === null) {
    probe = { renderer: "", caveat: false };
    if (hasWebGL2()) {
      try {
        const gl = document.createElement("canvas").getContext("webgl2");
        const info = gl?.getExtension("WEBGL_debug_renderer_info");
        probe.renderer = gl ? String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER)) : "";
        gl?.getExtension("WEBGL_lose_context")?.loseContext();
        const strict = document.createElement("canvas").getContext("webgl2", { failIfMajorPerformanceCaveat: true });
        probe.caveat = strict === null;
        strict?.getExtension("WEBGL_lose_context")?.loseContext();
      } catch {
        // 확인하지 못하면 소프트웨어로 보지 않는다(3D를 막지 않는다)
      }
    }
  }
  return probe;
}
