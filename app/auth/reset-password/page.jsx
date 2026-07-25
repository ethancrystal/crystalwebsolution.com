'use client';

import { useState } from 'react';
import { updatePassword } from '@/app/auth/actions';

export default function ResetPasswordPage() {
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
      const result = await updatePassword(formData);
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
    <div className="crm-login-container">
      <div className="crm-login-card">
        <h1>Set New Password</h1>
        <p>Choose a new password for your account</p>

        <form action={handleSubmit} className="crm-form">
          {error && <div className="crm-error">{error}</div>}

          <div className="crm-form-group">
            <label htmlFor="password">New Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              placeholder="••••••••"
              disabled={isLoading}
            />
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
            {isLoading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
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
      `}</style>
    </div>
  );
}
