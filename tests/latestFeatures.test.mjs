import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const featureModule = await import('../lib/experienceFeatures.mjs').catch(() => ({}));
const layoutModule = await import('../lib/flyingCarouselLayout.mjs').catch(() => ({}));
const motionModule = await import('../lib/motionFlight.mjs').catch(() => ({}));
const studiesModule = await import('../lib/motionStudies.mjs').catch(() => ({}));
const qualityModule = await import('../lib/renderQuality.mjs').catch(() => ({}));
const activityModule = await import('../lib/sceneActivity.mjs').catch(() => ({}));
const motionLayoutModule = await import('../lib/motionLayout.mjs').catch(() => ({}));
const globalCss = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');
const motionSource = readFileSync(new URL('../components/sections/Motion.jsx', import.meta.url), 'utf8');
const navSource = readFileSync(new URL('../components/Nav.jsx', import.meta.url), 'utf8');

test('navigation uses the supplied full logo and menu icon artwork', () => {
  assert.ok(existsSync(new URL('../public/crystal-web-solution-logo.svg', import.meta.url)));
  assert.ok(existsSync(new URL('../public/crystal-web-solution-icon.svg', import.meta.url)));
  assert.match(navSource, /crystal-web-solution-logo\.svg/);
  assert.match(navSource, /crystal-web-solution-icon\.svg/);
});

test('short desktop viewports keep the Stories heading below the fixed navigation', () => {
  assert.match(
    globalCss,
    /@media \(min-width: 768px\) and \(max-height: 720px\)[\s\S]*?\.stories\s*\{[^}]*justify-content:\s*flex-start;[^}]*padding-top:\s*max\(7rem, 14vh\);/,
  );
});

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

