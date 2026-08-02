'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/browser';
import { useUserRole } from '@/lib/useUserRole';

const STATUS_OPTIONS = ['lead', 'prospect', 'customer', 'inactive'];

export default function NewContactPage() {
  const router = useRouter();
  const { isAdmin, isLoading: isRoleLoading } = useUserRole();
  const [companies, setCompanies] = useState([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    company_id: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    title: '',
    linkedin_url: '',
    status: 'lead',
  });

  useEffect(() => {
    async function loadCompanies() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('companies')
          .select('id, name')
          .order('name', { ascending: true });

        if (error) throw error;
        setCompanies(data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoadingCompanies(false);
      }
    }

    loadCompanies();
  }, []);

  useEffect(() => {
    // Contact creation is admin-only (0006_admin_only_company_contact_creation.sql)
    // - a PM landing here would just hit an RLS rejection on submit.
    if (!isRoleLoading && !isAdmin) {
      router.replace('/admin/contacts');
    }
  }, [isRoleLoading, isAdmin, router]);

  function handleChange(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
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

      if (!user) {
        throw new Error('You must be signed in to create a contact.');
      }

      const payload = {
        company_id: form.company_id,
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone: form.phone || null,
        title: form.title || null,
        linkedin_url: form.linkedin_url || null,
        status: form.status,
        created_by: user.id,
      };

      const { data, error } = await supabase.from('contacts').insert(payload).select().single();

      if (error) throw error;

      router.push(`/admin/contacts/${data.id}`);
    } catch (err) {
      setError(err.message);
      setIsSubmitting(false);
    }
  }

  if (isLoadingCompanies || isRoleLoading || !isAdmin) {
    return (
      <div className="crm-admin-page">
        <div className="crm-loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="crm-admin-page">
      <header className="crm-admin-header">
        <h1>Add Contact</h1>
        <Link href="/admin/contacts" className="crm-link">
          Back to Contacts
        </Link>
      </header>

      {error && <div className="crm-error">{error}</div>}

      <div className="crm-form-container">
        {!error && companies.length === 0 ? (
          <div className="crm-empty-state">
            <p>You need a company before you can add a contact.</p>
            <Link href="/admin/companies/new" className="crm-button">
              Create a company
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="crm-form">
            <div className="crm-form-row">
              <label htmlFor="company_id">Company *</label>
              <select
                id="company_id"
                value={form.company_id}
                onChange={handleChange('company_id')}
                required
              >
                <option value="" disabled>
                  Select a company
                </option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="crm-form-grid">
              <div className="crm-form-row">
                <label htmlFor="first_name">First Name *</label>
                <input
                  id="first_name"
                  type="text"
                  value={form.first_name}
                  onChange={handleChange('first_name')}
                  required
                />
              </div>

              <div className="crm-form-row">
                <label htmlFor="last_name">Last Name *</label>
                <input
                  id="last_name"
                  type="text"
                  value={form.last_name}
                  onChange={handleChange('last_name')}
                  required
                />
              </div>
            </div>

            <div className="crm-form-row">
              <label htmlFor="email">Email *</label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={handleChange('email')}
                required
              />
            </div>

            <div className="crm-form-grid">
              <div className="crm-form-row">
                <label htmlFor="phone">Phone</label>
                <input id="phone" type="text" value={form.phone} onChange={handleChange('phone')} />
              </div>

              <div className="crm-form-row">
                <label htmlFor="title">Title</label>
                <input id="title" type="text" value={form.title} onChange={handleChange('title')} />
              </div>
            </div>

            <div className="crm-form-row">
              <label htmlFor="linkedin_url">LinkedIn URL</label>
              <input
                id="linkedin_url"
                type="text"
                value={form.linkedin_url}
                onChange={handleChange('linkedin_url')}
              />
            </div>

            <div className="crm-form-row">
              <label htmlFor="status">Status</label>
              <select id="status" value={form.status} onChange={handleChange('status')}>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div className="crm-form-actions">
              <button type="submit" className="crm-button" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Contact'}
              </button>
              <Link href="/admin/contacts" className="crm-cancel-link">
                Cancel
              </Link>
            </div>
          </form>
        )}
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
          max-width: 800px;
          margin-left: auto;
          margin-right: auto;
        }

        .crm-admin-header h1 {
          font-size: 2rem;
          color: #64c8ff;
        }

        .crm-button {
          background: linear-gradient(135deg, #64c8ff 0%, #5bb8ff 100%);
          color: #0a0e27;
          padding: 0.75rem 1.5rem;
          border-radius: 6px;
          text-decoration: none;
          font-weight: 600;
          transition: all 0.2s ease;
          display: inline-block;
          border: none;
          cursor: pointer;
          font-size: 1rem;
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

        .crm-form-container {
          background: rgba(30, 35, 60, 0.8);
          border: 1px solid rgba(100, 200, 255, 0.2);
          border-radius: 12px;
          padding: 2rem;
          max-width: 800px;
          margin-left: auto;
          margin-right: auto;
          backdrop-filter: blur(10px);
        }

        .crm-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .crm-form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1.5rem;
        }

        .crm-form-row {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .crm-form-row label {
          color: #999;
          font-size: 0.9rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .crm-form-row input,
        .crm-form-row select,
        .crm-form-row textarea {
          background: rgba(15, 20, 40, 0.6);
          border: 1px solid rgba(100, 200, 255, 0.2);
          border-radius: 6px;
          padding: 0.75rem 1rem;
          color: #e0e0e0;
          font-size: 1rem;
          font-family: inherit;
        }

        .crm-form-row input:focus,
        .crm-form-row select:focus,
        .crm-form-row textarea:focus {
          outline: none;
          border-color: rgba(100, 200, 255, 0.6);
        }

        .crm-form-row textarea {
          resize: vertical;
          min-height: 100px;
        }

        .crm-form-actions {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          margin-top: 1rem;
        }

        .crm-cancel-link {
          color: #999;
          text-decoration: none;
          font-size: 0.9rem;
          transition: color 0.2s ease;
        }

        .crm-cancel-link:hover {
          color: #ccc;
          text-decoration: underline;
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

        .crm-empty-state {
          text-align: center;
          padding: 3rem 1rem;
        }

        .crm-empty-state p {
          color: #999;
          margin-bottom: 1rem;
        }

        .crm-error {
          background: rgba(255, 100, 100, 0.1);
          border: 1px solid rgba(255, 100, 100, 0.3);
          color: #ff9999;
          padding: 1rem;
          border-radius: 6px;
          margin-bottom: 1rem;
          max-width: 800px;
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
