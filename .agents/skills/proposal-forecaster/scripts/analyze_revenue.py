#!/usr/bin/env python3
"""
analyze_revenue.py - Clean messy sales data, compute trend metrics, and build a
conservative / base / aggressive forward forecast. Single source of truth for every
number that goes into a proposal-forecaster PDF.

Usage:
    python analyze_revenue.py data.csv \
        --date-col PaymentDate --amount-col Received --segment-col AccountManager \
        --out-prefix metrics

If column names are omitted it auto-detects common ones (date / amount / received /
total / client / account). Outputs <prefix>.json and (if matplotlib is present)
<prefix>_forecast.png.

All forecast assumptions are overridable so the user can argue with each one:
    --runrate-months N   months of trailing data the base run-rate averages (default 6)
    --base-growth P       annual % change applied to the run-rate for the BASE case
    --cons-growth P       annual % change for the CONSERVATIVE case (default -15)
    --agg-growth  P       annual % change for the AGGRESSIVE case (default +30)
If --base-growth is omitted the base case is a flat continuation of the trailing run-rate
(0% growth); recent momentum is reported as context for the narrative.
"""
import argparse, csv, json, sys, datetime as dt
from collections import defaultdict

DATE_FORMATS = ("%m/%d/%Y", "%d/%m/%Y", "%Y-%m-%d", "%m/%d/%y", "%d-%m-%Y", "%m-%d-%Y")


def money(s):
    if s is None:
        return 0.0
    s = str(s).strip().replace("$", "").replace(",", "")
    neg = s.startswith("(") and s.endswith(")")
    s = s.replace("(", "").replace(")", "")
    if s in ("", "-", "."):
        return 0.0
    try:
        v = float(s)
    except ValueError:
        return 0.0
    return -v if neg else v


def parse_date(s):
    s = (s or "").strip()
    if not s:
        return None
    for f in DATE_FORMATS:
        try:
            return dt.datetime.strptime(s, f).date()
        except ValueError:
            continue
    return None


def autodetect(headers, *candidates):
    low = {h.lower().strip(): h for h in headers if h}
    for cand in candidates:
        for k, orig in low.items():
            if cand in k:
                return orig
    return None


def load(path, stdin_csv, date_col, amount_col, segment_col):
    fh = sys.stdin if stdin_csv else open(path, newline="")
    try:
        reader = csv.DictReader(fh)
        headers = reader.fieldnames or []
        dc = date_col or autodetect(headers, "date")
        ac = amount_col or autodetect(headers, "received", "amount", "revenue", "total", "paid")
        sc = segment_col or autodetect(headers, "account", "client", "segment", "manager", "service")
        if not dc or not ac:
            sys.exit("Could not find date/amount columns. Pass --date-col and --amount-col. "
                     f"Headers seen: {headers}")
        recs = []
        for row in reader:
            d = parse_date(row.get(dc))
            amt = money(row.get(ac))
            seg = (row.get(sc) or "").strip() if sc else ""
            recs.append((d, amt, seg))
        return recs, dc, ac, sc
    finally:
        if not stdin_csv:
            fh.close()


def clamp(x, lo, hi):
    return max(lo, min(hi, x))


