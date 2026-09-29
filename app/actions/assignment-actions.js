'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';

import { getAuthenticatedProfile } from '@/lib/auth/require-role';
import { managerAssignedNote } from '@/lib/crm/notification-copy.mjs';
import { canTransition } from '@/lib/crm/project-contract.mjs';
import { createClient } from '@/lib/supabase/server';

// Lead project manager assignment for the admin project page.
//
// Each project has one lead project manager. The database allows several
// project_assignments rows per project (unique on project_id + user_id), so
// the "one lead" rule lives here: setLeadProjectManager puts the chosen
// manager on first, then takes everyone else off. A failure part-way leaves
// two managers on the project, never none.
//
// A project still at 'brief_submitted' moves to 'planned' as part of the
// assignment, with a shared status note naming the manager, so the client
// sees who is leading their project in Status History.
//
// Every write goes through the existing SECURITY DEFINER RPCs
// (assign_project_user, remove_project_assignment,
// transition_project_status); this file adds no database surface.

const CANONICAL_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
// Finished projects no longer count toward a manager's workload.
const CLOSED_PROJECT_STATUSES = new Set(['delivered', 'cancelled']);
const MAX_NOTE_NAME_LENGTH = 120;

function isCanonicalUuid(value) {
  return typeof value === 'string' && CANONICAL_UUID_PATTERN.test(value);
}

function formString(formData, name) {
  const value = formData?.get(name);
  return typeof value === 'string' ? value : '';
}

function safeDatabaseCode(error) {
  const code = typeof error?.code === 'string' ? error.code : '';
  return /^[A-Z0-9_]{1,20}$/.test(code) ? code : 'UNKNOWN';
}

function databaseFailure(error, requestId, userMessage) {
  console.error({ requestId, code: safeDatabaseCode(error) });
  return { ok: false, error: userMessage, requestId };
}

function invalid(requestId, error) {
  return { ok: false, error, requestId };
}

function success(requestId, data) {
  return { ok: true, data, requestId };
}

async function adminProfile() {
  let authenticated;
  try {
    authenticated = await getAuthenticatedProfile();
  } catch {
    return null;
  }

  const profile = authenticated?.profile;
  if (!profile || profile.role !== 'admin' || !isCanonicalUuid(profile.id)) return null;
  return profile;
}

async function actionClient(requestId, userMessage) {
  try {
    return { supabase: await createClient() };
  } catch (error) {
    return { failure: databaseFailure(error, requestId, userMessage) };
  }
}

async function runRpc(call) {
  try {
    return await call();
  } catch (error) {
    return { data: null, error };
  }
}

function revalidateAssignmentPaths(projectId) {
  revalidatePath('/admin');
  revalidatePath('/admin/projects');
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath('/team');
  revalidatePath(`/team/projects/${projectId}`);
  revalidatePath('/dashboard');
  revalidatePath(`/dashboard/projects/${projectId}`);
}

// Open (not delivered or cancelled) projects each manager is assigned to.
async function openProjectCounts(supabase, managerIds) {
  const counts = new Map();
  if (managerIds.length === 0) return counts;

  const { data: assignments, error } = await supabase
    .from('project_assignments')
    .select('user_id, project_id')
    .in('user_id', managerIds);
  if (error) return counts;

  const projectIds = [...new Set((assignments ?? []).map((row) => row.project_id))];
  if (projectIds.length === 0) return counts;

  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, status')
    .in('id', projectIds);
  if (projectsError) return counts;

  const openIds = new Set(
    (projects ?? [])
      .filter((project) => !CLOSED_PROJECT_STATUSES.has(project.status))
      .map((project) => project.id),
  );

  for (const row of assignments ?? []) {
    if (!openIds.has(row.project_id)) continue;
    counts.set(row.user_id, (counts.get(row.user_id) ?? 0) + 1);
  }
  return counts;
}

