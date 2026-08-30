# CD Sportswear USA — Design & Architecture Critique

**Date:** 2026-08-14  
**Scope:** Full application — marketing site + CRM  
**Categories:** Design / Refactoring / Upgrades / Testing Strategy

---

## 1. Design Critique

### 1.1 Strengths

| Area | What Works Well |
|------|-----------------|
| **Visual Identity** | Dark cinematic WebGL homepage with consistent design tokens (`--cyan`, `--blue`, `--violet`, `--bg`, `--ink`) in `globals.css`. The one-Canvas, one-Raf-clock architecture is elegant and performant. |
| **CRM Architecture** | Three-role hierarchy (client, project_manager, admin) with exact middleware gating. RLS-enforced data access with SECURITY DEFINER RPCs. The project delivery aggregate (`projects` + `project_assignments` + `project_messages`) is clean. |
| **Test Coverage** | Strong contract-testing approach via regex-over-source for CRM modules. `pnpm test` runs 225+ tests. DB tests via Supabase CLI for schema invariants. |
| **Accessibility** | Reduced-motion gating on all animations. Focus-visible outlines in CRM. `aria-hidden` correctly applied to decorative canvas elements. |
| **Code Hygiene** | Module-level singleton pattern for per-frame state (no React state churn). Pre-allocated Three.js objects outside `useFrame`. Frame-rate-independent damping with exponential decay. |

### 1.2 Design Gaps & Opportunities

| # | Gap | Severity | Recommendation |
|---|-----|----------|----------------|
| D1 | **No shared design system file for CRM** — CRM styles are scattered across `styled-jsx` blocks in each component. No central token map for CRM UI. | Medium | Create `lib/crm/design-tokens.js` exporting color, spacing, and typography constants used across all CRM components. |
| D2 | **Marketing inner pages lack visual consistency with homepage** — Inner pages use `MarketingShell` but don't leverage the WebGL scene backdrop. `IdleScene` variants exist but are incomplete. | Medium | Standardize `IdleScene` usage across all inner pages; add `SceneActivity`-based fade-in on scroll for inner page canvases. |
| D3 | **No responsive CRM dashboard mobile layout** — CRM pages work on desktop but lack mobile-optimized layouts (sidebar collapse, touch targets). | High | Add CSS media queries for CRM sidebar → bottom-nav on mobile (<768px). Ensure 44px touch targets per WCAG. |
| D4 | **ServiceEmblem3D tooltip is click-only** — No hover state, no keyboard reveal. | Low | Add `onFocus` handler to tooltip button. Support `Enter`/`Space` keypress. |
| D5 | **No loading skeleton for CRM list pages** — `Spinner.jsx` exists but isn't used on companies/contacts/deals lists. | Medium | Apply `Skeleton.jsx` pattern to all CRM list pages (companies, contacts, deals, tasks, users). |
| D6 | **No empty-state illustrations** — CRM empty states are text-only (`"No messages yet — say hello."`). | Low | Add procedural SVG empty-state illustrations matching the crystal aesthetic. |

### 1.3 Design System Recommendations

```css
/* Proposed additions to globals.css */
:root {
  /* CRM-specific tokens */
  --crm-bg: rgba(15, 20, 40, 0.6);
  --crm-border: rgba(100, 200, 255, 0.15);
  --crm-text-muted: #8b98b8;
  --crm-success: #64ffb2;
  --crm-warning: #ffd08a;
  --crm-error: #ff9999;
  
  /* Spacing scale */
  --crm-space-xs: 0.25rem;
  --crm-space-sm: 0.5rem;
  --crm-space-md: 1rem;
  --crm-space-lg: 1.5rem;
  --crm-space-xl: 2rem;
  
  /* Border radius */
  --crm-radius-sm: 6px;
  --crm-radius-md: 12px;
  --crm-radius-lg: 20px;
}
```

---

## 2. Refactoring Opportunities

### 2.1 Critical Refactors

