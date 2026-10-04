# 02. Entry points: every server action, route handler and request gate

Scope: everything that runs on the server when a request arrives. That is the host-redirect layer, `middleware.js`, the 7 route handlers, the 39 server actions in 7 files, the 19 email templates they send, and the libraries those use (`lib/supabase/*`, `lib/auth/*`, `lib/email/*`, `lib/rateLimit.mjs`, `lib/hcaptcha.mjs`, `lib/contactForm.mjs`, `lib/appUrl.mjs`). Screens and what they pass to each action are in `03-screens.md`. Tables, RLS and RPC bodies are in `01-data-dictionary.md` and `01b-database-logic.md`. Outbound services and env vars are in `07-external-services.md`. Machine-readable twin: `data/server.json` (domain `server`).

Code state: the working tree of branch `claude/funny-bardeen-i83gco` after the committed fixes: `lib/appUrl.mjs` and its use in `lib/supabase/admin.js`, `app/auth/actions.js`, `app/admin/users/actions.js`, `app/api/contact/route.js` and `app/api/cron/crm-notifications/route.js`; the CRM UI fixes; and migration `0051`. `0051` is a file in the repo, not live. Where it redefines an RPC the row says so. The live ledger ends at `0045` (see `06-edge-cases.md`, "Live state").

Legend. **US** = user-scoped server client (anon key plus the caller's session cookie; RLS applies, and SECURITY DEFINER RPCs run as their owner but check `auth.uid()` themselves). **SR** = service-role client (RLS bypassed). Sources are `path#symbol`; migrations are `path:line`. **Edge:** gives a trigger condition and its concrete consequence, with the register id (`06-edge-cases.md`) where one exists. **UNVERIFIED** means the repo cannot prove it (live settings, library source, or a browser).

At a glance:

| Thing | Count | Source |
| --- | --- | --- |
| Server actions (exported async functions in `'use server'` files) | 39 in 7 files: auth 7, admin users 3, onboarding 1, assignment 2, blog 4, brief 4, project 18 | `app/auth/actions.js`, `app/admin/users/actions.js`, `app/actions/*.js` |
| Server actions with no caller | 5: `getUser`, `assignProject`, `updateProjectTask`, `createProjectApproval`, `enqueueNotification` | grep of `app/`, `components/`, `lib/` for imports |
| Route handlers | 7 handlers in 6 files: contact POST, cron GET and POST, health GET, sentry-verification GET, auth/callback GET, auth/verify GET | `app/**/route.js` |
| Request gates | 2: the host-redirect layer and `middleware.js` | `lib/portalHost.mjs#portalHostRedirects`, `middleware.js#middleware` |
| Files that create the service-role client | 4: `app/auth/actions.js`, `app/admin/users/actions.js`, `app/api/contact/route.js`, `app/api/cron/crm-notifications/route.js` | `lib/supabase/admin.js#createAdminClient` |
| Email templates | 19, of which 18 have a sender | `lib/email/templates.js` |

No server action uses the service role for a table write. The service role writes in four places only: Auth admin calls (generate link, delete user), the contact lead RPC, and the cron worker's outbox and cleanup RPCs plus Storage removal.

## 1. Supabase clients

Which client a call uses decides whether RLS applies. Four constructions exist.

| Client | Built by | Key | Session | RLS | Who uses it | Fails when |
| --- | --- | --- | --- | --- | --- | --- |
| User-scoped server client (US) | `lib/supabase/server.js#createClient` (`createServerClient` from `@supabase/ssr`) | anon key | reads the `sb-<ref>-auth-token` cookie through `next/headers`; `setAll` errors are swallowed, so a token refresh during a Server Component render is not persisted | applies | every action in `app/actions/*.js`; `app/auth/actions.js#signIn`, `#signOut`, `#getUser`, `#updatePassword`; `app/admin/users/actions.js` (RPCs); `app/auth/callback/route.js`; `app/auth/verify/route.js`; `lib/auth/require-role.js#getAuthenticatedProfile`; `app/team/page.jsx`; `lib/crm/blog.js` (server callers) | throws `Supabase authentication is not configured.` when the URL is not http(s) with a host and no credentials, or the anon key is blank (`lib/supabase/config.mjs#hasSupabaseBrowserConfig`) |
| Middleware client | `middleware.js#middleware` (`createServerClient`) | anon key | request cookies in, refreshed cookies out on the response; `redirectWithCookies` copies them onto every redirect | applies | `middleware.js` only | the same config check runs first and short-circuits (see section 2) |
| Service-role client (SR) | `lib/supabase/admin.js#createAdminClient` (supabase-js, no cookies) | `SUPABASE_SERVICE_ROLE_KEY` | none | bypassed | `app/auth/actions.js` (signUp, resendConfirmationEmail, requestPasswordReset), `app/admin/users/actions.js#inviteUser`, `app/api/contact/route.js`, `app/api/cron/crm-notifications/route.js` | throws `SUPABASE_SERVICE_ROLE_KEY is not set` when the key is unset; the URL is not validated, so a bad URL fails later inside supabase-js |
| Browser client | `lib/supabase/browser.js#createClient` (`createBrowserClient`) | anon key | the same cookie, read by the browser | applies | 32 files: the direct-table CRM pages, `components/crm/*` and `lib/useUserRole.js` | throws when either public env var is missing |
| Cookieless anon client | `lib/crm/blog.js#publicClient` (supabase-js, `persistSession: false`) | anon key | none | applies as `anon` | `listPublishedSlugs` for `/sitemap.xml` | returns null when env is missing |

- **Edge:** `NEXT_PUBLIC_SUPABASE_URL` or the anon key is set but malformed. Trigger: any action or route that reaches `createClient()` outside a try/catch. Consequence: it throws. The project, brief, assignment and blog actions wrap both the profile lookup and the client in try/catch and return a fixed message, and `signIn` catches its own. `signOut`, `getUser`, `updatePassword`, `onboardClientCompany` (its profile lookup), the three admin-user actions, `/auth/callback` and `/auth/verify` do not, so the visitor gets a 500 and Sentry's `onRequestError` records it (`app/auth/actions.js#signOut`, `app/actions/onboarding-actions.js#onboardClientCompany`, `app/auth/callback/route.js#GET`).
- **Edge:** `getAuthenticatedProfile` returns `null` for a missing user, a GoTrue error, or any `profiles` read error (`lib/auth/require-role.js#getAuthenticatedProfile`). Every caller treats `null` as "not signed in". Trigger: a transient read failure. Consequence: a signed-in admin sees "You are not authorized" from an action, or `requireRole` redirects a layout to the login page.
- **Edge:** an action's role pre-check is wrong or bypassed. Trigger: a crafted request to an action with a role the pre-check would not allow, or a pre-check list that drifts from the database. Consequence: no action here holds the service role for a table write, so RLS and the RPCs' own `auth.uid()` checks still refuse and the visible difference is only the error text. The pre-check lists in section 4 are a user-facing gate, not the boundary (`app/actions/project-actions.js#authenticatedProfile`).

## 2. Request routing

Two layers run before any page, route handler or action body: Vercel's host-redirect layer, then `middleware.js`. After them, each portal layout runs `requireRole`. Both layers read `NEXT_PUBLIC_CRM_ENABLED`, which is inlined at build time, so editing the variable changes nothing until the next deploy builds.

### 2a. Host redirect layer (`middleware:lib/portalHost.mjs`)

`next.config.js#redirects` imports `lib/portalHost.mjs#portalHostRedirects({ crmEnabled })`; the rules are fixed at build time and applied at Vercel's routing layer, before middleware. Hosts: `www.cdsportswearinc.com` (and the apex, in case a request reaches the app before Vercel's own apex-to-www redirect) and `app.cdsportswearinc.com`. Portal segments: `login, signup, forgot-password, onboarding, dashboard, team, admin, auth` (`lib/portalHost.mjs#PORTAL_SEGMENTS`; `tests/portalHost.test.mjs` checks the list against the middleware matcher).

| # | CRM flag | Host | Path | Outcome | Source |
| --- | --- | --- | --- | --- | --- |
| 1 | on | www or apex | any path under a portal segment (`/login/**`, `/signup`, `/forgot-password`, `/onboarding`, `/dashboard/**`, `/team/**`, `/admin/**`, `/auth/**`) | 308 permanent to `https://app.cdsportswearinc.com/<same path>` with the same query string | `lib/portalHost.mjs#portalHostRedirects` |
| 2 | on | app | exactly `/` | 307 to `/login` (temporary: middleware then sends a signed-in visitor to their role home) | `lib/portalHost.mjs#portalHostRedirects` |
| 3 | on or off | app | not a portal path, not under `api`, `_next` or `_vercel`, and no `.` in the path | 308 to `https://www.cdsportswearinc.com/<path>` | `lib/portalHost.mjs#portalHostRedirects` (`appToSite`) |
| 4 | on or off | either | `/api/*`, `/_next/*`, `/_vercel/*`, any path containing a dot | no redirect: served on both hosts | `lib/portalHost.mjs#SHARED_SEGMENTS` |
| 5 | off | www | a portal path | no host rule; middleware answers 307 to `/` (section 2b row 1) | `lib/portalHost.mjs#portalHostRedirects` |
| 6 | off | app | a portal path | middleware 307 to `/`, then rule 3 sends the app host to `https://www.cdsportswearinc.com/` (same UNVERIFIED empty-path match as row 7) | `lib/portalHost.mjs#portalHostRedirects` |
| 7 | off | app | exactly `/` | rule 2 is not emitted; whether `:path` in rule 3 matches an empty path is UNVERIFIED, so the app host may serve the marketing home | `lib/portalHost.mjs#portalHostRedirects` |
| 8 | any | `*.vercel.app` previews, localhost | any | no host rules; everything serves on one host | `lib/portalHost.mjs` (every rule has a host condition) |

- **Edge:** a sign-in, invite or reset link emailed before the host switch points at `www`. Trigger: the recipient clicks it. Consequence: row 1 keeps the path and query, so `/auth/verify?token_hash=...` lands on the app host and the session cookie is set there. Nothing is consumed by the redirect itself.
- **Edge:** the pg_cron drain posts to `https://www.cdsportswearinc.com/api/cron/crm-notifications` (`cron:pg_cron.drain-crm-outbox`). Trigger: every 5 minutes. Consequence: `api` is a shared segment, so the call is served on `www` with no redirect (`lib/portalHost.mjs#SHARED_SEGMENTS`).
- **Edge:** a path such as `/administrator` or `/team-photos` is not a portal path (the exclusion needs a segment boundary). Trigger: such a request on the app host. Consequence: it is redirected to the marketing site, which 404s there.
- **Edge:** the flag is duplicated: `lib/crmFlag.js#CRM_ENABLED` (middleware, `Nav`, `Menu`) and an inline copy in `next.config.js#crmEnabled` (host rules). Both use the same expression. Trigger: someone changes one. Consequence: the host rules and the middleware disagree, and with the CRM off the app host can send `/` to `/login` while middleware sends `/login` to `/`, which loops.

### 2b. Middleware decision table (`middleware:middleware.js`)

Matcher (`middleware.js#config`): `/admin/:path*`, `/dashboard/:path*`, `/onboarding`, `/team/:path*`, `/login`, `/login/client`, `/login/employee`, `/login/admin`, `/signup`, `/forgot-password`, `/auth/:path*`. It does not run on `/`, `/api/*` or marketing pages, and not on any other `/login/*` path. Every redirect is `NextResponse.redirect`, so it is a 307, and it carries the refreshed session cookies (`middleware.js#redirectWithCookies`).

Inputs: the build-time flag; `NEXT_PUBLIC_SUPABASE_URL` and anon key (checked by `hasSupabaseBrowserConfig`); the `sb-<ref>-auth-token` cookie; the pathname and query; one `auth.getUser()` call (a network round trip to GoTrue, made on every matched request including `/login` and `/auth/*`); one `profiles` read; and, for portal paths only, the RPC `current_user_must_set_password`.

Path classes: **P** = protected portal (`/dashboard/**` = client portal, `/team/**` = employee portal, `/admin/**` = admin portal; `middleware.js#portalForPath`). **L** = `/login`. **LP** = `/login/client`, `/login/employee` or `/login/admin`. **S** = `/signup` or `/forgot-password`. **O** = `/onboarding`. **A** = `/auth/**`.

First matching row wins.

| # | CRM flag | Supabase env | Path | Signed in? | Profile and role | must-set-password | Outcome | Source |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | off | any | any matched path | any | any | any | 307 to `/`; no Supabase call | `middleware.js#CRM_ENABLED` |
| 2 | on | invalid | P | any | any | any | 307 to that portal's login with `?error=configuration` | `middleware.js#portalLoginResponse` |
| 3 | on | invalid | LP without `error=configuration` | any | any | any | 307 to the same login page with `?error=configuration` | `middleware.js#portalLoginResponse` |
| 4 | on | invalid | L, S, O, A, or LP already carrying the error | any | any | any | pass | `middleware.js#hasSupabaseBrowserConfig` |
| 5 | on | ok | P | no (getUser error or no user) | none | n/a | 307 to the portal login with `?next=<path and query minus _rsc>` | `middleware.js#requestedPortalPath` |
| 6 | on | ok | P | yes | profile read error or no row | n/a | 307 to the portal login with `?next=` | `middleware.js#profileError` |
| 7 | on | ok | P | yes | role is not this portal's role, and has a home | n/a | 307 to the role's home (`/dashboard`, `/team`, `/admin`) | `middleware.js#roleHome` |
| 8 | on | ok | P | yes | role is not this portal's role, and has no home | n/a | 307 to the portal login, no parameters | `middleware.js#portalLoginResponse` |
| 9 | on | ok | P | yes | role matches the portal | true | 307 to `/auth/reset-password?reason=invite` | `middleware.js#mustSetPassword` |
| 10 | on | ok | P | yes | role matches | RPC error | pass, after `console.error` (fails open) | `middleware.js#passwordCheckError` |
| 11 | on | ok | P | yes | role matches | false | pass | `middleware.js#middleware` |
| 12 | on | ok | L or S | yes | known role | n/a | 307 to the role's home | `middleware.js#roleHome` |
| 13 | on | ok | LP | yes | known role that is not this portal's role | n/a | 307 to the role's home | `middleware.js#isRoleAllowed` |
| 14 | on | ok | LP | yes | role matches the portal | n/a | pass: a signed-in user sees the login form | `middleware.js#isRoleAllowed` |
| 15 | on | ok | L, S, LP, O or A | no | none | n/a | pass | `middleware.js#middleware` |
| 16 | on | ok | O or A | yes | any | n/a | pass; the session is refreshed and nothing else | `middleware.js#portalForPath` |

