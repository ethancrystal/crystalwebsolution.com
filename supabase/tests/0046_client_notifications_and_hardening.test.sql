-- Behavioural proof for 0046_client_notifications_and_hardening.sql, with the
-- fixture idiom of 0043_project_briefs.test.sql: stable UUIDs, and the admin
-- row uses pinned_admin_email() so 0014's single-admin trigger accepts it.

begin;

create extension if not exists pgtap with schema extensions;
select plan(21);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('00000000-0000-0000-0000-000000000000', '46000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'client-a@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '46000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'pm@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '46000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'client-b@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '46000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'newcomer@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '46000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', public.pinned_admin_email(), '', now(), '{}', '{}', now(), now());

insert into public.companies (id, name, email, created_by)
values
  ('46100000-0000-0000-0000-000000000001', 'Company A', 'a@example.test', '46000000-0000-0000-0000-000000000005'),
  ('46100000-0000-0000-0000-000000000002', 'Company B', 'b@example.test', '46000000-0000-0000-0000-000000000005');

update public.profiles
set role = case id
  when '46000000-0000-0000-0000-000000000002' then 'project_manager'::public.user_role
  when '46000000-0000-0000-0000-000000000005' then 'admin'::public.user_role
  else 'client'::public.user_role
end,
company_id = case id
  when '46000000-0000-0000-0000-000000000001' then '46100000-0000-0000-0000-000000000001'::uuid
  when '46000000-0000-0000-0000-000000000003' then '46100000-0000-0000-0000-000000000002'::uuid
  else null
end
where id::text like '46000000-%';

insert into public.company_members (company_id, user_id, role)
values
  ('46100000-0000-0000-0000-000000000001', '46000000-0000-0000-0000-000000000001', 'owner'),
  ('46100000-0000-0000-0000-000000000002', '46000000-0000-0000-0000-000000000003', 'owner');

-- Two projects for company A: P1 has nobody assigned, P2 has the PM.
set local role authenticated;
select set_config('request.jwt.claim.sub', '46000000-0000-0000-0000-000000000001', true);
create temporary table ids (key text primary key, id uuid) on commit drop;
grant all on ids to authenticated;
insert into ids values
  ('p1', public.create_project('46100000-0000-0000-0000-000000000001', 'web_design', 'Unassigned project', 'Brief one', null, null, '46200000-0000-0000-0000-000000000001')),
  ('p2', public.create_project('46100000-0000-0000-0000-000000000001', 'web_design', 'Assigned project', 'Brief two', null, null, '46200000-0000-0000-0000-000000000002'));
reset role;

insert into public.project_assignments (project_id, user_id, assigned_by)
select id, '46000000-0000-0000-0000-000000000002', '46000000-0000-0000-0000-000000000005'
from ids where key = 'p2';

-- ---------- 1. recipients -------------------------------------------------

select ok(
  '46000000-0000-0000-0000-000000000005' in (
    select user_id from private.project_notification_recipients((select id from ids where key = 'p1'), '46000000-0000-0000-0000-000000000001', 'shared')
  ),
  'with nobody assigned, the admin hears about a client''s activity'
);
select ok(
  '46000000-0000-0000-0000-000000000005' not in (
    select user_id from private.project_notification_recipients((select id from ids where key = 'p2'), '46000000-0000-0000-0000-000000000001', 'shared')
  ),
  'once a project manager is assigned, the admin drops off'
);
select ok(
  '46000000-0000-0000-0000-000000000002' in (
    select user_id from private.project_notification_recipients((select id from ids where key = 'p2'), '46000000-0000-0000-0000-000000000001', 'shared')
  ),
  'the assigned project manager still hears about it'
);
select ok(
  '46000000-0000-0000-0000-000000000005' not in (
    select user_id from private.project_notification_recipients((select id from ids where key = 'p1'), '46000000-0000-0000-0000-000000000005', 'shared')
  ),
  'the admin is never notified about their own action'
);
select ok(
  '46000000-0000-0000-0000-000000000005' in (
    select user_id from private.project_notification_recipients((select id from ids where key = 'p1'), '46000000-0000-0000-0000-000000000001', 'internal')
  )
  and '46000000-0000-0000-0000-000000000001' not in (
    select user_id from private.project_notification_recipients((select id from ids where key = 'p1'), '46000000-0000-0000-0000-000000000005', 'internal')
  ),
  'internal events reach the admin fallback but never the client'
);

-- ---------- 2. brief acknowledgement ---------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', '46000000-0000-0000-0000-000000000001', true);
insert into public.project_briefs (id, company_id, created_by, brief_type, title, answers)
values ('46300000-0000-0000-0000-000000000001', '46100000-0000-0000-0000-000000000001',
        '46000000-0000-0000-0000-000000000001', 'website', 'Website — A', '{"business_name":"A"}');
insert into ids values
  ('p3', public.submit_project_brief('46300000-0000-0000-0000-000000000001', 'Website brief', null, 'New website', null));
reset role;

