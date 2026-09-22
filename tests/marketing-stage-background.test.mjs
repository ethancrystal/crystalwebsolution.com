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

test('every stage page maps to a module, and there is no fallback', () => {
  const shell = read('components/marketing/SubpageExperience.jsx');
  // Top-level pages.
  assert.match(shell, /about:\s*'acid-squares'/);
  assert.match(shell, /services:\s*'dot-field'/);
  assert.match(shell, /process:\s*'faulty-terminal'/);
  assert.match(shell, /contact:\s*'letter-glitch'/);
  // Index and detail surfaces.
  assert.match(shell, /'service-detail':\s*'prism'/);
  assert.match(shell, /work:\s*'ripple-grid'/);
  assert.match(shell, /blog:\s*'liquid-ether'/);
  assert.match(shell, /reviews:\s*'dot-field'/);

  // A page with no (or an unrecognized) sceneVariant must still get no
  // stage — the old `|| 'acid-squares'` fallback is what leaked the stage
  // onto every route in the first place.
  assert.doesNotMatch(shell, /\|\|\s*'acid-squares'/);
  assert.match(shell, /marketingStageBackground\(sceneVariant\)\s*\{\s*return MARKETING_STAGE_BACKGROUNDS\[sceneVariant\]\s*\?\?\s*null/);
});

test('the four added surfaces declare their variant and mount a stage', () => {
  // /services/[slug] renders PageHero, which already carries HeroStage.
  assert.match(read('app/services/[slug]/page.jsx'), /sceneVariant="service-detail"/);

  for (const [file, variant] of [
    ['app/blog/page.jsx', 'blog'],
    ['app/reviews/page.jsx', 'reviews'],
    ['app/work/page.jsx', 'work'],
  ]) {
    const source = read(file);
    assert.match(source, new RegExp(`sceneVariant="${variant}"`));
    assert.match(source, /<HeroStage/, `${file} declares a variant but never mounts HeroStage`);
  }

  // /work's first section is the whole index, so it uses the height-capped
  // band rather than stretching to the section box.
  assert.match(read('app/work/page.jsx'), /<HeroStage variant="band" \/>/);
});

test('detail routes the owner did not ask for still get no stage', () => {
  for (const file of [
    'app/work/[slug]/page.jsx',
    'app/blog/[slug]/page.jsx',
    'app/embroidery-screen-printing-web-design/page.jsx',
    'app/privacy/page.jsx',
    'app/terms/page.jsx',
  ]) {
    assert.doesNotMatch(read(file), /sceneVariant=/, `${file} unexpectedly requests a stage`);
  }
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

  // One dimming knob for every stage, and a height-capped band for hosts
  // that are a whole article rather than a hero box.
  assert.match(css, /\.mkt-hero-stage\s*\{[^}]*opacity:\s*0?\.\d+/s);
  assert.match(css, /\.mkt-hero-stage--band\s*\{[^}]*height:\s*min\(/s);
});

test('auth pages share the same cyan-silver family and remain full-viewport', () => {
  assert.match(read('app/login/page.jsx'), /interactive="faulty-terminal"/);
  assert.match(read('app/signup/page.jsx'), /interactive="dot-field"/);
  assert.match(read('app/forgot-password/page.jsx'), /interactive="letter-glitch"/);
  assert.match(read('components/auth/PortalLoginForm.jsx'), /interactive="faulty-terminal"/);
  assert.match(read('app/auth/reset-password/page.jsx'), /interactive="letter-glitch"/);
  assert.match(read('app/auth/confirm/page.jsx'), /interactive="letter-glitch"/);
});
