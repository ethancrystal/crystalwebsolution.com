-- Behavioural proof for 0051_data_map_access_fixes.sql. Every fix has a
-- positive case (the legitimate path still works) and a negative case (the
-- leak or abuse is closed). Fixture idiom as 0046's and 0047's tests: stable
-- UUIDs, the admin row uses pinned_admin_email() so 0014's single-admin
-- trigger accepts it, and the session user (the migration owner) may change
-- protected profile fields directly to set up states the app reaches through
-- commands (a demoted user, a staff request).

begin;

create extension if not exists pgtap with schema extensions;
select plan(57);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('00000000-0000-0000-0000-000000000000', '51000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'client-a@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '51000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'pm@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '51000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'other-pm@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '51000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'client-b@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '51000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', public.pinned_admin_email(), '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '51000000-0000-0000-0000-000000000006', 'authenticated', 'authenticated', 'demoted@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '51000000-0000-0000-0000-000000000007', 'authenticated', 'authenticated', 'staff-with-company@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '51000000-0000-0000-0000-000000000008', 'authenticated', 'authenticated', 'lead-person@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '51000000-0000-0000-0000-000000000009', 'authenticated', 'authenticated', 'wants-staff@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '51000000-0000-0000-0000-00000000000a', 'authenticated', 'authenticated', 'declined@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '51000000-0000-0000-0000-00000000000b', 'authenticated', 'authenticated', 'fresh@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '51000000-0000-0000-0000-00000000000d', 'authenticated', 'authenticated', 'overload@example.test', '', now(), '{}', '{}', now(), now());

-- Companies: A is a client company (Client A is linked through the profile
-- and company_members); Member Co has only a company_members row; Prospect Co
-- and the two Twin Co rows have no client account; Lead Co holds an existing
-- contact for D6.
insert into public.companies (id, name, email, created_by, created_at)
values
  ('51100000-0000-0000-0000-000000000001', 'Company A', 'owner@clientco.test', '51000000-0000-0000-0000-000000000005', now()),
  ('51100000-0000-0000-0000-000000000002', 'Member Co', 'x@memberco.test', '51000000-0000-0000-0000-000000000005', now()),
  ('51100000-0000-0000-0000-000000000003', 'Prospect Co', 'p@prospect.test', '51000000-0000-0000-0000-000000000005', now()),
  ('51100000-0000-0000-0000-00000000000b', 'Twin Co', 'twin-new@twin.test', '51000000-0000-0000-0000-000000000005', '2021-01-01'),
  ('51100000-0000-0000-0000-00000000000a', 'Twin Co', 'twin-old@twin.test', '51000000-0000-0000-0000-000000000005', '2020-01-01'),
  ('51100000-0000-0000-0000-00000000000c', 'Lead Co', 'lead@leadco.test', '51000000-0000-0000-0000-000000000005', now());

update public.profiles
set role = case id
  when '51000000-0000-0000-0000-000000000002' then 'project_manager'::public.user_role
  when '51000000-0000-0000-0000-000000000003' then 'project_manager'::public.user_role
  when '51000000-0000-0000-0000-000000000005' then 'admin'::public.user_role
  when '51000000-0000-0000-0000-000000000006' then 'project_manager'::public.user_role
  when '51000000-0000-0000-0000-000000000007' then 'project_manager'::public.user_role
  else 'client'::public.user_role
end,
company_id = case id
  when '51000000-0000-0000-0000-000000000001' then '51100000-0000-0000-0000-000000000001'::uuid
  when '51000000-0000-0000-0000-000000000007' then '51100000-0000-0000-0000-000000000001'::uuid
  else null
end
where id::text like '51000000-%';

insert into public.company_members (company_id, user_id, role)
values
  ('51100000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', 'owner'),
  ('51100000-0000-0000-0000-000000000002', '51000000-0000-0000-0000-000000000004', 'owner');

insert into public.contacts (company_id, first_name, last_name, email, status, created_by)
values
  ('51100000-0000-0000-0000-00000000000c', 'Lead', 'Person', 'lead-person@example.test', 'lead', '51000000-0000-0000-0000-000000000005'),
  ('51100000-0000-0000-0000-00000000000c', 'Over', 'Load', 'overload@example.test', 'lead', '51000000-0000-0000-0000-000000000005');

-- Two projects for company A, created the way the app does.
create temporary table ids (key text primary key, id uuid) on commit drop;
grant all on ids to authenticated;
create temporary table leads (key text primary key, company_id uuid) on commit drop;

set local role authenticated;
select set_config('request.jwt.claim.sub', '51000000-0000-0000-0000-000000000001', true);
insert into ids values
  ('p', public.create_project('51100000-0000-0000-0000-000000000001', 'web_design', 'Website', 'Brief one', null, null, '51200000-0000-0000-0000-000000000001')),
  ('p2', public.create_project('51100000-0000-0000-0000-000000000001', 'web_design', 'Logo', 'Brief two', null, null, '51200000-0000-0000-0000-000000000002'));
reset role;

-- P: the project manager is assigned, and so is a user who was later demoted
-- to client (the assignment stays, as it does in production). P2: only the
-- demoted user is assigned.
insert into public.project_assignments (project_id, user_id, assigned_by)
select id, '51000000-0000-0000-0000-000000000002'::uuid, '51000000-0000-0000-0000-000000000005'::uuid from ids where key = 'p'
union all
select id, '51000000-0000-0000-0000-000000000006'::uuid, '51000000-0000-0000-0000-000000000005'::uuid from ids where key = 'p'
union all
select id, '51000000-0000-0000-0000-000000000006'::uuid, '51000000-0000-0000-0000-000000000005'::uuid from ids where key = 'p2';

update public.profiles
set role = 'client'::public.user_role
where id = '51000000-0000-0000-0000-000000000006';

-- ---------- D2. recipients: current staff, clients only --------------------

select ok(
  '51000000-0000-0000-0000-000000000006' not in (
    select user_id from private.project_notification_recipients((select id from ids where key = 'p'), '51000000-0000-0000-0000-000000000001', 'shared')
  ),
  'D2: a user demoted to client no longer receives a project through their old assignment'
);
select ok(
  '51000000-0000-0000-0000-000000000006' not in (
    select user_id from private.project_notification_recipients((select id from ids where key = 'p'), '51000000-0000-0000-0000-000000000001', 'internal')
  ),
  'D2: nor do they receive internal events'
);
select ok(
  '51000000-0000-0000-0000-000000000002' in (
    select user_id from private.project_notification_recipients((select id from ids where key = 'p'), '51000000-0000-0000-0000-000000000001', 'internal')
  ),
  'D2: the assigned project manager still receives internal events'
);
select ok(
  '51000000-0000-0000-0000-000000000007' not in (
    select user_id from private.project_notification_recipients((select id from ids where key = 'p'), '51000000-0000-0000-0000-000000000002', 'shared')
  ),
  'D2: a staff account that carries the client company id is not in the client fan-out'
);
select ok(
  '51000000-0000-0000-0000-000000000001' in (
    select user_id from private.project_notification_recipients((select id from ids where key = 'p'), '51000000-0000-0000-0000-000000000002', 'shared')
  ),
  'D2: the client company''s own account still is'
);
select ok(
  '51000000-0000-0000-0000-000000000005' in (
    select user_id from private.project_notification_recipients((select id from ids where key = 'p2'), '51000000-0000-0000-0000-000000000001', 'shared')
  )
  and '51000000-0000-0000-0000-000000000006' not in (
    select user_id from private.project_notification_recipients((select id from ids where key = 'p2'), '51000000-0000-0000-0000-000000000001', 'shared')
  ),
  'D2: a stale assignment does not suppress the admin fallback, and is not a recipient itself'
);

-- ---------- D1. update_project_approval ------------------------------------

insert into public.project_deliverables (id, project_id, title, description, file_name, storage_path, mime_type, size_bytes, status, visibility, version, created_by)
select '51400000-0000-0000-0000-000000000001'::uuid, id, 'Internal draft', '', 'x.png', id::text || '/51400000-0000-0000-0000-000000000001/x.png', 'image/png', 10, 'submitted', 'internal', '1', '51000000-0000-0000-0000-000000000002'::uuid
from ids where key = 'p'
union all
select '51400000-0000-0000-0000-000000000002'::uuid, id, 'Shared draft', '', 'y.png', id::text || '/51400000-0000-0000-0000-000000000002/y.png', 'image/png', 10, 'submitted', 'shared', '1', '51000000-0000-0000-0000-000000000002'::uuid
from ids where key = 'p';

insert into public.project_approvals (id, project_id, deliverable_id, requested_by, note)
select '51500000-0000-0000-0000-000000000001'::uuid, id, '51400000-0000-0000-0000-000000000001'::uuid, '51000000-0000-0000-0000-000000000002'::uuid, 'Requester note internal' from ids where key = 'p'
union all
select '51500000-0000-0000-0000-000000000002'::uuid, id, '51400000-0000-0000-0000-000000000002'::uuid, '51000000-0000-0000-0000-000000000002'::uuid, 'Requester note shared' from ids where key = 'p'
union all
select '51500000-0000-0000-0000-000000000003'::uuid, id, null, '51000000-0000-0000-0000-000000000002'::uuid, 'Requester note project-level' from ids where key = 'p';

set local role authenticated;
select set_config('request.jwt.claim.sub', '51000000-0000-0000-0000-000000000005', true);
select lives_ok($$ select public.update_project_approval('51500000-0000-0000-0000-000000000001', 'approved', 'Internal decision') $$, 'D1: the admin decides an approval on an internal deliverable');
select lives_ok($$ select public.update_project_approval('51500000-0000-0000-0000-000000000002', 'rejected', 'Shared decision') $$, 'D1: and one on a shared deliverable');
select lives_ok($$ select public.update_project_approval('51500000-0000-0000-0000-000000000003', 'approved', 'Project-level decision') $$, 'D1: and a project-level one');
reset role;

select is(
  (select count(*)::int from public.notifications_outbox
   where event_type = 'project.approval_updated'
     and payload ->> 'approval_id' = '51500000-0000-0000-0000-000000000001'
     and user_id = '51000000-0000-0000-0000-000000000001'),
  0, 'D1: the client is not notified about an approval on an internal deliverable'
);
select is(
  (select count(*)::int from public.notifications_outbox
   where event_type = 'project.approval_updated'
     and payload ->> 'approval_id' = '51500000-0000-0000-0000-000000000001'
     and user_id = '51000000-0000-0000-0000-000000000002'),
  2, 'D1: the assigned project manager still is, in-app and email'
);
select is(
  (select count(*)::int from public.notifications_outbox
   where event_type = 'project.approval_updated'
     and payload ->> 'approval_id' = '51500000-0000-0000-0000-000000000002'
     and user_id = '51000000-0000-0000-0000-000000000001'),
  2, 'D1: the client is notified about an approval on a shared deliverable'
);
select is(
  (select count(*)::int from public.notifications_outbox
   where event_type = 'project.approval_updated'
     and payload ->> 'approval_id' = '51500000-0000-0000-0000-000000000003'
     and user_id = '51000000-0000-0000-0000-000000000001'),
  2, 'D1: and about a project-level approval, which the read policy shows them too'
);
select is(
  (select payload ->> 'note' from public.notifications_outbox
   where event_type = 'project.approval_updated'
     and payload ->> 'approval_id' = '51500000-0000-0000-0000-000000000002'
     and user_id = '51000000-0000-0000-0000-000000000001' and channel = 'email'),
  'Shared decision', 'D1: the payload carries the decision note, not the requester''s'
);
select is(
  (select note from public.project_approvals where id = '51500000-0000-0000-0000-000000000002'),
  'Shared decision', 'D1: and it is the note stored on the approval'
);

-- ---------- D3. update_project_task ----------------------------------------

insert into public.project_tasks (id, project_id, title, created_by, client_visible)
select '51600000-0000-0000-0000-000000000001'::uuid, id, 'Staff-only task', '51000000-0000-0000-0000-000000000002'::uuid, false from ids where key = 'p'
union all
select '51600000-0000-0000-0000-000000000002'::uuid, id, 'Shared task', '51000000-0000-0000-0000-000000000002'::uuid, true from ids where key = 'p'
union all
select '51600000-0000-0000-0000-000000000003'::uuid, id, 'Assignment task', '51000000-0000-0000-0000-000000000002'::uuid, false from ids where key = 'p'
union all
select '51600000-0000-0000-0000-000000000004'::uuid, id, 'Second assignment task', '51000000-0000-0000-0000-000000000002'::uuid, false from ids where key = 'p';

set local role authenticated;
select set_config('request.jwt.claim.sub', '51000000-0000-0000-0000-000000000001', true);
select throws_ok(
  $$ select public.update_project_task('51600000-0000-0000-0000-000000000001', p_status => 'done') $$,
  'P0002', 'Task not found.',
  'D3: a client cannot update a staff-only task'
);
select throws_ok(
  $$ select public.update_project_task('51600000-0000-0000-0000-000000000002', p_assignee_id => '51000000-0000-0000-0000-000000000002') $$,
  '42501', 'Only staff can assign a task.',
  'D3: a client cannot assign a shared task to anyone'
);
select throws_ok(
  $$ select public.update_project_task('51600000-0000-0000-0000-000000000002', p_assignee_id => '51000000-0000-0000-0000-000000000001') $$,
  '42501', 'Only staff can assign a task.',
  'D3: not even to themselves'
);
select lives_ok(
  $$ select public.update_project_task('51600000-0000-0000-0000-000000000002', p_status => 'done') $$,
  'D3: a client can still update a shared task'
);
select isnt(
  (select completed_at from public.project_tasks where id = '51600000-0000-0000-0000-000000000002'),
  null, 'D3: completed_at is set when the task becomes done'
);
select lives_ok(
  $$ select public.update_project_task('51600000-0000-0000-0000-000000000002', p_status => 'in_progress') $$,
  'D3: a done task can be reopened'
);
select is(
  (select completed_at from public.project_tasks where id = '51600000-0000-0000-0000-000000000002'),
  null, 'D3: completed_at is cleared when it leaves done'
);
reset role;

select is(
  (select status from public.project_tasks where id = '51600000-0000-0000-0000-000000000001'),
  'todo', 'D3: the staff-only task was not touched by the client'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '51000000-0000-0000-0000-000000000002', true);
select lives_ok(
  $$ select public.update_project_task('51600000-0000-0000-0000-000000000001', p_status => 'done') $$,
  'D3: the assigned project manager can update a staff-only task'
);
select isnt(
  (select completed_at from public.project_tasks where id = '51600000-0000-0000-0000-000000000001'),
  null, 'D3: and completing it sets completed_at'
);
select lives_ok(
  $$ select public.update_project_task('51600000-0000-0000-0000-000000000001', p_title => 'Renamed') $$,
  'D3: a change that does not touch the status'
);
select isnt(
  (select completed_at from public.project_tasks where id = '51600000-0000-0000-0000-000000000001'),
  null, 'D3: keeps completed_at'
);
select throws_ok(
  $$ select public.update_project_task('51600000-0000-0000-0000-000000000003', p_assignee_id => '51000000-0000-0000-0000-000000000003') $$,
  '22023', 'Task assignee must be an admin or a project manager assigned to this project.',
  'D3: staff cannot assign a task to a project manager who is not on the project'
);
select throws_ok(
  $$ select public.update_project_task('51600000-0000-0000-0000-000000000003', p_assignee_id => '51000000-0000-0000-0000-000000000001') $$,
  '22023', 'Task assignee must be an admin or a project manager assigned to this project.',
  'D3: nor to a client'
);
select throws_ok(
  $$ select public.update_project_task('51600000-0000-0000-0000-000000000003', p_assignee_id => '51000000-0000-0000-0000-000000000006') $$,
  '22023', 'Task assignee must be an admin or a project manager assigned to this project.',
  'D3: nor to a user who was demoted but is still assigned'
);
select lives_ok(
  $$ select public.update_project_task('51600000-0000-0000-0000-000000000003', p_assignee_id => '51000000-0000-0000-0000-000000000005') $$,
  'D3: staff can assign a task to the admin'
);
select lives_ok(
  $$ select public.update_project_task('51600000-0000-0000-0000-000000000004', p_assignee_id => '51000000-0000-0000-0000-000000000002') $$,
  'D3: or to a project manager on the project'
);
reset role;

select is(
  (select assignee_id from public.project_tasks where id = '51600000-0000-0000-0000-000000000003'),
  '51000000-0000-0000-0000-000000000005'::uuid,
  'D3: the admin assignment was written'
);

-- ---------- D4. create_lead_from_contact -----------------------------------

insert into leads
select 'by_name', (public.create_lead_from_contact('Stranger One', 'stranger1@elsewhere.test', 'company a') ->> 'company_id')::uuid;
insert into leads
select 'by_domain', (public.create_lead_from_contact('Stranger Two', 's2@clientco.test') ->> 'company_id')::uuid;
insert into leads
select 'by_member', (public.create_lead_from_contact('Stranger Three', 's3@elsewhere.test', 'member co') ->> 'company_id')::uuid;
insert into leads
select 'prospect_by_name', (public.create_lead_from_contact('Prospect Person', 'pp@elsewhere.test', 'prospect co') ->> 'company_id')::uuid;
insert into leads
select 'prospect_by_domain', (public.create_lead_from_contact('Domain Person', 'dp@prospect.test') ->> 'company_id')::uuid;
insert into leads
select 'twin', (public.create_lead_from_contact('Twin Person', 'tp@elsewhere.test', 'twin co') ->> 'company_id')::uuid;

select isnt(
  (select company_id from leads where key = 'by_name'),
  '51100000-0000-0000-0000-000000000001'::uuid,
  'D4: a lead naming a client company does not join it'
);
select is(
  (select name from public.companies where id = (select company_id from leads where key = 'by_name')),
  'company a', 'D4: it gets a company of its own instead'
);
select isnt(
  (select company_id from leads where key = 'by_domain'),
  '51100000-0000-0000-0000-000000000001'::uuid,
  'D4: a lead from a client company''s email domain does not join it'
);
select isnt(
  (select company_id from leads where key = 'by_member'),
  '51100000-0000-0000-0000-000000000002'::uuid,
  'D4: a company that only has a company_members row is protected too'
);
select is(
  (select count(*)::int from public.contacts
   where company_id in ('51100000-0000-0000-0000-000000000001', '51100000-0000-0000-0000-000000000002')
     and lower(email) in ('stranger1@elsewhere.test', 's2@clientco.test', 's3@elsewhere.test')),
  0, 'D4: no visitor contact was written into either client company'
);
select is(
  (select company_id from leads where key = 'prospect_by_name'),
  '51100000-0000-0000-0000-000000000003'::uuid,
  'D4: a lead still joins an existing company that has no client account, by name'
);
select is(
  (select company_id from leads where key = 'prospect_by_domain'),
  '51100000-0000-0000-0000-000000000003'::uuid,
  'D4: and by email domain'
);
select is(
  (select company_id from leads where key = 'twin'),
  '51100000-0000-0000-0000-00000000000a'::uuid,
  'D4: with several matches the oldest company wins, every time'
);

-- ---------- D6. onboard_client_company -------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', '51000000-0000-0000-0000-000000000008', true);
insert into ids values ('c_lead', public.onboard_client_company('Newco', 'Lead Person', '555-0100'));
reset role;

select isnt(
  (select id from ids where key = 'c_lead'), null,
  'D6: an account whose email is already a contact can finish onboarding'
);
select is(
  (select company_id from public.profiles where id = '51000000-0000-0000-0000-000000000008'),
  (select id from ids where key = 'c_lead'),
  'D6: and is linked to the company it just created'
);
select is(
  (select company_id from public.contacts where lower(email) = 'lead-person@example.test'),
  '51100000-0000-0000-0000-00000000000c'::uuid,
  'D6: the existing contact stays in its own company, it is not moved'
);
select is(
  (select count(*)::int from public.contacts where lower(email) = 'lead-person@example.test'),
  1, 'D6: and no duplicate contact was written'
);
select ok(
  not exists (
    select 1 from public.company_members
    where user_id = '51000000-0000-0000-0000-000000000008'
      and company_id = '51100000-0000-0000-0000-00000000000c'
  ),
  'D6: the account did not join the existing contact''s company'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '51000000-0000-0000-0000-000000000008', true);
select throws_ok(
  $$ select public.onboard_client_company(p_company_name => 'Again', p_contact_name => 'Lead Person') $$,
  '23505', 'You are already linked to a company.',
  'D6: onboarding twice still raises the already-linked error'
);

select set_config('request.jwt.claim.sub', '51000000-0000-0000-0000-00000000000b', true);
insert into ids values ('c_fresh', public.onboard_client_company('Freshco', 'Fresh Person', null));
select set_config('request.jwt.claim.sub', '51000000-0000-0000-0000-00000000000d', true);
select lives_ok(
  $$ select public.onboard_client_company(p_name => 'Overload Co', p_email => 'ignored@example.test') $$,
  'D6: the two-argument overload tolerates an existing contact too'
);
reset role;

select is(
  (select count(*)::int from public.contacts
   where company_id = (select id from ids where key = 'c_fresh') and lower(email) = 'fresh@example.test'),
  1, 'D6: an email that is not a contact still gets its contact row'
);

-- ---------- D7. admin_resolve_staff_request --------------------------------

update public.profiles
set requested_staff_access = true
where id in (
  '51000000-0000-0000-0000-000000000005',
  '51000000-0000-0000-0000-000000000009',
  '51000000-0000-0000-0000-00000000000a'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '51000000-0000-0000-0000-000000000002', true);
select throws_ok(
  $$ select public.admin_resolve_staff_request('51000000-0000-0000-0000-000000000009', true) $$,
  '42501', 'Admin access required.',
  'D7: only the admin can resolve a request'
);

select set_config('request.jwt.claim.sub', '51000000-0000-0000-0000-000000000005', true);
select lives_ok(
  $$ select public.admin_resolve_staff_request('51000000-0000-0000-0000-000000000005', true) $$,
  'D7: approving the admin''s own request does not fail'
);
select lives_ok(
  $$ select public.admin_resolve_staff_request('51000000-0000-0000-0000-000000000009', true) $$,
  'D7: approving another account''s request works'
);
select lives_ok(
  $$ select public.admin_resolve_staff_request('51000000-0000-0000-0000-00000000000a', false) $$,
  'D7: so does declining one'
);
reset role;

select is(
  (select role::text from public.profiles where id = '51000000-0000-0000-0000-000000000005'),
  'admin', 'D7: the only admin is still an admin'
);
select is(
  (select requested_staff_access from public.profiles where id = '51000000-0000-0000-0000-000000000005'),
  false, 'D7: and the stale request has left the pending queue'
);
select is(
  (select role::text from public.profiles where id = '51000000-0000-0000-0000-000000000009'),
  'project_manager', 'D7: approving a client''s request still grants project_manager'
);
select is(
  (select role::text || '/' || requested_staff_access::text from public.profiles where id = '51000000-0000-0000-0000-00000000000a'),
  'client/false', 'D7: declining still clears the flag and leaves the role'
);

select * from finish();
rollback;
