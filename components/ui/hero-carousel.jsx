'use client';

// A full-bleed editorial hero driven by a filmstrip.
//
// Every card shares one top edge. The focused card unfurls to full height
// while its neighbours stay clipped to half, so the strip reads as a row of
// cropped portraits with one complete portrait standing in the middle of it.
// Changing the focus re-grades the whole background to that slide's accent.
//
// Geometry is measured, never hard-coded: one ResizeObserver reads the stage
// and every size below is a ratio of it, so the same component is
// pixel-identical in a 600px preview box and on a 4K display.
//
// Adapted from the shadcn/Tailwind original to this repo's plain-JSX +
// inline-style conventions ("motion" package instead of framer-motion).
// Additions over the original: a `renderDetail` slot under the headline and
// autoplay gated on prefers-reduced-motion.
import * as React from 'react';
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
} from 'motion/react';

/* Ratios lifted from the reference layout, all relative to the stage box. */
const CARD_H = 0.264; // active card height ÷ stage height
const CARD_AR = 0.75; // active card is 3:4
const GAP = 0.038; // gap ÷ card width
const STRIP_TOP = 0.5; // strip's shared top edge, down the stage
const TITLE = 0.067; // headline cap size ÷ stage height
const LABEL = 0.0103; // small mono label ÷ stage height
const PAD = 0.017; // page gutter ÷ stage width
const RAIL = 0.2; // progress rail width ÷ stage width

/** Wheel distance that commits to a step, and the lockout after one. */
const WHEEL_THRESHOLD = 60;
const WHEEL_COOLDOWN = 420;

/* Film grain, as a self-contained SVG so the component carries no assets. */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

const fill = { position: 'absolute', inset: 0 };
const mono = {
  fontFamily: 'var(--font-mono)',
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
};

