const DEFAULT_MESSAGE_LIMIT = 50;
const MAX_MESSAGE_LIMIT = 100;

const CANONICAL_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const VIEWER_ROLES = new Set(['client', 'project_manager', 'admin']);

const PROJECT_FIELDS = [
  'id',
  'company_id',
  'source_deal_id',
  'category',
  'title',
  'brief',
  'status',
  'target_date',
  'budget_amount',
  'currency',
  'created_by',
  'created_at',
  'updated_at',
].join(', ');

const THREAD_FIELDS = 'id, project_id, created_at';
const ASSIGNMENT_FIELDS = 'id, project_id, user_id, assigned_by, created_at';
const MESSAGE_FIELDS =
  'id, thread_id, sender_id, visibility, body, client_generated_id, created_at, edited_at, edited_by';
const ATTACHMENT_FIELDS =
  'id, project_id, message_id, uploaded_by, visibility, file_name, storage_path, mime_type, size_bytes, status, created_at';
const HISTORY_FIELDS =
  'id, project_id, from_status, to_status, note, visibility, changed_by, created_at';
const TASK_FIELDS =
  'id, project_id, title, description, status, priority, client_visible, assignee_id, created_by, due_date, completed_at, created_at, updated_at';
const APPROVAL_FIELDS =
  'id, project_id, deliverable_id, status, requested_by, reviewed_by, note, created_at, updated_at';
const DELIVERABLE_FIELDS =
  'id, project_id, title, description, version, file_name, storage_path, mime_type, size_bytes, status, visibility, created_by, created_at';
const NOTIFICATION_FIELDS =
  'id, project_id, user_id, channel, event_type, payload, status, sent_at, created_at';

function failRead(message) {
  throw new Error(message);
}

function requireViewer(profile) {
  const viewer = profile?.profile ?? profile;

  if (
    !viewer ||
    !CANONICAL_UUID_PATTERN.test(viewer.id ?? '') ||
    !VIEWER_ROLES.has(viewer.role)
  ) {
    failRead('Unable to authorize project access.');
  }

  if (
    viewer.role === 'client' &&
    !CANONICAL_UUID_PATTERN.test(viewer.company_id ?? '')
  ) {
    failRead('Unable to authorize project access.');
  }

  return viewer;
}

function requireProjectId(projectId) {
  if (!CANONICAL_UUID_PATTERN.test(projectId ?? '')) {
    failRead('Unable to load this project.');
  }
}

function boundedLimit(limit) {
  if (limit === undefined || limit === null || limit === '') {
    return DEFAULT_MESSAGE_LIMIT;
  }

  const parsed = Number(limit);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return DEFAULT_MESSAGE_LIMIT;
  }

  return Math.min(parsed, MAX_MESSAGE_LIMIT);
}

function normalizedCursor(cursor) {
  if (cursor === undefined || cursor === null) return null;

  const createdAt = cursor.createdAt ?? cursor.created_at;
  const id = cursor.id;
  const date = typeof createdAt === 'string' ? new Date(createdAt) : null;

  if (
    !date ||
    Number.isNaN(date.getTime()) ||
    !CANONICAL_UUID_PATTERN.test(id ?? '')
  ) {
    failRead('Unable to load project messages.');
  }

  return { createdAt: date.toISOString(), id };
}

function clientSafeProject(project, role) {
  if (role !== 'client') return project;

  return {
    id: project.id,
    company_id: project.company_id,
    category: project.category,
    title: project.title,
    brief: project.brief,
    status: project.status,
    target_date: project.target_date,
    created_at: project.created_at,
    updated_at: project.updated_at,
    budget_amount: project.budget_amount,
    currency: project.currency,
  };
}

function sharedOnly(rows, role) {
  return role === 'client'
    ? (rows ?? []).filter((row) => row.visibility === 'shared')
    : (rows ?? []);
}

function clientVisibleOnly(tasks, role) {
  return role === 'client'
    ? (tasks ?? []).filter((task) => task.client_visible)
    : (tasks ?? []);
}

