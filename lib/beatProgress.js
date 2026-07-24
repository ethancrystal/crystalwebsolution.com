// Measured scroll-fraction breakpoints for each camera beat / DOM section.
//
// journey.js's STOPS assumes every beat is an equal share of the page
// (index / (STOPS.length - 1)), but the sections vary wildly in height —
// Showcase alone holds a full project grid, dwarfing Hero or Services.
// CameraRig reads these measured breakpoints instead, so the camera (and
// anything windowed against a specific beat) stays locked to the section
// actually on screen, however long any one section's content grows or
// shrinks.
//
// Defaults are evenly spaced so nothing jumps before the first measurement
// resolves (it runs synchronously on mount, moments after paint).
export const BEAT_IDS = ['hero', 'about', 'facts', 'work', 'services', 'approach', 'stories', 'mark', 'recognition', 'motion', 'contact'];

export const beatProgress = {};
BEAT_IDS.forEach((id, i) => {
  beatProgress[id] = i / (BEAT_IDS.length - 1);
});

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
  beatProgress.contact = 1;
}