Writes by this layer: the `sb-<ref>-auth-token` cookie when `getUser()` refreshed the token (`middleware.js#setAll`), and the `?next=`, `?error=` and `?reason=` parameters on its redirects.

- **Edge:** `/onboarding` is matched but `portalForPath('/onboarding')` is null (`lib/auth/roles.mjs#portalForPath`). Trigger: any request. Consequence: no role redirect and no must-set-password check run there; the only gate is `requireRole(['client'])` in the page (`app/onboarding/page.jsx#ClientOnboardingPage`).
- **Edge:** the must-set-password gate passes when the RPC errors (row 10). Trigger: migration `0039_must_set_password_gate.sql` missing or the RPC failing. Consequence: an invited project manager with no password can use the portal for this session and, once it lapses, is locked out until `/forgot-password` (S13). The only trace is the runtime log line `must-set-password gate unavailable`.
- **Edge:** a profile read error on a protected path (row 6) looks identical to "signed out". Trigger: a transient `profiles` failure. Consequence: a signed-in user is bounced to the login page with `?next=` and sees the login form again; if they sign in again, `signIn` honours `next`.
- **Edge:** `NEXT_PUBLIC_CRM_ENABLED=false` (row 1) also covers `/auth/*`. Trigger: flag off. Consequence: every emailed `/auth/verify` link is answered with a 307 to `/` before the route runs, so the one-time token is not consumed and stays valid until it expires; sign-up, reset and invite actions can still be called and still send those links (S15, UNVERIFIED for the actions).
- **Edge:** a signed-in user on `/login/<own portal>` (row 14) is not redirected. Consequence: they see the login form and can sign in as someone else without signing out first.
- **Edge:** row 9's target `/auth/reset-password` is not a protected path, so it cannot loop. A user who reaches it with no session cannot change a password: `updatePassword` returns GoTrue's error (section 4.1).

### 2c. Layout gates (render-time, after middleware)

| Where | Check | Failure | Source |
| --- | --- | --- | --- |
| `/dashboard/**` layout | `requireRole(['client'], '/login/client')`; `dynamic = 'force-dynamic'` | `redirect('/login/client')`, or `?error=configuration` when the Supabase env is missing | `app/dashboard/layout.jsx#DashboardLayout` |
| `/team/**` layout, `/team` page | `requireRole(['project_manager'], '/login/employee')` | `redirect('/login/employee')` | `app/team/layout.jsx#TeamLayout`, `app/team/page.jsx#TeamPage` |
| `/admin/**` layout | `requireRole(['admin'], '/login/admin')` | `redirect('/login/admin')` | `app/admin/layout.jsx#AdminLayout` |
| `/admin/blog`, `/admin/blog/new`, `/admin/blog/[id]` | `requireRole([ROLES.ADMIN], '/login/admin')` again | `redirect('/login/admin')` | `app/admin/blog/page.jsx#AdminBlogPage` |
| `/onboarding` | `requireRole(['client'], '/login/client')`, then `redirect('/dashboard')` when `company_id` is set | `redirect('/login/client')` | `app/onboarding/page.jsx#ClientOnboardingPage` |

`requireRole` (`lib/auth/require-role.js#requireRole`) redirects without a `next` parameter, so a role mismatch caught here loses the page the user asked for (middleware row 5 keeps it). `redirectHomeForRole` in the same file has no caller.

## 3. Route handlers

Seven handlers in six files. None of them runs behind `middleware.js` except `/auth/callback` and `/auth/verify`; `/api/*` is outside the matcher, so the CRM flag does not gate the contact form or the cron worker.

| Handler | Node id | Gate | Client | Writes | Calls out to | Statuses |
| --- | --- | --- | --- | --- | --- | --- |
| Contact form | `route:POST /api/contact` | public: strict IP limit, honeypot, hCaptcha | SR | CRM lead via RPC | Upstash, hCaptcha, contact webhook, Resend | 202, 400, 429, 502, 503 |
| Notification worker | `route:POST /api/cron/crm-notifications`, `route:GET /api/cron/crm-notifications` | shared secret | SR | outbox state, cleanup queue, Storage deletes | Resend, Auth admin API, Sentry | 200, 401, 500, 503 |
| Health | `route:GET /api/health` | none | none | none | none | 200 |
| Sentry check | `route:GET /api/sentry-verification` | preview only, fixed query value | none | none | Sentry | 404, 500 |
| Auth callback | `route:GET /auth/callback` | one-time code | US | session cookie | Supabase Auth | 307 |
| Auth verify | `route:GET /auth/verify` | one-time token | US | session cookie, `auth.users` | Supabase Auth | 307 |

### 3.1 `POST /api/contact`

Source: `app/api/contact/route.js#POST` (`runtime = 'nodejs'`). Caller: `components/marketing/ContactForm.jsx#submitForm`, rendered on the home Contact beat, `/contact`, `/about`, `/process` and the service pages.

| Item | Detail | Source |
| --- | --- | --- |
| Body fields | `name`, `email`, `company`, `budget`, `brief`, `website` (honeypot), `hcaptchaToken` | `lib/contactForm.mjs#validateContactForm`, `lib/hcaptcha.mjs#HCAPTCHA_TOKEN_FIELD` |
| Headers read | `x-real-ip`, then `x-vercel-forwarded-for` when `VERCEL=1`; off Vercel only `x-forwarded-for`, and only when `TRUSTED_PROXY_HOPS` is 1 to 5 | `lib/rateLimit.mjs#getClientIp` |
| Env read | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `VERCEL_ENV`, `VERCEL`, `TRUSTED_PROXY_HOPS`, `HCAPTCHA_SECRET`, `NEXT_PUBLIC_HCAPTCHA_SITE_KEY`, `CONTACT_WEBHOOK_URL`, `CONTACT_WEBHOOK_TIMEOUT_MS`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_REPLY_TO`, `CONTACT_NOTIFICATION_EMAIL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_APP_URL` (with `VERCEL_URL`, `NODE_ENV` as fallbacks) | `app/api/contact/route.js#webhookUrl`, `lib/appUrl.mjs#getAppUrl` |
| Normalisation | name, company, email, budget: trim and collapse whitespace; email also lowercased; brief: CRLF to LF and trim; `website`: non-string becomes `[invalid]` | `lib/contactForm.mjs#normalizeContactForm` |
| Validation | name 1 to 100; email 1 to 254 and `^[^\s@]+@[^\s@]+\.[^\s@]+$`; company up to 160; budget exactly one of `<$5k`, `$5–15k`, `$15–50k`, `$50k+`; brief 1 to 4000; honeypot empty | `lib/contactForm.mjs#CONTACT_FIELD_LIMITS`, `#CONTACT_BUDGETS` |
| Auth gate | none; throttled by IP and hCaptcha | `app/api/contact/route.js#checkRateLimitStrict` |
| Client | SR, only for the lead RPC | `app/api/contact/route.js#createLeadBestEffort` |

Ordered pipeline. "Written so far" is what already exists when the step fails or ends the request.

| # | Step | Failure or outcome | Written so far | Source |
| --- | --- | --- | --- | --- |
| 1 | Strict rate limit, bucket `contact`, 5 per 600 s per IP, run before the body is read | no Upstash env, no trusted IP, or Redis error in Production: 503 with `Retry-After: 120`; over the limit: 429; outside Production a missing config is allowed | nothing (one rate-limit counter increment at Upstash) | `app/api/contact/route.js#checkRateLimitStrict` |
| 2 | `request.json()` | unreadable body: 400 | nothing | `app/api/contact/route.js#POST` |
| 3 | `validateContactForm` | honeypot filled: 400 "Clear the extra field", nothing stored; any other invalid field: 400 with `errors` per field | nothing | `lib/contactForm.mjs#validateContactForm` |
| 4 | hCaptcha siteverify | token rejected or missing: 400 with `errors.hcaptcha`; no secret in Production, hCaptcha down or 5xx, or our secret rejected: 503 with `Retry-After: 120`; no secret outside Production: skipped | nothing | `lib/hcaptcha.mjs#verifyHCaptchaToken` |
| 5 | Channel check: `CONTACT_WEBHOOK_URL` set or `RESEND_API_KEY` set | neither: 503 "use the direct email option" | nothing, and the CRM write is skipped too | `app/api/contact/route.js#emailEnabled` |
| 6 | Webhook POST of the normalised data (no token), aborted and raced at the timeout | any failure, abort or timeout is "not delivered"; never throws | the webhook may have received the brief | `app/api/contact/route.js#deliverToWebhook` |
| 7 | CRM write: SR `create_lead_from_contact` | any error is logged and ignored; the visitor outcome is unchanged | company, contact, deal or note, and the `lead.created` outbox row, all in one RPC transaction | `app/api/contact/route.js#createLeadBestEffort` |
| 8 | Operations email (`contactSubmissionEmail`) to `CONTACT_NOTIFICATION_EMAIL` or `sales@cdsportswearinc.com`, Reply-To the visitor | failure is logged; `emailDelivered` stays false | steps 6 and 7 | `app/api/contact/route.js#contactSubmissionEmail` |
| 9 | Acknowledgement (`contactAckEmail`) to the visitor's address | only attempted when step 8 succeeded; a failure is ignored | step 8 | `app/api/contact/route.js#contactAckEmail` |
| 10 | Verdict | neither webhook nor operations email delivered: 502; otherwise 202 `{ ok: true }` | everything above | `app/api/contact/route.js#POST` |

What the lead RPC does (`fn:public.create_lead_from_contact`, args `p_name`, `p_email`, `p_company` (null when empty), `p_brief`, `p_budget`, `p_source = 'website_contact_form'`): serialises on the lowercased email, resolves a company and a contact, then either appends an internal note to the contact's open deal or creates a `prospecting` deal owned by the pinned admin, and always queues a `lead.created` email row for the pinned admin. It raises `P0002` when the pinned admin address has no auth user. Latest definition `supabase/migrations/0051_data_map_access_fixes.sql:387` (D4: never joins a company that has a client account); live is `0029_lead_capture_review_followups.sql:46`. Detail in `01b-database-logic.md`.

Outputs: JSON `{ ok, message, errors? }` with the status above; `Retry-After: 120` on the two 503s from steps 1 and 4; no cookies; no redirect.

- **Edge (L1):** the lead is committed in step 7 before the delivery verdict in step 10. Trigger: the webhook is down and Resend fails. Consequence: the visitor sees 502, but the company, contact, deal or note, and a queued `lead.created` email already exist. Their retry (new captcha, still inside 5 per 10 minutes) adds a second note and a second `lead.created` row.
- **Edge (L1):** every success notifies the admin twice. Trigger: any 202 with Resend configured. Consequence: one direct operations email (step 8) and one `lead.created` email from the outbox (step 7, sent later by the worker).
- **Edge (A6):** the pinned admin has no auth user (missing or renamed). Trigger: `create_lead_from_contact` raises `P0002`. Consequence: step 7 is swallowed, the visitor gets 202, the operations email arrives without a "View in CRM" button, and no company, contact, deal or outbox row is written. The only trace is the log line `create_lead_from_contact failed: No admin profile found for lead attribution.`
- **Edge (L2):** the acknowledgement goes to a visitor-supplied address with a visitor-supplied name (up to 100 characters), from the same Resend account that sends auth mail. Trigger: any submission that passes hCaptcha and the IP limit. Consequence: a third party can have the studio's sender mail an address of their choosing; the Resend AUP note in `CLAUDE.md` applies.
- **Edge:** the rate limit counts every request, including ones that fail validation, because step 1 runs before step 2. Trigger: 5 requests from one IP in 10 minutes, valid or not. Consequence: the sixth is a 429 even with a correct form.
- **Edge:** step 5 stops the request before the CRM write. Trigger: neither a webhook nor `RESEND_API_KEY` is set. Consequence: 503, and the brief is stored nowhere, not even in the CRM.
- **Edge:** this route is not in the middleware matcher. Trigger: `NEXT_PUBLIC_CRM_ENABLED=false`. Consequence: the CRM write and the `lead.created` row still happen.
- **Edge:** the optional "View in CRM" link is `{appUrl}/admin/deals/<deal_id>`. Trigger: `getAppUrl()` throws (unset in Production, non-https, path in the value, or a retired host). Consequence: the link is dropped, the lead is still written, and the email goes out without the button; the log line is `Contact email sent without a CRM link - app URL misconfigured` (`app/api/contact/route.js#dealUrlFor`).
- **Edge:** the body is parsed whole before any size check; field caps apply after parsing. The platform's request-body limit is the only bound (UNVERIFIED).
- **Edge:** neither email carries an idempotency key. Trigger: a Resend timeout that actually delivered, then the visitor retries. Consequence: duplicate mail.

### 3.2 `GET` and `POST /api/cron/crm-notifications`: the notification worker

Source: `app/api/cron/crm-notifications/route.js` (`runtime = 'nodejs'`, `dynamic = 'force-dynamic'`, no `maxDuration`). Both handlers return the same `drain(request)`: `GET` is what Vercel Cron sends, `POST` is for pg_cron and manual runs (`app/api/cron/crm-notifications/route.js#drain`). In the manifest the pipeline edges hang off the POST node and the GET node calls it.

Two schedulers call it. They share the lease logic in the database, so overlapping runs never claim the same row.

| Scheduler | Node | Cadence | Request | Secret |
| --- | --- | --- | --- | --- |
| pg_cron job `drain-crm-outbox` | `cron:pg_cron.drain-crm-outbox` | every 5 minutes | `POST https://www.cdsportswearinc.com/api/cron/crm-notifications`, body `{}`, `net.http_post` timeout 8000 ms | header `x-cron-secret` from Vault secret `crm_cron_secret` (`supabase/migrations/0042_repoint_cron_and_pinned_admin.sql:37`) |
| Vercel Cron | `cron:vercel.crm-notifications` | daily at 13:00 UTC | `GET /api/cron/crm-notifications` | `Authorization: Bearer $CRON_SECRET` (`vercel.json`) |

Pipeline, in order. Each step lists what has already been written when it fails.

