'use client';

import dynamic from 'next/dynamic';
import SvgMark from './ServiceGlyph';

// Client-only: the R3F canvas must never render on the server.
const ServiceEmblem3D = dynamic(() => import('../three/ServiceEmblem3D'), {
  ssr: false,
  loading: () => <span className="mkt-emblem mkt-emblem--placeholder" aria-hidden="true" />,
});

// The per-service SMIL marks live in ServiceGlyph.jsx (single source of
// truth). The /services/[slug] hero uses the 3D emblem below instead.

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
