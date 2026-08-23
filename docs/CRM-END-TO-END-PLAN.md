# CRM End-to-End Completion Plan

## Objective

Bring the existing Supabase-backed CRM to verified end-to-end working status without replacing its mature project aggregate, role model, or security boundaries. Work is limited to the dedicated CRM branch and its pull request.

## Constraints

The application uses Next.js 15, React 19, JSX, Supabase, server actions, RPCs, plain global CSS, and the existing project contract. Do not introduce TypeScript, Tailwind, unrelated dependencies, or a second CRM schema. Do not weaken, delete, skip, or narrow tests to make the goal pass. Do not apply production migrations, alter production schedulers, send real email, or merge the pull request without explicit owner approval.

## Acceptance Matrix

| Area | Client | Project manager | Admin | Evidence |
| --- | --- | --- | --- | --- |
| Authentication and routing | Can sign in and reach the client dashboard; cannot reach staff-only routes | Can sign in and reach the team workspace; cannot use admin-only operations | Can sign in and reach admin workspace | Auth and route tests plus browser checks |
| Project intake | Can submit a valid project brief and see it in the dashboard | Can see permitted backlog/projects | Can create or manage projects through existing admin flows | Server-action tests, RLS tests, browser flow |
| Assignment | Sees assigned staff read-only | Can claim eligible unassigned work | Can assign and remove project staff | RPC/action tests and browser flow |
| Lifecycle | Sees status and client-visible history | Can perform allowed transitions and internal/shared notes | Can perform permitted administrative transitions | Contract, RPC, UI, and browser evidence |
| Tasks | Sees only client-visible tasks and allowed updates | Can create/update/assign tasks in the workspace | Can manage tasks across projects | Action, RLS, and browser evidence |
| Files and deliverables | Can upload permitted brief assets and download visible files | Can upload deliverables and proofs | Can access global project files | Storage/RPC tests and controlled browser flow |
| Approvals | Can request or respond to client-facing approvals | Can review approvals and publish deliverables | Can moderate project operations | Action/RPC tests and browser evidence |
| Messaging | Can post and edit shared messages; cannot read internal content | Can use shared and internal threads | Can moderate permitted threads | Realtime/message contract tests and browser evidence |
| Notifications | Can see and mark own in-app notifications read | Receives permitted project notifications | Sees permitted operational notifications | Notification/RLS/worker tests; no real email send |
| Profiles and roles | Can edit own profile | Can edit own profile; role changes remain admin-controlled | Can safely resolve staff requests and manage roles | Auth/RLS tests and browser checks |
| Analytics | Sees personal project summary | Sees assigned workload summary | Sees global metrics and audit history | Read-model tests and browser checks |

## Checkpoint Loop

1. Characterize an identified gap with a focused test or reproduce it in the browser.
2. Make the smallest change within the current server-action/RPC/UI boundaries.
3. Run the affected test file and `pnpm test:crm`.
4. Inspect the diff and security/data-isolation implications.
5. Continue only when the checkpoint is green.

## Verification Gate

The work is accepted only when `pnpm test:crm`, `pnpm test`, `pnpm build`, `git diff --check`, and available database/browser verification pass, with no unresolved authorization or data-isolation defects. Production migrations, scheduler changes, real email sends, or merge operations require a separate explicit approval.

## Documentation

Every implementation checkpoint must update focused documentation or this plan when behavior, operations, or verification requirements change.


## Branch Checkpoint

This document is the first branch-only checkpoint for the CRM completion pull request. The implementation branch is intentionally based on the merged `main` state and will accumulate only CRM changes.
