import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');

test('login mounts the reusable interactive background behind the auth card', () => {
  assert.ok(existsSync(new URL('../components/ui/dark-page-background.jsx', import.meta.url)));
  const loginSource = read('app/login/page.jsx');
  const backgroundSource = read('components/ui/unicorn-studio-background.jsx');

  assert.match(loginSource, /DarkPageBackground/);
  assert.match(backgroundSource, /data-us-project/);
  assert.match(backgroundSource, /OMzqyUv6M3kSnv0JeAtC/);
  assert.match(backgroundSource, /unicornStudio\.umd\.js/);
});

test('login background keeps mobile and reduced-motion fallbacks', () => {
  const backgroundSource = read('components/ui/unicorn-studio-background.jsx');
  const css = read('app/globals.css');

  assert.match(backgroundSource, /prefers-reduced-motion/);
  assert.match(backgroundSource, /max-width:\s*767px/);
  assert.match(backgroundSource, /removeEventListener/);
  assert.match(css, /\.crm-auth-background/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});

test('login foreground remains above the background and retains the auth flow', () => {
  const loginSource = read('app/login/page.jsx');
  assert.match(loginSource, /crm-auth-card/);
  assert.match(loginSource, /Choose your portal/);
  assert.match(loginSource, /z-index:\s*1/);
});
