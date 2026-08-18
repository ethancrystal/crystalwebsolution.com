// Measured scroll-fraction breakpoints for each camera beat / DOM section.
//
// journey.js's STOPS assumes every beat is an equal share of the page
// (index / (STOPS.length - 1)), but the sections vary wildly in height.
// CameraRig reads these measured breakpoints instead, so the camera (and
// anything windowed against a specific beat) stays locked to the section
// actually on screen, however long any one section's content grows or
// shrinks.
//
// Defaults are evenly spaced so nothing jumps before the first measurement
// resolves (it runs synchronously on mount, moments after paint).
import { LAB_WINDOW, MOTION_WINDOW } from './journey.js';

export const BEAT_IDS = ['hero', 'about', 'services', 'approach', 'stories', 'mark', 'lab', 'motion', 'contact'];

export const beatProgress = {};
BEAT_IDS.forEach((id, i) => {
  beatProgress[id] = i / (BEAT_IDS.length - 1);
});

// The lab and motion beats hold a sticky stage while their tall sections
// scroll past. Each window spans from the section's top to the point where
// its sticky travel ends, expressed in the same progress baseline.
function measureStickyWindow(flightWindow, id, limit, fallbackEnd) {
  flightWindow.start = beatProgress[id];
  const el = document.getElementById(id);
  if (el) {
    const top = el.getBoundingClientRect().top + window.scrollY;
    const stickyTravel = Math.max(el.offsetHeight - window.innerHeight, 1);
    flightWindow.end = Math.min(
      1,
      Math.max((top + stickyTravel) / limit, flightWindow.start + 0.0001),
    );
  } else {
    flightWindow.end = Math.max(fallbackEnd, flightWindow.start + 0.0001);
  }
}

// Which beat the viewer is on, as an index into BEAT_IDS.
//
// `progress` is scrollState.progress — lenis.scroll / lenis.limit — and every
// breakpoint in `beatProgress` is measured against that same `lenis.limit`
// baseline (see measureBeats below), so the two are directly comparable.
//
// ScrollProgress calls this from the shared gsap.ticker, so it runs every
// frame: no allocation, and nothing that builds an intermediate array.
export function currentBeatIndex(progress) {
  const last = BEAT_IDS.length - 1;
  // Also coerces NaN to 0 — Lenis can hand over a bad fraction for a frame
  // while the page is being re-measured, and a NaN index renders as text.
  const p = progress > 1 ? 1 : progress > 0 ? progress : 0;

  // Contact's own breakpoint is pinned to exactly 1 by measureBeats, so
  // comparing against it would only ever match on the document's final pixel
  // and the last beat would be unreachable. Motion's sticky travel ends where
  // Contact starts scrolling, which is the honest boundary.
  if (p >= MOTION_WINDOW.end) return last;

  // Otherwise the same ascending-threshold walk CameraRig uses to pick its
  // segment, so the number flips on the frame the camera leaves for the next
  // stop rather than drifting a section out of step with it. Walked in
  // reverse to return on the first match; hero sits at 0 and is the floor.
  for (let i = last - 1; i > 0; i--) {
    if (p >= beatProgress[BEAT_IDS[i]]) return i;
  }
  return 0;
}

// `limit` must be Lenis's own `lenis.limit` (its max scroll value), not an
// independently-measured document height — scrollState.progress is computed
// as `lenis.scroll / lenis.limit`, so beatProgress has to share that exact
// baseline or the two numbers drift apart and every comparison against them
// (CameraRig's segment lookup, per-beat windows) goes stale.
export function measureBeats(limit) {
  if (typeof window === 'undefined' || !limit || limit <= 0) return;
  for (const id of BEAT_IDS) {
    const el = document.getElementById(id);
    if (!el) continue;
    const top = el.getBoundingClientRect().top + window.scrollY;
    beatProgress[id] = Math.min(1, Math.max(0, top / limit));
  }
  beatProgress.hero = 0;
  measureStickyWindow(LAB_WINDOW, 'lab', limit, beatProgress.motion);
  measureStickyWindow(MOTION_WINDOW, 'motion', limit, beatProgress.contact);
  beatProgress.contact = 1;
}
