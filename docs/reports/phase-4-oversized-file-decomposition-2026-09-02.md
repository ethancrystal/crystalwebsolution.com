# Phase 4 — Oversized File Decomposition (2026-09-02)

Executed per `docs/plans/refactor-architecture-cleanup-2.md` Phase 4
(TASK-020 through TASK-025). This is the last phase of the plan.

## Verdict, per file

| file | lines | outcome |
|---|---|---|
| `app/actions/project-actions.js` | 972 | **not split** — clean seams exist, but five contract tests assert against this one file's source text and are worth more than the split (TASK-020/021) |
| `components/crm/ProjectThread.jsx` | 876 → 513 + 442 | **split** into a data hook (`useProjectThread.js`) and a presentation component, verbatim, behind a new behavioural characterization suite (TASK-022/023) |
| `lib/servicePages.mjs` | 730 | large but cohesive, no split (TASK-024) |
| `components/ui/liquid-ether-background.jsx` | 1,199 | large but cohesive, no split (TASK-024) |

## TASK-020 / TASK-021 — `project-actions.js`: seams exist, split rejected

**Structure.** 160 lines of shared helpers (form parsing, validation, the
`{ ok, data | error, requestId }` result contract, `authenticatedProfile`,
`actionClient`, `runRpc`, three `revalidate*` helpers, two row mappers)
followed by 18 exported server actions. Every action is the same shape —
auth → parse → validate → one RPC → revalidate → result — and they group
naturally by entity: projects (4), messages (2), attachments (3), tasks
(2), approvals (2), deliverables (2), notes (1), notifications (2). The
seam is real.

**Why not split anyway.** `grep -rl "project-actions" tests/` finds five
tests that read this file **as text** and assert on it:

| test | what it asserts against the file's source |
|---|---|
| `project-actions.test.mjs` | `'use server'` is the first statement; each action's exact signature; the result-contract shapes; every helper name; the constants (`MAX_*`, the MIME allowlist); every RPC name; **no direct `.from(...).insert/update/delete`**; no client-supplied `company_id`/`status`/`created_by` |
| `project-reconciliation.test.mjs` | "server actions call the actual migration RPCs only" — every RPC from the migration ledger appears in this file |
| `workspace-phase1.test.mjs` | the Phase 1 workspace RPCs appear in this file |
| `messaging-asset-hardening.test.mjs` | `createAttachmentDownloadUrl`'s table/`createSignedUrl(…, 60)` shape |
| `task-creation-priority-visibility.test.mjs` | the priority / client-visible wiring lines |

These are the CRM's security gate: *the entire server-action surface is
one file, it only talks to the database through the migration RPCs, and
it never writes tables directly.* Splitting into
`project-actions/{projects,messages,…}.js` with a re-exporting barrel
would leave the barrel's source text containing none of the RPC calls,
none of the constants and no `'use server'` body, so all five tests fail
on the first commit. Re-pointing them means either concatenating N
sub-modules in each test (which quietly turns "one allowlisted file" into
"whichever files the test happens to list") or rewriting them as
behavioural tests with a mocked Supabase client, which is a separate,
larger change. Neither is a no-behaviour-change refactor, and the split's
payoff is navigational only. Closed without extraction, as the plan
permits.

**What would unlock it later.** Convert those five tests to behavioural
ones (import the module with `@/lib/supabase/server` and
`@/lib/auth/require-role` mocked, assert the RPC each action calls).
Once the gate is behavioural, a per-entity split is mechanical.

## TASK-022 — `ProjectThread.jsx`: characterization before moving anything

Every existing test on this component was a regex over its source
(`project-thread-stable-callback-deps`, `client-workspace`, and 15
assertions in `messaging-asset-hardening`). None exercised the two flows
`STATUS.md` records as having regressed past every automated gate.

`tests/crm/project-thread-behaviour.test.jsx` renders the component under
vitest/jsdom against a scripted Supabase client (channels record their
name, registered events and subscription; `removeChannel` is recorded;
`listProjectMessages` and the five server actions are mocked) and pins:

