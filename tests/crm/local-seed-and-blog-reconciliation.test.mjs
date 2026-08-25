import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = path.resolve(import.meta.dirname, '../..');
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

test('local Supabase config points to a checked-in deterministic seed file', () => {
  const config = read('supabase/config.toml');
  const seedPath = path.join(ROOT, 'supabase/seed.sql');

  assert.match(config, /sql_paths\s*=\s*\["\.\/seed\.sql"\]/);
  assert.equal(fs.existsSync(seedPath), true, 'supabase/seed.sql must exist');

  const seed = fs.readFileSync(seedPath, 'utf8');
  assert.match(seed, /LOCAL ONLY|DISPOSABLE/i);
  assert.match(seed, /example\.test/);
  assert.doesNotMatch(seed, /SUPABASE_SERVICE_ROLE_KEY|NEXT_PUBLIC_/i);
  assert.match(seed, /ON CONFLICT\s*\(id\)\s*DO NOTHING/i);
});

test('blog taxonomy migration matches the live additive schema', () => {
  const migration = read('supabase/migrations/0036_blog_taxonomy.sql');

  assert.match(migration, /ADD COLUMN IF NOT EXISTS category\s+text/i);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS tags\s+text\[\]/i);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS author_name\s+text/i);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.blog_tags_are_valid/i);
  assert.match(migration, /blog_posts_tags_check/i);
  assert.match(migration, /blog_posts_category_format_check/i);
  assert.match(migration, /blog_posts_author_name_length_check/i);
});

test('blog write-revoke migration leaves public reads but removes anonymous writes', () => {
  const migration = read('supabase/migrations/0037_blog_posts_anon_write_revoke.sql');

  assert.match(migration, /REVOKE ALL ON TABLE public\.blog_posts FROM anon/i);
  assert.match(migration, /GRANT SELECT ON TABLE public\.blog_posts TO anon/i);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.blog_tags_are_valid\(text\[\]\) FROM anon/i);
});
