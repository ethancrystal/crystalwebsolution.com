// Shared handle so Loader (mounted above SmoothScroll's Lenis instance in the
// tree, so its own mount effect can run before Lenis exists) can pause/resume
// scroll input regardless of mount order. `locked` is the source of truth;
// `api` is whatever SmoothScroll currently owns (Lenis's stop/start, or null
// in native-scroll/reduced-motion mode, which never locks in the first
// place). CSS handles the pre-hydration case on its own — see
// app/styles/cursor-loader.css's `html[data-scroll-unlocked]` rule, which
// defaults to locked (overflow: hidden) before any JS has run.
export const scrollLock = { locked: false, api: null };

export function lockScroll() {
  scrollLock.locked = true;
  delete document.documentElement.dataset.scrollUnlocked;
  scrollLock.api?.stop();
}

export function unlockScroll() {
  scrollLock.locked = false;
  document.documentElement.dataset.scrollUnlocked = '1';
  scrollLock.api?.start();
}

export function registerScrollApi(api) {
  scrollLock.api = api;
  if (scrollLock.locked) api.stop();
  else api.start();
}
