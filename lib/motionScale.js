// Canvas-side prefers-reduced-motion gate. The DOM half of the site checks
// the media query per component (RevealPop, Approach, Motion, globals.css)
// but the WebGL scene never did. 3D consumers multiply their velocity-driven
// effects by motionScale.value (1 = full motion, 0 = reduced) instead of
// re-querying — read per frame, and it updates live if the OS setting
// changes mid-session.
export const motionScale = { value: 1 };

if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  const apply = () => {
    motionScale.value = mq.matches ? 0 : 1;
  };
  apply();
  if (typeof mq.addEventListener === 'function') mq.addEventListener('change', apply);
}
