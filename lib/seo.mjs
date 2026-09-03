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
