# Source Reconciliation Guide

Use this guide when automated artifacts disagree with direct source inspection or runtime evidence.

## Evidence precedence

Use this order of authority:

| Rank | Evidence | Use |
|---:|---|---|
| 1 | Current checked-out source at the recorded commit | Determine implemented routes, dependencies, handlers, data access, and tests |
| 2 | Authenticated live GitHub metadata for the recorded branch/commit | Determine activity, branches, pull requests, issues, and repository state |
| 3 | Verified local/preview runtime or database checks | Confirm behavior that static inspection cannot prove |
| 4 | Generated scanner/archaeologist output | Accelerate discovery, then verify important conclusions |
| 5 | README, plans, audits, and handoffs | Understand intent, historical context, and known risks |

## Reconciliation procedure

1. Record the artifact’s claim exactly, including its maturity label, dependency versions, route count, or missing component.
2. Check the current commit, remote, branch, and working-tree state.
3. Inspect the primary source files that could confirm or disprove the claim.
4. If behavior matters, run the smallest safe verification that can distinguish implementation from intent.
5. Mark the conclusion as `verified`, `partially verified`, `historical`, `planned`, `contradicted`, or `not checked`.
6. Preserve material discrepancies in the project-flow document and roadmap.

## Common contradictions

A project may be incorrectly classified as frontend-only when it has middleware, server actions, route handlers, database migrations, RPC calls, Supabase clients, private storage, Realtime, or cron workers. A route may be omitted because the analyzer only searches one router convention. A dependency version may be stale because the analysis used an older checkout. A plan may say “not implemented” even though a later merge shipped the work.

Never resolve these contradictions by averaging the sources. Identify which source is current and explain why it wins.

## Report language

Use precise evidence labels:

- **Verified:** directly observed in current source or a successful test/runtime check.
- **Partially verified:** implementation exists, but an important boundary or runtime path was not exercised.
- **Historical:** documented as true for an earlier commit or prior environment.
- **Planned:** described as desired work without current implementation evidence.
- **Contradicted:** an automated or planning claim is disproven by current source.
- **Not checked:** evidence was unavailable; do not infer status.

## Safety

Do not apply production migrations, delete data, publish deployments, send external messages, or alter credentials merely to confirm a roadmap finding. Use disposable preview data and read-only inspection whenever possible.
