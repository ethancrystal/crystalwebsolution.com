'use client';

import { useEffect } from 'react';
import { motion, useReducedMotion } from 'motion/react';

// Full-bleed loading placeholder for a homepage section. It has no fixed
// width/height of its own — CSS pins it to `inset: 0` inside the section's
// own (already `position: relative`) box, so a wide section gets a wide
// skeleton and a tall one gets a tall skeleton for free.
//
// Lifecycle: visible from first server-rendered paint, then hidden the
// instant this component's own mount effect flips `data-cws-hydrated` on
// <html> (see app/styles/section-skeleton.css). That flag marks the one
// real gap on a slow first load — SectionReveal's SSR'd `opacity: 0` inline
// style sitting inert until GSAP hydrates — not the intro curtain, which
// already covers the whole viewport on its own.
export default function SectionSkeleton() {
  const reduced = useReducedMotion();

  useEffect(() => {
    document.documentElement.dataset.cwsHydrated = '1';
  }, []);

  // The sweep element always renders so server and client markup match:
  // useReducedMotion() is null on the server but true on a reduced-motion
  // client's first render, and branching the tree on it was a hydration
  // mismatch (React #418). Reduced motion hides it in CSS and skips the tween.
  return (
    <div className="section-skeleton" aria-hidden="true">
      <motion.div
        className="section-skeleton-sweep"
        animate={reduced ? undefined : { x: ['-100%', '100%'] }}
        transition={{ duration: 1.6, ease: 'easeInOut', repeat: Infinity }}
      />
    </div>
  );
}
