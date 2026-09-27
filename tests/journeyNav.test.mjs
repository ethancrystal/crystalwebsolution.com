import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { BEAT_IDS } from '../lib/beatProgress.js';
import { JOURNEY_NAV } from '../lib/journeyNav.mjs';

// Visual Phase 1b: plain-language section labels, a JourneyNav that makes
// them real links, and a hero that says what the studio does.
const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const stripComments = (source) => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

test('journey labels cover every beat, in order, in plain language', () => {
  assert.deepEqual(JOURNEY_NAV.map((item) => item.id), BEAT_IDS);
  for (const item of JOURNEY_NAV) {
    assert.ok(item.label && item.label !== item.id, `${item.id} has a human label`);
  }
  const labels = Object.fromEntries(JOURNEY_NAV.map((item) => [item.id, item.label]));
  assert.equal(labels.hero, 'Intro');
  assert.equal(labels.approach, 'How we work');
  assert.equal(labels.lab, 'Capabilities');
  assert.equal(labels.motion, 'Selected work');
  assert.ok(Object.isFrozen(JOURNEY_NAV) && Object.isFrozen(JOURNEY_NAV[0]));
});

test('every journey anchor points at a section id that is actually rendered', () => {
  const sections = [
    'Hero', 'About', 'Services', 'Approach', 'Stories', 'Mark', 'Lab', 'Motion', 'Contact',
  ].map((name) => read(`../components/sections/${name}.jsx`)).join('\n');
  for (const id of BEAT_IDS) {
    assert.match(sections, new RegExp(`id="${id}"`), `#${id} exists`);
  }
});

test('JourneyNav is a labelled nav of anchors with a location marker', () => {
  const source = stripComments(read('../components/JourneyNav.jsx'));
  assert.match(source, /<nav[^>]*aria-label="Page sections"/);
  assert.match(source, /href=\{`#\$\{item\.id\}`\}/);
  assert.match(source, /setAttribute\('aria-current', 'location'\)/);
  assert.match(source, /aria-expanded=\{open\}/);
  assert.match(source, /aria-controls=\{listId\}/);
  // Per-frame work rides the shared ticker, not React state or its own rAF.
  assert.match(source, /gsap\.ticker\.add\(tick\)/);
  assert.match(source, /gsap\.ticker\.remove\(tick\)/);
  assert.doesNotMatch(source, /requestAnimationFrame|scrollTo\(/);
});

test('journey-nav.css is loaded and respects reduced motion and forced colors', () => {
  assert.match(read('../app/globals.css'), /@import '\.\/styles\/journey-nav\.css';/);
  const css = read('../app/styles/journey-nav.css');
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /@media \(forced-colors: active\)/);
  // Every plate is near-opaque, so the numerals keep AA contrast over Lab's
  // light ground (at 0.72 they measured 3.57:1).
  for (const [, alpha] of css.matchAll(/background: rgba\(4, 6, 12, ([\d.]+)\)/g)) {
    assert.ok(Number(alpha) >= 0.9, `plate alpha ${alpha}`);
  }
  // Phone targets stay at least 44px tall.
  assert.match(css, /\.journey-nav-toggle \{[^}]*min-height: 2\.75rem/);
});

test('the hero says what the studio does and offers a second path', () => {
  const hero = stripComments(read('../components/sections/Hero.jsx'));
  assert.match(hero, /className="hero-kicker"/);
  assert.match(hero, /Websites · Branding · Motion · Marketing · AI automation/);
  assert.ok(hero.indexOf('hero-kicker') < hero.indexOf('<h1'), 'descriptor sits above the headline');
  // Exactly one h1, still the two-line headline.
  assert.equal((hero.match(/<h1\b/g) || []).length, 1);
  assert.match(hero, /href="\/#contact"[\s\S]*?Start a project/);
  assert.match(hero, /href="\/#motion"[\s\S]*?See selected work/);
  // Both CTAs stop the click reaching the hero's blast handler.
  assert.equal((hero.match(/onClick=\{\(e\) => e\.stopPropagation\(\)\}/g) || []).length, 2);
});