| # | Step | Detail | On failure | Source |
| --- | --- | --- | --- | --- |
| 1 | Authorise | accepted secrets are the non-empty values of `CRM_CRON_SECRET` and `CRON_SECRET`; presented value is the `Bearer` token, else `x-cron-secret`; constant-time compare across every accepted secret | none configured, none presented, or no match: 401 `Unauthorized`. Nothing written | `app/api/cron/crm-notifications/route.js#isAuthorised` |
| 2 | Service-role client | `createAdminClient()` | key unset: 503 `Supabase service role is not configured.` Nothing written | `app/api/cron/crm-notifications/route.js#drain` |
| 3 | Attachment cleanup, before anything about email | SR `claim_attachment_cleanup(p_before = now - 24 h, p_limit = 50, p_lease_seconds = 600)` queues stale `pending` attachments that have no message, deletes their `project_attachments` rows, leases due queue entries and returns their paths; then Storage `remove(paths)` on `project-files`; success: SR `complete_attachment_cleanup(p_storage_paths)`; Storage error: SR `fail_attachment_cleanup(p_storage_paths, p_error)` and the run reports 0 cleaned | claim RPC missing (`PGRST202` or `42883`, migration `0048_durable_attachment_cleanup.sql` not applied): falls back to `cleanup_stale_project_attachments(p_before)` then `remove(paths)`; a failure there orphans the objects because the rows are already gone. Any other claim error is logged and the run continues | `app/api/cron/crm-notifications/route.js#cleanupStaleAttachments`, `#legacyCleanupStaleAttachments` |
| 4 | Email configured? | `isEmailConfigured()` is "`RESEND_API_KEY` is non-empty" | 503 `Email delivery is not configured.` Step 3 has already run | `app/api/cron/crm-notifications/route.js#isEmailConfigured` |
| 5 | App URL | `getAppUrl()` once per run, before the claim | throws: 503 `Application URL is not configured.` Outbox untouched; step 3 has already run | `app/api/cron/crm-notifications/route.js#getAppUrl` |
| 6 | Claim | SR `claim_notification_email_batch(p_limit = 25, p_lease_seconds = 300)`: email rows with `status = 'pending'`, `available_at <= now()`, `attempts < 25` and no live lease, ordered `available_at, created_at, id`, `FOR UPDATE SKIP LOCKED`; sets a new `lease_id` and lease window and adds 1 to `attempts` at claim time; returns `id, project_id, user_id, event_type, payload, attempts, lease_id` | error: 500 `Unable to claim the notification outbox.` Zero rows: 200 with all counts 0, then the watchdog | `app/api/cron/crm-notifications/route.js#claim_notification_email_batch` (`supabase/migrations/0033_notification_claim_leases.sql:64`) |
| 7 | Resolve context (SR reads, best effort) | recipients: `profiles(id, full_name, role)` for the unique `user_id`s, then `auth.admin.getUserById` per id for the email; projects: `projects(id, title, company_id, created_by, target_date)`; client context for `project.brief_submitted` and `project.user_assigned` only: creator profile, creator auth email and `created_at`, `companies(name)`, a project count per company; lead manager for `project.brief_submitted` and `project.status_transitioned`: earliest `project_assignments` row per project and that profile's name; live assignments: current (project, manager) pairs for project-manager recipients | a failed Auth lookup leaves that recipient out; a failed profiles read leaves name and role null; client, lead manager and assignment lookups degrade to "no details" or, for assignments, `checked: false` (fail open) | `app/api/cron/crm-notifications/route.js#resolveRecipients`, `#resolveProjects`, `#resolveProjectClients`, `#resolveLeadManagers`, `#resolveLiveAssignments` |
| 8 | Per row, one at a time | see the decision table below | each row ends in `sent`, `retrying`, `failed`, `skipped` or `leaseConflicts` | `app/api/cron/crm-notifications/route.js#drain` |
| 9 | Watchdog | three SR counts on `notifications_outbox` (email, pending): due more than 30 minutes ago with `attempts < 25` (`stuckPending`), the oldest of those (`oldestStuckMinutes`), and `attempts >= 25` (`exhausted`) | a query error leaves that count null. When `stuckPending > 0` or a row failed this run: `console.error` and `Sentry.captureMessage('CRM notification emails need attention', warning)` with counts only | `app/api/cron/crm-notifications/route.js#watchOutbox` |
| 10 | Response | 200 `{ ok, claimed, sent, failed, skipped, retrying, leaseConflicts, cleanedAttachments, stuckPending, oldestStuckMinutes, exhausted }`, counts only | n/a | `app/api/cron/crm-notifications/route.js#drain` |

Per-row decision table (first match wins). `attempts` is the post-claim value, so the first try is 1.

| # | Condition | Calls | Row ends as | Counter | Source |
| --- | --- | --- | --- | --- | --- |
| 1 | no recipient email (no `user_id`, Auth lookup error, or no address) | `mark_notification_email_failed(retryable false, 'missing_recipient')` | `failed` | `skipped` | `app/api/cron/crm-notifications/route.js#markLeaseFailed` |
| 2 | recipient role is `project_manager`, the row has a project, the assignment check ran, and the pair is no longer assigned | `mark_notification_email_failed(retryable false, 'missing_recipient')` | `failed` | `skipped` | `app/api/cron/crm-notifications/route.js#resolveLiveAssignments` |
| 3 | `renderNotificationEmail(event_type, ...)` returns null (no template) | `mark_notification_email_failed(retryable false, 'missing_template')` | `failed` | `skipped` | `lib/email/templates.js#renderNotificationEmail` |
| 4 | Resend accepts the send, then `mark_notification_email_sent(p_notification_id, p_lease_id)` returns 1 | `sendTemplate` with tag `crm-notification` and idempotency key `outbox-<row id>` | `sent` | `sent` | `app/api/cron/crm-notifications/route.js#mark_notification_email_sent` |
| 5 | the send succeeded but the mark RPC errors or returns other than 1 | none further | stays `pending` with the lease, so it is claimed again | `leaseConflicts` | `app/api/cron/crm-notifications/route.js#mark_notification_email_sent` |
| 6 | the send throws, `retryable` and `attempts < 5` | `mark_notification_email_failed(retryable true, 'provider_retryable', p_available_at = now + backoff)` | `pending` again | `retrying` | `app/api/cron/crm-notifications/route.js#backoffFor` |
| 7 | the send throws and is terminal (a 4xx other than 429) or `attempts >= 5` | `mark_notification_email_failed(retryable false, 'provider_terminal' or 'provider_retryable')` | `failed` | `failed` | `app/api/cron/crm-notifications/route.js#safeFailureMessage` |
| 8 | any mark RPC errors or reports not exactly 1 row | none further | stays leased until the lease expires | `leaseConflicts` | `app/api/cron/crm-notifications/route.js#markLeaseFailed` |

Retry timing by claim count: attempt 1 retries after 1 minute, 2 after 5, 3 after 15, 4 after 60, and the fifth is terminal. The 180-minute slot in `BACKOFF_MINUTES` is unreachable. The error text stored is `Email provider response status N.` or `Email delivery failed.`, never the provider message.

Template context. Everything below is built in `app/api/cron/crm-notifications/route.js#templateContextFor`; payload keys are snake_case, template props camelCase.

| Context | Comes from | Notes |
| --- | --- | --- |
| `fullName`, `recipientRole` | `profiles.full_name`, `profiles.role` of the recipient | role null when the profiles read failed; the recipient is then treated as a client |
| recipient address | `auth.users.email` through `auth.admin.getUserById` | `profiles` has no email column |
| `projectName`, `targetDate` | `projects.title`, `projects.target_date`; `payload.project_name` as fallback | |
| `projectUrl`, `staffProjectUrl` | `{appUrl}/dashboard/projects/<id>` for clients and unknown roles; `{appUrl}/admin/projects/<id>` for admin; `{appUrl}/team/projects/<id>` for project_manager; `{appUrl}/dashboard` when the row has no project | `appUrl` from `getAppUrl()` |
| `clientName`, `clientEmail`, `clientCompany`, `clientSince`, `clientProjectCount` | creator's profile and auth account, `companies.name`, project count per company | staff recipients only, and only for `project.brief_submitted` and `project.user_assigned`; `payload.client_email` is the fallback for `clientEmail` |
| `contactName`, `companyName`, `phone` | `payload.contact_name`, `payload.company_name`, `payload.phone` | staff recipients only |
| `companyUrl` | `{appUrl}/admin/companies/<payload.company_id>` | admin recipients only |
| `leadManagerName` | earliest `project_assignments` row's profile name | `project.brief_submitted` and `project.status_transitioned` only; a name, never an address |
| `dealUrl` | `{appUrl}/admin/deals/<payload.deal_id>` | `lead.created` |
| `reviewsUrl` | `{appUrl}/reviews` | `project.delivered` |
| the rest | `from_status`, `to_status`, `status`, `note`, `deliverable_name`, `version`, `task_title` or `title`, `due_date`, `priority`, `author_name`, `excerpt` or `body`, `role`, `lead_name`, `lead_company`, `lead_email`, `brief_title`, `brief_type`, `created_project === true` | straight from `notifications_outbox.payload` |

Event types the worker maps to a template: 14, onto 12 template functions (section 5). `in_app` and `realtime` outbox rows are never read or changed here.

- **Edge (N2):** send then mark is two separate steps. Trigger: the mark RPC fails, or the run outlives the 300 s lease. Consequence: the mail is already delivered, the row is claimed again and sent again; Resend's idempotency key suppresses the repeat only for 24 hours. A run takes up to 25 sequential sends plus one Auth lookup per recipient, and `pg_net` gives up after 8 s while the function keeps running (UNVERIFIED on Vercel; no `maxDuration` is set).
- **Edge (N1):** rows that were claimed 25 times without a mark stay `pending` forever. Trigger: repeated lease expiry (crashes, timeouts). Consequence: `attempts < 25` excludes them from every claim, no step ever sets them to `failed`, and they only show as `exhausted` in the response. The 4 such live rows have been stuck since 2026-08-26.
- **Edge (N2):** a transient recipient lookup failure is terminal. Trigger: `auth.admin.getUserById` errors for one id (rate limit, network). Consequence: the row is marked `failed` with `missing_recipient` and `No email address for the recipient profile.`, is never retried, and the user never gets that email.
- **Edge:** a failed `profiles` read does not stop the send. Trigger: that read errors. Consequence: the email goes out with "Hi there", the recipient is treated as a client, a project manager gets a `/dashboard/projects/<id>` link that middleware turns into `/team`, and staff-only client details are left out.
- **Edge:** a project manager replaced between enqueue and drain gets nothing. Trigger: the pair is absent from `project_assignments` when the batch resolves. Consequence: the row is marked `failed` with `Recipient is no longer assigned to this project.` Admins are not checked this way.
- **Edge (N9):** cleanup runs before the email and app-URL checks. Trigger: `RESEND_API_KEY` unset or the app URL invalid. Consequence: the response is 503 yet stale attachment rows and objects were already deleted that run.
- **Edge:** the response is 200 `{ ok: true }` even when every send failed. Trigger: Resend down. Consequence: pg_cron's `net._http_response` shows success; only the watchdog's Sentry warning and the `failed` and `stuckPending` counts reveal it.
- **Edge (N6):** no secret configured, or the pg_cron Vault secret differs from `CRM_CRON_SECRET` or `CRON_SECRET`. Trigger: either mismatch. Consequence: every call is 401 and the outbox stops draining with no email and a 401 sits in `net._http_response`, which nothing in the repo reads; the daily Vercel run succeeds or fails independently.
- **Edge (N3, N4):** `in_app` rows are written by the RPCs but this worker ignores them and no screen lists staff in-app rows, so they stay `pending` indefinitely (`06-edge-cases.md`).
- **Edge:** an event type with no template. Trigger: `enqueueNotification` with a free-text type, or `project.approval_requested`, `project.task_created`, `project.task_updated`, which have templates but no SQL producer. Consequence: unknown types become a terminal `missing_template`; the three known-but-unproduced types are only reachable through that action, which has no caller (N10).
- **Edge:** `leaseConflicts` is also incremented when the mark RPC errors after a successful send. Trigger: the mark RPC errors (a database timeout, or a function that is missing). Consequence: the count suggests a race when the real state is "mail out, row unmarked", and the next claim sends it again.

### 3.3 `GET /api/health`

Source: `app/api/health/route.js#GET`. No input, no auth, no Supabase call. Returns 200 `{ status: 'ok' }`. Caller: the Docker `HEALTHCHECK` (`Dockerfile`, `wget http://127.0.0.1:3000/api/health`). `pnpm livecheck` does not call it; it drives marketing pages only (`scripts/livecheck.mjs`).

- **Edge:** liveness only. Trigger: Supabase, Resend or Upstash is down. Consequence: still 200, so the container reads as healthy while the CRM is broken.

### 3.4 `GET /api/sentry-verification`

Source: `app/api/sentry-verification/route.js#GET` (`runtime = 'nodejs'`).

| Item | Detail |
| --- | --- |
| Input | `VERCEL_ENV`; query `?trigger=sentry-preview` |
| Gate | `VERCEL_ENV` must equal `preview` and the query value must match, else 404 `{ error: 'Not found' }` |
| Side effect | `Sentry.captureException(new Error('CWS Sentry preview verification'), { tags: { surface: 'sentry-verification', verification: 'preview-only' } })` then `Sentry.flush(2000)` |
| Output | 500 `{ ok: false, message: 'Sentry preview verification event sent.' }`, on purpose |
| Writes | none |

- **Edge:** any visitor can trigger it on a preview deployment. Trigger: `GET <preview>/api/sentry-verification?trigger=sentry-preview`. Consequence: each request sends one fixed error event and returns 500. Production answers 404 because `VERCEL_ENV` is `production`.

### 3.5 `GET /auth/callback`

Source: `app/auth/callback/route.js#GET`. Runs behind middleware (row 15 or 16: session refresh only).

| Item | Detail | Source |
| --- | --- | --- |
| Caller | the `redirectTo` passed to `generateLink` in signUp, resend, reset and invite is `{appUrl}/auth/callback?next=...`, but the emailed links point at `/auth/verify`; this route is reached only by GoTrue's own `action_link` or a PKCE or OAuth redirect. Whether anything live still lands here is UNVERIFIED | `app/auth/actions.js#generateLink`, `app/admin/users/actions.js#generateLink` |
| Inputs | query `code`; query `next` (default `/dashboard`); the host comes from `request.url` | `app/auth/callback/route.js#GET` |
| Client | US | `lib/supabase/server.js#createClient` |
| Write | `auth.exchangeCodeForSession(code)`; sets the `sb-<ref>-auth-token` cookies. Reads the `...-code-verifier` cookie; nothing in the repo writes that cookie (no `signInWithOAuth`, `signInWithOtp` or `resetPasswordForEmail`), so a server-issued link has no verifier (UNVERIFIED who else sets it) | `app/auth/callback/route.js#exchangeCodeForSession` |
| Success | 307 to `{origin}{safeAuthNext(next) ?? '/dashboard'}` | `lib/auth/roles.mjs#safeAuthNext` |
| Failure | no `code`, or an exchange error: 307 to `{origin}/login?error=auth-callback-failed` | `app/auth/callback/route.js#GET` |

