#!/usr/bin/env python3
"""
roi_spend_vs_sales.py - Join monthly marketing/ad SPEND against monthly SALES to show
return on investment (ROI = sales / spend) per month, plus a blended total. Use this
when a proposal needs a "for every $1 we spent, we generated $X in sales" proof point
(e.g., GNZ/Webbing pairing Bark lead-gen spend from the ROI BARK sheet against the
monthly revenue from the INVOICES sheet).

Inputs are two CSVs:
  --spend-csv   columns: a month column (YYYY-MM or any parseable date) + a spend column
  --sales-csv   the raw payments/invoices CSV (same format analyze_revenue.py reads); the
                script buckets payments into monthly sales itself.
Outputs <prefix>_roi.json with per-month spend/sales/ROI and the blended multiple.

    python roi_spend_vs_sales.py --spend-csv bark_spend.csv --sales-csv invoices.csv \
        --sales-date-col PaymentDate --sales-amount-col Received --out-prefix gnz

Honesty note: ROI here is gross sales attributed to the month, not net profit, and it
credits all of a month's sales to that month's ad spend. State that framing in the
proposal so the multiple isn't read as net margin.
"""
import argparse, csv, json, datetime as dt
from collections import defaultdict

DATEF = ("%Y-%m", "%m/%d/%Y", "%d/%m/%Y", "%Y-%m-%d", "%b-%y", "%m/%d/%y")


def money(s):
    s = str(s).strip().replace("$", "").replace(",", "").replace("(", "-").replace(")", "")
    try: return float(s)
    except ValueError: return 0.0


def month_key(s):
    s = (s or "").strip()
    for f in DATEF:
        try:
            d = dt.datetime.strptime(s, f)
            return f"{d.year}-{d.month:02d}"
        except ValueError:
            continue
    return s if len(s) == 7 and s[4] == "-" else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--spend-csv", required=True)
    ap.add_argument("--sales-csv", required=True)
    ap.add_argument("--spend-month-col", default="Month")
    ap.add_argument("--spend-col", default="Spend")
    ap.add_argument("--sales-date-col", default="PaymentDate")
    ap.add_argument("--sales-amount-col", default="Received")
    ap.add_argument("--out-prefix", default="roi")
    a = ap.parse_args()

    spend = {}
    with open(a.spend_csv, newline="") as f:
        for r in csv.DictReader(f):
            mk = month_key(r.get(a.spend_month_col))
            if mk: spend[mk] = spend.get(mk, 0) + money(r.get(a.spend_col))

    sales = defaultdict(float)
    with open(a.sales_csv, newline="") as f:
        for r in csv.DictReader(f):
            mk = month_key(r.get(a.sales_date_col))
            if mk: sales[mk] += money(r.get(a.sales_amount_col))

    rows, ts, tsa = [], 0.0, 0.0
    for m in sorted(spend):
        sp, sa = spend[m], sales.get(m, 0.0)
        roi = round(sa / sp, 2) if sp > 0 else None
        rows.append({"month": m, "spend": round(sp), "sales": round(sa), "roi": roi})
        ts += sp; tsa += sa
    out = {"months": rows, "total_spend": round(ts), "total_sales_same_months": round(tsa),
           "blended_roi": round(tsa / ts, 2) if ts else None,
           "best_months": sorted([r for r in rows if r["roi"]], key=lambda x: -x["roi"])[:3]}
    json.dump(out, open(a.out_prefix + "_roi.json", "w"), indent=2)
    print(f"Total spend ${out['total_spend']:,} -> sales ${out['total_sales_same_months']:,} "
          f"= blended {out['blended_roi']}x ROI")
    for r in rows:
        print(f"  {r['month']}  spend ${r['spend']:>6,}  sales ${r['sales']:>7,}  "
              f"{(str(r['roi'])+'x') if r['roi'] else 'n/a'}")


if __name__ == "__main__":
    main()
