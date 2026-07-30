# Handoff — CRM completion, auth fix, project delivery lifecycle (July 28 2026)

## Authoritative update — July 30, 2026

This section supersedes the July 28 operational claims below. The older
material is retained as history only; do not use its “live now,” migration,
branch, or deployment statements as current truth.

### Current checkout and branch

- Repository: `C:\Users\moizjmj\Crystal Web Solution`
- Isolated CRM worktree:
  `C:\Users\moizjmj\Crystal Web Solution\.worktrees\crm-completion`
- Branch: `codex/crm-completion`
- Base before this pass: `ec586a5`
- Remote: `https://github.com/ethancrystal/crystalwebsolution.com.git`
- Portable branch: `origin/codex/crm-completion`
- No CRM migration from this pass has been applied to the live Supabase
  project, and this branch has not been deployed.
- The CRM remains inside the existing Next.js 14 App Router application and
  uses the same Supabase project. `pnpm` is only the repository package
  runner; there is no second CRM app or package.

### Pull and continue from another PC

For a fresh clone:

```bash
git clone https://github.com/ethancrystal/crystalwebsolution.com.git
cd crystalwebsolution.com
git fetch origin
git switch --create codex/crm-completion --track origin/codex/crm-completion
pnpm install --frozen-lockfile
pnpm test:crm
pnpm exec next build
```

For an existing clone:

```bash
cd crystalwebsolution.com
git status --short
git fetch origin
git switch codex/crm-completion
git pull --ff-only origin codex/crm-completion
pnpm install --frozen-lockfile
pnpm test:crm
pnpm exec next build
```

If `git switch codex/crm-completion` says the local branch does not exist,
use:

```bash
git switch --create codex/crm-completion --track origin/codex/crm-completion
```

Before authenticated browser work, copy `.env.example` to an ignored local
environment file and obtain the Supabase and Resend values through a secure
channel. Never copy secrets into this handoff, chat, source control, test
fixtures, or command output.

Confirm the portable checkpoint before editing:

```bash
git branch --show-current
git log --oneline -5
git status --short
```

The branch should be `codex/crm-completion`; the history must contain
`cc44a27`, `c63a067`, `2923502`, and `6c186db`. A documentation-only
checkpoint commit may appear above them.

### Verified work committed in this pass

- `6c186db` — `feat(crm): add role-specific secure login portals`
- `2923502` — `fix(crm): harden role portal redirects`
- `c63a067` — `fix(crm): repair onboarding and tenant role isolation`
- `cc44a27` — `fix(crm): scope task access and supported roles`

The committed authentication/RBAC layer now provides:

- dedicated `/login/client`, `/login/employee`, and `/login/admin` portals;
- an initial protected `/team` employee landing route;
- one Supabase identity and one exact authoritative role from
  `profiles.role`: `client`, `project_manager`, or `admin`;
- fail-closed middleware and page-level guards when configuration, session,
  profile, or role lookup fails;
- normalized same-role return paths, including dot-segment attack rejection;
- refreshed Supabase cookies copied onto middleware redirects;
- no unknown-role `/login` self-redirect loop;
- working server-action sign-out forms in place of the dead
  `/api/auth/logout` URL;
- a transactional onboarding repair;
- RPC-only admin role changes with self-demotion and last-admin protection;
- deterministic conversion of legacy `staff` profiles to
  `project_manager`, plus a validated three-role profile constraint;
- deal-owner-scoped legacy project-manager reads, own-company client task
  reads, client-visible notes only, and removal of the inherited
  assignment-only cross-tenant task policy;
- fixed `search_path` and least execution grants for the repaired
  SECURITY DEFINER functions.

### Verification evidence

- Task 1 focused CRM tests: 7/7 passed.
- Task 2 focused CRM tests: 17/17 passed.
- A clean-cache direct Next.js production build passed all 41 routes after
  each application-code task.
- Task 1 and Task 2 each passed:
  implementer self-review, pre-commit furious review, task-scoped review,
  repair round, and scoped re-review.
- This CRM branch was cut before `origin/main` commit `7315519`, which now
  contains the verified phone Motion-card responsive fix, its corrected
  assertion, and the three CRM audit reports. Consequently this branch's
  broader suite still reports the old phone SVG assertion until that main
  commit is integrated. Do not silently merge, rebase, or cherry-pick it;
  review that integration as a separate step because `7315519` also adds
  the audit documents.

### Database and test-user state

- `supabase/migrations/0008_auth_rbac_repair.sql` is committed but
  intentionally **not applied live**.
- The planned `0009_project_workspace.sql` has not been implemented yet.
- Live CRM application tables were inspected as empty before this pass,
  making the planned separation of delivery `projects` from sales `deals`
  low-risk, but that separation is not complete yet.
- The three reserved test identities are:
  - admin: `ethan@crystalwebsolution.com`
  - employee/project manager: `ethan+employee@crystalwebsolution.com`
  - client: `ethan+client@crystalwebsolution.com`
- None of those accounts existed at the time of the read-only check. They
  have not been provisioned yet; do not create one multi-role account and do
  not store or print passwords or invitation links.

### Execution plan and exact resume point

The authoritative seven-task plan is:

`docs/superpowers/plans/2026-07-30-crm-three-role-project-platform.md`

Tasks 1 and 2 are complete. Resume at **Task 3: Add the Project Delivery
Aggregate and Command Boundary**, starting from commit `cc44a27`. Task 3
must add the separate delivery-project schema, membership, lifecycle
commands, audit events, and notification outbox without applying live DDL.
Then complete the shared server data/actions, client workspace,
employee/admin operations and test-user provisioning, and final responsive
and notification integration tasks in order.

### Release boundary

