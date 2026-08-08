'use client';

// ProcessRail — Process page only. A vertical "path" rail that runs
// alongside the six numbered steps and fills as the visitor scrolls
// through them, echoing this page's subject: a straight path from idea
// to outcome. Scroll range is scrubbed against the steps <ol> itself
// (via stepsRef), following the ScrollTrigger + cleanup convention used
// throughout the codebase (see components/Reveal.jsx).
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function ProcessRail({ stepsRef }) {
  const fillRef = useRef(null);

  useEffect(() => {
    const target = stepsRef?.current;
    const fill = fillRef.current;
    if (!target || !fill) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.set(fill, { scaleY: 1 });
      return;
    }

    gsap.set(fill, { scaleY: 0 });

    const trigger = ScrollTrigger.create({
      trigger: target,
      start: 'top 75%',
      end: 'bottom 60%',
      scrub: true,
      onUpdate: (self) => {
        gsap.set(fill, { scaleY: self.progress });
      },
    });

    return () => {
      trigger.kill();
      gsap.killTweensOf(fill);
    };
  }, [stepsRef]);

  return (
    <div className="process-rail" aria-hidden="true">
      <span className="process-rail-track" />
      <span ref={fillRef} className="process-rail-fill" />
    </div>
  );
}
