'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import {
  CARD_WIDTH,
  FLIGHT_PHASES,
  REVEAL_DURATION,
  createFlyingCarouselLayout,
  sampleFlyingCard,
} from '../../lib/flyingCarouselLayout.mjs';
import { inMotionColorSoft, inMotionCurve, IN_MOTION_CARDS } from '../../lib/inMotionCards.mjs';
import { LAB_WINDOW } from '../../lib/journey';
import { DEFAULT_MOTION_LAYOUT, shouldUseStaticMotionLayout } from '../../lib/motionLayout.mjs';
import { scrollState } from '../../lib/scrollState';
import { useExperienceFeatures } from '../../lib/useExperienceFeatures';

// "CWS in motion" — the services beat. Eight cards fly a full orbital lap
// over the giant statement, then settle into a real, clickable grid. Unlike
// Motion.jsx's Selected Work beat (which drives a WebGL scene + camera lock),
// this stage is pure DOM/CSS-3D — closer kin to .about-smil than to Motion:
// a self-contained scene sitting on the fixed Canvas, not a mascot inside it.
// Every card is one real <a> from the start; only transform/opacity/
// pointer-events are ever mutated, so nothing swaps a decorative stand-in
// for an interactive one.
const STATIC_QUERY = '(prefers-reduced-motion: reduce)';
const ANCHOR_PROGRESS = 0.3;
const GRID_COLUMNS = 4;
const IN_MOTION_SEED = 0x7a11cee5;
const CARD_DOM_WIDTH = 320;
const CARD_DOM_HEIGHT = 222;
const ART_X = 8;
const ART_Y = 26;
const ART_W = 304;
const ART_H = 138;
// Tuned against the authored card composition, not derived from the site's
// world scale — this stage has no shared Three.js camera to match.
const WORLD_HEIGHT_DIVISOR = 6.15;
const PERSPECTIVE_MULTIPLIER = 8.01;
const INTERACTIVE_THRESHOLD = 0.9;
const HEADLINE_DIM_START = 0.12;
const CAPTION_FADE_START = 0.72;
const CAPTION_FADE_SPAN = 0.12;
const RAD_TO_DEG = 180 / Math.PI;

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function CardShape({ shape }) {
  const x = ART_X + (shape.l / 100) * ART_W;
  const y = ART_Y + (shape.t / 100) * ART_H;
  const w = (shape.w / 100) * ART_W;
  const h = (shape.h / 100) * ART_H;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const fill = shape.bg === 'transparent' ? 'none' : shape.bg;
  const transform = shape.rot ? `rotate(${shape.rot} ${cx} ${cy})` : undefined;

  if (shape.rad === 'circle') {
    return (
      <ellipse
        cx={cx}
        cy={cy}
        rx={w / 2}
        ry={h / 2}
        fill={fill}
        stroke={shape.bd}
        strokeWidth={shape.bdw}
        opacity={shape.op}
        transform={transform}
      />
    );
  }

  return (
    <rect
      x={x}
      y={y}
      width={w}
      height={h}
      rx={shape.rad}
      fill={fill}
      stroke={shape.bd}
      strokeWidth={shape.bdw}
      opacity={shape.op}
      transform={transform}
    />
  );
}

