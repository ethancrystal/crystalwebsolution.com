'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { signIn } from '@/app/auth/actions';
import { safeNextForPortal } from '@/lib/auth/roles.mjs';

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
      <div className="crm-login-card">
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

        <p className="crm-signup-link"><Link href="/forgot-password">Forgot password?</Link></p>
        <p className="crm-signup-link"><Link href="/login">Choose another portal</Link></p>
      </div>

      <style jsx>{`
        .crm-login-container { display: flex; align-items: center; justify-content: center; min-height: 100vh; background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%); font-family: inherit; }
        .crm-login-card { background: rgba(30, 35, 60, 0.8); border: 1px solid rgba(100, 200, 255, 0.2); border-radius: 12px; padding: 2.5rem; width: 100%; max-width: 400px; backdrop-filter: blur(10px); }
        .crm-login-card h1 { font-size: 1.75rem; font-weight: 600; margin-bottom: 0.5rem; color: #e0e0e0; }
        .crm-login-card > p { color: #999; margin-bottom: 1rem; font-size: 0.95rem; }
        .crm-form { display: flex; flex-direction: column; gap: 1.5rem; margin-top: 2rem; }
        .crm-form-group { display: flex; flex-direction: column; gap: 0.5rem; }
        .crm-form-group label { color: #ccc; font-size: 0.9rem; font-weight: 500; }
        .crm-form-group input { padding: 0.75rem; border: 1px solid rgba(100, 200, 255, 0.2); border-radius: 6px; background: rgba(15, 20, 40, 0.6); color: #e0e0e0; font-size: 0.95rem; }
        .crm-form-group input:focus { outline: none; border-color: rgba(100, 200, 255, 0.6); }
        .crm-error { background: rgba(255, 100, 100, 0.1); border: 1px solid rgba(255, 100, 100, 0.3); color: #ff9999; padding: 0.75rem; border-radius: 6px; font-size: 0.9rem; }
        .crm-button { padding: 0.75rem; background: linear-gradient(135deg, #64c8ff 0%, #5bb8ff 100%); color: #0a0e27; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 0.95rem; }
        .crm-button:disabled { opacity: 0.6; cursor: not-allowed; }
        .crm-signup-link { text-align: center; color: #999; font-size: 0.9rem; margin-top: 1rem; }
        .crm-signup-link a { color: #64c8ff; text-decoration: none; font-weight: 500; }
        .crm-signup-link a:hover { color: #5bb8ff; text-decoration: underline; }
      `}</style>
    </div>
  );
}
