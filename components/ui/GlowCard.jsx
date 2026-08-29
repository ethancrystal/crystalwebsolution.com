'use client';
// @ts-check

import { createElement, useCallback, useRef } from 'react';

/* ── border glow ─────────────────────────────────────────────────
 * Pointer-tracked border highlight: a conic-gradient mask reveals a
 * colored mesh-gradient ring and an inset glow on whichever edge is
 * nearest the cursor. The two driving values (how close the pointer
 * is to an edge, and its angle from center) are written straight to
 * CSS custom properties on the DOM node on pointermove rather than
 * through React state, so hovering never triggers a re-render — the
 * same direct-DOM convention this repo uses for other per-frame
 * values (see lib/scrollState.js).
 *
 * Ported from reactbits.dev's Border Glow component: the geometry
 * and mask math are unchanged, retuned to this site's cyan/blue/
 * violet palette as static CSS instead of runtime-configurable JS.
 * ─────────────────────────────────────────────────────────────── */

function center(el) {
  const { width, height } = el.getBoundingClientRect();
  return [width / 2, height / 2];
}

function edgeProximity(el, x, y) {
  const [cx, cy] = center(el);
  const dx = x - cx;
  const dy = y - cy;
  const kx = dx !== 0 ? cx / Math.abs(dx) : Infinity;
  const ky = dy !== 0 ? cy / Math.abs(dy) : Infinity;
  return Math.min(Math.max(1 / Math.min(kx, ky), 0), 1);
}

function cursorAngle(el, x, y) {
  const [cx, cy] = center(el);
  const dx = x - cx;
  const dy = y - cy;
  if (dx === 0 && dy === 0) return 0;
  let degrees = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
  if (degrees < 0) degrees += 360;
  return degrees;
}

/**
 * @param {Object} props
 * @param {import('react').ElementType} [props.as] - Tag/component to render as.
 * @param {string} [props.className]
 * @param {import('react').ReactNode} [props.children]
 * @returns {import('react').ReactElement}
 */
export default function GlowCard({ as = 'div', className = '', children, ...rest }) {
  const ref = useRef(null);

  const handlePointerMove = useCallback((e) => {
    const card = ref.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty('--edge-proximity', `${(edgeProximity(card, x, y) * 100).toFixed(3)}`);
    card.style.setProperty('--cursor-angle', `${cursorAngle(card, x, y).toFixed(3)}deg`);
  }, []);

  return createElement(
    as,
    { ref, className: `glow-card ${className}`, onPointerMove: handlePointerMove, ...rest },
    createElement('span', { className: 'glow-card-edge', 'aria-hidden': 'true', key: 'glow-card-edge' }),
    children,
  );
}
