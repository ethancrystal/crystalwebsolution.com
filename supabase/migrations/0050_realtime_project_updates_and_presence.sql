-- 0050_realtime_project_updates_and_presence.sql
--
-- Records Realtime changes that were applied to the live database directly
-- (through the Supabase dashboard's SQL runner, 2026-09-30) and never went
-- through a migration. The live migration table stops at 0045; before this
-- file, a replay of supabase/migrations/ did not reproduce production.
--
-- What it adds, on top of the message broadcasts from 0009/0032:
--   * project_status_changed   when projects.status changes
--   * project_task_changed     on any project_tasks insert/update/delete
--   * project_approval_changed on any project_approvals insert/update/delete
--   * presence on the project topics
--
-- Topics are the existing private ones, `project:<id>:shared` and
-- `project:<id>:internal`, authorized by private.can_subscribe_project_topic
-- (0009): a participant may join `shared`; only staff who can view internal
-- records may join `internal`. Payloads carry identifiers only; clients
-- re-read through the RLS-protected read model.
--
-- Client-facing (`shared`) sends are filtered: a task reaches `shared` only if
-- it is (or was, before an update) client-visible; an approval only if it is
-- project-level or its deliverable is shared.
--
-- The function bodies below are the live ones verbatim, so applying this file
-- to production changes no behaviour. The one addition is the repo's usual
-- revoke on trigger functions (as 0032 does for the message broadcast): the
-- live functions currently keep the default PUBLIC execute grant. Trigger
-- functions cannot be called directly, so this is hygiene, not a fix.
--
-- Idempotent: safe to apply on production, where the objects already exist.

create or replace function private.broadcast_project_status_change()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'pg_catalog', 'public', 'private', 'storage'
as $function$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM realtime.send(
      pg_catalog.jsonb_build_object('project_id', NEW.id),
      'project_status_changed',
      'project:' || NEW.id::text || ':shared',
      true
    );
    PERFORM realtime.send(
      pg_catalog.jsonb_build_object('project_id', NEW.id),
      'project_status_changed',
      'project:' || NEW.id::text || ':internal',
      true
    );
  END IF;
  RETURN NULL;
END;
$function$;

create or replace function private.broadcast_project_task_change()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'pg_catalog', 'public', 'private', 'storage'
as $function$
DECLARE
  v_project_id uuid;
  v_task_id uuid;
  v_client_visible boolean := false;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_project_id := OLD.project_id;
    v_task_id := OLD.id;
    v_client_visible := OLD.client_visible;
  ELSE
    v_project_id := NEW.project_id;
    v_task_id := NEW.id;
    IF TG_OP = 'UPDATE' THEN
      v_client_visible := OLD.client_visible OR NEW.client_visible;
    ELSE
      v_client_visible := NEW.client_visible;
    END IF;
  END IF;

  PERFORM realtime.send(
    pg_catalog.jsonb_build_object('project_id', v_project_id, 'task_id', v_task_id),
    'project_task_changed',
    'project:' || v_project_id::text || ':internal',
    true
  );

  IF v_client_visible THEN
    PERFORM realtime.send(
      pg_catalog.jsonb_build_object('project_id', v_project_id, 'task_id', v_task_id),
      'project_task_changed',
      'project:' || v_project_id::text || ':shared',
      true
    );
  END IF;

  RETURN NULL;
END;
$function$;

create or replace function private.broadcast_project_approval_change()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'pg_catalog', 'public', 'private', 'storage'
as $function$
DECLARE
  v_old_project_id uuid;
  v_new_project_id uuid;
  v_old_approval_id uuid;
  v_new_approval_id uuid;
  v_old_client_visible boolean := false;
  v_new_client_visible boolean := false;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    v_old_project_id := OLD.project_id;
    v_old_approval_id := OLD.id;
    v_old_client_visible := OLD.deliverable_id IS NULL OR EXISTS (
      SELECT 1
      FROM public.project_deliverables AS deliverable
      WHERE deliverable.id = OLD.deliverable_id
        AND deliverable.visibility = 'shared'
    );
  END IF;

  IF TG_OP <> 'DELETE' THEN
    v_new_project_id := NEW.project_id;
    v_new_approval_id := NEW.id;
    v_new_client_visible := NEW.deliverable_id IS NULL OR EXISTS (
      SELECT 1
      FROM public.project_deliverables AS deliverable
      WHERE deliverable.id = NEW.deliverable_id
        AND deliverable.visibility = 'shared'
    );
  END IF;

  IF v_old_project_id IS NOT NULL THEN
    PERFORM realtime.send(
      pg_catalog.jsonb_build_object('project_id', v_old_project_id, 'approval_id', v_old_approval_id),
      'project_approval_changed',
      'project:' || v_old_project_id::text || ':internal',
      true
    );
    IF v_old_client_visible THEN
      PERFORM realtime.send(
        pg_catalog.jsonb_build_object('project_id', v_old_project_id, 'approval_id', v_old_approval_id),
        'project_approval_changed',
        'project:' || v_old_project_id::text || ':shared',
        true
      );
    END IF;
  END IF;

  IF v_new_project_id IS NOT NULL
     AND v_new_project_id IS DISTINCT FROM v_old_project_id THEN
    PERFORM realtime.send(
      pg_catalog.jsonb_build_object('project_id', v_new_project_id, 'approval_id', v_new_approval_id),
      'project_approval_changed',
      'project:' || v_new_project_id::text || ':internal',
      true
    );
    IF v_new_client_visible THEN
      PERFORM realtime.send(
        pg_catalog.jsonb_build_object('project_id', v_new_project_id, 'approval_id', v_new_approval_id),
        'project_approval_changed',
        'project:' || v_new_project_id::text || ':shared',
        true
      );
    END IF;
  ELSIF v_new_project_id IS NOT NULL
     AND v_new_project_id = v_old_project_id
     AND (v_old_client_visible OR v_new_client_visible) THEN
    PERFORM realtime.send(
      pg_catalog.jsonb_build_object('project_id', v_new_project_id, 'approval_id', v_new_approval_id),
      'project_approval_changed',
      'project:' || v_new_project_id::text || ':shared',
      true
    );
  END IF;

  RETURN NULL;
END;
$function$;

revoke all on function private.broadcast_project_status_change() from public, anon, authenticated;
revoke all on function private.broadcast_project_task_change() from public, anon, authenticated;
revoke all on function private.broadcast_project_approval_change() from public, anon, authenticated;

drop trigger if exists broadcast_project_status_changed on public.projects;
create trigger broadcast_project_status_changed
after update of status on public.projects
for each row execute function private.broadcast_project_status_change();

drop trigger if exists broadcast_project_task_changed on public.project_tasks;
create trigger broadcast_project_task_changed
after insert or delete or update on public.project_tasks
for each row execute function private.broadcast_project_task_change();

drop trigger if exists broadcast_project_approval_changed on public.project_approvals;
create trigger broadcast_project_approval_changed
after insert or delete or update on public.project_approvals
for each row execute function private.broadcast_project_approval_change();

-- Receiving: broadcasts (0009) and now presence, on the same topics.
drop policy if exists "Project participants can receive project broadcasts"
  on realtime.messages;

create policy "Project participants can receive project broadcasts"
on realtime.messages
for select
to authenticated
using (
  extension = any (array['broadcast'::text, 'presence'::text])
  and private.can_subscribe_project_topic(realtime.topic())
);

-- Tracking presence: only on a topic the caller may join. Broadcast sends
-- from the browser stay impossible (no insert policy for 'broadcast'); only
-- the SECURITY DEFINER triggers above send.
drop policy if exists "Project participants can track project presence"
  on realtime.messages;

create policy "Project participants can track project presence"
on realtime.messages
for insert
to authenticated
with check (
  extension = 'presence'
  and private.can_subscribe_project_topic(realtime.topic())
);
