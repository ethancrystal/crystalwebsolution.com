'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/browser';
import { projectTypeLabel } from '@/lib/projectTypes';
import { useUserRole } from '@/lib/useUserRole';
import { SkeletonTable } from '@/components/crm/Skeleton';
import {
  ADMIN_PAGE,
  ADMIN_HEADER,
  ADMIN_HEADER_TITLE,
  BUTTON,
  TABLE_CONTAINER,
  TABLE,
  TABLE_HEAD,
  TABLE_TH,
  TABLE_TD,
  TABLE_ROW_HOVER,
  ACTIONS,
  LINK,
  EMPTY_STATE,
  EMPTY_STATE_P,
  ERROR,
} from '@/lib/crm/adminPageStyles';

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
      className="tw:inline-block tw:whitespace-nowrap tw:rounded-full tw:border tw:px-3 tw:py-[0.3rem] tw:text-[0.8rem] tw:font-semibold"
      style={{
        color: palette.color,
        background: palette.bg,
        borderColor: palette.border,
      }}
    >
      {STAGE_LABELS[stage] || stage}
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
      <div className={ADMIN_PAGE}>
        <SkeletonTable columns={6} />
      </div>
    );
  }

  return (
    <div className={ADMIN_PAGE}>
      <header className={ADMIN_HEADER}>
        <h1 className={ADMIN_HEADER_TITLE}>{isPm ? 'My Deals' : 'Deals'}</h1>
        <div className="tw:flex tw:items-center tw:gap-6">
          <Link href="/admin/deals/pipeline" className={LINK}>
            Pipeline View
          </Link>
          {isAdmin && (
            <Link href="/admin/deals/new" className={BUTTON}>
              Add Deal
            </Link>
          )}
        </div>
      </header>

      {error && <div className={ERROR}>{error}</div>}

      <div className={TABLE_CONTAINER}>
        {deals.length > 0 ? (
          <table className={TABLE}>
            <thead className={TABLE_HEAD}>
              <tr>
                <th className={TABLE_TH}>Title</th>
                <th className={TABLE_TH}>Company</th>
                <th className={TABLE_TH}>Type</th>
                <th className={TABLE_TH}>Value</th>
                <th className={TABLE_TH}>Stage</th>
                <th className={TABLE_TH}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {deals.map((deal) => (
                <tr key={deal.id} className={TABLE_ROW_HOVER}>
                  <td className={TABLE_TD}>{deal.title}</td>
                  <td className={TABLE_TD}>{deal.companies?.name || '-'}</td>
                  <td className={TABLE_TD}>{deal.project_type ? projectTypeLabel(deal.project_type) : '-'}</td>
                  <td className={TABLE_TD}>{formatCurrency(deal.value)}</td>
                  <td className={TABLE_TD}>
                    <StageBadge stage={deal.stage} />
                  </td>
                  <td className={TABLE_TD}>
                    <div className={ACTIONS}>
                      <Link href={`/admin/deals/${deal.id}`} className={LINK}>
                        View
                      </Link>
                      <Link href={`/admin/deals/${deal.id}/edit`} className={LINK}>
                        Edit
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className={EMPTY_STATE}>
            <p className={EMPTY_STATE_P}>No deals yet.</p>
            {isAdmin && (
              <Link href="/admin/deals/new" className={BUTTON}>
                Create one
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