- **Realtime lifecycle (6 tests)** — staff subscribe to
  `project:<id>:shared` and `:internal`, clients to `shared` only, once
  `threadId` is known; both broadcast events are registered; a payload
  matching this project and the channel's visibility reloads through
  `listProjectMessages` with the same viewer, `cursor: null`, `limit: 20`,
  while a mismatched `project_id` or `visibility` is ignored; a *new
  profile object* with the same `id`/`role`/`company_id` does not remove
  or re-open channels or reload (the `STATUS.md` fix #2 regression);
  switching `projectId` removes the old channels, clears the composer
  draft, opens channels named for the new project, and a load for the old
  project that resolves *after* the switch never reaches the UI (the
  `projectGenerationRef` guard); unmount removes every channel.
- **Inline edit (4 tests)** — only messages whose `sender_id` matches the
  signed-in user get an Edit control (and the `is-own` class); Edit
  prefills the editor; Save is disabled on blank input; Cancel restores;
  a successful save posts `{ projectId, messageId, body: <trimmed> }`,
  closes the editor and reloads (the `· edited` marker then renders); a
  failed save shows the action's error text and keeps the editor open
  with the draft.
- **Send idempotency (1 test)** — a failed post keeps the draft and shows
  the retry message; the retry carries the **same** `clientGeneratedId`;
  a successful post clears the draft and the next message gets a fresh
  id.

11/11 against the unmodified component (commit `99b42fb`).

## TASK-023 — the split

`components/crm/useProjectThread.js` (442 lines) now owns all 14 state
values, the five refs, `load`, the four effects and the eight handlers;
`components/crm/ProjectThread.jsx` (513 lines) keeps the two formatting
helpers, the JSX and the styled-jsx block and renders from the hook's
return value.

Evidence it is a move and not a rewrite:
- The hook body is the old component body (lines 34–419) verbatim —
  `diff` clean.
- The JSX and `<style jsx>` block are byte-identical to the original from
  `if (isLoading)` to the end — `diff` clean.
- The characterization suite passes unchanged after the split, 11/11.
- `pnpm test` 452/452 with the three source-grep tests re-pointed in the
  same commit (`messaging-asset-hardening` reads component + hook for its
  thread assertions; `project-thread-stable-callback-deps` reads the hook,
  where `load` now lives; `client-workspace` checks both halves).
- `pnpm build` clean, 57/57 routes, shared First Load JS unchanged at
  227 kB.

Not done here, as with every phase: a live two-session Realtime check on
the preview deployment (post from one role, watch it arrive for the other)
— `TEST-005` in the plan. The behavioural suite covers the subscription
wiring deterministically, but the plan is explicit that this flow gets a
manual pass before merge.

## TASK-024 — triage

- `lib/servicePages.mjs` (730 lines) is a single `CONTENT` object holding
  the eight service pages' copy plus two slug maps. One concern, data not
  code. No split.
- `components/ui/liquid-ether-background.jsx` (1,199 lines) is one
  self-contained WebGL fluid simulation: the shaders, the simulation
  classes and the React wrapper, imported from exactly one place
  (`dark-page-background.jsx`). Exactly the "large R3F/canvas component"
  the plan anticipated. No split.

## Observations recorded, not acted on

- `formatBytes` / `formatWhen` are duplicated across `ProjectThread.jsx`,
  `ProjectFiles.jsx` and `NotesPanel.jsx`. Small, safe dedupe candidate
  for a follow-up; left alone here to keep this phase to file structure.
- `STATUS.md`'s cross-cutting item 2 ("hardcoded `['low','medium','high']`
  arrays should adopt `TASK_PRIORITIES`… server-actions file deferred due
  to a sibling test asserting the literal") is the same source-text-test
  constraint that decided TASK-020. Converting those tests to behavioural
  ones would unblock both.

## TASK-025 — versioning

`VERSION` → `v1.23`, `CHANGELOG.md` entry added; sequenced after the open
PRs #166–#168 (v1.18–v1.20), #162 (v1.21) and #163 (v1.22). Whichever
merges later renumbers at merge time per `VERSIONING.md`.
