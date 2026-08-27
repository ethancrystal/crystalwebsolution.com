'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/browser';
import EntityNotes from '@/components/crm/EntityNotes';
import { SkeletonDetail } from '@/components/crm/Skeleton';

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

export default function CompanyDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [company, setCompany] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadCompany() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('companies')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        setCompany(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    if (id) loadCompany();
  }, [id]);

  async function handleDelete() {
    const confirmed = window.confirm(
      'Delete this company? All its contacts, deals, tasks and notes will be deleted too. This cannot be undone.',
    );
    if (!confirmed) return;

    setIsDeleting(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.from('companies').delete().eq('id', id).select();

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('Delete failed - no rows removed (check permissions).');
      }

      router.push('/admin/companies');
    } catch (err) {
      setError(err.message);
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="crm-admin-page">
        <SkeletonDetail />
      </div>
    );
  }

  if (error && !company) {
    return (
      <div className="crm-admin-page">
        <header className="crm-admin-header">
          <h1>Company</h1>
          <Link href="/admin/companies" className="crm-link">
            Back to Companies
          </Link>
        </header>
        <div className="crm-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="crm-admin-page">
      <header className="crm-admin-header">
        <h1>{company.name}</h1>
        <Link href="/admin/companies" className="crm-link">
          Back to Companies
        </Link>
      </header>

      {error && <div className="crm-error">{error}</div>}

      <div className="crm-form-card">
        <dl className="crm-detail-grid">
          <div className="crm-field">
            <label>Name</label>
            <div className="crm-value">{company.name}</div>
          </div>

          <div className="crm-field">
            <label>Email</label>
            <div className="crm-value">{company.email}</div>
          </div>

          <div className="crm-field-row">
            <div className="crm-field">
              <label>Phone</label>
              <div className="crm-value">{company.phone || '-'}</div>
            </div>

            <div className="crm-field">
              <label>Website</label>
              <div className="crm-value">
                {company.website ? (
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="crm-link"
                  >
                    {company.website}
                  </a>
                ) : (
                  '-'
                )}
              </div>
            </div>
          </div>

          <div className="crm-field-row">
            <div className="crm-field">
              <label>Industry</label>
              <div className="crm-value">{company.industry || '-'}</div>
            </div>

            <div className="crm-field">
              <label>Employee Count</label>
              <div className="crm-value">
                {company.employee_count != null ? company.employee_count : '-'}
              </div>
            </div>
          </div>

          <div className="crm-field-row">
            <div className="crm-field">
              <label>Created</label>
              <div className="crm-value">{formatDate(company.created_at)}</div>
            </div>

            <div className="crm-field">
              <label>Last Updated</label>
              <div className="crm-value">{formatDate(company.updated_at)}</div>
            </div>
          </div>
        </dl>

        <div className="crm-form-actions">
          <Link href={`/admin/companies/${company.id}/edit`} className="crm-button">
            Edit
          </Link>
          <Link href="/admin/companies" className="crm-button-secondary">
            Back
          </Link>
          <button
            type="button"
            className="crm-delete-btn"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete Company'}
          </button>
        </div>
      </div>

      <div className="crm-notes-wrap">
        <EntityNotes companyId={company.id} />
      </div>

      <style jsx>{`
        .crm-admin-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%);
          color: #e0e0e0;
          font-family: inherit;
          padding: 2rem;
        }

        .crm-notes-wrap {
          max-width: 700px;
          margin: 1.5rem auto 0;
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

        .crm-detail-grid {
          margin: 0;
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

        .crm-value {
          color: #e0e0e0;
          font-size: 1rem;
        }

        .crm-form-actions {
          display: flex;
          gap: 1rem;
          margin-top: 1rem;
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

        .crm-delete-btn {
          background: rgba(255, 100, 100, 0.1);
          border: 1px solid rgba(255, 100, 100, 0.3);
          color: #ff9999;
          padding: 0.75rem 1.5rem;
          border-radius: 6px;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-left: auto;
        }

        .crm-delete-btn:hover {
          background: rgba(255, 100, 100, 0.2);
        }

        .crm-delete-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
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

      `}</style>
    </div>
  );
}