export function HeroCarousel({
  items,
  index: controlled,
  defaultIndex = 0,
  onIndexChange,
  autoplay = false,
  autoplayDelay = 4000,
  renderDetail,
  className = '',
  ariaLabel = 'Featured slides',
}) {
  const stageRef = React.useRef(null);
  const [box, setBox] = React.useState({ w: 0, h: 0 });
  const [uncontrolled, setUncontrolled] = React.useState(defaultIndex);
  const [dragging, setDragging] = React.useState(false);
  const [paused, setPaused] = React.useState(false);
  const reduced = useReducedMotion();

  const last = items.length - 1;
  const index = clamp(controlled ?? uncontrolled, 0, Math.max(0, last));

  const go = React.useCallback(
    (next) => {
      const clamped = clamp(next, 0, Math.max(0, last));
      if (controlled === undefined) setUncontrolled(clamped);
      if (clamped !== index) onIndexChange?.(clamped);
    },
    [controlled, index, last, onIndexChange],
  );

  // One observer feeds every measurement below.
  React.useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;
    const read = () => setBox({ w: stage.clientWidth, h: stage.clientHeight });
    read();
    const ro = new ResizeObserver(read);
    ro.observe(stage);
    return () => ro.disconnect();
  }, []);

  const fullH = clamp(box.h * CARD_H, 96, 360);
  const halfH = fullH / 2;
  const cardW = fullH * CARD_AR;
  const gap = Math.max(4, Math.round(cardW * GAP));
  const step = cardW + gap;
  const pad = Math.max(16, Math.round(box.w * PAD));
  const label = Math.max(9, Math.round(box.h * LABEL));

  // Centre the focused card: the track slides, the card never moves itself.
  const xFor = React.useCallback(
    (i) => box.w / 2 - (i * step + cardW / 2),
    [box.w, step, cardW],
  );
  const x = useMotionValue(0);
  const target = xFor(index);

  const swing = reduced ? { duration: 0 } : { duration: 0.7, ease: 'easeOut' };
  const spring = reduced
    ? { duration: 0 }
    : { type: 'spring', stiffness: 260, damping: 34, mass: 0.9 };

  // The track is driven by a motion value rather than an `animate` prop so a
  // drag that starts mid-spring reads the real position, not where the spring
  // was headed — otherwise the release snaps a card off.
  React.useEffect(() => {
    if (dragging) return undefined;
    const run = animate(x, target, spring);
    return () => run.stop();
    // `spring` is a literal, so `reduced` (all it derives from) stands in.
  }, [target, dragging, reduced, x]); // eslint-disable-line react-hooks/exhaustive-deps

  // Wheel and trackpad. Both axes step the strip.
  React.useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;
    let acc = 0;
    let until = 0;

    const onWheel = (e) => {
      // Trackpads report the dominant axis; take whichever is stronger.
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      // Scroll chaining: once the strip is against an end, hand the gesture
      // back to the page. Without this a full-height carousel is a scroll
      // trap with no way past it.
      const stuck = (delta > 0 && index === last) || (delta < 0 && index === 0);
      if (stuck) {
        acc = 0;
        return;
      }
      e.preventDefault();
      const now = e.timeStamp;
      if (now < until) return;
      acc += delta;
      if (Math.abs(acc) < WHEEL_THRESHOLD) return;
      go(index + Math.sign(acc));
      acc = 0;
      until = now + WHEEL_COOLDOWN;
    };

    stage.addEventListener('wheel', onWheel, { passive: false });
    return () => stage.removeEventListener('wheel', onWheel);
  }, [go, index, last]);

  React.useEffect(() => {
    // Autoplay respects reduced motion: a slideshow that keeps stepping with
    // zero-duration cuts is worse than one that holds still.
    if (!autoplay || reduced || paused || dragging || items.length < 2) return undefined;
    const id = window.setTimeout(() => go(index === last ? 0 : index + 1), autoplayDelay);
    return () => window.clearTimeout(id);
  }, [autoplay, autoplayDelay, dragging, go, index, items.length, last, paused, reduced]);

  const active = items[index];
  if (!active) return null;

  const lines = active.title.split('\n');
  const accent = active.accent ?? '#8a8a8a';

  return (
    <div
      ref={stageRef}
      tabIndex={0}
      role="group"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      onKeyDown={(e) => {
        const keys = {
          ArrowLeft: index - 1,
          ArrowRight: index + 1,
          Home: 0,
          End: last,
        };
        if (!(e.key in keys)) return;
        e.preventDefault();
        go(keys[e.key]);
      }}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={`hc-stage ${className}`.trim()}
      style={{
        position: 'relative',
        height: '100%',
        minHeight: '24rem',
        width: '100%',
        overflow: 'hidden',
        background: '#04060c',
        color: 'var(--ink)',
        userSelect: 'none',
      }}
    >
      {/* ── Background: the focused image, blown up and re-hued to its accent ── */}
      <AnimatePresence initial={false}>
        <motion.div
          key={index}
          style={fill}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={swing}
        >
          <motion.img
            src={active.image}
            alt=""
            aria-hidden
            draggable={false}
            style={{ ...fill, height: '100%', width: '100%', objectFit: 'cover' }}
            initial={{ scale: reduced ? 1.28 : 1.42 }}
            animate={{ scale: 1.28 }}
            transition={reduced ? { duration: 0 } : { duration: 6, ease: 'linear' }}
          />
          {/* Keep the image's luminance, take the accent's hue. */}
          <div style={{ ...fill, backgroundColor: accent, mixBlendMode: 'color' }} />
          <div
            style={{ ...fill, backgroundColor: accent, mixBlendMode: 'multiply', opacity: 0.55 }}
          />
        </motion.div>
      </AnimatePresence>

      {/* Legibility wash + grain, above the swap so they never flicker. */}
      <div
        style={{
          ...fill,
          background:
            'linear-gradient(to bottom, rgba(4,6,12,0.5), transparent 40%, rgba(4,6,12,0.55))',
        }}
      />
      <div
        aria-hidden
        style={{
          ...fill,
          pointerEvents: 'none',
          opacity: 0.22,
          mixBlendMode: 'overlay',
          backgroundImage: GRAIN,
          backgroundSize: '180px 180px',
        }}
      />

      {/* ── Headline block, sitting just above the strip's top edge ── */}
      <div
        style={{
          position: 'absolute',
          insetInline: 0,
          top: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          height: `${STRIP_TOP * 100}%`,
          paddingLeft: pad,
          paddingRight: pad,
          paddingBottom: Math.round(box.h * 0.028),
        }}
      >
        <div
          style={{
            display: 'flex',
            width: '100%',
            flexWrap: 'wrap',
            alignItems: 'flex-end',
            columnGap: '6vw',
            rowGap: 8,
          }}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.h3
              key={index}
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                lineHeight: 0.92,
                letterSpacing: '-0.03em',
                fontSize: Math.max(24, Math.round(box.h * TITLE)),
                margin: 0,
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.18 } }}
            >
              {lines.map((line, i) => (
                // Each line wipes up from behind its own edge.
                <span key={i} style={{ display: 'block', overflow: 'hidden' }}>
                  <motion.span
                    style={{ display: 'block' }}
                    initial={{ y: '110%' }}
                    animate={{ y: 0 }}
                    transition={
                      reduced
                        ? { duration: 0 }
                        : { duration: 0.62, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }
                    }
                  >
                    {line}
                  </motion.span>
                </span>
              ))}
            </motion.h3>
          </AnimatePresence>

          {active.credit ? (
            <motion.p
              key={`credit-${index}`}
              style={{ ...mono, fontSize: label, margin: 0 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.8 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              {active.credit}
            </motion.p>
          ) : null}

          {active.meta?.length ? (
            <div
              style={{
                marginLeft: 'auto',
                display: 'flex',
                alignItems: 'flex-end',
                gap: `${Math.max(16, box.w * 0.055)}px`,
              }}
            >
              {active.meta.map((fact, i) => (
                <motion.span
                  key={`${index}-${fact}`}
                  style={{ ...mono, whiteSpace: 'nowrap', fontSize: label }}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 0.8, y: 0 }}
                  transition={
                    reduced ? { duration: 0 } : { duration: 0.45, delay: 0.12 + i * 0.06 }
                  }
                >
                  {fact}
                </motion.span>
              ))}
            </div>
          ) : null}
        </div>

        {renderDetail ? (
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={`detail-${index}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              transition={reduced ? { duration: 0 } : { duration: 0.45, delay: 0.18 }}
            >
              {renderDetail(active, index)}
            </motion.div>
          </AnimatePresence>
        ) : null}
      </div>

      {/* ── The strip: one shared top edge, the focused card twice as tall ── */}
      <div
        style={{ position: 'absolute', insetInline: 0, top: `${STRIP_TOP * 100}%`, height: fullH }}
      >
        <motion.div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap,
            x,
            cursor: dragging ? 'grabbing' : 'grab',
          }}
          drag="x"
          dragMomentum={false}
          dragElastic={0.08}
          dragConstraints={{ left: xFor(last), right: xFor(0) }}
          onDragStart={() => setDragging(true)}
          onDragEnd={(_, info) => {
            setDragging(false);
            // Land on whatever card the release sits nearest, nudged by throw
            // velocity so a flick clears more than one card.
            const thrown = x.get() + info.velocity.x * 0.12;
            go(Math.round((box.w / 2 - thrown - cardW / 2) / step));
          }}
        >
          {items.map((item, i) => (
            <motion.button
              key={item.id ?? i}
              type="button"
              aria-label={item.title.replace(/\n/g, ' ')}
              aria-current={i === index}
              onClick={() => go(i)}
              style={{
                position: 'relative',
                flexShrink: 0,
                overflow: 'hidden',
                border: 0,
                padding: 0,
                borderRadius: 0,
                background: 'rgba(234,242,255,0.05)',
                width: cardW,
              }}
              animate={{ height: i === index ? fullH : halfH }}
              transition={spring}
            >
              {/* The focused card is exactly 3:4, so object-position does
                  nothing to it — it only picks which band of the artwork the
                  half-height neighbours keep. */}
              <img
                src={item.image}
                alt=""
                draggable={false}
                style={{
                  height: '100%',
                  width: '100%',
                  objectFit: 'cover',
                  objectPosition: '50% 26%',
                }}
              />
              {/* Unfocused cards sit back a touch without going grey. */}
              <motion.span
                aria-hidden
                style={{ ...fill, background: '#04060c', display: 'block' }}
                animate={{ opacity: i === index ? 0 : 0.12 }}
                transition={spring}
              />
            </motion.button>
          ))}
        </motion.div>
      </div>

      {/* ── Position rail ── */}
      <div
        style={{
          position: 'absolute',
          left: pad,
          bottom: Math.max(14, box.h * 0.022),
          width: box.w * RAIL,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontFamily: 'var(--font-mono)',
            fontVariantNumeric: 'tabular-nums',
            opacity: 0.8,
            fontSize: label,
          }}
        >
          <span>{String(index + 1).padStart(2, '0')}</span>
          <span>{String(items.length).padStart(2, '0')}</span>
        </div>
        <div
          style={{
            position: 'relative',
            marginTop: 8,
            height: 1,
            width: '100%',
            background: 'rgba(234,242,255,0.25)',
          }}
        >
          <motion.div
            style={{
              position: 'absolute',
              insetBlock: 0,
              background: 'var(--ink)',
              width: `${100 / items.length}%`,
            }}
            animate={{ left: `${(index / items.length) * 100}%` }}
            transition={spring}
          />
        </div>
      </div>
    </div>
  );
}

export default HeroCarousel;
