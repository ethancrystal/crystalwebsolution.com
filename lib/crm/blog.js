import { createClient as createSupabaseClient } from '@supabase/supabase-js';

import { createClient } from '@/lib/supabase/server';

// Read model for blog posts. Public routes call the listing/detail readers with
// an anonymous server client; the authoring UI calls the staff readers with the
// signed-in user's client.
//
// Nothing here re-checks who may see a draft. RLS in 0035 already scopes SELECT
// by role — an anonymous client physically cannot read an unpublished row — so
// duplicating that gate in JavaScript would create a second, drift-prone copy
// of the rule. What these functions add is shape: a stable field list and a
// consistent return contract.

const POST_FIELDS = [
  'id',
  'slug',
  'title',
  'excerpt',
  'body',
  'cover_image_url',
  'seo_title',
  'seo_description',
  'status',
  'published_at',
  'author_id',
  'created_at',
  'updated_at',
].join(', ');

// The listing never needs the full body; omitting it keeps the payload small
// when a post runs to 100k characters.
const SUMMARY_FIELDS = [
  'id',
  'slug',
  'title',
  'excerpt',
  'cover_image_url',
  'status',
  'published_at',
  'updated_at',
].join(', ');

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function boundedLimit(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
}

// Supabase errors carry message text that can include query fragments. Log the
// code, return a generic failure, and let the caller decide what the reader
// sees — the same posture as app/actions/project-actions.js.
function readFailure(error, context) {
  const code = typeof error?.code === 'string' ? error.code : 'UNKNOWN';
  console.error({ context, code });
  return null;
}

/**
 * Returns a server client, or null when Supabase is not configured.
 *
 * /blog is a public marketing route, so it renders on deployments that may not
 * carry Supabase credentials at all. createServerClient throws on an undefined
 * URL, which would turn a missing env var into a 500 on a public page; callers
 * treat null as "no posts" and render the empty state instead.
 */
async function optionalClient(context) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null;
  }

  try {
    return await createClient();
  } catch (error) {
    return readFailure(error, context);
  }
}

/**
 * A cookieless anonymous client for reads that are identical for every visitor.
 *
 * The cookie-bound server client calls next/headers `cookies()`, which is a
 * dynamic API: any route touching it opts out of static rendering. That is the
 * right trade for the post pages, but it silently turned /sitemap.xml from a
 * static file into a per-request render — and a sitemap has no per-user content
 * to justify that, since published posts are exactly what `anon` may read.
 *
 * Using the plain client keeps such routes cacheable; the publish actions call
 * revalidatePath so they still refresh the moment a post goes live.
 */
function publicClient(context) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  try {
    return createSupabaseClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  } catch (error) {
    return readFailure(error, context);
  }
}

/**
 * Published posts, newest first, for the public /blog listing.
 * Returns [] on failure so the page renders an empty state rather than a 500.
 */
export async function listPublishedPosts({ limit } = {}) {
  const supabase = await optionalClient('listPublishedPosts');
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('blog_posts')
    .select(SUMMARY_FIELDS)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(boundedLimit(limit));

  if (error) {
    readFailure(error, 'listPublishedPosts');
    return [];
  }

  return data ?? [];
}

/**
 * One published post by slug, for /blog/[slug]. Returns null when the slug does
 * not exist OR when it exists but is a draft — the caller turns both into the
 * same notFound(), so an unpublished URL is indistinguishable from a typo and
 * draft slugs cannot be probed.
 */
export async function getPublishedPost(slug) {
  if (typeof slug !== 'string' || !slug) return null;

  const supabase = await optionalClient('getPublishedPost');
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('blog_posts')
    .select(POST_FIELDS)
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();

  if (error) return readFailure(error, 'getPublishedPost');
  return data ?? null;
}

/** Every published slug, for sitemap generation. */
export async function listPublishedSlugs() {
  const supabase = publicClient('listPublishedSlugs');
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('blog_posts')
    .select('slug, published_at, updated_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(MAX_LIMIT);

  if (error) {
    readFailure(error, 'listPublishedSlugs');
    return [];
  }

  return data ?? [];
}

/**
 * Every post including drafts, for the authoring UI. RLS returns only what the
 * caller may see, so a non-staff session gets the published subset rather than
 * an error — the /admin route guard is what actually keeps clients out.
 */
export async function listAllPosts({ limit } = {}) {
  const supabase = await optionalClient('listAllPosts');
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('blog_posts')
    .select(SUMMARY_FIELDS)
    .order('updated_at', { ascending: false })
    .limit(boundedLimit(limit));

  if (error) {
    readFailure(error, 'listAllPosts');
    return [];
  }

  return data ?? [];
}

/** One post by id regardless of status, for the edit form. */
export async function getPostById(id) {
  if (typeof id !== 'string' || !id) return null;

  const supabase = await optionalClient('getPostById');
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('blog_posts')
    .select(POST_FIELDS)
    .eq('id', id)
    .maybeSingle();

  if (error) return readFailure(error, 'getPostById');
  return data ?? null;
}
