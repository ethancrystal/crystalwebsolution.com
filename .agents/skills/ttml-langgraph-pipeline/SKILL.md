---
name: ttml-langgraph-pipeline
description: |
  Implementation expert for the TTML LangGraph pipeline — the 6-node StateGraph
  (research → draft → assembly → vetting → finalize | fail) that runs either as
  a worker-side route (`LANGGRAPH_PIPELINE=true` in `server/worker.ts`) or as an
  orchestrator-level bypass (`PIPELINE_MODE=langgraph` in
  `server/pipeline/orchestrator.ts`). Use AGGRESSIVELY whenever work touches
  `server/pipeline/graph/`, `server/pipeline/graph/nodes/`, `state.ts`,
  `graph/index.ts`, `server/pipeline/langgraph.ts` (compatibility shim), or
  `pipeline_stream_chunks`. Trigger on: graph topology changes, adding/removing
  nodes, routing logic (`routeAfterVetting`), streaming tokens to Supabase
  Realtime, env gates, finalize node, fail node, vetting retry loop,
  `errorRetryCount`, `qualityDegraded`, status transitions inside graph nodes,
  LangGraph imports (`@langchain/langgraph`), `pipeline_stream_chunks` table,
  `useLetterStream` React hook, AbortSignal timeouts, or any "letter is stuck
  in the LangGraph path" report. Verified baseline: 2026-04-20.
---

# TTML LangGraph Pipeline

Implementation reference for the TTML LangGraph StateGraph pipeline. The graph
can be invoked from either direction:

1. **Worker-side route** — `LANGGRAPH_PIPELINE=true` in `server/worker.ts`. The
   pg-boss worker still owns the job, acquires the pipeline lock, and routes
   LangGraph first. **Graceful fall-through to the classic in-app pipeline** if
   LangGraph throws.
2. **Orchestrator bypass** — `PIPELINE_MODE=langgraph`. The bypass happens at
   the top of `runFullPipeline()` *before* any n8n/in-app logic runs. When
   LangGraph fails here it throws a `PipelineError` — there is no secondary
   fall-through at this layer; the fallback is the worker's normal retry loop.

Both switches call the same compiled `StateGraph`. The differences are where
the call originates and what happens on failure.

---

## 1. Where the Code Lives

```
server/pipeline/
├── langgraph.ts              — compatibility shim (PipelineResult, runPipeline, streaming stub)
└── graph/
    ├── index.ts              — buildPipelineGraph(), runLangGraphPipeline(), streamLangGraphPipeline()
    ├── state.ts              — PipelineState (Annotation.Root), PipelineStateType
    └── nodes/
        ├── research.ts       — Perplexity sonar-pro → Claude Sonnet 4 fallback (non-web-grounded)
        ├── draft.ts          — Claude Sonnet 4 streaming → pipeline_stream_chunks
        ├── assembly.ts       — Claude Sonnet 4 assembly pass
        ├── vetting.ts        — Claude Sonnet 4 vetting, returns VettingReport
        └── finalize.ts       — finalizeNode + failNode
```

The `langgraph.ts` shim adapts `runLangGraphPipeline(opts)` into the
`runPipeline(letterId, intake, userId) → PipelineResult` signature that
`orchestrator.ts` imports via `runLangGraphPipeline` (aliased as
`runLangGraphPipeline` but resolved through `./langgraph`).

---

## 2. The Two Env Gates

| Env var                  | Observed at                    | Fall-through behaviour on LangGraph failure |
| ------------------------ | ------------------------------ | ------------------------------------------- |
| `PIPELINE_MODE=langgraph` | `orchestrator.ts` line 167     | No fall-through at this layer; `PipelineError` bubbles up and the worker's retry loop handles it. |
| `LANGGRAPH_PIPELINE=true` | `server/worker.ts` line 72     | Graceful: logs warn, releases and re-acquires the pipeline lock, and proceeds to the classic in-app `runFullPipeline()`. If the re-acquire fails the letter is marked `pipeline_failed` (`force: true`). |

Do not use both switches simultaneously. If you set `PIPELINE_MODE=langgraph`
the worker gate never runs because the orchestrator returns before the
classic path is reached. If you set only `LANGGRAPH_PIPELINE=true` the
orchestrator-level branch is skipped and the worker takes over.

Other `PIPELINE_MODE` values worth knowing:

- `PIPELINE_MODE=simple` — the Claude-only ultra-simple pipeline. Bypasses
  pg-boss entirely (server startup skips pg-boss warmup in
  `server/_core/index.ts:394`) and the letter service runs it inline
  (`server/services/letters.ts:153`).
- `PIPELINE_MODE=langgraph` — StateGraph bypass described above.
- `PIPELINE_MODE` unset (default) — classic path: n8n webhook primary if
  configured, else in-app 4-stage pipeline.

