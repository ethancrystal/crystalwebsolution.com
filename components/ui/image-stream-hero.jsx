'use client';

import * as React from 'react';

/* ── the corridor ────────────────────────────────────────────────
 * Two rails of cards ride from far behind the screen toward the
 * viewer. Perspective alone does the work that looks like two
 * animations: as a card's z grows it gets bigger *and* its screen x
 * sweeps outward from the vanishing point, because the projection
 * scales position and size by the same factor.
 *
 * 1. Depth is authored as *apparent size*, geometrically — each card
 *    is a constant ratio bigger than the one behind it, so the near
 *    cards never tear apart from each other as the projection blows up.
 * 2. The rails open hard in the first stretch and then hold (`fan` > 1),
 *    so the ribbon leaves the centre as a flat band, bends once, and
 *    only then runs out on the diagonal.
 * 3. Neither end of the loop is ever on screen: a card dies past the
 *    frame edge and is born *across* the axis (`railBirth` negative),
 *    so the throat never blinks open.
 *
 * Every length is in `cqw` so the corridor keeps its proportions at
 * any size. Adapted from the shadcn/Tailwind original to this repo's
 * plain-JSX + inline-style conventions; behaviour is unchanged.
 * ─────────────────────────────────────────────────────────────── */

const PATH = {
  perspective: 30,
  cardWidth: 18,
  cardHeight: 25,
  cardRadius: 0.4,
  birthHeight: 2.6,
  exitHeight: 46,
  railBirth: -11,
  railExit: 44,
  fan: 3.3,
  turnBirth: 6,
  turnExit: 28,
  stops: 24,
};

/** Sample the path once so the CSS keyframes trace the real curve. */
function keyframes(dir, name, p) {
  const steps = [];
  for (let s = 0; s <= p.stops; s++) {
    const u = s / p.stops;
    // Geometric in apparent size, so consecutive cards keep a constant
    // size ratio and the ribbon stays solid at both ends.
    const scale =
      (p.birthHeight / p.cardHeight) * Math.pow(p.exitHeight / p.birthHeight, u);
    const z = p.perspective * (1 - 1 / scale);
    const rail = p.railExit - (p.railExit - p.railBirth) * Math.pow(1 - u, p.fan);
    const turn = p.turnBirth + (p.turnExit - p.turnBirth) * u;
    steps.push(
      `${(u * 100).toFixed(2)}%{transform:translate3d(${(dir * rail).toFixed(2)}cqw,0,${z.toFixed(2)}cqw) rotateY(${(-dir * turn).toFixed(2)}deg)}`,
    );
  }
  return `@keyframes ${name}{${steps.join('')}}`;
}

export function ImageStreamHero({
  images,
  cards = 9,
  speed = 18,
  axis = 55,
  path,
  children,
  className = '',
  style,
  ...props
}) {
  const id = React.useId().replace(/[^a-zA-Z0-9]/g, '');
  const right = `ish-r-${id}`;
  const left = `ish-l-${id}`;
  const card = `ish-c-${id}`;

  const p = React.useMemo(() => ({ ...PATH, ...path }), [path]);

  const css = React.useMemo(
    () =>
      `${keyframes(1, right, p)}${keyframes(-1, left, p)}` +
      // Pausing rather than disabling keeps the corridor whole: every card
      // is already dropped mid-flight by its negative delay, so it freezes
      // as a finished still instead of collapsing onto the axis.
      `@media(prefers-reduced-motion:reduce){.${card}{animation-play-state:paused}}`,
    [right, left, card, p],
  );

  return (
    <div
      className={className}
      {...props}
      style={{
        position: 'relative',
        overflow: 'hidden',
        containerType: 'inline-size',
        ...style,
      }}
    >
      <style>{css}</style>

      <div
        aria-hidden
        style={{
          pointerEvents: 'none',
          position: 'absolute',
          inset: 0,
          perspective: `${p.perspective}cqw`,
          perspectiveOrigin: `50% ${axis}%`,
        }}
      >
        <div style={{ position: 'absolute', inset: 0, transformStyle: 'preserve-3d' }}>
          {[right, left].map((name, railIndex) => {
            const railImages = images.slice(railIndex * cards, (railIndex + 1) * cards);
            return railImages.map((img, i) => (
              <div
                key={`${name}-${i}`}
                className={card}
                style={{
                  position: 'absolute',
                  overflow: 'hidden',
                  left: '50%',
                  top: `${axis}%`,
                  width: `${p.cardWidth}cqw`,
                  height: `${p.cardHeight}cqw`,
                  marginLeft: `${-p.cardWidth / 2}cqw`,
                  marginTop: `${-p.cardHeight / 2}cqw`,
                  borderRadius: `${p.cardRadius}cqw`,
                  animation: `${name} ${speed}s linear infinite`,
                  // Negative delay drops each card mid-flight, so the
                  // corridor is already full on the first frame.
                  animationDelay: `${-(i * speed) / cards}s`,
                  backfaceVisibility: 'hidden',
                }}
              >
                <img
                  src={img.src}
                  alt={img.alt ?? ''}
                  // Eager on purpose: stream art is inline data-URI SVG
                  // (no network cost), and lazy heuristics skip images
                  // that sit deep in a preserve-3d transform.
                  loading="eager"
                  decoding="async"
                  draggable={false}
                  style={{ height: '100%', width: '100%', objectFit: 'cover' }}
                />
              </div>
            ));
          })}
        </div>
      </div>

      {children}
    </div>
  );
}

export default ImageStreamHero;
