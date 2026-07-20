function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

// A beat remains active through the camera's approach and departure, then
// becomes eligible to idle once the camera is closer to another section.
export function getBeatActivityWindow({
  beatId,
  beatIds,
  beatProgress,
  overscan = 0.025,
}) {
  const index = beatIds.indexOf(beatId);
  if (index === -1) return null;

  const current = finiteProgress(beatProgress[beatId], index / Math.max(1, beatIds.length - 1));
  const previous = index === 0
    ? 0
    : finiteProgress(beatProgress[beatIds[index - 1]], current);
  const next = index === beatIds.length - 1
    ? 1
    : finiteProgress(beatProgress[beatIds[index + 1]], current);

  return {
    start: index === 0 ? 0 : clamp01((previous + current) * 0.5 - overscan),
    end: index === beatIds.length - 1 ? 1 : clamp01((current + next) * 0.5 + overscan),
  };
}

function finiteProgress(value, fallback) {
  return Number.isFinite(value) ? clamp01(value) : fallback;
}

export function isBeatActive(options) {
  const window = getBeatActivityWindow(options);
  if (!window) return false;
  const progress = finiteProgress(options.progress, 0);
  return progress >= window.start && progress <= window.end;
}

// Positional hot-path variant for useFrame callers. It performs the same
// calculation without creating an options object or activity-window object.
export function isBeatProgressActive(
  progress,
  beatId,
  beatIds,
  beatProgress,
  overscan = 0.025,
) {
  const index = beatIds.indexOf(beatId);
  if (index === -1) return false;

  const current = finiteProgress(beatProgress[beatId], index / Math.max(1, beatIds.length - 1));
  const previous = index === 0
    ? 0
    : finiteProgress(beatProgress[beatIds[index - 1]], current);
  const next = index === beatIds.length - 1
    ? 1
    : finiteProgress(beatProgress[beatIds[index + 1]], current);
  const start = index === 0 ? 0 : clamp01((previous + current) * 0.5 - overscan);
  const end = index === beatIds.length - 1 ? 1 : clamp01((current + next) * 0.5 + overscan);
  const value = finiteProgress(progress, 0);
  return value >= start && value <= end;
}
