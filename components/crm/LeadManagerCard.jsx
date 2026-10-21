'use client';

import { useCallback, useEffect, useState } from 'react';
import { listProjectManagerCandidates, setLeadProjectManager } from '@/app/actions/assignment-actions';
import { removeProjectAssignment } from '@/app/actions/project-actions';

function openProjectsLabel(count) {
  if (!count) return 'No open projects';
  return count === 1 ? '1 open project' : `${count} open projects`;
}

// Admin-only card at the top of /admin/projects/[id]: shows the project's
// lead project manager, or, when nobody is leading it yet, the list of
// project managers to pick from. The "assign a project manager" email for a
// new brief links straight to this page. Managers are shown by name only;
// their email addresses never appear.
//
// assignments come from getProjectWorkspace in creation order; the first one
// is the lead (the same "primary" convention as the admin project list).
export default function LeadManagerCard({ projectId, projectStatus, assignments = [], onChanged }) {
  const [candidates, setCandidates] = useState([]);
  const [candidatesError, setCandidatesError] = useState(null);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(true);
  const [selectedId, setSelectedId] = useState('');
  const [isChanging, setIsChanging] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [removingUserId, setRemovingUserId] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const lead = assignments[0] ?? null;
  const others = assignments.slice(1);
  const showPicker = !lead || isChanging;

  const loadCandidates = useCallback(async () => {
    setIsLoadingCandidates(true);
    try {
      const result = await listProjectManagerCandidates();
      if (!result?.ok) throw new Error(result?.error || 'Unable to load project managers.');
      setCandidates(result.data.managers ?? []);
      setCandidatesError(null);
    } catch (err) {
      setCandidatesError(err.message);
    } finally {
      setIsLoadingCandidates(false);
    }
  }, []);

  useEffect(() => {
    loadCandidates();
  }, [loadCandidates]);

  const options = candidates.filter((candidate) => candidate.id !== lead?.user_id);
  const selected = options.find((candidate) => candidate.id === selectedId) ?? null;

  async function handleAssign() {
    if (!selected || !projectId) return;

    setIsAssigning(true);
    setError(null);
    setNotice(null);

    try {
      const formData = new FormData();
      formData.set('projectId', projectId);
      formData.set('userId', selected.id);

      const result = await setLeadProjectManager(formData);
      if (!result?.ok) throw new Error(result?.error || 'Unable to assign this project.');

      const name = selected.fullName || 'The project manager';
      const parts = [
        result.data?.notified === false
          ? `${name} is leading this project.`
          : `${name} is now leading this project and will get an email in the next few minutes.`,
      ];
      if (result.data?.movedToPlanned) parts.push('The project moved to Planned, and the client was notified.');
      parts.push(...(result.data?.warnings ?? []));
      setNotice(parts.join(' '));

      setSelectedId('');
      setIsChanging(false);
      await Promise.all([onChanged?.(), loadCandidates()]);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsAssigning(false);
    }
  }

  async function handleRemove(userId) {
    if (!userId || !projectId) return;

    setRemovingUserId(userId);
    setError(null);
    setNotice(null);

    try {
      const formData = new FormData();
      formData.set('projectId', projectId);
      formData.set('userId', userId);

      const result = await removeProjectAssignment(formData);
      if (!result?.ok) throw new Error(result?.error || 'Unable to remove this project manager.');

      await Promise.all([onChanged?.(), loadCandidates()]);
    } catch (err) {
      setError(err.message);
    } finally {
      setRemovingUserId(null);
    }
  }

  return (
    <section
      className={`lead-pm${lead ? '' : ' lead-pm-unassigned'}`}
      aria-labelledby="lead-pm-heading"
    >
      <div className="lead-pm-head">
        <h2 id="lead-pm-heading">Project manager</h2>
        {!lead && <span className="lead-pm-badge">Needs a manager</span>}
      </div>

      {lead ? (
        <div className="lead-pm-current">
          <div className="lead-pm-person">
            <strong>{lead.user?.full_name || 'Unnamed project manager'}</strong>
          </div>
          <div className="lead-pm-actions">
            <button
              type="button"
              className="lead-pm-secondary"
              onClick={() => {
                setIsChanging((value) => !value);
                setSelectedId('');
              }}
              aria-expanded={isChanging}
            >
              {isChanging ? 'Keep current' : 'Change'}
            </button>
            <button
              type="button"
              className="lead-pm-remove"
              onClick={() => handleRemove(lead.user_id)}
              disabled={isAssigning || removingUserId === lead.user_id}
            >
              {removingUserId === lead.user_id ? 'Removing...' : 'Remove'}
            </button>
          </div>
        </div>
      ) : (
        <p className="lead-pm-intro">
          Nobody is leading this project yet. Pick a project manager: they get an email with the
          project, and the client can message them from their project page.
          {projectStatus === 'brief_submitted' && ' The project also moves to Planned, which the client sees.'}
        </p>
      )}

      {others.length > 0 && (
        <div className="lead-pm-others">
          <span>Also assigned:</span>
          <ul>
            {others.map((assignment) => (
              <li key={assignment.id}>
                {assignment.user?.full_name || 'Unnamed'}
                <button
                  type="button"
                  className="lead-pm-remove"
                  onClick={() => handleRemove(assignment.user_id)}
                  disabled={isAssigning || removingUserId === assignment.user_id}
                >
                  {removingUserId === assignment.user_id ? 'Removing...' : 'Remove'}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showPicker && (
        <div className="lead-pm-picker">
          {isLoadingCandidates ? (
            <p className="lead-pm-muted">Loading project managers...</p>
          ) : candidatesError ? (
            <p className="lead-pm-error" role="alert">{candidatesError}</p>
          ) : options.length === 0 ? (
            <p className="lead-pm-muted">
              No other project managers yet. Invite one from Manage Users.
            </p>
          ) : (
            <>
              <ul className="lead-pm-options" aria-label="Project managers">
                {options.map((candidate) => (
                  <li key={candidate.id}>
                    <button
                      type="button"
                      className="lead-pm-option"
                      aria-pressed={selectedId === candidate.id}
                      onClick={() => setSelectedId(candidate.id)}
                    >
                      <span className="lead-pm-option-name">{candidate.fullName || 'Unnamed project manager'}</span>
                      <span className="lead-pm-load">{openProjectsLabel(candidate.openProjects)}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="lead-pm-assign"
                onClick={handleAssign}
                disabled={!selected || isAssigning}
              >
                {isAssigning
                  ? 'Assigning...'
                  : selected
                    ? `Assign ${selected.fullName || 'this project manager'}`
                    : 'Select a project manager'}
              </button>
            </>
          )}
        </div>
      )}

      {notice && <p className="lead-pm-notice" role="status">{notice}</p>}
      {error && <p className="lead-pm-error" role="alert">{error}</p>}

      <style jsx>{`
        .lead-pm {
          background: rgba(30, 35, 60, 0.8);
          border: 1px solid rgba(100, 200, 255, 0.15);
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .lead-pm-unassigned {
          border-color: rgba(100, 200, 255, 0.55);
          box-shadow: 0 0 0 1px rgba(100, 200, 255, 0.15), 0 8px 24px rgba(100, 200, 255, 0.08);
        }

        .lead-pm-head {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.9rem;
        }

        .lead-pm-head h2 {
          font-size: 1.25rem;
          color: #64c8ff;
          margin: 0;
        }

        .lead-pm-badge {
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: #0a0e27;
          background: #64c8ff;
          border-radius: 999px;
          padding: 0.2rem 0.6rem;
        }

        .lead-pm-intro,
        .lead-pm-muted {
          color: #b8c4d6;
          font-size: 0.92rem;
          line-height: 1.55;
          margin: 0 0 1rem;
        }

        .lead-pm-current {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
          background: rgba(15, 20, 40, 0.6);
          border: 1px solid rgba(100, 200, 255, 0.12);
          border-radius: 8px;
          padding: 0.8rem 1rem;
        }

        .lead-pm-person {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
          min-width: 0;
        }

        .lead-pm-person strong {
          color: #eaf2ff;
        }

        .lead-pm-actions {
          display: flex;
          gap: 0.5rem;
        }

        .lead-pm-others {
          margin-top: 0.9rem;
          color: #9aa6b8;
          font-size: 0.85rem;
        }

        .lead-pm-others ul {
          list-style: none;
          padding: 0;
          margin: 0.4rem 0 0;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .lead-pm-others li {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: #e0e0e0;
        }

        .lead-pm-picker {
          margin-top: 1rem;
        }

        .lead-pm-options {
          list-style: none;
          padding: 0;
          margin: 0 0 1rem;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(min(100%, 14rem), 1fr));
          gap: 0.75rem;
        }

        .lead-pm-option {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 0.25rem;
          text-align: left;
          background: rgba(15, 20, 40, 0.6);
          border: 1px solid rgba(100, 200, 255, 0.18);
          border-radius: 8px;
          padding: 0.85rem 1rem;
          color: #e0e0e0;
          font-family: inherit;
          cursor: pointer;
          transition: border-color 0.2s ease, background 0.2s ease;
        }

        .lead-pm-option:hover {
          border-color: rgba(100, 200, 255, 0.45);
        }

        .lead-pm-option[aria-pressed='true'] {
          border-color: #64c8ff;
          background: rgba(100, 200, 255, 0.1);
        }

        .lead-pm-option:focus-visible,
        .lead-pm-assign:focus-visible,
        .lead-pm-secondary:focus-visible,
        .lead-pm-remove:focus-visible {
          outline: 2px solid #64c8ff;
          outline-offset: 2px;
        }

        .lead-pm-option-name {
          font-weight: 600;
          color: #eaf2ff;
        }

        .lead-pm-load {
          font-size: 0.78rem;
          color: #64c8ff;
        }

        .lead-pm-assign {
          background: linear-gradient(135deg, #64c8ff 0%, #5bb8ff 100%);
          color: #0a0e27;
          padding: 0.7rem 1.4rem;
          border-radius: 6px;
          border: none;
          font-weight: 600;
          font-size: 0.95rem;
          font-family: inherit;
          cursor: pointer;
        }

        .lead-pm-assign:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .lead-pm-secondary {
          background: none;
          border: 1px solid rgba(100, 200, 255, 0.35);
          color: #64c8ff;
          padding: 0.35rem 0.8rem;
          border-radius: 6px;
          font-size: 0.82rem;
          font-family: inherit;
          cursor: pointer;
        }

        .lead-pm-remove {
          background: none;
          border: 1px solid rgba(255, 100, 100, 0.3);
          color: #ff9999;
          padding: 0.35rem 0.8rem;
          border-radius: 6px;
          font-size: 0.82rem;
          font-family: inherit;
          cursor: pointer;
        }

        .lead-pm-remove:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .lead-pm-notice {
          margin: 1rem 0 0;
          color: #9be8b4;
          font-size: 0.9rem;
        }

        .lead-pm-error {
          margin: 1rem 0 0;
          color: #ff9999;
          font-size: 0.9rem;
        }

        @media (prefers-reduced-motion: reduce) {
          .lead-pm-option {
            transition: none;
          }
        }
      `}</style>
    </section>
  );
}
