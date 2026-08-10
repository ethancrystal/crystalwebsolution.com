'use client';

import React, { useRef, useEffect } from 'react';

// Code-generated project artwork — no image assets.
// A layered gradient composition derived from the project palette.
export default function ProjectVisual({ palette, title, ratio = '4 / 3' }) {
  const [a, b] = palette;
  const containerRef = useRef(null);
  const orbRef1 = useRef(null);
  const orbRef2 = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let prefersReducedMotion = mediaQuery.matches;

    const handleMotionChange = (e) => {
      prefersReducedMotion = e.matches;
    };
    mediaQuery.addEventListener('change', handleMotionChange);

    const handleMouseMove = (e) => {
      if (prefersReducedMotion) return;

      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Normalize to range [-1, 1]
      const nx = (x / rect.width) * 2 - 1;
      const ny = (y / rect.height) * 2 - 1;

      // Apply subtle interactive translation to each orb
      if (orbRef1.current) {
        orbRef1.current.style.transform = `translate3d(${nx * 20}px, ${ny * 20}px, 0) scale(1.08)`;
      }
      if (orbRef2.current) {
        orbRef2.current.style.transform = `translate3d(${-nx * 15}px, ${-ny * 15}px, 0) scale(1.06)`;
      }
    };

    const handleMouseLeave = () => {
      if (orbRef1.current) {
        orbRef1.current.style.transform = '';
      }
      if (orbRef2.current) {
        orbRef2.current.style.transform = '';
      }
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
      mediaQuery.removeEventListener('change', handleMotionChange);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="project-visual"
      style={{ aspectRatio: ratio, transition: 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.4s' }}
      role="img"
      aria-label={`${title} artwork`}
    >
      <div
        className="pv-layer pv-base"
        style={{ background: `linear-gradient(135deg, ${a}22 0%, ${b}33 100%)` }}
      />
      <div
        ref={orbRef1}
        className="pv-layer pv-orb"
        style={{
          background: `radial-gradient(circle at 30% 35%, ${a}88, transparent 55%)`,
          transition: 'transform 0.6s cubic-bezier(0.25, 1, 0.5, 1)',
          filter: 'blur(2px)'
        }}
      />
      <div
        ref={orbRef2}
        className="pv-layer pv-orb2"
        style={{
          background: `radial-gradient(circle at 72% 70%, ${b}66, transparent 50%)`,
          transition: 'transform 0.6s cubic-bezier(0.25, 1, 0.5, 1)',
          filter: 'blur(2px)'
        }}
      />
      <div className="pv-grid" />
      <span className="pv-mark" style={{ color: a }}>◆</span>
    </div>
  );
}
