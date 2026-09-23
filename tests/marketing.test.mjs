import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SERVICE_PAGES,
  RAIL_SERVICE_PAGES,
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

// Standalone pillar pages: rendered by the same /services/[slug] template and
// listed on /services + the sitemap, but NOT in SERVICES (no homepage row, no
// 3D rail instrument). docs/seo/STRATEGY.md §3 theme 4.
const STANDALONE_SLUGS = ['seo'];
const ALL_SLUGS = [...EXPECTED_SLUGS, ...STANDALONE_SLUGS];

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
  assert.equal(RAIL_SERVICE_PAGES.length, 8);
  assert.equal(SERVICE_PAGES.length, EXPECTED_SLUGS.length + STANDALONE_SLUGS.length);
  assert.deepEqual(SERVICE_PAGE_SLUGS, ALL_SLUGS);
  assert.deepEqual(RAIL_SERVICE_PAGES.map((p) => p.slug), EXPECTED_SLUGS);
  // slug <-> signal is a bijection
  assert.equal(new Set(SERVICE_PAGE_SLUGS).size, SERVICE_PAGE_SLUGS.length);
  EXPECTED_SIGNALS.forEach((signal) => {
    assert.ok(SERVICE_SLUG_BY_SIGNAL[signal], `${signal} should map to a slug`);
    assert.equal(SERVICE_SIGNAL_BY_SLUG[SERVICE_SLUG_BY_SIGNAL[signal]], signal);
  });
});

test('service pages reuse the existing taxonomy and never contradict it', () => {
  assert.deepEqual(
    RAIL_SERVICE_PAGES.map((p) => p.title),
    SERVICES.map((s) => s.title),
  );
  assert.deepEqual(
    RAIL_SERVICE_PAGES.map((p) => p.signal),
    SERVICES.map((s) => s.signal),
  );
  // Standalone pages never leak into the homepage taxonomy.
  SERVICE_PAGES.filter((p) => p.standalone).forEach((p) => {
    assert.ok(!SERVICES.some((s) => s.signal === p.signal), `${p.slug} must not be a SERVICES signal`);
    assert.ok(STANDALONE_SLUGS.includes(p.slug), `${p.slug} is standalone but not declared in this test`);
  });
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
    // (standalone pages have no homepage row to mirror)
    const home = SERVICES.find((s) => s.signal === page.signal);
    if (page.standalone) {
      assert.equal(home, undefined, `${page.slug} is standalone but has a homepage row`);
    } else {
      assert.equal(page.hero, home.desc, `${page.slug} hero must extend (not contradict) the homepage copy`);
    }
  });
});

test('service slugs are unique and resolve via lookup', () => {
  ALL_SLUGS.forEach((slug) => {
    const page = getServicePageBySlug(slug);
    assert.ok(page, `getServicePageBySlug(${slug}) should resolve`);
    assert.equal(page.slug, slug);
  });
  assert.equal(getServicePageBySlug('does-not-exist'), null);
});

test('related services point only at valid existing slugs', () => {
  SERVICE_PAGES.forEach((page) => {
    page.relatedSlugs.forEach((slug) => {
      assert.ok(ALL_SLUGS.includes(slug), `${page.slug} links to unknown slug ${slug}`);});
    const related = getRelatedServices(page);
    assert.equal(related.length, page.relatedSlugs.length);
    related.forEach((r) => assert.notEqual(r.slug, page.slug, 'a service must not relate to itself'));
  });
});

test('related work slugs point only at real case studies', async () => {
  const { PROJECTS } = await import('../lib/projects.js');
  const allowed = new Set(PROJECTS.map((project) => project.slug));
  SERVICE_PAGES.forEach((page) => {
    (page.relatedWorkSlugs || []).forEach((slug) => {
      assert.ok(allowed.has(slug), `${page.slug} links to unknown work ${slug}`);
    });
  });
});

test('service content contains no banned placeholder/fluff copy', () => {
  SERVICE_PAGES.forEach((page) => {
    const { relatedWorkSlugs: _relatedWorkSlugs, ...copy } = page;
    const blob = JSON.stringify(copy);
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
    seoTitle: 'Brand Identity Design Services for Companies',
    h1: 'Brand identity design that won’t blend in',
  },
  {
    slug: 'logo-design',
    seoTitle: 'Custom Logo Design Services for Brands',
    h1: 'Custom logo design and brand systems',
  },
  {
    slug: 'web-development',
    seoTitle: 'Custom React & Next.js Web Development',
    h1: 'Custom React & Next.js development',
  },
  {
    slug: 'digital-marketing',
    seoTitle: 'Digital Marketing Agency for Brands',
    h1: 'Digital marketing agency for brands',
  },
  {
    slug: 'seo',
    seoTitle: 'SEO Agency — Search Engine Optimization Services',
    h1: 'Search engine optimization agency for brands',
  },
];

test('the standalone SEO pillar is linked from at least two rail-backed pages', () => {
  const inbound = RAIL_SERVICE_PAGES.filter((page) => page.relatedSlugs.includes('seo'));
  assert.ok(inbound.length >= 2, `only ${inbound.length} page(s) link to /services/seo — it would be an orphan pillar`);
  const seo = getServicePageBySlug('seo');
  assert.ok(seo.standalone, 'seo must be a standalone page');
  assert.equal(seo.n, '09');
  assert.ok(seo.capabilities.some((c) => /conversion rate optimization/i.test(c)), 'CRO must be a section of the SEO pillar');
});

test('service pages ship the SEO title stem and single H1 from the ship table', () => {
  SEO_SHIP_TABLE.forEach(({ slug, seoTitle, h1 }) => {
    const page = getServicePageBySlug(slug);
    assert.ok(page, `${slug} should resolve`);
    assert.equal(page.seoTitle, seoTitle);
    assert.equal(page.h1, h1);
    assert.doesNotMatch(page.seoTitle, /\s\|\s/, `${slug} seoTitle is a stem; layout appends | ${'CD Sportswear Inc'}`);
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

test('marketing navigation links resolve to real routes', () => {
  // lib/site.js is an ESM-syntax .js file consumed by the Next bundler, not
  // directly by Node, so read its source like the other contract tests do.
  const siteSource = readFileSync(new URL('../lib/site.js', import.meta.url), 'utf8');
  ['/work', '/services', '/blog', '/process', '/reviews', '/about', '/contact'].forEach((href) => {
    assert.ok(siteSource.includes(`href: '${href}'`), `SITE.nav should include ${href}`);
  });
});