| # | File(s) | Issue | Fix |
|---|---------|-------|-----|
| R1 | `app/actions/project-actions.js:300-320` | `removeProjectAssignment` has malformed code — `const visibility) ||` is a syntax error waiting to happen. | **URGENT:** Fix the broken syntax. The function body appears corrupted. |
| R2 | `components/crm/ProjectThread.jsx:65` | `load` useCallback deps are correct but `profile?.company_id` dependency is unnecessary (not used in callback body). | Remove `profile?.company_id` from deps array to reduce churn. |
| R3 | `lib/crm/projects.js` | Multiple helper functions (`sharedOnly`, `clientVisibleOnly`) duplicated across read-model. | Extract to `lib/crm/filters.js` singleton. |
| R4 | `components/crm/ProjectTasks.jsx` | Priority badge renders but no edit UI exists (latent bug from plan). | **Defer** until task-edit UI is designed (see known gaps in STATUS.md). |

### 2.2 Medium Refactors

| # | File(s) | Issue | Fix |
|---|---------|-------|-----|
| R5 | `app/api/cron/crm-notifications/route.js` | Cron secret hardcoded in route file. | Extract to `lib/email/cron-config.js` with env var validation. |
| R6 | `components/marketing/ServiceEmblem.jsx` | Both SVG and 3D variants have duplicated tooltip logic. | Extract to `ServiceEmblemTooltip.jsx` shared component. |
| R7 | `components/sections/` | Each section re-imports `SectionReveal` individually. | Create `lib/sections/reveal-helpers.mjs` with pre-wrapped section templates. |
| R8 | `lib/journey.js` + `lib/beatProgress.js` | Camera stops and beat measurements are decoupled. | Add validation that every STOPS entry has a matching BEAT_ID. |

### 2.3 Housekeeping Refactors

| # | File | Action |
|----|------|--------|
| R9 | `docs/plans/*.md` | Archive completed plans (Tasks 1-8 from all 4 plans are implemented). |
| R10 | `supabase/migrations/0007_*.sql` | Document as intentionally skipped (already done in STATUS.md). |
| R11 | `public/*.csv` | Gitignore untracked SEO audit exports (mentioned in STATUS.md known gaps). |
| R12 | `tests/marketing/serviceEmblem3d.test.jsx` | One pre-existing vitest/jsdom harness quirk causing 1/18 test failure. |

---

## 3. Upgrades & New Features

### 3.1 CRM Upgrades

| # | Feature | Scope | Priority |
|---|---------|-------|----------|
| U1 | **Real-time task updates** | Subscribe to `project_tasks` changes via Supabase Realtime (same pattern as `ProjectThread`). | High |
| U2 | **Deliverable versioning UI** | Show version history with diff view for `project_deliverables.version`. | Medium |
| U3 | **Client feedback widget** | Post-delivery NPS survey stored in new `project_feedback` table. | Medium |
| U4 | **Project timeline Gantt view** | Visual timeline showing tasks overlaid on project status history. | Low |
| U5 | **Bulk task operations** | Multi-select tasks for status/priority updates. | Low |
| U6 | **Email digest subscription** | Allow clients to opt into daily/weekly project summaries. | Low |

### 3.2 Marketing Site Upgrades

| # | Feature | Scope | Priority |
|---|---------|-------|----------|
| U7 | **Per-service landing pages** | Split `/services` into individual `/services/[slug]` with SEO-optimized content. | High |
| U8 | **Interactive process builder** | Let users click through the 4-step approach with progress saving. | Medium |
| U9 | **Case study filters** | Filter work by category (web_design, branding, etc.) with URL state. | Medium |
| U10 | **Review submission form** | Allow clients to submit reviews (moderated, stored in DB). | Low |
| U11 | **3D configurator** | Let users customize crystal colors/rotation on homepage. | Low |

### 3.3 Performance Upgrades

| # | Upgrade | Impact |
|---------|---------|--------|
| U12 | **Lazy-load CRM components** | Split `ProjectThread`, `ProjectTasks`, etc. into route-level code splits. |
| U13 | **WebGL texture compression** | Use KTX2/_basisu for any added textures (currently procedural, so low impact). |
| U14 | **Font preloading** | Add `next/font` preload hints for Space Grotesk/Inter/Space Mono. |
| U15 | **Redis cache layer** | Cache frequent CRM reads (project lists) for 60s. |

---

## 4. Testing Strategy

### 4.1 Current Test Coverage

