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
