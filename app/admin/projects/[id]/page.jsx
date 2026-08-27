'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/browser';
import { canTransition } from '@/lib/crm/project-contract.mjs';
import { getProjectWorkspace } from '@/lib/crm/projects';
import { transitionProject, assignProject, removeProjectAssignment } from '@/app/actions/project-actions';
import WorkspaceShell from '@/components/crm/WorkspaceShell';
import ProjectOverview from '@/components/crm/ProjectOverview';
import ProjectTimeline from '@/components/crm/ProjectTimeline';
import ProjectTasks from '@/components/crm/ProjectTasks';
import ProjectFiles from '@/components/crm/ProjectFiles';
import ProjectApprovals from '@/components/crm/ProjectApprovals';
import ProjectThread from '@/components/crm/ProjectThread';
import NotesPanel from '@/components/crm/NotesPanel';
import { LoadingState } from '@/components/crm/Spinner';

export default function AdminProjectPage() {
  const params = useParams();
  const projectId = params?.id;
  const [profile, setProfile] = useState(null);
  const [workspace, setWorkspace] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [candidatePMs, setCandidatePMs] = useState([]);
  const [selectedPMId, setSelectedPMId] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [removingUserId, setRemovingUserId] = useState(null);

  const loadWorkspace = useCallback(async () => {
    if (!projectId) return;

    const supabase = createClient();

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError('You must be signed in to view this project.');
        setIsLoading(false);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError || !profileData) {
        setError('Unable to load your profile.');
        setIsLoading(false);
        return;
      }

      setProfile(profileData);

      const data = await getProjectWorkspace(supabase, { profile: profileData }, projectId);
      setWorkspace(data);

      const { data: pmProfiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'project_manager')
        .order('full_name', { ascending: true });
      setCandidatePMs(pmProfiles || []);
    } catch (err) {
      setError(err.message || 'Unable to load this project.');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  async function handleAssign() {
    if (!selectedPMId) return;

    setIsAssigning(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.set('projectId', projectId);
      formData.set('userId', selectedPMId);

      const result = await assignProject(formData);
      if (!result.ok) throw new Error(result.error || 'Unable to assign this project.');

      setSelectedPMId('');
      await loadWorkspace();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsAssigning(false);
    }
  }

  async function handleRemoveAssignment(userId) {
    setRemovingUserId(userId);
    setError(null);

    try {
      const formData = new FormData();
      formData.set('projectId', projectId);
      formData.set('userId', userId);

      const result = await removeProjectAssignment(formData);
      if (!result.ok) throw new Error(result.error || 'Unable to remove this assignment.');

      await loadWorkspace();
    } catch (err) {
      setError(err.message);
    } finally {
      setRemovingUserId(null);
    }
  }

  async function handleTransition(nextStatus) {
    if (!workspace?.project || !profile) return;
    if (!canTransition(workspace.project.status, nextStatus)) {
      setError(`Cannot move from ${workspace.project.status} to ${nextStatus}.`);
      return;
    }

    setError(null);
    const formData = new FormData();
    formData.set('projectId', workspace.project.id);
    formData.set('fromStatus', workspace.project.status);
    formData.set('toStatus', nextStatus);
    formData.set('visibility', 'shared');
    formData.set('note', `Status moved to ${nextStatus} by admin.`);

    const result = await transitionProject(formData);
    if (!result.ok) {
      setError(result.error || 'Unable to update status.');
      return;
    }

    await loadWorkspace();
  }

  if (isLoading) {
    return (
      <div className="crm-project-page">
        <LoadingState label="Loading project..." />
      </div>
    );
  }

  if (error || !workspace?.project) {
    return (
      <div className="crm-project-page">
        <div className="crm-error">{error || 'Project not found.'}</div>
        <Link href="/admin/projects" className="crm-link-secondary">Back to Admin Projects</Link>
      </div>
    );
  }

  const project = workspace.project;
  const NEXT_OPTIONS = {
    planned: ['in_progress'],
    in_progress: ['client_review', 'on_hold'],
    client_review: ['approved', 'changes_requested'],
    changes_requested: ['in_progress', 'client_review'],
    approved: ['delivered'],
  }[project.status] || [];

  return (
    <WorkspaceShell role="admin" title={project.title}>
      <ProjectOverview project={project} />
      <ProjectTimeline history={workspace.statusHistory} />
      <ProjectTasks tasks={workspace.tasks ?? []} />

      <section className="crm-ops-section">
        <h2>Project Manager</h2>
        {workspace.assignments?.length > 0 ? (
          <ul className="crm-assignee-list">
            {workspace.assignments.map((assignment) => (
              <li key={assignment.id} className="crm-assignee-item">
                <span>{assignment.user?.full_name || 'Unknown'}</span>
                <button
                  type="button"
                  className="crm-assignee-remove"
                  onClick={() => handleRemoveAssignment(assignment.user_id)}
                  disabled={removingUserId === assignment.user_id}
                >
                  {removingUserId === assignment.user_id ? 'Removing...' : 'Remove'}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="crm-ops-empty">No project manager assigned yet.</p>
        )}
        <div className="crm-assign-row">
          <select
            value={selectedPMId}
            onChange={(e) => setSelectedPMId(e.target.value)}
            aria-label="Select a project manager to assign"
          >
            <option value="">Select a project manager...</option>
            {candidatePMs
              .filter((pm) => !workspace.assignments?.some((a) => a.user_id === pm.id))
              .map((pm) => (
                <option key={pm.id} value={pm.id}>
                  {pm.full_name || pm.id}
                </option>
              ))}
          </select>
          <button
            type="button"
            className="crm-ops-button"
            onClick={handleAssign}
            disabled={!selectedPMId || isAssigning}
          >
            {isAssigning ? 'Assigning...' : 'Assign'}
          </button>
        </div>
      </section>

      <section className="crm-ops-section">
        <h2>Admin Operations</h2>
        <div className="crm-ops-row">
          {NEXT_OPTIONS.length > 0 ? (
            NEXT_OPTIONS.map((status) => (
              <button
                key={status}
                type="button"
                className="crm-ops-button"
                onClick={() => handleTransition(status)}
              >
                Move to {status.replaceAll('_', ' ')}
              </button>
            ))
          ) : (
            <p className="crm-ops-empty">No valid status transitions from this state.</p>
          )}
        </div>
      </section>

      <ProjectFiles
        files={workspace.attachments ?? []}
        deliverables={workspace.deliverables ?? []}
        canUpload
        projectId={projectId}
        onChanged={loadWorkspace}
      />
      <ProjectApprovals
        approvals={workspace.approvals ?? []}
        canDecide
        projectId={projectId}
        onChanged={loadWorkspace}
      />
      <ProjectThread projectId={projectId} profile={profile} />
      <NotesPanel projectId={projectId} />

      <style jsx>{`
        .crm-project-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%);
          color: #e0e0e0;
          font-family: inherit;
          padding: 2rem;
        }

        .crm-loading,
        .crm-error {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 50vh;
          color: #64c8ff;
          font-size: 1.1rem;
        }

        .crm-error {
          color: #ff9999;
        }

        .crm-link-secondary {
          display: inline-block;
          margin-top: 1rem;
          color: #64c8ff;
          text-decoration: none;
        }

        .crm-link-secondary:hover {
          text-decoration: underline;
        }

        .crm-ops-section {
          background: rgba(30, 35, 60, 0.8);
          border: 1px solid rgba(100, 200, 255, 0.15);
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          backdrop-filter: blur(10px);
        }

        .crm-ops-section h2 {
          font-size: 1.25rem;
          color: #64c8ff;
          margin-bottom: 1rem;
        }

        .crm-ops-row {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
          align-items: center;
        }

        .crm-ops-button {
          background: linear-gradient(135deg, #64c8ff 0%, #5bb8ff 100%);
          color: #0a0e27;
          padding: 0.7rem 1.4rem;
          border-radius: 6px;
          border: none;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .crm-ops-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(100, 200, 255, 0.3);
        }

        .crm-ops-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .crm-ops-empty {
          color: #999;
          font-size: 0.9rem;
        }

        .crm-assignee-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
          margin-bottom: 1rem;
        }

        .crm-assignee-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(15, 20, 40, 0.6);
          border: 1px solid rgba(100, 200, 255, 0.12);
          border-radius: 6px;
          padding: 0.6rem 0.9rem;
        }

        .crm-assignee-remove {
          background: none;
          border: 1px solid rgba(255, 100, 100, 0.3);
          color: #ff9999;
          padding: 0.3rem 0.7rem;
          border-radius: 6px;
          font-size: 0.78rem;
          cursor: pointer;
          font-family: inherit;
        }

        .crm-assignee-remove:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .crm-assign-row {
          display: flex;
          gap: 0.75rem;
          align-items: center;
          flex-wrap: wrap;
        }

        .crm-assign-row select {
          background: rgba(15, 20, 40, 0.6);
          border: 1px solid rgba(100, 200, 255, 0.2);
          border-radius: 6px;
          padding: 0.6rem 0.8rem;
          color: #e0e0e0;
          font-size: 0.9rem;
          font-family: inherit;
          min-width: 14rem;
        }
      `}</style>
    </WorkspaceShell>
  );
}
