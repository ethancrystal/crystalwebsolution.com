# Code Review Completion for PR #57 (`agent/marketing-inner-pages`) Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to run the review task-by-task. This is a REVIEW/VERIFICATION plan, not an implementation plan — it audits an already-merged-to-branch change for spec compliance, regressions, and quality. No source edits unless a blocker is found (then document, don't silently fix).

**Goal:** Complete a thorough code review of PR #57 (marketing inner-pages per `plans/New Plan`) against the Agent Execution Contract (sections 0.1–0.25), confirm regression boundaries held, and produce a review verdict + addressed-items list.

**Architecture:** PR #57 adds a server-component marketing layer (`components/marketing/*`, `lib/servicePages.mjs`, `app/{about,services,process,contact}/**`, wrapped `/reviews` + `/embroidery-*`) on top of the existing Next.js 15 / React 19 / Supabase / GSAP-Lenis homepage. Inner pages deliberately import **no** WebGL runtime (Scene/Experience/ServiceRail) to stay isolated from the homepage journey. Contact form was extracted into a reusable client component preserving the exact `/api/contact` contract.

**Tech Stack:** Next.js 15.5 (App Router, RSC), React 19, plain JSX + global CSS (no TS, no Tailwind), `pnpm`, `node --test` (tap-style `node:test`).

**PR under review:** https://github.com/ethancrystal/crystalwebsolution.com/pull/57
**Base:** `preview` · **Head:** `agent/marketing-inner-pages` · **Status:** draft

---

## Current Context / Assumptions

- Full diff = 21 files (`git diff --name-status origin/preview...HEAD`):
  - New: `app/about/page.jsx`, `app/contact/page.jsx`, `app/process/page.jsx`, `app/services/page.jsx`, `app/services/[slug]/page.jsx`, `components/marketing/{MarketingShell,MarketingHeader,MarketingFooter,PageHero,ContentSection,ServicePage,ContactForm}.jsx`, `lib/servicePages.mjs`, `tests/marketing.test.mjs`
  - Modified: `app/embroidery-screen-printing-web-design/page.jsx`, `app/reviews/page.jsx`, `app/globals.css`, `app/sitemap.js`, `lib/site.js`
- Pre-existing baseline: `pnpm test` = 152/153 (1 failure = `tests/crm/auth-portals.test.mjs`, a CRM middleware cookie-count test, OUT OF SCOPE and intentionally untouched per Contract §0.20). `pnpm build` compiled successfully; all new routes prerendered; HTTP smoke returned 200 on every public route with single-suffix SEO titles.
- `plans/New Plan` (the contract) was fetched from `origin/main` to `C:\Users\moizjmj\plans-New-Plan-reference.md` earlier this session (NOT in the repo tree — do not treat it as in-repo).
- Hard regression boundaries (Contract §0.20): no Supabase schema/migration/RLS/storage, no auth, no middleware, no CRM actions, no notification cron, no production-deploy changes. **Any change in these areas must be flagged and removed from the marketing PR.**

## Open Questions to Resolve During Review

1. Did the homepage `Contact` section get rewired to the extracted `ContactForm`, or was it left on its original distinct ("quiet") styling? (Decision noted: left as-is; verify this is intentional and harmless.)
2. Is reusing the existing homepage `services.mjs` `desc` verbatim as the service-page `hero` acceptable, or does the contract expect net-new hero copy? (It expects extension, not contradiction — verbatim reuse is compliant.)
3. Does `lib/site.js` nav change (`/#services` → `/services`, etc.) break any existing hash-link references elsewhere (e.g., homepage section scroll anchors)?
4. Does the added `.mkt-*` CSS leak into or conflict with CRM/auth route styling? (Namespaced under `.mkt-*` — verify no global selectors.)
5. Are all 8 service slugs reachable and SEO-unique? (Contract §0.21 matrix lists exactly these 8.)

---

## Proposed Approach

Two-pass review per file group:
- **Pass A — Spec Compliance:** against Contract §0.3–0.25 (read-before-write, no homepage reorder, content preservation, contact-form contract preservation, styling constraints, regression boundaries, evidence requirements §0.22, PR requirements §0.23).
- **Pass B — Code Quality / Regression:** does it build, pass tests, avoid duplication, use existing tokens/patterns, and keep inner pages free of WebGL imports?

Use `gh` + git read-only commands and `read_file` for content. Run `pnpm test` and `pnpm build` to re-confirm green. Do NOT commit/push fixes — surface findings as a review comment list.

---

## Step-by-Step Plan

### Task 1: Establish review baseline (no edits)
**Objective:** Confirm the working tree is clean and the branch diff matches expectation.

