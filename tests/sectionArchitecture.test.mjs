import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { BEAT_IDS, measureBeats } from '../lib/beatProgress.js';
import { CLUSTERS, LAB_WINDOW, MOTION_WINDOW, STOPS } from '../lib/journey.js';

const experienceSource = readFileSync(
  new URL('../components/Experience.jsx', import.meta.url),
  'utf8',
);
const sceneSource = readFileSync(
  new URL('../components/Scene.jsx', import.meta.url),
  'utf8',
);
const lightsSource = readFileSync(
  new URL('../components/three/Lights.jsx', import.meta.url),
  'utf8',
);
const aboutSource = readFileSync(
  new URL('../components/sections/About.jsx', import.meta.url),
  'utf8',
);
const markSource = readFileSync(
  new URL('../components/sections/Mark.jsx', import.meta.url),
  'utf8',
);
const revealSource = readFileSync(
  new URL('../components/SectionReveal.jsx', import.meta.url),
  'utf8',
);
const globalCss = readFileSync(
  new URL('../app/globals.css', import.meta.url),
  'utf8',
);

test('homepage keeps one selected-work beat and one merged trust beat', () => {
  assert.doesNotMatch(experienceSource, /Showcase/);
  assert.doesNotMatch(experienceSource, /<Facts\s*\/>/);
  assert.doesNotMatch(experienceSource, /<Recognition\s*\/>/);
  assert.doesNotMatch(sceneSource, /ShowcaseBoxes/);
  assert.doesNotMatch(sceneSource, /RecognitionRing/);
  assert.doesNotMatch(lightsSource, /CLUSTERS\.showcase/);
  assert.doesNotMatch(lightsSource, /CLUSTERS\.recognition/);
  assert.equal(BEAT_IDS.includes('work'), false);
  assert.deepEqual(BEAT_IDS, ['hero', 'about', 'services', 'approach', 'stories', 'mark', 'lab', 'motion', 'contact']);
  assert.equal(Object.hasOwn(CLUSTERS, 'showcase'), false);
  assert.equal(Object.hasOwn(CLUSTERS, 'facts'), false);
  assert.equal(Object.hasOwn(CLUSTERS, 'recognition'), false);
  assert.equal(STOPS.length, BEAT_IDS.length);
});

test('the flight windows end when their sticky stages finish travelling', () => {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const tops = new Map(BEAT_IDS.map((id, index) => [id, index * 1000]));

  globalThis.window = { scrollY: 0, innerHeight: 1000 };
  globalThis.document = {
    getElementById(id) {
      if (!tops.has(id)) return null;
      return {
        offsetHeight: id === 'motion' ? 2800 : 1000,
        getBoundingClientRect: () => ({ top: tops.get(id) }),
      };
    },
  };

  try {
    measureBeats(10000);
    assert.equal(LAB_WINDOW.start, 0.6);
    // The mocked lab section has no sticky overshoot (1000px tall in a
    // 1000px viewport), so its travel clamps to the 1px minimum.
    assert.ok(Math.abs(LAB_WINDOW.end - 0.6001) < 1e-9);
    assert.equal(MOTION_WINDOW.start, 0.7);
    assert.equal(MOTION_WINDOW.end, 0.88);
  } finally {
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
  }
});

test('section entrances begin on arrival and keep fixed-nav clearance', () => {
  assert.match(revealSource, /start = 'top 96%'/);
  assert.match(revealSource, /top < window\.innerHeight\) reveal\(\)/);
  assert.doesNotMatch(markSource, /top 68%/);
  assert.match(globalCss, /\.services-intro\s*\{[\s\S]*?top:\s*max\(7rem, 16vh\)/);
  assert.match(globalCss, /\.motion-heading\s*\{[\s\S]*?top:\s*clamp\(6\.5rem, 10vh, 8rem\)/);
});

test('about word field clears its kicker and fills the section', () => {
  assert.match(aboutSource, /text: 'WE', x: 58, y: 300/);
  assert.match(aboutSource, /text: 'REMEMBER\.', x: 914, y: 690/);
  assert.match(aboutSource, /start: 'top 100%'/);
  assert.match(aboutSource, /end: 'top 30%'/);
  assert.match(aboutSource, /scrub: 0\.35/);
  assert.match(globalCss, /\.about-smil-word\s*\{[\s\S]*?font-size:\s*84px/);
  assert.match(globalCss, /@media \(max-width: 767px\)[\s\S]*?\.about-smil-word\s*\{\s*font-size:\s*72px/);
});