function publicProfile(profile) {
  if (!profile) return null;
  return {
    id: profile.id,
    full_name: profile.full_name,
    avatar_url: profile.avatar_url,
  };
}

function mapProfiles(profiles) {
  return new Map((profiles ?? []).map((profile) => [profile.id, publicProfile(profile)]));
}

function collectActorIds(project, assignments, history, messages, attachments, tasks, approvals, deliverables) {
  const ids = new Set();

  if (project?.created_by) ids.add(project.created_by);
  for (const assignment of assignments ?? []) {
    if (assignment.user_id) ids.add(assignment.user_id);
    if (assignment.assigned_by) ids.add(assignment.assigned_by);
  }
  for (const event of history ?? []) {
    if (event.changed_by) ids.add(event.changed_by);
  }
  for (const message of messages ?? []) {
    if (message.sender_id) ids.add(message.sender_id);
  }
  for (const attachment of attachments ?? []) {
    if (attachment.uploaded_by) ids.add(attachment.uploaded_by);
  }
  for (const task of tasks ?? []) {
    if (task.created_by) ids.add(task.created_by);
    if (task.assignee_id) ids.add(task.assignee_id);
  }
  for (const approval of approvals ?? []) {
    if (approval.requested_by) ids.add(approval.requested_by);
    if (approval.reviewed_by) ids.add(approval.reviewed_by);
  }
  for (const deliverable of deliverables ?? []) {
    if (deliverable.created_by) ids.add(deliverable.created_by);
  }

  return [...ids];
}

async function loadProfiles(supabase, actorIds) {
  if (actorIds.length === 0) return new Map();

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', actorIds);

  if (error) failRead('Unable to load project participants.');
  return mapProfiles(profiles);
}

function attachMessageProfiles(messages, profilesById) {
  return messages.map((message) => ({
    ...message,
    sender: profilesById.get(message.sender_id) ?? null,
  }));
}

// Pagination is driven by the raw page straight from the query, never by the
// visibility-filtered list. `rawPage` arrives newest-first, so its last row is
// the oldest one on the page and the true boundary for the next fetch.
// Measuring a filtered array against the requested limit would read a
// partly-filtered full page as "no older messages" and silently truncate
// history, and would also hand back a boundary newer than the page really
// reached.
function nextMessageCursor(rawPage, requestedLimit) {
  const rows = rawPage ?? [];
  if (rows.length < requestedLimit) return null;
  const oldest = rows[rows.length - 1];
  return {
    createdAt: oldest.created_at,
    id: oldest.id,
  };
}

function rethrowUnknownReadFailure(error, message) {
  if (error instanceof Error && error.message === message) throw error;
  failRead(message);
}

export async function listProjectsForViewer(supabase, profile) {
  const viewer = requireViewer(profile);

  try {
    let projectQuery = supabase
      .from('projects')
      .select(PROJECT_FIELDS)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false });

    if (viewer.role === 'client') {
      projectQuery = projectQuery.eq('company_id', viewer.company_id);
    } else if (viewer.role === 'project_manager') {
      const { data: assignments, error } = await supabase
        .from('project_assignments')
        .select('project_id')
        .eq('user_id', viewer.id);

      if (error) failRead('Unable to load projects.');

      const projectIds = [...new Set((assignments ?? []).map((row) => row.project_id))];
      if (projectIds.length === 0) return [];
      projectQuery = projectQuery.in('id', projectIds);
    }

    const { data: projects, error } = await projectQuery;
    if (error) failRead('Unable to load projects.');

    const projectIds = (projects ?? []).map((project) => project.id);
    const assigneeByProject = await loadPrimaryAssignees(supabase, projectIds);

    return (projects ?? []).map((project) => ({
      ...clientSafeProject(project, viewer.role),
      assignee: assigneeByProject.get(project.id) ?? null,
    }));
  } catch (error) {
    rethrowUnknownReadFailure(error, 'Unable to load projects.');
  }
}

