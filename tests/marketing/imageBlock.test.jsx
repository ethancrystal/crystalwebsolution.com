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
    expect(figure).toHaveClass('mkt-image-block--blur');
  });

  it('does not apply blur-up class when placeholder is not provided', () => {
    render(<ImageBlock src={src} alt={alt} />);
    const figure = screen.getByRole('img', { name: alt }).parentElement;
    expect(figure).not.toHaveClass('mkt-image-block--blur');
  });
});
