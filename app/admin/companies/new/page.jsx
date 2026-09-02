'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/browser';
import { useUserRole } from '@/lib/useUserRole';
import {
  ADMIN_PAGE,
  LOADING,
  FORM_HEADER,
  ADMIN_HEADER_TITLE,
  FORM_ERROR,
  FORM_CARD,
  FIELD,
  FIELD_ROW,
  FIELD_LABEL,
  INPUT,
  FORM_ACTIONS,
  BUTTON,
  BUTTON_SECONDARY,
  LINK,
} from '@/lib/crm/adminPageStyles';

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

  if (isRoleLoading || !isAdmin) {
    return (
      <div className={ADMIN_PAGE}>
        <div className={LOADING}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={ADMIN_PAGE}>
      <header className={FORM_HEADER}>
        <h1 className={ADMIN_HEADER_TITLE}>Add Company</h1>
        <Link href="/admin/companies" className={LINK}>
          Back to Companies
        </Link>
      </header>

      {error && <div className={FORM_ERROR}>{error}</div>}

      <div className={FORM_CARD}>
        <form onSubmit={handleSubmit}>
          <div className={FIELD}>
            <label htmlFor="name" className={FIELD_LABEL}>Name *</label>
            <input
              id="name"
              type="text"
              required
              placeholder="Acme Inc."
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className={INPUT}
            />
          </div>

          <div className={FIELD}>
            <label htmlFor="email" className={FIELD_LABEL}>Email *</label>
            <input
              id="email"
              type="email"
              required
              placeholder="contact@acme.com"
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className={INPUT}
            />
          </div>

          <div className={FIELD_ROW}>
            <div className={FIELD}>
              <label htmlFor="phone" className={FIELD_LABEL}>Phone</label>
              <input
                id="phone"
                type="text"
                placeholder="(555) 123-4567"
                value={form.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className={INPUT}
              />
            </div>

            <div className={FIELD}>
              <label htmlFor="website" className={FIELD_LABEL}>Website</label>
              <input
                id="website"
                type="text"
                placeholder="https://acme.com"
                value={form.website}
                onChange={(e) => handleChange('website', e.target.value)}
                className={INPUT}
              />
            </div>
          </div>

          <div className={FIELD_ROW}>
            <div className={FIELD}>
              <label htmlFor="industry" className={FIELD_LABEL}>Industry</label>
              <input
                id="industry"
                type="text"
                placeholder="Software"
                value={form.industry}
                onChange={(e) => handleChange('industry', e.target.value)}
                className={INPUT}
              />
            </div>

            <div className={FIELD}>
              <label htmlFor="employee_count" className={FIELD_LABEL}>Employee Count</label>
              <input
                id="employee_count"
                type="number"
                min="0"
                placeholder="50"
                value={form.employee_count}
                onChange={(e) => handleChange('employee_count', e.target.value)}
                className={INPUT}
              />
            </div>
          </div>

          <div className={`${FORM_ACTIONS} tw:mt-8`}>
            <button type="submit" className={BUTTON} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Create Company'}
            </button>
            <Link href="/admin/companies" className={BUTTON_SECONDARY}>
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
