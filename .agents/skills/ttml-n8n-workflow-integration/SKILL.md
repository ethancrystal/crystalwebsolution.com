---
name: ttml-n8n-workflow-integration
description: n8n workflow integration for the TTML letter pipeline. Use when configuring the optional N8N_PRIMARY path, debugging the /api/pipeline/n8n-callback route, designing an n8n workflow that mirrors the in-app 4-stage pipeline, or troubleshooting why letters route through (or past) n8n. Aligned to the 2026-04-20 repository state where the n8n MCP path has been removed and only a webhook-based integration remains.
---

# n8n Workflow Integration — TTML (verified 2026‑04‑20)

## What Changed From The Previous Audit

This SKILL replaces earlier guidance that described a dual-transport "MCP preferred, webhook fallback" architecture. As of the April 16, 2026 cleanup:

- **`server/n8nMcp.ts` is an empty deprecated stub.** The n8n MCP code path is gone. Do not reference `N8N_MCP_URL`, `N8N_MCP_BEARER_TOKEN`, or any MCP tool registry for n8n.
- **Webhook-only integration.** The only way to route through n8n is the plain HTTPS webhook, gated by `N8N_PRIMARY=true` + `N8N_WEBHOOK_URL`.
- **Claude Sonnet 4**, not Claude Opus, drives Draft / Assembly / Vetting. The n8n workflow should pin `claude-sonnet-4-20250514` to match.
- **Callback is async.** The orchestrator fires the webhook, gets a 10-second ack, and returns. n8n finishes the work on its own time and POSTs results to `/api/pipeline/n8n-callback`.
- **Fallback to in-app is automatic.** If the webhook returns non-2xx, times out, or throws, the orchestrator falls through to the in-app 4-stage pipeline (Perplexity → Claude Sonnet 4 × 3).

---

## Architecture Overview

```
Subscriber submits letter → pg-boss job → server/worker.ts → runFullPipeline
                                                                 │
                                                                 ▼
                                                  server/pipeline/orchestrator.ts
                                                                 │
                      ┌──────────────────────────────────────────┼──────────────────────────┐
                      │                                          │                          │
              PIPELINE_MODE=langgraph                  PIPELINE_MODE=simple        (default, 2-tier chain)
                      │                                          │                          │
                      ▼                                          ▼                          ▼
            runLangGraphPipeline                       runSimplePipeline         ┌──────────────────┐
              (StateGraph)                          (Claude-only)                │  useN8nPrimary?  │
                                                                                  └──────┬───────────┘
                                                                                         │
                                                             N8N_PRIMARY=true + https:// │ false
                                                             ────────────────────────────┼──────────────
                                                                                         ▼
                                                       ┌──────────────────────┐   In-app 4-stage chain
                                                       │ POST n8n webhook     │   (Perplexity + Claude
                                                       │ X-Auth-Token header  │    Sonnet 4 × 3)
                                                       │ 10s AbortSignal ack  │
                                                       └─────┬────────────────┘
                                                             │ async
                                                             ▼
                                            POST /api/pipeline/n8n-callback
                                            (header: x-ttml-callback-secret)
                                                             │
                                                             ▼
                                        server/n8nCallback.ts → create letter_versions,
                                                               updateLetterStatus(generated_locked)
```

The key gate is in `server/pipeline/orchestrator.ts` (verified):

```ts
const useN8nPrimary =
  process.env.N8N_PRIMARY === "true" &&
  !!n8nWebhookUrl &&
  n8nWebhookUrl.startsWith("https://");
```

If `useN8nPrimary` is false, the orchestrator logs `"N8N_PRIMARY not set — using direct 4-stage pipeline (primary path)"` and proceeds to the in-app chain.

---

## Environment Variables

```env
# Route through n8n when true; otherwise run the in-app pipeline (default)
N8N_PRIMARY=false

# HTTPS webhook URL registered in n8n (Webhook Trigger node)
N8N_WEBHOOK_URL=https://n8n.example.com/webhook/legal-letter-submission

# Shared secret, used for BOTH directions:
#   - App → n8n:  sent in X-Auth-Token header (orchestrator.ts line 279)
#   - n8n → App:  expected in x-ttml-callback-secret header (n8nCallback.ts line 87)
N8N_CALLBACK_SECRET=whsec_...

# Canonical app domain used when building the callbackUrl in payloads
APP_BASE_URL=https://www.talk-to-my-lawyer.com
```

