import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Source contracts for the homepage frame-pipeline lifecycle fixes (data-map
// F12-F14). The behaviour itself is exercised in jsdom by
// tests/marketing/cameraRigLifecycle.test.jsx and approachRefresh.test.jsx;
// these pin the shapes that WebGL actors (which cannot render here) must keep.
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const crystal = read('components/three/Crystal.jsx');
const sparks = read('components/three/Sparks.jsx');
const rig = read('components/three/CameraRig.jsx');
const scene = read('components/Scene.jsx');
const backdrop = read('components/three/BackdropMorph.jsx');
const approach = read('components/sections/Approach.jsx');
const approachCss = read('app/styles/approach.css');
const pulseSource = read('lib/pulse.js');

test('pulse readers seed their last-seen stamp from the live pulse (R8)', () => {
  // blast() also runs on subpages where nothing reads it, so pulse.t is
  // already non-zero when Crystal and Sparks mount on a return to '/'. A
  // reader that starts from 0 would replay that stale blast as a burst.
  assert.match(pulseSource, /export function blast/);
  for (const [name, source] of [['Crystal', crystal], ['Sparks', sparks]]) {
    assert.match(source, /const lastPulse = useRef\(pulse\.t\)/, `${name} must seed lastPulse from pulse.t`);
    assert.doesNotMatch(source, /lastPulse = useRef\(0\)/, `${name} must not start lastPulse at 0`);
    assert.match(source, /pulse\.t !== lastPulse\.current/, `${name} still reacts to blasts that land while mounted`);
  }
});

test('CameraRig resets its module-level look target on mount (R12)', () => {
  // curLook is pre-allocated at module scope (no allocation in useFrame), so
  // it must be re-seeded explicitly: nothing else clears it between visits.
  assert.match(rig, /^const curLook = new THREE\.Vector3\(0, 0, 0\);$/m);
  assert.match(rig, /useLayoutEffect\(\(\) => \{\s*curLook\.set\(0, 0, 0\);\s*\}, \[\]\);/);
  const frameBody = rig.slice(rig.indexOf('useFrame('));
  assert.doesNotMatch(frameBody, /new THREE\./, 'no allocation inside useFrame');
});

test('CameraRig releases the parallax offset when a touch or pen pointer ends (R19)', () => {
  assert.match(rig, /addEventListener\('pointerup', onRelease\)/);
  assert.match(rig, /addEventListener\('pointercancel', onRelease\)/);
  assert.match(rig, /removeEventListener\('pointerup', onRelease\)/);
  assert.match(rig, /removeEventListener\('pointercancel', onRelease\)/);
  const release = rig.slice(rig.indexOf('const onRelease'), rig.indexOf("window.addEventListener('pointermove'"));
  assert.match(release, /e\.pointerType === 'mouse'\) return/);
  assert.match(release, /pointerState\.x = 0/);
  assert.match(release, /pointerState\.y = 0/);
});

test('reduced motion gates the camera parallax and the backdrop (R7)', () => {
  assert.match(rig, /pointerState\.x \* 0\.55 \* motionScale\.value/);
  assert.match(rig, /-pointerState\.y \* 0\.35 \* motionScale\.value/);
  // Only the backdrop's self-running spin stops under reduced motion. Eco
  // devices keep it (passing quality.animate would freeze it for every
  // 4-core phone, a visible change), and the scroll-driven hue and depth stay
  // so the camera never leaves the shell.
  assert.match(backdrop, /rotation\.y \+= dt \* 0\.015 \* motionScale\.value/);
  assert.match(backdrop, /rotation\.x \+= dt \* 0\.006 \* motionScale\.value/);
  assert.match(backdrop, /position\.z = -50 \+ scrollState\.progress \* -50/);
  assert.match(scene, /<BackdropMorph \/>/);
});

test('Approach refreshes ScrollTrigger once its accordion height settles (R9)', () => {
  assert.match(approach, /ScrollTrigger\.refresh\(\)/);
  assert.match(approach, /\[openIndex\]\);/);
  // A single timer per toggle, cleared by the effect teardown: debounced, and
  // never a per-frame refresh or a second rAF loop.
  assert.match(approach, /window\.setTimeout\(\(\) => ScrollTrigger\.refresh\(\), APPROACH_SETTLE_MS\)/);
  assert.match(approach, /return \(\) => window\.clearTimeout\(timer\)/);
  assert.doesNotMatch(approach, /requestAnimationFrame|gsap\.ticker/);
});

test('the Approach refresh delay covers the panel transition it waits for', () => {
  const delay = Number(/export const APPROACH_SETTLE_MS = (\d+);/.exec(approach)?.[1]);
  const seconds = Number(/\.approach-step-panel \{[^}]*transition:\s*grid-template-rows\s+([\d.]+)s/.exec(approachCss)?.[1]);
  assert.ok(Number.isFinite(delay), 'APPROACH_SETTLE_MS is exported as a number literal');
  assert.ok(Number.isFinite(seconds), 'approach.css still animates .approach-step-panel grid-template-rows');
  assert.ok(delay >= seconds * 1000, `refresh delay ${delay}ms must be >= the ${seconds * 1000}ms height transition`);
});
