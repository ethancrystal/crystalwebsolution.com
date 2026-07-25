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
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="crm-signup-container">
      <div className="crm-signup-card">
        <h1>Create Account</h1>
        <p>Join the CRM and start managing leads</p>

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

          <button type="submit" disabled={isLoading} className="crm-button">
            {isLoading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <p className="crm-login-link">
          Already have an account?{' '}
          <Link href="/login">Sign in</Link>
        </p>
      </div>

      <style jsx>{`
        .crm-signup-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%);
          font-family: inherit;
        }

        .crm-signup-card {
          background: rgba(30, 35, 60, 0.8);
          border: 1px solid rgba(100, 200, 255, 0.2);
          border-radius: 12px;
          padding: 2.5rem;
          width: 100%;
          max-width: 400px;
          backdrop-filter: blur(10px);
        }

        .crm-signup-card h1 {
          font-size: 1.75rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
          color: #e0e0e0;
        }

        .crm-signup-card > p {
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

        .crm-hint {
          color: #777;
          font-size: 0.8rem;
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
          text-decoration: none;
          display: inline-block;
          text-align: center;
        }

        .crm-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(100, 200, 255, 0.3);
        }

        .crm-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .crm-login-link {
          text-align: center;
          color: #999;
          font-size: 0.9rem;
          margin-top: 1rem;
        }

        .crm-login-link a {
          color: #64c8ff;
          text-decoration: none;
          font-weight: 500;
          transition: color 0.2s ease;
        }

        .crm-login-link a:hover {
          color: #5bb8ff;
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
