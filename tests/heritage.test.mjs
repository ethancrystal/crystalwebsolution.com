import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';

import { BEAT_IDS } from '../lib/beatProgress.js';
import {
  CRYSTAL_DIGITIZING_URL,
  HERITAGE_NAV,
  OFFER,
  PROCESS_STEPS,
  STUDIO_CAPABILITIES,
  WORKBENCH,
} from '../lib/heritage.mjs';

// The embroidery-first homepage opening (components/heritage/*, Hero.jsx,
// lib/heritage.mjs). These pin the claims it makes and the repo rules it must
// keep: one animation clock, no unfinished placeholder copy, no third-party
// work presented as ours, every anchor landing on a rendered section.

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const stripComments = (source) => source
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
  .replace(/^\s*\/\/.*$/gm, '');

const HERITAGE_DIR = new URL('../components/heritage/', import.meta.url);
const heritageFiles = readdirSync(HERITAGE_DIR).filter((name) => name.endsWith('.jsx'));
const sources = Object.fromEntries([
  ...heritageFiles.map((name) => [`components/heritage/${name}`, read(`components/heritage/${name}`)]),
  ['components/sections/Hero.jsx', read('components/sections/Hero.jsx')],
]);
// Comments legitimately mention placeholders, third-party sites and so on; only
// code and rendered copy are asserted on.
const allSource = [...Object.values(sources), read('lib/heritage.mjs')].map(stripComments).join('\n');

test('the homepage opens on the production story, then the studio bridge, then the digital beats', () => {
  const experience = stripComments(read('components/Experience.jsx'));
  const world = experience.indexOf('<HeritageWorld />');
  const bridge = experience.indexOf('<StudioBridge />');
  const about = experience.indexOf('<About />');
  assert.ok(world > -1 && bridge > world && about > bridge, 'HeritageWorld, StudioBridge, About in that order');
  assert.doesNotMatch(experience, /<Hero\s*\/>/, 'Hero now lives inside HeritageWorld');
  // The story is not a camera beat: the beat list and camera stops are unchanged.
  assert.deepEqual(BEAT_IDS, ['hero', 'about', 'services', 'approach', 'stories', 'mark', 'lab', 'motion', 'contact']);
});

test('the production story keeps the design order', () => {
  const world = stripComments(sources['components/heritage/HeritageWorld.jsx']);
  const order = ['<Hero />', '<Heritage />', '<Make />', '<Process />', '<Quality />', '<Machinery />', '<Workbench />', '<Offer />'];
  let at = -1;
  for (const tag of order) {
    const next = world.indexOf(tag);
    assert.ok(next > at, `${tag} follows the previous section`);
    at = next;
  }
});

