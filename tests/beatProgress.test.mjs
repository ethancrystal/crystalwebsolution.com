import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { BEAT_IDS, beatProgress, currentBeatIndex, measureBeats } from '../lib/beatProgress.js';
import { MOTION_WINDOW } from '../lib/journey.js';

// Same stub shape as sectionArchitecture's flight-window test: every beat is
// 1000px tall at 1000px intervals in a 10000px document, so beatProgress lands
// on tidy tenths — except Motion, which is 2800px and therefore has real
// sticky travel. That gives MOTION_WINDOW.end = 0.88.
function withMeasuredBeats(run) {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const tops = new Map(BEAT_IDS.map((id, index) => [id, index * 1000]));

  globalThis.window = { scrollY: 0, innerHeight: 1000 };
  globalThis.document = {
    getElementById(id) {
      if (!tops.has(id)) return null;
      return {
        offsetHeight: id === 'motion' ? 2800 : 1000,
        getBoundingClientRect: () => ({ top: tops.get(id) }),
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
    assert.equal(currentBeatIndex(beatProgress.about), BEAT_IDS.indexOf('about'));
    assert.equal(currentBeatIndex(0.25), BEAT_IDS.indexOf('services'));
    assert.equal(currentBeatIndex(0.65), BEAT_IDS.indexOf('lab'));
  });
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

// The readout is opt-in because beatProgress is measured from the homepage's
// section ids. On a subpage none of them resolve, every breakpoint keeps its
// evenly-spaced default, and the count would render confident nonsense.
test('only the homepage opts into the section readout', () => {
  const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

  assert.match(read('../components/Experience.jsx'), /<ScrollProgress sections \/>/);
  assert.match(read('../components/marketing/SubpageExperience.jsx'), /<ScrollProgress \/>/);
  assert.match(read('../components/ScrollProgress.jsx'), /sections = false/);
});
