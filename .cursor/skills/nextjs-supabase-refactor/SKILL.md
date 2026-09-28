---
name: nextjs-supabase-refactor
description: "Modular refactor assistant for Next.js + Supabase apps. Analyzes bloated files with mixed UI, data fetching, auth, and types, then executes safe, targeted extractions into components, hooks, types, utils, and Supabase queries. Supports both feature-based and layer-based architectures and adapts to existing project structure."
version: 1.0.0
---

# Next.js + Supabase Modular Refactor

This skill transforms monolithic Next.js files into clean, maintainable modules by separating UI, data fetching, auth logic, types, and utilities. It supports both feature-based and layer-based folder structures, and adapts to your existing project conventions.

## When to Use

- A `page.tsx`, `layout.tsx`, or `route.ts` file exceeds 200 lines with mixed responsibilities
- UI components inline Supabase queries, auth checks, or type definitions
- Repeated Supabase query patterns across multiple files
- Auth logic (RLS helpers, session checks, role guards) scattered in UI files
- Types/interfaces defined inside component files and reused elsewhere
- Utility functions embedded in pages or components
- Unclear whether to use feature-based (`features/user/api.ts`) or layer-based (`lib/api/user.ts`) organization

## Workflow

### Step 1 — Analyze the Target

Identify the file or directory to refactor. Run the analyzer to detect extraction targets and recommend an architecture:

```bash
node ~/.agents/skills/nextjs-supabase-refactor/scripts/analyze-file.mjs <path-to-file>
```

Or analyze the entire project structure:

```bash
node ~/.agents/skills/nextjs-supabase-refactor/scripts/analyze-project.mjs <path-to-project>
```

**Outputs:**
- Line count breakdown by responsibility (UI, data fetching, auth, types, utils)
- Identified inline Supabase queries
- Auth checks and session usage
- Inline types/interfaces
- Duplicated utility functions
- Recommended architecture (feature vs layer based)

### Step 2 — Choose the Architecture

The analyzer will recommend one of two patterns based on your existing structure:

| Pattern | Best For | Example Path |
|---------|----------|--------------|
| **Feature-based** | Domain-heavy apps, team scalability | `features/projects/api.ts`, `features/projects/hooks.ts`, `features/projects/types.ts` |
| **Layer-based** | Simple apps, shared utilities | `lib/supabase/projects.ts`, `hooks/use-projects.ts`, `types/projects.ts` |
| **Hybrid** | Most real-world apps | Mix: `features/projects/components/` + `lib/supabase/projects.ts` + `types/` |

Use the existing structure to decide. If `features/` already exists → feature-based. If `lib/` dominates → layer-based.

### Step 3 — Plan Extractions

For each bloated file, plan extractions in this priority order:

1. **Types** → lowest risk, highest reuse value
2. **Supabase queries / API calls** → separates data layer from UI
3. **Auth logic** → session checks, role guards, auth hooks
4. **Utility functions** → pure helpers, formatters, validators
5. **UI sub-components** → break down large JSX into smaller components
6. **Custom hooks** → combine queries + state + side effects

**For each extraction, define:**
- **Source:** line ranges in the original file
- **Destination:** new file path
- **Exports:** named exports from new file
- **Imports to update:** which files need new imports
- **Risk:** low (types), medium (moving queries), high (auth logic)

### Step 4 — Execute Extractions

Execute one extraction at a time. Never mix multiple extraction types in a single edit.

**Order of execution (safest to riskiest):**
1. Extract types to `types/` or `features/<name>/types.ts`
2. Extract Supabase queries to `lib/supabase/` or `features/<name>/api.ts`
3. Extract auth helpers to `lib/auth/` or `hooks/use-auth.ts`
4. Extract utilities to `lib/utils/` or `utils/<name>.ts`
5. Extract custom hooks to `hooks/` or `features/<name>/hooks.ts`
6. Extract UI components to `components/` or `features/<name>/components/`

**After each extraction:**
- Run TypeScript check: `npx tsc --noEmit`
- Verify imports resolve
- Check for circular dependencies
- Test the affected page/route

### Step 5 — Update Imports and Clean Up

Remove dead code:
- Delete unused imports in the original file
- Remove inline type definitions now imported
- Remove inline utility functions now imported
- Run linter: `npx next lint`

### Step 6 — Validate

- Build the project: `npm run build` or `npx next build`
- Check for runtime errors in dev mode
- Verify Supabase queries still execute correctly
- Confirm auth flows (login, logout, RLS) still work

## Scripts

- [analyze-file.mjs](scripts/analyze-file.mjs) — Analyze a single bloated file for extraction targets
- [analyze-project.mjs](scripts/analyze-project.mjs) — Analyze project structure and recommend architecture

## References

- [Extraction Patterns](references/extraction-patterns.md) — Common Next.js + Supabase extraction templates
- [Naming Conventions](references/naming-conventions.md) — File and folder naming by architecture type

## Extraction Rules

### Supabase Queries

**Bad (inline in component):**
```tsx
// page.tsx
const { data } = await supabase
  .from('projects')
  .select('*, teams(*)')
  .eq('status', 'active')
  .order('created_at', { ascending: false });
```

**Good (extracted):**
```ts
// lib/supabase/projects.ts or features/projects/api.ts
export async function getActiveProjects() {
  const { data, error } = await supabase
    .from('projects')
    .select('*, teams(*)')
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}
```

### Auth Logic

**Bad (inline in component):**
```tsx
const { data: { session } } = await supabase.auth.getSession();
if (!session) redirect('/login');
if (session.user.user_metadata.role !== 'admin') redirect('/unauthorized');
```

**Good (extracted hooks/helpers):**
```ts
// hooks/use-auth.ts
export function useRequireAuth() { ... }
export function useRequireRole(role: string) { ... }

// lib/auth/guards.ts
export async function requireAdmin() { ... }
```

### Types

**Bad (inline in component):**
```tsx
interface Project {
  id: string;
  name: string;
  status: 'active' | 'archived';
  team: { id: string; name: string };
}
```

**Good (extracted):**
```ts
// types/project.ts or features/projects/types.ts
export interface Project {
  id: string;
  name: string;
  status: ProjectStatus;
  team: TeamSummary;
}

export type ProjectStatus = 'active' | 'archived';

export interface TeamSummary {
  id: string;
  name: string;
}
```

## Safety Rules

- **Never extract and modify behavior in the same step** — move code exactly as-is first, refactor second
- **Never delete the original code until the new imports work** — comment out first, delete after build passes
- **Never change Supabase query logic during extraction** — keep `.select()`, `.eq()`, `.order()` identical
- **Always run TypeScript check after each extraction**
- **Always test auth flows after moving auth logic**
- **Keep barrel exports (`index.ts`) optional** — only add if >3 exports from a folder

## Anti-Patterns to Avoid

- Don't create a `utils/` dumping ground — organize by domain (date-utils, validation-utils)
- Don't extract a hook that is only used once — inline is fine
- Don't move types to a global `types/` if they are single-use
- Don't abstract Supabase queries into generic helpers unless the pattern repeats ≥3 times
- Don't mix feature-based and layer-based arbitrarily — pick one primary pattern
