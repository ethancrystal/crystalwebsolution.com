'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/browser';

const INITIAL_FORM = {
  name: '',
  email: '',
  phone: '',
  website: '',
  industry: '',
  employee_count: '',
};

export default function NewCompanyPage() {
  const router = useRouter();
  const [form, setForm] = useState(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('You must be signed in to create a company.');

      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone || null,
        website: form.website || null,
        industry: form.industry || null,
        employee_count: form.employee_count === '' ? null : Number(form.employee_count),
        created_by: user.id,
      };

      const { data, error } = await supabase.from('companies').insert(payload).select().single();

      if (error) throw error;

      router.push(`/admin/companies/${data.id}`);
    } catch (err) {
      setError(err.message);
      setIsSubmitting(false);
    }
  }

  return (
    <div className="crm-admin-page">
      <header className="crm-admin-header">
        <h1>Add Company</h1>
        <Link href="/admin/companies" className="crm-link">
          Back to Companies
        </Link>
      </header>

      {error && <div className="crm-error">{error}</div>}

      <div className="crm-form-card">
        <form onSubmit={handleSubmit}>
          <div className="crm-field">
            <label htmlFor="name">Name *</label>
            <input
              id="name"
              type="text"
              required
              placeholder="Acme Inc."
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
            />
          </div>

          <div className="crm-field">
            <label htmlFor="email">Email *</label>
            <input
              id="email"
              type="email"
              required
              placeholder="contact@acme.com"
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
            />
          </div>

          <div className="crm-field-row">
            <div className="crm-field">
              <label htmlFor="phone">Phone</label>
              <input
                id="phone"
                type="text"
                placeholder="(555) 123-4567"
                value={form.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
              />
            </div>

            <div className="crm-field">
              <label htmlFor="website">Website</label>
              <input
                id="website"
                type="text"
                placeholder="https://acme.com"
                value={form.website}
                onChange={(e) => handleChange('website', e.target.value)}
              />
            </div>
          </div>

          <div className="crm-field-row">
            <div className="crm-field">
              <label htmlFor="industry">Industry</label>
              <input
                id="industry"
                type="text"
                placeholder="Software"
                value={form.industry}
                onChange={(e) => handleChange('industry', e.target.value)}
              />
            </div>

            <div className="crm-field">
              <label htmlFor="employee_count">Employee Count</label>
              <input
                id="employee_count"
                type="number"
                min="0"
                placeholder="50"
                value={form.employee_count}
                onChange={(e) => handleChange('employee_count', e.target.value)}
              />
            </div>
          </div>

          <div className="crm-form-actions">
            <button type="submit" className="crm-button" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Create Company'}
            </button>
            <Link href="/admin/companies" className="crm-button-secondary">
              Cancel
            </Link>
          </div>
        </form>
      </div>

      <style jsx>{`
        .crm-admin-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%);
          color: #e0e0e0;
          font-family: inherit;
          padding: 2rem;
        }

        .crm-admin-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          max-width: 700px;
          margin-left: auto;
          margin-right: auto;
        }

        .crm-admin-header h1 {
          font-size: 2rem;
          color: #64c8ff;
        }

        .crm-link {
          color: #64c8ff;
          text-decoration: none;
          font-size: 0.9rem;
          transition: color 0.2s ease;
        }

        .crm-link:hover {
          color: #5bb8ff;
          text-decoration: underline;
        }

        .crm-form-card {
          background: rgba(30, 35, 60, 0.8);
          border: 1px solid rgba(100, 200, 255, 0.2);
          border-radius: 12px;
          padding: 2rem;
          max-width: 700px;
          margin-left: auto;
          margin-right: auto;
          backdrop-filter: blur(10px);
        }

        .crm-field {
          margin-bottom: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          flex: 1;
        }

        .crm-field-row {
          display: flex;
          gap: 1.5rem;
        }

        .crm-field label {
          color: #999;
          font-size: 0.85rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .crm-field input,
        .crm-field select,
        .crm-field textarea {
          background: rgba(15, 20, 40, 0.6);
          border: 1px solid rgba(100, 200, 255, 0.2);
          border-radius: 6px;
          color: #e0e0e0;
          padding: 0.75rem;
          font-size: 1rem;
          font-family: inherit;
        }

        .crm-field input:focus,
        .crm-field select:focus,
        .crm-field textarea:focus {
          outline: none;
          border-color: #64c8ff;
        }

        .crm-form-actions {
          display: flex;
          gap: 1rem;
          margin-top: 2rem;
        }

        .crm-button {
          background: linear-gradient(135deg, #64c8ff 0%, #5bb8ff 100%);
          color: #0a0e27;
          padding: 0.75rem 1.5rem;
          border-radius: 6px;
          border: none;
          text-decoration: none;
          font-weight: 600;
          font-size: 1rem;
          transition: all 0.2s ease;
          cursor: pointer;
          display: inline-block;
        }

        .crm-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(100, 200, 255, 0.3);
        }

        .crm-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .crm-button-secondary {
          background: rgba(100, 200, 255, 0.1);
          border: 1px solid rgba(100, 200, 255, 0.3);
          color: #64c8ff;
          padding: 0.75rem 1.5rem;
          border-radius: 6px;
          text-decoration: none;
          font-weight: 600;
          font-size: 1rem;
          transition: all 0.2s ease;
          display: inline-block;
        }

        .crm-button-secondary:hover {
          background: rgba(100, 200, 255, 0.2);
        }

        .crm-error {
          background: rgba(255, 100, 100, 0.1);
          border: 1px solid rgba(255, 100, 100, 0.3);
          color: #ff9999;
          padding: 1rem;
          border-radius: 6px;
          margin-bottom: 1rem;
          max-width: 700px;
          margin-left: auto;
          margin-right: auto;
        }

        .crm-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          color: #64c8ff;
          font-size: 1.2rem;
        }
      `}</style>
    </div>
  );
}
