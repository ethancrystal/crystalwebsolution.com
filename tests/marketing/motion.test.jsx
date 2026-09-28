import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Motion from '@/components/sections/Motion';
import { CLIENT_TILE_IMAGES } from '@/lib/clientTileImages.mjs';
import { PROJECTS } from '@/lib/projects';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe('Motion', () => {
  it('wires WorkMarquee to CLIENT_TILE_IMAGES, not PROJECTS or some other source', () => {
    const { container } = render(<Motion />);
    const marquee = container.querySelector('.motion-marquee');
    expect(marquee).not.toBeNull();

    // First row's first tile is CLIENT_TILE_IMAGES[0] (no row offset on row 0).
    const firstTileImg = marquee.querySelector('.work-marquee-tile img');
    expect(firstTileImg).toHaveAttribute('src', CLIENT_TILE_IMAGES[0]);

    // Every rendered <img> src is either an original CLIENT_TILE_IMAGES
    // screenshot or the one non-webm replacement asset (a .gif, which
    // WorkMarquee also renders as <img> since it isn't .webm/.mp4) --
    // confirms the wiring didn't drift to reading from PROJECTS or an
    // unrelated asset list.
    const imgSrcs = Array.from(marquee.querySelectorAll('img')).map((img) => img.getAttribute('src'));
    imgSrcs.forEach((src) => {
      expect(CLIENT_TILE_IMAGES.includes(src) || src.endsWith('.gif')).toBe(true);
    });
  });

  it('cycles REPLACEMENT_IMAGES into the marquee as the second-half <video> tiles', () => {
    const { container } = render(<Motion />);
    const marquee = container.querySelector('.motion-marquee');
    const videos = marquee.querySelectorAll('video');

    // REPLACEMENT_IMAGES has both .webm and .gif entries; only the .webm
    // ones match WorkMarquee's video-extension test, so <video> tiles must
    // exist and every one of their srcs must end in .webm.
    expect(videos.length).toBeGreaterThan(0);
    videos.forEach((video) => {
      expect(video.getAttribute('src')).toMatch(/\.webm$/);
    });
  });

  it('renders one accessible list item per PROJECTS entry, independent of the decorative marquee', () => {
    const { container } = render(<Motion />);
    const items = container.querySelectorAll('.motion-stream-item');
    expect(items).toHaveLength(PROJECTS.length);

    const hrefs = Array.from(items).map((a) => a.getAttribute('href'));
    PROJECTS.forEach((project) => {
      expect(hrefs).toContain(`/work/${project.slug}`);
    });
  });

  it('keeps the marquee aria-hidden so the accessible project list is the only real navigation', () => {
    const { container } = render(<Motion />);
    const marquee = container.querySelector('.motion-marquee');
    expect(marquee).toHaveAttribute('aria-hidden', 'true');

    const list = container.querySelector('.motion-stream-index');
    expect(list.hasAttribute('aria-hidden')).toBe(false);
  });
});
