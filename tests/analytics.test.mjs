import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { readResolvedGlobalsCss } from './helpers/resolvedGlobalsCss.mjs';

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

function fakeStorage(initial = null, { throws = false } = {}) {
  let value = initial;
  return {
    getItem() {
      if (throws) throw new Error('storage blocked');
      return value;
    },
    setItem(_key, next) {
      if (throws) throw new Error('storage blocked');
      value = next;
    },
    read: () => value,
  };
}

async function loadAnalytics({ id = 'G-ABCD1234', href = 'https://www.crystalwebsolution.com/', referrer = '', title = 'Home', storage = fakeStorage() } = {}) {
  const url = new URL(href);
  globalThis.window = { location: { origin: url.origin, href }, localStorage: storage };
  globalThis.document = { title, referrer };
  process.env.NEXT_PUBLIC_GA_ID = id;
  instance += 1;
  const mod = await import(`../lib/analytics.mjs?case=${instance}`);
  return { mod, storage, dataLayer: () => (globalThis.window.dataLayer || []).map((entry) => Array.from(entry)) };
}

const DENIED = { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' };
const GRANTED = { ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted', analytics_storage: 'granted' };

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
  const js = queue.findIndex((entry) => entry[0] === 'js');
  const configIndex = queue.findIndex((entry) => entry[0] === 'config');
  assert.equal(queue[js][1] instanceof Date, true);
  assert.deepEqual(queue[configIndex], ['config', 'G-ABCD1234', { send_page_view: false }]);
  assert.ok(js < configIndex, 'js must precede config');

  const firstEvent = queue.findIndex((entry) => entry[0] === 'event');
  assert.ok(firstEvent > configIndex, 'gtag.js discards events queued ahead of the config');
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
  // signup. middleware.js's matcher covers /auth, but only redirects it away
  // when NEXT_PUBLIC_CRM_ENABLED is false; with the CRM launched, that branch
  // never fires, so this route is reachable in production.
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

test('blog posts are measured but blog authoring is not', async () => {
  // The blog landed on main after this branch opened. Its public pages are the
  // SEO surface and are the whole point of measuring; the authoring UI sits
  // under /admin and must stay out, like the rest of the CRM.
  const { mod } = await loadAnalytics();
  for (const pathname of ['/blog', '/blog/why-scroll-driven-sites-convert']) {
    assert.equal(mod.isTrackablePath(pathname), true, `${pathname} is public SEO content and should be measured`);
  }
  for (const pathname of ['/admin/blog', '/admin/blog/new', '/admin/blog/8f2c-uuid']) {
    assert.equal(mod.isTrackablePath(pathname), false, `${pathname} is authoring UI behind auth and must stay out of GA4`);
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

test('consent defaults to denied and is queued ahead of config', async () => {
  const { mod, dataLayer } = await loadAnalytics();
  mod.pageview('/', '');

  const queue = dataLayer();
  assert.deepEqual(queue[0].slice(0, 2), ['consent', 'default'], 'defaults arriving after config are too late to matter');
  assert.deepEqual({ ...queue[0][2], wait_for_update: undefined }, { ...DENIED, wait_for_update: undefined });
  assert.equal(queue[0][2].wait_for_update, 500, 'without a wait, first hits outrun a returning visitor’s stored grant');

  const configIndex = queue.findIndex((entry) => entry[0] === 'config');
  assert.ok(configIndex > 0, 'config must follow the consent default');
  assert.equal(queue.filter((entry) => entry[0] === 'consent').length, 1, 'an unchosen visitor gets defaults only, no update');
});

test('a stored grant is replayed on the next visit, before config', async () => {
  const { mod, dataLayer } = await loadAnalytics({ storage: fakeStorage('granted') });
  mod.pageview('/', '');

  const queue = dataLayer();
  const update = queue.findIndex((entry) => entry[0] === 'consent' && entry[1] === 'update');
  const config = queue.findIndex((entry) => entry[0] === 'config');
  assert.ok(update !== -1, 'a returning visitor should not be asked again');
  assert.deepEqual(queue[update][2], GRANTED);
  assert.ok(update < config, 'the grant must reach the tag before it decides what to store');
});

test('a stored denial is replayed too, and never silently upgrades', async () => {
  const { mod, dataLayer } = await loadAnalytics({ storage: fakeStorage('denied') });
  mod.pageview('/', '');
  const updates = dataLayer().filter((entry) => entry[0] === 'consent' && entry[1] === 'update');
  assert.equal(updates.length, 1);
  assert.deepEqual(updates[0][2], DENIED);
});

test('setConsent stores the choice and tells the tag exactly once', async () => {
  const { mod, storage, dataLayer } = await loadAnalytics();
  mod.pageview('/', '');
  assert.equal(mod.setConsent('granted'), 'granted');

  assert.equal(storage.read(), 'granted', 'the choice must survive a reload');
  const updates = dataLayer().filter((entry) => entry[0] === 'consent' && entry[1] === 'update');
  assert.equal(updates.length, 1, 'writing storage before configuring would replay the same choice twice');
  assert.deepEqual(updates[0][2], GRANTED);
});

test('a grant given before the first pageview still overrides the defaults', async () => {
  const { mod, dataLayer } = await loadAnalytics();
  mod.setConsent('granted');
  mod.pageview('/', '');

  const queue = dataLayer();
  assert.deepEqual(queue[0].slice(0, 2), ['consent', 'default'], 'defaults still come first');
  const updates = queue.filter((entry) => entry[0] === 'consent' && entry[1] === 'update');
  assert.equal(updates.length, 1, 'accepting before the first pageview must not double-push');
  assert.deepEqual(updates[0][2], GRANTED);
  // The update lands after config here, which is the normal live-choice path —
  // what matters is that the denied defaults were seen first.
  assert.ok(
    queue.findIndex((entry) => entry[0] === 'consent' && entry[1] === 'update') > queue.findIndex((entry) => entry[0] === 'consent' && entry[1] === 'default'),
  );
});

test('unknown or hostile consent values fall back to denied', async () => {
  const { mod, storage, dataLayer } = await loadAnalytics();
  mod.pageview('/', '');
  for (const value of ['yes', '', null, undefined, 'GRANTED', { toString: () => 'granted' }]) {
    assert.equal(mod.setConsent(value), 'denied', `${String(value)} must not be read as consent`);
  }
  assert.equal(storage.read(), 'denied');
  const updates = dataLayer().filter((entry) => entry[0] === 'consent' && entry[1] === 'update');
  for (const update of updates) assert.deepEqual(update[2], DENIED);
});

test('a corrupt or unwritable store degrades to asking again, not to consent', async () => {
  const { mod: corrupt } = await loadAnalytics({ storage: fakeStorage('totally-granted') });
  assert.equal(corrupt.readStoredConsent(), null, 'a junk value must not count as a choice');

  const { mod: blocked, dataLayer } = await loadAnalytics({ storage: fakeStorage(null, { throws: true }) });
  assert.equal(blocked.readStoredConsent(), null, 'Safari private mode throws rather than returning null');
  assert.equal(blocked.setConsent('granted'), 'granted', 'a throwing store must not break the choice');
  const updates = dataLayer().filter((entry) => entry[0] === 'consent' && entry[1] === 'update');
  assert.deepEqual(updates.at(-1)[2], GRANTED, 'the tag should still hear the grant even if it cannot be persisted');
});

test('consent is inert when analytics is disabled', async () => {
  const { mod, storage, dataLayer } = await loadAnalytics({ id: '' });
  mod.setConsent('granted');
  assert.deepEqual(dataLayer(), [], 'no tag means nothing to consent to');
  assert.equal(storage.read(), 'granted', 'the choice is still remembered for when the tag is switched on');
});

test('the banner is the only path to consent, and defers to the module', async () => {
  const code = source('components/ConsentBanner.jsx');
  assert.match(code, /^'use client';/);
  assert.match(code, /readStoredConsent\(\)/, 'a returning visitor must not be re-prompted');
  assert.match(code, /isTrackablePath\(pathname\)/, 'CRM routes measure nothing, so they should not prompt');
  assert.match(code, /setConsent\(/, 'the choice must go through the module that talks to the tag');
  assert.match(code, /'granted'/, 'accepting must be offered');
  assert.match(code, /'denied'/, 'declining must be as easy as accepting');
  assert.equal(
    (code.match(/<button/g) || []).length,
    2,
    'exactly two choices — an accept-only banner is not consent',
  );
  assert.doesNotMatch(code, /useState\(true\)/, 'rendering before the stored choice is read is a hydration mismatch');

  const css = readResolvedGlobalsCss(ROOT);
  assert.match(css, /\.consent \{/, 'the banner needs styles or it lands unstyled over the scene');
  const reducedMotionBlocks = css.match(/@media \(prefers-reduced-motion: reduce\)[^@]*/g) || [];
  assert.ok(
    reducedMotionBlocks.some((block) => /\.consent\b[\s\S]*animation: none/.test(block)),
    'the entrance animation must be disabled under reduced motion',
  );
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