- **Edge:** `next` is anything `safeAuthNext` rejects (off-site, another app path, malformed). Trigger: a crafted or stale link. Consequence: the user lands on `/dashboard` with no message; staff are then sent to their own home by middleware (section 2b row 7).
- **Edge:** `createClient()` throws on a malformed Supabase URL. Trigger: bad env. Consequence: uncaught, a 500, recorded by Sentry.
- **Edge:** a failed exchange sends the visitor to the `/login` chooser, which does not read `?error` (`app/login/page.jsx` has no `searchParams`). Consequence: the visitor sees the portal chooser with no explanation.

### 3.6 `GET /auth/verify`

Source: `app/auth/verify/route.js#GET`. Runs behind middleware (row 15 or 16).

| Item | Detail | Source |
| --- | --- | --- |
| Caller | every auth link the app emails, built by `buildVerifyUrl`: sign-up confirmation, resent confirmation, password reset, staff invite. The origin is `getAppUrl()` | `lib/supabase/admin.js#buildVerifyUrl` |
| Inputs | query `token_hash`, `type`, `next` (default `/dashboard`). `type` is not checked against a list in the app; GoTrue rejects an invalid one | `app/auth/verify/route.js#GET` |
| Client | US | `lib/supabase/server.js#createClient` |
| Write | `auth.verifyOtp({ token_hash, type })` consumes the one-time token inside GoTrue. For sign-up and invite it confirms the email; for recovery it opens a recovery session. It sets the session cookies. Which `auth.users` columns GoTrue touches is UNVERIFIED (the auth schema is not in this repo) | `app/auth/verify/route.js#verifyOtp` |
| Success | 307 to `{origin}{safeAuthNext(next) ?? '/dashboard'}`. Real values of `next`: `/dashboard` (sign-up), `/auth/reset-password` (reset), `/auth/reset-password?reason=invite` (invite) | `lib/auth/roles.mjs#safeAuthNext` |
| Failure | `token_hash` or `type` missing, or `verifyOtp` error: 307 to `/login?error=auth-callback-failed` | `app/auth/verify/route.js#GET` |

- **Edge:** the token is consumed by the GET itself. Trigger: an email scanner or link prefetcher opens the link first (UNVERIFIED that any does here, but it is standard for GET-verify links). Consequence: the real recipient's click finds a used token, lands on `/login` with the invisible error, and must request a new link.
- **Edge:** the origin of the link is `NEXT_PUBLIC_APP_URL`, now validated by `getAppUrl()`. Trigger: the variable names `www`. Consequence: the host layer 308s the link to the app host with the query intact, so the cookie still lands on the app host (section 2a row 1).
- **Edge:** the recovery and invite flows depend on the cookie that this route sets. Trigger: the user opens the link in a different browser from the one that later submits `/auth/reset-password`. Consequence: `updatePassword` has no session and returns GoTrue's error text.
- **Edge:** the sign-up link lands on `/dashboard`. Trigger: a newly confirmed client with no company. Consequence: the dashboard page sends them to `/onboarding` from the browser (`app/dashboard/page.jsx#DashboardPage`); this route and middleware do not.

## 4. Server actions

39 exported async functions in 7 `'use server'` files. A server action is a public POST endpoint: the role pre-checks below are a UX gate, and RLS plus the SECURITY DEFINER RPCs are the boundary. Callers come from the imports in `app/` and `components/`; "no caller" means no import anywhere in `app/`, `components/` or `lib/` (the function stays exported, so reachability by a crafted request is UNVERIFIED, S15).

### 4.1 `app/auth/actions.js` (7 actions)

Auth mail never goes through Supabase's own mailer. The actions call `auth.admin.generateLink` with the service role, build `{appUrl}/auth/verify?token_hash&type&next` with `lib/supabase/admin.js#buildVerifyUrl`, and send the message through Resend (`lib/email/resend.js#sendTemplate`). `appUrl` comes from `lib/appUrl.mjs#getAppUrl` and is resolved before `generateLink` runs, so a bad `NEXT_PUBLIC_APP_URL` stops the action before any account or token exists.

#### `signUp`

| Field | Detail |
| --- | --- |
| Source | `app/auth/actions.js#signUp` |
| Caller | `app/signup/page.jsx#handleSubmit` (rethrows `NEXT_REDIRECT`) |
| Gate | none (public) |
| Inputs | `email`, `password`, `fullName`, `accountType` |
| Validation | all of `email`, `password`, `fullName` present; `accountType` is `client` or `employee` (`lib/auth/roles.mjs#SIGNUP_ACCOUNT_TYPES`). No trim or lowercase of `email`, no length caps, no password rule in the app; `confirmPassword` is never read |
| Rate limit | bucket `auth:signup`: 5 per 600 s per client IP and per email; fails open |
| Client | SR for `generateLink` |
| Ordered writes | 1. `generateLink({ type: 'signup', email, password, options.data: { full_name, account_type }, redirectTo })` creates the unconfirmed `auth.users` row, which `on_auth_user_created` turns into a `client` profile (`requested_staff_access` when `accountType` is `employee`). 2. Resend: `confirmSignupEmail` to `email`, tag `signup-confirm` |
| External | Upstash, Supabase Auth admin, Resend |
| Outputs | `redirect('/auth/confirm?email=<encoded>')`; or `{ error }` |
| Failure paths | missing field: `Missing required fields`. Rate limited: `Too many signup attempts from this connection...`. Bad account type: `Choose whether this is a client or employee account.`. No service-role key or unsafe app URL: `Signup is temporarily unavailable. Please try again later.` (nothing written). `generateLink` error: `friendlyAuthError(error.message)`. Send failure: `Account created, but the confirmation email failed to send...` (the account exists) |

- **Edge (S14):** the email is already registered. Trigger: `generateLink` returns "already registered". Consequence: the visitor reads `An account with that email already exists. Try signing in instead.`, which confirms the address has an account (resend and reset are silent by design).
- **Edge (A5):** the account is created before the email is sent. Trigger: Resend fails or times out. Consequence: an unconfirmed `auth.users` row and its profile remain; the visitor is told to use "Resend confirmation", whose behaviour is UNVERIFIED (see `resendConfirmationEmail`).
- **Edge:** `confirmPassword` is compared only in the browser. Trigger: a direct POST. Consequence: a mismatched or any-length password is accepted by the action; only GoTrue's own rule applies (minimum 6 locally, `supabase/config.toml:205`; the hosted value is UNVERIFIED, A8).
- **Edge:** the address goes into the redirect URL. Trigger: success. Consequence: `/auth/confirm?email=<address>` carries it into browser history and logs.
- **Edge:** a second sign-up for an address that is registered but unconfirmed. Trigger: the same email again. Consequence: whether `generateLink` reissues a token, replaces the password, or errors is UNVERIFIED; if it replaces the password, whoever signs up second sets the password for the first person's account.

#### `signIn`

| Field | Detail |
| --- | --- |
| Source | `app/auth/actions.js#signIn` |
| Caller | `components/auth/PortalLoginForm.jsx#handleSubmit` (hidden `portal` and `next`; `next` pre-checked in the browser; rethrows `NEXT_REDIRECT`) |
| Gate | none (public) |
| Inputs | `portal` (`client`, `employee` or `admin`), `email`, `password`, `next` |
| Validation | `portal` must be a key of `lib/auth/roles.mjs#PORTALS`; email and password present |
| Rate limit | none in the app; GoTrue's own limits only |
| Client | US |
| Ordered writes | 1. `signInWithPassword` sets the `sb-<ref>-auth-token` cookies. 2. Read `profiles(id, role, company_id, full_name)` for the user. 3. Role not allowed for the portal, or no profile: `auth.signOut()` clears the cookies |
| External | Supabase Auth |
| Outputs | success: `redirect(safeNextForPortal(portal, next) ?? homeForRole(role))`. Mismatch: `redirect('<portal login>?error=portal')`. Missing field: `{ error: 'Missing email or password' }`. Client misconfigured: `{ error: 'configuration' }`. Auth error: `{ error: friendlyAuthError(message) }` |
| Failure paths | wrong credentials: `That email or password is incorrect.`; unconfirmed: `Please confirm your email before signing in...`; too many emails: the rate-limit copy |

- **Edge (S14):** the portal-mismatch redirect only happens after a correct password. Trigger: a client signs in on `/login/admin` with the right password. Consequence: the redirect to `?error=portal` confirms the credentials were valid.
- **Edge (S13):** there is no app-level throttle. Trigger: a scripted password guess. Consequence: only GoTrue's limits apply; the app never records or blocks the attempts.
- **Edge:** `next` belongs to a different portal, is off-site or is malformed. Trigger: a stale or hand-edited `?next=`. Consequence: `safeNextForPortal` returns null, the user lands on their role home, and no message says why (`lib/auth/roles.mjs#safeNextForPortal`).

#### `signOut`

| Field | Detail |
| --- | --- |
| Source | `app/auth/actions.js#signOut` |
| Callers | `components/crm/WorkspaceShell.jsx#WorkspaceShell`, `app/admin/page.jsx#AdminDashboard` (both `<form action={signOut}>`) |
| Gate | none; works with or without a session |
| Inputs | none |
| Client | US (`createClient` is not in a try/catch) |
| Ordered writes | `auth.signOut()` clears the session cookies |
| Outputs | `redirect('/login')` |

- **Edge:** `createClient()` throws on a malformed Supabase URL. Trigger: bad env. Consequence: the sign-out button produces a 500 and the session cookie is not cleared.
- **Edge:** which sessions `signOut` ends is the library default (UNVERIFIED), so other devices may stay signed in.

#### `getUser`

| Field | Detail |
| --- | --- |
| Source | `app/auth/actions.js#getUser` |
| Caller | none: **unused** |
| Gate | none |
| Client | US |
| Outputs | the caller's full Supabase auth user object (id, email, metadata, timestamps) |

- **Edge (S15):** exported but never imported. Trigger: someone posts to the action id. Consequence: it returns the caller's own full auth user to the browser, including `app_metadata` and `user_metadata`; it never returns anyone else's.

#### `resendConfirmationEmail`

| Field | Detail |
| --- | --- |
| Source | `app/auth/actions.js#resendConfirmationEmail` |
| Caller | `app/auth/confirm/page.jsx#handleResend` (the address comes from `?email=`, not from typing) |
| Gate | none (public) |
| Inputs | `email` |
| Validation | `email` present, else `{ error: 'Email is required' }` |
| Rate limit | bucket `auth:resend`: 5 per 600 s per IP and per email; fails open. A blocked call still returns success |
| Client | SR for `generateLink` |
| Ordered writes | 1. `generateLink({ type: 'signup', email, redirectTo })`, with no password. 2. Resend: `confirmSignupEmail` to `email`, `fullName` from `user_metadata.full_name`, tag `signup-confirm` |
| Outputs | `{ success: true }` on every path after the email check: rate limited, no service-role key, unsafe app URL, `generateLink` error, send error, and real success |

- **Edge (UNVERIFIED):** the signup link is requested without a password. Trigger: any resend. Consequence: if GoTrue rejects a password-less `signup` link, the action still reports success, no email is sent, and the visitor waits for mail that never comes. The repo cannot show which it is.
- **Edge:** a throttled or failed resend cannot be told from a successful one. Trigger: the sixth request in 10 minutes. Consequence: the page says "sent" with no mail (`app/auth/confirm/page.jsx#handleResend`); this is deliberate anti-enumeration.
- **Edge:** anyone can trigger this for any address that has an unconfirmed account. Trigger: `/auth/confirm?email=<victim>` and a click. Consequence: when the link request works (see the first edge), a confirmation mail is sent to the victim, up to 5 per 10 minutes per address.

#### `requestPasswordReset`

| Field | Detail |
| --- | --- |
| Source | `app/auth/actions.js#requestPasswordReset` |
| Caller | `app/forgot-password/page.jsx#handleSubmit` |
| Gate | none (public) |
| Inputs | `email` |
| Validation | `email` present, else `{ error: 'Email is required' }` |
| Rate limit | bucket `auth:reset`: 5 per 600 s per IP and per email; fails open. A blocked call still returns success |
| Client | SR for `generateLink` |
| Ordered writes | 1. `generateLink({ type: 'recovery', email, redirectTo })`. 2. Only when it found a user: Resend `resetPasswordEmail`, link `{appUrl}/auth/verify?token_hash&type=recovery&next=/auth/reset-password`, tag `password-reset` |
| Outputs | `{ success: true }` on every path after the email check |

- **Edge (S1):** the reset link goes to whatever mailbox the account's address resolves to. Trigger: an account on a retired domain. Consequence: whoever controls that domain's mail receives the staff login; S1 records the live account.
- **Edge:** a send failure is invisible. Trigger: Resend down. Consequence: the visitor sees success and no email arrives; only a log line `Failed to send password reset email` exists.

#### `updatePassword`

| Field | Detail |
| --- | --- |
| Source | `app/auth/actions.js#updatePassword` |
| Caller | `app/auth/reset-password/page.jsx#handleSubmit` (serves both reset and `?reason=invite`; rethrows `NEXT_REDIRECT`) |
| Gate | needs a live session (a recovery or invite session counts); the action does not check one itself |
| Inputs | `password` |
| Validation | non-empty only |
| Rate limit | none |
| Client | US |
| Ordered writes | 1. `auth.getUser()` (error ignored). 2. `auth.updateUser({ password })` writes `auth.users.encrypted_password`, which also clears the middleware must-set-password gate. 3. Read `profiles.role` for the redirect. 4. Resend `passwordChangedEmail` to the user's address, tag `password-changed` |
| Outputs | `redirect('/admin' \| '/team' \| '/dashboard')` by role, `/dashboard` when the role is unknown; `{ error }` on `updateUser` failure |
| Failure paths | no session or expired link: GoTrue's message through `friendlyAuthError` (exact wording UNVERIFIED); the notice email failing is logged and ignored |

- **Edge:** no re-authentication and no revocation. Trigger: any live session, including a stolen recovery session. Consequence: the password changes, the notice email goes to the account address, and other sessions stay signed in.
- **Edge (S13):** no rate limit. Trigger: repeated calls. Consequence: each success sends a security notice email.
- **Edge:** the `passwordChangedEmail` has no button, because the action never passes `supportUrl`. Consequence: the notice carries only a `mailto:` for "if this wasn't you".

### 4.2 `app/admin/users/actions.js` (3 actions)

All three call `requireAdmin()` (`requireRole(['admin'], '/login/admin')`) first; a non-admin is redirected before anything else runs. `admin` is deliberately not assignable: migration `supabase/migrations/0014_signup_account_type_and_single_admin.sql` pins it to one address (`app/admin/users/actions.js#ASSIGNABLE_ROLES`).

#### `inviteUser`

