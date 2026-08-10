-- 0018_profiles_shared_project_visibility.sql
--
-- RLS on public.profiles had no policy letting project participants see
-- each other -- only "Users can view their own profile" (auth.uid() = id),
-- "Admin can view all profiles", and a deal-owner exception. Confirmed live
-- during Phase 1 CRM verification (2026-08-09): a PM's own JWT querying
-- profiles for both its own id and the client's id on a shared project
-- returned only its own row. This silently broke name resolution across
-- the entire project workspace (message sender, task assignee/createdBy,
-- approval requestedBy/reviewedBy, deliverable/attachment uploadedBy) for
-- every role, whenever the target profile wasn't the viewer's own.
--
-- private.shares_project_with(p_target_id) mirrors private.can_access_project's
-- existing per-role logic exactly: a project is in scope for the viewer via
-- admin/client-company/PM-assignment, and the target participates in that
-- same project via assignment (staff) or company_id match (client). No new
-- semantics invented -- this is the read-visibility mirror of what
-- can_access_project already governs for write/access.
--
-- profiles has no sensitive columns beyond what's already broadly needed
-- (id, role, full_name, company_id, avatar_url, timestamps,
-- requested_staff_access) -- a full-row policy is safe; no view/column
-- restriction needed.
--
-- Verified after applying: (1) a PM test account's own JWT querying for
-- both its own id and a co-participant client's id now returns both rows
-- (previously only its own); (2) the same JWT querying for two unrelated
-- profiles (a different client, the real admin) returns zero rows --
-- confirms the policy is scoped to shared projects, not broadened globally.

begin;

create or replace function private.shares_project_with(p_target_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'pg_catalog', 'public', 'private', 'storage'
as $$
  select exists (
    select 1
    from public.projects as project
    where private.can_access_project(project.id)
      and (
        exists (
          select 1
          from public.project_assignments as assignment
          where assignment.project_id = project.id
            and assignment.user_id = p_target_id
        )
        or exists (
          select 1
          from public.profiles as target_profile
          where target_profile.id = p_target_id
            and target_profile.company_id = project.company_id
        )
      )
  )
$$;

create policy "Project participants can view co-participant profiles"
on public.profiles
for select
using (private.shares_project_with(id));

commit;
