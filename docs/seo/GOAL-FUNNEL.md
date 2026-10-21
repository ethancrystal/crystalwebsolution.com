# Goal Funnel — Qualified Organic Inquiries

> **Owner:** MJ. **Status:** written 2026-09-20, pending GA4/ACROSS API access to Hermes.
> **Source of truth for the goal metric:** GA4 `generate_lead` events on property
> `552972119`, filtered to `google/organic` and `bing/organic`, reconciled against
> the CRM (new contact-form submissions or new CRM contact/deal records whose
> GA4 session source/medium is organic, asking for a live `/services/*` offer or
> `/services/seo`). Until the Hermes job has read access to GA4 and ACROSS, every
> run writes **goal metric: unavailable this run** — never estimate.

## 1. Goal definition (locked)

A **qualified organic inquiry** is:

- A new contact-form submission **or** a new CRM contact/deal record
- Whose GA4 session `source` / `medium` is `google / organic` or `bing / organic`
- Asking for a service that is on the **live `/services/*` list** (the nine entries
  in `lib/servicePages.mjs` — web-design, web-development, branding, logo-design,
  digital-marketing, animation, ai-automation, workflow-automation, seo) **or**
  `/services/seo` once it ships
- Not a quote request for a service the studio does not currently offer
  (e.g. Shopify, which remains parked in `KEYWORD-REGISTRY.md`; its legacy
  direct-response route is noindex and excluded from the sitemap)

**Not the goal (leading indicators only, never substituted):**

- Rankings for any term
- GSC impressions or clicks
- Organic sessions or users
- Any keyword-position metric

These are reported as leading indicators each run. They do not count as the goal.

## 2. Targets (clock starts at the 2026-09-03 relaunch)

| Checkpoint | Date | Target |
|---|---|---|
| T+90 | 2026-12-02 | ≥ 1 qualified organic inquiry (proves funnel end to end) |
| T+180 | 2027-03-02 | ≥ 5 qualified organic inquiries **per month** |
| T+365 | 2027-09-03 | ≥ 15 qualified organic inquiries **per month** |

"Per month" at T+180 and T+365 means the trailing-month count, not a calendar month.

## 3. Current measurement gap

| Asset | State |
|---|---|
| GA4 property `552972119` | Code is shipped (`lib/analytics.mjs` fires client-side `page_view` and `trackEvent`; `app/contact/submit.mjs` fires a server-side Measurement Protocol event). Property exists. |
| GA4 → Hermes read access | **Not wired.** The Hermes job cannot read GA4 events or sessions. Goal metric is unavailable this run. |
| ACROSS / CRM read access | **Not wired.** Cannot reconcile GA4 sessions against CRM contact/deal records from the job. |
| `app/contact/submit.mjs` conversion event | **Live on the site.** Fires a Measurement Protocol event on successful submission using `GOOGLE_ANALYTICS_MEASUREMENT_ID` + `GOOGLE_ANALYTICS_QA_API_SECRET` env vars. |
| Event name used | Confirmed from `submit.mjs` line 115: a named event is sent. The exact event name is whatever `eventName` is bound to at call time — verify it is `generate_lead` or an equivalent conversion event registered in GA4. |
| Consent Mode v2 | Shipped (`lib/analytics.mjs`): all four signals start `denied`. GA4 can model conversions until a visitor grants. This is the correct default. |

## 4. Funnel wiring plan — steps to complete when access is live

These steps are sequenced. Do them in order; each unlocks the next.

### 4a. Confirm the conversion event name in GA4

Read `app/contact/submit.mjs` and find the `eventName` variable bound at the Measurement Protocol call (line 115 area). Confirm in GA4 (once API access is live) that:

- The event is registered as a **conversion** in GA4 (Admin → Conversions, or via the Events report)
- The event name matches what the code sends

If the code sends something other than `generate_lead`, decide: rename the code event to `generate_lead`, or register the existing name as a conversion. Either is fine; document which was chosen.

### 4b. Wire GA4 read access to Hermes

Required for the goal metric to leave "unavailable this run":

- GA4 API access for the Hermes job — service account with access to property `552972119`
- The GA4 service account email added as a user on the GA4 property with at least **Viewer** access (Reader-level permission on the property)
- The credential surfaced to the Hermes job as an env var or config the CDS-SEO daily run can read
- ACROSS/CRM read access for the same job, so the GA4 session can be reconciled against a CRM contact/deal record

Until both 4b items are live, every run writes **goal metric: unavailable this run**.

### 4c. Define the "qualified" filter (once 4b is live)

A session counts as a qualified organic inquiry source when **all** of:

1. `source` = `google` or `bing`
2. `medium` = `organic`
3. The session fired a conversion event (the one confirmed in 4a) during the contact-form submission
4. The submitted brief asks for a **live** `/services/*` offer (or `/services/seo` once it ships)

The "live offer" check is a content filter on the brief text, not a GA4 field. It is applied by reading the contact form submission (the CRM record, or the submitted brief) and confirming the requested service is on the current live list. This filter is what separates a "qualified" inquiry from an unqualified one — it is the heart of the goal definition and must not be skipped.

### 4d. De-duplication rule

A single visitor may submit the form more than once. For the goal count, count **unique CRM contact records** created from organic sessions in the measurement window, not raw form submissions. If a visitor submits twice from the same organic session and one CRM contact record is created, that is one inquiry. If two separate CRM contact records are created from two organic sessions, that is two inquiries.

This rule prevents form-spam or repeated submissions from inflating the goal count. Document the de-duplication method when it is implemented.

### 4e. Leading-indicator reporting each run

