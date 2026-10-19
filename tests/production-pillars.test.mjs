// Guards for the 2026-10-19 SEO redo (docs/seo/runs/2026-10-19-code-seo-audit.md):
// embroidery digitizing and custom patches are the centre of the business, so
// they get their own pillars (STRATEGY.md §3, themes P1/P2), lead /services and
// llms.txt, and are the pages the homepage production story links to.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  PRODUCTION_SERVICE_PAGES,
  SERVICE_PAGES,
  STUDIO_SERVICE_PAGES,
  getServicePageBySlug,
} from '../lib/servicePages.mjs';
import { PRODUCTION_CATEGORIES } from '../lib/contactForm.mjs';
import { CORE_OUTPUTS, OFFER } from '../lib/heritage.mjs';
import { SITE } from '../lib/site.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const source = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

const PILLARS = ['embroidery-digitizing', 'custom-patches'];
const YEAR_FIGURE = /\b\d+\+?\s*years?\b|\b(19|20)\d{2}\b/i;

test('the production group is the two pillars, in order, and the studio is everything else', () => {
  assert.deepEqual(PRODUCTION_SERVICE_PAGES.map((page) => page.slug), PILLARS);
  assert.equal(PRODUCTION_SERVICE_PAGES.length + STUDIO_SERVICE_PAGES.length, SERVICE_PAGES.length);
  for (const page of PRODUCTION_SERVICE_PAGES) {
    assert.ok(page.standalone, `${page.slug} has no homepage rail row`);
    assert.equal(page.group, 'production');
  }
  for (const page of STUDIO_SERVICE_PAGES) assert.equal(page.group, 'studio');
});

test('each pillar preselects a real production-request category and links its sibling', () => {
  for (const page of PRODUCTION_SERVICE_PAGES) {
    assert.ok(PRODUCTION_CATEGORIES.includes(page.productionCategory), `${page.slug}: ${page.productionCategory}`);
  }
  assert.ok(getServicePageBySlug('embroidery-digitizing').relatedSlugs.includes('custom-patches'));
  assert.ok(getServicePageBySlug('custom-patches').relatedSlugs.includes('embroidery-digitizing'));
});

test('pillar copy states no year figure and only the confirmed patch offer', () => {
  for (const page of PRODUCTION_SERVICE_PAGES) {
    const { relatedWorkSlugs: _work, ...copy } = page;
    // SITE.experience ("10+ years") and the design's "16 years" are unreconciled.
    assert.doesNotMatch(JSON.stringify(copy), YEAR_FIGURE, `${page.slug} states a year figure`);
    // No turnaround is confirmed anywhere, so none is promised.
    assert.doesNotMatch(JSON.stringify(copy), /\b\d+\s*(?:-\s*\d+\s*)?(?:business\s+)?(?:hours?|days?)\b/i, `${page.slug} promises a turnaround`);
  }
  const patches = JSON.stringify(getServicePageBySlug('custom-patches'));
  const prices = [...patches.matchAll(/\$(\d+)/g)].map((m) => m[1]);
  assert.deepEqual([...new Set(prices)], [OFFER.price], 'the only price stated is the current offer');
  assert.ok(OFFER.rows.some((row) => row.term === 'Minimum order' && row.detail === 'None'), 'the "no minimum" title rests on the offer');
});

test('/services leads with production and states no service count', () => {
  const hub = source('app/services/page.jsx');
  const production = hub.indexOf('pages={PRODUCTION_SERVICE_PAGES}');
  const studio = hub.indexOf('pages={STUDIO_SERVICE_PAGES}');
  assert.ok(production > 0 && studio > production, 'the production grid renders before the studio grid');
  assert.match(hub, /\[\.\.\.PRODUCTION_SERVICE_PAGES, \.\.\.STUDIO_SERVICE_PAGES\]/, 'ItemList lists production first');
  assert.match(hub, /href="\/#contact-production"/, 'the hub links the production request form');
  const copy = hub.replace(/\/\/.*$/gm, '');
  assert.doesNotMatch(copy, /\b(?:six|seven|eight|nine|ten|eleven|twelve|\d+)\s+(?:disciplines|services)\b/i);
  // The hub title must not take a pillar's head term.
  const title = hub.match(/const SEO_TITLE = '([^']+)'/)[1];
  for (const head of ['Embroidery Digitizing Services', 'Custom Patches', 'Web Design']) {
    assert.ok(!title.includes(head), `hub title competes with its pillar: ${head}`);
  }
});

test('production pillars end with the production request form, studio pages keep the brief', () => {
  const page = source('components/marketing/ServicePage.jsx');
  assert.match(page, /const isProduction = page\.group === 'production';/);
  assert.match(page, /<ProductionRequestForm/);
  assert.match(page, /category: page\.productionCategory/);
  assert.match(page, /<ContactForm/, 'studio pages still end with the brief');
  assert.match(page, /href="\/#quality"/, 'production proof points at the homepage quality section, not /work');
});

test('the homepage production story links both pillars', () => {
  const byTitle = Object.fromEntries(CORE_OUTPUTS.map((output) => [output.title, output.href]));
  assert.equal(byTitle.Embroidery, '/services/embroidery-digitizing');
  assert.equal(byTitle.Patches, '/services/custom-patches');
  const make = source('components/heritage/Make.jsx');
  assert.match(make, /href="\/services\/embroidery-digitizing"/);
  assert.match(make, /href="\/services\/custom-patches"/);
});

test('the shop web-design page points embroidery buyers at the pillars', () => {
  const page = source('app/embroidery-screen-printing-web-design/page.jsx');
  assert.match(page, /<Link href="\/services\/embroidery-digitizing">/);
  assert.match(page, /<Link href="\/services\/custom-patches">/);
});

test('/process names the brand once and fits a SERP line', () => {
  const page = source('app/process/page.jsx');
  const title = page.match(/const SEO_TITLE = '([^']+)'/)[1];
  assert.equal(title.split(SITE.name).length - 1, 1, `brand appears more than once: ${title}`);
  assert.ok(title.length <= 60, `title is ${title.length} chars`);
});

test('STRATEGY.md and the registry map P1/P2 to the pillars without invented figures', () => {
  const strategy = source('docs/seo/STRATEGY.md');
  assert.match(strategy, /\| P1 \| Embroidery digitizing \| `\/services\/embroidery-digitizing` \|/);
  assert.match(strategy, /\| P2 \| Custom patches \| `\/services\/custom-patches` \|/);
  const registry = source('docs/seo/KEYWORD-REGISTRY.md');
  for (const [keyword, url] of [
    ['embroidery digitizing services', '/services/embroidery-digitizing'],
    ['custom patches', '/services/custom-patches'],
  ]) {
    const row = registry.split('\n').find((line) => line.startsWith(`| ${keyword} |`));
    assert.ok(row, `registry has a row for ${keyword}`);
    const cells = row.split('|').map((cell) => cell.trim());
    assert.deepEqual(cells.slice(2, 5), ['unavailable', 'unavailable', 'unavailable'], `${keyword} figures are not estimated`);
    assert.equal(cells[6], url);
  }
});