| Category | Files | Count | Coverage Notes |
|----------|-------|-------|----------------|
| CRM Contracts | `tests/crm/*.test.mjs` | ~26 files | Regex-over-source for schema, actions, migrations. Strong. |
| Marketing Components | `tests/marketing/*.test.jsx` | ~8 files | React Testing Library for ServiceEmblem, ImageBlock, FAQ schema. |
| DB Tests | `supabase/tests/*.test.sql` | 1 file | pgTAP for RLS matrix, Realtime auth. |
| E2E | `tests/e2e/` | 0 files | **NOT YET IMPLEMENTED** — planned in Task 8 of production plan. |
| Full Suite | `pnpm test` | 225 passing | 1 pre-existing unrelated failure (`auth-portals`). |

### 4.2 Testing Gaps

| # | Gap | Risk | Recommendation |
|---|-----|------|----------------|
| T1 | **No E2E tests** | High | Implement Playwright suite for three-role CRM flows (login, project creation, messaging, file upload). |
| T2 | **No visual regression tests** | Medium | Add Percy/Chromatic for marketing site. |
| T3 | **No load/stress tests** | Low | Add k6 scripts for CRM API endpoints. |
| T4 | **No accessibility audit automation** | Medium | Add axe-core to Playwright tests. |
| T5 | **CRM loading states untested** | Low | Test skeleton/spinner visibility in error/loading states. |

### 4.3 Test Strategy Framework

```
Layer 1: Unit Tests (Jest/Vitest)
  - Pure functions (project-contract, email templates)
  - Component rendering (ServiceEmblem, ImageBlock)
  
Layer 2: Contract Tests (Node --test)
  - Source code regex assertions (existing pattern)
  - Migration file structure validation
  - Action import/exports validation
  
Layer 3: Database Tests (pgTAP)
  - RLS policy verification
  - Function behavior matrix
  - Schema invariant checks
  
Layer 4: Integration Tests (Playwright)
  - Three-role login flows
  - Project CRUD operations
  - Realtime message delivery
  - File upload/download
  
Layer 5: E2E Tests (Playwright)
  - Full user journeys
  - Cross-browser validation
  - Mobile responsive checks
```

### 4.4 Recommended Test Additions

```js
// tests/e2e/crm-three-role-flow.spec.js
import { test, expect } from '@playwright/test';

test.describe('CRM Three-Role Hierarchy', () => {
  test('client can create project and see it in dashboard', async ({ page }) => {
    // Login as client
    await page.goto('/login/client');
    await page.fill('input[name="email"]', 'ethan+client@crystalwebsolution.com');
    await page.fill('input[name="password"]', process.env.E2E_CLIENT_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Create project
    await page.goto('/dashboard');
    await page.click('button:has-text("New Project")');
    await page.selectOption('select[name="category"]', 'web_design');
    await page.fill('input[name="title"]', 'Test Project');
    await page.fill('textarea[name="brief"]', 'Test brief');
    await page.click('button[type="submit"]');
    
    // Verify project appears
    await expect(page.locator('text=Test Project')).toBeVisible();
  });
  
  test('internal messages are hidden from client', async ({ page }) => {
    // Login as PM, post internal message
    // Login as client, verify message not visible
  });
});
```

---

## 5. Known Issues & Technical Debt

### 5.1 Critical (Fix Immediately)

| # | Issue | Location | Action |
|---|-------|----------|--------|
| K1 | **Corrupted function body** | `app/actions/project-actions.js:300-320` | Fix `removeProjectAssignment` syntax error. |
| K2 | **Migration drift** | `fix_handle_new_user_coalesce` has no local file | Create `supabase/migrations/0016_fix_handle_new_user_coalesce.sql`. |
| K3 | **Untracked SEO CSVs** | `public/*.csv` (~30 files) | Gitignore or delete — these are publicly downloadable. |

### 5.2 High Priority

| # | Issue | Location | Action |
|---|-------|----------|--------|
| K4 | **Realtime subscription churn** | `ProjectThread.jsx:65` | Remove unnecessary `profile?.company_id` from deps. |
| K5 | **Missing E2E suite** | `tests/e2e/` | Implement Playwright tests for CRM core flows. |
| K6 | **CRM loading states incomplete** | ~19 files | Apply `Spinner.jsx`/`Skeleton.jsx` to all detail/edit pages. |
| K7 | **`updateProjectTask` wrong revalidation ID** | `app/actions/project-actions.js` | Fix before adding task-edit UI (latent bug). |

