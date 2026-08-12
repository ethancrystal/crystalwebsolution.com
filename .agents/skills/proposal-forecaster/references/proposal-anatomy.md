# Proposal anatomy

Section-by-section structure and house style for the two modes. Keep proposals tight — a proposal that
respects the reader's time is itself a signal of competence. Aim for 4–8 pages, not 30.

## House style

- **Lead with the number.** The single most important figure (base-case projection) belongs on the
  first page, large. Readers decide whether to keep reading in seconds.
- **Chart before tables, tables before prose.** Embed `metrics_forecast.png` early. People look at the
  picture first; make it carry the story.
- **Plain language, short sentences.** No jargon the reader has to decode. Confidence reads as clarity.
- **One idea per section.** If a section has two jobs, split it.
- **Cite the basis.** Footnote or sidebar the data source and the date range so the numbers feel auditable.
- **Restrained design.** One accent color, generous white space, a clean serif or humanist sans. The
  numbers are the hero; the design should get out of their way. A simple deep-navy + one blue accent on
  white reads as trustworthy and premium.

## Mode A — Internal sales forecast ("how much can WE do")

Audience: owner, partner, investor, or lender. Purpose: a credible plan and target.

1. **Title + headline** — "[Business] Sales Forecast — [period]". Headline: base-case projection in big
   type, with the conservative–aggressive range beneath it.
2. **Where we are** — 2–3 sentences and the history chart. State the trend honestly (growing/flat/down).
3. **The track record** — revenue by year, total to date, YoY/CAGR, average deal size, biggest months.
   A short table plus one line of narrative.
4. **The forecast** — the 3-scenario table (conservative / base / aggressive) with each scenario's annual
   total and the growth assumption behind it, in plain words.
5. **What the base case assumes** — run-rate anchor, growth rate, recurring vs net-new split, churn. The
   reader should be able to argue with each line.
6. **The plan to hit it** — the concrete levers that move base → aggressive: acquisition channels,
   retainer/recurring mix, pricing, capacity. Tie each lever to a slice of the upside.
7. **Risks & sensitivities** — client concentration, a soft recent quarter, channel dependence; what
   would push toward the conservative case and how you'd respond.
8. **Next steps** — the 30/60/90-day actions that start the plan.

## Mode B — Client pitch ("the results YOU could expect")

Audience: a prospect. Purpose: win the engagement by projecting *their* outcome, using your track record
as proof. You usually have little or none of the prospect's historical data, so be explicit about which
numbers are illustrative projections versus your own demonstrated results.

1. **Title + headline** — "[Service] Proposal for [Prospect]". Headline: the prospect's projected gain
   (e.g., projected leads/revenue, or ROI multiple) as a range.
2. **Understanding your goal** — 2–3 sentences showing you get their situation. Personalize.
3. **What we'll do** — scope of services, concrete and specific.
4. **Projected results for you** — the 3-scenario range for the prospect's outcome, with the assumptions
   stated (traffic, conversion, deal size, ramp time). Label clearly as projections, not guarantees.
5. **Why us — proof** — your real track record from the data: clients served, revenue delivered, years
   operating, retention. This is where your own history does the persuading.
6. **Investment** — pricing/packages, framed against the projected return.
7. **Timeline** — phases and milestones.
8. **Next steps + simple call to action.**

## What to pull from metrics.json

- Headline base case: `forecast_annual.base`; range: `forecast_annual.conservative`–`.aggressive`.
- Track record: `by_year`, `totals.all_payments_sum`, `yoy`, `cagr_pct`, `totals.avg_payment`,
  `totals.first_date`/`last_date`.
- Assumptions block: `assumptions` and `trailing` (run-rate, momentum).
- Proof of breadth / concentration: `segments`, `top_segment_share_pct`.
- Chart: `<prefix>_forecast.png`.

## Tone calibration by recent trend

- **Up:** confident, forward-leaning — substantiate why it continues.
- **Flat:** steady and operator-like — the plan is about breaking the plateau.
- **Down:** candid and serious — name the dip in the first lines, then make the document about the
  turnaround. A proposal that opens by acknowledging a hard quarter and lays out the fix is far more
  persuasive than one that pretends the dip isn't there. The reader already knows; meeting them in
  reality is what earns the rest of their attention.
