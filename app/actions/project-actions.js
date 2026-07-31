'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';

import { getAuthenticatedProfile } from '@/lib/auth/require-role';
import {
  MESSAGE_VISIBILITIES,
  PROJECT_STATUSES,
  canPostVisibility,
  canTransition,
  isProjectCategory,
  normalizeProjectTitle,
} from '@/lib/crm/project-contract.mjs';
import { createClient } from '@/lib/supabase/server';

const CANONICAL_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const MAX_BRIEF_LENGTH = 5000;
const MAX_MESSAGE_LENGTH = 10000;
const MAX_STATUS_NOTE_LENGTH = 2000;
const MAX_FILE_NAME_LENGTH = 255;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_FILE_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
  'text/plain',
]);

function isCanonicalUuid(value) {
  return typeof value === 'string' && CANONICAL_UUID_PATTERN.test(value);
}

function formString(formData, name) {
  const value = formData?.get(name);
  return typeof value === 'string' ? value : '';
}

function optionalFormString(formData, name) {
  const value = formString(formData, name).trim();
  return value || null;
}

function validDateOnly(value) {
  if (value === null) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validBoundedText(value, minimum, maximum) {
  const length = typeof value === 'string' ? value.trim().length : 0;
  return length >= minimum && length <= maximum;
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

async function authenticatedProfile(allowedRoles) {
  let authenticated;
  try {
    authenticated = await getAuthenticatedProfile();
  } catch {
    return null;
  }

  const profile = authenticated?.profile;
  if (!profile || !allowedRoles.includes(profile.role)) return null;
  if (!isCanonicalUuid(profile.id)) return null;
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

function revalidateClientProject(projectId) {
  revalidatePath('/dashboard');
  revalidatePath(`/dashboard/projects/${projectId}`);
}

function revalidateAssignmentPaths(projectId) {
  revalidatePath('/admin/projects');
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath('/team');
  revalidatePath(`/team/projects/${projectId}`);
}

function revalidateAllProjectPaths(projectId) {
  revalidatePath('/dashboard');
  revalidatePath(`/dashboard/projects/${projectId}`);
  revalidatePath('/team');
  revalidatePath(`/team/projects/${projectId}`);
  revalidatePath('/admin/projects');
  revalidatePath(`/admin/projects/${projectId}`);
}

function reservationData(row) {
  const attachment = Array.isArray(row) ? row[0] : row;
  if (!attachment || !isCanonicalUuid(attachment.id)) return null;

  return {
    attachmentId: attachment.id,
    projectId: attachment.project_id,
    visibility: attachment.visibility,
    fileName: attachment.file_name,
    storagePath: attachment.storage_path,
    mimeType: attachment.mime_type,
    sizeBytes: attachment.size_bytes,
    status: attachment.status,
  };
}

function attachmentIdsFrom(formData) {
  const values =
    typeof formData?.getAll === 'function' ? formData.getAll('attachmentIds') : [];

  if (values.length === 1 && typeof values[0] === 'string' && values[0].trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(values[0]);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  return values;
}

export async function createProject(formData) {
  const requestId = randomUUID();
  const profile = await authenticatedProfile(['client']);
  if (!profile || !isCanonicalUuid(profile.company_id)) {
    return invalid(requestId, 'You are not authorized to create a project.');
  }

  const category = formString(formData, 'category');
  const brief = formString(formData, 'brief').trim();
  const targetDate = optionalFormString(formData, 'targetDate');
  let title;

  try {
    title = normalizeProjectTitle(formString(formData, 'title'));
  } catch {
    return invalid(requestId, 'Project title must be 3 to 120 characters.');
  }

  if (!isProjectCategory(category)) {
    return invalid(requestId, 'Choose a valid project category.');
  }
  if (!validBoundedText(brief, 1, MAX_BRIEF_LENGTH)) {
    return invalid(requestId, 'Project brief must be 1 to 5000 characters.');
  }
  if (!validDateOnly(targetDate)) {
    return invalid(requestId, 'Choose a valid target date.');
  }

  const client = await actionClient(requestId, 'Unable to create the project.');
  if (client.failure) return client.failure;

  const { data, error } = await runRpc(() =>
    client.supabase.rpc('create_project', {
      p_company_id: profile.company_id,
      p_category: category,
      p_title: title,
      p_brief: brief,
      p_target_date: targetDate,
      p_source_deal_id: null,
    }),
  );

  if (error || !isCanonicalUuid(data)) {
    return databaseFailure(error, requestId, 'Unable to create the project.');
  }

  revalidateClientProject(data);
  return success(requestId, { projectId: data });
}

export async function assignProject(formData) {
  const requestId = randomUUID();
  const profile = await authenticatedProfile(['admin']);
  if (!profile) return invalid(requestId, 'You are not authorized to assign projects.');

  const projectId = formString(formData, 'projectId');
  const userId = formString(formData, 'userId');
  if (!isCanonicalUuid(projectId) || !isCanonicalUuid(userId)) {
    return invalid(requestId, 'Choose a valid project and assignee.');
  }

  const client = await actionClient(requestId, 'Unable to assign this project.');
  if (client.failure) return client.failure;
  const { data, error } = await runRpc(() =>
    client.supabase.rpc('assign_project_user', {
      p_project_id: projectId,
      p_user_id: userId,
    }),
  );

  if (error || !isCanonicalUuid(data)) {
    return databaseFailure(error, requestId, 'Unable to assign this project.');
  }

  revalidateAssignmentPaths(projectId);
  return success(requestId, { assignmentId: data });
}

export async function removeProjectAssignment(formData) {
  const requestId = randomUUID();
  const profile = await authenticatedProfile(['admin']);
  if (!profile) return invalid(requestId, 'You are not authorized to remove assignments.');

  const projectId = formString(formData, 'projectId');
  const userId = formString(formData, 'userId');
  if (!isCanonicalUuid(projectId) || !isCanonicalUuid(userId)) {
    return invalid(requestId, 'Choose a valid project and assignee.');
  }

  const client = await actionClient(requestId, 'Unable to remove this assignment.');
  if (client.failure) return client.failure;
  const { data, error } = await runRpc(() =>
    client.supabase.rpc('remove_project_assignment', {
      p_project_id: projectId,
      p_user_id: userId,
    }),
  );

  if (error || !isCanonicalUuid(data)) {
    return databaseFailure(error, requestId, 'Unable to remove this assignment.');
  }

  revalidateAssignmentPaths(projectId);
  return success(requestId, { assignmentId: data });
}

export async function transitionProject(formData) {
  const requestId = randomUUID();
  const profile = await authenticatedProfile(['project_manager', 'admin']);
  if (!profile) return invalid(requestId, 'You are not authorized to update project status.');

  const projectId = formString(formData, 'projectId');
  const fromStatus = formString(formData, 'fromStatus');
  const toStatus = formString(formData, 'toStatus');
  const visibility = formString(formData, 'visibility') || 'shared';
  const note = optionalFormString(formData, 'note');

  if (!isCanonicalUuid(projectId)) {
    return invalid(requestId, 'Choose a valid project.');
  }
  if (
    !PROJECT_STATUSES.includes(fromStatus) ||
    !PROJECT_STATUSES.includes(toStatus) ||
    !canTransition(fromStatus, toStatus)
  ) {
    return invalid(requestId, 'Choose a valid project status transition.');
  }
  if (
    !MESSAGE_VISIBILITIES.includes(visibility) ||
    !canPostVisibility(profile.role, visibility)
  ) {
    return invalid(requestId, 'Choose a valid status visibility.');
  }
  if (note !== null && note.length > MAX_STATUS_NOTE_LENGTH) {
    return invalid(requestId, 'Status note must be at most 2000 characters.');
  }

  const client = await actionClient(requestId, 'Unable to update project status.');
  if (client.failure) return client.failure;
  const { data, error } = await runRpc(() =>
    client.supabase.rpc('transition_project_status', {
      p_project_id: projectId,
      p_to_status: toStatus,
      p_note: note,
      p_visibility: visibility,
    }),
  );

  if (error || !isCanonicalUuid(data)) {
    return databaseFailure(error, requestId, 'Unable to update project status.');
  }

  revalidateAllProjectPaths(projectId);
  return success(requestId, { historyId: data });
}

export async function reserveAttachment(formData) {
  const requestId = randomUUID();
  const profile = await authenticatedProfile(['client', 'project_manager', 'admin']);
  if (!profile) return invalid(requestId, 'You are not authorized to upload files.');

  const projectId = formString(formData, 'projectId');
  const visibility = formString(formData, 'visibility') || 'shared';
  const fileName = formString(formData, 'fileName').trim();
  const mimeType = formString(formData, 'mimeType').trim().toLowerCase();
  const sizeText = formString(formData, 'sizeBytes');
  const sizeBytes = /^\d+$/.test(sizeText) ? Number(sizeText) : Number.NaN;

  if (!isCanonicalUuid(projectId)) {
    return invalid(requestId, 'Choose a valid project.');
  }
  if (
    !MESSAGE_VISIBILITIES.includes(visibility) ||
    !canPostVisibility(profile.role, visibility)
  ) {
    return invalid(requestId, 'Choose a valid file visibility.');
  }
  if (!validBoundedText(fileName, 1, MAX_FILE_NAME_LENGTH)) {
    return invalid(requestId, 'File name must be 1 to 255 characters.');
  }
  if (!ALLOWED_FILE_TYPES.has(mimeType)) {
    return invalid(requestId, 'This file type is not supported.');
  }
  if (!Number.isSafeInteger(sizeBytes) || sizeBytes < 1 || sizeBytes > MAX_FILE_SIZE_BYTES) {
    return invalid(requestId, 'File must be no larger than 10 MiB.');
  }

  const client = await actionClient(requestId, 'Unable to reserve this upload.');
  if (client.failure) return client.failure;
  const { data, error } = await runRpc(() =>
    client.supabase.rpc('reserve_project_attachment', {
      p_project_id: projectId,
      p_visibility: visibility,
      p_file_name: fileName,
      p_mime_type: mimeType,
      p_size_bytes: sizeBytes,
    }),
  );

  const attachment = reservationData(data);
  if (error || !attachment) {
    return databaseFailure(error, requestId, 'Unable to reserve this upload.');
  }

  revalidateAllProjectPaths(projectId);
  return success(requestId, attachment);
}

export async function postProjectMessage(formData) {
  const requestId = randomUUID();
  const profile = await authenticatedProfile(['client', 'project_manager', 'admin']);
  if (!profile) return invalid(requestId, 'You are not authorized to post messages.');

  const projectId = formString(formData, 'projectId');
  const visibility = formString(formData, 'visibility') || 'shared';
  const body = formString(formData, 'body').trim();
  const suppliedClientId = optionalFormString(formData, 'clientGeneratedId');
  const clientGeneratedId = suppliedClientId ?? randomUUID();
  const attachmentIds = attachmentIdsFrom(formData);

  if (!isCanonicalUuid(projectId)) {
    return invalid(requestId, 'Choose a valid project.');
  }
  if (
    !MESSAGE_VISIBILITIES.includes(visibility) ||
    !canPostVisibility(profile.role, visibility)
  ) {
    return invalid(requestId, 'Choose a valid message visibility.');
  }
  if (!validBoundedText(body, 1, MAX_MESSAGE_LENGTH)) {
    return invalid(requestId, 'Message must be 1 to 10000 characters.');
  }
  if (!isCanonicalUuid(clientGeneratedId)) {
    return invalid(requestId, 'Unable to prepare this message.');
  }
  if (
    !attachmentIds ||
    attachmentIds.some((id) => !isCanonicalUuid(id)) ||
    new Set(attachmentIds).size !== attachmentIds.length
  ) {
    return invalid(requestId, 'Choose valid, unique attachments.');
  }

  const client = await actionClient(requestId, 'Unable to post this message.');
  if (client.failure) return client.failure;
  const { data, error } = await runRpc(() =>
    client.supabase.rpc('post_project_message', {
      p_project_id: projectId,
      p_body: body,
      p_visibility: visibility,
      p_client_generated_id: clientGeneratedId,
      p_attachment_ids: attachmentIds,
    }),
  );

  if (error || !isCanonicalUuid(data)) {
    return databaseFailure(error, requestId, 'Unable to post this message.');
  }

  revalidateAllProjectPaths(projectId);
  return success(requestId, { messageId: data, clientGeneratedId });
}

export async function finalizeAttachment(formData) {
  const requestId = randomUUID();
  const profile = await authenticatedProfile(['client', 'project_manager', 'admin']);
  if (!profile) return invalid(requestId, 'You are not authorized to finalize files.');

  const projectId = formString(formData, 'projectId');
  const attachmentId = formString(formData, 'attachmentId');
  if (!isCanonicalUuid(projectId) || !isCanonicalUuid(attachmentId)) {
    return invalid(requestId, 'Choose a valid project attachment.');
  }

  const client = await actionClient(requestId, 'Unable to finalize this upload.');
  if (client.failure) return client.failure;
  const { data, error } = await runRpc(() =>
    client.supabase.rpc('finalize_project_attachment', {
      p_attachment_id: attachmentId,
    }),
  );

  if (error || data !== attachmentId) {
    return databaseFailure(error, requestId, 'Unable to finalize this upload.');
  }

  revalidateAllProjectPaths(projectId);
  return success(requestId, { attachmentId: data });
}
