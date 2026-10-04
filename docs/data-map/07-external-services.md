# 07. External services and infrastructure

Chapter 07 of the data map. Machine-readable twin: `data/external.json` (domain `external`; format in `SCHEMA.md`).

Written 2026-10-01 against `1c17666` plus the uncommitted bug-fix work that was in the tree at that moment: `lib/appUrl.mjs` (new), and edits to `app/auth/actions.js`, `app/admin/users/actions.js`, `app/api/contact/route.js`, `app/api/cron/crm-notifications/route.js`, `lib/supabase/admin.js`, `scripts/provision-crm-test-users.mjs`. The starting inventory was written against `95f02c8`. `git diff 95f02c8 1c17666` touches only CRM code, tests, migrations `0049`/`0050`, `CLAUDE.md`, `CHANGELOG.md`, `VERSION` and `docs/seo/goals.md`. Every marketing and infrastructure claim below was re-read against current files, not carried over.

| Convention | Meaning |
| --- | --- |
| `path#symbol` | A name that appears in that file. Migrations use `path:line`. |
| UNVERIFIED | Needs a live dashboard, a vendor's behaviour, or `node_modules` (not readable in this session). Dashboard values are always UNVERIFIED from the repo. |
| **Edge:** | An edge case: trigger condition, then consequence. |
| `service_role` | The Supabase service-role key; bypasses RLS. |

Manifest `data/external.json`: 170 nodes and 223 edges. Nodes: 57 `env:`, 17 `ext:`, 34 `component:`, 20 `page:` (15 marketing routes, `sitemap.xml`, `robots.txt`, `opengraph-image`, `llms.txt`, the IndexNow key file), 18 `lib:`, 8 `script:`, 5 `event:`, 4 `workflow:`, 4 `storage:`, 2 `cookie:`, 1 `cron:`. Edges: 86 `configures`, 73 `feeds`, 16 `sends`, 14 `emits`, 8 `calls`, 7 `reads`, 7 `gets`, 6 `sets`, 2 `uploads`, and one each of `submits`, `inserts`, `updates`, `upserts`. Endpoints owned by other fragments: `route:POST /api/contact`, `route:GET /api/cron/crm-notifications`, the tables `blog_posts`, `profiles`, `projects`, `project_messages`, `project_tasks`, and `component:components/Loader.jsx` (frame).

Retired domains. `crystalwebsolution.com` (now a third-party site) and `cdsportswearusa.com` (301 to the live host) appear below only as things that must never receive traffic or links. Live hosts: `https://www.cdsportswearinc.com` (marketing) and `https://app.cdsportswearinc.com` (portal).

---

## 1. Environment variables

