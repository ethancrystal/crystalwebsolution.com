# Crystal Web Solution — Migration Plan

**Date:** 2026-08-14  
**Status:** Ready for implementation

---

## Priority 0: Critical Fixes (Do First)

### M1: Fix `removeProjectAssignment` Syntax Error
**File:** `app/actions/project-actions.js:295-325`

**Current broken code:**
```javascript
export async function removeProjectAssignment(formData) {
  const requestId = randomUUID();
  const profile = await authenticatedProfile(['admin']);
  if (!profile) return invalid(requestId, 'You are not authorized to remove assignments.');

  const projectId = formString(formData, 'projectId');
  const userId = formString(formData, 'userId');
  if (!isCanonicalUuid(projectId) || !isCanonicalUuid(userId)) {
    return invalid(requestId, 'Choose a valid project and assignee.');
  }

  const client = await actionClient(requestId, 'Unable to remove this assignment.');
  if (client.failure) return client.failure;
  const { data, error } = await runRpc(() =>
    client.supabase.rpc('remove_project_assignment', {
      p_project_id: projectId,
      p_user_id: userId,
    }),
  );

  if (error || !isCanonicalUuid(data)) {
    return databaseFailure(error, requestId, 'Unable to remove this assignment.');
  }

  revalidateAssignmentPaths(projectId);
  return success(requestId, { assignmentId: data });
}
```

**Issue:** Lines 300-320 show corrupted code with `const visibility) ||` syntax error.

**Fix:** Rewrite function body with correct logic matching `assignProject` pattern.

---

### M2: Create Missing Migration `0016`
**File:** `supabase/migrations/0016_fix_handle_new_user_coalesce.sql`

**Context:** Live database has this migration applied but no local file exists.

**Action:**
```sql
-- Fetch live function definition from Supabase MCP
-- Compare with 0014's handle_new_user()
-- Create migration file documenting the fix
```

---

### M3: Gitignore Untracked SEO CSVs
**File:** `.gitignore`

**Action:** Add:
```
public/accessibility_all.csv
public/sitemaps_all.csv
public/structured_data_all.csv
public/*.csv
```

---

## Priority 1: CRM Hardening (Week 1-2)

### M4: Extract CRM Design Tokens
**New File:** `lib/crm/design-tokens.js`

**Content:**
```javascript
export const CRM_TOKENS = Object.freeze({
  colors: {
    background: 'rgba(15, 20, 40, 0.6)',
    border: 'rgba(100, 200, 255, 0.15)',
    textMuted: '#8b98b8',
    success: '#64ffb2',
    warning: '#ffd08a',
    error: '#ff9999',
    accent: '#64c8ff',
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },
  radius: {
    sm: '6px',
    md: '12px',
    lg: '20px',
  },
});
```

**Migration:** Update all `components/crm/*.jsx` to import and use tokens.

---

### M5: Fix ProjectThread Realtime Churn
**File:** `components/crm/ProjectThread.jsx:65`

**Current:**
```javascript
}, [projectId, profile?.id, profile?.role, profile?.company_id]);
```

**Fix:**
```javascript
// Remove profile?.company_id — not used in callback body
}, [projectId, profile?.id, profile?.role]);
```

---

### M6: Add Realtime Task Updates
**New File:** `lib/crm/realtime-tasks.js`

**Feature:** Subscribe to `project_tasks` changes in `ProjectTasks.jsx`

