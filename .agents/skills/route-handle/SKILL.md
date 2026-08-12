---
name: route-handle
description: Route TTML repo work before editing by choosing the smallest useful source area, Codex skill/plugin/tool, command set, and verification path. Use when a task asks where something belongs, which tool to use, how to avoid overloading the system, how to inspect repo/system state, how to route frontend/backend/database/pipeline/auth/deployment/plugin changes, or when the requested change is broad, ambiguous, cross-cutting, or needs local service/resource awareness.
---

# Route Handle

## Overview

Use this skill as the first-pass router for TTML work. Keep the route about the change cut: exact user request, owning files, minimal context to read, smallest safe edit, and verification that proves that cut.

This skill is repo-scoped to `/home/tesla_laptops/ttml-app` and system-aware for the local development environment. It may inspect running services, ports, disk, memory, and process pressure before starting heavy commands, but it does not grant permission to kill processes, reset git state, or touch production systems.

## Quick Route

1. Read `/home/tesla_laptops/ttml-app/AGENTS.md` before edits.
2. Define the change cut in one sentence: behavior, owner area, expected proof.
3. Use `rg` or `rg --files` to locate source. Avoid broad file reads unless the owner area is still unknown.
4. Choose one primary skill/tool route from the tables below.
5. For heavy commands or service work, run:

```bash
bash plugins/route-handle/skills/route-handle/scripts/system-snapshot.sh /home/tesla_laptops/ttml-app
```

6. Run the narrowest verification that matches the change. Escalate only when the changed surface justifies it.

## Tool Routing

- TTML orientation: use `$ttml-repo`; read only the relevant reference after `AGENTS.md`.
- Frontend UI, routes, visual behavior: use `build-web-apps:frontend-app-builder` for new UI and `build-web-apps:frontend-testing-debugging` or Vercel browser verification for rendered checks.
- React/Next performance or component quality: use the React best-practices skill after editing multiple TSX files.
- Supabase, Postgres, Drizzle, RLS, indexes, or SQL performance: use the Supabase and Supabase Postgres best-practices skills.
- OpenAI API/product questions: use `openai-docs` and official docs only.
- Plugin scaffolding: use `plugin-creator`. Skill authoring inside a plugin also uses `skill-creator`.
- GitHub PRs, issues, CI, or publishing branches: use the GitHub skills.
- External current facts, prices, docs, laws, or version-sensitive data: browse or use official primary sources.
- Unknown tool availability: use `tool_search` before falling back to shell or web.

## Source Routing

- Frontend route/page: `client/src/App.tsx`, `client/src/pages/`, `client/src/components/`, `client/src/_core/hooks/useAuth.ts`.
- Frontend API/data: `client/src/lib/`, TanStack Query calls, tRPC query keys, cache invalidation.
- tRPC API: `server/routers.ts`, `server/routers/`, with data access in `server/db/`.
- Database schema/migrations: `drizzle/schema.ts`, `drizzle/schema/`, `drizzle/relations.ts`, migration files.
- Shared business constants: `shared/pricing.ts`, `shared/types/letter.ts`, `shared/types/`.
- Auth/RBAC: `client/src/components/ProtectedRoute.tsx`, `server/supabaseAuth/`, `server/_core/admin2fa.ts`, `docs/ROLE_AREA_MATRIX.md`.
- AI pipeline/worker: `server/pipeline/`, `server/queue.ts`, `server/worker.ts`, `docs/PIPELINE_ARCHITECTURE.md`.
- Email/PDF/storage/payments: `server/email/`, `server/stripe/`, `attached_assets/`, Cloudflare/R2 helpers.
- Deployment/runtime: `Dockerfile`, `docker-compose.yml`, `docker-entrypoint.sh`, `server/migrate.ts`, `docs/PRODUCTION_RUNBOOK.md`.
- Repo-local plugins/skills: `plugins/`, `.agents/plugins/marketplace.json`, `.agents/skills/`.

For more detail, read `references/ttml-routing.md` after the owner area is known.

## System Awareness

Run the snapshot script before starting or restarting dev servers, Docker, Playwright, builds, full test suites, migrations, or long-running workers. Use its output to choose a lighter path when:

- Memory is tight or swap is active.
- Disk free space near the repo is low.
- A dev server already owns the needed port.
- Node, Vite, Vitest, Playwright, Docker, or pnpm are already busy.
- The git tree has unrelated user changes in files you might touch.

Do not run full `pnpm test`, `pnpm build`, browser suites, Docker Compose, or multiple dev servers in parallel unless the task requires it and the snapshot shows enough headroom. Prefer targeted Vitest files, `pnpm check`, or a single browser flow when those prove the change.

## Verification Routing

- Imports, types, router contracts, shared types: run `pnpm check`.
- Pure server logic with tests nearby: run the specific Vitest file first.
- DB/schema changes: run `pnpm check` and migration checks relevant to the change; do not hit live production databases.
- Frontend UI: run type checks and verify the rendered page with a local dev server or browser screenshot when behavior or layout changed.
- Pipeline, worker, auth, payments, or status transitions: run targeted unit/integration tests and inspect source-of-truth constants.
- Pre-deploy or broad cross-cutting work: run `pnpm check`, then `pnpm test`, then `pnpm build` if system pressure allows.

## Guardrails

- Never modify `package.json`, `vite.config.ts`, `tsconfig.json`, or `drizzle.config.ts` without explicit user approval.
- Never add a Vite proxy.
- Never put raw Drizzle queries in routers.
- Never hardcode pricing or letter statuses.
- Never expose non-`VITE_` env vars in frontend code.
- Never kill processes, reset git, clean untracked files, or overwrite unrelated user edits without explicit approval.
- Keep final summaries about the change cut: what changed, where, and what verified it.
