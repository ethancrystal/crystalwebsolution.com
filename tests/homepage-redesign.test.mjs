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
const imageStreamSource = readFileSync(
  new URL('../components/ui/image-stream-hero.jsx', import.meta.url),
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

test('Motion corridor splits the six supplied images across two rails without repeats', () => {
  assert.match(motionSource, /cards=\{3\}/);
  assert.match(imageStreamSource, /images\.slice\(railIndex \* cards, \(railIndex \+ 1\) \* cards\)/);
  assert.doesNotMatch(imageStreamSource, /images\[i %/);
});

test('Stories keeps its shorter editorial stage; Lab keeps its full flight', () => {
  assert.match(globalCss, /\.stories-carousel\s*\{[\s\S]*?height:\s*clamp\(26rem,\s*60vh,\s*40rem\)/);
  assert.match(globalCss, /\.lab\s*\{[\s\S]*?height:\s*340svh/);
});
