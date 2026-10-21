import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { BEAT_IDS, beatProgress, currentBeatIndex, measureBeats, sectionTop } from '../lib/beatProgress.js';
import { MOTION_WINDOW } from '../lib/journey.js';

// A 10000px document shaped like the homepage: the production story (the hero
// beat) runs 6000px, then Capabilities (lab) at 6000, Motion at 7000 and
// Contact at 9000, so beatProgress lands on tidy tenths. Motion is 2800px and
// therefore has real sticky travel. That gives MOTION_WINDOW.end = 0.88.
const BEAT_TOPS = { hero: 0, lab: 6000, motion: 7000, contact: 9000 };

function withMeasuredBeats(run) {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const tops = new Map(BEAT_IDS.map((id) => [id, BEAT_TOPS[id]]));

  globalThis.window = { scrollY: 0, innerHeight: 1000 };
  globalThis.document = {
    getElementById(id) {
      if (!tops.has(id)) return null;
      return {
        offsetHeight: id === 'motion' ? 2800 : 1000,
        offsetTop: tops.get(id),
        offsetParent: null,
        // What a rect would report while SectionHandoff holds the section
        // 16px low. measureBeats must ignore it.
        getBoundingClientRect: () => ({ top: tops.get(id) + 16 }),
      };
    },
  };

  try {
    measureBeats(10000);
    run();
  } finally {
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
  }
}

test('currentBeatIndex maps scroll progress onto the measured beats', () => {
  withMeasuredBeats(() => {
    assert.equal(currentBeatIndex(0), 0);
    assert.equal(currentBeatIndex(0.05), 0);
    // A beat becomes current the moment its measured top is reached — the same
    // `p >= beatProgress[id]` threshold CameraRig uses to pick its segment.
    assert.equal(currentBeatIndex(0.45), 0);
    assert.equal(currentBeatIndex(beatProgress.lab), BEAT_IDS.indexOf('lab'));
    assert.equal(currentBeatIndex(0.65), BEAT_IDS.indexOf('lab'));
    assert.equal(currentBeatIndex(0.72), BEAT_IDS.indexOf('motion'));
  });
});

test('breakpoints are layout tops: transforms and nesting do not move them', () => {
  withMeasuredBeats(() => {
    // The stub's rects are 16px low; the breakpoints must not be.
    assert.equal(beatProgress.lab, 0.6);
    assert.equal(beatProgress.motion, 0.7);
  });
  // offsetTop is relative to the offsetParent, so nested offsets add up.
  const parent = { offsetTop: 900, offsetParent: null };
  assert.equal(sectionTop({ offsetTop: 100, offsetParent: parent }), 1000);
});

test('SmoothScroll jumps homepage sections to the same top the beats use', () => {
  const source = readFileSync(new URL('../components/SmoothScroll.jsx', import.meta.url), 'utf8');
  assert.match(source, /lenis\.scrollTo\(BEAT_IDS\.includes\(target\.id\) \? sectionTop\(target\) : target/);
});

test('a jump that lands a sub-pixel short of a section still names it', () => {
  withMeasuredBeats(() => {
    // 10000px page: motion starts at 7000px = 0.7.
    assert.equal(currentBeatIndex((7000 - 0.4) / 10000), BEAT_IDS.indexOf('motion'));
    assert.equal(currentBeatIndex((7000 - 1.9) / 10000), BEAT_IDS.indexOf('motion'));
    // Beyond the 2px slack it is still the section above.
    assert.equal(currentBeatIndex((7000 - 3) / 10000), BEAT_IDS.indexOf('lab'));
  });
});

// Lenis updates its limit on its own debounced observer, after SmoothScroll's
// body observer has already fired, so the beats must re-measure when the
// limit itself moves or they stay at their evenly-spaced defaults.
test('SmoothScroll re-measures the beats whenever Lenis\'s limit changes', () => {
  const source = readFileSync(new URL('../components/SmoothScroll.jsx', import.meta.url), 'utf8');
  assert.match(source, /if \(limit !== lastLimit\) \{\s*lastLimit = limit;\s*remeasure\(\);\s*scrollState\.progress = lenis\.progress;/);
  assert.match(source, /new ResizeObserver\(remeasure\)/);
});

test('the last beat is reachable despite contact being pinned to 1', () => {
  withMeasuredBeats(() => {
    const last = BEAT_IDS.length - 1;
    // measureBeats pins beatProgress.contact to exactly 1, so a rule that
    // compared against it would only ever match the document's final pixel.
    assert.equal(beatProgress.contact, 1);
    assert.ok(MOTION_WINDOW.end < 1);

    // Motion holds for the whole of its sticky pin...
    assert.equal(currentBeatIndex(0.75), BEAT_IDS.indexOf('motion'));
    assert.equal(currentBeatIndex(MOTION_WINDOW.end - 0.001), BEAT_IDS.indexOf('motion'));
    // ...and hands over to Contact when that pin releases.
    assert.equal(currentBeatIndex(MOTION_WINDOW.end), last);
    assert.equal(currentBeatIndex(0.95), last);
    assert.equal(currentBeatIndex(1), last);
  });
});

test('currentBeatIndex stays in range for overscroll and bad input', () => {
  withMeasuredBeats(() => {
    const last = BEAT_IDS.length - 1;
    // Lenis reports past both ends during rubber-band overscroll, and hands
    // over a NaN fraction for a frame while the page is re-measured.
    for (const bad of [-0.5, -0.001, 1.001, 1.5, NaN]) {
      const i = currentBeatIndex(bad);
      assert.ok(Number.isInteger(i), `${bad} produced a non-integer index`);
      assert.ok(i >= 0 && i <= last, `${bad} produced out-of-range index ${i}`);
    }
    assert.equal(currentBeatIndex(-0.5), 0);
    assert.equal(currentBeatIndex(1.5), last);
  });
});

test('currentBeatIndex never runs backwards as the page scrolls forward', () => {
  withMeasuredBeats(() => {
    let previous = 0;
    for (let step = 0; step <= 1000; step++) {
      const i = currentBeatIndex(step / 1000);
      assert.ok(i >= previous, `index fell from ${previous} to ${i} at ${step / 1000}`);
      previous = i;
    }
    // The sweep has to actually arrive at the final beat, not stall early.
    assert.equal(previous, BEAT_IDS.length - 1);
  });
});

// The old aria-hidden "01/09" readout moved into JourneyNav (visual Phase 1b),
// which only the homepage mounts: beatProgress is measured from the homepage's
// section ids, so on a subpage every breakpoint keeps its evenly-spaced
// default and a section readout would render confident nonsense.
test('only the homepage mounts the section readout', () => {
  const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

  assert.match(read('../components/Experience.jsx'), /<JourneyNav \/>/);
  assert.match(read('../components/Experience.jsx'), /<ScrollProgress \/>/);
  assert.doesNotMatch(read('../components/marketing/SubpageExperience.jsx'), /JourneyNav/);
  assert.doesNotMatch(read('../components/ScrollProgress.jsx'), /sections|currentBeatIndex/);
});
