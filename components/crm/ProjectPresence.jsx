'use client';

// "Also here now" line for a project page, from useProjectLive's viewers.
// Names only. Deliberately not a live region: people coming and going should
// not interrupt a screen reader.

function joinNames(names) {
  if (names.length <= 2) return names.join(' and ');
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}

export default function ProjectPresence({ viewers = [] }) {
  if (viewers.length === 0) return null;
  const names = viewers.map((viewer) => viewer.name);

  return (
    <p className="crm-presence">
      <span className="crm-presence-dot" aria-hidden="true" />
      Also here now: {joinNames(names)}
      <style jsx>{`
        .crm-presence {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          margin: 0;
          color: var(--crm-muted);
          font-size: 0.88rem;
        }
        .crm-presence-dot {
          width: 0.5rem;
          height: 0.5rem;
          border-radius: 50%;
          background: var(--crm-status-success-fg);
          flex: 0 0 auto;
        }
      `}</style>
    </p>
  );
}
