# 2026-10-05 goal-monger weekly run (scheduled, non-interactive)

**Goal:** GSC avg position ≤10 for `rfp web development` on `/blog/web-development-rfp-guide`, 14 consecutive reporting days, by 2027-03-31 (see `docs/seo/goals.md`).

## Measurement
**GSC: unavailable this run.** Both `get_seo_goal_snapshot` and `get_search_console_quick_stats` (tool server for `sc-domain:cdsportswearinc.com`) returned "The user's connection to this connector was invalidated. The user needs to reconnect it from connector settings." No numbers are estimated. Last verified reading remains the 2026-09-30 one in `goals.md` (rung 1 Done; milestone 2 not met). GA4 not wired: unavailable.

## Verified this run (non-GSC)
- Guide URL returns HTTP 200 (`curl -I`, 2026-10-05); listed in live `sitemap.xml`.
- Origin/main head `1c17666`; highest claimed version is v1.119 (open PR #281).
- Overlap check: open PR #279 (Desk content ideas) is Desk-lane; nothing else touches RFP.

## Fronts (unchanged, all gated or pending)
- RFP worksheet draft: gated on MJ review; check date 2026-10-03 passed. **Gated 2 runs. Escalating.**
- Request indexing for the 3 linking pages: gated on MJ (GSC UI).
- Mason SBDC outreach: sent 2026-09-28; reply check ~2026-10-08. No follow-up without a fresh yes.
- 3 other outreach prospects: blocked on usable addresses.

## Stop
Everything waiting on MJ, plus the GSC connector being down.
RESTARTS WHEN: MJ reconnects the Search Console connector (claude.ai connector settings) and/or reviews the worksheet and requests indexing; next weekly run re-pulls GSC.
