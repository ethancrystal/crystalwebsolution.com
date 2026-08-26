import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { IN_MOTION_CARDS } from '../lib/inMotionCards.mjs';

const storiesSource = readFileSync(
  new URL('../components/sections/Stories.jsx', import.meta.url),
  'utf8',
);
const stageSource = readFileSync(
  new URL('../components/StoriesStage.jsx', import.meta.url),
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
  assert.match(stageSource, /Read full review/);
  assert.doesNotMatch(storiesSource, /VIEW ALL WORK/);
});

test('Stories stage respects reduced motion, disables autoplay under it, and cleans up its timer', () => {
  assert.match(stageSource, /useReducedMotion/);
  assert.match(stageSource, /if \(reduced \|\| paused \|\| slides\.length < 2\) return undefined;/);
  assert.match(stageSource, /window\.clearTimeout\(id\)/);
});

test('Lab keeps the eight procedural service cards (no bitmap project images)', () => {
  assert.equal(IN_MOTION_CARDS.length, 8);
  for (const card of IN_MOTION_CARDS) {
    assert.equal(card.image, undefined);
    assert.ok(card.shapes.length > 0, `${card.id} should keep procedural shapes`);
  }
  assert.match(labSource, /All services/);
  assert.doesNotMatch(labSource, /\/projects\//);
});

test('Motion stream uses supplied public project images in its zooming tiles', () => {
  const imageRefs = motionSource.match(/src: ['\"]\/projects\/[^'\"]+['\"]/g) || [];
  assert.ok(imageRefs.length >= 6);
  assert.doesNotMatch(motionSource, /paletteArt\(/);
});

test('Stories keeps a fixed-height stage; Lab keeps its full flight', () => {
  assert.match(globalCss, /\.stories-stage\s*\{[\s\S]*?height:\s*clamp\(26rem,\s*60vh,\s*40rem\)/);
  assert.match(globalCss, /\.lab\s*\{[\s\S]*?height:\s*340svh/);
});
