// One-shot (non-reactive) guard used at effect-mount time to skip pointer-
// driven or motion-heavy setup on touch devices and for users who asked for
// reduced motion. Deliberately a plain function, not a hook: every call site
// checks once when its effect runs, the same as the duplicated inline check
// it replaces — it does not re-render or re-subscribe when the media query
// changes mid-session. A component that needs to react live to the query
// changing (e.g. ServiceEmblem3D's own matchMedia listener) needs its own
// reactive hook, not this.
export function skipsPointerAnimation() {
  return (
    window.matchMedia('(pointer: coarse)').matches
    || window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}
