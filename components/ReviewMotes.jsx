'use client';

import React, { useEffect, useRef } from 'react';

export default function ReviewMotes() {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: -1000, y: -1000, active: false });
  const targetMouseRef = useRef({ x: -1000, y: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let width = canvas.width = canvas.offsetWidth;
    let height = canvas.height = canvas.offsetHeight;

    // Handle high-DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Create review motes (glowing feedback particles)
    const motes = [];
    const moteCount = 35;

    for (let i = 0; i < moteCount; i++) {
      motes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        baseRadius: Math.random() * 2 + 1,
        alpha: Math.random() * 0.3 + 0.1,
        // Match CWS cinematic color themes: cyan, blue, violet
        color: i % 3 === 0
          ? '6, 182, 212'   // Cyan
          : i % 3 === 1
            ? '60, 108, 255'  // Blue
            : '168, 85, 247', // Violet
      });
    }

    // Check motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let prefersReducedMotion = mediaQuery.matches;

    const handleMotionChange = (e) => {
      prefersReducedMotion = e.matches;
    };
    mediaQuery.addEventListener('change', handleMotionChange);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      targetMouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      mouseRef.current.active = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Lerp mouse coordinates for cinematic dampening
      if (!prefersReducedMotion && mouseRef.current.active) {
        mouseRef.current.x += (targetMouseRef.current.x - mouseRef.current.x) * 0.1;
        mouseRef.current.y += (targetMouseRef.current.y - mouseRef.current.y) * 0.1;
      } else if (!mouseRef.current.active) {
        mouseRef.current.x += (-1000 - mouseRef.current.x) * 0.05;
        mouseRef.current.y += (-1000 - mouseRef.current.y) * 0.05;
      }

      // Update and draw motes
      motes.forEach((mote, i) => {
        if (!prefersReducedMotion) {
          // Subtle hover repulsion/drift
          const dx = mouseRef.current.x - mote.x;
          const dy = mouseRef.current.y - mote.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 150) {
            const force = (150 - dist) / 150;
            const angle = Math.atan2(dy, dx);
            // Gently push particles away
            mote.x -= Math.cos(angle) * force * 1.5;
            mote.y -= Math.sin(angle) * force * 1.5;
          }

          // Regular floating drift
          mote.x += mote.vx;
          mote.y += mote.vy;

          // Boundary bounce/teleport with smooth padding
          if (mote.x < -10) mote.x = width + 10;
          if (mote.x > width + 10) mote.x = -10;
          if (mote.y < -10) mote.y = height + 10;
          if (mote.y > height + 10) mote.y = -10;
        }

        // Draw links to nearby motes to form a "trust network constellation"
        for (let j = i + 1; j < motes.length; j++) {
          const other = motes[j];
          const lx = other.x - mote.x;
          const ly = other.y - mote.y;
          const ldist = Math.sqrt(lx * lx + ly * ly);

          const maxLinkDist = 120;
          if (ldist < maxLinkDist) {
            // Check proximity to pointer for highlighting links
            const mouseToLinkMidX = (mote.x + other.x) / 2 - mouseRef.current.x;
            const mouseToLinkMidY = (mote.y + other.y) / 2 - mouseRef.current.y;
            const mouseToMidDist = Math.sqrt(mouseToLinkMidX * mouseToLinkMidX + mouseToLinkMidY * mouseToLinkMidY);

            let linkAlpha = (1 - ldist / maxLinkDist) * 0.05;

            // Link glows if pointer is close
            if (mouseToMidDist < 120 && !prefersReducedMotion) {
              linkAlpha += (1 - mouseToMidDist / 120) * 0.08;
            }

            ctx.strokeStyle = `rgba(255, 255, 255, ${linkAlpha})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(mote.x, mote.y);
            ctx.lineTo(other.x, other.y);
            ctx.stroke();
          }
        }

        // Calculate dynamic brightness based on pointer distance
        const mdx = mouseRef.current.x - mote.x;
        const mdy = mouseRef.current.y - mote.y;
        const mdist = Math.sqrt(mdx * mdx + mdy * mdy);

        let radius = mote.baseRadius;
        let finalAlpha = mote.alpha;

        if (mdist < 150 && !prefersReducedMotion) {
          const factor = 1 - mdist / 150;
          radius += factor * 3; // Particle expands slightly
          finalAlpha = Math.min(1, mote.alpha + factor * 0.5); // Particle glows brighter
        }

        // Draw particle core
        ctx.fillStyle = `rgba(${mote.color}, ${finalAlpha})`;
        ctx.beginPath();
        ctx.arc(mote.x, mote.y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Draw ambient glow halo around highlighted particles
        if (mdist < 150 && !prefersReducedMotion) {
          const glowFactor = 1 - mdist / 150;
          const gradient = ctx.createRadialGradient(
            mote.x, mote.y, radius,
            mote.x, mote.y, radius + glowFactor * 15
          );
          gradient.addColorStop(0, `rgba(${mote.color}, ${finalAlpha * 0.3})`);
          gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(mote.x, mote.y, radius + glowFactor * 15, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      mediaQuery.removeEventListener('change', handleMotionChange);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
}
