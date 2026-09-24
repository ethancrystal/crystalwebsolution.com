# Naming Conventions for Next.js + Supabase Refactor

Guidelines for naming files, folders, and exports after modular extraction.

## Folder Structure Decision Tree

```
Does features/ already exist?
  YES → Feature-based primary structure
  NO  → Are there >8 pages or >10 supabase calls?
          YES → Feature-based (create features/)
          NO  → Layer-based (use lib/, hooks/, components/)
```

## Feature-Based Naming

```
features/
├── projects/
│   ├── api.ts           # Server-side Supabase queries
│   ├── hooks.ts         # Client-side hooks (useProjects, useCreateProject)
│   ├── types.ts         # Domain-specific types
│   ├── validation.ts    # Zod schemas
│   ├── utils.ts         # Domain-specific helpers
│   └── components/
│       ├── projects-list.tsx
│       ├── project-card.tsx
│       └── create-project-dialog.tsx
├── teams/
│   ├── api.ts
│   ├── hooks.ts
│   ├── types.ts
│   └── components/
│       └── team-select.tsx
```

**Naming rules:**
- Folder: `kebab-case` matching the table/domain name (`projects`, `user-profiles`)
- API file: always `api.ts` (inside feature folder)
- Hooks file: always `hooks.ts` (inside feature folder)
- Types file: always `types.ts` (inside feature folder)
- Components: `kebab-case.tsx` inside `components/` subfolder
- Utils: `kebab-case.ts` if multiple, or `utils.ts` if single

**Exports:**
```ts
// features/projects/api.ts
export async function getProjects() { ... }
export async function createProject(input: CreateProjectInput) { ... }
export async function updateProject(id: string, input: UpdateProjectInput) { ... }
export async function deleteProject(id: string) { ... }
```

## Layer-Based Naming

```
lib/
├── supabase/
│   ├── client.ts          # Browser client
│   ├── server.ts          # Server client (createClient)
│   ├── projects.ts        # Project queries
│   ├── teams.ts           # Team queries
│   └── middleware.ts      # Middleware client
├── auth/
│   ├── guards.ts          # requireAuth, requireRole
│   ├── helpers.ts         # getUser, getSession wrappers
│   └── actions.ts         # Server actions for login/logout
├── utils/
│   ├── date-utils.ts
│   ├── format-utils.ts
│   └── validation-utils.ts
├── services/
│   ├── projects-service.ts  # Business logic layer
│   └── teams-service.ts
└── validation/
    ├── project-schema.ts
    └── team-schema.ts

hooks/
├── use-projects.ts
├── use-auth.ts
├── use-realtime.ts
└── use-debounce.ts

types/
├── project.ts
├── team.ts
└── index.ts    # optional barrel

components/
├── ui/           # shadcn/ui primitives
├── projects/
│   ├── project-card.tsx
│   └── projects-table.tsx
└── teams/
    └── team-badge.tsx
```

**Naming rules:**
- `lib/supabase/*.ts`: named by domain entity (plural: `projects.ts`, `orders.ts`)
- `lib/services/*.ts`: suffixed with `-service` if business logic wrapper
- `lib/auth/*.ts`: named by purpose (`guards.ts`, `helpers.ts`, `actions.ts`)
- `lib/utils/*.ts`: suffixed with `-utils` if domain-specific
- `hooks/*.ts`: prefixed with `use-`, named by entity or purpose
- `types/*.ts`: named by singular entity (`project.ts`, not `projects.ts`)
- `components/**/*.tsx`: named by component name, kebab-case

## Hybrid Naming (Recommended for Most Apps)

Combine the best of both: shared layers for cross-cutting concerns, feature folders for UI.

```
lib/
├── supabase/
│   ├── client.ts
│   ├── server.ts
│   ├── projects.ts      # all project DB queries
│   └── teams.ts
├── auth/
│   ├── guards.ts
│   └── helpers.ts
├── utils/
│   ├── date-utils.ts
│   └── format-utils.ts
└── validation/
    ├── project-schema.ts
    └── team-schema.ts

hooks/
├── use-projects.ts
├── use-auth.ts
└── use-realtime.ts

types/
├── project.ts
└── team.ts

features/
├── projects/
│   └── components/
│       ├── project-list.tsx
│       ├── project-card.tsx
│       └── create-project-form.tsx
└── teams/
    └── components/
        └── team-select.tsx

components/
└── ui/          # shared shadcn/ui primitives
    ├── button.tsx
    ├── dialog.tsx
    └── input.tsx
```

**Rule of thumb:**
- Data layer (Supabase, services, validation) → `lib/`
- Shared hooks → `hooks/`
- Shared types → `types/`
- Domain UI → `features/<domain>/components/`
- Shared UI primitives → `components/ui/`

## Export Conventions

**Prefer named exports** for everything except page/layout components:

```ts
// ✅ Named exports (preferred)
export async function getProjects() { ... }
export function useProjects() { ... }
export interface Project { ... }

// ❌ Avoid default exports for utilities/hooks/types
export default function getProjects() { ... }  // hard to search, breaks tree-shaking
```

**Barrel exports:** Only add `index.ts` when a folder has 3+ exports that are frequently imported together:

```ts
// features/projects/index.ts (optional)
export * from './api';
export * from './hooks';
export * from './types';
```

## File Naming by Type

| What | Convention | Example |
|------|----------|---------|
| Page component | `page.tsx` | `app/projects/page.tsx` |
| Layout | `layout.tsx` | `app/layout.tsx` |
| Loading UI | `loading.tsx` | `app/projects/loading.tsx` |
| Error UI | `error.tsx` | `app/projects/error.tsx` |
| Route handler | `route.ts` | `app/api/projects/route.ts` |
| Server action | `actions.ts` | `app/projects/actions.ts` |
| Client hook | `use-<name>.ts` | `hooks/use-projects.ts` |
| Server query | `<plural>.ts` | `lib/supabase/projects.ts` |
| Type definition | `<singular>.ts` | `types/project.ts` |
| Validation schema | `<singular>-schema.ts` | `lib/validation/project-schema.ts` |
| Utility | `<domain>-utils.ts` | `lib/utils/date-utils.ts` |
| Component | `<kebab-case>.tsx` | `components/project-card.tsx` |
| Auth guard | `guards.ts` | `lib/auth/guards.ts` |

## Import Path Aliases

Always use path aliases. Typical `tsconfig.json`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"],
      "@/components/*": ["components/*"],
      "@/lib/*": ["lib/*"],
      "@/hooks/*": ["hooks/*"],
      "@/types/*": ["types/*"],
      "@/features/*": ["features/*"]
    }
  }
}
```

Import examples:
```ts
import { getProjects } from '@/lib/supabase/projects';
import { useProjects } from '@/hooks/use-projects';
import type { Project } from '@/types/project';
import { ProjectCard } from '@/features/projects/components/project-card';
```
