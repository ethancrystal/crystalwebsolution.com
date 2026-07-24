'use client';

import { useState } from 'react';
import Link from 'next/link';
import { requestPasswordReset } from '@/app/auth/actions';

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(formData) {
    setIsLoading(true);
    setError(null);

    try {
      const result = await requestPasswordReset(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setSent(true);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="crm-login-container">
      <div className="crm-login-card">
        <h1>Reset Password</h1>
        <p>Enter your email and we'll send you a reset link</p>

        {sent ? (
          <div className="crm-success">
            Check your inbox for a password reset link.
          </div>
        ) : (
          <form action={handleSubmit} className="crm-form">
            {error && <div className="crm-error">{error}</div>}

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

            <button type="submit" disabled={isLoading} className="crm-button">
              {isLoading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        )}

        <p className="crm-signup-link">
          <Link href="/login">Back to login</Link>
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

        .crm-success {
          background: rgba(100, 255, 150, 0.1);
          border: 1px solid rgba(100, 255, 150, 0.3);
          color: #9fffc0;
          padding: 0.75rem;
          border-radius: 6px;
          font-size: 0.9rem;
          margin-bottom: 1.5rem;
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
          margin-top: 1.5rem;
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
