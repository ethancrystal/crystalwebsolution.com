// GA4 bridge. Every entry point here is a no-op unless a valid measurement ID
// is configured, so pages render and forms submit identically with analytics
// switched off (local dev, preview deploys, CI).
//
// NEXT_PUBLIC_* is inlined at build time, so changing NEXT_PUBLIC_GA_ID in
// Vercel requires a redeploy before the tag appears.

const MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]{4,}$/i;

const configured = (process.env.NEXT_PUBLIC_GA_ID || '').trim();

// The ID is interpolated into a <script src>, so a malformed value is dropped
// rather than passed through.
export const GA_ID = MEASUREMENT_ID_PATTERN.test(configured) ? configured : '';

export function isAnalyticsEnabled() {
  return Boolean(GA_ID);
}

function pushToDataLayer() {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(arguments);
}

let bootstrapped = false;

// gtag.js drains dataLayer in order and discards events queued ahead of the
// stream's config. Because the tag loads afterInteractive, a route effect can
// fire before it — so the config is pushed from here, on first use, instead of
// from an inline script whose execution order isn't guaranteed relative to
// React's effects. Without this the first pageview of every session is lost.
function ensureConfigured() {
  if (bootstrapped) return;
  bootstrapped = true;
  pushToDataLayer('js', new Date());
  // App Router navigations don't reload the document, so gtag's own pageview
  // would fire once and never again. pageview() below owns them instead.
  pushToDataLayer('config', GA_ID, { send_page_view: false });
}

// Queues onto dataLayer directly instead of requiring window.gtag, so events
// fired before the tag finishes loading are still delivered.
export function trackEvent(name, params = {}) {
  if (!GA_ID || typeof window === 'undefined' || !name) return;
  ensureConfigured();
  pushToDataLayer('event', name, params);
}

export function pageview(path) {
  if (!GA_ID || typeof window === 'undefined' || !path) return;
  ensureConfigured();
  pushToDataLayer('event', 'page_view', {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  });
}
