# SEO: measure the RFP query and target page together

> **Sample PR body only.** This is an illustrative proposal, not a claim that the code change has been implemented or measured. Keep the PR open for review; do not merge or deploy without MJ's explicit approval.

## Summary

- **Change type:** Search Console measurement tooling
- **Target query:** `rfp web development`
- **Target URL:** `https://www.cdsportswearinc.com/blog/web-development-rfp-guide`
- **Owning URL:** `/blog/web-development-rfp-guide`, per `KEYWORD-REGISTRY.md`
- **Status:** Draft proposal

## Why this change

The weekly goal requires evaluating the exact query against the exact target URL. A property-wide aggregate, a query-only table, or a page-only table cannot prove the query/page pair's performance. The connected GSC tool should apply both exact filters together and return comparable period metrics plus a daily sustain series.

**Evidence basis:** GSC report recorded 2026-09-26; the tool exposed query and page breakdowns separately, but did not accept combined dimension filters. Exact query/page performance remains unavailable until the filtered request is implemented and tested.

## Proposed behavior

- Apply `query equals rfp web development` AND `page equals https://www.cdsportswearinc.com/blog/web-development-rfp-guide` to each Search Analytics request.
- Return separately labelled current and prior comparable windows and a daily date series.
- Explicitly request Web search and finalized data.
- Mark average position `null` if there are no impressions; add a complete daily date spine with unreported days marked as missing.
- Return exact filters, property, windows, timezone, search/data state, and retrieval time with the metrics.
- Keep the connector read-only; do not publish, mutate sitemaps, or submit a disavow.

## Verification plan

- [ ] Unit-test exact query/page AND filter encoding on aggregate request.
- [ ] Unit-test identical filters on daily date-dimension request.
- [ ] Assert aggregate totals are target-filtered and are not calculated by summing breakdown rows.
- [ ] Test zero-row response: `hasReportableData=false`, position null.
- [ ] Test absent date: `reported=false`, threshold result null, never counted as a qualifying day.
- [ ] Reject invalid dates, unsupported dimensions/operators, empty or overlong expressions before API access.
- [ ] Run `pnpm exec vitest run mcp/test`, `pnpm mcp:check`, and `pnpm mcp:build`; record actual output.
- [ ] Confirm remote read-only profile exposes only read tools and uses the minimal accepted scope.

## Risks and dependencies

- Google OAuth scope reduction requires fresh user consent; changing MCP code does not change an already-issued grant.
- External app Testing status may cause Search Console refresh tokens to expire after seven days; production OAuth configuration is an owner-side prerequisite for unattended runs.
- The scheduler is currently not active; a separate authorized control context is required to create the recurring task.
- Average position is an aggregate GSC measure, not a fixed-location daily rank tracker.

## Approval boundaries

- No production change occurs until an authorized merge; merging `main` deploys.
- No content is published, outreach sent, paid placement purchased, keyword set changed, or disavow filed by this PR.
- **Owner approval to merge:** `[pending / explicitly approved in PR or current conversation]`

## Rollback

Revert the MCP change in a follow-up PR. No Search Console property or sitemap mutation is part of this change.
