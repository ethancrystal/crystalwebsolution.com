import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { readResolvedGlobalsCss } from './helpers/resolvedGlobalsCss.mjs';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const ROOT = fileURLToPath(root);

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
  const css = readResolvedGlobalsCss(ROOT);

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

test('CSP allows the host the interactive background script loads from', async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  const backgroundSource = read('components/ui/unicorn-studio-background.jsx');
  const [, scriptOrigin] = backgroundSource.match(/UNICORN_SCRIPT_SRC = '(https:\/\/[^/]+)/);

  const config = createRequire(import.meta.url)(path.join(ROOT, 'next.config.js'));
  const [rule] = await config.headers();
  const csp = rule.headers.find((header) => header.key === 'Content-Security-Policy').value;
  const scriptSrc = csp.split('; ').find((directive) => directive.startsWith('script-src'));

  assert.ok(
    scriptSrc.includes(scriptOrigin),
    `script-src must allow ${scriptOrigin} — otherwise the script is blocked, isInteractive never flips true, and every dark auth page silently falls back to the static star field with no visible error`,
  );
});
