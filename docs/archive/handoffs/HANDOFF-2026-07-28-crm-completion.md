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

### Repository hygiene checkpoint

The portable branch was audited before cleanup. Runtime imports, JSX/CSS
asset URLs, Next routes, package scripts, migration references, and agent
discovery paths were checked before deleting anything.
Missing documentation was never treated as proof that a file was unused:
application source, framework conventions, build output, and repository
tooling were the source of truth for every deletion candidate.
That audit restored the legacy `/cws-header-logo.png` public URL and fixed
the standalone Docker runner to copy `public/`, so both imported and
externally addressed brand assets survive deployment.

Removed:

- generated `.copilot-tracking` planning/research records;
- duplicated `.hermes/desktop-attachments` prompt captures;
- superseded July 19–20 branch handoffs and the stale July 23 CRM setup;
- the obsolete pre-`0008` role/project blueprint after migration comments
  were repointed to the current plan;
- a stale content bible and DOCX containing unsupported client, metric, and
  award claims;
- one duplicate motion audit and one completed Stories design-debate note;
- the stale historical appendix that previously followed this handoff.

Preserved because they remain usable:

- `AGENTS.md`, `CLAUDE.md`, `README.md`, and `ADR-001-auth-flow.md`;
- `.agents/skills/**` and `.claude/agents/furious-reviewer.md`;
- this handoff and the current CRM implementation plan;
- the unresolved HIVE/pixel-polish backlog, the retained motion risk audit
  and choreography, and the Trionn references explicitly named by
  `AGENTS.md`;
- active SVG brand assets, the legacy `/cws-header-logo.png` public URL, and
  every file referenced by application source.

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
