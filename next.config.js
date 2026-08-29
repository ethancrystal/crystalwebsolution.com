/** @type {import('next').NextConfig} */

const { withSentryConfig } = require('@sentry/nextjs');
const shouldUploadSentrySourceMaps = process.env.SENTRY_UPLOAD_SOURCEMAPS === 'true' && Boolean(process.env.SENTRY_AUTH_TOKEN);

// Supabase is the live CRM backend: the browser client opens XHR + websocket
// connections straight to the project host, so connect-src must allow it or
// login/CRM breaks at runtime under CSP. Derived from the same public env var
// the client is constructed with (lib/supabase/browser.js) rather than
// hardcoded, so preview/staging projects work too.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseOrigin = (() => {
  if (!supabaseUrl) return '';
  try {
    return new URL(supabaseUrl).origin;
  } catch {
    return '';
  }
})();
const supabaseWs = supabaseOrigin.replace(/^https:/, 'wss:');

// GA4 loads gtag.js from googletagmanager.com and beacons hits to the
// google-analytics.com collection endpoints — including regional subdomains
// (region1.google-analytics.com and friends), which is why the wildcards are
// needed. Without these the tag loads but every hit is blocked by CSP and the
// property stays at zero with no visible error on the page.
const GA_SCRIPT_ORIGIN = 'https://www.googletagmanager.com';
const GA_CONNECT_ORIGINS = [
  'https://www.googletagmanager.com',
  'https://www.google-analytics.com',
  'https://*.google-analytics.com',
  'https://analytics.google.com',
  'https://*.analytics.google.com',
  // Google Signals / Ads linking sends extra hits here. Omitting them is the
  // same silent partial failure as above: demographics, remarketing audiences
  // and Ads conversion import stop working with nothing logged on the page.
  'https://stats.g.doubleclick.net',
  'https://*.g.doubleclick.net',
  'https://www.google.com',
];

// The conversion linker uses an iframe; default-src 'self' would block it.
const GA_FRAME_ORIGINS = ['https://td.doubleclick.net'];

// The dark auth pages used to load an UnicornStudio runtime from jsDelivr's
// GitHub CDN, which is why script-src once allowed https://cdn.jsdelivr.net.
// That component was replaced on 2026-08-25 by the procedural canvases in
// components/ui/dark-page-background.jsx, which render in-process and fetch
// nothing, so the origin is gone. tests/login-background.test.mjs asserts it
// stays gone — a stale allowlist entry widens the policy for no benefit.

const connectSrc = ["'self'", supabaseOrigin, supabaseWs, ...GA_CONNECT_ORIGINS]
  .filter(Boolean)
  .join(' ');

// Content-Security-Policy. 'unsafe-inline'/'unsafe-eval' in script-src are
// required by Next's inline bootstrap and by the R3F/GSAP runtime; tightening
// them needs a nonce refactor, tracked separately. blob: is allowed for
// script/worker because Three.js compiles shader workers from blob URLs.
//
// This policy is pinned token-for-token by tests/csp-policy.test.mjs. Editing
// any directive below fails that test by design: it is the review checkpoint
// for a security header, not a stale assertion to update mechanically. Add the
// token to the pinned table there too, and say in the PR what needs it and why
// a narrower one will not do.
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: ${GA_SCRIPT_ORIGIN}`,
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src ${connectSrc}`,
  "media-src 'self' data: blob:",
  `frame-src 'self' ${GA_FRAME_ORIGINS.join(' ')}`,
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

const nextConfig = {
  // Strict mode is intentionally OFF so the WebGL context isn't
  // double-created in dev. Do not turn it back on.
  reactStrictMode: false,
  // Standalone output traces only the node_modules the server actually
  // needs into .next/standalone — required for the slim Docker runner stage.
  output: 'standalone',
  outputFileTracingRoot: __dirname,
  // Security + privacy response headers. Screaming Frog flagged all four as
  // missing on 38/47 URLs ("Security: Missing … Header", 80.85% of the crawl).
  // Applied to every route; the site is served behind Vercel, these are additive.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Content-Security-Policy', value: CSP },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
};

module.exports = withSentryConfig(nextConfig, {
  org: 'crystal-web-solution',
  project: 'crystal-web-solution-crm',
  // Source-map upload remains disabled unless Vercel/CI supplies a token.
  authToken: process.env.SENTRY_AUTH_TOKEN,
  sourcemaps: { disable: !shouldUploadSentrySourceMaps },
  release: {
    create: shouldUploadSentrySourceMaps,
    finalize: shouldUploadSentrySourceMaps,
    deploy: shouldUploadSentrySourceMaps,
  },
  webpack: {
    unstable_sentryWebpackPluginOptions: {
      release: {
        create: shouldUploadSentrySourceMaps,
        finalize: shouldUploadSentrySourceMaps,
        deploy: shouldUploadSentrySourceMaps,
      },
    },
  },
  silent: !process.env.CI,
});
