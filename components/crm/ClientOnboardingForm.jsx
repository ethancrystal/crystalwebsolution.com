'use client';

import { useState } from 'react';
import { onboardClientCompany } from '@/app/actions/onboarding-actions';

const WORKSPACE_FEATURES = [
  {
    title: 'Projects',
    description: 'Start briefs, follow progress, and keep every project detail together.',
  },
  {
    title: 'Messages',
    description: 'Keep conversations with the Crystal Web Solution team in one place.',
  },
  {
    title: 'Files & Deliverables',
    description: 'Share source assets and download project files securely.',
  },
  {
    title: 'Approvals',
    description: 'Review deliverables and respond when a project needs your decision.',
  },
];

export default function ClientOnboardingForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(formData) {
    setIsLoading(true);
    setError(null);

    try {
      const result = await onboardClientCompany(formData);
      if (result?.error) setError(result.error);
    } catch (err) {
      if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err;
      setError('Unable to complete onboarding. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="crm-onboarding-layout">
      <section className="crm-onboarding-intro" aria-labelledby="onboarding-title">
        <p className="crm-eyebrow">Your client workspace</p>
        <h1 id="onboarding-title">Let&apos;s set up your workspace</h1>
        <p>
          Tell us who you are representing so we can connect your projects, messages,
          files, and approvals to the right company.
        </p>

        <div className="crm-onboarding-features">
          {WORKSPACE_FEATURES.map((feature) => (
            <article key={feature.title} className="crm-onboarding-feature">
              <h2>{feature.title}</h2>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="crm-onboarding-card" aria-labelledby="onboarding-form-title">
        <h2 id="onboarding-form-title">Company details</h2>
        <p>These details help our team identify your account.</p>

        <form action={handleSubmit} className="crm-form">
          {error && <div className="crm-error" role="alert">{error}</div>}

          <div className="crm-form-group">
            <label htmlFor="companyName">Company name</label>
            <input
              id="companyName"
              name="companyName"
              type="text"
              maxLength={120}
              required
              autoComplete="organization"
              disabled={isLoading}
            />
          </div>

          <div className="crm-form-group">
            <label htmlFor="contactName">Your name</label>
            <input
              id="contactName"
              name="contactName"
              type="text"
              maxLength={120}
              required
              autoComplete="name"
              disabled={isLoading}
            />
          </div>

          <div className="crm-form-group">
            <label htmlFor="phone">Phone <span className="crm-optional">(optional)</span></label>
            <input
              id="phone"
              name="phone"
              type="tel"
              maxLength={40}
              autoComplete="tel"
              disabled={isLoading}
            />
          </div>

          <button type="submit" disabled={isLoading} className="btn btn-solid crm-submit">
            {isLoading ? 'Preparing your first project…' : 'Create your first project'}
          </button>
        </form>

        <p className="crm-onboarding-next">Your project brief will be ready next.</p>
      </section>

      <style jsx>{`
        .crm-onboarding-layout {
          display: grid;
          grid-template-columns: minmax(0, 1.15fr) minmax(18rem, 0.85fr);
          gap: 2rem;
          align-items: start;
          max-width: 68rem;
          margin: 0 auto;
        }

        .crm-onboarding-intro h1 {
          max-width: 12ch;
          margin: 0.45rem 0 1rem;
          color: var(--ink);
          font-family: var(--font-display);
          font-size: clamp(2rem, 5vw, 3.5rem);
          line-height: 1.05;
          letter-spacing: -0.035em;
        }

        .crm-onboarding-intro > p:not(.crm-eyebrow) {
          max-width: 42rem;
          color: var(--muted);
          font-size: 1.05rem;
          line-height: 1.7;
        }

        .crm-eyebrow {
          margin: 0;
          color: var(--cyan);
          font-family: var(--font-mono);
          font-size: 0.72rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .crm-onboarding-features {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.8rem;
          margin-top: 2rem;
        }

        .crm-onboarding-feature {
          min-height: 8rem;
          padding: 1rem;
          border: 1px solid var(--line);
          border-radius: 14px;
          background: rgba(234, 242, 255, 0.03);
        }

        .crm-onboarding-feature h2,
        .crm-onboarding-card h2 {
          margin: 0;
          color: var(--ink);
          font-family: var(--font-display);
          font-size: 1.05rem;
        }

        .crm-onboarding-feature p,
        .crm-onboarding-card > p {
          margin: 0.45rem 0 0;
          color: var(--muted);
          font-size: 0.88rem;
          line-height: 1.5;
        }

        .crm-onboarding-card {
          padding: 1.5rem;
          border: 1px solid var(--line);
          border-radius: 18px;
          background: rgba(234, 242, 255, 0.04);
          box-shadow: 0 24px 70px rgba(2, 4, 8, 0.35);
        }

        .crm-form {
          display: flex;
          flex-direction: column;
          gap: 1.1rem;
          margin-top: 1.4rem;
        }

        .crm-form-group {
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
        }

        .crm-form-group label {
          color: var(--ink);
          font-size: 0.86rem;
          font-weight: 500;
        }

        .crm-form-group input {
          width: 100%;
          box-sizing: border-box;
          padding: 0.8rem 0.85rem;
          border: 1px solid var(--line);
          border-radius: 10px;
          background: rgba(4, 6, 12, 0.62);
          color: var(--ink);
          font-family: var(--font-body);
          font-size: 0.95rem;
        }

        .crm-form-group input:focus {
          outline: none;
          border-color: var(--cyan);
          box-shadow: 0 0 0 3px rgba(89, 243, 255, 0.12);
        }

        .crm-optional {
          color: var(--muted);
          font-weight: 400;
        }

        .crm-error {
          padding: 0.75rem 0.9rem;
          border: 1px solid rgba(255, 100, 100, 0.3);
          border-radius: 10px;
          background: rgba(255, 100, 100, 0.08);
          color: #ffb3b3;
          font-size: 0.88rem;
        }

        .crm-submit {
          width: 100%;
          justify-content: center;
          margin-top: 0.25rem;
        }

        .crm-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .crm-onboarding-next {
          margin: 1rem 0 0;
          color: var(--cyan);
          font-family: var(--font-mono);
          font-size: 0.72rem;
          letter-spacing: 0.04em;
        }

        @media (max-width: 760px) {
          .crm-onboarding-layout {
            grid-template-columns: 1fr;
          }

          .crm-onboarding-intro h1 {
            max-width: none;
          }
        }

        @media (max-width: 430px) {
          .crm-onboarding-features {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
