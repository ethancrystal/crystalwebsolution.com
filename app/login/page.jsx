'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signIn, resendConfirmationEmail } from '@/app/auth/actions';

const UNCONFIRMED_ERROR = 'Please confirm your email before signing in — check your inbox for the confirmation link.';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [resendState, setResendState] = useState('idle');

  async function handleSubmit(formData) {
    setIsLoading(true);
    setError(null);
    setResendState('idle');

    try {
      const result = await signIn(formData);
      if (result?.error) {
        setError(result.error);
      }
    } catch (err) {
      // signIn() redirects on success via next/navigation's redirect(), which
      // works by throwing a special NEXT_REDIRECT error for the framework to
      // catch. Swallowing it here as a real error breaks the redirect and
      // shows the user a generic failure right when login actually succeeded.
      if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err;
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResend() {
    setResendState('sending');
    try {
      const formData = new FormData();
      formData.set('email', email);
      const result = await resendConfirmationEmail(formData);
      setResendState(result?.error ? 'idle' : 'sent');
    } catch {
      setResendState('idle');
    }
  }

  return (
    <div className="crm-login-container">
      <div className="crm-login-card">
        <h1>CRM Login</h1>
        <p>Sign in to your account</p>

        <form action={handleSubmit} className="crm-form">
          {error && (
            <div className="crm-error">
              {error}
              {error === UNCONFIRMED_ERROR && (
                <div className="crm-resend">
                  {resendState === 'sent' ? (
                    'Confirmation email sent — check your inbox.'
                  ) : (
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={!email || resendState === 'sending'}
                      className="crm-resend-btn"
                    >
                      {resendState === 'sending'
                        ? 'Sending...'
                        : 'Resend confirmation email'}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="crm-form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              disabled={isLoading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="crm-form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              placeholder="••••••••"
              disabled={isLoading}
            />
          </div>

          <button type="submit" disabled={isLoading} className="crm-button">
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="crm-signup-link">
          <Link href="/forgot-password">Forgot password?</Link>
        </p>

        <p className="crm-signup-link">
          Don't have an account?{' '}
          <Link href="/signup">Create one</Link>
        </p>
      </div>

      <style jsx>{`
        .crm-login-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%);
          font-family: inherit;
        }

        .crm-login-card {
          background: rgba(30, 35, 60, 0.8);
          border: 1px solid rgba(100, 200, 255, 0.2);
          border-radius: 12px;
          padding: 2.5rem;
          width: 100%;
          max-width: 400px;
          backdrop-filter: blur(10px);
        }

        .crm-login-card h1 {
          font-size: 1.75rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
          color: #e0e0e0;
        }

        .crm-login-card > p {
          color: #999;
          margin-bottom: 2rem;
          font-size: 0.95rem;
        }

        .crm-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .crm-form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .crm-form-group label {
          color: #ccc;
          font-size: 0.9rem;
          font-weight: 500;
        }

        .crm-form-group input {
          padding: 0.75rem;
          border: 1px solid rgba(100, 200, 255, 0.2);
          border-radius: 6px;
          background: rgba(15, 20, 40, 0.6);
          color: #e0e0e0;
          font-size: 0.95rem;
          transition: all 0.2s ease;
        }

        .crm-form-group input:focus {
          outline: none;
          border-color: rgba(100, 200, 255, 0.6);
          background: rgba(20, 25, 45, 0.8);
          box-shadow: 0 0 8px rgba(100, 200, 255, 0.1);
        }

        .crm-form-group input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .crm-error {
          background: rgba(255, 100, 100, 0.1);
          border: 1px solid rgba(255, 100, 100, 0.3);
          color: #ff9999;
          padding: 0.75rem;
          border-radius: 6px;
          font-size: 0.9rem;
        }

        .crm-resend {
          margin-top: 0.5rem;
        }

        .crm-resend-btn {
          background: none;
          border: none;
          color: #64c8ff;
          font-size: 0.9rem;
          text-decoration: underline;
          cursor: pointer;
          padding: 0;
        }

        .crm-resend-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .crm-button {
          padding: 0.75rem;
          background: linear-gradient(135deg, #64c8ff 0%, #5bb8ff 100%);
          color: #0a0e27;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 0.95rem;
        }

        .crm-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(100, 200, 255, 0.3);
        }

        .crm-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .crm-signup-link {
          text-align: center;
          color: #999;
          font-size: 0.9rem;
          margin-top: 1rem;
        }

        .crm-signup-link a {
          color: #64c8ff;
          text-decoration: none;
          font-weight: 500;
          transition: color 0.2s ease;
        }

        .crm-signup-link a:hover {
          color: #5bb8ff;
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
