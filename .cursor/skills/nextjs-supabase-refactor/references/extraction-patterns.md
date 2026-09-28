# Next.js + Supabase Extraction Patterns

Reference guide for common extraction scenarios when refactoring bloated Next.js files with Supabase.

## Pattern 1: Inline Supabase Query → API Layer

**Scenario:** A page component contains a raw Supabase query.

**Before (page.tsx, mixed):**
```tsx
export default async function ProjectsPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const { data: projects, error } = await supabase
    .from('projects')
    .select('*, teams(*)')
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return <ProjectsList projects={projects} />;
}
```

**After (extracted):**

```ts
// lib/supabase/projects.ts or features/projects/api.ts
import { createClient } from '@/lib/supabase/server';
import type { Project } from '@/types/project';

export async function getActiveProjects() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('projects')
    .select('*, teams(*)')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .returns<Project[]>();
  if (error) throw error;
  return data;
}
```

```tsx
// app/projects/page.tsx
import { getActiveProjects } from '@/lib/supabase/projects';

export default async function ProjectsPage() {
  const projects = await getActiveProjects();
  return <ProjectsList projects={projects} />;
}
```

## Pattern 2: Auth Guard Inline → Auth Helpers

**Scenario:** Auth checks and redirects are scattered across pages.

**Before:**
```tsx
export default async function AdminPage() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.user_metadata?.role !== 'admin') redirect('/unauthorized');
  // ... page logic
}
```

**After:**

```ts
// lib/auth/guards.ts
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function requireAuth() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');
  return session;
}

export async function requireRole(role: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.user_metadata?.role !== role) redirect('/unauthorized');
  return user;
}
```

```tsx
// app/admin/page.tsx
import { requireAuth, requireRole } from '@/lib/auth/guards';

export default async function AdminPage() {
  await requireAuth();
  await requireRole('admin');
  // ... page logic
}
```

## Pattern 3: Inline Types → Shared Types

**Scenario:** Types defined inside a component file are used or will be used elsewhere.

**Before:**
```tsx
// app/projects/page.tsx
interface Project {
  id: string;
  name: string;
  status: 'active' | 'archived';
  team: { id: string; name: string };
}

function formatStatus(status: 'active' | 'archived') { ... }
```

**After:**

```ts
// types/project.ts
export type ProjectStatus = 'active' | 'archived';

export interface TeamSummary {
  id: string;
  name: string;
}

export interface Project {
  id: string;
  name: string;
  status: ProjectStatus;
  team: TeamSummary;
}
```

```ts
// lib/utils/format-status.ts
import type { ProjectStatus } from '@/types/project';

export function formatStatus(status: ProjectStatus): string {
  return status === 'active' ? 'Active' : 'Archived';
}
```

## Pattern 4: Client-Side Query + State → Custom Hook

**Scenario:** A client component fetches data on mount and manages loading/error state.

**Before:**
```tsx
'use client';
export default function ProjectList() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    async function fetch() {
      const { data, error } = await supabase.from('projects').select('*');
      if (error) setError(error);
      else setProjects(data);
      setLoading(false);
    }
    fetch();
  }, []);
  // ... render
}
```

**After:**

```ts
// hooks/use-projects.ts
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Project } from '@/types/project';

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    supabase.from('projects').select('*').then(({ data, error }) => {
      if (error) setError(error);
      else setProjects(data || []);
      setLoading(false);
    });
  }, []);

  return { projects, loading, error };
}
```

```tsx
// app/projects/components/project-list.tsx
'use client';
import { useProjects } from '@/hooks/use-projects';

export function ProjectList() {
  const { projects, loading, error } = useProjects();
  // ... render only
}
```

## Pattern 5: Monolithic Page → Feature Components

**Scenario:** A 400-line page with inline forms, tables, dialogs, and cards.

**Strategy:** Extract by UI domain, not by line count.

```tsx
// app/projects/page.tsx
import { CreateProjectDialog } from './components/create-project-dialog';
import { ProjectsTable } from './components/projects-table';
import { ProjectFilters } from './components/project-filters';

export default async function ProjectsPage() {
  const projects = await getActiveProjects();
  return (
    <div>
      <h1>Projects</h1>
      <CreateProjectDialog />
      <ProjectFilters />
      <ProjectsTable projects={projects} />
    </div>
  );
}
```

**Rules for component extraction:**
- Extract if used in 2+ places or if >80 lines
- Keep page.tsx as a thin coordinator (data fetching + layout)
- Never fetch data inside a client component unless it needs real-time updates

## Pattern 6: Route Handler Bloated → Service Layer

**Scenario:** An API route mixes validation, DB calls, auth, and response formatting.

**Before (app/api/projects/route.ts):**
```ts
export async function POST(req: Request) {
  const body = await req.json();
  if (!body.name) return Response.json({ error: 'Name required' }, { status: 400 });
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { data, error } = await supabase.from('projects').insert(body).select();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
```

**After:**

```ts
// lib/services/projects.ts
import { createClient } from '@/lib/supabase/server';
import type { CreateProjectInput } from '@/types/project';

export async function createProject(input: CreateProjectInput, userId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('projects')
    .insert({ ...input, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}
```

```ts
// lib/validation/project.ts
import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});
```

```ts
// app/api/projects/route.ts
import { createProject } from '@/lib/services/projects';
import { createProjectSchema } from '@/lib/validation/project';
import { requireAuth } from '@/lib/auth/guards';

export async function POST(req: Request) {
  const session = await requireAuth();
  const body = await req.json();
  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error }, { status: 400 });
  const project = await createProject(parsed.data, session.user.id);
  return Response.json(project);
}
```

## Pattern 7: Real-Time Supabase → Custom Hook

**Scenario:** Using `supabase.channel()` for real-time updates inline in a component.

**Extract to:** `hooks/use-realtime-table.ts`

```ts
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export function useRealtimeTable<T>(table: string, filter?: string) {
  const [data, setData] = useState<T[]>([]);
  useEffect(() => {
    const channel = supabase.channel(`${table}-changes`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, payload => {
        setData(prev => {
          if (payload.eventType === 'INSERT') return [...prev, payload.new as T];
          if (payload.eventType === 'DELETE') return prev.filter(r => (r as any).id !== payload.old.id);
          return prev.map(r => (r as any).id === payload.new.id ? payload.new as T : r);
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [table]);
  return data;
}
```
