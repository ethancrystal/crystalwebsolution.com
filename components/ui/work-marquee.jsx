'use client';
// @ts-check

import * as React from 'react';

// Three parallel rails of real client-site screenshots drifting past at
// different speeds/directions. Purely decorative (aria-hidden) — the
// accessible project list sits beside it as the real navigation.
/**
 * @param {Object} props
 * @param {string[]} props.images - Client-site screenshot URLs.
 * @param {string[]} [props.replacementImages] - Animated (WebM/GIF) media cycled into each rail's second half.
 * @param {number} [props.rows]
 * @param {string} [props.className]
 * @param {import('react').CSSProperties} [props.style]
 * @returns {import('react').ReactElement}
 */
export function WorkMarquee({ images, replacementImages, rows = 3, className = '', style }) {
  const id = React.useId().replace(/[^a-zA-Z0-9]/g, '');

  const rails = React.useMemo(() => {
    const durations = [70, 82, 76];
    const directions = ['left', 'right', 'left'];
    return Array.from({ length: rows }, (_, rowIndex) => {
      // Offset each row's starting point around the same image set so no
      // two rows open on the same tile, without needing more source assets.
      const offset = Math.floor((images.length / rows) * rowIndex) % images.length;
      const ordered = images.slice(offset).concat(images.slice(0, offset));

      // Second half: use replacement (animated) media if provided, cycling
      // through the available assets. Falls back to duplicating originals.
      let secondHalf;
      if (replacementImages && replacementImages.length > 0) {
        const repOffset = Math.floor((replacementImages.length / rows) * rowIndex) % replacementImages.length;
        const repOrdered = replacementImages.slice(repOffset).concat(replacementImages.slice(0, repOffset));
        secondHalf = Array.from({ length: ordered.length }, (_, i) => repOrdered[i % repOrdered.length]);
      } else {
        secondHalf = ordered;
      }

      return {
        tiles: ordered.concat(secondHalf),
        direction: directions[rowIndex % directions.length],
        duration: durations[rowIndex % durations.length],
      };
    });
  }, [images, replacementImages, rows]);

  return (
    <div className={`work-marquee ${className}`.trim()} style={style} aria-hidden="true">
      {rails.map((rail, rowIndex) => (
        <div className="work-marquee-row" key={rowIndex}>
          <div
            className={`work-marquee-track work-marquee-track--${rail.direction}`}
            style={{ animationDuration: `${rail.duration}s` }}
          >
            {rail.tiles.map((src, i) => {
              const isVideo = /\.(webm|mp4)$/i.test(src);
              return (
                <div className="work-marquee-tile" key={`${id}-${rowIndex}-${i}`}>
                  {isVideo ? (
                    <video
                      src={src}
                      autoPlay
                      loop
                      muted
                      playsInline
                      preload={rowIndex === 0 && i < 4 ? 'auto' : 'metadata'}
                      draggable={false}
                    />
                  ) : (
                    <img
                      src={src}
                      alt=""
                      loading={rowIndex === 0 && i < 4 ? 'eager' : 'lazy'}
                      decoding="async"
                      draggable={false}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default WorkMarquee;
