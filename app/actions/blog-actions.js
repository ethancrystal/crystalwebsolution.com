'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';

import { getAuthenticatedProfile } from '@/lib/auth/require-role';
import { ROLES } from '@/lib/auth/roles.mjs';
import { validateBlogPost } from '@/lib/crm/blog-contract.mjs';
import { createClient } from '@/lib/supabase/server';

// Writes for the blog. Reads live in lib/crm/blog.js.
//
// Every mutation is gated twice on purpose: this module refuses non-admin
// callers before issuing a query, and RLS in 0035 refuses them again at the
// row. The application check exists to return a useful message; the database
// check is the one that is actually load-bearing, and it still holds if this
// file is ever bypassed.

const CANONICAL_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// Admin only, matching the write policies in 0035 and the fact that
// middleware.js makes /admin/* reachable by the admin role alone. Checking the
// same role the database checks means a project_manager gets this module's
// permission message instead of an opaque RLS rejection from Postgres.
const AUTHOR_ROLES = [ROLES.ADMIN];

// 23505 is unique_violation — for this table that can only be the slug index,
// which is a user-fixable input problem rather than a server fault.
const UNIQUE_VIOLATION = '23505';

function isCanonicalUuid(value) {
  return typeof value === 'string' && CANONICAL_UUID_PATTERN.test(value);
}

function formString(formData, name) {
  const value = formData?.get(name);
  return typeof value === 'string' ? value : '';
}

function safeDatabaseCode(error) {
  const code = typeof error?.code === 'string' ? error.code : '';
  return /^[A-Z0-9_]{1,20}$/.test(code) ? code : 'UNKNOWN';
}

function databaseFailure(error, requestId, userMessage) {
  console.error({ requestId, code: safeDatabaseCode(error) });
  return { ok: false, error: userMessage, requestId };
}

function invalid(requestId, error, fieldErrors) {
  return { ok: false, error, fieldErrors: fieldErrors ?? {}, requestId };
}

function success(requestId, data) {
  return { ok: true, data, requestId };
}

async function authorProfile() {
  let authenticated;
  try {
    authenticated = await getAuthenticatedProfile();
  } catch {
    return null;
  }

  const profile = authenticated?.profile;
  if (!profile || !AUTHOR_ROLES.includes(profile.role)) return null;
  if (!isCanonicalUuid(profile.id)) return null;
  return profile;
}

// A published post is reachable at three surfaces: its own URL, the listing,
// and the sitemap. All three are revalidated together so a publish never leaves
// one of them serving a stale view of the same post.
function revalidatePostPaths(slug) {
  revalidatePath('/blog');
  revalidatePath('/sitemap.xml');
  if (slug) revalidatePath(`/blog/${slug}`);
  revalidatePath('/admin/blog');
}

function readPostForm(formData) {
  return validateBlogPost({
    title: formString(formData, 'title'),
    slug: formString(formData, 'slug'),
    body: formString(formData, 'body'),
    excerpt: formString(formData, 'excerpt'),
    seoTitle: formString(formData, 'seoTitle'),
    seoDescription: formString(formData, 'seoDescription'),
    coverImageUrl: formString(formData, 'coverImageUrl'),
    status: formString(formData, 'status') || 'draft',
  });
}

export async function createPostAction(formData) {
  const requestId = randomUUID();

  const profile = await authorProfile();
  if (!profile) return invalid(requestId, 'You do not have permission to write posts.');

  const validation = readPostForm(formData);
  if (!validation.ok) {
    return invalid(requestId, 'Fix the highlighted fields.', validation.errors);
  }

  let supabase;
  try {
    supabase = await createClient();
  } catch (error) {
    return databaseFailure(error, requestId, 'Could not reach the database.');
  }

  // published_at is left to the trigger rather than set here, so the timestamp
  // comes from the database clock and cannot drift with the app server's.
  const { data, error } = await supabase
    .from('blog_posts')
    .insert({ ...validation.value, author_id: profile.id })
    .select('id, slug')
    .single();

  if (error) {
    if (safeDatabaseCode(error) === UNIQUE_VIOLATION) {
      return invalid(requestId, 'That slug is already taken.', {
        slug: 'A post with this slug already exists.',
      });
    }
    return databaseFailure(error, requestId, 'Could not save the post.');
  }

  revalidatePostPaths(data.slug);
  return success(requestId, { id: data.id, slug: data.slug });
}

