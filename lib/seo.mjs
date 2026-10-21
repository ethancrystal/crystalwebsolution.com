// Canonical origin for the whole site.
//
// cdsportswearusa.com (production from 2026-08-27) was replaced by this
// domain on 2026-09-03 and now 301-redirects here (verified 2026-09-27) — see
// CLAUDE.md. This is the second such move (crystalwebsolution.com ->
// cdsportswearusa.com was #164); both are Vercel/DNS-layer changes with no
// other record in this repo.
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

// Homepage identity copy: the default <title> stem, meta/social descriptions
// and the Organization node, read by app/layout.jsx so each string has one
// home. Owner-approved 2026-10-18 after the homepage began leading with
// embroidery digitizing and patches (docs/seo/STRATEGY.md §2). The page keeps
// "Web Design" in the title; `/` is mapped to the brand term only, the head
// terms live on the /services/* pillars. Limits are pinned by
// tests/home-positioning-copy.test.mjs: the stem stays under 40 characters so
// the ` | CD Sportswear INC` suffix does not push the title past ~60, and every
// description stays under 155. No year figure belongs in any of them:
// SITE.founded and SITE.experience are unresolved against the 16-years claim.
export const HOME_TITLE_STEM = 'Embroidery Digitizing & Web Design';

export const HOME_DESCRIPTION =
  'Embroidery digitizing and custom patches, with every file sew-out tested before production. Websites, branding and AI automation from the same team.';

export const HOME_SOCIAL_DESCRIPTION =
  'Embroidery digitizing, patches and production, with web, brand and AI automation from the same team.';

export const ORG_DESCRIPTION =
  'Embroidery digitizing and patch production, with a digital studio for websites, brand systems, motion and AI automation.';

// The web terms stay: they tie the entity to the /services/* pillars.
export const ORG_KNOWS_ABOUT = Object.freeze([
  'web design',
  'web development',
  'branding',
  'logo design',
  'AI automation',
  'motion design',
  'embroidery digitizing',
  'custom patches',
  'sticker production',
  'vector artwork preparation',
]);

/** Absolute URL for a site-relative path. `absoluteUrl('/work')` -> origin + '/work'. */
export function absoluteUrl(path = '/') {
  if (!path || path === '/') return `${SITE_ORIGIN}/`;
  return `${SITE_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
}

// Hosts this site has used in production. Blog markdown (and any other
// author-supplied href) that still points at the apex or a retired domain
// should become a site-relative path so crawlers and visitors land on the
// canonical host instead of a 308, a 301, or — for crystalwebsolution.com —
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