test('the homepage menu leads with Crystal Digitizing and every anchor lands on a rendered section', () => {
  assert.equal(HERITAGE_NAV[0].label, 'Crystal Digitizing');
  assert.equal(HERITAGE_NAV[0].external, true);
  assert.equal(HERITAGE_NAV[0].href, CRYSTAL_DIGITIZING_URL);
  assert.deepEqual(
    HERITAGE_NAV.map((item) => item.label),
    ['Crystal Digitizing', 'What We Make', 'The Process', 'Work', 'Digital Studio', 'About', 'Contact'],
  );

  const rendered = new Set(
    [...allSource.matchAll(/\bid="([a-z-]+)"/g)].map((match) => match[1])
      .concat(['contact']), // Contact.jsx, the existing closing beat
  );
  const linked = [...allSource.matchAll(/["'`]\/#([a-z-]+)["'`]/g)].map((match) => match[1]);
  assert.ok(linked.length > 5, 'the story links within the page');
  for (const id of linked) assert.ok(rendered.has(id), `#${id} is rendered`);
  assert.ok(read('components/sections/Contact.jsx').includes('id="contact"'));
});

test('Nav hands the homepage menu its own list and subpages keep the site nav', () => {
  assert.match(read('components/Nav.jsx'), /<Menu[^>]*links=\{HERITAGE_NAV\}/);
  assert.doesNotMatch(read('components/marketing/SubpageNav.jsx'), /HERITAGE_NAV/);
  assert.match(read('components/Menu.jsx'), /links = SITE\.nav/);
});

test('the homepage menu keeps its links to the site pages (blog, process, about, contact)', () => {
  // The production-first list is all in-page hashes plus one external link, so
  // the full site nav rides along as a "Site pages" column. Without it the
  // homepage would stop linking to /blog, /process and /about at all.
  assert.match(read('components/Nav.jsx'), /<Menu[^>]*pageLinks=\{SITE\.nav\}/);
  const menu = stripComments(read('components/Menu.jsx'));
  assert.match(menu, /pageLinks = null/);
  assert.match(menu, /Site pages/);
  assert.match(menu, /pageLinks\.map/);
  assert.doesNotMatch(read('components/marketing/SubpageNav.jsx'), /pageLinks/);
});

test('no unfinished placeholder copy ships', () => {
  assert.doesNotMatch(allSource, /\[\s*(add|model|to confirm|todo)/i);
  assert.doesNotMatch(allSource, /to confirm|lorem|placeholder|TODO/i);
  assert.equal(PROCESS_STEPS.length, 8);
});

test('the patch offer states only the confirmed details', () => {
  assert.equal(OFFER.price, '5');
  assert.deepEqual(OFFER.rows, [
    { term: 'Materials', detail: 'Embroidered, woven, PVC, leather, chenille, printed' },
    { term: 'Minimum order', detail: 'None' },
    { term: 'Digitizing', detail: 'Free' },
    { term: 'Mockup before production', detail: 'Free' },
  ]);
});

test('every heritage image exists, and nothing in public/heritage is unused', () => {
  const referenced = new Set([...allSource.matchAll(/\/heritage\/([a-z0-9-]+\.webp)/g)].map((match) => match[1]));
  assert.ok(referenced.size >= 20);
  for (const file of referenced) {
    assert.ok(existsSync(new URL(`../public/heritage/${file}`, import.meta.url)), `${file} exists`);
  }
  for (const file of readdirSync(new URL('../public/heritage/', import.meta.url))) {
    assert.ok(referenced.has(file), `${file} is referenced`);
  }
  assert.equal(WORKBENCH.length, 8);
});

test('the digital studio bridge shows no screenshots of other people\'s sites', () => {
  const bridge = stripComments(sources['components/heritage/StudioBridge.jsx']);
  assert.doesNotMatch(bridge, /<img\b/);
  assert.doesNotMatch(allSource, /cws-live-|\/projects\/clients\//);
  assert.deepEqual([...STUDIO_CAPABILITIES], [
    'Websites', 'Brand systems', 'Automation', 'Product presentation', 'Customer workflows',
  ]);
});

test('the compare slider is not presented as a sew-out pair it does not show', () => {
  const quality = stripComments(sources['components/heritage/Quality.jsx']);
  assert.match(quality, /artwork-original\.webp/);
  assert.match(quality, /artwork-corrected\.webp/);
  assert.doesNotMatch(quality, /sewout-|SEW-OUT → /);
});

test('the thread rides the shared clock and measures with the offset chain', () => {
  const thread = stripComments(sources['components/heritage/ThreadRail.jsx']);
  assert.match(thread, /gsap\.ticker\.add\(tick\)/);
  assert.match(thread, /gsap\.ticker\.remove\(tick\)/);
  assert.doesNotMatch(thread, /requestAnimationFrame/);
  assert.doesNotMatch(thread, /getBoundingClientRect/);
  assert.match(thread, /sectionTop\(world\)/);
  assert.match(thread, /prefers-reduced-motion: reduce/);
  assert.match(thread, /min-width: 900px/);
  // Teardown for everything the effect set up.
  assert.match(thread, /observer\.disconnect\(\)/);
  assert.match(thread, /clearTimeout\(measureTimer\)/);
  assert.match(thread, /removeEventListener\('change', schedule\)/);
  assert.match(thread, /trigger\.kill\(\)/);
});

test('the thread repaints after Lenis moves the page, and is sized to the box it fills', () => {
  const thread = stripComments(sources['components/heritage/ThreadRail.jsx']);
  // The ticker alone would run before Lenis's (child effects register first)
  // and draw one frame behind the page; a ScrollTrigger is updated by
  // SmoothScroll after Lenis has written the scroll position.
  assert.match(thread, /ScrollTrigger\.create\(\{[\s\S]*?onUpdate: paintIfMoved/);
  assert.match(thread, /gsap\.registerPlugin\(ScrollTrigger\)/);
  // The fixed canvas fills the viewport minus any classic scrollbar, the same
  // width the pins are measured in; innerWidth would squeeze the bitmap and
  // shift the thread off every bead.
  assert.match(thread, /root\.clientWidth/);
  assert.doesNotMatch(thread, /innerWidth/);
  // The needle is interpolated between samples, not snapped to one.
  assert.match(thread, /const along = /);
  // Leaving the wide layout drops the route and releases the bitmap.
  assert.match(thread, /canvas\.width = 1;/);
});

test('the thread follows the reduced-motion preference live, not just at mount', () => {
  const thread = stripComments(sources['components/heritage/ThreadRail.jsx']);
  assert.match(thread, /let reduced = motion\.matches/);
  assert.match(thread, /motion\.addEventListener\('change', onMotionChange\)/);
  assert.match(thread, /motion\.removeEventListener\('change', onMotionChange\)/);
  assert.match(thread, /reduced = motion\.matches;\s*measure\(\);/);
});

test('the menu follows the destination after an in-page hash link, in both scroll modes', () => {
  const menu = stripComments(read('components/Menu.jsx'));
  // Remembers the hash it was closed through and focuses that section itself
  // when SmoothScroll has not (its native, reduced-motion mode installs no click
  // handler), instead of handing focus back to the burger.
  assert.match(menu, /pendingHash/);
  assert.match(menu, /href\.startsWith\('\/#'\) \? href\.slice\(1\)/);
  assert.match(menu, /document\.getElementById\(pendingHash\.current\.slice\(1\)\)/);
  assert.match(menu, /document\.activeElement !== destination/);
  assert.match(menu, /destination\.focus\(\{ preventScroll: true \}\)/);
  assert.match(menu, /else if \(lastFocused\.current instanceof HTMLElement\)/);
  // The production-first list's links all go through it.
  assert.equal((menu.match(/onClick=\{closeFromLink\}/g) ?? []).length, 2);
});

test('the compare slider is keyboard operable and has no animation loop', () => {
  const slider = stripComments(sources['components/heritage/CompareSlider.jsx']);
  assert.match(slider, /role="slider"/);
  assert.match(slider, /tabIndex=\{0\}/);
  assert.match(slider, /aria-valuenow/);
  assert.match(slider, /ArrowLeft/);
  assert.match(slider, /'Home'/);
  assert.doesNotMatch(slider, /requestAnimationFrame/);
});

test('every new-tab link opts out of opener access', () => {
  for (const [file, source] of Object.entries(sources)) {
    for (const tag of source.match(/<a\b[^>]*target="_blank"[^>]*>/g) ?? []) {
      assert.match(tag, /rel="noopener"/, `${file}: ${tag}`);
    }
  }
  assert.match(read('components/Menu.jsx'), /target="_blank"\s+rel="noopener"/);
});

test('heritage.css is loaded, scoped under .hx, and respects reduced motion', () => {
  assert.match(read('app/globals.css'), /@import '\.\/styles\/heritage\.css';/);
  const css = read('app/styles/heritage.css');
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /@media \(forced-colors: active\)/);
  // The thread canvas is a fixed viewport layer clipped to the world, never a
  // page-tall element.
  assert.match(css, /\.hx-thread \{[^}]*clip-path: inset\(0\)/);
  assert.match(css, /\.hx-thread canvas \{[^}]*position: fixed/);
  // Palette tokens are scoped to the heritage root, not leaked into :root.
  assert.doesNotMatch(css, /:root\s*\{/);
  // Phones and tablets get no thread, at the exact complement of the JS gate
  // (min-width: 900px), so no fractional width falls between the two; the copy
  // that points at the thread goes with it.
  assert.match(css, /@media \(width < 900px\)[\s\S]*?\.hx-thread,[\s\S]*?\.hx-thread-copy/);
  assert.doesNotMatch(css, /max-width: 899px/);
  const hero = stripComments(sources['components/sections/Hero.jsx']);
  assert.match(hero, /className="hx-thread-copy">FOLLOW THE THREAD/);
  assert.match(stripComments(sources['components/heritage/Heritage.jsx']), /hx-aside hx-thread-copy/);
  // Light surface focus ring, forced-colours multiply fallback, 2x2 sheet.
  assert.match(css, /\.hx-offer-card a:focus-visible \{\s*outline-color: var\(--hx-azure\)/);
  assert.match(css, /@media \(forced-colors: active\)[\s\S]*?\.hx img\.is-multiply \{\s*mix-blend-mode: normal/);
  assert.match(css, /\.hx-sheet-grid \{[^}]*minmax\(max\(200px, 45%\), 1fr\)/);
  assert.match(css, /\.hx \.hx-hero-title em \{/);
});

test('the machinery facts are direct dt/dd siblings so only the last row closes the list', () => {
  const machinery = stripComments(sources['components/heritage/Machinery.jsx']);
  assert.match(machinery, /<Fragment key=\{fact\.term\}>/);
  assert.doesNotMatch(machinery, /display: 'contents'/);
});

test('hero facts and copy match the design brief', () => {
  const hero = stripComments(sources['components/sections/Hero.jsx']);
  assert.match(hero, /Explore Crystal Digitizing/);
  assert.match(hero, /See what we make/);
  assert.match(hero, /Every patch, sticker and logo we make starts as a stitch file/);
  assert.match(read('lib/heritage.mjs'), /IN-HOUSE SEW-OUT TESTING/);
  assert.match(read('lib/heritage.mjs'), /NO MINIMUM ORDER/);
});