| Field | Detail |
| --- | --- |
| Source | `app/admin/users/actions.js#inviteUser` |
| Caller | `app/admin/users/invite/page.jsx#handleSubmit` |
| Gate | admin |
| Inputs | `email`, `fullName`, `role` |
| Validation | all present; `role` must be `project_manager` (`#INVITABLE_ROLES`). No trim, no length cap |
| Client | SR for `generateLink` and `deleteUser`; US for the role RPC |
| Ordered writes | 1. `generateLink({ type: 'invite', email, options.data.full_name, redirectTo })` creates the `auth.users` row with no password; the trigger adds a `client` profile. 2. RPC `admin_set_user_role(p_user_id, p_role)` promotes it. 3. Resend `inviteUserEmail`, link `{appUrl}/auth/verify?token_hash&type=invite&next=/auth/reset-password?reason=invite`, tag `invite`. 4. `redirect('/admin/users')` |
| External | Supabase Auth admin, Resend |
| Outputs | redirect, or `{ error }` |
| Failure paths | missing field: `Missing required fields`; bad role: `Invalid role`; no service-role key or unsafe app URL: `Invites are temporarily unavailable. Please try again later.` (nothing written); `generateLink` error: the raw GoTrue message; role RPC error: `auth.admin.deleteUser` (errors swallowed) then `Invite created, but role assignment failed.`; send error: `deleteUser` (swallowed) then `Invite created, but the email failed to send: <raw provider message>` |

- **Edge (A5):** the sequence is not atomic. Trigger: the role RPC or the email fails and the compensating `deleteUser` also fails. Consequence: the auth user and a `client` profile stay behind, and the admin's retry hits `already registered`; the deletion error is discarded.
- **Edge (A5):** raw provider text reaches the screen. Trigger: a Resend or GoTrue failure. Consequence: the admin sees the provider's message, which can include internal detail.
- **Edge:** an existing account cannot be invited. Trigger: the address is registered. Consequence: GoTrue's `already registered` text; the admin must use `changeUserRole` instead.
- **Edge:** the invited user exists with a `client` profile until step 2 commits. Trigger: a crash between steps 1 and 2. Consequence: an unusable account with no password and the wrong role.
- **Edge (UNVERIFIED):** the invite page returns silently when the action throws `NEXT_REDIRECT` instead of rethrowing it like the other forms (`app/admin/users/invite/page.jsx#handleSubmit`). Whether navigation to `/admin/users` still happens is not provable from the repo.

#### `resolveStaffRequest`

| Field | Detail |
| --- | --- |
| Source | `app/admin/users/actions.js#resolveStaffRequest` |
| Caller | `app/admin/users/page.jsx#handleStaffRequest` (optimistic update) |
| Gate | admin |
| Inputs | `userId`, `decision` (`approve` or `decline`) |
| Validation | `userId` present; `decision` in the pair. `userId` is not UUID-checked (the RPC casts it) |
| Client | US |
| Ordered writes | RPC `admin_resolve_staff_request(p_user_id, p_approve = decision === 'approve')`. Latest definition `supabase/migrations/0051_data_map_access_fixes.sql:740` (D7: refuses to change an admin's own role); live is `0014_signup_account_type_and_single_admin.sql:112` |
| Outputs | `{ ok: true, profile }`, or `{ ok: false, error: 'Unable to resolve this request.' }`; no `revalidatePath` |

- **Edge (S23):** approving the staff request on the admin's own profile. Trigger: the pinned admin account has `requested_staff_access` true. Consequence on the live `0014` function: the admin is demoted to `project_manager`, leaving no admin (the live admin's flag is false today, so it cannot fire). `0051` D7 blocks it once applied.

#### `changeUserRole`

| Field | Detail |
| --- | --- |
| Source | `app/admin/users/actions.js#changeUserRole` |
| Caller | `app/admin/users/page.jsx#handleRoleChange` (optimistic update) |
| Gate | admin |
| Inputs | `userId`, `role` |
| Validation | both present; `role` is `project_manager` or `client` (`#ASSIGNABLE_ROLES`); `userId` not UUID-checked |
| Client | US |
| Ordered writes | RPC `admin_set_user_role(p_user_id, p_role)` (`supabase/migrations/0008_auth_rbac_repair.sql:143`) |
| Outputs | `{ ok: true, profile }`, or `{ ok: false, error: 'Unable to update this role.' }`; no `revalidatePath` |

- **Edge (A4):** a role change leaves assignments, `company_id` and `requested_staff_access` as they were, and writes no audit event. Trigger: demoting a project manager. Consequence: the old assignments remain and `0051` D2 is what stops the demoted user receiving internal message excerpts.

### 4.3 `app/actions/onboarding-actions.js` (1 action)

#### `onboardClientCompany`

| Field | Detail |
| --- | --- |
| Source | `app/actions/onboarding-actions.js#onboardClientCompany` |
| Caller | `components/crm/ClientOnboardingForm.jsx#handleSubmit` (rethrows `NEXT_REDIRECT`) |
| Gate | profile role `client`; `getAuthenticatedProfile()` is not in a try/catch here, unlike the other action files |
| Inputs | `companyName`, `contactName`, `phone` |
| Validation | trimmed; `companyName` 1 to 120; `contactName` 1 to 120; `phone` up to 40, empty becomes null |
| Client | US |
| Ordered writes | RPC `onboard_client_company(p_company_name, p_contact_name, p_phone)`: inserts the company (email from the auth account), the contact and a `company_members` owner row, sets `profiles.company_id`, and queues a `client.onboarded` email row for every admin. Latest definition `supabase/migrations/0051_data_map_access_fixes.sql:625` (D6: never joins an existing company by email); live is `0046_client_notifications_and_hardening.sql:276`. Then `revalidatePath('/dashboard')` |
| Outputs | `redirect('/dashboard')`; or `{ ok: false, error }` |
| Failure paths | not a client: `You are not authorized to complete onboarding.`; bad field: a specific length message; client misconfigured: `Onboarding is temporarily unavailable...`; RPC error: `Unable to complete onboarding. Please try again.` with only the SQLSTATE logged |

- **Edge (A1):** the signer's email is already a contact (for example they used the contact form first). Trigger: live `0046`. Consequence: `23505` shares an errcode with "already linked", so the visitor sees the generic error and cannot finish onboarding; `0051` D6 fixes this once applied.
- **Edge:** a double submit. Trigger: two clicks. Consequence: the second call finds the account already linked, hits `23505`, and shows the generic error although the first call succeeded.
- **Edge:** a client who already has a company is redirected to `/dashboard` before validation (`profile.company_id`), so a stale form post does nothing.

### 4.4 `app/actions/assignment-actions.js` (2 actions)

Common shape for `app/actions/*` (except onboarding): each call makes a `requestId = randomUUID()`; checks the role through `getAuthenticatedProfile()` inside a try/catch (an exception becomes "not authorized"); builds the US client inside a try/catch; logs only `{ requestId, code }` with the code reduced to `[A-Z0-9_]{1,20}` or `UNKNOWN`; and returns `{ ok: false, error: <fixed text>, requestId }` or `{ ok: true, data, requestId }`. `revalidatePath` runs only on success. No action sets cookies.

#### `listProjectManagerCandidates`

| Field | Detail |
| --- | --- |
| Source | `app/actions/assignment-actions.js#listProjectManagerCandidates` |
| Caller | `components/crm/LeadManagerCard.jsx#loadCandidates` |
| Gate | admin (`#adminProfile`) |
| Inputs | none |
| Client | US, reads only |
| Reads | `profiles(id, full_name)` where `role = 'project_manager'`, ordered by name; `project_assignments(user_id, project_id)` for those ids; `projects(id, status)` for those project ids |
| Outputs | `{ ok, data: { managers: [{ id, fullName, openProjects }] } }`; names only, never an email |

- **Edge:** the two count queries ignore errors. Trigger: either read fails. Consequence: every manager shows 0 open projects with no message.

#### `setLeadProjectManager`

| Field | Detail |
| --- | --- |
| Source | `app/actions/assignment-actions.js#setLeadProjectManager` |
| Caller | `components/crm/LeadManagerCard.jsx#handleAssign` |
| Gate | admin |
| Inputs | `projectId`, `userId` (both canonical UUIDs) |
| Validation | status, the target's role (must be `project_manager`) and the current assignments are read from the database, never from the form |
| Client | US |
| Ordered writes (three separate RPCs, no transaction) | 1. When the chosen manager is not already the earliest assignment: `assign_project_user(p_project_id, p_user_id)` upserts the assignment and queues `project.user_assigned` email and in-app rows. 2. For each other assignee: `remove_project_assignment(p_project_id, p_user_id)`. 3. When the project is `brief_submitted`: `transition_project_status(p_project_id, p_to_status = 'planned', p_note = managerAssignedNote(name, projectId), p_visibility = 'shared')`, which queues `project.status_transitioned` |
| Revalidates | `/admin`, `/admin/projects`, `/admin/projects/<id>`, `/team`, `/team/projects/<id>`, `/dashboard`, `/dashboard/projects/<id>` |
| Outputs | `{ ok, data: { movedToPlanned, notified, warnings } }` |
| Failure paths | step 1 fails: `Unable to assign this project.` and nothing else runs; step 2 or 3 fails: the call still succeeds with a warning string |

- **Edge (P6):** step 1 commits and queues the assignment email before steps 2 and 3 can fail. Trigger: a removal or the transition fails. Consequence: two managers stay on the project (the warning tells the admin to remove one) or the project stays `brief_submitted`, and the new manager has already been emailed.
- **Edge:** step 1 is skipped when the chosen manager already leads. Trigger: re-selecting the current lead. Consequence: no second email, but steps 2 and 3 still run.
- **Edge:** the note text uses the manager's profile name. Trigger: any promotion from `brief_submitted`. Consequence: clients read that name and intro line in their status history, matching their email because both hash the project id (`lib/crm/notification-copy.mjs#managerAssignedNote`).

### 4.5 `app/actions/blog-actions.js` (4 actions)

All four are in `app/actions/blog-actions.js` and gate on role `admin` (`#authorProfile`); RLS from `supabase/migrations/0035_blog_posts.sql` is the load-bearing check. Input is validated by `lib/crm/blog-contract.mjs#validateBlogPost`: title 1 to 200, body 1 to 100000, slug lowercased or derived from the title (up to 80, format-checked), excerpt up to 320 (derived from the body when empty), SEO title up to 70, SEO description up to 200, cover image an `https://` URL, status `draft` or `published`. `published_at` is set by a database trigger.

| Action | Caller | Inputs | Ordered writes (US) | Revalidates | Outputs and edge |
| --- | --- | --- | --- | --- | --- |
| `createPostAction` (`app/actions/blog-actions.js#createPostAction`) | `app/admin/blog/PostForm.jsx#PostForm` on `/admin/blog/new` | all post fields | `blog_posts` insert of `title, slug, body, excerpt, seo_title, seo_description, cover_image_url, status, author_id` | `/blog`, `/sitemap.xml`, `/blog/<slug>`, `/admin/blog` | `redirect('/admin/blog/<id>')`; `23505` becomes a slug field error. **Edge (U7, fixed F7):** leaving the new-post form means a second submit updates the same row instead of inserting a duplicate |
| `updatePostAction` (`#updatePostAction`) | `PostForm` on `/admin/blog/[id]` | `id` plus all post fields | read old `slug` (errors ignored), then `blog_posts` update of the same columns except `author_id` | the same, plus `/blog/<old slug>` when it changed | `{ ok, data: { id, slug } }`. **Edge:** the old-slug read ignores errors, so a failed read skips revalidating the previous URL |
| `setPostStatusAction` (`#setPostStatusAction`) | `app/admin/blog/PostRowActions.jsx#toggleStatus` | `id`, `status` (`draft` or `published`) | `blog_posts` update of `status` | the same four | `{ ok, data: { id, slug, status } }`. **Edge:** a publish does not carry an unsaved body edit; it flips the stored row |
| `deletePostAction` (`#deletePostAction`) | `app/admin/blog/PostRowActions.jsx#remove` | `id` | `blog_posts` delete, returning `slug` | `/blog`, `/sitemap.xml`, `/admin/blog`, and `/blog/<slug>` only when a row came back | `{ ok, data: { deleted: true } }`. **Edge:** an id that matches no row still reports `deleted: true` |

- **Edge:** the writes touch the same table the publish workflow writes with the service role (`script:scripts/seo/publish-blog-drafts.mjs`). Trigger: both edit one slug. Consequence: last write wins, and the workflow overwrites admin edits to draft rows on push to `main` (S18).

### 4.6 `app/actions/brief-actions.js` (4 actions)

All four require role `client` with a canonical-UUID `company_id` (`#clientProfile`); the others get `Finish setting up your company before starting a brief.` or a "not authorized" message. Failures carry `retryable`: validation and authorisation `false`, database and network `true` (`#invalid`, `#databaseFailure`). Drafts are written directly under RLS (`supabase/migrations/0043_project_briefs.sql`); the only draft-to-submitted path is the RPC.

#### `startBrief`

| Field | Detail |
| --- | --- |
| Source | `app/actions/brief-actions.js#startBrief` |
| Callers | `app/dashboard/page.jsx#handleStartBrief`, `components/crm/ProjectBriefs.jsx#handleStart` |
| Inputs | `briefType`, optional `projectId` |
| Validation | `isBriefType(briefType)`; `projectId` empty or a canonical UUID |
| Ordered writes | 1. Read `companies(name, website, industry)` for the pre-fill (a failure only loses the pre-fill). 2. `project_briefs` insert of `company_id, created_by, project_id, brief_type, title, answers, template_version` |
| Revalidates | `/dashboard` |
| Outputs | `{ ok, data: { briefId } }` |

- **Edge:** no idempotency. Trigger: a double click. Consequence: two draft rows.

#### `saveBriefDraft`

| Field | Detail |
| --- | --- |
| Source | `app/actions/brief-actions.js#saveBriefDraft` |
| Caller | `components/crm/BriefWizard.jsx#flush` (autosave, debounced) |
| Inputs | `briefId`, `answers` (JSON text) |
| Validation | `briefId` canonical UUID; `answers` at most `2 x 56000` characters raw, then `sanitizeBriefAnswers`, then at most `56000` bytes |
| Ordered writes | 1. Read the brief (`id, brief_type, status, project_id, answers, title`). 2. `project_briefs` update of `answers, title` where `status = 'draft'` |
| Revalidates | none |
| Outputs | `{ ok, data: { savedAt } }`; a brief no longer a draft returns `{ ok: false, submitted: true }`; `42501` and `23514` set `retryable: false` |

- **Edge (U14):** the whole `answers` column is replaced. Trigger: the same draft open in two tabs. Consequence: the last autosave wins and the other tab's answers are lost.

#### `deleteBriefDraft`

