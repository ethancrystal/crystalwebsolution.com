'use client';

import Link from 'next/link';
import { SkeletonDetail } from './Skeleton';

// Shared page chrome for the /admin/<entity>/new and /admin/<entity>/[id]/edit
// forms: page background, header + back link, error banner, the form card,
// and the styled-jsx rules for the field/button classes the entity pages
// render inside it.
//
// History: Phase 3 of docs/plans/refactor-architecture-cleanup-2.md extracted
// this shell with two `variant`s because the four entities had drifted into
// two chrome families (companies/deals: 700px card; contacts/tasks: 800px
// container, different label weight, focus colour, cancel control). The
// owner chose to unify them on 2026-09-03 (docs/plans/
// audit-followups-crm-hardening-3.md Task 6): one 800px frame, one set of
// field rules. Both selector families the pages already use (.crm-field* and
// .crm-form*) are kept and styled identically so no page markup had to
// change; the two cancel controls (.crm-button-secondary, .crm-cancel-link)
// likewise both remain.
//
// Field rules are emitted with :global() under .crm-admin-form because
// styled-jsx only scopes selectors to elements rendered by *this* component;
// the entity pages render their own <input className="crm-field">, so the
// rules have to reach descendants. The wrapper class is the namespace, so
// nothing outside this shell picks them up.
export default function AdminFormShell({
  title,
  backHref,
  backLabel,
  error,
  loading = false,
  skeletonFields,
  // A load failure with nothing to edit: render only the error banner inside
  // the page wrapper (no header, no card) -- mirrors the deals edit page's
  // pre-Phase-3 `error && !form` branch.
  fatalError = null,
  children,
}) {
  return (
    <div className="crm-admin-page crm-admin-form">
      {loading ? (
        <SkeletonDetail fields={skeletonFields} />
      ) : fatalError ? (
        <div className="crm-error">{fatalError}</div>
      ) : (
        <>
          <header className="crm-admin-header">
            <h1>{title}</h1>
            <Link href={backHref} className="crm-link">
              {backLabel}
            </Link>
          </header>

          {error && <div className="crm-error">{error}</div>}

          <div className="crm-form-card">{children}</div>
        </>
      )}

      <style jsx>{`
        .crm-admin-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%);
          color: #e0e0e0;
          font-family: inherit;
          padding: 2rem;
        }

        .crm-admin-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          margin-left: auto;
          margin-right: auto;
          max-width: 800px;
        }

        .crm-admin-header h1 {
          font-size: 2rem;
          color: #64c8ff;
        }

        .crm-link {
          color: #64c8ff;
          text-decoration: none;
          font-size: 0.9rem;
          transition: color 0.2s ease;
        }

        .crm-link:hover {
          color: #5bb8ff;
          text-decoration: underline;
        }

        .crm-error {
          background: rgba(255, 100, 100, 0.1);
          border: 1px solid rgba(255, 100, 100, 0.3);
          color: #ff9999;
          padding: 1rem;
          border-radius: 6px;
          margin-bottom: 1rem;
          margin-left: auto;
          margin-right: auto;
          max-width: 800px;
        }

        .crm-form-card {
          background: rgba(30, 35, 60, 0.8);
          border: 1px solid rgba(100, 200, 255, 0.2);
          border-radius: 12px;
          padding: 2rem;
          margin-left: auto;
          margin-right: auto;
          max-width: 800px;
          backdrop-filter: blur(10px);
        }
      `}</style>

      <style jsx>{`
        /* ---- field containers: both families, one look ---- */
        :global(.crm-admin-form .crm-form) {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        :global(.crm-admin-form .crm-form-grid) {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1.5rem;
        }

        :global(.crm-admin-form .crm-field-row) {
          display: flex;
          gap: 1.5rem;
        }

        :global(.crm-admin-form .crm-field) {
          margin-bottom: 1.5rem;
          flex: 1;
        }

        :global(.crm-admin-form .crm-field),
        :global(.crm-admin-form .crm-form-row) {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        :global(.crm-admin-form .crm-field label),
        :global(.crm-admin-form .crm-form-row label) {
          color: #999;
          font-size: 0.9rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        :global(.crm-admin-form .crm-field input),
        :global(.crm-admin-form .crm-field select),
        :global(.crm-admin-form .crm-field textarea),
        :global(.crm-admin-form .crm-form-row input),
        :global(.crm-admin-form .crm-form-row select),
        :global(.crm-admin-form .crm-form-row textarea) {
          background: rgba(15, 20, 40, 0.6);
          border: 1px solid rgba(100, 200, 255, 0.2);
          border-radius: 6px;
          color: #e0e0e0;
          padding: 0.75rem 1rem;
          font-size: 1rem;
          font-family: inherit;
        }

        :global(.crm-admin-form .crm-field input:focus),
        :global(.crm-admin-form .crm-field select:focus),
        :global(.crm-admin-form .crm-field textarea:focus),
        :global(.crm-admin-form .crm-form-row input:focus),
        :global(.crm-admin-form .crm-form-row select:focus),
        :global(.crm-admin-form .crm-form-row textarea:focus) {
          outline: none;
          border-color: #64c8ff;
        }

        :global(.crm-admin-form .crm-field select:disabled),
        :global(.crm-admin-form .crm-form-row select:disabled) {
          opacity: 0.5;
          cursor: not-allowed;
        }

        :global(.crm-admin-form .crm-field textarea),
        :global(.crm-admin-form .crm-form-row textarea) {
          resize: vertical;
          min-height: 100px;
        }

        /* ---- actions ---- */
        :global(.crm-admin-form .crm-form-actions) {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          margin-top: 2rem;
        }

        :global(.crm-admin-form .crm-button) {
          background: linear-gradient(135deg, #64c8ff 0%, #5bb8ff 100%);
          color: #0a0e27;
          padding: 0.75rem 1.5rem;
          border-radius: 6px;
          border: none;
          text-decoration: none;
          font-weight: 600;
          font-size: 1rem;
          transition: all 0.2s ease;
          cursor: pointer;
          display: inline-block;
        }

        :global(.crm-admin-form .crm-button:hover) {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(100, 200, 255, 0.3);
        }

        :global(.crm-admin-form .crm-button:disabled) {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        :global(.crm-admin-form .crm-button-secondary) {
          background: rgba(100, 200, 255, 0.1);
          border: 1px solid rgba(100, 200, 255, 0.3);
          color: #64c8ff;
          padding: 0.75rem 1.5rem;
          border-radius: 6px;
          text-decoration: none;
          font-weight: 600;
          font-size: 1rem;
          transition: all 0.2s ease;
          display: inline-block;
        }

        :global(.crm-admin-form .crm-button-secondary:hover) {
          background: rgba(100, 200, 255, 0.2);
        }

        :global(.crm-admin-form .crm-cancel-link) {
          color: #999;
          text-decoration: none;
          font-size: 0.9rem;
          transition: color 0.2s ease;
        }

        :global(.crm-admin-form .crm-cancel-link:hover) {
          color: #ccc;
          text-decoration: underline;
        }

        :global(.crm-admin-form .crm-empty-state) {
          text-align: center;
          padding: 3rem 1rem;
        }

        :global(.crm-admin-form .crm-empty-state p) {
          color: #999;
          margin-bottom: 1rem;
        }
      `}</style>
    </div>
  );
}