select is(
  (select count(*) from public.notifications_outbox
   where event_type = 'project.brief_received'
     and user_id = '46000000-0000-0000-0000-000000000001'
     and project_id = (select id from ids where key = 'p3')),
  2::bigint,
  'the client gets an email and an in-app acknowledgement of their brief'
);
select is(
  (select array_agg(channel order by channel) from public.notifications_outbox
   where event_type = 'project.brief_received' and project_id = (select id from ids where key = 'p3')),
  array['email', 'in_app']::text[],
  'one acknowledgement per channel'
);
select is(
  (select count(*) from public.notifications_outbox
   where event_type = 'project.brief_submitted'
     and user_id = '46000000-0000-0000-0000-000000000005'
     and project_id = (select id from ids where key = 'p3')),
  2::bigint,
  'the admin alert is unchanged'
);
select is(
  (select payload ->> 'brief_title' from public.notifications_outbox
   where event_type = 'project.brief_received' and channel = 'email' and project_id = (select id from ids where key = 'p3')),
  'Website — A',
  'the acknowledgement names the brief'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '46000000-0000-0000-0000-000000000001', true);
select is(
  public.submit_project_brief('46300000-0000-0000-0000-000000000001', 'again', null, 'Again', null),
  (select id from ids where key = 'p3'),
  'a retried submission returns the same project'
);
reset role;
select is(
  (select count(*) from public.notifications_outbox
   where event_type = 'project.brief_received' and project_id = (select id from ids where key = 'p3')),
  2::bigint,
  'a retried submission does not acknowledge twice'
);

-- ---------- 3. onboarding alert --------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', '46000000-0000-0000-0000-000000000004', true);
insert into ids values ('c_new', public.onboard_client_company('Newco', 'New Comer', '555-0100'));
reset role;

select is(
  (select count(*) from public.notifications_outbox
   where event_type = 'client.onboarded'
     and user_id = '46000000-0000-0000-0000-000000000005'
     and channel = 'email'
     and project_id is null),
  1::bigint,
  'the admin gets one email when a new client finishes onboarding'
);
select is(
  (select payload ->> 'company_name' || '|' || (payload ->> 'contact_name') || '|' || (payload ->> 'client_email')
   from public.notifications_outbox where event_type = 'client.onboarded'),
  'Newco|New Comer|newcomer@example.test',
  'the alert names the company, the contact and their sign-in email'
);
select ok(
  exists (select 1 from public.company_members
          where company_id = (select id from ids where key = 'c_new')
            and user_id = '46000000-0000-0000-0000-000000000004'
            and role = 'owner'),
  'onboarding still records the client as the company owner'
);

-- ---------- 4. profile guard ------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', '46000000-0000-0000-0000-000000000003', true);
select throws_ok(
  $$ update public.profiles set requested_staff_access = true where id = '46000000-0000-0000-0000-000000000003' $$,
  '42501', null,
  'a client cannot put themselves in the staff request queue'
);
select throws_ok(
  $$ update public.profiles set created_at = '2020-01-01' where id = '46000000-0000-0000-0000-000000000003' $$,
  '42501', null,
  'a client cannot backdate their account'
);
select lives_ok(
  $$ update public.profiles set full_name = 'Client B Renamed' where id = '46000000-0000-0000-0000-000000000003' $$,
  'a client can still change their own display name'
);
reset role;

-- The admin's validated command still resolves a real request.
update public.profiles set requested_staff_access = true where id = '46000000-0000-0000-0000-000000000004';
set local role authenticated;
select set_config('request.jwt.claim.sub', '46000000-0000-0000-0000-000000000005', true);
select lives_ok(
  $$ select public.admin_resolve_staff_request('46000000-0000-0000-0000-000000000004', false) $$,
  'the admin can still resolve a staff request'
);
reset role;

-- ---------- 5. enqueue_project_notification --------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', '46000000-0000-0000-0000-000000000001', true);
select throws_ok(
  format('select public.enqueue_project_notification(%L, %L, %L, %L::jsonb, %L)',
    (select id from ids where key = 'p2'), 'email', 'project.message_posted', '{"excerpt":"hi"}',
    '46000000-0000-0000-0000-000000000003'),
  '42501', null,
  'a client can no longer queue an email to another user'
);

select set_config('request.jwt.claim.sub', '46000000-0000-0000-0000-000000000002', true);
select throws_ok(
  format('select public.enqueue_project_notification(%L, %L, %L, %L::jsonb, %L)',
    (select id from ids where key = 'p2'), 'email', 'project.message_posted', '{}',
    '46000000-0000-0000-0000-000000000003'),
  '42501', null,
  'staff cannot notify someone who is not on the project'
);
select lives_ok(
  format('select public.enqueue_project_notification(%L, %L, %L, %L::jsonb, %L)',
    (select id from ids where key = 'p2'), 'in_app', 'project.note_posted', '{}',
    '46000000-0000-0000-0000-000000000001'),
  'the assigned project manager can still notify the project''s client'
);
reset role;

select * from finish();
rollback;
