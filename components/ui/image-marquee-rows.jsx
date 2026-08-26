'use client';

import * as React from 'react';

/* ── the corridor ────────────────────────────────────────────────
 * Flat rows of project tiles drift past at different speeds and
 * directions, entirely below the accessible project list rendered
 * by the caller. Unlike a full-bleed background effect, each row is
 * a normal block in the document flow, so the decorative art can
 * never compete with real navigation for screen space.
 *
 * Client work photography is limited, so every row reuses the same
 * image set rather than partitioning it thin — each row just walks
 * a different rotation/order so the rows don't scroll in lockstep.
 * Each row's sequence is duplicated once so the -50% translate loop
 * is seamless; that duplication is the only place an image repeats.
 * ─────────────────────────────────────────────────────────────── */

function rotate(list, by) {
  const n = list.length;
  return list.map((_, i) => list[(i + by) % n]);
}

export function ImageMarqueeRows({ images, rows = 3, className = '', style, ...props }) {
  const laidOutRows = React.useMemo(() => {
    if (!images?.length) return [];
    return Array.from({ length: rows }, (_, i) => {
      const sequence = i % 2 === 0 ? rotate(images, i) : rotate([...images].reverse(), i);
      return {
        dir: i % 2 === 0 ? 'left' : 'right',
        duration: 46 + i * 9,
        tiles: [...sequence, ...sequence],
      };
    });
  }, [images, rows]);

  if (!laidOutRows.length) return null;

  return (
    <div className={className} style={style} aria-hidden="true" {...props}>
      {laidOutRows.map((row, i) => (
        <div className="motion-marquee-row" data-dir={row.dir} key={i}>
          <div
            className="motion-marquee-track"
            style={{ '--marquee-duration': `${row.duration}s` }}
          >
            {row.tiles.map((img, j) => (
              <div className="motion-marquee-tile" key={j}>
                <img
                  src={img.src}
                  alt=""
                  loading={i === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                  draggable={false}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default ImageMarqueeRows;