> **MCP env vars are retired.** `N8N_MCP_URL`, `N8N_MCP_BEARER_TOKEN`, and any "bearer" auth variant no longer exist in `server/_core/env.ts`. Do not add them back.

---

## Critical Rules (MUST Follow)

1. **[DORMANT BY DEFAULT]** n8n must not run unless `N8N_PRIMARY === "true"` *and* `N8N_WEBHOOK_URL` starts with `https://`. The HTTP-vs-HTTPS check is enforced in `orchestrator.ts`.

2. **[WEBHOOK-ONLY]** There is no MCP path anymore. `server/n8nMcp.ts` is an intentional empty stub (`export {};`). Do not re-introduce `@modelcontextprotocol/sdk` or any MCP client to call n8n.

3. **[AUTH HEADERS — TWO DIRECTIONS, ONE SECRET]**
   - Outbound (app → n8n): the app sends `X-Auth-Token: <N8N_CALLBACK_SECRET>` on the webhook POST.
   - Inbound (n8n → app): n8n must send `x-ttml-callback-secret: <N8N_CALLBACK_SECRET>` on the callback POST.
   Both match the same `N8N_CALLBACK_SECRET` env var. The callback comparison uses `crypto.timingSafeEqual` on equal-length buffers; length mismatch is also a 401.

4. **[10s ACK TIMEOUT]** The outbound webhook fetch is wrapped in `AbortSignal.timeout(10000)`. This is the *ack* timeout — n8n is not expected to do the real work in 10s. It acknowledges, we return, n8n does the work and POSTs the callback.

5. **[GRACEFUL FALLBACK]** Non-2xx response, timeout, or any thrown error from the webhook path MUST fall through to the in-app 4-stage pipeline. Failure is recorded on the `workflow_jobs` row (status `"failed"`, `errorMessage` formatted via `formatStructuredError(PIPELINE_ERROR_CODES.N8N_ERROR, …)`) and the orchestrator continues. No user-visible error.

6. **[STALE URL AUTO-CORRECTION]** If the configured `N8N_WEBHOOK_URL` contains `ttml-legal-pipeline`, orchestrator rewrites the path to `legal-letter-submission` at call time. Don't rely on this — fix the env var — but know the protection exists.

7. **[CALLBACK SECRET REQUIRED]** The callback route refuses all requests (503) if `N8N_CALLBACK_SECRET` is unset. Missing header or bad length is 401.

8. **[STATUS DISCIPLINE]** The status machine must go `submitted → researching → drafting → generated_locked`. The orchestrator sets `researching` just before firing the webhook. The callback advances `researching → drafting → generated_locked` in two logged steps. On failure the callback reverts `researching → submitted` (not `pipeline_failed`) so the letter is retriable.

9. **[SAME STORAGE SHAPE]** Whatever n8n produces must land in the same tables the in-app pipeline uses: a `letter_versions` row (`versionType: "ai_draft"`), updated `letter_requests.status` + `currentAiDraftVersionId`, and a `workflow_jobs` row per stage. Never invent a parallel table.

10. **[NO `pipeline_failed` FROM N8N]** The callback must not set `letter_requests.status = "pipeline_failed"` — only local failure paths do. Otherwise you lose the retry affordance.

11. **[JURISDICTION]** The payload already contains structured `jurisdictionState` / `jurisdictionCountry`. n8n should not re-derive jurisdiction — use what was sent. If you must, fall back to `"CA"` only as last resort and mark `research_runs.jsonRaw` accordingly.

12. **[MODEL PINS]** The in-app chain uses `claude-sonnet-4-20250514` (see `server/pipeline/providers.ts`). If the n8n workflow calls Anthropic directly, use the same model ID. Do **not** use Claude Opus anywhere in the letter pipeline.

13. **[SERVICE-ROLE WRITES]** If n8n writes directly to Supabase, it must use the **service_role** key (bypasses RLS). Never put this key in any client-visible place. Rotate immediately if it leaks.

14. **[PAYWALL EMAIL]** The callback does **not** send the paywall notification email directly. The `paywallEmailCron` job (`POST /api/cron/paywall-emails`) picks up letters 10–15 minutes after they land in `generated_locked`. Don't short-circuit this.

