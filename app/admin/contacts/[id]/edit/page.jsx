'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/browser';
import { SkeletonDetail } from '@/components/crm/Skeleton';

const STATUS_OPTIONS = ['lead', 'prospect', 'customer', 'inactive'];

export default function EditContactPage() {
  const { id } = useParams();
  const router = useRouter();

  const [companies, setCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
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
    async function loadData() {
      try {
        const supabase = createClient();

        const [companiesRes, contactRes] = await Promise.all([
          supabase.from('companies').select('id, name').order('name', { ascending: true }),
          supabase.from('contacts').select('*').eq('id', id).single(),
        ]);

        if (companiesRes.error) throw companiesRes.error;
        if (contactRes.error) throw contactRes.error;

        setCompanies(companiesRes.data || []);

        const contact = contactRes.data;
        setForm({
          company_id: contact.company_id || '',
          first_name: contact.first_name || '',
          last_name: contact.last_name || '',
          email: contact.email || '',
          phone: contact.phone || '',
          title: contact.title || '',
          linkedin_url: contact.linkedin_url || '',
          status: contact.status || 'lead',
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [id]);

  function handleChange(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const supabase = createClient();

      const payload = {
        company_id: form.company_id,
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone: form.phone || null,
        title: form.title || null,
        linkedin_url: form.linkedin_url || null,
        status: form.status,
      };

      const { error } = await supabase.from('contacts').update(payload).eq('id', id);

      if (error) throw error;

      router.push(`/admin/contacts/${id}`);
    } catch (err) {
      setError(err.message);
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="crm-admin-page">
        <SkeletonDetail fields={8} />
      </div>
    );
  }

  return (
    <div className="crm-admin-page">
      <header className="crm-admin-header">
        <h1>Edit Contact</h1>
        <Link href={`/admin/contacts/${id}`} className="crm-link">
          Back to Contact
        </Link>
      </header>

      {error && <div className="crm-error">{error}</div>}

      <div className="crm-form-container">
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
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
            <Link href={`/admin/contacts/${id}`} className="crm-cancel-link">
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
