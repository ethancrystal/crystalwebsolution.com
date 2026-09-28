'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/browser';
import { useUserRole } from '@/lib/useUserRole';
import { PROJECT_TYPE_OPTIONS } from '@/lib/projectTypes';
import AdminFormShell from '@/components/crm/AdminFormShell';

const STAGE_OPTIONS = [
  { value: 'prospecting', label: 'Prospecting' },
  { value: 'qualification', label: 'Qualification' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'closed_won', label: 'Closed Won' },
  { value: 'closed_lost', label: 'Closed Lost' },
];

export default function EditDealPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;
  const { isAdmin } = useUserRole();

  const [form, setForm] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [projectManagers, setProjectManagers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const supabase = createClient();

        const [
          { data: dealData, error: dealError },
          { data: companiesData, error: companiesError },
          { data: pmData, error: pmError },
        ] = await Promise.all([
          supabase.from('deals').select('*').eq('id', id).single(),
          supabase.from('companies').select('id, name').order('name', { ascending: true }),
          supabase
            .from('profiles')
            .select('id, full_name')
            .eq('role', 'project_manager')
            .order('full_name', { ascending: true }),
        ]);

        if (dealError) throw dealError;
        if (companiesError) throw companiesError;
        // Only an admin session can read every PM's profile row (RLS scopes
        // this to deal participants for anyone else) - a PM editing their
        // own assigned deal just won't see this list, which is fine since
        // the assignment control below is admin-only anyway.
        setProjectManagers(pmError ? [] : pmData || []);
        setCompanies(companiesData || []);
        setForm({
          company_id: dealData.company_id || '',
          contact_id: dealData.contact_id || '',
          title: dealData.title || '',
          description: dealData.description || '',
          value: dealData.value ?? '',
          stage: dealData.stage || 'prospecting',
          probability: dealData.probability ?? 0,
          expected_close_date: dealData.expected_close_date || '',
          owner_id: dealData.owner_id || '',
          project_type: dealData.project_type || '',
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    if (id) loadData();
  }, [id]);

  useEffect(() => {
    async function loadContacts() {
      if (!form?.company_id) {
        setContacts([]);
        return;
      }

      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('contacts')
          .select('id, first_name, last_name')
          .eq('company_id', form.company_id)
          .order('first_name', { ascending: true });

        if (error) throw error;
        setContacts(data || []);
      } catch (err) {
        setError(err.message);
      }
    }

    loadContacts();
  }, [form?.company_id]);

  function handleChange(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === 'company_id' ? { contact_id: '' } : {}),
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const supabase = createClient();

      if (!form.company_id) throw new Error('Please select a company.');

      const payload = {
        company_id: form.company_id,
        contact_id: form.contact_id || null,
        title: form.title,
        description: form.description || null,
        value: form.value === '' ? null : Number(form.value),
        stage: form.stage,
        probability: form.probability === '' ? 0 : Number(form.probability),
        expected_close_date: form.expected_close_date || null,
        owner_id: form.owner_id,
        project_type: form.project_type || null,
      };

      const { data, error } = await supabase
        .from('deals')
        .update(payload)
        .eq('id', id)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('Update failed - no rows changed (check permissions).');
      }

      router.push(`/admin/deals/${id}`);
    } catch (err) {
      setError(err.message);
      setIsSubmitting(false);
    }
  }

  return (
    <AdminFormShell
      title="Edit Deal"
      backHref={`/admin/deals/${id}`}
      backLabel="Back to Deal"
      error={error}
      loading={isLoading}
      fatalError={error && !form ? error : null}
    >
      {form && (
        <form onSubmit={handleSubmit}>
          <div className="crm-field">
            <label htmlFor="title">Title *</label>
            <input
              id="title"
              type="text"
              required
              value={form.title}
              onChange={(e) => handleChange('title', e.target.value)}
            />
          </div>

          <div className="crm-field">
            <label htmlFor="company_id">Company *</label>
            <select
              id="company_id"
              required
              value={form.company_id}
              onChange={(e) => handleChange('company_id', e.target.value)}
            >
              <option value="">Select a company...</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>

          <div className="crm-field">
            <label htmlFor="contact_id">Contact</label>
            <select
              id="contact_id"
              value={form.contact_id}
              onChange={(e) => handleChange('contact_id', e.target.value)}
              disabled={!form.company_id}
            >
              <option value="">
                {form.company_id ? 'No contact' : 'Select a company first'}
              </option>
              {contacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.first_name} {contact.last_name}
                </option>
              ))}
            </select>
          </div>

          <div className="crm-field">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              rows={4}
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
            />
          </div>

          <div className="crm-field-row">
            <div className="crm-field">
              <label htmlFor="value">Value ($)</label>
              <input
                id="value"
                type="number"
                min="0"
                step="0.01"
                value={form.value}
                onChange={(e) => handleChange('value', e.target.value)}
              />
            </div>

            <div className="crm-field">
              <label htmlFor="probability">Probability (%)</label>
              <input
                id="probability"
                type="number"
                min="0"
                max="100"
                value={form.probability}
                onChange={(e) => handleChange('probability', e.target.value)}
              />
            </div>
          </div>

          <div className="crm-field-row">
            <div className="crm-field">
              <label htmlFor="stage">Stage</label>
              <select
                id="stage"
                value={form.stage}
                onChange={(e) => handleChange('stage', e.target.value)}
              >
                {STAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="crm-field">
              <label htmlFor="expected_close_date">Expected Close Date</label>
              <input
                id="expected_close_date"
                type="date"
                value={form.expected_close_date}
                onChange={(e) => handleChange('expected_close_date', e.target.value)}
              />
            </div>
          </div>

          <div className="crm-field-row">
            <div className="crm-field">
              <label htmlFor="project_type">Project Type</label>
              <select
                id="project_type"
                value={form.project_type}
                onChange={(e) => handleChange('project_type', e.target.value)}
              >
                <option value="">No type set</option>
                {PROJECT_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {isAdmin && (
              <div className="crm-field">
                <label htmlFor="owner_id">Assigned Project Manager</label>
                <select
                  id="owner_id"
                  value={form.owner_id}
                  onChange={(e) => handleChange('owner_id', e.target.value)}
                >
                  {!projectManagers.some((pm) => pm.id === form.owner_id) && (
                    <option value={form.owner_id}>Current owner (not a PM)</option>
                  )}
                  {projectManagers.map((pm) => (
                    <option key={pm.id} value={pm.id}>
                      {pm.full_name || pm.id}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="crm-form-actions">
            <button type="submit" className="crm-button" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
            <Link href={`/admin/deals/${id}`} className="crm-button-secondary">
              Cancel
            </Link>
          </div>
        </form>
      )}
    </AdminFormShell>
  );
}
