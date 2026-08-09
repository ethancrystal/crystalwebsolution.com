'use client';

import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="crm-auth-container">
      <div className="crm-auth-card">
        <Link href="/" className="crm-auth-mark" aria-label="Crystal Web Solution home">
          <img className="crm-auth-logo" src="/crystal-web-solution-icon.svg" alt="Crystal Web Solution" width="160" height="63" />
        </Link>

        <h1>Choose your portal</h1>
        <p>Sign in through the portal assigned to your account.</p>

        <nav className="crm-portal-list" aria-label="Login portals">
          <Link href="/login/client" className="crm-portal-link">Client Portal</Link>
          <Link href="/login/employee" className="crm-portal-link">Employee Portal</Link>
          <Link href="/login/admin" className="crm-portal-link">Admin Portal</Link>
        </nav>

        <p className="crm-auth-footer"><Link href="/forgot-password" className="link-underline">Forgot password?</Link></p>

        <p className="crm-auth-footer">
          Don't have an account?{' '}
          <Link href="/signup" className="link-underline">Create one</Link>
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
          margin-bottom: 0.5rem;
          font-size: 0.95rem;
          text-align: center;
        }

        .crm-portal-list { display: grid; gap: 0.75rem; margin: 2rem 0 0.5rem; }
        :global(.crm-portal-link) {
          border: 1px solid var(--line);
          border-radius: 12px;
          color: var(--ink);
          padding: 1rem 1.1rem;
          text-align: center;
          font-family: var(--font-display);
          font-weight: 600;
          letter-spacing: 0.01em;
          transition: border-color 0.25s ease, background 0.25s ease, color 0.25s ease;
        }
        :global(.crm-portal-link:hover),
        :global(.crm-portal-link:focus-visible) {
          background: rgba(89, 243, 255, 0.08);
          border-color: var(--cyan);
          color: var(--cyan);
        }

        :global(.crm-auth-mark:focus-visible),
        :global(.crm-portal-link:focus-visible) {
          outline: 2px solid var(--cyan);
          outline-offset: 4px;
        }

        .crm-auth-footer {
          text-align: center;
          color: var(--muted);
          font-size: 0.9rem;
          margin-top: 1rem;
        }
      `}</style>
    </div>
  );
}
