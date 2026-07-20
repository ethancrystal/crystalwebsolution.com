export const MOTION = Object.freeze({
  easing: Object.freeze({
    primary: 'cubic-bezier(0.16, 1, 0.3, 1)',
    secondary: 'cubic-bezier(0.22, 1, 0.36, 1)',
  }),
  duration: Object.freeze({
    fastMin: 0.4,
    fastMax: 0.6,
    revealMin: 0.8,
    revealMax: 1.2,
  }),
  stagger: Object.freeze({
    lineMin: 0.06,
    lineMax: 0.1,
  }),
});

export const REFERENCE_VIEWPORTS = Object.freeze([
  Object.freeze({ id: 'desktop-primary', width: 1440, height: 900 }),
  Object.freeze({ id: 'desktop-wide', width: 1920, height: 1080 }),
  Object.freeze({ id: 'tablet', width: 1024, height: 768 }),
  Object.freeze({ id: 'mobile-primary', width: 390, height: 844 }),
  Object.freeze({ id: 'mobile-small', width: 375, height: 667 }),
]);

export const CAPTURE_PROGRESS = Object.freeze([0, 0.25, 0.5, 0.75, 1]);

export function cssDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    throw new TypeError('cssDuration expects a non-negative finite number.');
  }

  return `${seconds}s`;
}

export function clampProgress(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}
