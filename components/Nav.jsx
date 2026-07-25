'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Magnetic from './Magnetic';
import Menu from './Menu';

export default function Nav() {
  const [open, setOpen] = useState(false);
  const [onLightSurface, setOnLightSurface] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const closeMenu = useCallback(() => setOpen(false), []);

  // Once page content scrolls under the fixed header, the bar becomes its
  // own glass pane (see .nav::before) so it stays readable over any surface.
  // Boolean state flips rarely; React bails out on same-value sets.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const lightSections = Array.from(document.querySelectorAll('[data-nav-tone="light"]'));
    if (!lightSections.length) return undefined;

    const activeSections = new Set();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) activeSections.add(entry.target);
        else activeSections.delete(entry.target);
      });
      setOnLightSurface(activeSections.size > 0);
    }, { rootMargin: '-16px 0px -88% 0px', threshold: 0 });

    lightSections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <header className={`nav ${scrolled && !open ? 'nav-glass' : ''} ${onLightSurface && !open ? 'nav-on-light' : ''}`}>
        <Link href="/" className="nav-logo" data-cursor="Home" aria-label="Crystal Web Solution home">
          <span className="nav-logo-art" aria-hidden="true">
            <img
              className="nav-logo-art-full"
              src="/crystal-web-solution-logo.svg"
              alt=""
              width="1616"
              height="243"
            />
          </span>
        </Link>
        <div className="nav-right">
          <Magnetic>
            <a href="/#contact" className="btn btn-ghost" data-cursor="Say hi">
              Start a project
            </a>
          </Magnetic>
          <Magnetic>
            <button
              type="button"
              className={`nav-burger ${open ? 'is-open' : ''}`}
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              aria-controls="site-menu"
              data-cursor={open ? 'Close' : 'Menu'}
            >
              <span />
              <span />
            </button>
          </Magnetic>
        </div>
      </header>
      <Menu open={open} onClose={closeMenu} />
    </>
  );
}
