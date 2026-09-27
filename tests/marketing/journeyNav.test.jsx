import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import gsap from 'gsap';
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import JourneyNav from '@/components/JourneyNav';
import { BEAT_IDS } from '@/lib/beatProgress';
import { scrollState } from '@/lib/scrollState';
import { JOURNEY_NAV } from '@/lib/journeyNav.mjs';

beforeEach(() => {
  scrollState.progress = 0;
});

afterEach(() => {
  cleanup();
  scrollState.progress = 0;
});

describe('JourneyNav', () => {
  it('links every section by its plain-language label', () => {
    render(<JourneyNav />);
    const nav = screen.getByRole('navigation', { name: 'Page sections' });
    const links = nav.querySelectorAll('a');
    expect(links).toHaveLength(BEAT_IDS.length);
    JOURNEY_NAV.forEach((item, index) => {
      expect(links[index]).toHaveAttribute('href', `#${item.id}`);
      expect(links[index]).toHaveTextContent(item.label);
    });
  });

  it('marks the first section as the current location on mount', () => {
    render(<JourneyNav />);
    const intro = screen.getByRole('link', { name: /Intro/ });
    expect(intro).toHaveAttribute('aria-current', 'location');
    expect(screen.getAllByRole('link').filter((link) => link.hasAttribute('aria-current'))).toHaveLength(1);
  });

  it('moves the location marker and the toggle readout as the page scrolls', () => {
    render(<JourneyNav />);
    act(() => {
      scrollState.progress = 1;
      gsap.ticker.tick();
    });
    const contact = screen.getByRole('link', { name: /Contact/ });
    expect(contact).toHaveAttribute('aria-current', 'location');
    expect(screen.getByRole('link', { name: /Intro/ })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('button', { name: /Sections, now at/ })).toHaveTextContent(/09.*Contact/);
  });

  it('opens and closes the phone list with the toggle and Escape', () => {
    render(<JourneyNav />);
    const toggle = screen.getByRole('button', { name: /Sections, now at/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    const list = document.getElementById(toggle.getAttribute('aria-controls'));
    expect(list?.tagName).toBe('OL');

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('navigation')).toHaveAttribute('data-open', 'true');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(document.activeElement).toBe(toggle);
  });

  it('closes the list when a section is chosen or the user taps outside', () => {
    render(<JourneyNav />);
    const toggle = screen.getByRole('button', { name: /Sections, now at/ });

    fireEvent.click(toggle);
    fireEvent.click(screen.getByRole('link', { name: /Services/ }));
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggle);
    fireEvent.pointerDown(document.body);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });
});
