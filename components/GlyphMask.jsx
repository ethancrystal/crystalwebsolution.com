'use client';

import { useEffect, useRef } from 'react';

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function randomGlyphs(length) {
  let out = '';
  for (let i = 0; i < length; i++) out += GLYPHS[(Math.random() * GLYPHS.length) | 0];
  return out;
}

// Decorative "decrypt" texture: a field of random glyphs sits under a radial
// mask that follows the pointer within the nearest .motion-card, unmasking a
// halo of noise right at the cursor. Pointer-driven only (no autoplay), so it
// layers under BorderGlow's edge glow without fighting reduced-motion —
// nothing moves until the visitor's own cursor does.
export default function GlyphMask({ accent, glyphCount = 500, radius = 160 }) {
  const maskRef = useRef(null);
  const textRef = useRef(null);

  useEffect(() => {
    if (textRef.current) textRef.current.textContent = randomGlyphs(glyphCount);
    if (window.matchMedia('(pointer: coarse)').matches) return undefined;

    const mask = maskRef.current;
    const card = mask?.closest('.motion-card');
    if (!mask || !card) return undefined;

    const onMove = (e) => {
      const rect = card.getBoundingClientRect();
      mask.style.setProperty('--glyph-x', `${e.clientX - rect.left}px`);
      mask.style.setProperty('--glyph-y', `${e.clientY - rect.top}px`);
      mask.style.opacity = '1';
      if (textRef.current) textRef.current.textContent = randomGlyphs(glyphCount);
    };
    const onLeave = () => { mask.style.opacity = '0'; };

    card.addEventListener('pointermove', onMove);
    card.addEventListener('pointerleave', onLeave);
    return () => {
      card.removeEventListener('pointermove', onMove);
      card.removeEventListener('pointerleave', onLeave);
    };
  }, [glyphCount]);

  return (
    <span
      ref={maskRef}
      className="glyph-mask"
      aria-hidden="true"
      style={{ '--glyph-radius': `${radius}px`, color: accent }}
    >
      <span ref={textRef} className="glyph-mask-text" />
    </span>
  );
}
