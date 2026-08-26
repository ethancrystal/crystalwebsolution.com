'use client';

import * as React from 'react';

// Three parallel rails of real client-site screenshots drifting past at
// different speeds/directions. Purely decorative (aria-hidden) — the
// accessible project list sits beside it as the real navigation.
export function WorkMarquee({ images, rows = 3, className = '', style }) {
  const id = React.useId().replace(/[^a-zA-Z0-9]/g, '');

  const rails = React.useMemo(() => {
    const durations = [70, 82, 76];
    const directions = ['left', 'right', 'left'];
    return Array.from({ length: rows }, (_, rowIndex) => {
      // Offset each row's starting point around the same image set so no
      // two rows open on the same tile, without needing more source assets.
      const offset = Math.floor((images.length / rows) * rowIndex) % images.length;
      const ordered = images.slice(offset).concat(images.slice(0, offset));
      return {
        tiles: ordered.concat(ordered),
        direction: directions[rowIndex % directions.length],
        duration: durations[rowIndex % durations.length],
      };
    });
  }, [images, rows]);

  return (
    <div className={`work-marquee ${className}`.trim()} style={style} aria-hidden="true">
      {rails.map((rail, rowIndex) => (
        <div className="work-marquee-row" key={rowIndex}>
          <div
            className={`work-marquee-track work-marquee-track--${rail.direction}`}
            style={{ animationDuration: `${rail.duration}s` }}
          >
            {rail.tiles.map((src, i) => (
              <div className="work-marquee-tile" key={`${id}-${rowIndex}-${i}`}>
                <img
                  src={src}
                  alt=""
                  loading={rowIndex === 0 && i < 4 ? 'eager' : 'lazy'}
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

export default WorkMarquee;
