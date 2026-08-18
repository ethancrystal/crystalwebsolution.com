-- 0035_blog_posts.sql
--
-- Adds the blog: a Supabase-backed content table read by the public marketing
-- routes (/blog, /blog/[slug]) and written through the admin authoring UI at
-- /admin/blog. Additive to everything before it - never edit an applied
-- migration in place.
--
-- Why a table rather than MDX files in the repo: the blog needs an authoring
-- interface, and file-backed posts would make "publish" mean "commit + wait for
-- a production deploy". Supabase is already this repo's CRM boundary (auth,
-- roles, RLS), so the existing role helpers already answer "who may publish"
-- without a new dependency or a second set of credentials.
--
-- Four things worth calling out about the RLS design below:
--
-- 1. The public read policy is scoped `TO anon, authenticated` and the staff
--    read policy `TO authenticated`, rather than a single policy OR-ing them
--    together. This is load-bearing, not style. A policy calls its functions
--    with the *querying* role's privileges, and 0008 revoked the role helpers
--    from PUBLIC — so a single merged policy would make an anonymous visitor
--    evaluate a staff-role check it has no EXECUTE on, and the blog would fail
--    closed with "permission denied" instead of rendering. Postgres does not
--    guarantee OR short-circuit order across permissive policies, so the role
--    scoping is what keeps anon off that code path entirely. Permissive
--    policies are OR'd within a role, so staff still read everything via the
--    second policy. The same privilege trap is why that second policy spells
--    out is_admin() OR is_pm() instead of is_staff() — see its own comment.
--
-- 2. published_at is the visibility gate, not just metadata. The public policy
--    requires `published_at <= now()`, which makes a future timestamp a
--    scheduled post that stays invisible until its moment arrives, enforced in
--    the database rather than in a query the application must remember to
--    write correctly.
--
-- 3. Writes are admin-only, not staff-only, and that is a deliberate narrowing.
--    is_staff() would have been the obvious choice, but middleware.js routes
--    /admin/* through isRoleAllowed('admin', role), so the authoring UI is
--    reachable by the admin role alone — the CRM's portals are strictly
--    single-role. Granting INSERT/UPDATE/DELETE to project_manager would leave
--    a permission no UI can exercise and that only a direct API call could
--    reach: a gap between what the app enforces and what the database allows.
--    One rule instead. To let project managers publish later, widen these four
--    policies to is_staff() AND add a /team/blog route in the same change, so
--    the two layers keep agreeing.
--
-- 4. Drafts are invisible to everyone but staff readers, and a draft URL 404s
--    rather than 403s, so an unpublished slug cannot be confirmed by probing.

-- ---------- 1. Table ----------
CREATE TABLE public.blog_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  body TEXT NOT NULL,
  cover_image_url TEXT,
  -- Optional per-post overrides. When null the routes fall back to
  -- title/excerpt, so a post is fully indexable without ever touching these.
  seo_title TEXT,
  seo_description TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  published_at TIMESTAMP WITH TIME ZONE,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Bounds mirror lib/crm/blog-contract.mjs so the application and the database
-- agree on what a valid post is. The slug pattern is the URL contract for
-- /blog/[slug]: lowercase alphanumeric words joined by single hyphens, no
-- leading/trailing/doubled hyphens, so a slug can never need escaping.
ALTER TABLE public.blog_posts
  ADD CONSTRAINT blog_posts_slug_format_check
  CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(slug) BETWEEN 1 AND 80);

ALTER TABLE public.blog_posts
  ADD CONSTRAINT blog_posts_title_length_check
  CHECK (char_length(btrim(title)) BETWEEN 1 AND 200);

ALTER TABLE public.blog_posts
  ADD CONSTRAINT blog_posts_excerpt_length_check
  CHECK (excerpt IS NULL OR char_length(excerpt) <= 320);

ALTER TABLE public.blog_posts
  ADD CONSTRAINT blog_posts_body_length_check
  CHECK (char_length(btrim(body)) BETWEEN 1 AND 100000);

ALTER TABLE public.blog_posts
  ADD CONSTRAINT blog_posts_seo_title_length_check
  CHECK (seo_title IS NULL OR char_length(seo_title) <= 70);

ALTER TABLE public.blog_posts
  ADD CONSTRAINT blog_posts_seo_description_length_check
  CHECK (seo_description IS NULL OR char_length(seo_description) <= 200);

ALTER TABLE public.blog_posts
  ADD CONSTRAINT blog_posts_status_check
  CHECK (status IN ('draft', 'published'));

-- A published post must carry a timestamp; a draft must not. The trigger below
-- maintains this automatically, but the constraint means no other writer (a
-- future RPC, a manual psql session) can leave the pair inconsistent and
-- silently drop a post out of the public policy's WHERE clause.
ALTER TABLE public.blog_posts
  ADD CONSTRAINT blog_posts_published_at_consistency_check
  CHECK (
    (status = 'published' AND published_at IS NOT NULL)
    OR (status = 'draft' AND published_at IS NULL)
  );

-- The slug is the public URL; uniqueness is the routing invariant.
CREATE UNIQUE INDEX blog_posts_slug_unique_idx ON public.blog_posts (slug);

-- Backs the listing query: published posts, newest first.
CREATE INDEX idx_blog_posts_published
  ON public.blog_posts (published_at DESC)
  WHERE status = 'published';

-- ---------- 2. Timestamps and publish-state maintenance ----------
CREATE OR REPLACE FUNCTION public.blog_posts_maintain_timestamps()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  NEW.updated_at := NOW();

  IF NEW.status = 'published' AND NEW.published_at IS NULL THEN
    NEW.published_at := NOW();
  ELSIF NEW.status = 'draft' THEN
    -- Unpublishing clears the timestamp so re-publishing later reads as a new
    -- date rather than resurrecting the original one.
    NEW.published_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER blog_posts_maintain_timestamps_trigger
  BEFORE INSERT OR UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.blog_posts_maintain_timestamps();

REVOKE ALL ON FUNCTION public.blog_posts_maintain_timestamps() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.blog_posts_maintain_timestamps() FROM anon;
REVOKE ALL ON FUNCTION public.blog_posts_maintain_timestamps() FROM authenticated;

-- ---------- 3. Row level security ----------
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Anonymous visitors and signed-in users alike see published posts only.
-- Deliberately does not reference is_staff(); see header note 1.
CREATE POLICY "Anyone can read published posts" ON public.blog_posts
  FOR SELECT TO anon, authenticated
  USING (
    status = 'published'
    AND published_at IS NOT NULL
    AND published_at <= NOW()
  );

-- Staff additionally see drafts and scheduled posts (permissive policies OR).
--
-- Spelled out as is_admin() OR is_pm() rather than the equivalent is_staff(),
-- because a policy calls its functions with the *querying* role's privileges
-- and `authenticated` has no EXECUTE on is_staff(): 0008 revoked it from PUBLIC
-- and granted back only current_profile_role(), is_admin(), is_pm() and
-- is_company_member() — is_staff() was left out. Every other CRM policy avoids
-- this by calling a SECURITY DEFINER wrapper (private.can_access_project),
-- whose inner role lookup runs as the definer; this table has no such wrapper.
-- Verified against the local stack: with is_staff() here, ANY authenticated
-- read of blog_posts fails with "permission denied for function is_staff",
-- which would have taken the blog down for every signed-in visitor.
-- is_staff() is defined as exactly this disjunction, so behavior is identical,
-- and this adds no new function grant — 0027 is actively narrowing which
-- helpers the API roles may execute, so widening one here would cut against it.
CREATE POLICY "Staff can read every post" ON public.blog_posts
  FOR SELECT TO authenticated
  USING (public.is_admin() OR public.is_pm());

CREATE POLICY "Admin can create posts" ON public.blog_posts
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin can update posts" ON public.blog_posts
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin can delete posts" ON public.blog_posts
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- ---------- 4. Grants ----------
-- RLS does the real gating; these are the coarse table privileges it filters.
-- anon gets SELECT only, so an anonymous session cannot even attempt a write.
GRANT SELECT ON public.blog_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_posts TO authenticated;
