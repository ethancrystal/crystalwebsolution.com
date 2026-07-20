import { CAPTURE_PROGRESS, REFERENCE_VIEWPORTS, clampProgress } from './motion-tokens.js';

export const V2_SCENES = Object.freeze([
  'scene-00-loader',
  'scene-01-hero',
  'scene-02-statement',
  'scene-03-marquee',
  'scene-04-facts',
  'scene-05-selected-work',
  'scene-06-wipe',
  'scene-07-services-intro',
  'scene-08-services-carousel',
  'scene-09-motion-gallery',
  'scene-10-cta',
]);

export function progressLabel(progress) {
  return `p${String(Math.round(clampProgress(progress) * 100)).padStart(3, '0')}`;
}

export function captureId(viewportId, sceneId, progress) {
  if (!REFERENCE_VIEWPORTS.some((viewport) => viewport.id === viewportId)) {
    throw new Error(`Unknown viewport: ${viewportId}`);
  }

  if (!V2_SCENES.includes(sceneId)) {
    throw new Error(`Unknown scene: ${sceneId}`);
  }

  return `${viewportId}__${sceneId}__${progressLabel(progress)}`;
}

export function requiredCaptureIds() {
  return REFERENCE_VIEWPORTS.flatMap((viewport) =>
    V2_SCENES.flatMap((sceneId) =>
      CAPTURE_PROGRESS.map((progress) => captureId(viewport.id, sceneId, progress)),
    ),
  );
}

export function normalizedScrollY({ sectionTop, sectionHeight, viewportHeight, progress }) {
  const values = [sectionTop, sectionHeight, viewportHeight, progress];
  if (!values.every(Number.isFinite)) {
    throw new TypeError('normalizedScrollY expects finite numeric values.');
  }

  const travel = Math.max(0, sectionHeight - viewportHeight);
  return Math.round(sectionTop + travel * clampProgress(progress));
}
