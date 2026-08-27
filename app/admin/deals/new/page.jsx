'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/browser';
import { useUserRole } from '@/lib/useUserRole';
import { PROJECT_TYPE_OPTIONS } from '@/lib/projectTypes';
import { SkeletonDetail } from '@/components/crm/Skeleton';

const STAGE_OPTIONS = [
  { value: 'prospecting', label: 'Prospecting' },
  { value: 'qualification', label: 'Qualification' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'closed_won', label: 'Closed Won' },
  { value: 'closed_lost', label: 'Closed Lost' },
];

const INITIAL_FORM = {
  company_id: '',
  contact_id: '',
  title: '',
  description: '',
  value: '',
  stage: 'prospecting',
  probability: '0',
  expected_close_date: '',
  project_type: '',
};

export default function NewDealPage() {
  const router = useRouter();
  const { isAdmin, isLoading: isRoleLoading } = useUserRole();
  const [form, setForm] = useState(INITIAL_FORM);
  const [companies, setCompanies] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

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
        setIsLoading(false);
      }
    }

    loadCompanies();
  }, []);

  useEffect(() => {
    // Deal creation is admin-only (0005_pm_scoping_and_project_type.sql -
    // "Admin can create deals") - a PM landing here would just hit an RLS
    // rejection on submit, so redirect before they fill out the form.
    if (!isRoleLoading && !isAdmin) {
      router.replace('/admin/deals');
    }
  }, [isRoleLoading, isAdmin, router]);

  useEffect(() => {
    async function loadContacts() {
      if (!form.company_id) {
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
  }, [form.company_id]);

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
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('You must be signed in to create a deal.');
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
        project_type: form.project_type || null,
        owner_id: user.id,
      };

      const { data, error } = await supabase.from('deals').insert(payload).select().single();

      if (error) throw error;

      router.push(`/admin/deals/${data.id}`);
    } catch (err) {
      setError(err.message);
      setIsSubmitting(false);
    }
  }

  if (isLoading || isRoleLoading || !isAdmin) {
    return (
      <div className="crm-admin-page">
        <SkeletonDetail fields={9} />
      </div>
    );
  }

  return (
    <div className="crm-admin-page">
      <header className="crm-admin-header">
        <h1>Add Deal</h1>
        <Link href="/admin/deals" className="crm-link">
          Back to Deals
        </Link>
      </header>

      {error && <div className="crm-error">{error}</div>}

      <div className="crm-form-card">
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

          <div className="crm-form-actions">
            <button type="submit" className="crm-button" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Create Deal'}
            </button>
            <Link href="/admin/deals" className="crm-button-secondary">
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

        .crm-field select:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .crm-field textarea {
          resize: vertical;
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
