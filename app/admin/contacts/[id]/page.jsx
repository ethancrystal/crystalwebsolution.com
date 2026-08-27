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

export default function ContactDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [contact, setContact] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function loadContact() {
      try {
        const supabase = createClient();

        const { data, error } = await supabase
          .from('contacts')
          .select('*, companies(name)')
          .eq('id', id)
          .single();

        if (error) throw error;
        setContact(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    loadContact();
  }, [id]);

  async function handleDelete() {
    if (!window.confirm('Delete this contact? This cannot be undone.')) return;

    setIsDeleting(true);
    setError(null);

    try {
      const supabase = createClient();

      const { error, count } = await supabase
        .from('contacts')
        .delete({ count: 'exact' })
        .eq('id', id);

      if (error) throw error;

      if (!count) {
        throw new Error(
          'Delete affected no rows. You may not have permission to delete this contact.',
        );
      }

      router.push('/admin/contacts');
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

  if (error && !contact) {
    return (
      <div className="crm-admin-page">
        <header className="crm-admin-header">
          <h1>Contact</h1>
          <Link href="/admin/contacts" className="crm-link">
            Back to Contacts
          </Link>
        </header>
        <div className="crm-error">{error}</div>
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
          .crm-link {
            color: #64c8ff;
            text-decoration: none;
            font-size: 0.9rem;
          }
          .crm-error {
            background: rgba(255, 100, 100, 0.1);
            border: 1px solid rgba(255, 100, 100, 0.3);
            color: #ff9999;
            padding: 1rem;
            border-radius: 6px;
            max-width: 800px;
            margin-left: auto;
            margin-right: auto;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="crm-admin-page">
      <header className="crm-admin-header">
        <h1>
          {contact.first_name} {contact.last_name}
        </h1>
        <Link href="/admin/contacts" className="crm-link">
          Back to Contacts
        </Link>
      </header>

      {error && <div className="crm-error">{error}</div>}

      <div className="crm-detail-container">
        <div className="crm-detail-grid">
          <div className="crm-detail-field">
            <span className="crm-detail-label">Company</span>
            <span className="crm-detail-value">{contact.companies?.name || '-'}</span>
          </div>

          <div className="crm-detail-field">
            <span className="crm-detail-label">Status</span>
            <span className="crm-detail-value">
              <span className={`crm-status crm-status-${contact.status || 'lead'}`}>
                {contact.status || 'lead'}
              </span>
            </span>
          </div>

          <div className="crm-detail-field">
            <span className="crm-detail-label">Email</span>
            <span className="crm-detail-value">{contact.email}</span>
          </div>

          <div className="crm-detail-field">
            <span className="crm-detail-label">Phone</span>
            <span className="crm-detail-value">{contact.phone || '-'}</span>
          </div>

          <div className="crm-detail-field">
            <span className="crm-detail-label">Title</span>
            <span className="crm-detail-value">{contact.title || '-'}</span>
          </div>

          <div className="crm-detail-field">
            <span className="crm-detail-label">LinkedIn</span>
            <span className="crm-detail-value">
              {contact.linkedin_url ? (
                <a href={contact.linkedin_url} target="_blank" rel="noreferrer">
                  {contact.linkedin_url}
                </a>
              ) : (
                '-'
              )}
            </span>
          </div>

          <div className="crm-detail-field">
            <span className="crm-detail-label">Created</span>
            <span className="crm-detail-value">{formatDate(contact.created_at)}</span>
          </div>

          <div className="crm-detail-field">
            <span className="crm-detail-label">Updated</span>
            <span className="crm-detail-value">{formatDate(contact.updated_at)}</span>
          </div>
        </div>

        <div className="crm-detail-actions">
          <Link href={`/admin/contacts/${id}/edit`} className="crm-button">
            Edit
          </Link>
          <button
            type="button"
            className="crm-delete-button"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>

      <div className="crm-notes-wrap">
        <EntityNotes companyId={contact.company_id} contactId={contact.id} />
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
          max-width: 800px;
          margin: 1.5rem auto 0;
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

        .crm-detail-container {
          background: rgba(30, 35, 60, 0.8);
          border: 1px solid rgba(100, 200, 255, 0.2);
          border-radius: 12px;
          padding: 2rem;
          max-width: 800px;
          margin-left: auto;
          margin-right: auto;
          backdrop-filter: blur(10px);
        }

        .crm-detail-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .crm-detail-field {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .crm-detail-label {
          color: #999;
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .crm-detail-value {
          color: #e0e0e0;
          font-size: 1rem;
          word-break: break-word;
        }

        .crm-detail-value a {
          color: #64c8ff;
        }

        .crm-status {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 999px;
          font-size: 0.8rem;
          text-transform: capitalize;
          background: rgba(100, 200, 255, 0.1);
          border: 1px solid rgba(100, 200, 255, 0.3);
          color: #64c8ff;
        }

        .crm-status-customer {
          background: rgba(120, 220, 150, 0.1);
          border-color: rgba(120, 220, 150, 0.3);
          color: #9ee6b0;
        }

        .crm-status-inactive {
          background: rgba(150, 150, 150, 0.1);
          border-color: rgba(150, 150, 150, 0.3);
          color: #999;
        }

        .crm-detail-actions {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid rgba(100, 200, 255, 0.1);
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
        }

        .crm-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(100, 200, 255, 0.3);
        }

        .crm-delete-button {
          background: rgba(255, 100, 100, 0.1);
          border: 1px solid rgba(255, 100, 100, 0.3);
          color: #ff9999;
          padding: 0.75rem 1.5rem;
          border-radius: 6px;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .crm-delete-button:hover {
          background: rgba(255, 100, 100, 0.2);
        }

        .crm-delete-button:disabled {
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
          max-width: 800px;
          margin-left: auto;
          margin-right: auto;
        }

      `}</style>
    </div>
  );
}