**57 variables**: 9 public (`NEXT_PUBLIC_*`), 14 secret, 27 non-secret settings, 7 platform-provided. The 13 CRM preview fixture variables share three rows in the table; the manifest keeps one node each (`env:<NAME>`). Secrets: `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `HCAPTCHA_SECRET`, `UPSTASH_REDIS_REST_TOKEN`, `CRM_CRON_SECRET`, `CRON_SECRET`, `CONTACT_WEBHOOK_URL`, `SENTRY_AUTH_TOKEN`, `CRM_PREVIEW_CLIENT_A_PASSWORD`, `CRM_PREVIEW_CLIENT_B_PASSWORD`, `CRM_PREVIEW_EMPLOYEE_PASSWORD`, `CRM_PREVIEW_ADMIN_PASSWORD`, `GITHUB_TOKEN`, `OPENAI_API_KEY`. `CONTACT_WEBHOOK_URL` is counted as a secret because webhook URLs usually embed a token.

Where values live: Vercel Project Settings per environment (UNVERIFIED), GitHub repository secrets and variables (UNVERIFIED), `.env.local` for local runs and Docker Compose. `README.md:46` tells people to copy `.env.example`; that file does not exist in the repo (`.gitignore` whitelists it with `!.env.example`). This table is the only checked-in inventory.

Column key. Kind: `public` is a `NEXT_PUBLIC_*` value, `secret` must never reach a client or a log, `config` is a non-secret setting, `platform` is provided by Vercel, Next or GitHub. Runtime is where the code reads it: `client-inlined` (replaced by a literal at build, in client, server and edge bundles alike), `server`, `edge`, `build`, `ci`, `script`.

| Name | Kind | Runtime | Read at | Fallback | What breaks or degrades |
| --- | --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | public | client-inlined + server + edge + build | `next.config.js#supabaseUrl`<br>`middleware.js#supabaseUrl`<br>`lib/supabase/server.js#supabaseUrl`<br>`lib/supabase/browser.js#createClient`<br>`lib/supabase/admin.js#createAdminClient`<br>`lib/auth/require-role.js#requireRole`<br>`lib/crm/blog.js#publicClient`<br>`scripts/seo/publish-blog-drafts.mjs#main`<br>`Dockerfile#NEXT_PUBLIC_SUPABASE_URL` | none (publish script tries SUPABASE_URL first) | Unset or not http(s): next.config.js drops the Supabase origin and its wss: twin from CSP connect-src, so every browser call (CRM reads, Realtime, Storage) is blocked while the build still passes. browser.js throws on first use, server.js throws "Supabase authentication is not configured", middleware sends portal paths to <login>?error=configuration, /blog and the sitemap return no posts, createAdminClient hands supabase-js an undefined URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | client-inlined + server + edge | `middleware.js#supabaseAnonKey`<br>`lib/supabase/server.js#supabaseAnonKey`<br>`lib/supabase/browser.js#createClient`<br>`lib/auth/require-role.js#requireRole`<br>`lib/crm/blog.js#publicClient`<br>`Dockerfile#NEXT_PUBLIC_SUPABASE_ANON_KEY` | none | Same failure set as the URL minus the CSP effect. Public by design: RLS is the boundary. A wrong key makes every anon/user call fail with an auth error. |
| `NEXT_PUBLIC_APP_URL` | public | client-inlined + server + build | `lib/appUrl.mjs#readEnv`<br>`Dockerfile#NEXT_PUBLIC_APP_URL`<br>`docker-compose.yml#NEXT_PUBLIC_APP_URL`<br>`.github/workflows/docker-ci.yml#NEXT_PUBLIC_APP_URL`<br>via `getAppUrl()`: `lib/supabase/admin.js#buildVerifyUrl`, `app/auth/actions.js#getAppUrl`, `app/admin/users/actions.js#getAppUrl`, `app/api/contact/route.js#dealUrlFor`, `app/api/cron/crm-notifications/route.js#drain` | Vercel Preview: https://$VERCEL_URL. Non-production: http://localhost:3000. Production: none (throws AppUrlError). | Unset, invalid, path/query/credentials-bearing, a retired host, or (Vercel Production) not https: getAppUrl() throws. signUp and invite return "temporarily unavailable" before any account or link exists; resend-confirmation and password reset return their generic success with no email; the cron drain returns 503 and leaves the outbox untouched; the contact email goes out without its "View in CRM" link. Value is baked at build. |
| `NEXT_PUBLIC_CRM_ENABLED` | public | client-inlined + edge + build | `lib/crmFlag.js#CRM_ENABLED`<br>`next.config.js#crmEnabled` | enabled unless the trimmed, lower-cased value is exactly "false" | 0, off, no or a typo leave the CRM public. "false": middleware redirects every matched portal path home, the host split collapses to app->www only, and Nav/Menu/SubpageNav hide the login links. Parsed twice (lib/crmFlag.js and next.config.js) with the same expression; the two must agree. |
| `NEXT_PUBLIC_GA_ID` | public | client-inlined | `lib/analytics.mjs#GA_ID` | "" (must match /^G-[A-Z0-9]{4,}$/i) | Unset or malformed: the gtag script, RouteTracker, pageview() and trackEvent() all no-op, so generate_lead never reaches the dataLayer even when GTM is on. A well-formed but unserved ID loads a 404 script and counts nothing. docs/ANALYTICS.md records Production set to G-B42BM1Q95J, whose gtag/js 404s (confirmed 2026-09-28; current state UNVERIFIED). |
| `NEXT_PUBLIC_GTM_ID` | public | client-inlined | `lib/analytics.mjs#GTM_ID` | GTM-KJZPCQNM (DEFAULT_GTM_ID) whenever NODE_ENV is production; always off otherwise | A non-container value (for example "off") disables GTM. Unset keeps the production container on in every production build: Vercel previews, CI builds, the ghcr image and local pnpm build/start. |
| `NEXT_PUBLIC_GSC_VERIFICATION` | public | client-inlined + server | `app/layout.jsx#metadata` | omitted | Unset: no google-site-verification meta (right for previews). Set on a preview: that host claims the Search Console property. |
| `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` | public | client-inlined + server | `lib/hcaptcha.mjs#INLINED_SITE_KEY`<br>`lib/hcaptcha.mjs#getHCaptchaSiteKey` | HCAPTCHA_DEFAULT_SITE_KEY, the production site key hard-coded in lib/hcaptcha.mjs | A key from a different hCaptcha site than HCAPTCHA_SECRET belongs to: hCaptcha answers with a mismatch code, which the code maps to "rejected" (400, "complete the security check") on every attempt; only invalid/missing-input-secret maps to 503. |
| `NEXT_PUBLIC_SENTRY_DSN` | public | client-inlined | `instrumentation-client.js#dsn` | undefined: browser SDK sends nothing | Not a Docker build arg, so the self-hosted image has no browser reporting. A DSN on another ingest host (EU, or non-regional oNNN.ingest.sentry.io) is blocked by CSP, which only allows *.ingest.us.sentry.io. |
| `SUPABASE_SERVICE_ROLE_KEY` | secret | server + ci + script | `lib/supabase/admin.js#createAdminClient`<br>`scripts/seo/publish-blog-drafts.mjs#main`<br>`scripts/provision-crm-test-users.mjs#getSupabase`<br>`.github/workflows/seo-publish-blog.yml#SUPABASE_SERVICE_ROLE_KEY` | none | createAdminClient throws: signUp/invite answer "temporarily unavailable", the contact route skips the CRM write silently, the cron drain returns 503. The publish script warns and exits 0. Bypasses RLS, so only server code, CI and scripts may hold it. In Docker it must be supplied at run time, not build time (Dockerfile comment). |
| `RESEND_API_KEY` | secret | server | `lib/email/resend.js#isEmailConfigured`<br>`lib/email/resend.js#getResendClient` | none | isEmailConfigured() is false: the contact route relies on the webhook alone (503 if there is no webhook either); the cron drain returns 503 after attachment cleanup; sendEmail throws a non-retryable EmailError (signUp reports "Account created, but the confirmation email failed", resend/reset swallow it). |
| `HCAPTCHA_SECRET` | secret | server | `lib/hcaptcha.mjs#hasSecret`<br>`lib/hcaptcha.mjs#verifyHCaptchaToken` | none | VERCEL_ENV=production: every contact submission returns 503 (fail closed, reason "misconfigured"). Elsewhere verification is skipped ("not-enforced"). A wrong secret makes hCaptcha answer invalid-input-secret, which is also 503 and logged. |
| `UPSTASH_REDIS_REST_URL` | config | server | `lib/rateLimit.mjs#configured`<br>`lib/rateLimit.mjs#defaultStrictLimit` | none | See the token row; both must be set for the limiter to exist. |
| `UPSTASH_REDIS_REST_TOKEN` | secret | server | `lib/rateLimit.mjs#configured`<br>`lib/rateLimit.mjs#redis`<br>`lib/rateLimit.mjs#checkRateLimitStrict` | none | Contact form: Production returns 503 for every submission (fail closed, "not-configured"); non-production lets it through. Auth actions (signUp, resend, reset): no throttling at all (fail open), with one console.warn in production. |
| `CRM_CRON_SECRET` | secret | server | `app/api/cron/crm-notifications/route.js#isAuthorised` | none | Accepted alongside CRON_SECRET; with neither set the endpoint always answers 401. Must equal Supabase Vault crm_cron_secret (pg_cron sends it as x-cron-secret); on mismatch pg_cron calls get 401 and the outbox stops draining, and the watchdog and its Sentry warning live inside the same route, so they stay silent too. |
| `CRON_SECRET` | secret | server | `app/api/cron/crm-notifications/route.js#isAuthorised` | none | Vercel Cron sends Authorization: Bearer $CRON_SECRET only when a variable of this name exists (route.js comment); if only CRM_CRON_SECRET is set, the daily Vercel cron gets 401 every day. pg_cron is unaffected. |
| `CONTACT_WEBHOOK_URL` | secret | server | `app/api/contact/route.js#webhookUrl` | unset: email-only delivery | Treated as a secret because webhook URLs usually embed a token. Receives the full lead (name, email, company, budget, brief). Unreachable or slow: aborted after CONTACT_WEBHOOK_TIMEOUT_MS and counted "not delivered"; the visitor still sees success if the email went. Unset and no RESEND_API_KEY: 503. |
| `CONTACT_WEBHOOK_TIMEOUT_MS` | config | server | `app/api/contact/route.js#webhookTimeoutMs` | 5000; values outside 500-10000 or non-integers fall back to 5000 | Too low drops slow-but-working webhooks; the route waits at most this long before moving on. |
| `RESEND_FROM_EMAIL` | config | server | `lib/email/resend.js#getFromAddress` | CD Sportswear INC <no-reply@cdsportswearinc.com> (DEFAULT_FROM) | A domain Resend has not verified gets a 4xx, which isRetryableStatus treats as terminal; the outbox marks the row provider_terminal. |
| `RESEND_REPLY_TO` | config | server | `lib/email/resend.js#getReplyToAddress` | SITE.email (sales@cdsportswearinc.com) | Replies to every automated mail except the contact notification (which sets replyTo to the visitor) go to this address. |
| `CONTACT_NOTIFICATION_EMAIL` | config | server | `lib/email/resend.js#getOperationsAddress` | SITE.email (sales@cdsportswearinc.com) | Recipient of every contact brief. A wrong value silently redirects lead mail; there is no delivery check. |
| `SENTRY_DSN` | config | server + edge | `sentry.server.config.js#dsn`<br>`sentry.edge.config.js#dsn` | undefined: server and edge SDKs send nothing | Server and edge errors (including onRequestError) are lost. Not a secret in the credential sense (a DSN only permits ingest) but kept server-side. |
| `SENTRY_AUTH_TOKEN` | secret | build | `next.config.js#authToken`<br>`next.config.js#shouldUploadSentrySourceMaps` | none | No source-map upload and no release create/finalize/deploy; browser and server stack traces stay minified. Needs SENTRY_UPLOAD_SOURCEMAPS=true as well. |
| `SENTRY_UPLOAD_SOURCEMAPS` | config | build | `next.config.js#shouldUploadSentrySourceMaps` | off unless the value is exactly "true" and SENTRY_AUTH_TOKEN is set | Any other value, including "1" or "TRUE", leaves sourcemaps disabled. |
| `TRUSTED_PROXY_HOPS` | config | server | `lib/rateLimit.mjs#getClientIp` | unset: no client IP off Vercel | Read only when VERCEL is not "1" (Docker, own proxy). Must be an integer 1-5. Unset there: getClientIp returns null, the contact limiter treats the request as allowed (not production) and the auth limiters fail open, so the self-hosted image does no throttling. |
| `NODE_ENV` | platform | server + edge + client-inlined + build | `instrumentation-client.js#isDevelopment`<br>`sentry.server.config.js#isDevelopment`<br>`sentry.edge.config.js#isDevelopment`<br>`lib/analytics.mjs#resolveGtmId`<br>`lib/rateLimit.mjs#checkRateLimit`<br>`lib/appUrl.mjs#readEnv`<br>`Dockerfile#NODE_ENV` | set by Next (production for next build/start) | Sentry environment is this value, so Vercel previews and Production both report "production". It also turns on the default GTM container and the strict app-URL rules. |
| `NEXT_RUNTIME` | platform | server + edge | `instrumentation.js#register` | set by Next | Decides whether sentry.server.config.js (nodejs) or sentry.edge.config.js (edge) loads. |
| `NEXT_PHASE` | platform | build | `app/sitemap.js#duringBuild` | set by Next | phase-production-build lets the sitemap fall back to its static route list if the post read fails (CI builds against a placeholder Supabase URL). |
| `VERCEL_ENV` | platform | server | `app/api/sentry-verification/route.js#GET`<br>`lib/hcaptcha.mjs#isProduction`<br>`lib/rateLimit.mjs#isProductionDeployment`<br>`lib/appUrl.mjs#readEnv` | unset off Vercel | "production" switches on fail-closed contact limiting, mandatory hCaptcha and the https-only app URL. "preview" opens /api/sentry-verification and the VERCEL_URL app-URL fallback. Docker and local runs are never "production" by this test. |
| `VERCEL` | platform | server | `lib/rateLimit.mjs#getClientIp` | unset off Vercel | "1" makes getClientIp trust x-real-ip / x-vercel-forwarded-for and ignore a client-sent x-forwarded-for. |
| `VERCEL_URL` | platform | server | `lib/appUrl.mjs#readEnv` | unset off Vercel | Used only on a Vercel Preview with NEXT_PUBLIC_APP_URL unset: emailed links become https://$VERCEL_URL. |
| `CI` | platform | build + ci | `next.config.js#silent` | set by GitHub Actions | The Sentry build plugin is silent unless CI is set (silent: !process.env.CI). |
| `PORT` | config | server | `Dockerfile#PORT` | 3000 (Dockerfile ENV) | Read by the Next standalone server.js, not by repo code (consumer inside node_modules UNVERIFIED). |
| `HOSTNAME` | config | server | `Dockerfile#HOSTNAME` | 0.0.0.0 (Dockerfile ENV) | Read by the Next standalone server.js, not by repo code (consumer inside node_modules UNVERIFIED). |
| `SUPABASE_URL` | config | script + ci | `scripts/seo/publish-blog-drafts.mjs#main`<br>`scripts/provision-crm-test-users.mjs#getSupabase`<br>`scripts/verify-crm-preview-authorization.mjs#signIn`<br>`.github/workflows/seo-publish-blog.yml#SUPABASE_URL` | publish script falls back to NEXT_PUBLIC_SUPABASE_URL; the others have none | Whichever project this names is the one written to. Nothing in the repo checks that it is not production. Stored as a GitHub secret. |
| `SUPABASE_ANON_KEY` | config | script | `scripts/verify-crm-preview-authorization.mjs#signIn` | none | The preview-authorization script refuses to run. Public by design, like the NEXT_PUBLIC_ twin. |
| `SEO_BLOG_COVERS_BUCKET` | config | script + ci | `scripts/seo/publish-blog-drafts.mjs#BUCKET`<br>`.github/workflows/seo-publish-blog.yml#SEO_BLOG_COVERS_BUCKET` | blog-covers (a GitHub repository variable in CI) | Names the Storage bucket for cover uploads. No migration creates blog-covers, so a draft with cover_image fails until the bucket exists. |
| `LIVECHECK_BASE_URL` | config | script | `scripts/livecheck.mjs#BASE` | http://localhost:3000 | Points the Playwright smoke check at another deployment. Read-only. |
| `CRM_PREVIEW_ENVIRONMENT` | config | script | `scripts/verify-crm-preview-authorization.mjs#configuredPreview` | none | Must equal "preview" or the script refuses. The guard is self-declared: nothing stops pointing it at production credentials. |
| `CRM_PREVIEW_{CLIENT_A,CLIENT_B,EMPLOYEE,ADMIN}_EMAIL` (4) | config | script | `scripts/verify-crm-preview-authorization.mjs#REQUIRED_ENV` | none | Login of one fixture user; any missing variable aborts the script. |
| `CRM_PREVIEW_{CLIENT_A,CLIENT_B,EMPLOYEE,ADMIN}_PASSWORD` (4) | secret | script | `scripts/verify-crm-preview-authorization.mjs#REQUIRED_ENV` | none | Password of the fixture user above; any missing variable aborts the script. |
| `CRM_PREVIEW_{CLIENT_A,CLIENT_B}_PROJECT_ID`, `CRM_PREVIEW_EMPLOYEE_{ASSIGNED,UNASSIGNED}_PROJECT_ID`, `CRM_PREVIEW_CLIENT_A_THREAD_ID` (5) | config | script | `scripts/verify-crm-preview-authorization.mjs#REQUIRED_ENV` | none | Row ids the script probes for allow and deny; any missing variable aborts the script. |
| `CRM_TEST_EMPLOYEE_EMAIL` | config | script | `scripts/provision-crm-test-users.mjs#EMPLOYEE_EMAIL` | ethan+employee@cdsportswearinc.com | Added by the uncommitted bug-fix work (not in 1c17666). The script refuses any retired-domain address (isRetiredDomainEmail). |
| `CRM_TEST_CLIENT_EMAIL` | config | script | `scripts/provision-crm-test-users.mjs#CLIENT_EMAIL` | ethan+client@cdsportswearinc.com | Same as the employee address. |
| `GITHUB_TOKEN` | secret | ci | `.github/workflows/docker-ci.yml#GITHUB_TOKEN`<br>`.github/workflows/dependabot-auto-merge.yml#GITHUB_TOKEN` | issued per workflow run by GitHub | docker-ci uses it to log in to ghcr (packages: write); dependabot-auto-merge passes it as GH_TOKEN to gh pr merge (contents/pull-requests: write). |
| `SUPABASE_AUTH_SITE_URL` | config | script | `supabase/config.toml:160` | none in the file | Supabase CLI only (supabase start): the local stack's Auth site_url. The hosted project's Site URL is a dashboard setting, UNVERIFIED from the repo. |
| `OPENAI_API_KEY` | secret | script | `supabase/config.toml:101` | none | Supabase CLI only: enables the Studio AI assistant on the local stack. Unset leaves it off (UNVERIFIED CLI behaviour). |

### 1.1 Rules behind every row

