'use client';

export default function ProjectTasks({ tasks = [], readOnly = false }) {
  return (
    <div className="crm-project-tasks">
      <h2>Tasks</h2>
      {tasks.length === 0 ? (
        <p className="crm-empty-state">No tasks yet.</p>
      ) : (
        <ul className="crm-task-list">
          {tasks.map((task) => (
            <li key={task.id} className="crm-task-item">
              <div className="crm-task-main">
                <span className="crm-task-title">{task.title}</span>
                <span className="crm-task-status">{task.status}</span>
              </div>
              {task.description && (
                <p className="crm-task-description">{task.description}</p>
              )}
              <div className="crm-task-meta">
                <span>Priority: {task.priority || '-'}</span>
                <span>Due: {task.due_at ? new Date(task.due_at).toLocaleDateString() : '-'}</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <style jsx>{`
        .crm-project-tasks {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .crm-project-tasks h2 {
          margin: 0;
          font-size: 1.15rem;
          color: #64c8ff;
        }

        .crm-task-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 0.9rem;
        }

        .crm-task-item {
          background: rgba(15, 20, 40, 0.6);
          border: 1px solid rgba(100, 200, 255, 0.1);
          border-radius: 8px;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .crm-task-main {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          align-items: center;
          flex-wrap: wrap;
        }

        .crm-task-title {
          font-weight: 600;
          color: #e0e0e0;
        }

        .crm-task-status {
          display: inline-block;
          background: rgba(100, 200, 255, 0.1);
          border: 1px solid rgba(100, 200, 255, 0.25);
          color: #64c8ff;
          padding: 0.2rem 0.65rem;
          border-radius: 999px;
          font-size: 0.8rem;
        }

        .crm-task-description {
          margin: 0;
          color: #ccc;
          white-space: pre-wrap;
          line-height: 1.55;
          font-size: 0.95rem;
        }

        .crm-task-meta {
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
