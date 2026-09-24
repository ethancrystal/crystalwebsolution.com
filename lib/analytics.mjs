// GA4 bridge. Every entry point here is a no-op unless a valid measurement ID
// is configured, so pages render and forms submit identically with analytics
// switched off (local dev, preview deploys, CI).
//
// NEXT_PUBLIC_* is inlined at build time, so changing NEXT_PUBLIC_GA_ID in
// Vercel requires a redeploy before the tag appears.
//
// .mjs so the tests can import and execute this module rather than regex its
// source — same reason as lib/contactForm.mjs and lib/seo.mjs.

const MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]{4,}$/i;

const rawId = (process.env.NEXT_PUBLIC_GA_ID || '').trim();

// The ID is interpolated into a <script src>, so a malformed value is dropped
// rather than passed through.
export const GA_ID = MEASUREMENT_ID_PATTERN.test(rawId) ? rawId : '';

export function isAnalyticsEnabled() {
  return Boolean(GA_ID);
}

// Google Tag Manager runs alongside GA4, not instead of it: the container is
// for other tags (ads pixels, conversions). It must not also hold a GA4 tag
// for the same property, or every pageview is counted twice.
//
// Production builds only, so `next dev` never fires container tags. The ID
// defaults to the owner-supplied container; NEXT_PUBLIC_GTM_ID overrides it,
// and any value that isn't a container ID (e.g. "off") switches GTM off.
const GTM_ID_PATTERN = /^GTM-[A-Z0-9]{4,}$/i;
export const DEFAULT_GTM_ID = 'GTM-5VKPC974';

export function resolveGtmId(configured, nodeEnv) {
  if (nodeEnv !== 'production') return '';
  const raw = (configured || '').trim() || DEFAULT_GTM_ID;
  return GTM_ID_PATTERN.test(raw) ? raw : '';
}

export const GTM_ID = resolveGtmId(process.env.NEXT_PUBLIC_GTM_ID, process.env.NODE_ENV);

export function isTagManagerEnabled() {
  return Boolean(GTM_ID);
}

/** Any Google tag on the page means the consent banner has something to govern. */
export function isConsentRequired() {
  return isAnalyticsEnabled() || isTagManagerEnabled();
}

// Query strings reach Google inside page_location, so they are allowlisted
// rather than forwarded wholesale. The site puts real personal data in URLs —
// /auth/confirm?email=<address> is a live route (app/auth/actions.js) — and
// sending that to GA4 would breach Google's own no-PII terms as well as being
// a privacy leak. Campaign params have to survive or attribution breaks.
export const TRACKING_PARAMS = Object.freeze([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'gclid',
  'gbraid',
  'wbraid',
  'fbclid',
  'msclkid',
  'ref',
]);

const TRACKING_PARAM_SET = new Set(TRACKING_PARAMS);

/** Drops every query param except the campaign allowlist. Returns '' or '?a=b'. */
export function sanitizeSearch(search = '') {
  const kept = new URLSearchParams();
  for (const [key, value] of new URLSearchParams(search)) {
    if (TRACKING_PARAM_SET.has(key.toLowerCase())) kept.append(key, value);
  }
  const query = kept.toString();
  return query ? `?${query}` : '';
}

// Authenticated CRM and auth routes are not measured. Their URLs carry client
// project/deal UUIDs and account state, none of which belongs in a third-party
// analytics property the client never consented to. Marketing measurement is
// the point of this integration; the CRM has none to gain.
export const UNTRACKED_PREFIXES = Object.freeze([
  '/admin',
  '/auth',
  '/dashboard',
  '/forgot-password',
  '/login',
  '/signup',
  '/team',
]);

export function isTrackablePath(pathname) {
  if (typeof pathname !== 'string' || !pathname.startsWith('/')) return false;
  return !UNTRACKED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

// Consent Mode v2. All four signals start denied for everyone — no region
// carve-out, since client-side geolocation is guesswork and the honest default
// is the strict one. Denied does not mean silent: gtag still sends cookieless
// pings, so GA4 can model conversions until a visitor chooses.
export const CONSENT_STORAGE_KEY = 'cws:analytics-consent';

export const CONSENT_SIGNALS = Object.freeze([
  'ad_storage',
  'ad_user_data',
  'ad_personalization',
  'analytics_storage',
]);

function consentPayload(state) {
  const value = state === 'granted' ? 'granted' : 'denied';
  return Object.fromEntries(CONSENT_SIGNALS.map((signal) => [signal, value]));
}

/** 'granted' | 'denied' | null when the visitor hasn't chosen yet. */
export function readStoredConsent() {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    return stored === 'granted' || stored === 'denied' ? stored : null;
  } catch {
    // Safari private mode and blocked storage both throw. No stored choice.
    return null;
  }
}

