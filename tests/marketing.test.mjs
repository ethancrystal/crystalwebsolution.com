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
    'eyebrow', 'seoTitle', 'metaDescription', 'h1', 'hero', 'introduction',
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

const SEO_SHIP_TABLE = [
  {
    slug: 'ai-automation',
    seoTitle: 'AI Automation Agency for Business',
    h1: 'AI automation for business',
  },
  {
    slug: 'web-design',
    seoTitle: 'Custom Web Design Studio',
    h1: 'Custom web design for brands',
  },
  {
    slug: 'branding',
    seoTitle: 'Branding Studio for Companies',
    h1: 'Branding systems that won’t blend in',
  },
  {
    slug: 'logo-design',
    seoTitle: 'Custom Logo & Brand System Design',
    h1: 'Custom logo and brand systems',
  },
  {
    slug: 'web-development',
    seoTitle: 'Custom React & Next.js Web Development',
    h1: 'Custom React & Next.js development',
  },
  {
    slug: 'digital-marketing',
    seoTitle: 'Digital Marketing for Brands',
    h1: 'Digital marketing for brands',
  },
];

test('six service pages ship the SEO title stem and single H1 from the ship table', () => {
  SEO_SHIP_TABLE.forEach(({ slug, seoTitle, h1 }) => {
    const page = getServicePageBySlug(slug);
    assert.ok(page, `${slug} should resolve`);
    assert.equal(page.seoTitle, seoTitle);
    assert.equal(page.h1, h1);
    assert.doesNotMatch(page.seoTitle, /\s\|\s/, `${slug} seoTitle is a stem; layout appends | ${'CD Sportswear USA'}`);
  });
});

test('service meta descriptions are unique and match each page angle', () => {
  const descriptions = SERVICE_PAGES.map((page) => page.metaDescription);
  assert.equal(new Set(descriptions).size, descriptions.length);
  SEO_SHIP_TABLE.forEach(({ slug }) => {
    const page = getServicePageBySlug(slug);
    assert.ok(page.metaDescription.length > 40, `${slug} needs a rewritten meta description`);
  });
});

test('service detail pages keep the 3D instrument beside the H1 and use the services scene', () => {
  const servicePage = readFileSync(new URL('../components/marketing/ServicePage.jsx', import.meta.url), 'utf8');
  const slugPage = readFileSync(new URL('../app/services/[slug]/page.jsx', import.meta.url), 'utf8');
  assert.match(servicePage, /className="mkt-service-hero"/);
  assert.match(servicePage, /mkt-service-hero-instrument/);
  assert.match(slugPage, /sceneVariant="services"/);
});

test('marketing navigation links resolve to real routes', () => {
  // lib/site.js is an ESM-syntax .js file consumed by the Next bundler, not
  // directly by Node, so read its source like the other contract tests do.
  const siteSource = readFileSync(new URL('../lib/site.js', import.meta.url), 'utf8');
  ['/work', '/services', '/process', '/reviews', '/about', '/contact'].forEach((href) => {
    assert.ok(siteSource.includes(`href: '${href}'`), `SITE.nav should include ${href}`);
  });
});
