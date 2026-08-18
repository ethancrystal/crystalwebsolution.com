import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  BODY_MAX_LENGTH,
  EXCERPT_MAX_LENGTH,
  SEO_DESCRIPTION_MAX_LENGTH,
  SEO_TITLE_MAX_LENGTH,
  SLUG_MAX_LENGTH,
  TITLE_MAX_LENGTH,
} from '../../lib/crm/blog-contract.mjs';

const ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const MIGRATION = fs.readFileSync(
  path.join(ROOT, 'supabase/migrations/0035_blog_posts.sql'),
  'utf8',
);

test('0035 enables row level security on blog_posts', () => {
  assert.match(MIGRATION, /ALTER TABLE public\.blog_posts ENABLE ROW LEVEL SECURITY/);
});

test('the public read policy is scoped to anon and gated on published state', () => {
  const policy = MIGRATION.match(
    /CREATE POLICY "Anyone can read published posts"[\s\S]*?;/,
  )?.[0];

  assert.ok(policy, 'public read policy must exist');
  assert.match(policy, /FOR SELECT TO anon, authenticated/);
  assert.match(policy, /status = 'published'/);
  assert.match(policy, /published_at <= NOW\(\)/);
});

test('the public read policy never calls is_staff', () => {
  // 0008 revoked EXECUTE on is_staff() from PUBLIC, so an anonymous visitor
  // evaluating it would get "permission denied for function is_staff" instead
  // of the blog. This is the regression that role-scoping the policy prevents.
  const policy = MIGRATION.match(
    /CREATE POLICY "Anyone can read published posts"[\s\S]*?;/,
  )[0];

  assert.ok(
    !policy.includes('is_staff'),
    'the anon-facing policy must not depend on a function anon cannot execute',
  );
});

test('every write policy is admin-gated, matching the /admin-only authoring UI', () => {
  for (const command of ['create', 'update', 'delete']) {
    const policy = MIGRATION.match(
      new RegExp(`CREATE POLICY "Admin can ${command} posts"[\\s\\S]*?;`),
    )?.[0];

    assert.ok(policy, `${command} policy must exist`);
    assert.match(policy, /public\.is_admin\(\)/, `${command} must check is_admin`);
    assert.ok(
      !policy.includes('is_staff'),
      `${command} must not be widened to staff without a matching /team route`,
    );
  }
});

test('anon holds SELECT only — never a write grant', () => {
  assert.match(MIGRATION, /GRANT SELECT ON public\.blog_posts TO anon;/);
  assert.ok(
    !/GRANT[^;]*(INSERT|UPDATE|DELETE)[^;]*TO anon/i.test(MIGRATION),
    'anon must never hold a write privilege on blog_posts',
  );
});

test('slug uniqueness is enforced by an index, not just by convention', () => {
  assert.match(
    MIGRATION,
    /CREATE UNIQUE INDEX blog_posts_slug_unique_idx ON public\.blog_posts \(slug\)/,
  );
});

test('published_at and status can never disagree', () => {
  const constraint = MIGRATION.match(
    /blog_posts_published_at_consistency_check[\s\S]*?\);/,
  )?.[0];

  assert.ok(constraint, 'consistency constraint must exist');
  assert.match(constraint, /status = 'published' AND published_at IS NOT NULL/);
  assert.match(constraint, /status = 'draft' AND published_at IS NULL/);
});

test('database length bounds match the application contract exactly', () => {
  // If these drift, a post that passes validateBlogPost is rejected by Postgres
  // with an opaque constraint error instead of a field-level message.
  const bounds = [
    [SLUG_MAX_LENGTH, /char_length\(slug\) BETWEEN 1 AND (\d+)/],
    [TITLE_MAX_LENGTH, /char_length\(btrim\(title\)\) BETWEEN 1 AND (\d+)/],
    [EXCERPT_MAX_LENGTH, /char_length\(excerpt\) <= (\d+)/],
    [BODY_MAX_LENGTH, /char_length\(btrim\(body\)\) BETWEEN 1 AND (\d+)/],
    [SEO_TITLE_MAX_LENGTH, /char_length\(seo_title\) <= (\d+)/],
    [SEO_DESCRIPTION_MAX_LENGTH, /char_length\(seo_description\) <= (\d+)/],
  ];

  for (const [expected, pattern] of bounds) {
    const match = MIGRATION.match(pattern);
    assert.ok(match, `migration must declare the bound for ${pattern}`);
    assert.equal(
      Number(match[1]),
      expected,
      `database bound must equal the contract bound (${pattern})`,
    );
  }
});

test('the status CHECK matches the contract status list', () => {
  assert.match(MIGRATION, /CHECK \(status IN \('draft', 'published'\)\)/);
});

test('the slug CHECK matches the contract slug pattern', () => {
  assert.match(MIGRATION, /slug ~ '\^\[a-z0-9\]\+\(-\[a-z0-9\]\+\)\*\$'/);
});
