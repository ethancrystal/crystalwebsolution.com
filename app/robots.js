import { SITE_ORIGIN } from '../lib/seo.mjs';

// Explicitly allow all crawlers (including AI crawlers — GPTBot, ClaudeBot,
// PerplexityBot inherit from '*') and point them at the sitemap.
//
// CRM and internal surfaces stay disallowed: they are thin, duplicate-titled,
// and behind a login, so they waste crawl budget and dilute the indexed set.
// The page-level `robots: { index: false }` metadata is the authoritative
// signal — these rules stop crawlers requesting them in the first place.
//
// /login and /signup were removed from this list on 2026-09-12 at the site
// owner's request: they are to be indexable. A Disallow here would have
// blocked crawlers from fetching the pages at all, so the noindex that used
// to sit on them could never have been seen either — both had to go together
// (app/login/layout.jsx, app/signup/layout.jsx).
//
// Deliberately still blocked: /login/{admin,client,employee} keep their own
// page-level noindex (role-specific, near-duplicate entry points), and
// /forgot-password is unchanged — neither was part of that request.
export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
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
