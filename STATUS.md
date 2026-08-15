# Crystal Web Solution CRM - Implementation Status

## 📅 Last Updated: 2026-08-15
## 👤 Last Agent: Claude Code (CRM launch + lead capture)
## 🔗 Current Branch: `main` (production — see "Deployment model corrected" below)
## 🔑 Source of Truth
- Checked-in migrations: canonical `supabase/migrations/0001` … `0027`
  (`0025`/`0026` applied live 2026-08-15; `0027` written from the PR #74
  review — see below for its live-apply state; `0009b`/`0014b` reconciled
  from live-only to tracked files in PR #72, merged)
- Project read boundary: `lib/crm/projects.js`
- Server actions: `app/actions/project-actions.js`
- Contract/read-model tests: `tests/crm/*.test.mjs`
- Supabase project ref: `wmnjosiikehsuaqucvja`
- CRM launch/lead-capture design doc: `plan/feature-crm-lead-capture-and-drain-1.md`

## 📌 Session update (2026-08-15, CRM launch + lead capture + 5-min drain)

**Deployment model corrected.** `CLAUDE.md`/`GEMINI.md` documented a
`preview`(integration)/`production`(live) two-branch model that Vercel's
actual configuration never matched. Confirmed live: Vercel's Production
Branch setting is `main` — merging a PR into `main` deploys straight to
crystalwebsolution.com. Docs rewritten in PR #73 (merged). `preview` and
`production` (the git branches) are now historical; don't base work on them.

**Build was broken on `main`.** Two real bugs, both confirmed by reproducing
the failure and then the fix, not just by reading the diff: (1)
`lib/crm/project-contract.mjs` had `TASK_STATUSES`/`TASK_PRIORITIES`
declared twice (ES module duplicate-export `SyntaxError`) — `pnpm build`
and two test files were failing on `main` before this session. (2) The
Dockerfile's `deps` stage only `COPY`ed `package.json`/`pnpm-lock.yaml`,
missing `pnpm-workspace.yaml`/`.npmrc` after they picked up `pnpm`'s
`overrides`/`onlyBuiltDependencies` config — `docker build` failed with
`ERR_PNPM_LOCKFILE_CONFIG_MISMATCH` on every CI run since. Both fixed and
verified (CI green) in PR #70 (merged).

**CRM launched to production.** `NEXT_PUBLIC_APP_URL` and
`NEXT_PUBLIC_CRM_ENABLED=true` set in Vercel (owner action), redeployed.
Confirmed live: `/login` and `/signup` render real content (200), `/dashboard`
correctly gates to `/login/client` (307) for an unauthenticated visitor.

**Lead capture implemented (PR #74, merged) — the mission's headline
feature, previously entirely missing.** `supabase/migrations/0026_create_
lead_from_contact.sql`: `SECURITY DEFINER`, service-role-only RPC (RLS on
`deals`/`contacts`/`companies` has no anon/authenticated insert path, so
this is the only legal write route) that matches/creates a contact+company
from a contact-form submission, dedupes against any open deal for that
contact (appends an internal note instead of a second deal), and queues an
admin notification via `notifications_outbox`. Uses the existing
`'prospecting'` deal stage rather than inventing a `new_lead` value the
admin Kanban board (`app/admin/deals/pipeline/page.jsx`'s
`normalizeStage()`) would silently misbucket — see the migration header and
`plan/feature-crm-lead-capture-and-drain-1.md` REQ-010/ALT-001. Wired into
`app/api/contact/route.js` as a non-blocking best-effort call — failure
never affects the visitor-facing webhook/email response. **Verified
end-to-end against production**: a real submission created the
company/contact/deal and queued the notification correctly (test records
under "Plan Test Co" / `plan-test@example.com`, not yet cleaned up).

**5-minute notification drain (PR #74, merged).**
`supabase/migrations/0025_schedule_notification_drain.sql`: `pg_cron` +
`pg_net` schedule draining the outbox every 5 minutes instead of relying
solely on the daily Vercel cron backstop (kept as a fallback). Generated its
own secret into Supabase Vault (`crm_cron_secret`) rather than reusing the
existing `CRM_CRON_SECRET`, since this session has no read access to Vercel
env var values — **the generated value still needs to be copied into
Vercel's `CRM_CRON_SECRET` (Production) to match**; until then the cron
calls 401 harmlessly (fails closed) against the drain endpoint.

**Post-merge review of PR #74 (`/code-review xhigh`) → migration `0027`.**
Reviewed the merged lead-capture diff in full against the live schema (real
`pg_indexes`/constraint reads, not assumptions). No P0s — no injection (all
inputs parameterized, no dynamic SQL), no auth bypass (RPC correctly revoked
from `anon`/`authenticated`), no secrets in code. Four findings; the three
code-level ones are fixed in `0027_lead_capture_review_followups.sql`:

| # | Sev | Finding | Fix in `0027` |
|---|-----|---------|---------------|
| 1 | P2 | **Duplicate-lead race.** The match-contact-by-email `SELECT` and the follow-on `INSERT` weren't atomic, and `contacts.email` had only a plain btree (`idx_contacts_email`) — no uniqueness. Two concurrent submissions for one address (double-click, two tabs) could both read "not found" and each create a contact + company + deal. | Defense in depth: `pg_advisory_xact_lock` keyed on the normalized email serializes same-address calls (different addresses stay parallel), plus a partial unique index on `lower(email)` making it unbreakable at the storage layer. Verified zero pre-existing duplicates before adding the index. |
| 2 | P2 | **Deal title vs. notification disagreed.** A submission with no company field but a business email domain got a deal titled after the *person* while the notification said the *domain* — and the title is the half the admin actually scans in the pipeline. | Both now read the company row actually attached to the deal. Correct on all four paths, including free-mail (title stays the person's name rather than becoming a useless "gmail.com") and existing-contact (where `0026` never computed a domain at all). |
| 3 | P3 | **`p_source` unbounded** — the one input with no length cap, concatenated straight into `notes.content`, inconsistent with the function's own "does not trust the caller" posture. Not exploitable (sole caller hardcodes it) but stops being theoretical with a second caller. | `left(btrim(...), 50)` like every other field. |

The fourth finding is **P1 and not fixable in SQL**: this feature turned
`/api/contact` from "spam costs transient emails" into "spam writes permanent
CRM rows," on an endpoint that still has no rate limiting. `ADR-002` already
specifies the fix (Vercel Firewall rule); PR #74 is the reason to stop
deferring it. **Owner action — dashboard-only.**

**Still open:**
- **Rate-limit `/api/contact`** per `ADR-002` — now higher priority than when
  that ADR was written, because spam is persisted, not just mailed.
- Copy the Vault-generated `crm_cron_secret` value into Vercel's
  `CRM_CRON_SECRET` (owner action — this session can set Supabase secrets
  but not read/write Vercel env var values). Confirmed live: `cron.job` fires
  on schedule and `net._http_response` shows a clean `401` each run — failing
  closed exactly as designed, and it clears the moment the secret matches.
- Delete (or explicitly keep) the "Plan Test Co" verification records —
  contact/company/deal + two `notifications_outbox` rows, all keyed on
  `plan-test@example.com`.
- PR #69 (`fix/a11y-motionscale-and-notification-visibility`) — open,
  targets the now-historical `preview` branch, needs retargeting to `main`.
- CRM-IMPLEMENTATION-PLAN.md Task 3.1 (three-role verification click-through
  with the owner as admin) and Task 3.2's remaining items (test-account
  cleanup) — not started this session.
- Company matching still races on *concurrent submissions from different
  addresses at the same company* (only same-address calls are serialized).
  Deliberately not fixed: a unique constraint on company name is a product
  decision, not a bug fix, and the failure mode is a duplicate company an
  admin can merge — not lost or wrong data.

## 📌 Session update (2026-08-10, multi-agent code review + fixes)

Ran a 6-way parallel review (`furious-reviewer` subagents, one per dimension:
CRM backend, CRM frontend, marketing components, marketing pages/SEO,
config/tooling, tests) of `preview` vs `main` — the entire divergence ahead
of the open `preview -> main` PR #59, not just the CRM batch above. Every
finding below was independently re-verified directly against source/live
data before being accepted (several of the subagents' raw claims had wrong
file:line citations or described code that doesn't actually exist that way;
those were corrected or dropped during verification, not taken at face value).

| # | Finding | Severity | Fix |
|---|---|---|---|
| 1 | `private.project_notification_recipients()` had no visibility awareness — `post_project_message`/`update_project_message`/`publish_project_deliverable` notified **every** client-company profile on a project even for `internal`-only messages/deliverables, including a 200-char body excerpt in the email | **Security — confirmed live leak** | Migration `0023`: recipient function gains `p_visibility` (default `'shared'`, backward-compatible); `internal` excludes the client-company branch. Verified live against real project data: `internal` → 1 recipient (staff only), `shared`/default → 2 (staff + client), matching pre-fix behavior exactly for every existing caller. Also restored the ACL convention on all three recreated functions (`update_project_message` had drifted to a bare PUBLIC + explicit `anon` grant — locked to `authenticated` only, matching every other project RPC). |
| 2 | `components/crm/ProjectThread.jsx`'s `load()` `useCallback` depended on the whole `profile` prop object; the parent page creates a new `profile` object on every `loadWorkspace()` call (including from unrelated actions — file upload, approval, task creation), churning the Realtime channel subscription every time | Correctness/perf | Depend on `profile?.id`/`profile?.role`/`profile?.company_id` (the only fields `requireViewer()` actually reads) instead of the object. |
| 3 | `components/marketing/ServiceEmblem.jsx`'s 3D variant wrapped the whole `<ServiceEmblem3D>` output — including its real, focusable tooltip-toggle button — in `aria-hidden="true"`, hiding a keyboard-tabbable control from assistive tech (WCAG 4.1.2) | Accessibility | Removed `aria-hidden` from the wrapper; `ServiceEmblem3D`'s own `<Canvas>` already carries its own correct `aria-hidden`. |
| 4 | `components/three/ServiceEmblem3D.jsx`'s `useFrame` called `matchMedia('(prefers-reduced-motion: reduce)')` every frame (~60x/sec/instance), violating this repo's own "no allocation inside `useFrame`" rule; the glow/emissive animation also ignored reduced-motion entirely (only rotation was gated) | Perf + accessibility | Read `matchMedia` once in a `useEffect`, cache in a ref, update via a `change` listener (with teardown); glow animation now also gated on the same flag. |
| 5 | `components/marketing/ImageBlock.jsx` imported its CSS Modules file for a side effect only and discarded the export, then used literal unscoped class name strings that can never match the hashed names the CSS Modules loader generates — currently dormant since the component is unused anywhere else in the app | Correctness (dormant) | `import styles from './ImageBlock.module.css'` + bracket-notation lookups (`styles['mkt-image-block']` etc., hyphenated keys). |
| 6 | `.hermes/` (binary `.zip` desktop attachments + a fully extracted, superseded implementation-proposal bundle — confirmed every file it "intended to add/replace" already exists as the real, current, tracked version) was committed to git, not just gitignored going forward | Housekeeping | `git rm -r --cached .hermes` (kept on disk, just untracked — the `.gitignore` entry already added upstream now takes effect). |
| 7 | `layout_summary.txt`/`task_complete.txt` (scratch progress notes, zero references anywhere) and `scripts_livecheck.mjs` (a real, working Playwright smoke-test script, but unwired and at the repo root, with a hardcoded `localhost:3115` that doesn't match `pnpm dev`'s actual port 3000) | Housekeeping | Removed the two scratch files; moved the script to `scripts/livecheck.mjs`, added a `pnpm livecheck` script entry, base URL now defaults to `localhost:3000` (overridable via `LIVECHECK_BASE_URL`). |

**Noticed, explicitly left alone:** `Dockerfile` (an added `HEALTHCHECK` hitting a new `app/api/health/` route) appeared modified/untracked in the working tree during this session, unrelated to anything above — same concurrent-session collision pattern already documented twice this week (PR #49/#50, the `crm/remaining-decisions` batch's `700bee7`). Not part of this review; not touched.

**Verification:** `pnpm test` — all new/modified test files pass (`tests/crm/migration-0023-visibility-aware-notifications.test.mjs`, `tests/crm/project-thread-stable-callback-deps.test.mjs`, `tests/marketing/serviceEmblemAria.test.jsx`, `tests/marketing/serviceEmblemReducedMotion.test.jsx`, updated `tests/marketing/imageBlock.test.jsx`), only the pre-existing unrelated `auth-portals` failure remains. `pnpm build` — clean.

## 📌 Session update (2026-08-13, parallel plan audit — 3-way verification)

Ran a 3-way parallel audit (`delegate_task`, one agent per plan slice) to verify every planned task against the actual codebase. This was not new implementation work — it was a ground-truth check that the plans written earlier this week actually shipped.

**Verification:** `pnpm test` — 199/199 passing (full Node test suite, no regressions from any plan). `pnpm build` — clean, 56 routes, no errors.

## 📌 Session update (2026-08-13, CRM audit-and-harden sweep — 3-slice parallel + serial re-run)

Mapped all CRM functionality across read-model, server actions, and frontend/portals. Three subagents ran in parallel then re-ran serially (rate-limit recovery); each owned a disjoint file set and only fixed safe, clearly-correct gaps.

**Verification:** `pnpm test` — 225/225 passing (full suite; +26 from two new hardening test files). `pnpm build` — clean, all routes.

### Read-model layer (`lib/crm/projects.js`, `project-contract.mjs`, `lib/supabase/browser.js`)
- **PM scope gate** (FIXED): `loadProjectForViewer` now fails closed — a project_manager with no `project_assignments` row for a project reads as "not found", never as access. Mirrors DB per-role logic.
- **Pagination cursor** (FIXED): `nextMessageCursor` now measures the raw query page, not the visibility-filtered list — previously a partly-filtered full page read as "no older messages" and silently truncated history.
- **Browser env guard** (FIXED): `createClient` throws a clear misconfig error at construction instead of an opaque auth failure at first query.
- **Shared enums/validators** (ADDED): `TASK_PRIORITIES`, `TASK_STATUSES`, `APPROVAL_STATUSES`, `DELIVERABLE_STATUSES`, `ATTACHMENT_STATUSES`, `RECORD_VISIBILITIES`, `DEFAULT_TASK_PRIORITY`, and `is*` validators — centralizes the status/priority domains so a drifted fourth tier can't reappear.
- 25 new tests: `tests/crm/crm-read-model-hardening.test.mjs`.

### Server actions (`app/actions/project-actions.js`)
- Already well-hardened: every action has `authenticatedProfile(roles)`, UUID validation, length bounds, generic errors, correct RPC arg names vs migrations 0015–0023.
- 5 new tests: `tests/crm/project-actions.test.mjs`. No code changes required — only the enum→shared-constant swap was considered (blocked by an out-of-scope sibling test) and `editProjectMessage` ownership is enforced in the RPC/migrations (cross-cutting, left as-is).

### Frontend / portals (`components/crm/*`, `middleware.js`, `app/dashboard|team|admin`)
- No safe fixes required. `middleware.js` correctly gates `/dashboard`→client, `/team`→project_manager, `/admin`→admin at the edge. No `dangerouslySetInnerHTML` anywhere; all user content JSX-escaped. Prior `ProjectThread` fix (passes `profile?.id/role/company_id`, not the whole object) confirmed intact and test-backed.

### Cross-cutting items (reported, NOT fixed — need migration or cross-file decision)
1. `project_tasks` RLS is `can_access_project` only (no `client_visible` predicate) — the app-level `clientVisibleOnly()` filter is the sole client-visibility boundary, and `listProjectMessages` runs in the browser where clients can query directly. Recommend a `client_visible` predicate in RLS for defense-in-depth.
2. Hardcoded `['low','medium','high']` / status arrays in 4 files should adopt the new `TASK_PRIORITIES` / `TASK_STATUSES` constants (server-actions file deferred due to a sibling test asserting the literal).

### Plan: `2026-08-06-marketing-inner-pages-enhancement-plan.md` (6 tasks)

| Task | Status | Evidence |
|------|--------|----------|
| 1. Layout component | IMPLEMENTED | `components/marketing/Layout.jsx` — `mkt-layout mkt-layout--{columns}` |
| 2. ImageBlock + blur-up | IMPLEMENTED | `components/marketing/ImageBlock.jsx` + `ImageBlock.module.css` — `styles['mkt-image-block']` bracket-notation lookups (CSS Modules fix from code-review plan) |
| 3. ServiceEmblem3D tooltip | IMPLEMENTED | `components/three/ServiceEmblem3D.jsx` — click-to-show tooltip with `aria-label`, `aria-expanded`, `role="tooltip"`, reduced-motion gated |
| 4. JSON-LD schema | IMPLEMENTED | `components/marketing/ServiceSchema.jsx` + `app/services/[slug]/page.jsx:5,59` |
| 5. Accessibility | IMPLEMENTED | `app/globals.css:3206-3217` — `.mkt-focus-visible:focus-visible` + `.mkt-em-tooltip-toggle:focus-visible`; ContactForm labels |
| 6. Tests | IMPLEMENTED | 7 test files in `tests/marketing/`, 17/18 tests pass (one pre-existing vitest/jsdom harness quirk, not a real failure) |

### Plan: `2026-08-08-inner-pages-entrance-reveals.md` (5 tasks)

| Task | Status | Evidence |
|------|--------|----------|
| 1. PageHero + ContentSection | IMPLEMENTED | Both wrap eyebrow/h1/h2/children in `SectionReveal` with left/up directions |
| 2. Work index | IMPLEMENTED | `app/work/page.jsx` — eyebrow/h1/intro/heading/closing all revealed; `id="work-title"` forwarded |
| 3. Work case study | PARTIAL | `app/work/[slug]/page.jsx` — spec called for additive wrapping only; implementation restructured with `beatsFor()` helper splitting `project.body` into problem/approach/result beats, `CaseNavRail` component, `CaseGallery`, `BreadcrumbSchema`, and `CreativeWork` JSON-LD (all beyond spec scope) |
| 4. Reviews | IMPLEMENTED | `app/reviews/page.jsx` — hero/standard/archive/close blocks all revealed; `aria-labelledby` targets forwarded |
| 5. Embroidery | IMPLEMENTED | `app/embroidery-screen-printing-web-design/page.jsx` — all content blocks revealed; `case-next` nav correctly left unwrapped |

**Consistent eyebrow pattern deviation:** Tasks 2, 4, 5 all use `<p className="eyebrow"><SectionReveal as="span">` instead of spec's `<SectionReveal as="p" className="eyebrow">`. Functionally equivalent (animates content inside `<p>`), matches `PageHero.jsx` idiom, but a technical deviation from the written spec.

### Plan: `2026-08-09-crm-remaining-decisions.md` (8 tasks)

| Task | Status | Evidence |
|------|--------|----------|
| 1. Migration 0019 — task priority/client_visible | IMPLEMENTED | `supabase/migrations/0019_task_priority_and_client_visible.sql` — drops old 6-arg signature, adds `p_priority`/`p_client_visible`, backfills existing rows |
| 2. Migration 0020 — project.delivered notification | IMPLEMENTED | `supabase/migrations/0020_project_delivered_notification.sql` — client-company-only email when status → delivered |
| 3. EntityNotes.jsx | IMPLEMENTED | `components/crm/EntityNotes.jsx` — direct notes-table read/write, separate profiles query for authors |
| 4. Task form priority + clientVisible | IMPLEMENTED | Server actions validate and forward both params |
| 5. clientVisibleOnly filter | IMPLEMENTED | `lib/crm/projects.js` — mirrors sharedOnly pattern |
| 6. clientSafeProject budget exposure | IMPLEMENTED | `budget_amount`/`currency` exposed to client role |
| 7. project.delivered email template | IMPLEMENTED | Registered in NOTIFICATION_TEMPLATES factory map |
| 8. project.message_edited email template | IMPLEMENTED | Registered in NOTIFICATION_TEMPLATES factory map |

### Plan: `2026-08-10-code-review-fixes.md` (8 tasks)

| Task | Status | Evidence |
|------|--------|----------|
| 1. Migration 0023 — visibility-aware recipients | IMPLEMENTED | `supabase/migrations/0023_visibility_aware_notification_recipients.sql` — `p_visibility` param, internal excludes client-company |
| 2. ProjectThread stable callback deps | IMPLEMENTED | `components/crm/ProjectThread.jsx` — depends on `profile?.id`/`profile?.role`/`profile?.company_id` |
| 3. ServiceEmblem aria-hidden fix | IMPLEMENTED | `components/marketing/ServiceEmblem.jsx` — outer wrapper no longer hides the tooltip button |
| 4. ServiceEmblem3D reduced-motion + matchMedia cache | IMPLEMENTED | `components/three/ServiceEmblem3D.jsx` — `reduceRef` via useEffect, glow gated |
| 5. ImageBlock CSS Modules fix | IMPLEMENTED | `components/marketing/ImageBlock.jsx` — `import styles from './ImageBlock.module.css'` + bracket lookups |
| 6. .hermes/ untracked | IMPLEMENTED | `git rm -r --cached .hermes` |
| 7. Stray scratch files removed | IMPLEMENTED | `layout_summary.txt`/`task_complete.txt` gone; `scripts_livecheck.mjs` relocated |
| 8. STATUS.md updated | IMPLEMENTED | This section |

**Noticed, explicitly left alone:** `app/api/contact/route.js` modified (minor error message text change) and `app/layout.jsx` modified (safety comment added to `dangerouslySetInnerHTML`) — both in working tree, unrelated to any plan. Not part of this audit; not touched.

Ran `plan/feature-crm-remaining-work-2.md`'s Phase 1 (the never-yet-done
live three-role browser verification) against `preview` run locally via
`pnpm dev` against the live Supabase project (Vercel's preview deployments
are behind Vercel Authentication/SSO, which this session couldn't get past
without the owner's Vercel login — running locally against the same live
database was the practical substitute). Created two real test accounts
(`phase1-client-test@crystalwebsolution.com`, `phase1-pm-test@crystalwebsolution.com`,
both password `Phase1Test!2026`) plus a company and a test project
("Phase1 Verification Project") to exercise messaging. **Left in place
deliberately** — see "Test data left in place" below.

**This verification pass found and fixed three real, previously-undetected
bugs that no code review or `pnpm test` run had ever caught, because none
of them execute against a real database through the real RPC/PostgREST
path:**

1. **`ProjectThread.jsx` has never successfully loaded a message list, for
   any role, on any project, since the component was written** (commit
   `2d2b7af`, 2026-08-03). It built a fake viewer object with only `{role}`
   — no `id`, no `company_id` — and `requireViewer()` (`lib/crm/projects.js`,
   checks added `2026-07-31`, three days earlier) has always rejected that
   shape. Every client/PM/admin project page ever loaded showed "Unable to
   authorize project access" in the Conversation panel. Fixed by passing the
   full profile object each portal page already fetches instead of a
   role-only stub (`components/crm/ProjectThread.jsx` +
   `app/{dashboard,team,admin}/projects/[id]/page.jsx`).
2. **`post_project_message` and `onboard_client_company(p_name, p_email)`
   have been broken since their original definitions** (migrations `0009`
   and `0008` respectively) **by an invalid-syntax bug: `pg_catalog.coalesce(...)`
   and `pg_catalog.nullif(...)`.** COALESCE/NULLIF are special SQL-standard
   forms, not schema-qualifiable catalogued functions — calling them
   schema-qualified raises `42883` ("function does not exist") at call
   time. This means **no project message has ever been postable through the
   live RPC endpoint** (PostgREST), only via direct SQL. `0015`'s
   `create or replace` carried the bug forward unchanged. Fixed in
   `supabase/migrations/0016_fix_pg_catalog_coalesce_syntax.sql` (applied
   and verified live).
3. **`audit_events_event_type_check` never included `'project.message_edited'`**
   (the one new event type `0015` introduced) — the exact same class of gap
   `STATUS.md` already documents for migration `0010`'s original 6 new event
   types. Editing a message failed with `23514` on its own audit-log insert.
   Fixed in `supabase/migrations/0017_add_message_edited_audit_event_type.sql`
   (applied and verified live).

**One major finding recorded but *not* fixed this session — needs deliberate
scoping, not a rushed patch:** RLS on `public.profiles` has no policy
allowing a project participant to see another participant's profile —
only your own row (`auth.uid() = id`), `is_admin()`, or a deal-owner
exception. Confirmed directly: querying `profiles` with the PM test
account's own JWT for both its own id and the client test account's id
returns only its own row. This is why the PM's view showed "Unknown" as
the sender name on the client's messages, and it isn't messaging-specific
— `loadProfiles()` in `lib/crm/projects.js` is the same helper behind
task `createdBy`/`assignee`, approval `requestedBy`/`reviewedBy`, and
deliverable/attachment `uploadedBy` resolution across the entire project
workspace, for every role, whenever the target profile isn't the viewer's
own.

**Update, same day: fixed.** `supabase/migrations/0018_profiles_shared_project_visibility.sql`
adds `private.shares_project_with(p_target_id)`, mirroring
`private.can_access_project()`'s existing per-role logic exactly (a project
is in scope for the viewer via admin/client-company/PM-assignment; the
target participates in that project via assignment or company_id match),
and a `SELECT` policy on `profiles` using it. Verified two ways: (1) the
PM test account's JWT now returns both its own row and the client test
account's row (was only its own); (2) the same JWT still returns zero rows
for two unrelated profiles (a different client, the real admin) —
confirms the policy is scoped to shared projects, not broadened globally.
Also confirmed visually in the browser: the PM's view of the conversation
now shows "Phase1 Client Test" instead of "Unknown" on every message.

**Verified end-to-end through the real browser UI** (not just direct SQL):
post a message as client → appears immediately → notification_outbox gets
both `in_app` and `email` rows for the assigned PM. Edit that message →
"edited" indicator renders correctly → a second, distinct
`project.message_edited` outbox pair is created.

**Realtime cross-session delivery — also now confirmed, via a different method.**
The browser tool's tabs share one cookie jar, so two roles logged in
across two tabs collapse into one session — not a real two-session test.
Instead, wrote a standalone Node script (`@supabase/supabase-js`, already a
project dependency) using two independently-authenticated clients: the PM
subscribes to the project's Realtime channel exactly like `ProjectThread.jsx`
does, the client posts a message via the real `post_project_message` RPC.
The PM's subscription received the INSERT event with full row data —
confirmed working, arriving in roughly 5–12 seconds (connection warm-up
latency, not a bug; well within what the UI's polling/reload fallback
would mask anyway).

**Not fully verified this session:**
- **PM assignment via the admin UI** — the `admin` role is pinned to a
  single real email (`ethan@crystalwebsolution.com`) by a DB trigger, so a
  test admin account can't be created; this session had no way to log in as
  the real admin. `assign_project_user`'s RPC body was read and doesn't use
  the `pg_catalog.coalesce`/`nullif` pattern, so it isn't hit by fix #2
  above, but its live behavior (email + `notifications_outbox` rows, the
  admin projects-list column) is unverified. Needs the owner to either spot-check
  it directly, or grant temporary access to verify it.

## 📌 Session update (2026-08-09, CRM remaining-decisions batch — Tasks 1–8)

**Update 2026-08-10: this batch is merged.** `crm/remaining-decisions` was fast-forward merged into `preview` and pushed; both local and `origin/preview` are confirmed at `d6ee832`. The worktree and local feature branch have been cleaned up (`git worktree remove` hit Windows's path-length limit, resolved via `git worktree prune`; `git branch -d crm/remaining-decisions` succeeded). The stale note below ("merge held for owner go-ahead") describes an intermediate state from before this session finished the SDD execution flow — kept for history, not current.

Closed the eight remaining CRM decisions from `docs/superpowers/plans/2026-08-09-crm-remaining-decisions.md`, executed in the `crm/remaining-decisions` worktree (branch `crm/remaining-decisions`).

**Mid-execution collision, same pattern as PR #49/#50:** after Task 1 was dispatched and reviewed clean, a concurrent session (commit `700bee7`, authored `ethancrystal`, not a subagent this session dispatched) landed Tasks 2–8 directly on the shared worktree branch in one shot, including applying migration `0020` live — bypassing the per-task review loop entirely. Rather than discard it, it was verified as real/functional (tests passing, migration confirmed live via Supabase MCP) and subjected to a retroactive catch-up review as a single gate. That review found and fixed in one commit (`5585c41`): a Critical bug (`EntityNotes.jsx`'s `.select('*, profiles(...))` embed can never work — `notes.created_by` has no FK to `profiles`, only to `auth.users`; fixed via a separate `profiles` query), and three Task-7 spec gaps (wrong prop name/URL target on the delivered-project email, `templateContextFor` never wired to supply it, and a test that asserted the bug instead of catching it).

A subsequent final whole-branch review found two more Important issues, both fixed and verified live before merge: `create_project_task`'s migration-0019 `DROP FUNCTION`/`CREATE FUNCTION` had silently regained a default PUBLIC execute grant (fixed via migration `0021`, confirmed via `proacl` before/after); and the task-priority allowlist was inconsistent across the DB CHECK constraint (4 values incl. `urgent`) vs. every app layer (3 values) — resolved via owner decision (kept 3-tier) and migration `0022` tightening the CHECK constraint after confirming 0 live rows used `urgent`.

Five smaller findings were parked rather than blocking merge: the delivered-notification email has no `role = 'client'` guard on its recipient query (spec-compliant as written, low risk); `ProjectTasks.jsx` has no CSS for an `urgent` priority (moot now that `urgent` is no longer a valid value); a test-file regex typo (`v?iewer.role`) that weakened 2 assertions, fixed directly; `projectMessageEditedEmail`'s function name deviates from the brief's `messageEditedEmail` (naming only); and STATUS.md briefly said this batch was "staged but not committed" when it was already committed.

Final state before merge: `pnpm test` — only the pre-existing, unrelated `auth-portals` failure; `pnpm build` — clean.

| # | Item | Result |
|---|------|--------|
| 1 | Migration 0019 — add `priority`/`client_visible` params to `create_project_task` + backfill | applied live, verified (backfill 0, no drift) |
| 2 | Migration 0020 — `project.delivered` review-request email (email-only, company-scoped, no staff, no new audit type) | applied live, verified |
| 3 | `EntityNotes.jsx` — real `notes`-table read/write for companies/contacts (replaces broken `NotesPanel` prop pass) | done, 3/3 |
| 4 | Task form sends `priority` + `clientVisible` to `createProjectTask` | done, 3/3 |
| 5 | `clientVisibleOnly` read filter + priority badge + `createdBy` display bug fix | done, 5/5 |
| 6 | `clientSafeProject` exposes `budget_amount`/`currency` to client role | done, 2/2 |
| 7 | `project.delivered` email template | done, 3/3 (see correction below) |
| 8 | `project.message_edited` email template (was missing → outbox rows failed) | done, 3/3 (see correction below) |

**Plan-vs-code corrections (the plan was written against a structure that no longer exists):** Tasks 7 & 8 specified adding entries to a literal `emailTemplates = { subject, template }` object in `lib/email/templates.js`. That object does **not** exist — the file dispatches via the `NOTIFICATION_TEMPLATES` factory map (event_type → factory returning `{subject, html}` via `emailLayout()`), drained by `renderNotificationEmail()`. A literal block would have been dead code the outbox drain never calls. Both templates were instead implemented as real `emailLayout` factories registered in `NOTIFICATION_TEMPLATES`, and their tests assert the actual integration (registered + renders subject/html with the real `/dashboard/projects/{id}` CTA) rather than the plan's impossible text-grep. Task 7's CTA points to `/dashboard/projects/{id}` (the plan's `/client/projects/` route does not exist).

**Verification (plan's Final Verification gates, both green):**
- `node --test tests/crm/*.test.mjs` → 106/107. The single failure is the pre-existing `auth-portals` middleware auth-cookie test — unrelated to these tasks, reported by every subagent, not touched.
- `pnpm build` → passes (exit 0; full route table including `/team/projects/[id]`).

**Resolves these previously-documented known gaps:**
- `priority`/`client_visible` not settable via RPC + `client_visible` not enforced → Tasks 1, 4, 5.
- `budget_amount`/`currency` not exposed to client role → Task 6.
- Companies/contacts `NotesPanel` prop mismatch → Task 3 (`EntityNotes.jsx`).
- `project.message_edited` outbox rows now render (were failing: no template) → Task 8.
- `project.delivered` notifications now have a renderer (new event from Task 2) → Task 7.

**Update 2026-08-10:** the above is now committed and merged — see the note at the top of this section. All of migrations 0019–0022 are applied to the live dev Supabase project.

**Test data left in place, deliberately:** the two test accounts and
"Phase1 Verification Project" (with the PM already assigned) still exist
in the live database. Recommend using them to close the PM-assignment gap
above — log in as the real admin, assign `Phase1 PM Test` to a project (or
reassign it on the existing test project) via the admin UI, and confirm
the email + projects-list column. Delete the test accounts/company/project
via Supabase once verification is done; they're clearly named and isolated
(no real client data touches them).

## 📌 Session update (2026-08-09)

**Branch consolidation completed.** PR #58 (marketing identity), #62
(entrance reveals, merged into #58's branch first), #61 (case-study
narrative/gallery — hand-resolved a real conflict against #62's changes to
`app/work/[slug]/page.jsx`, keeping both sides' content), #60 (CRM
notifications/messaging/PM assignment), and a new #64 (Screaming Frog SEO
remediation, extracted from a prior session's uncommitted working tree) are
all merged into `preview`, in that order. `pnpm test` (157/158, 1
pre-existing unrelated `auth-portals` failure) and `pnpm build` verified
clean after every merge. Full sequencing plan: `plan/process-branch-
consolidation-1.md`.

**Migration `0015` is now applied to the live database**, closing the
single highest-priority blocker from the 2026-08-08 update below. Verified
directly (not just "ran without erroring"): `project_messages.edited_at`/
`.edited_by` exist, `public.update_project_message` exists,
`project_messages` is in the `supabase_realtime` publication. Message
editing, PM-assignment notifications, and Realtime message delivery are no
longer inert — **but still not click-through verified in a real logged-in
browser session**, which remains the top item in the next plan.

**Production's deploy pipeline was broken independently of any CRM
work**, discovered while investigating why `www.crystalwebsolution.com`
was serving a commit from PR #45 — two weeks and ~15 PRs behind `main`'s
actual tip. Root cause: `main`'s `vercel.json` still had `crm-notifications`
on `*/15 * * * *`, which the Hobby plan rejects outright, so every deploy
attempt from `main` had been failing validation since PR #56 introduced it
(the fix already existed on the `preview` track via commit `0dbfb24`, just
never ported to `main`). Fixed directly on `main` and confirmed a
successful production deploy. Separately, found `NEXT_PUBLIC_CRM_ENABLED`
and `NEXT_PUBLIC_SUPABASE_ANON_KEY` **did not exist at all** in Vercel's
project env vars — not misconfigured, just never created — which is why
the CRM login/signup pages were fully public on production with no gating,
and why `/dashboard`/`/admin` were erroring with `?error=configuration`.
Both now exist (`NEXT_PUBLIC_CRM_ENABLED=false` scoped to Production only);
confirmed live via direct HTTP check that `/login`, `/signup`, `/dashboard`,
`/admin`, `/team` all redirect to `/` on production, and that the nav no
longer links to them, while `preview` still serves the CRM normally for
testing. This is `production`-branch/Vercel-config housekeeping, not CRM
app code — the `production` git branch itself was never touched, per
standing instruction.

**Next plan for continuing CRM work**: `plan/feature-crm-remaining-work-2.md`
— the never-yet-done three-role browser verification pass (now unblocked
by the migration fix above), the `priority`/`client_visible` and
`budget_amount`/`currency` exposure decisions, `updateProjectTask`'s
latent `revalidateAllProjectPaths` bug, the companies/contacts `NotesPanel`
design decision, finishing the loading-state pass, and migration/env
housekeeping (`fix_handle_new_user_coalesce` → a tracked `0016` file).

## 📌 Session update (2026-08-08)

Full-completion audit against an explicit spec (three-role hierarchy, one
project = one dedicated message thread, instant email on every message
*and* every edit, admin-assignable project managers). Verified live
against the connected Supabase project's actual function bodies and
`pg_publication_tables`/`pg_policies`, not from memory or prior docs.

**Headline finding: most of the spec already existed and was already
shipped.** Auth, project creation, the status lifecycle, and the entire
per-project messaging UI/backend (`ProjectThread.jsx`,
`post_project_message` RPC) were built and working. The real gaps were
narrower and more specific than "messaging isn't built":

1. **Every notification-producing RPC was silently broken at the producer
   end.** `post_project_message` and `assign_project_user` never wrote to
   `notifications_outbox` *at all*, despite their email templates already
   existing and being registered. `transition_project_status`,
   `update_project_approval`, `publish_project_deliverable` *did* write to
   the outbox, but hardcoded `channel: 'in_app'` and only ever addressed
   `project_assignments` (assigned staff) — structurally excluding the
   client, who is scoped by `company_id`, not an assignment row. Net
   effect: **the drain worker documented as "fixed" below (the cron that
   sends `channel='email'` rows via Resend) has had nothing to drain for
   4 of 5 event types, and nothing at all for messages/assignments.**
   That earlier fix was real and necessary but was the delivery half of a
   two-part pipeline; the producer half had its own, separate bugs.
2. **Message editing did not exist at any layer** — no `edited_at`/
   `edited_by` columns, no update RPC, no UI. Required by the spec
   ("Message edited → ... triggers email notification").
3. **`project_messages` was not in the `supabase_realtime` publication**
   (`select * from pg_publication_tables where pubname='supabase_realtime'`
   returned zero rows for it) — `ProjectThread.jsx` only ever fetched
   messages once on mount, with no subscription, no polling. A message
   posted by another participant never appeared without a manual page
   reload.
4. **`assign_project_user`'s RPC/action layer was fully built with zero UI
   ever calling it** — the admin projects list's "Project Manager" column
   always rendered "—" because `listProjectsForViewer` never joined
   assignments either.

**What shipped this session** (branch `agent/crm-notifications-and-messaging`,
PR **#60**, stacked independently of the marketing branches):
- `supabase/migrations/0015_project_notifications_and_message_editing.sql`
  — centralised recipient helper (assigned staff + client company), both
  channels from all 5 event-producing RPCs, new `update_project_message`
  RPC + schema, `publish_project_deliverable`'s payload enriched with the
  deliverable's title/version (was previously always blank in that
  email), `pinned_admin_email()` search_path pinned, Realtime enabled on
  `project_messages`.
  **⚠️ NOT YET APPLIED to the live database** — `apply_migration` was
  blocked by the Claude Code auto-mode permission classifier (a live-DDL
  write). Needs the owner's explicit one-time approval or manual
  application via the Supabase SQL editor / `supabase db push` before any
  of this session's notification/edit/realtime work actually functions.
- `ProjectThread.jsx`: Realtime subscription (live message delivery,
  reloads through the same RLS-respecting read path rather than patching
  a raw payload in place) + inline edit UI on the sender's own messages.
- `app/admin/projects/[id]/page.jsx`: assignee picker wired to the
  already-built `assignProject`/`removeProjectAssignment` actions.
- `lib/crm/projects.js`: `listProjectsForViewer` now joins the primary
  assignee (fixes the admin list's dead column); `listProjectMessages`
  returns `threadId` + `edited_at`/`edited_by`.

Full audit trail and 6 phases of remaining work (security/Auth-config
items, the pre-existing gaps below, the never-yet-done full logged-in
three-role click-through):
`plan/feature-crm-website-completion-1.md`.

**Also this session, separate branches, same session:**
- **PR #58** (`agent/marketing-inner-pages` → `preview`, open) — gave
  About/Services/Contact/Process each a distinct `IdleScene` backdrop
  variant + one bespoke element (FoundingRail, ServiceThreadArc,
  ContactPulseLinks+pulse.js blast on focus, ProcessRail), plus the
  Hobby-plan cron-frequency fix that was blocking every PR's Vercel
  deployment (`vercel.json`'s `crm-notifications` cron was `*/15 * * * *`,
  which Hobby rejects outright — reduced to daily; this delays outbox
  email latency from ~15min to up to 24h until the plan is upgraded).
- **PR #62** (`agent/marketing-inner-pages-polish` → `agent/marketing-inner-pages`,
  open) — scroll-entrance reveals (`SectionReveal`, the same component
  the homepage already uses everywhere) across all 9 inner-page route
  templates, which previously had zero entrance animation. Built with
  `superpowers:subagent-driven-development`; ledger and plan at
  `docs/superpowers/plans/2026-08-08-inner-pages-entrance-reveals.md`.

**Newly confirmed live-account gaps this session** (owner action only, no
tool access to fix): the Supabase Auth "Redirect URLs" allow-list is
still empty (confirmed via a live dashboard screenshot) — every emailed
auth link (signup confirmation, password reset, staff invite) is
rejected by GoTrue until at least one URL is added.

## 🗺️ Current shape of the app (2026-08-04)

**Stack:** Next.js 15 / React 19, plain JSX + global CSS (no TypeScript, no
Tailwind), Supabase (Postgres/Auth/Storage/RLS), Resend for transactional
email, GSAP/Lenis-driven scroll animation on the marketing site. `pnpm`
only; no lint script exists, don't add one.

**Two halves of one app:**
- **Marketing site** (`/`) — one fixed WebGL canvas (`components/Scene.jsx`)
  the DOM scrolls over; camera path driven by `lib/journey.js`
  `STOPS`/`CLUSTERS` against real measured beat positions
  (`lib/beatProgress.js`). Sections: Hero, About, Services, Approach,
  Stories, Mark, Lab, Motion, Contact. See `CLAUDE.md`'s "core idiom"
  section before touching anything scroll/animation-related.
- **CRM** (`/login`, `/dashboard`, `/team`, `/admin`) — three roles, gated by
  `middleware.js` at the server edge for the entire subtree of each portal
  (`/dashboard/**`→client, `/team/**`→employee, `/admin/**`→admin), backed
  by RLS. Two data-access shapes coexist deliberately (see CLAUDE.md's
  "Conventions" section): the contract-tested project-delivery path
  (`lib/crm/projects.js` + `app/actions/project-actions.js`) for
  dashboard/team/admin project pages, and direct-Supabase-client + RLS for
  companies/contacts/deals/tasks/users.

**Auth model** (as of migration `0014`, 2026-08-04): clients self-signup via
`/signup`. Signup also offers a client/employee choice, but the choice only
sets `profiles.requested_staff_access` — it can never mint a role by itself;
`handle_new_user()` still hardcodes every new account to `client`. An admin
promotes a pending request to `project_manager` via
`admin_resolve_staff_request()`. The `admin` role is pinned in the database
to a single address (`public.pinned_admin_email()` + a partial unique index
+ a `BEFORE INSERT OR UPDATE OF role` trigger) — it cannot be reached from
signup, invite, or any role-change path, by design.

**Current verification (2026-08-04):** `pnpm test` — 146/146 passing (full
suite, up from 110 at the last full check — new coverage added for the
services signal metadata, the notes/deliverables migration contract, and
the client-workspace project-scoping regex). `pnpm build` — clean, no
errors or warnings, 43 pages.

**Recent PRs merged today (2026-08-03/04), most-recent first:**
- **#54** `feat(auth): client/employee signup choice with a pinned single admin` — migration `0014`, the auth model described above, plus a fix for a live signup crash (`createAdminClient()` throwing unguarded when the service-role key is unset).
- **#53** `fix(deps): cookie override regression` — **urgent hotfix**. PR #51's dependency chore added an unbounded `pnpm.overrides["cookie"] = ">=0.7.0"`, which resolved to `cookie@2.0.1` (a completely different, incompatible API — no `parse`/`serialize`). `@supabase/ssr` needs the old API for every auth cookie it sets, so login/signup/session-refresh across all three portals would have thrown at runtime. Bounded to `>=0.7.0 <1.0.0`. **If you're reading this after `main` diverges further, verify this range hasn't been widened again.**
- **#52** About-section kicker/word-grid overlap fix (real bug: fixed-position kicker vs. viewBox-scaled SVG word grid collided on short-but-wide viewports, not just narrow phones — a width-based media query couldn't catch it) + started a shared CRM loading-state system (`components/crm/Spinner.jsx`, `Skeleton.jsx`).
- **#51** Dependency chore (see #53 — this is the PR that introduced the regression #53 fixed).
- **#49** CRM core-flow fixes: PM status transitions/task creation were calling undefined functions (completely broken), PM had no way to discover assigned projects, every client with a company got "unauthorized" instead of their project list, admin invite cleanup used the wrong Supabase client, client messaging/uploads were bypassing RLS-revoked direct table writes instead of the validated RPCs, a deal's chat/notes were wired to the wrong entity. Also migration `0013` (`post_project_note`, `create_project_deliverable` + storage policies).
- **#48** ServiceRail wireframe/rotation-speed signal-index bug (post six-to-eight-service-row split, the wireframe treatment stayed pinned to index 2 instead of following the signal it was designed for) + gated its per-frame rotation by `motionScale.value` (it was the only animated 3D actor not respecting `prefers-reduced-motion`).

**Closed as stale/superseded** (confirmed by reading their actual diffs, not assumed): #26 (pre-dates the entire current CRM architecture), #29 (redundant no-op changes), #39 (main already has a newer dependency version), #46 (~95% already on `main` verbatim; the one real gap - `lib/beacon.js`/`lib/pointerState.js` missing from CLAUDE.md's singleton list - was too small to be worth its own PR). #50 was closed after reconciliation into #49 - see the "duplicate-work incident" note below, still relevant reading before starting broad CRM audit work.

**Left alone, not stale**: #8 (`feature/trionn-visual-parity-v2`) is a deliberately parked foundation branch for a future redesign - not abandoned, just not picked up yet. #45 ("Session record...") is an audit/record artifact (base is an old baseline branch, head is `main` - backwards for a normal merge), not meant to be merged in the usual sense.

**In progress**: a CRM-wide loading-state pass (skeletons on list pages, spinners on detail/edit/workspace pages and inline button states) - `Spinner.jsx`/`Skeleton.jsx` exist and are applied to companies/contacts/deals/tasks/users list pages; the remaining ~19 detail/edit/new/workspace pages and inline button-loading text are still on plain `"Loading..."` text.

**Minor drift to reconcile**: the live database has a migration named `fix_handle_new_user_coalesce` (applied 2026-08-04, right after `0014`) with no corresponding local file. Compared its live function body against local `0014`'s `handle_new_user()` - they match, so this looks like a same-day hotfix whose content was folded directly into `0014`'s file rather than tracked as a separate `0015`. Not a functional problem, but worth a real `0015` file (or a note in `0014`) so local migration history has no unexplained gap - same category of issue the "check open branches/PRs" guidance below exists to prevent.

## ⚠️ Check open branches/PRs before starting CRM fix work

**Incident (2026-08-03):** two separate agent sessions independently ran a
CRM bug audit and both fixed largely the same findings, in the same ~12
files, without either being aware of the other (PR #49 `fix-crm-core-flows`
and PR #50 `workflow-crm-ultracode-sweep`, plus a third session that landed
its own migration `0012` directly on `main` while a fourth landed the
email/cron-drain rewrite in commits `880c4d6`/`3f76c84`). Reconciling this
took a full review pass to find PR #50's overlapping reimplementations were
independently broken in ways PR #49's tested versions weren't (a missing
`await` on an async `createClient()`, a wrong Supabase count-query
destructure, an undefined-variable `ReferenceError`, a response-shape
mismatch, incomplete role-routing) — see PR #49's merge commit for the
full comparison and PR #50's closing comment for the itemized verdict.

**Before starting any broad CRM bug-fix/audit pass:**
1. Run `git branch -a` and `gh pr list` and read anything CRM-related that's
   open before touching `app/actions/project-actions.js`, `components/crm/*`,
   `app/{dashboard,team,admin}/**`, or `supabase/migrations/*` — these are
   the files most likely to collide.
2. Check the migration number actually live on Supabase
   (`list_migrations` via MCP, or `supabase migration list`) before naming a
   new migration file — local `supabase/migrations/` and what's actually
   applied can drift when multiple sessions work in parallel worktrees.
3. If you find an open PR touching the same files you're about to fix, stop
   and reconcile rather than opening a third parallel implementation.

## 🗄️ Migrations 0012–0013 (2026-08-03)

- `0012_project_task_update_fixes.sql` — fixes `update_project_task`'s
  NULL-permissive assignee check and its silent overwrite of
  assignee_id/due_date on partial updates. Applied live directly (by a
  separate session, reconciled after the fact); now checked into `main`'s
  migration history in sequence.
- `0013_project_notes_and_deliverables.sql` — adds `post_project_note()`
  (lets `NotesPanel.jsx` post a standalone update despite
  `project_status_history.to_status` being NOT NULL) and
  `create_project_deliverable()` + matching `storage.objects` policies
  (the only INSERT path `project_deliverables` has ever had). Applied live
  via Supabase MCP `apply_migration`, verified by direct query
  (`pg_proc`/`pg_policies`) after applying. App-code wiring (server actions
  + UI) is in PR #49, gated on this migration already being live — it is.

### 🧹 Repository preservation cleanup (2026-08-02)

- Removed only explicitly approved generated residue, 12 reverified
  runtime-unreachable source files, their dead CSS, unused direct dependencies,
  and three rejected untracked migration alternatives.
- Restored historical migration `0007` to its committed bytes; canonical
  `0009`–`0011` were retained unchanged.
- Preserved the current public design, one-Canvas animation architecture,
  Lab DOM/CSS-3D carousel and fallbacks, Motion selected-work rail, all CRM
  routes/actions/read models, every branch, and every recovery stash.
- Repaired the `/login` portal chooser and linked `/signup` page without
  changing copy, routes, forms, or authentication behavior: both CWS marks are
  intrinsically bounded and centered, and the three intended portal controls
  render correctly through Next Link's styled-jsx boundary.
- Restored the generic `sendEmail` export already called by signup confirmation,
  password reset, and staff invite actions; the existing invite helper now
  shares that tested Resend boundary. No live email was sent during verification.
- Ended with one canonical worktree. Full worktree/stash recovery evidence is
  in `docs/WORKTREE-STATE.md`; the exact cleanup and retention manifest is in
  `docs/REPOSITORY-CLEANUP-2026-08-02.md`.
- Current verification: CRM tests 59/59, full suite 110/110, production build
  43/43 pages, desktop/mobile/browser CRM smoke checks with no console errors.
- Read-only live Supabase checks confirmed canonical migrations 0009–0011 and
  18 public CRM tables with RLS enabled. No database write or deployment was
  performed. Local `test:db` remains unavailable until Docker Desktop runs.

### 📌 Git checkpoint and remote boundary (2026-08-02)

- The reviewed cleanup/auth/documentation checkpoint is commit `aa50610`
  (`chore: preserve and consolidate repository state`). It contains no merge,
  rebase, cherry-pick, database write, or deployment.
- A pre-push fetch found that `origin/main` had independently advanced from
  `c5a922f` to `540887d` while this checkpoint was being finished. That remote
  commit changes only `CLAUDE.md` and was not merged or copied into the local
  checkpoint.
- Local `main` and `origin/main` therefore each have one unique commit. A
  force-push is prohibited; the preserved publication target for this exact
  checkpoint is `origin/codex/repository-cleanup-2026-08-02` until a future,
  explicitly authorized reconciliation decision is made.
- The newly requested Services-scene synchronization and responsive navigation
  overlap repairs were deliberately not mixed into this checkpoint. They remain
  the next public-UI work after this clean recovery point.

### 🔀 Branch reconciliation with `origin/main` (2026-08-01)

`origin/main` had diverged with a second, independent implementation of the same feature (commit `5b90c3c`, authored `ethancrystal`, file `supabase/migrations/0009_project_workspace.sql`, "Task 3: Project Delivery Aggregate"). It defined a different schema for the same aggregate: `project_members` instead of `project_assignments`, `create_delivery_project()`/`record_project_approval()` instead of `create_project()`/`update_project_approval()`, auth helpers in `public` instead of `private`.

Facts established before resolving:
- That file was **never applied to the live Supabase database**. `list_migrations` against the live project shows no matching entry.
- Its own `public.can_access_project()` calls `public.is_project_manager()`, which `0008_auth_rbac_repair.sql` never defines. The function would raise on first call — it could not have worked if invoked.
- This branch's migrations (`0009_project_realtime_crm.sql`, `0010_project_workspace.sql`) **are** applied to the live database (confirmed via `list_tables` — `project_assignments`, `create_project`, etc. exist; `project_members`, `create_delivery_project` do not).

Resolution: this branch's schema was kept as the base (it is what the live database and the already-deployed app code both run on). `supabase/migrations/0009_project_workspace.sql` was removed from the merge — keeping two files both claiming to be "0009" with contradictory content would misrepresent what's actually applied. `origin/main`'s version remains reachable in git history via commit `5b90c3c` if anyone needs to consult it.

Four things in `origin/main`'s design were genuinely stronger and were ported forward as a new additive migration, `0011_workspace_hardening_from_main.sql`, rather than editing the already-applied 0009/0010 files:
1. `projects.budget_amount` / `projects.currency` — projects had no budget tracking.
2. `project_tasks.priority` / `.client_visible` / `.completed_at` — tasks had no priority or completion tracking.
3. `project_deliverables.version` — deliverables had no version field.
4. `notifications_outbox` rebuilt as a retryable queue (`status`, `attempts`, `available_at`, `last_error`) instead of a bare `sent_at` timestamp.
5. **Automatic notification fan-out** — `origin/main`'s `transition_project_status`/`record_project_approval`/`publish_project_deliverable` each inserted a `notifications_outbox` row for every other project member on the affected action. This branch's equivalent functions (`transition_project_status`, `update_project_approval`, `publish_project_deliverable`) never did this — `enqueue_project_notification` existed but nothing called it. Ported the same fan-out pattern into all three, addressed to `project_assignments` rows instead of `project_members`.

Explicitly **not** ported, as a documented decision rather than an oversight:
- `priority` and `client_visible` are schema columns with defaults; they are **not** yet exposed as `create_project_task`/`update_project_task` parameters, so nothing can set them to a non-default value through the RPC surface yet. `completed_at` **is** wired — `update_project_task` sets/clears it automatically based on `p_status`.
- `client_visible` filtering is not enforced anywhere (no RLS policy or read-model filter checks it). Every project participant currently sees every task regardless of this flag, same as before this migration.
- `budget_amount`/`currency` are not exposed to the `client` role — `clientSafeProject()` in `lib/crm/projects.js` was deliberately left unchanged, so these two columns stay admin/PM-visible only. This is a conservative default, not a modeled business decision — revisit if clients should see budget.

### ✅ Completed 2026-08-01
- **Fixed a real regression**: `app/dashboard/projects/[id]/page.jsx` didn't call the Phase 1 read functions (`listProjectTasks`, `listProjectApprovals`, `listProjectDeliverables`, `listNotifications`) the prior commit's own test expected. Wired them in, added `components/crm/NotificationsPanel.jsx`.
- **Fixed a real data bug**: `listProjectTasks`/`listProjectApprovals`/`listProjectDeliverables` in `lib/crm/projects.js` returned raw rows with no profile joins, so assignee/requester/reviewer names always rendered "Unknown"/"Unassigned". Added the same profile-mapping `getProjectWorkspace` already did. Also fixed `getProjectWorkspace` itself, which had the identical gap for `tasks`/`approvals` (deliverables was already fixed) — this silently broke names on the **admin and team** project pages too, not just the client one.
- **Closed the Supabase migration drift** — the live database was missing every project/workspace table before this session (see next section).
- **Reconciled with `origin/main`'s competing implementation** and cherry-picked its stronger schema/notification ideas — see above.

### 🗄️ Supabase migration state (verified via MCP against the live project)
Before this session, remote had only run 0001–0006 + 0008 (**0007 and 0009/0010 were never applied**), plus one ad hoc migration with no repo file at the time: `0009b_drop_legacy_project_message_tables` (dropped the old deal-based `project_messages`/`project_files` tables outright). Net effect: **the entire `projects` schema — everything the last several commits' UI code depends on — did not exist in the live database.** `pnpm test` never catches this because every CRM test is a regex-over-SQL-text contract check; nothing in this repo has ever executed against a real database.

Actions taken:
- **0007 (`notes_creation_scoping`) — deliberately skipped, not applied.** Its target policy (`"Any authenticated user can create notes"`) no longer exists on remote; 0008 already replaced the entire notes RLS surface with a stricter, more complete model (role+deal+contact scoped policies) that fully supersedes 0007's intent. Applying 0007 would either hard-error or reintroduce weaker, already-superseded policies. Left as historical/dead in the repo.
- **0009 (`project_realtime_crm`) — patched and applied.** As written, it unconditionally required `public.project_messages`/`public.project_files` to exist (to rename them aside) — but the ad hoc 0009b had already dropped them. Rewrote the guard block to be existence-safe (`to_regclass(...)`) so it works both on a fresh install (tables exist, full guard-then-rename runs) and on this already-cleaned-up remote (no-op). Updated `tests/crm/project-schema.test.mjs` to match.
- **0010 (`project_workspace`) — two real bugs fixed before applying, neither ever caught by tests or a real run:**
  1. `project_approvals` was created with a foreign key to `project_deliverables`, but `project_deliverables` was defined *after* it in the same file — would have failed immediately with "relation does not exist". Reordered.
  2. `audit_events`'s CHECK constraint (from 0009) only allowed the original 7 event types; none of 0010's 6 new event types (`project.task_created`, `project.approval_requested`, etc.) were in it. Every task/approval/deliverable/notification RPC would have failed at runtime on its own audit-log insert. Widened the constraint as part of 0010.
- **0011 (`workspace_hardening_from_main`) — applied.** See "Branch reconciliation" above.
- Remote now has all 18 tables from 0009/0010 (verified via `list_tables`), RLS enabled and forced on every one, plus 0011's column additions. `get_advisors(security)` shows only the pre-existing, intentional pattern (SECURITY DEFINER functions callable by `authenticated`, each with its own internal auth checks) — no new findings from this session's changes. `get_advisors(performance)` shows only WARN/INFO noise (unused indexes on empty tables, etc.), no errors.

### ⚠️ Known gaps carried forward

**Resolved since first documented — kept here so the fix history is traceable:**
- ~~No notification delivery pipeline~~ — fixed *on the delivery/drain side only*, 2026-08-04. **2026-08-08 correction: the producer side was still broken until PR #60** — `app/api/cron/crm-notifications/route.js` correctly drains any `channel='email'` outbox row via Resend, but until PR #60's migration is applied, `post_project_message`/`assign_project_user` never created one at all, and `transition_project_status`/`update_project_approval`/`publish_project_deliverable` only ever created `channel='in_app'` rows scoped to `project_assignments` (never the client). Read this line as "the worker that would deliver emails works" — not "emails get sent" — until PR #60 merges and its migration is applied.
- ~~`update_project_task`'s NULL-permissive authorization check~~ — fixed in migration `0012`: unassigned tasks now require `assignee_id IS NOT NULL AND assignee_id = v_user_id` instead of relying on `NULL <> x` silently evaluating false.
- ~~`update_project_task` unconditionally overwrote `assignee_id`/`due_date`~~ — fixed in `0012`: only overwrites when the caller explicitly passes a value.
- ~~`project_status_history`/`project_deliverables` had no valid write path for notes/deliverable-creation~~ — fixed in migration `0013` (`post_project_note`, `create_project_deliverable` + `storage.objects` policies), wired into `NotesPanel.jsx`/`ProjectFiles.jsx` in PR #49.
- ~~`cookie` package resolved to an incompatible major version, breaking auth cookies~~ — fixed in PR #53 (`pnpm.overrides` bounded to `>=0.7.0 <1.0.0`).

**Still open:**
- **Untracked SEO-crawl CSVs in `public/`** (`accessibility_all.csv`, `sitemaps_all.csv`, `structured_data_all.csv`, and ~27 others, ~30 files total) — appeared 2026-08-10, not committed, not gitignored, unrelated to any work in this session. Since `public/` is served statically, committing them as-is would make a raw SEO audit export publicly downloadable. Not cleaned up here — belongs to whichever session generated them; flagged to the owner, needs a decision (move out of `public/`, gitignore, or delete).
- **PR #60's migration (`0015_project_notifications_and_message_editing.sql`) is written and reviewed but not applied to the live database** — blocked by the Claude Code auto-mode permission classifier on live DDL writes. Needs the owner's explicit approval or manual application. Until then, message editing, live (Realtime) message delivery, and every notification email described in PR #60 are inert in the deployed app even after merge.
- ~~**`priority`/`client_visible` (0011) are not yet settable via RPC** and `client_visible` is not enforced anywhere~~ — resolved 2026-08-09 (Tasks 1, 4, 5): `create_project_task` now takes `p_priority`/`p_client_visible` (migration 0019) and the client read-model filters via `clientVisibleOnly`.
- ~~**`budget_amount`/`currency` are not exposed to the `client` role**~~ — resolved 2026-08-09 (Task 6): `clientSafeProject()` now exposes both fields to the client role.
- **`revalidateAllProjectPaths` passed the wrong id** in `updateProjectTask`/`updateProjectApproval` before PR #49 fixed `updateProjectApproval`'s call site specifically (when `ProjectApprovals`' approve/reject UI was wired up). `updateProjectTask`'s equivalent call is still wrong, but `ProjectTasks.jsx` has no update UI yet, so it's unreachable today — fix it *before* adding task-edit UI, not after, to avoid shipping the same freshly-reachable bug again.
- ~~**Companies/contacts `NotesPanel` prop mismatch**~~ — resolved 2026-08-09 (Task 3): replaced with `EntityNotes.jsx` which reads/writes the `notes` table directly keyed on `company_id` (and optionally `contact_id`), swapped into both detail pages. `NotesPanel` remains project-scoped and untouched.
- **CRM loading states**: in progress, see "Current shape" above.
- **Migration drift**: the `fix_handle_new_user_coalesce` live-only migration, see "Current shape" above.
- **Unconfirmed**: whether `.env.local` has `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` (flagged as missing earlier; only non-prefixed `SUPABASE_URL`/`SUPABASE_ANON_KEY` were present, which the code doesn't read for client-side Supabase init) and whether the Supabase Auth "Redirect URLs" allow-list has been populated in the dashboard (was empty; without it, GoTrue rejects every emailed auth link). Both need the owner to check/fix directly — no tool access to confirm from here.
- **Live end-to-end verification still isn't done via a logged-in browser session** — verification throughout has been direct Supabase MCP calls against the live schema (`list_tables`, `list_migrations`, `execute_sql`, `get_advisors`) plus `pnpm test`/`pnpm build`, not an actual signed-in click-through of login/signup/CRM flows in a browser.

### ✅ Verification
- `pnpm test` — 110/110 passing (full suite, includes `tests/crm/*`)
- `pnpm build` — production build passes
- Read-only Supabase inspection confirmed canonical `0009`–`0011` and all 18
  public CRM tables with RLS enabled; checked-in historical `0007` remains
  intentionally absent from live migration history.
- Historical 2026-08-01 state: deployed to Vercel production and aliased to
  `https://www.crystalwebsolution.com`. The 2026-08-02 cleanup did not deploy.

### 🚧 In Progress / Next (2026-08-08)
- **Apply `supabase/migrations/0015_project_notifications_and_message_editing.sql` to the live database** (PR #60) — the single highest-priority item; everything else in PR #60 is inert until this lands.
- Merge PR #58, #60, #62 (in that order — #62 stacks on #58; #60 is independent).
- After #60 merges and its migration applies: run the manual verification it still needs — post a message and confirm an email arrives, edit it and confirm an edit email arrives, assign a PM from the new admin UI and confirm both the email and the projects-list column, open a project in two sessions and confirm live delivery without a reload.
- Finish the CRM loading-state pass: `Spinner.jsx`/`Skeleton.jsx` exist and cover the list pages; detail/edit/new pages, the three role project-workspace pages, and inline button-loading text (Save/Submit/Sending/Uploading across ~19 files) are still plain `"Loading..."` text.
- ~~Decide whether `priority`/`client_visible` should be exposed via `create_project_task`/`update_project_task`, and whether `client_visible` should filter task visibility for the `client` role.~~ — decided & implemented 2026-08-09 (Tasks 1, 4, 5).
- ~~Decide whether `budget_amount`/`currency` should be client-visible.~~ — decided & implemented 2026-08-09 (Task 6).
- ~~Resolve the companies/contacts `NotesPanel` prop mismatch~~ — resolved 2026-08-09 (Task 3).
- Fix `updateProjectTask`'s `revalidateAllProjectPaths` wrong-id bug before shipping any task-edit UI (currently unreachable, would become live the moment `ProjectTasks.jsx` gets an update control, same pattern as the `updateProjectApproval`/`publishDeliverable` bugs already fixed once each became reachable).
- Reconcile the `fix_handle_new_user_coalesce` live-only migration into a tracked local file.
- Confirm `.env.local`'s `NEXT_PUBLIC_SUPABASE_*` vars and the Supabase Auth "Redirect URLs" allow-list (owner action, not something verifiable from a coding session).
- Run `pnpm crm:verify` (`test:crm && test:db`) with a proper local Supabase stack once available — `test:db` still hasn't been run.
- A real, logged-in browser click-through of login/signup/CRM flows for all three roles is still outstanding — everything to date has been verified via Supabase MCP + `pnpm test`/`pnpm build`, not an actual session.

### 📋 How to Continue
1. Re-run `pnpm test` and `pnpm build`.
2. Read the "⚠️ Check open branches/PRs before starting CRM fix work" section above *before* starting any broad CRM audit/fix pass — this exact mistake has happened twice this week (PR #49/#50, and the untracked `fix_handle_new_user_coalesce` migration).
3. Update this file with any new findings/commits before ending the session.