| Field | Detail |
| --- | --- |
| Source | `app/actions/brief-actions.js#deleteBriefDraft` |
| Caller | `app/dashboard/page.jsx#handleDeleteDraft` |
| Inputs | `briefId` |
| Ordered writes | `project_briefs` delete where `status = 'draft'`, asking for the row back; on no row, re-read `status` |
| Revalidates | `/dashboard` |
| Outputs | `{ ok, data: { briefId } }`; already submitted: `{ ok: false, conflict: true }`; otherwise `Brief not found.` |

#### `submitBrief`

| Field | Detail |
| --- | --- |
| Source | `app/actions/brief-actions.js#submitBrief` |
| Caller | `components/crm/BriefWizard.jsx#handleSubmit` |
| Inputs | `briefId`, `destination` (`attach` or anything else meaning `new`), `projectId`, `projectTitle`, `targetDate` |
| Validation | `briefId` UUID; `attach` needs a canonical `projectId`; `targetDate` empty or a real `YYYY-MM-DD`; a new project needs a title of 3 to 120 characters after whitespace collapse; required answers present (`missingRequiredAnswers`) |
| Ordered writes | 1. Read the draft. 2. When the destination differs from the draft's `project_id`: `project_briefs` update of `project_id` (before the RPC). 3. RPC `submit_project_brief(p_brief_id, p_summary = renderBriefSummary(...), p_project_id, p_project_title, p_target_date)`: marks the brief submitted, creates the project when none was chosen, and queues `project.brief_submitted` (staff) and `project.brief_received` (client). Latest definition `supabase/migrations/0046_client_notifications_and_hardening.sql:87` |
| Revalidates | `/dashboard`, `/dashboard/projects/<id>`, `/team/projects/<id>`, `/admin/projects/<id>` |
| Outputs | `{ ok, data: { projectId } }`; `P0002`, `22023` and `42501` map to specific messages and `retryable: false` |

- **Edge:** step 2 commits before the RPC. Trigger: the RPC then fails (for example the chosen project was cancelled in between). Consequence: the draft keeps the new `project_id`, so reopening it shows the destination the user last tried, not the one it started with.
- **Edge:** a retry after success. Trigger: a double click or a lost response on a brief that is already `submitted`. Consequence: the app skips its draft-only checks and the RPC returns the existing project id (`supabase/migrations/0046_client_notifications_and_hardening.sql:137`), so no second project or notification is created and the wizard still reaches the project page.

### 4.7 `app/actions/project-actions.js` (18 actions)

Shape shared by every action here: role pre-check `authenticatedProfile(roles)` (US; any exception means "not authorized"); UUIDs must be canonical lowercase (`#CANONICAL_UUID_PATTERN`); `visibility` defaults to `shared` and `internal` is accepted only from a `project_manager` or `admin` (`lib/crm/project-contract.mjs#canPostVisibility`); statuses and enums come from `lib/crm/project-contract.mjs` (`PROJECT_STATUSES`, `TASK_STATUSES`, `TASK_PRIORITIES`, `APPROVAL_DECISION_STATUSES`, `DELIVERABLE_PUBLISH_STATUSES`). Every write is a US call to a SECURITY DEFINER RPC that re-checks `auth.uid()`; none uses the service role. Revalidation sets: **client** = `/dashboard` and `/dashboard/projects/<id>`; **assign** = `/admin/projects`, `/admin/projects/<id>`, `/team`, `/team/projects/<id>`; **all** = client plus assign. Only the RSC pages (`/team`, `/admin/blog*`) are refreshed by `revalidatePath`; the client pages refetch in the browser. Latest RPC definitions are cited by migration; `0051` is not applied live.

Migration key for the `NNNN:line` cites below (all under `supabase/migrations/`): `0009` = `0009_project_realtime_crm.sql`; `0010` = `0010_project_workspace.sql`; `0012` = `0012_project_task_update_fixes.sql`; `0013` = `0013_project_notes_and_deliverables.sql`; `0015` = `0015_project_notifications_and_message_editing.sql`; `0023` = `0023_visibility_aware_notification_recipients.sql`; `0027` = `0027_security_and_notification_hardening.sql`; `0030` = `0030_transition_status_visibility_recipients.sql`; `0031` = `0031_idempotent_client_project_intake.sql`; `0032` = `0032_project_asset_lifecycle_hardening.sql`; `0046` = `0046_client_notifications_and_hardening.sql`; `0047` = `0047_staff_only_task_and_deliverable_rpcs.sql`.

Roles: **C** = client, **PM** = project_manager, **A** = admin.

| Action | Roles | Inputs and validation | RPC called and arguments | Queued by the RPC | Callers | Revalidates | Symbol in `app/actions/project-actions.js` |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `createProject` | C with `company_id` | `title` 3 to 120 (whitespace collapsed); `category` in `PROJECT_CATEGORIES`; `brief` 1 to 5000; `targetDate` empty or real date | `create_project(p_company_id = profile.company_id, p_category, p_title, p_brief, p_target_date, p_source_deal_id = null)` (`0031:18`) | nothing | `components/crm/BriefSubmissionForm.jsx#handleBriefSubmit` | client | `#createProject` |
| `assignProject` | A | `projectId`, `userId` | `assign_project_user(p_project_id, p_user_id)` (`0015:614`) | `project.user_assigned` email and in-app | **none: unused** | assign | `#assignProject` |
| `removeProjectAssignment` | A | `projectId`, `userId` | `remove_project_assignment(p_project_id, p_user_id)` (`0009:665`) | nothing | `components/crm/LeadManagerCard.jsx#handleRemove` | assign | `#removeProjectAssignment` |
| `transitionProject` | PM, A | `projectId`; `fromStatus` and `toStatus` in `PROJECT_STATUSES` and `canTransition(from, to)`; `visibility`; `note` up to 2000 | `transition_project_status(p_project_id, p_to_status, p_note, p_visibility)` (`0030:33`) | `project.status_transitioned` email and in-app; a second `project.delivered` row on delivery | `app/admin/projects/[id]/page.jsx#handleTransition`, `app/team/projects/[id]/page.jsx#handleTransition` | all | `#transitionProject` |
| `reserveAttachment` | C, PM, A | `projectId`; `visibility`; `fileName` 1 to 255; `mimeType` in {pdf, docx, png, jpeg, plain text}; `sizeBytes` 1 to 10 MiB. All three file facts are client-declared | `reserve_project_attachment(p_project_id, p_visibility, p_file_name, p_mime_type, p_size_bytes)` (`0009:828`) | nothing | `components/crm/useProjectThread.js#handleFileChange` | all | `#reserveAttachment` |
| `finalizeAttachment` | C, PM, A | `projectId`, `attachmentId` | `finalize_project_attachment(p_attachment_id)` (`0009:1066`) | nothing | `components/crm/useProjectThread.js#handleFileChange` | all | `#finalizeAttachment` |
| `postProjectMessage` | C, PM, A | `projectId`; `visibility`; `body` 1 to 10000; `clientGeneratedId` (UUID, defaults to a new one); `attachmentIds` (repeated field or a JSON array; unique canonical UUIDs) | `post_project_message(p_project_id, p_body, p_visibility, p_client_generated_id, p_attachment_ids)` (`0032:53`) | `project.message_posted` email and in-app | `components/crm/useProjectThread.js#handleSend` | all | `#postProjectMessage` |
| `editProjectMessage` | C, PM, A | `projectId`, `messageId`, `body` 1 to 10000 | `update_project_message(p_message_id, p_body)` (`0023:211`) | `project.message_edited` email and in-app | `components/crm/useProjectThread.js#handleSaveEdit` | all | `#editProjectMessage` |
| `createAttachmentDownloadUrl` | C, PM, A | `projectId`, `assetId`, `kind` (`attachment` or `deliverable`) | none: reads `project_attachments` (`status = 'ready'`) or `project_deliverables` (`status <> 'draft'`), then Storage `createSignedUrl(storage_path, 60)` on `project-files` with the user session | nothing | `components/crm/ProjectFiles.jsx#handleDownload`, `components/crm/useProjectThread.js#handleDownload` | none | `#createAttachmentDownloadUrl` |
| `createProjectTask` | PM, A | `projectId`; `title` 1 to 255; `description` up to 10000; `status` in `TASK_STATUSES` (default `todo`); `priority` in `TASK_PRIORITIES` (default `medium`); `dueDate`; `assigneeId` (not UUID-checked); `clientVisible === 'true'` | `create_project_task(p_project_id, p_title, p_description, p_status, p_assignee_id, p_due_date, p_priority, p_client_visible)` (`0047:37`) | nothing | `app/team/projects/[id]/page.jsx#handleAddTask` | all | `#createProjectTask` |
| `updateProjectTask` | C, PM, A | `projectId`, `taskId`; optional `title`, `description`, `status`, `assigneeId`, `dueDate` | `update_project_task(p_task_id, p_title, p_description, p_status, p_assignee_id, p_due_date)` (latest `0051_data_map_access_fixes.sql:237`, D3; live `0012:11`) | nothing | **none: unused** | all | `#updateProjectTask` |
| `createProjectApproval` | C, PM, A | `projectId`; optional `deliverableId`; `note` up to 2000 | `create_project_approval(p_project_id, p_deliverable_id, p_note)` (`0010:356`) | nothing | **none: unused** | all | `#createProjectApproval` |
| `updateProjectApproval` | PM, A | `projectId`, `approvalId`, `status` in {approved, rejected}, `note` up to 2000 | `update_project_approval(p_approval_id, p_status, p_note)` (latest `0051_data_map_access_fixes.sql:136`, D1; live `0015:442`) | `project.approval_updated` email and in-app | `components/crm/ProjectApprovals.jsx#decide` | all | `#updateProjectApproval` |
| `createProjectDeliverable` | PM, A | `projectId`; `visibility`; `title` 1 to 255; `description` up to 10000; `fileName`; `mimeType`; `sizeBytes` (as for attachments); `version` 1 to 32 (default `1`) | `create_project_deliverable(p_project_id, p_title, p_file_name, p_mime_type, p_size_bytes, p_description, p_visibility, p_version)` (`0047:128`) | nothing | `components/crm/ProjectFiles.jsx#handleUpload` | all | `#createProjectDeliverable` |
| `publishDeliverable` | PM, A | `projectId`, `deliverableId`, `status` in {submitted, approved, rejected} (default `submitted`) | `publish_project_deliverable(p_deliverable_id, p_status)` (`0047:254`) | `project.deliverable_published` email and in-app | `components/crm/ProjectFiles.jsx#handleUpload` | all | `#publishDeliverable` |
| `postProjectNote` | C, PM, A | `projectId`, `visibility`, `note` 1 to 2000 | `post_project_note(p_project_id, p_note, p_visibility)` (`0013:55`) | `project.note_posted`, in-app only | `components/crm/NotesPanel.jsx#handleSubmit` | all | `#postProjectNote` |
| `enqueueNotification` | PM, A | `projectId`; `channel` in {email, in_app, realtime}; `eventType` 1 to 120; `payload` JSON text (default `{}`); optional `userId` | `enqueue_project_notification(p_project_id, p_channel, p_event_type, p_payload, p_user_id)` (`0046:417`) | whatever the caller names | **none: unused** | all | `#enqueueNotification` |
| `markNotificationsRead` | C, PM, A | repeated `notificationId`; invalid ids are dropped, duplicates reject the call | `mark_notifications_read(p_notification_ids)` (`0027:32`) | nothing | `components/crm/NotificationsPanel.jsx#markRead`, `app/dashboard/projects/[id]/page.jsx#ClientProjectPage` | `/dashboard`, `/team`, `/admin` | `#markNotificationsRead` |

Outputs are `{ ok: true, data, requestId }` with `data` as in the manifest (`projectId`, `assignmentId`, `historyId`, the reservation or deliverable row, `messageId`, `taskId`, `approvalId`, `deliverableId`, `notificationId`, `marked`) or `{ ok: false, error, requestId }` with a fixed message.

Three-step flows. An attachment is `reserveAttachment` (RPC), then a browser upload to `project-files` with the user JWT (not a server step), then `finalizeAttachment` (RPC), then `postProjectMessage` attaches it. A deliverable is `createProjectDeliverable`, then the browser upload, then `publishDeliverable`. The browser step is documented in `03-screens.md`.

- **Edge (P7, N8):** `createProject` sends no `p_client_generated_id`, although `0031` added idempotency for it, and passes `p_source_deal_id = null`. Trigger: a double submit. Consequence: two projects, no staff notification (unlike the brief wizard path), and nothing anywhere sets `projects.source_deal_id`, so the deal-to-project link is never written.
- **Edge:** `transitionProject` checks `fromStatus` against `canTransition` but does not send it. Trigger: the page's copy of the status is stale. Consequence: the database validates against the real current status and may reject a transition the screen offered.
- **Edge (P4):** `reserveAttachment` and `createProjectDeliverable` trust the declared MIME type and size. Trigger: any client. Consequence: the app rejects only values outside its list; whether Storage enforces size or type is UNVERIFIED (the bucket has no limits in migrations).
- **Edge (S11, P5):** upload failure in step 2 or 3. Trigger: the browser upload fails after `reserveAttachment`. Consequence: the attachment stays `pending` with no message and the worker deletes it after 24 hours; a finalized attachment whose message post then fails stays `ready` and is never swept; a draft deliverable whose upload failed is never swept.
- **Edge:** `postProjectMessage` creates a fresh `clientGeneratedId` when none is sent. Trigger: a caller that retries without the id. Consequence: the retry posts a second message.
- **Edge (P10):** `updateProjectTask` treats null as "no change", so an assignee or due date cannot be cleared; it has no caller anyway.
- **Edge (P1):** `createProjectApproval` has no caller and no screen lets a client decide an approval, although `project.approval_requested` copy says "Your approval is needed".
- **Edge (N10):** `enqueueNotification` accepts any `eventType` and any channel. Trigger: a staff caller posts an unknown type. Consequence: the row becomes a terminal `missing_template` at the worker, and a null `userId` is accepted by the RPC.
- **Edge (S8):** `createAttachmentDownloadUrl` answers for any row the RLS select returns. Trigger: a client asks for a deliverable the `0010` select policy lets them read but that is not downloadable, for example a rejected one. Consequence: the row is found and a 60-second signed URL is requested, and (per S8) the download then fails; which step refuses it is UNVERIFIED. A draft deliverable is filtered out by the action itself and returns `Unable to authorize this download.`
- **Edge:** the notes (`postProjectNote`) and the status transition note ("Status moved to X.") are shared by default. Trigger: any staff post without `visibility = internal`. Consequence: clients see it (S12: no screen offers an internal option).

## 5. Email templates

