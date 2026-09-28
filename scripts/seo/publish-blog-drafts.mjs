#!/usr/bin/env node
// Upserts approved blog drafts from docs/seo/drafts/blog/*.md into the
// blog_posts table as status: draft, uploading cover images to Supabase
// Storage on the way. Runs from .github/workflows/seo-publish-blog.yml on
// every push to main that touches the drafts directory.
//
// Deliberate limits, all decided by MJ on 2026-09-02:
//   - Rows always land as `draft`. Publishing is done in /admin/blog by a
//     person. This script has no code path that writes status: 'published'.
//   - A row that is already `published` is never overwritten. Once MJ has
//     taken a post live (and possibly edited it in the UI), the file in the
//     repo is no longer the source of truth for it.
//   - Missing credentials are a warning and exit 0, not a failure, so merging
//     drafts before the repo secrets exist does not block the merge.
//
// Usage:
//   node scripts/seo/publish-blog-drafts.mjs            # apply
//   node scripts/seo/publish-blog-drafts.mjs --dry-run  # print, write nothing
//
// Env:
//   SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL   project URL
//   SUPABASE_SERVICE_ROLE_KEY                  service role (bypasses RLS)
//   SEO_BLOG_COVERS_BUCKET                     storage bucket (default: blog-covers)

import { readdir, readFile } from 'node:fs/promises';
import { basename, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createClient } from '@supabase/supabase-js';

import {
  isValidSlug,
  validateBlogPost,
} from '../../lib/crm/blog-contract.mjs';

const DRY_RUN = process.argv.includes('--dry-run');
const HERE = fileURLToPath(new URL('.', import.meta.url));
const DRAFTS_DIR = resolve(HERE, '../../docs/seo/drafts/blog');
const BUCKET = process.env.SEO_BLOG_COVERS_BUCKET || 'blog-covers';

const IMAGE_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

const log = (...args) => console.log('[seo:publish]', ...args);
const warn = (...args) => console.warn('[seo:publish]', ...args);

/**
 * Minimal front-matter parser: a leading `---` block of `key: value` lines.
 * Strings only; `true`/`false` become booleans. No lists, no nesting, no
 * quoting rules — anything more expressive is a place for a draft to smuggle
 * something the table did not ask for.
 */
function parseFrontMatter(source) {
  const text = source.replace(/\r\n?/g, '\n');
  if (!text.startsWith('---\n')) return { meta: {}, body: text };

  const end = text.indexOf('\n---', 4);
  if (end === -1) return { meta: {}, body: text };

  const block = text.slice(4, end);
  const body = text.slice(end + 4).replace(/^\n+/, '');
  const meta = {};

  for (const line of block.split('\n')) {
    const match = line.match(/^([a-z_]+):\s*(.*)$/);
    if (!match) continue;
    const [, key, raw] = match;
    const value = raw.trim();
    meta[key] = value === 'true' ? true : value === 'false' ? false : value;
  }

  return { meta, body };
}

async function loadDrafts() {
  const entries = await readdir(DRAFTS_DIR, { withFileTypes: true });
  const drafts = [];

  for (const entry of entries) {
    if (!entry.isFile() || extname(entry.name) !== '.md') continue;
    if (entry.name.toLowerCase() === 'readme.md') continue;

    const slug = basename(entry.name, '.md');
    const source = await readFile(join(DRAFTS_DIR, entry.name), 'utf8');
    const { meta, body } = parseFrontMatter(source);
    drafts.push({ file: entry.name, slug, meta, body });
  }

  return drafts;
}

