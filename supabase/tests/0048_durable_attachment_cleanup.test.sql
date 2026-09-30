-- Behavioural proof for 0048_durable_attachment_cleanup.sql: a stale upload
-- moves into the cleanup queue, a storage failure keeps it (with an attempt
-- and a backed-off retry), a later successful run removes it, leases stop two
-- runs processing the same entry, and clients can neither run the cleanup nor
-- read the queue.

begin;

create extension if not exists pgtap with schema extensions;
select plan(16);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('00000000-0000-0000-0000-000000000000', '48000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'client@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '48000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', public.pinned_admin_email(), '', now(), '{}', '{}', now(), now());

insert into public.companies (id, name, email, created_by)
values ('48100000-0000-0000-0000-000000000001', 'Company A', 'a@example.test', '48000000-0000-0000-0000-000000000005');

update public.profiles
set role = case id when '48000000-0000-0000-0000-000000000005' then 'admin'::public.user_role else 'client'::public.user_role end,
    company_id = case id when '48000000-0000-0000-0000-000000000001' then '48100000-0000-0000-0000-000000000001'::uuid else null end
where id::text like '48000000-%';

insert into public.company_members (company_id, user_id, role)
values ('48100000-0000-0000-0000-000000000001', '48000000-0000-0000-0000-000000000001', 'owner');

set local role authenticated;
select set_config('request.jwt.claim.sub', '48000000-0000-0000-0000-000000000001', true);
create temporary table ids (key text primary key, id uuid) on commit drop;
grant all on ids to authenticated;
insert into ids values
  ('p', public.create_project('48100000-0000-0000-0000-000000000001', 'web_design', 'Website', 'Brief', null, null, '48200000-0000-0000-0000-000000000001'));
reset role;

-- Three attachments: stale and unattached (the one to clean), fresh, and ready.
insert into public.project_attachments (id, project_id, uploaded_by, visibility, file_name, storage_path, mime_type, size_bytes, status, created_at)
select v.id, (select id from ids where key = 'p'), '48000000-0000-0000-0000-000000000001', 'shared', v.name, v.path, 'application/pdf', 10, v.status, v.created_at
from (values
  ('48300000-0000-0000-0000-000000000001'::uuid, 'stale.pdf', 'p/48300000-0000-0000-0000-000000000001/stale.pdf', 'pending', now() - interval '2 days'),
  ('48300000-0000-0000-0000-000000000002'::uuid, 'fresh.pdf', 'p/48300000-0000-0000-0000-000000000002/fresh.pdf', 'pending', now() - interval '1 hour'),
  ('48300000-0000-0000-0000-000000000003'::uuid, 'ready.pdf', 'p/48300000-0000-0000-0000-000000000003/ready.pdf', 'ready', now() - interval '2 days')
) as v(id, name, path, status, created_at);

-- ---------- claim --------------------------------------------------------

create temporary table claimed as
  select * from public.claim_attachment_cleanup(now() - interval '24 hours', 50, 600);

select is(
  (select array_agg(storage_path) from claimed),
  array['p/48300000-0000-0000-0000-000000000001/stale.pdf'],
  'only the stale, unattached, pending upload is claimed'
);
select ok(
  not exists (select 1 from public.project_attachments where id = '48300000-0000-0000-0000-000000000001'),
  'its attachment row is gone, so it can no longer be finalized'
);
select ok(
  exists (select 1 from public.project_attachments where id = '48300000-0000-0000-0000-000000000002')
  and exists (select 1 from public.project_attachments where id = '48300000-0000-0000-0000-000000000003'),
  'fresh and ready attachments are untouched'
);
select is(
  (select attempts from public.project_attachment_cleanup where storage_path = 'p/48300000-0000-0000-0000-000000000001/stale.pdf'),
  0,
  'the cleanup record exists before any storage call'
);
select is(
  (select count(*) from public.claim_attachment_cleanup(now() - interval '24 hours', 50, 600)),
  0::bigint,
  'a leased entry is not handed to an overlapping run'
);

-- ---------- storage fails ------------------------------------------------

select is(
  public.fail_attachment_cleanup(array['p/48300000-0000-0000-0000-000000000001/stale.pdf'], 'Storage 503'),
  1,
  'a storage failure is recorded'
);
select ok(
  (select attempts = 1 and last_error = 'Storage 503' and last_attempt_at is not null
          and next_attempt_at > now() + interval '1 minute'
     from public.project_attachment_cleanup where storage_path = 'p/48300000-0000-0000-0000-000000000001/stale.pdf'),
  'the record is kept with its attempt, error and a backed-off retry time'
);
select is(
  (select count(*) from public.claim_attachment_cleanup(now() - interval '24 hours', 50, 600)),
  0::bigint,
  'it is not retried before its backoff expires'
);

-- ---------- retry succeeds -----------------------------------------------

update public.project_attachment_cleanup set next_attempt_at = now() - interval '1 second';
select is(
  (select array_agg(storage_path) from public.claim_attachment_cleanup(now() - interval '24 hours', 50, 600)),
  array['p/48300000-0000-0000-0000-000000000001/stale.pdf'],
  'once due, the entry is claimed again'
);
select is(
  public.complete_attachment_cleanup(array['p/48300000-0000-0000-0000-000000000001/stale.pdf']),
  1,
  'a successful removal completes the entry'
);
select is(
  (select count(*) from public.project_attachment_cleanup),
  0::bigint,
  'only then is the cleanup record removed'
);
select is(
  public.complete_attachment_cleanup(array['p/48300000-0000-0000-0000-000000000001/stale.pdf']),
  0,
  'completing again is a harmless no-op'
);

-- Backoff grows and is capped at a day.
insert into public.project_attachment_cleanup (storage_path, attachment_id, attempts)
values ('p/x/capped.pdf', gen_random_uuid(), 30);
select public.fail_attachment_cleanup(array['p/x/capped.pdf'], null);
select ok(
  (select next_attempt_at <= now() + interval '1440 minutes' and last_error = 'Storage removal failed.'
     from public.project_attachment_cleanup where storage_path = 'p/x/capped.pdf'),
  'the retry delay is capped at 24 hours and a missing error gets a default'
);

-- ---------- clients are locked out ---------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', '48000000-0000-0000-0000-000000000001', true);
select throws_ok(
  $$ select * from public.claim_attachment_cleanup(now(), 50, 600) $$,
  '42501', null,
  'a signed-in user cannot run the cleanup'
);
select throws_ok(
  $$ select public.complete_attachment_cleanup(array['p/x/capped.pdf']) $$,
  '42501', null,
  'a signed-in user cannot complete cleanup entries'
);
select throws_ok(
  $$ select count(*) from public.project_attachment_cleanup $$,
  '42501', null,
  'a signed-in user cannot read the cleanup queue'
);
reset role;

select * from finish();
rollback;