---

## 3. Graph Topology

```
START
  │
  ▼
research  ──error──▶ errorRetryCount++ (currentStage="error")
  │
  ▼
draft     ──error──▶ errorRetryCount++   (also streams tokens → pipeline_stream_chunks)
  │
  ▼
assembly  ──error──▶ errorRetryCount++
  │
  ▼
vetting   ──error──▶ errorRetryCount++
  │
  ├── qualityDegraded && retryCount < 2  ──▶  draft (max 2 quality-driven redraft loops)
  ├── errorRetryCount >= 3 || !assembledLetter  ──▶  fail
  └── else                               ──▶  finalize
  │
  ├── finalize ──▶ END
  └── fail     ──▶ END
```

Invariants:

- All nodes except `finalize` and `fail` are wrapped with `withErrorRecovery()`
  (graph/index.ts:53-70). It catches any thrown error, increments
  `errorRetryCount`, writes `lastErrorStage`, and sets
  `currentStage: "error"` without crashing the graph.
- `vettingRouterNode` wraps `vettingNode` and increments `retryCount` only
  when `qualityDegraded` is true (graph/index.ts:42-49).
- `routeAfterVetting` (graph/index.ts:17-38) is the only conditional edge.
  It owns all routing. Do not add additional conditional edges — keep the
  routing centralised.

---

## 4. `routeAfterVetting` — Canonical Form

```typescript
function routeAfterVetting(state: PipelineStateType): string {
  const { qualityDegraded, retryCount, errorRetryCount, assembledLetter } = state;

  // Fail fast: too many node errors OR no draft content ever produced
  if (errorRetryCount >= 3 || !assembledLetter) {
    return "fail";
  }

  // Redraft: vetting flagged quality issues and we have retries left
  if (qualityDegraded && retryCount < 2) {
    return "draft";
  }

  return "finalize";
}
```

**CRITICAL — `addConditionalEdges` must include `fail: "fail"` in the target map:**

```typescript
.addConditionalEdges("vetting", routeAfterVetting, {
  draft: "draft",
  finalize: "finalize",
  fail: "fail",   // REQUIRED — without this LangGraph throws when routeAfterVetting returns "fail"
})
```

The `fail` node must be registered AND wired; don't leave it as dead code.
This was the single most important bug fix during the April 2026 audit.

---

## 5. The `fail` Node

```typescript
export async function failNode(state: PipelineStateType): Promise<Partial<PipelineStateType>> {
  await updateLetterStatus(state.letterId, "pipeline_failed");
  return { currentStage: "failed", messages: [...] };
}
```

`pipeline_failed` is a valid `ALLOWED_TRANSITIONS` target from `researching`,
`drafting`, and `submitted` in `shared/types/letter.ts`. From
`pipeline_failed`, users can resubmit (transition back to `submitted`).

In `runLangGraphPipeline` (graph/index.ts:155-159) a final state with
`currentStage === "failed"` causes an `Error("LangGraph pipeline failed for
letter #N")` to be thrown. In the worker-side route this triggers the
fall-through to the classic pipeline. In the orchestrator bypass it becomes
a `PipelineError` returned from the `runPipeline` shim.

---

## 6. State Shape (`PipelineStateType`)

Source: `server/pipeline/graph/state.ts`. Reducer column tells you which
fields accumulate vs. overwrite.

| Field                | Type                        | Reducer     | Purpose                                               |
| -------------------- | --------------------------- | ----------- | ----------------------------------------------------- |
| `letterId`           | `number`                    | last-write  | Primary key into `letter_requests`                    |
| `userId`             | `number`                    | last-write  | For notifications                                     |
| `intake`             | `Record<string, any>`       | last-write  | Raw intake JSON                                       |
| `messages`           | `BaseMessage[]`             | **append**  | LangChain message history                             |
| `qualityWarnings`    | `string[]`                  | **append**  | Accumulates across vetting iterations                 |
| `researchPacket`     | `Record \| null`            | last-write  | Perplexity or Claude fallback output                  |
| `researchProvider`   | `string`                    | last-write  | `"perplexity"` or `"anthropic-fallback"`              |
| `researchUnverified` | `boolean`                   | last-write  | True when Claude fallback used (no web grounding)     |
| `assembledLetter`    | `string`                    | last-write  | Full letter text after assembly                       |
| `vettedLetter`       | `string`                    | last-write  | Post-vetting text (vetting evaluates, not rewrites)   |
| `qualityDegraded`    | `boolean`                   | last-write  | Vetting flagged serious issues                        |
| `retryCount`         | `number`                    | last-write  | Quality-driven redraft iterations (max 2)             |
| `errorRetryCount`    | `number`                    | last-write  | Node-level error count (fail at 3)                    |
| `lastErrorStage`     | `string`                    | last-write  | Which node last threw                                 |
| `vettingReport`      | `Record \| null`            | last-write  | Full VettingReport JSON                               |
| `workflowJobId`      | `number`                    | last-write  | FK to `workflow_jobs`                                 |
| `currentStage`       | `string`                    | last-write  | Tracking / error-routing hint                         |

