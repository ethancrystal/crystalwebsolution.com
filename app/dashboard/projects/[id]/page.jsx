'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/browser';
import ProjectThread from '@/components/crm/ProjectThread';

const STATUS_STEPS = [
  { key: 'brief_submitted', label: 'Brief Submitted' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'in_review', label: 'In Review' },
  { key: 'delivered', label: 'Delivered' },
];

const STATUS_KEYS = STATUS_STEPS.map((s) => s.key);

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// Client-facing project detail page: the delivery-journey counterpart to
// the staff-facing app/admin/deals/[id]/page.jsx. Shows the same deal row
// but as project_status (brief -> in progress -> review -> delivered)
// rather than the internal sales `stage`, plus the assigned project
// manager (deals.owner_id) and the shared ProjectThread. RLS
// (is_company_member(company_id)) already keeps this scoped to the
// client's own company; no extra guard is needed here.
export default function ClientProjectPage() {
  const { id } = useParams();

  const [deal, setDeal] = useState(null);
  const [ownerName, setOwnerName] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadDeal() {
      try {
        const supabase = createClient();

        const { data, error } = await supabase
          .from('deals')
          .select('*, companies(name)')
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
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    if (id) loadDeal();
  }, [id]);

  if (isLoading) {
    return (
      <div className="client-project-page">
        <div className="client-loading">Loading...</div>
      </div>
    );
  }

  if (error || !deal) {
    return (
      <div className="client-project-page">
        <div className="client-error">{error || 'Project not found.'}</div>
        <Link href="/dashboard" className="client-link">
          Back to Dashboard
        </Link>
        <style jsx>{`
          .client-project-page {
            min-height: 100vh;
            background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%);
            color: #e0e0e0;
            font-family: inherit;
            padding: 2rem;
          }
          .client-error {
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
          .client-link {
            color: #64c8ff;
            text-decoration: none;
            display: block;
            max-width: 800px;
            margin: 0 auto;
          }
        `}</style>
      </div>
    );
  }

  const currentStepIndex = STATUS_KEYS.includes(deal.project_status)
    ? STATUS_KEYS.indexOf(deal.project_status)
    : 0;

  return (
    <div className="client-project-page">
      <header className="client-header">
        <h1>{deal.title}</h1>
        <Link href="/dashboard" className="client-link">
          Back to Dashboard
        </Link>
      </header>

      <div className="client-card">
        <div className="client-timeline">
          {STATUS_STEPS.map((step, index) => (
            <div
              key={step.key}
              className={`client-timeline-step ${index <= currentStepIndex ? 'is-done' : ''} ${
                index === currentStepIndex ? 'is-current' : ''
              }`}
            >
              <span className="client-timeline-dot" />
              <span className="client-timeline-label">{step.label}</span>
            </div>
          ))}
        </div>

        <div className="client-detail-grid">
          <div className="client-detail-field">
            <span className="client-detail-label">Project Manager</span>
            <span className="client-detail-value">{ownerName || 'Not yet assigned'}</span>
          </div>

          <div className="client-detail-field">
            <span className="client-detail-label">Target Date</span>
            <span className="client-detail-value">{formatDate(deal.expected_close_date)}</span>
          </div>
        </div>

        {deal.description && (
          <div className="client-detail-field client-detail-full">
            <span className="client-detail-label">Brief</span>
            <span className="client-detail-value client-description">{deal.description}</span>
          </div>
        )}
      </div>

      <div className="client-thread-wrap">
        <ProjectThread dealId={id} />
      </div>

      <style jsx>{`
        .client-project-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%);
          color: #e0e0e0;
          font-family: inherit;
          padding: 2rem;
        }

        .client-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          max-width: 800px;
          margin-left: auto;
          margin-right: auto;
        }

        .client-header h1 {
          font-size: 2rem;
          color: #64c8ff;
        }

        .client-link {
          color: #64c8ff;
          text-decoration: none;
          font-size: 0.9rem;
          transition: color 0.2s ease;
        }

        .client-link:hover {
          color: #5bb8ff;
          text-decoration: underline;
        }

        .client-card {
          background: rgba(30, 35, 60, 0.8);
          border: 1px solid rgba(100, 200, 255, 0.2);
          border-radius: 12px;
          padding: 2rem;
          max-width: 800px;
          margin: 0 auto 1.5rem;
          backdrop-filter: blur(10px);
        }

        .client-timeline {
          display: flex;
          justify-content: space-between;
          margin-bottom: 2rem;
          padding-bottom: 2rem;
          border-bottom: 1px solid rgba(100, 200, 255, 0.1);
        }

        .client-timeline-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          flex: 1;
          position: relative;
        }

        .client-timeline-step:not(:last-child)::after {
          content: '';
          position: absolute;
          top: 0.4rem;
          left: 55%;
          width: 90%;
          height: 2px;
          background: rgba(100, 200, 255, 0.15);
          z-index: 0;
        }

        .client-timeline-step.is-done:not(:last-child)::after {
          background: rgba(100, 200, 255, 0.5);
        }

        .client-timeline-dot {
          width: 1rem;
          height: 1rem;
          border-radius: 50%;
          background: rgba(100, 200, 255, 0.15);
          border: 2px solid rgba(100, 200, 255, 0.3);
          z-index: 1;
        }

        .client-timeline-step.is-done .client-timeline-dot {
          background: rgba(100, 200, 255, 0.4);
          border-color: #64c8ff;
        }

        .client-timeline-step.is-current .client-timeline-dot {
          background: #64c8ff;
          box-shadow: 0 0 0 4px rgba(100, 200, 255, 0.2);
        }

        .client-timeline-label {
          color: #999;
          font-size: 0.78rem;
          text-align: center;
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }

        .client-timeline-step.is-done .client-timeline-label {
          color: #64c8ff;
        }

        .client-detail-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .client-detail-field {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .client-detail-full {
          padding-top: 1.5rem;
          border-top: 1px solid rgba(100, 200, 255, 0.1);
        }

        .client-detail-label {
          color: #999;
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .client-detail-value {
          color: #e0e0e0;
          font-size: 1rem;
        }

        .client-description {
          white-space: pre-wrap;
          line-height: 1.6;
        }

        .client-thread-wrap {
          max-width: 800px;
          margin: 0 auto;
        }

        .client-loading {
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
