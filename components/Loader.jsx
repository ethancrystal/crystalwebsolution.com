'use client';

import { useRef, useEffect, useState } from 'react';
import gsap from 'gsap';
import { SITE } from '../lib/site';

// Intro loader: three brand words cycle while a counter climbs,
// then the curtain lifts to reveal the scene.
const WORDS = SITE.tagline.split('. ').map((w) => w.replace('.', ''));
const SESSION_KEY = 'cws:intro-seen';

export default function Loader() {
  const root = useRef(null);
  const counter = useRef(null);
  const wordRefs = useRef([]);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let seen = false;
    try {
      seen = window.sessionStorage.getItem(SESSION_KEY) === '1';
    } catch {
      // Storage may be unavailable in hardened/private browsing modes.
    }
    if (seen) {
      document.documentElement.dataset.cwsIntroSeen = '1';
    }
    if (reduced || seen) {
      setGone(true);
      return undefined;
    }

    const tl = gsap.timeline({
      onComplete: () => {
        try {
          window.sessionStorage.setItem(SESSION_KEY, '1');
          document.documentElement.dataset.cwsIntroSeen = '1';
        } catch {
          // The intro remains non-blocking even if storage is unavailable.
        }
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

    WORDS.forEach((_, i) => {
      const el = wordRefs.current[i];
      if (!el) return;
      tl.fromTo(el, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.18, ease: 'power2.out' }, i * 0.18);
      if (i < WORDS.length - 1) {
        tl.to(el, { opacity: 0, y: -16, duration: 0.16, ease: 'power2.in' }, i * 0.18 + 0.16);
      }
    });

    tl.to(root.current, {
      yPercent: -100,
      duration: 0.38,
      ease: 'power4.inOut',
    }, 0.62);

    return () => tl.kill();
  }, []);

  if (gone) return null;

  return (
    <div ref={root} className="loader">
      <div className="loader-words">
        {WORDS.map((w, i) => (
          <span key={w} ref={(el) => (wordRefs.current[i] = el)} className="loader-word">
            {w}
          </span>
        ))}
      </div>
      <div className="loader-counter">
        <span ref={counter}>000</span>
        <span className="loader-pct">%</span>
      </div>
    </div>
  );
}