Even before 4b is live, each run reports (from Ubersuggest as a temporary source, clearly labelled as third-party estimate until GA4 access exists):

- GSC impressions per pillar URL (once GSC access is wired — currently not wired)
- GSC clicks per pillar URL (same)
- Position per STRATEGY.md §6 target term (Ubersuggest rank tracking, labelled as estimate)
- Organic sessions (Ubersuggest, labelled as estimate until GA4 access exists)

Once GA4 access is live, replace the Ubersuggest estimate rows with GA4 first-party figures for the same metrics.

## 5. Miss handling

| Checkpoint | Miss behavior |
|---|---|
| T+90 miss | Document the miss. Continue. One inquiry is a proof-of-funnel milestone, not a strategy trigger. |
| T+180 miss | **Run the §6 audits** (site-seo-audit, AI-visibility checklist, week-over-week). Do **not** change the strategy — the strategy (pillar + cluster, four themes) is not up for revision at T+180. Audit the funnel: is the page indexed? Is the form firing? Is attribution working? Are the cluster pages live and linking up? Report findings. |
| T+365 miss | **Escalate to MJ as a strategy question.** This is the only checkpoint that triggers a strategy conversation. Before escalating, assemble: the §6 audit findings, the leading-indicator trend, the qualified-inquiry count and de-duplication record, and any evidence that the pillar page is not attracting the target intent. |

## 6. Open decisions (need MJ's input before the plan is fully specified)

These three items affect how the funnel and page are wired. They are not blocking the page from shipping — the page is correct either way — but they affect the funnel-wiring specifics.

### 6a. Which conversion path is authoritative for the goal metric?

Options:

- **Site contact form (`/contact`)** — the form that already exists and already fires a GA4 event from `submit.mjs`. Simplest. The `/services/seo` CTA points here.
- **A separate `/services/seo` inquiry form** — a dedicated form on the SEO page. More specific attribution per pillar, but adds a second form endpoint to maintain.
- **A CRM deal pipeline** — the lead enters the CRM as a deal and the CRM is the system of record. Cleanest for reconciliation, but requires the CRM to be the funnel endpoint and GA4 to be wired to it.

**Recommendation:** start with the existing `/contact` form. It already fires a GA4 event. The pillar page CTA points to `/contact`. If a dedicated `/services/seo` form is wanted later for cleaner per-pillar attribution, it can be added without changing the existing funnel.

**Blocked on:** MJ's preference.

### 6b. Is `/services/seo` a paid service or a lead-gen pillar?

Options:

- **Paid service** — SEO is one of the studio's logged service offers, sold at scoped rates. The page copy positions it as such; `priceSpecification` in schema can be a specific offer or a price range if the studio ever publishes one.
- **Lead-gen pillar** — the page exists to capture SEO-interested prospects and route them to `/contact`, where the actual scope and offer are determined in the brief. Copy positions it as "find out what's possible" / "send the brief." `priceSpecification: NotIncluded` in schema.

**Current implementation:** lead-gen-first. The page ships with `priceSpecification: NotIncluded`, CTA to `/contact`, and no published rate card. This is correct regardless of which answer MJ chooses — if SEO is later confirmed as a paid offer, the copy and schema can shift without changing the URL. If it stays lead-gen, no change is needed.

**Blocked on:** MJ's commercial decision. Not blocking the page ship.

### 6c. GA4 / ACROSS API access status for this job

The funnel can be instrumented on the page side (the submit event already fires) without API access. But the goal metric — the thing the T+90/T+180/T+365 targets are measured against — requires the Hermes job to **read** GA4 and reconcile with the CRM.

Current state: **access is not wired.** Every run writes **goal metric: unavailable this run** until it is.

**What access is needed:**

- GA4 API: service account with Viewer access to property `552972119`, credential available to the Hermes job
- CRM/ACROSS read: the Hermes job can read the CRM to reconcile GA4 sessions against contact/deal records

**Blocked on:** MJ wiring the access (same category as Slack webhook, GSC service account, Bing API key — the "pending on MJ" list from the handover).

## 7. Relationship to the pillar page

The `/services/seo` page (`app/seo/page.jsx`) is the top-of-funnel entry point for the SEO/CRO theme. Its job for the goal is:

1. Rank for the head term (`seo agency near me`, 22,200/mo, diff 57 — Ubersuggest US 2840, 2026-09-19, estimate)
2. Send interested visitors to `/contact` via the CTA
3. The `/contact` form fires the GA4 conversion event
4. The event + organic session attribution + CRM record = one qualified organic inquiry

Steps 1–3 are live once the page ships and the form continues to fire. Step 4 requires GA4 + CRM read access (section 4b) before the goal metric can be reported.

The page does not need to change to support the funnel — it already points to `/contact`. The funnel wiring (4a–4e) is a measurement-layer task, not a page task. They are sequenced, not coupled.

## 8. What "goal metric: unavailable this run" means in practice

Each CDS-SEO daily run log will carry a line like:

```
goal metric: unavailable this run
reason: GA4 read access not wired to Hermes job (pending on MJ); GA4 property 552972119 exists, conversion event fires from app/contact/submit.mjs, but the job cannot read events or reconcile against CRM until API access is live.
leading indicators: <whatever is measurable from Ubersuggest / GSC this run, each labelled with source and date>
```

This is not a defect in the funnel. It is an honest admission that the measurement layer is not yet reachable by the job. The funnel can be correct and the goal metric still unavailable — they are different layers.

The goal metric becomes available the moment GA4 + CRM read access is wired (section 4b). At that point, each run can report the T-counter and the trailing-month qualified inquiry count against the targets in section 2.
