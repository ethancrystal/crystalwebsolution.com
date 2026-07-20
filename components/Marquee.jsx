'use client';

import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { scrollState } from '../lib/scrollState';

// Infinite marquee whose speed and direction react to scroll velocity.
export default function Marquee({ text, className = '', baseSpeed = 60 }) {
  const track = useRef(null);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.style.transform = 'translate3d(0,0,0)';
      return undefined;
    }
    let x = 0;
    const halfWidth = { current: 0 };
    const active = { current: true };
    const measure = () => {
      halfWidth.current = el.scrollWidth / 2;
    };
    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(measure);
    resizeObserver?.observe(el);
    measure();

    const visibilityObserver = typeof IntersectionObserver === 'undefined'
      ? null
      : new IntersectionObserver(
        ([entry]) => {
          active.current = entry.isIntersecting;
        },
        { rootMargin: '180px 0px' },
      );
    visibilityObserver?.observe(el);

    const tick = (_, deltaMS) => {
      if (!active.current) return;
      const dt = Math.min(deltaMS / 1000, 0.05);
      const boost = 1 + Math.min(Math.abs(scrollState.velocity) * 0.002, 4);
      const dir = scrollState.velocity < -20 ? -1 : 1;
      x -= baseSpeed * boost * dir * dt;
      const h = halfWidth.current;
      if (h > 0) {
        if (x <= -h) x += h;
        if (x > 0) x -= h;
      }
      el.style.transform = `translate3d(${x}px,0,0)`;
    };
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      resizeObserver?.disconnect();
      visibilityObserver?.disconnect();
    };
  }, [baseSpeed]);

  const chunk = Array(6).fill(text);

  return (
    <div className={`marquee ${className}`} aria-hidden="true">
      <div ref={track} className="marquee-track">
        {chunk.concat(chunk).map((t, i) => (
          <span className="marquee-item" key={i}>
            {t} <span className="marquee-star">✦</span>{' '}
          </span>
        ))}
      </div>
    </div>
  );
}