def analyze(recs, runrate_months, base_growth, cons_growth, agg_growth):
    dated = [(d, a, s) for d, a, s in recs if d and a]
    dated.sort(key=lambda r: r[0])
    total = sum(a for _, a, _ in recs)

    by_year, cnt_year, by_ym, by_seg = (defaultdict(float), defaultdict(int),
                                        defaultdict(float), defaultdict(float))
    for d, a, s in dated:
        by_year[d.year] += a
        cnt_year[d.year] += 1
        by_ym[(d.year, d.month)] += a
        if s:
            by_seg[s] += a

    years = sorted(by_year)
    # complete-year YoY: a year is "complete" if it has >= 12 active months
    active_months = {y: len({m for (yy, m) in by_ym if yy == y}) for y in years}
    complete = [y for y in years if active_months[y] >= 12]
    yoy = []
    for i in range(1, len(complete)):
        a, b = complete[i - 1], complete[i]
        if by_year[a]:
            yoy.append({"from": a, "to": b,
                        "pct": round((by_year[b] - by_year[a]) / by_year[a] * 100, 1)})
    cagr = None
    if len(complete) >= 2 and by_year[complete[0]] > 0:
        n = complete[-1] - complete[0]
        cagr = round(((by_year[complete[-1]] / by_year[complete[0]]) ** (1 / n) - 1) * 100, 1)

    # trailing run-rate: mean of the last N active months
    months_sorted = sorted(by_ym)
    last = months_sorted[-runrate_months:] if len(months_sorted) >= runrate_months else months_sorted
    run_rate = sum(by_ym[m] for m in last) / max(len(last), 1)

    # momentum: last K active months vs the K before them
    K = runrate_months
    momentum_pct = None
    if len(months_sorted) >= 2 * K:
        recent = sum(by_ym[m] for m in months_sorted[-K:]) / K
        prior = sum(by_ym[m] for m in months_sorted[-2 * K:-K]) / K
        if prior > 0:
            momentum_pct = round((recent / prior - 1) * 100, 1)

    # Base case = flat continuation of the trailing run-rate (which already reflects the most
    # recent reality, including any dip). Momentum is reported as context to inform the narrative,
    # not used to compound a further decline onto an already-depressed run-rate. The user can
    # override with --base-growth when there's a concrete reason. This keeps the ordering
    # conservative <= base <= aggressive intact by construction (cons<0<agg by default).
    if base_growth is None:
        base_growth = 0.0

    annual_runrate = run_rate * 12
    scenarios = {
        "conservative": round(annual_runrate * (1 + cons_growth / 100)),
        "base": round(annual_runrate * (1 + base_growth / 100)),
        "aggressive": round(annual_runrate * (1 + agg_growth / 100)),
    }

    # seasonality weights (avg share by calendar month) for a realistic monthly forecast path
    month_avg = defaultdict(list)
    for (y, m), v in by_ym.items():
        month_avg[m].append(v)
    season = {m: (sum(vs) / len(vs)) for m, vs in month_avg.items()}
    ssum = sum(season.values()) or 1
    season_w = {m: season.get(m, ssum / 12) / ssum for m in range(1, 13)}

    amts = [a for _, a, _ in dated if a > 0]
    seg_sorted = sorted(by_seg.items(), key=lambda kv: -kv[1])
    top_share = round(seg_sorted[0][1] / sum(by_seg.values()) * 100, 1) if by_seg else None

    return {
        "currency": "USD",
        "totals": {
            "all_payments_sum": round(total),
            "payments_counted": len(dated),
            "avg_payment": round(sum(amts) / len(amts)) if amts else 0,
            "largest_payment": round(max(amts)) if amts else 0,
            "first_date": str(dated[0][0]) if dated else None,
            "last_date": str(dated[-1][0]) if dated else None,
        },
        "by_year": {str(y): round(by_year[y]) for y in years},
        "active_months_per_year": {str(y): active_months[y] for y in years},
        "complete_years": complete,
        "yoy": yoy,
        "cagr_pct": cagr,
        "trailing": {
            "runrate_months": len(last),
            "monthly_run_rate": round(run_rate),
            "annualized_run_rate": round(annual_runrate),
            "momentum_pct": momentum_pct,
        },
        "segments": {k: round(v) for k, v in seg_sorted},
        "top_segment_share_pct": top_share,
        "assumptions": {
            "base_growth_pct": round(base_growth, 1),
            "conservative_growth_pct": cons_growth,
            "aggressive_growth_pct": agg_growth,
            "anchor": "trailing monthly run-rate x 12",
        },
        "forecast_annual": scenarios,
        "_internal": {"by_ym": {f"{y}-{m:02d}": round(by_ym[(y, m)]) for (y, m) in months_sorted},
                      "season_w": season_w, "annual_runrate": annual_runrate,
                      "scenarios": scenarios},
    }


