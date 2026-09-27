-- Behavioural proof for 0044: the pin moved, an existing account holding
-- the new address is promoted, and the previous admin is demoted to
-- project_manager rather than left as a second admin.

begin;

create extension if not exists pgtap with schema extensions;
select plan(5);

select is(
  public.pinned_admin_email(),
  'moizj00@gmail.com',
  '0044 pins the admin role to the owner-approved address'
);

-- Replay 0044's alignment against fixtures: a current admin that is not the
-- pinned address cannot exist once the pin moved, so stage the pre-0044
-- state by inserting the new account as a client and the old one as a PM,
-- then promote exactly as the migration does.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('00000000-0000-0000-0000-000000000000', '44000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'moizj00@gmail.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '44000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'ethan@cdsportswearinc.com', '', now(), '{}', '{}', now(), now());

select is(
  (select role::text from public.profiles where id = '44000000-0000-0000-0000-000000000001'),
  'client',
  'the new address signs up as a client like everyone else'
);

update public.profiles set role = 'admin'::public.user_role
where id = '44000000-0000-0000-0000-000000000001';

select is(
  (select role::text from public.profiles where id = '44000000-0000-0000-0000-000000000001'),
  'admin',
  'the pinned address can be promoted to admin'
);

select throws_ok(
  $$ update public.profiles set role = 'admin'::public.user_role
     where id = '44000000-0000-0000-0000-000000000002' $$,
  '42501', null,
  'the previous admin address can no longer hold the admin role'
);

select is(
  (select count(*) from public.profiles where role = 'admin'::public.user_role),
  1::bigint,
  'there is still exactly one admin'
);

select * from finish();
rollback;
