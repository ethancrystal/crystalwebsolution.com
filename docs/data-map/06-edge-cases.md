# 06 — Edge-case register

Every finding from the data map, deduplicated, with a severity and a status.
Detail and full evidence live in the chapter each row links to; this page is the
index you work from.

- **Severity.** Critical: someone outside a tenant can get in now. High: a
  cross-tenant leak, data loss, or a core flow broken. Medium: wrong data or a
  gap under a common condition. Low: latent, cosmetic, or hygiene.
- **Status.** `Fixed Fn` (on this branch, commit named), `0051 Dn` (in
  migration 0051, applied by the owner), `Owner` (a dashboard or live-database
  action only the owner can take), `Decision` (a product call), `Open`
  (confirmed, not fixed here), `Accepted` (known and tolerable), `Unverified`
  (needs a browser or live check before anyone acts).
- Sources: migrations as `0029 create_lead_from_contact` (migrations never
  change after they ship); app code as `path#symbol`.

## Live state (read-only check, 2026-10-01)

Queried the live Supabase project read-only, counts only, no personal data
returned.

| Check | Result |
| --- | --- |
| Migration ledger | Ends at `0045_fix_outbox_mark_coalesce`. |
| `0046`–`0049` | **Not applied.** Their markers are absent: the 0046 recipients helper body, 0047's staff-only `create_project_task`, the 0048 `project_attachment_cleanup` table, the 0049 `project_manager_names` function. The app degrades on purpose without 0048 and 0049 (`lib/crm/projects.js#getProjectManagerNames`, `app/api/cron/crm-notifications/route.js#isMissingFunction`). |
| `0050` | Its three broadcast triggers exist, but the ledger has no row for it. |
| Accounts on a retired domain | 2 in `auth.users`; 1 of them is staff (project_manager or admin). |
| Admins | 1. Its `requested_staff_access` is false, so D7 cannot fire today. |
| `notifications_outbox` | email pending 4 (max attempts 25, oldest 2026-08-26); email failed 2; email sent 11; in_app pending 13. |

## Owner checklist, in order

1. **S1:** move the live staff account off `crystalwebsolution.com`: change its email to a `cdsportswearinc.com` address, or ban or delete it. Do the same for the other retired-domain account. Then confirm that `select count(*) from auth.users where split_part(lower(email),'@',2) in ('crystalwebsolution.com','cdsportswearusa.com')` returns 0.
2. **S2:** before merging this branch, confirm that Vercel Production `NEXT_PUBLIC_APP_URL` is a bare `https://` origin on `cdsportswearinc.com` with no path. `lib/appUrl.mjs` now refuses anything else, and sign-up would then return "temporarily unavailable".
3. **S3:** apply `0046` → `0049` to the live project, record `0050` in the ledger, then apply `0051`. The order matters: `0051` replaces functions starting from their `0046`/`0047` bodies.
4. **N1:** decide what happens to the 4 stuck email rows. The runbook forbids touching historical rows without approval (`docs/CRM-OPERATIONS.md`).
5. **A8, N6, I1:** dashboard checks:
   - Supabase Auth `SITE_URL` and the redirect allow-list, with no retired domains.
   - That `CRON_SECRET`, `CRM_CRON_SECRET` and the Vault `crm_cron_secret` agree.
   - The GA4 measurement ID.
6. Close or rework open PR #233. It reuses migration number `0044`, and it links a new account to an old contact's company (see A1).

## Security and access

