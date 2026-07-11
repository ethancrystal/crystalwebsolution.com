import {
  MOTION,
  REFERENCE_VIEWPORTS,
  CAPTURE_PROGRESS,
  cssDuration,
  clampProgress,
} from '../lib/v2/motion-tokens.js';

if (MOTION.easing.primary !== 'cubic-bezier(0.16, 1, 0.3, 1)') {
  throw new Error('Primary easing changed from the approved value.');
}

if (MOTION.easing.secondary !== 'cubic-bezier(0.22, 1, 0.36, 1)') {
  throw new Error('Secondary easing changed from the approved value.');
}

if (MOTION.duration.fastMin !== 0.4 || MOTION.duration.fastMax !== 0.6) {
  throw new Error('Fast interaction duration range is invalid.');
}

if (MOTION.duration.revealMin !== 0.8 || MOTION.duration.revealMax !== 1.2) {
  throw new Error('Reveal duration range is invalid.');
}

if (MOTION.stagger.lineMin !== 0.06 || MOTION.stagger.lineMax !== 0.1) {
  throw new Error('Line stagger range is invalid.');
}

const expectedViewports = [
  ['desktop-primary', 1440, 900],
  ['desktop-wide', 1920, 1080],
  ['tablet', 1024, 768],
  ['mobile-primary', 390, 844],
  ['mobile-small', 375, 667],
];

if (JSON.stringify(REFERENCE_VIEWPORTS.map(({ id, width, height }) => [id, width, height])) !== JSON.stringify(expectedViewports)) {
  throw new Error('Reference viewport set is invalid.');
}

if (JSON.stringify(CAPTURE_PROGRESS) !== JSON.stringify([0, 0.25, 0.5, 0.75, 1])) {
  throw new Error('Capture progress checkpoints are invalid.');
}

if (cssDuration(0.8) !== '0.8s') {
  throw new Error('cssDuration returned an invalid value.');
}

if (clampProgress(-1) !== 0 || clampProgress(2) !== 1 || clampProgress(0.5) !== 0.5) {
  throw new Error('clampProgress returned an invalid value.');
}

console.log('V2 motion token validation passed.');
