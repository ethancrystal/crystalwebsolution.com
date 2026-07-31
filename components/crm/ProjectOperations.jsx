'use client';

export default function ProjectOperations({ project, assignments = [], canManage = false }) {
  return (
    <div className="crm-project-operations">
      <h2>Operations</h2>
      {!canManage ? (
        <p className="crm-empty-state">Operational controls are not available for this role.</p>
      ) : (
        <div className="crm-operations-body">
          <div className="crm-operations-section">
            <h3>Assignments</h3>
            {assignments.length === 0 ? (
              <p className="crm-empty-state">No assignments yet.</p>
            ) : (
              <ul className="crm-assignment-list">
                {assignments.map((assignment) => (
                  <li key={assignment.id} className="crm-assignment-item">
                    <span className="crm-assignment-user">{assignment.user?.full_name || 'Unassigned'}</span>
                    <span className="crm-assignment-meta">Assigned by: {assignment.assignedBy?.full_name || 'Unknown'}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="crm-operations-section">
            <h3>Lifecycle</h3>
            <p className="crm-operations-note">
              Use the project detail view to manage status transitions, approvals, and deliverables.
            </p>
          </div>
        </div>
      )}

      <style jsx>{`
        .crm-project-operations {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .crm-project-operations h2 {
          margin: 0;
          font-size: 1.15rem;
          color: #64c8ff;
        }

        .crm-operations-body {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .crm-operations-section {
          background: rgba(15, 20, 40, 0.6);
          border: 1px solid rgba(100, 200, 255, 0.1);
          border-radius: 8px;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .crm-operations-section h3 {
          margin: 0;
          color: #e0e0e0;
          font-size: 1rem;
        }

        .crm-assignment-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }

        .crm-assignment-item {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          align-items: center;
          flex-wrap: wrap;
          color: #d0d0d0;
          font-size: 0.95rem;
        }

        .crm-assignment-user {
          font-weight: 600;
          color: #e0e0e0;
        }

        .crm-assignment-meta {
          color: #999;
          font-size: 0.85rem;
        }

        .crm-operations-note {
          margin: 0;
          color: #999;
          font-size: 0.95rem;
        }

        .crm-empty-state {
          color: #999;
          font-size: 0.95rem;
        }
      `}</style>
    </div>
  );
}
