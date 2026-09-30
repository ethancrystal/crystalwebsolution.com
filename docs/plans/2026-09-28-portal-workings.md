# Portal Workings — Plan of Record

- **Goal owner:** Moiz
- **Surfaces:** `www.cdsportswearinc.com` (marketing site), `app.cdsportswearinc.com` (client/employee/admin portals)
- **Repo:** `ethancrystal/crystalwebsolution.com`
- **Written:** 2026-09-30

## North star

A client who is sent the portal link can start a job, see who has the ball,
and finish it without email threads.

> Win the studio on the marketing site; run the studio in the CRM.

- **Marketing** (`www`): exclusive, motion, craft.
- **Portal** (`app`): dark, flat, quiet. Navy surfaces, thin borders, one
  blue accent. No glow, no glass, no cyan titles.

## What done looks like

### For a client

- Signup → verify → onboarding → dashboard with **no dead ends**.
- Four-step tour: **start a project, fill the brief, message, upload** —
  skippable and replayable, remembered per browser.
- Dashboard priority order: **Needs your action first, then projects, then
  drafts.**
- Project workspace: status + who has the ball, team card, thread with image
  previews, files, and **Approve / Request changes**.
- **One bell.** Email is backup, not the product.

### For the studio

- Employees get a `/team` queue.
- Admin gets a control room with status buttons gated by `ALLOWED_TRANSITIONS`
  (`lib/crm/project-contract.mjs:77`).
- Outbox marks sent exactly once; **no reclaim loops**.

## Near-term sequence

| # | Item | Status today |
|---|------|--------------|
| 0 | Apply migration **0045** on live Supabase (`wmnjosiikehsuaqucvja`) — `supabase/migrations/0045_fix_outbox_mark_coalesce.sql` is in the repo but live SQL needs owner approval (`docs/CRM-OPERATIONS.md`) | **OWNER ACTION** |
| 1 | **A1.2** — fix admin status buttons to `ALLOWED_TRANSITIONS` | **IN PROGRESS** via branch `fix/admin-status-transitions` |
| 2 | **C1** — client arrival + tutorial + empty state (no SQL) | **IN PROGRESS** via branch `feat/client-arrival-tour` |
| 3 | **D1** — close the Marketing and Automation copy decision (**do not ship 0046 until closed**) | **OPEN** — owner decision |
| 4 | **C2** — briefs (migration 0046) | Queued behind D1 |
| 5 | **C3** — client Approve / Request changes (migration 0047) | Queued |
| 6 | **C4** — bell on the shared shell (**do not enqueue new events before 0045 is live**) | Queued |
| 7 | **E1** — employee `/team` queue | Queued |
| 8 | **A1** — admin control room | Queued |

## Decisions locked

- **D1** — Logo and Branding are one service. Marketing/Automation copy is
  still open (owner decision pending).
- **D2** — Tutorial memory is `localStorage` per browser.
- **D3** — No salesperson auto-assignment; admin assigns staff after the
  client starts the project.
- **D4** — Clients approve and request changes in the portal.
- **D5** — Admin may create projects.

## Anti-goals

- Another SaaS CRM.
- A second notification system.
- Shiny portal chrome.
- Enqueueing more email while mark-RPCs raise `42883`.
- Trusting `docs/STATUS.md` as current — it lags main.

## Validation

- Every product PR runs `pnpm test`, `pnpm test:components`, and
  `pnpm test:db` when SQL changes.
- Live SQL only with owner approval (`docs/CRM-OPERATIONS.md`).
- One phase per PR.
- Pause before any production migration.
