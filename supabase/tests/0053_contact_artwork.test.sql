begin;

create extension if not exists pgtap with schema extensions;
select plan(34);

-- Behavioural proof for 0053_contact_artwork.sql. Same fixture idiom as
-- 0043_project_briefs.test.sql: stable UUIDs, and the admin row uses
-- pinned_admin_email() so 0014's single-admin trigger accepts it.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('00000000-0000-0000-0000-000000000000', '53000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', public.pinned_admin_email(), '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '53000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'client-53@example.test', '', now(), '{}', '{}', now(), now());

update public.profiles
set role = case id
  when '53000000-0000-0000-0000-000000000001' then 'admin'::public.user_role
  else 'client'::public.user_role
end
where id in ('53000000-0000-0000-0000-000000000001', '53000000-0000-0000-0000-000000000002');

-- ---------- bucket ----------
select ok(
  (select not public and file_size_limit = 10485760
          and allowed_mime_types @> array['application/pdf', 'image/png', 'image/jpeg', 'application/octet-stream']
     from storage.buckets where id = 'contact-artwork'),
  'the contact-artwork bucket is private, capped at 10 MB, and limited to the upload MIME types'
);

-- ---------- grants ----------
select ok(
  not has_function_privilege('anon', 'public.reserve_contact_artwork(uuid, uuid, jsonb)', 'execute')
  and not has_function_privilege('authenticated', 'public.reserve_contact_artwork(uuid, uuid, jsonb)', 'execute'),
  'reserve_contact_artwork is not executable by anon or authenticated'
);
select ok(
  not has_function_privilege('anon', 'public.attach_contact_artwork(uuid, uuid, jsonb)', 'execute')
  and not has_function_privilege('authenticated', 'public.attach_contact_artwork(uuid, uuid, jsonb)', 'execute'),
  'attach_contact_artwork is not executable by anon or authenticated'
);
select ok(
  not has_function_privilege('anon', 'public.create_lead_from_contact(text, text, text, text, text, text)', 'execute')
  and not has_function_privilege('authenticated', 'public.create_lead_from_contact(text, text, text, text, text, text)', 'execute'),
  'create_lead_from_contact stays service-role only after the redefinition'
);
select ok(
  not has_table_privilege('anon', 'public.contact_artwork', 'select')
  and not has_table_privilege('authenticated', 'public.contact_artwork', 'insert')
  and not has_table_privilege('authenticated', 'public.contact_artwork', 'update')
  and not has_table_privilege('authenticated', 'public.contact_artwork', 'delete'),
  'contact_artwork has no anon access and no client writes'
);

-- ---------- deal title by source ----------
select is(
  (select public.create_lead_from_contact(
     'Pat Brief', 'pat-brief-53@example.test', 'Brief Co', 'A website.', '$5–15k', 'website_contact_form') ->> 'lead_created'),
  'true',
  'a web brief still creates a lead'
);
select is(
  (select title from public.deals where title like '%Brief Co'),
  'Website inquiry — Brief Co',
  'a web brief keeps the "Website inquiry" deal title'
);

select is(
  (select public.create_lead_from_contact(
     'Jordan Reyes', 'jordan-53@example.test', 'Patch Shop', E'Production request: Custom patches\nSize: 3 in', null, 'website_production_request') ->> 'lead_created'),
  'true',
  'a production request creates a lead'
);
select is(
  (select title from public.deals where title like '%Patch Shop'),
  'Production request — Patch Shop',
  'a production request is titled by its source'
);
select is(
  (select description from public.deals where title = 'Production request — Patch Shop'),
  E'Production request: Custom patches\nSize: 3 in',
  'an empty budget leaves just the composed brief as the description'
);

create temporary table lead as
  select (public.create_lead_from_contact(
    'Jordan Reyes', 'jordan-53@example.test', 'Patch Shop', 'Second request.', null, 'website_production_request') ->> 'deal_id')::uuid as deal_id;

select is(
  (select count(*) from public.deals where title = 'Production request — Patch Shop'),
  1::bigint,
  'a repeat production request lands on the open deal instead of creating a second one'
);

-- ---------- reserve_contact_artwork ----------
select throws_ok(
  $$ select public.reserve_contact_artwork(gen_random_uuid(), gen_random_uuid(), '[{"name":"a.png","size":10}]') $$,
  'P0002', null,
  'reserving for an unknown deal is refused'
);
select throws_ok(
  format($$ select public.reserve_contact_artwork(%L, gen_random_uuid(), '[]') $$, (select deal_id from lead)),
  '22023', null,
  'an empty file list is refused'
);
select throws_ok(
  format($$ select public.reserve_contact_artwork(%L, gen_random_uuid(),
    '[{"name":"a.png","size":1},{"name":"b.png","size":1},{"name":"c.png","size":1},{"name":"d.png","size":1}]') $$,
    (select deal_id from lead)),
  '22023', null,
  'more than three files are refused'
);
select throws_ok(
  format($$ select public.reserve_contact_artwork(%L, gen_random_uuid(), '[{"name":"virus.exe","size":10}]') $$,
    (select deal_id from lead)),
  '22023', null,
  'an extension outside the allowlist is refused'
);
select throws_ok(
  format($$ select public.reserve_contact_artwork(%L, gen_random_uuid(), '[{"name":"big.pdf","size":10485761}]') $$,
    (select deal_id from lead)),
  '22023', null,
  'a file over 10 MB is refused'
);
select throws_ok(
  format($$ select public.reserve_contact_artwork(%L, gen_random_uuid(),
    '[{"name":"a.pdf","size":10485760},{"name":"b.pdf","size":10485760},{"name":"c.pdf","size":10485760}]') $$,
    (select deal_id from lead)),
  '22023', null,
  'files over 25 MB together are refused'
);

