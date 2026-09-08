# Shared UI primitives

Marketing/service pages use custom primitives, not shadcn.

## BrandLogo
Home-mark image from SITE.logoPath.

### `components/BrandLogo.jsx`

```jsx
import { SITE } from '../lib/site';

export default function BrandLogo() {
  return (
    // The logo <img> carries the brand name for assistive technology while the
    // wrapping home link provides the navigation context.
    <span className="nav-logo-art">
      <img
        className="nav-logo-art-full"
        src={SITE.logoPath}
        alt={SITE.name}
        width={SITE.logoWidth}
        height={SITE.logoHeight}
      />
    </span>
  );
}
```


## GlowCard
Pointer-tracked cyan/blue/violet border glow. Writes CSS vars on the node.

### `components/ui/GlowCard.jsx`

```jsx
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
```


## PageHero
Eyebrow + h1 + lede. Single H1 per page.

### `components/marketing/PageHero.jsx`

```jsx
import SectionReveal from '../SectionReveal';

// PageHero — the opening block for inner marketing pages. Reuses the existing
// text-plate + eyebrow + page-title visual language so inner pages feel of a
// piece with the homepage, without importing any homepage runtime.
export default function PageHero({ eyebrow, title, lede, children }) {
  return (
    <section className="mkt-hero">
      <div className="text-plate">
        {eyebrow && (
          <p className="eyebrow">
            <SectionReveal as="span" direction="left">{eyebrow}</SectionReveal>
          </p>
        )}
        <SectionReveal as="h1" className="page-title mkt-hero-title" direction="left" delay={0.05}>
          {title}
        </SectionReveal>
        {lede && (
          <SectionReveal as="p" className="mkt-hero-lede" direction="up" delay={0.15}>
            {lede}
          </SectionReveal>
        )}
        <SectionReveal direction="up" delay={0.2}>
          {children}
        </SectionReveal>
      </div>
    </section>
  );
}
```


## ContentSection
h2 section block with optional alt tone.

### `components/marketing/ContentSection.jsx`

```jsx
import SectionReveal from '../SectionReveal';

// ContentSection — a labelled content block used across inner marketing pages.
// `tone` switches the background plate so consecutive sections stay legible
// over the same dark canvas. No client-side runtime of its own.
export default function ContentSection({ eyebrow, title, children, tone = 'default', id }) {
  return (
    <section className={`mkt-section mkt-section--${tone}`} id={id}>
      <div className="mkt-section-inner">
        {eyebrow && (
          <p className="eyebrow">
            <SectionReveal as="span" direction="left">{eyebrow}</SectionReveal>
          </p>
        )}
        {title && (
          <SectionReveal as="h2" className="mkt-section-title" direction="left" delay={0.05}>
            {title}
          </SectionReveal>
        )}
        <SectionReveal direction="up" delay={0.15}>
          {children}
        </SectionReveal>
      </div>
    </section>
  );
}
```


## ServiceEmblem
SVG or 3D signal instrument. Reduced motion strips SMIL.

### `components/marketing/ServiceEmblem.jsx`