function CardArt({ card, index }) {
  const num = String(index + 1).padStart(2, '0');
  const gradId = `im-grad-${card.id}`;
  const sheenId = `im-sheen-${card.id}`;

  return (
    <svg viewBox={`0 0 ${CARD_DOM_WIDTH} ${CARD_DOM_HEIGHT}`} className="im-card-art" aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={card.color} />
          <stop offset="1" stopColor={inMotionColorSoft(card.color)} />
        </linearGradient>
        <linearGradient id={sheenId} x1="0" y1="0" x2="1" y2="1" gradientTransform="rotate(20)">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="0.75" y="0.75" width={CARD_DOM_WIDTH - 1.5} height={CARD_DOM_HEIGHT - 1.5} rx="8" fill="#f4f3ef" stroke="#11130f" strokeWidth="1.5" />
      <text x="12" y="17" className="im-card-kicker">CWS / SERVICE</text>
      <text x={CARD_DOM_WIDTH - 12} y="18" textAnchor="end" className="im-card-num">{num}</text>
      <rect x={ART_X} y={ART_Y} width={ART_W} height={ART_H} rx="4" fill={`url(#${gradId})`} />
      {Array.from({ length: 7 }, (_, gridIndex) => {
        const gx = ART_X + (gridIndex + 1) * (ART_W / 8);
        return <line key={`v${gridIndex}`} x1={gx} y1={ART_Y} x2={gx} y2={ART_Y + ART_H} stroke="rgba(20,26,33,0.1)" />;
      })}
      {Array.from({ length: 3 }, (_, gridIndex) => {
        const gy = ART_Y + (gridIndex + 1) * (ART_H / 4);
        return <line key={`h${gridIndex}`} x1={ART_X} y1={gy} x2={ART_X + ART_W} y2={gy} stroke="rgba(20,26,33,0.1)" />;
      })}
      <rect x={ART_X + ART_W * 0.6} y={ART_Y} width={ART_W * 0.4} height={ART_H * 0.55} fill={`url(#${sheenId})`} />
      <svg x={ART_X} y={ART_Y} width={ART_W} height={ART_H} viewBox="0 0 296 132" preserveAspectRatio="none">
        <path d={inMotionCurve(index)} fill="none" stroke="#0b0d0b" strokeWidth="5" strokeLinecap="round" />
      </svg>
      {card.shapes.map((shape, shapeIndex) => <CardShape key={shapeIndex} shape={shape} />)}
      <text x="12" y="196" className="im-card-title">{card.title}</text>
      <text x="12" y="212" className="im-card-sub">{card.sub}</text>
      <text x={CARD_DOM_WIDTH - 12} y="216" textAnchor="end" className="im-card-num-ghost">{num}</text>
    </svg>
  );
}

function InMotionCard({ card, index, register }) {
  return (
    <a
      ref={register}
      href="#services"
      className="im-card"
      aria-label={`${card.title} — jump to services`}
      tabIndex={-1}
    >
      <CardArt card={card} index={index} />
    </a>
  );
}

