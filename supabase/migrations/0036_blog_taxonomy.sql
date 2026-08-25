-- Reconcile live migration 20260820063550 (0036_blog_taxonomy).
--
-- The live project already contains these additive blog fields. The guards make
-- this migration safe to record in source control and safe to apply to a clean
-- database or to a database where the live change was previously applied under
-- its timestamped migration name. No application code is changed here; the
-- current blog contract can continue ignoring these nullable/additive fields.

begin;

alter table public.blog_posts
  add column if not exists category text,
  add column if not exists tags text[] not null default '{}'::text[],
  add column if not exists author_name text;

create or replace function public.blog_tags_are_valid(tags text[])
returns boolean
language sql
immutable
set search_path to 'pg_catalog', 'public'
as $function$
  select
    cardinality(tags) <= 8
    and cardinality(tags) = (
      select count(distinct tag)
      from unnest(tags) as tag
    )
    and not exists (
      select 1
      from unnest(tags) as tag
      where tag !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
         or char_length(tag) > 40
    );
$function$;

revoke all on function public.blog_tags_are_valid(text[]) from public, anon;
grant execute on function public.blog_tags_are_valid(text[]) to authenticated;

do $guard$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.blog_posts'::regclass
      and conname = 'blog_posts_category_format_check'
  ) then
    alter table public.blog_posts
      add constraint blog_posts_category_format_check
      check (
        category is null
        or (
          category ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
          and char_length(category) between 1 and 40
        )
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.blog_posts'::regclass
      and conname = 'blog_posts_author_name_length_check'
  ) then
    alter table public.blog_posts
      add constraint blog_posts_author_name_length_check
      check (
        author_name is null
        or char_length(btrim(author_name)) between 1 and 80
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.blog_posts'::regclass
      and conname = 'blog_posts_tags_check'
  ) then
    alter table public.blog_posts
      add constraint blog_posts_tags_check
      check (public.blog_tags_are_valid(tags));
  end if;
end
$guard$;

create index if not exists idx_blog_posts_category_published
  on public.blog_posts (category, published_at desc)
  where status = 'published' and category is not null;

create index if not exists idx_blog_posts_tags
  on public.blog_posts using gin (tags);

commit;
