'use client';

// FoundingRail — About page only. A small vertical rail with two tick
// marks (founding year -> "Today") that draws itself in via a CSS
// transform once the "How we think" section scrolls into view.
// Uses a plain IntersectionObserver (see components/FocusVeil.jsx for the
// project's teardown convention) rather than a new ScrollTrigger, since
// this only needs a one-shot enter toggle, not scroll-scrubbed progress.
import { useEffect, useRef, useState } from 'react';

export default function FoundingRail({ founded }) {
  const rootRef = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.3 }
    );

    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={rootRef}
      className={`founding-rail${inView ? ' is-visible' : ''}`}
      aria-hidden="true"
    >
      <span className="founding-rail-line" />
      <span className="founding-rail-tick founding-rail-tick-start">
        <span className="founding-rail-dot" />
        <span className="founding-rail-label">{founded}</span>
      </span>
      <span className="founding-rail-tick founding-rail-tick-end">
        <span className="founding-rail-dot" />
        <span className="founding-rail-label">Today</span>
      </span>
    </div>
  );
}
