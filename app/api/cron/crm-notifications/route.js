import { createAdminClient } from '@/lib/supabase/admin';
import { sendTemplate, EmailError, isEmailConfigured } from '@/lib/email/resend';
import { renderNotificationEmail } from '@/lib/email/templates';

export const runtime = 'nodejs';
// Never cached: this endpoint mutates the outbox on every invocation.
export const dynamic = 'force-dynamic';

// Delivery worker for public.notifications_outbox.
//
// 0010 created the outbox; 0011 turned it into a retryable queue
// (status / attempts / available_at / last_error). 0033 adds database-owned
// leases so overlapping cron invocations cannot process the same email row.
//
// Contract:
//   POST with header  x-cron-secret: $CRM_CRON_SECRET
//   -> 200 { ok, claimed, sent, failed, skipped, retrying, leaseConflicts }
//
// Only channel = 'email' rows are delivered here. 'in_app' and 'realtime'
// rows are read directly by the dashboard and must be left untouched.

const BATCH_SIZE = 25;
const LEASE_SECONDS = 300;
const MAX_ATTEMPTS = 5;
// Exponential backoff between retries, capped so a stuck row still gets its
// remaining attempts within a reasonable window.
const BACKOFF_MINUTES = [1, 5, 15, 60, 180];

function backoffFor(attempts) {
  return BACKOFF_MINUTES[Math.min(Math.max(attempts - 1, 0), BACKOFF_MINUTES.length - 1)];
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || '';

function projectUrlFor(projectId) {
  if (!projectId) return APP_URL ? `${APP_URL}/dashboard` : undefined;
  return APP_URL ? `${APP_URL}/dashboard/projects/${projectId}` : undefined;
}

// Every project email links to the recipient's own workspace: /dashboard
// redirects staff to their home, dropping the project. Clients (and any
// recipient whose role is unknown) fall through to the /dashboard link.
const STAFF_PROJECT_BASE = { admin: '/admin/projects', project_manager: '/team/projects' };

// Staff emails that name the client behind the project. Resolving the client
// costs an auth admin lookup per project, so only these events pay for it.
const CLIENT_CONTEXT_EVENTS = new Set(['project.brief_submitted', 'project.user_assigned']);

// Emails that name the project's lead project manager (name only, never
// their email address): the admin's brief alert, and status updates, so the
// client's "now Planned" email says who is leading their project.
const LEAD_MANAGER_EVENTS = new Set(['project.brief_submitted', 'project.status_transitioned']);

function staffProjectUrlFor(projectId, role) {
  const base = STAFF_PROJECT_BASE[role];
  if (!base || !projectId || !APP_URL) return projectUrlFor(projectId);
  return `${APP_URL}${base}/${projectId}`;
}

// lead.created rows (create_lead_from_contact, migration 0026) have no
// project_id -- they link to the admin deals view instead.
function dealUrlFor(dealId) {
  if (!dealId) return undefined;
  return APP_URL ? `${APP_URL}/admin/deals/${dealId}` : undefined;
}

// notifications_outbox.payload is built by Postgres (jsonb_build_object), so
// its keys are snake_case: from_status, to_status, approval_id, deliverable_id.
// The templates take camelCase props, so map explicitly rather than spreading
// the raw payload - a silent mismatch renders blank values into a live email.
function templateContextFor(row, { recipient, project, client, leadManager }) {
  const payload = row.payload ?? {};
  const staffRecipient = Boolean(STAFF_PROJECT_BASE[recipient.role]);
  // Client details only ever go to staff.
  const clientContext = staffRecipient ? client : null;

  return {
    fullName: recipient.fullName,
    recipientRole: recipient.role,
    projectId: row.project_id,
    projectName: project?.title ?? payload.project_name,
    projectUrl: staffProjectUrlFor(row.project_id, recipient.role),
    staffProjectUrl: staffProjectUrlFor(row.project_id, recipient.role),
    targetDate: project?.target_date,
    clientName: clientContext?.fullName,
    clientEmail: clientContext?.email,
    clientCompany: clientContext?.companyName,
    clientSince: clientContext?.createdAt,
    clientProjectCount: clientContext?.projectCount,
    leadManagerName: leadManager?.fullName ?? undefined,
    reviewsUrl: APP_URL ? `${APP_URL}/reviews` : undefined,
    fromStatus: payload.from_status,
    toStatus: payload.to_status,
    status: payload.status,
    note: payload.note,
    deliverableName: payload.deliverable_name,
    version: payload.version,
    taskTitle: payload.task_title ?? payload.title,
    dueDate: payload.due_date,
    priority: payload.priority,
    authorName: payload.author_name,
    excerpt: payload.excerpt ?? payload.body,
    role: payload.role,
    leadName: payload.lead_name,
    leadCompany: payload.lead_company,
    leadEmail: payload.lead_email,
    dealUrl: dealUrlFor(payload.deal_id),
    briefTitle: payload.brief_title,
    briefType: payload.brief_type,
    createdProject: payload.created_project === true,
  };
}

// Authorises a scheduler invocation.
//
// Two accepted forms:
//   Authorization: Bearer <secret>   - Vercel Cron sends this automatically,
//                                      using the env var named CRON_SECRET.
//                                      Vercel cannot send custom headers.
//   x-cron-secret: <secret>          - for curl, GitHub Actions, or any other
//                                      external scheduler.
//
// Either CRM_CRON_SECRET or CRON_SECRET may hold the value, so a Vercel
// deployment can use Vercel's expected name while other environments keep the
// project-specific one. Comparison is constant-time.
function timingSafeEquals(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;

  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

function isAuthorised(request) {
  const accepted = [process.env.CRM_CRON_SECRET, process.env.CRON_SECRET].filter(Boolean);

  // Fail closed: with no secret configured the endpoint must never run.
  if (accepted.length === 0) return false;

  const bearer = request.headers.get('authorization');
  const presented = bearer?.startsWith('Bearer ')
    ? bearer.slice(7)
    : request.headers.get('x-cron-secret');

  if (!presented) return false;

  // Reduce rather than short-circuit so the number of comparisons does not
  // depend on which secret matched.
  return accepted.reduce((ok, secret) => timingSafeEquals(presented, secret) || ok, false);
}

// Vercel Cron invokes scheduled paths with GET, so that is the scheduled
// entry point. POST is kept for manual runs and non-Vercel schedulers.
export async function GET(request) {
  return drain(request);
}

export async function POST(request) {
  return drain(request);
}

async function drain(request) {
  if (!isAuthorised(request)) {
    return new Response('Unauthorized', { status: 401 });
  }

  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    return json({ ok: false, error: 'Supabase service role is not configured.' }, 503);
  }

  const cleanedAttachments = await cleanupStaleAttachments(supabase);

  if (!isEmailConfigured()) {
    return json({ ok: false, error: 'Email delivery is not configured.' }, 503);
  }

  const { data: rows, error: claimError } = await supabase.rpc('claim_notification_email_batch', {
    p_limit: BATCH_SIZE,
    p_lease_seconds: LEASE_SECONDS,
  });

  if (claimError) {
    console.error('Outbox claim failed:', claimError.message);
    return json({ ok: false, error: 'Unable to claim the notification outbox.' }, 500);
  }

  if (!rows?.length) {
    return json({
      ok: true,
      claimed: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      retrying: 0,
      leaseConflicts: 0,
      cleanedAttachments,
    });
  }

  const recipients = await resolveRecipients(supabase, rows);
  const projects = await resolveProjects(supabase, rows);
  const clients = await resolveProjectClients(supabase, rows, projects);
  const leadManagers = await resolveLeadManagers(supabase, rows);
  const liveAssignments = await resolveLiveAssignments(supabase, rows, recipients);

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  let retrying = 0;
  let leaseConflicts = 0;

  for (const row of rows) {
    const recipient = recipients.get(row.user_id);
    const project = projects.get(row.project_id);

    // Unroutable or unknown event type: terminal, not worth a retry.
    if (!recipient?.email) {
      const outcome = await markLeaseFailed(supabase, row, {
        retryable: false,
        failureCode: 'missing_recipient',
        message: 'No email address for the recipient profile.',
      });
      if (outcome.conflict) leaseConflicts += 1;
      else skipped += 1;
      continue;
    }

    // A project manager only hears about projects they are still on. Rows are
    // queued when something happens and drained up to 5 minutes later; a
    // manager replaced in between must not get the email (it can carry the
    // client's details, and its link would say "Project not found").
    if (
      recipient.role === 'project_manager' &&
      row.project_id &&
      liveAssignments.checked &&
      !liveAssignments.pairs.has(`${row.project_id}:${row.user_id}`)
    ) {
      const outcome = await markLeaseFailed(supabase, row, {
        retryable: false,
        failureCode: 'missing_recipient',
        message: 'Recipient is no longer assigned to this project.',
      });
      if (outcome.conflict) leaseConflicts += 1;
      else skipped += 1;
      continue;
    }

    const template = renderNotificationEmail(
      row.event_type,
      templateContextFor(row, {
        recipient,
        project,
        client: CLIENT_CONTEXT_EVENTS.has(row.event_type) ? clients.get(row.project_id) : null,
        leadManager: LEAD_MANAGER_EVENTS.has(row.event_type) ? leadManagers.get(row.project_id) : null,
      }),
    );

    if (!template) {
      const outcome = await markLeaseFailed(supabase, row, {
        retryable: false,
        failureCode: 'missing_template',
        message: `No email template for event ${row.event_type}.`,
      });
      if (outcome.conflict) leaseConflicts += 1;
      else skipped += 1;
      continue;
    }

    try {
      await sendTemplate(template, {
        to: recipient.email,
        tags: ['crm-notification'],
        // Resend de-duplicates on this key for 24 hours, so a retry inside
        // that window cannot deliver the same notification twice.
        idempotencyKey: `outbox-${row.id}`,
      });

      const { data: marked, error: updateError } = await supabase.rpc(
        'mark_notification_email_sent',
        {
          p_notification_id: row.id,
          p_lease_id: row.lease_id,
        },
      );

      if (updateError) {
        // The mail went out; a future reclaim may call Resend again. The key
        // above suppresses that only within 24 hours, so a row that keeps
        // failing to complete can be delivered again (0033, fixed in 0045).
        console.error(`Outbox row ${row.id} sent completion failed:`, updateError.message);
      }

      if (updateError || Number(marked) !== 1) {
        leaseConflicts += 1;
      } else {
        sent += 1;
      }
    } catch (error) {
      const attempts = row.attempts ?? 0;
      const retryable = error instanceof EmailError ? error.retryable : true;
      const canRetry = retryable && attempts < MAX_ATTEMPTS;
      const outcome = await markLeaseFailed(supabase, row, {
        retryable: canRetry,
        failureCode: retryable ? 'provider_retryable' : 'provider_terminal',
        message: safeFailureMessage(error),
        availableAt: canRetry
          ? new Date(Date.now() + backoffFor(attempts) * 60_000).toISOString()
          : null,
      });

      if (outcome.conflict) leaseConflicts += 1;
      else if (canRetry) retrying += 1;
      else failed += 1;
    }
  }

  return json({
    ok: true,
    claimed: rows.length,
    sent,
    failed,
    skipped,
    retrying,
    leaseConflicts,
    cleanedAttachments,
  });
}

async function cleanupStaleAttachments(supabase) {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase.rpc('cleanup_stale_project_attachments', {
    p_before: cutoff,
  });

  if (error) {
    console.error('Stale attachment cleanup failed:', error.message);
    return 0;
  }

  // The RPC only claims and deletes the metadata rows (it cannot delete
  // storage.objects directly -- Supabase requires the Storage API for that).
  // It returns each removed row's storage_path so we can remove the actual
  // object here.
  const paths = Array.isArray(data)
    ? data.map((row) => row.storage_path).filter(Boolean)
    : [];

  if (paths.length > 0) {
    const { error: storageError } = await supabase.storage.from('project-files').remove(paths);
    if (storageError) {
      // The metadata rows are already gone; a failed object removal just
      // leaves an orphaned file in storage, not a dangling reference.
      console.error('Stale attachment storage removal failed:', storageError.message);
    }
  }

  return paths.length;
}

function safeFailureMessage(error) {
  if (error instanceof EmailError) {
    return error.statusCode
      ? `Email provider response status ${error.statusCode}.`
      : 'Email delivery failed.';
  }
  return 'Unexpected notification delivery error.';
}

async function markLeaseFailed(supabase, row, {
  retryable,
  failureCode,
  message,
  availableAt = null,
}) {
  const { data, error } = await supabase.rpc('mark_notification_email_failed', {
    p_notification_id: row.id,
    p_lease_id: row.lease_id,
    p_retryable: retryable,
    p_failure_code: failureCode,
    p_error: message?.slice(0, 500) ?? null,
    p_available_at: availableAt,
  });

  if (error) {
    console.error(`Outbox row ${row.id} failure completion failed:`, error.message);
    return { conflict: true };
  }

  return { conflict: Number(data) !== 1 };
}

// profiles has no email column - addresses live in auth.users, reachable
// only through the admin API. Batch the lookups per unique user id.
async function resolveRecipients(supabase, rows) {
  const ids = [...new Set(rows.map((row) => row.user_id).filter(Boolean))];
  const map = new Map();
  if (ids.length === 0) return map;

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .in('id', ids);

  const names = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
  const roles = new Map((profiles ?? []).map((p) => [p.id, p.role]));

  const results = await Promise.all(
    ids.map(async (id) => {
      try {
        const { data, error } = await supabase.auth.admin.getUserById(id);
        if (error || !data?.user?.email) return [id, null];
        return [id, { email: data.user.email, fullName: names.get(id) ?? null, role: roles.get(id) ?? null }];
      } catch {
        return [id, null];
      }
    }),
  );

  for (const [id, value] of results) {
    if (value) map.set(id, value);
  }
  return map;
}

async function resolveProjects(supabase, rows) {
  const ids = [...new Set(rows.map((row) => row.project_id).filter(Boolean))];
  const map = new Map();
  if (ids.length === 0) return map;

  const { data } = await supabase
    .from('projects')
    .select('id, title, company_id, created_by, target_date')
    .in('id', ids);
  for (const project of data ?? []) {
    map.set(project.id, project);
  }
  return map;
}

// The client behind each project, for staff emails that name them: who
// created the project (profile name plus auth email and account creation
// date), their company, and how many projects that company has. Best effort:
// any failure leaves the email to send without these rows.
async function resolveProjectClients(supabase, rows, projects) {
  const map = new Map();

  try {
    const targets = [...new Set(
      rows
        .filter((row) => CLIENT_CONTEXT_EVENTS.has(row.event_type))
        .map((row) => row.project_id)
        .filter(Boolean),
    )]
      .map((id) => projects.get(id))
      .filter((project) => project?.created_by);
    if (targets.length === 0) return map;

    const creatorIds = [...new Set(targets.map((project) => project.created_by))];
    const companyIds = [...new Set(targets.map((project) => project.company_id).filter(Boolean))];

    const [creatorsResult, companiesResult, companyProjectsResult, accounts] = await Promise.all([
      supabase.from('profiles').select('id, full_name').in('id', creatorIds),
      companyIds.length
        ? supabase.from('companies').select('id, name').in('id', companyIds)
        : { data: [] },
      companyIds.length
        ? supabase.from('projects').select('id, company_id').in('company_id', companyIds)
        : { data: [] },
      Promise.all(
        creatorIds.map(async (id) => {
          try {
            const { data, error } = await supabase.auth.admin.getUserById(id);
            if (error || !data?.user) return [id, null];
            return [id, { email: data.user.email ?? null, createdAt: data.user.created_at ?? null }];
          } catch {
            return [id, null];
          }
        }),
      ),
    ]);

    const names = new Map((creatorsResult?.data ?? []).map((profile) => [profile.id, profile.full_name]));
    const companyNames = new Map((companiesResult?.data ?? []).map((company) => [company.id, company.name]));
    const accountById = new Map(accounts);
    const projectCounts = new Map();
    for (const project of companyProjectsResult?.data ?? []) {
      projectCounts.set(project.company_id, (projectCounts.get(project.company_id) ?? 0) + 1);
    }

    for (const project of targets) {
      const account = accountById.get(project.created_by);
      map.set(project.id, {
        fullName: names.get(project.created_by) ?? null,
        email: account?.email ?? null,
        createdAt: account?.createdAt ?? null,
        companyName: companyNames.get(project.company_id) ?? null,
        projectCount: projectCounts.get(project.company_id) ?? null,
      });
    }
  } catch (error) {
    console.error('Outbox client context lookup failed:', error?.message ?? 'unknown error');
  }

  return map;
}

// The lead project manager (earliest assignment) of each project with a brief
// alert or status update: the admin email says whether someone is already
// leading it, and the client's status email names them.
async function resolveLeadManagers(supabase, rows) {
  const map = new Map();

  try {
    const ids = [...new Set(
      rows
        .filter((row) => LEAD_MANAGER_EVENTS.has(row.event_type))
        .map((row) => row.project_id)
        .filter(Boolean),
    )];
    if (ids.length === 0) return map;

    const { data: assignments, error } = await supabase
      .from('project_assignments')
      .select('project_id, user_id, created_at')
      .in('project_id', ids)
      .order('created_at', { ascending: true });
    if (error) return map;

    const leadByProject = new Map();
    for (const assignment of assignments ?? []) {
      if (!leadByProject.has(assignment.project_id)) {
        leadByProject.set(assignment.project_id, assignment.user_id);
      }
    }
    if (leadByProject.size === 0) return map;

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', [...new Set(leadByProject.values())]);
    const names = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name]));

    for (const [projectId, userId] of leadByProject) {
      map.set(projectId, { fullName: names.get(userId) ?? null });
    }
  } catch (error) {
    console.error('Outbox lead manager lookup failed:', error?.message ?? 'unknown error');
  }

  return map;
}

// Which (project, project manager) pairs in this batch are still assigned.
// Fails open (checked: false) so a lookup error never blocks delivery; the
// row then sends exactly as it did before this check existed.
async function resolveLiveAssignments(supabase, rows, recipients) {
  const pairs = new Set();

  try {
    const managerRows = rows.filter(
      (row) => row.project_id && recipients.get(row.user_id)?.role === 'project_manager',
    );
    if (managerRows.length === 0) return { checked: true, pairs };

    const { data, error } = await supabase
      .from('project_assignments')
      .select('project_id, user_id')
      .in('project_id', [...new Set(managerRows.map((row) => row.project_id))])
      .in('user_id', [...new Set(managerRows.map((row) => row.user_id))]);
    if (error) {
      console.error('Outbox assignment check failed:', error.message);
      return { checked: false, pairs };
    }

    for (const assignment of data ?? []) {
      pairs.add(`${assignment.project_id}:${assignment.user_id}`);
    }
    return { checked: true, pairs };
  } catch (error) {
    console.error('Outbox assignment check failed:', error?.message ?? 'unknown error');
    return { checked: false, pairs };
  }
}

// Counts only - never echo recipients, payloads, or the cron secret.
function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
