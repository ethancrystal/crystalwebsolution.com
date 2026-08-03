'use client';

// Shimmering placeholder block, sized to approximate the real content that
// will replace it. Prefer this over Spinner.jsx wherever the eventual
// content has a predictable shape (a table row, a card, a label/value
// pair) - it reads as "this is what's loading," not just "something is."
export function Skeleton({ width = '100%', height = '1rem', radius = '6px', style }) {
  return (
    <span
      className="crm-skeleton"
      style={{ width, height, borderRadius: radius, ...style }}
      aria-hidden="true"
    >
      <style jsx>{`
        .crm-skeleton {
          display: block;
          background: linear-gradient(
            90deg,
            rgba(100, 200, 255, 0.08) 25%,
            rgba(100, 200, 255, 0.18) 37%,
            rgba(100, 200, 255, 0.08) 63%
          );
          background-size: 400% 100%;
          animation: crm-shimmer 1.4s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .crm-skeleton {
            animation: none !important;
            background: rgba(100, 200, 255, 0.1);
          }
        }

        @keyframes crm-shimmer {
          0% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
      `}</style>
    </span>
  );
}

// A skeleton table matching a list page's real header, for the initial
// load of companies/contacts/deals/tasks/users/projects-style pages.
export function SkeletonTable({ columns = 4, rows = 5 }) {
  return (
    <div className="crm-skeleton-table" aria-label="Loading table" role="status">
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div className="crm-skeleton-row" key={rowIndex}>
          {Array.from({ length: columns }, (_, colIndex) => (
            <Skeleton
              key={colIndex}
              width={colIndex === 0 ? '70%' : `${45 + ((rowIndex * 13 + colIndex * 7) % 40)}%`}
              height="0.95rem"
            />
          ))}
        </div>
      ))}
      <style jsx>{`
        .crm-skeleton-table {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .crm-skeleton-row {
          display: grid;
          grid-template-columns: repeat(${columns}, 1fr);
          gap: 1.5rem;
          align-items: center;
          background: rgba(15, 20, 40, 0.6);
          border: 1px solid rgba(100, 200, 255, 0.1);
          border-radius: 8px;
          padding: 1rem;
        }
      `}</style>
    </div>
  );
}

// A skeleton for a single-record detail/edit view: a title bar plus a
// handful of label/value field rows.
export function SkeletonDetail({ fields = 5 }) {
  return (
    <div className="crm-skeleton-detail" aria-label="Loading" role="status">
      <Skeleton width="40%" height="1.75rem" />
      <div className="crm-skeleton-fields">
        {Array.from({ length: fields }, (_, index) => (
          <div className="crm-skeleton-field" key={index}>
            <Skeleton width="30%" height="0.75rem" />
            <Skeleton width="80%" height="1.1rem" />
          </div>
        ))}
      </div>
      <style jsx>{`
        .crm-skeleton-detail {
          display: flex;
          flex-direction: column;
          gap: 1.75rem;
          max-width: 800px;
          margin: 0 auto;
        }

        .crm-skeleton-fields {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1.5rem;
        }

        .crm-skeleton-field {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
      `}</style>
    </div>
  );
}
