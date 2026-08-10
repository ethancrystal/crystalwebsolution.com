'use client';

import Link from 'next/link';

export default function ProjectOverview({ project }) {
  if (!project) {
    return (
      <div className="crm-project-overview">
        <p className="crm-empty-state">Project not found.</p>
      </div>
    );
  }

  return (
    <div className="crm-project-overview">
      <div className="crm-overview-header">
        <div>
          <h2>{project.title}</h2>
          <span className="crm-project-status">{project.status}</span>
        </div>
        <Link href="/dashboard" className="crm-link-secondary">
          Back to Dashboard
        </Link>
      </div>

      <div className="crm-overview-grid">
        <div className="crm-overview-item">
          <span className="crm-overview-label">Category</span>
          <span className="crm-overview-value">{project.category || '-'}</span>
        </div>
        <div className="crm-overview-item">
          <span className="crm-overview-label">Status</span>
          <span className="crm-overview-value">{project.status || '-'}</span>
        </div>
        <div className="crm-overview-item">
          <span className="crm-overview-label">Target Date</span>
          <span className="crm-overview-value">{project.target_date || '-'}</span>
        </div>
        {project.budget_amount != null && (
          <div className="crm-overview-item">
            <span className="crm-overview-label">Budget</span>
            <span className="crm-overview-value">{project.currency} {project.budget_amount}</span>
          </div>
        )}
        <div className="crm-overview-item">
          <span className="crm-overview-label">Created</span>
          <span className="crm-overview-value">
            {project.created_at ? new Date(project.created_at).toLocaleDateString() : '-'}
          </span>
        </div>
      </div>

      {project.brief && (
        <div className="crm-overview-brief">
          <h3>Brief</h3>
          <p>{project.brief}</p>
        </div>
      )}

      <style jsx>{`
        .crm-project-overview {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .crm-empty-state {
          color: #999;
        }

        .crm-overview-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
        }

        .crm-overview-header h2 {
          margin: 0;
          font-size: 1.4rem;
          color: #64c8ff;
        }

        .crm-project-status {
          display: inline-block;
          margin-top: 0.4rem;
          background: rgba(100, 200, 255, 0.1);
          border: 1px solid rgba(100, 200, 255, 0.3);
          color: #64c8ff;
          padding: 0.25rem 0.75rem;
          border-radius: 999px;
          font-size: 0.8rem;
        }

        .crm-link-secondary {
          color: #64c8ff;
          text-decoration: none;
          font-size: 0.9rem;
        }

        .crm-link-secondary:hover {
          text-decoration: underline;
        }

        .crm-overview-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 1rem;
        }

        .crm-overview-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          background: rgba(15, 20, 40, 0.6);
          border: 1px solid rgba(100, 200, 255, 0.1);
          border-radius: 8px;
          padding: 1rem;
        }

        .crm-overview-label {
          color: #999;
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .crm-overview-value {
          color: #e0e0e0;
          font-size: 1rem;
          word-break: break-word;
        }

        .crm-overview-brief {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          background: rgba(15, 20, 40, 0.6);
          border: 1px solid rgba(100, 200, 255, 0.1);
          border-radius: 8px;
          padding: 1rem;
        }

        .crm-overview-brief h3 {
          margin: 0;
          color: #64c8ff;
          font-size: 1rem;
        }

        .crm-overview-brief p {
          margin: 0;
          color: #d0d0d0;
          white-space: pre-wrap;
          line-height: 1.6;
        }

        @media (max-width: 768px) {
          .crm-overview-header {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
}
