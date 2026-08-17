import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BLOG_STATUSES,
  EXCERPT_MAX_LENGTH,
  SLUG_MAX_LENGTH,
  excerptFrom,
  isValidSlug,
  readingTimeMinutes,
  slugify,
  validateBlogPost,
} from '../lib/crm/blog-contract.mjs';

test('slugify produces URL-safe slugs the database check will accept', () => {
  assert.equal(slugify('Hello World'), 'hello-world');
  assert.equal(slugify('  Trim   Me  '), 'trim-me');
  assert.equal(slugify('Punctuation!? Everywhere...'), 'punctuation-everywhere');
  assert.equal(slugify('multiple---hyphens'), 'multiple-hyphens');
  assert.equal(slugify('2026 Web Design Trends'), '2026-web-design-trends');
});

test('slugify folds accents to base letters rather than dropping the words', () => {
  // Without the NFD decomposition these become '-' and fail validation.
  assert.equal(slugify('Café Résumé'), 'cafe-resume');
  assert.equal(slugify('Über Straße'), 'uber-stra-e');
});

test('slugify truncates at a hyphen boundary and never trails a hyphen', () => {
  const slug = slugify(`${'word '.repeat(40)}end`);
  assert.ok(slug.length <= SLUG_MAX_LENGTH, 'slug must respect the length bound');
  assert.ok(!slug.endsWith('-'), 'slug must not end with a hyphen');
  assert.ok(isValidSlug(slug), 'truncated slug must still validate');
});

test('isValidSlug rejects the shapes the database CHECK also rejects', () => {
  assert.ok(isValidSlug('a-valid-slug'));
  assert.ok(isValidSlug('post123'));

  assert.ok(!isValidSlug(''), 'empty');
  assert.ok(!isValidSlug('-leading'), 'leading hyphen');
  assert.ok(!isValidSlug('trailing-'), 'trailing hyphen');
  assert.ok(!isValidSlug('double--hyphen'), 'doubled hyphen');
  assert.ok(!isValidSlug('Upper-Case'), 'uppercase');
  assert.ok(!isValidSlug('has space'), 'space');
  assert.ok(!isValidSlug('has/slash'), 'path separator');
  assert.ok(!isValidSlug('a'.repeat(SLUG_MAX_LENGTH + 1)), 'over length');
  assert.ok(!isValidSlug(null), 'non-string');
});

test('excerptFrom strips markdown markers so meta descriptions read as prose', () => {
  const body = '## A heading\n\nSome **bold** and `code` and a [link](/x).';
  const excerpt = excerptFrom(body);

  assert.ok(!excerpt.includes('#'), 'no heading markers');
  assert.ok(!excerpt.includes('**'), 'no emphasis markers');
  assert.ok(!excerpt.includes('`'), 'no code markers');
  assert.ok(!excerpt.includes(']('), 'no link syntax');
  assert.ok(excerpt.includes('link'), 'link text is kept');
});

test('excerptFrom truncates on a word boundary within the column bound', () => {
  const excerpt = excerptFrom('word '.repeat(200));
  assert.ok(excerpt.length <= EXCERPT_MAX_LENGTH, 'must fit the excerpt column');
  assert.ok(excerpt.endsWith('…'), 'truncation is marked');
});

test('readingTimeMinutes never reports zero', () => {
  assert.equal(readingTimeMinutes(''), 1);
  assert.equal(readingTimeMinutes('one two three'), 1);
  assert.equal(readingTimeMinutes('word '.repeat(400)), 2);
});

test('validateBlogPost derives a slug from the title when none is supplied', () => {
  const result = validateBlogPost({ title: 'My First Post', body: 'Hello.' });

  assert.ok(result.ok, 'should validate');
  assert.equal(result.value.slug, 'my-first-post');
});

test('validateBlogPost keeps an author-supplied slug rather than rewriting it', () => {
  const result = validateBlogPost({
    title: 'A Totally Different Title',
    slug: 'chosen-slug',
    body: 'Hello.',
  });

  assert.ok(result.ok);
  assert.equal(result.value.slug, 'chosen-slug');
});

test('validateBlogPost rejects a malformed author-supplied slug', () => {
  const result = validateBlogPost({
    title: 'Fine title',
    slug: 'Not A Slug!',
    body: 'Hello.',
  });

  assert.ok(!result.ok);
  assert.ok(result.errors.slug, 'slug error is reported');
  assert.equal(result.value, null);
});

test('validateBlogPost backfills the excerpt from the body when blank', () => {
  const result = validateBlogPost({
    title: 'Post',
    body: 'The opening line becomes the summary.',
  });

  assert.ok(result.ok);
  assert.equal(result.value.excerpt, 'The opening line becomes the summary.');
});

test('validateBlogPost enforces every bound the migration also enforces', () => {
  assert.ok(!validateBlogPost({ title: '', body: 'x' }).ok, 'empty title');
  assert.ok(!validateBlogPost({ title: 'x', body: '' }).ok, 'empty body');
  assert.ok(
    !validateBlogPost({ title: 'a'.repeat(201), body: 'x' }).ok,
    'title over 200',
  );
  assert.ok(
    !validateBlogPost({ title: 'x', body: 'y', excerpt: 'a'.repeat(321) }).ok,
    'excerpt over 320',
  );
  assert.ok(
    !validateBlogPost({ title: 'x', body: 'y', seoTitle: 'a'.repeat(71) }).ok,
    'seo title over 70',
  );
  assert.ok(
    !validateBlogPost({ title: 'x', body: 'y', seoDescription: 'a'.repeat(201) }).ok,
    'seo description over 200',
  );
});

test('validateBlogPost only accepts the two known statuses', () => {
  for (const status of BLOG_STATUSES) {
    assert.ok(validateBlogPost({ title: 'x', body: 'y', status }).ok, status);
  }
  assert.ok(!validateBlogPost({ title: 'x', body: 'y', status: 'archived' }).ok);
});

test('validateBlogPost rejects a non-https cover image', () => {
  assert.ok(
    !validateBlogPost({ title: 'x', body: 'y', coverImageUrl: 'javascript:alert(1)' }).ok,
    'javascript: URL must be rejected',
  );
  assert.ok(
    !validateBlogPost({ title: 'x', body: 'y', coverImageUrl: 'http://insecure.test/a.png' })
      .ok,
    'plain http must be rejected',
  );
  assert.ok(
    validateBlogPost({ title: 'x', body: 'y', coverImageUrl: 'https://cdn.test/a.png' }).ok,
    'https must be accepted',
  );
});
