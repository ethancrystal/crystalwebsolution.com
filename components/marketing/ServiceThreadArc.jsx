'use client';

// ServiceThreadArc — Services page only.
//
// A small decorative SVG motif placed above the "Pick a thread" header:
// a dashed arc connecting eight nodes, evoking the eight services listed
// just below in ServiceGrid. Draws itself in once via stroke-dashoffset
// when scrolled into view, using the same IntersectionObserver pattern
// as FoundingRail/FocusVeil. Purely decorative (aria-hidden).
import { useEffect, useRef, useState } from 'react';

const NODE_COUNT = 8;

export default function ServiceThreadArc() {
  const rootRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const nodes = Array.from({ length: NODE_COUNT }, (_, i) => {
    const t = i / (NODE_COUNT - 1);
    const x = 20 + t * 360;
    const y = 40 - Math.sin(t * Math.PI) * 26;
    return { x, y };
  });

  const pathD = nodes
    .map((n, i) => `${i === 0 ? 'M' : 'L'}${n.x.toFixed(1)},${n.y.toFixed(1)}`)
    .join(' ');

  return (
    <div
      ref={rootRef}
      className={`service-thread-arc${visible ? ' is-visible' : ''}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 400 60" preserveAspectRatio="none">
        <path
          className="service-thread-arc-path"
          d={pathD}
          fill="none"
          pathLength="1"
        />
        {nodes.map((n, i) => (
          <circle
            key={i}
            className="service-thread-arc-node"
            cx={n.x}
            cy={n.y}
            r="2.6"
          />
        ))}
      </svg>
    </div>
  );
}
