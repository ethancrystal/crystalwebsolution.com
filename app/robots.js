import { SITE_ORIGIN } from '../lib/seo.mjs';

// Explicitly allow all crawlers (including AI crawlers — GPTBot, ClaudeBot,
// PerplexityBot inherit from '*') and point them at the sitemap.
//
// CRM surfaces are disallowed: they are thin, duplicate-titled, and behind a
// login, so they waste crawl budget and dilute the indexed set. The page-level
// `robots: { index: false }` metadata is the authoritative signal — these rules
// stop crawlers requesting them in the first place.
//
// /login and /signup are deliberately NOT disallowed (MJ, 2026-09-11): they are
// public, brand-relevant entry points and are meant to be indexable. Their
// segment layouts now declare `robots: { index: true, follow: true }`. The three
// role-specific portals under /login/* stay blocked — they are duplicates of
// /login with no public audience — and keep their own page-level noindex.
export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
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
        ],
      },
    ],
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
    host: SITE_ORIGIN,
  };
}
