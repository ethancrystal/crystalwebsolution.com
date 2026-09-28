'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';
import { createClient } from '@/lib/supabase/browser';
import { listProjectBriefs } from '@/lib/crm/briefs';
import { BRIEF_TEMPLATES, BRIEF_TYPES, briefSections, briefTypeLabel } from '@/lib/crm/brief-templates.mjs';
import { startBrief } from '@/app/actions/brief-actions';
import { BRIEF_ICONS } from '@/components/crm/briefIcons';

// Submitted service briefs for one project (0043). Every participant reads
// the same answers; only clients get the "add another brief" row.
export default function ProjectBriefs({ projectId, canAddBriefs = false, projectStatus }) {
  const router = useRouter();
  const [briefs, setBriefs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [startingType, setStartingType] = useState(null);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;

    listProjectBriefs(createClient(), projectId)
      .then((rows) => {
        if (!cancelled) setBriefs(rows);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  async function handleStart(briefType) {
    setError(null);
    setStartingType(briefType);
    try {
      const formData = new FormData();
      formData.set('briefType', briefType);
      formData.set('projectId', projectId);
      const result = await startBrief(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/dashboard/briefs/${result.data.briefId}`);
    } catch {
      setError('Unable to start the brief.');
    } finally {
      setStartingType(null);
    }
  }

  const canAdd = canAddBriefs && projectStatus !== 'cancelled';

  return (
    <section className="pb" aria-labelledby={`project-briefs-${projectId}`}>
      <h2 id={`project-briefs-${projectId}`}>Briefs</h2>

      {error && <p className="pb-error" role="alert">{error}</p>}

      {isLoading ? (
        <p className="pb-muted">Loading briefs…</p>
      ) : briefs.length === 0 ? (
        <p className="pb-muted">
          {canAdd
            ? 'No service briefs yet. Add one below so the team has everything they need.'
            : 'No service briefs submitted for this project yet.'}
        </p>
      ) : (
        <div className="pb-list">
          {briefs.map((brief, index) => (
            <details key={brief.id} className="pb-item" open={index === briefs.length - 1}>
              <summary>
                <span className="pb-icon" aria-hidden="true">
                  <HugeiconsIcon icon={BRIEF_ICONS[brief.brief_type] ?? BRIEF_ICONS.other} size={18} />
                </span>
                <span className="pb-summary-text">
                  <span className="pb-title">{brief.title || `${briefTypeLabel(brief.brief_type)} brief`}</span>
                  <span className="pb-meta">
                    {briefTypeLabel(brief.brief_type)} · submitted{' '}
                    {brief.submitted_at ? new Date(brief.submitted_at).toLocaleDateString() : ''}
                  </span>
                </span>
              </summary>
              <div className="pb-body">
                {briefSections(brief.brief_type, brief.answers).map((section) => (
                  <div key={section.id} className="pb-section">
                    <h3>{section.title}</h3>
                    <dl>
                      {section.rows.map((row) => (
                        <div key={row.id} className="pb-row">
                          <dt>{row.label}</dt>
                          <dd>{row.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      )}

      {canAdd && (
        <div className="pb-add">
          <p className="pb-add-label">Add another brief to this project</p>
          <div className="pb-add-row">
            {BRIEF_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                className="pb-add-btn"
                onClick={() => handleStart(type)}
                disabled={startingType !== null}
              >
                <HugeiconsIcon icon={BRIEF_ICONS[type]} size={16} aria-hidden="true" />
                {startingType === type ? 'Starting…' : BRIEF_TEMPLATES[type].label}
              </button>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .pb {
          background: rgba(30, 35, 60, 0.8);
          border: 1px solid rgba(100, 200, 255, 0.1);
          border-radius: 12px;
          padding: 1.5rem;
        }
        .pb h2 {
          font-size: 1.25rem;
          color: #64c8ff;
          margin-bottom: 1rem;
        }
        .pb-muted {
          color: #999;
        }
        .pb-error {
          color: #ff9999;
          margin-bottom: 0.75rem;
        }
        .pb-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .pb-item {
          background: rgba(15, 20, 40, 0.6);
          border: 1px solid rgba(100, 200, 255, 0.12);
          border-radius: 10px;
        }
        .pb-item summary {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.9rem 1rem;
          cursor: pointer;
          list-style: none;
        }
        .pb-item summary::-webkit-details-marker {
          display: none;
        }
        .pb-item summary:focus-visible {
          outline: 2px solid rgba(100, 200, 255, 0.6);
          outline-offset: 2px;
          border-radius: 10px;
        }
        .pb-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 2.1rem;
          height: 2.1rem;
          border-radius: 8px;
          background: rgba(100, 200, 255, 0.1);
          color: #64c8ff;
          flex-shrink: 0;
        }
        .pb-summary-text {
          display: flex;
          flex-direction: column;
        }
        .pb-title {
          color: #e0e0e0;
          font-weight: 600;
        }
        .pb-meta {
          color: #999;
          font-size: 0.82rem;
        }
        .pb-body {
          padding: 0 1rem 1rem;
        }
        .pb-section {
          border-top: 1px solid rgba(100, 200, 255, 0.08);
          padding-top: 0.75rem;
          margin-top: 0.75rem;
        }
        .pb-section h3 {
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #64c8ff;
          margin-bottom: 0.4rem;
        }
        .pb-row {
          display: grid;
          grid-template-columns: minmax(0, 2fr) minmax(0, 3fr);
          gap: 1rem;
          padding: 0.3rem 0;
          font-size: 0.9rem;
        }
        .pb-row dt {
          color: #999;
        }
        .pb-row dd {
          margin: 0;
          color: #e0e0e0;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }
        .pb-add {
          margin-top: 1.25rem;
          padding-top: 1rem;
          border-top: 1px solid rgba(100, 200, 255, 0.1);
        }
        .pb-add-label {
          color: #aab;
          font-size: 0.9rem;
          margin-bottom: 0.6rem;
        }
        .pb-add-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .pb-add-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          background: rgba(100, 200, 255, 0.08);
          border: 1px solid rgba(100, 200, 255, 0.3);
          color: #64c8ff;
          border-radius: 999px;
          padding: 0.5rem 0.9rem;
          font: inherit;
          font-size: 0.88rem;
          cursor: pointer;
        }
        .pb-add-btn:hover:not(:disabled) {
          background: rgba(100, 200, 255, 0.16);
        }
        .pb-add-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        @media (max-width: 640px) {
          .pb-row {
            grid-template-columns: minmax(0, 1fr);
            gap: 0.1rem;
          }
        }
      `}</style>
    </section>
  );
}
