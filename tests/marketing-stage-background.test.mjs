import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { readResolvedGlobalsCss } from './helpers/resolvedGlobalsCss.mjs';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const ROOT = fileURLToPath(root);

test('the animated stage is scoped to the hero, not mounted shell-wide', () => {
  const shell = read('components/marketing/SubpageExperience.jsx');
  const heroStage = read('components/marketing/HeroStage.jsx');
  const pageHero = read('components/marketing/PageHero.jsx');
  const experience = read('components/Experience.jsx');

  // The shell only provides which stage (if any) the page wants; it no
  // longer renders DarkPageBackground itself, so the stage can't cover
  // sections below the hero.
  assert.match(shell, /marketingStageBackground/);
  assert.match(shell, /StageProvider/);
  assert.doesNotMatch(shell, /<DarkPageBackground/);
  assert.doesNotMatch(shell, /IdleScene/);

  // HeroStage is the only place DarkPageBackground actually renders for
  // marketing pages, and PageHero mounts it inside .mkt-hero.
  assert.match(heroStage, /DarkPageBackground/);
  assert.match(heroStage, /useStage/);
  assert.match(pageHero, /<HeroStage \/>/);

  // Homepage keeps the WebGL crystal journey, untouched.
  assert.match(experience, /import\('\.\/Scene'\)/);
  assert.doesNotMatch(experience, /DarkPageBackground/);
});

test('only the four top-level marketing pages get a stage; there is no fallback', () => {
  const shell = read('components/marketing/SubpageExperience.jsx');
  assert.match(shell, /about:\s*'acid-squares'/);
  assert.match(shell, /services:\s*'dot-field'/);
  assert.match(shell, /process:\s*'faulty-terminal'/);
  assert.match(shell, /contact:\s*'letter-glitch'/);

  // A page with no (or an unrecognized) sceneVariant must get no stage —
  // the old `|| 'acid-squares'` fallback is exactly what leaked the stage
  // onto service-detail, work, blog, reviews, privacy and terms pages.
  assert.doesNotMatch(shell, /\|\|\s*'acid-squares'/);
  assert.match(shell, /marketingStageBackground\(sceneVariant\)\s*\{\s*return MARKETING_STAGE_BACKGROUNDS\[sceneVariant\]\s*\?\?\s*null/);
});

test('privacy and terms no longer request a stage variant', () => {
  assert.doesNotMatch(read('app/privacy/page.jsx'), /sceneVariant=/);
  assert.doesNotMatch(read('app/terms/page.jsx'), /sceneVariant=/);
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

test('the hero stage is boxed to .mkt-hero, not the viewport', () => {
  const css = readResolvedGlobalsCss(ROOT);

  assert.match(css, /\.mkt-hero\s*\{[^}]*position:\s*relative/s);
  assert.match(css, /\.mkt-hero\s*\{[^}]*overflow:\s*hidden/s);
  assert.match(css, /\.mkt-hero-stage\s*\{[^}]*position:\s*absolute/s);
  // The stage modules ship their own `position: fixed`; this file must
  // force them back to absolute inside the hero box so they don't run the
  // full page height.
  assert.match(css, /\.mkt-hero-stage\s+\.acid-squares-bg[\s\S]*?position:\s*absolute\s*!important/);
});

test('auth pages share the same cyan-silver family and remain full-viewport', () => {
  assert.match(read('app/login/page.jsx'), /interactive="faulty-terminal"/);
  assert.match(read('app/signup/page.jsx'), /interactive="dot-field"/);
  assert.match(read('app/forgot-password/page.jsx'), /interactive="letter-glitch"/);
  assert.match(read('components/auth/PortalLoginForm.jsx'), /interactive="faulty-terminal"/);
  assert.match(read('app/auth/reset-password/page.jsx'), /interactive="letter-glitch"/);
  assert.match(read('app/auth/confirm/page.jsx'), /interactive="letter-glitch"/);
});