| Id | Sev | Finding | Status | Detail |
| --- | --- | --- | --- | --- |
| S1 | Critical | A live staff account sits on `crystalwebsolution.com`, whose mail a third party can receive. "Forgot password" would hand them a staff login. The provisioning script created such accounts already confirmed. | Owner; script `Fixed` (3a868e0) | [07 §4](07-external-services.md), `scripts/provision-crm-test-users.mjs#isRetiredDomainEmail` |
| S2 | High | Sign-up, invite, reset and notification links were built from a raw `NEXT_PUBLIC_APP_URL`: unset gave `undefined/auth/verify?token_hash=…`; a retired host would receive live tokens. | `Fixed F10` (5455f42) | [02](02-entry-points.md), `lib/appUrl.mjs#getAppUrl` |
| S3 | High | Production runs app code for `0046`–`0050`, but `0046`–`0049` are not applied. That includes 0047's staff-only task and deliverable creation, so production still has the pre-0047 RPCs. | Owner | Live state above; [01b §2](01b-database-logic.md) |
| S4 | High | Approval decisions on **internal** deliverables are emailed to the client, with the old requester note instead of the decision. | `0051 D1` | 0015 `update_project_approval`; [05 §6](05-lifecycles.md) |
| S5 | High | Demoted or unassigned users keep receiving internal message excerpts; company fan-out ignores role; a stale assignment suppresses the admin fallback. | `0051 D2` | 0046 `project_notification_recipients` |
| S5b | Medium | Two role-blind fan-outs remain outside D2: the `project.delivered` fan-out in `transition_project_status`, and the recipient check in `enqueue_project_notification`. | Open | 0030 `transition_project_status`; 0046 `enqueue_project_notification` |
| S6 | High | A client can edit staff-only (`client_visible = false`) unassigned tasks and set any profile as assignee. | `0051 D3` | 0012 `update_project_task` |
| S7 | High | Contact-form leads match an existing company by name or email domain (`LIMIT 1`, no order), so any visitor can add a contact the client company can then read. | `0051 D4` | 0029 `create_lead_from_contact` |
| S8 | Medium | Clients can read draft and rejected deliverables and pending attachment rows (titles, file names); their Download always fails. | Open | 0010 deliverables SELECT policy; [03 §5](03-screens.md) |
| S9 | Medium | Deleting a deliverable sets `project_approvals.deliverable_id` to null, and the 0041 policy then shows those approvals, notes included, to clients. | Open | 0010 FK `on delete set null`; 0041 approvals policy |
| S10 | Medium | Clients read every legacy CRM task and every contact for their company, including internal sales tasks. | Decision | 0008 "Clients can view company tasks/contacts" |
| S11 | Medium | A thread attachment becomes a shared project file the moment it is picked, before Send; if the message is abandoned it is never cleaned up. | Decision | `components/crm/useProjectThread.js#handleFileChange`; 0048 cleanup covers `pending` only |
| S12 | Medium | No screen can create an internal record. Messages, notes, files and automatic status notes are all client-visible. | Decision | [03 §4](03-screens.md) |
| S13 | Medium | Fail-open controls: auth rate limits are off without Upstash; the must-set-password gate passes on an RPC error; sign-in and password update have no app rate limit. | Open | `lib/rateLimit.mjs`, `middleware.js` |
| S14 | Low | Sign-up reveals "already registered"; a portal-mismatch redirect confirms a valid password. | Decision | `lib/auth-errors.js`, `app/auth/actions.js#signIn` |
| S15 | Low | Server actions may stay callable while `NEXT_PUBLIC_CRM_ENABLED=false`; 4 exported project actions have no caller. | Unverified | [02](02-entry-points.md) |
| S16 | Low | Free-text `company.website` and `contact.linkedin_url` render as `href`. | Unverified (`javascript:` handling in React 19) | `app/admin/companies/[id]/page.jsx` |
| S17 | Low | Several RPCs raise "not found" before checking access, revealing whether an id exists. | Accepted (uuids) | [01b §2](01b-database-logic.md) |
| S18 | Medium | `seo-publish-blog.yml` `workflow_dispatch` can run a branch's script with the service-role key and no environment protection; on push to `main` it overwrites admin edits to draft rows. | Owner | [07 §4](07-external-services.md) |
| S19 | Medium | Sentry: replay on 10% of all sessions (CRM included) with no scrubber; URLs carry emails; `environment` reads `production` on previews. | Decision | [07 §2](07-external-services.md) |
| S20 | Medium | Trustpilot, hCaptcha, Sentry Replay and Upstash load or receive data without consent and are not named in the banner or `/privacy`. | Decision | [07 §2, §6](07-external-services.md) |
| S21 | Low | Rate-limit keys at Upstash hold email and IP in plaintext. | Decision (hash or disclose) | `lib/rateLimit.mjs` |
| S22 | Low | CSP allows `unsafe-inline`/`unsafe-eval` and `img-src https:`, with no reporting endpoint. | Accepted (known) | `next.config.js` |
| S23 | High (latent) | Approving a staff request on the admin's own profile demoted the only admin. | `0051 D7` | 0014 `admin_resolve_staff_request` |

## Accounts and identity

