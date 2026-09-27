# Weekly SEO Automation — Scheduler Authorization Handoff

**Status:** No schedule is active in the current task. `manus-config schedule status --limit 1000 --offset 0` returned `{}` on 2026-09-26. A prior create attempt returned `permission_denied: control source is not authorized for target device`.

## What the error means

The current Manus task/control source is not authorized to create a scheduled task on the selected target device. This is **not** a Search Console OAuth failure and cannot be fixed by changing the GSC MCP code or granting it more Google scope.

## Preferred resolution

1. Open the project task in the Manus client/device that is authorized to control the target device/scheduler (typically the user's authorized web/app control context, not a different sandbox/device context).
2. Confirm the correct project/task and intended target device are selected. Do not create a second schedule under another task just to bypass the authorization boundary.
3. Verify the active connectors on that exact task, especially the authenticated GSC MCP, Ahrefs, Semrush, and GitHub. If there are duplicate GSC MCP entries, select the canonical authenticated connector and explicitly attach its UID.
4. From that authorized context, create the one requested recurring task at the agreed cadence. Intended slot from the operating plan: Monday at 9:00 a.m. `America/New_York`, coordinated with the existing desktop SEO operator. Confirm the scheduler's timezone behavior before relying on that wall-clock time.
5. Keep the run prompt self-contained and bounded: read strategy/registry/latest run/open PRs; gather available evidence; report missing data as unavailable; propose up to three actions and create one reviewable artifact; never merge, publish, message, buy placements, alter the tracked keyword set, or disavow without owner approval.
6. Immediately inspect scheduler status in that same authorized context. Verify the task title, cadence, enabled state, and attached connectors. If creation still returns the same permission error, stop—do not retry across unrelated devices or accounts.

## Fallback

Coordinate with the **existing desktop SEO operator** described in `STRATEGY.md` rather than launching a duplicate autonomous run. This is the safer fallback because the repo already documents an operator and daily/weekly tasks. First verify it has access to the canonical GSC, Ahrefs, Semrush, and the desired run-note/PR location; then use its existing approved schedule. Do not assume the local desktop GSC connector is callable from a remote Manus schedule.

## Two viable approaches

| Approach | Tradeoffs | Cost | Setup complexity |
|---|---|---|---|
| Create the weekly Manus task from the authorized control context | Keeps AI research/judgment, evidence review, and draft creation in one task; still consumes task credits and depends on attached connector auth | Per-run task usage | Low–medium once authorized |
| Reuse the existing desktop SEO operator and its approved cadence | Avoids duplicate schedules and may already have local access; depends on its uptime, current connectors, and correct project checkout | Existing operator/runtime cost | Medium; verify its actual configuration |

**Do not use a raw OS cron as a permission workaround.** It would change the trust/control boundary and may lack secure access to Manus connectors; choose a separately authorized automation design only if the owner explicitly requests it.
