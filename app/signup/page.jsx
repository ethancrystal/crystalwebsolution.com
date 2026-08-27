'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signUp } from '@/app/auth/actions';
import { SITE } from '@/lib/site';
import DarkPageBackground from '@/components/ui/dark-page-background';

// Mirrors SIGNUP_ACCOUNT_TYPES in lib/auth/roles.mjs, which the server action
// re-validates against. Admin is absent by design and is not self-service.
const ACCOUNT_TYPES = [
  { value: 'client', label: 'A client', description: 'Track your projects with us' },
  { value: 'employee', label: 'An employee', description: 'Requires admin approval' },
];

export default function SignupPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [accountType, setAccountType] = useState('client');

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
      <DarkPageBackground interactive="ripple-grid" />
      <div className="crm-auth-card">
        <Link href="/" className="crm-auth-mark" aria-label={`${SITE.name} home`}>
          <img className="crm-auth-logo" src={SITE.logoPath} alt={SITE.name} width="405" height="63" />
        </Link>

        <h1>Create your account</h1>
        <p>Join CD Sportswear USA and start managing your projects.</p>

        <form action={handleSubmit} className="crm-form">
          {error && <div className="crm-error">{error}</div>}

          <fieldset className="crm-account-type">
            <legend>I&apos;m signing up as</legend>
            <div className="crm-account-options">
              {ACCOUNT_TYPES.map((option) => (
                <label
                  key={option.value}
                  className={`crm-account-option${accountType === option.value ? ' is-selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="accountType"
                    value={option.value}
                    checked={accountType === option.value}
                    onChange={() => setAccountType(option.value)}
                    disabled={isLoading}
                  />
                  <span className="crm-account-title">{option.label}</span>
                  <span className="crm-account-desc">{option.description}</span>
                </label>
              ))}
            </div>
            {accountType === 'employee' && (
              <p className="crm-account-note">
                Employee accounts need admin approval. You&apos;ll sign in with client
                access until CD Sportswear USA approves the request.
              </p>
            )}
          </fieldset>

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
          position: relative;
          z-index: 1;
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

        .crm-account-type {
          border: 0;
          padding: 0;
          margin: 0;
          /* Fieldsets have a UA min-width that would stop the grid shrinking. */
          min-inline-size: 0;
        }

        .crm-account-type legend {
          color: var(--ink);
          font-size: 0.85rem;
          font-weight: 500;
          padding: 0;
          margin-bottom: 0.5rem;
        }

        .crm-account-options {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
        }

        .crm-account-option {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
          padding: 0.8rem 0.9rem;
          border: 1px solid var(--line);
          border-radius: 10px;
          background: rgba(4, 6, 12, 0.6);
          cursor: pointer;
          transition: border-color 0.2s ease, box-shadow 0.2s ease,
            background-color 0.2s ease;
        }

        .crm-account-option.is-selected {
          border-color: var(--cyan);
          background: rgba(89, 243, 255, 0.06);
          box-shadow: 0 0 0 3px rgba(89, 243, 255, 0.12);
        }

        .crm-account-option:focus-within {
          border-color: var(--cyan);
        }

        /* The radio itself is redundant once the card reflects selection, but
           it stays in the accessibility tree so the group remains keyboard
           and screen-reader navigable. */
        .crm-account-option input {
          position: absolute;
          width: 1px;
          height: 1px;
          opacity: 0;
          pointer-events: none;
        }

        .crm-account-title {
          color: var(--ink);
          font-size: 0.9rem;
          font-weight: 500;
        }

        .crm-account-desc {
          color: var(--muted);
          font-size: 0.78rem;
          line-height: 1.35;
        }

        .crm-account-note {
          color: var(--muted);
          font-size: 0.8rem;
          line-height: 1.45;
          margin-top: 0.6rem;
        }

        @media (max-width: 380px) {
          .crm-account-options {
            grid-template-columns: 1fr;
          }
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