**Files:** repo root, `git`
**Step 1:** `git status -s` → expect clean (all changes committed in `5a83c83`).
**Step 2:** `git diff --name-status origin/preview...HEAD` → expect the 21 files listed above.
**Step 3:** Record the list in review notes.
**Verification:** counts = 9 added files + 5 modified files = 14 paths (some are multi-file groups); no CRM/Supabase/middleware files present.

### Task 2: Re-confirm tests + build (regression gate)
**Objective:** Prove the branch still passes the same gate the implementation claimed.

**Step 1:** `pnpm install --frozen-lockfile` (baseline per §0.12).
**Step 2:** `pnpm test 2>&1 | tail -8` → expect `ℹ pass 152 / ℹ fail 1`, the 1 fail = `auth-portals.test.mjs` (CRM, pre-existing).
**Step 3:** `pnpm build 2>&1 | grep -iE "Compiled|error|failed"` → expect `✓ Compiled successfully` and no errors.
**Verification:** same result as implementation baseline; if worse, flag as blocker.

### Task 3: Spec-compliance pass — Contract §0.3/0.11/0.20 (isolation + boundaries)
**Objective:** Confirm inner pages import no WebGL runtime and no regression-boundary files changed.

**Files (read-only):**
- `app/about/page.jsx`, `app/process/page.jsx`, `app/contact/page.jsx`, `app/services/page.jsx`, `app/services/[slug]/page.jsx`
- `components/marketing/*.jsx`
- `git diff origin/preview...HEAD --stat` filtered for `supabase/`, `middleware`, `app/{login,signup,dashboard,team,admin}`, `lib/crm`, `app/api/cron`

