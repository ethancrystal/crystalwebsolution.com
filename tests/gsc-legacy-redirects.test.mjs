import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const config = fs.readFileSync(path.join(ROOT, 'next.config.js'), 'utf8');

const redirects = [
  ['/contact-us', '/contact'],
  ['/about-us', '/about'],
  ['/graphics-designing', '/services/logo-design'],
  ['/category/branding', '/services/branding'],
  ['/category/digital-marketing', '/services/digital-marketing'],
];

test('confirmed legacy marketing URLs have specific permanent redirects', () => {
  assert.match(config, /async redirects/);
  for (const [source, destination] of redirects) {
    assert.match(config, new RegExp('source:.*' + source));
    assert.match(config, new RegExp('destination:.*' + destination));
    assert.match(config, /permanent: true/);
  }
});

test('obsolete WordPress-only paths are not redirected to unrelated pages', () => {
  assert.doesNotMatch(config, /wp-includes/);
  assert.doesNotMatch(config, /comments\/feed/);
  assert.doesNotMatch(config, /author\/admin/);
});