| Rule | Evidence |
| --- | --- |
| `NEXT_PUBLIC_*` values are inlined at build, into the client bundle and the server bundle. Changing one in Vercel does nothing until a rebuild; in Docker they are build args and `docker run -e` changes nothing. | `Dockerfile` comment above `ARG NEXT_PUBLIC_SUPABASE_URL`; `lib/analytics.mjs` header; `CLAUDE.md` |
| A literal `process.env.NEXT_PUBLIC_X` is required for inlining. Reading it off an object (`env.X`) gives `undefined` in the browser. | `lib/hcaptcha.mjs#INLINED_SITE_KEY`; `lib/appUrl.mjs#readEnv` |
| Not in the table: the commented or disabled sections of `supabase/config.toml` (Twilio, Apple, S3, SMTP: lines 271, 323, 355, 428-434); dev tooling (`CLAUDE_PROJECT_DIR` in `.claude/hooks` and `.codex/hooks`, `GITHUB_TOKEN` in three `.cursor/skills/*/scripts`); workflow step variables (`GH_TOKEN`, `PR_URL`, `EVENT_NAME`, `DRY_RUN`, `TAGS`, `DIGEST`, `REGISTRY`, `IMAGE_NAME`). | grep of `process.env` and `env(` |
| Tests set their own environment. `vitest.setup.js` and `vitest.config.js` set none. | `vitest.setup.js` |

### 1.2 Secret-to-client exposure check

Method. Every module whose first statement is `'use client'` (140 files) was followed through static and dynamic imports, relative and `@/`, to 193 reachable modules. Traversal stops at `'use server'` modules, because a client import of a Server Action is a reference, not the code. Every `process.env.X` and injected `env.X` in the reached set was listed.

| Reached module | Env reads | Verdict |
| --- | --- | --- |
| `lib/analytics.mjs` | `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_GTM_ID`, `NODE_ENV` | public |
| `lib/crmFlag.js` | `NEXT_PUBLIC_CRM_ENABLED` | public |
| `lib/supabase/browser.js` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public by design |
| `lib/hcaptcha.mjs` | `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` (literal); `env.HCAPTCHA_SECRET`, `env.VERCEL_ENV` (injected `env` parameter) | secret is not inlined: a property read off a parameter compiles to a runtime lookup, `undefined` in the browser |

Result: no secret is read by a literal `process.env` in client-reachable code; `next.config.js` has no `env:` block; no `NEXT_PUBLIC_` name holds a secret. Nothing leaks today. What keeps it that way is convention only:

- **Edge:** `lib/hcaptcha.mjs` is imported by client components (`components/marketing/ContactForm.jsx`, `HCaptcha.jsx`) and also holds the `HCAPTCHA_SECRET` read. Trigger: someone rewrites that read as a literal `process.env.HCAPTCHA_SECRET` inside this shared module. Consequence: still not inlined into the client (the name is not public), so no leak, but a secret read sits in a file the browser bundle imports, and no test or lint rule guards the split.
- **Edge:** nothing uses the `server-only` package (grep of `app`, `lib`, `components`, `package.json`). Trigger: a client component imports `lib/supabase/admin.js`, `lib/email/resend.js` or `lib/rateLimit.mjs`. Consequence: server code is bundled for the browser; the secrets read as `undefined`, so the failure is a confusing runtime error rather than a leak.
- **Edge:** `.dockerignore` excludes `.env` and `.env.local` only, while the builder stage runs `COPY . .` (`Dockerfile`). Trigger: a `.env.production` or `.env.production.local` in the build context. Consequence: Next reads it at build and inlines its `NEXT_PUBLIC_*` values into the image; whether non-public values also survive into the standalone output is UNVERIFIED. `.gitignore` blocks `.env*`, so this needs a local file.

### 1.3 Edge cases in the variables

