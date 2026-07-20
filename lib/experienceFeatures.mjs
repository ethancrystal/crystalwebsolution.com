export const COMPACT_QUERY = '(max-width: 767.5px)';

export function resolveExperienceFeatures({
  search = '',
  compact = false,
  reducedMotion = false,
  webgl = true,
} = {}) {
  const params = new URLSearchParams(search);
  const legacyAll =
    params.get('features') === 'legacy' ||
    params.get('latestFeatures') === 'off';
  const motionMode = params.get('motion');
  const forceFullMotion = motionMode === 'full';

  if (!webgl || legacyAll) {
    return { flyingCarousel: false };
  }

  const flyingCarousel =
    motionMode !== 'legacy' &&
    !compact &&
    (forceFullMotion || !reducedMotion);

  return { flyingCarousel };
}

export function readExperienceFeatures() {
  if (typeof window === 'undefined') {
    return { flyingCarousel: false };
  }

  return resolveExperienceFeatures({
    search: window.location.search,
    compact: window.matchMedia(COMPACT_QUERY).matches,
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    webgl: typeof window.WebGLRenderingContext !== 'undefined',
  });
}
