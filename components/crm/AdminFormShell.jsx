'use client';

import Link from 'next/link';
import { SkeletonDetail } from './Skeleton';

// Shared page chrome for the /admin/<entity>/new and /admin/<entity>/[id]/edit
// forms: page background, header + back link, error banner, the form card,
// and the styled-jsx rules for the field/button classes the entity pages
// render inside it.
//
// Two visual variants exist because the four entities shipped as two
// families with deliberately different chrome, and Phase 3 of
// docs/plans/refactor-architecture-cleanup-2.md is a no-visual-change
// refactor:
//   - 'card'      -> companies, deals  (700px, .crm-field / .crm-field-row,
//                                       .crm-button-secondary cancel)
//   - 'container' -> contacts, tasks   (800px, .crm-form / .crm-form-row /
//                                       .crm-form-grid, .crm-cancel-link)
// Each variant's CSS is byte-for-byte the union of what its two pages used
// to carry inline. Unifying the two is a design decision, not a refactor --
// see docs/reports/phase-3-admin-crud-duplication-audit-2026-09-02.md.
//
// Field rules are emitted with :global() under the variant class because
// styled-jsx only scopes selectors to elements rendered by *this* component;
// the entity pages render their own <input className="crm-field">, so the
// rules have to reach descendants. The variant class is the namespace, so
// nothing outside this shell picks them up.
export default function AdminFormShell({
  title,
  backHref,
  backLabel,
  error,
  variant = 'card',
  loading = false,
  skeletonFields,
  // A load failure with nothing to edit: render only the error banner inside
  // the page wrapper (no header, no card) -- mirrors the deals edit page's
  // pre-Phase-3 `error && !form` branch.
  fatalError = null,
  children,
}) {
  const frameClass = variant === 'container' ? 'crm-form-container' : 'crm-form-card';

  return (
    <div className={`crm-admin-page crm-admin-form crm-admin-form--${variant}`}>
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

          <div className={frameClass}>{children}</div>
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
        }

        .crm-form-card,
        .crm-form-container {
          background: rgba(30, 35, 60, 0.8);
          border: 1px solid rgba(100, 200, 255, 0.2);
          border-radius: 12px;
          padding: 2rem;
          margin-left: auto;
          margin-right: auto;
          backdrop-filter: blur(10px);
        }

        /* ---- variant: card (companies, deals) ---- */
        .crm-admin-form--card .crm-admin-header,
        .crm-admin-form--card .crm-error,
        .crm-admin-form--card .crm-form-card {
          max-width: 700px;
        }

        /* ---- variant: container (contacts, tasks) ---- */
        .crm-admin-form--container .crm-admin-header,
        .crm-admin-form--container .crm-error,
        .crm-admin-form--container .crm-form-container {
          max-width: 800px;
        }
      `}</style>

      <style jsx>{`
        /* ===== card variant: field + action rules (from deals, the superset) ===== */
        :global(.crm-admin-form--card .crm-field) {
          margin-bottom: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          flex: 1;
        }

        :global(.crm-admin-form--card .crm-field-row) {
          display: flex;
          gap: 1.5rem;
        }

        :global(.crm-admin-form--card .crm-field label) {
          color: #999;
          font-size: 0.85rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        :global(.crm-admin-form--card .crm-field input),
        :global(.crm-admin-form--card .crm-field select),
        :global(.crm-admin-form--card .crm-field textarea) {
          background: rgba(15, 20, 40, 0.6);
          border: 1px solid rgba(100, 200, 255, 0.2);
          border-radius: 6px;
          color: #e0e0e0;
          padding: 0.75rem;
          font-size: 1rem;
          font-family: inherit;
        }

        :global(.crm-admin-form--card .crm-field input:focus),
        :global(.crm-admin-form--card .crm-field select:focus),
        :global(.crm-admin-form--card .crm-field textarea:focus) {
          outline: none;
          border-color: #64c8ff;
        }

        :global(.crm-admin-form--card .crm-field select:disabled) {
          opacity: 0.5;
          cursor: not-allowed;
        }

        :global(.crm-admin-form--card .crm-field textarea) {
          resize: vertical;
        }

        :global(.crm-admin-form--card .crm-form-actions) {
          display: flex;
          gap: 1rem;
          margin-top: 2rem;
        }

        :global(.crm-admin-form--card .crm-button) {
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

        :global(.crm-admin-form--card .crm-button:hover) {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(100, 200, 255, 0.3);
        }

        :global(.crm-admin-form--card .crm-button:disabled) {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        :global(.crm-admin-form--card .crm-button-secondary) {
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

        :global(.crm-admin-form--card .crm-button-secondary:hover) {
          background: rgba(100, 200, 255, 0.2);
        }

        /* ===== container variant: field + action rules (from tasks, the superset) ===== */
        :global(.crm-admin-form--container .crm-button) {
          background: linear-gradient(135deg, #64c8ff 0%, #5bb8ff 100%);
          color: #0a0e27;
          padding: 0.75rem 1.5rem;
          border-radius: 6px;
          text-decoration: none;
          font-weight: 600;
          transition: all 0.2s ease;
          display: inline-block;
          border: none;
          cursor: pointer;
          font-size: 1rem;
        }

        :global(.crm-admin-form--container .crm-button:hover) {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(100, 200, 255, 0.3);
        }

        :global(.crm-admin-form--container .crm-button:disabled) {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        :global(.crm-admin-form--container .crm-form) {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        :global(.crm-admin-form--container .crm-form-grid) {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1.5rem;
        }

        :global(.crm-admin-form--container .crm-form-row) {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        :global(.crm-admin-form--container .crm-form-row label) {
          color: #999;
          font-size: 0.9rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        :global(.crm-admin-form--container .crm-form-row input),
        :global(.crm-admin-form--container .crm-form-row select),
        :global(.crm-admin-form--container .crm-form-row textarea) {
          background: rgba(15, 20, 40, 0.6);
          border: 1px solid rgba(100, 200, 255, 0.2);
          border-radius: 6px;
          padding: 0.75rem 1rem;
          color: #e0e0e0;
          font-size: 1rem;
          font-family: inherit;
        }

        :global(.crm-admin-form--container .crm-form-row input:focus),
        :global(.crm-admin-form--container .crm-form-row select:focus),
        :global(.crm-admin-form--container .crm-form-row textarea:focus) {
          outline: none;
          border-color: rgba(100, 200, 255, 0.6);
        }

        :global(.crm-admin-form--container .crm-form-row select:disabled) {
          opacity: 0.5;
          cursor: not-allowed;
        }

        :global(.crm-admin-form--container .crm-form-row textarea) {
          resize: vertical;
          min-height: 100px;
        }

        :global(.crm-admin-form--container .crm-form-actions) {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          margin-top: 1rem;
        }

        :global(.crm-admin-form--container .crm-cancel-link) {
          color: #999;
          text-decoration: none;
          font-size: 0.9rem;
          transition: color 0.2s ease;
        }

        :global(.crm-admin-form--container .crm-cancel-link:hover) {
          color: #ccc;
          text-decoration: underline;
        }

        :global(.crm-admin-form--container .crm-empty-state) {
          text-align: center;
          padding: 3rem 1rem;
        }

        :global(.crm-admin-form--container .crm-empty-state p) {
          color: #999;
          margin-bottom: 1rem;
        }
      `}</style>
    </div>
  );
}
