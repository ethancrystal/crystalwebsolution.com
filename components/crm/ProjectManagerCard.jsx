'use client';

// "Your project manager" on the client's project Overview. Name only, never
// an email address (owner rule). `name` comes from getProjectManagerNames
// (migration 0049). When that lookup is unavailable the card is not shown at
// all, so it never claims "being assigned" for a project that has a manager.

function initials(name) {
  return String(name)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export default function ProjectManagerCard({ available, name, onMessage }) {
  if (!available) return null;

  return (
    <section className="crm-card pm-card" aria-labelledby="pm-card-heading">
      <h2 id="pm-card-heading" className="crm-section-title">Your project manager</h2>
      {name ? (
        <div className="pm-card-body">
          <span className="pm-card-avatar" aria-hidden="true">{initials(name)}</span>
          <div className="pm-card-text">
            <strong>{name}</strong>
            <span>Leads your project and answers your messages.</span>
          </div>
          {onMessage && (
            <button type="button" className="crm-button crm-button-small" onClick={onMessage}>
              Message {name.split(/\s+/)[0]}
            </button>
          )}
        </div>
      ) : (
        <p className="pm-card-pending">
          We are assigning your project manager. You will get an email with their name as soon as it is done.
        </p>
      )}

      <style jsx>{`
        .pm-card-body {
          display: flex;
          align-items: center;
          gap: 0.9rem;
          flex-wrap: wrap;
        }
        .pm-card-avatar {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 2.5rem;
          height: 2.5rem;
          border-radius: 50%;
          background: var(--crm-surface-2);
          border: 1px solid var(--crm-border-strong);
          color: var(--crm-text);
          font-weight: 600;
          flex: 0 0 auto;
        }
        .pm-card-text {
          display: grid;
          gap: 0.15rem;
          flex: 1 1 12rem;
          min-width: 0;
        }
        .pm-card-text span,
        .pm-card-pending {
          color: var(--crm-muted);
          font-size: 0.9rem;
          margin: 0;
        }
      `}</style>
    </section>
  );
}
