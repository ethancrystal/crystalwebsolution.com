export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email/resend';

const MAX_BATCH = 25;
const MAX_ATTEMPTS = 25;

function buildEmail(payload) {
  const data = payload && typeof payload === 'object' ? payload : {};
  return {
    to: data.to,
    subject: data.subject || 'Crystal Web Solution update',
    html: data.html || data.body || '<p>You have a new update.</p>',
  };
}

async function deliverRow(supabase, row) {
  const { id, user_id, channel, payload } = row;

  if (channel && channel !== 'email') {
    // Non-email channels (in_app, realtime) are handled by other workers;
    // mark email-channel rows only. Leave others pending for their worker.
    return { id, skipped: true };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', user_id)
    .single();

  if (profileError || !profile?.email) {
    throw new Error(profileError?.message || 'Recipient email not found.');
  }

  const email = buildEmail(payload);
  await sendEmail({ ...email, to: profile.email });

  const { error: updateError } = await supabase
    .from('notifications_outbox')
    .update({ status: 'sent', last_error: null, attempts: row.attempts + 1 })
    .eq('id', id);

  if (updateError) throw updateError;
  return { id, sent: true };
}

export async function POST(request) {
  const secret = request.headers.get('x-cron-secret');

  if (!secret || secret !== process.env.CRM_CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { ok: false, error: 'RESEND_API_KEY not configured', processed: 0 },
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  }

  const supabase = createAdminClient();

  const { data: rows, error: selectError } = await supabase
    .from('notifications_outbox')
    .select('id, user_id, channel, payload, attempts')
    .eq('status', 'pending')
    .lte('available_at', new Date().toISOString())
    .order('available_at', { ascending: true })
    .limit(MAX_BATCH);

  if (selectError) {
    return NextResponse.json(
      { ok: false, error: selectError.message, processed: 0 },
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  }

  let sent = 0;
  let failed = 0;
  const errors = [];

  for (const row of rows || []) {
    try {
      const result = await deliverRow(supabase, row);
      if (result.skipped) continue;
      sent += 1;
    } catch (err) {
      failed += 1;
      errors.push({ id: row.id, error: err.message });
      const attempts = (row.attempts || 0) + 1;
      const nextAvailable = new Date(
        Date.now() + Math.min(attempts, MAX_ATTEMPTS) * 60 * 1000,
      ).toISOString();
      const status = attempts >= MAX_ATTEMPTS ? 'failed' : 'pending';
      await supabase
        .from('notifications_outbox')
        .update({
          status,
          attempts,
          last_error: err.message,
          available_at: nextAvailable,
        })
        .eq('id', row.id);
    }
  }

  return NextResponse.json(
    {
      ok: true,
      queued: (rows || []).length,
      sent,
      failed,
      errors: errors.slice(0, 10),
    },
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
}
