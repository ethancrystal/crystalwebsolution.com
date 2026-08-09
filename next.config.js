/** @type {import('next').NextConfig} */

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

const connectSrc = ["'self'", supabaseOrigin, supabaseWs].filter(Boolean).join(' ');

// Content-Security-Policy. 'unsafe-inline'/'unsafe-eval' in script-src are
// required by Next's inline bootstrap and by the R3F/GSAP runtime; tightening
// them needs a nonce refactor, tracked separately. blob: is allowed for
// script/worker because Three.js compiles shader workers from blob URLs.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:",
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src ${connectSrc}`,
  "media-src 'self' data: blob:",
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

module.exports = nextConfig;
