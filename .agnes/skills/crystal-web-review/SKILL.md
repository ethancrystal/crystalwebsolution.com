---
name: crystal-web-review
description: 'Run a comprehensive audit of Crystal Web Solution codebase. Use when the user asks to review, critique, analyze, or audit the app for refactoring opportunities, design issues, testing gaps, or migration planning.'
metadata:
  argument-hint: '[audit-scope] [output-path]'
---

# Crystal Web Solution — Full App Audit Skill

Use this skill when the user asks to review, audit, critique, or analyze the Crystal Web Solution codebase. This skill documents the complete audit workflow used to produce the design critique, migration plan, and skills compilation.

## When to Use
- User asks to "review the app", "audit the codebase", "find refactoring opportunities", "design critique", "testing strategy"
- User wants to identify bugs, performance issues, or missing features
- User needs a comprehensive report on CRM or marketing site health

## Input Parameters
- `audit-scope` (optional): "crm", "marketing", "full", "design", "testing"
- `output-path` (optional): Where to write reports (default: `docs/`)

## Step 1: Explore Codebase Structure

Run these commands to map the codebase:
```bash
# List top-level structure
ls -la

# Show component tree
find components -type f -name "*.jsx" | head -50

# List all migrations
ls supabase/migrations/

# Check package.json for dependencies
cat package.json
```

## Step 2: Read Key Architecture Files

Read these files to understand the architecture:
1. `CLAUDE.md` — Project overview and conventions
2. `STATUS.md` — Current implementation status and known gaps
3. `lib/site.js` — Single source of truth for brand/contact info
4. `middleware.js` — Auth/role routing logic
5. `app/globals.css` — Design tokens (first 100 lines)

## Step 3: Analyze CRM System

Read these critical CRM files:
- `lib/crm/projects.js` — Read model (first 100 lines)
- `app/actions/project-actions.js` — Server actions (first 200 lines)
- `components/crm/ProjectThread.jsx` — Message thread component
- `components/crm/ProjectTasks.jsx` — Task list component
- `components/crm/ProjectOverview.jsx` — Project details component
- `components/crm/EntityNotes.jsx` — Company/contact notes

Check for:
- [ ] Syntax errors or corrupted function bodies
- [ ] Missing RLS policy enforcement
- [ ] Unnecessary re-renders (check useCallback deps)
- [ ] Hardcoded colors (should use design tokens)
- [ ] Missing loading states

## Step 4: Analyze Marketing Site

Read these key marketing files:
- `components/sections/*.jsx` — Homepage sections
- `components/three/*.jsx` — WebGL components
- `components/marketing/*.jsx` — Inner page components
- `lib/journey.js` — Camera choreography
- `lib/beatProgress.js` — Scroll measurements

Check for:
- [ ] Accessibility issues (aria-hidden, focus-visible)
- [ ] Performance issues (allocation in useFrame)
- [ ] Reduced motion support
- [ ] Design token usage

## Step 5: Check Test Coverage

Run tests to verify current coverage:
```bash
pnpm test
pnpm test:crm
pnpm build
```

Document:
- Total test count
- Passing/failing breakdown
- Missing test areas (E2E, visual regression, a11y)

## Step 6: Generate Design Critique Report

Write a report to `docs/DESIGN-CRITIQUE.md` with these sections:
1. **Design Critique** — Strengths, gaps, opportunities
2. **Refactoring Opportunities** — Critical, medium, housekeeping
3. **Upgrades & New Features** — CRM, marketing, performance
4. **Testing Strategy** — Current coverage, gaps, recommendations
5. **Known Issues** — Critical, high, medium priority
6. **Architecture Recommendations** — File structure, database schema

## Step 7: Generate Migration Plan

Write a report to `docs/MIGRATION-PLAN.md` with these sections:
1. **Priority 0: Critical Fixes** — Syntax errors, missing migrations, security
2. **Priority 1: CRM Hardening** — Design tokens, Realtime, loading states
3. **Priority 2: Marketing Enhancements** — Landing pages, filters, interactives
4. **Priority 3: Testing & DevOps** — E2E, visual regression, CI/CD
5. **Priority 4: Architecture Improvements** — Shared filters, mobile responsive
6. **Priority 5: Advanced Features** — Gantt, feedback, 3D configurator

Include verification checklist and rollback plan.

## Step 8: Compile Plugins & Skills List

Create `docs/PLUGINS-AND-SKILLS.md` with:
1. **Existing Skills & Superpowers** — List all in-repo and built-in skills
2. **Builder.io Compatibility Layer** — SDK integration, component mapping
3. **Agnes AI Skills** — Custom skills to create (crm-audit, crm-migration, etc.)

## Step 9: Create Custom Agnes Skills

Create these skill files in `.agnes/skills/`:
- `crm-audit.md` — CRM security and correctness audit
- `crm-migration.md` — Safe Supabase migration creation
- `marketing-visual.md` — Procedural 3D visual creation
- `design-system-audit.md` — CSS token audit and improvement
- `performance-profile.md` — WebGL/React/Supabase profiling
- `accessibility-audit.md` — WCAG 2.1 AA compliance check

## Step 10: Final Verification

Run final checks:
```bash
pnpm test
pnpm build
```

Verify:
- [ ] All reports written to `docs/`
- [ ] All skill files created in `.agnes/skills/`
- [ ] No new errors introduced
- [ ] Build passes clean

## Output Files

This skill produces:
- `docs/DESIGN-CRITIQUE.md` — Full design and architecture critique
- `docs/MIGRATION-PLAN.md` — Prioritized migration roadmap
- `docs/PLUGINS-AND-SKILLS.md` — Plugins/skills reference
- `.agnes/skills/crm-audit.md` — Custom audit skill
- `.agnes/skills/crm-migration.md` — Migration creation skill
- `.agnes/skills/marketing-visual.md` — Visual creation skill
- `.agnes/skills/design-system-audit.md` — Design system skill
- `.agnes/skills/performance-profile.md` — Performance skill
- `.agnes/skills/accessibility-audit.md` — A11y skill

## Stop Conditions
- Stop if `pnpm build` fails — report error and halt
- Stop if critical syntax error found in `project-actions.js` — flag immediately
- Stop if migration drift detected — document in STATUS.md

## Failure Handling
- If a file is too large to read in one call, use `limit` parameter to read in chunks
- If test count is unclear, run `pnpm test` and count output lines
- If design tokens are missing, document gap and recommend additions
