'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { PendingAnnouncer, PendingLabel } from '../../components/auth/AuthPending';
import { SITE } from '../../lib/site';
import { useMarketingHomeHref } from '../../lib/useMarketingHomeHref';
import DarkPageBackground from '../../components/ui/dark-page-background';

const PORTALS = [
  { key: 'client', href: '/login/client', name: 'Client Portal' },
  { key: 'employee', href: '/login/employee', name: 'Employee Portal' },
  { key: 'admin', href: '/login/admin', name: 'Admin Portal' },
];

// If a navigation never lands (network drop, blocked request) the choice is
// released so the visitor can try again.
const NAVIGATION_TIMEOUT_MS = 15000;

function isPlainLeftClick(event) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

export default function LoginPage() {
  const homeHref = useMarketingHomeHref();
  // The portal being opened. Set on the first click; every other click is
  // ignored until the next page replaces this one, or the timeout above.
  const [opening, setOpening] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    // Coming back with the Back button can restore this page from the
    // bfcache with the pending state still set; release it.
    const release = (event) => { if (event.persisted) setOpening(null); };
    window.addEventListener('pageshow', release);
    return () => {
      window.removeEventListener('pageshow', release);
      clearTimeout(timerRef.current);
    };
  }, []);

  function choose(event, portal) {
    if (opening) {
      event.preventDefault();
      return;
    }
    // Opening in a new tab or window is not a navigation of this page.
    if (!isPlainLeftClick(event)) return;
    setOpening(portal);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setOpening(null), NAVIGATION_TIMEOUT_MS);
  }

  return (
    <div className="crm-auth-container">
      <DarkPageBackground interactive="faulty-terminal" />
      <div className="crm-auth-card" aria-busy={Boolean(opening)}>
        <Link href={homeHref} className="crm-auth-mark" aria-label={`${SITE.name} home`} inert={Boolean(opening)}>
          <img className="crm-auth-logo" src={SITE.logoPath} alt={SITE.name} width={SITE.logoWidth} height={SITE.logoHeight} />
        </Link>

        <h1>Choose your portal</h1>
        <p>Sign in through the portal assigned to your account.</p>

        <nav className="crm-portal-list" aria-label="Login portals">
          {PORTALS.map((portal) => {
            const isOpening = opening?.key === portal.key;
            const isLocked = Boolean(opening) && !isOpening;
            return (
              <Link
                key={portal.key}
                href={portal.href}
                className={`crm-portal-link${isOpening ? ' is-opening' : ''}${isLocked ? ' is-locked' : ''}`}
                onClick={(event) => choose(event, portal)}
                aria-current={isOpening ? 'true' : undefined}
                aria-disabled={opening ? 'true' : undefined}
                tabIndex={isLocked ? -1 : undefined}
              >
                <PendingLabel pending={isOpening} label={`Opening ${portal.name}…`}>{portal.name}</PendingLabel>
              </Link>
            );
          })}
        </nav>
        <PendingAnnouncer pending={Boolean(opening)} message={opening ? `Opening ${opening.name}. Please wait.` : ''} />

        <div inert={Boolean(opening)}>
          <p className="crm-auth-footer"><Link href="/forgot-password" className="link-underline">Forgot password?</Link></p>

          <p className="crm-auth-footer">
            Don't have an account?{' '}
            <Link href="/signup" className="link-underline">Create one</Link>
          </p>
        </div>
      </div>

      <style jsx>{`
        .crm-auth-container {
          position: relative;
          isolation: isolate;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 2rem 1.5rem;
        }

        .crm-auth-card {
          position: relative;
          z-index: 1;
          background: rgba(234, 242, 255, 0.03);
          border: 1px solid var(--line);
          border-radius: 20px;
          padding: 2.75rem 2.5rem 2.5rem;
          width: 100%;
          max-width: 420px;
          backdrop-filter: blur(16px);
          box-shadow: 0 30px 80px rgba(2, 4, 8, 0.55);
        }

        :global(.crm-auth-mark) {
          display: flex;
          align-items: center;
          justify-content: center;
          width: min(100%, 11rem);
          padding-inline: 0.5rem;
          margin: 0 auto 1.75rem;
        }

        .crm-auth-logo {
          display: block;
          width: 100%;
          max-width: 100%;
          height: auto;
          object-fit: contain;
          filter: drop-shadow(0 0 18px rgba(89, 243, 255, 0.35));
        }

        .crm-auth-card h1 {
          font-family: var(--font-display);
          font-size: 1.6rem;
          font-weight: 600;
          letter-spacing: -0.01em;
          margin-bottom: 0.5rem;
          color: var(--ink);
          text-align: center;
        }

        .crm-auth-card > p {
          color: var(--muted);
          margin-bottom: 0.5rem;
          font-size: 0.95rem;
          text-align: center;
        }

        .crm-portal-list { display: grid; gap: 0.75rem; margin: 2rem 0 0.5rem; }
        :global(.crm-portal-link) {
          border: 1px solid var(--line);
          border-radius: 12px;
          color: var(--ink);
          padding: 1rem 1.1rem;
          text-align: center;
          font-family: var(--font-display);
          font-weight: 600;
          letter-spacing: 0.01em;
          transition: border-color 0.25s ease, background 0.25s ease, color 0.25s ease;
        }
        :global(.crm-portal-link:hover),
        :global(.crm-portal-link:focus-visible) {
          background: rgba(89, 243, 255, 0.08);
          border-color: var(--cyan);
          color: var(--cyan);
        }

        :global(.crm-portal-link.is-opening) {
          background: rgba(89, 243, 255, 0.12);
          border-color: var(--cyan);
          color: var(--cyan);
          cursor: progress;
        }
        :global(.crm-portal-link.is-locked) {
          opacity: 0.45;
          pointer-events: none;
        }

        :global(.crm-auth-mark:focus-visible),
        :global(.crm-portal-link:focus-visible) {
          outline: 2px solid var(--cyan);
          outline-offset: 4px;
        }

        .crm-auth-footer {
          text-align: center;
          color: var(--muted);
          font-size: 0.9rem;
          margin-top: 1rem;
        }
      `}</style>
    </div>
  );
}
