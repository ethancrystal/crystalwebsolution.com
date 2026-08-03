'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signUp } from '@/app/auth/actions';

export default function SignupPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(formData) {
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await signUp(formData);
      if (result?.error) {
        setError(result.error);
      }
    } catch (err) {
      // signUp() redirects on success via next/navigation's redirect(), which
      // works by throwing a special NEXT_REDIRECT error for the framework to
      // catch. Swallowing it here as a real error breaks the redirect and
      // shows the user a generic failure right when signup actually succeeded.
      if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err;
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="crm-auth-container">
      <div className="crm-auth-card">
        <Link href="/" className="crm-auth-mark" aria-label="Crystal Web Solution home">
          <img className="crm-auth-logo" src="/crystal-web-solution-icon.svg" alt="" width="160" height="63" />
        </Link>

        <h1>Create your account</h1>
        <p>Join Crystal Web Solution and start managing your projects.</p>

        <form action={handleSubmit} className="crm-form">
          {error && <div className="crm-error">{error}</div>}

          <div className="crm-form-group">
            <label htmlFor="fullName">Full Name</label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              required
              placeholder="John Doe"
              disabled={isLoading}
            />
          </div>

          <div className="crm-form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              disabled={isLoading}
            />
          </div>

          <div className="crm-form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              placeholder="••••••••"
              disabled={isLoading}
            />
            <span className="crm-hint">At least 6 characters</span>
          </div>

          <div className="crm-form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              minLength={6}
              placeholder="••••••••"
              disabled={isLoading}
            />
          </div>

          <button type="submit" disabled={isLoading} className="btn btn-solid crm-submit">
            {isLoading ? 'Creating account…' : 'Sign Up'}
          </button>
        </form>

        <p className="crm-auth-footer">
          Already have an account?{' '}
          <Link href="/login" className="link-underline">Sign in</Link>
        </p>
      </div>

      <style jsx>{`
        .crm-auth-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 2rem 1.5rem;
          background: var(--bg);
          background-image: radial-gradient(
            80% 60% at 50% 0%,
            rgba(60, 108, 255, 0.14) 0%,
            rgba(4, 6, 12, 0) 60%
          );
        }

        .crm-auth-card {
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

        :global(.crm-auth-mark:focus-visible) {
          outline: 2px solid var(--cyan);
          outline-offset: 4px;
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
          margin-bottom: 2rem;
          font-size: 0.95rem;
          text-align: center;
        }

        .crm-form {
          display: flex;
          flex-direction: column;
          gap: 1.35rem;
        }

        .crm-form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .crm-form-group label {
          color: var(--ink);
          font-size: 0.85rem;
          font-weight: 500;
        }

        .crm-hint {
          color: var(--muted);
          font-size: 0.8rem;
        }

        .crm-form-group input {
          padding: 0.8rem 0.9rem;
          border: 1px solid var(--line);
          border-radius: 10px;
          background: rgba(4, 6, 12, 0.6);
          color: var(--ink);
          font-family: var(--font-body);
          font-size: 0.95rem;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .crm-form-group input:focus {
          outline: none;
          border-color: var(--cyan);
          box-shadow: 0 0 0 3px rgba(89, 243, 255, 0.12);
        }

        .crm-form-group input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .crm-error {
          background: rgba(255, 100, 100, 0.08);
          border: 1px solid rgba(255, 100, 100, 0.3);
          color: #ffb3b3;
          padding: 0.75rem 0.9rem;
          border-radius: 10px;
          font-size: 0.9rem;
        }

        .crm-submit {
          width: 100%;
          justify-content: center;
          margin-top: 0.25rem;
        }

        .crm-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          box-shadow: none;
        }

        .crm-auth-footer {
          text-align: center;
          color: var(--muted);
          font-size: 0.9rem;
          margin-top: 1.75rem;
        }
      `}</style>
    </div>
  );
}
