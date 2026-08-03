'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/browser';
import ProjectThread from '@/components/crm/ProjectThread';
import NotesPanel from '@/components/crm/NotesPanel';
import { useUserRole } from '@/lib/useUserRole';
import { projectTypeLabel } from '@/lib/projectTypes';

const STAGE_LABELS = {
  prospecting: 'Prospecting',
  qualification: 'Qualification',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  closed_won: 'Closed Won',
  closed_lost: 'Closed Lost',
};

const STAGE_COLORS = {
  prospecting: { color: '#64c8ff', bg: 'rgba(100, 200, 255, 0.12)', border: 'rgba(100, 200, 255, 0.4)' },
  qualification: { color: '#a78bfa', bg: 'rgba(167, 139, 250, 0.12)', border: 'rgba(167, 139, 250, 0.4)' },
  proposal: { color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.12)', border: 'rgba(251, 191, 36, 0.4)' },
  negotiation: { color: '#fb923c', bg: 'rgba(251, 146, 60, 0.12)', border: 'rgba(251, 146, 60, 0.4)' },
  closed_won: { color: '#4ade80', bg: 'rgba(74, 222, 128, 0.12)', border: 'rgba(74, 222, 128, 0.4)' },
  closed_lost: { color: '#ff9999', bg: 'rgba(255, 100, 100, 0.12)', border: 'rgba(255, 100, 100, 0.4)' },
};