15. **[AUTO-ADVANCE]** `autoAdvanceIfPreviouslyUnlocked` runs at the end of the callback for letters the subscriber has already paid to unlock previously (subsequent revisions). If this throws, it's logged and swallowed — the callback response has already been sent.

---

## Outbound Payload (App → n8n)

Built in `server/pipeline/orchestrator.ts` (verified shape):

```ts
{
  letterId: number,                // letter_requests.id
  letterType: string,              // "demand_letter" | ...
  userId: string,                  // currently set to intake.sender?.name (legacy; treat as opaque)
  callbackUrl: string,             // `${APP_BASE_URL}/api/pipeline/n8n-callback`
  callbackSecret: string,          // N8N_CALLBACK_SECRET (also sent in X-Auth-Token header)
  intakeData: {
    sender: { name, address, email?, phone? },
    recipient: { name, address, email? },
    jurisdictionState: string,     // "" allowed
    jurisdictionCountry: string,   // "US" default
    matter: { subject, description, ... },
    desiredOutcome: string,
    letterType: string,
    tonePreference: string,
    financials: object | null,
    additionalContext: string,
  }
}
```

Request is sent with:

```ts
fetch(resolvedWebhookUrl, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Auth-Token": N8N_CALLBACK_SECRET,
  },
  body: JSON.stringify(payload),
  signal: AbortSignal.timeout(10_000),
});
```

n8n's Webhook Trigger node must be configured with **Header Auth** → header name `X-Auth-Token`. Header auth is the only supported scheme; Basic Auth / Bearer are not handled by the orchestrator.

---

## Inbound Callback (n8n → App)

Route: `POST /api/pipeline/n8n-callback` (registered via `registerN8nCallbackRoute` in `server/n8nCallback.ts`).

Required header:

```
x-ttml-callback-secret: <N8N_CALLBACK_SECRET>
```

### Callback payload shape (verified from `n8nCallback.ts`)

```ts
interface N8nCallbackPayload {
  letterId: number;
  success: boolean;

  // Aligned 4-stage output (preferred)
  researchPacket?: ResearchPacket;   // Stage 1 structured
  draftOutput?: DraftOutput;          // Stage 2 structured
  assembledLetter?: string;           // Stage 3 polished text
  vettedLetter?: string;              // Stage 4 vetted text
  vettingReport?: {
    citationsVerified: number;
    citationsRemoved: number;
    citationsFlagged: string[];
    bloatPhrasesRemoved: string[];
    jurisdictionIssues: string[];
    factualIssuesFound: string[];
    changesApplied: string[];
    overallAssessment: string;
    riskLevel: "low" | "medium" | "high";
  };

  // Legacy / flat output (falls back to local assembly)
  researchOutput?: string;
  draftContent?: string;

  provider?: string;                 // default: derived (n8n-4stage | n8n-3stage | n8n-legacy)
  stages?: string[];                 // informational
  bloatDetected?: number;
  error?: string;                    // when success = false
}
```

### Three flow branches inside the callback

Decision keys:

- `hasVetting = !!(vettedLetter && vettingReport)`
- `isAligned  = !!(researchPacket && draftOutput && assembledLetter)`
- `effectiveFinalLetter = vettedLetter || assembledLetter`
- `effectiveDraft = effectiveFinalLetter || draftOutput?.draftLetter || draftContent`

Flow 1 — **Aligned 4-stage** (`hasVetting`):
- Tag `providerTag = "n8n-4stage"`.
- Store `ai_draft` version with `stage: "vetted_final"`, include `vettingReport` + `bloatDetected` in metadata.
- `updateLetterStatus(letterId, "generated_locked")`.
- Log `ai_pipeline_completed` with `fromStatus: "drafting", toStatus: "generated_locked"`.

Flow 2 — **Aligned 3-stage** (`isAligned`, no vetting):
- Tag `providerTag = "n8n-3stage"`.
- Store `ai_draft` with `stage: "n8n-assembly"`.
- Same status + log transitions as flow 1.

Flow 3 — **Legacy flat** (`draftContent` only):
- Tag `providerTag = "n8n-legacy"`.
- Store `ai_draft` with `stage: "n8n-pipeline"`.
- Run the local `runAssemblyStage(letterId, intake, research, draft)` to polish the legacy draft into the canonical assembled + vetted letter.
- If local assembly throws, fall back to storing n8n's raw draft as final and mark `generated_locked` with `noteText: "Local assembly skipped."`.