Only `messages` and `qualityWarnings` append. Everything else is last-write.
Don't accidentally make a field append-reducer — the state will grow unbounded.

---

## 7. Model Pins

All four AI-driven nodes resolve to **Claude Sonnet 4** via `providers.ts`
(`claude-sonnet-4-20250514`) as of 2026-04-20. Do not reference Claude Opus
in LangGraph code or docs.

| Node       | Primary                                     | Fallback                                 |
| ---------- | ------------------------------------------- | ---------------------------------------- |
| research   | Perplexity `sonar-pro`                      | Claude Sonnet 4 (sets `researchUnverified=true`) |
| draft      | Claude Sonnet 4 (streaming)                  | `gpt-4o-mini`                            |
| assembly   | Claude Sonnet 4                              | `gpt-4o-mini`                            |
| vetting    | Claude Sonnet 4                              | `gpt-4o-mini`                            |

Timeouts are inherited from `providers.ts`: `RESEARCH_TIMEOUT_MS`,
`DRAFT_TIMEOUT_MS`, `ASSEMBLY_TIMEOUT_MS` — all currently **90 seconds**. The
draft node also sets `STREAM_FLUSH_INTERVAL_MS = 300` and
`STREAM_MIN_BUFFER_CHARS = 50` for Supabase Realtime flushes.

---

## 8. `finalize` Node — Hard Rules

The finalize node must use ONLY the canonical helpers, never raw Drizzle
writes to `letterRequests.status`. This was a deployment bug found in the
April 2026 audit and must not regress.

```typescript
// CORRECT — use canonical helpers
await db.update(letterRequests)
  .set({ researchUnverified, qualityDegraded, updatedAt: new Date() })
  .where(eq(letterRequests.id, letterId));             // quality flags only — no status

await updateLetterVersionPointers(letterId, { currentAiDraftVersionId: versionId });
await updateLetterStatus(letterId, "generated_locked"); // enforces ALLOWED_TRANSITIONS

// WRONG — never do this
await db.update(letterRequests)
  .set({ status: "generated_locked" })
  .where(eq(letterRequests.id, letterId));             // bypasses state machine
```

`updateLetterStatus()` enforces `ALLOWED_TRANSITIONS`, writes `review_actions`
audit rows, and is the single source of truth for state changes. Raw Drizzle
status updates silently bypass all of that. The transition
`drafting → generated_locked` is valid per `shared/types/letter.ts`.

---

## 9. `draft` Node — Streaming to Supabase Realtime

The draft node streams Claude Sonnet 4 tokens into the
`pipeline_stream_chunks` table so the frontend's `useLetterStream` hook can
show live generation progress.

Required env vars (worker service):

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

If either is missing, streaming is disabled gracefully — the draft still
runs, chunks just aren't written. Letter generation does not fail.

The draft node uses `AnySupabaseClient` (typed as `SupabaseClient<any>`)
because the generated Supabase DB types do not include
`pipeline_stream_chunks` — the table was added via a standalone Supabase
migration, not a Drizzle migration. This is intentional.

### `pipeline_stream_chunks` table

Applied to Supabase production April 14, 2026 via
`supabase/migrations/20260414000001_pipeline_stream_chunks.sql`.

```sql
CREATE TABLE pipeline_stream_chunks (
  id              bigserial PRIMARY KEY,
  letter_id       integer NOT NULL REFERENCES letter_requests(id) ON DELETE CASCADE,
  chunk_text      text NOT NULL,
  stage           varchar(50) NOT NULL DEFAULT 'draft',
  sequence_number integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);
```

