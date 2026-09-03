'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/browser';
import { useUserRole } from '@/lib/useUserRole';
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
} from '@/lib/crm/project-contract.mjs';
import AdminFormShell from '@/components/crm/AdminFormShell';

const STATUS_OPTIONS = TASK_STATUSES;
const PRIORITY_OPTIONS = TASK_PRIORITIES;

export default function NewTaskPage() {
  const router = useRouter();
  const { isAdmin, isLoading: isRoleLoading } = useUserRole();
  const [companies, setCompanies] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [deals, setDeals] = useState([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    company_id: '',
    deal_id: '',
    contact_id: '',
    title: '',
    description: '',
    status: 'open',
    priority: 'medium',
    due_date: '',
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
    // Task creation is admin-only (0005_pm_scoping_and_project_type.sql:120,
    // "Admin can create tasks" WITH CHECK is_admin()) - a PM landing here would
    // just hit an RLS rejection on submit. Same guard as the other three
    // /admin/<entity>/new pages.
    if (!isRoleLoading && !isAdmin) {
      router.replace('/admin/tasks');
    }
  }, [isRoleLoading, isAdmin, router]);

  useEffect(() => {
    async function loadRelated() {
      if (!form.company_id) {
        setContacts([]);
        setDeals([]);
        return;
      }

      const supabase = createClient();

      const [contactsRes, dealsRes] = await Promise.all([
        supabase
          .from('contacts')
          .select('id, first_name, last_name')
          .eq('company_id', form.company_id)
          .order('first_name', { ascending: true }),
        supabase
          .from('deals')
          .select('id, title')
          .eq('company_id', form.company_id)
          .order('title', { ascending: true }),
      ]);

      setContacts(contactsRes.data || []);
      setDeals(dealsRes.data || []);
    }

    loadRelated();
  }, [form.company_id]);

  function handleChange(field) {
    return (e) => {
      const value = e.target.value;
      setForm((prev) => ({
        ...prev,
        [field]: value,
        ...(field === 'company_id' ? { deal_id: '', contact_id: '' } : {}),
      }));
    };
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
        throw new Error('You must be signed in to create a task.');
      }

      const payload = {
        company_id: form.company_id,
        deal_id: form.deal_id || null,
        contact_id: form.contact_id || null,
        title: form.title,
        description: form.description || null,
        status: form.status,
        priority: form.priority,
        due_date: form.due_date || null,
        assigned_to: user.id,
        created_by: user.id,
      };

      const { data, error } = await supabase.from('tasks').insert(payload).select().single();

      if (error) throw error;

      router.push(`/admin/tasks/${data.id}`);
    } catch (err) {
      setError(err.message);
      setIsSubmitting(false);
    }
  }

  return (
    <AdminFormShell
      title="Add Task"
      backHref="/admin/tasks"
      backLabel="Back to Tasks"
      error={error}
      loading={isLoadingCompanies || isRoleLoading || !isAdmin}
      skeletonFields={8}
    >
      {!error && companies.length === 0 ? (
        <div className="crm-empty-state">
          <p>You need a company before you can add a task.</p>
          <Link href="/admin/companies/new" className="crm-button">
            Create a company
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="crm-form">
          <div className="crm-form-row">
            <label htmlFor="title">Title *</label>
            <input
              id="title"
              type="text"
              value={form.title}
              onChange={handleChange('title')}
              required
            />
          </div>

          <div className="crm-form-row">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={form.description}
              onChange={handleChange('description')}
            />
          </div>

          <div className="crm-form-grid">
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

            <div className="crm-form-row">
              <label htmlFor="contact_id">Contact</label>
              <select
                id="contact_id"
                value={form.contact_id}
                onChange={handleChange('contact_id')}
                disabled={!form.company_id}
              >
                <option value="">None</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.first_name} {contact.last_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="crm-form-grid">
            <div className="crm-form-row">
              <label htmlFor="deal_id">Deal</label>
              <select
                id="deal_id"
                value={form.deal_id}
                onChange={handleChange('deal_id')}
                disabled={!form.company_id}
              >
                <option value="">None</option>
                {deals.map((deal) => (
                  <option key={deal.id} value={deal.id}>
                    {deal.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="crm-form-row">
              <label htmlFor="due_date">Due Date</label>
              <input
                id="due_date"
                type="date"
                value={form.due_date}
                onChange={handleChange('due_date')}
              />
            </div>
          </div>

          <div className="crm-form-grid">
            <div className="crm-form-row">
              <label htmlFor="status">Status</label>
              <select id="status" value={form.status} onChange={handleChange('status')}>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div className="crm-form-row">
              <label htmlFor="priority">Priority</label>
              <select id="priority" value={form.priority} onChange={handleChange('priority')}>
                {PRIORITY_OPTIONS.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="crm-form-actions">
            <button type="submit" className="crm-button" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Task'}
            </button>
            <Link href="/admin/tasks" className="crm-cancel-link">
              Cancel
            </Link>
          </div>
        </form>
      )}
    </AdminFormShell>
  );
}
