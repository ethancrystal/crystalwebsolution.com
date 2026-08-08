import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';

// jsdom has no WebGL, so stub the R3F Canvas as a non-rendering placeholder.
// We do NOT render children (EmblemMesh) — that keeps the unit test focused on
// the tooltip toggle/state, which is pure DOM logic independent of WebGL.
vi.mock('@react-three/fiber', () => ({
  Canvas: () => null,
  useFrame: () => {},
}));

const ServiceEmblem3D = (await import('@/components/three/ServiceEmblem3D')).default;

describe('ServiceEmblem3D tooltip', () => {
  it('shows the tooltip on toggle click', () => {
    render(<ServiceEmblem3D signal="web" />);
    const toggle = screen.getByRole('button', { name: /show service summary/i });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    fireEvent.click(toggle);
    const tip = screen.getByRole('tooltip');
    expect(tip).toBeInTheDocument();
    expect(tip).toHaveTextContent(/looks like everyone else/i);
  });

  it('hides the tooltip on a second toggle click', () => {
    render(<ServiceEmblem3D signal="web" />);
    const toggle = screen.getByRole('button', { name: /show service summary/i });
    fireEvent.click(toggle);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /hide service summary/i }));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('does not render a toggle for an unknown signal', () => {
    render(<ServiceEmblem3D signal="does-not-exist" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
