-- Reconcile live migration 20260821234114 (0037_blog_posts_anon_write_revoke).
--
-- Anonymous visitors need SELECT for published blog posts, but must not retain
-- table or helper-function write/execute privileges. The statements are
-- idempotent and preserve the existing authenticated/admin RLS contract.

begin;

revoke all on table public.blog_posts from anon;
grant select on table public.blog_posts to anon;

-- The helper is used by the table CHECK constraint, not by anonymous callers.
revoke all on function public.blog_tags_are_valid(text[]) from anon;

commit;
