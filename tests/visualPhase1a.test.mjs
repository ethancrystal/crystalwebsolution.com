import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { canUseWebGL, resetWebGLProbe } from '../lib/webglSupport.mjs';

// Regression guards for the Phase 1a defect batch
// (docs/visual/PHASE-0-REPORT.md, section 3). Each one was reproduced in a
// real browser before the fix.

test('motion stream index fits phones: margins come out of the width, not past the edge', async () => {
  const css = await readFile('app/styles/marquee-corridor.css', 'utf8');
  const rule = css.match(/\.motion-stream-index \{[\s\S]*?\}/)[0];
  assert.match(rule, /margin: 0 6vw/);
  assert.match(rule, /width: auto/);
  assert.match(rule, /max-width: 34rem/);
  assert.doesNotMatch(rule, /width: min\(100%/, 'a 100%-wide list plus 6vw margin overflowed every phone width');
});

test('exactly one <main> landmark: the root layout owns it', async () => {
  const [layout, experience, subpage] = await Promise.all([
    readFile('app/layout.jsx', 'utf8'),
    readFile('components/Experience.jsx', 'utf8'),
    readFile('components/marketing/SubpageExperience.jsx', 'utf8'),
  ]);
  // Comments legitimately mention <main>; only rendered markup counts.
  const code = (source) => source.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\/.*$/gm, '');
  assert.equal((code(layout).match(/<main\b/g) ?? []).length, 1);
  assert.match(layout, /<main id="main-content"/);
  assert.doesNotMatch(code(experience), /<main\b/);
  assert.doesNotMatch(code(subpage), /<main\b/);
});

test('homepage scene follows the render-quality tier instead of hardcoded high-cost values', async () => {
  const scene = await readFile('components/Scene.jsx', 'utf8');
  assert.match(scene, /dpr=\{\[1, quality\.maxDpr\]\}/);
  assert.match(scene, /<Particles count=\{quality\.particleCount\} animate=\{quality\.animate\} \/>/);
  // Bloom + vignette stay on every tier (eco includes 4-thread laptops); only
  // the high tier gets the full (mipmap blur + DOF) mode.
  assert.match(scene, /<Effects mode=\{quality\.postprocessing === 'full' \? 'full' : 'light'\} \/>/);
  assert.doesNotMatch(scene, /postprocessing !== 'off'/);
  assert.doesNotMatch(scene, /count=\{900\}/);
  assert.doesNotMatch(scene, /1\.75/);
});

test('scene skips the canvas without WebGL and isolates renderer failures', async () => {
  const scene = await readFile('components/Scene.jsx', 'utf8');
  assert.match(scene, /useState\(canUseWebGL\)/);
  assert.match(scene, /if \(!webgl\) return null;/);
  assert.match(scene, /<CanvasFeatureBoundary>\s*<Canvas/);
});

function fakeDocument(getContext) {
  return { createElement: () => ({ getContext }) };
}

test('canUseWebGL probes once, releases the probe context, and fails closed', () => {
  resetWebGLProbe();
  let lost = 0;
  const gl = { getExtension: () => ({ loseContext: () => { lost += 1; } }) };
  assert.equal(canUseWebGL(fakeDocument((kind) => (kind === 'webgl' ? gl : null))), true);
  assert.equal(lost, 1, 'probe context is released');
  // Cached: a later call does not create another context.
  assert.equal(canUseWebGL(fakeDocument(() => { throw new Error('must not probe again'); })), true);

  resetWebGLProbe();
  assert.equal(canUseWebGL(fakeDocument(() => null)), false);

  resetWebGLProbe();
  assert.equal(canUseWebGL(fakeDocument(() => { throw new Error('blocked'); })), false);

  resetWebGLProbe();
  assert.equal(canUseWebGL(null), false, 'no document (server) is not WebGL');
  resetWebGLProbe();
});

test('section skeleton renders identical markup on server and client (no reduced-motion branch)', async () => {
  const [component, css] = await Promise.all([
    readFile('components/ui/section-skeleton.jsx', 'utf8'),
    readFile('app/styles/section-skeleton.css', 'utf8'),
  ]);
  assert.doesNotMatch(component, /\{!reduced &&/, 'branching the tree on useReducedMotion caused React #418');
  assert.match(component, /animate=\{reduced \? undefined :/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{\s*\.section-skeleton-sweep \{ display: none; \}/);
});

test('global focus-visible safety net: zero specificity, dark ring on light surfaces', async () => {
  const css = await readFile('app/styles/primitives.css', 'utf8');
  assert.match(css, /:where\(a\[href\], button, input, select, textarea, summary, \[tabindex\]:not\(\[tabindex="-1"\]\)\):focus-visible \{/);
  assert.match(css, /outline: 2px solid var\(--focus-ring, var\(--cyan\)\);/);
  assert.match(css, /\[data-nav-tone="light"\],\s*\.nav-on-light \{\s*--focus-ring: #151612;/);
});
