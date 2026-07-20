import test from 'node:test';
import assert from 'node:assert/strict';

const featureModule = await import('../lib/experienceFeatures.mjs').catch(() => ({}));
const layoutModule = await import('../lib/flyingCarouselLayout.mjs').catch(() => ({}));
const motionModule = await import('../lib/motionFlight.mjs').catch(() => ({}));
const studiesModule = await import('../lib/motionStudies.mjs').catch(() => ({}));

test('latest experience features default to the additive WebGL carousel', () => {
  assert.equal(typeof featureModule.resolveExperienceFeatures, 'function');
  if (!featureModule.resolveExperienceFeatures) return;

  assert.deepEqual(
    featureModule.resolveExperienceFeatures({
      search: '',
      compact: false,
      reducedMotion: false,
      webgl: true,
    }),
    { flyingCarousel: true },
  );
});

test('legacy query mode restores the preserved carousel implementation', () => {
  assert.equal(typeof featureModule.resolveExperienceFeatures, 'function');
  if (!featureModule.resolveExperienceFeatures) return;

  assert.deepEqual(
    featureModule.resolveExperienceFeatures({
      search: '?features=legacy',
      compact: false,
      reducedMotion: false,
      webgl: true,
    }),
    { flyingCarousel: false },
  );
});

test('compact and reduced-motion modes retain the SVG carousel fallback', () => {
  assert.equal(typeof featureModule.resolveExperienceFeatures, 'function');
  if (!featureModule.resolveExperienceFeatures) return;

  const compact = featureModule.resolveExperienceFeatures({
    search: '',
    compact: true,
    reducedMotion: false,
    webgl: true,
  });
  const reduced = featureModule.resolveExperienceFeatures({
    search: '',
    compact: false,
    reducedMotion: true,
    webgl: true,
  });

  assert.equal(compact.flyingCarousel, false);
  assert.equal(reduced.flyingCarousel, false);
});

test('carousel query switch and missing WebGL fail closed', () => {
  assert.equal(typeof featureModule.resolveExperienceFeatures, 'function');
  if (!featureModule.resolveExperienceFeatures) return;

  assert.deepEqual(
    featureModule.resolveExperienceFeatures({
      search: '?motion=legacy',
      compact: false,
      reducedMotion: false,
      webgl: true,
    }),
    { flyingCarousel: false },
  );
  assert.deepEqual(
    featureModule.resolveExperienceFeatures({
      search: '',
      compact: false,
      reducedMotion: false,
      webgl: false,
    }),
    { flyingCarousel: false },
  );
});

test('carousel layout is deterministic and lands six landscape cards in a 3 by 2 grid', () => {
  assert.equal(typeof layoutModule.createFlyingCarouselLayout, 'function');
  if (!layoutModule.createFlyingCarouselLayout) return;

  const first = layoutModule.createFlyingCarouselLayout({ viewportWidth: 10 });
  const second = layoutModule.createFlyingCarouselLayout({ viewportWidth: 10 });

  assert.deepEqual(first, second);
  assert.equal(first.length, 6);
  assert.equal(layoutModule.CARD_WIDTH / layoutModule.CARD_HEIGHT, 1.44);
  assert.deepEqual([...new Set(first.map((card) => card.target.position[0]))].sort((a, b) => a - b).length, 3);
  assert.deepEqual([...new Set(first.map((card) => card.target.position[1]))].sort((a, b) => a - b).length, 2);
  for (const card of first) {
    assert.equal(card.target.position[2], 0);
    assert.deepEqual(card.target.rotation, [0, 0, 0]);
  }
  assert.ok(first.some((card) => Math.abs(card.scatter.position[2]) >= 4));
});

test('carousel flyby is seeded and contracts with a narrower viewport', () => {
  const wide = layoutModule.createFlyingCarouselLayout({ viewportWidth: 10, seed: 41 });
  const repeated = layoutModule.createFlyingCarouselLayout({ viewportWidth: 10, seed: 41 });
  const alternate = layoutModule.createFlyingCarouselLayout({ viewportWidth: 10, seed: 42 });
  const narrow = layoutModule.createFlyingCarouselLayout({ viewportWidth: 7.2, seed: 41 });

  assert.deepEqual(wide, repeated);
  assert.notDeepEqual(wide, alternate);
  assert.ok(
    narrow.every((card, index) =>
      Math.abs(card.detach.position[0]) <= Math.abs(wide[index].detach.position[0]) &&
      Math.abs(card.detach.position[1]) <= Math.abs(wide[index].detach.position[1])),
  );
  assert.ok(Math.abs(narrow[0].flyby.scale / wide[0].flyby.scale - 0.72) < 1e-10);
  assert.ok(Math.abs(narrow[0].target.position[0]) < Math.abs(wide[0].target.position[0]));
});

