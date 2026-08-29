# MEMORY.md — CD Sportswear USA, consolidated agent knowledge

Read this before `AGENTS.md`/`CLAUDE.md`. Those are living *instructions*;
this is consolidated *memory* — history, gotchas, current state — pulled
from every agent that's worked this repo (Codex, Claude Code, Hermes SEO
data), current as of **2026-08-16**. Goal: a new agent session gets the
full picture in one read instead of re-discovering it the expensive way.

## TL;DR

- **Two halves:** (1) a cinematic one-page WebGL/scroll marketing site, (2)
  a Supabase-backed 3-role CRM (`client`/`project_manager`/`admin`) at
  `/dashboard`, `/team`, `/admin`. Next.js 15 App Router, React 19, plain
  JSX (no TS), no Tailwind, pnpm only.
- **One canonical checkout:** `C:\Users\moizjmj\CD Sportswear USA`
  (mirrored 1:1 in WSL at `/home/moizjmj/CD Sportswear USA` — same repo,
  same commit). All other historical copies were duplicates and are gone
  as of 2026-08-16 (§2).
- **`main` = production**, auto-deploys via Vercel on merge. `preview`/
  `production` branches are dead weight. CRM is gated by an env var
  (`NEXT_PUBLIC_CRM_ENABLED`), not a branch. **Never `vercel --prod`.**
- **Tests don't touch a real database.** `pnpm test` green ≠ working RPC.
  Verify DB/RPC-shaped changes live (Supabase MCP or a real browser
  session) before calling anything done — this exact gap has shipped
  multiple silent production bugs (§6).
- **One RAF clock, state lives outside React** for anything per-frame
  (`lib/scrollState.js` etc.) — see §3 before touching scroll/animation.
- Full history/detail below; `STATUS.md` at repo root is the exhaustive
  chronological log this file distills.

---

## 1. What this app is

1. **The Agency Experience** — fixed WebGL stage (`components/Scene.jsx`);
   DOM scrolls over it while a camera flies past a refracting crystal,
   service instruments, an approach compass, particles, a morphing
   backdrop. Beats in order: Hero, About, Services, Approach, Stories,
   Mark, Lab, Motion, Contact.
2. **The Client Collaboration CRM** — briefs, tasks, approvals,
   deliverables, a per-project message thread with email notifications.

**Stack:** Next.js 15 App Router · React 19 · plain JSX (no TypeScript) ·
R3F + drei · `@react-three/postprocessing` · GSAP + ScrollTrigger · Lenis ·
SplitType · Supabase (Auth/Postgres/Storage/RLS) · plain global CSS, tokens
in `app/globals.css` (no Tailwind) · **pnpm only**.

**Commands:** `pnpm dev` · `pnpm test` (full suite) · `pnpm test:crm` ·
`pnpm test:db` (needs local Supabase/Docker) · `pnpm build` · `pnpm start`.
No lint script — don't add one.

---

## 2. Checkout identity

**As of 2026-08-16, there is exactly one lineage, in two synced places:**

| Location | Status |
| --- | --- |
| `C:\Users\moizjmj\CD Sportswear USA` | **Canonical.** `main` = production. |
| `/home/moizjmj/CD Sportswear USA` (WSL) | Fresh clone of the same repo, same commit. Kept in sync deliberately (2026-08-16) — verify parity (`git rev-parse HEAD` both sides) before trusting either is still current. |

