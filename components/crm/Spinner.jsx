'use client';

const SIZES = { sm: 16, md: 24, lg: 40 };

// Small circular loading indicator for in-place/short waits: page loads,
// button submits, inline actions. For list/table/card content, prefer
// Skeleton.jsx instead - it communicates what's arriving, not just that
// something is.
export default function Spinner({ size = 'md', label = 'Loading', inline = false }) {
  const dimension = SIZES[size] ?? SIZES.md;

  return (
    <span
      className={`crm-spinner${inline ? ' crm-spinner-inline' : ''}`}
      role="status"
      aria-label={label}
      style={{ width: dimension, height: dimension }}
    >
      <span className="crm-spinner-ring" />
      <style jsx>{`
        .crm-spinner {
          display: inline-flex;
          flex-shrink: 0;
        }

        .crm-spinner-inline {
          margin-right: 0.5rem;
          vertical-align: -0.2em;
        }

        .crm-spinner-ring {
          box-sizing: border-box;
          display: block;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          border: 2px solid rgba(100, 200, 255, 0.2);
          border-top-color: #64c8ff;
          animation: crm-spin 0.7s linear infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .crm-spinner-ring {
            animation: none !important;
            opacity: 0.85;
          }
        }

        @keyframes crm-spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </span>
  );
}

// Full-page/section centered spinner with an optional message - the
// standard replacement for the old bare "Loading..." text blocks.
export function LoadingState({ label = 'Loading...' }) {
  return (
    <div className="crm-loading-state">
      <Spinner size="lg" label={label} />
      <p>{label}</p>
      <style jsx>{`
        .crm-loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          min-height: 40vh;
          color: #999;
          font-size: 1rem;
        }
      `}</style>
    </div>
  );
}
