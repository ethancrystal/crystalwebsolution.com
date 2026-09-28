// Guards for the 2026-09-26 audit fixes (docs/seo/runs/2026-09-26-full-audit.md):
// business identity, site-wide schema, robots groups, sitemap freshness and
// llms.txt coverage.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import robots from '../app/robots.js';
import { SITE_ORIGIN } from '../lib/seo.mjs';
import { SERVICE_PAGES, SERVICE_PAGE_SLUGS, getServicePageBySlug } from '../lib/servicePages.mjs';
import { PROJECTS } from '../lib/projects.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const source = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

function sourceFiles(dir) {
  return fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((entry) => {
    const relative = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(relative);
    return /\.(jsx?|mjs)$/.test(entry.name) ? [relative] : [];
  });
}

test('no page or component claims a Sharjah / Dubai location', () => {
  for (const file of [...sourceFiles('app'), ...sourceFiles('components')]) {
    const code = source(file);
    assert.doesNotMatch(code, /Sharjah|\bDXB\b|Dubai/, `${file} still names a UAE location`);
    // The Privacy data-transfer clause is a legal statement about where data
    // may be processed, not a location claim, and was deliberately kept.
    if (file !== path.join('app', 'privacy', 'page.jsx')) {
      assert.doesNotMatch(code, /United Arab Emirates/, `${file} still names the UAE`);
    }
  }
});

test('site-wide Organization schema: one real US address, no P.O. Box, no site-wide rating', () => {
  const layout = source('app/layout.jsx');
  assert.match(layout, /\.\.\.SITE\.address\b/, 'address comes from SITE.address');
  assert.match(layout, /'PostalAddress'/);
  assert.doesNotMatch(layout, /mailingAddress/, 'the P.O. Box must never be emitted as schema.org address');
  assert.doesNotMatch(layout, /aggregateRating\s*:/, 'no AggregateRating on the site-wide graph');
  assert.doesNotMatch(layout, /REVIEW_STATS/, 'reviews are not read by the layout');
  assert.doesNotMatch(layout, /'AE'/, 'no UAE service area');
});

test('the homepage owns its canonical; the root layout sets none for others to inherit', () => {
  assert.doesNotMatch(source('app/layout.jsx'), /alternates\s*:\s*\{[^}]*canonical/);
  assert.match(source('app/page.jsx'), /alternates\s*:\s*\{\s*canonical\s*:\s*'\/'\s*\}/);
});

test('robots: named crawlers share the private-path disallows (RFC 9309 group matching)', () => {
  const policy = robots();
  assert.equal(policy.rules.length, 1, 'a single group, so no crawler can match a laxer one');
  const [group] = policy.rules;
  for (const agent of ['*', 'Bingbot', 'GPTBot', 'OAI-SearchBot', 'ClaudeBot', 'PerplexityBot', 'Applebot']) {
    assert.ok(group.userAgent.includes(agent), `${agent} belongs to the shared group`);
  }
  for (const privatePath of ['/admin', '/dashboard', '/team', '/api/', '/auth/', '/login/admin', '/forgot-password']) {
    assert.ok(group.disallow.includes(privatePath), `${privatePath} is disallowed`);
  }
  for (const publicPath of ['/login', '/signup']) {
    assert.ok(!group.disallow.includes(publicPath), `${publicPath} stays crawlable so its noindex is seen`);
  }
  assert.equal(group.allow, '/');
  assert.equal(policy.sitemap, `${SITE_ORIGIN}/sitemap.xml`);
  assert.equal('host' in policy, false, 'no non-standard Host directive');
});

test('sitemap regenerates on a timer and never reports build time as lastmod', () => {
  const code = source('app/sitemap.js');
  assert.match(code, /export const revalidate = \d+;/, 'sitemap must revalidate without a redeploy');
  assert.doesNotMatch(code, /lastModified:\s*now/, 'static routes must not claim the build time');
  assert.doesNotMatch(code, /new Date\(\)/, 'no "now" timestamps in the sitemap');
  assert.match(code, /updated_at/, 'posts keep their real modification date');
  // A failed runtime read must throw (Next keeps the last good sitemap), while
  // `next build` with CI's placeholder Supabase still degrades to [].
  assert.match(code, /NEXT_PHASE === 'phase-production-build'/);
  assert.match(code, /listPublishedSlugs\(\{ throwOnError: !duringBuild\(\) \}\)/);
  const reader = source('lib/crm/blog.js');
  const fn = reader.match(/export async function listPublishedSlugs[\s\S]*?\n}/)[0];
  assert.match(fn, /if \(throwOnError\) throw new Error\(/, 'the reader can surface a failed read');
  assert.match(fn, /if \(!supabase\) return \[\];/, 'unconfigured Supabase still returns []');
});

test('llms.txt lists every sitemap URL and every post the pillars link to', () => {
  const llms = source('public/llms.txt');
  const staticPaths = [...source('app/sitemap.js').matchAll(/\$\{SITE_URL\}(\/[a-z0-9/-]+)`/g)].map((m) => m[1]);
  const paths = [
    ...staticPaths,
    ...SERVICE_PAGE_SLUGS.map((slug) => `/services/${slug}`),
    ...PROJECTS.map((project) => `/work/${project.slug}`),
    ...SERVICE_PAGES.flatMap((page) => page.guideLinks.map((link) => link.href)),
  ];
  assert.ok(staticPaths.includes('/services'));
  for (const route of new Set(paths)) {
    assert.ok(llms.includes(`${SITE_ORIGIN}${route})`), `llms.txt is missing ${route}`);
  }
});

test('the web-design pillar does not push the post that targets its own secondary term', () => {
  // KEYWORD-REGISTRY.md tracks `website redesign services` in the cluster it
  // expects /services/web-design to own.
  // Until MJ rules on the mapping, the pillar links the rest of the redesign
  // cluster but not /blog/website-redesign-services.
  const hrefs = getServicePageBySlug('web-design').guideLinks.map((link) => link.href);
  assert.ok(hrefs.includes('/blog/when-to-redesign-vs-refresh-website'));
  assert.ok(!hrefs.includes('/blog/website-redesign-services'));
});
