import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function source(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

// lib/analytics.mjs reads NEXT_PUBLIC_GA_ID and holds module-level state
// (bootstrapped, lastLocation), so each case imports a fresh instance via a
// unique query string and installs a fake browser first. This executes the
// real module — an earlier version of this suite only regex'd the source and
// stayed green while the implementation was gutted.
let instance = 0;

async function loadAnalytics({ id = 'G-ABCD1234', href = 'https://www.crystalwebsolution.com/', referrer = '', title = 'Home' } = {}) {
  const url = new URL(href);
  globalThis.window = { location: { origin: url.origin, href } };
  globalThis.document = { title, referrer };
  process.env.NEXT_PUBLIC_GA_ID = id;
  instance += 1;
  const mod = await import(`../lib/analytics.mjs?case=${instance}`);
  return { mod, dataLayer: () => (globalThis.window.dataLayer || []).map((entry) => Array.from(entry)) };
}

test.afterEach(() => {
  delete globalThis.window;
  delete globalThis.document;
  delete process.env.NEXT_PUBLIC_GA_ID;
});

test('only a well-formed GA4 measurement ID enables the tag', async () => {
  for (const bad of ['', '   ', 'GTM-ABCD', 'UA-12345-1', 'G-ABC', 'nonsense', 'G-OK"><script>']) {
    const { mod } = await loadAnalytics({ id: bad });
    assert.equal(mod.GA_ID, '', `${JSON.stringify(bad)} must not reach the script src`);
    assert.equal(mod.isAnalyticsEnabled(), false);
  }
  const { mod } = await loadAnalytics({ id: '  G-ABCD1234  ' });
  assert.equal(mod.GA_ID, 'G-ABCD1234', 'a valid ID should be trimmed and kept');
  assert.equal(mod.isAnalyticsEnabled(), true);
});

test('nothing is queued when analytics is disabled', async () => {
  const { mod, dataLayer } = await loadAnalytics({ id: '' });
  mod.pageview('/', '');
  mod.trackEvent('generate_lead', { budget: '$5–15k' });
  assert.deepEqual(dataLayer(), [], 'a disabled property must not touch dataLayer at all');
});

test('config is queued before the first event, and only once', async () => {
  const { mod, dataLayer } = await loadAnalytics();
  mod.pageview('/', '');
  mod.pageview('/work', '');
  mod.trackEvent('generate_lead', {});

  const queue = dataLayer();
  assert.deepEqual(queue[0].slice(0, 1), ['js'], 'js must be first');
  assert.equal(queue[0][1] instanceof Date, true);
  assert.deepEqual(queue[1], ['config', 'G-ABCD1234', { send_page_view: false }], 'config must precede every event');

  const firstEvent = queue.findIndex((entry) => entry[0] === 'event');
  assert.ok(firstEvent > 1, 'gtag.js discards events queued ahead of the config');
  assert.equal(queue.filter((entry) => entry[0] === 'config').length, 1, 'config must not be re-queued per pageview');
});

test('every dataLayer entry is an Arguments object, as gtag.js expects', async () => {
  const { mod } = await loadAnalytics();
  mod.pageview('/', '');
  for (const entry of globalThis.window.dataLayer) {
    assert.equal(Object.prototype.toString.call(entry), '[object Arguments]');
  }
});

test('pageview forwards campaign params and drops everything else', async () => {
  const { mod, dataLayer } = await loadAnalytics();
  mod.pageview('/', 'utm_source=newsletter&utm_medium=email&email=jane%40acme.com&token=abc123&gclid=xyz');

  const set = dataLayer().find((entry) => entry[0] === 'set')[1];
  assert.ok(set.page_location.includes('utm_source=newsletter'), 'campaign attribution must survive');
  assert.ok(set.page_location.includes('utm_medium=email'));
  assert.ok(set.page_location.includes('gclid=xyz'));
  assert.ok(!set.page_location.includes('jane'), 'visitor email must never reach Google');
  assert.ok(!set.page_location.includes('email='));
  assert.ok(!set.page_location.includes('token'), 'opaque tokens must not be forwarded either');
});

test('the live /auth/confirm?email= route is never measured', async () => {
  // app/auth/actions.js redirects to /auth/confirm?email=<address> after
  // signup, and middleware.js does not cover /auth — so this is reachable.
  const redirect = source('app/auth/actions.js');
  assert.match(redirect, /\/auth\/confirm\?email=/, 'guard assumes this route still leaks an address into the URL');

  const { mod, dataLayer } = await loadAnalytics();
  mod.pageview('/auth/confirm', 'email=jane%40acme.com');
  assert.deepEqual(dataLayer(), [], 'auth routes must not produce a hit at all');
});

test('authenticated CRM routes are not measured', async () => {
  const { mod } = await loadAnalytics();
  for (const pathname of ['/dashboard', '/dashboard/projects/9f8e-uuid', '/team/projects/1', '/admin', '/admin/deals/42', '/login', '/signup']) {
    assert.equal(mod.isTrackablePath(pathname), false, `${pathname} carries client identifiers and must stay out of GA4`);
  }
  for (const pathname of ['/', '/work', '/services/web-design', '/contact', '/administrivia']) {
    assert.equal(mod.isTrackablePath(pathname), true, `${pathname} is a marketing route and should be measured`);
  }
});

test('later events inherit the current page, not the landing page', async () => {
  const { mod, dataLayer } = await loadAnalytics({ href: 'https://www.crystalwebsolution.com/' });
  mod.pageview('/', '');
  globalThis.document.title = 'Contact';
  mod.pageview('/contact', '');
  mod.trackEvent('generate_lead', { form_location: 'marketing' });

  const sets = dataLayer().filter((entry) => entry[0] === 'set');
  const last = sets.at(-1)[1];
  assert.equal(last.page_location, 'https://www.crystalwebsolution.com/contact', 'a conversion after an SPA navigation would otherwise report the landing page');
  assert.equal(last.page_title, 'Contact');
  assert.equal(last.page_referrer, 'https://www.crystalwebsolution.com/', 'in-site referrer should be the previous page, not the external one');

  const events = dataLayer().filter((entry) => entry[0] === 'event');
  assert.equal(events.at(-1)[1], 'generate_lead');
  assert.ok(dataLayer().indexOf(sets.at(-1)) < dataLayer().length - 1, 'set must precede the event it qualifies');
});

test('trackEvent tolerates missing or null params and ignores a missing name', async () => {
  const { mod, dataLayer } = await loadAnalytics();
  mod.trackEvent('a');
  mod.trackEvent('b', null);
  mod.trackEvent('');
  const events = dataLayer().filter((entry) => entry[0] === 'event');
  assert.deepEqual(events.map((entry) => entry[1]), ['a', 'b']);
  for (const entry of events) assert.deepEqual(entry[2], {});
});

test('CSP allows every Google host the tag needs', async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  const config = createRequire(import.meta.url)(path.join(ROOT, 'next.config.js'));
  const [rule] = await config.headers();
  const csp = rule.headers.find((header) => header.key === 'Content-Security-Policy').value;
  const directives = Object.fromEntries(
    csp.split('; ').map((directive) => {
      const [name, ...values] = directive.split(' ');
      return [name, values];
    }),
  );

  assert.ok(directives['script-src'].includes('https://www.googletagmanager.com'), 'gtag.js cannot load otherwise');
  for (const origin of [
    'https://www.googletagmanager.com',
    'https://www.google-analytics.com',
    'https://*.google-analytics.com',
    'https://analytics.google.com',
    'https://*.analytics.google.com',
    'https://stats.g.doubleclick.net',
    'https://*.g.doubleclick.net',
    'https://www.google.com',
  ]) {
    assert.ok(
      directives['connect-src'].includes(origin),
      `connect-src must allow ${origin} — a missing origin blocks hits silently, leaving the property empty with no error on the page`,
    );
  }
  assert.ok(directives['frame-src'].includes('https://td.doubleclick.net'), 'conversion linker iframe would fall back to default-src');

  // The Google origins share connect-src with Supabase; neither may displace the other.
  assert.ok(directives['connect-src'].includes('https://example.supabase.co'), 'Supabase XHR must still be allowed');
  assert.ok(directives['connect-src'].includes('wss://example.supabase.co'), 'Supabase realtime must still be allowed');
});

