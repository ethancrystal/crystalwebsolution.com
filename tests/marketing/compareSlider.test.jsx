import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import CompareSlider from '@/components/heritage/CompareSlider';

afterEach(cleanup);

const before = { src: '/heritage/artwork-original.webp', w: 500, h: 500, alt: 'Original artwork' };
const after = { src: '/heritage/artwork-corrected.webp', w: 500, h: 500, alt: 'Corrected artwork' };

function setup() {
  const { container } = render(
    <CompareSlider before={before} after={after} beforeLabel="the original" afterLabel="the corrected" />,
  );
  const handle = screen.getByRole('slider', { name: /Compare the original with the corrected/ });
  const panes = container.querySelectorAll('.hx-compare-pane');
  return { handle, panes };
}

describe('CompareSlider', () => {
  it('starts at the midpoint and exposes both photos', () => {
    const { handle } = setup();
    expect(handle).toHaveAttribute('aria-valuenow', '50');
    // The announced range is the range the control can actually reach.
    expect(handle).toHaveAttribute('aria-valuemin', '2');
    expect(handle).toHaveAttribute('aria-valuemax', '98');
    expect(screen.getByAltText('Original artwork')).toBeInTheDocument();
    expect(screen.getByAltText('Corrected artwork')).toBeInTheDocument();
  });

  it('moves with the arrow keys, clips both panes and reports the value', () => {
    const { handle, panes } = setup();
    fireEvent.keyDown(handle, { key: 'ArrowRight' });
    expect(handle).toHaveAttribute('aria-valuenow', '55');
    // panes[0] is the "after" pane, clipped from the split to the right edge.
    expect(panes[0].style.clipPath).toMatch(/^inset\(0 0 0 55(\.00)?%\)$/);
    expect(panes[1].style.clipPath).toMatch(/^inset\(0 45(\.00)?% 0 0\)$/);
    fireEvent.keyDown(handle, { key: 'ArrowLeft' });
    fireEvent.keyDown(handle, { key: 'ArrowLeft' });
    expect(handle).toHaveAttribute('aria-valuenow', '45');
  });

  it('jumps to either side with Home and End and never leaves 2-98%', () => {
    const { handle } = setup();
    fireEvent.keyDown(handle, { key: 'Home' });
    expect(handle).toHaveAttribute('aria-valuenow', '2');
    fireEvent.keyDown(handle, { key: 'ArrowLeft' });
    expect(handle).toHaveAttribute('aria-valuenow', '2');
    fireEvent.keyDown(handle, { key: 'End' });
    expect(handle).toHaveAttribute('aria-valuenow', '98');
    fireEvent.keyDown(handle, { key: 'ArrowRight' });
    expect(handle).toHaveAttribute('aria-valuenow', '98');
  });

  it('takes focus when a drag starts, so the keyboard controls follow the pointer', () => {
    const { handle } = setup();
    const other = document.createElement('button');
    document.body.appendChild(other);
    other.focus();
    expect(document.activeElement).toBe(other);
    fireEvent.pointerDown(handle, { clientX: 10, pointerId: 1 });
    expect(document.activeElement).toBe(handle);
    // Releasing leaves it there for the arrow keys.
    fireEvent.pointerUp(handle, { pointerId: 1 });
    fireEvent.keyDown(handle, { key: 'ArrowRight' });
    expect(handle).toHaveAttribute('aria-valuenow', '55');
    other.remove();
  });

  it('ignores unrelated keys', () => {
    const { handle } = setup();
    fireEvent.keyDown(handle, { key: 'a' });
    expect(handle).toHaveAttribute('aria-valuenow', '50');
  });
});
