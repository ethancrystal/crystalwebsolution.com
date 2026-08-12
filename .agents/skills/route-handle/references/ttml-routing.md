# TTML Routing Reference

Load this file only after the owner area is known and the short routing table in `SKILL.md` is not enough.

## Change Cut

Treat every task as a cut from request to proof:

1. Requested behavior or question.
2. Owning runtime area.
3. Source files that own the behavior.
4. Smallest edit that satisfies the request.
5. Narrowest verification that proves the edit.

Do not expand into adjacent cleanup, formatting, dependency changes, or config edits unless the cut cannot work without them.

## Area Map

| Task cue | Start here | Avoid |
| --- | --- | --- |
| New page, route, role redirect | `client/src/App.tsx`, page component, `ProtectedRoute.tsx` | React Router assumptions |
| tRPC endpoint or mutation | `server/routers/`, `server/db/`, shared schemas | Raw Drizzle in routers |
| Letter status or lifecycle | `shared/types/letter.ts`, relevant router/db/pipeline code | Hardcoded status strings |
| Pricing or checkout amount | `shared/pricing.ts`, Stripe helpers | Hardcoded prices |
| Intake data | `server/intake-normalizer.ts`, intake forms | Sending raw form data into pipeline |
| Pipeline behavior | `server/pipeline/`, `server/worker.ts`, `docs/PIPELINE_ARCHITECTURE.md` | Calling stages directly from routers |
| Auth or role access | `ProtectedRoute.tsx`, `server/supabaseAuth/`, `docs/ROLE_AREA_MATRIX.md` | Role checks copied into random components |
| Env handling | `server/_core/env.ts`, `.env.example`, runbook | `process.env` in frontend |
| Deployment | Docker/Railway files, `docs/PRODUCTION_RUNBOOK.md` | Vite proxy changes |
| Repo-local plugin work | `plugins/`, `.agents/plugins/marketplace.json` | Home-local plugin paths unless requested |

## Verification Matrix

| Change surface | First proof | Escalate when |
| --- | --- | --- |
| Type/import-only | `pnpm check` | Shared contracts or generated build output changed |
| Server unit logic | Targeted Vitest file | Router/db/pipeline contract changed |
| Frontend component | `pnpm check` plus browser render for UI behavior | Layout, accessibility, or route flow changed |
| Database schema | Typecheck plus migration validation | Migration ordering or production data safety is unclear |
| Worker/pipeline | Targeted pipeline tests | Retry/status behavior or provider fallback changed |
| Deployment/runtime | Build or container-specific check | Docker/Railway entrypoints changed |

## Load Shedding

Use the snapshot script output to reduce pressure:

- If a dev server already runs on the target port, reuse it or choose a different port.
- If tests/builds are already running, wait or run a targeted command only.
- If memory is low, prefer `pnpm check` and targeted tests before browser or full build work.
- If disk is low, avoid builds, Playwright traces, Docker pulls, or cache-heavy commands.
- If the git tree has unrelated edits, route around them and mention any overlap before editing.
