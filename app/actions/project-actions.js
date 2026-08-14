'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';

import { getAuthenticatedProfile } from '@/lib/auth/require-role';
import {
  MESSAGE_VISIBILITIES,
  PROJECT_STATUSES,
  TASK_PRIORITIES,
  TASK_STATUSES,
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

export async function editProjectMessage(formData) {
  const requestId = randomUUID();
  const profile = await authenticatedProfile(['client', 'project_manager', 'admin']);
  if (!profile) return invalid(requestId, 'You are not authorized to edit messages.');

  const projectId = formString(formData, 'projectId');
  const messageId = formString(formData, 'messageId');
  const body = formString(formData, 'body').trim();

  if (!isCanonicalUuid(projectId)) {
    return invalid(requestId, 'Choose a valid project.');
  }
  if (!isCanonicalUuid(messageId)) {
    return invalid(requestId, 'Choose a valid message.');
  }
  if (!validBoundedText(body, 1, MAX_MESSAGE_LENGTH)) {
    return invalid(requestId, 'Message must be 1 to 10000 characters.');
  }

  const client = await actionClient(requestId, 'Unable to edit this message.');
  if (client.failure) return client.failure;
  const { data, error } = await runRpc(() =>
    client.supabase.rpc('update_project_message', {
      p_message_id: messageId,
      p_body: body,
    }),
  );

  if (error || !isCanonicalUuid(data)) {
    return databaseFailure(error, requestId, 'Unable to edit this message.');
  }

  revalidateAllProjectPaths(projectId);
  return success(requestId, { messageId: data });
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

export async function createProjectTask(formData) {
  const requestId = randomUUID();
  const profile = await authenticatedProfile(['client', 'project_manager', 'admin']);
  if (!profile) return invalid(requestId, 'You are not authorized to create tasks.');

  const projectId = formString(formData, 'projectId');
  const title = formString(formData, 'title').trim();
  const description = optionalFormString(formData, 'description') ?? '';
  const status = formString(formData, 'status') || 'todo';
  const assigneeId = optionalFormString(formData, 'assigneeId');
  const dueDate = optionalFormString(formData, 'dueDate');
  const priority = formString(formData, 'priority') || 'medium';
  const clientVisible = formString(formData, 'clientVisible') === 'true';

  if (!isCanonicalUuid(projectId)) {
    return invalid(requestId, 'Choose a valid project.');
  }
  if (!validBoundedText(title, 1, 255)) {
    return invalid(requestId, 'Task title must be 1 to 255 characters.');
  }
  if (!validBoundedText(description, 0, 10000)) {
    return invalid(requestId, 'Task description must be at most 10000 characters.');
  }
  if (!['todo', 'in_progress', 'review', 'done', 'blocked'].includes(status)) {
    return invalid(requestId, 'Choose a valid task status.');
  }
  if (!TASK_PRIORITIES.includes(priority)) {
    return invalid(requestId, 'Choose a valid task priority.');
  }
  if (dueDate !== null && !validDateOnly(dueDate)) {
    return invalid(requestId, 'Choose a valid due date.');
  }

  const client = await actionClient(requestId, 'Unable to create this task.');
  if (client.failure) return client.failure;
  const { data, error } = await runRpc(() =>
    client.supabase.rpc('create_project_task', {
      p_project_id: projectId,
      p_title: title,
      p_description: description,
      p_status: status,
      p_assignee_id: assigneeId,
      p_due_date: dueDate,
      p_priority: priority,
      p_client_visible: clientVisible,
    }),
  );

  if (error || !isCanonicalUuid(data)) {
    return databaseFailure(error, requestId, 'Unable to create this task.');
  }

  revalidateAllProjectPaths(projectId);
  return success(requestId, { taskId: data });
}

export async function updateProjectTask(formData) {
  const requestId = randomUUID();
  const profile = await authenticatedProfile(['client', 'project_manager', 'admin']);
  if (!profile) return invalid(requestId, 'You are not authorized to update tasks.');

  const taskId = formString(formData, 'taskId');
  const title = optionalFormString(formData, 'title');
  const description = optionalFormString(formData, 'description');
  const status = optionalFormString(formData, 'status');
  const assigneeId = optionalFormString(formData, 'assigneeId');
  const dueDate = optionalFormString(formData, 'dueDate');

  if (!isCanonicalUuid(taskId)) {
    return invalid(requestId, 'Choose a valid task.');
  }
  if (title !== null && !validBoundedText(title, 1, 255)) {
    return invalid(requestId, 'Task title must be 1 to 255 characters.');
  }
  if (description !== null && !validBoundedText(description, 0, 10000)) {
    return invalid(requestId, 'Task description must be at most 10000 characters.');
  }
  if (status !== null && !TASK_STATUSES.includes(status)) {
    return invalid(requestId, 'Choose a valid task status.');
  }
  if (dueDate !== null && !validDateOnly(dueDate)) {
    return invalid(requestId, 'Choose a valid due date.');
  }

  const client = await actionClient(requestId, 'Unable to update this task.');
  if (client.failure) return client.failure;
  const { data, error } = await runRpc(() =>
    client.supabase.rpc('update_project_task', {
      p_task_id: taskId,
      p_title: title,
      p_description: description,
      p_status: status,
      p_assignee_id: assigneeId,
      p_due_date: dueDate,
    }),
  );

  if (error || !isCanonicalUuid(data)) {
    return databaseFailure(error, requestId, 'Unable to update this task.');
  }

  revalidateAllProjectPaths(data);
  return success(requestId, { taskId: data });
}

export async function createProjectApproval(formData) {
  const requestId = randomUUID();
  const profile = await authenticatedProfile(['client', 'project_manager', 'admin']);
  if (!profile) return invalid(requestId, 'You are not authorized to request approvals.');

  const projectId = formString(formData, 'projectId');
  const deliverableId = optionalFormString(formData, 'deliverableId');
  const note = optionalFormString(formData, 'note');

  if (!isCanonicalUuid(projectId)) {
    return invalid(requestId, 'Choose a valid project.');
  }
  if (deliverableId !== null && !isCanonicalUuid(deliverableId)) {
    return invalid(requestId, 'Choose a valid deliverable.');
  }
  if (note !== null && note.length > 2000) {
    return invalid(requestId, 'Approval note must be at most 2000 characters.');
  }

  const client = await actionClient(requestId, 'Unable to request this approval.');
  if (client.failure) return client.failure;
  const { data, error } = await runRpc(() =>
    client.supabase.rpc('create_project_approval', {
      p_project_id: projectId,
      p_deliverable_id: deliverableId,
      p_note: note,
    }),
  );

  if (error || !isCanonicalUuid(data)) {
    return databaseFailure(error, requestId, 'Unable to request this approval.');
  }

  revalidateAllProjectPaths(projectId);
  return success(requestId, { approvalId: data });
}

export async function updateProjectApproval(formData) {
  const requestId = randomUUID();
  const profile = await authenticatedProfile(['project_manager', 'admin']);
  if (!profile) return invalid(requestId, 'You are not authorized to review approvals.');

  const projectId = formString(formData, 'projectId');
  const approvalId = formString(formData, 'approvalId');
  const status = formString(formData, 'status');
  const note = optionalFormString(formData, 'note');

  if (!isCanonicalUuid(projectId) || !isCanonicalUuid(approvalId)) {
    return invalid(requestId, 'Choose a valid project approval.');
  }
  if (!['approved', 'rejected'].includes(status)) {
    return invalid(requestId, 'Approval status must be approved or rejected.');
  }
  if (note !== null && note.length > 2000) {
    return invalid(requestId, 'Approval note must be at most 2000 characters.');
  }

  const client = await actionClient(requestId, 'Unable to review this approval.');
  if (client.failure) return client.failure;
  const { data, error } = await runRpc(() =>
    client.supabase.rpc('update_project_approval', {
      p_approval_id: approvalId,
      p_status: status,
      p_note: note,
    }),
  );

  if (error || !isCanonicalUuid(data)) {
    return databaseFailure(error, requestId, 'Unable to review this approval.');
  }

  revalidateAllProjectPaths(projectId);
  return success(requestId, { approvalId: data });
}

export async function publishDeliverable(formData) {
  const requestId = randomUUID();
  const profile = await authenticatedProfile(['client', 'project_manager', 'admin']);
  if (!profile) return invalid(requestId, 'You are not authorized to publish deliverables.');

  const projectId = formString(formData, 'projectId');
  const deliverableId = formString(formData, 'deliverableId');
  const status = formString(formData, 'status') || 'submitted';

  if (!isCanonicalUuid(projectId) || !isCanonicalUuid(deliverableId)) {
    return invalid(requestId, 'Choose a valid project deliverable.');
  }
  if (!['submitted', 'approved', 'rejected'].includes(status)) {
    return invalid(requestId, 'Choose a valid deliverable status.');
  }

  const client = await actionClient(requestId, 'Unable to publish this deliverable.');
  if (client.failure) return client.failure;
  const { data, error } = await runRpc(() =>
    client.supabase.rpc('publish_project_deliverable', {
      p_deliverable_id: deliverableId,
      p_status: status,
    }),
  );

  if (error || !isCanonicalUuid(data)) {
    return databaseFailure(error, requestId, 'Unable to publish this deliverable.');
  }

  revalidateAllProjectPaths(projectId);
  return success(requestId, { deliverableId: data });
}

function deliverableData(row) {
  const deliverable = Array.isArray(row) ? row[0] : row;
  if (!deliverable || !isCanonicalUuid(deliverable.id)) return null;

  return {
    deliverableId: deliverable.id,
    projectId: deliverable.project_id,
    title: deliverable.title,
    description: deliverable.description,
    fileName: deliverable.file_name,
    storagePath: deliverable.storage_path,
    mimeType: deliverable.mime_type,
    sizeBytes: deliverable.size_bytes,
    status: deliverable.status,
    visibility: deliverable.visibility,
    version: deliverable.version,
  };
}

export async function createProjectDeliverable(formData) {
  const requestId = randomUUID();
  const profile = await authenticatedProfile(['client', 'project_manager', 'admin']);
  if (!profile) return invalid(requestId, 'You are not authorized to create deliverables.');

  const projectId = formString(formData, 'projectId');
  const visibility = formString(formData, 'visibility') || 'shared';
  const title = formString(formData, 'title').trim();
  const description = optionalFormString(formData, 'description') ?? '';
  const fileName = formString(formData, 'fileName').trim();
  const mimeType = formString(formData, 'mimeType').trim().toLowerCase();
  const sizeText = formString(formData, 'sizeBytes');
  const sizeBytes = /^\d+$/.test(sizeText) ? Number(sizeText) : Number.NaN;
  const version = optionalFormString(formData, 'version') ?? '1';

  if (!isCanonicalUuid(projectId)) {
    return invalid(requestId, 'Choose a valid project.');
  }
  if (
    !MESSAGE_VISIBILITIES.includes(visibility) ||
    !canPostVisibility(profile.role, visibility)
  ) {
    return invalid(requestId, 'Choose a valid deliverable visibility.');
  }
  if (!validBoundedText(title, 1, 255)) {
    return invalid(requestId, 'Title must be 1 to 255 characters.');
  }
  if (!validBoundedText(description, 0, 10000)) {
    return invalid(requestId, 'Description must be at most 10000 characters.');
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
  if (!validBoundedText(version, 1, 32)) {
    return invalid(requestId, 'Version must be 1 to 32 characters.');
  }

  const client = await actionClient(requestId, 'Unable to create this deliverable.');
  if (client.failure) return client.failure;
  const { data, error } = await runRpc(() =>
    client.supabase.rpc('create_project_deliverable', {
      p_project_id: projectId,
      p_title: title,
      p_file_name: fileName,
      p_mime_type: mimeType,
      p_size_bytes: sizeBytes,
      p_description: description,
      p_visibility: visibility,
      p_version: version,
    }),
  );

  const deliverable = deliverableData(data);
  if (error || !deliverable) {
    return databaseFailure(error, requestId, 'Unable to create this deliverable.');
  }

  revalidateAllProjectPaths(projectId);
  return success(requestId, deliverable);
}

export async function postProjectNote(formData) {
  const requestId = randomUUID();
  const profile = await authenticatedProfile(['client', 'project_manager', 'admin']);
  if (!profile) return invalid(requestId, 'You are not authorized to post notes.');

  const projectId = formString(formData, 'projectId');
  const visibility = formString(formData, 'visibility') || 'shared';
  const note = formString(formData, 'note').trim();

  if (!isCanonicalUuid(projectId)) {
    return invalid(requestId, 'Choose a valid project.');
  }
  if (
    !MESSAGE_VISIBILITIES.includes(visibility) ||
    !canPostVisibility(profile.role, visibility)
  ) {
    return invalid(requestId, 'Choose a valid note visibility.');
  }
  if (!validBoundedText(note, 1, MAX_STATUS_NOTE_LENGTH)) {
    return invalid(requestId, 'Note must be 1 to 2000 characters.');
  }

  const client = await actionClient(requestId, 'Unable to post this note.');
  if (client.failure) return client.failure;
  const { data, error } = await runRpc(() =>
    client.supabase.rpc('post_project_note', {
      p_project_id: projectId,
      p_note: note,
      p_visibility: visibility,
    }),
  );

  if (error || !isCanonicalUuid(data)) {
    return databaseFailure(error, requestId, 'Unable to post this note.');
  }

  revalidateAllProjectPaths(projectId);
  return success(requestId, { historyId: data });
}

export async function enqueueNotification(formData) {
  const requestId = randomUUID();
  const profile = await authenticatedProfile(['client', 'project_manager', 'admin']);
  if (!profile) return invalid(requestId, 'You are not authorized to send notifications.');

  const projectId = formString(formData, 'projectId');
  const channel = formString(formData, 'channel');
  const eventType = formString(formData, 'eventType').trim();
  const payload = optionalFormString(formData, 'payload') ?? '{}';
  const userId = optionalFormString(formData, 'userId');

  if (!isCanonicalUuid(projectId)) {
    return invalid(requestId, 'Choose a valid project.');
  }
  if (userId !== null && !isCanonicalUuid(userId)) {
    return invalid(requestId, 'Choose a valid notification recipient.');
  }
  if (!['email', 'in_app', 'realtime'].includes(channel)) {
    return invalid(requestId, 'Choose a valid notification channel.');
  }
  if (!validBoundedText(eventType, 1, 120)) {
    return invalid(requestId, 'Event type must be 1 to 120 characters.');
  }

  let parsedPayload = {};
  if (payload) {
    try {
      parsedPayload = JSON.parse(payload);
    } catch {
      return invalid(requestId, 'Notification payload must be valid JSON.');
    }
  }

  const client = await actionClient(requestId, 'Unable to enqueue this notification.');
  if (client.failure) return client.failure;
  const { data, error } = await runRpc(() =>
    client.supabase.rpc('enqueue_project_notification', {
      p_project_id: projectId,
      p_channel: channel,
      p_event_type: eventType,
      p_payload: parsedPayload,
      p_user_id: userId,
    }),
  );

  if (error || !isCanonicalUuid(data)) {
    return databaseFailure(error, requestId, 'Unable to enqueue this notification.');
  }

  revalidateAllProjectPaths(projectId);
  return success(requestId, { notificationId: data });
}
