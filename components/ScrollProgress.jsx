'use client';

import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { scrollState } from '../lib/scrollState';

// Thin progress bar — styles set directly on the ref inside the shared
// ticker; no React state on the hot path.
//
// The homepage's "01/09" beat readout that used to live here moved into
// components/JourneyNav.jsx (visual Phase 1b), which names each section and
// makes it a real link instead of an aria-hidden number.
export default function ScrollProgress() {
  const bar = useRef(null);

  useEffect(() => {
    const tick = () => {
      if (bar.current) bar.current.style.transform = `scaleX(${scrollState.progress})`;
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);

  return (
    // aria-hidden: the bar restates scroll position that assistive tech
    // already gets from the document's landmarks and headings.
    <div className="scroll-progress" aria-hidden="true">
      <div ref={bar} className="scroll-progress-bar" />
    </div>
  );
}
