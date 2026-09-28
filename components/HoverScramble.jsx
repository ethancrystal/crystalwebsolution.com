'use client';

import { useEffect, useRef } from 'react';
import { SCRAMBLE_STEPS, SCRAMBLE_STEP_MS, scrambleFrame } from '../lib/scramble.mjs';

// Wraps a short text label (nav link, button) and scrambles it on hover of
// its nearest link/button. The visible glyphs are aria-hidden; a visually
// hidden copy keeps the accessible name stable. Width is locked during the
// scramble so neighbouring links never shift. Disabled for reduced motion.
export default function HoverScramble({ children, className = '' }) {
  const text = typeof children === 'string' ? children : String(children ?? '');
  const visualRef = useRef(null);

  useEffect(() => {
    const visual = visualRef.current;
    if (!visual) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    const host = visual.closest('a, button') || visual.parentElement;
    let timer = 0;

    const stop = () => {
      window.clearInterval(timer);
      timer = 0;
      visual.textContent = text;
      visual.style.minWidth = '';
    };

    const play = () => {
      if (timer) return;
      visual.style.minWidth = `${visual.getBoundingClientRect().width}px`;
      let step = 0;
      visual.textContent = scrambleFrame(text);
      timer = window.setInterval(() => {
        step += 1;
        if (step >= SCRAMBLE_STEPS) stop();
        else visual.textContent = scrambleFrame(text);
      }, SCRAMBLE_STEP_MS);
    };

    host.addEventListener('mouseenter', play);
    return () => {
      host.removeEventListener('mouseenter', play);
      stop();
    };
  }, [text]);

  return (
    <span className={`hover-scramble ${className}`.trim()}>
      <span className="sr-only">{text}</span>
      <span ref={visualRef} className="hover-scramble-visual" aria-hidden="true">{text}</span>
    </span>
  );
}