| Id | Sev | Finding | Status | Detail |
| --- | --- | --- | --- | --- |
| A1 | High | Onboarding fails with 23505 for anyone whose email is already a contact (for example a contact-form lead). It shares an errcode with "already linked", so the app can't tell them apart. Open PR #233 instead links the account to the existing contact's company, which together with S7 could give a stranger a client's company. | `0051 D6` | 0046 `onboard_client_company`; [05 §2](05-lifecycles.md) |
| A2 | Medium | No way exists to add a teammate to an existing client company. `profiles.company_id` has no FK, so deleting a company strands its clients, who also can't re-onboard. | Decision | [01 §3](01-data-dictionary.md) |
| A3 | Medium | Any account with activity cannot be deleted: 11 NO ACTION FKs point at profiles. This is an offboarding and right-to-erasure gap. | Decision | [01 §3](01-data-dictionary.md) |
| A4 | Medium | Role changes leave assignments, `company_id` and `requested_staff_access` behind, and are never audited. | Open (notifications part fixed by D2) | 0008 `admin_set_user_role` |
| A5 | Medium | Auth writes are not atomic: `signUp` creates the user before the email is sent; `inviteUser` swallows compensating deletes and leaks raw provider errors. | Open | `app/auth/actions.js#signUp`, `app/admin/users/actions.js#inviteUser` |
| A6 | Medium | Lead capture finds the admin by the pinned email in `auth.users`. If that account is missing or renamed, every contact-form lead fails with P0002. | Open | 0029 `create_lead_from_contact` |
| A7 | Low | `is_staff()` is not executable by `authenticated`, so any future policy that calls it breaks every read (the 0027 → 0040 outage pattern). | Open | 0008 grants |
| A8 | Medium | Hosted Auth settings (email confirmation, password rules, `SITE_URL`, redirect allow-list) are unverified from the repo; local defaults are weak. | Owner | `supabase/config.toml` |

## Leads and email

| Id | Sev | Finding | Status | Detail |
| --- | --- | --- | --- | --- |
| L1 | Medium | `/api/contact` commits the lead before delivery is known: the visitor can get a 502 after the lead exists, retries add notes and emails, and the admin is notified twice (direct ops email plus outbox `lead.created`). | Decision | `app/api/contact/route.js#POST`; [05 §1](05-lifecycles.md) |
| L2 | Medium | Acknowledgement emails go to visitor-supplied addresses through the same Resend account that sends auth links (see the AUP note in CLAUDE.md). | Decision | `app/api/contact/route.js` |
| L3 | Low | Concurrent leads can create duplicate companies (the lock is per email only), and NULL-stage deals escape the dedupe. | Open | 0029 `create_lead_from_contact` |

## Notifications and scheduling

| Id | Sev | Finding | Status | Detail |
| --- | --- | --- | --- | --- |
| N1 | High | Email rows that reach 25 lease expiries stay `pending` forever with no sweeper. 4 live rows have been stuck since 2026-08-26. | Owner (decision on live rows); sweeper Open | 0033 claim filter, 0045; [05 §8](05-lifecycles.md) |
| N2 | Medium | Delivery is at-least-once: a send that outlives the 300 s lease, or a crash before mark, sends twice. A transient recipient-lookup failure is a terminal loss. | Open | `app/api/cron/crm-notifications/route.js` |
| N3 | Medium | `in_app` and `realtime` outbox rows never leave `pending`; the table has no retention, so personal data in payloads stays forever. `enqueue` accepts any event type and a null recipient. | Open | 0046 `enqueue_project_notification` |
| N4 | Medium | Staff in-app notifications are written but never shown on any screen. | Open | [05 §8](05-lifecycles.md) |
| N5 | Medium | The pg_cron job hard-codes the production URL, so any fresh, local or branch database that applies the chain posts to production every 5 minutes. | Open | 0042 `drain-crm-outbox` |
| N6 | Medium | Two scheduler secrets: Vercel Cron sends `CRON_SECRET`, pg_cron sends Vault `crm_cron_secret`. They are synced by hand, and the pg_net timeout is 8 s. | Owner | [07 §1](07-external-services.md) |
| N7 | Low | Repeating an assignment, a message edit or a publish re-sends notifications every time. | Open | [05 §6, §9](05-lifecycles.md) |
| N8 | Low | `create_project` and `create_project_approval` notify nobody. | Decision | 0031, 0010 |
| N9 | Low | Attachment cleanup runs before the email-config check, so it still runs when the drain returns 503. | Accepted (independent work) | `app/api/cron/crm-notifications/route.js#cleanupStaleAttachments` |
| N10 | Low | Three email templates have no SQL producer; an approval UPDATE broadcasts the shared event twice. | Open | [01b §5](01b-database-logic.md) |

