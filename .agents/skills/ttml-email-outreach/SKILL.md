---
name: ttml-email-outreach
description: "Discover, enrich and send emails to leads best suitable for talk-to-my-lawyer.com"
---

---
name: ttml-discover-enrich-send
description: |
  Three-phase Talk-to-My-Lawyer pipeline: discover California B2B prospects,
  enrich them via Apollo, and send attorney-letter outreach via Brevo. Use
  whenever asked to "run TTML discovery", "find more TTML prospects",
  "enrich the TTML leads", "send the next TTML batch", "send today's
  outreach", "do the daily TTML run", or any combination. This skill only
  covers discovery + enrichment + sending — nothing else.
---

# TTML — Discover → Enrich → Send

Two scripts do everything. Both live in `C:\Users\moizjmj\Leads TTML\`.

| Phase | Script | What it does |
|---|---|---|
| Discover + Enrich (combined) | `ttml_daily_run.py` | Scrapes Yelp/BuiltIn sources, runs Apollo enrichment, writes to `ttml_master_prospects.xlsx` |
| Send | `brevo_send.py` | Bounce sync → reply sync → warm-up math → Brevo send → status writeback |

Do not invent a third script. These two are the canonical entry points.

---

## Phase 1 — Discovery + Enrichment

**Script:** `C:\Users\moizjmj\Leads TTML\ttml_daily_run.py`

**Run it:**
```bat
cd /d "C:\Users\moizjmj\Leads TTML"
C:\Python314\python.exe ttml_daily_run.py
```

Because the working folder has a space, use a wrapper batch file or call cmd with `^`-escaping:
```powershell
cmd.exe /c C:\Users\moizjmj\Leads^ TTML\run_daily.bat
```
(`run_daily.bat` already exists in the folder and redirects output to `daily_run_output.txt`.)

**What the script does internally:**
1. Loads `ttml_master_prospects.xlsx` and the "already sent" set.
2. If queued unsent < `SEND_LIMIT + 20`, calls `discover_prospects()` (line 312):
   - Scrapes the `SOURCES` list at the top of the file via Firecrawl
     (`FIRECRAWL_API_KEY` env var). Covers V1 property mgmt, V2 contractors,
     V3 agencies, V4 ecommerce, V10 staffing, V12 tech — across LA, SD, SF, Sacramento.
   - Extracts domains from the scraped markdown.
3. Calls `apollo_enrich(domain)` (line 252) for each candidate:
   - Hits `https://api.apollo.io/api/v1/organizations/enrich` (`APOLLO_API_KEY` env var).
   - Filters: California-only, employee band 10–200, qualifying verticals.
4. Merges into `ttml_master_prospects.xlsx` via `merge_prospects()` (line 470) → `save_master()` (line 441).
5. Logs the run to `logs\daily_run_log.csv`.

**Required env vars** for full functionality:
- `FIRECRAWL_API_KEY` — Firecrawl scraping
- `APOLLO_API_KEY` — Apollo enrichment
- `BREVO_API_KEY` — already has a hardcoded fallback inside the script

