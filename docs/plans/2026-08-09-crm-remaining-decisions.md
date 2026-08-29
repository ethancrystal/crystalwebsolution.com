# CRM Remaining-Decisions Batch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close five independent, small CRM gaps found during Phase 1 verification (companies/contacts notes, task priority/client_visible exposure, client-visible project budget, a delivered-project review nudge), plus one additional bug found while writing this plan (missing `project.message_edited` email template).

**Architecture:** Two new migrations (`0019`, `0020`) on the existing Supabase/Postgres schema, one new client component (`EntityNotes.jsx`), targeted edits to existing server actions, read-model functions, and page components. No new tables, no new RPC patterns — every change reuses an existing convention already established elsewhere in this codebase (see each task's "Traced" note for the exact precedent).

**Tech Stack:** Next.js 15 App Router (plain JSX, no TypeScript), Supabase (Postgres/Auth/RLS, `@supabase/supabase-js` via `lib/supabase/browser.js`), `node --test` + `node:assert/strict` for contract-style tests that read source/migration files as text and assert regex patterns (this repo's established test style — see any file under `tests/crm/`).

## Global Constraints

- Package manager is `pnpm` — never use `npm`/`yarn`.
- No TypeScript, no Tailwind — plain JSX and global/styled-jsx CSS matching each component's existing style.
- Every migration is applied via the Supabase MCP `apply_migration` tool and verified with a direct schema/data query in the same session it's written — never left applied-but-unverified.
- `create_project_task`'s live signature already has 4 of 6 params defaulted (confirmed via `pg_get_function_arguments`). Adding new trailing params requires `DROP FUNCTION IF EXISTS` by the exact current type signature first — a plain `CREATE OR REPLACE` would create a second, ambiguous overload instead of replacing it.
- `audit_events.event_type` has an enum-style `CHECK` constraint that must include every event type ever inserted (this has broken live functionality twice already this session — migrations `0010` and `0015` both shipped new event types the constraint didn't know about). `notifications_outbox.event_type` has no such enum constraint (only a length bound) — confirmed via `pg_get_constraintdef`, no action needed there.
- `pnpm test` (`node --test tests/*.test.mjs tests/crm/*.test.mjs`) and `pnpm build` must both pass after every task.
- Every new test file goes in `tests/crm/` and is picked up automatically by the existing glob in `package.json`'s `test` script — no config changes needed.

---

## Task 1: Migration `0019` — task `priority`/`client_visible` exposure

**Files:**
- Create: `supabase/migrations/0019_task_priority_and_client_visible.sql`
- Test: `tests/crm/migration-0019-task-priority-visibility.test.mjs`

**Interfaces:**
- Produces: `public.create_project_task(p_project_id uuid, p_title text, p_description text default '', p_status text default 'todo', p_assignee_id uuid default null, p_due_date date default null, p_priority text default 'medium', p_client_visible boolean default false) returns uuid` — the new 8-arg signature every later task in this plan calls against.
- Produces: every pre-existing `project_tasks` row has `client_visible = true` after this migration runs (one-time backfill), so no task created before this migration disappears from any client's view.

- [ ] **Step 1: Write the failing test**

```js
// tests/crm/migration-0019-task-priority-visibility.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationPath = 'supabase/migrations/0019_task_priority_and_client_visible.sql';

async function readMigration() {
  return readFile(migrationPath, 'utf8');
}

test('drops the old 6-arg create_project_task signature before recreating it', async () => {
  const sql = await readMigration();
  assert.match(
    sql,
    /drop function if exists public\.create_project_task\(uuid,\s*text,\s*text,\s*text,\s*uuid,\s*date\)/i,
    'must drop the exact live 6-arg signature, not rely on create or replace to do it -- appending trailing params creates a second overload instead of replacing',
  );
});

test('create_project_task accepts priority and client_visible with the right defaults', async () => {
  const sql = await readMigration();
  assert.match(sql, /p_priority text default 'medium'/i);
  assert.match(sql, /p_client_visible boolean default false/i);
  assert.match(sql, /insert into public\.project_tasks[\s\S]*?priority[\s\S]*?client_visible/i);
});

test('backfills every existing task to client_visible = true before any default changes apply', async () => {
  const sql = await readMigration();
  assert.match(
    sql,
    /update public\.project_tasks\s+set client_visible = true\s+where client_visible = false/i,
    'must preserve today\'s observed behaviour (every client sees every existing task) for rows that already exist',
  );
});

test('does not touch the client_visible column default itself', async () => {
  const sql = await readMigration();
  assert.doesNotMatch(
    sql,
    /alter column client_visible set default/i,
    'the column already defaults to false for new rows -- only existing rows need the backfill',
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/crm/migration-0019-task-priority-visibility.test.mjs`
Expected: FAIL — `ENOENT: no such file or directory, open 'supabase/migrations/0019_task_priority_and_client_visible.sql'`

- [ ] **Step 3: Write the migration**

```sql
-- 0019_task_priority_and_client_visible.sql
--
-- Exposes project_tasks.priority and .client_visible (both existed since
-- migration 0011, neither ever settable via any RPC or UI). Two decisions
-- recorded in docs/superpowers/specs/2026-08-09-crm-remaining-decisions-design.md:
--
-- 1. create_project_task's live signature already defaults 4 of its 6
--    params. Postgres identifies a function by its full parameter *type*
--    list, not by name or defaults -- appending two new trailing params
--    via a plain `create or replace` would create a second, distinct
--    8-arg overload alongside the existing 6-arg one, not replace it.
--    Drop the exact live signature first.
--
-- 2. client_visible defaults to false at the column level, but nothing
--    has ever filtered on it, so today's actual behaviour is "every
--    client sees every task". Flipping on a filter without backfilling
--    existing rows would make every task created before this migration
--    vanish from every client's view. Backfill first; the column default
--    for *new* rows stays false (unchanged), matching the schema's
--    original intent that a task is staff-only until a PM opts it in.

begin;

update public.project_tasks
set client_visible = true
where client_visible = false;

drop function if exists public.create_project_task(uuid, text, text, text, uuid, date);

create function public.create_project_task(
  p_project_id uuid,
  p_title text,
  p_description text default '',
  p_status text default 'todo',
  p_assignee_id uuid default null,
  p_due_date date default null,
  p_priority text default 'medium',
  p_client_visible boolean default false
)
returns uuid
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'private', 'storage'
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_task_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if not private.can_access_project(p_project_id) then
    raise exception 'Project access required.' using errcode = '42501';
  end if;

  if p_title is null or char_length(btrim(p_title)) not between 1 and 255 then
    raise exception 'Task title must be 1 to 255 characters.' using errcode = '22023';
  end if;

  if p_description is null or char_length(p_description) > 10000 then
    raise exception 'Task description must be at most 10000 characters.' using errcode = '22023';
  end if;

  if p_status is null or p_status not in ('todo', 'in_progress', 'review', 'done', 'blocked') then
    raise exception 'Invalid task status.' using errcode = '22023';
  end if;

  if p_priority is null or p_priority not in ('low', 'medium', 'high') then
    raise exception 'Invalid task priority.' using errcode = '22023';
  end if;

  insert into public.project_tasks (
    project_id,
    title,
    description,
    status,
    assignee_id,
    created_by,
    due_date,
    priority,
    client_visible
  )
  values (
    p_project_id,
    btrim(p_title),
    btrim(coalesce(p_description, '')),
    p_status,
    p_assignee_id,
    v_user_id,
    p_due_date,
    p_priority,
    p_client_visible
  )
  returning id into v_task_id;

  insert into public.audit_events (
    actor_id,
    project_id,
    event_type,
    metadata
  )
  values (
    v_user_id,
    p_project_id,
    'project.task_created',
    jsonb_build_object('task_id', v_task_id, 'priority', p_priority, 'client_visible', p_client_visible)
  );

  return v_task_id;
end
$function$;

grant execute on function public.create_project_task(uuid, text, text, text, uuid, date, text, boolean) to authenticated;
revoke all on function public.create_project_task(uuid, text, text, text, uuid, date, text, boolean) from anon;

commit;
```

This is the exact live function body (fetched via `pg_get_functiondef` while writing this plan, 2026-08-09), with only these additions: the two new parameters, the `p_priority` validation check, both new columns threaded into the `insert`, and both new values folded into the existing `audit_events` metadata object. Everything else — `private.can_access_project` (not `can_view_internal`; clients are allowed to create tasks, per `authenticatedProfile(['client', 'project_manager', 'admin'])` in the server action, so the access check must stay participant-level, not staff-only), the `p_description` length check, the unqualified (`btrim`, not `pg_catalog.btrim`) function-name style this particular function already uses, and the `audit_events` insert's exact column list (no `company_id` — this function has never selected it) — is preserved verbatim. **If the live function has changed since 2026-08-09, re-fetch it with the query above before applying this migration and reconcile any drift the same way — do not apply this exact text blind.**

- [ ] **Step 4: Apply the migration and verify with the Supabase MCP**

Apply via `apply_migration` (name: `0019_task_priority_and_client_visible`, query: the file's contents). Then verify directly, not just "it didn't error":

```sql
select pg_get_function_arguments(p.oid) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='create_project_task';
-- expect: p_project_id uuid, p_title text, p_description text DEFAULT ''::text, p_status text DEFAULT 'todo'::text, p_assignee_id uuid DEFAULT NULL::uuid, p_due_date date DEFAULT NULL::date, p_priority text DEFAULT 'medium'::text, p_client_visible boolean DEFAULT false

select count(*) from public.project_tasks where client_visible = false;
-- expect: 0 (immediately after the backfill; new tasks created after this point will bring the count back above 0 by design)
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test tests/crm/migration-0019-task-priority-visibility.test.mjs`
Expected: PASS (all 4 tests)

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0019_task_priority_and_client_visible.sql tests/crm/migration-0019-task-priority-visibility.test.mjs
git commit -m "feat(crm): expose task priority and client_visible via create_project_task"
```

---

## Task 2: Migration `0020` — `project.delivered` review-request notification

**Files:**
- Create: `supabase/migrations/0020_project_delivered_notification.sql`
- Test: `tests/crm/migration-0020-project-delivered.test.mjs`

**Interfaces:**
- Consumes: `public.transition_project_status(p_project_id uuid, p_to_status text, p_note text default null, p_visibility text default 'shared')` — same signature, no drop needed (body-only change, not a signature change).
- Produces: a `notifications_outbox` row with `event_type = 'project.delivered'`, `channel = 'email'` (only — no `in_app`), addressed to every profile whose `company_id` matches the project's, whenever `p_to_status = 'delivered'`. This is *in addition to* the existing generic `project.status_transitioned` fan-out, not a replacement.

- [ ] **Step 1: Write the failing test**

```js
// tests/crm/migration-0020-project-delivered.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationPath = 'supabase/migrations/0020_project_delivered_notification.sql';

async function readMigration() {
  return readFile(migrationPath, 'utf8');
}

function functionBody(sql, name) {
  const match = sql.match(
    new RegExp(
      `create\\s+(?:or\\s+replace\\s+)?function\\s+(?:public|private)\\.${name}\\b[\\s\\S]*?\\$function\\$([\\s\\S]*?)\\$function\\$`,
      'i',
    ),
  );
  assert.ok(match, `expected ${name} function`);
  return match[0];
}

test('transition_project_status enqueues a project.delivered email when moving to delivered', async () => {
  const sql = await readMigration();
  const fn = functionBody(sql, 'transition_project_status');

  assert.match(fn, /if p_to_status = 'delivered' then/i);
  assert.match(fn, /'project\.delivered'/);
});

test('the delivered notification goes to the client company only, email channel only, never staff', async () => {
  const sql = await readMigration();
  const fn = functionBody(sql, 'transition_project_status');

  // Must NOT reuse project_notification_recipients() for this branch --
  // that helper returns both assigned staff and client profiles, and a
  // review-request email must never go to staff.
  const deliveredBranch = fn.slice(fn.indexOf("p_to_status = 'delivered'"));
  assert.doesNotMatch(deliveredBranch.slice(0, deliveredBranch.indexOf('end if')), /project_notification_recipients/);
  assert.match(fn, /where profile\.company_id = v_project\.company_id/i);
  assert.match(fn, /'email'/);
});

test('does not add a new audit_events event type (the existing status_transitioned entry already records this)', async () => {
  const sql = await readMigration();
  assert.doesNotMatch(sql, /audit_events_event_type_check/i, 'no new enum value needed -- see Global Constraints');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/crm/migration-0020-project-delivered.test.mjs`
Expected: FAIL — file not found

- [ ] **Step 3: Write the migration**

First, re-fetch the live `transition_project_status` body via the Supabase MCP to confirm it still matches the version below (written against the schema as of 2026-08-09) before applying — reconcile any drift, preserving whatever else may have changed, and only add the new conditional block.

```sql
-- 0020_project_delivered_notification.sql
--
-- Adds a distinct, client-facing "please leave us a review" email when a
-- project transitions to 'delivered' (reachable only from 'approved', per
-- the existing status machine). This is additive to the existing generic
-- project.status_transitioned notification already fanned out to every
-- participant -- that one keeps firing unchanged and still drives any
-- other logic keyed on it.
--
-- Deliberately NOT using private.project_notification_recipients(): that
-- helper returns assigned staff *and* client-company profiles together,
-- and a review-request email must never reach staff. Addressed directly
-- to profiles sharing the project's company_id. Email channel only (no
-- in_app) -- this is a one-off nudge, not an ongoing notification worth a
-- bell-icon entry.
--
-- No audit_events change: the existing unconditional
-- project.status_transitioned audit row (inserted earlier in this same
-- function, unchanged) already records the transition to 'delivered' in
-- its metadata -- a second event_type isn't needed, and inventing one
-- would need a CHECK-constraint update this migration deliberately avoids
-- (see Global Constraints -- this exact bug has already happened twice).

begin;

create or replace function public.transition_project_status(
  p_project_id uuid,
  p_to_status text,
  p_note text default null::text,
  p_visibility text default 'shared'::text
)
returns uuid
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'private', 'storage'
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_project public.projects%rowtype;
  v_history_id uuid;
  v_allowed boolean := false;
  v_from_status text;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  select *
  into v_project
  from public.projects
  where id = p_project_id
  for update;

  if not found then
    raise exception 'Project not found.' using errcode = 'P0002';
  end if;

  if not private.can_view_internal(p_project_id) then
    raise exception 'Project assignment required.' using errcode = '42501';
  end if;

  if p_visibility is null or p_visibility not in ('shared', 'internal') then
    raise exception 'Invalid visibility.' using errcode = '22023';
  end if;

  if p_note is not null and pg_catalog.char_length(p_note) > 2000 then
    raise exception 'Status note must be at most 2000 characters.' using errcode = '22023';
  end if;

  v_allowed := case v_project.status
    when 'brief_submitted' then p_to_status = any (array['planned', 'cancelled']::text[])
    when 'planned' then p_to_status = any (array['in_progress', 'on_hold', 'cancelled']::text[])
    when 'in_progress' then p_to_status = any (array['client_review', 'on_hold', 'cancelled']::text[])
    when 'client_review' then p_to_status = any (array['changes_requested', 'approved', 'on_hold', 'cancelled']::text[])
    when 'changes_requested' then p_to_status = any (array['in_progress', 'on_hold', 'cancelled']::text[])
    when 'approved' then p_to_status = any (array['delivered', 'on_hold', 'cancelled']::text[])
    when 'on_hold' then p_to_status = any (array['planned', 'in_progress', 'cancelled']::text[])
    else false
  end;

  if not v_allowed then
    raise exception 'Invalid project status transition.' using errcode = '22023';
  end if;

  v_from_status := v_project.status;

  update public.projects
  set status = p_to_status,
      updated_at = pg_catalog.now()
  where id = p_project_id;

  insert into public.project_status_history (
    project_id,
    from_status,
    to_status,
    note,
    visibility,
    changed_by
  )
  values (
    p_project_id,
    v_from_status,
    p_to_status,
    p_note,
    p_visibility,
    v_user_id
  )
  returning id into v_history_id;

  insert into public.audit_events (
    actor_id,
    project_id,
    company_id,
    event_type,
    metadata
  )
  values (
    v_user_id,
    p_project_id,
    v_project.company_id,
    'project.status_transitioned',
    pg_catalog.jsonb_build_object(
      'history_id', v_history_id,
      'from_status', v_from_status,
      'to_status', p_to_status,
      'visibility', p_visibility
    )
  );

  insert into public.notifications_outbox (project_id, user_id, channel, event_type, payload)
  select
    p_project_id,
    recipient.user_id,
    channel.value,
    'project.status_transitioned',
    pg_catalog.jsonb_build_object('from_status', v_from_status, 'to_status', p_to_status)
  from private.project_notification_recipients(p_project_id, v_user_id) as recipient
  cross join pg_catalog.unnest(array['in_app', 'email']) as channel(value);

  if p_to_status = 'delivered' then
    insert into public.notifications_outbox (project_id, user_id, channel, event_type, payload)
    select
      p_project_id,
      profile.id,
      'email',
      'project.delivered',
      pg_catalog.jsonb_build_object('project_name', v_project.title)
    from public.profiles as profile
    where profile.company_id = v_project.company_id;
  end if;

  return v_history_id;
end
$function$;

commit;
```

- [ ] **Step 4: Apply the migration and verify with the Supabase MCP**

```sql
select pg_get_functiondef(p.oid) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='transition_project_status';
-- confirm the new `if p_to_status = 'delivered' then` block is present
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test tests/crm/migration-0020-project-delivered.test.mjs`
Expected: PASS (all 3 tests)

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0020_project_delivered_notification.sql tests/crm/migration-0020-project-delivered.test.mjs
git commit -m "feat(crm): send a review-request email when a project is marked delivered"
```

---

## Task 3: `EntityNotes.jsx` — wire companies/contacts to the existing `notes` table

**Traced:** `public.notes` already exists with full RLS from migration `0008` (`company_id` required, `contact_id`/`deal_id` optional, `visibility` constrained to `'internal'`/`'client'`) and zero application code references it. `NotesPanel.jsx` is correctly project-scoped and stays untouched.

**Files:**
- Create: `components/crm/EntityNotes.jsx`
- Modify: `app/admin/companies/[id]/page.jsx:185`
- Modify: `app/admin/contacts/[id]/page.jsx:218`
- Test: `tests/crm/entity-notes.test.mjs`

**Interfaces:**
- Produces: `export default function EntityNotes({ companyId, contactId })` — `contactId` optional.
- Consumes: `createClient` from `@/lib/supabase/browser` (same import every other companies/contacts/deals component in this codebase uses).

- [ ] **Step 1: Write the failing test**

```js
// tests/crm/entity-notes.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function read(path) {
  return readFile(path, 'utf8');
}

test('EntityNotes reads and writes the notes table directly, not NotesPanel\'s RPC path', async () => {
  const source = await read('components/crm/EntityNotes.jsx');

  assert.match(source, /export default function EntityNotes\(\s*\{\s*companyId,\s*contactId\s*\}\s*\)/);
  assert.match(source, /createClient\(\)/);
  assert.match(source, /from\('notes'\)/);
  assert.match(source, /\.insert\(/);
  assert.match(source, /\.eq\('company_id', companyId\)/);
  assert.doesNotMatch(source, /postProjectNote|project_status_history/, 'must not reuse NotesPanel\'s project-scoped RPC path');
});

test('company detail page uses EntityNotes, not NotesPanel', async () => {
  const source = await read('app/admin/companies/[id]/page.jsx');
  assert.match(source, /import EntityNotes from '@\/components\/crm\/EntityNotes'/);
  assert.match(source, /<EntityNotes companyId=\{company\.id\} \/>/);
  assert.doesNotMatch(source, /<NotesPanel/);
});

test('contact detail page uses EntityNotes with both ids, not NotesPanel', async () => {
  const source = await read('app/admin/contacts/[id]/page.jsx');
  assert.match(source, /import EntityNotes from '@\/components\/crm\/EntityNotes'/);
  assert.match(source, /<EntityNotes companyId=\{contact\.company_id\} contactId=\{contact\.id\} \/>/);
  assert.doesNotMatch(source, /<NotesPanel/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/crm/entity-notes.test.mjs`
Expected: FAIL — `EntityNotes.jsx` doesn't exist yet; the two page tests fail on the `doesNotMatch(/<NotesPanel/)` assertion (they still use it).

- [ ] **Step 3: Write `EntityNotes.jsx`**

Base this directly on `NotesPanel.jsx`'s structure (same card styling, same load/submit/render shape) — read `components/crm/NotesPanel.jsx` first for the exact CSS block to reuse verbatim, changing only the data-access layer and the heading text.

```jsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/browser';

function formatWhen(value) {
  if (!value) return '';
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function EntityNotes({ companyId, contactId }) {
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    if (!companyId) return;

    try {
      const supabase = createClient();
      let query = supabase
        .from('notes')
        .select('*, profiles(full_name)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      query = contactId ? query.eq('contact_id', contactId) : query.is('contact_id', null);

      const { data, error } = await query;
      if (error) throw error;
      setNotes(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [companyId, contactId]);

  useEffect(() => {
    if (companyId) load();
  }, [companyId, load]);

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || !companyId) return;

    setIsSaving(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('You must be signed in to add a note.');

      const { error } = await supabase.from('notes').insert({
        company_id: companyId,
        contact_id: contactId ?? null,
        content: trimmed,
        visibility: 'internal',
        created_by: user.id,
      });
      if (error) throw error;

      setContent('');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="notes-card">
      <h2 className="notes-title">Notes</h2>

      {error && <div className="notes-error">{error}</div>}
      <form onSubmit={handleSubmit} className="notes-form">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a note..."
          aria-label="Add a note"
          rows={3}
        />
        <button type="submit" className="notes-button" disabled={isSaving || !content.trim()}>
          {isSaving ? 'Saving...' : 'Add note'}
        </button>
      </form>

      {isLoading ? (
        <p className="notes-empty">Loading notes...</p>
      ) : notes.length > 0 ? (
        <ul className="notes-list">
          {notes.map((note) => (
            <li key={note.id} className="notes-item">
              <div className="notes-item-meta">
                <strong>{note.profiles?.full_name || 'Unknown'}</strong>
                <span>{formatWhen(note.created_at)}</span>
              </div>
              <p className="notes-item-content">{note.content}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="notes-empty">No notes yet.</p>
      )}

      <style jsx>{`
        .notes-card {
          background: rgba(30, 35, 60, 0.8);
          border: 1px solid rgba(100, 200, 255, 0.15);
          border-radius: 12px;
          padding: 1.5rem;
          backdrop-filter: blur(10px);
        }

        .notes-title {
          font-size: 1.25rem;
          color: #64c8ff;
          margin-bottom: 1.25rem;
        }

        .notes-error {
          background: rgba(255, 100, 100, 0.1);
          border: 1px solid rgba(255, 100, 100, 0.3);
          color: #ff9999;
          padding: 0.75rem 1rem;
          border-radius: 6px;
          margin-bottom: 1rem;
          font-size: 0.9rem;
        }

        .notes-form {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid rgba(100, 200, 255, 0.1);
        }

        .notes-form textarea {
          background: rgba(15, 20, 40, 0.6);
          border: 1px solid rgba(100, 200, 255, 0.2);
          border-radius: 6px;
          padding: 0.65rem 0.9rem;
          color: #e0e0e0;
          font-size: 0.95rem;
          font-family: inherit;
          resize: vertical;
        }

        .notes-form textarea:focus {
          outline: none;
          border-color: rgba(100, 200, 255, 0.6);
        }

        .notes-button {
          background: linear-gradient(135deg, #64c8ff 0%, #5bb8ff 100%);
          color: #0a0e27;
          padding: 0.6rem 1.3rem;
          border-radius: 6px;
          border: none;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s ease;
          align-self: flex-start;
        }

        .notes-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(100, 200, 255, 0.3);
        }

        .notes-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .notes-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 0.9rem;
        }

        .notes-item {
          background: rgba(15, 20, 40, 0.6);
          border: 1px solid rgba(100, 200, 255, 0.1);
          border-radius: 8px;
          padding: 0.75rem 1rem;
        }

        .notes-item-meta {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 0.35rem;
          font-size: 0.8rem;
        }

        .notes-item-meta strong {
          color: #64c8ff;
        }

        .notes-item-meta span {
          color: #999;
          white-space: nowrap;
        }

        .notes-item-content {
          color: #e0e0e0;
          white-space: pre-wrap;
          line-height: 1.55;
        }

        .notes-empty {
          color: #999;
          font-size: 0.9rem;
        }
      `}</style>
    </div>
  );
}
```

Identical to `NotesPanel.jsx`'s existing style block (class names, values, spacing) — deliberately, since this is a sibling card in the same visual language, not a new design. `styled-jsx` scopes class names per-component automatically, so the shared names (`.notes-card`, `.notes-title`, etc.) across `NotesPanel.jsx` and `EntityNotes.jsx` don't collide at runtime.

- [ ] **Step 4: Swap `NotesPanel` for `EntityNotes` in the two pages**

In `app/admin/companies/[id]/page.jsx`:
```diff
-import NotesPanel from '@/components/crm/NotesPanel';
+import EntityNotes from '@/components/crm/EntityNotes';
```
```diff
-        <NotesPanel companyId={company.id} />
+        <EntityNotes companyId={company.id} />
```

In `app/admin/contacts/[id]/page.jsx`:
```diff
-import NotesPanel from '@/components/crm/NotesPanel';
+import EntityNotes from '@/components/crm/EntityNotes';
```
```diff
-        <NotesPanel companyId={contact.company_id} contactId={contact.id} />
+        <EntityNotes companyId={contact.company_id} contactId={contact.id} />
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test tests/crm/entity-notes.test.mjs`
Expected: PASS (all 3 tests)

- [ ] **Step 6: Verify against the live database (scoped-JWT check, same technique as Phase 1)**

Sign in as a real admin (or the Phase 1 test accounts if still present) and confirm via the browser or a direct REST call that `notes` rows can be inserted/read for a company. If PM test coverage is wanted, this needs a PM account with a deal owned on the target company (per `notes`' RLS) — out of scope to set up fresh here since `/admin/companies` is the only reachable UI today (see spec's Traced note).

- [ ] **Step 7: Commit**

```bash
git add components/crm/EntityNotes.jsx "app/admin/companies/[id]/page.jsx" "app/admin/contacts/[id]/page.jsx" tests/crm/entity-notes.test.mjs
git commit -m "fix(crm): wire companies/contacts notes to the existing notes table instead of the dead NotesPanel prop mismatch"
```

---

## Task 4: Wire the task-creation form to send `priority` and `client_visible`

**Files:**
- Modify: `app/actions/project-actions.js:486-529` (`createProjectTask`)
- Modify: `app/team/projects/[id]/page.jsx` (`handleAddTask` and the task-creation form)
- Test: `tests/crm/task-creation-priority-visibility.test.mjs`

**Interfaces:**
- Consumes: `create_project_task(..., p_priority, p_client_visible)` from Task 1 — this task cannot land before Task 1's migration is live.
- Produces: `createProjectTask(formData)` now reads `formData.get('priority')` and `formData.get('clientVisible')`.

- [ ] **Step 1: Write the failing test**

```js
// tests/crm/task-creation-priority-visibility.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function read(path) {
  return readFile(path, 'utf8');
}

test('createProjectTask validates and forwards priority', async () => {
  const source = await read('app/actions/project-actions.js');
  assert.match(source, /\['low', 'medium', 'high'\]\.includes\(priority\)/);
  assert.match(source, /p_priority:\s*priority/);
});

test('createProjectTask parses and forwards client_visible as a real boolean', async () => {
  const source = await read('app/actions/project-actions.js');
  assert.match(source, /formString\(formData, 'clientVisible'\) === 'true'/);
  assert.match(source, /p_client_visible:\s*clientVisible/);
});

test('the team page task form reads taskPriority and a new client-visible checkbox', async () => {
  const source = await read('app/team/projects/[id]/page.jsx');
  assert.match(source, /form\.taskPriority\?\.value/);
  assert.match(source, /form\.taskClientVisible\?\.checked/);
  assert.match(source, /formData\.set\('priority',/);
  assert.match(source, /formData\.set\('clientVisible',/);
  assert.match(source, /name="taskClientVisible"/);
  assert.match(source, /type="checkbox"/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/crm/task-creation-priority-visibility.test.mjs`
Expected: FAIL — `handleAddTask` doesn't read `taskPriority` today (the `<select>` exists but is dead), and `createProjectTask` has no priority/clientVisible handling at all.

- [ ] **Step 3: Extend `createProjectTask` in `app/actions/project-actions.js`**

Current code (lines 486–529):
```js
export async function createProjectTask(formData) {
  const requestId = randomUUID();
  const profile = await authenticatedProfile(['client', 'project_manager', 'admin']);
  if (!profile) return invalid(requestId, 'You are not authorized to create tasks.');

  const projectId = formString(formData, 'projectId');
  const title = formString(formData, 'title').trim();
  const description = optionalFormString(formData, 'description') ?? '';
  const status = formString(formData, 'status') || 'todo';
  const assigneeId = optionalFormString(formData, 'assigneeId');
  const dueDate = optionalFormString(formData, 'dueDate');

  if (!isCanonicalUuid(projectId)) {
    return invalid(requestId, 'Choose a valid project.');
  }
  if (!validBoundedText(title, 1, 255)) {
    return invalid(requestId, 'Task title must be 1 to 255 characters.');
  }
  if (!validBoundedText(description, 0, 10000)) {
    return invalid(requestId, 'Task description must be at most 10000 characters.');
  }
  if (!['todo', 'in_progress', 'review', 'done', 'blocked'].includes(status)) {
    return invalid(requestId, 'Choose a valid task status.');
  }
  if (dueDate !== null && !validDateOnly(dueDate)) {
    return invalid(requestId, 'Choose a valid due date.');
  }

  const client = await actionClient(requestId, 'Unable to create this task.');
  if (client.failure) return client.failure;
  const { data, error } = await runRpc(() =>
    client.supabase.rpc('create_project_task', {
      p_project_id: projectId,
      p_title: title,
      p_description: description,
      p_status: status,
      p_assignee_id: assigneeId,
      p_due_date: dueDate,
    }),
  );

  if (error || !isCanonicalUuid(data)) {
    return databaseFailure(error, requestId, 'Unable to create this task.');
  }

  revalidateAllProjectPaths(projectId);
  return success(requestId, { taskId: data });
}
```

Replace with:
```js
export async function createProjectTask(formData) {
  const requestId = randomUUID();
  const profile = await authenticatedProfile(['client', 'project_manager', 'admin']);
  if (!profile) return invalid(requestId, 'You are not authorized to create tasks.');

  const projectId = formString(formData, 'projectId');
  const title = formString(formData, 'title').trim();
  const description = optionalFormString(formData, 'description') ?? '';
  const status = formString(formData, 'status') || 'todo';
  const assigneeId = optionalFormString(formData, 'assigneeId');
  const dueDate = optionalFormString(formData, 'dueDate');
  const priority = formString(formData, 'priority') || 'medium';
  const clientVisible = formString(formData, 'clientVisible') === 'true';

  if (!isCanonicalUuid(projectId)) {
    return invalid(requestId, 'Choose a valid project.');
  }
  if (!validBoundedText(title, 1, 255)) {
    return invalid(requestId, 'Task title must be 1 to 255 characters.');
  }
  if (!validBoundedText(description, 0, 10000)) {
    return invalid(requestId, 'Task description must be at most 10000 characters.');
  }
  if (!['todo', 'in_progress', 'review', 'done', 'blocked'].includes(status)) {
    return invalid(requestId, 'Choose a valid task status.');
  }
  if (!['low', 'medium', 'high'].includes(priority)) {
    return invalid(requestId, 'Choose a valid task priority.');
  }
  if (dueDate !== null && !validDateOnly(dueDate)) {
    return invalid(requestId, 'Choose a valid due date.');
  }

  const client = await actionClient(requestId, 'Unable to create this task.');
  if (client.failure) return client.failure;
  const { data, error } = await runRpc(() =>
    client.supabase.rpc('create_project_task', {
      p_project_id: projectId,
      p_title: title,
      p_description: description,
      p_status: status,
      p_assignee_id: assigneeId,
      p_due_date: dueDate,
      p_priority: priority,
      p_client_visible: clientVisible,
    }),
  );

  if (error || !isCanonicalUuid(data)) {
    return databaseFailure(error, requestId, 'Unable to create this task.');
  }

  revalidateAllProjectPaths(projectId);
  return success(requestId, { taskId: data });
}
```

- [ ] **Step 4: Wire the form in `app/team/projects/[id]/page.jsx`**

Current `handleAddTask` (around line 95):
```js
  async function handleAddTask(e) {
    e.preventDefault();
    if (!workspace?.project || !profile) return;

    const form = e.target;
    const title = form.taskTitle?.value?.trim();
    const due = form.taskDue?.value?.trim();

    if (!title) return;

    setError(null);

    const formData = new FormData();
    formData.set('projectId', workspace.project.id);
    formData.set('title', title);
    if (due) formData.set('dueDate', due);

    const result = await createProjectTask(formData);
```

Replace with:
```js
  async function handleAddTask(e) {
    e.preventDefault();
    if (!workspace?.project || !profile) return;

    const form = e.target;
    const title = form.taskTitle?.value?.trim();
    const due = form.taskDue?.value?.trim();
    const priority = form.taskPriority?.value || 'medium';
    const clientVisible = form.taskClientVisible?.checked ?? false;

    if (!title) return;

    setError(null);

    const formData = new FormData();
    formData.set('projectId', workspace.project.id);
    formData.set('title', title);
    if (due) formData.set('dueDate', due);
    formData.set('priority', priority);
    formData.set('clientVisible', clientVisible ? 'true' : 'false');

    const result = await createProjectTask(formData);
```

Current form markup (around line 153):
```jsx
          <div className="crm-ops-row">
            <input name="taskTitle" placeholder="New task title" required />
            <input name="taskDue" type="date" />
            <select name="taskPriority">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <button type="submit" className="crm-ops-button">Add Task</button>
          </div>
```

Add the client-visible checkbox (the `<select name="taskPriority">` already exists and needs no change — only `handleAddTask` was failing to read it):
```jsx
          <div className="crm-ops-row">
            <input name="taskTitle" placeholder="New task title" required />
            <input name="taskDue" type="date" />
            <select name="taskPriority" defaultValue="medium">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <label className="crm-ops-checkbox">
              <input name="taskClientVisible" type="checkbox" />
              Visible to client
            </label>
            <button type="submit" className="crm-ops-button">Add Task</button>
          </div>
```

Add a small `.crm-ops-checkbox` style rule next to this form's existing `<style jsx>` block (flex row, small gap, matching the surrounding `.crm-ops-row` layout — check the existing styled-jsx block in this file for the established spacing/color tokens and match them, don't introduce new values).

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test tests/crm/task-creation-priority-visibility.test.mjs`
Expected: PASS (all 3 tests)

- [ ] **Step 6: Commit**

```bash
git add app/actions/project-actions.js "app/team/projects/[id]/page.jsx" tests/crm/task-creation-priority-visibility.test.mjs
git commit -m "feat(crm): wire the already-present priority select and a new client-visible checkbox into task creation"
```

---

## Task 5: `client_visible` read-side filter + `priority` display

**Files:**
- Modify: `lib/crm/projects.js` (add `clientVisibleOnly`, apply in `listProjectTasks` and `getProjectWorkspace`)
- Modify: `components/crm/ProjectTasks.jsx` (render priority badge; also fix the pre-existing `task.created_by` display bug found while tracing this file — see Step 3)
- Test: `tests/crm/task-client-visibility-and-priority-display.test.mjs`

**Interfaces:**
- Consumes: `TASK_FIELDS` (`lib/crm/projects.js:32-33`) already selects `priority, client_visible` — no query change needed, only filtering/rendering.
- Produces: `clientVisibleOnly(tasks, role)` — same shape as the existing `sharedOnly(rows, role)` helper (`lib/crm/projects.js:119-123`), consumed by both task-read call sites.

- [ ] **Step 1: Write the failing test**

```js
// tests/crm/task-client-visibility-and-priority-display.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function read(path) {
  return readFile(path, 'utf8');
}

test('clientVisibleOnly mirrors the existing sharedOnly pattern', async () => {
  const source = await read('lib/crm/projects.js');
  assert.match(
    source,
    /function clientVisibleOnly\(tasks, role\) \{\s*return role === 'client'\s*\?\s*\(tasks \?\? \[\]\)\.filter\(\(task\) => task\.client_visible\)\s*:\s*\(tasks \?\? \[\]\);?\s*\}/,
  );
});

test('listProjectTasks filters through clientVisibleOnly', async () => {
  const source = await read('lib/crm/projects.js');
  const fnStart = source.indexOf('export async function listProjectTasks');
  const fnBody = source.slice(fnStart, source.indexOf('\nexport async function listProjectApprovals'));
  assert.match(fnBody, /clientVisibleOnly\(data(?:\s*\?\?\s*\[\])?,\s*viewer\.role\)/);
});

test('getProjectWorkspace filters tasks through clientVisibleOnly before mapping', async () => {
  const source = await read('lib/crm/projects.js');
  const fnStart = source.indexOf('export async function getProjectWorkspace');
  const fnBody = source.slice(fnStart, source.indexOf('\nexport async function listProjectMessages'));
  assert.match(fnBody, /clientVisibleOnly\(taskData(?:\s*\?\?\s*\[\])?,\s*viewer\.role\)/);
});

test('ProjectTasks renders a priority badge', async () => {
  const source = await read('components/crm/ProjectTasks.jsx');
  assert.match(source, /crm-task-priority/);
  assert.match(source, /task\.priority/);
});

test('ProjectTasks resolves the created-by name instead of rendering the raw id', async () => {
  const source = await read('components/crm/ProjectTasks.jsx');
  assert.match(source, /task\.createdBy\?\.full_name/, 'the read model already resolves createdBy -- this component was reading the raw task.created_by id');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/crm/task-client-visibility-and-priority-display.test.mjs`
Expected: FAIL — `clientVisibleOnly` doesn't exist; `ProjectTasks.jsx` renders neither priority nor `createdBy.full_name`.

- [ ] **Step 3: Add `clientVisibleOnly` next to `sharedOnly` in `lib/crm/projects.js`**

Current (lines 119–123):
```js
function sharedOnly(rows, role) {
  return role === 'client'
    ? (rows ?? []).filter((row) => row.visibility === 'shared')
    : (rows ?? []);
}
```

Add immediately after:
```js
function clientVisibleOnly(tasks, role) {
  return role === 'client'
    ? (tasks ?? []).filter((task) => task.client_visible)
    : (tasks ?? []);
}
```

In `listProjectTasks` (currently, around line 495):
```js
    const tasks = data ?? [];
```
becomes:
```js
    const tasks = clientVisibleOnly(data, viewer.role);
```

In `getProjectWorkspace`, the task fetch block (around line 346) stays as-is, but the `collectActorIds` call (around line 374-383) and the final `tasks:` mapping (around line 407) both currently read raw `taskData`. Introduce a filtered variable right after the fetch:

```js
    const { data: taskData, error: taskError } = await supabase
      .from('project_tasks')
      .select(TASK_FIELDS)
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true });
    if (taskError) failRead('Unable to load project tasks.');
    const tasks = clientVisibleOnly(taskData, viewer.role);
```

Then update the two places that currently reference `taskData` to reference `tasks` instead:
```diff
     const actorIds = collectActorIds(
       project,
       safeAssignments,
       history,
       messages,
       attachments,
-      taskData,
+      tasks,
       approvalData,
       deliverables,
     );
```
```diff
-      tasks: (taskData ?? []).map((task) => ({
+      tasks: tasks.map((task) => ({
         ...task,
         createdBy: profilesById.get(task.created_by) ?? null,
         assignee: profilesById.get(task.assignee_id) ?? null,
       })),
```

- [ ] **Step 4: Add the priority badge and fix the `createdBy` display bug in `ProjectTasks.jsx`**

Current task item markup:
```jsx
            <li key={task.id} className="crm-task-item">
              <div className="crm-task-main">
                <span className="crm-task-title">{task.title}</span>
                <span className={`crm-task-status ${task.status}`}>{task.status}</span>
              </div>
              {task.description ? (
                <p className="crm-task-description">{task.description}</p>
              ) : null}
              <div className="crm-task-meta">
                <span>Assignee: {task.assignee?.full_name || 'Unassigned'}</span>
                <span>Created by: {task.created_by || '-'}</span>
                <span>Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : '-'}</span>
              </div>
            </li>
```

Replace with:
```jsx
            <li key={task.id} className="crm-task-item">
              <div className="crm-task-main">
                <span className="crm-task-title">{task.title}</span>
                <span className={`crm-task-priority ${task.priority}`}>{task.priority}</span>
                <span className={`crm-task-status ${task.status}`}>{task.status}</span>
              </div>
              {task.description ? (
                <p className="crm-task-description">{task.description}</p>
              ) : null}
              <div className="crm-task-meta">
                <span>Assignee: {task.assignee?.full_name || 'Unassigned'}</span>
                <span>Created by: {task.createdBy?.full_name || 'Unknown'}</span>
                <span>Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : '-'}</span>
              </div>
            </li>
```

(`task.createdBy?.full_name` fixes a pre-existing display bug found while tracing this file for this task: the read model in `lib/crm/projects.js` has always resolved `createdBy` to the full profile object — `createdBy: profilesById.get(task.created_by) ?? null` — but this component read the raw snake_case `task.created_by` id instead, rendering a UUID. Worth fixing now since it's a one-line change in a file this task is already touching.)

Add priority badge colors next to the existing `.crm-task-status.*` variants in the same `<style jsx>` block:
```css
        .crm-task-priority {
          display: inline-block;
          padding: 0.2rem 0.65rem;
          border-radius: 999px;
          font-size: 0.8rem;
          border: 1px solid rgba(160, 180, 220, 0.25);
          background: rgba(160, 180, 220, 0.08);
          color: #d0d8f0;
        }

        .crm-task-priority.low {
          border-color: rgba(160, 180, 220, 0.35);
          color: #a0b0d0;
        }

        .crm-task-priority.medium {
          border-color: rgba(255, 200, 100, 0.35);
          color: #ffd08a;
        }

        .crm-task-priority.high {
          border-color: rgba(255, 100, 100, 0.4);
          color: #ff9999;
        }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test tests/crm/task-client-visibility-and-priority-display.test.mjs`
Expected: PASS (all 5 tests)

- [ ] **Step 6: Verify against the live database**

Reuse the Phase 1 test project if still present: create one task with `client_visible = false` (the default) and one with `client_visible = true` as the PM, then confirm via a scoped client-JWT `curl`/browser check that the client only sees the visible one, while the PM/admin sees both.

- [ ] **Step 7: Commit**

```bash
git add lib/crm/projects.js components/crm/ProjectTasks.jsx tests/crm/task-client-visibility-and-priority-display.test.mjs
git commit -m "fix(crm): enforce client_visible on task reads, render priority, fix createdBy showing a raw id"
```

---

## Task 6: Client-visible project budget

**Files:**
- Modify: `lib/crm/projects.js:103-116` (`clientSafeProject`)
- Modify: `components/crm/ProjectOverview.jsx`
- Test: `tests/crm/project-budget-visibility.test.mjs`

**Interfaces:**
- Produces: `clientSafeProject(project, role)` now includes `budget_amount`/`currency` in its client-role output. No other consumer of this function changes.

- [ ] **Step 1: Write the failing test**

```js
// tests/crm/project-budget-visibility.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function read(path) {
  return readFile(path, 'utf8');
}

test('clientSafeProject exposes budget_amount and currency to the client role', async () => {
  const source = await read('lib/crm/projects.js');
  const fnStart = source.indexOf('function clientSafeProject');
  const fnBody = source.slice(fnStart, source.indexOf('\nfunction sharedOnly'));
  assert.match(fnBody, /budget_amount: project\.budget_amount/);
  assert.match(fnBody, /currency: project\.currency/);
});

test('ProjectOverview renders budget only when set, with currency', async () => {
  const source = await read('components/crm/ProjectOverview.jsx');
  assert.match(source, /project\.budget_amount/);
  assert.match(source, /project\.currency/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/crm/project-budget-visibility.test.mjs`
Expected: FAIL — neither field is referenced yet.

- [ ] **Step 3: Update `clientSafeProject` in `lib/crm/projects.js`**

Current (lines 103–116):
```js
function clientSafeProject(project, role) {
  if (role !== 'client') return project;

  return {
    id: project.id,
    company_id: project.company_id,
    category: project.category,
    title: project.title,
    brief: project.brief,
    status: project.status,
    target_date: project.target_date,
    created_at: project.created_at,
    updated_at: project.updated_at,
  };
}
```

Replace with:
```js
function clientSafeProject(project, role) {
  if (role !== 'client') return project;

  return {
    id: project.id,
    company_id: project.company_id,
    category: project.category,
    title: project.title,
    brief: project.brief,
    status: project.status,
    target_date: project.target_date,
    created_at: project.created_at,
    updated_at: project.updated_at,
    budget_amount: project.budget_amount,
    currency: project.currency,
  };
}
```

- [ ] **Step 4: Render it in `ProjectOverview.jsx`**

Current grid (inside `.crm-overview-grid`):
```jsx
        <div className="crm-overview-item">
          <span className="crm-overview-label">Target Date</span>
          <span className="crm-overview-value">{project.target_date || '-'}</span>
        </div>
        <div className="crm-overview-item">
          <span className="crm-overview-label">Created</span>
          <span className="crm-overview-value">
            {project.created_at ? new Date(project.created_at).toLocaleDateString() : '-'}
          </span>
        </div>
```

Add a budget item, conditionally rendered (a project without a set budget shouldn't show a blank/zero figure):
```jsx
        <div className="crm-overview-item">
          <span className="crm-overview-label">Target Date</span>
          <span className="crm-overview-value">{project.target_date || '-'}</span>
        </div>
        {project.budget_amount != null && (
          <div className="crm-overview-item">
            <span className="crm-overview-label">Budget</span>
            <span className="crm-overview-value">{project.currency} {project.budget_amount}</span>
          </div>
        )}
        <div className="crm-overview-item">
          <span className="crm-overview-label">Created</span>
          <span className="crm-overview-value">
            {project.created_at ? new Date(project.created_at).toLocaleDateString() : '-'}
          </span>
        </div>
```

No fallback needed for `currency` — it's `NOT NULL DEFAULT 'USD'` at the column level (confirmed via `information_schema.columns` while writing the spec), so it's never null when `budget_amount` is set.

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test tests/crm/project-budget-visibility.test.mjs`
Expected: PASS (both tests)

- [ ] **Step 6: Commit**

```bash
git add lib/crm/projects.js components/crm/ProjectOverview.jsx tests/crm/project-budget-visibility.test.mjs
git commit -m "feat(crm): show clients their own project's budget and currency"
```

---

## Task 7: `project.delivered` email template

**Traced (correction from the original spec):** Templates in this file never build their own URLs — every `*Url` prop is precomputed by `templateContextFor()` in `app/api/cron/crm-notifications/route.js` from a module-scoped `const APP_URL = process.env.NEXT_PUBLIC_APP_URL || '';` (see `projectUrlFor`, lines 36–39 of that file) and passed in. `lib/site.js`'s `SITE` export has **no `url` field** — confirmed via grep, `SITE.url` would be `undefined`. This task therefore touches two files, not one: the template itself, and `templateContextFor` to supply a new `reviewsUrl`.

**Files:**
- Modify: `lib/email/templates.js`
- Modify: `app/api/cron/crm-notifications/route.js:45-63` (`templateContextFor`)
- Test: `tests/crm/project-delivered-email-template.test.mjs`

**Interfaces:**
- Consumes: `'project.delivered'` event type (Task 2's migration), payload shape `{ project_name }` (matches what Task 2's migration inserts); `APP_URL` (existing module-scoped const in the cron route, unchanged).
- Produces: `export function projectDeliveredEmail({ projectName, reviewsUrl, fullName })`, registered in `NOTIFICATION_TEMPLATES['project.delivered']`.

- [ ] **Step 1: Write the failing test**

```js
// tests/crm/project-delivered-email-template.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function read(path) {
  return readFile(path, 'utf8');
}

test('projectDeliveredEmail exists and uses a reviewsUrl prop, not a self-built URL', async () => {
  const source = await read('lib/email/templates.js');
  assert.match(source, /export function projectDeliveredEmail\(\{ projectName, reviewsUrl, fullName \}\)/);
  assert.doesNotMatch(source, /SITE\.url/, 'SITE has no url field -- this would be undefined');
});

test('project.delivered is registered in NOTIFICATION_TEMPLATES', async () => {
  const source = await read('lib/email/templates.js');
  assert.match(source, /'project\.delivered':\s*projectDeliveredEmail/);
});

test('templateContextFor supplies reviewsUrl built from APP_URL, the same way projectUrlFor does', async () => {
  const source = await read('app/api/cron/crm-notifications/route.js');
  assert.match(source, /reviewsUrl:\s*APP_URL \? `\$\{APP_URL\}\/reviews` : undefined/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/crm/project-delivered-email-template.test.mjs`
Expected: FAIL — none of the three exist yet.

- [ ] **Step 3: Write the template, modeled on `deliverablePublishedEmail`'s existing shape**

Add to `lib/email/templates.js`, after `projectAssignedEmail` (before the `NOTIFICATION_TEMPLATES` export):
```js
export function projectDeliveredEmail({ projectName, reviewsUrl, fullName }) {
  return {
    subject: `${projectName || 'Your project'} has been delivered`,
    html: emailLayout({
      preheader: 'Your project has been delivered.',
      heading: 'Your project is delivered',
      bodyHtml: `${greeting(fullName)}<p><strong>${escapeHtml(projectName) || 'Your project'}</strong> has been marked delivered. We'd love to hear how it went — a quick review helps other clients considering ${SITE.name} and helps us keep improving.</p>`,
      ctaLabel: 'Leave a review',
      ctaUrl: reviewsUrl,
      footerNote: 'You receive this because your project was just delivered.',
    }),
  };
}
```

Register it:
```diff
 export const NOTIFICATION_TEMPLATES = {
   'project.status_transitioned': projectStatusChangedEmail,
   'project.approval_updated': projectApprovalUpdatedEmail,
   'project.approval_requested': projectApprovalUpdatedEmail,
   'project.deliverable_published': deliverablePublishedEmail,
   'project.task_created': taskAssignedEmail,
   'project.task_updated': taskAssignedEmail,
   'project.message_posted': projectMessageEmail,
   'project.user_assigned': projectAssignedEmail,
+  'project.delivered': projectDeliveredEmail,
 };
```

- [ ] **Step 4: Add `reviewsUrl` to `templateContextFor` in `app/api/cron/crm-notifications/route.js`**

Current (lines 45–63):
```js
function templateContextFor(row, { recipient, project }) {
  const payload = row.payload ?? {};

  return {
    fullName: recipient.fullName,
    projectName: project?.title ?? payload.project_name,
    projectUrl: projectUrlFor(row.project_id),
    fromStatus: payload.from_status,
    toStatus: payload.to_status,
    status: payload.status,
    note: payload.note,
    deliverableName: payload.deliverable_name,
    version: payload.version,
    taskTitle: payload.task_title ?? payload.title,
    dueDate: payload.due_date,
    priority: payload.priority,
    authorName: payload.author_name,
    excerpt: payload.excerpt ?? payload.body,
    role: payload.role,
  };
}
```

Add `reviewsUrl`, built from the same `APP_URL` constant `projectUrlFor` already uses (do not introduce a second source of the site origin):
```js
function templateContextFor(row, { recipient, project }) {
  const payload = row.payload ?? {};

  return {
    fullName: recipient.fullName,
    projectName: project?.title ?? payload.project_name,
    projectUrl: projectUrlFor(row.project_id),
    reviewsUrl: APP_URL ? `${APP_URL}/reviews` : undefined,
    fromStatus: payload.from_status,
    toStatus: payload.to_status,
    status: payload.status,
    note: payload.note,
    deliverableName: payload.deliverable_name,
    version: payload.version,
    taskTitle: payload.task_title ?? payload.title,
    dueDate: payload.due_date,
    priority: payload.priority,
    authorName: payload.author_name,
    excerpt: payload.excerpt ?? payload.body,
    role: payload.role,
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test tests/crm/project-delivered-email-template.test.mjs`
Expected: PASS (all 3 tests)

- [ ] **Step 6: Commit**

```bash
git add lib/email/templates.js app/api/cron/crm-notifications/route.js tests/crm/project-delivered-email-template.test.mjs
git commit -m "feat(crm): add the project.delivered review-request email template"
```

---

## Task 8: Fix the missing `project.message_edited` email template (bug found while writing this plan)

**Context:** While reading `lib/email/templates.js` to model Task 7's template, `NOTIFICATION_TEMPLATES` was missing an entry for `'project.message_edited'` — the event type migration `0015` already creates `notifications_outbox` rows for (verified during Phase 1 CRM verification). `app/api/cron/crm-notifications/route.js`'s drain loop marks any row with no matching template as `failed` (`No email template for event ${row.event_type}`) rather than crashing. This means **every message-edit notification email has been silently failing since migration `0015` shipped** — a real, live gap, not a hypothetical one. Not in the original spec; flagged and fixed here since it's directly adjacent (same file, same task shape as Task 7) and needs no design decision.

**Files:**
- Modify: `lib/email/templates.js`
- Test: `tests/crm/message-edited-email-template.test.mjs`

**Interfaces:**
- Consumes: `'project.message_edited'` event type (already live since migration `0015`), payload shape `{ author_name, excerpt }` — same shape `'project.message_posted'` already uses (confirmed: both `post_project_message` and `update_project_message` build their `notifications_outbox` payload identically), so `templateContextFor` in the cron route needs no changes.
- Produces: `export function messageEditedEmail({ projectName, authorName, excerpt, projectUrl, fullName })`, registered in `NOTIFICATION_TEMPLATES['project.message_edited']`.

- [ ] **Step 1: Write the failing test**

```js
// tests/crm/message-edited-email-template.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function read(path) {
  return readFile(path, 'utf8');
}

test('messageEditedEmail exists', async () => {
  const source = await read('lib/email/templates.js');
  assert.match(source, /export function messageEditedEmail\(\{ projectName, authorName, excerpt, projectUrl, fullName \}\)/);
});

test('project.message_edited is registered in NOTIFICATION_TEMPLATES', async () => {
  const source = await read('lib/email/templates.js');
  assert.match(source, /'project\.message_edited':\s*messageEditedEmail/);
});

test('the cron drain route already builds a compatible context (author_name/excerpt) -- no route change needed', async () => {
  const source = await read('app/api/cron/crm-notifications/route.js');
  assert.match(source, /authorName:\s*payload\.author_name/);
  assert.match(source, /excerpt:\s*payload\.excerpt/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/crm/message-edited-email-template.test.mjs`
Expected: FAIL on the first two — `messageEditedEmail` doesn't exist and isn't registered. (Third test should already PASS, confirming no route change is needed — that's the point of including it.)

- [ ] **Step 3: Write the template, modeled directly on `projectMessageEmail`**

Add after `projectMessageEmail`:
```js
export function messageEditedEmail({ projectName, authorName, excerpt, projectUrl, fullName }) {
  return {
    subject: `A message was edited on ${projectName || 'your project'}`,
    html: emailLayout({
      preheader: `${authorName || 'Someone'} edited a message.`,
      heading: 'Message edited',
      bodyHtml: `${greeting(fullName)}<p><strong>${escapeHtml(authorName) || 'A team member'}</strong> edited a message on <strong>${escapeHtml(projectName) || 'your project'}</strong>.</p>${
        excerpt
          ? `<blockquote style="margin:16px 0; padding:12px 16px; border-left:3px solid ${PALETTE.accent}; color:${PALETTE.body};">${escapeHtml(excerpt)}</blockquote>`
          : ''
      }`,
      ctaLabel: 'View in workspace',
      ctaUrl: projectUrl,
      footerNote: 'You receive this because you are assigned to this project.',
    }),
  };
}
```

Register it:
```diff
   'project.message_posted': projectMessageEmail,
+  'project.message_edited': messageEditedEmail,
   'project.user_assigned': projectAssignedEmail,
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/crm/message-edited-email-template.test.mjs`
Expected: PASS (all 3 tests)

- [ ] **Step 5: Verify against the live database**

If the Phase 1 test project/accounts are still present, edit the existing test message again and confirm via the cron drain (or a direct `notifications_outbox` query) that the new row now resolves to `status = 'sent'` instead of `'failed'`.

- [ ] **Step 6: Commit**

```bash
git add lib/email/templates.js tests/crm/message-edited-email-template.test.mjs
git commit -m "fix(crm): register the missing project.message_edited email template -- every edit notification has been silently failing since migration 0015"
```

---

## Final Verification

- [ ] Run the full suite: `pnpm test` — expect the same 1 pre-existing unrelated `auth-portals` failure and every new test above passing.
- [ ] Run `pnpm build` — clean, no errors.
- [ ] Push to `preview`, confirm the same `pnpm test`/`pnpm build` gate on the pushed branch.
- [ ] Update `STATUS.md` with this batch's outcome, same convention as every prior session.
