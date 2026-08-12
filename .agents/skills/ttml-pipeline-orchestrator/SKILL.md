---
name: ttml-pipeline-orchestrator
description: |
  Implementation companion to the TTML legal-letter generation pipeline. Reach for
  this skill whenever work touches `server/pipeline/orchestrator.ts`,
  `server/worker.ts`, `server/queue.ts`, `server/n8nCallback.ts`, the `workflow_jobs`
  / `research_runs` / `letter_versions` tables, or any letter moving through
  `submitted → researching → drafting → generated_locked`. Triggers: `runFullPipeline`,
  `PIPELINE_MODE=langgraph`, `PIPELINE_MODE=simple`, `N8N_PRIMARY=true`,
  `N8N_WEBHOOK_URL`, `N8N_CALLBACK_SECRET`, `APP_BASE_URL`, `SUPABASE_DIRECT_URL`
  IPv4 gotcha, pg-boss, "letter is stuck", "kick off a letter", adding a new
  provider, model pin changes, AbortSignal timeouts in the pipeline. Stable
  verification baseline: 2026-04-20.
---

# TTML Pipeline Orchestrator — Implementation Expert

This skill is the *implementation companion* to `ttml-pipeline-expert`. When the
architectural discussion is "how does the pipeline behave," reach for
`ttml-pipeline-expert`. When the question is "what file, what signature, what
env var, what enum value," reach for **this** skill.

Every fact in this document is tied to a verifiable path in `server/pipeline/`,
`server/worker.ts`, `server/queue.ts`, or `server/n8nCallback.ts` as of
2026-04-20. If a claim here ever drifts from the code, the code is right — update
this skill.

---

## 1. The Three-Way Routing Gate (orchestrator.ts)

`runFullPipeline(letterId, intake, dbFields?, userId?)` in
`server/pipeline/orchestrator.ts` is the single entry point invoked from the
pg-boss worker. Before doing any work it runs three mode checks in order:

1. **LangGraph mode** — `process.env.PIPELINE_MODE === "langgraph"` →
   delegate to `runLangGraphPipeline(letterId, intake, userId)` from
   `./langgraph` and return.
2. **Simple mode** — `process.env.PIPELINE_MODE === "simple"` → delegate to
   `runSimplePipeline(letterId, intake, userId)` from `./simple` and return.
   This is the Claude-only single-stage path used for smoke tests: intake →
   Claude Sonnet 4 → letter, no research, no vetting.
3. **Default mode** — no `PIPELINE_MODE` (or an unrecognised value) → continue
   into the classic 4-stage orchestrator body.

Neither LangGraph mode nor Simple mode consults n8n at all. They are fully
self-contained replacements for the default path. The LangGraph path has its
own streaming table (`pipeline_stream_chunks`) — see the `ttml-langgraph-pipeline`
skill for details.

### Default mode: webhook-only n8n primary, in-app 4-stage fallback

Once we enter the default path the orchestrator follows a **two-tier chain**:

| Tier | Trigger                                                        | Behaviour |
| ---- | -------------------------------------------------------------- | --------- |
| 1    | `N8N_PRIMARY=true` **and** `N8N_WEBHOOK_URL` starts with `https://` | POST the intake to n8n with a 10s ack timeout. On `response.ok` we return and wait for the inbound callback. On non-ok or thrown error we fall through. |
| 2    | Always reached when Tier 1 is unused or fails                 | Run the in-app 4-stage pipeline (research → draft → assembly → vetting). |

**There is no MCP tier.** The older `server/n8nMcp.ts` is an empty deprecated
stub. Any reference to an "n8n MCP" primary path is historical — do not
reintroduce it.

The `useN8nPrimary` gate (orchestrator.ts:218) is intentionally strict:

```ts
const useN8nPrimary =
  process.env.N8N_PRIMARY === "true" &&
  !!n8nWebhookUrl &&
  n8nWebhookUrl.startsWith("https://");
```

