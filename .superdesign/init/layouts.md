# Layouts

## SubpageExperience
Client shell for marketing inner pages: IdleScene + FocusVeil + SubpageNav + main + footer.

### `components/marketing/SubpageExperience.jsx`

```jsx
'use client';

import dynamic from 'next/dynamic';
import SmoothScroll from '../SmoothScroll';
import FocusVeil from '../FocusVeil';
import ScrollProgress from '../ScrollProgress';
import SubpageNav from './SubpageNav';
import MarketingFooter from './MarketingFooter';

const IdleScene = dynamic(() => import('./IdleScene'), { ssr: false });

export default function SubpageExperience({ children, sceneVariant }) {
  return (
    <SmoothScroll>
      <div className="mkt-shell subpage-shell">
        <IdleScene variant={sceneVariant} />
        <FocusVeil />
        <SubpageNav />
        <ScrollProgress />
        <main className="mkt-main page subpage subpage-page">
          {children}
        </main>
        <MarketingFooter />
      </div>
    </SmoothScroll>
  );
}
```


## MarketingShell
Server wrapper around SubpageExperience.

### `components/marketing/MarketingShell.jsx`

```jsx
import SubpageExperience from './SubpageExperience';

// Keep the route-facing shell as a server component. The client runtime is
// isolated in SubpageExperience, so metadata/data-heavy pages remain server
// rendered while sharing the homepage scroll, focus, nav and brand-space feel.
export default function MarketingShell({ children, sceneVariant }) {
  return <SubpageExperience sceneVariant={sceneVariant}>{children}</SubpageExperience>;
}
```


## SubpageNav
Homepage-family nav used on inner pages.

### `components/marketing/SubpageNav.jsx`

```jsx
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
          aria-label={`${SITE.name} home`}
        >
          <BrandLogo />
        </Link>

        <nav className="subpage-nav-links" aria-label="Marketing">
          {SITE.nav.map((item) => (
            <Link key={item.label} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="nav-right">
          {CRM_ENABLED && (
            <Link href="/login" className="nav-login-link">
              Log in
            </Link>
          )}
          <Magnetic>
            <Link href="/contact" className="btn btn-ghost">
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
```


## MarketingFooter

### `components/marketing/MarketingFooter.jsx`

```jsx
import Link from 'next/link';
import { SITE } from '../../lib/site';
import BrandLogo from '../BrandLogo';

// Marketing footer. Reuses brand identity, contact, and city from lib/site.js.
export default function MarketingFooter() {
  return (
    <footer className="mkt-footer">
      <div className="mkt-footer-top">
        <div className="mkt-footer-brand">
          <Link href="/" className="mkt-footer-logo" aria-label={`${SITE.name} home`}>
            <BrandLogo />
          </Link>
          <p className="mkt-footer-tagline">{SITE.tagline}</p>
          <p className="mkt-footer-statement">{SITE.statement}</p>
        </div>
        <nav className="mkt-footer-nav" aria-label="Footer">
          <p className="mkt-footer-label">Explore</p>
          <Link href="/work">Work</Link>
          <Link href="/services">Services</Link>
          <Link href="/process">Process</Link>
          <Link href="/reviews">Reviews</Link>
          <Link href="/about">About</Link>
          <Link href="/contact">Contact</Link>
        </nav>
        <div className="mkt-footer-contact">
          <p className="mkt-footer-label">Enquiry</p>
          <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
          {SITE.phone && <a href={`tel:${SITE.phone.replace(/[^\d+]/g, '')}`}>{SITE.phone}</a>}
          <p className="mkt-footer-city">Location in {SITE.city}</p>
          <p className="mkt-footer-city">Also Located in {SITE.citySecondary}</p>
        </div>
      </div>
      <div className="mkt-footer-bottom">
        <p>© {new Date().getFullYear()} {SITE.name}. {SITE.tagline}</p>
        <div className="mkt-footer-legal">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </div>
      </div>
    </footer>
  );
}
```

