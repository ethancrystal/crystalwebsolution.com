# Refactor Patterns Catalog

Reference for the modular-refactor-planner skill.

## Pattern 1: Extract Oversized Global Stylesheet

**Signal:** Single CSS/SCSS file >1,000 lines or >50 KB.

**Split strategy:**

```
styles/
  tokens.css      — design variables, colors, fonts, z-index scale
  reset.css       — * { box-sizing }, html, body base
  layout.css      — grid, section, spacing primitives
  nav.css         — header, mobile menu, glass treatment
  marketing.css   — hero, CTA, content sections, case studies
  crm.css         — tables, forms, dashboards, admin UI
  auth.css        — login, signup, password reset
  utilities.css   — .sr-only, .visually-hidden, reduced-motion
  responsive.css  — all @media breakpoints (kept together for scanning)
```

**Import strategy:** `globals.css` becomes a single `@import` manifest, or use a build-step CSS concatenation. Do not split into 20 files — 5–8 domains is the sweet spot.

**Risk:** Reversible. Can merge back if the split hurts more than helps.

---

## Pattern 2: CRUD Page Boilerplate Extraction

**Signal:** 3+ list/edit/detail pages with identical structure:

```jsx
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/browser';
import { useUserRole } from '@/lib/useUserRole';
import { SkeletonTable } from '@/components/crm/Skeleton';

export default function XPage() {
  const { isAdmin } = useUserRole();
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  // ... identical useEffect → supabase.from('x').select('*') ...
}
```

**Extract to:**

- `components/crm/CrudTable.jsx` — generic table with sort/filter/search
- `components/crm/CrudListPage.jsx` — page shell: `useEffect` + loading + error + table
- `components/crm/CrudDetailPage.jsx` — detail shell: fetch + display + actions
- `components/crm/CrudFormPage.jsx` — create/edit shell: form state + validation + submit
- `lib/useCrudList(tableName, options)` — shared data fetching hook
- `lib/useCrudItem(tableName, id)` — single-record fetching hook

**Rule of Three:** Extract only when you have **three real, concrete** CRUD entities. Two similar pages = duplication. Three similar pages = pattern.

**Risk:** Low. Extracted components are additive; pages shrink but keep their route-specific fields.

---

## Pattern 3: Import Barrel / Re-export Consolidation

**Signal:** Same 3+ imports repeated in >5 files.

**Fix:**

```js
// lib/crm/index.js
export { default as CrudTable } from '@/components/crm/CrudTable';
export { default as SkeletonTable } from '@/components/crm/Skeleton';
export { useUserRole } from '@/lib/useUserRole';
export { createClient } from '@/lib/supabase/browser';
```

Pages then import from one location:

```jsx
import { CrudTable, SkeletonTable, useUserRole, createClient } from '@/lib/crm';
```

**When NOT to do this:** If the imports are only 2–3 files deep, or the barrel would create circular dependencies. Barrels help when the import list grows to 5+ lines per file.

---

## Pattern 4: Route Group Reorganization (Next.js)

**Signal:** Route directory is flat with 15+ top-level folders; mental navigation suffers.

**Strategy:** Use `(group)` folders that do not affect URL structure:

```
app/
  (marketing)/
    about/
    contact/
    services/
    work/
  (auth)/
    login/
    signup/
    forgot-password/
  (portal)/
    dashboard/
    team/
  (admin)/
    admin/
```

**Rules:**
- Only reorganize when the flat list is actively confusing
- Keep shared `layout.jsx` at the group level when pages share a shell
- Do NOT move files just for aesthetics — every move breaks imports and needs testing
- This is a **one-way door** if other tooling depends on file paths

---

## Pattern 5: Server Action Consolidation

**Signal:** Multiple `actions.js` files with overlapping logic, or one `actions.js` that has grown >500 lines.

**Strategy:** Split by domain, not by page:

```
app/actions/
  projects.js      — create, update, transition, assign
  auth.js          — signUp, signIn, signOut, reset (or keep in app/auth/actions.js)
  companies.js     — create, update, delete
  contacts.js      — create, update, delete
```

**Rules:**
- Keep co-located actions only when they are truly page-specific
- Cross-page actions (e.g., project transitions used by dashboard + team + admin) belong in a shared location
- Actions that need `revalidatePath` or `redirect` stay as server actions; pure data transforms can become lib functions

---

## Pattern 6: Duplicate Component Detection

**Signal:** Two components with >80% identical JSX but different data props.

**Strategy:** Generic component + config object:

```jsx
// Before: CompaniesTable.jsx, ContactsTable.jsx, DealsTable.jsx
// After:
<CrudTable
  table="companies"
  columns={['name', 'industry', 'created_at']}
  sortable
  searchable
/>
```

**When NOT to abstract:** When the duplicate is 2 files with <10 lines each, or the "similar" pages diverge significantly on layout and interactions. A bad abstraction is harder to maintain than honest duplication.

---

## Decision Framework

| Signal | Threshold | Action | Effort |
|--------|-----------|--------|--------|
| CSS/JS file >1000 lines | 1 file | Split by domain | 1–2 hours |
| CRUD pages identical structure | 3+ entities | Extract generic shell | 2–4 hours |
| Same imports in >5 files | 3+ imports | Barrel or shared hook | 30 min |
| Flat routes >15 top-level | Active confusion | Route groups | 1–2 hours |
| Actions.js >500 lines | 1 file | Split by domain | 1–2 hours |
| Duplicate components | 3+ with >80% overlap | Generic + config | 2–3 hours |

**Golden rule:** Extract to solve a real maintenance pain, not a theoretical ideal.
