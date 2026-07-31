'use client';

function formatWhen(value) {
  if (!value) return '';
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function ProjectTimeline({ history }) {
  const items = Array.isArray(history) ? history : [];

  return (
    <div className="crm-project-timeline">
      <h2>Status History</h2>
      {items.length === 0 ? (
        <p className="crm-empty-state">No status updates yet.</p>
      ) : (
        <ol className="crm-timeline-list">
          {items.map((event) => (
            <li key={event.id} className="crm-timeline-item">
              <div className="crm-timeline-marker" />
              <div className="crm-timeline-content">
                <div className="crm-timeline-title">
                  <span className="crm-timeline-badge">{event.to_status}</span>
                  {event.from_status && (
                    <span className="crm-timeline-from">from {event.from_status}</span>
                  )}
                </div>
                {event.note && <p className="crm-timeline-note">{event.note}</p>}
                <div className="crm-timeline-meta">
                  <span>{event.changedBy?.full_name || 'Unknown'}</span>
                  <span>{formatWhen(event.created_at)}</span>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      <style jsx>{`
        .crm-project-timeline {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .crm-project-timeline h2 {
          margin: 0;
          font-size: 1.15rem;
          color: #64c8ff;
        }

        .crm-timeline-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .crm-timeline-item {
          position: relative;
          display: flex;
          gap: 1rem;
          padding-left: 0.25rem;
        }

        .crm-timeline-marker {
          position: relative;
          width: 0.75rem;
          height: 0.75rem;
          margin-top: 0.35rem;
          border-radius: 50%;
          background: #64c8ff;
          box-shadow: 0 0 0 4px rgba(100, 200, 255, 0.15);
          flex-shrink: 0;
        }

        .crm-timeline-content {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .crm-timeline-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .crm-timeline-badge {
          display: inline-block;
          background: rgba(100, 200, 255, 0.1);
          border: 1px solid rgba(100, 200, 255, 0.35);
          color: #64c8ff;
          padding: 0.2rem 0.65rem;
          border-radius: 999px;
          font-size: 0.8rem;
        }

        .crm-timeline-from {
          color: #999;
          font-size: 0.85rem;
        }

        .crm-timeline-note {
          margin: 0;
          color: #ccc;
          white-space: pre-wrap;
          line-height: 1.55;
          font-size: 0.95rem;
        }

        .crm-timeline-meta {
          display: flex;
          gap: 1rem;
          color: #999;
          font-size: 0.8rem;
        }

        .crm-empty-state {
          color: #999;
          font-size: 0.95rem;
        }
      `}</style>
    </div>
  );
}
