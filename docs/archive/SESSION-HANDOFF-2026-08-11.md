# Session handoff — 2026-08-11

Written for continuing this exact work on a different machine. Everything
below reflects the live state at the moment this file was written — verify
against `git status`/`gh pr view 68` before acting, since state may have
moved if another session touches this repo in the meantime (this has
happened multiple times already — see `STATUS.md`'s "check open branches/PRs"
warnings).

## Where things stand

**Branch:** `preview`, local HEAD `bcb531c` (3 commits ahead of `origin/preview`
— those 3 commits are also the entire content of PR #68, since direct pushes
to `preview` are now blocked by a GitHub branch-protection rule requiring a
Code Scanning check that only runs on PRs).

**PR #68** (`fix/code-review-batch-2026-08-10` → `preview`): open, mergeable,
Vercel deploy green. Contains the fixes for the 8 findings from the
multi-agent review of `preview` vs `main` (documented in
`docs/plans/2026-08-10-code-review-fixes.md` and `STATUS.md`'s
"2026-08-10, multi-agent code review + fixes" section) — the notification
visibility leak (migration 0023), ProjectThread/ServiceEmblem/ServiceEmblem3D/
ImageBlock fixes, and `.hermes`/stray-file housekeeping. Not yet merged.

## Uncommitted work in the working tree right now

```
 M .mcp.json                       <- mine, unrelated MCP server config cleanup (windows-mcp/github removed) — not part of this PR, never committed on purpose
 M Dockerfile                      <- NOT mine, a concurrent session's HEALTHCHECK addition — leave alone
 M app/services/[slug]/page.jsx    <- mine, wires FaqSchema into the service detail page
?? .agents/workflows/              <- NOT mine, unrelated
?? app/api/health/                 <- NOT mine, unrelated (pairs with the Dockerfile change above)
?? components/marketing/FaqSchema.jsx        <- mine, NEW, uncommitted
?? tests/marketing/faqSchema.test.jsx        <- mine, NEW, uncommitted
```

**FaqSchema work is real, tested, and ready to commit but never was.** It adds
`FAQPage` JSON-LD to every `/services/[slug]` page, reusing the `faq` array
that already exists in `lib/servicePages.mjs` (no invented content). Both
`pnpm vitest run tests/marketing/faqSchema.test.jsx` and `pnpm build` passed
clean when this was written. It came out of a live SEO audit run against
crystalwebsolution.com (SearchFit MCP suite — on-page audit tools worked
without auth, Search Console/Core Web Vitals tools were blocked: Search
Console needed an OAuth connection the user completed mid-session but this
session never saw it propagate; Core Web Vitals needs a `PAGESPEED_API_KEY`
on the SearchFit server that isn't set — neither is fixable from a coding
session).

**Next action on this:** stage and commit `components/marketing/FaqSchema.jsx`,
`tests/marketing/faqSchema.test.jsx`, and the `app/services/[slug]/page.jsx`
diff — nothing else. Same PR #68 branch or a fresh commit on `preview`,
either is fine; it's independent of everything else in flight.

## 8 code-review findings — reported, NOT yet fixed

Ran `/code-review medium` against PR #68's diff (the 3 commits above) plus
the uncommitted FaqSchema work. All 8 were verified (not just surfaced) and
reported via `ReportFindings`, ranked most-severe first. **The user has not
yet said "go" on fixing these** — that's the explicit next decision point.

1. **`supabase/migrations/0020_project_delivered_notification.sql:129`** —
   `transition_project_status` validates and stores its own `p_visibility`
   but never forwards it to `private.project_notification_recipients(...)`,
   so it resolves via the default `'shared'`. Internal-only status-transition
   notes still notify the client company — the exact same leak class
   migration 0023 exists to fix, missed for this 4th caller. **Highest
   priority** — same security category as the original finding, needs a new
   migration `0024` (never edit an already-applied migration in this repo).
2. **`components/marketing/ServiceEmblem.jsx:138`** — removing `aria-hidden`
   from the 3D-variant wrapper (this session's own a11y fix, already
   committed) correctly un-hides the focusable tooltip button, but also
   un-hides the sibling `<span className="mkt-emblem-n">` numeral badge,
   which `app/globals.css` documents as purely decorative. Now exposed
   unlabeled to screen readers on every `/services/[slug]` hero. Needs its
   own `aria-hidden="true"` on just that span.
3. **`components/three/ServiceEmblem3D.jsx:50`** — this session's own
   matchMedia/useFrame fix (already committed) reinvented a local
   matchMedia+ref+listener reduced-motion gate instead of importing
   `lib/motionScale.js` — the exact module-level singleton CLAUDE.md
   documents for this precise purpose, already used by `ServiceRail.jsx`/
   `CameraRig.jsx` (the very components this file's header comment says it
   mirrors). Should read `motionScale.value` instead of maintaining a
   parallel `reduceRef`.