**Implementation:**
```javascript
export function useTaskRealtime(projectId, profile, onUpdate) {
  useEffect(() => {
    if (!projectId) return;
    
    const supabase = createClient();
    const channel = supabase
      .channel(`project-tasks-${projectId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'project_tasks', filter: `project_id=eq.${projectId}` },
        () => onUpdate(),
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, onUpdate]);
}
```

---

### M7: Complete CRM Loading States
**Files:** ~19 CRM pages

**Action:** Apply `Skeleton.jsx` and `Spinner.jsx` to:
- `app/dashboard/projects/[id]/page.jsx`
- `app/team/projects/[id]/page.jsx`
- `app/admin/projects/[id]/page.jsx`
- All `/new` and `/edit` pages

---

## Priority 2: Marketing Enhancements (Week 2-3)

### M8: Per-Service Landing Pages
**New Files:**
- `app/services/[slug]/page.jsx` (already exists, needs enhancement)
- `components/marketing/ServiceLanding.jsx`

**Feature:** SEO-optimized content for each service with dynamic schema.org markup.

---

### M9: Case Study Filters
**File:** `components/marketing/WorkLibrary.jsx`

**Feature:** Filter projects by category with URL state persistence.

**Implementation:**
```javascript
// URL: /work?category=web_design
// Filter projects array client-side
// Persist filter in URL for sharing
```

---

### M10: Interactive Process Builder
**New File:** `components/marketing/ProcessBuilder.jsx`

**Feature:** Click-through 4-step process with progress saving to localStorage.

---

## Priority 3: Testing & DevOps (Week 3-4)

### M11: Playwright E2E Suite
**New Files:**
- `tests/e2e/crm-three-role-flow.spec.js`
- `tests/e2e/marketing-pages.spec.js`
- `playwright.config.js`

**Test Coverage:**
1. Client login → project creation → project visibility
2. PM login → task assignment → status transition
3. Admin login → user invitation → role assignment
4. Message editing → Realtime delivery → notification email
5. File upload → download → signed URL expiry

---

### M12: Visual Regression Tests
**Integration:** Percy or Chromatic

**Setup:**
```javascript
// playwright.config.js
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  snapshotDir: './tests/e2e/snapshots',
});
```

---

### M13: GitHub Actions CI/CD
**New File:** `.github/workflows/ci.yml`

**Pipeline:**
```yaml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm test
      - run: pnpm build
      - run: pnpm test:e2e
```

---

## Priority 4: Architecture Improvements (Month 2)

### M14: Extract Shared Filters
**New File:** `lib/crm/filters.js`

**Move from:** `lib/crm/projects.js`
```javascript
// Extract these functions:
function sharedOnly(rows, role) { ... }
function clientVisibleOnly(tasks, role) { ... }
```

---

### M15: CRM Mobile Responsive
**File:** `app/globals.css`

**Add media queries:**
```css
@media (max-width: 768px) {
  .crm-sidebar {
    display: none;
  }
  
  .crm-mobile-nav {
    display: flex;
  }
  
  .crm-task-list {
    overflow-x: auto;
  }
}
```

---

### M16: Email Digest Feature
**New Table:** `email_digest_subscriptions`

**Migration:**
```sql
CREATE TABLE email_digest_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  project_id UUID REFERENCES projects(id),
  frequency TEXT CHECK (frequency IN ('daily', 'weekly')),
  last_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Cron Job:** Daily worker sends digests to subscribers.

---

## Priority 5: Advanced Features (Quarter)

### M17: Gantt Chart Timeline
**New File:** `components/crm/TimelineGantt.jsx`

**Feature:** Visual timeline showing tasks overlaid on project status history.

**Dependencies:** DHTMLX Gantt or custom SVG implementation.

---

### M18: Client Feedback Widget
**New Table:** `project_feedback`

**Migration:**
```sql
CREATE TABLE project_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),
  client_id UUID NOT NULL REFERENCES profiles(id),
  nps_score INT CHECK (nps_score BETWEEN 0 AND 10),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### M19: 3D Crystal Configurator
**New File:** `components/marketing/CrystalConfigurator.jsx`

**Feature:** Let users customize crystal colors/rotation on homepage.

**Implementation:** Extend `components/three/Crystal.jsx` with color pickers.

---

### M20: Monorepo Evaluation
**Decision Point:** Consider splitting CRM to separate Next.js app.

**Evaluation Criteria:**
- CRM traffic volume
- Independent deployment needs
- Team structure
- Security isolation requirements

---

## Verification Checklist

After each migration:
- [ ] `pnpm test` passes
- [ ] `pnpm build` passes
- [ ] CRM portal login works for all 3 roles
- [ ] No console errors in browser devtools
- [ ] Reduced motion respected
- [ ] Keyboard navigation works
- [ ] Mobile responsive (390px, 768px, 1440px)

---

## Rollback Plan

If any migration causes issues:
1. Document the breaking change
2. Create reverse migration
3. Update STATUS.md with incident report
4. Review and update this plan

---

*Generated by Agnes AI — 2026-08-14*
