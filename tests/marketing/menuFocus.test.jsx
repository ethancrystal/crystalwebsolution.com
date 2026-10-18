import { useCallback, useState } from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';

// next/link needs a router; a plain anchor is enough for focus behaviour.
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }) => <a href={href} {...rest}>{children}</a>,
}));

import Menu from '@/components/Menu';

afterEach(cleanup);

function Harness() {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <button type="button" data-testid="burger" onClick={() => setOpen(true)}>Open menu</button>
      <section id="make" tabIndex={-1} data-testid="make" />
      <Menu
        open={open}
        onClose={close}
        links={[
          { label: 'What We Make', href: '/#make' },
          { label: 'Blog', href: '/blog' },
        ]}
      />
    </>
  );
}

// Stands in for SmoothScroll's document click handler: it takes over in-page
// hash links and moves focus to the destination section itself.
function installSmoothScrollStandIn() {
  const handler = (event) => {
    const anchor = event.target.closest('a');
    if (!anchor) return;
    event.preventDefault();
    if (anchor.getAttribute('href').startsWith('/#')) {
      document.querySelector(anchor.getAttribute('href').replace('/', '')).focus();
    }
  };
  document.addEventListener('click', handler);
  return () => document.removeEventListener('click', handler);
}

function openMenu() {
  render(<Harness />);
  const burger = screen.getByTestId('burger');
  burger.focus();
  fireEvent.click(burger);
  return burger;
}

describe('Menu focus on close', () => {
  it('leaves focus on the destination after an in-page hash link', () => {
    const uninstall = installSmoothScrollStandIn();
    try {
      openMenu();
      // getByText, not getByRole: role queries walk the accessibility tree and
      // are slow in jsdom.
      fireEvent.click(screen.getByText('What We Make'));
      // SmoothScroll focused #make; closing the menu must not hand focus back
      // to the burger and strand the Tab position in the header.
      expect(document.activeElement).toBe(screen.getByTestId('make'));
    } finally {
      uninstall();
    }
  });

  it('still returns focus to the burger after a link that leaves the page', () => {
    const uninstall = installSmoothScrollStandIn();
    try {
      const burger = openMenu();
      fireEvent.click(screen.getByText('Blog'));
      expect(document.activeElement).toBe(burger);
    } finally {
      uninstall();
    }
  });

  it('still returns focus to the burger when the menu is dismissed with Escape', () => {
    const burger = openMenu();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(document.activeElement).toBe(burger);
  });
});
