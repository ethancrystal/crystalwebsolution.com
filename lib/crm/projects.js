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
  'created_by',
  'created_at',
  'updated_at',
].join(', ');

const THREAD_FIELDS = 'id, project_id, created_at';
const ASSIGNMENT_FIELDS = 'id, project_id, user_id, assigned_by, created_at';
const MESSAGE_FIELDS =
  'id, thread_id, sender_id, visibility, body, client_generated_id, created_at';
const ATTACHMENT_FIELDS =
  'id, project_id, message_id, uploaded_by, visibility, file_name, storage_path, mime_type, size_bytes, status, created_at';
const HISTORY_FIELDS =
  'id, project_id, from_status, to_status, note, visibility, changed_by, created_at';

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
  };
}

function sharedOnly(rows, role) {
  return role === 'client'
    ? (rows ?? []).filter((row) => row.visibility === 'shared')
    : (rows ?? []);
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

function collectActorIds(project, assignments, history, messages, attachments) {
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

function nextMessageCursor(messages, requestedLimit) {
  if (messages.length < requestedLimit) return null;
  const oldest = messages[0];
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

    return (projects ?? []).map((project) => clientSafeProject(project, viewer.role));
  } catch (error) {
    rethrowUnknownReadFailure(error, 'Unable to load projects.');
  }
}

async function loadProjectForViewer(supabase, viewer, projectId) {
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
  return sharedOnly(data, viewerRole).reverse();
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

    const messages = await loadNewestMessages(supabase, thread.id, viewer.role);

    const { data: attachmentData, error: attachmentsError } = await supabase
      .from('project_attachments')
      .select(ATTACHMENT_FIELDS)
      .eq('project_id', projectId)
      .eq('status', 'ready')
      .order('created_at', { ascending: true })
      .order('id', { ascending: true });
    if (attachmentsError) failRead('Unable to load project attachments.');

    const safeAssignments = viewer.role === 'client' ? [] : (assignments ?? []);
    const history = sharedOnly(historyData, viewer.role);
    const attachments = sharedOnly(attachmentData, viewer.role);
    const actorIds = collectActorIds(
      project,
      safeAssignments,
      history,
      messages,
      attachments,
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
      nextMessageCursor: nextMessageCursor(messages, DEFAULT_MESSAGE_LIMIT),
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

    const messages = sharedOnly(data, viewer.role).reverse();
    const actorIds = [...new Set(messages.map((message) => message.sender_id))];
    const profilesById = await loadProfiles(supabase, actorIds);

    return {
      messages: attachMessageProfiles(messages, profilesById),
      nextCursor: nextMessageCursor(messages, requestedLimit),
    };
  } catch (error) {
    rethrowUnknownReadFailure(error, 'Unable to load project messages.');
  }
}

export { DEFAULT_MESSAGE_LIMIT, MAX_MESSAGE_LIMIT };
