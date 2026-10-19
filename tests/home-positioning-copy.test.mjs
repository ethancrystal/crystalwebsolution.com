// Guards for the homepage identity copy after the embroidery repositioning
// (owner-approved 2026-10-18, docs/seo/STRATEGY.md §2). No test used to pin the
// layout title, descriptions, SITE.statement, Menu note or Contact footer, so
// these exist to stop the copy drifting back to a web-only studio, or past the
// lengths search results truncate at, without anyone deciding to.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  HOME_DESCRIPTION,
  HOME_SOCIAL_DESCRIPTION,
  HOME_TITLE_STEM,
  ORG_DESCRIPTION,
  ORG_KNOWS_ABOUT,
  SITE_ORIGIN,
} from '../lib/seo.mjs';
import { SITE } from '../lib/site.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const source = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

const SUFFIX = ` | ${SITE.name}`;
// Any "N years" / "N+ years" claim, or a bare 19xx/20xx year.
const YEAR_FIGURE = /\b\d+\+?\s*years?\b|\b(19|20)\d{2}\b/i;

test('the default title leads with embroidery digitizing, keeps Web Design, and fits a SERP line', () => {
  assert.match(HOME_TITLE_STEM, /^Embroidery Digitizing\b/);
  assert.match(HOME_TITLE_STEM, /\bWeb Design\b/, '"Web Design" stays in the homepage title (STRATEGY.md §2)');
  assert.ok(HOME_TITLE_STEM.length <= 40, `title stem is ${HOME_TITLE_STEM.length} chars; > 40 pushes the suffixed title past ~60`);
  assert.ok((HOME_TITLE_STEM + SUFFIX).length <= 60, 'the full default title stays within 60 characters');
});

test('every homepage description fits a snippet', () => {
  for (const [name, text] of Object.entries({ HOME_DESCRIPTION, HOME_SOCIAL_DESCRIPTION, ORG_DESCRIPTION })) {
    assert.ok(text.length <= 155, `${name} is ${text.length} chars (limit 155)`);
    assert.match(text, /embroidery/i, `${name} leads with the production side`);
  }
  assert.match(HOME_DESCRIPTION, /web/i, 'the meta description still names web work');
  assert.match(HOME_DESCRIPTION, /AI automation/);
});

test('no homepage copy states a number of years', () => {
  // SITE.founded (2016) and SITE.experience ("10+ years") are unresolved against
  // the design's "16 years" (Crystal Digitizing, 2010). Until the owner reconciles
  // them, search and share copy must not state any figure.
  const copy = {
    HOME_TITLE_STEM,
    HOME_DESCRIPTION,
    HOME_SOCIAL_DESCRIPTION,
    ORG_DESCRIPTION,
    ORG_KNOWS_ABOUT: ORG_KNOWS_ABOUT.join(' | '),
    'SITE.statement': SITE.statement,
    'SITE.tagline': SITE.tagline,
  };
  for (const [name, text] of Object.entries(copy)) {
    assert.doesNotMatch(text, YEAR_FIGURE, `${name} states a year figure`);
  }
  assert.equal(SITE.founded, 2016, 'SITE.founded is the owner\'s call, not part of the repositioning');
  assert.equal(SITE.experience, '10+ years', 'SITE.experience is the owner\'s call, not part of the repositioning');
});

test('the Organization node keeps the web terms and adds the production terms', () => {
  for (const term of ['web design', 'web development', 'branding', 'logo design', 'AI automation', 'motion design']) {
    assert.ok(ORG_KNOWS_ABOUT.includes(term), `knowsAbout dropped "${term}", which ties the entity to its /services pillars`);
  }
  for (const term of ['embroidery digitizing', 'custom patches']) {
    assert.ok(ORG_KNOWS_ABOUT.includes(term), `knowsAbout is missing "${term}"`);
  }
  assert.equal(new Set(ORG_KNOWS_ABOUT).size, ORG_KNOWS_ABOUT.length, 'no duplicate knowsAbout terms');
});

