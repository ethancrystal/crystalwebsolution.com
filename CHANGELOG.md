# Changelog

Every production deploy of crystalwebsolution.com gets one entry here, newest
first. The version format and rules live in `VERSIONING.md`. The version in
the top entry of this file is always the version currently in production (or
about to be, if the PR hasn't merged yet).

## v1.31 — 2026-09-03

Docs-only: repairs the version ledger after PR #173 merged directly onto
`main` (commit `379c49c`, 2026-09-03T20:08Z) without a `VERSION`/
`CHANGELOG.md` entry. The branch was opened before `v1.25` was assigned to
the CRY-30 placeholder fix and was never rebased, so its own PR title still
read "v1.25" at merge time — five numbers behind by then (`v1.26`–`v1.30`
had since shipped) — and its diff never touched either file, so nothing
caught the collision. No runtime code changes; this only adds the missing
entry and advances `VERSION`.

Ships repository memory for the SEO programme (`docs/seo/`, owner's
decision 2026-09-02, replacing a Notion archive) and its blog-publish
pipeline:

- `docs/seo/OPERATIONS-MANUAL.md`, `KEYWORD-REGISTRY.md`, `README.md`,
  `backlinks/{prospects,pbn-watch}.md`, `runs/2026-09-0{1,2}.md` — strategy,
  the one-keyword-to-one-URL cannibalisation guard, outreach shortlist, PBN
  spam watch-list, and daily run logs.
- `docs/seo/drafts/blog/web-development-rfp-guide.md` (CRY-22) — an
  approved draft, front-matter matching `blog_posts`.
- `scripts/seo/publish-blog-drafts.mjs` — on merge, upserts every
  `approved: true` draft into `blog_posts` as `status: draft` (never
  `published`; that flip is a manual step in `/admin/blog`).
- `docs/seo/seo-publish-blog.yml.pending` — the GitHub Actions workflow
  that would call the script above is **not yet installed**
  (`.github/workflows/`); the PR's own commit message records that the
  push was refused for lacking the `workflow` OAuth scope. Until an
  operator adds it manually, merging an approved draft does nothing
  automatically — the script would need a manual run.

## v1.30 — 2026-09-03

hCaptcha on the public contact form (every `ContactForm` instance: homepage
Contact beat, `/contact`, `/about`, `/process`, and the eight
`/services/[slug]` pages). It sits alongside the existing honeypot and
Upstash rate limit; nothing about the fields, payload or success copy
changes.

- **Client** — `components/marketing/HCaptcha.jsx` injects `js.hcaptcha.com`
  once per page from the form's mount effect and renders the dark checkbox
  widget below the brief. The form refuses to submit without a token, sends it
  as `hcaptchaToken`, and resets the widget after every response (tokens are
  single-use). If the loader is blocked (ad blocker, proxy) or times out, the
  form says so and offers the direct email address instead of waiting forever.
- **Server** — `app/api/contact` verifies the token with hCaptcha's
  `siteverify` after field validation and before the webhook, CRM write and
  emails. Enforcement is on only when `HCAPTCHA_SECRET` is set (same
  fail-open-when-unconfigured contract as `lib/rateLimit.mjs`). An explicit
  rejection returns 400; a network/5xx failure reaching hCaptcha lets the
  brief through and logs, so a vendor outage does not drop leads.
- **Keys** — the site key is public and ships as the default in
  `lib/hcaptcha.mjs` (`NEXT_PUBLIC_HCAPTCHA_SITE_KEY` overrides it for
  previews). The secret is read only from `HCAPTCHA_SECRET` and is **not in
  the repo**: set it in Vercel → Project → Environment Variables (Production
  and Preview) and in `.env.local`, then redeploy. Until it is set the widget
  shows but the server does not verify.
- **CSP** — `script-src`, `style-src`, `frame-src` and `connect-src` gain
  `https://hcaptcha.com https://*.hcaptcha.com`; `tests/csp-policy.test.mjs`
  pins the new tokens.
- Tests: `tests/hcaptcha.test.mjs` (verification unit tests with a fake
  fetch, route/form source contracts, and a guard that no secret literal is
  committed).
- Not included: signup/login. Supabase Auth has native hCaptcha support
  (Dashboard → Auth → Bot and Abuse Protection) that only needs the same
  site key plus a `captchaToken` on `signUp()`; that is a follow-up once the
  dashboard side is enabled.

## v1.29 — 2026-09-03

Adds migration `0041_client_read_scope_hardening.sql` — **checked in, not
applied**. Production application is an owner-approved step per
`docs/CRM-OPERATIONS.md` §Migrations; until it runs, the three holes below
remain open in the live database. Plan:
`docs/plans/audit-followups-crm-hardening-3.md` Tasks 10–11.

- **`project_approvals` SELECT** now follows the deliverable: clients see
  project-level approvals (`deliverable_id is null`) and approvals on
  `shared` deliverables; approvals on `internal` deliverables — and their
  reviewer notes — become staff-only. Policy renamed to "Project
  participants can view visible approvals".
- **`notifications_outbox` SELECT** limited to the recipient's `in_app`
  rows, matching `mark_notifications_read()`. Users could previously read
  their own email-queue rows (message excerpts; lead PII for the admin), and
  the dashboard panel rendered every event twice. `NotificationsPanel`
  drops the channel label and the `channel === 'in_app'` guard.
- **`deals`**: drops the 0001 "Company members can view deals" and 0003
  "Company members can submit a project brief" policies. No page outside
  `/admin` reads or writes deals; `create_project()` and
  `can_access_deal()` are SECURITY DEFINER and unaffected.
- Two audit claims verified already-resolved and left alone:
  `private.shares_project_with` grant (0040) and RLS enable/force on every
  `project_*` table (0009/0010).
- Tests: `tests/crm/migration-0041-client-read-scope-hardening.test.mjs`
  (source contract) and `supabase/tests/0041_client_read_scope.test.sql`
  (pgTAP: client sees 2 of 3 approvals and cannot read the internal note,
  1 of 2 outbox rows, 0 deals and cannot insert one; PM sees all 3
  approvals; admin still reads deals). `pnpm test:db` was not runnable in
  this environment (no Docker / Supabase CLI) — run it, or apply on an
  isolated branch database, before production.

## v1.28 — 2026-09-03

Frontend follow-ups from `docs/plans/audit-followups-crm-hardening-3.md`
(Tasks 5–8). No homepage/WebGL scene logic touched; the only marketing-file
edits delete inert attributes.

- **Custom-cursor leftovers removed.** The dot+ring cursor shipped in the
  initial commit and was removed in PR #10 (2026-07-13) by design review;
  three later audits misread its remains as an unbuilt feature. Deleted the
  51 `data-cursor` and one `data-hover` attributes across 21 JSX files,
  the `.cursor-*` rules (`app/styles/cursor-loader.css` → `loader.css`),
  and the `html.has-cursor` rule in `reset.css`. Nothing read any of
  them. `tests/no-dead-cursor-markup.test.mjs` keeps them out; restoring
  the cursor is `git show 1a2807c^:components/Cursor.jsx`.
- **One admin form chrome.** `AdminFormShell` loses its `variant` prop:
  all eight `/admin/<entity>/{new,edit}` pages now share the 800px frame,
  0.9rem unweighted labels, `0.75rem 1rem` inputs, `#64c8ff` focus ring
  and a 1.5rem/2rem actions row. Companies/deals widen from 700px and lose
  the bold label; contacts/tasks gain the stronger focus colour. Page markup
  is unchanged apart from the frame class (contacts/tasks now render
  `.crm-form-card` like the others); both selector families and both cancel
  controls are kept, which the byte-identity test still proves against the
  frozen pre-Phase-3 fixtures.
- **Admin CRUD gaps closed** (recorded, not fixed, in v1.20): contacts and
  tasks edit pages now `.select()` the updated row and throw
  `Update failed - no rows changed (check permissions).` like companies and
  deals; `tasks/new` gets the same admin redirect + skeleton gate as the
  other three new pages (task INSERT is `is_admin()`, migration 0005).
  `tests/crm/admin-crud-guards.test.mjs` pins all eight pages symmetric.
- **CRM read-model waste.** `getProjectWorkspace` no longer fetches a
  50-message page nobody rendered (ProjectThread owns that read) and skips
  the `project_assignments` query for clients (RLS returns zero rows for
  them anyway); `listProjectsForViewer` skips the companies fetch for
  clients. The client project page renders `workspace.tasks/approvals/
  deliverables` instead of re-fetching them, cutting four `projects` and
  four `profiles` round trips per load to one each. Dead
  `getUserProfile` server action removed. Two source-contract tests
  updated in step.

Verification: `pnpm test` 474/474, `pnpm test:marketing` 35/35,
`pnpm build` 57/57 pages, First Load JS unchanged (`/` 378 kB, shared
228 kB).

## v1.27 — 2026-09-03

Docs only — no runtime code changes. Closes the refactor plan ledger and
records what the 2026-09-02 audits got wrong before anyone acts on them.

- **`docs/plans/README.md`** (new): status table for every plan file, the
  "where results live" order of authority (CHANGELOG → `docs/reports/` →
  `STATUS.md`), and an agent protocol requiring a real code review of each
  cited `file:line` before acting on any plan row.
- **`docs/plans/refactor-architecture-cleanup-2.md`** marked Complete;
  the 25 blank Phase 1–4 task rows back-filled from CHANGELOG v1.18–v1.23
  and the three phase reports. Plan v1 marked Complete (its Phases 4–5
  shipped through v2).
- **`docs/plans/audit-followups-crm-hardening-3.md`** (new): the plan for
  the ten open items, with a §0 table of audit claims re-verified against
  code and the live catalog. Five did not hold: `shares_project_with` was
  already re-granted by migration 0040; every `project_*` table already
  has enable+force RLS in 0009/0010; the blog-actions old-slug read and
  the NotesPanel read are both correct; and the custom cursor was never
  "unbuilt" — it shipped and was removed in PR #10 by design.
- **`docs/reports/lighthouse-baseline-2026-09-03.md`** (new): first
  Lighthouse run against production (`www.cdsportswearinc.com`). Homepage
  mobile perf 34 / LCP 13.5 s, script-bound (WebGL + GSAP boot under 4× CPU
  throttle); inner pages still load the Three.js chunk; Sentry envelopes
  are blocked by CSP `connect-src` in production.
- `docs/reports/phase-1-*.md` cursor section and `docs/CRM-OPERATIONS.md`
  migration head corrected.
- Housekeeping outside the PR: the five merged `refactor/phase-*` and
  `claude/app-refactoring-plan-*` remote branches were deleted 2026-09-03.

## v1.26 — 2026-09-03

Production moved to a new custom domain outside git, the same way
crystalwebsolution.com -> cdsportswearusa.com did (#164): someone changed
the Vercel project's attached domain to cdsportswearinc.com, and
cdsportswearusa.com — production since 2026-08-27 — was left unattached.
Every route on the old domain returned Vercel's `DEPLOYMENT_NOT_FOUND`
(DNS still resolves there; the domain just isn't on the project anymore).
Owner confirmed 2026-09-03 that cdsportswearinc.com is the intended domain.

- `lib/seo.mjs` — `SITE_ORIGIN` now `https://www.cdsportswearinc.com`
  (re-verified the apex->www 308 redirect on the new host). Every
  canonical, sitemap `<loc>`, JSON-LD `@id` and `og:url` is built from
  this one constant, so they all move with it. Adds `SITE_HOST` (bare
  domain, derived from `SITE_ORIGIN`) for prose contexts.
- `lib/email/templates.js` — the contact-form email footer note now
  reads `SITE_HOST` instead of a hardcoded domain string; its test in
  `tests/email.test.mjs` derives the same way, so it can't drift out of
  sync again (the same fix v1.17 already made once for the canonical-logo
  assertion).
- `CLAUDE.md` — documents the new domain, records both retired domains'
  actual state (crystalwebsolution.com: dead DNS, deliberate; the
  cdsportswearusa.com: DEPLOYMENT_NOT_FOUND, not yet 301'd — the same
  equity-decay risk called out for the previous domain), and lists what's
  still unverified: `NEXT_PUBLIC_APP_URL`, Supabase Auth's
  `SUPABASE_AUTH_SITE_URL` / redirect allow-list, and whether
  `sales@cdsportswearusa.com` (`lib/site.js`) and the Resend sender
  domain (`lib/email/resend.js`) move with the site.
- **Deliberately not changed:** `SITE.email` and the Resend `DEFAULT_FROM`
  sender still reference `cdsportswearusa.com`. Moving them requires a
  working mailbox and Resend domain verification on the new address,
  which only the owner can confirm — changing the displayed contact
  address without one would silently drop real inquiries.
- Re-attaching `cdsportswearusa.com` in Vercel as a redirect to preserve
  its ~1 week of accrued link equity is still an open owner action, not
  done here.

## v1.25 — 2026-09-02

Fixes the second batch of live editorial placeholders (CRY-30): 24
`[CONFIRM: …]` strings in `lib/servicePages.mjs` — three per service
across all eight `/services/[slug]` pages — visible to visitors in the
deliverables list and in two FAQ answers (and their `FaqSchema` JSON-LD).
Same approach as v1.21: honest interim copy, no invented figures.

- **deliverablesNote** — removed from all eight services rather than
  filled with made-up round counts or turnarounds; `ServicePage.jsx`
  already renders the note conditionally, so the list shows cleanly
  without it.
- **"What does this cost, and how long does it take?"** — now the same
  scope-dependent, quote-only answer v1.21 shipped on `/services`.
- **"What's not included?"** — now states that every engagement is
  scoped in a written proposal up front and mid-project requests are
  estimated separately with sign-off.
- Adds `tests/no-live-placeholders.test.mjs`, which fails `pnpm test`
  if `[CONFIRM` or `PLACEHOLDER` appears in `lib/servicePages.mjs` or
  any `app/**/page.jsx`, so a third batch can't reach production.

No homepage/WebGL scene files touched.

## v1.24 — 2026-09-02

Docs-only: repairs the version ledger after the six PRs below merged out
of order on 2026-09-02. Each merge resolved its `VERSION`/`CHANGELOG.md`
conflict by keeping `main`'s side, so four deploys went out without their
entry and `VERSION` stayed at `v1.19` while the deployed commit was titled
`v1.23`. No runtime code changes.

- Restores the `v1.20`, `v1.21`, `v1.22` and `v1.23` entries below, verbatim
  from their PRs, and sets `VERSION` to the next number.
- Every number `v1.18`–`v1.23` maps to exactly one deploy (commit titles in
  Vercel's deploy list); only the deploy order differs from the numeric
  order:

  | deploy order | version | commit | PR |
  | --- | --- | --- | --- |
  | 1 | v1.18 | `cd2fdd0` | #166 |
  | 2 | v1.21 | `0e0b9e0` | #162 |
  | 3 | v1.22 | `339f540` | #163 |
  | 4 | v1.19 | `e2f1ff2` | #167 |
  | 5 | v1.20 | `17427e2` | #168 |
  | 6 | v1.23 | `ceae722` | #169 |

## v1.23 — 2026-09-02

Phase 4 of `docs/plans/refactor-architecture-cleanup-2.md`: oversized-file
decomposition, the last phase of the plan. Report in
`docs/reports/phase-4-oversized-file-decomposition-2026-09-02.md`.

- **`components/crm/ProjectThread.jsx` split** into a data hook
  (`components/crm/useProjectThread.js`: state, read-model load, Realtime
  subscription, every mutation) and a presentation component that renders
  from it. A verbatim move: the hook body and the JSX/CSS are diffed
  identical to the original. No visual or behavioural change intended.
- **New behavioural test** `tests/crm/project-thread-behaviour.test.jsx`
  (11 tests) pins the Conversation panel's Realtime subscription
  lifecycle, project-switch guard, inline edit and send idempotency — the
  flows STATUS.md records as having regressed past every automated gate.
  Written and green before the split, green after.
- **`app/actions/project-actions.js` deliberately not split**: five CRM
  contract tests assert against this one file's source text (RPC
  allowlist, no direct table writes, result contract). That gate is worth
  more than the split; the report records what would unlock it.
- `lib/servicePages.mjs` and `components/ui/liquid-ether-background.jsx`
  triaged as large but cohesive; no split.

## v1.22 — 2026-09-02

Homepage copy pass across all nine scroll beats. (The canonical-domain fix
this PR originally carried landed separately as #164.)

- **Hero** — subhead tightened to end on the business outcome ("so the
  click turns into the client") instead of stopping at the aesthetic one.
- **About** — kicker sharpened; picks up the Hero's "scroll" language on
  purpose, paid off again at Mark and Contact.
- **Services** — adds a one-line bridge under the header ("Eight
  disciplines, one team...") between the About statement and the row list;
  the 8 row descriptions in `lib/services.mjs` are untouched.
- **Stories** — one-word tighten ("No" → "Zero invented case studies").
- **Mark** — sub tightened to tie "assembled on purpose" explicitly back to
  the actual process described in Approach.
- **Lab** — caption tightened; also fixes the decorative `aria-hidden`
  label reading "CDS" when `SITE.short` is `"CD"`.
- **Contact** — headline reworked from "Let's make something rare." (a
  vibes line with no concrete client benefit) to "Let's build something
  worth the scroll." — the closing beat of the "scroll" thread started in
  Hero. Sub tightened for rhythm, same commitments.
- Approach and Motion are unchanged — both were substantially rewritten in
  v1.16 and reviewed here, not touched again.

## v1.21 — 2026-09-02

Fixes literal `PLACEHOLDER — confirm …` strings that v1.15 shipped live to
production on `/about`, `/contact`, `/process`, `/services`, and `/reviews`
— visible to real visitors and inside each page's `FaqSchema` structured
data. v1.15 intentionally left these as explicit placeholders pending
founder input rather than inventing facts; this closes that gap with the
owner's actual answers where given, and honest, non-fabricated interim
copy where not:

- **Contact** — reply-time FAQ and hero lede now say "within 1 business
  day"; NDA FAQ says "yes, on request."
- **About** — team-size FAQ now describes a small, senior,
  cross-disciplinary team (design, engineering, motion/AI-automation)
  without an invented headcount.
- **Services** — pricing FAQ now states scope-dependent, quote-only
  pricing (matching the tone already shipped on the embroidery landing
  page's cost FAQ) instead of asking whether to disclose ranges.
- **Reviews** — "leave a review" FAQ now points to Contact/email instead
  of a placeholder platform link that doesn't exist yet.
- **Process** — the 6 steps' `duration`/`deliverable` fields are removed
  rather than filled with invented numbers; `ProcessStepsRail` already
  renders that meta row conditionally, so the steps show cleanly without
  it until real figures are confirmed.
- Removes a few stale `PLACEHOLDER`-referencing code comments left over
  from v1.15 (embroidery page, Process, Services, Contact, About) that no
  longer describe the code.

No homepage/WebGL scene files touched.

## v1.20 — 2026-09-02

Phase 3 of `docs/plans/refactor-architecture-cleanup-2.md`: admin CRUD
duplication audit and extraction. No visual or behavioural change intended;
report in `docs/reports/phase-3-admin-crud-duplication-audit-2026-09-02.md`.

- The eight `/admin/<entity>/{new,[id]/edit}` pages shared their page
  chrome and ~150 lines of inline styled-jsx each, not their form logic.
  New `components/crm/AdminFormShell.jsx` owns the wrapper, header, error
  banner, form card and field/button CSS; every entity's loaders, guards,
  cascades, payload coercion and submit flow are untouched. Pages: 3,322 →
  1,965 lines.
- The pages had drifted into two chrome styles (companies/deals 700px
  "card", contacts/tasks 800px "container"); the shell keeps both as an
  explicit `variant` so nothing changes on screen. Unifying them is listed
  as an owner decision.
- Characterization test `tests/crm/admin-form-shell.test.jsx` renders the
  frozen pre-refactor pages (`tests/crm/fixtures/admin-forms-pre-phase3/`)
  against the new ones and asserts byte-identical markup; the old CSS was
  diffed selector-by-selector against the shell.
- Two pre-existing gaps recorded, not fixed: contacts/tasks edit pages lack
  the "no rows changed" post-update check; `tasks/new` has no admin guard.

## v1.19 — 2026-09-02

Phase 2 of `docs/plans/refactor-architecture-cleanup-2.md`: testing and
documentation. No runtime code changes.

- New `tests/marketing/work-marquee.test.jsx` (9 tests: video-vs-image tile
  selection by extension, replacement-media cycling, eager/lazy loading, row
  offsetting) and `tests/marketing/motion.test.jsx` (4 tests: Motion wires
  `WorkMarquee` to `CLIENT_TILE_IMAGES`/`REPLACEMENT_IMAGES`, accessible
  project list independent of the decorative marquee).
- `README.md` gains "Component directory conventions" and "Styling"
  sections describing what actually shipped (28-file global `app/styles/`
  split with global class names on purpose; `ImageBlock.module.css` as the
  one CSS Modules exception).
- New `docs/ARCHITECTURE.md`: sections → components → lib dependency map,
  the per-frame singleton pattern, and the two CRM data-access shapes with
  which entities use which.

## v1.18 — 2026-09-02

Phase 1 of `docs/plans/refactor-architecture-cleanup-2.md`: dead-code and
performance audit. Findings and evidence in
`docs/reports/phase-1-dead-code-performance-audit-2026-09-01.md`.

- **Fix** — `pnpm livecheck` was broken outright: `scripts/livecheck.mjs`
  imported from `playwright`, which is not a direct dependency under pnpm's
  strict layout. Now imports `chromium` from the already-installed
  `@playwright/test`; verified clean across all nine marketing routes on a
  production build.
- Verified, no change needed: `dynamic(..., { ssr: false })` is used only on
  the three WebGL boundaries; Three.js/R3F stays out of the shared and CRM
  bundles (chunk-manifest comparison); `depcheck`'s `typescript` flag is a
  false positive (required by `tsconfig.json`'s `@/*` alias); CSP comment and
  `public/d/02-messenger.gif` size unchanged.
- Owner-decision item left open: 51 inert `data-cursor` attributes plus an
  unwired `.cursor-dot`/`.cursor-ring` block in `app/styles/cursor-loader.css`
  (an unfinished custom-cursor feature) — remove or finish, not decided here.

## v1.17 — 2026-09-01

Refactor plan Phase 0 (`docs/plans/refactor-architecture-cleanup-2.md`):
establishes a genuinely green baseline before the CRM/architecture refactor
begins.

- `tests/email.test.mjs` — the "canonical logo" assertion hardcoded the
  retired `www.crystalwebsolution.com` domain; `lib/email/templates.js`
  correctly renders the logo from `SITE_ORIGIN` (`lib/seo.mjs`), which was
  intentionally repointed to `cdsportswearusa.com` in v1.16's follow-up fix
  (#164). The test never caught up. Now derives its expectation from
  `SITE_ORIGIN` directly instead of a second hardcoded literal, so it can't
  drift out of sync with the source of truth again.
- No other code changed. `pnpm test` 452/452, `pnpm test:marketing` 22/22,
  `pnpm build` clean (57/57 routes) — recorded as the refactor's baseline.

## v1.16 — 2026-08-31

Updates the studio location shown site-wide (footer, contact links, contact
section, and About page) to a two-line "Location in X / Also Located in Y"
format, and confirms the enquiry email/phone already match the approved
contact details.

- `lib/site.js` — `SITE.city` is now the short primary location
  (`Manassas, VA`), with a new `SITE.citySecondary` (`Sharjah, DXB`) for the
  second studio; `SITE.cityCompact` combines both for single-line contexts
  (OG image).
- `MarketingFooter`, `ContactPulseLinks`, and the homepage `Contact` footer
  now render both locations as separate lines instead of one combined
  string; the About page's prose and FAQ answer read from the same fields.
- No change to `SITE.email` (`sales@cdsportswearusa.com`) or `SITE.phone` —
  already correct.
- **Footer logo** — the marketing footer showed only the plain-text brand
  name; it now renders the same `BrandLogo` image as the header, linked to
  home, sized by a new `.mkt-footer-logo` rule.
- **Homepage copy** — the Approach accordion read as four bare labels until a
  visitor clicked one. Each of the four steps now carries an always-visible
  summary line, a deeper description, and a "What you get" list; the section
  gains a lede explaining that every project runs the same four steps. The
  Motion beat's heading no longer near-duplicates Stories' "no invented case
  studies" line — it leads on what the work changed and adds a short intro.

## v1.15 — 2026-08-30

Deepens all six inner marketing pages (About, Services, Work, Contact,
Process, Reviews) plus the embroidery-screen-printing landing page, closing
the content-depth gap identified against the site's own deepest reference
pages (the `/services/[slug]` template and the embroidery long-form page).

- **About** — adds an FAQ + `FaqSchema`, a "who this is for" section,
  cross-links to `/work`/`/process`/`/reviews`, a live review-count/rating
  sentence sourced from `REVIEW_STATS`, and an embedded contact form
  replacing the previous bare "start a project" link.
- **Services** — extends each of the 8 `lib/servicePages.mjs` records with a
  concrete opening scenario, a counter-audience ("not for you if…")
  paragraph, one elaboration sentence per capability/process step (kept as
  parallel `*Details` arrays — `capabilities`/`process`/`deliverables` stay
  plain `string[]`, since the homepage's `Services.jsx` row chips read
  `capabilities` directly and key off the string value), and 3 new FAQ
  entries per service. Adds services-index body copy explaining why the
  eight offers run as one team.
- **Work** — adds an FAQ + `FaqSchema`, cross-links, and a closing CTA to
  the work index.
- **Contact** — adds an FAQ + `FaqSchema`, a "who this is for" section, and
  a "what happens after you submit" section, closing the page's near-total
  content gap.
- **Process** — adds `duration`/`deliverable` fields to each of the 6 steps,
  rendered as a meta row in `ProcessStepsRail.jsx`.
- **Embroidery landing page** — adds an FAQ + `FaqSchema` and cross-links to
  the Development service page and Contact.
- **Fixes a homepage bug** found while auditing the same content:
  `app/styles/refraction.css`'s `.service-row:not([data-active='true'])
  .service-desc` rule unconditionally clipped the first 7% of every
  description on load — matching every row before any row had gone active —
  cutting off the start of the "Development"/"Branding" text. Added a
  `:has()` guard so the clip only applies once a sibling row is actually
  active.
- Adds a visible link treatment (`color` + `underline`) for inline links in
  body copy (`.mkt-prose a`), which previously inherited the invisible
  global `a` reset.

Facts only the founder has — team headcount, response-time commitments,
per-service pricing/timelines, process durations, review sourcing — are left
as explicit `PLACEHOLDER`/`[CONFIRM: …]` strings rather than invented; none
of the eight `SERVICE_PAGES` copy uses the literal word "placeholder" so the
existing banned-copy test (`tests/marketing.test.mjs`) still passes. No
homepage/WebGL journey files touched beyond the one CSS bug fix above.

## v1.14 — 2026-08-29

Turns the CSP into an enforced invariant. Test-only — no runtime code changed,
so no shipping page behaves differently.

v1.13 removed `https://cdn.jsdelivr.net` from `script-src` and added a test
asserting it stays out. That guard turned out to be a denylist: it names one
origin, so it only catches the one regression it was written for. Measured
against v1.13's suite, both of these widenings left all 449 tests green:

- adding a *different* CDN (`https://cdn.unpkg.com`) to `script-src`
- collapsing `script-src` to a bare `https:`, which permits any https origin
  to execute script and leaves the directive doing nothing

- **`tests/csp-policy.test.mjs` added.** Pins the entire policy as an exact
  directive→token map, compared order-insensitively, so *any* change fails
  rather than only the ones someone thought to enumerate. The failure message
  says what the test is for: a CSP edit is a security-header review
  checkpoint, and landing one means deliberately updating the pinned table
  and justifying the new token in the PR.
- **Two companion assertions** for failure modes an exact match would report
  confusingly: a directive deleted from the array (silently inherits
  `default-src`) or present but empty (blocks the resource type outright),
  and a bare scheme or wildcard host in `script-src` — named separately
  because that one is the difference between a policy that constrains script
  execution and one that only looks like it does.
- **`img-src` left deliberately wide** (`https:`) and now documented as such
  in the pinned table. Images cannot execute; enumerating every host the
  marketing pages reference costs more than it buys.

The existing origin-presence assertions in `tests/analytics.test.mjs` stay —
the exact-match test subsumes them, but their per-origin failure messages
explain *why* GA breaks without each host, which a diff of the whole policy
would not.

## v1.13 — 2026-08-29

Repository leanness pass. No behaviour change to any shipping page — the only
runtime-visible edit is a Content-Security-Policy that stopped allowing a CDN
nothing loads from any more.

- **CSP tightened.** `script-src` no longer allows `https://cdn.jsdelivr.net`.
  That origin existed solely for the UnicornStudio auth background, which was
  replaced by the procedural `DarkPageBackground` canvases on 2026-08-25. The
  component stayed in the tree, so the allowlist entry did too.
  `tests/login-background.test.mjs` now asserts the origin stays out.
- **Dead components removed** (1,038 lines), each verified against history as
  orphaned by a later redesign rather than unfinished work:
  `components/ui/hero-carousel.jsx` and `components/ui/image-stream-hero.jsx`
  (unwired by the 2026-08-26 showcase redesign),
  `components/ui/unicorn-studio-background.jsx` and
  `components/auth/UnicornBackground.jsx` (replaced same-day by `ee7c264`),
  `components/crm/ProjectOperations.jsx` (never imported since it was added).
- **`tests/login-background.test.mjs` rewritten.** It was asserting against the
  replaced UnicornStudio component while the login page rendered
  `DarkPageBackground` — passing tests that guarded code nothing shipped. It
  now asserts the real prism background, its reduced-motion and ≤767px
  fallbacks, and that the auth backgrounds stay dependency-free.
- **`.gitattributes` added.** A Windows/OneDrive tool had rewritten the working
  tree to CRLF, which showed up as 109 modified files and 20,729 phantom
  insertions with zero real changes, and broke source-reading tests whose
  regexes assume `\n`. `* text=auto eol=lf` stops it recurring.
- **Planning docs consolidated.** `plan/`, `plans/` and
  `docs/superpowers/plans/` merged into `docs/plans/`; ADRs moved to
  `docs/adr/`; five purely-historical documents moved to `docs/archive/`.
  `plans/New Plan` — tracked, 21 KB, referenced by section number from
  `docs/HOMEPAGE-OVERHAUL-REUSE-INVENTORY.md` — is now
  `docs/plans/homepage-overhaul-spec.md`. All cross-references updated.
- **`docs/README.md` added.** Names `docs/CRM-MASTER-PLAN.md` as canonical and
  records what an audit of the five overlapping CRM plans found: a transplant
  backlog of content that exists in exactly one document, and three conflicts
  between documents (storage path format, whether a project manager may claim
  unassigned work, and the superseded `preview`-branch rule).
- **`output/` and `test-results/` untracked** and gitignored — generated scan
  artifacts that were committed by mistake. Windows/OneDrive droppings
  (`*:Zone.Identifier`, `desktop.ini`, `*.lnk`, `FireShot Capture*`) ignored.

## v1.12 — 2026-08-29

Re-does the still-needed part of PR #118 ("frontend finishing-touches pass")
fresh against current `main` — that branch was 35 commits stale (including
the `globals.css` → 27-file split) and unmergeable. Verified against current
`main` file-by-file before reapplying anything; PR #118 closed as superseded.

- Reviews page: review cards now get the same staggered `SectionReveal`
  entrance every sibling list page (blog, work) already has — previously
  only the archive heading was revealed, not the cards themselves.
- `ServiceEmblem.jsx` (SVG variant): default service glyphs now gate their
  SMIL `<animate>`/`<animateTransform>`/`<animateMotion>` elements on
  `prefers-reduced-motion`, matching the gating its 3D sibling already had —
  these run outside CSS, so the existing media query couldn't reach them.
  Added the matching test coverage.
- `/work/[slug]`: restores the shared `.mkt-inner` width class every sibling
  detail/index page uses.
- CRM loading states: most of this work (13 of 21 pages) had already landed
  on `main` independently, with a better implementation than PR #118's
  (real `Skeleton`/`LoadingState` variants, plus dead `.crm-loading` CSS
  removed) — verified page-by-page rather than assumed. Finished the
  remaining 7 gaps the same way: `admin/companies/new`,
  `admin/contacts/new`, `admin/deals/new`, `admin/page.jsx`,
  `admin/tasks/new`, `admin/users/invite`, and a second, previously-missed
  "Opening onboarding…" block in `app/dashboard/page.jsx`. Also wired
  `Spinner` into `EntityNotes.jsx`/`NotesPanel.jsx`'s inline "Loading
  notes…"/"Loading updates…" text, and removed the now-orphaned
  `.crm-loading` CSS block from each of the 7 page-level fixes.

No look, feel, or functional changes beyond the above; `pnpm build` clean,
`pnpm test` 449/449, `pnpm test:marketing` 22/22 (includes 2 new assertions
for the SVG reduced-motion fix), `tsc --noEmit` clean.

## v1.10 — 2026-08-29

- Fix two stale/miscalibrated claims in `CLAUDE.md` surfaced by an
  evidence-calibration review: the "CRM is launched" line now says when it
  was last directly HTTP-verified and prompts a re-check rather than
  reading as a permanently-settled fact, since several merges to `main`
  have deployed since that check ran. The migration-count line ("0001
  through 0035 as of 2026-08-20") was stale (real head is now `0038`) and
  is replaced with guidance to always check the directory instead of
  citing a number that goes stale within days during active periods.

## v1.11 — 2026-08-29

- Fix `updateProjectTask`'s revalidation bug: it passed the RPC-returned task
  id to `revalidateAllProjectPaths` instead of the project id, so a task
  update would never revalidate the right `/dashboard`, `/team`, or
  `/admin/projects` pages. No UI calls this server action yet, so this was a
  latent bug; fixed now, before any task-edit UI ships, matching every
  sibling action's established form-supplied-`projectId` pattern. Added a
  regression test.
- The vitest wiring fix originally paired with this bug fix (scoping
  `vitest.config.js`'s `include` glob off the `node:test`-based `.test.mjs`
  files) turned out to already be live on `main` via the separate
  `test:marketing` script, added independently while this branch was open —
  same fix, different script name. Dropped the redundant `test:unit` script
  this PR would have added and documented the existing `test:marketing`
  command in `AGENTS.md`/`CLAUDE.md` instead, rather than ship two
  differently-named commands that do the same thing.

## v1.09 — 2026-08-29

- Phase 3 of the architecture-cleanup refactor plan: JSDoc-based type safety,
  stacked on top of v1.08's component cleanup. No runtime TypeScript — this
  repo stays plain JSX + JS per its own convention; `tsconfig.json` exists
  purely to drive `tsc --noEmit` as a dev-time check.
- `jsconfig.json` → `tsconfig.json` (`allowJs`, `noEmit`, path alias
  preserved). `typescript`, `@types/react`, `@types/react-dom` added as
  devDependencies.
- Added `@typedef` blocks to `lib/projects.js`, `lib/services.mjs`,
  `lib/site.js`, `lib/reviews.js`, and `lib/crm/project-contract.mjs`
  (`ProjectCategoryValue`, `ProjectStatus`, `TaskStatus`, etc., plus
  `value is X` type-guard returns on the `is*` predicate functions).
- Added JSDoc `@param`/`@returns` to every exported component in
  `components/ui/*.jsx` (10 files).
- Added `types/index.d.ts` re-exporting the shapes above by reference
  (`import('../lib/projects.js').Project`, etc.) rather than duplicating
  them, so the type can't drift from the data it describes.
- **Deviated from the plan's literal `checkJs: true`**: global `checkJs`
  surfaced 277 pre-existing false-positive errors across untouched files (a
  known JSDoc-less-JSX prop-inference artifact, not real bugs — e.g. optional
  props with defaults getting inferred as required). Set `checkJs: false`
  project-wide and opted in per-file with `// @ts-check` on exactly the 15
  files this phase typed, which is the standard incremental-adoption pattern
  for JSDoc typing in an existing JS codebase. `tsc --noEmit` is clean.
- **Found and fixed a real build regression during this phase**:
  `typescript@7.0.2` (the brand-new native/Go-rewrite major version, pulled
  in by `pnpm add -D typescript` with no version pin) broke Next.js
  15.5.23's route-handler resolution — `app/api/contact/route.js` and
  `app/api/cron/crm-notifications/route.js` failed to resolve their `@/lib/*`
  imports (`Module not found`) specifically because a `tsconfig.json` was
  now present; every other `@/`-aliased import in the app (60+ call sites)
  kept resolving fine. Isolated by bisecting tsconfig options down to the
  bare minimum jsconfig-equivalent (still failed) and finally by testing the
  TypeScript version in isolation. Pinned `typescript` to `^5.9.3` — build,
  `tsc --noEmit`, `pnpm test` (448/448), and `pnpm test:marketing` (20/20)
  are all clean on that pin.

## v1.08 — 2026-08-28

- Phase 2 of the architecture-cleanup refactor plan: component-level
  de-duplication, stacked on top of v1.07's CSS split.
- Added `components/shared/SectionHeader.jsx` and used it in `Services.jsx`,
  `Approach.jsx`, and `Stories.jsx` — the three sections that shared
  byte-identical eyebrow + `<h2>` markup, only the copy differed. Verified
  against the built page's HTML that the rendered output (classes, reveal
  wrapper, inline styles) is unchanged. `Mark.jsx` (imperative split-line
  headline) and `Motion.jsx` (plain-text eyebrow, no heading) were left
  alone — genuinely different markup, not a duplicate to collapse.
- Added `lib/interactionGuards.mjs` (`skipsPointerAnimation()`) and used it
  in `Services.jsx` to replace two identical inline
  `matchMedia('(pointer: coarse)') || matchMedia('(prefers-reduced-motion:
  reduce)')` checks. Kept as a plain function, not a hook: both call sites
  check once at effect-mount time and don't need to react live to the query
  changing, so a hook would add reactivity that didn't exist before.
- Investigated and closed out the rest of the plan's Phase 2 list without
  code changes, because the premise didn't hold up:
  - `Contact.jsx` already delegates fully to `ContactForm`; nothing to do.
  - The "redundant" comment in `app/signup/page.jsx` is a deliberate
    visually-hidden-but-focusable radio pattern for keyboard/screen-reader
    navigation, not dead CSS.
  - No duplicated `ScrollTrigger` setup exists across `Mark.jsx`/`Hero.jsx`
    (one unique inline config each) and `Lab.jsx` doesn't use ScrollTrigger
    at all — nothing to extract into a shared hook.
  - `ProjectHandoffLink.jsx` is a single-purpose stripe-wipe transition, not
    a generic pattern — nothing to rename or extract.
  - `components/three/` has no duplicated geometry/material setup; every
    `new THREE.*Geometry`/`*Material` call is a distinct shape serving a
    distinct visual purpose.
  - `components/three/CanvasFeatureBoundary.jsx` already implements the
    error-boundary task, and with better scoping (per-feature, not
    whole-Canvas) than the plan proposed.
- Flagged, but did not act on: 31 `data-cursor="..."` attributes across the
  codebase have no reader anywhere (no JS, no CSS) — likely dead, possibly
  reserved for an unbuilt custom-cursor feature. Left alone pending
  confirmation, per this repo's "confirm before deleting" rule.

## v1.07 — 2026-08-28

- Split the 4,324-line `app/globals.css` into 27 ordered stylesheets under
  `app/styles/`, reducing `globals.css` to an import-only manifest. The
  imports are listed in the original source order, so the resolved stylesheet
  is **byte-identical** to the pre-split file (verified by checksum) — the
  cascade, every specificity tie, and therefore every pixel are unchanged.
- Kept the class names global rather than moving to CSS Modules: `Menu.jsx`,
  `Services.jsx` and `WorkLibrary.jsx` reach for `.menu-link`, `.menu-meta`,
  `.service-row` and `.work-row` through `querySelectorAll`, and GSAP animates
  those same names. Hashed module class names would have broken those
  animations silently, with no build error to catch it.

## v1.06 — 2026-08-27

- Set the canonical contact email to `sales@cdsportswearusa.com` and the
  transactional sender domain to `cdsportswearusa.com`, closing the gap left
  when the site rebranded to CD Sportswear USA but `lib/site.js` and
  `lib/email/resend.js` still pointed at `crystalwebsolution.com`.
- Fix `/login/client`, `/login/employee`, and `/login/admin`: the brand-mark
  `Link` and its child `img`, plus the footer text links, were unstyled
  because styled-jsx never scopes classes onto `next/link`'s rendered `<a>`
  — the logo rendered at its raw 2304px intrinsic width, blowing out the
  page at every viewport, not just mobile. Wrapped the affected selectors in
  `:global()`, matching the same fix already applied to `app/login/page.jsx`.
- Raise the dimmed sibling-row description opacity in the Services section
  from 0.6 to 0.82 — the lower value read as illegible "shadowed" text
  against the animated 3D backdrop.

## v1.05 — 2026-08-27

- Fix `useUserRole()` reading `user.app_metadata.role`, a claim this app
  never sets — `isAdmin`/`isPm` were always `false`, silently redirecting
  real admins off `/admin/users` and hiding admin-only controls on the
  companies/contacts/deals pages. It now reads `role` from the `profiles`
  table, matching `middleware.js`.
- Add a `requireRole()` backstop to the three portal layouts
  (`app/admin`, `app/dashboard`, `app/team`), which were bare
  pass-throughs relying entirely on middleware. Allowed roles mirror
  `lib/auth/roles.mjs`'s existing portal mapping exactly.
- Wire the 8 existing `tests/marketing/*.test.jsx` vitest tests into a
  new `pnpm test:marketing` script and the `docker-ci.yml` test job —
  they had a working `vitest.config.js` but nothing ever ran them.
- Fix `docker-ci.yml`'s CI test gate itself: it pinned Node 20, but
  `pnpm@11.21.0` (this repo's pinned package manager) requires Node
  >=22.13 and crashes immediately on Node 20 with
  `ERR_UNKNOWN_BUILTIN_MODULE: node:sqlite` — the gate v1.04 just added
  has been failing on every PR since it merged, for this reason alone,
  regardless of the PR's actual content. Bumped to Node 24, matching
  local dev.

## v1.04 — 2026-08-27

- Add a CI test gate: `docker-ci.yml` now runs `pnpm test` and `pnpm build`
  before the Docker image build, and the image build depends on that job
  succeeding — previously nothing blocked a failing test suite from merging
  to `main`.
- Consolidate `docker-ci.yml` and `docker-publish.yml` into one workflow
  (kept cosign image signing) and fix the missing `NEXT_PUBLIC_*` build args
  on the published `ghcr.io` image, so `docker run` per `README.md` produces
  a working image once the corresponding repo Variables are set.
- Add Upstash Redis-backed rate limiting (`lib/rateLimit.mjs`) to
  `POST /api/contact` and the `signUp`/`resendConfirmationEmail`/
  `requestPasswordReset` auth actions, implementing ADR-002 as Option C.
  Fails open until `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` are
  configured.
- Reconcile the migration ledger against the live database read-only via the
  Supabase MCP connection: of the previously-undifferentiated `0025`-`0034`
  range, only `0031` and `0032` are genuinely unapplied (see
  `docs/reports/migration-ledger-reconciliation-2026-08-27.md`); no `db push`
  was run.

## v1.03 — 2026-08-27

- Remove `flake.nix`, `shell.nix`, and `.envrc` — the Nix dev-environment
  shims were unreferenced by docs, CI, or tooling and added no value over
  the existing pnpm/Node workflow.

## v1.02 — 2026-08-26

- Add `council.yaml` and `council/prompts/` — configures the Agent Council
  (5-deliberator quality gate) for this repo's prose docs (`docs/`,
  `README.md`, `CLAUDE.md`, `AGENTS.md`, `CHANGELOG.md`, `VERSIONING.md`).
  Scoped to docs, not source code — the council reviews text artifacts, not
  application code. `runtime.type: claude_cli` shells out to a separate,
  metered `claude` CLI process; `validate-config`/`health` are free,
  `review`/`sweep` are not.

## v1.01 — 2026-08-20

- Adopt the release versioning convention: `VERSION` file, this changelog,
  `VERSIONING.md`, and mandatory rules for all agents in `CLAUDE.md` /
  `AGENTS.md`. First named production deploy.
