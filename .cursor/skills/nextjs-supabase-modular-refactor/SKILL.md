---
name: nextjs-supabase-modular-refactor
description: "Plan and execute safe, incremental modular refactors of Next.js applications backed by Supabase, including frontend boundaries, server code, data access, authentication, Row Level Security, migrations, tests, observability, and rollout. Use when a Next.js and Supabase codebase is becoming tangled, duplicated, difficult to test, or risky to change."
version: 1.0.0
---

# Next.js + Supabase Modular Refactor

## Purpose

Turn a broad refactor request into small, reversible changes with explicit module boundaries, preserved behavior, and verification evidence. Treat the database, auth, server actions/API routes, UI, and deployment configuration as connected surfaces.

## When to Use

Use for requests to refactor, modularize, restructure, simplify, or prepare a Next.js + Supabase application for growth. Trigger when the work crosses multiple files or areas such as App Router structure, components, server actions, Supabase clients, queries, policies, migrations, tests, or environment configuration.

## Operating Rules

- Inspect before editing; establish the current architecture, package scripts, deployment target, and test baseline.
- Preserve behavior first. Separate structural moves from behavior changes.
- Prefer vertical slices and small commits over a large rewrite.
- Keep secrets server-side; never expose service-role credentials to client code.
- Treat Supabase RLS as an authorization boundary, not merely a database feature.
- Use typed domain functions between UI/server code and raw Supabase queries.
- Never edit applied migrations destructively; add a new migration instead.
- Verify each slice with focused tests, type checks, lint, and a production build when practical.
- Record assumptions, risks, changed contracts, and rollback steps.

## Workflow

1. **Map the codebase.** Locate `app/`, `pages/`, `components/`, `lib/`, `actions/`, API routes, Supabase clients, schema/migrations, tests, and deployment files. Identify whether the app uses App Router, Pages Router, or both.
2. **Capture a baseline.** Run existing checks from `package.json`; record failures that predate the refactor. Do not silently treat baseline failures as regressions.
3. **Define module seams.** Group changes into presentation, feature/application services, domain rules, data access, infrastructure, and shared utilities. Define allowed dependencies before moving files.
4. **Choose a slice order.** Start with low-risk seams, usually shared Supabase clients and data-access helpers, then one feature at a time. Avoid simultaneous routing, schema, and UX changes unless required.
5. **Refactor the Next.js layer.** Keep Server Components server-only by default; isolate Client Components around interactivity. Keep server actions/API handlers thin and delegate validation, authorization, and business logic to feature services.
6. **Refactor Supabase access.** Separate browser and server clients, centralize generated database types, wrap queries in named repositories/services, validate inputs, and make authorization checks explicit.
7. **Review auth and RLS.** Trace anonymous, authenticated, and privileged paths. Verify policies for every affected table, use least privilege, and test both allowed and denied access. Check redirects and cache behavior around user-specific data.
8. **Handle schema changes safely.** Add additive migrations, backfill deliberately, deploy compatible application code, then remove obsolete columns or paths only after usage is gone.
9. **Add verification.** Update unit, integration, RLS/database, and end-to-end tests according to risk. Test loading, empty, error, unauthorized, and success states for affected UI flows.
10. **Validate and document.** Run formatting, lint, type checking, tests, and build. Review the diff for accidental behavior changes, secret exposure, client/server violations, N+1 queries, and unbounded data fetching.
11. **Roll out incrementally.** Use feature flags or compatibility adapters for risky changes. Define monitoring signals, rollback triggers, and the smallest safe revert path.
12. **Report clearly.** Summarize modules changed, contracts introduced, migrations, checks run, known limitations, and follow-up cleanup tasks.

## Reference Guides

- For architecture boundaries and sequencing, read [refactor checklist](references/refactor-checklist.md).
- For Supabase security and migration review, read [Supabase guide](references/supabase-guide.md).

## Expected Deliverables

Produce an implementation plan before multi-file edits, focused patches rather than wholesale rewrites, migration files where needed, tests for changed contracts, and a concise verification report. Keep unrelated cleanup out of scope.
