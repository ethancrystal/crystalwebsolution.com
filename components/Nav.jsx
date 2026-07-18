'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SITE } from '../lib/site';
import Magnetic from './Magnetic';
import Menu from './Menu';

export default function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="nav">
        <Link href="/" className="nav-logo" data-cursor="Home">
          <img className="nav-logo-img" src="/logo-main.png" alt={SITE.name} />
        </Link>
        <div className="nav-right">
          <Magnetic>
            <a href="/#contact" className="btn btn-ghost" data-cursor="Say hi">
              Start a project
            </a>
          </Magnetic>
          <Magnetic>
            <button
              className={`nav-burger ${open ? 'is-open' : ''}`}
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? 'Close menu' : 'Open menu'}
              data-cursor={open ? 'Close' : 'Menu'}
            >
              <span />
              <span />
            </button>
          </Magnetic>
        </div>
      </header>
      <Menu open={open} onClose={() => setOpen(false)} />
    </>
  );
}
