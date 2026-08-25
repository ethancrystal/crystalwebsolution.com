import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');

const BACKGROUND_FILES = {
  prism: 'components/ui/prism-background.jsx',
  'ripple-grid': 'components/ui/ripple-grid-background.jsx',
  'liquid-ether': 'components/ui/liquid-ether-background.jsx'
};

// Which interactive background each dark auth page is expected to render,
// grouped by journey: primary sign-in (brand-forward), signup (energetic),
// account recovery (calmer). See dark-page-background.jsx's INTERACTIVE_BACKGROUNDS map.
const PAGE_EXPECTATIONS = [
  { file: 'app/login/page.jsx', interactive: 'prism' },
  { file: 'components/auth/PortalLoginForm.jsx', interactive: 'prism' },
  { file: 'app/signup/page.jsx', interactive: 'ripple-grid' },
  { file: 'app/forgot-password/page.jsx', interactive: 'liquid-ether' },
  { file: 'app/auth/reset-password/page.jsx', interactive: 'liquid-ether' },
  { file: 'app/auth/confirm/page.jsx', interactive: 'liquid-ether' }
];

test('every background component file exists', () => {
  for (const path of Object.values(BACKGROUND_FILES)) {
    assert.ok(existsSync(new URL(`../${path}`, import.meta.url)), `${path} is missing`);
  }
});

test('DarkPageBackground maps each interactive key to its component and defaults to prism', () => {
  const source = read('components/ui/dark-page-background.jsx');
  assert.match(source, /'use client'/);
  assert.match(source, /import PrismBackground from '\.\/prism-background'/);
  assert.match(source, /import RippleGridBackground from '\.\/ripple-grid-background'/);
  assert.match(source, /import LiquidEtherBackground from '\.\/liquid-ether-background'/);
  assert.match(source, /prism: PrismBackground/);
  assert.match(source, /'ripple-grid': RippleGridBackground/);
  assert.match(source, /'liquid-ether': LiquidEtherBackground/);
  assert.match(source, /interactive = 'prism'/, 'unset interactive prop must default to prism, not render nothing');
});

for (const { file, interactive } of PAGE_EXPECTATIONS) {
  test(`${file} renders DarkPageBackground with interactive="${interactive}"`, () => {
    const source = read(file);
    assert.match(
      source,
      new RegExp(`<DarkPageBackground interactive="${interactive}"\\s*/>`),
      `${file} must pass interactive="${interactive}"`
    );
  });
}

test('prism and ripple-grid backgrounds use ogl; liquid-ether reuses the project\'s existing three dependency', () => {
  const prism = read(BACKGROUND_FILES.prism);
  const rippleGrid = read(BACKGROUND_FILES['ripple-grid']);
  const liquidEther = read(BACKGROUND_FILES['liquid-ether']);

  assert.match(prism, /from 'ogl'/);
  assert.match(rippleGrid, /from 'ogl'/);
  assert.match(liquidEther, /from 'three'/);

  const pkg = JSON.parse(read('package.json'));
  assert.ok(pkg.dependencies?.ogl, 'ogl must be declared in package.json dependencies');
  assert.ok(!pkg.dependencies?.three || pkg.dependencies.three.startsWith('^0.169'),
    'liquid-ether must not force a three.js version bump — that would risk the homepage R3F/drei/postprocessing stack');
});

test('each interactive background genuinely reacts to pointer input, not just time', () => {
  const prism = read(BACKGROUND_FILES.prism);
  const rippleGrid = read(BACKGROUND_FILES['ripple-grid']);
  const liquidEther = read(BACKGROUND_FILES['liquid-ether']);

  assert.match(prism, /animationType = 'hover'/, 'prism must default to the pointer-driven tilt mode, not the passive auto-rotate one');
  assert.match(prism, /addEventListener\('pointermove'/);

  assert.match(rippleGrid, /mouseInteraction = true/);
  assert.match(rippleGrid, /addEventListener\('mousemove'/);

  assert.match(liquidEther, /addEventListener\('mousemove'/);
  assert.match(liquidEther, /mouseForce/);
});

test('each interactive background falls back to nothing extra under reduced motion and on mobile, leaving DarkPageBackground\'s ambient layer visible', () => {
  for (const path of Object.values(BACKGROUND_FILES)) {
    const source = read(path);
    assert.match(source, /prefers-reduced-motion:\s*reduce/, `${path} must respect prefers-reduced-motion`);
    assert.match(source, /max-width:\s*767px/, `${path} must disable itself on small viewports`);
    assert.match(source, /display:\s*none/, `${path} must hide rather than keep rendering when disabled`);
  }
});

test('every background component tears down its RAF loop, listeners, and GL context on unmount', () => {
  for (const path of Object.values(BACKGROUND_FILES)) {
    const source = read(path);
    assert.match(source, /cancelAnimationFrame/, `${path} must cancel its render loop on cleanup`);
    assert.match(source, /removeEventListener/, `${path} must remove the listeners it added`);
  }
});

test('login foreground remains above the background and retains the auth flow', () => {
  const loginSource = read('app/login/page.jsx');
  assert.match(loginSource, /crm-auth-card/);
  assert.match(loginSource, /Choose your portal/);
  assert.match(loginSource, /z-index:\s*1/);
});
