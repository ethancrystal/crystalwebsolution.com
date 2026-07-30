'use client';

import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { scrollState } from '../lib/scrollState';

// Thin progress bar — styles set directly on the ref inside the shared
// ticker; no React state on the hot path.
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
    <div className="scroll-progress" aria-hidden="true">
      <div ref={bar} className="scroll-progress-bar" />
    </div>
  );
}
