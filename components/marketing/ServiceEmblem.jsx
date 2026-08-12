'use client';

import React from 'react';
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

function SvgMark({ signal, animate }) {
  const glyph = GLYPHS[signal] || GLYPHS.web;
  const content = animate ? glyph : stripAnimations(glyph);
  return (
    <svg viewBox={VIEWBOX} width="100%" height="100%" role="presentation"
      className={animate ? 'mkt-emblem-svg' : 'mkt-emblem-svg mkt-emblem-svg--static'}>
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
        {n && <span className="mkt-emblem-n" aria-hidden="true">{n}</span>}
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
