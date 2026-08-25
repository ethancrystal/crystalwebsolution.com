-- LOCAL ONLY / DISPOSABLE FIXTURES
--
-- This file is loaded by `supabase db reset` after migrations. It intentionally
-- seeds authentication identities only. Domain records are left empty so the
-- pgTAP suites can create their own isolated companies, projects, messages, and
-- pinned-admin fixtures without primary-key or global-count collisions.
--
-- Login credentials for these local accounts are deliberately documented here
-- because this file must never be used against a hosted or production project:
--   seed-client@example.test   / local-client-password
--   seed-employee@example.test / local-employee-password
--
-- The seed is not a substitute for preview provisioning. Preview role-isolation
-- checks should continue using scripts/verify-crm-preview-authorization.mjs.

begin;

create extension if not exists pgcrypto with schema extensions;

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '70000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'seed-client@example.test',
    extensions.crypt('local-client-password', extensions.gen_salt('bf')),
    now(),
    '{}'::jsonb,
    '{"full_name":"Local Seed Client"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '70000000-0000-0000-0000-000000000002',
    'authenticated',
    'authenticated',
    'seed-employee@example.test',
    extensions.crypt('local-employee-password', extensions.gen_salt('bf')),
    now(),
    '{}'::jsonb,
    '{"full_name":"Local Seed Employee"}'::jsonb,
    now(),
    now()
  )
on conflict (id) do nothing;

-- The auth trigger creates profiles with the lowest-privilege client role.
-- Keep the employee fixture explicit and leave it unassigned to any project.
update public.profiles
set role = 'project_manager'::public.user_role,
    full_name = 'Local Seed Employee'
where id = '70000000-0000-0000-0000-000000000002'::uuid;

update public.profiles
set role = 'client'::public.user_role,
    full_name = 'Local Seed Client'
where id = '70000000-0000-0000-0000-000000000001'::uuid;

commit;
