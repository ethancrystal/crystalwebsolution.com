'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import SectionReveal from '../SectionReveal';
import { useRenderQuality } from '../../lib/useRenderQuality';

// ProcessHero — the /process opening block: the headline cut out of a
// WebGPU dot field (ShapeWaves) with the lede beneath.
//
// Progressive enhancement, in this order:
//   1. Server + first paint: `data-mode="static"` — eyebrow and the real H1
//      centred on the stage over a CSS dot lattice. This is what search
//      engines, screen readers, and every visitor see first (no LCP gated on
//      GPU init).
//   2. After mount, if the site's render-quality policy allows animation
//      (eco tier = no canvas, same gate IdleScene uses) AND the browser has
//      WebGPU, ShapeWaves mounts client-only and renders the same headline
//      as negative space in the field. On its first presented frame the H1
//      fades to opacity 0 (still in the accessibility tree) as the canvas
//      fades in — see app/styles/shape-waves.css.
//   3. Any GPU failure (`onError`) drops back to the static stage.
//
// `maskText` lets the page choose where the field breaks the headline
// ("\n"), independent of the H1's own text-wrap: balance.
//
// Tuning: React Bits' demo runs 10px cells under a two-word title (~25 cells
// tall). A full sentence only gets ~100px letters here, so cells are 8px on
// desktop (~12 cells tall) and 6px on phones; raise cellSize for a chunkier
// dot-matrix look, lower it for crisper letterforms.
const ShapeWaves = dynamic(() => import('./ShapeWaves'), { ssr: false });

const COMPACT_QUERY = '(max-width: 767.5px)';
const FALLBACK_FONT = "'Space Grotesk', sans-serif";

// Design tokens from app/styles/tokens.css. ShapeWaves needs literal hex
// (it parses colours into shader uniforms), so these mirror --cyan / --bg.
const FIELD = {
  shapes: 'mixed',
  dotSize: 0.75,
  color: '#59f3ff',
  hoverColor: '#ffffff',
  backgroundColor: '#04060c',
  speed: 1,
  scale: 1,
  contrast: 1,
  brightness: 0.4,
  flow: 0,
  direction: 0,
  fade: 0.25,
  interactive: true,
  splashStrength: 0.4,
  glow: 0.35,
  intro: true,
  introDuration: 1.6,
};

// The mask is drawn on a 2D canvas, so it needs the resolved value of
// --font-display: next/font registers the face under its own generated
// family list (currently "Space Grotesk", "Space Grotesk Fallback"; older
// versions used hashed names), and that string is what the headings
// actually render with. A canvas context rejects an unparsable font string
// silently and keeps its previous font, so verify it took.
function readDisplayFont() {
  const family = getComputedStyle(document.documentElement).getPropertyValue('--font-display').trim();
  if (!family) return FALLBACK_FONT;
  const probe = document.createElement('canvas').getContext('2d');
  if (!probe) return family;
  const before = probe.font;
  probe.font = `500 32px ${family}`;
  return probe.font !== before ? family : FALLBACK_FONT;
}

export default function ProcessHero({ eyebrow, title, maskText, lede }) {
  const quality = useRenderQuality();
  const [mode, setMode] = useState('static');
  const [ready, setReady] = useState(false);
  const [font, setFont] = useState(FALLBACK_FONT);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    if (!quality.animate || typeof navigator === 'undefined' || !navigator.gpu) {
      setMode('static');
      setReady(false);
      return;
    }
    setFont(readDisplayFont());
    setMode('waves');
  }, [quality.animate]);

  useEffect(() => {
    const media = window.matchMedia(COMPACT_QUERY);
    const update = () => setCompact(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  const handleReady = useCallback(() => setReady(true), []);
  const handleError = useCallback(() => {
    setMode('static');
    setReady(false);
  }, []);

  return (
    <section className="mkt-hero process-hero" data-mode={mode} data-ready={ready}>
      <div className="process-hero-stage">
        {mode === 'waves' && (
          <ShapeWaves
            {...FIELD}
            className="process-hero-field"
            text={maskText || title}
            fontFamily={font}
            fontWeight={500}
            textSize={0.6}
            wrap
            wrapWidth={compact ? 0.92 : 0.8}
            wrapHeight={compact ? 0.7 : 0.55}
            cellSize={compact ? 6 : 8}
            splashRadius={compact ? 26 : 40}
            onReady={handleReady}
            onError={handleError}
          />
        )}
        <div className="process-hero-copy">
          {eyebrow && (
            <p className="eyebrow">
              <SectionReveal as="span" direction="left">{eyebrow}</SectionReveal>
            </p>
          )}
          <h1 className="page-title mkt-hero-title process-hero-title">{title}</h1>
        </div>
      </div>
      {lede && (
        <SectionReveal as="p" className="mkt-hero-lede process-hero-lede" direction="up" delay={0.15}>
          {lede}
        </SectionReveal>
      )}
    </section>
  );
}