Everything else that used to exist on this machine — `Crystal` (singular),
`CD Sportswear USAs` (plural), an old WSL copy pointed at a *different*
GitHub repo (`Crystal-Web-Solution`, no `.com`, with stale/deprecated CRM
code), an OneDrive clone, throwaway isolated task clones under
`Documents\Codex\` — **was deleted 2026-08-16** after confirming none of
them had commits or features ahead of canonical. If a memory note
elsewhere references one of those paths, treat it as historical only.

**Rule of thumb:** before trusting any path-specific claim (branch state,
dirty worktree, "is X merged"), re-verify against the actual checkout
you're in — don't take an old note's word for it.

---

## 3. Architecture essentials

Full detail in `AGENTS.md`/`CLAUDE.md`. Load-bearing rules:

| Rule | Why |
| --- | --- |
| One RAF clock: `components/SmoothScroll.jsx`'s Lenis instance, driven by `gsap.ticker` | Never start a second rAF/ScrollTrigger loop |
| Per-frame state lives in module-level singletons (`lib/scrollState.js`, `lib/pulse.js`, `lib/motionScale.js`, `lib/motionFlight.mjs`), not React state | DOM writes, R3F `useFrame` reads — avoids re-render storms |
| No allocation inside `useFrame`; pre-allocate `THREE.Vector3`/etc. outside the component | Perf |
| Damping = `1 - Math.exp(-dt * k)` | Frame-rate independent, not fixed lerp |
| `next.config.js` has `reactStrictMode: false` — intentional | Avoids double-created WebGL context in dev |
| Camera journey is data: `lib/journey.js` (`STOPS`/`CLUSTERS`) + `lib/beatProgress.js` (measures real DOM heights via `ResizeObserver`) | Beats vary hugely in scroll length — not a uniform split |
| Sections talk to 3D only via the singletons above / ScrollTrigger, never props/context across the DOM↔canvas boundary | Keeps the boundary clean |
| Marketing visuals are procedural (canvas/SVG/Three.js), no decorative binary media | Convention; `public/` brand assets are the intentional exception |

When adding/reordering a scroll section: `STOPS`/`CLUSTERS`, `BEAT_IDS`,
the section's DOM `id`, and its 3D actor in `Scene.jsx` all move together.

**Not yet built:** `TRIONN-ADAPTATION.md` / `TRIONN-SCREENSHOT-ANNOTATIONS.md`
are design references for future components (`ServiceRock.jsx`, pinned
Showcase/Motion sliders) — never copy Trionn's actual content, and don't
assume these exist yet.

---

## 4. Deployment model (resolved 2026-08-15)

- **`main` = production.** Merge = deploy. Auto-deploys via Vercel's Git
  integration to `crystalwebsolution.com`.
- **`preview`/`production` git branches are dead** — historical two-branch
  model Vercel's config never actually matched. Don't build on them.
- **CRM visibility = `NEXT_PUBLIC_CRM_ENABLED` env var** (`lib/crmFlag.js`),
  currently `false` in Production. Since `NEXT_PUBLIC_*` is inlined at
  build time, flipping it needs a redeploy of `main` to take effect.
- **Never `vercel --prod`/`vercel deploy --prod`** — bypasses PR review,
  deploys regardless of checked-out branch. Ship only via reviewed merge.
- Manual Vercel CLI deploy hanging on "Building…"? Don't trust the wait —
  it's usually already succeeded server-side. Check `vercel ls` instead.
- **Vercel dashboard settings are the owner's to change** — investigate/
  report via API freely, but describe the change and let them click it.
- Once (2026-08-09) production silently served a build **two weeks
  stale** — a Hobby-plan-incompatible cron in `main`'s `vercel.json` was
  failing every deploy, and two required env vars didn't exist at all.
  Lesson: verify the live site is running the commit you think it is
  (`vercel ls`), don't just trust "the push succeeded."

---

## 5. CRM data model & current state

Two data-access shapes coexist **deliberately** — don't collapse them:

- **Project delivery** (newer, contract-tested): `lib/crm/projects.js` +
  `lib/crm/project-contract.mjs` for reads; `'use server'` actions in
  `app/actions/project-actions.js` for writes. Powers `/dashboard`,
  `/team/projects/[id]`, `/admin/projects`. Extend *this* path for new
  delivery work; keep `tests/crm/` in step.
- **Companies/contacts/deals/tasks/users**: client components query
  Supabase directly via `lib/supabase/browser.js`, scoped by RLS. The old
  per-table `lib/crm/companies.js`/`contacts.js`/`deals.js` modules were
  *deliberately* removed (`aa50610`) — don't re-add them.

**Roles are database-enforced, never client-chosen.** New accounts default
to `client`; `admin_resolve_staff_request()` is the only path to
`project_manager`; `admin` is pinned to one real email by a DB trigger
(migration `0014`) and unreachable from any UI.

**Migrations:** canonical through `0023` (as of 2026-08-15 — re-check
`list_migrations` via Supabase MCP, PR #69 was adding `0024`). `0007` is
deliberately *not* applied live (superseded by `0008`). Project ref:
`wmnjosiikehsuaqucvja`.

**Shipped & live-verified (2026-08-13):** full CRM CRUD, Deals Kanban,
per-entity notes, client dashboard with brief submission + status
timeline + assigned PM, real-time per-project message thread (post/edit +
email), task priority/client-visible flags, client-visible budget. Auth,
RLS, and the notification→outbox→Resend pipeline confirmed live end-to-end.

**⚠️ Test suite ceiling:** `tests/crm/*.test.mjs` are regex-over-source
contract checks — **nothing in this repo's test suite executes against a
real database.** Green tests are necessary, not sufficient (see §6 for
what this has already let slip through). Verify DB/RPC changes live.

---

## 6. Gotchas already found once — don't reintroduce these

| Bug | Rule going forward |
| --- | --- |
| `redirect()` throws a `NEXT_REDIRECT` digest internally; a try/catch around a server action that doesn't check `err?.digest?.startsWith('NEXT_REDIRECT')` swallows every successful login/signup/reset | Any new server action + try/catch must special-case this |
| `pg_catalog.coalesce(...)`/`pg_catalog.nullif(...)` is invalid SQL (they're special forms, not qualifiable functions) — shipped in `post_project_message`, meant **no message was ever postable live** until `0016` | Never schema-qualify `coalesce`/`nullif` |
| `audit_events_event_type_check` CHECK constraint gap — happened **twice** (0010, then 0015): a migration adds a new event type but doesn't widen the constraint, so the feature fails on its own audit-log insert | Any migration adding an audit event type must widen this constraint in the same migration |
| `ProjectThread.jsx` shipped broken 3 days, unnoticed by tests — passed a `{role}`-only fake viewer object that `requireViewer()` rejected outright | Contract tests can't catch a component/helper drifting out of sync — verify live |
| `profiles` RLS default blocks participants from seeing each other's rows → sender names rendered "Unknown" everywhere | Fixed via `private.shares_project_with()` (migration `0018`) — check this policy first if "Unknown" reappears |
| pnpm/Windows build flake, most sessions: `Cannot find module '...next\dist\bin\next'` | `Remove-Item -Recurse -Force node_modules; pnpm install`, retry. Budget for it every build |
| Windows `rg`/ripgrep sometimes access-denied on this checkout | Fall back to PowerShell `Get-ChildItem`/`Select-String` |
| `updateProjectTask`'s `revalidateAllProjectPaths` passes the wrong id (same bug already fixed once in `updateProjectApproval`) — currently unreachable, no update UI yet | Fix *before* adding task-edit UI, not after |
| Concurrent-session collisions on shared branches — happened 3+ times (PR #49/#50, `crm/remaining-decisions`, an untracked live-only migration) | Check open branches/PRs and recent remote commits before any broad audit/fix pass |
| `.hermes/` SEO data was accidentally committed once | Now gitignored — don't re-commit |
| Untracked SEO-crawl CSVs periodically dropped into `public/` (~30 files) | `public/` is served statically — flag to owner, don't unilaterally delete/move |

---

## 7. Workflow conventions this repo has converged on

- **Feature work:** `superpowers:brainstorming` → spec in `docs/superpowers/specs/`
  → `superpowers:writing-plans` → task plan in `docs/plans/`,
  both committed to git. Owner reads/critiques specs substantively —
  expect the same engagement, not rubber-stamping.
- **`STATUS.md` (repo root) is the canonical running log.** Read it before
  verification/audit work, update it the same way when done. Not optional.
- **Fix real bugs found while verifying, in the same pass** — don't just
  report them. Makes sense given §5's test ceiling: whoever is actually
  exercising the code live is positioned to close what they find.
- **Before touching an existing DB function/table/policy in a plan,
  fetch its live current definition** (`pg_get_functiondef` via Supabase
  MCP) — don't reconstruct from pattern-matching. Has shipped a real
  regression before.
- **Vercel dashboard-config changes are the owner's to make** — narrower
  than the blanket `vercel --prod` ban; this is about settings-page
  mutations via API specifically.
- **Docs → `markitdown`, images → Tesseract OCR**, not native vision
  Read — hook-enforced, token-saving. Don't route around the hooks.
- **Ship loop:** `pnpm build` → commit → push → reviewed PR into `main` →
  Vercel auto-deploy → spot-check the live site in an actual browser, not
  just a green build.

---

## 8. Open items (last checked 2026-08-13/15)

| Item | Status |
| --- | --- |
| Migration `0024` (PR #69) | Unmerged — re-check `list_migrations`, don't assume `0023` is still the ceiling |
| `project_tasks` RLS has no `client_visible` predicate | App-level filter only; DB-level defense-in-depth recommended, not done |
| Hardcoded priority/status arrays in a few files vs. centralized constants | One instance deliberately deferred (sibling test asserts the literal) |
| PM assignment via admin UI | Implemented, **not fully live-verified** — pinned single-admin-email blocks a test account |
| `fix_handle_new_user_coalesce` | Applied live, no tracked migration file yet |
| Bigger CRM feature (multi-thread per project, category-specific briefs, tile-first onboarding) | Owner-raised, deferred — needs its own brainstorm→plan cycle |
| Test accounts (`phase1-client-test@…`, `phase1-pm-test@…`) + "Phase1 Verification Project" | Deliberately left live to close the PM-assignment gap; credentials are kept outside the repository — delete via Supabase once verified |
| `.env.local` `NEXT_PUBLIC_SUPABASE_*` presence + Supabase Auth Redirect URLs allow-list | Unconfirmed — owner-only to check |
| `tests/e2e` | Planned (`pnpm test:e2e` script exists), not checked in yet |

For anything more granular — commits, PR numbers, per-task verification —
`STATUS.md` is the full record; this file is the distilled version.

---

## 9. Where the rest of the documentation lives

- `AGENTS.md` / `CLAUDE.md` — living instructions/architecture (Codex /
  Claude respectively).
- `STATUS.md` — full chronological CRM log; source for §5/§6/§8 here.
- `docs/CRM-OPERATIONS.md` — CRM portal/role/migration guidance.
- `docs/ux/` — JTBD, user journeys, UX specs.
- `docs/PIXEL-POLISH-PLAN.md` — animation/layout-coherence plan.
- `docs/superpowers/specs/` + `docs/plans/` — brainstorm/plan
  artifacts for past and in-flight feature work.
- `TRIONN-ADAPTATION.md` / `TRIONN-SCREENSHOT-ANNOTATIONS.md` — design
  reference for *unbuilt* future work (§3).
- `.hermes/desktop-attachments/` — raw Screaming Frog SEO exports; data,
  not narrative memory, gitignored/untracked (see §6).
