import { createAdminClient } from '@/lib/supabase/admin';
import { sendTemplate, EmailError, isEmailConfigured } from '@/lib/email/resend';
import { renderNotificationEmail } from '@/lib/email/templates';

export const runtime = 'nodejs';
// Never cached: this endpoint mutates the outbox on every invocation.
export const dynamic = 'force-dynamic';

// Delivery worker for public.notifications_outbox.
//
// 0010 created the outbox; 0011 turned it into a retryable queue
// (status / attempts / available_at / last_error). Until now nothing drained
// it, so rows accumulated as 'pending' forever. This route claims a bounded
// batch of due email rows, renders the matching branded template, sends via
// Resend, and records the outcome.
//
// Contract:
//   POST with header  x-cron-secret: $CRM_CRON_SECRET
//   -> 200 { ok, claimed, sent, failed, skipped, retrying }
//
// Only channel = 'email' rows are delivered here. 'in_app' and 'realtime'
// rows are read directly by the dashboard and must be left untouched.

const BATCH_SIZE = 25;
const MAX_ATTEMPTS = 5;
// Exponential backoff between retries, capped so a stuck row still gets its
// remaining attempts within a reasonable window.
const BACKOFF_MINUTES = [1, 5, 15, 60, 180];

function backoffFor(attempts) {
  return BACKOFF_MINUTES[Math.min(attempts, BACKOFF_MINUTES.length - 1)];
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || '';

function projectUrlFor(projectId) {
  if (!projectId) return APP_URL ? `${APP_URL}/dashboard` : undefined;
  return APP_URL ? `${APP_URL}/dashboard/projects/${projectId}` : undefined;
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
// deployment can use Vercel's expected name while other environments keep
// the project-specific one. Comparison is constant-time.
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

  if (!isEmailConfigured()) {
    return json({ ok: false, error: 'Email delivery is not configured.' }, 503);
  }

  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    return json({ ok: false, error: 'Supabase service role is not configured.' }, 503);
  }

  const nowIso = new Date().toISOString();

  const { data: rows, error: claimError } = await supabase
    .from('notifications_outbox')
    .select('id, project_id, user_id, event_type, payload, attempts')
    .eq('channel', 'email')
    .eq('status', 'pending')
    .lte('available_at', nowIso)
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE);

  if (claimError) {
    console.error('Outbox claim failed:', claimError.message);
    return json({ ok: false, error: 'Unable to read the notification outbox.' }, 500);
  }

  if (!rows?.length) {
    return json({ ok: true, claimed: 0, sent: 0, failed: 0, skipped: 0, retrying: 0 });
  }

  const recipients = await resolveRecipients(supabase, rows);
  const projects = await resolveProjects(supabase, rows);

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  let retrying = 0;

  for (const row of rows) {
    const recipient = recipients.get(row.user_id);
    const project = projects.get(row.project_id);

    // Unroutable or unknown event type: terminal, not worth a retry.
    if (!recipient?.email) {
      await markFailed(supabase, row, 'No email address for the recipient profile.');
      skipped += 1;
      continue;
    }

    const template = renderNotificationEmail(
      row.event_type,
      templateContextFor(row, { recipient, project }),
    );

    if (!template) {
      await markFailed(supabase, row, `No email template for event ${row.event_type}.`);
      skipped += 1;
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

      const { error: updateError } = await supabase
        .from('notifications_outbox')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          attempts: (row.attempts ?? 0) + 1,
          last_error: null,
        })
        .eq('id', row.id);

      if (updateError) {
        // The mail went out; losing the status write would resend it next
        // tick, but the idempotency key above makes that harmless.
        console.error(`Outbox row ${row.id} sent but not marked:`, updateError.message);
      }
      sent += 1;
    } catch (error) {
      const attempts = (row.attempts ?? 0) + 1;
      const retryable = error instanceof EmailError ? error.retryable : true;
      const canRetry = retryable && attempts < MAX_ATTEMPTS;

      const { error: updateError } = await supabase
        .from('notifications_outbox')
        .update({
          status: canRetry ? 'pending' : 'failed',
          attempts,
          last_error: String(error.message).slice(0, 500),
          available_at: canRetry
            ? new Date(Date.now() + backoffFor(attempts) * 60_000).toISOString()
            : undefined,
        })
        .eq('id', row.id);

      if (updateError) {
        console.error(`Outbox row ${row.id} failure not recorded:`, updateError.message);
      }

      if (canRetry) retrying += 1;
      else failed += 1;
    }
  }

  return json({ ok: true, claimed: rows.length, sent, failed, skipped, retrying });
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

async function markFailed(supabase, row, reason) {
  await supabase
    .from('notifications_outbox')
    .update({
      status: 'failed',
      attempts: (row.attempts ?? 0) + 1,
      last_error: reason.slice(0, 500),
    })
    .eq('id', row.id);
}

// Counts only - never echo recipients, payloads, or the cron secret.
function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