- **Edge:** `NEXT_PUBLIC_APP_URL`, after the bug-fix work. Trigger: unset in a Vercel Production build, or set to a retired host, a URL with a path, query or credentials, or (Vercel Production only) `http://`. Consequence: `getAppUrl()` (`lib/appUrl.mjs`) throws before any account, link or outbox claim exists (see the row above for each caller's outcome). Before the fix the committed code emitted `undefined/auth/verify?token_hash=...` for an unset value and would have mailed one-time sign-in tokens to whichever host the value named.
- **Edge:** Docker and Compose images. Trigger: the image is built with `NEXT_PUBLIC_APP_URL` empty (the `build` job reads `vars.NEXT_PUBLIC_APP_URL`; Compose defaults to `http://localhost:3000`). Consequence: `VERCEL_ENV` is unset and `NODE_ENV` is `production`, so `getAppUrl()` throws for every auth email. A value like `http://localhost:3000` passes, because https is only required when `VERCEL_ENV=production`.
- **Edge:** preview deployments are not "production" for any check (`VERCEL_ENV=preview`). Trigger: Preview env lacks `HCAPTCHA_SECRET` or Upstash. Consequence: hCaptcha is skipped and the contact limiter lets everything through. If a preview also shares Production's Supabase and Resend values (UNVERIFIED), a preview submission writes a real CRM lead and sends real mail.
- **Edge:** `NEXT_PUBLIC_GTM_ID` defaults on. Trigger: any `NODE_ENV=production` build with the variable unset: previews, CI, the ghcr image, a local `pnpm build && pnpm start`. Consequence: the production container `GTM-KJZPCQNM` loads and its data mixes preview traffic into production. Set it to `off` where that is unwanted.
- **Edge:** `NEXT_PUBLIC_GA_ID`. Trigger: Production still holds `G-B42BM1Q95J` (`docs/ANALYTICS.md`, confirmed 2026-09-28; today UNVERIFIED). Consequence: `gtag/js` 404s and GA4 records nothing; the fix is a dashboard change to `G-YENE9MFT5K` plus a redeploy. Nothing in the repo can detect it.
- **Edge:** `NEXT_PUBLIC_CRM_ENABLED` fails open. Trigger: unset, or any value other than `false` (`0`, `off`, `no`). Consequence: portals stay public.
- **Edge:** the cron secret has two names. Trigger: only `CRM_CRON_SECRET` set. Consequence: Vercel's daily call gets 401 (Vercel sends only `CRON_SECRET`). Trigger: Vault `crm_cron_secret` differs from the Vercel value. Consequence: pg_cron's 5-minute calls get 401, the outbox stops draining, and the watchdog (inside the same route) cannot report it.
- **Edge:** Sentry `environment` is `NODE_ENV`. Trigger: any Vercel preview. Consequence: previews report as `production`, including the deliberate error from `/api/sentry-verification`.

---

## 2. Outbound services

### 2.0 Overview

| Service | Origin | Data out | Credential | Consent | If it fails |
| --- | --- | --- | --- | --- | --- |
| Supabase Auth | `<NEXT_PUBLIC_SUPABASE_URL>/auth/v1` | email, password, name, token_hash, JWTs | anon key; service role for `auth.admin.*` | none (functional) | portal middleware redirects to login (closed); must-set-password gate fails open |
| Supabase Postgres | `/rest/v1` | every CRM query and RPC | anon + user JWT; service role | none | public blog readers return `[]`; sitemap keeps the last copy; contact CRM write is best-effort |
| Supabase Storage | `/storage/v1` | project files, blog covers | user JWT; service role | none | upload errors shown; cleanup retried from a durable queue |
| Supabase Realtime | `wss://<ref>.supabase.co/realtime/v1` | channel joins, presence `{userId, name}` | user JWT | none | live updates stop silently |
| Resend | `https://api.resend.com` | recipient, subject, HTML, text, reply-to, tags | `RESEND_API_KEY` | none | typed `EmailError`; callers differ (2.2) |
| hCaptcha | `js.hcaptcha.com`, `*.hcaptcha.com`, `api.hcaptcha.com` | device signals; secret, token, sitekey, client IP | site key (public) + `HCAPTCHA_SECRET` | none | production fails closed (503/400) |
| Upstash Redis | host in `UPSTASH_REDIS_REST_URL` | IPs and normalised emails as keys | `UPSTASH_REDIS_REST_TOKEN` | none | contact fails closed in production; auth fails open |
| Sentry | `*.ingest.us.sentry.io` | errors, 10% traces, replay, URLs with query strings | DSNs; `SENTRY_AUTH_TOKEN` at build | none | silent loss |
| GA4 | `www.googletagmanager.com`, `*.google-analytics.com` and others | sanitised page_location, title, referrer, `generate_lead` | public measurement ID | Consent Mode v2, default denied | no-op without a valid ID; CSP failures are silent |
| GTM | `www.googletagmanager.com` | whatever the container sends | public container ID | loads before consent | non-Google container tags are CSP-blocked, silently |
| Trustpilot | `widget.trustpilot.com` | IP, user agent, business-unit id | public embed values | none | fallback text link |
| Contact webhook | `CONTACT_WEBHOOK_URL` | full lead | the URL | none | counted not delivered after 5 s |

### 2.1 Supabase (Auth, Postgres, Storage, Realtime)

Project reference `wmnjosiikehsuaqucvja` appears in `.mcp.json` (development MCP only). That the Vercel Production variables name the same project is UNVERIFIED. All four services share one host derived from `NEXT_PUBLIC_SUPABASE_URL`; CSP `connect-src` carries that origin and its `wss:` twin, built at `next.config.js#supabaseOrigin`.

Clients:

| Client | Built in | Key | Runs in | RLS |
| --- | --- | --- | --- | --- |
| Browser | `lib/supabase/browser.js#createClient` | anon + user JWT from the `sb-*` cookie | CRM client components under `app/admin`, `app/dashboard`, `app/team`, `components/crm`, `lib/useUserRole.js` | applies |
| Server | `lib/supabase/server.js#createClient` | anon + JWT through `cookies()` | server components, actions, route handlers, `lib/auth/require-role.js`, blog readers (`lib/crm/blog.js#optionalClient`) | applies |
| Middleware | `middleware.js#middleware` | anon + JWT from request cookies | edge, every portal path | applies |
| Public anon | `lib/crm/blog.js#publicClient` | anon, no session | `app/sitemap.js` through `listPublishedSlugs` | applies as `anon` |
| Admin | `lib/supabase/admin.js#createAdminClient` | `service_role` | `app/auth/actions.js`, `app/admin/users/actions.js`, `app/api/contact/route.js`, `app/api/cron/crm-notifications/route.js` | bypassed |
| Scripts | `scripts/seo/publish-blog-drafts.mjs`, `scripts/provision-crm-test-users.mjs` (`service_role`); `scripts/verify-crm-preview-authorization.mjs` (anon + fixture passwords) | | CI or manual | mixed |

**Auth**

| Call | From | Data out | When |
| --- | --- | --- | --- |
| `auth.getUser()` | `middleware.js#middleware` and 18 other sites (`lib/auth/require-role.js`, pages, actions) | JWT | every portal request: one network call to Auth each |
| `signInWithPassword` | `app/auth/actions.js#signIn` | email, password | sign-in; no app-level throttle (Supabase's own limits UNVERIFIED) |
| `auth.admin.generateLink` | `app/auth/actions.js#signUp` (type signup, with password and `{full_name, account_type}`), `#resendConfirmationEmail`, `#requestPasswordReset` (recovery), `app/admin/users/actions.js#inviteUser` (invite) | email, redirectTo, metadata | after the rate-limit check and, now, after `getAppUrl()` |
| `verifyOtp` | `app/auth/verify/route.js` | token_hash, type | emailed link clicked |
| `exchangeCodeForSession` | `app/auth/callback/route.js` | PKCE code | OAuth/PKCE return |
| `updateUser` | `app/auth/actions.js#updatePassword` | new password | reset or invite completion |
| `auth.admin.getUserById` | `app/api/cron/crm-notifications/route.js` (2 sites) | user id | resolving recipient and client emails per drain |
| `auth.admin.deleteUser` | `app/admin/users/actions.js#inviteUser` (2 sites) | user id | rollback when role assignment or the invite email fails |

- **Edge:** `signUp` creates the Auth user (through `generateLink`) before it sends the confirmation mail. Trigger: Resend fails. Consequence: the account exists unconfirmed and the form says "Account created, but the confirmation email failed", which is the only path where the message is not generic. `resendConfirmationEmail` and `requestPasswordReset` always return success.
- **Edge:** `inviteUser` calls `admin_set_user_role` and sends mail after creating the user. Trigger: either step fails. Consequence: the user is deleted again, so a retry starts clean.
- **Edge:** middleware's `current_user_must_set_password` RPC fails open (`middleware.js#passwordCheckError`). Trigger: migration `0039` missing or the RPC erroring. Consequence: an invitee with no password reaches portal pages; only a `console.error` records it.

**Postgres (PostgREST and RPC).** Browser and server clients run RLS-scoped table queries (at least 18 tables: `profiles`, `companies`, `contacts`, `deals`, `tasks`, `notes`, `projects`, `project_*`, `blog_posts`, `notifications_outbox`) and more than 30 RPCs; the table and function inventory is `01-data-dictionary.md` and `01b-database-logic.md`. From this chapter's code: the contact route calls `create_lead_from_contact` as `service_role` (arguments `p_name`, `p_email`, `p_company`, `p_brief`, `p_budget`, `p_source`), and the publish script writes `blog_posts` as `service_role`.

**Storage.** Browser uploads to `project-files` happen in `components/crm/useProjectThread.js` and `components/crm/ProjectFiles.jsx` (user JWT, reserve-then-finalize through RPCs). A server action issues 60-second signed download URLs (`app/actions/project-actions.js`, `createSignedUrl(path, 60)`). The cron route deletes objects as `service_role` (`app/api/cron/crm-notifications/route.js`, two `remove` calls, through the durable cleanup queue of migration `0048`). The CI script uploads covers to a second bucket; see 4.2.

**Realtime.** `lib/crm/projectRealtime.js#subscribeProjectTopics` authenticates the socket (`supabase.realtime.setAuth()`), joins private channels `project:<id>:shared` and `project:<id>:internal` (clients get `shared` only: `components/crm/useProjectLive.js`), listens to five broadcast events (`PROJECT_EVENTS`) and tracks presence `{userId, name}` on the shared topic. Failure: `console.warn`, no retry UI.

- **Edge:** presence publishes the signed-in user's full name to everyone on the shared topic, clients and staff alike. Trigger: any client or staff member opens a project page. Consequence: names (not emails) are visible to other participants. Intended per the comment in `useProjectLive.js`, noted here as a disclosure.

### 2.2 Resend

One boundary, `lib/email/resend.js#sendEmail`. Sender `RESEND_FROM_EMAIL` or `CD Sportswear INC <no-reply@cdsportswearinc.com>`; domain verified in Resend since 2026-09-15 (`CLAUDE.md`, UNVERIFIED now). Resend's acceptable-use policy forbids cold outreach from this account (`CLAUDE.md`); nothing in the code sends any.

| Tag (`category`) | Caller | Recipient | Content | On send failure |
| --- | --- | --- | --- | --- |
| `signup-confirm` | `app/auth/actions.js#signUp` | the signer | name, one-time verify link | returns "Account created, but the confirmation email failed" |
| `signup-confirm` | `#resendConfirmationEmail` | the address typed | name, verify link | logged; generic success |
| `password-reset` | `#requestPasswordReset` | the address typed | verify link | logged; generic success |
| `password-changed` | `#updatePassword` | the signed-in user | name, notice | logged; password change stands |
| `invite` | `app/admin/users/actions.js#inviteUser` | invitee | name, role, verify link | user deleted; error shown |
| `contact-form` | `app/api/contact/route.js` | `CONTACT_NOTIFICATION_EMAIL`, reply-to = visitor | name, email, company, budget, brief, optional deal link | logged; counts toward the 202/502 decision |
| `contact-ack` | same | the visitor's address | first name only | swallowed |
| `crm-notification` | `app/api/cron/crm-notifications/route.js` | CRM users | project names, statuses, message excerpts, task titles and due dates; for staff also client name, email, company, phone, lead details | retry with backoff, see below |

Cron delivery: idempotency key `outbox-<row id>` (Resend de-duplicates 24 hours); retryable errors (network, 429, 5xx) back off 1, 5, 15, 60, 180 minutes up to 5 attempts; other 4xx are terminal (`provider_terminal`). `scripts/provision-crm-test-users.mjs` imports `sendInviteEmail` and defines `sendUserInvite` but never calls it.

- **Edge:** every email embeds `${SITE_ORIGIN}${SITE.logoPath}` (`lib/email/templates.js`). Trigger: a recipient opens the mail. Consequence: their client requests the logo from the marketing host; hosting logs see an open signal.
- **Edge:** at-least-once delivery. Trigger: Resend accepts the mail but `mark_notification_email_sent` fails or loses its lease, and the row is reclaimed after 24 hours. Consequence: a duplicate send (history: migration `0033`, fixed by `0045`; `docs/CRM-OPERATIONS.md`).

### 2.3 hCaptcha

Browser: `components/marketing/HCaptcha.jsx#loadHCaptchaScript` injects `https://js.hcaptcha.com/1/api.js?render=explicit` on mount of any page that renders `ContactForm`: `/`, `/contact`, `/about`, `/process`, `/services/[slug]` (not `/services`, `/work`, `/embroidery-...`, `/hire/...`). The widget renders dark, normal size, with the site key; hCaptcha receives device and behaviour signals directly. A 10-second loader timeout calls `onUnavailable`, after which `ContactForm` refuses to send and shows the `mailto:` address.

Server: `lib/hcaptcha.mjs#verifyHCaptchaToken` posts `secret`, `response`, `sitekey` and `remoteip` (the client IP) to `https://api.hcaptcha.com/siteverify`.

| Condition | `status` | Route answer |
| --- | --- | --- |
| No secret, not production | `passed` (`not-enforced`) | continues |
| No secret, `VERCEL_ENV=production` | `unavailable` (`misconfigured`) | 503, `Retry-After: 120` |
| Secret set, token missing, blank or over 4096 chars | `rejected` | 400 |
| siteverify non-2xx, or network error | `unavailable` | 503 |
| `success: true` | `passed` | continues |
| `invalid-input-secret` or `missing-input-secret` | `unavailable` (`misconfigured`) | 503, logged |
| Any other `success: false` | `rejected` | 400 |

- **Edge:** tokens are single-use. Trigger: any non-2xx answer. Consequence: `ContactForm` bumps `resetSignal`, so the visitor must solve again.
- **Edge:** the honeypot field `website` is sent to the webhook as an empty string (`validation.data` is forwarded whole); a non-empty value never gets past the 400.

### 2.4 Upstash Redis

`lib/rateLimit.mjs` builds sliding-window limiters (`@upstash/ratelimit` 2.0.8, `analytics: false`) with prefix `ratelimit:<bucket>`.

| Bucket | Identifier stored as key | Budget | Policy | Caller |
| --- | --- | --- | --- | --- |
| `contact` | client IP | 5 per 600 s | strict: closed in production | `app/api/contact/route.js` |
| `auth:signup:ip`, `auth:signup:email` | IP; normalised email | 5 per 600 s each | open | `app/auth/actions.js#signUp` |
| `auth:resend:ip`, `auth:resend:email` | same | same | open | `#resendConfirmationEmail` |
| `auth:reset:ip`, `auth:reset:email` | same | same | open | `#requestPasswordReset` |

Client IP (`getClientIp`): on Vercel (`VERCEL=1`) only `x-real-ip` then `x-vercel-forwarded-for`; elsewhere `x-forwarded-for` counted from the right by `TRUSTED_PROXY_HOPS` (1-5); otherwise `null`.

- **Edge:** personal data at a third party. Trigger: any signup, resend, reset or contact attempt. Consequence: a plaintext email address or IP is stored as a Redis key for at least the window. Not disclosed on `/privacy`.
- **Edge:** the contact budget is spent before validation and before hCaptcha (`route.js` checks the limit first). Trigger: six attempts in ten minutes from one IP, valid or not. Consequence: the sixth gets 429; one shared office address can lock others out.
- **Edge:** no trustworthy IP. Trigger: production request with no `x-real-ip` (UNVERIFIED that Vercel can omit it). Consequence: contact returns 503 (`no-client-ip`); auth actions skip the IP bucket and rely on the email bucket.
- **Edge:** `docs/CRM-OPERATIONS.md` still says the first `x-forwarded-for` entry is used. The code no longer reads a client-sent header on Vercel. The document is stale.
- **Edge:** the self-hosted image. Trigger: Docker without `TRUSTED_PROXY_HOPS` and without Upstash. Consequence: no throttling on any endpoint.

### 2.5 Sentry

| Aspect | Client (`instrumentation-client.js`) | Server (`sentry.server.config.js`) | Edge (`sentry.edge.config.js`) |
| --- | --- | --- | --- |
| DSN | `NEXT_PUBLIC_SENTRY_DSN` | `SENTRY_DSN` | `SENTRY_DSN` |
| `environment` | `NODE_ENV` | `NODE_ENV` | `NODE_ENV` |
| PII flags | `sendDefaultPii: false`; `dataCollection: {userInfo: false, httpBodies: []}` | same | same |
| Traces | 1.0 in development, else 0.1; no spans for `/api/health` and `/api/cron/crm-notifications` | `tracesSampler`: 0 for those two routes, else 0.1 | 0.1 |
| Trace propagation | `['localhost', /^\//]`: same-origin only | | |
| Replay | `maskAllText`, `maskAllInputs`, `blockAllMedia`, `block: ['iframe']`, `networkCaptureBodies: false`; 0.1 of sessions, 1.0 on error | none | none |
| Loaded by | Next client instrumentation | `instrumentation.js#register` when `NEXT_RUNTIME=nodejs` | same, when `edge` |

Build: `next.config.js#withSentryConfig` (org `crystal-web-solution`, project `crystal-web-solution-crm`) uploads source maps and creates the release only when `SENTRY_UPLOAD_SOURCEMAPS=true` and `SENTRY_AUTH_TOKEN` are both set. No `tunnelRoute`, no `beforeSend`, `beforeBreadcrumb` or `denyUrls` anywhere (grep).

Explicit captures: `app/error.jsx` (tag `surface: app-error-boundary`), `app/global-error.jsx`, `app/api/sentry-verification/route.js` (preview only, returns 500 by design), `app/api/cron/crm-notifications/route.js#watchOutbox` (`captureMessage` with counters only), and automatic `onRequestError` and router-transition capture.

- **Edge:** URLs carry personal and tenant data. Trigger: an error, a sampled trace, or a replayed session on `/auth/confirm?email=<address>`, `/login?next=...`, or `/dashboard/projects/<uuid>`. Consequence: the full URL including the query string is stored at Sentry; `sendDefaultPii: false` does not strip it. Replay runs on every route, including admin and team, with no consent and no mention on `/privacy`.
- **Edge:** `dataCollection` is not an option I could confirm for `@sentry/nextjs` 10.70.0 (UNVERIFIED; `node_modules` unreadable). If the SDK ignores it, only `sendDefaultPii` applies.
- **Edge:** fetch breadcrumbs. Trigger: an error after CRM queries. Consequence: Sentry's default breadcrumbs include Supabase request URLs with row filters (UUIDs). Default behaviour, UNVERIFIED here.
- **Edge:** CSP allows only `https://*.ingest.us.sentry.io`. Trigger: a DSN on the EU host or the non-regional host. Consequence: browser envelopes are blocked silently.
- **Edge:** no tunnel route. Trigger: visitors with ad blockers. Consequence: browser errors from them never arrive.
- **Edge:** the Docker image gets no `NEXT_PUBLIC_SENTRY_DSN` (not a build arg), so it has no browser reporting.

### 2.6 GA4, GTM and consent

Load sequence:

| Step | Code | Condition |
| --- | --- | --- |
| 1. Inline `<script>` first in `<head>` | `app/layout.jsx` renders `lib/analytics.mjs#gtmHeadSnippet(GTM_ID)` | `GTM_ID` set (default on in production builds). The script returns at once when `location.pathname` is in `UNTRACKED_PREFIXES`. Otherwise it queues `consent default` (four signals denied, `wait_for_update: 500`), replays a stored choice, sets `__cwsConsentQueued` and `__cwsGtmLoaded`, pushes `{gtm.start, event: 'gtm.js'}` and appends `gtm.js?id=<GTM_ID>`. |
| 2. `<noscript>` iframe | `app/layout.jsx` (`ns.html?id=<GTM_ID>`) | rendered on every route, including `/login` and `/dashboard`; ignores `UNTRACKED_PREFIXES` and consent |
| 3. gtag loader | `components/Analytics.jsx` `<Script src=".../gtag/js?id=GA_ID" strategy="afterInteractive">` | `GA_ID` valid |
| 4. Per-navigation page view | `components/Analytics.jsx#RouteTracker` -> `lib/analytics.mjs#pageview` | `GA_ID` valid and `isTrackablePath`; first call runs `ensureConfigured` (`consent default` if not yet queued, `js`, `config` with `send_page_view: false`) |
| 5. GTM fallback | `components/Analytics.jsx#TagManagerLoader` -> `loadTagManager` | document opened on an untracked path, then navigated to a public one |
| 6. Banner | `components/ConsentBanner.jsx` | `isConsentRequired()` (GA or GTM on), trackable path, no stored choice |

Consent model: all four Consent Mode v2 signals (`ad_storage`, `ad_user_data`, `ad_personalization`, `analytics_storage`) start `denied` for everyone; Accept sets all four `granted`, Decline all four `denied`; the choice lives in `localStorage` (section 6). Denied still sends cookieless pings (code comment, Google behaviour UNVERIFIED). `page_location` is origin + path + only the allow-listed query keys (`TRACKING_PARAMS`: `utm_*`, `gclid`, `gbraid`, `wbraid`, `fbclid`, `msclkid`, `ref`).

Which paths are private is stated in four places:

| List | Source | Members |
| --- | --- | --- |
| Not measured | `lib/analytics.mjs#UNTRACKED_PREFIXES` | `/admin /auth /dashboard /forgot-password /login /onboarding /signup /team` |
| Portal host split | `lib/portalHost.mjs#PORTAL_SEGMENTS` | the same eight |
| Middleware matcher | `middleware.js#config` | the same eight (login as four paths) |
| Crawl disallow | `app/robots.js#PRIVATE_PATHS` | `/login/admin /login/client /login/employee /forgot-password /auth/ /dashboard /dashboard/ /admin /admin/ /team /team/ /api/`: deliberately leaves `/login` and `/signup` crawlable (they are `noindex`), and leaves `/onboarding` out |

- **Edge:** GA4 and GTM both on. Trigger: the container also holds a GA4 config for the same stream (`lib/analytics.mjs` comment). Consequence: every page view counts twice.
- **Edge:** GTM-only mode. Trigger: `GA_ID` unset while GTM is on (the default in production builds). Consequence: `trackEvent` and `pageview` return early, so no `generate_lead` and no `page_view` reach the `dataLayer`; a GTM trigger waiting for them never fires.
- **Edge:** GTM history-change triggers. Trigger: GTM loaded on a public page, then client-side navigation to a URL like `/auth/confirm?email=...`. Consequence: the container reads raw `location`, so the address is visible to it. `lib/analytics.mjs` acknowledges this; in production the portal paths live on another host, so navigation there is a full page load and the snippet stands down.
- **Edge:** the banner names only Google Analytics and Google Tag Manager (`components/ConsentBanner.jsx`). Sentry Replay, hCaptcha, Trustpilot and Upstash are not mentioned there or on `/privacy`, and there is no control to reopen or change the choice (the banner only renders when nothing is stored).
- **Edge:** `/privacy` drifts from the code: it lists "phone number (if provided)" among form fields (the form has no phone field and omits `budget`), and says analytics data is kept "typically 26 months". GA4's own retention settings are 2 or 14 months (Google; UNVERIFIED for this property), so 26 months likely describes Universal Analytics.
- **Edge:** Enhanced Measurement. Trigger: enabled on the GA4 data stream (dashboard, UNVERIFIED). Consequence: scroll, outbound click, site search, form interaction and file download events are collected although no repo code fires them.

### 2.7 Trustpilot

`components/marketing/TrustpilotWidget.jsx` loads `https://widget.trustpilot.com/bootstrap/v5/tp.widget.bootstrap.min.js` with `next/script` `lazyOnload`, and renders a `div.trustpilot-widget` carrying `data-businessunit-id`, `data-template-id` and `data-token` from `SITE.trustpilot` (`lib/site.js`). The widget becomes an iframe from the same host. Mounted by the homepage Contact beat (`components/sections/Contact.jsx`) and by `MarketingFooter`, which `SubpageExperience` renders on every inner marketing page. Visitor IP and user agent go to Trustpilot; no consent gate. The footer also links to `trstp.lt/_Kyci6Z0BC` (a plain outbound link). Failure leaves the `Trustpilot` text link.

- **Edge:** the reviews on `/reviews` and in Review JSON-LD come from `lib/reviews.js`, pasted by hand; no code fetches Trustpilot and the file records no source (UNVERIFIED provenance). The live widget count and `REVIEW_STATS` (20 reviews, average 4.3) can differ.

### 2.8 Contact webhook

`app/api/contact/route.js#deliverToWebhook` POSTs `validation.data` as JSON (`name`, `email`, `company`, `budget`, `brief`, `website`) with `cache: 'no-store'`. It does not forward the hCaptcha token. The fetch and a timer race, so a fetch that ignores the abort signal still cannot hold the request past `CONTACT_WEBHOOK_TIMEOUT_MS`. Destination, ownership and retention of the endpoint are UNVERIFIED.

### 2.9 Contact form, end to end

`POST /api/contact` touches five services (Upstash, hCaptcha, the webhook, Supabase, Resend) and, in the browser afterwards, GA4. Order in `app/api/contact/route.js#POST`:

| # | Step | Service | On failure |
| --- | --- | --- | --- |
| 1 | `checkRateLimitStrict('contact', ip, {5, 600})` | Upstash | over limit 429; unavailable in production 503 with `Retry-After: 120` |
| 2 | `request.json()` | none | 400 |
| 3 | `validateContactForm` incl. honeypot `website` | none | 400 (honeypot hit returns a distinct message) |
| 4 | `verifyHCaptchaToken` | hCaptcha | 503 or 400 (2.3) |
| 5 | require a channel: webhook set or Resend configured | none | 503 "use the direct email option" |
| 6 | `deliverToWebhook` | contact webhook | counted not delivered |
| 7 | `create_lead_from_contact` as `service_role` | Supabase Postgres | logged; no effect on the answer; the email loses its CRM link |
| 8 | ops email (`contactSubmissionEmail`, reply-to the visitor) | Resend | logged |
| 9 | acknowledgement (`contactAckEmail`, name only), only if step 8 sent | Resend | swallowed |
| 10 | answer | none | 202 if the webhook or step 8 delivered; otherwise 502 |

- **Edge:** step 7 runs before the outcome is known. Trigger: webhook and ops email both fail. Consequence: the visitor sees 502 ("could not be reached") although the lead exists in the CRM; a retry sends a second lead (whether `create_lead_from_contact` de-duplicates is in `01b-database-logic.md`).
- **Edge:** step 6 can succeed while step 7 fails. Consequence: the lead exists in the webhook only, not in the CRM, and nothing reports it.
- **Edge:** the browser fires `generate_lead` only on a 2xx, so a 502 after a stored lead is never counted.

### 2.10 Fonts and other embeds

| Item | What happens | Source |
| --- | --- | --- |
| Fonts | `next/font/google` (Space Grotesk, Inter, Space Mono) downloads at build and self-hosts. `font-src` is `'self' data:`. No runtime request. A build host without Google access cannot build (fallback behaviour UNVERIFIED). | `app/layout.jsx#Space_Grotesk` |
| Blog images | Post markdown may embed `![alt](https://...)` from any https host (`lib/blogMarkdown.mjs#safeImageSrc`); owned and retired hosts are rewritten to relative paths (`toSitePath`). Allowed by `img-src https:`. Visitors' IP and user agent reach that host. | `components/marketing/PostBody.jsx` |
| Cover images in OG/JSON-LD | `blog_posts.cover_image_url` (any https URL) becomes `og:image` and BlogPosting `image`. | `app/blog/[slug]/page.jsx` |
| Only client `fetch` | `POST /api/contact`. No `sendBeacon`, `WebSocket` or `EventSource` outside the Supabase SDK (grep). | `components/marketing/ContactForm.jsx` |
| Static media | `public/d/*` (12 WebM videos and one GIF, all referenced by `components/sections/Motion.jsx`), `public/projects/clients/*.jpg` (31 third-party screenshots, `SOURCES.md` attributes them). | `lib/clientTileImages.mjs` |
| IndexNow | Manual script posts URL lists to `api.indexnow.org` (4.2). | `scripts/seo/indexnow-ping.mjs` |
| GitHub Container Registry | CI pushes the image (4.1). | `.github/workflows/docker-ci.yml` |

---

## 3. HTTP layer

### 3.1 Security headers

`next.config.js#headers`, source `/:path*`, so every route including `/api/*`.

| Header | Value |
| --- | --- |
| `Content-Security-Policy` | see 3.2 |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `SAMEORIGIN` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` (third parties get the origin only, so `?email=` URLs do not leak in `Referer`) |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), interest-cohort=()` |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |

Pinned by `tests/csp-policy.test.mjs`: the CSP only. No test asserts the other five (grep of `tests/` for the header names finds none). The starting inventory said all headers were pinned; they are not.

### 3.2 CSP

Built in `next.config.js` from constants; the test above pins every directive token for token.

| Directive | Allowed |
| --- | --- |
| `default-src` | `'self'` |
| `script-src` | `'self' 'unsafe-inline' 'unsafe-eval' blob:` + `https://www.googletagmanager.com`, `https://hcaptcha.com`, `https://*.hcaptcha.com`, `https://widget.trustpilot.com` |
| `worker-src` | `'self' blob:` |
| `style-src` | `'self' 'unsafe-inline'` + hCaptcha hosts |
| `img-src` | `'self' data: blob: https:` (any https host) |
| `font-src` | `'self' data:` |
| `connect-src` | `'self'`, the Supabase origin and its `wss:` twin (from `NEXT_PUBLIC_SUPABASE_URL`), `www.googletagmanager.com`, `www.google-analytics.com`, `*.google-analytics.com`, `analytics.google.com`, `*.analytics.google.com`, `stats.g.doubleclick.net`, `*.g.doubleclick.net`, `www.google.com`, `*.ingest.us.sentry.io`, hCaptcha hosts |
| `media-src` | `'self' data: blob:` |
| `frame-src` | `'self' td.doubleclick.net www.googletagmanager.com` + hCaptcha hosts + `widget.trustpilot.com` |
| `frame-ancestors`, `base-uri`, `form-action` | `'self'` |
| `object-src` | `'none'` |

- **Edge:** `'unsafe-inline'` and `'unsafe-eval'` in `script-src` (Next bootstrap, R3F/GSAP; acknowledged in the file). Consequence: the policy cannot stop an injected inline script; the nonce refactor is open.
- **Edge:** `img-src https:` lets blog authors and GTM pixels reach any host. Accepted in the test comment.
- **Edge:** no `report-uri` or `report-to`. Trigger: a blocked Sentry host, GTM pixel, or a missing Supabase origin. Consequence: nothing is reported.
- **Edge:** `supabaseOrigin` is `''` when the variable is unset or unparsable at build. Trigger: a Vercel build without it. Consequence: the build passes and every Supabase call from the browser is blocked at runtime.
- **Edge:** non-Google GTM tags (ad pixels the container comment in `lib/analytics.mjs` anticipates) need hosts that `script-src` and `connect-src` do not list. Consequence: they are blocked silently.

### 3.3 Host redirects

`lib/portalHost.mjs#portalHostRedirects`, loaded by `next.config.js#redirects`, evaluated by Vercel before middleware. Preview and localhost hosts match nothing.

| Rule | When (host) | Result |
| --- | --- | --- |
| `/{login,signup,forgot-password,onboarding,dashboard,team,admin,auth}/:path*` | `www.` or apex `cdsportswearinc.com` (CRM on) | 308 to the same path on `app.cdsportswearinc.com`, query preserved |
| `/` | `app.` (CRM on) | 307 to `/login` |
| any path not in the portal or shared set, and without a dot | `app.` | 308 to `www.cdsportswearinc.com/:path` |
| (CRM off) only the previous rule | | |

Shared on both hosts: `/api/*`, `/_next/*`, `/_vercel/*`, and anything with a dot (`robots.txt`, `sitemap.xml`, images). The apex-to-`www` redirect is a Vercel domain setting (verified 2026-09-27, `CLAUDE.md`), not code.

- **Edge:** 308s are cached by browsers. Trigger: reverting the host split later. Consequence: clients with cached redirects keep bouncing to `app.`.
- **Edge:** canonical and `og:url` on `/login` and `/signup` resolve against `metadataBase` (www). Trigger: Google fetches the app-host page. Consequence: its canonical is a www URL that 308s back to the page itself; both pages are `noindex`, which contains it.
- **Edge:** `/onboarding` has no `robots` metadata (`app/onboarding/page.jsx`) and is not in `PRIVATE_PATHS`, so it inherits the root layout's `index, follow`. It is auth-gated by middleware, so a crawler is redirected to a `noindex` login page.
- **Edge:** two constants named `SITE_HOST` hold different values: `lib/seo.mjs#SITE_HOST` is the bare `cdsportswearinc.com`, `lib/portalHost.mjs#SITE_HOST` is `www.cdsportswearinc.com`.

The edge middleware (`middleware.js`, matcher the same eight segments) is described in `02-entry-points.md`. From this chapter's side: it never runs on marketing paths or `/api`, calls Supabase Auth and `profiles` on every portal request, and the CSP and header rules above apply to its responses as well.

### 3.4 Scheduled calls

| Scheduler | Schedule | Request | Auth | Target |
| --- | --- | --- | --- | --- |
| Vercel Cron (`vercel.json`, node `cron:vercel.crm-notifications`) | `0 13 * * *` (13:00 UTC daily) | `GET /api/cron/crm-notifications` | `Authorization: Bearer $CRON_SECRET` | `app/api/cron/crm-notifications/route.js#GET` |
| Supabase pg_cron `drain-crm-outbox` (`supabase/migrations/0042_repoint_cron_and_pinned_admin.sql:37`) | `*/5 * * * *` | `POST` through `pg_net`, 8000 ms timeout | `x-cron-secret` from Vault `crm_cron_secret` | `https://www.cdsportswearinc.com/api/cron/crm-notifications` (`:42`) |

Both run the same handler; database leases, not timing, prevent double processing (`docs/CRM-OPERATIONS.md`). `vercel.json` holds only this cron: no headers, redirects or rewrites.

- **Edge:** the pg_cron URL is a literal. Trigger: another domain move (it broke once, migration `0025`). Consequence: the 5-minute drain hits the old host; only Vercel's daily call remains.
- **Edge:** the route reads `NEXT_PUBLIC_APP_URL` through `getAppUrl()` before claiming rows. Trigger: misconfigured value. Consequence: both schedulers get 503 and the outbox is untouched, so mail resumes at the first run after the fix.
- **Edge:** 8-second `pg_net` timeout against a drain that sends up to 25 emails one after another (UNVERIFIED duration). Trigger: a slow drain. Consequence: pg_net records a timeout; the route may still finish, and leases plus the Resend idempotency key make that safe.

### 3.5 SEO emitters

| Emitter | Output | Data source |
| --- | --- | --- |
| `app/robots.js#robots` | one rule group for `*` plus eight named crawlers (GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, PerplexityBot, Bingbot, Applebot, Google-Extended): allow `/`, disallow 12 paths; `Sitemap: https://www.cdsportswearinc.com/sitemap.xml` | `lib/seo.mjs#SITE_ORIGIN` |
| `app/sitemap.js#sitemap` | 11 static routes, 9 service pages, 6 case studies, then published posts (`blog_posts`, anon, limit 100); hourly `revalidate = 3600`; `lastModified` only on posts (`updated_at` else `published_at`); omits `/hire/shopify-developer` (noindex) | `lib/projects.js`, `lib/servicePages.mjs#SERVICE_PAGE_SLUGS`, `lib/crm/blog.js#listPublishedSlugs` |
| `app/opengraph-image.jsx` | 1200x630 PNG prerendered at build ("Built to be unforgettable.", statement, city) | `lib/site.js#SITE` |
| `app/layout.jsx#metadata` | default title and description, OG, Twitter, icons, `robots: index, follow`, optional GSC verification | `SITE`, `SITE_ORIGIN`, `SOCIAL_IMAGE_PATH` |
| `app/layout.jsx#JSON_LD` | `Organization`+`ProfessionalService` (name, alternate names, email, phone, founding date, slogan, logo, areaServed US, physical Manassas street address, ContactPoint; `sameAs` only if `SITE.socials` is non-empty, currently `[]`) and `WebSite`; the P.O. box is deliberately absent | `lib/site.js` |
| `public/llms.txt` | hand-written link list: the sitemap URLs plus 14 blog posts and `/hire/shopify-developer` | static; drift guarded by `tests/seo-identity-and-crawl.test.mjs` |
| `public/2aa3a082044a1c787011f08d0c31fd1f.txt` | IndexNow key file | read by `scripts/seo/indexnow-ping.mjs` |

Per-page structured data:

| Page | JSON-LD | Escaping |
| --- | --- | --- |
| `/about`, `/contact`, `/privacy`, `/process`, `/terms` | `BreadcrumbList` (+ `FAQPage` on `/about`, `/contact`) | `BreadcrumbSchema` uses `safeJsonLd`; `FaqSchema` bare `JSON.stringify` |
| `/blog` | `BreadcrumbList`, `Blog` with `blogPost` list | `safeJsonLd` (DB titles) |
| `/blog/[slug]` | `BreadcrumbList`, `BlogPosting` (author and publisher = the Organization) | `safeJsonLd` |
| `/embroidery-screen-printing-web-design`, `/hire/shopify-developer` | Breadcrumb, FAQ, `Article` | bare `JSON.stringify` of static text |
| `/reviews` | Breadcrumb, FAQ, `ItemList` of `Review` (reviewer names, bodies, ratings, dates) | bare |
| `/services` | Breadcrumb, FAQ, `ItemList` | bare |
| `/services/[slug]` | Breadcrumb, FAQ, `Service` (web-design adds a Manassas `City` to `areaServed`) | bare |
| `/work` | Breadcrumb, FAQ, `ItemList` | bare |
| `/work/[slug]` | Breadcrumb, `CreativeWork` (creator and provider = the Organization) | bare |

- **Edge:** only DB-sourced values (`/blog`, `/blog/[slug]`) go through `safeJsonLd`. Trigger: someone moves dynamic text into a page that uses bare `JSON.stringify`. Consequence: `</script>` inside a value would close the tag.
- **Edge:** the blog index lists the newest 20 posts with no pagination (`lib/crm/blog.js#DEFAULT_LIMIT`); the sitemap lists up to 100. Trigger: a 21st post. Consequence: it is reachable only from the sitemap and the "other posts" strip.
- **Edge:** RLS hides a post whose `published_at` is in the future (`0035_blog_posts.sql:153-158`). Trigger: a scheduled publish. Consequence: absent from `/blog` and the sitemap until the time arrives; the sitemap can then lag up to an hour.
- **Edge:** `/blog/[slug]` returns `noindex, nofollow` metadata and a 404 for a draft or missing slug, so an unpublished URL cannot be probed.
- **Edge:** the sitemap throws at runtime on a failed read (Next keeps the last good copy) but degrades to the static list during `next build` (`app/sitemap.js#duringBuild`), where CI builds against a placeholder Supabase URL. A first deploy built while the database is down ships a sitemap without posts.

---

## 4. CI/CD and scripts

### 4.1 Workflows

| Workflow | Trigger | Secrets and vars | Reads | Writes | Production reach |
| --- | --- | --- | --- | --- | --- |
| `.github/workflows/docker-ci.yml` | push and PR to `main` | `GITHUB_TOKEN`; vars `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL` (existence UNVERIFIED) | repo | `test` job: nothing (placeholder env: `https://placeholder.supabase.co`, `placeholder-anon-key`, `https://placeholder.invalid`). `build` job: image to `ghcr.io/ethancrystal/crystalwebsolution.com` (the repository name, not a live domain; tags branch, PR, short sha, `latest` on main) and a cosign keyless signature, only when not a PR | none to the live site; the image is a separate artifact |
| `.github/workflows/seo-publish-blog.yml` | push to `main` touching `docs/seo/drafts/blog/**` or `scripts/seo/publish-blog-drafts.mjs`; `workflow_dispatch` (input `dry_run`, default true) | **`secrets.SUPABASE_URL`, `secrets.SUPABASE_SERVICE_ROLE_KEY`**, var `SEO_BLOG_COVERS_BUCKET` (existence UNVERIFIED) | `docs/seo/drafts/blog/*.md` | **`service_role` writes to the project those secrets name**: `blog_posts` insert/update as `draft`; Storage upload `covers/<slug>.<ext>` with `upsert: true` | yes, when the secrets are set and point at production |
| `.github/workflows/dependabot-auto-merge.yml` | `pull_request` to `main` (opened, reopened, synchronize, ready_for_review, edited) | `GITHUB_TOKEN` | PR files, `VERSION` and `CHANGELOG.md` at base and head, 100 recent main commits, open PRs | `release-policy`: nothing (status only). `enable-dependabot-auto-merge`: `gh pr merge --auto --merge` | merges to `main`, which deploys production |
| `.github/dependabot.yml` | weekly, Monday 09:00 America/Los_Angeles | none | npm, github-actions, docker | opens PRs | indirect |

The `test` job runs `pnpm test`, `pnpm test:components` and `pnpm build` on Node 24.

- **Edge:** `seo-publish-blog.yml` has no `environment:` protection. Trigger: `workflow_dispatch` on any branch by anyone with write access, with `dry_run` false. Consequence: that branch's version of `publish-blog-drafts.mjs` runs with `SUPABASE_SERVICE_ROLE_KEY`.
- **Edge:** the script re-upserts every `approved: true` draft on each run. Trigger: any push touching the drafts directory or the script. Consequence: it overwrites `/admin/blog` edits to any row still in `draft`; only `published` rows are skipped (`publish-blog-drafts.mjs#upsert`). Today one of five drafts is approved (`web-development-rfp-guide.md`, no `cover_image`).
- **Edge:** missing secrets are a warning and exit 0 (`#main`). Trigger: the secrets are unset. Consequence: the workflow is green and publishes nothing.
- **Edge:** `blog-covers` is created by no migration (grep of `supabase/`). Trigger: the first approved draft with `cover_image`. Consequence: `uploadCover` throws, the script exits 1.
- **Edge:** Dependabot auto-merge cannot fire. `enable-dependabot-auto-merge` needs `release-policy`, and `scripts/release-policy.mjs` rejects any title not shaped `vX.NN — summary` and any PR that does not bump `VERSION` and `CHANGELOG.md`; Dependabot titles are neither.
- **Edge:** `release-policy` imports `scripts/release-policy.mjs` from the checkout `actions/checkout` makes for the PR (`persist-credentials: false`, read-only token). Trigger: a PR that edits the script. Consequence: it is judged by its own rule (which ref is checked out is UNVERIFIED).
- **Edge:** the `build` job runs on pull requests too (without pushing). Node differs: CI on 24, `Dockerfile` on `node:26-alpine`.

### 4.2 Scripts

| Script | Invoked by | Env | Reads | Writes |
| --- | --- | --- | --- | --- |
| `scripts/seo/publish-blog-drafts.mjs` | the workflow above; manual (`--dry-run` available) | `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SEO_BLOG_COVERS_BUCKET` | draft files, `blog_posts (id, status)` | **`service_role`**: `blog_posts` insert/update, Storage upload |
| `scripts/seo/indexnow-ping.mjs` | manual | none | `public/<32-hex>.txt` | POST `api.indexnow.org/indexnow` |
| `scripts/livecheck.mjs` (`pnpm livecheck`) | manual, needs a running server | `LIVECHECK_BASE_URL` | Playwright GETs of 9 marketing routes | none |
| `scripts/provision-crm-test-users.mjs` (`pnpm crm:provision-test-users`) | manual; dry run unless `--execute` | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CRM_TEST_EMPLOYEE_EMAIL`, `CRM_TEST_CLIENT_EMAIL` | `auth.admin.listUsers()` (first page only) | **`service_role`**: `auth.admin.createUser({email_confirm: true})` and `profiles` upsert (`id`, `role`, `full_name`) for `moizj00@gmail.com` (admin), an employee and a client, on whatever project `SUPABASE_URL` names |
| `scripts/verify-crm-preview-authorization.mjs` (`pnpm crm:verify:preview`) | manual | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, 14 `CRM_PREVIEW_*` | selects on `projects`, `project_messages`, `project_tasks` as four signed-in users | none |
| `scripts/release-policy.mjs` | `dependabot-auto-merge.yml` | none | pure function | none |

Other entry points in `package.json`: `pnpm test`, `test:crm`, `test:marketing`, `test:components`, `test:db` (`supabase test db`, local stack), `crm:verify` (`test:crm` + `test:db`), `test:e2e` (`tests/e2e` does not exist). `Dockerfile` and `docker-compose.yml` are the other two build entry points (4.3).

- **Edge:** `provision-crm-test-users.mjs`. In the committed code at `1c17666` the two test addresses were `ethan+employee@crystalwebsolution.com` and `ethan+client@crystalwebsolution.com`, created confirmed on a retired domain a third party now serves, so whoever controls its mail could take them over with "forgot password". The working-tree fix defaults them to `cdsportswearinc.com` and refuses retired domains (`isRetiredDomainEmail`). Status: fixed in the tree, not committed when this was written.
- **Edge:** `verify-crm-preview-authorization.mjs`. Trigger: `CRM_PREVIEW_ENVIRONMENT=preview` set against production credentials. Consequence: it runs; the guard is self-declared.
- **Edge:** both write-capable scripts act on whichever project `SUPABASE_URL` names. Nothing compares it to production.
- **Edge:** `provision-crm-test-users.mjs#loadExistingUser` reads only the first page of users. Trigger: more than one page of users. Consequence: an existing account can be missed and `createUser` fails with a duplicate.

### 4.3 Container build

`Dockerfile`: three stages on `node:26-alpine` (deps, builder, runner), standalone output, port 3000, healthcheck `wget http://127.0.0.1:3000/api/health` (`app/api/health/route.js`, no dependencies). Build args: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`. Everything else, including `SUPABASE_SERVICE_ROLE_KEY`, must be supplied at run time.

- **Edge:** a published image carries production defaults for everything not in those three args: GTM `GTM-KJZPCQNM` on, the production hCaptcha site key, CRM on, no browser Sentry, no trusted client IP. `docker-compose.yml` reads `.env.local` for run-time values.

---

## 5. Static content sources and consumers

| Module | Records | Consumers | Mirrors and hard-coded copies |
| --- | --- | --- | --- |
| `lib/site.js#SITE` | brand, contact, address (Manassas), P.O. box, `socials: []`, Trustpilot ids, nav, auth nav | every marketing page; root layout metadata and JSON-LD; OG image; Nav, Menu, `SubpageNav`, `MarketingFooter`, `ContactForm`, `ContactPulseLinks`, `TrustpilotWidget`, `ServiceSchema`; email sender and templates; CRM `WorkspaceShell`, `PortalLoginForm` | "Manassas" also typed in `app/contact/page.jsx`, `app/services/[slug]/page.jsx` (`WEB_DESIGN_AREA_SERVED`), `lib/servicePages.mjs` |
| `lib/projects.js#PROJECTS` | 6 case studies | `/work`, `/work/[slug]`, sitemap, `ServicePage`, homepage Motion beat | `public/llms.txt` lists each by hand |
| `lib/reviews.js#REVIEWS` | 20 named reviews, 6 featured; computed `REVIEW_STATS` (average 4.3, 17 rated 4 or more) | `/reviews` (page and JSON-LD), `/about`, `/contact`, homepage Stories beat | live Trustpilot count differs |
| `lib/services.mjs#SERVICES` | 8 rows | homepage Services beat, 3D rail, `servicePages.mjs`, `serviceSignalGeometry.mjs` | |
| `lib/servicePages.mjs#SERVICE_PAGES` | 9 pages (8 + SEO) with FAQ, related, `POSTS` (11 blog slugs) | `/services`, `/services/[slug]`, sitemap, `/work/[slug]`, `ServicePage`, homepage Services beat | `llms.txt` |
| `lib/serviceSignals.mjs`, `serviceSignalBlurbs.mjs`, `serviceSignalGeometry.mjs` | rail metadata, tooltip copy, geometry | homepage rail; `/services/[slug]` 3D emblem | `SIGNAL_BLURB` vs `SERVICES[].desc` |
| `lib/clientTileImages.mjs` | 31 third-party screenshots | homepage Motion marquee (decorative, `aria-hidden`) | `public/projects/clients/SOURCES.md` |
| Blog | table `blog_posts`; the repo holds only drafts (`docs/seo/drafts/blog/*.md`) | `/blog`, `/blog/[slug]`, sitemap | `RELATED_BY_SLUG` (14 slugs, `app/blog/[slug]/page.jsx`), `POSTS` (11), `public/llms.txt` (14) |
| `public/llms.txt` | 41 links: 12 under Services (home, `/services`, 9 service pages, `/hire/shopify-developer`), 7 under Work, 20 under Guides (blog index, 14 posts, about, process, privacy, terms, embroidery), 2 under Contact | crawlers | hand-maintained mirror of all of the above |

Writers of `blog_posts`: `/admin/blog` server actions (`app/actions/blog-actions.js`, which revalidates `/blog`, `/sitemap.xml`, `/blog/<slug>`) and the CI script (drafts only). Blog slugs known to the repo: the 14 in `llms.txt` and `RELATED_BY_SLUG` agree; `website-redesign-services` is deliberately absent from `servicePages.mjs` (pending an owner ruling, `tests/seo-identity-and-crawl.test.mjs`).

Duplicated values that can drift:

| Value | Locations | Drift risk |
| --- | --- | --- |
| Production host | `lib/seo.mjs#SITE_ORIGIN`, `lib/portalHost.mjs#SITE_HOST` (own copy), `supabase/migrations/0042_repoint_cron_and_pinned_admin.sql:42`, `supabase/config.toml:176-177,181`, `public/llms.txt` (every URL) | a fifth domain move needs all of them; the migration cannot be edited, only superseded |
| Retired-domain denylist | `lib/seo.mjs#OWN_HOSTNAMES`, `lib/appUrl.mjs#RETIRED_HOSTS` (new), `scripts/provision-crm-test-users.mjs#RETIRED_DOMAINS` | three lists, no shared constant |
| Service one-liners | `SERVICES[].desc` (also `hero` on each service page) vs `SIGNAL_BLURB` | 6 of 8 differ; on `/services/[slug]` the hero and the 3D tooltip show different sentences |
| Review figures | `REVIEW_STATS` vs the Trustpilot widget vs "Sixty-plus projects shipped" in `llms.txt` vs `SITE.projectsShipped` | numbers updated in one place only |
| Blog slugs | `POSTS`, `RELATED_BY_SLUG`, `llms.txt` vs the database | unpublishing a post leaves live links that 404 |
| CRM flag | `lib/crmFlag.js#CRM_ENABLED` and `next.config.js#crmEnabled` | two parses of one variable |
| Private-path lists | 2.6 | `/onboarding` missing from robots |
| Identity leftovers | `/work/crystal-web-solution` URL slug (`lib/projects.js`, sitemap, `llms.txt`); Sentry org and project `crystal-web-solution*` (`next.config.js`); `docs/ANALYTICS.md:3` names the retired domain; `council.yaml:1`; `supabase/config.toml:272` (commented) | cosmetic, but the URL slug is a live link |
| Legal copy | `/privacy` and `/terms` `LAST_UPDATED` constants vs what the code does (2.6) | the policy lags the integrations |

Files with no in-repo reference: the six `public/projects/cws-*.webp` images (`cws-innovation-studio`, `cws-izanami`, `cws-live-ciao-energy`, `cws-live-inspiring`, `cws-live-izanami`, `cws-live-oimachi`) are named in no source, test, CSS or doc (grep). They are still served static URLs, so removal needs the URL and runtime audit and the owner's confirmation (`CLAUDE.md`).

---

## 6. Cookies and browser storage

| Name | Kind | Set by | Read by | Lifetime | Contains |
| --- | --- | --- | --- | --- | --- |
| `cws:analytics-consent` | localStorage, per origin | `lib/analytics.mjs#setConsent` (from `ConsentBanner`) | `lib/analytics.mjs#readStoredConsent`, the inline head snippet, `ConsentBanner` | until cleared | `granted` or `denied` |
| `cws:intro-seen` | sessionStorage | `components/Loader.jsx` when the intro completes | `Loader.jsx`; inline script in `app/layout.jsx` (unlocks scroll before hydration) | tab session | `1` |
| `cws.portal.tour.seen.v1` | localStorage | `components/crm/PortalTour.jsx#writeSeenKey`; removed by `#clearSeenKey` ("Replay tour") | `PortalTour.jsx#readSeenKey` | until cleared | ISO timestamp |
| `sentryReplaySession` | sessionStorage | Sentry Replay (library default) | Sentry | tab session | replay session id. Name and lifetime UNVERIFIED |
| `_ga`, `_ga_<stream-id>` | cookies | `gtag.js`, only after `analytics_storage` is granted | Google | about 2 years (Google default, UNVERIFIED) | client id, session state |
| `sb-<ref>-auth-token` (+ chunks), `sb-<ref>-auth-token-code-verifier` | cookies | `@supabase/ssr` in browser client, middleware, `lib/supabase/server.js` | same | owned by `02-entry-points.md` | session JWTs |
| hCaptcha, Trustpilot | storage inside their own iframes and origins | vendors | vendors | vendor-defined, UNVERIFIED | not visible to site code |

Not storage but shared state: `window.dataLayer`, `window.gtag`, `window.__cwsConsentQueued`, `window.__cwsGtmLoaded` (`lib/analytics.mjs`), `window.hcaptcha`, `window.Trustpilot`. Repo code sets no cookie of its own: the only `cookies().set` is inside the Supabase adapters (`lib/supabase/server.js`, `middleware.js`), and there is no `document.cookie` anywhere.

- **Edge:** `cws.portal.tour.seen.v1` is per browser, not per account. Trigger: a second client signs in on a browser where the tour was seen. Consequence: they never see the first-run tour. Clearing storage shows it again.
- **Edge:** consent and the tour flag are per origin. `www` and `app` are different origins, so a choice on `www` is not visible on `app` (irrelevant today: app pages are untracked).
- **Edge:** storage is wrapped in try/catch everywhere (`readStoredConsent`, `Loader.jsx`, `PortalTour.jsx`). Trigger: private mode or blocked storage. Consequence: the banner reappears every visit, the intro replays, the tour reopens; nothing breaks.
- **Edge:** the Supabase cookies are host-only (`app.` in production, `www.` carries none), by the host split in 3.3.

---

## 7. Analytics events

All events go through `window.dataLayer` (shared by gtag.js and GTM). Without a valid `GA_ID`, `trackEvent` and `pageview` return before queuing anything.

| Event (node id) | Parameters | Fired at | Destination | Consent gate | PII |
| --- | --- | --- | --- | --- | --- |
| `page_view` (`event:ga4.page_view`), preceded by commands `js`, `config {send_page_view: false}` (once) and `set {page_location, page_title, page_referrer}` (each navigation) | `page_location` (origin + path + allow-listed query), `page_title` (`document.title`), `page_referrer` (previous sanitised location, else `document.referrer`) | `components/Analytics.jsx#RouteTracker` on every pathname or serialised-query change, via `lib/analytics.mjs#pageview`; skipped on untracked paths | GA4 through `gtag.js` | Consent Mode v2: defaults denied; denied still pings cookieless | query keys outside the allow-list are dropped; the first referrer is the raw external URL |
| `generate_lead` (`event:ga4.generate_lead`) | `form_location` (`home`, `marketing`, `about`, `service-<slug>`), `budget` (one of `<$5k`, `$5–15k`, `$15–50k`, `$50k+`) | `components/marketing/ContactForm.jsx#submitForm`, only after `/api/contact` answers 2xx | GA4; also readable from the `dataLayer` by GTM | same | none by code: name, email, company and brief are not sent |
| `gtm.js` (`event:gtm.gtm.js`) | `gtm.start` timestamp | head snippet (`gtmHeadSnippet`) or `loadTagManager` | GTM container `GTM-KJZPCQNM` (or the override) | none to load; consent defaults are queued first; non-Google tags are not governed | none by code; container contents UNVERIFIED |
| `consent default` (`event:ga4.consent_default`) | four signals `denied`, `wait_for_update: 500` | head snippet or `ensureConsentDefaults` | GA4 and GTM | is the gate | none |
| `consent update` (`event:ga4.consent_update`) | four signals `granted` or `denied` | `ConsentBanner` choice; replay of a stored choice at load | GA4 and GTM | is the gate | none |

- **Edge:** `/contact` and `/process` both render `<ContactForm variant="marketing">` (`app/contact/page.jsx`, `app/process/page.jsx`). Consequence: their `generate_lead` events share `form_location=marketing` and cannot be told apart.
- **Edge:** `page_title` is the document title, so a published blog post title appears in GA4. Not personal data, but author-controlled text.

Not events, but outbound telemetry to track alongside: Sentry captures (2.5), hCaptcha challenge traffic (2.3), the Trustpilot widget load (2.7). The Sentry `captureMessage` from the cron route carries counters only.

---

## 8. Findings carried to `06-edge-cases.md`

| Id | Finding | Severity | Suggested status |
| --- | --- | --- | --- |
| X7-01 | `NEXT_PUBLIC_APP_URL` unguarded in emailed-link code (committed `1c17666`); `lib/appUrl.mjs` guard in the working tree | High | fixed in tree (F10), not committed when written |
| X7-02 | Test accounts on a retired domain in `provision-crm-test-users.mjs` (committed code) | High | fixed in tree |
| X7-03 | GA4 ID in Production reportedly 404s (`docs/ANALYTICS.md`) | Medium | owner action, UNVERIFIED now |
| X7-04 | GTM container on by default in every production build, previews included | Medium | decision needed |
| X7-05 | Sentry: URLs with email and UUIDs, replay on all routes, no consent, no scrubber; `dataCollection` unconfirmed | Medium | decision needed |
| X7-06 | Consent banner and `/privacy` omit Sentry Replay, hCaptcha, Trustpilot, Upstash; no change-my-choice control; phone and retention statements drift | Medium | decision needed |
| X7-07 | `seo-publish-blog.yml`: service role from any ref on `workflow_dispatch`, no environment protection | Medium | owner action |
| X7-08 | Publish script overwrites `/admin/blog` edits to draft rows | Low | accepted or fix |
| X7-09 | `blog-covers` bucket created by no migration | Low | latent |
| X7-10 | Contact: 502 after the CRM lead exists; webhook-only leads; budget spent before validation | Low | accepted or fix |
| X7-11 | Personal data at Upstash (email, IP keys), undisclosed | Low | disclose |
| X7-12 | Only the CSP is pinned by a test; five other headers unpinned | Low | test gap |
| X7-13 | CSP: `unsafe-inline`/`unsafe-eval`, `img-src https:`, no reporting, US-only Sentry host, silent loss of the Supabase origin | Low | known |
| X7-14 | `/login` and `/signup` canonical resolves to a www URL that redirects back; `/onboarding` has no robots metadata | Low | decision needed |
| X7-15 | Dependabot auto-merge inert; release-policy judged by PR's own code | Low | known |
| X7-16 | Docker image drift (3 build args, Node 26 vs 24, no throttling by default) | Low | accepted |
| X7-17 | Duplicated host, retired-domain and copy values (section 5); identity leftovers | Low | cleanup |
| X7-18 | `docs/CRM-OPERATIONS.md` describes the old `x-forwarded-for` rule | Low | doc fix |
| X7-19 | `.env.example` missing; this chapter's table is the inventory | Low | add file |
| X7-20 | Six `public/projects/cws-*.webp` with no in-repo reference | Low | owner audit before any removal |
| X7-21 | Portal tour flag not user-scoped | Low | accepted |
| X7-22 | Sentry `environment` is `production` for previews | Low | fix in config |

---

## 9. Corrections to the starting inventory, and what stays UNVERIFIED

Corrections (inventory `scope/05-env-telemetry-infra.md`, written against `95f02c8`):

| Inventory said | Current code |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` has no fallback in auth paths; contact and cron default to `''` | Superseded by `lib/appUrl.mjs#getAppUrl` in the working tree; every caller resolves it first |
| `provision-crm-test-users.mjs` creates `@crystalwebsolution.com` accounts | True of the committed file; the working tree uses `cdsportswearinc.com` defaults, env overrides and a retired-domain refusal |
| The security headers are pinned token-for-token by `tests/csp-policy.test.mjs` | Only the CSP is |
| Three private-path lists disagree | Four lists: `UNTRACKED_PREFIXES`, `PORTAL_SEGMENTS` and the middleware matcher agree on eight segments; only `robots.js` differs |
| Four first-party storage keys and cookie families | Five: also `cws.portal.tour.seen.v1` (client arrival tour, merged after `95f02c8`) |
| 49 variables | 57 variables here (the table groups the 13 preview fixtures into three rows): adds `VERCEL_URL`, `CRM_TEST_EMPLOYEE_EMAIL`, `CRM_TEST_CLIENT_EMAIL`, `GITHUB_TOKEN`, `PORT`, `HOSTNAME`, `SUPABASE_AUTH_SITE_URL`, `OPENAI_API_KEY` and splits the preview fixture variables |
| 12 secrets | 14: adds `GITHUB_TOKEN` and `OPENAI_API_KEY` (Supabase CLI) |

Confirmed unchanged: robots (12 disallows, 8 named bots), sitemap (11 static routes), llms.txt drift test, GTM default and `noscript` behaviour, Sentry settings, the 308/307 host rules, Dependabot auto-merge being inert, the missing `.env.example`, the missing `blog-covers` migration.

UNVERIFIED (needs a dashboard, a vendor or `node_modules`):

- Every Vercel value per environment: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_GA_ID` (still the 404 ID?), `NEXT_PUBLIC_GTM_ID` on Preview, `CRON_SECRET` against `CRM_CRON_SECRET`, Sentry DSN region, Upstash, `HCAPTCHA_SECRET`, `CONTACT_WEBHOOK_URL` and where it points; whether Preview shares Production's Supabase and Resend.
- Whether the GitHub secrets `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` and the repository variables exist, and which project they name; ghcr package visibility.
- GTM container contents (GA4 duplicates, non-Google pixels, history-change triggers); GA4 retention and Enhanced Measurement settings.
- Whether `dataCollection` is a recognised `@sentry/nextjs` 10.70.0 option; Sentry Replay's storage key; default breadcrumb contents.
- Library cookie attributes for `sb-*` and `_ga*`; Trustpilot and hCaptcha storage.
- Supabase Auth rate limits and dashboard `SITE_URL`/redirect allow-list; whether the project is `wmnjosiikehsuaqucvja`.
- Whether `PORT` and `HOSTNAME` are read by the Next standalone server as assumed; Vercel's behaviour if `x-real-ip` is absent; the `pg_net` 8-second timeout against real drain times; the Reviews' original source.
- Whether the Google Fonts download has a build-time fallback.
