'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/browser';
import { useUserRole } from '@/lib/useUserRole';
import AdminFormShell from '@/components/crm/AdminFormShell';

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
  const { isAdmin, isLoading: isRoleLoading } = useUserRole();
  const [form, setForm] = useState(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Company creation is admin-only (0006_admin_only_company_contact_creation.sql)
    // - a PM landing here would just hit an RLS rejection on submit.
    if (!isRoleLoading && !isAdmin) {
      router.replace('/admin/companies');
    }
  }, [isRoleLoading, isAdmin, router]);

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
    <AdminFormShell
      variant="card"
      title="Add Company"
      backHref="/admin/companies"
      backLabel="Back to Companies"
      error={error}
      loading={isRoleLoading || !isAdmin}
      skeletonFields={6}
    >
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
    </AdminFormShell>
  );
}