// One project can have more than one project_manager assignment; the list
// view only has room for one name, so this surfaces the earliest (first
// assigned) one — same "primary" convention the admin project-detail page
// uses when it lists assignees in creation order.
async function loadPrimaryAssignees(supabase, projectIds) {
  const map = new Map();
  if (projectIds.length === 0) return map;

  const { data: assignments, error } = await supabase
    .from('project_assignments')
    .select('project_id, user_id, created_at')
    .in('project_id', projectIds)
    .order('created_at', { ascending: true });

  if (error) failRead('Unable to load project assignments.');

  const firstAssignmentByProject = new Map();
  for (const assignment of assignments ?? []) {
    if (!firstAssignmentByProject.has(assignment.project_id)) {
      firstAssignmentByProject.set(assignment.project_id, assignment.user_id);
    }
  }

  const userIds = [...new Set(firstAssignmentByProject.values())];
  const profilesById = await loadProfiles(supabase, userIds);

  for (const [projectId, userId] of firstAssignmentByProject) {
    map.set(projectId, profilesById.get(userId) ?? null);
  }
  return map;
}

// listProjectsForViewer scopes project managers to the projects they are
// actually assigned to. The detail path has to apply that same boundary
// itself instead of leaning on RLS (private.can_access_project) as its only
// gate -- every other read in this module keys off a projectId that already
// passed through here, so this is the one place the scope is decided.
// Mirrors the database's own per-role logic and fails closed: a PM with no
// assignment row for this project reads as "not found", never as access.
async function isAssignedProjectManager(supabase, viewer, projectId) {
  const { data, error } = await supabase
    .from('project_assignments')
    .select('project_id')
    .eq('project_id', projectId)
    .eq('user_id', viewer.id)
    .limit(1);

  if (error) failRead('Unable to load this project.');
  return (data ?? []).length > 0;
}

async function loadProjectForViewer(supabase, viewer, projectId) {
  if (
    viewer.role === 'project_manager' &&
    !(await isAssignedProjectManager(supabase, viewer, projectId))
  ) {
    return null;
  }

  let query = supabase
    .from('projects')
    .select(PROJECT_FIELDS)
    .eq('id', projectId);

  if (viewer.role === 'client') {
    query = query.eq('company_id', viewer.company_id);
  }

  const { data: project, error } = await query.maybeSingle();
  if (error) failRead('Unable to load this project.');
  return project;
}