// Everyone with the project_manager role and how many open projects they
// already lead. Names only: a project manager's email address is never shown. The list is data-driven: inviting a manager
// from /admin/users adds them here, no code change needed.
export async function listProjectManagerCandidates() {
  const requestId = randomUUID();
  const profile = await adminProfile();
  if (!profile) return invalid(requestId, 'You are not authorized to view project managers.');

  const client = await actionClient(requestId, 'Unable to load project managers.');
  if (client.failure) return client.failure;
  const { supabase } = client;

  const { data: managers, error } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'project_manager')
    .order('full_name', { ascending: true });

  if (error) return databaseFailure(error, requestId, 'Unable to load project managers.');

  const ids = (managers ?? []).map((manager) => manager.id).filter(isCanonicalUuid);
  const counts = await openProjectCounts(supabase, ids);

  return success(requestId, {
    managers: (managers ?? [])
      .filter((manager) => isCanonicalUuid(manager.id))
      .map((manager) => ({
        id: manager.id,
        fullName: manager.full_name ?? null,
        openProjects: counts.get(manager.id) ?? 0,
      })),
  });
}

export async function setLeadProjectManager(formData) {
  const requestId = randomUUID();
  const profile = await adminProfile();
  if (!profile) return invalid(requestId, 'You are not authorized to assign projects.');

  const projectId = formString(formData, 'projectId');
  const userId = formString(formData, 'userId');
  if (!isCanonicalUuid(projectId) || !isCanonicalUuid(userId)) {
    return invalid(requestId, 'Choose a valid project and project manager.');
  }

  const client = await actionClient(requestId, 'Unable to assign this project.');
  if (client.failure) return client.failure;
  const { supabase } = client;

  // Status, the manager's role and the current assignments are read here,
  // never taken from the form.
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, status')
    .eq('id', projectId)
    .maybeSingle();
  if (projectError) return databaseFailure(projectError, requestId, 'Unable to assign this project.');
  if (!project) return invalid(requestId, 'Project not found.');

  const { data: manager, error: managerError } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('id', userId)
    .maybeSingle();
  if (managerError) return databaseFailure(managerError, requestId, 'Unable to assign this project.');
  if (!manager || manager.role !== 'project_manager') {
    return invalid(requestId, 'Choose a project manager.');
  }

  const { data: assignments, error: assignmentsError } = await supabase
    .from('project_assignments')
    .select('id, user_id, created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true });
  if (assignmentsError) {
    return databaseFailure(assignmentsError, requestId, 'Unable to assign this project.');
  }

  const assignedIds = new Set((assignments ?? []).map((row) => row.user_id));
  // The earliest assignment is the lead (lib/crm/projects.js loadPrimaryAssignees).
  const currentLeadId = assignments?.[0]?.user_id ?? null;
  const warnings = [];

  // assign_project_user upserts and sends the "you're the project manager"
  // email on every call. It is skipped only when this person already leads
  // the project; someone promoted from "also assigned" still gets the email,
  // and the upsert keeps their original created_at.
  const notified = currentLeadId !== userId;
  if (notified) {
    const { data, error } = await runRpc(() =>
      supabase.rpc('assign_project_user', {
        p_project_id: projectId,
        p_user_id: userId,
      }),
    );

    if (error || !isCanonicalUuid(data)) {
      return databaseFailure(error, requestId, 'Unable to assign this project.');
    }
  }

  for (const otherId of assignedIds) {
    if (otherId === userId) continue;

    const { data, error } = await runRpc(() =>
      supabase.rpc('remove_project_assignment', {
        p_project_id: projectId,
        p_user_id: otherId,
      }),
    );

    if (error || !isCanonicalUuid(data)) {
      console.error({ requestId, code: safeDatabaseCode(error) });
      warnings.push('A previous project manager could not be removed. Remove them from this page.');
    }
  }

  let movedToPlanned = false;
  if (project.status === 'brief_submitted' && canTransition('brief_submitted', 'planned')) {
    // Same wording as the client's "your project is planned" email, which
    // picks its line from the same project id.
    const name = (manager.full_name ?? '').trim().replace(/\s+/g, ' ').slice(0, MAX_NOTE_NAME_LENGTH);
    const note = managerAssignedNote(name, projectId);

    const { data, error } = await runRpc(() =>
      supabase.rpc('transition_project_status', {
        p_project_id: projectId,
        p_to_status: 'planned',
        p_note: note,
        p_visibility: 'shared',
      }),
    );

    if (error || !isCanonicalUuid(data)) {
      // The assignment itself succeeded, so this is reported as a warning,
      // not a failure.
      console.error({ requestId, code: safeDatabaseCode(error) });
      warnings.push('The project manager was assigned, but the project could not be moved to Planned. Move it from Admin Operations.');
    } else {
      movedToPlanned = true;
    }
  }

  revalidateAssignmentPaths(projectId);
  return success(requestId, { movedToPlanned, notified, warnings });
}
