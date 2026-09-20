// Tests for the inner-page service emblem system.
// Verifies the react-three-fiber emblems on /services/[slug] share the EXACT
// same signal geometry as the homepage 3D rail (single source of truth in
// lib/serviceSignalGeometry.mjs) — the visual "tie" the brief requires — and
// that every service signal resolves to a valid, non-empty, bounded geometry.
import test from 'node:test';
import assert from 'node:assert/strict';
import { SERVICES } from '../lib/services.mjs';
import { SERVICE_PAGES } from '../lib/servicePages.mjs';
import { SERVICE_SIGNAL_META } from '../lib/serviceSignals.mjs';
import {
  createSignalGeometries,
  getSignalGeometry,
} from '../lib/serviceSignalGeometry.mjs';

const SIGNAL_COUNT = SERVICES.length; // 8

test('every service signal maps to a valid, non-empty geometry', () => {
  const ordered = createSignalGeometries();
  assert.equal(ordered.length, SIGNAL_COUNT);
  for (const geometry of ordered) {
    assert.ok(geometry, 'geometry must exist');
    const pos = geometry.getAttribute('position');
    assert.ok(pos, 'geometry must have a position attribute');
    assert.ok(pos.count > 0, 'geometry must have vertices');
    // All vertices finite and within a sane bound (instruments are ~unit-sized).
    const arr = pos.array;
    for (let i = 0; i < arr.length; i++) {
      assert.ok(Number.isFinite(arr[i]), `vertex coord ${i} must be finite`);
      assert.ok(Math.abs(arr[i]) < 5, `vertex coord ${i} within bound`);
    }
  }
});

test('getSignalGeometry returns the same geometry instance the homepage rail uses', () => {
  const ordered = createSignalGeometries();
  SERVICES.forEach(({ signal }, i) => {
    const fromSignal = getSignalGeometry(signal);
    assert.equal(fromSignal, ordered[i], `signal ${signal} geometry must match homepage rail`);
  });
});

test('all 8 signals have motion metadata (rotSpeed / wireframe) and match the rail set', () => {
  for (const { signal } of SERVICES) {
    const meta = SERVICE_SIGNAL_META[signal];
    assert.ok(meta, `signal ${signal} must have motion metadata`);
    assert.ok(typeof meta.rotSpeed === 'number' && meta.rotSpeed > 0, 'rotSpeed must be a positive number');
  }
  // The motion set is exactly the 8 homepage signals plus the standalone
  // inner-page pillars (lib/servicePages.mjs `standalone: true`) — no drift.
  const standaloneSignals = SERVICE_PAGES.filter((p) => p.standalone).map((p) => p.signal);
  const railSignals = SERVICES.map(({ signal }) => signal);
  assert.deepEqual(
    Object.keys(SERVICE_SIGNAL_META).sort(),
    [...railSignals, ...standaloneSignals].sort(),
  );
  for (const { signal } of SERVICES) {
    assert.ok(SERVICE_SIGNAL_META[signal], `signal ${signal} present in meta`);
  }
});

test('standalone pillar signals get an inner-page geometry but never join the rail', () => {
  const standalone = SERVICE_PAGES.filter((p) => p.standalone);
  assert.ok(standalone.length >= 1, 'expected at least the seo pillar');
  const ordered = createSignalGeometries();
  assert.equal(ordered.length, SIGNAL_COUNT, 'rail must stay at SERVICES.length');
  for (const { signal } of standalone) {
    assert.ok(!SERVICES.some((s) => s.signal === signal), `${signal} must not be a SERVICES signal`);
    const geometry = getSignalGeometry(signal);
    assert.ok(geometry?.attributes?.position?.count > 0, `${signal} geometry must be non-empty`);
    assert.ok(!ordered.includes(geometry), `${signal} geometry must not be in the rail array`);
    assert.ok(SERVICE_SIGNAL_META[signal]?.rotSpeed > 0, `${signal} needs motion metadata`);
  }
});

test('the torus-knot signal (motion) is the only wireframe emblem, matching the rail', () => {
  const wireframeSignals = SERVICES.filter(
    ({ signal }) => SERVICE_SIGNAL_META[signal]?.wireframe === true,
  ).map(({ signal }) => signal);
  assert.deepEqual(wireframeSignals, ['motion'], 'only "motion" should be wireframe');
});

test('unknown signal throws rather than silently falling back', () => {
  assert.throws(() => getSignalGeometry('does-not-exist'), /Missing service signal geometry/);
});