4. **`supabase/migrations/0023_visibility_aware_notification_recipients.sql:37`**
   — `p_visibility` defaults to `'shared'` and treats NULL as non-internal,
   i.e. fails open. Currently unreachable via the 3 existing validated
   callers, but sets a risky precedent (finding #1 is the concrete
   manifestation of exactly this). PLAUSIBLE, not CONFIRMED as active.
5. **`scripts/livecheck.mjs:12`** — `page.on('console', ...)`/`page.on('pageerror', ...)`
   registered inside the per-URL loop with no `page.off()`, so listeners
   accumulate across all 9 checked URLs for the script's run. Real but low
   impact (dev-only script, short-lived process, per-iteration `const`
   closures keep the printed counts correct regardless).
6. **`components/marketing/ImageBlock.jsx:1`** — this session's fix (already
   committed) makes the CSS Modules import actually take effect for the
   first time, which is correct, but CSS-Modules-scoped classes now
   conflict with CLAUDE.md's stated "plain JSX and global CSS" convention.
   Root cause (the `.module.css` file existing at all) predates this
   session; component is still unused anywhere else so nothing live is
   affected yet.
7. **`components/marketing/FaqSchema.jsx:17`** (the new, uncommitted file) —
   duplicates the `<script type="application/ld+json">` wrapper boilerplate
   already in `ServiceSchema.jsx` and `BreadcrumbSchema.jsx` verbatim. No
   shared `JsonLd` helper exists in the repo despite this being the third
   copy.
8. **`components/three/ServiceEmblem3D.jsx:53`** — the `useFrame` callback
   checks the reduced-motion flag twice with different shapes (`!reduce`
   folded into the rotation `if`, then `if (reduce) return` separately for
   the glow block) instead of one early return. Style/simplification only.

## Interrupted: CRM "commercial layer" planning (plan mode)

The user asked to plan a fix for the biggest gap identified in an earlier
CRM feature-inventory pass: **no invoicing, time tracking, calendar, or
automations/webhooks anywhere in the CRM's data model.** Explicitly asked to
use the `agent-se-system-architecture-reviewer` and `design:design-system`
skills as part of this.

**Progress before interruption:**
- Ran an Explore agent that confirmed the exact reusable patterns to build
  on: the `lib/crm/projects.js` read-boundary pattern, `app/actions/project-actions.js`
  server-action pattern, the migration/RPC/ACL/audit_events convention (see
  migrations `0021`–`0023` as the reference examples), the
  `notifications_outbox`/email-template registration pattern, and the
  regex-over-source-text test convention. Confirmed `projects.budget_amount`/
  `currency` already exist as a schema anchor for invoicing; confirmed no
  Stripe integration exists anywhere yet; confirmed `project_tasks` has no
  time-tracking fields; confirmed no calendar concept beyond `due_date`.
- Loaded both requested skills. Both are generic external templates (mirrored
  from a different tool's agent-definition format) rather than
  project-specific — extracted the applicable parts only: right-size the
  architecture to this project's actual scale (small agency CRM, single
  Supabase instance, no distributed-systems overhead needed) and reuse the
  existing `WorkspaceShell`/`Skeleton`/`Spinner`/scoped-styled-jsx component
  shape for any new UI rather than inventing a new one.
- Asked the user to scope the plan; they chose **"Roadmap + Phase 1
  detailed"** — i.e. sequence all 4 areas at a paragraph level each, but
  only fully detail **invoicing** (smallest lift, has the schema anchor
  already) as an implementation-ready phase.
- Was about to dispatch a Plan agent to design that Phase-1-detailed roadmap
  when the user interrupted to handle the machine move instead. **No plan
  content was written anywhere** — the plan-mode file at
  `C:\Users\moizjmj\.claude\plans\bright-cooking-scroll.md` still holds its
  *previous* (already-completed, already-merged) content from the
  code-review-fixes batch, not this new topic.

**Next action on this:** re-enter plan mode (or just resume directly) and
dispatch the Plan agent with the context above — the open question to
resolve during that design pass is whether invoicing includes real Stripe
payment collection (Payment Links is the lowest-effort option) or is
status-tracking-only (admin/PM manually marks paid, no payment processing).

## Known unrelated noise in this working tree — do not touch

- `Dockerfile` / `app/api/health/` — a concurrent session's health-check
  addition, appeared mid-session, unrelated to any of the above.
- `.agents/workflows/` — unrelated, untracked.
- `.mcp.json` changes — mine, but a separate cleanup (removed two broken
  MCP server entries), intentionally left uncommitted/unrelated to this PR.

This matches a pattern `STATUS.md` documents happening at least twice before
this session (PR #49/#50, and the `crm/remaining-decisions` batch's `700bee7`)
— multiple sessions sharing this one checkout. Always `git status` before
assuming the tree is clean.
