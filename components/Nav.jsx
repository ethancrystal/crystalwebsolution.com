'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Magnetic from './Magnetic';
import Menu from './Menu';

export default function Nav() {
  const [open, setOpen] = useState(false);
  const [onLightSurface, setOnLightSurface] = useState(false);
  const closeMenu = useCallback(() => setOpen(false), []);

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
      <header className={`nav ${onLightSurface && !open ? 'nav-on-light' : ''}`}>
        <Link href="/" className="nav-logo" data-cursor="Home">
          <span className="nav-logo-monogram" aria-hidden="true">CWS</span>
          <span className="nav-logo-name">Crystal Web Solution</span>
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