test('app/layout.jsx reads the shared copy and keeps no stale web-only literals', () => {
  const layout = source('app/layout.jsx');
  assert.doesNotMatch(layout, /Custom Web Design/, 'the old web-only title is gone');
  assert.doesNotMatch(layout, /Digital studio designing/, 'the old Organization description is gone');
  assert.equal(
    (layout.match(/\$\{HOME_TITLE_STEM\} \| \$\{SITE\.name\}/g) ?? []).length,
    3,
    'default title, openGraph title and twitter title all read HOME_TITLE_STEM',
  );
  assert.match(layout, /description: HOME_DESCRIPTION,/);
  assert.equal((layout.match(/description: HOME_SOCIAL_DESCRIPTION,/g) ?? []).length, 3, 'openGraph, twitter and the WebSite node');
  assert.match(layout, /description: ORG_DESCRIPTION,/);
  assert.match(layout, /knowsAbout: \[\.\.\.ORG_KNOWS_ABOUT\]/);
  assert.match(layout, /slogan: SITE\.tagline/, 'the tagline ("Clarity. Craft. Impact.") is unchanged');
});

test('SITE.statement is a bridge line that fits the share card', () => {
  assert.match(SITE.statement, /^Embroidery digitizing, patches, web and brand\b/);
  assert.ok(SITE.statement.length <= 80, `statement is ${SITE.statement.length} chars; the OG card sets it at 32px in an 880px column`);
  assert.equal(SITE.tagline, 'Clarity. Craft. Impact.');
});

test('the Menu note and Contact footer describe production and web', () => {
  assert.match(source('components/Menu.jsx'), /Embroidery, patches,<br \/>web and brand\./);
  assert.match(source('components/sections/Contact.jsx'), /<p>Embroidery, patches, web &amp; brand<\/p>/);
});

test('llms.txt leads with embroidery digitizing and patches, then the studio', () => {
  const llms = source('public/llms.txt');
  const blockquote = llms.split('\n').find((line) => line.startsWith('> ')) ?? '';
  assert.match(blockquote, /^> CD Sportswear INC digitizes embroidery and makes custom patches/);
  assert.match(blockquote, /web design/, 'the blockquote still lists the web services');

  // Production is the first section, and it holds the homepage and both
  // production pillars (STRATEGY.md §3, themes P1/P2).
  const sections = llms.split('\n## ').slice(1);
  const entriesOf = (section) => section.split('\n').filter((line) => line.startsWith('- ['));
  assert.equal(sections[0].split('\n')[0], 'Embroidery digitizing and patches');
  const production = entriesOf(sections[0]);
  for (const route of ['', '/services/embroidery-digitizing', '/services/custom-patches']) {
    assert.equal(production.filter((line) => line.includes(`](${SITE_ORIGIN}${route})`)).length, 1, `production lists ${route || '/'}`);
  }

  // The studio section lists the hub and the studio pillars; no production
  // pillar is listed twice, and only the hub line may mention production.
  const studio = sections.find((section) => section.startsWith('Digital studio services')) ?? '';
  const studioEntries = entriesOf(studio);
  assert.ok(studioEntries.length > 0, 'found the Digital studio section');
  for (const line of studioEntries.filter((entry) => !entry.includes(`](${SITE_ORIGIN}/services)`))) {
    assert.doesNotMatch(line, /digitiz|patch|sticker/i, `no production entry under the studio: ${line}`);
  }
});

test('llms.txt states no service count and lists no noindex page', () => {
  const llms = source('public/llms.txt');
  // A written count drifts every time a pillar ships (the 2026-10-19 audit
  // found "Eight disciplines" beside ten listed services).
  assert.doesNotMatch(llms, /\b(?:six|seven|eight|nine|ten|eleven|twelve|\d+)\s+(?:disciplines|services)\b/i);
  // /hire/shopify-developer is noindex, follow (seo-onpage.test.mjs), so a
  // guide for crawlers must not send them to it.
  assert.doesNotMatch(llms, /\/hire\//);
});
