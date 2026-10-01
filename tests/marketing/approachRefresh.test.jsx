import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import Approach, { APPROACH_SETTLE_MS } from '@/components/sections/Approach';

let refresh;

beforeEach(() => {
  vi.useFakeTimers();
  // jsdom does not implement scrollTo, which ScrollTrigger calls while
  // restoring position as the section's reveals register their triggers.
  window.scrollTo = vi.fn();
  refresh = vi.spyOn(ScrollTrigger, 'refresh').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const step = (n) => screen.getByRole('button', { name: new RegExp(n) });

describe('Approach accordion ScrollTrigger refresh (R9)', () => {
  it('does not refresh just because it mounted', () => {
    render(<Approach />);
    act(() => vi.advanceTimersByTime(APPROACH_SETTLE_MS * 3));
    expect(refresh).not.toHaveBeenCalled();
  });

  it('refreshes once, after the panel transition has settled', () => {
    render(<Approach />);
    fireEvent.click(step('Design'));
    expect(step('Design')).toHaveAttribute('aria-expanded', 'true');

    act(() => vi.advanceTimersByTime(APPROACH_SETTLE_MS - 1));
    expect(refresh).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('refreshes after closing a step as well', () => {
    render(<Approach />);
    fireEvent.click(step('Design'));
    act(() => vi.advanceTimersByTime(APPROACH_SETTLE_MS));
    fireEvent.click(step('Design'));
    expect(step('Design')).toHaveAttribute('aria-expanded', 'false');
    act(() => vi.advanceTimersByTime(APPROACH_SETTLE_MS));
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('debounces a burst of toggles into a single refresh', () => {
    render(<Approach />);
    fireEvent.click(step('Brief'));
    act(() => vi.advanceTimersByTime(200));
    fireEvent.click(step('Design'));
    act(() => vi.advanceTimersByTime(200));
    fireEvent.click(step('Development'));
    expect(refresh).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(APPROACH_SETTLE_MS * 2));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('cancels a pending refresh when the section unmounts', () => {
    const { unmount } = render(<Approach />);
    fireEvent.click(step('Design'));
    unmount();
    act(() => vi.advanceTimersByTime(APPROACH_SETTLE_MS * 2));
    expect(refresh).not.toHaveBeenCalled();
  });
});