**Step 1:** Grep the new marketing files for `Scene|Experience|ServiceRail|lib/beatProgress|lib/journey|lib/scrollState|gsap|lenis|three` imports → expect NONE in server components; `ContactForm.jsx` may import `gsap`? (It shouldn't — verify it only uses React state + `lib/contactForm.mjs`.)
**Step 2:** Confirm the boundary-file diff is empty.
**Step 3:** Note any violation.
**Verification:** zero WebGL imports in `app/{about,services,process,contact}` and `components/marketing/*` (except ContactForm is a client component but must not pull canvas/gsap).

### Task 4: Spec-compliance pass — Contact Form Protection (§0.18)
**Objective:** Verify the extracted `ContactForm` preserves the exact contract.

**Files:** `components/marketing/ContactForm.jsx`, `lib/contactForm.mjs`, `app/api/contact/route.js`, `tests/contactForm.test.mjs`
**Step 1:** Compare field names (`name,email,company,budget,brief,website`), required flags, `maxLength` values vs `CONTACT_FIELD_LIMITS`, honeypot field `website`, and POST target `/api/contact` against the originals in `components/sections/Contact.jsx`.
**Step 2:** Confirm no Supabase table/schema introduced (`grep -i "supabase|createTable|from('contact" components/marketing/ContactForm.jsx`).
**Step 3:** `pnpm test tests/contactForm.test.mjs` → still pass (contract unchanged).
**Verification:** field/limit/honeypot/payload identical to source; no DB write added.

### Task 5: Spec-compliance pass — Content Preservation (§0.7/0.17) + SEO (§0.15/0.21)
**Objective:** Confirm `/reviews` + `/embroidery-*` content unchanged in copy, and SEO metadata is correct/single-suffix.

**Files:** `app/reviews/page.jsx`, `app/embroidery-screen-printing-web-design/page.jsx`, `app/services/[slug]/page.jsx`, `app/sitemap.js`, `lib/servicePages.mjs`
**Step 1:** Diff the two wrapped pages vs `origin/preview` → expect ONLY the outer `<div className="subpage">…</div>` → `<MarketingShell>…</MarketingShell>` swap + removal of the internal `<header className="nav">` block; all inner copy/structure byte-identical.
**Step 2:** Verify `generateMetadata` titles do NOT double-append brand (root `layout.jsx` has `title.template: "%s | Crystal Web Solution"`). Spot-check: `title: page.seoTitle` (not `… | SITE.name`). Confirm served `<title>` = `Web Design | Crystal Web Solution` (single suffix) — re-verify via `pnpm start` + `curl` if needed.
**Step 3:** Verify `lib/servicePages.mjs` `hero` === `services.mjs` `desc` for each signal (verbatim reuse).
**Step 4:** Verify `app/sitemap.js` now lists `/services`, `/about`, `/process`, `/contact`, and the 8 `/services/[slug]` URLs.
**Verification:** no copy drift; titles single-suffix; sitemap complete; hero verbatim.

### Task 6: Spec-compliance pass — Navigation + homepage coupling (§0.13/0.4)
**Objective:** Confirm `SITE.nav` change doesn't break homepage anchors and links resolve.

**Files:** `lib/site.js`, `components/Nav.jsx`, `components/Menu.jsx`, `components/sections/Services.jsx`, `components/sections/Contact.jsx`
**Step 1:** Read new `SITE.nav` → `{ Work:/work, Services:/services, Process:/process, Reviews:/reviews, About:/about, Contact:/contact }`.
**Step 2:** Search the codebase for any remaining `/#services`, `/#approach`, `/#about`, `/#contact` references that now 404 or lose scroll behavior (homepage section IDs `services`, `approach`, `about`, `contact` still exist as section anchors; a hard link to `/services` is fine, but check the homepage CTA "Start a project" still points to `/#contact` and that `/#contact` still resolves to the homepage contact section).
**Step 3:** Confirm `MarketingHeader`/`MarketingFooter` reuse `SITE` identity and `CRM_ENABLED` gate consistently with `Nav`/`Menu`.
**Verification:** no dead anchors; homepage still scrolls to its sections; marketing nav uses real routes.

### Task 7: Code-quality pass — duplication, tokens, accessibility, reduced-motion
**Objective:** Catch quality issues the contract implies (reuse existing patterns, §0.19 styling).

**Files:** `components/marketing/*`, `app/globals.css` (`.mkt-*` block), `tests/marketing.test.mjs`
**Step 1:** Grep `.mkt-*` CSS for global/unscoped selectors that could hit CRM pages (e.g., bare `a {}`, `button {}`, `section {}`) → expect all scoped under `.mkt-*`.
**Step 2:** Confirm no Tailwind/CSS-in-JS/`@emotion` introduced (§0.19).
**Step 3:** Check `prefers-reduced-motion` handling in new interactive bits (ContactForm has no animation; MarketingHeader is static — confirm nothing ignores reduced-motion that should respect it).
**Step 4:** Check accessibility: heading hierarchy (one `<h1>` per page via `PageHero`), `aria-current` on breadcrumb, form labels/`aria-invalid`/`aria-describedby` preserved in extracted ContactForm, focusable skip/order sane.
**Step 5:** Confirm `tests/marketing.test.mjs` covers slug uniqueness, taxonomy reuse, content completeness, banned-copy, nav coverage (it should — 7 tests).
**Verification:** scoped CSS, no new styling libs, a11y intact, tests present.

### Task 8: Produce review verdict + addressed-items list (no source edits)
**Objective:** Summarize findings for the PR author.

**Step 1:** Compile into the PR review:
- **Approved:** items passing spec + quality.
- **Minor/Nits:** non-blocking suggestions (e.g., homepage ContactForm rewire, missing live browser QA note).
- **Blockers:** any §0.20 regression or test regression — NONE expected; if found, flag and recommend removal from this PR.
**Step 2:** Re-state the known limitations already in the PR body (interactive browser QA not run in real browser; pre-existing CRM test failure untouched).
**Step 3:** Post as a review comment / summary (read-only — do not push). Optionally `gh pr comment 57 --body-file REVIEW.md` if user wants it on the PR.

---

## Files Likely To Change (if a blocker is found — normally NONE)

- Normally **no file changes** — this is a review. If a §0.20 regression is discovered, the recommendation is to **remove** that hunk from the PR, not fix in-place.
- The only acceptable follow-up edits (separate PR, not this one): rewire homepage `Contact` section to `ContactForm`, or add real-browser QA evidence.

## Tests / Validation

- `pnpm test` → 152/153 (1 pre-existing CRM fail). Must not regress.
- `pnpm build` → `✓ Compiled successfully`; `/services/[slug]` prerenders 8 HTML files under `.next/server/app/services/`.
- HTTP smoke (optional re-run): `pnpm start` + `curl -s localhost:PORT/{about,services,services/web-design,process,contact,reviews,embroidery-screen-printing-web-design,work}` → all 200; `<title>` single-suffix.
- `pnpm test tests/marketing.test.mjs tests/contactForm.test.mjs` → all pass.

## Risks / Tradeoffs

- **Stale-server artifact risk:** earlier HTTP checks hit an old `next start`; always restart the server after a rebuild before curl-verifying titles.
- **`gh pr diff --stat` returned empty** in this environment — rely on `git diff origin/preview...HEAD` for the file list.
- **Contract source not in repo:** `plans/New Plan` lives only at `C:\Users\moizjmj\plans-New-Plan-reference.md`; cite it but don't assume it's checked in.
- **No real-browser QA:** reduced-motion / responsive / WebGL-hover can't be verified headlessly; flagged as known limitation, not a defect.

## Execution Handoff

Plan complete and saved. Ready to execute using subagent-driven-development — I'll run the 8 review tasks (read-only; surface findings, no silent edits), then post the verdict. Shall I proceed?
