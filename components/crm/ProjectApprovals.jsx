'use client';

import { useState } from 'react';
import { updateProjectApproval } from '@/app/actions/project-actions';

export default function ProjectApprovals({ approvals = [], canDecide = false, projectId, onChanged }) {
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);

  async function decide(approvalId, status) {
    if (!approvalId || !projectId) return;
    setBusyId(approvalId);
    setError(null);

    try {
      const formData = new FormData();
      formData.set('projectId', projectId);
      formData.set('approvalId', approvalId);
      formData.set('status', status);

      const result = await updateProjectApproval(formData);
      if (!result?.ok) throw new Error(result?.error || 'Unable to update this approval.');

      onChanged?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="crm-project-approvals">
      <h2>Approvals</h2>
      {error && <div className="crm-empty-state crm-approval-error">{error}</div>}
      {approvals.length === 0 ? (
        <p className="crm-empty-state">No approval requests yet.</p>
      ) : (
        <ul className="crm-approval-list">
          {approvals.map((approval) => (
            <li key={approval.id} className="crm-approval-item">
              <div className="crm-approval-main">
                <span className="crm-approval-title">{approval.deliverable_id ? 'Deliverable review' : 'Project approval'}</span>
                <span className={`crm-approval-decision ${approval.status}`}>
                  {approval.status}
                </span>
              </div>
              {approval.note && (
                <p className="crm-approval-comment">{approval.note}</p>
              )}
              <div className="crm-approval-meta">
                <span>Requested by: {approval.requestedBy?.full_name || 'Unknown'}</span>
                <span>Decided by: {approval.reviewedBy?.full_name || 'Pending'}</span>
                <span>{approval.updated_at ? new Date(approval.updated_at).toLocaleString() : 'Awaiting decision'}</span>
              </div>
              {canDecide && approval.status === 'pending' && (
                <div className="crm-approval-actions">
                  <button
                    type="button"
                    className="crm-approval-btn crm-approval-approve"
                    disabled={busyId === approval.id}
                    onClick={() => decide(approval.id, 'approved')}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="crm-approval-btn crm-approval-reject"
                    disabled={busyId === approval.id}
                    onClick={() => decide(approval.id, 'rejected')}
                  >
                    Reject
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <style jsx>{`
        .crm-project-approvals {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .crm-project-approvals h2 {
          margin: 0;
          font-size: 1.15rem;
          color: #64c8ff;
        }

        .crm-approval-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 0.9rem;
        }

        .crm-approval-item {
          background: rgba(15, 20, 40, 0.6);
          border: 1px solid rgba(100, 200, 255, 0.1);
          border-radius: 8px;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .crm-approval-main {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          align-items: center;
          flex-wrap: wrap;
        }

        .crm-approval-title {
          font-weight: 600;
          color: #e0e0e0;
        }

        .crm-approval-decision {
          display: inline-block;
          padding: 0.2rem 0.65rem;
          border-radius: 999px;
          font-size: 0.8rem;
          border: 1px solid rgba(100, 200, 255, 0.25);
          background: rgba(100, 200, 255, 0.1);
          color: #64c8ff;
        }

        .crm-approval-decision.approved {
          background: rgba(100, 255, 150, 0.1);
          border-color: rgba(100, 255, 150, 0.35);
          color: #86ffb2;
        }

        .crm-approval-decision.changes_requested {
          background: rgba(255, 200, 100, 0.1);
          border-color: rgba(255, 200, 100, 0.35);
          color: #ffd08a;
        }

        .crm-approval-decision.rejected {
          background: rgba(255, 100, 100, 0.1);
          border-color: rgba(255, 100, 100, 0.35);
          color: #ff9999;
        }

        .crm-approval-comment {
          margin: 0;
          color: #ccc;
          white-space: pre-wrap;
          line-height: 1.55;
          font-size: 0.95rem;
        }

        .crm-approval-meta {
          display: flex;
          gap: 1rem;
          color: #999;
          font-size: 0.85rem;
          flex-wrap: wrap;
        }

        .crm-approval-actions {
          display: flex;
          gap: 0.75rem;
          margin-top: 0.25rem;
        }

        .crm-approval-btn {
          border: 1px solid;
          border-radius: 6px;
          padding: 0.4rem 1rem;
          font-weight: 600;
          font-size: 0.85rem;
          cursor: pointer;
          font-family: inherit;
        }

        .crm-approval-approve {
          background: rgba(100, 255, 150, 0.1);
          border-color: rgba(100, 255, 150, 0.35);
          color: #86ffb2;
        }

        .crm-approval-reject {
          background: rgba(255, 100, 100, 0.1);
          border-color: rgba(255, 100, 100, 0.35);
          color: #ff9999;
        }

        .crm-approval-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .crm-approval-error {
          color: #ff9999;
        }

        .crm-empty-state {
          color: #999;
          font-size: 0.95rem;
        }
      `}</style>
    </div>
  );
}
