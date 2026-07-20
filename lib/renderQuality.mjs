export const RENDER_QUALITY = Object.freeze({
  high: Object.freeze({
    tier: 'high',
    animate: true,
    maxDpr: 1.35,
    particleCount: 650,
    postprocessing: 'full',
    carouselTextureWidth: 640,
    carouselBackdropWidth: 800,
  }),
  balanced: Object.freeze({
    tier: 'balanced',
    animate: true,
    maxDpr: 1.2,
    particleCount: 420,
    postprocessing: 'light',
    carouselTextureWidth: 512,
    carouselBackdropWidth: 640,
  }),
  eco: Object.freeze({
    tier: 'eco',
    animate: false,
    maxDpr: 1,
    particleCount: 240,
    postprocessing: 'off',
    carouselTextureWidth: 448,
    carouselBackdropWidth: 560,
  }),
});

function finiteOr(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

// Pure policy used by both the DOM feature gate and the R3F scene. The
// thresholds deliberately favor a stable frame budget over maximum density.
export function resolveRenderQuality({
  reducedMotion = false,
  compact = false,
  saveData = false,
  deviceMemory = 8,
  hardwareConcurrency = 8,
  devicePixelRatio = 1,
} = {}) {
  const memory = finiteOr(deviceMemory, 8);
  const cores = finiteOr(hardwareConcurrency, 8);
  const dpr = finiteOr(devicePixelRatio, 1);

  if (reducedMotion || saveData || memory <= 4 || cores <= 4) {
    return RENDER_QUALITY.eco;
  }

  if (compact || memory <= 6 || cores <= 6 || dpr >= 2) {
    return RENDER_QUALITY.balanced;
  }

  return RENDER_QUALITY.high;
}

export function readRenderQuality() {
  if (typeof window === 'undefined') return RENDER_QUALITY.balanced;

  const connection = typeof navigator !== 'undefined'
    ? navigator.connection || navigator.mozConnection || navigator.webkitConnection
    : null;

  return resolveRenderQuality({
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    compact: window.matchMedia('(max-width: 767.5px)').matches,
    saveData: Boolean(connection?.saveData),
    deviceMemory: navigator.deviceMemory,
    hardwareConcurrency: navigator.hardwareConcurrency,
    devicePixelRatio: window.devicePixelRatio,
  });
}