Every transactional email is rendered in `lib/email/templates.js` and sent by `lib/email/resend.js#sendEmail`. Sender: `RESEND_FROM_EMAIL`, else `CD Sportswear INC <no-reply@cdsportswearinc.com>`. Reply-To: `RESEND_REPLY_TO`, else `sales@cdsportswearinc.com` (`lib/site.js`), except the operations email, whose Reply-To is the visitor. Each message carries a plain-text part derived from the HTML (`lib/email/resend.js#htmlToText`) and one Resend tag named `category`. Every interpolated value passes `escapeHtml` or `escapeAttr`, so a name or excerpt cannot break out of the markup (`lib/email/templates.js#escapeHtml`). Subjects are raw strings. The logo is `{SITE_ORIGIN}{SITE.logoPath}`, always on `www`. The call-to-action button and its fallback link print only when `ctaUrl` is set (`lib/email/templates.js#emailLayout`).

Every link below is built from `lib/appUrl.mjs#getAppUrl()`, which throws instead of returning an unset, malformed, non-https (Production), path-bearing or retired origin. Auth links go through `lib/supabase/admin.js#buildVerifyUrl`; worker links through `app/api/cron/crm-notifications/route.js#templateContextFor`; the contact link through `app/api/contact/route.js#dealUrlFor`.

### 5a. Auth and contact templates (sent directly by an action or route)

| Template | Sent by | Data fields | Link | Recipient and tag | Source |
| --- | --- | --- | --- | --- | --- |
| `confirmSignupEmail` | `app/auth/actions.js#signUp`, `#resendConfirmationEmail` | `confirmUrl`, `fullName` (form value on sign-up, `user_metadata.full_name` on resend) | `{appUrl}/auth/verify?token_hash=<hashed_token>&type=signup&next=/dashboard` | the address typed; `signup-confirm` | `lib/email/templates.js#confirmSignupEmail` |
| `resetPasswordEmail` | `app/auth/actions.js#requestPasswordReset` | `resetUrl` | `{appUrl}/auth/verify?token_hash&type=recovery&next=/auth/reset-password` | the address typed, only when a user exists; `password-reset` | `lib/email/templates.js#resetPasswordEmail` |
| `inviteUserEmail` | `app/admin/users/actions.js#inviteUser`; `lib/email/resend.js#sendInviteEmail` (used only by `scripts/provision-crm-test-users.mjs`) | `inviteUrl`, `fullName`, `role` (label `Project Manager`) | `{appUrl}/auth/verify?token_hash&type=invite&next=/auth/reset-password?reason=invite` | the address the admin typed; `invite` | `lib/email/templates.js#inviteUserEmail` |
| `passwordChangedEmail` | `app/auth/actions.js#updatePassword` | `fullName`; `supportUrl` is never passed | none; a `mailto:` for the support address | the signed-in user's address; `password-changed` | `lib/email/templates.js#passwordChangedEmail` |
| `emailChangeEmail` | none: **unused** | `confirmUrl`, `fullName`, `newEmail` | `confirmUrl` | n/a | `lib/email/templates.js#emailChangeEmail` |
| `contactSubmissionEmail` | `app/api/contact/route.js#POST` | `name`, `email`, `company`, `budget`, `brief`, `dealUrl` | `{appUrl}/admin/deals/<deal_id>`, omitted when the lead RPC or the app URL check failed | `CONTACT_NOTIFICATION_EMAIL` else `sales@cdsportswearinc.com`, Reply-To the visitor; `contact-form` | `lib/email/templates.js#contactSubmissionEmail` |
| `contactAckEmail` | `app/api/contact/route.js#POST`, only after the operations email succeeded | `name` | none; a `mailto:` and the studio phone | the visitor's address; `contact-ack` | `lib/email/templates.js#contactAckEmail` |

- **Edge:** a verify link is valid once. Trigger: a mail client or scanner opens it, or the recipient clicks twice. Consequence: the second use fails and lands on `/login?error=auth-callback-failed` with no message (section 3.6).
- **Edge (S1):** the three auth links grant a session to whoever can read the mailbox. Trigger: an account whose address is on a domain someone else controls. Consequence: that person gets sign-in, reset or invite access.
- **Edge:** `emailChangeEmail` is dead code. Trigger: n/a. Consequence: no screen or action changes an account's email, so a template for it can never fire.

### 5b. CRM notification templates (sent by the cron worker)

The worker looks a template up by `notifications_outbox.event_type` in `lib/email/templates.js#NOTIFICATION_TEMPLATES` (14 event types, 12 template functions) and passes the context described in section 3.2. `renderNotificationEmail` returns null for an unknown type, which the worker records as a terminal `missing_template`. All are tagged `crm-notification` and sent with the idempotency key `outbox-<row id>`. Links are role-specific: a client gets `{appUrl}/dashboard/projects/<project id>`, an admin `{appUrl}/admin/projects/<id>`, a project manager `{appUrl}/team/projects/<id>`.

| Template | Event types | Enqueued by (SQL producer) | Data fields | Link | Subject |
| --- | --- | --- | --- | --- | --- |
| `projectStatusChangedEmail` | `project.status_transitioned` | `transition_project_status` | `projectName`, `fromStatus`, `toStatus`, `leadManagerName`, `recipientRole`, `projectId`, `fullName` | project URL by role | `<project> is now <status>`; for a client moving `brief_submitted` to `planned`: `<project> is planned: meet <manager>, your project manager` |
| `projectApprovalUpdatedEmail` | `project.approval_updated`; `project.approval_requested` (no SQL producer) | `update_project_approval` | `projectName`, `status`, `note`, `fullName` | project URL by role | `Approval <approved or rejected> - <project>` |
| `deliverablePublishedEmail` | `project.deliverable_published` | `publish_project_deliverable` | `projectName`, `deliverableName`, `version`, `fullName` | project URL by role | `New deliverable ready - <project>` |
| `taskAssignedEmail` | `project.task_created`, `project.task_updated` (no SQL producer for either) | none; only `enqueueNotification`, which has no caller | `projectName`, `taskTitle`, `dueDate`, `priority`, `fullName` | project URL by role | `New task assigned - <task>` |
| `projectMessageEmail` | `project.message_posted` | `post_project_message` | `projectName`, `authorName`, `excerpt` (first 200 characters), `fullName` | project URL by role | `New message on <project>` |
| `projectMessageEditedEmail` | `project.message_edited` | `update_project_message` | `projectName`, `authorName`, `excerpt`, `fullName` | project URL by role | `Message edited on <project>` |
| `projectAssignedEmail` | `project.user_assigned` | `assign_project_user` | `projectName`, `role`, `clientName`, `clientEmail`, `clientCompany`, `targetDate`, `fullName` | project URL by role | `You're the project manager for <project>` or `You've been added to <project>` |
| `projectDeliveredEmail` | `project.delivered` | `transition_project_status` (second row on delivery) | `projectName`, `fullName` | `{appUrl}/reviews` | `<project> is delivered - time to celebrate!` |
| `leadCreatedEmail` | `lead.created` | `create_lead_from_contact` | `leadName`, `leadCompany`, `leadEmail` | `{appUrl}/admin/deals/<payload.deal_id>` | `New lead - <name>` |
| `briefSubmittedEmail` | `project.brief_submitted` | `submit_project_brief` | `projectName`, `briefTitle`, `briefType`, `createdProject`, client name, email, company, account age, project count (staff only), `leadManagerName`, `targetDate` | staff project URL by role | `Assign a project manager: new <type> project from <client>` (admin, new project, nobody leading) or `New <type> brief - <project>` |
| `briefReceivedEmail` | `project.brief_received` | `submit_project_brief` | `projectName`, `briefTitle`, `briefType`, `createdProject`, `fullName` | `{appUrl}/dashboard/projects/<id>` | `We have your <type> brief: <project>` |
| `clientOnboardedEmail` | `client.onboarded` | `onboard_client_company` | `contactName`, `companyName`, `clientEmail`, `phone`, `fullName` | `{appUrl}/admin/companies/<payload.company_id>` for admin recipients only | `New client: <contact> from <company>` |

Event types that are queued but have no email template: `project.note_posted` (from `post_project_note`, in-app only). The worker never reads `in_app` rows, so it never needs one.

- **Edge (N10):** three templates have no SQL producer. Trigger: none of the RPCs enqueues `project.approval_requested`, `project.task_created` or `project.task_updated`. Consequence: those templates can fire only through `enqueueNotification`, which no screen calls, so a client is never emailed that an approval is needed (P1).
- **Edge (S4, fixed in 0051 D1):** approval decisions on internal deliverables. Trigger: live `update_project_approval` (`0015`) uses the default shared visibility. Consequence: the client receives `projectApprovalUpdatedEmail` for an approval they cannot read, with the old requester note instead of the decision.
- **Edge (S5, fixed in 0051 D2):** recipient set. Trigger: live `project_notification_recipients` (`0046`) returns every assignment row whatever the user's current role. Consequence: a demoted user keeps receiving `projectMessageEmail` excerpts of internal messages.
- **Edge:** `projectDeliveredEmail` links to `{appUrl}/reviews`. Trigger: `appUrl` is the app origin (the production value). Consequence: `/reviews` is not a portal path, so the host layer 308s the client to the marketing site (section 2a row 3); the link works, with one extra hop.
- **Edge:** a recipient whose profile read failed is treated as a client. Trigger: that read errors in the worker. Consequence: a project manager's link goes to `/dashboard/projects/<id>`, which middleware sends to `/team`, so the project context is lost.
- **Edge:** the status email for a client moving `brief_submitted` to `planned` names the lead manager. Trigger: an assignment row exists. Consequence: the client sees the manager's profile name, which can differ from the name `project_manager_names` shows on the project page (P15).

## 6. Cross-cutting controls

### 6a. Rate-limit buckets (`lib/rateLimit.mjs`)

Upstash sliding window, one limiter per (name, limit, window), prefix `ratelimit:<name>`; the identifier is appended to that prefix, so the key holds the IP or the lowercased email in plaintext (S21). Auth buckets use `checkAuthRateLimit`, which checks two buckets in parallel and needs both to pass. The contact form uses `checkRateLimitStrict`.

| Bucket | Used by | Identifier | Limit | Policy | Source |
| --- | --- | --- | --- | --- | --- |
| `contact` | `route:POST /api/contact` | trusted client IP | 5 per 600 s | strict: fails closed in Vercel Production | `lib/rateLimit.mjs#checkRateLimitStrict` |
| `auth:signup:ip`, `auth:signup:email` | `signUp` | IP; trimmed lowercased email | 5 per 600 s each | fails open | `lib/rateLimit.mjs#checkAuthRateLimit` |
| `auth:resend:ip`, `auth:resend:email` | `resendConfirmationEmail` | IP; email | 5 per 600 s each | fails open; a block still returns `{ success: true }` | `lib/rateLimit.mjs#checkAuthRateLimit` |
| `auth:reset:ip`, `auth:reset:email` | `requestPasswordReset` | IP; email | 5 per 600 s each | fails open; a block still returns `{ success: true }` | `lib/rateLimit.mjs#checkAuthRateLimit` |

No other action or route is throttled. `signIn`, `updatePassword`, every `app/actions/*` function and the invite action have no app-level limit (S13).

What each helper does when it cannot decide:

| Condition | `checkAuthRateLimit` (auth buckets) | `checkRateLimitStrict` (contact) |
| --- | --- | --- |
| Upstash env missing | allowed; one warning per process in production (`lib/rateLimit.mjs#checkRateLimit`) | Vercel Production: `unavailable`, the route answers 503 with `Retry-After: 120`; elsewhere allowed |
| No client IP | the IP bucket is skipped, the email bucket still applies | Vercel Production: `unavailable`; elsewhere allowed |
| Redis error | allowed, logged | `unavailable` (503) |
| Over the limit | `false` | `limited` (429) |

Client IP (`lib/rateLimit.mjs#getClientIp`): on Vercel (`VERCEL=1`) only `x-real-ip`, then `x-vercel-forwarded-for`; a client-sent `x-forwarded-for` is ignored. Elsewhere `x-forwarded-for` is read only when `TRUSTED_PROXY_HOPS` is 1 to 5, taking the entry that many places from the right; otherwise null. "Production" means `VERCEL_ENV === 'production'` (`lib/rateLimit.mjs#isProductionDeployment`), not `NODE_ENV`.

- **Edge:** a Docker or self-hosted deployment. Trigger: `VERCEL_ENV` is unset. Consequence: the app is never "production" to the rate limiter or to hCaptcha, so a missing Upstash config, a missing client IP, or a missing captcha secret is allowed through and the contact form can run unthrottled and unverified.
- **Edge (S13):** Upstash outage. Trigger: Redis errors on an auth bucket. Consequence: sign-up, resend and reset run unlimited; the contact form returns 503 instead.
- **Edge (S21):** the keys are readable. Trigger: anyone with Upstash console access. Consequence: they can list visitor IPs and emails with their attempt times.

### 6b. hCaptcha (`lib/hcaptcha.mjs`)

Used only by the contact route. The widget key is public (`NEXT_PUBLIC_HCAPTCHA_SITE_KEY`, defaulting to the production key in the source); the secret is `HCAPTCHA_SECRET`. The token is trimmed and must be at most 4096 characters. Verification is a form-encoded POST to `https://api.hcaptcha.com/siteverify` with `secret`, `response`, `sitekey` and, when known, `remoteip`.

| Secret | Token | hCaptcha says | `status` | Route outcome | Source |
| --- | --- | --- | --- | --- | --- |
| unset, Production | any | not called | `unavailable` | 503 `Retry-After: 120`, nothing stored | `lib/hcaptcha.mjs#verifyHCaptchaToken` |
| unset, not Production | any | not called | `passed` (not enforced) | continues | same |
| set | missing, blank or too long | not called | `rejected` | 400 with `errors.hcaptcha` | same |
| set | present | HTTP error or network failure | `unavailable` | 503 | same |
| set | present | `success: true` | `passed` | continues | same |
| set | present | error codes `invalid-input-secret` or `missing-input-secret` | `unavailable` | 503; logs that the server secret is rejected | same |
| set | present | any other failure | `rejected` | 400 | same |

- **Edge:** the site key has a hard-coded default. Trigger: `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` is unset (previews, local). Consequence: the widget and the server verification both use the production key from the source (`lib/hcaptcha.mjs#HCAPTCHA_DEFAULT_SITE_KEY`), so previews verify against the production hCaptcha site.
- **Edge:** hCaptcha loads and receives data without consent and is not named in the banner (S20).

### 6c. Redirect sanitisers (`lib/auth/roles.mjs`)

Both parse the candidate against the dummy origin `https://crm.invalid`, require a leading `/`, and require the parsed origin to equal that dummy origin, so an absolute or protocol-relative value that resolves to another host fails. Normalisation happens first (`/dashboard/../admin` becomes `/admin`).

