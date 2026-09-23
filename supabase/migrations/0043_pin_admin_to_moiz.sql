-- 0043_pin_admin_to_moiz.sql
--
-- Owner-approved 2026-09-23: the single admin moves from
-- ethan@cdsportswearinc.com (created by 0042, never signed in) to
-- moizj00@gmail.com (Moiz Jamil), which already has a confirmed account.
--
-- The single-admin design from 0014 is unchanged: one pinned address, the
-- partial unique index profiles_single_admin_idx, and the
-- enforce_pinned_admin trigger. Only the pinned address moves. Lead-capture
-- RPCs (0026, 0029) resolve the admin actor through
-- public.pinned_admin_email(), so new leads are attributed to Moiz from here on.
--
-- Do not edit 0014/0015/0042; this file is the live replacement.
-- Applying this file to production is a separate owner action; merging
-- the PR deploys the Next.js app but does not run SQL.

create or replace function public.pinned_admin_email()
returns text
language sql
immutable
set search_path to ''
as $$
  SELECT 'moizj00@gmail.com'::TEXT
$$;

COMMENT ON FUNCTION public.pinned_admin_email() IS
  'The single address permitted to hold the admin role. 0043 moved this from ethan@cdsportswearinc.com to moizj00@gmail.com. Change here to move it again.';

-- Keep the 0027 containment contract: the helper is not an API endpoint.
revoke all on function public.pinned_admin_email()
  from public, anon, authenticated;

-- Align the admin row with the new pin.
--
-- Both mailboxes are separate, existing accounts, so there is no rename
-- here (unlike 0042). Any other admin is demoted to project_manager (the
-- same fallback 0042 used), then the pinned address is promoted.
-- Demote-before-promote is required by profiles_single_admin_idx.
-- If the new address has no account (fresh/test databases), this is a
-- no-op and fixtures should read public.pinned_admin_email().
do $$
declare
  v_new constant text := 'moizj00@gmail.com';
  v_new_id uuid;
begin
  select id into v_new_id
  from auth.users
  where lower(email) = v_new;

  if v_new_id is not null then
    update public.profiles
    set role = 'project_manager'::public.user_role
    where role = 'admin'::public.user_role
      and id is distinct from v_new_id;

    update public.profiles
    set role = 'admin'::public.user_role,
        requested_staff_access = false
    where id = v_new_id
      and role is distinct from 'admin'::public.user_role;
  end if;
end;
$$;