```jsx
'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Client-only: the R3F canvas must never render on the server.
const ServiceEmblem3D = dynamic(() => import('../three/ServiceEmblem3D'), {
  ssr: false,
  loading: () => <span className="mkt-emblem mkt-emblem--placeholder" aria-hidden="true" />,
});

const VIEWBOX = '0 0 64 64';

const GLYPHS = {
  web: (
    <>
      <rect x="10" y="16" width="44" height="34" rx="4" className="em-stroke" />
      <line x1="10" y1="24" x2="54" y2="24" className="em-stroke em-faint" />
      <circle cx="15" cy="20" r="1.5" className="em-dot" />
      <circle cx="20" cy="20" r="1.5" className="em-dot" />
      <circle cx="25" cy="20" r="1.5" className="em-dot" />
      <polyline points="16,44 26,34 34,40 48,26" className="em-stroke em-accent" fill="none">
        <animate attributeName="points"
          dur="4s" repeatCount="indefinite"
          values="16,44 26,34 34,40 48,26; 16,44 26,40 34,32 48,24; 16,44 26,34 34,40 48,26" />
      </polyline>
    </>
  ),
  development: (
    <>
      <rect x="14" y="14" width="36" height="36" rx="3" className="em-stroke" />
      <rect x="22" y="22" width="20" height="20" rx="2" className="em-stroke em-accent" fill="none">
        <animateTransform attributeName="transform" type="rotate"
          from="0 32 32" to="360 32 32" dur="9s" repeatCount="indefinite" />
      </rect>
      <line x1="32" y1="14" x2="32" y2="22" className="em-stroke em-faint" />
      <line x1="32" y1="42" x2="32" y2="50" className="em-stroke em-faint" />
    </>
  ),
  brand: (
    <>
      <circle cx="26" cy="30" r="14" className="em-stroke" />
      <circle cx="40" cy="36" r="14" className="em-stroke em-accent" fill="none">
        <animate attributeName="r" dur="3.5s" repeatCount="indefinite" values="14;15.5;14" />
      </circle>
      <circle cx="26" cy="30" r="4" className="em-dot" />
    </>
  ),
  logo: (
    <>
      <rect x="16" y="16" width="32" height="32" rx="2" className="em-stroke" />
      <path d="M24 40 L24 24 L40 24" className="em-stroke em-accent" fill="none" strokeLinecap="round">
        <animate attributeName="opacity" dur="2.6s" repeatCount="indefinite" values="0.4;1;0.4" />
      </path>
      <path d="M40 24 L40 40 L24 40" className="em-stroke em-faint" fill="none" strokeLinecap="round" />
    </>
  ),
  marketing: (
    <>
      <rect x="14" y="40" width="8" height="10" className="em-stroke em-faint" />
      <rect x="28" y="32" width="8" height="18" className="em-stroke em-faint" />
      <rect x="42" y="22" width="8" height="28" className="em-stroke em-accent">
        <animate attributeName="height" dur="3s" repeatCount="indefinite" values="28;18;28" />
        <animate attributeName="y" dur="3s" repeatCount="indefinite" values="22;32;22" />
      </rect>
      <polyline points="18,30 32,24 46,16" className="em-stroke em-accent" fill="none" />
    </>
  ),
  motion: (
    <>
      <circle cx="32" cy="32" r="10" className="em-stroke" />
      <circle cx="32" cy="32" r="20" className="em-stroke em-faint" fill="none" />
      <circle r="3" className="em-dot" fill="currentColor">
        <animateMotion dur="5s" repeatCount="indefinite" path="M32,12 a20,20 0 1,1 -0.1,0" />
      </circle>
      <line x1="32" y1="32" x2="32" y2="22" className="em-stroke em-accent" />
    </>
  ),
  ai: (
    <>
      <circle cx="20" cy="22" r="4" className="em-stroke" />
      <circle cx="44" cy="20" r="4" className="em-stroke" />
      <circle cx="32" cy="44" r="4" className="em-stroke em-accent" />
      <line x1="20" y1="22" x2="32" y2="44" className="em-stroke em-faint" />
      <line x1="44" y1="20" x2="32" y2="44" className="em-stroke em-faint" />
      <line x1="20" y1="22" x2="44" y2="20" className="em-stroke em-accent">
        <animate attributeName="opacity" dur="2.4s" repeatCount="indefinite" values="0.3;1;0.3" />
      </line>
    </>
  ),
  workflow: (
    <>
      <rect x="12" y="26" width="40" height="12" rx="6" className="em-stroke" />
      <circle cx="18" cy="32" r="3" className="em-dot">
        <animateMotion dur="4s" repeatCount="indefinite" path="M0,0 H40" />
      </circle>
      <path d="M44 22 L52 32 L44 42" className="em-stroke em-accent" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <animateTransform attributeName="transform" type="rotate"
          from="0 48 32" to="360 48 32" dur="6s" repeatCount="indefinite" />
      </path>
    </>
  ),
};

function stripAnimations(children) {
  return React.Children.map(children, (child) => {
    if (!React.isValidElement(child)) return child;
    if (typeof child.type === 'string' && /^animate(Transform|Motion)?$/.test(child.type)) {
      return null;
    }
    if (child.props && child.props.children) {
      return React.cloneElement(child, {}, stripAnimations(child.props.children));
    }
    return child;
  });
}

// SMIL <animate>/<animateTransform>/<animateMotion> elements run outside
// CSS, so a `prefers-reduced-motion` media query in globals.css can't gate
// them - they have to be stripped from the render tree itself, mirroring
// how ServiceEmblem3D.jsx gates its useFrame rotation/glow.
function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mql.matches);
    const onChange = (e) => setReduced(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

function SvgMark({ signal, animate }) {
  const reducedMotion = useReducedMotion();
  const glyph = GLYPHS[signal] || GLYPHS.web;
  const shouldAnimate = animate && !reducedMotion;
  const content = shouldAnimate ? glyph : stripAnimations(glyph);
  return (
    <svg viewBox={VIEWBOX} width="100%" height="100%" role="presentation"
      className={shouldAnimate ? 'mkt-emblem-svg' : 'mkt-emblem-svg mkt-emblem-svg--static'}>
      {content}
    </svg>
  );
}

export default function ServiceEmblem({ signal, n, size = 64, variant = 'svg', className = '' }) {
  if (variant === '3d') {
    return (
      // No aria-hidden here: ServiceEmblem3D renders a real, focusable
      // tooltip-toggle button (its Canvas alone carries aria-hidden), so
      // hiding this whole subtree would keep the button keyboard-tabbable
      // while making it invisible to assistive tech.
      <span className={`mkt-emblem mkt-emblem--3d ${className}`}>
        <ServiceEmblem3D signal={signal} />
        {n && <span className="mkt-emblem-n">{n}</span>}
      </span>
    );
  }
  return (
    <span className={`mkt-emblem ${className}`} data-signal={signal} aria-hidden="true">
      <SvgMark signal={signal} animate={variant !== 'static'} />
      {n && <span className="mkt-emblem-n">{n}</span>}
    </span>
  );
}
```


## ServiceGrid
Index cards for the eight offers.

### `components/marketing/ServiceGrid.jsx`

```jsx
import Link from 'next/link';
import ServiceEmblem from './ServiceEmblem';
import GlowCard from '../ui/GlowCard';

// ServiceGrid — the shared index of all eight offers. Used by /services and
// reusable anywhere a compact offer list is needed. Each card mirrors the
// homepage Services row identity: the `n` numeral + a per-signal animated
// emblem (ServiceEmblem) + title + short desc, wired to its /services/[slug]
// page. Coherent with the rest of the marketing system via .mkt-* tokens.
export default function ServiceGrid({ pages, className = '' }) {
  return (
    <ul className={`mkt-service-grid ${className}`}>
      {pages.map((page) => (
        <GlowCard as="li" key={page.slug} className="mkt-service-card">
          <Link href={`/services/${page.slug}`} className="mkt-service-card-link">
            <ServiceEmblem signal={page.signal} n={page.n} size={56} className="mkt-service-card-emblem" />
            <h2 className="mkt-service-card-title">{page.title}</h2>
            <p className="mkt-service-card-desc">{page.hero}</p>
            <span className="mkt-service-card-cta">Explore {page.title} →</span>
          </Link>
        </GlowCard>
      ))}
    </ul>
  );
}
```

