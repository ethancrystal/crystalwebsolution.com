import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');

test('the supplied full logo and icon are the canonical site assets', async () => {
  const { SITE } = await import('../lib/site.js');

  assert.equal(SITE.logoPath, '/cd-sportswear-usa-logo.png');
  assert.equal(SITE.iconPath, '/cd-sportswear-usa-icon.png');
  assert.ok(existsSync(new URL('../public/cd-sportswear-usa-logo.png', import.meta.url)));
  assert.ok(existsSync(new URL('../public/cd-sportswear-usa-icon.png', import.meta.url)));
  assert.ok(existsSync(new URL('../app/icon.png', import.meta.url)));
  assert.equal(existsSync(new URL('../public/cws-header-logo.png', import.meta.url)), false);
  assert.match(read('app/layout.jsx'), /icons:\s*\{[\s\S]*SITE\.iconPath/);
});

test('transactional email layout uses the canonical logo with a text fallback', () => {
  const templates = read('lib/email/templates.js');
  assert.match(templates, /SITE\.logoPath/);
  assert.match(templates, /<img[^>]+alt=\"\$\{escapeHtml\(SITE\.name\)\}\"/);
  assert.match(templates, /SITE\.name/);
});

test('Named Client source images are unique, local, and rendered from one registry', async () => {
  const { CLIENT_TILE_IMAGES } = await import('../lib/clientTileImages.mjs');
  const motion = read('components/sections/Motion.jsx');
  const unique = new Set(CLIENT_TILE_IMAGES);

  assert.ok(CLIENT_TILE_IMAGES.length >= 6);
  assert.equal(unique.size, CLIENT_TILE_IMAGES.length);
  for (const imagePath of CLIENT_TILE_IMAGES) {
    assert.match(imagePath, /^\/projects\/clients\/[a-z0-9-]+\.jpg$/);
    assert.ok(existsSync(new URL(`../public${imagePath}`, import.meta.url)), imagePath);
  }
  assert.match(motion, /CLIENT_TILE_IMAGES/);
  assert.doesNotMatch(motion, /const STREAM_IMAGES/);
});
