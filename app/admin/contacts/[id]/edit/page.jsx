'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/browser';
import AdminFormShell from '@/components/crm/AdminFormShell';

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

      const { data, error } = await supabase
        .from('contacts')
        .update(payload)
        .eq('id', id)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('Update failed - no rows changed (check permissions).');
      }

      router.push(`/admin/contacts/${id}`);
    } catch (err) {
      setError(err.message);
      setIsSubmitting(false);
    }
  }

  return (
    <AdminFormShell
      title="Edit Contact"
      backHref={`/admin/contacts/${id}`}
      backLabel="Back to Contact"
      error={error}
      loading={isLoading}
    >
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
    </AdminFormShell>
  );
}
