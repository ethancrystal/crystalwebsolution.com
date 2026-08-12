---
name: ttml-outreach-pipeline
description: "Operate the end-to-end cold outreach pipeline for Talk-to-My-Lawyer: source California B2B prospects, enrich them with verified business emails, send compliant cold outreach through a transactional ESP (SendGrid/Resend/Postmark), and roll the daily loop forward. Use this skill whenever the user mentions outreach, cold email, prospect campaigns, lead pipeline, sending emails to businesses, growing TTML, scraping leads, daily prospect run, refilling the funnel, or any phrase like 'send the next batch', 'run today's outreach', 'enrich these prospects', 'find more landlords/contractors/agencies/ecommerce in California to email'. Trigger even when the user describes the workflow without naming it (e.g. 'I need to email businesses that need legal letters' or 'set up a system to keep finding and emailing prospects'). Do NOT use this skill for one-off email drafting, generic marketing advice, or non-TTML businesses."
---

# TTML Outreach Pipeline

End-to-end daily loop for **Talk-to-My-Lawyer** cold outreach in California: discover → enrich → send → track → refill. Built around CAN-SPAM and California §17529.5 compliance, transactional ESP sending, and human-handled replies.

> **Stack assumed:** transactional ESP API (SendGrid, Resend, or Postmark) · Google Drive for prospect data · Google Sheets as the CRM of record · human inbox for replies · daily cadence of 200–500 emails.

---

## When to run this skill

The user wants to operate or advance the outreach loop. Common triggers:

- "Run today's batch" / "send the next batch" / "do the daily outreach"
- "Find more [vertical] prospects in California to email"
- "Enrich these prospects with emails"
- "Refill the pipeline" / "the queue is getting low"
- "Set up the outreach system" / "design the pipeline"
- Any combination of *prospects + email + send + track + repeat*

---

## Hard rules (read before doing anything else)

These are non-negotiable. Talk-to-My-Lawyer is a legal-adjacent brand; a compliance lapse is existential.

