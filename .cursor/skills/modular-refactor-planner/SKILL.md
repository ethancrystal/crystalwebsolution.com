---
name: modular-refactor-planner
description: "Analyzes a directory for structural bloat, duplication, and maintainability issues, then generates a concrete modular refactor plan with prioritized extraction targets. Use when a directory feels bloated, contains repetitive code, has oversized files, or needs modular reorganization."
version: 1.0.0
---

# Modular Refactor Planner

Takes a target directory and produces a prioritized, actionable modular refactor plan — what to extract, what to consolidate, and what to leave alone.

## When to Use

- A directory "feels bloated" but you're not sure where the bloat is
- CRUD pages have the same 20 lines repeated across every file
- A CSS or JS file has grown past ~1000 lines
- You want to move from flat structure to feature-based or route-group organization
- You're deciding whether to split, consolidate, or leave a directory as-is

## What It Checks

1. **Disk footprint** — total size, file count, largest files
2. **Line distribution** — which subdirectories dominate the line count
3. **Import patterns** — repeated imports across files (duplication signal)
4. **File name duplicates** — `page.jsx`, `layout.jsx`, `actions.js` appearing in multiple routes
5. **Oversized files** — files >40 KB that may need splitting
6. **Generated artifacts** — build output, node_modules, or cache files that shouldn't be in source
7. **Root directory footprint** — whether `.git`, `.agents`, or other non-source dirs dwarf the actual code

## Workflow

### Step 1 — Measure

Run the analyzer script on the target directory:

```bash
node ~/.agents/skills/modular-refactor-planner/scripts/analyze-directory.mjs <path>
```

The script outputs:
- Directory size breakdown
- File type distribution
- Largest files
- Lines per subdirectory
- Import duplication analysis
- Duplicate file name report

### Step 2 — Interpret

Read the analyzer output and classify each finding:

| Finding | Severity | Typical Fix |
|---------|----------|-------------|
| Non-source directory >10× the code directory | **High** | Nothing to fix in the code; the "bloat" is elsewhere |
| Single CSS/JS file >1000 lines | **High** | Split by domain: tokens, layout, components, pages |
| Same 5+ imports repeated in >3 files | **Medium** | Extract shared hook/component or re-export barrel |
| CRUD list/edit/detail pages with identical structure | **Medium** | Generic `<CrudTable>`, `<CrudForm>`, `<CrudDetail>` components |
| `layout.jsx` / `page.jsx` in every route | **Low** | Normal for Next.js; use route groups if navigation suffers |
| Directory >500 files or >2 MB | **Medium** | Consider route groups or feature-based splitting |

### Step 3 — Prioritize

Use this stack-ranked priority order:

1. **Split the oversized global file** (CSS, config, types) — biggest readability win
2. **Extract repeated CRUD boilerplate** — biggest maintainability win
3. **Consolidate shared imports** into barrel files or hooks
4. **Reorganize into route groups** — only if navigation/mental model suffers
5. **Clean generated artifacts** from source directories

### Step 4 — Draft the Plan

For each target, write:
- **What** to extract (file names, component names, hook names)
- **Where** it should live (existing or new directory)
- **Files affected** (which pages will import the new module)
- **Risk level** (reversible vs one-way-door)
- **Estimated effort** (small: <1 hour, medium: half day, large: full day)

Do not perform the refactor in this step — produce the plan only.

### Step 5 — Present and Confirm

Present the plan to the user with:
- A summary table (target, priority, effort, risk)
- The one highest-impact recommendation highlighted
- A clear ask: "Want me to implement any of these?"

## Scripts

- [analyze-directory.mjs](scripts/analyze-directory.mjs) — Runs disk, line, import, and duplication analysis on any directory

## References

- [Refactor Patterns Catalog](references/refactor-patterns.md) — Common extraction patterns and their tradeoffs
- [Next.js Route Group Guide](references/route-groups.md) — When and how to use `(group)` routing for organization

## Anti-Patterns to Avoid

- **Don't delete working code** just because it looks verbose
- **Don't abstract on the first repetition** — wait for the third real use (Rule of Three)
- **Don't move files just for aesthetics** — the structure should serve navigation, not look pretty
- **Don't mix refactor + behavior changes** in the same step
- **Don't ignore `.git` / `.agents` bloat** — the user's pain may be disk usage, not code complexity
