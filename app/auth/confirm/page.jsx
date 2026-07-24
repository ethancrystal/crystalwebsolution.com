'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { resendConfirmationEmail } from '@/app/auth/actions';

export default function ConfirmPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmContent />
    </Suspense>
  );
}

function ConfirmContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') ?? '';
  const [resendState, setResendState] = useState('idle');

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
    <div className="crm-confirm-container">
      <div className="crm-confirm-card">
        <h1>Check Your Email</h1>
        <p>
          We've sent you a confirmation link. Please click it to verify your email
          and complete your signup.
        </p>

        {email && (
          <p className="crm-resend-row">
            {resendState === 'sent' ? (
              'Confirmation email sent again — check your inbox.'
            ) : (
              <>
                Didn't get it?{' '}
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendState === 'sending'}
                  className="crm-resend-btn"
                >
                  {resendState === 'sending' ? 'Sending...' : 'Resend email'}
                </button>
              </>
            )}
          </p>
        )}

        <Link href="/login" className="crm-button">
          Back to Login
        </Link>
      </div>

      <style jsx>{`
        .crm-confirm-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%);
          font-family: inherit;
        }

        .crm-confirm-card {
          background: rgba(30, 35, 60, 0.8);
          border: 1px solid rgba(100, 200, 255, 0.2);
          border-radius: 12px;
          padding: 2.5rem;
          width: 100%;
          max-width: 400px;
          backdrop-filter: blur(10px);
          text-align: center;
        }

        .crm-confirm-card h1 {
          font-size: 1.75rem;
          font-weight: 600;
          color: #64c8ff;
          margin-bottom: 1rem;
        }

        .crm-confirm-card p {
          color: #999;
          margin-bottom: 1.5rem;
          line-height: 1.6;
        }

        .crm-resend-row {
          font-size: 0.9rem;
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
          padding: 0.75rem 1.5rem;
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
        }

        .crm-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(100, 200, 255, 0.3);
        }
      `}</style>
    </div>
  );
}
