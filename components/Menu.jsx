'use client';

import { useRef, useEffect } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { SITE } from '../lib/site';
import { CRM_ENABLED } from '../lib/crmFlag';
import { EASE_SETTLE } from '../lib/easing';

// Fullscreen overlay menu: big staggered links + contact block. `links`
// defaults to the site-wide nav; the homepage passes its own production-first
// list (lib/heritage.mjs HERITAGE_NAV). An item with `external` opens in a new
// tab as a plain anchor. `pageLinks` adds a "Site pages" column to the meta
// block: the homepage passes SITE.nav there, so its production-first list does
// not cost the page its links to /blog, /process, /about and /contact.
export default function Menu({ open, onClose, links = SITE.nav, pageLinks = null }) {
  const root = useRef(null);
  const lastFocused = useRef(null);
  // Set when the menu is closed by an in-page hash link. SmoothScroll then moves
  // focus to the destination section; handing focus back to the burger on close
  // would drag a keyboard user's Tab position away from where they just landed.
  const skipFocusRestore = useRef(false);

  const closeFromLink = (event) => {
    const href = event.currentTarget.getAttribute('href') || '';
    if (href.startsWith('#') || href.startsWith('/#')) skipFocusRestore.current = true;
    onClose();
  };

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const links = el.querySelectorAll('.menu-link');
    const meta = el.querySelectorAll('.menu-meta > *');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.inert = !open;
    let tl;
    let focusFrame;
    let previousOverflow;
    let onKeyDown;
    if (open) {
      lastFocused.current = document.activeElement;
      skipFocusRestore.current = false;
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      el.style.pointerEvents = 'auto';
      if (reduced) {
        gsap.set(el, { clipPath: 'inset(0% 0% 0% 0%)' });
        gsap.set(links, { yPercent: 0 });
        gsap.set(meta, { opacity: 1, y: 0 });
      } else {
        tl = gsap.timeline();
        tl.to(el, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.7, ease: 'power4.inOut' })
          .fromTo(links, { yPercent: 120 }, { yPercent: 0, duration: 0.6, stagger: 0.07, ease: EASE_SETTLE }, '-=0.25')
          .fromTo(meta, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.05 }, '-=0.3');
      }

      focusFrame = requestAnimationFrame(() => links[0]?.focus());
      onKeyDown = (event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          onClose();
          return;
        }
        if (event.key !== 'Tab') return;
        const focusable = [...el.querySelectorAll('a[href], button:not([disabled])')]
          .filter((item) => item.tabIndex !== -1);
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      };
      document.addEventListener('keydown', onKeyDown);
    } else {
      el.style.pointerEvents = 'none';
      if (reduced) gsap.set(el, { clipPath: 'inset(0% 0% 100% 0%)' });
      else {
        tl = gsap.timeline();
        tl.to(el, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.55, ease: 'power4.inOut' });
      }
    }
    return () => {
      tl?.kill();
      if (focusFrame) cancelAnimationFrame(focusFrame);
      if (onKeyDown) document.removeEventListener('keydown', onKeyDown);
      if (previousOverflow !== undefined) document.body.style.overflow = previousOverflow;
      if (open && !skipFocusRestore.current && lastFocused.current instanceof HTMLElement) {
        lastFocused.current.focus();
      }
    };
  }, [open, onClose]);

  return (
    <nav
      ref={root}
      id="site-menu"
      className="menu"
      aria-label="Site navigation"
      aria-hidden={!open}
      style={{ clipPath: 'inset(0% 0% 100% 0%)', pointerEvents: 'none' }}
    >
      <div className="menu-links">
        {links.map((item, i) => {
          const content = (
            <>
              <span className="menu-link-index">0{i + 1}</span>
              {item.label}
            </>
          );
          return (
            <div className="menu-link-mask" key={item.label}>
              {item.external ? (
                <a
                  href={item.href}
                  className="menu-link"
                  target="_blank"
                  rel="noopener"
                  onClick={closeFromLink}
                  tabIndex={open ? 0 : -1}
                >
                  {content}
                </a>
              ) : (
                <Link href={item.href} className="menu-link" onClick={closeFromLink} tabIndex={open ? 0 : -1}>
                  {content}
                </Link>
              )}
            </div>
          );
        })}
      </div>
      <div className="menu-meta">
        {pageLinks && (
          <div>
            <p className="menu-meta-label">Site pages</p>
            {pageLinks.map((item) => (
              <Link key={item.href} href={item.href} onClick={onClose} tabIndex={open ? 0 : -1}>
                {item.label}
              </Link>
            ))}
          </div>
        )}
        <div>
          <p className="menu-meta-label">Business enquiry</p>
          <a href={`mailto:${SITE.email}`} tabIndex={open ? 0 : -1}>{SITE.email}</a>
          {SITE.phone && (
            <a href={`tel:${SITE.phone.replace(/[^+\d]/g, '')}`} tabIndex={open ? 0 : -1}>{SITE.phone}</a>
          )}
        </div>
        {SITE.socials.length > 0 && (
          <div>
            <p className="menu-meta-label">Social</p>
            {SITE.socials.map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noreferrer" tabIndex={open ? 0 : -1}>{s.label}</a>
            ))}
          </div>
        )}
        <div>
          <p className="menu-meta-label">{SITE.name}</p>
          <p className="menu-meta-note">Web, brand, motion<br />and automation.</p>
        </div>
        {CRM_ENABLED && (
          <div>
            <p className="menu-meta-label">Client access</p>
            {SITE.authNav.map((item) => (
              <Link key={item.label} href={item.href} onClick={onClose} tabIndex={open ? 0 : -1}>
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