create temporary table slots as
  select public.reserve_contact_artwork(
    (select deal_id from lead),
    '53000000-0000-0000-0000-0000000000aa',
    '[{"name":"..\\..\\logo final (v2).AI","size":2048},{"name":"stitch.dst","size":900},{"name":"photo.JPEG","size":5000}]'
  ) as result;

select is(
  (select jsonb_array_length(result) from slots),
  3,
  'three files reserve three slots'
);
select ok(
  (select bool_and(
            (s ->> 'path') ~ ('^' || (select deal_id::text from lead) || '/53000000-0000-0000-0000-0000000000aa/[1-3]-[A-Za-z0-9._-]+$'))
     from slots, jsonb_array_elements(result) s),
  'every storage path is deal/submission/index-name with only safe characters'
);
select is(
  (select result -> 0 ->> 'name' from slots),
  'logo final (v2).AI',
  'the display name drops path segments but keeps the readable name'
);
select is(
  (select array_agg(s ->> 'content_type' order by ord)
     from slots, jsonb_array_elements(result) with ordinality as t(s, ord)),
  array['application/illustrator', 'application/octet-stream', 'image/jpeg'],
  'the content type comes from the extension, case-insensitively'
);
select is(
  (select count(*) from public.contact_artwork where status = 'pending'),
  3::bigint,
  'reserved rows start pending'
);

-- ---------- attach_contact_artwork ----------
create temporary table attached_once as
  select public.attach_contact_artwork(
    (select deal_id from lead),
    '53000000-0000-0000-0000-0000000000aa',
    jsonb_build_array(jsonb_build_object('storage_path', (select result -> 0 ->> 'path' from slots), 'size_bytes', 2048),
                      jsonb_build_object('storage_path', (select result -> 2 ->> 'path' from slots), 'size_bytes', 5000))
  ) as result;

select is(
  (select (result ->> 'attached')::int from attached_once),
  2,
  'the two verified uploads are attached'
);
select is(
  (select result -> 'removed_paths' from attached_once),
  jsonb_build_array((select result -> 1 ->> 'path' from slots)),
  'the unverified reservation is dropped and its path returned for removal'
);
select is(
  (select count(*) from public.notes where deal_id = (select deal_id from lead) and content like 'Artwork uploaded with the production request:%'),
  1::bigint,
  'one internal note records the attached files'
);

select is(
  (select (public.attach_contact_artwork(
            (select deal_id from lead),
            '53000000-0000-0000-0000-0000000000aa',
            '[]'::jsonb) ->> 'attached')::int),
  2,
  'a repeat completion is idempotent and still reports the attached files'
);
select is(
  (select count(*) from public.notes where deal_id = (select deal_id from lead) and content like 'Artwork uploaded with the production request:%'),
  1::bigint,
  'a repeat completion does not add a second note'
);

-- ---------- object-removal queue ----------
select is(
  (select array_agg(storage_path) from public.contact_artwork_removals),
  array[(select result -> 1 ->> 'path' from slots)],
  'the reservation dropped at completion is queued for object removal'
);

-- ---------- RLS ----------
insert into public.contact_artwork (deal_id, submission_id, storage_path, original_name, content_type, declared_size_bytes)
values ((select deal_id from lead), '53000000-0000-0000-0000-0000000000bb',
        'pending-only/path.png', 'pending.png', 'image/png', 10);

set local role authenticated;

select set_config('request.jwt.claim.sub', '53000000-0000-0000-0000-000000000002', true);
select is(
  (select count(*) from public.contact_artwork),
  0::bigint,
  'a client sees no contact artwork'
);

select set_config('request.jwt.claim.sub', '53000000-0000-0000-0000-000000000001', true);
select is(
  (select count(*) from public.contact_artwork),
  2::bigint,
  'the admin sees attached artwork only, never a pending reservation'
);

reset role;

-- ---------- cascade ----------
delete from public.deals where id = (select deal_id from lead);
select is(
  (select count(*) from public.contact_artwork),
  0::bigint,
  'deleting the deal removes its artwork rows'
);
select is(
  (select count(*) from public.contact_artwork_removals),
  4::bigint,
  'deleting the deal queues every artwork path for object removal, attached or pending'
);
select ok(
  exists (select 1 from public.contact_artwork_removals where storage_path = 'pending-only/path.png'),
  'including a reservation that never completed'
);
select ok(
  not has_table_privilege('anon', 'public.contact_artwork_removals', 'select')
  and not has_table_privilege('authenticated', 'public.contact_artwork_removals', 'select')
  and not has_table_privilege('authenticated', 'public.contact_artwork_removals', 'insert')
  and not has_table_privilege('authenticated', 'public.contact_artwork_removals', 'delete')
  and not has_function_privilege('authenticated', 'public.queue_contact_artwork_removal()', 'execute'),
  'the removal queue and its trigger function are service-role only'
);

select * from finish();
rollback;
