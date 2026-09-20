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
  assert.match(loginSource, /interactive="faulty-terminal"/);
  assert.match(shellSource, /FaultyTerminalBackground/);
  assert.match(shellSource, /INTERACTIVE_BACKGROUNDS/);
});

test('login background keeps mobile and reduced-motion fallbacks', () => {
  const shellSource = read('components/ui/dark-page-background.jsx');
  const terminalSource = read('components/ui/faulty-terminal-background.jsx');
  const css = readResolvedGlobalsCss(ROOT);

  assert.match(shellSource, /prefers-reduced-motion:\s*reduce/);
  assert.match(shellSource, /max-width:\s*767px/);
  assert.match(terminalSource, /prefers-reduced-motion:\s*reduce/);
  assert.match(terminalSource, /removeEventListener/);
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

  const shellSource = read('components/ui/dark-page-background.jsx');
  const terminalSource = read('components/ui/faulty-terminal-background.jsx');
  for (const source of [shellSource, terminalSource]) {
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

test('cyan-silver family modules restyle React Bits ports to site tokens', () => {
  const acid = read('components/ui/acid-squares-background.jsx');
  const dots = read('components/ui/dot-field-background.jsx');
  const terminal = read('components/ui/faulty-terminal-background.jsx');
  const letters = read('components/ui/letter-glitch-background.jsx');

  assert.match(acid, /#3c6cff/);
  assert.match(acid, /#59f3ff/);
  assert.match(acid, /#eaf2ff/);
  assert.match(acid, /removeEventListener/);
  assert.match(dots, /89, 243, 255/);
  assert.match(dots, /196, 205, 220/);
  assert.match(dots, /removeEventListener/);
  assert.match(terminal, /0\.34901960784313724, 0\.9529411764705882, 1/);
  assert.match(terminal, /removeEventListener/);
  assert.match(letters, /#3c6cff/);
  assert.match(letters, /#59f3ff/);
  assert.match(letters, /#8b98b8/);
  assert.match(letters, /removeEventListener/);
});
