'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { signIn } from '@/app/auth/actions';
import { safeNextForPortal } from '@/lib/auth/roles.mjs';
import { SITE } from '@/lib/site';
import { useMarketingHomeHref } from '@/lib/useMarketingHomeHref';
import DarkPageBackground from '@/components/ui/dark-page-background';
import { PendingAnnouncer, PendingLabel } from '@/components/auth/AuthPending';

const PORTAL_ERROR = 'This account cannot sign in to this portal.';
const CONFIGURATION_ERROR = 'Sign-in is temporarily unavailable because authentication is not configured. Please contact support.';

export default function PortalLoginForm({ portal }) {
  // Pending from submit until navigation away. It is cleared only when sign-in
  // comes back with an error: a successful sign-in ends in a redirect, and the
  // pending UI stays up until the next page replaces this one.
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState(null);
  // Controlled so a failed sign-in keeps what was typed: React 19 resets
  // uncontrolled fields when a form action finishes.
  const [email, setEmail] = useState('');
  const errorRef = useRef(null);
  const focusErrorRef = useRef(false);
  const [next, setNext] = useState(null);
  const homeHref = useMarketingHomeHref();

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const errorCode = searchParams.get('error');
    const portalName = portal.login.split('/').pop();
    setNext(safeNextForPortal(portalName, searchParams.get('next')));
    setError(errorCode === 'configuration' ? CONFIGURATION_ERROR : errorCode ? PORTAL_ERROR : null);
  }, [portal]);

  // Recovery: after a failed sign-in, focus the error so it is read out; the
  // typed email stays in place and the form is usable again.
  useEffect(() => {
    if (error && !isPending && focusErrorRef.current) {
      focusErrorRef.current = false;
      errorRef.current?.focus();
    }
  }, [error, isPending]);

  // The pending state is set here, in the submit event, not inside the
  // action: React 19 runs form actions as transitions, so state set inside one
  // would only show once sign-in had already finished. This also blocks a
  // second submit while the first is in flight. React reads the form data
  // after this handler, before the re-render that disables the fields.
  function handleSubmitEvent(event) {
    if (isPending) {
      event.preventDefault();
      return;
    }
    setIsPending(true);
    setError(null);
  }

  async function handleSubmit(formData) {

    try {
      const result = await signIn(formData);
      if (result?.error) {
        focusErrorRef.current = true;
        setError(result.error === 'configuration' ? CONFIGURATION_ERROR : result.error);
        setIsPending(false);
      }
    } catch (err) {
      // The redirect is the success path: keep the pending UI until the next
      // page arrives instead of flashing the idle form first.
      if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err;
      focusErrorRef.current = true;
      setError(PORTAL_ERROR);
      setIsPending(false);
    }
  }

  return (
    <div className="crm-login-container">
      <DarkPageBackground interactive="faulty-terminal" />
      <div className="crm-login-card" aria-busy={isPending}>
        <Link href={homeHref} className="crm-login-mark" aria-label={`${SITE.name} home`} inert={isPending}>
          <img className="crm-login-logo" src={SITE.logoPath} alt={SITE.name} width={SITE.logoWidth} height={SITE.logoHeight} />
        </Link>
        <h1>{portal.label} Portal</h1>
        <p>Sign in to your account</p>

        <form action={handleSubmit} onSubmit={handleSubmitEvent} className="crm-form" aria-busy={isPending}>
          <input type="hidden" name="portal" value={portal.login.split('/').pop()} />
          {next && <input type="hidden" name="next" value={next} />}
          {error && (
            <div className="crm-error" role="alert" tabIndex={-1} ref={errorRef}>
              {error}
            </div>
          )}

          <div className="crm-form-group">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required placeholder="you@example.com" disabled={isPending} value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
          </div>

          <div className="crm-form-group">
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" required placeholder="••••••••" disabled={isPending} />
          </div>

          <button type="submit" disabled={isPending} aria-busy={isPending} className="crm-button">
            <PendingLabel pending={isPending} label="Signing in…">Sign In</PendingLabel>
          </button>
          <PendingAnnouncer pending={isPending} message="Signing in. Please wait." />
        </form>

        <div className="crm-login-secondary" inert={isPending}>
        {portal.role === 'client' && (
          <p className="crm-signup-link">
            New customer? <Link href="/signup">Sign up to start a project</Link>
          </p>
        )}
        <p className="crm-signup-link"><Link href="/forgot-password">Forgot password?</Link></p>
        <p className="crm-signup-link"><Link href="/login">Choose another portal</Link></p>
        </div>
      </div>

      <style jsx>{`
        .crm-login-container { display: flex; align-items: center; justify-content: center; min-height: 100vh; position: relative; z-index: 1; font-family: inherit; padding: 2rem 1.25rem; }
        .crm-login-card { background: rgba(234, 242, 255, 0.03); border: 1px solid var(--line); border-radius: 20px; padding: 2.5rem; width: 100%; max-width: 400px; backdrop-filter: blur(16px); box-shadow: 0 30px 80px rgba(2, 4, 8, 0.55); }
        /* next/link renders its own <a>, which styled-jsx's babel transform never
           scopes (it only scopes literal host elements it sees in this file's
           JSX) -- so any selector targeting that <a>, directly or as an
           ancestor, must opt out via :global() or it silently never matches.
           app/login/page.jsx's :global(.crm-auth-mark) is the same fix for the
           same reason. */
        :global(.crm-login-mark) { display: flex; align-items: center; justify-content: center; width: min(100%, 11rem); margin: 0 auto 1.5rem; }
        .crm-login-logo { display: block; width: 100%; height: auto; object-fit: contain; }
        :global(.crm-login-mark:focus-visible) { outline: 2px solid var(--cyan); outline-offset: 4px; }
        .crm-login-card h1 { font-family: var(--font-display); font-size: 1.75rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--ink); }
        .crm-login-card > p { color: var(--muted); margin-bottom: 1rem; font-size: 0.95rem; }
        .crm-form { display: flex; flex-direction: column; gap: 1.5rem; margin-top: 2rem; }
        .crm-form-group { display: flex; flex-direction: column; gap: 0.5rem; }
        .crm-form-group label { color: var(--muted); font-size: 0.9rem; font-weight: 500; }
        .crm-form-group input { padding: 0.75rem; border: 1px solid var(--line); border-radius: 6px; background: rgba(15, 20, 40, 0.6); color: var(--ink); font-size: 0.95rem; width: 100%; }
        .crm-form-group input:focus { outline: none; border-color: var(--cyan); }
        .crm-error { background: rgba(255, 100, 100, 0.1); border: 1px solid rgba(255, 100, 100, 0.3); color: #ff9999; padding: 0.75rem; border-radius: 6px; font-size: 0.9rem; overflow-wrap: break-word; }
        .crm-button { padding: 0.75rem; background: linear-gradient(135deg, #64c8ff 0%, #5bb8ff 100%); color: #0a0e27; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 0.95rem; }
        .crm-button:disabled { opacity: 0.6; cursor: not-allowed; }
        .crm-button[aria-busy='true']:disabled { opacity: 0.85; cursor: progress; }
        .crm-login-secondary[inert] { opacity: 0.5; }
        .crm-error:focus-visible { outline: 2px solid var(--cyan); outline-offset: 2px; }
        .crm-signup-link { text-align: center; color: var(--muted); font-size: 0.9rem; margin-top: 1rem; }
        :global(.crm-signup-link a) { color: var(--cyan); text-decoration: none; font-weight: 500; }
        :global(.crm-signup-link a:hover) { color: #5bb8ff; text-decoration: underline; }
        @media (max-width: 480px) {
          .crm-login-container { padding: 1.25rem 1rem; }
          .crm-login-card { padding: 1.75rem 1.5rem; }
          :global(.crm-login-mark) { width: min(100%, 9rem); margin-bottom: 1.25rem; }
          .crm-login-card h1 { font-size: 1.4rem; }
        }
      `}</style>
    </div>
  );
}
