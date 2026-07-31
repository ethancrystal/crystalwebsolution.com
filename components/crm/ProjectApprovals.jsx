'use client';

export default function ProjectApprovals({ approvals = [], canDecide = false }) {
  return (
    <div className="crm-project-approvals">
      <h2>Approvals</h2>
      {approvals.length === 0 ? (
        <p className="crm-empty-state">No approval requests yet.</p>
      ) : (
        <ul className="crm-approval-list">
          {approvals.map((approval) => (
            <li key={approval.id} className="crm-approval-item">
              <div className="crm-approval-main">
                <span className="crm-approval-title">{approval.deliverable?.title || 'Deliverable'}</span>
                <span className={`crm-approval-decision ${approval.decision || 'pending'}`}>
                  {approval.decision || 'Pending'}
                </span>
              </div>
              {approval.comment && (
                <p className="crm-approval-comment">{approval.comment}</p>
              )}
              <div className="crm-approval-meta">
                <span>Requested by: {approval.requestedBy?.full_name || 'Unknown'}</span>
                <span>Decided by: {approval.decidedBy?.full_name || 'Pending'}</span>
                <span>{approval.decided_at ? new Date(approval.decided_at).toLocaleString() : 'Awaiting decision'}</span>
              </div>
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

        .crm-empty-state {
          color: #999;
          font-size: 0.95rem;
        }
      `}</style>
    </div>
  );
}
