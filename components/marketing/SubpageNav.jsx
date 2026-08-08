'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import BrandLogo from '../BrandLogo';
import Magnetic from '../Magnetic';
import Menu from '../Menu';
import { SITE } from '../../lib/site';
import { CRM_ENABLED } from '../../lib/crmFlag';

export default function SubpageNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [onLightSurface, setOnLightSurface] = useState(false);
  const closeMenu = useCallback(() => setOpen(false), []);

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
      <header
        className={`nav subpage-nav ${scrolled && !open ? 'nav-glass' : ''} ${onLightSurface && !open ? 'nav-on-light' : ''}`}
      >
        <Link
          href="/"
          className="nav-logo"
          data-cursor="Home"
          aria-label={`${SITE.name} home`}
        >
          <BrandLogo />
        </Link>

        <nav className="subpage-nav-links" aria-label="Marketing">
          {SITE.nav.map((item) => (
            <Link key={item.label} href={item.href} data-cursor={item.label}>
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
            <Link href="/contact" className="btn btn-ghost" data-cursor="Say hi">
              Start a project
            </Link>
          </Magnetic>
          <Magnetic>
            <button
              type="button"
              className={`nav-burger subpage-nav-burger ${open ? 'is-open' : ''}`}
              onClick={() => setOpen((value) => !value)}
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
