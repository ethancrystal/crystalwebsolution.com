begin;

create extension if not exists pgtap with schema extensions;
select plan(8);

-- Behavioural proof for 0041_client_read_scope_hardening.sql. Same fixture
-- idiom as 0009_project_realtime_crm.test.sql: stable UUIDs, the admin row
-- uses pinned_admin_email() so 0014's single-admin trigger accepts it.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'client-a@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'assigned@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', public.pinned_admin_email(), '', now(), '{}', '{}', now(), now());

insert into public.companies (id, name, email, created_by)
values ('20000000-0000-0000-0000-000000000001', 'Company A', 'a@example.test', '10000000-0000-0000-0000-000000000005');

update public.profiles
set role = case id
  when '10000000-0000-0000-0000-000000000003' then 'project_manager'::public.user_role
  when '10000000-0000-0000-0000-000000000005' then 'admin'::public.user_role
  else 'client'::public.user_role
end,
company_id = case id
  when '10000000-0000-0000-0000-000000000001' then '20000000-0000-0000-0000-000000000001'::uuid
  else null
end
where id in (
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000005'
);

insert into public.company_members (company_id, user_id, role)
values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'owner');

insert into public.projects (id, company_id, category, title, brief, status, created_by)
values ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'web_design', 'Company A Site', 'Build a new site.', 'planned', '10000000-0000-0000-0000-000000000001');

insert into public.project_threads (id, project_id)
values ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001');

insert into public.project_assignments (project_id, user_id, assigned_by)
values ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000005');

-- One shared and one internal deliverable.
insert into public.project_deliverables (id, project_id, title, file_name, storage_path, mime_type, size_bytes, visibility, created_by)
values
  ('70000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Homepage v1', 'home-v1.pdf', '30000000-0000-0000-0000-000000000001/70000000-0000-0000-0000-000000000001/home-v1.pdf', 'application/pdf', 1024, 'shared', '10000000-0000-0000-0000-000000000005'),
  ('70000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 'Internal QA notes', 'qa.pdf', '30000000-0000-0000-0000-000000000001/70000000-0000-0000-0000-000000000002/qa.pdf', 'application/pdf', 1024, 'internal', '10000000-0000-0000-0000-000000000005');

-- Three approvals: project-level (no deliverable), on the shared deliverable,
-- on the internal deliverable. The reviewer note is what 0041 stops leaking.
insert into public.project_approvals (project_id, deliverable_id, status, requested_by, reviewed_by, note)
values
  ('30000000-0000-0000-0000-000000000001', null, 'pending', '10000000-0000-0000-0000-000000000001', null, null),
  ('30000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 'approved', '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'Looks good.'),
  ('30000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000002', 'rejected', '10000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000005', 'Staff-only: client must not read this.');

-- Two outbox rows for client A: the in-app feed item and its email twin.
insert into public.notifications_outbox (project_id, user_id, channel, event_type, payload)
values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'in_app', 'project.message_posted', '{"excerpt":"hello"}'),
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'email', 'project.message_posted', '{"excerpt":"hello"}');

-- A deal for client A's company, owned by the PM.
insert into public.deals (company_id, title, value, owner_id)
values ('20000000-0000-0000-0000-000000000001', 'Company A retainer', 12000.00, '10000000-0000-0000-0000-000000000003');

set local role authenticated;

-- Client A
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select is((select count(*) from public.project_approvals), 2::bigint, 'client sees the project-level and shared-deliverable approvals only');
select is(
  (select count(*) from public.project_approvals where note = 'Staff-only: client must not read this.'),
  0::bigint,
  'client cannot read the internal-deliverable approval or its note'
);
select is((select count(*) from public.notifications_outbox), 1::bigint, 'client sees only the in_app outbox row');
select is((select channel from public.notifications_outbox limit 1), 'in_app', 'the visible outbox row is the in_app one');
select is((select count(*) from public.deals), 0::bigint, 'client can no longer read company deals');
select throws_ok(
  $$ insert into public.deals (company_id, title, owner_id)
     values ('20000000-0000-0000-0000-000000000001', 'Client-submitted brief', '10000000-0000-0000-0000-000000000001') $$,
  '42501',
  null,
  'client can no longer insert deals directly'
);

-- Assigned PM
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);
select is((select count(*) from public.project_approvals), 3::bigint, 'assigned employee sees every approval including the internal one');

-- Admin
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000005', true);
select is((select count(*) from public.deals), 1::bigint, 'admin still reads deals');

select * from finish();
rollback;
