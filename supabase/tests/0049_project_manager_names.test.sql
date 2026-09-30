-- Behavioural proof for 0049_project_manager_names.sql: every role reads the
-- project manager's NAME for projects it can access, and nothing for the
-- rest. The result carries no email or user id. Fixture idiom as 0047's test.

begin;

create extension if not exists pgtap with schema extensions;
select plan(11);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('00000000-0000-0000-0000-000000000000', '49000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'client-a@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '49000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'pm@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '49000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'other-pm@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '49000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'client-b@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '49000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', public.pinned_admin_email(), '', now(), '{}', '{}', now(), now());

insert into public.companies (id, name, email, created_by)
values
  ('49100000-0000-0000-0000-000000000001', 'Company A', 'a@example.test', '49000000-0000-0000-0000-000000000005'),
  ('49100000-0000-0000-0000-000000000002', 'Company B', 'b@example.test', '49000000-0000-0000-0000-000000000005');

update public.profiles
set role = case id
  when '49000000-0000-0000-0000-000000000002' then 'project_manager'::public.user_role
  when '49000000-0000-0000-0000-000000000003' then 'project_manager'::public.user_role
  when '49000000-0000-0000-0000-000000000005' then 'admin'::public.user_role
  else 'client'::public.user_role
end,
full_name = case id
  when '49000000-0000-0000-0000-000000000002' then 'Ethan Ray'
  when '49000000-0000-0000-0000-000000000003' then 'Alex'
  when '49000000-0000-0000-0000-000000000005' then 'The Admin'
  else full_name
end,
company_id = case id
  when '49000000-0000-0000-0000-000000000001' then '49100000-0000-0000-0000-000000000001'::uuid
  when '49000000-0000-0000-0000-000000000004' then '49100000-0000-0000-0000-000000000002'::uuid
  else null
end
where id::text like '49000000-%';

insert into public.company_members (company_id, user_id, role)
values
  ('49100000-0000-0000-0000-000000000001', '49000000-0000-0000-0000-000000000001', 'owner'),
  ('49100000-0000-0000-0000-000000000002', '49000000-0000-0000-0000-000000000004', 'owner');

create temporary table ids (key text primary key, id uuid) on commit drop;
grant all on ids to authenticated;

set local role authenticated;
select set_config('request.jwt.claim.sub', '49000000-0000-0000-0000-000000000001', true);
insert into ids values
  ('a', public.create_project('49100000-0000-0000-0000-000000000001', 'web_design', 'Website A', 'Brief', null, null, '49200000-0000-0000-0000-000000000001')),
  ('a2', public.create_project('49100000-0000-0000-0000-000000000001', 'web_design', 'Unassigned A', 'Brief', null, null, '49200000-0000-0000-0000-000000000003'));
select set_config('request.jwt.claim.sub', '49000000-0000-0000-0000-000000000004', true);
insert into ids values
  ('b', public.create_project('49100000-0000-0000-0000-000000000002', 'web_design', 'Website B', 'Brief', null, null, '49200000-0000-0000-0000-000000000002'));
reset role;

-- Project A: the lead PM, plus the admin as a second assignee (the admin is
-- not a project manager, so never shown as one). Project B: the other PM.
insert into public.project_assignments (project_id, user_id, assigned_by)
select id, '49000000-0000-0000-0000-000000000002'::uuid, '49000000-0000-0000-0000-000000000005'::uuid from ids where key = 'a'
union all
select id, '49000000-0000-0000-0000-000000000005'::uuid, '49000000-0000-0000-0000-000000000005'::uuid from ids where key = 'a'
union all
select id, '49000000-0000-0000-0000-000000000003'::uuid, '49000000-0000-0000-0000-000000000005'::uuid from ids where key = 'b';

-- ---------- shape: name only ---------------------------------------------

select is(
  pg_catalog.pg_get_function_result('public.project_manager_names(uuid[])'::regprocedure),
  'TABLE(project_id uuid, full_name text)',
  'the function returns project id and name only (no email, no user id)'
);

select is(
  (select pg_catalog.has_function_privilege('anon', 'public.project_manager_names(uuid[])', 'execute')),
  false,
  'anon cannot execute it'
);

-- ---------- client A -----------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', '49000000-0000-0000-0000-000000000001', true);

select results_eq(
  format('select full_name from public.project_manager_names(array[%L]::uuid[])', (select id from ids where key = 'a')),
  $$ values ('Ethan Ray'::text) $$,
  'the client reads the name of their project''s manager, not the admin assignee'
);

select is_empty(
  format('select 1 from public.project_manager_names(array[%L]::uuid[])', (select id from ids where key = 'b')),
  'the client reads nothing for another company''s project'
);

select is_empty(
  format('select 1 from public.project_manager_names(array[%L]::uuid[])', (select id from ids where key = 'a2')),
  'a project with no manager returns no row'
);

select is(
  (select count(*)::int from public.project_manager_names((select array_agg(id) from ids))),
  1,
  'a mixed list returns only the accessible, assigned project'
);

select is_empty(
  'select 1 from public.project_manager_names(null)',
  'a null list returns nothing'
);

-- ---------- project managers ---------------------------------------------

select set_config('request.jwt.claim.sub', '49000000-0000-0000-0000-000000000002', true);
select results_eq(
  format('select full_name from public.project_manager_names(array[%L]::uuid[])', (select id from ids where key = 'a')),
  $$ values ('Ethan Ray'::text) $$,
  'the assigned manager reads their own project'
);

select set_config('request.jwt.claim.sub', '49000000-0000-0000-0000-000000000003', true);
select is_empty(
  format('select 1 from public.project_manager_names(array[%L]::uuid[])', (select id from ids where key = 'a')),
  'a manager on another project reads nothing'
);

-- ---------- admin --------------------------------------------------------

select set_config('request.jwt.claim.sub', '49000000-0000-0000-0000-000000000005', true);
select results_eq(
  format(
    'select full_name from public.project_manager_names(array[%L, %L]::uuid[]) order by full_name',
    (select id from ids where key = 'a'),
    (select id from ids where key = 'b')
  ),
  $$ values ('Alex'::text), ('Ethan Ray'::text) $$,
  'the admin reads every project''s manager'
);

-- ---------- client B -----------------------------------------------------

select set_config('request.jwt.claim.sub', '49000000-0000-0000-0000-000000000004', true);
select results_eq(
  format('select full_name from public.project_manager_names(array[%L]::uuid[])', (select id from ids where key = 'b')),
  $$ values ('Alex'::text) $$,
  'the other client reads their own manager'
);

reset role;

select * from finish();
rollback;
