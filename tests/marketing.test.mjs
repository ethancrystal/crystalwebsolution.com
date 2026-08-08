import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SERVICE_PAGES,
  SERVICE_PAGE_SLUGS,
  SERVICE_SLUG_BY_SIGNAL,
  SERVICE_SIGNAL_BY_SLUG,
  getServicePageBySlug,
  getRelatedServices,
} from '../lib/servicePages.mjs';
import { SERVICES } from '../lib/services.mjs';

const EXPECTED_SLUGS = [
  'web-design',
  'web-development',
  'branding',
  'logo-design',
  'digital-marketing',
  'animation',
  'ai-automation',
  'workflow-automation',
];

const EXPECTED_SIGNALS = [
  'web',
  'development',
  'brand',
  'logo',
  'marketing',
  'motion',
  'ai',
  'workflow',
];

// Banned marketing fluff the rest of the repo refuses (see tests/services.test.mjs).
const BANNED_COPY = /\b(?:leverage|synergy|best-in-class|cutting-edge|full-service|end-to-end|seamless|robust|scalable|elevate|solutions?|supplied|record|archive|placeholders?)\b/i;

test('every homepage service has exactly one stable service-page slug', () => {
  assert.equal(SERVICE_PAGES.length, 8);
  assert.deepEqual(SERVICE_PAGE_SLUGS, EXPECTED_SLUGS);
  // slug <-> signal is a bijection
  assert.equal(new Set(SERVICE_PAGE_SLUGS).size, SERVICE_PAGE_SLUGS.length);
  EXPECTED_SIGNALS.forEach((signal) => {
    assert.ok(SERVICE_SLUG_BY_SIGNAL[signal], `${signal} should map to a slug`);
    assert.equal(SERVICE_SIGNAL_BY_SLUG[SERVICE_SLUG_BY_SIGNAL[signal]], signal);
  });
});

test('service pages reuse the existing taxonomy and never contradict it', () => {
  assert.deepEqual(
    SERVICE_PAGES.map((p) => p.title),
    SERVICES.map((s) => s.title),
  );
  assert.deepEqual(
    SERVICE_PAGES.map((p) => p.signal),
    SERVICES.map((s) => s.signal),
  );
});

test('every service page carries a complete content record', () => {
  const REQUIRED = [
    'eyebrow', 'seoTitle', 'metaDescription', 'hero', 'introduction',
    'problem', 'capabilities', 'deliverables', 'process', 'idealClient',
    'faq', 'relatedSlugs', 'finalCta',
  ];
  SERVICE_PAGES.forEach((page) => {
    REQUIRED.forEach((key) => {
      assert.ok(page[key] !== undefined && page[key] !== null && page[key] !== '',
        `${page.slug} missing required field "${key}"`);
    });
    assert.ok(Array.isArray(page.capabilities) && page.capabilities.length >= 3, `${page.slug} needs capabilities`);
    assert.ok(Array.isArray(page.deliverables) && page.deliverables.length >= 3, `${page.slug} needs deliverables`);
    assert.ok(Array.isArray(page.process) && page.process.length >= 3, `${page.slug} needs a process`);
    assert.ok(Array.isArray(page.faq) && page.faq.length >= 2, `${page.slug} needs an FAQ`);
    assert.ok(Array.isArray(page.relatedSlugs) && page.relatedSlugs.length >= 1, `${page.slug} needs related services`);
    // hero mirrors the existing homepage sentence, not a replacement
    const home = SERVICES.find((s) => s.signal === page.signal);
    assert.equal(page.hero, home.desc, `${page.slug} hero must extend (not contradict) the homepage copy`);
  });
});

test('service slugs are unique and resolve via lookup', () => {
  EXPECTED_SLUGS.forEach((slug) => {
    const page = getServicePageBySlug(slug);
    assert.ok(page, `getServicePageBySlug(${slug}) should resolve`);
    assert.equal(page.slug, slug);
  });
  assert.equal(getServicePageBySlug('does-not-exist'), null);
});

test('related services point only at valid existing slugs', () => {
  SERVICE_PAGES.forEach((page) => {
    page.relatedSlugs.forEach((slug) => {
      assert.ok(EXPECTED_SLUGS.includes(slug), `${page.slug} links to unknown slug ${slug}`);});
    const related = getRelatedServices(page);
    assert.equal(related.length, page.relatedSlugs.length);
    related.forEach((r) => assert.notEqual(r.slug, page.slug, 'a service must not relate to itself'));
  });
});

test('service content contains no banned placeholder/fluff copy', () => {
  SERVICE_PAGES.forEach((page) => {
    const blob = JSON.stringify(page);
    assert.doesNotMatch(blob, BANNED_COPY, `${page.slug} contains banned copy`);
  });
});

test('marketing navigation links resolve to real routes', () => {
  // lib/site.js is an ESM-syntax .js file consumed by the Next bundler, not
  // directly by Node, so read its source like the other contract tests do.
  const siteSource = readFileSync(new URL('../lib/site.js', import.meta.url), 'utf8');
  ['/work', '/services', '/process', '/reviews', '/about', '/contact'].forEach((href) => {
    assert.ok(siteSource.includes(`href: '${href}'`), `SITE.nav should include ${href}`);
  });
});
