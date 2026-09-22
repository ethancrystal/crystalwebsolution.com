import { render, act } from '@testing-library/react';
import { vi } from 'vitest';

// Stub every module so the test measures mounting, not WebGL.
vi.mock('@/components/ui/acid-squares-background', () => ({ default: () => <div data-testid="stage-module" /> }));
vi.mock('@/components/ui/dot-field-background', () => ({ default: () => <div data-testid="stage-module" /> }));
vi.mock('@/components/ui/faulty-terminal-background', () => ({ default: () => <div data-testid="stage-module" /> }));
vi.mock('@/components/ui/letter-glitch-background', () => ({ default: () => <div data-testid="stage-module" /> }));
vi.mock('@/components/ui/prism-background', () => ({ default: () => <div data-testid="stage-module" /> }));
vi.mock('@/components/ui/ripple-grid-background', () => ({ default: () => <div data-testid="stage-module" /> }));
vi.mock('@/components/ui/liquid-ether-background', () => ({ default: () => <div data-testid="stage-module" /> }));

const DarkPageBackground = (await import('@/components/ui/dark-page-background')).default;

function mockMedia(matches) {
  const listeners = new Set();
  const mql = {
    matches,
    media: '',
    addEventListener: (_e, fn) => listeners.add(fn),
    removeEventListener: (_e, fn) => listeners.delete(fn),
  };
  window.matchMedia = () => mql;
  return {
    set(next) {
      mql.matches = next;
      listeners.forEach((fn) => fn({ matches: next }));
    },
  };
}

describe('DarkPageBackground stage gate', () => {
  const original = window.matchMedia;
  afterEach(() => { window.matchMedia = original; });

  it('mounts the animated module when motion is allowed on a wide screen', () => {
    mockMedia(false);
    const { queryAllByTestId, container } = render(<DarkPageBackground interactive="prism" />);
    expect(queryAllByTestId('stage-module')).toHaveLength(1);
    expect(container.querySelector('.alive-overlay')).not.toBeNull();
  });

  it('does not mount the module (so its RAF/WebGL loop never starts) under reduced motion or a small screen', () => {
    mockMedia(true);
    const { queryAllByTestId, container } = render(<DarkPageBackground interactive="prism" />);
    expect(queryAllByTestId('stage-module')).toHaveLength(0);
    // The static wash still renders.
    expect(container.querySelector('.alive-overlay')).not.toBeNull();
  });

  it('unmounts the module when the preference flips to reduced mid-session', () => {
    const media = mockMedia(false);
    const { queryAllByTestId } = render(<DarkPageBackground interactive="prism" />);
    expect(queryAllByTestId('stage-module')).toHaveLength(1);
    act(() => media.set(true));
    expect(queryAllByTestId('stage-module')).toHaveLength(0);
  });
});
