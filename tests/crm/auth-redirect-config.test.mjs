import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const PRODUCTION_ORIGINS = [
  'https://cdsportswearinc.com',
  'https://www.cdsportswearinc.com',
];

test('Supabase Auth allows redirects to every production hostname', async () => {
  const [config, seo] = await Promise.all([
    readFile('supabase/config.toml', 'utf8'),
    readFile('lib/seo.mjs', 'utf8'),
  ]);

  for (const origin of PRODUCTION_ORIGINS) {
    assert.match(
      config,
      new RegExp(`"${origin.replaceAll('.', '\\.')}\\/\\*\\*"`),
      `${origin} is missing from additional_redirect_urls`,
    );
  }

  const canonicalOrigin = seo.match(
    /export const SITE_ORIGIN = ['"](https:\/\/(?:www\.)?cdsportswearinc\.com)['"]/,
  )?.[1];
  assert.ok(canonicalOrigin, 'SITE_ORIGIN must use the production domain');
  assert.match(
    config,
    new RegExp(`"${canonicalOrigin.replaceAll('.', '\\.')}\\/\\*\\*"`),
    'the auth allow-list contract must include the canonical production origin',
  );
});
