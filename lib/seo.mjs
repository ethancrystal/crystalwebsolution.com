// Canonical origin for the whole site.
//
// cdsportswearusa.com (production from 2026-08-27) was replaced by this
// domain; the old one is no longer attached to the Vercel project and
// returns DEPLOYMENT_NOT_FOUND as of 2026-09-03 — see CLAUDE.md. This is the
// second such move (crystalwebsolution.com -> cdsportswearusa.com was #164);
// both are Vercel/DNS-layer changes with no other record in this repo.
//
// The apex domain 308-redirects to www (verified: `curl -I
// https://cdsportswearinc.com/` -> 308 Location:
// https://www.cdsportswearinc.com/, 2026-09-03). Emitting apex URLs in
// canonicals, sitemap entries or the robots sitemap line therefore points
// search engines at a redirecting (non-indexable) URL. Screaming Frog
// flagged exactly that on the previous domain: "Canonicals: Non-Indexable
// Canonical" on 15/15 HTML pages.
//
// Every canonical, sitemap loc, JSON-LD @id and og:url must be built from this
// one constant so the host can never drift again.
export const SITE_ORIGIN = 'https://www.cdsportswearinc.com';

// Bare host (no scheme, no www) for contexts that name the domain in prose
// rather than a URL, e.g. an email footer. Derived so it can't drift from
// SITE_ORIGIN independently.
export const SITE_HOST = new URL(SITE_ORIGIN).host.replace(/^www\./, '');

export const SOCIAL_IMAGE_PATH = '/opengraph-image';

/** Absolute URL for a site-relative path. `absoluteUrl('/work')` -> origin + '/work'. */
export function absoluteUrl(path = '/') {
  if (!path || path === '/') return `${SITE_ORIGIN}/`;
  return `${SITE_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
}

// Hosts this site has used in production. Blog markdown (and any other
// author-supplied href) that still points at the apex or a retired domain
// should become a site-relative path so crawlers and visitors land on the
// canonical host instead of a 308, a 404, or — for crystalwebsolution.com —
// the gambling-spam site that currently answers that DNS.
export const OWN_HOSTNAMES = Object.freeze([
  new URL(SITE_ORIGIN).hostname,
  SITE_HOST,
  'cdsportswearusa.com',
  'www.cdsportswearusa.com',
  'crystalwebsolution.com',
  'www.crystalwebsolution.com',
]);

const OWN_HOST_SET = new Set(OWN_HOSTNAMES.map((host) => host.toLowerCase()));

/** Rewrite an owned-host absolute URL to a site-relative path; leave others. */
export function toSitePath(href) {
  if (typeof href !== 'string' || !href) return href;
  try {
    const url = new URL(href);
    if (!OWN_HOST_SET.has(url.hostname.toLowerCase())) return href;
    const path = `${url.pathname || '/'}${url.search}${url.hash}`;
    return path.startsWith('/') ? path : `/${path}`;
  } catch {
    return href;
  }
}
