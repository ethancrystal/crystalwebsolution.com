import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function source(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

const breadcrumbRoutes = [
  ['app/about/page.jsx', "{ name: 'About', path: '/about' }"],
  ['app/process/page.jsx', "{ name: 'Process', path: '/process' }"],
  ['app/contact/page.jsx', "{ name: 'Contact', path: '/contact' }"],
  ['app/services/page.jsx', "{ name: 'Services', path: '/services' }"],
  ['app/work/page.jsx', "{ name: 'Work', path: '/work' }"],
  ['app/embroidery-screen-printing-web-design/page.jsx', "{ name: 'Embroidery & Screen-Printing Web Design', path: '/embroidery-screen-printing-web-design' }"],
];

test('public marketing pages expose route breadcrumbs for search and assistive navigation', () => {
  for (const [file, trailItem] of breadcrumbRoutes) {
    const code = source(file);
    assert.match(code, /BreadcrumbSchema/, `${file} should render BreadcrumbSchema`);
    assert.match(code, new RegExp(trailItem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `${file} should declare its route breadcrumb`);
  }
});

test('service and work index pages expose collection structured data', () => {
  for (const file of ['app/services/page.jsx', 'app/work/page.jsx']) {
    const code = source(file);
    assert.match(code, /application\/ld\+json|ItemListSchema|CollectionPageSchema/, `${file} should expose collection JSON-LD`);
  }
});

test('long-form embroidery page exposes article structured data without changing its copy source', () => {
  const code = source('app/embroidery-screen-printing-web-design/page.jsx');
  assert.match(code, /application\/ld\+json|ArticleSchema|CreativeWorkSchema/, 'long-form SEO page needs an article-like JSON-LD entity');
  assert.match(code, /Short answer|embroidery|screen printing/i, 'long-form page copy should remain present');
});

test('private CRM route segments explicitly disable indexing', () => {
  for (const file of ['app/dashboard/layout.jsx', 'app/team/layout.jsx', 'app/admin/layout.jsx']) {
    const code = source(file);
    assert.match(code, /export const metadata/, `${file} must define segment metadata`);
    assert.match(code, /robots\s*:\s*\{[^}]*index\s*:\s*false/s, `${file} must set index=false`);
    assert.match(code, /follow\s*:\s*false/, `${file} must set follow=false`);
  }
});

test('public metadata routes retain unique titles, descriptions, canonicals, and social cards', () => {
  const routes = [
    'app/about/page.jsx',
    'app/process/page.jsx',
    'app/contact/page.jsx',
    'app/services/page.jsx',
    'app/work/page.jsx',
    'app/reviews/page.jsx',
    'app/blog/page.jsx',
    'app/privacy/page.jsx',
    'app/terms/page.jsx',
    'app/embroidery-screen-printing-web-design/page.jsx',
    'app/services/[slug]/page.jsx',
    'app/work/[slug]/page.jsx',
    'app/blog/[slug]/page.jsx',
  ];
  for (const file of routes) {
    const code = source(file);
    assert.match(code, /export const metadata|generateMetadata/, `${file} must define route metadata`);
    assert.match(code, /description\s*(?::|,)/, `${file} must define a description`);
    assert.match(code, /alternates\s*:\s*\{\s*canonical\s*:/s, `${file} must define a canonical`);
    assert.match(code, /openGraph\s*:/, `${file} must define Open Graph metadata`);
    assert.match(code, /twitter\s*:/, `${file} must define Twitter metadata`);
  }
});

test('public metadata routes publish route-aware Open Graph and Twitter images', () => {
  const routes = [
    'app/about/page.jsx',
    'app/process/page.jsx',
    'app/contact/page.jsx',
    'app/services/page.jsx',
    'app/work/page.jsx',
    'app/reviews/page.jsx',
    'app/blog/page.jsx',
    'app/privacy/page.jsx',
    'app/terms/page.jsx',
    'app/embroidery-screen-printing-web-design/page.jsx',
    'app/services/[slug]/page.jsx',
    'app/work/[slug]/page.jsx',
    'app/blog/[slug]/page.jsx',
  ];
  for (const file of routes) {
    const code = source(file);
    assert.match(code, /openGraph\s*:\s*\{[\s\S]*?images\s*:/, `${file} must define an Open Graph image`);
    assert.match(code, /twitter\s*:\s*\{[\s\S]*?images\s*:/, `${file} must define a Twitter image`);
  }
});

test('static public metadata routes publish canonical Open Graph URLs', () => {
  const routes = {
    'app/about/page.jsx': '/about',
    'app/process/page.jsx': '/process',
    'app/contact/page.jsx': '/contact',
    'app/services/page.jsx': '/services',
    'app/work/page.jsx': '/work',
    'app/reviews/page.jsx': '/reviews',
    'app/blog/page.jsx': '/blog',
    'app/privacy/page.jsx': '/privacy',
    'app/terms/page.jsx': '/terms',
    'app/embroidery-screen-printing-web-design/page.jsx': '/embroidery-screen-printing-web-design',
  };
  for (const [file, route] of Object.entries(routes)) {
    const code = source(file);
    assert.match(code, new RegExp(`openGraph\\s*:\\s*\\{[\\s\\S]*?url\\s*:\\s*absoluteUrl\\(['"]${route.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}['"]\\)`), `${file} must define og:url from the canonical origin`);
  }
});

test('auth callback and reset segments explicitly disable indexing', () => {
  const code = source('app/auth/layout.jsx');
  assert.match(code, /export const metadata/, 'auth segment must define metadata');
  assert.match(code, /robots\s*:\s*\{[\s\S]*?index\s*:\s*false/, 'auth segment must set index=false');
  assert.match(code, /follow\s*:\s*false/, 'auth segment must set follow=false');
});

test('robots policy excludes the private employee route', () => {
  const code = source('app/robots.js');
  assert.match(code, /['"]\/team['"]/, 'robots policy must disallow /team');
});

test('auth entry points publish their own Open Graph URL', () => {
  for (const [file, route] of [
    ['app/login/layout.jsx', '/login'],
    ['app/signup/layout.jsx', '/signup'],
  ]) {
    const code = source(file);
    assert.match(code, /openGraph\s*:/, `${file} must define Open Graph metadata`);
    assert.match(code, /twitter\s*:/, `${file} must define Twitter metadata`);
    assert.match(
      code,
      new RegExp(`openGraph\\s*:\\s*\\{[\\s\\S]*?url\\s*:\\s*absoluteUrl\\(['"]${route}['"]\\)`),
      `${file} must not inherit the homepage og:url`,
    );
  }
});

test('the not-found page is the authoritative noindex for missing URLs', () => {
  const code = source('app/not-found.jsx');
  assert.match(code, /robots\s*:\s*\{[\s\S]*?index\s*:\s*false/, 'not-found must set index=false');
  assert.match(code, /follow\s*:\s*false/, 'not-found must set follow=false');
});

test('privacy and terms do not stamp a fresh last-updated date on every render', () => {
  for (const file of ['app/privacy/page.jsx', 'app/terms/page.jsx']) {
    const code = source(file);
    assert.match(code, /LAST_UPDATED/, `${file} must use a fixed last-updated date`);
    assert.doesNotMatch(code, /new Date\(\)\.toLocaleDateString/, `${file} must not generate today's date at render`);
  }
});

test('sitemap lists public marketing URLs and excludes CRM routes', () => {
  const code = source('app/sitemap.js');
  assert.match(code, /SITE_ORIGIN/, 'sitemap locs must come from the canonical origin');
  assert.match(code, /\/blog/, 'published blog index belongs in the sitemap');
  assert.match(code, /listPublishedSlugs/, 'published posts belong in the sitemap');
  assert.doesNotMatch(code, /\/login/, 'login is noindex and not a sitemap URL');
  assert.doesNotMatch(code, /\/dashboard/, 'CRM routes must not appear in the sitemap');
  // hire/shopify-developer shipped as a real page in d56f22c (2026-09-17) and was
  // deliberately added to the sitemap alongside it — it is not an unbuilt landing.
  assert.match(code, /hire\/shopify-developer/, 'the built hire/shopify-developer landing page belongs in the sitemap');
});

test('marketing footer includes the blog in the explore set', () => {
  assert.match(source('components/marketing/MarketingFooter.jsx'), /href="\/blog"/);
});
