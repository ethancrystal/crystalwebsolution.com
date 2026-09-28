import { SITE_ORIGIN } from '../lib/seo.mjs';

// Explicitly allow all crawlers (including AI search crawlers) and point them
// at the sitemap.
//
// CRM surfaces are disallowed: they are thin, duplicate-titled, and behind a
// login, so they waste crawl budget and dilute the indexed set. The page-level
// `robots: { index: false }` metadata is the authoritative signal — these rules
// stop crawlers requesting them in the first place.
//
// /login and /signup are deliberately NOT disallowed: since 2026-09-24 (MJ) they
// carry a page-level `noindex, follow`, and a crawler has to be able to fetch
// them to see it — disallowing them here would stop them being dropped. The three
// role-specific portals under /login/* stay blocked — they are duplicates of
// /login with no public audience — and keep their own page-level noindex.
const PRIVATE_PATHS = [
  '/login/admin',
  '/login/client',
  '/login/employee',
  '/forgot-password',
  '/auth/',
  '/dashboard',
  '/dashboard/',
  '/admin',
  '/admin/',
  '/team',
  '/team/',
  '/api/',
];

// AI search / answer-engine crawlers and Bingbot are named on purpose (the
// cds-seo-operator AI-visibility lane). They share ONE group with '*' because
// a crawler obeys only the most specific group matching its user agent
// (RFC 9309 §2.2.1) — it does not merge in '*'. When each had its own
// `Allow: /` group (until 2026-09-26), none of them inherited the private-path
// disallows above.
const NAMED_CRAWLERS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'PerplexityBot',
  'Bingbot',
  'Applebot',
  'Google-Extended',
];

// No `host`: the Host directive is non-standard (Google ignores it) and is
// not part of RFC 9309. The canonical host is carried by canonicals and the
// sitemap instead.
export default function robots() {
  return {
    rules: [
      {
        userAgent: ['*', ...NAMED_CRAWLERS],
        allow: '/',
        disallow: PRIVATE_PATHS,
      },
    ],
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
  };
}
