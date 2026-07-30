'use client';

import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="crm-login-container">
      <div className="crm-login-card">
        <h1>Choose your portal</h1>
        <p>Sign in through the portal assigned to your account.</p>

        <nav className="crm-portal-list" aria-label="Login portals">
          <Link href="/login/client" className="crm-portal-link">Client Portal</Link>
          <Link href="/login/employee" className="crm-portal-link">Employee Portal</Link>
          <Link href="/login/admin" className="crm-portal-link">Admin Portal</Link>
        </nav>

        <p className="crm-signup-link"><Link href="/forgot-password">Forgot password?</Link></p>

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

        .crm-portal-list { display: grid; gap: 0.75rem; margin: 2rem 0; }
        .crm-portal-link { border: 1px solid rgba(100, 200, 255, 0.3); border-radius: 6px; color: #64c8ff; padding: 0.9rem 1rem; text-align: center; text-decoration: none; font-weight: 600; }
        .crm-portal-link:hover { background: rgba(100, 200, 255, 0.1); border-color: rgba(100, 200, 255, 0.6); }

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