| Function | Used by | Accepts | Returns | Source |
| --- | --- | --- | --- | --- |
| `safeNextForPortal(portal, next)` | `app/auth/actions.js#signIn`; the login form in the browser (`components/auth/PortalLoginForm.jsx#PortalLoginForm`) | a path whose first segment belongs to the named portal: `/dashboard/**` for `client`, `/team/**` for `employee`, `/admin/**` for `admin` | path plus query plus hash, or null | `lib/auth/roles.mjs#safeNextForPortal` |
| `safeAuthNext(next)` | `route:GET /auth/callback`, `route:GET /auth/verify` | any `/dashboard/**`, `/team/**` or `/admin/**` path, or exactly `/auth/reset-password` or `/auth/confirm` | path plus query plus hash, or null (callers then use `/dashboard`) | `lib/auth/roles.mjs#safeAuthNext` |

Middleware does not sanitise the `next` it writes: it builds it from the request's own path and query (minus `_rsc`), and `signIn` re-checks it on the way back (`middleware.js#requestedPortalPath`).

- **Edge:** `safeAuthNext` accepts a path of any portal, not only the signed-in user's. Trigger: a link with `next=/admin/users` for a client. Consequence: the redirect happens, then middleware row 7 sends the client to `/dashboard`; the sanitiser is an open-redirect guard, not an authorisation check.
- **Edge:** a rejected `next` is dropped silently in both functions. Consequence: the user lands on a default page with no message.

### 6d. Auth error mapping (`lib/auth-errors.js#friendlyAuthError`)

Matches six lower-cased fragments in the GoTrue message; anything else is returned unchanged; an empty message becomes `Something went wrong. Please try again.`

| Fragment | Text shown |
| --- | --- |
| `invalid login credentials` | That email or password is incorrect. |
| `email not confirmed` | Please confirm your email before signing in — check your inbox for the confirmation link. |
| `email rate limit exceeded` | We've sent too many emails to that address recently. Please wait a few minutes and try again. |
| `user already registered`, `has already been registered` | An account with that email already exists. Try signing in instead. |
| `password should be at least` | Password must be at least 6 characters. |

Used by `signUp`, `signIn` and `updatePassword`. `inviteUser` returns the GoTrue message and the provider message raw, and the silent actions (`resendConfirmationEmail`, `requestPasswordReset`) never show an error.

- **Edge (S14):** the "already registered" copy. Trigger: `signUp` for an existing address. Consequence: the form reveals that the address has an account.
- **Edge (A8):** the password text says 6 characters. Trigger: the hosted Auth password rule differs from the local `minimum_password_length = 6`. Consequence: GoTrue's real message passes through for other failures (for example a complexity rule) and the form may state a rule that is not the real one.

### 6e. `lib/appUrl.mjs`: the origin every emailed link uses

`getAppUrl()` reads `NEXT_PUBLIC_APP_URL`, `VERCEL_ENV`, `VERCEL_URL` and `NODE_ENV` on each call (not at import, so `next build` cannot fail on it) and either returns an origin with no trailing slash or throws `AppUrlError`. The message names the setting and the problem but never echoes the value. Retired hosts: `crystalwebsolution.com` and `cdsportswearusa.com`, and any subdomain of either.

| `NEXT_PUBLIC_APP_URL` | Environment | Result | Source |
| --- | --- | --- | --- |
| a valid `https://` origin on an allowed host | any | returned as the origin | `lib/appUrl.mjs#assertSafeAppUrl` |
| a valid `http://` origin | Vercel Production | throws (`must be https:// in production`) | `lib/appUrl.mjs#getAppUrl` |
| a valid `http://` origin | anywhere else | returned | `lib/appUrl.mjs#assertSafeAppUrl` |
| not parseable as an absolute URL | any | throws | `lib/appUrl.mjs#assertSafeAppUrl` |
| scheme other than http or https | any | throws | `lib/appUrl.mjs#assertSafeAppUrl` |
| contains a username or password | any | throws | `lib/appUrl.mjs#assertSafeAppUrl` |
| has a path other than `/`, a query or a fragment | any | throws | `lib/appUrl.mjs#assertSafeAppUrl` |
| names a retired host | any | throws | `lib/appUrl.mjs#isRetiredHost` |
| unset | Vercel Production | throws | `lib/appUrl.mjs#getAppUrl` |
| unset | Vercel Preview with `VERCEL_URL` | `https://$VERCEL_URL`, validated | `lib/appUrl.mjs#getAppUrl` |
| unset | `NODE_ENV` is not `production` | `http://localhost:3000` | `lib/appUrl.mjs#LOCAL_APP_URL` |
| unset | anything else (for example a Docker production build) | throws | `lib/appUrl.mjs#getAppUrl` |

Call sites and what a throw does there:

| Call site | When resolved | On throw | Source |
| --- | --- | --- | --- |
| `signUp` | after the rate limit and the service-role check, before `generateLink` | `Signup is temporarily unavailable...`; no account, no link | `app/auth/actions.js#getAppUrl` |
| `resendConfirmationEmail` | same position | `{ success: true }`, no link | `app/auth/actions.js#getAppUrl` |
| `requestPasswordReset` | same position | `{ success: true }`, no link | `app/auth/actions.js#getAppUrl` |
| `inviteUser` | after the service-role check, before `generateLink` | `Invites are temporarily unavailable...`; no account | `app/admin/users/actions.js#getAppUrl` |
| `buildVerifyUrl` | default argument, used only if a caller does not pass `appUrl` | throws out of the caller | `lib/supabase/admin.js#buildVerifyUrl` |
| contact route | after the lead RPC, to build the optional CRM link | link dropped, email still sent | `app/api/contact/route.js#dealUrlFor` |
| cron worker | once per run, before the claim | 503 `Application URL is not configured.`; outbox untouched | `app/api/cron/crm-notifications/route.js#getAppUrl` |

- **Edge (S2):** Production `NEXT_PUBLIC_APP_URL` is wrong. Trigger: unset, `http://`, carrying a path, or on a retired host, after the owner merges this branch. Consequence: sign-up, resend and reset stop issuing links, invites stop, and the worker returns 503 every run, so queued notifications wait; `signUp` shows "temporarily unavailable". Owner checklist item 2 in `06-edge-cases.md`.
- **Edge:** `NEXT_PUBLIC_*` values are inlined at build time. Trigger: editing the variable in Vercel. Consequence: nothing changes until Production is rebuilt.
- **Edge:** the guard blocks two known-bad hosts, not every wrong host. Trigger: a typo such as `https://app.cdsportswearinc.co`. Consequence: it passes and tokens are mailed to that host.

### 6f. Fail-open and fail-closed summary

| Control | Policy | Effect of the failure | Source |
| --- | --- | --- | --- |
| Auth rate limits | open | no throttling | `lib/rateLimit.mjs#checkRateLimit` |
| Contact rate limit | closed in Production | 503, nothing stored | `lib/rateLimit.mjs#checkRateLimitStrict` |
| hCaptcha | closed in Production | 503, nothing stored | `lib/hcaptcha.mjs#verifyHCaptchaToken` |
| App URL | closed | action or run refuses; nothing written | `lib/appUrl.mjs#getAppUrl` |
| Cron authorisation | closed | 401 | `app/api/cron/crm-notifications/route.js#isAuthorised` |
| Must-set-password gate | open | portal usable without a password | `middleware.js#passwordCheckError` |
| Live-assignment check in the worker | open | a replaced manager may still get the email | `app/api/cron/crm-notifications/route.js#resolveLiveAssignments` |
| Role pre-check in actions | closed (an error means "not authorized") | action refuses | `app/actions/project-actions.js#authenticatedProfile` |
| CRM flag | open (anything but `false` leaves the CRM on) | portals stay reachable | `lib/crmFlag.js#CRM_ENABLED` |
| Supabase env missing in middleware | closed for portal paths (login with `?error=configuration`), open for the rest | portals unusable | `middleware.js#hasSupabaseBrowserConfig` |

## 7. Cookies and URL parameters that carry data

Only the two session cookies are written by this domain; the analytics cookies belong to `07-external-services.md`.

| Name | Written by | Read by | Content | Source |
| --- | --- | --- | --- | --- |
| cookie `sb-<ref>-auth-token` (`<ref>` = the Supabase project ref in `NEXT_PUBLIC_SUPABASE_URL`) | `signIn`; `/auth/verify`; `/auth/callback`; middleware on a token refresh | middleware; `lib/supabase/server.js#createClient`; the browser client | access and refresh token. Cleared by `signOut` and by `signIn` on a portal mismatch. Chunking and flags are library defaults (UNVERIFIED) | `middleware.js#setAll`, `lib/supabase/server.js#getAll` |
| cookie `sb-<ref>-auth-token-code-verifier` | nothing in this repo | `/auth/callback` through `exchangeCodeForSession` | PKCE verifier | `app/auth/callback/route.js#exchangeCodeForSession` |
| param `?error` | middleware (`configuration`); `requireRole` (`configuration`); `signIn` (`portal`); `/auth/callback` and `/auth/verify` (`auth-callback-failed`) | `components/auth/PortalLoginForm.jsx` (portal login pages) | a failure code. The `/login` chooser ignores it | `middleware.js#portalLoginResponse`, `lib/auth/require-role.js#loginWithConfigurationError` |
| param `?next` | middleware (the requested portal path and query minus `_rsc`); `buildVerifyUrl` (`/dashboard`, `/auth/reset-password`, `/auth/reset-password?reason=invite`) | `/auth/callback`, `/auth/verify` through `safeAuthNext`; the login form through `safeNextForPortal` | a same-origin path | `lib/auth/roles.mjs#safeAuthNext`, `lib/auth/roles.mjs#safeNextForPortal` |
| param `?email` | `signUp` (in its redirect) | `/auth/confirm` | the sign-up address, used as the resend target | `app/auth/actions.js#encodeURIComponent` |
| param `?reason` | middleware (`invite`); carried inside the invite `next` | `/auth/reset-password` | `invite` switches the page copy only; the action does not read it | `middleware.js#mustSetPassword` |
| param `?token_hash`, `?type` | `buildVerifyUrl` | `/auth/verify` | the GoTrue one-time hash and verification type | `lib/supabase/admin.js#buildVerifyUrl` |
| param `?code` | GoTrue or an OAuth provider | `/auth/callback` | authorisation code | `app/auth/callback/route.js#GET` |
| param `?trigger` | an operator | `/api/sentry-verification` | must equal `sentry-preview` | `app/api/sentry-verification/route.js#GET` |
| params `?pm`, `?brief`, `?tab` | pages and components | pages and components | UI state only; no server code reads or writes them (`03-screens.md`) | `app/admin/projects/page.jsx`, `components/crm/BriefWizard.jsx`, `components/crm/Tabs.jsx` |

## 8. Unused code, UNVERIFIED items and counts

Exports and branches with no caller or no way to run:

| Item | Why | Source |
| --- | --- | --- |
| `getUser`, `assignProject`, `updateProjectTask`, `createProjectApproval`, `enqueueNotification` | exported server actions that nothing imports | `app/auth/actions.js#getUser`, `app/actions/project-actions.js` |
| `emailChangeEmail` | no sender, no email-change flow | `lib/email/templates.js#emailChangeEmail` |
| `redirectHomeForRole` | exported, never called | `lib/auth/require-role.js#redirectHomeForRole` |
| `sendInviteEmail` | used only by `scripts/provision-crm-test-users.mjs` | `lib/email/resend.js#sendInviteEmail` |
| `BACKOFF_MINUTES[4]` (180 minutes) | the fifth claim is terminal, so the slot is never read | `app/api/cron/crm-notifications/route.js#BACKOFF_MINUTES` |
| email templates for `project.approval_requested`, `project.task_created`, `project.task_updated` | no SQL producer; reachable only through the unused `enqueueNotification` | `lib/email/templates.js#NOTIFICATION_TEMPLATES` |
| `GET /api/sentry-verification` | a manual preview tool; nothing calls it | `app/api/sentry-verification/route.js#GET` |

UNVERIFIED, in one place:

| # | Item | What would settle it |
| --- | --- | --- |
| 1 | Whether `generateLink({ type: 'signup' })` without a password works for an existing unconfirmed user (`resendConfirmationEmail`) | a live call, or the GoTrue source |
| 2 | Whether a repeat `signUp` for an unconfirmed address reissues a token, replaces the password, or errors | a live call |
| 3 | Whether Next.js 16 keeps unreferenced exported actions callable and dispatches action POSTs on paths the middleware does not match, so `NEXT_PUBLIC_CRM_ENABLED=false` may not disable `signUp` and the rest (S15) | a request to the built app with the flag off |
| 4 | Whether the invite page's early return on `NEXT_REDIRECT` still navigates | a browser run |
| 5 | Whether anything live still lands on `/auth/callback`, and what writes the PKCE verifier cookie | the Supabase project's email templates and Auth settings |
| 6 | Whether mail scanners consume `/auth/verify` links | observed failures on live links |
| 7 | Whether the 8 s `pg_net` timeout leaves the worker running to completion on Vercel, and what a 25-row run costs against the 300 s lease | Vercel function logs for a full batch |
| 8 | Whether `:path` in the app-to-site rule matches an empty path, so the app host with the CRM off serves or redirects `/` | a request to the app host with the flag off |
| 9 | Live values: `NEXT_PUBLIC_APP_URL`, `RESEND_FROM_EMAIL`, `CONTACT_NOTIFICATION_EMAIL`, `CONTACT_WEBHOOK_URL`, `UPSTASH_*`, `HCAPTCHA_SECRET`, `CRON_SECRET`, `CRM_CRON_SECRET` and the Vault `crm_cron_secret` (owner checklist, `06-edge-cases.md`) | the Vercel and Supabase dashboards |
| 10 | Which `auth.users` columns GoTrue writes on `verifyOtp` and `updateUser`; which sessions `auth.signOut()` ends; cookie chunking and flags | `@supabase/ssr` and GoTrue source |
| 11 | Whether the platform bounds the contact request body before `request.json()` | Vercel limits |
| 12 | The hosted Auth password rule and email-confirmation setting (A8) | the Supabase dashboard |

Counts for this chapter's manifest (`data/server.json`): 101 nodes (39 actions, 7 route handlers, 2 middleware, 21 libs, 19 email templates, 11 params, 2 cookies) and 315 edges. Service-role call sites that change state: 16 (4 `generateLink`, 2 `deleteUser`, 1 `create_lead_from_contact`, 7 cron RPCs, 2 Storage `remove`). Non-Supabase external call sites in app code: 16 (8 Resend sends, 1 hCaptcha, 1 contact webhook, 4 Upstash entry points, 2 Sentry captures).
