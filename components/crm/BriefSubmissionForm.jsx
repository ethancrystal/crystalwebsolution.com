'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/browser';

// Client-facing "start a project" form. Two paths depending on whether the
// signed-in client already has a company (profiles.company_id):
// - No company yet (brand-new signup): collect a company name/email first
//   and create it via the onboard_client_company() RPC (see
//   supabase/migrations/0003_project_delivery.sql) - this runs server-side
//   as a single transaction so the client never has to touch
//   profiles.company_id directly, which RLS deliberately blocks.
// - Company already set: go straight to the brief form. The new deal's
//   owner_id is set to the submitting client themselves (deals.owner_id is
//   NOT NULL) until a staff project manager picks it up and reassigns it
//   via the existing admin deal edit page.
export default function BriefSubmissionForm({ hasCompany, onCreated }) {
  const [companyForm, setCompanyForm] = useState({ name: '', email: '' });
  const [briefForm, setBriefForm] = useState({ title: '', description: '', value: '', target_date: '' });
  const [companyReady, setCompanyReady] = useState(hasCompany);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleCompanySubmit(e) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.rpc('onboard_client_company', {
        p_name: companyForm.name,
        p_email: companyForm.email || null,
      });

      if (error) throw error;

      setCompanyReady(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleBriefSubmit(e) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('You must be signed in to submit a brief.');

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      if (!profile?.company_id) throw new Error('No company on file yet - refresh and try again.');

      const payload = {
        company_id: profile.company_id,
        owner_id: user.id,
        title: briefForm.title,
        description: briefForm.description || null,
        value: briefForm.value ? Number(briefForm.value) : null,
        expected_close_date: briefForm.target_date || null,
      };

      const { data, error } = await supabase.from('deals').insert(payload).select().single();

      if (error) throw error;

      setBriefForm({ title: '', description: '', value: '', target_date: '' });
      onCreated?.(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="brief-card">
      {!companyReady ? (
        <>
          <h2 className="brief-title">Set up your company</h2>
          <p className="brief-sub">
            Before submitting your first project brief, tell us who you are.
          </p>

          {error && <div className="brief-error">{error}</div>}

          <form onSubmit={handleCompanySubmit} className="brief-form">
            <div className="brief-row">
              <label htmlFor="company-name">Company name *</label>
              <input
                id="company-name"
                type="text"
                value={companyForm.name}
                onChange={(e) => setCompanyForm((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            <div className="brief-row">
              <label htmlFor="company-email">Company email</label>
              <input
                id="company-email"
                type="email"
                value={companyForm.email}
                onChange={(e) => setCompanyForm((prev) => ({ ...prev, email: e.target.value }))}
              />
            </div>

            <button type="submit" className="brief-button" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Continue'}
            </button>
          </form>
        </>
      ) : (
        <>
          <h2 className="brief-title">Start a new project</h2>
          <p className="brief-sub">Send us your brief and we&apos;ll pick it up from here.</p>

          {error && <div className="brief-error">{error}</div>}

          <form onSubmit={handleBriefSubmit} className="brief-form">
            <div className="brief-row">
              <label htmlFor="brief-title">Project title *</label>
              <input
                id="brief-title"
                type="text"
                value={briefForm.title}
                onChange={(e) => setBriefForm((prev) => ({ ...prev, title: e.target.value }))}
                required
              />
            </div>

            <div className="brief-row">
              <label htmlFor="brief-description">Description</label>
              <textarea
                id="brief-description"
                value={briefForm.description}
                onChange={(e) => setBriefForm((prev) => ({ ...prev, description: e.target.value }))}
                rows={4}
              />
            </div>

            <div className="brief-grid">
              <div className="brief-row">
                <label htmlFor="brief-value">Budget (USD)</label>
                <input
                  id="brief-value"
                  type="number"
                  min="0"
                  value={briefForm.value}
                  onChange={(e) => setBriefForm((prev) => ({ ...prev, value: e.target.value }))}
                />
              </div>

              <div className="brief-row">
                <label htmlFor="brief-target-date">Target date</label>
                <input
                  id="brief-target-date"
                  type="date"
                  value={briefForm.target_date}
                  onChange={(e) => setBriefForm((prev) => ({ ...prev, target_date: e.target.value }))}
                />
              </div>
            </div>

            <button type="submit" className="brief-button" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit brief'}
            </button>
          </form>
        </>
      )}

      <style jsx>{`
        .brief-card {
          background: rgba(30, 35, 60, 0.8);
          border: 1px solid rgba(100, 200, 255, 0.2);
          border-radius: 12px;
          padding: 1.5rem;
          backdrop-filter: blur(10px);
        }

        .brief-title {
          font-size: 1.4rem;
          color: #64c8ff;
          margin-bottom: 0.4rem;
        }

        .brief-sub {
          color: #999;
          font-size: 0.9rem;
          margin-bottom: 1.25rem;
        }

        .brief-error {
          background: rgba(255, 100, 100, 0.1);
          border: 1px solid rgba(255, 100, 100, 0.3);
          color: #ff9999;
          padding: 0.75rem 1rem;
          border-radius: 6px;
          margin-bottom: 1rem;
          font-size: 0.9rem;
        }

        .brief-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .brief-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 1.25rem;
        }

        .brief-row {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .brief-row label {
          color: #999;
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .brief-row input,
        .brief-row textarea {
          background: rgba(15, 20, 40, 0.6);
          border: 1px solid rgba(100, 200, 255, 0.2);
          border-radius: 6px;
          padding: 0.7rem 0.9rem;
          color: #e0e0e0;
          font-size: 0.95rem;
          font-family: inherit;
        }

        .brief-row input:focus,
        .brief-row textarea:focus {
          outline: none;
          border-color: rgba(100, 200, 255, 0.6);
        }

        .brief-row textarea {
          resize: vertical;
        }

        .brief-button {
          background: linear-gradient(135deg, #64c8ff 0%, #5bb8ff 100%);
          color: #0a0e27;
          padding: 0.75rem 1.5rem;
          border-radius: 6px;
          border: none;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s ease;
          align-self: flex-start;
        }

        .brief-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(100, 200, 255, 0.3);
        }

        .brief-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
