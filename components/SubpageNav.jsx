'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Magnetic from './Magnetic';
import Menu from './Menu';
import { SITE } from '../lib/site';
import { CRM_ENABLED } from '../lib/crmFlag';

// The hybrid header for inner pages: same logo + glass-scroll behavior as
// the home Nav, plus an inline anchor row on desktop (the home nav omits
// this — it relies on the fullscreen Menu instead — but subpages benefit
// from a persistent way back to any home section without leaving the page).
export default function SubpageNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const closeMenu = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <header className={`nav subpage-nav ${scrolled && !open ? 'nav-glass' : ''}`}>
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
        <nav className="subpage-nav-links" aria-label="Section navigation">
          {SITE.nav.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={pathname === item.href ? 'is-active' : ''}
              data-cursor="Go"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="nav-right">
          {CRM_ENABLED && (
            <Link href="/login" className="nav-login-link" data-cursor="Log in">
              Log in
            </Link>
          )}
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
