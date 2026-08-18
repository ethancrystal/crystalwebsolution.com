-- Behavioral verification of 0035_blog_posts.sql against a real Postgres.
--
-- The Node tests for this feature read the migration as text: they prove the
-- policies are *written* as intended, not that Postgres *enforces* them that
-- way. This file is the half that actually matters for security — every
-- assertion below runs as a real role with RLS on.
--
-- Note on the admin fixture: 0014 pins the admin role to a single address via
-- enforce_pinned_admin() plus a one-row unique index, so the admin user here
-- must use pinned_admin_email() or the role update raises.

begin;

create extension if not exists pgtap with schema extensions;
select plan(31);

-- ---------- Fixtures ----------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'blog-client@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'blog-pm@example.test', '', now(), '{}', '{}', now(), now()),
  -- Must match public.pinned_admin_email() or 0014's trigger rejects the role.
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'ethan@crystalwebsolution.com', '', now(), '{}', '{}', now(), now());

update public.profiles
set role = case id
  when 'a0000000-0000-0000-0000-000000000002' then 'project_manager'::public.user_role
  when 'a0000000-0000-0000-0000-000000000003' then 'admin'::public.user_role
  else 'client'::public.user_role
end
where id in (
  'a0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000003'
);

-- Seeded as the table owner so RLS does not gate the fixture itself.
insert into public.blog_posts (id, slug, title, body, status, published_at, author_id)
values
  ('b0000000-0000-0000-0000-000000000001', 'published-post', 'Published Post', 'Body copy.', 'published', now() - interval '1 day', 'a0000000-0000-0000-0000-000000000003'),
  ('b0000000-0000-0000-0000-000000000002', 'draft-post', 'Draft Post', 'Draft body.', 'draft', null, 'a0000000-0000-0000-0000-000000000003'),
  -- Scheduled: published status, but the timestamp has not arrived yet.
  ('b0000000-0000-0000-0000-000000000003', 'future-post', 'Future Post', 'Future body.', 'published', now() + interval '7 days', 'a0000000-0000-0000-0000-000000000003');

-- ---------- 1. Structure ----------
select has_table('public', 'blog_posts', 'blog_posts table exists');
select ok(
  (select relrowsecurity from pg_class where oid = 'public.blog_posts'::regclass),
  'row level security is enabled on blog_posts'
);

-- ---------- 2. Anonymous visitors ----------
set local role anon;

select is(
  (select count(*) from public.blog_posts),
  1::bigint,
  'anon sees only the one already-published post'
);

select is(
  (select count(*) from public.blog_posts where slug = 'draft-post'),
  0::bigint,
  'anon cannot see a draft'
);

select is(
  (select count(*) from public.blog_posts where slug = 'future-post'),
  0::bigint,
  'anon cannot see a scheduled post before its published_at'
);

-- The whole reason the public policy is role-scoped instead of OR-ing
-- is_staff(): anon has no EXECUTE on that function (revoked in 0008), so a
-- policy calling it would raise permission denied instead of returning rows.
select lives_ok(
  $$ select count(*) from public.blog_posts $$,
  'anon can query blog_posts without hitting a permission-denied function'
);

select throws_ok(
  $$ insert into public.blog_posts (slug, title, body) values ('anon-post', 'Anon', 'Body.') $$,
  '42501',
  null,
  'anon cannot insert a post'
);

select throws_ok(
  $$ update public.blog_posts set title = 'Hacked' where slug = 'published-post' $$,
  '42501',
  null,
  'anon cannot update a post'
);

select throws_ok(
  $$ delete from public.blog_posts where slug = 'published-post' $$,
  '42501',
  null,
  'anon cannot delete a post'
);

reset role;

-- ---------- 3. Signed-in client ----------
set local role authenticated;
select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000001', true);

select is(
  (select count(*) from public.blog_posts),
  1::bigint,
  'a client sees only published posts, exactly like anon'
);

select is(
  (select count(*) from public.blog_posts where slug = 'draft-post'),
  0::bigint,
  'a client cannot see drafts'
);

select is(
  (select count(*) from public.blog_posts where status = 'draft'),
  0::bigint,
  'no draft is reachable by a client under any predicate'
);

-- ---------- 4. Project manager: reads drafts, cannot write ----------
select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000002', true);

select is(
  (select count(*) from public.blog_posts),
  3::bigint,
  'a project manager reads every post including drafts and scheduled'
);

