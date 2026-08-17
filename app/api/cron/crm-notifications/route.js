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
function templateContextFor(row, { recipient, project }) {
  const payload = row.payload ?? {};

  return {
    fullName: recipient.fullName,
    projectName: project?.title ?? payload.project_name,
    projectUrl: projectUrlFor(row.project_id),
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
    return json({ ok: false, error: 'Email delivery is not configured.', cleanedAttachments }, 503);
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

    const template = renderNotificationEmail(
      row.event_type,
      templateContextFor(row, { recipient, project }),
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
        // Resend de-duplicates on this key, so a retry after an ambiguous
        // failure cannot deliver the same notification twice.
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
        // The mail went out; a future reclaim may call Resend again, but the
        // stable idempotency key above makes that provider retry harmless.
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

  const count = Number(data);
  return Number.isSafeInteger(count) && count >= 0 ? count : 0;
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
    .select('id, full_name')
    .in('id', ids);

  const names = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  const results = await Promise.all(
    ids.map(async (id) => {
      try {
        const { data, error } = await supabase.auth.admin.getUserById(id);
        if (error || !data?.user?.email) return [id, null];
        return [id, { email: data.user.email, fullName: names.get(id) ?? null }];
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

  const { data } = await supabase.from('projects').select('id, title').in('id', ids);
  for (const project of data ?? []) {
    map.set(project.id, project);
  }
  return map;
}

// Counts only - never echo recipients, payloads, or the cron secret.
function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
