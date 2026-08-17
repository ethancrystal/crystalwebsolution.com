import { SITE_ORIGIN } from '../lib/seo.mjs';

// Explicitly allow all crawlers (including AI crawlers — GPTBot, ClaudeBot,
// PerplexityBot inherit from '*') and point them at the sitemap.
//
// Auth/CRM surfaces are disallowed: they are thin, duplicate-titled, and
// behind a login, so they waste crawl budget and dilute the indexed set.
// The page-level `robots: { index: false }` metadata is the authoritative
// signal — these rules stop crawlers requesting them in the first place.
export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/login',
          '/login/',
          '/signup',
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
