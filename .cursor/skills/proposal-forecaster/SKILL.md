---
name: proposal-forecaster
description: >-
  Master proposal creator that turns historical sales stats into a polished PDF proposal with credible
  forward sales predictions. Pulls past numbers from a connected source (Google Sheet, CSV, or pasted
  figures), cleans messy data, computes trends (YoY, CAGR, run-rate, seasonality) plus
  conservative/base/aggressive forecast scenarios with charts, and can join marketing spend against
  monthly sales into an ROI proof point. Works in two modes: an INTERNAL forecast ("how much can WE
  sell next year") and a CLIENT pitch ("the revenue YOU could expect by hiring us"). Use whenever the
  user asks to create a proposal, sales proposal, business proposal, revenue forecast, sales
  projection, growth plan, ROI analysis, or wants a proposal built from past numbers or invoices — even
  without the word "forecast". For GNZ DESIGNS / Webbing the default sources are the connected INVOICES
  and ROI BARK sheets.
---

# Proposal Forecaster

Turn real historical numbers into a proposal someone will actually believe. The job has two halves:
get the history right, then project forward in a way that is credible rather than wishful. A proposal
full of hockey-stick numbers that ignore a recent dip destroys trust the moment a reader who knows the
business looks at it. A proposal grounded in the actual data — including the awkward parts — and paired
with a clear plan to hit the numbers is what closes deals and wins buy-in.

## The two modes

Figure out which one you're in before doing anything else. If it's ambiguous, ask one quick question.

- **Internal forecast** — "how much sales can *we* do?", "project our revenue", "next year's plan".
  The subject is the user's own business. History = the user's own past sales. Forecast = the user's
  future revenue. Audience = the owner, a partner, an investor, or a bank.
- **Client pitch** — "write a proposal for [prospect]", "show them the ROI", "what results can we
  promise this client". The subject is what the *prospect* could earn by buying the user's services.
  History = the user's track record (used as proof), plus any numbers the prospect shared. Forecast =
  the prospect's projected results. Audience = the prospect.

Both modes share the same engine and the same honesty rules. They differ in framing, which sections
appear, and whose numbers are being projected. See `references/proposal-anatomy.md`.

## Workflow

### 1. Get the historical data

The forecast is only as good as the history. Pull the real numbers — never invent them.

- **Connected Google Sheet (default for GNZ/Webbing):** the "INVOICES WEBBING" sheet is connected as a
  synced source, so its contents arrive in context. Read it directly. For a fresh pull or a different
  sheet, use the connected Google Sheets/Drive tools.
- **CSV / Excel the user points to:** read it from their folder.
- **Pasted or typed figures:** use what they give you; if it's just yearly totals you can still
  forecast — you'll just have less signal for scenarios and seasonality.

If the source format is unknown, glance at the headers first and map three things: which column is the
*date*, which is the *amount actually received* (revenue), and which identifies the client or segment.

### 2. Clean and analyze — run the bundled script

Real sales sheets are messy: `$1,200.00` vs `1200`, mixed date formats (`7/1/2022` and `29/3/2023`),
blank rows, padding columns, parenthesised negatives, duplicate row numbers. Don't eyeball-sum hundreds
of rows — it's slow and error-prone. Use the bundled engine:

```
python scripts/analyze_revenue.py <path-to-csv> \
    --date-col PaymentDate --amount-col Received --segment-col AccountManager \
    --out-prefix <workdir>/metrics
```

It writes `metrics.json` (every figure the proposal needs) and `metrics_forecast.png` (history +
3-scenario forecast chart). Run `python scripts/analyze_revenue.py --help` for all flags; if no column
names are given it auto-detects common ones. The script is the single source of truth for numbers —
quote its outputs in the proposal rather than recomputing by hand.

What it computes: revenue by year and by month, YoY growth on complete years, CAGR, trailing run-rate,
average deal size, revenue concentration by segment, and the three forecast scenarios. Read
`references/forecasting-methods.md` for how the scenarios are built and how to pick assumptions honestly.

### 3. Sanity-check the story before you write

Open `metrics.json` and say the trend out loud in one sentence: growing, flat, or declining, and why.
The forecast must be consistent with that sentence. If the most recent period is *down*, the proposal
leads with a recovery plan, not a fantasy. If it's *up*, substantiate why it continues. Never let the
headline number contradict the chart — readers look at the chart first.

### 4. Build the PDF

Compose the proposal as clean HTML, then render it to PDF. Read `references/proposal-anatomy.md` for the
exact section order per mode and the house style. For PDF rendering mechanics (HTML→PDF, fonts, page
breaks) load the **`pdf`** skill — it's the reliable path and avoids reinventing rendering. Embed
`metrics_forecast.png` as the centerpiece. Put one unmissable headline number near the top (the base-case
projection), then the scenario table, then the plan that justifies it.

### 5. Deliver

Save the PDF to the user's working folder and present it. Lead your message with the single most
important number (e.g., "Base-case 12-month projection: $X") and the one assumption it rests on, so the
user can gut-check it in five seconds. Then offer to tune the assumptions and regenerate.

## Honesty rules (non-negotiable — this is what makes a forecast credible)

A forecast's only value is that someone trusts it enough to act on it. Break these and the document
becomes a liability.

1. **Every historical number traces to the data.** No rounding up "to look good," no invented clients.
2. **Always show three scenarios**, not one. A single number reads as a guess; a conservative/base/
   aggressive range reads as analysis and lets the reader find their own comfort level.
3. **The base case is anchored to the trailing run-rate or recent YoY trend**, not the best month ever.
4. **A recent decline is shown, not hidden.** Frame it honestly and pair it with the levers to reverse
   it. Hiding it only means the reader finds it later and stops believing the rest.
5. **State assumptions in plain words next to the numbers** — growth rate, new clients/month, average
   deal size, churn. The reader should be able to argue with each one.
6. **Separate recurring revenue from projected new business.** Recurring (hosting, maintenance,
   retainers) is high-confidence; net-new is the speculative part. Label which is which.

## ROI proof: spend vs sales (optional but powerful)

When the proposal benefits from a "for every $1 we spent, we generated $X" proof point, pair a
marketing/ad SPEND series against the monthly SALES. This is the single most persuasive number in a
client pitch. Use the bundled `scripts/roi_spend_vs_sales.py`: give it a spend CSV (month + amount)
and the same invoices CSV, and it emits per-month ROI plus a blended multiple. For GNZ/Webbing the
spend lives in the "ROI BARK" sheet and the sales in the "INVOICES" sheet — joining them gives the
real lead-gen ROI. Frame it honestly as gross sales attributed to the month, not net margin.

## Files

- `scripts/analyze_revenue.py` — data cleaner + metrics + 3-scenario forecast + chart. Source of truth.
- `scripts/roi_spend_vs_sales.py` — joins monthly spend vs monthly sales into per-month + blended ROI.
- `references/forecasting-methods.md` — how scenarios and assumptions are built; read before step 3.
- `references/proposal-anatomy.md` — section-by-section structure and house style for each mode.