## Project delivery

| Id | Sev | Finding | Status | Detail |
| --- | --- | --- | --- | --- |
| P1 | High | The collaboration loop is incomplete. No screen creates approvals or updates a task after creation. The client cannot decide an approval, though they are emailed "Your approval is needed". Project, deliverable and approval statuses are not linked. | Decision | [05 §6](05-lifecycles.md), [03 §4](03-screens.md) |
| P2 | Medium | Deleting a project wipes its briefs and outbox history; its storage objects are orphaned. | Open | [01 §3](01-data-dictionary.md) |
| P3 | Medium | Publishing a deliverable has no storage-object check, re-notifies on every call, and only the creator may do it. | Open | 0047 `publish_project_deliverable` |
| P4 | Medium | Upload size and MIME are never checked against the object, and the bucket has no limits. | Open | [01b §4](01b-database-logic.md) |
| P5 | Medium | Some orphans are never cleaned: ready-but-unposted attachments, draft deliverables, and objects whose rows a cascade removed. | Open | 0048 |
| P6 | Medium | `setLeadProjectManager` runs three RPCs and queues the email before the later steps can fail; a failed removal leaves the old lead in place. | Open | `app/actions/assignment-actions.js#setLeadProjectManager` |
| P7 | Low | `createProject` sends no idempotency key, and nothing sets `projects.source_deal_id`, so the deal-to-project link is dead. | Open | [01 §2](01-data-dictionary.md) |
| P8 | Low | Retrying a successful attachment finalize raises 42501. | Open | 0009 finalize |
| P9 | Low | Two PM scoping models: deal owner (legacy tables) versus project assignment (projects). | Decision | 0008, 0009 |
| P10 | Low | A task's assignee and due date cannot be cleared (null means "no change"). | Open (`completed_at` fixed by D3) | 0012 `update_project_task` |
| P11 | Low | Briefs can be added to delivered projects. | Decision | [03 §9](03-screens.md) |
| P12 | Low | Service-role flows write no audit, `company_id` is missing on some events, and nothing reads `audit_events`. | Open | [01 §2](01-data-dictionary.md) |
| P13 | Low | Dead or duplicated fields: `deals.project_status`; three category vocabularies; blog `category`, `tags` and `author_name` unused. | Open | [01 §2](01-data-dictionary.md) |
| P14 | Low | Constraint gaps: currency may be `''`, probability is unbounded, `deals.stage` has no check. | Open | 0001, 0011 |
| P15 | Low | `project_manager_names` and the lead card can name different people. | Open | [01b §2](01b-database-logic.md) |

## CRM screens

| Id | Sev | Finding | Status | Detail |
| --- | --- | --- | --- | --- |
| U1 | High | The admin deal page's conversation always failed with "Unable to authorize project access." | `Fixed F1` (965461e) | `app/admin/deals/[id]/page.jsx` |
| U2 | Medium | New CRM tasks were written as `open`, a status the select doesn't offer; `done` tasks still showed as overdue. | `Fixed F2` | `components/crm/taskUtils.mjs` |
| U3 | Low | Date-only due dates showed the previous day west of UTC. | `Fixed F3` | `components/crm/ProjectTasks.jsx` |
| U4 | Medium | A failed action replaced the whole project workspace; a double click sent a second transition; Cancelled had no confirmation. | `Fixed F4` | team and admin project pages |
| U5 | Medium | A failed or pending staged attachment silently blocked Send and could not be removed. | `Fixed F5` | `components/crm/useProjectThread.js` |
| U6 | Medium | Admin counts showed a false 0 on error; a transient role-read error redirected a real admin. | `Fixed F6` | `lib/useUserRole.js#ROLE_LOAD_ERROR` |
| U7 | Low | A second submit of the new-post form could duplicate the post. | `Fixed F7` | `app/actions/blog-actions.js` |
| U8 | Low | Resend-confirmation and mark-read failures were silent. | `Fixed F8` | `app/auth/confirm/page.jsx`, `NotificationsPanel.jsx` |
| U9 | Low | Onboarding copy named the retired brand. | `Fixed F9` | `components/crm/ClientOnboardingForm.jsx` |
| U10 | Low | The project overview "back" link sent staff to the client dashboard. | `Fixed F11` | `components/crm/ProjectOverview.jsx` |
| U11 | Medium | Realtime gaps: deliverables and notes have no live event, and changes during the initial join can be missed. | Open | [03 §6](03-screens.md) |
| U12 | Medium | Unbounded selects: list pages have no pagination, and admin home loads every project to show two counts. | Open | [03 §3](03-screens.md) |
| U13 | Low | Client-side validation is weaker than the server's (briefs, message and note length, upload type). | Open | [03 §4](03-screens.md) |
| U14 | Low | Last-write-wins edits, brief autosave across two tabs, and dependent-dropdown races. | Open | [03 §8](03-screens.md) |
| U15 | Low | React 19 uncontrolled form actions may drop typed input on a server error. | Unverified | [03 §10](03-screens.md) |
| U16 | Low | Contact-linked notes show only on the contact page; deal-scoped notes have no UI. | Open | [03 §2](03-screens.md) |