test('carousel sampler preserves endpoints and runs a continuous depth orbit', () => {
  assert.equal(typeof layoutModule.createFlyingCarouselLayout, 'function');
  assert.equal(typeof layoutModule.sampleFlyingCard, 'function');
  if (!layoutModule.createFlyingCarouselLayout || !layoutModule.sampleFlyingCard) return;

  const [card] = layoutModule.createFlyingCarouselLayout({ viewportWidth: 10 });

  assert.deepEqual(layoutModule.sampleFlyingCard(card, 0), card.hold);
  assert.deepEqual(layoutModule.sampleFlyingCard(card, 1), card.target);

  const orbitA = layoutModule.sampleFlyingCard(card, 0.28);
  const orbitB = layoutModule.sampleFlyingCard(card, 0.42);
  assert.ok(orbitA.position.every(Number.isFinite));
  assert.ok(orbitA.rotation.every(Number.isFinite));
  assert.notDeepEqual(orbitA, orbitB);
  assert.notEqual(orbitA.position[2], orbitB.position[2]);

  const reusable = {
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: 0,
  };
  assert.equal(layoutModule.sampleFlyingCard(card, 0.35, reusable), reusable);
  assert.ok(reusable.position.every(Number.isFinite));
});

test('ribbon starts as a shallow rear arc before crossing the foreground', () => {
  const layout = layoutModule.createFlyingCarouselLayout({ viewportWidth: 10 });
  const rearArc = layout.map((card) =>
    layoutModule.sampleFlyingCard(card, layoutModule.FLIGHT_PHASES.ribbonIn),
  );

  assert.ok(rearArc.every((sample) => sample.position[2] < -1.5));
  assert.ok(rearArc.every((sample) => sample.scale < 0.75));

  const card = layout[0];
  const backLeg = layoutModule.sampleFlyingCard(card, 0.28);
  const rightTurn = layoutModule.sampleFlyingCard(card, 0.35);
  const frontLeg = layoutModule.sampleFlyingCard(card, 0.42);
  assert.ok(backLeg.position[0] < rightTurn.position[0]);
  assert.ok(frontLeg.position[0] < rightTurn.position[0]);
  assert.ok(frontLeg.position[2] > backLeg.position[2]);
  assert.ok(frontLeg.scale > backLeg.scale);
});

test('recording-derived phases finish the grid early and hold it', () => {
  const [card] = layoutModule.createFlyingCarouselLayout({ viewportWidth: 10 });
  const phases = layoutModule.FLIGHT_PHASES;

  assert.deepEqual(phases, {
    hold: 0.14,
    ribbonIn: 0.21,
    ribbonOut: 0.5,
    recede: 0.57,
    detach: 0.57,
    grid: 0.73,
  });
  assert.deepEqual(layoutModule.sampleFlyingCard(card, phases.grid), card.target);
  assert.deepEqual(layoutModule.sampleFlyingCard(card, 0.94), card.target);
});

test('shared motion studies preserve the six legacy study identities', () => {
  assert.ok(Array.isArray(studiesModule.MOTION_STUDIES));
  if (!Array.isArray(studiesModule.MOTION_STUDIES)) return;

  assert.equal(studiesModule.MOTION_STUDIES.length, 6);
  assert.deepEqual(
    studiesModule.MOTION_STUDIES.map((study) => study.id),
    ['signal', 'field', 'type', 'commerce', 'layers', 'motion'],
  );
});

test('motion flight state can be reset to the preserved SVG fallback', () => {
  assert.equal(typeof motionModule.resetMotionFlight, 'function');
  assert.ok(motionModule.motionFlight);
  if (!motionModule.resetMotionFlight || !motionModule.motionFlight) return;

  Object.assign(motionModule.motionFlight, {
    progress: 0.72,
    active: true,
    enabled: true,
    ready: true,
  });
  motionModule.resetMotionFlight();

  assert.deepEqual(motionModule.motionFlight, {
    progress: 0,
    active: false,
    enabled: false,
    ready: false,
  });
});

test('carousel compact breakpoint has no fractional-DPR gap below 768px', () => {
  assert.equal(featureModule.COMPACT_QUERY, '(max-width: 767.5px)');
});

test('motion flight observers receive readiness and active-state changes', () => {
  assert.equal(typeof motionModule.subscribeMotionFlight, 'function');
  assert.equal(typeof motionModule.updateMotionFlight, 'function');
  if (!motionModule.subscribeMotionFlight || !motionModule.updateMotionFlight) return;

  const snapshots = [];
  const unsubscribe = motionModule.subscribeMotionFlight((state) => {
    snapshots.push({ ready: state.ready, active: state.active });
  });
  motionModule.setMotionReady(true);
  motionModule.updateMotionFlight({ active: true });
  unsubscribe();
  motionModule.updateMotionFlight({ active: false });

  assert.deepEqual(snapshots, [
    { ready: true, active: false },
    { ready: true, active: true },
  ]);
  motionModule.resetMotionFlight();
});