def make_chart(metrics, out_png):
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        import matplotlib.dates as mdates
    except Exception as e:
        return f"chart skipped (matplotlib unavailable: {e})"

    iv = metrics["_internal"]
    by_ym = iv["by_ym"]
    keys = sorted(by_ym)
    hx = [dt.date(int(k[:4]), int(k[5:]), 1) for k in keys]
    hy = [by_ym[k] for k in keys]

    # forward 12 months from last historical month
    last = hx[-1]
    fmonths = []
    yy, mm = last.year, last.month
    for _ in range(12):
        mm += 1
        if mm > 12:
            mm = 1; yy += 1
        fmonths.append(dt.date(yy, mm, 1))
    season_w = {int(k): v for k, v in iv["season_w"].items()}

    def path(annual):
        return [annual * season_w.get(d.month, 1 / 12) for d in fmonths]

    sc = iv["scenarios"]
    fig, ax = plt.subplots(figsize=(9, 4.6))
    ax.plot(hx, hy, color="#1b2a4a", lw=2, label="Actual monthly revenue")
    ax.plot(fmonths, path(sc["base"]), color="#2563eb", lw=2.2, ls="--", label="Base forecast")
    ax.fill_between(fmonths, path(sc["conservative"]), path(sc["aggressive"]),
                    color="#2563eb", alpha=0.12, label="Conservative–Aggressive range")
    ax.axvline(last, color="#9ca3af", lw=1, ls=":")
    ax.set_ylabel("Revenue (USD / month)")
    ax.set_title("Revenue history and 12-month forecast", fontweight="bold", color="#1b2a4a")
    ax.legend(frameon=False, fontsize=8, loc="upper left")
    ax.spines[["top", "right"]].set_visible(False)
    ax.yaxis.set_major_formatter(lambda x, _: f"${x/1000:.0f}k")
    ax.xaxis.set_major_locator(mdates.MonthLocator(interval=3))
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%b'%y"))
    fig.autofmt_xdate(rotation=45)
    fig.tight_layout()
    fig.savefig(out_png, dpi=150)
    plt.close(fig)
    return f"chart written: {out_png}"


def main():
    ap = argparse.ArgumentParser(description="Clean sales data and build a 3-scenario forecast.")
    ap.add_argument("csv", nargs="?", help="Path to CSV (omit if using --stdin-csv)")
    ap.add_argument("--stdin-csv", action="store_true", help="Read CSV from stdin")
    ap.add_argument("--date-col"); ap.add_argument("--amount-col"); ap.add_argument("--segment-col")
    ap.add_argument("--out-prefix", default="metrics")
    ap.add_argument("--runrate-months", type=int, default=6)
    ap.add_argument("--base-growth", type=float, default=None)
    ap.add_argument("--cons-growth", type=float, default=-15.0)
    ap.add_argument("--agg-growth", type=float, default=30.0)
    a = ap.parse_args()
    if not a.csv and not a.stdin_csv:
        ap.error("provide a CSV path or --stdin-csv")

    recs, dc, ac, sc = load(a.csv, a.stdin_csv, a.date_col, a.amount_col, a.segment_col)
    metrics = analyze(recs, a.runrate_months, a.base_growth, a.cons_growth, a.agg_growth)
    metrics["_columns_used"] = {"date": dc, "amount": ac, "segment": sc}

    png = a.out_prefix + "_forecast.png"
    chart_msg = make_chart(metrics, png)
    metrics.pop("_internal", None)  # keep the JSON clean for the proposal author

    with open(a.out_prefix + ".json", "w") as f:
        json.dump(metrics, f, indent=2)

    s = metrics["forecast_annual"]
    print(f"Wrote {a.out_prefix}.json | {chart_msg}")
    print(f"Counted {metrics['totals']['payments_counted']} payments, "
          f"total ${metrics['totals']['all_payments_sum']:,}")
    print(f"Trailing run-rate ${metrics['trailing']['annualized_run_rate']:,}/yr "
          f"(momentum {metrics['trailing']['momentum_pct']}%)")
    print(f"Forecast: conservative ${s['conservative']:,} | base ${s['base']:,} | "
          f"aggressive ${s['aggressive']:,}")


if __name__ == "__main__":
    main()
