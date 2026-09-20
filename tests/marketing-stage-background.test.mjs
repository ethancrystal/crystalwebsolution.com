import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { readResolvedGlobalsCss } from './helpers/resolvedGlobalsCss.mjs';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const ROOT = fileURLToPath(root);

test('inner marketing pages mount the auth-family animated stage, not the idle crystal', () => {
  const shell = read('components/marketing/SubpageExperience.jsx');
  const experience = read('components/Experience.jsx');

  assert.match(shell, /DarkPageBackground/);
  assert.match(shell, /marketingStageBackground/);
  assert.match(shell, /prism/);
  assert.match(shell, /ripple-grid/);
  assert.match(shell, /liquid-ether/);
  assert.doesNotMatch(shell, /IdleScene/);

  // Homepage keeps the WebGL crystal journey.
  assert.match(experience, /import\('\.\/Scene'\)/);
  assert.doesNotMatch(experience, /DarkPageBackground/);
});

test('scene variants map onto distinct background modules', () => {
  const shell = read('components/marketing/SubpageExperience.jsx');
  assert.match(shell, /about:\s*'prism'/);
  assert.match(shell, /services:\s*'ripple-grid'/);
  assert.match(shell, /process:\s*'ripple-grid'/);
  assert.match(shell, /contact:\s*'liquid-ether'/);
});

test('marketing page fills stay transparent so the stage is visible', () => {
  const css = readResolvedGlobalsCss(ROOT);
  const subpageBlock = css.match(/\.subpage\s*\{[^}]+\}/);
  const shellBlock = css.match(/\.mkt-shell\s*\{[^}]+\}/);

  assert.ok(subpageBlock, '.subpage rule missing');
  assert.ok(shellBlock, '.mkt-shell rule missing');
  assert.doesNotMatch(subpageBlock[0], /var\(--bg\)/);
  assert.match(shellBlock[0], /background:\s*transparent/);
  assert.match(css, /\.mkt-hero\s*\{[^}]*min-height/s);
});

test('auth pages already carry the same modules and are left in place', () => {
  assert.match(read('app/login/page.jsx'), /interactive="prism"/);
  assert.match(read('app/signup/page.jsx'), /interactive="ripple-grid"/);
  assert.match(read('app/forgot-password/page.jsx'), /interactive="liquid-ether"/);
});
