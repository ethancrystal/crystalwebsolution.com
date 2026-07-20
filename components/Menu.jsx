'use client';

import { useRef, useEffect } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { SITE } from '../lib/site';

// Fullscreen overlay menu: big staggered links + contact block.
export default function Menu({ open, onClose }) {
  const root = useRef(null);
  const lastFocused = useRef(null);

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
          .fromTo(links, { yPercent: 120 }, { yPercent: 0, duration: 0.6, stagger: 0.07, ease: 'power3.out' }, '-=0.25')
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
      if (open && lastFocused.current instanceof HTMLElement) lastFocused.current.focus();
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
        {SITE.nav.map((item, i) => (
          <div className="menu-link-mask" key={item.label}>
            <Link href={item.href} className="menu-link" onClick={onClose} data-cursor="Go" tabIndex={open ? 0 : -1}>
              <span className="menu-link-index">0{i + 1}</span>
              {item.label}
            </Link>
          </div>
        ))}
      </div>
      <div className="menu-meta">
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
          <p className="menu-meta-label">Est. {SITE.est}</p>
          <p className="menu-meta-note">{SITE.years} years shaping<br />digital direction.</p>
        </div>
      </div>
    </nav>
  );
}
