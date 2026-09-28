// Can this browser create a WebGL context at all? Probed once, before the
// fixed <Canvas> mounts, so a disabled/blocked GPU leaves the DOM experience
// (and its CSS backdrop) running instead of throwing from the renderer.
let cached;

export function canUseWebGL(doc = typeof document === 'undefined' ? null : document) {
  if (cached !== undefined) return cached;
  if (!doc) return false;

  try {
    const canvas = doc.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    cached = Boolean(gl);
    // Release the probe context immediately; browsers cap live contexts.
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    cached = false;
  }
  return cached;
}

// Test hook only.
export function resetWebGLProbe() {
  cached = undefined;
}
