import { render, screen } from '@testing-library/react';
import ImageBlock from '../../components/marketing/ImageBlock';

describe('ImageBlock', () => {
  const src = '/images/test.jpg';
  const alt = 'Test image';
  const placeholder = '/images/placeholder.jpg';

  test('renders img with correct src and alt', () => {
    render(<ImageBlock src={src} alt={alt} />);
    const img = screen.getByRole('img', { name: alt });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', src);
  });

  test('applies blur-up class when placeholder is provided', () => {
    render(<ImageBlock src={src} alt={alt} placeholder={placeholder} />);
    const figure = screen.getByRole('img', { name: alt }).parentElement;
    expect(figure).toHaveClass('mkt-image-block--blur');
  });
});