test('the tag component defers loading and delegates policy to the module', async () => {
  const code = source('components/Analytics.jsx');
  assert.match(code, /^'use client';/);
  assert.match(code, /strategy="afterInteractive"/, 'gtag must not block first paint');
  assert.match(code, /<Suspense fallback=\{null\}>/, 'useSearchParams must sit behind Suspense to keep pages static');
  assert.doesNotMatch(code, /gtag\('config'|dataLayer\.push/, 'an inline snippet would reintroduce the config-ordering hazard');
  assert.match(code, /searchParams\.toString\(\)/, 'depending on the searchParams object double-counts hash navigations');
});

test('contact form reports generate_lead only on success, with no PII', async () => {
  const code = source('components/marketing/ContactForm.jsx');
  const failureReturn = code.indexOf('return;', code.indexOf('if (!response.ok)'));
  const eventIndex = code.indexOf("trackEvent('generate_lead'");
  assert.ok(eventIndex > failureReturn && failureReturn !== -1, 'a rejected submission must return before the lead event fires');

  // Parse the whole call, not just its first line: reformatting the argument
  // list across lines previously let added PII fields slip past this check.
  const call = code.slice(eventIndex);
  const paramsObject = call.slice(call.indexOf('{'), call.indexOf('}') + 1);
  const keys = [...paramsObject.matchAll(/(\w+):/g)].map((match) => match[1]);
  assert.deepEqual(keys.sort(), ['budget', 'form_location'], 'generate_lead may only carry non-identifying fields');
  assert.ok(!/values\.(name|email|brief|company)/.test(paramsObject), 'contact details must never be sent to GA4');
});
