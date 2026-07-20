export function clampProgress(progress) {
  if (!Number.isFinite(progress)) return 0;
  return Math.min(1, Math.max(0, progress));
}

export function blastVector(origin, target, radius = 220) {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const distance = Math.hypot(dx, dy);
  if (!Number.isFinite(distance) || distance >= radius || radius <= 0) {
    return { active: false, x: 0, y: 0, strength: 0 };
  }

  const strength = 1 - distance / radius;
  const magnitude = 36 * strength;
  const length = Math.max(distance, 0.001);
  return {
    active: true,
    x: Math.round((dx / length) * magnitude * 100) / 100,
    y: Math.round((dy / length) * magnitude * 100) / 100,
    strength: Math.round(strength * 100) / 100,
  };
}

export function progressToSmilTime(progress, duration) {
  if (!Number.isFinite(duration) || duration <= 0) return 0;
  return clampProgress(progress) * duration;
}

export function workStageAt(progress) {
  const value = clampProgress(progress);
  if (value < 0.18) return 'building';
  if (value < 0.82) return 'rail';
  if (value < 0.94) return 'curtain';
  return 'services';
}

export function motionStageAt(progress) {
  const value = clampProgress(progress);
  if (value < 0.14) return 'hold';
  if (value < 0.5) return 'ribbon';
  if (value < 0.78) return 'detach';
  return 'grid';
}

export function seekSmilTimeline(svg, progress, duration) {
  if (!svg || typeof svg.setCurrentTime !== 'function') return false;
  svg.pauseAnimations?.();
  svg.setCurrentTime(progressToSmilTime(progress, duration));
  return true;
}