function pushToDataLayer() {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(arguments);
}

let consentQueued = false;
let bootstrapped = false;
let tagManagerLoaded = false;
let lastLocation = '';

// Consent defaults have to be queued ahead of anything that reads dataLayer —
// gtag's config and gtm.js alike — or the tag has already decided what to
// store by the time it hears about them. wait_for_update holds the first hits
// briefly so a returning visitor's stored grant is applied to them rather
// than arriving too late.
function ensureConsentDefaults() {
  if (consentQueued) return;
  consentQueued = true;
  window.dataLayer = window.dataLayer || [];
  // Google Tag Assistant and any future standard Google snippet look for this.
  if (!window.gtag) window.gtag = pushToDataLayer;
  pushToDataLayer('consent', 'default', {
    ...consentPayload('denied'),
    wait_for_update: 500,
  });
  const stored = readStoredConsent();
  if (stored) pushToDataLayer('consent', 'update', consentPayload(stored));
}

// gtag.js drains dataLayer in order and discards events queued ahead of the
// stream's config, so the config is pushed from here — the same module that
// queues events — instead of from an inline script. That makes the ordering a
// property of the code rather than of script-injection timing.
function ensureConfigured() {
  if (bootstrapped) return;
  bootstrapped = true;
  ensureConsentDefaults();
  pushToDataLayer('js', new Date());
  // App Router navigations don't reload the document, so gtag's automatic
  // pageview would fire once and never again. pageview() owns them instead.
  pushToDataLayer('config', GA_ID, { send_page_view: false });
}

/**
 * Records the visitor's choice and tells the tag about it. Returns the value
 * actually stored, so callers don't have to re-derive it.
 */
export function setConsent(state) {
  const value = state === 'granted' ? 'granted' : 'denied';
  if (typeof window === 'undefined') return value;

  // Configure first, while storage still holds the *previous* answer, so
  // the defaults don't replay this same choice as a second update.
  if (GA_ID) ensureConfigured();
  else if (GTM_ID) ensureConsentDefaults();

  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, value);
  } catch {
    // Unwritable storage means we ask again next visit — annoying, not broken.
  }

  if (GA_ID || GTM_ID) pushToDataLayer('consent', 'update', consentPayload(value));
  return value;
}

/**
 * Injects gtm.js once, after the consent defaults are queued. Returns true
 * only on the call that actually loaded it.
 *
 * The caller loads it on public pages only. Once loaded it stays for the
 * session, so a visitor who clicks through to /login or /signup keeps it —
 * any container tag that auto-tracks page changes (history-change triggers,
 * SPA-aware pixels) must exclude UNTRACKED_PREFIXES, whose URLs can carry
 * personal data (/auth/confirm?email=).
 */
export function loadTagManager() {
  if (!GTM_ID || typeof window === 'undefined' || tagManagerLoaded) return false;
  tagManagerLoaded = true;
  ensureConsentDefaults();
  window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`;
  document.head.appendChild(script);
  return true;
}

// Queues onto dataLayer directly instead of requiring window.gtag, so events
// fired before the tag finishes loading are still delivered.
export function trackEvent(name, params) {
  if (!GA_ID || typeof window === 'undefined' || !name) return;
  ensureConfigured();
  pushToDataLayer('event', name, params || {});
}

export function pageview(pathname, search = '') {
  if (!GA_ID || typeof window === 'undefined') return;
  if (!isTrackablePath(pathname)) return;
  ensureConfigured();

  const location = `${window.location.origin}${pathname}${sanitizeSearch(search)}`;

  // gtag snapshots page_location/page_referrer at config time and reuses them
  // as the defaults for every later hit. Without this 'set', a generate_lead
  // fired after a client-side navigation would be attributed to the session's
  // landing page, and page_referrer would stay the external referrer forever.
  pushToDataLayer('set', {
    page_location: location,
    page_title: document.title,
    page_referrer: lastLocation || document.referrer || undefined,
  });
  pushToDataLayer('event', 'page_view');

  lastLocation = location;
}