An unset `N8N_PRIMARY`, an empty `N8N_WEBHOOK_URL`, or a non-HTTPS URL all
skip the n8n branch entirely — the orchestrator logs *"using direct 4-stage
pipeline (primary path)"* and proceeds to the in-app stages.

### Fall-through-to-in-app on n8n failure

The fall-through is explicit in orchestrator.ts around lines 296 and 310:

- **`response.ok === false`** → log `warn`: *"n8n returned error — falling back to in-app pipeline"*, update the `workflow_jobs` row to `failed`, continue.
- **Fetch throws** (including `AbortError` from the 10s ack timeout) → log `warn`: *"n8n call failed — falling back to in-app pipeline"*, continue.

Before starting the fallback the orchestrator calls
`markPriorPipelineRunsSuperseded(letterId)` so the new run's
`pipeline_runs`/`letter_versions` rows don't conflict with abandoned ones.

---

## 2. Env Vars the Orchestrator Reads

| Variable                   | Required?                       | Purpose |
| -------------------------- | ------------------------------- | ------- |
| `PIPELINE_MODE`            | Optional                        | `"langgraph"`, `"simple"`, or unset (default 4-stage). |
| `N8N_PRIMARY`              | Optional                        | Set to `"true"` to route through n8n webhook first. |
| `N8N_WEBHOOK_URL`          | Required if `N8N_PRIMARY=true`  | Must start with `https://`. The path `ttml-legal-pipeline` is auto-rewritten to `legal-letter-submission` (orchestrator.ts:268-273). |
| `N8N_CALLBACK_SECRET`      | Required if `N8N_PRIMARY=true`  | Shared secret. Sent outbound as `X-Auth-Token`. Verified inbound as `x-ttml-callback-secret`. |
| `APP_BASE_URL`             | Optional                        | Defaults to `https://www.talk-to-my-lawyer.com`. Used only to build the callback URL. |
| `ANTHROPIC_API_KEY`        | Required for draft/assembly/vetting | Claude Sonnet 4 (see §4). |
| `PERPLEXITY_API_KEY`       | Recommended                     | Stage 1 research. Falling back to Claude sets `researchUnverified=true`. |
| `OPENAI_API_KEY`           | Recommended                     | `gpt-4o-mini` failover + `gpt-4o-search-preview` web-grounded research failover. |
| `GROQ_API_KEY`             | Optional                        | `llama-3.3-70b-versatile` free OSS last-resort fallback. |
| `SUPABASE_DIRECT_URL`      | Required for pg-boss            | Port **5432** (session pooler); pg-boss needs a direct TCP connection and cannot tolerate the transaction pooler on 6543. |

`preflightApiKeyCheck(stage)` in orchestrator.ts:114-138 is the source of truth
for "does this pipeline have enough keys to run." It returns `canResearch` and
`canDraft` booleans and is called before the in-app fallback begins.

---

## 3. What Gets Written on Every Run

The orchestrator uses the Drizzle data-access helpers in `server/db/` — never
write raw Drizzle queries from within pipeline code. These are the tables that
change state on a normal run:

- **`workflow_jobs`** — one row per pipeline invocation, created by
  `createWorkflowJob({ letterRequestId, jobType: "generation_pipeline", provider: "n8n" | "multi-provider", requestPayloadJson })`. Updated to `running`/`failed`/`succeeded` via `updateWorkflowJob`.
- **`research_runs`** — one row per Stage 1 attempt, written by `runResearchStage`.
- **`letter_versions`** — rows tagged `ai_draft`, then potentially `attorney_edit`. The `ai_draft` is immutable — the vetting stage never overwrites it.
- **`letters` / `letter_requests`** — status column driven by `updateLetterStatus(letterId, newStatus)`, which validates against `ALLOWED_TRANSITIONS` in `shared/types/letter.ts`.
- **`review_actions`** — the vetting stage logs `pipeline_failed` as an *action* (not a status) when the in-app pipeline gives up.
- **`processed_stripe_events`** — unrelated to the pipeline; owned by the Stripe webhook.

