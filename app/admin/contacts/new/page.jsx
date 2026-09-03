'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/browser';
import { useUserRole } from '@/lib/useUserRole';
import AdminFormShell from '@/components/crm/AdminFormShell';

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

  return (
    <AdminFormShell
      title="Add Contact"
      backHref="/admin/contacts"
      backLabel="Back to Contacts"
      error={error}
      loading={isLoadingCompanies || isRoleLoading || !isAdmin}
      skeletonFields={8}
    >
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
    </AdminFormShell>
  );
}
