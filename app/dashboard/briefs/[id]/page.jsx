'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/browser';
import { getBrief } from '@/lib/crm/briefs';
import { getBriefTemplate } from '@/lib/crm/brief-templates.mjs';
import { listProjectsForViewer } from '@/lib/crm/projects';
import WorkspaceShell from '@/components/crm/WorkspaceShell';
import BriefWizard from '@/components/crm/BriefWizard';
import { SkeletonDetail } from '@/components/crm/Skeleton';

export default function ClientBriefPage() {
  const params = useParams();
  const router = useRouter();
  const briefId = params?.id;
  const [brief, setBrief] = useState(null);
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!briefId) return;
    let cancelled = false;

    async function load() {
      const supabase = createClient();
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.replace('/login/client');
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('id, role, company_id')
          .eq('id', user.id)
          .single();

        if (!profile?.company_id) {
          router.replace('/onboarding');
          return;
        }

        const [briefRow, projectRows] = await Promise.all([
          getBrief(supabase, briefId),
          listProjectsForViewer(supabase, { profile }),
        ]);

        if (cancelled) return;

        if (!briefRow || !getBriefTemplate(briefRow.brief_type)) {
          setError('This brief could not be found.');
          return;
        }

        // Submitted briefs are read-only and live on their project page.
        if (briefRow.status === 'submitted' && briefRow.project_id) {
          router.replace(`/dashboard/projects/${briefRow.project_id}`);
          return;
        }

        setBrief(briefRow);
        setProjects(projectRows);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Unable to load this brief.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [briefId, router]);

  if (isLoading) {
    return (
      <WorkspaceShell role="client" title="Project brief">
        <SkeletonDetail />
      </WorkspaceShell>
    );
  }

  if (error || !brief) {
    return (
      <WorkspaceShell role="client" title="Project brief">
        <p className="crm-brief-error">{error || 'This brief could not be found.'}</p>
        <Link href="/dashboard" className="crm-brief-back">Back to dashboard</Link>
        <style jsx>{`
          .crm-brief-error {
            color: #ff9999;
            margin-bottom: 1rem;
          }
          .crm-brief-back {
            color: #64c8ff;
          }
        `}</style>
      </WorkspaceShell>
    );
  }

  return (
    <WorkspaceShell role="client" title="Project brief">
      <Link href="/dashboard" className="crm-brief-back">← Dashboard (your answers are saved automatically)</Link>
      <BriefWizard brief={brief} projects={projects} />
      <style jsx>{`
        :global(.crm-brief-back) {
          display: inline-block;
          color: #64c8ff;
          font-size: 0.9rem;
          margin-bottom: 1rem;
          text-decoration: none;
        }
        :global(.crm-brief-back:hover) {
          text-decoration: underline;
        }
      `}</style>
    </WorkspaceShell>
  );
}
