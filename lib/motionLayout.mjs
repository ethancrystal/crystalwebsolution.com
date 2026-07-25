export const DEFAULT_MOTION_LAYOUT = 'animated';

export function shouldUseStaticMotionLayout({
  flyingCarousel = false,
} = {}) {
  return !flyingCarousel;
}
