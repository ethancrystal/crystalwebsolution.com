# Integration

## External services

- Supabase: Auth, Postgres, Storage and Realtime. Clients are in `lib/supabase/{browser,server,admin}.js`, and the service-role client is server-only.
- Resend: transactional email in `lib/email/resend.js` and `lib/email/templates.js`, covering contact notifications, invites and the CRM outbox.
- Upstash Redis: sliding-window rate limits in `lib/rateLimit.mjs`, used by the contact route and the unauthenticated auth actions.
- hCaptcha: `lib/hcaptcha.mjs`. Enforced only when its secret is configured.
- Sentry: `instrumentation*.js`, `sentry.*.config.js`, and `withSentryConfig` in `next.config.js`.
- GA4 with Consent Mode: `lib/analytics.mjs`, `components/Analytics.jsx`, `components/ConsentBanner.jsx`.

## Calling conventions

- Optional services fail open: rate limiting when Redis is missing or erroring, hCaptcha when unconfigured.
- The contact route succeeds if either the webhook or the email lands. The CRM lead write is best-effort.
- Email failures throw `EmailError` with a `retryable` flag. The cron route retries up to five times with backoff.
- `NEXT_PUBLIC_*` values are inlined at build time, so changing one needs a production rebuild.
- `lib/seo.mjs` `SITE_ORIGIN` is the single record of the production host.
