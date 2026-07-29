'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/browser';
import { projectTypeLabel } from '@/lib/projectTypes';
import { useUserRole } from '@/lib/useUserRole';

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
    maximumFractionDigits: 0,
  }).format(value);
}

function StageBadge({ stage }) {
  const palette = STAGE_COLORS[stage] || STAGE_COLORS.prospecting;
  return (
    <span
      className="crm-badge"
      style={{
        color: palette.color,
        background: palette.bg,
        borderColor: palette.border,
      }}
    >
      {STAGE_LABELS[stage] || stage}
      <style jsx>{`
        .crm-badge {
          display: inline-block;
          padding: 0.3rem 0.75rem;
          border-radius: 999px;
          border: 1px solid;
          font-size: 0.8rem;
          font-weight: 600;
          white-space: nowrap;
        }
      `}</style>
    </span>
  );
}

export default function DealsPage() {
  const { isAdmin, isPm } = useUserRole();
  const [deals, setDeals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadDeals() {
      try {
        const supabase = createClient();

        const { data, error } = await supabase
          .from('deals')
          .select('*, companies(name)')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setDeals(data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    loadDeals();
  }, []);

  if (isLoading) {
    return (
      <div className="crm-admin-page">
        <div className="crm-loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="crm-admin-page">
      <header className="crm-admin-header">
        <h1>{isPm ? 'My Deals' : 'Deals'}</h1>
        <div className="crm-header-actions">
          <Link href="/admin/deals/pipeline" className="crm-link">
            Pipeline View
          </Link>
          {isAdmin && (
            <Link href="/admin/deals/new" className="crm-button">
              Add Deal
            </Link>
          )}
        </div>
      </header>

      {error && <div className="crm-error">{error}</div>}

      <div className="crm-table-container">
        {deals.length > 0 ? (
          <table className="crm-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Company</th>
                <th>Type</th>
                <th>Value</th>
                <th>Stage</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {deals.map((deal) => (
                <tr key={deal.id}>
                  <td>{deal.title}</td>
                  <td>{deal.companies?.name || '-'}</td>
                  <td>{deal.project_type ? projectTypeLabel(deal.project_type) : '-'}</td>
                  <td>{formatCurrency(deal.value)}</td>
                  <td>
                    <StageBadge stage={deal.stage} />
                  </td>
                  <td>
                    <div className="crm-actions">
                      <Link href={`/admin/deals/${deal.id}`} className="crm-link">
                        View
                      </Link>
                      <Link href={`/admin/deals/${deal.id}/edit`} className="crm-link">
                        Edit
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="crm-empty-state">
            <p>No deals yet.</p>
            {isAdmin && (
              <Link href="/admin/deals/new" className="crm-button">
                Create one
              </Link>
            )}
          </div>
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
          max-width: 1200px;
          margin-left: auto;
          margin-right: auto;
        }

        .crm-admin-header h1 {
          font-size: 2rem;
          color: #64c8ff;
        }

        .crm-header-actions {
          display: flex;
          align-items: center;
          gap: 1.5rem;
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

        .crm-table-container {
          background: rgba(30, 35, 60, 0.8);
          border: 1px solid rgba(100, 200, 255, 0.1);
          border-radius: 12px;
          overflow: hidden;
          max-width: 1200px;
          margin-left: auto;
          margin-right: auto;
          backdrop-filter: blur(10px);
        }

        .crm-table {
          width: 100%;
          border-collapse: collapse;
        }

        .crm-table thead {
          background: rgba(15, 20, 40, 0.6);
          border-bottom: 1px solid rgba(100, 200, 255, 0.2);
        }

        .crm-table th {
          padding: 1rem;
          text-align: left;
          font-weight: 600;
          color: #64c8ff;
        }

        .crm-table td {
          padding: 1rem;
          border-top: 1px solid rgba(100, 200, 255, 0.1);
          color: #ccc;
        }

        .crm-table tbody tr:hover {
          background: rgba(100, 200, 255, 0.05);
        }

        .crm-actions {
          display: flex;
          gap: 1rem;
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
          max-width: 1200px;
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
