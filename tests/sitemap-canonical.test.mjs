import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const sitemap = fs.readFileSync(path.join(ROOT, 'app/sitemap.js'), 'utf8');

test('sitemap emits the homepage through the canonical URL helper', () => {
  assert.match(sitemap, /url:\s*absoluteUrl\('\/'\)/);
});
