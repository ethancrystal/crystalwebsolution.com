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
  const shellSource = read('components/ui/dark-page-background.jsx');

  assert.match(loginSource, /DarkPageBackground/);
  // The shell picks one of the procedural canvases; login asks for prism.
  assert.match(loginSource, /interactive="prism"/);
  assert.match(shellSource, /PrismBackground/);
  assert.match(shellSource, /INTERACTIVE_BACKGROUNDS/);
});

test('login background keeps mobile and reduced-motion fallbacks', () => {
  const shellSource = read('components/ui/dark-page-background.jsx');
  const prismSource = read('components/ui/prism-background.jsx');
  const css = readResolvedGlobalsCss(ROOT);

  // The shell hides the animated layer for both reduced motion and phones.
  assert.match(shellSource, /prefers-reduced-motion:\s*reduce/);
  assert.match(shellSource, /max-width:\s*767px/);
  // The canvas itself stands down too, and tears its listeners back off.
  assert.match(prismSource, /prefers-reduced-motion:\s*reduce/);
  assert.match(prismSource, /removeEventListener/);
  assert.match(css, /\.crm-auth-background/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});

test('login foreground remains above the background and retains the auth flow', () => {
  const loginSource = read('app/login/page.jsx');
  assert.match(loginSource, /crm-auth-card/);
  assert.match(loginSource, /Choose your portal/);
  assert.match(loginSource, /z-index:\s*1/);
});

test('the auth backgrounds are procedural, so script-src needs no third-party CDN', async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';

  // Every dark-page background renders in-process (WebGL/canvas) rather than
  // fetching a vendor bundle at runtime. The UnicornStudio component that used
  // to require https://cdn.jsdelivr.net was replaced on 2026-08-25; this test
  // stops that origin from creeping back into script-src unnoticed.
  const shellSource = read('components/ui/dark-page-background.jsx');
  const prismSource = read('components/ui/prism-background.jsx');
  for (const source of [shellSource, prismSource]) {
    assert.doesNotMatch(source, /cdn\.jsdelivr\.net/);
    assert.doesNotMatch(source, /document\.createElement\(['"]script['"]\)/);
  }

  const config = createRequire(import.meta.url)(path.join(ROOT, 'next.config.js'));
  const [rule] = await config.headers();
  const csp = rule.headers.find((header) => header.key === 'Content-Security-Policy').value;
  const scriptSrc = csp.split('; ').find((directive) => directive.startsWith('script-src'));

  assert.ok(
    !scriptSrc.includes('cdn.jsdelivr.net'),
    'script-src still allows cdn.jsdelivr.net, but nothing loads a script from it any more — ' +
      'a stale allowlist entry widens the policy for no benefit',
  );
});
