// Contracts for KAN-12 / KAN-15: service pillars link back to the blog posts
// that link to them, and the IndexNow ping sends a payload the protocol accepts.
import test from 'node:test';
import assert from 'node:assert/strict';

import { getServicePageBySlug, SERVICE_PAGES } from '../lib/servicePages.mjs';
import { buildPayload, deriveOrigin } from '../scripts/seo/indexnow-ping.mjs';

test('branding and logo-design pillars link back to the branding + web design post (KAN-12)', () => {
  for (const slug of ['branding', 'logo-design']) {
    const hrefs = getServicePageBySlug(slug).guideLinks.map((link) => link.href);
    assert.ok(
      hrefs.includes('/blog/branding-and-web-design-studio'),
      `/services/${slug} must link to /blog/branding-and-web-design-studio`,
    );
  }
});

test('service guide links are site-relative blog URLs with real anchor text', () => {
  for (const page of SERVICE_PAGES) {
    assert.ok(Array.isArray(page.guideLinks), `${page.slug} guideLinks must be an array`);
    const seen = new Set();
    for (const link of page.guideLinks) {
      assert.match(link.href, /^\/blog\/[a-z0-9]+(?:-[a-z0-9]+)*$/, `${page.slug}: ${link.href}`);
      assert.ok(link.label.trim().length >= 10, `${page.slug}: anchor text too thin for ${link.href}`);
      assert.ok(!seen.has(link.href), `${page.slug} links ${link.href} twice`);
      seen.add(link.href);
    }
  }
});

test('no guide link uses a head term the registry maps to the service page itself', () => {
  // KEYWORD-REGISTRY.md maps `ai automation agency` to /services/ai-automation.
  for (const page of SERVICE_PAGES) {
    for (const link of page.guideLinks) {
      assert.doesNotMatch(link.label, /ai automation agency/i, `${page.slug}: ${link.href}`);
    }
  }
});

test('IndexNow payload: bare host, root keyLocation, same-origin URLs only', () => {
  const origin = deriveOrigin('https://www.cdsportswearinc.com/blog/x');
  const payload = buildPayload(origin, 'k'.repeat(32), 'abc.txt', [
    'https://www.cdsportswearinc.com/blog/x',
    'https://www.cdsportswearinc.com/services/seo',
    'https://cdsportswearinc.com/blog/x',
    'http://www.cdsportswearinc.com/blog/x',
    'not a url',
  ]);

  assert.equal(payload.host, 'www.cdsportswearinc.com');
  assert.equal(payload.keyLocation, 'https://www.cdsportswearinc.com/abc.txt');
  assert.doesNotMatch(payload.keyLocation, /\/public\//);
  assert.deepEqual(payload.urlList, [
    'https://www.cdsportswearinc.com/blog/x',
    'https://www.cdsportswearinc.com/services/seo',
  ]);
});