async function loadNewestMessages(supabase, threadId, viewerRole) {
  const { data, error } = await supabase
    .from('project_messages')
    .select(MESSAGE_FIELDS)
    .eq('thread_id', threadId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(DEFAULT_MESSAGE_LIMIT);

  if (error) failRead('Unable to load project messages.');

  const rawPage = data ?? [];
  return { messages: sharedOnly(rawPage, viewerRole).reverse(), rawPage };
}

export async function getProjectWorkspace(supabase, profile, projectId) {
  const viewer = requireViewer(profile);
  requireProjectId(projectId);

  try {
    const project = await loadProjectForViewer(supabase, viewer, projectId);
    if (!project) return null;

    const { data: thread, error: threadError } = await supabase
      .from('project_threads')
      .select(THREAD_FIELDS)
      .eq('project_id', projectId)
      .maybeSingle();
    if (threadError) failRead('Unable to load this project.');
    if (!thread) failRead('Unable to load this project.');

    const { data: assignments, error: assignmentsError } = await supabase
      .from('project_assignments')
      .select(ASSIGNMENT_FIELDS)
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true });
    if (assignmentsError) failRead('Unable to load project assignments.');

    const { data: historyData, error: historyError } = await supabase
      .from('project_status_history')
      .select(HISTORY_FIELDS)
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true });
    if (historyError) failRead('Unable to load project history.');

    const { messages, rawPage: messageRawPage } = await loadNewestMessages(
      supabase,
      thread.id,
      viewer.role,
    );

    const { data: attachmentData, error: attachmentsError } = await supabase
      .from('project_attachments')
      .select(ATTACHMENT_FIELDS)
      .eq('project_id', projectId)
      .eq('status', 'ready')
      .order('created_at', { ascending: true })
      .order('id', { ascending: true });
    if (attachmentsError) failRead('Unable to load project attachments.');

    const { data: taskData, error: taskError } = await supabase
      .from('project_tasks')
      .select(TASK_FIELDS)
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true });
    if (taskError) failRead('Unable to load project tasks.');
    const tasks = clientVisibleOnly(taskData, viewer.role);

    const { data: approvalData, error: approvalError } = await supabase
      .from('project_approvals')
      .select(APPROVAL_FIELDS)
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true });
    if (approvalError) failRead('Unable to load project approvals.');

    const { data: deliverableData, error: deliverableError } = await supabase
      .from('project_deliverables')
      .select(DELIVERABLE_FIELDS)
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true });
    if (deliverableError) failRead('Unable to load project deliverables.');

    const safeAssignments = viewer.role === 'client' ? [] : (assignments ?? []);
    const history = sharedOnly(historyData, viewer.role);
    const attachments = sharedOnly(attachmentData, viewer.role);
    const deliverables = sharedOnly(deliverableData, viewer.role);
    const actorIds = collectActorIds(
      project,
      safeAssignments,
      history,
      messages,
      attachments,
      tasks,
      approvalData,
      deliverables,
    );
    const profilesById = await loadProfiles(supabase, actorIds);

    return {
      project: {
        ...clientSafeProject(project, viewer.role),
        createdBy: profilesById.get(project.created_by) ?? null,
      },
      thread,
      assignments: safeAssignments.map((assignment) => ({
        ...assignment,
        user: profilesById.get(assignment.user_id) ?? null,
        assignedBy: profilesById.get(assignment.assigned_by) ?? null,
      })),
      statusHistory: history.map((event) => ({
        ...event,
        changedBy: profilesById.get(event.changed_by) ?? null,
      })),
      messages: attachMessageProfiles(messages, profilesById),
      attachments: attachments.map((attachment) => ({
        ...attachment,
        uploadedBy: profilesById.get(attachment.uploaded_by) ?? null,
      })),
      nextMessageCursor: nextMessageCursor(messageRawPage, DEFAULT_MESSAGE_LIMIT),
      tasks: tasks.map((task) => ({
        ...task,
        createdBy: profilesById.get(task.created_by) ?? null,
        assignee: profilesById.get(task.assignee_id) ?? null,
      })),
      approvals: (approvalData ?? []).map((approval) => ({
        ...approval,
        requestedBy: profilesById.get(approval.requested_by) ?? null,
        reviewedBy: profilesById.get(approval.reviewed_by) ?? null,
      })),
      deliverables: deliverables.map((deliverable) => ({
        ...deliverable,
        createdBy: profilesById.get(deliverable.created_by) ?? null,
      })),
    };
  } catch (error) {
    rethrowUnknownReadFailure(error, 'Unable to load this project.');
  }
}

export async function listProjectMessages(supabase, profile, projectId, cursor, limit) {
  const viewer = requireViewer(profile);
  requireProjectId(projectId);
  const requestedLimit = boundedLimit(limit);
  const requestedCursor = normalizedCursor(cursor);

  try {
    const project = await loadProjectForViewer(supabase, viewer, projectId);
    if (!project) failRead('Unable to load project messages.');

    const { data: thread, error: threadError } = await supabase
      .from('project_threads')
      .select(THREAD_FIELDS)
      .eq('project_id', projectId)
      .maybeSingle();
    if (threadError) failRead('Unable to load project messages.');
    if (!thread) failRead('Unable to load project messages.');

    let query = supabase
      .from('project_messages')
      .select(MESSAGE_FIELDS)
      .eq('thread_id', thread.id)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(requestedLimit);

    if (requestedCursor) {
      query = query.or(
        `created_at.lt.${requestedCursor.createdAt},and(created_at.eq.${requestedCursor.createdAt},id.lt.${requestedCursor.id})`,
      );
    }

    const { data, error } = await query;
    if (error) failRead('Unable to load project messages.');

    const rawPage = data ?? [];
    const messages = sharedOnly(rawPage, viewer.role).reverse();
    const actorIds = [...new Set(messages.map((message) => message.sender_id))];
    const profilesById = await loadProfiles(supabase, actorIds);

    return {
      messages: attachMessageProfiles(messages, profilesById),
      nextCursor: nextMessageCursor(rawPage, requestedLimit),
      threadId: thread.id,
    };
  } catch (error) {
    rethrowUnknownReadFailure(error, 'Unable to load project messages.');
  }
}