1. **NEVER send to scraped personal addresses.** Only publicly listed business contact emails (`info@`, `contact@`, or named role addresses on a company's official site / verified directory listing). If unsure, drop the prospect.
2. **NEVER send without a verified unsubscribe link** in every email — one-click, working, honored within 10 business days.
3. **NEVER send without the physical business address** of Talk-to-My-Lawyer in every footer (CAN-SPAM requirement).
4. **NEVER use deceptive subject lines** (no fake "Re:", no fake "Fwd:", no "open immediately", no fake urgency).
5. **NEVER exceed 500 sends/day on a single sending domain** in the first 30 days. After warmup, cap at the ESP's recommended ceiling for the domain's reputation tier.
6. **NEVER send to a prospect already in the suppression list** — check on every run.
7. **NEVER claim attorney-client relationship** in any email. TTML is a document service; the email must not imply legal advice.
8. **ALWAYS check California §17529.5 compliance** — California requires the sender to be identifiable, no false header info, and unsubscribe handling within 10 business days. See `references/compliance.md`.

If any rule cannot be satisfied for a given prospect or send, **skip that prospect** and log the reason in the run report.

---

## The daily loop (overview)

```
                  ┌──────────────────────┐
                  │  1. Check pipeline   │
                  │     state & queue    │
                  └──────────┬───────────┘
                             ↓
            ┌────────────────────────────────────┐
            │  2. Refill if queue < 2x daily cap │
            │     (run prospect discovery)       │
            └────────────────┬───────────────────┘
                             ↓
            ┌────────────────────────────────────┐
            │  3. Enrich: verify emails on the   │
            │     batch about to send today      │
            └────────────────┬───────────────────┘
                             ↓
            ┌────────────────────────────────────┐
            │  4. Filter: suppression list,      │
            │     unsubscribes, duplicates       │
            └────────────────┬───────────────────┘
                             ↓
            ┌────────────────────────────────────┐
            │  5. Personalize: vertical-specific │
            │     template + dynamic fields      │
            └────────────────┬───────────────────┘
                             ↓
            ┌────────────────────────────────────┐
            │  6. Send via ESP API (throttled)   │
            └────────────────┬───────────────────┘
                             ↓
            ┌────────────────────────────────────┐
            │  7. Log every send → status sheet  │
            └────────────────┬───────────────────┘
                             ↓
            ┌────────────────────────────────────┐
            │  8. End-of-run report + flag any   │
            │     bounces, complaints, errors    │
            └────────────────────────────────────┘
```

Replies go to a real human inbox — Claude never auto-responds. Reply handling is humans only.

---

## Step-by-step procedure

### Step 1 — Check pipeline state

Read these from Google Drive (use the Drive connector — the user has it):

- `Master Prospects` sheet — the queue. Filter for `outreach_status = "queued"`.
- `Suppression List` sheet — anyone who unsubscribed, bounced hard, or marked spam. Never re-contact.
- `Sent Log` sheet — every send ever made, with timestamp, message ID, status.

Report to the user:
- Queue depth (prospects ready to send)
- Daily cap (default 300; user-configurable)
- Whether refill is needed (queue < 2× daily cap → trigger Step 2)
- Last run date and outcome

### Step 2 — Refill if needed

If the queue is too shallow, run the prospect discovery flow described in `references/prospect-discovery.md`. This is the same logic as the TTML California Prospect Routine — it produces qualified leads across the four target verticals (landlords, contractors, agencies, e-commerce) and appends them to `Master Prospects` with `outreach_status = "queued"`.

After refilling, **resume the daily send**. Do not stop after a refill.

### Step 3 — Enrich the daily batch

Pull the next `daily_cap` prospects from the queue. For each one, verify the email:

1. **Format check** — valid syntax, real TLD, no obvious typos.
2. **Domain check** — domain has MX records, isn't a known disposable provider, isn't a free webmail (free webmail in a B2B context = personal address = drop).
3. **Catch-all check** — if the ESP supports it, flag catch-all domains; send to them but lower priority.
4. **Pattern verification** — if the email was inferred (e.g. `first.last@domain`), confirm it's the pattern the company actually uses.

If a prospect's email can't pass verification, **move it to `enrichment_failed`** and pull the next one to keep the batch full.

Tools for this: an email-verification API (NeverBounce, ZeroBounce, Million Verifier) if the user has one connected. If not, do the format + MX + free-webmail checks manually and flag the rest as `unverified` for human review.

### Step 4 — Filter

Cross-reference the day's batch against:
- The suppression list
- The sent log (anyone contacted in the last 14 days — frequency cap)
- The unsubscribe table (separate sheet, never sent to again)
- The exclusion list (competitors, law firms, in-house counsel detected, the user's own domain)

Drop anyone hitting any filter. Log the reason.

### Step 5 — Personalize

For each prospect, select the vertical-specific template from `references/templates.md`. The template has dynamic fields:

- `{first_name}` — from `contact_name`
- `{company_name}`
- `{city}`
- `{vertical_specific_hook}` — a one-liner from `references/hooks.md` keyed by vertical
- `{suggested_letter_type}` — from the prospect row
- `{calendar_link}` — TTML's booking link (user-configured)
- `{unsubscribe_link}` — ESP-generated, one-click
- `{physical_address}` — TTML's business address

If any required field is blank for a prospect, **skip that prospect** rather than send a broken email.

Vary the **subject line** across the batch — at least three rotations per vertical to avoid spam fingerprinting. See `references/templates.md` for subject pools.

### Step 6 — Send

Use the ESP API. Configuration is in `references/sender-setup.md`. Key send-time rules:

- **Throttle:** 1 send every 8–12 seconds (≈ 300–450/hour). Never burst.
- **Spread across the day:** distribute the batch over 4–6 hours, weighted toward 9–11am and 1–3pm PT.
- **One sending domain at a time:** if the user has multiple, rotate by day, not by message.
- **Stop conditions:** stop the batch immediately if bounce rate exceeds 5% or complaint rate exceeds 0.3% mid-run, and flag for human review.

The send call must include:
- `From:` a real human name at the sending domain (e.g. `Alex from Talk-to-My-Lawyer <alex@send.talktomyl awyer.com>`)
- `Reply-To:` the human inbox where replies actually go
- `List-Unsubscribe:` header (RFC 8058 one-click)
- Plain-text alternative version (every HTML email must have a text twin)
- Custom args / metadata: `prospect_id`, `vertical`, `template_version`, `batch_id` so webhooks can update the sheet

### Step 7 — Log

Every send result writes a row to the `Sent Log` sheet:

| Column | Source |
|---|---|
| sent_at | timestamp at send time |
| prospect_id | from the queue |
| email | the recipient |
| vertical | V1/V2/V3/V4 |
| template_id | which template was used |
| subject_id | which subject rotation |
| message_id | ESP message ID for tracking |
| status | sent / failed / skipped |
| failure_reason | if status != sent |
| batch_id | unique per daily run |

Update `Master Prospects.outreach_status` to `sent` for everyone in the batch (or `failed` / `skipped` with reason).

### Step 8 — End-of-run report

Output in chat:
- Batch ID and date
- Sent / failed / skipped counts
- Bounce rate (from ESP webhooks if available)
- Queue depth remaining
- Estimated days until next refill needed
- Any anomalies (high failure rate, ESP errors, suppression growth)

---

## What this skill does NOT do

- **Reply handling.** Replies route to the human inbox configured in `Reply-To`. Claude never auto-responds. If the user asks Claude to "check replies", point them at the inbox and offer to help draft individual responses one-by-one — never bulk-respond.
- **Follow-up sequences.** Multi-touch drip sequences are a separate workflow. This skill is single-touch first-contact only. If the user wants follow-ups, that's a separate pipeline (mark a future task).
- **A/B testing infrastructure.** The skill supports subject rotation but not full split-test math. Track results in the sent log and review manually.
- **CRM sync beyond Google Sheets.** If the user has HubSpot/Pipedrive, suggest a Zapier bridge — don't try to write a direct integration.

---

## Configuration (must be set before first run)

The user must provide these once. Store them in a `Config` sheet in the same Drive folder:

| Key | Example | Required |
|---|---|---|
| `esp_provider` | `sendgrid` / `resend` / `postmark` | yes |
| `esp_api_key` | (the API key — keep in env or sheet) | yes |
| `sending_domain` | `send.talktomyl awyer.com` | yes |
| `from_name` | `Alex from Talk-to-My-Lawyer` | yes |
| `reply_to_inbox` | `replies@talktomyl awyer.com` | yes |
| `physical_address` | TTML's business address (CAN-SPAM) | yes |
| `unsubscribe_url_template` | `https://...?token={token}` | yes |
| `calendar_link` | Cal.com / Calendly URL | yes |
| `daily_cap` | `300` | yes |
| `email_verifier_api_key` | NeverBounce / ZeroBounce key | optional |
| `min_score_to_send` | `6` (skip prospects below this score) | optional, default 5 |

If any required key is missing, **stop and ask the user before running**.

---

## When to consult reference files

The references/ folder has the detailed material kept out of this top-level file:

- **`references/compliance.md`** — CAN-SPAM and California §17529.5 specifics. Read before the first send, or any time the user asks about legal risk, unsubscribe handling, or what's allowed.
- **`references/sender-setup.md`** — SPF / DKIM / DMARC setup, domain warmup schedule, ESP-specific API call examples. Read when setting up a new sending domain or switching ESPs.
- **`references/prospect-discovery.md`** — The refill flow (vertical anchors, qualification scoring, output schema). Read on Step 2 of every run when refill is needed.
- **`references/templates.md`** — Vertical-specific email templates and subject pools. Read on Step 5 of every run.
- **`references/hooks.md`** — One-liner pain-point hooks per vertical, refreshed quarterly. Read on Step 5.
- **`references/troubleshooting.md`** — Bounce spikes, complaint spikes, ESP suspension, domain blacklisting. Read whenever a run reports anomalies.

---

## Self-check before ending any run

Before declaring the run complete, confirm:

- [ ] Every send had a working unsubscribe link
- [ ] Every send had the TTML physical address
- [ ] No subject lines were deceptive
- [ ] Bounce rate stayed under 5%
- [ ] Complaint rate stayed under 0.3%
- [ ] Sent log was updated for every prospect in the batch
- [ ] `Master Prospects.outreach_status` was updated to `sent` / `failed` / `skipped`
- [ ] End-of-run report was delivered to the user
- [ ] If queue is now < 1× daily cap, flag the user to run refill before tomorrow

If any item fails, surface it in the report. Do not silently pass.
