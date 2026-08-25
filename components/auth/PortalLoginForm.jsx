'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { signIn } from '@/app/auth/actions';
import { safeNextForPortal } from '@/lib/auth/roles.mjs';
import { SITE } from '@/lib/site';
import DarkPageBackground from '@/components/ui/dark-page-background';

const PORTAL_ERROR = 'This account cannot sign in to this portal.';
const CONFIGURATION_ERROR = 'Sign-in is temporarily unavailable because authentication is not configured. Please contact support.';

export default function PortalLoginForm({ portal }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [next, setNext] = useState(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const errorCode = searchParams.get('error');
    const portalName = portal.login.split('/').pop();
    setNext(safeNextForPortal(portalName, searchParams.get('next')));
    setError(errorCode === 'configuration' ? CONFIGURATION_ERROR : errorCode ? PORTAL_ERROR : null);
  }, [portal]);

  async function handleSubmit(formData) {
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn(formData);
      if (result?.error) setError(result.error);
    } catch (err) {
      if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err;
      setError(PORTAL_ERROR);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="crm-login-container">
      <DarkPageBackground />
      <div className="crm-login-card">
        <Link href="/" className="crm-login-mark" aria-label={`${SITE.name} home`}>
          <img src={SITE.logoPath} alt={SITE.name} width="160" height="63" />
        </Link>
        <h1>{portal.label} Portal</h1>
        <p>Sign in to your account</p>

        <form action={handleSubmit} className="crm-form">
          <input type="hidden" name="portal" value={portal.login.split('/').pop()} />
          {next && <input type="hidden" name="next" value={next} />}
          {error && <div className="crm-error">{error}</div>}

          <div className="crm-form-group">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required placeholder="you@example.com" disabled={isLoading} />
          </div>

          <div className="crm-form-group">
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" required placeholder="••••••••" disabled={isLoading} />
          </div>

          <button type="submit" disabled={isLoading} className="crm-button">
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {portal.role === 'client' && (
          <p className="crm-signup-link">
            New customer? <Link href="/signup">Sign up to start a project</Link>
          </p>
        )}
        <p className="crm-signup-link"><Link href="/forgot-password">Forgot password?</Link></p>
        <p className="crm-signup-link"><Link href="/login">Choose another portal</Link></p>
      </div>

      <style jsx>{`
        .crm-login-container { display: flex; align-items: center; justify-content: center; min-height: 100vh; position: relative; z-index: 1; font-family: inherit; }
        .crm-login-card { background: rgba(234, 242, 255, 0.03); border: 1px solid var(--line); border-radius: 20px; padding: 2.5rem; width: 100%; max-width: 400px; backdrop-filter: blur(16px); box-shadow: 0 30px 80px rgba(2, 4, 8, 0.55); }
        .crm-login-mark { display: flex; align-items: center; justify-content: center; width: min(100%, 11rem); margin: 0 auto 1.5rem; }
        .crm-login-mark img { display: block; width: 100%; height: auto; object-fit: contain; }
        .crm-login-mark:focus-visible { outline: 2px solid var(--cyan); outline-offset: 4px; }
        .crm-login-card h1 { font-family: var(--font-display); font-size: 1.75rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--ink); }
        .crm-login-card > p { color: var(--muted); margin-bottom: 1rem; font-size: 0.95rem; }
        .crm-form { display: flex; flex-direction: column; gap: 1.5rem; margin-top: 2rem; }
        .crm-form-group { display: flex; flex-direction: column; gap: 0.5rem; }
        .crm-form-group label { color: var(--muted); font-size: 0.9rem; font-weight: 500; }
        .crm-form-group input { padding: 0.75rem; border: 1px solid var(--line); border-radius: 6px; background: rgba(15, 20, 40, 0.6); color: var(--ink); font-size: 0.95rem; }
        .crm-form-group input:focus { outline: none; border-color: var(--cyan); }
        .crm-error { background: rgba(255, 100, 100, 0.1); border: 1px solid rgba(255, 100, 100, 0.3); color: #ff9999; padding: 0.75rem; border-radius: 6px; font-size: 0.9rem; }
        .crm-button { padding: 0.75rem; background: linear-gradient(135deg, #64c8ff 0%, #5bb8ff 100%); color: #0a0e27; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 0.95rem; }
        .crm-button:disabled { opacity: 0.6; cursor: not-allowed; }
        .crm-signup-link { text-align: center; color: var(--muted); font-size: 0.9rem; margin-top: 1rem; }
        .crm-signup-link a { color: var(--cyan); text-decoration: none; font-weight: 500; }
        .crm-signup-link a:hover { color: #5bb8ff; text-decoration: underline; }
      `}</style>
    </div>
  );
}
