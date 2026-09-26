'use client';

import React, { useEffect, useState } from 'react';

// ServiceGlyph — the single source of truth for the per-service SMIL marks.
//
// Design rule for anything added here: the mark must show WHAT THE SERVICE
// DOES, and the animation must demonstrate its value rather than decorate.
// A funnel that actually converts, a result that actually climbs, a token
// that actually completes a workflow. Abstract shapes that merely rotate are
// what these replaced — they read as "some blue object" on every page.
//
// Everything is procedural SVG on a 64x64 grid (no binary assets — see
// CLAUDE.md's procedural-first rule) and coloured only by the shared classes
// in app/styles/service-pages.css, which resolve to site tokens:
//   .em-stroke cyan · .em-faint muted silver · .em-accent violet · .em-dot cyan
const VIEWBOX = '0 0 64 64';

export const GLYPHS = {
  // 01 — Web Design. A browser whose headline writes itself and whose call
  // to action lands: a page designed to earn the click.
  web: (
    <>
      <rect x="8" y="13" width="48" height="38" rx="4" className="em-stroke" />
      <line x1="8" y1="22" x2="56" y2="22" className="em-stroke em-faint" />
      <circle cx="13.5" cy="17.5" r="1.3" className="em-dot" />
      <circle cx="18" cy="17.5" r="1.3" className="em-dot" />
      <circle cx="22.5" cy="17.5" r="1.3" className="em-dot" />
      {/* headline writes itself */}
      <line x1="14" y1="30" x2="38" y2="30" className="em-stroke em-accent">
        <animate attributeName="x2" dur="5s" repeatCount="indefinite"
          values="14;38;38;14" keyTimes="0;0.32;0.86;1" />
      </line>
      <line x1="14" y1="36.5" x2="46" y2="36.5" className="em-stroke em-faint" />
      {/* the CTA that closes */}
      <rect x="14" y="41" width="17" height="7" rx="3.5" className="em-stroke em-accent">
        <animate attributeName="opacity" dur="5s" repeatCount="indefinite"
          values="0.25;0.25;1;1;0.25" keyTimes="0;0.45;0.6;0.9;1" />
      </rect>
    </>
  ),

  // 02 — Development. Angle brackets with a line of code being written
  // between them: something built, not just designed.
  development: (
    <>
      <path d="M23 18 L11 32 L23 46" className="em-stroke" fill="none" />
      <path d="M41 18 L53 32 L41 46" className="em-stroke" fill="none" />
      <line x1="27" y1="26" x2="37" y2="26" className="em-stroke em-faint" />
      <line x1="27" y1="32" x2="34" y2="32" className="em-stroke em-accent">
        <animate attributeName="x2" dur="3.6s" repeatCount="indefinite"
          values="27;37;37;27" keyTimes="0;0.4;0.85;1" />
      </line>
      <line x1="27" y1="38" x2="35" y2="38" className="em-stroke em-faint" />
      {/* caret */}
      <line x1="38.5" y1="29" x2="38.5" y2="35" className="em-stroke em-accent">
        <animate attributeName="opacity" dur="1.1s" repeatCount="indefinite"
          values="1;1;0;0" keyTimes="0;0.48;0.52;1" />
      </line>
    </>
  ),

  // 03 — Branding. One mark at the centre, consistency radiating out to every
  // touchpoint: an identity system, not a logo file.
  brand: (
    <>
      <circle cx="32" cy="12" r="4" className="em-stroke em-faint" />
      <circle cx="50" cy="43" r="4" className="em-stroke em-faint" />
      <circle cx="14" cy="43" r="4" className="em-stroke em-faint" />
      <line x1="32" y1="22" x2="32" y2="16.5" className="em-stroke em-faint" />
      <line x1="39.5" y1="36.5" x2="46.5" y2="40.5" className="em-stroke em-faint" />
      <line x1="24.5" y1="36.5" x2="17.5" y2="40.5" className="em-stroke em-faint" />
      {/* the system, pulsing outward to every touchpoint */}
      <circle cx="32" cy="31" r="9" className="em-stroke em-accent" fill="none">
        <animate attributeName="r" dur="4.4s" repeatCount="indefinite"
          values="9;21;21" keyTimes="0;0.72;1" />
        <animate attributeName="opacity" dur="4.4s" repeatCount="indefinite"
          values="0.85;0;0" keyTimes="0;0.72;1" />
      </circle>
      <circle cx="32" cy="31" r="9" className="em-stroke" />
      <circle cx="32" cy="31" r="3.2" className="em-dot" />
    </>
  ),

  // 04 — Logo Design. A mark drawn on its construction guides: geometry and
  // restraint, the thing that makes a logo survive every size.
  logo: (
    <>
      <circle cx="32" cy="32" r="19" className="em-stroke em-faint" opacity="0.55" />
      <line x1="32" y1="9" x2="32" y2="55" className="em-stroke em-faint" opacity="0.4" />
      <line x1="9" y1="32" x2="55" y2="32" className="em-stroke em-faint" opacity="0.4" />
      <rect x="19" y="19" width="26" height="26" className="em-stroke em-faint" opacity="0.4" />
      {/* the mark, constructed */}
      <path
        d="M24 44 V29 a8 8 0 0 1 16 0 V44"
        className="em-stroke em-accent"
        fill="none"
        strokeDasharray="62"
      >
        <animate attributeName="stroke-dashoffset" dur="5.4s" repeatCount="indefinite"
          values="62;0;0;62" keyTimes="0;0.42;0.84;1" />
      </path>
    </>
  ),

  // 05 — Digital Marketing. A funnel that actually converts: traffic falls in
  // at the top, one qualified click comes out the bottom.
  marketing: (
    <>
      <path d="M9 15 H55 L38 35 V50 L26 44 V35 Z" className="em-stroke" fill="none" />
      <circle r="2.1" className="em-dot">
        <animateMotion dur="3.2s" repeatCount="indefinite" path="M17,13 L30,35 L31,47" />
        <animate attributeName="opacity" dur="3.2s" repeatCount="indefinite"
          values="0;1;1;0.9;0" keyTimes="0;0.15;0.6;0.85;1" />
      </circle>
      <circle r="2.1" className="em-dot">
        <animateMotion dur="3.2s" begin="1.1s" repeatCount="indefinite" path="M32,13 L33,35 L33,47" />
        <animate attributeName="opacity" dur="3.2s" begin="1.1s" repeatCount="indefinite"
          values="0;1;1;0.9;0" keyTimes="0;0.15;0.6;0.85;1" />
      </circle>
      <circle r="2.1" className="em-dot">
        <animateMotion dur="3.2s" begin="2.1s" repeatCount="indefinite" path="M47,13 L36,35 L35,47" />
        <animate attributeName="opacity" dur="3.2s" begin="2.1s" repeatCount="indefinite"
          values="0;1;1;0.9;0" keyTimes="0;0.15;0.6;0.85;1" />
      </circle>
      <line x1="26" y1="35" x2="38" y2="35" className="em-stroke em-accent" />
    </>
  ),

  // 06 — Animation. A timeline: easing curve, keyframes, and a playhead that
  // sweeps them. The craft of motion, stated literally.
  motion: (
    <>
      <path d="M11 45 C22 45 26 19 53 19" className="em-stroke em-accent" fill="none" />
      <line x1="9" y1="53" x2="55" y2="53" className="em-stroke em-faint" />
      <path d="M11 50 l3 3 l-3 3 l-3 -3 Z" className="em-dot" />
      <path d="M32 50 l3 3 l-3 3 l-3 -3 Z" className="em-dot" />
      <path d="M53 50 l3 3 l-3 3 l-3 -3 Z" className="em-dot" />
      <circle cx="11" cy="45" r="2.4" className="em-dot" />
      <circle cx="53" cy="19" r="2.4" className="em-dot" />
      {/* playhead */}
      <line x1="11" y1="11" x2="11" y2="58" className="em-stroke em-accent" opacity="0.75">
        <animate attributeName="x1" dur="4.2s" repeatCount="indefinite"
          values="11;53;53;11;11" keyTimes="0;0.45;0.55;0.95;1" />
        <animate attributeName="x2" dur="4.2s" repeatCount="indefinite"
          values="11;53;53;11;11" keyTimes="0;0.45;0.55;0.95;1" />
      </line>
    </>
  ),

  // 07 — AI Automation. Messy input on the left, one explainable step in the
  // middle, structured output on the right. Not a black box.
  ai: (
    <>
      <line x1="7" y1="21" x2="19" y2="21" className="em-stroke em-faint" />
      <line x1="7" y1="27" x2="16" y2="27" className="em-stroke em-faint" />
      <line x1="7" y1="33" x2="19" y2="33" className="em-stroke em-faint" />
      <line x1="7" y1="39" x2="14" y2="39" className="em-stroke em-faint" />
      <rect x="24" y="20" width="17" height="20" rx="5" className="em-stroke em-accent" />
      <circle cx="32.5" cy="30" r="3" className="em-dot">
        <animate attributeName="r" dur="2.4s" repeatCount="indefinite" values="2.2;3.8;2.2" />
      </circle>
      <line x1="46" y1="25" x2="57" y2="25" className="em-stroke" />
      <line x1="46" y1="32" x2="57" y2="32" className="em-stroke" />
      <line x1="46" y1="39" x2="52" y2="39" className="em-stroke" />
      <circle r="1.9" className="em-dot">
        <animateMotion dur="2.4s" repeatCount="indefinite" path="M19,30 H24" />
      </circle>
      <circle r="1.9" className="em-dot">
        <animateMotion dur="2.4s" begin="0.5s" repeatCount="indefinite" path="M41,30 H46" />
      </circle>
    </>
  ),

  // 08 — Workflow Automation. A hand-off that completes itself: the token
  // travels the path from intake through the step to done, every time.
  workflow: (
    <>
      <rect x="7" y="13" width="16" height="11" rx="3" className="em-stroke" />
      <rect x="41" y="13" width="16" height="11" rx="3" className="em-stroke" />
      <rect x="24" y="41" width="16" height="11" rx="3" className="em-stroke em-accent" />
      <path d="M23 18.5 H32 V41" className="em-stroke em-faint" fill="none" />
      <path d="M41 18.5 H32" className="em-stroke em-faint" fill="none" />
      <circle r="2.3" className="em-dot">
        <animateMotion dur="4s" repeatCount="indefinite" path="M23,18.5 H32 V41" />
      </circle>
      {/* done */}
      <path d="M28 46.5 l3 3 l5 -6" className="em-stroke" fill="none">
        <animate attributeName="opacity" dur="4s" repeatCount="indefinite"
          values="0;0;1;1;0" keyTimes="0;0.62;0.72;0.95;1" />
      </path>
    </>
  ),

  // 09 — SEO. A results page where your listing climbs past the others into
  // the first position. Standalone pillar page only (not a rail signal).
  seo: (
    <>
      <rect x="8" y="9" width="48" height="11" rx="5.5" className="em-stroke" />
      <circle cx="16.5" cy="14.5" r="3.2" className="em-stroke em-faint" />
      <line x1="19" y1="17" x2="21.5" y2="19.5" className="em-stroke em-faint" />
      <line x1="27" y1="14.5" x2="48" y2="14.5" className="em-stroke em-faint" opacity="0.6" />
      {/* the other results */}
      <line x1="10" y1="30" x2="44" y2="30" className="em-stroke em-faint" />
      <line x1="10" y1="39" x2="39" y2="39" className="em-stroke em-faint" />
      <line x1="10" y1="48" x2="46" y2="48" className="em-stroke em-faint" />
      {/* yours, climbing to the top */}
      <line x1="10" y1="48" x2="35" y2="48" className="em-stroke em-accent">
        <animate attributeName="y1" dur="5s" repeatCount="indefinite"
          values="48;48;30;30" keyTimes="0;0.22;0.62;1" />
        <animate attributeName="y2" dur="5s" repeatCount="indefinite"
          values="48;48;30;30" keyTimes="0;0.22;0.62;1" />
      </line>
      <circle cx="53" cy="30" r="2.4" className="em-dot">
        <animate attributeName="opacity" dur="5s" repeatCount="indefinite"
          values="0;0;1;1;0" keyTimes="0;0.6;0.7;0.95;1" />
      </circle>
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
// them - they have to be stripped from the render tree itself.
export function useReducedMotion() {
  // Start as "reduced" so the first render (and SSR) is static. SMIL starts
  // playing the moment the elements mount, so defaulting to false would let a
  // reduced-motion visitor see animation before the effect reads their
  // preference. Motion is enabled only once matchMedia confirms it is allowed.
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mql.matches);
    const onChange = (e) => setReduced(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

export default function SvgMark({ signal, animate }) {
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
