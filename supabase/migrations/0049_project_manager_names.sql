-- 0049_project_manager_names.sql
--
-- Lets a client see who leads their project: the project manager's name and
-- nothing else.
--
-- project_assignments is readable by staff only (private.can_view_internal,
-- 0009), so the client portal could not tell which project manager leads
-- which project. Opening that table to clients would also expose assignment
-- ids and assigned_by. Instead this SECURITY DEFINER function returns, for
-- each requested project the caller can access (private.can_access_project),
-- the lead project manager's display name: the earliest assignment, the same
-- "lead" rule as the admin's lead-manager card (app/actions/assignment-actions.js)
-- and lib/crm/projects.js loadPrimaryAssignees. Projects with nobody assigned,
-- or that the caller cannot access, are simply absent.
--
-- It never returns an email address, a profile id or any other assignment
-- detail (owner rule: a project manager is shown to clients by name only).
--
-- Applying this file to production is a separate owner action. Until it is
-- applied, the portal falls back to not showing a name (it never guesses).

create or replace function public.project_manager_names(p_project_ids uuid[])
returns table (project_id uuid, full_name text)
language sql
stable
security definer
set search_path to 'pg_catalog', 'public', 'private'
as $function$
  select distinct on (assignment.project_id)
    assignment.project_id,
    profile.full_name
  from public.project_assignments as assignment
  join public.profiles as profile on profile.id = assignment.user_id
  where assignment.project_id = any (coalesce(p_project_ids, '{}'::uuid[]))
    and profile.role = 'project_manager'::public.user_role
    and private.can_access_project(assignment.project_id)
  order by assignment.project_id, assignment.created_at, assignment.id;
$function$;

revoke all on function public.project_manager_names(uuid[]) from public;
revoke all on function public.project_manager_names(uuid[]) from anon;
grant execute on function public.project_manager_names(uuid[]) to authenticated;