test('compact devices keep WebGL off while reduced motion retains the static fallback', () => {
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

test('phones retain a flying SVG timeline unless motion is reduced', () => {
  assert.equal(typeof motionLayoutModule.shouldUseStaticMotionLayout, 'function');
  assert.equal(motionLayoutModule.DEFAULT_MOTION_LAYOUT, 'animated');
  if (!motionLayoutModule.shouldUseStaticMotionLayout) return;

  const compact = featureModule.resolveExperienceFeatures({
    compact: true,
    reducedMotion: false,
    webgl: true,
  });
  const compactWithoutWebGL = featureModule.resolveExperienceFeatures({
    compact: true,
    reducedMotion: false,
    webgl: false,
  });
  const compactReduced = featureModule.resolveExperienceFeatures({
    compact: true,
    reducedMotion: true,
    webgl: true,
  });

  assert.equal(compact.flyingCarousel, false);
  assert.equal(compactWithoutWebGL.flyingCarousel, false);
  assert.equal(compactReduced.flyingCarousel, false);

  assert.equal(
    motionLayoutModule.shouldUseStaticMotionLayout({
      reducedMotion: false,
      flyingCarousel: compact.flyingCarousel,
    }),
    false,
  );
  assert.equal(
    motionLayoutModule.shouldUseStaticMotionLayout({
      reducedMotion: true,
      flyingCarousel: compactReduced.flyingCarousel,
    }),
    true,
  );
  assert.equal(
    motionLayoutModule.shouldUseStaticMotionLayout({
      reducedMotion: true,
      flyingCarousel: true,
    }),
    false,
  );
});

test('reduced-motion CSS blocks the SMIL flight before hydration', () => {
  const legacyReducedSelector = ".motion:not([data-motion-renderer='webgl'])";

  assert.ok(globalCss.includes(`${legacyReducedSelector} .motion-smil-stage { display: none; }`));
  assert.ok(globalCss.includes(`${legacyReducedSelector} .motion-static-grid {`));
  assert.ok(motionSource.includes('className="motion-static-grid" data-motion-static-grid aria-hidden="false"'));
});

test('explicit full-motion preview opts into the WebGL carousel', () => {
  assert.equal(typeof featureModule.resolveExperienceFeatures, 'function');
  if (!featureModule.resolveExperienceFeatures) return;

  assert.deepEqual(
    featureModule.resolveExperienceFeatures({
      search: '?motion=full',
      compact: false,
      reducedMotion: true,
      webgl: true,
    }),
    { flyingCarousel: true },
  );
  assert.deepEqual(
    featureModule.resolveExperienceFeatures({
      search: '?motion=full',
      compact: true,
      reducedMotion: false,
      webgl: true,
    }),
    { flyingCarousel: false },
  );
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
      compact: true,
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

test('settled carousel grid is enlarged and unobscured after the flight', () => {
  const layout = layoutModule.createFlyingCarouselLayout({ viewportWidth: 10 });
  const narrowLayout = layoutModule.createFlyingCarouselLayout({
    viewportWidth: 10,
    viewportPixelWidth: 820,
  });

  assert.equal(layoutModule.SETTLED_SCALE_BOOST, 1.18);
  assert.ok(layout.every((card) => card.target.scale === 1.18));
  assert.ok(narrowLayout.every((card) => card.target.scale === 1));
  assert.match(
    globalCss,
    /motion\[data-motion-renderer='webgl'\]\[data-motion-stage='grid'\]\s*\{[^}]*background:\s*transparent;/s,
  );
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
    grid: 0.78,
  });
  assert.deepEqual(layoutModule.sampleFlyingCard(card, phases.grid), card.target);
  assert.deepEqual(layoutModule.sampleFlyingCard(card, 0.94), card.target);
});

test('carousel cards enter and settle one by one with equal smooth timing windows', () => {
  assert.equal(typeof studiesModule.createMotionStudyTiming, 'function');
  if (!studiesModule.createMotionStudyTiming) return;

  const layout = layoutModule.createFlyingCarouselLayout({ viewportWidth: 10 });
  assert.deepEqual(
    layout.map((card) => Number(card.revealDelay.toFixed(3))),
    [0, 0.012, 0.024, 0.036, 0.048, 0.06],
  );
  assert.deepEqual(
    layout.map((card) => Number(card.settleDelay.toFixed(3))),
    [0, 0.018, 0.036, 0.054, 0.072, 0.09],
  );

  const revealMoment = layoutModule.FLIGHT_PHASES.hold + 0.045;
  const revealScales = layout.map((card) =>
    layoutModule.sampleFlyingCard(card, revealMoment).scale,
  );
  assert.ok(revealScales[0] > revealScales[2]);
  assert.ok(revealScales[2] > revealScales[4]);

  const timings = studiesModule.MOTION_STUDIES.map((_, index) =>
    studiesModule.createMotionStudyTiming(index),
  );
  const starts = timings.map(({ revealStart }) => revealStart);
  const settles = timings.map(({ settleStart }) => settleStart);
  assert.ok(starts.every((value, index) => index === 0 || value > starts[index - 1]));
  assert.ok(settles.every((value, index) => index === 0 || value > settles[index - 1]));
  timings.forEach(({ revealStart, revealEnd }) => {
    assert.ok(Math.abs(revealEnd - revealStart - 0.07) < 1e-10);
  });
});

test('returning carousel cards stay face-readable while assembling the grid', () => {
  const { recede, grid } = layoutModule.FLIGHT_PHASES;
  const maxVisibleYaw = 0.58;

  for (const viewportWidth of [10, 7.2]) {
    const layout = layoutModule.createFlyingCarouselLayout({ viewportWidth });
    for (const card of layout) {
      assert.ok(
        card.flyby.scale <= 1.3 * card.orbit.scaleFit,
        `card ${card.id} flyby scale ${card.flyby.scale} exceeds the readable emphasis cap at viewport ${viewportWidth}`,
      );

      for (let step = 0; step <= 120; step += 1) {
        const progress = recede + (grid - recede) * (step / 120);
        const sample = layoutModule.sampleFlyingCard(card, progress);
        if (sample.scale <= 0.2 * card.orbit.scaleFit) continue;

        assert.ok(
          Math.abs(sample.rotation[1]) <= maxVisibleYaw,
          `card ${card.id} becomes edge-on at progress ${progress.toFixed(4)} with yaw ${sample.rotation[1].toFixed(4)} at viewport ${viewportWidth}`,
        );
      }
    }
  }
});

test('carousel departure clears the frame without collapsing the flying cards', () => {
  for (const viewportWidth of [10, 7.2]) {
    const layout = layoutModule.createFlyingCarouselLayout({ viewportWidth });
    const departing = layout.map((card) =>
      layoutModule.sampleFlyingCard(card, 0.535),
    );
    const cleared = layout.map((card) =>
      layoutModule.sampleFlyingCard(card, 0.56),
    );

    // The departure remains readable through its midpoint, then clears the
    // viewport across both outer edges without shrinking out of existence.
    assert.ok(departing.some((sample) => sample.scale > 0.24 * layout[0].orbit.scaleFit));
    cleared.forEach((sample, index) => {
      const card = layout[index];
      const halfCardWidth = layoutModule.CARD_WIDTH * sample.scale * 0.5;
      assert.ok(sample.scale >= 0.2 * card.orbit.scaleFit);
      assert.ok(Math.abs(sample.position[0]) - halfCardWidth > viewportWidth * 0.5);
    });
    assert.ok(cleared.some((sample) => sample.position[0] < 0));
    assert.ok(cleared.some((sample) => sample.position[0] > 0));
  }
});

test('shared motion studies name six Crystal Web Solution capabilities', () => {
  assert.ok(Array.isArray(studiesModule.MOTION_STUDIES));
  if (!Array.isArray(studiesModule.MOTION_STUDIES)) return;

  assert.equal(studiesModule.MOTION_STUDIES.length, 6);
  assert.deepEqual(
    studiesModule.MOTION_STUDIES.map((study) => study.id),
    ['web-design', 'development', 'brand', 'motion', 'ai-automation', 'workflow-automation'],
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
    prewarm: true,
    ready: true,
  });
  motionModule.resetMotionFlight();

  assert.deepEqual(motionModule.motionFlight, {
    progress: 0,
    active: false,
    enabled: false,
    prewarm: false,
    ready: false,
  });
});

test('render quality policy favors frame stability deterministically', () => {
  assert.equal(typeof qualityModule.resolveRenderQuality, 'function');
  if (!qualityModule.resolveRenderQuality) return;

  const high = qualityModule.resolveRenderQuality({
    deviceMemory: 16,
    hardwareConcurrency: 12,
    devicePixelRatio: 1.5,
  });
  const balanced = qualityModule.resolveRenderQuality({
    deviceMemory: 8,
    hardwareConcurrency: 8,
    devicePixelRatio: 2,
  });
  const eco = qualityModule.resolveRenderQuality({
    reducedMotion: true,
    deviceMemory: 16,
    hardwareConcurrency: 12,
  });

  assert.equal(high.tier, 'high');
  assert.equal(high.maxDpr, 1.35);
  assert.equal(balanced.tier, 'balanced');
  assert.equal(eco.tier, 'eco');
  assert.equal(eco.animate, false);
  assert.equal(eco.postprocessing, 'off');
  assert.ok(high.particleCount > balanced.particleCount);
  assert.ok(balanced.particleCount > eco.particleCount);
});

test('scene activity windows overlap camera approaches but idle distant beats', () => {
  assert.equal(typeof activityModule.getBeatActivityWindow, 'function');
  assert.equal(typeof activityModule.isBeatActive, 'function');
  assert.equal(typeof activityModule.isBeatProgressActive, 'function');
  if (
    !activityModule.getBeatActivityWindow ||
    !activityModule.isBeatActive ||
    !activityModule.isBeatProgressActive
  ) return;

  const beatIds = ['hero', 'work', 'motion', 'contact'];
  const beatProgress = { hero: 0, work: 0.25, motion: 0.75, contact: 1 };
  const window = activityModule.getBeatActivityWindow({
    beatId: 'motion',
    beatIds,
    beatProgress,
  });

  assert.deepEqual(window, { start: 0.475, end: 0.9 });
  assert.equal(activityModule.isBeatActive({
    progress: 0.74,
    beatId: 'motion',
    beatIds,
    beatProgress,
  }), true);
  assert.equal(activityModule.isBeatActive({
    progress: 0.2,
    beatId: 'motion',
    beatIds,
    beatProgress,
  }), false);
  assert.equal(activityModule.isBeatActive({
    progress: 0.5,
    beatId: 'missing',
    beatIds,
    beatProgress,
  }), false);
  assert.equal(
    activityModule.isBeatProgressActive(
      0.74,
      'motion',
      beatIds,
      beatProgress,
    ),
    true,
  );
});

test('motion lifecycle distinguishes dormant preparation from active flight', () => {
  assert.equal(typeof motionModule.getMotionLifecycle, 'function');
  if (!motionModule.getMotionLifecycle) return;

  assert.equal(motionModule.getMotionLifecycle({ enabled: false }), 'disabled');
  assert.equal(motionModule.getMotionLifecycle({ enabled: true }), 'dormant');
  assert.equal(
    motionModule.getMotionLifecycle({ enabled: true, prewarm: true }),
    'prewarming',
  );
  assert.equal(
    motionModule.getMotionLifecycle({ enabled: true, prewarm: true, ready: true }),
    'ready',
  );
  assert.equal(
    motionModule.getMotionLifecycle({ enabled: true, ready: true, active: true }),
    'active',
  );
});

test('carousel compact breakpoint protects the lightweight phone renderer below 768px', () => {
  assert.equal(featureModule.COMPACT_QUERY, '(max-width: 767.99px)');
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
