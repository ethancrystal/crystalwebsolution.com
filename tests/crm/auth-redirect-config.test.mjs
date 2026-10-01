import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { SITE_ORIGIN } from '../../lib/seo.mjs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

const PRODUCTION_ORIGINS = [
  'https://cdsportswearinc.com',
  'https://www.cdsportswearinc.com',
];

// Domains we no longer control. crystalwebsolution.com is served by a third
// party, so listing it would let that host receive sign-in tokens.
const RETIRED_HOSTS = ['crystalwebsolution.com', 'cdsportswearusa.com'];

// The quoted entries of auth.additional_redirect_urls, with TOML comments
// stripped so a commented-out line can't satisfy (or fail) an assertion.
function allowListEntries() {
  const block = read('../../supabase/config.toml').match(
    /^additional_redirect_urls\s*=\s*\[([\s\S]*?)\]/m,
  )?.[1];
  assert.ok(block, 'supabase/config.toml must define additional_redirect_urls');
  return [...block.replace(/#.*$/gm, '').matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

test('Supabase Auth allows redirects to every production hostname', () => {
  const entries = allowListEntries();
  for (const origin of PRODUCTION_ORIGINS) {
    assert.ok(
      entries.includes(`${origin}/**`),
      `${origin}/** is missing from additional_redirect_urls`,
    );
  }
});

test('the auth allow-list includes the canonical SITE_ORIGIN', () => {
  assert.ok(
    allowListEntries().includes(`${SITE_ORIGIN}/**`),
    `${SITE_ORIGIN}/** (lib/seo.mjs SITE_ORIGIN) is missing from additional_redirect_urls`,
  );
});

test('the auth allow-list never includes a retired domain', () => {
  for (const entry of allowListEntries()) {
    const { hostname } = new URL(entry);
    for (const retired of RETIRED_HOSTS) {
      assert.ok(
        hostname !== retired && !hostname.endsWith(`.${retired}`),
        `${entry} points at retired domain ${retired}`,
      );
    }
  }
});
