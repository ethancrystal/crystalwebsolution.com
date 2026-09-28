import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  APP_ORIGIN,
  PORTAL_SEGMENTS,
  SITE_ORIGIN,
  portalHostRedirects,
} from '../lib/portalHost.mjs';
import { SITE_ORIGIN as SEO_SITE_ORIGIN } from '../lib/seo.mjs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

// The app->site rule's path parameter carries a custom regex; pull it out so
// the exclusions can be exercised directly with sample paths.
function appToSitePathRegex(rules) {
  const rule = rules.at(-1);
  const match = rule.source.match(/^\/:path\((.*)\)$/);
  assert.ok(match, `unexpected source ${rule.source}`);
  return new RegExp(`^${match[1]}$`);
}

test('the marketing origin matches lib/seo.mjs', () => {
  assert.equal(SITE_ORIGIN, SEO_SITE_ORIGIN);
  assert.equal(APP_ORIGIN, 'https://app.cdsportswearinc.com');
});

test('every portal path the middleware guards is routed to the app host', () => {
  const matcher = read('../middleware.js').match(/matcher:\s*\[([\s\S]*?)\]/)[1];
  const segments = new Set([...matcher.matchAll(/'\/([a-z-]+)/g)].map((m) => m[1]));
  for (const segment of segments) {
    assert.ok(PORTAL_SEGMENTS.includes(segment), `${segment} is a portal path but not in PORTAL_SEGMENTS`);
  }
});

test('with the CRM on: www portal paths go to app, app "/" opens login, the rest goes to www', () => {
  const rules = portalHostRedirects({ crmEnabled: true });
  const toApp = rules.filter((rule) => rule.destination.startsWith(APP_ORIGIN));
  assert.deepEqual(
    toApp.map((rule) => rule.source),
    PORTAL_SEGMENTS.map((segment) => `/${segment}/:path*`),
  );
  for (const rule of toApp) {
    assert.equal(rule.permanent, true);
    assert.match(rule.has[0].value, /cdsportswearinc/);
    assert.doesNotMatch(rule.has[0].value, /^app/);
  }

  const root = rules.find((rule) => rule.source === '/');
  assert.deepEqual(root, {
    source: '/',
    has: [{ type: 'host', value: 'app\\.cdsportswearinc\\.com' }],
    destination: '/login',
    permanent: false,
  });
  // "/" must be matched before the catch-all sends it to www.
  assert.ok(rules.indexOf(root) < rules.length - 1);
  assert.equal(rules.at(-1).destination, `${SITE_ORIGIN}/:path`);
});

test('the app host keeps portal pages, API routes and files; marketing pages go to www', () => {
  const pathRegex = appToSitePathRegex(portalHostRedirects({ crmEnabled: true }));
  const redirected = (path) => pathRegex.test(path.replace(/^\//, ''));

  for (const path of [
    '/login', '/login/client', '/signup', '/forgot-password', '/onboarding',
    '/dashboard', '/dashboard/briefs/abc', '/team/projects/1', '/admin', '/admin/users',
    '/auth/verify', '/auth/callback', '/api/contact', '/api/cron/crm-notifications',
    '/_next/static/chunks/app.js', '/_vercel/insights/view',
    '/robots.txt', '/icon.png', '/brand/logo.svg',
  ]) {
    assert.equal(redirected(path), false, `${path} must stay on the app host`);
  }
  for (const path of ['/about', '/services', '/work', '/work/some-project', '/blog/a-post', '/contact', '/loginfo', '/teamwork']) {
    assert.equal(redirected(path), true, `${path} should go to www`);
  }
});

test('with the CRM off: nothing is sent to the app host and app "/" does not loop through /login', () => {
  const rules = portalHostRedirects({ crmEnabled: false });
  assert.equal(rules.length, 1);
  assert.equal(rules[0].destination, `${SITE_ORIGIN}/:path`);
  assert.ok(appToSitePathRegex(rules).test(''), 'app "/" goes to the marketing home');
});

test('next.config.js wires the rules and reads the CRM flag like lib/crmFlag.js', () => {
  const config = read('../next.config.js');
  assert.match(config, /async redirects\(\)/);
  assert.match(config, /import\('\.\/lib\/portalHost\.mjs'\)/);
  assert.match(config, /NEXT_PUBLIC_CRM_ENABLED\?\.trim\(\)\.toLowerCase\(\) !== 'false'/);
  assert.match(read('../lib/crmFlag.js'), /NEXT_PUBLIC_CRM_ENABLED\?\.trim\(\)\.toLowerCase\(\) !== 'false'/);
});

test('Supabase Auth allows redirects to the app host', () => {
  assert.match(read('../supabase/config.toml'), /"https:\/\/app\.cdsportswearinc\.com\/\*\*"/);
});
