import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { IN_MOTION_CARDS } from '../lib/inMotionCards.mjs';
import { CLIENT_TILE_IMAGES } from '../lib/clientTileImages.mjs';
import { readResolvedGlobalsCss } from './helpers/resolvedGlobalsCss.mjs';

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
const reviewCarouselSource = readFileSync(
  new URL('../components/ui/review-carousel.jsx', import.meta.url),
  'utf8',
);
const workMarqueeSource = readFileSync(
  new URL('../components/ui/work-marquee.jsx', import.meta.url),
  'utf8',
);

const globalCss = readResolvedGlobalsCss();

test('Stories uses review-specific language and a grouped client-proof CTA', () => {
  assert.match(storiesSource, /Client proof/);
  assert.match(storiesSource + reviewCarouselSource, /Read full review/);
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

test('Capabilities cards name the production services and link to What we make', () => {
  assert.deepEqual(IN_MOTION_CARDS.map((card) => card.title), [
    'EMBROIDERY DIGITIZING',
    'VECTOR ARTWORK',
    'EMBROIDERED PATCHES',
    'CHENILLE PATCHES',
    'PVC PATCHES',
    'WOVEN PATCHES',
    'LEATHER PATCHES',
    'STICKERS',
  ]);
  assert.equal(new Set(IN_MOTION_CARDS.map((card) => card.id)).size, IN_MOTION_CARDS.length);
  // Taglines stay short enough to clear the ghost card number.
  for (const card of IN_MOTION_CARDS) assert.ok(card.sub.length <= 24, `${card.id} tagline fits`);
  assert.doesNotMatch(labSource, /href="\/services"|href="#services"/);
  assert.match(labSource, /href="#make"/);
});

test('Capabilities stage and grid copies use distinct gradient ids', () => {
  assert.match(labSource, /im-grad-\$\{variant\}-\$\{card\.id\}/);
  assert.match(labSource, /<CardArt card=\{card\} index=\{index\} variant="stage" \/>/);
  assert.match(labSource, /<CardArt card=\{card\} index=\{index\} variant="grid" \/>/);
});

test('Motion marquee uses supplied public project images, not procedural art', () => {
  assert.match(motionSource, /CLIENT_TILE_IMAGES/);
  assert.ok(CLIENT_TILE_IMAGES.length >= 6);
  assert.doesNotMatch(motionSource, /paletteArt\(/);
});

test('Named Client registry provides unique authorized image sources', () => {
  assert.equal(new Set(CLIENT_TILE_IMAGES).size, CLIENT_TILE_IMAGES.length);
  assert.ok(CLIENT_TILE_IMAGES.every((imagePath) => imagePath.startsWith('/projects/clients/')));
});

test('Motion marquee offsets the supplied images across three rails so no row opens on the same tile', () => {
  assert.match(motionSource, /<WorkMarquee/);
  assert.match(workMarqueeSource, /rows = 3/);
  assert.match(workMarqueeSource, /offset/);
});

test('Stories keeps its shorter editorial stage; Lab keeps its full flight', () => {
  assert.match(globalCss, /\.review-carousel-frame\s*\{[\s\S]*?height:\s*clamp\(26rem,\s*60vh,\s*40rem\)/);
  assert.match(globalCss, /\.lab\s*\{[\s\S]*?height:\s*340svh/);
});
