'use client';
// @ts-check

import { useEffect, useId, useRef } from 'react';

// Adapted from React Bits' Dot Field (reactbits.dev/backgrounds/dot-field,
// JS-CSS variant). A 2D canvas lattice that bulges away from the cursor,
// with an SVG glow following pointer speed. Restyled to cyan and silver
// dots on --bg. Window mousemove is required because marketing `main`
// covers the canvas.

const TWO_PI = Math.PI * 2;
const GRADIENT_FROM = 'rgba(89, 243, 255, 0.58)';
const GRADIENT_TO = 'rgba(196, 205, 220, 0.34)';
const GLOW_COLOR = '#59f3ff';

function DotField() {
  const canvasRef = useRef(null);
  const glowRef = useRef(null);
  const glowId = useId().replace(/:/g, '');

  useEffect(() => {
    const canvas = canvasRef.current;
    const glowEl = glowRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return undefined;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const dots = [];
    const mouse = { x: -9999, y: -9999, prevX: -9999, prevY: -9999, speed: 0 };
    const size = { w: 0, h: 0 };
    const props = {
      dotRadius: 1.45,
      dotSpacing: 16,
      cursorRadius: 460,
      bulgeStrength: 58,
    };
    let glowOpacity = 0;
    let engagement = 0;
    let raf = 0;
    let resizeTimer = 0;

    function buildDots(w, h) {
      const step = props.dotRadius + props.dotSpacing;
      const cols = Math.floor(w / step);
      const rows = Math.floor(h / step);
      const padX = (w % step) / 2;
      const padY = (h % step) / 2;
      dots.length = 0;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const ax = padX + col * step + step / 2;
          const ay = padY + row * step + step / 2;
          dots.push({ ax, ay, sx: ax, sy: ay });
        }
      }
    }

    function doResize() {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      size.w = w;
      size.h = h;
      buildDots(w, h);
    }

    function onMouseMove(event) {
      const rect = canvas.getBoundingClientRect();
      mouse.x = event.clientX - rect.left;
      mouse.y = event.clientY - rect.top;
    }

    function updateMouseSpeed() {
      const dx = mouse.prevX - mouse.x;
      const dy = mouse.prevY - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      mouse.speed += (dist - mouse.speed) * 0.5;
      if (mouse.speed < 0.001) mouse.speed = 0;
      mouse.prevX = mouse.x;
      mouse.prevY = mouse.y;
    }

    const speedInterval = setInterval(updateMouseSpeed, 20);

    function tick() {
      const { w, h } = size;
      const len = dots.length;
      const targetEngagement = Math.min(mouse.speed / 5, 1);
      engagement += (targetEngagement - engagement) * 0.06;
      if (engagement < 0.001) engagement = 0;
      glowOpacity += (engagement - glowOpacity) * 0.08;

      if (glowEl) {
        glowEl.setAttribute('cx', String(mouse.x));
        glowEl.setAttribute('cy', String(mouse.y));
        glowEl.style.opacity = String(glowOpacity);
      }

      ctx.clearRect(0, 0, w, h);
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, GRADIENT_FROM);
      grad.addColorStop(1, GRADIENT_TO);
      ctx.fillStyle = grad;

      const cr = props.cursorRadius;
      const crSq = cr * cr;
      const rad = props.dotRadius / 2;

      ctx.beginPath();
      for (let i = 0; i < len; i++) {
        const d = dots[i];
        const dx = mouse.x - d.ax;
        const dy = mouse.y - d.ay;
        const distSq = dx * dx + dy * dy;

        if (distSq < crSq && engagement > 0.01) {
          const dist = Math.sqrt(distSq);
          const falloff = 1 - dist / cr;
          const push = falloff * falloff * props.bulgeStrength * engagement;
          const angle = Math.atan2(dy, dx);
          d.sx += (d.ax - Math.cos(angle) * push - d.sx) * 0.15;
          d.sy += (d.ay - Math.sin(angle) * push - d.sy) * 0.15;
        } else {
          d.sx += (d.ax - d.sx) * 0.1;
          d.sy += (d.ay - d.sy) * 0.1;
        }

        ctx.moveTo(d.sx + rad, d.sy);
        ctx.arc(d.sx, d.sy, rad, 0, TWO_PI);
      }
      ctx.fill();
      raf = requestAnimationFrame(tick);
    }

    function onResize() {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(doResize, 100);
    }

    doResize();
    window.addEventListener('resize', onResize);
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      clearInterval(speedInterval);
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, []);

  return (
    <div className="dot-field-container">
      <canvas ref={canvasRef} />
      <svg>
        <defs>
          <radialGradient id={`dot-field-glow-${glowId}`}>
            <stop offset="0%" stopColor={GLOW_COLOR} />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
        <circle
          ref={glowRef}
          cx="-9999"
          cy="-9999"
          r="150"
          fill={`url(#dot-field-glow-${glowId})`}
          style={{ opacity: 0 }}
        />
      </svg>
    </div>
  );
}

/** @returns {import('react').ReactElement} */
export default function DotFieldBackground() {
  return (
    <div className="dot-field-bg" aria-hidden="true">
      <DotField />
      <style jsx>{`
        .dot-field-bg {
          position: fixed;
          inset: 0;
          z-index: 0;
          overflow: hidden;
          background: #04060c;
        }
        .dot-field-bg :global(.dot-field-container),
        .dot-field-bg :global(canvas),
        .dot-field-bg :global(svg) {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }
        .dot-field-bg :global(svg) {
          pointer-events: none;
        }
        @media (prefers-reduced-motion: reduce), (max-width: 767px) {
          .dot-field-bg {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