function checkDraft({ file, slug, meta, body }) {
  const problems = [];

  if (!isValidSlug(slug)) {
    problems.push(`filename "${file}" is not a valid slug`);
  }
  if (meta.approved !== true) {
    return { skip: 'not approved' };
  }
  if (typeof meta.target_url !== 'string' || meta.target_url !== `/blog/${slug}`) {
    problems.push(`target_url must be "/blog/${slug}"`);
  }
  if (typeof meta.target_keywords !== 'string' || !meta.target_keywords.trim()) {
    problems.push('target_keywords is required');
  }
  if (/^\s{0,3}#\s/m.test(body)) {
    problems.push('body contains an H1 (`# `); headings must start at `##`');
  }
  if (meta.cover_image) {
    const ext = extname(String(meta.cover_image)).toLowerCase();
    if (!IMAGE_TYPES[ext]) problems.push(`cover_image must be .jpg, .png or .webp (got "${ext}")`);
    if (String(meta.cover_image).includes('..')) problems.push('cover_image may not traverse directories');
  }

  const validation = validateBlogPost({
    title: meta.title,
    slug,
    body,
    excerpt: meta.excerpt,
    seoTitle: meta.seo_title,
    seoDescription: meta.seo_description,
    status: 'draft',
  });

  if (!validation.ok) {
    for (const [field, message] of Object.entries(validation.errors)) {
      problems.push(`${field}: ${message}`);
    }
  }

  return problems.length ? { problems } : { row: validation.value };
}

async function uploadCover(supabase, slug, relativePath) {
  const ext = extname(relativePath).toLowerCase();
  const path = join(DRAFTS_DIR, relativePath);
  const data = await readFile(path);
  const objectPath = `covers/${slug}${ext}`;

  if (DRY_RUN) {
    log(`  would upload ${relativePath} -> ${BUCKET}/${objectPath} (${data.length} bytes)`);
    return `https://example.invalid/${BUCKET}/${objectPath}`;
  }

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(objectPath, data, { contentType: IMAGE_TYPES[ext], upsert: true });

  if (error) throw new Error(`cover upload failed for ${slug}: ${error.message}`);

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);
  return pub.publicUrl;
}

async function upsert(supabase, slug, row) {
  const { data: existing, error: readError } = await supabase
    .from('blog_posts')
    .select('id, status')
    .eq('slug', slug)
    .maybeSingle();

  if (readError) throw new Error(`read failed for ${slug}: ${readError.message}`);

  if (existing?.status === 'published') {
    warn(`  ${slug}: already published in the table — not overwriting. Edit it in /admin/blog.`);
    return 'skipped-published';
  }

  if (DRY_RUN) {
    log(`  would ${existing ? 'update' : 'insert'} ${slug} as draft`);
    return existing ? 'would-update' : 'would-insert';
  }

  if (existing) {
    const { error } = await supabase.from('blog_posts').update(row).eq('id', existing.id);
    if (error) throw new Error(`update failed for ${slug}: ${error.message}`);
    return 'updated';
  }

  const { error } = await supabase.from('blog_posts').insert(row);
  if (error) throw new Error(`insert failed for ${slug}: ${error.message}`);
  return 'inserted';
}

async function main() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const drafts = await loadDrafts();
  log(`${drafts.length} draft file(s) in ${DRAFTS_DIR}${DRY_RUN ? ' (dry run)' : ''}`);

  const approved = [];
  let failed = 0;

  for (const draft of drafts) {
    const result = checkDraft(draft);
    if (result.skip) {
      log(`  ${draft.slug}: ${result.skip}`);
      continue;
    }
    if (result.problems) {
      failed += 1;
      warn(`  ${draft.slug}: NOT publishable`);
      for (const p of result.problems) warn(`    - ${p}`);
      continue;
    }
    approved.push({ ...draft, row: result.row });
  }

  if (!approved.length) {
    log('nothing approved; done');
    process.exit(failed ? 1 : 0);
  }

  if (!url || !key) {
    warn('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — cannot write.');
    warn(`${approved.length} approved draft(s) would have been upserted as draft:`);
    for (const d of approved) warn(`  - ${d.slug}`);
    warn('Add the secrets to the repository and re-run the workflow.');
    process.exit(0);
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  for (const draft of approved) {
    log(`${draft.slug}:`);
    const row = { ...draft.row, status: 'draft' };
    if (draft.meta.cover_image) {
      row.cover_image_url = await uploadCover(supabase, draft.slug, String(draft.meta.cover_image));
    }
    const outcome = await upsert(supabase, draft.slug, row);
    log(`  ${outcome}`);
  }

  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error('[seo:publish] failed:', error.message);
  process.exit(1);
});