export async function updatePostAction(formData) {
  const requestId = randomUUID();

  const profile = await authorProfile();
  if (!profile) return invalid(requestId, 'You do not have permission to edit posts.');

  const id = formString(formData, 'id');
  if (!isCanonicalUuid(id)) return invalid(requestId, 'That post could not be found.');

  const validation = readPostForm(formData);
  if (!validation.ok) {
    return invalid(requestId, 'Fix the highlighted fields.', validation.errors);
  }

  let supabase;
  try {
    supabase = await createClient();
  } catch (error) {
    return databaseFailure(error, requestId, 'Could not reach the database.');
  }

  // Read the old slug first: if this edit renames the post, the previous URL
  // needs revalidating too or it keeps serving the old copy from cache.
  const { data: existing } = await supabase
    .from('blog_posts')
    .select('slug')
    .eq('id', id)
    .maybeSingle();

  const { data, error } = await supabase
    .from('blog_posts')
    .update(validation.value)
    .eq('id', id)
    .select('id, slug')
    .single();

  if (error) {
    if (safeDatabaseCode(error) === UNIQUE_VIOLATION) {
      return invalid(requestId, 'That slug is already taken.', {
        slug: 'A post with this slug already exists.',
      });
    }
    return databaseFailure(error, requestId, 'Could not save the post.');
  }

  revalidatePostPaths(data.slug);
  if (existing?.slug && existing.slug !== data.slug) {
    revalidatePath(`/blog/${existing.slug}`);
  }

  return success(requestId, { id: data.id, slug: data.slug });
}

/**
 * Flips publish state. Separate from updatePostAction so the listing can offer
 * a one-click publish/unpublish without round-tripping the whole post body
 * through a form — and so a publish cannot silently carry an unsaved body edit.
 */
export async function setPostStatusAction(formData) {
  const requestId = randomUUID();

  const profile = await authorProfile();
  if (!profile) return invalid(requestId, 'You do not have permission to publish posts.');

  const id = formString(formData, 'id');
  if (!isCanonicalUuid(id)) return invalid(requestId, 'That post could not be found.');

  const status = formString(formData, 'status');
  if (status !== 'draft' && status !== 'published') {
    return invalid(requestId, 'Unknown post status.');
  }

  let supabase;
  try {
    supabase = await createClient();
  } catch (error) {
    return databaseFailure(error, requestId, 'Could not reach the database.');
  }

  const { data, error } = await supabase
    .from('blog_posts')
    .update({ status })
    .eq('id', id)
    .select('id, slug, status')
    .single();

  if (error) return databaseFailure(error, requestId, 'Could not update the post.');

  revalidatePostPaths(data.slug);
  return success(requestId, { id: data.id, slug: data.slug, status: data.status });
}

export async function deletePostAction(formData) {
  const requestId = randomUUID();

  const profile = await authorProfile();
  if (!profile) return invalid(requestId, 'You do not have permission to delete posts.');

  const id = formString(formData, 'id');
  if (!isCanonicalUuid(id)) return invalid(requestId, 'That post could not be found.');

  let supabase;
  try {
    supabase = await createClient();
  } catch (error) {
    return databaseFailure(error, requestId, 'Could not reach the database.');
  }

  const { data, error } = await supabase
    .from('blog_posts')
    .delete()
    .eq('id', id)
    .select('slug')
    .maybeSingle();

  if (error) return databaseFailure(error, requestId, 'Could not delete the post.');

  revalidatePostPaths(data?.slug);
  return success(requestId, { deleted: true });
}
