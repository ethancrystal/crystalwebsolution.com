export const DEFAULT_MOTION_LAYOUT = 'animated';

export function shouldUseStaticMotionLayout({
  reducedMotion = false,
  flyingCarousel = false,
} = {}) {
  return reducedMotion && !flyingCarousel;
}
