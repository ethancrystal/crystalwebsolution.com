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
const imageMarqueeSource = readFileSync(
  new URL('../components/ui/image-marquee-rows.jsx', import.meta.url),
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

test('Motion stream uses supplied public project images in its marquee tiles', () => {
  const imageRefs = motionSource.match(/src: ['\"]\/projects\/[^'\"]+['\"]/g) || [];
  assert.ok(imageRefs.length >= 6);
  assert.doesNotMatch(motionSource, /paletteArt\(/);
});

test('Motion corridor is a decorative, non-overlapping marquee that never scrolls the accessible list', () => {
  assert.match(motionSource, /<ImageMarqueeRows\s+images=\{STREAM_IMAGES\}/);
  // The list must be a sibling of the marquee, not a child rendered inside
  // it as overlay content — otherwise the corridor could sit behind/under it.
  assert.match(motionSource, /<\/ul>[\s\S]*<ImageMarqueeRows/);
  assert.doesNotMatch(motionSource, /motion-stream-overlay/);
});

test('Marquee rows are aria-hidden decoration and vary each row instead of repeating the same order', () => {
  assert.match(imageMarqueeSource, /aria-hidden=["']true["']/);
  assert.match(imageMarqueeSource, /rotate\(/);
  assert.match(imageMarqueeSource, /\.reverse\(\)/);
  // Each row's sequence is duplicated exactly once, only to make the -50%
  // translate loop seamless — not to pad out a thin image set.
  assert.match(imageMarqueeSource, /\[\.\.\.sequence, \.\.\.sequence\]/);
});

test('Stories keeps its shorter editorial stage; Lab keeps its full flight', () => {
  assert.match(globalCss, /\.stories-carousel\s*\{[\s\S]*?height:\s*clamp\(26rem,\s*60vh,\s*40rem\)/);
  assert.match(globalCss, /\.lab\s*\{[\s\S]*?height:\s*340svh/);
});