## Site, telemetry and infrastructure

| Id | Sev | Finding | Status | Detail |
| --- | --- | --- | --- | --- |
| I1 | High | The GA4 measurement ID is reported to 404 in production. | Owner (unverified now) | `docs/ANALYTICS.md` |
| I2 | Medium | The production GTM container loads on previews, CI images and local production builds. | Open | `lib/analytics.mjs` |
| I3 | Medium | The publish workflow uploads to a `blog-covers` bucket that no migration creates. | Open | [07 §4](07-external-services.md) |
| I4 | Low | Duplicated values that drift: the host is defined in 5+ places, service copy is duplicated, review numbers are static, blog slugs are hard-coded, and `robots.js` lacks `/onboarding`. | Open | [07 §5](07-external-services.md) |
| I5 | Low | Identity leftovers: `/work/crystal-web-solution`, the Sentry org name, some docs. | Decision (live URL) | [07 §5](07-external-services.md) |
| I6 | Low | Docker image drift: only 3 build args, Node 26 vs 24 in CI. | Accepted | [07 §4](07-external-services.md) |
| I7 | Low | The release gate runs the PR's own script; Dependabot auto-merge is inert. | Open | [07 §4](07-external-services.md) |
| I8 | Low | Six `public/projects/cws-*.webp` files have no in-repo reference. | Owner audit before any removal | [07 §5](07-external-services.md) |
| I9 | Low | `.env.example` is missing; `docs/CRM-OPERATIONS.md` still describes the old `x-forwarded-for` rule. | Open | [07 §1](07-external-services.md) |
| I10 | Low | Local and live histories differ: `0009b`/`0014b` order, `legacy_*` tables on fresh stacks, no `0024`, PG 15 locally vs 17 live. | Accepted (known) | [01 §1](01-data-dictionary.md) |

## Homepage frame pipeline

Full table in [08 §6](08-frame-pipeline.md). Summary:

| Id | Sev | Finding | Status |
| --- | --- | --- | --- |
| R1 | High | The scroll-driven Services and Approach steps may not reach their last items. | Unverified (browser) |
| R8, R12, R19 | Low | Stale pulse burst on return, stale camera look target, touch parallax never reset. | `Fixed F12` (5e5d03b) |
| R7, R22 | Medium | Reduced motion did not stop the camera parallax or the backdrop spin. | `Fixed F13`; other reduced-motion gaps remain in R7 |
| R9 | Low | An Approach step growing the page left ScrollTrigger stale. | `Fixed F14`; other height changes rely on GSAP auto-refresh |
| R2 | Low | `motionFlight` has no production writer, so its code paths are dead. | Decision (removal needs owner approval) |
| R3, R4 | Medium | `MOTION_WINDOW` assumes a sticky stage that no longer exists; `beacon.index` has two writers. | Open |
| R5, R6 | Medium | Ticker readers lag Lenis by a frame; the R3F canvas runs its own rAF. | Decision (one-clock rule vs R3F) |
| R10 | Medium | `velocity` units and staleness. | Unverified (Lenis internals) |
| R11, R14–R18, R20, R21, R23–R28 | Low | See chapter 08. | Open |

## Documentation drift found on the way

- `aidd_docs/memory/architecture.md` says adding a beat moves four things;
  CLAUDE.md lists five (it adds `LABELS` in `lib/journeyNav.mjs`).
- CLAUDE.md says `MARKETING_STAGE_BACKGROUNDS` has four variants;
  `components/marketing/SubpageExperience.jsx` has more.
- `docs/CRM-OPERATIONS.md` lists the live ledger as ending at `0044`; it ends
  at `0045`, and `0050` is live without a ledger row.