-- This is the narrowing documented in the migration header: writes are
-- admin-only because /admin/* is admin-only, so a PM has no write path.
select throws_ok(
  $$ insert into public.blog_posts (slug, title, body) values ('pm-post', 'PM Post', 'Body.') $$,
  '42501',
  null,
  'a project manager cannot create a post'
);

-- RLS-blocked UPDATE/DELETE do not raise: the USING clause filters the rows out
-- so the statement simply matches nothing. Counting affected rows is the only
-- way to assert this. A data-modifying statement must sit in a CTE, not a
-- subquery, hence the WITH form.
with attempted_update as (
  update public.blog_posts set title = 'PM Edit' where slug = 'published-post' returning 1
)
select is(
  (select count(*) from attempted_update),
  0::bigint,
  'a project manager update matches no row (RLS USING filters it out)'
);

with attempted_delete as (
  delete from public.blog_posts where slug = 'published-post' returning 1
)
select is(
  (select count(*) from attempted_delete),
  0::bigint,
  'a project manager delete removes nothing'
);

-- ---------- 5. Admin: full control ----------
select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000003', true);

select is(
  (select count(*) from public.blog_posts),
  3::bigint,
  'the admin reads every post'
);

select lives_ok(
  $$ insert into public.blog_posts (slug, title, body) values ('admin-post', 'Admin Post', 'Body.') $$,
  'the admin can create a post'
);

select lives_ok(
  $$ update public.blog_posts set title = 'Admin Edit' where slug = 'admin-post' $$,
  'the admin can update a post'
);

-- ---------- 6. Publish trigger ----------
select is(
  (select published_at from public.blog_posts where slug = 'admin-post'),
  null,
  'a new draft carries no published_at'
);

update public.blog_posts set status = 'published' where slug = 'admin-post';
select isnt(
  (select published_at from public.blog_posts where slug = 'admin-post'),
  null,
  'publishing stamps published_at from the database clock'
);

update public.blog_posts set status = 'draft' where slug = 'admin-post';
select is(
  (select published_at from public.blog_posts where slug = 'admin-post'),
  null,
  'unpublishing clears published_at so a re-publish reads as a new date'
);

-- ---------- 7. Constraints ----------
select throws_ok(
  $$ insert into public.blog_posts (slug, title, body) values ('published-post', 'Duplicate', 'Body.') $$,
  '23505',
  null,
  'a duplicate slug is rejected by the unique index'
);

select throws_ok(
  $$ insert into public.blog_posts (slug, title, body) values ('Bad Slug!', 'Bad', 'Body.') $$,
  '23514',
  null,
  'a malformed slug is rejected by the format check'
);

select throws_ok(
  $$ insert into public.blog_posts (slug, title, body) values ('-leading', 'Bad', 'Body.') $$,
  '23514',
  null,
  'a leading hyphen is rejected'
);

select throws_ok(
  $$ insert into public.blog_posts (slug, title, body, status) values ('bad-status', 'Bad', 'Body.', 'archived') $$,
  '23514',
  null,
  'an unknown status is rejected'
);

select throws_ok(
  $$ insert into public.blog_posts (slug, title, body) values ('empty-title', '   ', 'Body.') $$,
  '23514',
  null,
  'a whitespace-only title is rejected'
);

-- Clearing published_at on a live post does NOT raise: the BEFORE trigger fires
-- first and restamps it, so the consistency constraint is never reached by this
-- path. The constraint still backstops writers that bypass the trigger. What
-- matters for the public policy is that the post cannot end up published with a
-- null timestamp, and it cannot.
update public.blog_posts set published_at = null where slug = 'published-post';
select isnt(
  (select published_at from public.blog_posts where slug = 'published-post'),
  null,
  'clearing published_at on a published post is repaired by the trigger, not left inconsistent'
);

select throws_ok(
  $$ insert into public.blog_posts (slug, title, body, seo_title) values ('long-seo', 'T', 'Body.', repeat('a', 71)) $$,
  '23514',
  null,
  'an over-length SEO title is rejected at the column bound'
);

reset role;

-- ---------- 8. Grants ----------
select ok(
  not has_table_privilege('anon', 'public.blog_posts', 'INSERT'),
  'anon holds no INSERT privilege on blog_posts'
);

select ok(
  has_table_privilege('anon', 'public.blog_posts', 'SELECT'),
  'anon holds SELECT so the public blog can render'
);

select * from finish();
rollback;