function formatCurrency(value) {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatDateTime(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('en-US');
}

export default function DealDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;
  const { isAdmin } = useUserRole();

  const [deal, setDeal] = useState(null);
  const [ownerName, setOwnerName] = useState(null);
  const [linkedProjectId, setLinkedProjectId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function loadDeal() {
      try {
        const supabase = createClient();

        const { data, error } = await supabase
          .from('deals')
          .select('*, companies(name), contacts(first_name, last_name)')
          .eq('id', id)
          .single();

        if (error) throw error;
        setDeal(data);

        if (data?.owner_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', data.owner_id)
            .single();
          setOwnerName(profile?.full_name || null);
        }

        // A deal converts into at most one project (projects.source_deal_id
        // is unique). Conversation/notes only make sense once that project
        // exists, so look it up rather than passing the deal's own id.
        const { data: linkedProject } = await supabase
          .from('projects')
          .select('id')
          .eq('source_deal_id', id)
          .maybeSingle();
        setLinkedProjectId(linkedProject?.id || null);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    if (id) loadDeal();
  }, [id]);

  async function handleDelete() {
    if (!window.confirm('Delete this deal? This cannot be undone.')) return;

    setIsDeleting(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from('deals').delete().eq('id', id).select();
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('Delete was blocked — no policy permits removing this deal.');
      }
      router.push('/admin/deals');
    } catch (err) {
      setError(err.message);
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="crm-admin-page">
        <div className="crm-loading">Loading...</div>
      </div>
    );
  }

  if (error && !deal) {
    return (
      <div className="crm-admin-page">
        <div className="crm-error">{error}</div>
        <Link href="/admin/deals" className="crm-link">
          Back to Deals
        </Link>
        <style jsx>{`
          .crm-admin-page {
            min-height: 100vh;
            background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%);
            color: #e0e0e0;
            padding: 2rem;
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
          .crm-link {
            color: #64c8ff;
            text-decoration: none;
            display: block;
            max-width: 700px;
            margin: 0 auto;
          }
        `}</style>
      </div>
    );
  }

  const stagePalette = STAGE_COLORS[deal.stage] || STAGE_COLORS.prospecting;
  const contactName = deal.contacts
    ? `${deal.contacts.first_name} ${deal.contacts.last_name}`
    : '-';

  return (
    <div className="crm-admin-page">
      <header className="crm-admin-header">
        <h1>{deal.title}</h1>
        <Link href="/admin/deals" className="crm-link">
          Back to Deals
        </Link>
      </header>

      {error && <div className="crm-error">{error}</div>}

      <div className="crm-detail-card">
        <div className="crm-detail-grid">
          <div className="crm-detail-field">
            <span className="crm-detail-label">Company</span>
            <span className="crm-detail-value">{deal.companies?.name || '-'}</span>
          </div>

          <div className="crm-detail-field">
            <span className="crm-detail-label">Contact</span>
            <span className="crm-detail-value">{contactName}</span>
          </div>

          <div className="crm-detail-field">
            <span className="crm-detail-label">Value</span>
            <span className="crm-detail-value">{formatCurrency(deal.value)}</span>
          </div>

          <div className="crm-detail-field">
            <span className="crm-detail-label">Stage</span>
            <span
              className="crm-badge"
              style={{
                color: stagePalette.color,
                background: stagePalette.bg,
                borderColor: stagePalette.border,
              }}
            >
              {STAGE_LABELS[deal.stage] || deal.stage}
            </span>
          </div>

          <div className="crm-detail-field">
            <span className="crm-detail-label">Probability</span>
            <span className="crm-detail-value">{deal.probability ?? 0}%</span>
          </div>

          <div className="crm-detail-field">
            <span className="crm-detail-label">Project Type</span>
            <span className="crm-detail-value">
              {deal.project_type ? projectTypeLabel(deal.project_type) : '-'}
            </span>
          </div>

          <div className="crm-detail-field">
            <span className="crm-detail-label">Expected Close Date</span>
            <span className="crm-detail-value">{formatDate(deal.expected_close_date)}</span>
          </div>

          <div className="crm-detail-field">
            <span className="crm-detail-label">Owner</span>
            <span className="crm-detail-value">{ownerName || '—'}</span>
          </div>

          <div className="crm-detail-field">
            <span className="crm-detail-label">Created</span>
            <span className="crm-detail-value">{formatDateTime(deal.created_at)}</span>
          </div>

          <div className="crm-detail-field">
            <span className="crm-detail-label">Last Updated</span>
            <span className="crm-detail-value">{formatDateTime(deal.updated_at)}</span>
          </div>
        </div>

        <div className="crm-detail-field crm-detail-full">
          <span className="crm-detail-label">Description</span>
          <span className="crm-detail-value crm-description">
            {deal.description || '-'}
          </span>
        </div>

        <div className="crm-detail-actions">
          <Link href={`/admin/deals/${id}/edit`} className="crm-button">
            Edit
          </Link>
          <Link href="/admin/deals" className="crm-button-secondary">
            Back
          </Link>
          {isAdmin && (
            <button
              type="button"
              className="crm-button-danger"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete Deal'}
            </button>
          )}
        </div>
      </div>

      {linkedProjectId ? (
        <>
          <div className="crm-thread-wrap">
            <NotesPanel projectId={linkedProjectId} />
          </div>

          <div className="crm-thread-wrap">
            <ProjectThread projectId={linkedProjectId} role="admin" />
          </div>
        </>
      ) : (
        <div className="crm-thread-wrap crm-no-project">
          <p>This deal hasn&apos;t become a project yet — its conversation and notes open here once it does.</p>
        </div>
      )}

      <style jsx>{`
        .crm-admin-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%);
          color: #e0e0e0;
          font-family: inherit;
          padding: 2rem;
        }

        .crm-thread-wrap {
          max-width: 800px;
          margin: 1.5rem auto 0;
        }

        .crm-no-project {
          background: rgba(30, 35, 60, 0.8);
          border: 1px solid rgba(100, 200, 255, 0.15);
          border-radius: 12px;
          padding: 1.5rem;
          color: #999;
          font-size: 0.9rem;
          backdrop-filter: blur(10px);
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

        .crm-detail-card {
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
          margin-bottom: 1.5rem;
        }

        .crm-detail-field {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .crm-detail-full {
          margin-bottom: 2rem;
        }

        .crm-detail-label {
          color: #999;
          font-size: 0.8rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .crm-detail-value {
          color: #e0e0e0;
          font-size: 1.05rem;
        }

        .crm-description {
          white-space: pre-wrap;
          line-height: 1.6;
          color: #ccc;
        }

        .crm-badge {
          display: inline-block;
          padding: 0.3rem 0.75rem;
          border-radius: 999px;
          border: 1px solid;
          font-size: 0.85rem;
          font-weight: 600;
          width: fit-content;
        }

        .crm-detail-actions {
          display: flex;
          gap: 1rem;
          border-top: 1px solid rgba(100, 200, 255, 0.1);
          padding-top: 1.5rem;
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

        .crm-button-danger {
          background: rgba(255, 100, 100, 0.1);
          border: 1px solid rgba(255, 100, 100, 0.3);
          color: #ff9999;
          padding: 0.75rem 1.5rem;
          border-radius: 6px;
          font-weight: 600;
          font-size: 1rem;
          transition: all 0.2s ease;
          cursor: pointer;
          margin-left: auto;
        }

        .crm-button-danger:hover {
          background: rgba(255, 100, 100, 0.2);
        }

        .crm-button-danger:disabled {
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