Failure branch (`success === false` or `effectiveDraft` missing):
- Revert to `"submitted"`, log `action: "pipeline_failed"`, set `fromStatus: "researching", toStatus: "submitted"`. No email.

### Research version side-write

If `researchPacket.researchSummary` is present, the callback *additionally* writes a second `ai_draft` letter version containing the research summary + structured packet metadata (`stage: "research"`). This gives attorney reviewers the provenance without polluting the drafting version. Failure is logged and swallowed.

---

## n8n Workflow Design (Aligned 4-Stage, recommended)

```
1. Webhook Trigger (POST, Header Auth via X-Auth-Token)
   ↓
2. Extract Jurisdiction (JS code node — pass through intakeData.jurisdictionState)
   ↓
3. Research Stage  — Perplexity sonar-pro
   ↓
4. Draft Stage     — Anthropic claude-sonnet-4-20250514
   ↓
5. Assembly Stage  — Anthropic claude-sonnet-4-20250514
   ↓
6. Vetting Stage   — Anthropic claude-sonnet-4-20250514 (retry loop on critical issues)
   ↓
7. Respond to Callback (HTTP Request → /api/pipeline/n8n-callback)
   Headers:
     x-ttml-callback-secret: {{ $json.callbackSecret }}
   Body:
     {
       "letterId": {{ $json.letterId }},
       "success": true,
       "researchPacket": { ... structured ... },
       "draftOutput":    { ... structured ... },
       "assembledLetter": "…",
       "vettedLetter":    "…",
       "vettingReport":   { ... structured ... },
       "provider":        "n8n-4stage",
       "stages":          ["research","draft","assembly","vetting"],
       "bloatDetected":   0
     }
```

### Webhook Trigger node (Step 1)

- **Method:** POST
- **Path:** `/webhook/legal-letter-submission` (must match `N8N_WEBHOOK_URL`)
- **Authentication:** Header Auth — header name `X-Auth-Token`, credential value = app's `N8N_CALLBACK_SECRET`.
- **Response Mode:** Respond Immediately (just an ack — the real result goes via the callback).

### Research Stage (Step 3)

Use an HTTP Request node against the Perplexity `/chat/completions` endpoint with `model: "sonar-pro"`. Persist the response verbatim into `researchPacket.researchSummary`. If Perplexity fails, fall back to the Anthropic node with Claude Sonnet 4 (no web grounding) and set `researchPacket.webGrounded = false` so the attorney knows.

### Draft / Assembly / Vetting Stages (Steps 4–6)

Anthropic node (or HTTP Request to `/v1/messages`). Use `claude-sonnet-4-20250514` explicitly. The exact prompts live in `server/pipeline/prompts.ts` and `server/pipeline/vetting-prompts.ts` in the app repo — keep the n8n workflow aligned.

Vetting retry loop: on `riskLevel === "high"` or non-empty `factualIssuesFound`, loop back to Assembly with the vetting feedback appended. Cap at 2 retries; then emit the draft with `vettingReport.overallAssessment` flagging remaining concerns.

### Respond to Callback (Step 7)

**Do not** use the Webhook node's built-in "Respond to Webhook" for the final result — that only works inside the 10s ack window. Use a separate HTTP Request node that POSTs to `callbackUrl` (which the app passed in the original payload), with `x-ttml-callback-secret` header set to `$json.callbackSecret`.

---

## Error Handling in n8n

Attach an Error Trigger to the workflow. On any step error:

```javascript
// HTTP Request → POST {{ $json.callbackUrl }}
// Headers: x-ttml-callback-secret: {{ $json.callbackSecret }}
return {
  json: {
    letterId: $json.letterId,
    success: false,
    error: ($node["Error Trigger"].json.error?.message ?? "unknown n8n error").slice(0, 2000),
    provider: "n8n-4stage",
    stages: [],
  },
};
```

The callback will:
- Revert status to `submitted`
- Log `action: "pipeline_failed"`
- **Not** email the subscriber (the orchestrator will either re-trigger this letter or the user can resubmit)

---

## Testing n8n Integration

### Manual webhook test (app → n8n)