### 5.3 Medium Priority

| # | Issue | Location | Action |
|---|-------|----------|--------|
| K8 | **No shared CRM design tokens** | `app/globals.css` | Extract CRM colors/spacing to `--crm-*` variables. |
| K9 | **Inner pages lack WebGL backdrop** | `components/marketing/MarketingShell.jsx` | Integrate `IdleScene` variants consistently. |
| K10 | **No task edit UI** | `components/crm/ProjectTasks.jsx` | Defer until K7 is fixed. |
| K11 | **ServiceEmblem tooltip accessibility** | `components/three/ServiceEmblem3D.jsx` | Add keyboard support. |

---

## 6. Architecture Recommendations

### 6.1 Proposed File Structure Changes

```
lib/
  crm/
    filters.js          # Extract sharedOnly, clientVisibleOnly
    design-tokens.js    # New: CRM color/spacing constants
    realtime.js         # New: Realtime subscription helpers
components/
  crm/
    TaskEditForm.jsx    # New: Task editing UI (post-K7 fix)
    TimelineGantt.jsx   # New: Visual timeline view
    FeedbackWidget.jsx  # New: Client feedback form
marketing/
  ServiceLanding.jsx    # New: Per-service page template
```

### 6.2 Monorepo Considerations

Current structure keeps marketing and CRM in one Next.js app. Consider:
- **Option A:** Keep monolith (current) — simpler deployment, shared auth.
- **Option B:** Split CRM to separate Next.js app — better isolation, independent scaling.
- **Recommendation:** Stay monolith until CRM traffic justifies separate deployment.

### 6.3 Database Schema Improvements

```sql
-- Proposed: project_feedback table
CREATE TABLE project_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),
  client_id UUID NOT NULL REFERENCES profiles(id),
  nps_score INT CHECK (nps_score BETWEEN 0 AND 10),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Proposed: email_digest_subscriptions table
CREATE TABLE email_digest_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  project_id UUID REFERENCES projects(id),
  frequency TEXT CHECK (frequency IN ('daily', 'weekly')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 7. Migration & Deployment Recommendations

### 7.1 Migration Hygiene

| Issue | Current State | Recommendation |
|-------|---------------|----------------|
| Untracked migrations | `fix_handle_new_user_coalesce` | Create proper `0016` file. |
| Migration numbering | 0001–0023 with gaps | Document gap rationale in STATUS.md. |
| Live vs. local drift | `0007` skipped, `0009b` ad-hoc | Keep STATUS.md as source of truth. |

### 7.2 Deployment Pipeline Improvements

```yaml
# .github/workflows/ci.yml (proposed additions)
steps:
  - name: Run E2E tests
    run: pnpm test:e2e
  - name: Visual regression check
    uses: chroma/action@v1
  - name: Accessibility audit
    run: npx pa11y-ci --sitemap https://preview.crystalwebsolution.com/sitemap.xml
```

---

## 8. Summary & Next Steps

### Immediate Actions (This Week)
1. **Fix K1:** Repair `removeProjectAssignment` syntax error in `project-actions.js`.
2. **Fix K3:** Gitignore or delete untracked `public/*.csv` files.
3. **Create K2:** Add `0016_fix_handle_new_user_coalesce.sql` migration file.

### Short-Term (Next 2 Weeks)
4. **Fix K4:** Remove unnecessary `profile?.company_id` from `ProjectThread.jsx` deps.
5. **Implement T1:** Start Playwright E2E test suite for CRM flows.
6. **Apply D1:** Create `lib/crm/design-tokens.js` and migrate CRM components.

### Medium-Term (Next Month)
7. **Implement U1:** Realtime task updates in `ProjectTasks.jsx`.
8. **Implement U7:** Per-service landing pages with SEO content.
9. **Apply D3:** Mobile-responsive CRM dashboard layout.

### Long-Term (Quarter)
10. **Implement U4:** Gantt chart timeline view.
11. **Implement U11:** 3D crystal configurator.
12. **Evaluate Option B:** Consider CRM monorepo split.

---

*Generated by Agnes AI — 2026-08-14*  
*Based on codebase analysis of CD Sportswear USA (Next.js 15, React 19, Supabase)*
