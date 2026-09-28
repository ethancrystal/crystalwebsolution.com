import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import WorkMarquee from '@/components/ui/work-marquee';

describe('WorkMarquee', () => {
  const images = ['/a.jpg', '/b.jpg', '/c.jpg', '/d.jpg', '/e.jpg', '/f.jpg'];
  const replacementImages = ['/x.webm', '/y.mp4'];

  it('is decorative: root is aria-hidden, no accessible role', () => {
    const { container } = render(<WorkMarquee images={images} />);
    const root = container.querySelector('.work-marquee');
    expect(root).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders one row per the rows prop, defaulting to 3', () => {
    const { container } = render(<WorkMarquee images={images} />);
    expect(container.querySelectorAll('.work-marquee-row')).toHaveLength(3);
  });

  it('renders the requested row count when overridden', () => {
    const { container } = render(<WorkMarquee images={images} rows={2} />);
    expect(container.querySelectorAll('.work-marquee-row')).toHaveLength(2);
  });

  it('duplicates the original images for the second half when no replacementImages are given', () => {
    const { container } = render(<WorkMarquee images={images} rows={1} />);
    const tiles = container.querySelectorAll('.work-marquee-tile img');
    expect(tiles).toHaveLength(images.length * 2);
    // First half and second half both come from `images` only -- no <video> at all.
    expect(container.querySelectorAll('.work-marquee-tile video')).toHaveLength(0);
  });

  it('cycles replacementImages into the second half of each rail as <video>, keeping the first half as <img>', () => {
    const { container } = render(
      <WorkMarquee images={images} replacementImages={replacementImages} rows={1} />
    );
    const row = container.querySelector('.work-marquee-row');
    const tiles = Array.from(row.querySelectorAll('.work-marquee-tile'));
    expect(tiles).toHaveLength(images.length * 2);

    const firstHalf = tiles.slice(0, images.length);
    const secondHalf = tiles.slice(images.length);
    firstHalf.forEach((tile) => {
      expect(tile.querySelector('img')).not.toBeNull();
      expect(tile.querySelector('video')).toBeNull();
    });
    secondHalf.forEach((tile) => {
      expect(tile.querySelector('video')).not.toBeNull();
      expect(tile.querySelector('img')).toBeNull();
    });
  });

  it('selects <video> vs <img> by file extension, not by which prop supplied the src', () => {
    // A .mp4/.webm URL passed via `images` should still render as <video>.
    const { container } = render(<WorkMarquee images={['/clip.mp4', '/still.jpg']} rows={1} />);
    const tiles = container.querySelectorAll('.work-marquee-tile');
    const [first] = tiles;
    expect(first.querySelector('video')).not.toBeNull();
    expect(first.querySelector('img')).toBeNull();
  });

  it('eager-loads only the first 4 tiles of the first row; later rows and later tiles lazy-load', () => {
    const many = Array.from({ length: 6 }, (_, i) => `/img-${i}.jpg`);
    const { container } = render(<WorkMarquee images={many} rows={2} />);
    const rows = container.querySelectorAll('.work-marquee-row');
    const firstRowImgs = rows[0].querySelectorAll('img');
    firstRowImgs.forEach((img, i) => {
      expect(img).toHaveAttribute('loading', i < 4 ? 'eager' : 'lazy');
    });
    const secondRowImgs = rows[1].querySelectorAll('img');
    secondRowImgs.forEach((img) => {
      expect(img).toHaveAttribute('loading', 'lazy');
    });
  });

  it('sets muted autoPlay loop playsInline on replacement videos', () => {
    const { container } = render(
      <WorkMarquee images={images} replacementImages={replacementImages} rows={1} />
    );
    const video = container.querySelector('.work-marquee-tile video');
    expect(video).toHaveAttribute('autoplay');
    expect(video).toHaveAttribute('loop');
    // React sets `muted` as a DOM property (not a reflected HTML attribute)
    // specifically so autoplay-without-sound isn't blocked by browsers that
    // gate on the attribute being present at parse time.
    expect(video.muted).toBe(true);
    expect(video).toHaveAttribute('playsinline');
  });

  it('offsets each row into a different starting tile so rows do not open on the same image', () => {
    const { container } = render(<WorkMarquee images={images} rows={3} />);
    const rows = container.querySelectorAll('.work-marquee-row');
    const firstTileSrcs = Array.from(rows).map(
      (row) => row.querySelector('.work-marquee-tile img').getAttribute('src')
    );
    expect(new Set(firstTileSrcs).size).toBe(firstTileSrcs.length);
  });
});
