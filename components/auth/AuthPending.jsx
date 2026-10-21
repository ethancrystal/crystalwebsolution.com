'use client';

import Spinner from '@/components/crm/Spinner';

// Pending state for auth screens (portal sign-in, portal selection), in the
// CRM spinner's visual language. Two pieces, used together:
//
//   <PendingLabel pending label="Signing in…">Sign In</PendingLabel>
//     button/card content: the idle text, or a spinner beside the pending
//     text. The spinner is decorative; the announcer below speaks for it.
//
//   <PendingAnnouncer pending message="Signing in. Please wait." />
//     an always-mounted polite live region, so the message is read when it
//     appears (a region inserted at the same moment as its text is often
//     skipped by screen readers).
//
// The styles sit beside, not inside, the elements so nothing but the message
// is ever part of the live region's text.

export function PendingLabel({ pending, label, children }) {
  if (!pending) return children;
  return (
    <>
      <span className="auth-pending-label">
        <Spinner size="sm" inline decorative tone="current" />
        {label}
      </span>
      <style jsx>{`
        .auth-pending-label {
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
      `}</style>
    </>
  );
}

export function PendingAnnouncer({ pending, message }) {
  return (
    <>
      <p className="auth-pending-announcer" role="status" aria-live="polite">
        {pending ? message : ''}
      </p>
      <style jsx>{`
        .auth-pending-announcer {
          margin: 0;
          text-align: center;
          color: var(--muted);
          font-size: 0.9rem;
        }
        .auth-pending-announcer:empty {
          display: block;
          height: 0;
        }
      `}</style>
    </>
  );
}