**Outputs:**
- `C:\Users\moizjmj\Leads TTML\ttml_master_prospects.xlsx` (updated in place)
- `C:\Users\moizjmj\Leads TTML\daily_run_output.txt` (this run's stdout/stderr)
- `C:\Users\moizjmj\Leads TTML\logs\daily_run_log.csv` (run metadata)

**Note:** `ttml_daily_run.py` also has its own send step (`send_via_brevo`, line 489) but it does **not** include the deliverability hardening from `brevo_send.py`. For sending, **use `brevo_send.py`** (Phase 3 below).

---

## Phase 2 — Enrichment-only (rare standalone use)

Enrichment is normally bundled into Phase 1. There is no separate enrichment script. If you need to re-enrich existing rows in the master xlsx, edit `ttml_daily_run.py` to set `target=0` in the call to `discover_prospects()` so only the existing-row pass runs — but in practice you almost never need this.

---

## Phase 3 — Sending

**Script:** `C:\Users\moizjmj\Leads TTML\brevo_send.py`

**Run it:**
```bat
cd /d "C:\Users\moizjmj\Leads TTML"
C:\Python314\python.exe -u brevo_send.py
```

Or via the wrapper: `cmd.exe /c C:\Users\moizjmj\Leads^ TTML\run_brevo.bat` (output redirected to `brevo_send_output.txt`).

**What the script does on every run, in order:**

1. **Bounce sync** (`sync_bounces_and_check_rate`) — pulls Brevo's `/v3/smtp/blockedContacts`, marks matching rows `outreach_status='bounced'` in the master xlsx, and computes the rolling 14-day bounce rate. If rate > 3%, aborts with exit code 4.
2. **Reply sync** (`sync_replies`) — polls Gmail IMAP (`proactiveeviction@gmail.com`) for new replies in the last 14 days, marks matching rows `outreach_status='replied'`, and appends to `replies_log.csv`. Skipped silently if `IMAP_PASS` env var is not set.
3. **Warm-up allowance** (`compute_warmup_allowance`) — reads `brevo_warmup_state.json`. Day 1 quota = 12; multiplies by 1.30 each subsequent day; cap = 100. On first run today, seeds `sent_today` from Brevo's stats API so prior firings don't get double-counted. `SEND_LIMIT` is reduced to today's remaining allowance.
4. **Load prospects** — opens `ttml_master_prospects.xlsx` sheet "Prospects". Filters: must have valid `@` email, not free-mail (gmail/yahoo/hotmail/outlook), and `outreach_status` not in `{sent, bounced, blocked, unsubscribed, complaint, invalid, replied}`. Sorts by `score` desc.
5. **Send** — POSTs to `https://api.brevo.com/v3/smtp/email` with:
   - Sender: `Moiz Jamil - Talk-to-My-Lawyer <info@talk-to-my-lawyer.com>`
   - Reply-To: `Moiz Jamil <proactiveeviction@gmail.com>`
   - Deliverability headers: `List-Unsubscribe` (one-click RFC 8058), `List-Unsubscribe-Post: List-Unsubscribe=One-Click`, `Precedence: bulk`, `Auto-Submitted: auto-generated`, `X-Entity-Ref-ID`, `X-Mailer`.
   - Both `htmlContent` and `textContent` (multipart alternative).
   - Tags: `["ttml-outreach", vertical_code, "ttml-scheduled"]`.
   - Random delay between sends: `DELAY_SEC + random.uniform(0, DELAY_JITTER)` = 2–5s.
6. **Status writeback** (`update_status_in_xlsx`) — flips each sent prospect's `outreach_status` to `sent`.
7. **Warm-up state bump** (`bump_warmup_state`) — increments `sent_today` and `total_sent` in `brevo_warmup_state.json`.

**Fail-fast cases** (script exits without trying all 30 emails):
- HTTP 401 "Unrecognised IP" → fix in Brevo → Account Settings → Authorized IPs.
- HTTP 401 "Key not found" → update `BREVO_API_KEY` env var or in-script constant.
- 14-day bounce rate > 3% → clean the master xlsx or temporarily raise `BOUNCE_THRESHOLD`.

**CLI flags:**
- `--dry-run` — runs everything except the actual Brevo POST.
- `--limit N` — caps this run at N emails (still respects warm-up).
- `--check-bounces` — runs only the bounce sync, no send.
- `--check-replies` — runs only the reply sync, no send.

**Outputs:**
- `ttml_master_prospects.xlsx` — `outreach_status` updated for each sent / bounced / replied row.
- `brevo_send_output.txt` — this run's stdout/stderr.
- `brevo_warmup_state.json` — daily allowance bookkeeping.
- `reply_sync_state.json` — seen IMAP UIDs.
- `replies_log.csv` — follow-up queue (one row per detected reply).

---

## Standard sequence to run the full pipeline

```bat
cd /d "C:\Users\moizjmj\Leads TTML"

REM Phase 1+2: discovery + enrichment
C:\Python314\python.exe ttml_daily_run.py

REM Phase 3: sending (with warm-up + bounce + reply protection)
C:\Python314\python.exe -u brevo_send.py
```

That's it. Two commands. Everything else (deliverability, ramp, suppression, reply tracking) is wired in.

---

## One-time setup checklist

| Item | Status / fix |
|---|---|
| `BREVO_API_KEY` | hardcoded fallback in `brevo_send.py`; override via env var |
| Brevo authorized IP | `2400:adc1:191:6100:3101:e30b:d153:2cb7` already authorized |
| Sender `info@talk-to-my-lawyer.com` | must have SPF/DKIM/DMARC configured in Brevo for the talk-to-my-lawyer.com domain |
| `APOLLO_API_KEY` env var | required for enrichment |
| `FIRECRAWL_API_KEY` env var | required for scraping |
| `IMAP_PASS` env var | Gmail app password for `proactiveeviction@gmail.com` — required only if you want reply tracking |

---

## Do NOT

- Do not use `live_send.py`, `send_v1v2v3v4.py`, `ttml_send_batch.py`, `ttml_full_cycle.py`, or `miniworkflow_yelp_firecrawl_brevo.py` — those are older variants without deliverability hardening.
- Do not bypass `brevo_send.py`'s bounce check by setting `BOUNCE_SYNC_DISABLE = True` unless you've personally verified the master xlsx is clean.
- Do not raise `WARMUP_CEILING` above 100 in the first 30 days of sending — Brevo's shared-IP reputation needs time.