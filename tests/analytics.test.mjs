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

// next.config.js reads env at module load, so the Supabase URL is set before
// requiring it. Asserting on the emitted header catches a broken CSP that
// source-matching would miss.
async function cspDirectives() {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  const require_ = createRequire(import.meta.url);
  const config = require_(path.join(ROOT, 'next.config.js'));
  const [rule] = await config.headers();
  const csp = rule.headers.find((h) => h.key === 'Content-Security-Policy').value;
  return Object.fromEntries(
    csp.split('; ').map((directive) => {
      const [name, ...values] = directive.split(' ');
      return [name, values];
    }),
  );
}

test('analytics module gates on a well-formed GA4 measurement ID', () => {
  const code = source('lib/analytics.js');
  assert.match(code, /NEXT_PUBLIC_GA_ID/, 'measurement ID must come from NEXT_PUBLIC_GA_ID');
  assert.match(code, /\^G-\[A-Z0-9\]/i, 'the ID is interpolated into a script src and must be format-checked');
  assert.match(code, /export const GA_ID/, 'GA_ID must be exported for the tag component');
});

test('trackEvent and pageview no-op without an ID or a browser', () => {
  const code = source('lib/analytics.js');
  for (const fn of ['trackEvent', 'pageview']) {
    const body = code.slice(code.indexOf(`export function ${fn}`));
    assert.match(body.slice(0, 400), /if \(!GA_ID \|\| typeof window === 'undefined'/, `${fn} must bail out server-side and when analytics is off`);
  }
});

test('events queue onto dataLayer rather than requiring window.gtag', () => {
  const code = source('lib/analytics.js');
  assert.match(code, /window\.dataLayer = window\.dataLayer \|\| \[\]/, 'must create the queue itself');
  assert.doesNotMatch(code, /window\.gtag\(/, 'depending on window.gtag drops events fired before gtag.js loads');
});

test('gtag config is queued ahead of the first event, not from an inline script', () => {
  const code = source('lib/analytics.js');
  assert.match(code, /pushToDataLayer\('config', GA_ID, \{ send_page_view: false \}\)/, 'config must be queued from the module');
  assert.match(code, /send_page_view: false/, "gtag's own pageview only fires on document load and would double-count the first view");

  // Both senders must configure the stream first: gtag.js drains dataLayer in
  // order and discards events that precede the config.
  for (const fn of ['trackEvent', 'pageview']) {
    const body = code.slice(code.indexOf(`export function ${fn}`));
    const guarded = body.slice(0, body.indexOf('pushToDataLayer('));
    assert.match(guarded, /ensureConfigured\(\)/, `${fn} must call ensureConfigured() before queueing`);
  }

  const component = source('components/Analytics.jsx');
  assert.doesNotMatch(
    component,
    /gtag\('config'|dataLayer\.push/,
    'an inline afterInteractive snippet can execute after React effects, losing the first pageview',
  );
});

test('CSP script-src allows the gtag.js host', async () => {
  const directives = await cspDirectives();
  assert.ok(
    directives['script-src'].includes('https://www.googletagmanager.com'),
    'gtag.js is blocked from loading without its origin in script-src',
  );
});

test('CSP connect-src allows every GA4 collection endpoint', async () => {
  const directives = await cspDirectives();
  for (const origin of [
    'https://www.googletagmanager.com',
    'https://www.google-analytics.com',
    'https://*.google-analytics.com',
    'https://analytics.google.com',
    'https://*.analytics.google.com',
  ]) {
    assert.ok(
      directives['connect-src'].includes(origin),
      `connect-src must allow ${origin} — otherwise the tag loads, every hit is blocked, and the property stays empty with no visible error`,
    );
  }
});

test('adding GA origins did not displace the Supabase connect-src entries', async () => {
  const directives = await cspDirectives();
  assert.ok(directives['connect-src'].includes("'self'"));
  assert.ok(directives['connect-src'].includes('https://example.supabase.co'), 'Supabase XHR must still be allowed');
  assert.ok(directives['connect-src'].includes('wss://example.supabase.co'), 'Supabase realtime must still be allowed');
});

test('root layout mounts the analytics tag', () => {
  const layout = source('app/layout.jsx');
  assert.match(layout, /import Analytics from '\.\.\/components\/Analytics'/);
  assert.match(layout, /<Analytics \/>/, 'the tag has to be rendered, not just imported');
});

test('root layout exposes Search Console verification only when configured', () => {
  const layout = source('app/layout.jsx');
  assert.match(layout, /NEXT_PUBLIC_GSC_VERIFICATION/);
  assert.match(layout, /verification: \{ google: process\.env\.NEXT_PUBLIC_GSC_VERIFICATION \}/);
  assert.match(layout, /\?\s*\{ verification/, 'unset env var must omit the tag rather than emit an empty one');
});

test('the tag component defers loading and owns route pageviews', () => {
  const code = source('components/Analytics.jsx');
  assert.match(code, /^'use client';/, 'must be a client component');
  assert.match(code, /strategy="afterInteractive"/, 'gtag must not block first paint');
  assert.match(code, /<Suspense fallback=\{null\}>/, 'useSearchParams must sit behind Suspense to keep pages static');
  assert.match(code, /usePathname|useSearchParams/, 'App Router navigations need a manual pageview');
});

test('contact form reports generate_lead only after the API accepts the brief', () => {
  const code = source('components/marketing/ContactForm.jsx');
  assert.match(code, /import \{ trackEvent \} from '\.\.\/\.\.\/lib\/analytics'/);
  assert.match(code, /trackEvent\('generate_lead'/);

  const failureStart = code.indexOf('if (!response.ok)');
  const failureReturn = code.indexOf('return;', failureStart);
  const eventIndex = code.indexOf("trackEvent('generate_lead'");
  assert.ok(failureStart !== -1 && failureReturn !== -1, 'the non-ok response branch should still exist');
  assert.ok(eventIndex > failureReturn, 'a rejected submission must return before the lead event fires');

  const eventCall = code.slice(eventIndex);
  const params = eventCall.slice(0, eventCall.indexOf('\n'));
  for (const field of ['values.name', 'values.email', 'values.brief', 'values.company']) {
    assert.ok(!params.includes(field), `generate_lead must not send PII (${field})`);
  }
});