`markPriorPipelineRunsSuperseded(letterId)` is called before every in-app
fallback run to flip older `pipeline_runs` rows to `superseded` so queries
return the current attempt.

---

## 4. Model Pins (Default In-App Pipeline)

Canonical source: `server/pipeline/providers.ts`.

| Stage            | Primary model                                      | Failover (`gpt-4o-mini` unless noted) | OSS last resort (Groq) |
| ---------------- | -------------------------------------------------- | -------------------------------------- | ---------------------- |
| 1. Research      | Perplexity `sonar-pro`                              | `gpt-4o-search-preview` (Responses API + `webSearchPreview` tool) | `llama-3.3-70b-versatile` |
| 2. Draft         | Anthropic `claude-sonnet-4-20250514`                | `gpt-4o-mini`                         | `llama-3.3-70b-versatile` |
| 3. Assembly      | Anthropic `claude-sonnet-4-20250514`                | `gpt-4o-mini`                         | `llama-3.3-70b-versatile` |
| 4. Vetting       | Anthropic `claude-sonnet-4-20250514`                | `gpt-4o-mini`                         | `llama-3.3-70b-versatile` |

**Do not refer to Claude Opus anywhere in pipeline code or docs.** The pricing
table in `providers.ts` still lists `claude-opus-4-5` for legacy accounting, but
no active pipeline stage resolves to Opus as of 2026-04-20.

There is a minor logging drift to be aware of: the `workflow_jobs.requestPayloadJson.stages`
array for the in-app fallback still labels stage 2 and stage 3 as
`"openai-gpt4o-mini-draft"` / `"openai-gpt4o-mini-assembly"`
(orchestrator.ts:339), even though the actual code in `drafting.ts`/`assembly.ts`
runs Claude Sonnet 4 first. The label is a historical artifact — the executed
model is governed by `getDraftModel()` / `getAssemblyModel()` in `providers.ts`.
Do not rely on the label when debugging.

Pricing pins (`MODEL_PRICING` in providers.ts): Sonnet 4 and 4.6 → `$3 / $15`
per million; `gpt-4o-mini` → `$0.15 / $0.60`; `sonar-pro` → `$3 / $15`; Groq
llama → `$0 / $0`.

All AI-SDK stages (research/draft/assembly/vetting) use
`AbortSignal.timeout(90_000)`. The constants are exported from providers.ts:
`RESEARCH_TIMEOUT_MS`, `DRAFT_TIMEOUT_MS`, `ASSEMBLY_TIMEOUT_MS`. **The n8n
ack timeout is separate: 10 seconds** (orchestrator.ts:282).

---

## 5. The n8n Outbound Contract

When `useN8nPrimary` is true the orchestrator fires one `POST` request:

```ts
await fetch(resolvedWebhookUrl, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    // n8n webhook uses headerAuth — credential header name is X-Auth-Token
    "X-Auth-Token": n8nCallbackSecret,
  },
  body: JSON.stringify({
    letterId,
    letterType: intake.letterType,
    userId: intake.sender?.name ?? "unknown",
    callbackUrl: `${APP_BASE_URL}/api/pipeline/n8n-callback`,
    callbackSecret: n8nCallbackSecret,
    intakeData: { sender, recipient, jurisdictionState, jurisdictionCountry, matter, desiredOutcome, letterType, tonePreference, financials, additionalContext },
  }),
  signal: AbortSignal.timeout(10_000), // 10s ack
});
```

Notes:

- **Outbound header name is `X-Auth-Token`.** The inbound callback uses a
  *different* header name (`x-ttml-callback-secret`). Both use the same
  `N8N_CALLBACK_SECRET` value. See `ttml-n8n-workflow-integration` for the
  callback side.
- The request is **fire-and-forget for the letter body** — we only await the
  ack. The result letter arrives asynchronously at
  `POST /api/pipeline/n8n-callback` handled by `server/n8nCallback.ts`.