RLS policies (aligned with TTML's existing helpers):

- `stream_chunks_select_own` — users see chunks for their own letters via `app_user_id()`
- `stream_chunks_select_staff` — employees/admins see all via `is_app_employee_or_admin()`
- No INSERT policy needed — service role key bypasses RLS.

The original migration referenced `u.supabase_auth_id`, but TTML's `users`
table uses `open_id`. The applied version uses `app_user_id()`. Don't
reintroduce the `supabase_auth_id` reference.

The table is published to `supabase_realtime` so `postgres_changes`
subscriptions fire. A `cleanup_old_stream_chunks()` procedure deletes rows
older than 24h (schedule via pg_cron).

---

## 10. Vetting Node — `VettingReport`

Uses Claude Sonnet 4, 90s timeout. Returns a `VettingReport`:

```typescript
interface VettingReport {
  riskLevel: "low" | "medium" | "high" | "critical";
  qualityDegraded: boolean;       // true → triggers redraft
  jurisdictionIssues: string[];
  citationsFlagged: string[];
  factualIssuesFound: string[];
  overallScore: number;           // 0–10; < 6 → qualityDegraded should be true
  summary: string;
  recommendations: string[];
}
```

If JSON parsing fails, vetting returns a safe default (`qualityDegraded:
false, score: 7`) so the pipeline doesn't get stuck. `retryCount` is passed
to the vetting prompt — on retry #1+, the model is instructed to be more
lenient about minor issues to avoid infinite redraft loops.

---

## 11. Activation Checklist

For the worker-side route (`LANGGRAPH_PIPELINE=true`):

- Set `LANGGRAPH_PIPELINE=true` on the Railway **worker** service (not the app service).
- `ANTHROPIC_API_KEY` — draft, assembly, vetting, and Claude fallback research.
- `PERPLEXITY_API_KEY` — research node primary (graceful Claude fallback if absent).
- `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` — streaming chunks (graceful fallback if absent).
- `SUPABASE_DIRECT_URL` (port 5432) — required for pg-boss; the worker still runs through pg-boss on this route.
- `DATABASE_URL` / `SUPABASE_DATABASE_URL` — Drizzle ORM access.

For the orchestrator bypass (`PIPELINE_MODE=langgraph`):

- All of the above except the pg-boss bits are technically optional because
  the bypass skips the pg-boss worker. In practice, leave the database URLs
  configured — `finalizeNode` and `failNode` write via Drizzle.
- Do NOT set `LANGGRAPH_PIPELINE=true` simultaneously (harmless, but
  confusing when reading logs).

Don't set either gate on the app service — the app service doesn't run the
pipeline. The worker does (or, under `PIPELINE_MODE=langgraph`, whichever
process called `runFullPipeline`).

---

## 12. Status Machine (Pipeline-Relevant Subset)

```
submitted       → researching   (researchNode entry)
researching     → drafting      (draftNode entry)
drafting        → generated_locked (finalizeNode)
researching     → pipeline_failed (failNode)
drafting        → pipeline_failed (failNode)
submitted       → pipeline_failed (worker lock-loss bailout, force:true)
pipeline_failed → submitted      (user-driven resubmit, elsewhere)
```

All status changes go through `updateLetterStatus()` in `server/db/` which
validates against `ALLOWED_TRANSITIONS` in `shared/types/letter.ts`. Never
use raw SQL or Drizzle for the `status` column.

`generated_locked → pending_review` is **not** owned by the LangGraph
pipeline — that transition happens in the Stripe webhook's
`unlockLetterForReview` (`server/stripeWebhook/handlers/checkout.ts`) after
the user pays.

---

## 13. Debugging "LangGraph Letter Is Stuck"

1. **Which gate is active?** `echo $PIPELINE_MODE` and `echo $LANGGRAPH_PIPELINE` on the worker service.
2. **Which node errored?** `pipeline_stream_chunks` and `review_actions` rows for the letter; also `currentStage` / `lastErrorStage` if you can query the live graph state.
3. **Quality-redraft loop?** `retryCount >= 2` and `qualityDegraded = true` → the graph should route to `finalize` regardless. If it's still looping, check that `retryCount` isn't being reset between runs.
4. **Error-retry ceiling?** `errorRetryCount >= 3` → route to `fail`. If the letter isn't transitioning to `pipeline_failed`, the `fail: "fail"` entry in `addConditionalEdges` may be missing again — verify in `graph/index.ts:95-99`.
5. **Streaming disabled?** If `useLetterStream` shows nothing but the letter eventually completes, check `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` on the worker.
6. **Worker fall-through?** If `LANGGRAPH_PIPELINE=true` is set and the log shows `"LangGraph pipeline failed for letter #N — falling back to standard pipeline"`, the classic pipeline is handling it now; follow the orchestrator playbook in `ttml-pipeline-orchestrator`.

---

## 14. Verification Baseline (2026-04-20)

Verified against:

- `server/pipeline/graph/index.ts`
- `server/pipeline/graph/state.ts`
- `server/pipeline/graph/nodes/{research,draft,assembly,vetting,finalize}.ts`
- `server/pipeline/langgraph.ts` (shim)
- `server/pipeline/orchestrator.ts` (PIPELINE_MODE branches, lines 164-198)
- `server/worker.ts` (LANGGRAPH_PIPELINE branch, lines 68-100)
- `server/pipeline/providers.ts` (model pins)
- `shared/types/letter.ts` (`ALLOWED_TRANSITIONS`)
- `supabase/migrations/20260414000001_pipeline_stream_chunks.sql`

If any of these change materially, re-verify and update this skill in the
same PR.