```bash
curl -X POST "$N8N_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: $N8N_CALLBACK_SECRET" \
  -d '{
    "letterId": 99999,
    "letterType": "demand_letter",
    "userId": "test-sender",
    "callbackUrl": "https://www.talk-to-my-lawyer.com/api/pipeline/n8n-callback",
    "callbackSecret": "'"$N8N_CALLBACK_SECRET"'",
    "intakeData": {
      "sender":    { "name": "John Doe",   "address": "123 Main St, Los Angeles, CA 90001" },
      "recipient": { "name": "Jane Smith", "address": "456 Oak Ave, Los Angeles, CA 90002" },
      "jurisdictionState": "CA",
      "jurisdictionCountry": "US",
      "matter": { "subject": "Unpaid invoice", "description": "Services rendered not paid." },
      "desiredOutcome": "Payment in full within 14 days.",
      "letterType": "demand_letter",
      "tonePreference": "professional",
      "financials": null,
      "additionalContext": ""
    }
  }'
```

### Manual callback test (n8n → app)

```bash
curl -X POST "${APP_BASE_URL}/api/pipeline/n8n-callback" \
  -H "Content-Type: application/json" \
  -H "x-ttml-callback-secret: $N8N_CALLBACK_SECRET" \
  -d '{
    "letterId": 99999,
    "success": true,
    "provider": "n8n-4stage",
    "stages": ["research","draft","assembly","vetting"],
    "researchPacket": { "researchSummary": "…", "jurisdictionProfile": { "country": "US", "stateProvince": "CA", "city": "", "authorityHierarchy": ["Federal","State","Local"] }, "issuesIdentified": [], "applicableRules": [], "localJurisdictionElements": [], "factualDataNeeded": [], "openQuestions": [], "riskFlags": [], "draftingConstraints": [] },
    "draftOutput":    { "draftLetter": "…", "attorneyReviewSummary": "…", "openQuestions": [], "riskFlags": [] },
    "assembledLetter": "FINAL ASSEMBLED LETTER TEXT …",
    "vettedLetter":    "FINAL VETTED LETTER TEXT …",
    "vettingReport":   { "citationsVerified": 3, "citationsRemoved": 0, "citationsFlagged": [], "bloatPhrasesRemoved": [], "jurisdictionIssues": [], "factualIssuesFound": [], "changesApplied": ["Tightened phrasing"], "overallAssessment": "Solid draft.", "riskLevel": "low" },
    "bloatDetected":   0
  }'
```

Expect `{"received": true, "letterId": 99999, "provider": "n8n-4stage"}` and a new `letter_versions` row.

### Integration test (vitest)

`server/phase73-n8n-alignment.test.ts` already covers the aligned 4-stage callback happy path. Extend it for:

- Legacy (`draftContent`-only) branch → local assembly invoked
- Failure branch (`success=false`) → revert to `submitted`
- 401 on missing `x-ttml-callback-secret`
- 503 when `N8N_CALLBACK_SECRET` is unset

---

## Monitoring & Debugging

Stage history lives on `workflow_jobs`. Roll up with a read-only view:

```sql
CREATE OR REPLACE VIEW public.n8n_metrics AS
SELECT
  date_trunc('hour', created_at)                                                AS hour,
  COUNT(*)                                                                      AS total_jobs,
  COUNT(*) FILTER (WHERE status = 'completed')                                  AS completed_jobs,
  COUNT(*) FILTER (WHERE status = 'failed')                                     AS failed_jobs,
  COUNT(*) FILTER (WHERE status = 'failed' AND error_message ILIKE '%timeout%') AS timeout_jobs
FROM public.workflow_jobs
WHERE provider = 'n8n'
GROUP BY 1
ORDER BY 1 DESC;
```

Expose only to `service_role` / admins — not to `authenticated`.

**Sentry tags** already emitted by `n8nCallback.ts`: `component: "n8n_callback"`, `error_type: "post_response_processing_failed"`. The orchestrator logs n8n failures at `warn` level with the `letterId`.

---

## Related Skills

- **`ttml-pipeline-expert`** — 4-stage pipeline semantics
- **`ttml-pipeline-orchestrator`** — implementation companion (`server/pipeline/orchestrator.ts`, pg-boss, workflow_jobs)
- **`ttml-langgraph-pipeline`** — optional LangGraph replacement for the in-app path (separate env gate, runs before the n8n gate when set)
- **`ttml-payment-subscription-management`** — what happens to the letter after n8n lands it in `generated_locked`
