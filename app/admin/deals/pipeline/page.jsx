'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/browser';
import { projectTypeLabel } from '@/lib/projectTypes';
import { useUserRole } from '@/lib/useUserRole';

const STAGES = [
  { key: 'prospecting', label: 'Prospecting' },
  { key: 'qualification', label: 'Qualification' },
  { key: 'proposal', label: 'Proposal' },
  { key: 'negotiation', label: 'Negotiation' },
  { key: 'closed_won', label: 'Closed Won' },
  { key: 'closed_lost', label: 'Closed Lost' },
];

const STAGE_KEYS = STAGES.map((s) => s.key);

function formatValue(value) {
  const num = Number(value);
  if (!value || Number.isNaN(num)) return '-';
  return num.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function normalizeStage(stage) {
  return STAGE_KEYS.includes(stage) ? stage : 'prospecting';
}

export default function DealsPipelinePage() {
  const { isAdmin, isPm } = useUserRole();
  const [deals, setDeals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

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

  async function handleStageChange(dealId, newStage) {
    setError(null);
    const previousDeals = deals;
    const previousDeal = deals.find((d) => d.id === dealId);
    if (!previousDeal) return;

    // Optimistic update
    setDeals((prev) => prev.map((d) => (d.id === dealId ? { ...d, stage: newStage } : d)));
    setUpdatingId(dealId);

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('deals')
        .update({ stage: newStage })
        .eq('id', dealId)
        .select();

      if (error) throw error;

      // RLS can silently match zero rows on a permission mismatch:
      // that comes back as success with an empty array, not an error.
      if (!data || data.length === 0) {
        throw new Error('Deal was not updated. You may not have permission to move it.');
      }
    } catch (err) {
      setDeals(previousDeals);
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="crm-admin-page">
        <div className="crm-loading">Loading...</div>
      </div>
    );
  }

  const dealsByStage = STAGE_KEYS.reduce((acc, key) => {
    acc[key] = [];
    return acc;
  }, {});

  deals.forEach((deal) => {
    const key = normalizeStage(deal.stage);
    dealsByStage[key].push(deal);
  });

  return (
    <div className="crm-admin-page">
      <header className="crm-admin-header">
        <h1>{isPm ? 'My Pipeline' : 'Deals Pipeline'}</h1>
        <div className="crm-header-actions">
          <Link href="/admin/deals" className="crm-link">
            List View
          </Link>
          {isAdmin && (
            <Link href="/admin/deals/new" className="crm-button">
              Add Deal
            </Link>
          )}
        </div>
      </header>

      {error && <div className="crm-error">{error}</div>}

      <div className="crm-pipeline-scroll">
        {STAGES.map((stage) => (
          <div className="crm-pipeline-column" key={stage.key}>
            <div className="crm-column-header">
              <h2>{stage.label}</h2>
              <span className="crm-column-count">{dealsByStage[stage.key].length}</span>
            </div>

            <div className="crm-column-body">
              {dealsByStage[stage.key].length > 0 ? (
                dealsByStage[stage.key].map((deal) => (
                  <div className="crm-deal-card" key={deal.id}>
                    <div className="crm-deal-title">{deal.title}</div>
                    <div className="crm-deal-company">{deal.companies?.name || '-'}</div>
                    {deal.project_type && (
                      <div className="crm-deal-type">{projectTypeLabel(deal.project_type)}</div>
                    )}
                    <div className="crm-deal-meta">
                      <span className="crm-deal-value">{formatValue(deal.value)}</span>
                      <span className="crm-deal-probability">{deal.probability ?? 0}%</span>
                    </div>
                    <select
                      className="crm-deal-stage-select"
                      value={normalizeStage(deal.stage)}
                      disabled={updatingId === deal.id}
                      onChange={(e) => handleStageChange(deal.id, e.target.value)}
                    >
                      {STAGES.map((s) => (
                        <option key={s.key} value={s.key}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))
              ) : (
                <div className="crm-column-empty">No deals</div>
              )}
            </div>
          </div>
        ))}
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
          max-width: 1600px;
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
          border: none;
          cursor: pointer;
          font-size: 1rem;
        }

        .crm-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(100, 200, 255, 0.3);
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

        .crm-error {
          background: rgba(255, 100, 100, 0.1);
          border: 1px solid rgba(255, 100, 100, 0.3);
          color: #ff9999;
          padding: 1rem;
          border-radius: 6px;
          margin-bottom: 1rem;
          max-width: 1600px;
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

        .crm-pipeline-scroll {
          display: flex;
          gap: 1.25rem;
          overflow-x: auto;
          max-width: 1600px;
          margin-left: auto;
          margin-right: auto;
          padding-bottom: 1rem;
        }

        .crm-pipeline-column {
          flex: 0 0 280px;
          width: 280px;
          background: rgba(30, 35, 60, 0.8);
          border: 1px solid rgba(100, 200, 255, 0.2);
          border-radius: 12px;
          backdrop-filter: blur(10px);
          display: flex;
          flex-direction: column;
          max-height: calc(100vh - 12rem);
        }

        .crm-column-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem;
          border-bottom: 1px solid rgba(100, 200, 255, 0.2);
        }

        .crm-column-header h2 {
          font-size: 1rem;
          color: #64c8ff;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .crm-column-count {
          background: rgba(100, 200, 255, 0.1);
          border: 1px solid rgba(100, 200, 255, 0.3);
          color: #64c8ff;
          font-size: 0.8rem;
          padding: 0.15rem 0.6rem;
          border-radius: 999px;
        }

        .crm-column-body {
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          overflow-y: auto;
        }

        .crm-column-empty {
          color: #999;
          font-size: 0.85rem;
          text-align: center;
          padding: 1.5rem 0;
        }

        .crm-deal-card {
          background: rgba(15, 20, 40, 0.6);
          border: 1px solid rgba(100, 200, 255, 0.15);
          border-radius: 8px;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          transition: border-color 0.2s ease;
        }

        .crm-deal-card:hover {
          border-color: rgba(100, 200, 255, 0.4);
        }

        .crm-deal-title {
          color: #e0e0e0;
          font-weight: 600;
        }

        .crm-deal-company {
          color: #999;
          font-size: 0.85rem;
        }

        .crm-deal-type {
          display: inline-block;
          align-self: flex-start;
          background: rgba(167, 139, 250, 0.12);
          border: 1px solid rgba(167, 139, 250, 0.4);
          color: #c4b5fd;
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.15rem 0.6rem;
          border-radius: 999px;
        }

        .crm-deal-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.9rem;
        }

        .crm-deal-value {
          color: #9ee6b0;
          font-weight: 600;
        }

        .crm-deal-probability {
          color: #64c8ff;
        }

        .crm-deal-stage-select {
          background: rgba(30, 35, 60, 0.8);
          border: 1px solid rgba(100, 200, 255, 0.2);
          border-radius: 6px;
          padding: 0.5rem;
          color: #e0e0e0;
          font-size: 0.85rem;
          font-family: inherit;
        }

        .crm-deal-stage-select:focus {
          outline: none;
          border-color: rgba(100, 200, 255, 0.6);
        }

        .crm-deal-stage-select:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