export async function listProjectTasks(supabase, profile, projectId) {
  const viewer = requireViewer(profile);
  requireProjectId(projectId);

  try {
    const project = await loadProjectForViewer(supabase, viewer, projectId);
    if (!project) return [];

    const { data, error } = await supabase
      .from('project_tasks')
      .select(TASK_FIELDS)
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true });

    if (error) failRead('Unable to load project tasks.');

    const tasks = clientVisibleOnly(data, viewer.role);
    const actorIds = [...new Set(tasks.flatMap((task) => [task.created_by, task.assignee_id].filter(Boolean)))];
    const profilesById = await loadProfiles(supabase, actorIds);

    return tasks.map((task) => ({
      ...task,
      createdBy: profilesById.get(task.created_by) ?? null,
      assignee: profilesById.get(task.assignee_id) ?? null,
    }));
  } catch (error) {
    rethrowUnknownReadFailure(error, 'Unable to load project tasks.');
  }
}

export async function listProjectApprovals(supabase, profile, projectId) {
  const viewer = requireViewer(profile);
  requireProjectId(projectId);

  try {
    const project = await loadProjectForViewer(supabase, viewer, projectId);
    if (!project) return [];

    const { data, error } = await supabase
      .from('project_approvals')
      .select(APPROVAL_FIELDS)
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true });

    if (error) failRead('Unable to load project approvals.');

    const approvals = data ?? [];
    const actorIds = [...new Set(approvals.flatMap((approval) => [approval.requested_by, approval.reviewed_by].filter(Boolean)))];
    const profilesById = await loadProfiles(supabase, actorIds);

    return approvals.map((approval) => ({
      ...approval,
      requestedBy: profilesById.get(approval.requested_by) ?? null,
      reviewedBy: profilesById.get(approval.reviewed_by) ?? null,
    }));
  } catch (error) {
    rethrowUnknownReadFailure(error, 'Unable to load project approvals.');
  }
}

export async function listProjectDeliverables(supabase, profile, projectId) {
  const viewer = requireViewer(profile);
  requireProjectId(projectId);

  try {
    const project = await loadProjectForViewer(supabase, viewer, projectId);
    if (!project) return [];

    const { data, error } = await supabase
      .from('project_deliverables')
      .select(DELIVERABLE_FIELDS)
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true });

    if (error) failRead('Unable to load project deliverables.');

    const deliverables = sharedOnly(data, viewer.role);
    const actorIds = [...new Set(deliverables.map((deliverable) => deliverable.created_by).filter(Boolean))];
    const profilesById = await loadProfiles(supabase, actorIds);

    return deliverables.map((deliverable) => ({
      ...deliverable,
      createdBy: profilesById.get(deliverable.created_by) ?? null,
    }));
  } catch (error) {
    rethrowUnknownReadFailure(error, 'Unable to load project deliverables.');
  }
}

export async function listNotifications(supabase, profile) {
  const viewer = requireViewer(profile);

  try {
    const { data, error } = await supabase
      .from('notifications_outbox')
      .select(NOTIFICATION_FIELDS)
      .eq('user_id', viewer.id)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false });

    if (error) failRead('Unable to load notifications.');
    return data ?? [];
  } catch (error) {
    rethrowUnknownReadFailure(error, 'Unable to load notifications.');
  }
}

export { DEFAULT_MESSAGE_LIMIT, MAX_MESSAGE_LIMIT };
