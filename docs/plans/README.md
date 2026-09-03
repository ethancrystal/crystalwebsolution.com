# Plans index

One row per plan file in this directory. **Status here is the source of
truth for "is this done?"** — update this table in the same PR that
changes a plan's state. Results of finished work live in three places, in
this order of authority:

1. `CHANGELOG.md` — what actually shipped, per production version.
2. `docs/reports/` — the evidence a phase produced (measurements, audit
   findings, what was deliberately not done and why).
3. `STATUS.md` — CRM implementation history and the open-decision ledger.

A plan's own task table is a *worklog*, not proof. If a table row says ✅
but `CHANGELOG.md` has no matching entry, trust the changelog and fix the
plan.

## Agent protocol (read before acting on any plan)

Every plan in this folder was written from a code read at a point in time,
and several were later found to contain claims that did not survive a real
review (the 2026-09-02 audits alone had five: see
`audit-followups-crm-hardening-3.md` §0). So:

- **Re-verify each cited `file:line` in the current checkout before
  editing.** Line numbers drift; premises drift. If the code no longer
  matches the plan's description, stop and record the discrepancy in the
  plan before continuing.
- **Grep `tests/` for every symbol you touch.** `tests/crm/*.test.mjs` are
  regex-over-source contract tests; a rename that "obviously" preserves
  behaviour still fails them. Update the test in the same commit.
- **Confirm the live boundary where the plan touches Supabase.** RLS,
  grants, and the migration ledger are verified against the database
  (read-only), not inferred from SQL files — `docs/CRM-OPERATIONS.md`.
- **Check for concurrent work.** `git pull --ff-only origin main` and
  `gh pr list` before branching; this repo has a documented history of two
  sessions editing the same files (STATUS.md).
- **Close the loop.** When a plan finishes, set its frontmatter `status`,
  update this table, and say where the evidence lives.

## Status table

| Plan | Status | Closed by / evidence |
|---|---|---|
| [`audit-followups-crm-hardening-3.md`](audit-followups-crm-hardening-3.md) | **In progress** (2026-09-03) | PR 1 docs → v1.27; PR 2 frontend → v1.28; PR 3 migration 0041 → v1.29 |
| [`refactor-architecture-cleanup-2.md`](refactor-architecture-cleanup-2.md) | **Complete** | v1.17–v1.23 (PRs #165–#169); reports `docs/reports/phase-{1,3,4}-*.md`. Open items carried to plan 3 |
| [`refactor-architecture-cleanup-1.md`](refactor-architecture-cleanup-1.md) | **Complete** | Phases 0–3: PR #133, #136, v1.09. Phases 4–5 re-scoped into plan v2 and shipped as v1.18/v1.19 |
| [`feature-crm-lead-capture-and-drain-1.md`](feature-crm-lead-capture-and-drain-1.md) | In progress | Migrations 0025–0029, 0033; `app/api/cron/crm-notifications` |
| [`feature-crm-remaining-work-2.md`](feature-crm-remaining-work-2.md) | Planned | Superseded in part by `2026-08-09-crm-remaining-decisions.md` — re-verify each row before starting |
| [`feature-crm-website-completion-1.md`](feature-crm-website-completion-1.md) | In progress | CRM launched in production 2026-08-27 (`CLAUDE.md`); inner-page parity tracked in `docs/PIXEL-POLISH-PLAN.md` |
| [`crm-messaging-asset-hardening-v2.md`](crm-messaging-asset-hardening-v2.md) | Complete | Implemented via `2026-08-16-messaging-asset-hardening-implementation.md`; reports `docs/reports/gate-c-*.md` |
| [`2026-08-16-messaging-asset-hardening-implementation.md`](2026-08-16-messaging-asset-hardening-implementation.md) | Complete | Migrations 0030–0032; `tests/crm/messaging-asset-hardening.test.mjs` |
| [`2026-08-16-portfolio-case-study-transition.md`](2026-08-16-portfolio-case-study-transition.md) | Complete | `components/marketing/CaseNavRail.jsx`, `/work/[slug]` |
| [`2026-08-14-crm-docs-alignment.md`](2026-08-14-crm-docs-alignment.md) | Complete | `CLAUDE.md` / `AGENTS.md` / `GEMINI.md` aligned; spec `docs/superpowers/specs/2026-08-14-crm-docs-alignment-design.md` |
| [`2026-08-10-code-review-fixes.md`](2026-08-10-code-review-fixes.md) | Complete | Migration 0023; STATUS.md 2026-08-10 session table |
| [`2026-08-09-crm-remaining-decisions.md`](2026-08-09-crm-remaining-decisions.md) | Complete | Migrations 0019–0022; STATUS.md 2026-08-13 audit |
| [`2026-08-08-inner-pages-entrance-reveals.md`](2026-08-08-inner-pages-entrance-reveals.md) | Complete | `SectionReveal` on all inner pages |
| [`2026-08-06-marketing-inner-pages-enhancement-plan.md`](2026-08-06-marketing-inner-pages-enhancement-plan.md) | Complete | `components/marketing/*`; v1.15 content pass |
| [`2026-07-30-crm-three-role-project-platform.md`](2026-07-30-crm-three-role-project-platform.md) | Complete | Migrations 0004–0011; `/login/{client,team,admin}` |
| [`2026-07-30-production-multi-user-crm.md`](2026-07-30-production-multi-user-crm.md) | Complete | Superseded by the three-role plan above; kept for history |
| [`frontend-enhancement-v2.md`](frontend-enhancement-v2.md) | Reference / proposed | Never approved as written; homepage direction moved to `homepage-overhaul-spec.md` and `docs/PIXEL-POLISH-PLAN.md`. Note: it lists `data-cursor` labels as a reusable motion primitive — they were removed in v1.28 |
| [`homepage-overhaul-spec.md`](homepage-overhaul-spec.md) | Reference | Spec, not a task plan; see `docs/HOMEPAGE-OVERHAUL-REUSE-INVENTORY.md` |
| [`audits/`](audits/) | Reference | Point-in-time CRM audits (auth/RBAC, client workspace, operations data). Re-verify before citing |

Statuses of rows marked Complete without a linked report were inferred
from `CHANGELOG.md` and the current codebase on 2026-09-03; if you find one
that is wrong, fix the row and say so in your PR.

## Other planning documents outside this folder

- `docs/PIXEL-POLISH-PLAN.md` — phased animation/layout coherence work.
- `docs/CRM-MASTER-PLAN.md`, `docs/CRM-END-TO-END-PLAN.md` — CRM
  architecture and release-blocker ledgers.
- `docs/MIGRATION-PLAN.md`, `docs/CRM-GATE1-MIGRATION-RECONCILIATION.md`,
  `docs/reports/migration-ledger-reconciliation-2026-08-27.md` — how the
  checked-in migration chain relates to the live ledger.
- `docs/superpowers/specs/` — design specs that the dated plans above
  implement.
- `TRIONN-ADAPTATION.md`, `TRIONN-SCREENSHOT-ANNOTATIONS.md` — design
  research only; nothing in them is built.
