export const DEFAULT_MOTION_LAYOUT = 'animated';

export function shouldUseStaticMotionLayout({
  flyingCarousel = false,
} = {}) {
  return !flyingCarousel;
}

function padRailValue(value) {
  return String(value).padStart(2, '0');
}

export function getMotionRailState({ index = 0, count = 0 } = {}) {
  const safeCount = Math.max(0, Math.floor(Number.isFinite(count) ? count : 0));
  const safeIndex = safeCount === 0
    ? 0
    : Math.min(safeCount - 1, Math.max(0, Math.floor(Number.isFinite(index) ? index : 0)));
  const indexLabel = padRailValue(safeCount === 0 ? 0 : safeIndex + 1);
  const countLabel = padRailValue(safeCount);

  return {
    index: safeIndex,
    count: safeCount,
    indexLabel,
    countLabel,
    progressLabel: `${indexLabel} / ${countLabel}`,
    isFirst: safeIndex === 0,
    isLast: safeCount === 0 || safeIndex === safeCount - 1,
  };
}
