// Canonical origin for the whole site.
//
// The apex domain 308-redirects to www (verified: `curl -I
// https://crystalwebsolution.com/` -> 308 Location:
// https://www.crystalwebsolution.com/). Emitting apex URLs in canonicals,
// sitemap entries or the robots sitemap line therefore points search engines
// at a redirecting (non-indexable) URL. Screaming Frog flagged exactly that:
// "Canonicals: Non-Indexable Canonical" on 15/15 HTML pages.
//
// Every canonical, sitemap loc, JSON-LD @id and og:url must be built from this
// one constant so the host can never drift again.
export const SITE_ORIGIN = 'https://www.crystalwebsolution.com';

/** Absolute URL for a site-relative path. `absoluteUrl('/work')` -> origin + '/work'. */
export function absoluteUrl(path = '/') {
  if (!path || path === '/') return `${SITE_ORIGIN}/`;
  return `${SITE_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
}
