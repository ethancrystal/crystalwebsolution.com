'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/browser';
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
} from '@/lib/crm/project-contract.mjs';
import { SkeletonDetail } from '@/components/crm/Skeleton';

const STATUS_OPTIONS = TASK_STATUSES;
const PRIORITY_OPTIONS = TASK_PRIORITIES;

export default function NewTaskPage() {
  const router = useRouter();
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

  if (isLoadingCompanies) {
    return (
      <div className="crm-admin-page">
        <SkeletonDetail fields={8} />
      </div>
    );
  }

  return (
    <div className="crm-admin-page">
      <header className="crm-admin-header">
        <h1>Add Task</h1>
        <Link href="/admin/tasks" className="crm-link">
          Back to Tasks
        </Link>
      </header>

      {error && <div className="crm-error">{error}</div>}

      <div className="crm-form-container">
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

        .crm-form-row select:disabled {
          opacity: 0.5;
          cursor: not-allowed;
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
