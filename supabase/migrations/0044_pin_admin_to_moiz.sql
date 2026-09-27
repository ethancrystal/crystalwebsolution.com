-- 0044_pin_admin_to_moiz.sql
--
-- Owner-approved 2026-09-27: the single admin moves from
-- ethan@cdsportswearinc.com (0042) to moizj00@gmail.com. Ethan's account
-- stays, demoted to project_manager (the same step 0042 took for any other
-- admin), so it keeps /team access but not /admin or user management.
--
-- Consequences, also owner-approved: the lead-capture RPCs (0026, 0029)
-- record new contact-form leads against the pinned admin, and 0043's
-- project.brief_submitted alerts go to the admin, so both move to Moiz.
--
-- Do not edit 0014/0015/0042; this file is the live replacement.

create or replace function public.pinned_admin_email()
returns text
language sql
immutable
set search_path to ''
as $$
  SELECT 'moizj00@gmail.com'::TEXT
$$;

COMMENT ON FUNCTION public.pinned_admin_email() IS
  'The single address permitted to hold the admin role. 0042 pinned ethan@cdsportswearinc.com; 0044 moved it to moizj00@gmail.com. Change here to move it again.';

-- Keep the 0027 containment contract: the helper is not an API endpoint.
revoke all on function public.pinned_admin_email()
  from public, anon, authenticated;

-- Align the admin row with the new pin. No Auth rename here: the new address
-- is an existing, separate account, and accounts are never merged. Demote
-- before promote: profiles_single_admin_idx allows one admin row at a time.
-- If the address has no account (fresh/test databases), this is a no-op and
-- fixtures keep reading public.pinned_admin_email().
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
    set role = 'admin'::public.user_role
    where id = v_new_id
      and role is distinct from 'admin'::public.user_role;
  end if;
end;
$$;
