'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/browser';
import { ALLOWED_TRANSITIONS, canTransition } from '@/lib/crm/project-contract.mjs';
import { getProjectWorkspace } from '@/lib/crm/projects';
import { transitionProject, createProjectTask } from '@/app/actions/project-actions';
import WorkspaceShell from '@/components/crm/WorkspaceShell';
import ProjectOverview from '@/components/crm/ProjectOverview';
import ProjectTimeline from '@/components/crm/ProjectTimeline';
import ProjectTasks from '@/components/crm/ProjectTasks';
import ProjectFiles from '@/components/crm/ProjectFiles';
import ProjectApprovals from '@/components/crm/ProjectApprovals';
import ProjectThread from '@/components/crm/ProjectThread';
import NotesPanel from '@/components/crm/NotesPanel';

export default function TeamProjectPage() {
  const params = useParams();
  const projectId = params?.id;
  const [profile, setProfile] = useState(null);
  const [workspace, setWorkspace] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

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

      const viewerProfile = { profile: profileData };
      setProfile(profileData);

      const data = await getProjectWorkspace(supabase, viewerProfile, projectId);
      setWorkspace(data);
    } catch (err) {
      setError(err.message || 'Unable to load this project.');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

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
    formData.set('note', `Status moved to ${nextStatus}.`);

    const result = await transitionProject(formData);

    if (!result.ok) {
      setError(result.error || 'Unable to update status.');
      return;
    }

    await loadWorkspace();
  }

  async function handleAddTask(e) {
    e.preventDefault();
    if (!workspace?.project || !profile) return;

    const form = e.target;
    const title = form.taskTitle?.value?.trim();
    const due = form.taskDue?.value?.trim();

    if (!title) return;

    setError(null);

    const formData = new FormData();
    formData.set('projectId', workspace.project.id);
    formData.set('title', title);
    if (due) formData.set('dueDate', due);

    const result = await createProjectTask(formData);

    if (!result.ok) {
      setError(result.error || 'Unable to create the task.');
      return;
    }

    form.reset();
    await loadWorkspace();
  }

  if (isLoading) {
    return (
      <div className="crm-project-page">
        <div className="crm-loading">Loading project...</div>
      </div>
    );
  }

  if (error || !workspace?.project) {
    return (
      <div className="crm-project-page">
        <div className="crm-error">{error || 'Project not found.'}</div>
        <Link href="/team" className="crm-link-secondary">Back to Team</Link>
      </div>
    );
  }

  const project = workspace.project;
  const NEXT_OPTIONS = ALLOWED_TRANSITIONS[project.status] || [];

  return (
    <WorkspaceShell role="project_manager" title={project.title}>
      <ProjectOverview project={project} />
      <ProjectTimeline history={workspace.statusHistory} />
      <ProjectTasks tasks={workspace.tasks ?? []} />

      <section className="crm-ops-section">
        <h2>Operations</h2>
        <form onSubmit={handleAddTask} className="crm-ops-form">
          <div className="crm-ops-row">
            <input name="taskTitle" placeholder="New task title" required />
            <input name="taskDue" type="date" />
            <select name="taskPriority">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <button type="submit" className="crm-ops-button">Add Task</button>
          </div>
        </form>

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
      <ProjectThread projectId={projectId} role={profile?.role || 'project_manager'} />
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

        .crm-ops-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 1.25rem;
        }

        .crm-ops-row {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
          align-items: center;
        }

        .crm-ops-row input,
        .crm-ops-row select {
          background: rgba(15, 20, 40, 0.6);
          border: 1px solid rgba(100, 200, 255, 0.2);
          border-radius: 6px;
          padding: 0.7rem 0.9rem;
          color: #e0e0e0;
          font-size: 0.95rem;
          font-family: inherit;
          min-width: 180px;
        }

        .crm-ops-row input:focus,
        .crm-ops-row select:focus {
          outline: none;
          border-color: rgba(100, 200, 255, 0.6);
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
      `}</style>
    </WorkspaceShell>
  );
}
