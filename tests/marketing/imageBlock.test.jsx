import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ImageBlock from '@/components/marketing/ImageBlock';

describe('ImageBlock', () => {
  const src = '/test-image.jpg';
  const alt = 'Test image';
  const placeholder = '/test-placeholder.jpg';

  it('renders img with correct src and alt', () => {
    render(<ImageBlock src={src} alt={alt} />);
    const img = screen.getByRole('img', { name: alt });
    expect(img).toHaveAttribute('src', src);
    expect(img).toHaveAttribute('alt', alt);
  });

  it('applies blur-up class when placeholder is provided', () => {
    render(<ImageBlock src={src} alt={alt} placeholder={placeholder} />);
    const figure = screen.getByRole('img', { name: alt }).parentElement;
    // These are CSS Modules classes -- Vite scopes/hashes the name (e.g.
    // "_mkt-image-block--blur_3eaae5"), so match by substring rather than
    // the exact source-level class name.
    expect(figure.className).toMatch(/mkt-image-block--blur/);
  });

  it('does not apply blur-up class when placeholder is not provided', () => {
    render(<ImageBlock src={src} alt={alt} />);
    const figure = screen.getByRole('img', { name: alt }).parentElement;
    expect(figure.className).not.toMatch(/mkt-image-block--blur/);
  });

  it('resolves classNames through the CSS Modules styles object, not literal source strings', () => {
    render(<ImageBlock src={src} alt={alt} placeholder={placeholder} />);
    const img = screen.getByRole('img', { name: alt });
    const figure = img.parentElement;
    // A literal, unscoped className (the pre-fix bug) would render exactly
    // "mkt-image-block" / "mkt-image-block__image" with no hash suffix.
    // Vite's CSS Modules loader always appends a scope hash, so the
    // presence of one is a reliable signal the import is being used
    // correctly rather than discarded.
    expect(figure.className).toMatch(/^_mkt-image-block(_|\s)/);
    expect(img.className).toMatch(/^_mkt-image-block__image_/);
  });
});
