# Data map: plan

Owner request (2026-09-30): map every data point in the site and CRM, covering
where each value originates, what writes it, what reads it, where it goes next
(posted, queued or in transit), and every edge case. Fix the bugs the map finds.
Scope first, then plan, then implement with Sonnet 5.5.

## Decisions

| Question | Answer |
| --- | --- |
| Deliverable | Map plus fixes for the bugs it finds, on branch `claude/funny-bardeen-i83gco` |
| Format | Markdown chapters, JSON manifest, drift test in `pnpm test` |
| Animation pipeline | Included, as its own chapter |
| Who implements | Sonnet 5.5 subagents, one per chapter or fix group; Opus reviews before commit |
| When to stop and ask | Owner said "continue implementation and then commit". Product decisions and owner-only actions are recorded in the register, not guessed. |

## Phase 1: scope (done 2026-09-30)

Six read-only inventories, written against `95f02c8`: database schema,
database logic and RLS, server entry points, UI data access, environment and
telemetry, and the per-frame pipeline. They hold about 120 findings. `main` then
moved to `1c17666`, which added migrations `0049` and `0050` (realtime project
broadcasts and presence) and reworked the client dashboard, so every chapter
re-verifies against the current code.

## Phase 2: the map

| File | Content | Built by |
| --- | --- | --- |
| `README.md` | How to read the map, legend, index | Opus |
| `SCHEMA.md` | Manifest format, node and edge kinds, ownership | Opus |
| `01-data-dictionary.md` + `data/db.json` | Every table and column: type, constraints, writers, readers. FKs and what a delete reaches. Triggers. ER diagram. | Sonnet |
| `01b-database-logic.md` + `data/db-logic.json` | Every SQL function and RPC: security, grants, reads, writes, side effects, errors raised. RLS matrix, storage, realtime, pg_cron, pg_net, Vault. | Sonnet |
| `02-entry-points.md` + `data/server.json` | Every server action, route handler and middleware branch: inputs, validation, auth gate, client used, writes, side effects, outputs, failure paths | Sonnet |
| `03-screens.md` + `data/ui.json` | Every CRM screen: what it loads, what it writes, realtime, storage, optimistic state, URL-carried data | Sonnet |
| `04-externalities.md` | Generated from the manifest: for each input, every data point it ends up touching, and for each table, every input that reaches it | `scripts/data-map.mjs` |
| `05-lifecycles.md` | State machines: project, brief, deliverable, approval, task, attachment upload, outbox, staff request, onboarding, lead | Sonnet |
| `06-edge-cases.md` | Every finding: severity, evidence, status (fixed here, migration awaiting owner, owner action, decision needed, accepted) | Opus |
| `07-external-services.md` + `data/external.json` | Env vars, Resend, hCaptcha, Upstash, Sentry, GA4/GTM, Trustpilot, cron, CI workflows, scripts, cookies and storage, static content sources | Sonnet |
| `08-frame-pipeline.md` + `data/frame.json` | Scroll, pointer and media inputs, lib singletons, WebGL actors, lifecycle | Sonnet |
| `scripts/data-map.mjs`, `tests/data-map.test.mjs` | Merge, validate, render; drift test in `pnpm test` | Sonnet |

## Phase 3: fixes on this branch

Chosen because each is a confirmed defect with a contained fix that does not
change the site's look. Anything that needs a product call stays in the
register.

### App code

| Id | Fix |
| --- | --- |
| F1 | Admin deal page conversation always errors: `ProjectThread` gets `role` instead of `profile` |
| F2 | CRM task form writes status `open`, which the status list does not offer; tasks marked `done` still show as overdue |
| F3 | Project task due dates show the previous day west of UTC |
| F4 | A failed status change or task action on a team or admin project page replaces the whole workspace with an error screen; transition buttons have no pending state; Cancelled (terminal) has no confirmation |
| F5 | A failed or pending thread attachment silently blocks Send, hides the reason, and cannot be removed |
| F6 | Admin home counts show 0 when a query fails; a profile read error is treated as "no role" and redirects a real admin |
| F7 | Submitting the new-post form twice creates a duplicate post |
| F8 | Resend-confirmation and mark-read failures are silent |
| F9 | Client onboarding copy names "Crystal Web Solution" (CLAUDE.md identity rule) |
| F10 | Auth and invite links built from `NEXT_PUBLIC_APP_URL` with no guard: unset gives `undefined/auth/verify…`, and a retired domain would send sign-in tokens to a third party. Fail closed. |
| F11 | Project overview "Back to dashboard" sends staff to the client-only `/dashboard` |
| F12 | Homepage: crystal bursts on return from a subpage (stale `pulse`), camera look target survives unmount, touch parallax never resets |
| F13 | Reduced motion: camera pointer parallax and the backdrop morph still animate |
| F14 | Opening an Approach step grows the page without refreshing ScrollTrigger, so the focus veil drifts from the camera beats |

### Database: migration `0051` (merging does not apply it)

Merging into `main` deploys the app, not the database. The owner applies
`0051` to the live project after review, as with every migration
(`docs/CRM-OPERATIONS.md`).

| Id | Fix |
| --- | --- |
| D1 | Approval decisions notify clients about internal deliverables, and carry the old note instead of the decision |
| D2 | Removed or demoted staff keep receiving internal message excerpts; company fan-out ignores role |
| D3 | Clients can edit staff-only tasks and assign any profile; `completed_at` is never maintained |
| D4 | Contact-form leads can attach to an existing client company and become readable by that client |
| D6 | Onboarding fails with a duplicate-email error for anyone who used the contact form first. Open PR #233 also targets this, but it reuses migration number `0044` and links the new account to the old contact's company, which with D4 can hand a stranger a client's company. `0051` instead never joins an existing company by email. |
| D7 | Approving the pinned admin's own staff request demotes the only admin |

## Phase 4: verify and commit

1. `pnpm test`, `pnpm test:components`, CI-equivalent `pnpm build`, then `git checkout -- tsconfig.json`.
2. `pnpm test:db` against a local Supabase stack, if the images can be pulled here; otherwise say so.
3. Browser check of the changed CRM screens and the homepage.
4. Commit in reviewable pieces and push to `claude/funny-bardeen-i83gco`. No PR until the owner asks; a PR to `main` needs the `vX.NN` bump at that point.