Do not call this CRM production-complete yet. The secure entry/RBAC
foundation is committed, but the separate project aggregate, complete
client/employee/admin workflows, approvals/deliverables, notifications,
responsive CRM browser QA, reviewed live migration application, and
test-user provisioning remain outstanding.

The originating PC has two untracked Task 3 RED-test drafts:
`tests/crm/project-contract.test.mjs` and
`tests/crm/project-schema.test.mjs`. They are deliberately excluded from
this portable commit because RED was not run and neither implementation file
exists. A second PC should start Task 3 from the committed plan rather than
assuming those local drafts are available or correct.

---

## Historical July 28 notes (superseded where they conflict above)

Pushed to `main` on `https://github.com/ethancrystal/crystalwebsolution.com.git`. Also mirrored on `codex/contentful` where the two branches overlap (marketing nav, globals.css).

```bash
git clone https://github.com/ethancrystal/crystalwebsolution.com.git
cd crystalwebsolution.com
git checkout main   # CRM + full feature set lives here
```

## Commits from today (on `main`)

- `97187eb` feat: complete CRM admin CRUD, client portal, and project delivery lifecycle
- `efac2eb` feat: add Login/Sign up links to marketing nav (merged from `codex/contentful`)
- `88564f8` fix: stop swallowing Next.js's internal redirect signal in auth forms — **critical, see below**

Earlier same-day commits (marketing site fixes, merged in via `codex/contentful`): Approach connecting-path SVG fix (`e6fc09f`), Services/Hero/Footer cleanup (`6e401bf`), Mark shard-assembly animation, Contact button crop fix.

## What's live now

**CRM admin** (`/admin/*`, staff/admin only via middleware):
- Companies, Contacts, Deals — full CRUD (list/new/detail/edit/delete)
- Tasks — full CRUD, sorted by due date, overdue highlighting
- Deals Pipeline (`/admin/deals/pipeline`) — Kanban board, stage-select per card
- Notes panel (`components/crm/NotesPanel.jsx`) — wired into Companies/Contacts/Deals detail pages

**Client portal** (`/dashboard`, any authenticated user):
- Clients see their own company's projects (deals) and a "start a project" brief-submission form
- Brand-new clients with no company yet get a short company-setup step first (via `onboard_client_company` RPC), then the brief form
- `/dashboard/projects/[id]` — client-facing project detail page: status timeline (brief_submitted → in_progress → in_review → delivered), assigned project manager, and the shared conversation/file thread
- `components/crm/ProjectThread.jsx` — per-deal message thread + file upload/download, shared between the client project page and the admin deal detail page

**Marketing site nav**: `SITE.authNav` (Log in / Sign up) — compact link in the top bar, full entries in the fullscreen menu overlay.

## ⚠️ Migrations NOT applied to live Supabase yet

`supabase/migrations/0002_crm_security_hardening.sql` and `0003_project_delivery.sql` are written and committed but **have not been run against the live database**. Until they are:
- `deals.project_status`, `project_messages`, `project_files`, the `project-files` Storage bucket, and `onboard_client_company()` all reference schema that doesn't exist yet — the client portal (brief submission, thread, files, status timeline) will error on use.
- The `0002` RLS hardening (profile privilege-escalation fix, missing DELETE policies, tightened INSERT checks) is also not yet live.

Apply both via the Supabase MCP (`mcp__supabase__*`, needs OAuth — see `mcp__supabase__authenticate`) or the Supabase dashboard SQL editor, in order: `0001` (if not already applied) → `0002` → `0003`.

## Critical bug fixed today: auth forms were swallowing successful logins

`app/login/page.jsx`, `app/signup/page.jsx`, and `app/auth/reset-password/page.jsx` each wrap their server action call (`signIn`/`signUp`/`updatePassword`) in a try/catch. All three server actions call `next/navigation`'s `redirect()` on success, which works by **throwing** a special `NEXT_REDIRECT`-digest error for the framework to intercept. The catch blocks were treating that throw as a real failure and calling `setError(err.message)` — so **every successful sign-in, sign-up, and password reset was silently broken**, surfacing Next.js's generic "An error occurred in the Server Components render" message instead of redirecting.

Fix: each catch block now checks `err?.digest?.startsWith('NEXT_REDIRECT')` and re-throws before falling through to the generic error handler. Applied identically in both `main` (this repo) and `codex/contentful` (`C:\Users\moizjmj\Crystal Web Solution`, the separate marketing-site checkout that also carries copies of these auth pages).

**If you add more server actions that call `redirect()` and wrap them in a client-side try/catch, you need this same guard** — it's a general Next.js App Router footgun, not specific to this codebase.

## Repo topology (still relevant — see also CLAUDE.md)

- **This repo** (`crystalwebsolution.com`, `ethancrystal/crystalwebsolution.com` on GitHub) is the production site. `main` (deployed here) and `codex/contentful` (marketing-site source of truth, merged into `main` before each deploy) both matter.
- A *separate*, similarly-named repo (`Crystal-Web-Solution`, `ethancrystal/Crystal-Web-Solution`) exists with unrelated/stale branches — do not confuse the two. Always check `git remote -v` if unsure which checkout you're in.
- Deploys are done via `vercel deploy --prod --yes` from a checkout with `.vercel/repo.json` linked (run `vercel link --yes --project=crystalwebsolution-com` if missing), OR happen automatically via Vercel's GitHub integration on push to `main` — the latter has been the more reliable path this session; manual CLI deploys repeatedly stalled in an unresolved "Building…" state in this environment even though the underlying deploy succeeded. Check `vercel ls` / `vercel inspect <url>` and the actual aliases rather than trusting the CLI's local wait.
