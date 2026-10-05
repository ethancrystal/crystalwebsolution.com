-- 0044_blog_post_cover_image_alt.sql
--
-- Alt text for the blog post cover image, managed in the CMS alongside
-- cover_image_url. The cover is currently consumed only as the og/twitter
-- share image and in the BlogPosting schema (there is no visible <img> on the
-- page yet), but the accessible name belongs to the row so it survives any
-- future template that renders the cover inline.
--
-- Nullable and unbounded by the database: the application contract caps the
-- length, so editorial guidance can change without another migration.

alter table public.blog_posts
  add column if not exists cover_image_alt text;
