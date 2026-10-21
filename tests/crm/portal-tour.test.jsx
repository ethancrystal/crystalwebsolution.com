// Behaviour of components/crm/PortalTour.jsx (portal plan phase C1, decision
// D2): four steps in order, Skip and finishing both write the per-browser
// localStorage seen key, the key suppresses the auto-open, and the dashboard's
// Replay affordance clears the key and reopens the tour.

import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import PortalTour, { TOUR_SEEN_KEY } from '@/components/crm/PortalTour';

const STEP_TITLES = ['Start a project', 'Fill in the brief', 'Message the team', 'Upload files'];

function openTour() {
  render(<PortalTour />);
  return screen.getByRole('dialog', { name: /Start a project/ });
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe('PortalTour', () => {
  it('auto-opens on the first step when the seen key is absent', () => {
    const dialog = openTour();
    expect(dialog).toHaveTextContent('Step 1 of 4');
    expect(screen.getByRole('heading', { name: 'Start a project' })).toBeInTheDocument();
    expect(window.localStorage.getItem(TOUR_SEEN_KEY)).toBeNull();
  });

  it('walks through all four step titles with Next and finishes on the last', () => {
    openTour();
    for (let i = 0; i < STEP_TITLES.length; i += 1) {
      expect(screen.getByRole('heading', { name: STEP_TITLES[i] })).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toHaveTextContent(`Step ${i + 1} of 4`);
      if (i < STEP_TITLES.length - 1) {
        fireEvent.click(screen.getByRole('button', { name: 'Next' }));
      }
    }
    // The last step's primary control closes the tour and records the key.
    fireEvent.click(screen.getByRole('button', { name: 'Finish' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(window.localStorage.getItem(TOUR_SEEN_KEY)).toBeTruthy();
  });

  it('Back returns to the previous step without writing the seen key', () => {
    openTour();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('heading', { name: 'Fill in the brief' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('heading', { name: 'Start a project' })).toBeInTheDocument();
    expect(window.localStorage.getItem(TOUR_SEEN_KEY)).toBeNull();
    // Back is disabled on the first step.
    expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled();
  });

  it('Skip writes the seen key and closes the tour', () => {
    openTour();
    fireEvent.click(screen.getByRole('button', { name: 'Skip tour' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(window.localStorage.getItem(TOUR_SEEN_KEY)).toBeTruthy();
  });

  it('Escape skips the tour and writes the seen key', () => {
    openTour();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(window.localStorage.getItem(TOUR_SEEN_KEY)).toBeTruthy();
  });

  it('does not auto-open when the seen key is present', () => {
    window.localStorage.setItem(TOUR_SEEN_KEY, '2026-09-30T00:00:00.000Z');
    render(<PortalTour />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('the Replay token clears the seen key and reopens the tour', () => {
    window.localStorage.setItem(TOUR_SEEN_KEY, '2026-09-30T00:00:00.000Z');
    const { rerender } = render(<PortalTour />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // The dashboard header bumps replayToken on its "Replay tour" button.
    rerender(<PortalTour replayToken={1} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(window.localStorage.getItem(TOUR_SEEN_KEY)).toBeNull();
    expect(screen.getByRole('heading', { name: 'Start a project' })).toBeInTheDocument();

    // The replayed tour records the key again when skipped.
    fireEvent.click(screen.getByRole('button', { name: 'Skip tour' }));
    expect(window.localStorage.getItem(TOUR_SEEN_KEY)).toBeTruthy();
  });
});