- `resolvedWebhookUrl` auto-rewrites the legacy path
  `ttml-legal-pipeline → legal-letter-submission`.
- On `response.ok` the orchestrator returns (the letter is now in n8n's hands).
  No `workflow_jobs` status gets set to `succeeded` from here — the inbound
  callback handles the terminal transition.

---

## 6. The pg-boss Worker

`server/worker.ts` consumes the `generation_pipeline` queue and calls
`runFullPipeline`. Do **not** call pipeline stages directly from tRPC routers
— always enqueue via `server/queue.ts` helpers so the work runs in the worker
process with the right error/retry semantics.

pg-boss requires a **direct Postgres connection** — the Supabase
transaction pooler on port 6543 is not compatible with pg-boss's listen/notify
usage. Configure `SUPABASE_DIRECT_URL` with the **session pooler (port 5432)**
URL. This is also why Railway → Supabase deployments run
`dns.setDefaultResultOrder("ipv4first")` at process boot — Railway's IPv6-first
resolver combined with Supabase's IPv4-only direct endpoint produces
intermittent `ENETUNREACH` errors without the override.

The worker is gated by `PIPELINE_MODE` the same way the orchestrator is — if
`PIPELINE_MODE=langgraph` is set, the LangGraph entrypoint bypasses pg-boss and
the worker (see `ttml-langgraph-pipeline`).

---

## 7. Stuck-Letter Debugging Playbook

When a user says *"my letter is stuck in researching / drafting"*:

1. **Which mode?** `echo $PIPELINE_MODE`. If `langgraph`, check
   `pipeline_stream_chunks` and the fail-node. If `simple`, a single
   Claude call is either in flight or errored — check Sentry. Otherwise
   continue to the default path checks below.

2. **Is n8n primary?** `echo $N8N_PRIMARY`.
   - If `true`: the letter may be waiting on an n8n callback that never
     arrived. Check n8n's execution history for this `letterId`. If n8n
     completed, confirm `/api/pipeline/n8n-callback` received the inbound
     POST (look for `x-ttml-callback-secret` failures — the endpoint returns
     401 silently on bad headers and 503 if the secret is unset).
   - If `false` / unset: the letter is in the in-app pipeline. Go to step 3.

3. **Which stage?** Query `workflow_jobs` by `letter_request_id` for the most
   recent row. The `requestPayloadJson.stages` array tells you the planned
   order; `status` + `error_message` tell you where it stopped.

4. **Research unverified?** `letters.research_unverified = true` means Stage
   1 fell back to a non-web-grounded provider. Citation revalidation was
   intentionally skipped (orchestrator.ts `applyResearchGroundingAndRevalidate`).

5. **90s timeout?** Every AI-SDK call uses `AbortSignal.timeout(90_000)`. A
   Sentry event with `AbortError` and a 90-second span is the smoking gun.
   Increase the constant in `providers.ts` only for diagnosis — don't ship
   without tests.

6. **Pipeline superseded?** `pipeline_runs.status = 'superseded'` just means a
   newer attempt started; it is not a failure.

7. **`pipeline_failed` action?** A row in `review_actions` with
   `action = 'pipeline_failed'` means the in-app fallback exhausted all
   providers. Revert the letter status manually via an admin tool — the
   orchestrator does not auto-revert.

---

## 8. Status Transitions Owned by the Pipeline

The pipeline itself only drives these transitions (always via
`updateLetterStatus`, never by writing raw SQL). All must satisfy
`ALLOWED_TRANSITIONS` in `shared/types/letter.ts`.

| From          | To                  | Driver                                              |
| ------------- | ------------------- | --------------------------------------------------- |
| `submitted`   | `researching`       | orchestrator start, or LangGraph research node      |
| `researching` | `drafting`          | research stage success                              |
| `drafting`    | `generated_locked`  | vetting stage success **and** letter version persisted |
| `researching` | `submitted`         | n8n callback failure path (`server/n8nCallback.ts` reverts so a retry is possible) |
| *any in-flight* | unchanged         | `pipeline_failed` action logged, status not changed |

`generated_locked → pending_review` is **never** driven by the pipeline —
that transition is owned by the Stripe webhook's `unlockLetterForReview`
in `server/stripeWebhook/handlers/checkout.ts`. The payment gate is real and
the content truncation in `server/routers/versions.ts` enforces it.

---

## 9. Files to Touch (and Files Not to Touch) When Changing the Pipeline

**Touch when adding a stage or provider:**

- `server/pipeline/providers.ts` — model pins, pricing, timeout constants.
- `server/pipeline/{research,drafting,assembly,vetting}.ts` — the actual stage logic.
- `server/pipeline/orchestrator.ts` — wiring only; keep it thin.
- `server/db/pipeline-runs.ts` / `server/db/letter-versions.ts` — if schema changes.
- `drizzle/schema/` — schema migrations.
- `server/pipeline/langgraph/` — mirror the change in the graph if LangGraph mode needs parity.
- `server/pipeline/simple.ts` — only if the ultra-simple path needs updating.

**Don't touch without deliberate cause:**

- `server/n8nMcp.ts` — empty deprecated stub. Don't add logic here; don't
  delete it in the same PR as other work (keeps grep history clean).
- `server/queue.ts` / `server/worker.ts` — pg-boss wiring is fragile;
  isolate changes into their own PR with tests.
- `server/_core/vite.ts`, `drizzle.config.ts`, `vite.config.ts` — out of scope.

---

## 10. Quick Reference: Orchestrator Decision Tree

```
runFullPipeline(letterId, intake)
 │
 ├─ validateIntakeCompleteness ─ fail → throw INTAKE_INCOMPLETE
 │
 ├─ PIPELINE_MODE === "langgraph"?
 │     └─ yes → runLangGraphPipeline() → return
 │
 ├─ PIPELINE_MODE === "simple"?
 │     └─ yes → runSimplePipeline() → return
 │
 ├─ N8N_PRIMARY === "true" && N8N_WEBHOOK_URL is https?
 │     ├─ yes: POST to n8n (10s ack timeout)
 │     │        ├─ 2xx → return (await inbound callback)
 │     │        └─ error → log warn, fall through
 │     └─ no : log "using direct 4-stage pipeline"
 │
 ├─ preflightApiKeyCheck("full") ─ fail → throw API_KEY_MISSING
 ├─ markPriorPipelineRunsSuperseded()
 ├─ createWorkflowJob({ provider: "multi-provider", stages: [...] })
 │
 ├─ Stage 1: runResearchStage()          ─ Perplexity → OpenAI search → Claude → Groq
 ├─ applyResearchGroundingAndRevalidate() ─ citation registry + Perplexity re-verification
 ├─ Stage 2: runDraftingStage()          ─ Claude Sonnet 4 → gpt-4o-mini → Groq
 ├─ Stage 3+4: runAssemblyVettingLoop()  ─ Claude Sonnet 4 assembly + Claude Sonnet 4 vetting
 ├─ finalizeLetterAfterVetting()         ─ persist ai_draft, transition to generated_locked
 │
 └─ autoAdvanceIfPreviouslyUnlocked()    ─ handled by fallback.ts for resumed letters
```

---

## Verification Baseline (2026-04-20)

This skill was verified against:

- `server/pipeline/orchestrator.ts` (lines 114-396)
- `server/pipeline/providers.ts`
- `server/pipeline/langgraph/index.ts`
- `server/pipeline/simple.ts`
- `server/n8nCallback.ts`
- `server/worker.ts` / `server/queue.ts`
- `shared/types/letter.ts` (`ALLOWED_TRANSITIONS`)
- `shared/pricing.ts`

If any of these files changes materially, re-verify and update this skill in
the same PR.