export default function Lab() {
  const rootRef = useRef(null);
  const stageRef = useRef(null);
  const headlineRef = useRef(null);
  const captionRef = useRef(null);
  const cardRefs = useRef([]);
  const layoutRef = useRef(null);
  const ppuRef = useRef(1);
  const baseScaleRef = useRef(1);
  const sampleBuffer = useRef({ position: [0, 0, 0], rotation: [0, 0, 0], scale: 0 });
  const { flyingCarousel } = useExperienceFeatures();

  useEffect(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    if (!root || !stage) return undefined;

    const media = window.matchMedia(STATIC_QUERY);
    let tickerAttached = false;
    let resizeObserver = null;

    const buildLayout = () => {
      const height = stage.clientHeight || 800;
      const width = stage.clientWidth || 1200;
      const ppu = height / WORLD_HEIGHT_DIVISOR;
      ppuRef.current = ppu;
      stage.style.perspective = `${Math.round(PERSPECTIVE_MULTIPLIER * ppu)}px`;
      baseScaleRef.current = (CARD_WIDTH * ppu) / CARD_DOM_WIDTH;
      layoutRef.current = createFlyingCarouselLayout({
        viewportWidth: width / ppu,
        viewportPixelWidth: width,
        cardCount: IN_MOTION_CARDS.length,
        columns: GRID_COLUMNS,
        seed: IN_MOTION_SEED,
      });
    };

    const applyProgress = (progress) => {
      const layout = layoutRef.current;
      if (!layout) return;
      const ppu = ppuRef.current;
      const baseScale = baseScaleRef.current;
      const interactive = progress > INTERACTIVE_THRESHOLD;
      const buffer = sampleBuffer.current;

      for (let index = 0; index < cardRefs.current.length && index < layout.length; index++) {
        const el = cardRefs.current[index];
        if (!el) continue;
        const card = layout[index];
        sampleFlyingCard(card, progress, buffer);

        const x = buffer.position[0] * ppu;
        const y = -buffer.position[1] * ppu;
        const z = buffer.position[2] * ppu;
        const rx = -buffer.rotation[0] * RAD_TO_DEG;
        const ry = -buffer.rotation[1] * RAD_TO_DEG;
        const rz = -buffer.rotation[2] * RAD_TO_DEG;
        const scale = buffer.scale * baseScale;

        el.style.transform = `translate(-50%, -50%) translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${z.toFixed(1)}px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) rotateZ(${rz.toFixed(2)}deg) scale(${scale.toFixed(4)})`;

        const revealProgress = progress <= FLIGHT_PHASES.hold
          ? 0
          : clamp01((progress - FLIGHT_PHASES.hold - card.revealDelay) / REVEAL_DURATION);
        el.style.opacity = String(revealProgress);
        el.style.pointerEvents = interactive ? 'auto' : 'none';
        el.tabIndex = interactive ? 0 : -1;
      }

      if (headlineRef.current) {
        const headlineOpacity = progress < HEADLINE_DIM_START
          ? 0.94
          : Math.max(0.18, 0.94 - 1.2 * (progress - HEADLINE_DIM_START));
        headlineRef.current.style.opacity = headlineOpacity.toFixed(3);
      }
      if (captionRef.current) {
        const captionOpacity = 1 - clamp01((progress - CAPTION_FADE_START) / CAPTION_FADE_SPAN);
        captionRef.current.style.opacity = captionOpacity.toFixed(3);
      }
    };

    const syncProgress = () => {
      const span = Math.max(LAB_WINDOW.end - LAB_WINDOW.start, 0.0001);
      const progress = clamp01((scrollState.progress - LAB_WINDOW.start) / span);
      applyProgress(progress);
    };

    const configure = () => {
      if (tickerAttached) {
        gsap.ticker.remove(syncProgress);
        tickerAttached = false;
      }
      const staticLayout = shouldUseStaticMotionLayout({
        reducedMotion: media.matches,
        flyingCarousel,
      });
      root.dataset.labLayout = staticLayout ? 'static' : 'animated';
      if (staticLayout) return;

      buildLayout();
      gsap.ticker.add(syncProgress);
      tickerAttached = true;
      syncProgress();
    };

    resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(() => {
        if (root.dataset.labLayout !== 'static') buildLayout();
      });
    resizeObserver?.observe(stage);

    configure();
    media.addEventListener('change', configure);

    return () => {
      media.removeEventListener('change', configure);
      if (tickerAttached) gsap.ticker.remove(syncProgress);
      resizeObserver?.disconnect();
    };
  }, [flyingCarousel]);

  return (
    <section
      className="section lab"
      id="lab"
      ref={rootRef}
      data-anchor-progress={ANCHOR_PROGRESS}
      data-nav-tone="light"
      data-lab-layout={DEFAULT_MOTION_LAYOUT}
    >
      <div className="lab-sticky">
        <div className="lab-copy" ref={headlineRef} aria-hidden="true">
          <span>CWS IN</span>
          <span>MOTION</span>
        </div>
        <h2 className="sr-only">CWS in motion</h2>
        <p className="lab-caption" ref={captionRef}>
          This site is the proof: one continuous 3D scene, scroll-linked
          motion, responsive fallbacks, and accessible content — built by
          Crystal Web Solution.
        </p>
        <a href="#services" className="lab-link">All services <span aria-hidden="true">→</span></a>
        <div className="lab-stage" ref={stageRef}>
          {IN_MOTION_CARDS.map((card, index) => (
            <InMotionCard
              key={card.id}
              card={card}
              index={index}
              register={(el) => { cardRefs.current[index] = el; }}
            />
          ))}
        </div>
        <div className="lab-grid">
          {IN_MOTION_CARDS.map((card, index) => (
            <a key={card.id} href="#services" className="im-card" aria-label={`${card.title} — jump to services`}>
              <CardArt card={card} index={index} />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
