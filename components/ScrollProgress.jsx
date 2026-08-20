'use client';

import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { scrollState } from '../lib/scrollState';
import { BEAT_IDS, currentBeatIndex } from '../lib/beatProgress';

const pad = (n) => String(n).padStart(2, '0');
const TOTAL = pad(BEAT_IDS.length);

// Thin progress bar — styles set directly on the ref inside the shared
// ticker; no React state on the hot path.
//
// `sections` opts into the beat readout, and only the homepage may pass it:
// beatProgress is measured from the nine homepage section ids, so on a
// subpage every breakpoint keeps its evenly-spaced default and the count
// would render plausible numbers that mean nothing.
export default function ScrollProgress({ sections = false }) {
  const bar = useRef(null);
  const count = useRef(null);

  useEffect(() => {
    // Last index written, so the readout only touches the DOM when the beat
    // actually changes. The bar's transform is cheap to set every frame; a
    // textContent write and the layout it invalidates are not.
    let shown = -1;

    const tick = () => {
      if (bar.current) bar.current.style.transform = `scaleX(${scrollState.progress})`;
      if (!count.current) return;
      const i = currentBeatIndex(scrollState.progress);
      if (i === shown) return;
      shown = i;
      count.current.textContent = pad(i + 1);
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);

  return (
    // aria-hidden: the bar and the count both restate scroll position that
    // assistive tech already gets from the document's landmarks and headings.
    // An aria-live value that changes on every beat would announce over the
    // content the reader is actually on.
    <div className="scroll-progress" aria-hidden="true">
      <div ref={bar} className="scroll-progress-bar" />
      {sections && (
        <p className="scroll-progress-count">
          <span ref={count} className="scroll-progress-index">01</span>
          <span className="scroll-progress-total">/{TOTAL}</span>
        </p>
      )}
    </div>
  );
}
