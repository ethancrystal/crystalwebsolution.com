'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/browser';
import { getProjectWorkspace, listProjectMessages } from '@/lib/crm/projects';
import { canViewInternal } from '@/lib/crm/project-contract.mjs';
import WorkspaceShell from '@/components/crm/WorkspaceShell';
import ProjectOverview from '@/components/crm/ProjectOverview';
import ProjectTimeline from '@/components/crm/ProjectTimeline';
import ProjectTasks from '@/components/crm/ProjectTasks';
import ProjectFiles from '@/components/crm/ProjectFiles';
import ProjectApprovals from '@/components/crm/ProjectApprovals';
import ProjectThread from '@/components/crm/ProjectThread';
import NotesPanel from '@/components/crm/NotesPanel';

export default function ClientProjectPage() {
  const params = useParams();
  const projectId = params?.id;
  const [profile, setProfile] = useState(null);
  const [workspace, setWorkspace] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

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
        <Link href="/dashboard" className="crm-link-secondary">Back to Dashboard</Link>
      </div>
    );
  }

  const canViewNotesInternally = canViewInternal(profile?.role);

  return (
    <WorkspaceShell role="client" title={workspace.project.title}>
      <ProjectOverview project={workspace.project} />
      <ProjectTimeline history={workspace.statusHistory} />
      <ProjectTasks tasks={workspace.tasks ?? []} readOnly />
      <ProjectFiles files={workspace.attachments ?? []} deliverables={workspace.deliverables ?? []} canUpload={false} />
      <ProjectApprovals approvals={workspace.approvals ?? []} />
      <ProjectThread projectId={projectId} role={profile?.role || 'client'} />
      <NotesPanel projectId={projectId} />

      {canViewNotesInternally && (
        <div className="crm-internal-note">
          Internal project updates are visible because your role allows internal workspace content.
        </div>
      )}

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

        .crm-internal-note {
          background: rgba(255, 200, 100, 0.08);
          border: 1px solid rgba(255, 200, 100, 0.25);
          color: #ffd08a;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          font-size: 0.9rem;
        }
      `}</style>
    </WorkspaceShell>
  );
}
