'use client';

import { useRef, useEffect, useState } from 'react';
import gsap from 'gsap';
import { lockScroll, unlockScroll } from '../lib/scrollLock';

// Intro loader: a spinning/breathing crystal-facet cube plays once per
// session while scroll input is held (see lib/scrollLock.js — Lenis is
// stopped and CSS locks native scroll from first paint), then the curtain
// lifts and scroll releases together. Timing (0.65s count, lift starting at
// 0.62s for 0.38s = 1.0s total) matches the previous word-cycle curtain
// exactly, since Hero.jsx's own reveal choreography (introDelay) is tuned
// against that total and isn't part of this change.
const SESSION_KEY = 'cws:intro-seen';

export default function Loader() {
  const root = useRef(null);
  const counter = useRef(null);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let seen = false;
    try {
      seen = window.sessionStorage.getItem(SESSION_KEY) === '1';
    } catch {
      // Storage may be unavailable in hardened/private browsing modes.
    }
    if (seen || reduced) {
      document.documentElement.dataset.cwsIntroSeen = '1';
    }
    if (reduced || seen) {
      unlockScroll();
      setGone(true);
      return undefined;
    }

    lockScroll();

    const tl = gsap.timeline({
      onComplete: () => {
        try {
          window.sessionStorage.setItem(SESSION_KEY, '1');
          document.documentElement.dataset.cwsIntroSeen = '1';
        } catch {
          // The intro remains non-blocking even if storage is unavailable.
        }
        unlockScroll();
        setGone(true);
      },
    });

    const count = { v: 0 };
    tl.to(count, {
      v: 100,
      duration: 0.65,
      ease: 'power2.inOut',
      onUpdate: () => {
        if (counter.current) counter.current.textContent = String(Math.round(count.v)).padStart(3, '0');
      },
    }, 0);

    tl.to(root.current, {
      yPercent: -100,
      duration: 0.38,
      ease: 'power4.inOut',
    }, 0.62);

    return () => {
      tl.kill();
      unlockScroll();
    };
  }, []);

  if (gone) return null;

  return (
    <div ref={root} className="loader" role="status" aria-live="polite">
      <span className="sr-only">Loading</span>
      <div className="loader-cube-scene" aria-hidden="true">
        <div className="loader-cube">
          <div className="loader-cube-core" />
          <div className="loader-cube-face loader-cube-face--front">
            <span className="loader-cube-face-inner loader-cube-face-inner--cyan" />
          </div>
          <div className="loader-cube-face loader-cube-face--back">
            <span className="loader-cube-face-inner loader-cube-face-inner--cyan" />
          </div>
          <div className="loader-cube-face loader-cube-face--right">
            <span className="loader-cube-face-inner loader-cube-face-inner--violet" />
          </div>
          <div className="loader-cube-face loader-cube-face--left">
            <span className="loader-cube-face-inner loader-cube-face-inner--violet" />
          </div>
          <div className="loader-cube-face loader-cube-face--top">
            <span className="loader-cube-face-inner loader-cube-face-inner--blue" />
          </div>
          <div className="loader-cube-face loader-cube-face--bottom">
            <span className="loader-cube-face-inner loader-cube-face-inner--blue" />
          </div>
        </div>
        <div className="loader-cube-shadow" />
      </div>
      <div className="loader-counter" aria-hidden="true">
        <span ref={counter}>000</span>
        <span className="loader-pct">%</span>
      </div>
    </div>
  );
}
