import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { IN_MOTION_CARDS } from '../lib/inMotionCards.mjs';

const storiesSource = readFileSync(
  new URL('../components/sections/Stories.jsx', import.meta.url),
  'utf8',
);
const labSource = readFileSync(
  new URL('../components/sections/Lab.jsx', import.meta.url),
  'utf8',
);
const motionSource = readFileSync(
  new URL('../components/sections/Motion.jsx', import.meta.url),
  'utf8',
);
const globalCss = readFileSync(
  new URL('../app/globals.css', import.meta.url),
  'utf8',
);

test('Stories uses review-specific language and a grouped client-proof CTA', () => {
  assert.match(storiesSource, /Client proof/);
  assert.match(storiesSource, /Read full review/);
  assert.doesNotMatch(storiesSource, /VIEW ALL WORK/);
});

test('Lab uses six approved project cards with uploaded image assets', () => {
  assert.equal(IN_MOTION_CARDS.length, 6);
  assert.deepEqual(
    IN_MOTION_CARDS.map((card) => card.image),
    [
      '/projects/cws-live-izanami.webp',
      '/projects/cws-live-oimachi.webp',
      '/projects/cws-live-ciao-energy.webp',
      '/projects/cws-live-inspiring.webp',
      '/projects/cws-innovation-studio.webp',
      '/projects/cws-izanami.webp',
    ],
  );
  assert.match(labSource, /View selected work/);
});

test('Motion stream uses supplied public project images in its zooming tiles', () => {
  const imageRefs = motionSource.match(/src: ['\"]\/projects\/[^'\"]+['\"]/g) || [];
  assert.ok(imageRefs.length >= 6);
  assert.doesNotMatch(motionSource, /paletteArt\(/);
});

test('Stories and Lab use shorter editorial stages', () => {
  assert.match(globalCss, /\.stories-carousel\s*\{[\s\S]*?height:\s*clamp\(26rem,\s*60vh,\s*40rem\)/);
  assert.match(globalCss, /\.lab\s*\{[\s\S]*?height:\s*210svh/);
});
