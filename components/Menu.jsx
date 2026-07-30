'use client';

import { useRef, useEffect } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { SITE } from '../lib/site';

// Fullscreen overlay menu: big staggered links + contact block.
export default function Menu({ open, onClose }) {
  const root = useRef(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const links = el.querySelectorAll('.menu-link');
    const meta = el.querySelectorAll('.menu-meta > *');
    let tl;
    if (open) {
      el.style.pointerEvents = 'auto';
      tl = gsap.timeline();
      tl.to(el, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.7, ease: 'power4.inOut' })
        .fromTo(links, { yPercent: 120 }, { yPercent: 0, duration: 0.6, stagger: 0.07, ease: 'power3.out' }, '-=0.25')
        .fromTo(meta, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.05 }, '-=0.3');
    } else {
      el.style.pointerEvents = 'none';
      tl = gsap.timeline();
      tl.to(el, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.55, ease: 'power4.inOut' });
    }
    return () => tl && tl.kill();
  }, [open]);

  return (
    <nav ref={root} className="menu" style={{ clipPath: 'inset(0% 0% 100% 0%)', pointerEvents: 'none' }}>
      <div className="menu-links">
        {SITE.nav.map((item, i) => (
          <div className="menu-link-mask" key={item.label}>
            <Link href={item.href} className="menu-link" onClick={onClose} data-cursor="Go">
              <span className="menu-link-index">0{i + 1}</span>
              {item.label}
            </Link>
          </div>
        ))}
      </div>
      <div className="menu-meta">
        <div>
          <p className="menu-meta-label">Business enquiry</p>
          <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
          <a href={`tel:${SITE.phone.replace(/[^+\d]/g, '')}`}>{SITE.phone}</a>
        </div>
        <div>
          <p className="menu-meta-label">Social</p>
          {SITE.socials.map((s) => (
            <a key={s.label} href={s.href} target="_blank" rel="noreferrer">{s.label}</a>
          ))}
        </div>
        <div>
          <p className="menu-meta-label">Est. {SITE.est}</p>
          <p className="menu-meta-note">{SITE.years} years shaping<br />digital direction.</p>
        </div>
      </div>
    </nav>
  );
}
