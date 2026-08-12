# Forecasting methods

How the three scenarios are built and how to choose assumptions you can defend. The goal is a forecast a
skeptical reader can argue with line by line and still come away trusting — that trust is the only thing
that makes a projection useful.

## The anchor: trailing run-rate, not the best month

The base case is anchored to the **trailing monthly run-rate** — the average of the last N active months
(default 6) — annualized to 12 months. This matters because the most recent few months are the best
available predictor of the next few. Anchoring to a record month or to a full-year total that's already
stale produces a number the business can't actually hit, and everyone knows it.

`analyze_revenue.py` reports `trailing.monthly_run_rate` and `trailing.annualized_run_rate`. Start there.

## Base = flat run-rate; momentum is context

By default the **base** case is a flat continuation of the trailing run-rate (0% growth). The run-rate
already reflects the most recent reality — including any recent dip — so holding it flat is the most
defensible neutral projection. Applying a further growth rate on top would either compound a decline
the run-rate already captured or assume a turnaround that hasn't started.

The script still reports `momentum_pct` (last K months vs the prior K) as context. Use it in the
narrative: if momentum is sharply negative, even holding the run-rate flat in the base case requires
active stabilization — say so, and let the recovery plan carry the upside to the aggressive case.
Override the base only with `--base-growth` when there's a concrete, nameable reason (a signed
contract, a confirmed new retainer). Conservative and aggressive sit below and above the base by
construction, so the scenario ordering is always conservative ≤ base ≤ aggressive.

## The three scenarios

All three are the annualized run-rate scaled by a growth assumption:

- **Conservative** (default −15%): things soften — a client or two churns, the slow season bites, no new
  acquisition. This is the "can we cover costs" floor. A reader who only believes the conservative case
  should still find the proposal viable.
- **Base** (momentum-derived, default flat): the current trajectory continues with no heroics.
- **Aggressive** (default +30%): the growth levers in the plan actually land — more outbound, higher
  retainer mix, price increases, referrals compounding. This is earned, not hoped: each point of upside
  must map to a specific action in the plan.

Override any of them with `--base-growth`, `--cons-growth`, `--agg-growth` when the user has a concrete
reason (a signed contract, a known churn, a planned hire). Always write the final assumption into the
proposal in plain words.

## Seasonality

Month-to-month revenue is rarely flat. The script derives seasonal weights from the average share each
calendar month historically contributes, then distributes each scenario's annual total across the next
12 months on that shape. This is only for the chart's monthly path and for any month-by-month table —
the headline numbers are the annual scenario totals. Don't over-read seasonality from one or two years
of data; treat it as texture, not gospel.

## Recurring vs net-new revenue

Recurring revenue (hosting, maintenance, retainers, subscriptions) is the high-confidence base of any
forecast — it tends to renew. Net-new project revenue is the speculative part. When the data lets you
separate them (e.g., a maintenance/hosting sheet, or comment fields like "maintenance", "hosting",
"retainer", "monthly"), report recurring separately and treat it as near-certain in the conservative
case. The proposal is far more persuasive when it can say "X of the forecast is already-contracted
recurring revenue; only Y depends on new sales."

## Choosing assumptions honestly — a checklist

- Does the base case roughly match where the last 3–6 months are actually running? If not, re-anchor.
- Can you name a specific reason for every point of growth above flat? If not, lower the aggressive case.
- If the recent trend is **down**, does the base case reflect that, with the recovery plan carrying the
  upside? Never paper over a decline with an optimistic base case.
- Would the number survive the reader pulling up the same spreadsheet? If you'd be embarrassed, fix it.

## Limits to state plainly

A forecast is a conditional projection, not a promise. Say so. Note the obvious risks (client
concentration, a soft recent quarter, dependence on one acquisition channel) rather than burying them —
naming a risk you've clearly thought about builds more confidence than pretending none exist.
